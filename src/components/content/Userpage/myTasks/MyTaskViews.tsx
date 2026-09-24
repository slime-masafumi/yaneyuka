'use client';
/**
 * Myタスクの別の見え方: 物件でまとめる / 完了の履歴。
 * どちらもシートをまたいで並べるだけで、保存先はシートのまま。
 */
import React from 'react';
import { groupByProject, completedHistory } from '@/lib/myTaskView';
import type { TaskCategory, Task } from '@/components/providers/TaskProvider';

const md = (s: string) => {
  const [, m, d] = s.split('-').map(Number);
  return `${m}/${d}`;
};

export function ProjectView({
  categories,
  today,
  onToggle,
}: {
  categories: TaskCategory[];
  today: string;
  onToggle: (categoryId: string, taskId: string) => void;
}) {
  const groups = groupByProject(categories, today);
  if (!groups.length) return <p className="py-8 text-center text-xs text-gray-400">未完了のタスクはありません</p>;
  return (
    <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((g) => (
        <section key={g.project || '__none'} className="border border-gray-300 bg-white">
          <header className="px-3 py-1.5 border-b border-gray-200 flex items-baseline justify-between">
            <h3 className={`text-sm font-bold ${g.project ? '' : 'text-gray-400'}`}>{g.project || '物件なし'}</h3>
            <span className="text-[11px] text-gray-500">
              {g.open} 件{g.overdue ? <span className="ml-1 bg-red-600 text-white font-bold px-1">超過 {g.overdue}</span> : null}
            </span>
          </header>
          <ul className="divide-y divide-gray-100">
            {g.items.map(({ task, sheetId, sheetTitle, rest }) => {
              const over = !task.completed && !!task.dueDate && task.dueDate < today;
              return (
                <li key={sheetId + task.id} className="px-3 py-1.5 flex items-start gap-2 text-xs">
                  <input type="checkbox" checked={task.completed} onChange={() => onToggle(sheetId, task.id)} className="mt-0.5" />
                  <span className="flex-1 min-w-0 break-words">{rest}</span>
                  {task.dueDate && <span className={`shrink-0 ${over ? 'bg-red-600 text-white font-bold px-1' : 'text-gray-500'}`}>{over ? '超過 ' : ''}{md(task.dueDate)}</span>}
                  <span className="shrink-0 text-[10px] text-gray-400">{sheetTitle}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="text-[10px] text-gray-400 md:col-span-2 xl:col-span-3">
        タスクの頭に【物件名】か、文中に #物件名 と書くとその物件にまとまります。yychat の物件ルームや yymail から作ったタスクには自動で付きます。
      </p>
    </div>
  );
}

export function DoneHistory({ categories, onToggle }: { categories: TaskCategory[]; onToggle: (categoryId: string, taskId: string) => void }) {
  const days = completedHistory<Task>(categories);
  if (!days.length) return <p className="py-8 text-center text-xs text-gray-400">完了したタスクはまだありません</p>;
  return (
    <div className="space-y-3 text-xs">
      {days.map((d) => (
        <section key={d.date || '__none'}>
          <h3 className="text-[11px] font-mono tracking-widest text-gray-500 border-b border-gray-300 pb-0.5 mb-1">
            {d.date ? `${d.date.replace(/-/g, '.')}（${'日月火水木金土'[new Date(d.date + 'T00:00').getDay()]}）` : '完了日の記録なし（以前に完了したもの）'}
            <span className="ml-2">{d.items.length} 件</span>
          </h3>
          <ul>
            {d.items.map(({ task, sheetId, sheetTitle }) => (
              <li key={sheetId + task.id} className="flex items-center gap-2 py-0.5 group">
                <span className="text-gray-400 w-10 shrink-0">
                  {task.completedAt ? new Date(task.completedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
                <span className="flex-1 min-w-0 break-words">{task.content}</span>
                <span className="text-[10px] text-gray-400 shrink-0">{sheetTitle}</span>
                <button type="button" onClick={() => onToggle(sheetId, task.id)} className="text-[10px] underline text-gray-500 opacity-0 group-hover:opacity-100 shrink-0">
                  未完了に戻す
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
