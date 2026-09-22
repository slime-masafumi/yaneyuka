import { decodeBody, isBlockedAddress } from '../src/lib/safeExternalFetch.ts';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};

// Shift_JIS の「建築」= 0x8C 0x9A 0x92 0x7A
const sjisBody = new Uint8Array([
  ...new TextEncoder().encode('<html><head><title>'),
  0x8c, 0x9a, 0x92, 0x7a,
  ...new TextEncoder().encode('</title></head></html>'),
]);
check('ヘッダでShift_JIS', decodeBody(sjisBody, 'text/html; charset=Shift_JIS').includes('建築'), true);

const sjisWithMeta = new Uint8Array([
  ...new TextEncoder().encode('<html><head><meta charset="shift_jis"><title>'),
  0x8c, 0x9a, 0x92, 0x7a,
  ...new TextEncoder().encode('</title></head></html>'),
]);
check('metaでShift_JIS', decodeBody(sjisWithMeta, 'text/html').includes('建築'), true);
check('宣言なしはUTF-8', decodeBody(new TextEncoder().encode('<title>建築</title>'), null).includes('建築'), true);
check('UTF-8宣言', decodeBody(new TextEncoder().encode('<title>建築</title>'), 'text/html; charset=utf-8').includes('建築'), true);
check('知らない文字コードでも落ちない', typeof decodeBody(new TextEncoder().encode('<title>x</title>'), 'text/html; charset=bogus-9999'), 'string');

check('10.0.0.1 は拒否', isBlockedAddress('10.0.0.1', 4), true);
check('172.16.0.1 は拒否', isBlockedAddress('172.16.0.1', 4), true);
check('172.32.0.1 は許可', isBlockedAddress('172.32.0.1', 4), false);
check('169.254.169.254 は拒否', isBlockedAddress('169.254.169.254', 4), true);
check('100.64.0.1 は拒否', isBlockedAddress('100.64.0.1', 4), true);
check('8.8.8.8 は許可', isBlockedAddress('8.8.8.8', 4), false);
check('::1 は拒否', isBlockedAddress('::1', 6), true);
check('fd00:: は拒否', isBlockedAddress('fd00::1', 6), true);
check('IPv4射影の私有は拒否', isBlockedAddress('::ffff:10.0.0.1', 6), true);
check('2001:db8:: は許可', isBlockedAddress('2001:db8::1', 6), false);

console.log(bad ? `${bad} FAILED` : 'ALL PASS');
