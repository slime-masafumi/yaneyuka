'use client';
/**
 * 構造設計 › 荷重計算。床・屋根の 1 m² あたりの荷重を、固定(令 84)+ 積載(令 85)+ 積雪(令 86)で積み上げる。
 * 計算と表は src/lib/loadCalc.ts。2026-11-14
 */
import React, { useMemo, useState } from 'react';
import { FiPlus, FiX } from 'react-icons/fi';
import { ResultRow } from '@/components/ui/Sheet';
import DtResult from './DtResult';
import { FIXED, FIXED_GROUPS, LIVE, PRESETS, calcLoad, fixedOf, kN, layerWeight, N, type Layer } from '@/lib/loadCalc';

const field = 'w-full text-[12px] px-2 py-1.5';
const label = 'block text-[11px] font-bold text-gray-700 mb-1';
const box = 'bg-gray-50 p-3 border border-[#3b3b3b] space-y-2';

export default function LoadCalc() {
  const [preset, setPreset] = useState('rc-office');
  const [layers, setLayers] = useState<Layer[]>(PRESETS.find((p) => p.id === 'rc-office')!.layers);
  const [extra, setExtra] = useState('0');
  const [live, setLive] = useState('office');
  const [floors, setFloors] = useState('1');
  const [snowCm, setSnowCm] = useState('0');
  const [snowUnit, setSnowUnit] = useState('20');
  const [roofDeg, setRoofDeg] = useState('0');
  const [snowStop, setSnowStop] = useState(false);
  const [area, setArea] = useState('');

  const r = useMemo(
    () =>
      calcLoad({
        layers,
        extra: Number(extra),
        live,
        floors: Number(floors),
        snowCm: Number(snowCm),
        snowUnit: Number(snowUnit),
        roofDeg: Number(roofDeg),
        snowStop,
        area: Number(area),
      }),
    [layers, extra, live, floors, snowCm, snowUnit, roofDeg, snowStop, area]
  );
  const A = Number(area);
  const setLayer = (i: number, patch: Partial<Layer>) => setLayers((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const hasOutside = layers.some((l) => fixedOf(l.id)?.outside);

  return (
    <div className="p-4 text-[12px] text-gray-700">
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
        {/* 条件 */}
        <div className="space-y-3">
          <div className={box}>
            <span className={label}>よく使う構成から始める</span>
            <select
              value={preset}
              onChange={(e) => {
                const p = PRESETS.find((x) => x.id === e.target.value);
                setPreset(e.target.value);
                if (p) {
                  setLayers(p.layers);
                  setLive(p.live);
                }
              }}
              className={field}
            >
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
              <option value="">(自分で組む)</option>
            </select>
          </div>

          <div className={box}>
            <span className={label}>積載荷重の室(令 85 条)</span>
            <select value={live} onChange={(e) => setLive(e.target.value)} className={field}>
              {LIVE.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
            {r.live.note && <p className="text-[10px] text-gray-500">{r.live.note}</p>}
            <label className="block">
              <span className="block text-[10px] text-gray-500 mb-1">柱・基礎が支える床の数(圧縮力の低減。令 85 条第 2 項)</span>
              <input type="number" min="1" step="1" value={floors} onChange={(e) => setFloors(e.target.value)} className={field} />
            </label>
            {r.live.noReduce && Number(floors) > 1 && <p className="text-[10px] text-red-700">(五)の室は低減できません。</p>}
          </div>

          <div className={box}>
            <span className={label}>積雪(令 86 条。屋根のとき)</span>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="block text-[10px] text-gray-500 mb-1">垂直積雪量(cm)</span>
                <input type="number" min="0" step="10" value={snowCm} onChange={(e) => setSnowCm(e.target.value)} className={field} />
              </label>
              <label className="block">
                <span className="block text-[10px] text-gray-500 mb-1">単位荷重(N/m²/cm)</span>
                <input type="number" min="0" step="1" value={snowUnit} onChange={(e) => setSnowUnit(e.target.value)} className={field} />
              </label>
              <label className="block">
                <span className="block text-[10px] text-gray-500 mb-1">屋根勾配 β(°)</span>
                <input type="number" min="0" max="90" step="1" value={roofDeg} onChange={(e) => setRoofDeg(e.target.value)} className={field} />
              </label>
              <label className="flex items-end gap-1 pb-2 text-[11px]">
                <input type="checkbox" checked={snowStop} onChange={(e) => setSnowStop(e.target.checked)} /> 雪止めあり
              </label>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              単位荷重は積雪 1cm ごとに 20 N/m² 以上。多雪区域と垂直積雪量は特定行政庁の規則で決まります。雪下ろしの慣習がある地方は 1m まで減らせます(令 86 条第 6 項。表示が要る)。
            </p>
          </div>

          <div className={box}>
            <label className="block">
              <span className={label}>床面積(m²・任意)</span>
              <input type="number" min="0" step="0.1" value={area} onChange={(e) => setArea(e.target.value)} className={field} placeholder="入れると合計の kN も出ます" />
            </label>
          </div>
        </div>

        {/* 固定荷重の構成と答え */}
        <div className="space-y-3">
          <div>
            <div className="yy-sec">
              <span className="yy-sec__title">固定荷重の構成(令 84 条)</span>
              <span className="yy-sec__right">{N(r.dl)} N/m²</span>
            </div>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left px-2 py-1 font-normal">部分・種別</th>
                  <th className="px-2 py-1 font-normal w-[80px]">厚さ cm</th>
                  <th className="px-2 py-1 font-normal w-[90px] text-right">N/m²</th>
                  <th className="w-[28px]" />
                </tr>
              </thead>
              <tbody>
                {layers.map((l, i) => {
                  const f = fixedOf(l.id);
                  return (
                    <tr key={i} className="border-t align-top">
                      <td className="px-2 py-1">
                        <select value={l.id} onChange={(e) => setLayer(i, { id: e.target.value, cm: fixedOf(e.target.value)?.perCm ? l.cm || 1 : 0 })} className="w-full text-[11px] px-1 py-1">
                          {FIXED_GROUPS.map((g) => (
                            <optgroup key={g} label={g}>
                              {FIXED.filter((x) => x.group === g).map((x) => (
                                <option key={x.id} value={x.id}>
                                  {x.label}
                                  {x.perCm ? `(${x.w}/cm)` : `(${x.w})`}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        {f?.note && <span className={`block text-[10px] mt-0.5 ${f.outside ? 'text-amber-700' : 'text-gray-500'}`}>{f.note}</span>}
                      </td>
                      <td className="px-2 py-1">
                        {f?.perCm ? (
                          <input type="number" min="0" step="0.5" value={l.cm} onChange={(e) => setLayer(i, { cm: Number(e.target.value) })} className="w-full text-[11px] px-1 py-1 text-right" />
                        ) : (
                          <span className="block text-center text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">{N(layerWeight(l))}</td>
                      <td className="px-1">
                        <button type="button" onClick={() => setLayers((ls) => ls.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600" title="この行を外す">
                          <FiX />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t">
                  <td className="px-2 py-1">その他(設備・間仕切りなど。実況)</td>
                  <td />
                  <td className="px-2 py-1">
                    <input type="number" min="0" step="50" value={extra} onChange={(e) => setExtra(e.target.value)} className="w-full text-[11px] px-1 py-1 text-right" />
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
            <button type="button" onClick={() => setLayers((ls) => [...ls, { id: 'board-ceil', cm: 0 }])} className="yy-dt-link mt-2 flex items-center gap-1">
              <FiPlus /> 行を足す
            </button>
          </div>

          <div className="flex flex-wrap gap-4 items-start">
            <div className="flex-1 min-w-[260px] max-w-[400px]">
              <DtResult label="床の構造計算用(固定 + 積載(い))" value={kN(r.floorUse)} unit="kN/m²" sub={A > 0 ? `床面積 ${A} m² で ${kN(r.floorUse * A, 1)} kN` : `${N(r.floorUse)} N/m²`}>
                <ResultRow k="固定荷重 DL" v={`${N(r.dl)} N/m²`} />
                <ResultRow k="大ばり・柱・基礎用(固定 + 積載(ろ))" v={`${kN(r.frameUse)} kN/m²`} />
                {r.rf < 1 && <ResultRow k={`柱・基礎の圧縮力用(低減 ${r.rf})`} v={`${kN(r.colUse)} kN/m²`} />}
                <ResultRow k="地震力用(固定 + 積載(は))" v={`${kN(r.seismicUse)} kN/m²`} />
                {r.snow > 0 && <ResultRow k={`積雪荷重(μb = ${r.mu.toFixed(3)})`} v={`${kN(r.snow)} kN/m²(水平投影面)`} />}
                {r.snow > 0 && <ResultRow k="固定 + 積雪(短期・屋根)" v={`${kN(r.dl + r.snow)} kN/m²`} />}
              </DtResult>
            </div>
            <table className="text-[11px] min-w-[220px]">
              <caption className="text-left text-[10px] text-gray-500 pb-1">積載荷重 · {r.live.label}</caption>
              <tbody>
                <tr className="border-t"><td className="px-2 py-1">(い)床の構造計算</td><td className="px-2 py-1 text-right tabular-nums">{N(r.live.floor)}</td></tr>
                <tr className="border-t"><td className="px-2 py-1">(ろ)大ばり・柱・基礎</td><td className="px-2 py-1 text-right tabular-nums">{N(r.live.frame)}</td></tr>
                <tr className="border-t"><td className="px-2 py-1">(は)地震力</td><td className="px-2 py-1 text-right tabular-nums">{N(r.live.seismic)}</td></tr>
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-gray-400 leading-relaxed">
            ※ 固定荷重・積載荷重・積雪荷重は建築基準法施行令 第 84〜86 条の表の値です(e-Gov、2026-11-01 施行版で確認)。表に無い部分は実況に応じて計算します。
            {hasOutside && ' 黄色の注記の行(スラブ本体など)は令 84 条の表に無い慣用値です。'}
            <br />※ 屋根の固定荷重は「屋根面につき」の値です。勾配がある屋根を水平投影で使うときは ÷ cos(勾配)をしてください。積雪荷重は水平投影面積あたりです。
            <br />※ 風圧力・地震力・特殊な荷重(機械・倉庫の実況など)は含みません。構造計算は建築士の判断で行ってください。
          </p>
        </div>
      </div>
    </div>
  );
}
