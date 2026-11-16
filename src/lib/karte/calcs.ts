/**
 * 物件カルテ:項目の中でその場で済ませる簡単な判定。2026-11-14
 *
 * 1 項目 = 入力欄の並び(fields)+ 判定(run)。入力は文字列のまま項目の記録(ItemRec.vals)に残す。
 * 物件の条件(用途地域・防火地域・高さなど)から決まる値は初期値として入れる。
 * 判定は法令の「一般的な場合」だけを見る。特定行政庁の指定・条例・告示の緩和は判定の外で、
 * 画面の注記(note)に書く。
 */
import { ZONES, type Project } from './masters';
import { ALL_SHADE_RULES, hasHd, hdSlant, isLowZone, isMidZone, isShadeZone, overlaysOf, shadeJudge, shadeLabel, shadeRule, strictestOf, type ShadeRegion } from './overlay';
import { isIndustrialZone, isResidentialZone, partsOf, siteAreaOf, weightedLimits, type FireRating, type SitePart } from './site';

export type Field =
  | { k: string; label: string; kind: 'num'; unit?: string; step?: number; def?: (p: Project) => string; hint?: string }
  | { k: string; label: string; kind: 'sel'; options: Array<[string, string]>; def?: (p: Project) => string; hint?: string }
  | { k: string; label: string; kind: 'bool'; def?: (p: Project) => string; hint?: string };

export type Verdict = 'ok' | 'ng' | 'info';
export type CalcLine = { k: string; v: string; ng?: boolean };
export type CalcOut = { verdict: Verdict; summary: string; lines: CalcLine[] };

export type CalcSpec = {
  title: string;
  fields: Field[];
  /** 物件(敷地の部分の数など)や入力で増える欄。2026-11-16 */
  more?: (p: Project, v: Vals) => Field[];
  run: (v: Vals, p: Project) => CalcOut | null;
  note?: string;
};

/** 項目の入力欄の全部(固定の欄 + 物件や入力で増える欄) */
export const fieldsOf = (spec: CalcSpec, p: Project, v: Vals = {}): Field[] => (spec.more ? [...spec.fields, ...spec.more(p, v)] : spec.fields);

export type Vals = Record<string, string>;

const n = (v: Vals, k: string) => {
  const x = parseFloat(v[k] ?? '');
  return Number.isFinite(x) ? x : NaN;
};
const on = (v: Vals, k: string) => v[k] === '1';
const f1 = (x: number) => (Number.isFinite(x) ? (Math.round(x * 10) / 10).toLocaleString('ja-JP') : '—');
const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : '—');
const left = (x: number) => (x < 0 ? `${f1(-x)} m² 超過` : `${f1(x)} m²`);
const pct = (x: number) => `${f1(x * 100)} %`;

/** 住居系の用途地域(法 52 条 2 項の 0.4、令 20 条の 6・1.4 の側)。田園住居地域を含む(2026-11-15 まで ZONES の並び順で判定していた) */
const isResidential = isResidentialZone;
const isIndustrial = isIndustrialZone;

/** 初期値:物件の条件から引ける値だけ */
export function defaults(spec: CalcSpec, p: Project): Vals {
  const out: Vals = {};
  for (const f of fieldsOf(spec, p)) if (f.def) out[f.k] = f.def(p);
  return out;
}

/**
 * 容積率に使う前面道路の幅員(法 52 条 2 項・9 項)。
 * 特定道路(幅員 15m 以上)に接続する幅員 6m 以上 12m 未満の前面道路で、特定道路からの延長 L が 70m 以内なら
 * Wa =(12 − Wr)(70 − L)/ 70 を加える(令 135 条の 18)
 */
function roadOf(v: Vals): { w: number; blank: boolean; note: string } {
  const wr = n(v, 'road');
  if (!(wr > 0)) return { w: 0, blank: true, note: '' };
  const L = n(v, 'tok');
  if (wr >= 6 && wr < 12 && L >= 0 && L <= 70) {
    const wa = ((12 - wr) * (70 - L)) / 70;
    return { w: wr + wa, blank: false, note: `特定道路の緩和 Wa =(12−${wr})(70−${L})/70 = ${f2(wa)} m(法 52 条 9 項・令 135 条の 18)` };
  }
  return { w: wr, blank: false, note: '' };
}
const r2 = (x: number) => Math.round(x * 100) / 100;

/* ───────── 建蔽率・容積率(法 52 条・53 条) ───────── */
const coverage: CalcSpec = {
  title: '建蔽率・容積率の判定',
  fields: [
    {
      k: 'site',
      label: '敷地面積',
      kind: 'num',
      unit: 'm²',
      step: 0.01,
      def: (p) => { const a = partsOf(p).reduce((s, x) => s + (x.area > 0 ? x.area : 0), 0); return a > 0 ? String(a) : ''; },
      hint: '水平投影面積。2 項道路の後退部分は下の欄で引く(令 2 条 1 項 1 号)',
    },
    { k: 'setback', label: '2 項道路の後退部分の面積(敷地面積から除く)', kind: 'num', unit: 'm²', step: 0.01, hint: '道路の中心線から 2m(特定行政庁が指定した区域は 3m)の線と道との間(法 42 条 2 項)' },
    { k: 'bldg', label: '建築面積', kind: 'num', unit: 'm²', step: 0.01, hint: '外壁・柱の中心線で囲む。軒・庇は先端から 1m 後退した線まで算入(令 2 条 1 項 2 号)' },
    { k: 'floor', label: '容積対象の延べ面積', kind: 'num', unit: 'm²', step: 0.01, def: (p) => (p.area ? String(p.area) : ''), hint: '初期値は物件の延べ面積。車庫(1/5 まで)・備蓄倉庫・住宅の地階(1/3 まで)・共同住宅の共用廊下などの不算入分を除く' },
    { k: 'bc', label: '指定建蔽率', kind: 'num', unit: '%', step: 10, def: (p) => { const x = partsOf(p); return x.length === 1 && x[0].bc > 0 ? String(x[0].bc) : ''; }, hint: '敷地が 2 以上の地域にわたるときは、物件条件の地域ごとの値を使う' },
    { k: 'far', label: '指定容積率', kind: 'num', unit: '%', step: 10, def: (p) => { const x = partsOf(p); return x.length === 1 && x[0].far > 0 ? String(x[0].far) : ''; } },
    { k: 'road', label: '前面道路の幅員(2 以上あるときは最大のもの)', kind: 'num', unit: 'm', step: 0.1, def: (p) => (p.road && p.road > 0 ? String(p.road) : ''), hint: '2 項道路は後退後の 4m(指定区域は 6m)。12m 以上なら道路による低減なし' },
    { k: 'tok', label: '特定道路(幅員 15m 以上)からの延長 L', kind: 'num', unit: 'm', step: 1, hint: '前面道路が 6m 以上 12m 未満で特定道路に接続し、敷地が特定道路から 70m 以内で接するときだけ入れる' },
    {
      k: 'coef',
      label: '前面道路の係数(特定行政庁が指定した区域だけ)',
      kind: 'sel',
      options: [
        ['0.4', '0.4'],
        ['0.6', '0.6'],
        ['0.8', '0.8'],
      ],
      hint: '空欄なら法の原則(住居系 0.4・その他 0.6)。敷地が 2 以上の地域にわたるときは使わない',
    },
    { k: 'corner', label: '角地の緩和(特定行政庁の指定)', kind: 'bool' },
    {
      k: 'fr',
      label: '建物の防火性能',
      kind: 'sel',
      options: [
        ['none', 'その他'],
        ['taika', '耐火建築物等'],
        ['juntaika', '準耐火建築物等'],
      ],
    },
  ],
  note:
    '前面道路が 12m 未満のときは、幅員 × 0.4(住居系)/ 0.6(その他)と指定容積率の小さい方(法 52 条 2 項)。特定道路の緩和(同 9 項)と特定行政庁が指定した係数は欄で入れます。物件条件に入れた地区計画・建築協定・条例の建蔽率と容積率の最高限度は法による上限と比べて厳しい方で、敷地面積の最低限度は敷地面積と比べて判定します(条例の緩和、既存の敷地の適用除外(法 68 条の 2 第 3 項)、再開発等促進区・誘導容積・容積の配分などの地区計画の特例(法 68 条の 3〜68 条の 5 の 2 ほか)は判定の外)。高度利用地区・総合設計・住宅の容積緩和(同 8 項)などは判定の外です。敷地が 2 以上の用途地域・防火指定にわたるときは、物件条件の「敷地の地域」に部分ごとの面積(2 項道路の後退部分を除く)と指定値を入れると、部分ごとの限度(緩和を含む)を面積で加重平均します(法 52 条 7 項・53 条 2 項・7 項・8 項)。',
  run(v, p) {
    // 敷地が 2 以上の地域にわたる(物件条件に面積と指定建蔽率を入れた部分が 2 つ以上)→ 面積で加重平均
    const multi = partsOf(p).filter((x) => x.area > 0 && x.bc > 0);
    if (multi.length >= 2) return coverageMulti(v, multi, p);
    const gross = n(v, 'site');
    const setback = n(v, 'setback');
    const site = gross - (setback > 0 ? setback : 0);
    const bldg = n(v, 'bldg');
    const floor = n(v, 'floor');
    const bc = n(v, 'bc');
    const far = n(v, 'far');
    // 建蔽率か容積率のどちらか一方だけでも判定する(2026-11-16 まで建蔽率の値が無いと何も出さなかった)
    const doBc = bc > 0 && bldg >= 0;
    const doFar = far > 0 && floor >= 0;
    if (!(site > 0) || (!doBc && !doFar)) return null;
    const lines: CalcLine[] = [];
    if (setback > 0) lines.push({ k: '敷地面積', v: `${f1(site)} m²(${f1(gross)} − 後退部分 ${f1(setback)})` });

    // 建蔽率の緩和(法 53 条 3 項・6 項)
    let bcMax = bc;
    const fr = v.fr || 'none';
    let up = 0;
    const reasons: string[] = [];
    if (on(v, 'corner')) {
      up += 10;
      reasons.push('角地 +10');
    }
    let unlimited = false;
    if (p.fire === '防火地域' && fr === 'taika') {
      if (bc >= 80) unlimited = true;
      else {
        up += 10;
        reasons.push('防火地域の耐火建築物等 +10');
      }
    } else if (p.fire === '準防火地域' && (fr === 'taika' || fr === 'juntaika')) {
      up += 10;
      reasons.push('準防火地域の耐火・準耐火建築物等 +10');
    }
    bcMax = unlimited ? 100 : Math.min(100, bc + up);
    // 地区計画・建築協定・条例の最高限度(定めがあるときだけ行を足す。無い物件は今までと同じ行)
    const ovs = overlaysOf(p);
    const capBc = strictestOf(ovs, 'bc');
    const capFar = strictestOf(ovs, 'far');
    let bcNg = false;
    if (doBc) {
      const bcNow = (bldg / site) * 100;
      const lawText = unlimited ? '制限なし(指定 80% の防火地域内の耐火建築物等)' : `${f1(bcMax)} %${reasons.length ? `(指定 ${bc} / ${reasons.join(' · ')})` : ''}`;
      if (capBc) lines.push({ k: `${capBc.label}の建蔽率`, v: `最高限度 ${f1(capBc.v)} %(${capBc.basis})` });
      const capped = !!capBc && capBc.v < bcMax;
      if (capped) {
        bcMax = capBc.v;
        unlimited = false;
      }
      bcNg = bcNow > bcMax + 1e-9;
      lines.push({ k: '建蔽率', v: `${f1(bcNow)} %(建築面積 ${f1(bldg)} ÷ 敷地 ${f1(site)})` });
      lines.push({
        k: '建蔽率の上限',
        v: capped ? `${f1(bcMax)} %(${capBc!.label}の最高限度。法 53 条による上限は ${lawText})` : lawText,
        ng: bcNg,
      });
    }

    let farNg = false;
    let roadBlank = false;
    if (doFar) {
      const rd = roadOf(v);
      roadBlank = rd.blank;
      // 係数:法の原則か、特定行政庁が指定した区域の値(用途地域ごとに選べる値が決まっている。法 52 条 2 項)
      const base = isResidential(p.zone) ? 0.4 : 0.6;
      const low = ['第一種低層住居専用地域', '第二種低層住居専用地域', '田園住居地域'].includes(p.zone);
      const allowed = low ? [0.4] : isResidential(p.zone) ? [0.4, 0.6] : [0.4, 0.6, 0.8];
      const pick = parseFloat(v.coef ?? '');
      const k = Number.isFinite(pick) && allowed.includes(pick) ? pick : base;
      if (Number.isFinite(pick) && !allowed.includes(pick)) lines.push({ k: '前面道路の係数', v: `${p.zone}では ${pick} は選べません(法 52 条 2 項)。${base} で計算`, ng: true });
      const byRoad = rd.w > 0 && rd.w < 12 ? rd.w * k * 100 : Infinity;
      let farMax = Math.min(far, byRoad);
      const farNow = (floor / site) * 100;
      if (rd.note) lines.push({ k: '前面道路の幅員', v: `${f2(rd.w)} m(${rd.note})` });
      const lawText = rd.blank
        ? `${f1(far)} %(指定 ${far}。前面道路の幅員が未入力のため、道路による低減を見ていません)`
        : `${f1(farMax)} %${Number.isFinite(byRoad) ? `(指定 ${far} と 道路 ${r2(rd.w)}m × ${k} = ${f1(byRoad)} の小さい方)` : `(指定 ${far}。前面道路 12m 以上)`}`;
      if (capFar) lines.push({ k: `${capFar.label}の容積率`, v: `最高限度 ${f1(capFar.v)} %(${capFar.basis})` });
      const capped = !!capFar && capFar.v < farMax;
      if (capped) farMax = capFar.v;
      farNg = farNow > farMax + 1e-9;
      lines.push({ k: '容積率', v: `${f1(farNow)} %(延べ ${f1(floor)} ÷ 敷地 ${f1(site)})` });
      lines.push({
        k: '容積率の上限',
        v: capped ? `${f1(farMax)} %(${capFar!.label}の最高限度。法 52 条による上限は ${lawText})` : lawText,
        ng: farNg,
      });
      lines.push({ k: '残りの延べ面積', v: left((farMax / 100) * site - floor) });
    }
    if (doBc) lines.push({ k: '残りの建築面積', v: unlimited ? '—' : left((bcMax / 100) * site - bldg) });
    const siteNg = minSiteLine(lines, ovs, site);
    const ng = bcNg || farNg || siteNg;
    const part = [!doBc && '建蔽率は未入力', !doFar && '容積率は未入力', roadBlank && '前面道路未入力'].filter(Boolean).join('・');
    return {
      verdict: ng ? 'ng' : part ? 'info' : 'ok',
      summary: `${ng ? `${siteNg ? '不適合' : '超過'}(${[bcNg && '建蔽率', farNg && '容積率', siteNg && '敷地面積の最低限度'].filter(Boolean).join('・')})` : '適合'}${part ? `(${part})` : ''}`,
      lines,
    };
  },
};

/** 地区計画・建築協定・条例の敷地面積の最低限度(定めがあるときだけ行を足す)。不足なら true */
function minSiteLine(lines: CalcLine[], ovs: ReturnType<typeof overlaysOf>, site: number): boolean {
  const m = strictestOf(ovs, 'minSite');
  if (!m) return false;
  const ng = site + 1e-9 < m.v;
  lines.push({ k: '敷地面積の最低限度', v: `${f1(m.v)} m²(${m.label}・${m.basis})。敷地 ${f1(site)} m²${ng ? ' は不足' : ''}`, ng });
  return ng;
}

/** 敷地が 2 以上の用途地域・防火指定にわたるとき(法 52 条 7 項・53 条 2 項・7 項・8 項) */
function coverageMulti(v: Vals, parts: ReturnType<typeof partsOf>, p: Project): CalcOut | null {
  const bldg = n(v, 'bldg');
  const floor = n(v, 'floor');
  if (!(bldg >= 0)) return null;
  const rd = roadOf(v);
  const fr = (v.fr || 'none') as FireRating;
  const w = weightedLimits(parts, { road: rd.w, fr, corner: on(v, 'corner') });
  const lines: CalcLine[] = [];
  if (rd.note) lines.push({ k: '前面道路の幅員', v: `${f2(rd.w)} m(${rd.note})` });
  if (rd.blank) lines.push({ k: '前面道路', v: '幅員が未入力のため、道路による容積率の低減(法 52 条 2 項)を見ていません' });
  for (const r of w.rows) {
    lines.push({
      k: `${r.part.zone}・${r.part.fire}`,
      v: `${f1(r.part.area)} m²(${pct(r.part.area / w.site)})· 建蔽率 ${r.bcLimit >= 100 ? '制限なし' : `${f1(r.bcLimit)} %`}${r.bcNote ? `(${r.bcNote})` : ''} · 容積率 ${r.farLimit > 0 ? `${f1(r.farLimit)} %(${r.farNote})` : '未入力'}`,
    });
  }
  if (w.deemed) lines.push({ k: '防火のみなし', v: `敷地の全部を${w.deemed}とみなして緩和を適用(法 53 条 ${w.deemed === '防火地域' ? 7 : 8} 項)` });
  // 地区計画・建築協定・条例の最高限度(定めがあるときだけ)
  const ovs = overlaysOf(p);
  const capBc = strictestOf(ovs, 'bc');
  const capFar = strictestOf(ovs, 'far');
  const bcMax = capBc && capBc.v < w.bc ? capBc.v : w.bc;
  const farMax = capFar && capFar.v < w.far ? capFar.v : w.far;
  const bcNow = (bldg / w.site) * 100;
  const bcNg = bcNow > bcMax + 1e-9;
  if (capBc) lines.push({ k: `${capBc.label}の建蔽率`, v: `最高限度 ${f1(capBc.v)} %(${capBc.basis})` });
  lines.push({ k: '建蔽率', v: `${f1(bcNow)} %(建築面積 ${f1(bldg)} ÷ 敷地 ${f1(w.site)})` });
  lines.push({ k: '建蔽率の上限(加重平均)', v: bcMax < w.bc ? `${f1(bcMax)} %(${capBc!.label}の最高限度。加重平均は ${f1(w.bc)} %)` : `${f1(w.bc)} %`, ng: bcNg });
  let farNg = false;
  const hasFar = w.rows.every((r) => r.farLimit > 0);
  if (hasFar && floor >= 0) {
    const farNow = (floor / w.site) * 100;
    farNg = farNow > farMax + 1e-9;
    if (capFar) lines.push({ k: `${capFar.label}の容積率`, v: `最高限度 ${f1(capFar.v)} %(${capFar.basis})` });
    lines.push({ k: '容積率', v: `${f1(farNow)} %(延べ ${f1(floor)} ÷ 敷地 ${f1(w.site)})` });
    lines.push({ k: '容積率の上限(加重平均)', v: farMax < w.far ? `${f1(farMax)} %(${capFar!.label}の最高限度。加重平均は ${f1(w.far)} %)` : `${f1(w.far)} %`, ng: farNg });
    lines.push({ k: '残りの延べ面積', v: left((farMax / 100) * w.site - floor) });
  } else {
    lines.push({ k: '容積率', v: '物件条件の地域ごとに指定容積率を入れると判定します' });
  }
  lines.push({ k: '残りの建築面積', v: left((bcMax / 100) * w.site - bldg) });
  const siteNg = minSiteLine(lines, ovs, w.site);
  const ng = bcNg || farNg || siteNg;
  const partial = !(hasFar && floor >= 0) || (rd.blank && hasFar);
  return {
    verdict: ng ? 'ng' : partial ? 'info' : 'ok',
    summary: `${ng ? `${siteNg ? '不適合' : '超過'}(${[bcNg && '建蔽率', farNg && '容積率', siteNg && '敷地面積の最低限度'].filter(Boolean).join('・')})` : '適合'}${partial ? (hasFar && floor >= 0 ? '(前面道路未入力)' : '(容積率は未判定)') : ''} · ${parts.length} 地域の加重平均`,
    lines,
  };
}

/* ───────── 採光・換気(法 28 条・令 19 条・20 条) ───────── */
/** 採光補正係数(令 20 条 2 項)。d・h は開口ごとに、d/h が最も小さくなる直上の部分で取る */
function lightCoef(zone: string, d: number, h: number, road: boolean, sky: boolean, veranda: boolean): { k: number; how: string; assumed: boolean } {
  let a: number;
  let b: number;
  let dMin: number;
  if (isResidential(zone)) [a, b, dMin] = [6, 1.4, 7];
  else if (isIndustrial(zone)) [a, b, dMin] = [8, 1, 5];
  else [a, b, dMin] = [10, 1, 4];
  let k: number;
  let how: string;
  let assumed = false;
  // d = 0(壁が境界線に接する)も入力として扱う。2026-11-16 まで d = 0 を未入力とみなし 1.0 にしていた
  if (d >= 0 && h > 0) {
    k = (d / h) * a - b;
    how = `${f2(d)}/${f2(h)}×${a}−${b} = ${f2(k)}`;
    if (road && k < 1) {
      k = 1;
      how += ' → 道に面するので 1.0';
    } else if (!road && d >= dMin && k < 1) {
      k = 1;
      how += ` → d ≥ ${dMin}m なので 1.0`;
    } else if (k < 0) {
      k = 0;
      how += ' → 0';
    }
  } else {
    k = 1;
    assumed = true;
    how = 'd・h 未入力のため 1.0 と仮定';
  }
  if (sky) {
    k *= 3;
    how += ' ×3.0(天窓)';
  }
  if (veranda) {
    k *= 0.7;
    how += ' ×0.7(外側に幅 90cm 以上の縁側など)';
  }
  if (k > 3) {
    k = 3;
    how += ' → 上限 3.0';
  }
  return { k, how, assumed };
}

/** 採光補正係数の式の区分(令 20 条 2 項 1 号 住居系・2 号 工業系・3 号 商業系と無指定) */
const lightGroup = (zone: string) => (isResidential(zone) ? 1 : isIndustrial(zone) ? 2 : 3);
const LIGHT_GROUP_LABEL = ['', '住居系の式(令 20 条 2 項 1 号)', '工業系の式(同 2 号)', '商業系・無指定の式(同 3 号)'];
/** 採光の式を見る敷地の部分:建物がかかる部分(印が 1 つも無ければ全部) */
function lightParts(p: Project): SitePart[] {
  const ps = partsOf(p);
  const on = ps.filter((x) => x.bldg);
  return on.length ? on : ps;
}
const lightSplit = (p: Project) => new Set(lightParts(p).map((x) => lightGroup(x.zone))).size > 1;

/**
 * 開口 1 つの採光補正係数を、敷地の部分ごとの式で出す。2026-11-16
 * 建物が式の違う 2 以上の地域にかかり、開口がある部分を選んでいないときは、各部分の式で出して最も小さい値(k)と最も大きい値(kMax)を返す
 */
function openingCoef(p: Project, sel: string | undefined, d: number, h: number, road: boolean, sky: boolean, veranda: boolean) {
  const ps = lightParts(p);
  const groups = [...new Set(ps.map((x) => lightGroup(x.zone)))];
  if (groups.length < 2) {
    const c = lightCoef(ps[0]?.zone ?? p.zone, d, h, road, sky, veranda);
    return { ...c, kMax: c.k, detail: '' };
  }
  const all = partsOf(p);
  const idx = sel === undefined || sel === '' ? -1 : Number(sel);
  if (idx >= 0 && all[idx]) {
    const c = lightCoef(all[idx].zone, d, h, road, sky, veranda);
    return { ...c, how: `${c.how}(${all[idx].zone}の式)`, kMax: c.k, detail: '' };
  }
  const cs = groups.map((g) => ({ g, c: lightCoef(ps.find((x) => lightGroup(x.zone) === g)!.zone, d, h, road, sky, veranda) })).sort((a, b) => a.c.k - b.c.k);
  const lo = cs[0];
  const hi = cs[cs.length - 1];
  // どの式でも同じ値(d・h 未入力・道に面して 1.0 など)なら、式を分けて書かない
  if (cs.every((x) => x.c.how === lo.c.how)) return { ...lo.c, kMax: lo.c.k, detail: '' };
  return {
    k: lo.c.k,
    kMax: hi.c.k,
    assumed: lo.c.assumed,
    how: `${lo.c.how}(${LIGHT_GROUP_LABEL[lo.g]}。部分ごとの値のうち最も小さい)`,
    detail: `${cs.map((x) => `${LIGHT_GROUP_LABEL[x.g]} ${f2(x.c.k)}`).join(' / ')}。開口がある敷地の部分を選ぶと、その部分の式で計算`,
  };
}

const daylight: CalcSpec = {
  title: '採光・換気の判定(居室 1 室)',
  fields: [
    {
      k: 'ratio',
      label: '居室の種類(必要な割合)',
      kind: 'sel',
      options: [
        ['7', '住宅の居室・病院/診療所の病室・寄宿舎の寝室・児童福祉施設等の寝室など(1/7)'],
        ['5', '幼稚園・小中高等の教室・保育所の保育室(1/5)'],
        ['10', 'その他の学校の教室・病院等の談話室など(1/10)'],
        ['10h', '住宅の居室で床面 50lx 以上の照明を設ける(1/10・告示の条件)'],
      ],
      def: () => '7',
    },
    { k: 'floor', label: '居室の床面積', kind: 'num', unit: 'm²', step: 0.01 },
    { k: 'win', label: '開口 1:面積', kind: 'num', unit: 'm²', step: 0.01 },
    {
      k: 'd',
      label: '開口 1:d(直上の建物の部分から隣地境界線までの水平距離)',
      kind: 'num',
      unit: 'm',
      step: 0.1,
      hint: '道に面する開口は道の反対側の境界線まで。公園・川などは幅の 1/2 だけ外側の線まで。同じ敷地の他の建物や自分の建物の他の部分が向かい合うときは、その対向部まで',
    },
    { k: 'h', label: '開口 1:h(その部分から開口の中心までの垂直距離)', kind: 'num', unit: 'm', step: 0.1, hint: '直上の軒先・パラペット・上階のバルコニーなど、d/h が最も小さくなる部分で取る(半透明の庇は除く)' },
    { k: 'road', label: '開口 1:道に面する', kind: 'bool' },
    { k: 'sky', label: '開口 1:天窓', kind: 'bool' },
    { k: 'en', label: '開口 1:外側に幅 90cm 以上の縁側など(×0.7)', kind: 'bool' },
    { k: 'win2', label: '開口 2:面積', kind: 'num', unit: 'm²', step: 0.01, hint: '2 つ目の窓。d・h が開口 1 と違うときに使う' },
    { k: 'd2', label: '開口 2:d', kind: 'num', unit: 'm', step: 0.1 },
    { k: 'h2', label: '開口 2:h', kind: 'num', unit: 'm', step: 0.1 },
    { k: 'road2', label: '開口 2:道に面する', kind: 'bool' },
    { k: 'sky2', label: '開口 2:天窓', kind: 'bool' },
    { k: 'en2', label: '開口 2:外側に縁側など(×0.7)', kind: 'bool' },
    { k: 'extra', label: 'その他の開口の有効採光面積(別に計算した合計)', kind: 'num', unit: 'm²', step: 0.01, hint: '3 つ目以降の窓は、面積 × 補正係数を足して入れる' },
    { k: 'vent', label: '開けられる部分の面積(換気)', kind: 'num', unit: 'm²', step: 0.01, hint: 'すべての開口の合計。引違い窓はおおむね窓面積の 1/2' },
  ],
  more: (p) => {
    if (!lightSplit(p)) return [];
    const options: Array<[string, string]> = partsOf(p).map((x, i) => [String(i), `${i + 1}: ${x.zone}${x.area > 0 ? ` ${f1(x.area)} m²` : ''}`]);
    const hint = '採光補正係数の式は用途地域の区分で変わる(令 20 条 2 項)。選ばないと、建物がかかる部分の式のうち最も小さい値で判定する';
    return [
      { k: 'zp', label: '開口 1 がある敷地の部分', kind: 'sel', options, hint },
      { k: 'zp2', label: '開口 2 がある敷地の部分', kind: 'sel', options },
    ];
  },
  note:
    '採光補正係数は用途地域で式が変わります(住居系 d/h×6−1.4・工業系 d/h×8−1・商業系と無指定 d/h×10−1、天窓 ×3.0・縁側 ×0.7、上限 3.0。令 20 条 2 項)。建物が式の違う 2 以上の用途地域にかかるときは、開口がある敷地の部分を選ぶとその部分の式で、選ばないと部分ごとの式で出して最も小さい値で判定します(令 20 条 2 項は地域の区分に応じると定めるだけで、敷地がまたがるときの扱いの明文はありません。審査機関に確かめてください)。事務所・店舗・ホテルの客室などは採光の規定がありません(無窓居室の扱いは別に確認)。換気は機械換気(令 20 条の 2)を設ければ窓の 1/20 は不要です。',
  run(v, p) {
    const floor = n(v, 'floor');
    const win = n(v, 'win');
    if (!(floor > 0) || !(win >= 0)) return null;
    const num = (k: string) => (v[k] === undefined || v[k] === '' ? NaN : n(v, k));
    const lines: CalcLine[] = [];
    const c1 = openingCoef(p, v.zp, num('d'), num('h'), on(v, 'road'), on(v, 'sky'), on(v, 'en'));
    let eff = win * c1.k;
    // 部分の式が決まらない開口は、最も大きい値でも足りないかを別に見る
    let effMax = win * c1.kMax;
    let assumed = c1.assumed;
    lines.push({ k: '開口 1 の採光補正係数', v: c1.how });
    if (c1.detail) lines.push({ k: '開口 1 の部分ごとの値', v: c1.detail });
    lines.push({ k: '開口 1 の有効採光面積', v: `${f2(win * c1.k)} m²(${f2(win)} × ${f2(c1.k)})` });
    const win2 = n(v, 'win2');
    if (win2 > 0) {
      const c2 = openingCoef(p, v.zp2, num('d2'), num('h2'), on(v, 'road2'), on(v, 'sky2'), on(v, 'en2'));
      eff += win2 * c2.k;
      effMax += win2 * c2.kMax;
      assumed = assumed || c2.assumed;
      lines.push({ k: '開口 2 の採光補正係数', v: c2.how });
      if (c2.detail) lines.push({ k: '開口 2 の部分ごとの値', v: c2.detail });
      lines.push({ k: '開口 2 の有効採光面積', v: `${f2(win2 * c2.k)} m²(${f2(win2)} × ${f2(c2.k)})` });
    }
    const extra = n(v, 'extra');
    if (extra > 0) {
      eff += extra;
      effMax += extra;
      lines.push({ k: 'その他の開口', v: `${f2(extra)} m²` });
    }
    const den = parseFloat(v.ratio || '7');
    const need = floor / den;
    // 部分の式によって足りたり足りなかったりする(どの部分の式でも足りないときだけ不足と言い切る)
    const split = eff + 1e-9 < need && !(effMax + 1e-9 < need);
    const ngL = eff + 1e-9 < need && !split;
    lines.push({ k: '有効採光面積の合計', v: effMax > eff + 1e-9 ? `${f2(eff)} m²(部分の式によっては ${f2(effMax)} m²)` : `${f2(eff)} m²` });
    lines.push({ k: `必要(床面積の 1/${den})`, v: `${f2(need)} m²${split ? '。開口がある部分の式で足りるかが変わる' : ''}`, ng: ngL || split });
    let ngV = false;
    const vent = n(v, 'vent');
    if (vent >= 0) {
      const needV = floor / 20;
      ngV = vent + 1e-9 < needV;
      lines.push({ k: '換気に有効な面積', v: `${f2(vent)} m²` });
      lines.push({ k: '必要(床面積の 1/20)', v: `${f2(needV)} m²`, ng: ngV });
    } else {
      lines.push({ k: '換気(床面積の 1/20)', v: `未入力(必要 ${f2(floor / 20)} m²。機械換気なら不要)` });
    }
    const ng = ngL || ngV;
    // d・h を入れずに 1.0 と仮定した開口があるときは「適合」と言い切らない
    return {
      verdict: ng ? 'ng' : assumed || split ? 'info' : 'ok',
      summary: ng
        ? `不足(${[ngL && '採光', ngV && '換気'].filter(Boolean).join('・')})`
        : split
          ? '要確認(採光は開口がある敷地の部分の式で結果が変わる。部分を選ぶ)'
          : assumed
            ? '適合(d・h 未入力の開口は補正係数 1.0 と仮定)'
            : '適合',
      lines,
    };
  },
};

/* ───────── 階段の寸法(令 23 条〜25 条) ───────── */
const STAIR: Record<string, { label: string; w: number; r: number; t: number; land: number }> = {
  '1': { label: '小学校の児童用', w: 140, r: 16, t: 26, land: 3 },
  '2': { label: '中学・高校の生徒用 / 物販 1,500m² 超 / 劇場・集会場の客用', w: 140, r: 18, t: 26, land: 3 },
  '3': { label: '直上階の居室 200m² 超の地上階 / 居室 100m² 超の地階', w: 120, r: 20, t: 24, land: 4 },
  '4': { label: '上記以外', w: 75, r: 22, t: 21, land: 4 },
  '5': { label: '住宅(共同住宅の共用階段を除く)', w: 75, r: 23, t: 15, land: 4 },
};
const stair: CalcSpec = {
  title: '階段の寸法の判定',
  fields: [
    {
      k: 'type',
      label: '階段の種類',
      kind: 'sel',
      options: Object.entries(STAIR).map(([k, s]) => [k, `(${k}) ${s.label}`]),
      def: (p) => (p.use === 'school' ? '1' : p.use === 'shop' && p.area > 1500 ? '2' : '4'),
      hint: '(1)〜(4) は令 23 条 1 項の表。直上階の居室の床面積で (3) に上がるので、階ごとに確かめる',
    },
    { k: 'w', label: '有効幅', kind: 'num', unit: 'cm', step: 1, hint: '手すりは幅 10cm まで無いものとして測る' },
    { k: 'r', label: 'けあげ', kind: 'num', unit: 'cm', step: 0.1 },
    { k: 't', label: '踏面', kind: 'num', unit: 'cm', step: 0.1, hint: '回り階段は狭い方の端から 30cm の位置で' },
    { k: 'rise', label: '踊場なしで上る高さ', kind: 'num', unit: 'm', step: 0.01 },
    { k: 'land', label: '直階段の踊場の踏幅', kind: 'num', unit: 'm', step: 0.01, hint: '直階段(まっすぐの階段)の途中の踊場だけ。1.2m 以上(令 24 条 2 項)' },
  ],
  note:
    '屋外階段の幅は直通階段 90cm 以上・その他 60cm 以上。両側手すり・滑り止めなどを条件に、けあげ・踏面を緩和する告示(平成 26 年国交告第 709 号)があります。手すりは必須(高さ 1m 以下の部分を除く)、幅 3m 超は中間にも手すり。',
  run(v) {
    const s = STAIR[v.type || '4'];
    const w = n(v, 'w');
    const r = n(v, 'r');
    const t = n(v, 't');
    if (!s || !(w > 0 || r > 0 || t > 0)) return null;
    const lines: CalcLine[] = [];
    const ngs: string[] = [];
    if (w > 0) {
      const ng = w < s.w;
      if (ng) ngs.push('幅');
      lines.push({ k: '幅', v: `${f1(w)} cm(${s.w} cm 以上)`, ng });
    }
    if (r > 0) {
      const ng = r > s.r;
      if (ng) ngs.push('けあげ');
      lines.push({ k: 'けあげ', v: `${f1(r)} cm(${s.r} cm 以下)`, ng });
    }
    if (t > 0) {
      const ng = t < s.t;
      if (ng) ngs.push('踏面');
      lines.push({ k: '踏面', v: `${f1(t)} cm(${s.t} cm 以上)`, ng });
    }
    const rise = n(v, 'rise');
    if (rise > 0) {
      const ng = rise > s.land;
      if (ng) ngs.push('踊場');
      lines.push({ k: '踊場までの高さ', v: `${f2(rise)} m(${s.land} m 以内ごとに踊場)`, ng });
    }
    const land = n(v, 'land');
    if (land > 0) {
      const ng = land + 1e-9 < 1.2;
      if (ng) ngs.push('踊場の踏幅');
      lines.push({ k: '直階段の踊場の踏幅', v: `${f2(land)} m(1.2 m 以上)`, ng });
    }
    if (r > 0 && t > 0) lines.push({ k: '参考 2R+T', v: `${f1(2 * r + t)} cm(上りやすさの目安 60〜65)` });
    return { verdict: ngs.length ? 'ng' : 'ok', summary: ngs.length ? `不適合(${ngs.join('・')})` : '適合', lines };
  },
};

/* ───────── 歩行距離(令 120 条) ───────── */
const WALK: Record<string, { label: string; fr: number; other: number; high: number }> = {
  a: { label: '採光上の無窓居室(採光に有効な開口が床面積の 1/20 未満)/ 物販・飲食店・遊技場など(法別表第 1(4)項)', fr: 30, other: 30, high: 20 },
  b: { label: '病院・有床診療所・ホテル・共同住宅・寄宿舎・児童福祉施設等(同(2)項)', fr: 50, other: 30, high: 40 },
  c: { label: '上記以外(事務所など)', fr: 50, other: 40, high: 40 },
};
const walk: CalcSpec = {
  title: '直通階段までの歩行距離の判定',
  fields: [
    { k: 'room', label: '居室の種類', kind: 'sel', options: Object.entries(WALK).map(([k, s]) => [k, s.label]), def: (p) => (p.use === 'shop' || p.use === 'rest' ? 'a' : p.use === 'clinic' || p.use === 'hotel' || p.use === 'house' ? 'b' : 'c') },
    { k: 'fr', label: '主要構造部が準耐火構造・不燃材料', kind: 'bool', def: (p) => (p.str === 'w' ? '' : '1'), hint: '木造でも準耐火構造なら入れる。鉄骨造は壁・床・屋根・階段まで不燃材料のとき' },
    { k: 'fin', label: '居室と避難経路の壁・天井を準不燃で仕上げる', kind: 'bool', hint: '床から 1.2m 以下の壁は除く' },
    { k: 'high', label: '15 階以上の階', kind: 'bool' },
    { k: 'len', label: '最も遠い位置から直通階段までの歩行距離', kind: 'num', unit: 'm', step: 0.1 },
  ],
  note: '避難階以外の階の居室ごとに、最も遠い位置から直通階段の 1 つまで。共同住宅のメゾネット住戸(令 120 条 4 項)、無窓居室の告示による除外、避難安全検証法による適用除外は判定の外です。',
  run(v) {
    const s = WALK[v.room || 'c'];
    const len = n(v, 'len');
    if (!s || !(len > 0)) return null;
    let max: number;
    let how: string;
    if (!on(v, 'fr')) {
      // 15 階以上の階は構造によらず表 −10m(令 120 条 3 項)
      max = on(v, 'high') ? s.other - 10 : s.other;
      how = on(v, 'high') ? '主要構造部がその他・15 階以上(表 −10m)' : '主要構造部がその他';
    } else if (on(v, 'high')) {
      max = on(v, 'fin') ? s.fr : s.fr - 10;
      how = on(v, 'fin') ? '15 階以上・準不燃仕上げ(表のまま)' : '15 階以上(表 −10m)';
    } else {
      max = on(v, 'fin') ? s.fr + 10 : s.fr;
      how = on(v, 'fin') ? '準耐火等・準不燃仕上げ(表 +10m)' : '準耐火等';
    }
    const ng = len > max;
    return {
      verdict: ng ? 'ng' : 'ok',
      summary: ng ? `超過(${f1(len - max)} m)` : '適合',
      lines: [
        { k: '上限', v: `${max} m(${how})` },
        { k: '歩行距離', v: `${f1(len)} m`, ng },
      ],
    };
  },
};

/* ───────── 照度(光束法) ───────── */
const lux: CalcSpec = {
  title: '平均照度の計算(光束法)',
  fields: [
    { k: 'area', label: '室の床面積', kind: 'num', unit: 'm²', step: 0.1 },
    { k: 'target', label: '目標の照度', kind: 'num', unit: 'lx', step: 50, def: (p) => (p.use === 'office' ? '750' : '500'), hint: 'JIS Z 9110 の推奨照度(事務室 750・会議室 500 など)。教室は学校環境衛生基準(下限 300、500 以上が望ましい)。法令の下限は事務所衛生基準規則 10 条(一般的な事務作業 300)' },
    { k: 'lm', label: '器具 1 台の光束', kind: 'num', unit: 'lm', step: 100 },
    { k: 'num', label: '台数', kind: 'num', unit: '台', step: 1 },
    { k: 'u', label: '照明率 U', kind: 'num', step: 0.01, def: () => '0.6', hint: '器具の照明率表から。目安 0.5〜0.7' },
    { k: 'm', label: '保守率 M', kind: 'num', step: 0.01, def: () => '0.77', hint: 'LED の一般的な環境で 0.7〜0.8' },
  ],
  note: '平均照度 E = N × F × U × M ÷ A。必要台数 N = E × A ÷(F × U × M)。',
  run(v) {
    const A = n(v, 'area');
    const F = n(v, 'lm');
    const U = n(v, 'u');
    const M = n(v, 'm');
    const N = n(v, 'num');
    const E0 = n(v, 'target');
    if (!(A > 0) || !(F > 0) || !(U > 0) || !(M > 0)) return null;
    const lines: CalcLine[] = [];
    const needN = E0 > 0 ? Math.ceil((E0 * A) / (F * U * M)) : NaN;
    if (Number.isFinite(needN)) lines.push({ k: '必要台数', v: `${needN} 台` });
    if (N > 0) {
      const E = (N * F * U * M) / A;
      const ng = E0 > 0 && E < E0;
      lines.push({ k: '平均照度', v: `${Math.round(E).toLocaleString('ja-JP')} lx(${N} 台)`, ng });
      return { verdict: E0 > 0 ? (ng ? 'ng' : 'ok') : 'info', summary: `${Math.round(E)} lx${ng ? '(不足)' : ''}`, lines };
    }
    return { verdict: 'info', summary: `必要 ${needN} 台`, lines };
  },
};

/* ───────── 電圧降下(内線規程 1310 節) ───────── */
const VD: Record<string, { label: string; k: number; v: string }> = {
  '1p2w': { label: '単相 2 線式', k: 35.6, v: '100' },
  '3p3w': { label: '三相 3 線式', k: 30.8, v: '200' },
  '1p3w': { label: '単相 3 線式・三相 4 線式(線間ではなく対地)', k: 17.8, v: '100' },
};
const vdrop: CalcSpec = {
  title: '電圧降下の計算',
  fields: [
    { k: 'sys', label: '電気方式', kind: 'sel', options: Object.entries(VD).map(([k, s]) => [k, s.label]), def: () => '1p3w' },
    { k: 'volt', label: '標準電圧', kind: 'num', unit: 'V', step: 1, hint: '空欄なら方式の標準(単相 2 線・単相 3 線 100V、三相 3 線 200V)。降下率はこの電圧に対して出す' },
    { k: 'i', label: '負荷電流', kind: 'num', unit: 'A', step: 1 },
    { k: 'l', label: '亘長(こう長)', kind: 'num', unit: 'm', step: 1 },
    { k: 'a', label: '電線の断面積', kind: 'num', unit: 'mm²', step: 1 },
    { k: 'lim', label: '許容する電圧降下', kind: 'num', unit: '%', step: 0.5, def: () => '2', hint: '幹線・分岐それぞれ 2%。亘長 60m 超の内線規程 1310 節の表(4〜7%)は供給点から最遠端の負荷までの合計の値なので、この区間の値としてそのまま入れない' },
  ],
  note: 'e = K × L × I ÷(1000 × A)。K は単相 2 線 35.6・三相 3 線 30.8・単相 3 線と三相 4 線 17.8(電線 1 本と中性線の間)。力率・リアクタンスは見ない略算です。',
  run(v) {
    const s = VD[v.sys || '1p3w'];
    const I = n(v, 'i');
    const L = n(v, 'l');
    const A = n(v, 'a');
    // 2026-11-16 まで標準電圧の初期値が方式によらず 100V で、三相 200V の降下率が 2 倍に出ていた
    const V = n(v, 'volt') > 0 ? n(v, 'volt') : parseFloat(s?.v ?? '');
    const lim = n(v, 'lim');
    if (!s || !(I > 0) || !(L > 0) || !(A > 0) || !(V > 0)) return null;
    const e = (s.k * L * I) / (1000 * A);
    const r = e / V;
    const ng = lim > 0 && r * 100 > lim;
    const needA = lim > 0 ? (s.k * L * I) / (1000 * V * (lim / 100)) : NaN;
    return {
      verdict: lim > 0 ? (ng ? 'ng' : 'ok') : 'info',
      summary: `${f2(r * 100)} %${ng ? '(超過)' : ''}`,
      lines: [
        { k: '電圧降下 e', v: `${f2(e)} V(${s.k}×${L}×${I}÷(1000×${A}))` },
        { k: '降下率', v: `${pct(r)}${lim > 0 ? `(許容 ${lim} %)` : ''}`, ng },
        ...(Number.isFinite(needA) ? [{ k: '許容内に収まる断面積', v: `${f1(needA)} mm² 以上` }] : []),
      ],
    };
  },
};

/* ───────── 物件の条件だけで決まるもの ───────── */
const emergencyEv: CalcSpec = {
  title: '物件の高さから判定',
  fields: [],
  note: '高さ 31m を超える部分が階段室・機械室などだけの建物、31m 超の各階の床面積の合計が 500m² 以下の建物などは除かれます(令 129 条の 13 の 2)。',
  run(_v, p) {
    const need = p.H > 31;
    return {
      verdict: 'info',
      summary: need ? '設置が必要' : '不要',
      lines: [{ k: '建築物の高さ', v: `${p.H} m(31 m を${need ? '超える' : '超えない'}・法 34 条 2 項)` }],
    };
  },
};
const lightning: CalcSpec = {
  title: '物件の高さから判定',
  fields: [],
  note: '危険物の貯蔵所などは高さによらず消防法令で必要になることがあります。',
  run(_v, p) {
    const need = p.H > 20;
    return {
      verdict: 'info',
      summary: need ? '設置が必要' : '設置義務なし',
      lines: [{ k: '建築物の高さ', v: `${p.H} m(20 m を${need ? '超える' : '超えない'}・法 33 条)` }],
    };
  },
};

/* ───────── 構造計算の区分(法 20 条 1 項・令 36 条の 2・令 81 条) ───────── */
/** 法 20 条 1 項の号。物件の構造・地上階数・高さ・延べ面積から(混構造・告示 593 号の指定は見ない) */
export function structClass(p: Project): { go: 1 | 2 | 3 | 4; why: string } {
  const H = +p.H || 0;
  const fl = +p.fl || 0;
  const all = fl + (+p.bf || 0);
  if (H > 60) return { go: 1, why: '高さ 60m 超' };
  if (p.str === 'w' && (fl >= 4 || H > 16)) return { go: 2, why: `木造で${fl >= 4 ? '地上 4 階以上' : '高さ 16m 超'}` };
  if (p.str === 's' && (fl >= 4 || H > 16)) return { go: 2, why: `鉄骨造で${fl >= 4 ? '地上 4 階以上' : '高さ 16m 超(令 36 条の 2 第 2 号)'}` };
  if ((p.str === 'rc' || p.str === 'src') && H > 20) return { go: 2, why: '鉄筋コンクリート造・鉄骨鉄筋コンクリート造で高さ 20m 超' };
  // 3 号:法 6 条 1 項 1 号・2 号の建築物(木造は地上 3 階以上か延べ 300m² 超に限る)
  if (p.str === 'w' ? fl >= 3 || p.area > 300 : all >= 2 || p.area > 200) {
    return { go: 3, why: p.str === 'w' ? `木造で${fl >= 3 ? '地上 3 階以上' : '延べ 300m² 超'}` : `${all >= 2 ? '階数 2 以上' : '延べ 200m² 超'}(法 6 条 1 項 2 号)` };
  }
  return { go: 4, why: p.str === 'w' ? '木造で地上 2 階以下・延べ 300m² 以下' : '平家・延べ 200m² 以下' };
}

const structRoute: CalcSpec = {
  title: '物件の構造・階数・高さから判定',
  fields: [],
  note:
    '木造・鉄骨造・鉄筋コンクリート造の単一の構造として判定しています。混構造(令 36 条の 2 第 3 号・4 号)と、H19 国交告第 593 号に当たる建築物(鉄骨造のスパン・延べ面積、鉄筋コンクリート造の壁量・柱量などの条件。ルート 2 以上になる)は判定の外です。高さは地盤面から(令 2 条 1 項 6 号)、階数は地階を除く地上階数で見ています。',
  run(_v, p) {
    const c = structClass(p);
    const lines: CalcLine[] = [{ k: '法 20 条 1 項', v: `${c.go} 号(${c.why}。高さ ${p.H} m・地上 ${p.fl} 階${p.bf ? `・地下 ${p.bf} 階` : ''}・延べ ${f1(p.area)} m²)` }];
    let summary: string;
    if (c.go === 1) {
      summary = '時刻歴応答解析・大臣認定';
      lines.push({ k: '構造計算', v: '時刻歴応答解析などで安全を確かめ、国土交通大臣の認定(法 20 条 1 項 1 号)' });
    } else if (c.go === 2) {
      const tall = p.H > 31;
      summary = tall ? 'ルート 3(保有水平耐力計算)か限界耐力計算' : 'ルート 2 か 3(許容応力度等計算・保有水平耐力計算)';
      lines.push({ k: '構造計算', v: tall ? '高さ 31m 超:保有水平耐力計算か限界耐力計算(令 81 条 2 項 1 号)' : '高さ 31m 以下:許容応力度等計算(ルート 2)か保有水平耐力計算(ルート 3)・限界耐力計算(令 81 条 2 項 2 号)' });
      lines.push({ k: '構造計算適合性判定', v: '要(法 6 条の 3)。ルート 2 は判定資格者のいる審査機関なら省略できる(同条 1 項ただし書)' });
    } else if (c.go === 3) {
      summary = 'ルート 1(許容応力度計算)以上';
      lines.push({ k: '構造計算', v: '許容応力度計算(令 81 条 3 項・令 82 条)と屋根ふき材等の計算(令 82 条の 4)' });
      lines.push({ k: '構造計算適合性判定', v: '不要(ルート 1 で計算する場合)' });
    } else {
      summary = '構造計算は不要(仕様規定)';
      lines.push({ k: '構造計算', v: p.str === 'w' ? '仕様規定で確かめる(壁量計算・四分割法・N 値計算・柱の小径。令 46 条ほか)' : '仕様規定で確かめる(令 3 章 3 節〜7 節の 2)' });
    }
    if (p.str === 'w' && c.go >= 3) lines.push({ k: '2025 年 4 月の改正', v: '木造の構造計算の規模は延べ 300m² 超・地上 3 階以上、ルート 2 以上は高さ 16m 超・地上 4 階以上(旧 500m²・高さ 13m・軒高 9m)' });
    return { verdict: 'info', summary, lines };
  },
};

/* ───────── 確認申請の区分(法 6 条 1 項) ───────── */
const SPECIAL_USE = new Set(['shop', 'rest', 'house', 'hotel', 'school']);
const confirm: CalcSpec = {
  title: '確認申請の区分の判定',
  fields: [
    { k: 'city', label: '都市計画区域・準都市計画区域などの内', kind: 'bool', def: () => '1', hint: '区域外でも新 2 号(階数 2 以上か延べ 200m² 超)は確認が要る' },
    {
      k: 'sp',
      label: '特殊建築物の用途の部分が 200m² を超える',
      kind: 'bool',
      def: (p) => (SPECIAL_USE.has(p.use) && p.area > 200 ? '1' : ''),
      hint: '法別表第 1 の用途(物販・飲食・共同住宅・ホテル・学校・有床診療所・倉庫・車庫など)。事務所・無床診療所・工場は含まない',
    },
  ],
  note: '用途変更(特殊建築物 200m² 超への変更は確認が要る。法 87 条)、大規模の修繕・模様替、工作物は判定の外です。構造計算適合性判定は「構造計算ルートの判定」、省エネ適判は「省エネ基準への適合」の項目で確かめます。',
  run(v, p) {
    const all = (+p.fl || 0) + (+p.bf || 0);
    const lines: CalcLine[] = [];
    let go: string;
    let summary: string;
    if (on(v, 'sp')) {
      go = '1 号(特殊建築物で 200m² 超)';
      summary = '確認申請が必要(1 号)';
    } else if (all >= 2 || p.area > 200) {
      go = `2 号(${all >= 2 ? '階数 2 以上' : '延べ 200m² 超'})`;
      summary = '確認申請が必要(2 号)';
    } else if (on(v, 'city')) {
      go = '3 号(都市計画区域などの内の平家・延べ 200m² 以下)';
      summary = '確認申請が必要(3 号)';
    } else {
      go = '1〜3 号に当たらない';
      summary = '確認申請は不要';
    }
    lines.push({ k: '法 6 条 1 項', v: go });
    lines.push({ k: '規模', v: `階数 ${all}(地上 ${p.fl}・地下 ${p.bf})・延べ ${f1(p.area)} m²` });
    if (go.startsWith('1') || go.startsWith('2')) lines.push({ k: '審査の内容', v: '構造・省エネの図書も審査の対象。審査の特例(旧 4 号特例)は使えない(2025 年 4 月から)' });
    else if (go.startsWith('3')) lines.push({ k: '審査の内容', v: '建築士の設計なら構造などの審査を省略できる(法 6 条の 4)' });
    if (go.startsWith('1') || go.startsWith('2')) lines.push({ k: '完了検査', v: '要(法 7 条)。中間検査は特定工程の指定(法 7 条の 3)による' });
    return { verdict: 'info', summary, lines };
  },
};

/* ───────── 防火地域・準防火地域の構造制限(法 61 条・令 136 条の 2) ───────── */
const fireStruct: CalcSpec = {
  title: '物件の防火指定・階数・延べ面積から判定',
  fields: [],
  note:
    '建物が防火地域・準防火地域の内外にわたるときは、厳しい方の規定を建物の全部に適用します(法 65 条。防火壁で区画した外側を除く)。物件条件の「防火」の値で判定しています。特殊建築物の耐火要求(法 27 条)、大規模な木造の耐火要求(法 21 条:高さ 16m 超か地上 4 階以上など)は別に確かめます。',
  run(_v, p) {
    const fl = +p.fl || 0;
    const all = fl + (+p.bf || 0);
    const A = +p.area || 0;
    const lines: CalcLine[] = [{ k: '物件', v: `${p.fire}・階数 ${all}(地上 ${fl})・延べ ${f1(A)} m²・${p.str === 'w' ? '木造' : '木造以外'}` }];
    let summary: string;
    if (p.fire === '防火地域') {
      if (all >= 3 || A > 100) {
        summary = '耐火建築物等';
        lines.push({ k: '令 136 条の 2 第 1 号', v: `${all >= 3 ? '階数 3 以上' : '延べ 100m² 超'}:耐火建築物か、同等以上の延焼防止性能(延焼防止建築物)` });
      } else {
        summary = '準耐火建築物等';
        lines.push({ k: '令 136 条の 2 第 2 号', v: '階数 2 以下・延べ 100m² 以下:準耐火建築物か、同等以上の延焼防止性能' });
      }
    } else if (p.fire === '準防火地域') {
      if (fl >= 4 || A > 1500) {
        summary = '耐火建築物等';
        lines.push({ k: '令 136 条の 2 第 1 号', v: `${fl >= 4 ? '地上 4 階以上' : '延べ 1500m² 超'}:耐火建築物か、同等以上の延焼防止性能` });
      } else if (fl === 3 || A > 500) {
        summary = '準耐火建築物等';
        lines.push({ k: '令 136 条の 2 第 2 号', v: `${fl === 3 ? '地上 3 階・延べ 1500m² 以下' : '地上 2 階以下・延べ 500m² 超 1500m² 以下'}:準耐火建築物か、同等以上の延焼防止性能` });
      } else if (p.str === 'w') {
        summary = '外壁・軒裏を防火構造';
        lines.push({ k: '令 136 条の 2 第 3 号', v: '地上 2 階以下・延べ 500m² 以下の木造建築物等:外壁と軒裏の延焼のおそれのある部分を防火構造、外壁開口部に 20 分の防火設備' });
      } else {
        summary = '外壁開口部に防火設備';
        lines.push({ k: '令 136 条の 2 第 4 号', v: '地上 2 階以下・延べ 500m² 以下(木造建築物等以外):外壁開口部の延焼のおそれのある部分に 20 分の防火設備' });
      }
    } else if (p.fire === '法22条区域') {
      summary = '屋根の不燃化・木造の外壁';
      lines.push({ k: '法 22 条', v: '屋根を通常の火災の火の粉で燃え広がらない構造(令 109 条の 9)' });
      if (p.str === 'w') lines.push({ k: '法 23 条', v: '木造建築物等の外壁の延焼のおそれのある部分を準防火性能の構造' });
    } else {
      summary = '法 61 条の制限なし';
      lines.push({ k: '防火指定', v: '指定なし。法 27 条・21 条の要求は別に確かめる' });
    }
    return { verdict: 'info', summary, lines };
  },
};

/* ───────── 耐火建築物等としなければならない特殊建築物(法 27 条・別表第 1・令 110 条〜110 条の 5・令 115 条の 3・115 条の 4) ─────────
 * 2026-11-16 に e-Gov の現行条文で確かめた。告示(平成 27 年国交告第 255 号)は国交省の公開 PDF(制定時・令和 2 年改正)で確かめた。 */
const KOU_OPTS: Array<[string, string]> = [
  ['0', '別表第 1 の用途ではない(事務所・無床診療所・工場・長屋など)'],
  ['1', '(1) 劇場・映画館・演芸場・観覧場・公会堂・集会場'],
  ['2', '(2) 病院・有床診療所・ホテル・旅館・共同住宅・寄宿舎・児童福祉施設等'],
  ['3', '(3) 学校・体育館・博物館・図書館・スポーツの練習場など'],
  ['4', '(4) 物販店舗・飲食店・展示場・遊技場・公衆浴場など'],
  ['5', '(5) 倉庫'],
  ['6', '(6) 自動車車庫・自動車修理工場・映画スタジオなど'],
];
/** 物件の用途から別表第 1 の項の初期値(診療所は有床か、工場・倉庫はどちらかで変わるので選ばせる) */
const kouDef = (p: Project) => ({ shop: '4', rest: '4', house: '2', hotel: '2', school: '3', office: '0' } as Record<string, string>)[p.use] ?? '';
/** 欄が空なら NaN */
const nb = (v: Vals, k: string) => (v[k] === undefined || v[k] === '' ? NaN : n(v, k));

const art27: CalcSpec = {
  title: '法 27 条の耐火要求の判定',
  fields: [
    { k: 'kou', label: '用途(別表第 1 の項)', kind: 'sel', options: KOU_OPTS, def: kouDef, hint: '複合用途は項ごとに判定する。診療所は患者の収容施設(病床)があれば (2)。幼稚園は (3)、保育所・幼保連携型認定こども園は (2)' },
    { k: 'top', label: 'その用途に供する最も上の階', kind: 'num', unit: '階', step: 1, def: (p) => (p.fl > 0 ? String(p.fl) : '') },
    { k: 'area', label: 'その用途に供する部分の床面積の合計', kind: 'num', unit: 'm²', step: 1, def: (p) => (p.area > 0 ? String(p.area) : ''), hint: '初期値は物件の延べ面積。複合用途ならその項の用途の部分だけ。同じ項の別の用途(共同住宅と寄宿舎、ホテルと共同住宅など)は合計を入れる(合算の扱いは国の資料に明記が無いので、用途ごとに数える審査機関もありうる。境目の案件は事前相談で確かめる)' },
    { k: 'a2', label: 'うち 2 階の部分の床面積((2)(4) 項)', kind: 'num', unit: 'm²', step: 1, def: (p) => (p.fl > 0 && p.fl < 2 ? '0' : ''), hint: '病院・診療所は患者の収容施設がある部分だけ' },
    { k: 'a3', label: 'うち 3 階以上の部分の床面積((5) 項)', kind: 'num', unit: 'm²', step: 1, def: (p) => (p.fl > 0 && p.fl < 3 ? '0' : '') },
    { k: 'seat', label: '客席の床面積((1) 項。屋外観覧席は 1,000m² 以上で対象)', kind: 'num', unit: 'm²', step: 1 },
    { k: 'main', label: '劇場・映画館・演芸場で主階が 1 階にない', kind: 'bool' },
    { k: 'alarm', label: '令 110 条の 5 の警報設備を設ける((2) 項で階数 3・延べ 200m² 未満のとき)', kind: 'bool' },
    {
      k: 'plan',
      label: '計画している建物の防火性能',
      kind: 'sel',
      options: [
        ['taika', '耐火建築物'],
        ['jun', '準耐火建築物'],
        ['none', 'その他'],
      ],
    },
  ],
  note:
    '防火地域の指定(法 61 条)とは別に効きます。1 項は、特定主要構造部を特定避難時間(在館者全員が地上まで避難を終えるまでの時間)に基づく基準(令 110 条)に適合させ、外壁開口部の延焼のおそれのあるもの(令 110 条の 2)に 20 分の防火設備(令 110 条の 3)を設ける。耐火建築物はこれを満たします。構造方法は平成 27 年国交告第 255 号(特定避難時間に応じた避難時倒壊防止構造・1 項 2 号だけに当たるものの準耐火構造・地上 3 階の共同住宅等や学校等の 1 時間準耐火構造など。令和 2 年国交告第 174 号で今の 1〜4 号になり、令和 6・7 年の改正でも号の並びは同じ。同じ項の別の用途の床面積を合算するかは審査機関に確認)。2 項は耐火建築物、3 項は耐火建築物か準耐火建築物((6) 項は令 115 条の 4 の外壁耐火型の準耐火建築物を除く)。危険物の貯蔵場・処理場(令 116 条の数量超)は判定の外です。火熱遮断壁等(令 109 条の 8)で区画した部分は別の建築物とみなします(法 27 条 4 項)。',
  run(v, p) {
    const k = v.kou;
    if (!k) return { verdict: 'info', summary: '用途の項を選ぶ', lines: [{ k: '別表第 1', v: '物件の用途から項が決まらないので、欄で選んでください' }] };
    if (k === '0') return { verdict: 'ok', summary: '法 27 条の対象外', lines: [{ k: '別表第 1', v: '別表第 1(い)欄の用途ではないため、法 27 条の耐火要求はかからない(防火地域の構造制限・法 21 条は別に確かめる)' }] };
    const kou = Number(k);
    const top = nb(v, 'top');
    const area = nb(v, 'area');
    const a2 = nb(v, 'a2');
    const a3 = nb(v, 'a3');
    const seat = nb(v, 'seat');
    const all = (+p.fl || 0) + (+p.bf || 0);
    const A = +p.area || 0;
    const lines: CalcLine[] = [];
    const hits: Array<{ para: 1 | 2 | 3; text: string }> = [];
    const blank: string[] = [];
    const chk = (x: number, label: string) => {
      if (Number.isNaN(x)) blank.push(label);
      return x;
    };
    if (kou <= 4) {
      // 1 項 1 号:3 階以上の階(階数 3・延べ 200m² 未満を除く。(2) 項は警報設備が条件)
      if (chk(top, '最も上の階') >= 3) {
        const small = all === 3 && A < 200 && (kou !== 2 || on(v, 'alarm'));
        if (small) lines.push({ k: '1 項 1 号の除外', v: `階数 3・延べ ${f1(A)} m²(200m² 未満)${kou === 2 ? '・警報設備あり' : ''}のため除外` });
        else hits.push({ para: 1, text: `1 項 1 号:${top} 階(3 階以上の階)に置く` });
      }
      // 1 項 2 号:(は) 欄
      const [x, T, what]: [number, number, string] =
        kou === 1 ? [seat, 200, '客席'] : kou === 2 ? [a2, 300, '2 階の部分'] : kou === 3 ? [area, 2000, 'その用途の部分'] : [a2, 500, '2 階の部分'];
      if (chk(x, what) >= T) hits.push({ para: 1, text: `1 項 2 号:${what} ${f1(x)} m² が ${T.toLocaleString('ja-JP')} m² 以上` });
      if (kou === 4 && chk(area, 'その用途の床面積') >= 3000) hits.push({ para: 1, text: `1 項 3 号:${f1(area)} m² が 3,000 m² 以上` });
      if (kou === 1 && on(v, 'main') && !(all <= 3 && A < 200)) hits.push({ para: 1, text: '1 項 4 号:劇場・映画館・演芸場で主階が 1 階にない' });
    }
    if (kou === 5) {
      if (chk(a3, '3 階以上の部分') >= 200) hits.push({ para: 2, text: `2 項 1 号:3 階以上の部分 ${f1(a3)} m² が 200 m² 以上` });
      if (chk(area, 'その用途の床面積') >= 1500) hits.push({ para: 3, text: `3 項 1 号:${f1(area)} m² が 1,500 m² 以上` });
    }
    if (kou === 6) {
      if (chk(top, '最も上の階') >= 3) hits.push({ para: 2, text: `2 項 2 号:${top} 階(3 階以上の階)に置く` });
      if (chk(area, 'その用途の床面積') >= 150) hits.push({ para: 3, text: `3 項 1 号:${f1(area)} m² が 150 m² 以上` });
    }
    hits.forEach((h, i) => lines.push({ k: `該当 ${i + 1}`, v: h.text }));
    const paras = new Set(hits.map((h) => h.para));
    const need = paras.has(2) ? 'taika' : paras.has(1) ? 'taika1' : paras.has(3) ? 'jun' : '';
    const needLabel =
      need === 'taika'
        ? '耐火建築物(法 27 条 2 項)'
        : need === 'taika1'
          ? '耐火建築物か、令 110 条の基準(特定避難時間)に適合する建築物(法 27 条 1 項)'
          : need === 'jun'
            ? `耐火建築物か準耐火建築物(法 27 条 3 項${kou === 6 ? '。令 115 条の 4 の外壁耐火型の準耐火建築物を除く' : ''})`
            : '';
    if (needLabel) lines.push({ k: '求められる構造', v: needLabel });
    if (blank.length) lines.push({ k: '未入力', v: `${[...new Set(blank)].join('・')}が空欄のため、その号は判定していません` });
    // 計画の防火性能と突き合わせる
    const plan = v.plan;
    let verdict: Verdict = 'info';
    if (need && plan) {
      if (plan === 'taika') verdict = 'ok';
      else if (plan === 'none') verdict = 'ng';
      else if (need === 'jun') verdict = 'ok';
      else if (need === 'taika') verdict = 'ng';
      else lines.push({ k: '準耐火建築物で足りるか', v: '1 項は告示第 255 号の仕様(特定避難時間に応じた避難時倒壊防止構造・1 時間準耐火構造など)に当たるかで決まる' });
      if (verdict === 'ng') lines.push({ k: '計画との照合', v: '計画の防火性能では足りません', ng: true });
    } else if (!need && !blank.length) verdict = 'ok';
    const summary = need
      ? `${need === 'taika' ? '耐火建築物' : need === 'taika1' ? '耐火建築物等(1 項)' : '耐火か準耐火建築物'}${verdict === 'ng' ? '(計画が不足)' : ''}`
      : blank.length
        ? '一部未判定'
        : '法 27 条の耐火要求なし';
    return { verdict, summary, lines };
  },
};

/* ───────── 大規模の建築物の主要構造部(法 21 条・令 109 条の 4〜109 条の 8)。2026-11-16 に e-Gov の現行条文で確かめた ───────── */
const art21: CalcSpec = {
  title: '法 21 条(大規模の木造建築物等)の判定',
  fields: [
    { k: 'comb', label: '主要構造部(床・屋根・階段を除く)の自重・積載荷重を支える部分に木材などの可燃材料を使う', kind: 'bool', def: (p) => (p.str === 'w' ? '1' : ''), hint: '初期値は物件の構造が木造のとき。鉄骨造・RC 造でも柱・梁の一部に木材を使えば対象(令 109 条の 4)' },
    { k: 'fl', label: '地上階数', kind: 'num', unit: '階', step: 1, def: (p) => (p.fl > 0 ? String(p.fl) : '') },
    { k: 'H', label: '建築物の高さ', kind: 'num', unit: 'm', step: 0.1, def: (p) => (p.H > 0 ? String(p.H) : '') },
    { k: 'area', label: '延べ面積', kind: 'num', unit: 'm²', step: 1, def: (p) => (p.area > 0 ? String(p.area) : '') },
    { k: 'kou56', label: '倉庫・自動車車庫など別表第 1 (5)(6) 項の特殊建築物', kind: 'bool' },
    { k: 'yard', label: '周囲に延焼防止上有効な空地がある(各部分から空地の反対側の境界線までの水平距離が、その部分の高さ以上。令 109 条の 6)', kind: 'bool' },
  ],
  note:
    '平成 30 年改正(令和元年 6 月施行)で、耐火構造に限らず通常火災終了時間に基づく準耐火構造(火災時倒壊防止構造。令 109 条の 5 第 1 号、45 分間未満なら 45 分間)を選べるようになりました。構造方法は令和元年国交告第 193 号(制定時:地上 4 階以下で 75 分間準耐火構造+200m² 区画・スプリンクラー・周囲 3m の通路・用途地域内など、倉庫・車庫以外で地上 3 階以下は 1 時間準耐火構造+周囲 3m の通路等、地上 2 階以下は令 115 条の 2 第 1 項の基準など。令和 2 年国交告第 173 号で通常火災終了時間による火災時倒壊防止構造が 1 号に入り、元の号は 1 つずつ繰り下がった。令和 6 年改正で 2 時間・90 分間準耐火構造が足された)。耐火構造・耐火性能検証(令 109 条の 5 第 2 号)でもよい。延べ 3,000m² 超は令 109 条の 7(周辺高火熱面積を令和 6 年国交告第 286 号の規模(1,000m² など)以下にする構造か、特定主要構造部を令 109 条の 5 の基準。熱量の算出は同第 285 号)。火熱遮断壁等(令 109 条の 8)で区画した部分は別の建築物とみなします(法 21 条 3 項)。',
  run(v) {
    if (!on(v, 'comb')) return { verdict: 'ok', summary: '法 21 条の対象外', lines: [{ k: '主要構造部', v: '自重・積載荷重を支える主要構造部に可燃材料を使わないため対象外' }] };
    const fl = nb(v, 'fl');
    const H = nb(v, 'H');
    const A = nb(v, 'area');
    if (Number.isNaN(fl) && Number.isNaN(H) && Number.isNaN(A)) return null;
    const lines: CalcLine[] = [];
    const go: string[] = [];
    if (fl >= 4) go.push(`1 号:地上 ${fl} 階(4 以上)`);
    if (H > 16) go.push(`2 号:高さ ${f1(H)} m(16m 超)`);
    if (on(v, 'kou56') && H > 13) go.push(`3 号:(5)(6) 項の特殊建築物で高さ ${f1(H)} m(13m 超)`);
    const big = A > 3000;
    const blank = [Number.isNaN(fl) && '地上階数', Number.isNaN(H) && '高さ', Number.isNaN(A) && '延べ面積'].filter(Boolean) as string[];
    if (go.length) {
      lines.push({ k: '法 21 条 1 項', v: go.join(' / ') });
      lines.push({
        k: '1 項の構造',
        v: on(v, 'yard')
          ? '周囲に延焼防止上有効な空地があるため 1 項は適用しない(ただし書・令 109 条の 6)'
          : '特定主要構造部を火災時倒壊防止構造(通常火災終了時間。令和元年国交告第 193 号)か耐火構造等とする',
      });
    }
    if (big) lines.push({ k: '法 21 条 2 項', v: `延べ ${f1(A)} m²(3,000m² 超):令 109 条の 7 のいずれか、または火熱遮断壁等で別の建築物とみなせる部分に分ける` });
    if (blank.length) lines.push({ k: '未入力', v: `${blank.join('・')}が空欄のため、その号は判定していません` });
    const need1 = go.length > 0 && !on(v, 'yard');
    const summary = need1 && big ? '1 項・2 項とも対象' : need1 ? '1 項の対象(火災時倒壊防止構造等)' : big ? '2 項の対象(延べ 3,000m² 超)' : blank.length ? '一部未判定' : '法 21 条の対象外';
    if (!go.length && !big) lines.push({ k: '規模', v: '地上 4 階未満・高さ 16m 以下(倉庫・車庫は 13m 以下)・延べ 3,000m² 以下' });
    return { verdict: need1 || big ? 'info' : blank.length ? 'info' : 'ok', summary, lines };
  },
};

/* ───────── 接道(法 42 条・43 条) ───────── */
const access: CalcSpec = {
  title: '接道と 2 項道路の後退の判定',
  fields: [
    {
      k: 'kind',
      label: '接する道の種別',
      kind: 'sel',
      options: [
        ['1', '法 42 条 1 項の道路(幅員 4m 以上。指定区域は 6m 以上)'],
        ['2', '法 42 条 2 項の道路(幅員 4m 未満のみなし道路)'],
        ['0', '道路に当たらない道・通路'],
      ],
      hint: '役所の道路台帳・指定道路図で確かめる',
    },
    { k: 'w', label: '道の現況の幅員', kind: 'num', unit: 'm', step: 0.01, def: (p) => (p.road && p.road > 0 ? String(p.road) : '') },
    { k: 'len', label: '敷地が道路に接する長さ', kind: 'num', unit: 'm', step: 0.01, hint: '路地状敷地は路地状部分の最も狭い幅' },
    { k: 'cliff', label: '道の反対側が崖・川・線路敷など(片側後退)', kind: 'bool' },
    { k: 'six', label: '特定行政庁が幅員 6m を指定した区域(2 項道路は中心から 3m)', kind: 'bool' },
  ],
  note: '自動車専用道路・地区計画の一部の道路は接道に数えません(法 43 条 1 項)。特殊建築物・階数 3 以上・延べ 1000m² 超・無窓居室のある建物・袋路状道路だけに接する敷地などは、条例で接道の長さや道路の幅員が上乗せされます(法 43 条 3 項。東京都建築安全条例など)。',
  run(v, p) {
    const kind = v.kind;
    const w = n(v, 'w');
    const len = n(v, 'len');
    if (!kind && !(len > 0)) return null;
    const lines: CalcLine[] = [];
    const ngs: string[] = [];
    if (kind === '0') {
      ngs.push('道路でない');
      lines.push({ k: '道の種別', v: '建築基準法の道路に当たらないため、法 43 条 2 項 1 号の認定か 2 号の許可(建築審査会の同意)が要る', ng: true });
    }
    if (len >= 0 && v.len !== undefined && v.len !== '') {
      const ng = len + 1e-9 < 2;
      if (ng) ngs.push('接道 2m 未満');
      lines.push({ k: '接道の長さ', v: `${f2(len)} m(2 m 以上。法 43 条 1 項)`, ng });
      // 物件条件に条例の接道の長さを入れたときだけ(法 43 条 3 項の上乗せ)
      const acc = strictestOf(overlaysOf(p), 'access');
      if (acc) {
        const ngA = len + 1e-9 < acc.v;
        if (ngA) ngs.push('条例の接道の長さ');
        lines.push({ k: '条例の接道の長さ', v: `${f2(acc.v)} m 以上(${acc.label}。法 43 条 3 項)`, ng: ngA });
      }
    }
    if (kind === '2' && w > 0) {
      const half = on(v, 'six') ? 3 : 2;
      if (on(v, 'cliff')) {
        lines.push({
          k: '後退',
          v: on(v, 'six')
            ? '崖・川などに沿う道の扱いは、指定区域では特定行政庁に確かめる'
            : `崖・川などの道の側の境界線から 4m の線まで、敷地側で ${f2(Math.max(0, 4 - w))} m 後退(法 42 条 2 項ただし書)`,
        });
      } else {
        lines.push({ k: '後退', v: `道の中心線から ${half}m の線まで、敷地側で約 ${f2(Math.max(0, half - w / 2))} m 後退(中心線が現況の中央にあるとして。法 42 条 2 項)` });
      }
      lines.push({ k: '後退部分', v: '敷地面積に入れない(令 2 条 1 項 1 号)。塀・門・擁壁も後退部分に造れない(法 44 条)' });
      lines.push({ k: '容積率の前面道路', v: `後退後の ${half * 2} m として計算する` });
    } else if (kind === '1' && w > 0 && w < 4) {
      lines.push({ k: '幅員', v: `${f2(w)} m は 1 項道路の 4m に足りません。種別を道路台帳で確かめる`, ng: true });
      ngs.push('幅員');
    }
    return { verdict: ngs.length ? 'ng' : 'ok', summary: ngs.length ? `要確認(${ngs.join('・')})` : '接道は適合', lines };
  },
};

/* ───────── 高さ(法 55 条・56 条 1 項 3 号・58 条・地区計画・建築協定・条例)。2026-11-16 ─────────
 * 高さの制限は法 91 条の対象外なので、建築物がかかる敷地の部分ごとに、その部分の地域・高度地区で見る。 */
const heightParts = (p: Project) => {
  const ps = partsOf(p).map((x, i) => ({ x, i }));
  const on = ps.filter((o) => o.x.bldg);
  return on.length ? on : ps;
};
/** 北側の距離を使う制限がある部分か(低層住居系・中高層住居専用の北側斜線、高度地区の斜線) */
const usesNorth = (x: SitePart) => isLowZone(x.zone) || isMidZone(x.zone) || !!(x.hd && x.hd.rise > 0 && x.hd.grad > 0);
/** 隣地斜線の立上り(法 56 条 1 項 2 号。低層住居系・田園住居はかからない) */
function neighborRise(zone: string): number | null {
  if (isLowZone(zone)) return null;
  if (isMidZone(zone) || ['第一種住居地域', '第二種住居地域', '準住居地域', '用途地域の指定のない区域'].includes(zone)) return 20;
  return 31;
}

const height: CalcSpec = {
  title: '高さの判定(絶対高さ・北側斜線・高度地区・地区計画など)',
  fields: [
    {
      k: 'abs',
      label: '低層住居系の絶対高さの限度(都市計画で定めた値)',
      kind: 'sel',
      options: [
        ['10', '10 m'],
        ['12', '12 m'],
      ],
      hint: '第一種・第二種低層住居専用地域・田園住居地域の部分だけに使う。空欄なら 10m で判定(法 55 条 1 項)',
    },
  ],
  more: (p) => {
    const multi = partsOf(p).length > 1;
    return heightParts(p).flatMap(({ x, i }): Field[] => {
      const pre = multi ? `部分 ${i + 1}(${x.zone}):` : '';
      const out: Field[] = [
        { k: `h${i}`, label: `${pre}建築物の最も高い部分の高さ`, kind: 'num', unit: 'm', step: 0.1, def: (pp) => (pp.H > 0 ? String(pp.H) : ''), hint: multi ? 'この部分にある建築物の部分の最高の高さ(地盤面から)。初期値は物件の高さ' : '地盤面から。初期値は物件の高さ' },
      ];
      if (usesNorth(x)) {
        out.push(
          { k: `l${i}`, label: `${pre}その部分から真北方向の隣地境界線(道路の反対側の境界線)までの水平距離`, kind: 'num', unit: 'm', step: 0.1, hint: '北側斜線と高度地区の斜線に使う' },
          { k: `hn${i}`, label: `${pre}北側の外壁の上端(軒先・パラペット)の高さ`, kind: 'num', unit: 'm', step: 0.1, hint: '斜線は北側に近い部分で効くことが多い。2 点目として入れる' },
          { k: `ln${i}`, label: `${pre}北側の外壁の上端から真北方向の境界線までの水平距離`, kind: 'num', unit: 'm', step: 0.1 },
        );
      }
      return out;
    });
  },
  note:
    '高さは地盤面から(令 2 条 1 項 6 号)。北側斜線と、北側の高さの最高限度を定めた高度地区の高さには階段室などの屋上部分も入れ、絶対高さ(法 55 条)では水平投影面積が建築面積の 1/8 以内なら 5m まで入れません(同号ロ)。高度地区の数値・測り方・緩和は都市計画の定めによるので、物件条件の「敷地の地域」に部分ごとに入れます。斜線は入れた点だけを見ており、敷地と道路・隣地の高低差や北側の道路などの緩和(令 135 条の 4 ほか)、天空率(法 56 条 7 項)は見ていません。道路斜線・隣地斜線は設計ツールの「斜線制限」で確かめます。建築物が 2 以上の地域にわたるときは、部分ごとにその部分がある地域の規定で見ます(法 91 条の対象外・法 56 条 5 項)。',
  run(v, p) {
    const hp = heightParts(p);
    const multi = partsOf(p).length > 1;
    const ovs = overlaysOf(p);
    const capH = strictestOf(ovs, 'hMax');
    const minH = strictestOf(ovs, 'hMin');
    const absLim = v.abs === '12' ? 12 : 10;
    const lines: CalcLine[] = [];
    const checks: string[] = [];
    const ngs: string[] = [];
    let worst: { lim: number; label: string; margin: number } | null = null;
    let any = false;
    for (const { x, i } of hp) {
      const H = nb(v, `h${i}`);
      const tag = multi ? `部分 ${i + 1}(${x.zone})` : x.zone;
      if (!(H > 0)) {
        checks.push(`${tag}:建築物の高さが未入力`);
        continue;
      }
      const L = nb(v, `l${i}`);
      const hn = nb(v, `hn${i}`);
      const ln = nb(v, `ln${i}`);
      const pts = [{ h: H, L, what: '最も高い部分' }, ...(hn > 0 && ln >= 0 ? [{ h: hn, L: ln, what: '北側の外壁の上端' }] : [])].filter((q) => q.L >= 0);
      const items: Array<{ name: string; lim: number; h: number; how: string; min?: boolean }> = [];
      if (isLowZone(x.zone)) items.push({ name: '絶対高さ(法 55 条 1 項)', lim: absLim, h: H, how: `${absLim} m${v.abs ? '' : '(限度が未選択のため 10m)'}` });
      // 北側斜線。中高層住居専用地域で日影規制(別表第 4 の二の項)の指定がある区域は除く(法 56 条 1 項 3 号かっこ書)
      const midShade = isMidZone(x.zone) && shadeRule(x.shade)?.kou === '2';
      if (isLowZone(x.zone) || (isMidZone(x.zone) && !midShade)) {
        const base = isLowZone(x.zone) ? 5 : 10;
        if (!pts.length) checks.push(`${tag}:北側斜線(${base}m + 1.25 × 真北方向の水平距離。法 56 条 1 項 3 号)は真北方向の距離を入れると判定`);
        for (const q of pts) items.push({ name: `北側斜線・${q.what}(法 56 条 1 項 3 号)`, lim: base + 1.25 * q.L, h: q.h, how: `${base} + 1.25 × ${r2(q.L)} = ${r2(base + 1.25 * q.L)} m` });
      } else if (midShade) {
        lines.push({ k: `${multi ? `${tag}:` : ''}北側斜線`, v: '日影規制(別表第 4 の二の項)が指定された区域のため、法 56 条 1 項 3 号の北側斜線はかからない' });
      }
      // 高度地区(法 58 条)
      const hd = x.hd;
      if (hd && hasHd(hd)) {
        const nm = hd.name?.trim() || '高度地区';
        const slant = hd.rise > 0 && hd.grad > 0;
        if (hd.max > 0) items.push({ name: `${nm}の最高限度(法 58 条)`, lim: hd.max, h: H, how: `${hd.max} m` });
        if (slant) {
          if (!pts.length) checks.push(`${tag}:${nm}の斜線は真北方向の距離を入れると判定`);
          for (const q of pts) {
            const s = hdSlant(hd, q.L)!;
            items.push({ name: `${nm}の斜線・${q.what}(法 58 条)`, lim: s.lim, h: q.h, how: s.how });
          }
        }
        if (hd.min > 0) items.push({ name: `${nm}の最低限度(法 58 条)`, lim: hd.min, h: H, how: `${hd.min} m 以上`, min: true });
        if (!(hd.max > 0) && !(hd.min > 0) && !slant) checks.push(`${tag}:${nm}の数値が未入力のため要確認。都市計画で定めた最高限度・斜線を物件条件に入れる(法 58 条)`);
      }
      if (capH) items.push({ name: `${capH.label}の高さの最高限度`, lim: capH.v, h: H, how: `${capH.v} m(${capH.basis})` });
      if (minH) items.push({ name: `${minH.label}の高さの最低限度`, lim: minH.v, h: H, how: `${minH.v} m 以上(${minH.basis})`, min: true });
      const nr = neighborRise(x.zone);
      if (nr !== null && H > nr) checks.push(`${tag}:高さ ${r2(H)} m が ${nr} m を超えるので、隣地斜線(${nr === 20 ? '20m + 1.25' : '31m + 2.5'} × 隣地境界線までの水平距離。法 56 条 1 項 2 号)を設計ツールの「斜線制限」で確かめる`);
      for (const it of items) {
        any = true;
        const ng = it.min ? it.h + 1e-9 < it.lim : it.h > it.lim + 1e-9;
        const name = `${multi ? `${tag}:` : ''}${it.name}`;
        lines.push({ k: name, v: `${it.min ? '' : '限度 '}${it.how} · 計画 ${r2(it.h)} m${ng ? (it.min ? '(不足)' : `(${r2(it.h - it.lim)} m 超過)`) : ''}`, ng });
        if (ng) ngs.push(name);
        if (!it.min && (!worst || it.lim - it.h < worst.margin)) worst = { lim: it.lim, label: name, margin: it.lim - it.h };
      }
    }
    if (worst) lines.push({ k: '最も厳しい制限', v: `${worst.label}:${r2(worst.lim)} m(${worst.margin >= 0 ? `余裕 ${r2(worst.margin)} m` : `${r2(-worst.margin)} m 超過`})` });
    checks.forEach((c, j) => lines.push({ k: `要確認 ${j + 1}`, v: c }));
    lines.push({ k: '道路斜線', v: '前面道路の幅員・後退距離・容積率で決まる(法 56 条 1 項 1 号・別表第 3)。設計ツールの「斜線制限」で確かめる' });
    if (!any && !checks.length && !hp.some(({ i }) => nb(v, `h${i}`) > 0)) return null;
    const ng = ngs.length > 0;
    return {
      verdict: ng ? 'ng' : checks.length ? 'info' : 'ok',
      summary: ng
        ? `超過(${ngs.length} 件)`
        : worst
          ? `適合 · 最も厳しいのは ${r2(worst.lim)} m${checks.length ? '(一部要確認)' : ''}`
          : checks.length
            ? '要確認'
            : '絶対高さ・北側斜線・高度地区の制限なし(道路斜線は別)',
      lines,
    };
  },
};

/* ───────── 日影規制(法 56 条の 2・別表第 4・令 135 条の 13)。2026-11-16 ───────── */
const SHADE_OPTS: Array<[string, string]> = [['none', '条例の指定なし'], ...ALL_SHADE_RULES.map((r): [string, string] => [r.key, shadeLabel(r, true)])];

const shade: CalcSpec = {
  title: '日影規制の判定(区域ごと)',
  fields: [
    { k: 'H', label: '建築物の高さ', kind: 'num', unit: 'm', step: 0.1, def: (p) => (p.H > 0 ? String(p.H) : ''), hint: '屋上の階段室などは建築面積の 1/8 以内なら 5m まで入れない(令 2 条 1 項 6 号ロ。二・三の項・四の項ロ)' },
    { k: 'eave', label: '軒の高さ', kind: 'num', unit: 'm', step: 0.1, hint: '低層住居系・田園住居・用途地域の指定のない区域(イ)の対象(軒の高さ 7m 超か地上 3 階以上)に使う' },
    { k: 'fl', label: '地上階数(地階を除く)', kind: 'num', unit: '階', step: 1, def: (p) => (p.fl > 0 ? String(p.fl) : '') },
    { k: 'hok', label: '北海道の区域内(9〜15 時・規制時間が短い)', kind: 'bool' },
    { k: 'nz', label: '敷地の外で日影が落ちる別の区域の用途地域', kind: 'sel', options: ZONES.map((z): [string, string] => [z, z]), hint: '道路の向かい・隣地が、敷地と違う用途地域や規制の区域のとき(令 135 条の 13)' },
    { k: 'ns', label: 'その区域の日影規制(条例の指定)', kind: 'sel', options: SHADE_OPTS },
  ],
  more: (p, v) => {
    const ps = partsOf(p);
    const multi = ps.length > 1;
    const out: Field[] = [];
    const hint = '日影図で、その区域の測定面(規制の欄の高さ)に生じる日影の最も長い時間';
    ps.forEach((x, i) => {
      if (!isShadeZone(x.zone)) return;
      const pre = multi ? `部分 ${i + 1}(${x.zone})の側:` : '';
      out.push(
        { k: `t5_${i}`, label: `${pre}敷地境界線から 5m を超え 10m 以内の範囲の日影時間`, kind: 'num', unit: '時間', step: 0.1, hint },
        { k: `t10_${i}`, label: `${pre}10m を超える範囲の日影時間`, kind: 'num', unit: '時間', step: 0.1 },
      );
    });
    if (v.nz && isShadeZone(v.nz)) {
      out.push(
        { k: 't5_n', label: `別の区域(${v.nz}):5m を超え 10m 以内の範囲の日影時間`, kind: 'num', unit: '時間', step: 0.1, hint },
        { k: 't10_n', label: `別の区域(${v.nz}):10m を超える範囲の日影時間`, kind: 'num', unit: '時間', step: 0.1 },
      );
    }
    return out;
  },
  note:
    '規制時間と測定面は、物件条件の「敷地の地域」に部分ごとの条例の指定を入れます。建築物が日影時間の制限の異なる区域にわたるときは建築物がある各区域内に、建築物がある区域の外に日影を落とすときは日影が落ちる各区域内に、それぞれ建築物があるものとして、その区域の対象建築物・測定面・規制時間で判定します(令 135 条の 13)。対象区域の外にある高さ 10m 超の建築物が対象区域に日影を落とすときは、対象区域内にあるものとみなします(法 56 条の 2 第 4 項)。敷地の部分の側に落ちる日影は、その部分と同じ区域に落ちるとして扱っています。日影時間は設計ツールの「日影規制」などで出した値を入れます。道路・水面に接する敷地や高低差の緩和(令 135 条の 12)、同じ敷地の 2 以上の建築物(法 56 条の 2 第 2 項)は日影図の側で扱います。',
  run(v, p) {
    const H = nb(v, 'H');
    if (!(H > 0)) return null;
    const ps = partsOf(p);
    const multi = ps.length > 1;
    const regions: ShadeRegion[] = ps.map((x, i) => ({
      label: multi ? `部分 ${i + 1}(${x.zone})の側` : `敷地の周り(${x.zone})`,
      zone: x.zone,
      shade: x.shade,
      own: true,
      bldg: x.bldg,
      t5: nb(v, `t5_${i}`),
      t10: nb(v, `t10_${i}`),
    }));
    if (v.nz) regions.push({ label: `別の区域(${v.nz})`, zone: v.nz, shade: v.ns || undefined, own: false, bldg: false, t5: nb(v, 't5_n'), t10: nb(v, 't10_n') });
    const fl = nb(v, 'fl');
    const hok = on(v, 'hok');
    const res = shadeJudge(regions, { H, eave: nb(v, 'eave'), fl: fl >= 0 ? fl : 0, hokkaido: hok });
    const lines: CalcLine[] = [];
    for (const r of res.rows) {
      const t = r.region.t5 >= 0 || r.region.t10 >= 0 ? ` · 計画 ${r.region.t5 >= 0 ? f1(r.region.t5) : '—'} 時間 / ${r.region.t10 >= 0 ? f1(r.region.t10) : '—'} 時間` : '';
      let text: string;
      if (r.status === 'out' || r.status === 'unset') text = r.why;
      else if (r.status === 'notsub') text = `対象外(${r.why})`;
      else if (r.status === 'unknown') text = `${shadeLabel(r.rule!, true, hok)} · 要確認(${r.why})`;
      else text = `${shadeLabel(r.rule!, true, hok)} · ${r.why}${t || ' · 日影時間を入れると判定'}`;
      lines.push({ k: r.region.label, v: text, ng: r.status === 'ng' });
    }
    const ruled = res.rows.filter((r) => r.rule && r.status !== 'notsub' && r.status !== 'out');
    if (new Set(ruled.map((r) => r.rule!.key)).size > 1 || (ruled.length > 0 && regions.some((r) => !r.own))) {
      lines.push({ k: '区域にわたる日影(令 135 条の 13)', v: '区域ごとに、その区域内に建築物があるものとして、その区域の対象建築物・測定面・規制時間で判定' });
    }
    if (!res.inTarget && H > 10 && ruled.length) lines.push({ k: '法 56 条の 2 第 4 項', v: '対象区域の外にある高さ 10m 超の建築物なので、対象区域に落ちる日影は対象区域内にあるものとして判定' });
    if (res.strictest && ruled.length > 1) lines.push({ k: '最も厳しい区域', v: `${res.strictest.region.label}:${shadeLabel(res.strictest.rule!, true, hok)}` });
    const ngRows = res.rows.filter((r) => r.status === 'ng');
    const live = res.rows.some((r) => ['ok', 'ng', 'nodata', 'unknown', 'unset'].includes(r.status));
    return {
      verdict: res.verdict,
      summary: ngRows.length
        ? `超過(${ngRows.map((r) => r.region.label).join('・')})`
        : !live
          ? '日影規制の対象外'
          : res.verdict === 'ok'
            ? `適合${res.strictest && ruled.length > 1 ? ` · 最も厳しいのは${res.strictest.region.label}` : ''}`
            : '一部未判定(規制の指定か日影時間が未入力)',
      lines,
    };
  },
};

/* ───────── 高度地区・地区計画・建築協定・条例の一覧と、壁面の位置・敷地面積の最低限度。2026-11-16 ───────── */
const overlayCheck: CalcSpec = {
  title: '物件条件に入れた上乗せの制限の確認',
  fields: [
    { k: 'wallD', label: '外壁・柱から敷地境界線(道路境界線)までの最小の水平距離', kind: 'num', unit: 'm', step: 0.01, hint: '壁面の位置の制限と比べる。制限が道路側だけなど方向で違うときは、その方向の距離を入れる' },
  ],
  note:
    '高度地区は都市計画で定めた内容に適合させます(法 58 条)。地区計画は、地区整備計画の内容を市町村が条例にしたもの(法 68 条の 2・令 136 条の 2 の 5)が建築基準法に基づく制限として確認申請で審査されます。地区計画の区域内の建築は、着手の 30 日前までに市町村長への届出が要り、地区計画に適合しないときは勧告されます(都市計画法 58 条の 2。除外は同条 1 項ただし書)。建築協定(法 69 条)の基準は協定書で確かめます。数値は「建蔽率・容積率の算定」「高さ制限・斜線の検討」でも使います。',
  run(v, p) {
    const ps = partsOf(p);
    const multi = ps.length > 1;
    const ovs = overlaysOf(p);
    const hds = ps.map((x, i) => ({ x, i })).filter(({ x }) => hasHd(x.hd));
    if (!hds.length && !ovs.length) {
      return {
        verdict: 'info',
        summary: '入力なし',
        lines: [{ k: '物件条件', v: '高度地区は「敷地の地域」の各行に、地区計画・建築協定・条例は「地区計画・建築協定・条例」に入れると、建蔽率・容積率・高さの判定に反映します。都市計画図・計画書・協定書・条例で確かめる' }],
      };
    }
    const lines: CalcLine[] = [];
    const ngs: string[] = [];
    let pending = false;
    for (const { x, i } of hds) {
      const hd = x.hd!;
      const nums = [hd.max > 0 && `最高限度 ${hd.max} m`, hd.rise > 0 && hd.grad > 0 && `斜線 ${hd.rise} m + ${hd.grad} × L${hd.brk > 0 && hd.grad2 > 0 ? `(L > ${hd.brk} m は ${hd.grad2})` : ''}`, hd.min > 0 && `最低限度 ${hd.min} m`].filter(Boolean);
      if (!nums.length) pending = true;
      lines.push({ k: `${multi ? `部分 ${i + 1}の` : ''}${hd.name?.trim() || '高度地区'}`, v: `${nums.length ? nums.join(' · ') : '数値が未入力(要確認)'}(法 58 条。「高さ制限・斜線の検討」で判定)` });
    }
    const site = siteAreaOf(ps);
    const wallD = nb(v, 'wallD');
    for (const o of ovs) {
      const x = o.o;
      const nums = [x.bc > 0 && `建蔽率 ${x.bc} %`, x.far > 0 && `容積率 ${x.far} %`, x.hMax > 0 && `高さ ${x.hMax} m 以下`, x.hMin > 0 && `高さ ${x.hMin} m 以上`, x.access && x.access > 0 && `接道 ${x.access} m 以上`].filter(Boolean);
      lines.push({ k: o.label, v: `${o.basis}${nums.length ? ` · ${nums.join(' · ')}` : ''}` });
      if (x.uses?.trim()) {
        pending = true;
        lines.push({ k: `${o.label}:用途の制限`, v: `${x.uses.trim()}(要確認。「用途地域による用途の制限」と合わせて確かめる)` });
      }
      if (x.minSite > 0) {
        const ng = site > 0 && site + 1e-9 < x.minSite;
        if (!(site > 0)) pending = true;
        if (ng) ngs.push('敷地面積の最低限度');
        lines.push({ k: `${o.label}:敷地面積の最低限度`, v: `${f1(x.minSite)} m²${site > 0 ? ` · 敷地 ${f1(site)} m²${ng ? '(不足)' : ''}` : '(敷地面積が未入力)'}`, ng });
      }
      if (x.wall > 0) {
        const has = wallD >= 0;
        const ng = has && wallD + 1e-9 < x.wall;
        if (!has) pending = true;
        if (ng) ngs.push('壁面の位置');
        lines.push({ k: `${o.label}:壁面の位置の制限`, v: `${f2(x.wall)} m${has ? ` · 計画 ${f2(wallD)} m${ng ? '(不足)' : ''}` : '(外壁までの距離を入れると判定)'}`, ng });
      }
      if (x.text?.trim()) {
        pending = true;
        lines.push({ k: `${o.label}:内容`, v: `${x.text.trim()}(要確認)` });
      }
      if (o.key === 'dp') lines.push({ k: `${o.label}:届出`, v: `着手の 30 日前までに市町村長へ届出(都市計画法 58 条の 2)${x.byLaw ? '。条例にした事項は確認申請でも審査される(法 68 条の 2)' : '。条例にしていない事項は確認申請の審査の外で、届出・勧告で扱われる'}` });
    }
    const ng = ngs.length > 0;
    return {
      verdict: ng ? 'ng' : pending ? 'info' : 'ok',
      summary: ng ? `不適合(${ngs.join('・')})` : pending ? '要確認あり' : '入力した数値の範囲で適合',
      lines,
    };
  },
};

/** 項目のキー(masters.ts の itemKey)→ 判定 */
export const CALCS: Record<string, CalcSpec> = {
  'design|建蔽率・容積率の算定': coverage,
  'design|高度地区・地区計画・条例の確認': overlayCheck,
  'design|高さ制限・斜線の検討': height,
  'design|日影規制の検討': shade,
  'design|接道・前面道路の確認': access,
  'design|防火地域・準防火地域の構造制限': fireStruct,
  'design|特殊建築物の耐火要求(法27条)': art27,
  'design|大規模木造の主要構造部(法21条)': art21,
  'design|採光・換気の検討': daylight,
  'design|階段の寸法': stair,
  'design|避難経路・歩行距離': walk,
  'design|確認申請・適合性判定の要否': confirm,
  'struct|構造計算ルートの判定': structRoute,
  'elec|照度計算': lux,
  'elec|幹線サイズ・電圧降下': vdrop,
  'elec|非常用エレベーターの要否': emergencyEv,
  'elec|避雷設備の要否': lightning,
};
