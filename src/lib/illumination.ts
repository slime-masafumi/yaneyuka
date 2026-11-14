/**
 * 照度計算(設計ツール › 電気設備 › 照度計算)。光束法。2026-11-14
 *
 *   平均照度 E = N × F × U × M ÷ A
 *   必要台数 N = E × A ÷(F × U × M)
 *   室指数 K = X × Y ÷(H ×(X + Y))  H = 器具の取付高さ − 作業面の高さ
 *
 * U(照明率)は器具ごとの照明率表から室指数 K と反射率で読む。M(保守率)は器具・環境・清掃間隔で決まる。
 */

/** 推奨照度(維持照度 Em, lx)。JIS Z 9110:2010 の照明設計基準から、よく使う行 */
export type LuxRow = { id: string; group: string; label: string; lx: number };

export const LUX: LuxRow[] = [
  { id: 'office', group: '事務所', label: '事務室', lx: 750 },
  { id: 'drafting', group: '事務所', label: '設計室・製図室', lx: 750 },
  { id: 'exec', group: '事務所', label: '役員室', lx: 750 },
  { id: 'computer', group: '事務所', label: '電子計算機室', lx: 500 },
  { id: 'control', group: '事務所', label: '集中監視室・制御室', lx: 500 },
  { id: 'meeting', group: '事務所', label: '会議室・集会室', lx: 500 },
  { id: 'reception-room', group: '事務所', label: '応接室', lx: 500 },
  { id: 'reception', group: '事務所', label: '受付', lx: 300 },
  { id: 'canteen', group: '事務所', label: '食堂', lx: 300 },
  { id: 'pantry', group: '事務所', label: '喫茶室・湯沸室', lx: 200 },
  { id: 'rest', group: '事務所', label: '休憩室', lx: 100 },
  { id: 'library', group: '事務所', label: '書庫', lx: 200 },
  { id: 'storage', group: '事務所', label: '倉庫(常時使用なら 200)', lx: 100 },
  { id: 'locker', group: '事務所', label: '更衣室', lx: 200 },
  { id: 'powder', group: '事務所', label: '化粧室', lx: 300 },
  { id: 'toilet', group: '事務所', label: '便所・洗面所', lx: 200 },
  { id: 'machine', group: '事務所', label: '電気室・機械室', lx: 200 },
  { id: 'stairs', group: '事務所', label: '階段', lx: 150 },
  { id: 'corridor', group: '事務所', label: '廊下・エレベータ', lx: 100 },
  { id: 'ev-hall', group: '事務所', label: 'エレベータホール', lx: 300 },
  { id: 'entrance-day', group: '事務所', label: '玄関ホール(昼)', lx: 750 },
  { id: 'entrance-night', group: '事務所', label: '玄関ホール(夜)', lx: 100 },
  { id: 'classroom', group: '学校', label: '教室', lx: 300 },
  { id: 'school-drafting', group: '学校', label: '製図室', lx: 750 },
  { id: 'lab', group: '学校', label: '実験実習室・図書閲覧室・電子計算機室', lx: 500 },
  { id: 'gym', group: '学校', label: '体育館', lx: 300 },
  { id: 'auditorium', group: '学校', label: '講堂', lx: 200 },
  { id: 'staff', group: '学校', label: '教職員室・事務室', lx: 300 },
  { id: 'school-meeting', group: '学校', label: '会議室', lx: 500 },
  { id: 'kitchen-school', group: '学校', label: '厨房', lx: 500 },
  { id: 'living', group: '住宅', label: '居間 全般', lx: 50 },
  { id: 'living-group', group: '住宅', label: '居間 団らん・娯楽', lx: 200 },
  { id: 'living-read', group: '住宅', label: '居間 読書', lx: 500 },
  { id: 'study', group: '住宅', label: '書斎・子供室 勉強・読書', lx: 750 },
  { id: 'dining-table', group: '住宅', label: '食堂 食卓', lx: 300 },
  { id: 'kitchen-top', group: '住宅', label: '台所 調理台・流し台', lx: 300 },
  { id: 'kitchen', group: '住宅', label: '台所 全般', lx: 100 },
  { id: 'bedroom', group: '住宅', label: '寝室 全般', lx: 20 },
  { id: 'bath', group: '住宅', label: '浴室・脱衣室 全般', lx: 100 },
  { id: 'house-toilet', group: '住宅', label: '便所 全般', lx: 75 },
  { id: 'house-hall', group: '住宅', label: '階段・廊下 全般', lx: 50 },
  { id: 'house-entrance', group: '住宅', label: '玄関(内側) 全般', lx: 100 },
];

export const LUX_SOURCE = 'JIS Z 9110:2010(2011 追補)の照明設計基準(維持照度 Em)。事務所 表 9・学校 表 11・住宅 表 17。屋内照明の要件は 2024 年の改正で JIS Z 9125:2023 に移っています';

export type IllumIn = { x: number; y: number; mount: number; work: number; target: number; lm: number; u: number; m: number; n: number };

export type IllumOut = {
  area: number;
  h: number;
  k: number;
  need: number;
  e: number | null;
  grid: { rows: number; cols: number; sx: number; sy: number } | null;
};

export function illum(v: IllumIn): IllumOut | null {
  const A = v.x * v.y;
  const h = v.mount - v.work;
  if (!(A > 0) || !(v.lm > 0) || !(v.u > 0) || !(v.m > 0)) return null;
  const k = h > 0 ? A / (h * (v.x + v.y)) : NaN;
  const need = v.target > 0 ? Math.ceil((v.target * A) / (v.lm * v.u * v.m)) : 0;
  const n = v.n > 0 ? v.n : need;
  const e = n > 0 ? (n * v.lm * v.u * v.m) / A : null;
  return { area: A, h, k, need, e, grid: n > 0 ? layout(n, v.x, v.y) : null };
}

/** 台数を、部屋の縦横比に近い行 × 列に並べる(行列が台数以上になる最小の組)。間隔は壁際を半分とした等間隔 */
export function layout(n: number, x: number, y: number): { rows: number; cols: number; sx: number; sy: number } {
  let best = { rows: 1, cols: n, score: Infinity };
  for (let rows = 1; rows <= n; rows++) {
    const cols = Math.ceil(n / rows);
    const sx = x / cols;
    const sy = y / rows;
    const score = Math.abs(Math.log(sx / sy)) + (rows * cols - n) * 0.15;
    if (score < best.score) best = { rows, cols, score };
  }
  return { rows: best.rows, cols: best.cols, sx: x / best.cols, sy: y / best.rows };
}
