/**
 * 新製品の収集(建材・住設のプレスリリースを RSS から拾い、分類する)。
 *
 * 2 か所から使う:
 *   - scripts/collect-products.ts … GitHub Actions が 3 時間ごとに実行し、Firestore の new-products-archive に貯める
 *   - src/app/api/new-products/route.ts … 貯めた分が読めないとき(開発サーバー・収集が止まったとき)の予備
 * 判定のキーワードと分類は、もとは route.ts にあったものをそのまま移した。
 *
 * ⚠️ scripts から node で直接読む(node --import ./scripts/lib/register-ts.mjs)。@/ の別名は使わない。
 *    メーカーの配信一覧(src/data/maker-feeds.json)は呼び出し側が読んで渡す(JSON の import の書き方が node と Next で違うため)。
 */

import { normalizeImageUrl } from './feedImage';

export type NewProductCategory =
  | 'exterior'
  | 'interior'
  | 'structure'
  | 'opening'
  | 'equipment'
  | 'technology'
  | 'other'

export type NewProductItem = {
  id: string
  title: string
  link: string
  pubDate?: string
  source: string
  description?: string
  category: NewProductCategory
  image?: string
}


/** 配信元。trusted = 建材メーカー自身の配信(建材の話であることは前提にしてよい) */
export type ProductSource = { url: string; source: string; trusted?: boolean; /** 記事から分類できなかったときの分類(メーカーの扱う分類から) */ fallback?: NewProductCategory };

/** maker-feeds.json の分類(建材の 16 分類の名前) → 新製品の 6 分類 */
const MAKER_CAT_TO_PRODUCT: Record<string, NewProductCategory> = {
  屋根: 'exterior', 外壁: 'exterior', 外部床: 'exterior', 外部その他: 'exterior', 防水: 'exterior', 外構: 'exterior', エクステリア: 'exterior',
  内部床: 'interior', 内装壁材: 'interior', 内装天井材: 'interior', 内装その他: 'interior', ファニチャー: 'interior',
  開口部: 'opening', 金物: 'structure', 機械設備: 'equipment', 電気設備: 'technology',
};

/**
 * 業界紙・総合リリース配信。建材と無関係な記事が大量に混ざるので、建材キーワードでの絞り込みが必須(trusted: false)。
 * 2026-11-14: 建設通信の URL と、ハウジング・トリビューンの名前(住宅産業新聞と誤記)を直し、@Press・BUILT・日刊工業新聞を追加。
 */
export const GENERAL_PRODUCT_SOURCES: ProductSource[] = [
  { url: 'https://www.s-housing.jp/feed', source: '新建ハウジング' },
  { url: 'https://www.housenews.jp/feed/', source: 'ハウジング・トリビューン' },
  { url: 'https://www.decn.co.jp/?feed=rss2', source: '建設工業新聞' },
  { url: 'https://www.kensetsunews.com/feed', source: '建設通信新聞' },
  { url: 'https://prtimes.jp/index.rdf', source: 'PR TIMES' },
  { url: 'https://www.atpress.ne.jp/rss/index.rdf', source: '@Press' },
  { url: 'https://rss.itmedia.co.jp/rss/2.0/sj_built.xml', source: 'BUILT(ITmedia)' },
  { url: 'https://www.nikkan.co.jp/rss/nksrdf.rdf', source: '日刊工業新聞' },
];

/**
 * メーカー自身の配信(scripts/find-maker-feeds.mjs が見つけたもの)を配信元にする。
 * ⚠️ 以前は「一覧を作った時点で 90 日以内に更新があった配信」だけを使っていたが、一覧は 2026-08 のまま
 *    更新されないので、日が経つほど対象が減り、2026-11 には 153 本すべてが外れていた。
 *    配信は全部読み、記事ごとの日付で古いものを落とす(MAX_AGE_DAYS)。
 */
export function makerProductSources(feeds: { feed: string; name: string; categories?: string[] }[]): ProductSource[] {
  return feeds.filter((f) => f.feed).map((f) => ({ url: f.feed, source: f.name, trusted: true, fallback: MAKER_CAT_TO_PRODUCT[f.categories?.[0] || ''] }));
}

// 「新商品」として強く反応するキーワード
const strongKeywords = [
  '新商品', '新製品', '新型', '新シリーズ', '新ライン', 'ラインアップ',
  'リリース', '発売', '発表', '新発売', '販売開始', '新登場', '刷新',
  '新色', '受注開始', '追加発売',
]
// メーカーの配信で「新製品の告知」とみなす題の語(リリース・発表は決算発表などに広く出るので入れない)
const makerAnnounceInTitle = /新商品|新製品|新発売|発売|販売開始|新登場|新シリーズ|新色|受注開始|ラインアップ(に|を)?(追加|拡充)|リニューアル(発売|新登場)/
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
// メーカー自身の配信には、製品と関係ない告知も普通に流れてくる。
// 建材キーワードでの足切りを免除する代わりに、これらは明示的に落とす。
const makerNoiseKeywords = [
  '決算', '業績', '配当', '株主', 'IR情報', '有価証券', '株式',
  '人事', '役員', '組織変更', '採用', '新卒', '中途', 'インターン',
  '休業', '夏季休暇', '年末年始', '営業時間', '価格改定', '値上げ',
  'サイトリニューアル', 'メンテナンスのお知らせ', 'システム障害',
  '注意喚起', '偽サイト', 'なりすまし', '不審',
  // 実際に混ざっていたもの。製品の告知ではない
  '施工事例', '納入事例', '導入事例', '事例紹介',
  'メールニュース', 'メルマガ', 'Mail News', 'ニュースレター',
  'コラム', 'ブログ', '出展', '展示会', 'セミナー', 'コンテスト', '結果発表',
  '遅延', '発刊', '在庫', '欠品', '配送', '納期',
  '受賞', '認定取得', '創立', '周年', 'ご挨拶',
  'メディア掲載', '取材', '新聞掲載', '雑誌掲載',
  // 2026-11-14 追加(メーカーの配信を全部読むようにしたら混ざったもの)
  '障害', 'お詫び', '脆弱性', '一時停止', 'サービス停止', '報告書', 'ご来場', '活動報告', '開催', 'イベント', 'ショールーム', '講演',
]

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


/**
 * 記事を採用するかの判定。
 * trusted（＝建材メーカー自身の配信）なら建材キーワードは求めず、
 * 代わりに決算・採用といった製品と無関係な告知を落とす。
 */
function passesRelevance(
  title: string,
  descriptionRaw: string,
  decodedText: string,
  text: string,
  minScore: number,
  trusted: boolean
): boolean {
  if (negativeKeywords.some(k => text.includes(k))) return false
  if (trusted) {
    if (makerNoiseKeywords.some(k => title.includes(k))) return false
    // 発信元が建材メーカーなら、題に「新商品」「発売」などがあれば新製品の告知とみなす。
    // 以前は本文も含めて建材の語(domainKeywordRegex)を求めていたが、「リブパネル」「落石防護柵」のように
    // 一覧に無い製品名が多く、本物の新製品をほとんど落としていた(2026-11-14 に 40 件中 1 件しか残らなかった)。
    return makerAnnounceInTitle.test(decodeHtmlEntities(title))
  }
  if (scoreText(title, descriptionRaw) < minScore) return false
  // 総合配信(PR TIMES など)は題に建材の語を求める。本文で拾うと「テクノクロス」のような社名で通ってしまう
  return domainKeywordRegex.test(decodeHtmlEntities(title)) && !/テクノクロス/.test(title)
}

function parseRss(xml: string, source: string, minScore: number, trusted = false): NewProductItem[] {
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
    const decodedText = decodeHtmlEntities(text)
    if (!passesRelevance(title, descriptionRaw || '', decodedText, text, minScore, trusted)) continue
    const description = cleanHtmlToText(descriptionRaw)
    const category = classifyCategory(`${title} ${description}`)
    // 発信元が建材メーカーなら、分類できなくても落とさない
    if (category === 'other' && !trusted) continue
    const imageFromRss = extractImageFromRss(raw)
    out.push({
      id: link,
      title,
      link,
      pubDate,
      source,
      description,
      category,
      ...(imageFromRss ? { image: imageFromRss } : {}),
    })
  }
  return out
}

function parseAtom(xml: string, source: string, minScore: number, trusted = false): NewProductItem[] {
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
    const decodedText = decodeHtmlEntities(text)
    if (!passesRelevance(title, descRaw || '', decodedText, text, minScore, trusted)) continue
    const description = cleanHtmlToText(descRaw)
    const category = classifyCategory(`${title} ${description}`)
    if (category === 'other' && !trusted) continue
    const imageFromRss = extractImageFromRss(raw)
    out.push({
      id: link,
      title,
      link,
      pubDate,
      source,
      description,
      category,
      ...(imageFromRss ? { image: imageFromRss } : {}),
    })
  }
  return out
}


const UA = 'Mozilla/5.0 (compatible; yaneyuka-newsbot/1.0; +https://yaneyuka.com/)';

async function fetchFeed(url: string, timeoutMs: number): Promise<{ status: number; xml: string }> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: ac.signal, redirect: 'follow', headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml, */*' } });
    if (!res.ok) return { status: res.status, xml: '' };
    const buf = new Uint8Array(await res.arrayBuffer());
    const head = new TextDecoder('ascii').decode(buf.slice(0, 200));
    const enc = (head.match(/encoding=["']([\w-]+)["']/i)?.[1] || res.headers.get('content-type')?.match(/charset=([\w-]+)/i)?.[1] || 'utf-8').toLowerCase();
    let xml: string;
    try {
      xml = new TextDecoder(enc).decode(buf);
    } catch {
      xml = new TextDecoder('utf-8').decode(buf);
    }
    return { status: res.status, xml };
  } catch {
    return { status: 0, xml: '' };
  } finally {
    clearTimeout(t);
  }
}

export const productTime = (pubDate?: string) => {
  if (!pubDate) return 0;
  const t = Date.parse(pubDate);
  if (Number.isFinite(t)) return t;
  // 「2015-07-13 T 08:12:11 +9:00」「2026年10月29日」のような崩れた書式は日付だけ読む
  const m = /(d{4})[-/年.](d{1,2})[-/月.](d{1,2})/.exec(pubDate);
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) - 9 * 3600_000 : 0;
};

/** これより古い記事は「新製品」として出さない */
export const MAX_AGE_DAYS = 180;

export type ProductSourceResult = { source: string; url: string; ok: boolean; status: number; items: number; kept: number };

/** 全配信元を読み、新しい順に返す(同じ記事は 1 件に)。20 本ずつ読む */
export async function collectProducts(
  sources: ProductSource[],
  { timeoutMs = 10000, minScore = 1 } = {}
): Promise<{ items: NewProductItem[]; sources: ProductSourceResult[] }> {
  const items: NewProductItem[] = [];
  const results: ProductSourceResult[] = [];
  const cutoff = Date.now() - MAX_AGE_DAYS * 86_400_000;
  for (let i = 0; i < sources.length; i += 20) {
    const batch = sources.slice(i, i + 20);
    const got = await Promise.all(batch.map((s) => fetchFeed(s.url, timeoutMs)));
    got.forEach(({ status, xml }, k) => {
      const s = batch[k];
      const total = (xml.match(/<item[\s>]|<entry[\s>]/g) || []).length;
      const parsed = xml
        ? (/<entry[\s\S]*?<\/entry>/.test(xml) ? parseAtom(xml, s.source, minScore, s.trusted) : parseRss(xml, s.source, minScore, s.trusted))
        : [];
      // 日付の無い記事と古い記事は落とす。日付が無い配信は古い告知の置き場であることが多い(森田アルミ工業の 2015 年の記事など)
      const fresh = parsed
        .filter((it) => { const t = productTime(it.pubDate); return t >= cutoff; })
        .map((it) => ({
          ...it,
          // 題に HTML の実体参照やタグが混ざる配信がある(<br/> など)
          title: cleanHtmlToText(it.title),
          category: it.category === 'other' && s.fallback ? s.fallback : it.category,
          // RSS の画像は相対パスのことがある。記事の URL で絶対化し、使えないものは捨てる
          image: normalizeImageUrl(it.image, it.link) || undefined,
        }));
      items.push(...fresh);
      results.push({ source: s.source, url: s.url, ok: total > 0, status, items: total, kept: fresh.length });
    });
  }
  const seen = new Set<string>();
  const unique = items.filter((it) => (seen.has(it.link) ? false : (seen.add(it.link), true)));
  unique.sort((a, b) => productTime(b.pubDate) - productTime(a.pubDate));
  return { items: unique, sources: results };
}
