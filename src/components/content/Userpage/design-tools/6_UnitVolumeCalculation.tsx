'use client';

import React, { useState, useEffect } from 'react';

interface UnitVolumeCalculationProps {
  defaultTab?: 'calculator' | 'reference';
  hideTabBar?: boolean;
}

const UnitVolumeCalculation: React.FC<UnitVolumeCalculationProps> = ({ defaultTab, hideTabBar }) => {
  const [activeTab, setActiveTab] = useState<'calculator' | 'reference'>(defaultTab ?? 'calculator');
  useEffect(() => { if (defaultTab) setActiveTab(defaultTab); }, [defaultTab]);

  // 単位体積重量計算のstate
  const [materialType, setMaterialType] = useState<string>('concrete');
  const [materialWidth, setMaterialWidth] = useState<string>('');
  const [materialDepth, setMaterialDepth] = useState<string>('');
  const [materialHeight, setMaterialHeight] = useState<string>('');
  const [weightResult, setWeightResult] = useState<{
    weightKg: number;
    weightTon: number;
    volume: number;
    area: number; // 面積も追加
    unitWeight: number;
  } | null>(null);

  // 材料密度データ（実務向けに拡充・出典目安: 建築工事共通仕様書など）
  const materials = {
    // 構造材・躯体
    reinforced_concrete: { name: '鉄筋コンクリート (RC)', density: 2.45, category: '躯体・構造' }, // 一般的に2.4〜2.5
    concrete: { name: '無筋コンクリート', density: 2.35, category: '躯体・構造' },
    mortar: { name: 'モルタル', density: 2.0, category: '躯体・構造' },
    steel: { name: '鋼材 (鉄)', density: 7.85, category: '躯体・構造' },
    aluminum: { name: 'アルミニウム', density: 2.7, category: '躯体・構造' },
    stainless: { name: 'ステンレス鋼 (SUS)', density: 7.93, category: '躯体・構造' },

    // 石材・タイル・窯業系
    granite: { name: '御影石 (花崗岩)', density: 2.6, category: '石材・窯業' },
    marble: { name: '大理石', density: 2.7, category: '石材・窯業' },
    andesite: { name: '安山岩 (鉄平石等)', density: 2.45, category: '石材・窯業' },
    brick: { name: 'レンガ (赤レンガ)', density: 1.9, category: '石材・窯業' },
    tile: { name: '磁器質タイル', density: 2.4, category: '石材・窯業' },
    glass: { name: '板ガラス', density: 2.5, category: '石材・窯業' },
    gypsum_board: { name: '石膏ボード', density: 0.85, category: '石材・窯業' }, // 強化で0.8-1.0程度
    alc: { name: 'ALC (軽量気泡コンクリート)', density: 0.6, category: '石材・窯業' }, // 0.5-0.65

    // 土木・造成資材（追加）
    soil_sand: { name: '砂 (乾燥)', density: 1.8, category: '土木・造成' }, // 湿潤時は2.0程度
    gravel: { name: '砂利・砕石', density: 1.9, category: '土木・造成' },
    soil_clay: { name: '粘土・ローム', density: 1.6, category: '土木・造成' }, // 自然状態
    asphalt: { name: 'アスファルト混合物', density: 2.35, category: '土木・造成' },

    // 木材（気乾比重）
    wood_cedar: { name: '杉材 (スギ)', density: 0.38, category: '木材' },
    wood_cypress: { name: '檜材 (ヒノキ)', density: 0.44, category: '木材' },
    wood_pine: { name: '松材 (アカマツ)', density: 0.52, category: '木材' },
    wood_oak: { name: 'ナラ・カシ類 (堅木)', density: 0.85, category: '木材' }, // 0.8-0.9
    plywood: { name: '合板', density: 0.65, category: '木材' },

    // その他
    water: { name: '水', density: 1.0, category: 'その他' },
    ice: { name: '氷', density: 0.92, category: 'その他' },
  };

  // 単位体積重量計算
  const calculateMaterialWeight = () => {
    const width = parseFloat(materialWidth);
    const depth = parseFloat(materialDepth);
    const height = parseFloat(materialHeight);

    if (isNaN(width) || isNaN(depth) || isNaN(height) || width <= 0 || depth <= 0 || height <= 0) {
      alert('有効な寸法を入力してください。');
      return;
    }

    const material = materials[materialType as keyof typeof materials];
    
    // mm³ から m³ に変換
    const volume = (width * depth * height) / 1000000000;
    
    // 面積 (幅 x 奥行) m²
    const area = (width * depth) / 1000000;

    // 重量計算 (t = m³ * t/m³)
    const weightTon = volume * material.density;
    const weightKg = weightTon * 1000;

    setWeightResult({
      weightKg,
      weightTon,
      volume,
      area,
      unitWeight: material.density
    });
  };

  // カテゴリごとにグループ化して表示するためのヘルパー
  const groupedMaterials = Object.entries(materials).reduce((acc, [key, value]) => {
    if (!acc[value.category]) {
      acc[value.category] = [];
    }
    acc[value.category].push({ key, ...value });
    return acc;
  }, {} as Record<string, { key: string; name: string; density: number; category: string }[]>);

  return (
    <div className="bg-white rounded-b-lg shadow-sm border-b border-gray-100">
      {/* Header & Tabs */}
      {!hideTabBar && (
      <div className="border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div className="p-4 pb-0">
          <div>
            <h3 className="text-[13px] font-medium">単位体積重量計算ツール</h3>
            <p className="text-[11px] mt-0.5 opacity-80">建材・土木資材の寸法から重量を算出します</p>
          </div>
          <div className="mt-3">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('calculator')}
                className={`px-4 py-2 text-xs rounded-t-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'calculator'
                    ? 'bg-white text-gray-800 font-bold'
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                }`}
              >
                重量計算
              </button>
              <button
                onClick={() => setActiveTab('reference')}
                className={`px-4 py-2 text-xs rounded-t-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'reference'
                    ? 'bg-white text-gray-800 font-bold'
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                }`}
              >
                参考データ一覧
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      <div className="p-4 text-[12px] text-gray-700">
        {/* === TAB 1: 計算機能 === */}
        {activeTab === 'calculator' && (
          <div className="animate-fadeIn grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 入力フォーム */}
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">材料を選択</label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  className="w-full text-[12px] border border-gray-300 rounded px-2 py-1.5 bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  {Object.keys(groupedMaterials).map((category) => (
                    <optgroup key={category} label={category}>
                      {groupedMaterials[category].map((mat) => (
                        <option key={mat.key} value={mat.key}>
                          {mat.name} ({mat.density} t/m³)
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <p className="text-[11px] font-bold text-gray-700 mb-2">寸法入力 (単位: mm)</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">幅 (W)</label>
                    <input
                      type="number"
                      value={materialWidth}
                      onChange={(e) => setMaterialWidth(e.target.value)}
                      className="w-full text-[12px] border border-gray-300 rounded px-2 py-1 text-right focus:border-blue-500 outline-none"
                      placeholder="例: 1000"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">奥行 (D)</label>
                    <input
                      type="number"
                      value={materialDepth}
                      onChange={(e) => setMaterialDepth(e.target.value)}
                      className="w-full text-[12px] border border-gray-300 rounded px-2 py-1 text-right focus:border-blue-500 outline-none"
                      placeholder="例: 1000"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">高さ/厚さ (H)</label>
                    <input
                      type="number"
                      value={materialHeight}
                      onChange={(e) => setMaterialHeight(e.target.value)}
                      className="w-full text-[12px] border border-gray-300 rounded px-2 py-1 text-right focus:border-blue-500 outline-none"
                      placeholder="例: 150"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={calculateMaterialWeight}
                className="w-full bg-blue-600 text-white px-4 py-2.5 rounded text-[12px] font-bold hover:bg-blue-700 transition shadow-sm"
              >
                計算実行
              </button>
            </div>

            {/* 計算結果表示 */}
            <div className="space-y-4">
              {weightResult ? (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 animate-fadeIn">
                  <h4 className="text-[12px] font-bold text-blue-800 mb-3 border-b border-blue-200 pb-1">計算結果</h4>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center bg-white p-2 rounded shadow-sm border border-blue-50">
                      <p className="text-[10px] text-gray-500">総重量 (kg)</p>
                      <p className="text-xl font-bold text-blue-700">
                        {weightResult.weightKg.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        <span className="text-xs ml-1 font-normal text-gray-500">kg</span>
                      </p>
                    </div>
                    <div className="text-center bg-white p-2 rounded shadow-sm border border-blue-50">
                      <p className="text-[10px] text-gray-500">総重量 (t)</p>
                      <p className="text-xl font-bold text-gray-800">
                        {weightResult.weightTon.toFixed(3)}
                        <span className="text-xs ml-1 font-normal text-gray-500">t</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="bg-white/60 p-1.5 rounded">
                      <p className="text-gray-500 text-[9px]">体積</p>
                      <p className="font-medium">{weightResult.volume.toFixed(4)} m³</p>
                    </div>
                    <div className="bg-white/60 p-1.5 rounded">
                      <p className="text-gray-500 text-[9px]">面積 (WxD)</p>
                      <p className="font-medium">{weightResult.area.toFixed(2)} m²</p>
                    </div>
                    <div className="bg-white/60 p-1.5 rounded">
                      <p className="text-gray-500 text-[9px]">単位重量</p>
                      <p className="font-medium">{weightResult.unitWeight} t/m³</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-400 text-[11px] min-h-[180px]">
                  <div className="text-center">
                    <p>左側のフォームに入力して</p>
                    <p>計算ボタンを押してください</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === TAB 2: 参考データ一覧 === */}
        {activeTab === 'reference' && (
          <div className="animate-fadeIn">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-[12px] font-bold text-gray-700">📚 単位体積重量 参考データ一覧</h4>
              <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-600">単位: t/m³</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.keys(groupedMaterials).map((category) => (
                <div key={category} className="bg-gray-50 p-2.5 rounded border border-gray-200">
                  <h5 className="text-[10px] font-bold text-blue-800 mb-2 border-b border-gray-200 pb-1">{category}</h5>
                  <ul className="space-y-1.5">
                    {groupedMaterials[category].map((mat) => (
                      <li key={mat.key} className="flex justify-between items-baseline text-[10px]">
                        <span className="text-gray-700 truncate mr-2">{mat.name.split(' ')[0]}</span>
                        <span className="font-mono font-bold text-gray-900 bg-white px-1.5 py-0.5 rounded border border-gray-100">{mat.density}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-[10px] text-yellow-800 leading-relaxed">
              <strong>※注意:</strong> 本ツールの数値は一般的な目安（気乾比重など）です。含水率、配合、産地により実際の重量は変動します。<br/>
              構造計算や積載制限の確認には、必ずミルシートや公的資料の数値を参照してください。
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnitVolumeCalculation;
