'use client';
/**
 * 意匠設計 › 結露検討。部位・条件・構成から、断面のどこで露点を下回るかを判定する。
 * 計算は src/lib/condensation.ts（scripts/test-condensation.ts）。
 * 見た目は舗装設計（PavementDesign）と同じ書式: 枠 #3b3b3b の灰色パネル、選択中は墨、判定は緑/赤の太枠。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { FiActivity, FiArrowDown, FiArrowUp, FiPlus, FiPrinter, FiRotateCcw, FiSettings, FiX } from 'react-icons/fi';
import {
  CATEGORY_LABELS, CITIES, DEFAULT_MATERIALS, LEGACY_MATERIAL_STORAGE_KEY, MATERIAL_STORAGE_KEY, PARTS, PRESETS, ROOMS,
  SLAB_GROUND_TEMP, buildFixes, calculateProfile, causeOf, dewPoint, evaluateFixes, findLimitTemp, fromStoredMaterials,
  interfaceLabel, migrateLegacyMaterials, toStoredMaterials, validLayers, vaporPressure,
  type Conditions, type Interface, type Layer, type Material, type PartId, type Profile, type Season, type Status,
} from '@/lib/condensation';
import SectionChart from './condensation/SectionChart';
import PsychrometricChart from './condensation/PsychrometricChart';

const field = 'w-full text-[12px] px-2 py-1.5';
const label = 'block text-[11px] font-bold text-gray-700 mb-1';
const panel = 'bg-gray-50 p-3 border border-[#3b3b3b] space-y-2';
const chip = (on: boolean) => `px-2 py-1 text-[11px] border ${on ? 'bg-[#3b3b3b] text-white border-[#3b3b3b]' : 'bg-white border-gray-300 hover:bg-gray-100'} disabled:opacity-50`;
const toolBtn = 'flex items-center gap-1 px-2 py-1 text-[11px] bg-white border border-gray-300 hover:bg-gray-100';

const f1 = (v: number) => (Math.abs(v) < 0.05 ? '0.0' : v.toFixed(1));
const sgn = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`;

const STATUS_TEXT: Record<Status, string> = {
  ok: 'OK',
  ng: '結露',
  bonded: '密着 · 判定しない',
  vent: '外気 · 判定しない',
  ground: '地盤側 · 判定しない',
  'ground-ng': '地盤側 · 判定しない',
};
const STATUS_MARK: Record<Status, string> = { ok: '○', ng: '×', bonded: '密着', vent: '除外', ground: '除外', 'ground-ng': '除外' };

let idSeq = 0;
const newId = () => `l${Date.now().toString(36)}${++idSeq}`;
const fromPreset = (key: string): Layer[] => PRESETS[key].layers.map((l) => ({ ...l, id: newId() }));

interface Props {
  hideHeader?: boolean;
}

export default function MultiLayerCondensation({ hideHeader }: Props) {
  const { isLoggedIn } = useAuth();
  const canEdit = isLoggedIn;

  // ---- 部位・構成
  const [part, setPart] = useState<PartId>('wall');
  const [presetKey, setPresetKey] = useState('wall_wood');
  const [layers, setLayers] = useState<Layer[]>(() => fromPreset('wall_wood'));
  const [rsi, setRsi] = useState(PRESETS.wall_wood.rsi);
  const [rseOut, setRseOut] = useState(PRESETS.wall_wood.rse);

  // ---- 条件
  const [season, setSeason] = useState<Season>('winter');
  const [cityId, setCityId] = useState('tokyo');
  const [roomId, setRoomId] = useState('living');
  const [teOut, setTeOut] = useState(1);
  const [rheOut, setRheOut] = useState(55);
  const [ti, setTi] = useState(20);
  const [rhi, setRhi] = useState(50);
  // 土間（外側の境界 = 地盤）
  const [tg, setTg] = useState(SLAB_GROUND_TEMP.winter);
  const [rhg, setRhg] = useState(100);
  const [groundDepth, setGroundDepth] = useState(0); // 0 = 土間下端を地中温度に固定（夏の表面結露を安全側に見る）
  const [groundLambda, setGroundLambda] = useState(1.0);

  // ---- 表示
  const [view, setView] = useState<'fit' | 'real'>('fit');
  const [hoverK, setHoverK] = useState<number | null>(null);
  const [hoverLayer, setHoverLayer] = useState<number | null>(null);
  const [showMaterials, setShowMaterials] = useState(false);
  const [showPsychro, setShowPsychro] = useState(false);

  // ---- 材料DB（既定値との差分だけ localStorage に保存）
  const [materialDB, setMaterialDB] = useState<Material[]>(DEFAULT_MATERIALS);
  const loaded = useRef(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MATERIAL_STORAGE_KEY);
      if (saved) setMaterialDB(fromStoredMaterials(JSON.parse(saved)));
      else {
        const legacy = localStorage.getItem(LEGACY_MATERIAL_STORAGE_KEY);
        if (legacy) setMaterialDB(fromStoredMaterials(migrateLegacyMaterials(JSON.parse(legacy))));
      }
    } catch {
      // 読めなければ既定値のまま
    }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return; // 読み込み前の既定値で保存データを上書きしない
    try {
      localStorage.setItem(MATERIAL_STORAGE_KEY, JSON.stringify(toStoredMaterials(materialDB)));
    } catch {
      // 保存できなくても計算は続ける
    }
  }, [materialDB]);

  // ---- 計算
  const isSlab = part === 'slab';
  const outLabel = isSlab ? '地盤' : '室外';
  const te = isSlab ? tg : teOut;
  const rhe = isSlab ? rhg : rheOut;
  const rse = isSlab ? groundDepth / Math.max(groundLambda, 0.01) : rseOut;
  const cond: Conditions = useMemo(() => ({ ti, rhi, te, rhe, rsi, rse, isSlab }), [ti, rhi, te, rhe, rsi, rse, isSlab]);
  const profile = useMemo(() => calculateProfile(layers, cond, materialDB), [layers, cond, materialDB]);
  const limit = useMemo(() => findLimitTemp(layers, cond, materialDB), [layers, cond, materialDB]);
  const fixes = useMemo(
    () => evaluateFixes(buildFixes(layers, profile, cond, part, materialDB, newId), layers, cond, materialDB),
    [layers, profile, cond, part, materialDB],
  );
  const presetResults = useMemo(
    () => Object.fromEntries(
      Object.entries(PRESETS)
        .filter(([, p]) => p.part === part)
        .map(([key, p]) => [key, calculateProfile(p.layers.map((l, i) => ({ ...l, id: `${key}${i}` })), { ...cond, rsi: p.rsi, rse: isSlab ? rse : p.rse }, materialDB)]),
    ) as Record<string, Profile>,
    [part, cond, isSlab, rse, materialDB],
  );

  // 断面図・計算書の番号は構成表と同じ（state の並び順で 1 から）
  const valid = validLayers(layers);
  const rowNoOfValid = (i: number) => layers.findIndex((l) => l.id === valid[i]?.id) + 1;
  const inDew = dewPoint(vaporPressure(ti, rhi));
  const outDew = dewPoint(vaporPressure(te, rhe));
  const worst = profile.worst;
  const focusK = hoverK ?? worst?.k ?? profile.layers.length;
  const focus = profile.interfaces[focusK];

  // ---- 操作
  const applySeason = (s: Season, city = cityId, room = roomId, nextPart = part) => {
    setSeason(s);
    const c = CITIES.find((x) => x.id === city);
    if (c) { const [t, rh] = c[s]; setTeOut(t); setRheOut(rh); }
    const rooms = ROOMS[s];
    const r = rooms.find((x) => x.id === room) ?? rooms[0];
    setRoomId(r.id);
    setTi(r.t);
    setRhi(r.rh);
    if (nextPart === 'slab') setTg(SLAB_GROUND_TEMP[s]);
  };

  const loadPreset = (key: string) => {
    const p = PRESETS[key];
    setPresetKey(key);
    setRsi(p.rsi);
    if (p.part !== 'slab') setRseOut(p.rse);
    setLayers(fromPreset(key));
    setHoverK(null);
    setHoverLayer(null);
  };

  const selectPart = (next: PartId) => {
    const key = Object.keys(PRESETS).find((k) => PRESETS[k].part === next)!;
    const wasSlab = part === 'slab';
    setPart(next);
    loadPreset(key);
    // 土間は夏型の表面結露が主。切り替えたときは夏の条件にする
    if (next === 'slab' && !wasSlab) applySeason('summer', cityId, 'dirt', next);
    else if (next !== 'slab' && wasSlab) applySeason('winter', cityId, 'living', next);
  };

  const setLayer = (id: string, patch: Partial<Layer>) => setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const moveLayer = (idx: number, dir: -1 | 1) => setLayers((ls) => {
    const j = idx + dir;
    if (j < 0 || j >= ls.length) return ls;
    const x = [...ls];
    [x[idx], x[j]] = [x[j], x[idx]];
    return x;
  });
  const addLayer = () => setLayers((ls) => {
    // 室内側の仕上げの手前に断熱材を足す
    const x = [...ls];
    x.splice(Math.max(0, x.length - 1), 0, { id: newId(), materialId: 'gw_16k', thickness: 50 });
    return x;
  });

  const applyFix = (i: number) => {
    if (!canEdit) return;
    const { fix } = fixes[i];
    if (fix.layers) setLayers(fix.layers.map((l) => ({ ...l })));
    if (fix.cond?.rhi !== undefined) { setRhi(fix.cond.rhi); setRoomId('custom'); }
  };

  const onHover = (k: number | null, li: number | null) => { setHoverK(k); setHoverLayer(li); };
  const num = (v: string, fallback: number) => { const x = parseFloat(v); return Number.isFinite(x) ? x : fallback; };
  const pct = (v: string, fallback: number) => Math.max(1, Math.min(100, num(v, fallback)));

  // ---- 判定の文
  const n = profile.layers.length;
  const ng = profile.isCondensing;
  const isSurface = ng && worst?.k === n;
  const inside = ({ roof: '屋根の中', floor: '床の中', slab: '床の中' } as Record<string, string>)[part] ?? '壁の中';
  const headline = !ng ? '結露しません' : isSurface ? '室内表面で結露します' : `${inside}で結露します`;
  const reason = !worst
    ? '判定できる箇所がありません。'
    : ng
      ? `「${interfaceLabel(profile, worst.k, outLabel)}」で温度 ${f1(worst.temp)}℃ が露点 ${f1(worst.dewPoint)}℃ を下回ります。${causeOf(profile, worst)}`
      : `すべての判定箇所で温度が露点を上回っています。余裕がいちばん小さいのは「${interfaceLabel(profile, worst.k, outLabel)}」です。`;
  const limitLabel = isSlab ? '限界地中温度' : '限界外気温';
  const limitText = limit === null ? (ng ? '今の条件で結露' : '−30℃でも結露なし') : `${f1(limit)}℃ 未満で結露`;

  const rowNote = (lr: Profile['layers'][number], i: number) => {
    if (lr.excluded) return lr.layer.materialId === 'air_vent' ? '通気層 · ここから外は外気とみなす' : '通気層より外側 · 計算しない';
    if (lr.material?.fixedR !== undefined) return `中空層 · 厚さによらず R ${lr.material.fixedR}`;
    const outer = profile.interfaces[i + 1];
    if (isSlab && outer && (outer.status === 'ground' || outer.status === 'ground-ng') && i < n - 1) return '地盤側 · 判定しない';
    return '';
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4 portrait; margin: 12mm; }
        @media print {
          body { visibility: hidden; height: auto !important; overflow: visible !important; }
          #print-report-container { visibility: visible; display: block !important; position: absolute; top: 0; left: 0; width: 100%; background: white; z-index: 99999; }
          #print-report-container * { visibility: visible; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      ` }} />

      {!hideHeader && (
        <div className="px-4 py-3 bg-[#3b3b3b] print:hidden">
          <h3 className="text-[13px] font-medium text-white">結露検討</h3>
          <p className="text-[11px] text-gray-300 mt-0.5">多層壁体・土間の温度分布・露点から表面結露・内部結露を判定</p>
        </div>
      )}

      <div className="p-4 text-[12px] text-gray-700 print:hidden">
        {/* 道具 */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="text-[10px] text-gray-500">
            {canEdit ? '部位 → 条件 → 構成 の順に決めると、断面図と判定がその場で変わります。' : '部位とプリセットは選べます。条件と構成の変更はログインすると使えます。'}
          </p>
          <div className="flex gap-1">
            <button type="button" onClick={() => setShowPsychro(true)} className={toolBtn}><FiActivity size={12} /> 空気線図</button>
            <button type="button" onClick={() => setShowMaterials(true)} className={toolBtn}><FiSettings size={12} /> 材料設定</button>
            <button type="button" onClick={() => window.print()} className="flex items-center gap-1 px-2 py-1 text-[11px] bg-[#3b3b3b] text-white"><FiPrinter size={12} /> 計算書を印刷</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          {/* ================= 左: 部位・条件 ================= */}
          <div className="space-y-3">
            <div className={panel}>
              <span className={label}>1. 部位</span>
              <div className="flex flex-wrap gap-1">
                {PARTS.map((p) => (
                  <button key={p.id} type="button" onClick={() => selectPart(p.id)} className={chip(part === p.id)}>{p.label}</button>
                ))}
              </div>
              <div className="pt-1 space-y-0.5">
                {Object.entries(PRESETS).filter(([, p]) => p.part === part).map(([key, p]) => {
                  const r = presetResults[key];
                  return (
                    <label key={key} className={`flex items-center gap-2 px-2 py-1 border cursor-pointer ${presetKey === key ? 'bg-white border-[#3b3b3b]' : 'border-transparent hover:bg-white'}`}>
                      <input type="radio" name="condensation-preset" checked={presetKey === key} onChange={() => loadPreset(key)} />
                      <span className="flex-1">{p.name}</span>
                      {r && (
                        <span className="text-[10px] text-gray-500 tabular-nums whitespace-nowrap">
                          U {r.uValue.toFixed(2)} · <span className={r.isCondensing ? 'text-red-600' : ''}>{r.isCondensing ? '結露' : 'OK'}</span>
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className={panel}>
              <span className={label}>2. 条件</span>
              <div className="flex gap-1">
                {(['winter', 'summer'] as Season[]).map((s) => (
                  <button key={s} type="button" disabled={!canEdit} onClick={() => applySeason(s)} className={chip(season === s)}>{s === 'winter' ? '冬' : '夏'}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1 min-w-0">
                  <span className="block text-[10px] text-gray-500">{isSlab ? '地盤（地中温度・湿度）' : '室外（地域は目安）'}</span>
                  {!isSlab && (
                    <select value={cityId} disabled={!canEdit} onChange={(e) => { setCityId(e.target.value); if (e.target.value !== 'custom') applySeason(season, e.target.value); }} className={field}>
                      {CITIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                      <option value="custom">任意</option>
                    </select>
                  )}
                  <div className="flex items-center gap-1">
                    <input type="number" step="0.5" disabled={!canEdit} value={te} onChange={(e) => { const v = num(e.target.value, te); if (isSlab) setTg(v); else { setTeOut(v); setCityId('custom'); } }} className={`${field} text-right`} aria-label={`${outLabel}の温度`} />
                    <span className="text-[10px] text-gray-500">℃</span>
                    <input type="number" step="5" disabled={!canEdit} value={rhe} onChange={(e) => { const v = pct(e.target.value, rhe); if (isSlab) setRhg(v); else { setRheOut(v); setCityId('custom'); } }} className={`${field} text-right`} aria-label={`${outLabel}の湿度`} />
                    <span className="text-[10px] text-gray-500">%</span>
                  </div>
                </div>
                <div className="space-y-1 min-w-0">
                  <span className="block text-[10px] text-gray-500">室内</span>
                  <select value={roomId} disabled={!canEdit} onChange={(e) => {
                    const r = ROOMS[season].find((x) => x.id === e.target.value);
                    setRoomId(e.target.value);
                    if (r) { setTi(r.t); setRhi(r.rh); }
                  }} className={field}>
                    {ROOMS[season].map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                    <option value="custom">任意</option>
                  </select>
                  <div className="flex items-center gap-1">
                    <input type="number" step="0.5" disabled={!canEdit} value={ti} onChange={(e) => { setTi(num(e.target.value, ti)); setRoomId('custom'); }} className={`${field} text-right`} aria-label="室内の温度" />
                    <span className="text-[10px] text-gray-500">℃</span>
                    <input type="number" step="5" disabled={!canEdit} value={rhi} onChange={(e) => { setRhi(pct(e.target.value, rhi)); setRoomId('custom'); }} className={`${field} text-right`} aria-label="室内の湿度" />
                    <span className="text-[10px] text-gray-500">%</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-baseline border-t border-gray-300 pt-2">
                <span className="text-[11px]">室内の露点<span className="block text-[10px] text-gray-500">表面がこれより冷えると結露</span></span>
                <b className="text-[18px] text-blue-700 tabular-nums">{f1(inDew)}℃</b>
              </div>
              {isSlab && <p className="text-[10px] text-gray-500">地中温度は地域の年平均気温 ±数℃ が目安。土壌は湿っているので湿度 100%。</p>}
              <details className="text-[11px]">
                <summary className="cursor-pointer text-gray-600">{isSlab ? '地盤と表面の熱抵抗' : '表面の熱抵抗'}</summary>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <label className="block">
                    <span className="block text-[10px] text-gray-500 mb-0.5">室内側 Rsi（m²K/W）</span>
                    <input type="number" step="0.01" disabled={!canEdit} value={rsi} onChange={(e) => setRsi(num(e.target.value, rsi))} className={field} />
                  </label>
                  {isSlab ? (
                    <>
                      <label className="block">
                        <span className="block text-[10px] text-gray-500 mb-0.5">地盤の考慮深さ（m）</span>
                        <input type="number" step="0.1" min="0" disabled={!canEdit} value={groundDepth} onChange={(e) => setGroundDepth(Math.max(0, num(e.target.value, groundDepth)))} className={field} />
                      </label>
                      <label className="block">
                        <span className="block text-[10px] text-gray-500 mb-0.5">土壌の熱伝導率（W/mK）</span>
                        <input type="number" step="0.1" min="0.1" disabled={!canEdit} value={groundLambda} onChange={(e) => setGroundLambda(Math.max(0.1, num(e.target.value, groundLambda)))} className={field} />
                      </label>
                      <div className="flex items-end pb-1.5 text-[11px]">Rg = {rse.toFixed(2)}</div>
                    </>
                  ) : (
                    <label className="block">
                      <span className="block text-[10px] text-gray-500 mb-0.5">室外側 Rse（m²K/W）</span>
                      <input type="number" step="0.01" disabled={!canEdit} value={rseOut} onChange={(e) => setRseOut(num(e.target.value, rseOut))} className={field} />
                    </label>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  省エネ基準の値: 室内側 壁 0.11 / 屋根・天井 0.09 / 床・土間 0.15、外気側 0.04。通気層があると外気側は室内側と同じ値で計算します。
                  {isSlab && ' 深さ 0 は土間の下端を地中温度に固定する扱いで、夏の表面結露を安全側に見ます。'}
                </p>
              </details>
            </div>

            <div className={`${panel} text-[11px] space-y-1`}>
              <div className="flex justify-between"><span>熱貫流抵抗 Rt</span><b className="tabular-nums">{profile.rTotal.toFixed(3)} m²K/W</b></div>
              <div className="flex justify-between"><span>熱貫流率 U</span><b className="tabular-nums">{profile.uValue.toFixed(2)} W/m²K</b></div>
              <div className="flex justify-between"><span>{outLabel}の露点</span><b className="tabular-nums">{f1(outDew)}℃</b></div>
              <div className="flex justify-between"><span>{limitLabel}</span><b className="tabular-nums">{limit === null ? '—' : `${f1(limit)}℃`}</b></div>
              <p className="text-[10px] text-gray-500 pt-1">定常計算（グレイザー法）。0℃未満は氷の飽和水蒸気圧（霜点）で判定。</p>
            </div>
          </div>

          {/* ================= 右: 判定・構成 ================= */}
          <div className="space-y-3 min-w-0">
            <div className={`border-2 p-4 ${ng ? 'border-red-600 bg-red-50' : 'border-green-600 bg-green-50'}`}>
              <div className="flex flex-wrap gap-4 items-start">
                <div className="flex-1 min-w-[220px] space-y-2">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className={`text-[28px] font-bold leading-none ${ng ? 'text-red-700' : 'text-green-700'}`}>{ng ? 'NG' : 'OK'}</span>
                    <span className={`text-[14px] font-bold ${ng ? 'text-red-700' : 'text-green-700'}`}>{headline}</span>
                    {ng && <span className="text-[10px] px-1.5 py-0.5 border border-red-600 text-red-700">{isSurface ? '表面結露' : '内部結露'}</span>}
                  </div>
                  <p className="text-[11px] leading-relaxed">{reason}</p>
                </div>
                <div className="text-right">
                  <div className={`text-[28px] font-bold leading-none tabular-nums ${worst && worst.margin < 0 ? 'text-red-700' : 'text-gray-800'}`}>
                    {worst ? sgn(worst.margin) : '—'}<span className="text-[13px]">℃</span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">最小の余裕（温度 − 露点）</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-x-3 mt-3 pt-2 border-t border-gray-300 text-[11px]">
                <div><span className="block text-[10px] text-gray-500">表面の余裕</span><b className={`tabular-nums ${profile.surface.margin < 0 ? 'text-red-700' : ''}`}>{sgn(profile.surface.margin)}℃</b></div>
                <div><span className="block text-[10px] text-gray-500">室内表面温度</span><b className="tabular-nums">{f1(profile.surface.temp)}℃</b></div>
                <div><span className="block text-[10px] text-gray-500">{limitLabel}</span><b className="tabular-nums">{limitText}</b></div>
              </div>
            </div>

            <div className="border border-[#3b3b3b]">
              <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100 border-b">
                <span className="text-[11px] font-bold">3. 構成（{outLabel}側 → 室内側）</span>
                <span className="text-[10px] text-gray-500">R 熱抵抗 m²K/W · Sd 透湿抵抗 m</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] min-w-[430px]">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="px-1 py-1 font-normal w-[24px]">No</th>
                      <th className="text-left px-2 py-1 font-normal">材料</th>
                      <th className="px-1 py-1 font-normal w-[60px]">厚さ mm</th>
                      <th className="px-1 py-1 font-normal w-[44px]">R</th>
                      <th className="px-1 py-1 font-normal w-[44px]">Sd</th>
                      <th className="px-1 py-1 font-normal w-[34px]" title="外側の層との間に隙間が無い（打込み・吹付）なら、その界面は判定しない">密着</th>
                      {canEdit && <th className="w-[52px]" />}
                    </tr>
                  </thead>
                  <tbody>
                    {layers.map((l, idx) => {
                      const vi = valid.findIndex((v) => v.id === l.id);
                      const lr = vi >= 0 ? profile.layers[vi] : undefined;
                      const outerIf = vi >= 0 ? profile.interfaces[vi] : undefined; // この層の外側の界面
                      const note = lr ? rowNote(lr, vi) : '';
                      const hov = vi >= 0 && hoverLayer === vi;
                      return (
                        <tr key={l.id} className={`border-t ${hov ? 'bg-amber-50' : ''} ${lr?.excluded ? 'text-gray-400' : ''}`}
                          onPointerEnter={() => setHoverLayer(vi >= 0 ? vi : null)} onPointerLeave={() => setHoverLayer(null)}>
                          <td className="px-1 py-1 text-center tabular-nums text-gray-500">{idx + 1}</td>
                          <td className="px-2 py-1">
                            <select value={l.materialId} disabled={!canEdit} onChange={(e) => {
                              const m = materialDB.find((x) => x.id === e.target.value);
                              setLayer(l.id, { materialId: e.target.value, ...(m?.category === 'membrane' && Number(l.thickness) > 2 ? { thickness: 0.2 } : {}) });
                            }} className="w-full text-[11px] px-1 py-1">
                              <option value="">材料を選択</option>
                              {Object.keys(CATEGORY_LABELS).concat(Array.from(new Set(materialDB.map((m) => m.category))).filter((c) => !CATEGORY_LABELS[c])).map((cat) => {
                                const ms = materialDB.filter((m) => m.category === cat);
                                return ms.length ? (
                                  <optgroup key={cat} label={CATEGORY_LABELS[cat] ?? cat}>
                                    {ms.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                                  </optgroup>
                                ) : null;
                              })}
                            </select>
                            {note && <div className="text-[10px] text-gray-500 mt-0.5">{note}</div>}
                          </td>
                          <td className="px-1 py-1">
                            <input type="number" step={Number(l.thickness) < 1 ? 0.1 : 1} min="0" disabled={!canEdit} value={l.thickness}
                              onChange={(e) => setLayer(l.id, { thickness: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) })}
                              className="w-full text-[11px] px-1 py-1 text-right" />
                          </td>
                          <td className="px-1 py-1 text-center tabular-nums">{lr && !lr.excluded ? lr.r.toFixed(lr.r < 0.1 ? 3 : 2) : '—'}</td>
                          <td className="px-1 py-1 text-center tabular-nums">{lr && !lr.excluded ? lr.sd.toFixed(lr.sd < 0.1 ? 3 : 2) : '—'}</td>
                          <td className="px-1 py-1 text-center">
                            {idx > 0 && (
                              <input type="checkbox" disabled={!canEdit} checked={!!l.isBonded} onChange={(e) => setLayer(l.id, { isBonded: e.target.checked })}
                                title={`${idx} と ${idx + 1} の間が密着（打込み・吹付）`} aria-label={`${idx} と ${idx + 1} の間が密着`} />
                            )}
                            {outerIf?.status === 'ng' && idx > 0 && <div className="text-[9px] text-red-600">結露</div>}
                          </td>
                          {canEdit && (
                          <td className="px-1 whitespace-nowrap text-right">
                              <>
                                <button type="button" onClick={() => moveLayer(idx, -1)} disabled={idx === 0} className="text-gray-400 hover:text-gray-800 disabled:opacity-30 p-0.5" title="外側へ"><FiArrowUp size={12} /></button>
                                <button type="button" onClick={() => moveLayer(idx, 1)} disabled={idx === layers.length - 1} className="text-gray-400 hover:text-gray-800 disabled:opacity-30 p-0.5" title="内側へ"><FiArrowDown size={12} /></button>
                                <button type="button" onClick={() => setLayers((ls) => ls.filter((x) => x.id !== l.id))} className="text-gray-400 hover:text-red-600 p-0.5" title="この層を外す"><FiX size={12} /></button>
                              </>
                          </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {canEdit && (
                <button type="button" onClick={addLayer} className="w-full py-1 text-[11px] text-gray-600 border-t hover:bg-gray-50 flex items-center justify-center gap-1">
                  <FiPlus size={12} /> 層を足す
                </button>
              )}
              <div className="flex justify-between px-3 py-1 border-t text-[10px] text-gray-500 tabular-nums">
                <span>合計 {f1(profile.layers.reduce((s, l) => s + l.d, 0))} mm</span>
                <span>ΣR {(profile.rTotal - rsi - profile.rseUsed).toFixed(3)} · ΣSd {profile.layers.reduce((s, l) => s + l.sd, 0).toFixed(2)} m</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= 断面図 ================= */}
        <div className="border border-[#3b3b3b] mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-gray-100 border-b">
            <span className="text-[11px] font-bold">断面の温度・露点</span>
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-600">
              <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2 border-[#c62828]" />温度</span>
              <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2 border-[#1d4ed8]" />露点</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-2.5 bg-blue-700/15 border border-[#1d4ed8]" />結露する範囲</span>
              <span className="flex gap-1">
                <button type="button" onClick={() => setView('fit')} className={chip(view === 'fit')}>見やすく</button>
                <button type="button" onClick={() => setView('real')} className={chip(view === 'real')}>実寸比</button>
              </span>
            </div>
          </div>
          <div className="overflow-x-auto bg-white">
            <SectionChart
              profile={profile} ti={ti} rhi={rhi} te={te} rhe={rhe} outLabel={outLabel} view={view}
              layerNo={rowNoOfValid} hoverK={hoverK} hoverLayer={hoverLayer} onHover={onHover}
            />
          </div>
          {focus && (
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 px-3 py-1.5 border-t text-[11px] tabular-nums">
              <span className="text-gray-500">{hoverK === null ? (ng ? '最も厳しい位置' : '余裕が最小の位置') : '選択中'}</span>
              <b>{interfaceLabel(profile, focus.k, outLabel)}</b>
              <span>温度 {f1(focus.temp)}℃</span>
              <span className="text-blue-700">露点 {f1(focus.dewPoint)}℃</span>
              <span>余裕 {sgn(focus.margin)}℃</span>
              <span className="text-gray-500">水蒸気圧 {Math.round(focus.pressure)} / 飽和 {Math.round(focus.satPressure)} Pa</span>
              <span className={focus.status === 'ng' ? 'text-red-600 font-bold' : 'text-gray-500'}>{STATUS_TEXT[focus.status]}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 mt-4">
          {/* ================= 対策の試算 ================= */}
          <div className="border border-[#3b3b3b]">
            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100 border-b">
              <span className="text-[11px] font-bold">対策の試算</span>
              <span className="text-[10px] text-gray-500">計算し直した結果</span>
            </div>
            {!ng && <p className="px-3 py-2 text-[11px] text-gray-600 border-b">今の条件では対策は要りません。下は余裕をさらに増やす場合です。</p>}
            {fixes.length === 0 && <p className="px-3 py-2 text-[11px] text-gray-500">試せる対策がありません。</p>}
            {fixes.slice(0, ng ? 8 : 3).map(({ fix, result }, i) => (
              <div key={fix.key} className="flex items-center gap-2 px-3 py-2 border-t first:border-t-0 text-[11px]">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-800">{fix.title}</div>
                  <div className="text-[10px] text-gray-500">{fix.detail}</div>
                </div>
                <div className="text-right tabular-nums whitespace-nowrap">
                  <div className={result.isCondensing ? 'text-red-600' : 'text-green-700 font-bold'}>{result.isCondensing ? 'まだ結露' : '結露しない'}</div>
                  <div className="text-[10px] text-gray-500">余裕 {result.worst ? sgn(result.worst.margin) : '—'}℃</div>
                </div>
                <button type="button" disabled={!canEdit} onClick={() => applyFix(i)}
                  className={`px-2 py-1 text-[11px] disabled:opacity-40 ${result.isCondensing ? 'bg-white border border-gray-300' : 'bg-[#3b3b3b] text-white'}`}
                  title={canEdit ? 'この内容を構成・条件に反映する' : 'ログインすると反映できます'}>
                  適用
                </button>
              </div>
            ))}
          </div>

          {/* ================= 界面一覧 ================= */}
          <div className="border border-[#3b3b3b] min-w-0">
            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100 border-b">
              <span className="text-[11px] font-bold">界面一覧（室内側から）</span>
              <span className="text-[10px] text-gray-500">余裕 = 温度 − 露点</span>
            </div>
            <div className="overflow-x-auto">
              <InterfaceTable profile={profile} outLabel={outLabel} hoverK={hoverK} onHover={(k) => setHoverK(k)} />
            </div>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 leading-relaxed mt-4">
          ※ 定常計算（グレイザー法）による簡易判定です。温度は熱抵抗、水蒸気圧は透湿抵抗 Sd の比で直線的に配分します。0℃未満は氷の飽和水蒸気圧（霜点）で判定し、相対湿度は水面基準（気象庁と同じ）です。<br />
          ※ 密閉空気層は厚さによらず R 0.09。通気層より外側は外気とみなし、通気層側の表面熱抵抗を室内側と同じ値にします。<br />
          ※ 土間は地盤側を地中温度・湿度 100% の境界とし、地盤側の防湿層より下は土壌水分の影響域として判定しません。熱容量による温度の遅れ（梅雨時の急な高湿外気など）は定常計算では出ません。<br />
          ※ 地域の外気条件は目安です。設計では地域の気象データで確認してください。
        </p>
      </div>

      {/* ================= 空気線図 ================= */}
      {showPsychro && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center print:hidden p-4" style={{ zIndex: 2147483647 }}>
          <div className="bg-white shadow-xl w-full max-w-lg p-4 border border-[#3b3b3b]">
            <div className="flex justify-between items-center mb-3 border-b pb-2">
              <h3 className="font-bold text-[13px] text-gray-700 flex items-center gap-2"><FiActivity /> 湿り空気線図（T-x 線図）</h3>
              <button type="button" onClick={() => setShowPsychro(false)} className="text-gray-500 hover:text-gray-800"><FiX size={18} /></button>
            </div>
            <PsychrometricChart ti={ti} rhi={rhi} te={te} rhe={rhe} outLabel={outLabel} />
            <p className="text-[11px] text-gray-500 mt-2">室内（赤）と{outLabel}（青）の状態。赤線は等エンタルピー線、緑線は等比容積線。</p>
          </div>
        </div>
      )}

      {/* ================= 材料設定 ================= */}
      {showMaterials && (
        <MaterialSettings materialDB={materialDB} setMaterialDB={setMaterialDB} onClose={() => setShowMaterials(false)} />
      )}

      {/* ================= 印刷用の計算書 ================= */}
      <PrintableReport
        title={PRESETS[presetKey]?.name ?? 'カスタム'} partLabel={PARTS.find((p) => p.id === part)?.label ?? ''}
        profile={profile} cond={cond} outLabel={outLabel} limitLabel={limitLabel} limit={limit}
        headline={headline} reason={reason} isSlab={isSlab} groundDepth={groundDepth} groundLambda={groundLambda}
        layerNo={rowNoOfValid}
      />
    </>
  );
}

// ---------------------------------------------------------------- 界面一覧

function InterfaceTable({ profile, outLabel, hoverK, onHover, print }: { profile: Profile; outLabel: string; hoverK?: number | null; onHover?: (k: number | null) => void; print?: boolean }) {
  const rows = [...profile.interfaces].reverse();
  const cell = print ? 'border border-black px-1 py-0.5' : 'px-2 py-1';
  return (
    <table className={`w-full ${print ? 'text-[9px] border-collapse' : 'text-[11px] min-w-[460px]'}`} onPointerLeave={() => onHover?.(null)}>
      <thead>
        <tr className={print ? 'bg-gray-100' : 'text-gray-500'}>
          <th className={`${cell} text-left font-normal`}>位置</th>
          <th className={`${cell} font-normal`}>温度</th>
          <th className={`${cell} font-normal`}>露点</th>
          <th className={`${cell} font-normal`}>余裕</th>
          <th className={`${cell} font-normal`}>判定</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((f: Interface) => {
          const m = Math.max(-10, Math.min(10, f.margin));
          return (
            <tr key={f.k} className={`${print ? '' : 'border-t'} ${hoverK === f.k ? 'bg-amber-50' : ''} ${f.status === 'ng' ? 'text-red-700' : ''}`} onPointerEnter={() => onHover?.(f.k)}>
              <td className={cell}>{interfaceLabel(profile, f.k, outLabel)}</td>
              <td className={`${cell} text-right tabular-nums`}>{f1(f.temp)}℃</td>
              <td className={`${cell} text-right tabular-nums ${print ? '' : 'text-blue-700'}`}>{f1(f.dewPoint)}℃</td>
              <td className={`${cell} tabular-nums`}>
                <div className="flex items-center gap-1 justify-end">
                  {!print && (
                    <span className="relative inline-block w-[60px] h-[6px] bg-gray-100">
                      <span className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-300" />
                      <span className={`absolute top-0 bottom-0 ${m < 0 ? 'bg-red-500' : 'bg-gray-500'}`} style={{ left: `${m < 0 ? 50 + m * 5 : 50}%`, width: `${Math.abs(m) * 5}%` }} />
                    </span>
                  )}
                  <span className="w-[36px] text-right">{sgn(f.margin)}</span>
                </div>
              </td>
              <td className={`${cell} text-center whitespace-nowrap ${f.status === 'ng' ? 'font-bold' : f.status === 'ok' ? '' : 'text-gray-400'}`}>{print ? STATUS_MARK[f.status] : STATUS_TEXT[f.status]}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------- 材料設定

function MaterialSettings({ materialDB, setMaterialDB, onClose }: { materialDB: Material[]; setMaterialDB: React.Dispatch<React.SetStateAction<Material[]>>; onClose: () => void }) {
  const [cat, setCat] = useState('');
  const [name, setName] = useState('');
  const [lambda, setLambda] = useState('0.038');
  const [mu, setMu] = useState('1');
  const [confirmReset, setConfirmReset] = useState(false);
  const categories = Array.from(new Set(materialDB.map((m) => m.category)));
  const update = (id: string, patch: Partial<Material>) => setMaterialDB((db) => db.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const add = () => {
    if (!name || !cat) return;
    setMaterialDB((db) => [...db, { id: `custom_${Date.now()}`, name, category: cat, lambda: parseFloat(lambda) || 0.038, mu: parseFloat(mu) || 1 }]);
    setName('');
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] print:hidden p-4">
      <div className="bg-white shadow-xl w-full max-w-3xl h-[80vh] flex flex-col border border-[#3b3b3b] text-[12px] text-gray-700">
        <div className="px-4 py-2 border-b flex justify-between items-center bg-gray-100">
          <h3 className="font-bold text-[13px] flex items-center gap-2"><FiSettings /> 材料設定</h3>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800"><FiX size={18} /></button>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div className={panel}>
            <span className={label}>材料を足す</span>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <input type="text" placeholder="カテゴリー" value={cat} onChange={(e) => setCat(e.target.value)} list="condensation-category-list" className={field} />
              <datalist id="condensation-category-list">{categories.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>)}</datalist>
              <input type="text" placeholder="材料名" value={name} onChange={(e) => setName(e.target.value)} className={`${field} md:col-span-2`} />
              <input type="number" placeholder="熱伝導率 λ" step="0.001" value={lambda} onChange={(e) => setLambda(e.target.value)} className={field} />
              <input type="number" placeholder="透湿抵抗比 μ" step="0.1" value={mu} onChange={(e) => setMu(e.target.value)} className={field} />
            </div>
            <button type="button" onClick={add} className="w-full bg-[#3b3b3b] text-white text-[11px] py-1.5">リストに追加</button>
          </div>
          <table className="w-full text-[11px]">
            <thead className="bg-gray-100 sticky top-0">
              <tr className="text-gray-500">
                <th className="text-left px-2 py-1 font-normal">カテゴリー</th>
                <th className="text-left px-2 py-1 font-normal">材料名</th>
                <th className="px-2 py-1 font-normal w-28">熱伝導率 λ（中空層は R）</th>
                <th className="px-2 py-1 font-normal w-24">透湿抵抗比 μ</th>
              </tr>
            </thead>
            <tbody>
              {materialDB.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-2 py-1 text-gray-500">{CATEGORY_LABELS[m.category] ?? m.category}</td>
                  <td className="px-2 py-1">{m.name}</td>
                  <td className="px-2 py-1">
                    {m.fixedR !== undefined ? (
                      <div className="flex items-center gap-1" title="中空層は厚さによらず熱抵抗 R [m²K/W] で計算します">
                        <span className="text-gray-500">R</span>
                        <input type="number" step="0.01" value={m.fixedR} onChange={(e) => update(m.id, { fixedR: parseFloat(e.target.value) })} className="w-full px-1 py-0.5 text-right" />
                      </div>
                    ) : (
                      <input type="number" step="0.001" value={m.lambda} onChange={(e) => update(m.id, { lambda: parseFloat(e.target.value) })} className="w-full px-1 py-0.5 text-right" />
                    )}
                  </td>
                  <td className="px-2 py-1"><input type="number" step="0.1" value={m.mu} onChange={(e) => update(m.id, { mu: parseFloat(e.target.value) })} className="w-full px-1 py-0.5 text-right" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t bg-gray-50 flex justify-between items-center">
          {confirmReset ? (
            <span className="flex items-center gap-2 text-[11px]">
              すべて初期値に戻しますか？
              <button type="button" onClick={() => { setMaterialDB(DEFAULT_MATERIALS); setConfirmReset(false); }} className="px-2 py-0.5 bg-red-600 text-white">戻す</button>
              <button type="button" onClick={() => setConfirmReset(false)} className="px-2 py-0.5 border border-gray-300 bg-white">やめる</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmReset(true)} className="text-red-600 text-[11px] flex items-center gap-1"><FiRotateCcw /> 初期値に戻す</button>
          )}
          <button type="button" onClick={onClose} className="bg-[#3b3b3b] text-white px-4 py-1.5 text-[12px]">閉じる（自動保存）</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 計算書（印刷）

interface ReportProps {
  title: string;
  partLabel: string;
  profile: Profile;
  cond: Conditions;
  outLabel: string;
  limitLabel: string;
  limit: number | null;
  headline: string;
  reason: string;
  isSlab: boolean;
  groundDepth: number;
  groundLambda: number;
  layerNo: (i: number) => number;
}

function PrintableReport({ title, partLabel, profile, cond, outLabel, limitLabel, limit, headline, reason, isSlab, groundDepth, groundLambda, layerNo }: ReportProps) {
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  const td = 'border border-black px-1.5 py-0.5';
  const ng = profile.isCondensing;
  return (
    <div id="print-report-container" className="hidden print:block text-black bg-white text-[10px] leading-snug">
      <div className="flex justify-between items-end border-b-2 border-black pb-1 mb-3">
        <div>
          <h1 className="text-[18px] font-bold">結露計算書</h1>
          <p>{partLabel} · {title}</p>
        </div>
        <p>{today}　yaneyuka.com 結露検討</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <table className="w-full border-collapse">
          <tbody>
            <tr><td className={`${td} bg-gray-100`} colSpan={3}>条件</td></tr>
            <tr><td className={td}>室内</td><td className={`${td} text-right`}>{cond.ti.toFixed(1)}℃</td><td className={`${td} text-right`}>{cond.rhi}%</td></tr>
            <tr><td className={td}>{isSlab ? '地盤（地中温度）' : '室外'}</td><td className={`${td} text-right`}>{cond.te.toFixed(1)}℃</td><td className={`${td} text-right`}>{cond.rhe}%</td></tr>
            <tr><td className={td}>室内側 Rsi</td><td className={`${td} text-right`} colSpan={2}>{cond.rsi.toFixed(2)} m²K/W</td></tr>
            <tr>
              <td className={td}>{isSlab ? `地盤 Rg（深さ ${groundDepth}m / λ ${groundLambda}）` : profile.ventApplied ? '室外側 Rse（通気層側）' : '室外側 Rse'}</td>
              <td className={`${td} text-right`} colSpan={2}>{profile.rseUsed.toFixed(2)} m²K/W</td>
            </tr>
          </tbody>
        </table>
        <table className="w-full border-collapse">
          <tbody>
            <tr><td className={`${td} bg-gray-100`} colSpan={2}>判定</td></tr>
            <tr><td className={td}>結果</td><td className={`${td} font-bold`}>{ng ? '× ' : '○ '}{headline}</td></tr>
            <tr><td className={td}>最小の余裕</td><td className={`${td} text-right`}>{profile.worst ? sgn(profile.worst.margin) : '—'}℃</td></tr>
            <tr><td className={td}>熱貫流率 U</td><td className={`${td} text-right`}>{profile.uValue.toFixed(2)} W/m²K</td></tr>
            <tr><td className={td}>{limitLabel}</td><td className={`${td} text-right`}>{limit === null ? '—' : `${f1(limit)}℃`}</td></tr>
          </tbody>
        </table>
      </div>
      <p className="mb-3">{reason}</p>

      <table className="w-full border-collapse mb-3">
        <thead>
          <tr className="bg-gray-100">
            <th className={td}>No</th><th className={`${td} text-left`}>材料（{outLabel}側 → 室内側）</th><th className={td}>厚さ mm</th>
            <th className={td}>λ W/mK</th><th className={td}>R m²K/W</th><th className={td}>μ</th><th className={td}>Sd m</th>
          </tr>
        </thead>
        <tbody>
          {profile.layers.map((l, i) => (
            <tr key={i}>
              <td className={`${td} text-center`}>{layerNo(i)}</td>
              <td className={td}>{l.material?.name ?? '不明'}{l.excluded ? '（通気層より外側・計算除外）' : ''}{l.material?.fixedR !== undefined ? '（中空層 R 固定）' : ''}{i > 0 && l.layer.isBonded ? '（外側と密着）' : ''}</td>
              <td className={`${td} text-right`}>{l.d}</td>
              <td className={`${td} text-right`}>{l.material?.fixedR !== undefined ? '—' : l.material?.lambda.toFixed(3)}</td>
              <td className={`${td} text-right`}>{l.excluded ? '—' : l.r.toFixed(3)}</td>
              <td className={`${td} text-right`}>{l.material?.mu}</td>
              <td className={`${td} text-right`}>{l.excluded ? '—' : l.sd.toFixed(3)}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className={td} colSpan={4}>合計（表面抵抗を含む Rt）</td>
            <td className={`${td} text-right`}>{profile.rTotal.toFixed(3)}</td>
            <td className={td} />
            <td className={`${td} text-right`}>{profile.layers.reduce((s, l) => s + l.sd, 0).toFixed(3)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mb-3 border border-black">
        <SectionChart profile={profile} ti={cond.ti} rhi={cond.rhi} te={cond.te} rhe={cond.rhe} outLabel={outLabel} view="fit" layerNo={layerNo} />
      </div>

      <InterfaceTable profile={profile} outLabel={outLabel} print />

      <p className="mt-3 text-[8.5px] text-gray-600">
        ※ 定常計算（グレイザー法）による簡易判定で、実際の建物の性能を保証するものではありません。気象の変動・施工精度・経年変化は考慮していません。
        0℃未満は氷の飽和水蒸気圧（霜点）で判定。密閉空気層は R 0.09 固定。通気層より外側は計算から除外。
        {isSlab && ' 土間は地盤側の防湿層より下を判定から除外。'}
      </p>
    </div>
  );
}
