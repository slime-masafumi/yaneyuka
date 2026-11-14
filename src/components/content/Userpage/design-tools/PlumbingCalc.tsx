'use client';
/**
 * 衛生設備 › 給排水計算。給水は負荷単位 → 同時使用流量 → 必要内径、排水は負荷単位 → 管径と最小勾配。
 * 計算と表は src/lib/plumbing.ts。2026-11-14
 */
import React, { useMemo, useState } from 'react';
import { FiDroplet, FiArrowDownCircle } from 'react-icons/fi';
import { ResultRow } from '@/components/ui/Sheet';
import DtResult from './DtResult';
import { DRAIN, DRAIN_CAP, SUPPLY, drainSize, flowOf, innerDia, minSlope } from '@/lib/plumbing';

const box = 'bg-gray-50 p-3 border border-[#3b3b3b] space-y-2';
const label = 'block text-[11px] font-bold text-gray-700 mb-1';
const f1 = (n: number) => n.toLocaleString('ja-JP', { maximumFractionDigits: 1 });

function Count({ v, set }: { v: number; set: (n: number) => void }) {
  return <input type="number" min="0" step="1" value={v || ''} placeholder="0" onChange={(e) => set(Math.max(0, Number(e.target.value)))} className="w-[64px] text-[11px] px-1 py-1 text-right" />;
}

function Supply() {
  const [pub, setPub] = useState(true);
  const [hot, setHot] = useState(false);
  const [n, setN] = useState<Record<string, number>>({ 'wc-valve': 4, 'ur-valve': 3, lav: 4, 'mop-sink': 1 });
  const [vel, setVel] = useState('2.0');
  const rows = SUPPLY.filter((f) => (pub ? f.pub : f.priv) !== null);
  const sum = rows.reduce((s, f) => s + (n[f.id] || 0) * ((pub ? f.pub : f.priv) ?? 0), 0) * (hot ? 0.75 : 1);
  const wcValve = rows.filter((f) => f.valve).reduce((s, f) => s + (n[f.id] || 0), 0);
  const wcAll = (n['wc-valve'] || 0) + (n['wc-tank'] || 0) + (n['bath-set-valve'] || 0) + (n['bath-set-tank'] || 0);
  const valve = wcAll > 0 && wcValve / wcAll >= 0.5;
  const fl = flowOf(sum, valve);
  const d = innerDia(fl.q, Number(vel) || 2);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
      <div className="space-y-3">
        <div className={box}>
          <span className={label}>器具の数(器具給水負荷単位)</span>
          <div className="flex gap-3 text-[11px]">
            <label className="flex items-center gap-1">
              <input type="radio" checked={pub} onChange={() => setPub(true)} /> 公衆用
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={!pub} onChange={() => setPub(false)} /> 私室用
            </label>
            <label className="flex items-center gap-1 ml-auto">
              <input type="checkbox" checked={hot} onChange={(e) => setHot(e.target.checked)} /> 給湯栓を併用(× 3/4)
            </label>
          </div>
          <table className="w-full text-[11px]">
            <tbody>
              {rows.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="py-1">{f.label}</td>
                  <td className="py-1 text-right text-gray-500 tabular-nums w-[40px]">{pub ? f.pub : f.priv}</td>
                  <td className="py-1 pl-2 w-[70px]">
                    <Count v={n[f.id] || 0} set={(x) => setN((p) => ({ ...p, [f.id]: x }))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <label className="block">
          <span className="block text-[10px] text-gray-500 mb-1">管内の流速の上限(m/s)</span>
          <input type="number" min="0.5" step="0.1" value={vel} onChange={(e) => setVel(e.target.value)} className="w-full text-[12px] px-2 py-1.5" />
        </label>
      </div>
      <div className="space-y-3">
        <div className="max-w-[420px]">
          <DtResult label="同時使用流量" value={sum > 0 ? f1(fl.q) : '—'} unit={sum > 0 ? 'L/min' : undefined} sub={sum > 0 ? `負荷単位の合計 ${f1(sum)} · 曲線 ${valve ? '①洗浄弁が多い' : '②洗浄タンクが多い'}` : undefined}>
            {sum > 0 && <ResultRow k={`必要内径(流速 ${vel} m/s)`} v={`${f1(d)} mm 以上`} />}
            {fl.below && <ResultRow k="注" v="早見表の最小値より少ないので、表の最小の流量を使っています" />}
            {fl.beyond && <ResultRow k="注" v="早見表(400 単位)を超えるので、最後の区間を延ばした目安です" />}
          </DtResult>
        </div>
        <p className="text-[10px] text-gray-400 leading-relaxed">
          ※ 器具給水負荷単位と同時使用流量の早見表は、空気調和・衛生工学便覧の値を引用した京都市上下水道局「給水装置工事基準」(令和 7 年 4 月)表 9・表 10 によります。大便器の半数以上が洗浄弁なら曲線 ①、それ以外は ② を使います。
          <br />※ 必要内径は流量と流速から出した値です。管種ごとの内径(ライニング鋼管・樹脂管などで違う)を見て、この値以上の呼び径を選んでください。水道直結は事業体の基準に従います。
        </p>
      </div>
    </div>
  );
}

function Drain() {
  const [n, setN] = useState<Record<string, number>>({ 'wc-pub': 4, 'ur-wall': 3, lav: 4, mop: 1 });
  const [floors, setFloors] = useState<'low' | 'high'>('low');
  const sum = DRAIN.reduce((s, f) => s + (n[f.id] || 0) * f.du, 0);
  const branch = drainSize(sum, 1);
  const stack = drainSize(sum, floors === 'low' ? 2 : 3);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
      <div className="space-y-3">
        <div className={box}>
          <span className={label}>器具の数(器具排水負荷単位)</span>
          <table className="w-full text-[11px]">
            <tbody>
              {DRAIN.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="py-1">{f.label}</td>
                  <td className="py-1 text-right text-gray-500 tabular-nums w-[40px]">{f.du}</td>
                  <td className="py-1 pl-2 w-[70px]">
                    <Count v={n[f.id] || 0} set={(x) => setN((p) => ({ ...p, [f.id]: x }))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-gray-400">流し類(調理用・洗濯など)は出典で値を確かめられなかったので入れていません。</p>
        </div>
        <div className={box}>
          <span className={label}>立て管</span>
          <div className="flex gap-3 text-[11px]">
            <label className="flex items-center gap-1">
              <input type="radio" checked={floors === 'low'} onChange={() => setFloors('low')} /> 3 階建て以下
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={floors === 'high'} onChange={() => setFloors('high')} /> 3 階建てを超える(1 立て管の合計)
            </label>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="max-w-[420px]">
          <DtResult label="排水横枝管の管径" value={branch ?? (sum > 0 ? '表の範囲外' : '—')} unit={branch ? 'mm' : undefined} text={!branch} sub={sum > 0 ? `排水負荷単位の合計 ${f1(sum)}` : undefined}>
            {branch && <ResultRow k="横枝管の最小勾配" v={minSlope(branch)} />}
            {stack && <ResultRow k={`立て管(${floors === 'low' ? '3 階建て以下' : '3 階建て超・合計'})`} v={`${stack} mm`} />}
            {floors === 'high' && <ResultRow k="注" v="3 階建てを超えるときは、1 階分の負荷単位の上限も確かめてください(下の表の右端)" />}
          </DtResult>
        </div>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-gray-500">
              <th className="text-left px-2 py-1 font-normal">管径 mm</th>
              <th className="px-2 py-1 font-normal text-right">横枝管</th>
              <th className="px-2 py-1 font-normal text-right">立て管 3 階以下</th>
              <th className="px-2 py-1 font-normal text-right">3 階超 合計</th>
              <th className="px-2 py-1 font-normal text-right">3 階超 1 階分</th>
              <th className="px-2 py-1 font-normal">最小勾配</th>
            </tr>
          </thead>
          <tbody>
            {DRAIN_CAP.map((r) => (
              <tr key={r[0]} className={`border-t ${r[0] === branch ? 'bg-[#eef3f1] font-bold' : ''}`}>
                <td className="px-2 py-1">{r[0]}</td>
                <td className="px-2 py-1 text-right tabular-nums">{r[1].toLocaleString('ja-JP')}</td>
                <td className="px-2 py-1 text-right tabular-nums">{r[2].toLocaleString('ja-JP')}</td>
                <td className="px-2 py-1 text-right tabular-nums">{r[3].toLocaleString('ja-JP')}</td>
                <td className="px-2 py-1 text-right tabular-nums">{r[4].toLocaleString('ja-JP')}</td>
                <td className="px-2 py-1">{minSlope(r[0])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[10px] text-gray-400 leading-relaxed">
          ※ 器具排水負荷単位と許容最大排水負荷単位は SHASE-S206-2019 の値です(盛岡市上下水道局「排水設備の設計基準」表 3-1・3-2 で確認)。伸頂通気方式・特殊継手排水システムには使えません。
          <br />※ 管径は器具のトラップ口径以上とし、下流に向かって細くしないでください。最小勾配は 65mm 以下 1/50・75〜100mm 1/100・125mm 1/150・150mm 以上 1/200 です。
        </p>
      </div>
    </div>
  );
}

export default function PlumbingCalc() {
  const [mode, setMode] = useState<'supply' | 'drain'>('supply');
  return (
    <div className="p-4 text-[12px] text-gray-700">
      <div className="yy-tabs" style={{ marginBottom: 12 }}>
        <button type="button" className="yy-tab" aria-pressed={mode === 'supply'} onClick={() => setMode('supply')}>
          <FiDroplet /> 給水(同時使用流量)
        </button>
        <button type="button" className="yy-tab" aria-pressed={mode === 'drain'} onClick={() => setMode('drain')}>
          <FiArrowDownCircle /> 排水(管径)
        </button>
      </div>
      {mode === 'supply' ? <Supply /> : <Drain />}
    </div>
  );
}
