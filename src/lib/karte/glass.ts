/**
 * ガラス厚・設計風圧力・縦樋の計算。
 * /calc/glass-thickness/ と /karte/ の両方が使う純粋関数。
 *
 * 確度: 共有/カルテ機能/yaneyuka_実装指示書.md §5 を参照。
 *  - 固い: 許容耐力 P = 300·k₁·k₂/A × (t + t²/4) と k₁/k₂（H12建告1458）
 *          速度圧 q = 0.6·Er²·V₀²、Er の粗度別パラメータ（H12建告1454）
 *  - 目安: ピーク風力係数（正圧 0.8kz+0.5、負圧 一般部 1.0／隅角部 1.6）、
 *          縦樋の許容屋根面積表（SHASE-S206 原典で要確認）
 */

export type GlassKind =
  | 'float'
  | 'tempered'
  | 'heat2'
  | 'figured'
  | 'wire-polish'
  | 'wire-figured'
  | 'polish'
  | 'sheet'
  | 'baked';

export type GlassComp = 'single' | 'laminated' | 'double';
export type WallPart = 'general' | 'corner';
export type Roughness = '1' | '2' | '3' | '4';

export const KIND_LABEL: Record<GlassKind, string> = {
  float: 'フロート板ガラス',
  tempered: '強化ガラス',
  heat2: '倍強度ガラス',
  figured: '型板ガラス',
  'wire-polish': '網入・線入磨き板ガラス',
  'wire-figured': '網入・線入型板ガラス',
  polish: '磨き板ガラス',
  sheet: '普通板ガラス',
  baked: '色焼付ガラス',
};

/** 画面のプルダウン順 */
export const KIND_ORDER: GlassKind[] = [
  'float',
  'tempered',
  'heat2',
  'figured',
  'wire-polish',
  'wire-figured',
  'polish',
  'sheet',
  'baked',
];

export const COMP_LABEL: Record<GlassComp, string> = {
  single: '単板',
  laminated: '合わせ',
  double: '複層',
};

/** k₁: ガラスの種類別係数（H12建告1458 第1 第二号の表） */
export const K1: Record<GlassKind, (t: number) => number> = {
  sheet: () => 1.0,
  polish: () => 0.8,
  float: (t) => (t <= 8 ? 1.0 : t <= 12 ? 0.9 : t <= 20 ? 0.8 : 0.75),
  heat2: () => 2.0,
  tempered: () => 3.5,
  'wire-polish': () => 0.8,
  'wire-figured': () => 0.6,
  figured: () => 0.6,
  baked: () => 2.0,
};

/** 種類ごとの流通板厚 mm */
export const THICK: Record<GlassKind, number[]> = {
  sheet: [2, 3, 4, 5, 6],
  polish: [5, 6, 8, 10, 12, 15, 19],
  float: [3, 4, 5, 6, 8, 10, 12, 15, 19],
  heat2: [4, 5, 6, 8, 10, 12],
  tempered: [4, 5, 6, 8, 10, 12, 15, 19],
  'wire-polish': [6.8, 10],
  'wire-figured': [6.8],
  figured: [2, 4, 6],
  baked: [4, 5, 6, 8],
};

/** 粗度区分: [Zb, ZG, α]（H12建告1454） */
export const ROUGH: Record<Roughness, [number, number, number]> = {
  '1': [5, 250, 0.1],
  '2': [5, 350, 0.15],
  '3': [5, 450, 0.2],
  '4': [10, 550, 0.27],
};
export const ROUGH_LABEL: Record<Roughness, string> = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV' };
export const ROUGH_DESC: Record<Roughness, string> = {
  '1': 'I（海岸など）',
  '2': 'II（田園・散在）',
  '3': 'III（樹木・低層市街地）',
  '4': 'IV（中高層市街地）',
};

/** k₂: 構成別係数。複層は当該板 t について計算する */
export function k2For(comp: GlassComp, t: number, tOther: number): number {
  if (comp === 'single') return 1.0;
  if (comp === 'laminated') return 0.75;
  return 0.75 * (1 + Math.pow(tOther / t, 3));
}

/**
 * 許容耐力 P（N/m²）。A は見付面積 m²。
 * 複層は 2 枚それぞれを検討し、小さい方（不利側）を返す。
 */
export function glassCapacity(kind: GlassKind, comp: GlassComp, t: number, tOther: number, A: number): number {
  if (!(A > 0) || !(t > 0)) return NaN;
  const one = (tt: number, oo: number) => (300 * K1[kind](tt) * k2For(comp, tt, oo)) / A * (tt + (tt * tt) / 4);
  if (comp !== 'double') return one(t, tOther);
  if (!(tOther > 0)) return NaN;
  return Math.min(one(t, tOther), one(tOther, t));
}

export type WindInput = {
  /** 基準風速 m/s */
  v0: number;
  rough: Roughness;
  /** 建築物の基準高さ H m */
  H: number;
  /** 当該部分の高さ Z m */
  Z: number;
  part: WallPart;
};

export type WindResult = {
  /** 設計風圧力 N/m² */
  W: number;
  /** 平均速度圧 N/m² */
  q: number;
  Er: number;
  kz: number;
  cPos: number;
  cNeg: number;
  /** 採用したピーク風力係数（不利側） */
  c: number;
};

/**
 * 外装材用の簡易風圧力 W = q × Ĉf、q = 0.6·Er²·V₀²。
 * ピーク風力係数は閉鎖型建築物の壁面を前提にした参考値（目安）。
 */
export function estimateWind(input: WindInput): WindResult {
  const [Zb, ZG, al] = ROUGH[input.rough] ?? ROUGH['3'];
  const H = +input.H || 0;
  const v0 = +input.v0 || 0;
  const Z = +input.Z || 0;
  const Er = H <= Zb ? 1.7 * Math.pow(Zb / ZG, al) : 1.7 * Math.pow(H / ZG, al);
  const q = 0.6 * Er * Er * v0 * v0;
  const kz = H <= Zb ? 1.0 : Math.pow(Math.max(Z, Zb) / H, 2 * al);
  const cPos = 0.8 * kz + 0.5; // 正圧: 外圧 0.8kz − 内圧(−0.5)
  const cNeg = input.part === 'corner' ? -1.6 : -1.0; // 負圧: 外圧 − 内圧 0
  const c = Math.max(cPos, Math.abs(cNeg));
  return { W: q * c, q, Er, kz, cPos, cNeg, c };
}

/** 降雨強度 100mm/h における雨水立て管の許容最大屋根面積 [呼び径 mm, m²]（SHASE-S206。目安） */
export const PIPE: Array<[number, number]> = [
  [50, 67],
  [65, 135],
  [75, 197],
  [100, 425],
  [125, 770],
  [150, 1250],
  [200, 2700],
];

/** 降雨強度 rain mm/h に換算した許容屋根面積 */
export function pipeRows(rain: number): Array<{ k: number; v: number }> {
  const r = +rain > 0 ? +rain : 100;
  return PIPE.map(([d, a]) => ({ k: d, v: (a * 100) / r }));
}

/** ラダー共通: 候補列から要求値を初めて満たす行を返す */
export function pickFirst<T extends { v: number }>(rows: T[], threshold: number): T | undefined {
  return rows.find((r) => r.v >= threshold);
}

export const fmtInt = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString('ja-JP') : '—');
