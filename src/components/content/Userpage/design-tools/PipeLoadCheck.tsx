'use client';
/**
 * 外構雨水 › 管渠の耐荷重。
 * 埋設深さ・管サイズ・管種と、上を通る車種から、管が持つかを OK / NG で出す。
 * 計算は src/lib/pipeLoad.ts（出典と式はそちらに書いてある）。
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  BEDDINGS, PIPE_KINDS, VEHICLES, checkPipe, coverRange, isRigid, outerDiameter, sizesOf, SOIL_UNIT_WEIGHT, type PipeKind,
} from '@/lib/pipeLoad';

const field = 'w-full text-[12px] px-2 py-1.5';
const label = 'block text-[11px] font-bold text-gray-700 mb-1';

/** 断面の略図（地表・車両・土被り・管） */
function Section({ cover, od, vehicle, ok }: { cover: number; od: number; vehicle: string; ok: boolean | null }) {
  const W = 260;
  const Hpx = 190;
  const ground = 60;
  // 土被りと管径を同じ縮尺で描く（土被り 3m で下端に届くくらい）
  const scale = Math.min(38, 110 / Math.max(cover + od, 0.5));
  const y = ground + cover * scale;
  const r = Math.max(6, (od * scale) / 2);
  const hasCar = vehicle !== 'none';
  const color = ok === null ? '#9ca3af' : ok ? '#16a34a' : '#dc2626';
  return (
    <svg viewBox={`0 0 ${W} ${Hpx}`} className="w-full max-w-[300px]" aria-label="断面図">
      <rect x={0} y={ground} width={W} height={Hpx - ground} fill="#f3efe6" />
      <line x1={0} y1={ground} x2={W} y2={ground} stroke="#3b3b3b" strokeWidth={1.5} />
      {hasCar && (
        <g transform={`translate(${W / 2 - 40} ${ground - 34})`}>
          <rect x={0} y={4} width={80} height={20} fill="#3b3b3b" />
          <rect x={52} y={0} width={24} height={14} fill="#3b3b3b" />
          <circle cx={16} cy={28} r={6} fill="#111" />
          <circle cx={64} cy={28} r={6} fill="#111" />
        </g>
      )}
      {/* 荷重の広がり（45°） */}
      {hasCar && (
        <polygon
          points={`${W / 2 + 24},${ground} ${W / 2 + 24 - cover * scale},${y - r} ${W / 2 + 24 + cover * scale},${y - r}`}
          fill="#3b3b3b"
          opacity={0.06}
        />
      )}
      <circle cx={W / 2 + 24} cy={y + r} r={r} fill="#fff" stroke={color} strokeWidth={2.5} />
      {/* 土被りの寸法線 */}
      <line x1={40} y1={ground} x2={40} y2={y} stroke="#3b3b3b" strokeWidth={1} />
      <line x1={34} y1={ground} x2={46} y2={ground} stroke="#3b3b3b" />
      <line x1={34} y1={y} x2={W / 2 + 24} y2={y} stroke="#3b3b3b" strokeDasharray="3 3" />
      <text x={48} y={(ground + y) / 2 + 4} fontSize={11} fill="#3b3b3b">
        土被り {cover.toFixed(2)} m
      </text>
    </svg>
  );
}

export default function PipeLoadCheck() {
  const [kind, setKind] = useState<PipeKind>('VU');
  const [size, setSize] = useState(150);
  const [cover, setCover] = useState('0.6');
  const [vehicle, setVehicle] = useState('t8');
  const [bedding, setBedding] = useState('pvc60');
  const [trench, setTrench] = useState('');
  const [gamma, setGamma] = useState(String(SOIL_UNIT_WEIGHT));

  const rigid = isRigid(kind);
  const sizes = sizesOf(kind);
  const beddings = BEDDINGS.filter((b) => b.forRigid === rigid);

  // 管種を変えたら、呼び径と基礎をその管種で選べるものに合わせる
  useEffect(() => {
    if (!sizes.includes(size)) setSize(sizes.reduce((best, s) => (Math.abs(s - size) < Math.abs(best - size) ? s : best), sizes[0]));
    if (!beddings.some((b) => b.id === bedding)) setBedding(rigid ? 'sand90' : 'pvc60');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const base = {
    kind,
    size,
    vehicle,
    bedding,
    trenchWidth: trench ? Number(trench) : undefined,
    gamma: Number(gamma) || SOIL_UNIT_WEIGHT,
  };
  const H = Number(cover);
  const result = useMemo(() => checkPipe({ ...base, cover: H }), [kind, size, vehicle, bedding, trench, gamma, H]); // eslint-disable-line react-hooks/exhaustive-deps
  const range = useMemo(() => coverRange(base), [kind, size, vehicle, bedding, trench, gamma]); // eslint-disable-line react-hooks/exhaustive-deps
  const byVehicle = useMemo(
    () => VEHICLES.map((v) => ({ v, r: checkPipe({ ...base, vehicle: v.id, cover: H }) })),
    [kind, size, bedding, trench, gamma, H] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const od = outerDiameter(kind, size);

  return (
    <div className="p-4 text-[12px] text-gray-700">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* 入力 */}
        <div className="space-y-3">
          <div className="bg-gray-50 p-3 border border-[#3b3b3b] space-y-3">
            <div>
              <span className={label}>管種</span>
              <div className="grid grid-cols-2 gap-1">
                {PIPE_KINDS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setKind(p.id)}
                    className={`px-2 py-1.5 text-[11px] border text-left ${kind === p.id ? 'bg-[#3b3b3b] text-white border-[#3b3b3b]' : 'bg-white border-gray-300 hover:bg-gray-100'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className={label}>呼び径</span>
                <select value={size} onChange={(e) => setSize(Number(e.target.value))} className={field}>
                  {sizes.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={label}>土被り（管頂まで） m</span>
                <input type="number" step="0.1" min="0.1" value={cover} onChange={(e) => setCover(e.target.value)} className={field} />
              </label>
            </div>
            <label className="block">
              <span className={label}>基礎</span>
              <select value={bedding} onChange={(e) => setBedding(e.target.value)} className={field}>
                {beddings.map((b) => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="bg-gray-50 p-3 border border-[#3b3b3b]">
            <span className={label}>上を通る車種</span>
            <div className="space-y-1">
              {VEHICLES.map((v) => (
                <label key={v.id} className={`flex items-start gap-2 px-2 py-1 border cursor-pointer ${vehicle === v.id ? 'bg-white border-[#3b3b3b]' : 'border-transparent hover:bg-white'}`}>
                  <input type="radio" name="vehicle" checked={vehicle === v.id} onChange={() => setVehicle(v.id)} className="mt-0.5" />
                  <span>
                    <span className="block text-[12px]">{v.label}</span>
                    <span className="block text-[10px] text-gray-500">{v.note}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <details className="bg-gray-50 p-3 border border-[#3b3b3b]">
            <summary className="text-[11px] font-bold text-gray-700 cursor-pointer">詳細な条件</summary>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <label className="block">
                <span className="block text-[10px] text-gray-500 mb-1">埋戻し土の単位体積重量 kN/m³</span>
                <input type="number" step="0.5" value={gamma} onChange={(e) => setGamma(e.target.value)} className={field} />
              </label>
              {rigid && (
                <label className="block">
                  <span className="block text-[10px] text-gray-500 mb-1">溝の掘削幅 m（空欄＝外径＋0.6）</span>
                  <input type="number" step="0.05" value={trench} onChange={(e) => setTrench(e.target.value)} className={field} />
                </label>
              )}
            </div>
          </details>
        </div>

        {/* 結果 */}
        <div className="space-y-3">
          {result ? (
            <div className={`border-2 p-4 ${result.ok ? 'border-green-600 bg-green-50' : 'border-red-600 bg-red-50'}`}>
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex-1 min-w-[220px]">
                  <div className={`text-[28px] font-bold leading-none ${result.ok ? 'text-green-700' : 'text-red-700'}`}>
                    {result.ok ? 'OK' : 'NG'}
                  </div>
                  <p className="text-[11px] mt-1 text-gray-600">
                    {PIPE_KINDS.find((p) => p.id === kind)?.label} 呼び{size}・土被り {H.toFixed(2)} m・{VEHICLES.find((v) => v.id === vehicle)?.label}
                  </p>
                  <div className="mt-3 space-y-2">
                    {result.checks.map((c) => (
                      <div key={c.label}>
                        <div className="flex justify-between text-[11px]">
                          <span>{c.label}</span>
                          <span className={`font-bold ${c.ok ? 'text-green-700' : 'text-red-700'}`}>
                            {c.unit ? `${c.value.toFixed(2)} ${c.unit}（許容 ${c.limit} ${c.unit}）` : `${c.value.toFixed(2)}（1.0 以上で OK）`}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 h-1.5">
                          <div className={`h-full ${c.ok ? 'bg-green-600' : 'bg-red-600'}`} style={{ width: `${Math.min(c.ratio, 1) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <Section cover={H} od={od} vehicle={vehicle} ok={result.ok} />
              </div>

              <dl className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
                <div className="bg-white/70 p-2">
                  <dt className="text-gray-500">埋戻し土の鉛直土圧</dt>
                  <dd className="font-bold">{result.earth.toFixed(1)} kN/m²</dd>
                </div>
                <div className="bg-white/70 p-2">
                  <dt className="text-gray-500">車両による鉛直荷重</dt>
                  <dd className="font-bold">{result.live.toFixed(1)} kN/m²</dd>
                </div>
                <div className="bg-white/70 p-2">
                  <dt className="text-gray-500">後輪荷重（1輪）</dt>
                  <dd className="font-bold">{result.wheel.toFixed(0)} kN</dd>
                </div>
              </dl>

              <p className="text-[11px] mt-3">
                この条件で OK になる土被り:{' '}
                <b>{range.min === null ? '0.3〜6m の範囲にありません' : `${range.min.toFixed(1)} 〜 ${range.max!.toFixed(1)} m`}</b>
                <span className="text-gray-500">（浅すぎると車両の荷重、深すぎると土の重さで持たなくなる）</span>
              </p>
              {result.notes.map((n) => (
                <p key={n} className="text-[10px] text-gray-500 mt-1">※ {n}</p>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">土被りを入れてください。</p>
          )}

          <div className="border border-[#3b3b3b]">
            <div className="px-3 py-1.5 bg-gray-100 text-[11px] font-bold border-b">同じ管・同じ土被りで車種を変えると</div>
            <table className="w-full text-[11px]">
              <tbody>
                {byVehicle.map(({ v, r }) => (
                  <tr key={v.id} className={`border-t ${v.id === vehicle ? 'bg-gray-50 font-bold' : ''}`}>
                    <td className="px-3 py-1">{v.label}</td>
                    <td className="px-3 py-1 text-gray-500">{r ? `${r.live.toFixed(1)} kN/m²` : ''}</td>
                    <td className={`px-3 py-1 text-right ${r?.ok ? 'text-green-700' : 'text-red-700'}`}>{r ? (r.ok ? 'OK' : 'NG') : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-gray-400 leading-relaxed">
            ※ ヒューム管は「ヒューム管設計施工要覧」（全国ヒューム管協会）の方法で、鉛直土圧はマーストン式（溝型）、耐荷力は JIS A 5372 の曲げひび割れ耐力から求め、
            耐荷力 ÷（土圧＋活荷重）が 1.0 以上を OK としています。<br />
            ※ 塩ビ管（VU・VP、JIS K 6741）は塩化ビニル管・継手協会の埋設設計の方法で、曲げ応力 17.7 N/mm² 以下・たわみ率 5% 以下を OK としています（下水道用の許容値）。<br />
            ※ 車両の荷重は T-25（後輪 100kN）を基準に総重量で比例させ、衝撃係数を含めています。目安の計算です。公道の下や発注者の基準がある場合はそちらに従ってください。
          </p>
        </div>
      </div>
    </div>
  );
}
