'use client';

import React, { useState, useMemo, useEffect } from 'react';

interface RainwaterCalculationProps {
  defaultTab?: 'eaves' | 'roof' | 'pipe';
  hideTabBar?: boolean;
  mode?: 'building' | 'exterior';
}

const RainwaterCalculation: React.FC<RainwaterCalculationProps> = ({ defaultTab, hideTabBar, mode }) => {
  const [activeTab, setActiveTab] = useState<'eaves' | 'roof' | 'pipe'>(defaultTab ?? (mode === 'exterior' ? 'pipe' : 'eaves'));
  useEffect(() => { if (defaultTab) setActiveTab(defaultTab); }, [defaultTab]);

  // --- 共通設定 ---
  const [rainfallIntensity, setRainfallIntensity] = useState<string>('120'); // mm/h

  // --- 軒樋・陸屋根用のState ---
  const [eavesRoofArea, setEavesRoofArea] = useState<string>('');
  const [downspoutSize, setDownspoutSize] = useState<string>('60'); 
  const [downspoutCount, setDownspoutCount] = useState<string>('1');
  const [drainRoofArea, setDrainRoofArea] = useState<string>('');
  const [drainType, setDrainType] = useState<'vertical' | 'horizontal'>('vertical');
  const [drainSize, setDrainSize] = useState<string>('100');
  const [drainCount, setDrainCount] = useState<string>('1');

  // --- 雨水管渠（配管）計算用のState ---
  const [pipeArea, setPipeArea] = useState<string>(''); // 負担面積
  const [runoffCoefficient, setRunoffCoefficient] = useState<string>('0.9'); // 流出係数
  const [pipeType, setPipeType] = useState<string>('vp'); // 管種
  const [pipeDiameter, setPipeDiameter] = useState<string>('100'); // 管径 mm
  const [pipeGradient, setPipeGradient] = useState<string>('100'); // 勾配 1/N (入力はN)

  // 定数データ
  const DOWNSPOUT_CAPACITIES: Record<string, number> = { '60': 90, '75': 200, '100': 600, '125': 1000, '150': 1600 };
  const DRAIN_CAPACITIES = {
    vertical: { 50: 80, 65: 150, 75: 250, 100: 600, 125: 1000, 150: 1600 },
    horizontal: { 50: 40, 65: 70, 75: 120, 100: 300, 125: 500, 150: 800 }
  };

  // 粗度係数 n (マニング公式用)
  const ROUGHNESS_COEFFICIENT: Record<string, { n: number, label: string }> = {
    'vp': { n: 0.010, label: '硬質塩化ビニル管 (VP/VU)' },
    'concrete': { n: 0.013, label: 'コンクリートヒューム管' },
    'cast_iron': { n: 0.012, label: '鋳鉄管' },
    'steel': { n: 0.012, label: '鋼管' }
  };

  // 標準管径リスト (mm)
  const PIPE_DIAMETERS = [50, 65, 75, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600];

  // --- 勾配のパーセント換算 ---
  const gradientPercent = useMemo(() => {
    const n = parseFloat(pipeGradient);
    if (!n || n === 0) return 0;
    return (1 / n) * 100;
  }, [pipeGradient]);

  // --- 計算ロジック: 軒樋システム ---
  const eavesSystemResult = useMemo(() => {
    const area = parseFloat(eavesRoofArea);
    const intensity = parseFloat(rainfallIntensity);
    const dsCount = parseInt(downspoutCount);
    if (!area || !intensity || !dsCount) return null;
    
    const totalRainFlow = (area * intensity) / 60;
    const capacityPerDownspout = DOWNSPOUT_CAPACITIES[downspoutSize] || 0;
    const totalDrainCapacity = capacityPerDownspout * dsCount;
    const isDrainageSafe = totalDrainCapacity >= totalRainFlow;
    const drainageUsageRate = (totalRainFlow / totalDrainCapacity) * 100;
    const requiredSectionArea = (totalRainFlow / dsCount) * 0.6;

    return { totalRainFlow, totalDrainCapacity, isDrainageSafe, drainageUsageRate, requiredSectionArea };
  }, [eavesRoofArea, rainfallIntensity, downspoutSize, downspoutCount]);

  // --- 計算ロジック: 陸屋根ルーフドレン ---
  const roofDrainResult = useMemo(() => {
    const area = parseFloat(drainRoofArea);
    const intensity = parseFloat(rainfallIntensity);
    const count = parseInt(drainCount);
    const size = parseInt(drainSize);
    if (!area || !intensity || !count || !size) return null;

    const totalFlow = (area * intensity) / 60;
    const capacityPerDrain = (DRAIN_CAPACITIES as any)[drainType][size] || 0;
    const totalCapacity = capacityPerDrain * count;
    const isSafe = totalCapacity >= totalFlow;
    const usageRate = (totalFlow / totalCapacity) * 100;

    return { totalFlow, totalCapacity, isSafe, usageRate };
  }, [drainRoofArea, rainfallIntensity, drainType, drainSize, drainCount]);

  // --- 計算ロジック: 雨水管渠 (マニング公式) ---
  const pipeCalcResult = useMemo(() => {
    const area = parseFloat(pipeArea);
    const C = parseFloat(runoffCoefficient);
    const I = parseFloat(rainfallIntensity);
    const D_mm = parseFloat(pipeDiameter);
    const N = parseFloat(pipeGradient); // 勾配 1/N
    const n = ROUGHNESS_COEFFICIENT[pipeType]?.n;

    if (!area || !C || !I || !D_mm || !N || !n) return null;

    // 1. 流入雨水量 Q_in (L/min) = (C * I * A) / 60
    const flowIn_L_min = (C * I * area) / 60;

    // 2. 管の流下能力 Q_cap (m3/s) - マニング公式 (満管流)
    // V = (1/n) * R^(2/3) * i^(1/2)
    const D_m = D_mm / 1000;
    const A_m2 = (Math.PI * Math.pow(D_m, 2)) / 4;
    const R_m = D_m / 4; // 満管時径深
    const i = 1 / N;

    const Velocity_m_s = (1 / n) * Math.pow(R_m, 2/3) * Math.pow(i, 1/2);
    const Capacity_m3_s = A_m2 * Velocity_m_s;
    const Capacity_L_min = Capacity_m3_s * 60000;

    // 判定
    const isSafe = Capacity_L_min >= flowIn_L_min;
    const usageRate = (flowIn_L_min / Capacity_L_min) * 100;

    return {
      flowIn_L_min,
      Capacity_L_min,
      Velocity_m_s,
      isSafe,
      usageRate
    };
  }, [pipeArea, runoffCoefficient, rainfallIntensity, pipeType, pipeDiameter, pipeGradient]);

  return (
    <div className="w-full bg-white rounded-b-lg shadow-sm border-b border-gray-100">
      {/* Header & Tabs (他ツールと完全統一) */}
      {!hideTabBar && (
      <div className="border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div className="p-4 pb-0">
          <div>
            <h3 className="text-[13px] font-medium">雨水排水計算</h3>
            <p className="text-[11px] mt-0.5 opacity-80">降雨強度に基づく軒樋・竪樋・配管の設計検証</p>
          </div>
          <div className="mt-3">
            <div className="flex gap-1">
              {mode !== 'exterior' && (
              <button
                onClick={() => setActiveTab('eaves')}
                className={`px-4 py-2 text-xs rounded-t-lg transition-colors ${
                  activeTab === 'eaves'
                    ? 'bg-white text-gray-800 font-bold'
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                }`}
              >
                勾配屋根 (軒樋)
              </button>
              )}
              {mode !== 'exterior' && (
              <button
                onClick={() => setActiveTab('roof')}
                className={`px-4 py-2 text-xs rounded-t-lg transition-colors ${
                  activeTab === 'roof'
                    ? 'bg-white text-gray-800 font-bold'
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                }`}
              >
                陸屋根 (ドレン)
              </button>
              )}
              {mode !== 'building' && (
              <button
                onClick={() => setActiveTab('pipe')}
                className={`px-4 py-2 text-xs rounded-t-lg transition-colors ${
                  activeTab === 'pipe'
                    ? 'bg-white text-gray-800 font-bold'
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                }`}
              >
                雨水管渠 (配管)
              </button>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
      
      <div className="p-4 text-[12px] text-gray-700">
        {/* 共通設定 (降雨強度) */}
        <div className="mb-6 bg-gray-50 p-3 rounded border border-gray-200 flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">降雨強度 (mm/h)</label>
            <select
              value={rainfallIntensity}
              onChange={(e) => setRainfallIntensity(e.target.value)}
              className="text-[12px] border rounded px-2 py-1.5 bg-white w-32 focus:border-blue-500 outline-none"
            >
              <option value="100">100 (一般)</option>
              <option value="120">120 (標準)</option>
              <option value="160">160 (豪雨)</option>
              <option value="180">180 (特殊)</option>
            </select>
          </div>
          <div className="text-[10px] text-gray-500 pt-3">
            ※地域や設計条件に合わせて選択
          </div>
        </div>

        {/* === 軒樋システム計算 === */}
        {activeTab === 'eaves' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">屋根水平投影面積 (m²)</label>
                <input 
                  type="number" 
                  value={eavesRoofArea} 
                  onChange={(e) => setEavesRoofArea(e.target.value)} 
                  className="w-full text-[12px] border rounded px-2 py-1.5 focus:border-blue-500 outline-none" 
                  placeholder="例: 60" 
                />
              </div>
              <div className="bg-blue-50 p-2 rounded border border-blue-100">
                <label className="block text-[11px] font-bold text-blue-800 mb-1">竪樋(たてどい)の設定</label>
                <div className="flex gap-2 items-center">
                  <select value={downspoutSize} onChange={(e) => setDownspoutSize(e.target.value)} className="flex-1 text-[12px] border rounded px-2 py-1.5">
                    <option value="60">φ60</option><option value="75">φ75</option><option value="100">φ100</option><option value="125">φ125</option><option value="150">φ150</option>
                  </select>
                  <span className="text-[11px]">x</span>
                  <input type="number" value={downspoutCount} onChange={(e) => setDownspoutCount(e.target.value)} min="1" className="w-14 text-[12px] border rounded px-2 py-1.5 text-center" />
                  <span className="text-[11px]">本</span>
                </div>
              </div>
            </div>
            {eavesSystemResult && (
              <div className="border rounded-lg p-4 bg-white shadow-sm mt-2">
                <h4 className="text-[12px] font-bold mb-3 border-b pb-1 text-gray-700">判定結果</h4>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-bold text-gray-600">竪樋の排水能力</span>
                    <span className={`text-[12px] font-bold ${eavesSystemResult.isDrainageSafe ? 'text-green-600' : 'text-red-600'}`}>{eavesSystemResult.isDrainageSafe ? 'OK' : '能力不足'}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>発生雨量: {eavesSystemResult.totalRainFlow.toFixed(1)} L/min</span>
                    <span>排水能力: {eavesSystemResult.totalDrainCapacity} L/min</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className={`h-full rounded-full transition-all ${eavesSystemResult.isDrainageSafe ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(eavesSystemResult.drainageUsageRate, 100)}%` }} />
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <span className="text-[11px] font-bold text-gray-600 block mb-1">軒樋の必要有効断面積</span>
                  <div className="flex items-end gap-2"><span className="text-xl font-bold text-blue-700">{Math.ceil(eavesSystemResult.requiredSectionArea)}</span><span className="text-[12px] text-gray-600 mb-1">cm² 以上</span></div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    ※竪樋1本あたりへの負荷から算出しています。<br/>
                    ※各メーカーカタログの「有効断面積」と比較して選定してください。
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === 陸屋根ルーフドレン計算 === */}
        {activeTab === 'roof' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">負担面積 (m²)</label>
                <input 
                  type="number" 
                  value={drainRoofArea} 
                  onChange={(e) => setDrainRoofArea(e.target.value)} 
                  className="w-full text-[12px] border rounded px-2 py-1.5 focus:border-blue-500 outline-none" 
                  placeholder="例: 100" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">ドレン形状</label>
                <select value={drainType} onChange={(e) => setDrainType(e.target.value as any)} className="w-full text-[12px] border rounded px-2 py-1.5">
                  <option value="vertical">縦引き</option><option value="horizontal">横引き</option>
                </select>
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <p className="text-[11px] font-bold text-gray-700 mb-2">設計条件</p>
              <div className="flex gap-2 items-center">
                <select value={drainSize} onChange={(e) => setDrainSize(e.target.value)} className="w-full text-[12px] border rounded px-2 py-1.5">
                  <option value="50">φ50</option><option value="65">φ65</option><option value="75">φ75</option><option value="100">φ100</option><option value="125">φ125</option><option value="150">φ150</option>
                </select>
                <span className="text-[11px]">x</span>
                <input type="number" value={drainCount} onChange={(e) => setDrainCount(e.target.value)} min="1" className="w-16 text-[12px] border rounded px-2 py-1.5 text-center" />
                <span className="text-[11px]">本</span>
              </div>
            </div>
            {roofDrainResult && (
              <div className={`border rounded-lg p-4 mt-2 ${roofDrainResult.isSafe ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <h4 className={`text-[12px] font-bold mb-2 border-b pb-1 ${roofDrainResult.isSafe ? 'text-green-800 border-green-300' : 'text-red-800 border-red-300'}`}>
                  判定: {roofDrainResult.isSafe ? 'OK' : '能力不足'}
                </h4>
                <div className="flex justify-between text-[10px] mb-1">
                  <span>負荷率 ({roofDrainResult.totalFlow.toFixed(0)} / {roofDrainResult.totalCapacity} L)</span>
                  <span className="font-bold">{roofDrainResult.usageRate.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`h-full rounded-full transition-all ${roofDrainResult.isSafe ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(roofDrainResult.usageRate, 100)}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* === 雨水管渠（配管）計算 === */}
        {activeTab === 'pipe' && (
          <div className="space-y-4 animate-fadeIn">
            {/* 入力: 負担面積・流出係数 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">負担面積 (m²)</label>
                <input
                  type="number"
                  value={pipeArea}
                  onChange={(e) => setPipeArea(e.target.value)}
                  className="w-full text-[12px] border rounded px-2 py-1.5 focus:border-blue-500 outline-none"
                  placeholder="例: 200"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">流出係数 (C)</label>
                <select
                  value={runoffCoefficient}
                  onChange={(e) => setRunoffCoefficient(e.target.value)}
                  className="w-full text-[12px] border rounded px-2 py-1.5"
                >
                  <option value="0.95">0.95 (屋根・舗装)</option>
                  <option value="0.9">0.90 (屋根・一般的)</option>
                  <option value="0.6">0.60 (砂利敷き)</option>
                  <option value="0.3">0.30 (畑・緑地)</option>
                </select>
              </div>
            </div>

            {/* 入力: 管設定 */}
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <p className="text-[11px] font-bold text-gray-700 mb-2">配管スペック</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">管種</label>
                  <select
                    value={pipeType}
                    onChange={(e) => setPipeType(e.target.value)}
                    className="w-full text-[12px] border rounded px-2 py-1"
                  >
                    <option value="vp">硬質塩ビ (VP/VU)</option>
                    <option value="concrete">ヒューム管</option>
                    <option value="steel">鋼管</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">管径 (mm)</label>
                  <select
                    value={pipeDiameter}
                    onChange={(e) => setPipeDiameter(e.target.value)}
                    className="w-full text-[12px] border rounded px-2 py-1"
                  >
                    {PIPE_DIAMETERS.map(d => (
                      <option key={d} value={d.toString()}>φ{d}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">勾配 (1 / N)</label>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-gray-600">1 /</span>
                  <input
                    type="number"
                    value={pipeGradient}
                    onChange={(e) => setPipeGradient(e.target.value)}
                    className="w-20 text-[12px] border rounded px-2 py-1 text-center"
                    placeholder="100"
                  />
                  <span className="text-[11px] text-blue-600 font-medium ml-2">
                    (≒ {gradientPercent.toFixed(2)} %)
                  </span>
                </div>
              </div>
            </div>

            {/* 結果表示 */}
            {pipeCalcResult && (
              <div className={`border rounded-lg p-4 mt-2 ${pipeCalcResult.isSafe ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <h4 className={`text-[12px] font-bold mb-3 border-b pb-1 ${pipeCalcResult.isSafe ? 'text-green-800 border-green-300' : 'text-red-800 border-red-300'}`}>
                  判定: {pipeCalcResult.isSafe ? 'OK (余裕あり)' : 'NG (容量不足)'}
                </h4>
                
                <div className="grid grid-cols-2 gap-4 text-[11px] mb-3">
                  <div>
                    <p className="text-gray-500">流入雨水量</p>
                    <p className="font-bold text-lg">{pipeCalcResult.flowIn_L_min.toFixed(1)} <span className="text-xs font-normal">L/min</span></p>
                  </div>
                  <div>
                    <p className="text-gray-500">管の許容流量</p>
                    <p className="font-bold text-lg">{pipeCalcResult.Capacity_L_min.toFixed(1)} <span className="text-xs font-normal">L/min</span></p>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-white/60 p-2 rounded mb-2">
                  <span className="text-[10px] text-gray-600">流速 (V)</span>
                  <span className="text-[12px] font-mono">{pipeCalcResult.Velocity_m_s.toFixed(2)} m/s</span>
                </div>
                <p className="text-[9px] text-gray-400 text-right mb-2">※流速は 0.6 〜 3.0 m/s 程度が推奨範囲です</p>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-full rounded-full transition-all ${pipeCalcResult.isSafe ? 'bg-green-500' : 'bg-red-500'}`} 
                    style={{ width: `${Math.min(pipeCalcResult.usageRate, 100)}%` }}
                  />
                </div>
                <div className="text-right text-[10px] mt-1 text-gray-600">
                  充満率: {pipeCalcResult.usageRate.toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-[10px] text-gray-400">
            ※本ツールはSHASE-S 206やマニング公式を用いた簡易計算です。管渠計算は満管流として算定しています。<br/>
            ※実施設計では、泥溜まりや合流損失等を考慮し、十分な安全率を見込んでください。
          </p>
        </div>
      </div>
    </div>
  );
};

export default RainwaterCalculation;
