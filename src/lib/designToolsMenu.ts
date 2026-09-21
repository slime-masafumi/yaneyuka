/**
 * 設計ツールのメニュー定義（分野7 / ツール37）。
 *
 * 左カラム（Sidebar の Ⅳ）と中央の DesignTools が同じ並びを出す必要があるので、
 * ラベルだけをここに置いて唯一の定義にする。ツール本体（React コンポーネント）は
 * DesignTools.tsx 側が id で引き当てる。ここには import しない。
 * ここへ import すると、左カラムを描くだけで全ツールのコードが配信されてしまう。
 */

export type DesignToolEntry = {
  id: string;
  label: string;
  title: string;
  description: string;
};

export type DesignToolCategory = DesignToolEntry & {
  subTabs: DesignToolEntry[];
};

export const DESIGN_TOOL_MENU: DesignToolCategory[] = [
  {
    id: 'design-planning',
    label: '設計計画',
    title: '設計計画',
    description: '物件管理・工程計画・面積集計など、プロジェクトの基本管理ツール',
    subTabs: [
      { id: 'property-card', label: '物件カルテ', title: '物件カルテ', description: '建築設計の事前確認項目を物件ごとに管理' },
      { id: 'schedule', label: '工程表', title: '工程表', description: 'ガントチャート形式でプロジェクトの工程を管理' },
      { id: 'area-table', label: '面積表', title: '面積表', description: '各階・各室の面積を集計する面積表ツール（準備中）' },
    ],
  },
  {
    id: 'basic-design',
    label: '基本設計',
    title: '基本設計',
    description: '',
    subTabs: [
      { id: 'use-zone', label: '用途地域', title: '用途地域 建築物制限', description: '用途地域を選択して建築物の制限を確認' },
      { id: 'building-regulations', label: '建蔽容積率', title: '建蔽率・容積率計算', description: '用途地域ごとの建蔽率・容積率から可能建築面積を算出' },
      { id: 'fire-equipment', label: '消防設備', title: '消防設備判定', description: '防火対象物区分・面積・階数から消防設備の設置要否を簡易判定' },
      { id: 'color-palette', label: '配色パレット', title: '配色パレット', description: '基準色から調和する色の組み合わせを提案' },
      { id: 'jpma-search', label: '日塗工番号検索', title: '日塗工番号検索', description: '日塗工番号から近似色・マンセル値を検索' },
      { id: 'shadow-regulation', label: '日影規制', title: '日影規制', description: '日影規制の検討ツール（準備中）' },
      { id: 'setback-regulation', label: '斜線制限', title: '斜線制限', description: '道路斜線・隣地斜線・北側斜線の検討ツール（準備中）' },
    ],
  },
  {
    id: 'detail-design',
    label: '実施設計',
    title: '実施設計',
    description: '',
    subTabs: [
      { id: 'glass-thickness', label: 'ガラス厚計算', title: 'ガラス厚計算', description: '風圧力に対するガラス厚の検証（NSG技術資料準拠）' },
      { id: 'condensation', label: '結露検討', title: '結露検討', description: '多層壁体の温度分布・露点から結露判定' },
      { id: 'building-rainwater', label: '建物雨水', title: '建物雨水排水', description: '降雨強度に基づく軒樋・ルーフドレンの設計検証' },
    ],
  },
  {
    id: 'structural-design',
    label: '構造設計',
    title: '構造設計',
    description: '',
    subTabs: [
      { id: 'section', label: '断面性能', title: '断面性能計算', description: '矩形・円形・H形断面の断面二次モーメント等を算出' },
      { id: 'portal', label: 'ラーメン解析', title: '門型ラーメン解析', description: 'D値法による門型ラーメンの応力・変位を計算' },
      { id: 'beam', label: '梁公式', title: '梁の検討', description: '木造・S造の梁に対する曲げ・たわみの検討' },
      { id: 'nvalue', label: 'N値計算', title: 'N値計算', description: '木造軸組の柱頭柱脚接合部に必要な金物を判定' },
      { id: 'formulas', label: '公式集', title: '構造公式集', description: '構造計算でよく使う公式・係数のリファレンス' },
      { id: 'unit-weight-calc', label: '単位体積算定', title: '単位体積重量計算', description: '建材・土木資材の寸法から重量を算出' },
      { id: 'density-list', label: '密度一覧', title: '材料密度一覧', description: '各種建材・資材の単位体積重量の参考データ' },
      { id: 'load-calc', label: '荷重計算', title: '荷重計算', description: '建築物の荷重計算ツール（準備中）' },
    ],
  },
  {
    id: 'mechanical',
    label: '機械設備',
    title: '機械設備',
    description: '',
    subTabs: [
      { id: 'vent-24h', label: '24h換気', title: '24時間換気計算', description: 'シックハウス対策の必要換気量を算出' },
      { id: 'vent-fire', label: '火気使用室', title: '火気使用室換気', description: 'ガス機器の発熱量から必要換気量を算出' },
      { id: 'vent-occupancy', label: '居室換気', title: '居室換気計算', description: '在室人数に基づく必要換気量を算出' },
      { id: 'aircon-home', label: '住宅空調', title: '住宅用空調選定', description: '部屋の広さ・構造から住宅用エアコン能力を選定' },
      { id: 'aircon-business', label: '業務空調', title: '業務用空調選定', description: '用途・面積から業務用エアコンの必要能力を算出' },
      { id: 'duct-sizing', label: 'ダクト径', title: 'ダクト径選定', description: '風量・許容圧損からダクト径を算出' },
      { id: 'duct-insulation', label: 'ダクト結露', title: 'ダクト結露・保温判定', description: 'ダクト表面の結露リスクと必要保温厚を判定' },
      { id: 'duct-outlet', label: '吹出口', title: '吹出口・NC値', description: '吹出口のサイズ選定とNC値の確認' },
      { id: 'plumbing', label: '給排水計算', title: '給排水計算', description: '給排水管の管径計算ツール（準備中）' },
    ],
  },
  {
    id: 'electrical',
    label: '電気設備',
    title: '電気設備',
    description: '',
    subTabs: [
      { id: 'illumination', label: '照度計算', title: '照度計算', description: '室内照度の計算ツール（準備中）' },
      { id: 'elec-capacity', label: '電気容量計算', title: '電気容量計算', description: '電気設備容量の計算ツール（準備中）' },
      { id: 'trunk-size', label: '幹線サイズ', title: '幹線サイズ選定', description: '幹線ケーブルサイズの選定ツール（準備中）' },
    ],
  },
  {
    id: 'exterior-design',
    label: '外構設計',
    title: '外構設計',
    description: '',
    subTabs: [
      { id: 'plant-selection', label: '植栽選定', title: '植栽選定', description: '条件に合った樹種を検索・選定' },
      { id: 'exterior-rainwater', label: '外構雨水', title: '外構雨水排水', description: 'マニング公式による雨水管渠の排水能力を計算' },
      { id: 'slope-calc', label: '勾配計算', title: '勾配計算', description: '外構の勾配計算ツール（準備中）' },
      { id: 'pavement', label: '舗装設計', title: '舗装設計', description: '舗装構成の設計ツール（準備中）' },
    ],
  },
];
