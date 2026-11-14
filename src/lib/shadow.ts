/**
 * 日影規制(設計ツール › 基本設計 › 日影規制)。2026-11-14
 *
 * 直方体の建物 1 棟が、冬至日の真太陽時 8〜16 時(北海道 9〜15 時)に測定面へ落とす日影の時間を、
 * 敷地の周りの格子点ごとに数え、敷地境界線から 5m を超え 10m 以内 / 10m を超える範囲の最大時間を規制時間と比べる。
 *
 * 規制値は建築基準法 別表第 4・第 56 条の 2(e-Gov、2026-05-27 施行版で確認)。
 * 太陽の位置は赤緯 −23.44°(冬至)と真太陽時の時角から計算する(均時差は真太陽時なので不要)。
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
};

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
  site: { x0: number; y0: number; x1: number; y1: number };
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
  const he = v.bh - v.plane;
  const site = { x0: -v.setW, y0: -v.setS, x1: v.bw + v.setE, y1: v.bd + v.setN };
  // 影がいちばん長い時刻(始まり)の長さで範囲を決める
  const s0 = sunAt(v.lat, t0);
  const maxLen = he > 0 && s0.alt > 0 ? he / Math.tan(s0.alt) : 0;
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
  if (he > 0) {
    const rot = v.rot * D2R;
    const base: Pt[] = [
      [0, 0],
      [v.bw, 0],
      [v.bw, v.bd],
      [0, v.bd],
    ];
    for (let t = t0 + DT / 2; t < t1; t += DT) {
      const s = sunAt(v.lat, t);
      if (s.alt <= 0) continue;
      const L = he / Math.tan(s.alt);
      // 影は太陽の反対へ。真北基準の方位(真南から西回り az)→ 敷地軸へ回す
      const sx = Math.sin(s.az) * L;
      const sy = Math.cos(s.az) * L;
      const ox = sx * Math.cos(rot) - sy * Math.sin(rot);
      const oy = sx * Math.sin(rot) + sy * Math.cos(rot);
      const poly = hull([...base, ...base.map(([x, y]) => [x + ox, y + oy] as Pt)]);
      const xs = poly.map((p) => p[0]);
      const ys = poly.map((p) => p[1]);
      const i0 = Math.max(0, Math.floor((Math.min(...xs) - gx0) / step));
      const i1 = Math.min(nx - 1, Math.ceil((Math.max(...xs) - gx0) / step));
      const j0 = Math.max(0, Math.floor((Math.min(...ys) - gy0) / step));
      const j1 = Math.min(ny - 1, Math.ceil((Math.max(...ys) - gy0) / step));
      for (let j = j0; j <= j1; j++) {
        const y = gy0 + (j + 0.5) * step;
        for (let i = i0; i <= i1; i++) {
          const x = gx0 + (i + 0.5) * step;
          if (inConvex(poly, x, y)) hours[j * nx + i] += DT;
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
  return { x0: gx0, y0: gy0, step, nx, ny, hours, dist, maxNear, maxFar, site, t0, t1 };
}

export const hm = (h: number) => {
  const m = Math.round(h * 60);
  return `${Math.floor(m / 60)} 時間 ${String(m % 60).padStart(2, '0')} 分`;
};
