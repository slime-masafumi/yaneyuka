'use client';
/** 結果の図 1 枚。開口・柱のドラッグと、点をタップしたときの読み取りを受ける。 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { FlowModel, FlowResult } from '@/lib/forceFlow';
import { computeLayout, drawFlow, hitZone, toModel, PAPER, type FlowView } from './flowDraw';

type Props = {
  model: FlowModel;
  result: FlowResult | null;
  view: FlowView;
  scale: number;
  deform: number;
  zoom?: number;
  maxHeight: number;
  selectedZone?: string | null;
  probe?: { x: number; y: number } | null;
  /** 渡さないと読み取り専用（説明モード） */
  onZoneMove?: (id: string, x: number, y: number) => void;
  onSelectZone?: (id: string | null) => void;
  onProbe?: (p: { x: number; y: number }) => void;
  ariaLabel: string;
};

const SNAP = 50;

export default function FlowCanvas({ model, result, view, scale, deform, zoom = 1, maxHeight, selectedZone, probe, onZoneMove, onSelectZone, onProbe, ariaLabel }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const dragRef = useRef<{ id: string; offX: number; offY: number; moved: boolean } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    // 小数の幅を切り上げると canvas がはみ出してスクロールバーが出るので切り捨てる
    const measure = () => setWidth(Math.floor(el.getBoundingClientRect().width));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(() => computeLayout(model, Math.max(width, 200) * zoom, maxHeight * zoom), [model, width, zoom, maxHeight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(layout.w * dpr);
    canvas.height = Math.round(layout.h * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawFlow(ctx, { model, result, view, layout, scale, deform, selectedZone, probe });
  }, [model, result, view, layout, scale, deform, selectedZone, probe, width]);

  const locate = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return toModel(layout, e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'touch' || !onZoneMove) return; // タッチはスクロールを優先し、タップの読み取りだけにする
    const p = locate(e);
    const z = hitZone(model, p.x, p.y, 4 / layout.ppm);
    if (!z) return;
    dragRef.current = { id: z.id, offX: p.x - z.x, offY: p.y - z.y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
    onSelectZone?.(z.id);
  };

  const handleMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = locate(e);
    const drag = dragRef.current;
    if (!drag) {
      if (e.pointerType !== 'touch' && onZoneMove) e.currentTarget.style.cursor = hitZone(model, p.x, p.y, 4 / layout.ppm) ? 'move' : 'crosshair';
      return;
    }
    const z = model.zones.find((v) => v.id === drag.id);
    if (!z) return;
    const nx = Math.max(0, Math.min(model.width - z.w, Math.round((p.x - drag.offX) / SNAP) * SNAP));
    const ny = Math.max(0, Math.min(model.height - z.h, Math.round((p.y - drag.offY) / SNAP) * SNAP));
    if (nx !== z.x || ny !== z.y) {
      drag.moved = true;
      onZoneMove?.(z.id, nx, ny);
    }
  };

  const handleUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.moved) return;
    if (!drag) onSelectZone?.(null);
    const p = locate(e);
    if (p.x >= 0 && p.y >= 0 && p.x <= model.width && p.y <= model.height) onProbe?.(p);
  };

  return (
    <div ref={wrapRef} className={`w-full ${zoom > 1 ? 'overflow-x-auto' : 'overflow-hidden'}`} style={{ background: PAPER }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
        style={{ width: layout.w, height: layout.h, display: 'block', touchAction: 'pan-x pan-y' }}
      />
    </div>
  );
}
