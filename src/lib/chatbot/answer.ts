/**
 * 建材Chatbot の答えを、サイトの資料だけで組み立てる(AI は使わない)。2026-11-14
 *
 * 引き出し:
 *   - 建材ページの基本知識(src/data/knowledge.json の節)
 *   - 設計情報の記事 47 本(src/data/design-posts.ts の「## 章」ごと)
 *   - 物件カルテの検討項目 54 件(src/lib/karte/guides.ts)
 *
 * 1. 探す: 質問を 2 文字ずつに切り(siteSearch の grams)、どの資料にも出る語は軽く、
 *    少しの資料にしか出ない語は重く数える(IDF)。題に当たれば 2 倍。同じページ・記事からは 2 件まで。
 *    「A と B の違い」は A・B それぞれでも探し、両方の資料が出るようにする。
 * 2. 答える: 上位の資料を文に切り、質問の語を多く含む文を最大 5 つ抜き出して「要点」にする。
 *    基準・寸法・何 mm など数値を聞く質問では、数値を含む文を優先する。文ごとに出典の番号を付ける。
 */
import { expandQuery, norm, type Gram, type KnowledgePage } from '@/lib/siteSearch';
import { CATEGORY_SUBCATEGORIES, materialSubPath, parseMaterialPath } from '@/lib/materialCategories';
import { MATERIAL_INFO_SECTIONS, materialInfoHref } from '@/lib/infoLinks';

export type SourceKind = '建材の基本知識' | '設計情報' | '物件カルテ' | '材料情報';

export type Chunk = {
  kind: SourceKind;
  /** 同じ元(ページ・記事・項目)の目印 */
  group: string;
  title: string;
  text: string;
  href: string;
  /** 建材ページなら、そのページ(メーカー一覧を出すため) */
  page?: KnowledgePage;
};

export type Source = Chunk & { n: number; score: number };
export type Point = { text: string; n: number };
export type Answer = { points: Point[]; sources: Source[] };

type Post = { id: string; title: string; content: string };
type Guide = { check: string[]; need: string[]; basis: string; pitfalls: string[] };

export type Index = { chunks: Chunk[]; idf: Map<string, number>; norms: string[]; titles: string[] };

/** 質問の決まり文句(中身が無いので捨てる) */
const STOP = /教えて(ください)?|おすすめ(は)?|について|知りたい|したい|ください|下さい|どう(すれば|したら|する)?|ですか|ますか|とは|でしょうか|どれくらい|どのくらい|必要|いい|よい|良い|気をつける|注意|こと|もの|ため/g;

/** どの分野にも出てくる語(「方法」「対策」など)は軽く数える */
const GENERIC = new Set(["方法", "対策", "違い", "種類", "選び", "基準", "注意", "特徴", "比較", "時期", "場合", "必要", "設置", "確認", "使い", "分け"]);

/**
 * 質問を語に切る。カタカナ・英数字の続きは 1 語(「アスファルト」を 5 つの 2 文字に割らない)、
 * 漢字の続きは 2 文字ずつ(「屋上防水」→ 屋上・上防・防水)、1 文字だけの漢字はそのまま。ひらがなは捨てる。
 */
export function terms(q: string): Gram[] {
  const t = q.normalize('NFKC').toLowerCase().replace(STOP, ' ');
  const out = new Map<string, number>();
  for (const m of t.matchAll(/[ァ-ヶー]{2,}|[a-z0-9][a-z0-9.-]*|[一-鿿々]+/g)) {
    const w = m[0];
    if (/^[ァ-ヶ]/.test(w) || /^[a-z0-9]/.test(w)) {
      if (w.length >= 2) out.set(norm(w), 1);
      continue;
    }
    if (w.length === 1) out.set(w, 0.7);
    for (let i = 0; i + 1 < w.length; i++) {
      const g = w.slice(i, i + 2);
      // 4・6 文字の熟語(「屋上防水」「改修方法」)は 2 文字の語の組み合わせが多い。語の切れ目をまたぐ「上防」「修方」は軽く
      const straddle = w.length % 2 === 0 && w.length >= 4 && i % 2 === 1;
      const weight = GENERIC.has(g) ? 0.25 : straddle ? 0.3 : 1;
      out.set(g, Math.max(out.get(g) ?? 0, weight));
    }
  }
  return [...out].map(([g, w]) => ({ g, w }));
}

export const pageHref = (route: string, param: string) => {
  if (!param) return route;
  const mat = parseMaterialPath(route.endsWith('/') ? route.slice(0, -1) : route);
  if (mat && CATEGORY_SUBCATEGORIES[mat.category]?.includes(param)) return materialSubPath(mat.category, param);
  return `${route}/?subcategory=${encodeURIComponent(param)}`;
};

/** 記事の書式(**・表の罫線・> )を落とす。表の行は「 / 」でつないだ 1 文にする */
const plain = (s: string) =>
  tables(s.replace(/\*\*/g, ''))
    .replace(/^###\s*/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/**
 * 表(| で区切った行)を、1 行ずつ読める文にする。見出しの行は捨て、各行を
 * 「(四) 上記以外: 階段・踊場の幅 75cm以上、けあげ 22cm以下、踏面 21cm以上」の形にする。
 */
function tables(s: string): string {
  const out: string[] = [];
  let head: string[] | null = null;
  const cells = (l: string) => l.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
  for (const line of s.split('\n')) {
    if (!line.trim().startsWith('|')) {
      head = null;
      out.push(line);
      continue;
    }
    const c = cells(line.trim());
    if (c.every((x) => /^:?-{2,}:?$/.test(x))) continue; // 区切りの行
    if (!head) {
      head = c;
      continue;
    }
    const [first, ...rest] = c;
    out.push(`${first}: ${rest.map((v, i) => (head![i + 1] ? `${head![i + 1]} ${v}` : v)).join('、')}`);
  }
  return out.join('\n');
}

export function buildIndex(knowledge: KnowledgePage[], posts: Post[], guides: Record<string, Guide>): Index {
  const chunks: Chunk[] = [];
  for (const p of knowledge) {
    for (const s of p.sections) {
      chunks.push({ kind: '建材の基本知識', group: `k:${p.route}:${p.param}`, title: `${p.name} — ${s.heading || p.title}`, text: s.text, href: pageHref(p.route, p.param), page: p });
    }
  }
  for (const post of posts) {
    for (const part of post.content.replace(/\r/g, '').split(/\n(?=## )/)) {
      const head = part.match(/^## (.+)/)?.[1]?.trim() ?? '';
      if (/^根拠|^参考|^主なメーカー/.test(head)) continue;
      const body = plain(part.replace(/^## .+\n?/, '').replace(/\n### 根拠[\s\S]*$/, ''));
      if (body.length < 40) continue;
      chunks.push({ kind: '設計情報', group: `p:${post.id}`, title: head ? `${post.title.replace(/【[^】]*】/g, '')} — ${head}` : post.title, text: body, href: `/lookup/?post=${post.id}` });
    }
  }
  // 材料情報(規格・寸法の早見表)は表なので、節の題だけを入れて表へのリンクにする
  for (const [cat, list] of Object.entries(MATERIAL_INFO_SECTIONS)) {
    for (const sec of list) {
      chunks.push({ kind: '材料情報', group: `m:${sec.id}`, title: `${sec.title}(${cat}の早見表)`, text: '', href: materialInfoHref(sec.id) });
    }
  }
  for (const [key, g] of Object.entries(guides)) {
    const label = key.split('|')[1] ?? key;
    const text = [`根拠: ${g.basis}`, ...g.check.map((c) => `確かめること: ${c}`), `必要な値: ${g.need.join('、')}`, ...g.pitfalls.map((c) => `よくある見落とし: ${c}`)].join('\n');
    chunks.push({ kind: '物件カルテ', group: `g:${key}`, title: `検討項目「${label}」`, text, href: '/karte/' });
  }
  const norms = chunks.map((c) => norm(c.text));
  const titles = chunks.map((c) => norm(c.title));
  // 語ごとの重み(いくつの資料に出るか)は、聞かれた語だけその場で数えて覚える
  return { chunks, idf: new Map(), norms, titles };
}

/** 語の重み。少しの資料にしか出ない語ほど重い(IDF) */
function idfOf(ix: Index, g: string): number {
  let v = ix.idf.get(g);
  if (v === undefined) {
    let n = 0;
    for (let i = 0; i < ix.norms.length; i++) if (ix.norms[i].includes(g) || ix.titles[i].includes(g)) n++;
    // どの資料にも無い語(「屋上防水」の「上防」のような切れ目の語)は 0。分母に入れると全部の点が下がる
    // 珍しすぎる語 1 つで順位が決まらないよう、上限を付ける
    v = n ? Math.min(3.5, Math.log(1 + ix.chunks.length / (1 + n))) : 0;
    ix.idf.set(g, v);
  }
  return v;
}
const weightOf = (ix: Index, { g, w }: Gram) => w * idfOf(ix, g);

/** 資料ごとの近さ。質問の語の重みの合計で割って 0〜3 くらいに収める */
function scoreAll(ix: Index, qg: Gram[]): number[] {
  const total = qg.reduce((a, q) => a + weightOf(ix, q), 0) || 1;
  return ix.chunks.map((_, i) => {
    let s = 0;
    let covered = 0;
    for (const q of qg) {
      const w = weightOf(ix, q);
      const inTitle = ix.titles[i].includes(q.g);
      const inText = ix.norms[i].includes(q.g);
      if (inTitle) s += 1.2 * w;
      if (inText) s += w;
      if (inTitle || inText) covered += w;
    }
    // 質問の語を広く含む資料ほど上に(題に 1 語当たっただけの資料が上に来ないように)
    const coverage = covered / total;
    // 題に質問の語が 2 つ以上あれば、まさにその話題の資料(「防水」「改修」→「アスファルト防水 — 維持管理・改修」)
    const titleHits = qg.filter((q) => q.w >= 1 && ix.titles[i].includes(q.g) && idfOf(ix, q.g) > 0).length;
    return (s / total) * (0.4 + 0.6 * coverage) * (1 + 0.35 * Math.max(0, titleHits - 1));
  });
}

/** 「A と B の違い」「A か B か」 → [A, B] */
function comparedTerms(q: string): string[] {
  const m = q.normalize('NFKC').match(/([^\s、。とや]{2,})(?:と|や|か|vs\.?|・)([^\s、。とや]{2,}?)(?:の)?(?:違い|ちがい|比較|どちら|どっち)/i);
  return m ? [m[1], m[2]] : [];
}

/** 文に切る(改行と「。」。かっこの中の「。」では切らない)。行頭の「・」は落とす */
function sentences(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split(/\n+/)) {
    let depth = 0;
    let cur = '';
    for (const ch of line) {
      cur += ch;
      if ('(（「『【'.includes(ch)) depth++;
      else if (')）」』】'.includes(ch)) depth = Math.max(0, depth - 1);
      else if (ch === '。' && depth === 0) {
        out.push(cur);
        cur = '';
      }
    }
    if (cur.trim()) out.push(cur);
  }
  return out.map((s) => s.replace(/^[・\-\s]+/, '').trim()).filter((s) => s.length >= 8);
}

const ASKS_NUMBER = /基準|寸法|何\s*(mm|cm|m|度|%|分|年|kg)|以上|以下|いくつ|何センチ|何ミリ|高さ|幅|厚さ|勾配|間隔|距離|面積|容量|規定|数値/;

export function answer(ix: Index, query: string, limit = 6): Answer {
  // 言い換えで足した語(「蹴上」→「けあげ」など)は、ひらがなでも 1 語として使う
  const extra = expandQuery(query).slice(query.length);
  const qg = terms(expandQuery(query));
  for (const w of extra.normalize('NFKC').match(/[ぁ-ゖー]{3,}/g) ?? []) if (!qg.some((q) => q.g === w)) qg.push({ g: w, w: 1 });
  if (!qg.length) return { points: [], sources: [] };
  const scores = scoreAll(ix, qg);
  const order = scores.map((s, i) => ({ s, i })).filter((x) => x.s >= 0.2).sort((a, b) => b.s - a.s);

  // 比べる質問は、A・B それぞれの一番近い資料を先に入れる
  const forced: number[] = [];
  for (const term of comparedTerms(query)) {
    const tg = terms(term);
    if (!tg.length) continue;
    const ts = scoreAll(ix, tg);
    let best = -1;
    for (let i = 0; i < ts.length; i++) if (best < 0 || ts[i] > ts[best]) best = i;
    if (best >= 0 && ts[best] >= 0.6 && !forced.includes(best)) forced.push(best);
  }

  const top = order[0]?.s ?? 0;
  const per = new Map<string, number>();
  const picked: number[] = [];
  for (const i of [...forced, ...order.filter((x) => x.s >= top * 0.45).map((x) => x.i)]) {
    if (picked.includes(i)) continue;
    const g = ix.chunks[i].group;
    if ((per.get(g) ?? 0) >= 2) continue;
    per.set(g, (per.get(g) ?? 0) + 1);
    picked.push(i);
    if (picked.length >= limit) break;
  }
  const sources: Source[] = picked.map((i, k) => ({ ...ix.chunks[i], n: k + 1, score: scores[i] }));

  // 要点: 上位 6 件の資料を文に切り、質問の語を広く含む文を選ぶ。
  // 点 = 質問の語のうち文が含む割合(語の重みは全資料での珍しさ)× 資料の中での珍しさ(少し)。
  // 主題の語(「折板」の資料の中の「折板」)だけの文より、困りごとの語(「結露」「改修」)も含む文が上に来る
  const wantsNumber = ASKS_NUMBER.test(query);
  const raw: Array<{ t: string; nt: string; n: number; k: number }> = [];
  sources.slice(0, 6).forEach((src, k) => {
    for (const t of sentences(src.text)) raw.push({ t, nt: norm(t), n: src.n, k });
  });
  const S = raw.length || 1;
  const inSents = new Map<string, number>();
  for (const q of qg) inSents.set(q.g, raw.reduce((a, r) => a + (r.nt.includes(q.g) ? 1 : 0), 0));
  const live = qg.filter((q) => (inSents.get(q.g) ?? 0) > 0 && weightOf(ix, q) > 0);
  const total = live.reduce((a, q) => a + weightOf(ix, q), 0) || 1;
  const rarity = (g: string) => Math.log(1 + S / (1 + (inSents.get(g) ?? 0))) / Math.log(1 + S);
  const cands: Array<{ text: string; n: number; s: number; k: number }> = [];
  for (const r of raw) {
    let cover = 0;
    let rare = 0;
    for (const q of live) {
      if (!r.nt.includes(q.g)) continue;
      const w = weightOf(ix, q);
      cover += w;
      rare += w * rarity(q.g);
    }
    if (!cover) continue;
    let s = (cover / total) * (0.75 + 0.5 * (rare / cover));
    // 「断熱・結露: …」のように、見出し語が質問に当たる文は答えそのものであることが多い
    const label = r.t.match(/^([^:：。]{1,14})[:：]/)?.[1];
    if (label && live.some((q) => q.w >= 1 && norm(label).includes(q.g))) s *= 1.3;
    if (wantsNumber && /\d/.test(r.t)) s *= 1.25;
    // 規格名だけ・表の見出しだけの行は答えにならない
    if (r.t.length < 30 && !/[。、]/.test(r.t)) s *= 0.5;
    if (/^(JIS|JASS|SHASE|公共建築|建築基準法|施行令|告示|国土交通省|昭和|平成|令和)/.test(r.t) && r.t.length < 60) s *= 0.4;
    if (r.t.length > 160) s *= 0.85; // 長すぎる文は少し下げる
    s *= 1 - r.k * 0.06; // 上位の資料の文を優先
    cands.push({ text: r.t.length > 220 ? r.t.slice(0, 218) + '…' : r.t, n: r.n, s, k: r.k });
  }
  cands.sort((a, b) => b.s - a.s);
  const points: Point[] = [];
  const perSrc = new Map<number, number>();
  const take = (c: (typeof cands)[number]) => {
    if ((perSrc.get(c.n) ?? 0) >= 2) return false;
    if (points.some((p) => p.text === c.text || norm(p.text).includes(norm(c.text)) || norm(c.text).includes(norm(p.text)))) return false;
    perSrc.set(c.n, (perSrc.get(c.n) ?? 0) + 1);
    points.push({ text: c.text, n: c.n });
    return true;
  };
  // 比べる質問は、A・B それぞれの資料から一番の文を先に出す
  forced.forEach((ci) => {
    const n = picked.indexOf(ci) + 1;
    const c = cands.find((x) => x.n === n);
    if (c) take(c);
  });
  const best = cands[0]?.s ?? 0;
  for (const c of cands) {
    if (points.length >= 5) break;
    if (c.s < best * 0.5 || c.s < 0.2) break;
    take(c);
  }
  return { points, sources };
}
