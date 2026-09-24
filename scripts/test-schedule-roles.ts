// スケジュール調整の役割（src/lib/scheduleRoles.ts）のテスト。  node scripts/test-schedule-roles.ts
import { roleCoverage, bestOption } from '../src/lib/scheduleRoles.ts';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};
const options = [{ id: 'o1' }, { id: 'o2' }, { id: 'o3' }];
const people = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }];
const roles = { p1: '施主', p2: '設計', p3: '施工', p4: '施工' };
const r = (participantId: string, optionId: string, value: string) => ({ participantId, optionId, value });
const responses = [
  // o1: 施主×、他○ → ○が一番多いが施主が来られない
  r('p1', 'o1', 'no'), r('p2', 'o1', 'yes'), r('p3', 'o1', 'yes'), r('p4', 'o1', 'yes'),
  // o2: 全役割○（施工は p3 だけ○）
  r('p1', 'o2', 'yes'), r('p2', 'o2', 'yes'), r('p3', 'o2', 'yes'), r('p4', 'o2', 'no'),
  // o3: 施主△、設計は回答なし（△扱い）
  r('p1', 'o3', 'maybe'), r('p3', 'o3', 'yes'), r('p4', 'o3', 'no'),
];
const cov = roleCoverage(options, people, responses, roles, ['施主', '設計', '施工']);
check('施主が来られない日', cov[0], { optionId: 'o1', yes: 3, maybe: 0, missing: ['施主'], weak: [], allOk: false });
check('全役割が○の日', cov[1].allOk, true);
check('△だけの役割は weak', cov[2].weak, ['施主', '設計']);
check('確定の候補は全役割○の日（○の数が少なくても）', bestOption(cov), 'o2');
const noReq = roleCoverage(options, people, responses, roles, []);
check('必須が無ければ ○ の多い日', bestOption(noReq), 'o1');
check('必須が無ければ allOk は立てない', noReq.some((c) => c.allOk), false);

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
