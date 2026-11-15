/**
 * 物件カルテ:敷地が 2 以上の用途地域・防火指定にわたるときの扱い。2026-11-15
 *
 * 条文(e-Gov 現行版で照合):
 *   用途の制限など … 敷地の過半の属する地域の規定を、建築物・敷地の全部に適用(法 91 条)。
 *                    ただし法 52 条・53 条・54〜56 条の 2・別表第三、防火地域・準防火地域、法 22 条区域、高度地区は除く
 *   容積率 … 各部分の限度(指定容積率と前面道路の幅員による値の小さい方)を面積で加重平均(法 52 条 7 項)
 *   建蔽率 … 各部分の限度を面積で加重平均(法 53 条 2 項)。緩和(3 項)は部分ごと。
 *            敷地が防火地域の内外にわたり建物の全部が耐火建築物等 → 全部を防火地域とみなす(7 項)
 *            敷地が準防火地域と指定なしにわたり建物の全部が耐火・準耐火建築物等 → 全部を準防火地域とみなす(8 項)
 *   防火 … 建築物が防火地域・準防火地域とそれ以外にわたる → 全部に厳しい方の規定。
 *          防火壁で区画した外側の部分は除く(法 65 条)。※ 敷地ではなく建築物で見る
 *   高さ … 絶対高さ・斜線・日影は建築物の部分ごと(法 91 条の対象外)。
 *          道路斜線の適用距離は、前面道路に接する敷地の部分の地域で決める(令 130 条の 11)
 *          日影は、建築物がある各区域の規制を受ける(令 135 条の 13)
 */
import type { Project } from './masters';

export type SitePart = {
  zone: string;
  fire: string;
  /** その部分の敷地面積 m² */
  area: number;
  /** 指定建蔽率 %(都市計画)。0 = 未入力 */
  bc: number;
  /** 指定容積率 %(都市計画)。0 = 未入力 */
  far: number;
  /** 建築物がこの部分にかかるか(防火の判定は建築物で見る) */
  bldg: boolean;
};

const RESIDENTIAL = [
  '第一種低層住居専用地域',
  '第二種低層住居専用地域',
  '田園住居地域',
  '第一種中高層住居専用地域',
  '第二種中高層住居専用地域',
  '第一種住居地域',
  '第二種住居地域',
  '準住居地域',
];
/** 法 52 条 2 項の係数 0.4 の地域(特定行政庁の指定は別) */
export const isResidentialZone = (zone: string) => RESIDENTIAL.includes(zone);
export const isIndustrialZone = (zone: string) => ['準工業地域', '工業地域', '工業専用地域'].includes(zone);
export const roadCoefOf = (zone: string) => (isResidentialZone(zone) ? 0.4 : 0.6);

/** 防火の厳しさ(大きいほど厳しい) */
const FIRE_RANK: Record<string, number> = { 指定なし: 0, 法22条区域: 1, 準防火地域: 2, 防火地域: 3 };

/** 物件の敷地の部分。古いデータ(parts が無い)は、用途地域・防火指定 1 つずつの 1 区画として扱う */
export function partsOf(p: Project): SitePart[] {
  if (p.parts && p.parts.length) return p.parts;
  return [{ zone: p.zone, fire: p.fire, area: 0, bc: 0, far: 0, bldg: true }];
}

export const siteAreaOf = (parts: SitePart[]) => parts.reduce((s, x) => s + (x.area > 0 ? x.area : 0), 0);

/** 用途地域ごとの面積の合計 */
function areaByZone(parts: SitePart[]) {
  const m = new Map<string, number>();
  for (const x of parts) m.set(x.zone, (m.get(x.zone) ?? 0) + (x.area > 0 ? x.area : 0));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * 用途の制限に使う地域(法 91 条:敷地の過半の属する地域)。
 * majority = 過半(50% 超)があるか。無いとき(3 地域で拮抗など)は最も広い地域を仮に返し、要確認とする
 */
export function majorityZone(parts: SitePart[]): { zone: string; share: number; majority: boolean; multi: boolean } {
  const list = areaByZone(parts);
  const total = siteAreaOf(parts);
  const [zone, a] = list[0] ?? [parts[0]?.zone ?? '', 0];
  const share = total > 0 ? a / total : 1;
  return { zone, share, majority: list.length <= 1 || share > 0.5, multi: list.length > 1 };
}

/**
 * 建築物に適用する防火の規定(法 65 条)。建築物がかかる部分のうち最も厳しいもの。
 * spans = 建築物が異なる指定にわたるか(防火壁で区画すれば、その外側は緩い方でよい)
 */
export function effectiveFire(parts: SitePart[]): { fire: string; spans: boolean; lower: string | null } {
  const on = parts.filter((x) => x.bldg);
  const list = (on.length ? on : parts).map((x) => x.fire);
  const uniq = [...new Set(list)].sort((a, b) => (FIRE_RANK[b] ?? 0) - (FIRE_RANK[a] ?? 0));
  const fire = uniq[0] ?? '指定なし';
  const spans = uniq.filter((f) => (FIRE_RANK[f] ?? 0) >= 2).length > 0 && uniq.length > 1;
  return { fire, spans, lower: spans ? uniq[1] : null };
}

export type FireRating = 'none' | 'taika' | 'juntaika';

/** 部分ごとの建蔽率・容積率の限度と、面積による加重平均(法 52 条 7 項・53 条 2 項) */
export function weightedLimits(
  parts: SitePart[],
  opt: { road: number; fr: FireRating; corner: boolean },
): {
  rows: { part: SitePart; bcLimit: number; bcNote: string; farLimit: number; farNote: string }[];
  site: number;
  bc: number;
  far: number;
  deemed: string | null;
} {
  const site = siteAreaOf(parts);
  const fires = new Set(parts.map((x) => x.fire));
  // 53 条 7 項・8 項:敷地が防火の内外にわたるときのみなし
  let deemed: string | null = null;
  if (fires.has('防火地域') && fires.size > 1 && opt.fr === 'taika') deemed = '防火地域';
  else if (fires.has('準防火地域') && !fires.has('防火地域') && fires.size > 1 && (opt.fr === 'taika' || opt.fr === 'juntaika')) deemed = '準防火地域';

  const rows = parts.map((part) => {
    const fire = deemed ?? part.fire;
    let bcLimit = part.bc;
    const notes: string[] = [];
    if (part.bc > 0) {
      let up = opt.corner ? 10 : 0;
      if (opt.corner) notes.push('角地 +10');
      if (fire === '防火地域' && opt.fr === 'taika') {
        if (part.bc >= 80) {
          bcLimit = 100;
          notes.push('指定 80% の防火地域内の耐火建築物等は制限なし');
          up = 0;
        } else {
          up += 10;
          notes.push('防火地域の耐火建築物等 +10');
        }
      } else if (fire === '準防火地域' && (opt.fr === 'taika' || opt.fr === 'juntaika')) {
        up += 10;
        notes.push('準防火地域の耐火・準耐火建築物等 +10');
      }
      if (bcLimit < 100) bcLimit = Math.min(100, part.bc + up);
    }
    const k = roadCoefOf(part.zone);
    const byRoad = opt.road > 0 && opt.road < 12 ? opt.road * k * 100 : Infinity;
    const farLimit = part.far > 0 ? Math.min(part.far, byRoad) : 0;
    const farNote = part.far > 0 ? (Number.isFinite(byRoad) && byRoad < part.far ? `道路 ${opt.road}m × ${k} = ${Math.round(byRoad * 10) / 10}` : `指定 ${part.far}`) : '';
    return { part, bcLimit, bcNote: notes.join(' · '), farLimit, farNote };
  });
  const w = (f: (r: (typeof rows)[number]) => number) => (site > 0 ? rows.reduce((s, r) => s + f(r) * (r.part.area > 0 ? r.part.area : 0), 0) / site : NaN);
  return { rows, site, bc: w((r) => r.bcLimit), far: w((r) => r.farLimit), deemed };
}

/** 高さの制限で、部分ごとに見るものの注記(画面に出す) */
export function heightNotes(parts: SitePart[]): string[] {
  const zones = new Set(parts.map((x) => x.zone));
  if (zones.size < 2) return [];
  const out = [
    '絶対高さ・道路斜線・隣地斜線・北側斜線は、建築物の部分ごとに、その部分がある地域の規定で見ます(法 91 条の対象外)。',
    '道路斜線の適用距離は、前面道路に接する敷地の部分が属する地域で決めます(令 130 条の 11)。',
  ];
  const low = ['第一種低層住居専用地域', '第二種低層住居専用地域', '田園住居地域'];
  if ([...zones].some((z) => low.includes(z))) out.push('低層住居系の部分には絶対高さ(10m / 12m)と外壁の後退距離がかかります(法 54 条・55 条)。');
  out.push('日影規制は、建築物がある各区域の規制時間で、それぞれの区域にあるものとして判定します(令 135 条の 13)。');
  return out;
}

/** 1 行の要約(案件の帯・確認書用)。「商業地域・防火地域 120m² / 第一種住居地域・準防火地域 80m²」 */
export function partsSummary(p: Project): { zone: string; fire: string } {
  const parts = partsOf(p);
  if (parts.length < 2) return { zone: p.zone, fire: p.fire };
  const zone = parts.map((x) => `${x.zone}${x.area > 0 ? ` ${Math.round(x.area * 100) / 100}m²` : ''}`).join(' / ');
  const fire = [...new Set(parts.map((x) => x.fire))].join(' / ');
  return { zone: `${zone}(用途は${p.zone})`, fire: fire === p.fire ? p.fire : `${fire}(建物は${p.fire})` };
}
