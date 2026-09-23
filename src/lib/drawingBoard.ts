/**
 * OLMT 図面ボードの計算。画面と保存から切り離してある（scripts/test-drawing-board.ts）。
 *
 * 座標はページの幅・高さに対する 0〜1 の割合で持つ。参加者の画面の大きさが違っても、
 * 同じ赤入れが図面の同じ場所に載る。
 */

export type Pt = { x: number; y: number };

/**
 * 手書きの線を間引く（Ramer–Douglas–Peucker）。マウスの点をそのまま送ると
 * 1本で数百点になり、Firestore の書き込みも描き直しも重くなる。
 * tolerance はページ幅に対する割合（0.0015 ≒ A1 図面で 1mm 程度）。
 */
export function simplify(points: Pt[], tolerance = 0.0015): Pt[] {
  if (points.length <= 2) return points.slice();
  const sq = tolerance * tolerance;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = segDistSq(points[i], points[a], points[b]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx >= 0 && maxD > sq) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function segDistSq(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len)) : 0;
  const x = a.x + t * dx - p.x;
  const y = a.y + t * dy - p.y;
  return x * x + y * y;
}

/** 保存用に [x0,y0,x1,y1,…] の小数4桁へ（1万分の1 ≒ A1 で 0.08mm。十分細かい） */
export const encodePts = (pts: Pt[]) => pts.flatMap((p) => [round4(p.x), round4(p.y)]);
export const decodePts = (flat: number[]): Pt[] => {
  const out: Pt[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) out.push({ x: flat[i], y: flat[i + 1] });
  return out;
};
const round4 = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 10000) / 10000;

/** 点から折れ線までの距離（消しゴムで「どの線を指したか」を決める） */
export function distToStroke(p: Pt, pts: Pt[]): number {
  if (pts.length === 1) return Math.hypot(p.x - pts[0].x, p.y - pts[0].y);
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) best = Math.min(best, segDistSq(p, pts[i - 1], pts[i]));
  return Math.sqrt(best);
}

/** 推測されない部屋 ID（リンクを知っている人だけが入れる。会議 URL と同じ考え方） */
export function newRoomId(): string {
  // 24文字 × 5bit = 120bit。総当たりで当てられる長さではない
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
}

export type Decision = { text: string; kind: 'decision' | 'todo'; who?: string; due?: string; done: boolean };

/** 会議の終わりに作る議事録（メモに入れる HTML と、コピー用のテキスト） */
export function buildMinutes(opts: {
  title: string;
  date: string;
  participants: string[];
  decisions: Decision[];
  drawing?: string;
}): { text: string; html: string } {
  const decided = opts.decisions.filter((d) => d.kind === 'decision');
  const todos = opts.decisions.filter((d) => d.kind === 'todo');
  const lines = [
    `■ ${opts.title} 議事録`,
    `日時: ${opts.date}`,
    opts.participants.length ? `出席: ${opts.participants.join('、')}` : '',
    opts.drawing ? `図面: ${opts.drawing}` : '',
    '',
    '【決定事項】',
    ...(decided.length ? decided.map((d, i) => `${i + 1}. ${d.text}`) : ['（なし）']),
    '',
    '【宿題】',
    ...(todos.length
      ? todos.map((d, i) => `${i + 1}. ${d.text}${d.who ? `（担当: ${d.who}` : ''}${d.who && d.due ? ` / 期限: ${d.due}）` : d.who ? '）' : d.due ? `（期限: ${d.due}）` : ''}${d.done ? ' ✓' : ''}`)
      : ['（なし）']),
  ].filter((l, i, arr) => !(l === '' && arr[i - 1] === ''));
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = lines.map((l) => (l ? `<div>${esc(l)}</div>` : '<div><br></div>')).join('');
  return { text: lines.join('\n'), html };
}
