/**
 * 物件カルテ:項目の中でその場で済ませる簡単な判定。2026-11-14
 *
 * 1 項目 = 入力欄の並び(fields)+ 判定(run)。入力は文字列のまま項目の記録(ItemRec.vals)に残す。
 * 物件の条件(用途地域・防火地域・高さなど)から決まる値は初期値として入れる。
 * 判定は法令の「一般的な場合」だけを見る。特定行政庁の指定・条例・告示の緩和は判定の外で、
 * 画面の注記(note)に書く。
 */
import { ZONES, type Project } from './masters';

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
  run: (v: Vals, p: Project) => CalcOut | null;
  note?: string;
};

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

/** 住居系の用途地域(ZONES の先頭 7 つ。法 52 条 2 項の 0.4、令 20 条の 6・1.4 の側) */
const isResidential = (zone: string) => ZONES.indexOf(zone) >= 0 && ZONES.indexOf(zone) <= 6;
const isIndustrial = (zone: string) => ['準工業地域', '工業地域', '工業専用地域'].includes(zone);

/** 初期値:物件の条件から引ける値だけ */
export function defaults(spec: CalcSpec, p: Project): Vals {
  const out: Vals = {};
  for (const f of spec.fields) if (f.def) out[f.k] = f.def(p);
  return out;
}

/* ───────── 建蔽率・容積率(法 52 条・53 条) ───────── */
const coverage: CalcSpec = {
  title: '建蔽率・容積率の判定',
  fields: [
    { k: 'site', label: '敷地面積', kind: 'num', unit: 'm²', step: 0.01 },
    { k: 'bldg', label: '建築面積', kind: 'num', unit: 'm²', step: 0.01 },
    { k: 'floor', label: '容積対象の延べ面積', kind: 'num', unit: 'm²', step: 0.01, def: (p) => (p.area ? String(p.area) : ''), hint: '駐車場・備蓄倉庫・共同住宅の共用廊下などの不算入分を除いた面積' },
    { k: 'bc', label: '指定建蔽率', kind: 'num', unit: '%', step: 10 },
    { k: 'far', label: '指定容積率', kind: 'num', unit: '%', step: 10 },
    { k: 'road', label: '前面道路の幅員(最大のもの)', kind: 'num', unit: 'm', step: 0.1 },
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
    '前面道路が 12m 未満のときは、幅員 × 0.4(住居系)/ 0.6(その他)と指定容積率の小さい方。特定行政庁が別の係数を定めた区域、特定道路による緩和(法 52 条 9 項)、地区計画は判定の外です。',
  run(v, p) {
    const site = n(v, 'site');
    const bldg = n(v, 'bldg');
    const floor = n(v, 'floor');
    const bc = n(v, 'bc');
    const far = n(v, 'far');
    if (!(site > 0) || !(bldg >= 0) || !(bc > 0)) return null;
    const lines: CalcLine[] = [];

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
    const bcNow = (bldg / site) * 100;
    const bcNg = bcNow > bcMax + 1e-9;
    lines.push({ k: '建蔽率', v: `${f1(bcNow)} %(建築面積 ${f1(bldg)} ÷ 敷地 ${f1(site)})` });
    lines.push({
      k: '建蔽率の上限',
      v: unlimited ? '制限なし(指定 80% の防火地域内の耐火建築物等)' : `${f1(bcMax)} %${reasons.length ? `(指定 ${bc} / ${reasons.join(' · ')})` : ''}`,
      ng: bcNg,
    });

    let farNg = false;
    if (far > 0 && floor >= 0) {
      const road = n(v, 'road');
      const k = isResidential(p.zone) ? 0.4 : 0.6;
      const byRoad = road > 0 && road < 12 ? road * k * 100 : Infinity;
      const farMax = Math.min(far, byRoad);
      const farNow = (floor / site) * 100;
      farNg = farNow > farMax + 1e-9;
      lines.push({ k: '容積率', v: `${f1(farNow)} %(延べ ${f1(floor)} ÷ 敷地 ${f1(site)})` });
      lines.push({
        k: '容積率の上限',
        v: `${f1(farMax)} %${Number.isFinite(byRoad) ? `(指定 ${far} と 道路 ${road}m × ${k} = ${f1(byRoad)} の小さい方)` : `(指定 ${far})`}`,
        ng: farNg,
      });
      lines.push({ k: '残りの延べ面積', v: left((farMax / 100) * site - floor) });
    }
    lines.push({ k: '残りの建築面積', v: unlimited ? '—' : left((bcMax / 100) * site - bldg) });
    const ng = bcNg || farNg;
    return {
      verdict: ng ? 'ng' : 'ok',
      summary: ng ? `超過(${[bcNg && '建蔽率', farNg && '容積率'].filter(Boolean).join('・')})` : '適合',
      lines,
    };
  },
};

/* ───────── 採光・換気(法 28 条・令 19 条・20 条) ───────── */
const daylight: CalcSpec = {
  title: '採光・換気の判定(居室 1 室)',
  fields: [
    {
      k: 'ratio',
      label: '居室の種類(必要な割合)',
      kind: 'sel',
      options: [
        ['7', '住宅の居室・病室・寄宿舎の寝室など(1/7)'],
        ['5', '幼稚園・小中高の教室・保育所の保育室(1/5)'],
        ['10', '大学等の教室・病院の談話室など(1/10)'],
        ['10h', '住宅の居室で床面 50lx 以上の照明を設ける(1/10)'],
      ],
      def: () => '7',
    },
    { k: 'floor', label: '居室の床面積', kind: 'num', unit: 'm²', step: 0.01 },
    { k: 'win', label: '窓の面積', kind: 'num', unit: 'm²', step: 0.01 },
    { k: 'd', label: 'd:窓の直上の庇・壁から隣地境界線までの水平距離', kind: 'num', unit: 'm', step: 0.1, hint: '道に面する窓は道の反対側の境界線まで' },
    { k: 'h', label: 'h:窓の中心から直上の庇・壁までの垂直距離', kind: 'num', unit: 'm', step: 0.1 },
    { k: 'road', label: '道に面する窓', kind: 'bool' },
    { k: 'sky', label: '天窓', kind: 'bool' },
    { k: 'vent', label: '開けられる部分の面積(換気)', kind: 'num', unit: 'm²', step: 0.01, hint: '引違い窓はおおむね窓面積の 1/2' },
  ],
  note:
    '採光補正係数は用途地域で式が変わります(住居系 d/h×6−1.4・工業系 d/h×8−1・商業系と無指定 d/h×10−1、上限 3.0)。事務所・ホテルの客室などは採光の規定がありません(無窓居室の扱いは別に確認)。換気は機械換気(令 20 条の 2)を設ければ窓の 1/20 は不要です。',
  run(v, p) {
    const floor = n(v, 'floor');
    const win = n(v, 'win');
    if (!(floor > 0) || !(win >= 0)) return null;
    const d = n(v, 'd');
    const h = n(v, 'h');
    const lines: CalcLine[] = [];
    // 採光補正係数
    let a: number;
    let b: number;
    let dMin: number;
    if (isResidential(p.zone)) [a, b, dMin] = [6, 1.4, 7];
    else if (isIndustrial(p.zone)) [a, b, dMin] = [8, 1, 5];
    else [a, b, dMin] = [10, 1, 4];
    let k: number;
    let how: string;
    if (d > 0 && h > 0) {
      k = (d / h) * a - b;
      how = `${f2(d)}/${f2(h)}×${a}−${b} = ${f2(k)}`;
      if (on(v, 'road') && k < 1) {
        k = 1;
        how += ' → 道に面するので 1.0';
      } else if (!on(v, 'road') && d >= dMin && k < 1) {
        k = 1;
        how += ` → d ≥ ${dMin}m なので 1.0`;
      } else if (k < 0) {
        k = 0;
        how += ' → 0';
      }
    } else {
      k = 1;
      how = 'd・h 未入力のため 1.0 と仮定';
    }
    if (on(v, 'sky')) {
      k *= 3;
      how += ' ×3(天窓)';
    }
    if (k > 3) {
      k = 3;
      how += ' → 上限 3.0';
    }
    const den = parseFloat(v.ratio || '7');
    const need = floor / den;
    const eff = win * k;
    const ngL = eff + 1e-9 < need;
    lines.push({ k: '採光補正係数', v: how });
    lines.push({ k: '有効採光面積', v: `${f2(eff)} m²(窓 ${f2(win)} × ${f2(k)})` });
    lines.push({ k: `必要(床面積の 1/${den})`, v: `${f2(need)} m²`, ng: ngL });
    let ngV = false;
    const vent = n(v, 'vent');
    if (vent >= 0) {
      const needV = floor / 20;
      ngV = vent + 1e-9 < needV;
      lines.push({ k: '換気に有効な面積', v: `${f2(vent)} m²` });
      lines.push({ k: '必要(床面積の 1/20)', v: `${f2(needV)} m²`, ng: ngV });
    }
    const ng = ngL || ngV;
    return { verdict: ng ? 'ng' : 'ok', summary: ng ? `不足(${[ngL && '採光', ngV && '換気'].filter(Boolean).join('・')})` : '適合', lines };
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
    { k: 'type', label: '階段の種類', kind: 'sel', options: Object.entries(STAIR).map(([k, s]) => [k, `(${k}) ${s.label}`]), def: (p) => (p.use === 'school' ? '1' : '4') },
    { k: 'w', label: '有効幅', kind: 'num', unit: 'cm', step: 1, hint: '手すりは幅 10cm まで無いものとして測る' },
    { k: 'r', label: 'けあげ', kind: 'num', unit: 'cm', step: 0.1 },
    { k: 't', label: '踏面', kind: 'num', unit: 'cm', step: 0.1, hint: '回り階段は狭い方の端から 30cm の位置で' },
    { k: 'rise', label: '踊場なしで上る高さ', kind: 'num', unit: 'm', step: 0.01 },
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
    if (r > 0 && t > 0) lines.push({ k: '参考 2R+T', v: `${f1(2 * r + t)} cm(上りやすさの目安 60〜65)` });
    return { verdict: ngs.length ? 'ng' : 'ok', summary: ngs.length ? `不適合(${ngs.join('・')})` : '適合', lines };
  },
};

/* ───────── 歩行距離(令 120 条) ───────── */
const WALK: Record<string, { label: string; fr: number; other: number; high: number }> = {
  a: { label: '無窓居室 / 物販・飲食店・遊技場など(法別表第 1(4)項)', fr: 30, other: 30, high: 20 },
  b: { label: '病院・診療所(病室)・ホテル・共同住宅・寄宿舎・福祉施設(同(2)項)', fr: 50, other: 30, high: 40 },
  c: { label: '上記以外(事務所など)', fr: 50, other: 40, high: 40 },
};
const walk: CalcSpec = {
  title: '直通階段までの歩行距離の判定',
  fields: [
    { k: 'room', label: '居室の種類', kind: 'sel', options: Object.entries(WALK).map(([k, s]) => [k, s.label]), def: (p) => (p.use === 'shop' || p.use === 'rest' ? 'a' : p.use === 'clinic' || p.use === 'hotel' || p.use === 'house' ? 'b' : 'c') },
    { k: 'fr', label: '主要構造部が準耐火構造・不燃材料', kind: 'bool', def: (p) => (p.str === 'w' ? '' : '1') },
    { k: 'fin', label: '居室と避難経路の壁・天井を準不燃で仕上げる', kind: 'bool', hint: '床から 1.2m 以下の壁は除く' },
    { k: 'high', label: '15 階以上の階', kind: 'bool' },
    { k: 'len', label: '最も遠い位置から直通階段までの歩行距離', kind: 'num', unit: 'm', step: 0.1 },
  ],
  note: '共同住宅のメゾネット住戸(令 120 条 4 項)、避難安全検証法による適用除外は判定の外です。',
  run(v) {
    const s = WALK[v.room || 'c'];
    const len = n(v, 'len');
    if (!s || !(len > 0)) return null;
    let max: number;
    let how: string;
    if (!on(v, 'fr')) {
      max = s.other;
      how = '主要構造部がその他';
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
    { k: 'target', label: '目標の照度', kind: 'num', unit: 'lx', step: 50, def: (p) => (p.use === 'office' ? '750' : p.use === 'school' ? '500' : '500'), hint: 'JIS Z 9110 の推奨照度(事務室 750・教室 500・会議室 500 など)' },
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
    { k: 'volt', label: '標準電圧', kind: 'num', unit: 'V', step: 1, def: () => '100' },
    { k: 'i', label: '負荷電流', kind: 'num', unit: 'A', step: 1 },
    { k: 'l', label: '亘長(こう長)', kind: 'num', unit: 'm', step: 1 },
    { k: 'a', label: '電線の断面積', kind: 'num', unit: 'mm²', step: 1 },
    { k: 'lim', label: '許容する電圧降下', kind: 'num', unit: '%', step: 0.5, def: () => '2', hint: '幹線・分岐それぞれ 2%。亘長 60m 超は内線規程の表(4〜7%)' },
  ],
  note: 'e = K × L × I ÷(1000 × A)。K は単相 2 線 35.6・三相 3 線 30.8・単相 3 線と三相 4 線 17.8(電線 1 本と中性線の間)。力率・リアクタンスは見ない略算です。',
  run(v) {
    const s = VD[v.sys || '1p3w'];
    const I = n(v, 'i');
    const L = n(v, 'l');
    const A = n(v, 'a');
    const V = n(v, 'volt');
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

/** 項目のキー(masters.ts の itemKey)→ 判定 */
export const CALCS: Record<string, CalcSpec> = {
  'design|建蔽率・容積率の算定': coverage,
  'design|採光・換気の検討': daylight,
  'design|階段の寸法': stair,
  'design|避難経路・歩行距離': walk,
  'elec|照度計算': lux,
  'elec|幹線サイズ・電圧降下': vdrop,
  'elec|非常用エレベーターの要否': emergencyEv,
  'elec|避雷設備の要否': lightning,
};
