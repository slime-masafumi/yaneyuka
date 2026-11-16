/**
 * 工程表の印刷とファイル保存。
 *
 * 印刷は見えない iframe に SVG だけを移して、その iframe で print() する。
 * サイト全体の印刷設定（globals.css の @media print。地図ツールと共用で、1 ページに固定している）を
 * 通さないので、行が多い工程表を複数ページで出せる。用紙もここで A3 / A4 を決める。
 */
import { type Paper } from '@/lib/gantt';

const PAPER_MM: Record<Paper, { w: number; h: number }> = { A3: { w: 420, h: 297 }, A4: { w: 297, h: 210 } };

export function printSvgPages(svgs: SVGSVGElement[], paper: Paper, title: string) {
  const { w, h } = PAPER_MM[paper];
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  const pages = svgs
    .map((s) => {
      const c = s.cloneNode(true) as SVGSVGElement;
      // 画面の拡大率を外して用紙いっぱいに
      c.setAttribute('width', '100%');
      c.setAttribute('height', '100%');
      return `<div class="page">${c.outerHTML}</div>`;
    })
    .join('');
  doc.open();
  doc.write(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${title.replace(/[<>&]/g, '')}</title>
<style>
@page { size: ${paper} landscape; margin: 0; }
html, body { margin: 0; padding: 0; background: #fff; }
.page { width: ${w}mm; height: ${h}mm; overflow: hidden; page-break-after: always; break-after: page; }
.page:last-child { page-break-after: auto; break-after: auto; }
svg { display: block; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style></head><body>${pages}</body></html>`);
  doc.close();
  const win = frame.contentWindow!;
  // 保存先のファイル名の候補はタイトルから付く
  // print() がダイアログを閉じるまで待たないブラウザでは、1 秒で iframe を消すと印刷の中身が無くなることがある。
  // 印刷が終わった合図（afterprint）で消し、来なくても 1 分後には片付ける
  const remove = () => frame.isConnected && frame.remove();
  const run = () => {
    win.addEventListener('afterprint', () => setTimeout(remove, 0), { once: true });
    win.focus();
    win.print();
    setTimeout(remove, 60_000);
  };
  // フォントの読み込みを待つ（無ければすぐ）
  const fonts = (doc as Document & { fonts?: FontFaceSet }).fonts;
  if (fonts?.ready) fonts.ready.then(() => setTimeout(run, 50));
  else setTimeout(run, 100);
}

/**
 * 式インジェクション対策。= + - @ で始まるセル(タブ・CR で始まるものも)は、Excel などが式として
 * 実行しないよう先頭に ' を付ける。空け日数の -2 のような数値だけのセルは数値のまま残す
 * (付けると読み込み直したときに数値として読めなくなる)。
 */
const FORMULA_HEAD = /^[=+\-@\t\r]/;
const NUMBER_ONLY = /^-?\d+(\.\d+)?$/;
const csvEscape = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export function neutralizeCsvCell(s: string): string {
  return FORMULA_HEAD.test(s) && !NUMBER_ONLY.test(s) ? `'${s}` : s;
}

/** CSV の文字列を行と列に分けて、各セルに neutralizeCsvCell をかけて組み直す(BOM と CRLF は保つ) */
export function neutralizeCsv(text: string): string {
  const bom = text.startsWith('﻿') ? '﻿' : '';
  const src = bom ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const eol = /\r\n/.test(src) ? '\r\n' : '\n';
  const trailing = /\r?\n$/.test(src) ? eol : '';
  return bom + rows.map((r) => r.map((c) => csvEscape(neutralizeCsvCell(c))).join(',')).join(eol) + trailing;
}

export function downloadText(text: string, filename: string, type: string) {
  // CSV は保存の直前に式インジェクション対策をかける(工程名・メモに = や @ で始まる文字が入ることがある)
  const body = /csv/i.test(type) || /\.csv$/i.test(filename) ? neutralizeCsv(text) : text;
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/[\\/:*?"<>|]/g, '_');
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
