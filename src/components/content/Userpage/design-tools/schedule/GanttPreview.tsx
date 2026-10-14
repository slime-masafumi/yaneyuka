'use client';
/**
 * 工程表のページを並べて出す（設計ツールの工程表と、閲覧リンクのページで共用）。
 * 表示範囲・ページ分け・クリティカルパスはここで決める。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { criticalPath, displayRange, iso, monthsToFit, paginate, type GanttTask, type Holidays, type WorkCalendar } from '@/lib/gantt';
import GanttPage, { DEFAULT_OPTIONS, rowsPerPage, type ChartOptions, type DragResult } from './GanttPage';

export type ViewSettings = ChartOptions & {
  /** 表示する月数。0 = 工程が全部入る長さ */
  months: number;
  /** 表示開始（その月の 1 日から）。空 = 最初の工程の月 */
  displayStart: string;
  /** 前工程が延びたら後ろを押し出す */
  autoPush: boolean;
};

export const DEFAULT_VIEW: ViewSettings = { ...DEFAULT_OPTIONS, months: 0, displayStart: '', autoPush: true };

export function normalizeView(raw: unknown): ViewSettings {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...DEFAULT_VIEW };
  for (const [k, def] of Object.entries(DEFAULT_VIEW)) {
    if (typeof v[k] === typeof def) out[k] = v[k];
  }
  const o = out as ViewSettings;
  if (!['day', 'week', 'month'].includes(o.unit)) o.unit = 'day';
  if (!['A3', 'A4'].includes(o.paper)) o.paper = 'A3';
  o.rowH = Math.min(40, Math.max(18, o.rowH));
  o.months = Math.min(36, Math.max(0, Math.round(o.months)));
  return o;
}

type Props = {
  tasks: GanttTask[];
  cal: WorkCalendar;
  holidays: Holidays;
  view: ViewSettings;
  title: string;
  sub?: string;
  author?: string;
  updated?: string;
  zoom: number;
  editable?: boolean;
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  onDrag?: (r: DragResult) => void;
  /** 印刷用に、描いた SVG を受け取る */
  pagesRef?: React.MutableRefObject<SVGSVGElement[]>;
  /** 画面の高さ（px）。省略で 640 */
  height?: number | string;
};

export default function GanttPreview({ tasks, cal, holidays, view, title, sub, author, updated, zoom, editable, selectedId, onSelect, onDrag, pagesRef, height = 640 }: Props) {
  const today = iso(new Date());
  const months = view.months || monthsToFit(tasks, view.displayStart);
  const range = useMemo(() => displayRange(tasks, months, view.displayStart), [tasks, months, view.displayStart]);
  const critical = useMemo(() => (view.showCritical ? criticalPath(tasks, cal, holidays) : new Set<number>()), [tasks, cal, holidays, view.showCritical]);
  const per = rowsPerPage(view);
  const pages = useMemo(() => paginate(tasks.map((task, i) => ({ task, no: i + 1 })), per), [tasks, per]);
  const refs = useRef<SVGSVGElement[]>([]);
  useEffect(() => {
    if (pagesRef) pagesRef.current = refs.current;
  });

  // 掴んで横・縦にスクロール（バーの上では効かない。バーはドラッグで動かす）
  const box = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState<{ x: number; y: number; l: number; t: number } | null>(null);
  useEffect(() => {
    if (!pan) return;
    const move = (e: MouseEvent) => {
      if (!box.current) return;
      box.current.scrollLeft = pan.l - (e.clientX - pan.x);
      box.current.scrollTop = pan.t - (e.clientY - pan.y);
    };
    const up = () => setPan(null);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [pan]);

  const scale = zoom / 100;
  return (
    <div
      ref={box}
      className="overflow-auto bg-[#2b2b2b]"
      style={{ height, cursor: pan ? 'grabbing' : 'grab' }}
      onMouseDown={(e) => {
        if (e.button !== 0 || !box.current) return;
        setPan({ x: e.clientX, y: e.clientY, l: box.current.scrollLeft, t: box.current.scrollTop });
      }}
    >
      <div className="flex flex-col items-start gap-6 p-6 w-max">
        {pages.map((rows, i) => (
          <div key={i} className="shadow-[0_2px_12px_rgba(0,0,0,0.4)]">
            <GanttPage
              svgRef={(el) => {
                if (el) refs.current[i] = el;
                refs.current.length = pages.length;
              }}
              rows={rows}
              all={tasks}
              range={range}
              cal={cal}
              holidays={holidays}
              options={view}
              critical={critical}
              today={today}
              head={{ title, sub, author, updated, page: i + 1, pages: pages.length }}
              scale={scale}
              editable={editable}
              selectedId={selectedId}
              onSelect={onSelect}
              onDrag={onDrag}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
