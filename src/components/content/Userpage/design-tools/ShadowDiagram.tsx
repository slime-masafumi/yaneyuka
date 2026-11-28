'use client';
/**
 * 基本設計 › 日影図。DXF(または座標の手入力)から敷地と建物の外形を読み、
 * 時刻日影図・等時間日影線・5m / 10m の線を描いて、同じ座標の DXF で書き出す。
 * 計算は src/lib/shadowDiagram.ts。ファイルはブラウザの中だけで読む(どこにも送らない)。2026-11-28
 */
import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ResultRow } from '@/components/ui/Sheet';
import DtResult from './DtResult';
import { CITIES, SHADOW_ZONES, hm } from '@/lib/shadow';
import {
  chain,
  computeDiagram,
  contour,
  decodeDxf,
  heightFromText,
  hhmm,
  inPoly,
  parseDxf,
  polyArea,
  timeShadows,
  unitScale,
  writeDxf,
  type Block,
  type DxfEntity,
  type DiagramIn,
  type DxfRead,
  type Poly,
  type Pt,
} from '@/lib/shadowDiagram';

const field = 'w-full text-[12px] px-2 py-1.5';
const label = 'block text-[11px] font-bold text-gray-700 mb-1';
const box = 'bg-gray-50 p-3 border border-[#3b3b3b] space-y-2';
const ACCENT = '#2f6f5e';
const RED = '#b4402f';
const LEVELS = [1, 1.5, 2, 2.5, 3, 4, 5];

function Num({ k, v, set, step = '0.5' }: { k: string; v: string; set: (s: string) => void; step?: string }) {
  return (
    <label className="block">
      <span className="block text-[10px] text-gray-500 mb-1">{k}</span>
      <input type="number" step={step} value={v} onChange={(e) => set(e.target.value)} className={field} />
    </label>
  );
}

// ─── 手入力(見本) ──────────────────────────────────────────────
const SAMPLE_SITE = '0,0\n32,0\n32,26\n0,26';
type ManualBlock = { name: string; top: string; bottom: string; coords: string };
const SAMPLE_BLOCKS: ManualBlock[] = [
  { name: '低層部', top: '10', bottom: '0', coords: '4,4\n28,4\n28,12\n14,12\n14,20\n4,20' },
  { name: '高層部', top: '19', bottom: '10', coords: '4,4\n14,4\n14,20\n4,20' },
];
const parseCoords = (s: string): Poly =>
  s
    .split(/[\n;]+/)
    .map((l) => l.split(/[,\s\t]+/).filter(Boolean).map(Number))
    .filter((a) => a.length >= 2 && a.every(Number.isFinite))
    .map((a) => [a[0], a[1]] as Pt);

// ─── DXF の図形の役割 ──────────────────────────────────────────
type Role = 'site' | 'building' | 'ignore';
type ShapeSet = { role: Role; top: string; bottom: string };
const guessRole = (layer: string): Role | null =>
  /敷地|境界|SITE|BOUND|LOT|PLOT/i.test(layer) ? 'site' : /建物|建築|外形|躯体|輪郭|BLD|BUILD|BLDG|OUTLINE|MASS|棟/i.test(layer) ? 'building' : null;


type Unit = 'auto' | 'mm' | 'm';
const scaleOf = (read: DxfRead, unit: Unit) => (unit === 'auto' ? unitScale(read.insUnits, read.shapes) : { scale: unit === 'mm' ? 0.001 : 1, label: unit, guessed: false });
/** DXF の閉じた図形(m に直したもの) */
function closedOf(read: DxfRead, unit: Unit) {
  const us = scaleOf(read, unit);
  return read.shapes
    .map((s, idx) => ({ ...s, idx, ptsM: s.pts.map(([x, y]) => [x * us.scale, y * us.scale] as Pt), scale: us.scale }))
    .filter((s) => s.closed && s.pts.length >= 3)
    .map((s) => ({ ...s, area: Math.abs(polyArea(s.ptsM)) }));
}
type Closed = ReturnType<typeof closedOf>[number];
/** 読み込んだときの役割と高さの初期値: 画層の名前で敷地・建物を見分け、無ければいちばん大きい形を敷地に */
function initialSets(read: DxfRead, unit: Unit): Record<number, ShapeSet> {
  const cs = closedOf(read, unit);
  const next: Record<number, ShapeSet> = {};
  let site: Closed | null = null;
  for (const s of cs) if (guessRole(s.layer) === 'site' && (!site || s.area > site.area)) site = s;
  if (!site && cs.length >= 2) site = [...cs].sort((a, b) => b.area - a.area)[0];
  // 高さの文字は、それを囲むいちばん小さい形に付ける(段のある建物で上の段の文字が下の段にも入るため)
  const textH = new Map<number, number>();
  for (const t of read.texts) {
    const h = heightFromText(t.text);
    if (h === null) continue;
    const owner = cs.filter((s) => inPoly(s.pts, t.at[0], t.at[1]) && !textH.has(s.idx)).sort((a, b) => a.area - b.area)[0];
    if (owner && !textH.has(owner.idx)) textH.set(owner.idx, h);
  }
  for (const s of cs) {
    const r = guessRole(s.layer);
    const h = textH.get(s.idx) ?? (s.thickness > 0 ? s.thickness * s.scale : 10);
    next[s.idx] = { role: s === site ? 'site' : r === 'site' ? 'ignore' : (r ?? 'building'), top: String(+h.toFixed(3)), bottom: String(+(s.elevation * s.scale).toFixed(3)) };
  }
  return next;
}
type Model = { site: Poly | null; blocks: Block[]; origin: Pt; scale: number };
function manualModel(siteText: string, mBlocks: ManualBlock[]): Model {
  const site = parseCoords(siteText);
  const blocks: Block[] = mBlocks.map((b) => ({ name: b.name, poly: parseCoords(b.coords), top: Number(b.top), bottom: Number(b.bottom) || 0 })).filter((b) => b.poly.length >= 3 && b.top > 0);
  return { site: site.length >= 3 ? site : null, blocks, origin: [0, 0], scale: 1 };
}
function dxfModel(cs: Closed[], sets: Record<number, ShapeSet>, scale: number): Model {
  const siteS = cs.find((s) => sets[s.idx]?.role === 'site');
  const bl = cs.filter((s) => sets[s.idx]?.role === 'building');
  const all = [...(siteS ? siteS.ptsM : []), ...bl.flatMap((s) => s.ptsM)];
  const ox = all.length ? Math.min(...all.map((p) => p[0])) : 0;
  const oy = all.length ? Math.min(...all.map((p) => p[1])) : 0;
  const mv = (p: Pt[]) => p.map(([x, y]) => [x - ox, y - oy] as Pt);
  return {
    site: siteS ? mv(siteS.ptsM) : null,
    blocks: bl.map((s) => ({ name: `${s.layer} #${s.idx}`, poly: mv(s.ptsM), top: Number(sets[s.idx]?.top) || 0, bottom: Number(sets[s.idx]?.bottom) || 0 })).filter((b) => b.top > 0),
    origin: [ox, oy],
    scale,
  };
}

/** 平面図(拡大・移動つき) */
function Plan({
  site,
  blocks,
  out,
  shadows,
  isos,
  lines,
  limits,
  northDeg,
  canvasRef,
}: {
  site: Poly | null;
  blocks: Block[];
  out: ReturnType<typeof computeDiagram> | null;
  shadows: { t: number; loops: { pts: Pt[]; closed: boolean }[] }[];
  isos: { level: number; reg: boolean; loops: { pts: Pt[]; closed: boolean }[] }[];
  lines: { d: number; loops: { pts: Pt[]; closed: boolean }[] }[];
  limits: [number, number] | null;
  northDeg: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 640, h: 520 });
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 });
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showHours, setShowHours] = useState(true);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = Math.max(320, Math.floor(el.clientWidth));
      setSize({ w, h: Math.round(Math.min(640, Math.max(360, w * 0.8))) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ホイールで拡大(ページがスクロールしないように passive: false で付ける)
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = c.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      setView((v) => {
        const k = Math.min(40, Math.max(0.5, v.k * (e.deltaY < 0 ? 1.2 : 1 / 1.2)));
        const f = k / v.k;
        // カーソルの下の点を動かさない
        const cx = size.w / 2;
        const cy = size.h / 2;
        const sx = mx - (cx - cx * v.k) - v.tx;
        const sy = my - (cy - cy * v.k) - v.ty;
        return { k, tx: mx - (cx - cx * k) - sx * f, ty: my - (cy - cy * k) - sy * f };
      });
    };
    c.addEventListener('wheel', onWheel, { passive: false });
    return () => c.removeEventListener('wheel', onWheel);
  }, [canvasRef, size]);

  // 図面の範囲 → 画面
  // 最初の表示は、敷地(+12m)・建物・等時間日影線・10m の線が入る範囲。朝夕の長い影は拡大・移動で見る
  const fit = useMemo(() => {
    if (!out) return null;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    const add = (p: Pt, m = 0) => {
      x0 = Math.min(x0, p[0] - m);
      y0 = Math.min(y0, p[1] - m);
      x1 = Math.max(x1, p[0] + m);
      y1 = Math.max(y1, p[1] + m);
    };
    for (const p of site ?? []) add(p, 12);
    for (const b of blocks) for (const p of b.poly) add(p, 12);
    for (const iso of isos) for (const l of iso.loops) for (const p of l.pts) add(p, 3);
    for (const ln of lines) for (const l of ln.loops) for (const p of l.pts) add(p, 2);
    if (!Number.isFinite(x0)) {
      const g = out.grid;
      x0 = g.x0;
      y0 = g.y0;
      x1 = g.x0 + g.nx * g.step;
      y1 = g.y0 + g.ny * g.step;
    }
    const W = x1 - x0;
    const H = y1 - y0;
    const s = Math.min(size.w / W, size.h / H) * 0.94;
    return { s, ox: (size.w - W * s) / 2 - x0 * s, oy: (size.h + H * s) / 2 + y0 * s };
  }, [out, size, site, blocks, isos, lines]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !fit || !out) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = size.w * dpr;
    c.height = size.h * dpr;
    const g = c.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#f7f7f4';
    g.fillRect(0, 0, size.w, size.h);
    const s = fit.s * view.k;
    const X = (x: number) => (fit.ox + x * fit.s) * view.k + view.tx - (size.w / 2) * (view.k - 1);
    const Y = (y: number) => (fit.oy - y * fit.s) * view.k + view.ty - (size.h / 2) * (view.k - 1);
    const gr = out.grid;
    // 日影時間の濃淡と、規制時間を超えるところ
    if (showHours) {
      const cell = gr.step * s + 0.6;
      for (let j = 0; j < gr.ny; j++) {
        for (let i = 0; i < gr.nx; i++) {
          const k = j * gr.nx + i;
          const h = out.hours[k];
          if (h <= 0) continue;
          const d = out.dist[k];
          const over = limits !== null && ((d > 10 && h >= limits[1] - 1e-6) || (d > 5 && d <= 10 && h >= limits[0] - 1e-6));
          g.fillStyle = over ? 'rgba(180, 64, 47, 0.42)' : `rgba(59, 59, 59, ${Math.min(0.04 + h * 0.045, 0.4)})`;
          g.fillRect(X(gr.x0 + i * gr.step), Y(gr.y0 + (j + 1) * gr.step), cell, cell);
        }
      }
    }
    const path = (pts: Pt[], closed: boolean) => {
      g.beginPath();
      pts.forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))));
      if (closed) g.closePath();
    };
    // 時刻日影線
    g.lineWidth = 0.8;
    g.strokeStyle = '#6d6d68';
    g.fillStyle = '#6d6d68';
    g.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
    for (const sh of shadows) {
      for (const l of sh.loops) {
        path(l.pts, l.closed);
        g.stroke();
      }
      const tip = farthest(sh.loops, blocks);
      if (tip) g.fillText(hhmm(sh.t), X(tip[0]) + 2, Y(tip[1]) - 2);
    }
    // 5m・10m の線
    g.strokeStyle = ACCENT;
    for (const ln of lines) {
      g.setLineDash(ln.d === 5 ? [5, 3] : [1.5, 3]);
      for (const l of ln.loops) {
        path(l.pts, l.closed);
        g.stroke();
      }
    }
    g.setLineDash([]);
    // 等時間日影線
    for (const iso of isos) {
      g.strokeStyle = iso.reg ? RED : '#3d6fa8';
      g.lineWidth = iso.reg ? 1.6 : 1;
      g.fillStyle = g.strokeStyle;
      for (const l of iso.loops) {
        path(l.pts, l.closed);
        g.stroke();
      }
      const lab = longestMid(iso.loops);
      if (lab) {
        g.font = 'bold 10px ui-monospace, SFMono-Regular, Menlo, monospace';
        g.fillText(`${iso.level}h`, X(lab[0]) + 3, Y(lab[1]) - 3);
      }
    }
    g.lineWidth = 1;
    // 敷地・建物
    if (site) {
      g.strokeStyle = '#2b2b2b';
      g.lineWidth = 1.4;
      path(site, true);
      g.stroke();
      g.lineWidth = 1;
    }
    for (const b of blocks) {
      g.fillStyle = 'rgba(43, 43, 43, 0.82)';
      path(b.poly, true);
      g.fill();
      g.strokeStyle = '#f7f7f4';
      g.stroke();
    }
    // 最大になる点
    for (const [p, c] of [
      [out.atNear, '5–10m'],
      [out.atFar, '10m+'],
    ] as [Pt | null, string][]) {
      if (!p) continue;
      g.strokeStyle = '#2b2b2b';
      g.strokeRect(X(p[0]) - 3, Y(p[1]) - 3, 6, 6);
      g.beginPath();
      g.moveTo(X(p[0]) + 3, Y(p[1]) - 3);
      g.lineTo(X(p[0]) + 14, Y(p[1]) - 14);
      g.stroke();
      g.fillStyle = '#2b2b2b';
      g.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
      g.fillText(`max ${c}`, X(p[0]) + 16, Y(p[1]) - 15);
    }
    // 真北
    g.save();
    g.translate(size.w - 28, 32);
    g.rotate((northDeg * Math.PI) / 180);
    g.strokeStyle = '#2b2b2b';
    g.beginPath();
    g.moveTo(0, 15);
    g.lineTo(0, -15);
    g.lineTo(-4, -7);
    g.moveTo(0, -15);
    g.lineTo(4, -7);
    g.stroke();
    g.fillStyle = '#2b2b2b';
    g.font = '10px ui-monospace, monospace';
    g.textAlign = 'center';
    g.fillText('N', 0, -19);
    g.restore();
    // 縮尺(10m)
    g.strokeStyle = '#2b2b2b';
    g.beginPath();
    g.moveTo(14, size.h - 14);
    g.lineTo(14 + 10 * s, size.h - 14);
    g.stroke();
    g.fillStyle = '#2b2b2b';
    g.font = '9px ui-monospace, monospace';
    g.fillText('10 m', 14, size.h - 18);
  }, [out, fit, view, size, shadows, isos, lines, site, blocks, limits, northDeg, showHours, canvasRef]);

  return (
    <div ref={wrap} className="w-full">
      <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-1">
        <span className="font-mono uppercase tracking-[0.1em]">plan</span>
        <button type="button" className="underline" onClick={() => setView({ k: 1, tx: 0, ty: 0 })}>
          全体を表示
        </button>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={showHours} onChange={(e) => setShowHours(e.target.checked)} /> 日影時間の濃淡
        </label>
        <span>ホイールで拡大・ドラッグで移動</span>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: size.w, height: size.h, cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        className="border border-[#3b3b3b] block"
        aria-label="日影図(時刻日影線・等時間日影線・5m と 10m の線)"
        onPointerDown={(e) => {
          (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
          setDragging(true);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          setView((v) => ({ ...v, tx: d.tx + e.clientX - d.x, ty: d.ty + e.clientY - d.y }));
        }}
        onPointerUp={() => {
          drag.current = null;
          setDragging(false);
        }}
      />
    </div>
  );
}

/** 時刻の文字を置く点: 建物からいちばん遠い影の点 */
function farthest(loops: { pts: Pt[] }[], blocks: Block[]): Pt | null {
  const all = blocks.flatMap((b) => b.poly);
  if (!all.length) return null;
  const cx = all.reduce((a, p) => a + p[0], 0) / all.length;
  const cy = all.reduce((a, p) => a + p[1], 0) / all.length;
  let best: Pt | null = null;
  let bd = -1;
  for (const l of loops)
    for (const p of l.pts) {
      const d = Math.hypot(p[0] - cx, p[1] - cy);
      if (d > bd) {
        bd = d;
        best = p;
      }
    }
  return best;
}
/** 等時間日影線の文字を置く点: いちばん長い線の真ん中 */
function longestMid(loops: { pts: Pt[] }[]): Pt | null {
  let best: Pt[] | null = null;
  for (const l of loops) if (!best || l.pts.length > best.length) best = l.pts;
  return best && best.length ? best[Math.floor(best.length / 2)] : null;
}

export default function ShadowDiagram() {
  const [src, setSrc] = useState<'manual' | 'dxf'>('manual');
  const [siteText, setSiteText] = useState(SAMPLE_SITE);
  const [mBlocks, setMBlocks] = useState<ManualBlock[]>(SAMPLE_BLOCKS);
  const [dxf, setDxf] = useState<{ name: string; read: DxfRead } | null>(null);
  const [dxfErr, setDxfErr] = useState('');
  const [unit, setUnit] = useState<Unit>('auto');
  const [sets, setSets] = useState<Record<number, ShapeSet>>({});
  const [city, setCity] = useState('東京');
  const [lat, setLat] = useState('35.68');
  const [hokkaido, setHokkaido] = useState(false);
  const [north, setNorth] = useState('0');
  const [zone, setZone] = useState('mid');
  const [go, setGo] = useState('(一)');
  const [plane, setPlane] = useState('4');
  const [interval, setIntervalMin] = useState(60);
  const [fine, setFine] = useState(false);
  const [levels, setLevels] = useState<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const z = SHADOW_ZONES.find((x) => x.id === zone) ?? SHADOW_ZONES[0];
  const row = z.rows.find((x) => x.go === go) ?? z.rows[0];
  // 規制時間は数値だけを依存にする(z・row から直接求めると React Compiler が下の useMemo を最適化できない。ShadowCalc と同じ)
  const lim = useMemo(() => {
    const zz = SHADOW_ZONES.find((x) => x.id === zone) ?? SHADOW_ZONES[0];
    const rr = zz.rows.find((x) => x.go === go) ?? zz.rows[0];
    return hokkaido ? `${rr.nearH},${rr.farH}` : `${rr.near},${rr.far}`;
  }, [zone, go, hokkaido]);
  const [nearH, farH] = lim.split(',').map(Number);
  const planeN = z.planes.includes(Number(plane)) ? Number(plane) : z.planes[0];
  const regLevels = [...new Set([nearH, farH])];
  const levelsKey = useMemo(() => [...new Set([...lim.split(',').map(Number), ...levels])].sort((x, y) => x - y).join(','), [lim, levels]);

  const closedShapes = dxf ? closedOf(dxf.read, unit) : [];
  const scaleInfo = dxf ? scaleOf(dxf.read, unit) : null;

  // 計算に使う敷地と建物(DXF は左下を原点に寄せて計算し、書き出すときに戻す)
  const model = src === 'manual' ? manualModel(siteText, mBlocks) : dxfModel(closedShapes, sets, scaleInfo?.scale ?? 1);
  const input: DiagramIn = { lat: Number(lat), hokkaido, northDeg: Number(north) || 0, plane: planeN, site: model.site, blocks: model.blocks, stepMin: fine ? 2 : 5, maxCells: fine ? 220000 : 70000 };
  // 重い計算は入力を文字にしたものが変わったときだけ(打っている間は前の図を出しておく)
  const inputKey = JSON.stringify(input);
  const deferredKey = useDeferredValue(inputKey);
  const busy = deferredKey !== inputKey;
  const calc = useMemo(() => {
    const v = JSON.parse(deferredKey) as DiagramIn;
    if (!(v.blocks.length > 0 && v.lat > 20 && v.lat < 50)) return null;
    const lv = levelsKey.split(',').map(Number);
    const out = computeDiagram(v);
    const shadows = timeShadows(v, interval).map((x) => ({ t: x.t, loops: chain(x.segs) }));
    const reg = lim.split(',').map(Number);
    const isos = lv.map((l) => ({ level: l, reg: reg.includes(l), loops: chain(contour(out.hours, out.grid, l - 1e-4)) }));
    const lines = v.site ? [5, 10].map((d) => ({ d, loops: chain(contour(out.dist, out.grid, d)) })) : [];
    return { v, out, shadows, isos, lines };
  }, [deferredKey, interval, levelsKey, lim]);
  const deferred = calc?.v ?? input;

  const out = calc?.out ?? null;
  const ngNear = out ? out.maxNear >= nearH - 1e-6 : false;
  const ngFar = out ? out.maxFar >= farH - 1e-6 : false;
  const maxTop = Math.max(0, ...model.blocks.map((b) => b.top));
  const lowType = z.id === 'low' || z.id === 'none-i';
  const covered = lowType ? maxTop > 7 : maxTop > 10;

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setDxfErr('');
    try {
      if (f.size > 40 * 1024 * 1024) throw new Error('40MB を超える DXF は読めません');
      if (!/\.dxf$/i.test(f.name)) throw new Error('DXF(.dxf)を選んでください。DWG・JWW は CAD で DXF に書き出してから');
      const text = decodeDxf(await f.arrayBuffer());
      if (/^AC10\d\d/.test(text.slice(0, 6)) || text.includes('\u0000')) throw new Error('バイナリ形式の DXF は読めません。ASCII 形式で書き出してください');
      const read = parseDxf(text);
      if (!read.shapes.some((s) => s.closed)) throw new Error('閉じた線(ポリライン・つながった線)が見つかりません。敷地と建物の外形を閉じたポリラインにしてください');
      setDxf({ name: f.name, read });
      setUnit('auto');
      setSets(initialSets(read, 'auto'));
      setSrc('dxf');
    } catch (e) {
      setDxfErr(e instanceof Error ? e.message : String(e));
    }
  };

  const download = (blob: Blob, name: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const exportDxf = () => {
    if (!calc) return;
    const [ox, oy] = model.origin;
    const back = (pts: Pt[]) => pts.map(([x, y]) => [x + ox, y + oy] as Pt);
    const ents: DxfEntity[] = [];
    const layers = [
      { name: 'SITE', color: 7 },
      { name: 'BUILDING', color: 7 },
      { name: 'LINE_5M', color: 3 },
      { name: 'LINE_10M', color: 3 },
      { name: 'TIME_SHADOW', color: 8 },
      { name: 'TIME_LABEL', color: 8 },
      ...calc.isos.map((i) => ({ name: `ISO_${i.level}H`, color: i.reg ? 1 : 5 })),
      { name: 'ISO_LABEL', color: 1 },
      { name: 'NOTE', color: 7 },
    ];
    if (model.site) ents.push({ type: 'poly', layer: 'SITE', pts: back(model.site), closed: true });
    for (const b of model.blocks) {
      ents.push({ type: 'poly', layer: 'BUILDING', pts: back(b.poly), closed: true });
      const c = b.poly.reduce((a, p) => [a[0] + p[0] / b.poly.length, a[1] + p[1] / b.poly.length], [0, 0]);
      ents.push({ type: 'text', layer: 'BUILDING', at: back([c as Pt])[0], h: 0.6, text: `H=${b.top}` });
    }
    for (const ln of calc.lines) for (const l of ln.loops) ents.push({ type: 'poly', layer: ln.d === 5 ? 'LINE_5M' : 'LINE_10M', pts: back(l.pts), closed: l.closed });
    for (const sh of calc.shadows) {
      for (const l of sh.loops) ents.push({ type: 'poly', layer: 'TIME_SHADOW', pts: back(l.pts), closed: l.closed });
      const tip = farthest(sh.loops, model.blocks);
      if (tip) ents.push({ type: 'text', layer: 'TIME_LABEL', at: back([tip])[0], h: 0.6, text: hhmm(sh.t) });
    }
    for (const iso of calc.isos) {
      for (const l of iso.loops) ents.push({ type: 'poly', layer: `ISO_${iso.level}H`, pts: back(l.pts), closed: l.closed });
      const m = longestMid(iso.loops);
      if (m) ents.push({ type: 'text', layer: 'ISO_LABEL', at: back([m])[0], h: 0.7, text: `${iso.level}h` });
    }
    const g = calc.out.grid;
    const noteAt = back([[g.x0, g.y0 - 2]])[0];
    const notes = [
      `SHADOW DIAGRAM  WINTER SOLSTICE  TRUE SOLAR TIME ${calc.out.t0}:00-${calc.out.t1}:00`,
      `LAT ${deferred.lat}  MEASURING PLANE ${deferred.plane} m  TRUE NORTH ${deferred.northDeg} deg CW FROM +Y`,
      `LIMIT ${nearH}h (5-10m) / ${farH}h (>10m)   MAX ${out!.maxNear.toFixed(2)}h / ${out!.maxFar.toFixed(2)}h`,
      `REFERENCE ONLY - yaneyuka.com/calc/shadow-diagram/`,
    ];
    notes.forEach((t, i) => ents.push({ type: 'text', layer: 'NOTE', at: [noteAt[0], noteAt[1] - i * 1.2], h: 0.6, text: t }));
    const txt = writeDxf(layers, ents, model.scale);
    const base = dxf && src === 'dxf' ? dxf.name.replace(/\.dxf$/i, '') : 'yaneyuka';
    download(new Blob([txt], { type: 'application/dxf' }), `${base}_shadow.dxf`);
  };

  const exportPng = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.toBlob((b) => b && download(b, 'shadow-diagram.png'));
  };

  return (
    <div className="p-4 text-[12px] text-gray-700">
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
        <div className="space-y-3">
          <div className={box}>
            <span className={label}>敷地と建物の外形</span>
            <div className="grid grid-cols-2 gap-1">
              {(
                [
                  ['dxf', 'DXF を読み込む'],
                  ['manual', '座標を入れる'],
                ] as const
              ).map(([k, t]) => (
                <button key={k} type="button" onClick={() => setSrc(k)} aria-pressed={src === k} className={`text-[11px] px-2 py-1.5 border bg-white ${src === k ? 'border-[#2f6f5e] text-[#2f6f5e] font-bold' : 'border-gray-300 text-gray-600'}`}>
                  {t}
                </button>
              ))}
            </div>
            {src === 'dxf' && (
              <>
                <input type="file" accept=".dxf" onChange={(e) => onFile(e.target.files?.[0])} className="block w-full text-[11px]" aria-label="DXF ファイル" />
                {dxfErr && <p className="text-[11px] text-[#b4402f]">{dxfErr}</p>}
                <p className="text-[10px] text-gray-400">
                  ファイルはこのブラウザの中だけで読み、どこにも送りません。敷地と建物の外形を閉じたポリライン(LWPOLYLINE・POLYLINE・つながった LINE)にした ASCII の DXF。建物の中に「H=12.5」のような文字があれば高さとして拾います。
                </p>
                {dxf && (
                  <>
                    <div className="grid grid-cols-2 gap-2 items-end">
                      <label className="block">
                        <span className="block text-[10px] text-gray-500 mb-1">図面の単位</span>
                        <select
                          value={unit}
                          onChange={(e) => {
                            const u = e.target.value as Unit;
                            setUnit(u);
                            setSets(initialSets(dxf.read, u));
                          }}
                          className={field}
                        >
                          <option value="auto">自動({scaleInfo?.label}{scaleInfo?.guessed ? '・推定' : ''})</option>
                          <option value="mm">mm</option>
                          <option value="m">m</option>
                        </select>
                      </label>
                      <p className="text-[10px] text-gray-500 pb-2 font-mono truncate" title={dxf.name}>
                        {dxf.name}
                      </p>
                    </div>
                    {dxf.read.warnings.map((w) => (
                      <p key={w} className="text-[10px] text-[#b4402f]">
                        {w}
                      </p>
                    ))}
                    <div className="max-h-[260px] overflow-auto border-t border-gray-300">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="text-[10px] text-gray-500">
                            <th className="text-left font-normal py-1">画層・面積</th>
                            <th className="text-left font-normal">役割</th>
                            <th className="text-left font-normal">上端 m</th>
                            <th className="text-left font-normal">下端 m</th>
                          </tr>
                        </thead>
                        <tbody>
                          {closedShapes.map((s) => {
                            const st = sets[s.idx] ?? { role: 'ignore', top: '10', bottom: '0' };
                            const up = (p: Partial<ShapeSet>) =>
                              setSets((m) => {
                                const n = { ...m, [s.idx]: { ...st, ...p } };
                                // 敷地は 1 つだけ
                                if (p.role === 'site') for (const k of Object.keys(n)) if (Number(k) !== s.idx && n[Number(k)].role === 'site') n[Number(k)] = { ...n[Number(k)], role: 'ignore' };
                                return n;
                              });
                            return (
                              <tr key={s.idx} className="border-t border-gray-200">
                                <td className="py-1 pr-1">
                                  <span className="block truncate max-w-[96px]" title={s.layer}>
                                    {s.layer}
                                  </span>
                                  <span className="text-[10px] text-gray-400 font-mono">{s.area.toFixed(1)} m²</span>
                                </td>
                                <td>
                                  <select value={st.role} onChange={(e) => up({ role: e.target.value as Role })} className="text-[11px] px-1 py-0.5 w-[66px]">
                                    <option value="site">敷地</option>
                                    <option value="building">建物</option>
                                    <option value="ignore">使わない</option>
                                  </select>
                                </td>
                                <td>{st.role === 'building' && <input type="number" step="0.1" value={st.top} onChange={(e) => up({ top: e.target.value })} className="w-[54px] text-[11px] px-1 py-0.5" aria-label="上端の高さ" />}</td>
                                <td>{st.role === 'building' && <input type="number" step="0.1" value={st.bottom} onChange={(e) => up({ bottom: e.target.value })} className="w-[48px] text-[11px] px-1 py-0.5" aria-label="下端の高さ" />}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[10px] text-gray-400">高さは平均地盤面から。段のある建物は、段ごとに外形を描き(上の段は下端 = 下の段の上端)、棟ごとに高さを入れます。</p>
                  </>
                )}
              </>
            )}
            {src === 'manual' && (
              <>
                <label className="block">
                  <span className="block text-[10px] text-gray-500 mb-1">敷地の頂点(m・1 行に x,y)</span>
                  <textarea value={siteText} onChange={(e) => setSiteText(e.target.value)} rows={4} className={`${field} font-mono`} />
                </label>
                {mBlocks.map((b, i) => {
                  const up = (p: Partial<ManualBlock>) => setMBlocks((l) => l.map((x, j) => (j === i ? { ...x, ...p } : x)));
                  return (
                    <div key={i} className="border-t border-gray-300 pt-2 space-y-1">
                      <div className="grid grid-cols-[1fr_64px_64px_auto] gap-1 items-end">
                        <input value={b.name} onChange={(e) => up({ name: e.target.value })} className={field} aria-label="棟の名前" />
                        <Num k="上端 m" v={b.top} set={(x) => up({ top: x })} />
                        <Num k="下端 m" v={b.bottom} set={(x) => up({ bottom: x })} />
                        <button type="button" onClick={() => setMBlocks((l) => l.filter((_, j) => j !== i))} className="text-[11px] text-gray-500 underline pb-2">
                          削除
                        </button>
                      </div>
                      <textarea value={b.coords} onChange={(e) => up({ coords: e.target.value })} rows={3} className={`${field} font-mono`} aria-label={`${b.name}の頂点`} />
                    </div>
                  );
                })}
                <button type="button" className="text-[11px] underline text-[#2f6f5e]" onClick={() => setMBlocks((l) => [...l, { name: `棟 ${l.length + 1}`, top: '10', bottom: '0', coords: '0,0\n10,0\n10,10\n0,10' }])}>
                  棟を足す
                </button>
              </>
            )}
          </div>

          <div className={box}>
            <span className={label}>場所と向き</span>
            <select
              value={city}
              onChange={(e) => {
                const c = CITIES.find((x) => x.label === e.target.value);
                setCity(e.target.value);
                if (c) {
                  setLat(String(c.lat));
                  setHokkaido(!!c.hokkaido);
                }
              }}
              className={field}
            >
              {CITIES.map((c) => (
                <option key={c.label} value={c.label}>
                  {c.label}(北緯 {c.lat}°)
                </option>
              ))}
              <option value="">緯度を入れる</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Num k="北緯(°)" v={lat} set={setLat} step="0.01" />
              <Num k="真北(図面の上から時計回り °)" v={north} set={setNorth} step="0.1" />
            </div>
            <label className="flex items-center gap-1 text-[11px]">
              <input type="checkbox" checked={hokkaido} onChange={(e) => setHokkaido(e.target.checked)} /> 北海道の区域(9〜15 時)
            </label>
          </div>

          <div className={box}>
            <span className={label}>規制(別表第 4・条例で指定)</span>
            <select
              value={zone}
              onChange={(e) => {
                const nz = SHADOW_ZONES.find((x) => x.id === e.target.value) ?? SHADOW_ZONES[0];
                setZone(nz.id);
                setGo(nz.rows[0].go);
                setPlane(String(nz.planes[0]));
              }}
              className={field}
            >
              {SHADOW_ZONES.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="block text-[10px] text-gray-500 mb-1">号</span>
                <select value={go} onChange={(e) => setGo(e.target.value)} className={field}>
                  {z.rows.map((x) => (
                    <option key={x.go} value={x.go}>
                      {x.go} {hokkaido ? x.nearH : x.near}h / {hokkaido ? x.farH : x.far}h
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-[10px] text-gray-500 mb-1">測定面</span>
                <select value={planeN} onChange={(e) => setPlane(e.target.value)} className={field}>
                  {z.planes.map((p) => (
                    <option key={p} value={p}>
                      {p} m
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className={box}>
            <span className={label}>描くもの</span>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="block text-[10px] text-gray-500 mb-1">時刻日影線</span>
                <select value={interval} onChange={(e) => setIntervalMin(Number(e.target.value))} className={field}>
                  <option value={60}>1 時間ごと</option>
                  <option value={30}>30 分ごと</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-[10px] text-gray-500 mb-1">計算の細かさ</span>
                <select value={fine ? 'fine' : 'std'} onChange={(e) => setFine(e.target.value === 'fine')} className={field}>
                  <option value="std">標準(5 分刻み)</option>
                  <option value="fine">細かい(2 分刻み)</option>
                </select>
              </label>
            </div>
            <span className="block text-[10px] text-gray-500">等時間日影線(赤 = 規制時間。ほかに足す線)</span>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {LEVELS.map((lv) => (
                <label key={lv} className={`flex items-center gap-1 text-[11px] font-mono ${regLevels.includes(lv) ? 'text-[#b4402f]' : ''}`}>
                  <input type="checkbox" disabled={regLevels.includes(lv)} checked={regLevels.includes(lv) || levels.includes(lv)} onChange={(e) => setLevels((l) => (e.target.checked ? [...l, lv] : l.filter((x) => x !== lv)))} />
                  {lv}h
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3 min-w-0">
          {calc && out ? (
            <>
              <div className="flex flex-wrap gap-4 items-start">
                <div className="flex-1 min-w-[260px] max-w-[440px]">
                  <DtResult
                    label={`日影時間の最大(冬至日 真太陽時 ${out.t0}〜${out.t1} 時・測定面 ${planeN}m)`}
                    value={!deferred.site ? '敷地が未設定' : ngNear || ngFar ? '超える' : '収まる'}
                    text
                    ng={!!deferred.site && (ngNear || ngFar)}
                    sub={`規制 ${nearH} 時間 / ${farH} 時間以上の日影を生じさせない(${z.label} ${row.go})`}
                  >
                    <ResultRow k="5m を超え 10m 以内" v={`${hm(out.maxNear)}(${nearH} 時間未満であること)${ngNear ? ' · 超える' : ''}`} />
                    <ResultRow k="10m を超える範囲" v={`${hm(out.maxFar)}(${farH} 時間未満であること)${ngFar ? ' · 超える' : ''}`} />
                    <ResultRow k="規制の対象か(別表第 4(ろ)欄の目安)" v={covered ? `対象になりうる(最高 ${maxTop} m)` : `最高 ${maxTop} m。${lowType ? '軒の高さ 7m 以下・地階を除く 2 階以下なら' : '高さ 10m 以下なら'}対象外`} />
                    <ResultRow k="計算の細かさ" v={`${out.grid.step} m 格子・${deferred.stepMin} 分刻み${busy ? '(計算中…)' : ''}`} />
                  </DtResult>
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  <button type="button" onClick={exportDxf} className="text-[12px] px-3 py-2 border border-[#2f6f5e] text-[#2f6f5e] bg-white hover:bg-[#2f6f5e] hover:text-white">
                    DXF で書き出す
                  </button>
                  <button type="button" onClick={exportPng} className="text-[11px] px-3 py-1.5 border border-gray-400 bg-white">
                    画像(PNG)で保存
                  </button>
                  <p className="text-[10px] text-gray-400 max-w-[180px]">DXF は読み込んだ図面と同じ座標・単位。画層: SITE / BUILDING / LINE_5M / LINE_10M / TIME_SHADOW / ISO_◯H / NOTE</p>
                </div>
              </div>
              <Plan site={deferred.site} blocks={deferred.blocks} out={out} shadows={calc.shadows} isos={calc.isos} lines={calc.lines} limits={deferred.site ? [nearH, farH] : null} northDeg={deferred.northDeg} canvasRef={canvasRef} />
              <div className="flex flex-wrap gap-4 text-[10px] text-gray-500 font-mono">
                <span><span className="inline-block w-5 h-px align-middle mr-1" style={{ background: '#6d6d68' }} />時刻日影線</span>
                <span><span className="inline-block w-5 h-[2px] align-middle mr-1" style={{ background: RED }} />規制時間の等時間日影線</span>
                <span><span className="inline-block w-5 h-px align-middle mr-1" style={{ background: '#3d6fa8' }} />足した等時間日影線</span>
                <span><span className="inline-block w-5 border-t border-dashed align-middle mr-1" style={{ borderColor: ACCENT }} />5m・10m の線</span>
                <span><span className="inline-block w-3 h-3 align-middle mr-1" style={{ background: 'rgba(180,64,47,0.42)' }} />規制時間以上の範囲</span>
              </div>
            </>
          ) : (
            <p className="text-[12px] text-gray-500 border border-dashed border-gray-400 p-6">{src === 'dxf' && !dxf ? 'DXF を選ぶと、ここに日影図が出ます。' : '建物(高さ 0 より大きい棟)と緯度を入れてください。'}</p>
          )}
          <div className="text-[10px] text-gray-500 space-y-1 border-t border-[#3b3b3b] pt-2">
            <p>
              <b>考え方</b> 冬至日(赤緯 −23.44°)の真太陽時で太陽の位置を出し、各棟(上端・下端の高さの角柱)が測定面に落とす影を求めます。時刻日影線は影の輪郭を正確に、等時間日影線は格子の各点で影になる時間を数えてその等値線を描きます。5m・10m の線は敷地境界線からの水平距離です(法 56 条の 2・別表第 4)。
            </p>
            <p>
              <b>この図で扱わないもの</b> 道路・水面・線路敷等の緩和と高低差の緩和(令 135 条の 12 第 3 項。緩和した境界線を敷地として描けば反映できます)、区域がまたがる場合(令 135 条の 13)、隣の建物の影。条例で別の時間帯・測定面を定めている自治体もあります。区域・塔屋の扱いは「日影規制」のツールで確かめてください。計画の初期検討用で、確認申請の日影図の代わりにはなりません。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
