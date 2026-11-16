/**
 * 用紙サイズを変えたときの縮尺(図面PDF だけが使う)。2026-11-16
 *
 * A1 1/100 の図面を A3 に縮めると 1/200。ここまでは誰でも分かるが、
 * A2 → A3 は 1/√2 で 1/141.4 になる。これを「1/150」と丸めて書くと、
 * スケールを当てた人が寸法を 6% 読み違える。きれいな比(1/2・1/4・2 倍など)に
 * ならないときは数字の縮尺を書かず、「A3 縮小(A2 1/100)」と元の縮尺を書く。
 * 現場で実際に使われている書き方。
 */

import { PAPERS_MM } from './paper';

/** 縮尺がきれいに言える比。これから 1.5% 以内なら、その比とみなす */
const CLEAN_RATIOS = [0.25, 0.5, 1, 2, 4];
const TOLERANCE = 0.015;

/** 「1/100」「1:100」「100」→ 100。読めなければ null */
export function parseScaleDenom(input: string): number | null {
  const s = input.normalize('NFKC').replace(/\s+/g, '');
  if (!s) return null;
  const m = s.match(/^(?:1[/:])?(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** 用紙の短辺・長辺(mm)。知らない名前は null */
export function paperMm(name: string): { s: number; l: number } | null {
  const p = PAPERS_MM.find((x) => x.name === name);
  return p ? { s: p.w, l: p.h } : null;
}

/**
 * 元の用紙から別の用紙へ、比率を保って収めたときの倍率。
 * 図面PDFの変換と同じく、短辺・長辺の小さいほうの比で収める。
 */
export function paperRatio(from: string, to: string): number | null {
  const a = paperMm(from);
  const b = paperMm(to);
  if (!a || !b) return null;
  return Math.min(b.s / a.s, b.l / a.l);
}

/**
 * ページ(w × h, pt)を用紙(縦置きの tw × th, pt)へ比率を保って収める倍率。
 * 横長のページには用紙も横で当てる。図面PDFの書き出しと画面の予告で同じ式を使う。
 */
export function fitScale(w: number, h: number, tw: number, th: number): { scale: number; fitW: number; fitH: number } {
  const [fitW, fitH] = w > h ? [th, tw] : [tw, th];
  return { scale: Math.min(fitW / w, fitH / h), fitW, fitH };
}

const fmt = (n: number) => (Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1));

export type ConvertedScale = {
  /** きれいな比で言えるか */
  clean: boolean;
  /** 実際の倍率(変換後 / 変換前) */
  ratio: number;
  /** 実際の縮尺の分母(丸める前) */
  exactDenom: number;
  /** 図面に入れる表記。例「A3 1/200」「A3 縮小(A2 1/100)」 */
  label: string;
  /** 画面に出す説明。例「縮尺は約 1/141。表記は「A3 縮小(A2 1/100)」」 */
  note: string;
};

/**
 * 変換後の縮尺。
 * @param origPaper 元の用紙(A1 など)
 * @param origDenom 元の縮尺の分母(1/100 → 100)
 * @param targetPaper 変換後の用紙
 * @param ratio 実際に掛けた倍率(変換後 / 変換前)
 */
export function convertedScale(origPaper: string, origDenom: number, targetPaper: string, ratio: number): ConvertedScale {
  const exactDenom = origDenom / ratio;
  const orig = `${origPaper} 1/${fmt(origDenom)}`;
  const hit = CLEAN_RATIOS.find((c) => Math.abs(ratio / c - 1) <= TOLERANCE);
  if (hit !== undefined) {
    const d = origDenom / hit;
    const label = `${targetPaper} 1/${fmt(d)}`;
    const how = hit < 1 ? `1/${fmt(1 / hit)} に縮小` : hit > 1 ? `${fmt(hit)} 倍に拡大` : '同じ大きさ';
    return { clean: true, ratio, exactDenom, label, note: `${orig} → ${how}。縮尺は 1/${fmt(d)}。表記は「${label}」` };
  }
  const label = `${targetPaper} ${ratio < 1 ? '縮小' : '拡大'}（${orig}）`;
  return {
    clean: false,
    ratio,
    exactDenom,
    label,
    note: `縮尺は約 1/${Math.round(exactDenom)}（きれいな縮尺にならないため数字は書きません）。表記は「${label}」`,
  };
}
