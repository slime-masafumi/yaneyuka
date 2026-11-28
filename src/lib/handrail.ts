/**
 * 手すりの強度検討(設計ツール › 意匠設計 › 手すり強度)。2026-11-28
 *
 * 支柱 = 根元固定の片持ち梁、笠木 = 支柱間の単純梁として、笠木の高さに水平荷重 w(N/m)を掛ける。
 *   支柱: P = w × L(支柱 1 本が受け持つ幅 = 支柱ピッチ)、M = P × H、δ = P H³ / 3EI
 *   笠木: BL の試験と同じ 4 等分点 2 線荷重(P/2 を L/4・3L/4 に)。M = wL²/8、δ = 11 w L⁴ / 768EI
 *         実際の笠木は支柱の上で連続しているので、単純梁とみるのは安全側
 *
 * 荷重と判定(一次資料で確認、2026-11-28):
 *   優良住宅部品認定基準「墜落防止手すり」BLS SR:2026(2026-04-15 公表・施行、ベターリビング)
 *     表−6 強度試験の荷重: 廊下用(300 型)水平 2,950 N/m・鉛直 1,600 N/m / バルコニー用(150 型)水平 1,450 N/m・鉛直 1,600 N/m
 *       「表−6 に示す荷重において、手すり本体に破壊がないこと」。共用廊下に使う場合は 300 型
 *     表−7 たわみ: 295 N/m 時、水平 支柱 h/50・笠木 L/50、鉛直 笠木 L/100
 *       h = 支柱取付部の床立上り上端部から笠木上端部までの高さ、L = 支持間隔
 *   日本アルミ手摺工業会「共同住宅用アルミ製墜落防止手すり強度のガイドライン」(2008-06)の基本強度
 *     100 型 980 N/m(バルコニー・廊下 階段前を除く)、125 型 1,225 N/m(階段・廊下 階段前)、鉛直 1,150 N/m(2009)
 *   建築基準法には手すりの強度の数値基準は無い(令 126 条は屋上広場等の高さ 1.1m 以上の手すり壁等の設置)
 *
 * 材料の基準強度 F とヤング係数 E:
 *   鋼材 SS400・STK400・STKR400(厚さ 40mm 以下)F = 235 N/mm²(平成 12 年建設省告示第 2464 号)、E = 205,000(鋼構造許容応力度設計規準)
 *   ステンレス SUS304A F = 235 N/mm²(同 2464 号)、E = 193,000(ステンレス建築構造設計基準)
 *   アルミニウム合金 A6063-T5 / T6 は平成 13 年国土交通省告示第 1024 号 第三 第七号の表の値。
 *     既定値(T5 110・T6 165・E 70,000)は当サイトでは告示の表と照合できていないので、画面で「要確認」と出す
 *
 * 許容応力度: 人が押す荷重は一時的なので既定は短期(= F)。長期(F/1.5)も選べる。
 * 局部座屈・横座屈(フラットバーの支柱)・溶接部の強度低下(アルミは溶接部の F が大きく下がる)・アンカーの耐力は見ていない。
 */

export type MaterialId = 'steel' | 'sus304' | 'al-t5' | 'al-t6' | 'custom';
export type Material = { id: MaterialId; label: string; F: number; E: number; density: number; basisF: string; basisE: string; unconfirmed?: boolean };

export const MATERIALS: Material[] = [
  { id: 'steel', label: '鋼材 SS400・STK400・STKR400', F: 235, E: 205000, density: 7.85, basisF: '平成12年建設省告示第2464号(厚さ 40mm 以下)', basisE: '鋼構造許容応力度設計規準' },
  { id: 'sus304', label: 'ステンレス SUS304', F: 235, E: 193000, density: 7.93, basisF: '平成12年建設省告示第2464号(SUS304A)', basisE: 'ステンレス建築構造設計基準' },
  { id: 'al-t5', label: 'アルミ A6063-T5', F: 110, E: 70000, density: 2.7, basisF: '平成13年国土交通省告示第1024号 第三第七号の表', basisE: 'アルミニウム建築構造設計規準', unconfirmed: true },
  { id: 'al-t6', label: 'アルミ A6063-T6', F: 165, E: 70000, density: 2.7, basisF: '平成13年国土交通省告示第1024号 第三第七号の表', basisE: 'アルミニウム建築構造設計規準', unconfirmed: true },
  { id: 'custom', label: '材料を自分で入れる', F: 235, E: 205000, density: 7.85, basisF: '入力値', basisE: '入力値' },
];

export type LoadPreset = { id: string; label: string; w: number; wv: number | null; basis: string };

export const LOAD_PRESETS: LoadPreset[] = [
  { id: 'bl300', label: 'BL 廊下用 300 型(共用廊下)', w: 2950, wv: 1600, basis: 'BLS SR:2026 表−6(2026-04-15)' },
  { id: 'bl150', label: 'BL バルコニー用 150 型(専有部)', w: 1450, wv: 1600, basis: 'BLS SR:2026 表−6(2026-04-15)' },
  { id: 'aapc125', label: 'アルミ手摺工業会 125 型(階段・階段前の廊下)', w: 1225, wv: 1150, basis: '日本アルミ手摺工業会 強度ガイドライン(2008)' },
  { id: 'aapc100', label: 'アルミ手摺工業会 100 型(バルコニー・廊下)', w: 980, wv: 1150, basis: '日本アルミ手摺工業会 強度ガイドライン(2008)' },
  { id: 'custom', label: '荷重を自分で入れる(設計図書・特記の値)', w: 1500, wv: null, basis: '入力値' },
];

/** BLS SR:2026 表−7: たわみを見る荷重(295 N/m)と限度 */
export const DEFL_LOAD = 295;
export const DEFL_POST = 50; // 支柱 h/50
export const DEFL_RAIL = 50; // 笠木 L/50(水平)
export const DEFL_RAIL_V = 100; // 笠木 L/100(鉛直)

// ─────────────────────────────────────────────────────────────────────────────
// 断面
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 断面の形。寸法は mm。
 *   d = 荷重の向き(手すりに直角・水平)の寸法、b = 手すりに沿う向きの寸法
 *   角パイプ: b × d × t(外側の角の丸み 2t・内側 t とみなす)
 *   丸パイプ: 外径 d × t
 *   フラットバー: 厚さ b × 幅 d(幅の向きを荷重の向きにそろえて使う)
 *   自分で入れる: Z・I(荷重の向き)
 */
export type Shape =
  | { kind: 'box'; b: number; d: number; t: number }
  | { kind: 'pipe'; d: number; t: number }
  | { kind: 'flat'; b: number; d: number }
  | { kind: 'custom'; Z: number; I: number; Zv?: number; Iv?: number; A?: number };

export type SecProps = {
  /** 断面積 mm² */
  A: number;
  /** 荷重の向き(水平)に曲げたときの断面二次モーメント mm⁴・断面係数 mm³ */
  I: number;
  Z: number;
  /** 鉛直に曲げたとき(笠木の鉛直荷重) */
  Iv: number;
  Zv: number;
};

type Pt = [number, number];

/** 角を丸めた長方形の外形(中心が原点、幅 w × 高さ h、角の半径 r) */
function roundRect(w: number, h: number, r: number): Pt[] {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const pts: Pt[] = [];
  const seg = 8;
  const corners: [number, number, number][] = [
    [w / 2 - rr, h / 2 - rr, 0],
    [-w / 2 + rr, h / 2 - rr, 90],
    [-w / 2 + rr, -h / 2 + rr, 180],
    [w / 2 - rr, -h / 2 + rr, 270],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = ((a0 + (90 * i) / seg) * Math.PI) / 180;
      pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
  }
  return pts;
}

/** 多角形の面積と、重心(原点)まわりの断面二次モーメント Ix(x 軸まわり = y 方向に曲げる)・Iy */
function polyProps(p: Pt[]): { A: number; Ix: number; Iy: number } {
  let A = 0;
  let Ix = 0;
  let Iy = 0;
  for (let i = 0; i < p.length; i++) {
    const [x0, y0] = p[i];
    const [x1, y1] = p[(i + 1) % p.length];
    const c = x0 * y1 - x1 * y0;
    A += c / 2;
    Ix += ((y0 * y0 + y0 * y1 + y1 * y1) * c) / 12;
    Iy += ((x0 * x0 + x0 * x1 + x1 * x1) * c) / 12;
  }
  return { A: Math.abs(A), Ix: Math.abs(Ix), Iy: Math.abs(Iy) };
}

export function sectionProps(s: Shape): SecProps | null {
  if (s.kind === 'custom') {
    if (!(s.Z > 0 && s.I > 0)) return null;
    return { A: s.A ?? 0, I: s.I, Z: s.Z, Iv: s.Iv ?? s.I, Zv: s.Zv ?? s.Z };
  }
  if (s.kind === 'pipe') {
    const { d, t } = s;
    if (!(d > 0 && t > 0 && 2 * t < d)) return null;
    const di = d - 2 * t;
    const I = (Math.PI * (d ** 4 - di ** 4)) / 64;
    const A = (Math.PI * (d * d - di * di)) / 4;
    return { A, I, Z: I / (d / 2), Iv: I, Zv: I / (d / 2) };
  }
  if (s.kind === 'flat') {
    const { b, d } = s;
    if (!(b > 0 && d > 0)) return null;
    const I = (b * d ** 3) / 12;
    const Iv = (d * b ** 3) / 12;
    return { A: b * d, I, Z: I / (d / 2), Iv, Zv: Iv / (b / 2) };
  }
  const { b, d, t } = s;
  if (!(b > 0 && d > 0 && t > 0 && 2 * t < Math.min(b, d))) return null;
  // x = 手すりに沿う向き(幅 b)、y = 荷重の向き(d)。水平荷重は y 方向に曲げる = x 軸まわり
  const o = polyProps(roundRect(b, d, 2 * t));
  const i = polyProps(roundRect(b - 2 * t, d - 2 * t, t));
  const I = o.Ix - i.Ix;
  const Iv = o.Iy - i.Iy;
  return { A: o.A - i.A, I, Z: I / (d / 2), Iv, Zv: Iv / (b / 2) };
}

export const shapeLabel = (s: Shape) =>
  s.kind === 'box' ? `□-${s.d}×${s.b}×${s.t}` : s.kind === 'pipe' ? `○-${s.d}×${s.t}` : s.kind === 'flat' ? `FB-${s.b}×${s.d}` : `Z ${Math.round(s.Z)} mm³`;

/** 逆算(必要な断面)で当てる寸法の候補。鋼材は JIS G 3466(角形鋼管)・G 3444(鋼管)・G 3194(平鋼)の代表寸法。アルミ・ステンレスは既製品の有無をメーカーで確認 */
export const CANDIDATES: Shape[] = [
  ...(
    [
      [40, 40, 1.6], [40, 40, 2.3], [50, 50, 1.6], [50, 50, 2.3], [50, 50, 3.2], [60, 60, 2.3], [60, 60, 3.2], [75, 75, 2.3], [75, 75, 3.2], [75, 75, 4.5], [100, 100, 3.2], [100, 100, 4.5],
      [25, 50, 1.6], [25, 50, 2.3], [30, 60, 2.3], [30, 60, 3.2], [45, 75, 2.3], [45, 75, 3.2], [50, 100, 2.3], [50, 100, 3.2], [50, 100, 4.5],
    ] as [number, number, number][]
  ).map(([b, d, t]) => ({ kind: 'box' as const, b, d, t })),
  ...(
    [
      [27.2, 2.3], [34.0, 2.3], [42.7, 2.3], [48.6, 2.3], [48.6, 3.2], [60.5, 2.3], [60.5, 3.2], [76.3, 2.8], [76.3, 3.2], [89.1, 3.2], [101.6, 3.2], [101.6, 4.2],
    ] as [number, number][]
  ).map(([d, t]) => ({ kind: 'pipe' as const, d, t })),
  ...(
    [
      [9, 50], [12, 50], [9, 65], [12, 65], [16, 65], [12, 75], [16, 75], [19, 75], [12, 100], [16, 100], [19, 100], [22, 100],
    ] as [number, number][]
  ).map(([b, d]) => ({ kind: 'flat' as const, b, d })),
];

// ─────────────────────────────────────────────────────────────────────────────
// 検討
// ─────────────────────────────────────────────────────────────────────────────

export type HandrailIn = {
  /** 支柱ピッチ L(mm) */
  L: number;
  /** 支柱の取付部から笠木の上端まで h(mm) */
  H: number;
  /** 水平荷重(N/m)と、たわみを見る荷重(N/m) */
  w: number;
  ws: number;
  /** 笠木の鉛直荷重(N/m)。null = 見ない */
  wv: number | null;
  post: SecProps;
  rail: SecProps | null;
  F: number;
  E: number;
  /** 短期 = F、長期 = F/1.5 */
  term: 'short' | 'long';
  /** アンカー: 引張側と圧縮側のボルト間の距離 j(mm)と、引張側のボルトの本数 */
  anchorJ?: number;
  anchorN?: number;
};

export type Check = { key: string; label: string; value: number; limit: number; unit: string; ratio: number; formula: string };

export type HandrailOut = {
  fb: number;
  /** 支柱 1 本の荷重 P(N)・根元の曲げ M(N·mm)・せん断 Q(N) */
  P: number;
  M: number;
  Q: number;
  checks: Check[];
  /** いちばん厳しい検討(ratio が最大) */
  worst: Check;
  /** アンカー 1 本あたりの引張力(N) */
  anchorT: number | null;
};

export const allowable = (F: number, term: 'short' | 'long') => (term === 'short' ? F : F / 1.5);

export function checkHandrail(v: HandrailIn): HandrailOut {
  const fb = allowable(v.F, v.term);
  const P = (v.w * v.L) / 1000;
  const M = P * v.H;
  const Ps = (v.ws * v.L) / 1000;
  const checks: Check[] = [];
  const sp = M / v.post.Z;
  checks.push({ key: 'post-s', label: '支柱の曲げ応力度', value: sp, limit: fb, unit: 'N/mm²', ratio: sp / fb, formula: `σ = wLh / Z = ${v.w}×${v.L / 1000}×${v.H} / ${Math.round(v.post.Z)}` });
  const dp = (Ps * v.H ** 3) / (3 * v.E * v.post.I);
  checks.push({ key: 'post-d', label: `支柱の頂部のたわみ(${v.ws} N/m 時)`, value: dp, limit: v.H / DEFL_POST, unit: 'mm', ratio: dp / (v.H / DEFL_POST), formula: `δ = Ph³ / 3EI ≦ h/${DEFL_POST}` });
  if (v.rail) {
    const Mr = (v.w * v.L * v.L) / 8000;
    const sr = Mr / v.rail.Z;
    checks.push({ key: 'rail-s', label: '笠木の曲げ応力度(水平)', value: sr, limit: fb, unit: 'N/mm²', ratio: sr / fb, formula: `σ = wL²/8 / Z(4 等分点 2 線荷重・単純梁)` });
    const dr = (11 * v.ws * v.L ** 4) / (768000 * v.E * v.rail.I);
    checks.push({ key: 'rail-d', label: `笠木のたわみ(水平・${v.ws} N/m 時)`, value: dr, limit: v.L / DEFL_RAIL, unit: 'mm', ratio: dr / (v.L / DEFL_RAIL), formula: `δ = 11wL⁴ / 768EI ≦ L/${DEFL_RAIL}` });
    if (v.wv !== null && v.wv > 0) {
      const Mv = (v.wv * v.L * v.L) / 8000;
      const sv = Mv / v.rail.Zv;
      checks.push({ key: 'rail-vs', label: '笠木の曲げ応力度(鉛直)', value: sv, limit: fb, unit: 'N/mm²', ratio: sv / fb, formula: `σ = wvL²/8 / Zv` });
      const dv = (11 * v.ws * v.L ** 4) / (768000 * v.E * v.rail.Iv);
      checks.push({ key: 'rail-vd', label: `笠木のたわみ(鉛直・${v.ws} N/m 時)`, value: dv, limit: v.L / DEFL_RAIL_V, unit: 'mm', ratio: dv / (v.L / DEFL_RAIL_V), formula: `δ ≦ L/${DEFL_RAIL_V}` });
    }
  }
  const worst = checks.reduce((a, c) => (c.ratio > a.ratio ? c : a), checks[0]);
  const anchorT = v.anchorJ && v.anchorJ > 0 && v.anchorN && v.anchorN > 0 ? M / v.anchorJ / v.anchorN : null;
  return { fb, P, M, Q: P, checks, worst, anchorT };
}

// ─────────────────────────────────────────────────────────────────────────────
// 逆算
// ─────────────────────────────────────────────────────────────────────────────

export type Limit = { value: number; by: string };
const minOf = (xs: Limit[]): Limit => xs.filter((x) => Number.isFinite(x.value) && x.value > 0).reduce((a, c) => (c.value < a.value ? c : a), { value: Infinity, by: '' });

/** 支柱ピッチの上限(mm) */
export function maxPitch(v: Omit<HandrailIn, 'L'>): Limit & { all: Limit[] } {
  const fb = allowable(v.F, v.term);
  const all: Limit[] = [
    { value: (1000 * fb * v.post.Z) / (v.w * v.H), by: '支柱の曲げ応力度' },
    { value: (3000 * v.E * v.post.I) / (DEFL_POST * v.ws * v.H ** 2), by: '支柱のたわみ h/50' },
  ];
  if (v.rail) {
    all.push({ value: Math.sqrt((8000 * fb * v.rail.Z) / v.w), by: '笠木の曲げ応力度(水平)' });
    all.push({ value: Math.cbrt((768000 * v.E * v.rail.I) / (DEFL_RAIL * 11 * v.ws)), by: '笠木のたわみ L/50' });
    if (v.wv !== null && v.wv > 0) {
      all.push({ value: Math.sqrt((8000 * fb * v.rail.Zv) / v.wv), by: '笠木の曲げ応力度(鉛直)' });
      all.push({ value: Math.cbrt((768000 * v.E * v.rail.Iv) / (DEFL_RAIL_V * 11 * v.ws)), by: '笠木のたわみ(鉛直)L/100' });
    }
  }
  return { ...minOf(all), all };
}

/** 支柱の高さの上限(mm)。笠木は高さに関係しないので、笠木で決まるときは null */
export function maxHeight(v: Omit<HandrailIn, 'H'>): Limit & { all: Limit[]; railOk: boolean } {
  const fb = allowable(v.F, v.term);
  const all: Limit[] = [
    { value: (1000 * fb * v.post.Z) / (v.w * v.L), by: '支柱の曲げ応力度' },
    { value: Math.sqrt((3000 * v.E * v.post.I) / (DEFL_POST * v.ws * v.L)), by: '支柱のたわみ h/50' },
  ];
  const railOk = !v.rail || checkHandrail({ ...v, H: 1 }).checks.filter((c) => c.key.startsWith('rail')).every((c) => c.ratio <= 1);
  return { ...minOf(all), all, railOk };
}

/** 耐えられる水平荷重の上限(N/m)。たわみは 295 N/m で見るので、ここでは強さだけ */
export function maxLoad(v: Omit<HandrailIn, 'w'>): Limit & { all: Limit[] } {
  const fb = allowable(v.F, v.term);
  const all: Limit[] = [{ value: (1000 * fb * v.post.Z) / (v.L * v.H), by: '支柱の曲げ応力度' }];
  if (v.rail) all.push({ value: (8000 * fb * v.rail.Z) / (v.L * v.L), by: '笠木の曲げ応力度(水平)' });
  return { ...minOf(all), all };
}

/** 必要な断面性能(支柱・笠木) */
export function required(v: Omit<HandrailIn, 'post' | 'rail'>) {
  const fb = allowable(v.F, v.term);
  return {
    postZ: (v.w * v.L * v.H) / (1000 * fb),
    postI: (DEFL_POST * v.ws * v.L * v.H ** 2) / (3000 * v.E),
    railZ: (v.w * v.L * v.L) / (8000 * fb),
    railI: (DEFL_RAIL * 11 * v.ws * v.L ** 3) / (768000 * v.E),
    railZv: v.wv ? (v.wv * v.L * v.L) / (8000 * fb) : 0,
    railIv: v.wv ? (DEFL_RAIL_V * 11 * v.ws * v.L ** 3) / (768000 * v.E) : 0,
  };
}

export type Pick = { shape: Shape; props: SecProps; kgm: number; ratio: number };

/** 候補の中から条件を満たす断面を軽い順に。kind を指定すればその形だけ */
export function pickSections(req: { Z: number; I: number; Zv?: number; Iv?: number }, density: number, kind?: Shape['kind']): Pick[] {
  const out: Pick[] = [];
  for (const s of CANDIDATES) {
    if (kind && s.kind !== kind) continue;
    const p = sectionProps(s);
    if (!p) continue;
    const ratio = Math.max(req.Z / p.Z, req.I / p.I, req.Zv ? req.Zv / p.Zv : 0, req.Iv ? req.Iv / p.Iv : 0);
    if (ratio <= 1) out.push({ shape: s, props: p, kgm: (p.A * density) / 1000, ratio });
  }
  return out.sort((a, b) => a.kgm - b.kgm);
}
