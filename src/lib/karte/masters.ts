/**
 * 物件カルテのマスタ。
 * 業種・室用途・機器・チェック項目・検討項目カタログ。
 * 計算エンジン（engine.ts）は触らずに、ここへ行を足すだけで業種や項目が増える構造。
 *
 * 数値の確度は 共有/カルテ機能/yaneyuka_実装指示書.md §5 を参照。
 * 機器の代表値・質量・脚数、業種別原単位は「目安」。実施設計では機器表で上書きする。
 */
import type { Roughness } from './glass';

/* ══════ 物件 ══════ */
export type UseType = 'office' | 'shop' | 'rest' | 'house' | 'clinic' | 'hotel' | 'school' | 'factory';
export type StructureType = 'w' | 's' | 'rc' | 'src';
export type AcType = 'individual' | 'central' | 'none';
export type ExType = 'yes' | 'talk' | 'no';

export type Project = {
  id: string;
  name: string;
  addr: string;
  zone: string;
  fire: string;
  /** 建築物の高さ m */
  H: number;
  /** 基準風速 m/s */
  v0: number;
  rough: Roughness;
  /** 設計用降雨強度 mm/h */
  rain: number;
  /** 地震地域係数 */
  z: number;
  /** 垂直積雪量 cm */
  snow: number;
  /** テナント分電盤容量 kVA */
  cap: number;
  ac: AcType;
  /** 供給可能な冷房能力 kW */
  accap: number;
  ex: ExType;
  /** ガス引込口径 "0" | "20" | "25" | "32" | "40" */
  gas: string;
  /** 給水引込口径 "20" | "25" | "40" | "50" */
  wsup: string;
  use: UseType;
  str: StructureType;
  /** 地上階数 */
  fl: number;
  /** 地下階数 */
  bf: number;
  /** 延べ面積 m² */
  area: number;
};

export const ZONES = [
  '第一種低層住居専用地域',
  '第二種低層住居専用地域',
  '第一種中高層住居専用地域',
  '第二種中高層住居専用地域',
  '第一種住居地域',
  '第二種住居地域',
  '準住居地域',
  '近隣商業地域',
  '商業地域',
  '準工業地域',
  '工業地域',
  '工業専用地域',
];
export const FIRE_ZONES = ['指定なし', '法22条区域', '準防火地域', '防火地域'];
export const USE_LABEL: Record<UseType, string> = {
  office: '事務所',
  shop: '物販店舗',
  rest: '飲食店',
  house: '共同住宅',
  clinic: '診療所',
  hotel: 'ホテル・旅館',
  school: '学校',
  factory: '工場・倉庫',
};
export const STR_LABEL: Record<StructureType, string> = {
  w: '木造',
  s: '鉄骨造',
  rc: '鉄筋コンクリート造',
  src: '鉄骨鉄筋コンクリート造',
};
export const AC_LABEL: Record<AcType, string> = { individual: '個別', central: 'セントラル', none: '供給なし' };
export const AC_DESC: Record<AcType, string> = {
  individual: '個別（室外機を置く）',
  central: 'セントラル（ビル供給）',
  none: '供給なし',
};
export const EX_LABEL: Record<ExType, string> = { yes: '確保済み', talk: '要協議', no: 'なし' };
export const EX_DESC: Record<ExType, string> = { yes: '確保済み（屋上まで）', talk: '要協議', no: 'なし' };
export const GAS_OPTIONS: Array<[string, string]> = [
  ['0', '引込なし'],
  ['20', '20A'],
  ['25', '25A'],
  ['32', '32A'],
  ['40', '40A以上'],
];
export const WSUP_OPTIONS: Array<[string, string]> = [
  ['20', '20A'],
  ['25', '25A'],
  ['40', '40A'],
  ['50', '50A以上'],
];

/** ガス引込口径ごとの目安供給量 m³/h（本管圧力次第。供給事業者への確認が前提） */
export const GAS_CAP: Record<string, number> = { '0': 0, '20': 4, '25': 7, '32': 12, '40': 25 };
/** 給水引込口径ごとの目安流量 L/min（同上） */
export const WSUP_CAP: Record<string, number> = { '20': 30, '25': 55, '40': 150, '50': 250 };

export const DEMO_PROJECT: Project = {
  id: 'demo',
  name: '（仮）神田オフィスビル',
  addr: '東京都千代田区',
  zone: '商業地域',
  fire: '防火地域',
  H: 30,
  v0: 34,
  rough: '3',
  rain: 100,
  z: 1.0,
  snow: 20,
  cap: 30,
  ac: 'individual',
  accap: 0,
  ex: 'talk',
  gas: '25',
  wsup: '25',
  use: 'office',
  str: 'rc',
  fl: 8,
  bf: 1,
  area: 3200,
};

export function newProject(id: string): Project {
  return {
    id,
    name: '新規物件',
    addr: '',
    zone: '商業地域',
    fire: '指定なし',
    H: 20,
    v0: 34,
    rough: '3',
    rain: 100,
    z: 1.0,
    snow: 20,
    cap: 0,
    ac: 'individual',
    accap: 0,
    ex: 'talk',
    gas: '0',
    wsup: '20',
    use: 'office',
    str: 'rc',
    fl: 3,
    bf: 0,
    area: 500,
  };
}

/* ══════ 室用途 ══════ */
export type RoomTypeKey =
  | 'hall'
  | 'kitchen'
  | 'sales'
  | 'office'
  | 'wait'
  | 'exam'
  | 'treat'
  | 'shampoo'
  | 'toilet'
  | 'locker'
  | 'store'
  | 'backyard';

export type RoomType = {
  label: string;
  /** 換気回数 回/h */
  ach: number;
  /** 1人あたり換気量 m³/h（居室） */
  per?: number;
  seatable?: boolean;
  /** 火気使用室 */
  fire?: boolean;
  /** 標準天井高 m */
  ch: number;
  /** 照明負荷 W/m² */
  lw: number;
  basis: string;
};

export const ROOM_TYPE: Record<RoomTypeKey, RoomType> = {
  hall: { label: '客席・ホール', ach: 10, per: 30, seatable: true, ch: 2.6, lw: 15, basis: '令20条の2（1人あたり）と10回/hの大きい方' },
  kitchen: { label: '厨房', ach: 40, fire: true, ch: 2.5, lw: 20, basis: '令20条の3（N・K・Q）と40回/hの大きい方' },
  sales: { label: '売場', ach: 6, per: 30, seatable: true, ch: 2.8, lw: 25, basis: '令20条の2（1人あたり）と6回/hの大きい方' },
  office: { label: '事務室', ach: 6, per: 30, seatable: true, ch: 2.6, lw: 15, basis: '令20条の2（1人あたり）と6回/hの大きい方' },
  wait: { label: '待合', ach: 6, per: 30, seatable: true, ch: 2.6, lw: 12, basis: '令20条の2（1人あたり）と6回/hの大きい方' },
  exam: { label: '診察室・処置室', ach: 6, per: 30, seatable: true, ch: 2.6, lw: 25, basis: '令20条の2（1人あたり）と6回/hの大きい方' },
  treat: { label: '施術室', ach: 10, per: 30, seatable: true, ch: 2.6, lw: 20, basis: '薬剤を扱うため10回/hを確保' },
  shampoo: { label: 'シャンプー室', ach: 10, ch: 2.5, lw: 15, basis: '10回/h（薬剤・湿気）' },
  toilet: { label: '便所', ach: 15, ch: 2.4, lw: 10, basis: '15回/h' },
  locker: { label: '更衣室', ach: 10, ch: 2.4, lw: 8, basis: '10回/h' },
  store: { label: '倉庫・パントリー', ach: 5, ch: 2.4, lw: 8, basis: '5回/h' },
  backyard: { label: 'バックヤード', ach: 5, ch: 2.4, lw: 10, basis: '5回/h' },
};

/* ══════ 機器 ══════ */
export type EqCat = 'kitchen' | 'hall' | 'retail' | 'office' | 'salon' | 'clinic' | 'common';

export type EqMaster = {
  label: string;
  cat: EqCat;
  /** 電力 kW（代表値） */
  e?: number;
  /** ガス kW（代表値） */
  g?: number;
  /** 質量 kg */
  m?: number;
  legs?: number;
  w?: number;
  hw?: number;
  d?: number;
  grease?: number;
  hood?: number;
};

export const EQ: Record<string, EqMaster> = {
  espresso: { label: 'エスプレッソマシン', cat: 'kitchen', e: 5.7, m: 70, legs: 4, w: 1, d: 1 },
  brewer: { label: 'コーヒーブリュワー', cat: 'kitchen', e: 2.3, m: 15, legs: 4, w: 1, d: 1 },
  ice: { label: '製氷機', cat: 'kitchen', e: 0.6, m: 60, legs: 4, w: 1, d: 1 },
  fridge: { label: '冷蔵庫（業務用）', cat: 'kitchen', e: 0.4, m: 150, legs: 4 },
  freezer: { label: '冷凍庫（業務用）', cat: 'kitchen', e: 0.6, m: 160, legs: 4 },
  dishw: { label: '食器洗浄機', cat: 'kitchen', e: 2.4, m: 80, legs: 4, hw: 1, d: 1 },
  sink2: { label: '二槽シンク', cat: 'kitchen', m: 40, legs: 4, w: 1, d: 1, grease: 1 },
  sink1: { label: '一槽シンク', cat: 'kitchen', m: 30, legs: 4, w: 1, d: 1, grease: 1 },
  gasrange: { label: 'ガスレンジ', cat: 'kitchen', g: 14, m: 120, legs: 4, hood: 1 },
  gastable: { label: 'ガステーブル2口', cat: 'kitchen', g: 7, m: 30, legs: 4, hood: 1 },
  fryer: { label: 'ガスフライヤー', cat: 'kitchen', g: 12, m: 60, legs: 4, hood: 1 },
  griddle: { label: 'ガスグリドル', cat: 'kitchen', g: 9, m: 50, legs: 4, hood: 1 },
  ovengas: { label: 'ガスオーブン', cat: 'kitchen', g: 16, m: 150, legs: 4, hood: 1 },
  ih: { label: 'IHクッキングヒーター', cat: 'kitchen', e: 5.0, m: 40, legs: 4, hood: 1 },
  ovenel: { label: '電気オーブン', cat: 'kitchen', e: 6.0, m: 120, legs: 4, hood: 1 },
  ricec: { label: '炊飯器', cat: 'kitchen', e: 1.4, m: 15, legs: 4, w: 1 },
  toaster: { label: 'トースター', cat: 'kitchen', e: 1.6, m: 20, legs: 4 },
  hotcab: { label: '温蔵庫', cat: 'kitchen', e: 1.2, m: 60, legs: 4 },

  reachin: { label: '冷蔵ショーケース', cat: 'hall', e: 0.5, m: 120, legs: 4 },
  beer: { label: 'ビールディスペンサ', cat: 'hall', e: 0.4, m: 40, legs: 4, w: 1, d: 1 },
  pos: { label: 'POSレジ', cat: 'hall', e: 0.3, m: 5, legs: 4 },

  shelf: { label: '什器・陳列棚', cat: 'retail', m: 60, legs: 4 },
  showcase: { label: '冷凍ショーケース', cat: 'retail', e: 0.9, m: 180, legs: 4 },
  possys: { label: 'POSシステム一式', cat: 'retail', e: 0.6, m: 20, legs: 4 },

  copier: { label: '複合機', cat: 'office', e: 1.5, m: 90, legs: 4 },
  server: { label: 'サーバーラック', cat: 'office', e: 2.0, m: 200, legs: 4 },
  potwater: { label: '給湯ポット・冷水機', cat: 'office', e: 1.0, m: 15, legs: 4, w: 1, d: 1 },

  shampooch: { label: 'シャンプー台', cat: 'salon', e: 0.2, m: 80, legs: 4, w: 1, hw: 1, d: 1 },
  dryer: { label: 'ドライヤー（据置）', cat: 'salon', e: 1.2, m: 25, legs: 4 },
  permm: { label: 'パーマ機・スチーマー', cat: 'salon', e: 0.9, m: 30, legs: 4 },
  styling: { label: 'セット面（鏡台）', cat: 'salon', e: 0.3, m: 40, legs: 4 },

  autocl: { label: 'オートクレーブ', cat: 'clinic', e: 2.0, m: 60, legs: 4, w: 1, d: 1 },
  xray: { label: 'X線撮影装置', cat: 'clinic', e: 7.5, m: 300, legs: 4 },
  echo: { label: '超音波診断装置', cat: 'clinic', e: 0.8, m: 120, legs: 4 },
  bed: { label: '診察台・処置台', cat: 'clinic', m: 90, legs: 4 },

  handw: { label: '手洗器', cat: 'common', m: 10, legs: 0, w: 1, d: 1 },
  lav: { label: '洗面器', cat: 'common', m: 15, legs: 0, w: 1, hw: 1, d: 1 },
  toiletw: { label: '大便器（洗浄便座）', cat: 'common', e: 0.5, m: 30, legs: 0, w: 1, d: 1 },
  micro: { label: '電子レンジ', cat: 'common', e: 1.5, m: 20, legs: 4 },
  fridges: { label: '冷蔵庫（小型）', cat: 'common', e: 0.3, m: 40, legs: 4 },
  wh: { label: 'ガス給湯器', cat: 'common', g: 40, m: 30, legs: 0 },
  whe: { label: '電気温水器', cat: 'common', e: 4.0, m: 150, legs: 0 },
};

/* ══════ 業種 ══════ */
export type BizKey = 'cafe' | 'diner' | 'full' | 'izakaya' | 'retail' | 'office' | 'salon' | 'clinic';

export type Biz = {
  label: string;
  cats: EqCat[];
  /** 給水量 L/人・日（目安） */
  water: number;
  /** 照明・外皮発熱 W/m²（目安） */
  heat: number;
  grease: boolean;
  /** [室用途, 室名, 面積 m², 人員] */
  rooms: Array<[RoomTypeKey, string, number, number?]>;
  equips: string[];
};

export const BIZ: Record<BizKey, Biz> = {
  cafe: {
    label: 'カフェ・喫茶',
    cats: ['kitchen', 'hall', 'common'],
    water: 35,
    heat: 60,
    grease: true,
    rooms: [['hall', '客席', 48, 24], ['kitchen', '厨房', 14], ['toilet', '便所', 3]],
    equips: ['espresso', 'ice', 'fridge', 'sink2', 'handw', 'gastable', 'dishw', 'lav', 'toiletw'],
  },
  diner: {
    label: '軽飲食・定食',
    cats: ['kitchen', 'hall', 'common'],
    water: 80,
    heat: 70,
    grease: true,
    rooms: [['hall', '客席', 60, 32], ['kitchen', '厨房', 20], ['toilet', '便所', 4], ['locker', '更衣室', 3]],
    equips: ['gasrange', 'fryer', 'ricec', 'fridge', 'freezer', 'sink2', 'sink1', 'handw', 'dishw', 'lav', 'toiletw', 'wh'],
  },
  full: {
    label: 'レストラン',
    cats: ['kitchen', 'hall', 'common'],
    water: 100,
    heat: 75,
    grease: true,
    rooms: [['hall', '客席', 90, 48], ['kitchen', '厨房', 32], ['toilet', '便所', 6], ['locker', '更衣室', 4], ['store', '倉庫', 4]],
    equips: ['gasrange', 'ovengas', 'griddle', 'fryer', 'fridge', 'freezer', 'sink2', 'sink1', 'handw', 'dishw', 'hotcab', 'lav', 'toiletw', 'wh'],
  },
  izakaya: {
    label: '居酒屋・バー',
    cats: ['kitchen', 'hall', 'common'],
    water: 80,
    heat: 70,
    grease: true,
    rooms: [['hall', '客席', 70, 40], ['kitchen', '厨房', 22], ['toilet', '便所', 5]],
    equips: ['gasrange', 'fryer', 'griddle', 'fridge', 'freezer', 'sink2', 'handw', 'beer', 'dishw', 'lav', 'toiletw', 'wh'],
  },
  retail: {
    label: '物販店舗',
    cats: ['retail', 'common'],
    water: 15,
    heat: 70,
    grease: false,
    rooms: [['sales', '売場', 120, 0], ['backyard', 'バックヤード', 20], ['toilet', '便所', 4]],
    equips: ['shelf', 'possys', 'showcase', 'handw', 'lav', 'toiletw'],
  },
  office: {
    label: '事務所',
    cats: ['office', 'common'],
    water: 15,
    heat: 55,
    grease: false,
    rooms: [['office', '執務室', 150, 30], ['wait', '会議室', 25, 10], ['store', '書庫', 10], ['toilet', '便所', 8]],
    equips: ['copier', 'server', 'potwater', 'fridges', 'micro', 'lav', 'toiletw'],
  },
  salon: {
    label: '美容室・理容室',
    cats: ['salon', 'common'],
    water: 120,
    heat: 65,
    grease: false,
    rooms: [['treat', '施術室', 50, 8], ['shampoo', 'シャンプー室', 12], ['backyard', 'バックヤード', 8], ['toilet', '便所', 3]],
    equips: ['styling', 'dryer', 'permm', 'shampooch', 'handw', 'whe', 'lav', 'toiletw'],
  },
  clinic: {
    label: 'クリニック',
    cats: ['clinic', 'common'],
    water: 30,
    heat: 70,
    grease: false,
    rooms: [['wait', '待合', 30, 12], ['exam', '診察室', 16, 3], ['exam', '処置室', 14, 2], ['backyard', 'スタッフ室', 10], ['toilet', '便所', 5]],
    equips: ['bed', 'echo', 'autocl', 'xray', 'handw', 'lav', 'toiletw', 'whe'],
  },
};

/* ══════ チェック項目 ══════ */
export type CatKey = 'design' | 'struct' | 'mep' | 'elec';
export const CATS: Array<[CatKey, string]> = [
  ['design', '意匠'],
  ['struct', '構造'],
  ['mep', '設備'],
  ['elec', '電気'],
];

/** [分野, id, 項目, 補足] */
export type CheckDef = [CatKey, string, string, string];

export const CHK_COMMON: CheckDef[] = [
  ['design', 'c1', '収容人員の算定', '消防規則1条の3。設備要否の起点になります'],
  ['design', 'c2', '内装制限の確認', '法35条の2・令128条の4。地階・3階以上に注意'],
  ['design', 'c3', '避難通路幅と出口', '令119条・125条、条例の上乗せ'],
  ['design', 'c4', '排煙設備の要否', '令126条の2。区画変更で無窓になっていないか'],
  ['design', 'c5', '消火器の設置本数', '消防令10条。歩行距離20m以内'],
  ['design', 'c6', '自動火災報知設備の感知器', '用途変更・間仕切変更に伴う移設・増設'],
  ['design', 'c7', '着工届・使用開始届', '消防法17条の14。工事7日前まで'],
  ['struct', 's1', '重量機器の集中荷重', '令85条。脚部の集中荷重は平均値では見えません'],
  ['struct', 's2', '躯体の開口補強', 'ダクト・配管の貫通。梁貫通は径と位置に制限があります'],
  ['struct', 's3', '重量物の耐震固定', '什器・機器の転倒防止。吊り天井の耐震も'],
  ['mep', 'm1', '給気経路の確保', '排気だけ計画して給気を忘れると扉が開かなくなります'],
  ['mep', 'm2', '室外機の設置場所', '個別空調の場合。荷重と騒音'],
  ['mep', 'm3', '給湯温度と能力', '用途ごとの必要温度と立上り'],
  ['elec', 'e1', '分電盤の位置と回路数', '予備回路を2割'],
  ['elec', 'e2', '専用回路と漏電遮断器', '電技解釈36条。水気のある場所'],
  ['elec', 'e3', '動力（三相200V）の要否', '契約区分が変わります'],
  ['elec', 'e4', '照度と演色性', 'JIS Z 9110'],
];

export const CHK_BIZ: Record<'kitchen' | 'retail' | 'office' | 'salon' | 'clinic', CheckDef[]> = {
  kitchen: [
    ['design', 'k1', '厨房の不燃区画', '火気使用室の壁・天井の仕上げと区画'],
    ['design', 'k2', '食品衛生法の施設基準', 'シンク数・手洗い・更衣。保健所に事前相談'],
    ['design', 'k3', '深夜営業・風営法の該当', '0時以降の酒類提供、照度10lx以下の客席'],
    ['struct', 'k4', '厨房の防水押えとスラブ段差', '躯体段差が要るなら躯体工事に戻ります'],
    ['mep', 'k5', 'グリスフィルター・280℃防火ダンパー', '火災予防条例。排気ダクト系統に必須'],
    ['mep', 'k6', '厨房排気ダクトの経路と清掃口', '屋上までの縦シャフトが取れるか'],
    ['mep', 'k7', 'グリストラップの位置と容量', '床スラブ厚・排水勾配。後から動かせません'],
  ],
  retail: [
    ['design', 'r1', '什器レイアウトと避難通路', '条例の上乗せに注意'],
    ['design', 'r2', '屋外広告物の許可', '看板・突出・屋上'],
    ['elec', 'r3', '什器電源とレイアウト変更への備え', 'フロアコンセント・配線ダクト'],
  ],
  office: [
    ['design', 'o1', '事務所衛生基準（気積10m³/人）', '事務所衛生基準規則'],
    ['design', 'o2', '便所の器具数', '事務所衛生基準規則'],
    ['elec', 'o3', 'OA負荷と幹線余裕', '将来増設20〜30%'],
    ['struct', 'o4', 'OAフロアの高さと許容荷重', 'サーバーラックは集中荷重'],
  ],
  salon: [
    ['design', 'n1', '美容所・理容所の開設届', '保健所。作業椅子数・面積・消毒設備'],
    ['mep', 'n2', 'シャンプー給湯の同時使用', 'ピーク時の湯量と能力'],
    ['mep', 'n3', '薬剤の局所換気', 'パーマ液・カラー剤'],
    ['mep', 'n4', '毛髪の排水阻集器', '毛髪阻集器の設置'],
  ],
  clinic: [
    ['design', 'd1', '診療所の構造設備基準', '医療法施行規則'],
    ['design', 'd2', 'X線室の遮蔽計算', '医療法施行規則30条。鉛当量'],
    ['struct', 'd3', 'X線装置・重量機器の荷重', '300kg級。床の補強検討'],
    ['mep', 'd4', '感染対策のゾーニング・換気', '清潔・不潔の分離'],
    ['elec', 'd5', '医用接地と非常電源', 'JIS T 1022'],
  ],
};

export function checksFor(type: BizKey): CheckDef[] {
  const B = BIZ[type];
  let extra: CheckDef[] = [];
  if (B.cats.includes('kitchen')) extra = CHK_BIZ.kitchen;
  else if (B.cats.includes('retail')) extra = CHK_BIZ.retail;
  else if (B.cats.includes('office')) extra = CHK_BIZ.office;
  else if (B.cats.includes('salon')) extra = CHK_BIZ.salon;
  else if (B.cats.includes('clinic')) extra = CHK_BIZ.clinic;
  return CHK_COMMON.concat(extra);
}

/* ══════ 検討項目カタログ ══════ */
export type ToolKey = 'glass' | 'pipe' | 'fnb';

export type ItemDef = {
  cat: CatKey;
  label: string;
  basis: string;
  tool?: ToolKey;
  /**
   * 文字列を返すと、その理由でグレーアウトする。
   * 断定できる規則（条文が高さ・面積で切っているもの）だけに限定し、
   * 用途地域・自治体指定・敷地条件で変わるもの（日影規制／防火区画／排煙／擁壁）は
   * 指示書 §4-5 の判断に従い、グレーにせず通常表示のままにしている。
   */
  na?: (p: Project) => string | null;
};

export const ITEMS: ItemDef[] = [
  /* ── 意匠 ── */
  { cat: 'design', label: '建蔽率・容積率の算定', basis: '法52条・53条' },
  { cat: 'design', label: '高さ制限・斜線の検討', basis: '法55条・56条' },
  { cat: 'design', label: '日影規制の検討', basis: '法56条の2・別表第4' },
  { cat: 'design', label: '採光・換気の検討', basis: '令19条・20条の2' },
  { cat: 'design', label: '排煙設備の要否', basis: '令126条の2' },
  { cat: 'design', label: '避難経路・歩行距離', basis: '令119条〜126条' },
  { cat: 'design', label: '2以上の直通階段の要否', basis: '令121条' },
  { cat: 'design', label: '防火区画の検討', basis: '令112条' },
  { cat: 'design', label: '内装制限の確認', basis: '法35条の2・令128条の3の2' },
  {
    cat: 'design',
    label: '必要ガラス厚',
    basis: '令82条の4・H12告1458',
    tool: 'glass',
    na: (p) => (p.H <= 13 ? '高さ13m以下のため告示1458の直接適用外（実務では同式で確認）' : null),
  },
  {
    cat: 'design',
    label: 'バリアフリー法の適合義務',
    basis: 'BF法14条',
    na: (p) => (p.area < 2000 ? '延べ2000m²未満のため適合義務の対象外（条例の上乗せは要確認）' : null),
  },
  { cat: 'design', label: '確認申請・適合性判定の要否', basis: '法6条・6条の3' },
  { cat: 'design', label: '内装（区画）の必要諸元', basis: '消防規則1条の3ほか', tool: 'fnb' },

  /* ── 構造 ── */
  { cat: 'struct', label: '荷重・外力の設定', basis: '令84条〜88条' },
  { cat: 'struct', label: '地盤調査と地耐力の設定', basis: '令93条・H13告1113' },
  { cat: 'struct', label: '基礎形式の選定', basis: '建築基礎構造設計指針' },
  { cat: 'struct', label: '構造計算ルートの判定', basis: '法20条・令81条' },
  { cat: 'struct', label: '壁量計算・四分割法', basis: '令46条・H12告1352', na: (p) => (p.str !== 'w' ? '木造以外のため対象外' : null) },
  { cat: 'struct', label: 'N値計算と接合金物', basis: 'H12告示1460', na: (p) => (p.str !== 'w' ? '木造以外のため対象外' : null) },
  {
    cat: 'struct',
    label: '幅厚比・保有耐力接合',
    basis: 'H13告示1024',
    na: (p) => (p.str !== 's' && p.str !== 'src' ? '鉄骨を含まないため対象外' : null),
  },
  {
    cat: 'struct',
    label: '配筋・かぶり厚の検討',
    basis: '令79条・JASS5',
    na: (p) => (p.str === 'w' || p.str === 's' ? '鉄筋コンクリートを含まないため対象外' : null),
  },
  { cat: 'struct', label: '層間変形角・剛性率・偏心率', basis: '令82条の2・82条の6' },
  {
    cat: 'struct',
    label: '保有水平耐力の検討',
    basis: '令82条の3',
    na: (p) => (p.fl <= 2 && p.str === 'w' ? 'ルート1で完結する規模のため通常は不要' : null),
  },
  { cat: 'struct', label: '特定天井の該当判定', basis: 'H25告示771' },
  { cat: 'struct', label: '擁壁・山留めの検討', basis: '宅造技術基準・山留め指針' },
  { cat: 'struct', label: '機器・什器の床荷重', basis: '令85条', tool: 'fnb' },

  /* ── 設備 ── */
  { cat: 'mep', label: '給水方式と受水槽容量', basis: 'SHASE-S206' },
  { cat: 'mep', label: '給水管径の決定', basis: 'SHASE-S206' },
  { cat: 'mep', label: '排水管径・勾配', basis: 'SHASE-S206' },
  { cat: 'mep', label: '通気方式の選定', basis: 'SHASE-S206' },
  { cat: 'mep', label: '衛生器具数の算定', basis: 'SHASE-S206' },
  { cat: 'mep', label: '縦樋サイズの選定', basis: 'SHASE-S206', tool: 'pipe' },
  { cat: 'mep', label: '雨水流出抑制の要否', basis: '自治体条例' },
  { cat: 'mep', label: '換気量の算定', basis: '令20条の2・20条の3', tool: 'fnb' },
  { cat: 'mep', label: '空調負荷と機器選定', basis: 'SHASE', tool: 'fnb' },
  {
    cat: 'mep',
    label: 'ガス消費量と引込口径',
    basis: 'ガス事業者基準',
    tool: 'fnb',
    na: (p) => (p.gas === '0' ? 'ガスの引込がないため対象外' : null),
  },
  { cat: 'mep', label: '消火設備の要否', basis: '消防令10条〜29条' },
  {
    cat: 'mep',
    label: '連結送水管の要否',
    basis: '消防令29条',
    na: (p) => (p.fl < 7 && p.area < 6000 ? '7階未満かつ6000m²未満のため対象外' : null),
  },
  { cat: 'mep', label: '排煙設備（機械）の検討', basis: '令126条の3' },
  { cat: 'mep', label: '浄化槽の要否と人槽算定', basis: 'JIS A 3302' },

  /* ── 電気 ── */
  { cat: 'elec', label: '受電方式・契約電力の判定', basis: '電気事業法・電力会社基準' },
  {
    cat: 'elec',
    label: '変圧器容量の算定',
    basis: '内線規程',
    na: (p) => ((p.cap || 0) > 0 && p.cap < 50 ? '低圧受電の規模のため通常は不要' : null),
  },
  { cat: 'elec', label: '幹線サイズ・電圧降下', basis: '内線規程1310節' },
  { cat: 'elec', label: '分岐回路と分電盤の計画', basis: '内線規程' },
  { cat: 'elec', label: '接地工事の種別と抵抗値', basis: '電技解釈17条' },
  { cat: 'elec', label: '避雷設備の要否', basis: '法33条・JIS A 4201', na: (p) => (p.H <= 20 ? '高さ20m以下のため設置義務なし' : null) },
  { cat: 'elec', label: '照度計算', basis: 'JIS Z 9110' },
  { cat: 'elec', label: '非常用照明の検討', basis: '令126条の4・5' },
  { cat: 'elec', label: '誘導灯の区分と配置', basis: '消防令26条・規則28条の3' },
  { cat: 'elec', label: '自動火災報知設備の計画', basis: '消防令21条' },
  {
    cat: 'elec',
    label: '非常用エレベーターの要否',
    basis: '令129条の13の3',
    na: (p) => (p.H <= 31 ? '高さ31m以下のため設置義務なし' : null),
  },
  { cat: 'elec', label: '非常電源（自家発・蓄電池）', basis: '消防規則12条ほか' },
  { cat: 'elec', label: '必要電力と幹線容量（区画）', basis: '内線規程', tool: 'fnb' },
];

export const itemKey = (it: ItemDef) => `${it.cat}|${it.label}`;

/** 検討が依存する物件条件の表示名と単位（変更追従の差分表示に使う） */
export const DEP_LABEL: Record<string, string> = {
  v0: '基準風速 V₀',
  rough: '地表面粗度区分',
  H: '建築物の高さ H',
  rain: '設計用降雨強度',
  cap: 'テナント分電盤容量',
  ac: '空調方式',
  accap: '供給可能冷房能力',
  ex: '厨房排気ルート',
  gas: 'ガス引込口径',
  wsup: '給水引込口径',
};
export const DEP_UNIT: Record<string, string> = {
  v0: ' m/s',
  rough: '',
  H: ' m',
  rain: ' mm/h',
  cap: ' kVA',
  ac: '',
  accap: ' kW',
  ex: '',
  gas: 'A',
  wsup: 'A',
};
