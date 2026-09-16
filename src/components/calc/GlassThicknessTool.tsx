'use client';

import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import Ladder from '@/components/karte/Ladder';
import {
  COMP_LABEL,
  KIND_LABEL,
  KIND_ORDER,
  ROUGH_DESC,
  THICK,
  estimateWind,
  fmtInt,
  glassCapacity,
  pickFirst,
  type GlassComp,
  type GlassKind,
  type Roughness,
  type WallPart,
} from '@/lib/karte/glass';

type Props = {
  /** 根拠条文・計算式・係数表など、ラダーと早見表の間に入れる静的セクション（サーバー側で描画） */
  middle?: React.ReactNode;
};

const AREAS = [1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0];

/**
 * 必要ガラス厚の単体ツール。
 * ログイン不要・物件登録不要・単体で完結。カルテへの導線は置くが必須にしない。
 */
export default function GlassThicknessTool({ middle }: Props) {
  const [kind, setKind] = useState<GlassKind>('float');
  const [comp, setComp] = useState<GlassComp>('single');
  const [tOther, setTOther] = useState('6');
  const [w, setW] = useState('1800');
  const [h, setH] = useState('2000');
  const [wind, setWind] = useState('1800');
  // 簡易算定
  const [v0, setV0] = useState('34');
  const [rough, setRough] = useState<Roughness>('3');
  const [bh, setBh] = useState('30');
  const [z, setZ] = useState('25');
  const [part, setPart] = useState<WallPart>('general');
  const [windOut, setWindOut] = useState('');

  const A = ((+w || 0) * (+h || 0)) / 1e6;
  const Wd = +wind || 0;
  const t2 = +tOther || 0;

  const rows = useMemo(
    () => THICK[kind].map((t) => ({ k: t, v: glassCapacity(kind, comp, t, t2, A) })),
    [kind, comp, t2, A],
  );
  const pick = pickFirst(rows.filter((r) => Number.isFinite(r.v)), Wd);
  const best = rows[rows.length - 1];

  const matrix = useMemo(
    () =>
      THICK[kind].map((t) => ({
        t,
        cells: AREAS.map((a) => glassCapacity(kind, comp, t, t2, a)),
      })),
    [kind, comp, t2],
  );

  const syncWind = (next: { v0?: string; rough?: Roughness; bh?: string; z?: string; part?: WallPart }) => {
    const nv0 = next.v0 ?? v0;
    const nrough = next.rough ?? rough;
    const nbh = next.bh ?? bh;
    const nz = next.z ?? z;
    const npart = next.part ?? part;
    if (next.v0 !== undefined) setV0(next.v0);
    if (next.rough !== undefined) setRough(next.rough);
    if (next.bh !== undefined) setBh(next.bh);
    if (next.z !== undefined) setZ(next.z);
    if (next.part !== undefined) setPart(next.part);
    const r = estimateWind({ v0: +nv0, rough: nrough, H: +nbh, Z: +nz, part: npart });
    setWind(String(Math.round(r.W)));
    setWindOut(
      `平均速度圧 q = ${fmtInt(r.q)} N/m²（Er ${r.Er.toFixed(3)}）、kz ${r.kz.toFixed(3)}、` +
        `ピーク風力係数 正圧 ${r.cPos.toFixed(2)} ／ 負圧 ${r.cNeg.toFixed(2)} → 不利側 ${r.c.toFixed(2)}。` +
        `W = ${fmtInt(r.W)} N/m²。閉鎖型建築物の壁面を前提とした参考値です。`,
    );
  };

  const compHint =
    comp === 'double'
      ? '複層ガラスは2枚それぞれを検討し、不利な側で判定します。'
      : comp === 'laminated'
        ? '合わせガラスは中間膜を除いた板厚の合計で検討します。'
        : '四辺を剛性の高い枠で支持した単板を前提としています。';

  const karteHref =
    '/karte/?' +
    new URLSearchParams({
      open: 'glass',
      kind,
      comp,
      t2: tOther,
      w,
      h,
      z,
      part,
    }).toString();

  return (
    <>
      <section className="yk-panel" aria-label="計算">
        <div className="yk-grid">
          <div className="yk-f yk-wide">
            <label htmlFor="gt-kind">ガラスの種類</label>
            <select id="gt-kind" value={kind} onChange={(e) => setKind(e.target.value as GlassKind)}>
              {KIND_ORDER.map((k) => (
                <option key={k} value={k}>{KIND_LABEL[k]}</option>
              ))}
            </select>
          </div>
          <div className="yk-f yk-wide">
            <label htmlFor="gt-comp">構成</label>
            <select id="gt-comp" value={comp} onChange={(e) => setComp(e.target.value as GlassComp)}>
              {(Object.keys(COMP_LABEL) as GlassComp[]).map((c) => (
                <option key={c} value={c}>{COMP_LABEL[c]}ガラス</option>
              ))}
            </select>
            <p className="yk-hint">{compHint}</p>
          </div>
          {comp === 'double' && (
            <div className="yk-f">
              <label htmlFor="gt-t2">もう一方の板厚 t₂</label>
              <div className="yk-pair">
                <input type="number" id="gt-t2" value={tOther} min={1} step={0.1} onChange={(e) => setTOther(e.target.value)} />
                <span>mm</span>
              </div>
            </div>
          )}
          <div className="yk-f">
            <label htmlFor="gt-w">見付幅</label>
            <div className="yk-pair">
              <input type="number" id="gt-w" value={w} min={1} step={10} onChange={(e) => setW(e.target.value)} />
              <span>mm</span>
            </div>
          </div>
          <div className="yk-f">
            <label htmlFor="gt-h">見付高さ</label>
            <div className="yk-pair">
              <input type="number" id="gt-h" value={h} min={1} step={10} onChange={(e) => setH(e.target.value)} />
              <span>mm</span>
            </div>
          </div>
          <div className="yk-f yk-wide">
            <label htmlFor="gt-wind">設計風圧力 W</label>
            <div className="yk-pair">
              <input type="number" id="gt-wind" value={wind} min={1} step={10} onChange={(e) => setWind(e.target.value)} />
              <span>N/m²</span>
            </div>
            <p className="yk-hint">告示1454号による算定値を入れてください。手元にない場合は下の簡易算定をお使いください。</p>
          </div>
        </div>

        <details className="yk-wind" id="wind">
          <summary>設計風圧力を簡易算定する</summary>
          <div className="yk-grid">
            <div className="yk-f">
              <label htmlFor="gt-v0">基準風速 V₀</label>
              <div className="yk-pair">
                <input type="number" id="gt-v0" value={v0} min={30} max={46} step={1} onChange={(e) => syncWind({ v0: e.target.value })} />
                <span>m/s</span>
              </div>
            </div>
            <div className="yk-f">
              <label htmlFor="gt-rough">地表面粗度区分</label>
              <select id="gt-rough" value={rough} onChange={(e) => syncWind({ rough: e.target.value as Roughness })}>
                {(Object.keys(ROUGH_DESC) as Roughness[]).map((r) => (
                  <option key={r} value={r}>{ROUGH_DESC[r]}</option>
                ))}
              </select>
            </div>
            <div className="yk-f">
              <label htmlFor="gt-bh">建築物の基準高さ H</label>
              <div className="yk-pair">
                <input type="number" id="gt-bh" value={bh} min={1} step={1} onChange={(e) => syncWind({ bh: e.target.value })} />
                <span>m</span>
              </div>
            </div>
            <div className="yk-f">
              <label htmlFor="gt-z">当該部分の高さ Z</label>
              <div className="yk-pair">
                <input type="number" id="gt-z" value={z} min={1} step={1} onChange={(e) => syncWind({ z: e.target.value })} />
                <span>m</span>
              </div>
            </div>
            <div className="yk-f yk-wide">
              <label htmlFor="gt-part">壁面の位置</label>
              <select id="gt-part" value={part} onChange={(e) => syncWind({ part: e.target.value as WallPart })}>
                <option value="general">一般部</option>
                <option value="corner">隅角部</option>
              </select>
            </div>
            {windOut && (
              <div className="yk-f yk-wide">
                <p className="yk-hint">{windOut}</p>
              </div>
            )}
          </div>
        </details>

        <div className={`yk-verdict ${pick ? 'yk-ok' : 'yk-ng'}`} role="status" aria-live="polite">
          {pick ? (
            <>
              <b>最小適合厚 {pick.k} mm</b>
              <span className="yk-detail">
                許容耐力 {fmtInt(pick.v)} N/m² ≧ 設計風圧力 {fmtInt(Wd)} N/m²（検定比 {(Wd / pick.v).toFixed(2)}）
              </span>
            </>
          ) : (
            <>
              <b>適合する板厚なし</b>
              <span className="yk-detail">
                {A > 0
                  ? `最大厚 ${best.k}mm でも ${fmtInt(best.v)} N/m² で不足します。見付面積を分割するか、強化・倍強度への変更を検討してください。`
                  : '見付幅と見付高さを入力してください。'}
              </span>
            </>
          )}
        </div>
      </section>

      <section aria-label="板厚別の許容耐力">
        <Ladder rows={rows} threshold={Wd} thLabel={`W ${fmtInt(Wd)}`} fmt={fmtInt} headLeft="板厚" headRight="許容耐力 P（N/m²）" />
        <p className="yk-ladder-note">
          見付面積 {A.toFixed(2)} m²（{w}×{h}mm）。赤線が設計風圧力、緑の棒が許容耐力です。
        </p>
        <p className="yk-hint" style={{ marginTop: 10 }}>
          <Link className="yk-btn yk-ghost yk-small" href={karteHref}>この検討を物件カルテに残す</Link>
          <span style={{ marginLeft: 10 }}>物件の風速・粗度・高さを一度入れると、以後の検討で再入力が不要になります。</span>
        </p>
      </section>

      {middle}

      <h2>この条件での早見表</h2>
      <p>選択中の種類・構成で、見付面積ごとの許容耐力です。入力を変えると連動します。</p>
      <div className="yk-scroll">
        <table className="yk-table">
          <caption>許容耐力 P（N/m²）／見付面積別</caption>
          <thead>
            <tr>
              <th>板厚</th>
              {AREAS.map((a) => (
                <th key={a}>{a.toFixed(1)} m²</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row) => (
              <tr key={row.t}>
                <th>{row.t} mm</th>
                {row.cells.map((P, i) => (
                  <td key={i} className="yk-n">{fmtInt(P)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
