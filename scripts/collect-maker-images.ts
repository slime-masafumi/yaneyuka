// 建材メーカー一覧に添える「商品ページの写真」を集める。2026-11-14
//
//   node --import ./scripts/lib/register-ts.mjs scripts/collect-maker-images.ts [--all] [--limit 50]
//
// makers.json の商品ページ(products)を 1 回ずつ開き、og:image / twitter:image を拾って
// src/data/maker-images.json(商品ページの URL → 写真の URL)に書く。画像は相手のサーバーから直接表示する
// (NEWS の写真と同じ扱い。保存・加工はしない)。取れなかった URL は空文字で残し、30 日は読み直さない。
// 相手に負担をかけないよう、同じサイトは続けて開かない・同時に 6 本まで・1 本 8 秒で打ち切る。
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { fetchOgImage, normalizeImageUrl } from '../src/lib/feedImage.ts';

type Maker = { name: string; products: string };
type Entry = { img: string; at: string };

// 読んだ日も含めた記録(次に読み直すかの判断用)と、画面が読む軽い対応表を分ける
const OUT = 'scripts/data/maker-images-state.json';
const SLIM = 'src/data/maker-images.json';
const RETRY_DAYS = 30;
// 写真として使わない画像の名前(準備中の代わりの画像・ナビの飾り・広告の帯・採用ページなど)
const JUNK = /damm?y|dummy|no[_-]?image|noimg|now[_-]?printing|coming|scroll|header|[_/-]nav|bnr|banner|campaign|recruit|saiyo|cname|favicon|qr/i;
// 目で見て外した画像(scripts/data/maker-images-exclude.json。画像の URL か商品ページの URL)
const EXCLUDE = new Set<string>(existsSync('scripts/data/maker-images-exclude.json') ? JSON.parse(readFileSync('scripts/data/maker-images-exclude.json', 'utf8')) : []);

const all = process.argv.includes('--all');
const limitArg = process.argv.indexOf('--limit');
const limit = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity;

const makers = JSON.parse(readFileSync('src/data/makers.json', 'utf8')) as Record<string, Maker[]>;
const old: Record<string, Entry> = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const urls = [...new Set(Object.values(makers).flat().map((m) => m.products).filter((u) => /^https?:\/\//.test(u || '')))];

const stale = (e?: Entry, u?: string) => !e || all || EXCLUDE.has(u ?? "") || EXCLUDE.has(e.img) || (!e.img && Date.now() - new Date(e.at).getTime() > RETRY_DAYS * 86_400_000);
// 同じホストが続かないように並べ替える
const byHost = new Map<string, string[]>();
for (const u of urls.filter((u) => stale(old[u], u))) {
  const h = new URL(u).hostname;
  byHost.set(h, [...(byHost.get(h) ?? []), u]);
}
const todo: string[] = [];
for (let round = 0; todo.length < urls.length; round++) {
  let added = 0;
  for (const list of byHost.values()) if (list[round]) (todo.push(list[round]), added++);
  if (!added) break;
}
const queue = todo.slice(0, limit);
console.log(`商品ページ ${urls.length} / 今回読む ${queue.length}`);

/**
 * 画像として使えるかを確かめる。直リンクで読める / 320×160 以上 / 横長すぎ・縦長すぎでない /
 * 情報量がある(白地のロゴ・文字だけの帯は小さい)。
 */
async function usable(img: string): Promise<boolean> {
  if (JUNK.test(new URL(img).pathname) || EXCLUDE.has(img)) return false;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 10000);
  try {
    const res = await fetch(img, { signal: ac.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0' } });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !type.startsWith('image/') || type.includes('svg')) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 6_000_000) return false;
    const meta = await sharp(buf).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (w < 320 || h < 160 || w / h > 3 || w / h < 0.75) return false;
    const st = await sharp(buf).resize(160, 100, { fit: 'cover' }).removeAlpha().stats();
    const spread = st.channels.reduce((a, c) => a + c.stdev, 0) / st.channels.length;
    void spread;
    // 白地のロゴ・文字だけの帯は情報量(エントロピー)が小さい。写真は 5.4 以上がほとんど(2026-11-14 に 48 枚で確かめた)
    return st.entropy >= 5.0;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

/** og:image が無いページ用:本文の最初の大きめの写真(ロゴ・アイコン・飾りは除く) */
async function firstPhoto(url: string): Promise<string> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ac.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0', 'Accept-Language': 'ja' } });
    if (!res.ok || !(res.headers.get('content-type') || '').includes('html')) return '';
    const html = (await res.text()).slice(0, 400_000);
    const body = html.slice(Math.max(0, html.search(/<body/i)));
    for (const m of body.matchAll(/<img\b[^>]*>/gi)) {
      const tag = m[0];
      const src = tag.match(/\s(?:data-src|src)=["']([^"']+)["']/i)?.[1] || '';
      if (!/\.(jpe?g|webp|png)(\?|$)/i.test(src)) continue;
      if (/logo|icon|ico_|btn|button|arrow|banner_s|sns|line|bg_|spacer|blank|loading|common\/(head|foot)/i.test(src)) continue;
      const w = Number(tag.match(/\swidth=["']?(\d+)/i)?.[1] || 0);
      const h = Number(tag.match(/\sheight=["']?(\d+)/i)?.[1] || 0);
      if ((w && w < 240) || (h && h < 140)) continue;
      const u = normalizeImageUrl(src, res.url || url);
      if (u) return u;
    }
    return '';
  } catch {
    return '';
  } finally {
    clearTimeout(t);
  }
}

const out: Record<string, Entry> = { ...old };
let i = 0;
let got = 0;
const worker = async () => {
  while (i < queue.length) {
    const u = queue[i++];
    // 1. 商品ページの og:image  2. 本文の最初の写真  3. サイトの入口の og:image
    const tries = [() => fetchOgImage(u, 8000), () => firstPhoto(u), () => fetchOgImage(new URL(u).origin + '/', 8000)];
    let img = '';
    for (const t of tries) {
      const c = await t();
      if (c && (await usable(c))) {
        img = c;
        break;
      }
    }
    if (img) got++;
    out[u] = { img, at: new Date().toISOString() };
  }
};
await Promise.all(Array.from({ length: 6 }, worker));

// 載っていない URL は消す(makers.json から外れた社)
for (const k of Object.keys(out)) if (!urls.includes(k)) delete out[k];
const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
mkdirSync('scripts/data', { recursive: true });
writeFileSync(OUT, JSON.stringify(sorted, null, 1) + '\n');
// 画面用:写真のある URL だけ、写真の URL だけ(建材の画面の JS に入るので軽くする)
writeFileSync(SLIM, JSON.stringify(Object.fromEntries(Object.entries(sorted).filter(([, e]) => e.img).map(([u, e]) => [u, e.img]))) + '\n');
const withImg = Object.values(sorted).filter((e) => e.img).length;
console.log(`今回 ${got} / ${queue.length} 件で写真あり。全体 ${withImg} / ${urls.length}`);
