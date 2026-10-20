'use client';
/**
 * 結露検討 › 断面図。層を材料ごとのハッチングで描き、温度線と露点線を重ねる。
 * 露点線が温度線を上回る範囲（＝結露する範囲）を塗る。
 * 塗りは舗装設計の断面図と同じく、材料が見分けられる程度の地味な色。
 */
import React, { useId } from 'react';
import { dewPoint, hatchOf, type Hatch, type Profile } from '@/lib/condensation';

const TEMP = '#c62828';
const DEW = '#1d4ed8';
const ZONE_FILL = 'rgba(29, 78, 216, 0.16)';
const INK = '#3b3b3b';

const FILL: Record<Hatch, string> = {
  concrete: '#d6d1c6',
  mortar: '#ddd6c8',
  cement: '#e3ddd0',
  alc: '#e9e4d9',
  metal: '#2b2b2b',
  wood: '#dccaa6',
  insul: '#f5ebc3',
  board: '#ecebe7',
  membrane: '#3b3b3b',
  air: '#ffffff',
  vent: '#ffffff',
  none: '#f3f3f3',
};

interface Props {
  profile: Profile;
  ti: number;
  rhi: number;
  te: number;
  rhe: number;
  outLabel: string;
  /** fit = 薄い層も見える幅に調整 / real = 実寸比 */
  view: 'fit' | 'real';
  /** 構成表と同じ番号（外側から 1） */
  layerNo: (index: number) => number;
  hoverK?: number | null;
  hoverLayer?: number | null;
  onHover?: (k: number | null, layerIndex: number | null) => void;
}

const W = 860;
const H = 360;
const PT = 40;
const PB = 34;
const Z = 96;

export default function SectionChart({ profile: p, ti, rhi, te, rhe, outLabel, view, layerNo, hoverK = null, hoverLayer = null, onHover }: Props) {
  const uid = useId().replace(/:/g, '');
  const n = p.layers.length;
  if (n === 0) return null;
  const isGround = outLabel === '地盤';

  // 層の幅
  const x0 = Z;
  const x1 = W - Z;
  let w = p.layers.map((l) => (view === 'real' ? Math.max(l.d, 0.0001) : Math.sqrt(Math.max(l.d, 0.1))));
  if (view === 'real') {
    const sum = w.reduce((a, b) => a + b, 0);
    w = w.map((v) => Math.max((v / sum) * (x1 - x0), 2));
  } else {
    // 薄いシートも見える幅に（全体の 4% 以上）
    for (let it = 0; it < 4; it++) {
      const sum = w.reduce((a, b) => a + b, 0);
      w = w.map((v) => Math.max(v, sum * 0.04));
    }
  }
  const total = w.reduce((a, b) => a + b, 0);
  const xs = [x0];
  w.forEach((v) => xs.push(xs[xs.length - 1] + (v / total) * (x1 - x0)));

  // 縦軸
  const outDew = dewPoint(p.pe);
  const inDew = dewPoint(p.pi);
  const vals = [ti, te, outDew, inDew, ...p.interfaces.flatMap((f) => [f.temp, f.dewPoint])];
  const ymin = Math.floor((Math.min(...vals) - 1) / 5) * 5;
  const ymax = Math.ceil((Math.max(...vals) + 1) / 5) * 5;
  const y = (v: number) => PT + ((ymax - v) / (ymax - ymin)) * (H - PT - PB);
  const ticks: number[] = [];
  for (let v = ymin; v <= ymax; v += 5) ticks.push(v);

  // 結露する範囲（露点 > 温度）
  const zones: string[] = [];
  for (let k = 0; k < n; k++) {
    const A = p.interfaces[k];
    const B = p.interfaces[k + 1];
    if (p.layers[k].excluded) continue;
    const skip = (s: string) => s === 'ground' || s === 'ground-ng';
    if (skip(A.status) && skip(B.status)) continue;
    const fa = A.dewPoint - A.temp;
    const fb = B.dewPoint - B.temp;
    if (fa <= 0 && fb <= 0) continue;
    const xa = xs[k];
    const xb = xs[k + 1];
    let pts: [number, number][];
    if (fa > 0 && fb > 0) pts = [[xa, A.temp], [xb, B.temp], [xb, B.dewPoint], [xa, A.dewPoint]];
    else {
      const t = fa / (fa - fb);
      const xc = xa + (xb - xa) * t;
      const vc = A.temp + (B.temp - A.temp) * t;
      pts = fa > 0 ? [[xa, A.temp], [xc, vc], [xa, A.dewPoint]] : [[xc, vc], [xb, B.temp], [xb, B.dewPoint]];
    }
    zones.push(pts.map(([px, v]) => `${px.toFixed(1)},${y(v).toFixed(1)}`).join(' '));
  }
  if (p.surface.status === 'ng') {
    const pts: [number, number][] = [[x1, p.surface.temp], [x1 + 18, ti], [x1 + 18, inDew], [x1, p.surface.dewPoint]];
    zones.push(pts.map(([px, v]) => `${px.toFixed(1)},${y(v).toFixed(1)}`).join(' '));
  }

  // 線（空気 → 表面 → 各界面 → 表面 → 空気）
  const line = (key: 'temp' | 'dewPoint', airOut: number, airIn: number) =>
    [[0, airOut], [x0 - 22, airOut], ...p.interfaces.map((f, k) => [xs[k], f[key]]), [x1 + 22, airIn], [W, airIn]]
      .map(([px, v]) => `${px.toFixed(1)},${y(v).toFixed(1)}`)
      .join(' ');

  const pat = (h: Hatch) => `${uid}-${h}`;
  const f1 = (v: number) => v.toFixed(1);

  const handleMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!onHover) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let k: number | null = null;
    let best = 1e9;
    xs.forEach((px, i) => {
      const d = Math.abs(px - x);
      if (d < best) { best = d; k = i; }
    });
    if (best > 40) k = null;
    let li: number | null = null;
    for (let i = 0; i < n; i++) if (x >= xs[i] && x < xs[i + 1]) li = i;
    onHover(k, li);
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block w-full min-w-[600px] h-auto select-none"
      role="img"
      aria-label="断面図と温度・露点の分布"
      onPointerMove={handleMove}
      onPointerLeave={() => onHover?.(null, null)}
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      <defs>
        <pattern id={pat('concrete')} width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="4" r="0.9" fill="#6b665c" />
          <circle cx="10" cy="9" r="0.7" fill="#6b665c" />
          <path d="M8 2l2.2 3.4h-4.4z" fill="none" stroke="#6b665c" strokeWidth="0.55" />
          <path d="M2 10l1.8 2.8h-3.6z" fill="none" stroke="#6b665c" strokeWidth="0.55" />
        </pattern>
        <pattern id={pat('mortar')} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="0.6" fill="#7a7466" />
          <circle cx="4.5" cy="4.5" r="0.6" fill="#7a7466" />
        </pattern>
        <pattern id={pat('cement')} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#8b8476" strokeWidth="0.6" />
        </pattern>
        <pattern id={pat('alc')} width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.1" fill="none" stroke="#8b8476" strokeWidth="0.5" />
          <circle cx="6.5" cy="6.5" r="0.8" fill="none" stroke="#8b8476" strokeWidth="0.5" />
        </pattern>
        <pattern id={pat('wood')} width="10" height="5" patternUnits="userSpaceOnUse">
          <path d="M0 2.5 Q2.5 0.5 5 2.5 T10 2.5" fill="none" stroke="#8b7d62" strokeWidth="0.6" />
        </pattern>
        <pattern id={pat('insul')} width="10" height="8" patternUnits="userSpaceOnUse">
          <path d="M0 0 L10 4 L0 8" fill="none" stroke="#9a8a52" strokeWidth="0.7" />
        </pattern>
        <pattern id={pat('board')} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="#8c8a85" strokeWidth="0.6" />
        </pattern>
        <pattern id={pat('vent')} width="12" height="16" patternUnits="userSpaceOnUse">
          <path d="M6 3v9M3 6l3-3 3 3" fill="none" stroke="#8c8a85" strokeWidth="0.7" />
        </pattern>
        <pattern id={`${uid}-soil`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#8b7d62" strokeWidth="0.8" />
        </pattern>
      </defs>

      <rect width={W} height={H} fill="#ffffff" />
      {/* 外・内の空気 */}
      <rect x={0} y={PT} width={x0} height={H - PT - PB} fill={isGround ? '#efe9dc' : '#f3f4f6'} />
      {isGround && <rect x={0} y={PT} width={x0} height={H - PT - PB} fill={`url(#${uid}-soil)`} opacity={0.5} />}
      <rect x={x1} y={PT} width={W - x1} height={H - PT - PB} fill="#f3f4f6" />

      {/* 目盛り */}
      {ticks.map((v) => (
        <g key={v}>
          <line x1={0} x2={W} y1={y(v)} y2={y(v)} stroke={v === 0 ? '#9ca3af' : '#e5e7eb'} strokeWidth={v === 0 ? 0.8 : 0.6} strokeDasharray={v === 0 ? '4 3' : undefined} />
          <text x={x0 - 5} y={y(v) - 3} textAnchor="end" fontSize={9.5} fill="#6b7280">{v}℃</text>
        </g>
      ))}

      {/* 層 */}
      {p.layers.map((l, i) => {
        const h = hatchOf(l.material);
        const a = xs[i];
        const bw = xs[i + 1] - a;
        const hov = hoverLayer === i;
        const hasPattern = !['metal', 'membrane', 'air', 'none'].includes(h);
        return (
          <g key={i} opacity={l.excluded ? 0.45 : 1}>
            <rect x={a} y={PT} width={bw} height={H - PT - PB} fill={FILL[h]} />
            {hasPattern && <rect x={a} y={PT} width={bw} height={H - PT - PB} fill={`url(#${pat(h)})`} />}
            <rect x={a} y={PT} width={bw} height={H - PT - PB} fill="none" stroke={INK} strokeWidth={hov ? 1.6 : 0.5} />
          </g>
        );
      })}

      {/* 結露する範囲 */}
      {zones.map((pts, i) => (
        <polygon key={i} points={pts} fill={ZONE_FILL} stroke={DEW} strokeWidth={0.8} />
      ))}

      {/* 露点線・温度線 */}
      <polyline points={line('dewPoint', outDew, inDew)} fill="none" stroke={DEW} strokeWidth={1.6} strokeLinejoin="round" />
      <polyline points={line('temp', te, ti)} fill="none" stroke={TEMP} strokeWidth={2.2} strokeLinejoin="round" />

      {/* 界面の印 */}
      {p.interfaces.map((f, k) => {
        const px = xs[k];
        const hov = hoverK === k;
        return (
          <g key={k}>
            {hov && <line x1={px} x2={px} y1={PT - 4} y2={H - PB} stroke={INK} strokeWidth={0.8} />}
            {f.status === 'ng' ? (
              <g>
                <rect x={px - 5} y={y(f.temp) - 5} width={10} height={10} fill="#ffffff" stroke="#dc2626" strokeWidth={1.4} />
                <path d={`M${px - 3} ${y(f.temp) - 3}l6 6M${px + 3} ${y(f.temp) - 3}l-6 6`} stroke="#dc2626" strokeWidth={1.2} />
              </g>
            ) : (
              <circle cx={px} cy={y(f.temp)} r={hov ? 3.6 : 2.6} fill={TEMP} />
            )}
            <circle cx={px} cy={y(f.dewPoint)} r={hov ? 3 : 2} fill="#ffffff" stroke={DEW} strokeWidth={1.2} />
          </g>
        );
      })}

      {/* 層番号（上）と厚さ（下）。狭い層は 2 段に逃がす */}
      {p.layers.map((l, i) => {
        const a = xs[i];
        const b = xs[i + 1];
        const cx = (a + b) / 2;
        const narrow = b - a < 22;
        const ty = PT - 8 - (narrow && i % 2 ? 13 : 0);
        return (
          <g key={i}>
            <text x={cx} y={ty} textAnchor="middle" fontSize={10} fontWeight={hoverLayer === i ? 700 : 400} fill={INK}>{layerNo(i)}</text>
            {narrow && <line x1={cx} x2={cx} y1={ty + 3} y2={PT} stroke="#d1d5db" strokeWidth={0.6} />}
            {b - a >= 24 && (
              <text x={cx} y={H - PB + 13} textAnchor="middle" fontSize={9} fill="#6b7280">{l.d < 1 ? l.d : Math.round(l.d)}</text>
            )}
          </g>
        );
      })}
      <text x={x1} y={H - PB + 27} textAnchor="end" fontSize={9} fill="#6b7280">
        厚さ mm{view === 'fit' ? '（幅は見やすさのため調整）' : ''}
      </text>
      {p.ventApplied && (
        <text x={(x0 + xs[p.layers.findIndex((l) => !l.excluded)]) / 2} y={H - PB - 8} textAnchor="middle" fontSize={9} fill="#6b7280">計算対象外</text>
      )}

      {/* 空気の条件 */}
      <g fontSize={10} fill="#6b7280">
        <text x={8} y={PT + 14}>{outLabel}</text>
        <text x={8} y={PT + 34} fontSize={16} fontWeight={700} fill={INK} stroke={isGround ? '#efe9dc' : '#f3f4f6'} strokeWidth={4} paintOrder="stroke">{f1(te)}℃</text>
        <text x={8} y={PT + 48}>{rhe}%</text>
        <text x={W - 8} y={PT + 14} textAnchor="end">室内</text>
        <text x={W - 8} y={PT + 34} textAnchor="end" fontSize={16} fontWeight={700} fill={INK} stroke="#f3f4f6" strokeWidth={4} paintOrder="stroke">{f1(ti)}℃</text>
        <text x={W - 8} y={PT + 48} textAnchor="end">{rhi}%</text>
      </g>
    </svg>
  );
}
