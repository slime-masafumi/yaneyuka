// スケジュール調整の補助（src/lib/scheduleBatch.ts）のテスト。  node scripts/test-schedule-batch.ts
import { generateCandidates, candidateLabel, timeRangeOf, responsesCsv } from '../src/lib/scheduleBatch.ts';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};

// 2026-09-28(月)〜10-04(日) の平日午後 → 5 件
const weekdays = generateCandidates('2026-09-28', '2026-10-04', [1, 2, 3, 4, 5], ['pm']);
check('平日の午後', weekdays.map((c) => c.date), ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
// 毎週火曜の午前（4 週）
check('毎週火曜', generateCandidates('2026-10-01', '2026-10-31', [2], ['am']).map((c) => c.date), ['2026-10-06', '2026-10-13', '2026-10-20', '2026-10-27']);
check('午前・午後の両方', generateCandidates('2026-10-06', '2026-10-06', [2], ['am', 'pm']).length, 2);
check('上限で打ち切る', generateCandidates('2026-01-01', '2026-12-31', [0, 1, 2, 3, 4, 5, 6], ['am', 'pm'], 40).length, 40);
check('曜日が無ければ空', generateCandidates('2026-10-01', '2026-10-31', [], ['am']), []);

check('ラベル', candidateLabel('2026-09-29', 'pm'), '9/29(火) 午後');
check('時刻つき', timeRangeOf('9/29(火) 10:00〜11:30'), { startHour: '10', startMinute: '00', endHour: '11', endMinute: '30' });
check('午前', timeRangeOf('9/29(火) 午前')?.startHour, '09');
check('午後', timeRangeOf('9/29(火) 午後')?.endHour, '17');
check('時刻なし', timeRangeOf('懇親会の場所'), null);

const csv = responsesCsv(
  [{ id: 'o1', label: '9/29(火) 午後' }, { id: 'o2', label: '9/30(水) 午後' }],
  [{ id: 'p1', name: '田中', comment: '遅れます' }, { id: 'p2', name: '佐藤' }],
  [
    { participantId: 'p1', optionId: 'o1', value: 'yes' },
    { participantId: 'p1', optionId: 'o2', value: 'no' },
    { participantId: 'p2', optionId: 'o1', value: 'yes' },
    { participantId: 'p2', optionId: 'o2', value: 'maybe' },
  ]
).replace(/\n$/, '').split('\n'); // trim() だと先頭の BOM まで消える
check('CSV 見出し', csv[0], '﻿"名前","9/29(火) 午後","9/30(水) 午後","コメント"');
check('CSV 回答', csv[1], '"田中","○","×","遅れます"');
check('CSV 集計', csv[3], '"○ の数","2","0",""');

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
