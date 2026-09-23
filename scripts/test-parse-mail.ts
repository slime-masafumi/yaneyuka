// yymail のメール読み取り（.eml）のテスト。  node scripts/test-parse-mail.ts
// 日本の古いメールソフトが出す ISO-2022-JP の件名・本文と、RFC 2231 の添付名を読めるか。
import { parseMailFile } from '../src/components/content/Userpage/yymail/parseMail.ts';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};

// 「図面」を ISO-2022-JP で（ESC $ B 3F5E 4C4C ESC ( B）
const jis = Buffer.from([0x1b, 0x24, 0x42, 0x3f, 0x5e, 0x4c, 0x4c, 0x1b, 0x28, 0x42]);
const pdf = Buffer.from('%PDF-1.4\n%fake\n');
const eml = Buffer.concat([
  Buffer.from(
    [
      'Message-ID: <abc123@example.co.jp>',
      'Date: Wed, 15 Apr 2026 10:30:00 +0900',
      'From: =?UTF-8?B?55Sw5Lit?= <tanaka@a-kensetsu.co.jp>',
      'To: you@example.com, =?UTF-8?B?5L2Q6Jek?= <sato@example.com>',
      'Cc: boss@example.com',
      `Subject: =?ISO-2022-JP?B?${jis.toString('base64')}?= rev2`,
      'MIME-Version: 1.0',
      'Content-Type: multipart/mixed; boundary="XX"',
      '',
      '--XX',
      'Content-Type: text/plain; charset=ISO-2022-JP',
      'Content-Transfer-Encoding: 7bit',
      '',
      '',
    ].join('\r\n')
  ),
  jis,
  Buffer.from(
    [
      '',
      '--XX',
      'Content-Type: application/pdf',
      "Content-Disposition: attachment; filename*=UTF-8''A-101_%E5%B9%B3%E9%9D%A2%E5%9B%B3_rev2.pdf",
      'Content-Transfer-Encoding: base64',
      '',
      pdf.toString('base64'),
      '--XX--',
      '',
    ].join('\r\n')
  ),
]);

const file = new File([eml], 'test.eml', { type: 'message/rfc822' });
const m = await parseMailFile(file);
check('件名（ISO-2022-JP）', m.subject, '図面 rev2');
check('本文（ISO-2022-JP）', m.text.trim(), '図面');
check('差出人', m.from, { name: '田中', address: 'tanaka@a-kensetsu.co.jp' });
check('宛先', m.to.map((a) => a.address), ['you@example.com', 'sato@example.com']);
check('CC', m.cc.map((a) => a.address), ['boss@example.com']);
check('日時', m.date, '2026-04-15T01:30:00.000Z');
check('Message-ID', m.messageId, '<abc123@example.co.jp>');
check('添付名（RFC 2231）', m.attachments.map((a) => a.filename), ['A-101_平面図_rev2.pdf']);
check('添付の中身', Buffer.from(m.attachments[0].data).toString(), pdf.toString());

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
