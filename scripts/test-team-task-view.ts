// Teamタスクの見え方（src/lib/teamTaskView.ts）のテスト。  node scripts/test-team-task-view.ts
import { dueStatus, matchesFilter, sortTasks, ganttRange, ganttBar, cascadeDelays } from '../src/lib/teamTaskView.ts';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};
const today = '2026-09-24';
const t = (o: Partial<Parameters<typeof dueStatus>[0]>) => ({ id: 'x', title: 'x', completed: false, ...o });

check('期限切れ', dueStatus(t({ dueDate: '2026-09-20' }), today), { status: 'overdue', days: -4 });
check('3日以内', dueStatus(t({ dueDate: '2026-09-27' }), today).status, 'soon');
check('当日は3日以内', dueStatus(t({ dueDate: '2026-09-24' }), today), { status: 'soon', days: 0 });
check('先', dueStatus(t({ dueDate: '2026-10-10' }), today).status, 'ok');
check('完了は期限を見ない', dueStatus(t({ dueDate: '2026-09-01', completed: true }), today).status, 'done');
check('期限なし', dueStatus(t({}), today).status, 'none');

const tasks = [
  t({ id: 'a', assigneeId: 'u1', dueDate: '2026-09-20', role: '設計' }),
  t({ id: 'b', assigneeId: 'u2', dueDate: '2026-10-01', role: '施工', priority: 'high' }),
  t({ id: 'c', assigneeId: 'u1', dueDate: '2026-09-30', completed: true }),
];
const ids = (f: Parameters<typeof matchesFilter>[1]) => tasks.filter((x) => matchesFilter(x, f, today)).map((x) => x.id);
check('未完了', ids({ assignee: '', state: 'open', role: '' }), ['a', 'b']);
check('期限切れのみ', ids({ assignee: '', state: 'overdue', role: '' }), ['a']);
check('自分（u1）', ids({ assignee: 'me:u1', state: 'all', role: '' }), ['a', 'c']);
check('役割=施工', ids({ assignee: '', state: 'all', role: '施工' }), ['b']);

check('期限順', sortTasks(tasks, 'due').map((x) => x.id), ['a', 'c', 'b']);
check('重要度順', sortTasks(tasks, 'priority').map((x) => x.id), ['b', 'a', 'c']);

const range = ganttRange([t({ startDate: '2026-09-28', dueDate: '2026-10-05' })], today);
check('範囲は今日の前日から期限の翌日まで', range, { start: '2026-09-23', days: 14 });
check('棒（開始〜期限）', ganttBar(t({ startDate: '2026-09-28', dueDate: '2026-10-05' }), range), { from: 5, len: 8, milestone: false });
check('開始なしは期限の1日', ganttBar(t({ dueDate: '2026-10-01' }), range), { from: 8, len: 1, milestone: true });
check('期限なしは描かない', ganttBar(t({}), range), null);
check('長すぎる範囲は120日で切る', ganttRange([t({ dueDate: '2027-12-31' })], today).days, 120);

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
