/**
 * 幹線サイズ(設計ツール › 電気設備 › 幹線サイズ)。2026-11-14
 *
 * 設計電流を許容電流で満たし、電圧降下を許容値に収める最小の太さを選ぶ。
 *   許容電流
 *     IV(600V ビニル絶縁電線): 電気設備の技術基準の解釈 第 146 条 146-1 表(周囲 30℃の基準値)
 *       × 146-4 表の電流減少係数(同一管内の電線数)× 146-3 表の温度補正 √((60−θ)/30)(θ ≦ 30℃ は 30)
 *     CVT(600V 架橋ポリエチレン トリプレックス): JCS 0168-2(周囲 40℃・導体 90℃・1 条布設)。
 *       SWCC・矢崎の技術資料で値を照合。40℃以外は √((90−θ)/50)
 *   電圧降下(略算): e = K × L × I ÷(1000 × A)。K = 単相 2 線 35.6 / 三相 3 線 30.8 / 単相 3 線・三相 4 線 17.8
 */

export type Sys = '1p2w' | '1p3w' | '3p3w';

export const SYSTEMS: Record<Sys, { label: string; volt: number; k: number; hint: string }> = {
  '1p2w': { label: '単相 2 線式 100V', volt: 100, k: 35.6, hint: 'I = P ÷ V' },
  '1p3w': { label: '単相 3 線式 100/200V', volt: 200, k: 17.8, hint: 'I = P ÷ 200(平衡として)。降下は電線 1 本と中性線の間(100V 基準)' },
  '3p3w': { label: '三相 3 線式 200V', volt: 200, k: 30.8, hint: 'I = P ÷(√3 × V)' },
};

export type Cable = 'iv' | 'cvt-air' | 'cvt-conduit';

export const CABLES: Record<Cable, { label: string; note: string }> = {
  iv: { label: 'IV(管内に収める)', note: '解釈 第 146 条 146-1 表 × 146-4 表(電線数)× 温度補正' },
  'cvt-air': { label: 'CVT(気中・暗きょ)', note: 'JCS 0168-2・周囲 40℃・1 条布設' },
  'cvt-conduit': { label: 'CVT(気中・暗きょ内の電線管 1 条)', note: 'JCS 0168-2・周囲 40℃(SWCC 技術資料)' },
};

/** 太さ。area = 断面積 mm²(単線は直径から) */
type Size = { label: string; area: number; iv?: number; cvtAir?: number; cvtConduit?: number };

export const SIZES: Size[] = [
  { label: '1.6mm', area: 2.01, iv: 27 },
  { label: '2.0mm', area: 3.14, iv: 35 },
  { label: '2.6mm', area: 5.31, iv: 48 },
  { label: '3.2mm', area: 8.04, iv: 62 },
  { label: '5.5mm²', area: 5.5, iv: 49 },
  { label: '8mm²', area: 8, iv: 61, cvtAir: 62, cvtConduit: 45 },
  { label: '14mm²', area: 14, iv: 88, cvtAir: 86, cvtConduit: 63 },
  { label: '22mm²', area: 22, iv: 115, cvtAir: 110, cvtConduit: 82 },
  { label: '30mm²', area: 30, iv: 139 },
  { label: '38mm²', area: 38, iv: 162, cvtAir: 155, cvtConduit: 110 },
  { label: '50mm²', area: 50, iv: 190 },
  { label: '60mm²', area: 60, iv: 217, cvtAir: 210, cvtConduit: 150 },
  { label: '80mm²', area: 80, iv: 257 },
  { label: '100mm²', area: 100, iv: 298, cvtAir: 290, cvtConduit: 215 },
  { label: '150mm²', area: 150, iv: 395, cvtAir: 380, cvtConduit: 275 },
  { label: '200mm²', area: 200, iv: 469, cvtAir: 465, cvtConduit: 340 },
  { label: '250mm²', area: 250, iv: 556, cvtAir: 535, cvtConduit: 395 },
  { label: '325mm²', area: 325, iv: 650, cvtAir: 635, cvtConduit: 475 },
];

/** 146-4 表 同一管内の電線数 → 電流減少係数 */
export function ivFactor(wires: number): number {
  if (wires <= 3) return 0.7;
  if (wires === 4) return 0.63;
  if (wires <= 6) return 0.56;
  if (wires <= 15) return 0.49;
  if (wires <= 40) return 0.43;
  if (wires <= 60) return 0.39;
  return 0.34;
}

/** 146-3 表(ビニル)√((60−θ)/30)。θ ≦ 30℃ は 30 として 1.0 */
export const ivTemp = (t: number) => Math.sqrt(Math.max(0, 60 - Math.max(t, 30)) / 30);
/** CVT(導体 90℃)の周囲温度補正。基準 40℃ */
export const cvtTemp = (t: number) => Math.sqrt(Math.max(0, 90 - t) / 50);

export function ampacity(s: Size, cable: Cable, wires: number, temp: number): number | null {
  if (cable === 'iv') return s.iv ? Math.floor(s.iv * ivFactor(wires) * ivTemp(temp)) : null;
  const base = cable === 'cvt-air' ? s.cvtAir : s.cvtConduit;
  return base ? Math.floor(base * cvtTemp(temp)) : null;
}

export type TrunkIn = { sys: Sys; kva: number; amp: number; len: number; drop: number; cable: Cable; wires: number; temp: number };

export type Row = { size: Size; amp: number; e: number; pct: number; okAmp: boolean; okDrop: boolean };

export function designCurrent(v: TrunkIn): number {
  if (v.amp > 0) return v.amp;
  const s = SYSTEMS[v.sys];
  if (!(v.kva > 0)) return NaN;
  return v.sys === '3p3w' ? (v.kva * 1000) / (Math.sqrt(3) * s.volt) : (v.kva * 1000) / s.volt;
}

export function trunk(v: TrunkIn): { I: number; rows: Row[]; pick: Row | null; base: number } {
  const I = designCurrent(v);
  const s = SYSTEMS[v.sys];
  // 単相 3 線式の降下率は対地電圧 100V に対して見る
  const base = v.sys === '1p3w' ? 100 : s.volt;
  const rows: Row[] = [];
  for (const size of SIZES) {
    const amp = ampacity(size, v.cable, v.wires, v.temp);
    if (amp === null) continue;
    const e = (s.k * v.len * I) / (1000 * size.area);
    const pct = (e / base) * 100;
    rows.push({ size, amp, e, pct, okAmp: amp >= I, okDrop: !(v.drop > 0) || pct <= v.drop + 1e-9 });
  }
  const pick = Number.isFinite(I) ? rows.find((r) => r.okAmp && r.okDrop) ?? null : null;
  return { I, rows, pick, base };
}
