/**
 * 設計ツールの結果を「案件」に控える仕組み(モック「高級感 3」の 案件に保存 / 済)。
 *
 * 案件そのものは物件カルテ(src/lib/karte、localStorage 'yaneyuka.karte')が持つ。
 * ここは「どの案件で、どのツールを、どんな結果で使ったか」だけを端末に残す。
 * 案件の置き場を 1 つにまとめる作業(改善点 7)が済んだら、カルテの Study に寄せる。
 */
import { Store } from './karte/engine';

/** v: 保存したときのツールの算定式の版(TOOL_VERSION)。無ければ 1 */
export type CaseStudy = { tool: string; result: string; ok?: boolean; at: string; v?: number };
export type CaseInfo = { id: string; name: string; sub: string };

const KEY = 'yy-case-studies';
const MODE_KEY = 'yy-case-mode';
export const CASE_EVENT = 'yy:case-changed';

const read = (): Record<string, CaseStudy[]> => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, CaseStudy[]>;
  } catch {
    return {};
  }
};

/** カルテの案件の一覧と、いま選ばれている案件の id */
export function loadCases(): { cases: CaseInfo[]; current: string | null } {
  const db = Store.load();
  if (!db) return { cases: [], current: null };
  return {
    cases: db.projects.map((p) => ({ id: p.id, name: p.name, sub: [p.addr, p.H ? `高さ ${p.H} m` : ''].filter(Boolean).join(' · ') })),
    current: db.current,
  };
}

/** カルテの「いまの案件」を切り替える(カルテ側の保存形式のまま書く) */
export function selectCase(id: string) {
  const db = Store.load();
  if (!db || !db.projects.some((p) => p.id === id)) return;
  Store.save({ ...db, current: id });
  window.dispatchEvent(new Event(CASE_EVENT));
}

export function getMode(): 'case' | 'free' {
  try {
    return localStorage.getItem(MODE_KEY) === 'case' ? 'case' : 'free';
  } catch {
    return 'free';
  }
}

export function setMode(m: 'case' | 'free') {
  try {
    localStorage.setItem(MODE_KEY, m);
  } catch {}
  window.dispatchEvent(new Event(CASE_EVENT));
}

export function studiesOf(caseId: string): CaseStudy[] {
  return read()[caseId] || [];
}

/**
 * ツールの算定式の版。式や基準値を直したら上げる。保存した結果の版がこれより古ければ「要再計算」と出す。
 * 2026-11-16: ガラス(二辺支持の係数・エッジの許容応力・強化・合わせガラス)と結露(合板・OSB・サイディングの透湿比抵抗)を直した
 */
export const TOOL_VERSION: Record<string, number> = {
  'glass-thickness': 2,
  condensation: 2,
};

/** 保存した後に算定式を直したツールの結果か */
export function isStudyStale(s: CaseStudy): boolean {
  const v = TOOL_VERSION[s.tool];
  return !!v && (s.v ?? 1) < v;
}

/** 同じツールの結果は上書き(最新だけ持つ) */
export function saveStudy(caseId: string, s: Omit<CaseStudy, 'at' | 'v'>) {
  const all = read();
  const list = (all[caseId] || []).filter((x) => x.tool !== s.tool);
  const v = TOOL_VERSION[s.tool];
  list.unshift({ ...s, at: new Date().toISOString(), ...(v ? { v } : {}) });
  all[caseId] = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
  window.dispatchEvent(new Event(CASE_EVENT));
}

/** 案件なしで使ったツールの履歴(この端末)。設計ツール一覧の「最近使ったツール」 */
const RECENT_KEY = 'yy-recent-tools';
export type RecentTool = { tool: string; result?: string; at: string };

export function recentTools(): RecentTool[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as RecentTool[];
  } catch {
    return [];
  }
}

export function touchRecent(tool: string, result?: string) {
  const list = recentTools().filter((r) => r.tool !== tool);
  list.unshift({ tool, result, at: new Date().toISOString() });
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)));
  } catch {}
}

/** 「今」「昨日」「3 日前」「11/10」 */
export function ago(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 86400000;
  if (diff < 1 && new Date().getDate() === d.getDate()) return '今日';
  if (diff < 2) return '昨日';
  if (diff < 7) return `${Math.floor(diff)} 日前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
