import { NextRequest, NextResponse } from 'next/server';

/**
 * 用途地域・防火地域のタイルの取り回し（地図ツールの敷地調査用）。
 *
 * 出どころは国土交通省「不動産情報ライブラリ」の API。
 *   XKT002 都市計画決定GISデータ（用途地域）
 *   XKT014 都市計画決定GISデータ（防火・準防火地域）
 * https://www.reinfolib.mlit.go.jp/help/apiManual/
 *
 * API キーが要るので、ブラウザから直接は叩かせずここを通す（キーを配らないため）。
 * キーは環境変数 REINFOLIB_API_KEY。無ければ 503 を返し、画面は「準備中」と出す。
 *
 * 宛先は固定で、受け取るのは層の種類とタイル番号だけ。利用者が URL を指定できる
 * 形ではないので、ics やブックマークのような SSRF の関門は要らない。
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LAYERS: Record<string, string> = {
  youto: 'XKT002',
  bouka: 'XKT014',
};

const int = (v: string | null) => (v !== null && /^\d{1,7}$/.test(v) ? Number(v) : null);

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const api = LAYERS[q.get('layer') ?? ''];
  const z = int(q.get('z'));
  const x = int(q.get('x'));
  const y = int(q.get('y'));

  if (!api || z === null || x === null || y === null) {
    return NextResponse.json({ error: 'パラメータが正しくありません' }, { status: 400 });
  }
  // API が受け付けるのは 11（市）〜15（詳細）
  if (z < 11 || z > 15 || x >= 2 ** z || y >= 2 ** z) {
    return NextResponse.json({ error: 'この縮尺では取得できません' }, { status: 400 });
  }

  const key = process.env.REINFOLIB_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'not-configured' }, { status: 503 });
  }

  const url = `https://www.reinfolib.mlit.go.jp/ex-api/external/${api}?response_format=geojson&z=${z}&x=${x}&y=${y}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(url, { headers: { 'Ocp-Apim-Subscription-Key': key }, signal: ctrl.signal });
    if (!res.ok) {
      return NextResponse.json({ error: '都市計画データを取得できませんでした' }, { status: 502 });
    }
    const body = await res.text();
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/geo+json; charset=utf-8',
        // 都市計画の決定はめったに変わらない。1日は使い回す
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: '都市計画データを取得できませんでした' }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
