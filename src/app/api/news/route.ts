import { NextResponse, type NextRequest } from 'next/server'
import { createHash } from 'node:crypto'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { fillImages } from '@/lib/feedImage'
import { collectNews, pickForList, pubTime, type NewsItem } from '@/lib/newsCollect'
import { ARCHIVE, META, STATUS_DOC, docToItem, monthRange, type ArchiveDoc, type CollectStatus } from '@/lib/newsArchive'

/**
 * NEWS の一覧。
 *
 * 記事は GitHub Actions(.github/workflows/collect-news.yml)が 30 分ごとに集めて
 * Firestore の news-archive に貯めている。ここはそれを読むだけ(写真も収集側で取ってある)。
 *   GET /api/news/              … 最新 40 件(1 配信元 8 件まで)
 *   GET /api/news/?month=2026-10 … その月の記事(最大 120 件)
 *
 * 貯めた分が使えないとき(開発サーバーは firebase-admin を読めない / 収集が 3 時間以上止まっている)は、
 * 以前と同じくその場で RSS を読んで返す。表示が空になるより、遅くても出すほうを選ぶ。
 */

export const dynamic = 'force-dynamic'

const LIST_LIMIT = 40
const MONTH_LIMIT = 120
const STALE_MS = 3 * 3600_000
const CACHE_TTL_MS = 5 * 60_000

// 記事 URL → 写真 URL(その場で集めるときだけ使う)。インスタンスが生きている間は覚えておく
const IMAGE_CACHE = new Map<string, string>()
// 応答のキャッシュ(キー: 'latest' か 'YYYY-MM')
const CACHE = new Map<string, { items: NewsItem[]; ts: number; from: string }>()

const headers = (sec: number) => ({ 'Cache-Control': `public, max-age=0, s-maxage=${sec}, stale-while-revalidate=${sec * 2}` })

/** 貯めた分から読む。使えなければ null */
async function fromArchive(month: string | null): Promise<NewsItem[] | null> {
  const db = getAdminDb()
  if (!db) return null
  try {
    if (month) {
      const r = monthRange(month)
      if (!r) return []
      const snap = await db.collection(ARCHIVE).where('ts', '>=', r.start).where('ts', '<', r.end).orderBy('ts', 'desc').limit(MONTH_LIMIT).get()
      return snap.docs.map((d) => docToItem(d.data() as ArchiveDoc))
    }
    const status = (await db.collection(META).doc(STATUS_DOC).get()).data() as CollectStatus | undefined
    if (!status || Date.now() - status.lastRun > STALE_MS) {
      console.warn('[news] 収集が止まっているか未実行。その場で集めます', status?.lastRun ? new Date(status.lastRun).toISOString() : '')
      return null
    }
    // 1 配信元の上限をかけるので、多めに読んでから絞る
    const snap = await db.collection(ARCHIVE).orderBy('ts', 'desc').limit(LIST_LIMIT * 3).get()
    const items = snap.docs.map((d) => docToItem(d.data() as ArchiveDoc))
    return items.length ? pickForList(items, LIST_LIMIT) : null
  } catch (e) {
    console.error('[news] 保管庫の読み出しに失敗。その場で集めます', e)
    return null
  }
}

/** 予備: その場で RSS を読む */
async function live(month: string | null): Promise<NewsItem[]> {
  const { items } = await collectNews()
  if (month) {
    const r = monthRange(month)
    return r ? items.filter((it) => { const t = pubTime(it.pubDate); return t >= r.start && t < r.end }) : []
  }
  const list = pickForList(items, LIST_LIMIT)
  // 写真の無い記事は記事ページの og:image を取りに行く(待つのは 3.5 秒まで。残りは裏で取り、次の集計で出る)。
  // Google News 経由の記事はリンク先が Google のページで写真が取れないので行かない
  await fillImages(list, IMAGE_CACHE, { budgetMs: 3500, parallel: 12, skip: (link) => link.includes('news.google.com') })
  await saveBack(items)
  return list
}

/**
 * その場で集めた分を保管庫にも書く(本番だけ。開発サーバーは firebase-admin が無いので何もしない)。
 * GitHub の時刻指定の実行は数時間遅れることがあり(daily_scrape は 5〜6 時間遅れで動いていた)、
 * その間は毎回その場で集めることになるため、1 回集めたら他の利用者はそれを読めるようにする。
 * 写真の取得(og:image)は次の定期収集に任せる(imageTried を立てない)。
 */
async function saveBack(items: NewsItem[]) {
  const db = getAdminDb()
  if (!db) return
  try {
    const now = Date.now()
    const batch = db.batch()
    for (const it of items.slice(0, 200)) {
      const id = createHash('sha1').update(it.link).digest('hex').slice(0, 20)
      batch.set(
        db.collection(ARCHIVE).doc(id),
        {
          title: it.title,
          link: it.link,
          source: it.source,
          description: (it.description || '').slice(0, 400),
          pubDate: it.pubDate || '',
          ts: pubTime(it.pubDate) || now,
          ...(it.image ? { image: it.image } : {}),
        },
        { merge: true }
      )
    }
    batch.set(db.collection(META).doc(STATUS_DOC), { lastRun: now, by: 'api' }, { merge: true })
    await batch.commit()
  } catch (e) {
    console.error('[news] 保管庫への書き戻しに失敗', e)
  }
}

export async function GET(req: NextRequest) {
  const monthParam = req.nextUrl.searchParams.get('month')
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : null
  const key = month || 'latest'
  const hit = CACHE.get(key)
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return NextResponse.json({ items: hit.items, from: hit.from }, { headers: headers(300) })
  }
  try {
    const stored = await fromArchive(month)
    const from = stored ? 'archive' : 'live'
    const items = stored ?? (await live(month))
    CACHE.set(key, { items, ts: Date.now(), from })
    return NextResponse.json({ items, from }, { headers: headers(300) })
  } catch (e) {
    console.error('[news] error', e)
    if (hit) return NextResponse.json({ items: hit.items, from: hit.from }, { headers: headers(60) })
    return NextResponse.json({ items: [] }, { headers: headers(60) })
  }
}
