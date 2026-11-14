'use client';
/**
 * 電気設備 › 電気容量計算。電灯・コンセントの負荷を内線規程の標準負荷で想定し、動力と合わせて
 * 最大需要電力・受電の区分・変圧器の容量の目安を出す。計算は src/lib/elecCapacity.ts。2026-11-14
 */
import React, { useMemo, useState } from 'react';
import { ResultRow } from '@/components/ui/Sheet';
import DtResult from './DtResult';
import { PART_LOAD, STD_LOAD, capacity } from '@/lib/elecCapacity';

const field = 'w-full text-[12px] px-2 py-1.5';
const label = 'block text-[11px] font-bold text-gray-700 mb-1';
const box = 'bg-gray-50 p-3 border border-[#3b3b3b] space-y-2';

function Num({ k, v, set, step = '1', hint }: { k: string; v: string; set: (s: string) => void; step?: string; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-[10px] text-gray-500 mb-1">{k}</span>
      <input type="number" min="0" step={step} value={v} onChange={(e) => set(e.target.value)} className={field} />
      {hint && <span className="block text-[10px] text-gray-400 mt-0.5">{hint}</span>}
    </label>
  );
}

const f1 = (n: number) => n.toLocaleString('ja-JP', { maximumFractionDigits: 1 });

export default function ElecCapacityCalc() {
  const [use, setUse] = useState('office');
  const [area, setArea] = useState('1200');
  const [partArea, setPartArea] = useState('200');
  const [partUse, setPartUse] = useState('corridor');
  const [dwellings, setDwellings] = useState('0');
  const [perDwelling, setPerDwelling] = useState('1000');
  const [showWindowM, setShowWindowM] = useState('0');
  const [extraVa, setExtraVa] = useState('0');
  const [lightDf, setLightDf] = useState('0.7');
  const [powerKw, setPowerKw] = useState('60');
  const [powerDf, setPowerDf] = useState('0.8');
  const [pf, setPf] = useState('0.8');
  const house = use === 'house';

  const r = useMemo(
    () =>
      capacity({
        use,
        area: Number(area),
        partArea: Number(partArea),
        partUse,
        dwellings: Number(dwellings),
        perDwelling: Number(perDwelling),
        showWindowM: Number(showWindowM),
        extraVa: Number(extraVa),
        lightDf: Number(lightDf),
        powerKw: Number(powerKw),
        powerDf: Number(powerDf),
        pf: Number(pf),
      }),
    [use, area, partArea, partUse, dwellings, perDwelling, showWindowM, extraVa, lightDf, powerKw, powerDf, pf]
  );

  return (
    <div className="p-4 text-[12px] text-gray-700">
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
        <div className="space-y-3">
          <div className={box}>
            <span className={label}>電灯・コンセント(内線規程 3605 節)</span>
            <select value={use} onChange={(e) => setUse(e.target.value)} className={field}>
              {STD_LOAD.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}({s.va} VA/m²)
                </option>
              ))}
            </select>
            <Num k="延べ床面積(m²)" v={area} set={setArea} step="10" />
            {house ? (
              <div className="grid grid-cols-2 gap-2">
                <Num k="戸数" v={dwellings} set={setDwellings} />
                <Num k="1 戸あたりの加算(VA)" v={perDwelling} set={setPerDwelling} step="100" hint="500〜1,000" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Num k="うち部分的な負荷の床面積(m²)" v={partArea} set={setPartArea} step="10" />
                <label className="block">
                  <span className="block text-[10px] text-gray-500 mb-1">その部分</span>
                  <select value={partUse} onChange={(e) => setPartUse(e.target.value)} className={field}>
                    {PART_LOAD.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}({s.va})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Num k="ショーウィンドーの間口(m)" v={showWindowM} set={setShowWindowM} step="0.5" hint="1m につき 300VA" />
              <Num k="その他の加算(VA)" v={extraVa} set={setExtraVa} step="100" hint="広告灯・舞台照明など実際の値" />
            </div>
            <Num k="需要率(電灯・コンセント)" v={lightDf} set={setLightDf} step="0.05" />
          </div>
          <div className={box}>
            <span className={label}>動力(空調・給排水ポンプ・EV など)</span>
            <div className="grid grid-cols-3 gap-2">
              <Num k="設備容量(kW)" v={powerKw} set={setPowerKw} />
              <Num k="需要率" v={powerDf} set={setPowerDf} step="0.05" />
              <Num k="力率" v={pf} set={setPf} step="0.05" />
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              需要率の参考(建築設備設計基準の曲線を読み取った解説資料。一次資料は未確認): 照明 1.0〜0.68 / コンセント 0.55〜0.27 / 空調 1.0〜0.75 / 冷凍機 1.0〜0.94 / 衛生 0.21 / EV 1.0
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex-1 min-w-[260px] max-w-[420px]">
            <DtResult label="最大需要電力(契約電力の目安)" value={f1(r.totalKw)} unit="kW" sub={`受電の区分: ${r.receive.label}(${r.receive.volt})`}>
              <ResultRow k="電灯・コンセントの設備容量" v={`${f1(r.lightVa / 1000)} kVA(${r.a} VA/m² ほか)`} />
              <ResultRow k="電灯・コンセントの最大需要" v={`${f1(r.lightMax)} kW`} />
              <ResultRow k="動力の最大需要" v={`${f1(r.powerMax)} kW`} />
              {r.receive.label !== '低圧' && (
                <>
                  <ResultRow k="変圧器(単相・電灯)" v={r.tr1 ? `${r.tr1} kVA(需要 ${f1(r.lightKva)} kVA)` : r.tr1 === 0 ? '—' : '標準容量の範囲外'} />
                  <ResultRow k="変圧器(三相・動力)" v={r.tr3 ? `${r.tr3} kVA(需要 ${f1(r.powerKva)} kVA)` : r.tr3 === 0 ? '—' : '標準容量の範囲外'} />
                </>
              )}
            </DtResult>
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            ※ 電灯・コンセントの標準負荷は内線規程(JEAC 8001-2022)3605 節の値です。原本は有料のため、解説資料 2 つで値の一致を確かめています。
            <br />※ 受電の区分は東京電力パワーグリッドの託送供給等約款(2024-10-01 実施)の目安です。電灯と動力を合わせて判定します。地域の電力会社の約款と、50kW 以上を低圧で受ける例外の可否を確かめてください。
            <br />※ 変圧器は JIS C 4304 の標準容量の並びから、需要以上の最小を選んでいます(2024 年改正版の並びは未確認)。将来の増設・起動電流・高調波は見ていません。
          </p>
        </div>
      </div>
    </div>
  );
}
