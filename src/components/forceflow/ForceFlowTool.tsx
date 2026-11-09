'use client';
/**
 * 設計ツール › 構造設計 › 構造フロー。壁・梁の力の流れを実寸・実材料で見る。
 * 操作は「形を作る → 条件を入れる → 結果を見る → 保存」の 4 ステップ。
 * 計算は src/lib/forceFlow.ts（Web Worker で実行）。判定（適否）は出さず、目安の 3 段階にとどめる。
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiCopy, FiDownload, FiMaximize2, FiPlus, FiX } from 'react-icons/fi';
import { levelOf, nearestNode, type FlowLoad, type FlowMaterial, type FlowModel, type FlowResult, type FlowSupport, type FlowZone, type MaterialKind, type MeshLevel } from '@/lib/forceFlow';
import {
  FLOW_DISCLAIMER,
  FLOW_EXAMPLES,
  FLOW_EXCLUSIONS,
  LEVEL_LABELS,
  MATERIAL_BASIS,
  STRUCTURES,
  USES,
  cloneModel,
  concreteMaterial,
  estimateLoad,
  exampleModel,
  materialPreset,
  newPartId,
} from '@/lib/forceFlowModel';
import { flowStudyNav, type FlowStudy } from '@/lib/forceFlowStudies';
import FlowCanvas from './FlowCanvas';
import { ForceFlowSave } from './ForceFlowKarte';
import { FIELD_LABELS, LEVEL_COLORS, deformScale, divergingGradient, fieldScale, type FlowField, type FlowView } from './flowDraw';
import { exportPdf, exportPng, formatRatio, type SheetOptions, type SheetPlan } from './flowExport';
import { useFlowSolver } from './useFlowSolver';

type Plan = { name: string; model: FlowModel };

const DRAFT_KEY = 'yaneyuka:force-flow-draft';
const panel = 'bg-gray-50 p-3 border border-[#3b3b3b] space-y-2';
const heading = 'flex items-baseline gap-2 text-[11px] font-bold text-gray-800';
const stepNo = 'font-mono text-[10px] font-normal text-gray-500';
const small = 'block text-[10px] text-gray-500 mb-0.5';
const field = 'w-full text-[12px] px-2 py-1 border border-gray-300 bg-white';
const cellField = 'w-full text-[11px] px-1 py-0.5 border border-gray-300 bg-white';
const linkBtn = 'px-2 py-1 text-[10px] border border-gray-300 bg-white hover:bg-gray-100 inline-flex items-center gap-1';

/** 入力途中の空欄や「12.」を壊さない数値欄 */
function Num({ value, onChange, className = field, step, min, ariaLabel }: { value: number; onChange: (v: number) => void; className?: string; step?: number; min?: number; ariaLabel?: string }) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText((t) => (t !== '' && Number(t) === value ? t : String(value)));
  }, [value]);
  return (
    <input
      type="number"
      inputMode="decimal"
      value={text}
      step={step}
      min={min}
      aria-label={ariaLabel}
      className={className}
      onChange={(e) => {
        setText(e.target.value);
        const v = Number(e.target.value);
        if (e.target.value !== '' && Number.isFinite(v)) onChange(v);
      }}
      onBlur={() => setText(String(value))}
    />
  );
}

const defaultPlan = (id = 'wall-opening'): Plan => ({ name: '案A', model: exampleModel(id) ?? (exampleModel('wall-opening') as FlowModel) });

const sameScale = (a: number[]) => (a.length ? Math.max(...a) : 1);

export default function ForceFlowTool({ initialExample }: { initialExample?: string }) {
  const [plans, setPlans] = useState<Plan[]>(() => [defaultPlan(initialExample)]);
  const [exampleId, setExampleId] = useState<string>(initialExample ?? 'wall-opening');
  const [active, setActive] = useState(0);
  const [view, setView] = useState<FlowView>({ field: 'principal', fill: true, lines: true, vectors: false, deformed: true });
  const [zoom, setZoom] = useState(1);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [probe, setProbe] = useState<{ slot: number; x: number; y: number } | null>(null);
  const [memo, setMemo] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [explain, setExplain] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loadForm, setLoadForm] = useState({ use: 'office', structure: 'rc', floors: 3, tributary: 5 });
  const { slots, request, clear } = useFlowSolver();

  const compare = plans.length > 1;
  const plan = plans[Math.min(active, plans.length - 1)];
  const model = plan.model;

  // 物件カルテから開かれたとき／前回の続き
  const openStudy = useCallback((s: FlowStudy) => {
    try {
      const m = JSON.parse(s.modelJson) as FlowModel;
      setPlans([{ name: s.planName, model: m }]);
      setActive(0);
      setMemo(s.memo);
      setPropertyName(s.propertyName);
      setExampleId('');
      setProbe(null);
      setSelectedZone(null);
    } catch {
      window.alert('保存データを読み込めませんでした。');
    }
  }, []);

  useEffect(() => {
    const pending = flowStudyNav.consume();
    if (pending) {
      openStudy(pending);
    } else if (!initialExample) {
      try {
        const raw = window.localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const d = JSON.parse(raw) as { plans: Plan[]; memo?: string };
          if (Array.isArray(d.plans) && d.plans.length > 0 && d.plans[0].model?.version === 1) {
            setPlans(d.plans.slice(0, 2));
            setMemo(d.memo ?? '');
            setExampleId('');
          }
        }
      } catch {
        /* 下書きが読めなければ既定の例題で始める */
      }
    }
    return flowStudyNav.subscribe((s) => {
      flowStudyNav.consume();
      openStudy(s);
    });
  }, [initialExample, openStudy]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ plans, memo }));
      } catch {
        /* 保存できない環境では下書きなしで動く */
      }
    }, 500);
    return () => clearTimeout(t);
  }, [plans, memo]);

  useEffect(() => {
    plans.forEach((p, i) => request(i, p.model));
    if (plans.length < 2) clear(1);
  }, [plans, request, clear]);

  const updateModel = useCallback(
    (fn: (m: FlowModel) => FlowModel) => {
      setPlans((ps) => ps.map((p, i) => (i === active ? { ...p, model: fn(p.model) } : p)));
      setExampleId('');
    },
    [active]
  );
  const patchModel = (patch: Partial<FlowModel>) => updateModel((m) => ({ ...m, ...patch }));
  const patchMaterial = (patch: Partial<FlowMaterial>) => updateModel((m) => ({ ...m, material: { ...m.material, ...patch } }));
  const patchZone = (id: string, patch: Partial<FlowZone>) => updateModel((m) => ({ ...m, zones: m.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) }));
  const patchSupport = (id: string, patch: Partial<FlowSupport>) => updateModel((m) => ({ ...m, supports: m.supports.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  const patchLoad = (id: string, patch: Partial<FlowLoad>) => updateModel((m) => ({ ...m, loads: m.loads.map((l) => (l.id === id ? ({ ...l, ...patch } as FlowLoad) : l)) }));

  const loadExample = (id: string) => {
    const m = exampleModel(id);
    if (!m) return;
    setPlans((ps) => ps.map((p, i) => (i === active ? { ...p, model: m } : p)));
    setExampleId(id);
    setSelectedZone(null);
    setProbe(null);
  };

  const addZone = (kind: FlowZone['kind'], shape: FlowZone['shape']) => {
    const short = Math.min(model.width, model.height);
    const w = kind === 'column' ? Math.round(Math.max(300, model.width * 0.1)) : Math.round(short * 0.3);
    const h = kind === 'column' ? model.height : shape === 'circle' ? w : Math.round(short * 0.4);
    const zone: FlowZone = { id: newPartId('z'), kind, shape, x: Math.round((model.width - w) / 2), y: kind === 'column' ? 0 : Math.round((model.height - h) / 2), w, h };
    if (kind === 'column') zone.t = Math.round(model.thickness * 2);
    updateModel((m) => ({ ...m, zones: [...m.zones, zone] }));
    setSelectedZone(zone.id);
  };

  const addLoad = (kind: FlowLoad['kind']) => {
    const id = newPartId('l');
    const load: FlowLoad =
      kind === 'line' ? { id, kind, y: model.height, x0: 0, x1: model.width, q: 10 } : kind === 'shear' ? { id, kind, y: model.height, H: 50 } : { id, kind, x: Math.round(model.width / 2), y: model.height, fx: 0, fy: 50 };
    updateModel((m) => ({ ...m, loads: [...m.loads, load] }));
  };

  const addSupport = () => {
    updateModel((m) => ({ ...m, supports: [...m.supports, { id: newPartId('s'), edge: 'bottom', from: 0, to: m.width, type: 'fixed' }] }));
  };

  const setKind = (kind: MaterialKind) => updateModel((m) => ({ ...m, material: materialPreset(kind) }));

  const estimate = estimateLoad(loadForm);
  const applyEstimate = (withShear: boolean) => {
    updateModel((m) => {
      const loads = [...m.loads];
      const li = loads.findIndex((l) => l.kind === 'line' && l.y >= m.height - 1);
      const line: FlowLoad = { id: li >= 0 ? loads[li].id : newPartId('l'), kind: 'line', y: m.height, x0: 0, x1: m.width, q: estimate.q };
      if (li >= 0) loads[li] = line;
      else loads.push(line);
      if (withShear) {
        const si = loads.findIndex((l) => l.kind === 'shear' && l.y >= m.height - 1);
        const shear: FlowLoad = { id: si >= 0 ? loads[si].id : newPartId('l'), kind: 'shear', y: m.height, H: estimate.shear(m.width) };
        if (si >= 0) loads[si] = shear;
        else loads.push(shear);
      }
      return { ...m, loads };
    });
  };

  const duplicate = () => {
    setPlans((ps) => (ps.length > 1 ? ps : [ps[0], { name: '案B', model: cloneModel(ps[0].model) }]));
    setActive(1);
  };
  const endCompare = () => {
    setPlans((ps) => [ps[Math.min(active, ps.length - 1)]]);
    setActive(0);
    setProbe(null);
  };

  const results = plans.map((_, i) => slots[i]?.result ?? null);
  // 比較では 2 案を同じ尺度で描く（尺度が揃わないと比較を誤る）
  const scale = useMemo(() => sameScale(results.filter((r): r is FlowResult => !!r).map((r) => fieldScale(r, view.field))), [results[0], results[1], view.field]); // eslint-disable-line react-hooks/exhaustive-deps
  const deform = useMemo(() => {
    const k = results.filter((r): r is FlowResult => !!r).map(deformScale).filter((v) => v > 0);
    return k.length ? Math.min(...k) : 0;
  }, [results[0], results[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  const status = slots[active] ?? { result: null, error: null, busy: false };
  const activeResult = status.result;
  const busy = plans.some((_, i) => slots[i]?.busy);

  const probeResult = probe ? slots[probe.slot]?.result ?? null : null;
  const probeNode = probe && probeResult && probeResult.W === plans[probe.slot]?.model.width && probeResult.H === plans[probe.slot]?.model.height ? nearestNode(probeResult, probe.x, probe.y) : -1;

  const ready = results.every(Boolean);
  const sheet = (): SheetOptions => ({
    plans: plans.map((p, i) => ({ name: p.name, model: p.model, result: results[i] as FlowResult })) as SheetPlan[],
    view,
    scale,
    deform,
    memo,
    propertyName,
    date: new Date(),
  });
  const runExport = async (fn: (o: SheetOptions) => Promise<void>) => {
    if (!ready) return;
    setExporting(true);
    try {
      await fn(sheet());
    } catch (e) {
      console.error('force-flow: export', e);
      window.alert('出力できませんでした。');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!explain) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setExplain(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [explain]);

  const figure = (i: number, maxHeight: number, editable: boolean, figureZoom = 1) => {
    const p = plans[i];
    const onMove = (id: string, x: number, y: number) => {
      setPlans((ps) => ps.map((q, k) => (k === i ? { ...q, model: { ...q.model, zones: q.model.zones.map((z) => (z.id === id ? { ...z, x, y } : z)) } } : q)));
      setExampleId('');
    };
    return (
      <FlowCanvas
        model={p.model}
        result={slots[i]?.result ?? null}
        view={view}
        scale={scale}
        deform={deform}
        zoom={figureZoom}
        maxHeight={maxHeight}
        selectedZone={editable && i === active ? selectedZone : null}
        probe={probe && probe.slot === i ? probe : null}
        onZoneMove={editable ? onMove : undefined}
        onSelectZone={editable ? (id) => { setActive(i); setSelectedZone(id); } : undefined}
        onProbe={(pt) => setProbe({ slot: i, ...pt })}
        ariaLabel={`${p.name} の力の流れの図`}
      />
    );
  };

  const legend = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-gray-600">
      {view.fill && view.field === 'ratio' ? (
        LEVEL_LABELS.map((l, i) => (
          <span key={l} className="inline-flex items-center gap-1">
            <i className="inline-block w-4 h-2.5" style={{ background: `rgb(${LEVEL_COLORS[i].join(',')})` }} />
            {l}
          </span>
        ))
      ) : view.fill ? (
        <span className="inline-flex items-center gap-1.5 font-mono">
          −{scale.toFixed(2)}
          <i className="inline-block w-40 h-2.5" style={{ background: divergingGradient() }} />
          ＋{scale.toFixed(2)} N/mm²
        </span>
      ) : null}
      {view.lines && (
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1"><i className="inline-block w-4 h-[2px]" style={{ background: 'rgb(18,62,150)' }} />圧縮の流れ</span>
          <span className="inline-flex items-center gap-1"><i className="inline-block w-4 h-[2px]" style={{ background: 'rgb(176,30,20)' }} />引張の流れ</span>
        </span>
      )}
      {compare && <span>2 案は同じ色の尺度</span>}
    </div>
  );

  const summaryRows: { label: string; get: (r: FlowResult) => string }[] = [
    { label: '最大引張', get: (r) => `${r.summary.tension.value.toFixed(2)} N/mm²` },
    { label: '最大圧縮', get: (r) => `${r.summary.compression.value.toFixed(2)} N/mm²` },
    { label: '強度に対する目安', get: (r) => `${r.summary.ratio.toFixed(2)}（${LEVEL_LABELS[levelOf(r.summary.ratio)]}）` },
    {
      label: '最大たわみ',
      get: (r) => {
        const d = r.summary.deflection;
        return `${d.vertical.value.toFixed(2)} mm${d.span && d.spanRatio ? `（スパン ${Math.round(d.span).toLocaleString()} の ${formatRatio(d.spanRatio)}）` : ''}`;
      },
    },
    {
      label: '最大水平変位',
      get: (r) => {
        const d = r.summary.deflection;
        return `${d.horizontal.value.toFixed(2)} mm${d.driftRatio !== null ? `（高さの ${formatRatio(d.driftRatio)}）` : ''}`;
      },
    },
    { label: '応力集中部の最大', get: (r) => `${r.summary.concentration.toFixed(2)} N/mm²（値は参考）` },
    { label: '反力（鉛直）', get: (r) => `${r.summary.reaction.fy.toFixed(1)} kN` },
  ];

  const warnings = Array.from(new Set(activeResult?.warnings ?? []));
  const m = model.material;

  return (
    <div className="p-4 text-[12px] text-gray-700">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4">
        {/* 左: 形と条件 */}
        <div className="space-y-3">
          <section className={panel}>
            <h4 className={heading}><span className={stepNo}>01</span>形を作る</h4>
            <div>
              <span className={small}>例題から始める</span>
              <div className="flex flex-wrap gap-1">
                {FLOW_EXAMPLES.map((ex) => (
                  <button key={ex.id} type="button" onClick={() => loadExample(ex.id)} className={`px-2 py-1 text-[11px] border ${exampleId === ex.id ? 'bg-[#3b3b3b] text-white border-[#3b3b3b]' : 'bg-white border-gray-300'}`}>
                    {ex.label}
                  </button>
                ))}
              </div>
              {exampleId && <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{FLOW_EXAMPLES.find((e) => e.id === exampleId)?.hint}</p>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label><span className={small}>幅 mm</span><Num value={model.width} onChange={(v) => patchModel({ width: v })} step={50} min={1} /></label>
              <label><span className={small}>高さ mm</span><Num value={model.height} onChange={(v) => patchModel({ height: v })} step={50} min={1} /></label>
              <label><span className={small}>壁厚 mm</span><Num value={model.thickness} onChange={(v) => patchModel({ thickness: v })} step={5} min={1} /></label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className={small + ' mb-0'}>開口・柱（図をドラッグでも動かせます）</span>
              </div>
              {model.zones.map((z) => (
                <div key={z.id} className={`mb-1 p-1 border ${selectedZone === z.id ? 'border-[#1dad95] bg-white' : 'border-transparent'}`} onFocusCapture={() => setSelectedZone(z.id)}>
                  <div className="flex items-center justify-between text-[10px] text-gray-600">
                    <span>{z.kind === 'column' ? '柱' : z.shape === 'circle' ? '円形の孔' : '開口'}</span>
                    <button type="button" onClick={() => updateModel((mm) => ({ ...mm, zones: mm.zones.filter((v) => v.id !== z.id) }))} className="text-gray-400 hover:text-red-600" title="外す" aria-label="外す"><FiX /></button>
                  </div>
                  <div className={`grid gap-1 ${z.kind === 'column' ? 'grid-cols-5' : z.shape === 'circle' ? 'grid-cols-3' : 'grid-cols-4'}`}>
                    <label><span className={small}>左から</span><Num className={cellField} value={z.x} step={50} onChange={(v) => patchZone(z.id, { x: v })} /></label>
                    <label><span className={small}>下から</span><Num className={cellField} value={z.y} step={50} onChange={(v) => patchZone(z.id, { y: v })} /></label>
                    {z.shape === 'circle' ? (
                      <label><span className={small}>径</span><Num className={cellField} value={z.w} step={10} onChange={(v) => patchZone(z.id, { w: v, h: v })} /></label>
                    ) : (
                      <>
                        <label><span className={small}>幅</span><Num className={cellField} value={z.w} step={50} onChange={(v) => patchZone(z.id, { w: v })} /></label>
                        <label><span className={small}>高さ</span><Num className={cellField} value={z.h} step={50} onChange={(v) => patchZone(z.id, { h: v })} /></label>
                      </>
                    )}
                    {z.kind === 'column' && <label><span className={small}>厚さ</span><Num className={cellField} value={z.t ?? model.thickness} step={10} onChange={(v) => patchZone(z.id, { t: v })} /></label>}
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-1 mt-1">
                <button type="button" className={linkBtn} onClick={() => addZone('opening', 'rect')}><FiPlus />開口</button>
                <button type="button" className={linkBtn} onClick={() => addZone('opening', 'circle')}><FiPlus />円形の孔</button>
                <button type="button" className={linkBtn} onClick={() => addZone('column', 'rect')}><FiPlus />柱</button>
              </div>
            </div>
          </section>

          <section className={panel}>
            <h4 className={heading}><span className={stepNo}>02</span>条件を入れる</h4>
            <div className="grid grid-cols-3 gap-1">
              {(['rc', 'steel', 'wood'] as MaterialKind[]).map((k) => (
                <button key={k} type="button" onClick={() => setKind(k)} className={`px-1 py-1 text-[11px] border ${m.kind === k ? 'bg-[#3b3b3b] text-white border-[#3b3b3b]' : 'bg-white border-gray-300'}`}>
                  {k === 'rc' ? 'RC' : k === 'steel' ? '鉄骨' : '木'}
                </button>
              ))}
            </div>
            {m.kind === 'rc' && m.concrete && (
              <div className="grid grid-cols-2 gap-2">
                <label><span className={small}>Fc N/mm²</span><Num value={m.concrete.Fc} step={3} min={1} onChange={(v) => v > 0 && patchModel({ material: concreteMaterial(v, m.concrete?.gamma ?? 23) })} /></label>
                <label><span className={small}>γ kN/m³（E 算定用）</span><Num value={m.concrete.gamma} step={0.5} min={1} onChange={(v) => v > 0 && patchModel({ material: concreteMaterial(m.concrete?.Fc ?? 24, v) })} /></label>
              </div>
            )}
            <div className="grid grid-cols-4 gap-1">
              <label><span className={small}>E</span><Num className={cellField} value={m.E} step={100} onChange={(v) => patchMaterial({ E: v })} /></label>
              <label><span className={small}>ν</span><Num className={cellField} value={m.nu} step={0.05} onChange={(v) => patchMaterial({ nu: v })} /></label>
              <label><span className={small}>引張基準</span><Num className={cellField} value={m.ft} step={0.1} onChange={(v) => patchMaterial({ ft: v })} /></label>
              <label><span className={small}>圧縮基準</span><Num className={cellField} value={m.fc} step={0.1} onChange={(v) => patchMaterial({ fc: v })} /></label>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">{MATERIAL_BASIS[m.kind]}</p>

            <div>
              <span className={small}>支点</span>
              {model.supports.map((s) => {
                const point = s.type !== 'fixed';
                return (
                  <div key={s.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_16px] gap-1 mb-1 items-center">
                    <select aria-label="辺" className={cellField} value={s.edge} onChange={(e) => patchSupport(s.id, { edge: e.target.value as FlowSupport['edge'] })}>
                      <option value="bottom">下端</option><option value="top">上端</option><option value="left">左端</option><option value="right">右端</option>
                    </select>
                    <select aria-label="種類" className={cellField} value={s.type} onChange={(e) => {
                      const type = e.target.value as FlowSupport['type'];
                      patchSupport(s.id, type === 'fixed' ? { type } : { type, to: s.from });
                    }}>
                      <option value="fixed">固定</option><option value="pin">ピン</option><option value="roller">ローラー</option>
                    </select>
                    <Num ariaLabel="位置（から）" className={cellField} value={s.from} step={50} onChange={(v) => patchSupport(s.id, point ? { from: v, to: v } : { from: v })} />
                    {point ? <span className="text-[10px] text-gray-400 text-center">1 点</span> : <Num ariaLabel="位置（まで）" className={cellField} value={s.to} step={50} onChange={(v) => patchSupport(s.id, { to: v })} />}
                    <button type="button" onClick={() => updateModel((mm) => ({ ...mm, supports: mm.supports.filter((v) => v.id !== s.id) }))} className="text-gray-400 hover:text-red-600" title="外す" aria-label="外す"><FiX /></button>
                  </div>
                );
              })}
              <p className="text-[10px] text-gray-500">位置は下・上端は左から、左・右端は下からの mm</p>
              <button type="button" className={`${linkBtn} mt-1`} onClick={addSupport}><FiPlus />支点</button>
            </div>

            <div>
              <span className={small}>荷重</span>
              {model.loads.map((l) => (
                <div key={l.id} className="mb-1">
                  <div className="flex items-center justify-between text-[10px] text-gray-600">
                    <span>{l.kind === 'line' ? '線荷重（下向き）' : l.kind === 'shear' ? '水平力（右向き＋）' : '集中荷重'}</span>
                    <button type="button" onClick={() => updateModel((mm) => ({ ...mm, loads: mm.loads.filter((v) => v.id !== l.id) }))} className="text-gray-400 hover:text-red-600" title="外す" aria-label="外す"><FiX /></button>
                  </div>
                  {l.kind === 'line' && (
                    <div className="grid grid-cols-2 gap-1">
                      <label><span className={small}>q kN/m</span><Num className={cellField} value={l.q} step={5} onChange={(v) => patchLoad(l.id, { q: v })} /></label>
                      <label><span className={small}>高さ mm</span><Num className={cellField} value={l.y} step={100} onChange={(v) => patchLoad(l.id, { y: v })} /></label>
                    </div>
                  )}
                  {l.kind === 'shear' && (
                    <div className="grid grid-cols-2 gap-1">
                      <label><span className={small}>H kN</span><Num className={cellField} value={l.H} step={10} onChange={(v) => patchLoad(l.id, { H: v })} /></label>
                      <label><span className={small}>高さ mm</span><Num className={cellField} value={l.y} step={100} onChange={(v) => patchLoad(l.id, { y: v })} /></label>
                    </div>
                  )}
                  {l.kind === 'point' && (
                    <div className="grid grid-cols-4 gap-1">
                      <label><span className={small}>下向き kN</span><Num className={cellField} value={l.fy} step={5} onChange={(v) => patchLoad(l.id, { fy: v })} /></label>
                      <label><span className={small}>右向き kN</span><Num className={cellField} value={l.fx} step={5} onChange={(v) => patchLoad(l.id, { fx: v })} /></label>
                      <label><span className={small}>左から</span><Num className={cellField} value={l.x} step={50} onChange={(v) => patchLoad(l.id, { x: v })} /></label>
                      <label><span className={small}>下から</span><Num className={cellField} value={l.y} step={50} onChange={(v) => patchLoad(l.id, { y: v })} /></label>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap gap-1 mt-1">
                <button type="button" className={linkBtn} onClick={() => addLoad('line')}><FiPlus />線荷重</button>
                <button type="button" className={linkBtn} onClick={() => addLoad('shear')}><FiPlus />水平力</button>
                <button type="button" className={linkBtn} onClick={() => addLoad('point')}><FiPlus />集中荷重</button>
              </div>
              <label className="flex items-center gap-1.5 mt-2 text-[11px]">
                <input type="checkbox" checked={model.selfWeight} onChange={(e) => patchModel({ selfWeight: e.target.checked })} />
                自重を入れる（{m.density} kN/m³）
              </label>
            </div>

            <details className="border-t pt-2">
              <summary className="cursor-pointer text-[11px] font-bold">階数・用途から荷重を入れる</summary>
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <label><span className={small}>用途</span>
                    <select className={field} value={loadForm.use} onChange={(e) => setLoadForm((f) => ({ ...f, use: e.target.value }))}>
                      {USES.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
                    </select>
                  </label>
                  <label><span className={small}>構造</span>
                    <select className={field} value={loadForm.structure} onChange={(e) => setLoadForm((f) => ({ ...f, structure: e.target.value }))}>
                      {STRUCTURES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </label>
                  <label><span className={small}>上に載る階数</span><Num value={loadForm.floors} min={1} step={1} onChange={(v) => setLoadForm((f) => ({ ...f, floors: v }))} /></label>
                  <label><span className={small}>負担幅 m</span><Num value={loadForm.tributary} min={0} step={0.5} onChange={(v) => setLoadForm((f) => ({ ...f, tributary: v }))} /></label>
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  （固定 {estimate.dead}＋積載 {estimate.live} kN/m²）× {loadForm.tributary} m × {loadForm.floors} 層 ＝ <b>{estimate.q} kN/m</b>。積載は令85条の大梁・柱用、固定は概算です。物件の値に上書きしてください。
                </p>
                <div className="flex flex-wrap gap-1">
                  <button type="button" className={linkBtn} onClick={() => applyEstimate(false)}>上端の線荷重に入れる</button>
                  <button type="button" className={linkBtn} onClick={() => applyEstimate(true)}>水平力 {estimate.shear(model.width)} kN も入れる</button>
                </div>
              </div>
            </details>

            <label className="block">
              <span className={small}>メッシュ</span>
              <select className={field} value={model.mesh} onChange={(e) => patchModel({ mesh: e.target.value as MeshLevel })}>
                <option value="coarse">粗い（軽い）</option>
                <option value="standard">標準（短辺 20 分割）</option>
                <option value="fine">細かい（短辺 40 分割）</option>
              </select>
            </label>
          </section>
        </div>

        {/* 右: 結果と保存 */}
        <div className="space-y-3 min-w-0">
          <section className="border border-[#3b3b3b]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 bg-gray-100 border-b">
              <h4 className={heading}><span className={stepNo}>03</span>結果を見る</h4>
              <select aria-label="色で表す量" value={view.field} onChange={(e) => setView((v) => ({ ...v, field: e.target.value as FlowField }))} className="text-[11px] px-1 py-0.5 border border-gray-300 bg-white">
                {(Object.keys(FIELD_LABELS) as FlowField[]).map((k) => <option key={k} value={k}>{FIELD_LABELS[k]}</option>)}
              </select>
              {([['fill', '濃淡'], ['lines', '主応力線'], ['vectors', 'ベクトル'], ['deformed', '変形']] as [keyof FlowView, string][]).map(([k, label]) => (
                <label key={k} className="inline-flex items-center gap-1 text-[11px]">
                  <input type="checkbox" checked={view[k] as boolean} onChange={(e) => setView((v) => ({ ...v, [k]: e.target.checked }))} />
                  {label}
                </label>
              ))}
              <span className="ml-auto inline-flex items-center gap-1">
                {[1, 2, 3].map((z) => (
                  <button key={z} type="button" onClick={() => setZoom(z)} className={`px-1.5 py-0.5 text-[10px] border font-mono ${zoom === z ? 'bg-[#3b3b3b] text-white border-[#3b3b3b]' : 'bg-white border-gray-300'}`}>×{z}</button>
                ))}
                <button type="button" onClick={() => setExplain(true)} className={linkBtn}><FiMaximize2 />説明モード</button>
                {compare ? (
                  <button type="button" onClick={endCompare} className={linkBtn}><FiX />比較をやめる</button>
                ) : (
                  <button type="button" onClick={duplicate} className={linkBtn}><FiCopy />案を複製して比較</button>
                )}
              </span>
            </div>

            <div className={`grid gap-px bg-gray-300 ${compare ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
              {plans.map((p, i) => (
                <div key={i} className="bg-white min-w-0">
                  {compare && (
                    <div className={`flex items-center gap-2 px-2 py-1 border-b text-[11px] ${i === active ? 'bg-[#e6f5f2]' : 'bg-white'}`}>
                      <button type="button" onClick={() => setActive(i)} className="font-bold">{i === active ? '● ' : '○ '}</button>
                      <input aria-label="案名" value={p.name} onChange={(e) => setPlans((ps) => ps.map((q, k) => (k === i ? { ...q, name: e.target.value } : q)))} className="flex-1 min-w-0 text-[11px] px-1 bg-transparent border-b border-transparent focus:border-gray-400" />
                      {i === active && <span className="text-[10px] text-gray-500">左の欄で編集中</span>}
                    </div>
                  )}
                  {figure(i, compare ? 420 : 540, true, zoom)}
                  {slots[i]?.error && <p className="px-3 py-2 text-[11px] text-red-700 border-t">{slots[i].error}</p>}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 border-t">
              {legend}
              <span className="font-mono text-[10px] text-gray-500">
                {busy ? '計算中…' : activeResult ? `${activeResult.elements.toLocaleString()} 要素 · ${Math.round(activeResult.ms)} ms` : ''}
              </span>
            </div>
            {probeNode >= 0 && probeResult && (
              <div className="px-3 py-1.5 border-t bg-gray-50 text-[11px]">
                <span className="text-gray-500 mr-2">読み取り（左から {Math.round(probe!.x).toLocaleString()}、下から {Math.round(probe!.y).toLocaleString()} mm）</span>
                <span className="tabular-nums">
                  σ1 <b>{probeResult.s1[probeNode].toFixed(2)}</b>　σ2 <b>{probeResult.s2[probeNode].toFixed(2)}</b>　σx {probeResult.sx[probeNode].toFixed(2)}　σy {probeResult.sy[probeNode].toFixed(2)}　τ {probeResult.txy[probeNode].toFixed(2)} N/mm²　目安 {probeResult.ratio[probeNode].toFixed(2)}
                </span>
                {!!probeResult.flag[probeNode] && <span className="ml-2 text-[#b45309] font-bold">応力集中部・値は参考</span>}
              </div>
            )}
            <div className="overflow-x-auto border-t">
              <table className="w-full text-[11px]">
                {compare && (
                  <thead>
                    <tr className="text-gray-500">
                      <th className="text-left px-3 py-1 font-normal" />
                      {plans.map((p, i) => <th key={i} className="text-left px-3 py-1 font-normal">{p.name}</th>)}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {summaryRows.map((row) => (
                    <tr key={row.label} className="border-t first:border-t-0">
                      <td className="px-3 py-1 text-gray-600 whitespace-nowrap">{row.label}</td>
                      {plans.map((_, i) => (
                        <td key={i} className="px-3 py-1 tabular-nums">{slots[i]?.result ? row.get(slots[i].result as FlowResult) : '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {warnings.length > 0 && (
              <div className="px-3 py-1.5 border-t bg-amber-50 text-[11px] text-amber-900">
                {warnings.map((w) => <p key={w}>・{w}</p>)}
              </div>
            )}
            <p className="px-3 py-1.5 border-t text-[10px] text-gray-500 leading-relaxed">
              最大値は応力集中部（開口の角・支点の端・集中荷重の近く）を除いた値です。図は判定ではなく、基準に対する目安を色で示しています。点をタップすると応力度を読めます。
            </p>
          </section>

          <section className={panel}>
            <h4 className={heading}><span className={stepNo}>04</span>保存・出力</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                {!compare && (
                  <label className="block">
                    <span className={small}>案名</span>
                    <input value={plan.name} onChange={(e) => setPlans((ps) => ps.map((p, i) => (i === active ? { ...p, name: e.target.value } : p)))} className={field} />
                  </label>
                )}
                <label className="block">
                  <span className={small}>メモ（判断の理由など）</span>
                  <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} className={field} />
                </label>
                <div className="flex flex-wrap gap-1">
                  <button type="button" disabled={!ready || exporting} onClick={() => runExport(exportPng)} className={`${linkBtn} disabled:opacity-50`}><FiDownload />画像（PNG）</button>
                  <button type="button" disabled={!ready || exporting} onClick={() => runExport(exportPdf)} className={`${linkBtn} disabled:opacity-50`}><FiDownload />PDF</button>
                </div>
                <p className="text-[10px] text-gray-500">出力には解析条件の一覧と免責文が自動で入ります。</p>
              </div>
              <ForceFlowSave planName={plan.name} memo={memo} model={model} onOpen={openStudy} onPropertyChange={setPropertyName} />
            </div>
          </section>

          <div className="border-l-2 border-[#3b3b3b] pl-3 text-[10px] text-gray-600 leading-relaxed">
            <p className="font-bold">{FLOW_DISCLAIMER}</p>
            <p className="mt-1">解析の対象外： {FLOW_EXCLUSIONS.join('／')}</p>
          </div>
        </div>
      </div>

      {/* 説明モード: 操作パネルを隠して図と凡例だけを大きく出す */}
      {explain &&
        createPortal(
          // サイトのヘッダーと左カラムより手前に出すため body 直下へ描く
          <div className="fixed inset-0 z-[100000] bg-[#faf9f6] flex flex-col" role="dialog" aria-modal="true" aria-label="説明モード">
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-[11px] text-gray-500">{plans.map((p) => p.name).join(' ／ ')}</span>
              <button type="button" onClick={() => setExplain(false)} className={linkBtn}><FiX />閉じる</button>
            </div>
            <div className={`flex-1 min-h-0 overflow-auto grid gap-2 px-2 ${compare ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
              {plans.map((p, i) => (
                <div key={i} className="min-w-0">
                  {compare && <p className="px-2 text-[12px] font-bold text-gray-800">{p.name}</p>}
                  {figure(i, Math.max(320, window.innerHeight - 150), false)}
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-gray-300 space-y-1">
              {legend}
              <p className="text-[10px] text-gray-500">{FLOW_DISCLAIMER}</p>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
