// Myタスクの物件まとめ・完了履歴（src/lib/myTaskView.ts）のテスト。  node scripts/test-my-task-view.ts
import { projectOf, withProject, groupByProject, completedHistory } from '../src/lib/myTaskView.ts';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};

check('【】を物件名として読む', projectOf('【A邸】外構の見積'), { project: 'A邸', rest: '外構の見積' });
check('#タグ', projectOf('サッシ色決め #B病院 急ぎ'), { project: 'B病院', rest: 'サッシ色決め 急ぎ' });
check('無ければ null', projectOf('確認申請の準備'), { project: null, rest: '確認申請の準備' });
check('付け替え', withProject('【A邸】外構の見積', 'C邸'), '【C邸】外構の見積');
check('外す', withProject('【A邸】外構の見積', ''), '外構の見積');

const today = '2026-09-24';
const sheets = [
  { id: 's1', title: 'Today', tasks: [
    { id: '1', content: '【A邸】見積', completed: false, dueDate: '2026-09-20' },
    { id: '2', content: '【A邸】色決め', completed: false, dueDate: '2026-09-30' },
    { id: '3', content: '【B邸】申請', completed: true, completedAt: new Date(2026, 8, 23, 10).getTime() },
    { id: '4', content: '書類整理', completed: false },
  ] },
  { id: 's2', title: 'Projects', tasks: [
    { id: '5', content: '#B邸 地盤調査', completed: false, dueDate: '2026-10-01' },
    { id: '6', content: '古い完了', completed: true },
    { id: '7', content: '【A邸】打合せ', completed: true, completedAt: new Date(2026, 8, 24, 9).getTime() },
  ] },
];
const g = groupByProject(sheets, today);
check('未完了の多い物件から、物件なしは最後', g.map((x) => [x.project, x.open, x.overdue]), [['A邸', 2, 1], ['B邸', 1, 0], ['', 1, 0]]);
check('物件の中は期日順・シート名つき', g[0].items.map((i) => [i.rest, i.sheetTitle]), [['見積', 'Today'], ['色決め', 'Today']]);
check('完了も含める', groupByProject(sheets, today, true)[0].items.length, 3);

const h = completedHistory(sheets);
check('完了は新しい日から、日付なしは最後', h.map((x) => [x.date, x.items.length]), [['2026-09-24', 1], ['2026-09-23', 1], ['', 1]]);

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
