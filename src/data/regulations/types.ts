/**
 * 対象法令チェック — 型定義
 *
 * 設計方針:
 *  - 該当判定は「用途 × 規模 × 高さ × 立地 × 工事種別」の閾値照合で決まる決定論的な処理にする。
 *    生成AIに判定させない。ハルシネーションが混ざる余地を作らないため。
 *  - ルールは必ず「根拠条項」「閾値」「出典URL」「データ基準日」を持つ。
 *    出典を辿れないものは載せない。
 *  - 断定できるものと、条件次第で変わるものを confidence で分ける。
 *    調査漏れを潰すのが目的なので、「要確認」として挙げること自体に価値がある。
 */

/** 工事種別 */
export type WorkType =
  | 'new'          // 新築
  | 'extension'    // 増築
  | 'rebuild'      // 改築・移転
  | 'majorRepair'  // 大規模の修繕・模様替
  | 'useChange'    // 用途変更
  | 'demolition';  // 解体

/** 求められる手続の種類 */
export type ActionKind =
  | '確認申請'
  | '適合義務'
  | '判定'
  | '許可'
  | '認定'
  | '届出'
  | '協議'
  | '報告'
  | '同意';

/**
 * 確度
 *  definite … 入力値だけで該当が確定するもの(面積・高さの閾値など)
 *  likely   … ほぼ該当するが、細目や適用除外の確認が要るもの
 *  check    … 該当する可能性があり、窓口で確認すべきもの(区域指定・条例の有無など)
 */
export type Confidence = 'definite' | 'likely' | 'check';

/** 構造種別 */
export type StructureType = 'wood' | 'steel' | 'rc' | 'src' | 'other';

/** 用途に紐づく属性。1つの用途が複数の法令のトリガになるため属性で持つ */
export interface UseOption {
  id: string;
  label: string;
  group: string;
  /** 建築基準法 別表第一(い)欄の特殊建築物に当たりうる用途 */
  specialBuilding: boolean;
  /** バリアフリー法の特別特定建築物(適合義務の対象になりうる) */
  barrierFreeSpecial?: boolean;
  /** バリアフリー法の特定建築物(努力義務) */
  barrierFreeGeneral?: boolean;
  /** 建築物衛生法(ビル管法)の特定用途 */
  hygieneSpecified?: boolean;
  /** 建築物衛生法の特定用途のうち、学校教育法1条校(閾値が8,000m2) */
  hygieneSchool?: boolean;
  /** 物販店舗(大規模小売店舗立地法の対象になりうる) */
  retail?: boolean;
  /** 製造業等(工場立地法の対象になりうる) */
  factory?: boolean;
}

/** 立地に関するフラグ。v1では自己申告(自動取得は将来のGIS連携で置き換える) */
export interface SiteFlagOption {
  id: string;
  label: string;
  hint?: string;
}

/** 入力 */
export interface ProjectInput {
  municipalityId: string;
  workTypes: WorkType[];
  useIds: string[];
  /** 延べ面積 m2 */
  totalFloorArea: number;
  /** 建築面積 m2 */
  buildingArea: number;
  /** 敷地面積 m2 */
  siteArea: number;
  /** 地上階数 */
  floorsAbove: number;
  /** 地下階数 */
  floorsBelow: number;
  /** 最高高さ m */
  maxHeight: number;
  structure: StructureType;
  zoning: string;
  /** 都市計画区域等の内か */
  inCityPlanningArea: boolean;
  /** 市街化調整区域か */
  urbanizationControlArea: boolean;
  /** 店舗面積 m2(物販のとき) */
  storeArea: number;
  /** 請負金額 万円(建設リサイクル法の判定に使う) */
  contractAmountManYen: number;
  /** 土地の形質変更面積 m2 */
  formChangeArea: number;
  /** 解体部分の床面積 m2 */
  demolitionArea: number;
  siteFlags: string[];
}

/** 出典 */
export interface RuleSource {
  label: string;
  url: string;
}

/** ルール1件 */
export interface RegulationRule {
  id: string;
  /** 結果画面のグループ見出し */
  category: string;
  title: string;
  /** 法令・条例名 */
  law: string;
  /** 根拠条項 */
  provision: string;
  action: ActionKind;
  /** 所管の一般名(自治体ルールでは実際の課名が入る) */
  authority: string;
  /** 何を求められるかの要約。ここが「解釈」に当たる */
  summary: string;
  /** 閾値の文言。入力値と突き合わせて読めるように書く */
  threshold?: string;
  note?: string;
  scope: 'national' | 'municipal';
  municipalityId?: string;
  /** このルールの記載内容が拠って立つ資料の基準日 */
  asOf: string;
  sources: RuleSource[];
  confidence: Confidence;
  /** 該当すれば理由文字列を返す。該当しなければ null */
  match: (p: ProjectInput) => string | null;
}

/**
 * 原典側で起きている変化。
 * 判定ルールは原典を人が読んで書き起こしているので、原典が改訂されると
 * こちらのデータは黙って古くなる。それを画面とレポートに出すために持つ。
 */
export interface SourceAlert {
  kind: 'document' | 'law';
  label: string;
  url: string;
  /** 取り込んだ時点 */
  baselineAt?: string;
  /** 更新を検知した時点 */
  changedAt?: string;
  /** 法令改正の日付(YYYYMMDD) */
  date?: string;
  error?: string;
}

/** 判定結果1件 */
export interface RuleHit {
  rule: RegulationRule;
  reason: string;
  /**
   * 実際に表示する調査先。
   * 自治体パックに上書きがあればその課名・連絡先、なければ rule.authority。
   */
  authority: string;
  /** 出典側の更新。空なら取り込み時点から変化なし */
  alerts: SourceAlert[];
}

/** 自治体 */
export interface Municipality {
  id: string;
  label: string;
  /** 差分レイヤーを整備済みか。未整備なら全国共通レイヤーのみ出す */
  hasLocalLayer: boolean;
  sourceLabel?: string;
  sourceUrl?: string;
  asOf?: string;
}

/**
 * 自治体パック
 *
 * 自治体差分は2種類ある。
 *  1. その自治体にしかない条例・要綱  → rules
 *  2. 国の法令の窓口が自治体ごとに違う → authorityOverrides
 *
 * 2 は自治体の事前チェックリストがまさに提供している情報で、
 * 「どこに聞きに行けばよいか」がそのまま調査工数になるので、
 * 条例と同じくらい実務的な価値がある。
 */
export interface MunicipalPack {
  id: string;
  label: string;
  sourceLabel: string;
  sourceUrl: string;
  asOf: string;
  rules: RegulationRule[];
  /** 全国共通ルールのID -> この自治体での実際の所管課・連絡先 */
  authorityOverrides: Record<string, string>;
}
