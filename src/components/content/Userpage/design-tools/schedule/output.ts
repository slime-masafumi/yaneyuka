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
  const run = () => {
    win.focus();
    win.print();
    setTimeout(() => frame.remove(), 1000);
  };
  // フォントの読み込みを待つ（無ければすぐ）
  const fonts = (doc as Document & { fonts?: FontFaceSet }).fonts;
  if (fonts?.ready) fonts.ready.then(() => setTimeout(run, 50));
  else setTimeout(run, 100);
}

export function downloadText(text: string, filename: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/[\\/:*?"<>|]/g, '_');
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
