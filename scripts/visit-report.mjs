// 訪問者数の集計(読むだけ。本番 DB には書かない)。2026-11-15
//
//   node --env-file=.env.local scripts/visit-report.mjs            # 直近 28 日
//   node --env-file=.env.local scripts/visit-report.mjs --days 7
//
// /api/visit が site_stats_daily/{YYYY-MM-DD} に残す数を足し合わせて、Markdown で出す。
//   pv / uv          … 開かれた回数 / その日に来た端末の数
//   from.{種類}      … 訪問の最初のページの参照元(google / bing / yahoo / search-other / social / ai / other / direct)
//   pages.{パス}     … ページ別の開かれた回数
//   landing.{パス}   … 検索から来た人が最初に開いたページ(どのページが検索で人を連れてくるか)
// 2026-11-15 の版から localhost と管理者本人の閲覧を数えていない。それより前の日は確認作業が混ざっている。
// 結果は ◆Project管理 の 05_集客の記録.md に月 1 回転記する。
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const i = process.argv.indexOf('--days');
const days = i > 0 ? Number(process.argv[i + 1]) : 28;
const raw = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!raw) {
  console.error('サービスアカウントがありません(node --env-file=.env.local で渡す)');
  process.exit(1);
}
initializeApp({ credential: cert(JSON.parse(raw)) });
const db = getFirestore();

const jst = (offset) => new Date(Date.now() + 9 * 3600_000 - offset * 86400_000).toISOString().slice(0, 10);
const from = jst(days - 1);
const to = jst(0);
const snap = await db.collection('site_stats_daily').where('day', '>=', from).where('day', '<=', to).get();
const rows = snap.docs.map((d) => d.data()).sort((a, b) => a.day.localeCompare(b.day));

const add = (acc, obj) => {
  for (const [k, v] of Object.entries(obj || {})) acc[k] = (acc[k] || 0) + (Number(v) || 0);
  return acc;
};
const sum = { pv: 0, uv: 0 };
const src = {};
const pages = {};
const landing = {};
for (const r of rows) {
  sum.pv += r.pv || 0;
  sum.uv += r.uv || 0;
  add(src, r.from);
  add(pages, r.pages);
  add(landing, r.landing);
}
const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
const visits = Object.values(src).reduce((a, b) => a + b, 0);
const search = ['google', 'bing', 'yahoo', 'search-other'].reduce((a, k) => a + (src[k] || 0), 0);
const pct = (n) => (visits ? `${Math.round((n / visits) * 100)}%` : '-');

console.log(`## ${from} 〜 ${to}(${rows.length} 日分)\n`);
console.log(`| 開かれた回数 | 来た端末(日ごとの合計) | 訪問 | 検索から | 検索の割合 |`);
console.log(`|---:|---:|---:|---:|---:|`);
console.log(`| ${sum.pv} | ${sum.uv} | ${visits} | ${search} | ${pct(search)} |\n`);
console.log(`### 参照元\n`);
for (const [k, v] of top(src, 10)) console.log(`- ${k}: ${v}(${pct(v)})`);
console.log(`\n### 検索から最初に開かれたページ(上位 15)\n`);
for (const [k, v] of top(landing, 15)) console.log(`- ${k}: ${v}`);
if (!Object.keys(landing).length) console.log('- (まだ無い)');
console.log(`\n### よく開かれたページ(上位 15)\n`);
for (const [k, v] of top(pages, 15)) console.log(`- ${k}: ${v}`);
if (!Object.keys(pages).length) console.log('- (まだ無い)');
console.log(`\n### 日別\n`);
for (const r of rows) console.log(`- ${r.day}: ${r.pv || 0} PV / ${r.uv || 0} 端末`);
