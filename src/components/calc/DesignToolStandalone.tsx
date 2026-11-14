'use client';
/**
 * 設計ツールを単体ページ(/calc/{id}/)で開くための表。2026-11-15
 * 中身は設計ツール画面(Userpage/DesignTools.tsx の TOOL_COMPONENTS)と同じ部品を、ツールごとに必要なものだけ読み込む。
 * 計算書型(SHEET)と構造フローは自分の組版を持つので .yy-dt をかぶせない。
 */
import React from 'react';
import dynamic from 'next/dynamic';
import '@/components/content/Userpage/design-tools/dt-premium.css';
import { SHEET_IDS } from '@/lib/designToolPages';

const Loading = () => <p className="yy-home__empty">読み込み中…</p>;
const d = (load: () => Promise<{ default: React.ComponentType }>) => dynamic(load, { ssr: false, loading: Loading });

const TOOLS: Record<string, React.ComponentType> = {
  schedule: d(() => import('@/components/content/Userpage/design-tools/4_Schedule').then((m) => ({ default: () => <m.default /> }))),
  'use-zone': d(() => import('@/components/content/Userpage/design-tools/11_UseZone').then((m) => ({ default: () => <m.default hideHeader /> }))),
  'building-regulations': d(() => import('@/components/content/Userpage/design-tools/7_BuildingRegulations').then((m) => ({ default: () => <m.default hideHeader /> }))),
  'fire-equipment': d(() => import('@/components/content/Userpage/design-tools/3_FireEquipment').then((m) => ({ default: () => <m.default hideHeader /> }))),
  'color-palette': d(() => import('@/components/content/Userpage/design-tools/5_ColorProposal').then((m) => ({ default: () => <m.default defaultTab="harmony" hideTabBar /> }))),
  'jpma-search': d(() => import('@/components/content/Userpage/design-tools/5_ColorProposal').then((m) => ({ default: () => <m.default defaultTab="jpma" hideTabBar /> }))),
  'shadow-regulation': d(() => import('@/components/content/Userpage/design-tools/ShadowCalc')),
  'setback-regulation': d(() => import('@/components/content/Userpage/design-tools/SetbackCalc')),
  condensation: d(() => import('@/components/content/Userpage/design-tools/MultiLayerCondensation').then((m) => ({ default: () => <m.default hideHeader sheet /> }))),
  'building-rainwater': d(() => import('@/components/content/Userpage/design-tools/2_RainwaterCalculation').then((m) => ({ default: () => <m.default mode="building" hideTabBar /> }))),
  section: d(() => import('@/components/content/Userpage/design-tools/10_StructuralTools').then((m) => ({ default: () => <m.default defaultTab="section" hideTabBar /> }))),
  portal: d(() => import('@/components/content/Userpage/design-tools/10_StructuralTools').then((m) => ({ default: () => <m.default defaultTab="portal" hideTabBar /> }))),
  beam: d(() => import('@/components/content/Userpage/design-tools/10_StructuralTools').then((m) => ({ default: () => <m.default defaultTab="beam" hideTabBar /> }))),
  nvalue: d(() => import('@/components/content/Userpage/design-tools/10_StructuralTools').then((m) => ({ default: () => <m.default defaultTab="nvalue" hideTabBar /> }))),
  formulas: d(() => import('@/components/content/Userpage/design-tools/10_StructuralTools').then((m) => ({ default: () => <m.default defaultTab="formulas" hideTabBar /> }))),
  'unit-weight-calc': d(() => import('@/components/content/Userpage/design-tools/6_UnitVolumeCalculation').then((m) => ({ default: () => <m.default defaultTab="calculator" hideTabBar /> }))),
  'density-list': d(() => import('@/components/content/Userpage/design-tools/6_UnitVolumeCalculation').then((m) => ({ default: () => <m.default defaultTab="reference" hideTabBar /> }))),
  'load-calc': d(() => import('@/components/content/Userpage/design-tools/LoadCalc')),
  'vent-24h': d(() => import('@/components/content/Userpage/design-tools/12_VentilationCalculation').then((m) => ({ default: () => <m.default defaultTab="sickhouse" hideTabBar sheet /> }))),
  'vent-fire': d(() => import('@/components/content/Userpage/design-tools/12_VentilationCalculation').then((m) => ({ default: () => <m.default defaultTab="fire" hideTabBar /> }))),
  'vent-occupancy': d(() => import('@/components/content/Userpage/design-tools/12_VentilationCalculation').then((m) => ({ default: () => <m.default defaultTab="occupancy" hideTabBar /> }))),
  'aircon-home': d(() => import('@/components/content/Userpage/design-tools/AirconSelection').then((m) => ({ default: () => <m.default defaultTab="home" hideTabBar /> }))),
  'aircon-business': d(() => import('@/components/content/Userpage/design-tools/AirconSelection').then((m) => ({ default: () => <m.default defaultTab="business" hideTabBar /> }))),
  'duct-sizing': d(() => import('@/components/content/Userpage/design-tools/DuctMeasure').then((m) => ({ default: () => <m.default defaultTab="duct" hideTabBar /> }))),
  'duct-insulation': d(() => import('@/components/content/Userpage/design-tools/DuctMeasure').then((m) => ({ default: () => <m.default defaultTab="insulation" hideTabBar /> }))),
  'duct-outlet': d(() => import('@/components/content/Userpage/design-tools/DuctMeasure').then((m) => ({ default: () => <m.default defaultTab="outlet" hideTabBar /> }))),
  plumbing: d(() => import('@/components/content/Userpage/design-tools/PlumbingCalc')),
  illumination: d(() => import('@/components/content/Userpage/design-tools/IlluminationCalc')),
  'elec-capacity': d(() => import('@/components/content/Userpage/design-tools/ElecCapacityCalc')),
  'trunk-size': d(() => import('@/components/content/Userpage/design-tools/TrunkSizeCalc')),
  'plant-selection': d(() => import('@/components/content/Userpage/design-tools/8_PlantSelection').then((m) => ({ default: () => <m.default hideHeader /> }))),
  'exterior-rainwater': d(() => import('@/components/content/Userpage/design-tools/ExteriorRainwater')),
  'slope-calc': d(() => import('@/components/content/Userpage/design-tools/SlopeCalc')),
  pavement: d(() => import('@/components/content/Userpage/design-tools/PavementDesign')),
};


export default function DesignToolStandalone({ id }: { id: string }) {
  const Tool = TOOLS[id];
  if (!Tool) return null;
  return (
    <div className={SHEET_IDS.has(id) ? 'w-full' : 'w-full yy-dt'}>
      <Tool />
    </div>
  );
}
