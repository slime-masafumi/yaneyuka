'use client';
/**
 * 外構設計 › 勾配計算。高低差・水平距離・勾配のうち 2 つから残りを出し、% / 1:n / 角度 / 寸勾配でそろえて見せる。
 * 傾斜路・車路・水勾配・排水管の基準と照らす。計算は src/lib/slope.ts。2026-11-14
 */
import React, { useMemo, useState } from 'react';
import { ResultRow } from '@/components/ui/Sheet';
import DtResult from './DtResult';
import { DRAIN_MIN, DRAIN_SOURCE, FORM_LABEL, STANDARDS, check, fmt, needLength, toRatio, viewOf, type SlopeForm } from '@/lib/slope';

const field = 'w-full text-[12px] px-2 py-1.5';
const label = 'block text-[11px] font-bold text-gray-700 mb-1';
const box = 'bg-gray-50 p-3 border border-[#3b3b3b] space-y-2';

type Want = 'slope' | 'height' | 'length';
const WANT: { id: Want; label: string }[] = [
  { id: 'slope', label: '勾配を求める' },
  { id: 'height', label: '高低差を求める' },
  { id: 'length', label: '水平距離を求める' },
];

/** 断面(水平距離と高低差の三角形)。縦は見やすいよう誇張しない */
function Section({ L, H, ok }: { L: number; H: number; ok: boolean | null }) {
  if (!(L > 0) || !(H > 0)) return null;
  const W = 300;
  const scale = Math.min(260 / L, 110 / H);
  const w = L * scale;
  const h = Math.max(H * scale, 1);
  const x0 = 20;
  const y0 = 130;
  const stroke = ok === false ? '#b4402f' : '#2b2b2b';
  return (
    <svg viewBox={`0 0 ${W} 160`} className="w-full max-w-[340px]" aria-label="勾配の断面">
      <defs>
        <pattern id="slope-ground" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#b9b3a6" strokeWidth="1" />
        </pattern>
      </defs>
      <polygon points={`${x0},${y0} ${x0 + w},${y0} ${x0 + w},${y0 - h}`} fill="url(#slope-ground)" stroke="none" />
      <line x1={x0} y1={y0} x2={x0 + w} y2={y0 - h} stroke={stroke} strokeWidth={1.5} />
      <line x1={x0} y1={y0} x2={x0 + w} y2={y0} stroke="#8a8a85" strokeWidth={0.75} strokeDasharray="3 3" />
      <line x1={x0 + w} y1={y0} x2={x0 + w} y2={y0 - h} stroke="#8a8a85" strokeWidth={0.75} strokeDasharray="3 3" />
      <text x={x0 + w / 2} y={y0 + 16} fontSize={10} fill="#3b3b3b" textAnchor="middle">
        L = {fmt(L, 2)} m
      </text>
      <text x={Math.min(x0 + w + 6, W - 4)} y={y0 - h / 2 + 4} fontSize={10} fill="#3b3b3b" textAnchor={x0 + w + 60 > W ? 'end' : 'start'}>
        H = {fmt(H * 1000, 0)} mm
      </text>
    </svg>
  );
}

export default function SlopeCalc() {
  const [want, setWant] = useState<Want>('slope');
  const [L, setL] = useState('6');
  const [H, setH] = useState('450');
  const [form, setForm] = useState<SlopeForm>('ratio');
  const [sv, setSv] = useState('12');
  const [std, setStd] = useState('ramp');
  const [pipe, setPipe] = useState('100');

  const r = useMemo(() => {
    const l = Number(L);
    const hMm = Number(H);
    const given = toRatio(form, Number(sv));
    let i = NaN;
    let lm = l;
    let hm = hMm;
    if (want === 'slope') i = l > 0 && hMm > 0 ? hMm / 1000 / l : NaN;
    if (want === 'height') {
      i = given;
      hm = l > 0 && i > 0 ? i * l * 1000 : NaN;
    }
    if (want === 'length') {
      i = given;
      lm = hMm > 0 && i > 0 ? hMm / 1000 / i : NaN;
    }
    return { i, L: lm, H: hm };
  }, [want, L, H, form, sv]);

  const v = Number.isFinite(r.i) ? viewOf(r.i) : null;
  const standard = STANDARDS.find((s) => s.id === std);
  const drain = DRAIN_MIN.find((d) => String(d.d) === pipe);
  const res = v && standard ? check(standard, v.i, r.H) : null;
  const drainOk = v && std === 'drain' && drain ? v.i >= drain.i - 1e-9 : null;
  const ok = std === 'drain' ? drainOk : res ? res.ok : null;

  return (
    <div className="p-4 text-[12px] text-gray-700">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* 条件 */}
        <div className="space-y-3">
          <div className={box}>
            <span className={label}>求めるもの</span>
            <div className="flex flex-wrap gap-1">
              {WANT.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setWant(w.id)}
                  className={`px-2 py-1 text-[11px] border ${want === w.id ? 'bg-[#3b3b3b] text-white border-[#3b3b3b]' : 'bg-white border-gray-300'}`}
                >
                  {w.label}
                </button>
              ))}
            </div>
            {want !== 'length' && (
              <label className="block">
                <span className={label}>水平距離 L(m)</span>
                <input type="number" step="0.1" min="0" value={L} onChange={(e) => setL(e.target.value)} className={field} />
              </label>
            )}
            {want !== 'height' && (
              <label className="block">
                <span className={label}>高低差 H(mm)</span>
                <input type="number" step="10" min="0" value={H} onChange={(e) => setH(e.target.value)} className={field} />
              </label>
            )}
            {want !== 'slope' && (
              <div>
                <span className={label}>勾配</span>
                <div className="flex gap-1">
                  <select value={form} onChange={(e) => setForm(e.target.value as SlopeForm)} className="text-[12px] px-1 py-1.5 w-[96px]">
                    {(Object.keys(FORM_LABEL) as SlopeForm[]).map((f) => (
                      <option key={f} value={f}>
                        {FORM_LABEL[f]}
                      </option>
                    ))}
                  </select>
                  <span className="self-center text-[11px] text-gray-500">{form === 'ratio' ? '1 :' : ''}</span>
                  <input type="number" step="0.1" min="0" value={sv} onChange={(e) => setSv(e.target.value)} className={field} />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">寸勾配は水平 10 に対する立ち上がり(4 寸 = 4/10)。</p>
              </div>
            )}
          </div>

          <div className={box}>
            <span className={label}>照らす基準</span>
            <select value={std} onChange={(e) => setStd(e.target.value)} className={field}>
              {STANDARDS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
              <option value="drain">屋外の排水管(横管)の最小勾配</option>
            </select>
            {std === 'drain' ? (
              <label className="block">
                <span className="block text-[10px] text-gray-500 mb-1">管径(mm)</span>
                <select value={pipe} onChange={(e) => setPipe(e.target.value)} className={field}>
                  {DRAIN_MIN.map((d) => (
                    <option key={d.d} value={d.d}>
                      {d.d === 65 ? '65 以下' : d.d === 150 ? '150 以上' : d.d}:{d.show} 以上
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              standard && <p className="text-[11px]">{standard.show}</p>
            )}
            <p className="text-[10px] text-gray-500 leading-relaxed">出典: {std === 'drain' ? DRAIN_SOURCE : standard?.source}</p>
          </div>
        </div>

        {/* 答え */}
        <div className="space-y-3">
          {v ? (
            <div className="flex flex-wrap gap-4 items-start">
              <div className="flex-1 min-w-[240px] max-w-[380px]">
                <DtResult
                  label={want === 'slope' ? '勾配' : want === 'height' ? '高低差' : '水平距離'}
                  value={want === 'slope' ? `1/${fmt(v.n, 1)}` : want === 'height' ? fmt(r.H, 0) : fmt(r.L, 2)}
                  unit={want === 'slope' ? `${fmt(v.pct, 2)} %` : want === 'height' ? 'mm' : 'm'}
                  ng={ok === false}
                  sub={
                    std === 'drain'
                      ? drain && `管径 ${drain.d}:${drain.show} 以上。${drainOk ? '水が流れる勾配です' : '緩すぎます'}`
                      : res?.text
                  }
                >
                  <ResultRow k="百分率" v={`${fmt(v.pct, 2)} %`} />
                  <ResultRow k="比" v={`1 : ${fmt(v.n, 2)}`} />
                  <ResultRow k="角度" v={`${fmt(v.deg, 2)} °`} />
                  <ResultRow k="寸勾配" v={`${fmt(v.sun, 2)} 寸`} />
                  {r.L > 0 && r.H > 0 && <ResultRow k="斜面の長さ" v={`${fmt(Math.hypot(r.L, r.H / 1000), 3)} m`} />}
                  {res && standard?.kind === 'max' && !res.ok && r.H > 0 && (
                    <ResultRow k="上限に収める水平距離" v={`${fmt(needLength(res.limit, r.H), 2)} m 以上`} />
                  )}
                </DtResult>
              </div>
              <Section L={r.L} H={r.H / 1000} ok={ok} />
            </div>
          ) : (
            <p className="text-[11px] text-gray-500">値を入れると答えが出ます。</p>
          )}

          <div>
            <div className="yy-sec">
              <span className="yy-sec__title">基準の一覧</span>
            </div>
            <table className="w-full text-[11px]">
              <tbody>
                {STANDARDS.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="px-2 py-1">{s.label}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{s.show}</td>
                    <td className="px-2 py-1 text-[10px] text-gray-500">{s.source}</td>
                  </tr>
                ))}
                <tr className="border-t">
                  <td className="px-2 py-1">屋外の排水管(横管)</td>
                  <td className="px-2 py-1 whitespace-nowrap">{DRAIN_MIN.map((d) => `${d.d}:${d.show}`).join(' / ')}</td>
                  <td className="px-2 py-1 text-[10px] text-gray-500">SHASE-S206</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-gray-400 leading-relaxed">
            ※ 勾配 = 高低差 ÷ 水平距離。傾斜路は高さ 75cm を超えるとき 75cm 以内ごとに踏幅 150cm 以上の踊場が要ります(バリアフリー法施行令 第 19 条第 2 項第 4 号ハ。敷地内通路は勾配 1/20 を超えるものだけ)。幅は 120cm 以上(段に併設するものは 90cm 以上)。<br />
            ※ 自治体の条例(福祉のまちづくり条例など)で基準が厳しくなっていることがあります。確認申請先の基準も確かめてください。
          </p>
        </div>
      </div>
    </div>
  );
}
