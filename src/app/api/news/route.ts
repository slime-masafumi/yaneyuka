import { NextResponse } from 'next/server'
import { fillImages, imageFromFeedItem } from '@/lib/feedImage'
import { NEWS_SOURCES, PER_SOURCE_CAP, type NewsSource } from '@/lib/newsSources'

type NewsItem = {
  id: string
  title: string
  link: string
  pubDate?: string
  source: string
  description?: string
  /** 記事の写真(RSS か記事ページの og:image)。無ければ付けない */
  image?: string
}

// 記事 URL → 写真 URL('' は「取りに行ったが無かった」)。インスタンスが生きている間は覚えておく
const IMAGE_CACHE = new Map<string, string>()

// メモリキャッシュ（5分）
let CACHE: { items: NewsItem[]; ts: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000

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

function cleanHtmlToText(html: string): string {
  if (!html) return ''
  let s = html
  s = s.replace(/&nbsp;/g, ' ')
       .replace(/&amp;/g, '&')
       .replace(/&lt;/g, '<')
       .replace(/&gt;/g, '>')
       .replace(/&quot;/g, '"')
       .replace(/&#39;/g, "'")
  s = s.replace(/<[^>]*>/g, '')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

function scoreText(title: string, description: string): number {
  const t = `${title} ${description}`
  let score = 0
  strongKeywords.forEach(k => { if (title.includes(k)) score += 3; else if (t.includes(k)) score += 2 })
  domainKeywords.forEach(k => { if (title.includes(k)) score += 2; else if (t.includes(k)) score += 1 })
  if (negativeKeywords.some(k => t.includes(k))) score -= 8
  return score
}

// 配信元の一覧と採り方(trusted / must)は src/lib/newsSources.ts
const sources = NEWS_SOURCES

function parseRss(xml: string, src: NewsSource, minScore: number): NewsItem[] {
  const source = src.source
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
    const pubDate = (raw.match(dateRegex)?.[1] || raw.match(/<dc:date>([\s\S]*?)<\/dc:date>/)?.[1] || '').trim()
    const descriptionRaw = (raw.match(descRegex)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim()
    if (!title || !link) continue
    const text = `${title} ${descriptionRaw}`
    const s = scoreText(title, descriptionRaw || '')
    if (src.must) { if (!src.must.test(title)) continue }
    else if (!src.trusted && s < minScore) continue
    if (negativeKeywords.some(k => text.includes(k))) continue
    if (/(殺人|強盗|暴行|傷害|逮捕|容疑者|死亡事故|事件|詐欺|略取|誘拐)/.test(text) && !/(工事|建設|施工|現場|安全|労災|墜落|是正|再発防止)/.test(text)) continue
    const description = cleanHtmlToText(descriptionRaw)
    const image = imageFromFeedItem(raw, link) || undefined
    out.push({ id: link, title, link, pubDate, source, description, ...(image ? { image } : {}) })
  }
  return out
}

function parseAtom(xml: string, src: NewsSource, minScore: number): NewsItem[] {
  const source = src.source
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
    if (src.must) { if (!src.must.test(title)) continue }
    else if (!src.trusted && s < minScore) continue
    if (negativeKeywords.some(k => text.includes(k))) continue
    if (/(殺人|強盗|暴行|傷害|逮捕|容疑者|死亡事故|事件|詐欺|略取|誘拐)/.test(text) && !/(工事|建設|施工|現場|安全|労災|墜落|是正|再発防止)/.test(text)) continue
    const description = cleanHtmlToText(descRaw)
    const image = imageFromFeedItem(raw, link) || undefined
    out.push({ id: link, title, link, pubDate, source, description, ...(image ? { image } : {}) })
  }
  return out
}

export async function GET() {
  try {
    if (CACHE && Date.now() - CACHE.ts < CACHE_TTL_MS) {
      return NextResponse.json({ items: CACHE.items }, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      });
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    // 並列取得（軽量化＆安定性）
    const fetchXML = async (url: string) => {
      const ac = new AbortController()
      const t = setTimeout(() => ac.abort(), 8000)
      try {
        const res = await fetch(url, {
          cache: 'no-store',
          signal: ac.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; yaneyuka-newsbot/1.0; +https://yaneyuka.com/)', Accept: 'application/rss+xml, application/xml, text/xml, */*' },
        })
        if (!res.ok) return ''
        return await res.text()
      } catch { return '' } finally { clearTimeout(t) }
    }

    const xmlList = await Promise.allSettled(sources.map(s => fetchXML(s.url)))
    const results: NewsItem[] = []
    xmlList.forEach((r, idx) => {
      if (r.status === 'fulfilled' && r.value) {
        const xml = r.value
        const s = sources[idx]
        const isAtom = /<entry[\s\S]*?<\/entry>/.test(xml)
        results.push(...(isAtom ? parseAtom(xml, s, 3) : parseRss(xml, s, 3)))
      }
    })
    // 閾値3で0件なら2→1→0
    let list = results
    if (list.length === 0) {
      xmlList.forEach((r, idx) => {
        if (r.status === 'fulfilled' && r.value) {
          const xml = r.value
          const s = sources[idx]
          const isAtom = /<entry[\s\S]*?<\/entry>/.test(xml)
          results.push(...(isAtom ? parseAtom(xml, s, 2) : parseRss(xml, s, 2)))
        }
      })
      list = results
    }
    if (list.length === 0) {
      xmlList.forEach((r, idx) => {
        if (r.status === 'fulfilled' && r.value) {
          const xml = r.value
          const s = sources[idx]
          const isAtom = /<entry[\s\S]*?<\/entry>/.test(xml)
          results.push(...(isAtom ? parseAtom(xml, s, 1) : parseRss(xml, s, 1)))
        }
      })
      list = results
    }
    if (list.length === 0) {
      xmlList.forEach((r, idx) => {
        if (r.status === 'fulfilled' && r.value) {
          const xml = r.value
          const s = sources[idx]
          const isAtom = /<entry[\s\S]*?<\/entry>/.test(xml)
          results.push(...(isAtom ? parseAtom(xml, s, 0) : parseRss(xml, s, 0)))
        }
      })
      list = results
    }
    clearTimeout(timeout)

    // sort & return
    list.sort((a, b) => (new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime()))
    const seen = new Set<string>()
    const perSource = new Map<string, number>()
    list = list.filter((it) => {
      if (seen.has(it.link)) return false
      seen.add(it.link)
      const n = (perSource.get(it.source) || 0) + 1
      perSource.set(it.source, n)
      return n <= PER_SOURCE_CAP
    })
    const trimmed = list.length > 0 ? list.slice(0, 40) : results.slice(0, 10)
    // 写真の無い記事は記事ページの og:image を取りに行く。Google News 経由の記事は
    // リンク先が Google のページで写真が取れないので行かない
    await fillImages(trimmed, IMAGE_CACHE, { budgetMs: 3500, parallel: 12, skip: (link) => link.includes('news.google.com') })
    CACHE = { items: trimmed, ts: Date.now() }
    return NextResponse.json({ items: trimmed }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (e) {
    if (CACHE) {
      return NextResponse.json({ items: CACHE.items }, { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      });
    }
    return NextResponse.json({ items: [] }, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  }
}
