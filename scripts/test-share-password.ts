// ファイル転送の合言葉（src/lib/sharePassword.ts）のテスト。  node scripts/test-share-password.ts
import { hashSharePassword, verifySharePassword } from '../src/lib/sharePassword.ts';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};
const h = await hashSharePassword('A邸-0930');
check('合っていれば通る', await verifySharePassword('A邸-0930', h), true);
check('違えば通らない', await verifySharePassword('A邸-0931', h), false);
check('全角で打っても同じ', await verifySharePassword('A邸－０９３０', h), true);
check('空は通らない', await verifySharePassword('', h), false);
const h2 = await hashSharePassword('A邸-0930');
check('同じ合言葉でも毎回ちがうハッシュ', h.passwordHash !== h2.passwordHash, true);
check('合言葉そのものは入っていない', JSON.stringify(h).includes('0930'), false);

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
