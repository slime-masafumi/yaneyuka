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
 *   2 以上の前面道路(令 132 条)… road132()。2026-11-16 追加
 *     1 項: 幅員の最大な前面道路の境界線から 2W かつ 35m 以内の区域と、その他の前面道路の中心線から 10m を超える区域は、
 *           すべての前面道路が最大の幅員を持つとみなす。3 項: それ以外の区域は、接する前面道路だけを前面道路とする
 *     (2 項は 3 本以上の前面道路のときだけ意味を持つ。2 本では 1 項の区域と重なるので入れていない)
 *     令 134 条 2 項: 公園等がある前面道路を基準に、2 ×(公園等の反対側の境界線〜道路の境界線)かつ 35m 以内などで、
 *           すべての前面道路を同じ幅員・同じ公園等があるとみなせる(選択。この場合も 132 条 2・3 項を準用)
 *   塔屋(令 2 条 1 項 6 号ロ)… penthouseCounted()。2026-11-16 追加
 *     階段室・昇降機塔・装飾塔・物見塔・屋窓等の屋上部分で、水平投影面積の合計が建築面積の 1/8 以内なら、
 *     その部分の高さは 12m(法 55 条 1〜3 項・法 56 条の 2 第 4 項・別表第 4(ろ)欄二・三・四の項ロは 5m)まで算入しない。
 *     北側斜線(法 56 条 1 項 3 号)の高さは除外の対象外 = 全部算入
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

// ─────────────────────────────────────────────────────────────────────────────
// 2 以上の前面道路(令 132 条・令 134 条 2 項)
// ─────────────────────────────────────────────────────────────────────────────

export type FrontRoad = {
  /** 幅員(m) */
  width: number;
  /** 道路境界線から建物までの距離 = 後退距離(m) */
  set: number;
  /** 反対側の公園・広場・水面等の幅(m)。令 134 条 */
  park?: number;
};

export type MultiRoadIn = {
  roads: [FrontRoad, FrontRoad];
  /** corner = 角地(2 本が直交)/ opposite = 二方道路(敷地の両側で平行) */
  layout: 'corner' | 'opposite';
  /**
   * corner のとき: reach[j] = もう一方の道路の境界線から、道路 j 側の建物の面の遠い端までの水平距離(m)。
   * 例: 道路 1 が南・道路 2 が東なら reach[1] = 道路 1 側の後退距離 + 建物の南北の奥行き
   */
  reach: [number, number];
  /** opposite のとき: 2 本の道路境界線の間の距離(敷地の奥行き・m) */
  depth: number;
  /** 令 134 条 2 項による(公園等がある前面道路を基準にする) */
  use134?: boolean;
};

/** 建物の面に沿った区間。from / to は基準の道路(幅員の最大な前面道路)の境界線からの水平距離(m) */
export type RoadSeg = { from: number; to: number; width: number; park: number; deemed: boolean };

export type MultiRoadOut = {
  /** 幅員の最大な前面道路(134 条 2 項なら公園等がある前面道路)の番号 */
  base: 0 | 1;
  /** 1 項の区域の奥行 = min(2 × 幅員, 35)(m) */
  zone: number;
  /** 区域を決めるのに使った幅員(134 条 2 項なら 道路 + 公園等) */
  zoneW: number;
  use134: boolean;
  /** 道路 j 側の面の区間(幅員をどうみなすか) */
  faces: [RoadSeg[], RoadSeg[]];
  /** 条文で確かめきれなかったところ(画面に「要確認」で出す) */
  unsure: string[];
};

/**
 * 令 132 条 1 項・3 項(2 本の前面道路)。各道路側の建物の面が、どの幅員の道路に面しているとみなすかを区間で返す。
 * 区間の高さの限度は faceRoadLimit()(roadLimit に roadW = width・roadPark = park を入れる)で出し、面で最も厳しい区間が効く。
 */
export function road132(m: MultiRoadIn): MultiRoadOut {
  const [r0, r1] = m.roads;
  const unsure: string[] = [];
  const parks = [pos(r0.park), pos(r1.park)];
  let base: 0 | 1 = r1.width > r0.width ? 1 : 0;
  let use134 = false;
  let zoneW = m.roads[base].width;
  let deemW = m.roads[base].width;
  let deemP = 0;
  if (m.use134 && (parks[0] > 0 || parks[1] > 0)) {
    // 134 条 2 項: 公園等がある前面道路(2 以上あるときは、そのうちの一。ここでは 道路 + 公園等 が大きい方)
    use134 = true;
    base = parks[1] > 0 && (parks[0] === 0 || r1.width + parks[1] > r0.width + parks[0]) ? 1 : 0;
    zoneW = m.roads[base].width + parks[base];
    deemW = m.roads[base].width;
    deemP = parks[base];
  }
  const zone = Math.min(2 * zoneW, 35);
  const other: 0 | 1 = base === 0 ? 1 : 0;
  const ro = m.roads[other];
  const rb = m.roads[base];
  // 基準の道路側の面: その道路自身(134 条 1 項の公園等も)
  const baseFace: RoadSeg[] = [{ from: 0, to: Infinity, width: rb.width, park: parks[base], deemed: false }];
  const own = { width: ro.width, park: parks[other], deemed: false };
  const deem = { width: deemW, park: use134 ? deemP : 0, deemed: true };
  // その他の前面道路の中心線から 10m を超える区域 → 面の全部をみなす
  const farFromCenter = ro.width / 2 + Math.max(0, ro.set) > 10;
  let otherFace: RoadSeg[];
  if (rb.width <= ro.width && !use134) {
    otherFace = [{ from: 0, to: Infinity, ...own }];
  } else if (farFromCenter) {
    otherFace = [{ from: 0, to: Infinity, ...deem }];
  } else if (m.layout === 'corner') {
    const a = Math.max(0, rb.set);
    const end = Math.max(a, m.reach[other]);
    otherFace = [];
    if (a < zone) otherFace.push({ from: a, to: Math.min(zone, end), ...deem });
    if (end > zone) otherFace.push({ from: Math.max(zone, a), to: end, ...own });
    if (!otherFace.length) otherFace.push({ from: a, to: end, ...own });
  } else {
    const at = m.depth - Math.max(0, ro.set);
    otherFace = [{ from: at, to: at, ...(at <= zone ? deem : own) }];
  }
  if (!use134 && parks[other] > 0 && otherFace.some((s) => s.deemed)) {
    unsure.push('最大の幅員とみなした道路の反対側の公園等(令 134 条 1 項)を重ねて使えるか。ここでは重ねていない(安全側)');
  }
  if (use134) unsure.push('令 134 条 2 項の「公園等の反対側の境界線から前面道路の境界線までの水平距離」を 道路の幅員 + 公園等の幅 として扱った');
  const faces = (base === 0 ? [baseFace, otherFace] : [otherFace, baseFace]) as [RoadSeg[], RoadSeg[]];
  return { base, zone, zoneW, use134, faces, unsure };
}

/** 区間ごとの道路斜線を roadLimit で出し、面で最も厳しい値を返す。set = その道路側の後退距離 */
export function faceRoadLimit(v: SetbackIn, segs: RoadSeg[], set: number): { lim: number | null; segs: (RoadSeg & { r: RoadOut })[] } {
  const out = segs.map((s) => ({ ...s, r: roadLimit({ ...v, roadW: s.width, roadPark: s.park, roadSet: set }) }));
  const lims = out.map((s) => s.r.limitAtFace).filter((x): x is number => x !== null);
  return { lim: lims.length ? Math.min(...lims) : null, segs: out };
}

// ─────────────────────────────────────────────────────────────────────────────
// 塔屋(令 2 条 1 項 6 号ロ)
// ─────────────────────────────────────────────────────────────────────────────

export type Penthouse = {
  /** 階段室・昇降機塔等の水平投影面積の合計(m²) */
  area: number;
  /** 塔屋の高さ(屋上から頂部まで・m) */
  height: number;
  /** 建築物の建築面積(m²) */
  bldgArea: number;
};

/**
 * 何の高さか。road / side = 道路・隣地斜線(12m まで不算入)、north = 北側斜線(全部算入)、
 * abs = 絶対高さ(法 55 条 1〜3 項 → 5m)、shadow10 = 日影規制の対象かどうか(別表第 4(ろ)欄二・三・四の項ロと法 56 条の 2 第 4 項 → 5m)、
 * kodo = 高度地区(最高限度型なら 12m まで不算入だが、斜線型は全部算入。種別を入れないので安全側で全部算入)
 */
export type HeightUse = 'road' | 'side' | 'north' | 'abs' | 'shadow10' | 'kodo';

export function penthouseCounted(p: Penthouse | null | undefined, use: HeightUse): { counted: number; within: boolean; exempt: number; basis: string } {
  const h = p ? pos(p.height) : 0;
  if (!p || !(h > 0) || !(pos(p.area) > 0)) return { counted: 0, within: true, exempt: 0, basis: '' };
  const within = p.bldgArea > 0 && p.area <= p.bldgArea / 8 + 1e-9;
  const exempt = use === 'north' || use === 'kodo' ? 0 : use === 'abs' || use === 'shadow10' ? 5 : 12;
  const counted = within ? Math.max(0, h - exempt) : h;
  const basis = !within
    ? '建築面積の 1/8 を超えるので全部算入'
    : use === 'north'
      ? '北側斜線は不算入の対象外(令 2 条 1 項 6 号ロ)'
      : use === 'kodo'
        ? '高度地区は斜線型なら全部算入(安全側で全部算入・要確認)'
        : `${exempt}m まで不算入(令 2 条 1 項 6 号ロ${exempt === 5 ? (use === 'abs' ? '・法 55 条' : '・別表第 4(ろ)欄') : ''})`;
  return { counted, within, exempt, basis };
}

export const m2 = (n: number) => (Number.isFinite(n) ? n.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—');
