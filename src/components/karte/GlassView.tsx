'use client';

import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import Ladder from './Ladder';
import SaveBar from './SaveBar';
import ToolHead from './ToolHead';
import { KV, ResultPanel, ResultRow, SecHead, Sheet, Step } from '@/components/ui/Sheet';
import {
  COMP_LABEL,
  KIND_LABEL,
  KIND_ORDER,
  ROUGH_LABEL,
  THICK,
  estimateWind,
  fmtInt,
  glassCapacity,
  pickFirst,
  type GlassComp,
  type GlassKind,
  type WallPart,
} from '@/lib/karte/glass';
import type { StudyDraft } from '@/lib/karte/engine';
import type { Project } from '@/lib/karte/masters';

export type GlassPrefill = Partial<{ kind: GlassKind; comp: GlassComp; t2: string; w: string; h: string; z: string; part: WallPart }>;

type Props = {
  project: Project;
  prefill?: GlassPrefill;
  onBack: () => void;
  onGotoProject: () => void;
  onSave: (draft: StudyDraft, memo: string) => void;
};

/**
 * 必要ガラス厚（カルテ内）。風圧力は物件条件（V₀・粗度・H）から自動で引く。
 * 組版は計算書の 3 段組（左 = 条件と計算の過程 / 中 = 板厚のラダー / 右 = 答えと保存）。
 */
export default function GlassView({ project: p, prefill, onBack, onGotoProject, onSave }: Props) {
  const [kind, setKind] = useState<GlassKind>(prefill?.kind && KIND_LABEL[prefill.kind] ? prefill.kind : 'float');
  const [comp, setComp] = useState<GlassComp>(prefill?.comp && COMP_LABEL[prefill.comp] ? prefill.comp : 'single');
  const [tOther, setTOther] = useState(prefill?.t2 || '6');
  const [w, setW] = useState(prefill?.w || '1800');
  const [h, setH] = useState(prefill?.h || '2000');
  const [Z, setZ] = useState(prefill?.z || '25');
  const [part, setPart] = useState<WallPart>(prefill?.part === 'corner' ? 'corner' : 'general');
  const [memo, setMemo] = useState('');

  const A = ((+w || 0) * (+h || 0)) / 1e6;
  const t2 = +tOther || 0;
  const wind = estimateWind({ v0: p.v0, rough: p.rough, H: p.H, Z: +Z || 0, part });
  const rows = useMemo(() => THICK[kind].map((t) => ({ k: t, v: glassCapacity(kind, comp, t, t2, A) })), [kind, comp, t2, A]);
  const pick = pickFirst(rows.filter((r) => Number.isFinite(r.v)), wind.W);

  const draft: StudyDraft = {
    tool: 'glass',
    title: '必要ガラス厚',
    basis: '令82条の4／H12建告1458号',
    deps: { v0: p.v0, rough: p.rough, H: p.H },
    inputs: {
      ガラス: `${KIND_LABEL[kind]}・${COMP_LABEL[comp]}${comp === 'double' ? `（t₂ ${tOther}mm）` : ''}`,
      見付: `${w}×${h} mm（${A.toFixed(2)} m²）`,
      当該部分の高さ: `${Z} m`,
      位置: part === 'corner' ? '隅角部' : '一般部',
      設計風圧力: `${fmtInt(wind.W)} N/m²`,
    },
    result: pick ? `${pick.k} mm` : '適合なし',
    ok: !!pick,
    detail: pick ? `許容耐力 ${fmtInt(pick.v)} N/m²（検定比 ${(wind.W / pick.v).toFixed(2)}）` : '',
  };

  const mm = (id: string, value: string, set: (v: string) => void, unit: string, step: number, min = 1) => (
    <>
      <input type="number" id={id} value={value} min={min} step={step} onChange={(e) => set(e.target.value)} />
      <span className="yy-kt-unit">{unit}</span>
    </>
  );

  const left = (
    <>
      <section className="yy-sheet__block">
        <SecHead
          no="I"
          title="物件条件より"
          right={
            <button type="button" className="yy-kt-link" onClick={onGotoProject}>
              変更
            </button>
          }
        />
        <KV k="基準風速 V₀" v={`${p.v0} m/s`} fromCase />
        <KV k="地表面粗度区分" v={ROUGH_LABEL[p.rough] ?? p.rough} fromCase />
        <KV k="建築物の高さ H" v={`${p.H} m`} fromCase />
      </section>

      <section className="yy-sheet__block">
        <SecHead no="II" title="条件" />
        <KV
          k={<label htmlFor="g-kind">ガラスの種類</label>}
          v={
            <select id="g-kind" value={kind} onChange={(e) => setKind(e.target.value as GlassKind)}>
              {KIND_ORDER.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          }
        />
        <KV
          k={<label htmlFor="g-comp">構成</label>}
          v={
            <select id="g-comp" value={comp} onChange={(e) => setComp(e.target.value as GlassComp)}>
              {(Object.keys(COMP_LABEL) as GlassComp[]).map((c) => (
                <option key={c} value={c}>
                  {COMP_LABEL[c]}
                </option>
              ))}
            </select>
          }
        />
        {comp === 'double' && <KV k={<label htmlFor="g-other">もう一方の板厚 t₂</label>} v={mm('g-other', tOther, setTOther, 'mm', 0.1)} />}
        <KV k={<label htmlFor="g-w">見付幅</label>} v={mm('g-w', w, setW, 'mm', 10)} />
        <KV k={<label htmlFor="g-h">見付高さ</label>} v={mm('g-h', h, setH, 'mm', 10)} />
        <KV k={<label htmlFor="g-z">当該部分の高さ Z</label>} v={mm('g-z', Z, setZ, 'm', 1)} />
        <KV
          k={<label htmlFor="g-part">壁面の位置</label>}
          v={
            <select id="g-part" value={part} onChange={(e) => setPart(e.target.value as WallPart)}>
              <option value="general">一般部</option>
              <option value="corner">隅角部</option>
            </select>
          }
        />
        <p className="yy-kt-note">緑の点 = 物件条件から。変えるときはカルテの条件を直します。</p>
      </section>

      <section className="yy-sheet__block">
        <SecHead no="III" title="計算の過程" />
        <Step n="1" k="見付面積" f={`A = ${w} × ${h} mm`} v={`${A.toFixed(2)} m²`} />
        <Step n="2" k="平均速度圧" f={`q = 0.6 Er² V₀²(Er ${wind.Er.toFixed(3)})`} v={`${fmtInt(wind.q)} N/m²`} />
        <Step n="3" k="ピーク風力係数" f={`正圧 ${wind.cPos.toFixed(2)} · 負圧 ${wind.cNeg.toFixed(2)} の不利側`} v={wind.c.toFixed(2)} />
        <Step n="4" k="設計風圧力" f="W = q · C" v={`${fmtInt(wind.W)} N/m²`} strong />
        <Step n="5" k="許容耐力" f="P = 300 k₁ k₂ ÷ A × (t + t² ÷ 4)" v={pick ? `${fmtInt(pick.v)} N/m²` : '—'} />
        <Step n="6" k="判定" f="P ≧ W となる最小の板厚" v={pick ? `${pick.k} mm` : '適合なし'} strong />
      </section>
    </>
  );

  const center = (
    <section className="yy-sheet__block">
      <SecHead no="IV" title="板厚ごとの許容耐力" right={`候補 ${rows.length} 種 · 赤線 = 設計風圧力`} />
      <Ladder rows={rows} threshold={wind.W} thLabel={`W ${fmtInt(wind.W)}`} fmt={fmtInt} headLeft="板厚 mm" headRight="許容耐力 N/m²" />
      <p className="yy-kt-note">
        見付面積 {A.toFixed(2)} m²（{w}×{h} mm）。緑の棒が許容耐力、赤線を越えた最初の行が答え。単体ページ：
        <Link className="yy-kt-link" href="/calc/glass-thickness/">
          /calc/glass-thickness/
        </Link>
      </p>
    </section>
  );

  const right = (
    <>
      <div className={pick ? undefined : 'yy-kt-resng'} role="status" aria-live="polite">
        {pick ? (
          <ResultPanel label="result — 最小適合厚" value={pick.k} unit="mm" sub={`許容耐力 ${fmtInt(pick.v)} ≧ 設計風圧力 ${fmtInt(wind.W)} N/m²`}>
            <ResultRow k="検定比" v={(wind.W / pick.v).toFixed(2)} />
            <ResultRow k="ガラス" v={`${KIND_LABEL[kind]} · ${COMP_LABEL[comp]}`} />
            <ResultRow k="位置" v={part === 'corner' ? '隅角部' : '一般部'} />
          </ResultPanel>
        ) : (
          <ResultPanel label="result — 最小適合厚" value="なし" unit="適合する板厚なし" sub="見付面積の分割か、強化・倍強度への変更を検討してください。" />
        )}
      </div>
      <SaveBar
        id="g-memo"
        memo={memo}
        onMemo={setMemo}
        caseName={p.name}
        placeholder="なぜこの条件で検討したか。後から一番効くのはここです。"
        onSave={() => onSave(draft, memo)}
      />
    </>
  );

  return (
    <section>
      <ToolHead title="必要ガラス厚" desc="令82条の4 · 平成12年建設省告示第1458号" onBack={onBack} />
      <Sheet left={left} center={center} right={right} />
    </section>
  );
}
