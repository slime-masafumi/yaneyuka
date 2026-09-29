/**
 * 一般ツールのメニュー定義（15ツール）。
 *
 * 左カラム（Sidebar の Ⅲ）と中央の GeneralTools が同じ並びを出す必要があるので、
 * id とラベルだけをここに置いて唯一の定義にする。ツール本体はここに import しない。
 *
 * id は GeneralTools の TabType と一致させること。
 */
import { createToolNav } from './toolNav';

export type GeneralToolId =
  | 'bookmark'
  | 'map'
  | 'olmt'
  | 'schedule'
  | 'memo'
  | 'sheet'
  | 'calc'
  | 'image-converter'
  | 'pdf-compressor'
  | 'temp-storage'
  | 'file-transfer'
  | 'unit-converter'
  | 'alarm'
  | 'construction-photos'
  | 'drawing-pdf';

export type GeneralToolEntry = { id: GeneralToolId; label: string };

/** 並びは左カラム（Sidebar の Ⅲ）と同じ考え方: 手元で完結 → 相手とやりとり → 建築に紐づく。 */
export const GENERAL_TOOL_MENU: GeneralToolEntry[] = [
  { id: 'memo', label: 'メモ' },
  { id: 'sheet', label: '表計算' },
  { id: 'calc', label: '関数電卓' },
  { id: 'unit-converter', label: '単位変換' },
  { id: 'bookmark', label: 'ブックマーク' },
  { id: 'image-converter', label: '画像変換' },
  { id: 'pdf-compressor', label: 'PDF圧縮' },
  { id: 'olmt', label: 'OnlineMeetingTool' },
  { id: 'schedule', label: 'スケジュール調整' },
  // 旧「一時ファイル」「ファイル転送」。名前が似ていて違いが伝わらなかったので目的で呼び分ける（id は URL に使うので変えない）
  { id: 'temp-storage', label: '端末間受け渡し' },
  { id: 'file-transfer', label: '図面送付' },
  { id: 'map', label: '地図' },
  { id: 'construction-photos', label: '工事写真' },
  { id: 'drawing-pdf', label: '図面PDF' },
  { id: 'alarm', label: '業務管理・アラーム' },
];

const nav = createToolNav<{ toolId: GeneralToolId }>('yaneyuka:general-tools-target');

export const requestGeneralTool = nav.request;
export const consumeGeneralTool = nav.consume;
export const onGeneralTool = nav.subscribe;
