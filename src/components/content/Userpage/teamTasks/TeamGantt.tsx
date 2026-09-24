'use client';
/**
 * Teamタスクの工程表。プロジェクトごとにタスクを横棒で並べる。
 * 開始日が無いタスクは期限の1日だけの◆（マイルストーン）で出す。
 * 並べ方の計算は src/lib/teamTaskView.ts。
 */
import React from 'react';
import { dueStatus, ganttBar, ganttRange, type TaskLike, type Slip } from '@/lib/teamTaskView';

const DAY_W = 18;
const WEEK = ['日', '月', '火', '水', '木', '金', '土'];

type Row = TaskLike & { assigneeLabel?: string };

export default function TeamGantt({
  groups,
  today,
  slips,
  pendingShifts = 0,
  onApplyShifts,
}: {
  groups: { id: string; name: string; tasks: Row[] }[];
  today: string;
  /** 遅れの波及（cascadeDelays の結果） */
  slips?: Map<string, Slip>;
  pendingShifts?: number;
  onApplyShifts?: () => void;
}) {
  const all = groups.flatMap((g) => g.tasks);
  const withDue = all.filter((t) => t.dueDate);
  if (!withDue.length) {
    return <p className="p-6 text-[12px] text-gray-500">期限の入ったタスクがありません。期限（と開始日）を入れると工程表に並びます。</p>;
  }
  // ずれた先も範囲に入れる
  const range = ganttRange([...withDue, ...withDue.filter((t) => slips?.has(t.id)).map((t) => ({ ...t, dueDate: slips!.get(t.id)!.due }))], today);
  const titleOf = new Map(all.map((t) => [t.id, t.title]));
  const [sy, sm, sd] = range.start.split('-').map(Number);
  const days = Array.from({ length: range.days }, (_, i) => new Date(sy, sm - 1, sd + i));
  const todayIdx = days.findIndex((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === today);

  return (
    <div className="border border-[#3b3b3b] bg-white">
      {pendingShifts > 0 && (
        <div className="px-2 py-1.5 border-b border-red-300 bg-red-50 text-[11px] flex items-center justify-between gap-2">
          <span>前のタスクが遅れているため、後ろの {pendingShifts} 件がずれます（赤い点線がずれた後の予定）</span>
          {onApplyShifts && (
            <button type="button" onClick={onApplyShifts} className="px-2 py-0.5 border border-red-600 text-red-700 bg-white shrink-0">
              ずれを反映する
            </button>
          )}
        </div>
      )}
    <div className="overflow-x-auto">
      <table className="text-[11px] border-collapse" style={{ minWidth: 260 + range.days * DAY_W }}>
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white w-[260px] min-w-[260px] border-b border-r text-left px-2 py-1 font-normal text-gray-500">タスク</th>
            {days.map((d, i) => (
              <th
                key={i}
                className={`border-b text-center font-normal ${d.getDay() === 0 ? 'text-red-500' : d.getDay() === 6 ? 'text-blue-500' : 'text-gray-500'} ${i === todayIdx ? 'bg-gray-800 text-white' : ''}`}
                style={{ width: DAY_W, minWidth: DAY_W }}
                title={`${d.getMonth() + 1}/${d.getDate()}(${WEEK[d.getDay()]})`}
              >
                {d.getDate() === 1 || i === 0 ? <div className="text-[9px] font-bold">{d.getMonth() + 1}月</div> : <div className="text-[9px]">&nbsp;</div>}
                <div className="text-[9px]">{d.getDate()}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <React.Fragment key={g.id}>
              <tr>
                <td className="sticky left-0 z-10 bg-gray-100 px-2 py-1 font-bold border-r" colSpan={1}>{g.name}</td>
                <td className="bg-gray-100" colSpan={range.days} />
              </tr>
              {g.tasks.map((t) => {
                const bar = ganttBar(t, range);
                const slip = slips?.get(t.id);
                const ghost = slip?.cause ? ganttBar({ ...t, startDate: t.startDate && t.dueDate && t.startDate <= t.dueDate ? slip.start : null, dueDate: slip.due }, range) : null;
                const st = dueStatus(t, today).status;
                const color = st === 'done' ? '#9ca3af' : st === 'overdue' ? '#dc2626' : st === 'soon' ? '#d97706' : '#3b3b3b';
                return (
                  <tr key={t.id} className="border-t border-gray-100">
                    <td className="sticky left-0 z-10 bg-white px-2 py-1 border-r">
                      <div className={`truncate ${t.completed ? 'line-through text-gray-400' : ''}`} title={t.title}>{t.title}</div>
                      <div className="text-[9px] text-gray-400 truncate">
                        {[t.role, t.assigneeLabel, t.after && titleOf.get(t.after) ? `← ${titleOf.get(t.after)}` : ''].filter(Boolean).join('・')}
                        {slip && <span className="ml-1 text-red-600 font-bold">+{slip.delay}日</span>}
                      </div>
                    </td>
                    <td colSpan={range.days} className="relative p-0" style={{ height: 30 }}>
                      {/* 今日の縦線 */}
                      {todayIdx >= 0 && <div className="absolute top-0 bottom-0 bg-gray-800/20" style={{ left: todayIdx * DAY_W + DAY_W / 2, width: 1 }} />}
                      {ghost && (
                        <div
                          className="absolute border border-dashed border-red-600"
                          title={`${slip!.cause} の遅れで ${slip!.delay} 日ずれる: ${slip!.start} 〜 ${slip!.due}`}
                          style={{ left: ghost.from * DAY_W + 1, top: 6, width: ghost.len * DAY_W - 2, height: 18 }}
                        />
                      )}
                      {bar &&
                        (bar.milestone ? (
                          <div
                            className="absolute"
                            title={`期限 ${t.dueDate}`}
                            style={{ left: bar.from * DAY_W + DAY_W / 2 - 6, top: 9, width: 12, height: 12, background: color, transform: 'rotate(45deg)' }}
                          />
                        ) : (
                          <div
                            className="absolute"
                            title={`${t.startDate} 〜 ${t.dueDate}`}
                            style={{ left: bar.from * DAY_W + 1, top: 8, width: bar.len * DAY_W - 2, height: 14, background: color, opacity: t.completed ? 0.5 : 1 }}
                          />
                        ))}
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <p className="px-2 py-1 text-[10px] text-gray-500">
        ■ 開始〜期限　◆ 期限だけ（開始日なし）　<span className="text-red-600">┅</span> 前のタスクの遅れでずれた後　← 前のタスク　<span className="text-red-600">赤</span> 期限切れ　<span className="text-amber-600">橙</span> 3日以内　灰 完了
      </p>
    </div>
    </div>
  );
}
