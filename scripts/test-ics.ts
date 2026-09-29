// .ics の読み書き（src/lib/ics.ts）のテスト。  node scripts/test-ics.ts
// 繰り返し（RRULE）の期待値は RFC 5545 3.8.5.3 の例と、Google カレンダーが実際に書き出す形から取っている。
import { parseIcs, parseIcsCalendar, buildIcs, unfoldLines, unescapeText, parseIcsDate } from '../src/lib/ics.ts';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};

check('折り返し行', unfoldLines('SUMMARY:abc\r\n def'), ['SUMMARY:abcdef']);
// 入力は  a\nb\, c\; d\\e  （\ は1文字）
check('エスケープ', unescapeText('a\\nb\\, c\\; d\\\\e'), 'a\nb, c; d\\e');
check('終日の日付', parseIcsDate('20260401')?.allDay, true);
check('時刻つき', parseIcsDate('20260401T093000')?.allDay, false);
check('壊れた値', parseIcsDate('nonsense'), null);

const sample = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'UID:a@example.com',
  'DTSTART;VALUE=DATE:20260401',
  'DTEND;VALUE=DATE:20260402',
  'SUMMARY:現場定例\\, 第1回',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:b@example.com',
  'DTSTART;TZID=Asia/Tokyo:20260403T140000',
  'DTEND;TZID=Asia/Tokyo:20260403T153000',
  'SUMMARY:中間検査',
  'DESCRIPTION:立会\\n検査機関',
  'LOCATION:A邸',
  'BEGIN:VALARM',
  'ACTION:DISPLAY',
  'DESCRIPTION:通知の本文は予定の説明ではない',
  'END:VALARM',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'SUMMARY:DTSTARTなしなので捨てる',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

const parsed = parseIcs(sample);
check('読めた件数（壊れた1件は飛ばす）', parsed.length, 2);
check('終日の予定', [parsed[0].date, parsed[0].endDate, parsed[0].allDay, parsed[0].title], ['2026-04-01', '2026-04-01', true, '現場定例, 第1回']);
check('時刻つきの予定', [parsed[1].date, parsed[1].startHour, parsed[1].startMinute, parsed[1].endHour, parsed[1].endMinute], ['2026-04-03', '14', '00', '15', '30']);
check('改行入りの説明（VALARM の説明で上書きしない）', parsed[1].details, '立会\n検査機関');
check('場所', parsed[1].location, 'A邸');
check('重複よけの鍵', [parsed[0].key, parsed[1].key], ['a@example.com|20260401', 'b@example.com|20260403T140000']);

const out = buildIcs([
  { id: 'x1', title: '打合せ; 施主', date: '2026-05-10', startHour: '10', startMinute: '00', endHour: '11', endMinute: '30', details: '1行目\n2行目', category: '会議' },
  { id: 'x2', title: '完了検査', date: '2026-05-20', allDay: true, startHour: '00', startMinute: '00', endHour: '00', endMinute: '00' },
]);
check('CRLFで終わる', out.endsWith('\r\n'), true);
check('DTSTART（時刻つき）', out.includes('DTSTART:20260510T100000'), true);
check('DTEND（時刻つき）', out.includes('DTEND:20260510T113000'), true);
check('終日のDTENDは翌日', out.includes('DTEND;VALUE=DATE:20260521'), true);
check('セミコロンを退避', out.includes('SUMMARY:打合せ\\; 施主'), true);
check('説明の改行を退避', out.includes('DESCRIPTION:1行目\\n2行目'), true);

// 書いたものを読み直して同じに戻るか
const round = parseIcs(out);
check('往復（件数）', round.length, 2);
check('往復（時刻つき）', [round[0].date, round[0].startHour, round[0].endMinute, round[0].title], ['2026-05-10', '10', '30', '打合せ; 施主']);
check('往復（終日）', [round[1].date, round[1].allDay], ['2026-05-20', true]);

// ------------------------------------------------------------------ 繰り返し
// 期間の既定値（1 年前〜2 年先）を固定するため「今日」を決めておく
const NOW = new Date(2026, 3, 1);
const cal = (...ev: string[][]) => ['BEGIN:VCALENDAR', 'VERSION:2.0', ...ev.flatMap((e) => ['BEGIN:VEVENT', ...e, 'END:VEVENT']), 'END:VCALENDAR'].join('\r\n');
const dates = (raw: string, opts = {}) => parseIcs(raw, { now: NOW, ...opts }).map((e) => e.date);

check(
  'DAILY;COUNT=3',
  dates(cal(['UID:d1', 'DTSTART:20260406T090000', 'DTEND:20260406T100000', 'RRULE:FREQ=DAILY;COUNT=3', 'SUMMARY:朝礼'])),
  ['2026-04-06', '2026-04-07', '2026-04-08'],
);
check(
  'DAILY;INTERVAL=2;UNTIL（日付だけの UNTIL はその日を含む）',
  dates(cal(['UID:d2', 'DTSTART;VALUE=DATE:20260401', 'RRULE:FREQ=DAILY;INTERVAL=2;UNTIL=20260407', 'SUMMARY:x'])),
  ['2026-04-01', '2026-04-03', '2026-04-05', '2026-04-07'],
);
check(
  'WEEKLY;BYDAY=MO,WE;COUNT=5（月水）',
  dates(cal(['UID:w1', 'DTSTART:20260406T100000', 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=5', 'SUMMARY:x'])),
  ['2026-04-06', '2026-04-08', '2026-04-13', '2026-04-15', '2026-04-20'],
);
check(
  'WEEKLY;INTERVAL=2（隔週の現場定例）',
  dates(cal(['UID:w2', 'DTSTART:20260409T140000', 'RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=3', 'SUMMARY:現場定例'])),
  ['2026-04-09', '2026-04-23', '2026-05-07'],
);
{
  const ev = parseIcs(cal(['UID:w3', 'DTSTART;TZID=Asia/Tokyo:20260406T100000', 'DTEND;TZID=Asia/Tokyo:20260406T113000', 'RRULE:FREQ=WEEKLY;UNTIL=20260420T015959Z', 'SUMMARY:定例']), { now: NOW });
  check('WEEKLY;UNTIL は UTC の時刻で切る', ev.map((e) => e.date), ['2026-04-06', '2026-04-13', '2026-04-20']);
  check('繰り返しの各回も時刻を持つ', [ev[2].startHour, ev[2].endHour, ev[2].endMinute, ev[2].recurring], ['10', '11', '30', true]);
  check('各回の鍵は UID と開始', ev[1].key, 'w3|20260413T100000');
}
check(
  'MONTHLY;BYDAY=2TU（第2火曜）',
  dates(cal(['UID:m1', 'DTSTART:20260414T090000', 'RRULE:FREQ=MONTHLY;BYDAY=2TU;COUNT=4', 'SUMMARY:x'])),
  ['2026-04-14', '2026-05-12', '2026-06-09', '2026-07-14'],
);
check(
  'MONTHLY;BYDAY=-1FR（最終金曜）',
  dates(cal(['UID:m2', 'DTSTART:20260424T090000', 'RRULE:FREQ=MONTHLY;BYDAY=-1FR;COUNT=3', 'SUMMARY:x'])),
  ['2026-04-24', '2026-05-29', '2026-06-26'],
);
check(
  'MONTHLY;BYMONTHDAY=31（31日の無い月は飛ばす）',
  dates(cal(['UID:m3', 'DTSTART;VALUE=DATE:20260131', 'RRULE:FREQ=MONTHLY;BYMONTHDAY=31;COUNT=4', 'SUMMARY:月末締め'])),
  ['2026-01-31', '2026-03-31', '2026-05-31', '2026-07-31'],
);
check(
  'MONTHLY;BYMONTHDAY=-1（月末）',
  dates(cal(['UID:m4', 'DTSTART;VALUE=DATE:20260131', 'RRULE:FREQ=MONTHLY;BYMONTHDAY=-1;COUNT=3', 'SUMMARY:x'])),
  ['2026-01-31', '2026-02-28', '2026-03-31'],
);
check(
  'MONTHLY（指定なしは DTSTART の日）;INTERVAL=3',
  dates(cal(['UID:m5', 'DTSTART;VALUE=DATE:20260415', 'RRULE:FREQ=MONTHLY;INTERVAL=3;COUNT=3', 'SUMMARY:x'])),
  ['2026-04-15', '2026-07-15', '2026-10-15'],
);
check(
  'MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1（月の最終平日）',
  dates(cal(['UID:m6', 'DTSTART;VALUE=DATE:20260430', 'RRULE:FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1;COUNT=3', 'SUMMARY:x'])),
  ['2026-04-30', '2026-05-29', '2026-06-30'],
);
check(
  'YEARLY（毎年同じ日・期間を広げて）',
  dates(cal(['UID:y1', 'DTSTART;VALUE=DATE:20260710', 'RRULE:FREQ=YEARLY;COUNT=3', 'SUMMARY:x']), { to: new Date(2030, 0, 1) }),
  ['2026-07-10', '2027-07-10', '2028-07-10'],
);
check(
  'YEARLY;BYMONTH=10;BYDAY=2SU（10月第2日曜・二級建築士の製図の頃）',
  dates(cal(['UID:y2', 'DTSTART;VALUE=DATE:20261011', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=2SU;COUNT=2', 'SUMMARY:x'])),
  ['2026-10-11', '2027-10-10'],
);
check(
  'EXDATE（1 回だけ休み）',
  dates(cal(['UID:e1', 'DTSTART;TZID=Asia/Tokyo:20260406T100000', 'RRULE:FREQ=WEEKLY;COUNT=4', 'EXDATE;TZID=Asia/Tokyo:20260413T100000', 'SUMMARY:x'])),
  ['2026-04-06', '2026-04-20', '2026-04-27'],
);
check(
  'EXDATE（カンマ区切り・終日・複数行）',
  dates(cal(['UID:e2', 'DTSTART;VALUE=DATE:20260401', 'RRULE:FREQ=DAILY;COUNT=6', 'EXDATE;VALUE=DATE:20260402,20260403', 'EXDATE;VALUE=DATE:20260405', 'SUMMARY:x'])),
  ['2026-04-01', '2026-04-04', '2026-04-06'],
);
{
  // RECURRENCE-ID: 2 回目だけ時刻を変えた。元の回は消え、変更後の回が 1 つ出る
  const ev = parseIcs(
    cal(
      ['UID:r1', 'DTSTART:20260406T100000', 'RRULE:FREQ=WEEKLY;COUNT=3', 'SUMMARY:定例'],
      ['UID:r1', 'RECURRENCE-ID:20260413T100000', 'DTSTART:20260414T150000', 'SUMMARY:定例（振替）'],
    ),
    { now: NOW },
  );
  check('RECURRENCE-ID で差し替え', ev.map((e) => `${e.date} ${e.startHour} ${e.title}`).sort(), ['2026-04-06 10 定例', '2026-04-14 15 定例（振替）', '2026-04-20 10 定例']);
  check('差し替えた回の鍵は元の回', ev.find((e) => e.title === '定例（振替）')?.key, 'r1|20260413T100000');
}
{
  // 終わりの無い毎日の予定は 500 回で止める。止めたことは stats で分かる
  const r = parseIcsCalendar(cal(['UID:n1', 'DTSTART;VALUE=DATE:20260401', 'RRULE:FREQ=DAILY', 'SUMMARY:x']), { now: NOW });
  check('上限 500 回', r.events.length, 500);
  check('打ち切りを数える', r.stats.truncatedSeries, 1);
  // 毎週・無期限は 2 年先で止まる
  const w = parseIcsCalendar(cal(['UID:n2', 'DTSTART;VALUE=DATE:20260401', 'RRULE:FREQ=WEEKLY', 'SUMMARY:x']), { now: NOW });
  check('2 年先で止まる', w.events[w.events.length - 1].date <= '2028-04-01' && w.events.length > 100, true);
}
check(
  '1 年より前の回は出さない（COUNT は前の回も数える）',
  dates(cal(['UID:p1', 'DTSTART;VALUE=DATE:20240101', 'RRULE:FREQ=MONTHLY;COUNT=18', 'SUMMARY:x'])),
  ['2025-04-01', '2025-05-01', '2025-06-01'],
);
{
  const r = parseIcsCalendar(cal(['UID:u1', 'DTSTART;VALUE=DATE:20260401', 'RRULE:FREQ=YEARLY;BYWEEKNO=20', 'SUMMARY:x']), { now: NOW });
  check('扱えない RRULE は初回だけ', [r.events.map((e) => e.date), r.stats.unsupportedRules], [['2026-04-01'], 1]);
}
{
  const r = parseIcsCalendar(cal(['UID:c1', 'DTSTART;VALUE=DATE:20260401', 'STATUS:CANCELLED', 'SUMMARY:x']), { now: NOW });
  check('取り消し済みは飛ばす', [r.events.length, r.stats.cancelled], [0, 1]);
}
{
  const [ev] = parseIcs(cal(['UID:s1', 'DTSTART;VALUE=DATE:20260401', 'DTEND;VALUE=DATE:20260404', 'SUMMARY:研修']), { now: NOW });
  check('複数日の終日（DTEND は翌日を指す）', [ev.date, ev.endDate], ['2026-04-01', '2026-04-03']);
  const [d] = parseIcs(cal(['UID:s2', 'DTSTART:20260401T090000', 'DURATION:PT1H30M', 'SUMMARY:打合せ']), { now: NOW });
  check('DURATION', [d.endHour, d.endMinute, d.endDate], ['10', '30', '2026-04-01']);
}

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
