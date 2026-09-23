'use client';
/**
 * 図面ボードの描画面。PDF の1ページを canvas に描き、その上の SVG に赤入れとポインタを重ねる。
 * 座標はページに対する 0〜1 の割合で受け渡す（参加者ごとに画面の大きさが違っても同じ所に載る）。
 */
import React, { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { decodePts, distToStroke, simplify, type Pt } from '@/lib/drawingBoard';
import type { Presence, Stroke } from './roomBackend';

export type Tool = 'pointer' | 'pen' | 'eraser';

type Props = {
  pdf: PDFDocumentProxy | null;
  page: number;
  /** 100 = 枠に収める。150・200 は拡大してスクロール */
  zoom: number;
  strokes: Stroke[];
  /** 前の回の赤入れ（薄く重ねる） */
  ghost: Stroke[];
  pointers: Presence[];
  tool: Tool;
  color: string;
  canErase: (s: Stroke) => boolean;
  onStroke: (pts: Pt[]) => void;
  onErase: (id: string) => void;
  onPointer: (p: Pt) => void;
};

export default function BoardCanvas({ pdf, page, zoom, strokes, ghost, pointers, tool, color, canErase, onStroke, onErase, onPointer }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderRef = useRef<RenderTask | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState({ w: 800, h: 600 });
  const [live, setLive] = useState<Pt[] | null>(null);
  const [error, setError] = useState('');
  const lastPointer = useRef(0);
  // 描いている途中の点。イベントの合間に描き直しが挟まらなくても取りこぼさないよう ref で持つ
  const liveRef = useRef<Pt[] | null>(null);

  // 枠の大きさを追う
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // ページを描く
  useEffect(() => {
    if (!pdf) return;
    let alive = true;
    (async () => {
      try {
        const p = await pdf.getPage(Math.min(page, pdf.numPages));
        const base = p.getViewport({ scale: 1 });
        const fit = Math.min((box.w - 16) / base.width, (box.h - 16) / base.height);
        const scale = Math.max(0.1, fit * (zoom / 100));
        const vp = p.getViewport({ scale });
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = canvasRef.current;
        if (!canvas || !alive) return;
        canvas.width = Math.floor(vp.width * dpr);
        canvas.height = Math.floor(vp.height * dpr);
        canvas.style.width = `${vp.width}px`;
        canvas.style.height = `${vp.height}px`;
        renderRef.current?.cancel();
        const task = p.render({
          canvasContext: canvas.getContext('2d')!,
          viewport: vp,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        } as Parameters<typeof p.render>[0]);
        renderRef.current = task;
        await task.promise;
        if (alive) {
          setSize({ w: vp.width, h: vp.height });
          setError('');
        }
      } catch (e) {
        if ((e as { name?: string })?.name !== 'RenderingCancelledException' && alive) setError('図面を描けませんでした');
      }
    })();
    return () => {
      alive = false;
    };
  }, [pdf, page, zoom, box.w, box.h]);

  const toPt = (e: React.PointerEvent): Pt | null => {
    if (!size) return null;
    const r = (e.currentTarget as SVGElement).getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const path = (pts: Pt[]) =>
    size ? pts.map((p, i) => `${i ? 'L' : 'M'}${(p.x * size.w).toFixed(1)} ${(p.y * size.h).toFixed(1)}`).join(' ') : '';

  const cursor = tool === 'pen' ? 'crosshair' : tool === 'eraser' ? 'cell' : 'default';

  return (
    <div ref={boxRef} className="relative w-full h-full overflow-auto bg-gray-200">
      {!pdf && <div className="absolute inset-0 flex items-center justify-center text-[12px] text-gray-500">図面の PDF がまだありません</div>}
      {error && <div className="absolute inset-x-0 top-2 text-center text-[12px] text-red-600">{error}</div>}
      <div className="relative mx-auto my-2" style={{ width: size?.w, height: size?.h }}>
        <canvas ref={canvasRef} className="block bg-white shadow" />
        {size && (
          <svg
            width={size.w}
            height={size.h}
            className="absolute inset-0 touch-none"
            style={{ cursor }}
            onPointerDown={(e) => {
              const p = toPt(e);
              if (!p) return;
              if (tool === 'pen') {
                try {
                  (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
                } catch {
                  /* 捕まえられなくても描ける（枠の外に出ると線が切れるだけ） */
                }
                liveRef.current = [p];
                setLive([p]);
              } else if (tool === 'eraser') {
                // 触った所から一番近い線（1% 以内）を消す
                let best: { id: string; d: number } | null = null;
                for (const s of strokes) {
                  if (!canErase(s)) continue;
                  const d = distToStroke(p, decodePts(s.pts));
                  if (d < 0.01 && (!best || d < best.d)) best = { id: s.id, d };
                }
                if (best) onErase(best.id);
              }
            }}
            onPointerMove={(e) => {
              const p = toPt(e);
              if (!p) return;
              if (liveRef.current) {
                liveRef.current = [...liveRef.current, p];
                setLive(liveRef.current);
              }
              const now = Date.now();
              // 自分のポインタは1秒に数回だけ送る（書き込みの数を抑える）
              if (now - lastPointer.current > 150) {
                lastPointer.current = now;
                onPointer(p);
              }
            }}
            onPointerUp={() => {
              const pts = liveRef.current;
              liveRef.current = null;
              if (pts && pts.length > 0) onStroke(simplify(pts));
              setLive(null);
            }}
            onPointerCancel={() => {
              liveRef.current = null;
              setLive(null);
            }}
          >
            {ghost.map((s) => (
              <path key={`g-${s.id}`} d={path(decodePts(s.pts))} stroke={s.color} strokeWidth={s.width} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.3} />
            ))}
            {strokes.map((s) => (
              <path key={s.id} d={path(decodePts(s.pts))} stroke={s.color} strokeWidth={s.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {live && <path d={path(live)} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
            {pointers.map((p) => (
              <g key={p.uid} transform={`translate(${p.x * size.w} ${p.y * size.h})`} pointerEvents="none">
                <circle r={9} fill={p.color} opacity={0.25} />
                <circle r={4} fill={p.color} />
                <text x={10} y={-8} fontSize={11} fill={p.color} fontWeight="bold" stroke="#fff" strokeWidth={3} paintOrder="stroke">
                  {p.name}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}
