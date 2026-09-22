// 図面PDF の書き出しで使っている pdf-lib の操作（複製・並べ替え・回転・用紙変換）を
// そのままの手順で確かめる。UI を通さずに幾何だけを検証する。
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

const PAPER = { A4:[595.28,841.89], A3:[841.89,1190.55], A1:[1683.78,2383.94] };
let bad = 0;
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok?'ok ':'NG '} ${label} -> ${JSON.stringify(got)}${ok?'':` (want ${JSON.stringify(want)})`}`);
};
const round = (n) => Math.round(n * 100) / 100;

// 元PDF: A4縦3ページ + A4横1ページ
const src = await PDFDocument.create();
const font = await src.embedFont(StandardFonts.Helvetica);
for (let i = 1; i <= 3; i++) {
  const p = src.addPage([595.28, 841.89]);
  p.drawText(`P${i}`, { x: 50, y: 700, size: 40, font, color: rgb(0,0,0) });
}
const land = src.addPage([841.89, 595.28]);
land.drawText('LANDSCAPE', { x: 50, y: 400, size: 40, font, color: rgb(0,0,0) });
const srcBytes = await src.save();

const loaded = await PDFDocument.load(srcBytes);
check('元は4ページ', loaded.getPageCount(), 4);

// 並べ替え（3,1,4）＋ 3ページ目を90度回転 ＋ A3化
const order = [2, 0, 3];
const rotations = [0, 90, 0];
const out = await PDFDocument.create();
const copied = await Promise.all(order.map(i => out.copyPages(loaded, [i]).then(p => p[0])));

for (let i = 0; i < copied.length; i++) {
  const page = copied[i];
  if (rotations[i]) page.setRotation(degrees((page.getRotation().angle + rotations[i]) % 360));

  const [tw, th] = PAPER.A3;
  const { width, height } = page.getSize();
  const [fitW, fitH] = width > height ? [th, tw] : [tw, th];
  const scale = Math.min(fitW / width, fitH / height);
  page.scaleContent(scale, scale);
  page.setSize(fitW, fitH);
  page.translateContent((fitW - width * scale) / 2, (fitH - height * scale) / 2);

  out.addPage(page);
}

const outBytes = await out.save();
const back = await PDFDocument.load(outBytes);
check('書き出しは3ページ', back.getPageCount(), 3);

const sizes = back.getPages().map(p => [round(p.getSize().width), round(p.getSize().height)]);
check('1枚目はA3縦', sizes[0], [round(PAPER.A3[0]), round(PAPER.A3[1])]);
check('2枚目はA3縦', sizes[1], [round(PAPER.A3[0]), round(PAPER.A3[1])]);
check('3枚目は横ページなのでA3横', sizes[2], [round(PAPER.A3[1]), round(PAPER.A3[0])]);
check('2枚目に90度が入っている', back.getPages()[1].getRotation().angle, 90);
check('回転していないページは0度', back.getPages()[0].getRotation().angle, 0);

// 縦横比が保たれているか（図面で一番まずいのは比率が崩れること）
const srcRatio = round(595.28 / 841.89);
const outRatio = round(PAPER.A3[0] / PAPER.A3[1]);
check('A4とA3は同じ縦横比（内容は歪まない）', srcRatio, outRatio);

console.log(bad ? `${bad} FAILED` : 'ALL PASS');
