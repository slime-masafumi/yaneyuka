import { NextRequest, NextResponse } from 'next/server';
import { fetchExternalText, checkExternalUrl } from '@/lib/safeExternalFetch';

/**
 * ブックマークのために、URL からタイトル等を拾って返す。
 *
 * 用途は2つ:
 *   - 登録するとき、タイトル・説明・サムネを自前で打たなくて済むようにする
 *   - 登録済みのリンクがまだ生きているか確かめる（alive だけ見る）
 *
 * 宛先の制限は src/lib/safeExternalFetch.ts 側。ここは HTML の読み取りだけ。
 * HTML は先頭の <head> に必要なものが入っているので、256KB で打ち切る。
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_HTML_BYTES = 256 * 1024;

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

/** og:image が相対パスのことがあるので、元の URL で絶対化する。 */
function absolutize(value: string, base: URL): string {
  if (!value) return '';
  try {
    return new URL(value, base).toString();
  } catch {
    return '';
  }
}

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get('url');
  // check=1 のときは生死だけ見る。全件確認で本文まで読むと重いので。
  const checkOnly = request.nextUrl.searchParams.get('check') === '1';

  const checked = await checkExternalUrl(target);
  if (!checked.ok) {
    return NextResponse.json({ alive: false, error: checked.error }, { status: checked.status });
  }

  const result = await fetchExternalText(target, {
    timeoutMs: checkOnly ? 8_000 : 10_000,
    maxBytes: MAX_HTML_BYTES,
    accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
  });

  if (!result.ok) {
    return NextResponse.json(
      { alive: false, error: result.error, status: result.status },
      { status: 200 }, // 呼び出し側は一覧をまとめて確認するので、失敗も 200 で返して扱いを揃える
    );
  }

  if (checkOnly) {
    return NextResponse.json({ alive: true, status: result.status });
  }

  const html = result.text;
  const image = readMeta(html, ['og:image', 'twitter:image', 'twitter:image:src']);

  return NextResponse.json({
    alive: true,
    status: result.status,
    title: readMeta(html, ['og:title', 'twitter:title']) || readTitle(html),
    description: readMeta(html, ['og:description', 'twitter:description', 'description']),
    siteName: readMeta(html, ['og:site_name']),
    image: absolutize(image, checked.url),
  });
}
