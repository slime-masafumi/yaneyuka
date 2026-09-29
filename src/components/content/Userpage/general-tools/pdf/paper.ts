/**
 * 用紙サイズの共通定義（PDF圧縮・図面PDF で使う）。
 *
 * PDF の長さの単位は pt（1pt = 1/72inch）。図面の人は mm と「A3 横」で考えるので、
 * 画面に出すときは必ずここを通して mm と用紙名に直す。
 */

export const PT_PER_MM = 72 / 25.4;

export const ptToMm = (pt: number) => pt / PT_PER_MM;
export const mmToPt = (mm: number) => mm * PT_PER_MM;

/** 用紙（mm, 縦置き＝短辺×長辺）。B は JIS。建築の図面・資料で実際に使うものだけ。 */
export const PAPERS_MM: { name: string; w: number; h: number }[] = [
  { name: 'A0', w: 841, h: 1189 },
  { name: 'A1', w: 594, h: 841 },
  { name: 'A2', w: 420, h: 594 },
  { name: 'A3', w: 297, h: 420 },
  { name: 'A4', w: 210, h: 297 },
  { name: 'B2', w: 515, h: 728 },
  { name: 'B3', w: 364, h: 515 },
  { name: 'B4', w: 257, h: 364 },
  { name: 'B5', w: 182, h: 257 },
];

/** 用紙サイズ変換で選べるもの（pt, 縦置き）。図面PDFの「用紙サイズ」の選択肢。 */
export const A_SERIES_PT: Record<string, [number, number]> = {
  A4: [595.28, 841.89],
  A3: [841.89, 1190.55],
  A2: [1190.55, 1683.78],
  A1: [1683.78, 2383.94],
  A0: [2383.94, 3370.39],
};

export type NearestPaper = {
  name: string;
  /** 横 or 縦（見たままの向き） */
  orientation: '横' | '縦';
  /** 用紙との差（mm）。短辺・長辺それぞれ、実寸 − 用紙 */
  dShort: number;
  dLong: number;
  /** 両辺とも 2mm 以内なら「その用紙」と言ってよい */
  exact: boolean;
};

/** 一番近い用紙。幅・高さは見たままの向き（pt）。 */
export function nearestPaper(widthPt: number, heightPt: number): NearestPaper {
  const wMm = ptToMm(widthPt);
  const hMm = ptToMm(heightPt);
  const s = Math.min(wMm, hMm);
  const l = Math.max(wMm, hMm);
  let best = PAPERS_MM[0];
  let bestScore = Infinity;
  for (const p of PAPERS_MM) {
    const score = Math.abs(p.w - s) + Math.abs(p.h - l);
    if (score < bestScore) {
      bestScore = score;
      best = p;
    }
  }
  const dShort = s - best.w;
  const dLong = l - best.h;
  return {
    name: best.name,
    orientation: wMm > hMm ? '横' : '縦',
    dShort,
    dLong,
    exact: Math.abs(dShort) <= 2 && Math.abs(dLong) <= 2,
  };
}

/** 「A3 横」または「A3 横に近い（+3 / −2mm）」 */
export function paperText(widthPt: number, heightPt: number): string {
  const n = nearestPaper(widthPt, heightPt);
  if (n.exact) return `${n.name} ${n.orientation}`;
  const sign = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(0)}`;
  return `${n.name} ${n.orientation}に近い（${sign(n.dShort)} / ${sign(n.dLong)}mm）`;
}

/** A2 以上の大判か。図面かどうかの目安に使う（資料で A2 を超えることはまず無い）。 */
export function isLargeFormat(widthPt: number, heightPt: number): boolean {
  const s = ptToMm(Math.min(widthPt, heightPt));
  const l = ptToMm(Math.max(widthPt, heightPt));
  // 数 mm の誤差（CAD の出力枠）を許す
  return s >= 420 - 10 && l >= 594 - 10;
}
