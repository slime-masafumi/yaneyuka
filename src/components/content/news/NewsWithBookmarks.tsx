"use client"

import React, { useEffect, useMemo, useState } from 'react'
import NewsFeed, { NewsItem, getSourceHighlightColor } from './NewsFeed'
import { logEvent } from '@/lib/firebaseClient'
import { listNewsBookmarks, setNewsBookmark, deleteNewsBookmark } from '@/lib/firebaseUserData'
import { useAuth } from '@/lib/AuthContext'
import { db } from '@/lib/firebaseClient'
import { collection, onSnapshot } from 'firebase/firestore'

export default function NewsWithBookmarks() {
  const storageKey = 'newsBookmarks:v1'
  const { currentUser, isLoggedIn } = useAuth()
  const uid = currentUser?.uid || null
  const [bookmarks, setBookmarks] = useState<Record<string, any>>({})
  const [selectedMonth, setSelectedMonth] = useState<string | 'all'>('all')

  // 即時: キャッシュ（localStorage）で先に表示
  useEffect(() => {
    if (!uid) {
      // 一時的なuid未確定では現状維持。明示ログアウト時のみクリア
      if (isLoggedIn === false) setBookmarks({})
      return
    }
    try {
      const cached = localStorage.getItem(`newsBookmarks:${uid}`)
      if (cached) setBookmarks(JSON.parse(cached))
    } catch {}
  }, [uid, isLoggedIn])

  // リアルタイム購読＋バックグラウンド同期
  useEffect(() => {
    if (!uid) return
    const colRef = collection(db, 'users', uid, 'newsBookmarks')
    const unsub = onSnapshot(colRef, (snap) => {
      if (snap.empty) {
        if (snap.metadata.fromCache || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
          return
        }
      }
      const map: Record<string, any> = {}
      snap.docs.forEach(d => {
        const data = d.data() as any
        const originalId = (() => { try { return decodeURIComponent(d.id) } catch { return d.id } })()
        map[originalId] = { id: originalId, title: data.title, link: data.link || '#', source: data.meta?.source || '', pubDate: data.meta?.pubDate || '', description: data.meta?.description || '', createdAt: data.createdAt || 0 }
      })
      setBookmarks(map)
      try { localStorage.setItem(`newsBookmarks:${uid}`, JSON.stringify(map)) } catch {}
    })
    ;(async () => {
      try {
        const list = await listNewsBookmarks(uid)
        const map: Record<string, any> = {}
        list.forEach(b => {
          const originalId = (() => { try { return decodeURIComponent(b.id) } catch { return b.id } })()
          map[originalId] = { id: originalId, title: b.title, link: b.link || '#', source: (b as any).meta?.source || '', pubDate: (b as any).meta?.pubDate || '', description: (b as any).meta?.description || '', createdAt: (b as any).createdAt || 0 }
        })
        setBookmarks(map)
        try { localStorage.setItem(`newsBookmarks:${uid}`, JSON.stringify(map)) } catch {}
      } catch {}
    })()
    return () => unsub()
  }, [uid])

  const isBookmarked = (id: string) => !!bookmarks[id]
  const toggleBookmark = async (item: NewsItem) => {
    if (!uid) {
      alert('ブックマークには会員登録（無料）が必要です。')
      return
    }
    const exists = !!bookmarks[item.id]
    setBookmarks(prev => {
      const next: Record<string, any> = { ...prev }
      if (exists) delete next[item.id]; else next[item.id] = { ...item, createdAt: Date.now() }
      try { localStorage.setItem(`newsBookmarks:${uid}`, JSON.stringify(next)) } catch {}
      return next
    })
    if (exists) {
      await deleteNewsBookmark(uid, item.id)
    } else {
      await setNewsBookmark(uid, item.id, {
        title: item.title,
        link: item.link,
        meta: { source: item.source, pubDate: item.pubDate, description: item.description },
        createdAt: Date.now(),
      })
    }
  }

  const bookmarkedList = useMemo(() => {
    const list = Object.values(bookmarks) as any[]
    // 登録順（古い→新しい）で上から
    return list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
  }, [bookmarks])

  const months: (string | 'all')[] = useMemo(() => {
    const out: string[] = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      out.push(ym)
    }
    return ['all', ...out]
  }, [])

  return (
    <div>
      <div className="flex items-baseline mb-2">
        <h2 className="text-xl font-semibold">NEWS
          <span className="ml-2 text-[11px] font-normal text-gray-500">（外部ソース要約・出典リンク）</span>
        </h2>
      </div>
      <p className="text-[12px] text-gray-600 mb-3">
        建築・不動産・テック領域の最新ニュースをキュレーションしています。気になる記事はブックマークし、情報共有や後日のリサーチにお役立てください。
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {months.map(m => (
          <button
            key={m}
            type="button"
            className={`px-2 py-1 text-xs rounded ${selectedMonth === m ? 'bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-700 hover:text-white'}`}
            onClick={() => { setSelectedMonth(m); try { logEvent('news_month_select', { month: m }) } catch {} }}
          >
            {m === 'all' ? 'すべて' : m}
          </button>
        ))}
      </div>
      {/* スマホ: ブックマークを最上段に表示 */}
      <div className="lg:hidden mb-4">
        <div className="space-y-3">
          <div className="text-sm font-semibold">ブックマーク</div>
          {bookmarkedList.length === 0 && (
            <div className="text-[12px] text-gray-500">ブックマークはまだありません。</div>
          )}
          <div className="space-y-2">
            {bookmarkedList.map(b => {
              const highlight = getSourceHighlightColor(b.source || '')
              return (
                <div key={`bm-${b.id}`} className="p-3 border rounded border-gray-200 bg-white relative">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-[11px] text-gray-500">
                        <span className={`px-1.5 py-0.5 ${highlight.bg} font-medium text-white`}>{b.source}</span>
                      </div>
                      <a href={b.link} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-blue-700 hover:underline">
                        {b.title}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleBookmark(b)}
                      className="shrink-0 text-[11px] px-2 py-1 rounded border bg-white hover:bg-gray-50 border-gray-300 text-gray-700"
                      aria-label="ブックマーク解除"
                    >
                      解除
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {/* PC: 2列表示 */}
      <div className="hidden lg:grid grid-cols-3 gap-4 items-start">
        <div className="col-span-2">
          <NewsFeed onToggleBookmark={toggleBookmark} isBookmarked={isBookmarked} selectedMonth={selectedMonth} />
        </div>
        <div className="col-span-1">
          <div className="sticky top-4 space-y-3">
            <div className="text-sm font-semibold">ブックマーク</div>
            {bookmarkedList.length === 0 && (
              <div className="text-[12px] text-gray-500">ブックマークはまだありません。</div>
            )}
            <div className="space-y-2">
              {bookmarkedList.map(b => {
                const highlight = getSourceHighlightColor(b.source || '')
                return (
                  <div key={`bm-${b.id}`} className="p-3 border rounded border-gray-200 bg-white relative">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-[11px] text-gray-500">
                          <span className={`px-1.5 py-0.5 ${highlight.bg} font-medium text-white`}>{b.source}</span>
                        </div>
                        <a href={b.link} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-blue-700 hover:underline">
                          {b.title}
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleBookmark(b)}
                        className="shrink-0 text-[11px] px-2 py-1 rounded border bg-white hover:bg-gray-50 border-gray-300 text-gray-700"
                        aria-label="ブックマーク解除"
                      >
                        解除
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      {/* スマホ: 本文エリア（1列表示） */}
      <div className="lg:hidden">
        <NewsFeed onToggleBookmark={toggleBookmark} isBookmarked={isBookmarked} selectedMonth={selectedMonth} />
      </div>
    </div>
  )
}


