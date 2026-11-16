'use client';
/**
 * 基本設計 › ボリューム検討。1 組の敷地条件から「この敷地に何 m²・何階まで建つか」と、どの制限が効くかを出す。
 * 計算は src/lib/volume.ts(建蔽率は karte/site.ts、斜線・絶対高さは setback.ts、日影の目安は shadow.ts を使う)。2026-11-16
 * 見た目は斜線制限(SetbackCalc.tsx)と同じ組み方: 左に入力、右に答えの面 1 つと 1px 罫線の表。
 */
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ResultRow } from '@/components/ui/Sheet';
import DtResult from './DtResult';
import { ZONES, zoneOf } from '@/lib/setback';
import { CITIES, SHADOW_ZONES, hm } from '@/lib/shadow';
import { ZONE_GUIDES } from '@/lib/zoneGuide';
import type { FireRating } from '@/lib/karte/site';
import { DIRS, DIR_LABEL, NOT_CHECKED, calcVolume, f2, shadowGroupOf, zoneIdOf, type Dir, type VolPart, type VolumeIn, type VolumeOut } from '@/lib/volume';

const field = 'w-full text-[12px] px-2 py-1.5';
const label = 'block text-[11px] font-bold text-gray-700 mb-1';
const box = 'bg-gray-50 p-3 border border-[#3b3b3b] space-y-2';
const ACC = '#52AA96';

const FIRES = ['指定なし', '法22条区域', '準防火地域', '防火地域'];
const FR_LABEL: Record<FireRating, string> = { taika: '耐火建築物等', juntaika: '準耐火建築物等', none: 'その他' };
/** 用途地域の指定のない区域の選択肢(法 52 条 1 項 8 号・53 条 1 項 6 号) */
const NONE_OPT = { bcr: [30, 40, 50, 60, 70], far: [50, 80, 100, 200, 300, 400] };
const optsOf = (zone: string) => {
  const g = ZONE_GUIDES.find((x) => x.name === zone);
  return g ? { bcr: g.bcr, far: g.far } : NONE_OPT;
};
const mid = (ns: number[]) => ns[Math.floor((ns.length - 1) / 2)];
const newPart = (zone = '第一種住居地域'): VolPart => {
  const o = optsOf(zone);
  return { zone, fire: '指定なし', area: 0, bc: mid(o.bcr), far: mid(o.far), bldg: true, roadK: zoneOf(zoneIdOf(zone)).roadK[0] };
};
const num = (s: string) => (s.trim() === '' ? NaN : Number(s));

function Num({ k, v, set, step = '0.1', hint, min = '0', placeholder }: { k: string; v: string; set: (s: string) => void; step?: string; hint?: string; min?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block text-[10px] text-gray-500 mb-1">{k}</span>
      <input type="number" min={min} step={step} value={v} placeholder={placeholder} onChange={(e) => set(e.target.value)} className={field} />
      {hint && <span className="block text-[10px] text-gray-400 mt-0.5">{hint}</span>}
    </label>
  );
}

function Check({ v, set, children }: { v: boolean; set: (b: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-1 text-[11px]">
      <input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} className="mt-0.5" />
      <span>{children}</span>
    </label>
  );
}

function DirSelect({ v, set, exclude }: { v: Dir; set: (d: Dir) => void; exclude?: Dir }) {
  return (
    <select value={v} onChange={(e) => set(e.target.value as Dir)} className={field}>
      {DIRS.filter((d) => d !== exclude).map((d) => (
        <option key={d} value={d}>
          {DIR_LABEL[d]}
        </option>
      ))}
    </select>
  );
}

/** 平面(真北が上)。敷地 = 細線、建物の箱 = 塗り、道路 = 灰の帯。効いている面は差し色 */
function Plan({ r, v, govIdx }: { r: VolumeOut; v: VolumeIn; govIdx: number }) {
  const { ew, ns, set, bw, bd } = r.plan;
  if (!(ew > 0 && ns > 0)) return null;
  const roads = new Map<Dir, number>();
  // 2 項道路は後退後のみなし幅員で描く(敷地の奥行は後退分だけ短くしてある)
  if (v.road1.width > 0) roads.set(v.road1.dir, v.nisetsu && v.road1.width < v.nisetsuDeemed ? v.nisetsuDeemed : v.road1.width);
  if (v.road2 && v.road2.dir !== v.road1.dir && v.road2.width > 0) roads.set(v.road2.dir, v.road2.width);
  const rw = (d: Dir) => Math.min(roads.get(d) ?? 0, Math.max(ew, ns) * 0.6);
  const totW = ew + rw('E') + rw('W');
  const totH = ns + rw('N') + rw('S');
  const W = 420;
  const H = 300;
  const pad = 28;
  const s = Math.min((W - pad * 2) / totW, (H - pad * 2) / totH);
  const ox = (W - totW * s) / 2 + rw('W') * s;
  const oy = (H - totH * s) / 2 + rw('N') * s;
  const X = (x: number) => ox + x * s;
  const Y = (y: number) => oy + (ns - y) * s; // y = 南からの距離
  const govFace = govIdx >= 0 ? r.faces[govIdx] : null;
  const faceLine = (d: Dir) => {
    const x0 = set.W;
    const x1 = set.W + bw;
    const y0 = set.S;
    const y1 = set.S + bd;
    if (d === 'N') return [X(x0), Y(y1), X(x1), Y(y1)];
    if (d === 'S') return [X(x0), Y(y0), X(x1), Y(y0)];
    if (d === 'E') return [X(x1), Y(y0), X(x1), Y(y1)];
    return [X(x0), Y(y0), X(x0), Y(y1)];
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[460px]" aria-label="敷地と建物の平面">
      {[...roads.entries()].map(([d, w]) => {
        const t = rw(d) * s;
        const rect = d === 'N' ? [X(0), Y(ns) - t, ew * s, t] : d === 'S' ? [X(0), Y(0), ew * s, t] : d === 'E' ? [X(ew), Y(ns), t, ns * s] : [X(0) - t, Y(ns), t, ns * s];
        return (
          <g key={d}>
            <rect x={rect[0]} y={rect[1]} width={rect[2]} height={rect[3]} fill="#e6e4dd" />
            <text x={rect[0] + rect[2] / 2} y={rect[1] + rect[3] / 2 + 3} fontSize={9} textAnchor="middle" fill="#3b3b3b">
              道路 {f2(w)}m
            </text>
          </g>
        );
      })}
      <rect x={X(0)} y={Y(ns)} width={ew * s} height={ns * s} fill="none" stroke="#3b3b3b" strokeWidth={1} />
      {bw > 0 && bd > 0 && <rect x={X(set.W)} y={Y(set.S + bd)} width={bw * s} height={bd * s} fill="#2b2b2b" fillOpacity={0.12} stroke="#2b2b2b" strokeWidth={1} />}
      {govFace && bw > 0 && bd > 0 && (() => {
        const [x1, y1, x2, y2] = faceLine(govFace.dir);
        return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ACC} strokeWidth={2.5} />;
      })()}
      <text x={X(set.W + bw / 2)} y={Y(set.S + bd / 2) + 3} fontSize={10} textAnchor="middle" fill="#2b2b2b">
        {f2(bw)} × {f2(bd)}
      </text>
      <text x={X(0)} y={Y(ns) - 4 - (rw('N') > 0 ? rw('N') * s : 0)} fontSize={9} fill="#8a8a85">
        敷地 {f2(ew)} × {f2(ns)} m
      </text>
      <g transform={`translate(${W - 16}, 22)`}>
        <line x1={0} y1={10} x2={0} y2={-10} stroke="#3b3b3b" strokeWidth={1} />
        <path d="M -4 -3 L 0 -10 L 4 -3" fill="none" stroke="#3b3b3b" strokeWidth={1} />
        <text x={0} y={-13} fontSize={9} textAnchor="middle" fill="#3b3b3b">
          N
        </text>
      </g>
    </svg>
  );
}

export default function VolumeStudy() {
  const [parts, setParts] = useState<VolPart[]>([{ ...newPart('第一種住居地域'), area: 200, bc: 60, far: 200, fire: '準防火地域' }]);
  const [frontPart, setFrontPart] = useState(0);
  const [r1Dir, setR1Dir] = useState<Dir>('S');
  const [r1W, setR1W] = useState('6');
  const [nisetsu, setNisetsu] = useState(false);
  const [deemed, setDeemed] = useState<4 | 6>(4);
  const [oneSide, setOneSide] = useState(false);
  const [r2On, setR2On] = useState(false);
  const [r2Dir, setR2Dir] = useState<Dir>('E');
  const [r2W, setR2W] = useState('4');
  const [tokutei, setTokutei] = useState(false);
  const [tokuteiL, setTokuteiL] = useState('');
  const [corner, setCorner] = useState(false);
  const [fr, setFr] = useState<FireRating>('juntaika');
  const [siteW, setSiteW] = useState('12');
  const [siteD, setSiteD] = useState('16.7');
  const [roadSet, setRoadSet] = useState('1');
  const [sideSet, setSideSet] = useState('1');
  const [northOv, setNorthOv] = useState('');
  const [ftf, setFtf] = useState('3');
  const [extra, setExtra] = useState('1');
  const [basement, setBasement] = useState('0');
  const [absH, setAbsH] = useState<10 | 12>(10);
  const [kodo, setKodo] = useState('');
  const [note3, setNote3] = useState(false);
  const [side25, setSide25] = useState(false);
  const [noneSlope, setNoneSlope] = useState<1.25 | 1.5>(1.25);
  const [shGroup, setShGroup] = useState('res');
  const [shGo, setShGo] = useState('');
  const [shPlane, setShPlane] = useState('4');
  const [city, setCity] = useState('東京');
  const [lat, setLat] = useState('35.68');
  const [hokkaido, setHokkaido] = useState(false);

  /** 用途地域の解説ページから ?zone={id} で来たら、その地域で始める */
  useEffect(() => {
    try {
      const id = new URLSearchParams(window.location.search).get('zone');
      const g = id ? ZONE_GUIDES.find((x) => x.id === id) : null;
      if (g) {
        setParts([{ ...newPart(g.name), area: 200 }]);
        setShGroup(shadowGroupOf(g.setbackId) ?? '');
        setShGo('');
      }
    } catch {
      /* 読めなければ既定のまま */
    }
  }, []);

  const updPart = (i: number, p: Partial<VolPart>) => setParts((ps) => ps.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const changeZone = (i: number, zone: string) => {
    const np = newPart(zone);
    setParts((ps) => ps.map((x, j) => (j === i ? { ...np, area: x.area, fire: x.fire, bldg: x.bldg } : x)));
    if (i === frontPart) {
      const g = shadowGroupOf(zoneIdOf(zone));
      setShGroup(g ?? '');
      const sz = SHADOW_ZONES.find((z) => z.id === g);
      if (sz) setShPlane(String(sz.planes[0]));
      setShGo('');
    }
  };

  const sz = SHADOW_ZONES.find((z) => z.id === shGroup) ?? null;
  const r2DirEff: Dir = r2Dir === r1Dir ? (DIRS.find((d) => d !== r1Dir) as Dir) : r2Dir;
  const v: VolumeIn = useMemo(
    () => ({
      parts,
      frontPart,
      road1: { dir: r1Dir, width: Number(r1W) || 0 },
      road2: r2On ? { dir: r2DirEff, width: Number(r2W) || 0 } : null,
      nisetsu,
      nisetsuDeemed: deemed,
      nisetsuOneSide: oneSide,
      tokutei,
      tokuteiL: tokuteiL === '' ? NaN : Number(tokuteiL),
      corner,
      fr,
      siteWidth: Number(siteW) || 0,
      siteDepth: Number(siteD) || 0,
      roadSet: Number(roadSet) || 0,
      sideSet: Number(sideSet) || 0,
      northDistOverride: Number.isFinite(num(northOv)) ? num(northOv) : null,
      ftf: Number(ftf) || 3,
      extra: Number(extra) || 0,
      basement: Number(basement) || 0,
      absHeight: absH,
      kodo: Number(kodo) || 0,
      note3,
      side25,
      noneSlope,
      shadow: sz && shGo ? { group: sz.id, go: shGo, plane: Number(shPlane), lat: Number(lat) || 35.68, hokkaido } : null,
    }),
    [parts, frontPart, r1Dir, r1W, r2On, r2DirEff, r2W, nisetsu, deemed, oneSide, tokutei, tokuteiL, corner, fr, siteW, siteD, roadSet, sideSet, northOv, ftf, extra, basement, absH, kodo, note3, side25, noneSlope, sz, shGo, shPlane, lat, hokkaido]
  );
  const r = useMemo(() => calcVolume(v), [v]);

  const zoneIds = parts.map((p) => zoneIdOf(p.zone));
  const anyLow = zoneIds.some((id) => zoneOf(id).absHeight);
  const anyNote3 = zoneIds.some((id) => zoneOf(id).note3);
  const anySide125 = zoneIds.some((id) => zoneOf(id).neighbor?.[1] === 1.25);
  const anyNone = zoneIds.includes('none');
  const multi = new Set(parts.map((p) => p.zone)).size > 1;
  const gov = r.governing.key;
  const isGov = (c: VolumeOut['constraints'][number]) => gov !== 'far' && gov !== 'none' && c.key === gov && c.floors === Math.min(...r.constraints.filter((x) => x.key === gov).map((x) => x.floors));
  const fl = (n: number) => (Number.isFinite(n) ? `${n} 階` : '制限なし');
  const govIdx = r.faces.findIndex((_, i) => !!r.constraints[i] && isGov(r.constraints[i]));

  return (
    <div className="p-4 text-[12px] text-gray-700">
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
        {/* ─── 入力 ─── */}
        <div className="space-y-3">
          <div className={box}>
            <div className="flex items-center justify-between">
              <span className={label}>敷地(2 以上の地域にわたるときは行を足す)</span>
              <button type="button" className="yy-btn" disabled={parts.length >= 3} onClick={() => setParts((ps) => [...ps, newPart(ps[ps.length - 1]?.zone)])}>
                追加
              </button>
            </div>
            {parts.map((p, i) => {
              const o = optsOf(p.zone);
              const ks = zoneOf(zoneIdOf(p.zone)).roadK;
              return (
                <div key={i} className="border-t border-[#d9d6cf] pt-2 space-y-1.5">
                  <select value={p.zone} onChange={(e) => changeZone(i, e.target.value)} className={field} aria-label="用途地域">
                    {ZONES.map((z) => (
                      <option key={z.id} value={z.label}>
                        {z.label}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-3 gap-1.5">
                    <Num k="面積 m²" v={p.area ? String(p.area) : ''} set={(s) => updPart(i, { area: Number(s) || 0 })} placeholder="未入力" />
                    <label className="block">
                      <span className="block text-[10px] text-gray-500 mb-1">建蔽率 %</span>
                      <select value={p.bc} onChange={(e) => updPart(i, { bc: Number(e.target.value) })} className={field}>
                        {o.bcr.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="block text-[10px] text-gray-500 mb-1">容積率 %</span>
                      <select value={p.far} onChange={(e) => updPart(i, { far: Number(e.target.value) })} className={field}>
                        {o.far.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <label className="block">
                      <span className="block text-[10px] text-gray-500 mb-1">防火の指定</span>
                      <select value={p.fire} onChange={(e) => updPart(i, { fire: e.target.value })} className={field}>
                        {FIRES.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="block text-[10px] text-gray-500 mb-1">道路幅員の乗数(52 条 2 項)</span>
                      <select value={p.roadK ?? ks[0]} onChange={(e) => updPart(i, { roadK: Number(e.target.value) })} className={field} disabled={ks.length < 2}>
                        {ks.map((k, j) => (
                          <option key={k} value={k}>
                            {j === 0 ? `${k}` : `${k}(指定区域)`}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                    {parts.length > 1 && (
                      <label className="flex items-center gap-1">
                        <input type="radio" name="vol-front" checked={frontPart === i} onChange={() => setFrontPart(i)} /> 前面道路に接する
                      </label>
                    )}
                    {parts.length > 1 && (
                      <label className="flex items-center gap-1">
                        <input type="checkbox" checked={p.bldg} onChange={(e) => updPart(i, { bldg: e.target.checked })} /> 建物がかかる
                      </label>
                    )}
                    {parts.length > 1 && (
                      <button
                        type="button"
                        className="yy-dt-link is-danger ml-auto"
                        onClick={() => {
                          setParts((ps) => ps.filter((_, j) => j !== i));
                          setFrontPart((f) => (f === i ? 0 : f > i ? f - 1 : f));
                        }}
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <p className="text-[10px] text-gray-400">面積は 2 項道路の後退前の面積を入れる(後退部分はこのツールで差し引く)。</p>
            <div className="grid grid-cols-2 gap-2 border-t border-[#d9d6cf] pt-2">
              <Num k="間口(前面道路に沿った長さ・m)" v={siteW} set={setSiteW} />
              <Num k="奥行(m)" v={siteD} set={setSiteD} />
            </div>
          </div>

          <div className={box}>
            <span className={label}>前面道路</span>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="block text-[10px] text-gray-500 mb-1">道路がある方位</span>
                <DirSelect v={r1Dir} set={setR1Dir} />
              </label>
              <Num k={nisetsu ? '現況の幅員(m)' : '幅員(m)'} v={r1W} set={setR1W} />
            </div>
            <Check v={nisetsu} set={setNisetsu}>
              2 項道路(法 42 条 2 項)。中心線から {deemed / 2}m 後退
            </Check>
            {nisetsu && (
              <div className="pl-4 space-y-1">
                <Check v={deemed === 6} set={(b) => setDeemed(b ? 6 : 4)}>
                  6m の指定区域(中心線から 3m)
                </Check>
                <Check v={oneSide} set={setOneSide}>
                  反対側が崖地・川・線路敷等(片側だけ {deemed}m 後退)
                </Check>
              </div>
            )}
            <Check v={r2On} set={setR2On}>
              2 本目の前面道路がある
            </Check>
            {r2On && (
              <div className="grid grid-cols-2 gap-2 pl-4">
                <label className="block">
                  <span className="block text-[10px] text-gray-500 mb-1">方位</span>
                  <DirSelect v={r2DirEff} set={setR2Dir} exclude={r1Dir} />
                </label>
                <Num k="幅員(m)" v={r2W} set={setR2W} />
              </div>
            )}
            <Check v={tokutei} set={setTokutei}>
              特定道路(幅員 15m 以上)に接続する(法 52 条 9 項)
            </Check>
            {tokutei && <Num k="特定道路からの延長 L(m)" v={tokuteiL} set={setTokuteiL} hint="敷地が接する前面道路の部分の直近の端まで(令 135 条の 18)" />}
            <Check v={corner} set={setCorner}>
              角地(特定行政庁が指定する角地。建蔽率 +10%)
            </Check>
          </div>

          <div className={box}>
            <span className={label}>建物</span>
            <label className="block">
              <span className="block text-[10px] text-gray-500 mb-1">建物の構造(建蔽率の緩和に使う)</span>
              <select value={fr} onChange={(e) => setFr(e.target.value as FireRating)} className={field}>
                {(Object.keys(FR_LABEL) as FireRating[]).map((k) => (
                  <option key={k} value={k}>
                    {FR_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Num k="道路境界線から建物まで(m)" v={roadSet} set={setRoadSet} hint="2 項道路は後退後の線から" />
              <Num k="隣地境界線から建物まで(m)" v={sideSet} set={setSideSet} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Num k="階高(m)" v={ftf} set={setFtf} />
              <Num k="1FL + パラペット等(m)" v={extra} set={setExtra} />
              <Num k="地階の数" v={basement} set={setBasement} step="1" />
            </div>
          </div>

          <div className={box}>
            <span className={label}>高さの制限</span>
            <Num k="北側の境界線までの真北方向の距離(m)" v={northOv} set={setNorthOv} placeholder={`空欄 = 敷地の形から(${f2(r.plan.set.N + (r1Dir === 'N' ? Number(r1W) || 0 : 0))})`} hint="北が道路なら道路の反対側の境界線まで" />
            {anyLow && (
              <label className="block">
                <span className="block text-[10px] text-gray-500 mb-1">絶対高さ(法 55 条 1 項・都市計画で定める)</span>
                <select value={absH} onChange={(e) => setAbsH(Number(e.target.value) as 10 | 12)} className={field}>
                  <option value={10}>10 m</option>
                  <option value={12}>12 m</option>
                </select>
              </label>
            )}
            <Num k="高度地区の最高限度(m・なければ空欄)" v={kodo} set={setKodo} hint="斜線型の高度地区は、いちばん厳しい面の値を入れる" />
            {anyNote3 && (
              <Check v={note3} set={setNote3}>
                別表第 3 備考 3 の区域(道路斜線の距離 −5m・勾配 1.5)
              </Check>
            )}
            {anySide125 && (
              <Check v={side25} set={setSide25}>
                隣地斜線 31m + 2.5 の区域(法 56 条 1 項 2 号)
              </Check>
            )}
            {anyNone && (
              <label className="block">
                <span className="block text-[10px] text-gray-500 mb-1">無指定区域の道路斜線の勾配</span>
                <select value={noneSlope} onChange={(e) => setNoneSlope(Number(e.target.value) as 1.25 | 1.5)} className={field}>
                  <option value={1.25}>1.25</option>
                  <option value={1.5}>1.5</option>
                </select>
              </label>
            )}
          </div>

          <div className={box}>
            <span className={label}>日影規制(条例で指定・目安だけ)</span>
            <select
              value={shGroup}
              onChange={(e) => {
                setShGroup(e.target.value);
                const nz = SHADOW_ZONES.find((z) => z.id === e.target.value);
                if (nz) setShPlane(String(nz.planes[0]));
                setShGo('');
              }}
              className={field}
            >
              <option value="">日影規制なし(商業・工業・工専など)</option>
              {SHADOW_ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </select>
            {sz && (
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="block text-[10px] text-gray-500 mb-1">号</span>
                  <select value={shGo} onChange={(e) => setShGo(e.target.value)} className={field}>
                    <option value="">指定なし</option>
                    {sz.rows.map((x) => (
                      <option key={x.go} value={x.go}>
                        {x.go} {x.near}h / {x.far}h
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-[10px] text-gray-500 mb-1">測定面</span>
                  <select value={shPlane} onChange={(e) => setShPlane(e.target.value)} className={field}>
                    {sz.planes.map((p) => (
                      <option key={p} value={p}>
                        {p} m
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            {sz && shGo && (
              <select
                value={city}
                onChange={(e) => {
                  const c = CITIES.find((x) => x.label === e.target.value);
                  setCity(e.target.value);
                  if (c) {
                    setLat(String(c.lat));
                    setHokkaido(!!c.hokkaido);
                  }
                }}
                className={field}
                aria-label="場所(緯度)"
              >
                {CITIES.map((c) => (
                  <option key={c.label} value={c.label}>
                    {c.label}(北緯 {c.lat}°)
                  </option>
                ))}
              </select>
            )}
            <p className="text-[10px] text-gray-400">敷地の一部だけが規制区域のときは、規制区域に落ちる影だけが対象です(令 135 条の 13)。この目安は敷地の周り全部で数えるので厳しめに出ます。</p>
          </div>
        </div>

        {/* ─── 答え ─── */}
        <div className="space-y-4">
          <div className="max-w-[520px]">
            <DtResult
              label="建てられる延べ面積の目安(容積率対象)"
              value={r.ok ? f2(r.achievable) : '未入力'}
              unit={r.ok ? 'm²' : undefined}
              text={!r.ok}
              sub={r.ok ? `${r.governing.text}。${r.governing.detail}` : '敷地の面積と間口・奥行を入れてください'}
            >
              {r.ok && (
                <>
                  <ResultRow k="地上階数 / 高さ" v={`地上 ${r.floors} 階${Number(basement) > 0 ? ` + 地下 ${Math.floor(Number(basement))} 階` : ''} · ${f2(r.height)} m`} />
                  <ResultRow k="建築面積(1 階の箱)" v={`${f2(r.plan.footprint)} m²(限度 ${f2(r.bcArea)})`} />
                  <ResultRow k="延べ面積の限度(容積率)" v={`${f2(r.farArea)} m²(${f2(r.far)}%)`} />
                  <ResultRow k="使える容積率" v={`${f2(r.usedFar)}%`} />
                </>
              )}
            </DtResult>
          </div>

          {r.warnings.length > 0 && (
            <div className="space-y-1">
              {r.warnings.map((w) => (
                <p key={w} className="text-[11px] text-[#b4402f]">
                  {w}
                </p>
              ))}
            </div>
          )}

          <div>
            <div className="yy-sec">
              <span className="yy-sec__no">001</span>
              <span className="yy-sec__title">面積</span>
              <span className="yy-sec__right">建蔽率・容積率</span>
            </div>
            <table className="w-full text-[11.5px]">
              <thead>
                <tr>
                  <th className="text-left py-1 pr-2">項目</th>
                  <th className="text-left py-1 pr-2">値</th>
                  <th className="text-left py-1">根拠</th>
                </tr>
              </thead>
              <tbody>
                {r.rows.map((x) => (
                  <tr key={x.k} className="border-b border-[#e3e1db]">
                    <td className="py-1 pr-2 align-top whitespace-nowrap">{x.k}</td>
                    <td className="py-1 pr-2 align-top tabular-nums">{x.v}</td>
                    <td className="py-1 align-top text-[10.5px] text-gray-500">{x.basis}</td>
                  </tr>
                ))}
                {r.parts.length > 1 &&
                  r.parts.map((p, i) => (
                    <tr key={i} className="border-b border-[#e3e1db] text-[10.5px] text-gray-500">
                      <td className="py-1 pr-2 align-top">
                        └ {p.zone} {f2(p.area)} m²
                      </td>
                      <td className="py-1 pr-2 align-top" colSpan={2}>
                        建蔽率 {p.bc}% → {p.bcLimit >= 100 && p.bcNote.includes('制限なし') ? '制限なし' : `${p.bcLimit}%`}
                        {p.bcNote ? `(${p.bcNote})` : ''} · 容積率 {p.farNote} → {f2(p.farLimit)}%
                      </td>
                    </tr>
                  ))}
                {r.parts.length === 1 && r.parts[0].bcNote && (
                  <tr className="border-b border-[#e3e1db] text-[10.5px] text-gray-500">
                    <td className="py-1 pr-2">└ 建蔽率の緩和</td>
                    <td className="py-1" colSpan={2}>
                      {r.parts[0].bcNote}
                    </td>
                  </tr>
                )}
                {r.deemedFire && (
                  <tr className="border-b border-[#e3e1db] text-[10.5px] text-gray-500">
                    <td className="py-1 pr-2">└ 防火のみなし</td>
                    <td className="py-1" colSpan={2}>
                      敷地の全部を{r.deemedFire}として緩和を計算(法 53 条 {r.deemedFire === '防火地域' ? '7' : '8'} 項)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div>
            <div className="yy-sec">
              <span className="yy-sec__no">002</span>
              <span className="yy-sec__title">高さと階数</span>
              <span className="yy-sec__right">
                階高 {f2(Number(ftf) || 3)} m × 階数 + {f2(Number(extra) || 0)} m · 面の位置で比べる
              </span>
            </div>
            <table className="w-full text-[11.5px]">
              <thead>
                <tr>
                  <th className="text-left py-1 pr-2">制限</th>
                  <th className="text-left py-1 pr-2">面で許される高さ</th>
                  <th className="text-right py-1 pr-2">入る階数</th>
                  <th className="text-left py-1">根拠</th>
                </tr>
              </thead>
              <tbody>
                {r.faces.map((f, i) => {
                  const c = r.constraints[i];
                  const g = c && isGov(c);
                  return (
                    <tr key={`${f.kind}-${f.dir}`} className="border-b border-[#e3e1db]" style={g ? { color: ACC } : undefined}>
                      <td className="py-1 pr-2 align-top whitespace-nowrap">
                        {g && <span className="yy-dot" style={{ background: ACC }} />}
                        {f.label}
                      </td>
                      <td className="py-1 pr-2 align-top tabular-nums">{f.formula}</td>
                      <td className="py-1 pr-2 align-top text-right tabular-nums">{c ? fl(c.floors) : ''}</td>
                      <td className="py-1 align-top text-[10.5px] text-gray-500">{f.basis}</td>
                    </tr>
                  );
                })}
                {r.constraints.slice(r.faces.length).map((c) => {
                  const g = isGov(c);
                  return (
                    <tr key={c.key} className="border-b border-[#e3e1db]" style={g ? { color: ACC } : undefined}>
                      <td className="py-1 pr-2 align-top whitespace-nowrap">
                        {g && <span className="yy-dot" style={{ background: ACC }} />}
                        {c.label}
                      </td>
                      <td className="py-1 pr-2 align-top tabular-nums">
                        {c.key === 'shadow' && r.shadow
                          ? r.shadow.ok
                            ? r.shadow.covered
                              ? `地上 ${r.floors} 階の箱で 5〜10m ${hm(r.shadow.maxNear)} / 10m 超 ${hm(r.shadow.maxFar)} · 収まる`
                              : `地上 ${r.floors} 階の箱は規制の対象外(${r.shadow.label.includes('低層') || r.shadow.group === 'none-i' ? '軒高 7m 以下・2 階以下' : '高さ 10m 以下'})`
                            : `5〜10m ${hm(r.shadow.maxNear)}(規制 ${r.shadow.near}h)/ 10m 超 ${hm(r.shadow.maxFar)}(規制 ${r.shadow.far}h)· 超える → ${r.shadow.floorsOk} 階まで`
                          : `${f2(c.height ?? NaN)} m`}
                      </td>
                      <td className="py-1 pr-2 align-top text-right tabular-nums">{fl(c.floors)}</td>
                      <td className="py-1 align-top text-[10.5px] text-gray-500">{c.basis}</td>
                    </tr>
                  );
                })}
                <tr className="border-b border-[#3b3b3b]">
                  <td className="py-1 pr-2 align-top whitespace-nowrap" style={gov === 'far' ? { color: ACC } : undefined}>
                    {gov === 'far' && <span className="yy-dot" style={{ background: ACC }} />}
                    容積率を使い切る階数
                  </td>
                  <td className="py-1 pr-2 align-top tabular-nums">
                    {r.ok ? `(${f2(r.farArea)}${Number(basement) > 0 ? ` − 地階 ${Math.floor(Number(basement))} × ${f2(r.plan.footprint)}` : ''})÷ ${f2(r.plan.footprint)} → 切り上げ` : '—'}
                  </td>
                  <td className="py-1 pr-2 align-top text-right tabular-nums">{r.ok ? `${r.floorsNeed} 階` : ''}</td>
                  <td className="py-1 align-top text-[10.5px] text-gray-500">法 52 条</td>
                </tr>
              </tbody>
            </table>
            {multi && <p className="yy-dt-note text-[10.5px] text-gray-500 mt-1">敷地が 2 以上の地域にわたるので、隣地斜線・北側斜線・絶対高さは建物がかかる地域のうち厳しい方で見ています。道路斜線は前面道路に接する部分の地域(令 130 条の 11)。</p>}
          </div>

          <div>
            <div className="yy-sec">
              <span className="yy-sec__no">003</span>
              <span className="yy-sec__title">平面</span>
              <span className="yy-sec__right">真北が上 · 東西南北に正対した長方形で近似 · 差し色 = 効いている面</span>
            </div>
            <Plan r={r} v={v} govIdx={govIdx} />
          </div>

          <div>
            <div className="yy-sec">
              <span className="yy-sec__no">004</span>
              <span className="yy-sec__title">見ていないもの</span>
            </div>
            <ul className="text-[10.5px] text-gray-500 leading-relaxed list-none space-y-0.5">
              {NOT_CHECKED.map((x) => (
                <li key={x} className="border-b border-[#e3e1db] py-0.5">
                  {x}
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-gray-400 leading-relaxed mt-2">
              ※ 建築基準法 第 42 条 2 項・52 条・53 条・55 条・56 条・56 条の 2・58 条、施行令 2 条・130 条の 11・135 条の 18 による目安です(e-Gov の現行本文で確認)。建物は 1 つの直方体で、上階のセットバックは見ていません。最終的な数値は特定行政庁・確認検査機関に確認してください。個別の検討は
              <Link href="/calc/building-regulations/">建蔽率・容積率</Link>・<Link href="/calc/setback-regulation/">斜線制限</Link>・<Link href="/calc/shadow-regulation/">日影規制</Link>で。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
