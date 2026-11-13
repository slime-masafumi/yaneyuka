// 新製品の定期収集。建材メーカーの配信と業界紙・リリース配信を読み、Firestore の new-products-archive に貯める。
//
//   node --import ./scripts/lib/register-ts.mjs scripts/collect-products.ts [--dry-run]
//   .github/workflows/collect-news.yml が 3 時間ごとに実行する(NEWS と同じジョブの別の段)
//
// サービスアカウントは collect-news.ts と同じ(FIREBASE_SERVICE_ACCOUNT / FIREBASE_SERVICE_ACCOUNT_JSON)。
// 画面(/api/new-products)は貯めた分を読むだけなので、記事ページの写真(og:image)はここで取る。
// 文書の id は以前の route.ts と同じ(リンクの SHA-256 先頭 40 桁)。既に貯まっている分にそのまま重ねる。
import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { GENERAL_PRODUCT_SOURCES, collectProducts, makerProductSources, productTime, type NewProductItem } from '../src/lib/productCollect.ts';
import { fetchOgImage, normalizeImageUrl } from '../src/lib/feedImage.ts';

const ARCHIVE = 'new-products-archive';
const dryRun = process.argv.includes('--dry-run');
const docId = (link: string) => createHash('sha256').update(link).digest('hex').slice(0, 40);
// 以前の API が入れたローカルの汎用画像・相対パス・配信サイト共通の画像は「写真なし」とみなす
const isLocalFallback = (u?: string) => !u || !normalizeImageUrl(u);

type Doc = NewProductItem & { ts: number; imageTried?: boolean; firstSeen?: number };

async function fillOg(items: NewProductItem[]): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  let i = 0;
  const worker = async () => {
    while (i < items.length) {
      const it = items[i++];
      found.set(it.link, await fetchOgImage(it.link, 8000));
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, items.length) }, worker));
  return found;
}

async function main() {
  const started = Date.now();
  const feeds = JSON.parse(readFileSync('src/data/maker-feeds.json', 'utf8')).feeds as { feed: string; name: string; categories?: string[] }[];
  const sources = [...GENERAL_PRODUCT_SOURCES, ...makerProductSources(feeds)];
  const { items, sources: results } = await collectProducts(sources, { timeoutMs: 20000 });

  const general = results.slice(0, GENERAL_PRODUCT_SOURCES.length);
  const makers = results.slice(GENERAL_PRODUCT_SOURCES.length);
  console.log('業界紙・リリース配信');
  for (const s of general) console.log(`  ${s.ok ? 'ok' : 'NG'}  ${String(s.status).padStart(3)}  ${String(s.items).padStart(3)} 件中 ${String(s.kept).padStart(3)} 件採用  ${s.source}`);
  console.log(`メーカーの配信: ${makers.length} 本中 ${makers.filter((s) => s.ok).length} 本が読めた / 採用 ${makers.reduce((n, s) => n + s.kept, 0)} 件(${makers.filter((s) => s.kept).length} 社)`);
  console.log(`集めた新製品: ${items.length} 件`);

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (dryRun || !raw) {
    if (!dryRun) console.log('サービスアカウントが無いので保存しません(--dry-run と同じ)。');
    items.slice(0, 15).forEach((it) => console.log(`  ${(it.pubDate || '').slice(0, 16).padEnd(17)} ${it.source.slice(0, 12).padEnd(13)} ${it.category.padEnd(10)} ${it.title.slice(0, 40)}`));
    return;
  }

  const app = initializeApp({ credential: cert(JSON.parse(raw)) });
  const db = getFirestore(app);
  const col = db.collection(ARCHIVE);

  const refs = items.map((it) => col.doc(docId(it.link)));
  const existing = new Map<string, Doc>();
  for (let k = 0; k < refs.length; k += 300) {
    const snaps = await db.getAll(...refs.slice(k, k + 300));
    snaps.forEach((s) => s.exists && existing.set(s.id, s.data() as Doc));
  }

  const needOg = items.filter((it) => {
    const prev = existing.get(docId(it.link));
    return isLocalFallback(it.image) && !(prev && (!isLocalFallback(prev.image) || prev.imageTried));
  });
  const og = await fillOg(needOg);

  const now = Date.now();
  let added = 0;
  let writes = 0;
  let batch = db.batch();
  for (const it of items) {
    const id = docId(it.link);
    const prev = existing.get(id);
    const image = [it.image, prev?.image, og.get(it.link)].find((u) => u && !isLocalFallback(u)) || '';
    const doc: Doc = {
      id: it.link,
      title: it.title,
      link: it.link,
      pubDate: it.pubDate || '',
      source: it.source,
      description: (it.description || '').slice(0, 400),
      category: it.category,
      image,
      ts: productTime(it.pubDate) || prev?.ts || now,
      imageTried: Boolean(prev?.imageTried || og.has(it.link) || image),
      firstSeen: prev?.firstSeen || now,
    };
    if (!prev) added++;
    if (prev && prev.title === doc.title && prev.image === doc.image && prev.imageTried === doc.imageTried && prev.ts === doc.ts && prev.category === doc.category) continue;
    batch.set(col.doc(id), doc);
    if (++writes % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  batch.set(db.collection('news-meta').doc('products'), { lastRun: now, total: items.length, added, general, makersOk: makers.filter((s) => s.ok).length, makersTotal: makers.length });
  await batch.commit();

  const withImg = items.filter((it) => [it.image, existing.get(docId(it.link))?.image, og.get(it.link)].some((u) => u && !isLocalFallback(u))).length;
  const line = `新規 ${added} 件 / 書き込み ${writes} 件 / 写真あり ${withImg} / ${items.length} 件(${((Date.now() - started) / 1000).toFixed(1)} 秒)`;
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      [
        '## 新製品の収集',
        line,
        `メーカーの配信: ${makers.length} 本中 ${makers.filter((s) => s.ok).length} 本が読めた`,
        '',
        '| 状態 | HTTP | RSS の件数 | 採用 | 配信元 |',
        '|---|---|---|---|---|',
        ...general.map((s) => `| ${s.ok ? 'ok' : '**止まっている**'} | ${s.status} | ${s.items} | ${s.kept} | ${s.source} |`),
      ].join('\n') + '\n'
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
