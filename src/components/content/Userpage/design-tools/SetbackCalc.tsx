'use client';
/**
 * 基本設計 › 斜線制限。道路斜線・隣地斜線・北側斜線で、建物の各面で許される高さを出す。
 * 計算は src/lib/setback.ts(建築基準法 第 56 条・別表第 3)。2026-11-14
 */
import React, { useMemo, useState } from 'react';
import { ResultRow } from '@/components/ui/Sheet';
import DtResult from './DtResult';
import { ZONES, m2, northLimit, roadLimit, roadLine, sideLimit, zoneOf, type SetbackIn, type ZoneId } from '@/lib/setback';

const field = 'w-full text-[12px] px-2 py-1.5';
const label = 'block text-[11px] font-bold text-gray-700 mb-1';
const box = 'bg-gray-50 p-3 border border-[#3b3b3b] space-y-2';

function Num({ k, v, set, step = '0.1', hint }: { k: string; v: string; set: (s: string) => void; step?: string; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-[10px] text-gray-500 mb-1">{k}</span>
      <input type="number" min="0" step={step} value={v} onChange={(e) => set(e.target.value)} className={field} />
      {hint && <span className="block text-[10px] text-gray-400 mt-0.5">{hint}</span>}
    </label>
  );
}

/** 道路側の断面。左端 = 起点(反対側の境界線から後退距離だけ外側) */
function RoadSection({ v, depth }: { v: SetbackIn; depth: number }) {
  const r = roadLimit(v);
  const a = Math.max(0, v.roadSet);
  const face = v.roadW + 2 * a;
  const span = Math.max(r.dist, face + depth) + 2;
  const top = Math.max(r.slope * Math.min(span, r.dist), v.height || 0, 10) * 1.08;
  const W = 520;
  const H = 230;
  const pad = { l: 34, r: 12, t: 12, b: 30 };
  const sx = (x: number) => pad.l + (x / span) * (W - pad.l - pad.r);
  const sy = (y: number) => H - pad.b - (y / top) * (H - pad.t - pad.b);
  const pts: string[] = [];
  for (let x = 0; x <= r.dist; x += r.dist / 80) {
    const y = roadLine(v, x);
    if (y !== null) pts.push(`${sx(x).toFixed(1)},${sy(y).toFixed(1)}`);
  }
  const yr = roadLine(v, r.dist);
  if (yr !== null) pts.push(`${sx(r.dist).toFixed(1)},${sy(yr).toFixed(1)}`);
  const bH = v.height > 0 ? v.height : 0;
  const over = r.limitAtFace !== null && bH > r.limitAtFace;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[560px]" aria-label="道路斜線の断面">
      <line x1={pad.l} y1={sy(0)} x2={W - pad.r} y2={sy(0)} stroke="#3b3b3b" strokeWidth={0.75} />
      {/* 道路 */}
      <rect x={sx(a)} y={sy(0)} width={sx(a + v.roadW) - sx(a)} height={6} fill="#d9d6cf" />
      <text x={(sx(a) + sx(a + v.roadW)) / 2} y={sy(0) + 18} fontSize={10} textAnchor="middle" fill="#3b3b3b">
        道路 {v.roadW}m
      </text>
      {/* 起点・境界 */}
      <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(top * 0.15)} stroke="#8a8a85" strokeWidth={0.75} strokeDasharray="3 3" />
      <text x={sx(0)} y={sy(top * 0.15) - 3} fontSize={9} fill="#8a8a85">起点</text>
      <line x1={sx(a + v.roadW)} y1={sy(0)} x2={sx(a + v.roadW)} y2={sy(top * 0.1)} stroke="#3b3b3b" strokeWidth={0.75} />
      {/* 建物 */}
      {bH > 0 && <rect x={sx(face)} y={sy(bH)} width={sx(face + depth) - sx(face)} height={sy(0) - sy(bH)} fill={over ? '#f2d6d0' : '#e6e4dd'} stroke={over ? '#b4402f' : '#3b3b3b'} strokeWidth={1} />}
      {/* 制限線 */}
      <polyline points={pts.join(' ')} fill="none" stroke="#2f6f5e" strokeWidth={1.5} />
      <line x1={sx(r.dist)} y1={sy(0)} x2={sx(r.dist)} y2={sy(top)} stroke="#2f6f5e" strokeWidth={0.75} strokeDasharray="2 3" />
      <text x={sx(r.dist) - 3} y={pad.t + 10} fontSize={9} fill="#2f6f5e" textAnchor="end">
        適用距離 {r.dist}m
      </text>
      {/* 目盛り */}
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
  const [roadW, setRoadW] = useState('6');
  const [roadSet, setRoadSet] = useState('1');
  const [sideSet, setSideSet] = useState('1');
  const [northDist, setNorthDist] = useState('4');
  const [height, setHeight] = useState('15');
  const [depth, setDepth] = useState('12');
  const [note3, setNote3] = useState(false);
  const [noneSlope, setNoneSlope] = useState<1.25 | 1.5>(1.25);
  const [shadowZone, setShadowZone] = useState(true);

  const z = zoneOf(zone);
  const v: SetbackIn = useMemo(
    () => ({
      zone,
      far: Number(far),
      roadW: Number(roadW),
      roadSet: Number(roadSet),
      sideSet: Number(sideSet),
      northDist: Number(northDist),
      height: Number(height),
      note3,
      noneSlope,
      shadowZone,
    }),
    [zone, far, roadW, roadSet, sideSet, northDist, height, note3, noneSlope, shadowZone]
  );
  const road = roadLimit(v);
  const side = sideLimit(v);
  const north = northLimit(v);
  const H = Number(height);
  const limits = [road.limitAtFace, side?.limitAtFace ?? null, north?.limitAtFace ?? null].filter((x): x is number => x !== null);
  const min = limits.length ? Math.min(...limits) : null;
  const ng = H > 0 && min !== null && H > min;
  const okText = (lim: number | null) => (lim === null || !(H > 0) ? '' : H <= lim ? ' · 収まる' : ' · 超える');

  return (
    <div className="p-4 text-[12px] text-gray-700">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="space-y-3">
          <div className={box}>
            <label className="block">
              <span className={label}>用途地域</span>
              <select value={zone} onChange={(e) => setZone(e.target.value as ZoneId)} className={field}>
                {ZONES.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.label}
                  </option>
                ))}
              </select>
            </label>
            <Num k="容積率の限度(%・都市計画で定めたもの)" v={far} set={setFar} step="10" />
            {z.id === 'none' && (
              <label className="block">
                <span className="block text-[10px] text-gray-500 mb-1">道路斜線の勾配(特定行政庁が定める)</span>
                <select value={noneSlope} onChange={(e) => setNoneSlope(Number(e.target.value) as 1.25 | 1.5)} className={field}>
                  <option value={1.25}>1.25</option>
                  <option value={1.5}>1.5</option>
                </select>
              </label>
            )}
            {z.note3 && (
              <label className="flex items-start gap-1 text-[11px]">
                <input type="checkbox" checked={note3} onChange={(e) => setNote3(e.target.checked)} className="mt-0.5" />
                <span>特定行政庁が別表第 3 備考 3 の区域に指定(距離 −5m・勾配 1.5)</span>
              </label>
            )}
            {(z.id === '1mh' || z.id === '2mh') && (
              <label className="flex items-start gap-1 text-[11px]">
                <input type="checkbox" checked={shadowZone} onChange={(e) => setShadowZone(e.target.checked)} className="mt-0.5" />
                <span>日影規制の区域(条例で別表第 4 二の項の号を指定。北側斜線はかからない)</span>
              </label>
            )}
          </div>
          <div className={box}>
            <span className={label}>敷地と建物</span>
            <Num k="前面道路の幅員 W(m)" v={roadW} set={setRoadW} />
            <Num k="道路境界線から建物までの最小距離(後退距離 a・m)" v={roadSet} set={setRoadSet} hint="令 130 条の 12 の物置・ポーチ・低い塀などは除いて測る" />
            <Num k="隣地境界線から建物までの距離(m)" v={sideSet} set={setSideSet} />
            <Num k="北側の境界線までの真北方向の距離(m)" v={northDist} set={setNorthDist} hint="北が道路なら、道路の反対側の境界線まで" />
            <div className="grid grid-cols-2 gap-2">
              <Num k="建物の高さ(m)" v={height} set={setHeight} />
              <Num k="建物の奥行き(断面図用・m)" v={depth} set={setDepth} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-4 items-start">
            <div className="flex-1 min-w-[260px] max-w-[420px]">
              <DtResult
                label="建物の面で許される高さ(いちばん厳しい斜線)"
                value={min !== null ? m2(min) : 'かからない'}
                unit={min !== null ? 'm' : undefined}
                ng={ng}
                text={min === null}
                sub={H > 0 && min !== null ? `建物の高さ ${H} m は${ng ? '超えています' : '収まっています'}(面の位置で比べた目安)` : undefined}
              >
                <ResultRow
                  k={`道路斜線(別表第 3 ${z.roadItem}の項・勾配 ${road.slope}・適用距離 ${road.dist}m)`}
                  v={road.limitAtFace !== null ? `${m2(road.limitAtFace)} m${okText(road.limitAtFace)}` : `面が適用距離の外(かからない)`}
                />
                <ResultRow k="隣地斜線" v={side ? `${side.rise} + ${side.slope} × (${m2(Number(sideSet))} × 2) = ${m2(side.limitAtFace)} m${okText(side.limitAtFace)}` : 'かからない'} />
                <ResultRow k="北側斜線" v={north ? `${north.rise} + 1.25 × ${m2(Number(northDist))} = ${m2(north.limitAtFace)} m${okText(north.limitAtFace)}` : 'かからない'} />
                {road.slope15From !== null && <ResultRow k="道路斜線 1.5 の区域(56 条 3 項)" v={`起点から ${m2(road.slope15From)} m 以上の部分`} />}
              </DtResult>
            </div>
          </div>

          <div>
            <div className="yy-sec">
              <span className="yy-sec__title">道路側の断面</span>
              <span className="yy-sec__right">起点 = 道路の反対側の境界線から後退距離 {m2(Math.max(0, Number(roadSet)))} m 外側</span>
            </div>
            <RoadSection v={v} depth={Number(depth) || 10} />
          </div>

          <p className="text-[10px] text-gray-400 leading-relaxed">
            ※ 建築基準法 第 56 条・別表第 3 による目安です(e-Gov、2026-05-27 施行版で確認)。高さは前面道路の路面の中心(道路斜線)・地盤面(隣地・北側)からの高さです。
            <br />※ 隣地斜線は、立上り(20m または 31m)を超える部分について、その部分から隣地境界線までの距離を加える緩和を入れています(面の位置で計算)。第一種・第二種低層住居専用地域と田園住居地域は隣地斜線の代わりに絶対高さ(10m または 12m、法 55 条)がかかります。
            <br />※ 2 以上の前面道路・公園や水面・高低差・天空率(56 条 7 項)の緩和は入っていません。最終的な判定は申請先と確認してください。
          </p>
        </div>
      </div>
    </div>
  );
}
