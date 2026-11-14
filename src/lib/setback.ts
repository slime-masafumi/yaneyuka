/**
 * 斜線制限(設計ツール › 基本設計 › 斜線制限)。2026-11-14
 *
 * 建築基準法 第 56 条・別表第 3 の道路斜線・隣地斜線・北側斜線で、建物の各面で許される高さを出す。
 * 値は 2026-11-14 に e-Gov の建築基準法(2026-05-27 施行版)から写した。
 *
 *   道路斜線(56 条 1 項 1 号・2 項・3 項・4 項)
 *     起点 = 前面道路の反対側の境界線から後退距離 a だけ外側の線(2 項)
 *     許される高さ = 勾配 × 起点からの水平距離。起点から適用距離の範囲内だけにかかる
 *     1中高・2中高・1住・2住・準住で幅員 12m 以上: 起点から 1.25 ×(幅員 + 2a)以上離れた区域は勾配 1.5(3 項・4 項)
 *   隣地斜線(56 条 1 項 2 号)
 *     許される高さ = 立上り + 勾配 × 隣地境界線までの水平距離。立上りを超える部分は、その部分の後退距離を加える
 *   北側斜線(56 条 1 項 3 号)
 *     許される高さ = 立上り + 1.25 × 真北方向の水平距離(隣地境界線か、前面道路の反対側の境界線まで)
 */

export type ZoneId = '1lr' | '2lr' | 'den' | '1mh' | '2mh' | '1r' | '2r' | 'qr' | 'nc' | 'c' | 'qi' | 'i' | 'ie' | 'none';

type RoadTable = { slope: number; rows: { maxFar: number; dist: number }[] };

/** 別表第 3 の(ろ)容積率の限度(%)→(は)適用距離(m)。maxFar = その行の上限(%) */
const ROAD_A: RoadTable = { slope: 1.25, rows: [{ maxFar: 200, dist: 20 }, { maxFar: 300, dist: 25 }, { maxFar: 400, dist: 30 }, { maxFar: Infinity, dist: 35 }] };
const ROAD_B: RoadTable = {
  slope: 1.5,
  rows: [
    { maxFar: 400, dist: 20 },
    { maxFar: 600, dist: 25 },
    { maxFar: 800, dist: 30 },
    { maxFar: 1000, dist: 35 },
    { maxFar: 1100, dist: 40 },
    { maxFar: 1200, dist: 45 },
    { maxFar: Infinity, dist: 50 },
  ],
};
const ROAD_C: RoadTable = { slope: 1.5, rows: [{ maxFar: 200, dist: 20 }, { maxFar: 300, dist: 25 }, { maxFar: 400, dist: 30 }, { maxFar: Infinity, dist: 35 }] };
const ROAD_D: RoadTable = { slope: 1.25, rows: [{ maxFar: 200, dist: 20 }, { maxFar: 300, dist: 25 }, { maxFar: Infinity, dist: 30 }] };

export type Zone = {
  id: ZoneId;
  label: string;
  road: RoadTable;
  /** 別表第 3 の項 */
  roadItem: string;
  /** 隣地斜線 [立上り, 勾配]。null = かからない */
  neighbor: [number, number] | null;
  /** 北側斜線の立上り。null = かからない */
  north: number | null;
  /** 56 条 3 項(幅員 12m 以上で 1.5)の対象 */
  wide12: boolean;
  /** 別表第 3 備考 3(特定行政庁の指定で距離 −5m・勾配 1.5)の対象になりうる */
  note3: boolean;
};

export const ZONES: Zone[] = [
  { id: '1lr', label: '第一種低層住居専用地域', road: ROAD_A, roadItem: '一', neighbor: null, north: 5, wide12: false, note3: false },
  { id: '2lr', label: '第二種低層住居専用地域', road: ROAD_A, roadItem: '一', neighbor: null, north: 5, wide12: false, note3: false },
  { id: 'den', label: '田園住居地域', road: ROAD_A, roadItem: '一', neighbor: null, north: 5, wide12: false, note3: false },
  { id: '1mh', label: '第一種中高層住居専用地域', road: ROAD_A, roadItem: '一', neighbor: [20, 1.25], north: 10, wide12: true, note3: true },
  { id: '2mh', label: '第二種中高層住居専用地域', road: ROAD_A, roadItem: '一', neighbor: [20, 1.25], north: 10, wide12: true, note3: true },
  { id: '1r', label: '第一種住居地域', road: ROAD_A, roadItem: '一', neighbor: [20, 1.25], north: null, wide12: true, note3: true },
  { id: '2r', label: '第二種住居地域', road: ROAD_A, roadItem: '一', neighbor: [20, 1.25], north: null, wide12: true, note3: true },
  { id: 'qr', label: '準住居地域', road: ROAD_A, roadItem: '一', neighbor: [20, 1.25], north: null, wide12: true, note3: true },
  { id: 'nc', label: '近隣商業地域', road: ROAD_B, roadItem: '二', neighbor: [31, 2.5], north: null, wide12: false, note3: false },
  { id: 'c', label: '商業地域', road: ROAD_B, roadItem: '二', neighbor: [31, 2.5], north: null, wide12: false, note3: false },
  { id: 'qi', label: '準工業地域', road: ROAD_C, roadItem: '三', neighbor: [31, 2.5], north: null, wide12: false, note3: false },
  { id: 'i', label: '工業地域', road: ROAD_C, roadItem: '三', neighbor: [31, 2.5], north: null, wide12: false, note3: false },
  { id: 'ie', label: '工業専用地域', road: ROAD_C, roadItem: '三', neighbor: [31, 2.5], north: null, wide12: false, note3: false },
  { id: 'none', label: '用途地域の指定のない区域', road: ROAD_D, roadItem: '五', neighbor: [20, 1.25], north: null, wide12: false, note3: false },
];

export const zoneOf = (id: string) => ZONES.find((z) => z.id === id) ?? ZONES[0];

export type SetbackIn = {
  zone: ZoneId;
  far: number;
  /** 前面道路の幅員 W(m) */
  roadW: number;
  /** 道路境界線から建物までの最小距離 = 後退距離 a(m) */
  roadSet: number;
  /** 隣地境界線から建物までの距離(m) */
  sideSet: number;
  /** 北側の境界線(隣地境界線または前面道路の反対側の境界線)までの真北方向の距離(m) */
  northDist: number;
  /** 建物の高さ(m・任意) */
  height: number;
  /** 備考 3 の指定を受けた区域 */
  note3: boolean;
  /** 無指定区域の勾配(特定行政庁が定める)1.25 / 1.5 */
  noneSlope: 1.25 | 1.5;
  /** 1中高・2中高で日影規制の区域(北側斜線がかからない) */
  shadowZone: boolean;
};

export type RoadOut = { slope: number; dist: number; startToFace: number; limitAtFace: number | null; slope15From: number | null };

export function roadLimit(v: SetbackIn): RoadOut {
  const z = zoneOf(v.zone);
  let slope = z.id === 'none' ? v.noneSlope : z.road.slope;
  let dist = (z.road.rows.find((r) => v.far <= r.maxFar) ?? z.road.rows[z.road.rows.length - 1]).dist;
  if (z.note3 && v.note3 && slope === 1.25) {
    dist = dist === 25 ? 20 : dist === 30 ? 25 : dist === 35 ? 30 : dist;
    slope = 1.5;
  }
  const a = Math.max(0, v.roadSet);
  // 起点(反対側の境界線から a 外側)から建物の道路側の面までの水平距離 = 幅員 + 2a
  const startToFace = v.roadW + 2 * a;
  // 3 項・4 項: 幅員 12m 以上なら、起点から 1.25 ×(W + 2a)以上離れた区域は勾配 1.5(面より奥の部分にかかる)
  const slope15From = z.wide12 && v.roadW >= 12 && slope === 1.25 ? 1.25 * (v.roadW + 2 * a) : null;
  return { slope, dist, startToFace, limitAtFace: startToFace <= dist ? slope * startToFace : null, slope15From };
}

/** 道路斜線の制限線(起点からの水平距離 x → 高さ)。断面図に使う */
export function roadLine(v: SetbackIn, x: number): number | null {
  const r = roadLimit(v);
  if (x > r.dist) return null;
  return (r.slope15From !== null && x >= r.slope15From ? 1.5 : r.slope) * x;
}

export type SideOut = { rise: number; slope: number; limitAtFace: number } | null;

export function sideLimit(v: SetbackIn): SideOut {
  const z = zoneOf(v.zone);
  if (!z.neighbor) return null;
  const [rise, slope] = z.neighbor;
  const d = Math.max(0, v.sideSet);
  // 立上りを超える部分は、その部分から境界線までの距離(= d)を加える(後退の緩和)
  return { rise, slope, limitAtFace: rise + slope * (d + d) };
}

export type NorthOut = { rise: number; limitAtFace: number } | null;

export function northLimit(v: SetbackIn): NorthOut {
  const z = zoneOf(v.zone);
  if (z.north === null) return null;
  if ((z.id === '1mh' || z.id === '2mh') && v.shadowZone) return null;
  return { rise: z.north, limitAtFace: z.north + 1.25 * Math.max(0, v.northDist) };
}

export const m2 = (n: number) => (Number.isFinite(n) ? n.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—');
