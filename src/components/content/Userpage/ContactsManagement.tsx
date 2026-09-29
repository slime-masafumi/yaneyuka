'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FiLock, FiUnlock, FiTrash2, FiX, FiPlus, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import ToolHeader from './ToolHeader';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebaseClient';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import ContactLogPanel from './contacts/ContactLogPanel';
import { SampleLedger, QuoteLedger, LogTimeline } from './contacts/ContactLedgers';
import { summarize, sortLog, isChatNicknameOnly, logCsv, todayYmd, type ContactLogEntry, type SampleState } from '@/lib/contactLog';

type View = 'cards' | 'log' | 'samples' | 'quotes';
const MONO = 'yy-mono text-[10px] tracking-[0.12em] uppercase text-gray-500';

interface Contact {
  id?: string;
  company: string;
  dept: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  project?: string;
  memo: string;
  locked: boolean;
  createdAt: number;
  /** やり取りの履歴（問合せ・回答・見積・サンプル…） */
  log?: ContactLogEntry[];
}

const ContactsManagement: React.FC = () => {
  const { currentUser, isLoggedIn } = useAuth();
  // 担当者連絡先の状態
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currentSortOrder, setCurrentSortOrder] = useState<string>('input-desc');
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [view, setView] = useState<View>('cards');
  const [openLogId, setOpenLogId] = useState<string | null>(null);
  const [csvNotice, setCsvNotice] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);
  const today = todayYmd();

  // 見出しの「できること」から切り替えたら、本文の頭へ寄せる（スマホで帯の下に隠れないように）
  const switchView = (v: View) => {
    setView(v);
    setTimeout(() => bodyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  };

  // 初期データの読み込み（即時キャッシュ→Firestore購読）
  useEffect(() => {
    // 一時的なuid未確定では消さない。明示ログアウト時のみクリア
    if (!currentUser) { if (isLoggedIn === false) setContacts([]); return }
    try {
      const cached = localStorage.getItem(`contacts:${currentUser.uid}`)
      if (cached) setContacts(JSON.parse(cached))
    } catch {}
    const colRef = collection(db, 'users', currentUser.uid, 'contacts')
    const unsub = onSnapshot(colRef, (snap) => {
      if (snap.empty) {
        if (snap.metadata.fromCache || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
          return
        }
      }
      // 同じコレクションに yychat の呼び名（nickname だけ）も入っているので、連絡先として出さない
      const list: Contact[] = snap.docs.filter(d => !isChatNicknameOnly(d.data())).map(d => ({ id: d.id, ...(d.data() as any) })) as any
      // 新しい順
      list.sort((a,b) => (b.createdAt||0) - (a.createdAt||0))
      setContacts(list)
      try { localStorage.setItem(`contacts:${currentUser.uid}`, JSON.stringify(list)) } catch {}
    })
    return () => unsub()
  }, [currentUser, isLoggedIn])

  // 担当者連絡先の機能
  const addContact = async () => {
    // 追加制御：未保存（idが無い）で完全に空のカードがある場合のみ追加を禁止
    const isCompletelyEmpty = (c: Contact) =>
      [c.company, c.dept, c.role, c.name, c.phone, c.email, (c.project || ''), c.memo]
        .every(v => (v || '').trim() === '');
    const hasUnsavedEmpty = contacts.some(c => !c.id && isCompletelyEmpty(c));
    if (hasUnsavedEmpty) {
      alert('未入力のカードがあります。いずれかの項目を1文字以上入力してください。');
      return;
    }

    // まずはローカルに空カードを作成（idは付けない）
    const newContact: Contact = {
      company: '', dept: '', name: '', role: '', phone: '', email: '', project: '', memo: '',
      locked: false, createdAt: Date.now()
    };
    setContacts(prev => [newContact, ...prev]);
    // Firestoreへの作成は、いずれかのフィールドが入力されたタイミングで行う（updateContactFieldで実施）
  };

  const deleteContact = async (index: number) => {
    if (contacts[index] && contacts[index].locked) {
      alert('ロックされた連絡先は削除できません。先にロックを解除してください。');
      return;
    }

    if (confirm('この連絡先を削除してもよろしいですか？')) {
      const target = contacts[index] as any
      setContacts(prev => prev.filter((_, i) => i !== index));
      if (currentUser && target?.id) { try { await deleteDoc(doc(db, 'users', currentUser.uid, 'contacts', target.id)) } catch {} }
      console.log('🗑️ 連絡先を削除して保存');
    }
  };

  const toggleLock = async (index: number) => {
      const target = contacts[index] as any
      const nextLocked = !target.locked
      setContacts(prev => prev.map((c,i) => i===index ? { ...c, locked: nextLocked } : c));
      if (currentUser && target?.id) { try { await updateDoc(doc(db, 'users', currentUser.uid, 'contacts', target.id), { locked: nextLocked } as any) } catch {} }
      console.log('🔒 連絡先のロック状態を変更して保存');
  };

  const updateContactField = async (index: number, field: keyof Contact, value: string) => {
    const target = contacts[index] as Contact | undefined;
    if (!target) return;
    const newValue: any = field === 'createdAt' ? parseInt(value) : value;

    // ローカル更新
    const updatedLocal = { ...target, [field]: newValue } as Contact;
    setContacts(prev => prev.map((c,i) => i===index ? updatedLocal : c));

    // Firestore同期
    if (!currentUser) return;
    const colPath = collection(db, 'users', currentUser.uid, 'contacts');

    // 新規（idなし）カードは、いずれかのフィールドに入力が入った時点で作成
    const isEmptyAfter = [updatedLocal.company, updatedLocal.dept, updatedLocal.role, updatedLocal.name, updatedLocal.phone, updatedLocal.email, (updatedLocal.project||''), updatedLocal.memo]
      .every(v => (v || '').trim() === '');
    if (!updatedLocal.id) {
      if (isEmptyAfter) return; // まだ全て空 → 何もしない
      try {
        const docRef = await addDoc(colPath, { ...updatedLocal } as any);
        // 付与されたidをローカルに反映
        setContacts(prev => prev.map((c,i) => i===index ? { ...updatedLocal, id: docRef.id } : c));
      } catch {}
      return;
    }

    // 既存ドキュメントの更新
    try { await updateDoc(doc(db, 'users', currentUser.uid, 'contacts', updatedLocal.id), { [field]: newValue } as any) } catch {}
  };

  const saveLog = async (contactId: string, next: ContactLogEntry[]) => {
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, log: next } : c));
    if (!currentUser) return;
    try { await updateDoc(doc(db, 'users', currentUser.uid, 'contacts', contactId), { log: next } as any) } catch (e) { console.error('履歴の保存に失敗', e) }
  };

  const setSampleStatus = (contactId: string, entryId: string, status: SampleState) => {
    const c = contacts.find(x => x.id === contactId);
    if (!c) return;
    void saveLog(contactId, (c.log ?? []).map(e => e.id === entryId ? { ...e, status } : e));
  };

  const openCompany = (company: string, contactId?: string) => {
    setView('cards');
    setSelectedCompany(company || null);
    setContactSearchTerm('');
    // 時系列から来たときは、その人の履歴を開いた状態にする
    if (contactId) setOpenLogId(contactId);
  };

  const downloadLogCsv = () => {
    if (!contacts.some(c => (c.log ?? []).length > 0)) {
      setCsvNotice('まだ履歴がありません。記録すると CSV に書き出せます');
      setTimeout(() => setCsvNotice(''), 5000);
      return;
    }
    const blob = new Blob([logCsv(contacts)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yaneyuka_やり取り履歴_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const setSortOrder = (sortType: string) => {
    setCurrentSortOrder(sortType);
    console.log('担当連絡先を並び替え:', sortType);
  };

  const clearContactSearch = () => {
    setContactSearchTerm('');
    setSelectedCompany(null);
  };

  const handleCompanyClick = (company: string) => {
    setSelectedCompany(company);
    setContactSearchTerm('');
  };

  const getSortedContacts = () => {
    const sortedContacts = [...contacts];

    switch(currentSortOrder) {
      case 'input-asc':
        sortedContacts.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'input-desc':
        sortedContacts.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'company-asc':
        sortedContacts.sort((a, b) => (a.company || '').localeCompare(b.company || '', 'ja'));
        break;
      case 'company-desc':
        sortedContacts.sort((a, b) => (b.company || '').localeCompare(a.company || '', 'ja'));
        break;
      case 'name-asc':
        sortedContacts.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ja'));
        break;
      case 'name-desc':
        sortedContacts.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'ja'));
        break;
    }

    return sortedContacts;
  };

  const getFilteredContacts = () => {
    const sortedContacts = getSortedContacts();

    if (selectedCompany) {
      return sortedContacts.filter(contact => contact.company === selectedCompany);
    }

    if (contactSearchTerm) {
    const keyword = contactSearchTerm.toLowerCase();
    return sortedContacts.filter(contact =>
      (contact.company || '').toLowerCase().includes(keyword) ||
      (contact.name || '').toLowerCase().includes(keyword) ||
      (contact.dept || '').toLowerCase().includes(keyword) ||
      (contact.role || '').toLowerCase().includes(keyword) ||
      (contact.project || '').toLowerCase().includes(keyword) ||
      (contact.memo || '').toLowerCase().includes(keyword) ||
      (contact.log || []).some(e => (e.text || '').toLowerCase().includes(keyword))
    );
    }

    return sortedContacts;
  };

  const filteredContacts = getFilteredContacts();

  const logTotal = contacts.reduce((a, c) => a + (c.log?.length ?? 0), 0);
  const openSampleTotal = contacts.reduce((a, c) => a + summarize(c.log, today).openSamples, 0);
  const quoteTotal = contacts.reduce((a, c) => a + (c.log ?? []).filter(e => e.kind === '見積').length, 0);
  const companies = Array.from(new Set(contacts.map(contact => contact.company)))
    .filter(company => company && company.trim() !== '')
    .sort((a, b) => (a || '').localeCompare(b || '', 'ja'));
  const tabs: [View, string, number][] = [
    ['cards', '担当者', contacts.length],
    ['log', 'やり取りの履歴', logTotal],
    ['samples', 'サンプル台帳', openSampleTotal],
    ['quotes', '見積の履歴', quoteTotal],
  ];

  return (
    // 帯だけ左右いっぱいに出し、その下の本文は他のツールと同じ左右余白を取る。
    <div className="bg-white pb-4 [&>*:not(:first-child)]:px-4">
      <ToolHeader
        no="A7"
        code="CONTACTS"
        title="担当連絡先"
        description="メーカー・業者の担当者と、いつ何を頼みどう返ってきたかを残す。建材ページで窓口を開くと自動で記録"
        aside={<span className="yy-mono text-[10px] tracking-[0.12em] uppercase">{contacts.length} CONTACTS</span>}
        features={[
          { label: '担当者', active: view === 'cards', onClick: () => switchView('cards') },
          { label: 'やり取りの履歴', active: view === 'log', hint: '全社のやり取りを新しい順に。建材ページ・Maker conect からの自動記録もここに', onClick: () => switchView('log') },
          { label: 'サンプル台帳', active: view === 'samples', hint: '依頼中・手元にあるサンプル。到着から30日で返却を促します', onClick: () => switchView('samples') },
          { label: '見積の履歴', active: view === 'quotes', hint: '見積を案件ごとに集計', onClick: () => switchView('quotes') },
          { label: 'CSV', hint: 'やり取りの履歴を CSV で保存', onClick: downloadLogCsv },
        ]}
      />
      {csvNotice && <p className="text-[11px] text-gray-600 py-1.5 border-b border-gray-200">{csvNotice}</p>}

      <div ref={bodyRef} className="flex flex-col md:flex-row gap-2 mt-3 scroll-mt-2">
        <div className="flex-1 min-w-0 bg-white border border-[#3b3b3b]">
        <div className="px-4 pt-3 pb-2 border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-0 mb-3 border-b border-gray-200">
            {tabs.map(([k, label, n]) => (
              <button
                key={k}
                type="button"
                onClick={() => setView(k)}
                className={`px-3 py-1.5 text-[11px] -mb-px border-b ${view === k ? 'border-[#52AA96] text-[#141414] font-bold' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
              >
                {label}
                <span className={`ml-1.5 yy-mono text-[10px] ${view === k ? 'text-gray-500' : 'text-gray-400'}`}>{n}</span>
              </button>
            ))}
            <div className="flex-1" />
            <button type="button" onClick={downloadLogCsv} className="text-[11px] text-gray-500 underline mb-1 hover:text-gray-800">履歴を CSV で保存</button>
          </div>
          {selectedCompany && (
            <p className="text-[11px] text-gray-600 mb-2 flex items-center gap-2">
              <span className={MONO}>COMPANY</span>
              <span className="font-bold text-[#141414]">{selectedCompany}</span>
              <button onClick={() => setSelectedCompany(null)} className="inline-flex items-center gap-0.5 underline text-gray-500 hover:text-gray-800">
                <FiX /> 解除
              </button>
            </p>
          )}
          {view === 'cards' && (
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <button
              onClick={addContact}
              className="yy-btn yy-btn--primary inline-flex items-center gap-1"
            >
              <FiPlus /> 新規追加
            </button>
            <select
              value={currentSortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-2 py-1.5 text-[11px] border border-gray-300 focus:outline-none"
            >
              <option value="input-desc">入力順（新しい順）</option>
              <option value="input-asc">入力順（古い順）</option>
              <option value="company-asc">会社名（あいうえお順）</option>
              <option value="company-desc">会社名（逆順）</option>
              <option value="name-asc">個人名（あいうえお順）</option>
              <option value="name-desc">個人名（逆順）</option>
            </select>
            <div className="flex-1 min-w-[180px] relative">
              <input
                type="text"
                value={contactSearchTerm}
                onChange={(e) => {
                  setContactSearchTerm(e.target.value);
                  setSelectedCompany(null);
                }}
                placeholder="会社名・氏名・部署・案件・履歴の内容で検索"
                className="w-full px-3 py-1.5 text-[11px] border border-gray-300 focus:outline-none"
              />
              {contactSearchTerm && (
                <button
                  onClick={clearContactSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="検索をやめる"
                >
                  <FiX />
                </button>
              )}
            </div>
          </div>
          )}
        </div>

        <div className="p-4">
            {view === 'log' && <LogTimeline contacts={contacts} onOpen={openCompany} />}
            {view === 'samples' && <SampleLedger contacts={contacts} today={today} onStatus={setSampleStatus} onOpen={(company) => openCompany(company)} />}
            {view === 'quotes' && <QuoteLedger contacts={contacts} today={today} onOpen={(company) => openCompany(company)} />}
            {view === 'cards' && (
            <div className="max-h-[calc(100vh-var(--nav-height)-200px)] min-h-[240px] overflow-y-auto md:pr-2">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredContacts.map((contact, index) => {
              const originalIndex = contacts.indexOf(contact);
              const inputCls = `px-1 py-0.5 border-0 border-b border-gray-200 focus:border-[#3b3b3b] w-full text-[11px] ${contact.locked ? 'bg-gray-50 text-gray-500' : 'bg-white'}`;
              return (
                <div key={originalIndex} className="overflow-hidden w-full text-xs border border-gray-300">
                  <div className="px-3 py-1.5 flex justify-between items-center border-b border-[#3b3b3b]">
                    <input
                      type="text"
                      value={contact.company}
                      placeholder="会社名"
                      onChange={(e) => updateContactField(originalIndex, 'company', e.target.value)}
                      disabled={contact.locked}
                      className="!border-0 bg-transparent focus:outline-none w-full font-bold text-[12px] text-[#141414] placeholder-gray-400 disabled:!bg-transparent disabled:text-[#141414]"
                    />
                    <div className="flex gap-2 items-center ml-2">
                      <button
                        onClick={() => toggleLock(originalIndex)}
                        title={contact.locked ? 'ロック解除' : 'ロック'}
                        className={`flex-shrink-0 text-[13px] ${contact.locked ? 'text-[#141414]' : 'text-gray-300 hover:text-gray-700'}`}
                      >
                        {contact.locked ? <FiLock /> : <FiUnlock />}
                      </button>
                      <button
                        onClick={() => deleteContact(originalIndex)}
                        title="削除"
                        className="text-gray-300 hover:text-red-600 flex-shrink-0 text-[13px]"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>

                  <div className="bg-white px-2 py-2 space-y-1">
                    <input type="text" value={contact.dept} placeholder="部署名" onChange={(e) => updateContactField(originalIndex, 'dept', e.target.value)} disabled={contact.locked} className={inputCls} />
                    <input type="text" value={contact.role} placeholder="役職" onChange={(e) => updateContactField(originalIndex, 'role', e.target.value)} disabled={contact.locked} className={inputCls} />
                    <input type="text" value={contact.name} placeholder="氏名" onChange={(e) => updateContactField(originalIndex, 'name', e.target.value)} disabled={contact.locked} className={inputCls} />
                    <input type="text" value={contact.phone} placeholder="携帯番号" onChange={(e) => updateContactField(originalIndex, 'phone', e.target.value)} disabled={contact.locked} className={inputCls} />
                    <input type="email" value={contact.email} placeholder="mail" onChange={(e) => updateContactField(originalIndex, 'email', e.target.value)} disabled={contact.locked} className={inputCls} />
                    <input type="text" value={contact.project || ''} placeholder="案件" onChange={(e) => updateContactField(originalIndex, 'project', e.target.value)} disabled={contact.locked} className={inputCls} />
                    <textarea value={contact.memo} placeholder="memo" onChange={(e) => updateContactField(originalIndex, 'memo', e.target.value)} disabled={contact.locked} className={`${inputCls} h-14 resize-none`} />
                  </div>
                  {(() => {
                    const sum = summarize(contact.log, today);
                    const open = !!contact.id && openLogId === contact.id;
                    const latest = sortLog(contact.log)[0];
                    return (
                      <>
                        <button
                          type="button"
                          disabled={!contact.id}
                          onClick={() => setOpenLogId(open ? null : contact.id!)}
                          className="w-full px-2 py-1.5 border-t border-gray-300 text-[11px] text-left hover:bg-gray-50 disabled:text-gray-300"
                          title={contact.id ? 'やり取りの履歴を開く' : '何か入力すると履歴を付けられます'}
                        >
                          <span className="flex items-center gap-2">
                            {open ? <FiChevronDown className="text-gray-500" /> : <FiChevronRight className="text-gray-500" />}
                            <span className="font-bold text-[#141414]">やり取り</span>
                            <span className="yy-mono text-[10px] text-gray-500">{sum.count}</span>
                            {sum.last && <span className="yy-mono text-[10px] tracking-[0.08em] text-gray-400">LAST {sum.last.slice(5).replace('-', '.')}</span>}
                            {sum.openSamples > 0 && <span className={`ml-auto px-1 border text-[10px] ${sum.returnDue ? 'border-red-500 text-red-700' : 'border-gray-400 text-gray-600'}`}>サンプル {sum.openSamples}{sum.returnDue ? `（返却待ち ${sum.returnDue}）` : ''}</span>}
                          </span>
                          {/* 最新の 1 件だけは畳んだままでも見せる（履歴があることに気づけるように） */}
                          {!open && latest && (
                            <span className="block mt-0.5 pl-5 text-[10px] text-gray-500 truncate">
                              {latest.kind}・{latest.text}{latest.source ? `（${latest.source}）` : ''}
                            </span>
                          )}
                        </button>
                        {open && <ContactLogPanel log={contact.log ?? []} project={contact.project} disabled={contact.locked} onChange={(next) => void saveLog(contact.id!, next)} />}
                      </>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          {filteredContacts.length === 0 && (
            <p className="py-6 text-[12px] text-gray-500">
              {contactSearchTerm || selectedCompany ? '検索条件に一致する連絡先がありません。' : '連絡先がありません。'}
              {!contactSearchTerm && !selectedCompany && (
                <button type="button" onClick={addContact} className="ml-1 underline text-gray-700 hover:text-black">担当者を追加する</button>
              )}
              {!contactSearchTerm && !selectedCompany && (
                <span className="block mt-1 text-[11px] text-gray-400">建材ページでメーカーの「お問い合わせ」「カタログ」を開くと、会社のカードが自動でできます（ログイン中）。</span>
              )}
            </p>
          )}
            </div>
            )}
          </div>
        </div>

        {/* 企業名リスト */}
        <div className="w-full md:w-56 bg-white border border-[#3b3b3b] h-fit shrink-0">
          <div className="px-3 py-2 border-b border-gray-200 flex items-baseline justify-between">
            <h3 className={MONO}>登録企業</h3>
            <span className="yy-mono text-[10px] text-gray-400">{companies.length}</span>
          </div>
          <div className="pl-2 pr-2 py-2">
            <div className="max-h-[30vh] md:max-h-[calc(100vh-300px)] overflow-y-auto">
              <ul>
                {companies.map((company, index) => (
                    <li
                      key={index}
                      className={`text-[11px] px-2 py-1 cursor-pointer border-l truncate ${
                        selectedCompany === company
                          ? 'border-[#52AA96] text-[#141414] font-bold bg-gray-50'
                          : 'border-transparent text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => { setView('cards'); handleCompanyClick(company); }}
                    >
                      {company}
                    </li>
                  ))}
              </ul>
              {companies.length === 0 ? (
                <p className="text-[11px] text-gray-500 px-2 py-2">登録企業がありません</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactsManagement; 