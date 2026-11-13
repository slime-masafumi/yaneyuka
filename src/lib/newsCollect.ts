/**
 * NEWS の収集(RSS を読んで、建築・建設に関係する記事だけを拾う)。
 *
 * 2 か所から使う:
 *   - scripts/collect-news.ts … GitHub Actions が 30 分ごとに実行し、Firestore の news-archive に貯める
 *   - src/app/api/news/route.ts … 貯めた分が読めないとき(開発サーバー・収集が止まったとき)の予備
 *
 * ⚠️ scripts から node で直接読む(node --import ./scripts/lib/register-ts.mjs)。拡張子なしの相対 import は
 * そのフックが .ts を補って解決する。@/ の別名はフックが知らないので使わない。
 */
import { NEWS_SOURCES, PER_SOURCE_CAP, type NewsSource } from './newsSources'
import { imageFromFeedItem } from './feedImage'

export type NewsItem = {
  id: string
  title: string
  link: string
  pubDate?: string
  source: string
  description?: string
  /** 記事の写真(RSS か記事ページの og:image)。無ければ付けない */
  image?: string
}

export type SourceResult = { source: string; url: string; ok: boolean; status: number; items: number; kept: number }

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
    if (src.exclude && src.exclude.test(title)) continue
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
    if (src.exclude && src.exclude.test(title)) continue
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


const UA = 'Mozilla/5.0 (compatible; yaneyuka-newsbot/1.0; +https://yaneyuka.com/)'

async function fetchFeed(url: string, timeoutMs: number): Promise<{ status: number; xml: string }> {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: ac.signal,
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
    })
    if (!res.ok) return { status: res.status, xml: '' }
    // 国交省の RSS は Shift_JIS。XML 宣言か Content-Type の文字コードで読み分ける
    const buf = new Uint8Array(await res.arrayBuffer())
    const head = new TextDecoder('ascii').decode(buf.slice(0, 200))
    const enc = (head.match(/encoding=["']([w-]+)["']/i)?.[1] || res.headers.get('content-type')?.match(/charset=([w-]+)/i)?.[1] || 'utf-8').toLowerCase()
    let xml: string
    try {
      xml = new TextDecoder(enc).decode(buf)
    } catch {
      xml = new TextDecoder('utf-8').decode(buf)
    }
    return { status: res.status, xml }
  } catch {
    return { status: 0, xml: '' }
  } finally {
    clearTimeout(t)
  }
}

/** 日付の文字列を数値(ミリ秒)に。読めなければ 0 */
export function pubTime(pubDate?: string): number {
  const t = pubDate ? Date.parse(pubDate) : NaN
  return Number.isFinite(t) ? t : 0
}

/**
 * すべての配信元を読み、新しい順に並べて返す(同じ記事は 1 件に)。
 * 1 配信元の上限(PER_SOURCE_CAP)は「一覧に出すとき」にかけるので、ここではかけない。
 */
export async function collectNews({ timeoutMs = 8000, minScore = 3 } = {}): Promise<{ items: NewsItem[]; sources: SourceResult[] }> {
  const fetched = await Promise.all(NEWS_SOURCES.map((s) => fetchFeed(s.url, timeoutMs)))
  const items: NewsItem[] = []
  const sources: SourceResult[] = []
  fetched.forEach(({ status, xml }, i) => {
    const src = NEWS_SOURCES[i]
    const total = (xml.match(/<item[\s>]|<entry[\s>]/g) || []).length
    const parsed = xml ? (/<entry[\s\S]*?<\/entry>/.test(xml) ? parseAtom(xml, src, minScore) : parseRss(xml, src, minScore)) : []
    items.push(...parsed)
    sources.push({ source: src.source, url: src.url, ok: total > 0, status, items: total, kept: parsed.length })
  })
  const seen = new Set<string>()
  const unique = items.filter((it) => (seen.has(it.link) ? false : (seen.add(it.link), true)))
  unique.sort((x, y) => pubTime(y.pubDate) - pubTime(x.pubDate))
  return { items: unique, sources }
}

/** 一覧に出す分: 新しい順のまま、1 配信元 PER_SOURCE_CAP 件までにして limit 件 */
export function pickForList<T extends { source: string }>(items: T[], limit = 40, cap = PER_SOURCE_CAP): T[] {
  const per = new Map<string, number>()
  const out: T[] = []
  for (const it of items) {
    const n = (per.get(it.source) || 0) + 1
    per.set(it.source, n)
    if (n <= cap) out.push(it)
    if (out.length >= limit) break
  }
  return out
}
