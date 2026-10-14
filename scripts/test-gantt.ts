// 設計ツール「工程表」の計算（src/lib/gantt.ts）のテスト。  node scripts/test-gantt.ts
import {
  DEFAULT_CALENDAR, TEMPLATES, addWorkdays, shiftWorkdays, shiftTasks, workdaysBetween, offReason, nextWorkday, cascade, canLink, criticalPath,
  groupSpan, plannedProgress, isBehind, displayRange, monthsToFit, headerCells, monthCells, barSpan, paginate,
  instantiate, toCsv, fromCsv, parseCsvRows, toIcs, normalizeTasks, normalizeCalendar, type GanttTask,
} from '../src/lib/gantt.ts';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};

const cal = DEFAULT_CALENDAR;
const hol = { '2026-11-03': '文化の日', '2026-11-23': '勤労感謝の日' };
const t = (o: Partial<GanttTask> & { id: number }): GanttTask => ({ name: `t${o.id}`, start: '2026-11-02', end: '2026-11-02', color: '#000000', innerText: '', order: o.id, ...o });

// --- 稼働日
check('日曜は休み', offReason('2026-11-01', cal, hol), '日曜');
check('祝日は休み', offReason('2026-11-03', cal, hol), '文化の日');
check('土曜は既定で稼働', offReason('2026-11-07', cal, hol), null);
check('土曜休みにできる', offReason('2026-11-07', { ...cal, saturday: true }, hol), '土曜');
check('年末年始', offReason('2026-12-30', cal, hol), '年末年始');
check('年明け 1/3 まで', offReason('2027-01-03', cal, hol), '年末年始');
check('1/4 は稼働', offReason('2027-01-04', cal, hol), null);
check('お盆', offReason('2026-08-14', cal, hol), 'お盆');
check('次の稼働日（日曜→月曜）', nextWorkday('2026-11-01', cal, hol), '2026-11-02');
// 11/2(月) から 5 稼働日: 2,4,5,6,7（3日は祝日）
check('5 稼働日（祝日を飛ばす）', addWorkdays('2026-11-02', 5, cal, hol), '2026-11-07');
check('稼働日数 11/2〜11/7', workdaysBetween('2026-11-02', '2026-11-07', cal, hol), 5);
check('1 稼働日は当日', addWorkdays('2026-11-02', 1, cal, hol), '2026-11-02');
check('開始が休みなら次の稼働日から', addWorkdays('2026-11-01', 1, cal, hol), '2026-11-02');
check('年末をまたぐ', addWorkdays('2026-12-26', 3, cal, hol), '2027-01-04'); // 26(土) 28(月) → 29〜3 休み → 1/4
check('3 稼働日後ろへ（祝日を飛ばす）', shiftWorkdays('2026-11-02', 3, cal, hol), '2026-11-06');
check('2 稼働日前へ（日曜を飛ばす）', shiftWorkdays('2026-11-02', -2, cal, hol), '2026-10-30');
{
  const ts = [t({ id: 1, start: '2026-11-02', end: '2026-11-07' }), t({ id: 2, kind: 'milestone', start: '2026-11-09', end: '2026-11-09' }), t({ id: 3, kind: 'group', start: '', end: '' })];
  const s = shiftTasks(ts, new Set([1, 2, 3]), 2, cal, hol);
  check('まとめてずらす（日数を保つ）', [s[0].start, s[0].end, workdaysBetween(s[0].start, s[0].end, cal, hol)], ['2026-11-05', '2026-11-10', 5]);
  check('節目もずらす', s[1].start, '2026-11-11');
  check('大項目は触らない', s[2].start, '');
}
check('休工日', offReason('2026-11-05', { ...cal, extraOff: ['2026-11-05'] }, hol), '休工日');
check('全部休みでも止まる', typeof nextWorkday('2026-11-01', { sunday: true, saturday: true, holidays: true, yearEnd: true, summer: true }, hol), 'string');

// --- 前工程で押し出す
{
  const tasks = [
    t({ id: 1, start: '2026-11-02', end: '2026-11-10' }),
    t({ id: 2, start: '2026-11-05', end: '2026-11-07', after: 1 }), // 前と重なっている → 11/11 から
    t({ id: 3, start: '2026-11-20', end: '2026-11-20', after: 2, kind: 'milestone' }), // 余裕あり → 動かない
  ];
  const r = cascade(tasks, cal, hol);
  check('後工程は前の翌稼働日から', [r.tasks[1].start, r.tasks[1].end], ['2026-11-11', '2026-11-13']);
  check('余裕があれば動かさない', r.tasks[2].start, '2026-11-20');
  check('動いた工程', r.moved, [2]);
  const r2 = cascade([tasks[0], { ...tasks[1], start: '2026-11-11', end: '2026-11-13' }, { ...tasks[2], start: '2026-11-12', end: '2026-11-12' }], cal, hol);
  check('節目は前工程の終わった日', r2.tasks[2].start, '2026-11-13');
  check('完了した工程は動かさない', cascade([tasks[0], { ...tasks[1], progress: 100 }], cal, hol).tasks[1].start, '2026-11-05');
  check('空け日数（養生 3 日）', cascade([tasks[0], { ...tasks[1], lag: 3 }], cal, hol).tasks[1].start, '2026-11-14');
  check('前が早まっても引き寄せない', cascade([{ ...tasks[0], end: '2026-11-04' }, { ...tasks[1], start: '2026-11-20', end: '2026-11-21' }], cal, hol).moved, []);
  // 循環
  const loop = [t({ id: 1, after: 2 }), t({ id: 2, after: 1 })];
  check('循環しても止まる', cascade(loop, cal, hol).tasks.length, 2);
  check('循環になるつなぎは不可', canLink([t({ id: 1 }), t({ id: 2, after: 1 })], 1, 2), false);
  check('自分は不可', canLink([t({ id: 1 })], 1, 1), false);
  check('大項目は前工程にできない', canLink([t({ id: 1, kind: 'group' }), t({ id: 2 })], 2, 1), false);
  check('普通のつなぎは可', canLink([t({ id: 1 }), t({ id: 2 })], 2, 1), true);
}

// --- クリティカルパス
{
  const tasks = [
    t({ id: 1, start: '2026-11-02', end: '2026-11-06' }),
    t({ id: 2, start: '2026-11-07', end: '2026-11-13', after: 1 }), // 1 の直後 → 響く
    t({ id: 3, start: '2026-11-02', end: '2026-11-04' }), // 独立・早く終わる
    t({ id: 4, start: '2026-11-13', end: '2026-11-13', after: 2, kind: 'milestone' }),
  ];
  const cp = criticalPath(cascade(tasks, cal, hol).tasks, cal, hol);
  check('クリティカルパス', [...cp].sort(), [1, 2, 4]);
  const gap = [tasks[0], { ...tasks[1], start: '2026-11-10' }];
  check('余裕があれば前は入らない', [...criticalPath(gap, cal, hol)].sort(), [2]);
}

// --- 大項目
{
  const tasks = [
    t({ id: 1, kind: 'group', start: '', end: '' }),
    t({ id: 2, start: '2026-11-02', end: '2026-11-11', progress: 100 }), // 10 日
    t({ id: 3, start: '2026-11-05', end: '2026-11-14', progress: 0 }), // 10 日
    t({ id: 4, kind: 'group', start: '', end: '' }),
    t({ id: 5, start: '2026-12-01', end: '2026-12-01' }),
  ];
  check('大項目の期間と進捗', groupSpan(tasks, 1), { start: '2026-11-02', end: '2026-11-14', progress: 50 });
  check('次の大項目で区切る', groupSpan(tasks, 4), { start: '2026-12-01', end: '2026-12-01', progress: 0 });
  check('中身の無い大項目', groupSpan([t({ id: 9, kind: 'group' })], 9), null);
}

// --- 遅れ
{
  const x = t({ id: 1, start: '2026-11-02', end: '2026-11-13', progress: 20 }); // 10 稼働日
  check('予定の進み（11/9 時点 = 5/10）', plannedProgress(x, '2026-11-09', cal, hol), 50);
  check('初日は 0', plannedProgress(x, '2026-11-02', cal, hol), 0);
  check('予定より遅い', isBehind(x, '2026-11-09', cal, hol), true);
  check('予定どおり', isBehind({ ...x, progress: 50 }, '2026-11-09', cal, hol), false);
  check('節目は日を過ぎて未完了なら遅れ', isBehind(t({ id: 2, kind: 'milestone', start: '2026-11-02', end: '2026-11-02' }), '2026-11-03', cal, hol), true);
}

// --- 表示範囲・見出し
{
  const tasks = [t({ id: 1, start: '2026-10-20', end: '2026-12-05' })];
  check('月初から 3 か月', displayRange(tasks, 3), { start: '2026-10-01', end: '2026-12-31', days: 92 });
  check('開始を指定', displayRange(tasks, 1, '2027-02-10'), { start: '2027-02-01', end: '2027-02-28', days: 28 });
  check('全部入る月数', monthsToFit(tasks), 3);
  const r = { start: '2026-10-01', days: 92 };
  check('月の見出し', headerCells(r, 'month').map((c) => c.len), [31, 30, 31]);
  check('上段は年月', monthCells(r, 'day')[0].label, '2026年 10月');
  check('月表示の上段は年', monthCells({ start: '2026-12-01', days: 62 }, 'month').map((c) => c.label), ['2026年', '2027年']);
  // 10/1 は木曜 → 最初の週は 木〜日 の 4 日
  check('週は月曜始まり', headerCells(r, 'week').slice(0, 2).map((c) => [c.label, c.len]), [['10/1', 4], ['10/5', 7]]);
  check('週の合計は日数', headerCells(r, 'week').reduce((s, c) => s + c.len, 0), 92);
  check('バーの位置', barSpan('2026-10-03', '2026-10-05', r), { from: 2, len: 3, cutL: false, cutR: false });
  check('はみ出しは切る', barSpan('2026-09-25', '2026-10-02', r), { from: 0, len: 2, cutL: true, cutR: false });
  check('範囲外', barSpan('2027-02-01', '2027-02-02', r), null);
  check('ページ分け', paginate([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  check('空でも 1 ページ', paginate([], 10), [[]]);
}

// --- テンプレート
for (const tpl of TEMPLATES) {
  const tasks = instantiate(tpl, '2026-11-02', cal, hol, 1000);
  const real = tasks.filter((x) => x.kind !== 'group');
  const broken = real.filter((x) => !x.start || x.end < x.start || (x.after != null && !tasks.some((y) => y.id === x.after)));
  check(`テンプレート「${tpl.label}」が壊れていない`, broken.map((x) => x.name), []);
  // 押し出し後に前工程より前に始まっている工程が無い
  const byId = new Map(tasks.map((x) => [x.id, x]));
  const early = real.filter((x) => x.after != null && x.kind !== 'milestone' && x.start <= byId.get(x.after)!.end);
  check(`テンプレート「${tpl.label}」の前後関係`, early.map((x) => x.name), []);
  check(`テンプレート「${tpl.label}」は押し出し済み`, cascade(tasks, cal, hol).moved, []);
}
{
  const wood = instantiate(TEMPLATES[1], '2026-11-02', cal, hol, 1);
  const ho = wood.find((x) => x.name === '引渡し')!;
  console.log(`   (木造住宅テンプレートの引渡し: ${ho.start})`);
  check('木造住宅は 4〜6 か月で引渡し', ho.start > '2027-02-15' && ho.start < '2027-05-15', true);
}

// --- CSV
{
  const tasks = instantiate(TEMPLATES[0], '2026-11-02', cal, hol, 1);
  tasks[1].innerText = 'カンマ, と "引用"';
  tasks[1].note = '改行\nあり';
  const csv = toCsv(tasks, cal, hol);
  check('BOM 付き', csv.charCodeAt(0), 0xfeff);
  const back = fromCsv(csv, cal, hol, 500);
  check('CSV 往復でエラーなし', back.errors, []);
  check('CSV 往復で件数', back.tasks.length, tasks.length);
  check('CSV 往復で区分', back.tasks.map((x) => x.kind), tasks.map((x) => x.kind));
  check('CSV 往復で日付', back.tasks.map((x) => [x.start, x.end]).filter((_, i) => tasks[i].kind !== 'group'), tasks.filter((x) => x.kind !== 'group').map((x) => [x.start, x.end]));
  check('CSV 往復で引用符・改行', [back.tasks[1].innerText, back.tasks[1].note], ['カンマ, と "引用"', '改行\nあり']);
  const idx = (arr: GanttTask[], id: number | null | undefined) => arr.findIndex((x) => x.id === id);
  check('CSV 往復で前工程', back.tasks.map((x) => idx(back.tasks, x.after)), tasks.map((x) => idx(tasks, x.after)));
  check('Excel の日付（2026/11/2）も読む', fromCsv('工程名,開始,終了\n基礎,2026/11/2,2026/11/6\n', cal, hol, 1).tasks[0].start, '2026-11-02');
  check('終了が無ければ日数から', fromCsv('工程名,開始,稼働日数\n基礎,2026-11-02,5\n', cal, hol, 1).tasks[0].end, '2026-11-07');
  check('工程名の列が無い', fromCsv('a,b\n1,2\n', cal, hol, 1).errors.length, 1);
  check('開始が無い行は飛ばす', fromCsv('工程名,開始\nA,\nB,2026-11-02\n', cal, hol, 1).tasks.map((x) => x.name), ['B']);
  check('CSV の空行は無視', parseCsvRows('a,b\r\n\r\n1,2\r\n').length, 2);
}

// --- .ics
{
  const ics = toIcs([t({ id: 1, kind: 'group' }), t({ id: 2, start: '2026-11-02', end: '2026-11-06', name: '基礎, 配筋' }), t({ id: 3, kind: 'milestone', name: '上棟' })], '山田邸', 'p1', new Date(Date.UTC(2026, 9, 14)));
  check('大項目は入れない', (ics.match(/BEGIN:VEVENT/g) || []).length, 2);
  check('終日の DTEND は翌日', ics.includes('DTEND;VALUE=DATE:20261107'), true);
  check('カンマはエスケープ', ics.includes('SUMMARY:基礎\\, 配筋'), true);
  check('節目に◆', ics.includes('SUMMARY:◆ 上棟'), true);
  check('CRLF', ics.includes('\r\n'), true);
}

// --- 旧データ
{
  const old = [{ id: 1700000000000, name: '基礎', start: '2026-11-02', end: '2026-11-06', color: '#3B82F6', innerText: '', order: 1 }, null, { name: '壊れ', start: 'x' }];
  const n = normalizeTasks(old);
  check('旧データは task として読む', n.map((x) => [x.kind, x.progress, x.after]), [['task', 0, null]]);
  check('配列でなければ空', normalizeTasks({}), []);
  check('暦の既定値', normalizeCalendar(undefined), { ...DEFAULT_CALENDAR, extraOff: [] });
  check('暦の壊れた値', normalizeCalendar({ saturday: true, extraOff: ['x', '2026-11-05'] }).extraOff, ['2026-11-05']);
}

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
