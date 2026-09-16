// 共有/カルテ機能/yaneyuka_建築調べもの項目リスト_v1.md を読み、
// /lookup/ 配下の索引ページが使う JSON を生成する。
//
//   node scripts/build-lookup-items.mjs
//
// MD の各行は「- 項目名｜根拠｜★｜形式」の 4 列。章 1〜4 だけを対象にし、
// 章 0（作り方）と章 5（優先順位）の箇条書きは除外する。
// 生成物: src/data/lookup/items.json（Git 管理。共有/ は本番に配信されないため）
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('共有/カルテ機能/yaneyuka_建築調べもの項目リスト_v1.md');
const OUT = path.resolve('src/data/lookup/items.json');

const CATEGORY_BY_CHAPTER = {
  1: { slug: 'design', label: '意匠・法規', short: '意匠' },
  2: { slug: 'structure', label: '構造', short: '構造' },
  3: { slug: 'mep', label: '設備', short: '設備' },
  4: { slug: 'electrical', label: '電気・通信', short: '電気' },
};

const lines = fs.readFileSync(SRC, 'utf8').split(/\r?\n/);
const categories = [];
let chapter = 0;
let current = null;
let section = null;
let seq = 0;

for (const raw of lines) {
  const line = raw.trimEnd();
  const h2 = line.match(/^## (\d+)\. (.+)$/);
  if (h2) {
    chapter = Number(h2[1]);
    const meta = CATEGORY_BY_CHAPTER[chapter];
    current = meta ? { ...meta, sections: [] } : null;
    if (current) categories.push(current);
    section = null;
    continue;
  }
  if (!current) continue;
  const h3 = line.match(/^### (\d+-\d+) (.+)$/);
  if (h3) {
    section = { id: h3[1], title: h3[2], items: [] };
    current.sections.push(section);
    continue;
  }
  if (!section || !line.startsWith('- ')) continue;
  const cols = line.slice(2).split('｜').map((s) => s.trim());
  if (cols.length !== 4 || !/^★+$/.test(cols[2])) {
    throw new Error(`行の形式が想定外です: ${line}`);
  }
  seq += 1;
  section.items.push({
    id: `${section.id}-${String(section.items.length + 1).padStart(2, '0')}`,
    title: cols[0],
    basis: cols[1],
    priority: cols[2].length,
    format: cols[3],
  });
}

const total = categories.reduce(
  (s, c) => s + c.sections.reduce((t, sec) => t + sec.items.length, 0),
  0,
);
if (total < 2000) throw new Error(`項目数が少なすぎます: ${total}`);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ generatedFrom: path.basename(SRC), total, categories }, null, 0) + '\n');
console.log(`wrote ${OUT}: ${total} items, ${categories.length} categories, seq=${seq}`);
for (const c of categories) {
  console.log(`  ${c.slug}: ${c.sections.length} sections, ${c.sections.reduce((t, s) => t + s.items.length, 0)} items`);
}
