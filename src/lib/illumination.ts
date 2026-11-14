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
  { id: 'meeting', group: '事務所', label: '会議室・集会室', lx: 500 },
  { id: 'reception-room', group: '事務所', label: '応接室', lx: 500 },
  { id: 'reception', group: '事務所', label: '受付', lx: 300 },
  { id: 'canteen', group: '事務所', label: '食堂', lx: 300 },
  { id: 'toilet', group: '事務所', label: '便所・洗面所', lx: 200 },
  { id: 'locker', group: '事務所', label: '更衣室', lx: 200 },
  { id: 'stairs', group: '事務所', label: '階段', lx: 150 },
  { id: 'corridor', group: '事務所', label: '廊下', lx: 100 },
  { id: 'storage', group: '事務所', label: '倉庫', lx: 100 },
  { id: 'machine', group: '事務所', label: '電気室・機械室', lx: 200 },
  { id: 'classroom', group: '学校', label: '教室', lx: 300 },
  { id: 'school-drafting', group: '学校', label: '製図室', lx: 750 },
];

export const LUX_SOURCE = 'JIS Z 9110:2010 照明基準総則 の推奨照度(維持照度)';

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
