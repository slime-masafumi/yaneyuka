'use client';

import React, { useState, useEffect } from 'react';
import { 
  solveDiameter, 
  snapToStandard, 
  calculateFrictionLoss, 
  calculateRectSize, 
  checkCondensation,
  estimateOutletSize
} from '@/utils/ductCalc';

interface DuctMeasureProps {
  defaultTab?: 'duct' | 'insulation' | 'outlet';
  hideTabBar?: boolean;
}

const DuctMeasure: React.FC<DuctMeasureProps> = ({ defaultTab, hideTabBar }) => {
  const [activeTab, setActiveTab] = useState<'duct' | 'insulation' | 'outlet'>(defaultTab ?? 'duct');
  useEffect(() => { if (defaultTab) setActiveTab(defaultTab); }, [defaultTab]);

  // --- 共通・ダクト計算 State ---
  const [airflow, setAirflow] = useState<number>(1000);
  const [targetLoss, setTargetLoss] = useState<number>(1.0);
  const [ductTemp, setDuctTemp] = useState<number>(15); // ダクト内温度
  
  // ダクト計算結果
  const [ductResult, setDuctResult] = useState<any>(null);

  // --- 保温計算 State ---
  const [roomTemp, setRoomTemp] = useState<number>(30); // 天井裏温度
  const [roomRh, setRoomRh] = useState<number>(70);     // 天井裏湿度
  const [insulationThick, setInsulationThick] = useState<number>(25); // 保温厚み
  const [insulationRes, setInsulationRes] = useState<any>(null);

  // --- 吹出口計算 State ---
  const [targetNC, setTargetNC] = useState<number>(35); // 目標NC値
  const [outletRes, setOutletRes] = useState<any>(null);

  // 一括計算
  useEffect(() => {
    // 1. ダクト計算
    try {
      const exactD = solveDiameter(airflow, targetLoss, ductTemp);
      const stdD = snapToStandard(exactD);
      const perf = calculateFrictionLoss(stdD, airflow, ductTemp);
      const rects = calculateRectSize(stdD);
      
      setDuctResult({
        exactD, stdD, 
        velocity: perf.velocity,
        realLoss: perf.loss,
        rects
      });
    } catch (error) {
      console.error('ダクト計算エラー:', error);
    }

    // 2. 保温計算
    try {
      const insCalc = checkCondensation(ductTemp, roomTemp, roomRh, insulationThick);
      setInsulationRes(insCalc);
    } catch (error) {
      console.error('保温計算エラー:', error);
    }

    // 3. 吹出口計算
    try {
      const outCalc = estimateOutletSize(airflow, targetNC);
      setOutletRes(outCalc);
    } catch (error) {
      console.error('吹出口計算エラー:', error);
    }

  }, [airflow, targetLoss, ductTemp, roomTemp, roomRh, insulationThick, targetNC]);

  return (
    <div className="bg-white rounded-b-lg shadow-sm border-b border-gray-100">
      {/* Header & Tabs (StructuralToolsスタイルに統一) */}
      {!hideTabBar && (
      <div className="border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div className="p-4 pb-0">
          <div>
            <h3 className="text-[13px] font-medium">ダクトメジャー</h3>
            <p className="text-[11px] mt-0.5 opacity-80">ダクト選定・結露判定・吹出口選定の統合ツール</p>
          </div>
          <div className="mt-3">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('duct')}
                className={`px-4 py-2 text-xs rounded-t-lg transition-colors ${
                  activeTab === 'duct'
                    ? 'bg-white text-gray-800 font-bold'
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                }`}
              >
                ダクト選定
              </button>
              <button
                onClick={() => setActiveTab('insulation')}
                className={`px-4 py-2 text-xs rounded-t-lg transition-colors ${
                  activeTab === 'insulation'
                    ? 'bg-white text-gray-800 font-bold'
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                }`}
              >
                結露・保温
              </button>
              <button
                onClick={() => setActiveTab('outlet')}
                className={`px-4 py-2 text-xs rounded-t-lg transition-colors ${
                  activeTab === 'outlet'
                    ? 'bg-white text-gray-800 font-bold'
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                }`}
              >
                吹出口・NC
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      <div className="p-4">
          
          {/* === TAB 1: ダクト選定 === */}
          {activeTab === 'duct' && ductResult && (
            <div className="animate-fadeIn grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* 入力フォーム */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <p className="text-[11px] font-bold text-gray-700 mb-2">設計条件入力</p>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">風量 (m³/h)</label>
                      <input 
                        type="number" 
                        value={airflow} 
                        onChange={e=>setAirflow(Number(e.target.value))} 
                        className="w-full text-[12px] border border-gray-300 rounded px-2 py-1.5 text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">基準損失 (Pa/m)</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          value={targetLoss} 
                          onChange={e=>setTargetLoss(Number(e.target.value))} 
                          className="w-full text-[12px] border border-gray-300 rounded px-2 py-1.5 text-right focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">ダクト内温度 (℃)</label>
                        <input 
                          type="number" 
                          value={ductTemp} 
                          onChange={e=>setDuctTemp(Number(e.target.value))} 
                          className="w-full text-[12px] border border-gray-300 rounded px-2 py-1.5 text-right focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 計算結果 */}
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <h4 className="text-[12px] font-bold text-blue-800 mb-3 border-b border-blue-200 pb-1">推奨サイズ</h4>
                  
                  <div className="flex items-center justify-between mb-4 bg-white p-3 rounded shadow-sm border border-blue-100">
                    <div>
                      <p className="text-[10px] text-gray-500">丸ダクト径</p>
                      <p className="text-2xl font-bold text-blue-600">Φ{ductResult.stdD}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-500">理論径</p>
                      <p className="text-[12px] font-mono text-gray-700">{ductResult.exactD.toFixed(1)} mm</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-[11px] mb-4">
                    <div className="bg-white/60 p-1.5 rounded">
                      <p className="text-gray-500 text-[9px]">実風速</p>
                      <p className="font-medium">{ductResult.velocity.toFixed(2)} m/s</p>
                    </div>
                    <div className="bg-white/60 p-1.5 rounded">
                      <p className="text-gray-500 text-[9px]">実摩擦損失</p>
                      <p className="font-medium">{ductResult.realLoss.toFixed(2)} Pa/m</p>
                    </div>
                  </div>

                  <h5 className="text-[10px] font-bold text-blue-800 mb-2">角ダクト換算候補</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {ductResult.rects.slice(0,4).map((r: any, i: number) => (
                      <div key={i} className="bg-white border border-blue-100 p-1.5 rounded flex justify-between items-center text-[11px]">
                        <span className="font-bold text-gray-700">{r.h} x {r.w}</span>
                        <span className="text-[9px] text-gray-400">{(r.w/r.h).toFixed(2)}:1</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* === TAB 2: 保温・結露判定 === */}
          {activeTab === 'insulation' && insulationRes && (
            <div className="animate-fadeIn grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <p className="text-[11px] font-bold text-gray-700 mb-2">環境条件入力</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">周囲温度 (℃)</label>
                      <input 
                        type="number" 
                        value={roomTemp} 
                        onChange={e=>setRoomTemp(Number(e.target.value))} 
                        className="w-full text-[12px] border border-gray-300 rounded px-2 py-1.5 text-right focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">相対湿度 (%)</label>
                      <input 
                        type="number" 
                        value={roomRh} 
                        onChange={e=>setRoomRh(Number(e.target.value))} 
                        className="w-full text-[12px] border border-gray-300 rounded px-2 py-1.5 text-right focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">ダクト内温度 (℃)</label>
                      <input 
                        type="number" 
                        value={ductTemp} 
                        onChange={e=>setDuctTemp(Number(e.target.value))} 
                        className="w-full text-[12px] border border-gray-300 rounded px-2 py-1.5 text-right focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">保温材厚み</label>
                      <select 
                        value={insulationThick} 
                        onChange={e=>setInsulationThick(Number(e.target.value))} 
                        className="w-full text-[12px] border border-gray-300 rounded px-2 py-1.5 bg-white focus:border-blue-500 outline-none"
                      >
                        <option value="20">20mm</option>
                        <option value="25">25mm (一般)</option>
                        <option value="40">40mm</option>
                        <option value="50">50mm (高断熱)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className={`rounded-lg p-4 border ${
                  insulationRes.isSafe ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <h4 className={`text-[12px] font-bold mb-3 border-b pb-1 ${
                    insulationRes.isSafe ? 'text-green-800 border-green-200' : 'text-red-800 border-red-200'
                  }`}>判定結果</h4>
                  
                  <div className="text-center bg-white/60 p-4 rounded mb-4">
                    {insulationRes.isSafe ? (
                      <p className="text-2xl font-bold text-green-600">結露なし (OK)</p>
                    ) : (
                      <p className="text-2xl font-bold text-red-600">結露注意 (NG)</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                    <div className="bg-white/60 p-1.5 rounded">
                      <p className="text-gray-500 text-[9px]">露点温度</p>
                      <p className="font-medium">{insulationRes.dewPoint.toFixed(1)}℃</p>
                    </div>
                    <div className="bg-white/60 p-1.5 rounded">
                      <p className="text-gray-500 text-[9px]">表面温度</p>
                      <p className={`font-bold ${insulationRes.isSafe ? 'text-green-700' : 'text-red-700'}`}>
                        {insulationRes.surfaceTemp.toFixed(1)}℃
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* === TAB 3: 吹出口・NC値 === */}
          {activeTab === 'outlet' && outletRes && (
            <div className="animate-fadeIn grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="space-y-4">
                 <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <p className="text-[11px] font-bold text-gray-700 mb-2">条件入力</p>
                  <div className="mb-3">
                    <label className="block text-[10px] text-gray-500 mb-1">吹出風量 (m³/h /個)</label>
                    <input 
                      type="number" 
                      value={airflow} 
                      onChange={e=>setAirflow(Number(e.target.value))} 
                      className="w-full text-[12px] border border-gray-300 rounded px-2 py-1.5 text-right focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] text-gray-500">目標NC値</label>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 rounded">NC-{targetNC}</span>
                    </div>
                    <input 
                      type="range" 
                      min="20" 
                      max="50" 
                      step="5" 
                      value={targetNC} 
                      onChange={e => setTargetNC(Number(e.target.value))}
                      className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                      <span>NC-20 (静穏)</span>
                      <span>NC-50 (騒)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                   <h4 className="text-[12px] font-bold text-blue-800 mb-3 border-b border-blue-200 pb-1">推奨アネモスタット</h4>
                   <div className="text-center bg-white p-4 rounded shadow-sm border border-blue-100 mb-3">
                      <div className="flex justify-center items-end gap-2">
                        <span className="text-3xl font-bold text-gray-800">#{outletRes.neckDia / 50}</span>
                        <span className="text-[12px] text-gray-500 mb-1.5">型</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">(ネック径 φ{outletRes.neckDia})</p>
                   </div>
                   
                   <div className="bg-white/60 p-2 rounded text-center">
                     <p className="text-[10px] text-gray-500">想定ネック風速</p>
                     <p className="text-[12px] font-bold text-blue-700">{outletRes.velocity.toFixed(2)} m/s</p>
                   </div>

                   <div className="mt-3 p-2 bg-yellow-50 border border-yellow-100 rounded text-[10px] text-yellow-800 leading-tight">
                    <strong>設計メモ:</strong> NC-{targetNC} を満たす推奨サイズです。ネック風速 {targetNC <= 30 ? '3.0' : '4.5'}m/s 以下を目安としています。
                   </div>
                </div>
              </div>

            </div>
          )}

      </div>
    </div>
  );
};

export default DuctMeasure;
