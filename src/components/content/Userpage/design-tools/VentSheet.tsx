'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CaseSave, KV, InfoList, ModeBar, ResultPanel, ResultRow, SecHead, Sheet, SheetButton, SheetHead, Step, useCase } from '@/components/ui/Sheet';
import { saveStudy } from '@/lib/caseStudies';
import { DESIGN_TOOL_MENU } from '@/lib/designToolsMenu';
import { TOOL_ART } from '@/components/home/toolArt';
import { openScreen, screenHref } from '@/lib/openScreen';
import './vent-sheet.css';

/**
 * 24 時間換気の計算書(モック「高級感 3」Q8)。
 * 計算そのものは 12_VentilationCalculation.tsx が持ち、ここは並べるだけ。
 * 1 行目の部屋は I 条件の入力そのもの。2 行目以降は表の中で足した部屋(天井高・換気回数は I の値)。
 */

const TOOL_ID = 'vent-24h';

/** ツールの通し番号(DesignTools.tsx と同じ数え方。一覧の 01〜) */
const TOOL_NO: string = (() => {
  const i = DESIGN_TOOL_MENU.flatMap((c) => c.subTabs).findIndex((t) => t.id === TOOL_ID);
  return i < 0 ? '' : String(i + 1).padStart(2, '0');
})();
const MECH = DESIGN_TOOL_MENU.find((c) => c.id === 'mechanical');

/** 建物の用途 → 居室の区分の既定(令20条の8:住宅等の居室 0.5 回/h、それ以外 0.3 回/h) */
const USES: { label: string; home: boolean }[] = [
  { label: '住宅', home: true },
  { label: '共同住宅', home: true },
  { label: '寄宿舎・下宿', home: true },
  { label: '事務所', home: false },
  { label: '店舗', home: false },
  { label: '学校', home: false },
  { label: '病院・診療所', home: false },
  { label: 'その他', home: false },
];
/** 居室の区分ごとに選べる換気回数 */
const ACH_HOME = [0.5, 0.7];
const ACH_OTHER = [0.3, 0.5, 0.7];

/** 同じ分類のツール(小さな図 + 名前 + 何から出すか) */
const SIBLINGS: { sub: string; art: string; name: string; why: string }[] = [
  { sub: 'vent-fire', art: 'fire', name: '火気使用室換気', why: '燃料消費量から' },
  { sub: 'vent-occupancy', art: 'people', name: '居室換気計算', why: '在室人数から' },
  { sub: 'duct-sizing', art: 'duct', name: 'ダクト径選定', why: '風量・圧損から' },
];

/** 必要換気量 = 床面積 × 天井高 × 換気回数(本体の計算と同じ式) */
const needOf = (m2: number, h: number, ach: number) => m2 * h * ach;
const f1 = (n: number) => n.toFixed(1);

type ExtraRoom = { id: number; name: string; area: number | '' };

export type VentSheetProps = {
  areaM2: number | '';
  areaTsubo: number | '';
  height: number | '';
  ach: number;
  onM2: (v: string) => void;
  onTsubo: (v: string) => void;
  onHeight: (v: number | '') => void;
  onAch: (n: number) => void;
  /** 本体が計算した必要換気量(㎥/h、小数 1 桁に丸めたもの) */
  resultVal: number;
  /** 本体が計算した給気口の有効開口の目安(c㎡) */
  reqInletArea: number;
  onCopy: () => void;
  copied: boolean;
};

export default function VentSheet(p: VentSheetProps) {
  const [use, setUse] = useState('住宅');
  const [home, setHome] = useState(true);
  const [roomName, setRoomName] = useState('居室');
  const [extra, setExtra] = useState<ExtraRoom[]>([]);
  const [savedTo, setSavedTo] = useState<string | null>(null);
  const caseRef = useRef<HTMLDivElement>(null);
  const { mode, currentCase } = useCase();

  const m2 = Number(p.areaM2) || 0;
  const h = Number(p.height) || 0;
  const vol = m2 * h;
  const has = p.resultVal > 0;
  const fans = Math.ceil(p.resultVal / 50); // 100φ パイプファン(約 50 ㎥/h)
  const inlets = Math.ceil(p.reqInletArea / 35); // 100φ 給気口(約 35 c㎡)
  const sirocco = (p.resultVal / 300).toFixed(1); // 150φ シロッコ(約 300 ㎥/h)

  // 部屋ごとの表(1 行目 = I 条件)
  const rows = [
    { key: 'main', name: roomName, area: m2 },
    ...extra.map((r) => ({ key: String(r.id), name: r.name, area: Number(r.area) || 0 })),
  ];
  const sumArea = rows.reduce((s, r) => s + r.area, 0);
  const sumVol = rows.reduce((s, r) => s + r.area * h, 0);
  const sumNeed = rows.reduce((s, r) => s + needOf(r.area, h, p.ach), 0);

  // 1 時間で空気の何割が入れ替わるか(換気回数をことばで)
  const ratio = p.ach === 0.5 ? '半分' : p.ach >= 1 ? `${p.ach} 回分` : `${Math.round(p.ach * 10)} 割`;
  const resultText = has ? `${f1(p.resultVal)} ㎥/h${extra.length ? ` · 計 ${f1(sumNeed)} ㎥/h` : ''}` : '';

  const changeUse = (label: string) => {
    setUse(label);
    const isHome = USES.find((u) => u.label === label)?.home ?? false;
    setHome(isHome);
    p.onAch(isHome ? 0.5 : 0.3);
  };
  const changeHome = (isHome: boolean) => {
    setHome(isHome);
    const list = isHome ? ACH_HOME : ACH_OTHER;
    if (!list.includes(p.ach)) p.onAch(list[0]);
  };

  const saveToCase = () => {
    if (mode === 'case' && currentCase && resultText) {
      saveStudy(currentCase.id, { tool: TOOL_ID, result: resultText });
      setSavedTo(currentCase.id);
      return;
    }
    // 案件を選んでいないときは、右の「保存先の案件」へ
    caseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const addRoom = () => setExtra((xs) => [...xs, { id: Date.now(), name: `部屋 ${xs.length + 2}`, area: '' }]);
  const editRoom = (id: number, patch: Partial<ExtraRoom>) => setExtra((xs) => xs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRoom = (id: number) => setExtra((xs) => xs.filter((r) => r.id !== id));

  const left = (
    <>
      <section className="yy-sheet__block">
        <SecHead no="I" title="条件" />
        <KV
          k="建物の用途"
          v={
            <select value={use} onChange={(e) => changeUse(e.target.value)} aria-label="建物の用途">
              {USES.map((u) => (
                <option key={u.label}>{u.label}</option>
              ))}
            </select>
          }
        />
        <KV k="部屋" v={<input className="yy-vent__in--name" value={roomName} onChange={(e) => setRoomName(e.target.value)} aria-label="部屋の名前" />} />
        <KV
          k="居室の区分"
          v={
            <select value={home ? 'home' : 'other'} onChange={(e) => changeHome(e.target.value === 'home')} aria-label="居室の区分">
              <option value="home">住宅等の居室</option>
              <option value="other">住宅以外の居室</option>
            </select>
          }
        />
        <KV
          k="換気回数"
          v={
            <>
              <select value={p.ach} onChange={(e) => p.onAch(Number(e.target.value))} aria-label="換気回数">
                {(home ? ACH_HOME : ACH_OTHER).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="yy-vent__unit">回/h</span>
            </>
          }
        />
        <KV
          k="床面積"
          v={
            <>
              <input className="yy-vent__in" type="number" step="0.01" placeholder="0" value={p.areaM2} onChange={(e) => p.onM2(e.target.value)} aria-label="床面積(㎡)" />
              <span className="yy-vent__unit">㎡ =</span>
              <input className="yy-vent__in--s" type="number" step="0.01" placeholder="0" value={p.areaTsubo} onChange={(e) => p.onTsubo(e.target.value)} aria-label="床面積(坪)" />
              <span className="yy-vent__unit">坪</span>
            </>
          }
        />
        <KV
          k="天井高"
          v={
            <>
              <input
                className="yy-vent__in"
                type="number"
                step="0.1"
                value={p.height}
                onChange={(e) => p.onHeight(e.target.value === '' ? '' : parseFloat(e.target.value))}
                aria-label="天井高(m)"
              />
              <span className="yy-vent__unit">m</span>
            </>
          }
        />
      </section>

      <section className="yy-sheet__block">
        <SecHead no="II" title="計算の過程" />
        <Step n="1" k="気積" f={`${f1(m2)} ㎡ × ${h} m`} v={`${f1(vol)} ㎥`} />
        <Step n="2" k="必要換気量" f={`${f1(vol)} ㎥ × ${p.ach} 回/h`} v={`${f1(p.resultVal)} ㎥/h`} strong />
        <Step n="3" k="機器の目安" f="パイプファン φ100 · 給気口 φ100" v={has ? `${fans} 台 · ${inlets} か所` : '—'} />
        {/*
          「必要換気量 × 2.0」は法令や特定の規格に基づく式ではなく社内の目安(本体のコメントと同じ)。
          根拠がない値であることをここでも明示しておく。
        */}
        <p className="yy-vent__note">
          パイプファンは約 50 ㎥/h、給気口は有効開口 約 35 c㎡ で数えた目安。150φ シロッコ(約 300 ㎥/h)なら {sirocco} 台分。給気口は「必要換気量 × 2.0」による概算で、法令・規格に基づく値ではありません。実際は有効開口率と設計圧力差からメーカー資料で確認してください。
        </p>
      </section>

      <section className="yy-sheet__block">
        <SecHead no="III" title="同じ分類のツール" right={MECH ? `${MECH.label} ${MECH.subTabs.length} 本` : undefined} />
        <ul className="yy-vent__tools">
          {SIBLINGS.map((t) => {
            const target = { menu: 'design-tools', category: 'mechanical', sub: t.sub };
            return (
              <li key={t.sub}>
                <a
                  className="yy-matside__tool"
                  href={screenHref(target)}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    openScreen(target);
                  }}
                >
                  <svg className="yy-thumb yy-thumb--s" viewBox="0 0 270 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" dangerouslySetInnerHTML={{ __html: TOOL_ART[t.art] ?? '' }} />
                  <span className="yy-matside__name">{t.name}</span>
                  <span className="yy-matside__why">{t.why}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );

  const center = (
    <>
      <div className="yy-sheet__fig yy-vent__fig">
        <RoomFigure area={m2} height={h} inlets={has ? inlets : 2} fans={has ? fans : 1} />
        <p className="yy-vent__note">* 間口・奥行は床面積から 5 : 4 で割り付けた目安。給気口・換気扇の数は II-3 の目安</p>
      </div>
      <section className="yy-sheet__block">
        <SecHead no="IV" title="部屋ごとの換気量" right="天井高・換気回数は I の値 · 部屋を足して合計" />
        <table className="yy-tbl yy-vent__tbl">
          <colgroup>
            <col style={{ width: '34%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '4%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>部屋</th>
              <th>床面積 ㎡</th>
              <th>気積 ㎥</th>
              <th>必要換気量 ㎥/h</th>
              <th aria-label="操作" />
            </tr>
          </thead>
          <tbody>
            <tr className="is-hi">
              <td>
                <span className="yy-vent__name">
                  <i className="yy-dot" />
                  <input className="yy-vent__rname" value={roomName} onChange={(e) => setRoomName(e.target.value)} aria-label="部屋の名前" />
                </span>
              </td>
              <td>
                <input type="number" step="0.01" placeholder="0" value={p.areaM2} onChange={(e) => p.onM2(e.target.value)} aria-label="床面積(㎡)" />
              </td>
              <td>{f1(vol)}</td>
              <td>{f1(p.resultVal)}</td>
              <td />
            </tr>
            {extra.map((r) => {
              const a = Number(r.area) || 0;
              return (
                <tr key={r.id}>
                  <td>
                    <input className="yy-vent__rname" value={r.name} onChange={(e) => editRoom(r.id, { name: e.target.value })} aria-label="部屋の名前" />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={r.area}
                      onChange={(e) => editRoom(r.id, { area: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      aria-label="床面積(㎡)"
                    />
                  </td>
                  <td>{f1(a * h)}</td>
                  <td>{f1(needOf(a, h, p.ach))}</td>
                  <td>
                    <button type="button" className="yy-vent__del" onClick={() => removeRoom(r.id)} aria-label={`${r.name}を外す`} title="この部屋を外す">
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>合計{rows.length > 1 ? ` · ${rows.length} 室` : ''}</td>
              <td>{f1(sumArea)}</td>
              <td>{f1(sumVol)}</td>
              <td>{f1(sumNeed)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
        <button type="button" className="yy-vent__add" onClick={addRoom}>
          + 部屋を足す
        </button>
      </section>
    </>
  );

  const right = (
    <>
      <ResultPanel label="result — 必要換気量" value={has ? f1(p.resultVal) : '—'} unit={`㎥/h · ${roomName || '居室'}`} sub={`1 時間で空気の${ratio}が入れ替わる量`}>
        <ResultRow k="給気口の有効開口(目安)" v={has ? `約 ${p.reqInletArea} c㎡` : '—'} />
        {extra.length > 0 && <ResultRow k={`部屋の合計 · ${rows.length} 室`} v={`${f1(sumNeed)} ㎥/h`} />}
      </ResultPanel>
      <div ref={caseRef}>
        <CaseSave tool={TOOL_ID} result={resultText} />
      </div>
      <InfoList sections={['section-28', 'section-26']} posts={['30', '35', '38']} />
    </>
  );

  const canSaveHere = mode === 'case' && !!currentCase;
  return (
    <div className="yy-vent">
      {/* lg 以上だけ。lg 未満は DesignTools の見出しとタブがそのまま出る */}
      <div className="hidden lg:block">
        <ModeBar />
        <SheetHead
          no={TOOL_NO}
          en={`tool · ${MECH?.label ?? '機械設備'}`}
          title="24 時間換気"
          desc="令20条の8 · シックハウス対策の必要換気量"
          actions={
            <>
              <SheetButton onClick={p.onCopy} disabled={!has} title="計算書(条件と結果)をテキストでコピー">
                {p.copied ? 'コピーしました' : '計算書をコピー'}
              </SheetButton>
              <SheetButton
                primary
                onClick={saveToCase}
                disabled={!has}
                title={canSaveHere ? `「${currentCase?.name}」に保存` : '保存先の案件を右で選びます'}
              >
                {canSaveHere && savedTo === currentCase?.id ? '✓ 保存しました' : '案件に保存'}
              </SheetButton>
            </>
          }
        />
      </div>
      <Sheet left={left} center={center} right={right} />
    </div>
  );
}

/**
 * 部屋の立体図(モック gen-w.js の ventSvg を、入力した寸法で描き直したもの)。
 * 間口・奥行は床面積から 5 : 4 で割り付けた目安。給気口は左の壁、換気扇は右の壁。
 */
function RoomFigure({ area, height, inlets, fans }: { area: number; height: number; inlets: number; fans: number }) {
  const uid = useId().replace(/:/g, '');
  // 図は列の幅に合わせて縮むので、字だけは画面上で 11〜12px 前後に保つ(viewBox 600 に対する倍率)
  const svgRef = useRef<SVGSVGElement>(null);
  const [k, setK] = useState(1);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const fit = (wpx: number) => {
      if (wpx > 0) setK(Math.min(Math.max(600 / wpx, 1), 2.2));
    };
    fit(el.getBoundingClientRect().width); // 最初の 1 回(ResizeObserver は描画のときにしか呼ばれない)
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => fit(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fs = 12 * k;
  const ink = '#141414';
  const t2 = '#5c5c5a';
  const air = '#2f78c4';

  const g = useMemo(() => {
    const hasArea = area > 0;
    const w = hasArea ? Math.sqrt((area * 5) / 4) : 5;
    const d = hasArea ? area / w : 4;
    const hh = height > 0 ? height : 2.4;
    const cx = Math.cos(Math.PI / 6);
    // 描ける範囲(viewBox 600 × 440 の中。上は引き出し線、右は寸法の字の余白)
    const X0 = 60, X1 = 520, Y0 = 70, Y1 = 385;
    const s = Math.min((X1 - X0) / (cx * (w + d)), (Y1 - Y0) / (hh + 0.5 * (w + d)));
    const bx = X0 + cx * d * s + (X1 - X0 - cx * (w + d) * s) / 2;
    const by = Y0 + (Y1 - Y0 - (hh + 0.5 * (w + d)) * s) / 2 + hh * s;
    const P = (x: number, y: number) => ({ x, y });
    const B = P(bx, by);
    const R = P(bx + cx * w * s, by + 0.5 * w * s);
    const L = P(bx - cx * d * s, by + 0.5 * d * s);
    const F = P(R.x - cx * d * s, R.y + 0.5 * d * s);
    const up = (q: { x: number; y: number }, k = 1) => P(q.x, q.y - hh * s * k);
    const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => P(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    // 床の目地(1 m ごと。大きい部屋は間引く)
    const stepM = Math.max(1, Math.ceil(Math.max(w, d) / 12));
    const grid: { a: { x: number; y: number }; b: { x: number; y: number } }[] = [];
    for (let m = stepM; m < d - 0.05; m += stepM) grid.push({ a: lerp(B, L, m / d), b: lerp(R, F, m / d) });
    for (let m = stepM; m < w - 0.05; m += stepM) grid.push({ a: lerp(B, R, m / w), b: lerp(L, F, m / w) });
    return { hasArea, w, d, hh, s, B, R, L, F, up, lerp, grid };
  }, [area, height]);

  const { B, R, L, F, up, lerp } = g;
  const pts = (...q: { x: number; y: number }[]) => q.map((v) => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(' ');
  const nIn = Math.min(Math.max(inlets, 1), 4);
  const inletPos = Array.from({ length: nIn }, (_, k) => up(lerp(B, L, (k + 0.5) / nIn), 0.74));
  const fan = up(lerp(B, R, 0.82), 0.8);
  // 空気は床の中ほどを通って換気扇へ
  const mid = up(lerp(lerp(B, R, 0.5), lerp(L, F, 0.5), 0.5), 0.15);
  const top = Math.min(...inletPos.map((q) => q.y), fan.y);
  const leadY = Math.max(top - 44, 22);
  const wl = lerp(L, F, 0.5);
  const dl = lerp(R, F, 0.5);
  const hl = lerp(R, up(R), 0.5);

  return (
    <svg ref={svgRef} viewBox="0 0 600 440" role="img" aria-label="部屋の立体図に給気口・換気扇・空気の流れを描いた図">
      <defs>
        <marker id={`va-${uid}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={air} />
        </marker>
      </defs>
      {/* 床と 2 枚の壁 */}
      <polygon points={pts(B, R, F, L)} fill="#f4f4f2" stroke={ink} strokeWidth={1.5} />
      <g stroke="#e2e2e2">
        {g.grid.map((l, i) => (
          <line key={i} x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y} />
        ))}
      </g>
      <polygon points={pts(B, R, up(R), up(B))} fill="#ffffff" stroke={ink} strokeWidth={1.5} />
      <polygon points={pts(B, L, up(L), up(B))} fill="#fafafa" stroke={ink} strokeWidth={1.5} />
      {/* 給気口(左の壁)と換気扇(右の壁) */}
      {inletPos.map((q, i) => (
        <ellipse key={i} cx={q.x} cy={q.y} rx={9} ry={13} fill="#ffffff" stroke={air} strokeWidth={2.2} />
      ))}
      <rect x={fan.x - 14} y={fan.y - 14} width={28} height={28} rx={4} fill={ink} />
      <circle cx={fan.x} cy={fan.y} r={8.5} fill="none" stroke="#ffffff" strokeWidth={2} />
      {/* 空気の流れ */}
      {inletPos.map((q, i) => (
        <path
          key={i}
          d={`M${(q.x + 10).toFixed(1)} ${(q.y + 12).toFixed(1)} Q ${mid.x.toFixed(1)} ${(mid.y + 30 * (i - (nIn - 1) / 2)).toFixed(1)} ${(fan.x - 16).toFixed(1)} ${(fan.y + 6).toFixed(1)}`}
          fill="none"
          stroke={air}
          strokeWidth={2}
          strokeDasharray="9 7"
          markerEnd={`url(#va-${uid})`}
        />
      ))}
      {/* 寸法 */}
      <g fontSize={fs} fill={t2}>
        <text x={wl.x - 10} y={wl.y + 10 + fs} textAnchor="middle" transform={`rotate(30 ${wl.x - 10} ${wl.y + 10 + fs})`}>
          {g.hasArea ? `間口 約 ${g.w.toFixed(1)} m` : '間口 — m'}
        </text>
        <text x={dl.x + 10} y={dl.y + 10 + fs} textAnchor="middle" transform={`rotate(-30 ${dl.x + 10} ${dl.y + 10 + fs})`}>
          {g.hasArea ? `奥行 約 ${g.d.toFixed(1)} m` : '奥行 — m'}
        </text>
        <text x={hl.x + 8 + fs} y={hl.y} textAnchor="middle" transform={`rotate(-90 ${hl.x + 8 + fs} ${hl.y})`}>
          {`天井高 ${g.hh} m`}
        </text>
      </g>
      {/* 引き出し線 + 小さな四角。給気口の字は左へ、換気扇の字は右へ(入らなければ左へ)出す */}
      <g fontSize={fs} fill={ink}>
        <line x1={inletPos[0].x} y1={inletPos[0].y - 14} x2={inletPos[0].x} y2={leadY} stroke={ink} />
        <rect x={inletPos[0].x - 3} y={leadY - 6} width={6} height={6} fill={ink} />
        <text x={inletPos[0].x - 9} y={leadY + 1} textAnchor="end">{`給気口 φ100 × ${inlets}`}</text>
        <line x1={fan.x} y1={fan.y - 16} x2={fan.x} y2={leadY} stroke={ink} />
        <rect x={fan.x - 3} y={leadY - 6} width={6} height={6} fill={ink} />
        {fan.x + 9 + fs * 5.5 <= 598 ? (
          <text x={fan.x + 9} y={leadY + 1}>{`換気扇 × ${fans}`}</text>
        ) : (
          <text x={fan.x - 9} y={leadY + 1} textAnchor="end">{`換気扇 × ${fans}`}</text>
        )}
      </g>
    </svg>
  );
}
