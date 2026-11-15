import React, { useMemo, useState } from 'react';

/**
 * 消防用設備等の設置の目安(消防法施行令 第 10 条〜第 29 条の 2・別表第一)。
 *
 * 2026-11-16 に e-Gov の消防法施行令の現行本文と照合して作り直した。それまでの誤り:
 *   - 消火器の延べ面積の基準を「耐火なら 2 倍」にしていた(倍読みは消火器の基準面積にはない。令 10 条は 150 / 300㎡ と用途で決まる)
 *   - 屋内消火栓の基準を「特定 700㎡ / 非特定 1,400㎡」にしていた((1)項 500、(2)〜(10)(12)(14)項 700、(11)(15)項 1,000㎡。倍読みは 2 倍・3 倍、令 11 条 2 項)
 *   - スプリンクラーを「(1)(2)項 3,000㎡」「(6)項ロ 275㎡」にしていた(平屋建以外で 6,000㎡、(4)項・(6)項イ(1)〜(3)は 3,000㎡。(6)項ロ(1)(3)は面積によらず)
 *   - 自動火災報知設備の (11)(15)項を 500㎡ にしていた(1,000㎡)、(6)項を一律「面積によらず」にしていた
 *   - 誘導灯を全用途「原則設置」、消防用水を「延べ 7,000㎡〜」としていた(条文に無い数値)
 *   - 用途区分に (16)項(複合用途)が無かった、収容人員が未入力でも「対象外の可能性」と出ていた
 * 地階・無窓階・各階の床面積で決まる基準は、入力した「最大の階の床面積」で判定する(どの階にかかるかは階ごとに確かめる)。
 */

type UseCode =
  | '1i' | '1ro' | '2i' | '2ro' | '2ha' | '2ni' | '3i' | '3ro' | '4' | '5i' | '5ro'
  | '6i1' | '6i2' | '6i3' | '6i4' | '6ro1' | '6ro2' | '6ro3' | '6ro4' | '6ro5' | '6ha' | '6ni'
  | '7' | '8' | '9i' | '9ro' | '10' | '11' | '12i' | '12ro' | '13i' | '13ro' | '14' | '15'
  | '16i' | '16ro' | '16-2' | '17';

const USES: { group: string; items: [UseCode, string][] }[] = [
  {
    group: '特定防火対象物',
    items: [
      ['1i', '(1)項イ 劇場・映画館・演芸場・観覧場'],
      ['1ro', '(1)項ロ 公会堂・集会場'],
      ['2i', '(2)項イ キャバレー・ナイトクラブ等'],
      ['2ro', '(2)項ロ 遊技場・ダンスホール'],
      ['2ha', '(2)項ハ 性風俗関連特殊営業の店舗等'],
      ['2ni', '(2)項ニ カラオケボックス・個室ネットカフェ等'],
      ['3i', '(3)項イ 待合・料理店等'],
      ['3ro', '(3)項ロ 飲食店'],
      ['4', '(4)項 物品販売店舗・展示場'],
      ['5i', '(5)項イ 旅館・ホテル・宿泊所'],
      ['6i1', '(6)項イ(1) 病院(特定診療科・療養/一般病床あり)'],
      ['6i2', '(6)項イ(2) 有床診療所(特定診療科・4 床以上)'],
      ['6i3', '(6)項イ(3) 上記以外の病院・有床診療所・入所助産所'],
      ['6i4', '(6)項イ(4) 無床診療所・無入所の助産所'],
      ['6ro1', '(6)項ロ(1) 特養・老健・認知症グループホーム等'],
      ['6ro2', '(6)項ロ(2) 救護施設'],
      ['6ro3', '(6)項ロ(3) 乳児院'],
      ['6ro4', '(6)項ロ(4) 障害児入所施設'],
      ['6ro5', '(6)項ロ(5) 障害者支援施設等(避難が困難な障害者等)'],
      ['6ha', '(6)項ハ 老人デイサービス・保育所・障害福祉施設等'],
      ['6ni', '(6)項ニ 幼稚園・特別支援学校'],
      ['9i', '(9)項イ 蒸気浴場・熱気浴場'],
      ['16i', '(16)項イ 複合用途(特定用途を含む)'],
      ['16-2', '(16の2)項 地下街'],
    ],
  },
  {
    group: '非特定防火対象物',
    items: [
      ['5ro', '(5)項ロ 寄宿舎・下宿・共同住宅'],
      ['7', '(7)項 学校'],
      ['8', '(8)項 図書館・博物館・美術館'],
      ['9ro', '(9)項ロ 一般公衆浴場'],
      ['10', '(10)項 車両の停車場・船舶/航空機の発着場'],
      ['11', '(11)項 神社・寺院・教会'],
      ['12i', '(12)項イ 工場・作業場'],
      ['12ro', '(12)項ロ 映画スタジオ・テレビスタジオ'],
      ['13i', '(13)項イ 自動車車庫・駐車場'],
      ['13ro', '(13)項ロ 航空機の格納庫'],
      ['14', '(14)項 倉庫'],
      ['15', '(15)項 事務所等(前各項に該当しない事業場)'],
      ['16ro', '(16)項ロ 複合用途(特定用途を含まない)'],
      ['17', '(17)項 重要文化財等の建造物'],
    ],
  },
];

const useLabel = (u: UseCode) => USES.flatMap((g) => g.items).find(([c]) => c === u)?.[1] ?? u;
/** 項の頭(1i → 1、6ro2 → 6、16-2 → 16-2) */
const head = (u: UseCode) => (u === '16-2' ? '16-2' : u.replace(/[a-z]+\d?$/, ''));
const inHead = (u: UseCode, heads: string[]) => heads.includes(head(u));
const isIn = (u: UseCode, codes: UseCode[]) => codes.includes(u);
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => String(a + i));
/** 特定用途((1)〜(4)、(5)イ、(6)、(9)イ) */
const isTokutei = (u: UseCode) => inHead(u, range(1, 4)) || u === '5i' || head(u) === '6' || u === '9i';

type Structure = 'fr' | 'qfr' | 'other';

export type FireIn = {
  use: UseCode;
  total: number;
  above: number;
  below: number;
  /** 地階・無窓階のうち最大の階の床面積(無ければ 0) */
  bwMax: number;
  /** 3 階以上の階のうち最大の床面積 */
  up3Max: number;
  /** 4 階以上 10 階以下の階のうち最大の床面積 */
  up4Max: number;
  /** 地階の床面積の合計 */
  basementTotal: number;
  /** 1 階と 2 階の床面積の合計(平屋は 1 階) */
  f12: number;
  site: number;
  height: number;
  structure: Structure;
  interiorNonComb: boolean;
  /** 収容人員(NaN = 未入力) */
  cap: number;
  capBW: number;
  /** 避難器具: 2 階以上の階(避難階・11 階以上を除く)と地階のうち最大の収容人員 */
  capFloor: number;
  lowerTokutei: boolean;
  /** 避難階以外の階から避難階・地上へ直通する階段が 2 以上ない(屋外階段等なら 1) */
  stairsLack: boolean;
  fireUse: boolean;
  assisted: boolean;
  lodging: boolean;
};

type Status = 'req' | 'part' | 'no' | 'check';
type Row = { name: string; status: Status; text: string; law: string };

const has = (n: number) => Number.isFinite(n);

export function judge(v: FireIn): Row[] {
  const u = v.use;
  const A = v.total;
  const bw = v.bwMax || 0;
  const up3 = v.above >= 3 ? v.up3Max || 0 : 0;
  const up4 = v.above >= 4 ? v.up4Max || 0 : 0;
  const is16 = u === '16i' || u === '16ro';
  const perPart = '複合用途は用途ごとに 1 つの防火対象物とみなして判定する(令 9 条)。用途ごとの床面積で、この表を選び直して確かめる';
  const rows: Row[] = [];

  // ---- 消火器具(令 10 条)
  {
    const all: UseCode[] = ['1i', '2i', '2ro', '2ha', '2ni', '6i1', '6i2', '6i3', '6ro1', '6ro2', '6ro3', '6ro4', '6ro5', '16-2', '17'];
    const g150: UseCode[] = ['1ro', '4', '5i', '5ro', '6i4', '6ha', '6ni', '9i', '9ro', '12i', '12ro', '13i', '13ro', '14'];
    const g300: UseCode[] = ['7', '8', '10', '11', '15'];
    const name = '消火器具';
    if (is16) rows.push({ name, status: 'check', text: `${perPart}。地階・無窓階・3 階以上の階で床面積 50㎡ 以上なら必要`, law: '令 10 条・9 条' });
    else if (isIn(u, all)) rows.push({ name, status: 'req', text: '延べ面積にかかわらず必要', law: '令 10 条 1 項 1 号イ' });
    else if (head(u) === '3' && v.fireUse) rows.push({ name, status: 'req', text: '火を使用する設備・器具がある (3)項は延べ面積にかかわらず必要(防火上有効な措置を講じたものを除く)', law: '令 10 条 1 項 1 号ロ' });
    else if ((isIn(u, g150) || head(u) === '3') && A >= 150) rows.push({ name, status: 'req', text: `延べ面積 ${A}㎡ ≥ 150㎡`, law: '令 10 条 1 項 2 号' });
    else if (isIn(u, g300) && A >= 300) rows.push({ name, status: 'req', text: `延べ面積 ${A}㎡ ≥ 300㎡`, law: '令 10 条 1 項 3 号' });
    else if (bw >= 50 || up3 >= 50) rows.push({ name, status: 'part', text: '地階・無窓階・3 階以上の階で床面積 50㎡ 以上の階に必要', law: '令 10 条 1 項 5 号' });
    else rows.push({ name, status: 'no', text: `延べ ${A}㎡ は基準未満(${isIn(u, g300) ? 300 : 150}㎡)。少量危険物・指定可燃物を扱うなら必要(4 号)`, law: '令 10 条' });
  }

  // ---- 屋内消火栓設備(令 11 条)
  {
    const name = '屋内消火栓設備';
    const m = v.structure === 'fr' ? (v.interiorNonComb ? 3 : 2) : v.structure === 'qfr' && v.interiorNonComb ? 2 : 1;
    const mTxt = m > 1 ? `(倍読み ${m} 倍・令 11 条 2 項)` : '';
    let base = 0;
    let item = '';
    if (head(u) === '1') [base, item] = [500, '1 号'];
    else if (inHead(u, range(2, 10)) || inHead(u, ['12', '14'])) [base, item] = [700, '2 号'];
    else if (inHead(u, ['11', '15'])) [base, item] = [1000, '3 号'];
    else if (u === '16-2') [base, item] = [150, '4 号'];
    const fl = head(u) === '1' ? 100 : inHead(u, ['11', '15']) ? 200 : 150;
    // 令 12 条 1 項 1 号の防火対象物((6)項イ(1)(2)・ロ)に 2 号を当てるときは、倍読みの値と「1,000㎡ + 総務省令の部分」の小さいほう
    const sp1 = isIn(u, ['6i1', '6i2', '6ro1', '6ro2', '6ro3', '6ro4', '6ro5']);
    let th = base * m;
    let thNote = '';
    if (sp1 && m > 1) {
      th = Math.min(th, 1000);
      thNote = '(令 12 条 1 項 1 号の対象なので、倍読みの値と「1,000㎡ + 総務省令で定める部分」の小さいほう。ここでは省令の部分を 0 で計算)';
    }
    if (is16) rows.push({ name, status: 'check', text: perPart, law: '令 11 条・9 条' });
    else if (head(u) === '13' || u === '17') rows.push({ name, status: 'no', text: '(13)(17)項は延べ面積の基準の対象外(指定可燃物を 750 倍以上扱うなら必要)', law: '令 11 条 1 項' });
    else if (A >= th) rows.push({ name, status: 'req', text: `延べ面積 ${A}㎡ ≥ ${th}㎡${mTxt}${thNote}`, law: `令 11 条 1 項 ${item}` });
    else if (u !== '16-2' && (bw >= fl * m || up4 >= fl * m)) rows.push({ name, status: 'part', text: `地階・無窓階・4 階以上の階で床面積 ${fl * m}㎡ 以上の階に必要${mTxt}`, law: '令 11 条 1 項 6 号' });
    else rows.push({ name, status: 'no', text: `延べ ${A}㎡ < ${th}㎡${mTxt}。地階・無窓階・4 階以上の階の床面積も ${fl * m}㎡ 未満`, law: '令 11 条' });
  }

  // ---- スプリンクラー設備(令 12 条)
  {
    const name = 'スプリンクラー設備';
    const t3 = isTokutei(u) || u === '16i';
    const big = isIn(u, ['4', '6i1', '6i2', '6i3']) ? 3000 : 6000;
    if (isIn(u, ['6i1', '6i2', '6ro1', '6ro3'])) rows.push({ name, status: 'req', text: '延べ面積にかかわらず必要(延焼を抑制する構造として総務省令で定めるものを除く)', law: '令 12 条 1 項 1 号' });
    else if (isIn(u, ['6ro2', '6ro4', '6ro5']) && (v.assisted || A >= 275))
      rows.push({ name, status: 'req', text: v.assisted ? '介助がなければ避難できない者を主として入所させるので面積にかかわらず必要' : `延べ面積 ${A}㎡ ≥ 275㎡`, law: '令 12 条 1 項 1 号ハ' });
    else if (t3 && v.above >= 11) rows.push({ name, status: 'req', text: `地階を除く階数 ${v.above} ≥ 11(総務省令で定める部分を除く)`, law: '令 12 条 1 項 3 号' });
    else if (isTokutei(u) && v.above >= 2 && A >= big)
      rows.push({ name, status: 'req', text: `平屋建以外で床面積の合計 ${A}㎡ ≥ ${big}㎡(総務省令で定める部分を除いた面積で判定)`, law: '令 12 条 1 項 4 号' });
    else if (u === '16-2' && A >= 1000) rows.push({ name, status: 'req', text: `地下街で延べ面積 ${A}㎡ ≥ 1,000㎡`, law: '令 12 条 1 項 6 号' });
    else if (u === '16i') rows.push({ name, status: 'check', text: '特定用途部分の床面積の合計が 3,000㎡ 以上なら、その部分がある階に必要(10 号)。地階・無窓階・4〜10 階の特定用途部分の床面積でも判定(11 号ハ)', law: '令 12 条 1 項 10 号・11 号ハ' });
    else {
      const g1: boolean = head(u) === '1' || head(u) === '3' || u === '5i' || head(u) === '6' || u === '9i';
      const g2: boolean = head(u) === '2' || u === '4';
      const partHit = (g1 && (bw >= 1000 || up4 >= 1500)) || (g2 && (bw >= 1000 || up4 >= 1000));
      if (partHit) rows.push({ name, status: 'part', text: g1 ? '地階・無窓階で 1,000㎡ 以上、4〜10 階で 1,500㎡ 以上の階に必要' : '地階・無窓階・4〜10 階で床面積 1,000㎡ 以上の階に必要', law: '令 12 条 1 項 11 号' });
      else if (v.above >= 11) rows.push({ name, status: 'part', text: '11 階以上の階に必要', law: '令 12 条 1 項 12 号' });
      else if (head(u) === '1') rows.push({ name, status: 'check', text: '舞台部の床面積が 500㎡ 以上(地階・無窓階・4 階以上にある舞台は 300㎡ 以上)なら必要', law: '令 12 条 1 項 2 号' });
      else if (u === '14') rows.push({ name, status: 'check', text: '天井の高さ 10m 超・延べ 700㎡ 以上のラック式倉庫なら必要', law: '令 12 条 1 項 5 号' });
      else rows.push({ name, status: 'no', text: '用途・規模・階数の基準に当たらない(指定可燃物を 1,000 倍以上扱うなら必要)', law: '令 12 条' });
    }
  }

  // ---- 屋外消火栓設備(令 19 条)
  {
    const name = '屋外消火栓設備';
    const th = v.structure === 'fr' ? 9000 : v.structure === 'qfr' ? 6000 : 3000;
    if (is16 || u === '16-2') rows.push({ name, status: 'check', text: is16 ? perPart : '(16の2)項は対象の用途に無い', law: '令 19 条' });
    else if (!(v.f12 > 0)) rows.push({ name, status: 'check', text: '1 階・2 階の床面積の合計が未入力', law: '令 19 条 1 項' });
    else if (v.f12 >= th) rows.push({ name, status: 'req', text: `1・2 階の床面積の合計 ${v.f12}㎡ ≥ ${th}㎡`, law: '令 19 条 1 項' });
    else rows.push({ name, status: 'no', text: `1・2 階の床面積の合計 ${v.f12}㎡ < ${th}㎡(同一敷地の耐火・準耐火以外の建物が近接するときは合算・同条 2 項)`, law: '令 19 条' });
  }

  // ---- 自動火災報知設備(令 21 条)
  {
    const name = '自動火災報知設備';
    const all: UseCode[] = ['2ni', '5i', '6i1', '6i2', '6i3', '6ro1', '6ro2', '6ro3', '6ro4', '6ro5', '13ro', '17'];
    const g300: UseCode[] = ['1i', '1ro', '2i', '2ro', '2ha', '3i', '3ro', '4', '6i4', '6ni', '16i', '16-2'];
    const g500: UseCode[] = ['5ro', '7', '8', '9ro', '10', '12i', '12ro', '13i', '14'];
    const specUpper = (isTokutei(u) || u === '16i') && (v.above >= 2 || v.below >= 1);
    if (isIn(u, all) || (u === '6ha' && v.lodging)) rows.push({ name, status: 'req', text: '延べ面積にかかわらず必要', law: '令 21 条 1 項 1 号' });
    else if (u === '9i' && A >= 200) rows.push({ name, status: 'req', text: `延べ面積 ${A}㎡ ≥ 200㎡`, law: '令 21 条 1 項 2 号' });
    else if ((isIn(u, g300) || u === '6ha') && A >= 300) rows.push({ name, status: 'req', text: `延べ面積 ${A}㎡ ≥ 300㎡`, law: '令 21 条 1 項 3 号' });
    else if (isIn(u, g500) && A >= 500) rows.push({ name, status: 'req', text: `延べ面積 ${A}㎡ ≥ 500㎡`, law: '令 21 条 1 項 4 号' });
    else if (inHead(u, ['11', '15']) && A >= 1000) rows.push({ name, status: 'req', text: `延べ面積 ${A}㎡ ≥ 1,000㎡`, law: '令 21 条 1 項 6 号' });
    else if (specUpper && v.stairsLack) rows.push({ name, status: 'req', text: '特定用途が避難階以外の階にあり、直通階段が 2 以上ない(いわゆる小規模特定用途複合等)', law: '令 21 条 1 項 7 号' });
    else if ((isIn(u, ['2i', '2ro', '2ha', '3i', '3ro']) || u === '16i') && bw >= 100) rows.push({ name, status: 'part', text: '地階・無窓階で床面積 100㎡ 以上の階に必要((16)項イは (2)(3)項の部分の合計)', law: '令 21 条 1 項 10 号' });
    else if (bw >= 300 || up3 >= 300) rows.push({ name, status: 'part', text: '地階・無窓階・3 階以上の階で床面積 300㎡ 以上の階に必要', law: '令 21 条 1 項 11 号' });
    else if (v.above >= 11) rows.push({ name, status: 'part', text: '11 階以上の階に必要', law: '令 21 条 1 項 14 号' });
    else if (is16) rows.push({ name, status: 'check', text: `建物全体では基準未満。${perPart}((2)項ニ・(5)項イ・(6)項イ(1)〜(3)・ロ等の部分は面積によらず必要)`, law: '令 21 条・9 条' });
    else rows.push({ name, status: 'no', text: '用途・延べ面積・階の基準に当たらない。地階・2 階以上の駐車部分 200㎡ 以上(13 号)、通信機器室 500㎡ 以上(15 号)は別に確かめる', law: '令 21 条' });
  }

  // ---- 非常警報器具・非常警報設備(令 24 条)
  {
    const name = '非常警報器具・設備';
    const cap = v.cap;
    const s3 =
      u === '16-2' ||
      v.above >= 11 ||
      v.below >= 3 ||
      (u === '16i' && has(cap) && cap >= 500) ||
      ((inHead(u, range(1, 4)) || u === '5i' || head(u) === '6' || u === '9i') && has(cap) && cap >= 300) ||
      (inHead(u, ['5ro', '7', '8']) || u === '5ro') && has(cap) && cap >= 800;
    if (s3) rows.push({ name, status: 'req', text: '非常ベル + 放送設備(または自動式サイレン + 放送設備)。地下街・地上 11 階以上・地階 3 以上・収容人員の基準による', law: '令 24 条 3 項' });
    else if (!has(cap)) rows.push({ name, status: 'check', text: '収容人員が未入力のため判定できない(収容人員は消防法施行規則 1 条の 3 で算定)', law: '令 24 条' });
    else if ((u === '5i' || (head(u) === '6' && u.startsWith('6i')) || u === '9i') && cap >= 20) rows.push({ name, status: 'req', text: `収容人員 ${cap} 人 ≥ 20 人 → 非常ベル・自動式サイレン・放送設備のいずれか(自火報を設置した有効範囲は不要)`, law: '令 24 条 2 項 1 号' });
    else if (cap >= 50 || (has(v.capBW) && v.capBW >= 20)) rows.push({ name, status: 'req', text: `収容人員 50 人以上、または地階・無窓階の収容人員 20 人以上 → 非常ベル等(自火報の有効範囲は不要)`, law: '令 24 条 2 項 2 号' });
    else if ((u === '4' || isIn(u, ['6ro1', '6ro2', '6ro3', '6ro4', '6ro5', '6ha', '6ni']) || u === '9ro' || head(u) === '12') && cap >= 20) rows.push({ name, status: 'req', text: `収容人員 ${cap} 人(20 人以上 50 人未満)→ 非常警報器具(自火報・非常警報設備の有効範囲は不要)`, law: '令 24 条 1 項' });
    else rows.push({ name, status: 'no', text: `収容人員 ${cap} 人は基準未満`, law: '令 24 条' });
  }

  // ---- 避難器具(令 25 条)
  {
    const name = '避難器具';
    const c = v.capFloor;
    const upper = v.above >= 2 || v.below >= 1;
    const low10 = v.lowerTokutei;
    if (!upper) rows.push({ name, status: 'no', text: '平屋で地階が無い(避難階以外の階が無い)', law: '令 25 条' });
    else if (is16) rows.push({ name, status: 'check', text: `${perPart}。3 階(2 階に (2)(3)項の部分があれば 2 階)以上で直通階段が 2 以上ない階は収容人員 10 人以上で必要(5 号)`, law: '令 25 条・9 条' });
    else if (!has(c)) rows.push({ name, status: 'check', text: '階ごとの収容人員が未入力のため判定できない', law: '令 25 条' });
    else {
      let hit = '';
      if (head(u) === '6' && c >= (low10 ? 10 : 20)) hit = `(6)項の 2 階以上・地階で収容人員 ${low10 ? 10 : 20} 人以上(1 号)`;
      else if (head(u) === '5' && c >= (low10 ? 10 : 30)) hit = `(5)項の 2 階以上・地階で収容人員 ${low10 ? 10 : 30} 人以上(2 号)`;
      else if ((inHead(u, range(1, 4)) || inHead(u, range(7, 11))) && c >= 50) hit = `2 階以上・地階で収容人員 50 人以上(3 号。特定主要構造部を耐火構造とした建築物の 2 階を除く)`;
      else if (inHead(u, ['12', '15']) && (v.above >= 3 || v.below >= 1) && c >= 100) hit = `3 階以上・地階で収容人員 150 人以上(3 階以上の無窓階・地階は 100 人以上)(4 号)`;
      const g5floor = inHead(u, ['2', '3']) ? 2 : 3;
      if (!hit && v.stairsLack && v.above >= g5floor && c >= 10) hit = `${g5floor} 階以上で直通階段が 2 以上ない階、収容人員 10 人以上(5 号)`;
      if (hit && inHead(u, ['12', '15']) && c < 150 && !hit.includes('5 号')) rows.push({ name, status: 'check', text: `${hit}。収容人員 ${c} 人は 100〜149 人なので、その階が無窓階・地階かで決まる`, law: '令 25 条 1 項 4 号' });
      else if (hit) rows.push({ name, status: 'part', text: `${hit}に当たる階に必要(避難階・11 階以上の階を除く)`, law: '令 25 条 1 項' });
      else rows.push({ name, status: 'no', text: `最大の階の収容人員 ${c} 人は基準未満`, law: '令 25 条' });
    }
  }

  // ---- 誘導灯(令 26 条)
  {
    const name = '誘導灯(避難口・通路)';
    const all = inHead(u, range(1, 4)) || u === '5i' || head(u) === '6' || head(u) === '9' || u === '16i' || u === '16-2';
    if (all) rows.push({ name, status: 'req', text: `必要(避難が容易なものとして総務省令で定めるものを除く)${head(u) === '1' ? '。客席誘導灯も必要' : ''}`, law: '令 26 条 1 項 1 号・2 号' });
    else if (u === '17') rows.push({ name, status: 'no', text: '(17)項は誘導灯・誘導標識の対象に無い', law: '令 26 条' });
    else if (v.below >= 1 || bw > 0 || v.above >= 11) rows.push({ name, status: 'part', text: '地階・無窓階・11 階以上の部分に必要。それ以外の部分は誘導標識', law: '令 26 条 1 項 1 号・2 号・4 号' });
    else rows.push({ name, status: 'no', text: '誘導灯は不要の見込み。誘導標識は必要((1)〜(16)項)', law: '令 26 条 1 項 4 号' });
  }

  // ---- 排煙設備(令 28 条)
  {
    const name = '排煙設備';
    if (u === '16-2' && A >= 1000) rows.push({ name, status: 'req', text: `地下街で延べ面積 ${A}㎡ ≥ 1,000㎡`, law: '令 28 条 1 項 1 号' });
    else if (inHead(u, ['2', '4', '10', '13']) && bw >= 1000) rows.push({ name, status: 'part', text: '地階・無窓階で床面積 1,000㎡ 以上の階に必要', law: '令 28 条 1 項 3 号' });
    else if (head(u) === '1') rows.push({ name, status: 'check', text: '舞台部の床面積が 500㎡ 以上なら必要', law: '令 28 条 1 項 2 号' });
    else if (is16) rows.push({ name, status: 'check', text: perPart, law: '令 28 条・9 条' });
    else rows.push({ name, status: 'no', text: '消防法の排煙設備は不要の見込み(建築基準法 126 条の 2 の排煙設備は別に確かめる)', law: '令 28 条' });
  }

  // ---- 消防用水(令 27 条)
  {
    const name = '消防用水';
    const th = v.structure === 'fr' ? 15000 : v.structure === 'qfr' ? 10000 : 5000;
    const above = A - (v.basementTotal || 0);
    if (v.height > 31 && above >= 25000) rows.push({ name, status: 'req', text: `高さ ${v.height}m > 31m かつ延べ面積(地階を除く)${above}㎡ ≥ 25,000㎡`, law: '令 27 条 1 項 2 号' });
    else if (!(v.site > 0)) rows.push({ name, status: 'check', text: '敷地面積が未入力(敷地 20,000㎡ 以上で 1・2 階の床面積の合計が基準以上なら必要)', law: '令 27 条 1 項 1 号' });
    else if (!is16 && u !== '16-2' && v.site >= 20000 && v.f12 >= th) rows.push({ name, status: 'req', text: `敷地 ${v.site}㎡ ≥ 20,000㎡ かつ 1・2 階の床面積の合計 ${v.f12}㎡ ≥ ${th}㎡`, law: '令 27 条 1 項 1 号' });
    else if (is16) rows.push({ name, status: 'check', text: perPart, law: '令 27 条・9 条' });
    else rows.push({ name, status: 'no', text: `敷地 20,000㎡ 以上かつ 1・2 階の床面積 ${th}㎡ 以上、または高さ 31m 超かつ延べ 25,000㎡ 以上に当たらない`, law: '令 27 条' });
  }

  // ---- 連結散水設備(令 28 条の 2)
  {
    const name = '連結散水設備';
    const b = u === '16-2' ? A : v.basementTotal || 0;
    if (b >= 700 && u !== '16ro' && u !== '16i') rows.push({ name, status: 'req', text: `${u === '16-2' ? '延べ面積' : '地階の床面積の合計'} ${b}㎡ ≥ 700㎡(スプリンクラー等を設けた有効範囲は不要)`, law: '令 28 条の 2' });
    else if (is16 && b >= 700) rows.push({ name, status: 'check', text: `地階の床面積の合計 ${b}㎡ ≥ 700㎡。${perPart}`, law: '令 28 条の 2・9 条' });
    else rows.push({ name, status: 'no', text: `地階の床面積の合計 ${b}㎡ < 700㎡`, law: '令 28 条の 2' });
  }

  // ---- 連結送水管(令 29 条)・非常コンセント設備(令 29 条の 2)
  {
    const name = '連結送水管';
    if (v.above >= 7) rows.push({ name, status: 'req', text: `地階を除く階数 ${v.above} ≥ 7`, law: '令 29 条 1 項 1 号' });
    else if (v.above >= 5 && A >= 6000) rows.push({ name, status: 'req', text: `地階を除く階数 5 以上かつ延べ面積 ${A}㎡ ≥ 6,000㎡`, law: '令 29 条 1 項 2 号' });
    else if (u === '16-2' && A >= 1000) rows.push({ name, status: 'req', text: `地下街で延べ面積 ${A}㎡ ≥ 1,000㎡`, law: '令 29 条 1 項 3 号' });
    else rows.push({ name, status: 'no', text: '階数・延べ面積の基準に当たらない', law: '令 29 条' });
    const nc = '非常コンセント設備';
    if (v.above >= 11) rows.push({ name: nc, status: 'req', text: `地階を除く階数 ${v.above} ≥ 11`, law: '令 29 条の 2 第 1 項 1 号' });
    else if (u === '16-2' && A >= 1000) rows.push({ name: nc, status: 'req', text: `地下街で延べ面積 ${A}㎡ ≥ 1,000㎡`, law: '令 29 条の 2 第 1 項 2 号' });
    else rows.push({ name: nc, status: 'no', text: '地上 11 階未満', law: '令 29 条の 2' });
  }

  return rows;
}

interface FireEquipmentProps {
  hideHeader?: boolean;
}

const numOr = (s: string) => (s.trim() === '' ? NaN : Number(s));

const inp = 'w-full p-2 border border-gray-300 rounded text-xs';
const lab = 'block text-xs font-bold text-gray-700 mb-1';

/** 数値の入力欄(コンポーネントの外に置く。中で定義すると入力のたびに作り直されてフォーカスが外れる) */
function Field({ k, v, set, hint, ph }: { k: string; v: string; set: (s: string) => void; hint?: string; ph?: string }) {
  return (
    <label className="block">
      <span className="block text-[10px] text-gray-500 mb-1">{k}</span>
      <input type="number" min="0" value={v} onChange={(e) => set(e.target.value)} className={inp} placeholder={ph} />
      {hint && <span className="block text-[10px] text-gray-400 mt-0.5">{hint}</span>}
    </label>
  );
}

const FireEquipment: React.FC<FireEquipmentProps> = ({ hideHeader }) => {
  const [use, setUse] = useState<UseCode | ''>('');
  const [total, setTotal] = useState('');
  const [above, setAbove] = useState('');
  const [below, setBelow] = useState('0');
  const [bwMax, setBwMax] = useState('0');
  const [up3Max, setUp3Max] = useState('');
  const [up4Max, setUp4Max] = useState('');
  const [basementTotal, setBasementTotal] = useState('0');
  const [f12, setF12] = useState('');
  const [site, setSite] = useState('');
  const [height, setHeight] = useState('');
  const [structure, setStructure] = useState<Structure>('other');
  const [interior, setInterior] = useState(false);
  const [cap, setCap] = useState('');
  const [capBW, setCapBW] = useState('');
  const [capFloor, setCapFloor] = useState('');
  const [lowerTokutei, setLowerTokutei] = useState(false);
  const [stairsLack, setStairsLack] = useState(false);
  const [fireUse, setFireUse] = useState(false);
  const [assisted, setAssisted] = useState(false);
  const [lodging, setLodging] = useState(false);

  const missing: string[] = [];
  if (!use) missing.push('用途');
  if (!(Number(total) > 0)) missing.push('延べ面積');
  if (!(Number(above) > 0)) missing.push('地上階数');

  const results = useMemo(() => {
    if (!use || !(Number(total) > 0) || !(Number(above) > 0)) return null;
    return judge({
      use,
      total: Number(total),
      above: Math.floor(Number(above)),
      below: Math.floor(Number(below) || 0),
      bwMax: Number(bwMax) || 0,
      up3Max: up3Max === '' ? 0 : Number(up3Max),
      up4Max: up4Max === '' ? 0 : Number(up4Max),
      basementTotal: Number(basementTotal) || 0,
      f12: Number(f12) || 0,
      site: Number(site) || 0,
      height: Number(height) || 0,
      structure,
      interiorNonComb: interior,
      cap: numOr(cap),
      capBW: numOr(capBW),
      capFloor: numOr(capFloor),
      lowerTokutei,
      stairsLack,
      fireUse,
      assisted,
      lodging,
    });
  }, [use, total, above, below, bwMax, up3Max, up4Max, basementTotal, f12, site, height, structure, interior, cap, capBW, capFloor, lowerTokutei, stairsLack, fireUse, assisted, lodging]);

  const STATUS: Record<Status, React.ReactNode> = {
    req: (
      <span className="yy-dt-req">
        <i className="yy-dot" />
        設置が必要
      </span>
    ),
    part: (
      <span className="yy-dt-req">
        <i className="yy-dot" />
        該当する階・部分に必要
      </span>
    ),
    check: <span className="text-[#b4402f]">要確認</span>,
    no: <span className="text-gray-400">不要の見込み</span>,
  };

  return (
    <div className="w-full bg-white">
      {!hideHeader && (
        <div className="px-4 py-1.5 border-b border-gray-100 bg-[#3b3b3b] text-white rounded-t-lg">
          <h3 className="text-[13px] font-medium">消防設備判定ツール (Beta)</h3>
        </div>
      )}
      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-7 items-start">
          <div>
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded text-[11px] leading-relaxed text-red-800">
              <strong>重要:</strong> 消防法施行令の設置基準による目安です。無窓階の判定(規則 5 条の 3)・収容人員の算定(規則 1 条の 3)・特例(令 32 条)・市町村の火災予防条例の上乗せで結果は変わります。必ず所轄消防署の事前相談で確かめてください。
            </div>

            <div className="space-y-4">
              <div>
                <label className={lab}>1. 用途区分(消防法施行令 別表第一)</label>
                <select value={use} onChange={(e) => setUse(e.target.value as UseCode)} className={inp}>
                  <option value="">選択してください</option>
                  {USES.map((g) => (
                    <optgroup key={g.group} label={g.group}>
                      {g.items.map(([c, l]) => (
                        <option key={c} value={c}>
                          {l}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {use && head(use as UseCode) === '3' && (
                  <label className="flex items-start gap-1 text-[11px] mt-1">
                    <input type="checkbox" checked={fireUse} onChange={(e) => setFireUse(e.target.checked)} className="mt-0.5" /> 火を使用する設備・器具(厨房のガスこんろ等)を設けている
                  </label>
                )}
                {(use === '6ro2' || use === '6ro4' || use === '6ro5') && (
                  <label className="flex items-start gap-1 text-[11px] mt-1">
                    <input type="checkbox" checked={assisted} onChange={(e) => setAssisted(e.target.checked)} className="mt-0.5" /> 介助がなければ避難できない者を主として入所させる
                  </label>
                )}
                {use === '6ha' && (
                  <label className="flex items-start gap-1 text-[11px] mt-1">
                    <input type="checkbox" checked={lodging} onChange={(e) => setLodging(e.target.checked)} className="mt-0.5" /> 利用者を入居させ、または宿泊させる
                  </label>
                )}
              </div>

              <div>
                <label className={lab}>2. 規模</label>
                <div className="grid grid-cols-3 gap-2">
                  <Field k="延べ面積(㎡)" v={total} set={setTotal} ph="必須" />
                  <Field k="地上階数" v={above} set={setAbove} ph="必須" />
                  <Field k="地階の階数" v={below} set={setBelow} />
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded border border-gray-200 space-y-2">
                <label className={lab}>3. 階ごとの床面積(階で決まる基準に使う)</label>
                <div className="grid grid-cols-2 gap-2">
                  <Field k="地階・無窓階のうち最大の階の床面積(㎡)" v={bwMax} set={setBwMax} hint="無ければ 0。無窓階は消防法施行規則 5 条の 3 で判定" />
                  <Field k="地階の床面積の合計(㎡)" v={basementTotal} set={setBasementTotal} />
                  <Field k="3 階以上の階のうち最大の床面積(㎡)" v={up3Max} set={setUp3Max} />
                  <Field k="4〜10 階の階のうち最大の床面積(㎡)" v={up4Max} set={setUp4Max} />
                  <Field k="1 階と 2 階の床面積の合計(㎡)" v={f12} set={setF12} hint="平屋は 1 階。屋外消火栓・消防用水(令 19 条)" />
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded border border-gray-200 space-y-2">
                <label className={lab}>4. 構造・敷地</label>
                <select value={structure} onChange={(e) => setStructure(e.target.value as Structure)} className={inp}>
                  <option value="fr">耐火建築物(特定主要構造部が耐火構造)</option>
                  <option value="qfr">準耐火建築物(建築基準法 2 条 9 号の 3 イ・ロ)</option>
                  <option value="other">その他</option>
                </select>
                <label className="flex items-start gap-1 text-[11px]">
                  <input type="checkbox" checked={interior} onChange={(e) => setInterior(e.target.checked)} className="mt-0.5" /> 壁・天井の室内に面する部分の仕上げが難燃材料(屋内消火栓の倍読みに使う)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Field k="敷地面積(㎡)" v={site} set={setSite} hint="消防用水(令 27 条)" />
                  <Field k="建物の高さ(m)" v={height} set={setHeight} />
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded border border-gray-200 space-y-2">
                <label className={lab}>5. 収容人員・避難(消防法施行規則 1 条の 3 で算定)</label>
                <div className="grid grid-cols-3 gap-2">
                  <Field k="建物全体(人)" v={cap} set={setCap} ph="未入力" />
                  <Field k="地階・無窓階(人)" v={capBW} set={setCapBW} ph="未入力" />
                  <Field k="2 階以上・地階で最大の階(人)" v={capFloor} set={setCapFloor} ph="未入力" />
                </div>
                <label className="flex items-start gap-1 text-[11px]">
                  <input type="checkbox" checked={lowerTokutei} onChange={(e) => setLowerTokutei(e.target.checked)} className="mt-0.5" /> 下の階に (1)〜(4)・(9)・(12)イ・(13)イ・(14)・(15)項の用途がある(避難器具の基準が 10 人に下がる)
                </label>
                <label className="flex items-start gap-1 text-[11px]">
                  <input type="checkbox" checked={stairsLack} onChange={(e) => setStairsLack(e.target.checked)} className="mt-0.5" /> 避難階以外の階から避難階・地上へ直通する階段が 2 以上ない(屋外階段・特別避難階段等なら 1 で可)
                </label>
              </div>
            </div>
          </div>

          {/* 結果表示(索引の組み方。設置が必要な行は薄い緑) */}
          <div>
            <h2 className="yy-dt-sec">判定結果{use ? ` — ${useLabel(use as UseCode)}` : ''}</h2>
            {results ? (
              <>
                <table className="w-full text-[12px]">
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.name} className={`border-b${r.status === 'req' || r.status === 'part' ? ' yy-dt-hi' : ''}`}>
                        <td className="py-2 pr-3 align-top whitespace-nowrap text-gray-800">{r.name}</td>
                        <td className="py-2 pr-3 align-top whitespace-nowrap">{STATUS[r.status]}</td>
                        <td className="py-2 align-top text-[11px] leading-snug text-gray-600">
                          {r.text}
                          <span className="yy-fmt ml-2 whitespace-nowrap">{r.law}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="yy-dt-note pt-3 leading-relaxed">
                  判定していないもの: ガス漏れ火災警報設備(令 21 条の 2)、漏電火災警報器(令 22 条。ラスモルタル等の構造)、消防機関へ通報する火災報知設備(令 23 条)、水噴霧・泡・不活性ガス等の消火設備(令 13 条。駐車場・電気室等)、無線通信補助設備(令 29 条の 3)、総合操作盤・防火対象物の点検。地階・無窓階・各階の床面積で決まる基準は、入れた「最大の階」で見ているので、どの階にかかるかは階ごとに確かめてください。
                </p>
              </>
            ) : (
              <p className="yy-dt-note pt-3">{missing.join('・')}を入れると、ここに設備ごとの判定が出ます。</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FireEquipment;
