import { NextRequest, NextResponse } from 'next/server';
import { lookup } from 'dns/promises';

/**
 * 外部カレンダー（.ics）の取り回し。
 *
 * Google カレンダー等の .ics は CORS ヘッダを返さないので、ブラウザから
 * 直接は読めない。ここでサーバー側が取りに行って本文だけ返す。
 *
 * ただし「ユーザーが指定した URL をサーバーが叩く」ので、そのままだと
 * 社内ネットワークやクラウドのメタデータ endpoint を代わりに叩かせる
 * 踏み台（SSRF）になる。下の制限を全部通ったものだけ取得する:
 *
 *   - https のみ（http・file・gopher 等は弾く）
 *   - 名前解決した IP が私有・ループバック・リンクローカルなら弾く
 *   - リダイレクトは追わない（追えた先で上の判定をすり抜けられるため）
 *   - 10 秒で打ち切り、2MB を超えたら捨てる
 *   - 返すのは本文のテキストだけ。ヘッダやステータスの詳細は返さない
 *     （内部ネットワークの探索に使われないように）
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 2 * 1024 * 1024;

/** 私有・ループバック・リンクローカル・共有アドレス帯か。 */
function isBlockedAddress(ip: string, family: number): boolean {
  if (family === 6) {
    const v = ip.toLowerCase();
    if (v === '::1' || v === '::') return true;
    // ユニークローカル fc00::/7 とリンクローカル fe80::/10
    if (v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb')) return true;
    // IPv4 射影（::ffff:10.0.0.1 など）は中の v4 で判定する
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedAddress(mapped[1], 4);
    return false;
  }

  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;

  if (a === 0) return true;                   // 0.0.0.0/8
  if (a === 10) return true;                  // 私有
  if (a === 127) return true;                 // ループバック
  if (a === 169 && b === 254) return true;    // リンクローカル（クラウドのメタデータ）
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true;                  // マルチキャスト・予約
  return false;
}

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get('url');
  if (!target) {
    return NextResponse.json({ error: 'url を指定してください' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: 'URL の形式が正しくありません' }, { status: 400 });
  }

  if (parsed.protocol !== 'https:') {
    return NextResponse.json({ error: 'https の URL だけ読み込めます' }, { status: 400 });
  }

  // 名前解決してから判定する。ホスト名で弾いても、内部アドレスを指す
  // 外部ドメインを用意されれば抜けられるため。
  try {
    const addresses = await lookup(parsed.hostname, { all: true });
    if (addresses.length === 0) {
      return NextResponse.json({ error: 'ホストが見つかりません' }, { status: 400 });
    }
    if (addresses.some((a) => isBlockedAddress(a.address, a.family))) {
      return NextResponse.json({ error: 'この宛先は読み込めません' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'ホストが見つかりません' }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: 'manual',
      headers: { Accept: 'text/calendar, text/plain;q=0.8, */*;q=0.5' },
    });

    if (res.status >= 300 && res.status < 400) {
      return NextResponse.json(
        { error: '転送される URL は読み込めません。最終的な .ics の URL を指定してください' },
        { status: 400 },
      );
    }
    if (!res.ok) {
      return NextResponse.json({ error: 'カレンダーを取得できませんでした' }, { status: 502 });
    }

    const length = Number(res.headers.get('content-length') || 0);
    if (length > MAX_BYTES) {
      return NextResponse.json({ error: 'カレンダーが大きすぎます' }, { status: 413 });
    }

    const text = await res.text();
    if (text.length > MAX_BYTES) {
      return NextResponse.json({ error: 'カレンダーが大きすぎます' }, { status: 413 });
    }
    if (!text.includes('BEGIN:VCALENDAR')) {
      return NextResponse.json({ error: 'カレンダー形式（.ics）ではありません' }, { status: 400 });
    }

    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        // 予定はそう頻繁に変わらないので、5分は使い回す
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch {
    return NextResponse.json({ error: 'カレンダーを取得できませんでした' }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
