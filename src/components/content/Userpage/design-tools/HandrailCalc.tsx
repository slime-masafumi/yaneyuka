'use client';
/**
 * 意匠設計 › 手すり強度。支柱(片持ち)と笠木(支柱間の単純梁)の曲げ・たわみを、BL・アルミ手摺工業会の荷重で見る。
 * 「判定」だけでなく、逆から(支柱ピッチ・高さ・荷重の上限、必要な断面)も求められる。計算は src/lib/handrail.ts。2026-11-28
 */
import React, { useMemo, useState } from 'react';
import { ResultRow } from '@/components/ui/Sheet';
import DtResult from './DtResult';
import {
  DEFL_LOAD,
  LOAD_PRESETS,
  MATERIALS,
  checkHandrail,
  maxHeight,
  maxLoad,
  maxPitch,
  pickSections,
  required,
  sectionProps,
  shapeLabel,
  type MaterialId,
  type SecProps,
  type Shape,
} from '@/lib/handrail';

const field = 'w-full text-[12px] px-2 py-1.5';
const label = 'block text-[11px] font-bold text-gray-700 mb-1';
const box = 'bg-gray-50 p-3 border border-[#3b3b3b] space-y-2';

type Mode = 'check' | 'pitch' | 'height' | 'load' | 'section';
const MODES: { id: Mode; label: string; desc: string }[] = [
  { id: 'check', label: '判定する', desc: '寸法・断面・荷重をすべて入れて、応力度とたわみを見る' },
  { id: 'pitch', label: '支柱ピッチの上限', desc: '断面と高さから、支柱を何 mm 間隔まで離せるか' },
  { id: 'height', label: '高さの上限', desc: '断面とピッチから、支柱をどこまで高くできるか' },
  { id: 'load', label: '耐えられる荷重', desc: '寸法と断面から、何 N/m の水平荷重まで耐えるか' },
  { id: 'section', label: '必要な断面', desc: 'ピッチ・高さ・荷重から、必要な断面性能と候補の部材' },
];

function Num({ k, v, set, step = '1', disabled }: { k: string; v: string; set: (s: string) => void; step?: string; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="block text-[10px] text-gray-500 mb-1">{k}</span>
      <input type="number" step={step} value={disabled ? '' : v} placeholder={disabled ? '求める' : undefined} disabled={disabled} onChange={(e) => set(e.target.value)} className={`${field}${disabled ? ' bg-gray-100 text-gray-400' : ''}`} />
    </label>
  );
}

type ShapeState = { kind: Shape['kind']; b: string; d: string; t: string; Z: string; I: string };
const toShape = (s: ShapeState): Shape =>
  s.kind === 'box'
    ? { kind: 'box', b: Number(s.b), d: Number(s.d), t: Number(s.t) }
    : s.kind === 'pipe'
      ? { kind: 'pipe', d: Number(s.d), t: Number(s.t) }
      : s.kind === 'flat'
        ? { kind: 'flat', b: Number(s.b), d: Number(s.d) }
        : { kind: 'custom', Z: Number(s.Z), I: Number(s.I) };

function ShapeEditor({ title, s, set }: { title: string; s: ShapeState; set: (s: ShapeState) => void }) {
  const p = sectionProps(toShape(s));
  const up = (patch: Partial<ShapeState>) => set({ ...s, ...patch });
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
        <label className="block">
          <span className="block text-[10px] text-gray-500 mb-1">{title}</span>
          <select value={s.kind} onChange={(e) => up({ kind: e.target.value as Shape['kind'] })} className={field}>
            <option value="box">角パイプ</option>
            <option value="pipe">丸パイプ</option>
            <option value="flat">フラットバー</option>
            <option value="custom">断面性能を入れる</option>
          </select>
        </label>
      </div>
      {s.kind === 'box' && (
        <div className="grid grid-cols-3 gap-2">
          <Num k="荷重の向き d(mm)" v={s.d} set={(x) => up({ d: x })} step="0.1" />
          <Num k="手すり方向 b(mm)" v={s.b} set={(x) => up({ b: x })} step="0.1" />
          <Num k="厚さ t(mm)" v={s.t} set={(x) => up({ t: x })} step="0.1" />
        </div>
      )}
      {s.kind === 'pipe' && (
        <div className="grid grid-cols-2 gap-2">
          <Num k="外径(mm)" v={s.d} set={(x) => up({ d: x })} step="0.1" />
          <Num k="厚さ t(mm)" v={s.t} set={(x) => up({ t: x })} step="0.1" />
        </div>
      )}
      {s.kind === 'flat' && (
        <div className="grid grid-cols-2 gap-2">
          <Num k="幅(荷重の向き)(mm)" v={s.d} set={(x) => up({ d: x })} />
          <Num k="厚さ(mm)" v={s.b} set={(x) => up({ b: x })} />
        </div>
      )}
      {s.kind === 'custom' && (
        <div className="grid grid-cols-2 gap-2">
          <Num k="断面係数 Z(mm³)" v={s.Z} set={(x) => up({ Z: x })} />
          <Num k="断面二次モーメント I(mm⁴)" v={s.I} set={(x) => up({ I: x })} />
        </div>
      )}
      {p ? (
        <p className="text-[10px] text-gray-500 font-mono">
          A {p.A ? p.A.toFixed(0) : '—'} mm² · I {(p.I / 1e4).toFixed(2)} cm⁴ · Z {(p.Z / 1e3).toFixed(2)} cm³
        </p>
      ) : (
        <p className="text-[10px] text-[#b4402f]">寸法を確かめてください(厚さ × 2 が外形より小さいこと)</p>
      )}
    </div>
  );
}

/** 立面の略図(3 スパン・寸法と荷重の向き) */
function Elevation({ L, H, w, unknown }: { L: string; H: string; w: string; unknown: Mode }) {
  const W = 360;
  const x0 = 30;
  const sp = 95;
  const top = 34;
  const base = 128;
  const tag = (k: Mode, s: string) => (unknown === k ? '?' : s);
  return (
    <svg viewBox={`0 0 ${W} 170`} className="w-full max-w-[420px]" role="img" aria-label="手すりの立面の略図">
      <line x1={10} y1={base} x2={W - 10} y2={base} stroke="#3b3b3b" strokeWidth={1} />
      {Array.from({ length: 24 }, (_, i) => (
        <line key={i} x1={14 + i * 14} y1={base} x2={6 + i * 14} y2={base + 8} stroke="#8a8a85" strokeWidth={0.6} />
      ))}
      <line x1={x0 - 12} y1={top} x2={x0 + sp * 3 + 12} y2={top} stroke="#2b2b2b" strokeWidth={3} />
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1={x0 + sp * i} y1={top} x2={x0 + sp * i} y2={base} stroke="#2b2b2b" strokeWidth={2} />
      ))}
      {/* 荷重(笠木に水平に。立面では手前から奥へなので記号で) */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <g key={i}>
          <circle cx={x0 + 20 + i * 40} cy={top - 14} r={4} fill="none" stroke="#2f6f5e" strokeWidth={1} />
          <line x1={x0 + 17 + i * 40} y1={top - 17} x2={x0 + 23 + i * 40} y2={top - 11} stroke="#2f6f5e" strokeWidth={1} />
          <line x1={x0 + 23 + i * 40} y1={top - 17} x2={x0 + 17 + i * 40} y2={top - 11} stroke="#2f6f5e" strokeWidth={1} />
        </g>
      ))}
      <text x={x0 + sp * 3 + 18} y={top - 10} fontSize={10} fill="#2f6f5e" fontFamily="monospace">
        w {tag('load', w)} N/m
      </text>
      {/* ピッチ */}
      <line x1={x0 + sp} y1={base + 22} x2={x0 + sp * 2} y2={base + 22} stroke="#3b3b3b" strokeWidth={0.8} />
      <line x1={x0 + sp} y1={base + 16} x2={x0 + sp} y2={base + 28} stroke="#3b3b3b" strokeWidth={0.8} />
      <line x1={x0 + sp * 2} y1={base + 16} x2={x0 + sp * 2} y2={base + 28} stroke="#3b3b3b" strokeWidth={0.8} />
      <text x={x0 + sp * 1.5} y={base + 38} fontSize={10} textAnchor="middle" fill="#3b3b3b" fontFamily="monospace">
        L {tag('pitch', L)}
      </text>
      {/* 高さ */}
      <line x1={x0 + sp * 3 + 26} y1={top} x2={x0 + sp * 3 + 26} y2={base} stroke="#3b3b3b" strokeWidth={0.8} />
      <line x1={x0 + sp * 3 + 20} y1={top} x2={x0 + sp * 3 + 32} y2={top} stroke="#3b3b3b" strokeWidth={0.8} />
      <line x1={x0 + sp * 3 + 20} y1={base} x2={x0 + sp * 3 + 32} y2={base} stroke="#3b3b3b" strokeWidth={0.8} />
      <text x={x0 + sp * 3 + 30} y={(top + base) / 2 + 4} fontSize={10} fill="#3b3b3b" fontFamily="monospace">
        h {tag('height', H)}
      </text>
      <text x={x0 - 6} y={top - 6} fontSize={9} fill="#8a8a85">
        笠木
      </text>
      <text x={x0 + 4} y={base - 6} fontSize={9} fill="#8a8a85">
        支柱
      </text>
    </svg>
  );
}

const fmt = (x: number, d = 0) => (Number.isFinite(x) ? x.toLocaleString('ja-JP', { maximumFractionDigits: d, minimumFractionDigits: d }) : '—');

export default function HandrailCalc() {
  const [mode, setMode] = useState<Mode>('check');
  const [preset, setPreset] = useState('bl300');
  const [w, setW] = useState('2950');
  const [wv, setWv] = useState('1600');
  const [vertOn, setVertOn] = useState(true);
  const [ws, setWs] = useState(String(DEFL_LOAD));
  const [L, setL] = useState('1000');
  const [H, setH] = useState('1100');
  const [mat, setMat] = useState<MaterialId>('steel');
  const [F, setF] = useState('235');
  const [E, setE] = useState('205000');
  const [term, setTerm] = useState<'short' | 'long'>('short');
  const [post, setPost] = useState<ShapeState>({ kind: 'flat', b: '16', d: '75', t: '', Z: '', I: '' });
  const [railOn, setRailOn] = useState(true);
  const [rail, setRail] = useState<ShapeState>({ kind: 'pipe', b: '', d: '48.6', t: '2.3', Z: '', I: '' });
  const [aj, setAj] = useState('');
  const [an, setAn] = useState('2');

  const m = MATERIALS.find((x) => x.id === mat) ?? MATERIALS[0];
  const lp = LOAD_PRESETS.find((x) => x.id === preset) ?? LOAD_PRESETS[0];
  const postP = useMemo(() => sectionProps(toShape(post)), [post]);
  const railP = useMemo(() => (railOn ? sectionProps(toShape(rail)) : null), [railOn, rail]);

  const base = {
    L: Number(L),
    H: Number(H),
    w: Number(w),
    ws: Number(ws),
    wv: railOn && vertOn && Number(wv) > 0 ? Number(wv) : null,
    F: Number(F),
    E: Number(E),
    term,
    anchorJ: Number(aj) || undefined,
    anchorN: Number(an) || undefined,
  };
  const inputsOk =
    base.F > 0 &&
    base.E > 0 &&
    base.ws > 0 &&
    (mode === 'pitch' || base.L > 0) &&
    (mode === 'height' || base.H > 0) &&
    (mode === 'load' || base.w > 0) &&
    (mode === 'section' || (postP !== null && (!railOn || railP !== null)));

  const res = useMemo(() => {
    if (!inputsOk) return null;
    const post = postP as SecProps;
    const rail = railP;
    if (mode === 'check') return { kind: 'check' as const, r: checkHandrail({ ...base, post, rail }) };
    if (mode === 'pitch') {
      const l = maxPitch({ ...base, post, rail });
      return { kind: 'pitch' as const, l, r: Number.isFinite(l.value) ? checkHandrail({ ...base, L: Math.floor(l.value), post, rail }) : null };
    }
    if (mode === 'height') {
      const l = maxHeight({ ...base, post, rail });
      return { kind: 'height' as const, l, r: Number.isFinite(l.value) ? checkHandrail({ ...base, H: Math.floor(l.value), post, rail }) : null };
    }
    if (mode === 'load') {
      const l = maxLoad({ ...base, post, rail });
      return { kind: 'load' as const, l, r: Number.isFinite(l.value) ? checkHandrail({ ...base, w: Math.floor(l.value), post, rail }) : null };
    }
    const q = required(base);
    const postPicks = pickSections({ Z: q.postZ, I: q.postI }, m.density);
    const railPicks = railOn ? pickSections({ Z: q.railZ, I: q.railI, Zv: q.railZv, Iv: q.railIv }, m.density) : [];
    return { kind: 'section' as const, q, postPicks, railPicks };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputsOk, mode, postP, railP, L, H, w, ws, wv, vertOn, railOn, F, E, term, aj, an, m.density]);

  const checkR = res && res.kind !== 'section' ? res.r : null;
  const ng = res?.kind === 'check' ? res.r.worst.ratio > 1 : false;

  const head: { label: string; value: string; unit: string; sub: string; text?: boolean } = (() => {
    if (!res) return { label: '入力を確かめてください', value: '—', unit: '', sub: '' };
    if (res.kind === 'check') {
      const wr = res.r.worst;
      return { label: `いちばん厳しい検討: ${wr.label}`, value: wr.ratio > 1 ? '超える' : '収まる', unit: '', sub: `検定比 ${wr.ratio.toFixed(2)}(${fmt(wr.value, 2)} / ${fmt(wr.limit, 2)} ${wr.unit})`, text: true };
    }
    if (res.kind === 'pitch') return { label: '支柱ピッチの上限', value: fmt(Math.floor(res.l.value)), unit: 'mm 以下', sub: `決めているのは ${res.l.by}` };
    if (res.kind === 'height') return { label: '支柱の高さ h の上限', value: fmt(Math.floor(res.l.value)), unit: 'mm 以下', sub: `決めているのは ${res.l.by}${res.l.railOk ? '' : '。笠木はこのピッチで超えている(高さを下げても変わらない)'}` };
    if (res.kind === 'load') return { label: '耐えられる水平荷重(強さ)', value: fmt(Math.floor(res.l.value)), unit: 'N/m', sub: `決めているのは ${res.l.by}。たわみは ${ws} N/m で別に見る` };
    const p0 = res.postPicks[0];
    return { label: '支柱に必要な断面係数', value: fmt(res.q.postZ / 1000, 2), unit: 'cm³ 以上', sub: p0 ? `いちばん軽い候補 ${shapeLabel(p0.shape)}(${p0.kgm.toFixed(2)} kg/m)` : '候補の中に足りる断面がない(支柱ピッチを詰める・高さを下げる)' };
  })();

  return (
    <div className="p-4 text-[12px] text-gray-700">
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
        <div className="space-y-3">
          <div className={box}>
            <span className={label}>求めるもの</span>
            <div className="grid grid-cols-2 gap-1">
              {MODES.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => setMode(x.id)}
                  className={`text-left text-[11px] px-2 py-1.5 border ${mode === x.id ? 'border-[#2f6f5e] text-[#2f6f5e] font-bold bg-white' : 'border-gray-300 text-gray-600 bg-white'}`}
                  aria-pressed={mode === x.id}
                >
                  {x.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-500">{MODES.find((x) => x.id === mode)?.desc}</p>
          </div>

          <div className={box}>
            <span className={label}>荷重(笠木の高さに水平に)</span>
            <select
              value={preset}
              onChange={(e) => {
                const p = LOAD_PRESETS.find((x) => x.id === e.target.value);
                setPreset(e.target.value);
                if (p && p.id !== 'custom') {
                  setW(String(p.w));
                  if (p.wv) setWv(String(p.wv));
                }
              }}
              className={field}
            >
              {LOAD_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                  {p.id !== 'custom' ? ` ${p.w.toLocaleString()} N/m` : ''}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Num k="水平荷重 w(N/m)" v={w} set={(x) => { setW(x); setPreset('custom'); }} disabled={mode === 'load'} />
              <Num k="たわみを見る荷重(N/m)" v={ws} set={setWs} />
            </div>
            <p className="text-[10px] text-gray-400">出典: {lp.basis}。たわみは BLS SR:2026 表−7(295 N/m 時 支柱 h/50・笠木 L/50、鉛直 L/100)。</p>
          </div>

          <div className={box}>
            <span className={label}>寸法</span>
            <div className="grid grid-cols-2 gap-2">
              <Num k="支柱ピッチ L(mm)" v={L} set={setL} step="10" disabled={mode === 'pitch'} />
              <Num k="高さ h(mm)" v={H} set={setH} step="10" disabled={mode === 'height'} />
            </div>
            <p className="text-[10px] text-gray-400">h = 支柱の取付部(床の立上りの上端・ベースプレート)から笠木の上端まで。床からの手すりの高さ 1,100mm とは違うことがある。</p>
          </div>

          <div className={box}>
            <span className={label}>材料</span>
            <select
              value={mat}
              onChange={(e) => {
                const nm = MATERIALS.find((x) => x.id === e.target.value);
                setMat(e.target.value as MaterialId);
                if (nm && nm.id !== 'custom') {
                  setF(String(nm.F));
                  setE(String(nm.E));
                }
              }}
              className={field}
            >
              {MATERIALS.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <Num k="F(N/mm²)" v={F} set={(x) => { setF(x); setMat('custom'); }} />
              <Num k="E(N/mm²)" v={E} set={(x) => { setE(x); setMat('custom'); }} step="1000" />
              <label className="block">
                <span className="block text-[10px] text-gray-500 mb-1">許容応力度</span>
                <select value={term} onChange={(e) => setTerm(e.target.value as 'short' | 'long')} className={field}>
                  <option value="short">短期(F)</option>
                  <option value="long">長期(F/1.5)</option>
                </select>
              </label>
            </div>
            <p className="text-[10px] text-gray-400">
              F: {m.basisF} / E: {m.basisE}
              {m.unconfirmed && <span className="text-[#b4402f]"> · アルミの F は当サイトで告示の表と照合できていない値です。告示 1024 号の表(押出材の厚さ・質別)で確かめて入れ直してください。溶接した部分は溶接部の F になり大きく下がります</span>}
            </p>
          </div>

          <div className={box}>
            <span className={label}>断面</span>
            {mode !== 'section' ? (
              <>
                <ShapeEditor title="支柱" s={post} set={setPost} />
                <label className="flex items-center gap-1 text-[11px] pt-1">
                  <input type="checkbox" checked={railOn} onChange={(e) => setRailOn(e.target.checked)} /> 笠木も見る
                </label>
                {railOn && <ShapeEditor title="笠木" s={rail} set={setRail} />}
              </>
            ) : (
              <>
                <p className="text-[10px] text-gray-500">候補の寸法(角パイプ・丸パイプ・フラットバーの代表寸法)から、足りるものを軽い順に出します。</p>
                <label className="flex items-center gap-1 text-[11px]">
                  <input type="checkbox" checked={railOn} onChange={(e) => setRailOn(e.target.checked)} /> 笠木も選ぶ
                </label>
              </>
            )}
            {railOn && (
              <label className="flex items-center gap-1 text-[11px]">
                <input type="checkbox" checked={vertOn} onChange={(e) => setVertOn(e.target.checked)} /> 笠木の鉛直荷重も見る
                {vertOn && <input type="number" value={wv} onChange={(e) => setWv(e.target.value)} className="w-20 text-[12px] px-1 py-0.5 ml-1" aria-label="鉛直荷重 N/m" />}
                {vertOn && <span className="text-[10px] text-gray-500">N/m</span>}
              </label>
            )}
          </div>

          <details className={box}>
            <summary className="text-[11px] font-bold text-gray-700 cursor-pointer">支柱の根元(アンカー)</summary>
            <div className="grid grid-cols-2 gap-2">
              <Num k="引張側と圧縮側のボルトの距離 j(mm)" v={aj} set={setAj} />
              <Num k="引張側のボルトの本数" v={an} set={setAn} />
            </div>
            <p className="text-[10px] text-gray-400">ボルト 1 本の引張力 T = M / j / 本数(圧縮側はベースプレートの端で受けるなら j をボルトからプレートの端まで)。あと施工アンカーの許容耐力はメーカーの値・コンクリートの強度・へりあきで決まるので、ここでは比べない。</p>
          </details>
        </div>

        <div className="space-y-3">
          <Elevation L={L} H={H} w={w} unknown={mode} />
          <div className="max-w-[460px]">
            <DtResult label={head.label} value={head.value} unit={head.unit} sub={head.sub} ng={ng} text={head.text}>
              {checkR && (
                <>
                  <ResultRow k="支柱 1 本の荷重 P = w × L" v={`${fmt(checkR.P)} N`} />
                  <ResultRow k="支柱の根元の曲げ M = P × h" v={`${fmt(checkR.M / 1e6, 3)} kN·m`} />
                  <ResultRow k="許容曲げ応力度 fb" v={`${fmt(checkR.fb, 1)} N/mm²(${term === 'short' ? '短期 = F' : '長期 = F/1.5'})`} />
                  {checkR.anchorT !== null && <ResultRow k="アンカー 1 本の引張力 T" v={`${fmt(checkR.anchorT / 1000, 2)} kN`} />}
                </>
              )}
              {res && res.kind !== 'check' && res.kind !== 'section' && (
                <>
                  {res.l.all.map((x) => (
                    <ResultRow key={x.by} k={x.by} v={`${fmt(Math.floor(x.value))}${res.kind === 'load' ? ' N/m' : ' mm'}${x.by === res.l.by ? '  ← 決まる' : ''}`} />
                  ))}
                </>
              )}
              {res && res.kind === 'section' && (
                <>
                  <ResultRow k="支柱 Z(強さ)" v={`${fmt(res.q.postZ / 1000, 2)} cm³ 以上 = wLh / fb`} />
                  <ResultRow k={`支柱 I(たわみ h/50・${ws} N/m)`} v={`${fmt(res.q.postI / 1e4, 2)} cm⁴ 以上`} />
                  {railOn && <ResultRow k="笠木 Z(水平)" v={`${fmt(res.q.railZ / 1000, 2)} cm³ 以上 = wL²/8 / fb`} />}
                  {railOn && <ResultRow k="笠木 I(水平 L/50)" v={`${fmt(res.q.railI / 1e4, 2)} cm⁴ 以上`} />}
                  {railOn && res.q.railZv > 0 && <ResultRow k="笠木 Zv・Iv(鉛直)" v={`${fmt(res.q.railZv / 1000, 2)} cm³・${fmt(res.q.railIv / 1e4, 2)} cm⁴ 以上`} />}
                </>
              )}
            </DtResult>
          </div>

          {checkR && (
            <section>
              <h3 className="yy-sec yy-kt-h2" style={{ marginTop: 4 }}>
                <span className="yy-sec__no">—</span>
                <span className="yy-sec__title">検討の内訳{res && res.kind !== 'check' ? '(上限の値で計算し直したもの)' : ''}</span>
              </h3>
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="text-[10px] text-gray-500 border-b border-[#3b3b3b]">
                    <th className="text-left py-1 font-normal">項目</th>
                    <th className="text-right py-1 font-normal">値</th>
                    <th className="text-right py-1 font-normal">許容</th>
                    <th className="text-right py-1 font-normal w-[110px]">検定比</th>
                  </tr>
                </thead>
                <tbody>
                  {checkR.checks.map((c) => (
                    <tr key={c.key} className="border-b border-gray-200 align-top">
                      <td className="py-1.5 pr-2">
                        {c.label}
                        <span className="block text-[10px] text-gray-400 font-mono">{c.formula}</span>
                      </td>
                      <td className="py-1.5 text-right font-mono whitespace-nowrap">
                        {fmt(c.value, 2)} {c.unit}
                      </td>
                      <td className="py-1.5 text-right font-mono whitespace-nowrap">{fmt(c.limit, 2)}</td>
                      <td className="py-1.5 text-right">
                        <span className={`font-mono ${c.ratio > 1 ? 'text-[#b4402f] font-bold' : ''}`}>{c.ratio.toFixed(2)}</span>
                        <span className="block h-px mt-1 bg-gray-200 relative">
                          <span className="absolute left-0 top-0 h-px" style={{ width: `${Math.min(c.ratio, 1) * 100}%`, background: c.ratio > 1 ? '#b4402f' : '#2f6f5e' }} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {res && res.kind === 'section' && (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { t: '支柱の候補', picks: res.postPicks },
                ...(railOn ? [{ t: '笠木の候補', picks: res.railPicks }] : []),
              ].map((g) => (
                <div key={g.t}>
                  <h3 className="yy-sec yy-kt-h2" style={{ marginTop: 4 }}>
                    <span className="yy-sec__no">—</span>
                    <span className="yy-sec__title">{g.t}</span>
                    <span className="yy-sec__right">軽い順</span>
                  </h3>
                  {g.picks.length === 0 ? (
                    <p className="text-[11px] text-gray-500">候補の中に足りる断面がありません。ピッチを詰めるか、高さを下げてください。</p>
                  ) : (
                    <table className="w-full text-[11px] border-collapse">
                      <tbody>
                        {(['box', 'pipe', 'flat'] as const).flatMap((k) => g.picks.filter((p) => p.shape.kind === k).slice(0, 3)).sort((a, b) => a.kgm - b.kgm).map((p) => (
                          <tr key={shapeLabel(p.shape)} className="border-b border-gray-200">
                            <td className="py-1 font-mono">{shapeLabel(p.shape)}</td>
                            <td className="py-1 text-right font-mono">{p.kgm.toFixed(2)} kg/m</td>
                            <td className="py-1 text-right font-mono text-gray-500">比 {p.ratio.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
              <p className="text-[10px] text-gray-400 md:col-span-2">形ごとに軽いもの 3 つずつ。□-d×b×t・FB-厚さ×幅で、d と幅は荷重の向き(手すりに直角)の寸法。比は必要な値 ÷ その断面の値の最大(1 以下で足りる)。鋼材の寸法は JIS G 3466・G 3444・G 3194 の代表。アルミ・ステンレスは同じ寸法の既製品があるかをメーカーで確認してください。</p>
            </section>
          )}

          <div className="text-[10px] text-gray-500 space-y-1 border-t border-[#3b3b3b] pt-2">
            <p>
              <b>考え方</b> 支柱は根元を固定した片持ち梁(1 本が受け持つ幅 = 支柱ピッチ。端の支柱は笠木の持ち出しで変わる)。笠木は支柱の間の単純梁に、BL の試験と同じ 4 等分点 2 線荷重(M = wL²/8、δ = 11wL⁴/768EI)。実際は笠木が連続しているので安全側です。
            </p>
            <p>
              <b>荷重の出典</b> 優良住宅部品認定基準「墜落防止手すり」BLS SR:2026(2026-04-15、ベターリビング)表−6・表−7。共用廊下は 300 型。日本アルミ手摺工業会「共同住宅用アルミ製墜落防止手すり強度のガイドライン」(2008)の基本強度 100 型・125 型。建築基準法には手すりの強度の数値基準はありません。設計図書・特記仕様に指定があればその値を入れてください。
            </p>
            <p>
              <b>見ていないもの</b> 局部座屈、フラットバーの支柱の横座屈、溶接部・ボルト孔による低下、ベースプレート・アンカーの耐力、手すり子・パネル(BL は手すり子 490N の局部荷重)、風荷重(パネル・ガラス手すりは風圧力が効くことがある)。この結果は検討の目安で、製品の性能を保証するものではありません。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
