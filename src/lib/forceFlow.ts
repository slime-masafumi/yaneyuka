/**
 * 構造フロービューアの解析エンジン。画面から切り離してある（テスト: node scripts/test-force-flow.ts）。
 *
 * 平面応力の線形弾性 FEM。等間隔の長方形格子に 4 節点非適合要素（Q6）を敷き、
 * 帯行列のコレスキー分解で解く。単位は mm・N。入力の荷重は kN、kN/m。
 * kN/m と N/mm は同じ値なので、線荷重はそのまま N/mm として扱う。
 *
 * 全要素が同じ長方形なので、要素剛性は厚さ 1 の 1 枚だけ作って厚さを掛ける。
 * このファイルは Web Worker と Node のテストからも読むので、他のモジュールを import しない。
 */

export type MaterialKind = 'rc' | 'steel' | 'wood';

export type FlowMaterial = {
  kind: MaterialKind;
  label: string;
  /** ヤング係数 N/mm² */
  E: number;
  nu: number;
  /** 引張側の基準（目安の分母）N/mm² */
  ft: number;
  /** 圧縮側の基準（目安の分母）N/mm² */
  fc: number;
  /** 単位体積重量 kN/m³ */
  density: number;
  /** 目安の出し方。principal = 主応力を引張・圧縮の基準で割る / mises = 相当応力を基準で割る */
  criterion: 'principal' | 'mises';
  /** RC のとき、E を自動計算した元の値 */
  concrete?: { Fc: number; gamma: number };
};

export type FlowZone = {
  id: string;
  kind: 'opening' | 'column';
  shape: 'rect' | 'circle';
  /** 外接する長方形の左下（mm。原点はモデルの左下、y は上向き） */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 柱のときの厚さ mm（省略時は壁厚） */
  t?: number;
};

export type SupportEdge = 'bottom' | 'top' | 'left' | 'right';

export type FlowSupport = {
  id: string;
  edge: SupportEdge;
  /** 辺に沿った範囲 mm。from === to は 1 点 */
  from: number;
  to: number;
  /** fixed / pin は両方向を拘束、roller は辺に垂直な方向だけ拘束 */
  type: 'fixed' | 'pin' | 'roller';
};

export type FlowLoad =
  /** 高さ y の水平線上の線荷重。q は下向き正 kN/m */
  | { id: string; kind: 'line'; y: number; x0: number; x1: number; q: number }
  /** 高さ y の水平線に均等に配る水平力。H は右向き正 kN（床の慣性力の代わり） */
  | { id: string; kind: 'shear'; y: number; H: number }
  /** 集中荷重。fx は右向き正、fy は下向き正 kN */
  | { id: string; kind: 'point'; x: number; y: number; fx: number; fy: number };

export type MeshLevel = 'coarse' | 'standard' | 'fine';

export type FlowModel = {
  version: 1;
  width: number;
  height: number;
  thickness: number;
  material: FlowMaterial;
  zones: FlowZone[];
  supports: FlowSupport[];
  loads: FlowLoad[];
  selfWeight: boolean;
  mesh: MeshLevel;
};

export type SolveOptions = {
  /** 要素数の上限（端末性能に合わせて呼び出し側が決める） */
  maxElements?: number;
};

export type PeakValue = { value: number; x: number; y: number };

export type FlowSummary = {
  /** 最大引張（応力集中部を除く）N/mm² */
  tension: PeakValue;
  /** 最大圧縮（応力集中部を除く・絶対値）N/mm² */
  compression: PeakValue;
  /** 応力集中部の最大の絶対値 N/mm²（値は参考） */
  concentration: number;
  /** 基準に対する比の最大（応力集中部を除く） */
  ratio: number;
  deflection: {
    /** 鉛直変位の最大の絶対値 mm */
    vertical: PeakValue;
    /** 鉛直を支える点の間の最大スパン mm（片持ちは張り出し長さ）。無ければ null */
    span: number | null;
    /** span / vertical。水平力があるときは意味を持たないので null */
    spanRatio: number | null;
    /** 水平変位の最大の絶対値 mm */
    horizontal: PeakValue;
    /** height / horizontal。水平力が無いときは null */
    driftRatio: number | null;
  };
  /** 反力の合計 kN（x 右向き・y 上向き） */
  reaction: { fx: number; fy: number };
  /** 外力の合計 kN（x 右向き・y 下向き。自重を含む） */
  load: { fx: number; fy: number };
};

export type FlowResult = {
  W: number;
  H: number;
  nx: number;
  ny: number;
  dx: number;
  dy: number;
  elements: number;
  dofs: number;
  bandwidth: number;
  ms: number;
  /** 要素が生きているか（nx×ny、左下から行ごと） */
  active: Uint8Array;
  /** 節点が生きているか（(nx+1)×(ny+1)） */
  nodeActive: Uint8Array;
  /** 応力集中部（角・支点端・集中荷重の近く）の節点 */
  flag: Uint8Array;
  ux: Float32Array;
  uy: Float32Array;
  sx: Float32Array;
  sy: Float32Array;
  txy: Float32Array;
  s1: Float32Array;
  s2: Float32Array;
  ratio: Float32Array;
  summary: FlowSummary;
  warnings: string[];
};

export class FlowError extends Error {}

/** 目安の 3 段階（基準に対する比） */
export const LEVEL_BOUNDS = [1 / 3, 2 / 3] as const;
export const levelOf = (ratio: number): 0 | 1 | 2 => (ratio < LEVEL_BOUNDS[0] ? 0 : ratio < LEVEL_BOUNDS[1] ? 1 : 2);

/** メッシュの細かさ: 短辺の分割数と、開口幅などの最小寸法の分割数 */
const MESH_DIVISIONS: Record<MeshLevel, { short: number; feature: number }> = {
  coarse: { short: 12, feature: 3 },
  standard: { short: 20, feature: 4 },
  fine: { short: 40, feature: 6 },
};

export const DEFAULT_MAX_ELEMENTS = 20000;

// ---- 要素 -------------------------------------------------------------------

const GP = 1 / Math.sqrt(3);
const XI = [-1, 1, 1, -1];
const ETA = [-1, -1, 1, 1];

type Element = {
  /** 厚さ 1 の縮約後の要素剛性（8×8、行優先） */
  ke: Float64Array;
  /** 節点変位 → 角の応力（角 4 × 成分 3 × 変位 8、行優先） */
  stress: Float64Array;
};

function invert4(a: number[][]): number[][] {
  const n = a.length;
  const m = a.map((row, i) => [...row, ...row.map((_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    [m[c], m[p]] = [m[p], m[c]];
    const d = m[c][c];
    for (let k = 0; k < 2 * n; k++) m[c][k] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c];
      if (f !== 0) for (let k = 0; k < 2 * n; k++) m[r][k] -= f * m[c][k];
    }
  }
  return m.map((row) => row.slice(n));
}

/** 長方形の Q6 要素を作る。節点順は左下から反時計回り。 */
export function buildElement(dx: number, dy: number, E: number, nu: number): Element {
  const f = E / (1 - nu * nu);
  const C = [
    [f, f * nu, 0],
    [f * nu, f, 0],
    [0, 0, (f * (1 - nu)) / 2],
  ];
  const dXi = 2 / dx;
  const dEta = 2 / dy;

  /** B（3×12）: 先頭 8 列が節点変位、後ろ 4 列が非適合モード */
  const bAt = (xi: number, eta: number): number[][] => {
    const B = [new Array(12).fill(0), new Array(12).fill(0), new Array(12).fill(0)];
    for (let i = 0; i < 4; i++) {
      const dNx = 0.25 * XI[i] * (1 + ETA[i] * eta) * dXi;
      const dNy = 0.25 * ETA[i] * (1 + XI[i] * xi) * dEta;
      B[0][2 * i] = dNx;
      B[1][2 * i + 1] = dNy;
      B[2][2 * i] = dNy;
      B[2][2 * i + 1] = dNx;
    }
    const dP1x = -2 * xi * dXi;
    const dP2y = -2 * eta * dEta;
    B[0][8] = dP1x; // u: 1-ξ²
    B[2][9] = dP2y; // u: 1-η²
    B[2][10] = dP1x; // v: 1-ξ²
    B[1][11] = dP2y; // v: 1-η²
    return B;
  };

  const K = Array.from({ length: 12 }, () => new Array(12).fill(0));
  const area = (dx * dy) / 4;
  const gauss: number[][][] = [];
  for (let g = 0; g < 4; g++) {
    const B = bAt(XI[g] * GP, ETA[g] * GP);
    gauss.push(B);
    for (let i = 0; i < 12; i++) {
      for (let j = 0; j < 12; j++) {
        let s = 0;
        for (let p = 0; p < 3; p++) for (let q = 0; q < 3; q++) s += B[p][i] * C[p][q] * B[q][j];
        K[i][j] += s * area;
      }
    }
  }

  // 非適合モードを静的縮約する: α = -Kii⁻¹ Kic d
  const Kii = [8, 9, 10, 11].map((i) => [8, 9, 10, 11].map((j) => K[i][j]));
  const inv = invert4(Kii);
  const H = Array.from({ length: 4 }, () => new Array(8).fill(0));
  for (let a = 0; a < 4; a++) {
    for (let c = 0; c < 8; c++) {
      let s = 0;
      for (let b = 0; b < 4; b++) s -= inv[a][b] * K[8 + b][c];
      H[a][c] = s;
    }
  }

  const ke = new Float64Array(64);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      let s = K[i][j];
      for (let a = 0; a < 4; a++) s += K[i][8 + a] * H[a][j];
      ke[i * 8 + j] = s;
    }
  }

  // Gauss 点の応力（節点変位の 3×8）
  const atGauss = gauss.map((B) => {
    const S: number[][] = [];
    for (let p = 0; p < 3; p++) {
      const row = new Array(8).fill(0);
      for (let c = 0; c < 8; c++) {
        let strainSum = 0;
        for (let q = 0; q < 3; q++) {
          let bq = B[q][c];
          for (let a = 0; a < 4; a++) bq += B[q][8 + a] * H[a][c];
          strainSum += C[p][q] * bq;
        }
        row[c] = strainSum;
      }
      S.push(row);
    }
    return S;
  });

  // Gauss 点の値を角へ外挿する
  const stress = new Float64Array(4 * 3 * 8);
  const r3 = Math.sqrt(3);
  for (let c = 0; c < 4; c++) {
    for (let g = 0; g < 4; g++) {
      const L = 0.25 * (1 + XI[g] * XI[c] * r3) * (1 + ETA[g] * ETA[c] * r3);
      for (let p = 0; p < 3; p++) {
        for (let k = 0; k < 8; k++) stress[c * 24 + p * 8 + k] += L * atGauss[g][p][k];
      }
    }
  }
  return { ke, stress };
}

// ---- 帯行列 -----------------------------------------------------------------

/** 上三角帯行列のコレスキー分解（A = UᵀU）。A[i*w + (j-i)] が (i, j)。 */
function choleskyBand(A: Float64Array, n: number, b: number): void {
  const w = b + 1;
  const diag = new Float64Array(n);
  for (let i = 0; i < n; i++) diag[i] = A[i * w];
  for (let i = 0; i < n; i++) {
    const rowI = i * w;
    const pivot = A[rowI];
    if (!(pivot > diag[i] * 1e-11)) throw new FlowError('unstable');
    const d = Math.sqrt(pivot);
    A[rowI] = d;
    const last = Math.min(i + b, n - 1);
    for (let k = rowI + 1, end = rowI + (last - i); k <= end; k++) A[k] /= d;
    for (let j = i + 1; j <= last; j++) {
      const f = A[rowI + (j - i)];
      if (f === 0) continue;
      let dst = j * w;
      let src = rowI + (j - i);
      for (const stop = rowI + (last - i); src <= stop; src++, dst++) A[dst] -= f * A[src];
    }
  }
}

function solveBand(A: Float64Array, n: number, b: number, x: Float64Array): void {
  const w = b + 1;
  for (let i = 0; i < n; i++) {
    const rowI = i * w;
    x[i] /= A[rowI];
    const v = x[i];
    if (v === 0) continue;
    const last = Math.min(i + b, n - 1);
    for (let j = i + 1; j <= last; j++) x[j] -= A[rowI + (j - i)] * v;
  }
  for (let i = n - 1; i >= 0; i--) {
    const rowI = i * w;
    let s = x[i];
    const last = Math.min(i + b, n - 1);
    for (let j = i + 1; j <= last; j++) s -= A[rowI + (j - i)] * x[j];
    x[i] = s / A[rowI];
  }
}

// ---- メッシュ ---------------------------------------------------------------

function inZone(z: FlowZone, x: number, y: number): boolean {
  if (z.shape === 'circle') {
    const rx = z.w / 2;
    const ry = z.h / 2;
    if (rx <= 0 || ry <= 0) return false;
    const a = (x - (z.x + rx)) / rx;
    const b = (y - (z.y + ry)) / ry;
    return a * a + b * b <= 1;
  }
  return x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h;
}

/** メッシュを細かくする基準になる最小寸法（開口の幅、開口と外周の間の残り幅など）。 */
function minFeature(model: FlowModel): number {
  let min = Infinity;
  const take = (v: number) => {
    if (v > 1e-6 && v < min) min = v;
  };
  const { width: W, height: H, zones } = model;
  zones.forEach((z, i) => {
    take(z.w);
    take(z.h);
    take(z.x);
    take(W - z.x - z.w);
    take(z.y);
    take(H - z.y - z.h);
    for (let k = i + 1; k < zones.length; k++) {
      const o = zones[k];
      const overlapY = z.y < o.y + o.h && o.y < z.y + z.h;
      const overlapX = z.x < o.x + o.w && o.x < z.x + z.w;
      if (overlapY) take(Math.max(o.x - z.x - z.w, z.x - o.x - o.w));
      if (overlapX) take(Math.max(o.y - z.y - z.h, z.y - o.y - o.h));
    }
  });
  return min;
}

export function meshGrid(model: FlowModel, opts: SolveOptions = {}): { nx: number; ny: number; dx: number; dy: number; capped: boolean } {
  const { width: W, height: H } = model;
  const div = MESH_DIVISIONS[model.mesh] ?? MESH_DIVISIONS.standard;
  const short = Math.min(W, H);
  let h0 = short / div.short;
  const feature = minFeature(model);
  if (Number.isFinite(feature)) h0 = Math.min(h0, Math.max(feature / div.feature, short / 60));
  let nx = Math.max(1, Math.round(W / h0));
  let ny = Math.max(1, Math.round(H / h0));
  const maxEl = opts.maxElements ?? DEFAULT_MAX_ELEMENTS;
  let capped = false;
  if (nx * ny > maxEl) {
    const k = Math.sqrt(maxEl / (nx * ny));
    nx = Math.max(1, Math.floor(nx * k));
    ny = Math.max(1, Math.floor(ny * k));
    capped = true;
  }
  return { nx, ny, dx: W / nx, dy: H / ny, capped };
}

export function validateModel(model: FlowModel): string | null {
  const pos = (v: number) => Number.isFinite(v) && v > 0;
  if (!pos(model.width) || !pos(model.height)) return '幅と高さに正の値を入れてください。';
  if (!pos(model.thickness)) return '壁厚に正の値を入れてください。';
  const m = model.material;
  if (!pos(m.E)) return 'ヤング係数に正の値を入れてください。';
  if (!(Number.isFinite(m.nu) && m.nu >= 0 && m.nu < 0.5)) return 'ポアソン比は 0 以上 0.5 未満にしてください。';
  if (!pos(m.ft) || !pos(m.fc)) return '材料の基準強度に正の値を入れてください。';
  if (model.supports.length === 0) return '支点を 1 つ以上入れてください。';
  const nums = [
    ...model.zones.flatMap((z) => [z.x, z.y, z.w, z.h]),
    ...model.supports.flatMap((s) => [s.from, s.to]),
    ...model.loads.flatMap((l) => (l.kind === 'line' ? [l.y, l.x0, l.x1, l.q] : l.kind === 'shear' ? [l.y, l.H] : [l.x, l.y, l.fx, l.fy])),
  ];
  if (nums.some((v) => !Number.isFinite(v))) return '数値が入っていない欄があります。';
  return null;
}

const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// ---- 解析本体 ---------------------------------------------------------------

export function solveFlow(model: FlowModel, opts: SolveOptions = {}): FlowResult {
  const t0 = nowMs();
  const invalid = validateModel(model);
  if (invalid) throw new FlowError(invalid);

  const warnings: string[] = [];
  const { width: W, height: H } = model;
  const { nx, ny, dx, dy, capped } = meshGrid(model, opts);
  if (capped) warnings.push(`要素数が上限（${(opts.maxElements ?? DEFAULT_MAX_ELEMENTS).toLocaleString()}）に達したのでメッシュを粗くしました。細部の応力は小さめに出ます。`);
  const nEl = nx * ny;
  const nn = (nx + 1) * (ny + 1);
  const nodeId = (i: number, j: number) => j * (nx + 1) + i;

  // 要素の厚さ（0 は空洞）。柱は開口より優先する。
  const thick = new Float64Array(nEl);
  const openings = model.zones.filter((z) => z.kind === 'opening');
  const columns = model.zones.filter((z) => z.kind === 'column');
  for (let j = 0; j < ny; j++) {
    const cy = (j + 0.5) * dy;
    for (let i = 0; i < nx; i++) {
      const cx = (i + 0.5) * dx;
      let t = model.thickness;
      if (openings.some((z) => inZone(z, cx, cy))) t = 0;
      for (const z of columns) if (inZone(z, cx, cy)) t = z.t && z.t > 0 ? z.t : model.thickness;
      thick[j * nx + i] = t;
    }
  }
  for (const z of model.zones) {
    if (z.w < Math.min(dx, dy) * 1.5 || z.h < Math.min(dx, dy) * 1.5) {
      warnings.push(`${z.kind === 'column' ? '柱' : '開口'}（${Math.round(z.w)}×${Math.round(z.h)}mm）がメッシュに対して小さく、形を正しく表せていません。メッシュを細かくしてください。`);
    }
  }

  const refreshNodes = (): Uint8Array => {
    const a = new Uint8Array(nn);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        if (thick[j * nx + i] > 0) {
          a[nodeId(i, j)] = 1;
          a[nodeId(i + 1, j)] = 1;
          a[nodeId(i + 1, j + 1)] = 1;
          a[nodeId(i, j + 1)] = 1;
        }
      }
    }
    return a;
  };
  let nodeActive = refreshNodes();
  if (!nodeActive.some((v) => v)) throw new FlowError('解析する部分がありません。開口が全体を覆っています。');

  // 支点
  const fixX = new Uint8Array(nn);
  const fixY = new Uint8Array(nn);
  const seeds: number[] = [];
  for (const s of model.supports) {
    const alongX = s.edge === 'bottom' || s.edge === 'top';
    const count = alongX ? nx + 1 : ny + 1;
    const step = alongX ? dx : dy;
    const nodeAt = (k: number) =>
      s.edge === 'bottom' ? nodeId(k, 0) : s.edge === 'top' ? nodeId(k, ny) : s.edge === 'left' ? nodeId(0, k) : nodeId(nx, k);
    const lo = Math.min(s.from, s.to);
    const hi = Math.max(s.from, s.to);
    const picked: number[] = [];
    if (hi - lo > 1e-6) {
      for (let k = 0; k < count; k++) {
        const c = k * step;
        // 範囲の端は最寄りの節点まで含める（格子に乗らない端でスパンが 1 要素ぶん伸びないように）
        if (c > lo - step / 2 && c < hi + step / 2 && nodeActive[nodeAt(k)]) picked.push(nodeAt(k));
      }
    }
    if (picked.length === 0) {
      // 1 点指定、または範囲に節点が無いときは最も近い節点
      const mid = (lo + hi) / 2;
      let best = -1;
      let bestD = Infinity;
      for (let k = 0; k < count; k++) {
        const d = Math.abs(k * step - mid);
        if (nodeActive[nodeAt(k)] && d < bestD) {
          bestD = d;
          best = nodeAt(k);
        }
      }
      if (best >= 0) picked.push(best);
    }
    for (const n of picked) {
      if (s.type === 'roller') {
        if (alongX) fixY[n] = 1;
        else fixX[n] = 1;
      } else {
        fixX[n] = 1;
        fixY[n] = 1;
      }
    }
    if (picked.length) {
      seeds.push(picked[0], picked[picked.length - 1]);
    }
  }

  // 支点につながっていない部分は外す（解けないので）
  const elementTouchesSupport = (e: number) => {
    const j = Math.floor(e / nx);
    const i = e - j * nx;
    return [nodeId(i, j), nodeId(i + 1, j), nodeId(i + 1, j + 1), nodeId(i, j + 1)].some((n) => fixX[n] || fixY[n]);
  };
  const reached = new Uint8Array(nEl);
  const stack: number[] = [];
  for (let e = 0; e < nEl; e++) {
    if (thick[e] > 0 && elementTouchesSupport(e)) {
      reached[e] = 1;
      stack.push(e);
    }
  }
  if (stack.length === 0) throw new FlowError('支点が解析する部分に接していません。');
  while (stack.length) {
    const e = stack.pop() as number;
    const j = Math.floor(e / nx);
    const i = e - j * nx;
    const visit = (n: number) => {
      if (thick[n] > 0 && !reached[n]) {
        reached[n] = 1;
        stack.push(n);
      }
    };
    if (i > 0) visit(e - 1);
    if (i < nx - 1) visit(e + 1);
    if (j > 0) visit(e - nx);
    if (j < ny - 1) visit(e + nx);
  }
  let removed = 0;
  for (let e = 0; e < nEl; e++) {
    if (thick[e] > 0 && !reached[e]) {
      thick[e] = 0;
      removed++;
    }
  }
  if (removed > 0) {
    warnings.push('支点につながっていない部分があったので解析から外しました。そこに掛かる荷重も無視されています。');
    nodeActive = refreshNodes();
    for (let n = 0; n < nn; n++) {
      if (!nodeActive[n]) {
        fixX[n] = 0;
        fixY[n] = 0;
      }
    }
  }

  // 自由度の番号。短い方向に並べると帯幅が小さくなる。
  const eq = new Int32Array(nn * 2).fill(-1);
  let n = 0;
  const push = (id: number) => {
    if (!nodeActive[id]) return;
    if (!fixX[id]) eq[2 * id] = n++;
    if (!fixY[id]) eq[2 * id + 1] = n++;
  };
  if (nx >= ny) {
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) push(nodeId(i, j));
  } else {
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) push(nodeId(i, j));
  }
  if (n === 0) throw new FlowError('すべての節点が拘束されています。');

  // 帯幅
  const elDofs = new Int32Array(8);
  const nodesOf = (e: number, out: Int32Array) => {
    const j = Math.floor(e / nx);
    const i = e - j * nx;
    out[0] = nodeId(i, j);
    out[1] = nodeId(i + 1, j);
    out[2] = nodeId(i + 1, j + 1);
    out[3] = nodeId(i, j + 1);
  };
  const nodes = new Int32Array(4);
  let band = 0;
  for (let e = 0; e < nEl; e++) {
    if (thick[e] <= 0) continue;
    nodesOf(e, nodes);
    let lo = Infinity;
    let hi = -1;
    for (let a = 0; a < 4; a++) {
      for (let d = 0; d < 2; d++) {
        const q = eq[2 * nodes[a] + d];
        if (q >= 0) {
          if (q < lo) lo = q;
          if (q > hi) hi = q;
        }
      }
    }
    if (hi >= 0 && hi - lo > band) band = hi - lo;
  }

  const element = buildElement(dx, dy, model.material.E, model.material.nu);
  const { ke } = element;
  const w = band + 1;
  const A = new Float64Array(n * w);
  for (let e = 0; e < nEl; e++) {
    const t = thick[e];
    if (t <= 0) continue;
    nodesOf(e, nodes);
    for (let a = 0; a < 4; a++) {
      elDofs[2 * a] = eq[2 * nodes[a]];
      elDofs[2 * a + 1] = eq[2 * nodes[a] + 1];
    }
    for (let r = 0; r < 8; r++) {
      const qr = elDofs[r];
      if (qr < 0) continue;
      for (let c = 0; c < 8; c++) {
        const qc = elDofs[c];
        if (qc < qr) continue;
        A[qr * w + (qc - qr)] += ke[r * 8 + c] * t;
      }
    }
  }

  // 荷重（N）。F は全自由度ぶん持って反力の計算にも使う。
  const F = new Float64Array(nn * 2);
  const rowOf = (y: number) => Math.max(0, Math.min(ny, Math.round(y / dy)));
  const nearestActive = (x: number, y: number): number => {
    const ci = Math.max(0, Math.min(nx, Math.round(x / dx)));
    const cj = rowOf(y);
    if (nodeActive[nodeId(ci, cj)]) return nodeId(ci, cj);
    let best = -1;
    let bestD = Infinity;
    for (let j = 0; j <= ny; j++) {
      for (let i = 0; i <= nx; i++) {
        if (!nodeActive[nodeId(i, j)]) continue;
        const d = (i * dx - x) ** 2 + (j * dy - y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = nodeId(i, j);
        }
      }
    }
    return best;
  };

  for (const l of model.loads) {
    if (l.kind === 'line') {
      const j = rowOf(l.y);
      const lo = Math.min(l.x0, l.x1);
      const hi = Math.max(l.x0, l.x1);
      for (let i = 0; i < nx; i++) {
        const a = nodeId(i, j);
        const b = nodeId(i + 1, j);
        if (!nodeActive[a] || !nodeActive[b]) continue;
        const len = Math.min(hi, (i + 1) * dx) - Math.max(lo, i * dx);
        if (len <= 0) continue;
        const f = -l.q * len; // kN/m = N/mm。y は上向き正なので下向きはマイナス
        F[2 * a + 1] += f / 2;
        F[2 * b + 1] += f / 2;
      }
    } else if (l.kind === 'shear') {
      const j = rowOf(l.y);
      const row: number[] = [];
      for (let i = 0; i <= nx; i++) if (nodeActive[nodeId(i, j)]) row.push(nodeId(i, j));
      if (row.length) for (const id of row) F[2 * id] += (l.H * 1000) / row.length;
    } else {
      const id = nearestActive(l.x, l.y);
      if (id >= 0) {
        F[2 * id] += l.fx * 1000;
        F[2 * id + 1] -= l.fy * 1000;
        seeds.push(id);
      }
    }
  }
  if (model.selfWeight) {
    const unit = model.material.density * 1e-6; // kN/m³ → N/mm³
    for (let e = 0; e < nEl; e++) {
      if (thick[e] <= 0) continue;
      nodesOf(e, nodes);
      const f = -(unit * thick[e] * dx * dy) / 4;
      for (let a = 0; a < 4; a++) F[2 * nodes[a] + 1] += f;
    }
  }

  const X = new Float64Array(n);
  for (let d = 0; d < 2 * nn; d++) if (eq[d] >= 0) X[eq[d]] = F[d];

  try {
    choleskyBand(A, n, band);
  } catch (e) {
    if (e instanceof FlowError && e.message === 'unstable') {
      throw new FlowError('支点が足りず、全体が動いてしまいます。支点を増やすか、ピン・固定の支点を入れてください。');
    }
    throw e;
  }
  solveBand(A, n, band, X);

  // 変位
  const disp = new Float64Array(nn * 2);
  for (let d = 0; d < 2 * nn; d++) if (eq[d] >= 0) disp[d] = X[eq[d]];

  // 応力（要素の角の値を節点で平均）と反力
  const sumS = new Float64Array(nn * 3);
  const cnt = new Int32Array(nn);
  const internal = new Float64Array(nn * 2);
  const de = new Float64Array(8);
  const { stress } = element;
  for (let e = 0; e < nEl; e++) {
    const t = thick[e];
    if (t <= 0) continue;
    nodesOf(e, nodes);
    for (let a = 0; a < 4; a++) {
      de[2 * a] = disp[2 * nodes[a]];
      de[2 * a + 1] = disp[2 * nodes[a] + 1];
    }
    for (let c = 0; c < 4; c++) {
      const node = nodes[c];
      for (let p = 0; p < 3; p++) {
        let s = 0;
        const base = c * 24 + p * 8;
        for (let k = 0; k < 8; k++) s += stress[base + k] * de[k];
        sumS[node * 3 + p] += s;
      }
      cnt[node]++;
    }
    for (let r = 0; r < 8; r++) {
      let s = 0;
      for (let c = 0; c < 8; c++) s += ke[r * 8 + c] * t * de[c];
      const a = r >> 1;
      internal[2 * nodes[a] + (r & 1)] += s;
    }
  }

  // 応力集中部: 入隅（周囲 4 要素のうち 3 つだけ生きている節点など）
  for (let j = 1; j < ny; j++) {
    for (let i = 1; i < nx; i++) {
      const on = (a: number, b: number) => thick[b * nx + a] > 0;
      const c = (on(i - 1, j - 1) ? 1 : 0) + (on(i, j - 1) ? 1 : 0) + (on(i - 1, j) ? 1 : 0) + (on(i, j) ? 1 : 0);
      if (c === 3 || (c === 2 && on(i - 1, j - 1) === on(i, j))) seeds.push(nodeId(i, j));
    }
  }
  const flag = new Uint8Array(nn);
  const radius = 2;
  for (const id of seeds) {
    const cj = Math.floor(id / (nx + 1));
    const ci = id - cj * (nx + 1);
    for (let j = Math.max(0, cj - radius); j <= Math.min(ny, cj + radius); j++) {
      for (let i = Math.max(0, ci - radius); i <= Math.min(nx, ci + radius); i++) {
        flag[nodeId(i, j)] = 1;
      }
    }
  }

  const ux = new Float32Array(nn).fill(NaN);
  const uy = new Float32Array(nn).fill(NaN);
  const sx = new Float32Array(nn).fill(NaN);
  const sy = new Float32Array(nn).fill(NaN);
  const txy = new Float32Array(nn).fill(NaN);
  const s1 = new Float32Array(nn).fill(NaN);
  const s2 = new Float32Array(nn).fill(NaN);
  const ratio = new Float32Array(nn).fill(NaN);

  const mat = model.material;
  const tension: PeakValue = { value: 0, x: 0, y: 0 };
  const compression: PeakValue = { value: 0, x: 0, y: 0 };
  const vertical: PeakValue = { value: 0, x: 0, y: 0 };
  const horizontal: PeakValue = { value: 0, x: 0, y: 0 };
  let concentration = 0;
  let maxRatio = 0;
  let reactionX = 0;
  let reactionY = 0;

  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const id = nodeId(i, j);
      if (!nodeActive[id] || cnt[id] === 0) continue;
      const x = i * dx;
      const y = j * dy;
      const u = disp[2 * id];
      const v = disp[2 * id + 1];
      ux[id] = u;
      uy[id] = v;
      if (Math.abs(v) > vertical.value) Object.assign(vertical, { value: Math.abs(v), x, y });
      if (Math.abs(u) > horizontal.value) Object.assign(horizontal, { value: Math.abs(u), x, y });

      const c = cnt[id];
      const a = sumS[id * 3] / c;
      const b = sumS[id * 3 + 1] / c;
      const t = sumS[id * 3 + 2] / c;
      sx[id] = a;
      sy[id] = b;
      txy[id] = t;
      const m = (a + b) / 2;
      const q = Math.hypot((a - b) / 2, t);
      const p1 = m + q;
      const p2 = m - q;
      s1[id] = p1;
      s2[id] = p2;

      let r: number;
      if (mat.criterion === 'mises') {
        r = Math.sqrt(p1 * p1 - p1 * p2 + p2 * p2) / mat.ft;
      } else {
        r = Math.max(p1 > 0 ? p1 / mat.ft : 0, p2 < 0 ? -p2 / mat.fc : 0);
      }
      ratio[id] = r;

      if (flag[id]) {
        concentration = Math.max(concentration, Math.abs(p1), Math.abs(p2));
      } else {
        if (p1 > tension.value) Object.assign(tension, { value: p1, x, y });
        if (-p2 > compression.value) Object.assign(compression, { value: -p2, x, y });
        if (r > maxRatio) maxRatio = r;
      }

      if (fixX[id]) reactionX += internal[2 * id] - F[2 * id];
      if (fixY[id]) reactionY += internal[2 * id + 1] - F[2 * id + 1];
    }
  }

  // 荷重の合計（支点上の節点に載った分も含む）
  let loadX = 0;
  let loadY = 0;
  for (let id = 0; id < nn; id++) {
    if (!nodeActive[id]) continue;
    loadX += F[2 * id];
    loadY += F[2 * id + 1];
  }

  // スパン: 鉛直を支えている節点の並びの最大の隙間、または張り出し
  const supportColumns: number[] = [];
  for (let i = 0; i <= nx; i++) {
    for (let j = 0; j <= ny; j++) {
      if (fixY[nodeId(i, j)]) {
        supportColumns.push(i);
        break;
      }
    }
  }
  let spanCells = 0;
  if (supportColumns.length) {
    spanCells = Math.max(supportColumns[0], nx - supportColumns[supportColumns.length - 1]);
    for (let k = 1; k < supportColumns.length; k++) {
      const gap = supportColumns[k] - supportColumns[k - 1];
      if (gap > 1 && gap > spanCells) spanCells = gap;
    }
  }
  const span = spanCells > 0 ? spanCells * dx : null;
  const hasHorizontal = model.loads.some((l) => (l.kind === 'shear' && l.H !== 0) || (l.kind === 'point' && l.fx !== 0));

  const summary: FlowSummary = {
    tension,
    compression,
    concentration,
    ratio: maxRatio,
    deflection: {
      vertical,
      span,
      spanRatio: span && !hasHorizontal && vertical.value > 1e-9 ? span / vertical.value : null,
      horizontal,
      driftRatio: hasHorizontal && horizontal.value > 1e-9 ? H / horizontal.value : null,
    },
    reaction: { fx: reactionX / 1000, fy: reactionY / 1000 },
    load: { fx: loadX / 1000, fy: -loadY / 1000 },
  };

  const active = new Uint8Array(nEl);
  let elements = 0;
  for (let e = 0; e < nEl; e++) {
    if (thick[e] > 0) {
      active[e] = 1;
      elements++;
    }
  }

  return {
    W,
    H,
    nx,
    ny,
    dx,
    dy,
    elements,
    dofs: n,
    bandwidth: band,
    ms: nowMs() - t0,
    active,
    nodeActive,
    flag,
    ux,
    uy,
    sx,
    sy,
    txy,
    s1,
    s2,
    ratio,
    summary,
    warnings,
  };
}

/** 指定位置に最も近い生きている節点の番号。無ければ -1。 */
export function nearestNode(r: Pick<FlowResult, 'nx' | 'ny' | 'dx' | 'dy' | 'nodeActive'>, x: number, y: number): number {
  const ci = Math.max(0, Math.min(r.nx, Math.round(x / r.dx)));
  const cj = Math.max(0, Math.min(r.ny, Math.round(y / r.dy)));
  const id = (i: number, j: number) => j * (r.nx + 1) + i;
  if (r.nodeActive[id(ci, cj)]) return id(ci, cj);
  for (let d = 1; d <= 3; d++) {
    let best = -1;
    let bestD = Infinity;
    for (let j = Math.max(0, cj - d); j <= Math.min(r.ny, cj + d); j++) {
      for (let i = Math.max(0, ci - d); i <= Math.min(r.nx, ci + d); i++) {
        if (!r.nodeActive[id(i, j)]) continue;
        const dist = (i * r.dx - x) ** 2 + (j * r.dy - y) ** 2;
        if (dist < bestD) {
          bestD = dist;
          best = id(i, j);
        }
      }
    }
    if (best >= 0) return best;
  }
  return -1;
}

// ---- 主応力線 ---------------------------------------------------------------

/** 主応力線 1 本。[x, y, 応力] の繰り返し。 */
export type StressLine = number[];

/**
 * 主応力の向きをたどって線を引く。family 1 は引張（σ1 > 0 の範囲）、2 は圧縮（σ2 < 0 の範囲）。
 * 応力の大きい場所から順に種を置き、間隔 sep より近づいたら止める。
 */
export function traceStressLines(r: FlowResult, family: 1 | 2, sep: number): { lines: StressLine[]; ref: number } {
  const { nx, ny, dx, dy, W, H, sx, sy, txy, active, flag } = r;
  const field = family === 1 ? r.s1 : r.s2;
  const sign = family === 1 ? 1 : -1;
  let ref = 0;
  for (let k = 0; k < field.length; k++) {
    const v = field[k] * sign;
    if (!flag[k] && v > ref) ref = v;
  }
  if (ref <= 0) return { lines: [], ref: 0 };
  const min = ref * 0.03;
  const step = Math.min(dx, dy) * 0.5;
  const maxSteps = Math.ceil((W + H) / step);

  const cols = Math.max(1, Math.ceil(W / sep));
  const rows = Math.max(1, Math.ceil(H / sep));
  const occupied = new Uint8Array(cols * rows);
  const cellOf = (x: number, y: number) => Math.min(rows - 1, Math.floor(y / sep)) * cols + Math.min(cols - 1, Math.floor(x / sep));

  const out = { a: 0, b: 0, t: 0 };
  const sample = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x > W || y > H) return false;
    const fx = x / dx;
    const fy = y / dy;
    const i = Math.min(nx - 1, Math.floor(fx));
    const j = Math.min(ny - 1, Math.floor(fy));
    if (!active[j * nx + i]) return false;
    const u = fx - i;
    const v = fy - j;
    const n0 = j * (nx + 1) + i;
    const n1 = n0 + 1;
    const n2 = n0 + nx + 2;
    const n3 = n0 + nx + 1;
    const mix = (f: Float32Array) => f[n0] * (1 - u) * (1 - v) + f[n1] * u * (1 - v) + f[n2] * u * v + f[n3] * (1 - u) * v;
    out.a = mix(sx);
    out.b = mix(sy);
    out.t = mix(txy);
    return true;
  };

  /** 位置の主応力の向きと、その family の値 */
  const dirAt = (x: number, y: number, prev: [number, number]): [number, number, number] | null => {
    if (!sample(x, y)) return null;
    const { a, b, t } = out;
    const m = (a + b) / 2;
    const q = Math.hypot((a - b) / 2, t);
    const value = family === 1 ? m + q : m - q;
    if (value * sign < min) return null;
    let theta = 0.5 * Math.atan2(2 * t, a - b);
    if (family === 2) theta += Math.PI / 2;
    let cx = Math.cos(theta);
    let cy = Math.sin(theta);
    if (cx * prev[0] + cy * prev[1] < 0) {
      cx = -cx;
      cy = -cy;
    }
    return [cx, cy, value];
  };

  const walk = (x0: number, y0: number, init: [number, number]): number[] => {
    const pts: number[] = [];
    let x = x0;
    let y = y0;
    let dir: [number, number] = init;
    for (let s = 0; s < maxSteps; s++) {
      const d1 = dirAt(x, y, dir);
      if (!d1) break;
      const d2 = dirAt(x + d1[0] * step * 0.5, y + d1[1] * step * 0.5, [d1[0], d1[1]]);
      if (!d2) break;
      x += d2[0] * step;
      y += d2[1] * step;
      dir = [d2[0], d2[1]];
      if (s > 0 && occupied[cellOf(Math.max(0, Math.min(W, x)), Math.max(0, Math.min(H, y)))]) break;
      pts.push(x, y, d1[2]);
    }
    return pts;
  };

  // 種: 格子の中心を応力の大きい順に
  const seeds: { x: number; y: number; v: number }[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = Math.min(W, (i + 0.5) * sep);
      const y = Math.min(H, (j + 0.5) * sep);
      const d = dirAt(x, y, [1, 0]);
      if (d) seeds.push({ x, y, v: d[2] * sign });
    }
  }
  seeds.sort((p, q) => q.v - p.v);

  const lines: StressLine[] = [];
  for (const s of seeds) {
    if (lines.length >= 500) break;
    if (occupied[cellOf(s.x, s.y)]) continue;
    const d = dirAt(s.x, s.y, [1, 0]);
    if (!d) continue;
    const fwd = walk(s.x, s.y, [d[0], d[1]]);
    const back = walk(s.x, s.y, [-d[0], -d[1]]);
    if (fwd.length + back.length < 12) continue;
    const line: StressLine = [];
    for (let k = back.length - 3; k >= 0; k -= 3) line.push(back[k], back[k + 1], back[k + 2]);
    line.push(s.x, s.y, d[2]);
    line.push(...fwd);
    for (let k = 0; k < line.length; k += 3) occupied[cellOf(Math.max(0, Math.min(W, line[k])), Math.max(0, Math.min(H, line[k + 1])))] = 1;
    lines.push(line);
  }
  return { lines, ref };
}
