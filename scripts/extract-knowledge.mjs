// 建材ページ（src/components/content/leftcolumn-menu/mak_*.tsx）の「基本知識」を
// Chatbot が引ける形（src/data/knowledge.json）に書き出す。
//   node scripts/extract-knowledge.mjs          … 書き出す
//   node scripts/extract-knowledge.mjs --verify … 書き出し済みと食い違っていれば失敗（建材ページを直したら作り直す）
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'src/components/content/leftcolumn-menu';
const OUT = 'src/data/knowledge.json';

/** ファイル → サイトのパス（MainLayout の pathToContentMap と同じ） */
const ROUTES = {
  'mak_1_屋根.tsx': '/roof',
  'mak_2_外壁.tsx': '/exterior-wall',
  'mak_3_開口部.tsx': '/opening',
  'mak_5_外部床.tsx': '/external-floor',
  'mak_6_外部その他.tsx': '/exterior-other',
  'mak_7_内部床.tsx': '/internal-floor',
  'mak_8_内装壁材.tsx': '/internal-wall',
  'mak_9_内装天井材.tsx': '/internal-ceiling',
  'mak_10_内装その他.tsx': '/internal-other',
  'mak_11_防水.tsx': '/waterproof',
  'mak_12_金物.tsx': '/hardware',
  'mak_13_ファニチャー.tsx': '/furniture',
  'mak_14_電気設備.tsx': '/electrical-systems',
  'mak_15_機械設備.tsx': '/mechanical-systems',
  'mak_16_外構.tsx': '/exterior-infrastructure',
  'mak_17_エクステリア.tsx': '/exterior',
};

const decode = (s) =>
  s
    .replace(/\{['"`]([^'"`]*)['"`]\}/g, '$1')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
const stripTags = (s) => decode(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

function parseBlock(block) {
  let title = '';
  const sections = [];
  let cur = null;
  // 見出しと段落・箇条を出てくる順に拾う
  const re = /<(h3|h4|p|li)\b[^>]*>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = re.exec(block))) {
    const tag = m[1];
    const text = stripTags(m[2]).replace(/^・\s*/, '');
    if (!text) continue;
    if (tag === 'h3') {
      if (!title) title = text;
      else {
        cur = { heading: text, text: '' };
        sections.push(cur);
      }
    } else if (tag === 'h4') {
      cur = { heading: text, text: '' };
      sections.push(cur);
    } else {
      if (!cur) {
        cur = { heading: '', text: '' };
        sections.push(cur);
      }
      cur.text += (cur.text ? '\n' : '') + (tag === 'li' ? '・' : '') + text;
    }
  }
  return { title, sections: sections.filter((s) => s.text) };
}

function attrs(tag) {
  const o = {};
  for (const m of tag.matchAll(/(\w+)="([^"]*)"/g)) o[m[1]] = m[2];
  return o;
}

/** 1 ページぶん（case の中身か render 関数の中身）から知識を取り出す */
function fromSegment(route, params, body) {
  const start = body.indexOf('showBasicKnowledge && (');
  if (start < 0) return null;
  const rest = body.slice(start);
  const end = rest.search(/\n\s*\)\}\s*\n/);
  if (end < 0) return null;
  const { title, sections } = parseBlock(rest.slice(0, end));
  if (!sections.length) return null;
  const h2 = body.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? '';
  // 見出しが式（{subcategory === … ? … : …}）のときはラベルを名前にする
  const name = h2 && !h2.includes('{') ? stripTags(h2) : params[0];
  const makerPages = [];
  for (const t of body.matchAll(/<MakerRows\b[^>]*\/>/g)) {
    const a = attrs(t[0]);
    if (a.category && a.page && !makerPages.some((p) => p.category === a.category && p.page === a.page)) makerPages.push({ category: a.category, page: a.page });
  }
  return { route, param: params[0], name, title, makerPages, sections };
}

const out = [];
for (const [file, route] of Object.entries(ROUTES)) {
  const src = fs.readFileSync(path.join(DIR, file), 'utf8').replace(/\r\n/g, '\n');

  // 書き方その1: switch の case の中にそのまま JSX がある（mak_1〜8）
  const parts = src.split(/\n\s*case '([^']+)':/);
  for (let i = 1; i < parts.length; i += 2) {
    const params = [parts[i]];
    let body = parts[i + 1];
    // 直後が次の case なら（中身が空）ラベルをまとめる
    while (!body.trim() && i + 2 < parts.length) {
      i += 2;
      params.push(parts[i]);
      body = parts[i + 1];
    }
    const k = fromSegment(route, params, body);
    if (k) out.push(k);
  }

  // 書き方その2: ページごとの render 関数を switch から呼ぶ（mak_9〜17）
  const fnBodies = new Map();
  const fnParts = src.split(/\n\s*const (render\w+) = \(\) => \(/);
  for (let i = 1; i < fnParts.length; i += 2) fnBodies.set(fnParts[i], fnParts[i + 1]);
  if (fnBodies.size) {
    // case 'A': case 'B': return renderX();
    const labelsOf = new Map();
    let pending = [];
    for (const m of src.matchAll(/case '([^']+)':|return (render\w+)\(\)/g)) {
      if (m[1]) pending.push(m[1]);
      else if (m[2]) {
        if (pending.length) labelsOf.set(m[2], [...(labelsOf.get(m[2]) ?? []), ...pending]);
        pending = [];
      }
    }
    for (const [fn, labels] of labelsOf) {
      const body = fnBodies.get(fn);
      if (!body) continue;
      const k = fromSegment(route, labels, body);
      if (k && !out.some((o) => o.route === k.route && o.param === k.param)) out.push(k);
    }
  }
}

const json = JSON.stringify(out, null, 1) + '\n';
if (process.argv.includes('--verify')) {
  const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
  if (now !== json) {
    console.error(`${OUT} が建材ページと食い違っています。node scripts/extract-knowledge.mjs で作り直してください`);
    process.exit(1);
  }
  console.log(`ok（${out.length} ページ）`);
} else {
  fs.writeFileSync(OUT, json);
  const chars = out.reduce((n, k) => n + k.sections.reduce((m, s) => m + s.text.length, 0), 0);
  console.log(`${OUT}: ${out.length} ページ / ${out.reduce((n, k) => n + k.sections.length, 0)} 節 / ${chars} 字`);
}
