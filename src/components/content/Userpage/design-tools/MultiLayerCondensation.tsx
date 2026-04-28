'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { FiPlus, FiTrash2, FiActivity, FiAlertTriangle, FiCheckCircle, FiLayout, FiPrinter, FiArrowUp, FiArrowDown, FiSettings, FiX, FiFileText, FiInfo, FiRotateCcw, FiMenu } from 'react-icons/fi';

// --- 型定義 ---

type MaterialCategory = string; 

interface Material {
  id: string;
  name: string;
  lambda: number; // 熱伝導率 [W/(m·K)]
  mu: number;     // 透湿抵抗比 [-]
  category: MaterialCategory;
}

interface Layer {
  id: string;
  materialId: string;
  thickness: number | ''; 
  customName?: string;
  isBonded?: boolean; // 次の層と密着している（この層の直後の界面での結露判定を無視）
}

interface CalculationPoint {
  distance: number;
  temp: number;
  dewPoint: number;
  pressure: number;
  satPressure: number;
  layerName: string;
  isIce: boolean;
  displayLabel: string; // 表示用ラベル（表面を基準に「〇〇 表面（△△ 裏面）」形式）
  isBonded?: boolean; // この界面が密着している場合true（判定はスキップ済み）
}

interface CalcResult {
  uValue: number;
  rTotal: number;
  points: CalculationPoint[];
  isCondensing: boolean;
  condensationLayerIndex: number | null;
  limitOutdoorTemp: number | null;
  layerDetails: { 
    name: string;
    d: number;
    lambda: number;
    mu: number;
    r: number;
    sd: number;
    isBonded?: boolean; // 計算結果側にもこの情報を持たせる
  }[];
}

// --- データベース & 定数 ---

const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
  finish: '仕上/外装',
  roof: '屋根材',
  membrane: 'シート',
  air: '空気層',
  structure: '構造/躯体',
  insulation: '断熱材',
  board: '下地/PB',
  floor: '床仕上',
};

// 建材データ（拡充版）
const DEFAULT_MATERIAL_DB: Material[] = [
  // --- 外装 ---
  { id: 'ext_siding', name: '窯業系サイディング', lambda: 1.0, mu: 40, category: 'finish' },
  { id: 'metal_siding', name: '金属サイディング', lambda: 0.04, mu: 1000, category: 'finish' }, // 断熱裏打込
  { id: 'alc', name: 'ALCパネル', lambda: 0.17, mu: 10, category: 'finish' },
  { id: 'ecp', name: '押出成形セメント板(ECP)', lambda: 1.0, mu: 60, category: 'finish' },
  { id: 'mortar', name: 'モルタル', lambda: 1.5, mu: 30, category: 'finish' },
  { id: 'galvalume', name: 'ガルバリウム鋼板', lambda: 50, mu: 100000, category: 'finish' },

  // --- 屋根 ---
  { id: 'roof_slate', name: '化粧スレート', lambda: 1.0, mu: 150, category: 'roof' },
  { id: 'roof_metal', name: '金属屋根(鋼板)', lambda: 50, mu: 100000, category: 'roof' },
  { id: 'roof_folded', name: '折板(ダブル折板用鋼板)', lambda: 50, mu: 100000, category: 'roof' }, // ダブルの構成部材として
  { id: 'pef_sheet', name: 'ペフ(ポリエチレンフォーム)', lambda: 0.04, mu: 100, category: 'insulation' },

  // --- 空気層 ---
  { id: 'air_stat', name: '密閉空気層', lambda: 0.14, mu: 1, category: 'air' },
  { id: 'air_vent', name: '通気層(外気導入)', lambda: 100, mu: 0.01, category: 'air' }, // 仮想的に抵抗なし

  // --- シート ---
  { id: 'breathable', name: '透湿防水シート', lambda: 0.2, mu: 0.5, category: 'membrane' },
  { id: 'asphalt_roofing', name: 'アスファルトルーフィング', lambda: 0.15, mu: 40000, category: 'membrane' },
  { id: 'pe_film', name: '防湿気密シート(0.2mm)', lambda: 0.33, mu: 144000, category: 'membrane' },
  { id: 'vapor_barrier', name: '可変透湿気密シート', lambda: 0.33, mu: 10000, category: 'membrane' },

  // --- 構造 ---
  { id: 'plywood', name: '構造用合板', lambda: 0.16, mu: 20, category: 'structure' },
  { id: 'osb', name: 'OSB合板', lambda: 0.13, mu: 50, category: 'structure' },
  { id: 'concrete', name: 'コンクリート', lambda: 1.6, mu: 40, category: 'structure' },

  // --- 断熱材 (大幅追加) ---
  { id: 'gw_10k', name: 'グラスウール 10K', lambda: 0.050, mu: 1.1, category: 'insulation' },
  { id: 'gw_16k', name: '高性能GW 16K', lambda: 0.038, mu: 1.2, category: 'insulation' },
  { id: 'gw_24k', name: '高性能GW 24K', lambda: 0.036, mu: 1.2, category: 'insulation' },
  { id: 'gw_32k', name: '高性能GW 32K', lambda: 0.035, mu: 1.2, category: 'insulation' },
  { id: 'rockwool', name: 'ロックウール', lambda: 0.038, mu: 1.2, category: 'insulation' },
  { id: 'xps_1', name: 'XPS 1種(スタイロフォームIB等)', lambda: 0.040, mu: 100, category: 'insulation' },
  { id: 'xps_3', name: 'XPS 3種b(スタイロフォームFG等)', lambda: 0.028, mu: 150, category: 'insulation' },
  { id: 'urethane_1', name: '硬質ウレタンフォーム 1種', lambda: 0.024, mu: 50, category: 'insulation' },
  { id: 'urethane_2', name: '硬質ウレタンフォーム 2種', lambda: 0.023, mu: 50, category: 'insulation' },
  { id: 'phenolic', name: 'フェノールフォーム(ネオマ等)', lambda: 0.020, mu: 20, category: 'insulation' },
  { id: 'eps', name: 'ビーズ法ポリスチレン(EPS)', lambda: 0.034, mu: 30, category: 'insulation' },
  { id: 'cellulose', name: 'セルロースファイバー', lambda: 0.040, mu: 2, category: 'insulation' },
  { id: 'wool', name: '羊毛断熱材(ウール)', lambda: 0.040, mu: 1.3, category: 'insulation' },

  // --- 下地・内装 ---
  { id: 'gb', name: '石膏ボード', lambda: 0.22, mu: 10, category: 'board' },
  { id: 'calcium_silicate', name: 'ケイ酸カルシウム板', lambda: 0.17, mu: 10, category: 'board' },
  
  // --- 床 ---
  { id: 'flooring', name: '複合フローリング', lambda: 0.12, mu: 50, category: 'floor' },
  { id: 'tatami', name: '畳', lambda: 0.11, mu: 5, category: 'floor' },
  { id: 'carpet', name: 'カーペット', lambda: 0.06, mu: 2, category: 'floor' },
];

const PRESETS: Record<string, { name: string, type: 'wall'|'roof'|'floor'|'foundation', rsi: number, rse: number, layers: Omit<Layer, 'id'>[] }> = {
  'wall_wood': {
    name: '外壁 - 木造',
    type: 'wall',
    rsi: 0.11, rse: 0.04,
    layers: [
      { materialId: 'ext_siding', thickness: 16 },
      { materialId: 'breathable', thickness: 0.2 },
      { materialId: 'plywood', thickness: 9 },
      { materialId: 'gw_16k', thickness: 105 },
      { materialId: 'pe_film', thickness: 0.2 },
      { materialId: 'gb', thickness: 12.5 },
    ]
  },
  'wall_s': {
    name: '外壁 - S造',
    type: 'wall',
    rsi: 0.11, rse: 0.04,
    layers: [
      { materialId: 'alc', thickness: 100 },
      { materialId: 'urethane_1', thickness: 25 },
      { materialId: 'air_stat', thickness: 45 },
      { materialId: 'gb', thickness: 12.5 },
    ]
  },
  'wall_rc': {
    name: '外壁 - RC造',
    type: 'wall',
    rsi: 0.11, rse: 0.04,
    layers: [
      { materialId: 'concrete', thickness: 150 },
      { materialId: 'urethane_1', thickness: 30 },
      { materialId: 'air_stat', thickness: 20 },
      { materialId: 'gb', thickness: 9.5 },
    ]
  },
  'roof_wood': {
    name: '屋根 - 木造',
    type: 'roof',
    rsi: 0.10, rse: 0.04,
    layers: [
      { materialId: 'roof_slate', thickness: 6 },
      { materialId: 'asphalt_roofing', thickness: 1 },
      { materialId: 'plywood', thickness: 12 },
      { materialId: 'gw_16k', thickness: 185 },
      { materialId: 'pe_film', thickness: 0.2 },
      { materialId: 'gb', thickness: 9.5 },
    ]
  },
  'roof_double': {
    name: '屋根 - S造 (ダブル折板)',
    type: 'roof',
    rsi: 0.10, rse: 0.04,
    layers: [
      { materialId: 'roof_folded', thickness: 0.8 }, // 上弦
      { materialId: 'gw_32k', thickness: 100 }, // 中間断熱
      { materialId: 'roof_folded', thickness: 0.6 }, // 下弦
      { materialId: 'air_stat', thickness: 100 }, // 吊りボルト層
      { materialId: 'pe_film', thickness: 0.2 }, // 防湿
      { materialId: 'gb', thickness: 9.5 },
    ]
  },
  'roof_s': {
    name: '屋根 - S造 (シングル折板)',
    type: 'roof',
    rsi: 0.10, rse: 0.04,
    layers: [
      { materialId: 'roof_metal', thickness: 0.6 },
      { materialId: 'pef_sheet', thickness: 4 },
      { materialId: 'air_stat', thickness: 100 },
      { materialId: 'gw_16k', thickness: 100 },
      { materialId: 'gb', thickness: 9.5 },
    ]
  },
  'roof_rc': {
    name: '屋根 - RC造',
    type: 'roof',
    rsi: 0.10, rse: 0.04,
    layers: [
      { materialId: 'concrete', thickness: 60 },
      { materialId: 'xps_3', thickness: 50 },
      { materialId: 'asphalt_roofing', thickness: 4 },
      { materialId: 'concrete', thickness: 150 },
      { materialId: 'gb', thickness: 9.5 },
    ]
  },
  'floor_wood': {
    name: '床 - 木造',
    type: 'floor',
    rsi: 0.15, rse: 0.04,
    layers: [
      { materialId: 'gw_24k', thickness: 80 },
      { materialId: 'plywood', thickness: 24 },
      { materialId: 'flooring', thickness: 12 },
    ]
  },
  'floor_rc': {
    name: '床 - RC造',
    type: 'floor',
    rsi: 0.15, rse: 0.04,
    layers: [
      { materialId: 'concrete', thickness: 150 },
      { materialId: 'xps_3', thickness: 30 },
      { materialId: 'concrete', thickness: 40 },
      { materialId: 'flooring', thickness: 12 },
    ]
  },
  'foundation_rc': {
    name: '基礎 - RC造',
    type: 'foundation',
    rsi: 0.11, rse: 0.04,
    layers: [
      { materialId: 'concrete', thickness: 150 },
      { materialId: 'xps_3', thickness: 50 },
    ]
  },
  'partition_wall': {
    name: '間仕切壁',
    type: 'wall',
    rsi: 0.11, rse: 0.11,
    layers: [
      { materialId: 'gb', thickness: 12.5 },
      { materialId: 'gw_16k', thickness: 100 },
      { materialId: 'gb', thickness: 12.5 },
    ]
  }
};

// --- 計算ロジック (Tetensの式を採用) ---

// 飽和水蒸気圧 Ps [Pa] (Tetens)
// t: 温度 [℃]
const getSatPressure = (t: number): number => {
  // Tetensの式: P = 6.1078 * 10^(7.5t / (t + 237.3))  [hPa]
  // 1 hPa = 100 Pa なので 100倍する
  const hPa = 6.1078 * Math.pow(10, (7.5 * t) / (t + 237.3));
  return hPa * 100;
};

// 重量絶対湿度 X [kg/kg(DA)]
// t: 温度 [℃], rh: 相対湿度 [%]
const getAbsoluteHumidity = (t: number, rh: number): number => {
  const ps = getSatPressure(t); // Pa
  const pv = ps * (rh / 100);   // 水蒸気分圧 Pa
  const P = 101325;             // 標準大気圧 Pa
  
  // 0.622 * e / (P - e)
  if (P <= pv) return 0.1; // エラー回避
  return (0.622 * pv) / (P - pv);
};

// 露点温度 Td [℃] (Tetensの逆算)
// pressure: 水蒸気圧 [Pa]
const getDewPoint = (pressure: number): number => {
  if (pressure <= 0) return -50;
  const p_hPa = pressure / 100;
  
  // log10(P/6.1078) = 7.5t / (t + 237.3)
  const A = Math.log10(p_hPa / 6.1078);
  // A = 7.5t / (t + 237.3)  => A(t + 237.3) = 7.5t => At + 237.3A = 7.5t => 237.3A = t(7.5 - A)
  // t = 237.3 * A / (7.5 - A)
  
  const val = (237.3 * A) / (7.5 - A);
  return val;
};

const calculateProfile = (
  inputLayers: Layer[],
  ti: number, rhi: number,
  te: number, rhe: number,
  rsi: number, rse: number,
  materials: Material[]
): CalcResult => {
  const validLayers = inputLayers.filter(l => l.materialId !== '' && l.thickness !== '');
  const layers = [...validLayers].reverse();

  const layerDetails: CalcResult['layerDetails'] = [];

  const layerProps = layers.map(layer => {
    const mat = materials.find(m => m.id === layer.materialId);
    const lambda = mat?.lambda ?? 1.0;
    const mu = mat?.mu ?? 1.0;
    const d_mm = Number(layer.thickness) || 0;
    const d = d_mm / 1000;
    
    const r = d / lambda;
    const sd = d * mu;

    layerDetails.push({
      name: mat?.name ?? 'Unknown',
      d: d_mm,
      lambda,
      mu,
      r,
      sd,
      isBonded: layer.isBonded
    });

    return {
      ...layer,
      name: mat?.name ?? 'Unknown',
      R: r,
      Sd: sd,
      d_mm: d_mm
    };
  });

  const R_total = rsi + layerProps.reduce((sum, l) => sum + l.R, 0) + rse;
  const U = 1 / R_total;

  const Pi_sat = getSatPressure(ti);
  const Pi = Pi_sat * (rhi / 100);
  const Pe_sat = getSatPressure(te);
  const Pe = Pe_sat * (rhe / 100);
  const Sd_total = layerProps.reduce((sum, l) => sum + l.Sd, 0);

  const points: CalculationPoint[] = [];
  let currentR = rsi;
  let currentSd = 0;
  let currentDist = 0;

  const Tsi = ti - (rsi / R_total) * (ti - te);
  
  // 室内表面: 最初の層の表面
  const firstLayerName = layerDetails[0]?.name || '不明';
  points.push({
    distance: 0,
    temp: Tsi,
    dewPoint: getDewPoint(Pi),
    pressure: Pi,
    satPressure: getSatPressure(Tsi),
    layerName: '室内表面',
    displayLabel: `【室内側】${firstLayerName} 表面`,
    isIce: Tsi < 0
  });

  let isCondensing = false;
  let condensationLayerIndex: number | null = null;

  layerProps.forEach((layer, idx) => {
    currentR += layer.R;
    currentSd += layer.Sd;
    currentDist += layer.d_mm;

    const Tx = ti - (currentR / R_total) * (ti - te);
    const ratio = Sd_total > 0 ? currentSd / Sd_total : (idx + 1) / layerProps.length;
    const Px = Pi - ratio * (Pi - Pe);
    const Px_sat = getSatPressure(Tx);
    const Tdx = getDewPoint(Px);

    // この層が「密着（isBonded）」指定されている場合、結露判定を行わない
    // ※ UIで「この層と次の層の間」を指定した場合、ここでのチェックをスキップします
    const skipCheck = layer.isBonded;

    if (!skipCheck && Px > Px_sat + 1) { 
      isCondensing = true;
      if (condensationLayerIndex === null) condensationLayerIndex = idx;
    }

    // 表示ラベル生成: この層の外側表面（= 次の層との界面 / 最後だけ室外表面）
    const currentLayerName = layer.name;
    const isLastLayer = idx === layerProps.length - 1;
    let displayLabel: string;
    
    if (isLastLayer) {
      // 最後の層の外側 = 室外表面（その層の表面）
      displayLabel = `【室外側】${currentLayerName} 表面`;
    } else {
      // 中間界面は「次の層の表面（現在の層の裏面でもある）」が正しい
      const nextLayerName = layerDetails[idx + 1]?.name || '不明';
      displayLabel = `${nextLayerName} 表面（${currentLayerName} 裏面）`;
    }

    points.push({
      distance: currentDist,
      temp: Tx,
      dewPoint: Tdx,
      pressure: Px,
      satPressure: Px_sat,
      layerName: layer.name,
      displayLabel,
      isBonded: layer.isBonded,
      isIce: Tx < 0
    });
  });

  return { uValue: U, rTotal: R_total, points, isCondensing, condensationLayerIndex, limitOutdoorTemp: null, layerDetails };
};

const findWinterLimitTemp = (layers: Layer[], ti: number, rhi: number, rhe: number, rsi: number, rse: number, materials: Material[]): number | null => {
  let low = -30; 
  let high = ti;
  let safeTemp = ti;
  for(let i = 0; i < 15; i++){
    const mid = (low + high) / 2;
    const res = calculateProfile(layers, ti, rhi, mid, rhe, rsi, rse, materials);
    if (res.isCondensing) low = mid; 
    else { safeTemp = mid; high = mid; }
  }
  return safeTemp > -29 ? safeTemp : null;
};

// --- コンポーネント ---

interface MultiLayerCondensationProps {
  hideHeader?: boolean;
}

const MultiLayerCondensation: React.FC<MultiLayerCondensationProps> = ({ hideHeader }) => {
  const { isLoggedIn } = useAuth();
  
  const [showSettings, setShowSettings] = useState(false); // 設定条件モーダル
  const [showMaterialSettings, setShowMaterialSettings] = useState(false); // 材料DB設定
  const [showPsychrometric, setShowPsychrometric] = useState(false); // 空気線図モーダル
  const [showReport, setShowReport] = useState(true); 
  const [presetKey, setPresetKey] = useState<string>('wall_wood');
  const [presetType, setPresetType] = useState<string>('wall');
  const [direction, setDirection] = useState<'out_in' | 'in_out'>('out_in');
  const [tableDirection, setTableDirection] = useState<'out_in' | 'in_out'>('out_in');
  const [graphMode, setGraphMode] = useState<'temp-dew' | 'pressure'>('temp-dew');
  
  const [materialDB, setMaterialDB] = useState<Material[]>(DEFAULT_MATERIAL_DB);

  // ドラッグ&ドロップ用State
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // 新規材料State
  const [newMatCategory, setNewMatCategory] = useState('');
  const [newMatName, setNewMatName] = useState('');
  const [newMatLambda, setNewMatLambda] = useState('0.038');
  const [newMatMu, setNewMatMu] = useState('1');

  // 計算パラメータ
  const [rsi, setRsi] = useState(0.11);
  const [rse, setRse] = useState(0.04);
  const [ti, setTi] = useState(22);
  const [rhi, setRhi] = useState(50);
  const [te, setTe] = useState(0);
  const [rhe, setRhe] = useState(80);
  
  const [layers, setLayers] = useState<Layer[]>([]);

  useEffect(() => {
    try {
      const savedMaterials = localStorage.getItem('userMaterialDB');
      if (savedMaterials) setMaterialDB(JSON.parse(savedMaterials));
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('userMaterialDB', JSON.stringify(materialDB));
    } catch (e) {}
  }, [materialDB]);

  const availableCategories = useMemo(() => {
    const cats = new Set(materialDB.map(m => m.category));
    return Array.from(cats);
  }, [materialDB]);

  const getAllowedCategories = (type: string) => {
    const defaults: Record<string, string[]> = {
      'wall': ['finish', 'air', 'membrane', 'structure', 'insulation', 'board'],
      'roof': ['roof', 'air', 'membrane', 'structure', 'insulation', 'board', 'finish'],
      'floor': ['floor', 'structure', 'insulation', 'membrane', 'air', 'board'],
      'foundation': ['structure', 'insulation', 'finish', 'air'],
    };
    const allowed = defaults[type] || [];
    const customCats = availableCategories.filter(c => !Object.keys(DEFAULT_CATEGORY_LABELS).includes(c));
    return [...allowed, ...customCats];
  };

  useEffect(() => {
    loadPreset('wall_wood');
  }, []);

  const loadPreset = (key: string) => {
    const p = PRESETS[key];
    if (p) {
      setPresetKey(key);
      setPresetType(p.type);
      setRsi(p.rsi);
      setRse(p.rse);
      setLayers(p.layers.map((l, i) => ({ ...l, id: Date.now().toString() + i })));
    }
  };

  const result = useMemo(() => {
    const res = calculateProfile(layers, ti, rhi, te, rhe, rsi, rse, materialDB);
    const limit = (ti > te) ? findWinterLimitTemp(layers, ti, rhi, rhe, rsi, rse, materialDB) : null;
    return { ...res, limitOutdoorTemp: limit };
  }, [layers, ti, rhi, te, rhe, rsi, rse, materialDB]);

  const updateLayerMaterial = (realIndex: number, newMaterialId: string) => {
    if (!isLoggedIn) return;
    const newLayers = [...layers];
    newLayers[realIndex] = { ...newLayers[realIndex], materialId: newMaterialId };
    setLayers(newLayers);
  };
  
  const updateLayerCategory = (realIndex: number, newCategory: MaterialCategory) => {
    if (!isLoggedIn) return;
    if (newCategory === '') return;
    const firstMat = materialDB.find(m => m.category === newCategory);
    if (firstMat) updateLayerMaterial(realIndex, firstMat.id);
  };

  const updateLayerThickness = (realIndex: number, val: number | string) => {
    if (!isLoggedIn) return;
    const newLayers = [...layers];
    const numVal = val === '' ? '' : Number(val);
    newLayers[realIndex] = { ...newLayers[realIndex], thickness: numVal };
    setLayers(newLayers);
  };

  const updateLayerBonded = (realIndex: number, isBonded: boolean) => {
    if (!isLoggedIn) return;
    const newLayers = [...layers];
    newLayers[realIndex] = { ...newLayers[realIndex], isBonded };
    setLayers(newLayers);
  };

  const addLayer = () => {
    if (!isLoggedIn) return;
    setLayers([{ id: Date.now().toString(), materialId: '', thickness: '' }, ...layers]);
  };

  const removeLayer = (realIndex: number) => {
    if (!isLoggedIn) return;
    const newLayers = [...layers];
    newLayers.splice(realIndex, 1);
    setLayers(newLayers);
  };

  // --- ドラッグ&ドロップのハンドラ ---
  const handleDragStart = (e: React.DragEvent, index: number) => {
      if (!isLoggedIn) return;
      setDragIndex(index);
      e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === dropIndex) {
          setDragIndex(null);
          return;
      }

      const newLayers = [...layers];
      const draggedItem = newLayers[dragIndex];
      
      // 移動処理
      newLayers.splice(dragIndex, 1);
      newLayers.splice(dropIndex, 0, draggedItem);
      
      setLayers(newLayers);
      setDragIndex(null);
  };

  const handleDragEnd = () => {
      // ドラッグが終了した時（成功・失敗に関わらず）に状態をリセット
      setDragIndex(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleHumidityChange = (setter: React.Dispatch<React.SetStateAction<number>>, val: string) => {
    let num = Number(val);
    if (num > 100) num = 100;
    if (num < 0) num = 0;
    setter(num);
  };

  const updateMaterialValue = (id: string, field: keyof Material, value: string | number) => {
    setMaterialDB(prev => prev.map(m => {
      if (m.id === id) {
        return { ...m, [field]: value };
      }
      return m;
    }));
  };

  const addNewMaterial = () => {
    if (!newMatName || !newMatCategory) return;
    const newId = `custom_${Date.now()}`;
    const newMaterial: Material = {
      id: newId,
      name: newMatName,
      category: newMatCategory,
      lambda: parseFloat(newMatLambda) || 0.038,
      mu: parseFloat(newMatMu) || 1,
    };
    setMaterialDB([...materialDB, newMaterial]);
    setNewMatName('');
    setNewMatLambda('0.038');
    setNewMatMu('1');
  };

  const resetMaterials = () => {
    if (confirm('すべての材料設定を初期値に戻しますか？')) {
      setMaterialDB(DEFAULT_MATERIAL_DB);
    }
  };

  const displayLayers = useMemo(() => {
    if (direction === 'out_in') return layers.map((l, i) => ({ layer: l, realIndex: i }));
    return layers.map((l, i) => ({ layer: l, realIndex: i })).reverse();
  }, [layers, direction]);

  // --- 高機能・空気線図コンポーネント ---
  const PsychrometricChartView = () => {
    // 描画範囲設定 (X:温度 -10~50℃, Y:絶対湿度 0~0.040kg/kg)
    const minT = -10;
    const maxT = 50;
    const rangeT = maxT - minT;
    const maxAbsHum = 0.040; // 40g/kg(DA)

    // 座標変換ヘルパー
    const toPxX = (t: number) => ((t - minT) / rangeT) * 100;
    const toPxY = (x: number) => 100 - (x / maxAbsHum) * 100;

    // --- 計算ヘルパー (Chart用) ---
    // エンタルピー h [kJ/kg]
    // h = 1.006*t + (2501 + 1.805*t)*x
    const getEnthalpy = (t: number, x: number) => {
        return 1.006 * t + (2501 + 1.805 * t) * x;
    };

    // 特定のエンタルピー h における、温度 t に対する絶対湿度 x を求める
    // x = (h - 1.006*t) / (2501 + 1.805*t)
    const getXFromEnthalpy = (t: number, h: number) => {
        return (h - 1.006 * t) / (2501 + 1.805 * t);
    };

    // 比容積 v [m3/kg]
    // v = (Ra * T) / P * (1 + 1.6078 * x)
    // T = t + 273.15, P = 101325, Ra = 287
    const getSpecificVolume = (t: number, x: number) => {
        const T = t + 273.15;
        const P = 101325;
        const Ra = 287;
        return (Ra * T / P) * (1 + 1.6078 * x);
    };

    // 特定の比容積 v における、温度 t に対する絶対湿度 x を求める
    // x = ( (v * P) / (Ra * T) - 1 ) / 1.6078
    const getXFromVolume = (t: number, v: number) => {
        const T = t + 273.15;
        const P = 101325;
        const Ra = 287;
        return ((v * P) / (Ra * T) - 1) / 1.6078;
    };

    // パス生成: 相対湿度曲線
    const generateRhPath = (rh: number) => {
        let path = `M ${toPxX(minT)},${toPxY(getAbsoluteHumidity(minT, rh))}`;
        for (let t = minT + 1; t <= maxT; t += 1) {
            const x = getAbsoluteHumidity(t, rh);
            if (x > maxAbsHum) break; 
            path += ` L ${toPxX(t)},${toPxY(x)}`;
        }
        return path;
    };

    // パス生成: 等エンタルピー線 (h: -10 ~ 120 kJ/kg)
    const generateEnthalpyPaths = (): JSX.Element[] => {
        const paths: JSX.Element[] = [];
        // 5kJ/kg刻み
        for (let h = -10; h <= 120; h += 5) {
            let d = "";
            let started = false;
            for (let t = minT; t <= maxT; t += 1) {
                const x = getXFromEnthalpy(t, h);
                // 飽和状態(RH100%)を超えたら描画しない（本来は霧域だがチャートとしてはカットが一般的）
                const satX = getAbsoluteHumidity(t, 100);
                
                if (x >= 0 && x <= maxAbsHum && x <= satX) {
                    const px = toPxX(t);
                    const py = toPxY(x);
                    if (!started) {
                        d += `M ${px},${py}`;
                        started = true;
                    } else {
                        d += ` L ${px},${py}`;
                    }
                }
            }
            if (d !== "") paths.push(<path key={`h-${h}`} d={d} fill="none" stroke="#fca5a5" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />);
        }
        return paths;
    };

    // パス生成: 等比容積線 (v: 0.75 ~ 0.95 m3/kg)
    const generateVolumePaths = (): JSX.Element[] => {
        const paths: JSX.Element[] = [];
        // 0.01 m3/kg刻み
        for (let v = 75; v <= 95; v += 1) {
            const vol = v / 100;
            let d = "";
            let started = false;
            for (let t = minT; t <= maxT; t += 1) {
                const x = getXFromVolume(t, vol);
                const satX = getAbsoluteHumidity(t, 100);
                if (x >= 0 && x <= maxAbsHum && x <= satX) {
                    const px = toPxX(t);
                    const py = toPxY(x);
                    if (!started) {
                        d += `M ${px},${py}`;
                        started = true;
                    } else {
                        d += ` L ${px},${py}`;
                    }
                }
            }
             if (d !== "") paths.push(<path key={`v-${vol}`} d={d} fill="none" stroke="#86efac" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />);
        }
        return paths;
    };

    const indoorPt = { x: toPxX(ti), y: toPxY(getAbsoluteHumidity(ti, rhi)) };
    const outdoorPt = { x: toPxX(te), y: toPxY(getAbsoluteHumidity(te, rhe)) };

    return (
        <div className="relative w-full h-[500px] bg-white border border-gray-200 rounded p-4 overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                
                {/* 1. 等比容積線 (緑) */}
                {generateVolumePaths()}

                {/* 2. 等エンタルピー線 (赤) - 湿球温度線と近似 */}
                {generateEnthalpyPaths()}

                {/* 3. グリッド (温度 - 乾球温度) */}
                {[...Array(13)].map((_, i) => {
                    const t = minT + i * 5; // 5度刻み
                    return (
                        <g key={`gt-${t}`}>
                            <line x1={toPxX(t)} y1="0" x2={toPxX(t)} y2="100" stroke="#eee" strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
                            {t % 10 === 0 && <text x={toPxX(t)} y="99" fontSize="2.5" fill="#666" textAnchor="middle">{t}</text>}
                        </g>
                    )
                })}
                {/* 4. グリッド (絶対湿度) */}
                {[...Array(9)].map((_, i) => {
                    const x = i * 0.005; // 0.005刻み
                    return (
                        <g key={`gx-${x}`}>
                            <line x1="0" y1={toPxY(x)} x2="100" y2={toPxY(x)} stroke="#eee" strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
                            <text x="100" y={toPxY(x) - 0.5} fontSize="2.5" fill="#666" textAnchor="end">{(x * 1000).toFixed(0)}</text>
                        </g>
                    )
                })}

                {/* 5. 相対湿度曲線 (青系) */}
                {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(rh => (
                    <g key={`rh-${rh}`}>
                         <path d={generateRhPath(rh)} fill="none" stroke="#93c5fd" strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
                         {/* ラベル (30℃付近に配置) */}
                         <text x={toPxX(35)} y={toPxY(getAbsoluteHumidity(35, rh)) - 0.5} fontSize="2" fill="#93c5fd">{rh}%</text>
                    </g>
                ))}
                
                {/* 6. 100%飽和曲線 (太線) */}
                <path d={generateRhPath(100)} fill="none" stroke="#2563eb" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                <text x={toPxX(30)} y={toPxY(getAbsoluteHumidity(30, 100)) - 1} fontSize="2.5" fill="#2563eb" fontWeight="bold">飽和曲線</text>

                {/* プロット: 室内・室外ポイント */}
                <line x1={indoorPt.x} y1={indoorPt.y} x2={outdoorPt.x} y2={outdoorPt.y} stroke="#333" strokeWidth="0.8" strokeDasharray="1 1" vectorEffect="non-scaling-stroke"/>
                
                <circle cx={indoorPt.x} cy={indoorPt.y} r="1" fill="red" stroke="white" strokeWidth="0.2" />
                <text x={indoorPt.x} y={indoorPt.y - 2} fontSize="3" fill="red" textAnchor="middle" fontWeight="bold" style={{textShadow: "0px 0px 2px white"}}>室内</text>

                <circle cx={outdoorPt.x} cy={outdoorPt.y} r="1" fill="blue" stroke="white" strokeWidth="0.2" />
                <text x={outdoorPt.x} y={outdoorPt.y + 4} fontSize="3" fill="blue" textAnchor="middle" fontWeight="bold" style={{textShadow: "0px 0px 2px white"}}>室外</text>
            </svg>
            
            {/* 凡例・軸ラベル */}
            <div className="absolute top-2 left-2 text-xs text-gray-500 bg-white/80 p-1 rounded border border-gray-100">
                <div><span className="inline-block w-3 h-0.5 bg-blue-500 mr-1"></span>相対湿度</div>
                <div><span className="inline-block w-3 h-0.5 bg-red-300 mr-1"></span>エンタルピー</div>
                <div><span className="inline-block w-3 h-0.5 bg-green-300 mr-1"></span>比容積</div>
            </div>
            <div className="absolute top-2 right-2 text-xs text-gray-500 text-right">↑ 絶対湿度 x [g/kg(DA)]</div>
            <div className="absolute bottom-1 right-1/2 translate-x-1/2 text-xs text-gray-500">乾球温度 DB [℃] →</div>
        </div>
    );
  };

  const GraphView = () => {
    if (!result || result.points.length === 0) return null;
    
    const pts = result.points;
    const maxDist = pts[pts.length - 1].distance;

    // グラフ描画領域設定 (単位: %)
    const ZONE_WIDTH = 15; 
    const WALL_WIDTH = 100 - (ZONE_WIDTH * 2);

    const toX = (d: number) => {
        const ratio = d / maxDist;
        if (direction === 'out_in') return (ZONE_WIDTH + WALL_WIDTH) - (ratio * WALL_WIDTH);
        return ZONE_WIDTH + (ratio * WALL_WIDTH);
    };
    
    // graphModeに応じたY軸の計算
    let toY: (val: number) => number;
    let toYTemp: (val: number) => number; // pressureモード用の温度軸
    let minVal: number, maxVal: number, rangeVal: number;
    let minTemp: number, maxTemp: number, rangeTemp: number;
    let unitLabel: string;
    let formatValue: (val: number) => string;

    if (graphMode === 'pressure') {
      // 圧力モード: Pa単位（主軸）+ 温度単位（副軸）
      const pressures = pts.map(p => p.pressure).concat(pts.map(p => p.satPressure));
      const allPressures = [...pressures, getSatPressure(ti) * (rhi/100), getSatPressure(te) * (rhe/100)];
      maxVal = Math.ceil(Math.max(...allPressures) / 100) * 100 + 100;
      minVal = Math.floor(Math.min(...allPressures) / 100) * 100 - 100;
      rangeVal = maxVal - minVal;
      toY = (p: number) => 100 - ((p - minVal) / rangeVal) * 100;
      
      // 温度軸の計算（右側に表示）
      const temps = pts.map(p => p.temp);
      const allTemps = [...temps, ti, te];
      maxTemp = Math.ceil(Math.max(...allTemps) / 5) * 5 + 5;
      minTemp = Math.floor(Math.min(...allTemps) / 5) * 5 - 5;
      rangeTemp = maxTemp - minTemp;
      toYTemp = (t: number) => 100 - ((t - minTemp) / rangeTemp) * 100;
      
      unitLabel = 'Pa';
      formatValue = (val: number) => Math.round(val).toString();
    } else {
      // temp-dew モード: 温度単位
      const temps = pts.map(p => p.temp).concat(pts.map(p => p.dewPoint));
      const allTemps = [...temps, ti, te];
      maxVal = Math.ceil(Math.max(...allTemps) / 5) * 5 + 5;
      minVal = Math.floor(Math.min(...allTemps) / 5) * 5 - 5;
      rangeVal = maxVal - minVal;
      toY = (t: number) => 100 - ((t - minVal) / rangeVal) * 100;
      toYTemp = toY; // 使用しないが定義しておく
      minTemp = minVal;
      maxTemp = maxVal;
      rangeTemp = rangeVal;
      unitLabel = '℃';
      formatValue = (val: number) => Math.round(val).toString();
    }
    
    const indoorDew = getDewPoint(getSatPressure(ti) * (rhi/100));
    const outdoorDew = getDewPoint(getSatPressure(te) * (rhe/100));
    const indoorPressure = getSatPressure(ti) * (rhi/100);
    const outdoorPressure = getSatPressure(te) * (rhe/100);
    const indoorSatPressure = getSatPressure(ti);
    const outdoorSatPressure = getSatPressure(te);

    let leftAirVal1, leftAirVal2, rightAirVal1, rightAirVal2, leftSurfX, rightSurfX;
    let leftAirTemp, rightAirTemp;
    
    if (graphMode === 'pressure') {
      if (direction === 'out_in') {
        leftAirVal1 = outdoorPressure; leftAirVal2 = outdoorSatPressure;
        rightAirVal1 = indoorPressure; rightAirVal2 = indoorSatPressure;
        leftAirTemp = te; rightAirTemp = ti;
      } else {
        leftAirVal1 = indoorPressure; leftAirVal2 = indoorSatPressure;
        rightAirVal1 = outdoorPressure; rightAirVal2 = outdoorSatPressure;
        leftAirTemp = ti; rightAirTemp = te;
      }
    } else {
      if (direction === 'out_in') {
        leftAirVal1 = te; leftAirVal2 = outdoorDew;
        rightAirVal1 = ti; rightAirVal2 = indoorDew;
      } else {
        leftAirVal1 = ti; leftAirVal2 = indoorDew;
        rightAirVal1 = te; rightAirVal2 = outdoorDew;
      }
    }
    leftSurfX = ZONE_WIDTH; rightSurfX = 100 - ZONE_WIDTH;

    const visualPoints = pts.map((p, ptsIndex) => ({
        x: toX(p.distance),
        val1: graphMode === 'pressure' ? p.pressure : p.temp,
        val2: graphMode === 'pressure' ? p.satPressure : p.dewPoint,
        temp: p.temp, // pressureモードでも温度を保持
        dist: p.distance,
        ptsIndex: ptsIndex, 
        layerName: p.layerName
    })).sort((a, b) => a.x - b.x);
    
    const getMaterialFromLayerName = (layerName: string | undefined) => {
        if (!layerName || layerName === '室内表面' || layerName === '室外表面') return null;
        return materialDB.find(m => m.name === layerName);
    };

    const pathVal1Full = `
        M 0,${toY(leftAirVal1)} L ${leftSurfX},${toY(leftAirVal1)} L ${leftSurfX},${toY(visualPoints[0].val1)}
        ${visualPoints.map(p => `L ${p.x},${toY(p.val1)}`).join(' ')}
        L ${rightSurfX},${toY(visualPoints[visualPoints.length - 1].val1)} L ${rightSurfX},${toY(rightAirVal1)} L 100,${toY(rightAirVal1)}
    `;

    const pathVal2Full = `
        M 0,${toY(leftAirVal2)} L ${leftSurfX},${toY(leftAirVal2)} L ${leftSurfX},${toY(visualPoints[0].val2)}
        ${visualPoints.map(p => `L ${p.x},${toY(p.val2)}`).join(' ')}
        L ${rightSurfX},${toY(visualPoints[visualPoints.length - 1].val2)} L ${rightSurfX},${toY(rightAirVal2)} L 100,${toY(rightAirVal2)}
    `;

    // pressureモード用の温度勾配パス
    const pathTempFull = graphMode === 'pressure' ? `
        M 0,${toYTemp(leftAirTemp!)} L ${leftSurfX},${toYTemp(leftAirTemp!)} L ${leftSurfX},${toYTemp(visualPoints[0].temp)}
        ${visualPoints.map(p => `L ${p.x},${toYTemp(p.temp)}`).join(' ')}
        L ${rightSurfX},${toYTemp(visualPoints[visualPoints.length - 1].temp)} L ${rightSurfX},${toYTemp(rightAirTemp!)} L 100,${toYTemp(rightAirTemp!)}
    ` : '';

    return (
      <div className="relative h-64 w-full bg-white overflow-hidden select-none print:h-80 print:bg-white print:overflow-visible">
        <div className="absolute inset-0 pointer-events-none text-[10px] text-gray-600 print:text-black z-10">
          {[0, 25, 50, 75, 100].map(y => (
             <div key={y} className="absolute w-full print:border-gray-800" style={{ top: `${y}%`, borderTop: '0.4px solid #9ca3af' }}>
               <span className="absolute -top-2 right-0 text-gray-600 print:text-black pr-1">{formatValue(minVal + (rangeVal * (100-y)/100))}{unitLabel}</span>
               {graphMode === 'pressure' && (
                 <span className="absolute -top-2 left-0 text-gray-600 print:text-black pl-1">{Math.round(minTemp + (rangeTemp * (100-y)/100))}℃</span>
               )}
             </div>
          ))}
          <div className="absolute font-bold text-gray-600 print:text-black" style={{ top: '10px', left: `${ZONE_WIDTH / 2}%`, transform: 'translateX(-50%)' }}>
              {direction === 'out_in' ? '室外' : '室内'}
          </div>
          <div className="absolute font-bold text-gray-600 print:text-black" style={{ top: '10px', left: `${100 - ZONE_WIDTH / 2}%`, transform: 'translateX(-50%)' }}>
              {direction === 'out_in' ? '室内' : '室外'}
          </div>
        </div>

        <svg className="absolute inset-0 w-full h-full print:block" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            {graphMode !== 'pressure' && minVal < 0 && <rect x="0" y={toY(0)} width="100" height={100 - toY(0)} fill="#f0f9ff" opacity="0.5" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />}
            <rect x="0" y="0" width={ZONE_WIDTH} height="100" fill="#f9fafb" opacity="0.5" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
            <rect x={100-ZONE_WIDTH} y="0" width={ZONE_WIDTH} height="100" fill="#f9fafb" opacity="0.5" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
            
            {visualPoints.map((p, i) => {
                if (i === visualPoints.length - 1) return null;
                const nextP = visualPoints[i+1];
                const xStart = Math.min(p.x, nextP.x);
                const xEnd = Math.max(p.x, nextP.x);
                if (p.layerName && p.layerName !== '室内表面' && p.layerName !== '室外表面') {
                    const material = getMaterialFromLayerName(p.layerName);
                    if (material?.category === 'insulation') {
                        return <rect key={`bg-${i}`} x={xStart} y="0" width={xEnd - xStart} height="100" fill="#fef3c7" opacity="0.3" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />;
                    }
                }
                return null;
            })}

            <rect x="0" y="0" width="100" height="100" fill="none" stroke="#000000" strokeWidth="1" vectorEffect="non-scaling-stroke" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
            <line x1={ZONE_WIDTH} y1="0" x2={ZONE_WIDTH} y2="100" stroke="#000000" strokeWidth="1" vectorEffect="non-scaling-stroke" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
            <line x1={100-ZONE_WIDTH} y1="0" x2={100-ZONE_WIDTH} y2="100" stroke="#000000" strokeWidth="1" vectorEffect="non-scaling-stroke" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />

            {visualPoints.map((p, i) => {
                if (i === 0 || i === visualPoints.length - 1) return null;
                return <line key={i} x1={p.x} y1="0" x2={p.x} y2="100" stroke="#666666" strokeDasharray="4 2" strokeWidth="0.5" vectorEffect="non-scaling-stroke" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />;
            })}

            <path d={pathVal2Full} fill="none" stroke={graphMode === 'pressure' ? "#cc0000" : "#0066cc"} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
            <path d={pathVal1Full} fill="none" stroke={graphMode === 'pressure' ? "#0066cc" : "#cc0000"} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
            {graphMode === 'pressure' && pathTempFull && (
                <path d={pathTempFull} fill="none" stroke="#ff6600" strokeWidth="2" strokeLinejoin="round" strokeDasharray="4 2" vectorEffect="non-scaling-stroke" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
            )}
        </svg>

        <div className="absolute inset-0 w-full h-full pointer-events-none">
            {visualPoints.map((p, i) => {
                if (i === visualPoints.length - 1) return null;
                const nextP = visualPoints[i+1];
                const xCenter = (p.x + nextP.x) / 2;
                let displayNum: number | null = null;
                if (p.ptsIndex !== 0) {
                    if (direction === 'out_in') {
                        const layerIndexFromIn = p.ptsIndex - 1;
                        displayNum = layers.length - layerIndexFromIn;
                    } else {
                        const layerIndexFromIn = p.ptsIndex - 1;
                        displayNum = i + 1;
                    }
                }
                if(displayNum === null) return null;
                return (
                    <div key={`num-${i}`} className="absolute text-[10px] font-bold text-gray-600 text-center" style={{ left: `${xCenter}%`, top: '10px', transform: 'translateX(-50%)' }}>{displayNum}</div>
                );
            })}

            {visualPoints.map((p, i) => {
                const orgPt = pts.find(pt => pt.distance === p.dist);
                if (!orgPt) return null;

                const displayVal1 = graphMode === 'pressure' ? Math.round(p.val1) : p.val1.toFixed(1);
                const displayVal2 = graphMode === 'pressure' ? Math.round(p.val2) : p.val2.toFixed(1);

                return (
                    <React.Fragment key={`point-label-${i}`}>
                        <div className={`absolute w-1.5 h-1.5 rounded-full border border-white ${graphMode === 'pressure' ? 'bg-blue-500' : 'bg-red-500'}`} style={{ left: `${p.x}%`, top: `${toY(p.val1)}%`, transform: 'translate(-50%, -50%)' }} />
                        <div className={`absolute text-[9px] font-bold bg-white/80 px-0.5 rounded shadow-sm leading-none ${graphMode === 'pressure' ? 'text-blue-600' : 'text-red-600'}`} style={{ left: `${p.x}%`, top: `${toY(p.val1)}%`, transform: 'translate(4px, -8px)' }}>{displayVal1}{unitLabel}</div>
                        <div className={`absolute w-1.5 h-1.5 rounded-full border border-white ${graphMode === 'pressure' ? 'bg-red-500' : 'bg-blue-500'}`} style={{ left: `${p.x}%`, top: `${toY(p.val2)}%`, transform: 'translate(-50%, -50%)' }} />
                        <div className={`absolute text-[9px] font-bold bg-white/80 px-0.5 rounded shadow-sm leading-none ${graphMode === 'pressure' ? 'text-red-600' : 'text-blue-600'}`} style={{ left: `${p.x}%`, top: `${toY(p.val2)}%`, transform: 'translate(4px, 4px)' }}>{displayVal2}{unitLabel}</div>
                        {graphMode === 'pressure' && (
                            <>
                                <div className="absolute w-1.5 h-1.5 rounded-full bg-orange-500 border border-white" style={{ left: `${p.x}%`, top: `${toYTemp(p.temp)}%`, transform: 'translate(-50%, -50%)' }} />
                                <div className="absolute text-[9px] font-bold text-orange-600 bg-white/80 px-0.5 rounded shadow-sm leading-none" style={{ left: `${p.x}%`, top: `${toYTemp(p.temp)}%`, transform: 'translate(4px, -8px)' }}>{p.temp.toFixed(1)}℃</div>
                            </>
                        )}
                    </React.Fragment>
                );
            })}

            {result.isCondensing && graphMode !== 'pressure' && visualPoints.map((p, i) => {
                 const orgPt = pts.find(pt => pt.distance === p.dist);
                 if (orgPt && orgPt.pressure > orgPt.satPressure + 1) {
                     return <div key={`risk-${i}`} className="absolute rounded-full bg-red-600 opacity-60 animate-pulse" style={{ left: `${p.x}%`, top: `${toY(p.val1)}%`, width: '12px', height: '12px', transform: 'translate(-50%, -50%)', zIndex: 20 }} />;
                 }
                 return null;
             })}
        </div>
      </div>
    );
  };

  // 印刷用グラフコンポーネント
  const PrintGraphView: React.FC<{
    result: CalcResult;
    ti: number;
    rhi: number;
    te: number;
    rhe: number;
    materialDB: Material[];
    direction: 'out_in' | 'in_out';
    graphMode: 'temp-dew' | 'pressure';
  }> = ({ result, ti, rhi, te, rhe, materialDB, direction, graphMode }) => {
    if (!result || result.points.length === 0) return null;
    
    const pts = result.points;
    const maxDist = pts[pts.length - 1].distance;

    const ZONE_WIDTH = 15; 
    const WALL_WIDTH = 100 - (ZONE_WIDTH * 2);

    const toX = (d: number) => {
        const ratio = d / maxDist;
        if (direction === 'out_in') return (ZONE_WIDTH + WALL_WIDTH) - (ratio * WALL_WIDTH);
        return ZONE_WIDTH + (ratio * WALL_WIDTH);
    };
    
    // graphModeに応じたY軸の計算
    let toY: (val: number) => number;
    let toYTemp: (val: number) => number; // pressureモード用の温度軸
    let minVal: number, maxVal: number, rangeVal: number;
    let minTemp: number, maxTemp: number, rangeTemp: number;
    let unitLabel: string;
    let formatValue: (val: number) => string;

    if (graphMode === 'pressure') {
      // 圧力モード: Pa単位（主軸）+ 温度単位（副軸）
      const pressures = pts.map(p => p.pressure).concat(pts.map(p => p.satPressure));
      const allPressures = [...pressures, getSatPressure(ti) * (rhi/100), getSatPressure(te) * (rhe/100)];
      maxVal = Math.ceil(Math.max(...allPressures) / 100) * 100 + 100;
      minVal = Math.floor(Math.min(...allPressures) / 100) * 100 - 100;
      rangeVal = maxVal - minVal;
      toY = (p: number) => 100 - ((p - minVal) / rangeVal) * 100;
      
      // 温度軸の計算（右側に表示）
      const temps = pts.map(p => p.temp);
      const allTemps = [...temps, ti, te];
      maxTemp = Math.ceil(Math.max(...allTemps) / 5) * 5 + 5;
      minTemp = Math.floor(Math.min(...allTemps) / 5) * 5 - 5;
      rangeTemp = maxTemp - minTemp;
      toYTemp = (t: number) => 100 - ((t - minTemp) / rangeTemp) * 100;
      
      unitLabel = 'Pa';
      formatValue = (val: number) => Math.round(val).toString();
    } else {
      // temp-dew モード: 温度単位
      const temps = pts.map(p => p.temp).concat(pts.map(p => p.dewPoint));
      const allTemps = [...temps, ti, te];
      maxVal = Math.ceil(Math.max(...allTemps) / 5) * 5 + 5;
      minVal = Math.floor(Math.min(...allTemps) / 5) * 5 - 5;
      rangeVal = maxVal - minVal;
      toY = (t: number) => 100 - ((t - minVal) / rangeVal) * 100;
      toYTemp = toY; // 使用しないが定義しておく
      minTemp = minVal;
      maxTemp = maxVal;
      rangeTemp = rangeVal;
      unitLabel = '℃';
      formatValue = (val: number) => Math.round(val).toString();
    }
    
    const indoorDew = getDewPoint(getSatPressure(ti) * (rhi/100));
    const outdoorDew = getDewPoint(getSatPressure(te) * (rhe/100));
    const indoorPressure = getSatPressure(ti) * (rhi/100);
    const outdoorPressure = getSatPressure(te) * (rhe/100);
    const indoorSatPressure = getSatPressure(ti);
    const outdoorSatPressure = getSatPressure(te);

    let leftAirVal1, leftAirVal2, rightAirVal1, rightAirVal2, leftSurfX, rightSurfX;
    let leftAirTemp, rightAirTemp;
    
    if (graphMode === 'pressure') {
      if (direction === 'out_in') {
        leftAirVal1 = outdoorPressure; leftAirVal2 = outdoorSatPressure;
        rightAirVal1 = indoorPressure; rightAirVal2 = indoorSatPressure;
        leftAirTemp = te; rightAirTemp = ti;
      } else {
        leftAirVal1 = indoorPressure; leftAirVal2 = indoorSatPressure;
        rightAirVal1 = outdoorPressure; rightAirVal2 = outdoorSatPressure;
        leftAirTemp = ti; rightAirTemp = te;
      }
    } else {
      if (direction === 'out_in') {
        leftAirVal1 = te; leftAirVal2 = outdoorDew;
        rightAirVal1 = ti; rightAirVal2 = indoorDew;
      } else {
        leftAirVal1 = ti; leftAirVal2 = indoorDew;
        rightAirVal1 = te; rightAirVal2 = outdoorDew;
      }
    }
    leftSurfX = ZONE_WIDTH; rightSurfX = 100 - ZONE_WIDTH;

    const visualPoints = pts.map((p, ptsIndex) => ({
        x: toX(p.distance),
        val1: graphMode === 'pressure' ? p.pressure : p.temp,
        val2: graphMode === 'pressure' ? p.satPressure : p.dewPoint,
        temp: p.temp, // pressureモードでも温度を保持
        dist: p.distance,
        ptsIndex: ptsIndex, 
        layerName: p.layerName
    })).sort((a, b) => a.x - b.x);
    
    const getMaterialFromLayerName = (layerName: string | undefined) => {
        if (!layerName || layerName === '室内表面' || layerName === '室外表面') return null;
        return materialDB.find(m => m.name === layerName);
    };

    const pathVal1Full = `
        M 0,${toY(leftAirVal1)} L ${leftSurfX},${toY(leftAirVal1)} L ${leftSurfX},${toY(visualPoints[0].val1)}
        ${visualPoints.map(p => `L ${p.x},${toY(p.val1)}`).join(' ')}
        L ${rightSurfX},${toY(visualPoints[visualPoints.length - 1].val1)} L ${rightSurfX},${toY(rightAirVal1)} L 100,${toY(rightAirVal1)}
    `;

    const pathVal2Full = `
        M 0,${toY(leftAirVal2)} L ${leftSurfX},${toY(leftAirVal2)} L ${leftSurfX},${toY(visualPoints[0].val2)}
        ${visualPoints.map(p => `L ${p.x},${toY(p.val2)}`).join(' ')}
        L ${rightSurfX},${toY(visualPoints[visualPoints.length - 1].val2)} L ${rightSurfX},${toY(rightAirVal2)} L 100,${toY(rightAirVal2)}
    `;

    // pressureモード用の温度勾配パス
    const pathTempFull = graphMode === 'pressure' ? `
        M 0,${toYTemp(leftAirTemp!)} L ${leftSurfX},${toYTemp(leftAirTemp!)} L ${leftSurfX},${toYTemp(visualPoints[0].temp)}
        ${visualPoints.map(p => `L ${p.x},${toYTemp(p.temp)}`).join(' ')}
        L ${rightSurfX},${toYTemp(visualPoints[visualPoints.length - 1].temp)} L ${rightSurfX},${toYTemp(rightAirTemp!)} L 100,${toYTemp(rightAirTemp!)}
    ` : '';

    return (
      <div className="relative w-full h-64 bg-white border border-black">
        <div className="absolute inset-0 pointer-events-none text-[10px] text-black z-10">
          {[0, 25, 50, 75, 100].map(y => (
             <div key={y} className="absolute w-full" style={{ top: `${y}%`, borderTop: '1px solid #666' }}>
               <span className="absolute -top-2 right-0 text-black pr-1">{formatValue(minVal + (rangeVal * (100-y)/100))}{unitLabel}</span>
               {graphMode === 'pressure' && (
                 <span className="absolute -top-2 left-0 text-black pl-1">{Math.round(minTemp + (rangeTemp * (100-y)/100))}℃</span>
               )}
             </div>
          ))}
          <div className="absolute font-bold text-black" style={{ top: '10px', left: `${ZONE_WIDTH / 2}%`, transform: 'translateX(-50%)' }}>
              {direction === 'out_in' ? '室外' : '室内'}
          </div>
          <div className="absolute font-bold text-black" style={{ top: '10px', left: `${100 - ZONE_WIDTH / 2}%`, transform: 'translateX(-50%)' }}>
              {direction === 'out_in' ? '室内' : '室外'}
          </div>
        </div>

        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {graphMode !== 'pressure' && minVal < 0 && <rect x="0" y={toY(0)} width="100" height={100 - toY(0)} fill="#f0f9ff" opacity="0.5" />}
            <rect x="0" y="0" width={ZONE_WIDTH} height="100" fill="#f9fafb" opacity="0.5" />
            <rect x={100-ZONE_WIDTH} y="0" width={ZONE_WIDTH} height="100" fill="#f9fafb" opacity="0.5" />
            
            {visualPoints.map((p, i) => {
                if (i === visualPoints.length - 1) return null;
                const nextP = visualPoints[i+1];
                const xStart = Math.min(p.x, nextP.x);
                const xEnd = Math.max(p.x, nextP.x);
                if (p.layerName && p.layerName !== '室内表面' && p.layerName !== '室外表面') {
                    const material = getMaterialFromLayerName(p.layerName);
                    if (material?.category === 'insulation') {
                        return <rect key={`bg-${i}`} x={xStart} y="0" width={xEnd - xStart} height="100" fill="#fef3c7" opacity="0.3" />;
                    }
                }
                return null;
            })}

            <rect x="0" y="0" width="100" height="100" fill="none" stroke="#000000" strokeWidth="1" />
            <line x1={ZONE_WIDTH} y1="0" x2={ZONE_WIDTH} y2="100" stroke="#000000" strokeWidth="1" />
            <line x1={100-ZONE_WIDTH} y1="0" x2={100-ZONE_WIDTH} y2="100" stroke="#000000" strokeWidth="1" />

            {visualPoints.map((p, i) => {
                if (i === 0 || i === visualPoints.length - 1) return null;
                return <line key={i} x1={p.x} y1="0" x2={p.x} y2="100" stroke="#666666" strokeDasharray="4 2" strokeWidth="0.5" />;
            })}

            <path d={pathVal2Full} fill="none" stroke={graphMode === 'pressure' ? "#cc0000" : "#0066cc"} strokeWidth="2" strokeLinejoin="round" />
            <path d={pathVal1Full} fill="none" stroke={graphMode === 'pressure' ? "#0066cc" : "#cc0000"} strokeWidth="2" strokeLinejoin="round" />
            {graphMode === 'pressure' && pathTempFull && (
                <path d={pathTempFull} fill="none" stroke="#ff6600" strokeWidth="2" strokeLinejoin="round" strokeDasharray="4 2" />
            )}
        </svg>

        <div className="absolute bottom-2 left-2 text-[9px] text-black">
          {graphMode === 'pressure' ? (
            <>
              <div className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-500"></span>飽和水蒸気圧</div>
              <div className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500"></span>水蒸気圧</div>
              <div className="flex items-center gap-1"><span className="w-3 h-0.5 bg-orange-500" style={{borderTop: '2px dashed'}}></span>温度勾配</div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-500"></span>温度</div>
              <div className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500"></span>露点</div>
            </>
          )}
        </div>
      </div>
    );
  };

  // --- 印刷用レポートコンポーネント (新規追加) ---
  const PrintableReport: React.FC<{
    ti: number; rhi: number; te: number; rhe: number;
    rsi: number; rse: number;
    layers: Layer[];
    materialDB: Material[];
    result: CalcResult;
    presetName: string;
    direction: 'out_in' | 'in_out';
  }> = ({ ti, rhi, te, rhe, rsi, rse, layers, materialDB, result, presetName, direction }) => {
    
    const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    
    // レイヤー詳細の取得（逆順にせず、室外→室内などの順序を固定して表示）
    const details = [...result.layerDetails].reverse(); // 計算ロジックに合わせて反転(室外側が上に来るように調整)

    return (
      <div id="print-report-container" className="hidden print:block font-serif text-black max-w-4xl mx-auto bg-white p-8">
        {/* ヘッダー */}
        <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-2">結露計算書</h1>
            <p className="text-sm">件名: {presetName} 検討</p>
          </div>
          <div className="text-right text-sm">
            <p>{today}</p>
            <p>作成: 結露・断熱シミュレーションツール</p>
          </div>
        </div>

        {/* 挨拶文 (PDFのスタイル模倣) */}
        <div className="mb-8 text-sm leading-relaxed">
          <p>拝啓</p>
          <p className="indent-4 mb-2">
            貴社ますますご盛栄のこととお慶び申し上げます。平素は格別のご高配を賜り、厚く御礼申し上げます。
          </p>
          <p className="indent-4">
            さて、この度お問い合わせいただきました結露検討に関しまして、以下の条件にて計算を行いました。
            計算結果及び判定は後述の通りです。ご査収のほど、何卒宜しくお願い申し上げます。
          </p>
          <p className="text-right mt-2">敬具</p>
        </div>

        {/* 1. 構成及び材料特性 */}
        <div className="mb-8">
          <h3 className="text-lg font-bold mb-2 border-l-4 border-black pl-2">【構成及び材料特性】</h3>
          <table className="w-full text-sm border-collapse border border-black">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-black p-2 w-10">No</th>
                <th className="border border-black p-2">材料名</th>
                <th className="border border-black p-2 w-24">厚み<br/>(mm)</th>
                <th className="border border-black p-2 w-32">熱伝導率<br/>(W/mK)</th>
                <th className="border border-black p-2 w-32">透湿抵抗比<br/>(-)</th>
              </tr>
            </thead>
            <tbody>
              {/* 室外側から表示 */}
              <tr className="bg-gray-50"><td className="border border-black p-1 text-center text-xs">-</td><td className="border border-black p-1 text-xs">室外側気層 (Rse)</td><td className="border border-black p-1 text-center">-</td><td className="border border-black p-1 text-center">-</td><td className="border border-black p-1 text-center">-</td></tr>
              {details.map((layer, idx) => (
                <tr key={idx}>
                  <td className="border border-black p-2 text-center">{idx + 1}</td>
                  <td className="border border-black p-2">{layer.name}</td>
                  <td className="border border-black p-2 text-right">{layer.d.toFixed(1)}</td>
                  <td className="border border-black p-2 text-right">{layer.lambda.toFixed(3)}</td>
                  <td className="border border-black p-2 text-right">{layer.mu.toFixed(1)}</td>
                </tr>
              ))}
              <tr className="bg-gray-50"><td className="border border-black p-1 text-center text-xs">-</td><td className="border border-black p-1 text-xs">室内側気層 (Rsi)</td><td className="border border-black p-1 text-center">-</td><td className="border border-black p-1 text-center">-</td><td className="border border-black p-1 text-center">-</td></tr>
            </tbody>
          </table>
        </div>

        {/* 2. 環境条件 */}
        <div className="mb-8 flex gap-8">
          <div className="flex-1">
              <h3 className="text-lg font-bold mb-2 border-l-4 border-black pl-2">【表面熱抵抗値】</h3>
              <table className="w-full text-sm border-collapse border border-black">
                  <thead className="bg-gray-100">
                      <tr><th className="border border-black p-2">区分</th><th className="border border-black p-2">抵抗値 (m²K/W)</th></tr>
                  </thead>
                  <tbody>
                      <tr><td className="border border-black p-2">室内側 (Rsi)</td><td className="border border-black p-2 text-center">{rsi.toFixed(2)}</td></tr>
                      <tr><td className="border border-black p-2">室外側 (Rse)</td><td className="border border-black p-2 text-center">{rse.toFixed(2)}</td></tr>
                  </tbody>
              </table>
          </div>
          <div className="flex-1">
              <h3 className="text-lg font-bold mb-2 border-l-4 border-black pl-2">【環境条件】</h3>
              <table className="w-full text-sm border-collapse border border-black">
                  <thead className="bg-gray-100">
                      <tr><th className="border border-black p-2">場所</th><th className="border border-black p-2">温度 (°C)</th><th className="border border-black p-2">湿度 (%)</th></tr>
                  </thead>
                  <tbody>
                      <tr><td className="border border-black p-2">室内</td><td className="border border-black p-2 text-center">{ti.toFixed(1)}</td><td className="border border-black p-2 text-center">{rhi}</td></tr>
                      <tr><td className="border border-black p-2">室外</td><td className="border border-black p-2 text-center">{te.toFixed(1)}</td><td className="border border-black p-2 text-center">{rhe}</td></tr>
                  </tbody>
              </table>
          </div>
        </div>

        {/* 3. 計算結果 */}
        <div className="mb-8">
          <h3 className="text-lg font-bold mb-2 border-l-4 border-black pl-2">【計算結果】</h3>
          <p className="mb-2 text-sm">定常計算による温度勾配および結露判定結果は以下の通りです。</p>
          
          <table className="w-full text-sm border-collapse border border-black mb-4">
              <thead className="bg-gray-100">
                  <tr>
                      <th className="border border-black p-2">項目</th>
                      <th className="border border-black p-2">計算値</th>
                      <th className="border border-black p-2">備考</th>
                  </tr>
              </thead>
              <tbody>
                  <tr>
                      <td className="border border-black p-2 font-bold">熱貫流率 (U値)</td>
                      <td className="border border-black p-2 text-center font-bold text-lg">{result.uValue.toFixed(2)} W/m²K</td>
                      <td className="border border-black p-2 text-xs">部位全体の断熱性能</td>
                  </tr>
                  <tr>
                      <td className="border border-black p-2 font-bold">結露判定</td>
                      <td className={`border border-black p-2 text-center font-bold text-lg ${result.isCondensing ? 'text-red-600' : 'text-black'}`}>
                          {result.isCondensing ? '× 結露発生' : '○ 結露なし'}
                      </td>
                      <td className="border border-black p-2 text-xs">
                          {result.isCondensing 
                              ? '構成内部で露点温度を下回る箇所があります' 
                              : '全ての層で表面温度が露点温度を上回っています'}
                      </td>
                  </tr>
                  {result.limitOutdoorTemp !== null && (
                  <tr>
                      <td className="border border-black p-2 font-bold">限界外気温度</td>
                      <td className="border border-black p-2 text-center">{result.limitOutdoorTemp.toFixed(1)} °C</td>
                      <td className="border border-black p-2 text-xs">結露が発生し始める外気温度の目安</td>
                  </tr>
                  )}
              </tbody>
          </table>

          {/* 温度・露点温度勾配グラフ */}
          <h4 className="font-bold mb-2 text-sm border-b border-gray-400 inline-block mt-4">
            {graphMode === 'pressure' ? '飽和水蒸気圧・水蒸気圧・温度勾配グラフ' : '温度・露点温度勾配グラフ'}
          </h4>
          <div className="mb-4">
            <PrintGraphView 
              result={result} 
              ti={ti} 
              rhi={rhi} 
              te={te} 
              rhe={rhe} 
              materialDB={materialDB}
              direction={direction}
              graphMode={graphMode}
            />
          </div>

          {/* 詳細結果テーブル */}
          <h4 className="font-bold mb-2 text-sm border-b border-gray-400 inline-block">詳細温度分布 ({direction === 'out_in' ? '室外 → 室内' : '室内 → 室外'})</h4>
          <table className="w-full text-xs border-collapse border border-black">
              <thead className="bg-gray-100">
                  <tr>
                      <th className="border border-black p-1">位置</th>
                      <th className="border border-black p-1">温度 (°C)</th>
                      <th className="border border-black p-1">露点 (°C)</th>
                      <th className="border border-black p-1">判定</th>
                  </tr>
              </thead>
              <tbody>
                  {(direction === 'out_in' ? [...result.points].reverse() : result.points).map((p, i, pointsArray) => {
                       const isRisky = p.pressure > p.satPressure + 1;
                       const originalIndex = direction === 'out_in' ? result.points.length - 1 - i : i;
                       
                       // 密着判定: このポイントが表す界面が密着しているか
                       const isBondedInterface = p.isBonded ?? false;
                       const isRiskyNoBonded = isRisky && !isBondedInterface;
                       
                       return (
                           <React.Fragment key={originalIndex}>
                               {/* 密着行: この材料行の直前（界面の前）に表示。最初の行の前には表示しない */}
                               {isBondedInterface && i > 0 && (
                                   <tr className="bg-blue-50 print:bg-gray-50">
                                       <td colSpan={4} className="border border-black p-1 text-center align-middle">
                                           <div className="text-[10px] text-blue-600 font-bold flex items-center justify-center gap-1">
                                               🔗 密着 (判定除外)
                                           </div>
                                       </td>
                                   </tr>
                               )}
                               {/* 材料行 */}
                               <tr className={isRiskyNoBonded ? "bg-gray-200" : ""}>
                                   <td className="border border-black p-1 pl-2 align-middle">
                                      <div className="font-bold">{p.displayLabel}</div>
                                   </td>
                                   <td className="border border-black p-1 text-center align-middle">{p.temp.toFixed(2)}</td>
                                   <td className="border border-black p-1 text-center align-middle">{p.dewPoint.toFixed(2)}</td>
                                   <td className="border border-black p-1 text-center font-bold align-middle">
                                       {isBondedInterface ? '-' : (isRisky ? '×' : '○')}
                                   </td>
                               </tr>
                           </React.Fragment>
                       );
                  })}
              </tbody>
          </table>
        </div>

        {/* 4. 考察・免責 */}
        <div className="border border-black p-4 text-sm mt-8 break-inside-avoid">
          <h3 className="font-bold mb-2">【考察】</h3>
          <p className="mb-2 leading-relaxed">
             上記の条件下において計算を行った結果、
             {result.isCondensing 
               ? `「結露発生」の判定となりました。断熱材の厚みを増すか、防湿層の配置を見直す等の対策を推奨いたします。`
               : `「結露なし」の判定となりました。室内表面温度および内部温度は露点温度を上回っており、現状の構成において計算上の結露リスクは低いと考えられます。`
             }
          </p>
          <p className="text-xs text-gray-500 mt-4">
              ※本計算書は定常計算に基づく簡易シミュレーション結果であり、実際の建物における性能を保証するものではありません。<br/>
              ※気象条件の変動や施工精度、経年劣化等は考慮されておりません。
          </p>
        </div>
        
        <div className="text-right mt-8 text-sm">以上</div>
      </div>
    );
  };

  const ReportView = () => {
    const details = [...result.layerDetails].reverse(); 
    return (
      <div className="mt-8 pt-4 border-t-2 border-gray-300 print:block">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FiFileText /> 計算根拠・報告書</h3>
          <div className="text-xs text-gray-500 print:hidden">※印刷時にこのエリアも出力されます</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
          <div>
            <h4 className="font-bold border-b border-gray-300 mb-2">1. 設計条件</h4>
            <table className="w-full text-xs">
              <tbody>
                <tr><td className="py-1">室内温度 (Ti)</td><td className="font-mono text-right">{ti.toFixed(1)} ℃</td></tr>
                <tr><td className="py-1">室内湿度 (RHi)</td><td className="font-mono text-right">{rhi.toFixed(0)} %</td></tr>
                <tr><td className="py-1">外気温度 (Te)</td><td className="font-mono text-right">{te.toFixed(1)} ℃</td></tr>
                <tr><td className="py-1">外気湿度 (RHe)</td><td className="font-mono text-right">{rhe.toFixed(0)} %</td></tr>
                <tr><td className="py-1 text-gray-500">室内表面熱伝達抵抗 (Rsi)</td><td className="font-mono text-right">{rsi.toFixed(2)} m²K/W</td></tr>
                <tr><td className="py-1 text-gray-500">室外表面熱伝達抵抗 (Rse)</td><td className="font-mono text-right">{rse.toFixed(2)} m²K/W</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="font-bold border-b border-gray-300 mb-2">2. 計算結果サマリ</h4>
            <table className="w-full text-xs">
              <tbody>
                <tr><td className="py-1">全熱貫流抵抗 (Rt)</td><td className="font-mono text-right font-bold">{result.rTotal.toFixed(3)} m²K/W</td></tr>
                <tr><td className="py-1">熱貫流率 (U値)</td><td className="font-mono text-right font-bold">{result.uValue.toFixed(2)} W/m²K</td></tr>
                <tr><td className="py-1">結露判定</td><td className={`font-bold text-right ${result.isCondensing ? 'text-red-600' : 'text-green-600'}`}>{result.isCondensing ? '発生あり (NG)' : '発生なし (OK)'}</td></tr>
                {result.limitOutdoorTemp !== null && (<tr><td className="py-1 text-blue-600">限界外気温 (結露開始点)</td><td className="font-mono text-right text-blue-600">{result.limitOutdoorTemp.toFixed(1)} ℃</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-6">
          <h4 className="font-bold border-b border-gray-300 mb-2">3. 部位別計算詳細 (室外側 → 室内側)</h4>
          <table className="w-full text-xs text-left border-collapse border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-1 border border-gray-300">No</th>
                <th className="p-1 border border-gray-300">材料名</th>
                <th className="p-1 border border-gray-300 text-right">厚さ<br/>d(mm)</th>
                <th className="p-1 border border-gray-300 text-right">熱伝導率<br/>λ(W/mK)</th>
                <th className="p-1 border border-gray-300 text-right">熱抵抗<br/>R(m²K/W)</th>
                <th className="p-1 border border-gray-300 text-right">透湿抵抗比<br/>μ(-)</th>
                <th className="p-1 border border-gray-300 text-right">透湿抵抗<br/>Sd(m)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-gray-50"><td className="p-1 border border-gray-300 text-center">-</td><td className="p-1 border border-gray-300">室外側表面熱伝達抵抗</td><td className="p-1 border border-gray-300 text-center">-</td><td className="p-1 border border-gray-300 text-center">-</td><td className="p-1 border border-gray-300 text-right font-mono">{rse.toFixed(2)}</td><td className="p-1 border border-gray-300 text-center">-</td><td className="p-1 border border-gray-300 text-center">-</td></tr>
              {details.map((layer, idx) => (
                <tr key={idx}>
                  <td className="p-1 border border-gray-300 text-center">{idx + 1}</td>
                  <td className="p-1 border border-gray-300">{layer.name}</td>
                  <td className="p-1 border border-gray-300 text-right font-mono">{layer.d.toFixed(1)}</td>
                  <td className="p-1 border border-gray-300 text-right font-mono">{layer.lambda.toFixed(3)}</td>
                  <td className="p-1 border border-gray-300 text-right font-mono">{layer.r.toFixed(3)}</td>
                  <td className="p-1 border border-gray-300 text-right font-mono">{layer.mu.toFixed(1)}</td>
                  <td className="p-1 border border-gray-300 text-right font-mono">{layer.sd.toFixed(3)}</td>
                </tr>
              ))}
              <tr className="bg-gray-50"><td className="p-1 border border-gray-300 text-center">-</td><td className="p-1 border border-gray-300">室内側表面熱伝達抵抗</td><td className="p-1 border border-gray-300 text-center">-</td><td className="p-1 border border-gray-300 text-center">-</td><td className="p-1 border border-gray-300 text-right font-mono">{rsi.toFixed(2)}</td><td className="p-1 border border-gray-300 text-center">-</td><td className="p-1 border border-gray-300 text-center">-</td></tr>
              <tr className="font-bold bg-blue-50"><td className="p-1 border border-gray-300 text-center" colSpan={4}>合計 (Total)</td><td className="p-1 border border-gray-300 text-right font-mono">{result.rTotal.toFixed(3)}</td><td className="p-1 border border-gray-300 text-center">-</td><td className="p-1 border border-gray-300 text-right font-mono">{(details.reduce((sum, l) => sum + l.sd, 0)).toFixed(3)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @page {
          size: A4 portrait;
          margin: 20mm;
        }
        
        @media print {
          /* 強力なリセットCSS */
          body {
             visibility: hidden;
             height: auto !important;
             overflow: visible !important;
          }
          
          /* レポートコンテナのみを表示 */
          #print-report-container {
            visibility: visible;
            display: block !important;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 30px;
            background-color: white;
            z-index: 99999;
          }

          #print-report-container * {
            visibility: visible;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />

      <div className="w-full bg-white rounded-b-lg shadow-sm border-b border-gray-100">
        {!hideHeader && (
        <div className="p-4 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
          <div>
            <h3 className="text-[13px] font-medium">結露検討</h3>
            <p className="text-[11px] mt-0.5">多層構造の結露・断熱シミュレーション</p>
          </div>
        </div>
        )}

        <div className="w-full p-4 print:hidden text-gray-700">
          <div className="flex justify-between items-center mb-2 print:hidden">
            <h2 className="text-lg font-bold text-gray-800">結露・断熱シミュレーション</h2>
            <div className="flex gap-2">
              <button onClick={() => setShowPsychrometric(true)} className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 border border-gray-200"><FiActivity /> 空気線図</button>
              <button onClick={() => setShowSettings(true)} className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700"><FiSettings /> 設定条件</button>
              <button onClick={() => setShowMaterialSettings(true)} className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700"><FiSettings /> 材料設定</button>
              <button onClick={handlePrint} className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"><FiPrinter /> PDF/印刷</button>
            </div>
          </div>

          {/* 空気線図モーダル */}
          {showPsychrometric && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center print:hidden p-4" style={{ zIndex: 2147483647 }}>
              <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-4" style={{ zIndex: 2147483647 }}>
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h3 className="font-bold text-gray-700 flex items-center gap-2"><FiActivity /> 湿り空気線図 (T-x線図)</h3>
                  <button onClick={() => setShowPsychrometric(false)} className="text-gray-500 hover:text-gray-800"><FiX size={20} /></button>
                </div>
                <div className="mb-4">
                  <PsychrometricChartView />
                  <p className="text-xs text-gray-500 mt-2">
                    ※ 室内(赤点)と室外(青点)の状態をプロットしています。<br />
                    ※ <span className="text-red-300">赤線: 等エンタルピー線</span>, <span className="text-green-300">緑線: 等比容積線</span>
                  </p>
                </div>
                <button onClick={() => setShowPsychrometric(false)} className="w-full bg-blue-600 text-white py-2 rounded mt-2 hover:bg-blue-700">閉じる</button>
              </div>
            </div>
          )}

          {/* 設定条件モーダル */}
          {showSettings && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] print:hidden p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-4">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h3 className="font-bold text-gray-700 flex items-center gap-2"><FiSettings /> 設定条件 (表面熱伝達抵抗)</h3>
                  <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-gray-800"><FiX size={20} /></button>
                </div>
                <div className="space-y-4 text-sm">
                  <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 border border-yellow-100">
                    <p className="font-bold mb-1"><FiInfo className="inline mr-1" />数値の考え方について</p>
                    <p>一般的に、日本の省エネ基準では室内の熱伝達抵抗(Rsi)は<strong>0.11</strong>が標準です。</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-600 text-xs font-bold mb-1">室内側表面抵抗 (Rsi)</label>
                      <div className="flex items-center gap-2">
                        <input type="number" step="0.01" value={rsi} onChange={e => setRsi(Number(e.target.value))} className="w-full border rounded px-2 py-1" />
                        <span className="text-xs text-gray-500 whitespace-nowrap">m²K/W</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs font-bold mb-1">室外側表面抵抗 (Rse)</label>
                      <div className="flex items-center gap-2">
                        <input type="number" step="0.01" value={rse} onChange={e => setRse(Number(e.target.value))} className="w-full border rounded px-2 py-1" />
                        <span className="text-xs text-gray-500 whitespace-nowrap">m²K/W</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setShowSettings(false)} className="w-full bg-blue-600 text-white py-2 rounded mt-2 hover:bg-blue-700">設定を閉じる</button>
                </div>
              </div>
            </div>
          )}

          {/* 材料設定モーダル */}
          {showMaterialSettings && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] print:hidden p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl h-[80vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                  <h3 className="font-bold text-gray-700 flex items-center gap-2"><FiSettings /> 材料データベース設定</h3>
                  <button onClick={() => setShowMaterialSettings(false)} className="text-gray-500 hover:text-gray-800"><FiX size={20} /></button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  <div className="mb-6 bg-blue-50 p-3 rounded border border-blue-100">
                    <h4 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-1"><FiPlus /> 新しい材料を追加</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      <input type="text" placeholder="カテゴリー" value={newMatCategory} onChange={(e) => setNewMatCategory(e.target.value)} list="category-list" className="border p-1 text-xs rounded" />
                      <datalist id="category-list">{availableCategories.map(c => <option key={c} value={c} />)}</datalist>
                      <input type="text" placeholder="材料名" value={newMatName} onChange={(e) => setNewMatName(e.target.value)} className="border p-1 text-xs rounded md:col-span-2" />
                      <input type="number" placeholder="熱伝導率 λ" value={newMatLambda} step="0.001" onChange={(e) => setNewMatLambda(e.target.value)} className="border p-1 text-xs rounded" />
                      <input type="number" placeholder="透湿抵抗 μ" value={newMatMu} step="0.1" onChange={(e) => setNewMatMu(e.target.value)} className="border p-1 text-xs rounded" />
                    </div>
                    <button onClick={addNewMaterial} className="mt-2 w-full bg-blue-600 text-white text-xs py-1.5 rounded hover:bg-blue-700 font-bold">リストに追加</button>
                  </div>
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr><th className="p-2 border-b">カテゴリー</th><th className="p-2 border-b">材料名</th><th className="p-2 border-b w-24">熱伝導率 λ</th><th className="p-2 border-b w-24">透湿抵抗 μ</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {materialDB.map((mat) => (
                        <tr key={mat.id} className="hover:bg-gray-50">
                          <td className="p-2 text-gray-600">{DEFAULT_CATEGORY_LABELS[mat.category] || mat.category}</td>
                          <td className="p-2 font-medium">{mat.name}</td>
                          <td className="p-2"><input type="number" step="0.001" value={mat.lambda} onChange={(e) => updateMaterialValue(mat.id, 'lambda', parseFloat(e.target.value))} className="w-full border rounded px-1 py-0.5 bg-white focus:bg-blue-50" /></td>
                          <td className="p-2"><input type="number" step="0.1" value={mat.mu} onChange={(e) => updateMaterialValue(mat.id, 'mu', parseFloat(e.target.value))} className="w-full border rounded px-1 py-0.5 bg-white focus:bg-blue-50" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-between items-center">
                  <button onClick={resetMaterials} className="text-red-500 text-xs hover:text-red-700 flex items-center gap-1"><FiRotateCcw /> 初期値に戻す</button>
                  <button onClick={() => setShowMaterialSettings(false)} className="bg-gray-800 text-white px-4 py-2 text-sm rounded hover:bg-gray-700">閉じる (自動保存)</button>
                </div>
              </div>
            </div>
          )}

          {/* メイングリッドエリア */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:block print:space-y-6">

            {/* 左カラム：構成編集 */}
            <div className="space-y-4 print:space-y-2">
              <div className="bg-white rounded border border-gray-200 p-3 print:border-gray-300">
                <div className="flex items-center gap-2 mb-2">
                  <FiLayout className="text-blue-600" />
                  <select value={presetKey} onChange={(e) => loadPreset(e.target.value)} className="flex-1 text-sm border-gray-300 rounded px-2 py-1 font-medium bg-gray-50 print:border-none print:appearance-none print:bg-transparent print:pl-0">
                    {Object.entries(PRESETS).map(([key, val]) => (
                      <option key={key} value={key}>{val.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div className="flex items-center justify-between bg-orange-50 p-1.5 rounded">
                    <span className="text-gray-600">室内</span>
                    <div className="flex gap-1 items-center">
                      <input type="number" value={ti} onChange={e => setTi(Number(e.target.value))} className="w-[60px] text-center border rounded px-1" disabled={!isLoggedIn} />℃
                      <input type="number" value={rhi} onChange={e => handleHumidityChange(setRhi, e.target.value)} className="w-[60px] text-center border rounded px-1" disabled={!isLoggedIn} />%
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-blue-50 p-1.5 rounded">
                    <span className="text-gray-600">室外</span>
                    <div className="flex gap-1 items-center">
                      <input type="number" value={te} onChange={e => setTe(Number(e.target.value))} className="w-[60px] text-center border rounded px-1" disabled={!isLoggedIn} />℃
                      <input type="number" value={rhe} onChange={e => handleHumidityChange(setRhe, e.target.value)} className="w-[60px] text-center border rounded px-1" disabled={!isLoggedIn} />%
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded border border-gray-200 p-3 print:border-gray-300">
                <div className="flex justify-between items-center mb-2 border-b pb-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-gray-600">
                      {direction === 'out_in' ? '室外側' : '室内側'}
                      <span className="text-gray-400 mx-1">→</span>
                      {direction === 'out_in' ? '室内側' : '室外側'}
                    </h3>
                    <button onClick={() => setDirection(prev => prev === 'out_in' ? 'in_out' : 'out_in')} className="text-gray-500 hover:text-blue-600 p-1 rounded hover:bg-gray-100 print:hidden" title="表示順序を切り替え">
                      {direction === 'out_in' ? <FiArrowDown size={14} /> : <FiArrowUp size={14} />}
                    </button>
                  </div>
                  {isLoggedIn && (<button onClick={addLayer} className="text-[10px] bg-gray-700 text-white px-2 py-0.5 rounded hover:bg-gray-600 print:hidden">＋ 追加</button>)}
                </div>
                <div className="space-y-1">
                  {displayLayers.map(({ layer, realIndex }, idx) => {
                    const currentMat = materialDB.find(m => m.id === layer.materialId);
                    const currentCategory = currentMat?.category || '';
                    const allowedCats = getAllowedCategories(presetType);
                    const displayNum = idx + 1;
                    const isLastLayer = idx === displayLayers.length - 1;
                    
                    // 密着ボタンのロジック: 常に室内側の層のフラグを操作
                    const handleBondedClick = () => {
                      if (!isLoggedIn) return;
                      if (direction === 'out_in') {
                        // 室外→室内の場合、ボタンは今の層(外)と次の層(内)の間
                        // 計算は内→外なので、「次の層(内)」のisBondedをONにする
                        const innerLayerIndex = realIndex + 1;
                        if (layers[innerLayerIndex]) {
                          updateLayerBonded(innerLayerIndex, !layers[innerLayerIndex].isBonded);
                        }
                      } else {
                        // 室内→室外の場合、ボタンは今の層(内)と次の層(外)の間
                        // 今の層(内)のisBondedをONにすれば、その外側界面チェックがスキップされる
                        updateLayerBonded(realIndex, !layer.isBonded);
                      }
                    };

                    // ボタンのアクティブ状態判定
                    const isBondedActive = direction === 'out_in' 
                      ? (layers[realIndex + 1]?.isBonded ?? false)
                      : (layer.isBonded ?? false);

                    return (
                      <React.Fragment key={layer.id}>
                        <div
                          draggable={isLoggedIn}
                          onDragStart={(e) => handleDragStart(e, realIndex)}
                          onDragOver={(e) => handleDragOver(e, realIndex)}
                          onDrop={(e) => handleDrop(e, realIndex)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center gap-1 p-1 bg-gray-50 rounded border border-gray-100 text-xs print:bg-white print:border-b print:border-gray-200 print:rounded-none ${isLoggedIn ? 'cursor-move hover:bg-gray-100' : ''} ${dragIndex === realIndex ? 'opacity-50 border-blue-500' : ''}`}
                        >
                          {isLoggedIn && <FiMenu className="text-gray-400 shrink-0 print:hidden" />}
                          <span className="w-4 text-center text-gray-400 font-mono text-[10px]">{displayNum}</span>
                          <div className="w-20 font-bold text-gray-600 text-[10px] truncate print:block">
                            {DEFAULT_CATEGORY_LABELS[currentCategory] || currentCategory || '選択...'}
                          </div>
                          <div className="flex-1 relative print:block">
                            <select value={currentCategory} onChange={(e) => updateLayerCategory(realIndex, e.target.value as MaterialCategory)} disabled={!isLoggedIn} className="w-20 bg-white border border-gray-300 rounded px-1 py-1 text-[10px] text-gray-600 truncate print:hidden">
                              <option value="">選択...</option>
                              {allowedCats.map(cat => (<option key={cat} value={cat}>{DEFAULT_CATEGORY_LABELS[cat] || cat}</option>))}
                            </select>
                            <select value={layer.materialId} onChange={(e) => updateLayerMaterial(realIndex, e.target.value)} disabled={!isLoggedIn} className="w-full bg-white border border-gray-300 rounded px-1 py-1 text-xs font-bold text-gray-800 cursor-pointer print:hidden">
                              <option value="">材料を選択</option>
                              {materialDB.filter(m => m.category === currentCategory).map(m => (<option key={m.id} value={m.id}>{m.name}</option>))}
                            </select>
                            <div className="hidden print:block font-bold text-gray-800 text-xs">
                              {currentMat?.name || '未選択'}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 w-24 justify-end relative">
                            <input type="number" value={layer.thickness} onChange={(e) => updateLayerThickness(realIndex, e.target.value)} disabled={!isLoggedIn} className="w-full text-right bg-white border border-gray-300 rounded px-1 py-1 print:hidden" placeholder="0" />
                            <div className="hidden print:block w-16 text-right font-mono text-gray-800">
                              {layer.thickness} mm
                            </div>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap ml-0.5 print:hidden">mm</span>
                          </div>
                          {isLoggedIn && (<button onClick={() => removeLayer(realIndex)} className="text-gray-300 hover:text-red-500 p-1 print:hidden"><FiTrash2 size={12} /></button>)}
                        </div>
                        {!isLastLayer && isLoggedIn && (
                          <div className="flex items-center justify-center py-0.5 print:hidden relative">
                            <div className="absolute w-full h-[1px] bg-gray-100 z-0"></div>
                            <button 
                              onClick={handleBondedClick}
                              className={`relative z-10 px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                                isBondedActive
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                  : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                              }`}
                              title="この界面が密着している場合（コンクリート打ち込み等）、ここでの結露判定を除外します"
                            >
                              <span className="text-[10px]">{isBondedActive ? '🔗 密着' : '🔗'}</span>
                            </button>
                          </div>
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* 右カラム：結果表示 */}
            <div className="space-y-4 print:space-y-4 print:break-inside-avoid">
              <div className={`rounded p-2 border-l-4 shadow-sm flex items-center gap-3 ${result.isCondensing ? 'bg-red-50 border-red-500' : 'bg-green-50 border-green-500'} print:border-2`}>
                {result.isCondensing ? <FiAlertTriangle className="text-red-500 shrink-0" size={20} /> : <FiCheckCircle className="text-green-500 shrink-0" size={20} />}
                <div>
                  <h2 className={`font-bold text-sm ${result.isCondensing ? 'text-red-800' : 'text-green-800'}`}>{result.isCondensing ? '結露リスクあり' : '結露リスクなし'}</h2>
                  <p className="text-xs text-gray-600 leading-tight">{result.isCondensing ? `${result.points[result.points.length - 1 - (result.condensationLayerIndex! + 1)]?.layerName || '構成内'} の外側で判定` : '現在の条件では内部結露は発生しません'}</p>
                </div>
              </div>

              <div className="bg-white rounded border border-gray-200 p-3 print:border-gray-300">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-xs font-bold text-gray-700">
                    {graphMode === 'pressure' ? '飽和水蒸気圧・水蒸気圧・温度勾配' : '温度・露点温度勾配'}
                  </h3>
                  <div className="flex gap-3 text-[10px]">
                    {graphMode === 'pressure' ? (
                      <>
                        <div className="flex items-center gap-1"><div className="w-2 h-0.5 bg-red-500"></div>飽和水蒸気圧</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-0.5 bg-blue-500"></div>水蒸気圧</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-0.5 bg-orange-500" style={{borderTop: '2px dashed'}}></div>温度勾配</div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1"><div className="w-2 h-0.5 bg-red-500"></div>温度</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-0.5 bg-blue-500"></div>露点</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#f0f9ff] border border-gray-100"></div>氷点下</div>
                      </>
                    )}
                  </div>
                </div>
                {/* グラフモード切り替えタブ */}
                <div className="flex gap-1 mb-2 print:hidden">
                  <button
                    onClick={() => setGraphMode('temp-dew')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      graphMode === 'temp-dew'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    温度・露点
                  </button>
                  <button
                    onClick={() => setGraphMode('pressure')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      graphMode === 'pressure'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    水蒸気圧
                  </button>
                </div>
                <GraphView />
                <div className="mt-2 flex gap-4 text-xs">
                  <div className="bg-gray-50 px-2 py-1 rounded border border-gray-100 print:border print:border-gray-300"><span className="text-gray-500 mr-2">U値</span><span className="font-mono font-bold">{result.uValue.toFixed(2)}</span> W/m²K</div>
                  {result.limitOutdoorTemp !== null && (
                    <div className="bg-blue-50 px-2 py-1 rounded border border-blue-100 print:border print:border-gray-300 print:hidden"><span className="text-blue-800 mr-2">限界外気</span><span className="font-mono font-bold text-blue-900">{result.limitOutdoorTemp.toFixed(1)} ℃</span></div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded border border-gray-200 p-3 print:border-gray-300">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-bold text-gray-700">計算詳細</h3>
                  <div className="flex gap-2">
                    <button onClick={() => setShowReport(!showReport)} className="text-gray-500 hover:text-blue-600 p-1 rounded hover:bg-gray-100 print:hidden text-xs flex items-center gap-1"><FiFileText /> 報告書{showReport ? '非表示' : '表示'}</button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-500 border-b print:bg-gray-200">
                      <tr>
                        <th className="p-1 font-medium">位置 <span className="text-[10px] font-normal text-gray-400">(室外側 ➡ 室内側)</span></th>
                        <th className="p-1 font-medium text-right">表面温度</th>
                        <th className="p-1 font-medium text-right">露点温度</th>
                        <th className="p-1 font-medium text-center">判定</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 print:divide-gray-300">
                      {(() => {
                        const n = result.layerDetails.length;
                        const rows: React.ReactNode[] = [];

                        // 材料表示は常に室外 → 室内の並び（layerIdx = n-1 .. 0 の降順ループ）
                        // 必ず材料数（n）分だけ行を作る
                        for (let layerIdx = n - 1; layerIdx >= 0; layerIdx--) {
                          const matName = result.layerDetails[layerIdx]?.name ?? '不明';

                          // この材料の外気側面（外側面）＝ points[layerIdx + 1]
                          const pOuter = result.points[layerIdx + 1];
                          // この材料の室内側面（内側面）＝ points[layerIdx]
                          const pInner = result.points[layerIdx];

                          // 隣接材料名
                          const outerNeighbor = (layerIdx < n - 1) ? result.layerDetails[layerIdx + 1]?.name : null;
                          const innerNeighbor = (layerIdx > 0) ? result.layerDetails[layerIdx - 1]?.name : null;

                          // ラベル生成
                          const labelOuter =
                            layerIdx === n - 1
                              ? `【室外側】${matName} 表面`
                              : `${matName} 表面（${outerNeighbor ?? '不明'} 裏面）`;

                          const labelInner =
                            layerIdx === 0
                              ? `【室内側】${matName} 表面`
                              : `${matName} 裏面（${innerNeighbor ?? '不明'} 表面）`;

                          // 密着判定（界面のisBondedを使用）
                          // 外側面の界面が密着している場合、この材料と次の材料（室外側）の間が密着
                          // ただし、一番外側の材料（layerIdx === n-1）の場合、外側面は室外表面なので界面ではない
                          const bondedOuter = (layerIdx < n - 1) ? (pOuter?.isBonded ?? false) : false;
                          // 内側面の界面が密着している場合、この材料と前の材料（室内側）の間が密着
                          // ただし、一番内側の材料（layerIdx === 0）の場合、内側面は室内表面なので界面ではない
                          const bondedInner = (layerIdx > 0) ? (pInner?.isBonded ?? false) : false;

                          // 判定ロジック
                          const isRiskyOuter = pOuter && pOuter.pressure > pOuter.satPressure + 1;
                          const isRiskyInner = pInner && pInner.pressure > pInner.satPressure + 1;
                          // 界面が密着している場合、その界面の両側を判定除外
                          // 外側面の判定：外側面の界面が密着していれば除外
                          const isRiskyNoBondedOuter = isRiskyOuter && !bondedOuter;
                          // 内側面の判定：内側面の界面が密着していれば除外
                          const isRiskyNoBondedInner = isRiskyInner && !bondedInner;

                          // 行背景色（どちらかが危険なら背景色を変える）
                          const rowBgClass = (isRiskyNoBondedOuter || isRiskyNoBondedInner) ? 'bg-red-50 print:bg-gray-100' : '';

                          rows.push(
                            <React.Fragment key={`material-${layerIdx}`}>
                              {/* 密着行: この材料行の直前（界面の前）に表示。最初の材料の前には表示しない */}
                              {bondedOuter && layerIdx < n - 1 && (
                                <tr key={`bonded-${layerIdx}`} className="bg-blue-50 print:bg-gray-50">
                                  <td colSpan={4} className="p-1 text-center align-middle">
                                    <div className="text-[10px] text-blue-600 font-bold flex items-center justify-center gap-1">
                                      🔗 密着 (判定除外)
                                    </div>
                                  </td>
                                </tr>
                              )}
                              {/* 材料行 */}
                              <tr className={rowBgClass}>
                                {/* 位置セル: 表面/裏面の2段表示 */}
                                <td className="p-1 max-w-[200px] align-middle">
                                  <div className="flex flex-col gap-0.5">
                                    <div className="truncate font-medium text-gray-700 text-xs">{labelOuter}</div>
                                    <div className="truncate font-medium text-gray-700 text-xs">{labelInner}</div>
                                  </div>
                                </td>
                                {/* 表面温度セル: 表面/裏面の2段表示 */}
                                <td className="p-1 text-right font-mono align-middle">
                                  <div className="flex flex-col gap-0.5 items-end">
                                    <div className="text-xs">{pOuter?.temp.toFixed(1) ?? '-'} ℃</div>
                                    <div className="text-xs">{pInner?.temp.toFixed(1) ?? '-'} ℃</div>
                                  </div>
                                </td>
                                {/* 露点温度セル: 表面/裏面の2段表示 */}
                                <td className="p-1 text-right font-mono text-blue-600 print:text-black align-middle">
                                  <div className="flex flex-col gap-0.5 items-end">
                                    <div className="text-xs">{pOuter?.dewPoint.toFixed(1) ?? '-'} ℃</div>
                                    <div className="text-xs">{pInner?.dewPoint.toFixed(1) ?? '-'} ℃</div>
                                  </div>
                                </td>
                                {/* 判定セル: 表面/裏面の2段表示 */}
                                <td className="p-1 text-center align-middle">
                                  <div className="flex flex-col gap-0.5 items-center">
                                    {/* 外側面判定 */}
                                    <div className="text-[10px]">
                                      {bondedOuter ? (
                                        <span className="text-gray-400">-</span>
                                      ) : isRiskyOuter ? (
                                        <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-700 font-bold rounded">NG</span>
                                      ) : (
                                        <span className="text-green-600 font-bold">OK</span>
                                      )}
                                    </div>
                                    {/* 内側面判定 */}
                                    <div className="text-[10px]">
                                      {bondedInner ? (
                                        <span className="text-gray-400">-</span>
                                      ) : isRiskyInner ? (
                                        <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-700 font-bold rounded">NG</span>
                                      ) : (
                                        <span className="text-green-600 font-bold">OK</span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        }

                        return rows;
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {showReport && <ReportView />}
        </div>
      </div>

      <PrintableReport
        ti={ti} rhi={rhi} te={te} rhe={rhe}
        rsi={rsi} rse={rse}
        layers={layers}
        materialDB={materialDB}
        result={result}
        presetName={PRESETS[presetKey]?.name || 'カスタム'}
        direction={direction}
      />
    </>
  );
};

export default MultiLayerCondensation;
