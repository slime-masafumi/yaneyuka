'use client';
/**
 * Myカレンダーの週表示。
 *
 * 月の升目は 1 日に 3〜4 件で埋まり、スマホ幅では 1 升 48px ほどで題名が読めない。
 * 週表示は 1 日の予定をすべて時刻順に出す。PC では 7 列、スマホ幅では日ごとの縦の並び（予定表）。
 */
import React from 'react';

export type WeekEvent = {
  id: string;
  title: string;
  date: string;
  allDay?: boolean;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
  color: string;
  category: string;
  spanPart?: 'single' | 'start' | 'middle' | 'end';
  remind?: boolean;
};

export type WeekTask = {
  id: string;
  title: string;
  completed?: boolean;
  color?: string;
  isTeamTask?: boolean;
  categoryId?: string;
};

const MONO = 'yy-mono text-[10px] tracking-[0.12em] uppercase';
const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const SUN = '#9A5040';
const SAT = '#4F6D8A';

const byTime = (a: WeekEvent, b: WeekEvent) => {
  if (!!a.allDay !== !!b.allDay) return a.allDay ? -1 : 1;
  return `${a.startHour}${a.startMinute}`.localeCompare(`${b.startHour}${b.startMinute}`);
};

export default function WeekView({
  days,
  todayStr,
  selectedDate,
  dark,
  gridLine,
  eventsOf,
  tasksOf,
  holidayOf,
  onSelect,
  onAdd,
  onOpenEvent,
  onToggleTask,
}: {
  days: { date: Date; dateStr: string }[];
  todayStr: string;
  selectedDate: string;
  dark: boolean;
  gridLine: string;
  eventsOf: (dateStr: string) => WeekEvent[];
  tasksOf: (date: Date) => WeekTask[];
  holidayOf: (dateStr: string) => string | null;
  onSelect: (dateStr: string) => void;
  onAdd: (date: Date) => void;
  onOpenEvent: (ev: WeekEvent) => void;
  onToggleTask: (task: WeekTask) => void;
}) {
  const text = dark ? 'text-white' : 'text-[#141414]';
  const sub = dark ? 'text-white/60' : 'text-gray-500';
  return (
    <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 md:grid-cols-7">
      {days.map(({ date, dateStr }) => {
        const dow = date.getDay();
        const holiday = holidayOf(dateStr);
        const isToday = dateStr === todayStr;
        const evs = eventsOf(dateStr).slice().sort(byTime);
        const tasks = tasksOf(date);
        const numColor = isToday ? '#52AA96' : holiday || dow === 0 ? SUN : dow === 6 ? SAT : undefined;
        return (
          <section
            key={dateStr}
            onClick={() => onSelect(dateStr)}
            onDoubleClick={() => onAdd(date)}
            className={`relative flex md:flex-col gap-2 md:gap-0 border-b md:border-r ${gridLine} px-2 py-2 md:min-h-full ${selectedDate === dateStr ? (dark ? 'bg-white/10' : 'bg-black/[0.035]') : ''}`}
          >
            {isToday && <div className="absolute left-0 right-0 top-0 h-px bg-[#52AA96] pointer-events-none" />}
            <div className="w-14 md:w-auto shrink-0 md:mb-2">
              <div className={`${MONO}`} style={{ color: numColor }}>{DOW[dow]}</div>
              <div className={`yy-mono text-[12px] ${isToday ? 'font-bold' : ''} ${numColor ? '' : text}`} style={numColor ? { color: numColor } : undefined}>
                {date.getMonth() + 1}/{String(date.getDate()).padStart(2, '0')}
              </div>
              {holiday && <div className="text-[10px] truncate" style={{ color: SUN }}>{holiday}</div>}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              {evs.map((ev) => {
                const feed = ev.id.startsWith('ics-');
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onOpenEvent(ev); }}
                    className={`text-left flex items-stretch gap-1.5 ${dark ? 'hover:bg-white/5' : 'hover:bg-black/[0.03]'}`}
                    title={feed ? `${ev.title}（${ev.category}・読むだけ）` : ev.title}
                  >
                    <span className="w-0.5 shrink-0" style={{ backgroundColor: ev.color }} />
                    <span className="min-w-0">
                      <span className={`block yy-mono text-[10px] ${sub}`}>
                        {ev.allDay ? 'ALL DAY' : `${ev.startHour}:${ev.startMinute}–${ev.endHour}:${ev.endMinute}`}
                        {ev.spanPart === 'middle' || ev.spanPart === 'end' ? ' · 続き' : ''}
                        {feed ? ` · ${ev.category}` : ''}
                      </span>
                      <span className={`block text-[11px] break-words ${text}`}>{ev.title}</span>
                    </span>
                  </button>
                );
              })}
              {tasks.map((t) => (
                <label key={`${t.categoryId}-${t.id}`} className="flex items-center gap-1.5 text-[11px]" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={!!t.completed}
                    disabled={t.isTeamTask}
                    onChange={() => onToggleTask(t)}
                    className="w-3 h-3 accent-[#3b3b3b]"
                  />
                  <span className="w-1.5 h-1.5 shrink-0" style={{ backgroundColor: t.color || '#5B6B73' }} />
                  <span className={`min-w-0 break-words ${dark ? 'text-white/80' : 'text-gray-600'} ${t.completed ? 'line-through opacity-60' : ''}`}>{t.title}</span>
                </label>
              ))}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onAdd(date); }}
                className={`self-start text-[10px] underline underline-offset-2 ${dark ? 'text-white/50' : 'text-gray-400 hover:text-[#141414]'}`}
              >
                ＋ 予定
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
