// 建材ページの基本知識（src/data/knowledge/<分類>.json）を、建材Chatbot が引く 1 ファイル
// （src/data/knowledge.json）にまとめる。基本知識を直したら実行する。
//   node scripts/build-knowledge.mjs          … 書き出す
//   node scripts/build-knowledge.mjs --verify … 書き出し済みと食い違っていれば失敗
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'src/data/knowledge';
const OUT = 'src/data/knowledge.json';

const out = [];
for (const f of fs.readdirSync(SRC).filter((f) => f.endsWith('.json')).sort()) {
  const list = JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'));
  for (const k of list) {
    out.push({
      route: k.route,
      param: k.param,
      name: k.name,
      // Chatbot はページ名・要約・見出し・本文で探す
      title: k.lead,
      makerPages: k.makerPages ?? [],
      sections: [...k.sections, ...(k.refs?.length ? [{ heading: '関連する法令・規格', text: k.refs.map((r) => `・${r}`).join('\n') }] : [])],
    });
  }
}

const json = JSON.stringify(out, null, 1) + '\n';
if (process.argv.includes('--verify')) {
  const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
  if (now !== json) {
    console.error(`${OUT} が src/data/knowledge/ と食い違っています。node scripts/build-knowledge.mjs で作り直してください`);
    process.exit(1);
  }
  console.log(`ok（${out.length} ページ）`);
} else {
  fs.writeFileSync(OUT, json);
  const chars = out.reduce((n, k) => n + k.sections.reduce((m, s) => m + s.text.length, 0), 0);
  console.log(`${OUT}: ${out.length} ページ / ${chars} 字`);
}
