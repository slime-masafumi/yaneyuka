'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { FiSettings, FiDollarSign, FiCopy, FiCheck, FiCpu, FiRefreshCw } from 'react-icons/fi';

// 単位変換の定義データ
interface UnitCategoryData {
  name: string;
  units: Array<{ unit: string; label: string }>;
  baseUnit: string; 
  conversions: { [key: string]: number };
}

const UNIT_CONVERSIONS: { [key: string]: UnitCategoryData } = {
  length: {
    name: '長さ',
    units: [
      { unit: 'mm', label: 'mm' },
      { unit: 'cm', label: 'cm' },
      { unit: 'm', label: 'm' },
      { unit: 'km', label: 'km' },
      { unit: 'sun', label: '寸' },
      { unit: 'shaku', label: '尺' },
      { unit: 'ken', label: '間' },
      { unit: 'ri', label: '里' },
      { unit: 'in', label: 'in (インチ)' },
      { unit: 'ft', label: 'ft (フィート)' },
    ],
    baseUnit: 'm',
    conversions: {
      mm: 0.001, cm: 0.01, m: 1, km: 1000,
      sun: 0.0303, shaku: 0.303, ken: 1.818, ri: 3927.27,
      in: 0.0254, ft: 0.3048,
    }
  },
  area: {
    name: '面積',
    units: [
      { unit: 'mm²', label: 'mm²' },
      { unit: 'cm²', label: 'cm²' },
      { unit: 'm²', label: 'm²' },
      { unit: 'tsubo', label: '坪' },
      { unit: 'jo', label: '畳(中京間)' },
      { unit: 'ha', label: 'ha (ヘクタール)' },
      { unit: 'acre', label: 'ac (エーカー)' },
    ],
    baseUnit: 'm²',
    conversions: {
      'mm²': 0.000001, 'cm²': 0.0001, 'm²': 1,
      'tsubo': 3.30579, 'jo': 1.6562,
      'ha': 10000, 'acre': 4046.86,
    }
  },
  volume: {
    name: '体積',
    units: [
      { unit: 'ml', label: 'ml' },
      { unit: 'L', label: 'L' },
      { unit: 'm³', label: 'm³ (立米)' },
      { unit: 'cc', label: 'cc' },
      { unit: 'gal', label: 'gal (米ガロン)' },
    ],
    baseUnit: 'L',
    conversions: {
      'ml': 0.001, 'L': 1, 'm³': 1000, 'cc': 0.001,
      'gal': 3.78541,
    }
  },
  weight: {
    name: '重さ',
    units: [
      { unit: 'g', label: 'g' },
      { unit: 'kg', label: 'kg' },
      { unit: 't', label: 't (トン)' },
      { unit: 'oz', label: 'oz (オンス)' },
      { unit: 'lb', label: 'lb (ポンド)' },
      { unit: 'kan', label: '貫' },
      { unit: 'kin', label: '斤' },
    ],
    baseUnit: 'kg',
    conversions: {
      'g': 0.001, 'kg': 1, 't': 1000,
      'oz': 0.0283495, 'lb': 0.453592,
      'kan': 3.75, 'kin': 0.6,
    }
  },
  pressure: {
    name: '圧力・強度',
    units: [
      { unit: 'N/mm²', label: 'N/mm² (MPa)' },
      { unit: 'kN/m²', label: 'kN/m²' },
      { unit: 'kgf/cm²', label: 'kgf/cm²' },
      { unit: 'bar', label: 'bar' },
      { unit: 'psi', label: 'psi' },
    ],
    baseUnit: 'N/mm²',
    conversions: {
      'N/mm²': 1,
      'kN/m²': 0.001,
      'kgf/cm²': 0.0980665,
      'bar': 0.1,
      'psi': 0.00689476
    }
  },
  temperature: {
    name: '温度',
    units: [
      { unit: '°C', label: '°C (摂氏)' },
      { unit: '°F', label: '°F (華氏)' },
    ],
    baseUnit: '°C',
    conversions: { '°C': 1, '°F': 1 }
  }
};

type UnitCategory = keyof typeof UNIT_CONVERSIONS;

const UnitConverter: React.FC = () => {
  const { isLoggedIn } = useAuth();
  
  // State
  const [selectedCategory, setSelectedCategory] = useState<UnitCategory>('length');
  const [fromUnit, setFromUnit] = useState<string>('');
  const [inputValue, setInputValue] = useState(''); 
  const [calculatedValue, setCalculatedValue] = useState<number | null>(null);
  
  // 単価計算用 State
  const [isPriceMode, setIsPriceMode] = useState(false);
  const [inputPrice, setInputPrice] = useState('');
  
  const [conversionResults, setConversionResults] = useState<{[key: string]: { value: string, price: string }}>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // カテゴリ変更時の初期化
  useEffect(() => {
    if (selectedCategory) {
      setFromUnit(UNIT_CONVERSIONS[selectedCategory].units[0].unit);
      setConversionResults({});
      setInputPrice('');
    }
  }, [selectedCategory]);

  const evaluateInput = (input: string): number | null => {
    if (!input) return null;
    try {
      if (!/^[0-9+\-*/().\s]+$/.test(input)) return null;
      const result = new Function('return ' + input)();
      return isFinite(result) ? result : null;
    } catch {
      return null;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isLoggedIn) {
      alert('入力するには会員登録（無料）が必要です。');
      e.target.value = '';
      return;
    }
    const val = e.target.value;
    setInputValue(val);
    const result = evaluateInput(val);
    setCalculatedValue(result);
  };

  const formatNumber = (num: number, precision: number = 6): string => {
    if (num === 0) return '0';
    const s = num.toFixed(precision);
    const cleaned = s.replace(/\.?0+$/, '');
    const parts = cleaned.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const formatPrice = (num: number): string => {
    if (!isFinite(num)) return '-';
    return Math.round(num).toLocaleString();
  };

  const convertTemperature = (val: number, from: string, to: string): number => {
    if (from === to) return val;
    let celsius = val;
    if (from === '°F') celsius = (val - 32) * 5/9;
    if (to === '°F') return celsius * 9/5 + 32;
    return celsius;
  };

  useEffect(() => {
    if (!selectedCategory || !fromUnit || calculatedValue === null) {
      setConversionResults({});
      return;
    }

    const category = UNIT_CONVERSIONS[selectedCategory];
    const results: {[key: string]: { value: string, price: string }} = {};
    const baseVal = calculatedValue;

    let pricePerBaseUnit = 0;
    const priceVal = parseFloat(inputPrice);
    if (isPriceMode && !isNaN(priceVal) && priceVal > 0) {
       if (selectedCategory !== 'temperature') {
         pricePerBaseUnit = priceVal / category.conversions[fromUnit];
       }
    }

    if (selectedCategory === 'temperature') {
      category.units.forEach(({ unit }) => {
        const converted = convertTemperature(baseVal, fromUnit, unit);
        results[unit] = { value: formatNumber(converted, 2), price: '-' };
      });
    } else {
      const fromRatio = category.conversions[fromUnit];
      const valInBase = baseVal * fromRatio; 

      category.units.forEach(({ unit }) => {
        const toRatio = category.conversions[unit];
        const converted = valInBase / toRatio;
        
        let convertedPrice = '-';
        if (isPriceMode && priceVal > 0) {
            const p = pricePerBaseUnit * toRatio;
            convertedPrice = formatPrice(p);
        }

        const needsPrecision = converted !== 0 && Math.abs(converted) < 0.01;
        results[unit] = { 
            value: formatNumber(converted, needsPrecision ? 8 : 4),
            price: convertedPrice
        };
      });
    }
    setConversionResults(results);
  }, [selectedCategory, fromUnit, calculatedValue, inputPrice, isPriceMode]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="w-full bg-white rounded-b-lg shadow-sm border-b border-gray-100 flex flex-col h-full overflow-hidden">
      {/* ヘッダー (変更なし) */}
      <div className="p-4 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div>
          <h3 className="text-[13px] font-medium">単位・単価コンバーター</h3>
          <p className="text-[11px] mt-0.5">長さ・面積・体積・重さ・圧力・温度など様々な単位を変換。建築実務でよく使う単位にも対応</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* --- 左カラム：入力・設定 --- */}
        <div className="w-full lg:w-[340px] bg-white border-r border-gray-100 p-5 overflow-y-auto flex flex-col gap-6 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
            
            {/* 1. カテゴリ設定 */}
            <div>
                <div className="flex items-center gap-2 mb-3 pb-1 border-b border-gray-100">
                    <FiSettings className="w-3.5 h-3.5 text-gray-400" />
                    <label className="block text-[11px] font-bold text-gray-600">変換設定</label>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5">カテゴリー</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value as UnitCategory)}
                            className="w-full p-2 text-xs border border-gray-200 rounded-lg bg-gray-50 font-medium cursor-pointer hover:border-blue-300 transition-colors outline-none focus:ring-2 focus:ring-blue-100"
                        >
                            {Object.entries(UNIT_CONVERSIONS).map(([key, { name }]) => (
                                <option key={key} value={key}>{name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5">値を入力 (計算式も可)</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={handleInputChange}
                                placeholder="例: 100, 1.8*2"
                                className="w-full p-2.5 text-sm font-bold border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder-gray-300"
                            />
                            {/* 計算結果プレビュー */}
                            {calculatedValue !== null && inputValue !== String(calculatedValue) && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-blue-500 font-mono">
                                    = {formatNumber(calculatedValue)}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5">現在の単位</label>
                        <select
                            value={fromUnit}
                            onChange={(e) => setFromUnit(e.target.value)}
                            className="w-full p-2 text-xs border border-gray-200 rounded-lg bg-gray-50 font-medium cursor-pointer hover:border-blue-300 transition-colors outline-none focus:ring-2 focus:ring-blue-100"
                        >
                            {UNIT_CONVERSIONS[selectedCategory].units.map(({ unit, label }) => (
                                <option key={unit} value={unit}>{label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* 2. 単価設定エリア */}
            <div className="pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-[11px] font-bold text-yellow-700 flex items-center gap-1.5">
                       <FiDollarSign className="w-3 h-3" /> 単価計算
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={isPriceMode} 
                            onChange={(e) => setIsPriceMode(e.target.checked)} 
                            className="sr-only peer" 
                        />
                        <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-yellow-400"></div>
                    </label>
                </div>
                
                {isPriceMode && (
                    <div className="bg-yellow-50/50 p-3 rounded-lg border border-yellow-100 animate-fadeIn">
                        <label className="block text-[10px] font-bold text-yellow-800 mb-1">
                            1 {UNIT_CONVERSIONS[selectedCategory].units.find(u => u.unit === fromUnit)?.unit} あたりの単価
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={inputPrice}
                                onChange={(e) => setInputPrice(e.target.value)}
                                onClick={(e) => {
                                    if (!isLoggedIn) {
                                        alert('入力するには会員登録（無料）が必要です。');
                                        e.preventDefault();
                                    }
                                }}
                                placeholder="0"
                                className="w-full text-right font-bold text-sm p-1.5 border border-yellow-200 rounded bg-white focus:ring-1 focus:ring-yellow-400 outline-none text-gray-800 placeholder-yellow-200"
                            />
                            <span className="text-xs text-yellow-700 font-bold shrink-0">円</span>
                        </div>
                    </div>
                )}
            </div>
            
            {/* 情報エリア */}
            <div className="mt-auto bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                <div className="flex items-start gap-2">
                    <FiRefreshCw className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-blue-600 leading-relaxed">
                        数値を入力すると、同じカテゴリー内の全ての単位に自動変換されます。
                    </p>
                </div>
            </div>
        </div>

        {/* --- 右カラム：結果一覧 --- */}
        <div className="flex-1 bg-gray-50 overflow-y-auto p-4 lg:p-6">
            <div className="max-w-4xl mx-auto flex flex-col h-full">
                <div className="flex justify-between items-end mb-4 px-1">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Results</h4>
                </div>

                {Object.keys(conversionResults).length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-200 rounded-xl min-h-[300px]">
                        <span className="text-4xl mb-3 opacity-30">⌨️</span>
                        <p className="text-xs font-medium">数値を入力して変換を開始してください</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar pb-10">
                        <div className="grid grid-cols-1 gap-3">
                            {Object.entries(conversionResults).map(([unit, data]) => {
                                const isSelected = unit === fromUnit;
                                const label = UNIT_CONVERSIONS[selectedCategory].units.find(u => u.unit === unit)?.label;
                                const isCopied = copiedKey === unit;

                                return (
                                    <div 
                                        key={unit} 
                                        className={`p-3.5 rounded-xl border shadow-sm flex flex-col sm:flex-row gap-3 sm:items-center transition-all duration-200 group ${
                                            isSelected 
                                            ? 'bg-white border-blue-300 ring-1 ring-blue-100 shadow-blue-50' 
                                            : 'bg-white border-gray-200 hover:border-blue-200'
                                        }`}
                                    >
                                        {/* アイコン & 単位名 */}
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                                                isSelected 
                                                ? 'bg-blue-50 text-blue-600' 
                                                : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                {unit}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <div className={`text-[12px] font-bold ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                                                        {label}
                                                    </div>
                                                    {isSelected && (
                                                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[9px] font-bold">Base</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 値 & アクション */}
                                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-1 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-50">
                                            <div className="text-right">
                                                <div className={`text-sm font-bold tracking-tight ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                                                    {data.value}
                                                </div>
                                                {isPriceMode && (
                                                    <div className="text-[11px] font-mono font-bold text-yellow-600 flex items-center justify-end gap-0.5">
                                                        <span className="opacity-60 text-[9px]">¥</span>
                                                        {data.price}
                                                    </div>
                                                )}
                                            </div>

                                            <button 
                                                onClick={() => handleCopy(data.value, unit)}
                                                className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-[10px] font-bold ${
                                                    isCopied
                                                    ? 'bg-green-50 text-green-600'
                                                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 opacity-0 group-hover:opacity-100'
                                                }`}
                                                title="値をコピー"
                                            >
                                                {isCopied ? <FiCheck className="w-3.5 h-3.5" /> : <FiCopy className="w-3.5 h-3.5" />}
                                                <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default UnitConverter;
