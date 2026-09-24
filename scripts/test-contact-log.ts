// 担当者連絡先のやり取り履歴（src/lib/contactLog.ts）のテスト。  node scripts/test-contact-log.ts
import { sortLog, summarize, sampleLedger, quoteLedger, entryFromPurpose, findByCompany, isChatNicknameOnly, logCsv, daysBetween, type ContactLogEntry } from '../src/lib/contactLog.ts';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};
const today = '2026-09-24';
const e = (o: Partial<ContactLogEntry>): ContactLogEntry => ({ id: 'a', date: today, kind: '問合せ', text: '', ...o });

check('日数', daysBetween('2026-08-25', today), 30);
check('新しい順・同日は後の id が上', sortLog([e({ id: 'a', date: '2026-09-01' }), e({ id: 'b', date: '2026-09-20' }), e({ id: 'c', date: '2026-09-20' })]).map((x) => x.id), ['c', 'b', 'a']);

const log = [
  e({ id: '1', date: '2026-08-01', kind: 'サンプル', status: '到着' }),
  e({ id: '2', date: '2026-09-20', kind: 'サンプル', status: '依頼中' }),
  e({ id: '3', date: '2026-07-01', kind: 'サンプル', status: '返却済' }),
  e({ id: '4', date: '2026-09-22', kind: '見積', amount: 120000, project: 'A邸' }),
];
check('要約', summarize(log, today), { count: 4, last: '2026-09-22', openSamples: 2, returnDue: 1 });

const contacts = [
  { id: 'x', company: 'サンプル建材', name: '田中', log },
  { id: 'y', company: '別メーカー', name: '鈴木', log: [e({ id: '5', date: '2026-09-10', kind: '見積', amount: 30000, project: 'A邸' }), e({ id: '6', date: '2026-09-11', kind: '見積', amount: 5000 })] },
];
check('サンプル台帳は返却待ち→依頼中', sampleLedger(contacts, today).map((r) => [r.entry.id, r.days]), [['1', 54], ['2', 4]]);
check('済みも含める', sampleLedger(contacts, today, true).length, 3);
const q = quoteLedger(contacts, today);
check('見積は新しい順', q.rows.map((r) => r.entry.id), ['4', '6', '5']);
check('案件ごとの合計', q.byProject, [{ project: 'A邸', total: 150000, count: 2 }, { project: '（案件なし）', total: 5000, count: 1 }]);

check('サンプル請求は依頼中で記録', (({ kind, status, source }) => ({ kind, status, source }))(entryFromPurpose('サンプル請求', '品番X', today)), { kind: 'サンプル', status: '依頼中', source: 'Maker conect' });
check('打合せ依頼', entryFromPurpose('打合せ依頼', '', today).kind, '打合せ');
check('株式会社・㈱・全角の違いを無視', findByCompany([{ id: 'k', company: '株式会社 ＡＢＣ建材' }], '㈱abc建材')?.id, 'k');
check('空の会社名は探さない', findByCompany([{ id: 'k', company: '' }], ''), null);
check('チャットの呼び名だけは連絡先でない', isChatNicknameOnly({ nickname: 'たなか' }), true);
check('普通の連絡先', isChatNicknameOnly({ company: 'A', createdAt: 1 }), false);
check('CSV の見出しと行数', logCsv(contacts).split('\n').filter(Boolean).length, 1 + 6);

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
