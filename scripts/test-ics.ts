import { parseIcs, buildIcs, unfoldLines, unescapeText, parseIcsDate } from '../src/lib/ics.ts';

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
  'END:VEVENT',
  'BEGIN:VEVENT',
  'SUMMARY:DTSTARTなしなので捨てる',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

const parsed = parseIcs(sample);
check('読めた件数（壊れた1件は飛ばす）', parsed.length, 2);
check('終日の予定', [parsed[0].date, parsed[0].allDay, parsed[0].title], ['2026-04-01', true, '現場定例, 第1回']);
check('時刻つきの予定', [parsed[1].date, parsed[1].startHour, parsed[1].startMinute, parsed[1].endHour, parsed[1].endMinute], ['2026-04-03', '14', '00', '15', '30']);
check('改行入りの説明', parsed[1].details, '立会\n検査機関');

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

console.log(bad ? `${bad} FAILED` : 'ALL PASS');
