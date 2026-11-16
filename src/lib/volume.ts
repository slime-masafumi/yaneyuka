/**
 * ボリューム検討(設計ツール › 基本設計 › ボリューム検討)。2026-11-16
 *
 * 1 組の敷地条件から「この敷地に何 m² ・何階まで建つか」を出す。実務で最初に聞かれる問い。
 * 建蔽率・容積率・斜線・絶対高さ・日影を別々のツールに入れ直さずに、まとめて見て、どれが効くかを言う。
 *
 * 計算は既存の検証済みロジックを使う(ここで条文を書き直さない):
 *   建蔽率 … src/lib/karte/site.ts の weightedLimits(法 53 条 1〜3 項・6〜8 項。部分ごとの緩和と加重平均)
 *   斜線・絶対高さ … src/lib/setback.ts(法 55 条・56 条・別表第 3)
 *   日影 … src/lib/shadow.ts(法 56 条の 2・別表第 4。直方体の箱で目安だけ)
 * ここで足したもの(e-Gov の現行本文 2026-11-16 取得で照合):
 *   敷地面積 … 2 項道路の後退部分を除く(令 2 条 1 項 1 号)。後退 = 道路の中心線から 2m(指定区域は 3m)の線まで(法 42 条 2 項)。
 *              片側が崖地・川等なら、その側の境界線から 4m(6m)の線まで(同項ただし書)
 *   容積率 … 部分ごとに min(指定容積率, 前面道路の幅員 × 乗数)(法 52 条 1 項・2 項)を出し、面積で加重平均(同 7 項)。
 *            前面道路が 2 以上なら最大の幅員(2 項かっこ書)。特定道路は Wa =(12 − Wr)(70 − L)/ 70 を加える(9 項・令 135 条の 18。
 *            幅員 6m 以上 12m 未満、延長 70m 以内に限る)
 *   道路斜線の適用距離 … 前面道路に接する敷地の部分の地域で引く(令 130 条の 11)
 *   高度地区 … 都市計画で定める最高限度(都市計画法 9 条 18 項・法 58 条)。自由入力の上限として扱う
 * 近似(画面にも書く):
 *   敷地は東西南北に正対した長方形。建物は 1 つの直方体(上階のセットバックなし)。建築面積が建蔽率を超えるときは、
 *   前面道路の反対側(奥)を引っ込めて建蔽率に合わせる。高さは「面の位置」で比べる(斜線は面で最も厳しい)。
 *   敷地が 2 以上の地域にわたるとき、隣地斜線・北側斜線・絶対高さは、建物がかかる地域のうち厳しい方で見る(安全側)。
 *   2026-11-16: 2 本目の前面道路の道路斜線に令 132 条(最大幅員の道路から 2W かつ 35m 以内・他の道路の中心線から 10m 超は
 *   最大幅員とみなす)を入れた(setback.ts の road132)。それまでは 2 本目をその道路の幅員のまま計算していた(安全側)。
 *   塔屋(令 2 条 1 項 6 号ロ)の面積・高さを入れられるようにした。天空率(法 56 条 7 項)で斜線を超えられる階数を別に出す(skyFactor.ts)。
 *   天空率の階数は「建てられる延べ面積」には入れない(従来の答えは斜線で比べたまま)。
 */
import {
  ZONES,
  absLimit,
  faceRoadLimit,
  northLimit,
  penthouseCounted,
  road132,
  roadLimit,
  sideLimit,
  zoneOf,
  type HeightUse,
  type MultiRoadOut,
  type Penthouse,
  type RoadSeg,
  type SetbackIn,
  type ZoneId,
} from './setback';
import { SHADOW_ZONES, computeShadow, type ShadowIn } from './shadow';
import { evalSky, prepareSky, type SkyCheck, type SkyModel } from './skyFactor';
import { roadCoefOf, weightedLimits, type FireRating, type SitePart } from './karte/site';

export type Dir = 'N' | 'E' | 'S' | 'W';
export const DIRS: Dir[] = ['N', 'E', 'S', 'W'];
export const DIR_LABEL: Record<Dir, string> = { N: '北', E: '東', S: '南', W: '西' };
const OPP: Record<Dir, Dir> = { N: 'S', S: 'N', E: 'W', W: 'E' };

/** 敷地の部分。SitePart(物件カルテと同じ形)に、52 条 2 項の乗数(特定行政庁が指定する区域の値)を足したもの */
export type VolPart = SitePart & { roadK?: number };

export type VolumeIn = {
  parts: VolPart[];
  /** 前面道路に接する部分(parts の添字)。2 項道路の後退面積を引く部分・道路斜線の適用距離を引く地域(令 130 条の 11) */
  frontPart: number;
  /** 前面道路(主)。dir = 敷地から見て道路がある方位。width = 幅員(2 項道路なら現況の幅員) */
  road1: { dir: Dir; width: number };
  /** 2 本目の前面道路(角地など)。null = なし */
  road2: { dir: Dir; width: number } | null;
  /** 主の前面道路が 2 項道路(法 42 条 2 項) */
  nisetsu: boolean;
  /** みなし幅員 4m / 6m(6m は特定行政庁が指定する区域) */
  nisetsuDeemed: 4 | 6;
  /** 道の反対側が崖地・川・線路敷等(片側だけ後退) */
  nisetsuOneSide: boolean;
  /** 特定道路(幅員 15m 以上)に接続する前面道路 */
  tokutei: boolean;
  /** 特定道路から敷地が接する前面道路の部分の直近の端までの延長 L(m) */
  tokuteiL: number;
  corner: boolean;
  fr: FireRating;
  /** 間口(主の前面道路に沿った長さ)・奥行(m)。長方形で近似 */
  siteWidth: number;
  siteDepth: number;
  /** 道路境界線から建物までの距離 a(m。2 項道路は後退後の線から) */
  roadSet: number;
  /** 隣地境界線から建物までの距離(m) */
  sideSet: number;
  /** 北側斜線の距離を直接入れる(m)。null = 敷地の形から出す */
  northDistOverride: number | null;
  /** 階高(m) */
  ftf: number;
  /** 地盤面〜1 階床 + パラペット等(m)。高さ = 階高 × 階数 + これ */
  extra: number;
  /** 地階の階数(容積率に算入する前提。住宅の地階の不算入は見ない) */
  basement: number;
  /** 絶対高さ(1低・2低・田園) */
  absHeight: 10 | 12;
  /** 高度地区の最高限度(m)。0 = なし */
  kodo: number;
  /** 別表第 3 備考 3 の区域 */
  note3: boolean;
  /** 隣地斜線 31m + 2.5 の区域 */
  side25: boolean;
  /** 用途地域の指定のない区域の道路斜線の勾配 */
  noneSlope: 1.25 | 1.5;
  /** 日影規制。null = かからない(条例で指定なし) */
  shadow: { group: string; go: string; plane: number; lat: number; hokkaido: boolean } | null;
  /** 塔屋(階段室・昇降機塔等)の水平投影面積の合計(m²)と屋上からの高さ(m)。null / 0 = なし */
  pent?: { area: number; height: number } | null;
};

export const zoneIdOf = (label: string): ZoneId => ZONES.find((z) => z.label === label)?.id ?? 'none';
/** 用途地域 → 別表第 4 の項(既定) */
export function shadowGroupOf(id: ZoneId): string | null {
  if (id === '1lr' || id === '2lr' || id === 'den') return 'low';
  if (id === '1mh' || id === '2mh') return 'mid';
  if (id === '1r' || id === '2r' || id === 'qr' || id === 'nc' || id === 'qi') return 'res';
  if (id === 'none') return 'none-i';
  return null; // 商業・工業・工専は別表第 4 にない
}

export type Row = { k: string; v: string; basis: string };

export type Face = {
  dir: Dir;
  /** road = 道路斜線 / side = 隣地斜線 / north = 北側斜線 */
  kind: 'road' | 'side' | 'north';
  label: string;
  /** 面の位置で許される高さ(地盤面から m)。null = かからない */
  limit: number | null;
  formula: string;
  basis: string;
};

export type Constraint = { key: string; label: string; height: number | null; floors: number; basis: string };

export type VolumeOut = {
  ok: boolean;
  warnings: string[];
  site: { gross: number; setbackDepth: number; setbackArea: number; net: number };
  parts: { zone: string; area: number; bc: number; bcLimit: number; bcNote: string; far: number; k: number; farLimit: number; farNote: string }[];
  bc: number;
  far: number;
  /** 容積率に使う幅員(特定道路の加算後)。null = 12m 以上 or 未入力 */
  wMax: number;
  wa: number;
  deemedFire: string | null;
  bcArea: number;
  farArea: number;
  plan: { ew: number; ns: number; set: Record<Dir, number>; bw: number; bd: number; rectArea: number; footprint: number; pull: number; by: 'bc' | 'shape' };
  faces: Face[];
  abs: number | null;
  kodo: number | null;
  /** 高さの上限(面・絶対高さ・高度地区の最小)。null = かからない */
  hmax: number | null;
  constraints: Constraint[];
  floorsNeed: number;
  floorsByHeight: number;
  floors: number;
  height: number;
  shadow: null | {
    group: string;
    label: string;
    go: string;
    plane: number;
    near: number;
    far: number;
    covered: boolean;
    maxNear: number;
    maxFar: number;
    ok: boolean;
    /** 日影の目安で収まる地上階数(箱のまま) */
    floorsOk: number;
  };
  achievable: number;
  usedFar: number;
  /** 塔屋の扱い(令 2 条 1 項 6 号ロ)。null = 塔屋なし */
  pent: null | { area: number; height: number; limit: number; within: boolean; rows: { k: string; counted: number; basis: string }[] };
  /** 天空率で斜線をはずした場合(法 56 条 7 項)。null = 斜線が効いていない */
  sky: null | {
    /** 天空率で通る最上階(日影・絶対高さ・高度地区・容積率も満たす) */
    floors: number;
    gain: number;
    height: number;
    area: number;
    /** checks を測った階数 */
    at: number;
    checks: SkyCheck[];
    capBy: string;
    unsure: string[];
  };
  governing: { key: string; text: string; detail: string };
  rows: Row[];
};

const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
const r2 = (n: number) => Math.round(n * 100) / 100;
export const f2 = (n: number) => (Number.isFinite(n) ? n.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—');
const pct = (n: number) => `${Number.isInteger(r2(n)) ? Math.round(n) : r2(n).toFixed(2)}%`;
const floorsFor = (h: number | null, ftf: number, extra: number) => (h === null ? Infinity : Math.max(0, Math.floor((h - extra) / ftf + 1e-9)));

export function calcVolume(v: VolumeIn): VolumeOut {
  const warnings: string[] = [];
  const parts0 = v.parts.filter((p) => p.area > 0);
  const front = Math.min(Math.max(0, v.frontPart), Math.max(0, v.parts.length - 1));

  // --- 敷地面積(令 2 条 1 項 1 号・法 42 条 2 項) ---
  const gross = parts0.reduce((s, p) => s + p.area, 0);
  let setbackDepth = 0;
  if (v.nisetsu && v.road1.width > 0 && v.road1.width < v.nisetsuDeemed) {
    setbackDepth = v.nisetsuOneSide ? v.nisetsuDeemed - v.road1.width : (v.nisetsuDeemed - v.road1.width) / 2;
  }
  const setbackArea = setbackDepth * pos(v.siteWidth);
  const parts: VolPart[] = v.parts.map((p, i) => (i === front ? { ...p, area: Math.max(0, p.area - setbackArea) } : p));
  const net = parts.reduce((s, p) => s + (p.area > 0 ? p.area : 0), 0);
  if (setbackArea > 0 && setbackArea >= (v.parts[front]?.area ?? 0)) warnings.push('2 項道路の後退面積が、前面道路に接する部分の面積以上になっています。面積の入力を確かめてください。');

  // --- 前面道路の幅員(52 条 2 項・9 項) ---
  const w1 = v.nisetsu && v.road1.width < v.nisetsuDeemed ? v.nisetsuDeemed : v.road1.width;
  const w2 = v.road2 ? v.road2.width : 0;
  let wMax = Math.max(pos(w1), pos(w2));
  let wa = 0;
  if (v.tokutei) {
    if (wMax >= 6 && wMax < 12 && v.tokuteiL >= 0 && v.tokuteiL <= 70) {
      wa = ((12 - wMax) * (70 - v.tokuteiL)) / 70;
      wMax += wa;
    } else warnings.push('特定道路の加算は、前面道路の幅員が 6m 以上 12m 未満で、特定道路からの延長が 70m 以内のときだけです(法 52 条 9 項)。加算していません。');
  }
  if (!(wMax > 0)) warnings.push('前面道路の幅員が未入力です。前面道路による容積率の制限(法 52 条 2 項)と道路斜線を計算していません。');

  // --- 建蔽率(53 条)… site.ts の weightedLimits をそのまま使う ---
  const wl = weightedLimits(parts, { road: 0, fr: v.fr, corner: v.corner });
  // --- 容積率(52 条 1・2・7・9 項)… 乗数は部分ごと(特定行政庁の指定を入れられる) ---
  const farRows = parts.map((p) => {
    const k = p.roadK ?? roadCoefOf(p.zone);
    const byRoad = wMax > 0 && wMax < 12 ? wMax * k * 100 : Infinity;
    const farLimit = p.far > 0 ? Math.min(p.far, byRoad) : 0;
    const farNote = p.far > 0 ? (byRoad < p.far ? `min(指定 ${p.far}, ${r2(wMax)} × ${k} × 100 = ${r2(byRoad)})` : `指定 ${p.far}${Number.isFinite(byRoad) ? `(道路 ${r2(wMax)} × ${k} × 100 = ${r2(byRoad)} 以上)` : ''}`) : '未入力';
    return { k, farLimit, farNote };
  });
  const bc = net > 0 ? wl.rows.reduce((s, r) => s + r.bcLimit * (r.part.area > 0 ? r.part.area : 0), 0) / net : 0;
  const far = net > 0 ? parts.reduce((s, p, i) => s + farRows[i].farLimit * (p.area > 0 ? p.area : 0), 0) / net : 0;
  const bcArea = (net * bc) / 100;
  const farArea = (net * far) / 100;
  if (parts0.some((p) => !(p.bc > 0) || !(p.far > 0))) warnings.push('指定建蔽率・指定容積率が未入力の部分があります(その部分は 0% で計算しています)。');

  // --- 平面(長方形の近似) ---
  const along = v.road1.dir === 'N' || v.road1.dir === 'S';
  const depthNet = Math.max(0, v.siteDepth - setbackDepth);
  const ew = along ? v.siteWidth : depthNet;
  const ns = along ? depthNet : v.siteWidth;
  if (gross > 0 && v.siteWidth > 0 && v.siteDepth > 0) {
    const rect = v.siteWidth * v.siteDepth;
    if (Math.abs(rect - gross) / gross > 0.1) warnings.push(`間口 × 奥行(${f2(rect)} m²)が敷地面積(${f2(gross)} m²)と 1 割以上違います。建物の大きさは間口・奥行から、面積は入力した面積から出しています。`);
  }
  const roadDirs = new Map<Dir, number>();
  if (w1 > 0) roadDirs.set(v.road1.dir, w1);
  if (v.road2 && v.road2.dir !== v.road1.dir && w2 > 0) roadDirs.set(v.road2.dir, w2);
  const set: Record<Dir, number> = { N: 0, E: 0, S: 0, W: 0 };
  for (const d of DIRS) set[d] = roadDirs.has(d) ? pos(v.roadSet) : pos(v.sideSet);
  let bw = Math.max(0, ew - set.E - set.W);
  let bd = Math.max(0, ns - set.N - set.S);
  const rectArea = bw * bd;
  let footprint = rectArea;
  let pull = 0;
  let by: 'bc' | 'shape' = 'shape';
  if (rectArea > bcArea && bcArea > 0) {
    // 建蔽率に合わせて奥(主の前面道路の反対側)を引っ込める
    by = 'bc';
    const rear = OPP[v.road1.dir];
    const frontLen = along ? bw : bd;
    pull = frontLen > 0 ? (rectArea - bcArea) / frontLen : 0;
    set[rear] += pull;
    if (along) bd = Math.max(0, bd - pull);
    else bw = Math.max(0, bw - pull);
    footprint = bw * bd;
  }

  // --- 高さ(55 条・56 条)… setback.ts ---
  const bldgParts = parts.filter((p) => p.area > 0 && p.bldg);
  const hParts = bldgParts.length ? bldgParts : parts.filter((p) => p.area > 0);
  const frontZone = zoneIdOf(parts[front]?.zone ?? '');
  const shadowOn = !!v.shadow && v.shadow.go !== '';
  const base = (zone: ZoneId, o: Partial<SetbackIn>): SetbackIn => ({
    zone,
    far,
    farDirect: true,
    roadW: 0,
    roadSet: 0,
    sideSet: 0,
    northDist: 0,
    height: 0,
    note3: v.note3,
    noneSlope: v.noneSlope,
    shadowZone: shadowOn,
    side25: v.side25,
    absHeight: v.absHeight,
    ...o,
  });
  // 塔屋(令 2 条 1 項 6 号ロ)。建築面積 = 1 階の箱。北側斜線は全部算入・絶対高さと日影の対象判定は 5m・道路と隣地斜線は 12m まで不算入
  const pentIn: Penthouse | null = v.pent && v.pent.area > 0 && v.pent.height > 0 ? { area: v.pent.area, height: v.pent.height, bldgArea: footprint } : null;
  const pc = (use: HeightUse) => penthouseCounted(pentIn, use);
  // 2 以上の前面道路(令 132 条)。道路 1 本なら null(これまでと同じ計算)
  const roadList = [...roadDirs.entries()];
  let m132: MultiRoadOut | null = null;
  if (roadList.length === 2) {
    const [[d1, wA], [d2, wB]] = roadList;
    // 道路 d に直交する向きの建物の長さ
    const ext = (d: Dir) => (d === 'N' || d === 'S' ? bd : bw);
    m132 = road132({
      roads: [
        { width: wA, set: set[d1] },
        { width: wB, set: set[d2] },
      ],
      layout: OPP[d1] === d2 ? 'opposite' : 'corner',
      reach: [set[d2] + ext(d2), set[d1] + ext(d1)],
      depth: d1 === 'N' || d1 === 'S' ? ns : ew,
    });
  }
  const faces: Face[] = [];
  for (const d of DIRS) {
    const rw = roadDirs.get(d);
    if (rw !== undefined) {
      const idx = roadList.findIndex(([dd]) => dd === d);
      const segs: RoadSeg[] = m132 ? m132.faces[idx] : [{ from: 0, to: Infinity, width: rw, park: 0, deemed: false }];
      const fr = faceRoadLimit(base(frontZone, {}), segs, set[d]);
      const r0 = fr.segs[0].r;
      const deemedAll = fr.segs.every((s) => s.deemed);
      const segTxt = (s: (typeof fr.segs)[number]) =>
        s.r.limitAtFace !== null ? `${s.r.slope} × (${r2(s.width)} + 2 × ${r2(set[d])}) = ${f2(s.r.limitAtFace)} m(適用距離 ${s.r.dist}m)` : `面が適用距離 ${s.r.dist}m の外(かからない)`;
      const range = (s: RoadSeg) => (fr.segs.length > 1 && Number.isFinite(s.to) ? `(最大幅員の道路から ${r2(s.from)}〜${r2(s.to)}m)` : '');
      const formula =
        fr.segs.length === 1 && !fr.segs[0].deemed ? segTxt(fr.segs[0]) : fr.segs.map((s) => `${s.deemed ? `幅員 ${r2(s.width)}m とみなす` : `幅員 ${r2(s.width)}m のまま`}${range(s)}: ${segTxt(s)}`).join(' / ');
      faces.push({
        dir: d,
        kind: 'road',
        label: `道路斜線(${DIR_LABEL[d]}・幅員 ${r2(rw)}m${deemedAll ? ` → ${r2(fr.segs[0].width)}m` : ''})`,
        limit: fr.lim,
        formula,
        basis: `法 56 条 1 項 1 号・2 項・別表第 3 ${zoneOf(frontZone).roadItem}の項${r0.note3Applied ? '・備考 3' : ''}(適用距離は容積率 ${pct(far)} で引く・令 130 条の 11)${m132 ? `・令 132 条(最大幅員 ${r2(m132.zoneW)}m の道路から ${r2(m132.zone)}m 以内と、他の道路の中心線から 10m 超は最大幅員とみなす${fr.segs.length > 1 ? '。面で厳しい区間の値' : ''})` : ''}`,
      });
    } else {
      // 隣地斜線: 建物がかかる地域のうち厳しい方
      let best: { lim: number; f: string } | null = null;
      for (const p of hParts) {
        const s = sideLimit(base(zoneIdOf(p.zone), { sideSet: set[d], far: p.far }));
        if (s && (!best || s.limitAtFace < best.lim)) best = { lim: s.limitAtFace, f: `${s.rise} + ${s.slope} × (${r2(s.dist)} × 2) = ${f2(s.limitAtFace)} m` };
      }
      faces.push({ dir: d, kind: 'side', label: `隣地斜線(${DIR_LABEL[d]})`, limit: best?.lim ?? null, formula: best?.f ?? 'かからない(低層住居系・田園)', basis: '法 56 条 1 項 2 号(立上りを超える部分の後退距離を加える)' });
    }
  }
  // 北側斜線: 北の面。北が道路なら道路の反対側の境界線まで
  const nRoad = roadDirs.get('N');
  const northDist = v.northDistOverride !== null && v.northDistOverride >= 0 ? v.northDistOverride : set.N + (nRoad ?? 0);
  let nb: { lim: number; f: string; rise: number; zone: ZoneId } | null = null;
  for (const p of hParts) {
    const n = northLimit(base(zoneIdOf(p.zone), { northDist }));
    if (n && (!nb || n.limitAtFace < nb.lim)) nb = { lim: n.limitAtFace, f: `${n.rise} + 1.25 × ${r2(n.dist)} = ${f2(n.limitAtFace)} m`, rise: n.rise, zone: zoneIdOf(p.zone) };
  }
  const hasNorthZone = hParts.some((p) => zoneOf(zoneIdOf(p.zone)).north !== null);
  if (hasNorthZone) {
    faces.push({
      dir: 'N',
      kind: 'north',
      label: '北側斜線(北)',
      limit: nb?.lim ?? null,
      formula: nb ? `${nb.f}(真北方向の距離 ${r2(northDist)}m${nRoad !== undefined && v.northDistOverride === null ? '・道路の反対側まで' : ''})` : 'かからない(中高層住居専用地域で日影規制の区域)',
      basis: '法 56 条 1 項 3 号',
    });
  }
  let abs: number | null = null;
  for (const p of hParts) {
    const a = absLimit(base(zoneIdOf(p.zone), {}));
    if (a !== null) abs = abs === null ? a : Math.min(abs, a);
  }
  const kodo = v.kodo > 0 ? v.kodo : null;
  const lims = [...faces.map((f) => f.limit), abs, kodo].filter((x): x is number => x !== null);
  const hmax = lims.length ? Math.min(...lims) : null;

  // --- 階数 ---
  const ftf = v.ftf > 0 ? v.ftf : 3;
  const extra = pos(v.extra);
  const B = Math.max(0, Math.floor(pos(v.basement)));
  const heightUseOf = (k: Face['kind']): HeightUse => (k === 'road' ? 'road' : k === 'side' ? 'side' : 'north');
  const constraints: Constraint[] = [
    ...faces.map((f) => ({ key: f.kind === 'road' ? 'road' : f.kind === 'side' ? 'side' : 'north', label: f.label.replace(/・幅員[^)]*/, ''), height: f.limit, floors: floorsFor(f.limit, ftf, extra + pc(heightUseOf(f.kind)).counted), basis: f.basis })),
    ...(abs !== null ? [{ key: 'abs', label: '絶対高さ', height: abs, floors: floorsFor(abs, ftf, extra + pc('abs').counted), basis: '法 55 条 1 項' }] : []),
    ...(kodo !== null ? [{ key: 'kodo', label: '高度地区', height: kodo, floors: floorsFor(kodo, ftf, extra + pc('kodo').counted), basis: '都市計画法 9 条 18 項・法 58 条' }] : []),
  ];
  const floorsByHeight = constraints.length ? Math.min(...constraints.map((c) => c.floors)) : Infinity;
  const restArea = farArea - B * footprint;
  const floorsNeed = footprint > 0 ? Math.max(1, Math.ceil(restArea / footprint - 1e-9)) : 0;
  let floors = Math.min(floorsNeed, floorsByHeight);

  // 塔屋の平面(箱の中央に正方形で置く。箱より大きければ箱に合わせる)。箱の南西の角から
  let pentRect: { x0: number; y0: number; x1: number; y1: number } | null = null;
  if (pentIn && bw > 0 && bd > 0) {
    const pw = Math.min(bw, Math.sqrt(pentIn.area));
    const pd = Math.min(bd, pentIn.area / pw);
    pentRect = { x0: (bw - pw) / 2, y0: (bd - pd) / 2, x1: (bw + pw) / 2, y1: (bd + pd) / 2 };
  }

  // --- 日影(目安)… 箱を shadow.ts に渡し、収まらなければ 1 階ずつ下げる ---
  let shadow: VolumeOut['shadow'] = null;
  let shadowTest: ((n: number) => { covered: boolean; maxNear: number; maxFar: number; ok: boolean }) | null = null;
  if (v.shadow && v.shadow.go !== '' && footprint > 0 && floors > 0) {
    const sz = SHADOW_ZONES.find((z) => z.id === v.shadow!.group);
    const row = sz?.rows.find((r) => r.go === v.shadow!.go) ?? sz?.rows[0];
    if (sz && row) {
      const near = v.shadow.hokkaido ? row.nearH : row.near;
      const farH = v.shadow.hokkaido ? row.farH : row.far;
      const plane = sz.planes.includes(v.shadow.plane) ? v.shadow.plane : sz.planes[0];
      const low = sz.id === 'low' || sz.id === 'none-i';
      const way = (d: Dir) => roadDirs.get(d) ?? 0;
      const test = (n: number) => {
        const h = n * ftf + extra;
        // 別表第 4(ろ)欄: 低層・無指定イは軒高 7m 超か 3 階以上(箱なので軒高 = 高さ)、他は高さ 10m 超(塔屋は 1/8 以内なら 5m まで不算入)
        const covered = low ? h > 7 || n >= 3 : h + pc('shadow10').counted > 10;
        if (!covered) return { covered, maxNear: 0, maxFar: 0, ok: true };
        const si: ShadowIn = {
          lat: v.shadow!.lat,
          hokkaido: v.shadow!.hokkaido,
          bw,
          bd,
          bh: h,
          rot: 0,
          plane,
          setN: set.N,
          setE: set.E,
          setS: set.S,
          setW: set.W,
          wayN: way('N'),
          wayE: way('E'),
          wayS: way('S'),
          wayW: way('W'),
          pent: pentRect && pentIn ? { ...pentRect, h: pentIn.height } : null,
        };
        const r = computeShadow(si);
        // 56 条の 2: 規制時間「以上」は不適合
        return { covered, maxNear: r.maxNear, maxFar: r.maxFar, ok: r.maxNear < near - 1e-6 && r.maxFar < farH - 1e-6 };
      };
      shadowTest = test;
      const first = test(floors);
      let floorsOk = floors;
      if (!first.ok) {
        floorsOk = 0;
        for (let n = floors - 1; n >= 1; n--) {
          if (test(n).ok) {
            floorsOk = n;
            break;
          }
        }
      }
      shadow = { group: sz.id, label: sz.label, go: row.go, plane, near, far: farH, covered: first.covered, maxNear: first.maxNear, maxFar: first.maxFar, ok: first.ok, floorsOk };
      constraints.push({ key: 'shadow', label: '日影(目安)', height: floorsOk * ftf + extra, floors: floorsOk, basis: `法 56 条の 2・別表第 4 ${sz.item}の項${row.go}(測定面 ${plane}m)` });
      floors = Math.min(floors, floorsOk);
    }
  }

  // --- 天空率(法 56 条 7 項)… 斜線で頭打ちの階数を、天空率で超えられるか。上の階数・延べ面積には入れず、別に出す ---
  let sky: VolumeOut['sky'] = null;
  const slopeKinds = (n: number) => {
    const ks = new Set<Face['kind']>();
    for (const f of faces) if (f.limit !== null && n * ftf + extra + pc(heightUseOf(f.kind)).counted > f.limit + 1e-9) ks.add(f.kind);
    return ks;
  };
  if (footprint > 0 && floors > 0 && floorsNeed > floors && slopeKinds(floors + 1).size > 0) {
    const caps = constraints.filter((c) => c.key === 'abs' || c.key === 'kodo').map((c) => c.floors);
    const upper = Math.min(floorsNeed, ...caps);
    const unsure: string[] = [];
    // 隣地・北側は、建物がかかる地域のうち厳しいもので全周を測る
    let sideP: { rise: number; slope: number } | null = null;
    let sideLim = Infinity;
    for (const p of hParts) {
      const s = sideLimit(base(zoneIdOf(p.zone), { sideSet: 0, far: p.far }));
      if (s && s.limitAtFace < sideLim) {
        sideLim = s.limitAtFace;
        sideP = { rise: s.rise, slope: s.slope };
      }
    }
    if (new Set(hParts.map((p) => p.zone)).size > 1) unsure.push('敷地が 2 以上の地域にわたる: 本来は勾配の異なる地域ごとに測る(令 135 条の 6〜8 の各 2 項)。ここでは厳しい方の地域で全体を測った');
    const roadsM: SkyModel['roads'] = {};
    for (const [d, w] of roadDirs) {
      const r = roadLimit(base(frontZone, { roadW: w, roadSet: set[d] }));
      roadsM[d] = { width: w, park: 0, slope: r.slope, dist: r.dist, slope15From: r.slope15From, diff: 0 };
    }
    const model: SkyModel = {
      ew,
      ns,
      bldg: { x0: set.W, y0: set.S, x1: set.W + bw, y1: set.S + bd },
      height: 0,
      pent: pentRect && pentIn ? { r: { x0: set.W + pentRect.x0, y0: set.S + pentRect.y0, x1: set.W + pentRect.x1, y1: set.S + pentRect.y1 }, height: pentIn.height } : null,
      roads: roadsM,
      side: sideP ? { ...sideP, diff: 0 } : null,
      north: nb ? { rise: nb.rise, low: zoneOf(nb.zone).north === 5, diff: 0 } : null,
    };
    const preps = prepareSky(model);
    const run = (n: number) => {
      const ks = slopeKinds(n);
      const checks = evalSky(
        preps.filter((p) => ks.has(p.check.kind)),
        n * ftf + extra
      );
      const sh = shadowTest ? shadowTest(n) : null;
      return { n, ks, checks, skyOk: checks.every((c) => c.ok), shadowOk: sh ? sh.ok : true };
    };
    // 天空率は高さに対して単調(高いほど計画の天空率が下がる)なので二分探索
    let lo = floors;
    let hi = upper;
    let best: ReturnType<typeof run> | null = null;
    let firstFail: ReturnType<typeof run> | null = null;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      const t = run(mid);
      if (t.skyOk && t.shadowOk) {
        lo = mid;
        best = t;
      } else {
        hi = mid - 1;
        if (!firstFail || mid < firstFail.n) firstFail = t;
      }
    }
    // 画面に出す測定点の表: 通った最上階(なければ 1 階上で落ちた結果)
    const shown = best ?? firstFail ?? run(floors + 1);
    const capBy =
      lo >= floorsNeed ? '容積率を使い切る' : caps.length && lo >= upper ? '絶対高さ・高度地区で頭打ち' : firstFail && !firstFail.skyOk ? '天空率で頭打ち' : firstFail && !firstFail.shadowOk ? '日影で頭打ち' : '';
    sky = {
      floors: lo,
      gain: lo - floors,
      height: lo * ftf + extra,
      area: Math.min(farArea, footprint * (lo + B)),
      at: shown.n,
      checks: shown.checks,
      capBy,
      unsure: [...unsure, ...shown.checks.flatMap((c) => c.unsure)].filter((x, i, a) => a.indexOf(x) === i),
    };
  }

  const height = floors * ftf + extra;
  const achievable = Math.min(farArea, footprint * (floors + B));
  const usedFar = net > 0 ? (achievable / net) * 100 : 0;

  // --- 何が効くか ---
  let governing: VolumeOut['governing'];
  if (!(net > 0) || !(footprint > 0)) {
    governing = { key: 'none', text: '敷地面積と間口・奥行を入れてください', detail: '' };
  } else if (achievable >= farArea - 0.01) {
    const room = Number.isFinite(floorsByHeight) ? floorsByHeight - floorsNeed : null;
    governing = {
      key: 'far',
      text: 'この敷地では容積率が効く',
      detail: `地上 ${floorsNeed} 階で容積率 ${pct(far)} を使い切る。高さの制限には${room === null ? '余裕がある(高さの上限なし)' : room > 0 ? `あと ${room} 階分の余裕` : 'ちょうど収まる'}${by === 'bc' ? '。建築面積は建蔽率で決まる' : '。建築面積は後退距離と敷地の形で決まる(建蔽率に余り)'}`,
    };
  } else {
    const bind = constraints.reduce((a, c) => (c.floors < a.floors ? c : a));
    governing = {
      key: bind.key,
      text: `この敷地では${bind.label}が効く`,
      detail: `箱のままでは地上 ${floors} 階・容積率 ${pct(usedFar)} まで(限度 ${pct(far)} のうち ${f2(farArea - achievable)} m² が使えない)。${sky ? (sky.gain > 0 ? `天空率(法 56 条 7 項)なら箱のまま地上 ${sky.floors} 階まで(下の表)` : '箱のままでは天空率(法 56 条 7 項)でも階数は増えない。上階のセットバックで取り戻せる余地がある') : '上階のセットバック・天空率(法 56 条 7 項)で取り戻せる余地がある'}`,
    };
  }

  const rows: Row[] = [
    { k: '敷地面積(後退部分を除く)', v: setbackArea > 0 ? `${f2(gross)} − 後退 ${f2(setbackDepth)} × ${f2(v.siteWidth)} = ${f2(net)} m²` : `${f2(net)} m²`, basis: '令 2 条 1 項 1 号・法 42 条 2 項' },
    { k: '建蔽率(加重平均・緩和込み)', v: `${pct(bc)} → 建築面積の限度 ${f2(bcArea)} m²`, basis: '法 53 条 1〜3 項・6〜8 項' },
    { k: '容積率に使う前面道路の幅員', v: wa > 0 ? `${r2(wMax - wa)} + Wa ${f2(wa)} = ${f2(wMax)} m` : wMax >= 12 ? `${r2(wMax)} m(12m 以上: 道路による低減なし)` : `${r2(wMax)} m`, basis: wa > 0 ? '法 52 条 2 項・9 項・令 135 条の 18' : '法 52 条 2 項(2 以上なら最大の幅員)' },
    { k: '容積率(加重平均・道路で低減)', v: `${pct(far)} → 延べ面積の限度 ${f2(farArea)} m²`, basis: '法 52 条 1 項・2 項・7 項' },
    { k: '建物の平面(箱)', v: `${f2(bw)} × ${f2(bd)} = ${f2(footprint)} m²${by === 'bc' ? `(奥を ${f2(pull)} m 引いて建蔽率に合わせた)` : ''}`, basis: '長方形の近似' },
  ];

  return {
    ok: net > 0 && footprint > 0,
    warnings: [...warnings],
    site: { gross, setbackDepth, setbackArea, net },
    parts: parts.map((p, i) => ({ zone: p.zone, area: p.area, bc: p.bc, bcLimit: wl.rows[i].bcLimit, bcNote: wl.rows[i].bcNote, far: p.far, k: farRows[i].k, farLimit: farRows[i].farLimit, farNote: farRows[i].farNote })),
    bc,
    far,
    wMax,
    wa,
    deemedFire: wl.deemed,
    bcArea,
    farArea,
    plan: { ew, ns, set, bw, bd, rectArea, footprint, pull, by },
    faces,
    abs,
    kodo,
    hmax,
    constraints,
    floorsNeed,
    floorsByHeight: Number.isFinite(floorsByHeight) ? floorsByHeight : -1,
    floors,
    height,
    shadow,
    achievable,
    usedFar,
    pent: pentIn
      ? {
          area: pentIn.area,
          height: pentIn.height,
          limit: footprint / 8,
          within: pc('road').within,
          rows: (
            [
              ['道路・隣地斜線', 'road'],
              ['北側斜線', 'north'],
              ['絶対高さ', 'abs'],
              ['日影の対象(高さ 10m 超)', 'shadow10'],
              ['高度地区', 'kodo'],
            ] as [string, HeightUse][]
          ).map(([k, u]) => ({ k, counted: pc(u).counted, basis: pc(u).basis })),
        }
      : null,
    sky,
    governing,
    rows,
  };
}

/** このツールが見ていないもの(画面に必ず出す) */
export const NOT_CHECKED: string[] = [
  '天空率の細目: 前面道路が 2 以上・地域が 2 以上・高低差 3m 超のときの区域ごとの測り方(令 135 条の 6〜11 の各 2・3 項)。ここは長方形の敷地と箱 1 つで目安だけ',
  '日影の詳しい形(建物の形・配置・時刻ごとの等時間日影図)。ここは直方体の箱での目安だけ',
  '地区計画・建築協定・高度地区の斜線型の制限・景観地区・壁面線',
  '条例(建築安全条例の路地状敷地・窓先空地、ワンルーム条例、中高層条例、駐車場・緑化の附置義務)',
  '容積率の不算入(地階の住宅等 法 52 条 3 項、共同住宅の共用廊下・階段・昇降路 6 項、車庫等 令 2 条 3 項、備蓄倉庫・宅配ボックス等)と、住宅の容積率の緩和(52 条 8 項)',
  '塔屋の床面積の容積率への算入と、塔屋の位置(ここでは箱の中央に正方形で置く)。外壁の後退距離(法 54 条)、敷地面積の最低限度(法 53 条の 2)',
  '高低差・公園等の緩和(令 134 条・135 条の 2〜4)、セットバックした上階の形',
  '用途の制限(法 48 条)・防火の構造(法 61 条)・避難・採光',
];
