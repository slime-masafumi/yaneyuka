/**
 * 物件カルテ:用途地域の上に重なる制限(高度地区・地区計画・建築協定・条例)と、日影規制の区域。2026-11-16
 *
 * 条文(2026-11-16 に e-Gov の現行条文で照合):
 *   高度地区 … 建築物の高さは高度地区の都市計画で定めた内容に適合(法 58 条)。
 *              敷地が内外にわたっても過半で決めない(法 91 条の「地区」から高度地区を除く)→ 敷地の部分ごと
 *   北側斜線 … 低層住居系・田園住居 5m + 1.25 × 真北方向の水平距離、中高層住居専用 10m + 1.25 ×(法 56 条 1 項 3 号)。
 *              中高層住居専用地域で日影規制(別表第 4 の二の項)が条例で指定されている区域は除く(同号かっこ書)
 *   絶対高さ … 低層住居系・田園住居は 10m か 12m のうち都市計画で定めた限度(法 55 条 1 項)
 *   地区計画 … 地区整備計画の内容を市町村が条例で建築物の制限にできる(法 68 条の 2・令 136 条の 2 の 5)。
 *              条例にしていない事項は、着手の 30 日前までの届出と市町村長の勧告(都市計画法 58 条の 2)
 *   建築協定 … 土地の所有者等が結ぶ協定(法 69 条)。基準は協定書
 *   日影規制 … 別表第 4(い)欄の地域で条例が指定した区域(対象区域)。(ろ)欄の建築物が、冬至日の 8〜16 時
 *              (道の区域内は 9〜15 時)に、(は)欄の高さの水平面の敷地境界線から 5m を超える範囲に、
 *              (に)欄の時間以上の日影を生じさせない(法 56 条の 2 第 1 項)。
 *              対象区域外の高さ 10m 超の建築物が対象区域内に日影を生じさせる → 対象区域内にあるものとみなす(同条 4 項)。
 *              建築物が日影時間の制限の異なる区域の内外にわたる → 建築物がある各区域内に、
 *              対象区域のうち建築物がある区域の外に日影を生じさせる → 日影を生じさせる各区域内に、
 *              それぞれ建築物があるものとして 1 項を適用(令 135 条の 13)
 */
import type { SitePart } from './site';

/** 高度地区(都市計画で定める)。数値は 0 = 定めなし。斜線型は「立上り + 勾配 × 真北方向の水平距離」、2 段のときは折れ点から先の勾配 */
export type HeightDistrict = {
  /** 名称(例: 第二種高度地区) */
  name: string;
  /** 高さの最高限度(絶対高さ)m */
  max: number;
  /** 高さの最低限度 m */
  min: number;
  /** 斜線の立上り m */
  rise: number;
  /** 斜線の勾配 */
  grad: number;
  /** 折れ点(真北方向の水平距離)m */
  brk: number;
  /** 折れ点から先の勾配 */
  grad2: number;
};

/** 地区計画・建築協定・条例で定める制限。数値は 0 = 定めなし */
export type Overlay = {
  /** 地区計画の名称・協定の名称・条例の名称 */
  name: string;
  /** 自由記述(形態・意匠・垣や柵・駐車場・緑化など) */
  text: string;
  /** 建蔽率の最高限度 % */
  bc: number;
  /** 容積率の最高限度 % */
  far: number;
  /** 高さの最高限度 m */
  hMax: number;
  /** 高さの最低限度 m */
  hMin: number;
  /** 壁面の位置の制限(敷地境界線・道路境界線から外壁・柱までの距離)m */
  wall: number;
  /** 敷地面積の最低限度 m² */
  minSite: number;
  /** 地区計画:用途の制限(自由記述) */
  uses?: string;
  /** 地区計画:地区整備計画の内容を条例で建築物の制限にしている(法 68 条の 2) */
  byLaw?: boolean;
  /** 条例:敷地が道路に接する長さ m(法 43 条 3 項の上乗せ) */
  access?: number;
};

export type OverlayKey = 'dp' | 'agree' | 'ord';
export const OVERLAY_KEYS: OverlayKey[] = ['dp', 'agree', 'ord'];
export const OVERLAY_LABEL: Record<OverlayKey, string> = { dp: '地区計画', agree: '建築協定', ord: '条例の上乗せ' };

/** 物件に入っている重なる制限(入っていないものは返さない) */
export function overlaysOf(p: { dp?: Overlay; agree?: Overlay; ord?: Overlay }): Array<{ key: OverlayKey; label: string; o: Overlay; basis: string }> {
  const out: Array<{ key: OverlayKey; label: string; o: Overlay; basis: string }> = [];
  for (const key of OVERLAY_KEYS) {
    const o = p[key];
    if (!o) continue;
    out.push({ key, label: `${OVERLAY_LABEL[key]}${o.name?.trim() ? ` ${o.name.trim()}` : ''}`, o, basis: basisOf(key, o) });
  }
  return out;
}

function basisOf(key: OverlayKey, o: Overlay): string {
  if (key === 'dp') return o.byLaw ? '法 68 条の 2 の条例' : '届出・勧告の基準。都市計画法 58 条の 2';
  if (key === 'agree') return '法 69 条・協定書';
  return '自治体の条例';
}

/** 定めた数値(0 より大きいもの)のうち最も厳しいもの。lower = 小さい方が厳しい(最高限度) */
export function strictestOf(list: ReturnType<typeof overlaysOf>, k: 'bc' | 'far' | 'hMax' | 'hMin' | 'wall' | 'minSite' | 'access'): { v: number; label: string; basis: string } | null {
  const lower = k === 'bc' || k === 'far' || k === 'hMax';
  let best: { v: number; label: string; basis: string } | null = null;
  for (const x of list) {
    const v = Number(x.o[k]) || 0;
    if (!(v > 0)) continue;
    if (!best || (lower ? v < best.v : v > best.v)) best = { v, label: x.label, basis: x.basis };
  }
  return best;
}

/** 高度地区に何か入っているか */
export const hasHd = (hd?: HeightDistrict) => !!hd && (!!hd.name?.trim() || hd.max > 0 || hd.min > 0 || (hd.rise > 0 && hd.grad > 0));

/** 高度地区の斜線による高さの限度(真北方向の水平距離 L m)。斜線の定めが無ければ null */
export function hdSlant(hd: HeightDistrict, L: number): { lim: number; how: string } | null {
  if (!(hd.rise > 0) || !(hd.grad > 0) || !(L >= 0)) return null;
  if (hd.brk > 0 && hd.grad2 > 0 && L > hd.brk) {
    const lim = hd.rise + hd.grad * hd.brk + hd.grad2 * (L - hd.brk);
    return { lim, how: `${hd.rise} + ${hd.grad} × ${hd.brk} + ${hd.grad2} ×(${r2(L)} − ${hd.brk})= ${r2(lim)} m` };
  }
  const lim = hd.rise + hd.grad * L;
  return { lim, how: `${hd.rise} + ${hd.grad} × ${r2(L)} = ${r2(lim)} m` };
}

/** 1 行の要約(案件の帯・確認書用) */
export function overlaySummary(p: { parts?: SitePart[]; dp?: Overlay; agree?: Overlay; ord?: Overlay }): string[] {
  const out: string[] = [];
  const hds = [...new Set((p.parts ?? []).filter((x) => hasHd(x.hd)).map((x) => x.hd!.name?.trim() || '高度地区'))];
  if (hds.length) out.push(hds.map((n) => (n.includes('高度') ? n : `高度地区 ${n}`)).join(' / '));
  for (const x of overlaysOf(p)) out.push(x.label);
  return out;
}

const r2 = (x: number) => Math.round(x * 100) / 100;

/* ═════════ 日影規制(法 56 条の 2・別表第 4・令 135 条の 13) ═════════ */

/** 別表第 4 の 1 行。key = 「項:号:測定面の高さ」(例 '2:1:4') */
export type ShadeRule = {
  key: string;
  /** 別表第 4 の項。'4i' = 四の項イ、'4ro' = 四の項ロ */
  kou: '1' | '2' | '3' | '4i' | '4ro';
  /** (に)欄の号 1〜3 */
  go: number;
  /** (は)欄 平均地盤面からの高さ m */
  plane: number;
  /** 敷地境界線から 5m を超え 10m 以内 / 10m を超える範囲の日影時間(道の区域内はそれぞれ t5d・t10d) */
  t5: number;
  t10: number;
  t5d: number;
  t10d: number;
};

const KOU_LABEL: Record<ShadeRule['kou'], string> = { '1': '一の項', '2': '二の項', '3': '三の項', '4i': '四の項イ', '4ro': '四の項ロ' };
const GO_LABEL = ['', '(一)', '(二)', '(三)'];
/** (に)欄の時間 [5〜10m, 10m 超, 道の区域内 5〜10m, 道の区域内 10m 超]。一・二・四の項は (一)〜(三)、三の項は (一)(二) */
const HOURS_A: Array<[number, number, number, number]> = [
  [3, 2, 2, 1.5],
  [4, 2.5, 3, 2],
  [5, 3, 4, 2.5],
];
const HOURS_3: Array<[number, number, number, number]> = [
  [4, 2.5, 3, 2],
  [5, 3, 4, 2.5],
];
const PLANES: Record<ShadeRule['kou'], number[]> = { '1': [1.5], '2': [4, 6.5], '3': [4, 6.5], '4i': [1.5], '4ro': [4] };

function rulesOfKou(kou: ShadeRule['kou']): ShadeRule[] {
  const hours = kou === '3' ? HOURS_3 : HOURS_A;
  const out: ShadeRule[] = [];
  for (const plane of PLANES[kou]) {
    hours.forEach(([t5, t10, t5d, t10d], i) => out.push({ key: `${kou}:${i + 1}:${plane}`, kou, go: i + 1, plane, t5, t10, t5d, t10d }));
  }
  return out;
}

const LOW = ['第一種低層住居専用地域', '第二種低層住居専用地域', '田園住居地域'];
const MID = ['第一種中高層住居専用地域', '第二種中高層住居専用地域'];
const KOU3 = ['第一種住居地域', '第二種住居地域', '準住居地域', '近隣商業地域', '準工業地域'];
export const isLowZone = (zone: string) => LOW.includes(zone);
export const isMidZone = (zone: string) => MID.includes(zone);

/** 別表第 4(い)欄で、その用途地域が当たる項 */
function kouOfZone(zone: string): ShadeRule['kou'][] {
  if (LOW.includes(zone)) return ['1'];
  if (MID.includes(zone)) return ['2'];
  if (KOU3.includes(zone)) return ['3'];
  if (zone === '用途地域の指定のない区域') return ['4i', '4ro'];
  return [];
}

/** その用途地域で条例が選べる規制(別表第 4 にない地域は空) */
export const shadeOptions = (zone: string): ShadeRule[] => kouOfZone(zone).flatMap(rulesOfKou);
export const ALL_SHADE_RULES: ShadeRule[] = (['1', '2', '3', '4i', '4ro'] as const).flatMap(rulesOfKou);
export const shadeRule = (key?: string): ShadeRule | null => (key ? ALL_SHADE_RULES.find((r) => r.key === key) ?? null : null);
/** 別表第 4 にある地域か(商業地域・工業地域・工業専用地域は無い) */
export const isShadeZone = (zone: string) => kouOfZone(zone).length > 0;

/** 例「(一) 3 時間 / 2 時間・測定面 1.5m」。withKou で項も付ける */
export function shadeLabel(r: ShadeRule, withKou = false, hokkaido = false): string {
  const [a, b] = hokkaido ? [r.t5d, r.t10d] : [r.t5, r.t10];
  return `${withKou ? `${KOU_LABEL[r.kou]}` : r.kou === '4i' ? 'イ' : r.kou === '4ro' ? 'ロ' : ''}${GO_LABEL[r.go]} ${a} 時間 / ${b} 時間・測定面 ${r.plane}m`;
}

/** (ろ)欄:一の項・四の項イは軒の高さ 7m 超か地階を除く階数 3 以上、それ以外は高さ 10m 超 */
function isSubject(r: ShadeRule, b: ShadeBldg): { yes: boolean | null; why: string } {
  if (r.kou === '1' || r.kou === '4i') {
    if (b.fl >= 3) return { yes: true, why: `地上 ${b.fl} 階(3 以上)` };
    if (b.eave > 7) return { yes: true, why: `軒の高さ ${r2(b.eave)} m(7m 超)` };
    if (b.eave >= 0 || b.H <= 7) return { yes: false, why: `軒の高さ ${r2(b.eave >= 0 ? b.eave : b.H)} m 以下・地上 ${b.fl} 階` };
    return { yes: null, why: '軒の高さが未入力' };
  }
  return b.H > 10 ? { yes: true, why: `高さ ${r2(b.H)} m(10m 超)` } : { yes: false, why: `高さ ${r2(b.H)} m(10m 以下)` };
}

export type ShadeBldg = {
  /** 建築物の高さ m */
  H: number;
  /** 軒の高さ m(未入力は NaN) */
  eave: number;
  /** 地階を除く階数 */
  fl: number;
  /** 道の区域内(北海道) */
  hokkaido: boolean;
};

/** 日影が落ちる区域 1 つ。own = 敷地の部分(その側の敷地境界線の外も同じ区域とみなす)、bldg = 建築物がその部分にある */
export type ShadeRegion = {
  label: string;
  zone: string;
  /** ShadeRule.key、'none' = 条例の指定なし、'' か undefined = 未入力 */
  shade?: string;
  own: boolean;
  bldg: boolean;
  /** その区域に生じる日影の最大時間(5〜10m の範囲 / 10m 超の範囲)。未入力は NaN */
  t5: number;
  t10: number;
};

export type ShadeRow = {
  region: ShadeRegion;
  rule: ShadeRule | null;
  /** out = 対象区域外、unset = 条例の指定が未入力、notsub = 対象建築物でない、nodata = 時間が未入力、unknown = 対象か決まらない */
  status: 'out' | 'unset' | 'notsub' | 'unknown' | 'nodata' | 'ok' | 'ng';
  lim5: number;
  lim10: number;
  why: string;
};

/**
 * 区域ごとの判定(令 135 条の 13)。建築物がある区域にも、日影が落ちる他の区域にも、
 * 「その区域内に建築物があるもの」として、その区域の(ろ)(は)(に)欄を当てる
 */
export function shadeJudge(regions: ShadeRegion[], b: ShadeBldg): { rows: ShadeRow[]; strictest: ShadeRow | null; verdict: 'ok' | 'ng' | 'info'; inTarget: boolean } {
  // 建築物が対象区域内にあるか(建築物がかかる敷地の部分のどれかが、条例で指定された区域)
  const inTarget = regions.some((r) => r.own && r.bldg && !!shadeRule(r.shade) && isShadeZone(r.zone));
  const unsetOwn = regions.some((r) => r.own && r.bldg && isShadeZone(r.zone) && !r.shade);
  const rows: ShadeRow[] = regions.map((region): ShadeRow => {
    const base: Pick<ShadeRow, 'region' | 'rule' | 'lim5' | 'lim10'> = { region, rule: null, lim5: NaN, lim10: NaN };
    if (!isShadeZone(region.zone)) return { ...base, status: 'out', why: `${region.zone}は別表第 4 の地域にない(日影規制なし)` };
    // 対象区域外にある建築物は、高さ 10m 超のときだけ対象区域内にあるものとみなす(法 56 条の 2 第 4 項)
    if (!inTarget && !unsetOwn && !(b.H > 10)) return { ...base, status: 'notsub', why: `建築物が対象区域外にあり高さ ${r2(b.H)} m(10m 以下。法 56 条の 2 第 4 項)` };
    if (!region.shade) {
      // 指定が未入力でも、その地域のどの規制でも(ろ)欄に当たらなければ対象外と言える
      if (shadeOptions(region.zone).every((x) => isSubject(x, b).yes === false)) return { ...base, status: 'notsub', why: `この区域のどの指定でも(ろ)欄に当たらない:${isSubject(shadeOptions(region.zone)[0], b).why}` };
      return { ...base, status: 'unset', why: '条例の指定(規制時間・測定面)が未入力' };
    }
    const rule = shadeRule(region.shade);
    if (!rule) return { ...base, status: 'out', why: '条例で対象区域に指定されていない' };
    if (!shadeOptions(region.zone).some((x) => x.key === rule.key)) return { ...base, rule, status: 'unset', why: `${KOU_LABEL[rule.kou]}の規制は${region.zone}では指定できない。指定を確かめる` };
    const lim5 = b.hokkaido ? rule.t5d : rule.t5;
    const lim10 = b.hokkaido ? rule.t10d : rule.t10;
    const withLim = { ...base, rule, lim5, lim10 };
    const sub = isSubject(rule, b);
    if (sub.yes === false) return { ...withLim, status: 'notsub', why: `この区域にあるものとして(ろ)欄に当たらない:${sub.why}` };
    if (sub.yes === null) return { ...withLim, status: 'unknown', why: sub.why };
    const has5 = region.t5 >= 0;
    const has10 = region.t10 >= 0;
    if (!has5 && !has10) return { ...withLim, status: 'nodata', why: sub.why };
    const ng = (has5 && region.t5 >= lim5) || (has10 && region.t10 >= lim10);
    return { ...withLim, status: ng ? 'ng' : !has5 || !has10 ? 'nodata' : 'ok', why: sub.why };
  });
  // 最も厳しい区域:規制がかかる区域のうち、5〜10m の時間・10m 超の時間が短い順。時間を入れていれば余裕の少ない順
  const live = rows.filter((r) => r.rule && ['ok', 'ng', 'nodata', 'unknown'].includes(r.status));
  const margin = (r: ShadeRow) => Math.min(r.region.t5 >= 0 ? r.lim5 - r.region.t5 : Infinity, r.region.t10 >= 0 ? r.lim10 - r.region.t10 : Infinity);
  const sorted = [...live].sort((a, b2) => {
    const ma = margin(a);
    const mb = margin(b2);
    if (Number.isFinite(ma) || Number.isFinite(mb)) return ma - mb;
    return a.lim5 - b2.lim5 || a.lim10 - b2.lim10 || a.rule!.plane - b2.rule!.plane;
  });
  const strictest = sorted[0] ?? null;
  const verdict = rows.some((r) => r.status === 'ng') ? 'ng' : rows.some((r) => ['unset', 'unknown', 'nodata'].includes(r.status)) ? 'info' : 'ok';
  return { rows, strictest, verdict, inTarget };
}
