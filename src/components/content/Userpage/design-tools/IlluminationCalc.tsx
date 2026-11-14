'use client';
/**
 * 電気設備 › 照度計算。光束法で必要台数と平均照度を出し、部屋に並べた配置を描く。
 * 計算は src/lib/illumination.ts。2026-11-14
 */
import React, { useMemo, useState } from 'react';
import { ResultRow } from '@/components/ui/Sheet';
import DtResult from './DtResult';
import { LUX, LUX_SOURCE, illum } from '@/lib/illumination';

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

/** 器具の配置(平面)。壁際は間隔の半分 */
function Plan({ x, y, rows, cols }: { x: number; y: number; rows: number; cols: number }) {
  const W = 320;
  const s = Math.min(W / x, 220 / y);
  const w = x * s;
  const h = y * s;
  const dots = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) dots.push([((c + 0.5) * w) / cols, ((r + 0.5) * h) / rows]);
  return (
    <svg viewBox={`0 0 ${w + 20} ${h + 34}`} className="w-full max-w-[340px]" aria-label="器具の配置">
      <rect x={10} y={10} width={w} height={h} fill="#f7f7f4" stroke="#3b3b3b" strokeWidth={1} />
      {dots.map(([dx, dy], i) => (
        <g key={i}>
          <circle cx={10 + dx} cy={10 + dy} r={5} fill="#fff" stroke="#2f6f5e" strokeWidth={1.2} />
          <circle cx={10 + dx} cy={10 + dy} r={1.6} fill="#2f6f5e" />
        </g>
      ))}
      <text x={10 + w / 2} y={h + 28} fontSize={10} textAnchor="middle" fill="#3b3b3b">
        {x} m × {y} m · {rows} 行 × {cols} 列
      </text>
    </svg>
  );
}

export default function IlluminationCalc() {
  const [use, setUse] = useState('office');
  const [target, setTarget] = useState('750');
  const [x, setX] = useState('10');
  const [y, setY] = useState('8');
  const [mount, setMount] = useState('2.7');
  const [work, setWork] = useState('0.8');
  const [lm, setLm] = useState('5200');
  const [u, setU] = useState('0.65');
  const [m, setM] = useState('0.77');
  const [n, setN] = useState('');

  const r = useMemo(
    () => illum({ x: Number(x), y: Number(y), mount: Number(mount), work: Number(work), target: Number(target), lm: Number(lm), u: Number(u), m: Number(m), n: Number(n) }),
    [x, y, mount, work, target, lm, u, m, n]
  );
  const E0 = Number(target);
  const short = r?.e != null && E0 > 0 && r.e < E0;

  return (
    <div className="p-4 text-[12px] text-gray-700">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="space-y-3">
          <div className={box}>
            <label className="block">
              <span className={label}>室の用途(推奨照度)</span>
              <select
                value={use}
                onChange={(e) => {
                  setUse(e.target.value);
                  const row = LUX.find((l) => l.id === e.target.value);
                  if (row) setTarget(String(row.lx));
                }}
                className={field}
              >
                {[...new Set(LUX.map((l) => l.group))].map((g) => (
                  <optgroup key={g} label={g}>
                    {LUX.filter((l) => l.group === g).map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}(Em {l.lx} lx)
                      </option>
                    ))}
                  </optgroup>
                ))}
                <option value="">(自分で入れる)</option>
              </select>
            </label>
            <Num k="目標の照度 E(lx)" v={target} set={setTarget} step="50" />
            <p className="text-[10px] text-gray-400">出典: {LUX_SOURCE}</p>
          </div>
          <div className={box}>
            <span className={label}>部屋</span>
            <div className="grid grid-cols-2 gap-2">
              <Num k="間口 X(m)" v={x} set={setX} />
              <Num k="奥行 Y(m)" v={y} set={setY} />
              <Num k="器具の取付高さ(m)" v={mount} set={setMount} hint="直付けは天井高" />
              <Num k="作業面の高さ(m)" v={work} set={setWork} hint="机上 0.8・床 0" />
            </div>
          </div>
          <div className={box}>
            <span className={label}>器具</span>
            <Num k="器具 1 台の光束 F(lm)" v={lm} set={setLm} step="100" hint="器具のカタログの「器具光束」" />
            <div className="grid grid-cols-2 gap-2">
              <Num k="照明率 U" v={u} set={setU} step="0.01" hint="照明率表で室指数 K の行" />
              <Num k="保守率 M" v={m} set={setM} step="0.01" hint="LED・一般的な環境で 0.7〜0.8" />
            </div>
            <Num k="台数(任意。空なら必要台数で並べる)" v={n} set={setN} step="1" />
          </div>
        </div>

        <div className="space-y-3">
          {r ? (
            <div className="flex flex-wrap gap-4 items-start">
              <div className="flex-1 min-w-[260px] max-w-[400px]">
                <DtResult
                  label={Number(n) > 0 ? `平均照度(${n} 台)` : '必要台数'}
                  value={Number(n) > 0 ? Math.round(r.e ?? 0).toLocaleString('ja-JP') : r.need}
                  unit={Number(n) > 0 ? 'lx' : '台'}
                  ng={short}
                  sub={Number(n) > 0 ? `目標 ${E0} lx${short ? ` に足りません(必要 ${r.need} 台)` : ' を満たします'}` : r.e != null ? `並べたときの平均照度 ${Math.round(r.e).toLocaleString('ja-JP')} lx` : undefined}
                >
                  <ResultRow k="床面積 A" v={`${r.area.toFixed(1)} m²`} />
                  <ResultRow k="室指数 K" v={Number.isFinite(r.k) ? `${r.k.toFixed(2)}(H = ${r.h.toFixed(2)} m)` : '—'} />
                  <ResultRow k="必要台数" v={`${r.need} 台(E × A ÷ (F × U × M))`} />
                  {r.grid && <ResultRow k="配置の目安" v={`${r.grid.rows} 行 × ${r.grid.cols} 列 · 間隔 ${r.grid.sx.toFixed(2)} × ${r.grid.sy.toFixed(2)} m`} />}
                </DtResult>
              </div>
              {r.grid && <Plan x={Number(x)} y={Number(y)} rows={r.grid.rows} cols={r.grid.cols} />}
            </div>
          ) : (
            <p className="text-[11px] text-gray-500">部屋の大きさと器具の光束・照明率・保守率を入れると計算します。</p>
          )}
          <p className="text-[10px] text-gray-400 leading-relaxed">
            ※ 光束法による平均照度の目安です。照明率は器具ごとに違うので、器具メーカーの照明率表で、室指数 K と天井・壁・床の反射率の行を読んで入れてください。
            <br />※ 配置は壁際を間隔の半分とした等間隔です。器具の間隔は、器具の配光で決まる最大間隔(取付高さの 1.2〜1.5 倍程度が多い)以下にしてください。
            <br />※ 非常用照明(建築基準法施行令 第 126 条の 5)の照度は別の計算です。
          </p>
        </div>
      </div>
    </div>
  );
}
