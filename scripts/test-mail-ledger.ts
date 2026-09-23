// yymail（物件メール台帳）の判定のテスト。  node scripts/test-mail-ledger.ts
import { parseDrawingName, normalizeSubject, matchProject, pickTodoLines } from '../src/lib/mailLedger.ts';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};
const d = (f: string) => {
  const r = parseDrawingName(f);
  return r && [r.number, r.rev, r.title];
};

check('rev2', d('A-101_1階平面図_rev2.pdf'), ['A-101', '2', '1階平面図']);
check('括弧の英字', d('A101 1階平面図 (B).pdf'), ['A-101', 'B', '1階平面図']);
check('第3版', d('S-02_基礎伏図_第3版.pdf'), ['S-02', '3', '基礎伏図']);
check('日付と△', d('20260415_E-10_電灯設備図△1.pdf'), ['E-10', '1', '電灯設備図']);
check('全角', d('Ａ－１０１　平面図　Ｒ２.pdf'), ['A-101', '2', '平面図']);
check('版なし', d('M-3_空調設備図.pdf'), ['M-3', null, '空調設備図']);
check('v3', d('A-201_立面図_v3.pdf'), ['A-201', '3', '立面図']);
check('Rev.C', d('X-05 詳細図 Rev.C.pdf'), ['X-05', 'C', '詳細図']);
check('重複番号(2)は版にしない', d('A-101 平面図 (2).pdf'), ['A-101', null, '平面図 (2)']);
check('図番なし', d('意匠図一式.pdf'), null);
check('階の表記B1は図番にしない', d('B1平面.pdf'), null);
check('RC造を版にしない', d('S-11_RC造配筋.pdf'), ['S-11', null, 'RC造配筋']);
check('版順（英字）', parseDrawingName('A-1 (C).pdf')?.revOrder, 3);
check('版順（数字）', parseDrawingName('A-1 rev12.pdf')?.revOrder, 12);

check('Re/Fwd', normalizeSubject('Re: Fwd: RE：【A邸】図面送付'), '【A邸】図面送付');
check('転送', normalizeSubject('転送: 定例議事録'), '定例議事録');
check('番号つきRe', normalizeSubject('Re[2]: 見積'), '見積');

const projects = [
  { id: 'a', name: 'A邸', keywords: ['A邸', 'a-kensetsu.co.jp'] },
  { id: 'b', name: 'Bビル', keywords: ['Bビル'] },
];
const mail = (subject: string, from = 'x@example.com', text = '') => ({ subject, text, from, to: [], cc: [] });
check('件名で当たる', matchProject(mail('【A邸】図面送付'), projects), 'a');
check('差出人ドメインで当たる', matchProject(mail('図面送付', 'tanaka@a-kensetsu.co.jp'), projects), 'a');
check('件名が本文より強い', matchProject(mail('Bビル 定例', 'x@example.com', 'A邸の件も'), projects), 'b');
check('全角半角を無視', matchProject(mail('Ｂビル 見積'), projects), 'b');
check('当たらない', matchProject(mail('ご挨拶'), projects), null);

check(
  '宿題の行',
  pickTodoLines('お世話になります。\n> 1階平面図を修正のうえ、4/20までにご送付ください。\n件名: xx\n以上です。'),
  ['1階平面図を修正のうえ、4/20までにご送付ください。']
);

check('報告の行は拾わない', pickTodoLines('修正版です。\n図面を送付いたしました。'), []);

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
