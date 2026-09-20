// 対象法令チェックが参照している原典の更新を検知する。
//   ローカル: npm run check:regulations
//   承認    : npm run check:regulations -- --acknowledge
//   自動    : .github/workflows/check-regulation-sources.yml が週1回実行
//
// 出力: src/data/regulations/sourceStatus.json
//   RegulationCheck（src/components/content/regulations/RegulationCheck.tsx）が読み、
//   取り込み時点から原典が更新された項目に「原典が更新されています」を表示する。
//
// なぜ必要か:
//   判定ルールは自治体の条例・要綱・チェックリストを人が読んで書き起こしている。
//   原典が改訂されても、こちらのデータは黙って古いままになる。有料で使う道具で
//   これは致命的なので、「静かに古くなる」のを「見えて古くなる」に変える。
//
// 検知の方法は原典の種類で分かれる:
//   PDF   … Last-Modified と ETag と本文のハッシュ。実測では静岡市・札幌市とも
//           Last-Modified を返すので、まずこれで見る。
//   HTML  … 横浜市の条例一覧は Last-Modified が毎回アクセス時刻になるため使えない。
//           タグとスクリプトを落とした本文のハッシュで比べる。
//   e-Gov … ページが動的生成なのでハッシュは効かない。更新法令一覧API
//           (https://laws.e-gov.go.jp/api/1/updatelawlists/{YYYYMMDD}) で
//           参照中の法令が更新された日を拾う。
//
// baseline と current を分けて持つのが要点。
//   baseline … 人が原典を読み直して内容を取り込んだ時点の署名
//   current  … 今回取得した署名
//   この2つがずれている間は changed のままにする。--acknowledge を付けて実行すると
//   baseline を current に揃える。つまり「直した」と宣言するまで警告は消えない。

import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = path.join(root, 'src/data/regulations/sourceStatus.json');
const tmpDir = path.join(root, '.tmp-srccheck');
const srcDir = 'src/data/regulations';

const ACKNOWLEDGE = process.argv.includes('--acknowledge');
const SINCE_ARG = (process.argv.find((a) => a.startsWith('--since=')) || '').split('=')[1];

const TIMEOUT_MS = 20000;
const UA = 'Mozilla/5.0 (compatible; yaneyuka-regcheck/1.0; +https://yaneyuka.com/)';
// 初回に何年分も遡ると e-Gov に無駄な負荷をかけるので、遡りは既定で120日まで。
const MAX_BACKFILL_DAYS = 120;

// ---------------------------------------------------------------------------
// ルール定義から出典を集める
// ---------------------------------------------------------------------------

const SOURCES = [
  `${srcDir}/types.ts`,
  `${srcDir}/lawSources.ts`,
  `${srcDir}/options.ts`,
  `${srcDir}/nationalRules.ts`,
  `${srcDir}/municipalities/_helpers.ts`,
  `${srcDir}/municipalities/shizuoka.ts`,
  `${srcDir}/municipalities/sapporo.ts`,
  `${srcDir}/municipalities/yokohama.ts`,
  `${srcDir}/municipalities/index.ts`,
];

fs.rmSync(tmpDir, { recursive: true, force: true });
execSync(
  `npx tsc ${SOURCES.join(' ')} --outDir ${JSON.stringify(tmpDir)} --rootDir ${srcDir} ` +
    '--module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node',
  { cwd: root, stdio: 'inherit' }
);

const require = createRequire(import.meta.url);
const { NATIONAL_RULES } = require(path.join(tmpDir, 'nationalRules.js'));
const { PACKS } = require(path.join(tmpDir, 'municipalities', 'index.js'));
const { LAW_IDS } = require(path.join(tmpDir, 'lawSources.js'));

const allRules = [...NATIONAL_RULES, ...PACKS.flatMap((p) => p.rules)];

/** 出典URL -> { label, ruleIds } */
const docs = new Map();
for (const rule of allRules) {
  for (const s of rule.sources) {
    if (s.url.includes('laws.e-gov.go.jp')) continue; // e-Gov は API で見る
    if (!docs.has(s.url)) docs.set(s.url, { label: s.label, ruleIds: [] });
    docs.get(s.url).ruleIds.push(rule.id);
  }
}

// ---------------------------------------------------------------------------
// 署名の取り方
// ---------------------------------------------------------------------------

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/**
 * HTML から本文らしき部分だけを取り出す。
 * スクリプト・スタイル・コメント・タグを落として空白を潰す。
 * これをやらないと、広告やトークンの差し替えだけでハッシュが動いて誤検知になる。
 */
function normalizeHtml(text) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchSignature(url) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ac.signal, redirect: 'follow' });
    const buf = Buffer.from(await res.arrayBuffer());
    const type = res.headers.get('content-type') || '';
    const isHtml = type.includes('text/html');
    const body = isHtml ? normalizeHtml(buf.toString('utf8')) : buf;
    return {
      httpStatus: res.status,
      kind: isHtml ? 'html' : 'pdf',
      lastModified: res.headers.get('last-modified') || null,
      etag: res.headers.get('etag') || null,
      bytes: buf.length,
      // HTML は本文のみ、PDF はバイト列そのもの
      contentHash: sha256(body),
    };
  } catch (e) {
    return { httpStatus: 0, error: String(e.message || e) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 署名が変わったかを判定する。
 * PDF は Last-Modified が動いていれば十分。返さないサーバもあるのでハッシュも見る。
 * HTML は Last-Modified が当てにならないのでハッシュだけを見る。
 */
function signatureChanged(baseline, current) {
  if (!baseline || !current) return false;
  if (current.kind === 'html') return baseline.contentHash !== current.contentHash;
  if (baseline.lastModified && current.lastModified && baseline.lastModified !== current.lastModified) return true;
  return baseline.contentHash !== current.contentHash;
}

// ---------------------------------------------------------------------------
// e-Gov 更新法令一覧
// ---------------------------------------------------------------------------

const ymd = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
const parseYmd = (s) => new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));

async function fetchUpdatedLaws(dateStr, watchedIds) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://laws.e-gov.go.jp/api/1/updatelawlists/${dateStr}`, {
      headers: { 'User-Agent': UA },
      signal: ac.signal,
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const hits = [];
    for (const m of xml.matchAll(/<LawNameListInfo>([\s\S]*?)<\/LawNameListInfo>/g)) {
      const block = m[1];
      const id = (block.match(/<LawId>([^<]*)</) || [])[1];
      if (id && watchedIds.has(id)) {
        hits.push({ lawId: id, lawName: (block.match(/<LawName>([^<]*)</) || [])[1] || '', date: dateStr });
      }
    }
    return hits;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// 実行
// ---------------------------------------------------------------------------

const previous = fs.existsSync(OUT_FILE) ? JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')) : null;
const today = new Date();
const todayStr = ymd(today);
const nowIso = new Date().toISOString();

console.log(`原典 ${docs.size} 件 / 参照法令 ${Object.keys(LAW_IDS).length} 件を確認します。`);
if (ACKNOWLEDGE) console.log('--acknowledge: 現在の状態を基準として取り込み直します。');

// --- 自治体の資料 -----------------------------------------------------------
const documents = {};
let changedCount = 0;
let errorCount = 0;

for (const [url, meta] of docs) {
  const prev = previous?.documents?.[url];
  const current = await fetchSignature(url);

  if (current.error || current.httpStatus >= 400) {
    errorCount += 1;
    documents[url] = {
      ...(prev || {}),
      label: meta.label,
      ruleIds: meta.ruleIds,
      status: 'error',
      httpStatus: current.httpStatus,
      error: current.error || `HTTP ${current.httpStatus}`,
      checkedAt: nowIso,
    };
    console.log(`  [取得失敗] ${meta.label}`);
    continue;
  }

  const signature = {
    kind: current.kind,
    lastModified: current.lastModified,
    etag: current.etag,
    bytes: current.bytes,
    contentHash: current.contentHash,
  };

  if (!prev || !prev.baseline || ACKNOWLEDGE) {
    documents[url] = {
      label: meta.label,
      ruleIds: meta.ruleIds,
      status: 'ok',
      baseline: signature,
      baselineAt: ACKNOWLEDGE && prev ? nowIso : prev?.baselineAt || nowIso,
      checkedAt: nowIso,
    };
    if (!prev) console.log(`  [基準を記録] ${meta.label}`);
    else if (ACKNOWLEDGE && prev.status === 'changed') console.log(`  [承認] ${meta.label}`);
    continue;
  }

  const changed = signatureChanged(prev.baseline, signature) || prev.status === 'changed';
  if (changed) changedCount += 1;
  documents[url] = {
    label: meta.label,
    ruleIds: meta.ruleIds,
    status: changed ? 'changed' : 'ok',
    baseline: prev.baseline,
    baselineAt: prev.baselineAt,
    current: changed ? signature : undefined,
    changedAt: changed ? prev.changedAt || nowIso : undefined,
    checkedAt: nowIso,
  };
  if (changed) console.log(`  [更新あり] ${meta.label}`);
}

// --- e-Gov の法令 -----------------------------------------------------------
const watched = new Map(Object.entries(LAW_IDS).map(([name, id]) => [id, name]));
const watchedIds = new Set(watched.keys());

let from;
if (SINCE_ARG) {
  from = parseYmd(SINCE_ARG);
} else if (previous?.egov?.watermark) {
  from = parseYmd(previous.egov.watermark);
  from.setDate(from.getDate() + 1);
} else {
  // 初回は遡らない。ここを基準日にして、次回以降の差分だけを見る。
  from = new Date(today);
}
const maxBack = new Date(today);
maxBack.setDate(maxBack.getDate() - MAX_BACKFILL_DAYS);
if (from < maxBack) from = maxBack;

const dates = [];
for (const d = new Date(from); d <= today; d.setDate(d.getDate() + 1)) dates.push(ymd(d));

const priorUpdates = previous?.egov?.updates || [];
const newUpdates = [];
if (dates.length > 0) {
  console.log(`e-Gov 更新法令一覧を ${dates[0]} から ${dates[dates.length - 1]} まで確認します (${dates.length}日分)。`);
  for (const d of dates) {
    const hits = await fetchUpdatedLaws(d, watchedIds);
    for (const h of hits) {
      newUpdates.push({ ...h, lawKey: watched.get(h.lawId) });
      console.log(`  [法令改正] ${h.date} ${watched.get(h.lawId)}`);
    }
  }
}

const mergedUpdates = ACKNOWLEDGE ? [] : [...priorUpdates, ...newUpdates];
// 同じ法令の同じ日付は1件にまとめる
const seen = new Set();
const egovUpdates = mergedUpdates.filter((u) => {
  const k = `${u.lawId}:${u.date}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

// --- 影響するルールIDを算出 --------------------------------------------------
const affectedByDoc = new Set();
for (const [, d] of Object.entries(documents)) {
  if (d.status === 'changed') d.ruleIds.forEach((id) => affectedByDoc.add(id));
}
const changedLawIds = new Set(egovUpdates.map((u) => u.lawId));
const affectedByLaw = new Set();
if (changedLawIds.size > 0) {
  const idToKey = new Map(Object.entries(LAW_IDS).map(([k, v]) => [v, k]));
  for (const rule of allRules) {
    for (const s of rule.sources) {
      const m = s.url.match(/laws\.e-gov\.go\.jp\/law\/([0-9A-Za-z]+)/);
      if (m && changedLawIds.has(m[1])) affectedByLaw.add(rule.id);
      void idToKey;
    }
  }
}

const out = {
  generatedAt: nowIso,
  summary: {
    documents: Object.keys(documents).length,
    changed: changedCount,
    error: errorCount,
    watchedLaws: watchedIds.size,
    lawUpdates: egovUpdates.length,
    affectedRules: new Set([...affectedByDoc, ...affectedByLaw]).size,
  },
  affectedRuleIds: [...new Set([...affectedByDoc, ...affectedByLaw])].sort(),
  documents,
  egov: {
    watermark: todayStr,
    updates: egovUpdates,
  },
};

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log('');
console.log(`原典 ${out.summary.documents} 件 / 更新あり ${out.summary.changed} 件 / 取得失敗 ${out.summary.error} 件`);
console.log(`法令の改正 ${out.summary.lawUpdates} 件 / 影響するルール ${out.summary.affectedRules} 件`);
console.log(`書き出し: ${path.relative(root, OUT_FILE)}`);
if (out.summary.changed > 0 || out.summary.lawUpdates > 0) {
  console.log('');
  console.log('原典を読み直してルールを更新したら、次を実行して基準を取り込み直してください。');
  console.log('  npm run check:regulations -- --acknowledge');
}
