'use client';

import React, { useState } from 'react';
import MultiLayerCondensation from '@/components/content/Userpage/design-tools/MultiLayerCondensation';
import StructuralTools from '@/components/content/Userpage/design-tools/10_StructuralTools';
import VentilationCalculation from '@/components/content/Userpage/design-tools/12_VentilationCalculation';
import AirconSelection from '@/components/content/Userpage/design-tools/AirconSelection';
import DuctMeasure from '@/components/content/Userpage/design-tools/DuctMeasure';
import UseZone from '@/components/content/Userpage/design-tools/11_UseZone';
import GlassThickness from '@/components/content/Userpage/design-tools/1_GlassThickness';
import Schedule from '@/components/content/Userpage/design-tools/4_Schedule';
import ColorProposal from '@/components/content/Userpage/design-tools/5_ColorProposal';
import PlantSelection from '@/components/content/Userpage/design-tools/8_PlantSelection';
import UnitVolumeCalculation from '@/components/content/Userpage/design-tools/6_UnitVolumeCalculation';
import RainwaterCalculation from '@/components/content/Userpage/design-tools/2_RainwaterCalculation';
import FireEquipment from '@/components/content/Userpage/design-tools/3_FireEquipment';
import BuildingRegulations from '@/components/content/Userpage/design-tools/7_BuildingRegulations';
import PropertyCard from '@/components/content/Userpage/design-tools/PropertyCard';

// --- カテゴリ＆サブタブ定義 ---
type SubTab = {
  id: string;
  label: string;
  title: string;
  description: string;
  component: React.ReactNode;
};

type Category = {
  id: string;
  label: string;
  title: string;
  description: string;
  subTabs: SubTab[];
};

const categories: Category[] = [
  {
    id: 'design-planning',
    label: '設計計画',
    title: '設計計画',
    description: '物件管理・工程計画・面積集計など、プロジェクトの基本管理ツール',
    subTabs: [
      { id: 'property-card', label: '物件カルテ', title: '物件カルテ', description: '建築設計の事前確認項目を物件ごとに管理', component: <PropertyCard hideHeader /> },
      { id: 'schedule', label: '工程表', title: '工程表', description: 'ガントチャート形式でプロジェクトの工程を管理', component: <Schedule /> },
      { id: 'area-table', label: '面積表', title: '面積表', description: '各階・各室の面積を集計する面積表ツール（準備中）', component: <PlaceholderTool name="面積表" description="各階・各室の面積を集計する面積表ツールです。（準備中）" /> },
    ],
  },
  {
    id: 'basic-design',
    label: '基本設計',
    title: '基本設計',
    description: '',
    subTabs: [
      { id: 'use-zone', label: '用途地域', title: '用途地域 建築物制限', description: '用途地域を選択して建築物の制限を確認', component: <UseZone hideHeader /> },
      { id: 'building-regulations', label: '建蔽容積率', title: '建蔽率・容積率計算', description: '用途地域ごとの建蔽率・容積率から可能建築面積を算出', component: <BuildingRegulations hideHeader /> },
      { id: 'fire-equipment', label: '消防設備', title: '消防設備判定', description: '防火対象物区分・面積・階数から消防設備の設置要否を簡易判定', component: <FireEquipment hideHeader /> },
      { id: 'color-palette', label: '配色パレット', title: '配色パレット', description: '基準色から調和する色の組み合わせを提案', component: <ColorProposal defaultTab="harmony" hideTabBar /> },
      { id: 'jpma-search', label: '日塗工番号検索', title: '日塗工番号検索', description: '日塗工番号から近似色・マンセル値を検索', component: <ColorProposal defaultTab="jpma" hideTabBar /> },
      { id: 'shadow-regulation', label: '日影規制', title: '日影規制', description: '日影規制の検討ツール（準備中）', component: <PlaceholderTool name="日影規制" description="日影規制の検討ツールです。（準備中）" /> },
      { id: 'setback-regulation', label: '斜線制限', title: '斜線制限', description: '道路斜線・隣地斜線・北側斜線の検討ツール（準備中）', component: <PlaceholderTool name="斜線制限" description="道路斜線・隣地斜線・北側斜線の検討ツールです。（準備中）" /> },
    ],
  },
  {
    id: 'detail-design',
    label: '実施設計',
    title: '実施設計',
    description: '',
    subTabs: [
      { id: 'glass-thickness', label: 'ガラス厚計算', title: 'ガラス厚計算', description: '風圧力に対するガラス厚の検証（NSG技術資料準拠）', component: <GlassThickness hideHeader /> },
      { id: 'condensation', label: '結露検討', title: '結露検討', description: '多層壁体の温度分布・露点から結露判定', component: <MultiLayerCondensation hideHeader /> },
      { id: 'building-rainwater', label: '建物雨水', title: '建物雨水排水', description: '降雨強度に基づく軒樋・ルーフドレンの設計検証', component: <RainwaterCalculation mode="building" hideTabBar /> },
    ],
  },
  {
    id: 'structural-design',
    label: '構造設計',
    title: '構造設計',
    description: '',
    subTabs: [
      { id: 'section', label: '断面性能', title: '断面性能計算', description: '矩形・円形・H形断面の断面二次モーメント等を算出', component: <StructuralTools defaultTab="section" hideTabBar /> },
      { id: 'portal', label: 'ラーメン解析', title: '門型ラーメン解析', description: 'D値法による門型ラーメンの応力・変位を計算', component: <StructuralTools defaultTab="portal" hideTabBar /> },
      { id: 'beam', label: '梁公式', title: '梁の検討', description: '木造・S造の梁に対する曲げ・たわみの検討', component: <StructuralTools defaultTab="beam" hideTabBar /> },
      { id: 'nvalue', label: 'N値計算', title: 'N値計算', description: '木造軸組の柱頭柱脚接合部に必要な金物を判定', component: <StructuralTools defaultTab="nvalue" hideTabBar /> },
      { id: 'formulas', label: '公式集', title: '構造公式集', description: '構造計算でよく使う公式・係数のリファレンス', component: <StructuralTools defaultTab="formulas" hideTabBar /> },
      { id: 'unit-weight-calc', label: '単位体積算定', title: '単位体積重量計算', description: '建材・土木資材の寸法から重量を算出', component: <UnitVolumeCalculation defaultTab="calculator" hideTabBar /> },
      { id: 'density-list', label: '密度一覧', title: '材料密度一覧', description: '各種建材・資材の単位体積重量の参考データ', component: <UnitVolumeCalculation defaultTab="reference" hideTabBar /> },
      { id: 'load-calc', label: '荷重計算', title: '荷重計算', description: '建築物の荷重計算ツール（準備中）', component: <PlaceholderTool name="荷重計算" description="建築物の荷重計算ツールです。（準備中）" /> },
    ],
  },
  {
    id: 'mechanical',
    label: '機械設備',
    title: '機械設備',
    description: '',
    subTabs: [
      { id: 'vent-24h', label: '24h換気', title: '24時間換気計算', description: 'シックハウス対策の必要換気量を算出', component: <VentilationCalculation defaultTab="sickhouse" hideTabBar /> },
      { id: 'vent-fire', label: '火気使用室', title: '火気使用室換気', description: 'ガス機器の発熱量から必要換気量を算出', component: <VentilationCalculation defaultTab="fire" hideTabBar /> },
      { id: 'vent-occupancy', label: '居室換気', title: '居室換気計算', description: '在室人数に基づく必要換気量を算出', component: <VentilationCalculation defaultTab="occupancy" hideTabBar /> },
      { id: 'aircon-home', label: '住宅空調', title: '住宅用空調選定', description: '部屋の広さ・構造から住宅用エアコン能力を選定', component: <AirconSelection defaultTab="home" hideTabBar /> },
      { id: 'aircon-business', label: '業務空調', title: '業務用空調選定', description: '用途・面積から業務用エアコンの必要能力を算出', component: <AirconSelection defaultTab="business" hideTabBar /> },
      { id: 'duct-sizing', label: 'ダクト径', title: 'ダクト径選定', description: '風量・許容圧損からダクト径を算出', component: <DuctMeasure defaultTab="duct" hideTabBar /> },
      { id: 'duct-insulation', label: 'ダクト結露', title: 'ダクト結露・保温判定', description: 'ダクト表面の結露リスクと必要保温厚を判定', component: <DuctMeasure defaultTab="insulation" hideTabBar /> },
      { id: 'duct-outlet', label: '吹出口', title: '吹出口・NC値', description: '吹出口のサイズ選定とNC値の確認', component: <DuctMeasure defaultTab="outlet" hideTabBar /> },
      { id: 'plumbing', label: '給排水計算', title: '給排水計算', description: '給排水管の管径計算ツール（準備中）', component: <PlaceholderTool name="給排水計算" description="給排水管の管径計算ツールです。（準備中）" /> },
    ],
  },
  {
    id: 'electrical',
    label: '電気設備',
    title: '電気設備',
    description: '',
    subTabs: [
      { id: 'illumination', label: '照度計算', title: '照度計算', description: '室内照度の計算ツール（準備中）', component: <PlaceholderTool name="照度計算" description="室内照度の計算ツールです。（準備中）" /> },
      { id: 'elec-capacity', label: '電気容量計算', title: '電気容量計算', description: '電気設備容量の計算ツール（準備中）', component: <PlaceholderTool name="電気容量計算" description="電気設備容量の計算ツールです。（準備中）" /> },
      { id: 'trunk-size', label: '幹線サイズ', title: '幹線サイズ選定', description: '幹線ケーブルサイズの選定ツール（準備中）', component: <PlaceholderTool name="幹線サイズ" description="幹線ケーブルサイズの選定ツールです。（準備中）" /> },
    ],
  },
  {
    id: 'exterior-design',
    label: '外構設計',
    title: '外構設計',
    description: '',
    subTabs: [
      { id: 'plant-selection', label: '植栽選定', title: '植栽選定', description: '条件に合った樹種を検索・選定', component: <PlantSelection hideHeader /> },
      { id: 'exterior-rainwater', label: '外構雨水', title: '外構雨水排水', description: 'マニング公式による雨水管渠の排水能力を計算', component: <RainwaterCalculation mode="exterior" hideTabBar /> },
      { id: 'slope-calc', label: '勾配計算', title: '勾配計算', description: '外構の勾配計算ツール（準備中）', component: <PlaceholderTool name="勾配計算" description="外構の勾配計算ツールです。（準備中）" /> },
      { id: 'pavement', label: '舗装設計', title: '舗装設計', description: '舗装構成の設計ツール（準備中）', component: <PlaceholderTool name="舗装設計" description="舗装構成の設計ツールです。（準備中）" /> },
    ],
  },
];

// プレースホルダーコンポーネント
function PlaceholderTool({ name, description }: { name: string; description: string }) {
  return (
    <div className="bg-white rounded-b-lg shadow-sm border-b border-gray-100">
      <div className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-800 mb-2">{name}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}

const DesignTools: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>(categories[0].id);
  const [activeSubTab, setActiveSubTab] = useState<string>(categories[0].subTabs[0].id);

  const currentCategory = categories.find(c => c.id === activeCategory)!;
  const currentSubTab = currentCategory.subTabs.find(s => s.id === activeSubTab);

  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    const cat = categories.find(c => c.id === categoryId)!;
    setActiveSubTab(cat.subTabs[0].id);
  };

  return (
    <div className="p-0 bg-white rounded-lg">
      <div className="flex items-baseline mb-2">
        <h2 className="text-xl font-semibold">設計ツール</h2>
        <span className="text-red-600 font-bold text-sm ml-4">※この機能は現在β版です。ご意見をぜひお聞かせください。</span>
      </div>

      {/* 1段目: カテゴリ選択ボタン */}
      <div className="bg-[#3b3b3b] w-full overflow-x-auto">
        <div className="flex">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`flex-1 px-2 py-2 text-xs font-medium focus:outline-none transition whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-[#1dad95] text-white'
                  : 'bg-[#3b3b3b] text-white hover:bg-gray-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2段目: 選択中ツールの説明文 */}
      <div className="px-4 py-3 bg-[#3b3b3b]">
        <h3 className="text-[13px] font-medium text-white">{currentSubTab?.title}</h3>
        <p className="text-[11px] text-gray-300 mt-0.5">{currentSubTab?.description}</p>
      </div>

      {/* 3段目: サブタブ（ダークバー・角丸タブ・アクティブ白） */}
      <div className="bg-[#3b3b3b] w-full overflow-x-auto">
        <div className="flex gap-1 px-2 pt-2">
          {currentCategory.subTabs.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setActiveSubTab(sub.id)}
              className={`px-4 py-2 text-xs rounded-t-lg transition-colors whitespace-nowrap ${
                activeSubTab === sub.id
                  ? 'bg-white text-gray-800 font-bold'
                  : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      </div>

      {/* コンテンツ */}
      <div className="w-full">
        {currentSubTab ? currentSubTab.component : (
          <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg m-4">
            <h3 className="text-lg font-medium mb-2">ツールを選択してください</h3>
            <p className="text-gray-600">上記のタブから使用したいツールを選択してください</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DesignTools;
