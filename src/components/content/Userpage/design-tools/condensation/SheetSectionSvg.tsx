'use client';
/**
 * 結露検討 › 断面図の「計算書の組版」版（モック「高級感 3」Q7）。
 * 座標の計算（層の幅・温度目盛り・結露する範囲）は SectionChart が済ませて渡す。ここは描き方だけ。
 *   - 灰色の面（.yy-sheet__fig）に置くので背景は抜く
 *   - ハッチングは灰色 1 色。防湿層は墨、透湿シートは灰
 *   - 温度線は外の寒色 → 室内の暖色、露点線は青の破線
 *   - 層名は上に引き出し線 + 小さな四角で 2 段に振り分ける
 *   - いちばん厳しい界面に、温度と露点の差を縦線と札で出す
 */
import React from 'react';
import { dewPoint, hatchOf, type Profile } from '@/lib/condensation';

const COLD = '#2f78c4';
const WARM = '#e0733a';
const OK = '#2E7D6B';
const NG = '#c8432f';
const INK = '#141414';
const T3 = '#9a9a96';
const PAT = '#a9a9a5'; // ハッチングは灰色 1 色（色で材料を分けない）

/** 文字幅の目安（11px の字で 全角 11px・半角 6.2px） */
const textWidth = (t: string) => Array.from(t).reduce((s, ch) => s + (ch.charCodeAt(0) > 0x2000 ? 11 : 6.2), 0);
const f1 = (v: number) => (Math.abs(v) < 0.05 ? '0.0' : v.toFixed(1)).replace('-', '−');
const sgn = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`;

export interface SheetSectionSvgProps {
  p: Profile;
  ti: number;
  rhi: number;
  te: number;
  rhe: number;
  outLabel: string;
  view: 'fit' | 'real';
  layerNo: (index: number) => number;
  hoverK: number | null;
  hoverLayer: number | null;
  onMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  onLeave: () => void;
  uid: string;
  /** 界面の x 座標（外側 → 室内、層の数 + 1 個） */
  xs: number[];
  y: (v: number) => number;
  ticks: number[];
  zones: string[];
  line: (key: 'temp' | 'dewPoint', airOut: number, airIn: number) => string;
  W: number;
  H: number;
  PT: number;
  PB: number;
  isGround: boolean;
}

export default function SheetSectionSvg({ p, ti, rhi, te, rhe, outLabel, view, layerNo, hoverK, hoverLayer, onMove, onLeave, uid, xs, y, ticks, zones, line, W, H, PT, PB, isGround }: SheetSectionSvgProps) {
  const n = p.layers.length;
  const x0 = xs[0];
  const x1 = xs[n];
  const bodyH = H - PT - PB;
  const outDew = dewPoint(p.pe);
  const inDew = dewPoint(p.pi);
  const pat = (h: string) => `${uid}-s-${h}`;
  // 外が寒い（冬）なら左が青・右が橙、外が暑い（夏）なら逆
  const outCold = te <= ti;
  const outColor = outCold ? COLD : WARM;
  const inColor = outCold ? WARM : COLD;

  // 層名：上下 2 段に振り分け、重なるものは番号だけ、それも入らなければ省く
  const tiers = [16, 38];
  const lastEnd = [-Infinity, -Infinity];
  const labels: { x: number; ty: number; text: string; anchorEnd: boolean }[] = [];
  p.layers.forEach((l, i) => {
    const cx = (xs[i] + xs[i + 1]) / 2;
    const no = String(layerNo(i)).padStart(2, '0');
    for (const text of [`${no} ${l.material?.name ?? '不明'}`, no]) {
      const w = textWidth(text) + 8;
      const anchorEnd = cx + w > W - 4;
      const left = anchorEnd ? cx - w : cx - 3;
      const right = anchorEnd ? cx + 3 : cx + w;
      // 上の段の引き出し線は下の段を横切るので、下の段の字がその位置に掛かっていないこと
      const ok0 = left >= 2 && left >= lastEnd[0] + 6 && cx >= lastEnd[1] + 3;
      const ok1 = left >= 2 && left >= lastEnd[1] + 6;
      const tier = ok0 ? 0 : ok1 ? 1 : -1;
      if (tier < 0) continue;
      lastEnd[tier] = right;
      labels.push({ x: cx, ty: tiers[tier], text, anchorEnd });
      return;
    }
  });

  const worst = p.worst;
  const mark = p.isCondensing ? NG : OK;
  // 室内側の字（温度・湿度・露点）の高さ。目盛りの数字がこれに重なるなら目盛りの数字を省く
  const busyY = [y(ti) + (outCold ? 22 : -10), y(ti) + (outCold ? 38 : -26), y(inDew) + 16];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block w-full min-w-[600px] h-auto select-none"
      role="img"
      aria-label="断面に温度と露点の線を重ねた図"
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      <defs>
        <pattern id={pat('concrete')} width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="4" r="0.9" fill={PAT} />
          <circle cx="10" cy="9" r="0.7" fill={PAT} />
          <path d="M8 2l2.2 3.4h-4.4z" fill="none" stroke={PAT} strokeWidth="0.6" />
          <path d="M2 10l1.8 2.8h-3.6z" fill="none" stroke={PAT} strokeWidth="0.6" />
        </pattern>
        <pattern id={pat('mortar')} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r=".9" fill={PAT} />
        </pattern>
        <pattern id={pat('cement')} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke={PAT} strokeWidth="1" />
        </pattern>
        <pattern id={pat('alc')} width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.1" fill="none" stroke={PAT} strokeWidth="0.6" />
          <circle cx="6.5" cy="6.5" r="0.8" fill="none" stroke={PAT} strokeWidth="0.6" />
        </pattern>
        <pattern id={pat('wood')} width="10" height="5" patternUnits="userSpaceOnUse">
          <path d="M0 2.5 Q2.5 0.5 5 2.5 T10 2.5" fill="none" stroke={PAT} strokeWidth="0.7" />
        </pattern>
        <pattern id={pat('insul')} width="30" height="20" patternUnits="userSpaceOnUse">
          <path d="M0 10 Q7.5 0 15 10 T30 10" fill="none" stroke="#c4c4c0" strokeWidth="1" />
        </pattern>
        <pattern id={pat('board')} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r=".9" fill="#b0b0ac" />
        </pattern>
        <pattern id={pat('soil')} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke={PAT} strokeWidth="0.8" />
        </pattern>
        <linearGradient id={pat('temp')} gradientUnits="userSpaceOnUse" x1={0} x2={W} y1={0} y2={0}>
          <stop offset="0" stopColor={outColor} />
          <stop offset=".3" stopColor={outColor} />
          <stop offset=".65" stopColor={inColor} />
          <stop offset="1" stopColor={inColor} />
        </linearGradient>
      </defs>

      {/* 外・内の空気（薄い寒色 / 暖色）。土間の外側は地盤 */}
      <rect x={0} y={PT} width={x0} height={bodyH} fill={isGround ? '#ece8df' : outCold ? '#f1f6fc' : '#fdf5ef'} />
      {isGround && <rect x={0} y={PT} width={x0} height={bodyH} fill={`url(#${pat('soil')})`} />}
      <rect x={x1} y={PT} width={W - x1} height={bodyH} fill={outCold ? '#fdf5ef' : '#f1f6fc'} />

      {/* 目盛り */}
      {ticks.map((v) => (
        <g key={v}>
          <line x1={0} x2={W} y1={y(v)} y2={y(v)} stroke="#000000" strokeOpacity={v === 0 ? 0.16 : 0.06} strokeDasharray={v === 0 ? '4 3' : undefined} />
          {!busyY.some((b) => Math.abs(y(v) - 5 - b) < 14) && <text x={W - 4} y={y(v) - 5} textAnchor="end" fontSize={11} fill={T3}>{`${String(v).replace('-', '−')} ℃`}</text>}
        </g>
      ))}

      {/* 層 */}
      {p.layers.map((l, i) => {
        const h = hatchOf(l.material);
        const a = xs[i];
        const bw = xs[i + 1] - a;
        const hov = hoverLayer === i;
        const tight = l.material ? (l.d / 1000) * l.material.mu >= 10 : false; // 防湿層（Sd 10 m 以上）
        const fill = h === 'membrane' ? (tight ? INK : '#777777') : h === 'metal' ? '#555555' : h === 'none' ? '#f3f3f1' : '#ffffff';
        const hasPattern = ['concrete', 'mortar', 'cement', 'alc', 'wood', 'insul', 'board'].includes(h);
        const cx = a + bw / 2;
        return (
          <g key={i} opacity={l.excluded ? 0.7 : 1}>
            <rect x={a} y={PT} width={bw} height={bodyH} fill={fill} />
            {hasPattern && <rect x={a} y={PT} width={bw} height={bodyH} fill={`url(#${pat(h)})`} />}
            {h === 'vent' && bw > 14 && (
              <path d={`M${cx} ${PT + bodyH - 30} V${PT + 38} M${cx - 6} ${PT + 48} ${cx} ${PT + 38} ${cx + 6} ${PT + 48}`} fill="none" stroke="#bdbdb9" strokeWidth={1.2} />
            )}
            {h !== 'membrane' && <rect x={a} y={PT} width={bw} height={bodyH} fill="none" stroke={hov ? INK : '#555555'} strokeWidth={hov ? 1.6 : 1} />}
            {h === 'membrane' && hov && <rect x={a - 1} y={PT} width={bw + 2} height={bodyH} fill="none" stroke={INK} strokeWidth={1.2} />}
          </g>
        );
      })}

      {/* 結露する範囲 */}
      {zones.map((pts, i) => (
        <polygon key={i} points={pts} fill="rgba(47, 120, 196, 0.14)" stroke={COLD} strokeWidth={0.8} />
      ))}

      {/* 露点線（破線）・温度線 */}
      <polyline points={line('dewPoint', outDew, inDew)} fill="none" stroke={COLD} strokeWidth={1.6} strokeDasharray="6 5" strokeLinejoin="round" />
      <polyline points={line('temp', te, ti)} fill="none" stroke={`url(#${pat('temp')})`} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

      {/* 結露する界面 */}
      {p.interfaces.map((f, k) => (f.status === 'ng' ? (
        <g key={k}>
          <rect x={xs[k] - 5} y={y(f.temp) - 5} width={10} height={10} fill="#ffffff" stroke={NG} strokeWidth={1.4} />
          <path d={`M${xs[k] - 3} ${y(f.temp) - 3}l6 6M${xs[k] + 3} ${y(f.temp) - 3}l-6 6`} stroke={NG} strokeWidth={1.2} />
        </g>
      ) : null))}

      {/* いちばん厳しい界面：温度と露点の差を縦線と札で */}
      {worst && (() => {
        const px = xs[worst.k];
        const yt = y(worst.temp);
        const yd = y(worst.dewPoint);
        const text = `${worst.margin < 0 ? '結露' : '余裕'} ${sgn(worst.margin)} ℃`;
        const pw = textWidth(text) + 18;
        const bx = px + 9 + pw < W - 4 ? px + 9 : px - 9 - pw;
        const my = (yt + yd) / 2;
        return (
          <g>
            <line x1={px} x2={px} y1={yt} y2={yd} stroke={mark} strokeWidth={1.5} />
            <circle cx={px} cy={yt} r={4} fill="#ffffff" stroke={mark} strokeWidth={2} />
            <circle cx={px} cy={yd} r={4} fill="#ffffff" stroke={mark} strokeWidth={2} />
            <rect x={bx} y={my - 11} width={pw} height={22} rx={11} fill={mark} />
            <text x={bx + pw / 2} y={my + 4} fontSize={11} fontWeight={700} fill="#ffffff" textAnchor="middle">{text}</text>
          </g>
        );
      })()}

      {/* なぞっている界面 */}
      {hoverK !== null && p.interfaces[hoverK] && (
        <g>
          <line x1={xs[hoverK]} x2={xs[hoverK]} y1={PT} y2={H - PB} stroke={INK} strokeWidth={0.8} />
          <circle cx={xs[hoverK]} cy={y(p.interfaces[hoverK].temp)} r={3.4} fill={INK} />
          <circle cx={xs[hoverK]} cy={y(p.interfaces[hoverK].dewPoint)} r={3} fill="#ffffff" stroke={COLD} strokeWidth={1.4} />
        </g>
      )}

      {/* 層名の引き出し線 */}
      {labels.map((lb, i) => (
        <g key={i}>
          <line x1={lb.x} y1={PT} x2={lb.x} y2={lb.ty + 4} stroke={INK} strokeWidth={1} />
          <rect x={lb.x - 3} y={lb.ty} width={6} height={6} fill={INK} />
          <text x={lb.anchorEnd ? lb.x - 8 : lb.x + 8} y={lb.ty + 7} fontSize={11} fill={INK} textAnchor={lb.anchorEnd ? 'end' : 'start'}>{lb.text}</text>
        </g>
      ))}

      {/* 厚さ（下） */}
      {p.layers.map((l, i) => (xs[i + 1] - xs[i] >= 24 ? (
        <text key={i} x={(xs[i] + xs[i + 1]) / 2} y={H - PB + 13} textAnchor="middle" fontSize={10} fill={T3}>{l.d < 1 ? l.d : Math.round(l.d)}</text>
      ) : null))}
      <text x={x1} y={H - 4} textAnchor="end" fontSize={10} fill={T3}>{`厚さ mm${view === 'fit' ? '（幅は見やすさのため調整）' : ''}`}</text>
      {p.ventApplied && (
        <text x={(x0 + xs[Math.max(0, p.layers.findIndex((l) => !l.excluded))]) / 2} y={H - PB - 8} textAnchor="middle" fontSize={10} fill={T3}>計算対象外</text>
      )}

      {/* 空気の条件 */}
      <text x={8} y={y(te) + (outCold ? -10 : 22)} fontSize={12} fontWeight={700} fill={outColor}>{`${outLabel} ${f1(te)} ℃`}</text>
      <text x={8} y={y(te) + (outCold ? 18 : -10)} fontSize={11} fill={T3}>{`${rhe} %`}</text>
      <text x={W - 8} y={y(ti) + (outCold ? 22 : -10)} fontSize={12} fontWeight={700} fill={inColor} textAnchor="end">{`室内 ${f1(ti)} ℃`}</text>
      <text x={W - 8} y={y(ti) + (outCold ? 38 : -26)} fontSize={11} fill={T3} textAnchor="end">{`${rhi} %`}</text>
      <text x={W - 8} y={y(inDew) + 16} fontSize={11} fill={COLD} textAnchor="end">{`室内の露点 ${f1(inDew)} ℃`}</text>
      <text x={8} y={H - 4} fontSize={11} fill={T3}>{`${outLabel}側`}</text>
      <text x={W - 8} y={H - 4} fontSize={11} fill={T3} textAnchor="end">室内側</text>
    </svg>
  );
}
