// 建材メーカー一覧に添える「会社のシンボル」(サイトのアイコン)を集める。2026-11-15
//
//   node --import ./scripts/lib/register-ts.mjs scripts/collect-maker-icons.ts [--all | --empty] [--limit 50]
//
// 以前は商品ページの写真(collect-maker-images.ts)を出していたが、社ごとに写真の質がばらつき、
// 表が散らかって見えた。各社が自分のサイトに置いているアイコン(apple-touch-icon・大きめの icon・SVG)を
// 社名の横に小さく出す。画像は相手のサーバーから直接表示する(保存・加工はしない)。
// 表では 22px で出すので 32px 以上なら使う(2026-11-15 に 64px から下げた。favicon.ico も中の最大サイズを見て使う)。
// 取れなかった会社は空文字で残し、30 日は読み直さない。--empty で取れていない会社だけ今すぐ読み直す。
// 相手に負担をかけないよう、同時に 6 本まで・1 本 8 秒で打ち切る。読むのは各社のトップページ 1 枚だけ。
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { makerHost } from '../src/lib/makerHost.ts';

type Maker = { name: string; products: string; office: string; contact: string; catalog: string };
type Entry = { icon: string; at: string };

const OUT = 'scripts/data/maker-icons-state.json';
const SLIM = 'src/data/maker-icons.json';
const RETRY_DAYS = 30;
const MIN = 32;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 (compatible; yaneyuka-makerbot/1.0; +https://yaneyuka.com/)';

const all = process.argv.includes('--all');
const empty = process.argv.includes('--empty');
const limitArg = process.argv.indexOf('--limit');
const limit = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity;

const makers = JSON.parse(readFileSync('src/data/makers.json', 'utf8')) as Record<string, Maker[]>;
const old: Record<string, Entry> = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};

const hosts = [...new Set(Object.values(makers).flat().map(makerHost).filter(Boolean))];
const stale = (e?: Entry) => !e || all || (empty && !e.icon) || (!e.icon && Date.now() - new Date(e.at).getTime() > RETRY_DAYS * 86_400_000);
const queue = hosts.filter((h) => stale(old[h])).slice(0, limit);
console.log(`会社のサイト ${hosts.length} / 今回読む ${queue.length}`);

async function get(url: string, ms = 8000): Promise<Response | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { signal: ac.signal, redirect: 'follow', headers: { 'User-Agent': UA } });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** HTML の <link rel="...icon..."> を、大きい順の候補に */
function iconLinks(html: string, base: string): { url: string; size: number }[] {
  const out: { url: string; size: number }[] = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = /\brel\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase() ?? '';
    if (!/icon/.test(rel)) continue;
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (!href || href.startsWith('data:')) continue;
    const sizes = /\bsizes\s*=\s*["'](\d+)x\d+["']/i.exec(tag)?.[1];
    const svg = /\.svg(\?|$)/i.test(href) || /image\/svg/i.test(tag);
    const size = svg ? 512 : sizes ? Number(sizes) : /apple-touch/.test(rel) ? 180 : 32;
    try {
      out.push({ url: new URL(href.replace(/&amp;/g, '&'), base).toString(), size });
    } catch {
      /* 壊れた href */
    }
  }
  return out.sort((a, b) => b.size - a.size);
}

/** .ico の中で一番大きい絵の辺の長さ(ICONDIR の各項目。0 は 256px) */
function icoSize(buf: Buffer): number {
  if (buf.length < 6 || buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) return 0;
  const n = buf.readUInt16LE(4);
  let max = 0;
  for (let i = 0; i < n && 6 + i * 16 + 2 <= buf.length; i++) {
    const w = buf[6 + i * 16] || 256;
    const h = buf[7 + i * 16] || 256;
    if (w / h < 1.6 && h / w < 1.6) max = Math.max(max, Math.min(w, h));
  }
  return max;
}

/** 画像として使えるか: 直リンクで読める・32px 以上・正方形に近い(横長のロゴ帯は社名の横に収まらない) */
async function usable(url: string): Promise<boolean> {
  const res = await get(url, 10000);
  if (!res || !res.ok) return false;
  const type = res.headers.get('content-type') || '';
  if (!type.startsWith('image/') && !/\.svg(\?|$)/i.test(url)) return false;
  const buf = Buffer.from(await res.arrayBuffer());
  if (type.includes('svg') || /\.svg(\?|$)/i.test(url)) return buf.length > 200 && buf.toString('utf8', 0, 400).includes('<svg');
  if (type.includes('icon') || /\.ico(\?|$)/i.test(url) || icoSize(buf) > 0) return icoSize(buf) >= MIN;
  try {
    const meta = await sharp(buf).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    return w >= MIN && h >= MIN && w / h < 1.6 && h / w < 1.6;
  } catch {
    return false;
  }
}

async function iconOf(host: string): Promise<string> {
  const top = `https://${host}/`;
  const res = await get(top);
  const html = res && res.ok ? await res.text() : '';
  const base = res?.url || top;
  const cands = iconLinks(html, base);
  // 宣言が無くても置いてあることが多い
  cands.push({ url: new URL('/apple-touch-icon.png', base).toString(), size: 180 });
  cands.push({ url: new URL('/favicon.ico', base).toString(), size: 32 });
  cands.sort((a, b) => b.size - a.size);
  const seen = new Set<string>();
  for (const c of cands) {
    // yaneyuka は https なので http の画像は読み込みを止められる。https で読めるものだけ使う
    c.url = c.url.replace(/^http:/, 'https:');
    if (c.size < MIN || seen.has(c.url)) continue;
    seen.add(c.url);
    if (await usable(c.url)) return c.url;
  }
  return '';
}

const state = { ...old };
let done = 0;
let found = 0;
const workers = Array.from({ length: 6 }, async () => {
  while (queue.length) {
    const host = queue.shift()!;
    const icon = await iconOf(host).catch(() => '');
    state[host] = { icon, at: new Date().toISOString() };
    done += 1;
    if (icon) found += 1;
    if (done % 25 === 0) console.log(`  ${done} 社 / シンボルあり ${found}`);
  }
});
await Promise.all(workers);

mkdirSync('scripts/data', { recursive: true });
const sorted = Object.fromEntries(Object.entries(state).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(OUT, JSON.stringify(sorted, null, 2) + '\n');
const slim = Object.fromEntries(Object.entries(sorted).filter(([, e]) => e.icon).map(([h, e]) => [h, e.icon]));
writeFileSync(SLIM, JSON.stringify(slim, null, 2) + '\n');
console.log(`読んだ ${done} 社 / シンボルあり ${found} / 表に載る ${Object.keys(slim).length} 社`);
