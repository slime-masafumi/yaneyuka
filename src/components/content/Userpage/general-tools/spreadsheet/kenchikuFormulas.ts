/**
 * 表計算から呼べる建築計算。
 *
 * ここには「数値を受け取って数値を返す」純粋な計算だけを置く。
 * セルやエラー値の扱いは FormulaEngine 側でラップする。分けておくと
 * 設計ツール（design-tools/）と同じ式を使っていることをテストで確かめやすい。
 *
 * 根拠となる告示・規準はそれぞれのコメントに記す。数値を変えるときは
 * design-tools 側の実装と必ず突き合わせること（二重管理になっている）。
 */

// ---------------------------------------------------------------- 換気

/**
 * 24時間換気の必要換気量 [㎥/h]。
 * V = 床面積 × 天井高 × 換気回数
 * 住宅の居室は 0.5回/h 以上（建築基準法28条の2、シックハウス対策）。
 */
export function ventilation24h(areaM2: number, heightM: number, ach = 0.5): number {
  return areaM2 * heightM * ach;
}

/**
 * 火気使用室の必要換気量 [㎥/h]。昭和45年建設省告示第1826号。
 * V = N × K × Q
 *   N: 排気設備の種類による定数（フードなし40 / フードⅠ型30 / Ⅱ型20 / 煙突2）
 *   K: 燃料の単位燃焼量あたりの理論廃ガス量
 *   Q: 燃料消費量
 */
export function ventilationFire(n: number, k: number, q: number): number {
  return n * k * q;
}

/** 排気設備の定数 N。告示1826号 */
export const EXHAUST_N: Record<string, number> = {
  'フードなし': 40,
  '換気扇': 40,
  'フードI': 30,
  'フードⅠ': 30,
  'フードII': 20,
  'フードⅡ': 20,
  '煙突': 2,
};

/** 理論廃ガス量 K。都市ガス13A・LPガスは ㎥/kWh、灯油は ㎥/kg */
export const FUEL_K: Record<string, number> = {
  '都市ガス': 0.93,
  '13A': 0.93,
  'LPガス': 0.93,
  'プロパン': 0.93,
  '灯油': 12.1,
};

/** 在室人数からの必要換気量 [㎥/h]。既定は一人あたり 30 ㎥/h */
export function ventilationOccupancy(people: number, perPerson = 30): number {
  return people * perPerson;
}

// ------------------------------------------------------------ 風圧（ガラス厚）

/**
 * 地表面粗度区分ごとの定数。平成12年建設省告示第1454号 第1。
 *   Zb: 地表付近で風速が一定とみなせる高さ [m]
 *   ZG: 地表面の影響が及ばなくなる高さ [m]
 *   alpha: 平均風速の高さ方向の分布を表す指数
 */
export const ROUGHNESS: Record<number, { Zb: number; ZG: number; alpha: number }> = {
  1: { Zb: 5, ZG: 250, alpha: 0.10 },  // Ⅰ 極めて平坦・海岸線付近
  2: { Zb: 5, ZG: 350, alpha: 0.15 },  // Ⅱ 田園地帯
  3: { Zb: 5, ZG: 450, alpha: 0.20 },  // Ⅲ 一般の市街地
  4: { Zb: 10, ZG: 550, alpha: 0.27 }, // Ⅳ 大都市中心部
};

/**
 * 平均風速の高さ方向の分布を表す係数 Er。告示1454号。
 *   H ≦ Zb のとき Er = 1.7 × (Zb/ZG)^α
 *   H >  Zb のとき Er = 1.7 × (H /ZG)^α
 */
export function roughnessEr(kubun: number, heightM: number): number | null {
  const p = ROUGHNESS[kubun];
  if (!p || heightM <= 0) return null;
  const H = heightM <= p.Zb ? p.Zb : heightM;
  return 1.7 * Math.pow(H / p.ZG, p.alpha);
}

/**
 * 速度圧 q [N/m²]。q = 0.6 × Er² × Gf × V0²
 * Gf（ガスト影響係数）を省略すると 1 として簡略計算になる。
 * 設計用風圧力として使うなら Gf を入れること。
 */
export function windVelocityPressure(
  kubun: number,
  heightM: number,
  basicWindSpeed: number,
  gf = 1,
): number | null {
  const er = roughnessEr(kubun, heightM);
  if (er === null || basicWindSpeed <= 0) return null;
  return 0.6 * Math.pow(er, 2) * gf * Math.pow(basicWindSpeed, 2);
}

// ---------------------------------------------------------------- 雨水

/**
 * 屋根面積からの雨水流量 [L/min]。
 * Q = 流出係数 C × 降雨強度 I [mm/h] × 面積 A [㎡] ÷ 60
 * 降雨強度の既定 120mm/h は設計でよく使う値。
 */
export function rainFlow(areaM2: number, intensityMmH = 120, runoffC = 1): number {
  return (runoffC * intensityMmH * areaM2) / 60;
}

/**
 * 円形管の流下能力 [L/min]。マニング式。
 *   V = (1/n) × R^(2/3) × i^(1/2)   R = D/4（満流）
 *   Q = A × V
 * n は粗度係数（塩ビ管の既定 0.010）、i は勾配（1/100 なら 0.01）。
 */
export function manningCapacity(diameterMm: number, slope: number, n = 0.010): number | null {
  if (diameterMm <= 0 || slope <= 0 || n <= 0) return null;
  const D = diameterMm / 1000;
  const A = (Math.PI * Math.pow(D, 2)) / 4;
  const R = D / 4;
  const V = (1 / n) * Math.pow(R, 2 / 3) * Math.pow(slope, 1 / 2);
  return A * V * 60000; // ㎥/s → L/min
}

// ------------------------------------------------------------ 面積・寸法

/** 1坪 = 400/121 ㎡（約3.30578㎡） */
export const TSUBO_M2 = 400 / 121;
/** 1帖 = 1.62㎡（不動産公正競争規約の下限。中京間などとは異なる） */
export const JO_M2 = 1.62;
/** 1間 = 1818mm（describes 尺貫法の関東間） */
export const KEN_MM = 1818;

export const m2ToTsubo = (m2: number) => m2 / TSUBO_M2;
export const tsuboToM2 = (tsubo: number) => tsubo * TSUBO_M2;
export const m2ToJo = (m2: number) => m2 / JO_M2;
export const joToM2 = (jo: number) => jo * JO_M2;
export const kenToMm = (ken: number) => ken * KEN_MM;
export const mmToKen = (mm: number) => mm / KEN_MM;

/**
 * 勾配の変換。
 * 「4寸勾配」は 4/10。角度[度]と、水平距離に対する高さを返す。
 */
export const sunToRatio = (sun: number) => sun / 10;
export const sunToDegree = (sun: number) => (Math.atan(sun / 10) * 180) / Math.PI;
/** 勾配なりの長さ（斜辺）。水平距離 × √(1+(寸/10)²） */
export const slopeLength = (horizontal: number, sun: number) =>
  horizontal * Math.sqrt(1 + Math.pow(sun / 10, 2));

// ------------------------------------------------------------ 数量拾い

/**
 * 定尺で割って必要数を出す。
 *
 * 面積なら「1枚あたり何㎡」、長さなら「1本あたり何m」、体積なら
 * 「1袋あたり何㎥」を渡す。端数は必ず切り上げる（足りないと現場が止まる）。
 * ロス率は百分率で渡す。5 と書けば 5%。
 *
 * 単位変換ツールの数量換算と同じ考え方。定尺そのものは品目ごとに違うので、
 * こちらで表を持たず、使う側が数値で渡す。
 */
export function requiredCount(quantity: number, perUnit: number, lossPercent = 0): number | null {
  if (!(perUnit > 0)) return null;
  if (!isFinite(quantity) || !isFinite(lossPercent)) return null;
  return Math.ceil((quantity * (1 + lossPercent / 100)) / perUnit);
}

/** 1尺 = 10/33 m ≒ 303.03mm */
export const SHAKU_MM = 10000 / 33;
export const mmToShaku = (mm: number) => mm / SHAKU_MM;
export const shakuToMm = (shaku: number) => shaku * SHAKU_MM;

/** 板の呼び寸法（サブロク等）→ mm */
export const BOARD_SIZES: Record<string, [number, number]> = {
  '3x6': [910, 1820], 'サブロク': [910, 1820],
  '3x8': [910, 2420], 'サンパチ': [910, 2420],
  '3x9': [910, 2730], 'サンク': [910, 2730],
  '3x10': [910, 3030], 'サントウ': [910, 3030],
  '4x8': [1220, 2440], 'シハチ': [1220, 2440],
};

/** 面積[㎡]を張るのに要る板の枚数。規格は "3x6"（全角・×・* も可）、ロス率は% */
export function boardCount(areaM2: number, size = '3x6', lossPercent = 5): number | null {
  const key = size.normalize('NFKC').replace(/[×*X]/g, 'x').replace(/s+/g, '');
  const dims = BOARD_SIZES[key];
  if (!dims) return null;
  const per = boardArea(dims[0], dims[1]);
  return per === null ? null : requiredCount(areaM2, per, lossPercent);
}

/** 板の定尺寸法（mm）から 1 枚あたりの面積[㎡]を出す。910×1820 → 1.6562 */
export function boardArea(widthMm: number, heightMm: number): number | null {
  if (!(widthMm > 0) || !(heightMm > 0)) return null;
  return (widthMm / 1000) * (heightMm / 1000);
}
