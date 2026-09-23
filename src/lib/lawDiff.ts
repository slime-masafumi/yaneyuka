/**
 * 条文の新旧比較と、ハイライトの引き継ぎ。
 *
 * 比較は**空白と改行を無視した文字単位**。貼り付けた条文と e-Gov では字詰めや
 * 全角スペースの入り方が違うので、空白まで比べると差分が空白だらけになる。
 *
 * 長い条文（第52条は約5000字）を素直に文字単位で比べると重いので、
 *   1. まず「。」で区切った文単位で比べ、
 *   2. 変わった文のかたまりの中だけを文字単位で比べる
 * という二段にしている。改正はふつう数文なので、2 はいつも小さい。
 */

// ---------------------------------------------------------------------------
// Myers の差分（O((N+M)D)）
// ---------------------------------------------------------------------------

type Op = 'eq' | 'del' | 'ins';

/**
 * a → b の編集列。D が maxD を超えたら null（呼び側で「全部入れ替え」扱いにする）。
 * trace には各段の V の必要な範囲だけを残す（全長を写すとメモリが D×(N+M) になる）。
 */
function myers<T>(a: T[], b: T[], maxD: number): Op[] | null {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const off = max + 1;
  const v = new Int32Array(2 * max + 3);
  const trace: Int32Array[] = [];

  for (let d = 0; d <= max; d++) {
    if (d > maxD) return null;
    // 次の段で読むのは k∈[-d-1, d+1]
    trace.push(v.slice(off - d - 1, off + d + 2));
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[off + k] = x;
      if (x >= n && y >= m) return backtrack(trace, n, m);
    }
  }
  return null;
}

function backtrack(trace: Int32Array[], n: number, m: number): Op[] {
  const ops: Op[] = [];
  let x = n;
  let y = m;
  for (let d = trace.length - 1; d >= 0; d--) {
    const t = trace[d];
    const at = (k: number) => t[k + d + 1];
    const k = x - y;
    const prevK = k === -d || (k !== d && at(k - 1) < at(k + 1)) ? k + 1 : k - 1;
    const prevX = at(prevK);
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      ops.push('eq');
      x--;
      y--;
    }
    if (d > 0) ops.push(x === prevX ? 'ins' : 'del');
    x = prevX;
    y = prevY;
  }
  return ops.reverse();
}

/**
 * 大きな書き換えの中に1〜2字だけ偶然一致した字が残ると、差分が細切れになり、
 * ハイライトも「から」の「ら」だけに付くような飛び地ができる。
 * 前後を3字以上の変更に挟まれた2字以下の一致は、変更として扱い直す。
 */
function cleanupOps(ops: Op[]): Op[] {
  type Run = { op: Op; n: number };
  const runs: Run[] = [];
  for (const op of ops) {
    const last = runs[runs.length - 1];
    if (last && last.op === op) last.n++;
    else runs.push({ op, n: 1 });
  }
  const editsAround = (from: number, step: 1 | -1) => {
    let n = 0;
    for (let k = from; k >= 0 && k < runs.length && runs[k].op !== 'eq'; k += step) n += runs[k].n;
    return n;
  };
  const out: Op[] = [];
  runs.forEach((r, idx) => {
    if (r.op === 'eq' && r.n <= 2 && editsAround(idx - 1, -1) >= 3 && editsAround(idx + 1, 1) >= 3) {
      for (let t = 0; t < r.n; t++) out.push('del');
      for (let t = 0; t < r.n; t++) out.push('ins');
      return;
    }
    for (let t = 0; t < r.n; t++) out.push(r.op);
  });
  return out;
}

// ---------------------------------------------------------------------------
// 文字単位の対応づけ
// ---------------------------------------------------------------------------

export type CharDiff = {
  /** a の各文字: 0=そのまま / 1=削られた / 2=空白（比較対象外） */
  aMark: Uint8Array;
  /** b の各文字: 0=そのまま / 1=加わった / 2=空白（比較対象外） */
  bMark: Uint8Array;
  /** a の i 文字目が b の何文字目と同じか（対応しなければ -1） */
  aToB: Int32Array;
  /** 変わった箇所があるか（空白の違いは数えない） */
  changed: boolean;
};

const isSpace = (c: string) => /[\s　]/.test(c);

function sentences(chars: string[]): string[][] {
  const out: string[][] = [];
  let cur: string[] = [];
  for (const c of chars) {
    cur.push(c);
    if (c === '。' || cur.length >= 400) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
}

export function diffChars(a: string, b: string): CharDiff {
  const aChars = Array.from(a);
  const bChars = Array.from(b);
  const aMark = new Uint8Array(aChars.length);
  const bMark = new Uint8Array(bChars.length);
  const aToB = new Int32Array(aChars.length).fill(-1);

  // 空白を除いた列と、元の位置への対応
  const aPos: number[] = [];
  const bPos: number[] = [];
  aChars.forEach((c, i) => (isSpace(c) ? (aMark[i] = 2) : aPos.push(i)));
  bChars.forEach((c, i) => (isSpace(c) ? (bMark[i] = 2) : bPos.push(i)));
  const aSeq = aPos.map((i) => aChars[i]);
  const bSeq = bPos.map((i) => bChars[i]);

  let changed = false;
  const pair = (ai: number, bi: number) => {
    aToB[aPos[ai]] = bPos[bi];
  };
  const dropA = (ai: number) => {
    aMark[aPos[ai]] = 1;
    changed = true;
  };
  const addB = (bi: number) => {
    bMark[bPos[bi]] = 1;
    changed = true;
  };

  /** かたまり（a[as,ae) と b[bs,be)）の中を文字単位で対応づける */
  const charLevel = (as: number, ae: number, bs: number, be: number) => {
    // 前後の一致は Myers に渡す前に落とす（改正は「一部だけ変わる」がほとんど）
    while (as < ae && bs < be && aSeq[as] === bSeq[bs]) pair(as++, bs++);
    while (as < ae && bs < be && aSeq[ae - 1] === bSeq[be - 1]) pair(--ae, --be);
    const raw = ae - as > 0 && be - bs > 0 ? myers(aSeq.slice(as, ae), bSeq.slice(bs, be), 1500) : null;
    const ops = raw && cleanupOps(raw);
    if (!ops) {
      for (let i = as; i < ae; i++) dropA(i);
      for (let j = bs; j < be; j++) addB(j);
      return;
    }
    let i = as;
    let j = bs;
    for (const op of ops) {
      if (op === 'eq') pair(i++, j++);
      else if (op === 'del') dropA(i++);
      else addB(j++);
    }
  };

  // 1. 文単位
  const aSent = sentences(aSeq);
  const bSent = sentences(bSeq);
  const sentOps = myers(aSent.map((s) => s.join('')), bSent.map((s) => s.join('')), 2000);
  if (!sentOps) {
    charLevel(0, aSeq.length, 0, bSeq.length);
    return { aMark, bMark, aToB, changed };
  }

  // 2. 変わった文のかたまりだけ文字単位
  let ai = 0; // 文の番号
  let bi = 0;
  let ac = 0; // 文字の位置
  let bc = 0;
  let k = 0;
  while (k < sentOps.length) {
    if (sentOps[k] === 'eq') {
      const len = aSent[ai].length;
      for (let t = 0; t < len; t++) pair(ac + t, bc + t);
      ac += len;
      bc += bSent[bi].length;
      ai++;
      bi++;
      k++;
      continue;
    }
    const as = ac;
    const bs = bc;
    while (k < sentOps.length && sentOps[k] !== 'eq') {
      if (sentOps[k] === 'del') ac += aSent[ai++].length;
      else bc += bSent[bi++].length;
      k++;
    }
    charLevel(as, ac, bs, bc);
  }
  return { aMark, bMark, aToB, changed };
}

// ---------------------------------------------------------------------------
// 書式の引き継ぎ
// ---------------------------------------------------------------------------

/**
 * 1文字ごとの書式を CSS 文字列で持つ（'' = 書式なし）。
 * 例: 'background-color:#fef9c3' / 'font-weight:bold;color:#EF4444'
 */
export type StyledText = { text: string; styles: string[] };

/**
 * 旧条文の書式を新条文へ移す。
 *   - そのまま残った文字 … 旧の書式を引き継ぐ
 *   - 空白             … 前後の文字が同じ書式ならそれに揃える（ハイライトが空白で途切れないように）
 *   - 新しく入った文字 … 書式なし。自分で引いた線の中に「引いていない新しい文字」が見えるのは、
 *                        むしろ改正箇所の目印になる
 */
export function carryStyles(old: StyledText, newText: string): string[] {
  const diff = diffChars(old.text, newText);
  const newChars = Array.from(newText);
  const styles: string[] = new Array(newChars.length).fill('');
  const oldChars = Array.from(old.text);
  for (let i = 0; i < oldChars.length; i++) {
    const j = diff.aToB[i];
    if (j >= 0) styles[j] = old.styles[i] ?? '';
  }
  for (let j = 0; j < newChars.length; j++) {
    if (diff.bMark[j] !== 2) continue;
    let p = j - 1;
    while (p >= 0 && diff.bMark[p] === 2) p--;
    let q = j + 1;
    while (q < newChars.length && diff.bMark[q] === 2) q++;
    if (p >= 0 && q < newChars.length && diff.bMark[p] === 0 && diff.bMark[q] === 0 && styles[p] === styles[q]) {
      styles[j] = styles[p];
    }
  }
  // 改行には書式を付けない（span の中で改行させない）
  newChars.forEach((c, j) => {
    if (c === '\n') styles[j] = '';
  });
  return styles;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 文字と書式の列を HTML に。同じ書式が続く所は1つの span にまとめる。 */
export function styledToHtml(text: string, styles: string[]): string {
  const chars = Array.from(text);
  let html = '';
  let i = 0;
  while (i < chars.length) {
    if (chars[i] === '\n') {
      html += '<br>';
      i++;
      continue;
    }
    const st = styles[i] ?? '';
    let j = i;
    let run = '';
    while (j < chars.length && chars[j] !== '\n' && (styles[j] ?? '') === st) run += chars[j++];
    html += st ? `<span style="${escapeHtml(st)}">${escapeHtml(run)}</span>` : escapeHtml(run);
    i = j;
  }
  return html;
}

/** プレーンテキストを My法規の本文（HTML）に。 */
export const plainToHtml = (text: string) => styledToHtml(text, []);
