// 建築確認・検査の期限の逆算（src/lib/permitSchedule.ts）のテスト。  node scripts/test-permit-schedule.ts
import { permitMilestones } from '../src/lib/permitSchedule.ts';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};
const pick = (ms: ReturnType<typeof permitMilestones>, word: string) => ms.find((m) => m.title.includes(word))?.date;

const ms = permitMilestones({ project: 'A邸', start: '2026-11-02', specificProcess: '2027-01-15', finish: '2027-04-30', review: 'large' });
// 35 日 + 余裕 14 日 = 49 日前
check('確認申請の目安（49日前）', pick(ms, '確認申請'), '2026-09-14');
check('中間検査の申請期限（4日後）', pick(ms, '中間検査'), '2027-01-19');
check('完了検査の申請期限（4日後）', pick(ms, '完了検査 申請'), '2027-05-04');
check('完了検査（受理から7日）', pick(ms, '完了検査（'), '2027-05-11');
check('日付順に並ぶ', ms.map((m) => m.date), [...ms.map((m) => m.date)].sort());
check('物件名が付く', ms[0].title.startsWith('【A邸】'), true);

// 新3号は 7 日、適判ありは 70 日
check('新3号', pick(permitMilestones({ project: '', start: '2026-11-02', review: 'small', margin: 0 }), '確認申請'), '2026-10-26');
check('適判あり', pick(permitMilestones({ project: '', start: '2026-11-02', review: 'tekihan', margin: 0 }), '確認申請'), '2026-08-24');
// 月をまたぐ・閏年
check('月末をまたぐ', pick(permitMilestones({ project: '', start: '2028-03-01', finish: '2028-02-27', review: 'small' }), '完了検査 申請'), '2028-03-02');
check('着工日が無ければ空', permitMilestones({ project: 'x', start: '', review: 'large' }), []);

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
