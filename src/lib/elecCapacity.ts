/**
 * 電気容量計算(設計ツール › 電気設備 › 電気容量計算)。2026-11-14
 *
 *   電灯・コンセントの設備容量(内線規程 3605 節 負荷の想定): P × A + Q × B + C
 *     A = 建物の種類ごとの標準負荷(3605-1 表)、B = 部分的な標準負荷(3605-2 表。住宅には使わない)、C = 加算
 *     ※ 内線規程(JEAC 8001-2022)の原本は有料のため、値は解説資料 2 つで一致を確かめたもの
 *   最大需要電力 = 設備容量 × 需要率(需要率は設計者が決める。下の値は参考)
 *   受電の区分: 契約電力 50kW 未満は低圧、50kW 以上 2,000kW 未満は高圧(6kV)、2,000kW 以上は特別高圧
 *     (東京電力パワーグリッド 託送供給等約款 2024-10-01 実施。地域の約款で確認)
 */

export const STD_LOAD: { id: string; label: string; va: number }[] = [
  { id: 'factory', label: '工場・公会堂・寺院・教会・劇場・映画館など', va: 10 },
  { id: 'hotel', label: '寮・旅館・ホテル・病院・学校・料理店・喫茶店・公衆浴場など', va: 20 },
  { id: 'office', label: '事務所・銀行・商店・理髪店・美容院', va: 30 },
  { id: 'house', label: '住宅・アパート', va: 40 },
];

export const PART_LOAD: { id: string; label: string; va: number }[] = [
  { id: 'corridor', label: '廊下・階段・洗面所・倉庫・貯蔵室', va: 5 },
  { id: 'hall', label: '講堂・観覧席', va: 10 },
];

/** 変圧器の標準容量(kVA)。JIS C 4304(6kV 油入)の並び。2024 年改正版の並びは未確認 */
export const TR_1P = [10, 20, 30, 50, 75, 100, 150, 200, 300, 500];
export const TR_3P = [20, 30, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000];

export const pickTr = (list: number[], kva: number) => (kva > 0 ? list.find((x) => x >= kva) ?? null : 0);

export type CapIn = {
  use: string;
  area: number;
  partArea: number;
  partUse: string;
  dwellings: number;
  perDwelling: number;
  showWindowM: number;
  extraVa: number;
  lightDf: number;
  powerKw: number;
  powerDf: number;
  pf: number;
};

export type CapOut = {
  a: number;
  lightVa: number;
  lightMax: number;
  powerMax: number;
  totalKw: number;
  receive: { label: string; volt: string };
  tr1: number | null;
  tr3: number | null;
  lightKva: number;
  powerKva: number;
};

export function capacity(v: CapIn): CapOut {
  const std = STD_LOAD.find((s) => s.id === v.use) ?? STD_LOAD[2];
  const part = PART_LOAD.find((s) => s.id === v.partUse) ?? PART_LOAD[0];
  const isHouse = std.id === 'house';
  const partArea = isHouse ? 0 : Math.max(0, Math.min(v.partArea, v.area));
  const P = Math.max(0, v.area - partArea);
  const C = (isHouse ? v.dwellings * v.perDwelling : 0) + v.showWindowM * 300 + Math.max(0, v.extraVa);
  const lightVa = P * std.va + partArea * part.va + C;
  const lightMax = (lightVa * v.lightDf) / 1000; // kW(電灯は力率 1 とみなす)
  const powerMax = v.powerKw * v.powerDf; // kW
  const totalKw = lightMax + powerMax;
  const receive =
    totalKw < 50 ? { label: '低圧', volt: '100V / 200V' } : totalKw < 2000 ? { label: '高圧', volt: '6,000V(キュービクルで受電)' } : { label: '特別高圧', volt: '20,000V 以上' };
  const lightKva = lightMax;
  const powerKva = v.pf > 0 ? powerMax / v.pf : powerMax;
  return { a: std.va, lightVa, lightMax, powerMax, totalKw, receive, tr1: pickTr(TR_1P, lightKva), tr3: pickTr(TR_3P, powerKva), lightKva, powerKva };
}
