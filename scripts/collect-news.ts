// NEWS の定期収集。RSS を読み、記事を Firestore の news-archive に貯める。
//
//   node --import ./scripts/lib/register-ts.mjs scripts/collect-news.ts [--dry-run]
//   .github/workflows/collect-news.yml が 30 分ごとに実行する
//
// サービスアカウントは環境変数 FIREBASE_SERVICE_ACCOUNT(GitHub の Secret。scrape_kkj.py と同じ)か
// FIREBASE_SERVICE_ACCOUNT_JSON(手元の .env.local。node --env-file=.env.local で渡す)。
//
// 画面(/api/news)は貯めた分を読むだけなので、記事ページへの写真取り(og:image)はここでやる。
// 一度取りに行った記事は imageTried を立て、毎回取りに行かない。
// 配信元ごとの結果は news-meta/status と GitHub の実行結果の要約に残す(止まった配信元に気付くため)。
import { createHash } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { collectNews, pubTime, type NewsItem } from '../src/lib/newsCollect.ts';
import { fetchOgImage } from '../src/lib/feedImage.ts';
import { ARCHIVE, META, STATUS_DOC, type ArchiveDoc, type CollectStatus } from '../src/lib/newsArchive.ts';

const dryRun = process.argv.includes('--dry-run');
const docId = (link: string) => createHash('sha1').update(link).digest('hex').slice(0, 20);

/** 写真を並列で取る(相手に負担をかけないよう 6 本ずつ) */
async function fillOg(items: NewsItem[]): Promise<Map<string, string>> {
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
  const { items, sources } = await collectNews({ timeoutMs: 20000 });

  console.log('配信元ごとの結果');
  for (const s of sources) {
    console.log(`  ${s.ok ? 'ok' : 'NG'}  ${String(s.status).padStart(3)}  ${String(s.items).padStart(3)} 件中 ${String(s.kept).padStart(3)} 件採用  ${s.source}`);
  }
  console.log(`集めた記事: ${items.length} 件`);

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (dryRun || !raw) {
    if (!dryRun) console.log('サービスアカウントが無いので保存しません(--dry-run と同じ)。');
    const og = await fillOg(items.filter((x) => !x.image && !x.link.includes('news.google.com')).slice(0, 10));
    console.log(`写真の試し取り(10 件): ${[...og.values()].filter(Boolean).length} 件取れた`);
    return;
  }

  const app = initializeApp({ credential: cert(JSON.parse(raw)) });
  const db = getFirestore(app);
  const col = db.collection(ARCHIVE);

  // 既に貯めてある記事(写真を取りに行ったか)を先に読む。getAll は 1 回で最大数百件読める
  const refs = items.map((it) => col.doc(docId(it.link)));
  const existing = new Map<string, ArchiveDoc>();
  for (let k = 0; k < refs.length; k += 300) {
    const snaps = await db.getAll(...refs.slice(k, k + 300));
    snaps.forEach((s) => s.exists && existing.set(s.id, s.data() as ArchiveDoc));
  }

  // 写真がまだ無く、取りに行ってもいない記事だけ og:image を取る
  const needOg = items.filter((it) => {
    const prev = existing.get(docId(it.link));
    return !it.image && !(prev && (prev.image || prev.imageTried)) && !it.link.includes('news.google.com');
  });
  const og = await fillOg(needOg);

  let added = 0;
  const now = Date.now();
  const batch = db.batch();
  let writes = 0;
  for (const it of items) {
    const id = docId(it.link);
    const prev = existing.get(id);
    const image = it.image || prev?.image || og.get(it.link) || '';
    const doc: ArchiveDoc = {
      title: it.title,
      link: it.link,
      source: it.source,
      description: (it.description || '').slice(0, 400),
      pubDate: it.pubDate || '',
      // 日付の無い記事は最初に見た時刻で並べる
      ts: pubTime(it.pubDate) || prev?.ts || now,
      image,
      imageTried: Boolean(prev?.imageTried || og.has(it.link) || image),
      firstSeen: prev?.firstSeen || now,
    };
    if (!prev) added++;
    // 変わっていない記事は書かない(書き込み回数を抑える)
    if (prev && prev.title === doc.title && prev.image === doc.image && prev.imageTried === doc.imageTried && prev.ts === doc.ts) continue;
    batch.set(col.doc(id), doc);
    writes++;
  }
  const status: CollectStatus = { lastRun: now, total: items.length, added, sources };
  batch.set(db.collection(META).doc(STATUS_DOC), status);
  await batch.commit();

  const withImg = items.filter((it) => it.image || existing.get(docId(it.link))?.image || og.get(it.link)).length;
  const lines = [
    `新規 ${added} 件 / 書き込み ${writes} 件 / 写真あり ${withImg} / ${items.length} 件(${((Date.now() - started) / 1000).toFixed(1)} 秒)`,
  ];
  console.log(lines[0]);

  if (process.env.GITHUB_STEP_SUMMARY) {
    const md = [
      '## NEWS の収集',
      lines[0],
      '',
      '| 状態 | HTTP | RSS の件数 | 採用 | 配信元 |',
      '|---|---|---|---|---|',
      ...sources.map((s) => `| ${s.ok ? 'ok' : '**止まっている**'} | ${s.status} | ${s.items} | ${s.kept} | ${s.source} |`),
    ].join('\n');
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  }
  const dead = sources.filter((s) => !s.ok);
  if (dead.length) console.log(`::warning::止まっている配信元: ${dead.map((s) => s.source).join('、')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
