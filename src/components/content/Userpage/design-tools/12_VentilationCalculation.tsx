'use client';

import React, { useState, useEffect } from 'react';
import { FiCopy, FiInfo } from 'react-icons/fi';
import VentSheet from './VentSheet';

// --- アイコンコンポーネント ---
const InfoIcon = () => <FiInfo className="h-4 w-4 text-gray-400 inline" />;
const CopyIcon = () => <FiCopy className="h-4 w-4" />;

// --- 定数定義 ---
const TATAMI_UNIT = 1.6562; // 中京間
const TSUBO_UNIT = 3.30578; // 1坪
const DEFAULT_CEILING = 2.4;

type TabMode = 'sickhouse' | 'fire' | 'occupancy';

interface VentilationCalculationProps {
  defaultTab?: TabMode;
  hideTabBar?: boolean;
  /** true = 計算書の組版(モック「高級感 3」Q8)で出す。24 時間換気だけ */
  sheet?: boolean;
}

const VentilationCalculation: React.FC<VentilationCalculationProps> = ({ defaultTab, hideTabBar, sheet }) => {
  // --- 状態管理 ---
  const [activeTab, setActiveTab] = useState<TabMode>(defaultTab ?? 'sickhouse');
  useEffect(() => { if (defaultTab) setActiveTab(defaultTab); }, [defaultTab]);

  // 共通・24時間換気用
  const [areaM2, setAreaM2] = useState<number | ''>(''); 
  const [areaTatami, setAreaTatami] = useState<number | ''>('');
  const [areaTsubo, setAreaTsubo] = useState<number | ''>(''); // 追加: 坪
  const [height, setHeight] = useState<number | ''>(DEFAULT_CEILING);
  const [ach, setAch] = useState<number>(0.5); // 換気回数 (0.5回/h)

  // 火気使用室用
  // 昭和45年建設省告示第1826号: V = N × K × Q
  //   N: 排気設備の種類による定数
  //   K: 燃料の単位燃焼量あたりの理論廃ガス量
  //   Q: 燃料消費量（発熱量）
  // ★修正前は V = N × Q と K を掛け忘れており、かつ N（40/30）を「K値」と表示していた。
  //   さらに換気フードⅠ型とⅡ型を区別せず両方 30 にしていた（Ⅱ型は 20）。
  const EXHAUST_TYPES = [
    { n: 40, label: 'フードなし', note: '排気口・排気筒（換気扇等）' },
    { n: 30, label: '換気フードⅠ型', note: '一般的なレンジフード' },
    { n: 20, label: '換気フードⅡ型', note: '整流板付など捕集効率の高いもの' },
    { n: 2, label: '煙突', note: '密閉式・煙突排気' },
  ] as const;

  const FUEL_TYPES = [
    { k: 0.93, label: '都市ガス13A', unit: 'kW', note: 'K=0.93 ㎥/kWh' },
    { k: 0.93, label: 'LPガス（プロパン）', unit: 'kW', note: 'K=0.93 ㎥/kWh' },
    { k: 12.1, label: '灯油', unit: 'kg/h', note: 'K=12.1 ㎥/kg' },
  ] as const;

  const [gasKw, setGasKw] = useState<number | ''>('');
  const [hoodType, setHoodType] = useState<number>(30); // 定数 N
  const [fuelIndex, setFuelIndex] = useState<number>(0); // 燃料種別（K値）

  // 居室（人数）用
  const [people, setPeople] = useState<number | ''>('');
  const [perPersonAir, setPerPersonAir] = useState<number>(30);

  // 計算結果
  const [resultVal, setResultVal] = useState<number>(0);
  const [reqInletArea, setReqInletArea] = useState<number>(0); // 追加: 必要給気口有効開口面積
  const [subResult, setSubResult] = useState<string>('');
  const [copyFeedback, setCopyFeedback] = useState<string>('');

  // --- 計算ロジック ---
  useEffect(() => {
    let res = 0;
    let sub = '';
    let inlet = 0;

    if (activeTab === 'sickhouse') {
      // 24時間換気計算
      const m2 = Number(areaM2) || 0;
      const h = Number(height) || 0;
      const vol = m2 * h;
      res = vol * ach;
      
      // 給気口計算: 必要換気量(m3/h) × 2.0 (cm2) 
      // ※一般的な防音フード等の圧損考慮目安（安全側係数2.0）
      inlet = res * 2.0;

      sub = `室気積: ${vol.toFixed(1)}㎥ (換気回数${ach}回/h)`;
    } 
    else if (activeTab === 'fire') {
      // 火気使用室計算（告示1826号）V = N × K × Q
      const q = Number(gasKw) || 0;
      const fuel = FUEL_TYPES[fuelIndex] ?? FUEL_TYPES[0];
      res = hoodType * fuel.k * q;
      const typeLabel = EXHAUST_TYPES.find(t => t.n === hoodType)?.label ?? '';
      sub = `V = N×K×Q = ${hoodType} × ${fuel.k} × ${q}（${typeLabel} / ${fuel.label}）`;
    }
    else if (activeTab === 'occupancy') {
      // 居室計算
      const p = Number(people) || 0;
      res = p * perPersonAir;
      sub = `基準: ${perPersonAir} ㎥/h/人`;
    }

    setResultVal(parseFloat(res.toFixed(1)));
    setReqInletArea(parseFloat(inlet.toFixed(1)));
    setSubResult(sub);

  }, [activeTab, areaM2, height, ach, gasKw, hoodType, fuelIndex, people, perPersonAir]);



  // --- ハンドラー (単位変換: m2 / 畳 / 坪 すべて同期) ---
  const handleM2Change = (val: string) => {
    if (val === '') { resetArea(); return; }
    const n = parseFloat(val);
    setAreaM2(n);
    setAreaTatami(parseFloat((n / TATAMI_UNIT).toFixed(2)));
    setAreaTsubo(parseFloat((n / TSUBO_UNIT).toFixed(2)));
  };

  const handleTatamiChange = (val: string) => {
    if (val === '') { resetArea(); return; }
    const n = parseFloat(val);
    setAreaTatami(n);
    const m2 = n * TATAMI_UNIT;
    setAreaM2(parseFloat(m2.toFixed(2)));
    setAreaTsubo(parseFloat((m2 / TSUBO_UNIT).toFixed(2)));
  };

  const handleTsuboChange = (val: string) => {
    if (val === '') { resetArea(); return; }
    const n = parseFloat(val);
    setAreaTsubo(n);
    const m2 = n * TSUBO_UNIT;
    setAreaM2(parseFloat(m2.toFixed(2)));
    setAreaTatami(parseFloat((m2 / TATAMI_UNIT).toFixed(2)));
  };

  const resetArea = () => {
    setAreaM2(''); setAreaTatami(''); setAreaTsubo('');
  };

  // --- コピー機能 ---
  const copyResult = () => {
    if (resultVal === 0) return;
    let text = `【換気計算結果】\n`;
    

    if (activeTab === 'sickhouse') {
      text += `■24時間換気\n床面積: ${areaM2}㎡ (${areaTatami}帖 / ${areaTsubo}坪)\n天井高: ${height}m\n----------------\n必要換気量: ${resultVal} ㎥/h\n推奨給気口面積: 約${reqInletArea}c㎡`;
    } else if (activeTab === 'fire') {
      const hoodName = EXHAUST_TYPES.find(t => t.n === hoodType)?.label ?? '';
      const fuel = FUEL_TYPES[fuelIndex] ?? FUEL_TYPES[0];
      text += `■火気使用室(キッチン)  V = N×K×Q（告示1826号）\n燃料: ${fuel.label} (K=${fuel.k})\n燃料消費量 Q: ${gasKw}${fuel.unit}\n排気設備: ${hoodName} (N=${hoodType})\n----------------\n必要換気量: ${resultVal} ㎥/h`;
    } else {
      text += `■居室人数計算\n収容人数: ${people}人\n設定基準: ${perPersonAir}㎥/h/人\n----------------\n必要換気量: ${resultVal} ㎥/h`;
    }

    
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback('コピー完了');
      setTimeout(() => setCopyFeedback(''), 2000);
    });
  };

  // 計算書の組版(24 時間換気だけ)。計算は上の useEffect のまま、並べ方だけ VentSheet に任せる
  if (sheet && activeTab === 'sickhouse') {
    return (
      <VentSheet
        areaM2={areaM2}
        areaTsubo={areaTsubo}
        height={height}
        ach={ach}
        onM2={handleM2Change}
        onTsubo={handleTsuboChange}
        onHeight={setHeight}
        onAch={setAch}
        resultVal={resultVal}
        reqInletArea={reqInletArea}
        onCopy={copyResult}
        copied={!!copyFeedback}
      />
    );
  }

  return (
    <div className="bg-white rounded-b-lg shadow-sm border-b border-gray-100">
      {/* Header & Tabs (StructuralTools, AirconSelectionと統一) */}
      {!hideTabBar && (
      <div className="border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div className="p-4 pb-0">
          <div>
            <h3 className="text-[13px] font-medium">換気計算</h3>
            <p className="text-[11px] mt-0.5 opacity-80">24時間換気・火気使用室・居室の必要換気量を計算</p>
          </div>
          <div className="mt-3">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('sickhouse')}
                className={`px-4 py-2 text-xs rounded-t-lg transition-colors ${
                  activeTab === 'sickhouse'
                    ? 'bg-white text-gray-800 font-bold'
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                }`}
              >
                24時間換気
              </button>
              <button
                onClick={() => setActiveTab('fire')}
                className={`px-4 py-2 text-xs rounded-t-lg transition-colors ${
                  activeTab === 'fire'
                    ? 'bg-white text-gray-800 font-bold'
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                }`}
              >
                火気(キッチン)
              </button>
              <button
                onClick={() => setActiveTab('occupancy')}
                className={`px-4 py-2 text-xs rounded-t-lg transition-colors ${
                  activeTab === 'occupancy'
                    ? 'bg-white text-gray-800 font-bold'
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                }`}
              >
                居室(人数)
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      <div className="bg-white overflow-hidden p-4 text-[12px] text-gray-700 space-y-4 animate-fadeIn">
        
        
        {/* --- モード A: 24時間換気 --- */}
        {activeTab === 'sickhouse' && (
          <div className="space-y-4">
             {/* 面積入力 3カラム (m2 / 帖 / 坪) */}
             <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">床面積(㎡)</label>
                <input 
                  type="number" 
                  value={areaM2} 
                  onChange={(e)=>handleM2Change(e.target.value)} 
                  className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-right font-mono text-[12px]" 
                  placeholder="0" 
                  step="0.01" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">畳数(帖)</label>
                <input 
                  type="number" 
                  value={areaTatami} 
                  onChange={(e)=>handleTatamiChange(e.target.value)} 
                  className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-right font-mono text-[12px] bg-blue-50/50" 
                  placeholder="0" 
                  step="0.1" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">坪数(坪)</label>
                <input 
                  type="number" 
                  value={areaTsubo} 
                  onChange={(e)=>handleTsuboChange(e.target.value)} 
                  className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-right font-mono text-[12px] bg-gray-50" 
                  placeholder="0" 
                  step="0.01" 
                />
              </div>
            </div>

            {/* 天井高さ */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                天井高さ (CH) <span className="text-gray-400 font-normal">標準:2.4m</span>
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="range" 
                  min="2.0" 
                  max="6.0" 
                  step="0.1" 
                  value={typeof height === 'number' ? height : 2.4} 
                  onChange={(e) => setHeight(parseFloat(e.target.value))} 
                  className="flex-1 h-2 bg-gray-200 rounded-lg cursor-pointer accent-blue-600" 
                />
                <input 
                  type="number" 
                  value={height} 
                  onChange={(e) => setHeight(parseFloat(e.target.value))} 
                  className="w-16 px-2 py-1.5 border border-gray-300 rounded text-right font-mono text-[12px]" 
                  step="0.1" 
                />
                <span className="text-[11px] text-gray-500 whitespace-nowrap">m</span>
              </div>
            </div>
          </div>
        )}

        {/* --- モード B: 火気使用室 --- */}
        {activeTab === 'fire' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">燃料種別（理論廃ガス量 K）</label>
              <div className="grid grid-cols-3 gap-2">
                {FUEL_TYPES.map((f, i) => (
                  <button
                    key={f.label}
                    onClick={() => setFuelIndex(i)}
                    className={`py-2 px-1 text-[11px] rounded border transition-colors ${fuelIndex === i ? 'bg-red-50 border-red-500 text-red-700 font-bold' : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-300'}`}
                  >
                    {f.label}<br/><span className="text-[9px] font-normal">{f.note}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                燃料消費量 Q ({FUEL_TYPES[fuelIndex]?.unit ?? 'kW'})
              </label>
              <input
                type="number"
                value={gasKw}
                onChange={(e) => setGasKw(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-red-500 outline-none text-right font-mono text-[12px]"
                placeholder="例: 10.5"
                step="0.1"
              />
              <p className="text-[10px] text-gray-400 mt-1">※3口コンロで約9~10kW程度</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">排気設備の種類（定数 N）</label>
              <div className="grid grid-cols-2 gap-2">
                {EXHAUST_TYPES.map(t => (
                  <button
                    key={t.n}
                    onClick={() => setHoodType(t.n)}
                    className={`py-2 px-2 text-[12px] rounded border transition-colors ${hoodType === t.n ? 'bg-red-50 border-red-500 text-red-700 font-bold' : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-300'}`}
                  >
                    {t.label}<br/><span className="text-[10px] font-normal">N={t.n}／{t.note}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- モード C: 居室（人数） --- */}
        {activeTab === 'occupancy' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">室内の人数 (人)</label>
              <input 
                type="number" 
                value={people} 
                onChange={(e) => setPeople(e.target.value === '' ? '' : parseInt(e.target.value))} 
                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 outline-none text-right font-mono text-[12px]" 
                placeholder="0" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">1人あたりの必要換気量</label>
              <select 
                value={perPersonAir} 
                onChange={(e) => setPerPersonAir(Number(e.target.value))} 
                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 outline-none bg-white text-[12px]"
              >
                <option value={20}>20 ㎥/h (建築基準法 事務所等)</option>
                <option value={25}>25 ㎥/h (ゆとり設定)</option>
                <option value={30}>30 ㎥/h (推奨・成人男性静座)</option>
              </select>
            </div>
          </div>
        )}

        <hr className="my-4 border-gray-100" />

        {/* 結果表示エリア */}
        <div className={`rounded-lg p-4 relative transition-colors border ${activeTab === 'sickhouse' ? 'bg-blue-50 border-blue-100' : activeTab === 'fire' ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
          
          <button 
            onClick={copyResult} 
            disabled={resultVal === 0} 
            className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 text-[10px] rounded transition-all ${resultVal === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-100 border border-gray-200'} ${activeTab === 'sickhouse' ? 'text-blue-600' : activeTab === 'fire' ? 'text-red-600' : 'text-green-600'}`}
          >
            {copyFeedback ? <span className="text-green-600 font-bold">OK!</span> : <><CopyIcon /> コピー</>}
          </button>

          <div className="space-y-3">
            <div className="flex justify-between items-end border-b pb-3 border-gray-200/50">
               <div>
                  <p className="text-[10px] font-bold text-gray-500 mb-1 flex items-center gap-1">
                    必要換気量 <InfoIcon />
                  </p>
                  <p className={`text-3xl font-bold font-mono tracking-tight leading-none ${activeTab === 'sickhouse' ? 'text-blue-700' : activeTab === 'fire' ? 'text-red-700' : 'text-green-700'}`}>
                    {resultVal}<span className="text-base ml-1">㎥/h</span>
                  </p>
               </div>
               <div className="text-right">
                  <p className="text-[10px] text-gray-500 mb-1">計算根拠</p>
                  <p className="text-[11px] font-mono text-gray-700">{subResult || '-'}</p>
               </div>
            </div>

            {/* 給気口の目安表示 (24時間換気のみ表示) */}
            {activeTab === 'sickhouse' && (
              <div className="bg-white/70 rounded p-2 text-[11px] border border-blue-200 shadow-sm">
                <p className="text-[10px] font-bold text-gray-600 mb-1">推奨給気口 (有効開口面積)</p>
                <div className="flex items-center justify-between">
                   <span className="font-mono text-base font-bold text-gray-700">
                     {reqInletArea} <span className="text-[10px] font-normal">c㎡</span>
                   </span>
                   <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                     100φ(約35c㎡) × <strong>{Math.ceil(reqInletArea / 35)}</strong> 個
                   </span>
                </div>
                {/*
                  「必要換気量 × 2.0」は法令や特定の規格に基づく式ではなく社内の目安。
                  実際の必要開口面積は給気口の有効開口率と設計圧力差で決まるため、
                  根拠がない値であることを明示しておく。
                */}
                <p className="mt-1 text-[9px] text-gray-500 leading-snug">
                  ※「必要換気量×2.0」による概算です。法令・規格に基づく値ではありません。実際は給気口の有効開口率と設計圧力差からメーカー資料で確認してください。
                </p>
              </div>
            )}

            <div className="text-[10px] text-gray-600 space-y-1">
               <p className="font-bold">■ 換気扇選定目安:</p>
               <ul className="list-disc list-inside ml-2 space-y-0.5">
                 <li>100φパイプファン(約50㎥/h): <strong>{Math.ceil(resultVal / 50)}</strong> 台</li>
                 <li>150φシロッコ(約300㎥/h): <strong>{(resultVal / 300).toFixed(1)}</strong> 台分</li>
               </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VentilationCalculation;
