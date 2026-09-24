// 業務管理（src/lib/workLog.ts）のテスト。  node scripts/test-work-log.ts
import { periodPreset, splitByMonth, mergeMonths, projectStats, toCsv, type DailyRecords } from '../src/lib/workLog.ts';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};

const today = new Date(2026, 8, 24); // 2026-09-24
check('今月', periodPreset('thisMonth', today), ['2026-09-01', '2026-09-24']);
check('先月', periodPreset('lastMonth', today), ['2026-08-01', '2026-08-31']);
check('今年度（4月始まり）', periodPreset('fiscalYear', today), ['2026-04-01', '2026-09-24']);
check('1〜3月は前年4月から', periodPreset('fiscalYear', new Date(2027, 1, 10)), ['2026-04-01', '2027-02-10']);
check('1月の先月は前年12月', periodPreset('lastMonth', new Date(2027, 0, 5)), ['2026-12-01', '2026-12-31']);

const projects = [
  { id: 'a', code: '26-001', name: 'A邸', fee: 3_000_000 },
  { id: 'b', code: '26-002', name: 'Bビル' },
];
const records: DailyRecords = {
  '2026-08-31': [{ id: '1', projectId: 'a', description: '基本計画', hours: 4, phase: '基本設計' }],
  '2026-09-01': [
    { id: '2', projectId: 'a', description: '実施図', hours: 6, phase: '実施設計' },
    { id: '3', projectId: 'b', description: '打合せ', hours: 2, phase: '打合せ' },
    { id: '4', projectId: '', description: '', hours: '' },
  ],
  '2026-09-02': [{ id: '5', projectId: 'a', description: '古い記録', hours: 2 }],
};

const months = splitByMonth(records);
check('月ごとに分ける', Object.keys(months).sort(), ['2026-08', '2026-09']);
check('空の行は保存しない', months['2026-09']['2026-09-01'].length, 2);
check('戻すと同じ日付が揃う', Object.keys(mergeMonths(months)).sort(), ['2026-08-31', '2026-09-01', '2026-09-02']);

// 9月だけを集計、目標時間単価 1万円/h
const s = projectStats(records, projects, '2026-09-01', '2026-09-30', 10_000);
check('期間の合計', s.total, 10);
check('A邸は8時間（期間内）', s.list[0].hours, 8);
check('工種別（未分類を含む）', s.list[0].byPhase, { 実施設計: 6, 未分類: 2 });
// 時間単価と消化率は全期間（12時間）で見る
check('時間単価 = 300万 ÷ 12h', s.list[0].hourlyValue, 250_000);
check('予算時間 = 300万 ÷ 1万', s.list[0].budgetHours, 300);
check('消化率 = 12 ÷ 300', s.list[0].usage, 0.04);
check('設計料なしは単価なし', s.list[1].hourlyValue, undefined);

const csv = toCsv(records, projects, '2026-09-01', '2026-09-30').split('\n');
check('CSV の見出し', csv[0], '﻿日付,プロジェクトNo,プロジェクト名,工種,作業内容,工数(h)');
check('CSV の行数（空行と期間外を除く）', csv.filter(Boolean).length, 4);
check('工種の無い行は未分類', csv.some((l) => l.includes('"未分類"')), true);

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
