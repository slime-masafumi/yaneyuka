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
import SlopeCalc from '@/components/content/Userpage/design-tools/SlopeCalc';
import LoadCalc from '@/components/content/Userpage/design-tools/LoadCalc';
import AreaTableLauncher from '@/components/content/Userpage/design-tools/AreaTableLauncher';
import FireEquipment from '@/components/content/Userpage/design-tools/3_FireEquipment';
import BuildingRegulations from '@/components/content/Userpage/design-tools/7_BuildingRegulations';
import PropertyCard from '@/components/content/Userpage/design-tools/PropertyCard';
import ForceFlowTool from '@/components/forceflow/ForceFlowTool';
import { ModeBar, SheetHead } from '@/components/ui/Sheet';
import '@/components/content/Userpage/design-tools/dt-premium.css';

/**
 * 計算書の組版(モック「高級感 3」Q3 / Q7 / Q8)に作り替えたツール。
 * これらは自分で ModeBar と見出し(ボタンつき)を出すので、ここでは出さない。
 */
const SHEET_TOOLS = new Set(['glass-thickness', 'condensation', 'vent-24h']);
/** 共通の組版(dt-premium.css の .yy-dt)を当てないツール。計算書型と、構造設計者のレビュー中の構造フロー */
const OWN_STYLE_TOOLS = new Set([...SHEET_TOOLS, 'force-flow']);
/** ツールの通し番号(一覧と同じ 01〜) */
const TOOL_NO: Record<string, string> = Object.fromEntries(
  DESIGN_TOOL_MENU.flatMap((c) => c.subTabs).map((t, i) => [t.id, String(i + 1).padStart(2, '0')]),
);

// --- カテゴリ＆サブタブ定義 ---
// 並びとラベルは src/lib/designToolsMenu.ts が唯一の定義。
// 左カラム（Sidebar の Ⅳ）が同じ並びを出すので、ここで直書きしない。
// ここは id とツール本体の対応表だけを持つ。
// プレースホルダーコンポーネント
function PlaceholderTool({ name, description }: { name: string; description: string }) {
  return (
    <div className="yy-dt-soon">
      <span className="yy-label">soon — 準備中</span>
      <p className="yy-dt-soon__title">{name}</p>
      <p className="yy-dt-soon__text">{description}</p>
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
  'glass-thickness': <GlassThickness hideHeader sheet />,
  'condensation': <MultiLayerCondensation hideHeader sheet />,
  'building-rainwater': <RainwaterCalculation mode="building" hideTabBar />,
  'section': <StructuralTools defaultTab="section" hideTabBar />,
  'portal': <StructuralTools defaultTab="portal" hideTabBar />,
  'force-flow': <ForceFlowTool />,
  'beam': <StructuralTools defaultTab="beam" hideTabBar />,
  'nvalue': <StructuralTools defaultTab="nvalue" hideTabBar />,
  'formulas': <StructuralTools defaultTab="formulas" hideTabBar />,
  'unit-weight-calc': <UnitVolumeCalculation defaultTab="calculator" hideTabBar />,
  'density-list': <UnitVolumeCalculation defaultTab="reference" hideTabBar />,
  'load-calc': <LoadCalc />,
  'vent-24h': <VentilationCalculation defaultTab="sickhouse" hideTabBar sheet />,
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
  'slope-calc': <SlopeCalc />,
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
    <div className="p-0 bg-white">
      {/* lg 以上：モック「高級感 3」の頭。案件の切替 + 1 行の見出し(計算書型のツールは自分で出す) */}
      {!SHEET_TOOLS.has(activeSubTab) && (
        <div className="hidden lg:block">
          <ModeBar />
          <SheetHead
            no={TOOL_NO[activeSubTab] ?? ''}
            en={`tool · ${currentCategory.label}`}
            title={currentSubTab?.title ?? ''}
            desc={currentSubTab?.description}
          />
        </div>
      )}
      {/* lg 未満:左カラム(hidden lg:block)が無いので、ここが唯一のナビ。
          1 行の見出し + 分野とツールの下線タブ + いま開いているツールの説明 */}
      <div className="lg:hidden">
        <div className="yy-pagehead">
          <div className="yy-pagehead__row">
            <span className="yy-label">{`${TOOL_NO[activeSubTab] ?? ''} — tool · ${currentCategory.label}`}</span>
            <h2 className="yy-pagehead__title">設計ツール</h2>
            <span className="yy-pagehead__desc">β版です。ご意見をぜひお聞かせください。</span>
          </div>
          <div className="yy-rule2" />
        </div>
        <div className="yy-tabs yy-dt-mtabs" aria-label="分野">
          {categories.map((cat) => (
            <button key={cat.id} type="button" className="yy-tab" aria-pressed={activeCategory === cat.id} onClick={() => handleCategoryChange(cat.id)}>
              {cat.label}
            </button>
          ))}
        </div>
        <div className="yy-tabs yy-dt-mtabs" aria-label="ツール">
          {currentCategory.subTabs.map((sub) => (
            <button key={sub.id} type="button" className="yy-tab" aria-pressed={activeSubTab === sub.id} onClick={() => setActiveSubTab(sub.id)}>
              {sub.label}
            </button>
          ))}
        </div>
        <p className="yy-dt-mdesc">
          <b>{currentSubTab?.title}</b>
          {currentSubTab?.description && <span>{currentSubTab.description}</span>}
        </p>
      </div>

      {/* コンテンツ。計算書型・構造フロー以外は .yy-dt で共通の組版(dt-premium.css)をかぶせる */}
      <div className={OWN_STYLE_TOOLS.has(activeSubTab) ? 'w-full' : 'w-full yy-dt'}>
        {currentSubTab ? currentSubTab.component : (
          <div className="yy-dt-soon">
            <span className="yy-label">select — ツール</span>
            <p className="yy-dt-soon__text">左の一覧から使うツールを選んでください</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DesignTools;
