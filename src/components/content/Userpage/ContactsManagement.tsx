'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiLock, FiUnlock, FiTrash2, FiX, FiPlus, FiChevronDown, FiChevronRight, FiShare2 } from 'react-icons/fi';
import OfficeContacts from '@/components/office/OfficeContacts';
import { addOfficeContact, useMyOffice } from '@/lib/office';
import ToolHeader from './ToolHeader';
import GuestNote from './general-tools/GuestNote';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebaseClient';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDocsFromServer, writeBatch } from 'firebase/firestore';
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
  /**
   * 画面の中だけの印: 「新規追加」で出したまだ空のカード。何か入力した時点で保存する。
   * id は先に振っておく（以前は id 無しで作り、打鍵のたびに addDoc が走って同じ人が何枚もできていた）
   */
  _draft?: boolean;
}

const TEXT_FIELDS = ['company', 'dept', 'role', 'name', 'phone', 'email', 'project', 'memo'] as const;
const isCompletelyEmpty = (c: Contact) => TEXT_FIELDS.every((f) => String(c[f] ?? '').trim() === '');

/**
 * 未ログインのときは、このブラウザ（localStorage）に置く。
 * ログインしたとき、クラウドに連絡先が無ければ手元の分をそのまま上げる（移行）。あれば「取り込む」を出す。
 */
const GUEST_KEY = 'yy-guest-contacts';
const readGuestContacts = (): Contact[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((c: Contact) => c && typeof c.id === 'string') : [];
  } catch {
    return [];
  }
};
const writeGuestContacts = (list: Contact[]) => {
  try {
    const keep = list.filter((c) => !c._draft && !isCompletelyEmpty(c));
    if (keep.length) localStorage.setItem(GUEST_KEY, JSON.stringify(keep));
    else localStorage.removeItem(GUEST_KEY);
  } catch {
    /* 保存できない環境（プライベートウィンドウ等）では、開いている間だけ持つ */
  }
};
const clearGuestContacts = () => {
  try {
    localStorage.removeItem(GUEST_KEY);
  } catch {
    /* 消せなくても、次に開いたときにまた取り込みを案内するだけ */
  }
};
const guestId = () => `g-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
/** Firestore へ書く形（id と画面だけの印を外す。undefined は落とす） */
const toCloud = (c: Contact) => {
  const { id: _id, _draft, ...rest } = c;
  void _id;
  void _draft;
  return JSON.parse(JSON.stringify(rest));
};

/** CSV の 1 セル */
const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

const ContactsManagement: React.FC = () => {
  const { currentUser, isLoggedIn } = useAuth();
  // 事務所（入っていれば、共有の連絡先を下に出し、個人のカードを写せる）
  const myOffice = useMyOffice();
  // 担当者連絡先の状態
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currentSortOrder, setCurrentSortOrder] = useState<string>('input-desc');
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [view, setView] = useState<View>('cards');
  const [openLogId, setOpenLogId] = useState<string | null>(null);
  const [csvNotice, setCsvNotice] = useState('');
  // ログインしたとき、クラウドにも連絡先があり、手元にも未ログインで保存した分が残っている件数
  const [guestPending, setGuestPending] = useState(0);
  const [importing, setImporting] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const today = todayYmd();
  const isGuest = !currentUser;
  const guestRef = useRef(isGuest);
  guestRef.current = isGuest;
  // 打鍵の途中でも最新の一覧を読む（同じカードを 2 回作らないため）
  const contactsRef = useRef<Contact[]>([]);
  contactsRef.current = contacts;

  /** 一覧を書き換える。未ログインならこのブラウザにも書く */
  const setList = useCallback((updater: (prev: Contact[]) => Contact[]) => {
    setContacts((prev) => {
      const next = updater(prev);
      contactsRef.current = next;
      if (guestRef.current) writeGuestContacts(next);
      return next;
    });
  }, []);

  const flash = (msg: string) => {
    setCsvNotice(msg);
    setTimeout(() => setCsvNotice(''), 5000);
  };

  // 見出しの「できること」から切り替えたら、本文の頭へ寄せる（スマホで帯の下に隠れないように）
  const switchView = (v: View) => {
    setView(v);
    setTimeout(() => bodyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  };

  // 初期データの読み込み（即時キャッシュ→Firestore購読）。未ログインはこのブラウザの分
  useEffect(() => {
    setGuestPending(0);
    if (!currentUser) {
      if (isLoggedIn === false) setContacts(readGuestContacts().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      return;
    }
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
      // まだ何も入れていない「新規追加」のカードは Firestore に無いので、消さずに先頭へ残す
      const ids = new Set(list.map(c => c.id))
      const drafts = contactsRef.current.filter(c => c._draft && c.id && !ids.has(c.id))
      setContacts([...drafts, ...list])
      try { localStorage.setItem(`contacts:${currentUser.uid}`, JSON.stringify(list)) } catch {}
    })
    return () => unsub()
  }, [currentUser, isLoggedIn])

  const uploadContacts = async (uid: string, list: Contact[]) => {
    const colRef = collection(db, 'users', uid, 'contacts');
    for (let i = 0; i < list.length; i += 400) {
      const batch = writeBatch(db);
      list.slice(i, i + 400).forEach((c) => batch.set(doc(colRef), toCloud(c)));
      await batch.commit();
    }
  };

  // ログインしたとき、このブラウザに未ログインで保存した分があれば上げる。
  // クラウドに連絡先が無ければそのまま移す。あれば黙って混ぜず、「取り込む」を出す
  useEffect(() => {
    if (!currentUser) return;
    const guest = readGuestContacts();
    if (!guest.length) return;
    let alive = true;
    const colRef = collection(db, 'users', currentUser.uid, 'contacts');
    getDocsFromServer(colRef)
      .then(async (snap) => {
        if (!alive) return;
        if (snap.docs.some((d) => !isChatNicknameOnly(d.data()))) {
          setGuestPending(guest.length);
          return;
        }
        await uploadContacts(currentUser.uid, guest);
        clearGuestContacts();
        if (alive) flash(`このブラウザに保存していた連絡先 ${guest.length} 件をアカウントへ移しました`);
      })
      .catch(() => {
        /* オフライン等。次に開いたときにまた試す（手元の分は消さない） */
      });
    return () => {
      alive = false;
    };
  }, [currentUser]);


  /** クラウドに既にあるときの取り込み。会社名と氏名が同じ人は足さない */
  const importGuest = async () => {
    if (!currentUser || importing) return;
    const guest = readGuestContacts();
    const key = (c: Contact) => `${(c.company || '').trim()}|${(c.name || '').trim()}`;
    const have = new Set(contactsRef.current.filter((c) => !c._draft).map(key));
    const fresh = guest.filter((c) => !have.has(key(c)));
    setImporting(true);
    try {
      await uploadContacts(currentUser.uid, fresh);
      clearGuestContacts();
      setGuestPending(0);
      flash(fresh.length === guest.length ? `${fresh.length} 件を取り込みました` : `${fresh.length} 件を取り込みました（会社名・氏名が同じ ${guest.length - fresh.length} 件は足していません）`);
    } catch {
      flash('取り込めませんでした。時間をおいてもう一度お試しください');
    } finally {
      setImporting(false);
    }
  };

  // 担当者連絡先の機能
  const addContact = () => {
    // 未入力の新規カードが残っていれば、増やさずにそれを使ってもらう
    const empty = contactsRef.current.find((c) => c._draft && isCompletelyEmpty(c));
    if (empty) {
      setView('cards');
      setSelectedCompany(null);
      setContactSearchTerm('');
      flash('未入力のカードがあります。会社名などを入れると保存されます');
      setTimeout(() => (document.querySelector(`[data-contact="${empty.id}"] input`) as HTMLInputElement | null)?.focus(), 30);
      return;
    }
    // 先に id を振った空のカード。保存はいずれかの項目に入力したとき（updateContactField）
    const id = currentUser ? doc(collection(db, 'users', currentUser.uid, 'contacts')).id : guestId();
    const newContact: Contact = {
      id, company: '', dept: '', name: '', role: '', phone: '', email: '', project: '', memo: '',
      locked: false, createdAt: Date.now(), _draft: true,
    };
    // 絞り込み中だと新しいカードが見えないので外す
    setSelectedCompany(null);
    setContactSearchTerm('');
    setView('cards');
    setList(prev => [newContact, ...prev]);
    setTimeout(() => (document.querySelector(`[data-contact="${id}"] input`) as HTMLInputElement | null)?.focus(), 30);
  };

  const deleteContact = async (id: string) => {
    const target = contactsRef.current.find(c => c.id === id);
    if (!target) return;
    if (target.locked) {
      flash('ロックした連絡先は削除できません。先に鍵を外してください');
      return;
    }
    // まだ何も入れていないカードは確認なしで閉じる
    if (!target._draft && !confirm(`「${target.company || target.name || 'この連絡先'}」を削除してもよろしいですか？`)) return;
    setList(prev => prev.filter(c => c.id !== id));
    if (currentUser && !target._draft) { try { await deleteDoc(doc(db, 'users', currentUser.uid, 'contacts', id)) } catch {} }
  };

  /** 個人のカードを事務所の共有の連絡先へ写す（写したあとは別々のカード。やり取りの履歴は写さない） */
  const shareToOffice = async (id: string) => {
    const target = contactsRef.current.find(c => c.id === id);
    if (!target || !currentUser || !myOffice.office) return;
    if (!confirm(`「${target.company || target.name || 'この連絡先'}」を事務所「${myOffice.office.name}」のメンバー全員に共有しますか？（やり取りの履歴は共有しません）`)) return;
    try {
      await addOfficeContact(myOffice.office.id, currentUser.uid, currentUser.username, {
        company: target.company, dept: target.dept, role: target.role, name: target.name,
        phone: target.phone, email: target.email, project: target.project ?? '', memo: target.memo,
      });
      flash('事務所の共有の連絡先に写しました（下の「事務所で共有」）');
    } catch {
      flash('共有できませんでした。時間をおいてもう一度お試しください');
    }
  };

  const toggleLock = async (id: string) => {
    const target = contactsRef.current.find(c => c.id === id);
    if (!target) return;
    const nextLocked = !target.locked
    setList(prev => prev.map(c => c.id === id ? { ...c, locked: nextLocked } : c));
    if (currentUser && !target._draft) { try { await updateDoc(doc(db, 'users', currentUser.uid, 'contacts', id), { locked: nextLocked } as any) } catch {} }
  };

  const updateContactField = async (id: string, field: keyof Contact, value: string) => {
    const target = contactsRef.current.find(c => c.id === id);
    if (!target) return;
    const newValue: any = field === 'createdAt' ? parseInt(value) : value;
    const updatedLocal = { ...target, [field]: newValue } as Contact;
    // 新規カードは、いずれかの項目に 1 文字でも入った時点で保存する
    const becomesSaved = !!target._draft && !isCompletelyEmpty(updatedLocal);
    if (becomesSaved) delete updatedLocal._draft;
    setList(prev => prev.map(c => c.id === id ? updatedLocal : c));

    if (!currentUser || updatedLocal._draft) return;
    try {
      if (becomesSaved) await setDoc(doc(db, 'users', currentUser.uid, 'contacts', id), toCloud(updatedLocal));
      else await updateDoc(doc(db, 'users', currentUser.uid, 'contacts', id), { [field]: newValue } as any);
    } catch {}
  };


  const saveLog = async (contactId: string, next: ContactLogEntry[]) => {
    setList(prev => prev.map(c => c.id === contactId ? { ...c, log: next } : c));
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
      flash('まだ履歴がありません。記録すると CSV に書き出せます');
      return;
    }
    saveCsv(logCsv(contacts), `yaneyuka_やり取り履歴_${today}.csv`);
  };

  /** 担当者の一覧を CSV で（Excel で開けるよう BOM 付き）。いま絞り込んでいればその分だけ */
  const downloadContactsCsv = () => {
    const rows = filteredContacts.filter(c => !isCompletelyEmpty(c));
    if (!rows.length) {
      flash('書き出す連絡先がありません');
      return;
    }
    const head = ['会社名', '部署名', '役職', '氏名', '携帯番号', 'mail', '案件', 'memo', 'やり取り件数', '最終やり取り'];
    const lines = rows.map(c => {
      const sum = summarize(c.log, today);
      return [c.company, c.dept, c.role, c.name, c.phone, c.email, c.project ?? '', c.memo, sum.count, sum.last ?? ''].map(csvCell).join(',');
    });
    saveCsv('﻿' + [head.map(csvCell).join(','), ...lines].join('\n') + '\n', `yaneyuka_担当連絡先_${today}.csv`);
  };

  const saveCsv = (text: string, name: string) => {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const setSortOrder = (sortType: string) => {
    setCurrentSortOrder(sortType);
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
        no="22"
        code="CONTACTS"
        title="担当連絡先"
        description="メーカー・業者の担当者と、いつ何を頼みどう返ってきたかを残す。建材ページで窓口を開くと自動で記録"
        aside={<span className="yy-mono text-[10px] tracking-[0.12em] uppercase">{contacts.length} CONTACTS</span>}
        features={[
          { label: '担当者', active: view === 'cards', onClick: () => switchView('cards') },
          { label: 'やり取りの履歴', active: view === 'log', hint: '全社のやり取りを新しい順に。建材ページ・Maker conect からの自動記録もここに', onClick: () => switchView('log') },
          { label: 'サンプル台帳', active: view === 'samples', hint: '依頼中・手元にあるサンプル。到着から30日で返却を促します', onClick: () => switchView('samples') },
          { label: '見積の履歴', active: view === 'quotes', hint: '見積を案件ごとに集計', onClick: () => switchView('quotes') },
          { label: 'CSV', hint: '担当者の一覧（いま絞り込んでいればその分）を CSV で保存。やり取りの履歴の CSV は一覧の上から', onClick: downloadContactsCsv },
        ]}
      />
      {isGuest && <GuestNote className="mt-2 !mb-0" />}
      {!isGuest && guestPending > 0 && (
        <p className="text-[11px] text-gray-600 py-1.5 border-b border-gray-200 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span>このブラウザに、ログインせずに保存した連絡先が {guestPending} 件残っています。</span>
          <button type="button" onClick={() => void importGuest()} disabled={importing} className="underline text-[#141414] disabled:opacity-50">
            {importing ? '取り込み中…' : 'アカウントに取り込む'}
          </button>
          <button type="button" onClick={() => setGuestPending(0)} className="underline text-gray-500">あとで</button>
        </p>
      )}
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
            <span className="flex flex-wrap gap-x-3 mb-1">
              <button type="button" onClick={downloadContactsCsv} className="text-[11px] text-gray-500 underline hover:text-gray-800">担当者を CSV で保存</button>
              <button type="button" onClick={downloadLogCsv} className="text-[11px] text-gray-500 underline hover:text-gray-800">履歴を CSV で保存</button>
            </span>
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
              className="px-2 py-1.5 text-[11px] border border-gray-300 focus:outline-none max-w-full"
              aria-label="並べ替え"
            >
              <option value="input-desc">入力順（新しい順）</option>
              <option value="input-asc">入力順（古い順）</option>
              <option value="company-asc">会社名（あいうえお順）</option>
              <option value="company-desc">会社名（逆順）</option>
              <option value="name-asc">個人名（あいうえお順）</option>
              <option value="name-desc">個人名（逆順）</option>
            </select>
            <div className="flex-1 min-w-[160px] relative">
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
            {filteredContacts.map((contact) => {
              const cid = contact.id!;
              const inputCls = `px-1 py-0.5 border-0 border-b border-gray-200 focus:border-[#3b3b3b] w-full text-[11px] ${contact.locked ? 'bg-gray-50 text-gray-500' : 'bg-white'}`;
              const phoneHref = (contact.phone || '').replace(/[^\d+]/g, '');
              const mail = (contact.email || '').trim();
              return (
                <div key={cid} data-contact={cid} className="overflow-hidden w-full text-xs border border-gray-300">
                  <div className="px-3 py-1.5 flex justify-between items-center border-b border-[#3b3b3b]">
                    <input
                      type="text"
                      value={contact.company}
                      placeholder="会社名"
                      onChange={(e) => updateContactField(cid, 'company', e.target.value)}
                      disabled={contact.locked}
                      className="!border-0 bg-transparent focus:outline-none w-full font-bold text-[12px] text-[#141414] placeholder-gray-400 disabled:!bg-transparent disabled:text-[#141414]"
                    />
                    <div className="flex gap-2 items-center ml-2">
                      {myOffice.office && !contact._draft && (
                        <button
                          onClick={() => void shareToOffice(cid)}
                          title={`事務所「${myOffice.office.name}」に共有（写しを作る）`}
                          aria-label="事務所に共有"
                          className="flex-shrink-0 text-[13px] text-gray-300 hover:text-[#52AA96]"
                        >
                          <FiShare2 />
                        </button>
                      )}
                      <button
                        onClick={() => toggleLock(cid)}
                        title={contact.locked ? 'ロック解除' : 'ロック（書き換え・削除を防ぐ）'}
                        aria-label={contact.locked ? 'ロック解除' : 'ロック'}
                        className={`flex-shrink-0 text-[13px] ${contact.locked ? 'text-[#141414]' : 'text-gray-300 hover:text-gray-700'}`}
                      >
                        {contact.locked ? <FiLock /> : <FiUnlock />}
                      </button>
                      <button
                        onClick={() => deleteContact(cid)}
                        title="削除"
                        aria-label="削除"
                        className="text-gray-300 hover:text-red-600 flex-shrink-0 text-[13px]"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>

                  <div className="bg-white px-2 py-2 space-y-1">
                    <input type="text" value={contact.dept} placeholder="部署名" onChange={(e) => updateContactField(cid, 'dept', e.target.value)} disabled={contact.locked} className={inputCls} />
                    <input type="text" value={contact.role} placeholder="役職" onChange={(e) => updateContactField(cid, 'role', e.target.value)} disabled={contact.locked} className={inputCls} />
                    <input type="text" value={contact.name} placeholder="氏名" onChange={(e) => updateContactField(cid, 'name', e.target.value)} disabled={contact.locked} className={inputCls} />
                    {/* 番号・アドレスが入っていれば、その場で電話・メールを開ける */}
                    <span className="flex items-end gap-2">
                      <input type="tel" value={contact.phone} placeholder="携帯番号" onChange={(e) => updateContactField(cid, 'phone', e.target.value)} disabled={contact.locked} className={inputCls} />
                      {phoneHref.length >= 3 && <a href={`tel:${phoneHref}`} className="shrink-0 text-[10px] text-gray-500 underline hover:text-[#141414]">発信</a>}
                    </span>
                    <span className="flex items-end gap-2">
                      <input type="email" value={contact.email} placeholder="mail" onChange={(e) => updateContactField(cid, 'email', e.target.value)} disabled={contact.locked} className={inputCls} />
                      {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail) && <a href={`mailto:${mail}`} className="shrink-0 text-[10px] text-gray-500 underline hover:text-[#141414]">メール</a>}
                    </span>
                    <input type="text" value={contact.project || ''} placeholder="案件" onChange={(e) => updateContactField(cid, 'project', e.target.value)} disabled={contact.locked} className={inputCls} />
                    <textarea value={contact.memo} placeholder="memo" onChange={(e) => updateContactField(cid, 'memo', e.target.value)} disabled={contact.locked} className={`${inputCls} h-14 resize-none`} />
                  </div>
                  {(() => {
                    const sum = summarize(contact.log, today);
                    const open = !contact._draft && openLogId === cid;
                    const latest = sortLog(contact.log)[0];
                    return (
                      <>
                        <button
                          type="button"
                          disabled={!!contact._draft}
                          onClick={() => setOpenLogId(open ? null : cid)}
                          className="w-full px-2 py-1.5 border-t border-gray-300 text-[11px] text-left hover:bg-gray-50 disabled:text-gray-300"
                          title={contact._draft ? '何か入力すると履歴を付けられます' : 'やり取りの履歴を開く'}
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
                        {open && <ContactLogPanel log={contact.log ?? []} project={contact.project} disabled={contact.locked} onChange={(next) => void saveLog(cid, next)} />}
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
                <span className="block mt-1 text-[11px] text-gray-400">ログイン中は、建材ページでメーカーの「お問い合わせ」「カタログ」を開くと会社のカードが自動でできます。</span>
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
      {/* 事務所に入っていれば、共有の連絡先（メンバー全員が読み書き）を個人の一覧の下に出す */}
      {currentUser && myOffice.office && view === 'cards' && (
        <div>
          <OfficeContacts my={myOffice} uid={currentUser.uid} userName={currentUser.username} search={selectedCompany ?? contactSearchTerm} />
        </div>
      )}
    </div>
  );
};

export default ContactsManagement;