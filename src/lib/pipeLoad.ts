/**
 * 埋設管の耐荷重の判定（外構雨水の「管渠の耐荷重」）。画面から切り離してある（scripts/test-pipe-load.ts）。
 *
 * 出典
 *   - 活荷重・剛性管（ヒューム管）: 全国ヒューム管協会「ヒューム管設計施工要覧」第2編
 *       活荷重  Pl = 2P(1+i)β / {2.75(0.2+2H)}          （式2.2.2.1-1、要覧の表 2.2.2.1-3 と一致を確認）
 *       鉛直土圧 マーストン式（溝型） Pe = γ·Cd·Bd²/Bc
 *       耐荷力  Pr = Mcr / (k·r²)、安全率 S = Pr/(Pe+Pl)
 *   - 曲げひび割れ耐力 Mcr: JIS A 5372:2016 推奨仕様 C-2（外圧管 1種・2種）
 *   - 可とう管（硬質塩ビ VU・VP）: 塩化ビニル管・継手協会の埋設設計（JSWAS K-1 と同じ組み立て）
 *       曲げ応力 σ = (k1·q + k2·L)·r'²/Z ≦ 17.7 N/mm²（曲げ強さ 88.2 を安全率 5 で除した値）
 *       たわみ率 V = (K1·q + K2·L)·r'⁴/(E·I) / (2r') ≦ 5 %（下水道用の許容値）
 *   - 管の寸法: JIS K 6741（VU・VP）
 */

// ---------------------------------------------------------------------------
// 車両（活荷重）
// ---------------------------------------------------------------------------

export type Vehicle = { id: string; label: string; grossTon: number; note: string };

/**
 * 後輪荷重 P は T-25（総重量 25t）の 100 kN を基準に、総重量に比例させる（T荷重の考え方）。
 * 構内の駐車場・通路で入る車の一番重いものを選ぶ。公道の下は T-25。
 */
export const VEHICLES: Vehicle[] = [
  { id: 'none', label: '車両なし（歩道・植栽）', grossTon: 0, note: '人・自転車のみ' },
  { id: 't2', label: '一般車（乗用車）', grossTon: 2, note: 'T-2 相当' },
  { id: 't5', label: '2t トラック', grossTon: 5, note: '総重量 約5t・T-5 相当' },
  { id: 't8', label: '4t トラック', grossTon: 8, note: '総重量 約8t・T-8 相当' },
  { id: 't20', label: '10t トラック', grossTon: 20, note: '総重量 約20t・T-20 相当（消防車・ゴミ収集車も目安はここ）' },
  { id: 't25', label: '大型車（公道 T-25）', grossTon: 25, note: '道路の下はこれ' },
];

export const wheelLoad = (grossTon: number) => (100 * grossTon) / 25;

/** 衝撃係数（要覧 表2.2.2.1-1） */
export const impactFactor = (H: number) => (H < 1.5 ? 0.5 : H < 6.5 ? 0.65 - 0.1 * H : 0);

/**
 * 活荷重による鉛直荷重（kN/m²）。
 * 要覧の式（車両占有幅 2.75m に分布）に加え、土被りが浅いときは1輪の直下の方が重くなるので、
 * 接地 0.2m × 0.5m から 45°で広がる1輪分（塩ビ管協会の浅い埋設の式）と比べて大きい方を採る。
 */
export function liveLoad(P: number, H: number): number {
  if (P <= 0) return 0;
  const i = impactFactor(H);
  const beta = 0.9;
  const lane = (2 * P * (1 + i) * beta) / (2.75 * (0.2 + 2 * H));
  const single = (P * (1 + i) * beta) / ((2 * H + 0.2) * (2 * H + 0.5));
  return Math.max(lane, single);
}

// ---------------------------------------------------------------------------
// 管
// ---------------------------------------------------------------------------

export type PipeKind = 'VU' | 'VP' | 'HP1' | 'HP2';

/** JIS K 6741 の外径・厚さ（mm） */
export const PVC: Record<number, { od: number; vp: number; vu: number }> = {
  50: { od: 60, vp: 4.1, vu: 1.8 },
  65: { od: 76, vp: 4.1, vu: 2.2 },
  75: { od: 89, vp: 5.5, vu: 2.7 },
  100: { od: 114, vp: 6.6, vu: 3.1 },
  125: { od: 140, vp: 7.0, vu: 4.1 },
  150: { od: 165, vp: 8.9, vu: 5.1 },
  200: { od: 216, vp: 10.3, vu: 6.5 },
  250: { od: 267, vp: 12.7, vu: 7.8 },
  300: { od: 318, vp: 15.1, vu: 9.2 },
};

/** JIS A 5372 外圧管: 内径 D・厚さ T（mm）、曲げひび割れ耐力（kN·m/m） */
export const HUME: Record<number, { t: number; mcr1: number; mcr2: number }> = {
  150: { t: 26, mcr1: 0.475, mcr2: 0.668 },
  200: { t: 27, mcr1: 0.615, mcr2: 0.864 },
  250: { t: 28, mcr1: 0.758, mcr2: 1.06 },
  300: { t: 30, mcr1: 0.958, mcr2: 1.37 },
  350: { t: 32, mcr1: 1.24, mcr2: 1.71 },
  400: { t: 35, mcr1: 1.55, mcr2: 2.3 },
  450: { t: 38, mcr1: 1.91, mcr2: 2.9 },
  500: { t: 42, mcr1: 2.32, mcr2: 3.67 },
  600: { t: 50, mcr1: 3.24, mcr2: 5.26 },
  700: { t: 58, mcr1: 4.2, mcr2: 6.81 },
  800: { t: 66, mcr1: 5.32, mcr2: 8.56 },
  900: { t: 75, mcr1: 6.58, mcr2: 10.5 },
  1000: { t: 82, mcr1: 7.97, mcr2: 12.7 },
};

export const PIPE_KINDS: { id: PipeKind; label: string }[] = [
  { id: 'VU', label: 'VU（硬質塩ビ 薄肉）' },
  { id: 'VP', label: 'VP（硬質塩ビ 厚肉）' },
  { id: 'HP1', label: 'HP ヒューム管 外圧1種' },
  { id: 'HP2', label: 'HP ヒューム管 外圧2種' },
];

export const sizesOf = (kind: PipeKind) => Object.keys(kind === 'VU' || kind === 'VP' ? PVC : HUME).map(Number);
export const isRigid = (kind: PipeKind) => kind === 'HP1' || kind === 'HP2';

/** 管の外径（m） */
export const outerDiameter = (kind: PipeKind, size: number) =>
  isRigid(kind) ? (size + 2 * (HUME[size]?.t ?? 0)) / 1000 : (PVC[size]?.od ?? size) / 1000;

// ---------------------------------------------------------------------------
// 基礎
// ---------------------------------------------------------------------------

export type Bedding = { id: string; label: string; forRigid: boolean };

export const BEDDINGS: Bedding[] = [
  // 塩ビ管（有効支承角で係数が決まる）
  { id: 'pvc60', label: '砂基礎（管の下半分を砂で）有効支承角 60°', forRigid: false },
  { id: 'pvc90', label: '砂基礎（管の半分まで砂で巻く）有効支承角 90°', forRigid: false },
  { id: 'pvc120', label: '全周砂巻き 有効支承角 120°', forRigid: false },
  // ヒューム管（要覧 表2.2.1-1）
  { id: 'sand60', label: '砂基礎 支承角 60°', forRigid: true },
  { id: 'sand90', label: '砂基礎 支承角 90°', forRigid: true },
  { id: 'sand120', label: '砂基礎 支承角 120°', forRigid: true },
  { id: 'conc90', label: 'コンクリート基礎 90°', forRigid: true },
  { id: 'conc120', label: 'コンクリート基礎 120°', forRigid: true },
  { id: 'conc180', label: 'コンクリート基礎 180°', forRigid: true },
];

/** ヒューム管の曲げモーメント係数 k（要覧 表2.2.1-1） */
const HUME_K: Record<string, number> = { sand60: 0.377, sand90: 0.314, sand120: 0.275, conc90: 0.303, conc120: 0.243, conc180: 0.22 };

/** 塩ビ管の係数（塩ビ管協会 表3）: 曲げモーメント係数 k1 管頂・管底、たわみ係数 K1 */
const PVC_K: Record<string, { k1Top: number; k1Bottom: number; K1: number }> = {
  pvc60: { k1Top: 0.132, k1Bottom: 0.223, K1: 0.102 },
  pvc90: { k1Top: 0.12, k1Bottom: 0.16, K1: 0.085 },
  pvc120: { k1Top: 0.107, k1Bottom: 0.121, K1: 0.07 },
};
const PVC_K2 = { top: 0.079, bottom: 0.011, K2: 0.03 };

export const PVC_E = 2942; // N/mm²
export const PVC_ALLOW_STRESS = 17.7; // N/mm²
export const PVC_ALLOW_DEFLECTION = 5; // %
export const SOIL_UNIT_WEIGHT = 18; // kN/m³

// ---------------------------------------------------------------------------
// 判定
// ---------------------------------------------------------------------------

export type PipeInput = {
  kind: PipeKind;
  size: number;
  /** 土被り（地表から管頂まで） m */
  cover: number;
  vehicle: string;
  bedding: string;
  /** 溝の掘削幅（ヒューム管のマーストン式に使う）。省略時は外径 + 0.6m */
  trenchWidth?: number;
  gamma?: number;
};

export type Check = { label: string; value: number; limit: number; unit: string; ok: boolean; ratio: number };

export type PipeResult = {
  ok: boolean;
  /** 埋戻し土による鉛直土圧 kN/m² */
  earth: number;
  /** 活荷重による鉛直荷重 kN/m² */
  live: number;
  wheel: number;
  checks: Check[];
  notes: string[];
};

/** マーストン式・溝型の荷重係数 Cd（φ=30°、K·μ = 0.1924） */
export function marstonCd(H: number, Bd: number, Kmu = 0.1924): number {
  return (1 - Math.exp((-2 * Kmu * H) / Bd)) / (2 * Kmu);
}

export function checkPipe(inp: PipeInput): PipeResult | null {
  const H = inp.cover;
  if (!(H > 0)) return null;
  const vehicle = VEHICLES.find((v) => v.id === inp.vehicle) ?? VEHICLES[0];
  const P = wheelLoad(vehicle.grossTon);
  const live = liveLoad(P, H);
  const gamma = inp.gamma ?? SOIL_UNIT_WEIGHT;
  const notes: string[] = [];
  if (P > 0 && H < 0.6) notes.push('車両が通る所の土被りは 0.6m 以上を目安にしてください（浅いほど車両の荷重が集中します）');

  if (isRigid(inp.kind)) {
    const spec = HUME[inp.size];
    const k = HUME_K[inp.bedding];
    if (!spec || k === undefined) return null;
    const D = inp.size / 1000;
    const T = spec.t / 1000;
    const Bc = D + 2 * T;
    const Bd = inp.trenchWidth && inp.trenchWidth > Bc ? inp.trenchWidth : Bc + 0.6;
    const earth = gamma * marstonCd(H, Bd) * (Bd * Bd) / Bc;
    const r = (D + T) / 2;
    const mcr = inp.kind === 'HP1' ? spec.mcr1 : spec.mcr2;
    const capacity = mcr / (k * r * r);
    const S = capacity / (earth + live);
    return {
      ok: S >= 1,
      earth,
      live,
      wheel: P,
      checks: [
        { label: '耐荷力 ÷（土圧＋活荷重）', value: S, limit: 1, unit: '', ok: S >= 1, ratio: 1 / S },
      ],
      notes: [
        ...notes,
        `耐荷力 ${capacity.toFixed(1)} kN/m²（曲げひび割れ耐力 ${mcr} kN·m/m ÷ k ${k} ÷ r² ）`,
        `鉛直土圧はマーストン式（溝型）。掘削幅 ${Bd.toFixed(2)} m で計算しています`,
      ],
    };
  }

  const spec = PVC[inp.size];
  const kk = PVC_K[inp.bedding];
  if (!spec || !kk) return null;
  const t = inp.kind === 'VP' ? spec.vp : spec.vu;
  const r = (spec.od - t) / 2; // mm
  const Z = (t * t) / 6; // mm³/mm
  const I = (t * t * t) / 12; // mm⁴/mm
  const earth = gamma * H; // 塩ビ管は直土圧（アーチ作用を当てにしない）
  const q = earth / 1000; // N/mm²
  const L = live / 1000;
  const sigmaTop = ((kk.k1Top * q + PVC_K2.top * L) * r * r) / Z;
  const sigmaBottom = ((kk.k1Bottom * q + PVC_K2.bottom * L) * r * r) / Z;
  const sigma = Math.max(sigmaTop, sigmaBottom);
  const delta = ((kk.K1 * q + PVC_K2.K2 * L) * r ** 4) / (PVC_E * I); // mm
  const V = (delta / (2 * r)) * 100;
  const checks: Check[] = [
    { label: `曲げ応力（${sigmaTop >= sigmaBottom ? '管頂' : '管底'}）`, value: sigma, limit: PVC_ALLOW_STRESS, unit: 'N/mm²', ok: sigma <= PVC_ALLOW_STRESS, ratio: sigma / PVC_ALLOW_STRESS },
    { label: 'たわみ率', value: V, limit: PVC_ALLOW_DEFLECTION, unit: '%', ok: V <= PVC_ALLOW_DEFLECTION, ratio: V / PVC_ALLOW_DEFLECTION },
  ];
  return {
    ok: checks.every((c) => c.ok),
    earth,
    live,
    wheel: P,
    checks,
    notes: [...notes, `管厚 ${t} mm・たわみ量 ${delta.toFixed(1)} mm`],
  };
}

/** 判定が OK になる土被りの範囲を 0.1m 刻みで探す（「何mまでならOKか」を出す） */
export function coverRange(inp: Omit<PipeInput, 'cover'>, from = 0.3, to = 6): { min: number | null; max: number | null } {
  let min: number | null = null;
  let max: number | null = null;
  for (let h = from; h <= to + 1e-9; h += 0.1) {
    const r = checkPipe({ ...inp, cover: Math.round(h * 10) / 10 });
    if (r?.ok) {
      if (min === null) min = Math.round(h * 10) / 10;
      max = Math.round(h * 10) / 10;
    }
  }
  return { min, max };
}
