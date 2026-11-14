/**
 * 勾配計算(設計ツール › 外構設計 › 勾配計算)。2026-11-14
 *
 * 勾配 i = 高低差 H ÷ 水平距離 L。表し方を % / 1:n / 角度 / 寸勾配(水平 10 に対する立ち上がり)でそろえて出す。
 * 基準は「上限(これより急にしない)」と「下限(これより緩くしない=水が流れる)」の 2 種類。
 */

export type SlopeForm = 'pct' | 'ratio' | 'deg' | 'sun';

export const FORM_LABEL: Record<SlopeForm, string> = {
  pct: '%',
  ratio: '1 : n',
  deg: '角度(°)',
  sun: '寸勾配',
};

/** 入力の表し方 → 勾配(比 i = H/L) */
export function toRatio(form: SlopeForm, v: number): number {
  if (!(v > 0)) return NaN;
  switch (form) {
    case 'pct':
      return v / 100;
    case 'ratio':
      return 1 / v;
    case 'deg':
      return v < 90 ? Math.tan((v * Math.PI) / 180) : NaN;
    case 'sun':
      return v / 10;
  }
}

export type SlopeView = { i: number; pct: number; n: number; deg: number; sun: number };

export function viewOf(i: number): SlopeView {
  return { i, pct: i * 100, n: 1 / i, deg: (Math.atan(i) * 180) / Math.PI, sun: i * 10 };
}

/**
 * 基準。kind = 'max' はこれより急にしない、'min' はこれより緩くしない。
 * 傾斜路・車路の値は 2026-11-14 に e-Gov の条文で確かめた。誘導基準と水勾配は基準書・慣用の目安。
 */
export type SlopeStd = {
  id: string;
  label: string;
  kind: 'max' | 'min';
  /** 比 i。高低差で変わるものは limit を使う */
  i: number;
  /** 高低差 H(mm)で上限が変わるとき(例: 16cm 以下は 1/8) */
  limit?: (hMm: number) => number;
  show: string;
  source: string;
};

export const STANDARDS: SlopeStd[] = [
  {
    id: 'ramp',
    label: '傾斜路(移動等円滑化経路・敷地内通路)',
    kind: 'max',
    i: 1 / 12,
    limit: (h) => (h > 0 && h <= 160 ? 1 / 8 : 1 / 12),
    show: '1/12 以下(高さ 16cm 以下は 1/8 以下)',
    source: 'バリアフリー法施行令 第 19 条第 2 項第 4 号ロ(建物内)・第 7 号ニ(2)(敷地内通路)',
  },
  {
    id: 'ramp-out',
    label: '傾斜路(屋外・誘導基準)',
    kind: 'max',
    i: 1 / 15,
    show: '1/15 以下',
    source: '建築物移動等円滑化誘導基準(国交省令)',
  },
  {
    id: 'ramp-in',
    label: '傾斜路(屋内・誘導基準)',
    kind: 'max',
    i: 1 / 12,
    show: '1/12 以下',
    source: '建築物移動等円滑化誘導基準(国交省令)',
  },
  {
    id: 'car',
    label: '駐車場の車路の傾斜部(建築物である路外駐車場)',
    kind: 'max',
    i: 0.17,
    show: '17% 以下',
    source: '駐車場法施行令 第 8 条第 3 号ハ(路面は粗面か滑りにくい材料・同号ニ)',
  },
  {
    id: 'pave',
    label: '舗装面の水勾配(目安)',
    kind: 'min',
    i: 0.01,
    show: '1% 以上(1.5〜2% が一般的)',
    source: '一般的な設計の目安(アスファルト舗装 1.5〜2%・インターロッキング 1〜2%)',
  },
];

/** 屋外の排水管(横管)の最小勾配。管径 mm → 比 */
export const DRAIN_MIN: { d: number; i: number; show: string }[] = [
  { d: 65, i: 1 / 50, show: '1/50' },
  { d: 75, i: 1 / 100, show: '1/100' },
  { d: 100, i: 1 / 100, show: '1/100' },
  { d: 125, i: 1 / 150, show: '1/150' },
  { d: 150, i: 1 / 200, show: '1/200' },
];
export const DRAIN_SOURCE = 'SHASE-S206 給排水衛生設備規準 の排水横管の最小勾配(管径 65 以下 1/50・75〜100 1/100・125 1/150・150 以上 1/200)';

export type SlopeCheck = { ok: boolean; limit: number; text: string };

export function check(std: SlopeStd, i: number, hMm: number): SlopeCheck {
  const limit = std.limit ? std.limit(hMm) : std.i;
  const ok = std.kind === 'max' ? i <= limit + 1e-9 : i >= limit - 1e-9;
  const lv = viewOf(limit);
  const lim = `1/${fmt(lv.n, 0)}(${fmt(lv.pct, 1)}%)`;
  return {
    ok,
    limit,
    text: std.kind === 'max' ? `上限 ${lim}。${ok ? '収まっています' : 'これより急です'}` : `下限 ${lim}。${ok ? '水が流れる勾配です' : '緩すぎます'}`,
  };
}

/** 上限に収めるのに要る水平距離(m)。高低差 mm から */
export function needLength(limit: number, hMm: number): number {
  return hMm / 1000 / limit;
}

export function fmt(v: number, d = 2): string {
  if (!Number.isFinite(v)) return '—';
  return v.toLocaleString('ja-JP', { minimumFractionDigits: d, maximumFractionDigits: d });
}
