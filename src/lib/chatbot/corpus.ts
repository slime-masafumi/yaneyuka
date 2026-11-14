/**
 * 建材Chatbot の AI 回答に渡す「資料」をサイトの中身から探す(サーバー専用)。2026-11-14
 *
 * 引き出しは 3 つ:
 *   - 建材ページの基本知識(src/data/knowledge.json の節)
 *   - 設計情報の記事 47 本(src/data/design-posts.ts の「## 章」ごと)
 *   - 物件カルテの検討項目 54 件(src/lib/karte/guides.ts。確かめること・根拠・見落とし)
 * 探し方は画面の検索と同じ 2 文字ずつの重なり(src/lib/siteSearch.ts)。
 */
import knowledge from '@/data/knowledge.json';
import { designPosts } from '@/data/design-posts';
import { GUIDES } from '@/lib/karte/guides';
import { CATEGORY_SUBCATEGORIES, materialSubPath, parseMaterialPath } from '@/lib/materialCategories';
import { expandQuery, grams, norm, scoreText, type KnowledgePage } from '@/lib/siteSearch';

export type Chunk = {
  /** 資料の種類(画面と AI の両方に出す) */
  kind: '建材の基本知識' | '設計情報' | '物件カルテ';
  /** 同じ元(ページ・記事)から取りすぎないための鍵 */
  group: string;
  title: string;
  text: string;
  href: string;
};

const pageHref = (route: string, param: string) => {
  if (!param) return route;
  const mat = parseMaterialPath(route.endsWith('/') ? route.slice(0, -1) : route);
  if (mat && CATEGORY_SUBCATEGORIES[mat.category]?.includes(param)) return materialSubPath(mat.category, param);
  return `${route}/?subcategory=${encodeURIComponent(param)}`;
};

/** 記事の書式(##・**・表の罫線)を落として、AI に渡す素の文にする */
const plain = (s: string) =>
  s
    .replace(/\*\*/g, '')
    .replace(/^\|?\s*-{2,}.*$/gm, '')
    .replace(/^#{2,3}\s*/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

let cache: Chunk[] | null = null;
function corpus(): Chunk[] {
  if (cache) return cache;
  const out: Chunk[] = [];
  for (const p of knowledge as unknown as KnowledgePage[]) {
    for (const s of p.sections) {
      out.push({ kind: '建材の基本知識', group: `k:${p.route}:${p.param}`, title: `${p.name} — ${s.heading || p.title}`, text: s.text, href: pageHref(p.route, p.param) });
    }
  }
  for (const post of designPosts) {
    const parts = post.content.replace(/\r/g, '').split(/\n(?=## )/);
    for (const part of parts) {
      const head = part.match(/^## (.+)/)?.[1]?.trim() ?? '';
      const body = plain(part.replace(/^## .+\n?/, ''));
      if (body.length < 40) continue;
      out.push({ kind: '設計情報', group: `p:${post.id}`, title: head ? `${post.title} — ${head}` : post.title, text: body, href: `/lookup/?post=${post.id}` });
    }
  }
  for (const [key, g] of Object.entries(GUIDES)) {
    const label = key.split('|')[1] ?? key;
    const text = [`確かめること: ${g.check.join(' / ')}`, `必要な値: ${g.need.join(' / ')}`, `根拠: ${g.basis}`, `よくある見落とし: ${g.pitfalls.join(' / ')}`].join('\n');
    out.push({ kind: '物件カルテ', group: `g:${key}`, title: `検討項目「${label}」`, text, href: '/karte/' });
  }
  cache = out;
  return out;
}

/** 長い本文は、当たった語のまわりを max 字まで切り出す */
function around(text: string, query: string, max: number): string {
  if (text.length <= max) return text;
  const qg = grams(expandQuery(query));
  const t = norm(text);
  // 当たりの多い位置(先頭から max/4 ずつずらして、当たった語の数を数える)
  let best = 0;
  let bestAt = 0;
  const step = Math.max(200, Math.floor(max / 4));
  for (let at = 0; at < t.length; at += step) {
    const win = t.slice(at, at + max);
    const n = qg.reduce((a, { g, w }) => a + (win.includes(g) ? w : 0), 0);
    if (n > best) {
      best = n;
      bestAt = at;
    }
  }
  const from = Math.max(0, Math.min(bestAt, text.length - max));
  return (from > 0 ? '…' : '') + text.slice(from, from + max) + (from + max < text.length ? '…' : '');
}

/** 質問に近い資料を最大 limit 件。同じページ・記事からは 2 件まで */
export function findSources(query: string, limit = 8, maxChars = 1400): Chunk[] {
  const qg = grams(expandQuery(query));
  if (!qg.length) return [];
  const scored = corpus()
    .map((c) => ({ c, s: scoreText(qg, c.title) * 2 + scoreText(qg, c.text) }))
    .filter((x) => x.s >= 0.45)
    .sort((a, b) => b.s - a.s);
  // 一番近い資料の半分に届かないものは、質問の一部の語に当たっただけなので外す
  const top = scored[0]?.s ?? 0;
  const near = scored.filter((x) => x.s >= top * 0.5);
  const per = new Map<string, number>();
  const out: Chunk[] = [];
  for (const { c } of near) {
    const n = per.get(c.group) ?? 0;
    if (n >= 2) continue;
    per.set(c.group, n + 1);
    out.push({ ...c, text: around(c.text, query, maxChars) });
    if (out.length >= limit) break;
  }
  return out;
}
