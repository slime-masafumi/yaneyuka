import { NextRequest, NextResponse } from 'next/server';
import { fetchExternalText } from '@/lib/safeExternalFetch';

/**
 * 外部カレンダー（.ics）の取り回し。
 *
 * Google カレンダー等の .ics は CORS ヘッダを返さないので、ブラウザから
 * 直接は読めない。ここでサーバー側が取りに行って本文だけ返す。
 *
 * 「ユーザーが指定した URL をサーバーが叩く」形なので、宛先の制限が要る。
 * 判定と取得は src/lib/safeExternalFetch.ts に置いてある（ブックマークの
 * リンク確認でも同じ関門を通す）。
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get('url');

  const result = await fetchExternalText(target, {
    timeoutMs: 10_000,
    maxBytes: 2 * 1024 * 1024,
    accept: 'text/calendar, text/plain;q=0.8, */*;q=0.5',
  });

  if (!result.ok) {
    // 取得の失敗は 502 に寄せる。相手のステータスをそのまま返すと、
    // 内部ネットワークの当たり判定に使われうる。
    const status = result.status === 400 || result.status === 413 ? result.status : 502;
    const error = status === 502 ? 'カレンダーを取得できませんでした' : result.error;
    return NextResponse.json({ error }, { status });
  }

  if (!result.text.includes('BEGIN:VCALENDAR')) {
    return NextResponse.json({ error: 'カレンダー形式（.ics）ではありません' }, { status: 400 });
  }

  return new NextResponse(result.text, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      // 予定はそう頻繁に変わらないので、5分は使い回す
      'Cache-Control': 'private, max-age=300',
    },
  });
}
