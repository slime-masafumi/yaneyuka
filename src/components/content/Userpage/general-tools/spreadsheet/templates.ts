/**
 * 表計算のテンプレート（建築の集計表）。
 * 白紙から列を作ると毎回同じ手間がかかり、式の入れ忘れも起きるので、
 * 実務でよく作る表を式つきで用意する。建築関数（=坪() =必要数() =定尺面積()）を使う。
 *
 * セルのキーは R{行}C{列}（0 始まり）。A1 = R0C0。
 */

type Fmt = {
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  type?: 'text' | 'number' | 'percent' | 'currency';
  decimals?: number;
  bg?: string;
  border?: { top?: boolean; right?: boolean; bottom?: boolean; left?: boolean };
};

export type SheetTemplate = {
  id: string;
  name: string;
  description: string;
  rows: number;
  cols: number;
  cells: Record<string, string>;
  formats: Record<string, Fmt>;
  colWidths: number[];
};

const key = (r: number, c: number) => `R${r}C${c}`;
const col = (c: number) => String.fromCharCode(65 + c);
const HEAD: Fmt = { bold: true, align: 'center', bg: '#f3f4f6', border: { bottom: true } };
const TOTAL: Fmt = { bold: true, bg: '#f9fafb', border: { top: true } };

/** 見出し行と、明細行ごとの式から表を組む */
function build(opts: {
  id: string;
  name: string;
  description: string;
  title: string;
  headers: string[];
  widths: number[];
  rows: number;
  /** 明細行 r（0 始まりの行番号、Excel の行番号は r+1）の各列の中身。空なら入れない */
  row?: (r: number) => (string | null)[];
  /** 列ごとの書式 */
  colFmt?: (Fmt | null)[];
  /** 明細の下に足す行（[列, 中身, 書式]） */
  footer?: (firstRow: number, lastRow: number) => [number, string, Fmt?][][];
}): SheetTemplate {
  const cells: Record<string, string> = {};
  const formats: Record<string, Fmt> = {};
  cells[key(0, 0)] = opts.title;
  formats[key(0, 0)] = { bold: true };
  opts.headers.forEach((h, c) => {
    cells[key(1, c)] = h;
    formats[key(1, c)] = HEAD;
  });
  const first = 2;
  const last = first + opts.rows - 1;
  for (let r = first; r <= last; r++) {
    const vals = opts.row?.(r) ?? [];
    vals.forEach((v, c) => {
      if (v) cells[key(r, c)] = v;
    });
    opts.colFmt?.forEach((f, c) => {
      if (f) formats[key(r, c)] = f;
    });
  }
  let r = last + 1;
  for (const line of opts.footer?.(first, last) ?? []) {
    for (const [c, v, f] of line) {
      cells[key(r, c)] = v;
      formats[key(r, c)] = f ?? TOTAL;
    }
    r++;
  }
  return {
    id: opts.id,
    name: opts.name,
    description: opts.description,
    rows: Math.max(20, r + 2),
    cols: Math.max(10, opts.headers.length),
    cells,
    formats,
    colWidths: [...opts.widths, ...Array(Math.max(0, 10 - opts.widths.length)).fill(96)],
  };
}

const NUM2: Fmt = { type: 'number', decimals: 2, align: 'right' };
const INT: Fmt = { type: 'number', decimals: 0, align: 'right' };
const YEN: Fmt = { type: 'currency', decimals: 0, align: 'right' };

export const SHEET_TEMPLATES: SheetTemplate[] = [
  build({
    id: 'area',
    name: '面積表',
    description: '室ごとの面積と坪、延べ面積・建蔽率・容積率',
    title: '面積表',
    headers: ['階', '室名', '用途', '幅 m', '奥行 m', '面積 ㎡', '坪', '備考'],
    widths: [48, 120, 90, 64, 64, 80, 64, 140],
    rows: 12,
    row: (r) => ['', '', '', '', '', `=IF(AND(D${r + 1}<>"",E${r + 1}<>""),D${r + 1}*E${r + 1},"")`, `=IF(F${r + 1}="","",坪(F${r + 1}))`],
    colFmt: [null, null, null, NUM2, NUM2, NUM2, NUM2],
    footer: (a, b) => [
      [[4, '延べ面積'], [5, `=SUM(F${a + 1}:F${b + 1})`, { ...TOTAL, ...NUM2 }], [6, `=坪(F${b + 2})`, { ...TOTAL, ...NUM2 }]],
      [[4, '建築面積', {}], [5, '', NUM2], [7, '← 入力', {}]],
      [[4, '敷地面積', {}], [5, '', NUM2], [7, '← 入力', {}]],
      [[4, '建蔽率', {}], [5, `=IF(F${b + 4}>0,F${b + 3}/F${b + 4},"")`, { type: 'percent', decimals: 1, align: 'right' }]],
      [[4, '容積率', {}], [5, `=IF(F${b + 4}>0,F${b + 2}/F${b + 4},"")`, { type: 'percent', decimals: 1, align: 'right' }], [7, '容積不算入の部分は延べ面積から除いて見直す', {}]],
    ],
  }),
  build({
    id: 'finish',
    name: '仕上表',
    description: '室ごとの床・巾木・壁・天井の仕上げと天井高',
    title: '内部仕上表',
    headers: ['階', '室名', '床', '巾木', '壁', '天井', '天井高 mm', '備考'],
    widths: [48, 110, 150, 90, 150, 150, 80, 140],
    rows: 15,
    colFmt: [null, null, null, null, null, null, INT],
  }),
  build({
    id: 'door',
    name: '建具表',
    description: '記号ごとの種類・寸法・数量・仕様',
    title: '建具表',
    headers: ['記号', '室名', '種類', '幅 mm', '高さ mm', '数量', '仕様・金物', '備考'],
    widths: [56, 100, 110, 64, 64, 56, 200, 120],
    rows: 15,
    colFmt: [null, null, null, INT, INT, INT],
    footer: (a, b) => [[[4, '合計'], [5, `=SUM(F${a + 1}:F${b + 1})`, { ...TOTAL, ...INT }]]],
  }),
  build({
    id: 'takeoff',
    name: '数量拾い（ボード）',
    description: '部位ごとの面積から、定尺とロス率で必要枚数を出す',
    title: '数量拾い — ボード',
    headers: ['部位', '長さ m', '高さ m', '面積 ㎡', '定尺 幅 mm', '定尺 長さ mm', 'ロス %', '必要枚数'],
    widths: [140, 64, 64, 72, 80, 88, 56, 72],
    rows: 12,
    row: (r) => [
      '',
      '',
      '',
      `=IF(AND(B${r + 1}<>"",C${r + 1}<>""),B${r + 1}*C${r + 1},"")`,
      '910',
      '1820',
      '5',
      `=IF(D${r + 1}="","",必要数(D${r + 1},定尺面積(E${r + 1},F${r + 1}),G${r + 1}))`,
    ],
    colFmt: [null, NUM2, NUM2, NUM2, INT, INT, INT, INT],
    footer: (a, b) => [[[2, '合計'], [3, `=SUM(D${a + 1}:D${b + 1})`, { ...TOTAL, ...NUM2 }], [7, `=SUM(H${a + 1}:H${b + 1})`, { ...TOTAL, ...INT }]]],
  }),
  build({
    id: 'estimate',
    name: '工事費内訳',
    description: '工種ごとの数量×単価、小計・消費税・合計',
    title: '工事費内訳書',
    headers: ['工種', '摘要', '数量', '単位', '単価', '金額', '備考'],
    widths: [120, 200, 64, 48, 88, 104, 140],
    rows: 15,
    row: (r) => ['', '', '', '', '', `=IF(AND(C${r + 1}<>"",E${r + 1}<>""),C${r + 1}*E${r + 1},"")`],
    colFmt: [null, null, NUM2, { align: 'center' }, YEN, YEN],
    footer: (a, b) => [
      [[4, '小計'], [5, `=SUM(F${a + 1}:F${b + 1})`, { ...TOTAL, ...YEN }]],
      [[4, '消費税 10%', {}], [5, `=ROUND(F${b + 2}*0.1,0)`, YEN]],
      [[4, '合計'], [5, `=F${b + 2}+F${b + 3}`, { ...TOTAL, ...YEN }]],
    ],
  }),
];

/** 設計ツールの「面積表」などから、表計算をテンプレート付きで開くための受け渡し */
export const PENDING_TEMPLATE_KEY = 'yy-sheet-template';

export const templateColumnName = col;
