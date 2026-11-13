'use client';

import React, { useState } from 'react';
import Ladder from './Ladder';
import SaveBar from './SaveBar';
import ToolHead from './ToolHead';
import { KV, ResultPanel, ResultRow, SecHead, Sheet, Step } from '@/components/ui/Sheet';
import { fmtInt, pickFirst, pipeRows } from '@/lib/karte/glass';
import type { StudyDraft } from '@/lib/karte/engine';
import type { Project } from '@/lib/karte/masters';

type Props = {
  project: Project;
  onBack: () => void;
  onGotoProject: () => void;
  onSave: (draft: StudyDraft, memo: string) => void;
};

/**
 * 縦樋のサイズ（SHASE-S206 の許容最大屋根面積表を降雨強度で換算）。
 * 組版は計算書の 3 段組（左 = 条件と計算の過程 / 中 = 呼び径のラダー / 右 = 答えと保存）。
 */
export default function PipeView({ project: p, onBack, onGotoProject, onSave }: Props) {
  const [roof, setRoof] = useState('420');
  const [wall, setWall] = useState('0');
  const [n, setN] = useState('4');
  const [memo, setMemo] = useState('');

  const roofA = +roof || 0;
  const wallA = +wall || 0;
  const count = Math.max(1, Math.floor(+n) || 1);
  const eff = roofA + wallA / 2;
  const per = eff / count;
  const rows = pipeRows(p.rain);
  const pick = pickFirst(rows, per);

  const draft: StudyDraft = {
    tool: 'pipe',
    title: '縦樋のサイズ',
    basis: 'SHASE-S206',
    deps: { rain: p.rain },
    inputs: {
      屋根水平投影: `${roofA} m²`,
      外壁立面: `${wallA} m²`,
      有効屋根面積: `${fmtInt(eff)} m²`,
      本数: `${count} 本`,
      '1本あたり負担': `${fmtInt(per)} m²`,
    },
    result: pick ? `呼び径 ${pick.k} mm` : '適合なし',
    ok: !!pick,
    detail: pick ? `許容屋根面積 ${fmtInt(pick.v)} m²` : '',
  };

  const num = (id: string, value: string, set: (v: string) => void, unit: string, step: number, min: number) => (
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
        <KV k="設計用降雨強度" v={`${p.rain} mm/h`} fromCase />
      </section>

      <section className="yy-sheet__block">
        <SecHead no="II" title="条件" />
        <KV k={<label htmlFor="r-roof">屋根の水平投影面積</label>} v={num('r-roof', roof, setRoof, 'm²', 10, 1)} />
        <KV k={<label htmlFor="r-wall">外壁の立面面積</label>} v={num('r-wall', wall, setWall, 'm²', 10, 0)} />
        <KV k={<label htmlFor="r-n">縦樋の本数</label>} v={num('r-n', n, setN, '本', 1, 1)} />
        <p className="yy-kt-note">外壁の立面面積は1/2を屋根面積に加算します（吹き降りの見込み）。</p>
      </section>

      <section className="yy-sheet__block">
        <SecHead no="III" title="計算の過程" />
        <Step n="1" k="有効屋根面積" f={`${fmtInt(roofA)} + ${fmtInt(wallA)} ÷ 2`} v={`${fmtInt(eff)} m²`} />
        <Step n="2" k="1本あたり負担" f={`${fmtInt(eff)} ÷ ${count} 本`} v={`${fmtInt(per)} m²`} strong />
        <Step n="3" k="許容屋根面積の換算" f={`表の値(100 mm/h)× 100 ÷ ${p.rain}`} v={`${rows.length} 径`} />
        <Step n="4" k="判定" f="負担 ≦ 許容 となる最小の呼び径" v={pick ? `${pick.k} mm` : '適合なし'} strong />
      </section>
    </>
  );

  const center = (
    <section className="yy-sheet__block">
      <SecHead no="IV" title="呼び径ごとの許容屋根面積" right={`降雨強度 ${p.rain} mm/h で換算 · 赤線 = 1 本あたり負担`} />
      <Ladder rows={rows} threshold={per} thLabel={`負担 ${fmtInt(per)} m²`} fmt={fmtInt} headLeft="呼び径" headRight="許容屋根面積 m²" />
      <p className="yy-kt-note">SHASE-S206／雨水排水立て管の許容最大屋根面積（表の値は目安。原典で確認してください）</p>
    </section>
  );

  const right = (
    <>
      <div className={pick ? undefined : 'yy-kt-resng'} role="status" aria-live="polite">
        {pick ? (
          <ResultPanel label="result — 縦樋の呼び径" value={pick.k} unit="mm" sub={`1本あたり負担 ${fmtInt(per)} m² ≦ 許容 ${fmtInt(pick.v)} m²`}>
            <ResultRow k="有効屋根面積" v={`${fmtInt(eff)} m²`} />
            <ResultRow k="本数" v={`${count} 本`} />
          </ResultPanel>
        ) : (
          <ResultPanel label="result — 縦樋の呼び径" value="なし" unit="1本では納まりません" sub="本数を増やすか、系統を分けてください。" />
        )}
      </div>
      <SaveBar id="r-memo" memo={memo} onMemo={setMemo} caseName={p.name} placeholder="本数の決め方、意匠上の制約など。" onSave={() => onSave(draft, memo)} />
    </>
  );

  return (
    <section>
      <ToolHead title="縦樋のサイズ" desc="SHASE-S206 · 雨水排水立て管の許容最大屋根面積" onBack={onBack} />
      <Sheet left={left} center={center} right={right} />
    </section>
  );
}
