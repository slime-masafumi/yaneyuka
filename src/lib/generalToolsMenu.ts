/**
 * 一般ツールのメニュー定義（14ツール）。
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
  | 'construction-photos';

export type GeneralToolEntry = { id: GeneralToolId; label: string };

/** 並びは従来のタブ行と同じ。 */
export const GENERAL_TOOL_MENU: GeneralToolEntry[] = [
  { id: 'bookmark', label: 'ブックマーク' },
  { id: 'map', label: '地図' },
  { id: 'olmt', label: 'OLMT' },
  { id: 'schedule', label: 'スケ調' },
  { id: 'memo', label: 'メモ' },
  { id: 'sheet', label: '表計算' },
  { id: 'calc', label: '関数電卓' },
  { id: 'image-converter', label: '画像変換' },
  { id: 'construction-photos', label: '工事写真' },
  { id: 'pdf-compressor', label: 'PDF圧縮' },
  { id: 'temp-storage', label: '一時ファイル' },
  { id: 'file-transfer', label: 'ファイル転送' },
  { id: 'unit-converter', label: '単位変換' },
  { id: 'alarm', label: '業務管理・アラーム' },
];

const nav = createToolNav<{ toolId: GeneralToolId }>('yaneyuka:general-tools-target');

export const requestGeneralTool = nav.request;
export const consumeGeneralTool = nav.consume;
export const onGeneralTool = nav.subscribe;
