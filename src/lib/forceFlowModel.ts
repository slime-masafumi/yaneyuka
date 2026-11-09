/**
 * 構造フロービューアの材料定数・荷重の簡易積算・例題・免責文。
 * 型以外は import しない（Node のテストからそのまま読むため）。
 */
import type { FlowLoad, FlowMaterial, FlowModel, FlowSupport, FlowZone, MaterialKind } from './forceFlow';

/** RC のヤング係数（RC 規準式）。E = 3.35e4 × (γ/24)² × (Fc/60)^(1/3) */
export const concreteE = (Fc: number, gamma: number) => 3.35e4 * (gamma / 24) ** 2 * (Fc / 60) ** (1 / 3);

/** コンクリートの引張側の目安。曲げひび割れ強度 0.56√Fc */
export const concreteCrack = (Fc: number) => 0.56 * Math.sqrt(Fc);

export function concreteMaterial(Fc: number, gamma = 23): FlowMaterial {
  return {
    kind: 'rc',
    label: `コンクリート Fc${Fc}`,
    E: Math.round(concreteE(Fc, gamma)),
    nu: 0.2,
    ft: Math.round(concreteCrack(Fc) * 100) / 100,
    fc: Fc,
    density: 24,
    criterion: 'principal',
    concrete: { Fc, gamma },
  };
}

export const STEEL: FlowMaterial = {
  kind: 'steel',
  label: '鋼材 F=235',
  E: 2.05e5,
  nu: 0.3,
  ft: 235,
  fc: 235,
  density: 77,
  criterion: 'mises',
};

/** 木材は異方性を無視した参考値。基準強度はスギ無等級材（平成12年建告1452号）。 */
export const WOOD: FlowMaterial = {
  kind: 'wood',
  label: '木材 スギ E70（参考値）',
  E: 7.0e3,
  nu: 0.3,
  ft: 13.5,
  fc: 17.7,
  density: 4,
  criterion: 'principal',
};

export const materialPreset = (kind: MaterialKind): FlowMaterial =>
  kind === 'rc' ? concreteMaterial(24) : kind === 'steel' ? { ...STEEL } : { ...WOOD };

export const MATERIAL_BASIS: Record<MaterialKind, string> = {
  rc: '引張の目安はひび割れが入り始める応力 0.56√Fc、圧縮の目安は Fc。鉄筋は考えていません。',
  steel: '相当応力（ミーゼス）を基準強度 F と比べています。座屈は考えていません。',
  wood: '等方性材料とみなした参考値です。繊維方向の違い・めり込み・接合部は考えていません。',
};

// ---- 荷重の簡易積算 ---------------------------------------------------------

/** 積載荷重 kN/m²（令85条。large = 大梁・柱・基礎用 / seismic = 地震力用） */
export const USES = [
  { id: 'house', label: '住宅', large: 1.3, seismic: 0.6 },
  { id: 'office', label: '事務所', large: 1.8, seismic: 0.8 },
  { id: 'school', label: '教室', large: 2.1, seismic: 1.1 },
  { id: 'shop', label: '店舗', large: 2.4, seismic: 1.3 },
] as const;

/** 固定荷重 kN/m²（床・仕上げ・間仕切りの概算。物件の値があれば上書きする前提） */
export const STRUCTURES = [
  { id: 'rc', label: 'RC 造', dead: 7.0 },
  { id: 's', label: 'S 造', dead: 5.0 },
  { id: 'w', label: '木造', dead: 1.5 },
] as const;

export type LoadEstimateInput = { use: string; structure: string; floors: number; tributary: number };

export type LoadEstimate = {
  /** 線荷重 kN/m */
  q: number;
  dead: number;
  live: number;
  /** 地震時の水平力の概算 kN（C=0.2） */
  shear: (widthMm: number) => number;
};

export function estimateLoad({ use, structure, floors, tributary }: LoadEstimateInput): LoadEstimate {
  const u = USES.find((x) => x.id === use) ?? USES[0];
  const s = STRUCTURES.find((x) => x.id === structure) ?? STRUCTURES[0];
  const q = (s.dead + u.large) * tributary * floors;
  return {
    q: Math.round(q * 10) / 10,
    dead: s.dead,
    live: u.large,
    shear: (widthMm) => Math.round(0.2 * (s.dead + u.seismic) * tributary * floors * (widthMm / 1000)),
  };
}

// ---- 例題 -------------------------------------------------------------------

export type FlowExample = {
  id: string;
  label: string;
  /** 例題で何を見るか（画面の短い説明） */
  hint: string;
  model: FlowModel;
};

const zone = (id: string, shape: FlowZone['shape'], x: number, y: number, w: number, h: number): FlowZone => ({ id, kind: 'opening', shape, x, y, w, h });
const fixedEdge = (id: string, edge: FlowSupport['edge'], from: number, to: number): FlowSupport => ({ id, edge, from, to, type: 'fixed' });
const top = (id: string, W: number, y: number, q: number): FlowLoad => ({ id, kind: 'line', y, x0: 0, x1: W, q });

export const FLOW_EXAMPLES: FlowExample[] = [
  {
    id: 'beam-sleeve',
    label: '梁貫通',
    hint: '柱際の円形スリーブ。孔をドラッグしてスパン中央へ動かすと、孔まわりの応力の変わり方が見えます。',
    model: {
      version: 1,
      width: 7000,
      height: 700,
      thickness: 400,
      material: concreteMaterial(24),
      zones: [zone('z1', 'circle', 1000, 250, 200, 200)],
      supports: [fixedEdge('s1', 'left', 0, 700), fixedEdge('s2', 'right', 0, 700)],
      loads: [top('l1', 7000, 700, 40)],
      selfWeight: true,
      mesh: 'standard',
    },
  },
  {
    id: 'wall-opening',
    label: '耐力壁の開口',
    hint: '水平力を受ける RC 壁のドア開口。開口を動かすと、斜めの圧縮の通り道と隅の応力が変わります。',
    model: {
      version: 1,
      width: 6000,
      height: 3000,
      thickness: 180,
      material: concreteMaterial(24),
      zones: [zone('z1', 'rect', 1200, 0, 900, 2100)],
      supports: [fixedEdge('s1', 'bottom', 0, 6000)],
      loads: [top('l1', 6000, 3000, 60), { id: 'l2', kind: 'shear', y: 3000, H: 400 }],
      selfWeight: true,
      mesh: 'standard',
    },
  },
  {
    id: 'piloti',
    label: 'ピロティ',
    hint: '3 層の壁の 1 階だけを柱にした形。上階の力が柱へ集まり、1 階の水平変位が大きくなる様子を見ます。',
    model: {
      version: 1,
      width: 6000,
      height: 9000,
      thickness: 200,
      material: concreteMaterial(24),
      zones: [
        zone('z1', 'rect', 600, 0, 4800, 2700),
        { id: 'c1', kind: 'column', shape: 'rect', x: 0, y: 0, w: 600, h: 2700, t: 600 },
        { id: 'c2', kind: 'column', shape: 'rect', x: 5400, y: 0, w: 600, h: 2700, t: 600 },
      ],
      supports: [fixedEdge('s1', 'bottom', 0, 600), fixedEdge('s2', 'bottom', 5400, 6000)],
      loads: [
        top('l1', 6000, 3000, 60),
        top('l2', 6000, 6000, 60),
        top('l3', 6000, 9000, 60),
        { id: 'l4', kind: 'shear', y: 3000, H: 80 },
        { id: 'l5', kind: 'shear', y: 6000, H: 160 },
        { id: 'l6', kind: 'shear', y: 9000, H: 240 },
      ],
      selfWeight: true,
      mesh: 'standard',
    },
  },
  {
    id: 'cantilever',
    label: '片持ち',
    hint: '根元を固定した片持ち梁。上端が引張、下端が圧縮になり、根元に応力が集まります。',
    model: {
      version: 1,
      width: 2500,
      height: 400,
      thickness: 300,
      material: concreteMaterial(24),
      zones: [],
      supports: [fixedEdge('s1', 'left', 0, 400)],
      loads: [top('l1', 2500, 400, 15)],
      selfWeight: true,
      mesh: 'standard',
    },
  },
  {
    id: 'wall-removal',
    label: '壁撤去',
    hint: '木造 2 階の下の壁を 2 間ぶん撤去した形。上の荷重が梁を通って両側の壁へ回ります。木材は参考値です。',
    model: {
      version: 1,
      width: 5460,
      height: 2730,
      thickness: 105,
      material: { ...WOOD },
      zones: [zone('z1', 'rect', 1365, 0, 2730, 2400)],
      supports: [fixedEdge('s1', 'bottom', 0, 1365), fixedEdge('s2', 'bottom', 4095, 5460)],
      loads: [top('l1', 5460, 2730, 8)],
      selfWeight: true,
      mesh: 'standard',
    },
  },
];

export const exampleModel = (id: string): FlowModel | null => {
  const ex = FLOW_EXAMPLES.find((e) => e.id === id);
  return ex ? cloneModel(ex.model) : null;
};

export const cloneModel = (m: FlowModel): FlowModel => JSON.parse(JSON.stringify(m)) as FlowModel;

let idCounter = 0;
export const newPartId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(idCounter++).toString(36)}`;

// ---- 文言（画面・出力物で揃える） -------------------------------------------

/** 解析の対象外。画面に常に表示する。 */
export const FLOW_EXCLUSIONS = [
  'ひび割れ後・降伏後の挙動（非線形）',
  '座屈、接合部、鉄筋の配筋',
  '面外方向の力、動的な地震応答',
];

/** 出力物に必ず入れる免責文（削除できない） */
export const FLOW_DISCLAIMER =
  'この図は検討・説明のための参考表示であり、構造計算書ではありません。線形弾性・平面応力の簡易解析で、確認申請には使用できません。構造上の最終判断は、利用者と構造設計者が行ってください。';

/** 目安の 3 段階の表示名。適否の判定と読める言葉は使わない。 */
export const LEVEL_LABELS = ['基準の 1/3 未満', '基準の 1/3〜2/3', '基準の 2/3 以上'] as const;
