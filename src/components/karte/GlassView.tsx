'use client';

import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import Ladder from './Ladder';
import SaveBar from './SaveBar';
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

/** 必要ガラス厚（カルテ内）。風圧力は物件条件（V₀・粗度・H）から自動で引く */
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

  return (
    <section>
      <p className="yk-backbar"><button type="button" className="yk-back" onClick={onBack}>← 一覧に戻る</button></p>
      <h1>必要ガラス厚</h1>
      <p className="yk-hint" style={{ marginBottom: 14 }}>令82条の4／平成12年建設省告示第1458号　（単体ページ: <Link href="/calc/glass-thickness/">/calc/glass-thickness/</Link>）</p>

      <div className="yk-from">
        <b>物件条件より</b>
        <span className="yk-v">V₀ {p.v0}m/s ／ 粗度{ROUGH_LABEL[p.rough]} ／ H {p.H}m</span>
        <button type="button" className="yk-btn yk-ghost yk-small" onClick={onGotoProject}>変更</button>
      </div>

      <div className="yk-panel">
        <div className="yk-grid">
          <div className="yk-f yk-wide">
            <label htmlFor="g-kind">ガラスの種類</label>
            <select id="g-kind" value={kind} onChange={(e) => setKind(e.target.value as GlassKind)}>
              {KIND_ORDER.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
          </div>
          <div className="yk-f">
            <label htmlFor="g-comp">構成</label>
            <select id="g-comp" value={comp} onChange={(e) => setComp(e.target.value as GlassComp)}>
              {(Object.keys(COMP_LABEL) as GlassComp[]).map((c) => <option key={c} value={c}>{COMP_LABEL[c]}</option>)}
            </select>
          </div>
          {comp === 'double' && (
            <div className="yk-f">
              <label htmlFor="g-other">もう一方の板厚 t₂</label>
              <div className="yk-pair"><input type="number" id="g-other" value={tOther} min={1} step={0.1} onChange={(e) => setTOther(e.target.value)} /><span>mm</span></div>
            </div>
          )}
          <div className="yk-f">
            <label htmlFor="g-w">見付幅</label>
            <div className="yk-pair"><input type="number" id="g-w" value={w} min={1} step={10} onChange={(e) => setW(e.target.value)} /><span>mm</span></div>
          </div>
          <div className="yk-f">
            <label htmlFor="g-h">見付高さ</label>
            <div className="yk-pair"><input type="number" id="g-h" value={h} min={1} step={10} onChange={(e) => setH(e.target.value)} /><span>mm</span></div>
          </div>
          <div className="yk-f">
            <label htmlFor="g-z">当該部分の高さ Z</label>
            <div className="yk-pair"><input type="number" id="g-z" value={Z} min={1} step={1} onChange={(e) => setZ(e.target.value)} /><span>m</span></div>
          </div>
          <div className="yk-f">
            <label htmlFor="g-part">壁面の位置</label>
            <select id="g-part" value={part} onChange={(e) => setPart(e.target.value as WallPart)}>
              <option value="general">一般部</option>
              <option value="corner">隅角部</option>
            </select>
          </div>
        </div>

        <div className={`yk-verdict ${pick ? 'yk-ok' : 'yk-ng'}`} role="status" aria-live="polite">
          {pick ? (
            <>
              <b>最小適合厚 {pick.k} mm</b>
              <span className="yk-detail">許容耐力 {fmtInt(pick.v)} ≧ 設計風圧力 {fmtInt(wind.W)} N/m²（検定比 {(wind.W / pick.v).toFixed(2)}）</span>
            </>
          ) : (
            <>
              <b>適合する板厚なし</b>
              <span className="yk-detail">見付面積の分割か、強化・倍強度への変更を検討してください。</span>
            </>
          )}
        </div>

        <Ladder rows={rows} threshold={wind.W} thLabel={`W ${fmtInt(wind.W)}`} fmt={fmtInt} headLeft="板厚 mm" headRight="許容耐力 N/m²" />

        <SaveBar
          id="g-memo"
          memo={memo}
          onMemo={setMemo}
          placeholder="なぜこの条件で検討したか。後から一番効くのはここです。"
          onSave={() => onSave(draft, memo)}
        />
      </div>
    </section>
  );
}
