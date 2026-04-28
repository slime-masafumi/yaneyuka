'use client';

import React, { useState, useEffect } from 'react';
import { FiCopy, FiInfo } from 'react-icons/fi';

// --- アイコン (タブからは削除しましたが、結果表示などで使用するため残しています) ---
const CopyIcon = () => <FiCopy className="h-4 w-4" />;

const BoltIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
  </svg>
);

const InfoIcon = () => <FiInfo className="h-4 w-4 text-gray-400 inline" />;

// --- 定数定義 ---
const TATAMI_UNIT = 1.6562; 
const TSUBO_UNIT = 3.30578;
const HP_TO_KW = 2.8; // 1馬力 ≒ 2.8kW

// 業務用負荷目安 (W/m2)
const COMM_LOADS = {
  office:     { label: '一般事務所・オフィス', unitLoad: 160, note: 'OA機器・人員・照明負荷を含む標準値' },
  shop_retail:{ label: '物販店舗・商業施設',   unitLoad: 210, note: '外気侵入、照明熱、来店客数を考慮' },
  restaurant: { label: '飲食店 (ホール)',      unitLoad: 350, note: '厨房からの熱移動、調理熱、高密度人員' },
  school:     { label: '学校・教室・塾',       unitLoad: 180, note: '在室密度高、換気負荷大' },
  hospital:   { label: '病院・福祉施設',       unitLoad: 150, note: '外気導入量多、安全率含む' },
  factory:    { label: '工場・作業場',         unitLoad: 250, note: '※機械発熱がある場合は別途加算が必要' },
  server:     { label: 'サーバー室・機械室',   unitLoad: 450, note: 'OAフロア等。高顕熱負荷' },
};

// 住宅用エアコンスペック
const AC_SPECS_HOME = [
  { kw: 2.2, label: '6畳用',  minWood: 6,  minRC: 9,  volt: '100V' },
  { kw: 2.5, label: '8畳用',  minWood: 8,  minRC: 10, volt: '100V' },
  { kw: 2.8, label: '10畳用', minWood: 10, minRC: 12, volt: '100V' },
  { kw: 3.6, label: '12畳用', minWood: 12, minRC: 16, volt: '100V' },
  { kw: 4.0, label: '14畳用', minWood: 14, minRC: 17, volt: '200V' }, 
  { kw: 5.6, label: '18畳用', minWood: 18, minRC: 23, volt: '200V' },
  { kw: 6.3, label: '20畳用', minWood: 20, minRC: 26, volt: '200V' },
  { kw: 7.1, label: '23畳用', minWood: 23, minRC: 29, volt: '200V' },
  { kw: 8.0, label: '26畳用', minWood: 26, minRC: 33, volt: '200V' },
  { kw: 9.0, label: '29畳用', minWood: 29, minRC: 38, volt: '200V' },
];

type Mode = 'home' | 'business';
type StructureType = 'wood' | 'rc'; // シンプルに2択に戻しました
type CommKey = keyof typeof COMM_LOADS;

interface AirconSelectionProps {
  defaultTab?: Mode;
  hideTabBar?: boolean;
}

const AirconSelection: React.FC<AirconSelectionProps> = ({ defaultTab, hideTabBar }) => {
  // モード管理
  const [mode, setMode] = useState<Mode>(defaultTab ?? 'home');
  useEffect(() => { if (defaultTab) setMode(defaultTab); }, [defaultTab]);

  // 共通入力
  const [areaM2, setAreaM2] = useState<number | ''>(''); 
  const [areaTatami, setAreaTatami] = useState<number | ''>('');
  const [areaTsubo, setAreaTsubo] = useState<number | ''>('');
  
  // 住宅用ステート
  const [structure, setStructure] = useState<StructureType>('wood');
  const [orientation, setOrientation] = useState<'normal' | 'south'>('normal'); 
  const [isKitchen, setIsKitchen] = useState<boolean>(false);
  
  // 業務用ステート
  const [commType, setCommType] = useState<CommKey>('office');

  // 結果ステート
  const [homeResult, setHomeResult] = useState<typeof AC_SPECS_HOME[0] | null>(null);
  const [bizResult, setBizResult] = useState<{kw: number, hp: number, note: string} | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string>('');

  // --- 計算ロジック ---
  useEffect(() => {
    if (!areaM2) {
      setHomeResult(null);
      setBizResult(null);
      return;
    }
    const m2 = Number(areaM2);

    if (mode === 'home') {
      // 住宅計算ロジック
      const tatami = Number(areaTatami);
      let reqIndex = tatami;
      if (orientation === 'south') reqIndex *= 1.15;
      if (isKitchen) reqIndex += 2;

      // 構造判定: 木造(wood)の場合は鉄骨も含めて minWood を使用
      const found = AC_SPECS_HOME.find(spec => {
        const cap = structure === 'rc' ? spec.minRC : spec.minWood;
        return cap >= reqIndex;
      });
      setHomeResult(found || AC_SPECS_HOME[AC_SPECS_HOME.length - 1]);
    } else {
      // 業務用計算ロジック
      const loadUnit = COMM_LOADS[commType].unitLoad;
      const totalLoadW = m2 * loadUnit; // W
      const totalLoadKw = totalLoadW / 1000; // kW
      
      const hp = totalLoadKw / HP_TO_KW; // 馬力
      
      setBizResult({
        kw: parseFloat(totalLoadKw.toFixed(1)),
        hp: parseFloat(hp.toFixed(1)),
        note: COMM_LOADS[commType].note
      });
    }
  }, [mode, areaM2, areaTatami, structure, orientation, isKitchen, commType]);

  // --- 単位変換 ---
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

  // --- コピー ---
  const copyResult = () => {
    if (mode === 'home' && !homeResult) return;
    if (mode === 'business' && !bizResult) return;

    let text = `【空調負荷計算書】\n`;
    text += `面積: ${areaM2}㎡ (${areaTsubo}坪)\n`;

    if (mode === 'home' && homeResult) {
      const structText = structure === 'rc' ? 'RC造(マンション)' : '木造・鉄骨造';
      text += `用途: 住宅用 (${structText})\n`;
      text += `推奨能力: ${homeResult.label} (${homeResult.kw}kW)\n`;
      text += `電源: ${homeResult.volt}`;
    } else if (mode === 'business' && bizResult) {
      text += `用途: ${COMM_LOADS[commType].label}\n`;
      text += `負荷原単位: ${COMM_LOADS[commType].unitLoad} W/㎡\n`;
      text += `----------------\n`;
      text += `必要能力: ${bizResult.kw} kW\n`;
      text += `相当馬力: 約 ${Math.ceil(bizResult.hp * 2) / 2} 馬力`; 
    }

    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback('コピー完了');
      setTimeout(() => setCopyFeedback(''), 2000);
    });
  };

  return (
    <div className="bg-white rounded-b-lg shadow-sm border-b border-gray-100">
      {/* Header & Tabs */}
      {!hideTabBar && (
      <div className="border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div className="p-4 pb-0">
          <div>
            <h3 className="text-[13px] font-medium">空調選定計算</h3>
            <p className="text-[11px] mt-0.5 opacity-80">住宅・業務用エアコンの必要能力を計算</p>
          </div>
          <div className="mt-3">
            <div className="flex gap-1">
              <button
                onClick={() => setMode('home')}
                className={`px-4 py-2 text-xs rounded-t-lg transition-colors ${
                  mode === 'home'
                    ? 'bg-white text-gray-800 font-bold'
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                }`}
              >
                住宅・ルーム
              </button>
              <button
                onClick={() => setMode('business')}
                className={`px-4 py-2 text-xs rounded-t-lg transition-colors ${
                  mode === 'business'
                    ? 'bg-white text-gray-800 font-bold'
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                }`}
              >
                業務用・店舗
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      <div className="bg-white overflow-hidden p-4 text-[12px] text-gray-700 space-y-4 animate-fadeIn">
        
        {/* 1. 面積入力 (共通) */}
        <div>
           <label className="block text-xs font-bold text-gray-500 mb-1">対象エリアの広さ</label>
           <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">床面積(㎡)</label>
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
              <label className="block text-[10px] text-gray-500 mb-1">畳数(帖)</label>
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
              <label className="block text-[10px] text-gray-500 mb-1">坪数(坪)</label>
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
        </div>

        <hr className="my-4 border-gray-100" />

        {/* 2. モード別入力 */}
        {mode === 'home' ? (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">建物の構造</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => setStructure('wood')} 
                  className={`flex-1 py-2 px-2 rounded border text-xs transition-colors ${structure === 'wood' ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                >
                  木造・鉄骨<br/><span className="text-[9px] font-normal opacity-90">(戸建・アパート・S造)</span>
                </button>
                <button 
                  onClick={() => setStructure('rc')} 
                  className={`flex-1 py-2 px-2 rounded border text-xs transition-colors ${structure === 'rc' ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                >
                  RC造<br/><span className="text-[9px] font-normal opacity-90">(マンション等)</span>
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={orientation === 'south'} 
                  onChange={(e) => setOrientation(e.target.checked ? 'south' : 'normal')} 
                  className="w-3.5 h-3.5 accent-blue-600" 
                /> 
                <span className="text-xs text-gray-700 group-hover:text-blue-700 transition-colors">南向き・最上階</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={isKitchen} 
                  onChange={(e) => setIsKitchen(e.target.checked)} 
                  className="w-3.5 h-3.5 accent-red-500" 
                /> 
                <span className="text-xs text-gray-700 group-hover:text-red-600 transition-colors">キッチン</span>
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">施設の用途 (Unit Load設定)</label>
              <select 
                value={commType} 
                onChange={(e) => setCommType(e.target.value as CommKey)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded bg-white focus:ring-1 focus:ring-blue-500 outline-none text-[12px]"
              >
                {Object.entries(COMM_LOADS).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
              <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-[10px] text-gray-600">
                <span className="font-bold block mb-0.5 text-gray-800">設定基準: {COMM_LOADS[commType].unitLoad} W/㎡</span>
                {COMM_LOADS[commType].note}
              </div>
            </div>
          </div>
        )}

        <hr className="my-4 border-gray-100" />

        {/* 3. 結果表示 */}
        <div className={`rounded-lg p-4 relative border transition-colors ${mode === 'home' ? 'bg-blue-50 border-blue-100' : 'bg-indigo-50 border-indigo-100'}`}>
           <button 
             onClick={copyResult} 
             disabled={(!homeResult && mode === 'home') || (!bizResult && mode === 'business')}
             className={`absolute top-3 right-3 flex items-center gap-1 px-2 py-1 text-[10px] rounded transition-all border ${(!homeResult && mode === 'home') || (!bizResult && mode === 'business') ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-600 shadow-sm'}`}
           >
             {copyFeedback ? <span className="text-green-600 font-bold">OK!</span> : <><CopyIcon /> コピー</>}
           </button>

           <div className="grid grid-cols-1 gap-4">
             <div className="flex justify-between items-end border-b pb-3 border-gray-200/50">
               <div>
                 <p className="text-[10px] font-bold text-gray-500 mb-1 flex items-center gap-1">
                   推奨能力 <InfoIcon />
                 </p>
                 {mode === 'home' && homeResult && (
                   <p className="text-2xl font-bold font-mono tracking-tight leading-none text-blue-700">
                     {homeResult.label} <span className="text-base ml-1 text-blue-600">({homeResult.kw}kW)</span>
                   </p>
                 )}
                 {mode === 'business' && bizResult && (
                   <p className="text-2xl font-bold font-mono tracking-tight leading-none text-indigo-700">
                     {bizResult.kw} <span className="text-base ml-1 text-indigo-600">kW</span>
                   </p>
                 )}
               </div>
               <div className="text-right pr-16 sm:pr-0">
                 {mode === 'home' && homeResult && (
                   <div>
                     <p className="text-[10px] text-gray-500 mb-0.5">電源目安</p>
                     <p className="text-[11px] font-bold font-mono text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">{homeResult.volt}</p>
                   </div>
                 )}
                 {mode === 'business' && bizResult && (
                   <div>
                     <p className="text-[10px] text-gray-500 mb-0.5">相当馬力</p>
                     <p className="text-[11px] font-bold font-mono text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">約 {bizResult.hp.toFixed(1)} 馬力</p>
                   </div>
                 )}
               </div>
             </div>

             {mode === 'home' && homeResult && (
               <div className="bg-white/80 rounded p-2.5 text-[11px] border border-blue-100 shadow-sm">
                 <p className="text-[10px] font-bold text-blue-800 mb-1.5 flex items-center gap-1"><BoltIcon /> 電源確認</p>
                 <div className="text-gray-700 pl-1">
                   コンセント電圧目安: <strong>{homeResult.volt}</strong>
                   {homeResult.volt.includes('200V') && <span className="text-red-500 font-bold ml-1 text-[10px]">※200V工事必要</span>}
                 </div>
                 <p className="text-[9px] text-gray-400 mt-2 pl-1">※構造: {structure==='rc'?'RC造':'木造・鉄骨造'}として選定</p>
               </div>
             )}

             {mode === 'business' && bizResult && (
               <div className="bg-white/80 rounded p-2.5 text-[11px] border border-indigo-100 shadow-sm">
                 <p className="text-[10px] font-bold text-indigo-800 mb-1.5">機器選定の目安</p>
                 <ul className="list-disc list-inside ml-1 space-y-1 text-gray-700">
                   {bizResult.hp <= 3 && <li>3馬力シングル (パッケージエアコン)</li>}
                   {bizResult.hp > 3 && bizResult.hp <= 6 && <li>{Math.ceil(bizResult.hp)}馬力シングル または ツイン</li>}
                   {bizResult.hp > 6 && bizResult.hp <= 10 && <li>5馬力 × 2台 (ツイン/個別) 推奨</li>}
                   {bizResult.hp > 10 && <li>10馬力クラス複数台 または ビル用マルチ検討</li>}
                 </ul>
               </div>
             )}

             {(!areaM2) && (
               <div className="h-20 flex items-center justify-center text-gray-400 text-[11px]">
                 面積を入力してください
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default AirconSelection;
