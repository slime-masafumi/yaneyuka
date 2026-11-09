/**
 * 説明資料の出力。A4 横 1 枚の画像を組み立て、PNG か PDF で保存する。
 * 図・条件・免責文を同じ 1 枚の画像に焼き込むので、免責文だけを消すことはできない。
 */
import { levelOf, type FlowModel, type FlowResult, type FlowSupport } from '@/lib/forceFlow';
import { FLOW_DISCLAIMER, FLOW_EXCLUSIONS, LEVEL_LABELS } from '@/lib/forceFlowModel';
import { computeLayout, divergingColor, drawFlow, FIELD_LABELS, LEVEL_COLORS, PAPER, type FlowField, type FlowView } from './flowDraw';

export type SheetPlan = { name: string; model: FlowModel; result: FlowResult };

export type SheetOptions = {
  plans: SheetPlan[];
  view: FlowView;
  scale: number;
  deform: number;
  memo: string;
  propertyName: string;
  date: Date;
};

const SHEET_W = 2339;
const SHEET_H = 1654;
const MARGIN = 80;
const SANS = '"Hiragino Sans","Noto Sans JP","Yu Gothic",Meiryo,sans-serif';
const INK = '#222222';
const MUTED = '#6e6a62';

const SUPPORT_NAME: Record<FlowSupport['type'], string> = { fixed: '固定', pin: 'ピン', roller: 'ローラー' };
const EDGE_NAME: Record<FlowSupport['edge'], string> = { bottom: '下端', top: '上端', left: '左端', right: '右端' };

export const formatRatio = (v: number | null) => (v === null ? '—' : `1/${Math.round(v).toLocaleString()}`);

export function conditionLines(model: FlowModel, result: FlowResult): string[] {
  const m = model.material;
  const lines = [
    `形状  幅 ${model.width.toLocaleString()} × 高さ ${model.height.toLocaleString()} mm、壁厚 ${model.thickness} mm`,
    `材料  ${m.label}  E=${m.E.toLocaleString()} N/mm²  ν=${m.nu}  基準 引張 ${m.ft} / 圧縮 ${m.fc} N/mm²`,
  ];
  if (model.zones.length) {
    lines.push(
      `開口・柱  ${model.zones
        .map((z) => `${z.kind === 'column' ? '柱' : z.shape === 'circle' ? '円孔' : '開口'} ${z.shape === 'circle' ? `φ${z.w}` : `${z.w}×${z.h}`}（左から ${z.x}、下から ${z.y}）`)
        .join('、')}`
    );
  }
  lines.push(`支点  ${model.supports.map((s) => `${EDGE_NAME[s.edge]} ${SUPPORT_NAME[s.type]}${s.from === s.to ? ` ${s.from}` : ` ${s.from}〜${s.to}`}`).join('、')}`);
  const loads = model.loads.map((l) => {
    if (l.kind === 'line') return `線荷重 ${l.q} kN/m（高さ ${l.y}）`;
    if (l.kind === 'shear') return `水平力 ${l.H} kN（高さ ${l.y}）`;
    return `集中荷重 下向き ${l.fy} / 右向き ${l.fx} kN（${l.x}, ${l.y}）`;
  });
  lines.push(`荷重  ${[...loads, model.selfWeight ? '自重あり' : '自重なし'].join('、')}`);
  lines.push(`解析  線形弾性・平面応力、Q6 要素 ${result.elements.toLocaleString()} 個（${Math.round(result.dx)}×${Math.round(result.dy)} mm）`);
  return lines;
}

export function resultLines(result: FlowResult): string[] {
  const s = result.summary;
  const d = s.deflection;
  const lines = [
    `最大引張 ${s.tension.value.toFixed(2)} N/mm²、最大圧縮 ${s.compression.value.toFixed(2)} N/mm²（応力集中部を除く）`,
    `基準に対する比 ${s.ratio.toFixed(2)}（${LEVEL_LABELS[levelOf(s.ratio)]}）`,
    `応力集中部の最大 ${s.concentration.toFixed(2)} N/mm²（値は参考）`,
    `最大鉛直変位 ${d.vertical.value.toFixed(2)} mm${d.span && d.spanRatio ? `（スパン ${Math.round(d.span).toLocaleString()} mm の ${formatRatio(d.spanRatio)}）` : ''}`,
  ];
  if (d.driftRatio !== null) lines.push(`最大水平変位 ${d.horizontal.value.toFixed(2)} mm（高さの ${formatRatio(d.driftRatio)}）`);
  lines.push(`反力の合計 鉛直 ${s.reaction.fy.toFixed(1)} kN、水平 ${s.reaction.fx.toFixed(1)} kN`);
  return lines;
}

/** 日本語を幅で折り返す */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxWidth && line) {
      out.push(line);
      line = ch;
    } else line += ch;
  }
  if (line) out.push(line);
  return out;
}

function paragraph(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineH: number): number {
  let cy = y;
  for (const l of wrap(ctx, text, width)) {
    ctx.fillText(l, x, cy);
    cy += lineH;
  }
  return cy;
}

function legend(ctx: CanvasRenderingContext2D, field: FlowField, scale: number, x: number, y: number) {
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = `22px ${SANS}`;
  ctx.fillText(FIELD_LABELS[field], x, y);
  const by = y + 16;
  if (field === 'ratio') {
    let cx = x;
    LEVEL_LABELS.forEach((label, i) => {
      const c = LEVEL_COLORS[i];
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.fillRect(cx, by, 34, 22);
      ctx.fillStyle = INK;
      ctx.font = `20px ${SANS}`;
      ctx.fillText(label, cx + 44, by + 18);
      cx += 54 + ctx.measureText(label).width + 30;
    });
    return;
  }
  const w = 460;
  for (let i = 0; i < w; i++) {
    const c = divergingColor(-1 + (2 * i) / w);
    ctx.fillStyle = `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
    ctx.fillRect(x + i, by, 1.5, 22);
  }
  ctx.fillStyle = INK;
  ctx.font = `20px ${SANS}`;
  ctx.textAlign = 'left';
  ctx.fillText(`−${scale.toFixed(2)}`, x, by + 48);
  ctx.textAlign = 'center';
  ctx.fillText('0', x + w / 2, by + 48);
  ctx.textAlign = 'right';
  ctx.fillText(`＋${scale.toFixed(2)} N/mm²`, x + w, by + 48);
  ctx.textAlign = 'left';
}

export function renderSheet(o: SheetOptions): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SHEET_W;
  canvas.height = SHEET_H;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, SHEET_W, SHEET_H);

  // 見出し
  ctx.fillStyle = INK;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `bold 38px ${SANS}`;
  ctx.fillText('構造フロー 検討シート', MARGIN, MARGIN + 30);
  ctx.font = `24px ${SANS}`;
  ctx.fillStyle = MUTED;
  const title = [o.propertyName, o.plans.map((p) => p.name).join(' ／ ')].filter(Boolean).join('　');
  ctx.fillText(title, MARGIN + 430, MARGIN + 30);
  ctx.textAlign = 'right';
  ctx.fillText(`${o.date.getFullYear()}-${String(o.date.getMonth() + 1).padStart(2, '0')}-${String(o.date.getDate()).padStart(2, '0')}`, SHEET_W - MARGIN, MARGIN + 30);
  ctx.textAlign = 'left';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(MARGIN, MARGIN + 54);
  ctx.lineTo(SHEET_W - MARGIN, MARGIN + 54);
  ctx.stroke();

  // 図
  const figTop = MARGIN + 74;
  const figH = 760;
  const gap = 40;
  const count = o.plans.length;
  const figW = (SHEET_W - MARGIN * 2 - gap * (count - 1)) / count;
  const px = 2.1;
  o.plans.forEach((plan, i) => {
    const x = MARGIN + i * (figW + gap);
    if (count > 1) {
      ctx.fillStyle = INK;
      ctx.font = `bold 26px ${SANS}`;
      ctx.fillText(plan.name, x, figTop + 22);
    }
    const yOff = count > 1 ? 34 : 0;
    const layout = computeLayout(plan.model, figW / px, (figH - yOff) / px);
    ctx.save();
    ctx.translate(x, figTop + yOff + Math.max(0, (figH - yOff - layout.h * px) / 2));
    ctx.scale(px, px);
    ctx.beginPath();
    ctx.rect(0, 0, layout.w, layout.h);
    ctx.clip();
    drawFlow(ctx, { model: plan.model, result: plan.result, view: o.view, layout, scale: o.scale, deform: o.deform });
    ctx.restore();
  });

  // 条件と結果
  let textTop = figTop + figH + 30;
  ctx.textBaseline = 'alphabetic';
  legend(ctx, o.view.field, o.scale, MARGIN, textTop + 18);
  if (o.memo.trim()) {
    ctx.fillStyle = INK;
    ctx.font = `22px ${SANS}`;
    paragraph(ctx, `メモ： ${o.memo.trim()}`, MARGIN + 560, textTop + 18, SHEET_W - MARGIN * 2 - 560, 30);
  }
  textTop += 122;

  const colW = (SHEET_W - MARGIN * 2 - gap * (count - 1)) / count;
  o.plans.forEach((plan, i) => {
    const x = MARGIN + i * (colW + gap);
    let y = textTop;
    ctx.fillStyle = INK;
    ctx.font = `20px ${SANS}`;
    const fontLine = count > 1 ? 26 : 28;
    if (count === 1) {
      // 1 案のときは条件と結果を左右に分ける
      const half = (colW - gap) / 2;
      let ly = y;
      for (const l of conditionLines(plan.model, plan.result)) ly = paragraph(ctx, l, x, ly, half, fontLine);
      let ry = y;
      for (const l of resultLines(plan.result)) ry = paragraph(ctx, l, x + half + gap, ry, half, fontLine);
      return;
    }
    for (const l of [...conditionLines(plan.model, plan.result), ...resultLines(plan.result)]) y = paragraph(ctx, l, x, y, colW, fontLine);
  });

  // 免責（固定）
  const footY = SHEET_H - MARGIN - 62;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN, footY - 30);
  ctx.lineTo(SHEET_W - MARGIN, footY - 30);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = `bold 21px ${SANS}`;
  ctx.fillText(FLOW_DISCLAIMER, MARGIN, footY);
  ctx.font = `20px ${SANS}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(`解析の対象外： ${FLOW_EXCLUSIONS.join('／')}`, MARGIN, footY + 32);
  ctx.textAlign = 'right';
  ctx.fillText('yaneyuka.com', SHEET_W - MARGIN, footY + 32);
  ctx.textAlign = 'left';
  return canvas;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const toPng = (c: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('画像を作れませんでした'))), 'image/png'));

const safeName = (s: string) => s.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40) || '検討';

export async function exportPng(o: SheetOptions): Promise<void> {
  download(await toPng(renderSheet(o)), `構造フロー_${safeName(o.plans.map((p) => p.name).join('_'))}.png`);
}

export async function exportPdf(o: SheetOptions): Promise<void> {
  const blob = await toPng(renderSheet(o));
  const { PDFDocument } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  doc.setTitle('構造フロー 検討シート');
  doc.setProducer('yaneyuka.com');
  const png = await doc.embedPng(await blob.arrayBuffer());
  const page = doc.addPage([841.89, 595.28]);
  page.drawImage(png, { x: 0, y: 0, width: 841.89, height: 595.28 });
  const bytes = await doc.save();
  download(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `構造フロー_${safeName(o.plans.map((p) => p.name).join('_'))}.pdf`);
}
