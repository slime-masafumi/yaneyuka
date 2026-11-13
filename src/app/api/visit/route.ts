import { NextRequest, NextResponse } from 'next/server';
import type { DocumentSnapshot } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb, getFieldValue } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 訪問者数のカウンター(管理用。左カラム最下部に管理者にだけ小さく出す)。
 *
 *   POST /api/visit  { first: boolean }  … ページを開くたびに 1 回。first はその端末で今日初めてか
 *   GET  /api/visit                      … 今日・昨日・累計を返す。管理者の ID トークンが要る(Authorization: Bearer)
 *
 * 保存先は Firestore の site_stats(Admin SDK で書くのでルールの変更は不要):
 *   site_stats/total            { pv, uv }
 *   site_stats_daily/{YYYY-MM-DD} { pv, uv }   日付は日本時間
 *
 * pv = 開かれた回数 / uv = その日に来た端末の数(端末に「今日はもう数えた」印だけ残す。個人は識別しない)。
 * 検索エンジンなどのロボットは数えない。
 */

const BOT = /bot|crawl|spider|slurp|bingpreview|headless|lighthouse|facebookexternalhit|embedly|preview|monitor|curl|wget|python|axios|node-fetch/i;

/** 日本時間の YYYY-MM-DD */
function jstDay(offsetDays = 0): string {
  const d = new Date(Date.now() + 9 * 3600_000 - offsetDays * 86400_000);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  const ua = req.headers.get('user-agent') ?? '';
  if (!ua || BOT.test(ua)) return NextResponse.json({ ok: true, counted: false });

  const db = getAdminDb();
  const FieldValue = getFieldValue();
  if (!db || !FieldValue) return NextResponse.json({ ok: false }, { status: 503 });

  let first = false;
  try {
    const body = (await req.json()) as { first?: unknown };
    first = body.first === true;
  } catch {
    /* 本文なしは pv だけ数える */
  }

  const inc = { pv: FieldValue.increment(1), ...(first ? { uv: FieldValue.increment(1) } : {}) };
  try {
    const batch = db.batch();
    batch.set(db.doc('site_stats/total'), inc, { merge: true });
    batch.set(db.doc(`site_stats_daily/${jstDay()}`), { ...inc, day: jstDay() }, { merge: true });
    await batch.commit();
    return NextResponse.json({ ok: true, counted: true });
  } catch (e) {
    console.error('[api/visit] write failed:', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

/** firestore.rules の isAdmin() と同じ判定 */
const ADMIN_EMAIL = 'slime-a@outlook.com';

export async function GET(req: NextRequest) {
  const db = getAdminDb();
  const auth = getAdminAuth();
  if (!db || !auth) return NextResponse.json({ ok: false }, { status: 503 });
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  try {
    if (!token || (await auth.verifyIdToken(token)).email !== ADMIN_EMAIL) throw new Error('not admin');
  } catch {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  try {
    const [total, today, yesterday] = await Promise.all([
      db.doc('site_stats/total').get(),
      db.doc(`site_stats_daily/${jstDay()}`).get(),
      db.doc(`site_stats_daily/${jstDay(1)}`).get(),
    ]);
    const pick = (s: DocumentSnapshot) => ({ pv: (s.get('pv') as number) ?? 0, uv: (s.get('uv') as number) ?? 0 });
    return NextResponse.json(
      { ok: true, total: pick(total), today: pick(today), yesterday: pick(yesterday) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    console.error('[api/visit] read failed:', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
