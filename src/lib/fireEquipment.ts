/**
 * 消防用設備等の設置の目安(消防法施行令 第 9 条〜第 29 条の 2・別表第一)。
 * 画面は src/components/content/Userpage/design-tools/3_FireEquipment.tsx。テストは scripts/test-fire-equipment.mjs。
 *
 * 2026-11-16 に e-Gov の消防法施行令の現行本文と照合して作り直した。それまでの誤り:
 *   - 消火器の延べ面積の基準を「耐火なら 2 倍」にしていた(倍読みは消火器の基準面積にはない。令 10 条は 150 / 300㎡ と用途で決まる)
 *   - 屋内消火栓の基準を「特定 700㎡ / 非特定 1,400㎡」にしていた((1)項 500、(2)〜(10)(12)(14)項 700、(11)(15)項 1,000㎡。倍読みは 2 倍・3 倍、令 11 条 2 項)
 *   - スプリンクラーを「(1)(2)項 3,000㎡」「(6)項ロ 275㎡」にしていた(平屋建以外で 6,000㎡、(4)項・(6)項イ(1)〜(3)は 3,000㎡。(6)項ロ(1)(3)は面積によらず)
 *   - 自動火災報知設備の (11)(15)項を 500㎡ にしていた(1,000㎡)、(6)項を一律「面積によらず」にしていた
 *   - 誘導灯を全用途「原則設置」、消防用水を「延べ 7,000㎡〜」としていた(条文に無い数値)
 *   - 用途区分に (16)項(複合用途)が無かった、収容人員が未入力でも「対象外の可能性」と出ていた
 *
 * 同日、階ごとの入力表(judgeWithFloors)と、ガス漏れ火災警報設備(令 21 条の 2)・漏電火災警報器(令 22 条)・
 * 消防機関へ通報する火災報知設備(令 23 条)・(16の3)項 準地下街を足した。
 *   - 階の表を使わないときは judge() だけで判定する(それまでの「最大の階の床面積」での判定と同じ)
 *   - 階の表を使うときは、表から延べ面積・階数・最大の階の床面積を出して judge() にかけ、
 *     地階・無窓階・階の位置で決まる基準は階ごとに当てて「該当する階」を出す
 *   - (16)項は令 9 条により用途ごとの部分を 1 つの防火対象物とみなす。階ごとに用途を選ぶと、用途ごとの部分の延べ面積でも判定する
 *     (令 9 条で除かれている令 12 条 1 項 3 号・10〜12 号、21 条 1 項 3 号・7 号・10 号・14 号、21 条の 2 第 1 項 5 号、
 *      22 条 1 項 6 号・7 号、24 条 2 項 2 号・3 項 2 号・3 号、25 条 1 項 5 号、26 条は建物全体で判定)
 */

export type UseCode =
  | '1i' | '1ro' | '2i' | '2ro' | '2ha' | '2ni' | '3i' | '3ro' | '4' | '5i' | '5ro'
  | '6i1' | '6i2' | '6i3' | '6i4' | '6ro1' | '6ro2' | '6ro3' | '6ro4' | '6ro5' | '6ha' | '6ni'
  | '7' | '8' | '9i' | '9ro' | '10' | '11' | '12i' | '12ro' | '13i' | '13ro' | '14' | '15'
  | '16i' | '16ro' | '16-2' | '16-3' | '17';

export const USES: { group: string; items: [UseCode, string][] }[] = [
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
      ['16-3', '(16の3)項 準地下街'],
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

export const labelOfUse = (u: UseCode) => USES.flatMap((g) => g.items).find(([c]) => c === u)?.[1] ?? u;
/** 「(3)項ロ」のような短い名前 */
export const shortUse = (u: UseCode) => labelOfUse(u).split(' ')[0];
/** 項の頭(1i → 1、6ro2 → 6、16-2 → 16-2) */
export const head = (u: UseCode) => (u === '16-2' || u === '16-3' ? u : u.replace(/[a-z]+\d?$/, ''));
const inHead = (u: UseCode, heads: string[]) => heads.includes(head(u));
const isIn = (u: UseCode, codes: UseCode[]) => codes.includes(u);
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => String(a + i));
/** 特定用途((1)〜(4)、(5)イ、(6)、(9)イ) */
export const isTokutei = (u: UseCode) => inHead(u, range(1, 4)) || u === '5i' || head(u) === '6' || u === '9i';
export const is16 = (u: UseCode | '') => u === '16i' || u === '16ro';

export type Structure = 'fr' | 'qfr' | 'other';

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
  // ---- 以下は 2026-11-16 に足した任意項目(無ければ「未入力」として扱う)
  /** (16)項イ・(16の3)項: (1)〜(4)・(5)イ・(6)・(9)イの用途に供される部分の床面積の合計 */
  tokuteiArea?: number;
  /** (16)項イ: 地階のうち特定用途に供される部分の床面積の合計 */
  basementTokutei?: number;
  /** 間柱・下地を準不燃材料以外で造った鉄網入りの壁・床・天井(ラスモルタル等)がある */
  lath?: boolean;
  /** 契約電流容量(A。NaN = 未入力) */
  ampere?: number;
  /** 燃料用ガス(液化石油ガス販売事業による LP ガスを除く。都市ガス等)を使う */
  fuelGas?: boolean;
  /** 建物の内部に温泉の採取のための設備がある */
  hotSpring?: boolean;
  /** 消防機関からの歩行距離が 500m 以下 */
  nearStation?: boolean;
};

export type Status = 'req' | 'part' | 'no' | 'check';
export type Row = { name: string; status: Status; text: string; law: string };

const has = (n: number | undefined): n is number => typeof n === 'number' && Number.isFinite(n);
const fmt = (n: number) => n.toLocaleString('ja-JP');

/** 設備の名前(行の name と同じ文字列。階ごとの判定と突き合わせる) */
export const EQ = {
  ext: '消火器具',
  hydrant: '屋内消火栓設備',
  sp: 'スプリンクラー設備',
  outdoor: '屋外消火栓設備',
  afa: '自動火災報知設備',
  gas: 'ガス漏れ火災警報設備',
  leak: '漏電火災警報器',
  call: '消防機関へ通報する火災報知設備',
  alarm: '非常警報器具・設備',
  escape: '避難器具',
  guide: '誘導灯(避難口・通路)',
  smoke: '排煙設備',
  water: '消防用水',
  sprinkle: '連結散水設備',
  standpipe: '連結送水管',
  outlet: '非常コンセント設備',
} as const;

/** 屋内消火栓の倍読み(令 11 条 2 項) */
const hydrantMul = (v: FireIn) => (v.structure === 'fr' ? (v.interiorNonComb ? 3 : 2) : v.structure === 'qfr' && v.interiorNonComb ? 2 : 1);
/** 屋内消火栓 令 11 条 1 項 6 号の階の床面積の基準((1)〜(12)(14)(15)項以外は 0) */
const hydrantFloorBase = (u: UseCode) =>
  head(u) === '1' ? 100 : inHead(u, ['11', '15']) ? 200 : inHead(u, range(2, 10)) || inHead(u, ['12', '14']) ? 150 : 0;

export function judge(v: FireIn): Row[] {
  const u = v.use;
  const A = v.total;
  const bw = v.bwMax || 0;
  const up3 = v.above >= 3 ? v.up3Max || 0 : 0;
  const up4 = v.above >= 4 ? v.up4Max || 0 : 0;
  const c16 = is16(u);
  const tA = v.tokuteiArea;
  const perPart = '複合用途は用途ごとに 1 つの防火対象物とみなして判定する(令 9 条)。用途ごとの床面積で、この表を選び直して確かめる';
  const rows: Row[] = [];

  // ---- 消火器具(令 10 条)
  {
    const all: UseCode[] = ['1i', '2i', '2ro', '2ha', '2ni', '6i1', '6i2', '6i3', '6ro1', '6ro2', '6ro3', '6ro4', '6ro5', '16-2', '16-3', '17'];
    const g150: UseCode[] = ['1ro', '4', '5i', '5ro', '6i4', '6ha', '6ni', '9i', '9ro', '12i', '12ro', '13i', '13ro', '14'];
    const g300: UseCode[] = ['7', '8', '10', '11', '15'];
    const name = EQ.ext;
    if (c16) rows.push({ name, status: 'check', text: `${perPart}。地階・無窓階・3 階以上の階で床面積 50㎡ 以上なら必要`, law: '令 10 条・9 条' });
    else if (isIn(u, all)) rows.push({ name, status: 'req', text: '延べ面積にかかわらず必要', law: '令 10 条 1 項 1 号イ' });
    else if (head(u) === '3' && v.fireUse) rows.push({ name, status: 'req', text: '火を使用する設備・器具がある (3)項は延べ面積にかかわらず必要(防火上有効な措置を講じたものを除く)', law: '令 10 条 1 項 1 号ロ' });
    else if ((isIn(u, g150) || head(u) === '3') && A >= 150) rows.push({ name, status: 'req', text: `延べ面積 ${A}㎡ ≥ 150㎡`, law: '令 10 条 1 項 2 号' });
    else if (isIn(u, g300) && A >= 300) rows.push({ name, status: 'req', text: `延べ面積 ${A}㎡ ≥ 300㎡`, law: '令 10 条 1 項 3 号' });
    else if (bw >= 50 || up3 >= 50) rows.push({ name, status: 'part', text: '地階・無窓階・3 階以上の階で床面積 50㎡ 以上の階に必要', law: '令 10 条 1 項 5 号' });
    else rows.push({ name, status: 'no', text: `延べ ${A}㎡ は基準未満(${isIn(u, g300) ? 300 : 150}㎡)。少量危険物・指定可燃物を扱うなら必要(4 号)`, law: '令 10 条' });
  }

  // ---- 屋内消火栓設備(令 11 条)
  {
    const name = EQ.hydrant;
    const m = hydrantMul(v);
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
    if (c16) rows.push({ name, status: 'check', text: perPart, law: '令 11 条・9 条' });
    else if (head(u) === '13' || u === '17') rows.push({ name, status: 'no', text: '(13)(17)項は延べ面積の基準の対象外(指定可燃物を 750 倍以上扱うなら必要)', law: '令 11 条 1 項' });
    else if (u === '16-3') rows.push({ name, status: 'no', text: '(16の3)項は令 11 条 1 項の用途に無い(指定可燃物を 750 倍以上扱うなら必要)', law: '令 11 条 1 項' });
    else if (A >= th) rows.push({ name, status: 'req', text: `延べ面積 ${A}㎡ ≥ ${th}㎡${mTxt}${thNote}`, law: `令 11 条 1 項 ${item}` });
    else if (u !== '16-2' && (bw >= fl * m || up4 >= fl * m)) rows.push({ name, status: 'part', text: `地階・無窓階・4 階以上の階で床面積 ${fl * m}㎡ 以上の階に必要${mTxt}`, law: '令 11 条 1 項 6 号' });
    else rows.push({ name, status: 'no', text: `延べ ${A}㎡ < ${th}㎡${mTxt}。地階・無窓階・4 階以上の階の床面積も ${fl * m}㎡ 未満`, law: '令 11 条' });
  }

  // ---- スプリンクラー設備(令 12 条)
  {
    const name = EQ.sp;
    const t3 = isTokutei(u) || u === '16i';
    const big = isIn(u, ['4', '6i1', '6i2', '6i3']) ? 3000 : 6000;
    if (isIn(u, ['6i1', '6i2', '6ro1', '6ro3'])) rows.push({ name, status: 'req', text: '延べ面積にかかわらず必要(延焼を抑制する構造として総務省令で定めるものを除く)', law: '令 12 条 1 項 1 号' });
    else if (isIn(u, ['6ro2', '6ro4', '6ro5']) && (v.assisted || A >= 275))
      rows.push({ name, status: 'req', text: v.assisted ? '介助がなければ避難できない者を主として入所させるので面積にかかわらず必要' : `延べ面積 ${A}㎡ ≥ 275㎡`, law: '令 12 条 1 項 1 号ハ' });
    else if (t3 && v.above >= 11) rows.push({ name, status: 'req', text: `地階を除く階数 ${v.above} ≥ 11(総務省令で定める部分を除く)`, law: '令 12 条 1 項 3 号' });
    else if (isTokutei(u) && v.above >= 2 && A >= big)
      rows.push({ name, status: 'req', text: `平屋建以外で床面積の合計 ${A}㎡ ≥ ${big}㎡(総務省令で定める部分を除いた面積で判定)`, law: '令 12 条 1 項 4 号' });
    else if (u === '16-2' && A >= 1000) rows.push({ name, status: 'req', text: `地下街で延べ面積 ${A}㎡ ≥ 1,000㎡`, law: '令 12 条 1 項 6 号' });
    else if (u === '16-3') {
      if (A < 1000) rows.push({ name, status: 'no', text: `準地下街で延べ面積 ${A}㎡ < 1,000㎡`, law: '令 12 条 1 項 7 号' });
      else if (!has(tA)) rows.push({ name, status: 'check', text: `延べ面積 ${A}㎡ ≥ 1,000㎡。特定用途部分の床面積の合計が 500㎡ 以上なら必要(未入力)`, law: '令 12 条 1 項 7 号' });
      else if (tA >= 500) rows.push({ name, status: 'req', text: `準地下街で延べ面積 ${A}㎡ ≥ 1,000㎡ かつ特定用途部分 ${tA}㎡ ≥ 500㎡`, law: '令 12 条 1 項 7 号' });
      else rows.push({ name, status: 'no', text: `特定用途部分 ${tA}㎡ < 500㎡`, law: '令 12 条 1 項 7 号' });
    } else if (u === '16i' && has(tA) && tA >= 3000)
      rows.push({ name, status: 'part', text: `特定用途部分の床面積の合計 ${tA}㎡ ≥ 3,000㎡ → 特定用途部分がある階に必要(総務省令で定める部分を除く)`, law: '令 12 条 1 項 10 号' });
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
    const name = EQ.outdoor;
    const th = v.structure === 'fr' ? 9000 : v.structure === 'qfr' ? 6000 : 3000;
    if (c16) rows.push({ name, status: 'check', text: perPart, law: '令 19 条' });
    else if (u === '16-2' || u === '16-3') rows.push({ name, status: 'no', text: `${shortUse(u)}は令 19 条の用途((1)〜(15)・(17)・(18)項の建築物)に無い`, law: '令 19 条' });
    else if (!(v.f12 > 0)) rows.push({ name, status: 'check', text: '1 階・2 階の床面積の合計が未入力', law: '令 19 条 1 項' });
    else if (v.f12 >= th) rows.push({ name, status: 'req', text: `1・2 階の床面積の合計 ${v.f12}㎡ ≥ ${th}㎡`, law: '令 19 条 1 項' });
    else rows.push({ name, status: 'no', text: `1・2 階の床面積の合計 ${v.f12}㎡ < ${th}㎡(同一敷地の耐火・準耐火以外の建物が近接するときは合算・同条 2 項)`, law: '令 19 条' });
  }

  // ---- 自動火災報知設備(令 21 条)
  {
    const name = EQ.afa;
    const all: UseCode[] = ['2ni', '5i', '6i1', '6i2', '6i3', '6ro1', '6ro2', '6ro3', '6ro4', '6ro5', '13ro', '17'];
    const g300: UseCode[] = ['1i', '1ro', '2i', '2ro', '2ha', '3i', '3ro', '4', '6i4', '6ni', '16i', '16-2'];
    const g500: UseCode[] = ['5ro', '7', '8', '9ro', '10', '12i', '12ro', '13i', '14'];
    const specUpper = (isTokutei(u) || u === '16i') && (v.above >= 2 || v.below >= 1);
    if (isIn(u, all) || (u === '6ha' && v.lodging)) rows.push({ name, status: 'req', text: '延べ面積にかかわらず必要', law: '令 21 条 1 項 1 号' });
    else if (u === '9i' && A >= 200) rows.push({ name, status: 'req', text: `延べ面積 ${A}㎡ ≥ 200㎡`, law: '令 21 条 1 項 2 号' });
    else if ((isIn(u, g300) || u === '6ha') && A >= 300) rows.push({ name, status: 'req', text: `延べ面積 ${A}㎡ ≥ 300㎡`, law: '令 21 条 1 項 3 号' });
    else if (isIn(u, g500) && A >= 500) rows.push({ name, status: 'req', text: `延べ面積 ${A}㎡ ≥ 500㎡`, law: '令 21 条 1 項 4 号' });
    else if (u === '16-3' && A >= 500 && has(tA) && tA >= 300) rows.push({ name, status: 'req', text: `準地下街で延べ面積 ${A}㎡ ≥ 500㎡ かつ特定用途部分 ${tA}㎡ ≥ 300㎡`, law: '令 21 条 1 項 5 号' });
    else if (u === '16-3' && A >= 500 && !has(tA)) rows.push({ name, status: 'check', text: `延べ面積 ${A}㎡ ≥ 500㎡。特定用途部分の床面積の合計が 300㎡ 以上なら必要(未入力)`, law: '令 21 条 1 項 5 号' });
    else if (inHead(u, ['11', '15']) && A >= 1000) rows.push({ name, status: 'req', text: `延べ面積 ${A}㎡ ≥ 1,000㎡`, law: '令 21 条 1 項 6 号' });
    else if (specUpper && v.stairsLack) rows.push({ name, status: 'req', text: '特定用途が避難階以外の階にあり、直通階段が 2 以上ない(いわゆる小規模特定用途複合等)', law: '令 21 条 1 項 7 号' });
    else if ((isIn(u, ['2i', '2ro', '2ha', '3i', '3ro']) || u === '16i') && bw >= 100) rows.push({ name, status: 'part', text: '地階・無窓階で床面積 100㎡ 以上の階に必要((16)項イは (2)(3)項の部分の合計)', law: '令 21 条 1 項 10 号' });
    else if (bw >= 300 || up3 >= 300) rows.push({ name, status: 'part', text: '地階・無窓階・3 階以上の階で床面積 300㎡ 以上の階に必要', law: '令 21 条 1 項 11 号' });
    else if (v.above >= 11) rows.push({ name, status: 'part', text: '11 階以上の階に必要', law: '令 21 条 1 項 14 号' });
    else if (c16) rows.push({ name, status: 'check', text: `建物全体では基準未満。${perPart}((2)項ニ・(5)項イ・(6)項イ(1)〜(3)・ロ等の部分は面積によらず必要)`, law: '令 21 条・9 条' });
    else rows.push({ name, status: 'no', text: '用途・延べ面積・階の基準に当たらない。地階・2 階以上の駐車部分 200㎡ 以上(13 号)、通信機器室 500㎡ 以上(15 号)は別に確かめる', law: '令 21 条' });
  }

  // ---- ガス漏れ火災警報設備(令 21 条の 2・規則 24 条の 2 の 2)
  {
    const name = EQ.gas;
    const bt = v.basementTotal || 0;
    const bT = v.basementTokutei;
    const gasNote = '燃料用ガス(都市ガス等。液化石油ガス販売事業による LP ガスを除く)を使うもの、可燃性ガスの自然発生のおそれで消防長・消防署長が指定したものに限る(規則 24 条の 2 の 2)';
    let hit: { status: 'req' | 'part'; text: string; law: string } | null = null;
    let unk = '';
    if (u === '16-2') {
      if (A >= 1000) hit = { status: 'req', text: `地下街で延べ面積 ${A}㎡ ≥ 1,000㎡`, law: '令 21 条の 2 第 1 項 1 号' };
    } else if (u === '16-3') {
      if (A >= 1000 && has(tA) && tA >= 500) hit = { status: 'req', text: `準地下街で延べ面積 ${A}㎡ ≥ 1,000㎡ かつ特定用途部分 ${tA}㎡ ≥ 500㎡`, law: '令 21 条の 2 第 1 項 2 号' };
      else if (A >= 1000 && !has(tA)) unk = `準地下街で延べ面積 ${A}㎡ ≥ 1,000㎡。特定用途部分の床面積の合計が 500㎡ 以上なら必要(未入力・2 号)`;
    } else if (isTokutei(u) && bt >= 1000) {
      hit = { status: 'part', text: `地階の床面積の合計 ${bt}㎡ ≥ 1,000㎡ → 地階に必要`, law: '令 21 条の 2 第 1 項 4 号' };
    } else if (u === '16i' && bt >= 1000) {
      if (has(bT) && bT >= 500) hit = { status: 'part', text: `地階の床面積の合計 ${bt}㎡ ≥ 1,000㎡ かつ地階の特定用途部分 ${bT}㎡ ≥ 500㎡ → 地階に必要`, law: '令 21 条の 2 第 1 項 5 号' };
      else if (!has(bT)) unk = `地階の床面積の合計 ${bt}㎡ ≥ 1,000㎡。地階の特定用途部分が 500㎡ 以上なら地階に必要(未入力・5 号)`;
    }
    if (v.hotSpring) {
      // 地下街・準地下街は 1 号・2 号のまま(温泉設備は規則 24 条の 2 の 2 第 2 号で対象になる)。それ以外は 3 号で建物全体
      const ug = hit && hit.status === 'req' ? hit : null;
      rows.push({
        name,
        status: 'req',
        text: ug ? `${ug.text}。建物の内部に温泉の採取のための設備がある` : '建物の内部に温泉の採取のための設備がある(温泉法 14 条の 5 の確認を受けた採取場所の設備を除く。収容人員 1 人以上)',
        law: ug ? `${ug.law}・規則 24 条の 2 の 2` : '令 21 条の 2 第 1 項 3 号・規則 24 条の 2 の 2 第 2 項',
      });
    } else if (hit && v.fuelGas) rows.push({ name, status: hit.status, text: `${hit.text}(燃料用ガスを使う)`, law: `${hit.law}・規則 24 条の 2 の 2` });
    else if (hit) rows.push({ name, status: 'check', text: `${hit.text}の規模に当たる。${gasNote}`, law: `${hit.law}・規則 24 条の 2 の 2` });
    else if (unk) rows.push({ name, status: 'check', text: `${unk}。${gasNote}`, law: '令 21 条の 2' });
    else
      rows.push({
        name,
        status: 'no',
        text: `地下街・準地下街、特定用途の地階 1,000㎡ 以上((16)項イは地階の特定用途部分 500㎡ 以上)、温泉の採取設備のいずれにも当たらない${isTokutei(u) || u === '16i' ? `(地階の床面積の合計 ${bt}㎡)` : ''}`,
        law: '令 21 条の 2',
      });
  }

  // ---- 漏電火災警報器(令 22 条)
  {
    const name = EQ.leak;
    const amp = v.ampere;
    let th = -1;
    let item = '';
    if (u === '17') [th, item] = [0, '1 号'];
    else if (inHead(u, ['5', '9'])) [th, item] = [150, '2 号'];
    else if (inHead(u, range(1, 4)) || head(u) === '6' || head(u) === '12' || u === '16-2') [th, item] = [300, '3 号'];
    else if (inHead(u, ['7', '8', '10', '11'])) [th, item] = [500, '4 号'];
    else if (inHead(u, ['14', '15'])) [th, item] = [1000, '5 号'];
    const ampUse = inHead(u, range(1, 6)) || head(u) === '15' || c16;
    let why = '';
    let law = '';
    if (item && A >= th) [why, law] = [u === '17' ? '(17)項の建築物' : `延べ面積 ${A}㎡ ≥ ${fmt(th)}㎡`, `令 22 条 1 項 ${item}`];
    else if (u === '16i' && A >= 500 && has(tA) && tA >= 300) [why, law] = [`(16)項イで延べ面積 ${A}㎡ ≥ 500㎡ かつ特定用途部分 ${tA}㎡ ≥ 300㎡`, '令 22 条 1 項 6 号'];
    else if (ampUse && has(amp) && amp > 50) [why, law] = [`契約電流容量 ${amp}A > 50A`, '令 22 条 1 項 7 号'];
    const lathTxt = '間柱・下地を準不燃材料以外で造った鉄網入りの壁、根太・下地を準不燃材料以外で造った鉄網入りの床、天井野縁・下地を準不燃材料以外で造った鉄網入りの天井(ラスモルタル等)';
    if (!v.lath) rows.push({ name, status: 'no', text: `${lathTxt}が無ければ不要${why ? `(規模等の基準「${why}」には当たる)` : ''}`, law: law || '令 22 条 1 項' });
    else if (why) rows.push({ name, status: 'req', text: `${why}。鉄網入りの壁・床・天井がある`, law });
    else if (u === '16i' && A >= 500 && !has(tA)) rows.push({ name, status: 'check', text: `延べ面積 ${A}㎡ ≥ 500㎡。特定用途部分の床面積の合計が 300㎡ 以上なら必要(未入力・6 号)`, law: '令 22 条 1 項 6 号' });
    else if (ampUse && !has(amp)) rows.push({ name, status: 'check', text: `延べ面積の基準には当たらない。契約電流容量が 50A を超えるなら必要(未入力)${c16 ? `。${perPart}` : ''}`, law: '令 22 条 1 項 7 号' });
    else if (c16) rows.push({ name, status: 'check', text: `${perPart}((5)(9)項 150㎡、(1)〜(4)(6)(12)項 300㎡、(7)(8)(10)(11)項 500㎡、(14)(15)項 1,000㎡)`, law: '令 22 条・9 条' });
    else rows.push({ name, status: 'no', text: item ? `延べ ${A}㎡ < ${fmt(th)}㎡${ampUse ? `、契約電流容量 ${amp}A ≤ 50A` : ''}` : `${shortUse(u)}は令 22 条 1 項の用途に無い`, law: '令 22 条' });
  }

  // ---- 消防機関へ通報する火災報知設備(令 23 条・規則 25 条)
  {
    const name = EQ.call;
    const g1 = isIn(u, ['6i1', '6i2', '6i3', '6ro1', '6ro2', '6ro3', '6ro4', '6ro5', '16-2', '16-3']);
    const g2 = inHead(u, ['1', '2', '4', '12', '17']) || isIn(u, ['5i', '6i4', '6ha', '6ni']);
    const g3 = inHead(u, ['3', '7', '8', '9', '10', '11', '13', '14', '15']) || u === '5ro';
    let hit = '';
    let law = '';
    if (g1) [hit, law] = ['延べ面積にかかわらず必要', '令 23 条 1 項 1 号'];
    else if (g2 && A >= 500) [hit, law] = [`延べ面積 ${A}㎡ ≥ 500㎡`, '令 23 条 1 項 2 号'];
    else if (g3 && A >= 1000) [hit, law] = [`延べ面積 ${A}㎡ ≥ 1,000㎡`, '令 23 条 1 項 3 号'];
    // 3 項: 常時通報できる電話で代えられないもの
    const noPhone = isIn(u, ['6i1', '6i2', '6i3', '6ro1', '6ro2', '6ro3', '6ro4', '6ro5', '5i', '6i4', '6ha']);
    const inside = isIn(u, ['6i1', '6i2']);
    if (c16) rows.push({ name, status: 'check', text: `${perPart}((16)項は令 23 条の各号に無い)`, law: '令 23 条・9 条' });
    else if (!hit) rows.push({ name, status: 'no', text: `延べ ${A}㎡ < ${g2 ? 500 : 1000}㎡`, law: '令 23 条' });
    else if (v.nearStation && !inside) rows.push({ name, status: 'no', text: `${hit}の基準に当たるが、消防機関からの歩行距離が 500m 以下なので設置を要しない`, law: '令 23 条 1 項ただし書・規則 25 条 1 項 2 号' });
    else
      rows.push({
        name,
        status: 'req',
        text: `${hit}。${noPhone ? '常時通報できる電話による代替はできない(3 項)' : '消防機関へ常時通報できる電話を設けたときは設置しないことができる(3 項)'}${inside ? '。消防機関が存する建築物内にあるときを除く(規則 25 条 1 項 1 号)' : '。消防機関からの歩行距離が 500m 以下なら不要(規則 25 条 1 項 2 号)'}`,
        law,
      });
  }

  // ---- 非常警報器具・非常警報設備(令 24 条)
  {
    const name = EQ.alarm;
    const cap = v.cap;
    const s3 =
      u === '16-2' ||
      u === '16-3' ||
      v.above >= 11 ||
      v.below >= 3 ||
      (u === '16i' && has(cap) && cap >= 500) ||
      ((inHead(u, range(1, 4)) || u === '5i' || head(u) === '6' || u === '9i') && has(cap) && cap >= 300) ||
      ((inHead(u, ['7', '8']) || u === '5ro') && has(cap) && cap >= 800);
    if (s3) rows.push({ name, status: 'req', text: '非常ベル + 放送設備(または自動式サイレン + 放送設備)。地下街・準地下街・地上 11 階以上・地階 3 以上・収容人員の基準による', law: '令 24 条 3 項' });
    else if (!has(cap)) rows.push({ name, status: 'check', text: '収容人員が未入力のため判定できない(収容人員は消防法施行規則 1 条の 3 で算定)', law: '令 24 条' });
    else if ((u === '5i' || (head(u) === '6' && u.startsWith('6i')) || u === '9i') && cap >= 20) rows.push({ name, status: 'req', text: `収容人員 ${cap} 人 ≥ 20 人 → 非常ベル・自動式サイレン・放送設備のいずれか(自火報を設置した有効範囲は不要)`, law: '令 24 条 2 項 1 号' });
    else if (cap >= 50 || (has(v.capBW) && v.capBW >= 20)) rows.push({ name, status: 'req', text: `収容人員 50 人以上、または地階・無窓階の収容人員 20 人以上 → 非常ベル等(自火報の有効範囲は不要)`, law: '令 24 条 2 項 2 号' });
    else if ((u === '4' || isIn(u, ['6ro1', '6ro2', '6ro3', '6ro4', '6ro5', '6ha', '6ni']) || u === '9ro' || head(u) === '12') && cap >= 20) rows.push({ name, status: 'req', text: `収容人員 ${cap} 人(20 人以上 50 人未満)→ 非常警報器具(自火報・非常警報設備の有効範囲は不要)`, law: '令 24 条 1 項' });
    else rows.push({ name, status: 'no', text: `収容人員 ${cap} 人は基準未満`, law: '令 24 条' });
  }

  // ---- 避難器具(令 25 条)
  {
    const name = EQ.escape;
    const c = v.capFloor;
    const upper = v.above >= 2 || v.below >= 1;
    const low10 = v.lowerTokutei;
    if (!upper) rows.push({ name, status: 'no', text: '平屋で地階が無い(避難階以外の階が無い)', law: '令 25 条' });
    else if (c16) rows.push({ name, status: 'check', text: `${perPart}。3 階(2 階に (2)(3)項の部分があれば 2 階)以上で直通階段が 2 以上ない階は収容人員 10 人以上で必要(5 号)`, law: '令 25 条・9 条' });
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
    const name = EQ.guide;
    const all = inHead(u, range(1, 4)) || u === '5i' || head(u) === '6' || head(u) === '9' || u === '16i' || u === '16-2' || u === '16-3';
    if (all) rows.push({ name, status: 'req', text: `必要(避難が容易なものとして総務省令で定めるものを除く)${head(u) === '1' ? '。客席誘導灯も必要' : ''}`, law: '令 26 条 1 項 1 号・2 号' });
    else if (u === '17') rows.push({ name, status: 'no', text: '(17)項は誘導灯・誘導標識の対象に無い', law: '令 26 条' });
    else if (v.below >= 1 || bw > 0 || v.above >= 11) rows.push({ name, status: 'part', text: '地階・無窓階・11 階以上の部分に必要。それ以外の部分は誘導標識', law: '令 26 条 1 項 1 号・2 号・4 号' });
    else rows.push({ name, status: 'no', text: '誘導灯は不要の見込み。誘導標識は必要((1)〜(16)項)', law: '令 26 条 1 項 4 号' });
  }

  // ---- 排煙設備(令 28 条)
  {
    const name = EQ.smoke;
    if (u === '16-2' && A >= 1000) rows.push({ name, status: 'req', text: `地下街で延べ面積 ${A}㎡ ≥ 1,000㎡`, law: '令 28 条 1 項 1 号' });
    else if (inHead(u, ['2', '4', '10', '13']) && bw >= 1000) rows.push({ name, status: 'part', text: '地階・無窓階で床面積 1,000㎡ 以上の階に必要', law: '令 28 条 1 項 3 号' });
    else if (head(u) === '1') rows.push({ name, status: 'check', text: '舞台部の床面積が 500㎡ 以上なら必要', law: '令 28 条 1 項 2 号' });
    else if (c16) rows.push({ name, status: 'check', text: perPart, law: '令 28 条・9 条' });
    else rows.push({ name, status: 'no', text: '消防法の排煙設備は不要の見込み(建築基準法 126 条の 2 の排煙設備は別に確かめる)', law: '令 28 条' });
  }

  // ---- 消防用水(令 27 条)
  {
    const name = EQ.water;
    const th = v.structure === 'fr' ? 15000 : v.structure === 'qfr' ? 10000 : 5000;
    const above = A - (v.basementTotal || 0);
    const notListed = c16 || u === '16-2' || u === '16-3';
    if (v.height > 31 && above >= 25000) rows.push({ name, status: 'req', text: `高さ ${v.height}m > 31m かつ延べ面積(地階を除く)${above}㎡ ≥ 25,000㎡`, law: '令 27 条 1 項 2 号' });
    else if (!(v.site > 0)) rows.push({ name, status: 'check', text: '敷地面積が未入力(敷地 20,000㎡ 以上で 1・2 階の床面積の合計が基準以上なら必要)', law: '令 27 条 1 項 1 号' });
    else if (!notListed && v.site >= 20000 && v.f12 >= th) rows.push({ name, status: 'req', text: `敷地 ${v.site}㎡ ≥ 20,000㎡ かつ 1・2 階の床面積の合計 ${v.f12}㎡ ≥ ${th}㎡`, law: '令 27 条 1 項 1 号' });
    else if (c16) rows.push({ name, status: 'check', text: perPart, law: '令 27 条・9 条' });
    else rows.push({ name, status: 'no', text: `敷地 20,000㎡ 以上かつ 1・2 階の床面積 ${th}㎡ 以上、または高さ 31m 超かつ延べ 25,000㎡ 以上に当たらない`, law: '令 27 条' });
  }

  // ---- 連結散水設備(令 28 条の 2)
  {
    const name = EQ.sprinkle;
    const b = u === '16-2' ? A : v.basementTotal || 0;
    if (u === '16-3') rows.push({ name, status: 'no', text: '(16の3)項は令 28 条の 2 の用途に無い', law: '令 28 条の 2' });
    else if (b >= 700 && u !== '16ro' && u !== '16i') rows.push({ name, status: 'req', text: `${u === '16-2' ? '延べ面積' : '地階の床面積の合計'} ${b}㎡ ≥ 700㎡(スプリンクラー等を設けた有効範囲は不要)`, law: '令 28 条の 2' });
    else if (c16 && b >= 700) rows.push({ name, status: 'check', text: `地階の床面積の合計 ${b}㎡ ≥ 700㎡。${perPart}`, law: '令 28 条の 2・9 条' });
    else rows.push({ name, status: 'no', text: `地階の床面積の合計 ${b}㎡ < 700㎡`, law: '令 28 条の 2' });
  }

  // ---- 連結送水管(令 29 条)・非常コンセント設備(令 29 条の 2)
  {
    const name = EQ.standpipe;
    if (v.above >= 7) rows.push({ name, status: 'req', text: `地階を除く階数 ${v.above} ≥ 7`, law: '令 29 条 1 項 1 号' });
    else if (v.above >= 5 && A >= 6000) rows.push({ name, status: 'req', text: `地階を除く階数 5 以上かつ延べ面積 ${A}㎡ ≥ 6,000㎡`, law: '令 29 条 1 項 2 号' });
    else if (u === '16-2' && A >= 1000) rows.push({ name, status: 'req', text: `地下街で延べ面積 ${A}㎡ ≥ 1,000㎡`, law: '令 29 条 1 項 3 号' });
    else rows.push({ name, status: 'no', text: '階数・延べ面積の基準に当たらない', law: '令 29 条' });
    const nc = EQ.outlet;
    if (v.above >= 11) rows.push({ name: nc, status: 'req', text: `地階を除く階数 ${v.above} ≥ 11`, law: '令 29 条の 2 第 1 項 1 号' });
    else if (u === '16-2' && A >= 1000) rows.push({ name: nc, status: 'req', text: `地下街で延べ面積 ${A}㎡ ≥ 1,000㎡`, law: '令 29 条の 2 第 1 項 2 号' });
    else rows.push({ name: nc, status: 'no', text: '地上 11 階未満', law: '令 29 条の 2' });
  }

  return rows;
}

// ===========================================================================
// 階ごとの入力表
// ===========================================================================

export type FloorIn = {
  /** 地上は 1, 2, …、地階は -1(地下 1 階), -2, … */
  level: number;
  /** 床面積(㎡。NaN = 未入力) */
  area: number;
  /** (16)項のときの、その階の用途(空 = 未選択)。(16)項以外では使わない */
  use?: UseCode | '';
  /** 無窓階(地上階だけ。消防法施行規則 5 条の 5) */
  windowless?: boolean;
  /** その階の収容人員(NaN = 未入力) */
  cap?: number;
  /** 避難階(未指定なら 1 階を避難階とみなす) */
  evac?: boolean;
};

export type FloorHit = { name: string; law: string; why: string; status: 'part' | 'check' };
export type FloorResult = { floor: FloorIn; label: string; hits: FloorHit[] };
export type PartResult = { use: UseCode; area: number; floors: string[]; rows: Row[] };

export const floorLabel = (level: number) => (level < 0 ? `地下 ${-level} 階` : `${level} 階`);
const isEvac = (f: FloorIn) => (f.evac === undefined ? f.level === 1 : f.evac);
const isB = (f: FloorIn) => f.level < 0;
const isW = (f: FloorIn) => f.level > 0 && !!f.windowless;
const maxOf = (xs: number[]) => xs.reduce((m, x) => Math.max(m, x), 0);
const sumOf = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const validFloors = (floors: FloorIn[]) => floors.filter((f) => has(f.area) && f.area > 0 && Number.isInteger(f.level) && f.level !== 0);

/** その階の用途。(16)項は階ごとの用途(未選択は '')、それ以外は建物の用途 */
const floorUse = (v: FireIn, f: FloorIn): UseCode | '' => (is16(v.use) ? f.use || '' : v.use);

/** (16)項で、面積のある全部の階に用途が選ばれているか */
export const allFloorUsesKnown = (v: FireIn, floors: FloorIn[]) => !is16(v.use) || validFloors(floors).every((f) => !!f.use);

/** 階の表から、judge() に渡す建物全体の値を出す(表に無い項目は base のまま) */
export function deriveFromFloors(base: FireIn, floors: FloorIn[]): FireIn {
  const fl = validFloors(floors);
  if (!fl.length) return base;
  const area = (pred: (f: FloorIn) => boolean) => fl.filter(pred).map((f) => f.area);
  const caps = (list: FloorIn[]) => list.map((f) => f.cap).filter(has);
  const bwFloors = fl.filter((f) => isB(f) || isW(f));
  const bwCaps = caps(bwFloors);
  const bwCapSum = sumOf(bwCaps);
  // 地階・無窓階の収容人員: 一部の階が未入力でも、入っている分で 20 人以上なら判定できる
  const capBW = !bwFloors.length ? 0 : bwCaps.length === bwFloors.length || bwCapSum >= 20 ? bwCapSum : NaN;
  const escFloors = fl.filter((f) => (isB(f) || f.level >= 2) && f.level <= 10 && !isEvac(f));
  const escCaps = caps(escFloors);
  const allCaps = caps(fl);
  const v: FireIn = {
    ...base,
    total: sumOf(fl.map((f) => f.area)),
    above: maxOf(fl.filter((f) => f.level > 0).map((f) => f.level)),
    below: maxOf(fl.filter((f) => f.level < 0).map((f) => -f.level)),
    bwMax: maxOf(area((f) => isB(f) || isW(f))),
    up3Max: maxOf(area((f) => f.level >= 3)),
    up4Max: maxOf(area((f) => f.level >= 4 && f.level <= 10)),
    basementTotal: sumOf(area(isB)),
    f12: sumOf(area((f) => f.level === 1 || f.level === 2)),
    cap: has(base.cap) ? base.cap : allCaps.length === fl.length ? sumOf(allCaps) : NaN,
    capBW,
    capFloor: escCaps.length ? maxOf(escCaps) : escFloors.length ? NaN : 0,
  };
  if (base.use === '16i' && allFloorUsesKnown(base, fl)) {
    const tok = (f: FloorIn) => !!f.use && isTokutei(f.use);
    v.tokuteiArea = sumOf(area(tok));
    v.basementTokutei = sumOf(area((f) => isB(f) && tok(f)));
  }
  return v;
}

/** 下階に令 25 条 1 項 1 号・2 号のかっこ書きの用途((1)〜(4)、(9)、(12)イ、(13)イ、(14)、(15)項)があるか */
const LOWER_HEADS = ['1', '2', '3', '4', '9', '14', '15'];
const lowerHit = (u: UseCode | '') => !!u && (inHead(u, LOWER_HEADS) || u === '12i' || u === '13i');

/** 地階・無窓階・階の位置・階の床面積・階の収容人員で決まる基準を、階ごとに当てる */
export function judgeFloors(v: FireIn, floors: FloorIn[], rows: Row[]): FloorResult[] {
  const fl = validFloors(floors).slice().sort((a, b) => b.level - a.level);
  const rowOf = (name: string) => rows.find((r) => r.name === name);
  const m = hydrantMul(v);
  const c16 = is16(v.use);
  // 令 25 条 5 号: (2)(3)項、または (16)項イで 2 階に (2)(3)項の部分があるものは 2 階から
  const g5floor =
    inHead(v.use, ['2', '3']) || (v.use === '16i' && fl.some((f) => f.level === 2 && !!f.use && inHead(f.use, ['2', '3']))) ? 2 : 3;
  return fl.map((f) => {
    const L = f.level;
    const a = f.area;
    const B = isB(f);
    const W = isW(f);
    const uf = floorUse(v, f);
    const pos = B ? '地階' : W ? '無窓階' : `${L} 階`;
    const hits: FloorHit[] = [];
    const add = (name: string, law: string, why: string, status: 'part' | 'check' = 'part') => hits.push({ name, law, why, status });

    if (c16 && !uf) add('階の用途', '令 9 条', '(16)項は階ごとに用途を選ぶと、用途で決まる基準も判定する', 'check');

    // 消火器具 令 10 条 1 項 5 号
    if ((B || W || L >= 3) && a >= 50) add(EQ.ext, '令 10 条 1 項 5 号', `${pos} ${a}㎡ ≥ 50㎡`);

    // 屋内消火栓 令 11 条 1 項 6 号
    if (uf && (B || W || L >= 4)) {
      const fb = hydrantFloorBase(uf);
      if (fb && a >= fb * m) add(EQ.hydrant, '令 11 条 1 項 6 号', `${pos} ${a}㎡ ≥ ${fb * m}㎡${m > 1 ? `(倍読み ${m} 倍)` : ''}`);
    }

    // スプリンクラー 令 12 条 1 項 10〜12 号
    if (L >= 11) add(EQ.sp, '令 12 条 1 項 12 号', '11 階以上の階');
    else if (uf) {
      const tok = isTokutei(uf);
      const tA = v.tokuteiArea;
      if (v.use === '16i' && tok && has(tA) && tA >= 3000 && v.above < 11) add(EQ.sp, '令 12 条 1 項 10 号', `特定用途部分の合計 ${tA}㎡ ≥ 3,000㎡ で、この階に特定用途部分がある`);
      const g1 = head(uf) === '1' || head(uf) === '3' || uf === '5i' || head(uf) === '6' || uf === '9i';
      const g2 = head(uf) === '2' || uf === '4';
      const item = c16 ? '11 号ハ' : g1 ? '11 号イ' : '11 号ロ';
      if (g1 || g2) {
        const th = Math.min(B || W ? 1000 : Infinity, L >= 4 && L <= 10 ? (g2 ? 1000 : 1500) : Infinity);
        if (Number.isFinite(th) && a >= th) add(EQ.sp, `令 12 条 1 項 ${item}`, `${B || W ? pos : `${L} 階(4〜10 階)`} ${a}㎡ ≥ ${fmt(th)}㎡`);
      }
    }

    // 自動火災報知設備 令 21 条 1 項 10・11・14 号
    if (uf && (B || W) && (isIn(uf, ['2i', '2ro', '2ha']) || head(uf) === '3') && a >= 100) add(EQ.afa, '令 21 条 1 項 10 号', `${pos} ${a}㎡ ≥ 100㎡((2)項イ〜ハ・(3)項)`);
    else if ((B || W || L >= 3) && a >= 300) add(EQ.afa, '令 21 条 1 項 11 号', `${pos} ${a}㎡ ≥ 300㎡`);
    if (L >= 11) add(EQ.afa, '令 21 条 1 項 14 号', '11 階以上の階');

    // ガス漏れ 令 21 条の 2 第 1 項 4 号・5 号(地階)。建物全体の行で地階に必要と出たときだけ
    const gas = rowOf(EQ.gas);
    if (B && gas && gas.status === 'part') add(EQ.gas, gas.law, `地階の床面積の合計 ${v.basementTotal}㎡`);

    // 避難器具 令 25 条(避難階・11 階以上を除く 2 階以上の階と地階)
    if (!isEvac(f) && L <= 10 && (B || L >= 2)) {
      const c = f.cap;
      const lower = v.lowerTokutei || fl.some((g) => g.level < L && lowerHit(floorUse(v, g)));
      const need: { min: number; law: string; why: string }[] = [];
      if (uf) {
        if (head(uf) === '6') need.push({ min: lower ? 10 : 20, law: '令 25 条 1 項 1 号', why: `(6)項 ${lower ? '下階に (1)〜(4) 等があり ' : ''}${lower ? 10 : 20} 人以上` });
        else if (head(uf) === '5') need.push({ min: lower ? 10 : 30, law: '令 25 条 1 項 2 号', why: `(5)項 ${lower ? '下階に (1)〜(4) 等があり ' : ''}${lower ? 10 : 30} 人以上` });
        else if (inHead(uf, range(1, 4)) || inHead(uf, range(7, 11))) {
          if (!(L === 2 && v.structure === 'fr')) need.push({ min: 50, law: '令 25 条 1 項 3 号', why: '50 人以上' });
        } else if (inHead(uf, ['12', '15']) && (B || L >= 3)) need.push({ min: B || W ? 100 : 150, law: '令 25 条 1 項 4 号', why: `${B || W ? '3 階以上の無窓階・地階で 100' : '150'} 人以上` });
      }
      if (v.stairsLack && L >= g5floor) need.push({ min: 10, law: '令 25 条 1 項 5 号', why: '直通階段が 2 以上なく 10 人以上' });
      if (need.length) {
        if (!has(c)) add(EQ.escape, need.map((n) => n.law).join('・'), '収容人員が未入力', 'check');
        else {
          const n = need.find((x) => c >= x.min);
          if (n) add(EQ.escape, n.law, `収容人員 ${c} 人(${n.why})`);
        }
      }
    }

    // 誘導灯 令 26 条(全館に要る用途以外は、地階・無窓階・11 階以上の部分)
    const guide = rowOf(EQ.guide);
    if (guide && guide.status !== 'req' && v.use !== '17' && (B || W || L >= 11)) add(EQ.guide, '令 26 条 1 項 1 号・2 号', B ? '地階' : W ? '無窓階' : '11 階以上の部分');

    // 排煙設備 令 28 条 1 項 3 号
    if (uf && (B || W) && inHead(uf, ['2', '4', '10', '13']) && a >= 1000) add(EQ.smoke, '令 28 条 1 項 3 号', `${pos} ${a}㎡ ≥ 1,000㎡`);

    return { floor: f, label: floorLabel(L), hits };
  });
}

/** (16)項: 用途ごとの部分を 1 つの防火対象物とみなして延べ面積で決まる基準を当てる(令 9 条) */
const PART_NAMES: string[] = [EQ.ext, EQ.hydrant, EQ.sp, EQ.afa, EQ.gas, EQ.leak, EQ.call, EQ.smoke, EQ.sprinkle];
/** 令 9 条で (16)項の部分ごとの判定から除かれている号(建物全体で判定する) */
const PART_EXCLUDED_LAWS = ['令 12 条 1 項 3 号', '令 21 条 1 項 7 号'];

export function judgeParts(v: FireIn, floors: FloorIn[]): PartResult[] {
  if (!is16(v.use)) return [];
  const fl = validFloors(floors);
  const uses = Array.from(new Set(fl.map((f) => f.use).filter((u): u is UseCode => !!u && !is16(u))));
  return uses.map((pu) => {
    const pf = fl.filter((f) => f.use === pu);
    const caps = pf.map((f) => f.cap).filter(has);
    const pv: FireIn = {
      ...v,
      use: pu,
      total: sumOf(pf.map((f) => f.area)),
      bwMax: maxOf(pf.filter((f) => isB(f) || isW(f)).map((f) => f.area)),
      up3Max: maxOf(pf.filter((f) => f.level >= 3).map((f) => f.area)),
      up4Max: maxOf(pf.filter((f) => f.level >= 4 && f.level <= 10).map((f) => f.area)),
      basementTotal: sumOf(pf.filter(isB).map((f) => f.area)),
      f12: sumOf(pf.filter((f) => f.level === 1 || f.level === 2).map((f) => f.area)),
      cap: caps.length === pf.length ? sumOf(caps) : NaN,
      capBW: NaN,
      capFloor: NaN,
      lowerTokutei: false,
      stairsLack: false,
      tokuteiArea: undefined,
      basementTokutei: undefined,
      hotSpring: false,
      ampere: 0,
    };
    const rows = judge(pv).filter(
      (r) => PART_NAMES.includes(r.name) && (r.status === 'req' || r.status === 'check') && !PART_EXCLUDED_LAWS.some((l) => r.law.startsWith(l)),
    );
    return { use: pu, area: pv.total, floors: pf.sort((a, b) => a.level - b.level).map((f) => floorLabel(f.level)), rows };
  });
}

const uniq = (xs: string[]) => Array.from(new Set(xs));

/**
 * 階の表を使うときの判定。
 * - 建物全体の値は表から出して judge() にかける(延べ面積で決まるものは合計で判定)
 * - 「該当する階・部分に必要」の行は、階ごとに当てた結果で「該当する階」を書き直す
 * - (16)項は用途ごとの部分(令 9 条)の結果も足す
 */
export function judgeWithFloors(base: FireIn, floors: FloorIn[]): { v: FireIn; rows: Row[]; floors: FloorResult[]; parts: PartResult[] } {
  const v = deriveFromFloors(base, floors);
  const raw = judge(v);
  const parts = judgeParts(v, floors);
  const fr = judgeFloors(v, floors, raw);
  const known = allFloorUsesKnown(v, floors);
  const c16 = is16(v.use);
  const rows = raw.map((r): Row => {
    if (r.status === 'req') return r;
    const pReq = parts.flatMap((p) => p.rows.filter((pr) => pr.name === r.name && pr.status === 'req').map((pr) => ({ p, pr })));
    // 用途の部分全体に要るときは、その部分の階を「該当する階」に重ねて書かない
    const covered = new Set(pReq.flatMap(({ p }) => p.floors));
    const hits = fr.flatMap((x) => (covered.has(x.label) ? [] : x.hits.filter((h) => h.name === r.name && h.status === 'part').map((h) => ({ ...h, label: x.label }))));
    const checks = fr.flatMap((x) => x.hits.filter((h) => h.name === r.name && h.status === 'check').map((h) => ({ ...h, label: x.label })));
    const pChk = parts.flatMap((p) => p.rows.filter((pr) => pr.name === r.name && pr.status === 'check').map((pr) => ({ p, pr })));
    const partTxt = (xs: { p: PartResult; pr: Row }[]) =>
      xs.map(({ p, pr }) => `${shortUse(p.use)}の部分(${p.floors.join('・')} 計 ${p.area}㎡): ${pr.text}(${pr.law})`).join('。');
    const floorTxt = hits.map((h) => `${h.label}(${h.why})`).join('、');
    const chkTxt = checks.map((h) => `${h.label}(${h.why})`).join('、');
    if (hits.length || pReq.length) {
      const text = [pReq.length ? partTxt(pReq) : '', hits.length ? `該当する階: ${floorTxt}` : '', chkTxt ? `要確認の階: ${chkTxt}` : '', pChk.length ? `要確認: ${partTxt(pChk)}` : '']
        .filter(Boolean)
        .join('。');
      return { name: r.name, status: 'part', text, law: uniq([...pReq.map((x) => x.pr.law), ...hits.map((h) => h.law)]).join('・') };
    }
    if (checks.length || pChk.length) {
      const text = [chkTxt ? `要確認の階: ${chkTxt}` : '', pChk.length ? partTxt(pChk) : ''].filter(Boolean).join('。');
      return { name: r.name, status: 'check', text, law: uniq([...checks.map((h) => h.law), ...pChk.map((x) => x.pr.law)]).join('・') };
    }
    // 階ごとに見て当たる階が無い(「該当する階・部分」は全部の階で当てているので、無ければ不要)
    if (r.status === 'part' && (!c16 || known)) return { name: r.name, status: 'no', text: '階ごとに見ると、当たる階が無い', law: r.law };
    if (r.name === EQ.escape && r.status === 'check' && (!c16 || known)) return { name: r.name, status: 'no', text: 'どの階も収容人員の基準に当たらない', law: '令 25 条' };
    // (16)項イのスプリンクラー(10 号・11 号ハ)は、表の用途から特定用途部分の合計と階ごとの部分を出して当てている
    if (c16 && known && r.status === 'check' && (PART_NAMES.includes(r.name) || r.name === EQ.escape) && (/9 条/.test(r.law) || r.name === EQ.sp))
      return { name: r.name, status: 'no', text: '用途ごとの部分(令 9 条)・階ごとの基準のどちらにも当たらない', law: r.law };
    return r;
  });
  return { v, rows, floors: fr, parts };
}
