'use client';
/**
 * 外構設計 › 舗装設計。アスファルト舗装の構成を TA 法（舗装設計便覧）で決める。
 * 計算は src/lib/pavement.ts。
 */
import React, { useMemo, useState } from 'react';
import { FiPlus, FiX, FiZap } from 'react-icons/fi';
import { MATERIALS, SITE_PRESETS, TRAFFIC, checkPavement, materialOf, requiredTA, suggestLayers, type Layer } from '@/lib/pavement';

const field = 'w-full text-[12px] px-2 py-1.5';
const label = 'block text-[11px] font-bold text-gray-700 mb-1';

/** 路床の設計 CBR の目安（土質調査が無いときの当たり） */
const CBR_HINTS = [
  { cbr: 3, label: '3', hint: '粘性土・ローム' },
  { cbr: 4, label: '4', hint: '粘性土（良）' },
  { cbr: 6, label: '6', hint: '砂質土' },
  { cbr: 8, label: '8', hint: '砂' },
  { cbr: 12, label: '12', hint: '礫混じり砂' },
  { cbr: 20, label: '20', hint: '礫・砂利' },
];

/** 断面の塗り（材料ごとに見分けがつく程度の地味な色） */
const FILL: Record<string, string> = {
  surface: '#2b2b2b',
  upper: '#b9ad97',
  lower: '#d9d0bf',
};

function Section({ layers }: { layers: Layer[] }) {
  const valid = layers.filter((l) => materialOf(l.material) && l.cm > 0);
  const total = valid.reduce((s, l) => s + l.cm, 0);
  if (!total) return null;
  const W = 300;
  const px = Math.min(4, 220 / total); // 1cm あたりの px
  let y = 10;
  return (
    <svg viewBox={`0 0 ${W} ${total * px + 40}`} className="w-full max-w-[340px]" aria-label="舗装の断面">
      {valid.map((l, i) => {
        const m = materialOf(l.material)!;
        const h = l.cm * px;
        const top = y;
        y += h;
        return (
          <g key={i}>
            <rect x={10} y={top} width={150} height={h} fill={FILL[m.layer]} stroke="#3b3b3b" strokeWidth={0.5} />
            <text x={170} y={top + h / 2 + 4} fontSize={10} fill="#3b3b3b">
              {m.label.replace(/（.*）/, '')} {l.cm}cm
            </text>
          </g>
        );
      })}
      <rect x={10} y={y} width={150} height={20} fill="url(#subgrade)" stroke="#3b3b3b" strokeWidth={0.5} />
      <defs>
        <pattern id="subgrade" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#8b7d62" strokeWidth="1" />
        </pattern>
      </defs>
      <text x={170} y={y + 14} fontSize={10} fill="#3b3b3b">路床</text>
    </svg>
  );
}

export default function PavementDesign() {
  const [preset, setPreset] = useState('car');
  const [traffic, setTraffic] = useState('N1');
  const [cbr, setCbr] = useState('6');
  const [layers, setLayers] = useState<Layer[]>(() => suggestLayers('N1', 6));

  const cbrNum = Number(cbr);
  const result = useMemo(() => checkPavement(traffic, cbrNum, layers), [traffic, cbrNum, layers]);
  const t = TRAFFIC.find((x) => x.id === traffic)!;

  const suggest = (tr = traffic, c = cbrNum) => setLayers(suggestLayers(tr, c > 0 ? c : 3));
  const setLayer = (i: number, patch: Partial<Layer>) => setLayers((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <div className="p-4 text-[12px] text-gray-700">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* 条件 */}
        <div className="space-y-3">
          <div className="bg-gray-50 p-3 border border-[#3b3b3b] space-y-2">
            <span className={label}>使われ方</span>
            {SITE_PRESETS.map((p) => (
              <label key={p.id} className={`flex items-center gap-2 px-2 py-1 border cursor-pointer ${preset === p.id ? 'bg-white border-[#3b3b3b]' : 'border-transparent hover:bg-white'}`}>
                <input
                  type="radio"
                  name="preset"
                  checked={preset === p.id}
                  onChange={() => {
                    setPreset(p.id);
                    setTraffic(p.traffic);
                    suggest(p.traffic);
                  }}
                />
                <span className="flex-1">{p.label}</span>
                <span className="text-[10px] text-gray-500">{p.traffic}</span>
              </label>
            ))}
            <label className="block pt-1">
              <span className="block text-[10px] text-gray-500 mb-1">交通量区分（大型車の台数/日・方向）</span>
              <select
                value={traffic}
                onChange={(e) => {
                  setPreset('');
                  setTraffic(e.target.value);
                }}
                className={field}
              >
                {TRAFFIC.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.label}：{x.heavyPerDay} 台
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="bg-gray-50 p-3 border border-[#3b3b3b] space-y-2">
            <label className="block">
              <span className={label}>路床の設計 CBR（%）</span>
              <input type="number" step="0.5" min="1" value={cbr} onChange={(e) => setCbr(e.target.value)} className={field} />
            </label>
            <div className="flex flex-wrap gap-1">
              {CBR_HINTS.map((h) => (
                <button
                  key={h.cbr}
                  type="button"
                  onClick={() => setCbr(String(h.cbr))}
                  className={`px-2 py-1 text-[10px] border ${cbrNum === h.cbr ? 'bg-[#3b3b3b] text-white border-[#3b3b3b]' : 'bg-white border-gray-300'}`}
                  title={h.hint}
                >
                  {h.label}：{h.hint}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-500">土質調査の値があればそれを使ってください。上は調査が無いときの当たりです。</p>
          </div>

          <div className="bg-gray-50 p-3 border border-[#3b3b3b] text-[11px] space-y-1">
            <div className="flex justify-between"><span>疲労破壊輪数 N（10年）</span><b>{t.N.toLocaleString()} 回</b></div>
            <div className="flex justify-between"><span>必要等値換算厚 TA</span><b>{cbrNum > 0 ? `${requiredTA(t.N, cbrNum).toFixed(1)} cm` : '—'}</b></div>
            <div className="flex justify-between"><span>表層＋基層の最小厚</span><b>{t.minSurface} cm</b></div>
            <p className="text-[10px] text-gray-500 pt-1">TA = 3.84·N^0.16 / CBR^0.3（信頼度 90%）</p>
          </div>
        </div>

        {/* 構成と判定 */}
        <div className="space-y-3">
          <div className="border border-[#3b3b3b]">
            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100 border-b">
              <span className="text-[11px] font-bold">舗装の構成（上から）</span>
              <button type="button" onClick={() => suggest()} className="px-2 py-1 text-[11px] bg-[#3b3b3b] text-white flex items-center gap-1">
                <FiZap /> 標準構成を提案
              </button>
            </div>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left px-2 py-1 font-normal">材料</th>
                  <th className="px-2 py-1 font-normal w-[80px]">厚さ cm</th>
                  <th className="px-2 py-1 font-normal w-[60px]">係数 a</th>
                  <th className="px-2 py-1 font-normal w-[60px]">a×厚さ</th>
                  <th className="w-[28px]" />
                </tr>
              </thead>
              <tbody>
                {layers.map((l, i) => {
                  const m = materialOf(l.material);
                  return (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1">
                        <select value={l.material} onChange={(e) => setLayer(i, { material: e.target.value })} className="w-full text-[11px] px-1 py-1">
                          <optgroup label="表層・基層">
                            {MATERIALS.filter((x) => x.layer === 'surface').map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                          </optgroup>
                          <optgroup label="上層路盤">
                            {MATERIALS.filter((x) => x.layer === 'upper').map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                          </optgroup>
                          <optgroup label="下層路盤">
                            {MATERIALS.filter((x) => x.layer === 'lower').map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                          </optgroup>
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" step="1" min="0" value={l.cm} onChange={(e) => setLayer(i, { cm: Number(e.target.value) })} className="w-full text-[11px] px-1 py-1 text-right" />
                      </td>
                      <td className="px-2 py-1 text-center tabular-nums">{m?.a.toFixed(2)}</td>
                      <td className="px-2 py-1 text-center tabular-nums">{m ? (m.a * l.cm).toFixed(1) : ''}</td>
                      <td className="px-1">
                        <button type="button" onClick={() => setLayers((ls) => ls.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600" title="この層を外す">
                          <FiX />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button type="button" onClick={() => setLayers((ls) => [...ls, { material: 'crusher', cm: 15 }])} className="w-full py-1 text-[11px] text-gray-600 border-t hover:bg-gray-50 flex items-center justify-center gap-1">
              <FiPlus /> 層を足す
            </button>
          </div>

          {result && (
            <div className={`border-2 p-4 ${result.ok ? 'border-green-600 bg-green-50' : 'border-red-600 bg-red-50'}`}>
              <div className="flex flex-wrap gap-4 items-start">
                <div className="flex-1 min-w-[220px] space-y-2">
                  <div className={`text-[28px] font-bold leading-none ${result.ok ? 'text-green-700' : 'text-red-700'}`}>{result.ok ? 'OK' : 'NG'}</div>
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span>構成の等値換算厚 TA′</span>
                      <b className={result.actualTA >= result.requiredTA ? 'text-green-700' : 'text-red-700'}>
                        {result.actualTA.toFixed(1)} cm（必要 {result.requiredTA.toFixed(1)} cm）
                      </b>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5">
                      <div className={`h-full ${result.actualTA >= result.requiredTA ? 'bg-green-600' : 'bg-red-600'}`} style={{ width: `${Math.min(result.actualTA / result.requiredTA, 1) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-[11px]">舗装の合計厚 <b>{result.totalCm} cm</b>（路床面までの掘削深さの目安）</div>
                  {result.issues.map((s) => (
                    <p key={s} className="text-[11px] text-red-700">・{s}</p>
                  ))}
                </div>
                <Section layers={layers} />
              </div>
            </div>
          )}

          <p className="text-[10px] text-gray-400 leading-relaxed">
            ※ 日本道路協会「舗装設計便覧」の TA 法（設計期間 10 年・信頼度 90%）による目安です。等値換算係数・交通量区分・表層＋基層の最小厚は同便覧の値を使っています。<br />
            ※ 路盤は 1 層の仕上がり厚を 10cm 以上（瀝青安定処理は 5cm 以上）にしてください。寒冷地では凍結深さまでの置換え（凍上抑制層）を別に検討してください。<br />
            ※ 構内の駐車場で交通量が分からないときは「使われ方」から選べます。大型車が入る区画だけ構成を分けると経済的です。
          </p>
        </div>
      </div>
    </div>
  );
}
