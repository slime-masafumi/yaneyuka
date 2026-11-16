/**
 * 日影規制(設計ツール › 基本設計 › 日影規制)。2026-11-14
 *
 * 直方体の建物 1 棟が、冬至日の真太陽時 8〜16 時(北海道 9〜15 時)に測定面へ落とす日影の時間を、
 * 敷地の周りの格子点ごとに数え、敷地境界線から 5m を超え 10m 以内 / 10m を超える範囲の最大時間を規制時間と比べる。
 *
 * 規制値は建築基準法 別表第 4・第 56 条の 2(e-Gov、2026-05-27 施行版で確認)。
 * 太陽の位置は赤緯 −23.44°(冬至)と真太陽時の時角から計算する(均時差は真太陽時なので不要)。
 * 56 条の 2 第 1 項は「(に)欄の時間以上日影となる部分を生じさせない」なので、規制時間ちょうども不適合(画面側で >= で判定)。
 * 2026-11-16: 道路・水面・線路敷等の緩和と高低差の緩和(令 135 条の 12 第 3 項)を足した。
 * 2026-11-16: 塔屋の影(pent)と、日影時間の制限の異なる区域にまたがる場合(法 56 条の 2 第 5 項・令 135 条の 13、
 *   対象区域外の建物の影が対象区域に落ちる場合 同 4 項)を足した → computeShadowZones()。
 *   塔屋の高さは、規制の対象になるか(別表第 4(ろ)欄二・三・四の項ロの「高さ 10m 超」と 56 条の 2 第 4 項)では
 *   建築面積の 1/8 以内なら 5m まで算入しない(令 2 条 1 項 6 号ロ)。日影そのものは塔屋の影も含めて数える(実際に落ちる影)。
 */

export type ShadowZone = { id: string; label: string; item: string; applies: string; planes: number[]; rows: { go: string; near: number; far: number; nearH: number; farH: number }[] };

/** 別表第 4。near = 5m 超 10m 以内、far = 10m 超(時間)。nearH / farH は北海道 */
export const SHADOW_ZONES: ShadowZone[] = [
  {
    id: 'low',
    label: '第一種・第二種低層住居専用地域、田園住居地域',
    item: '一',
    applies: '軒高 7m 超、または地階を除く階数 3 以上',
    planes: [1.5],
    rows: [
      { go: '(一)', near: 3, far: 2, nearH: 2, farH: 1.5 },
      { go: '(二)', near: 4, far: 2.5, nearH: 3, farH: 2 },
      { go: '(三)', near: 5, far: 3, nearH: 4, farH: 2.5 },
    ],
  },
  {
    id: 'mid',
    label: '第一種・第二種中高層住居専用地域',
    item: '二',
    applies: '高さ 10m 超',
    planes: [4, 6.5],
    rows: [
      { go: '(一)', near: 3, far: 2, nearH: 2, farH: 1.5 },
      { go: '(二)', near: 4, far: 2.5, nearH: 3, farH: 2 },
      { go: '(三)', near: 5, far: 3, nearH: 4, farH: 2.5 },
    ],
  },
  {
    id: 'res',
    label: '第一種・第二種住居地域、準住居地域、近隣商業地域、準工業地域',
    item: '三',
    applies: '高さ 10m 超',
    planes: [4, 6.5],
    rows: [
      { go: '(一)', near: 4, far: 2.5, nearH: 3, farH: 2 },
      { go: '(二)', near: 5, far: 3, nearH: 4, farH: 2.5 },
    ],
  },
  {
    id: 'none-i',
    label: '用途地域の指定のない区域(イ)',
    item: '四イ',
    applies: '軒高 7m 超、または地階を除く階数 3 以上',
    planes: [1.5],
    rows: [
      { go: '(一)', near: 3, far: 2, nearH: 2, farH: 1.5 },
      { go: '(二)', near: 4, far: 2.5, nearH: 3, farH: 2 },
      { go: '(三)', near: 5, far: 3, nearH: 4, farH: 2.5 },
    ],
  },
  {
    id: 'none-ro',
    label: '用途地域の指定のない区域(ロ)',
    item: '四ロ',
    applies: '高さ 10m 超',
    planes: [4],
    rows: [
      { go: '(一)', near: 3, far: 2, nearH: 2, farH: 1.5 },
      { go: '(二)', near: 4, far: 2.5, nearH: 3, farH: 2 },
      { go: '(三)', near: 5, far: 3, nearH: 4, farH: 2.5 },
    ],
  },
];

export const CITIES: { label: string; lat: number; hokkaido?: boolean }[] = [
  { label: '札幌', lat: 43.06, hokkaido: true },
  { label: '仙台', lat: 38.27 },
  { label: '東京', lat: 35.68 },
  { label: '名古屋', lat: 35.18 },
  { label: '大阪', lat: 34.69 },
  { label: '広島', lat: 34.39 },
  { label: '福岡', lat: 33.59 },
  { label: '那覇', lat: 26.21 },
];

const D2R = Math.PI / 180;
const DECL = -23.44 * D2R;

/** 冬至日の真太陽時 t(時)の太陽高度(rad)と方位角(真南から西回りを正、rad) */
export function sunAt(latDeg: number, t: number): { alt: number; az: number } {
  const phi = latDeg * D2R;
  const w = (t - 12) * 15 * D2R;
  const sinAlt = Math.sin(phi) * Math.sin(DECL) + Math.cos(phi) * Math.cos(DECL) * Math.cos(w);
  const alt = Math.asin(sinAlt);
  // 方位角(南 = 0、西 = 正)
  const az = Math.atan2(Math.sin(w), Math.cos(w) * Math.sin(phi) - Math.tan(DECL) * Math.cos(phi));
  return { alt, az };
}

type Pt = [number, number];

/** 凸包(Andrew の単調連鎖) */
function hull(ps: Pt[]): Pt[] {
  const p = [...ps].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: Pt[] = [];
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up: Pt[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

function inConvex(poly: Pt[], x: number, y: number): boolean {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    const c = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (c !== 0) {
      const s = c > 0 ? 1 : -1;
      if (sign === 0) sign = s;
      else if (s !== sign) return false;
    }
  }
  return true;
}

export type ShadowIn = {
  lat: number;
  hokkaido: boolean;
  /** 建物 東西の幅・南北の奥行き・平均地盤面からの高さ(m) */
  bw: number;
  bd: number;
  bh: number;
  /** 建物(と敷地)の向き。真北に対して時計回りに何度回っているか */
  rot: number;
  /** 測定面の高さ(m) */
  plane: number;
  /** 建物から敷地境界線までの距離(北・東・南・西、m) */
  setN: number;
  setE: number;
  setS: number;
  setW: number;
  /** 敷地が接する道路・水面・線路敷等の幅(北・東・南・西、m。0 = なし)。令 135 条の 12 第 3 項 1 号 */
  wayN?: number;
  wayE?: number;
  wayS?: number;
  wayW?: number;
  /** 隣地(日影の生ずる土地)の地盤面 − 敷地の平均地盤面(m)。1m 以上で平均地盤面を(差 − 1)/ 2 高くみなす(同 2 号) */
  diff?: number;
  /** 塔屋(建物と同じ軸。x0..x1 × y0..y1 は建物の南西の角から・h は屋上からの高さ) */
  pent?: { x0: number; y0: number; x1: number; y1: number; h: number } | null;
  /** 格子の範囲を決める測定面の高さ(2 つの測定面で同じ格子にそろえるとき。既定 = plane) */
  gridPlane?: number;
};

/**
 * 令 135 条の 12 第 3 項 1 号: 道路・水面・線路敷等に接する敷地境界線は、その幅の 1/2 外側にあるとみなす。
 * 幅が 10m を超えるときは、反対側の境界線から敷地側へ 5m の線を敷地境界線とみなす(= 幅 − 5 だけ外側)。
 */
export const wayOffset = (w: number | undefined) => (w && w > 0 ? (w > 10 ? w - 5 : w / 2) : 0);
/** 同 2 号: 高低差 1m 以上のとき (高低差 − 1)/ 2 */
export const diffRaiseShadow = (d: number | undefined) => (d !== undefined && d >= 1 ? (d - 1) / 2 : 0);

export type ShadowOut = {
  /** 格子の左下(敷地座標)と間隔、列・行数、各点の日影時間(時) */
  x0: number;
  y0: number;
  step: number;
  nx: number;
  ny: number;
  hours: Float32Array;
  /** 敷地境界線からの距離(m) */
  dist: Float32Array;
  maxNear: number;
  maxFar: number;
  /** 5m・10m を測る敷地境界線(道路・水面等の緩和でみなした線) */
  site: { x0: number; y0: number; x1: number; y1: number };
  /** 実際の敷地 */
  real: { x0: number; y0: number; x1: number; y1: number };
  t0: number;
  t1: number;
};

const DT = 10 / 60; // 10 分刻み

/**
 * 座標は敷地(建物)に沿った軸: x = 建物の幅方向(回転 0 のとき東)、y = 奥行き方向(回転 0 のとき北)。
 * 建物の南西の角を原点に置く。
 */
export function computeShadow(v: ShadowIn): ShadowOut {
  const t0 = v.hokkaido ? 9 : 8;
  const t1 = v.hokkaido ? 15 : 16;
  // 高低差の緩和: 平均地盤面を高くみなす = 建物の高さが減ったのと同じ
  const he = v.bh - v.plane - diffRaiseShadow(v.diff);
  // 5m・10m の線を測る敷地境界線(道路・水面等の緩和でみなした線)
  const site = {
    x0: -v.setW - wayOffset(v.wayW),
    y0: -v.setS - wayOffset(v.wayS),
    x1: v.bw + v.setE + wayOffset(v.wayE),
    y1: v.bd + v.setN + wayOffset(v.wayN),
  };
  // 影がいちばん長い時刻(始まり)の長さで範囲を決める
  const s0 = sunAt(v.lat, t0);
  const pentH = v.pent && v.pent.h > 0 ? v.pent.h : 0;
  const heGrid = v.bh + pentH - (v.gridPlane ?? v.plane) - diffRaiseShadow(v.diff);
  const maxLen = heGrid > 0 && s0.alt > 0 ? heGrid / Math.tan(s0.alt) : 0;
  const reach = Math.min(Math.max(maxLen, 15), 200);
  const gx0 = site.x0 - reach - 2;
  const gx1 = site.x1 + reach + 2;
  const gy0 = site.y0 - 15;
  const gy1 = site.y1 + reach + 2;
  const area = (gx1 - gx0) * (gy1 - gy0);
  const step = Math.max(0.5, Math.ceil(Math.sqrt(area / 45000) * 2) / 2);
  const nx = Math.ceil((gx1 - gx0) / step);
  const ny = Math.ceil((gy1 - gy0) / step);
  const hours = new Float32Array(nx * ny);
  const dist = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const x = gx0 + (i + 0.5) * step;
      const y = gy0 + (j + 0.5) * step;
      const dx = Math.max(site.x0 - x, 0, x - site.x1);
      const dy = Math.max(site.y0 - y, 0, y - site.y1);
      dist[j * nx + i] = Math.hypot(dx, dy);
    }
  }
  // 影を落とす直方体: [平面の 4 隅, 下端の測定面からの高さ, 上端の測定面からの高さ]
  const boxes: { base: Pt[]; zb: number; zt: number }[] = [];
  const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
  if (he > 0) boxes.push({ base: rect(0, 0, v.bw, v.bd), zb: 0, zt: he });
  if (v.pent && pentH > 0 && he + pentH > 0) boxes.push({ base: rect(v.pent.x0, v.pent.y0, v.pent.x1, v.pent.y1), zb: Math.max(0, he), zt: he + pentH });
  if (boxes.length) {
    const rot = v.rot * D2R;
    // 同じ時刻に 2 つの影が重なった点を 2 度数えない
    const stamp = new Int32Array(nx * ny).fill(-1);
    let ti = 0;
    for (let t = t0 + DT / 2; t < t1; t += DT, ti++) {
      const s = sunAt(v.lat, t);
      if (s.alt <= 0) continue;
      // 影は太陽の反対へ。真北基準の方位(真南から西回り az)→ 敷地軸へ回す
      const ux = Math.sin(s.az) / Math.tan(s.alt);
      const uy = Math.cos(s.az) / Math.tan(s.alt);
      const ox1 = ux * Math.cos(rot) - uy * Math.sin(rot);
      const oy1 = ux * Math.sin(rot) + uy * Math.cos(rot);
      for (const b of boxes) {
        const poly = hull([...b.base.map(([x, y]) => [x + ox1 * b.zb, y + oy1 * b.zb] as Pt), ...b.base.map(([x, y]) => [x + ox1 * b.zt, y + oy1 * b.zt] as Pt)]);
        const xs = poly.map((p) => p[0]);
        const ys = poly.map((p) => p[1]);
        const i0 = Math.max(0, Math.floor((Math.min(...xs) - gx0) / step));
        const i1 = Math.min(nx - 1, Math.ceil((Math.max(...xs) - gx0) / step));
        const j0 = Math.max(0, Math.floor((Math.min(...ys) - gy0) / step));
        const j1 = Math.min(ny - 1, Math.ceil((Math.max(...ys) - gy0) / step));
        for (let j = j0; j <= j1; j++) {
          const y = gy0 + (j + 0.5) * step;
          for (let i = i0; i <= i1; i++) {
            const k = j * nx + i;
            if (stamp[k] === ti) continue;
            const x = gx0 + (i + 0.5) * step;
            if (inConvex(poly, x, y)) {
              hours[k] += DT;
              stamp[k] = ti;
            }
          }
        }
      }
    }
  }
  let maxNear = 0;
  let maxFar = 0;
  for (let k = 0; k < hours.length; k++) {
    const d = dist[k];
    if (d > 10) maxFar = Math.max(maxFar, hours[k]);
    else if (d > 5) maxNear = Math.max(maxNear, hours[k]);
  }
  const real = { x0: -v.setW, y0: -v.setS, x1: v.bw + v.setE, y1: v.bd + v.setN };
  return { x0: gx0, y0: gy0, step, nx, ny, hours, dist, maxNear, maxFar, site, real, t0, t1 };
}

export const hm = (h: number) => {
  const m = Math.round(h * 60);
  return `${Math.floor(m / 60)} 時間 ${String(m % 60).padStart(2, '0')} 分`;
};

// ─────────────────────────────────────────────────────────────────────────────
// 日影時間の制限の異なる区域にまたがる場合(法 56 条の 2 第 4 項・第 5 項・令 135 条の 13)
// ─────────────────────────────────────────────────────────────────────────────

/** 区域の規制。group = SHADOW_ZONES の id、'out' = 対象区域外(商業地域など・条例で指定のない区域) */
export type AreaRule = { group: string; go: string; plane: number };
/**
 * 区域の境界線。敷地(実際の境界線)の dir 側に、境界線から dist(m)離れた直線で区域が分かれ、その外側が 2 つ目の区域。
 * dist が負なら敷地の内側(建物が区域の内外にわたる)
 */
export type ZoneSplit = { dir: 'N' | 'E' | 'S' | 'W'; dist: number };

export const LOW_GROUPS = ['low', 'none-i'];

export type ZoneResult = {
  rule: AreaRule;
  label: string;
  item: string;
  /** 規制時間(対象区域外なら null) */
  near: number | null;
  far: number | null;
  plane: number;
  /** この区域の規制がかかるか */
  applies: boolean;
  /** その区域の別表第 4(ろ)欄だけで見たとき対象か */
  ownCovered: boolean;
  maxNear: number;
  maxFar: number;
  ngNear: boolean;
  ngFar: boolean;
};

export type ShadowZonesOut = {
  /** 測定面ごとに数えた日影時間を、点の区域で選んで 1 枚にしたもの */
  out: ShadowOut;
  /** 各点の区域(0 = 敷地のある区域、1 = 2 つ目の区域) */
  zoneIdx: Uint8Array;
  zones: ZoneResult[];
  /** 令 135 条の 13 の対象建築物(56 条の 2 第 4 項の 10m 超を含む) */
  target: boolean;
  unsure: string[];
};

export function inSplit(split: ZoneSplit, real: ShadowOut['real'], x: number, y: number): boolean {
  if (split.dir === 'N') return y > real.y1 + split.dist;
  if (split.dir === 'S') return y < real.y0 - split.dist;
  if (split.dir === 'E') return x > real.x1 + split.dist;
  return x < real.x0 - split.dist;
}

/**
 * 区域ごとに規制時間・測定面を当てて日影時間の最大を出す。
 *   eave = 軒の高さ(m)、floors3 = 地階を除く階数 3 以上、h10 = 「高さ 10m 超」を判定する高さ(塔屋 1/8 以内なら 5m まで不算入した値)
 *   敷地のある区域: その区域の(ろ)欄で対象なら規制
 *   2 つ目の区域: 令 135 条の 13 の対象建築物(低層・無指定イの区域内で軒高 7m 超 / 3 階以上、または高さ 10m 超)なら、
 *     その区域に建物があるものとして、その区域の規制時間・測定面を当てる。敷地が対象区域外なら 56 条の 2 第 4 項(高さ 10m 超)
 *   5m・10m の線は、どちらの区域でも敷地境界線(道路等の緩和でみなした線)から測る(56 条の 2 第 1 項)
 */
export function computeShadowZones(v: ShadowIn, a: AreaRule, b: AreaRule | null, split: ZoneSplit | null, hokkaido: boolean, opt: { eave: number; floors3: boolean; h10: number }): ShadowZonesOut {
  const rules = b && split ? [a, b] : [a];
  const zoneOfRule = (r: AreaRule) => SHADOW_ZONES.find((z) => z.id === r.group) ?? null;
  const covers = (g: string | null) => (g === null ? false : LOW_GROUPS.includes(g) ? opt.eave > 7 || opt.floors3 : opt.h10 > 10);
  const za = zoneOfRule(a);
  const target = (za !== null && LOW_GROUPS.includes(za.id) && (opt.eave > 7 || opt.floors3)) || opt.h10 > 10;
  const planes = rules.map((r) => {
    const z = zoneOfRule(r);
    return z ? (z.planes.includes(r.plane) ? r.plane : z.planes[0]) : null;
  });
  const realPlanes = planes.filter((p): p is number => p !== null);
  const gridPlane = realPlanes.length ? Math.min(...realPlanes) : 0;
  const runs = new Map<number, ShadowOut>();
  const run = (p: number) => {
    if (!runs.has(p)) runs.set(p, computeShadow({ ...v, plane: p, gridPlane }));
    return runs.get(p)!;
  };
  const base = run(planes[0] ?? planes[1] ?? gridPlane);
  const n = base.nx * base.ny;
  const zoneIdx = new Uint8Array(n);
  const hours = new Float32Array(n);
  const unsure: string[] = [];
  if (split && b) {
    for (let j = 0; j < base.ny; j++) {
      for (let i = 0; i < base.nx; i++) {
        const x = base.x0 + (i + 0.5) * base.step;
        const y = base.y0 + (j + 0.5) * base.step;
        if (inSplit(split, base.real, x, y)) zoneIdx[j * base.nx + i] = 1;
      }
    }
  }
  const zones: ZoneResult[] = rules.map((r, zi) => {
    const z = zoneOfRule(r);
    const row = z ? (z.rows.find((x) => x.go === r.go) ?? z.rows[0]) : null;
    const ownCovered = covers(z?.id ?? null);
    const applies = z !== null && (zi === 0 ? ownCovered : target);
    if (zi === 1 && applies && !ownCovered) unsure.push(`2 つ目の区域(${z!.label})の(ろ)欄だけで見ると対象外の建物です。令 135 条の 13 で対象建築物としてその区域の規制を当てています`);
    const plane = planes[zi] ?? gridPlane;
    const src = z ? run(plane) : base;
    let maxNear = 0;
    let maxFar = 0;
    for (let k = 0; k < n; k++) {
      if (zoneIdx[k] !== zi) continue;
      const h = src.hours[k];
      hours[k] = h;
      const d = base.dist[k];
      if (d > 10) maxFar = Math.max(maxFar, h);
      else if (d > 5) maxNear = Math.max(maxNear, h);
    }
    const near = row ? (hokkaido ? row.nearH : row.near) : null;
    const far = row ? (hokkaido ? row.farH : row.far) : null;
    return {
      rule: r,
      label: z ? z.label : '対象区域外',
      item: z ? z.item : '',
      near,
      far,
      plane,
      applies,
      ownCovered,
      maxNear,
      maxFar,
      // 56 条の 2: 規制時間「以上」日影となる部分を生じさせない(ちょうども不適合)
      ngNear: applies && near !== null && maxNear >= near - 1e-6,
      ngFar: applies && far !== null && maxFar >= far - 1e-6,
    };
  });
  return { out: { ...base, hours }, zoneIdx, zones, target, unsure };
}
