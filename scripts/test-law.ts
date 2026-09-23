// My法規の改正追従（src/lib/egovLaw.ts / src/lib/lawDiff.ts）のテスト。
//   node scripts/test-law.ts          … 手元だけ
//   node scripts/test-law.ts --live   … e-Gov を実際に数回叩く
import { parseJaNumber, buildElm, lawTextStillHolds, toWareki, fetchLawElement, fetchRevisions, searchLaws } from '../src/lib/egovLaw.ts';
import { diffChars, carryStyles, styledToHtml } from '../src/lib/lawDiff.ts';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};

// 番号
check('五十二', parseJaNumber('五十二'), 52);
check('百二十六', parseJaNumber('百二十六'), 126);
check('十', parseJaNumber('十'), 10);
check('千百一', parseJaNumber('千百一'), 1101);
check('全角５２', parseJaNumber('５２'), 52);
check('読めない', parseJaNumber('附則'), null);

// elm
check('第52条', buildElm('第52条', '', ''), 'MainProvision-Article_52');
check('第五十二条の二', buildElm('第五十二条の二', '', ''), 'MainProvision-Article_52_2');
check('126条の2 1項', buildElm('126条の2', '1項', ''), 'MainProvision-Article_126_2-Paragraph_1');
check('号だけ→1項', buildElm('52', '', '3号'), 'MainProvision-Article_52-Paragraph_1-Item_3');
check('号の2', buildElm('52', '2', '3号の2'), 'MainProvision-Article_52-Paragraph_2-Item_3_2');
check('号イ', buildElm('20', '1', '一イ'), 'MainProvision-Article_20-Paragraph_1-Item_1-Subitem1_1');
check('号ロ', buildElm('20', '1', '1号ロ'), 'MainProvision-Article_20-Paragraph_1-Item_1-Subitem1_2');
check('附則は対象外', buildElm('附則', '', ''), null);
check('空', buildElm('', '', ''), null);

// 包含
check('空白違いは同じ', lawTextStillHolds('建築物の　延べ面積\n', '建築物の延べ面積の敷地面積'), true);
check('抜き出しも同じ', lawTextStillHolds('延べ面積', '建築物の延べ面積の敷地面積'), true);
check('変わった', lawTextStillHolds('延べ床面積', '建築物の延べ面積'), false);

// 和暦
check('令和', toWareki('2026-05-27'), '令和8年5月27日');
check('令和元年', toWareki('2019-05-01'), '令和元年5月1日');
check('平成31年', toWareki('2019-04-30'), '平成31年4月30日');

// 差分
{
  const d = diffChars('建築物の延べ面積は十分の六以下とする。', '建築物の延べ面積は十分の八以下とする。');
  const dels = [...d.aMark].map((m, i) => (m === 1 ? Array.from('建築物の延べ面積は十分の六以下とする。')[i] : '')).join('');
  const ins = [...d.bMark].map((m, i) => (m === 1 ? Array.from('建築物の延べ面積は十分の八以下とする。')[i] : '')).join('');
  check('1字の改正（削）', dels, '六');
  check('1字の改正（加）', ins, '八');
  check('changed', d.changed, true);
}
check('空白だけ違う', diffChars('第一条　目的', '第一条 目的\n').changed, false);
{
  // 文単位 → 文字単位の二段が効いているか（長文の真ん中の1文だけ変える）
  const s = (n: number) => `第${n}項の規定は、建築物の敷地について適用する。`;
  const a = Array.from({ length: 200 }, (_, i) => s(i)).join('');
  const b = a.replace(s(100), '第100項の規定は、建築物及びその敷地について適用する。');
  const t0 = Date.now();
  const d = diffChars(a, b);
  const ms = Date.now() - t0;
  const ins = [...d.bMark].map((m, i) => (m === 1 ? Array.from(b)[i] : '')).join('');
  // 「建築物の敷地」→「建築物及びその敷地」。元の「の」は残るので、最小の差分は「及びそ」の3字
  check('長文の1箇所', ins, '及びそ');
  check(`長文でも速い（${ms}ms < 500）`, ms < 500, true);
}

// 書式の引き継ぎ
{
  const Y = 'background-color:#fef9c3';
  const oldText = '容積率は十分の六以下とする。';
  const styles = Array.from(oldText).map((_, i) => (i >= 0 && i < 3 ? Y : ''));
  const carried = carryStyles({ text: oldText, styles }, '容積率は、十分の八以下とする。');
  check('ハイライトが残る', carried.slice(0, 3), [Y, Y, Y]);
  check('入った「、」は書式なし', carried[4], '');
  check('HTML', styledToHtml('容積率は', [Y, Y, Y, '']), `<span style="${Y}">容積率</span>は`);
}
{
  const Y = 'background-color:#fef9c3';
  // 空白を挟んでもハイライトが途切れない
  const carried = carryStyles({ text: '第一条目的', styles: Array(5).fill(Y) }, '第一条　目的');
  check('空白はつながる', carried, Array(6).fill(Y));
}
{
  // 大きな書き換えの中の偶然の1字一致（「から」の「ら」）に書式を飛ばさない
  const B = 'font-weight:bold';
  const oldText = '建築主は、第一号から第三号までに掲げる建築物を建築しようとする場合';
  const styles = Array.from(oldText).map((_, i) => (i >= 5 && i < 17 ? B : ''));
  const newText = '建築主は、第一号若しくは第二号に掲げる建築物を建築しようとする場合、これらの建築物の大規模の修繕';
  const carried = carryStyles({ text: oldText, styles }, newText);
  const boldChars = Array.from(newText).filter((_, j) => carried[j] === B).join('');
  check('飛び地が出ない', boldChars.includes('ら'), false);
  check('一致した頭は残る', boldChars.startsWith('第一号'), true);
}
check('改行は<br>・エスケープ', styledToHtml('a<b\nc', []), 'a&lt;b<br>c');

if (process.argv.includes('--live')) {
  const found = await searchLaws('建築基準法施行令');
  check('検索: 施行令が出る', found.some((l) => l.lawId === '325CO0000000338'), true);

  const art = await fetchLawElement('325AC0000000201', 'MainProvision-Article_52-Paragraph_1-Item_1');
  check('第52条1項1号の先頭', art.text.slice(0, 1), '一');
  console.log('   ', art.text.slice(0, 80));

  const whole = await fetchLawElement('325CO0000000338', 'MainProvision-Article_126_2');
  check('条の見出しと条番号', whole.text.split('\n').slice(0, 2).map((l) => l.slice(0, 8)), ['（設置）', '第百二十六条の二']);

  const revs = await fetchRevisions('325AC0000000201');
  check('現行の版がある', revs.filter((r) => r.status === 'CurrentEnforced').length, 1);
  console.log('    施行前の改正:', revs.filter((r) => r.status === 'UnEnforced').map((r) => r.enforcementDate).join(', '));

  // 現行と施行前で第52条を比べる
  const future = revs.find((r) => r.status === 'UnEnforced');
  if (future) {
    const now = await fetchLawElement('325AC0000000201', 'MainProvision-Article_52');
    const later = await fetchLawElement(future.revisionId, 'MainProvision-Article_52');
    console.log(`    第52条 現行→${future.enforcementDate}: ${diffChars(now.text, later.text).changed ? '変わる' : '変わらない'}`);
  }

  try {
    await fetchLawElement('325AC0000000201', 'MainProvision-Article_999');
    check('無い条は not-found', 'no error', 'not-found');
  } catch (e) {
    check('無い条は not-found', (e as { kind?: string }).kind, 'not-found');
  }
}

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
