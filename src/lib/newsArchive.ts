/**
 * NEWS の保管庫(Firestore)。collect-news(書く側)と /api/news(読む側)が同じ形を使う。
 *
 *   news-archive/{id}   1 記事 1 文書。id はリンクの SHA-1 先頭 20 桁
 *     title, link, source, description, pubDate(元の文字列), ts(公開時刻 ms), image, imageTried, firstSeen
 *   news-meta/status    最後に集めた時刻と、配信元ごとの結果(止まった配信元を見つけるため)
 *
 * 読むときは ts の単一フィールドで並べる・範囲を切るだけにしてある(複合インデックスを要らなくするため)。
 */
import type { NewsItem, SourceResult } from './newsCollect'

export const ARCHIVE = 'news-archive'
export const META = 'news-meta'
export const STATUS_DOC = 'status'

export type ArchiveDoc = {
  title: string
  link: string
  source: string
  description: string
  pubDate: string
  ts: number
  image: string
  imageTried: boolean
  firstSeen: number
}

export type CollectStatus = { lastRun: number; total: number; added: number; sources: SourceResult[] }

export function docToItem(d: ArchiveDoc): NewsItem {
  return {
    id: d.link,
    title: d.title,
    link: d.link,
    pubDate: d.pubDate || (d.ts ? new Date(d.ts).toISOString() : ''),
    source: d.source,
    description: d.description || '',
    ...(d.image ? { image: d.image } : {}),
  }
}

/** "2026-11" → その月の JST の始まりと次の月の始まり(ms)。形が違えば null */
export function monthRange(month: string): { start: number; end: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  if (mo < 1 || mo > 12) return null
  const jst = 9 * 3600_000
  return { start: Date.UTC(y, mo - 1, 1) - jst, end: Date.UTC(y, mo, 1) - jst }
}
