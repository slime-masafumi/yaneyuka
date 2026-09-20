import type { SiteFlagOption, UseOption, WorkType } from './types';

/** 工事種別 */
export const WORK_TYPES: { id: WorkType; label: string }[] = [
  { id: 'new', label: '新築' },
  { id: 'extension', label: '増築' },
  { id: 'rebuild', label: '改築・移転' },
  { id: 'majorRepair', label: '大規模の修繕・模様替' },
  { id: 'useChange', label: '用途変更' },
  { id: 'demolition', label: '解体' },
];

/**
 * 用途。
 * specialBuilding は建築基準法 別表第一(い)欄に掲げる用途に当たりうるものに付けている。
 * barrierFreeSpecial はバリアフリー法の特別特定建築物(令5条)に当たりうるもの。
 * hygieneSpecified は建築物衛生法の特定用途(興行場・百貨店・店舗・事務所・学校等)。
 */
export const USE_OPTIONS: UseOption[] = [
  // 住宅系
  { id: 'detachedHouse', label: '戸建住宅', group: '住宅', specialBuilding: false },
  { id: 'apartment', label: '共同住宅', group: '住宅', specialBuilding: true },
  { id: 'rowHouse', label: '長屋', group: '住宅', specialBuilding: true },
  { id: 'dormitory', label: '寄宿舎・下宿', group: '住宅', specialBuilding: true },

  // 業務・商業系
  { id: 'office', label: '事務所', group: '業務・商業', specialBuilding: false, barrierFreeGeneral: true, hygieneSpecified: true },
  { id: 'retailStore', label: '物販店舗', group: '業務・商業', specialBuilding: true, barrierFreeSpecial: true, hygieneSpecified: true, retail: true },
  { id: 'restaurant', label: '飲食店', group: '業務・商業', specialBuilding: true, barrierFreeSpecial: true, hygieneSpecified: true },
  { id: 'hotel', label: 'ホテル・旅館', group: '業務・商業', specialBuilding: true, barrierFreeSpecial: true },
  { id: 'amusement', label: '遊技場(ぱちんこ店等)', group: '業務・商業', specialBuilding: true, barrierFreeSpecial: true },
  { id: 'barber', label: '理容所', group: '業務・商業', specialBuilding: false },
  { id: 'beauty', label: '美容所', group: '業務・商業', specialBuilding: false },
  { id: 'laundry', label: 'クリーニング所', group: '業務・商業', specialBuilding: false },
  { id: 'pharmacy', label: '薬局・医薬品販売業', group: '業務・商業', specialBuilding: true, barrierFreeSpecial: true },

  // 医療・福祉系
  { id: 'hospital', label: '病院', group: '医療・福祉', specialBuilding: true, barrierFreeSpecial: true },
  { id: 'clinicWithBeds', label: '有床診療所', group: '医療・福祉', specialBuilding: true, barrierFreeSpecial: true },
  { id: 'clinicNoBeds', label: '無床診療所', group: '医療・福祉', specialBuilding: true, barrierFreeSpecial: true },
  { id: 'midwifery', label: '助産所', group: '医療・福祉', specialBuilding: true },
  { id: 'dentalLab', label: '歯科技工所', group: '医療・福祉', specialBuilding: false },
  { id: 'elderlyFacility', label: '老人ホーム・福祉施設', group: '医療・福祉', specialBuilding: true, barrierFreeSpecial: true },
  { id: 'childWelfare', label: '児童福祉施設等', group: '医療・福祉', specialBuilding: true, barrierFreeSpecial: true },

  // 教育・文化系
  { id: 'school', label: '学校(学校教育法1条校)', group: '教育・文化', specialBuilding: true, barrierFreeSpecial: true, hygieneSpecified: true, hygieneSchool: true },
  { id: 'kindergarten', label: '幼稚園・保育所・認定こども園', group: '教育・文化', specialBuilding: true, barrierFreeSpecial: true },
  { id: 'library', label: '図書館・博物館・美術館', group: '教育・文化', specialBuilding: true, barrierFreeSpecial: true, hygieneSpecified: true },
  { id: 'assemblyHall', label: '集会場・公会堂', group: '教育・文化', specialBuilding: true, barrierFreeSpecial: true },
  { id: 'theater', label: '劇場・映画館・演芸場', group: '教育・文化', specialBuilding: true, barrierFreeSpecial: true, hygieneSpecified: true },
  { id: 'gym', label: '体育館・スポーツ施設', group: '教育・文化', specialBuilding: true, barrierFreeSpecial: true },
  { id: 'publicBath', label: '公衆浴場', group: '教育・文化', specialBuilding: true, barrierFreeSpecial: true },

  // 生産・保管系
  { id: 'factory', label: '工場', group: '生産・保管', specialBuilding: true, factory: true },
  { id: 'warehouse', label: '倉庫', group: '生産・保管', specialBuilding: true },
  { id: 'garage', label: '自動車車庫', group: '生産・保管', specialBuilding: true, barrierFreeSpecial: true },
  { id: 'dangerousGoods', label: '危険物の貯蔵・処理施設', group: '生産・保管', specialBuilding: true },

  // その他
  { id: 'cemetery', label: '墓地・納骨堂', group: 'その他', specialBuilding: false },
  { id: 'crematorium', label: '火葬場', group: 'その他', specialBuilding: true },
  { id: 'renderingPlant', label: '化製場', group: 'その他', specialBuilding: true },
];

export const USE_GROUPS = ['住宅', '業務・商業', '医療・福祉', '教育・文化', '生産・保管', 'その他'];

/** 用途地域 */
export const ZONING_OPTIONS = [
  '未選択',
  '第一種低層住居専用地域',
  '第二種低層住居専用地域',
  '第一種中高層住居専用地域',
  '第二種中高層住居専用地域',
  '第一種住居地域',
  '第二種住居地域',
  '準住居地域',
  '田園住居地域',
  '近隣商業地域',
  '商業地域',
  '準工業地域',
  '工業地域',
  '工業専用地域',
  '用途地域の指定のない区域',
];

/** 構造 */
export const STRUCTURE_OPTIONS = [
  { id: 'wood', label: '木造' },
  { id: 'steel', label: '鉄骨造' },
  { id: 'rc', label: '鉄筋コンクリート造' },
  { id: 'src', label: '鉄骨鉄筋コンクリート造' },
  { id: 'other', label: 'その他' },
] as const;

/**
 * 立地フラグ。
 * v1は自己申告。将来は国土交通省の都市計画決定GISデータ(2024年7月公開、
 * シェープ/GeoJSON/CityGML、無償)を敷地座標で引いて自動判定に置き換える。
 * 地区計画・高度地区・防火地域・特別用途地区は同データに含まれる。
 * ただし埋蔵文化財包蔵地や河川区域は自治体側の整備状況にばらつきがあるため、
 * 当面は入力で受ける。
 */
export const SITE_FLAGS: SiteFlagOption[] = [
  { id: 'districtPlan', label: '地区計画等の区域内', hint: '地区整備計画の内容により条例で建築制限がかかる' },
  { id: 'cityPlanningFacility', label: '都市計画道路・公園等の区域内', hint: '都市計画施設の区域' },
  { id: 'landReadjustment', label: '土地区画整理事業の施行区域内' },
  { id: 'buriedCulturalProperty', label: '周知の埋蔵文化財包蔵地' },
  { id: 'riverArea', label: '河川区域・河川保全区域' },
  { id: 'erosionControl', label: '砂防指定地' },
  { id: 'landslide', label: '地すべり防止区域・急傾斜地崩壊危険区域' },
  { id: 'coastal', label: '海岸保全区域' },
  { id: 'naturalPark', label: '自然公園区域' },
  { id: 'landscapeArea', label: '景観計画区域' },
  { id: 'soilRegulationArea', label: '宅地造成等工事規制区域・特定盛土等規制区域' },
  { id: 'specifiedUrbanRiver', label: '特定都市河川流域' },
  { id: 'airportRestriction', label: '航空法の制限表面がかかる区域' },
  { id: 'portArea', label: '臨港地区' },
  { id: 'greenArea', label: '緑化地域・緑化率規制のある区域' },
  { id: 'fireArea', label: '防火地域' },
  { id: 'quasiFireArea', label: '準防火地域' },
];

/**
 * 自治体の選択肢は municipalities/index.ts が自治体パックから組み立てる。
 * ここに置くと options -> municipalities -> _helpers -> options の循環参照になるため、
 * このファイルには置かない。
 */
