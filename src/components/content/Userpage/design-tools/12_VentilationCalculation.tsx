'use client';

import React, { useState, useEffect } from 'react';
import { FiCopy } from 'react-icons/fi';
import VentSheet from './VentSheet';
import { ResultPanel, ResultRow } from '@/components/ui/Sheet';

// --- アイコンコンポーネント ---
const CopyIcon = () => <FiCopy className="h-3.5 w-3.5" />;

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
  // 名称は告示どおり「排気フード」。Ⅰ型・Ⅱ型の別はフードの形状要件(告示)で決まるので、メーカーの適合表示で確かめる。
  // 整流板の有無で決まるわけではない。密閉式燃焼器具だけの室は令20条の3第1項第1号で換気設備が要らない(N=2 は煙突の場合)
  const EXHAUST_TYPES = [
    { n: 40, label: 'フードなし', note: '排気口・フードの無い排気筒に換気扇等' },
    { n: 30, label: '排気フードⅠ型', note: '告示のⅠ型の形状を満たすフード' },
    { n: 20, label: '排気フードⅡ型', note: '告示のⅡ型の形状を満たすフード(適合表示で確認)' },
    { n: 2, label: '煙突', note: '煙突に換気扇等(半密閉式の器具など)' },
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
  // 令20条の2第1号ロ: V = 20Af/N(Af 居室の床面積、N 1 人当たりの占有面積。特殊建築物の居室は 3、その他は 10 が上限)
  const [occArea, setOccArea] = useState<number | ''>('');
  const [occWindow, setOccWindow] = useState<number | ''>(''); // 換気上有効な窓等の面積(特殊建築物の居室以外だけ差し引く)
  const [special, setSpecial] = useState(false);
  const [legalV, setLegalV] = useState<number | null>(null);
  const [practicalV, setPracticalV] = useState<number>(0);

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
      // 居室計算: 実務値(人数 × 1 人当たり)と、法定の必要有効換気量 V = 20Af/N の大きい方
      const p = Number(people) || 0;
      const practical = p * perPersonAir;
      const af0 = Number(occArea) || 0;
      let legal: number | null = null;
      if (af0 > 0 && p > 0) {
        const capN = special ? 3 : 10;
        const N = Math.min(af0 / p, capN);
        const af = special ? af0 : Math.max(0, af0 - 20 * (Number(occWindow) || 0));
        legal = (20 * af) / N;
      }
      res = Math.max(practical, legal ?? 0);
      sub =
        legal === null
          ? `${p} 人 × ${perPersonAir} ㎥/h(床面積を入れると令20条の2の法定値と比べます)`
          : `${legal >= practical ? '法定値 V=20Af/N' : `実務値 ${perPersonAir} ㎥/h/人`} で決まる`;
      setLegalV(legal);
      setPracticalV(practical);
    }

    setResultVal(parseFloat(res.toFixed(1)));
    setReqInletArea(parseFloat(inlet.toFixed(1)));
    setSubResult(sub);

  }, [activeTab, areaM2, height, ach, gasKw, hoodType, fuelIndex, people, perPersonAir, occArea, occWindow, special]);



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
      text += `■居室人数計算\n収容人数: ${people}人\n設定基準: ${perPersonAir}㎥/h/人 → ${practicalV.toFixed(1)} ㎥/h\n`;
      if (legalV !== null) text += `床面積: ${occArea}㎡${special ? '(特殊建築物の居室)' : occWindow ? ` 換気上有効な開口 ${occWindow}㎡` : ''}\n法定 V=20Af/N(令20条の2): ${legalV.toFixed(1)} ㎥/h\n`;
      text += `----------------\n必要換気量: ${resultVal} ㎥/h`;
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

      <div className="bg-white p-4 text-[12px] text-gray-700 animate-fadeIn">
      <div className="yy-dt-split">
      <div className="space-y-4">
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
                  onChange={(e) => setHeight(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-16 px-2 py-1.5 border border-gray-300 rounded text-right font-mono text-[12px]"
                  step="0.1"
                />
                <span className="text-[11px] text-gray-500 whitespace-nowrap">m</span>
              </div>
            </div>

            {/* 換気回数(令20条の8: 住宅等の居室 0.5、その他の居室 0.3。0.7 は令20条の7 の表で内装の制限を緩めるとき) */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">換気回数 n(回/h)</label>
              <select
                value={ach}
                onChange={(e) => setAch(Number(e.target.value))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded bg-white text-[12px]"
              >
                <option value={0.5}>0.5 — 住宅等の居室(住宅・共同住宅・寄宿舎など)</option>
                <option value={0.3}>0.3 — 住宅等以外の居室(事務所・店舗・学校など)</option>
                <option value={0.7}>0.7 — 令20条の7 の表で「0.7 回/h 以上」として内装の建材面積を出す場合</option>
              </select>
              <p className="text-[10px] text-gray-400 mt-1">※ 令20条の8 の必要有効換気量 Vr = n × A × h。1 台の換気設備が複数の居室を受け持つときは各室の合計以上(同条第1号イ(2))。廊下など居室と一体で換気する部分の扱いは告示・審査機関の運用で確認してください。</p>
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
                    className={`yy-dt-opt py-2 px-1 text-[11px]${fuelIndex === i ? ' is-on' : ''}`}
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
              <p className="text-[10px] text-gray-400 mt-1">※ 同じ室にある火を使う器具(密閉式を除く)のガス消費量 kW を銘板・カタログで合計。家庭用 3 口コンロ+グリルで 10kW 前後が多い</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">排気設備の種類（定数 N）</label>
              <div className="grid grid-cols-2 gap-2">
                {EXHAUST_TYPES.map(t => (
                  <button
                    key={t.n}
                    onClick={() => setHoodType(t.n)}
                    className={`yy-dt-opt py-2 px-2 text-[12px]${hoodType === t.n ? ' is-on' : ''}`}
                  >
                    {t.label}<br/><span className="text-[10px] font-normal">N={t.n}／{t.note}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="text-[10px] text-gray-500 leading-relaxed space-y-1">
              <p>※ 換気設備が要らない室(令20条の3第1項): ① 密閉式燃焼器具等だけの室 ② 床面積 100㎡ 以内の住宅・住戸の調理室で、発熱量の合計 12kW 以下、かつ調理室の床面積の 1/10(0.8㎡ 未満なら 0.8㎡)以上の有効開口面積の窓等があるもの ③ 発熱量の合計 6kW 以下で換気上有効な開口部がある室(調理室を除く)。</p>
              <p>※ 給気口は天井高の 1/2 以下(換気扇等・煙突を設けるときは適当な位置)、排気口は天井か天井から 80cm 以内(令20条の3第2項第1号イ)。12kW を超える器具や風呂釜には煙突が要ります(同(5))。</p>
              <p>※ 業務用厨房は火災予防条例のフード・ダクトの基準(排気量・板厚・グリスフィルター)も確認してください。</p>
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
              <label className="block text-xs font-bold text-gray-500 mb-1">1人あたりの必要換気量(実務値)</label>
              <select
                value={perPersonAir}
                onChange={(e) => setPerPersonAir(Number(e.target.value))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 outline-none bg-white text-[12px]"
              >
                <option value={20}>20 ㎥/h(令20条の2 の式の係数と同じ値)</option>
                <option value={25}>25 ㎥/h(設計者が決める中間値)</option>
                <option value={30}>30 ㎥/h(CO₂ 1000ppm 以下を保つ実務の目安)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">居室の床面積 Af(㎡)</label>
                <input
                  type="number"
                  value={occArea}
                  onChange={(e) => setOccArea(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded outline-none text-right font-mono text-[12px]"
                  placeholder="法定値を出すとき"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">換気上有効な窓等(㎡)</label>
                <input
                  type="number"
                  value={occWindow}
                  disabled={special}
                  onChange={(e) => setOccWindow(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded outline-none text-right font-mono text-[12px] disabled:bg-gray-100"
                  placeholder="0"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-[11px]">
              <input type="checkbox" checked={special} onChange={(e) => setSpecial(e.target.checked)} />
              特殊建築物の居室(劇場・映画館・集会場など。法28条3項)
            </label>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              ※ 令20条の2第1号ロ: V = 20 × Af ÷ N。N は 1 人当たりの占有面積(床面積 ÷ 人数)で、特殊建築物の居室は 3㎡、その他は 10㎡ を上限とします。特殊建築物の居室以外は、換気上有効な窓等の面積 × 20 を床面積から差し引きます。
            </p>
          </div>
        )}

      </div>

        {/* 結果表示エリア(深い緑の答え。1 画面に 1 つ) */}
        <aside className="space-y-3">
          <ResultPanel label="必要換気量" value={resultVal} unit="㎥/h" sub={subResult || '-'}>
            {/* 給気口の目安表示 (24時間換気のみ表示) */}
            {activeTab === 'sickhouse' && (
              <>
                <ResultRow k="推奨給気口(有効開口面積)" v={`${reqInletArea} c㎡`} />
                <ResultRow k="100φ(約35c㎡)" v={`× ${Math.ceil(reqInletArea / 35)} 個`} />
              </>
            )}
            {activeTab === 'occupancy' && (
              <>
                <ResultRow k={`実務値(人数 × ${perPersonAir})`} v={`${practicalV.toFixed(1)} ㎥/h`} />
                <ResultRow k="法定 V=20Af/N(令20条の2)" v={legalV === null ? '床面積と人数を入れると出ます' : `${legalV.toFixed(1)} ㎥/h`} />
              </>
            )}
            {activeTab === 'fire' ? (
              <ResultRow k="選ぶ換気扇・レンジフード" v="この風量以上(ダクト・フードの静圧を見込んだ風量で)" />
            ) : (
              <>
                <ResultRow k="100φパイプファン(約50㎥/h)" v={`${Math.ceil(resultVal / 50)} 台`} />
                <ResultRow k="150φシロッコ(約300㎥/h)" v={`${(resultVal / 300).toFixed(1)} 台分`} />
              </>
            )}
          </ResultPanel>
          <button type="button" onClick={copyResult} disabled={resultVal === 0} className="yy-btn">
            <CopyIcon /> {copyFeedback ? 'コピーしました' : '結果をコピー'}
          </button>
          {/*
            「必要換気量 × 2.0」は法令や特定の規格に基づく式ではなく社内の目安。
            実際の必要開口面積は給気口の有効開口率と設計圧力差で決まるため、
            根拠がない値であることを明示しておく。
          */}
          {activeTab === 'sickhouse' && (
            <p className="yy-dt-note">
              ※給気口は「必要換気量×2.0」による概算です。法令・規格に基づく値ではありません。実際は給気口の有効開口率と設計圧力差からメーカー資料で確認してください。
            </p>
          )}
          <p className="yy-dt-note">※換気扇の台数は選定の目安です。換気扇の風量は、ダクト・外部フード・給気口の圧力損失を見込んだ静圧での値(カタログの風量—静圧曲線)で確かめてください。</p>
        </aside>
      </div>
      </div>
    </div>
  );
};

export default VentilationCalculation;
