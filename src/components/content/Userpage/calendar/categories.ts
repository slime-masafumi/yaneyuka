/**
 * Myカレンダーの種別（カテゴリ）と色。
 *
 * 色はくすませた中間の濃さに揃える。予定の帯は色の上に白い文字を載せるので、
 * 明るすぎると読めず、原色だと画面がうるさい（差し色 #52AA96 を光として
 * 使う決まりなので、予定の色はそれより沈める）。
 */

/** 種別を新しく作るときの色の候補 */
export const COLOR_PALETTE = [
  '#3B3B3B', // 墨
  '#4F6D8A', // 鉄紺
  '#5E7F63', // 苔
  '#A07C3A', // 黄土
  '#9A5040', // 煉瓦
  '#6C5A7C', // 藤鼠
  '#5B6B73', // 鋼
  '#7C7F3E', // 鶯
  '#A0616A', // 小豆
  '#8A8378', // 石
  '#3F6E6A', // 青磁（差し色とは別の、沈んだ青緑）
];

/**
 * 建築の仕事でよく使う予定の種別。予定の入力欄から直接選べ、初めて使ったときに作る。
 * 名前は変えない（既に作った人のデータと、期限通知の関数が名前で見ている）。
 */
export const BUILDING_CATEGORIES = [
  { name: '現場定例', color: '#4F6D8A' },
  { name: '施主打合せ', color: '#5E7F63' },
  { name: '申請・検査', color: '#9A5040' },
  { name: '中間検査', color: '#A07C3A' },
  { name: '完了検査', color: '#6E3B3B' },
  { name: '資格試験', color: '#6C5A7C' },
];

/**
 * 期限の種別。ここに入る予定は、入力欄の「前日と当日に通知」を最初から入れておく
 * （functions/src/notifications.ts の DEADLINE_CATEGORIES と同じ並び）。
 */
export const DEADLINE_CATEGORY_NAMES = ['申請・検査', '中間検査', '完了検査', '資格試験'];

/** 新しく使い始めた人に最初に作る種別 */
export const DEFAULT_CATEGORIES = [
  { name: '会議', color: '#4F6D8A' },
  { name: '作業', color: '#5E7F63' },
  { name: '締切', color: '#9A5040' },
];
