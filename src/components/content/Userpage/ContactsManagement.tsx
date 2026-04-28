'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebaseClient';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

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
}

const ContactsManagement: React.FC = () => {
  const { currentUser, isLoggedIn } = useAuth();
  // 担当者連絡先の状態
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currentSortOrder, setCurrentSortOrder] = useState<string>('input-desc');
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

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
      const list: Contact[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any
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
    let sortedContacts = [...contacts];
    
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
      (contact.project || '').toLowerCase().includes(keyword)
    );
    }
    
    return sortedContacts;
  };

  const filteredContacts = getFilteredContacts();

  return (
    <div className="pl-0 pr-0 -mr-4 bg-white rounded-lg">
      <div className="flex items-baseline mb-2">
        <h2 className="text-xl font-semibold">担当者連絡先</h2>
        <span className="text-red-600 font-bold text-xs sm:text-sm ml-4">※この機能は現在β版です。ご意見をぜひお聞かせください。</span>
        {selectedCompany && (
          <span className="ml-4 text-sm text-gray-600">
            {selectedCompany}の担当者一覧
            <button
              onClick={() => setSelectedCompany(null)}
              className="ml-2 text-blue-600 hover:text-blue-800"
            >
              ✕ 解除
            </button>
          </span>
        )}
      </div>
      <p className="text-[12px] text-gray-600 mb-3">
        プロジェクトで頻繁に連絡を取るメーカー・施工会社・パートナー担当者の情報を一覧化して管理できます。会社名、部署、役職、連絡先（電話・メール）、案件名、メモなどを登録し、検索やソート機能で素早く目的の担当者を見つけられます。ロック機能で誤編集を防止することも可能です。
      </p>
      
      <div className="flex gap-2">
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={addContact}
              className="px-3 py-1.5 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
            >
              新規追加
            </button>
            <select
              value={currentSortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-gray-300"
            >
              <option value="input-desc">入力順（新しい順）</option>
              <option value="input-asc">入力順（古い順）</option>
              <option value="company-asc">会社名（あいうえお順）</option>
              <option value="company-desc">会社名（逆順）</option>
              <option value="name-asc">個人名（あいうえお順）</option>
              <option value="name-desc">個人名（逆順）</option>
            </select>
            <div className="flex-1 relative">
              <input
                type="text"
                value={contactSearchTerm}
                onChange={(e) => {
                  setContactSearchTerm(e.target.value);
                  setSelectedCompany(null);
                }}
                placeholder="会社名、氏名、部署、役職で検索"
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-gray-300"
              />
              {contactSearchTerm && (
                <button
                  onClick={clearContactSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-4">
            <div className="max-h-[calc(100vh-220px)] min-h-[560px] overflow-y-auto pr-4">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredContacts.map((contact, index) => {
              const originalIndex = contacts.indexOf(contact);
              return (
                <div key={originalIndex} className="overflow-hidden w-full text-xs border border-gray-200">
                  <div className="bg-gray-800 text-white px-3 py-2 flex justify-between items-center">
                    <input
                      type="text"
                      value={contact.company}
                      placeholder="会社名"
                      onChange={(e) => updateContactField(originalIndex, 'company', e.target.value)}
                      disabled={contact.locked}
                      className="bg-transparent focus:outline-none w-full font-semibold text-sm text-white placeholder-gray-300"
                    />
                    <div className="flex gap-2 items-center ml-2">
                      <button
                        onClick={() => toggleLock(originalIndex)}
                        title={contact.locked ? 'ロック解除' : 'ロック'}
                        className="text-gray-300 hover:text-white flex-shrink-0"
                      >
                        {contact.locked ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => deleteContact(originalIndex)}
                        title="削除"
                        className="text-gray-300 hover:text-white flex-shrink-0"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-white p-3 space-y-1.5">
                    <input
                      type="text"
                      value={contact.dept}
                      placeholder="部署名"
                      onChange={(e) => updateContactField(originalIndex, 'dept', e.target.value)}
                      disabled={contact.locked}
                          className={`p-1 border border-gray-300 rounded w-full ${contact.locked ? 'bg-gray-100' : 'bg-white'}`}
                    />
                    <input
                      type="text"
                      value={contact.role}
                      placeholder="役職"
                      onChange={(e) => updateContactField(originalIndex, 'role', e.target.value)}
                      disabled={contact.locked}
                          className={`p-1 border border-gray-300 rounded w-full ${contact.locked ? 'bg-gray-100' : 'bg-white'}`}
                    />
                    <input
                      type="text"
                      value={contact.name}
                      placeholder="氏名"
                      onChange={(e) => updateContactField(originalIndex, 'name', e.target.value)}
                      disabled={contact.locked}
                          className={`p-1 border border-gray-300 rounded w-full ${contact.locked ? 'bg-gray-100' : 'bg-white'}`}
                    />
                    <input
                      type="text"
                      value={contact.phone}
                      placeholder="携帯番号"
                      onChange={(e) => updateContactField(originalIndex, 'phone', e.target.value)}
                      disabled={contact.locked}
                          className={`p-1 border border-gray-300 rounded w-full ${contact.locked ? 'bg-gray-100' : 'bg-white'}`}
                    />
                    <input
                      type="email"
                      value={contact.email}
                      placeholder="mail"
                      onChange={(e) => updateContactField(originalIndex, 'email', e.target.value)}
                      disabled={contact.locked}
                          className={`p-1 border border-gray-300 rounded w-full ${contact.locked ? 'bg-gray-100' : 'bg-white'}`}
                    />
                    <input
                      type="text"
                      value={contact.project || ''}
                      placeholder="案件"
                      onChange={(e) => updateContactField(originalIndex, 'project', e.target.value)}
                      disabled={contact.locked}
                          className={`p-1 border border-gray-300 rounded w-full ${contact.locked ? 'bg-gray-100' : 'bg-white'}`}
                    />
                    <textarea
                      value={contact.memo}
                      placeholder="memo"
                      onChange={(e) => updateContactField(originalIndex, 'memo', e.target.value)}
                      disabled={contact.locked}
                          className={`p-1 border border-gray-300 rounded w-full h-16 resize-none ${contact.locked ? 'bg-gray-100' : 'bg-white'}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          
          {filteredContacts.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
                  {contactSearchTerm || selectedCompany ? '検索条件に一致する連絡先がありません' : '連絡先がありません。「追加」ボタンから新しい連絡先を追加してください。'}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* 企業名リストウィンドウ */}
        <div className="w-56 bg-white rounded-lg shadow-sm border border-gray-100 h-fit">
          <div className="px-3 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">登録企業一覧</h3>
          </div>
          <div className="pl-3 pr-2 py-3">
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto pr-0">
              <ul className="space-y-0.5">
                {Array.from(new Set(contacts.map(contact => contact.company)))
                  .filter(company => company && company.trim() !== '')
                  .sort((a, b) => (a || '').localeCompare(b || '', 'ja'))
                  .map((company, index) => (
                    <li 
                      key={index} 
                      className={`text-xs flex items-center gap-2 px-2 py-0.5 rounded cursor-pointer transition-colors ${
                        selectedCompany === company 
                          ? 'bg-gray-700 text-white' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => handleCompanyClick(company)}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        selectedCompany === company ? 'bg-white' : 'bg-gray-400'
                      }`} />
                      <span className="truncate">{company}</span>
                    </li>
                  ))}
              </ul>
              {contacts.length === 0 || !contacts.some(contact => contact.company && contact.company.trim() !== '') ? (
                <p className="text-sm text-gray-500 text-center mt-4">登録企業がありません</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactsManagement; 