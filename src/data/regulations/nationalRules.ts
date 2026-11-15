import { egovSource } from './lawSources';
import { STRUCTURE_OPTIONS, USE_OPTIONS } from './options';
import type { ProjectInput, RegulationRule, RuleSource } from './types';

/**
 * 全国共通レイヤー
 *
 * 用途 × 規模 × 高さ × 立地 × 工事種別 で機械的に決まる、自治体に依存しない法令。
 * ここは作り切りで全国に効く。自治体ごとに違う部分は municipalities/ 配下の自治体パックに置く。
 *
 * 各ルールは根拠条項・閾値・出典を必ず持たせている。閾値は入力値と並べて
 * 表示するので、利用者がその場で妥当性を検証できる。
 */

const ASOF = '2026-09-05';
/** e-Gov の条文と閾値・条番号を突き合わせ直した日。この日付のルールは条文で確かめてある */
const VERIFIED = '2026-11-16';

// ---------------------------------------------------------------------------
// 補助関数
// ---------------------------------------------------------------------------

const useLabel = (id: string) => USE_OPTIONS.find((u) => u.id === id)?.label ?? id;

/** 選択された用途のうち、属性を満たすもののラベル一覧 */
function usesWith(p: ProjectInput, key: keyof (typeof USE_OPTIONS)[number]): string[] {
  return p.useIds
    .map((id) => USE_OPTIONS.find((u) => u.id === id))
    .filter((u): u is (typeof USE_OPTIONS)[number] => !!u && !!u[key])
    .map((u) => u.label);
}

const hasUse = (p: ProjectInput, ...ids: string[]) => ids.some((id) => p.useIds.includes(id));
const onlyUses = (p: ProjectInput, ...ids: string[]) => p.useIds.length > 0 && p.useIds.every((id) => ids.includes(id));
const hasFlag = (p: ProjectInput, id: string) => p.siteFlags.includes(id);
const isWork = (p: ProjectInput, ...w: string[]) => w.some((x) => p.workTypes.includes(x as never));
/** 新築・増築・改築のいずれか(建物ができる工事) */
const isBuilding = (p: ProjectInput) => isWork(p, 'new', 'extension', 'rebuild');
const m2 = (n: number) => `${n.toLocaleString()}m2`;
const structLabel = (p: ProjectInput) => STRUCTURE_OPTIONS.find((s) => s.id === p.structure)?.label ?? p.structure;

/** e-Gov の法令ページ(lawSources.ts の登録外の法令用。ID は e-Gov 法令API で法令名を確かめたもの) */
const egovById = (name: string, lawId: string): RuleSource => ({
  label: `e-Gov 法令検索: ${name}`,
  url: `https://laws.e-gov.go.jp/law/${lawId}`,
});

/** 建築基準法上の階数(地階を含む) */
const floorsAll = (p: ProjectInput) => p.floorsAbove + p.floorsBelow;

/** 法第6条第1項第一号: 別表第一(い)欄の用途部分 > 200m2(延べ面積で近似) */
const isGo1 = (p: ProjectInput) => usesWith(p, 'beppyo1').length > 0 && p.totalFloorArea > 200;
/** 法第6条第1項第二号: 一号以外で 階数2以上 または 延べ面積 > 200m2 */
const isGo2 = (p: ProjectInput) => !isGo1(p) && (floorsAll(p) >= 2 || p.totalFloorArea > 200);
/** 法第6条第1項第三号: 一号・二号以外で都市計画区域等の内 */
const isGo3 = (p: ProjectInput) => !isGo1(p) && !isGo2(p) && p.inCityPlanningArea && p.totalFloorArea > 0;

/**
 * 建築確認が要る工事か。
 * 建築は一号〜三号、大規模の修繕・模様替は一号・二号(法6条1項)、用途変更は一号にする場合(法87条1項)。
 */
function needsKakunin(p: ProjectInput): boolean {
  if (isBuilding(p) && (isGo1(p) || isGo2(p) || isGo3(p))) return true;
  if (isWork(p, 'majorRepair') && (isGo1(p) || isGo2(p))) return true;
  if (isWork(p, 'useChange') && isGo1(p)) return true;
  return false;
}

/**
 * 建築基準法第20条第1項の号。
 *  1 … 高さ60m超(大臣認定)
 *  2 … 二号(木造: 地上4階以上か高さ16m超 / 鉄骨造: 地上4階以上か高さ16m超 / RC・SRC: 高さ20m超 等)
 *  3 … 三号(法6条1項一号・二号の建築物。木造は地上3階以上か延べ300m2超に限る)
 *  4 … 四号(仕様規定のみ)
 * 「その他(混構造・組積造等)」は令第36条の2第一号・第四号の 地上4階以上か高さ16m超 で近似する。
 */
function structuralClass(p: ProjectInput): 1 | 2 | 3 | 4 {
  const H = p.maxHeight;
  const F = p.floorsAbove;
  const A = p.totalFloorArea;
  if (H > 60) return 1;
  if (p.structure === 'rc' || p.structure === 'src') {
    if (H > 20) return 2;
  } else if (F >= 4 || H > 16) {
    return 2;
  }
  const go12 = isGo1(p) || isGo2(p);
  if (p.structure === 'wood') return go12 && (F >= 3 || A > 300) ? 3 : 4;
  return go12 ? 3 : 4;
}

// ---------------------------------------------------------------------------
// 入力の確認(判定できていない項目を「該当なし」に見せないため)
// ---------------------------------------------------------------------------

const inputRules: RegulationRule[] = [
  {
    id: 'input-missing',
    category: '入力の確認',
    title: '未入力のため判定していない項目',
    law: '入力条件',
    provision: '—',
    action: '入力不足',
    authority: '—',
    summary:
      'ここに挙げた入力が空のままなので、それを条件にする法令は「該当しない」のではなく「判定していない」。入力すると判定に加わる。立地条件は該当が無いことを確かめた場合は無視してよい。',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'check',
    sources: [],
    match: (p) => {
      const miss: string[] = [];
      const building = isBuilding(p) || isWork(p, 'majorRepair', 'useChange');
      if (p.workTypes.length === 0) miss.push('工事種別(確認申請・省エネ・建設リサイクル法等を判定していない)');
      if (p.useIds.length === 0 && (building || isWork(p, 'renovation'))) {
        miss.push('用途(確認申請の区分・消防・バリアフリー法・用途固有の許可を判定していない)');
      }
      if (building && p.totalFloorArea <= 0) {
        miss.push('延べ面積(確認申請の区分・構造計算・省エネ・バリアフリー法・建築士法等を判定していない)');
      }
      if (isBuilding(p) && p.maxHeight <= 0) {
        miss.push('最高高さ(構造計算の区分・非常用昇降機・航空法・労働安全衛生法等を判定していない)');
      }
      if (isBuilding(p) && p.siteArea <= 0) miss.push('敷地面積(開発許可・工場立地法・緑化率を判定していない)');
      if (isBuilding(p) && p.formChangeArea <= 0) {
        miss.push('形質変更面積(土壌汚染対策法の届出・盛土規制法の規模を判定していない)');
      }
      if ((isBuilding(p) || isWork(p, 'useChange')) && p.inCityPlanningArea && !p.urbanizationControlArea && p.zoning === '未選択') {
        miss.push('用途地域(用途制限・駐車場の附置義務を判定していない)');
      }
      if (isWork(p, 'demolition', 'rebuild') && p.demolitionArea <= 0) {
        miss.push('解体床面積(建設リサイクル法80m2・石綿の事前調査結果の報告を判定していない)');
      }
      if (isWork(p, 'majorRepair', 'renovation', 'useChange') && p.contractAmountManYen <= 0) {
        miss.push('請負金額(建設リサイクル法1億円・石綿の事前調査結果の報告100万円を判定していない)');
      }
      if (usesWith(p, 'retail').length > 0 && p.storeArea <= 0) {
        miss.push('店舗面積(大規模小売店舗立地法を延べ面積で近似している)');
      }
      if (p.siteFlags.length === 0) {
        miss.push('立地条件(防火地域・地区計画・埋蔵文化財包蔵地・景観計画区域等が1つも選ばれていない。区域指定で決まる法令は判定していない)');
      }
      return miss.length ? `未入力: ${miss.join(' / ')}` : null;
    },
  },
];

// ---------------------------------------------------------------------------
// 建築基準法の手続
// ---------------------------------------------------------------------------

const kenchikuKijunRules: RegulationRule[] = [
  {
    id: 'bsl-6-1-1',
    category: '建築基準法の手続',
    title: '建築確認申請(第一号 特殊建築物)',
    law: '建築基準法',
    provision: '法第6条第1項第一号・第87条第1項(用途変更)',
    action: '確認申請',
    authority: '建築主事(特定行政庁)または指定確認検査機関',
    summary:
      '別表第一(い)欄の用途(令第115条の3で類するものを含む)に供する部分の床面積の合計が200m2を超える特殊建築物は、全国どこでも(都市計画区域の内外を問わず)確認申請が要る。大規模の修繕・模様替も同じ。用途変更でこの特殊建築物にする場合も、類似用途間の変更(令第137条の18)を除き確認申請が要る(法第87条第1項)。',
    threshold: '別表第一(い)欄の用途部分 > 200m2',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'likely',
    sources: [egovSource('建築基準法'), egovSource('建築基準法施行令')],
    note: '用途部分の床面積で判定する。延べ面積そのものではない点に注意。ここでは延べ面積で近似しているので、複合用途のときは別表第一の用途に供する部分の面積で確認すること。事務所・無床診療所・長屋・工場・理容所等は別表第一に無い。',
    match: (p) => {
      if (!isBuilding(p) && !isWork(p, 'majorRepair', 'useChange')) return null;
      const special = usesWith(p, 'beppyo1');
      if (special.length === 0) return null;
      if (p.totalFloorArea <= 200) return null;
      const useChangeOnly = isWork(p, 'useChange') && !isBuilding(p) && !isWork(p, 'majorRepair');
      return `別表第一の用途(${special.join('・')})を含み、延べ面積 ${m2(p.totalFloorArea)} が 200m2 を超える${
        useChangeOnly ? '。用途変更は法第87条第1項で確認申請を準用(類似用途間の変更を除く)' : ''
      }`;
    },
  },
  {
    id: 'bsl-6-1-2',
    category: '建築基準法の手続',
    title: '建築確認申請(第二号 いわゆる新2号建築物)',
    law: '建築基準法',
    provision: '法第6条第1項第二号',
    action: '確認申請',
    authority: '建築主事(特定行政庁)または指定確認検査機関',
    summary:
      '令和7年4月1日施行の改正で、木造と非木造の区分が廃止され、第一号以外で「階数2以上または延べ面積200m2超」の建築物に一本化された。全国どこでも(都市計画区域の内外を問わず)確認申請が要り、大規模の修繕・模様替も対象。旧4号特例の対象から外れるため、構造関係規定と省エネ関係の図書の提出が必要になる。',
    threshold: '第一号以外で 階数(地階を含む) >= 2 または 延べ面積 > 200m2',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovSource('建築基準法')],
    note: '令和7年4月1日施行。着工時期によって適用が変わるため、既存案件は施行日との関係を確認すること。防火地域・準防火地域外で、増築・改築・移転に係る部分の床面積が10m2以内なら確認申請は不要(法第6条第2項)。',
    match: (p) => {
      if (!isBuilding(p) && !isWork(p, 'majorRepair')) return null;
      if (!isGo2(p)) return null;
      const floors = floorsAll(p);
      const why: string[] = [];
      if (floors >= 2) why.push(`階数 ${floors}(地上${p.floorsAbove}・地下${p.floorsBelow})が2以上`);
      if (p.totalFloorArea > 200) why.push(`延べ面積 ${m2(p.totalFloorArea)} が 200m2 超`);
      return why.join(' / ');
    },
  },
  {
    id: 'bsl-6-1-3',
    category: '建築基準法の手続',
    title: '建築確認申請(第三号 いわゆる新3号建築物)',
    law: '建築基準法',
    provision: '法第6条第1項第三号・第6条の4第1項第三号',
    action: '確認申請',
    authority: '建築主事(特定行政庁)または指定確認検査機関',
    summary:
      '都市計画区域・準都市計画区域等の内にある、第一号・第二号以外の建築物(平屋かつ延べ面積200m2以下)。確認申請は要るが、建築士が設計したものは構造関係規定等の一部の審査が省略される(法第6条の4)。都市計画区域等の外なら確認申請は不要。大規模の修繕・模様替は対象外。',
    threshold: '都市計画区域等内 かつ 平屋 かつ 延べ面積 <= 200m2',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovSource('建築基準法')],
    note: '防火地域・準防火地域外で、増築・改築・移転に係る部分の床面積が10m2以内なら確認申請は不要(法第6条第2項)。',
    match: (p) => {
      if (!isBuilding(p)) return null;
      if (!isGo3(p)) return null;
      return `都市計画区域等内で、階数 ${floorsAll(p)}・延べ面積 ${m2(p.totalFloorArea)}(平屋かつ200m2以下)`;
    },
  },
  {
    id: 'bsl-6-3',
    category: '建築基準法の手続',
    title: '構造計算適合性判定',
    law: '建築基準法',
    provision: '法第6条の3・第20条第1項第二号・第三号・令第36条の2',
    action: '判定',
    authority: '都道府県知事または指定構造計算適合性判定機関',
    summary:
      '許容応力度等計算(ルート2)・保有水平耐力計算(ルート3)・限界耐力計算、または大臣認定プログラムによる構造計算で確かめる建築物は、確認申請とは別に構造計算適合性判定を受ける。法第20条第1項第二号の建築物はルート2以上が必須なので原則として適判の対象(ルート2を構造計算の資格を持つ建築主事等・確認検査員が審査する場合は不要: 法第6条の3第1項ただし書)。第三号の建築物は許容応力度計算(ルート1)で済ませれば適判は不要。判定に日数がかかるため、工程上は確認申請と並行で見込む。',
    threshold:
      '二号: 木造 地上4階以上か高さ16m超 / 鉄骨造 地上4階以上か高さ16m超 / RC・SRC造 高さ20m超 等。三号: 確認申請の一号・二号の建築物(木造は地上3階以上か延べ300m2超)',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'check',
    sources: [egovSource('建築基準法'), egovSource('建築基準法施行令')],
    note: '令和7年4月1日施行の改正で、木造の二号の基準が「高さ13m超・軒高9m超」から「地上4階以上・高さ16m超」に、三号が「延べ500m2超」から「延べ300m2超」に変わった。採用する計算ルートによって適判の要否が決まるため、構造設計者と早期に確認すること。',
    match: (p) => {
      if (!isBuilding(p)) return null;
      if (p.totalFloorArea <= 0 && p.maxHeight <= 0) return null;
      const cls = structuralClass(p);
      const head = `${structLabel(p)}で 地上 ${p.floorsAbove} 階 / 高さ ${p.maxHeight}m / 延べ面積 ${m2(p.totalFloorArea)}`;
      if (cls === 1) return null; // 高さ60m超は大臣認定(bsl-20-1-1)
      if (cls === 2) {
        return `${head}。法第20条第1項第二号に当たり、ルート2以上の構造計算となるため原則として適判の対象${
          p.structure === 'other' ? '(混構造・組積造等は令第36条の2の区分を構造設計者と確認する)' : ''
        }`;
      }
      if (cls === 3) {
        return `${head}。法第20条第1項第三号(構造計算が要る規模)。ルート1なら適判不要、ルート2以上を採用すると適判の対象`;
      }
      return null;
    },
  },
  {
    id: 'bsl-20-1-1',
    category: '建築基準法の手続',
    title: '高さ60m超の建築物の構造方法の大臣認定',
    law: '建築基準法',
    provision: '法第20条第1項第一号',
    action: '認定',
    authority: '国土交通大臣(指定性能評価機関の性能評価を経る)',
    summary:
      '高さ60mを超える建築物は、時刻歴応答解析等の構造計算で安全性を確かめ、構造方法について国土交通大臣の認定を受けなければならない。性能評価と認定を経てから確認申請に進むため、確認申請の前に数か月の工程を見込む。',
    threshold: '高さ > 60m',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovSource('建築基準法')],
    match: (p) => (isBuilding(p) && p.maxHeight > 60 ? `最高高さ ${p.maxHeight}m が 60m を超える` : null),
  },
  {
    id: 'bsl-7-3',
    category: '建築基準法の手続',
    title: '中間検査',
    law: '建築基準法',
    provision: '法第7条の3・令第11条',
    action: '報告',
    authority: '建築主事(特定行政庁)または指定確認検査機関',
    summary:
      '階数3以上の共同住宅は、2階の床とこれを支持するはりに鉄筋を配置する工事の工程が全国一律の特定工程(法第7条の3第1項第一号・令第11条)。それ以外は特定行政庁が区域・期間・構造・用途・規模を限って指定する(同項第二号)。特定工程の工事を終えた日から4日以内に検査を申請し、合格証の交付を受けるまで後の工程に進めない。',
    threshold: '階数3以上の共同住宅(全国一律) / それ以外は特定行政庁の指定による',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'check',
    sources: [egovSource('建築基準法'), egovSource('建築基準法施行令')],
    note: '特定行政庁の指定は自治体ごとに異なる。ここは自治体差分レイヤーで埋めるべき項目。',
    match: (p) => {
      if (!isBuilding(p) && !isWork(p, 'majorRepair')) return null;
      if (!needsKakunin(p)) return null;
      if (hasUse(p, 'apartment') && floorsAll(p) >= 3 && p.structure !== 'wood') {
        return `階数 ${floorsAll(p)} の共同住宅(${structLabel(p)})。2階の床・はりの配筋工事で中間検査が要る(全国一律)。特定行政庁の指定も確認する`;
      }
      return '確認申請を要する工事。特定行政庁による特定工程の指定の有無を確認する';
    },
  },
  {
    id: 'bsl-48',
    category: '建築基準法の手続',
    title: '用途地域内の建築制限',
    law: '建築基準法',
    provision: '法第48条・別表第二(用途変更は法第87条第2項で準用)',
    action: '適合義務',
    authority: '建築主事(特定行政庁)',
    summary:
      '用途地域ごとに建てられる用途が別表第二で決まる。該当しない用途は特定行政庁の許可(法第48条ただし書)が要り、公聴会と建築審査会の同意を経るため時間がかかる。用途変更にも準用される。',
    threshold: '用途地域と用途の組み合わせによる',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'check',
    sources: [egovSource('建築基準法')],
    match: (p) => {
      if (!isBuilding(p) && !isWork(p, 'useChange')) return null;
      if (p.zoning === '未選択' || p.useIds.length === 0) return null;
      return `${p.zoning}における ${p.useIds.map(useLabel).join('・')} の可否を別表第二で確認する`;
    },
  },
  {
    id: 'bsl-61',
    category: '建築基準法の手続',
    title: '防火地域・準防火地域内の建築物の構造',
    law: '建築基準法',
    provision: '法第61条・令第136条の2',
    action: '適合義務',
    authority: '建築主事(特定行政庁)または指定確認検査機関',
    summary:
      '防火地域・準防火地域内の建築物は、地域と規模に応じて耐火建築物等・準耐火建築物等・防火構造等とし、外壁の開口部で延焼のおそれのある部分に防火設備を設ける。構造種別と外装・サッシの仕様が決まるので、基本計画の段階で押さえる。',
    threshold:
      '防火地域: 階数(地階を含む)3以上か延べ100m2超で耐火建築物等、それ以外は準耐火建築物等 / 準防火地域: 地上4階以上か延べ1,500m2超で耐火建築物等、地上3階か延べ500m2超で準耐火建築物等',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovSource('建築基準法'), egovSource('建築基準法施行令')],
    note: '耐火建築物等・準耐火建築物等には、延焼防止時間で同等以上と確かめた延焼防止建築物等を含む(令第136条の2各号ロ)。',
    match: (p) => {
      if (!isBuilding(p)) return null;
      const A = p.totalFloorArea;
      const all = floorsAll(p);
      const F = p.floorsAbove;
      if (hasFlag(p, 'fireArea')) {
        if (A <= 0) return '防火地域内と入力されている。延べ面積が未入力のため構造の区分は判定していない';
        return all >= 3 || A > 100
          ? `防火地域内で 階数 ${all} / 延べ面積 ${m2(A)}。耐火建築物等(令第136条の2第一号)`
          : `防火地域内で 階数 ${all} / 延べ面積 ${m2(A)}。準耐火建築物等(令第136条の2第二号)`;
      }
      if (hasFlag(p, 'quasiFireArea')) {
        if (A <= 0) return '準防火地域内と入力されている。延べ面積が未入力のため構造の区分は判定していない';
        if (F >= 4 || A > 1500) return `準防火地域内で 地上 ${F} 階 / 延べ面積 ${m2(A)}。耐火建築物等(令第136条の2第一号)`;
        if (F === 3 || A > 500) return `準防火地域内で 地上 ${F} 階 / 延べ面積 ${m2(A)}。準耐火建築物等(令第136条の2第二号)`;
        return `準防火地域内で 地上 ${F} 階 / 延べ面積 ${m2(A)}。木造なら外壁・軒裏を防火構造等(同条第三号)、それ以外も延焼のおそれのある開口部に防火設備(同条第四号)`;
      }
      return null;
    },
  },
  {
    id: 'bsl-58',
    category: '建築基準法の手続',
    title: '高度地区の高さ制限',
    law: '建築基準法 / 都市計画法',
    provision: '建基法第58条、都計法第9条',
    action: '適合義務',
    authority: '市町村(都市計画担当課)',
    summary:
      '高度地区では、都市計画で定めた高さの最高限度(北側からの斜線型が多い)または最低限度に適合させる。斜線の勾配や絶対高さは都市計画ごとに違うので、都市計画図と告示で数値を確かめる。',
    threshold: '高度地区内',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovSource('建築基準法'), egovSource('都市計画法')],
    match: (p) => (isBuilding(p) && hasFlag(p, 'heightDistrict') ? '高度地区内と入力されている' : null),
  },
  {
    id: 'bsl-86-7',
    category: '建築基準法の手続',
    title: '既存不適格建築物の増築等の制限緩和',
    law: '建築基準法',
    provision: '法第86条の7・第87条第3項(用途変更)',
    action: '適合義務',
    authority: '建築主事(特定行政庁)',
    summary:
      '既存不適格の建築物に増築・改築・大規模の修繕等を行う場合、どこまで現行法に適合させるかが条文と告示で決まる。用途変更では法第87条第3項で一部の規定が準用される。既存部分の調査(検査済証の有無を含む)が前提になるため、基本設計の前に着手しないと工程を圧迫する。',
    threshold: '増築・改築・大規模の修繕・模様替・用途変更を行う場合',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'check',
    sources: [egovSource('建築基準法')],
    match: (p) =>
      isWork(p, 'extension', 'rebuild', 'majorRepair', 'useChange')
        ? `${
            p.workTypes.includes('extension')
              ? '増築'
              : p.workTypes.includes('rebuild')
                ? '改築・移転'
                : p.workTypes.includes('majorRepair')
                  ? '大規模の修繕・模様替'
                  : '用途変更'
          }を含む。既存部分の適合状況の調査が要る`
        : null,
  },
  {
    id: 'architect-act-3',
    category: '建築基準法の手続',
    title: '建築士でなければ設計・工事監理できない建築物',
    law: '建築士法',
    provision: '法第3条〜第3条の3・第20条の2・第20条の3',
    action: '適合義務',
    authority: '都道府県(建築士事務所登録)',
    summary:
      '規模・用途・構造によって、一級建築士でなければ設計・工事監理できない建築物(第3条)、一級または二級建築士(第3条の2)、木造建築士以上(第3条の3)が決まる。増築・改築・大規模の修繕・模様替は、その部分を新築とみなして判定する。法第20条第1項第一号・第二号の建築物の構造設計は構造設計一級建築士の関与、階数3以上かつ床面積5,000m2超は設備設計一級建築士の関与が要る。体制の確認を設計契約前に済ませる。',
    threshold:
      '一級: 学校・病院・劇場・集会場・百貨店等で延べ500m2超 / 木造で高さ16m超か地上4階以上 / RC・S造等で延べ300m2超か高さ16m超か地上4階以上 / 延べ1,000m2超かつ階数2以上',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'likely',
    sources: [egovSource('建築士法')],
    note: '二級建築士の範囲(第3条の2)は、都道府県が条例で延べ面積を別に定めている場合がある。混構造は構造ごとの部分で判定する。',
    match: (p) => {
      if (!isBuilding(p) && !isWork(p, 'majorRepair')) return null;
      const A = p.totalFloorArea;
      const H = p.maxHeight;
      const F = p.floorsAbove;
      if (A <= 0) return null;
      const wood = p.structure === 'wood';
      const head = `${structLabel(p)} / 延べ面積 ${m2(A)} / 地上 ${F} 階 / 高さ ${H}m`;
      const ikkyu: string[] = [];
      const bigUse = p.useIds.filter((id) => ['school', 'hospital', 'theater', 'assemblyHall', 'retailStore'].includes(id));
      if (bigUse.length && A > 500) {
        ikkyu.push(`${bigUse.map(useLabel).join('・')}で延べ500m2超${bigUse.includes('retailStore') ? '(物販店舗は百貨店に当たる場合)' : ''}`);
      }
      if (wood && (H > 16 || F >= 4)) ikkyu.push('木造で高さ16m超か地上4階以上');
      if (!wood && (A > 300 || H > 16 || F >= 4)) ikkyu.push('RC・S造等で延べ300m2超か高さ16m超か地上4階以上');
      if (A > 1000 && floorsAll(p) >= 2) ikkyu.push('延べ1,000m2超かつ階数2以上');
      const extra: string[] = [];
      const cls = structuralClass(p);
      if (ikkyu.length && (cls === 1 || cls === 2)) extra.push('構造設計一級建築士の関与が要る(第20条の2)');
      if (floorsAll(p) >= 3 && A > 5000) extra.push('設備設計一級建築士の関与が要る(第20条の3)');
      const tail = extra.length ? `。${extra.join('。')}` : '';
      if (ikkyu.length) return `${head}。一級建築士でなければ設計・工事監理できない(第3条: ${ikkyu.join(' / ')})${tail}`;
      if ((!wood && A > 30) || A > (wood ? 300 : 100) || floorsAll(p) >= 3) {
        return `${head}。一級または二級建築士でなければ設計・工事監理できない(第3条の2)${tail}`;
      }
      if (wood && A > 100) return `${head}。一級・二級・木造建築士でなければ設計・工事監理できない(第3条の3)`;
      return null;
    },
  },
];

// ---------------------------------------------------------------------------
// 省エネ・消防
// ---------------------------------------------------------------------------

/** 建築物省エネ法第20条第一号・令第4条第1項第一号の適用除外用途だけで構成されているか */
const onlyEnergyExempt = (p: ProjectInput) => onlyUses(p, 'garage');

const energyFireRules: RegulationRule[] = [
  {
    id: 'beea-tekigou',
    category: '省エネ・消防',
    title: '省エネ基準への適合義務',
    law: '建築物のエネルギー消費性能の向上等に関する法律',
    provision: '法第10条・令第3条・法第20条',
    action: '適合義務',
    authority: '所管行政庁または登録建築物エネルギー消費性能判定機関',
    summary:
      '令和7年4月1日から、原則すべての新築住宅・非住宅(増改築は増改築部分)に省エネ基準への適合が義務づけられた。建築基準関係規定とみなされるので、適合しなければ確認済証が交付されず着工できない。建築に係る部分の床面積10m2以下、自動車車庫・自転車駐車場・畜舎等の空調不要の用途、文化財等、仮設建築物は対象外。',
    threshold: '建築に係る部分の床面積 > 10m2(適用除外の用途等を除く)',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'likely',
    sources: [egovSource('建築物省エネ法')],
    note: '改正法附則により、令和7年4月1日以後に工事に着手する建築物に適用される。同日前に確認済証を受けた案件でも、着工が同日以後なら対象になる。増築・改築は増改築部分の床面積で判定する。ここでは延べ面積で近似している。',
    match: (p) => {
      if (!isBuilding(p)) return null;
      if (p.totalFloorArea <= 10) return null;
      if (onlyEnergyExempt(p)) return null;
      return `新築等で延べ面積 ${m2(p.totalFloorArea)}(10m2超)。令和7年4月以降は原則適合義務`;
    },
  },
  {
    id: 'beea-tekihan',
    category: '省エネ・消防',
    title: '省エネ適合性判定(省エネ適判)',
    law: '建築物のエネルギー消費性能の向上等に関する法律',
    provision: '法第11条・規則第2条',
    action: '判定',
    authority: '所管行政庁または登録建築物エネルギー消費性能判定機関',
    summary:
      '令和7年4月以降、確認申請を要する建築(建築士が設計する平屋・延べ200m2以下=新3号を除く)は、住宅・非住宅とも原則として着工前に省エネ適判を受ける(法第11条第1項)。旧制度の「非住宅300m2以上」の線引きは無くなった。住宅で仕様基準等により適合を示すもの、設計住宅性能評価を受けたもの等は適判不要(同項ただし書・規則第2条)。適判通知書が出ないと確認済証も出ない。',
    threshold: '確認申請を要する建築(新3号を除く)。住宅で仕様基準等による場合等は不要',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'likely',
    sources: [egovSource('建築物省エネ法')],
    note: '適判の要否と審査経路は採用する評価方法(標準計算/仕様基準等)で変わる。確認検査機関に事前に確認すること。',
    match: (p) => {
      if (!isBuilding(p)) return null;
      if (p.totalFloorArea <= 10 || onlyEnergyExempt(p)) return null;
      if (!isGo1(p) && !isGo2(p)) return null;
      const house = onlyUses(p, 'detachedHouse', 'apartment', 'rowHouse');
      return house
        ? `住宅で延べ面積 ${m2(p.totalFloorArea)}・確認申請の一号/二号。標準計算等で適合を示すなら適判の対象、仕様基準等で示すなら適判不要`
        : `非住宅を含み延べ面積 ${m2(p.totalFloorArea)}・確認申請の一号/二号。省エネ適判の対象`;
    },
  },
  {
    id: 'fire-7',
    category: '省エネ・消防',
    title: '消防同意',
    law: '消防法',
    provision: '法第7条・令第1条',
    action: '同意',
    authority: '消防長または消防署長',
    summary:
      '建築確認をする前提として消防長等の同意が要る(新3号は3日以内、その他は7日以内)。確認申請の審査期間に組み込まれるが、事前相談で指摘が出ると差し戻しになる。防火地域・準防火地域以外の一戸建て住宅は同意不要(確認後に消防長等へ通知)。ただし店舗等を兼ねる部分が延べ面積の1/2以上または50m2超の兼用住宅は同意が要る。',
    threshold: '建築確認を要する建築物(防火地域・準防火地域以外の一戸建て住宅を除く)',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'likely',
    sources: [egovSource('消防法')],
    match: (p) => {
      if (!needsKakunin(p)) return null;
      const inFire = hasFlag(p, 'fireArea') || hasFlag(p, 'quasiFireArea');
      if (onlyUses(p, 'detachedHouse') && !inFire) return null;
      return '建築確認の対象。確認の前に消防同意の手続に入る';
    },
  },
  {
    id: 'fire-17',
    category: '省エネ・消防',
    title: '消防用設備等の設置',
    law: '消防法',
    provision: '法第17条・令別表第一',
    action: '適合義務',
    authority: '消防本部(予防課等)',
    summary:
      '令別表第一の防火対象物の区分と、延べ面積・階数・収容人員によって必要な消防用設備等が決まる。複合用途では令第9条により用途部分ごとの判定も要る。改修・用途変更でも設備の追加が要ることがある。',
    threshold: '令別表第一の区分・面積・階数・収容人員による',
    scope: 'national',
    asOf: ASOF,
    confidence: 'check',
    sources: [egovSource('消防法')],
    match: (p) => {
      if (p.useIds.length === 0) return null;
      if (!isBuilding(p) && !isWork(p, 'majorRepair', 'renovation', 'useChange')) return null;
      const multi = p.useIds.length >= 2;
      return `用途 ${p.useIds.map(useLabel).join('・')} / 延べ面積 ${m2(p.totalFloorArea)}${multi ? ' / 複合用途のため令第9条の適用も確認する' : ''}`;
    },
  },
  {
    id: 'fire-11',
    category: '省エネ・消防',
    title: '危険物製造所等の設置許可',
    law: '消防法',
    provision: '法第11条第1項',
    action: '許可',
    authority: '市町村長等(消防本部 危険物規制担当)',
    summary: '指定数量以上の危険物を貯蔵し、または取り扱う施設は設置許可が要る。建築確認とは別手続。',
    threshold: '指定数量以上の危険物を扱う場合',
    scope: 'national',
    asOf: ASOF,
    confidence: 'check',
    sources: [egovSource('消防法')],
    match: (p) => (hasUse(p, 'dangerousGoods') ? '危険物の貯蔵・処理施設を選択している' : null),
  },
];

// ---------------------------------------------------------------------------
// 都市計画・土地
// ---------------------------------------------------------------------------

const cityPlanningRules: RegulationRule[] = [
  {
    id: 'cpa-53',
    category: '都市計画・土地',
    title: '都市計画施設等の区域内の建築許可',
    law: '都市計画法',
    provision: '法第53条(事業認可後は土地区画整理法第76条等)',
    action: '許可',
    authority: '都道府県知事または市町村長(都市計画担当課)',
    summary:
      '都市計画道路・公園等の都市計画施設の区域や、市街地開発事業(土地区画整理事業等)の施行区域内で建築するには許可が要る。階数や構造に制限がかかることがあり、計画の前提が変わるため最初に確認する。土地区画整理事業の認可・公告後は、施行地区内の建築に土地区画整理法第76条の許可が要る。',
    threshold: '都市計画施設の区域・市街地開発事業の施行区域内',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovSource('都市計画法'), egovById('土地区画整理法', '329AC0000000119')],
    match: (p) => {
      const hits: string[] = [];
      if (hasFlag(p, 'cityPlanningFacility')) hits.push('都市計画道路・公園等の区域内');
      if (hasFlag(p, 'landReadjustment')) hits.push('土地区画整理事業の施行区域内');
      return hits.length ? hits.join(' / ') : null;
    },
  },
  {
    id: 'cpa-29-43',
    category: '都市計画・土地',
    title: '市街化調整区域内の開発許可・建築許可',
    law: '都市計画法',
    provision: '法第29条・第42条・第43条',
    action: '許可',
    authority: '都道府県知事または市町村長(開発審査担当)',
    summary:
      '市街化調整区域では、開発行為は規模にかかわらず許可が要り、開発行為を伴わない建築(新築・改築・用途変更)そのものにも許可が要る(法第43条)。許可の見込みが立たないと計画自体が成立しないため、最優先で確認する項目。',
    threshold: '市街化調整区域内',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovSource('都市計画法')],
    match: (p) => (p.urbanizationControlArea ? '市街化調整区域内と入力されている' : null),
  },
  {
    id: 'cpa-29',
    category: '都市計画・土地',
    title: '開発許可(市街化区域・非線引き区域等)',
    law: '都市計画法',
    provision: '法第29条第1項・第2項・令第19条・第22条の2',
    action: '許可',
    authority: '都道府県知事または指定都市等の長(開発審査担当)',
    summary:
      '建築物の建築を目的とする土地の区画形質の変更(開発行為)は、規模に応じて開発許可が要る。市街化区域は1,000m2以上(首都圏・近畿圏・中部圏の既成市街地等は500m2以上、条例で300m2まで引き下げ可)、区域区分の無い都市計画区域・準都市計画区域は3,000m2以上(条例で300m2まで引き下げ可)、都市計画区域等の外は1ha以上。道路・公園・排水施設の協議が付くため、工程の最上流になる。',
    threshold: '開発区域 市街化区域 1,000m2以上(500m2・条例300m2) / 非線引き・準都計 3,000m2以上 / 区域外 1ha以上',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'check',
    sources: [egovSource('都市計画法')],
    note: '区画(道路の新設等)・形(切土・盛土)・質(農地等から宅地へ)のいずれかの変更がなければ開発行為に当たらない。開発区域は敷地面積とは限らないので、区域の取り方を担当課と確認する。',
    match: (p) => {
      if (p.urbanizationControlArea) return null; // 調整区域は cpa-29-43
      if (!isBuilding(p)) return null;
      const area = Math.max(p.siteArea, p.formChangeArea);
      if (!p.inCityPlanningArea) {
        return area >= 10000 ? `都市計画区域等の外で敷地・形質変更 ${m2(area)} が 1ha 以上` : null;
      }
      if (area < 300) return null;
      return `敷地・形質変更 ${m2(area)}。区画形質の変更を伴う場合、区域区分と条例の規模に当たるか確認する`;
    },
  },
  {
    id: 'cpa-68-2',
    category: '都市計画・土地',
    title: '地区計画の区域内の届出・制限',
    law: '都市計画法 / 建築基準法',
    provision: '都計法第12条の5・第58条の2、建基法第68条の2',
    action: '届出',
    authority: '市町村(都市計画担当課)',
    summary:
      '地区整備計画が定められた区域内で建築・土地の区画形質の変更等をする場合、着手の30日前までに市町村長に届け出る(都計法第58条の2)。さらに地区整備計画で定めた用途・容積率・建蔽率・高さ・壁面の位置・形態意匠等が、市町村の条例で建築基準法の制限として上乗せされる(建基法第68条の2)。区域図と地区整備計画書の両方を取り寄せる。',
    threshold: '地区計画等の区域内',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovSource('都市計画法'), egovSource('建築基準法')],
    note: '地区計画の区域は国土交通省の都市計画決定GISデータに含まれている。ただし地区整備計画の中身は自治体の告示・条例を見る必要がある。',
    match: (p) => (hasFlag(p, 'districtPlan') ? '地区計画等の区域内と入力されている' : null),
  },
  {
    id: 'cpa-58',
    category: '都市計画・土地',
    title: '風致地区内の建築等の許可',
    law: '都市計画法 / 風致地区条例',
    provision: '都計法第58条・各風致地区条例',
    action: '許可',
    authority: '都道府県または市町村(公園緑地・都市計画担当課)',
    summary:
      '風致地区内の建築物の建築・宅地の造成・木竹の伐採等は、政令の基準に従った条例で許可制になっている。建蔽率・高さ・壁面後退・緑化率が用途地域より厳しく定められていることが多い。',
    threshold: '風致地区内(基準は条例による)',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovSource('都市計画法')],
    match: (p) => (hasFlag(p, 'scenicDistrict') ? '風致地区内と入力されている' : null),
  },
  {
    id: 'slope-act',
    category: '都市計画・土地',
    title: '宅地造成及び特定盛土等規制法(盛土規制法)の許可・届出',
    law: '宅地造成及び特定盛土等規制法',
    provision: '法第12条第1項・第27条第1項・第30条第1項、令第3条・第23条',
    action: '許可',
    authority: '都道府県知事または指定都市等の長(盛土対策担当)',
    summary:
      '宅地造成等工事規制区域内で、盛土で高さ1m超の崖・切土で高さ2m超の崖・高さ2m超の盛土・面積500m2超の盛土切土のいずれかを伴う工事は、着手前に許可が要る(法第12条・令第3条)。特定盛土等規制区域内では同じ規模で着手30日前の届出(法第27条)、崖2m超(盛土)・5m超(切土)・盛土高さ5m超・面積3,000m2超で許可(法第30条・令第23条)。建築確認より前に済ませる必要があるため、造成を伴う計画では工程の起点になる。',
    threshold:
      '宅造規制区域: 崖1m超(盛土)/2m超(切土)・盛土高さ2m超・面積500m2超で許可 / 特定盛土等規制区域: 同規模で届出、崖2m超(盛土)/5m超(切土)・盛土高さ5m超・面積3,000m2超で許可',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'likely',
    sources: [egovSource('盛土規制法')],
    match: (p) => {
      if (!hasFlag(p, 'soilRegulationArea')) return null;
      const a = p.formChangeArea;
      if (a <= 0) return '規制区域内と入力されている。盛土・切土の高さと面積で許可・届出の要否を確認する';
      return `規制区域内で形質変更 ${m2(a)}${a > 500 ? '(500m2超)' : ''}。崖の高さ・盛土の高さも含めて許可・届出の要否を確認する`;
    },
  },
  {
    id: 'soil-contamination-4',
    category: '都市計画・土地',
    title: '土地の形質変更の届出(土壌汚染対策法)',
    law: '土壌汚染対策法',
    provision: '法第4条第1項・規則第22条',
    action: '届出',
    authority: '都道府県知事等(環境保全担当課)',
    summary:
      '一定面積以上の土地の形質変更をする場合、着手の30日前までに届出が要る。調査命令が出ると土壌調査の期間が工程に乗るため、早期の判定が要る。',
    threshold: '形質変更 3,000m2 以上(現に有害物質使用特定施設がある工場等の敷地等は 900m2 以上)',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovSource('土壌汚染対策法')],
    match: (p) => {
      if (p.formChangeArea >= 3000) {
        return `土地の形質変更 ${m2(p.formChangeArea)} が 3,000m2 以上`;
      }
      if (p.formChangeArea >= 900) {
        return `土地の形質変更 ${m2(p.formChangeArea)}。有害物質使用特定施設がある(あった)工場等の敷地なら 900m2 以上で対象`;
      }
      return null;
    },
  },
  {
    id: 'buried-cultural-93',
    category: '都市計画・土地',
    title: '埋蔵文化財包蔵地における土木工事等の届出',
    law: '文化財保護法',
    provision: '法第93条(国の機関等は第94条の通知)',
    action: '届出',
    authority: '教育委員会(埋蔵文化財担当)',
    summary:
      '周知の埋蔵文化財包蔵地で土木工事等のために発掘する場合、着手の60日前までに届出が要る。試掘・本発掘に進むと数か月単位で工程が動くため、用地取得の段階で確認しておく項目。',
    threshold: '周知の埋蔵文化財包蔵地内での土木工事(着手60日前まで)',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovSource('文化財保護法')],
    match: (p) => (hasFlag(p, 'buriedCulturalProperty') ? '周知の埋蔵文化財包蔵地内と入力されている' : null),
  },
  {
    id: 'river-26',
    category: '都市計画・土地',
    title: '河川区域・河川保全区域内の許可',
    law: '河川法',
    provision: '法第24条・第26条・第27条(河川区域)、第55条(河川保全区域)',
    action: '許可',
    authority: '河川管理者(国・都道府県・市町村)',
    summary:
      '河川区域内では土地の占用(第24条)・工作物の新築等(第26条)・掘削や盛土(第27条)に、河川保全区域内では土地の掘削・盛土・切土や工作物の新築等(第55条)に河川管理者の許可が要る。管理者が国か県か市かで窓口が変わる。',
    threshold: '河川区域・河川保全区域内',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovSource('河川法')],
    match: (p) => (hasFlag(p, 'riverArea') ? '河川区域・河川保全区域内と入力されている' : null),
  },
  {
    id: 'specified-urban-river-30',
    category: '都市計画・土地',
    title: '雨水浸透阻害行為の許可',
    law: '特定都市河川浸水被害対策法',
    provision: '法第30条・令',
    action: '許可',
    authority: '都道府県知事または指定都市等の長(河川担当課)',
    summary:
      '特定都市河川流域内の宅地等以外の土地(田畑・山林等)で、宅地化・舗装等の雨水浸透阻害行為を1,000m2以上(条例で500m2まで引き下げ可)行う場合は許可が要る。雨水貯留浸透施設の設置が条件になり、外構計画と敷地計画に影響する。もともと宅地の土地の建替えは対象外。',
    threshold: '特定都市河川流域内・宅地等以外の土地で 1,000m2 以上(条例で 500m2 以上)の雨水浸透阻害行為',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'likely',
    sources: [egovSource('特定都市河川浸水被害対策法')],
    match: (p) => {
      if (!hasFlag(p, 'specifiedUrbanRiver')) return null;
      const area = Math.max(p.siteArea, p.formChangeArea);
      if (area < 500) return null;
      if (area < 1000) return `特定都市河川流域内で対象面積 ${m2(area)}。条例で規模を引き下げている区域なら対象。現況が宅地等なら対象外`;
      return `特定都市河川流域内で対象面積 ${m2(area)} が 1,000m2 以上。現況が田畑・山林等なら許可が要る`;
    },
  },
  {
    id: 'natural-park',
    category: '都市計画・土地',
    title: '自然公園区域内の行為の許可・届出',
    law: '自然公園法',
    provision: '法第20条第3項・第21条・第33条',
    action: '許可',
    authority: '環境大臣(国立公園)または都道府県知事(国定公園・都道府県立自然公園)',
    summary:
      '特別地域・特別保護地区では許可、普通地域では届出が要る。高さや色彩、建蔽率に基準がかかることが多い。都道府県立自然公園は条例による。',
    threshold: '自然公園の特別地域・普通地域内',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovSource('自然公園法')],
    match: (p) => (hasFlag(p, 'naturalPark') ? '自然公園区域内と入力されている' : null),
  },
  {
    id: 'landscape-16',
    category: '都市計画・土地',
    title: '景観計画区域内の行為の届出',
    law: '景観法',
    provision: '法第16条・第18条',
    action: '届出',
    authority: '景観行政団体(景観担当課)',
    summary:
      '景観計画区域内では、あらかじめ行為の届出が要り、受理から30日を経過するまで着手できない(法第18条)。規模が大きいと事前協議を求められ、外装の色彩や形態意匠に制限がかかる。',
    threshold: '景観計画区域内(届出対象の規模は景観計画による)',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovSource('景観法')],
    match: (p) => (hasFlag(p, 'landscapeArea') ? '景観計画区域内と入力されている' : null),
  },
  {
    id: 'green-area',
    category: '都市計画・土地',
    title: '緑化率の最低限度(緑化地域)',
    law: '都市緑地法',
    provision: '法第34条・第35条・令',
    action: '適合義務',
    authority: '市町村(公園緑地担当課)',
    summary:
      '緑化地域内で敷地面積1,000m2以上(条例で300m2まで引き下げ可)の建築物を新築・増築する場合、都市計画で定めた緑化率の最低限度以上にする。建築基準関係規定とみなされ、外構の面積配分に直結する。',
    threshold: '緑化地域内 かつ 敷地面積 1,000m2 以上(条例で 300m2 以上)',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'check',
    sources: [egovSource('都市緑地法')],
    note: '緑化地域でなくても、地区計画等緑化率条例や自治体の緑化条例・要綱で緑化を求められることが多い。',
    match: (p) => {
      if (!hasFlag(p, 'greenArea')) return null;
      if (!isWork(p, 'new', 'extension')) return null;
      if (p.siteArea > 0 && p.siteArea < 300) return null;
      if (p.siteArea >= 1000) return `緑化地域内で敷地面積 ${m2(p.siteArea)} が 1,000m2 以上`;
      return `緑化地域内と入力されている。敷地面積 ${p.siteArea > 0 ? m2(p.siteArea) : '未入力'}。条例で引き下げた規模に当たるか確認する`;
    },
  },
  {
    id: 'erosion-control',
    category: '都市計画・土地',
    title: '砂防指定地内の行為の許可',
    law: '砂防法 / 都道府県の砂防指定地管理条例',
    provision: '砂防法第4条・都道府県条例',
    action: '許可',
    authority: '都道府県(砂防担当・土木事務所)',
    summary:
      '砂防指定地内では、都道府県の条例で土地の掘削・盛土・切土、工作物の新築等が許可制になっている。許可に時間がかかるため、造成計画の前に確認する。',
    threshold: '砂防指定地内(許可を要する行為は条例による)',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovById('砂防法', '130AC0000000029')],
    match: (p) => (hasFlag(p, 'erosionControl') ? '砂防指定地内と入力されている' : null),
  },
  {
    id: 'landslide-steep-slope',
    category: '都市計画・土地',
    title: '地すべり防止区域・急傾斜地崩壊危険区域内の行為の許可',
    law: '地すべり等防止法 / 急傾斜地の崩壊による災害の防止に関する法律',
    provision: '地すべり等防止法第18条、急傾斜地法第7条',
    action: '許可',
    authority: '都道府県知事(砂防・土木担当)',
    summary:
      '地すべり防止区域では地下水の排除を阻害する行為・切土・のり面の工作物の新築等に、急傾斜地崩壊危険区域では切土・盛土・工作物の設置等に、都道府県知事の許可が要る。あわせて土砂災害警戒区域・特別警戒区域や、がけ条例(建築基準法第40条に基づく条例)の適用も確認する。',
    threshold: '地すべり防止区域・急傾斜地崩壊危険区域内',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [
      egovById('地すべり等防止法', '333AC0000000030'),
      egovById('急傾斜地の崩壊による災害の防止に関する法律', '344AC0000000057'),
    ],
    match: (p) => (hasFlag(p, 'landslide') ? '地すべり防止区域・急傾斜地崩壊危険区域内と入力されている' : null),
  },
  {
    id: 'coastal-7-8',
    category: '都市計画・土地',
    title: '海岸保全区域内の占用・行為の許可',
    law: '海岸法',
    provision: '法第7条・第8条',
    action: '許可',
    authority: '海岸管理者(都道府県・市町村)',
    summary:
      '海岸保全区域内で施設・工作物を設けて占用する場合(第7条)や、土石の採取・施設の新設・土地の掘削等をする場合(第8条)は海岸管理者の許可が要る。',
    threshold: '海岸保全区域内',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovById('海岸法', '331AC0000000101')],
    match: (p) => (hasFlag(p, 'coastal') ? '海岸保全区域内と入力されている' : null),
  },
  {
    id: 'port-38-2',
    category: '都市計画・土地',
    title: '臨港地区内の届出・分区の構築物規制',
    law: '港湾法',
    provision: '法第38条の2・第40条',
    action: '届出',
    authority: '港湾管理者(都道府県・市町村・港務局)',
    summary:
      '臨港地区内で一定規模以上の工場等の新設・増設等をする場合は、工事開始の60日前までに港湾管理者へ届け出る(第38条の2)。分区が指定されていれば、分区の目的を阻害する構築物は条例で建てられない(第40条)。用途地域とは別の制限。',
    threshold: '臨港地区内(届出対象の規模は政令、分区の制限は条例による)',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'check',
    sources: [egovById('港湾法', '325AC0000000218')],
    match: (p) => (hasFlag(p, 'portArea') ? '臨港地区内と入力されている' : null),
  },
];

// ---------------------------------------------------------------------------
// 規模・高さで効く法令
// ---------------------------------------------------------------------------

/** 駐車場法施行令第18条の特定用途に当たりうる用途 */
const PARKING_SPECIFIED_USES = [
  'theater', 'assemblyHall', 'exhibition', 'hotel', 'restaurant', 'amusement', 'gym',
  'retailStore', 'pharmacy', 'barber', 'beauty', 'laundry', 'office', 'publicOffice',
  'hospital', 'warehouse', 'factory', 'apartment',
];

const scaleRules: RegulationRule[] = [
  {
    id: 'barrier-free-14',
    category: '規模・高さで効く法令',
    title: '建築物移動等円滑化基準への適合義務',
    law: '高齢者、障害者等の移動等の円滑化の促進に関する法律(バリアフリー法)',
    provision: '法第14条・令第5条・令第9条',
    action: '適合義務',
    authority: '所管行政庁(建築指導担当課)',
    summary:
      '特別特定建築物(病院・診療所・物販店舗・飲食店・ホテル・劇場・集会場・老人ホーム・公立小中学校等)で、建築(用途変更で特別特定建築物にする場合を含む)に係る部分の床面積の合計が2,000m2以上のものは、建築物移動等円滑化基準への適合が義務になる。建築基準関係規定とみなされる。地方公共団体の条例で対象用途の追加や規模の引き下げがされていることが多い。',
    threshold: '特別特定建築物 かつ 建築・用途変更に係る部分の床面積の合計 2,000m2 以上(条例で引き下げ有り)',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'likely',
    sources: [egovSource('バリアフリー法')],
    note: '条例による上乗せが全国的に多い項目。自治体の福祉のまちづくり条例と併せて確認する。ここでは延べ面積で近似しているので、増築・用途変更は当該部分の床面積で確かめる。',
    match: (p) => {
      if (!isBuilding(p) && !isWork(p, 'useChange')) return null;
      const targets = usesWith(p, 'barrierFreeSpecial');
      if (targets.length === 0) return null;
      if (p.totalFloorArea >= 2000) {
        return `特別特定建築物に当たりうる用途(${targets.join('・')})で、床面積 ${m2(p.totalFloorArea)} が 2,000m2 以上`;
      }
      return `特別特定建築物に当たりうる用途(${targets.join('・')})。${m2(p.totalFloorArea)} は国の基準(2,000m2)未満だが、条例で規模が引き下げられている場合がある`;
    },
  },
  {
    id: 'building-hygiene-5',
    category: '規模・高さで効く法令',
    title: '特定建築物の届出(建築物衛生法)',
    law: '建築物における衛生的環境の確保に関する法律',
    provision: '法第5条・令第1条',
    action: '届出',
    authority: '保健所(生活衛生担当課)',
    summary:
      '特定用途(興行場・百貨店・集会場・図書館・博物館・美術館・遊技場・店舗・事務所・1条校以外の学校・旅館)に供される部分の延べ面積が3,000m2以上、または専ら1条校・幼保連携型認定こども園の用途で延べ面積8,000m2以上の建築物は、使用開始から1か月以内に届出が要る。建築物環境衛生管理技術者の選任と空気環境・給水の維持管理基準がかかるため、設備計画に影響する。',
    threshold: '特定用途部分 3,000m2 以上 / 専ら1条校等は延べ 8,000m2 以上',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'likely',
    sources: [egovSource('建築物衛生法')],
    note: '特定用途に供される部分の面積で判定する(共同住宅・駐車場等は含まない)。ここでは延べ面積で近似している。',
    match: (p) => {
      if (!isBuilding(p) && !isWork(p, 'useChange')) return null;
      const targets = usesWith(p, 'hygieneSpecified');
      const schools = usesWith(p, 'hygieneSchool');
      if (targets.length > 0) {
        if (p.totalFloorArea < 3000) return null;
        return `特定用途(${targets.join('・')})を含み、延べ面積 ${m2(p.totalFloorArea)} が 3,000m2 以上。特定用途部分の面積で確かめる`;
      }
      if (schools.length > 0 && schools.length === p.useIds.length) {
        if (p.totalFloorArea < 8000) return null;
        return `専ら1条校等(${schools.join('・')})で、延べ面積 ${m2(p.totalFloorArea)} が 8,000m2 以上`;
      }
      return null;
    },
  },
  {
    id: 'construction-recycle-10',
    category: '規模・高さで効く法令',
    title: '分別解体等の届出(建設リサイクル法)',
    law: '建設工事に係る資材の再資源化等に関する法律',
    provision: '法第9条・第10条・令第2条',
    action: '届出',
    authority: '都道府県知事または市町村長(建築指導担当課)',
    summary: '対象建設工事は、発注者が着手の7日前までに分別解体等の計画を届け出る。解体を伴う計画では見落としやすい。',
    threshold: '解体 80m2 以上 / 新築・増築(増築は増築部分) 500m2 以上 / 修繕・模様替等 請負1億円以上 / 建築物以外の工作物 500万円以上',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovSource('建設リサイクル法')],
    match: (p) => {
      const hits: string[] = [];
      if (p.demolitionArea >= 80) hits.push(`解体部分 ${m2(p.demolitionArea)} が 80m2 以上`);
      if (isWork(p, 'new') && p.totalFloorArea >= 500) {
        hits.push(`新築で延べ面積 ${m2(p.totalFloorArea)} が 500m2 以上`);
      } else if (isWork(p, 'extension') && p.totalFloorArea >= 500) {
        hits.push(`増築で延べ面積 ${m2(p.totalFloorArea)}。増築部分の床面積が 500m2 以上なら対象`);
      }
      if (isWork(p, 'majorRepair', 'renovation', 'useChange') && p.contractAmountManYen >= 10000) {
        hits.push(`修繕・模様替等で請負金額 ${p.contractAmountManYen.toLocaleString()}万円 が 1億円以上`);
      }
      return hits.length ? hits.join(' / ') : null;
    },
  },
  {
    id: 'asbestos-18-15',
    category: '規模・高さで効く法令',
    title: '石綿(アスベスト)の事前調査・結果報告',
    law: '大気汚染防止法',
    provision: '法第18条の15・第18条の17、規則第16条の11',
    action: '報告',
    authority: '都道府県知事等(環境保全担当課)・労働基準監督署',
    summary:
      '建築物の解体・改造・補修を伴う工事は、規模にかかわらず元請業者が石綿含有建材の事前調査を行い、発注者に書面で説明する。解体部分の床面積80m2以上、または改造・補修の請負金額100万円以上なら、調査結果を電子システムで都道府県等に報告する。吹付け石綿等(レベル1・2)の除去を伴う場合は、作業開始の14日前までに発注者が届け出る。',
    threshold: '事前調査は全ての解体・改修 / 結果報告は解体 80m2 以上・改造補修 請負100万円以上',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'likely',
    sources: [egovById('大気汚染防止法', '343AC0000000097')],
    note: '石綿障害予防規則(労働安全衛生法)にも同様の事前調査・報告の義務がある。既存建物の竣工年(平成18年9月以前着工か)で含有の可能性が大きく変わる。',
    match: (p) => {
      const hits: string[] = [];
      if (p.demolitionArea >= 80) hits.push(`解体部分 ${m2(p.demolitionArea)} が 80m2 以上(結果報告の対象)`);
      if (isWork(p, 'majorRepair', 'renovation', 'useChange') && p.contractAmountManYen >= 100) {
        hits.push(`改造・補修で請負金額 ${p.contractAmountManYen.toLocaleString()}万円 が 100万円以上(結果報告の対象)`);
      }
      if (hits.length) return hits.join(' / ');
      if (isWork(p, 'demolition', 'rebuild', 'extension', 'majorRepair', 'renovation', 'useChange') || p.demolitionArea > 0) {
        return '既存建物に手を入れる工事(増築の接続部を含む)。解体・改造・補修を伴うなら石綿の事前調査は規模にかかわらず要る';
      }
      return null;
    },
  },
  {
    id: 'noise-vibration-14',
    category: '規模・高さで効く法令',
    title: '特定建設作業の実施届出(騒音規制法・振動規制法)',
    law: '騒音規制法 / 振動規制法',
    provision: '騒音規制法第14条、振動規制法第14条',
    action: '届出',
    authority: '市町村長(環境保全担当課)',
    summary:
      '指定地域内で、杭打機・さく岩機・空気圧縮機・バックホウ等を使う特定建設作業を伴う工事は、作業開始の7日前までに施工者が市町村長に届け出る。作業時間帯・日数の基準もかかる。',
    threshold: '指定地域内で特定建設作業を伴う工事',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'check',
    sources: [egovById('騒音規制法', '343AC0000000098'), egovById('振動規制法', '351AC0000000064')],
    match: (p) =>
      isBuilding(p) || isWork(p, 'demolition')
        ? '新築・解体等の工事。指定地域の有無と、使う建設機械が特定建設作業に当たるかを確認する'
        : null,
  },
  {
    id: 'large-retail-5',
    category: '規模・高さで効く法令',
    title: '大規模小売店舗の新設の届出',
    law: '大規模小売店舗立地法',
    provision: '法第5条・令第2条',
    action: '届出',
    authority: '都道府県または政令市(商業担当課)',
    summary:
      '店舗面積(小売業の売場面積。飲食店部分は除く)の合計が1,000m2を超える大規模小売店舗の新設は届出が要る。届出から8か月を経過しないと開店(新設)できないため、開店時期から逆算すると設計の最上流に影響する。',
    threshold: '店舗面積 1,000m2 超',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovSource('大規模小売店舗立地法')],
    match: (p) => {
      if (usesWith(p, 'retail').length === 0) return null;
      if (!isBuilding(p) && !isWork(p, 'useChange')) return null;
      if (p.storeArea > 0) {
        return p.storeArea > 1000 ? `店舗面積 ${m2(p.storeArea)} が 1,000m2 を超える` : null;
      }
      if (p.totalFloorArea <= 1000) return null;
      return `店舗面積が未入力のため延べ面積 ${m2(p.totalFloorArea)} で近似すると 1,000m2 を超える。売場の店舗面積で確かめる`;
    },
  },
  {
    id: 'factory-location-6',
    category: '規模・高さで効く法令',
    title: '特定工場の新設の届出(工場立地法)',
    law: '工場立地法',
    provision: '法第6条・第11条・令第2条',
    action: '届出',
    authority: '市町村(産業立地担当課)',
    summary:
      '製造業等の特定工場は、緑地面積率・環境施設面積率の基準を満たす必要があり、新設の届出が要る。届出の受理から90日を経過しないと新設できない(短縮の制度あり)。敷地の2割前後を緑地に取られるため、配置計画の前提が変わる。',
    threshold: '敷地面積 9,000m2 以上 または 建築面積の合計 3,000m2 以上',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovSource('工場立地法')],
    match: (p) => {
      if (usesWith(p, 'factory').length === 0) return null;
      const hits: string[] = [];
      if (p.siteArea >= 9000) hits.push(`敷地面積 ${m2(p.siteArea)} が 9,000m2 以上`);
      if (p.buildingArea >= 3000) hits.push(`建築面積 ${m2(p.buildingArea)} が 3,000m2 以上`);
      return hits.length ? hits.join(' / ') : null;
    },
  },
  {
    id: 'bsl-34-2',
    category: '規模・高さで効く法令',
    title: '非常用の昇降機の設置',
    law: '建築基準法',
    provision: '法第34条第2項・令第129条の13の2',
    action: '適合義務',
    authority: '建築主事(特定行政庁)または指定確認検査機関',
    summary:
      '高さ31mを超える建築物には非常用エレベーターが要る。31mを超える部分が機械室・階段室等だけのもの、31mを超える部分の各階床面積の合計が500m2以下のもの、31mを超える部分が4階以下で100m2以内ごとに防火区画したもの等は不要。乗降ロビー・昇降路の位置がコア計画を決める。',
    threshold: '高さ > 31m(令第129条の13の2の除外あり)',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'likely',
    sources: [egovSource('建築基準法'), egovSource('建築基準法施行令')],
    match: (p) => (isBuilding(p) && p.maxHeight > 31 ? `最高高さ ${p.maxHeight}m が 31m を超える` : null),
  },
  {
    id: 'radio-102-3',
    category: '規模・高さで効く法令',
    title: '電波伝搬障害防止区域内の高層建築物の届出',
    law: '電波法',
    provision: '法第102条の3',
    action: '届出',
    authority: '総務大臣(総合通信局)',
    summary:
      '重要無線通信の電波伝搬障害防止区域内で、地表からの高さが31mを超える建築物を新築する場合などは、工事に着手する前に届出が要る。区域は総務省の告示で指定され、建築の他の規制図には載らないため見落としやすい。',
    threshold: '電波伝搬障害防止区域内 かつ 地表高 31m 超',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'check',
    sources: [egovSource('電波法')],
    match: (p) => {
      if (p.maxHeight <= 31) return null;
      if (hasFlag(p, 'radioInterference')) return `電波伝搬障害防止区域内で、最高高さ ${p.maxHeight}m が 31m を超える`;
      return `最高高さ ${p.maxHeight}m が 31m を超える。区域の指定の有無を確認する`;
    },
  },
  {
    id: 'aviation-51',
    category: '規模・高さで効く法令',
    title: '航空障害灯の設置・制限表面の確認',
    law: '航空法',
    provision: '法第49条・第51条',
    action: '適合義務',
    authority: '地方航空局',
    summary:
      '進入表面等の制限表面の上に出る建築物は建てられない。また地表または水面から60m以上の建築物には原則として航空障害灯の設置が要る。',
    threshold: '高さ 60m 以上、または制限表面のかかる区域内',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'likely',
    sources: [egovSource('航空法')],
    match: (p) => {
      const hits: string[] = [];
      if (p.maxHeight >= 60) hits.push(`最高高さ ${p.maxHeight}m が 60m 以上`);
      if (hasFlag(p, 'airportRestriction')) hits.push('航空法の制限表面がかかる区域内と入力されている');
      return hits.length ? hits.join(' / ') : null;
    },
  },
  {
    id: 'osha-88',
    category: '規模・高さで効く法令',
    title: '建設工事の計画の届出(労働安全衛生法)',
    law: '労働安全衛生法',
    provision: '法第88条第3項・規則第90条',
    action: '届出',
    authority: '労働基準監督署',
    summary:
      '高さ31mを超える建築物の建設・改造・解体、掘削の深さ10m以上の地山の掘削等の仕事は、仕事の開始の14日前までに労働基準監督署長に届け出る。施工者側の手続だが、工程表に載せておかないと着工が遅れる。',
    threshold: '高さ 31m 超の建築物の建設・改造・解体 / 掘削深さ 10m 以上 等',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovSource('労働安全衛生法')],
    match: (p) => {
      const hits: string[] = [];
      if (p.maxHeight > 31) hits.push(`最高高さ ${p.maxHeight}m が 31m を超える`);
      if (isBuilding(p) && p.floorsBelow >= 2) hits.push(`地下 ${p.floorsBelow} 階。掘削深さが 10m 以上なら対象`);
      return hits.length ? hits.join(' / ') : null;
    },
  },
  {
    id: 'parking-20',
    category: '規模・高さで効く法令',
    title: '駐車施設の附置義務',
    law: '駐車場法',
    provision: '法第20条・第20条の2・令第18条',
    action: '適合義務',
    authority: '市町村(都市計画・建築指導担当課)',
    summary:
      '駐車場整備地区・商業地域・近隣商業地域内では延べ面積2,000m2以上(特定用途部分は条例の規模以上なら2,000m2未満でも)、その周辺等の条例で定める地区内では特定用途部分2,000m2以上の新築・増築に、条例で駐車施設の附置が義務づけられる。台数は条例ごとに違い、平面計画に直結する。',
    threshold: '駐車場整備地区・商業系: 延べ2,000m2以上等 / 周辺地区等: 特定用途部分2,000m2以上(いずれも条例による)',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'check',
    sources: [egovSource('駐車場法')],
    note: '特定用途(令第18条)は劇場・集会場・展示場・ホテル・飲食店・遊技場・体育館・店舗・事務所・病院・倉庫・工場・共同住宅等。附置義務とは別に、自治体の要綱で荷さばき・自転車駐車場を求められることが多い。',
    match: (p) => {
      if (!isWork(p, 'new', 'extension', 'useChange')) return null;
      if (!p.inCityPlanningArea) return null;
      const A = p.totalFloorArea;
      const specified = hasUse(p, ...PARKING_SPECIFIED_USES);
      const commercial = ['近隣商業地域', '商業地域'].includes(p.zoning) || hasFlag(p, 'parkingDistrict');
      const where = hasFlag(p, 'parkingDistrict') ? '駐車場整備地区' : p.zoning;
      if (commercial) {
        if (A >= 2000) return `${where}で延べ面積 ${m2(A)} が 2,000m2 以上。附置義務条例と必要台数を確認する`;
        if (specified) return `${where}で特定用途を含む(延べ面積 ${m2(A)})。条例の規模以上なら2,000m2未満でも対象`;
        return null;
      }
      if (specified && A >= 2000) {
        const z = p.zoning === '未選択' ? '用途地域未選択' : p.zoning;
        return `${z}で特定用途を含み延べ面積 ${m2(A)}。条例で定める地区内なら特定用途部分2,000m2以上で対象`;
      }
      return null;
    },
  },
  {
    id: 'septic-tank',
    category: '規模・高さで効く法令',
    title: '浄化槽の設置届出',
    law: '浄化槽法',
    provision: '法第5条',
    action: '届出',
    authority: '都道府県知事等(浄化槽担当課)',
    summary:
      '公共下水道の処理区域外では浄化槽を設ける。設置・構造変更は届出が要る(建築確認を伴う場合は確認申請の中で扱われる)。既存浄化槽を使う場合も使用廃止・変更の届出を確認する。',
    threshold: '公共下水道の処理区域外',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'check',
    sources: [egovSource('浄化槽法')],
    match: (p) => (isBuilding(p) ? '下水道の処理区域内かどうかを確認する。区域外なら浄化槽の届出が要る' : null),
  },
  {
    id: 'outdoor-ad',
    category: '規模・高さで効く法令',
    title: '屋外広告物の許可',
    law: '屋外広告物法',
    provision: '法第3条〜第5条・屋外広告物条例',
    action: '許可',
    authority: '都道府県または市町村(屋外広告物担当課)',
    summary: '看板・サインの設置は条例に基づく許可が要る。禁止地域や規格が条例ごとに違う。',
    threshold: '条例による',
    scope: 'national',
    asOf: ASOF,
    confidence: 'check',
    sources: [egovSource('屋外広告物法')],
    match: (p) =>
      hasUse(p, 'retailStore', 'pharmacy', 'restaurant', 'hotel', 'amusement', 'office', 'exhibition', 'clinicNoBeds', 'clinicWithBeds', 'hospital')
        ? 'サイン計画を伴う用途。屋外広告物条例の規格と許可要否を確認する'
        : null,
  },
];

// ---------------------------------------------------------------------------
// 用途固有(保健所・警察等)
// ---------------------------------------------------------------------------

const useSpecificRules: RegulationRule[] = [
  {
    id: 'medical-7',
    category: '用途固有の手続',
    title: '病院・診療所の開設許可等',
    law: '医療法',
    provision: '法第7条・第8条',
    action: '許可',
    authority: '保健所(医療安全担当課)',
    summary:
      '病院は開設許可。診療所・助産所は、臨床研修等修了医師・助産師が開設するなら開設後10日以内の届出、それ以外の者が開設するなら許可。有床診療所の病床の設置は許可が要る。構造設備基準が医療法施行規則で定まっているため、建築確認とは別に事前協議が要る。',
    threshold: '病院・診療所・助産所を設ける場合',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovSource('医療法')],
    match: (p) => {
      const t = p.useIds.filter((id) => ['hospital', 'clinicWithBeds', 'clinicNoBeds', 'midwifery'].includes(id));
      return t.length ? `${t.map(useLabel).join('・')} を選択している` : null;
    },
  },
  {
    id: 'pharma-4',
    category: '用途固有の手続',
    title: '薬局・医薬品販売業の許可',
    law: '医薬品、医療機器等の品質、有効性及び安全性の確保等に関する法律',
    provision: '法第4条ほか',
    action: '許可',
    authority: '保健所(薬事担当課)',
    summary: '薬局や医薬品販売業には構造設備基準があり、平面計画の段階で保健所と協議する。',
    threshold: '薬局・医薬品販売業等を設ける場合',
    scope: 'national',
    asOf: ASOF,
    confidence: 'definite',
    sources: [egovSource('薬機法')],
    match: (p) => (hasUse(p, 'pharmacy') ? '薬局・医薬品販売業を選択している' : null),
  },
  {
    id: 'barber-beauty-laundry',
    category: '用途固有の手続',
    title: '理容所・美容所・クリーニング所の開設届・構造設備の検査',
    law: '理容師法 / 美容師法 / クリーニング業法',
    provision: '理容師法第11条・第11条の2、美容師法第11条・第12条、クリーニング業法第5条・第5条の2',
    action: '届出',
    authority: '保健所(生活衛生担当課)',
    summary:
      'あらかじめ開設の届出をし、構造設備について検査・確認を受けるまで使用できない。作業室の面積・照度・洗場等の基準が条例等で定められているので、平面計画の段階で保健所と協議する。',
    threshold: '理容所・美容所・クリーニング所を設ける場合',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovSource('理容師法'), egovSource('美容師法'), egovSource('クリーニング業法')],
    match: (p) => {
      const t = p.useIds.filter((id) => ['barber', 'beauty', 'laundry'].includes(id));
      return t.length ? `${t.map(useLabel).join('・')} を選択している` : null;
    },
  },
  {
    id: 'hotel-3',
    category: '用途固有の手続',
    title: '旅館業の営業許可',
    law: '旅館業法',
    provision: '法第3条・令第1条',
    action: '許可',
    authority: '保健所(生活衛生担当課)',
    summary:
      '一客室の床面積(7m2以上、寝台を置く客室は9m2以上)、玄関帳場等、換気・採光・照明・入浴・洗面・便所の構造設備基準がある(令第1条)。学校・児童福祉施設等の周囲おおむね100mの区域内では意見照会の手続が入り、許可されないことがある。',
    threshold: 'ホテル・旅館を設ける場合',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovSource('旅館業法')],
    match: (p) => (hasUse(p, 'hotel') ? 'ホテル・旅館を選択している' : null),
  },
  {
    id: 'theater-bath',
    category: '用途固有の手続',
    title: '興行場・公衆浴場の営業許可',
    law: '興行場法 / 公衆浴場法',
    provision: '興行場法第2条、公衆浴場法第2条',
    action: '許可',
    authority: '保健所(生活衛生担当課)',
    summary: '客席・換気・浴室等の構造設備基準について、条例と併せて協議する。',
    threshold: '劇場・映画館・演芸場・公衆浴場を設ける場合',
    scope: 'national',
    asOf: ASOF,
    confidence: 'definite',
    sources: [egovSource('興行場法'), egovSource('公衆浴場法')],
    match: (p) => {
      const t = p.useIds.filter((id) => ['theater', 'publicBath'].includes(id));
      return t.length ? `${t.map(useLabel).join('・')} を選択している` : null;
    },
  },
  {
    id: 'dental-lab-21',
    category: '用途固有の手続',
    title: '歯科技工所の開設届',
    law: '歯科技工士法',
    provision: '法第21条',
    action: '届出',
    authority: '保健所(生活衛生担当課)',
    summary: '歯科技工所は開設後10日以内に届出が要る。技工室の構造設備について事前に確認する。',
    threshold: '歯科技工所を設ける場合',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovSource('歯科技工士法')],
    match: (p) => (hasUse(p, 'dentalLab') ? '歯科技工所を選択している' : null),
  },
  {
    id: 'cemetery-10',
    category: '用途固有の手続',
    title: '墓地・納骨堂・火葬場の経営許可',
    law: '墓地、埋葬等に関する法律',
    provision: '法第10条',
    action: '許可',
    authority: '都道府県知事または市町村長(生活衛生担当課)',
    summary: '経営許可に加えて、条例で周辺からの距離制限や同意要件が定められていることが多い。',
    threshold: '墓地・納骨堂・火葬場を設ける場合',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovSource('墓地埋葬法')],
    match: (p) => {
      const t = p.useIds.filter((id) => ['cemetery', 'crematorium'].includes(id));
      return t.length ? `${t.map(useLabel).join('・')} を選択している` : null;
    },
  },
  {
    id: 'rendering-plant',
    category: '用途固有の手続',
    title: '化製場等の許可',
    law: '化製場等に関する法律',
    provision: '法第1条・第3条',
    action: '許可',
    authority: '都道府県知事等(生活衛生担当課)',
    summary: '化製場・死亡獣畜取扱場の設置には許可が要る。区域の制限がかかることがある。',
    threshold: '化製場を設ける場合',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'definite',
    sources: [egovSource('化製場法')],
    match: (p) => (hasUse(p, 'renderingPlant') ? '化製場を選択している' : null),
  },
  {
    id: 'poison-act',
    category: '用途固有の手続',
    title: '毒物劇物の製造業・販売業等の登録',
    law: '毒物及び劇物取締法',
    provision: '法第4条',
    action: '許可',
    authority: '保健所(薬事担当課)',
    summary: '毒物劇物を製造・輸入・販売する場合は、製造所・営業所・店舗ごとに貯蔵設備等の基準を満たしたうえで登録が要る。',
    threshold: '毒物劇物の製造業・輸入業・販売業を営む場合',
    scope: 'national',
    asOf: VERIFIED,
    confidence: 'check',
    sources: [egovSource('毒物及び劇物取締法')],
    match: (p) => (hasUse(p, 'dangerousGoods', 'factory') ? '毒物劇物の取扱いの有無を確認する' : null),
  },
  {
    id: 'gas-acts',
    category: '用途固有の手続',
    title: '高圧ガス・液化石油ガス・火薬類の許可',
    law: '高圧ガス保安法 / 液化石油ガス法 / 火薬類取締法',
    provision: '高圧ガス保安法第5条・第16条ほか',
    action: '許可',
    authority: '都道府県(産業保安担当課)',
    summary: '製造・貯蔵設備の設置には許可が要る。保安距離が敷地計画を縛る。',
    threshold: '高圧ガス・LPガス・火薬類の製造・貯蔵設備を設ける場合',
    scope: 'national',
    asOf: ASOF,
    confidence: 'check',
    sources: [
      egovSource('高圧ガス保安法'),
      egovSource('液化石油ガス法'),
      egovSource('火薬類取締法'),
    ],
    match: (p) => (hasUse(p, 'factory', 'dangerousGoods') ? '対象設備の有無を確認する' : null),
  },
  {
    id: 'eia',
    category: '用途固有の手続',
    title: '環境影響評価',
    law: '環境影響評価法 / 環境影響評価条例',
    provision: '環境影響評価法',
    action: '協議',
    authority: '環境担当課',
    summary:
      '大規模な事業は環境影響評価の対象になる。建築物そのものは法の対象事業に無く、自治体の条例(高層建築物・大規模建築物等)で対象になることが多い。手続に年単位の期間がかかるため、規模が近い場合は最初に判定する。',
    threshold: '事業の種類と規模による(条例で国より小さい規模を対象にしている場合がある)',
    scope: 'national',
    asOf: ASOF,
    confidence: 'check',
    sources: [egovSource('環境影響評価法')],
    note: 'ここで使っている敷地2ha・延べ5万m2の目安は条文の数値ではない。条例の対象規模は自治体ごとに確認すること。',
    match: (p) => {
      if (p.siteArea < 20000 && p.totalFloorArea < 50000) return null;
      return `敷地面積 ${m2(p.siteArea)} / 延べ面積 ${m2(p.totalFloorArea)}。条例の対象規模に達していないか確認する`;
    },
  },
];

export const NATIONAL_RULES: RegulationRule[] = [
  ...inputRules,
  ...kenchikuKijunRules,
  ...energyFireRules,
  ...cityPlanningRules,
  ...scaleRules,
  ...useSpecificRules,
];

export const NATIONAL_CATEGORY_ORDER = [
  '入力の確認',
  '建築基準法の手続',
  '省エネ・消防',
  '都市計画・土地',
  '規模・高さで効く法令',
  '用途固有の手続',
];
