'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { FiSettings, FiDollarSign, FiCopy, FiCheck, FiCpu, FiRefreshCw, FiCrop, FiArrowRight, FiGrid, FiEdit2, FiTrash2, FiPlus, FiX } from 'react-icons/fi';

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

/**
 * よく使う換算のプリセット。
 * これまでは毎回「カテゴリー」と「現在の単位」を選ぶ必要があったので、
 * 実務で頻度の高い組み合わせをワンタップで出せるようにする。
 */
const PRESETS: Array<{ label: string; category: UnitCategory; from: string }> = [
  { label: '坪 → ㎡', category: 'area', from: 'tsubo' },
  { label: '㎡ → 坪', category: 'area', from: 'm²' },
  { label: '尺 → mm', category: 'length', from: 'shaku' },
  { label: '間 → mm', category: 'length', from: 'ken' },
  { label: 'N/mm² → kgf/cm²', category: 'pressure', from: 'N/mm²' },
  { label: '立米 → L', category: 'volume', from: 'm³' },
];

/**
 * 縮尺読み。図面上で測った長さと実寸法を相互に変換する。
 * 紙図面や PDF をスケールで当たる作業がそのまま乗る。
 */
const SCALES = [10, 20, 30, 50, 100, 200, 500, 1000];

/**
 * 数量換算。面積・体積・長さの数量を、登録した定尺で割って必要数を出す。
 *
 * 定尺は品目ごとにユーザーが登録する。歩掛や材料の規格は現場・メーカーで
 * 変わるので、こちらで表を決め打ちせず編集できる形にしている。
 */
type QtyKind = 'area' | 'volume' | 'length';

type QtyItem = {
  id: string;
  /** 品目名。例: 板材 910×1820 */
  name: string;
  kind: QtyKind;
  /** 1 単位あたりの量。面積なら㎡、体積ならm³、長さならm。 */
  per: number;
  /** 数える単位。枚 / 袋 / 本 など。 */
  unitLabel: string;
  /** ロス率 (%)。 */
  loss: number;
};

const QTY_KIND_LABEL: Record<QtyKind, { name: string; unit: string }> = {
  area: { name: '面積', unit: '㎡' },
  volume: { name: '体積', unit: 'm³' },
  length: { name: '長さ', unit: 'm' },
};

const QTY_STORAGE_KEY = 'yy-unit-converter-qty-items';

/**
 * 初期値。全て編集・削除できる。
 * 規格や歩掛を当てにいくと現場と食い違うので、寸法から一意に決まるものだけ置く。
 */
const QTY_SEEDS: QtyItem[] = [
  { id: 'seed-board-1820', name: '板材 910×1820', kind: 'area', per: 1.6562, unitLabel: '枚', loss: 5 },
  { id: 'seed-board-2420', name: '板材 910×2420', kind: 'area', per: 2.2022, unitLabel: '枚', loss: 5 },
  { id: 'seed-bar-4m', name: '長尺材 4m', kind: 'length', per: 4, unitLabel: '本', loss: 5 },
];

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

  // 縮尺読み用 State
  const [isScaleMode, setIsScaleMode] = useState(false);
  const [scale, setScale] = useState(100);
  const [drawingMm, setDrawingMm] = useState('');
  const [actualMm, setActualMm] = useState('');

  // 数量換算用 State
  const [isQtyMode, setIsQtyMode] = useState(false);
  const [qtyItems, setQtyItems] = useState<QtyItem[]>(QTY_SEEDS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<QtyItem | null>(null);
  const [dimW, setDimW] = useState('');
  const [dimH, setDimH] = useState('');

  /**
   * プリセットが選んだ単位。カテゴリ変更の useEffect が単位を先頭に戻してしまうので、
   * ここに退避しておいて初期化のときに優先させる。
   */
  const pendingUnitRef = useRef<string | null>(null);

  // 登録した品目の読み込み。保存が読めなくても初期値で動く。
  useEffect(() => {
    try {
      const raw = localStorage.getItem(QTY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) setQtyItems(parsed);
      }
    } catch {
      /* プライベートウィンドウ等で読めないだけなので握りつぶす */
    }
  }, []);

  const saveItems = (next: QtyItem[]) => {
    setQtyItems(next);
    try {
      localStorage.setItem(QTY_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* 保存できなくても、このセッション中は使える */
    }
  };

  // カテゴリ変更時の初期化
  useEffect(() => {
    if (selectedCategory) {
      const units = UNIT_CONVERSIONS[selectedCategory].units;
      const pending = pendingUnitRef.current;
      pendingUnitRef.current = null;
      setFromUnit(pending && units.some(u => u.unit === pending) ? pending : units[0].unit);
      setConversionResults({});
      setInputPrice('');
    }
  }, [selectedCategory]);

  const applyPreset = (preset: { category: UnitCategory; from: string }) => {
    if (preset.category === selectedCategory) {
      // カテゴリが同じなら初期化の useEffect は走らないので直接入れる
      setFromUnit(preset.from);
    } else {
      pendingUnitRef.current = preset.from;
      setSelectedCategory(preset.category);
    }
  };

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

  /** 図面上で測った mm → 実寸法 mm。逆方向は handleActualChange。 */
  const handleDrawingChange = (val: string) => {
    setDrawingMm(val);
    const n = parseFloat(val);
    setActualMm(isFinite(n) ? String(Math.round(n * scale * 100) / 100) : '');
  };

  const handleActualChange = (val: string) => {
    setActualMm(val);
    const n = parseFloat(val);
    setDrawingMm(isFinite(n) ? String(Math.round((n / scale) * 100) / 100) : '');
  };

  /** 縮尺を変えたら、図面上の実測値を基準に実寸法を引き直す。 */
  const handleScaleChange = (next: number) => {
    setScale(next);
    const n = parseFloat(drawingMm);
    if (isFinite(n)) setActualMm(String(Math.round(n * next * 100) / 100));
  };

  /** 縮尺読みで出した実寸法を、そのまま上の単位変換に流し込む。 */
  const sendActualToConverter = () => {
    const n = parseFloat(actualMm);
    if (!isFinite(n)) return;
    applyPreset({ category: 'length', from: 'mm' });
    setInputValue(String(n));
    setCalculatedValue(n);
  };

  /** 数量換算が使えるカテゴリーか。温度・重さ・圧力では出番がない。 */
  const qtyKind: QtyKind | null =
    selectedCategory === 'area' || selectedCategory === 'volume' || selectedCategory === 'length'
      ? selectedCategory
      : null;

  /** 入力値を ㎡ / m³ / m に揃えたもの。体積だけ基準が L なので割り戻す。 */
  const baseQuantity = (() => {
    if (!qtyKind || calculatedValue === null) return null;
    const ratio = UNIT_CONVERSIONS[selectedCategory].conversions[fromUnit];
    if (!isFinite(ratio)) return null;
    const inBase = calculatedValue * ratio;
    return qtyKind === 'volume' ? inBase / 1000 : inBase;
  })();

  const requiredCount = (item: QtyItem) => {
    if (baseQuantity === null || !(item.per > 0)) return null;
    const withLoss = baseQuantity * (1 + item.loss / 100);
    return { withLoss, count: Math.ceil(withLoss / item.per) };
  };

  /** 数量は 0.0001 ㎡ のような小さい値も出るので、丸めて 0 に見えないようにする。 */
  const formatQuantity = (n: number) => formatNumber(n, n !== 0 && Math.abs(n) < 0.01 ? 8 : 3);

  const startAdd = () => {
    setEditingId('new');
    setDraft({ id: 'new', name: '', kind: qtyKind ?? 'area', per: 0, unitLabel: '枚', loss: 5 });
    setDimW('');
    setDimH('');
  };

  const startEdit = (item: QtyItem) => {
    setEditingId(item.id);
    setDraft({ ...item });
    setDimW('');
    setDimH('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const commitDraft = () => {
    if (!draft || !draft.name.trim() || !(draft.per > 0)) return;
    if (editingId === 'new') {
      saveItems([...qtyItems, { ...draft, id: `item-${Date.now()}` }]);
    } else {
      saveItems(qtyItems.map((i) => (i.id === editingId ? draft : i)));
    }
    cancelEdit();
  };

  const removeItem = (id: string) => {
    saveItems(qtyItems.filter((i) => i.id !== id));
    if (editingId === id) cancelEdit();
  };

  /** 面積品目は「910×1820」のように寸法から入れた方が速いので、mm から ㎡ を埋める。 */
  const applyDimensions = (w: string, h: string) => {
    setDimW(w);
    setDimH(h);
    const W = parseFloat(w);
    const H = parseFloat(h);
    if (draft && isFinite(W) && isFinite(H) && W > 0 && H > 0) {
      setDraft({ ...draft, per: Math.round((W / 1000) * (H / 1000) * 10000) / 10000 });
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  /** 品目の追加と編集で同じ入力欄を使う。 */
  const renderDraftForm = () => {
    if (!draft) return null;
    const canSave = draft.name.trim().length > 0 && draft.per > 0;

    return (
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="品目名（例: 板材 910×1820）"
            className="flex-1 text-[12px] font-bold p-1.5 border border-gray-200 rounded bg-white outline-none focus:ring-1 focus:ring-indigo-300"
          />
          <select
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value as QtyKind })}
            className="text-[11px] p-1.5 border border-gray-200 rounded bg-gray-50 outline-none cursor-pointer"
          >
            {(Object.keys(QTY_KIND_LABEL) as QtyKind[]).map((k) => (
              <option key={k} value={k}>{QTY_KIND_LABEL[k].name}</option>
            ))}
          </select>
        </div>

        {draft.kind === 'area' && (
          <div className="flex items-center gap-1.5 bg-gray-50 rounded p-2">
            <span className="text-[10px] text-gray-400 shrink-0">寸法から</span>
            <input
              type="number"
              value={dimW}
              onChange={(e) => applyDimensions(e.target.value, dimH)}
              placeholder="910"
              className="w-16 text-right text-[11px] p-1 border border-gray-200 rounded bg-white outline-none"
            />
            <span className="text-[10px] text-gray-400">×</span>
            <input
              type="number"
              value={dimH}
              onChange={(e) => applyDimensions(dimW, e.target.value)}
              placeholder="1820"
              className="w-16 text-right text-[11px] p-1 border border-gray-200 rounded bg-white outline-none"
            />
            <span className="text-[10px] text-gray-400">mm</span>
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-[10px] text-gray-400 mb-0.5">
              1 単位あたり（{QTY_KIND_LABEL[draft.kind].unit}）
            </label>
            <input
              type="number"
              value={draft.per || ''}
              onChange={(e) => setDraft({ ...draft, per: parseFloat(e.target.value) || 0 })}
              placeholder="1.6562"
              className="w-full text-right text-[12px] font-bold p-1.5 border border-gray-200 rounded bg-white outline-none focus:ring-1 focus:ring-indigo-300"
            />
          </div>
          <div className="w-16">
            <label className="block text-[10px] text-gray-400 mb-0.5">単位</label>
            <input
              type="text"
              value={draft.unitLabel}
              onChange={(e) => setDraft({ ...draft, unitLabel: e.target.value })}
              placeholder="枚"
              className="w-full text-center text-[12px] font-bold p-1.5 border border-gray-200 rounded bg-white outline-none focus:ring-1 focus:ring-indigo-300"
            />
          </div>
          <div className="w-20">
            <label className="block text-[10px] text-gray-400 mb-0.5">ロス率 %</label>
            <input
              type="number"
              value={draft.loss}
              onChange={(e) => setDraft({ ...draft, loss: parseFloat(e.target.value) || 0 })}
              className="w-full text-right text-[12px] font-bold p-1.5 border border-gray-200 rounded bg-white outline-none focus:ring-1 focus:ring-indigo-300"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-0.5">
          <button
            type="button"
            onClick={cancelEdit}
            className="flex items-center gap-1 text-[11px] text-gray-500 px-2 py-1 rounded hover:bg-gray-100"
          >
            <FiX className="w-3 h-3" /> 取消
          </button>
          <button
            type="button"
            onClick={commitDraft}
            disabled={!canSave}
            className="flex items-center gap-1 text-[11px] font-bold text-white bg-indigo-500 px-3 py-1 rounded hover:bg-indigo-600 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors"
          >
            <FiCheck className="w-3 h-3" /> 保存
          </button>
        </div>
      </div>
    );
  };

  return (
    // 親（GeneralTools のラッパー）が高さを持たないので h-full が効かない。
    // 結果が並ぶと画面外へはみ出すため、PC では実寸で高さを止めて中だけスクロールさせる。
    <div className="w-full bg-white rounded-b-lg shadow-sm border-b border-gray-100 flex flex-col h-full lg:h-[calc(100vh-var(--nav-height))] overflow-hidden">
      {/* ヘッダー (変更なし) */}
      <div className="px-4 py-1.5 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div>
          <h3 className="text-[13px] font-medium">単位・単価コンバーター</h3>
          <p className="text-[11px] mt-0.5">長さ・面積・体積・重さ・圧力・温度など様々な単位を変換。建築実務でよく使う単位にも対応</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden m-4 border border-[#3b3b3b]">
        
        {/* --- 左カラム：入力・設定 --- */}
        <div className="w-full lg:w-[340px] bg-white border-r border-[#3b3b3b] p-5 overflow-y-auto flex flex-col gap-6 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
            
            {/* 1. カテゴリ設定 */}
            <div>
                <div className="flex items-center gap-2 mb-3 pb-1 border-b border-gray-100">
                    <FiSettings className="w-3.5 h-3.5 text-gray-400" />
                    <label className="block text-[11px] font-bold text-gray-600">変換設定</label>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5">よく使う換算</label>
                        <div className="flex flex-wrap gap-1">
                            {PRESETS.map((p) => (
                                <button
                                    key={p.label}
                                    type="button"
                                    onClick={() => applyPreset(p)}
                                    className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                                        selectedCategory === p.category && fromUnit === p.from
                                            ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-blue-300'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

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
                            {/* 未ログイン時はキー入力ごとの alert ではなく入力自体を無効化する */}
                            <input
                                type="text"
                                value={inputValue}
                                onChange={handleInputChange}
                                disabled={!isLoggedIn}
                                placeholder={isLoggedIn ? '例: 100, 1.8*2' : '会員登録（無料）で利用できます'}
                                className="w-full p-2.5 text-sm font-bold border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed"
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
                                disabled={!isLoggedIn}
                                placeholder="0"
                                className="w-full text-right font-bold text-sm p-1.5 border border-yellow-200 rounded bg-white focus:ring-1 focus:ring-yellow-400 outline-none text-gray-800 placeholder-yellow-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
                            />
                            <span className="text-xs text-yellow-700 font-bold shrink-0">円</span>
                        </div>
                    </div>
                )}
            </div>
            
            {/* 3. 縮尺読み */}
            <div className="pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-[11px] font-bold text-teal-700 flex items-center gap-1.5">
                       <FiCrop className="w-3 h-3" /> 縮尺読み
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isScaleMode}
                            onChange={(e) => setIsScaleMode(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-400"></div>
                    </label>
                </div>

                {isScaleMode && (
                    <div className="bg-teal-50/50 p-3 rounded-lg border border-teal-100 animate-fadeIn space-y-2.5">
                        <div className="flex flex-wrap gap-1">
                            {SCALES.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => handleScaleChange(s)}
                                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                                        scale === s
                                            ? 'bg-teal-500 border-teal-500 text-white font-bold'
                                            : 'bg-white border-teal-200 text-teal-700 hover:border-teal-400'
                                    }`}
                                >
                                    1/{s}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-teal-800 mb-0.5">図面上 (mm)</label>
                                <input
                                    type="number"
                                    value={drawingMm}
                                    onChange={(e) => handleDrawingChange(e.target.value)}
                                    disabled={!isLoggedIn}
                                    placeholder="0"
                                    className="w-full text-right font-bold text-sm p-1.5 border border-teal-200 rounded bg-white focus:ring-1 focus:ring-teal-400 outline-none text-gray-800 placeholder-teal-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
                            </div>
                            <FiArrowRight className="w-3 h-3 text-teal-400 shrink-0 mt-4" />
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-teal-800 mb-0.5">実寸法 (mm)</label>
                                <input
                                    type="number"
                                    value={actualMm}
                                    onChange={(e) => handleActualChange(e.target.value)}
                                    disabled={!isLoggedIn}
                                    placeholder="0"
                                    className="w-full text-right font-bold text-sm p-1.5 border border-teal-200 rounded bg-white focus:ring-1 focus:ring-teal-400 outline-none text-gray-800 placeholder-teal-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {parseFloat(actualMm) > 0 && (
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold text-teal-700">
                                    = {formatNumber(parseFloat(actualMm) / 1000, 3)} m
                                </span>
                                <button
                                    type="button"
                                    onClick={sendActualToConverter}
                                    className="text-[10px] px-2 py-1 rounded bg-white border border-teal-300 text-teal-700 font-bold hover:bg-teal-100 transition-colors"
                                >
                                    上の変換へ送る
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 4. 数量換算 */}
            <div className="pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-bold text-indigo-700 flex items-center gap-1.5">
                       <FiGrid className="w-3 h-3" /> 数量換算
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isQtyMode}
                            onChange={(e) => setIsQtyMode(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-400"></div>
                    </label>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                    {isQtyMode
                      ? '右側で品目の定尺とロス率を登録できます。'
                      : '登録した定尺から必要な枚数・本数・袋数を出します。'}
                </p>
            </div>

            {/* 情報エリア */}
            <div className="mt-auto bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                <div className="flex items-start gap-2">
                    <FiRefreshCw className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-blue-600 leading-relaxed">
                        {isLoggedIn
                          ? '数値を入力すると、同じカテゴリー内の全ての単位に自動変換されます。'
                          : 'このツールを使うには会員登録（無料）が必要です。'}
                    </p>
                </div>
            </div>
        </div>

        {/* --- 右カラム：結果一覧 --- */}
        <div className="flex-1 bg-gray-50 overflow-y-auto p-4 lg:p-6">
            <div className="max-w-4xl mx-auto flex flex-col h-full">
                <div className="flex justify-between items-end mb-4 px-1">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {isQtyMode ? 'Quantity' : 'Results'}
                    </h4>
                    {isQtyMode && qtyKind && baseQuantity !== null && (
                        <span className="text-[11px] font-bold text-indigo-600">
                            基準数量 {formatQuantity(baseQuantity)} {QTY_KIND_LABEL[qtyKind].unit}
                        </span>
                    )}
                </div>

                {isQtyMode ? (
                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar pb-10 space-y-2">
                        {!qtyKind && (
                            <div className="text-[11px] text-gray-500 bg-white border border-gray-200 rounded-lg p-3">
                                数量換算は「長さ」「面積」「体積」のカテゴリーで使えます。
                            </div>
                        )}

                        {qtyKind && baseQuantity === null && (
                            <div className="text-[11px] text-gray-500 bg-white border border-gray-200 rounded-lg p-3">
                                左側に数量を入力すると、登録した品目ごとの必要数が出ます。
                            </div>
                        )}

                        {qtyKind && qtyItems.filter((i) => i.kind === qtyKind).length === 0 && (
                            <div className="text-[11px] text-gray-500 bg-white border border-gray-200 rounded-lg p-3">
                                {QTY_KIND_LABEL[qtyKind].name}の品目がまだありません。下の「品目を追加」から登録してください。
                            </div>
                        )}

                        {qtyKind && qtyItems.filter((i) => i.kind === qtyKind).map((item) => {
                            const result = requiredCount(item);
                            const isEditing = editingId === item.id;

                            if (isEditing && draft) {
                                return (
                                    <div key={item.id} className="bg-white border border-indigo-300 rounded-lg p-3">
                                        {renderDraftForm()}
                                    </div>
                                );
                            }

                            return (
                                <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3 group hover:border-indigo-200 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[12px] font-bold text-gray-700 truncate">{item.name}</div>
                                        <div className="text-[10px] text-gray-400 mt-0.5">
                                            1{item.unitLabel} = {formatNumber(item.per, 4)} {QTY_KIND_LABEL[item.kind].unit}
                                            <span className="mx-1.5 text-gray-300">|</span>
                                            ロス {item.loss}%
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        {result ? (
                                            <>
                                                <div className="text-sm font-bold text-indigo-700 tracking-tight">
                                                    {result.count.toLocaleString()} <span className="text-[11px]">{item.unitLabel}</span>
                                                </div>
                                                <div className="text-[10px] text-gray-400">
                                                    ロス込 {formatQuantity(result.withLoss)} {QTY_KIND_LABEL[item.kind].unit}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-[11px] text-gray-300">-</div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            type="button"
                                            onClick={() => startEdit(item)}
                                            className="p-1.5 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                            title="編集"
                                        >
                                            <FiEdit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.id)}
                                            className="p-1.5 rounded text-gray-400 hover:bg-red-50 hover:text-red-600"
                                            title="削除"
                                        >
                                            <FiTrash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {editingId === 'new' && draft ? (
                            <div className="bg-white border border-indigo-300 rounded-lg p-3">
                                {renderDraftForm()}
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={startAdd}
                                className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-indigo-600 border border-dashed border-indigo-300 rounded-lg py-2 hover:bg-indigo-50 transition-colors"
                            >
                                <FiPlus className="w-3.5 h-3.5" /> 品目を追加
                            </button>
                        )}
                    </div>
                ) : Object.keys(conversionResults).length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-300 min-h-[300px]">
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
