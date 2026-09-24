'use client';

import React, { useEffect, useState } from 'react';
import { consumeDesignToolsTarget, onDesignToolsTarget, type DesignToolsTarget } from '@/lib/designToolsNav';
import { DESIGN_TOOL_MENU, type DesignToolEntry } from '@/lib/designToolsMenu';
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
import ExteriorRainwater from '@/components/content/Userpage/design-tools/ExteriorRainwater';
import PavementDesign from '@/components/content/Userpage/design-tools/PavementDesign';
import AreaTableLauncher from '@/components/content/Userpage/design-tools/AreaTableLauncher';
import FireEquipment from '@/components/content/Userpage/design-tools/3_FireEquipment';
import BuildingRegulations from '@/components/content/Userpage/design-tools/7_BuildingRegulations';
import PropertyCard from '@/components/content/Userpage/design-tools/PropertyCard';

// --- カテゴリ＆サブタブ定義 ---
// 並びとラベルは src/lib/designToolsMenu.ts が唯一の定義。
// 左カラム（Sidebar の Ⅳ）が同じ並びを出すので、ここで直書きしない。
// ここは id とツール本体の対応表だけを持つ。
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

const TOOL_COMPONENTS: Record<string, React.ReactNode> = {
  'property-card': <PropertyCard hideHeader />,
  'schedule': <Schedule />,
  'area-table': <AreaTableLauncher />,
  'use-zone': <UseZone hideHeader />,
  'building-regulations': <BuildingRegulations hideHeader />,
  'fire-equipment': <FireEquipment hideHeader />,
  'color-palette': <ColorProposal defaultTab="harmony" hideTabBar />,
  'jpma-search': <ColorProposal defaultTab="jpma" hideTabBar />,
  'shadow-regulation': <PlaceholderTool name="日影規制" description="日影規制の検討ツールです。（準備中）" />,
  'setback-regulation': <PlaceholderTool name="斜線制限" description="道路斜線・隣地斜線・北側斜線の検討ツールです。（準備中）" />,
  'glass-thickness': <GlassThickness hideHeader />,
  'condensation': <MultiLayerCondensation hideHeader />,
  'building-rainwater': <RainwaterCalculation mode="building" hideTabBar />,
  'section': <StructuralTools defaultTab="section" hideTabBar />,
  'portal': <StructuralTools defaultTab="portal" hideTabBar />,
  'beam': <StructuralTools defaultTab="beam" hideTabBar />,
  'nvalue': <StructuralTools defaultTab="nvalue" hideTabBar />,
  'formulas': <StructuralTools defaultTab="formulas" hideTabBar />,
  'unit-weight-calc': <UnitVolumeCalculation defaultTab="calculator" hideTabBar />,
  'density-list': <UnitVolumeCalculation defaultTab="reference" hideTabBar />,
  'load-calc': <PlaceholderTool name="荷重計算" description="建築物の荷重計算ツールです。（準備中）" />,
  'vent-24h': <VentilationCalculation defaultTab="sickhouse" hideTabBar />,
  'vent-fire': <VentilationCalculation defaultTab="fire" hideTabBar />,
  'vent-occupancy': <VentilationCalculation defaultTab="occupancy" hideTabBar />,
  'aircon-home': <AirconSelection defaultTab="home" hideTabBar />,
  'aircon-business': <AirconSelection defaultTab="business" hideTabBar />,
  'duct-sizing': <DuctMeasure defaultTab="duct" hideTabBar />,
  'duct-insulation': <DuctMeasure defaultTab="insulation" hideTabBar />,
  'duct-outlet': <DuctMeasure defaultTab="outlet" hideTabBar />,
  'plumbing': <PlaceholderTool name="給排水計算" description="給排水管の管径計算ツールです。（準備中）" />,
  'illumination': <PlaceholderTool name="照度計算" description="室内照度の計算ツールです。（準備中）" />,
  'elec-capacity': <PlaceholderTool name="電気容量計算" description="電気設備容量の計算ツールです。（準備中）" />,
  'trunk-size': <PlaceholderTool name="幹線サイズ" description="幹線ケーブルサイズの選定ツールです。（準備中）" />,
  'plant-selection': <PlantSelection hideHeader />,
  'exterior-rainwater': <ExteriorRainwater />,
  'slope-calc': <PlaceholderTool name="勾配計算" description="外構の勾配計算ツールです。（準備中）" />,
  'pavement': <PavementDesign />,
};

type SubTab = DesignToolEntry & { component: React.ReactNode };
type Category = DesignToolEntry & { subTabs: SubTab[] };

const categories: Category[] = DESIGN_TOOL_MENU.map((category) => ({
  ...category,
  subTabs: category.subTabs.map((sub) => ({
    ...sub,
    component: TOOL_COMPONENTS[sub.id] ?? (
      <PlaceholderTool name={sub.label} description={sub.description} />
    ),
  })),
}));
/** 左カラムから渡された指定を、実在する分野・ツールに丸める。 */
function resolveTarget(target: DesignToolsTarget | null): { categoryId: string; subTabId: string } {
  const category = categories.find((c) => c.id === target?.categoryId) ?? categories[0];
  const subTab = category.subTabs.find((s) => s.id === target?.subTabId) ?? category.subTabs[0];
  return { categoryId: category.id, subTabId: subTab.id };
}

const DesignTools: React.FC = () => {
  // 左カラムの Ⅳ から分野・ツールを指定して開かれた場合は、そこで初期表示する。
  const initial = resolveTarget(consumeDesignToolsTarget());

  const [activeCategory, setActiveCategory] = useState<string>(initial.categoryId);
  const [activeSubTab, setActiveSubTab] = useState<string>(initial.subTabId);

  // すでに開いている状態で左カラムの別ツールが押されたとき用。
  useEffect(
    () =>
      onDesignToolsTarget((target) => {
        const next = resolveTarget(target);
        setActiveCategory(next.categoryId);
        setActiveSubTab(next.subTabId);
      }),
    []
  );

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

      {/* 1段目: カテゴリ選択ボタン
          lg 以上では左カラムの Ⅳ が分野もツールも出すので畳む。
          左カラムは hidden lg:block なので、狭い画面ではここが唯一のナビになる。 */}
      <div className="bg-[#3b3b3b] w-full overflow-x-auto lg:hidden">
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

      {/* 2段目: 選択中ツールの説明文。
          lg 以上はタブ行を畳むので、いまどこにいるかをパンくずで出す。 */}
      <div className="px-4 py-3 bg-[#3b3b3b]">
        <p className="hidden lg:block text-[10.5px] text-gray-400 mb-1">
          設計ツール ＞ {currentCategory.label} ＞ {currentSubTab?.label}
        </p>
        <h3 className="text-[13px] font-medium text-white">{currentSubTab?.title}</h3>
        <p className="text-[11px] text-gray-300 mt-0.5">{currentSubTab?.description}</p>
      </div>

      {/* 3段目: サブタブ（ダークバー・角丸タブ・アクティブ白）
          lg 以上では左カラムの Ⅳ が同じ並びを出すので畳む。 */}
      <div className="bg-[#3b3b3b] w-full overflow-x-auto lg:hidden">
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
