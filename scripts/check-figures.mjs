// 設計情報・材料情報の図(src/data/figures + public/figures)を検査する。2026-11-14
//   node --import ./scripts/lib/register-ts.mjs scripts/check-figures.mjs [--post 40,41 | --mat] [--png 出力先]
// 見るもの: SVG がある / 描ける / viewBox と w・h が合う / 見出し(after)・節(sec)がある /
//           id が重複しない / 字数 / 大きさ / スクリプトや外部参照が無い。--png を付けると PNG に描いて保存する(目で確かめる用)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { FIGURES } from '../src/data/figures/index.ts';
import { MAT_FIGS } from '../src/data/figures/material.ts';
import { designPosts } from '../src/data/design-posts.ts';
import { MATERIAL_INFO_SECTIONS } from '../src/lib/infoLinks.ts';

const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : '');
const pngDir = arg('--png');
const only = arg('--post') ? arg('--post').split(',') : null;
const matOnly = process.argv.includes('--mat');
let bad = 0;
const ng = (id, msg) => {
  bad++;
  console.log(`NG ${id}: ${msg}`);
};
const seen = new Set();
const secIds = new Set(Object.values(MATERIAL_INFO_SECTIONS).flat().map((x) => x.id));

async function checkFile(f) {
  if ([...f.title].length > 30) ng(f.id, `title が ${[...f.title].length} 字`);
  if ([...f.caption].length > 80) ng(f.id, `caption が ${[...f.caption].length} 字`);
  const file = path.join('public/figures', `${f.id}.svg`);
  if (!fs.existsSync(file)) return ng(f.id, 'SVG が無い');
  const svg = fs.readFileSync(file, 'utf8');
  if (svg.length > 40_000) ng(f.id, `SVG が大きい(${svg.length} 字)`);
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!vb || +vb[1] !== f.w || +vb[2] !== f.h) ng(f.id, `viewBox が w・h(${f.w}×${f.h})と合わない`);
  if (/<script|\son\w+=|href="http/i.test(svg)) ng(f.id, 'スクリプト・外部参照がある');
  if (/&(?!(amp|lt|gt|quot|apos|#\d+);)/.test(svg)) ng(f.id, '& がエスケープされていない');
  try {
    const img = sharp(Buffer.from(svg), { density: 144 });
    if (pngDir) {
      fs.mkdirSync(pngDir, { recursive: true });
      await img.png().flatten({ background: '#ffffff' }).toFile(path.join(pngDir, `${f.id}.png`));
    } else await img.metadata();
  } catch (e) {
    ng(f.id, `描けない(${e.message})`);
  }
}

if (!matOnly) {
  for (const f of FIGURES) {
    if (only && !only.includes(f.post)) continue;
    if (seen.has(f.id)) ng(f.id, 'id が重複');
    seen.add(f.id);
    if (!/^p\d+-[a-z0-9-]+$/.test(f.id)) ng(f.id, 'id の形が p{記事id}-{英小文字} でない');
    if (!f.id.startsWith(`p${f.post}-`)) ng(f.id, 'id と post が合わない');
    const post = designPosts.find((p) => p.id === f.post);
    if (!post) ng(f.id, `記事 ${f.post} が無い`);
    else if (f.after && !post.content.split('\n').some((l) => l.trim() === `## ${f.after}`)) ng(f.id, `見出し「## ${f.after}」が記事に無い`);
    await checkFile(f);
  }
}
if (!only) {
  for (const f of MAT_FIGS) {
    if (seen.has(f.id)) ng(f.id, 'id が重複');
    seen.add(f.id);
    if (!/^m-[a-z0-9-]+$/.test(f.id)) ng(f.id, 'id の形が m-{英小文字} でない');
    if (!secIds.has(f.sec)) ng(f.id, `節 ${f.sec} が無い`);
    await checkFile(f);
  }
}
if (!only && !matOnly) {
  for (const file of fs.readdirSync('public/figures').filter((x) => x.endsWith('.svg'))) {
    const id = file.slice(0, -4);
    if (!FIGURES.some((f) => f.id === id) && !MAT_FIGS.some((f) => f.id === id)) ng(id, '登録の無い SVG');
  }
}
console.log(`図 ${FIGURES.length} 枚 + 材料情報 ${MAT_FIGS.length} 枚 / NG ${bad}`);
process.exit(bad ? 1 : 0);
