'use client';

import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import Ladder from '@/components/karte/Ladder';
import { KV, ResultPanel, ResultRow, SecHead, Sheet, Step } from '@/components/ui/Sheet';
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
 * 組版は計算書の 3 段組（左 = 条件・簡易算定・過程 / 中 = ラダー / 右 = 答えとカルテへ）→ 本文（2 段組）→ 早見表。
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

  const unit = (u: string) => <span className="yy-kt-unit">{u}</span>;

  const left = (
    <>
      <section className="yy-sheet__block" aria-label="計算">
        <SecHead no="I" title="条件" />
        <KV
          k={<label htmlFor="gt-kind">ガラスの種類</label>}
          v={
            <select id="gt-kind" value={kind} onChange={(e) => setKind(e.target.value as GlassKind)}>
              {KIND_ORDER.map((k) => (
                <option key={k} value={k}>{KIND_LABEL[k]}</option>
              ))}
            </select>
          }
        />
        <KV
          k={<label htmlFor="gt-comp">構成</label>}
          v={
            <select id="gt-comp" value={comp} onChange={(e) => setComp(e.target.value as GlassComp)}>
              {(Object.keys(COMP_LABEL) as GlassComp[]).map((c) => (
                <option key={c} value={c}>{COMP_LABEL[c]}ガラス</option>
              ))}
            </select>
          }
        />
        {comp === 'double' && (
          <KV
            k={<label htmlFor="gt-t2">もう一方の板厚 t₂</label>}
            v={<><input type="number" id="gt-t2" value={tOther} min={1} step={0.1} onChange={(e) => setTOther(e.target.value)} />{unit('mm')}</>}
          />
        )}
        <KV k={<label htmlFor="gt-w">見付幅</label>} v={<><input type="number" id="gt-w" value={w} min={1} step={10} onChange={(e) => setW(e.target.value)} />{unit('mm')}</>} />
        <KV k={<label htmlFor="gt-h">見付高さ</label>} v={<><input type="number" id="gt-h" value={h} min={1} step={10} onChange={(e) => setH(e.target.value)} />{unit('mm')}</>} />
        <KV
          k={<label htmlFor="gt-wind">設計風圧力 W</label>}
          v={<><input type="number" id="gt-wind" value={wind} min={1} step={10} onChange={(e) => setWind(e.target.value)} />{unit('N/m²')}</>}
        />
        <p className="yy-kt-note">{compHint}</p>
        <p className="yy-kt-note">W は告示1454号による算定値を入れてください。手元にない場合は下の簡易算定をお使いください。</p>
      </section>

      <details className="yy-kt-details yy-sheet__block" id="wind">
        <summary>
          <SecHead no="II" title="設計風圧力を簡易算定する" right=" " />
        </summary>
        <KV
          k={<label htmlFor="gt-v0">基準風速 V₀</label>}
          v={<><input type="number" id="gt-v0" value={v0} min={30} max={46} step={1} onChange={(e) => syncWind({ v0: e.target.value })} />{unit('m/s')}</>}
        />
        <KV
          k={<label htmlFor="gt-rough">地表面粗度区分</label>}
          v={
            <select id="gt-rough" value={rough} onChange={(e) => syncWind({ rough: e.target.value as Roughness })}>
              {(Object.keys(ROUGH_DESC) as Roughness[]).map((r) => (
                <option key={r} value={r}>{ROUGH_DESC[r]}</option>
              ))}
            </select>
          }
        />
        <KV
          k={<label htmlFor="gt-bh">建築物の基準高さ H</label>}
          v={<><input type="number" id="gt-bh" value={bh} min={1} step={1} onChange={(e) => syncWind({ bh: e.target.value })} />{unit('m')}</>}
        />
        <KV
          k={<label htmlFor="gt-z">当該部分の高さ Z</label>}
          v={<><input type="number" id="gt-z" value={z} min={1} step={1} onChange={(e) => syncWind({ z: e.target.value })} />{unit('m')}</>}
        />
        <KV
          k={<label htmlFor="gt-part">壁面の位置</label>}
          v={
            <select id="gt-part" value={part} onChange={(e) => syncWind({ part: e.target.value as WallPart })}>
              <option value="general">一般部</option>
              <option value="corner">隅角部</option>
            </select>
          }
        />
        {windOut && <p className="yy-kt-note">{windOut}</p>}
      </details>

      <section className="yy-sheet__block">
        <SecHead no="III" title="計算の過程" />
        <Step n="1" k="見付面積" f={`A = ${w} × ${h} mm`} v={`${A.toFixed(2)} m²`} />
        <Step n="2" k="設計風圧力" f="入力値（告示1454号）" v={`${fmtInt(Wd)} N/m²`} />
        <Step n="3" k="許容耐力" f="P = 300 k₁ k₂ ÷ A × (t + t² ÷ 4)" v={pick ? `${fmtInt(pick.v)} N/m²` : '—'} />
        <Step n="4" k="判定" f="P ≧ W となる最小の板厚" v={pick ? `${pick.k} mm` : '適合なし'} strong />
      </section>
    </>
  );

  const center = (
    <section className="yy-sheet__block" aria-label="板厚別の許容耐力">
      <SecHead no="IV" title="板厚ごとの許容耐力" right={`候補 ${rows.length} 種 · 赤線 = 設計風圧力`} />
      <Ladder rows={rows} threshold={Wd} thLabel={`W ${fmtInt(Wd)}`} fmt={fmtInt} headLeft="板厚" headRight="許容耐力 P（N/m²）" />
      <p className="yy-kt-note">
        見付面積 {A.toFixed(2)} m²（{w}×{h}mm）。赤線が設計風圧力、緑の棒が許容耐力です。
      </p>
    </section>
  );

  const right = (
    <>
      <div className={pick ? undefined : 'yy-kt-resng'} role="status" aria-live="polite">
        {pick ? (
          <ResultPanel label="result — 最小適合厚" value={pick.k} unit="mm" sub={`許容耐力 ${fmtInt(pick.v)} N/m² ≧ 設計風圧力 ${fmtInt(Wd)} N/m²`}>
            <ResultRow k="検定比" v={(Wd / pick.v).toFixed(2)} />
            <ResultRow k="ガラス" v={`${KIND_LABEL[kind]} · ${COMP_LABEL[comp]}`} />
          </ResultPanel>
        ) : (
          <ResultPanel
            label="result — 最小適合厚"
            value="なし"
            unit="適合する板厚なし"
            sub={
              A > 0
                ? `最大厚 ${best.k}mm でも ${fmtInt(best.v)} N/m² で不足します。見付面積を分割するか、強化・倍強度への変更を検討してください。`
                : '見付幅と見付高さを入力してください。'
            }
          />
        )}
      </div>
      <div className="yy-gray">
        <span className="yy-label">case — 物件カルテ</span>
        <span className="yy-gray__text">物件の風速・粗度・高さを一度入れると、以後の検討で再入力が不要になります。</span>
        <Link className="yy-pill" href={karteHref}>
          この検討を物件カルテに残す
        </Link>
      </div>
    </>
  );

  return (
    <>
      <Sheet left={left} center={center} right={right} />

      <div className="yy-kt-book">{middle}</div>

      <section className="yy-kt-wide">
        <h2 className="yy-sec yy-kt-h2">
          <span className="yy-sec__no">VII</span>
          <span className="yy-sec__title">この条件での早見表</span>
          <span className="yy-sec__right">選択中の種類・構成で、見付面積ごとの許容耐力。入力を変えると連動します</span>
        </h2>
        <div className="yy-kt-scroll">
          <table className="yy-tbl">
            <caption>許容耐力 P（N/m²）／見付面積別</caption>
            <thead>
              <tr>
                <th>板厚</th>
                {AREAS.map((a) => (
                  <th key={a} className="is-n">{a.toFixed(1)} m²</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.t}>
                  <th>{row.t} mm</th>
                  {row.cells.map((P, i) => (
                    <td key={i} className="is-n">{fmtInt(P)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
