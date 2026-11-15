'use client';
/**
 * 基本設計 › 斜線制限。道路斜線・隣地斜線・北側斜線・絶対高さで、建物の各面で許される高さを出す。
 * 計算は src/lib/setback.ts(建築基準法 第 55 条・第 56 条・別表第 3、令 134 条・135 条の 2〜4)。2026-11-14
 * 2026-11-16: 適用距離を「前面道路の幅員で下げた後の容積率」で引くように直した(別表第 3(ろ)欄は 52 条 1・2・7・9 項の限度)。
 *   備考 3 を 1中高・2中高では容積率 400% 以上に限った。隣地斜線 31m + 2.5 の指定、絶対高さ、高低差・公園等の緩和を足した。
 */
import React, { useMemo, useState } from 'react';
import { ResultRow } from '@/components/ui/Sheet';
import DtResult from './DtResult';
import { ZONES, absLimit, farLimit, m2, northLimit, note3Allowed, roadLimit, roadLine, side25Allowed, sideLimit, zoneOf, type SetbackIn, type ZoneId } from '@/lib/setback';

const field = 'w-full text-[12px] px-2 py-1.5';
const label = 'block text-[11px] font-bold text-gray-700 mb-1';
const box = 'bg-gray-50 p-3 border border-[#3b3b3b] space-y-2';

function Num({ k, v, set, step = '0.1', hint, min = '0' }: { k: string; v: string; set: (s: string) => void; step?: string; hint?: string; min?: string }) {
  return (
    <label className="block">
      <span className="block text-[10px] text-gray-500 mb-1">{k}</span>
      <input type="number" min={min} step={step} value={v} onChange={(e) => set(e.target.value)} className={field} />
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

/** 道路側の断面。左端 = 起点(反対側の境界線から後退距離だけ外側)。高さの 0 = 前面道路の路面の中心 */
function RoadSection({ v, depth }: { v: SetbackIn; depth: number }) {
  const r = roadLimit(v);
  const a = Math.max(0, v.roadSet);
  const park = Math.max(0, v.roadPark ?? 0);
  const face = r.startToFace;
  const base = v.roadDiff ?? 0;
  const span = Math.max(r.dist, face + depth) + 2;
  const top = Math.max(r.slope * Math.min(span, r.dist) + r.raise, (v.height || 0) + base, 10) * 1.08;
  const bottom = Math.min(0, base) - 1;
  const W = 520;
  const H = 230;
  const pad = { l: 34, r: 12, t: 12, b: 30 };
  const sx = (x: number) => pad.l + (x / span) * (W - pad.l - pad.r);
  const sy = (y: number) => H - pad.b - ((y - bottom) / (top - bottom)) * (H - pad.t - pad.b);
  const pts: string[] = [];
  for (let x = 0; x <= r.dist; x += r.dist / 80) {
    const y = roadLine(v, x);
    if (y !== null) pts.push(`${sx(x).toFixed(1)},${sy(y).toFixed(1)}`);
  }
  const yr = roadLine(v, r.dist);
  if (yr !== null) pts.push(`${sx(r.dist).toFixed(1)},${sy(yr).toFixed(1)}`);
  const bH = v.height > 0 ? v.height : 0;
  const over = r.limitAtFace !== null && bH > r.limitAtFace;
  const roadL = a + park;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[560px]" aria-label="道路斜線の断面">
      <line x1={pad.l} y1={sy(0)} x2={sx(face)} y2={sy(0)} stroke="#3b3b3b" strokeWidth={0.75} />
      <line x1={sx(face - a)} y1={sy(base)} x2={W - pad.r} y2={sy(base)} stroke="#3b3b3b" strokeWidth={0.75} />
      {/* 公園等 */}
      {park > 0 && (
        <text x={(sx(a) + sx(a + park)) / 2} y={sy(0) + 18} fontSize={10} textAnchor="middle" fill="#8a8a85">
          公園等 {park}m
        </text>
      )}
      {/* 道路 */}
      <rect x={sx(roadL)} y={sy(0)} width={sx(roadL + v.roadW) - sx(roadL)} height={6} fill="#d9d6cf" />
      <text x={(sx(roadL) + sx(roadL + v.roadW)) / 2} y={sy(0) + 18} fontSize={10} textAnchor="middle" fill="#3b3b3b">
        道路 {v.roadW}m
      </text>
      {/* 起点・境界 */}
      <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(top * 0.15)} stroke="#8a8a85" strokeWidth={0.75} strokeDasharray="3 3" />
      <text x={sx(0)} y={sy(top * 0.15) - 3} fontSize={9} fill="#8a8a85">起点</text>
      <line x1={sx(roadL + v.roadW)} y1={sy(Math.min(0, base))} x2={sx(roadL + v.roadW)} y2={sy(top * 0.1)} stroke="#3b3b3b" strokeWidth={0.75} />
      {/* 建物 */}
      {bH > 0 && <rect x={sx(face)} y={sy(base + bH)} width={sx(face + depth) - sx(face)} height={sy(base) - sy(base + bH)} fill={over ? '#f2d6d0' : '#e6e4dd'} stroke={over ? '#b4402f' : '#3b3b3b'} strokeWidth={1} />}
      {/* 制限線 */}
      <polyline points={pts.join(' ')} fill="none" stroke="#2f6f5e" strokeWidth={1.5} />
      <line x1={sx(r.dist)} y1={sy(bottom)} x2={sx(r.dist)} y2={sy(top)} stroke="#2f6f5e" strokeWidth={0.75} strokeDasharray="2 3" />
      <text x={sx(r.dist) - 3} y={pad.t + 10} fontSize={9} fill="#2f6f5e" textAnchor="end">
        適用距離 {r.dist}m
      </text>
      {/* 目盛り(道路中心から) */}
      {[0, 10, 20, 30, 40, 50].filter((y) => y < top).map((y) => (
        <g key={y}>
          <line x1={pad.l - 3} y1={sy(y)} x2={pad.l} y2={sy(y)} stroke="#8a8a85" />
          <text x={pad.l - 5} y={sy(y) + 3} fontSize={9} fill="#8a8a85" textAnchor="end">
            {y}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function SetbackCalc() {
  const [zone, setZone] = useState<ZoneId>('1r');
  const [far, setFar] = useState('300');
  const [farDirect, setFarDirect] = useState(false);
  const [roadK, setRoadK] = useState(0.4);
  const [roadW, setRoadW] = useState('6');
  const [roadSet, setRoadSet] = useState('1');
  const [sideSet, setSideSet] = useState('1');
  const [northDist, setNorthDist] = useState('4');
  const [height, setHeight] = useState('15');
  const [depth, setDepth] = useState('12');
  const [note3, setNote3] = useState(false);
  const [side25, setSide25] = useState(false);
  const [noneSlope, setNoneSlope] = useState<1.25 | 1.5>(1.25);
  const [shadowZone, setShadowZone] = useState(true);
  const [absH, setAbsH] = useState<10 | 12>(10);
  const [roadDiff, setRoadDiff] = useState('0');
  const [roadPark, setRoadPark] = useState('0');
  const [sideDiff, setSideDiff] = useState('0');
  const [sidePark, setSidePark] = useState('0');
  const [northDiff, setNorthDiff] = useState('0');
  const [northWater, setNorthWater] = useState('0');

  const z = zoneOf(zone);
  const v: SetbackIn = useMemo(
    () => ({
      zone,
      far: Number(far),
      farDirect,
      roadK,
      roadW: Number(roadW),
      roadSet: Number(roadSet),
      sideSet: Number(sideSet),
      northDist: Number(northDist),
      height: Number(height),
      note3,
      noneSlope,
      shadowZone,
      side25,
      absHeight: absH,
      roadDiff: Number(roadDiff) || 0,
      roadPark: Number(roadPark) || 0,
      sideDiff: Number(sideDiff) || 0,
      sidePark: Number(sidePark) || 0,
      northDiff: Number(northDiff) || 0,
      northWater: Number(northWater) || 0,
    }),
    [zone, far, farDirect, roadK, roadW, roadSet, sideSet, northDist, height, note3, noneSlope, shadowZone, side25, absH, roadDiff, roadPark, sideDiff, sidePark, northDiff, northWater]
  );
  const blank = !(Number(far) > 0) || !(Number(roadW) > 0);
  const fl = farLimit(v);
  const road = roadLimit(v);
  const side = sideLimit(v);
  const north = northLimit(v);
  const abs = absLimit(v);
  const H = Number(height);
  const limits = [road.limitAtFace, side?.limitAtFace ?? null, north?.limitAtFace ?? null, abs].filter((x): x is number => x !== null);
  const min = limits.length ? Math.min(...limits) : null;
  const ng = H > 0 && min !== null && H > min;
  const okText = (lim: number | null) => (lim === null || !(H > 0) ? '' : H <= lim ? ' · 収まる' : ' · 超える');
  const raiseTxt = (r: number) => (r > 0 ? ` + 高低差 ${m2(r)}` : '');

  return (
    <div className="p-4 text-[12px] text-gray-700">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="space-y-3">
          <div className={box}>
            <label className="block">
              <span className={label}>用途地域</span>
              <select
                value={zone}
                onChange={(e) => {
                  const nz = zoneOf(e.target.value);
                  setZone(nz.id);
                  setRoadK(nz.roadK[0]);
                }}
                className={field}
              >
                {ZONES.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.label}
                  </option>
                ))}
              </select>
            </label>
            <Num
              k={farDirect ? '容積率の限度(%・法 52 条 1・2・7・9 項による値)' : '容積率(%・都市計画で定めた値)'}
              v={far}
              set={setFar}
              step="10"
              hint={farDirect ? '建蔽率・容積率ツールで出した「許容容積率」をそのまま入れる' : undefined}
            />
            {!farDirect && z.roadK.length > 1 && (
              <label className="block">
                <span className="block text-[10px] text-gray-500 mb-1">前面道路の幅員による乗数(法 52 条 2 項)</span>
                <select value={roadK} onChange={(e) => setRoadK(Number(e.target.value))} className={field}>
                  {z.roadK.map((k, i) => (
                    <option key={k} value={k}>
                      {i === 0 ? `${k}` : `${k}(特定行政庁が指定する区域)`}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Check v={farDirect} set={setFarDirect}>
              容積率の限度を直接入れる(敷地が 2 以上の地域にわたる・特定道路・前面道路が 2 以上のとき)
            </Check>
            {z.id === 'none' && (
              <label className="block">
                <span className="block text-[10px] text-gray-500 mb-1">道路斜線の勾配(特定行政庁が定める)</span>
                <select value={noneSlope} onChange={(e) => setNoneSlope(Number(e.target.value) as 1.25 | 1.5)} className={field}>
                  <option value={1.25}>1.25</option>
                  <option value={1.5}>1.5</option>
                </select>
              </label>
            )}
            {z.absHeight && (
              <label className="block">
                <span className="block text-[10px] text-gray-500 mb-1">絶対高さ(都市計画で定める・法 55 条 1 項)</span>
                <select value={absH} onChange={(e) => setAbsH(Number(e.target.value) as 10 | 12)} className={field}>
                  <option value={10}>10 m</option>
                  <option value={12}>12 m</option>
                </select>
              </label>
            )}
            {z.note3 && (
              <Check v={note3 && note3Allowed(v)} set={setNote3}>
                特定行政庁が別表第 3 備考 3 の区域に指定(距離 −5m・勾配 1.5)
                {!note3Allowed(v) && <span className="block text-[10px] text-gray-400">中高層住居専用地域は容積率 400% 以上の地域に限る</span>}
              </Check>
            )}
            {z.neighbor && z.neighbor[1] === 1.25 && side25Allowed(v) && (
              <Check v={side25} set={setSide25}>
                {z.id === 'none' ? '隣地斜線を 31m + 2.5 と定めた区域(法 56 条 1 項 2 号ニ)' : '隣地斜線 31m + 2.5 の区域に特定行政庁が指定(法 56 条 1 項 2 号イ)'}
              </Check>
            )}
            {(z.id === '1mh' || z.id === '2mh') && (
              <Check v={shadowZone} set={setShadowZone}>
                日影規制の区域(条例で別表第 4 二の項の号を指定。北側斜線はかからない)
              </Check>
            )}
          </div>
          <div className={box}>
            <span className={label}>敷地と建物</span>
            <Num k="前面道路の幅員 W(m)" v={roadW} set={setRoadW} />
            <Num k="道路境界線から建物までの最小距離(後退距離 a・m)" v={roadSet} set={setRoadSet} hint="令 130 条の 12 の物置・ポーチ・低い塀などは除いて測る" />
            <Num k="隣地境界線から建物までの距離(m)" v={sideSet} set={setSideSet} />
            {north !== null && <Num k="北側の境界線までの真北方向の距離(m)" v={northDist} set={setNorthDist} hint="北が道路なら、道路の反対側の境界線まで" />}
            <div className="grid grid-cols-2 gap-2">
              <Num k="建物の高さ(地盤面から・m)" v={height} set={setHeight} />
              <Num k="建物の奥行き(断面図用・m)" v={depth} set={setDepth} />
            </div>
          </div>
          <details className={box}>
            <summary className="text-[11px] font-bold text-gray-700 cursor-pointer">高低差・公園等の緩和(令 134 条・135 条の 2〜4)</summary>
            <Num k="敷地の地盤面 − 前面道路の路面の中心(m)" v={roadDiff} set={setRoadDiff} min="-50" hint="敷地が高ければ正。1m 以上高いと道路を(差 − 1)/ 2 高くみなす" />
            <Num k="前面道路の反対側の公園・広場・水面等の幅(m)" v={roadPark} set={setRoadPark} />
            {z.neighbor && <Num k="隣地の地盤面 − 敷地の地盤面(m)" v={sideDiff} set={setSideDiff} min="-50" hint="隣地が 1m 以上高いと敷地を(差 − 1)/ 2 高くみなす" />}
            {z.neighbor && <Num k="隣地側の公園(都市公園を除く)・広場・水面等の幅(m)" v={sidePark} set={setSidePark} />}
            {z.north !== null && <Num k="北側の隣地の地盤面 − 敷地の地盤面(m)" v={northDiff} set={setNorthDiff} min="-50" />}
            {z.north !== null && <Num k="北側の水面・線路敷等の幅(m)" v={northWater} set={setNorthWater} />}
            <p className="text-[10px] text-gray-400">特定行政庁が規則で別の高さを定めている場合(令 135 条の 2 第 2 項ほか)はそちらが優先します。</p>
          </details>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-4 items-start">
            <div className="flex-1 min-w-[260px] max-w-[460px]">
              <DtResult
                label="建物の面で許される高さ(地盤面から・いちばん厳しいもの)"
                value={blank ? '未入力' : min !== null ? m2(min) : 'かからない'}
                unit={!blank && min !== null ? 'm' : undefined}
                ng={ng && !blank}
                text={blank || min === null}
                sub={blank ? '容積率と前面道路の幅員を入れてください' : H > 0 && min !== null ? `建物の高さ ${H} m は${ng ? '超えています' : '収まっています'}(面の位置で比べた目安。天空率は見ていません)` : undefined}
              >
                <ResultRow
                  k={`適用距離に使う容積率(別表第 3(ろ))`}
                  v={farDirect ? `${m2(fl.far)}%(直接入力)` : fl.byRoad !== null ? `min(${Number(far)}, ${Number(roadW)} × ${roadK} × 100 = ${m2(fl.byRoad)}) = ${m2(fl.far)}%` : `${m2(fl.far)}%`}
                />
                <ResultRow
                  k={`道路斜線(別表第 3 ${z.roadItem}の項${road.note3Applied ? '・備考 3' : ''}・勾配 ${road.slope}・適用距離 ${road.dist}m)`}
                  v={
                    road.limitAtFace !== null
                      ? `${road.slope} × ${m2(road.startToFace)}${raiseTxt(road.raise)}${v.roadDiff ? ` − ${m2(v.roadDiff)}` : ''} = ${m2(road.limitAtFace)} m${okText(road.limitAtFace)}`
                      : `面が適用距離の外(かからない)`
                  }
                />
                <ResultRow k="隣地斜線" v={side ? `${side.rise} + ${side.slope} × (${m2(side.dist)} × 2)${raiseTxt(side.raise)} = ${m2(side.limitAtFace)} m${okText(side.limitAtFace)}` : 'かからない'} />
                <ResultRow k="北側斜線" v={north ? `${north.rise} + 1.25 × ${m2(north.dist)}${raiseTxt(north.raise)} = ${m2(north.limitAtFace)} m${okText(north.limitAtFace)}` : 'かからない'} />
                {abs !== null && <ResultRow k="絶対高さ(法 55 条)" v={`${abs} m${okText(abs)}`} />}
                {road.slope15From !== null && <ResultRow k="道路斜線 1.5 の区域(56 条 3 項)" v={`起点から ${m2(road.slope15From)} m 以上の部分`} />}
              </DtResult>
            </div>
          </div>

          <div>
            <div className="yy-sec">
              <span className="yy-sec__title">道路側の断面</span>
              <span className="yy-sec__right">高さ 0 = 前面道路の路面の中心 · 起点 = 道路の反対側の境界線から後退距離 {m2(Math.max(0, Number(roadSet)))} m 外側</span>
            </div>
            <RoadSection v={v} depth={Number(depth) || 10} />
          </div>

          <p className="text-[10px] text-gray-400 leading-relaxed">
            ※ 建築基準法 第 55 条・第 56 条・別表第 3、施行令 134 条・135 条の 2〜4 による目安です(e-Gov の現行本文で確認)。道路斜線の高さは前面道路の路面の中心から、隣地・北側斜線と絶対高さは地盤面からです。結果は地盤面からの高さにそろえています。
            <br />※ 隣地斜線は、立上り(20m または 31m)を超える部分について、その部分から隣地境界線までの距離を加える緩和を入れています(面の位置で計算)。建物の上部をセットバックした形は、面ごとに距離を入れ直してください。
            <br />※ 入っていないもの: 2 以上の前面道路(令 132 条)、天空率(56 条 7 項。斜線を超えても天空率で適合させられることがあります)、高度地区・地区計画・条例の高さ制限、塔屋等の高さの不算入(令 2 条 1 項 6 号)。最終的な判定は申請先と確認してください。
          </p>
        </div>
      </div>
    </div>
  );
}
