'use client';

import React, { useState } from 'react';
import Ladder from './Ladder';
import SaveBar from './SaveBar';
import { fmtInt, pickFirst, pipeRows } from '@/lib/karte/glass';
import type { StudyDraft } from '@/lib/karte/engine';
import type { Project } from '@/lib/karte/masters';

type Props = {
  project: Project;
  onBack: () => void;
  onGotoProject: () => void;
  onSave: (draft: StudyDraft, memo: string) => void;
};

/** 縦樋のサイズ（SHASE-S206 の許容最大屋根面積表を降雨強度で換算） */
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

  return (
    <section>
      <p className="yk-backbar"><button type="button" className="yk-back" onClick={onBack}>← 一覧に戻る</button></p>
      <h1>縦樋のサイズ</h1>
      <p className="yk-hint" style={{ marginBottom: 14 }}>SHASE-S206／雨水排水立て管の許容最大屋根面積（表の値は目安。原典で確認してください）</p>

      <div className="yk-from">
        <b>物件条件より</b>
        <span className="yk-v">降雨強度 {p.rain} mm/h</span>
        <button type="button" className="yk-btn yk-ghost yk-small" onClick={onGotoProject}>変更</button>
      </div>

      <div className="yk-panel">
        <div className="yk-grid">
          <div className="yk-f">
            <label htmlFor="r-roof">屋根の水平投影面積</label>
            <div className="yk-pair"><input type="number" id="r-roof" value={roof} min={1} step={10} onChange={(e) => setRoof(e.target.value)} /><span>m²</span></div>
          </div>
          <div className="yk-f">
            <label htmlFor="r-wall">外壁の立面面積</label>
            <div className="yk-pair"><input type="number" id="r-wall" value={wall} min={0} step={10} onChange={(e) => setWall(e.target.value)} /><span>m²</span></div>
          </div>
          <div className="yk-f">
            <label htmlFor="r-n">縦樋の本数</label>
            <div className="yk-pair"><input type="number" id="r-n" value={n} min={1} step={1} onChange={(e) => setN(e.target.value)} /><span>本</span></div>
          </div>
          <div className="yk-f yk-wide"><p className="yk-hint">外壁の立面面積は1/2を屋根面積に加算します（吹き降りの見込み）。</p></div>
        </div>

        <div className={`yk-verdict ${pick ? 'yk-ok' : 'yk-ng'}`} role="status" aria-live="polite">
          {pick ? (
            <>
              <b>呼び径 {pick.k} mm</b>
              <span className="yk-detail">1本あたり負担 {fmtInt(per)} m² ≦ 許容 {fmtInt(pick.v)} m²（有効屋根面積 {fmtInt(eff)} m²）</span>
            </>
          ) : (
            <>
              <b>1本では納まりません</b>
              <span className="yk-detail">本数を増やすか、系統を分けてください。</span>
            </>
          )}
        </div>

        <Ladder rows={rows} threshold={per} thLabel={`負担 ${fmtInt(per)} m²`} fmt={fmtInt} headLeft="呼び径" headRight="許容屋根面積 m²" />

        <SaveBar id="r-memo" memo={memo} onMemo={setMemo} placeholder="本数の決め方、意匠上の制約など。" onSave={() => onSave(draft, memo)} />
      </div>
    </section>
  );
}
