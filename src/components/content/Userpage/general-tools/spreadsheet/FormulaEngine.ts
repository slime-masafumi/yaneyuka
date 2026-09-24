/**
 * スプレッドシートの数式処理エンジン
 *
 * 字句解析 → 再帰下降パース → 評価 の3段構成。
 * 以前は正規表現で「関数名(引数)」を丸ごとマッチする方式だったため、
 *   - =SUM(A1:A3)*2 のような複合式
 *   - =SUM(A1,MAX(B1:B3)) のような入れ子
 *   - $A$1 の絶対参照
 *   - "文字列" リテラル
 * がいずれも解釈できず、しかも失敗を 0 として返していた。
 * ここでは構文木を組んでから評価し、解釈できないものは #ERROR 系の値を返す。
 */

import * as K from './kenchikuFormulas';

export type CellId = { row: number; col: number };

export class CellError {
  constructor(public code: string) {}
  toString() {
    return this.code;
  }
}

export const ERR = {
  VALUE: '#VALUE!',
  NAME: '#NAME?',
  DIV0: '#DIV/0!',
  REF: '#REF!',
  NUM: '#NUM!',
  SYNTAX: '#SYNTAX!',
} as const;

/** 空セルを表す番兵。0 と区別しないと AVERAGE / COUNT / MIN が狂う。 */
class EmptyValue {
  readonly isEmpty = true;
}
const EMPTY = new EmptyValue();
type Empty = EmptyValue;

type Scalar = number | string | CellError | Empty;

/**
 * 範囲参照（A1:B5）の展開結果。
 *
 * 単なる配列ではなく行数・列数を持たせている。VLOOKUP / INDEX / MATCH は
 * 「範囲の何列目」を数えるため、平らな配列では実装できない。
 * values は行優先（row-major）で並べる。
 */
export class RangeValue {
  constructor(
    readonly rows: number,
    readonly cols: number,
    readonly values: Scalar[],
  ) {}
  at(r: number, c: number): Scalar {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return new CellError(ERR.REF);
    return this.values[r * this.cols + c];
  }
  /** 1列ぶんを取り出す */
  column(c: number): Scalar[] {
    const out: Scalar[] = [];
    for (let r = 0; r < this.rows; r++) out.push(this.at(r, c));
    return out;
  }
  /** 1行ぶんを取り出す */
  row(r: number): Scalar[] {
    const out: Scalar[] = [];
    for (let c = 0; c < this.cols; c++) out.push(this.at(r, c));
    return out;
  }
}

type Value = Scalar | RangeValue;

type GetCellValueFn = (cell: CellId) => { value: string; formula: string };
type EvaluateCellFn = (cell: CellId, sheetName?: string) => number | string;

// 範囲参照の展開上限。誤って A1:ZZ99999 と書かれてもフリーズさせない。
const MAX_RANGE_CELLS = 50000;

// ---------------------------------------------------------------- 字句解析

type Token =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'ref'; v: string; sheet?: string }
  | { t: 'ident'; v: string }
  | { t: 'op'; v: string }
  | { t: 'lparen' }
  | { t: 'rparen' }
  | { t: 'comma' }
  | { t: 'colon' };

const REF_RE = /^\$?[A-Za-z]{1,3}\$?\d{1,7}$/;

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < src.length) {
    const ch = src[i];

    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }

    // 文字列リテラル。Excel と同じく "" でエスケープする
    if (ch === '"') {
      i++;
      let buf = '';
      // ★閉じ引用符を見つけたかを明示的に持つ。
      //   以前は `i > src.length` で未終端を検出しようとしていたが、
      //   ループは i === src.length で抜けるためこの条件は決して成立せず、
      //   `="OK` のような未終端リテラルが黙って捨てられていた。
      let closed = false;
      while (i < src.length) {
        if (src[i] === '"') {
          if (src[i + 1] === '"') {
            buf += '"';
            i += 2;
            continue;
          }
          i++;
          tokens.push({ t: 'str', v: buf });
          closed = true;
          break;
        }
        buf += src[i++];
      }
      if (!closed) throw new CellError(ERR.SYNTAX);
      continue;
    }

    if (ch >= '0' && ch <= '9') {
      let buf = '';
      while (i < src.length && /[0-9.]/.test(src[i])) buf += src[i++];
      // 指数表記 (1.5E+3)
      if (src[i] === 'e' || src[i] === 'E') {
        const save = i;
        let exp = src[i++];
        if (src[i] === '+' || src[i] === '-') exp += src[i++];
        if (src[i] >= '0' && src[i] <= '9') {
          while (i < src.length && src[i] >= '0' && src[i] <= '9') exp += src[i++];
          buf += exp;
        } else {
          i = save;
        }
      }
      const n = Number(buf);
      if (Number.isNaN(n)) throw new CellError(ERR.SYNTAX);
      tokens.push({ t: 'num', v: n });
      continue;
    }

    // 引用符付きのシート名。空白や記号を含む名前は 'シート 1'!A1 と書く。
    // Excel と同じく、名前の中の ' は '' でエスケープする。
    if (ch === "'") {
      i++;
      let name = '';
      let closed = false;
      while (i < src.length) {
        if (src[i] === "'") {
          if (src[i + 1] === "'") { name += "'"; i += 2; continue; }
          i++; closed = true; break;
        }
        name += src[i++];
      }
      if (!closed || src[i] !== '!') throw new CellError(ERR.SYNTAX);
      i++; // '!' を読み飛ばす
      let buf = '';
      while (i < src.length && /[A-Za-z0-9_$]/.test(src[i])) buf += src[i++];
      if (!REF_RE.test(buf)) throw new CellError(ERR.REF);
      tokens.push({ t: 'ref', v: buf, sheet: name });
      continue;
    }

    // セル参照 / 関数名 / シート名。$ から始まるのは参照のみ。
    // シート名には日本語も使えるので、ASCII 英字以外も語の一部として受ける。
    if (ch === '$' || /[A-Za-z_]/.test(ch) || /[^\x00-\x7F]/.test(ch)) {
      let buf = '';
      while (i < src.length && (/[A-Za-z0-9_$.]/.test(src[i]) || /[^\x00-\x7F]/.test(src[i]))) buf += src[i++];

      // 直後が '!' なら、いま読んだのはシート名
      if (src[i] === '!') {
        i++;
        let ref = '';
        while (i < src.length && /[A-Za-z0-9_$]/.test(src[i])) ref += src[i++];
        if (!REF_RE.test(ref)) throw new CellError(ERR.REF);
        tokens.push({ t: 'ref', v: ref, sheet: buf });
        continue;
      }

      if (REF_RE.test(buf)) tokens.push({ t: 'ref', v: buf });
      else tokens.push({ t: 'ident', v: buf.toUpperCase() });
      continue;
    }

    if (ch === '(') { tokens.push({ t: 'lparen' }); i++; continue; }
    if (ch === ')') { tokens.push({ t: 'rparen' }); i++; continue; }
    if (ch === ',') { tokens.push({ t: 'comma' }); i++; continue; }
    if (ch === ':') { tokens.push({ t: 'colon' }); i++; continue; }

    // 2文字演算子を先に見る
    const two = src.substr(i, 2);
    if (two === '>=' || two === '<=' || two === '<>') {
      tokens.push({ t: 'op', v: two });
      i += 2;
      continue;
    }
    if ('+-*/^%&=><'.includes(ch)) {
      tokens.push({ t: 'op', v: ch });
      i++;
      continue;
    }

    throw new CellError(ERR.SYNTAX);
  }

  return tokens;
}

// ------------------------------------------------------------------ 構文木

type Node =
  | { k: 'num'; v: number }
  | { k: 'str'; v: string }
  | { k: 'ref'; v: string; sheet?: string }
  | { k: 'range'; from: string; to: string; sheet?: string }
  | { k: 'call'; name: string; args: Node[] }
  | { k: 'unary'; op: string; arg: Node }
  | { k: 'binary'; op: string; left: Node; right: Node }
  | { k: 'percent'; arg: Node };

/**
 * 演算子の優先順位（低い順）:
 *   比較 (= <> >= <= > <)
 *   連結 (&)
 *   加減 (+ -)
 *   乗除 (* /)
 *   べき乗 (^, 右結合)
 *   単項 (- +)   ← Excel と同じく ^ より強い。-2^2 は (-2)^2 = 4
 *   後置 (%)
 */
class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  parse(): Node {
    const node = this.parseComparison();
    if (this.pos < this.tokens.length) throw new CellError(ERR.SYNTAX);
    return node;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private eatOp(...ops: string[]): string | null {
    const tk = this.peek();
    if (tk && tk.t === 'op' && ops.includes(tk.v)) {
      this.pos++;
      return tk.v;
    }
    return null;
  }

  private parseComparison(): Node {
    let left = this.parseConcat();
    const op = this.eatOp('=', '<>', '>=', '<=', '>', '<');
    if (op) left = { k: 'binary', op, left, right: this.parseConcat() };
    return left;
  }

  private parseConcat(): Node {
    let left = this.parseAdditive();
    let op: string | null;
    while ((op = this.eatOp('&'))) {
      left = { k: 'binary', op, left, right: this.parseAdditive() };
    }
    return left;
  }

  private parseAdditive(): Node {
    let left = this.parseMultiplicative();
    let op: string | null;
    while ((op = this.eatOp('+', '-'))) {
      left = { k: 'binary', op, left, right: this.parseMultiplicative() };
    }
    return left;
  }

  private parseMultiplicative(): Node {
    let left = this.parsePower();
    let op: string | null;
    while ((op = this.eatOp('*', '/'))) {
      left = { k: 'binary', op, left, right: this.parsePower() };
    }
    return left;
  }

  private parsePower(): Node {
    // ★Excel の ^ は左結合。2^3^2 は (2^3)^2 = 64 になる。
    //   右結合（2^(3^2) = 512）で実装すると、エラーも出さずに違う答えを返す。
    let left = this.parseUnary();
    while (this.eatOp('^')) {
      left = { k: 'binary', op: '^', left, right: this.parseUnary() };
    }
    return left;
  }

  private parseUnary(): Node {
    const op = this.eatOp('-', '+');
    if (op) return { k: 'unary', op, arg: this.parseUnary() };
    return this.parsePostfix();
  }

  private parsePostfix(): Node {
    let node = this.parsePrimary();
    while (this.eatOp('%')) node = { k: 'percent', arg: node };
    return node;
  }

  private parsePrimary(): Node {
    const tk = this.peek();
    if (!tk) throw new CellError(ERR.SYNTAX);

    if (tk.t === 'num') { this.pos++; return { k: 'num', v: tk.v }; }
    if (tk.t === 'str') { this.pos++; return { k: 'str', v: tk.v }; }

    if (tk.t === 'ref') {
      this.pos++;
      const next = this.peek();
      if (next && next.t === 'colon') {
        this.pos++;
        const end = this.peek();
        if (!end || end.t !== 'ref') throw new CellError(ERR.REF);
        this.pos++;
        // Sheet1!A1:B5 のように、シート名は範囲の先頭にだけ付く
        return { k: 'range', from: tk.v, to: end.v, sheet: tk.sheet ?? end.sheet };
      }
      return { k: 'ref', v: tk.v, sheet: tk.sheet };
    }

    if (tk.t === 'ident') {
      this.pos++;
      const next = this.peek();
      // TRUE / FALSE は括弧なしでも書ける（Excel と同じ論理定数）
      if ((!next || next.t !== 'lparen') && (tk.v === 'TRUE' || tk.v === 'FALSE')) {
        return { k: 'str', v: tk.v };
      }
      if (!next || next.t !== 'lparen') throw new CellError(ERR.NAME);
      this.pos++;
      const args: Node[] = [];
      if (this.peek()?.t !== 'rparen') {
        args.push(this.parseComparison());
        while (this.peek()?.t === 'comma') {
          this.pos++;
          args.push(this.parseComparison());
        }
      }
      if (this.peek()?.t !== 'rparen') throw new CellError(ERR.SYNTAX);
      this.pos++;
      return { k: 'call', name: tk.v, args };
    }

    if (tk.t === 'lparen') {
      this.pos++;
      const inner = this.parseComparison();
      if (this.peek()?.t !== 'rparen') throw new CellError(ERR.SYNTAX);
      this.pos++;
      return inner;
    }

    throw new CellError(ERR.SYNTAX);
  }
}

// -------------------------------------------------------------- 値の取り扱い

const isEmpty = (v: Scalar): v is Empty => v instanceof EmptyValue;
// flattenNumbers など number[] を返すヘルパーの戻り値も判定するので unknown で受ける
const isErr = (v: unknown): v is CellError => v instanceof CellError;

/**
 * 参照先が「エラー値」かどうか。
 * ★「# で始まる文字列」で判定してはいけない。「#3 増築工事」「#101号室」のような
 *   ごく普通のテキストがエラー扱いになり、それを参照した数式すべてが壊れる。
 *   エンジンが実際に出しうるコードとの完全一致だけをエラーとして扱う。
 */
const ERROR_CODES: ReadonlySet<string> = new Set([
  ...Object.values(ERR),
  '#N/A',       // VLOOKUP / MATCH が見つからなかったとき
  '#CIRCULAR!', // Spreadsheet.tsx の循環参照検出が返す値
]);

/** セルの生値を、数値・文字列・空 のいずれかに寄せる */
function coerceCell(raw: number | string): Scalar {
  if (typeof raw === 'number') return raw;
  const s = String(raw);
  if (s === '') return EMPTY;
  if (ERROR_CODES.has(s)) return new CellError(s); // 参照先が既にエラー
  const n = Number(s);
  if (s.trim() !== '' && !Number.isNaN(n) && Number.isFinite(n)) return n;
  return s;
}

/** 算術用の数値化。空セルは 0、数字でない文字列は #VALUE! */
function toNumber(v: Scalar): number | CellError {
  if (isErr(v)) return v;
  if (isEmpty(v)) return 0;
  if (typeof v === 'number') return v;
  if (v.trim() === '') return 0;
  // 論理値は Excel と同じく TRUE=1 / FALSE=0 として計算に使える（=TRUE+1 は 2）
  const upper = v.trim().toUpperCase();
  if (upper === 'TRUE') return 1;
  if (upper === 'FALSE') return 0;
  const n = Number(v);
  return Number.isNaN(n) ? new CellError(ERR.VALUE) : n;
}

/**
 * Excel の四捨五入は「0 から遠い側」へ丸める。
 * JS の Math.round は常に上（+∞方向）なので、負の数で 1 ずれる。
 *   Math.round(-2.5) === -2   /   Excel の ROUND(-2.5,0) === -3
 */
function roundHalfAwayFromZero(v: number, digits: number): number {
  const m = Math.pow(10, digits);
  const x = v * m;
  const r = x < 0 ? -Math.round(-x) : Math.round(x);
  return r / m;
}

function toDisplay(v: Scalar): number | string {
  if (isErr(v)) return v.code;
  if (isEmpty(v)) return '';
  return v;
}

const isRange = (v: Value): v is RangeValue => v instanceof RangeValue;

/**
 * 集計関数用。範囲・引数をならして「数値だけ」を取り出す。
 *
 * Excel の SUM は、範囲の中の文字列・論理値は無視するが、
 * 引数に直接書いた論理値（=SUM(TRUE,1)）は数値として数える。
 * その違いを出すため、範囲由来かどうかで扱いを分ける。
 */
function flattenNumbers(args: Value[]): number[] | CellError {
  const out: number[] = [];
  for (const a of args) {
    if (isRange(a)) {
      for (const item of a.values) {
        if (isErr(item)) return item;
        if (typeof item === 'number') out.push(item);
        // 範囲の中の文字列・論理値・空セルは無視する
      }
      continue;
    }
    if (isErr(a)) return a;
    if (isEmpty(a)) continue;
    if (typeof a === 'number') { out.push(a); continue; }
    const upper = a.trim().toUpperCase();
    if (upper === 'TRUE') out.push(1);
    else if (upper === 'FALSE') out.push(0);
    // 直接書いた文字列は Excel と同じく無視（=SUM("1",2) は 2）
  }
  return out;
}

function flattenAll(args: Value[]): Scalar[] {
  const out: Scalar[] = [];
  for (const a of args) {
    if (isRange(a)) out.push(...a.values);
    else out.push(a);
  }
  return out;
}

function truthy(v: Scalar): boolean {
  if (isErr(v) || isEmpty(v)) return false;
  if (typeof v === 'number') return v !== 0;
  const s = v.trim().toUpperCase();
  if (s === 'TRUE') return true;
  if (s === 'FALSE' || s === '') return false;
  const n = Number(s);
  return Number.isNaN(n) ? true : n !== 0;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

// ------------------------------------------------ 追加関数むけのヘルパー

/** 表示用の素の文字列。エラーはコード、空セルは空文字。 */
function toText(v: Scalar): string {
  if (isErr(v)) return v.code;
  if (isEmpty(v)) return '';
  return String(v);
}

/**
 * SUMIF / COUNTIF の「条件」。
 * 数値・文字列そのもの、">=10" のような比較、"*営業*" のワイルドカードに対応する。
 */
function makeCriteria(raw: Scalar): (v: Scalar) => boolean {
  if (isErr(raw)) return () => false;
  const text = toText(raw).trim();
  const m = text.match(/^(>=|<=|<>|>|<|=)(.*)$/);
  const op = m ? m[1] : '=';
  const rhsText = (m ? m[2] : text).trim();
  const rhsNum = rhsText === '' ? NaN : Number(rhsText);
  const rhsIsNum = rhsText !== '' && !Number.isNaN(rhsNum);

  // ワイルドカード（= と <> のときだけ、Excel と同じ扱い）
  const hasWildcard = /[*?]/.test(rhsText);
  const wildcard = hasWildcard
    ? new RegExp(
        '^' + rhsText.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
        'i',
      )
    : null;

  return (v: Scalar) => {
    if (isErr(v)) return false;
    if (wildcard && (op === '=' || op === '<>')) {
      const hit = wildcard.test(toText(v));
      return op === '=' ? hit : !hit;
    }
    if (rhsIsNum) {
      const n = typeof v === 'number' ? v : Number(toText(v));
      if (Number.isNaN(n)) return op === '<>';
      switch (op) {
        case '=': return n === rhsNum;
        case '<>': return n !== rhsNum;
        case '>': return n > rhsNum;
        case '<': return n < rhsNum;
        case '>=': return n >= rhsNum;
        case '<=': return n <= rhsNum;
      }
    }
    const a = toText(v).toUpperCase();
    const b = rhsText.toUpperCase();
    switch (op) {
      case '=': return a === b;
      case '<>': return a !== b;
      case '>': return a > b;
      case '<': return a < b;
      case '>=': return a >= b;
      case '<=': return a <= b;
    }
    return false;
  };
}

/**
 * 日付。このエンジンは日付型を持たず "YYYY-MM-DD" の文字列で扱う。
 * 表計算として日付の引き算ができないと困るので、文字列⇔日数の変換だけ用意する。
 */
const DATE_RE = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/;
function parseDate(v: Scalar): Date | null {
  if (typeof v === 'number') return null;
  const m = DATE_RE.exec(toText(v).trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}
const formatDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * SUMIFS / COUNTIFS 用。(条件範囲, 条件) の並びをすべて満たすかを位置ごとに判定する。
 * 条件範囲の要素数が食い違っていたら #VALUE!（Excel も同じ形を要求する）。
 */
function matchAllCriteria(pairs: Value[], length: number): boolean[] | CellError {
  const hit = new Array<boolean>(length).fill(true);
  for (let i = 0; i + 1 < pairs.length; i += 2) {
    const range = pairs[i];
    if (!isRange(range) || range.values.length !== length) return new CellError(ERR.VALUE);
    const crit = pairs[i + 1];
    const match = makeCriteria(isRange(crit) ? crit.values[0] : crit);
    for (let j = 0; j < length; j++) {
      if (hit[j] && !match(range.values[j])) hit[j] = false;
    }
  }
  return hit;
}

/** 引数を1つのスカラーとして受け取る（範囲なら先頭要素ではなくエラーにする） */
function arg1(args: Value[], i: number): Scalar {
  const a = args[i];
  if (a === undefined) return EMPTY;
  if (isRange(a)) return a.values.length === 1 ? a.values[0] : new CellError(ERR.VALUE);
  return a;
}
function argNum(args: Value[], i: number, fallback?: number): number | CellError {
  const a = args[i];
  if (a === undefined) return fallback ?? 0;
  return toNumber(arg1(args, i));
}
function argText(args: Value[], i: number): string {
  return toText(arg1(args, i));
}

// -------------------------------------------------------------------- 本体

class FormulaEngine {
  /** 組み込み関数。registerFunction で差し替え・追加できる */
  private functions: Record<string, (args: Value[]) => Value> = {
    SUM: (args) => {
      const nums = flattenNumbers(args);
      return isErr(nums) ? nums : nums.reduce((a, b) => a + b, 0);
    },
    AVERAGE: (args) => {
      const nums = flattenNumbers(args);
      if (isErr(nums)) return nums;
      // 空セルを母数に含めない（従来は 0 として数えていたため平均が狂っていた）
      if (nums.length === 0) return new CellError(ERR.DIV0);
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    },
    MIN: (args) => {
      const nums = flattenNumbers(args);
      if (isErr(nums)) return nums;
      return nums.length ? Math.min(...nums) : 0;
    },
    MAX: (args) => {
      const nums = flattenNumbers(args);
      if (isErr(nums)) return nums;
      return nums.length ? Math.max(...nums) : 0;
    },
    // Excel の COUNT は「数値が入ったセル」だけを数える
    COUNT: (args) => {
      const nums = flattenNumbers(args);
      return isErr(nums) ? nums : nums.length;
    },
    // 空でないセルの個数
    COUNTA: (args) => flattenAll(args).filter((v) => !isEmpty(v)).length,
    ABS: (args) => {
      const n = toNumber(flattenAll(args)[0] ?? EMPTY);
      return isErr(n) ? n : Math.abs(n);
    },
    ROUND: (args) => {
      const flat = flattenAll(args);
      const v = toNumber(flat[0] ?? EMPTY);
      if (isErr(v)) return v;
      const d = flat.length > 1 ? toNumber(flat[1]) : 0;
      if (isErr(d)) return d;
      return roundHalfAwayFromZero(v, d);
    },
    TODAY: () => {
      const d = new Date();
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    },
    NOW: () => {
      const d = new Date();
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    },

    // ---------------------------------------------- 数値
    PRODUCT: (args) => {
      const nums = flattenNumbers(args);
      return isErr(nums) ? nums : nums.reduce((a, b) => a * b, 1);
    },
    ROUNDUP: (args) => {
      const v = argNum(args, 0); if (isErr(v)) return v;
      const d = argNum(args, 1, 0); if (isErr(d)) return d;
      const m = Math.pow(10, d);
      return (v < 0 ? -Math.ceil(-v * m) : Math.ceil(v * m)) / m;
    },
    ROUNDDOWN: (args) => {
      const v = argNum(args, 0); if (isErr(v)) return v;
      const d = argNum(args, 1, 0); if (isErr(d)) return d;
      const m = Math.pow(10, d);
      return (v < 0 ? -Math.floor(-v * m) : Math.floor(v * m)) / m;
    },
    INT: (args) => { const v = argNum(args, 0); return isErr(v) ? v : Math.floor(v); },
    MOD: (args) => {
      const a = argNum(args, 0); if (isErr(a)) return a;
      const b = argNum(args, 1); if (isErr(b)) return b;
      if (b === 0) return new CellError(ERR.DIV0);
      return a - b * Math.floor(a / b); // Excel と同じく除数の符号に従う
    },
    POWER: (args) => {
      const a = argNum(args, 0); if (isErr(a)) return a;
      const b = argNum(args, 1); if (isErr(b)) return b;
      const p = Math.pow(a, b);
      return Number.isFinite(p) ? p : new CellError(ERR.NUM);
    },
    SQRT: (args) => {
      const v = argNum(args, 0); if (isErr(v)) return v;
      return v < 0 ? new CellError(ERR.NUM) : Math.sqrt(v);
    },
    CEILING: (args) => {
      const v = argNum(args, 0); if (isErr(v)) return v;
      const step = argNum(args, 1, 1); if (isErr(step)) return step;
      if (step === 0) return 0;
      return Math.ceil(v / step) * step;
    },
    FLOOR: (args) => {
      const v = argNum(args, 0); if (isErr(v)) return v;
      const step = argNum(args, 1, 1); if (isErr(step)) return step;
      if (step === 0) return new CellError(ERR.DIV0);
      return Math.floor(v / step) * step;
    },
    SIGN: (args) => { const v = argNum(args, 0); return isErr(v) ? v : Math.sign(v); },
    MEDIAN: (args) => {
      const nums = flattenNumbers(args);
      if (isErr(nums)) return nums;
      if (!nums.length) return new CellError(ERR.NUM);
      const s = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    },
    COUNTBLANK: (args) => flattenAll(args).filter((v) => isEmpty(v)).length,
    LARGE: (args) => {
      const nums = flattenNumbers([args[0]]); if (isErr(nums)) return nums;
      const k = argNum(args, 1, 1); if (isErr(k)) return k;
      const s = [...nums].sort((a, b) => b - a);
      return k >= 1 && k <= s.length ? s[k - 1] : new CellError(ERR.NUM);
    },
    SMALL: (args) => {
      const nums = flattenNumbers([args[0]]); if (isErr(nums)) return nums;
      const k = argNum(args, 1, 1); if (isErr(k)) return k;
      const s = [...nums].sort((a, b) => a - b);
      return k >= 1 && k <= s.length ? s[k - 1] : new CellError(ERR.NUM);
    },

    // ---------------------------------------------- 条件付き集計
    // SUMIF(範囲, 条件, [合計範囲])
    SUMIF: (args) => {
      const range = args[0];
      if (!isRange(range)) return new CellError(ERR.VALUE);
      const match = makeCriteria(arg1(args, 1));
      const sumRange = isRange(args[2]) ? (args[2] as RangeValue) : range;
      let total = 0;
      range.values.forEach((v, i) => {
        if (!match(v)) return;
        const target = sumRange.values[i];
        if (typeof target === 'number') total += target;
      });
      return total;
    },
    COUNTIF: (args) => {
      const range = args[0];
      if (!isRange(range)) return new CellError(ERR.VALUE);
      const match = makeCriteria(arg1(args, 1));
      return range.values.filter(match).length;
    },
    AVERAGEIF: (args) => {
      const range = args[0];
      if (!isRange(range)) return new CellError(ERR.VALUE);
      const match = makeCriteria(arg1(args, 1));
      const avgRange = isRange(args[2]) ? (args[2] as RangeValue) : range;
      const picked: number[] = [];
      range.values.forEach((v, i) => {
        if (!match(v)) return;
        const target = avgRange.values[i];
        if (typeof target === 'number') picked.push(target);
      });
      if (!picked.length) return new CellError(ERR.DIV0);
      return picked.reduce((a, b) => a + b, 0) / picked.length;
    },

    // 複数条件版。SUMIFS(合計範囲, 条件範囲1, 条件1, 条件範囲2, 条件2, ...)
    // ※Excel と同じく合計範囲が先頭（SUMIF とは引数の順番が違う）
    SUMIFS: (args) => {
      const sumRange = args[0];
      if (!isRange(sumRange)) return new CellError(ERR.VALUE);
      const hit = matchAllCriteria(args.slice(1), sumRange.values.length);
      if (isErr(hit)) return hit;
      let total = 0;
      hit.forEach((ok, i) => {
        const v = sumRange.values[i];
        if (ok && typeof v === 'number') total += v;
      });
      return total;
    },
    COUNTIFS: (args) => {
      const first = args[0];
      if (!isRange(first)) return new CellError(ERR.VALUE);
      const hit = matchAllCriteria(args, first.values.length);
      if (isErr(hit)) return hit;
      return hit.filter(Boolean).length;
    },
    AVERAGEIFS: (args) => {
      const avgRange = args[0];
      if (!isRange(avgRange)) return new CellError(ERR.VALUE);
      const hit = matchAllCriteria(args.slice(1), avgRange.values.length);
      if (isErr(hit)) return hit;
      const picked: number[] = [];
      hit.forEach((ok, i) => {
        const v = avgRange.values[i];
        if (ok && typeof v === 'number') picked.push(v);
      });
      if (!picked.length) return new CellError(ERR.DIV0);
      return picked.reduce((a, b) => a + b, 0) / picked.length;
    },

    // XLOOKUP(検索値, 検索範囲, 戻り範囲, [見つからない場合])
    XLOOKUP: (args) => {
      const key = arg1(args, 0);
      const lookup = args[1];
      const ret = args[2];
      if (!isRange(lookup) || !isRange(ret)) return new CellError(ERR.VALUE);
      const keyText = toText(key).toUpperCase();
      const idx = lookup.values.findIndex((v) => toText(v).toUpperCase() === keyText);
      if (idx < 0) return args.length > 3 ? arg1(args, 3) : new CellError('#N/A');
      return ret.values[idx] ?? new CellError(ERR.REF);
    },

    // TEXTJOIN(区切り文字, 空を無視するか, 値1, ...)
    TEXTJOIN: (args) => {
      const delim = argText(args, 0);
      const skipEmpty = truthy(arg1(args, 1));
      const parts = flattenAll(args.slice(2))
        .filter((v) => !isErr(v))
        .map(toText)
        .filter((t) => (skipEmpty ? t !== '' : true));
      return parts.join(delim);
    },

    // ---------------------------------------------- 論理
    AND: (args) => (flattenAll(args).every((v) => truthy(v)) ? 'TRUE' : 'FALSE'),
    OR: (args) => (flattenAll(args).some((v) => truthy(v)) ? 'TRUE' : 'FALSE'),
    NOT: (args) => (truthy(arg1(args, 0)) ? 'FALSE' : 'TRUE'),
    TRUE: () => 'TRUE',
    FALSE: () => 'FALSE',
    ISBLANK: (args) => (isEmpty(arg1(args, 0)) ? 'TRUE' : 'FALSE'),
    ISNUMBER: (args) => (typeof arg1(args, 0) === 'number' ? 'TRUE' : 'FALSE'),
    ISTEXT: (args) => {
      const v = arg1(args, 0);
      return typeof v === 'string' ? 'TRUE' : 'FALSE';
    },

    // ---------------------------------------------- 検索
    // VLOOKUP(検索値, 範囲, 列番号, [検索方法]) ※既定は完全一致
    VLOOKUP: (args) => {
      const key = arg1(args, 0);
      const table = args[1];
      if (!isRange(table)) return new CellError(ERR.VALUE);
      const colIdx = argNum(args, 2, 1); if (isErr(colIdx)) return colIdx;
      if (colIdx < 1 || colIdx > table.cols) return new CellError(ERR.REF);
      const approx = args.length > 3 ? truthy(arg1(args, 3)) : false;
      const keyText = toText(key).toUpperCase();
      const keyNum = typeof key === 'number' ? key : Number(toText(key));

      let best = -1;
      for (let r = 0; r < table.rows; r++) {
        const cand = table.at(r, 0);
        if (approx) {
          const n = typeof cand === 'number' ? cand : Number(toText(cand));
          if (!Number.isNaN(n) && !Number.isNaN(keyNum) && n <= keyNum) best = r;
        } else if (toText(cand).toUpperCase() === keyText) {
          best = r;
          break;
        }
      }
      if (best < 0) return new CellError('#N/A');
      return table.at(best, colIdx - 1);
    },
    HLOOKUP: (args) => {
      const key = arg1(args, 0);
      const table = args[1];
      if (!isRange(table)) return new CellError(ERR.VALUE);
      const rowIdx = argNum(args, 2, 1); if (isErr(rowIdx)) return rowIdx;
      if (rowIdx < 1 || rowIdx > table.rows) return new CellError(ERR.REF);
      const keyText = toText(key).toUpperCase();
      for (let c = 0; c < table.cols; c++) {
        if (toText(table.at(0, c)).toUpperCase() === keyText) return table.at(rowIdx - 1, c);
      }
      return new CellError('#N/A');
    },
    // INDEX(範囲, 行番号, [列番号])
    INDEX: (args) => {
      const table = args[0];
      if (!isRange(table)) return new CellError(ERR.VALUE);
      const r = argNum(args, 1, 1); if (isErr(r)) return r;
      const c = args.length > 2 ? argNum(args, 2, 1) : 1; if (isErr(c)) return c;
      // 1行だけ / 1列だけの範囲は、番号1つでも引けるようにする
      if (args.length <= 2 && table.cols === 1) return table.at(r - 1, 0);
      if (args.length <= 2 && table.rows === 1) return table.at(0, r - 1);
      return table.at(r - 1, (c as number) - 1);
    },
    // MATCH(検索値, 範囲, [照合の型]) ※0=完全一致のみ対応
    MATCH: (args) => {
      const key = arg1(args, 0);
      const range = args[1];
      if (!isRange(range)) return new CellError(ERR.VALUE);
      const keyText = toText(key).toUpperCase();
      const idx = range.values.findIndex((v) => toText(v).toUpperCase() === keyText);
      return idx < 0 ? new CellError('#N/A') : idx + 1;
    },

    // ---------------------------------------------- 文字列
    LEN: (args) => argText(args, 0).length,
    LEFT: (args) => {
      const n = argNum(args, 1, 1); if (isErr(n)) return n;
      return argText(args, 0).slice(0, Math.max(0, n));
    },
    RIGHT: (args) => {
      const n = argNum(args, 1, 1); if (isErr(n)) return n;
      const s = argText(args, 0);
      return n <= 0 ? '' : s.slice(Math.max(0, s.length - n));
    },
    MID: (args) => {
      const start = argNum(args, 1, 1); if (isErr(start)) return start;
      const len = argNum(args, 2, 0); if (isErr(len)) return len;
      return argText(args, 0).substr(Math.max(0, start - 1), Math.max(0, len));
    },
    TRIM: (args) => argText(args, 0).trim().replace(/\s+/g, ' '),
    UPPER: (args) => argText(args, 0).toUpperCase(),
    LOWER: (args) => argText(args, 0).toLowerCase(),
    CONCATENATE: (args) => flattenAll(args).map(toText).join(''),
    CONCAT: (args) => flattenAll(args).map(toText).join(''),
    SUBSTITUTE: (args) => argText(args, 0).split(argText(args, 1)).join(argText(args, 2)),
    REPT: (args) => {
      const n = argNum(args, 1, 0); if (isErr(n)) return n;
      if (n < 0 || n > 10000) return new CellError(ERR.VALUE);
      return argText(args, 0).repeat(Math.floor(n));
    },
    FIND: (args) => {
      const idx = argText(args, 1).indexOf(argText(args, 0));
      return idx < 0 ? new CellError('#N/A') : idx + 1;
    },
    VALUE: (args) => {
      const n = Number(argText(args, 0).replace(/,/g, ''));
      return Number.isNaN(n) ? new CellError(ERR.VALUE) : n;
    },
    // TEXT(値, "#,##0" / "0.00" / "yyyy-mm-dd") ※よく使う書式のみ
    TEXT: (args) => {
      const v = arg1(args, 0);
      const fmt = argText(args, 1);
      const d = parseDate(v);
      if (d && /y|m|d/i.test(fmt) && !/0|#/.test(fmt)) {
        return fmt
          .replace(/yyyy/gi, String(d.getFullYear()))
          .replace(/mm/g, pad2(d.getMonth() + 1))
          .replace(/dd/g, pad2(d.getDate()));
      }
      const n = toNumber(v);
      if (isErr(n)) return n;
      const decimals = (fmt.split('.')[1] || '').length;
      const fixed = n.toFixed(decimals);
      return fmt.includes(',')
        ? Number(fixed).toLocaleString('ja-JP', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        : fixed;
    },

    // ---------------------------------------------- 日付（"YYYY-MM-DD" 文字列で扱う）
    DATE: (args) => {
      const y = argNum(args, 0); if (isErr(y)) return y;
      const m = argNum(args, 1); if (isErr(m)) return m;
      const d = argNum(args, 2); if (isErr(d)) return d;
      return formatDate(new Date(y, m - 1, d));
    },
    YEAR: (args) => { const d = parseDate(arg1(args, 0)); return d ? d.getFullYear() : new CellError(ERR.VALUE); },
    MONTH: (args) => { const d = parseDate(arg1(args, 0)); return d ? d.getMonth() + 1 : new CellError(ERR.VALUE); },
    DAY: (args) => { const d = parseDate(arg1(args, 0)); return d ? d.getDate() : new CellError(ERR.VALUE); },
    WEEKDAY: (args) => { const d = parseDate(arg1(args, 0)); return d ? d.getDay() + 1 : new CellError(ERR.VALUE); },
    // DAYS(終了日, 開始日) — 日付の引き算ができないと工程表が組めない
    DAYS: (args) => {
      const end = parseDate(arg1(args, 0));
      const start = parseDate(arg1(args, 1));
      if (!end || !start) return new CellError(ERR.VALUE);
      return Math.round((end.getTime() - start.getTime()) / DAY_MS);
    },
    EDATE: (args) => {
      const d = parseDate(arg1(args, 0));
      const months = argNum(args, 1, 0); if (isErr(months)) return months;
      if (!d) return new CellError(ERR.VALUE);
      return formatDate(new Date(d.getFullYear(), d.getMonth() + months, d.getDate()));
    },

    // ============================================ 建築計算（このツール独自）
    //
    // 設計ツール（design-tools/）と同じ式をセル関数として使えるようにしたもの。
    // 数量拾いや見積の表の中で、別画面へ行かずに必要換気量や風圧を出せる。
    // 実体は kenchikuFormulas.ts にあり、根拠の告示番号もそこに書いてある。
    // 関数名は日本語で登録している（字句解析が非ASCIIの識別子を受けるため）。

    // =換気量(床面積㎡, 天井高m, [換気回数=0.5]) 24時間換気の必要換気量 ㎥/h
    '換気量': (args) => {
      const area = argNum(args, 0); if (isErr(area)) return area;
      const h = argNum(args, 1); if (isErr(h)) return h;
      const ach = args.length > 2 ? argNum(args, 2, 0.5) : 0.5; if (isErr(ach)) return ach;
      if (area <= 0 || h <= 0) return new CellError(ERR.NUM);
      return K.ventilation24h(area, h, ach);
    },

    // =火気換気(排気設備, 燃料, 燃料消費量) 告示1826号 V=N×K×Q
    //   排気設備: "フードなし" "フードⅠ" "フードⅡ" "煙突"、または定数Nの数値
    //   燃料: "都市ガス" "LPガス" "灯油"、または理論廃ガス量Kの数値
    '火気換気': (args) => {
      const nRaw = arg1(args, 0);
      const kRaw = arg1(args, 1);
      const n = typeof nRaw === 'number' ? nRaw : K.EXHAUST_N[toText(nRaw).trim()];
      const k = typeof kRaw === 'number' ? kRaw : K.FUEL_K[toText(kRaw).trim()];
      if (n === undefined) return new CellError(ERR.VALUE);
      if (k === undefined) return new CellError(ERR.VALUE);
      const q = argNum(args, 2); if (isErr(q)) return q;
      return K.ventilationFire(n, k, q);
    },

    // =居室換気(人数, [一人あたり=30]) ㎥/h
    '居室換気': (args) => {
      const p = argNum(args, 0); if (isErr(p)) return p;
      const per = args.length > 1 ? argNum(args, 1, 30) : 30; if (isErr(per)) return per;
      return K.ventilationOccupancy(p, per);
    },

    // =風圧(粗度区分1〜4, 建物高さm, 基準風速m/s, [ガスト影響係数]) N/m²
    //   Gf を省くと簡略計算（告示の設計用風圧力より小さく出る）
    '風圧': (args) => {
      const kubun = argNum(args, 0); if (isErr(kubun)) return kubun;
      const h = argNum(args, 1); if (isErr(h)) return h;
      const v0 = argNum(args, 2); if (isErr(v0)) return v0;
      const gf = args.length > 3 ? argNum(args, 3, 1) : 1; if (isErr(gf)) return gf;
      const q = K.windVelocityPressure(kubun, h, v0, gf);
      return q === null ? new CellError(ERR.NUM) : q;
    },

    // =Er(粗度区分1〜4, 建物高さm) 風速の高さ方向分布係数
    'ER': (args) => {
      const kubun = argNum(args, 0); if (isErr(kubun)) return kubun;
      const h = argNum(args, 1); if (isErr(h)) return h;
      const er = K.roughnessEr(kubun, h);
      return er === null ? new CellError(ERR.NUM) : er;
    },

    // =雨水流量(屋根面積㎡, [降雨強度mm/h=120], [流出係数=1]) L/min
    '雨水流量': (args) => {
      const area = argNum(args, 0); if (isErr(area)) return area;
      const i = args.length > 1 ? argNum(args, 1, 120) : 120; if (isErr(i)) return i;
      const c = args.length > 2 ? argNum(args, 2, 1) : 1; if (isErr(c)) return c;
      if (area < 0) return new CellError(ERR.NUM);
      return K.rainFlow(area, i, c);
    },

    // =管流量(呼び径mm, 勾配, [粗度係数=0.010]) L/min マニング式
    //   勾配は 1/100 なら 0.01
    '管流量': (args) => {
      const d = argNum(args, 0); if (isErr(d)) return d;
      const slope = argNum(args, 1); if (isErr(slope)) return slope;
      const n = args.length > 2 ? argNum(args, 2, 0.010) : 0.010; if (isErr(n)) return n;
      const q = K.manningCapacity(d, slope, n);
      return q === null ? new CellError(ERR.NUM) : q;
    },

    // ---- 面積・寸法の換算（現場でよく混在する単位）
    '坪': (args) => { const v = argNum(args, 0); return isErr(v) ? v : K.m2ToTsubo(v); },
    '平米': (args) => { const v = argNum(args, 0); return isErr(v) ? v : K.tsuboToM2(v); },
    '帖': (args) => { const v = argNum(args, 0); return isErr(v) ? v : K.m2ToJo(v); },
    '間': (args) => { const v = argNum(args, 0); return isErr(v) ? v : K.mmToKen(v); },
    'ミリ': (args) => { const v = argNum(args, 0); return isErr(v) ? v : K.kenToMm(v); },

    // ---- 勾配（屋根）
    // =勾配角度(寸) 4寸勾配 → 21.8度
    '勾配角度': (args) => { const v = argNum(args, 0); return isErr(v) ? v : K.sunToDegree(v); },
    // =勾配長さ(水平距離, 寸) 屋根の流れ長さ
    '勾配長さ': (args) => {
      const h = argNum(args, 0); if (isErr(h)) return h;
      const sun = argNum(args, 1); if (isErr(sun)) return sun;
      return K.slopeLength(h, sun);
    },

    // ---- 数量拾い
    // =必要数(数量, 1単位あたり, ロス率%) 端数は切り上げ
    // 例) =必要数(A1, 1.6562, 5) 面積A1㎡を910×1820の板で、ロス5%
    '必要数': (args) => {
      const q = argNum(args, 0); if (isErr(q)) return q;
      const per = argNum(args, 1); if (isErr(per)) return per;
      const loss = args.length > 2 ? argNum(args, 2) : 0; if (isErr(loss)) return loss;
      const n = K.requiredCount(q, per, loss as number);
      return n === null ? new CellError(ERR.NUM) : n;
    },
    // =尺(mm) 1818 → 6尺。=尺ミリ(尺) 1 → 303.03
    '尺': (args) => { const v = argNum(args, 0); return isErr(v) ? v : K.mmToShaku(v); },
    '尺ミリ': (args) => { const v = argNum(args, 0); return isErr(v) ? v : K.shakuToMm(v); },
    // =ボード枚数(面積㎡, [規格="3x6"], [ロス率%=5]) 端数は切り上げ
    'ボード枚数': (args) => {
      const a = argNum(args, 0); if (isErr(a)) return a;
      const size = args.length > 1 ? argText(args, 1) : '3x6';
      const loss = args.length > 2 ? argNum(args, 2) : 5; if (isErr(loss)) return loss;
      const n = K.boardCount(a, size || '3x6', loss as number);
      return n === null ? new CellError(ERR.VALUE) : n;
    },
    // =本数(長さm, 定尺m, [ロス率%=0]) 巾木・廻り縁・クロスの巻きなど
    '本数': (args) => {
      const len = argNum(args, 0); if (isErr(len)) return len;
      const per = argNum(args, 1); if (isErr(per)) return per;
      const loss = args.length > 2 ? argNum(args, 2) : 0; if (isErr(loss)) return loss;
      const n = K.requiredCount(len, per, loss as number);
      return n === null ? new CellError(ERR.NUM) : n;
    },
    // =定尺面積(幅mm, 高さmm) 910×1820 → 1.6562
    '定尺面積': (args) => {
      const w = argNum(args, 0); if (isErr(w)) return w;
      const h = argNum(args, 1); if (isErr(h)) return h;
      const a = K.boardArea(w, h);
      return a === null ? new CellError(ERR.NUM) : a;
    },
  };

  constructor() {
    // 英字でも呼べるように（日本語入力を切り替えずに打てる）
    const alias: Record<string, string> = { TSUBO: '坪', HEIBEI: '平米', JO: '帖', KEN: '間', SHAKU: '尺', BOARD: 'ボード枚数', ROLL: '本数', QTY: '必要数' };
    for (const [en, ja] of Object.entries(alias)) this.functions[en] = this.functions[ja];
  }

  // ------------------------------------------------ アドレス変換

  addressToRC(addr: string): CellId | null {
    // $A$1 のような絶対参照も受け付ける（従来は null になり参照が解決できなかった）
    const m = addr.trim().match(/^\$?([A-Za-z]+)\$?(\d+)$/);
    if (!m) return null;
    const letters = m[1].toUpperCase();
    const row = parseInt(m[2], 10) - 1;
    let col = 0;
    for (let i = 0; i < letters.length; i++) {
      col = col * 26 + (letters.charCodeAt(i) - 64);
    }
    col -= 1;
    if (row < 0 || col < 0) return null;
    return { row, col };
  }

  rcToAddress(row: number, col: number): string {
    return `${this.indexToColName(col)}${row + 1}`;
  }

  // ------------------------------------------------ 評価

  evaluateRaw(
    raw: string,
    visited: Set<string>,
    getCellValue: GetCellValueFn,
    evaluateCell: EvaluateCellFn
  ): number | string {
    const t = String(raw ?? '').trim();
    if (!t.startsWith('=')) return String(raw ?? '');

    const body = t.substring(1).trim();
    if (body === '') return '';

    try {
      const ast = new Parser(tokenize(body)).parse();
      const result = this.evalNode(ast, evaluateCell);
      if (isRange(result)) return ERR.VALUE; // 範囲をそのまま表示はできない
      return toDisplay(result);
    } catch (err) {
      if (err instanceof CellError) return err.code;
      return ERR.SYNTAX;
    }
  }

  private evalNode(node: Node, evaluateCell: EvaluateCellFn): Value {
    switch (node.k) {
      case 'num':
        return node.v;
      case 'str':
        return node.v;

      case 'ref': {
        const rc = this.addressToRC(node.v);
        if (!rc) return new CellError(ERR.REF);
        return coerceCell(evaluateCell(rc, node.sheet));
      }

      case 'range': {
        const s = this.addressToRC(node.from);
        const e = this.addressToRC(node.to);
        if (!s || !e) return new CellError(ERR.REF);
        const r0 = Math.min(s.row, e.row);
        const r1 = Math.max(s.row, e.row);
        const c0 = Math.min(s.col, e.col);
        const c1 = Math.max(s.col, e.col);
        if ((r1 - r0 + 1) * (c1 - c0 + 1) > MAX_RANGE_CELLS) return new CellError(ERR.REF);
        const out: Scalar[] = [];
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) out.push(coerceCell(evaluateCell({ row: r, col: c }, node.sheet)));
        }
        return new RangeValue(r1 - r0 + 1, c1 - c0 + 1, out);
      }

      case 'percent': {
        const v = this.scalar(this.evalNode(node.arg, evaluateCell));
        const n = toNumber(v);
        return isErr(n) ? n : n / 100;
      }

      case 'unary': {
        const v = this.scalar(this.evalNode(node.arg, evaluateCell));
        const n = toNumber(v);
        if (isErr(n)) return n;
        return node.op === '-' ? -n : n;
      }

      case 'binary':
        return this.evalBinary(node, evaluateCell);

      case 'call':
        return this.evalCall(node, evaluateCell);
    }
  }

  /** 範囲が単一値の文脈に来たら先頭要素で代用せずエラーにする */
  private scalar(v: Value): Scalar {
    if (isRange(v)) return new CellError(ERR.VALUE);
    return v;
  }

  private evalBinary(node: Extract<Node, { k: 'binary' }>, evaluateCell: EvaluateCellFn): Value {
    const l = this.scalar(this.evalNode(node.left, evaluateCell));
    if (isErr(l)) return l;
    const r = this.scalar(this.evalNode(node.right, evaluateCell));
    if (isErr(r)) return r;

    if (node.op === '&') {
      return `${toDisplay(l)}${toDisplay(r)}`;
    }

    if (['=', '<>', '>', '<', '>=', '<='].includes(node.op)) {
      let cmp: number;
      if (typeof l === 'number' && typeof r === 'number') {
        cmp = l < r ? -1 : l > r ? 1 : 0;
      } else if (isEmpty(l) && isEmpty(r)) {
        cmp = 0;
      } else {
        // 数値と文字列が混ざる場合は Excel と同じく大文字小文字を無視した文字列比較
        const ls = String(toDisplay(l)).toUpperCase();
        const rs = String(toDisplay(r)).toUpperCase();
        cmp = ls < rs ? -1 : ls > rs ? 1 : 0;
      }
      switch (node.op) {
        case '=': return cmp === 0 ? 'TRUE' : 'FALSE';
        case '<>': return cmp !== 0 ? 'TRUE' : 'FALSE';
        case '>': return cmp > 0 ? 'TRUE' : 'FALSE';
        case '<': return cmp < 0 ? 'TRUE' : 'FALSE';
        case '>=': return cmp >= 0 ? 'TRUE' : 'FALSE';
        case '<=': return cmp <= 0 ? 'TRUE' : 'FALSE';
      }
    }

    const ln = toNumber(l);
    if (isErr(ln)) return ln;
    const rn = toNumber(r);
    if (isErr(rn)) return rn;

    switch (node.op) {
      case '+': return ln + rn;
      case '-': return ln - rn;
      case '*': return ln * rn;
      case '/': return rn === 0 ? new CellError(ERR.DIV0) : ln / rn;
      case '^': {
        const p = Math.pow(ln, rn);
        return Number.isFinite(p) ? p : new CellError(ERR.NUM);
      }
    }
    return new CellError(ERR.SYNTAX);
  }

  private evalCall(node: Extract<Node, { k: 'call' }>, evaluateCell: EvaluateCellFn): Value {
    // IF だけは分岐しなかった側を評価しない（未使用の枝の #DIV/0! を拾わないため）
    if (node.name === 'IF') {
      if (node.args.length < 2) return new CellError(ERR.VALUE);
      const cond = this.scalar(this.evalNode(node.args[0], evaluateCell));
      if (isErr(cond)) return cond;
      const branch = truthy(cond) ? node.args[1] : node.args[2];
      if (!branch) return 'FALSE';
      return this.scalar(this.evalNode(branch, evaluateCell));
    }

    // IFS(条件1, 値1, 条件2, 値2, ...) も、当たった枝だけを評価する
    if (node.name === 'IFS') {
      for (let i = 0; i + 1 < node.args.length; i += 2) {
        const cond = this.scalar(this.evalNode(node.args[i], evaluateCell));
        if (isErr(cond)) return cond;
        if (truthy(cond)) return this.scalar(this.evalNode(node.args[i + 1], evaluateCell));
      }
      return new CellError('#N/A');
    }

    // IFERROR も、第1引数がエラーだったときだけ第2引数を評価する
    if (node.name === 'IFERROR') {
      if (node.args.length < 1) return new CellError(ERR.VALUE);
      const head = this.evalNode(node.args[0], evaluateCell);
      if (!isErr(head)) return head;
      return node.args[1] ? this.evalNode(node.args[1], evaluateCell) : '';
    }

    const fn = this.functions[node.name];
    if (!fn) return new CellError(ERR.NAME);

    const args: Value[] = [];
    for (const argNode of node.args) {
      const v = this.evalNode(argNode, evaluateCell);
      if (isErr(v)) return v;
      args.push(v);
    }
    try {
      return fn(args);
    } catch {
      return new CellError(ERR.VALUE);
    }
  }

  /** カスタム関数の登録。関数表を直接引くので登録すればすぐ使える */
  registerFunction(name: string, fn: (args: Value[]) => Value) {
    this.functions[name.toUpperCase()] = fn;
  }

  /** 実装済みの関数名一覧（サジェスト表示の裏付けに使う） */
  getFunctionNames(): string[] {
    return ['IF', 'IFERROR', 'IFS', ...Object.keys(this.functions)].sort();
  }

  // ------------------------------------------------ コピー時の参照調整

  /**
   * 数式内のセル参照を相対的にずらす（オートフィル・コピー用）。
   * 文字列リテラルの中身と関数名は書き換えない。
   */
  adjustFormula(formula: string, rowOffset: number, colOffset: number): string {
    let out = '';
    let i = 0;

    while (i < formula.length) {
      const ch = formula[i];

      // 文字列リテラルはそのまま通す
      if (ch === '"') {
        out += ch;
        i++;
        while (i < formula.length) {
          out += formula[i];
          if (formula[i] === '"' && formula[i + 1] !== '"') { i++; break; }
          if (formula[i] === '"' && formula[i + 1] === '"') { out += formula[++i]; }
          i++;
        }
        continue;
      }

      if (ch === '$' || /[A-Za-z]/.test(ch)) {
        let buf = '';
        const start = i;
        while (i < formula.length && /[A-Za-z0-9_$.]/.test(formula[i])) buf += formula[i++];
        // 直後が '(' なら関数名なので触らない
        const isFunctionName = formula[i] === '(';
        const m = buf.match(/^(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})$/);
        if (m && !isFunctionName) {
          const [, colAbs, colLetters, rowAbs, rowNum] = m;
          let colIndex = this.colNameToIndex(colLetters.toUpperCase());
          let rowIndex = parseInt(rowNum, 10) - 1;
          if (colAbs !== '$') colIndex += colOffset;
          if (rowAbs !== '$') rowIndex += rowOffset;
          if (colIndex < 0) colIndex = 0;
          if (rowIndex < 0) rowIndex = 0;
          out += `${colAbs}${this.indexToColName(colIndex)}${rowAbs}${rowIndex + 1}`;
        } else {
          out += formula.slice(start, i);
        }
        continue;
      }

      out += ch;
      i++;
    }

    return out;
  }

  /**
   * 行・列の挿入／削除に合わせて、数式の中の参照を書き換える。
   *
   * ★これが無いと、行を1つ挿しただけで =SUM(A1:A3) が古い範囲を指したまま残り、
   *   エラーも出さずに違う金額を出し続ける（Excel は自動で A1:A4 に直す）。
   *
   * コピー時の adjustFormula と違い、絶対参照（$A$1）も動かす。
   * Excel も構造変更のときは $ を無視して追従させる。
   *
   * @param axis   'row' なら行、'col' なら列
   * @param target 挿入／削除する 0 始まりの位置
   */
  adjustFormulaForStructuralChange(
    formula: string,
    axis: 'row' | 'col',
    target: number,
    action: 'insert' | 'delete',
  ): string {
    if (!formula.startsWith('=')) return formula;

    // 単独参照の位置をずらす。削除された行／列そのものを指していたら null
    const shiftSingle = (idx: number): number | null => {
      if (action === 'insert') return idx >= target ? idx + 1 : idx;
      if (idx === target) return null;
      return idx > target ? idx - 1 : idx;
    };

    // 範囲の端は、削除されても #REF! にせず縮める（Excel と同じ）
    const shiftRange = (start: number, end: number): [number, number] | null => {
      if (action === 'insert') {
        return [start >= target ? start + 1 : start, end >= target ? end + 1 : end];
      }
      const s = start > target ? start - 1 : start;
      const e = end >= target ? end - 1 : end;
      return e < s ? null : [s, e];
    };

    const parseRef = (raw: string) => {
      const m = raw.match(/^(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})$/);
      if (!m) return null;
      return {
        colAbs: m[1], colName: m[2].toUpperCase(), rowAbs: m[3],
        col: this.colNameToIndex(m[2].toUpperCase()), row: parseInt(m[4], 10) - 1,
      };
    };
    const build = (p: NonNullable<ReturnType<typeof parseRef>>, row: number, col: number) =>
      `${p.colAbs}${this.indexToColName(col)}${p.rowAbs}${row + 1}`;

    // 'シート名'!A1 / シート名!A1:B2 / A1:B2 / A1 をまとめて拾う
    const REF = String.raw`(?:'(?:[^']|'')*'!|[A-Za-z0-9_-￿]+!)?\$?[A-Za-z]{1,3}\$?\d{1,7}`;
    const PATTERN = new RegExp(`(${REF})(\\s*:\\s*(${REF}))?`, 'g');

    let broken = false;
    const out = formula.replace(PATTERN, (whole, left: string, colonPart: string | undefined, right: string | undefined) => {
      // 関数名の一部などを誤って掴まないよう、参照として解釈できるものだけ扱う
      const splitSheet = (token: string) => {
        const bang = token.lastIndexOf('!');
        return bang < 0 ? { prefix: '', ref: token } : { prefix: token.slice(0, bang + 1), ref: token.slice(bang + 1) };
      };
      const l = splitSheet(left);
      const lp = parseRef(l.ref);
      if (!lp) return whole;

      if (colonPart && right) {
        const r = splitSheet(right);
        const rp = parseRef(r.ref);
        if (!rp) return whole;
        if (axis === 'row') {
          const res = shiftRange(Math.min(lp.row, rp.row), Math.max(lp.row, rp.row));
          if (!res) { broken = true; return ERR.REF; }
          return `${l.prefix}${build(lp, res[0], lp.col)}:${r.prefix}${build(rp, res[1], rp.col)}`;
        }
        const res = shiftRange(Math.min(lp.col, rp.col), Math.max(lp.col, rp.col));
        if (!res) { broken = true; return ERR.REF; }
        return `${l.prefix}${build(lp, lp.row, res[0])}:${r.prefix}${build(rp, rp.row, res[1])}`;
      }

      const moved = axis === 'row' ? shiftSingle(lp.row) : shiftSingle(lp.col);
      if (moved === null) { broken = true; return ERR.REF; }
      return `${l.prefix}${axis === 'row' ? build(lp, moved, lp.col) : build(lp, lp.row, moved)}`;
    });

    void broken;
    return out;
  }

  private colNameToIndex(name: string): number {
    let index = 0;
    for (let i = 0; i < name.length; i++) {
      index = index * 26 + (name.charCodeAt(i) - 64);
    }
    return index - 1;
  }

  private indexToColName(index: number): string {
    let name = '';
    let n = index + 1;
    while (n > 0) {
      const rem = (n - 1) % 26;
      name = String.fromCharCode(65 + rem) + name;
      n = Math.floor((n - 1) / 26);
    }
    return name;
  }
}

export default FormulaEngine;
