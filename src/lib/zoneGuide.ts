/**
 * 用途地域の解説ページ(/lookup/zone/ と /lookup/zone/{id}/)のデータ。2026-11-15
 *
 * 数値はすべて条文の値。e-Gov の現行本文(2026-11-15 取得)と照合した。
 *   地域の目的 … 都市計画法 第 9 条
 *   建てられるもの … 建築基準法 別表第二(src/data/useZoneTable.ts。設計ツール「用途地域」と共用)
 *   容積率 … 法 52 条 1 項・2 項 / 建蔽率 … 法 53 条 1 項・3 項 / 敷地面積の最低限度 … 法 53 条の 2
 *   外壁の後退距離 … 法 54 条 / 絶対高さ … 法 55 条 / 斜線 … 法 56 条・別表第三(src/lib/setback.ts と共用)
 *   日影規制 … 法 56 条の 2・別表第四(src/lib/shadow.ts と共用)
 * 地域ごとの実際の数値(どの選択肢か・日影の号・高度地区など)は自治体の都市計画で決まる。ページでもそう書く。
 */
import { USE_ZONE_TABLE } from '@/data/useZoneTable';
import { ZONES, type ZoneId } from '@/lib/setback';
import { SHADOW_ZONES, type ShadowZone } from '@/lib/shadow';

export type ZoneGuide = {
  /** URL の id(設計ツール「用途地域」のキーと同じ) */
  id: string;
  name: string;
  /** 短い呼び名(一覧の列見出し・関連リンク用) */
  short: string;
  group: '住居系' | '商業系' | '工業系';
  /** 別表第二の項 */
  item: string;
  /** 都市計画法 9 条の文 */
  purpose: string;
  /** 建蔽率の選択肢(%)法 53 条 1 項 */
  bcr: number[];
  /** 容積率の選択肢(%)法 52 条 1 項 */
  far: number[];
  /** 前面道路 12m 未満のときの係数(法 52 条 2 項)。0.4 / 0.6 と、特定行政庁の指定で変わる値 */
  roadCoef: { base: number; designated?: string };
  /** 絶対高さ(m)法 55 条。null = かからない */
  absHeight: number[] | null;
  /** 外壁の後退距離(都市計画で定める場合)法 54 条 */
  wallSetback: boolean;
  setbackId: ZoneId;
  shadowId: string | null;
};

export const ZONE_GUIDES: ZoneGuide[] = [
  {
    id: '1-low-residential', name: '第一種低層住居専用地域', short: '1低', group: '住居系', item: '(い)',
    purpose: '低層住宅に係る良好な住居の環境を保護するため定める地域',
    bcr: [30, 40, 50, 60], far: [50, 60, 80, 100, 150, 200], roadCoef: { base: 0.4 },
    absHeight: [10, 12], wallSetback: true, setbackId: '1lr', shadowId: 'low',
  },
  {
    id: '2-low-residential', name: '第二種低層住居専用地域', short: '2低', group: '住居系', item: '(ろ)',
    purpose: '主として低層住宅に係る良好な住居の環境を保護するため定める地域',
    bcr: [30, 40, 50, 60], far: [50, 60, 80, 100, 150, 200], roadCoef: { base: 0.4 },
    absHeight: [10, 12], wallSetback: true, setbackId: '2lr', shadowId: 'low',
  },
  {
    id: 'rural-residential', name: '田園住居地域', short: '田園', group: '住居系', item: '(ち)',
    purpose: '農業の利便の増進を図りつつ、これと調和した低層住宅に係る良好な住居の環境を保護するため定める地域',
    bcr: [30, 40, 50, 60], far: [50, 60, 80, 100, 150, 200], roadCoef: { base: 0.4 },
    absHeight: [10, 12], wallSetback: true, setbackId: 'den', shadowId: 'low',
  },
  {
    id: '1-mid-high-residential', name: '第一種中高層住居専用地域', short: '1中高', group: '住居系', item: '(は)',
    purpose: '中高層住宅に係る良好な住居の環境を保護するため定める地域',
    bcr: [30, 40, 50, 60], far: [100, 150, 200, 300, 400, 500], roadCoef: { base: 0.4, designated: '0.6' },
    absHeight: null, wallSetback: false, setbackId: '1mh', shadowId: 'mid',
  },
  {
    id: '2-mid-high-residential', name: '第二種中高層住居専用地域', short: '2中高', group: '住居系', item: '(に)',
    purpose: '主として中高層住宅に係る良好な住居の環境を保護するため定める地域',
    bcr: [30, 40, 50, 60], far: [100, 150, 200, 300, 400, 500], roadCoef: { base: 0.4, designated: '0.6' },
    absHeight: null, wallSetback: false, setbackId: '2mh', shadowId: 'mid',
  },
  {
    id: '1-residential', name: '第一種住居地域', short: '1住', group: '住居系', item: '(ほ)',
    purpose: '住居の環境を保護するため定める地域',
    bcr: [50, 60, 80], far: [100, 150, 200, 300, 400, 500], roadCoef: { base: 0.4, designated: '0.6' },
    absHeight: null, wallSetback: false, setbackId: '1r', shadowId: 'res',
  },
  {
    id: '2-residential', name: '第二種住居地域', short: '2住', group: '住居系', item: '(へ)',
    purpose: '主として住居の環境を保護するため定める地域',
    bcr: [50, 60, 80], far: [100, 150, 200, 300, 400, 500], roadCoef: { base: 0.4, designated: '0.6' },
    absHeight: null, wallSetback: false, setbackId: '2r', shadowId: 'res',
  },
  {
    id: 'quasi-residential', name: '準住居地域', short: '準住', group: '住居系', item: '(と)',
    purpose: '道路の沿道としての地域の特性にふさわしい業務の利便の増進を図りつつ、これと調和した住居の環境を保護するため定める地域',
    bcr: [50, 60, 80], far: [100, 150, 200, 300, 400, 500], roadCoef: { base: 0.4, designated: '0.6' },
    absHeight: null, wallSetback: false, setbackId: 'qr', shadowId: 'res',
  },
  {
    id: 'neighborhood-commercial', name: '近隣商業地域', short: '近商', group: '商業系', item: '(り)',
    purpose: '近隣の住宅地の住民に対する日用品の供給を行うことを主たる内容とする商業その他の業務の利便を増進するため定める地域',
    bcr: [60, 80], far: [100, 150, 200, 300, 400, 500], roadCoef: { base: 0.6, designated: '0.4 または 0.8' },
    absHeight: null, wallSetback: false, setbackId: 'nc', shadowId: 'res',
  },
  {
    id: 'commercial', name: '商業地域', short: '商業', group: '商業系', item: '(ぬ)',
    purpose: '主として商業その他の業務の利便を増進するため定める地域',
    bcr: [80], far: [200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300], roadCoef: { base: 0.6, designated: '0.4 または 0.8' },
    absHeight: null, wallSetback: false, setbackId: 'c', shadowId: null,
  },
  {
    id: 'quasi-industrial', name: '準工業地域', short: '準工', group: '工業系', item: '(る)',
    purpose: '主として環境の悪化をもたらすおそれのない工業の利便を増進するため定める地域',
    bcr: [50, 60, 80], far: [100, 150, 200, 300, 400, 500], roadCoef: { base: 0.6, designated: '0.4 または 0.8' },
    absHeight: null, wallSetback: false, setbackId: 'qi', shadowId: 'res',
  },
  {
    id: 'industrial', name: '工業地域', short: '工業', group: '工業系', item: '(を)',
    purpose: '主として工業の利便を増進するため定める地域',
    bcr: [50, 60], far: [100, 150, 200, 300, 400], roadCoef: { base: 0.6, designated: '0.4 または 0.8' },
    absHeight: null, wallSetback: false, setbackId: 'i', shadowId: null,
  },
  {
    id: 'exclusively-industrial', name: '工業専用地域', short: '工専', group: '工業系', item: '(わ)',
    purpose: '工業の利便を増進するため定める地域',
    bcr: [30, 40, 50, 60], far: [100, 150, 200, 300, 400], roadCoef: { base: 0.6, designated: '0.4 または 0.8' },
    absHeight: null, wallSetback: false, setbackId: 'ie', shadowId: null,
  },
];

export const zoneGuide = (id: string) => ZONE_GUIDES.find((z) => z.id === id);
export const zoneUses = (id: string) => USE_ZONE_TABLE[id];
export const zoneSetback = (z: ZoneGuide) => ZONES.find((x) => x.id === z.setbackId)!;
export const zoneShadow = (z: ZoneGuide): ShadowZone | null => (z.shadowId ? SHADOW_ZONES.find((s) => s.id === z.shadowId) ?? null : null);

/** 道路斜線の適用距離の表(別表第三)を、読める行に */
export function roadRows(z: ZoneGuide): { far: string; dist: number }[] {
  const t = zoneSetback(z).road;
  let prev = 0;
  return t.rows.map((r) => {
    const far = r.maxFar === Infinity ? `${prev} 超` : prev ? `${prev} 超 ${r.maxFar} 以下` : `${r.maxFar} 以下`;
    prev = r.maxFar;
    return { far, dist: r.dist };
  });
}

export const pct = (ns: number[]) => ns.map((n) => `${n}%`).join(' / ');
