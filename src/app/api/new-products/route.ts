import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getAdminDb } from '@/lib/firebaseAdmin'

// 新商品情報API: 建築・建材・住設のプレスリリースをRSSから集約し、
// キーワードでカテゴリ分類して返却する。
// Firestoreが利用可能な場合は過去30日分を蓄積・返却、未設定なら当日分のみ返却。

type NewProductCategory =
  | 'exterior'
  | 'interior'
  | 'structure'
  | 'opening'
  | 'equipment'
  | 'technology'
  | 'other'

type NewProductItem = {
  id: string
  title: string
  link: string
  pubDate?: string
  source: string
  description?: string
  category: NewProductCategory
  image?: string
}

// メモリキャッシュ（30分）
let CACHE: { items: NewProductItem[]; ts: number } | null = null
const CACHE_TTL_MS = 30 * 60 * 1000

// 「新商品」として強く反応するキーワード
const strongKeywords = [
  '新商品', '新製品', '新型', '新シリーズ', '新ライン', 'ラインアップ',
  'リリース', '発売', '発表', '新発売', '販売開始', '新登場', '刷新',
]
// 建材・住設ドメイン判定の正規表現（必ず1つ以上一致が必要）。
// 日本語は語境界がないため、曖昧な語は否定先読みで誤マッチを除外する。
const domainKeywordRegex = new RegExp(
  [
    // 建材・住設の総称
    '建材', '建築資材', '住宅資材', '住設', '住宅設備',
    // 外装
    '外壁', '屋根材', 'サイディング', '(?<!マイ|パ)ALC(?![A-Za-z])', 'ECP(?![A-Za-z])', 'SGL(?![A-Za-z])',
    '外装(?!モデル|会社)', '外構', 'エクステリア', '軒天', '雨どい', '笠木', '水切り?', 'ルーバー',
    'デッキ材', 'ウッドデッキ', '太陽光パネル', '太陽電池', 'ペロブスカイト',
    // 開口部
    'サッシ', '玄関ドア', '室内ドア', '建具', 'シャッター(?!チャンス|スピード)',
    '引戸', '網戸', '内窓', '断熱窓', '二重窓',
    // 照明
    '照明器具', 'LED照明', 'ペンダント照明', 'ダウンライト', 'シャンデリア',
    'スポットライト(?!メントを浴び)', '間接照明',
    // 設備
    'システムキッチン', 'ユニットバス', '浴室ユニット', '便器', '洗面台', '洗面化粧台',
    '給湯器', 'レンジフード', '水栓', '換気扇', '床暖房', 'IHクッキングヒーター',
    'エコキュート', 'ヒートポンプ給湯',
    // 内装（タイルは "スタイル" を除外）
    'フローリング', '壁紙', '(?<!電|ボーダー|クロスメディア|クロスオーバー)クロス(?!ワード|トーク|バイク|バー)',
    'カーペット', '内装材', '造作材', '巾木', '(?<!ス|オプ|モザイクア|モバ)タイル(?!トル)',
    '床材', '天井材', '壁材', 'ブラインド', 'カーテン',
    // 構造
    '建築金物', '木造金物', '耐震金物', '補強金物', '(?<![^性])金物', '構造材', '構造用(?!途)',
    '下地材', '集成材', '合板', 'OSB', 'CLT',
    // 素材
    '塗料', '断熱材', '防水材(?!料?理)', 'コーキング', 'シーリング材', '接着剤',
    '無垢材', '木質建材',
    // リフォーム系
    'リノベーション建材', 'リフォーム建材', '内窓リフォーム',
  ].join('|'),
  'i'
)
// 除外キーワード（明確に建材でないもの）
const negativeKeywords = [
  '芸能', 'アイドル', 'タレント', '俳優', '女優', '歌手', 'アニメ', 'ゲーム', 'マンガ',
  'グルメ', 'レシピ', 'スイーツ', 'コスメ', '美容', 'ダイエット', '恋愛', '占い',
  '旅行', '観光', '温泉', 'ホテル', 'テーマパーク', 'YouTuber', 'VTuber',
  '生産終了', '販売終了', '撤退', 'リコール', '不祥事', '炎上',
  // サービス系・イベント系・非建材の誤検出対策
  'ウェビナー', 'セミナー案内', 'キャリーバッグ', 'スーツケース',
  'バスケットボール', 'スポーツ', 'チケットサービス', 'SaaS',
  '書籍出版', 'マーケティング支援', 'リード獲得', 'CRM',
  '食品', '飲料', 'アパレル', 'ファッション',
  '展覧会', 'イベントレポート', '開催レポート',
  '書籍フェア', '書店フェア', 'ブックフェア', 'デザインウィーク',
  // クラウド/SaaS系（"キクロス"のような固有名サービスを排除）
  'クラウドサービス', '業務支援クラウド', '業務支援SaaS', 'キクロス', 'マクロス', 'クラウド版',
  '商工会議所向け',
]

// RSS/Atomソース（公式RSSのみを使用、規約遵守）
// 直接RSSのみに統一。og:image取得が確実に動作し、画像品質が保たれる。
// Google News検索RSSは記事URLがGoogle News自体を指すため、og:imageが取れず廃止。
const sources: { url: string; source: string }[] = [
  { url: 'https://www.s-housing.jp/feed', source: '新建ハウジング' },
  { url: 'https://www.housenews.jp/feed/', source: '住宅産業新聞' },
  { url: 'https://www.decn.co.jp/?feed=rss2', source: '建設工業新聞' },
  { url: 'https://www.kensetsunews.com/rss', source: '建設通信新聞' },
  { url: 'https://prtimes.jp/index.rdf', source: 'PR TIMES' },
]

function decodeHtmlEntities(s: string): string {
  if (!s) return ''
  // 二重エスケープ（&amp;amp; -> &amp;）を複数回展開してから基本エンティティを解決
  let out = s
  for (let i = 0; i < 3; i++) {
    const before = out
    out = out
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/gi, "'")
      .replace(/&#93;/g, ']')
      .replace(/&#91;/g, '[')
    if (out === before) break
  }
  // 数値実体参照 &#N; / &#xHH;
  out = out.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
  out = out.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
  return out
}

function cleanHtmlToText(html: string): string {
  if (!html) return ''
  let s = decodeHtmlEntities(html)
  s = s.replace(/<[^>]*>/g, '')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

function scoreText(title: string, description: string): number {
  const t = `${title} ${description}`
  let score = 0
  strongKeywords.forEach(k => {
    if (title.includes(k)) score += 4
    else if (t.includes(k)) score += 2
  })
  // ドメイン判定は regex（曖昧語除外版）
  if (domainKeywordRegex.test(title)) score += 2
  else if (domainKeywordRegex.test(t)) score += 1
  if (negativeKeywords.some(k => t.includes(k))) score -= 10
  return score
}

function classifyCategory(text: string): NewProductCategory {
  // 優先度順：より特徴的なものから判定。曖昧語（タイル/クロス等）は否定先読みで誤マッチ排除。
  if (/外壁|屋根材|サイディング|(?<!マイ|パ)ALC(?![A-Za-z])|ECP(?![A-Za-z])|SGL(?![A-Za-z])|瓦|防水材|防水工事|エクステリア|外構|軒天|雨どい|笠木|水切|外装(?!モデル|会社)|ルーバー|デッキ材|ウッドデッキ|太陽光パネル|太陽電池|ペロブスカイト/.test(text)) return 'exterior'
  if (/サッシ|玄関ドア|室内ドア|建具|シャッター(?!チャンス|スピード)|引戸|開口部|網戸|内窓|断熱窓|二重窓/.test(text)) return 'opening'
  if (/照明器具|LED照明|ペンダント照明|ダウンライト|シャンデリア|間接照明|スポットライト(?!メントを浴び)/.test(text)) return 'technology'
  if (/システムキッチン|ユニットバス|浴室ユニット|便器|洗面台|洗面化粧台|給湯器|換気扇|水栓|レンジフード|住設|床暖房|IHクッキングヒーター|エコキュート|ヒートポンプ給湯/.test(text)) return 'equipment'
  if (/フローリング|壁紙|(?<!電|ボーダー|クロスメディア|クロスオーバー)クロス(?!ワード|トーク|バイク|バー)|カーペット|天井材|内装材|インテリア建材|(?<!ス|オプ|モザイクア|モバ)タイル(?!トル)|床材|造作材|巾木|ブラインド|カーテン/.test(text)) return 'interior'
  if (/建築金物|木造金物|耐震金物|補強金物|(?<![^性])金物|構造材|構造用(?!途)|下地材|集成材|合板|OSB|CLT/.test(text)) return 'structure'
  return 'other'
}

// カテゴリ別のフォールバック画像（既存のNewProduct画像を流用）
const categoryImages: Record<NewProductCategory, string> = {
  exterior: '/image/NewProduct/Gemini_Generated_Image_vwyodivwyodivwyo.webp',
  interior: '/image/NewProduct/Gemini_Generated_Image_idc6alidc6alidc6.webp',
  structure: '/image/NewProduct/Gemini_Generated_Image_up9ky3up9ky3up9k.webp',
  opening: '/image/NewProduct/Gemini_Generated_Image_vredwavredwavred.webp',
  equipment: '/image/NewProduct/Gemini_Generated_Image_vtogzvvtogzvvtog.webp',
  technology: '/image/NewProduct/Gemini_Generated_Image_e7vx3oe7vx3oe7vx.webp',
  other: '/image/掲載募集中a.png',
}

function extractImageFromRss(raw: string): string | undefined {
  // 抽出前にHTMLエンティティを解決（CDATA内のHTML文字化けを直す）
  const decoded = decodeHtmlEntities(raw)
  const sanitize = (u: string): string | undefined => {
    // 末尾の不正な記号・XMLタグ片を除去
    let v = u.replace(/[<>"'\s]+.*$/, '').replace(/[)\]]+$/, '')
    // 末尾に "..." / "…" がある場合は切り捨てて残りの末尾不完全クエリも除去
    if (/(\.{3,}|…)$/.test(v)) {
      v = v.replace(/[?&][^?&=]*=?[^&]*(\.{3,}|…)$/, '').replace(/[?&][^?&]*$/, '')
    }
    // 拡張子で終わるか、有意な長さがある URL のみ採用
    if (!/\.(jpg|jpeg|png|webp|gif|avif|svg)($|\?)/i.test(v) && v.length < 40) return undefined
    return v
  }
  // <enclosure url="..." type="image/*"> を優先
  const enc = decoded.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image/i)
  if (enc?.[1]) { const v = sanitize(enc[1]); if (v) return v }
  // <media:content url="..." medium="image">
  const mc = decoded.match(/<media:content[^>]*url=["']([^"']+)["'][^>]*(?:medium=["']image["']|type=["']image)/i)
  if (mc?.[1]) { const v = sanitize(mc[1]); if (v) return v }
  // <media:thumbnail url="...">
  const mt = decoded.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i)
  if (mt?.[1]) { const v = sanitize(mt[1]); if (v) return v }
  // <img src="...">
  const img = decoded.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (img?.[1]) { const v = sanitize(img[1]); if (v) return v }
  // PR TIMES形式: "[画像1: URL ...]" — スペース/角括弧/改行で停止。
  // 末尾が `...` や `…` の場合、descriptionが省略されていて URL不完全 → og:image fetch に任せる
  const prt = decoded.match(/\[画像\d*:\s*(https?:\/\/\S+?)(?:[\s\]]|$)/)
  if (prt?.[1]) { const v = sanitize(prt[1]); if (v) return v }
  return undefined
}

// 記事URLからog:image / twitter:image を取得
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), 6000)
    const res = await fetch(url, {
      cache: 'no-store',
      signal: ac.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en;q=0.5',
      },
    })
    clearTimeout(t)
    if (!res.ok) return null
    // HTMLは先頭40KBだけ読めばog/twitterタグは取れる（巨大ページ対策）
    const fullText = await res.text()
    const html = fullText.slice(0, 80000)
    // og:image（property/content の順序両方に対応）
    const og =
      html.match(/<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/i)
    if (og?.[1]) return decodeHtmlEntities(og[1])
    // twitter:image
    const tw =
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)
    if (tw?.[1]) return decodeHtmlEntities(tw[1])
    // 本文最初の <img src="..."> を保険として
    const body = html.match(/<img[^>]+src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp|gif))["']/i)
    if (body?.[1]) return decodeHtmlEntities(body[1])
    return null
  } catch {
    return null
  }
}

function parseRss(xml: string, source: string, minScore: number): NewProductItem[] {
  const out: NewProductItem[] = []
  const itemRegex = /<item[\s\S]*?<\/item>/g
  const titleRegex = /<title>([\s\S]*?)<\/title>/
  const linkRegex = /<link>([\s\S]*?)<\/link>/
  // RSS 2.0 の pubDate と RSS 1.0(RDF)/Atomの dc:date 両方に対応
  const dateRegex = /<pubDate>([\s\S]*?)<\/pubDate>/
  const dcDateRegex = /<dc:date>([\s\S]*?)<\/dc:date>/
  const descRegex = /<description>([\s\S]*?)<\/description>/
  // RDF形式（PR TIMES）: <item rdf:about="URL">...</item> — link要素がない場合がある
  const rdfAboutRegex = /<item[^>]*rdf:about=["']([^"']+)["']/
  const items = xml.match(itemRegex) || []
  for (const raw of items) {
    const title = (raw.match(titleRegex)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim()
    const link = (raw.match(linkRegex)?.[1] || raw.match(rdfAboutRegex)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim()
    const pubDate = (raw.match(dateRegex)?.[1] || raw.match(dcDateRegex)?.[1] || '').trim()
    const descriptionRaw = (raw.match(descRegex)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim()
    if (!title || !link) continue
    const text = `${title} ${descriptionRaw}`
    const s = scoreText(title, descriptionRaw || '')
    if (s < minScore) continue
    if (negativeKeywords.some(k => text.includes(k))) continue
    // ドメインキーワード必須（建材系に関係ない記事を弾く）
    const decodedText = decodeHtmlEntities(text)
    if (!domainKeywordRegex.test(decodedText)) continue
    const description = cleanHtmlToText(descriptionRaw)
    const category = classifyCategory(`${title} ${description}`)
    if (category === 'other') continue // 分類できないノイズは除外
    const imageFromRss = extractImageFromRss(raw)
    out.push({
      id: link,
      title,
      link,
      pubDate,
      source,
      description,
      category,
      image: imageFromRss || categoryImages[category],
    })
  }
  return out
}

function parseAtom(xml: string, source: string, minScore: number): NewProductItem[] {
  const out: NewProductItem[] = []
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
    const decodedText = decodeHtmlEntities(text)
    if (!domainKeywordRegex.test(decodedText)) continue
    const description = cleanHtmlToText(descRaw)
    const category = classifyCategory(`${title} ${description}`)
    if (category === 'other') continue
    const imageFromRss = extractImageFromRss(raw)
    out.push({
      id: link,
      title,
      link,
      pubDate,
      source,
      description,
      category,
      image: imageFromRss || categoryImages[category],
    })
  }
  return out
}

export async function GET() {
  try {
    if (CACHE && Date.now() - CACHE.ts < CACHE_TTL_MS) {
      return NextResponse.json({ items: CACHE.items }, {
        headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
      })
    }

    const fetchXML = async (url: string) => {
      const ac = new AbortController()
      const t = setTimeout(() => ac.abort(), 8000)
      try {
        const res = await fetch(url, {
          cache: 'no-store',
          signal: ac.signal,
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; YaneyukaBot/1.0; +https://yaneyuka.com)',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          },
        })
        if (!res.ok) return ''
        return await res.text()
      } catch {
        return ''
      } finally {
        clearTimeout(t)
      }
    }

    const xmlList = await Promise.allSettled(sources.map(s => fetchXML(s.url)))
    const results: NewProductItem[] = []
    // 閾値1で一括取得（直接RSSのみなので低閾値でもノイズ少ない）。
    // カテゴリ分類で 'other' を排除するため、実質的な品質は保たれる。
    xmlList.forEach((r, idx) => {
      if (r.status === 'fulfilled' && r.value) {
        const xml = r.value
        const s = sources[idx]
        const isAtom = /<entry[\s\S]*?<\/entry>/.test(xml)
        const parsed = isAtom ? parseAtom(xml, s.source, 1) : parseRss(xml, s.source, 1)
        results.push(...parsed)
      }
    })

    // 重複除去（linkで判定）
    const seen = new Set<string>()
    const dedup = results.filter(item => {
      if (seen.has(item.link)) return false
      seen.add(item.link)
      return true
    })

    // pubDate降順でソート
    dedup.sort((a, b) => new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime())

    const trimmed = dedup.slice(0, 150)

    // 画像がカテゴリ用フォールバック（/image/NewProduct/〜）になっている項目について、
    // 記事URLからog:imageを並列取得して差し替え（全件対象、タイムアウト6秒/件、10並列）
    const needsOg = trimmed.filter(item =>
      !item.image || item.image.startsWith('/image/NewProduct/') || item.image.startsWith('/image/掲載募集中')
    )
    // 10並列のバッチ処理（一気に150並列すると一部サーバーに高負荷になるため）
    const BATCH = 10
    for (let i = 0; i < needsOg.length; i += BATCH) {
      const batch = needsOg.slice(i, i + BATCH)
      await Promise.allSettled(
        batch.map(async item => {
          const og = await fetchOgImage(item.link)
          if (og) item.image = og
        })
      )
    }

    // Firestoreに蓄積して過去30日分と合わせて返す（設定時のみ）
    const ARCHIVE_DAYS = 30
    const MAX_RETURN = 200
    const adminDb = getAdminDb()
    let finalItems: NewProductItem[] = trimmed
    if (adminDb) {
      try {
        const col = adminDb.collection('new-products-archive')
        const cutoffTs = Date.now() - ARCHIVE_DAYS * 24 * 60 * 60 * 1000
        // 既存items取得（過去30日分）
        const snap = await col.where('ts', '>=', cutoffTs).get()
        const existing = snap.docs.map(d => d.data() as NewProductItem & { ts: number })
        const existingIds = new Set(existing.map(x => x.id))

        // 新規item（まだ書き込まれていないもの）を抽出
        const toAdd = trimmed.filter(item => !existingIds.has(item.id))
        if (toAdd.length > 0) {
          const batch = adminDb.batch()
          const now = Date.now()
          for (const item of toAdd) {
            // URLを短いdoc IDに変換（Firestoreは1500byte制限）
            const docId = crypto.createHash('sha256').update(item.id).digest('hex').slice(0, 40)
            // Firestoreはundefined不可、空文字列に正規化
            const cleaned: Record<string, unknown> = { ...item, ts: now }
            for (const k of Object.keys(cleaned)) {
              if (cleaned[k] === undefined) cleaned[k] = ''
            }
            batch.set(col.doc(docId), cleaned, { merge: true })
          }
          await batch.commit()
        }

        // マージ＆ソート（新規+既存）し、pubDate降順で返却
        const merged = [...toAdd.map(i => ({ ...i, ts: Date.now() })), ...existing]
        // id重複を除去（toAddは既にexistingに無いので本来不要だが保険）
        const seenIds = new Set<string>()
        const uniq = merged.filter(i => {
          if (seenIds.has(i.id)) return false
          seenIds.add(i.id)
          return true
        })
        uniq.sort((a, b) => new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime())
        finalItems = uniq.slice(0, MAX_RETURN).map(({ ts, ...rest }) => rest as NewProductItem)
      } catch (err) {
        console.error('[new-products] Firestore蓄積エラー（当日分のみ返却）:', err)
        finalItems = trimmed
      }
    }

    CACHE = { items: finalItems, ts: Date.now() }

    return NextResponse.json({ items: finalItems }, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
    })
  } catch (e) {
    if (CACHE) {
      return NextResponse.json({ items: CACHE.items }, {
        status: 200,
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
      })
    }
    return NextResponse.json({ items: [] }, {
      status: 200,
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    })
  }
}
