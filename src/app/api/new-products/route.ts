import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { fillImages, normalizeImageUrl } from '@/lib/feedImage'
import { GENERAL_PRODUCT_SOURCES, MAX_AGE_DAYS, collectProducts, makerProductSources, productTime, type NewProductItem } from '@/lib/productCollect'
import makerFeeds from '@/data/maker-feeds.json'

/**
 * 新製品の一覧。
 *
 * 記事は GitHub Actions(.github/workflows/collect-news.yml の新製品の段)が 3 時間ごとに集めて
 * Firestore の new-products-archive に貯めている(scripts/collect-products.ts)。ここはそれを読むだけ。
 * 判定のキーワード・分類・配信元は src/lib/productCollect.ts。
 *
 * 以前はこの API が呼ばれるたびに約 160 本の RSS と最大 150 件の記事ページを読んでいたため、
 * 初回の表示が遅かった。貯めた分が使えないとき(開発サーバー / 収集が 12 時間以上止まった)だけ、
 * 業界紙・リリース配信とメーカー配信をその場で読む。
 */

export const dynamic = 'force-dynamic'

const MAX_RETURN = 200
const STALE_MS = 12 * 3600_000
const CACHE_TTL_MS = 10 * 60_000

let CACHE: { items: NewProductItem[]; ts: number } | null = null
const IMAGE_CACHE = new Map<string, string>()

// max-age=0: ブラウザには持たせない(CDN だけが s-maxage の間持つ)。付けないとブラウザが独自に古い一覧を使い回す
const headers = (sec: number) => ({ 'Cache-Control': `public, max-age=0, s-maxage=${sec}, stale-while-revalidate=${sec * 2}` })

async function fromArchive(): Promise<NewProductItem[] | null> {
  const db = getAdminDb()
  if (!db) return null
  try {
    const status = (await db.collection('news-meta').doc('products').get()).data() as { lastRun?: number } | undefined
    if (!status?.lastRun || Date.now() - status.lastRun > STALE_MS) {
      console.warn('[new-products] 収集が止まっているか未実行。その場で集めます')
      return null
    }
    // 多めに読み、新しい収集(scripts/collect-products.ts)が書いた文書だけを出す。
    // firstSeen の無い文書は以前の API が書いたもので、判定が甘く建材と無関係なリリースが混ざっている(消さずに出さないだけ)
    const snap = await db.collection('new-products-archive').orderBy('ts', 'desc').limit(MAX_RETURN * 2).get()
    const items = snap.docs
      .map((d) => d.data() as NewProductItem & { ts?: number; firstSeen?: number })
      // 日付の読めない記事・古い記事も出さない(収集側でも落としている。最初の収集で入った分の後始末)
      .filter((x) => x.firstSeen && productTime(x.pubDate) >= Date.now() - MAX_AGE_DAYS * 86_400_000)
      .slice(0, MAX_RETURN)
      .map((x) => {
      const image = normalizeImageUrl(x.image) || undefined
      return {
        id: x.id || x.link,
        title: x.title,
        link: x.link,
        pubDate: x.pubDate || (x.ts ? new Date(x.ts).toISOString() : ''),
        source: x.source,
        description: x.description || '',
        category: x.category || 'other',
        ...(image ? { image } : {}),
      } as NewProductItem
    })
    return items.length ? items : null
  } catch (e) {
    console.error('[new-products] 保管庫の読み出しに失敗。その場で集めます', e)
    return null
  }
}

async function live(): Promise<NewProductItem[]> {
  const sources = [...GENERAL_PRODUCT_SOURCES, ...makerProductSources(makerFeeds.feeds || [])]
  const { items } = await collectProducts(sources)
  const list = items.slice(0, MAX_RETURN)
  await fillImages(list, IMAGE_CACHE, { budgetMs: 4000, parallel: 12 })
  await saveBack(list)
  return list
}

/**
 * その場で集めた分を保管庫にも書く(本番だけ)。定期収集が遅れているあいだ、
 * 利用者ごとに約 160 本の配信を読み直さないようにする(NEWS の route.ts と同じ考え方)。
 */
async function saveBack(items: NewProductItem[]) {
  const db = getAdminDb()
  if (!db) return
  try {
    const now = Date.now()
    const batch = db.batch()
    for (const it of items) {
      const id = createHash('sha256').update(it.link).digest('hex').slice(0, 40)
      batch.set(
        db.collection('new-products-archive').doc(id),
        {
          id: it.link,
          title: it.title,
          link: it.link,
          pubDate: it.pubDate || '',
          source: it.source,
          description: (it.description || '').slice(0, 400),
          category: it.category,
          ts: productTime(it.pubDate) || now,
          firstSeen: now,
          ...(it.image ? { image: it.image } : {}),
        },
        { merge: true }
      )
    }
    batch.set(db.collection('news-meta').doc('products'), { lastRun: now, by: 'api' }, { merge: true })
    await batch.commit()
  } catch (e) {
    console.error('[new-products] 保管庫への書き戻しに失敗', e)
  }
}

export async function GET() {
  if (CACHE && Date.now() - CACHE.ts < CACHE_TTL_MS) {
    return NextResponse.json({ items: CACHE.items }, { headers: headers(600) })
  }
  try {
    const items = (await fromArchive()) ?? (await live())
    CACHE = { items, ts: Date.now() }
    return NextResponse.json({ items }, { headers: headers(600) })
  } catch (e) {
    console.error('[new-products] error', e)
    if (CACHE) return NextResponse.json({ items: CACHE.items }, { headers: headers(60) })
    return NextResponse.json({ items: [] }, { headers: headers(60) })
  }
}
