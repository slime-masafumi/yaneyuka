"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { NEWS_SOURCES } from '@/lib/newsSources'
import PageHead, { Stat } from '../../ui/PageHead'
import NewsFeed, { NewsItem } from './NewsFeed'
import { logEvent } from '@/lib/firebaseClient'
import { listNewsBookmarks, setNewsBookmark, deleteNewsBookmark } from '@/lib/firebaseUserData'
import { useAuth } from '@/lib/AuthContext'
import { db } from '@/lib/firebaseClient'
import { collection, onSnapshot } from 'firebase/firestore'

export default function NewsWithBookmarks() {
  const [feedsTotal, setFeedsTotal] = useState<number | null>(null)
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

  // I 業界ニュース / II メーカーのお知らせ / III 保存した記事。2026-11-14 右の欄(イベント・配信元)を外し、記事を全幅で大きく
  return (
    <div>
      <PageHead
        no="03"
        en="news"
        title="NEWS"
        desc="建設業界のニュースと、建材メーカーのお知らせ"
        right={
          <>
            <Stat n={NEWS_SOURCE_ROWS.length} label="配信元" />
            <Stat n={feedsTotal ?? '—'} label="メーカー" />
          </>
        }
      />
      <div className="yy-tabs yy-tabs--dates">
        {months.map(m => (
          <button
            key={m}
            type="button"
            aria-pressed={selectedMonth === m}
            className="yy-tab"
            onClick={() => { setSelectedMonth(m); try { logEvent('news_month_select', { month: m }) } catch {} }}
          >
            {m === 'all' ? 'すべて' : m}
          </button>
        ))}
      </div>
      <div className="yy-newspage yy-newspage--wide">
        <div className="yy-newspage__main">
          <section>
            <div className="yy-sec"><span className="yy-sec__no">I</span><span className="yy-sec__title">業界ニュース</span><span className="yy-sec__right">見出しと要約は配信元から</span></div>
            <NewsFeed onToggleBookmark={toggleBookmark} isBookmarked={isBookmarked} selectedMonth={selectedMonth} />
          </section>
          <AllMakerNews onTotal={setFeedsTotal} />
          <section>
            <div className="yy-sec"><span className="yy-sec__no">III</span><span className="yy-sec__title">保存した記事</span><span className="yy-sec__right">{bookmarkedList.length} 件</span></div>
            {bookmarkedList.length === 0 ? (
              <p className="yy-home__empty">記事の「☆ 保存」でここに残ります</p>
            ) : (
              <ul className="yy-home__news">
                {bookmarkedList.map(b => (
                  <li key={`bm-${b.id}`}>
                    <span className="yy-home__meta"><span>{b.source}</span>
                      <button type="button" className="yy-linkbtn" onClick={() => toggleBookmark(b)} aria-label="ブックマーク解除">解除</button>
                    </span>
                    <a href={b.link} target="_blank" rel="noopener noreferrer" title={b.title}>{b.title}</a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

/** /api/news の配信元(src/lib/newsSources.ts)。検索 = Google ニュースの検索経由 */
const NEWS_SOURCE_ROWS: Array<[string, string]> = NEWS_SOURCES.map((x) => [x.source.replace(/[（(]検索[)）]$/, ''), x.kind])

type Feed = { origin: string; name: string; categories: string[]; sample: string[]; newest: string }

/** II メーカーのお知らせ(全分類)。src/data/maker-feeds.json は 65KB あるので開いたときに読む */
function AllMakerNews({ onTotal }: { onTotal: (n: number) => void }) {
  const [rows, setRows] = useState<Feed[] | null>(null)
  useEffect(() => {
    let alive = true
    import('@/data/maker-feeds.json').then((m) => {
      if (!alive) return
      const all = (m.default as { feeds: Feed[] }).feeds || []
      onTotal(all.length)
      const ok = all.filter((f) => f.sample?.[0] && f.sample[0].length > 14 && !/休業|休暇|株式会社$/.test(f.sample[0]))
      ok.sort((a, b) => (b.newest || '').localeCompare(a.newest || ''))
      setRows(ok.slice(0, 8))
    })
    return () => { alive = false }
  }, [onTotal])
  if (!rows || !rows.length) return null
  return (
    <section className="yy-matnews yy-matnews--all">
      <div className="yy-sec"><span className="yy-sec__no">II</span><span className="yy-sec__title">メーカーのお知らせ</span><span className="yy-sec__right">各社サイトから</span></div>
      <ul>
        {rows.map((f) => (
          <li key={f.origin}>
            <span className="yy-matnews__cat">{f.categories[0]}</span>
            <span className="yy-matnews__name">{f.name}</span>
            <a href={f.origin} target="_blank" rel="noopener noreferrer" title={f.sample[0]}>{f.sample[0]}</a>
            <span className="yy-leader" />
            <span className="yy-matnews__date">{f.newest?.slice(5).replace('-', '/')}</span>
            <span className="yy-matnews__ext" aria-hidden="true">↗</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
