/**
 * 上部の帯の検索窓が引く索引。サイトに既にある定義だけから作る(新しい台帳は持たない)。
 *   - 情報ページ・建材 16 分類 ……… siteScreens.ts
 *   - 建材の小分類 ……………………… materialCategories.ts
 *   - 一般ツール・設計ツール …………… generalToolsMenu.ts / designToolsMenu.ts
 *   - 建築の調べもの 2,016 項目 ……… lookup.ts(items.json 約 270KB)
 *
 * 調べものの JSON が重いので、このファイルは検索窓を開いたときに import() で読む。
 * 上部の帯から静的に import しないこと(全ページの配信が重くなる)。
 */
import { ROUTED_SCREENS, screenPath } from './siteScreens';
import { CATEGORY_SUBCATEGORIES, subcategoryLabel } from './materialCategories';
import { GENERAL_TOOL_MENU } from './generalToolsMenu';
import { DESIGN_TOOL_MENU } from './designToolsMenu';
import { LOOKUP_CATEGORIES } from './lookup';
import type { UserpageTarget } from './userpageUrl';

export type SearchEntry = {
  label: string;
  /** 右に小さく出す補足(分類名・根拠条文など) */
  sub: string;
  /** 結果の見出し */
  group: '情報' | '建材' | '一般ツール' | '設計ツール' | '調べもの';
  /** URL で開くもの */
  href?: string;
  /** 左カラムから開く画面(URL ではなく MainLayout の handleMenuClick で開く) */
  target?: UserpageTarget;
  /** 照合用(正規化済み) */
  key: string;
};

/** 全角英数→半角、カタカナ→ひらがな、大文字→小文字 */
export const normalize = (s: string) =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

const STANDALONE_TOOLS: Array<[string, string]> = [
  ['my-calendar', 'Myカレンダー'],
  ['my-tasks', 'Myタスク'],
  ['team-tasks', 'Teamタスク'],
  ['my-regulations', 'My法規'],
  ['yymail', 'yymail'],
  ['yychat', 'yychat'],
  ['contacts', '担当連絡先'],
  ['design-info', '設計情報'],
  ['material-info', '材料情報'],
];

const entry = (e: Omit<SearchEntry, 'key'>): SearchEntry => ({ ...e, key: normalize(`${e.label} ${e.sub}`) });

let cache: SearchEntry[] | null = null;

export function siteIndex(): SearchEntry[] {
  if (cache) return cache;
  const out: SearchEntry[] = [];
  const materialLabel: Record<string, string> = {};

  for (const s of ROUTED_SCREENS) {
    if (s.group === 'info') out.push(entry({ label: s.label, sub: '情報', group: '情報', href: screenPath(s.id) }));
    else {
      materialLabel[s.id] = s.label;
      out.push(entry({ label: s.label, sub: '建材', group: '建材', href: screenPath(s.id) }));
    }
  }
  for (const [cat, subs] of Object.entries(CATEGORY_SUBCATEGORIES)) {
    for (const id of subs) {
      out.push(entry({
        label: subcategoryLabel(id),
        sub: materialLabel[cat] ?? '',
        group: '建材',
        href: `${screenPath(cat)}/?subcategory=${encodeURIComponent(id)}`,
      }));
    }
  }
  for (const [menu, label] of STANDALONE_TOOLS) {
    out.push(entry({ label, sub: '一般ツール', group: '一般ツール', target: { menu } }));
  }
  for (const t of GENERAL_TOOL_MENU) {
    out.push(entry({ label: t.label, sub: '一般ツール', group: '一般ツール', target: { menu: 'general-tools', tool: t.id } }));
  }
  for (const c of DESIGN_TOOL_MENU) {
    for (const t of c.subTabs) {
      out.push(entry({
        label: t.label,
        sub: `${c.label}${t.title && t.title !== t.label ? ` · ${t.title}` : ''}`,
        group: '設計ツール',
        target: { menu: 'design-tools', category: c.id, sub: t.id },
      }));
    }
  }
  out.push(entry({ label: '建築の調べもの', sub: '索引', group: '調べもの', href: '/lookup/' }));
  for (const c of LOOKUP_CATEGORIES) {
    for (const s of c.sections) {
      for (const it of s.items) {
        out.push(entry({ label: it.title, sub: `${c.short} · ${it.basis}`, group: '調べもの', href: `/lookup/${c.slug}/#${it.id}` }));
      }
    }
  }
  cache = out;
  return out;
}

/** 空白で区切った語をすべて含むものを、名前の頭で当たる → 名前に当たる → 補足に当たる の順に返す */
export function searchSite(query: string, limit = 14): SearchEntry[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored: Array<[number, number, SearchEntry]> = [];
  siteIndex().forEach((e, i) => {
    if (!words.every((w) => e.key.includes(w))) return;
    const label = normalize(e.label);
    const head = words[0];
    const score = label.startsWith(head) ? 0 : label.includes(head) ? 1 : 2;
    scored.push([score, i, e]);
  });
  scored.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return scored.slice(0, limit).map((s) => s[2]);
}
