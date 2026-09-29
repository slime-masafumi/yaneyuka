import { NextRequest, NextResponse } from 'next/server';
import { checkExternalUrl, decodeBody } from '@/lib/safeExternalFetch';
import { canonicalUrl } from '@/components/content/Userpage/general-tools/bookmark/url';

/**
 * ブックマークのために、URL からタイトル等を拾って返す。
 *
 * 用途は2つ:
 *   - 登録するとき、タイトル・説明・サムネを自前で打たなくて済むようにする
 *   - 登録済みのリンクがまだ生きているか確かめる（check=1。本文は読まない）
 *
 * 宛先の制限（社内アドレス・http への禁止など）は src/lib/safeExternalFetch.ts の
 * checkExternalUrl。転送（3xx）は、転送先ごとに同じ関門を通してから追いかける。
 * 以前は転送を一律「読み込めない」扱いにしていたため、http→https や末尾の / を足すだけの
 * 転送でも全部リンク切れに見えていた。
 *
 * 返す state:
 *   ok       … 開ける
 *   redirect … 開けるが、別の URL に移っている（finalUrl に移転先）
 *   broken   … 404 / 410 / ホストが無い / つながらない
 *   unknown  … 相手がロボットを断った（401/403/429）・時間切れ・一時的な 5xx など。切れたとは言えない
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_HTML_BYTES = 256 * 1024;
const MAX_HOPS = 5;

type LinkState = 'ok' | 'redirect' | 'broken' | 'unknown';

/** <meta property="og:title" content="..."> のような組を拾う。 */
function readMeta(html: string, keys: string[]): string {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // property/name はどちらの順序でも書かれるので、両方見る
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)\\s*=\\s*["']${escaped}["'][^>]*?content\\s*=\\s*["']([^"']*)["']`, 'i'),
      new RegExp(`<meta[^>]+content\\s*=\\s*["']([^"']*)["'][^>]*?(?:property|name)\\s*=\\s*["']${escaped}["']`, 'i'),
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m && m[1].trim()) return decodeEntities(m[1].trim());
    }
  }
  return '';
}

/** 表示に出すのは文字だけなので、よく出る実体参照だけ戻す。 */
function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function readTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1].replace(/\s+/g, ' ').trim()) : '';
}

/** og:image が相対パスのことがあるので、元の URL で絶対化する。http の画像は https に寄せる（混在コンテンツで出ない） */
function absolutize(value: string, base: URL): string {
  if (!value) return '';
  try {
    const u = new URL(value, base);
    if (u.protocol === 'http:') u.protocol = 'https:';
    return u.protocol === 'https:' ? u.toString() : '';
  } catch {
    return '';
  }
}

/** 相手のステータスコードを、ブックマークの状態に読み替える */
function stateOf(status: number): LinkState {
  if (status >= 200 && status < 300) return 'ok';
  if (status === 404 || status === 410) return 'broken';
  return 'unknown';
}

type Followed =
  | { ok: true; res: Response; finalUrl: URL; hops: number }
  | { ok: false; state: LinkState; error: string; status: number };

/**
 * 転送を関門つきで追いかけて、最後の応答を返す。
 * http:// で登録された URL は、まず https に読み替えて試す（関門が https しか通さないため）。
 */
async function follow(raw: string, timeoutMs: number, accept: string): Promise<Followed> {
  let current = raw;
  let upgraded = false;
  try {
    const u = new URL(raw);
    if (u.protocol === 'http:') {
      u.protocol = 'https:';
      current = u.toString();
      upgraded = true;
    }
  } catch {
    /* 形式の誤りは checkExternalUrl が言う */
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    for (let hop = 0; hop <= MAX_HOPS; hop++) {
      const checked = await checkExternalUrl(current);
      if (!checked.ok) {
        // ホストが引けない＝ドメインごと無くなった。形式の誤り・禁止宛先は「切れ」とは言えない
        const state: LinkState = checked.error.includes('ホストが見つかりません') ? 'broken' : 'unknown';
        return { ok: false, state, error: checked.error, status: checked.status };
      }
      const res = await fetch(checked.url.toString(), {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          Accept: accept,
          // 名乗らないと弾くサイトがあるので、素性を明かして名乗る
          'User-Agent': 'yaneyuka-link-bot/1.0 (+https://yaneyuka.com)',
        },
      });
      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        await res.body?.cancel().catch(() => undefined);
        current = new URL(location, checked.url).toString();
        continue;
      }
      return { ok: true, res, finalUrl: checked.url, hops: hop };
    }
    return { ok: false, state: 'unknown', error: '転送が多すぎます', status: 508 };
  } catch (e) {
    const err = e as { name?: string; cause?: { code?: string } };
    const aborted = err?.name === 'AbortError';
    // 「つながらない」と言い切れるのは、サーバーが無い・受け付けていないときだけ。
    // 証明書の不備や途中で切れたものは、ブラウザでは開けることがあるので切れ扱いにしない。
    // https に読み替えて試しているときも、元の http では開けるかもしれない
    const refused = ['ECONNREFUSED', 'ENOTFOUND'].includes(err?.cause?.code ?? '');
    if (aborted || upgraded || !refused) return { ok: false, state: 'unknown', error: aborted ? '時間切れ' : '確認できませんでした', status: 504 };
    return { ok: false, state: 'broken', error: 'つながりません', status: 502 };
  } finally {
    clearTimeout(timer);
  }
}

/** 先頭だけ読む（<head> に必要なものが入っている）。大きいページでも断らずに打ち切る */
async function readHead(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    total += value.length;
  }
  await reader.cancel().catch(() => undefined);
  const merged = new Uint8Array(Math.min(total, MAX_HTML_BYTES));
  let offset = 0;
  for (const chunk of chunks) {
    const take = Math.min(chunk.length, merged.length - offset);
    if (take <= 0) break;
    merged.set(chunk.subarray(0, take), offset);
    offset += take;
  }
  return decodeBody(merged, res.headers.get('content-type'));
}

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get('url');
  // check=1 のときは生死だけ見る。全件確認で本文まで読むと重いので。
  const checkOnly = request.nextUrl.searchParams.get('check') === '1';

  if (!target) {
    return NextResponse.json({ alive: false, state: 'unknown', error: 'url を指定してください' }, { status: 400 });
  }

  const followed = await follow(target, checkOnly ? 8_000 : 10_000, 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5');
  // 呼び出し側は一覧をまとめて確認するので、失敗も 200 で返して扱いを揃える
  if (!followed.ok) {
    return NextResponse.json({ alive: false, state: followed.state, error: followed.error, status: followed.status });
  }

  const { res, finalUrl, hops } = followed;
  let state = stateOf(res.status);
  // 転送はされたが、http→https・末尾の /・www. の有無だけなら同じページとみなす
  const moved = hops > 0 && canonicalUrl(finalUrl.toString()) !== canonicalUrl(target);
  if (state === 'ok' && moved) state = 'redirect';
  const alive = state === 'ok' || state === 'redirect';
  const base = { alive, state, status: res.status, finalUrl: moved ? finalUrl.toString() : undefined };

  if (checkOnly || !alive) {
    await res.body?.cancel().catch(() => undefined);
    return NextResponse.json(alive ? base : { ...base, error: state === 'broken' ? 'ページが見つかりません' : '確認できませんでした' });
  }

  const html = await readHead(res).catch(() => '');
  const image = readMeta(html, ['og:image', 'og:image:url', 'twitter:image', 'twitter:image:src']);

  return NextResponse.json({
    ...base,
    title: readMeta(html, ['og:title', 'twitter:title']) || readTitle(html),
    description: readMeta(html, ['og:description', 'twitter:description', 'description']),
    siteName: readMeta(html, ['og:site_name']),
    image: absolutize(image, finalUrl),
  });
}
