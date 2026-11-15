/**
 * 斜線制限(設計ツール › 基本設計 › 斜線制限)。2026-11-14
 *
 * 建築基準法 第 55 条・第 56 条・別表第 3 と施行令 134 条・135 条の 2〜4 で、建物の各面で許される高さを出す。
 * 値は e-Gov の建築基準法・施行令の現行本文から写した(2026-11-16 に再照合)。
 *
 *   道路斜線(56 条 1 項 1 号・2 項・3 項・4 項)
 *     起点 = 前面道路の反対側の境界線から後退距離 a だけ外側の線(2 項)
 *     許される高さ = 勾配 × 起点からの水平距離。起点から適用距離の範囲内だけにかかる
 *     適用距離は「52 条 1・2・7・9 項による容積率の限度」で決まる(別表第 3(ろ)欄)= 前面道路の幅員で下げた後の値
 *     1中高・2中高・1住・2住・準住で幅員 12m 以上: 起点から 1.25 ×(幅員 + 2a)以上離れた区域は勾配 1.5(3 項・4 項)
 *     別表第 3 備考 3: 1中高・2中高(都市計画の容積率 400% 以上の地域に限る)・1住・2住・準住で特定行政庁が指定 → 距離 −5m・勾配 1.5
 *     前面道路の反対側に公園・広場・水面等 → 反対側の境界線はその反対側にあるとみなす(令 134 条 1 項)
 *     敷地の地盤面が前面道路より 1m 以上高い → 道路は(高低差 − 1)/ 2 高いとみなす(令 135 条の 2)
 *   隣地斜線(56 条 1 項 2 号)
 *     許される高さ = 立上り + 勾配 × 隣地境界線までの水平距離。立上りを超える部分は、その部分の後退距離を加える
 *     1中高・2中高(容積率 300% 以下を除く)・1住・2住・準住で特定行政庁が指定 → 31m + 2.5(同号イかっこ書)。無指定区域は 20m + 1.25 / 31m + 2.5(同号ニ)
 *     公園(都市公園を除く)・広場・水面等 → 境界線は幅の 1/2 外側(令 135 条の 3 第 1 項 1 号)
 *     敷地の地盤面が隣地より 1m 以上低い → 地盤面は(高低差 − 1)/ 2 高いとみなす(同 2 号)
 *   北側斜線(56 条 1 項 3 号)
 *     許される高さ = 立上り + 1.25 × 真北方向の水平距離(隣地境界線か、前面道路の反対側の境界線まで)
 *     水面・線路敷等 → 幅の 1/2 外側(令 135 条の 4 第 1 項 1 号)/ 北側の隣地より 1m 以上低い → (高低差 − 1)/ 2(同 2 号)
 *   絶対高さ(55 条 1 項): 1低・2低・田園は 10m または 12m(都市計画で定める)
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
  /** 前面道路の幅員による容積率の乗数(52 条 2 項)。先頭が原則、残りは特定行政庁が指定する区域 */
  roadK: number[];
  /** 絶対高さ(55 条)がかかる */
  absHeight: boolean;
};

const K_LOW = [0.4];
const K_RES = [0.4, 0.6];
const K_OTHER = [0.6, 0.4, 0.8];

export const ZONES: Zone[] = [
  { id: '1lr', label: '第一種低層住居専用地域', road: ROAD_A, roadItem: '一', neighbor: null, north: 5, wide12: false, note3: false, roadK: K_LOW, absHeight: true },
  { id: '2lr', label: '第二種低層住居専用地域', road: ROAD_A, roadItem: '一', neighbor: null, north: 5, wide12: false, note3: false, roadK: K_LOW, absHeight: true },
  { id: 'den', label: '田園住居地域', road: ROAD_A, roadItem: '一', neighbor: null, north: 5, wide12: false, note3: false, roadK: K_LOW, absHeight: true },
  { id: '1mh', label: '第一種中高層住居専用地域', road: ROAD_A, roadItem: '一', neighbor: [20, 1.25], north: 10, wide12: true, note3: true, roadK: K_RES, absHeight: false },
  { id: '2mh', label: '第二種中高層住居専用地域', road: ROAD_A, roadItem: '一', neighbor: [20, 1.25], north: 10, wide12: true, note3: true, roadK: K_RES, absHeight: false },
  { id: '1r', label: '第一種住居地域', road: ROAD_A, roadItem: '一', neighbor: [20, 1.25], north: null, wide12: true, note3: true, roadK: K_RES, absHeight: false },
  { id: '2r', label: '第二種住居地域', road: ROAD_A, roadItem: '一', neighbor: [20, 1.25], north: null, wide12: true, note3: true, roadK: K_RES, absHeight: false },
  { id: 'qr', label: '準住居地域', road: ROAD_A, roadItem: '一', neighbor: [20, 1.25], north: null, wide12: true, note3: true, roadK: K_RES, absHeight: false },
  { id: 'nc', label: '近隣商業地域', road: ROAD_B, roadItem: '二', neighbor: [31, 2.5], north: null, wide12: false, note3: false, roadK: K_OTHER, absHeight: false },
  { id: 'c', label: '商業地域', road: ROAD_B, roadItem: '二', neighbor: [31, 2.5], north: null, wide12: false, note3: false, roadK: K_OTHER, absHeight: false },
  { id: 'qi', label: '準工業地域', road: ROAD_C, roadItem: '三', neighbor: [31, 2.5], north: null, wide12: false, note3: false, roadK: K_OTHER, absHeight: false },
  { id: 'i', label: '工業地域', road: ROAD_C, roadItem: '三', neighbor: [31, 2.5], north: null, wide12: false, note3: false, roadK: K_OTHER, absHeight: false },
  { id: 'ie', label: '工業専用地域', road: ROAD_C, roadItem: '三', neighbor: [31, 2.5], north: null, wide12: false, note3: false, roadK: K_OTHER, absHeight: false },
  { id: 'none', label: '用途地域の指定のない区域', road: ROAD_D, roadItem: '五', neighbor: [20, 1.25], north: null, wide12: false, note3: false, roadK: K_OTHER, absHeight: false },
];

export const zoneOf = (id: string) => ZONES.find((z) => z.id === id) ?? ZONES[0];

export type SetbackIn = {
  zone: ZoneId;
  /** 容積率(%)。farDirect = false なら都市計画で定めた数値、true なら 52 条 1・2・7・9 項による限度そのもの */
  far: number;
  /** true = far に 52 条による容積率の限度を直接入れた(2 以上の地域・特定道路・2 以上の前面道路など) */
  farDirect?: boolean;
  /** 52 条 2 項の乗数(farDirect = false のとき使う) */
  roadK?: number;
  /** 前面道路の幅員 W(m) */
  roadW: number;
  /** 道路境界線から建物までの最小距離 = 後退距離 a(m) */
  roadSet: number;
  /** 隣地境界線から建物までの距離(m) */
  sideSet: number;
  /** 北側の境界線(隣地境界線または前面道路の反対側の境界線)までの真北方向の距離(m) */
  northDist: number;
  /** 建物の高さ(地盤面から・m・任意) */
  height: number;
  /** 備考 3 の指定を受けた区域 */
  note3: boolean;
  /** 無指定区域の勾配(特定行政庁が定める)1.25 / 1.5 */
  noneSlope: 1.25 | 1.5;
  /** 1中高・2中高で日影規制の区域(北側斜線がかからない) */
  shadowZone: boolean;
  /** 隣地斜線を 31m + 2.5 とする区域(56 条 1 項 2 号イかっこ書の指定・ニで 2.5 と定めた無指定区域) */
  side25?: boolean;
  /** 絶対高さ(m)1低・2低・田園 */
  absHeight?: 10 | 12;
  /** 敷地の地盤面 − 前面道路の路面の中心の高さ(m。敷地が高ければ正) */
  roadDiff?: number;
  /** 前面道路の反対側の公園・広場・水面等の幅(m) */
  roadPark?: number;
  /** 隣地の地盤面 − 敷地の地盤面(m。隣地が高ければ正) */
  sideDiff?: number;
  /** 隣地側の公園(都市公園を除く)・広場・水面等の幅(m) */
  sidePark?: number;
  /** 北側の隣地の地盤面 − 敷地の地盤面(m) */
  northDiff?: number;
  /** 北側の水面・線路敷等の幅(m) */
  northWater?: number;
};

const pos = (n: number | undefined) => (n !== undefined && Number.isFinite(n) && n > 0 ? n : 0);
/** 令 135 条の 2〜4: 高低差 1m 以上のとき (高低差 − 1)/ 2 */
export const diffRaise = (d: number | undefined) => (d !== undefined && d >= 1 ? (d - 1) / 2 : 0);

/** 別表第 3(ろ)欄に使う容積率の限度(%) */
export function farLimit(v: SetbackIn): { far: number; byRoad: number | null } {
  if (v.farDirect) return { far: v.far, byRoad: null };
  const k = v.roadK ?? zoneOf(v.zone).roadK[0];
  const byRoad = v.roadW > 0 && v.roadW < 12 ? v.roadW * k * 100 : null;
  return { far: byRoad !== null ? Math.min(v.far, byRoad) : v.far, byRoad };
}

/** 備考 3 が使えるか(1中高・2中高は都市計画の容積率 400% 以上の地域に限る) */
export function note3Allowed(v: Pick<SetbackIn, 'zone' | 'far' | 'farDirect'>): boolean {
  const z = zoneOf(v.zone);
  if (!z.note3) return false;
  if (z.id === '1mh' || z.id === '2mh') return v.far >= 400;
  return true;
}

/** 隣地斜線 31m + 2.5 の指定がありうるか */
export function side25Allowed(v: Pick<SetbackIn, 'zone' | 'far'>): boolean {
  const z = zoneOf(v.zone);
  if (z.id === 'none') return true;
  if (z.id === '1mh' || z.id === '2mh') return v.far > 300;
  return z.id === '1r' || z.id === '2r' || z.id === 'qr';
}

export type RoadOut = {
  slope: number;
  dist: number;
  /** 適用距離に使った容積率(%) */
  far: number;
  /** 起点から建物の道路側の面までの水平距離(m) */
  startToFace: number;
  /** 面の位置で許される高さ(地盤面から)。null = 適用距離の外 */
  limitAtFace: number | null;
  /** 面の位置で許される高さ(前面道路の路面の中心から) */
  limitAtFaceRoad: number | null;
  slope15From: number | null;
  /** 令 135 条の 2 で道路を高いとみなした量(m) */
  raise: number;
  note3Applied: boolean;
};

export function roadLimit(v: SetbackIn): RoadOut {
  const z = zoneOf(v.zone);
  const fl = farLimit(v);
  let slope = z.id === 'none' ? v.noneSlope : z.road.slope;
  let dist = (z.road.rows.find((r) => fl.far <= r.maxFar) ?? z.road.rows[z.road.rows.length - 1]).dist;
  const note3Applied = v.note3 && note3Allowed(v) && slope === 1.25;
  if (note3Applied) {
    dist = dist === 25 ? 20 : dist === 30 ? 25 : dist === 35 ? 30 : dist;
    slope = 1.5;
  }
  const a = Math.max(0, v.roadSet);
  // 起点(反対側の境界線〔公園等があればその反対側〕から a 外側)から建物の道路側の面までの水平距離 = 幅員 + 公園等 + 2a
  const startToFace = v.roadW + pos(v.roadPark) + 2 * a;
  // 3 項・4 項: 幅員 12m 以上なら、起点から 1.25 ×(W + 2a)以上離れた区域は勾配 1.5(面より奥の部分にかかる)
  const slope15From = z.wide12 && v.roadW >= 12 && slope === 1.25 ? 1.25 * (v.roadW + 2 * a) : null;
  const raise = diffRaise(v.roadDiff);
  const inRange = startToFace <= dist;
  const limitAtFaceRoad = inRange ? slope * startToFace + raise : null;
  const limitAtFace = limitAtFaceRoad !== null ? limitAtFaceRoad - (v.roadDiff ?? 0) : null;
  return { slope, dist, far: fl.far, startToFace, limitAtFace, limitAtFaceRoad, slope15From, raise, note3Applied };
}

/** 道路斜線の制限線(起点からの水平距離 x → 前面道路の路面の中心からの高さ)。断面図に使う */
export function roadLine(v: SetbackIn, x: number): number | null {
  const r = roadLimit(v);
  if (x > r.dist) return null;
  return (r.slope15From !== null && x >= r.slope15From ? 1.5 : r.slope) * x + r.raise;
}

export type SideOut = { rise: number; slope: number; dist: number; raise: number; limitAtFace: number } | null;

export function sideLimit(v: SetbackIn): SideOut {
  const z = zoneOf(v.zone);
  if (!z.neighbor) return null;
  let [rise, slope] = z.neighbor;
  if (v.side25 && side25Allowed(v) && slope === 1.25) {
    rise = 31;
    slope = 2.5;
  }
  // 公園等は幅の 1/2 だけ境界線が外側にあるとみなす
  const d = Math.max(0, v.sideSet) + pos(v.sidePark) / 2;
  const raise = diffRaise(v.sideDiff);
  // 立上りを超える部分は、その部分から境界線までの距離(= d)を加える(後退の緩和)
  return { rise, slope, dist: d, raise, limitAtFace: rise + slope * (d + d) + raise };
}

export type NorthOut = { rise: number; dist: number; raise: number; limitAtFace: number } | null;

export function northLimit(v: SetbackIn): NorthOut {
  const z = zoneOf(v.zone);
  if (z.north === null) return null;
  if ((z.id === '1mh' || z.id === '2mh') && v.shadowZone) return null;
  const d = Math.max(0, v.northDist) + pos(v.northWater) / 2;
  const raise = diffRaise(v.northDiff);
  return { rise: z.north, dist: d, raise, limitAtFace: z.north + 1.25 * d + raise };
}

/** 絶対高さ(55 条 1 項)。かからない地域は null */
export function absLimit(v: SetbackIn): number | null {
  const z = zoneOf(v.zone);
  return z.absHeight ? v.absHeight ?? 10 : null;
}

export const m2 = (n: number) => (Number.isFinite(n) ? n.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—');
