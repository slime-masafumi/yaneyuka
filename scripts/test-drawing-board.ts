// OLMT 図面ボードの計算（src/lib/drawingBoard.ts）のテスト。  node scripts/test-drawing-board.ts
import { simplify, encodePts, decodePts, distToStroke, newRoomId, buildMinutes } from '../src/lib/drawingBoard.ts';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};

// 直線上の100点は両端の2点になる
const line = Array.from({ length: 100 }, (_, i) => ({ x: i / 99, y: 0.5 }));
check('直線は2点に', simplify(line).length, 2);
// 角は残る
const corner = [...Array.from({ length: 50 }, (_, i) => ({ x: i / 49 * 0.5, y: 0.2 })), ...Array.from({ length: 50 }, (_, i) => ({ x: 0.5, y: 0.2 + i / 49 * 0.5 }))];
const s = simplify(corner);
check('L字は角が残る', s.some((p) => Math.abs(p.x - 0.5) < 1e-9 && Math.abs(p.y - 0.2) < 0.02), true);
check('L字は数点', s.length <= 4, true);

check('往復', decodePts(encodePts([{ x: 0.123456, y: 1.2 }, { x: -1, y: 0.5 }])), [{ x: 0.1235, y: 1 }, { x: 0, y: 0.5 }]);
check('線までの距離', Math.round(distToStroke({ x: 0.5, y: 0.6 }, [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }]) * 1000) / 1000, 0.1);

const ids = new Set(Array.from({ length: 1000 }, newRoomId));
check('ID は重ならない', ids.size, 1000);
check('ID は24文字', newRoomId().length, 24);

const m = buildMinutes({
  title: '第3回 定例',
  date: '2026-04-15 10:00',
  participants: ['田中', '佐藤'],
  drawing: 'A-101 平面図',
  decisions: [
    { text: '外壁はサイディング B 案', kind: 'decision', done: false },
    { text: '階段詳細を修正', kind: 'todo', who: '設計', due: '4/20', done: false },
    { text: '見積を再提出', kind: 'todo', done: true },
  ],
});
check('議事録', m.text.split('\n'), [
  '■ 第3回 定例 議事録',
  '日時: 2026-04-15 10:00',
  '出席: 田中、佐藤',
  '図面: A-101 平面図',
  '',
  '【決定事項】',
  '1. 外壁はサイディング B 案',
  '',
  '【宿題】',
  '1. 階段詳細を修正（担当: 設計 / 期限: 4/20）',
  '2. 見積を再提出 ✓',
]);
check('HTML はエスケープ', buildMinutes({ title: '<b>', date: '', participants: [], decisions: [] }).html.includes('&lt;b&gt;'), true);

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
