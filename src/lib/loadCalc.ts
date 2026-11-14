/**
 * 荷重計算(設計ツール › 構造設計 › 荷重計算)。2026-11-14
 *
 * 床・屋根の 1 m² あたりの荷重を、固定荷重(令 84 条)+ 積載荷重(令 85 条)+ 積雪荷重(令 86 条)で積み上げる。
 * 表の値は 2026-11-14 に e-Gov の建築基準法施行令(令和 8 年政令 284 号改正・2026-11-01 施行版)から写した。
 * 単位は N/m²(画面では kN/m² も出す)。
 */

/** 固定荷重の 1 行。perCm = 仕上げ厚・厚さ 1cm ごとの値(N/m²/cm) */
export type FixedItem = {
  id: string;
  group: string;
  label: string;
  /** N/m²。perCm のときは 1cm あたり */
  w: number;
  perCm?: boolean;
  note?: string;
  /** 令 84 条の表に無い慣用値 */
  outside?: boolean;
};

export const FIXED: FixedItem[] = [
  // 屋根(屋根面につき)
  { id: 'kawara', group: '屋根(屋根面につき)', label: '瓦ぶき ふき土なし', w: 640, note: '下地・たるきを含む。もやは含まない' },
  { id: 'kawara-tsuchi', group: '屋根(屋根面につき)', label: '瓦ぶき ふき土あり', w: 980, note: '下地・たるきを含む。もやは含まない' },
  { id: 'namiita', group: '屋根(屋根面につき)', label: '波形鉄板ぶき(もやに直接ふく)', w: 50, note: 'もやは含まない' },
  { id: 'usuita', group: '屋根(屋根面につき)', label: '薄鉄板ぶき', w: 200, note: '下地・たるきを含む。もやは含まない' },
  { id: 'glass-roof', group: '屋根(屋根面につき)', label: 'ガラス屋根', w: 290, note: '鉄製枠を含む。もやは含まない' },
  { id: 'slate', group: '屋根(屋根面につき)', label: '厚形スレートぶき', w: 440, note: '下地・たるきを含む。もやは含まない' },
  { id: 'moya2', group: '屋根(屋根面につき)', label: '木造のもや(支点間 2m 以下)', w: 50 },
  { id: 'moya4', group: '屋根(屋根面につき)', label: '木造のもや(支点間 4m 以下)', w: 100 },
  // 天井(天井面につき)。つり木・受木・その他の下地を含む
  { id: 'saobuchi', group: '天井(天井面につき)', label: 'さお縁', w: 100, note: 'つり木・受木・下地を含む' },
  { id: 'board-ceil', group: '天井(天井面につき)', label: '繊維板張・打上げ板張・合板張・金属板張', w: 150, note: 'つり木・受木・下地を含む' },
  { id: 'mokumou', group: '天井(天井面につき)', label: '木毛セメント板張', w: 200, note: 'つり木・受木・下地を含む' },
  { id: 'goubuchi', group: '天井(天井面につき)', label: '格縁', w: 290, note: 'つり木・受木・下地を含む' },
  { id: 'shikkui-ceil', group: '天井(天井面につき)', label: 'しつくい塗', w: 390, note: 'つり木・受木・下地を含む' },
  { id: 'mortar-ceil', group: '天井(天井面につき)', label: 'モルタル塗', w: 590, note: 'つり木・受木・下地を含む' },
  // 床(木造)
  { id: 'itabari', group: '床・木造', label: '板張', w: 150, note: '根太を含む' },
  { id: 'tatami', group: '床・木造', label: '畳敷', w: 340, note: '床板・根太を含む' },
  { id: 'yukabari4', group: '床・木造', label: '床ばり(張り間 4m 以下)', w: 100 },
  { id: 'yukabari6', group: '床・木造', label: '床ばり(張り間 6m 以下)', w: 170 },
  { id: 'yukabari8', group: '床・木造', label: '床ばり(張り間 8m 以下)', w: 250 },
  // 床(コンクリート造の仕上げ)
  { id: 'rc-itabari', group: '床・コンクリート造の仕上げ', label: '板張', w: 200, note: '根太・大引を含む' },
  { id: 'flooring-block', group: '床・コンクリート造の仕上げ', label: 'フロアリングブロック張', w: 150, perCm: true },
  { id: 'mortar-floor', group: '床・コンクリート造の仕上げ', label: 'モルタル塗・人造石塗・タイル張', w: 200, perCm: true },
  { id: 'asphalt', group: '床・コンクリート造の仕上げ', label: 'アスファルト防水層', w: 150, perCm: true },
  // スラブ本体(令 84 条の表に無い。実況に応じて計算する部分)
  { id: 'rc-slab', group: 'スラブ本体(表外)', label: '鉄筋コンクリートスラブ(24 kN/m³)', w: 240, perCm: true, outside: true, note: '令 84 条の表に無い。単位体積重量 24 kN/m³ は慣用値' },
  { id: 'deck-slab', group: 'スラブ本体(表外)', label: '軽量コンクリート(19 kN/m³ 相当)', w: 190, perCm: true, outside: true, note: '令 84 条の表に無い。製品の値で置き換える' },
  // 壁(壁面につき)
  { id: 'jikugumi', group: '壁(壁面につき)', label: '木造の軸組', w: 150, note: '柱・間柱・筋かいを含む' },
  { id: 'shitami', group: '壁(壁面につき)', label: '木造の仕上げ 下見板張・羽目板張・繊維板張', w: 100, note: '下地を含み、軸組を含まない' },
  { id: 'kizuri', group: '壁(壁面につき)', label: '木ずりしつくい塗', w: 340, note: '下地を含み、軸組を含まない' },
  { id: 'tetsumou', group: '壁(壁面につき)', label: '鉄網モルタル塗', w: 640, note: '下地を含み、軸組を含まない' },
  { id: 'komai', group: '壁(壁面につき)', label: '木造の小舞壁', w: 830, note: '軸組を含む' },
  { id: 'shikkui-wall', group: '壁(壁面につき)', label: 'コンクリート造の仕上げ しつくい塗', w: 170, perCm: true },
  { id: 'mortar-wall', group: '壁(壁面につき)', label: 'コンクリート造の仕上げ モルタル塗・人造石塗', w: 200, perCm: true },
  { id: 'tile-wall', group: '壁(壁面につき)', label: 'コンクリート造の仕上げ タイル張', w: 200, perCm: true },
];

export const FIXED_GROUPS = [...new Set(FIXED.map((f) => f.group))];
export const fixedOf = (id: string) => FIXED.find((f) => f.id === id);

/** 積載荷重(令 85 条第 1 項の表)。い = 床 / ろ = 大ばり・柱・基礎 / は = 地震力 */
export type LiveRow = { id: string; label: string; floor: number; frame: number; seismic: number; note?: string; noReduce?: boolean };

export const LIVE: LiveRow[] = [
  { id: 'house', label: '(一)住宅の居室、住宅以外の寝室・病室', floor: 1800, frame: 1300, seismic: 600 },
  { id: 'office', label: '(二)事務室', floor: 2900, frame: 1800, seismic: 800 },
  { id: 'class', label: '(三)教室', floor: 2300, frame: 2100, seismic: 1100 },
  { id: 'shop', label: '(四)百貨店・店舗の売場', floor: 2900, frame: 2400, seismic: 1300 },
  { id: 'hall-fixed', label: '(五)劇場・集会室等の客席(固定席)', floor: 2900, frame: 2600, seismic: 1600, noReduce: true },
  { id: 'hall', label: '(五)劇場・集会室等の客席(その他)', floor: 3500, frame: 3200, seismic: 2100, noReduce: true },
  { id: 'garage', label: '(六)自動車車庫・自動車通路', floor: 5400, frame: 3900, seismic: 2000 },
  { id: 'corridor', label: '(七)廊下・玄関・階段((三)〜(五)の室に通じるもの)', floor: 3500, frame: 3200, seismic: 2100, note: '(一)(二)の室に通じるものは表に無く、実況で計算する' },
  { id: 'roof-house', label: '(八)屋上広場・バルコニー', floor: 1800, frame: 1300, seismic: 600, note: '(一)の数値。学校・百貨店の建物は(四)の数値' },
  { id: 'roof-shop', label: '(八)屋上広場・バルコニー(学校・百貨店の建物)', floor: 2900, frame: 2400, seismic: 1300 },
  { id: 'warehouse', label: '倉庫業を営む倉庫の床(第 3 項)', floor: 3900, frame: 3900, seismic: 3900, note: '床の積載荷重は実況が 3,900 未満でも 3,900 とする。大ばり・地震力用は実況で計算する(ここでは同じ値を仮置き)' },
  { id: 'roof', label: '人が乗らない屋根(積載荷重なし)', floor: 0, frame: 0, seismic: 0 },
];

/** 柱・基礎の圧縮力を出すときの低減(令 85 条第 2 項)。支える床の数 → 係数。(五)の室には使えない */
export function reduction(floors: number): number {
  if (floors <= 1) return 1;
  const t: Record<number, number> = { 2: 0.95, 3: 0.9, 4: 0.85, 5: 0.8, 6: 0.75, 7: 0.7, 8: 0.65 };
  return floors >= 9 ? 0.6 : t[floors] ?? 1;
}

/** 屋根形状係数 μb = √cos(1.5β)。60° を超えると 0(令 86 条第 4 項)。雪止めのある屋根には使えない */
export function roofFactor(deg: number): number {
  if (!(deg > 0)) return 1;
  if (deg > 60) return 0;
  return Math.sqrt(Math.cos((1.5 * deg * Math.PI) / 180));
}

export type Layer = { id: string; cm: number };

export function layerWeight(l: Layer): number {
  const f = fixedOf(l.id);
  if (!f) return 0;
  return f.perCm ? f.w * (l.cm > 0 ? l.cm : 0) : f.w;
}

export type LoadIn = {
  layers: Layer[];
  extra: number;
  live: string;
  floors: number;
  snowCm: number;
  snowUnit: number;
  roofDeg: number;
  snowStop: boolean;
  area: number;
};

export type LoadOut = {
  dl: number;
  live: LiveRow;
  rf: number;
  floorUse: number;
  frameUse: number;
  colUse: number;
  seismicUse: number;
  snow: number;
  mu: number;
};

export function calcLoad(v: LoadIn): LoadOut {
  const dl = v.layers.reduce((s, l) => s + layerWeight(l), 0) + (v.extra > 0 ? v.extra : 0);
  const live = LIVE.find((x) => x.id === v.live) ?? LIVE[0];
  const rf = live.noReduce ? 1 : reduction(v.floors);
  const mu = v.snowStop ? 1 : roofFactor(v.roofDeg);
  const snow = v.snowCm > 0 ? v.snowUnit * v.snowCm * mu : 0;
  return {
    dl,
    live,
    rf,
    floorUse: dl + live.floor,
    frameUse: dl + live.frame,
    colUse: dl + live.frame * rf,
    seismicUse: dl + live.seismic,
    snow,
    mu,
  };
}

export const kN = (n: number, d = 2) => (n / 1000).toLocaleString('ja-JP', { minimumFractionDigits: d, maximumFractionDigits: d });
export const N = (n: number) => Math.round(n).toLocaleString('ja-JP');

/** よく使う構成 */
export const PRESETS: { id: string; label: string; live: string; layers: Layer[] }[] = [
  { id: 'wood-floor', label: '木造 2 階床(板張・合板天井)', live: 'house', layers: [{ id: 'itabari', cm: 0 }, { id: 'yukabari4', cm: 0 }, { id: 'board-ceil', cm: 0 }] },
  { id: 'wood-tatami', label: '木造 2 階床(畳敷)', live: 'house', layers: [{ id: 'tatami', cm: 0 }, { id: 'yukabari4', cm: 0 }, { id: 'board-ceil', cm: 0 }] },
  { id: 'rc-office', label: 'RC 事務所の床(スラブ 150・モルタル 3cm・天井)', live: 'office', layers: [{ id: 'rc-slab', cm: 15 }, { id: 'mortar-floor', cm: 3 }, { id: 'board-ceil', cm: 0 }] },
  { id: 'rc-roof', label: 'RC 陸屋根(スラブ 150・防水・押えモルタル 6cm)', live: 'roof', layers: [{ id: 'rc-slab', cm: 15 }, { id: 'asphalt', cm: 1 }, { id: 'mortar-floor', cm: 6 }, { id: 'board-ceil', cm: 0 }] },
  { id: 'wood-roof', label: '木造の瓦屋根(ふき土なし)', live: 'roof', layers: [{ id: 'kawara', cm: 0 }, { id: 'moya2', cm: 0 }] },
];
