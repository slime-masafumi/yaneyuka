'use client';
/**
 * 電気設備 › 幹線サイズ。設計電流の許容電流と電圧降下の両方を満たす最小の太さを選ぶ。
 * 計算と表は src/lib/trunkSize.ts。2026-11-14
 */
import React, { useMemo, useState } from 'react';
import { ResultRow } from '@/components/ui/Sheet';
import DtResult from './DtResult';
import { CABLES, SYSTEMS, trunk, type Cable, type Sys } from '@/lib/trunkSize';

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

export default function TrunkSizeCalc() {
  const [sys, setSys] = useState<Sys>('3p3w');
  const [kva, setKva] = useState('30');
  const [amp, setAmp] = useState('');
  const [len, setLen] = useState('40');
  const [drop, setDrop] = useState('2');
  const [cable, setCable] = useState<Cable>('cvt-air');
  const [wires, setWires] = useState('3');
  const [temp, setTemp] = useState('40');

  const r = useMemo(
    () => trunk({ sys, kva: Number(kva), amp: Number(amp), len: Number(len), drop: Number(drop), cable, wires: Number(wires), temp: Number(temp) }),
    [sys, kva, amp, len, drop, cable, wires, temp]
  );
  const ok = Number.isFinite(r.I) && r.I > 0;

  return (
    <div className="p-4 text-[12px] text-gray-700">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="space-y-3">
          <div className={box}>
            <label className="block">
              <span className={label}>電気方式</span>
              <select value={sys} onChange={(e) => setSys(e.target.value as Sys)} className={field}>
                {(Object.keys(SYSTEMS) as Sys[]).map((k) => (
                  <option key={k} value={k}>
                    {SYSTEMS[k].label}
                  </option>
                ))}
              </select>
              <span className="block text-[10px] text-gray-400 mt-0.5">{SYSTEMS[sys].hint}</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Num k="負荷容量(kVA)" v={kva} set={setKva} step="0.5" />
              <Num k="または設計電流(A)" v={amp} set={setAmp} hint="入れるとこちらを使う" />
            </div>
          </div>
          <div className={box}>
            <span className={label}>電線と布設</span>
            <select
              value={cable}
              onChange={(e) => {
                const c = e.target.value as Cable;
                setCable(c);
                setTemp(c === 'iv' ? '30' : '40');
              }}
              className={field}
            >
              {(Object.keys(CABLES) as Cable[]).map((k) => (
                <option key={k} value={k}>
                  {CABLES[k].label}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              {cable === 'iv' && <Num k="同一管内の電線数" v={wires} set={setWires} />}
              <Num k="周囲温度(℃)" v={temp} set={setTemp} hint={cable === 'iv' ? '30℃以下は 30 として計算' : '基準 40℃'} />
            </div>
          </div>
          <div className={box}>
            <span className={label}>電圧降下</span>
            <div className="grid grid-cols-2 gap-2">
              <Num k="亘長(こう長・m)" v={len} set={setLen} />
              <Num k="許容する降下(%)" v={drop} set={setDrop} step="0.5" />
            </div>
            <p className="text-[10px] text-gray-400">幹線・分岐でそれぞれ 2% を目安に。亘長が長いときは内線規程の表で許容値が大きくなります。</p>
          </div>
        </div>

        <div className="space-y-3">
          {ok ? (
            <>
              <div className="flex-1 min-w-[260px] max-w-[420px]">
                <DtResult
                  label="選ぶ太さ(許容電流と電圧降下の両方を満たす最小)"
                  value={r.pick ? r.pick.size.label : '表の範囲外'}
                  text
                  ng={!r.pick}
                  sub={`設計電流 ${r.I.toFixed(1)} A`}
                >
                  {r.pick && <ResultRow k="許容電流" v={`${r.pick.amp} A(${CABLES[cable].label})`} />}
                  {r.pick && <ResultRow k="電圧降下" v={`${r.pick.e.toFixed(2)} V · ${r.pick.pct.toFixed(2)} %(${r.base}V に対して)`} />}
                  <ResultRow k="式" v={`e = ${SYSTEMS[sys].k} × L × I ÷ (1000 × A)`} />
                </DtResult>
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-gray-500">
                    <th className="text-left px-2 py-1 font-normal">太さ</th>
                    <th className="px-2 py-1 font-normal text-right">許容電流 A</th>
                    <th className="px-2 py-1 font-normal text-right">電圧降下 V</th>
                    <th className="px-2 py-1 font-normal text-right">降下率 %</th>
                    <th className="px-2 py-1 font-normal">判定</th>
                  </tr>
                </thead>
                <tbody>
                  {r.rows.map((row) => {
                    const pick = r.pick?.size.label === row.size.label;
                    return (
                      <tr key={row.size.label} className={`border-t ${pick ? 'bg-[#eef3f1] font-bold' : ''}`}>
                        <td className="px-2 py-1">{row.size.label}</td>
                        <td className={`px-2 py-1 text-right tabular-nums ${row.okAmp ? '' : 'text-red-700'}`}>{row.amp}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{row.e.toFixed(2)}</td>
                        <td className={`px-2 py-1 text-right tabular-nums ${row.okDrop ? '' : 'text-red-700'}`}>{row.pct.toFixed(2)}</td>
                        <td className="px-2 py-1">{row.okAmp && row.okDrop ? '可' : !row.okAmp ? '電流不足' : '降下超過'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          ) : (
            <p className="text-[11px] text-gray-500">負荷容量か設計電流を入れると選びます。</p>
          )}
          <p className="text-[10px] text-gray-400 leading-relaxed">
            ※ 許容電流: IV は電気設備の技術基準の解釈 第 146 条(146-1・146-3・146-4 表)、CVT は JCS 0168-2(周囲 40℃・導体 90℃・1 条布設。SWCC・矢崎の技術資料で照合)。多条布設の低減(気中で 2 条 0.85・3 条 0.80 など)は入れていません。
            <br />※ 電圧降下は力率とリアクタンスを見ない略算です。過電流遮断器の定格と電線の許容電流の関係(内線規程)、短絡電流に対する太さは別に確認してください。
          </p>
        </div>
      </div>
    </div>
  );
}
