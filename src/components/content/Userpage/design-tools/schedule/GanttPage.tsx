'use client';
/**
 * 工程表の 1 ページ（用紙 1 枚分）を SVG で描く。
 *
 * 画面のプレビューも印刷も同じ SVG を使う。viewBox は 96dpi の用紙寸法（A3 横 = 1587×1123px）で、
 * 印刷では用紙の mm に合わせて伸ばすだけなので、拡大率を変えても線がにじまず、位置もずれない。
 * 外部の CSS に頼らない（印刷用の iframe にそのまま outerHTML を移すため）。
 *
 * editable のとき、バーを掴んで動かす・両端で期間を伸び縮みできる（1 日単位）。
 * 計算は src/lib/gantt.ts。
 */
import React, { useRef, useState } from 'react';
import {
  PAPER_PX, addDays, barSpan, daysBetween, groupSpan, headerCells, isBehind, kindOf, monthCells, offReason, parse,
  workdaysBetween, type GanttTask, type Holidays, type Paper, type Unit, type WorkCalendar,
} from '@/lib/gantt';

export type ChartOptions = {
  unit: Unit;
  paper: Paper;
  rowH: number;
  showStart: boolean;
  showEnd: boolean;
  showInner: boolean;
  showProgress: boolean;
  showBaseline: boolean;
  showLinks: boolean;
  showCritical: boolean;
  showToday: boolean;
  showDateCol: boolean;
  shadeOff: boolean;
};

export const DEFAULT_OPTIONS: ChartOptions = {
  unit: 'day',
  paper: 'A3',
  rowH: 26,
  showStart: true,
  showEnd: true,
  showInner: true,
  showProgress: false,
  showBaseline: true,
  showLinks: true,
  showCritical: false,
  showToday: true,
  showDateCol: true,
  shadeOff: true,
};

export type PageHead = {
  title: string;
  /** 物件名・発注者など（タイトルの下に小さく） */
  sub?: string;
  /** 右上（作成者・会社名） */
  author?: string;
  updated?: string;
  page: number;
  pages: number;
};

export type DragResult = { id: number; mode: 'move' | 'start' | 'end'; delta: number };

const MARGIN = 38; // 10mm
const TITLE_H = 64;
const FOOT_H = 22;
const NO_W = 30;
const NAME_W = 190;
const DATE_W = 118;
const SANS = "'Inter','Helvetica Neue','Noto Sans JP','Hiragino Sans','Yu Gothic',sans-serif";
const MONO = "'JetBrains Mono','SF Mono',Consolas,'Noto Sans JP',monospace";
const INK = '#1f1f1f';
const LINE = '#d6d3cc';
const LINE_DARK = '#8c8a85';
const ACCENT = '#52aa96';
const RED = '#b24a4a';
const WEEK = ['日', '月', '火', '水', '木', '金', '土'];

/** 見出し（月・日・曜日）の高さ。日表示だけ曜日の段がある */
export const axisHeight = (unit: Unit) => (unit === 'day' ? 58 : 42);

/** 1 ページに入る行数 */
export function rowsPerPage(o: Pick<ChartOptions, 'paper' | 'unit' | 'rowH'>): number {
  const { h } = PAPER_PX[o.paper];
  return Math.max(1, Math.floor((h - MARGIN * 2 - TITLE_H - axisHeight(o.unit) - FOOT_H) / o.rowH));
}

/** 文字の幅の目安（和文 1em・欧文 0.6em） */
const textW = (s: string, size: number) => [...s].reduce((w, c) => w + (c.charCodeAt(0) > 0xff ? size : size * 0.6), 0);
const md = (s: string) => {
  const d = parse(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
const fit = (s: string, size: number, max: number) => {
  if (textW(s, size) <= max) return s;
  let out = '';
  for (const c of s) {
    if (textW(out + c + '…', size) > max) break;
    out += c;
  }
  return out + '…';
};

type Props = {
  /** このページに出す行（全体の何行目かも渡す） */
  rows: { task: GanttTask; no: number }[];
  /** 全工程（大項目の期間・前工程の線に使う） */
  all: GanttTask[];
  range: { start: string; end: string; days: number };
  cal: WorkCalendar;
  holidays: Holidays;
  options: ChartOptions;
  critical: Set<number>;
  today: string;
  head: PageHead;
  /** 画面での拡大率（1 = 等倍）。印刷では使わない */
  scale?: number;
  editable?: boolean;
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  onDrag?: (r: DragResult) => void;
  svgRef?: React.Ref<SVGSVGElement>;
};

export default function GanttPage({ rows, all, range, cal, holidays, options: o, critical, today, head, scale = 1, editable, selectedId, onSelect, onDrag, svgRef }: Props) {
  const { w: W, h: H } = PAPER_PX[o.paper];
  const left = MARGIN + NO_W + NAME_W + (o.showDateCol ? DATE_W : 0);
  const right = W - MARGIN;
  const top = MARGIN + TITLE_H;
  const axisH = axisHeight(o.unit);
  const bodyTop = top + axisH;
  const dayW = (right - left) / range.days;
  const bodyH = rows.length * o.rowH;
  const bottom = bodyTop + Math.max(bodyH, o.rowH);
  const x = (dayIdx: number) => left + dayIdx * dayW;

  // ---- ドラッグ（1 日単位）
  const [drag, setDrag] = useState<{ id: number; mode: DragResult['mode']; x0: number; delta: number } | null>(null);
  const moved = useRef(false);
  const begin = (e: React.PointerEvent, id: number, mode: DragResult['mode']) => {
    if (!editable || e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    moved.current = false;
    setDrag({ id, mode, x0: e.clientX, delta: 0 });
  };
  const moveDrag = (e: React.PointerEvent) => {
    if (!drag) return;
    // 画面上の 1 日の幅 = viewBox の 1 日 × 拡大率
    const delta = Math.round((e.clientX - drag.x0) / (dayW * scale));
    if (delta !== drag.delta) {
      moved.current = true;
      setDrag({ ...drag, delta });
    }
  };
  const endDrag = () => {
    if (!drag) return;
    const d = drag;
    setDrag(null);
    if (d.delta !== 0) onDrag?.({ id: d.id, mode: d.mode, delta: d.delta });
    else if (!moved.current) onSelect?.(d.id);
  };
  /** ドラッグ中の見た目の開始・終了 */
  const live = (t: GanttTask, s: string, e: string): [string, string] => {
    if (!drag || drag.id !== t.id) return [s, e];
    if (drag.mode === 'move') return [addDays(s, drag.delta), addDays(e, drag.delta)];
    if (drag.mode === 'start') {
      const ns = addDays(s, drag.delta);
      return [ns > e ? e : ns, e];
    }
    const ne = addDays(e, drag.delta);
    return [s, ne < s ? s : ne];
  };
  // 大項目を動かしているときは中身も一緒に動いて見せる
  const groupOf = new Map<number, number>();
  {
    let g: number | null = null;
    for (const t of all) {
      if (kindOf(t) === 'group') g = t.id;
      else if (g != null) groupOf.set(t.id, g);
    }
  }
  const shiftByGroup = (t: GanttTask, s: string, e: string): [string, string] => {
    if (drag && drag.mode === 'move' && groupOf.get(t.id) === drag.id) return [addDays(s, drag.delta), addDays(e, drag.delta)];
    return live(t, s, e);
  };

  // ---- 見出し
  const upper = monthCells(range, o.unit);
  const lower = headerCells(range, o.unit);
  const days = Array.from({ length: range.days }, (_, i) => addDays(range.start, i));
  const offOf = days.map((d) => offReason(d, cal, holidays));
  const todayIdx = daysBetween(range.start, today);

  // 行の位置（前工程の線に使う）
  const rowIndex = new Map(rows.map((r, i) => [r.task.id, i]));
  const rowY = (i: number) => bodyTop + i * o.rowH;

  const barH = Math.round(o.rowH * 0.5);
  const fs = o.rowH >= 24 ? 11 : 10;
  const mono = { fontFamily: MONO } as const;

  const els: React.ReactNode[] = [];

  // ---- 休みの帯（日表示と週表示）
  if (o.shadeOff && o.unit !== 'month') {
    days.forEach((d, i) => {
      const off = offOf[i];
      if (!off) return;
      const sat = off === '土曜';
      els.push(<rect key={`off${i}`} x={x(i)} y={top + (o.unit === 'day' ? 0 : 20)} width={dayW} height={bottom - top - (o.unit === 'day' ? 0 : 20)} fill={sat ? '#eef2f7' : '#f6ecec'} />);
    });
  }

  // ---- 縦の罫線（下段の区切り。月の境は濃く）
  const monthStarts = new Set(upper.map((c) => c.from).concat(headerCells(range, 'month').map((c) => c.from)));
  lower.forEach((c, i) => {
    if (i === 0) return;
    const strong = monthStarts.has(c.from);
    els.push(<line key={`v${i}`} x1={x(c.from)} x2={x(c.from)} y1={top + 20} y2={bottom} stroke={strong ? LINE_DARK : LINE} strokeWidth={strong ? 1 : 0.6} />);
  });
  upper.forEach((c, i) => {
    if (i === 0) return;
    els.push(<line key={`vu${i}`} x1={x(c.from)} x2={x(c.from)} y1={top} y2={top + 20} stroke={LINE_DARK} strokeWidth={1} />);
  });

  // ---- 見出しの文字
  upper.forEach((c, i) => {
    const w = c.len * dayW;
    els.push(
      <text key={`ut${i}`} x={x(c.from) + Math.min(6, w / 2)} y={top + 14} fontSize={11} fill={INK} style={mono} letterSpacing="0.06em">
        {fit(c.label, 11, w - 8)}
      </text>
    );
  });
  lower.forEach((c, i) => {
    const w = c.len * dayW;
    const cx = x(c.from) + w / 2;
    if (o.unit === 'day') {
      const off = offOf[c.from];
      const wd = parse(days[c.from]).getDay();
      const color = off && off !== '土曜' ? RED : wd === 6 ? '#3b6ea5' : INK;
      if (dayW >= 9) {
        els.push(<text key={`lt${i}`} x={cx} y={top + 35} fontSize={Math.min(10, dayW * 0.75)} textAnchor="middle" fill={color} style={mono}>{c.label}</text>);
        els.push(<text key={`lw${i}`} x={cx} y={top + 51} fontSize={Math.min(9, dayW * 0.7)} textAnchor="middle" fill={color}>{WEEK[wd]}</text>);
      } else if (c.label === '1' || c.label === '10' || c.label === '20') {
        // 細かすぎるときは 1・10・20 日だけ
        els.push(<text key={`lt${i}`} x={x(c.from) + 1} y={top + 35} fontSize={9} fill={INK} style={mono}>{c.label}</text>);
      }
    } else if (w >= textW(c.label, 9) + 4) {
      els.push(<text key={`lt${i}`} x={cx} y={top + 35} fontSize={9.5} textAnchor="middle" fill={INK} style={mono}>{c.label}{o.unit === 'month' ? '月' : ''}</text>);
    }
  });

  // ---- 左の列の見出し
  const colX = { no: MARGIN, name: MARGIN + NO_W, date: MARGIN + NO_W + NAME_W };
  els.push(<text key="hno" x={colX.no + NO_W / 2} y={bodyTop - 10} fontSize={9} textAnchor="middle" fill="#6b6b6b" style={mono} letterSpacing="0.1em">NO</text>);
  els.push(<text key="hname" x={colX.name + 8} y={bodyTop - 10} fontSize={10} fill="#6b6b6b">工程</text>);
  if (o.showDateCol) els.push(<text key="hdate" x={colX.date + 8} y={bodyTop - 10} fontSize={10} fill="#6b6b6b">期間・稼働日</text>);

  // ---- 行
  rows.forEach(({ task: t, no }, i) => {
    const y = rowY(i);
    const k = kindOf(t);
    const span = k === 'group' ? groupSpan(all, t.id) : null;
    const s0 = k === 'group' ? span?.start ?? '' : t.start;
    const e0 = k === 'group' ? span?.end ?? '' : t.end;
    const [s, e] = k === 'group' ? (drag && drag.id === t.id && drag.mode === 'move' && s0 ? [addDays(s0, drag.delta), addDays(e0, drag.delta)] : [s0, e0]) : shiftByGroup(t, s0, e0);
    const selected = selectedId === t.id;
    const behind = isBehind(t, today, cal, holidays);
    const cy = y + o.rowH / 2;

    if (selected) els.push(<rect key={`sel${t.id}`} x={MARGIN} y={y} width={right - MARGIN} height={o.rowH} fill={ACCENT} opacity={0.08} />);
    if (k === 'group') els.push(<rect key={`gbg${t.id}`} x={MARGIN} y={y} width={left - MARGIN} height={o.rowH} fill="#f3f1ec" />);
    // 横の罫線
    els.push(<line key={`h${t.id}`} x1={MARGIN} x2={right} y1={y + o.rowH} y2={y + o.rowH} stroke={LINE} strokeWidth={0.6} />);

    // 左の列
    els.push(<text key={`no${t.id}`} x={colX.no + NO_W / 2} y={cy + 3.5} fontSize={9.5} textAnchor="middle" fill="#6b6b6b" style={mono}>{String(no).padStart(2, '0')}</text>);
    const indent = k === 'group' ? 8 : 18;
    els.push(
      <text key={`nm${t.id}`} x={colX.name + indent} y={cy + 4} fontSize={k === 'group' ? fs + 0.5 : fs} fontWeight={k === 'group' ? 700 : 400} fill={INK}>
        {k === 'milestone' ? '◆ ' : ''}
        {fit(t.name || '(無題)', fs, NAME_W - indent - (behind ? 30 : 8))}
        {behind ? <tspan fill={RED} fontSize={9}>{'  遅れ'}</tspan> : null}
      </text>
    );
    if (o.showDateCol && s && e) {
      const label = k === 'milestone' ? md(s) : `${md(s)}–${md(e)}`;
      const wd = k === 'task' ? `${workdaysBetween(s, e, cal, holidays)}日` : '';
      els.push(<text key={`dt${t.id}`} x={colX.date + 8} y={cy + 3.5} fontSize={9.5} fill="#4b4b4b" style={mono}>{label}</text>);
      if (wd) els.push(<text key={`wd${t.id}`} x={colX.date + DATE_W - 8} y={cy + 3.5} fontSize={9.5} textAnchor="end" fill="#4b4b4b" style={mono}>{wd}</text>);
    }

    // 基準計画（当初の予定）: バーの下の細い灰色の線
    if (o.showBaseline && k !== 'group' && t.baseStart && t.baseEnd) {
      const b = barSpan(t.baseStart, t.baseEnd, range);
      if (b) els.push(<rect key={`base${t.id}`} x={x(b.from) + 1} y={cy + barH / 2 + 2} width={Math.max(2, b.len * dayW - 2)} height={3} fill="#a8a59e" />);
    }

    const sp = s && e ? barSpan(s, e, range) : null;
    if (!sp) return;
    const bx = x(sp.from) + (k === 'milestone' ? 0 : 1);
    const bw = Math.max(k === 'milestone' ? dayW : 3, sp.len * dayW - (k === 'milestone' ? 0 : 2));
    const isCrit = o.showCritical && critical.has(t.id);
    const tip = `${t.name}\n${s}${k === 'milestone' ? '' : ` 〜 ${e}（${workdaysBetween(s, e, cal, holidays)} 稼働日）`}${t.progress ? `\n進捗 ${t.progress}%` : ''}${t.note ? `\n${t.note}` : ''}`;
    const grab = editable ? { cursor: drag ? 'grabbing' : 'grab' } : undefined;
    const common = {
      onPointerDown: (ev: React.PointerEvent) => begin(ev, t.id, 'move'),
      onPointerMove: moveDrag,
      onPointerUp: endDrag,
      onPointerCancel: () => setDrag(null),
      onMouseDown: (ev: React.MouseEvent) => editable && ev.stopPropagation(),
      style: grab,
    };

    if (k === 'group') {
      // 大項目: 細い墨の帯と両端の爪
      const gy = cy - 3;
      els.push(
        <g key={`bar${t.id}`} {...common}>
          <title>{tip}</title>
          <rect x={bx} y={gy} width={bw} height={6} fill={INK} />
          {!sp.cutL && <path d={`M${bx} ${gy + 6} l0 5 l6 -5 z`} fill={INK} />}
          {!sp.cutR && <path d={`M${bx + bw} ${gy + 6} l0 5 l-6 -5 z`} fill={INK} />}
          {o.showProgress && span && span.progress > 0 && <rect x={bx} y={gy - 4} width={bw * (span.progress / 100)} height={2} fill={ACCENT} />}
        </g>
      );
      return;
    }

    if (k === 'milestone') {
      const mx = bx + dayW / 2;
      const r = Math.min(7, o.rowH * 0.28);
      els.push(
        <g key={`bar${t.id}`} {...common}>
          <title>{tip}</title>
          <rect x={mx - r - 4} y={cy - r - 4} width={(r + 4) * 2} height={(r + 4) * 2} fill="transparent" />
          <path d={`M${mx} ${cy - r} L${mx + r} ${cy} L${mx} ${cy + r} L${mx - r} ${cy} Z`} fill={(t.progress ?? 0) >= 100 ? '#9a978f' : t.color} stroke={isCrit ? RED : 'none'} strokeWidth={1.5} />
          {(o.showStart || o.showEnd) && (
            <text x={mx + r + 4} y={cy + 3.5} fontSize={9.5} fill={INK} style={mono}>{md(s)}{o.showInner && t.innerText ? ` ${t.innerText}` : ''}</text>
          )}
        </g>
      );
      return;
    }

    // 工程のバー
    const by = cy - barH / 2;
    const prog = Math.min(100, Math.max(0, t.progress ?? 0));
    const parts: string[] = [];
    if (o.showStart) parts.push(md(s));
    const inner = o.showInner ? t.innerText : '';
    const endLabel = o.showEnd ? md(e) : '';
    const size = Math.min(10, barH - 3);
    const need = textW([...parts, inner, endLabel].filter(Boolean).join('   '), size) + 10;
    const inside = need <= bw;
    els.push(
      <g key={`bar${t.id}`} {...common}>
        <title>{tip}</title>
        {o.showProgress ? (
          <>
            <rect x={bx} y={by} width={bw} height={barH} fill={t.color} opacity={0.35} />
            {prog > 0 && <rect x={bx} y={by} width={bw * (prog / 100)} height={barH} fill={t.color} />}
          </>
        ) : (
          <rect x={bx} y={by} width={bw} height={barH} fill={t.color} />
        )}
        {isCrit && <rect x={bx - 1} y={by - 1} width={bw + 2} height={barH + 2} fill="none" stroke={RED} strokeWidth={1.5} />}
        {sp.cutL && <path d={`M${bx} ${by} l-5 ${barH / 2} l5 ${barH / 2} z`} fill={t.color} />}
        {sp.cutR && <path d={`M${bx + bw} ${by} l5 ${barH / 2} l-5 ${barH / 2} z`} fill={t.color} />}
        {inside ? (
          <>
            {parts[0] && <text x={bx + 4} y={cy + size / 2 - 1} fontSize={size} fill="#fff" style={mono}>{parts[0]}</text>}
            {inner && <text x={bx + bw / 2} y={cy + size / 2 - 1} fontSize={size} fill="#fff" textAnchor="middle">{inner}</text>}
            {endLabel && <text x={bx + bw - 4} y={cy + size / 2 - 1} fontSize={size} fill="#fff" textAnchor="end" style={mono}>{endLabel}</text>}
          </>
        ) : (
          (parts[0] || inner || endLabel) && (
            <text x={bx + bw + 5} y={cy + size / 2 - 1} fontSize={size} fill={INK} style={mono}>
              {[parts[0] && endLabel ? `${parts[0]}–${endLabel}` : parts[0] || endLabel, inner].filter(Boolean).join(' ')}
            </text>
          )
        )}
        {/* 両端の掴み（期間の伸び縮み） */}
        {editable && (
          <>
            <rect x={bx - 3} y={by} width={7} height={barH} fill="transparent" style={{ cursor: 'ew-resize' }} onPointerDown={(ev) => begin(ev, t.id, 'start')} />
            <rect x={bx + bw - 4} y={by} width={7} height={barH} fill="transparent" style={{ cursor: 'ew-resize' }} onPointerDown={(ev) => begin(ev, t.id, 'end')} />
          </>
        )}
      </g>
    );
  });

  // ---- 前工程の線（同じページにある組だけ）
  if (o.showLinks) {
    rows.forEach(({ task: t }, i) => {
      if (t.after == null) return;
      const pi = rowIndex.get(t.after);
      if (pi == null) return;
      const p = rows[pi].task;
      const [, pe] = shiftByGroup(p, p.start, p.end);
      const [ts] = shiftByGroup(t, t.start, t.end);
      const a = barSpan(pe, pe, range);
      const b = barSpan(ts, ts, range);
      if (!a || !b) return;
      const x1 = x(a.from) + (kindOf(p) === 'milestone' ? dayW / 2 : dayW);
      const y1 = rowY(pi) + o.rowH / 2;
      const x2 = x(b.from) + (kindOf(t) === 'milestone' ? dayW / 2 - 7 : 0);
      const y2 = rowY(i) + o.rowH / 2;
      const midX = Math.max(x1 + 4, Math.min(x2 - 4, x1 + 6));
      const crit = o.showCritical && critical.has(t.id) && critical.has(p.id);
      const color = crit ? RED : '#8c8a85';
      els.push(
        <g key={`ln${t.id}`} pointerEvents="none">
          <path d={`M${x1} ${y1} H${midX} V${y2} H${x2 - 1}`} fill="none" stroke={color} strokeWidth={0.8} />
          <path d={`M${x2 - 1} ${y2} l-4 -2.5 v5 z`} fill={color} />
        </g>
      );
    });
  }

  // ---- 今日
  if (o.showToday && todayIdx >= 0 && todayIdx < range.days) {
    const tx = x(todayIdx) + dayW / 2;
    els.push(
      <g key="today" pointerEvents="none">
        <line x1={tx} x2={tx} y1={top + 20} y2={bottom} stroke={ACCENT} strokeWidth={1.2} />
        <text x={tx + 3} y={bottom + 12} fontSize={8.5} fill={ACCENT} style={mono} letterSpacing="0.12em">TODAY</text>
      </g>
    );
  }

  // ---- 枠
  const frame = (
    <g key="frame" fill="none" pointerEvents="none">
      <rect x={MARGIN} y={top} width={right - MARGIN} height={bottom - top} stroke={INK} strokeWidth={1} />
      <line x1={MARGIN} x2={right} y1={bodyTop} y2={bodyTop} stroke={INK} strokeWidth={1} />
      <line x1={left} x2={left} y1={top} y2={bottom} stroke={INK} strokeWidth={1} />
      <line x1={MARGIN} x2={left} y1={top} y2={top} stroke={INK} />
      <line x1={left} x2={right} y1={top + 20} y2={top + 20} stroke={LINE_DARK} strokeWidth={0.8} />
      <line x1={colX.name} x2={colX.name} y1={top} y2={bottom} stroke={LINE} strokeWidth={0.8} />
      {o.showDateCol && <line x1={colX.date} x2={colX.date} y1={top} y2={bottom} stroke={LINE} strokeWidth={0.8} />}
    </g>
  );

  // ---- 題・凡例
  const legend: string[] = ['■ 工程', '◆ 節目', '▬ 大項目'];
  if (o.showBaseline && all.some((t) => t.baseStart)) legend.push('― 基準計画');
  if (o.showCritical) legend.push('□ クリティカルパス（赤枠）');
  if (o.showProgress) legend.push('濃い部分 = 進捗');
  const offs = [cal.sunday && '日曜', cal.saturday && '土曜', cal.holidays && '祝日', cal.yearEnd && '年末年始', cal.summer && 'お盆', cal.extraOff?.length && '休工日'].filter(Boolean).join('・');

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${W} ${H}`}
      width={W * scale}
      height={H * scale}
      style={{ display: 'block', background: '#fff', fontFamily: SANS, userSelect: 'none', touchAction: editable ? 'none' : 'auto' }}
      role="img"
      aria-label={`${head.title} 工程表 ${head.page}/${head.pages}`}
    >
      <rect x={0} y={0} width={W} height={H} fill="#fff" />
      {/* 題 */}
      <text x={MARGIN} y={MARGIN + 10} fontSize={9} fill="#6b6b6b" style={mono} letterSpacing="0.18em">[ SCHEDULE ]</text>
      <text x={MARGIN} y={MARGIN + 40} fontSize={26} fontWeight={300} fill={INK} letterSpacing="-0.02em">{fit(head.title || '工程表', 26, W * 0.55)}</text>
      {head.sub && <text x={MARGIN} y={MARGIN + 56} fontSize={10.5} fill="#4b4b4b">{fit(head.sub, 10.5, W * 0.55)}</text>}
      <text x={right} y={MARGIN + 10} fontSize={9} textAnchor="end" fill="#6b6b6b" style={mono} letterSpacing="0.14em">
        {String(head.page).padStart(3, '0')} / {String(head.pages).padStart(3, '0')}
      </text>
      {head.author && <text x={right} y={MARGIN + 40} fontSize={11} textAnchor="end" fill={INK}>{head.author}</text>}
      <text x={right} y={MARGIN + 56} fontSize={9} textAnchor="end" fill="#6b6b6b" style={mono} letterSpacing="0.06em">
        {head.updated ? `UPDATED ${head.updated}` : ''}
      </text>
      {els}
      {frame}
      {/* 凡例 */}
      <text x={MARGIN} y={H - MARGIN + 4} fontSize={9} fill="#6b6b6b">
        {legend.join('　')}
        {offs ? `　｜　休み: ${offs}` : ''}
      </text>
      <text x={right} y={H - MARGIN + 4} fontSize={8.5} textAnchor="end" fill="#9a978f" style={mono} letterSpacing="0.14em">YANEYUKA.COM</text>
    </svg>
  );
}
