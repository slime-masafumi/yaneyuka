import { NextResponse } from 'next/server'
import eventsData from '@/data/events.json'

// イベント情報API。
//
// 一覧は src/data/events.json（scripts/update-events.mjs が週次で会期を更新する）。
// 以前はこのファイルに 15 件を直書きしていて、更新の仕組みが無かったため
// 2026-08 時点で 9 件が会期終了済みのまま表示されていた。
// 終了したものはここで落とす。

export const dynamic = 'force-dynamic'

type EventItem = {
  id: string;
  title: string;
  description: string;
  dateText: string;
  startDate: string; // ISO形式 (YYYY-MM-DD) - ソート・フィルタ用
  endDate: string;   // ISO形式 (YYYY-MM-DD) - 終了日
  venue: string;
  region: 'tokyo' | 'nagoya' | 'osaka' | 'fukuoka' | 'chiba' | 'other';
  link: string;
  isLinkActive: boolean;
}

/** 今日（JST）の YYYY-MM-DD */
function todayJst(): string {
  const now = new Date()
  const jst = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60_000)
  return jst.toISOString().slice(0, 10)
}

export async function GET() {
  try {
    const all = (eventsData.events || []) as EventItem[]
    const today = todayJst()

    const items = all
      // 会期最終日を過ぎたものは出さない。終了日が無いものは残す（判断できないため）
      .filter((e) => !e.endDate || e.endDate >= today)
      // 開催が近い順
      .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))

    return NextResponse.json(
      { items, updatedAt: eventsData.updatedAt ?? null },
      { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' } }
    )
  } catch (error) {
    console.error('[events] error', error)
    return NextResponse.json({ items: [] }, { status: 500 })
  }
}
