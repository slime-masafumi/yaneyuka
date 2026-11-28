/**
 * 日影図(設計ツール › 基本設計 › 日影図)。2026-11-28
 *
 * 多角形の建物(高さの違う棟を何個でも)が、冬至日の真太陽時に測定面へ落とす影から、
 *   時刻日影図(1 時間 / 30 分ごとの影の輪郭)
 *   等時間日影線(同じ時間だけ影になる点を結んだ線)
 *   敷地境界線から 5m・10m の線
 * を作り、DXF を読み込んで DXF で返す。ブラウザの中だけで計算する(外部に送らない)。
 *
 * 太陽の位置・規制値は src/lib/shadow.ts(別表第 4・冬至の赤緯 −23.44°・真太陽時)と同じ。
 * 影の形: 高さ zb〜zt の角柱の影は、平面形を太陽と反対へ zb·o〜zt·o だけ動かした掃引形
 *   = 下端の影 ∪ 上端の影 ∪ 各辺が描く平行四辺形(o = 高さ 1m あたりの影の水平ベクトル)。
 *   時刻日影線はこれらの和集合の輪郭を辺の交点で切り分けて正確に出す。等時間日影線は格子で数えた時間の等値線。
 * 座標: 図面の座標(x 右・y 上、m)。真北は「図面の上(+y)から時計回りに northDeg 度」。
 */

import { sunAt } from './shadow';

export type Pt = [number, number];
export type Poly = Pt[];
/** 棟: 平面形・平均地盤面からの上端の高さ top と下端の高さ bottom(既定 0)(m) */
export type Block = { poly: Poly; top: number; bottom?: number; name?: string };

export type DiagramIn = {
  lat: number;
  hokkaido: boolean;
  northDeg: number;
  /** 測定面の高さ(平均地盤面から m) */
  plane: number;
  site: Poly | null;
  blocks: Block[];
  /** 日影時間を数える刻み(分) */
  stepMin: number;
  /** 格子の細かさの上限(点の数) */
  maxCells: number;
};

const D2R = Math.PI / 180;

/** 時刻 t の、高さ 1m あたりの影の水平ベクトル(図面座標)。太陽が沈んでいれば null */
export function shadowVec(lat: number, t: number, northDeg: number): Pt | null {
  const s = sunAt(lat, t);
  if (s.alt <= 0.0001) return null;
  const e = Math.sin(s.az) / Math.tan(s.alt);
  const n = Math.cos(s.az) / Math.tan(s.alt);
  const th = northDeg * D2R;
  return [e * Math.cos(th) + n * Math.sin(th), -e * Math.sin(th) + n * Math.cos(th)];
}

export function polyArea(p: Poly): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x0, y0] = p[i];
    const [x1, y1] = p[(i + 1) % p.length];
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
}

export function inPoly(p: Poly, x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i];
    const [xj, yj] = p[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

type Piece = { p: Poly; x0: number; y0: number; x1: number; y1: number };
const mkPiece = (p: Poly): Piece => {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of p) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return { p, x0, y0, x1, y1 };
};

/** 時刻 t の影を作る多角形の集まり(和集合が影) */
export function shadowPieces(v: Pick<DiagramIn, 'lat' | 'northDeg' | 'plane' | 'blocks'>, t: number): Piece[] | null {
  const o = shadowVec(v.lat, t, v.northDeg);
  if (!o) return null;
  const out: Piece[] = [];
  for (const b of v.blocks) {
    const zt = b.top - v.plane;
    if (zt <= 0 || b.poly.length < 3) continue;
    const zb = Math.max((b.bottom ?? 0) - v.plane, 0);
    const mv = (z: number) => b.poly.map(([x, y]) => [x + o[0] * z, y + o[1] * z] as Pt);
    const lo = mv(zb);
    const hi = mv(zt);
    out.push(mkPiece(lo), mkPiece(hi));
    for (let i = 0; i < b.poly.length; i++) {
      const j = (i + 1) % b.poly.length;
      out.push(mkPiece([lo[i], lo[j], hi[j], hi[i]]));
    }
  }
  return out;
}

const inPieces = (ps: Piece[], x: number, y: number) => ps.some((q) => x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1 && inPoly(q.p, x, y));

export type Seg = [Pt, Pt];

/** 影(多角形の和集合)の輪郭の線分。辺どうしの交点で切り、片側だけが影の部分を残す */
export function unionOutline(ps: Piece[]): Seg[] {
  const edges: Seg[] = [];
  for (const q of ps) for (let i = 0; i < q.p.length; i++) edges.push([q.p[i], q.p[(i + 1) % q.p.length]]);
  const out: Seg[] = [];
  const seen = new Set<string>();
  const key = (a: Pt, b: Pt) => {
    const k1 = `${a[0].toFixed(3)},${a[1].toFixed(3)}`;
    const k2 = `${b[0].toFixed(3)},${b[1].toFixed(3)}`;
    return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
  };
  for (let i = 0; i < edges.length; i++) {
    const [a, b] = edges[i];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) continue;
    const ts = [0, 1];
    for (let j = 0; j < edges.length; j++) {
      if (j === i) continue;
      const [c, d] = edges[j];
      const ex = d[0] - c[0];
      const ey = d[1] - c[1];
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-12) continue;
      const t = ((c[0] - a[0]) * ey - (c[1] - a[1]) * ex) / den;
      const u = ((c[0] - a[0]) * dy - (c[1] - a[1]) * dx) / den;
      if (t > 1e-9 && t < 1 - 1e-9 && u >= -1e-9 && u <= 1 + 1e-9) ts.push(t);
    }
    ts.sort((p, q) => p - q);
    const nx = -dy / len;
    const ny = dx / len;
    const eps = 1e-4;
    for (let k = 0; k + 1 < ts.length; k++) {
      if (ts[k + 1] - ts[k] < 1e-9) continue;
      const tm = (ts[k] + ts[k + 1]) / 2;
      const mx = a[0] + dx * tm;
      const my = a[1] + dy * tm;
      const l = inPieces(ps, mx + nx * eps, my + ny * eps);
      const r = inPieces(ps, mx - nx * eps, my - ny * eps);
      if (l === r) continue;
      const p0: Pt = [a[0] + dx * ts[k], a[1] + dy * ts[k]];
      const p1: Pt = [a[0] + dx * ts[k + 1], a[1] + dy * ts[k + 1]];
      const kk = key(p0, p1);
      if (seen.has(kk)) continue;
      seen.add(kk);
      out.push([p0, p1]);
    }
  }
  return out;
}

/** 線分をつないで折れ線にする(端点が一致するものを順に) */
export function chain(segs: Seg[], tol = 1e-3): { pts: Pt[]; closed: boolean }[] {
  const k = (p: Pt) => `${Math.round(p[0] / tol)},${Math.round(p[1] / tol)}`;
  const adj = new Map<string, number[]>();
  segs.forEach(([a, b], i) => {
    for (const p of [a, b]) {
      const kk = k(p);
      const l = adj.get(kk);
      if (l) l.push(i);
      else adj.set(kk, [i]);
    }
  });
  const used = new Uint8Array(segs.length);
  const out: { pts: Pt[]; closed: boolean }[] = [];
  const walk = (start: Pt, pts: Pt[]) => {
    let cur = start;
    for (;;) {
      const l = adj.get(k(cur)) ?? [];
      const nx = l.find((i) => !used[i]);
      if (nx === undefined) return;
      used[nx] = 1;
      const [a, b] = segs[nx];
      const next = k(a) === k(cur) ? b : a;
      pts.push(next);
      cur = next;
    }
  };
  // 端(つながりが 1 本だけの点)から先にたどる
  const order = segs.map((_, i) => i).sort((i, j) => {
    const di = Math.min(adj.get(k(segs[i][0]))!.length, adj.get(k(segs[i][1]))!.length);
    const dj = Math.min(adj.get(k(segs[j][0]))!.length, adj.get(k(segs[j][1]))!.length);
    return di - dj;
  });
  for (const i of order) {
    if (used[i]) continue;
    used[i] = 1;
    const [a, b] = segs[i];
    const fwd: Pt[] = [a, b];
    walk(b, fwd);
    const back: Pt[] = [];
    walk(a, back);
    const pts = [...back.reverse(), ...fwd];
    const closed = pts.length > 3 && k(pts[0]) === k(pts[pts.length - 1]);
    if (closed) pts.pop();
    out.push({ pts, closed });
  }
  return out;
}

export type Grid = { x0: number; y0: number; step: number; nx: number; ny: number };

export type DiagramOut = {
  grid: Grid;
  hours: Float32Array;
  /** 敷地境界線からの水平距離(敷地の中は 0) */
  dist: Float32Array;
  maxNear: number;
  maxFar: number;
  /** 5m〜10m・10m 超で最大になる点 */
  atNear: Pt | null;
  atFar: Pt | null;
  t0: number;
  t1: number;
};

/** 範囲: 敷地と、各時刻の影の外接矩形 */
function extent(v: DiagramIn, t0: number, t1: number) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const add = (x: number, y: number) => {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  };
  for (const p of v.site ?? []) add(p[0], p[1]);
  for (const b of v.blocks) for (const p of b.poly) add(p[0], p[1]);
  for (let t = t0; t <= t1 + 1e-9; t += 0.5) {
    const ps = shadowPieces(v, t);
    for (const q of ps ?? []) {
      add(q.x0, q.y0);
      add(q.x1, q.y1);
    }
  }
  const m = 12;
  return { x0: x0 - m, y0: y0 - m, x1: x1 + m, y1: y1 + m };
}

function segDist(px: number, py: number, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l2)) : 0;
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
}

export function computeDiagram(v: DiagramIn): DiagramOut {
  const t0 = v.hokkaido ? 9 : 8;
  const t1 = v.hokkaido ? 15 : 16;
  const e = extent(v, t0, t1);
  const area = (e.x1 - e.x0) * (e.y1 - e.y0);
  const step = Math.max(0.1, Math.ceil(Math.sqrt(area / v.maxCells) * 20) / 20);
  const nx = Math.ceil((e.x1 - e.x0) / step);
  const ny = Math.ceil((e.y1 - e.y0) / step);
  const grid = { x0: e.x0, y0: e.y0, step, nx, ny };
  const hours = new Float32Array(nx * ny);
  const dist = new Float32Array(nx * ny);
  const site = v.site && v.site.length >= 3 ? v.site : null;
  for (let j = 0; j < ny; j++) {
    const y = e.y0 + (j + 0.5) * step;
    for (let i = 0; i < nx; i++) {
      const x = e.x0 + (i + 0.5) * step;
      let d = 0;
      if (site && !inPoly(site, x, y)) {
        d = Infinity;
        for (let k = 0; k < site.length; k++) d = Math.min(d, segDist(x, y, site[k], site[(k + 1) % site.length]));
      }
      dist[j * nx + i] = d;
    }
  }
  const dt = v.stepMin / 60;
  const stamp = new Int32Array(nx * ny).fill(-1);
  let ti = 0;
  for (let t = t0 + dt / 2; t < t1; t += dt, ti++) {
    const ps = shadowPieces(v, t);
    if (!ps) continue;
    for (const q of ps) {
      const i0 = Math.max(0, Math.floor((q.x0 - e.x0) / step));
      const i1 = Math.min(nx - 1, Math.ceil((q.x1 - e.x0) / step));
      const j0 = Math.max(0, Math.floor((q.y0 - e.y0) / step));
      const j1 = Math.min(ny - 1, Math.ceil((q.y1 - e.y0) / step));
      for (let j = j0; j <= j1; j++) {
        const y = e.y0 + (j + 0.5) * step;
        for (let i = i0; i <= i1; i++) {
          const k = j * nx + i;
          if (stamp[k] === ti) continue;
          const x = e.x0 + (i + 0.5) * step;
          if (inPoly(q.p, x, y)) {
            hours[k] += dt;
            stamp[k] = ti;
          }
        }
      }
    }
  }
  let maxNear = 0;
  let maxFar = 0;
  let atNear: Pt | null = null;
  let atFar: Pt | null = null;
  for (let k = 0; k < hours.length; k++) {
    const d = dist[k];
    const h = hours[k];
    const p: Pt = [e.x0 + ((k % nx) + 0.5) * step, e.y0 + (Math.floor(k / nx) + 0.5) * step];
    if (d > 10) {
      if (h > maxFar) {
        maxFar = h;
        atFar = p;
      }
    } else if (d > 5 && h > maxNear) {
      maxNear = h;
      atNear = p;
    }
  }
  return { grid, hours, dist, maxNear, maxFar, atNear, atFar, t0, t1 };
}

/** 等値線(マーチングスクエア)。値は格子の点(セルの中心)にある */
export function contour(vals: Float32Array, g: Grid, level: number): Seg[] {
  const segs: Seg[] = [];
  const { nx, ny, step } = g;
  const px = (i: number) => g.x0 + (i + 0.5) * step;
  const py = (j: number) => g.y0 + (j + 0.5) * step;
  const lerp = (a: number, b: number) => (Math.abs(b - a) < 1e-12 ? 0.5 : (level - a) / (b - a));
  for (let j = 0; j + 1 < ny; j++) {
    for (let i = 0; i + 1 < nx; i++) {
      const a = vals[j * nx + i];
      const b = vals[j * nx + i + 1];
      const c = vals[(j + 1) * nx + i + 1];
      const d = vals[(j + 1) * nx + i];
      if (!Number.isFinite(a + b + c + d)) continue;
      const idx = (a >= level ? 1 : 0) | (b >= level ? 2 : 0) | (c >= level ? 4 : 0) | (d >= level ? 8 : 0);
      if (idx === 0 || idx === 15) continue;
      const B: Pt = [px(i) + lerp(a, b) * step, py(j)];
      const R: Pt = [px(i + 1), py(j) + lerp(b, c) * step];
      const T: Pt = [px(i) + lerp(d, c) * step, py(j + 1)];
      const L: Pt = [px(i), py(j) + lerp(a, d) * step];
      const add = (p: Pt, q: Pt) => segs.push([p, q]);
      switch (idx) {
        case 1: case 14: add(L, B); break;
        case 2: case 13: add(B, R); break;
        case 3: case 12: add(L, R); break;
        case 4: case 11: add(R, T); break;
        case 6: case 9: add(B, T); break;
        case 7: case 8: add(L, T); break;
        case 5: {
          const m = (a + b + c + d) / 4;
          if (m >= level) { add(L, T); add(B, R); } else { add(L, B); add(R, T); }
          break;
        }
        case 10: {
          const m = (a + b + c + d) / 4;
          if (m >= level) { add(L, B); add(R, T); } else { add(L, T); add(B, R); }
          break;
        }
      }
    }
  }
  return segs;
}

/** 時刻日影線: 各時刻の影の輪郭 */
export function timeShadows(v: DiagramIn, intervalMin: number): { t: number; segs: Seg[] }[] {
  const t0 = v.hokkaido ? 9 : 8;
  const t1 = v.hokkaido ? 15 : 16;
  const out: { t: number; segs: Seg[] }[] = [];
  for (let m = t0 * 60; m <= t1 * 60 + 1e-6; m += intervalMin) {
    const ps = shadowPieces(v, m / 60);
    if (!ps || !ps.length) continue;
    out.push({ t: m / 60, segs: unionOutline(ps) });
  }
  return out;
}

export const hhmm = (t: number) => `${Math.floor(t + 1e-9)}:${String(Math.round((t - Math.floor(t + 1e-9)) * 60)).padStart(2, '0')}`;

// ─────────────────────────────────────────────────────────────────────────────
// DXF
// ─────────────────────────────────────────────────────────────────────────────

export type DxfShape = { layer: string; pts: Pt[]; closed: boolean; thickness: number; elevation: number; kind: string };
export type DxfText = { layer: string; at: Pt; text: string };
export type DxfRead = { shapes: DxfShape[]; texts: DxfText[]; insUnits: number | null; inserts: number; warnings: string[] };

/** 文字コード: JW-CAD などの DXF は Shift_JIS。UTF-8 で読めない文字が出たら Shift_JIS で読み直す */
export function decodeDxf(buf: ArrayBuffer): string {
  const u = new TextDecoder('utf-8').decode(buf);
  if (!u.includes('�')) return u;
  try {
    return new TextDecoder('shift_jis').decode(buf);
  } catch {
    return u;
  }
}

/** 弧(bulge)を折れ線に */
function bulgePts(a: Pt, b: Pt, bulge: number): Pt[] {
  if (Math.abs(bulge) < 1e-9) return [];
  const th = 4 * Math.atan(bulge);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const c = Math.hypot(dx, dy);
  if (c < 1e-12) return [];
  // 中心は弦の中点から左の法線方向へ (c/2)/tan(θ/2)(θ > 0 = 反時計回り)
  const s = c / 2 / Math.tan(th / 2);
  const cx = (a[0] + b[0]) / 2 - (dy / c) * s;
  const cy = (a[1] + b[1]) / 2 + (dx / c) * s;
  const R = Math.hypot(a[0] - cx, a[1] - cy);
  const a0 = Math.atan2(a[1] - cy, a[0] - cx);
  const n = Math.max(2, Math.ceil(Math.abs(th) / (Math.PI / 16)));
  const out: Pt[] = [];
  for (let i = 1; i < n; i++) {
    const ang = a0 + (th * i) / n;
    out.push([cx + R * Math.cos(ang), cy + R * Math.sin(ang)]);
  }
  return out;
}

export function parseDxf(text: string): DxfRead {
  const lines = text.split(/\r?\n/);
  const pairs: [number, string][] = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const c = parseInt(lines[i].trim(), 10);
    if (Number.isNaN(c)) {
      i -= 1; // ずれを 1 行戻す
      continue;
    }
    pairs.push([c, lines[i + 1].replace(/\s+$/, '')]);
  }
  const shapes: DxfShape[] = [];
  const texts: DxfText[] = [];
  const warnings: string[] = [];
  const lineSegs: { layer: string; a: Pt; b: Pt }[] = [];
  let insUnits: number | null = null;
  let inserts = 0;
  let section = '';
  let i = 0;
  const val = (k: number) => pairs[k][1].trim();
  while (i < pairs.length) {
    const [c, v] = pairs[i];
    if (c === 0 && v === 'SECTION') {
      section = pairs[i + 1] ? val(i + 1) : '';
      i += 2;
      continue;
    }
    if (section === 'HEADER' && c === 9 && v.trim() === '$INSUNITS') {
      const n = pairs[i + 1];
      if (n) insUnits = parseInt(n[1], 10);
      i += 2;
      continue;
    }
    if (section !== 'ENTITIES' || c !== 0) {
      i++;
      continue;
    }
    const type = v.trim();
    // この図形の組を集める(次の 0 まで)
    let j = i + 1;
    const g: [number, string][] = [];
    while (j < pairs.length && pairs[j][0] !== 0) g.push(pairs[j++]);
    const layer = g.find((x) => x[0] === 8)?.[1].trim() ?? '0';
    const num = (code: number) => {
      const f = g.find((x) => x[0] === code);
      return f ? Number(f[1]) : 0;
    };
    if (type === 'LWPOLYLINE') {
      const pts: Pt[] = [];
      const bul: number[] = [];
      let cur: Pt | null = null;
      for (const [cc, vv] of g) {
        if (cc === 10) {
          if (cur) pts.push(cur);
          cur = [Number(vv), 0];
          bul.push(0);
        } else if (cc === 20 && cur) cur[1] = Number(vv);
        else if (cc === 42 && bul.length) bul[bul.length - 1] = Number(vv);
      }
      if (cur) pts.push(cur);
      const closed = (num(70) & 1) === 1;
      const full: Pt[] = [];
      for (let k = 0; k < pts.length; k++) {
        full.push(pts[k]);
        const nxt = k + 1 < pts.length ? pts[k + 1] : closed ? pts[0] : null;
        if (nxt && bul[k]) full.push(...bulgePts(pts[k], nxt, bul[k]));
      }
      shapes.push({ layer, pts: full, closed, thickness: num(39), elevation: num(38), kind: 'LWPOLYLINE' });
      i = j;
      continue;
    }
    if (type === 'POLYLINE') {
      const closed = (num(70) & 1) === 1;
      const flags = num(70);
      const pts: Pt[] = [];
      let elev = num(30);
      let k = j;
      while (k < pairs.length) {
        if (pairs[k][0] === 0 && pairs[k][1].trim() === 'VERTEX') {
          let m = k + 1;
          let x = 0;
          let y = 0;
          let z = 0;
          while (m < pairs.length && pairs[m][0] !== 0) {
            if (pairs[m][0] === 10) x = Number(pairs[m][1]);
            if (pairs[m][0] === 20) y = Number(pairs[m][1]);
            if (pairs[m][0] === 30) z = Number(pairs[m][1]);
            m++;
          }
          pts.push([x, y]);
          if (z) elev = z;
          k = m;
          continue;
        }
        if (pairs[k][0] === 0 && pairs[k][1].trim() === 'SEQEND') {
          k++;
          break;
        }
        if (pairs[k][0] === 0) break;
        k++;
      }
      if (flags & 16 || flags & 64) warnings.push('3D メッシュ・ポリフェースは読みません');
      else shapes.push({ layer, pts, closed, thickness: num(39), elevation: elev, kind: 'POLYLINE' });
      i = k;
      continue;
    }
    if (type === 'LINE') {
      lineSegs.push({ layer, a: [num(10), num(20)], b: [num(11), num(21)] });
    } else if (type === 'TEXT' || type === 'MTEXT') {
      const raw = g.filter((x) => x[0] === 1 || x[0] === 3).map((x) => x[1]).join('');
      const clean = raw.replace(/\\[A-Za-z][^;]*;/g, '').replace(/[{}]/g, '').replace(/\\P/g, ' ');
      texts.push({ layer, at: [num(10), num(20)], text: clean });
    } else if (type === 'INSERT') {
      inserts++;
    } else if (type === 'CIRCLE') {
      const cx = num(10);
      const cy = num(20);
      const r = num(40);
      const pts: Pt[] = Array.from({ length: 32 }, (_, k) => [cx + r * Math.cos((k * Math.PI) / 16), cy + r * Math.sin((k * Math.PI) / 16)] as Pt);
      shapes.push({ layer, pts, closed: true, thickness: num(39), elevation: 0, kind: 'CIRCLE' });
    }
    i = j;
  }
  // LINE を端点でつないで閉じた形にする
  const byLayer = new Map<string, Seg[]>();
  for (const s of lineSegs) {
    const l = byLayer.get(s.layer) ?? [];
    l.push([s.a, s.b]);
    byLayer.set(s.layer, l);
  }
  for (const [layer, segs] of byLayer) {
    const span = Math.max(...segs.flatMap(([a, b]) => [Math.abs(a[0]), Math.abs(a[1]), Math.abs(b[0]), Math.abs(b[1])]), 1);
    for (const c of chain(segs, Math.max(span * 1e-7, 1e-6))) {
      if (c.pts.length >= 2) shapes.push({ layer, pts: c.pts, closed: c.closed, thickness: 0, elevation: 0, kind: 'LINE' });
    }
  }
  if (inserts) warnings.push(`ブロック(INSERT)が ${inserts} 個あります。ブロックの中の線は読まないので、分解してから書き出してください`);
  return { shapes, texts, insUnits, inserts, warnings };
}

/** 文字から高さを拾う: 「H=12.5」「高さ 12.5」「12.5m」 */
export function heightFromText(s: string): number | null {
  const m = s.match(/(?:^|[^A-Za-z])(?:GL)?\s*(?:H|h|高さ|最高高さ)\s*[=:＝：]?\s*\+?([0-9]+(?:\.[0-9]+)?)/) ?? s.match(/^\s*\+?([0-9]+(?:\.[0-9]+)?)\s*(?:m|ｍ|M)\s*$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** $INSUNITS → m への倍率。4 = mm, 5 = cm, 6 = m。無ければ大きさから推定 */
export function unitScale(insUnits: number | null, shapes: DxfShape[]): { scale: number; label: string; guessed: boolean } {
  if (insUnits === 4) return { scale: 0.001, label: 'mm', guessed: false };
  if (insUnits === 5) return { scale: 0.01, label: 'cm', guessed: false };
  if (insUnits === 6) return { scale: 1, label: 'm', guessed: false };
  let span = 0;
  for (const s of shapes) {
    const xs = s.pts.map((p) => p[0]);
    const ys = s.pts.map((p) => p[1]);
    span = Math.max(span, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  }
  return span > 1000 ? { scale: 0.001, label: 'mm', guessed: true } : { scale: 1, label: 'm', guessed: true };
}

export type DxfLayerOut = { name: string; color: number };
export type DxfEntity =
  | { type: 'poly'; layer: string; pts: Pt[]; closed: boolean }
  | { type: 'text'; layer: string; at: Pt; h: number; text: string };

/** R12 形式(AC1009)の ASCII DXF。図形は POLYLINE と TEXT だけ(JW-CAD・AutoCAD・Vectorworks で読める) */
export function writeDxf(layers: DxfLayerOut[], ents: DxfEntity[], scale: number): string {
  const L: string[] = [];
  const p = (c: number, v: string | number) => {
    L.push(String(c));
    L.push(typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(4)) : v);
  };
  const xs = ents.flatMap((e) => (e.type === 'poly' ? e.pts.map((q) => q[0]) : [e.at[0]]));
  const ys = ents.flatMap((e) => (e.type === 'poly' ? e.pts.map((q) => q[1]) : [e.at[1]]));
  p(0, 'SECTION');
  p(2, 'HEADER');
  p(9, '$ACADVER');
  p(1, 'AC1009');
  p(9, '$EXTMIN');
  p(10, (xs.length ? Math.min(...xs) : 0) / scale);
  p(20, (ys.length ? Math.min(...ys) : 0) / scale);
  p(9, '$EXTMAX');
  p(10, (xs.length ? Math.max(...xs) : 0) / scale);
  p(20, (ys.length ? Math.max(...ys) : 0) / scale);
  p(0, 'ENDSEC');
  p(0, 'SECTION');
  p(2, 'TABLES');
  p(0, 'TABLE');
  p(2, 'LTYPE');
  p(70, 1);
  p(0, 'LTYPE');
  p(2, 'CONTINUOUS');
  p(70, 0);
  p(3, 'Solid line');
  p(72, 65);
  p(73, 0);
  p(40, 0);
  p(0, 'ENDTAB');
  p(0, 'TABLE');
  p(2, 'LAYER');
  p(70, layers.length);
  for (const l of layers) {
    p(0, 'LAYER');
    p(2, l.name);
    p(70, 0);
    p(62, l.color);
    p(6, 'CONTINUOUS');
  }
  p(0, 'ENDTAB');
  p(0, 'ENDSEC');
  p(0, 'SECTION');
  p(2, 'ENTITIES');
  for (const e of ents) {
    if (e.type === 'poly') {
      if (e.pts.length < 2) continue;
      p(0, 'POLYLINE');
      p(8, e.layer);
      p(66, 1);
      p(10, 0);
      p(20, 0);
      p(30, 0);
      p(70, e.closed ? 1 : 0);
      for (const q of e.pts) {
        p(0, 'VERTEX');
        p(8, e.layer);
        p(10, q[0] / scale);
        p(20, q[1] / scale);
        p(30, 0);
      }
      p(0, 'SEQEND');
      p(8, e.layer);
    } else {
      p(0, 'TEXT');
      p(8, e.layer);
      p(10, e.at[0] / scale);
      p(20, e.at[1] / scale);
      p(30, 0);
      p(40, e.h / scale);
      p(1, e.text);
    }
  }
  p(0, 'ENDSEC');
  p(0, 'EOF');
  return L.join('\r\n') + '\r\n';
}
