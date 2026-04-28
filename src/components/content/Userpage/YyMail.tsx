'use client'

import React, { useEffect, useMemo, useState } from 'react'

type FolderKey = 'inbox' | 'sent' | 'drafts'

type MailItem = {
  id: string
  folder: FolderKey
  from: string
  to: string
  subject: string
  body: string
  date: string
}

const STORAGE_KEY = 'yymail_storage_v1'

function loadStorage(): MailItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as MailItem[]
    return []
  } catch {
    return []
  }
}

function saveStorage(items: MailItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {}
}

function seedIfEmpty(): MailItem[] {
  const now = new Date()
  const base: MailItem[] = [
    {
      id: crypto.randomUUID(),
      folder: 'inbox',
      from: 'noreply@yaneyuka.com',
      to: 'you@yymail.local',
      subject: 'ようこそ YyMail（ローカル保存版）',
      body: 'このメールはデモ用です。実メール送受信は行いません。内容はブラウザのローカルに保存されます。',
      date: now.toISOString(),
    },
    {
      id: crypto.randomUUID(),
      folder: 'inbox',
      from: 'support@yaneyuka.com',
      to: 'you@yymail.local',
      subject: 'お知らせ：掲載希望はコチラが使いやすくなりました',
      body: '掲載希望フォームが更新されました。気軽にご連絡ください。',
      date: new Date(now.getTime() - 1000 * 60 * 60).toISOString(),
    },
  ]
  saveStorage(base)
  return base
}

export default function YyMail() {
  const [folder, setFolder] = useState<FolderKey>('inbox')
  const [items, setItems] = useState<MailItem[]>([])
  const [composeOpen, setComposeOpen] = useState(false)
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  useEffect(() => {
    const existing = loadStorage()
    if (existing.length === 0) {
      setItems(seedIfEmpty())
    } else {
      setItems(existing)
    }
  }, [])

  const list = useMemo(() => {
    return items
      .filter((m) => m.folder === folder)
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  }, [items, folder])

  const handleSend = () => {
    if (!to.trim() && !subject.trim() && !body.trim()) {
      setComposeOpen(false)
      return
    }
    const now = new Date().toISOString()
    const draftIndex = items.findIndex((m) => m.folder === 'drafts' && m.subject === subject && m.body === body)
    let newItems: MailItem[] = [...items]
    if (draftIndex >= 0) {
      newItems[draftIndex] = { ...newItems[draftIndex], folder: 'sent' as FolderKey, to, date: now }
    } else {
      newItems = [
        ...newItems,
        { id: crypto.randomUUID(), folder: 'sent' as FolderKey, from: 'you@yymail.local', to, subject, body, date: now },
      ]
    }
    setItems(newItems)
    saveStorage(newItems)
    setComposeOpen(false)
    setTo('')
    setSubject('')
    setBody('')
  }

  const handleSaveDraft = () => {
    const now = new Date().toISOString()
    const newItems: MailItem[] = [
      ...items,
      { id: crypto.randomUUID(), folder: 'drafts' as FolderKey, from: 'you@yymail.local', to, subject, body, date: now },
    ]
    setItems(newItems)
    saveStorage(newItems)
    setComposeOpen(false)
    setTo('')
    setSubject('')
    setBody('')
  }

  const handleDelete = (id: string) => {
    const newItems = items.filter((m) => m.id !== id)
    setItems(newItems)
    saveStorage(newItems)
  }

  return (
    <div className="pt-0 pb-4">
      <div className="flex flex-col md:flex-row md:items-baseline justify-between mb-2 flex-shrink-0">
        <div className="flex items-baseline gap-4">
          <h2 className="text-xl font-semibold">yymail</h2>
          <span className="text-red-600 font-bold text-xs sm:text-sm ml-4">※この機能は現在β版です。ご意見をぜひお聞かせください。</span>
        </div>
      </div>
      <p className="text-[12px] text-gray-600 mb-3">
        メールの送受信機能を提供します。受信トレイ、送信済み、下書きの管理が可能です。メールはブラウザのローカルストレージに保存され、実メール送受信は行いません。
      </p>
      <div className="mb-4 border rounded bg-white p-3">
        <div className="flex items-baseline justify-between mb-2">
          <div className="flex gap-2">
            <button className={`px-3 py-1 text-xs rounded ${folder === 'inbox' ? 'bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-700 hover:text-white'}`} onClick={() => setFolder('inbox')}>受信トレイ</button>
            <button className={`px-3 py-1 text-xs rounded ${folder === 'sent' ? 'bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-700 hover:text-white'}`} onClick={() => setFolder('sent')}>送信済み</button>
            <button className={`px-3 py-1 text-xs rounded ${folder === 'drafts' ? 'bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-700 hover:text-white'}`} onClick={() => setFolder('drafts')}>下書き</button>
          </div>
          <div className="text-[11px] text-gray-500">YyMail（ローカル保存・無料デモ）</div>
        </div>

      <div className="mb-2 flex justify-between">
        <div className="text-sm font-semibold">{folder === 'inbox' ? '受信トレイ' : folder === 'sent' ? '送信済み' : '下書き'}</div>
        <button className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => setComposeOpen(true)}>新規作成</button>
      </div>

      {composeOpen && (
        <div className="mb-3 border rounded p-2 bg-gray-50">
          <div className="mb-2 flex gap-2">
            <input className="flex-1 border rounded px-2 py-1 text-xs" placeholder="To" value={to} onChange={(e) => setTo(e.target.value)} />
            <input className="flex-[2] border rounded px-2 py-1 text-xs" placeholder="件名" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <textarea className="w-full border rounded px-2 py-1 text-xs h-24" placeholder="本文" value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="mt-2 flex gap-2">
            <button className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700" onClick={handleSend}>送信</button>
            <button className="px-3 py-1 text-xs bg-gray-700 text-white rounded hover:opacity-90" onClick={handleSaveDraft}>下書き保存</button>
            <button className="px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300" onClick={() => setComposeOpen(false)}>閉じる</button>
          </div>
        </div>
      )}

      <div className="divide-y border rounded">
        {list.length === 0 && (
          <div className="text-xs text-gray-500 p-2">表示するメールがありません。</div>
        )}
        {list.map((m) => (
          <div key={m.id} className="p-2 hover:bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium truncate mr-2">{m.subject || '(件名なし)'}</div>
              <div className="text-[11px] text-gray-500 whitespace-nowrap">{new Date(m.date).toLocaleString('ja-JP')}</div>
            </div>
            <div className="text-[11px] text-gray-600 truncate">{folder === 'sent' ? `To: ${m.to}` : `From: ${m.from}`}</div>
            <div className="text-xs text-gray-700 line-clamp-2 mt-1">{m.body}</div>
            <div className="mt-1 text-right">
              <button className="text-[11px] text-red-600 hover:underline" onClick={() => handleDelete(m.id)}>削除</button>
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  )
}


