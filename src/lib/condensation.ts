/**
 * 意匠設計 › 結露検討の計算。画面から切り離してある（scripts/test-condensation.ts）。
 *
 * 定常計算（グレイザー法）
 *   温度    : 室内 → 外側へ、熱抵抗 R の比で直線的に下がる
 *   水蒸気圧: 室内 → 外側へ、透湿抵抗 Sd（= 厚さ × 透湿抵抗比 μ）の比で直線的に下がる
 *   判定    : 各界面で 水蒸気圧 > 飽和水蒸気圧 なら結露（0℃未満は氷面＝霜）
 *
 * 層の並びは画面と同じ「外側（室外・地盤）→ 室内側」。
 * isBonded は「この層の外側の界面が密着（打込み・吹付で隙間が無い）」で、その界面は判定しない。
 */

// ---------------------------------------------------------------- 材料

export interface Material {
  id: string;
  name: string;
  lambda: number; // 熱伝導率 [W/(m·K)]
  mu: number; // 透湿抵抗比 [-]
  category: string;
  fixedR?: number; // 厚さによらない熱抵抗 [m²K/W]（中空層）。指定時は λ を使わない
}

export const CATEGORY_LABELS: Record<string, string> = {
  finish: '仕上/外装',
  roof: '屋根材',
  air: '空気層',
  membrane: 'シート',
  structure: '構造/躯体',
  insulation: '断熱材',
  board: '下地/PB',
  floor: '床仕上',
};

export const DEFAULT_MATERIALS: Material[] = [
  // --- 外装 ---
  { id: 'ext_siding', name: '窯業系サイディング', lambda: 1.0, mu: 40, category: 'finish' },
  { id: 'metal_siding', name: '金属サイディング', lambda: 0.04, mu: 1000, category: 'finish' }, // 断熱裏打込
  { id: 'alc', name: 'ALCパネル', lambda: 0.17, mu: 10, category: 'finish' },
  { id: 'ecp', name: '押出成形セメント板(ECP)', lambda: 0.40, mu: 60, category: 'finish' }, // JIS A 5441 解説: 約0.34〜0.47
  { id: 'mortar', name: 'モルタル', lambda: 1.5, mu: 30, category: 'finish' },
  { id: 'galvalume', name: 'ガルバリウム鋼板', lambda: 50, mu: 100000, category: 'finish' },

  // --- 屋根 ---
  { id: 'roof_slate', name: '化粧スレート', lambda: 1.0, mu: 150, category: 'roof' },
  { id: 'roof_metal', name: '金属屋根(鋼板)', lambda: 50, mu: 100000, category: 'roof' },
  { id: 'roof_folded', name: '折板(ダブル折板用鋼板)', lambda: 50, mu: 100000, category: 'roof' },

  // --- 空気層 ---
  // 中空層の熱抵抗は厚さに比例しない（対流・放射が支配的）。現場施工の密閉中空層 0.09 m²K/W で固定
  { id: 'air_stat', name: '密閉空気層', lambda: 0.14, mu: 1, category: 'air', fixedR: 0.09 },
  // 通気層: これより外側の層は計算から除外し、外気側表面熱伝達抵抗を室内側と同値にする
  { id: 'air_vent', name: '通気層(外気導入)', lambda: 100, mu: 0.01, category: 'air' },

  // --- シート ---
  // JIS A 6111 透湿抵抗 0.19 m²·s·Pa/μg 以下 → 等価空気層厚 Sd ≒ 0.036m（0.2mm 換算で μ≒180）
  { id: 'breathable', name: '透湿防水シート', lambda: 0.2, mu: 180, category: 'membrane' },
  { id: 'asphalt_roofing', name: 'アスファルトルーフィング', lambda: 0.15, mu: 40000, category: 'membrane' },
  // JIS A 6930 B種 透湿抵抗 0.144 m²·s·Pa/ng 相当（0.2mm で Sd≒29m）。μ は厚さあたりなので 0.1mm 品にも使える
  { id: 'pe_film', name: '防湿気密シート/防湿フィルム(PE)', lambda: 0.33, mu: 144000, category: 'membrane' },
  { id: 'vapor_barrier', name: '可変透湿気密シート', lambda: 0.33, mu: 10000, category: 'membrane' },

  // --- 構造 ---
  { id: 'plywood', name: '構造用合板', lambda: 0.16, mu: 20, category: 'structure' },
  { id: 'osb', name: 'OSB合板', lambda: 0.13, mu: 50, category: 'structure' },
  { id: 'concrete', name: 'コンクリート', lambda: 1.6, mu: 40, category: 'structure' },

  // --- 断熱材 ---
  { id: 'pef_sheet', name: 'ペフ(ポリエチレンフォーム)', lambda: 0.04, mu: 100, category: 'insulation' },
  { id: 'gw_10k', name: 'グラスウール 10K', lambda: 0.050, mu: 1.1, category: 'insulation' },
  { id: 'gw_16k', name: '高性能GW 16K', lambda: 0.038, mu: 1.2, category: 'insulation' },
  { id: 'gw_24k', name: '高性能GW 24K', lambda: 0.036, mu: 1.2, category: 'insulation' },
  { id: 'gw_32k', name: '高性能GW 32K', lambda: 0.035, mu: 1.2, category: 'insulation' },
  { id: 'rockwool', name: 'ロックウール', lambda: 0.038, mu: 1.2, category: 'insulation' },
  { id: 'xps_1', name: 'XPS 1種(スタイロフォームIB等)', lambda: 0.040, mu: 100, category: 'insulation' },
  { id: 'xps_3', name: 'XPS 3種b(スタイロフォームFG等)', lambda: 0.028, mu: 150, category: 'insulation' },
  { id: 'urethane_1', name: '硬質ウレタンフォーム 1種', lambda: 0.024, mu: 50, category: 'insulation' },
  { id: 'urethane_2', name: '硬質ウレタンフォーム 2種', lambda: 0.023, mu: 50, category: 'insulation' },
  { id: 'phenolic', name: 'フェノールフォーム(ネオマ等)', lambda: 0.020, mu: 20, category: 'insulation' },
  { id: 'eps', name: 'ビーズ法ポリスチレン(EPS)', lambda: 0.034, mu: 30, category: 'insulation' },
  { id: 'cellulose', name: 'セルロースファイバー', lambda: 0.040, mu: 2, category: 'insulation' },
  { id: 'wool', name: '羊毛断熱材(ウール)', lambda: 0.040, mu: 1.3, category: 'insulation' },

  // --- 下地・内装 ---
  { id: 'gb', name: '石膏ボード', lambda: 0.22, mu: 10, category: 'board' },
  { id: 'calcium_silicate', name: 'ケイ酸カルシウム板', lambda: 0.17, mu: 10, category: 'board' },

  // --- 床 ---
  { id: 'flooring', name: '複合フローリング', lambda: 0.12, mu: 50, category: 'floor' },
  { id: 'tatami', name: '畳', lambda: 0.11, mu: 5, category: 'floor' },
  { id: 'carpet', name: 'カーペット', lambda: 0.06, mu: 2, category: 'floor' },
];

/** 断面図のハッチング（図面の材料表示に倣う） */
export type Hatch = 'concrete' | 'mortar' | 'cement' | 'alc' | 'metal' | 'wood' | 'insul' | 'board' | 'membrane' | 'air' | 'vent' | 'none';
export const hatchOf = (m: Material | undefined): Hatch => {
  if (!m) return 'none';
  if (m.id === 'air_vent') return 'vent';
  if (m.id === 'concrete') return 'concrete';
  if (m.id === 'mortar') return 'mortar';
  if (m.id === 'alc') return 'alc';
  if (['galvalume', 'roof_metal', 'roof_folded', 'metal_siding'].includes(m.id)) return 'metal';
  if (['plywood', 'osb', 'flooring', 'tatami'].includes(m.id)) return 'wood';
  const byCat: Record<string, Hatch> = {
    finish: 'cement', roof: 'cement', membrane: 'membrane', air: 'air', insulation: 'insul',
    board: 'board', floor: 'wood', structure: 'wood',
  };
  return byCat[m.category] ?? 'none';
};

// ---------------------------------------------------------------- 部位・プリセット

export type PartId = 'wall' | 'roof' | 'floor' | 'slab' | 'foundation' | 'partition';
export const PARTS: { id: PartId; label: string }[] = [
  { id: 'wall', label: '外壁' },
  { id: 'roof', label: '屋根' },
  { id: 'floor', label: '床' },
  { id: 'slab', label: '土間' },
  { id: 'foundation', label: '基礎' },
  { id: 'partition', label: '間仕切' },
];

export interface Layer {
  id: string;
  materialId: string;
  thickness: number | '';
  isBonded?: boolean;
}

export interface Preset {
  part: PartId;
  name: string;
  rsi: number;
  rse: number;
  layers: Omit<Layer, 'id'>[];
}

// 室内側 Rsi: 壁 0.11 / 屋根・天井（熱流上向き）0.09 / 床・土間（熱流下向き）0.15、外気側 Rse 0.04（省エネ基準）
// 土間の rse は使わない（地中温度・地盤考慮深さから決める）
export const PRESETS: Record<string, Preset> = {
  wall_wood: {
    part: 'wall', name: '木造 · 通気工法', rsi: 0.11, rse: 0.04,
    layers: [
      { materialId: 'ext_siding', thickness: 16 },
      { materialId: 'air_vent', thickness: 18 },
      { materialId: 'breathable', thickness: 0.2 },
      { materialId: 'plywood', thickness: 9 },
      { materialId: 'gw_16k', thickness: 105 },
      { materialId: 'pe_film', thickness: 0.2 },
      { materialId: 'gb', thickness: 12.5 },
    ],
  },
  wall_s: {
    part: 'wall', name: 'S造 · ALC＋ウレタン', rsi: 0.11, rse: 0.04,
    layers: [
      { materialId: 'alc', thickness: 100 },
      { materialId: 'urethane_1', thickness: 25 },
      { materialId: 'air_stat', thickness: 45 },
      { materialId: 'gb', thickness: 12.5 },
    ],
  },
  wall_rc: {
    part: 'wall', name: 'RC造 · 内断熱', rsi: 0.11, rse: 0.04,
    layers: [
      { materialId: 'concrete', thickness: 150 },
      { materialId: 'urethane_1', thickness: 30 },
      { materialId: 'air_stat', thickness: 20 },
      { materialId: 'gb', thickness: 9.5 },
    ],
  },
  roof_wood: {
    part: 'roof', name: '木造 · 屋根断熱', rsi: 0.09, rse: 0.04,
    layers: [
      { materialId: 'roof_slate', thickness: 6 },
      { materialId: 'asphalt_roofing', thickness: 1 },
      { materialId: 'plywood', thickness: 12 },
      { materialId: 'gw_16k', thickness: 185 },
      { materialId: 'pe_film', thickness: 0.2 },
      { materialId: 'gb', thickness: 9.5 },
    ],
  },
  roof_double: {
    part: 'roof', name: 'S造 · ダブル折板', rsi: 0.09, rse: 0.04,
    layers: [
      { materialId: 'roof_folded', thickness: 0.8 },
      { materialId: 'gw_32k', thickness: 100 },
      { materialId: 'roof_folded', thickness: 0.6 },
      { materialId: 'air_stat', thickness: 100 },
      { materialId: 'pe_film', thickness: 0.2 },
      { materialId: 'gb', thickness: 9.5 },
    ],
  },
  roof_s: {
    part: 'roof', name: 'S造 · シングル折板＋天井断熱', rsi: 0.09, rse: 0.04,
    layers: [
      { materialId: 'roof_metal', thickness: 0.6 },
      { materialId: 'pef_sheet', thickness: 4 },
      { materialId: 'air_stat', thickness: 100 },
      { materialId: 'gw_16k', thickness: 100 },
      { materialId: 'gb', thickness: 9.5 },
    ],
  },
  roof_rc: {
    part: 'roof', name: 'RC造 · 外断熱（押えコン）', rsi: 0.09, rse: 0.04,
    layers: [
      { materialId: 'concrete', thickness: 60 },
      { materialId: 'xps_3', thickness: 50 },
      { materialId: 'asphalt_roofing', thickness: 4 },
      { materialId: 'concrete', thickness: 150 },
      { materialId: 'gb', thickness: 9.5 },
    ],
  },
  floor_wood: {
    part: 'floor', name: '木造 · 床下断熱', rsi: 0.15, rse: 0.04,
    layers: [
      { materialId: 'gw_24k', thickness: 80 },
      { materialId: 'plywood', thickness: 24 },
      { materialId: 'flooring', thickness: 12 },
    ],
  },
  floor_rc: {
    part: 'floor', name: 'RC造 · 外気に接する床', rsi: 0.15, rse: 0.04,
    layers: [
      { materialId: 'concrete', thickness: 150 },
      { materialId: 'xps_3', thickness: 30 },
      { materialId: 'concrete', thickness: 40 },
      { materialId: 'flooring', thickness: 12 },
    ],
  },
  slab_plain: {
    part: 'slab', name: '土間コンクリート · 断熱なし', rsi: 0.15, rse: 0,
    layers: [
      { materialId: 'pe_film', thickness: 0.1 },
      { materialId: 'concrete', thickness: 150, isBonded: true },
    ],
  },
  slab_xps: {
    part: 'slab', name: 'スラブ下断熱 · XPS 50', rsi: 0.15, rse: 0,
    layers: [
      { materialId: 'pe_film', thickness: 0.1 },
      { materialId: 'xps_3', thickness: 50 },
      { materialId: 'concrete', thickness: 150, isBonded: true },
    ],
  },
  slab_floor: {
    part: 'slab', name: '土間コン＋置床（フローリング）', rsi: 0.15, rse: 0,
    layers: [
      { materialId: 'pe_film', thickness: 0.1 },
      { materialId: 'concrete', thickness: 150, isBonded: true },
      { materialId: 'air_stat', thickness: 80 },
      { materialId: 'plywood', thickness: 20 },
      { materialId: 'flooring', thickness: 12 },
    ],
  },
  foundation_rc: {
    part: 'foundation', name: 'RC造 · 基礎外断熱', rsi: 0.11, rse: 0.04,
    layers: [
      { materialId: 'concrete', thickness: 150 },
      { materialId: 'xps_3', thickness: 50 },
    ],
  },
  partition_wall: {
    part: 'partition', name: 'GW充填 · 両面PB', rsi: 0.11, rse: 0.11,
    layers: [
      { materialId: 'gb', thickness: 12.5 },
      { materialId: 'gw_16k', thickness: 100 },
      { materialId: 'gb', thickness: 12.5 },
    ],
  },
};

// ---------------------------------------------------------------- 条件の目安

export type Season = 'winter' | 'summer';

/** 外気の目安（冬: 1月の日最低気温の平年値付近 / 夏: 8月の日最高気温付近）。設計では地域の気象データで確認する */
export const CITIES: { id: string; label: string; winter: [number, number]; summer: [number, number] }[] = [
  { id: 'sapporo', label: '札幌', winter: [-7, 75], summer: [27, 70] },
  { id: 'sendai', label: '仙台', winter: [-2, 70], summer: [28, 75] },
  { id: 'tokyo', label: '東京', winter: [1, 55], summer: [32, 60] },
  { id: 'osaka', label: '大阪', winter: [3, 60], summer: [33, 60] },
  { id: 'fukuoka', label: '福岡', winter: [4, 65], summer: [32, 65] },
  { id: 'naha', label: '那覇', winter: [15, 70], summer: [32, 70] },
];

export const ROOMS: Record<Season, { id: string; label: string; t: number; rh: number }[]> = {
  winter: [
    { id: 'living', label: '居室', t: 20, rh: 50 },
    { id: 'bed', label: '寝室（加湿・閉め切り）', t: 18, rh: 60 },
    { id: 'wet', label: '浴室・脱衣室の隣', t: 20, rh: 70 },
    { id: 'office', label: '事務所', t: 22, rh: 40 },
  ],
  summer: [
    { id: 'cool', label: '冷房室', t: 26, rh: 50 },
    { id: 'dirt', label: '非空調の土間・倉庫', t: 28, rh: 75 },
    { id: 'office', label: '事務所（冷房）', t: 26, rh: 45 },
  ],
};

/** 土間の地中温度の目安（地域の年平均気温 ±数℃） */
export const SLAB_GROUND_TEMP: Record<Season, number> = { winter: 10, summer: 18 };

// ---------------------------------------------------------------- 湿り空気

/** 飽和水蒸気圧（水面）[Pa]（Tetens） */
export const satPressureWater = (t: number): number => 610.78 * Math.pow(10, (7.5 * t) / (t + 237.3));
/** 飽和水蒸気圧（氷面）[Pa]（Tetens） */
export const satPressureIce = (t: number): number => 610.78 * Math.pow(10, (9.5 * t) / (t + 265.3));
/**
 * 結露判定に使う飽和水蒸気圧 [Pa]。0℃未満は氷面（霜）で判定する。
 * 水面のまま判定すると飽和圧を高く見積もり、氷点下の界面で結露（霜）を見逃す
 */
export const satPressure = (t: number): number => (t < 0 ? satPressureIce(t) : satPressureWater(t));
/** 温度・相対湿度から水蒸気分圧 [Pa]。相対湿度は氷点下でも水面基準（気象庁の観測値と同じ定義） */
export const vaporPressure = (t: number, rh: number): number => satPressureWater(t) * (rh / 100);
/** 露点温度 [℃]（0℃未満は霜点）。satPressure の逆関数 */
export const dewPoint = (pressure: number): number => {
  if (pressure <= 0) return -50;
  const A = Math.log10(pressure / 610.78);
  if (A >= 0) return (237.3 * A) / (7.5 - A);
  return (265.3 * A) / (9.5 - A);
};
/** 重量絶対湿度 [kg/kg(DA)] */
export const absoluteHumidity = (t: number, rh: number): number => {
  const pv = vaporPressure(t, rh);
  const P = 101325;
  if (P <= pv) return 0.1;
  return (0.622 * pv) / (P - pv);
};

// ---------------------------------------------------------------- 計算

export interface Conditions {
  ti: number; rhi: number; // 室内
  te: number; rhe: number; // 室外（土間は地中）
  rsi: number; rse: number; // rse は土間なら地盤の熱抵抗 Rg
  isSlab?: boolean;
}

/** 判定の状態。zone は判定しない領域（通気層より外側 / 土間の防湿層より地盤側） */
export type Status = 'ok' | 'ng' | 'bonded' | 'vent' | 'ground' | 'ground-ng';

export interface LayerResult {
  layer: Layer;
  material: Material | undefined;
  d: number; // mm
  r: number; // 熱抵抗 [m²K/W]
  sd: number; // 透湿抵抗 [m]
  excluded: boolean; // 通気層より外側で計算しない
}

export interface Interface {
  k: number; // 0 = 外側表面 … n = 室内表面
  temp: number;
  dewPoint: number;
  pressure: number;
  satPressure: number;
  margin: number; // 温度 − 露点
  status: Status;
}

export interface Profile {
  layers: LayerResult[]; // 外側 → 室内
  interfaces: Interface[]; // 外側 → 室内（layers.length + 1 個）
  uValue: number;
  rTotal: number;
  rseUsed: number;
  ventApplied: boolean;
  ng: Interface[];
  isCondensing: boolean;
  worst: Interface | null; // 判定対象のうち余裕が最小（NG なら最も厳しい箇所）
  surface: Interface; // 室内表面
  pi: number;
  pe: number;
}

const VENTED = new Set(['air_vent']);
/** 土間で「地盤側の防湿層」とみなす透湿抵抗 Sd [m] */
const GROUND_BARRIER_SD = 1;

export const validLayers = (layers: Layer[]) => layers.filter((l) => l.materialId !== '' && l.thickness !== '');

export function calculateProfile(input: Layer[], c: Conditions, materials: Material[]): Profile {
  const src = validLayers(input);
  const n = src.length;
  // 通気層: 室内側から見て最初の通気層とその外側は外気とみなす
  let ventIdx = -1;
  for (let i = n - 1; i >= 0; i--) if (VENTED.has(src[i].materialId)) { ventIdx = i; break; }
  const ventApplied = ventIdx >= 0;
  // 通気層に接する面の外気側表面熱伝達抵抗は室内側と同値（省エネ基準の扱い）
  const rseUsed = ventApplied ? c.rsi : c.rse;

  const layers: LayerResult[] = src.map((layer, i) => {
    const material = materials.find((m) => m.id === layer.materialId);
    const d = Number(layer.thickness) || 0;
    const excluded = ventApplied && i <= ventIdx;
    const lambda = material?.lambda ?? 1;
    const r = excluded ? 0 : material?.fixedR ?? (lambda > 0 ? d / 1000 / lambda : 0);
    const sd = excluded ? 0 : (d / 1000) * (material?.mu ?? 1);
    return { layer, material, d, r, sd, excluded };
  });

  const rTotal = c.rsi + layers.reduce((s, l) => s + l.r, 0) + rseUsed;
  const sdTotal = layers.reduce((s, l) => s + l.sd, 0);
  const pi = vaporPressure(c.ti, c.rhi);
  const pe = vaporPressure(c.te, c.rhe);
  const activeCount = layers.filter((l) => !l.excluded).length;

  // 土間: 地盤側で最初に現れる防湿層の室内側の面から地盤側は、土壌水分の影響域として判定しない
  // （下向きの水蒸気流で計算上は飽和するが、量はごく僅かで、土壌はもともと湿潤）
  let groundBarrier = -1;
  if (c.isSlab) {
    groundBarrier = layers.findIndex((l) => l.material?.category === 'membrane' && l.sd >= GROUND_BARRIER_SD);
  }

  // 室内側から積み上げる
  const temps: number[] = new Array(n + 1);
  const pres: number[] = new Array(n + 1);
  temps[n] = c.ti - (c.rsi / rTotal) * (c.ti - c.te);
  pres[n] = pi;
  let rAcc = c.rsi;
  let sdAcc = 0;
  let active = 0;
  for (let i = n - 1; i >= 0; i--) {
    const l = layers[i];
    if (l.excluded) {
      temps[i] = c.te;
      pres[i] = pe;
      continue;
    }
    active++;
    rAcc += l.r;
    sdAcc += l.sd;
    temps[i] = c.ti - (rAcc / rTotal) * (c.ti - c.te);
    const ratio = sdTotal > 0 ? sdAcc / sdTotal : active / Math.max(activeCount, 1);
    pres[i] = pi - ratio * (pi - pe);
  }

  const interfaces: Interface[] = temps.map((temp, k) => {
    const inner = layers[k]; // 界面 k の室内側の層
    const ps = satPressure(temp);
    const pressure = pres[k];
    const dp = dewPoint(pressure);
    const risky = pressure > ps + 1;
    let status: Status;
    if (inner ? inner.excluded : false) status = 'vent';
    else if (c.isSlab && (k === 0 || (groundBarrier >= 0 && k <= groundBarrier + 1))) status = risky ? 'ground-ng' : 'ground';
    else if (k > 0 && inner?.layer.isBonded) status = 'bonded';
    else status = risky ? 'ng' : 'ok';
    return { k, temp, dewPoint: dp, pressure, satPressure: ps, margin: temp - dp, status };
  });

  const judged = interfaces.filter((f) => f.status === 'ok' || f.status === 'ng');
  const ng = interfaces.filter((f) => f.status === 'ng');
  const worst = judged.reduce<Interface | null>((a, f) => (!a || f.margin < a.margin ? f : a), null);

  return {
    layers, interfaces, uValue: 1 / rTotal, rTotal, rseUsed, ventApplied,
    ng, isCondensing: ng.length > 0, worst, surface: interfaces[n], pi, pe,
  };
}

/** 外側の温度（外気温 / 地中温度）をどこまで下げると結露し始めるか。−30℃でも結露しなければ null */
export function findLimitTemp(layers: Layer[], c: Conditions, materials: Material[]): number | null {
  if (!(c.ti > c.te)) return null;
  let lo = -30;
  let hi = c.ti;
  let safe = c.ti;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    if (calculateProfile(layers, { ...c, te: mid }, materials).isCondensing) lo = mid;
    else { safe = mid; hi = mid; }
  }
  return safe > -29 ? safe : null;
}

/** 界面の呼び名。outLabel は「室外」または「地盤」 */
export function interfaceLabel(p: Profile, k: number, outLabel: string): string {
  const n = p.layers.length;
  const name = (i: number) => p.layers[i]?.material?.name ?? '不明';
  if (n === 0) return '';
  if (k === n) return `【室内側】${name(n - 1)} 表面`;
  if (k === 0) return `【${outLabel}側】${name(0)} 表面`;
  return `${name(k - 1)} ｜ ${name(k)}`;
}

/** 結露する理由を 1 文で（結露する境目の内外の透湿抵抗を比べる） */
export function causeOf(p: Profile, f: Interface): string {
  const n = p.layers.length;
  if (f.k === n) return '室内側の表面温度が低く、室内の空気がそのまま露点に達します。断熱を厚くするか、室内の湿度を下げます。';
  const sdOut = p.layers.slice(0, f.k).reduce((s, l) => s + l.sd, 0);
  const sdIn = p.layers.slice(f.k).reduce((s, l) => s + l.sd, 0);
  if (sdOut >= sdIn) {
    return `この境目より外側の方が水蒸気を通しにくく（透湿抵抗 Sd 外 ${sdOut.toFixed(2)} m ≧ 内 ${sdIn.toFixed(2)} m）、入った湿気が抜けずに溜まります。室内側に防湿層を入れるか、外側を通気させます。`;
  }
  return `室内側の防湿（Sd ${sdIn.toFixed(2)} m）に対して、この境目の温度の下がり方が大きすぎます。断熱を室外側へ寄せるか、防湿を強めます。`;
}

// ---------------------------------------------------------------- 対策の試算

export interface Fix {
  key: string;
  title: string;
  detail: string;
  layers?: Layer[]; // 適用後の構成
  cond?: Partial<Pick<Conditions, 'rhi'>>; // 適用後の条件
}

/**
 * 結露（または余裕の小ささ）に効きそうな手を作る。結果の計算と並べ替えは呼び出し側（evaluateFixes）。
 * newId は追加する層の id を作る関数。
 */
export function buildFixes(input: Layer[], p: Profile, c: Conditions, part: PartId, materials: Material[], newId: () => string): Fix[] {
  const L = validLayers(input);
  if (L.length === 0) return [];
  const mat = (l: Layer) => materials.find((m) => m.id === l.materialId);
  const fixes: Fix[] = [];
  const copy = () => L.map((l) => ({ ...l }));
  const target = p.isCondensing ? p.worst : null; // 最も厳しい NG
  const insIdx = L.map((l, i) => (mat(l)?.category === 'insulation' ? i : -1)).filter((i) => i >= 0);
  const lastIns = insIdx.length ? insIdx[insIdx.length - 1] : -1;
  const vbInside = lastIns >= 0 && L.slice(lastIns + 1).some((l) => mat(l)?.category === 'membrane' && (Number(l.thickness) / 1000) * (mat(l)?.mu ?? 0) >= 10);
  const withVb = (x: Layer[]) => { x.splice(lastIns + 1, 0, { id: newId(), materialId: 'pe_film', thickness: 0.2 }); return x; };

  // 1. 防湿シートを断熱材の室内側へ
  if (target && target.k < L.length && lastIns >= 0 && !vbInside) {
    fixes.push({ key: 'vb', title: '防湿シートを断熱材の室内側に入れる', detail: '防湿気密シート 0.2mm を追加', layers: withVb(copy()) });
  }

  // 2. 結露する境目より外側の密閉空気層を外気で換気する（天井裏・小屋裏・通気層）
  let ventAir = -1;
  if (target && target.k < L.length) for (let i = target.k - 1; i >= 0; i--) if (L[i].materialId === 'air_stat') { ventAir = i; break; }
  if (ventAir < 0 && target) ventAir = L.findIndex((l, i) => l.materialId === 'air_stat' && i < lastIns);
  if (ventAir >= 0 && !c.isSlab) {
    const toVent = (x: Layer[]) => { x[ventAir] = { ...x[ventAir], materialId: 'air_vent' }; return x; };
    fixes.push({
      key: 'vent-air',
      title: part === 'roof' ? '天井裏（空気層）を換気する' : '空気層を外気で換気する（通気層にする）',
      detail: `${mat(L[ventAir])?.name ?? ''} ${L[ventAir].thickness}mm を外気が通る層に。そこより外は計算しない`,
      layers: toVent(copy()),
    });
    if (lastIns >= 0 && !vbInside) {
      fixes.push({ key: 'vent-air-vb', title: '換気＋防湿シート', detail: '空気層の換気と、断熱材の室内側の防湿シートを両方', layers: withVb(toVent(copy())) });
    }
  }

  // 3. 外装の裏に通気層
  if ((part === 'wall' || part === 'roof') && !L.some((l) => VENTED.has(l.materialId)) && L.length > 2 && ['finish', 'roof'].includes(mat(L[0])?.category ?? '')) {
    const x = copy();
    x.splice(1, 0, { id: newId(), materialId: 'air_vent', thickness: 18 });
    fixes.push({ key: 'vent', title: '外装の裏に通気層を設ける', detail: '通気層 18mm を外装の内側に。外装より外は計算しない', layers: x });
  }

  // 4. 吹付ウレタン×コンクリートは密着
  if (target && target.k > 0 && target.k < L.length) {
    const pair = [L[target.k - 1].materialId, L[target.k].materialId];
    if (pair.includes('concrete') && pair.some((m) => m.startsWith('urethane'))) {
      const x = copy();
      x[target.k] = { ...x[target.k], isBonded: true };
      fixes.push({ key: 'bond', title: '現場吹付なら「密着」にする', detail: 'コンクリートに直接吹き付けたウレタンは隙間が無い', layers: x });
    }
  }

  // 5. 土間はスラブ下に断熱
  if (c.isSlab && insIdx.length === 0) {
    const ci = L.findIndex((l) => l.materialId === 'concrete');
    if (ci >= 0) {
      const x = copy();
      x.splice(ci, 0, { id: newId(), materialId: 'xps_3', thickness: 50 });
      fixes.push({ key: 'slab-ins', title: 'スラブ下に断熱材を入れる', detail: 'XPS 3種b 50mm を防湿フィルムと土間コンの間に', layers: x });
    }
  }

  // 6. 断熱材を厚くする
  if (insIdx.length) {
    const i = insIdx.reduce((a, b) => (Number(L[b].thickness) > Number(L[a].thickness) ? b : a), insIdx[0]);
    const nd = Math.ceil((Number(L[i].thickness) * 1.5) / 5) * 5;
    const x = copy();
    x[i] = { ...x[i], thickness: nd };
    fixes.push({ key: 'ins', title: '断熱材を厚くする', detail: `${mat(L[i])?.name ?? ''} ${L[i].thickness} → ${nd} mm`, layers: x });
  }

  // 7. 室内の湿度を下げる
  if (c.rhi > 35) {
    const nr = Math.max(30, c.rhi - 10);
    fixes.push({ key: 'rh', title: '室内の湿度を下げる', detail: `${c.rhi} → ${nr}%（換気・除湿・加湿のしすぎを止める）`, cond: { rhi: nr } });
  }
  return fixes;
}

/** 対策を計算して、効くもの（結露しない・余裕が大きい）から並べる */
export function evaluateFixes(fixes: Fix[], input: Layer[], c: Conditions, materials: Material[]) {
  return fixes
    .map((fix) => ({ fix, result: calculateProfile(fix.layers ?? input, { ...c, ...(fix.cond ?? {}) }, materials) }))
    .sort((a, b) => Number(a.result.isCondensing) - Number(b.result.isCondensing) || (b.result.worst?.margin ?? 0) - (a.result.worst?.margin ?? 0));
}

// ---------------------------------------------------------------- 材料DBの保存

/** 既定値との差分だけ保存し、既定値の修正が既存ユーザーにも届くようにする */
export const MATERIAL_STORAGE_KEY = 'userMaterialDB_v2';
export const LEGACY_MATERIAL_STORAGE_KEY = 'userMaterialDB';
/** 旧版の既定値（変えたものだけ）。旧保存データでこの値のままのものはユーザー編集ではない */
const LEGACY_DEFAULTS: Record<string, { lambda: number; mu: number }> = {
  ecp: { lambda: 1.0, mu: 60 },
  breathable: { lambda: 0.2, mu: 0.5 },
  air_stat: { lambda: 0.14, mu: 1 },
};
type MaterialOverride = { lambda?: number; mu?: number; fixedR?: number };
export interface StoredMaterials { overrides: Record<string, MaterialOverride>; custom: Material[] }

export const toStoredMaterials = (db: Material[]): StoredMaterials => {
  const overrides: Record<string, MaterialOverride> = {};
  const custom: Material[] = [];
  db.forEach((m) => {
    const def = DEFAULT_MATERIALS.find((d) => d.id === m.id);
    if (!def) { custom.push(m); return; }
    const o: MaterialOverride = {};
    if (m.lambda !== def.lambda) o.lambda = m.lambda;
    if (m.mu !== def.mu) o.mu = m.mu;
    if (m.fixedR !== def.fixedR) o.fixedR = m.fixedR;
    if (Object.keys(o).length > 0) overrides[m.id] = o;
  });
  return { overrides, custom };
};

export const fromStoredMaterials = (s: StoredMaterials): Material[] => [
  ...DEFAULT_MATERIALS.map((d) => ({ ...d, ...(s.overrides?.[d.id] ?? {}) })),
  ...(s.custom ?? []),
];

export const migrateLegacyMaterials = (legacy: Material[]): StoredMaterials => {
  const overrides: Record<string, MaterialOverride> = {};
  const custom: Material[] = [];
  legacy.forEach((m) => {
    const def = DEFAULT_MATERIALS.find((d) => d.id === m.id);
    if (!def) { custom.push(m); return; }
    if (def.fixedR !== undefined) return; // 計算方法を変えた材料は旧値を引き継がない
    const base = LEGACY_DEFAULTS[m.id] ?? def;
    const o: MaterialOverride = {};
    if (m.lambda !== base.lambda) o.lambda = m.lambda;
    if (m.mu !== base.mu) o.mu = m.mu;
    if (Object.keys(o).length > 0) overrides[m.id] = o;
  });
  return { overrides, custom };
};
