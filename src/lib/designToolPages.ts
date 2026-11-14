/**
 * 設計ツールの単体ページ(/calc/{id}/)の一覧。2026-11-15
 * タイトル・説明は src/lib/designToolsMenu.ts(左カラムと設計ツール画面と同じ定義)から取る。
 * 単体ページを持たないもの: 物件カルテ(/karte/)・面積表(別ウィンドウ)・ガラス厚と構造フロー(専用ページが既にある)。
 */
import { DESIGN_TOOL_MENU } from './designToolsMenu';

const EXCLUDE = new Set(['property-card', 'area-table', 'glass-thickness', 'force-flow']);
/** 専用ページが既にあるもの(一覧ではそちらへ飛ばす) */
export const DEDICATED: Record<string, string> = { 'glass-thickness': '/calc/glass-thickness/', 'force-flow': '/calc/force-flow/', 'property-card': '/karte/' };

/** 計算書型(自分で見出しを出す)。単体ページでは見出しを重ねない */
export const SHEET_IDS = new Set(['condensation', 'vent-24h']);

/** 根拠・出典の 1 行(検索結果と本文に出す)。無いものは分野の説明だけ */
const BASIS: Record<string, string> = {
  'shadow-regulation': '建築基準法 第 56 条の 2・別表第 4。冬至日の真太陽時で日影時間を数える',
  'setback-regulation': '建築基準法 第 56 条・別表第 3。道路斜線・隣地斜線・北側斜線と後退距離の緩和',
  'load-calc': '建築基準法施行令 第 84 条(固定荷重)・第 85 条(積載荷重)・第 86 条(積雪荷重)',
  'slope-calc': 'バリアフリー法施行令 第 19 条・駐車場法施行令 第 8 条・SHASE-S206',
  illumination: '光束法。推奨照度は JIS Z 9110',
  'trunk-size': '電気設備の技術基準の解釈 第 146 条・JCS 0168-2。許容電流と電圧降下',
  'elec-capacity': '内線規程 3605 節の標準負荷と受電の区分',
  plumbing: '器具給水負荷単位・同時使用流量、SHASE-S206 の器具排水負荷単位と管径',
  condensation: '定常計算による内部結露の判定(グレーザー法)',
  'vent-24h': '建築基準法施行令 第 20 条の 8(シックハウス対策の 24 時間換気)',
  pavement: '舗装設計便覧の TA 法',
};

export type ToolPage = { id: string; title: string; label: string; description: string; category: string; categoryId: string; basis?: string };

export const TOOL_PAGES: ToolPage[] = DESIGN_TOOL_MENU.flatMap((c) =>
  c.subTabs
    .filter((t) => !EXCLUDE.has(t.id))
    .map((t) => ({ id: t.id, title: t.title || t.label, label: t.label, description: t.description, category: c.label, categoryId: c.id, basis: BASIS[t.id] }))
);

export const toolPage = (id: string) => TOOL_PAGES.find((t) => t.id === id);

/** 一覧・左カラムから単体ページへのリンク先 */
export const toolHref = (id: string) => DEDICATED[id] ?? (TOOL_PAGES.some((t) => t.id === id) ? `/calc/${id}/` : null);
