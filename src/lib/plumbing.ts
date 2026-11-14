/**
 * 給排水計算(設計ツール › 衛生設備 › 給排水計算)。2026-11-14
 *
 * 給水: 器具給水負荷単位の合計 → 同時使用流量(曲線の早見表を対数で内挿)→ 流速 2.0m/s 以下になる必要内径
 *   負荷単位と早見表は「空気調和・衛生工学便覧」の値を引用した京都市上下水道局「給水装置工事基準」(令和 7 年 4 月)表 9・表 10
 * 排水: 器具排水負荷単位の合計 → 横枝管・立て管の管径(SHASE-S206-2019 の許容最大排水負荷単位)
 *   盛岡市上下水道局「排水設備の設計基準」(R4.4 改訂)表 3-1・表 3-2 で確認。伸頂通気方式・特殊継手には使えない
 * 排水横管の最小勾配: 65mm 以下 1/50・75〜100mm 1/100・125mm 1/150・150mm 以上 1/200
 */

export type SupplyFixture = { id: string; label: string; priv: number | null; pub: number | null; valve?: boolean };

/** 器具給水負荷単位(私室用 / 公衆用)。null = 表に無い */
export const SUPPLY: SupplyFixture[] = [
  { id: 'wc-valve', label: '大便器(洗浄弁)', priv: 6, pub: 10, valve: true },
  { id: 'wc-tank', label: '大便器(洗浄タンク)', priv: 3, pub: 5 },
  { id: 'ur-valve', label: '小便器(洗浄弁)', priv: null, pub: 5 },
  { id: 'ur-tank', label: '小便器(洗浄タンク)', priv: null, pub: 3 },
  { id: 'lav', label: '洗面器', priv: 1, pub: 2 },
  { id: 'hand', label: '手洗器', priv: 0.5, pub: 1 },
  { id: 'med-lav', label: '医療用洗面器', priv: null, pub: 3 },
  { id: 'office-sink', label: '事務室用流し', priv: null, pub: 3 },
  { id: 'kitchen-sink', label: '台所流し', priv: 3, pub: null },
  { id: 'cook-sink', label: '料理場流し', priv: 2, pub: 4 },
  { id: 'dish-sink', label: '食器洗流し', priv: null, pub: 5 },
  { id: 'mop-sink', label: '掃除用流し', priv: 3, pub: 4 },
  { id: 'bathtub', label: '浴槽', priv: 2, pub: 4 },
  { id: 'shower', label: 'シャワー', priv: 2, pub: 4 },
  { id: 'bath-set-valve', label: '浴室一式(大便器が洗浄弁)', priv: 8, pub: null, valve: true },
  { id: 'bath-set-tank', label: '浴室一式(大便器が洗浄タンク)', priv: 6, pub: null },
  { id: 'drinking', label: '水飲み器', priv: 1, pub: 2 },
  { id: 'hose', label: '散水・車庫', priv: null, pub: 5 },
];

/** 同時使用流量の早見表(負荷単位 → L/min)。① 洗浄弁が多い ② 洗浄タンクが多い */
const CURVE_VALVE: [number, number][] = [
  [10.5, 106],
  [20, 133],
  [30, 153],
  [50, 188.9],
  [100, 255.6],
  [150, 304.2],
  [200, 344.5],
  [250, 381.1],
  [300, 411.3],
  [400, 471.4],
];
const CURVE_TANK: [number, number][] = [
  [4.5, 19.0],
  [5, 20.0],
  [10, 30.4],
  [20, 50.8],
  [30, 69.4],
  [50, 103.3],
  [100, 167.0],
  [150, 213.7],
  [200, 248.4],
  [250, 280.6],
  [300, 313.4],
  [400, 378.6],
];

/** 対数で内挿。表の最初より小さいときは最初の値、最後より大きいときは最後の区間を延ばす(beyond = true) */
export function flowOf(units: number, valve: boolean): { q: number; beyond: boolean; below: boolean } {
  const c = valve ? CURVE_VALVE : CURVE_TANK;
  if (!(units > 0)) return { q: 0, beyond: false, below: false };
  if (units <= c[0][0]) return { q: c[0][1], beyond: false, below: true };
  let k = c.findIndex(([u]) => u >= units);
  const beyond = k < 0;
  if (beyond) k = c.length - 1;
  const [u0, q0] = c[k - 1];
  const [u1, q1] = c[k];
  const t = (Math.log(units) - Math.log(u0)) / (Math.log(u1) - Math.log(u0));
  return { q: Math.exp(Math.log(q0) + t * (Math.log(q1) - Math.log(q0))), beyond, below: false };
}

/** 流量 L/min と流速 m/s → 必要内径 mm */
export const innerDia = (lpm: number, v: number) => Math.sqrt((4 * (lpm / 60000)) / (Math.PI * v)) * 1000;

export type DrainFixture = { id: string; label: string; du: number };

/** 器具排水負荷単位(SHASE-S206-2019)。確認できた行だけ */
export const DRAIN: DrainFixture[] = [
  { id: 'wc-priv', label: '大便器(私室用)', du: 4 },
  { id: 'wc-pub', label: '大便器(公衆用)', du: 6 },
  { id: 'wc-pub-heavy', label: '大便器(公衆用・使用頻度が高い)', du: 8 },
  { id: 'ur-wall', label: '小便器(壁掛小型)', du: 4 },
  { id: 'ur-stall', label: '小便器(ストール大形)', du: 4 },
  { id: 'lav', label: '洗面器', du: 1 },
  { id: 'lav-row', label: '洗面器(並列式)', du: 2 },
  { id: 'hand', label: '手洗器', du: 0.5 },
  { id: 'shampoo', label: '洗髪器', du: 2 },
  { id: 'drinking', label: '水飲み器', du: 0.5 },
  { id: 'tub-house', label: '浴槽(住宅用)', du: 2 },
  { id: 'tub-west', label: '浴槽(洋風)', du: 3 },
  { id: 'shower', label: '囲いシャワー', du: 2 },
  { id: 'shower-row', label: '連立シャワー(ヘッド 1 個)', du: 3 },
  { id: 'mop', label: '掃除流し(台形トラップ)', du: 2.5 },
  { id: 'bath-tank', label: '浴室一式(洗浄タンク)', du: 6 },
  { id: 'bath-valve', label: '浴室一式(洗浄弁)', du: 8 },
];

/** 許容最大排水負荷単位。[管径, 横枝管, 立て管 3 階以下, 3 階超 1 立て管の合計, 3 階超 1 階分] */
export const DRAIN_CAP: [number, number, number, number, number][] = [
  [30, 1, 2, 2, 1],
  [40, 3, 4, 8, 2],
  [50, 6, 10, 24, 6],
  [65, 12, 20, 42, 9],
  [75, 20, 30, 60, 16],
  [100, 160, 240, 500, 90],
  [125, 360, 540, 1100, 200],
  [150, 620, 960, 1900, 350],
  [200, 1400, 2200, 3600, 600],
  [250, 2500, 3800, 5600, 1000],
  [300, 2900, 6000, 8400, 1500],
];

export const minSlope = (d: number) => (d <= 65 ? '1/50' : d <= 100 ? '1/100' : d <= 125 ? '1/150' : '1/200');

/** 排水負荷単位の合計から管径を選ぶ。col: 1 = 横枝管 / 2 = 立て管(3 階以下)/ 3 = 3 階超の合計 */
export function drainSize(units: number, col: 1 | 2 | 3): number | null {
  if (!(units > 0)) return null;
  return DRAIN_CAP.find((r) => r[col] >= units)?.[0] ?? null;
}
