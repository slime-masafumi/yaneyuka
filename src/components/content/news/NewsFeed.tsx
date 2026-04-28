"use client"

import React, { useEffect, useState } from 'react'
import { sanitizeHtml } from '@/lib/sanitize'

export type NewsItem = {
  id: string
  title: string
  link: string
  pubDate?: string
  source: string
  description?: string
}

type NewsFeedProps = {
  onToggleBookmark?: (item: NewsItem) => void
  isBookmarked?: (id: string) => boolean
  selectedMonth?: string | 'all'
}

// 検索元別のハイライト色マッピング（外部からも使用可能にする）
export const getSourceHighlightColor = (source: string): { bg: string; border: string } => {
  if (source.includes('建設工業新聞')) {
    return { bg: 'bg-red-600', border: 'border-red-700' }
  }
  if (source.includes('ELLE Japan')) {
    return { bg: 'bg-blue-600', border: 'border-blue-700' }
  }
  if (source.includes('日経xTECH') || source.includes('日経×TECH')) {
    return { bg: 'bg-yellow-500', border: 'border-yellow-600' }
  }
  if (source.includes('Lmaga.jp')) {
    return { bg: 'bg-emerald-600', border: 'border-emerald-700' }
  }
  if (source.includes('WSJ日本版')) {
    return { bg: 'bg-indigo-600', border: 'border-indigo-700' }
  }
  if (source.includes('国土交通省')) {
    return { bg: 'bg-green-600', border: 'border-green-700' }
  }
  if (source.includes('KENPLASE')) {
    return { bg: 'bg-cyan-600', border: 'border-cyan-700' }
  }
  if (source.includes('建設通信新聞')) {
    return { bg: 'bg-orange-600', border: 'border-orange-700' }
  }
  if (source.includes('R.E.port') || source.includes('RE.port')) {
    return { bg: 'bg-pink-600', border: 'border-pink-700' }
  }
  if (source.includes("LIFULL HOME'S") || source.includes('LIFULL')) {
    return { bg: 'bg-teal-600', border: 'border-teal-700' }
  }
  if (source.includes('Yahoo経済') || source.includes('Yahoo')) {
    return { bg: 'bg-gray-600', border: 'border-gray-700' }
  }
  // デフォルト（ハイライトなし）
  return { bg: 'bg-gray-500', border: 'border-gray-600' }
}

export default function NewsFeed({ onToggleBookmark, isBookmarked, selectedMonth = 'all' }: NewsFeedProps) {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [minScoreUsed, setMinScoreUsed] = useState<number>(3)
  const cacheKey = 'newsCache:v1'
  // 建設・建築ドメインに強く寄せるフィルタ
  const strongKeywords = [
    '建築','建設','土木','施工','ゼネコン','国交省','国土交通省','建築基準法','確認申請',
    '耐震','断熱','BIM','CIM','構造','設備','意匠','設計','法改正','告示','基準改定'
  ]
  const domainKeywords = [
    '外壁','屋根','サッシ','タイル','防水','改修','リフォーム','仕上げ','耐火','防火',
    '鉄骨','RC','木造','基礎','地盤','杭','鉄筋','型枠','足場','仮設','現場','工期','施工管理',
    '入札','公共工事','都市計画','用途地域','容積率','建蔽率','ZEH','ZEB','省エネ基準','建材',
    '建設業','建設費','建設投資','建設会社','設計事務所','不動産','インフラ','道路','橋梁','耐震改修'
  ]
  const negativeKeywords = [
    '芸能','アイドル','タレント','俳優','女優','歌手','アニメ','ゲーム','マンガ','グルメ','レシピ','スイーツ',
    'ファッション','コスメ','美容','ダイエット','恋愛','占い','旅行','観光','温泉','ホテル','テーマパーク','水族館','動物園',
    '犬','猫','ペット','スマホ','ガジェット','家電','PCゲーム','スポーツ','野球','サッカー','ゴルフ','テニス','相撲',
    '芸術','音楽','ライブ','コンサート','映画','ドラマ','アイス','ラーメン','カレー','居酒屋','ビール',
    '選挙','芸能人','暴力','殺人','事件','不祥事','炎上','youtuber','YouTuber','VTuber'
  ]

  const scoreText = (title: string, description: string): number => {
    const t = (title || '') + ' ' + (description || '')
    let score = 0
    // タイトルに強キーワード → +3、本文に強キーワード → +2
    strongKeywords.forEach(k => {
      if (title.includes(k)) score += 3
      else if (t.includes(k)) score += 2
    })
    // ドメイン語は重複加点、タイトルなら+2、本文+1
    domainKeywords.forEach(k => {
      if (title.includes(k)) score += 2
      else if (t.includes(k)) score += 1
    })
    // ネガティブ語が含まれると大幅減点
    if (negativeKeywords.some(k => t.includes(k))) score -= 8
    return score
  }

  const cleanHtmlToText = (html: string): string => {
    if (!html) return ''
    let s = html
    // decode common entities
    s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    // strip tags
    s = s.replace(/<[^>]*>/g, '')
    // collapse whitespace
    s = s.replace(/\s+/g, ' ').trim()
    return s
  }

  const sources: { url: string; source: string }[] = [
    { url: 'https://www.mlit.go.jp/rss/mlit_rss.xml', source: '国土交通省' },
    // 建設・建築寄りのソースを優先
    { url: 'https://ken-place.com/feed', source: 'KENPLASE' },
    { url: 'https://www.kensetsunews.com/feeds', source: '建設通信新聞' },
    { url: 'https://www.re-port.net/rss/', source: 'R.E.port 不動産ニュース' },
    { url: 'https://www.decn.co.jp/?feed=rss2', source: '建設工業新聞' },
    { url: 'https://www.homes.co.jp/cont/press/rss/', source: "LIFULL HOME'S PRESS" },
    // ボリューム確保用の補助（厳格フィルタ適用）
    { url: 'https://news.yahoo.co.jp/rss/topics/business.xml', source: 'Yahoo経済' },
    // サイト限定のGoogle News RSS（業界語で検索）
    { url: 'https://news.google.com/rss/search?q=site:xtech.nikkei.com+(%E5%BB%BA%E7%AF%89+OR+%E5%BB%BA%E8%A8%AD+OR+%E5%9C%9F%E6%9C%A8+OR+%E8%A8%AD%E8%A8%88)&hl=ja&gl=JP&ceid=JP:ja', source: '日経xTECH(検索)' },
    { url: 'https://news.google.com/rss/search?q=site:lmaga.jp+(%E5%BB%BA%E7%AF%89+OR+%E5%BB%BA%E8%A8%AD+OR+%E8%A8%AD%E8%A8%88+OR+%E3%83%AA%E3%83%8E%E3%83%99%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3)&hl=ja&gl=JP&ceid=JP:ja', source: 'Lmaga.jp(検索)' },
    { url: 'https://news.google.com/rss/search?q=site:jp.wsj.com+(%E4%B8%8D%E5%8B%95%E7%94%A3+OR+%E5%BB%BA%E8%A8%AD+OR+%E5%BB%BA%E7%AF%89)&hl=ja&gl=JP&ceid=JP:ja', source: 'WSJ日本版(検索)' },
    { url: 'https://news.google.com/rss/search?q=site:elle.com/jp+(%E5%BB%BA%E7%AF%89+OR+%E3%82%A4%E3%83%B3%E3%83%86%E3%83%AA%E3%82%A2+OR+%E5%BB%BA%E7%AF%89%E5%AE%B6)&hl=ja&gl=JP&ceid=JP:ja', source: 'ELLE Japan(検索)' }
  ]

  const fetchViaProxy = async (rssUrl: string) => {
    // CORS回避のためテキストプロキシを利用（スキーム保持）
    const proxied = `https://r.jina.ai/${rssUrl}`
    const res = await fetch(proxied, { cache: 'no-store' })
    if (!res.ok) throw new Error('proxy fetch failed')
    return await res.text()
  }

  const parseRss = (xml: string, source: string, minScore: number): NewsItem[] => {
    const out: NewsItem[] = []
    const itemRegex = /<item[\s\S]*?<\/item>/g
    const titleRegex = /<title>([\s\S]*?)<\/title>/
    const linkRegex = /<link>([\s\S]*?)<\/link>/
    const dateRegex = /<pubDate>([\s\S]*?)<\/pubDate>/
    const descRegex = /<description>([\s\S]*?)<\/description>/
    const items = xml.match(itemRegex) || []
    for (const raw of items) {
      const title = (raw.match(titleRegex)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim()
      const link = (raw.match(linkRegex)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim()
      const pubDate = (raw.match(dateRegex)?.[1] || '').trim()
      const descriptionRaw = (raw.match(descRegex)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim()
      if (!title || !link) continue
      const description = cleanHtmlToText(descriptionRaw)
      const text = `${title} ${description}`
      // スコアリングで厳格化
      const s = scoreText(title, description || '')
      if (s < minScore) continue
      if (negativeKeywords.some(k => text.includes(k))) continue
      // 事件・事故・殺人などの犯罪系は強制除外（ただし工事事故・施工事故・安全対策は通す）
      if (/(殺人|強盗|暴行|傷害|逮捕|容疑者|死亡事故|事件|詐欺|略取|誘拐)/.test(text) && !/(工事|建設|施工|現場|安全|労災|墜落|是正|再発防止)/.test(text)) continue
      out.push({ id: link, title, link, pubDate, source, description })
    }
    return out
  }

  const parseAtom = (xml: string, source: string, minScore: number): NewsItem[] => {
    const out: NewsItem[] = []
    const entryRegex = /<entry[\s\S]*?<\/entry>/g
    const titleRegex = /<title[^>]*>([\s\S]*?)<\/title>/
    const linkHrefRegex = /<link[^>]*href=["']([^"']+)["'][^>]*\/>/
    const updatedRegex = /<updated>([\s\S]*?)<\/updated>/
    const publishedRegex = /<published>([\s\S]*?)<\/published>/
    const summaryRegex = /<summary[^>]*>([\s\S]*?)<\/summary>/
    const contentRegex = /<content[^>]*>([\s\S]*?)<\/content>/
    const entries = xml.match(entryRegex) || []
    for (const raw of entries) {
      const title = (raw.match(titleRegex)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim()
      const link = (raw.match(linkHrefRegex)?.[1] || '').trim()
      const pubDate = ((raw.match(publishedRegex)?.[1]) || (raw.match(updatedRegex)?.[1]) || '').trim()
      const descRaw = (raw.match(summaryRegex)?.[1] || raw.match(contentRegex)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim()
      if (!title || !link) continue
      const text = `${title} ${descRaw}`
      const s = scoreText(title, descRaw || '')
      if (s < minScore) continue
      if (negativeKeywords.some(k => text.includes(k))) continue
      if (/(殺人|強盗|暴行|傷害|逮捕|容疑者|死亡事故|事件|詐欺|略取|誘拐)/.test(text) && !/(工事|建設|施工|現場|安全|労災|墜落|是正|再発防止)/.test(text)) continue
      const description = cleanHtmlToText(descRaw)
      out.push({ id: link, title, link, pubDate, source, description })
    }
    return out
  }

  const fetchDirectFallback = async (minScore: number): Promise<NewsItem[]> => {
    const results: NewsItem[] = []
    for (const s of sources) {
      try {
        const xml = await fetchViaProxy(s.url)
        if (/<entry[\s\S]*?<\/entry>/.test(xml)) {
          results.push(...parseAtom(xml, s.source, minScore))
        } else {
          results.push(...parseRss(xml, s.source, minScore))
        }
      } catch {
        // continue
      }
    }
    // 新しい順にソート
    results.sort((a, b) => (new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime()))
    return results
  }

  // キャッシュから即時表示
  useEffect(() => {
    try {
      const raw = localStorage.getItem(cacheKey)
      if (raw) {
        const cached = JSON.parse(raw) as NewsItem[]
        if (Array.isArray(cached) && cached.length > 0) {
          setItems(cached)
          setLoading(false)
        }
      }
    } catch {}
  }, [])

  // itemsをキャッシュ
  useEffect(() => {
    try { if (items.length > 0) localStorage.setItem(cacheKey, JSON.stringify(items)) } catch {}
  }, [items])

  const upsertItems = (incoming: NewsItem[]) => {
    setItems(prev => {
      const map = new Map<string, NewsItem>()
      prev.forEach(i => map.set(i.id, i))
      incoming.forEach(i => { if (!map.has(i.id)) map.set(i.id, i) })
      const arr = Array.from(map.values())
      arr.sort((a, b) => (new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime()))
      return arr
    })
  }

  useEffect(() => {
    let canceled = false

    const load = async () => {
      try {
        // --- Aプラン: サーバAPI (/api/news) を試行 ---
        console.log('Fetching from Server API...')
        const api = await fetch('/api/news', { cache: 'no-store' })
        
        if (api.ok) {
          const data = await api.json()
          const arr = (data.items || []) as NewsItem[]
          
          if (arr.length > 0) {
            if (!canceled) {
              console.log('Server API success:', arr.length)
              setItems(arr)
              setLoading(false)
            }
            return // API成功ならここで終了
          }
        }
        throw new Error('Server API returned empty or error')

      } catch (e) {
        console.warn('Server API failed, switching to Client Fallback:', e)
        
        // --- Bプラン: クライアント側で直接取得 (フォールバック) ---
        if (!canceled) {
          // ローディング表示は維持したままバックグラウンドで取得
          try {
            // 最低スコア設定を使って取得
            const directItems = await fetchDirectFallback(minScoreUsed)
            if (!canceled && directItems.length > 0) {
              console.log('Client Fallback success:', directItems.length)
              upsertItems(directItems) // 既存キャッシュとマージ
            }
          } catch (clientError) {
            console.error('Client Fallback also failed:', clientError)
          }
        }
      } finally {
        if (!canceled) setLoading(false)
      }
    }

    load()
    return () => { canceled = true }
  }, [minScoreUsed])

  if (loading) {
    return <div className="text-[12px] text-gray-500">読み込み中...</div>
  }

  return (
    <div className="space-y-3">
      {items
        .filter(item => {
          if (selectedMonth === 'all') return true
          if (!item.pubDate) return false
          const d = new Date(item.pubDate)
          if (isNaN(d.getTime())) return false
          const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          return ym === selectedMonth
        })
        .slice(0, 30)
        .map(item => {
        const bookmarked = isBookmarked ? isBookmarked(item.id) : false
        const highlight = getSourceHighlightColor(item.source)
        return (
          <div key={`${item.source}-${item.id}`} className="p-3 border rounded border-gray-200 bg-white">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[12px] text-gray-500">
                  <span className={`px-1.5 py-0.5 ${highlight.bg} font-medium text-white`}>{item.source}</span>
                  <span className="ml-1">・{item.pubDate ? new Date(item.pubDate).toLocaleString('ja-JP') : ''}</span>
                </div>
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-[14px] font-medium text-blue-700 hover:underline">
                  {item.title}
                </a>
              </div>
              <button
                type="button"
                onClick={() => onToggleBookmark && onToggleBookmark(item)}
                className={`shrink-0 text-[12px] px-2 py-1 rounded border ${bookmarked ? 'bg-yellow-100 border-yellow-300 text-yellow-700' : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'}`}
                aria-label={bookmarked ? 'ブックマーク解除' : 'ブックマーク'}
              >
                {bookmarked ? '★ 保存済' : '☆ ブクマ'}
              </button>
            </div>
            {item.description && (
              <div className="text-[12px] text-gray-700 mt-1 line-clamp-3" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
            )}
            <div className="text-[11px] text-gray-400 mt-1">出典先で全文をお読みください</div>
          </div>
        )
      })}
      {items.length === 0 && (
        <div className="text-[12px] text-gray-500">現在表示できるNEWSがありません。</div>
      )}
    </div>
  )
}


