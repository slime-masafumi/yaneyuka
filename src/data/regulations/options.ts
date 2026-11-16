import type { SiteFlagOption, UseOption, WorkType } from './types';

/** 工事種別 */
export const WORK_TYPES: { id: WorkType; label: string }[] = [
  { id: 'new', label: '新築' },
  { id: 'extension', label: '増築' },
  { id: 'rebuild', label: '改築・移転' },
  { id: 'majorRepair', label: '大規模の修繕・模様替' },
  { id: 'renovation', label: '修繕・模様替・内装改修(大規模でない)' },
  { id: 'useChange', label: '用途変更' },
  { id: 'demolition', label: '解体' },
];

/**
 * 用途。
 * specialBuilding は建築基準法 第2条第二号の特殊建築物に当たりうるもの(工場・火葬場等を含む広い定義)。
 * beppyo1 は建築基準法 別表第一(い)欄の用途(令第115条の3で類するものを含む)。確認申請(法6条1項一号)はこちらで判定する。
 *   無床診療所・長屋・事務所・工場・火葬場・危険物の貯蔵場は別表第一に無い。
 * beppyoKou は別表第一(い)欄の項(法27条・法21条1項三号の判定に使う)。2026-11-16 に e-Gov の別表第一・令115条の3で確かめた。
 *   (一)劇場・集会場等 (二)病院・有床診療所・ホテル・共同住宅・寄宿舎・児童福祉施設等(令19条1項: 助産所・老人福祉施設・有料老人ホーム等を含む)
 *   (三)学校・体育館・博物館・美術館・図書館・スポーツの練習場等 (四)物販店舗・飲食店・展示場・遊技場・公衆浴場等
 *   (五)倉庫 (六)自動車車庫・自動車修理工場・映画スタジオ等。
 *   幼稚園・保育所・認定こども園は、幼稚園なら(三)、保育所・幼保連携型認定こども園なら(二)なので両方を持たせる。
 *   研修所は「学校」に当たらない場合がある(専修学校・各種学校は(三))。
 * barrierFreeSpecial はバリアフリー法の特別特定建築物(令第5条)に当たりうるもの。
 * barrierFreeGeneral は同法の特定建築物(令第4条、努力義務)に当たるもの。
 * hygieneSpecified は建築物衛生法の特定用途(令第1条第一号〜第四号: 興行場・百貨店・集会場・図書館・博物館・美術館・
 *   遊技場・店舗・事務所・1条校以外の学校・旅館)。hygieneSchool は「専ら1条校・幼保連携型認定こども園」(8,000m2)。
 */
export const USE_OPTIONS: UseOption[] = [
  // 住宅系
  { id: 'detachedHouse', label: '戸建住宅', group: '住宅', specialBuilding: false },
  { id: 'apartment', label: '共同住宅', group: '住宅', specialBuilding: true, beppyo1: true, beppyoKou: [2], barrierFreeGeneral: true },
  { id: 'rowHouse', label: '長屋', group: '住宅', specialBuilding: false },
  { id: 'dormitory', label: '寄宿舎・下宿', group: '住宅', specialBuilding: true, beppyo1: true, beppyoKou: [2], barrierFreeGeneral: true },

  // 業務・商業系
  { id: 'office', label: '事務所', group: '業務・商業', specialBuilding: false, barrierFreeGeneral: true, hygieneSpecified: true },
  { id: 'publicOffice', label: '官公署(保健所・税務署等)', group: '業務・商業', specialBuilding: false, barrierFreeSpecial: true, hygieneSpecified: true },
  { id: 'retailStore', label: '物販店舗', group: '業務・商業', specialBuilding: true, beppyo1: true, beppyoKou: [4], barrierFreeSpecial: true, hygieneSpecified: true, retail: true },
  { id: 'restaurant', label: '飲食店', group: '業務・商業', specialBuilding: true, beppyo1: true, beppyoKou: [4], barrierFreeSpecial: true, hygieneSpecified: true },
  { id: 'exhibition', label: '展示場', group: '業務・商業', specialBuilding: true, beppyo1: true, beppyoKou: [4], barrierFreeSpecial: true },
  { id: 'hotel', label: 'ホテル・旅館', group: '業務・商業', specialBuilding: true, beppyo1: true, beppyoKou: [2], barrierFreeSpecial: true, hygieneSpecified: true },
  { id: 'amusement', label: '遊技場(ぱちんこ店等)', group: '業務・商業', specialBuilding: true, beppyo1: true, beppyoKou: [4], barrierFreeSpecial: true, hygieneSpecified: true },
  { id: 'barber', label: '理容所', group: '業務・商業', specialBuilding: false, barrierFreeSpecial: true },
  { id: 'beauty', label: '美容所', group: '業務・商業', specialBuilding: false, barrierFreeSpecial: true },
  { id: 'laundry', label: 'クリーニング所', group: '業務・商業', specialBuilding: false, barrierFreeSpecial: true },
  { id: 'pharmacy', label: '薬局・医薬品販売業', group: '業務・商業', specialBuilding: true, beppyo1: true, beppyoKou: [4], barrierFreeSpecial: true, hygieneSpecified: true, retail: true },

  // 医療・福祉系
  { id: 'hospital', label: '病院', group: '医療・福祉', specialBuilding: true, beppyo1: true, beppyoKou: [2], barrierFreeSpecial: true },
  { id: 'clinicWithBeds', label: '有床診療所', group: '医療・福祉', specialBuilding: true, beppyo1: true, beppyoKou: [2], barrierFreeSpecial: true },
  { id: 'clinicNoBeds', label: '無床診療所', group: '医療・福祉', specialBuilding: true, barrierFreeSpecial: true },
  { id: 'midwifery', label: '助産所', group: '医療・福祉', specialBuilding: true, beppyo1: true, beppyoKou: [2] },
  { id: 'dentalLab', label: '歯科技工所', group: '医療・福祉', specialBuilding: false },
  { id: 'elderlyFacility', label: '老人ホーム・福祉施設', group: '医療・福祉', specialBuilding: true, beppyo1: true, beppyoKou: [2], barrierFreeSpecial: true },
  { id: 'childWelfare', label: '児童福祉施設等', group: '医療・福祉', specialBuilding: true, beppyo1: true, beppyoKou: [2], barrierFreeSpecial: true },

  // 教育・文化系
  { id: 'school', label: '学校(学校教育法1条校)', group: '教育・文化', specialBuilding: true, beppyo1: true, beppyoKou: [3], barrierFreeSpecial: true, hygieneSchool: true },
  { id: 'otherSchool', label: '専修学校・各種学校・研修所', group: '教育・文化', specialBuilding: true, beppyo1: true, beppyoKou: [3], barrierFreeGeneral: true, hygieneSpecified: true },
  { id: 'kindergarten', label: '幼稚園・保育所・認定こども園', group: '教育・文化', specialBuilding: true, beppyo1: true, beppyoKou: [2, 3], barrierFreeGeneral: true, hygieneSchool: true },
  { id: 'library', label: '図書館・博物館・美術館', group: '教育・文化', specialBuilding: true, beppyo1: true, beppyoKou: [3], barrierFreeSpecial: true, hygieneSpecified: true },
  { id: 'assemblyHall', label: '集会場・公会堂', group: '教育・文化', specialBuilding: true, beppyo1: true, beppyoKou: [1], barrierFreeSpecial: true, hygieneSpecified: true },
  { id: 'theater', label: '劇場・映画館・演芸場', group: '教育・文化', specialBuilding: true, beppyo1: true, beppyoKou: [1], barrierFreeSpecial: true, hygieneSpecified: true },
  { id: 'gym', label: '体育館・スポーツ施設', group: '教育・文化', specialBuilding: true, beppyo1: true, beppyoKou: [3], barrierFreeSpecial: true },
  { id: 'publicBath', label: '公衆浴場', group: '教育・文化', specialBuilding: true, beppyo1: true, beppyoKou: [4], barrierFreeSpecial: true },

  // 生産・保管系
  { id: 'factory', label: '工場', group: '生産・保管', specialBuilding: true, factory: true },
  { id: 'carRepair', label: '自動車修理工場', group: '生産・保管', specialBuilding: true, beppyo1: true, beppyoKou: [6] },
  { id: 'warehouse', label: '倉庫', group: '生産・保管', specialBuilding: true, beppyo1: true, beppyoKou: [5] },
  { id: 'garage', label: '自動車車庫', group: '生産・保管', specialBuilding: true, beppyo1: true, beppyoKou: [6], barrierFreeSpecial: true },
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

/** 別表第一(い)欄の項の見出し(法27条の入力欄と結果に使う) */
export const BEPPYO_KOU_LABEL: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
  1: '(一)項 劇場・映画館・集会場等',
  2: '(二)項 病院・有床診療所・ホテル・共同住宅・寄宿舎・児童福祉施設等',
  3: '(三)項 学校・体育館・図書館等',
  4: '(四)項 物販店舗・飲食店・展示場・遊技場等',
  5: '(五)項 倉庫',
  6: '(六)項 自動車車庫・自動車修理工場等',
};

/** 構造 */
export const STRUCTURE_OPTIONS = [
  { id: 'wood', label: '木造' },
  { id: 'steel', label: '鉄骨造' },
  { id: 'rc', label: '鉄筋コンクリート造' },
  { id: 'src', label: '鉄骨鉄筋コンクリート造' },
  { id: 'other', label: 'その他(混構造・組積造・CB造等)' },
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
  { id: 'fireArea', label: '防火地域' },
  { id: 'quasiFireArea', label: '準防火地域' },
  { id: 'heightDistrict', label: '高度地区', hint: '都市計画で高さの最高限度・最低限度が定められている' },
  { id: 'districtPlan', label: '地区計画等の区域内', hint: '地区整備計画の内容により条例で建築制限がかかる' },
  { id: 'scenicDistrict', label: '風致地区', hint: '条例で建築・造成・木竹の伐採に許可が要る' },
  { id: 'cityPlanningFacility', label: '都市計画道路・公園等の区域内', hint: '都市計画施設の区域' },
  { id: 'landReadjustment', label: '土地区画整理事業の施行区域内' },
  { id: 'parkingDistrict', label: '駐車場整備地区', hint: '駐車場法第20条の附置義務条例の対象になる区域' },
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
  { id: 'radioInterference', label: '電波伝搬障害防止区域', hint: '総務省の告示で指定。高さ31m超で届出' },
  { id: 'portArea', label: '臨港地区' },
  { id: 'greenArea', label: '緑化地域・緑化率規制のある区域' },
];

/**
 * 自治体の選択肢は municipalities/index.ts が自治体パックから組み立てる。
 * ここに置くと options -> municipalities -> _helpers -> options の循環参照になるため、
 * このファイルには置かない。
 */
