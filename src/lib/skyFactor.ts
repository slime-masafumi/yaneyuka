/**
 * 天空率(法 56 条 7 項・令 135 条の 5〜135 条の 11)。2026-11-16
 *
 * 斜線制限・ボリューム検討の「斜線を超える箱でも、天空率で適合させられるか」を数値計算で確かめる。
 * 条文は e-Gov の現行本文(施行令 325CO0000000338・建築基準法 325AC0000000201)で 2026-11-16 に照合した。
 *
 *   天空率 Rs =(As − Ab)/ As(令 135 条の 5)
 *     As = 測定点を中心とする想定半球の水平投影面積、Ab = 建築物と敷地の地盤を想定半球に投影した面の水平投影面積
 *     → 水平投影 = 正射影。方位 φ・仰角 α の点は半径 cos α の位置に写る
 *   比べ方(令 135 条の 6・7・8): 計画建築物の天空率 ≥ 適合建築物(その斜線にちょうど合う建築物)の天空率 を、すべての測定点で満たす
 *     道路: 適合建築物は道路高さ制限が適用される範囲内の部分に限り、階段室等(塔屋 1/8 以内の頂部から 12m)と棟飾等を除く(135 条の 6 第 1 項 1 号)
 *           計画建築物の後退距離 ≥ 適合建築物の後退距離(同 2 号)→ 適合建築物は計画と同じ後退距離で想定する
 *     隣地: 適合建築物は階段室等・棟飾等を除く(135 条の 7 第 1 項 1 号)。立上りを超える部分の後退距離も同じにそろえる(同 2 号)
 *     北側: 適合建築物は棟飾等だけを除く(135 条の 8 第 1 項。塔屋は除かない)
 *   測定点
 *     道路(135 条の 9): 前面道路の路面の中心の高さで、反対側の境界線上。敷地の前面道路に面する部分の両端から最も近い位置と、
 *           その間に道路幅員の 1/2 以内の間隔で均等に。敷地が道路より 1m 以上高いと、路面の中心を(差 − 1)/ 2 高くみなす(4 項)
 *     隣地(135 条の 10・法 56 条 7 項 2 号): 敷地の地盤面の高さで、隣地境界線から 16m(勾配 1.25)/ 12.4m(勾配 2.5)外側の線上。
 *           両端と、その間に 8m / 6.2m 以内の間隔で均等に。敷地が隣地より 1m 以上低いと、地盤面を(差 − 1)/ 2 高くみなす(4 項)
 *     北側(135 条の 11・法 56 条 7 項 3 号): 敷地の地盤面の高さで、隣地境界線から真北方向へ 4m(低層・田園)/ 8m(中高層)外側の線上。
 *           両端と、その間に 1m / 2m 以内の間隔で均等に。北側の隣地より 1m 以上低いと(差 − 1)/ 2 高くみなす(4 項)
 *
 * 計算方法(数値積分):
 *   箱(直方体)と斜線の形(面ごとに平らな屋根の集まり)は、どの方位 φ についても「地面から最大仰角 αmax(φ) まで」がふさがる。
 *   正射影では半径 cos αmax 〜 1 の環がふさがるので、Ab / As = (1 / 2π) ∫ sin² αmax(φ) dφ(仰角方向は厳密)。
 *   方位方向だけを数値積分する。立体の角と屋根の折れ線の端の方位で区間を切り(そこで αmax が飛ぶ)、各区間を
 *   幅 2 × 360° / SKY_DIV 以下の小区間に分けて 2 点ガウス・ルジャンドル則で積分する(既定 SKY_DIV = 3600 → 小区間 0.2°・1 点あたり約 3600 方位)。
 *   αmax は、その方位の半直線が立体の平面形に入る点・出る点と、屋根の折れ線(斜線の勾配が変わる線・隣地斜線どうしが交わる線)を
 *   横切る点だけで調べれば足りる(屋根が平面の区間では 高さ / 距離 が単調なので、区間の端で最大になる)。
 *   誤差の目安: 箱 1 つを式で解いた値(scripts/test-setback-sky.mjs)との差は 1 × 10⁻⁷ 以下。区間を切らない 0.1° 刻みの中点則だと 1.5 × 10⁻⁴ あった。
 *   残る誤差は区間の中で αmax の取り方が入れ替わる折れ(滑らかでない点)によるもので、1 × 10⁻⁶ 程度と見込む。
 *   画面では、計画と適合の差が SKY_TOL(0.01 ポイント)未満なら「要確認(誤差の範囲)」にする。
 * 近似(画面にも書く): 敷地は長方形、建物は直方体 1 つ(と塔屋の直方体 1 つ)。敷地の地盤は平ら。
 *   前面道路が 2 以上のとき、本来は令 132 条の区域ごとに測る(135 条の 6 第 3 項・135 条の 9 第 3 項)が、ここでは道路ごとにその道路の幅員で測る(要確認)。
 */

export type SkyDir = 'N' | 'E' | 'S' | 'W';
export type Rect = { x0: number; y0: number; x1: number; y1: number };
/** a·x + b·y = c の直線(屋根の折れ線) */
type Line = { a: number; b: number; c: number };
/** 平面形が長方形の立体。z = 測定点の高さを 0 とした屋根の高さ(平面の位置の関数)。lines = 屋根が折れる・段が付く線 */
export type Solid = { r: Rect; z: (x: number, y: number) => number; lines?: Line[] };

/** 方位方向の分割の細かさ(360° / SKY_DIV の 2 倍が小区間の幅の上限) */
export const SKY_DIV = 3600;
/** これより差が小さいと「要確認(誤差の範囲)」。0.0001 = 0.01 ポイント */
export const SKY_TOL = 0.0001;

const EPS = 1e-7;

/** 半直線 p + t·d が長方形に入る・出る t(入らなければ null) */
function slab(px: number, py: number, dx: number, dy: number, r: Rect): [number, number] | null {
  let t0 = 0;
  let t1 = Infinity;
  if (Math.abs(dx) < 1e-12) {
    if (px < r.x0 || px > r.x1) return null;
  } else {
    let a = (r.x0 - px) / dx;
    let b = (r.x1 - px) / dx;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
  }
  if (Math.abs(dy) < 1e-12) {
    if (py < r.y0 || py > r.y1) return null;
  } else {
    let a = (r.y0 - py) / dy;
    let b = (r.y1 - py) / dy;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
  }
  return t1 > t0 + EPS ? [t0, t1] : null;
}

/**
 * 点 (px, py) の天空率。solids の高さは測定点の高さを 0 とする。n = 方位方向の分割数。
 * Rs = 1 − (1 / n) Σ sin² αmax(φk)(φk = 2π(k + 0.5)/ n)
 */
export function skyFactorAt(px: number, py: number, solids: Solid[], n = SKY_DIV): number {
  // 方位の区切り: 立体の角と、屋根の折れ線が平面形の縁と交わる点の方位。ここで αmax が飛ぶ(見えなくなる)ので、
  // 区切りの間ごとに 2 点ガウス・ルジャンドルの複合則で積分する(区切りをまたがないので、飛びによる誤差が出ない)
  const TAU = 2 * Math.PI;
  const angs = [0, TAU];
  const ang = (x: number, y: number) => {
    const a = Math.atan2(x - px, y - py);
    return a < 0 ? a + TAU : a;
  };
  for (const s of solids) {
    const r = s.r;
    angs.push(ang(r.x0, r.y0), ang(r.x1, r.y0), ang(r.x1, r.y1), ang(r.x0, r.y1));
    for (const l of s.lines ?? []) {
      if (Math.abs(l.b) > 1e-12) {
        for (const x of [r.x0, r.x1]) {
          const y = (l.c - l.a * x) / l.b;
          if (y >= r.y0 && y <= r.y1) angs.push(ang(x, y));
        }
      }
      if (Math.abs(l.a) > 1e-12) {
        for (const y of [r.y0, r.y1]) {
          const x = (l.c - l.b * y) / l.a;
          if (x >= r.x0 && x <= r.x1) angs.push(ang(x, y));
        }
      }
    }
  }
  angs.sort((a, b) => a - b);
  const g = 1 / Math.sqrt(3) / 2;
  const cell = TAU / n;
  let sum = 0;
  for (let i = 0; i + 1 < angs.length; i++) {
    const w = angs[i + 1] - angs[i];
    if (w < 1e-12) continue;
    const m = Math.max(1, Math.ceil(w / (2 * cell)));
    const h = w / m;
    for (let j = 0; j < m; j++) {
      const c = angs[i] + (j + 0.5) * h;
      sum += (h / 2) * (blockedAt(px, py, solids, c - g * h) + blockedAt(px, py, solids, c + g * h));
    }
  }
  return 1 - sum / TAU;
}

/** 方位 phi(真北 = +y から時計回り)で、ふさがる部分の sin² αmax */
function blockedAt(px: number, py: number, solids: Solid[], phi: number): number {
  const dx = Math.sin(phi);
  const dy = Math.cos(phi);
  let best = 0; // tan αmax
  let full = false;
  for (const s of solids) {
    const tt = slab(px, py, dx, dy, s.r);
    if (!tt) continue;
    const [tin, tout] = tt;
    if (tin <= EPS) {
      // 測定点が立体の平面形の中(ふつうは起きない)
      if (s.z(px, py) > 0) {
        full = true;
        break;
      }
    }
    const ts = [tin + 1e-6, tout - 1e-6];
    for (const l of s.lines ?? []) {
      const den = l.a * dx + l.b * dy;
      if (Math.abs(den) < 1e-12) continue;
      const t = (l.c - l.a * px - l.b * py) / den;
      if (t > tin && t < tout) ts.push(t - 1e-6, t + 1e-6);
    }
    for (const t0 of ts) {
      const t = Math.min(Math.max(t0, tin + 1e-6), tout - 1e-6);
      if (t <= 0) continue;
      const z = s.z(px + t * dx, py + t * dy);
      if (z > 0) {
        const tan = z / t;
        if (tan > best) best = tan;
      }
    }
  }
  return full ? 1 : (best * best) / (1 + best * best);
}

// ─────────────────────────────────────────────────────────────────────────────
// 長方形の敷地(x = 東、y = 北。敷地の南西の角が原点)での道路・隣地・北側の天空率
// ─────────────────────────────────────────────────────────────────────────────

export type SkyRoad = {
  width: number;
  /** 反対側の公園・広場・水面等の幅(令 134 条 1 項) */
  park: number;
  /** 道路斜線(roadLimit の結果をそのまま) */
  slope: number;
  dist: number;
  slope15From: number | null;
  /** 敷地の地盤面 − 前面道路の路面の中心(m) */
  diff: number;
};

export type SkyModel = {
  /** 敷地 東西・南北(m) */
  ew: number;
  ns: number;
  /** 建物の平面と高さ(敷地の地盤面から・m) */
  bldg: Rect;
  height: number;
  /** 塔屋の平面と、屋上からの高さ */
  pent: { r: Rect; height: number } | null;
  roads: Partial<Record<SkyDir, SkyRoad>>;
  /** 隣地斜線(道路でない辺すべて)。diff = 隣地の地盤面 − 敷地の地盤面 */
  side: { rise: number; slope: number; diff: number } | null;
  /** 北側斜線。low = 低層住居専用・田園(4m・1m 間隔)/ false = 中高層(8m・2m 間隔)。diff = 北側の隣地 − 敷地 */
  north: { rise: number; low: boolean; diff: number } | null;
  n?: number;
};

export type SkyPoint = { x: number; y: number; fit: number; plan: number };
export type SkyCheck = {
  kind: 'road' | 'side' | 'north';
  dir: SkyDir;
  /** 測定点の線・間隔の説明 */
  line: string;
  basis: string;
  points: SkyPoint[];
  ok: boolean;
  /** min(計画 − 適合)。負なら不適合 */
  margin: number;
  /** いちばん差の小さい点 */
  worst: number;
  /** 差が誤差の範囲(要確認) */
  close: boolean;
  unsure: string[];
  /** 測らなかった理由(適用距離の外など) */
  skipped?: string;
};

const DIRS: SkyDir[] = ['N', 'E', 'S', 'W'];
const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
/** 令 135 条の 9〜11 の 4 項: 高低差 1m 以上で (差 − 1)/ 2 */
const raiseOf = (d: number) => (d >= 1 ? (d - 1) / 2 : 0);

/** 辺 dir の境界線から敷地の内側へ測った距離 = ax·x + ay·y + c */
function inwardCoef(m: { ew: number; ns: number }, dir: SkyDir): { ax: number; ay: number; c: number } {
  if (dir === 'S') return { ax: 0, ay: 1, c: 0 };
  if (dir === 'N') return { ax: 0, ay: -1, c: m.ns };
  if (dir === 'W') return { ax: 1, ay: 0, c: 0 };
  return { ax: -1, ay: 0, c: m.ew };
}
const inward = (m: { ew: number; ns: number }, dir: SkyDir, x: number, y: number) => {
  const k = inwardCoef(m, dir);
  return k.ax * x + k.ay * y + k.c;
};
/** 内側への距離 = d の直線 */
function lineAt(m: { ew: number; ns: number }, dir: SkyDir, d: number): Line {
  const k = inwardCoef(m, dir);
  return { a: k.ax, b: k.ay, c: d - k.c };
}
/** 長方形を「辺 dir から内側へ lo〜hi」に切る */
function clip(m: { ew: number; ns: number }, r: Rect, dir: SkyDir, lo: number, hi: number): Rect | null {
  const o = { ...r };
  if (dir === 'S') {
    o.y0 = Math.max(o.y0, lo);
    o.y1 = Math.min(o.y1, hi);
  } else if (dir === 'N') {
    o.y1 = Math.min(o.y1, m.ns - lo);
    o.y0 = Math.max(o.y0, m.ns - hi);
  } else if (dir === 'W') {
    o.x0 = Math.max(o.x0, lo);
    o.x1 = Math.min(o.x1, hi);
  } else {
    o.x1 = Math.min(o.x1, m.ew - lo);
    o.x0 = Math.max(o.x0, m.ew - hi);
  }
  return o.x1 > o.x0 + EPS && o.y1 > o.y0 + EPS ? o : null;
}
/** 建物から辺 dir の境界線までの距離 */
function setOf(m: SkyModel, dir: SkyDir): number {
  const b = m.bldg;
  if (dir === 'S') return b.y0;
  if (dir === 'N') return m.ns - b.y1;
  if (dir === 'W') return b.x0;
  return m.ew - b.x1;
}
/** 辺 dir から外側へ q の線の上に、両端を含め spacing 以内の間隔で均等に並べた点 */
function pointsOn(m: SkyModel, dir: SkyDir, q: number, spacing: number): { x: number; y: number }[] {
  const L = dir === 'N' || dir === 'S' ? m.ew : m.ns;
  const cnt = Math.max(1, Math.ceil(L / spacing - 1e-9));
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= cnt; i++) {
    const s = (L * i) / cnt;
    if (dir === 'S') out.push({ x: s, y: -q });
    else if (dir === 'N') out.push({ x: s, y: m.ns + q });
    else if (dir === 'W') out.push({ x: -q, y: s });
    else out.push({ x: m.ew + q, y: s });
  }
  return out;
}

export const DIR_JA: Record<SkyDir, string> = { N: '北', E: '東', S: '南', W: '西' };

type Prep = {
  check: Omit<SkyCheck, 'points' | 'ok' | 'margin' | 'worst' | 'close'>;
  pts: { x: number; y: number; fit: number }[];
  /** 計画建築物の立体(高さ h・塔屋込み) */
  plan: (h: number) => Solid[];
};

/** 適合建築物の天空率を先に出しておく(建物の高さを変えて何度も試すため) */
export function prepareSky(m: SkyModel): Prep[] {
  const n = m.n ?? SKY_DIV;
  const site: Rect = { x0: 0, y0: 0, x1: m.ew, y1: m.ns };
  const preps: Prep[] = [];
  const roadDirs = DIRS.filter((d) => m.roads[d]);
  const pentSolid = (r: Rect | null, top: number): Solid[] => (r && m.pent && m.pent.height > 0 ? [{ r, z: () => top + m.pent!.height }] : []);

  // --- 道路(令 135 条の 6・135 条の 9) ---
  for (const d of roadDirs) {
    const R = m.roads[d]!;
    const a = Math.max(0, setOf(m, d));
    const q = pos(R.width) + pos(R.park);
    const raise = raiseOf(R.diff);
    const zg = R.diff - raise; // 測定点から見た敷地の地盤面の高さ
    const rangeEnd = R.dist - q - a; // 内側への距離で、ここまでが道路高さ制限の適用範囲
    const unsure: string[] = [];
    if (roadDirs.length > 1) unsure.push('前面道路が 2 以上: 本来は令 132 条の区域ごとに測る(令 135 条の 6 第 3 項・135 条の 9 第 3 項)。ここでは道路ごとにその道路の幅員で測った');
    if (R.park > 0) unsure.push('公園等があるときの測定点を、公園等の反対側の境界線上に置いた(令 134 条 1 項のみなし)');
    const base = {
      kind: 'road' as const,
      dir: d,
      line: `${DIR_JA[d]}の道路の反対側の境界線上・路面の中心${raise > 0 ? ` + ${raise.toFixed(2)}m` : ''}・間隔 ${(R.width / 2).toFixed(2)}m 以内`,
      basis: '法 56 条 7 項 1 号・令 135 条の 6・135 条の 9',
      unsure,
    };
    if (!(R.width > 0) || rangeEnd <= a + EPS) {
      preps.push({ check: { ...base, skipped: '建物の面が適用距離の外(道路斜線がかからない)' }, pts: [], plan: () => [] });
      continue;
    }
    const ground: Solid[] = zg > 0 ? [{ r: site, z: () => zg }] : [];
    const fitRect = clip(m, site, d, a, rangeEnd);
    const k15 = R.slope15From;
    const fit: Solid[] = [...ground];
    if (fitRect) {
      fit.push({
        r: fitRect,
        z: (x, y) => {
          const xs = inward(m, d, x, y) + q + a; // 起点からの水平距離
          return (k15 !== null && xs >= k15 ? 1.5 : R.slope) * xs;
        },
        lines: k15 !== null ? [lineAt(m, d, k15 - q - a)] : [],
      });
    }
    const bRect = clip(m, m.bldg, d, 0, rangeEnd);
    const pRect = m.pent ? clip(m, m.pent.r, d, 0, rangeEnd) : null;
    const plan = (h: number): Solid[] => [...ground, ...(bRect ? [{ r: bRect, z: () => zg + h }] : []), ...pentSolid(pRect, zg + h)];
    const pts = pointsOn(m, d, q, R.width / 2).map((p) => ({ ...p, fit: skyFactorAt(p.x, p.y, fit, n) }));
    preps.push({ check: base, pts, plan });
  }

  // --- 隣地(令 135 条の 7・135 条の 10) ---
  if (m.side) {
    const S = m.side;
    const nb = DIRS.filter((d) => !m.roads[d]);
    const raise = raiseOf(S.diff);
    const q = S.slope === 2.5 ? 12.4 : 16;
    const sp = S.slope === 2.5 ? 6.2 : 8;
    const sets = nb.map((d) => Math.max(0, setOf(m, d)));
    const coefs = nb.map((d) => inwardCoef(m, d));
    const lines: Line[] = [];
    nb.forEach((d, i) => lines.push(lineAt(m, d, sets[i])));
    for (let i = 0; i < nb.length; i++) {
      for (let j = i + 1; j < nb.length; j++) {
        // 隣地 i と j の制限がちょうど等しい線: inward_i + s_i = inward_j + s_j
        const ci = coefs[i];
        const cj = coefs[j];
        const a = ci.ax - cj.ax;
        const b = ci.ay - cj.ay;
        if (Math.abs(a) < 1e-12 && Math.abs(b) < 1e-12) continue;
        lines.push({ a, b, c: sets[j] - sets[i] + cj.c - ci.c });
      }
    }
    const fitZ = (x: number, y: number) => {
      let z = Infinity;
      for (let i = 0; i < nb.length; i++) {
        const c = coefs[i];
        const dd = c.ax * x + c.ay * y + c.c;
        const f = dd < sets[i] ? S.rise : S.rise + S.slope * (dd + sets[i]);
        if (f < z) z = f;
      }
      return z;
    };
    const fit: Solid[] = [{ r: site, z: fitZ, lines }];
    const plan = (h: number): Solid[] => [{ r: m.bldg, z: () => h - raise }, ...pentSolid(m.pent?.r ?? null, h - raise)];
    for (const d of nb) {
      const pts = pointsOn(m, d, q, sp).map((p) => ({ ...p, fit: skyFactorAt(p.x, p.y, fit, n) }));
      preps.push({
        check: {
          kind: 'side',
          dir: d,
          line: `${DIR_JA[d]}の隣地境界線から ${q}m 外側・敷地の地盤面${raise > 0 ? ` + ${raise.toFixed(2)}m` : ''}・間隔 ${sp}m 以内`,
          basis: '法 56 条 7 項 2 号・令 135 条の 7・135 条の 10',
          unsure: [],
        },
        pts,
        plan,
      });
    }
  }

  // --- 北側(令 135 条の 8・135 条の 11) ---
  if (m.north) {
    const N = m.north;
    const raise = raiseOf(N.diff);
    const nr = m.roads.N;
    const off = nr ? pos(nr.width) + pos(nr.park) : 0;
    const q = N.low ? 4 : 8;
    const sp = N.low ? 1 : 2;
    const unsure: string[] = [];
    if (nr) unsure.push('北が道路: 測定線を道路の反対側の境界線から外側に置いた(法 56 条 7 項 3 号は「隣地境界線から」。北側斜線の距離の取り方に合わせた)');
    const fit: Solid[] = [{ r: site, z: (x, y) => N.rise + 1.25 * (m.ns - y + off) }];
    const plan = (h: number): Solid[] => [{ r: m.bldg, z: () => h - raise }, ...pentSolid(m.pent?.r ?? null, h - raise)];
    const pts = pointsOn(m, 'N', off + q, sp).map((p) => ({ ...p, fit: skyFactorAt(p.x, p.y, fit, n) }));
    preps.push({
      check: {
        kind: 'north',
        dir: 'N',
        line: `${nr ? '北の道路の反対側の境界線' : '北の隣地境界線'}から真北へ ${q}m 外側・敷地の地盤面${raise > 0 ? ` + ${raise.toFixed(2)}m` : ''}・間隔 ${sp}m 以内`,
        basis: '法 56 条 7 項 3 号・令 135 条の 8・135 条の 11',
        unsure,
      },
      pts,
      plan,
    });
  }
  return preps;
}

/** 建物の高さ h(敷地の地盤面から・塔屋を除く)で、計画建築物の天空率を出して適合建築物と比べる */
export function evalSky(preps: Prep[], h: number, n = SKY_DIV): SkyCheck[] {
  return preps.map((p) => {
    if (p.check.skipped) return { ...p.check, points: [], ok: true, margin: Infinity, worst: -1, close: false };
    const solids = p.plan(h);
    const points = p.pts.map((q) => ({ ...q, plan: skyFactorAt(q.x, q.y, solids, n) }));
    let margin = Infinity;
    let worst = -1;
    points.forEach((q, i) => {
      if (q.plan - q.fit < margin) {
        margin = q.plan - q.fit;
        worst = i;
      }
    });
    return { ...p.check, points, ok: margin >= 0, margin, worst, close: Math.abs(margin) < SKY_TOL };
  });
}

export const pct3 = (r: number) => `${(r * 100).toFixed(3)}%`;
