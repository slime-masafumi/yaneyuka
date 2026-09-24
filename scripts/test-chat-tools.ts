// yychat の検索・期限読み取り・議事録（src/lib/chatTools.ts）のテスト。  node scripts/test-chat-tools.ts
import { normalizeForSearch, searchTerms, matchesAll, snippet, splitHits, parseDueHint, mentionsIn, taskTextFrom, minutesHtml } from '../src/lib/chatTools.ts';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};

// 検索
check('全角英数とカタカナを寄せる', normalizeForSearch('ＡＬＣ パネル'), 'alc ぱねる');
check('空白区切りは AND', matchesAll('A邸の サッシ納まり 確認', searchTerms('さっし A邸')), true);
check('片方だけでは当たらない', matchesAll('A邸の外壁', searchTerms('サッシ A邸')), false);
check('空の検索語は当てない', matchesAll('何でも', []), false);
check('抜粋は当たった前後', snippet('あいうえおかきくけこさしすせそ', ['さし'], 3), '…くけこさしすせそ');
check('当たり区切り', splitHits('外壁ALCの目地', searchTerms('alc')), [['外壁', false], ['ALC', true], ['の目地', false]]);

// 期限（2026-09-24 は木曜）
const today = new Date(2026, 8, 24);
check('9/30まで', parseDueHint('@田中 図面を9/30までに', today), '2026-09-30');
check('10月2日', parseDueHint('10月2日に提出', today), '2026-10-02');
check('過ぎた月日は来年', parseDueHint('9/10', today), '2027-09-10');
check('明日', parseDueHint('明日までにお願いします', today), '2026-09-25');
check('明後日', parseDueHint('明後日で', today), '2026-09-26');
check('金曜まで', parseDueHint('金曜まで', today), '2026-09-25');
check('同じ曜日は翌週', parseDueHint('木曜に', today), '2026-10-01');
check('来週月曜', parseDueHint('来週月曜', today), '2026-09-28');
check('来週水曜', parseDueHint('来週 水曜', today), '2026-09-30');
check('今週中は金曜', parseDueHint('今週中に', today), '2026-09-25');
check('無ければ null', parseDueHint('よろしくお願いします', today), null);

// メンションとタスク文言
check('メンションを拾う', mentionsIn('@田中さん @ｽｽﾞｷ 確認を'), ['田中', 'スズキ']);
check('先頭のメンションを外す', taskTextFrom('@田中さん 外構の見積を取り直す\n詳細は別途'), '外構の見積を取り直す');

// 議事録
const html = minutesHtml({
  room: 'A邸',
  nameOf: (u) => (u === 'a' ? '自分' : '田中'),
  decisions: new Set(['2']),
  lines: [
    { id: '2', senderId: 'b', content: '外壁はALC<37>で決定', createdAt: new Date(2026, 8, 24, 10, 5) },
    { id: '1', senderId: 'a', content: '外壁どうしますか', createdAt: new Date(2026, 8, 24, 9, 0) },
  ],
});
check('決定事項はチェック項目', html.includes('<div>☐ 外壁はALC&lt;37&gt;で決定（田中）</div>'), true);
check('時系列に並べ直す', html.indexOf('外壁どうしますか') < html.indexOf('で決定</p>'), true);
check('期間は1日なら1つ', html.includes('期間: 2026-09-24（'), true);

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
