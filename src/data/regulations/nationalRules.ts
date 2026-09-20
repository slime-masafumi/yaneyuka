import { egovSource } from './lawSources';
import { USE_OPTIONS } from './options';
import type { ProjectInput, RegulationRule } from './types';

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
const hasFlag = (p: ProjectInput, id: string) => p.siteFlags.includes(id);
const isWork = (p: ProjectInput, ...w: string[]) => w.some((x) => p.workTypes.includes(x as never));
/** 新築・増築・改築のいずれか(建物ができる工事) */
const isBuilding = (p: ProjectInput) => isWork(p, 'new', 'extension', 'rebuild');
const m2 = (n: number) => `${n.toLocaleString()}m2`;

// ---------------------------------------------------------------------------
// 建築基準法の手続
// ---------------------------------------------------------------------------

const kenchikuKijunRules: RegulationRule[] = [
  {
    id: 'bsl-6-1-1',
    category: '建築基準法の手続',
    title: '建築確認申請(第一号 特殊建築物)',
    law: '建築基準法',
    provision: '法第6条第1項第一号',
    action: '確認申請',
    authority: '建築主事(特定行政庁)または指定確認検査機関',
    summary:
      '別表第一(い)欄に掲げる用途に供する部分の床面積の合計が200m2を超える建築物は、全国どこでも(都市計画区域の内外を問わず)確認申請が要る。用途変更で新たに該当する用途になる場合も同じ。',
    threshold: '別表第一(い)欄の用途部分 > 200m2',
    scope: 'national',
    asOf: ASOF,
    confidence: 'likely',
    sources: [egovSource('建築基準法')],
    note: '用途部分の床面積で判定する。延べ面積そのものではない点に注意。ここでは延べ面積で近似しているので、複合用途のときは用途部分の面積で確認すること。',
    match: (p) => {
      if (!isBuilding(p) && !isWork(p, 'majorRepair', 'useChange')) return null;
      const special = usesWith(p, 'specialBuilding');
      if (special.length === 0) return null;
      if (p.totalFloorArea <= 200) return null;
      return `特殊建築物に当たりうる用途(${special.join('・')})を含み、延べ面積 ${m2(p.totalFloorArea)} が 200m2 を超える`;
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
      '令和7年4月1日施行の改正で、木造と非木造の区分が廃止され「階数2以上または延べ面積200m2超」に一本化された。旧4号特例の対象から外れるため、構造関係規定と省エネ関係の図書の提出が必要になる。従来2階建て木造住宅で省略できていた審査が省略できない。',
    threshold: '階数 >= 2 または 延べ面積 > 200m2',
    scope: 'national',
    asOf: ASOF,
    confidence: 'definite',
    sources: [egovSource('建築基準法')],
    note: '令和7年4月1日施行。着工時期によって適用が変わるため、既存案件は施行日との関係を確認すること。',
    match: (p) => {
      if (!isBuilding(p) && !isWork(p, 'majorRepair')) return null;
      const floors = p.floorsAbove + p.floorsBelow;
      const hitFloors = floors >= 2;
      const hitArea = p.totalFloorArea > 200;
      if (!hitFloors && !hitArea) return null;
      const why: string[] = [];
      if (hitFloors) why.push(`階数 ${floors}(地上${p.floorsAbove}・地下${p.floorsBelow})が2以上`);
      if (hitArea) why.push(`延べ面積 ${m2(p.totalFloorArea)} が 200m2 超`);
      return why.join(' / ');
    },
  },
  {
    id: 'bsl-6-1-3',
    category: '建築基準法の手続',
    title: '建築確認申請(第三号 いわゆる新3号建築物)',
    law: '建築基準法',
    provision: '法第6条第1項第三号',
    action: '確認申請',
    authority: '建築主事(特定行政庁)または指定確認検査機関',
    summary:
      '都市計画区域等の内にある、第一号・第二号以外の建築物(平屋かつ延べ面積200m2以下)。構造関係規定の審査は省略できるが、確認申請そのものは要る。都市計画区域外なら不要。',
    threshold: '都市計画区域等内 かつ 平屋 かつ 延べ面積 <= 200m2',
    scope: 'national',
    asOf: ASOF,
    confidence: 'definite',
    sources: [egovSource('建築基準法')],
    match: (p) => {
      if (!isBuilding(p)) return null;
      if (!p.inCityPlanningArea) return null;
      const floors = p.floorsAbove + p.floorsBelow;
      if (floors >= 2 || p.totalFloorArea > 200) return null;
      const special = usesWith(p, 'specialBuilding');
      if (special.length > 0 && p.totalFloorArea > 200) return null;
      return `都市計画区域等内で、階数 ${floors}・延べ面積 ${m2(p.totalFloorArea)}(平屋かつ200m2以下)`;
    },
  },
  {
    id: 'bsl-6-3',
    category: '建築基準法の手続',
    title: '構造計算適合性判定',
    law: '建築基準法',
    provision: '法第6条の3',
    action: '判定',
    authority: '都道府県知事または指定構造計算適合性判定機関',
    summary:
      '許容応力度等計算(ルート2)以上の構造計算による建築物は、確認申請とは別に構造計算適合性判定を受ける。判定に日数がかかるため、工程上は確認申請と並行で見込む必要がある。',
    threshold: '構造計算のルートによる(規模・構造種別で決まる)',
    scope: 'national',
    asOf: ASOF,
    confidence: 'check',
    sources: [egovSource('建築基準法'), egovSource('建築基準法施行令')],
    note: '令和7年4月1日施行の改正で、木造の構造計算が必要となる規模の基準が見直された。採用する計算ルートによって適判の要否が決まるため、構造設計者と早期に確認すること。',
    match: (p) => {
      if (!isBuilding(p)) return null;
      const floors = p.floorsAbove + p.floorsBelow;
      if (p.structure === 'wood') {
        if (p.floorsAbove >= 3 || p.maxHeight > 16 || p.totalFloorArea > 300) {
          return `木造で 階数 ${p.floorsAbove} / 高さ ${p.maxHeight}m / 延べ面積 ${m2(p.totalFloorArea)} のいずれかが構造計算を要する規模に達している`;
        }
        return null;
      }
      if (floors >= 2 || p.totalFloorArea > 200) {
        return `${p.structure === 'steel' ? '鉄骨造' : p.structure === 'rc' ? 'RC造' : p.structure === 'src' ? 'SRC造' : 'その他の構造'}で 階数 ${floors} / 延べ面積 ${m2(p.totalFloorArea)}。採用する計算ルート次第で適判の対象になる`;
      }
      return null;
    },
  },
  {
    id: 'bsl-7-3',
    category: '建築基準法の手続',
    title: '中間検査',
    law: '建築基準法',
    provision: '法第7条の3',
    action: '報告',
    authority: '建築主事(特定行政庁)または指定確認検査機関',
    summary:
      '中間検査を要する特定工程は特定行政庁が指定する。指定内容は行政庁ごとに違うため、着工前に該当の有無と対象工程を確認する。',
    threshold: '特定行政庁の指定による',
    scope: 'national',
    asOf: ASOF,
    confidence: 'check',
    sources: [egovSource('建築基準法')],
    note: '特定工程の指定は自治体ごとに異なる。ここは自治体差分レイヤーで埋めるべき項目。',
    match: (p) => (isBuilding(p) ? '新築・増築等に該当。特定工程の指定の有無を確認する' : null),
  },
  {
    id: 'bsl-48',
    category: '建築基準法の手続',
    title: '用途地域内の建築制限',
    law: '建築基準法',
    provision: '法第48条・別表第二',
    action: '適合義務',
    authority: '建築主事(特定行政庁)',
    summary:
      '用途地域ごとに建てられる用途が別表第二で決まる。該当しない用途は特定行政庁の許可(法第48条ただし書)が要り、許可には時間がかかる。',
    threshold: '用途地域と用途の組み合わせによる',
    scope: 'national',
    asOf: ASOF,
    confidence: 'check',
    sources: [egovSource('建築基準法')],
    match: (p) => {
      if (p.zoning === '未選択' || p.useIds.length === 0) return null;
      return `${p.zoning}における ${p.useIds.map(useLabel).join('・')} の可否を別表第二で確認する`;
    },
  },
  {
    id: 'bsl-86-7',
    category: '建築基準法の手続',
    title: '既存不適格建築物の増築等の制限緩和',
    law: '建築基準法',
    provision: '法第86条の7',
    action: '適合義務',
    authority: '建築主事(特定行政庁)',
    summary:
      '既存不適格の建築物に増築・改築・大規模の修繕等を行う場合、どこまで現行法に適合させるかが条文と告示で決まる。既存部分の調査が前提になるため、基本設計の前に着手しないと工程を圧迫する。',
    threshold: '増築・改築・大規模の修繕・模様替を行う場合',
    scope: 'national',
    asOf: ASOF,
    confidence: 'check',
    sources: [egovSource('建築基準法')],
    match: (p) =>
      isWork(p, 'extension', 'rebuild', 'majorRepair')
        ? `${p.workTypes.includes('extension') ? '増築' : p.workTypes.includes('rebuild') ? '改築・移転' : '大規模の修繕・模様替'}を含む。既存部分の適合状況の調査が要る`
        : null,
  },
  {
    id: 'architect-act-3',
    category: '建築基準法の手続',
    title: '建築士でなければ設計・工事監理できない建築物',
    law: '建築士法',
    provision: '法第3条〜第3条の3',
    action: '適合義務',
    authority: '都道府県(建築士事務所登録)',
    summary:
      '規模・用途・構造によって一級建築士でなければ設計・工事監理できない建築物が決まる。体制の確認を設計契約前に済ませる。',
    threshold: '延べ面積・階数・用途・構造による',
    scope: 'national',
    asOf: ASOF,
    confidence: 'check',
    sources: [egovSource('建築士法')],
    match: (p) => {
      if (!isBuilding(p)) return null;
      if (p.totalFloorArea > 500 || p.floorsAbove >= 3) {
        return `延べ面積 ${m2(p.totalFloorArea)} / 地上 ${p.floorsAbove} 階。資格要件の確認が要る規模`;
      }
      return null;
    },
  },
];

// ---------------------------------------------------------------------------
// 省エネ・消防
// ---------------------------------------------------------------------------

const energyFireRules: RegulationRule[] = [
  {
    id: 'beea-tekigou',
    category: '省エネ・消防',
    title: '省エネ基準への適合義務',
    law: '建築物のエネルギー消費性能の向上等に関する法律',
    provision: '建築物省エネ法',
    action: '適合義務',
    authority: '所管行政庁または登録建築物エネルギー消費性能判定機関',
    summary:
      '令和7年4月1日から、原則すべての新築住宅・非住宅に省エネ基準への適合が義務づけられた。適合しなければ確認済証が交付されず着工できない。床面積10m2以下の新築・増改築や、居室を有しない・高い開放性を有するもの(自動車車庫、公共用歩廊等)は対象外。',
    threshold: '原則すべての新築(床面積10m2以下等は除く)',
    scope: 'national',
    asOf: ASOF,
    confidence: 'likely',
    sources: [egovSource('建築物省エネ法')],
    note: '確認申請前に着工していた案件でも、実際の着工が令和7年4月以降なら完了検査時に適合確認が要る。',
    match: (p) => {
      if (!isBuilding(p)) return null;
      if (p.totalFloorArea <= 10) return null;
      if (p.useIds.length === 1 && p.useIds[0] === 'garage') return null;
      return `新築等で延べ面積 ${m2(p.totalFloorArea)}(10m2超)。令和7年4月以降は原則適合義務`;
    },
  },
  {
    id: 'beea-tekihan',
    category: '省エネ・消防',
    title: '省エネ適合性判定(省エネ適判)',
    law: '建築物のエネルギー消費性能の向上等に関する法律',
    provision: '建築物省エネ法',
    action: '判定',
    authority: '所管行政庁または登録建築物エネルギー消費性能判定機関',
    summary:
      '省エネ基準への適合を、建築確認とは別の判定で確認する手続。令和7年4月の改正で対象が拡大した。300m2以上は適判の対象になる。小規模なものは仕様基準等により建築確認の中で審査される場合がある。',
    threshold: '延べ面積 300m2 以上(小規模は仕様基準等による審査の場合あり)',
    scope: 'national',
    asOf: ASOF,
    confidence: 'check',
    sources: [egovSource('建築物省エネ法')],
    note: '適判の要否と審査経路は規模と採用する基準(標準計算/仕様基準)で変わる。確認検査機関に事前に確認すること。',
    match: (p) => {
      if (!isBuilding(p)) return null;
      if (p.totalFloorArea < 300) return null;
      return `延べ面積 ${m2(p.totalFloorArea)} が 300m2 以上`;
    },
  },
  {
    id: 'fire-7',
    category: '省エネ・消防',
    title: '消防同意',
    law: '消防法',
    provision: '法第7条',
    action: '同意',
    authority: '消防長または消防署長',
    summary:
      '建築確認をする前提として消防長等の同意が要る。確認申請の審査期間に組み込まれるが、事前相談で指摘が出ると差し戻しになる。',
    threshold: '建築確認を要する建築物(一定の住宅等を除く)',
    scope: 'national',
    asOf: ASOF,
    confidence: 'likely',
    sources: [egovSource('消防法')],
    match: (p) => (isBuilding(p) ? '建築確認の対象。消防同意の手続に入る' : null),
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
      '令別表第一の防火対象物の区分と、延べ面積・階数・収容人員によって必要な消防用設備等が決まる。複合用途では令第9条により用途部分ごとの判定も要る。',
    threshold: '令別表第一の区分・面積・階数・収容人員による',
    scope: 'national',
    asOf: ASOF,
    confidence: 'check',
    sources: [egovSource('消防法')],
    match: (p) => {
      if (p.useIds.length === 0) return null;
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
    provision: '法第53条',
    action: '許可',
    authority: '都道府県知事または市町村長(都市計画担当課)',
    summary:
      '都市計画道路・公園・土地区画整理事業の区域内で建築するには許可が要る。階数や構造に制限がかかることがあり、計画の前提が変わるため最初に確認する。',
    threshold: '都市計画施設の区域・市街地開発事業の施行区域内',
    scope: 'national',
    asOf: ASOF,
    confidence: 'definite',
    sources: [egovSource('都市計画法')],
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
    title: '開発許可・市街化調整区域内の建築許可',
    law: '都市計画法',
    provision: '法第29条・第35条の2・第42条・第43条',
    action: '許可',
    authority: '都道府県知事または市町村長(開発審査担当)',
    summary:
      '市街化調整区域では、開発行為だけでなく建築行為そのものに許可が要る。許可の見込みが立たないと計画自体が成立しないため、最優先で確認する項目。',
    threshold: '市街化調整区域内、または一定規模以上の開発行為',
    scope: 'national',
    asOf: ASOF,
    confidence: 'definite',
    sources: [egovSource('都市計画法')],
    match: (p) => (p.urbanizationControlArea ? '市街化調整区域内と入力されている' : null),
  },
  {
    id: 'cpa-68-2',
    category: '都市計画・土地',
    title: '地区計画の区域内の制限',
    law: '都市計画法 / 建築基準法',
    provision: '都計法第12条の5、建基法第68条の2',
    action: '適合義務',
    authority: '市町村(都市計画担当課)',
    summary:
      '地区整備計画で定めた建築物の用途・容積率・建蔽率・高さ・壁面の位置・形態意匠等が、市町村の条例により建築基準法の制限として上乗せされる。地区計画の内容は区域ごとに全く違うので、区域図と地区整備計画書の両方を取り寄せる。',
    threshold: '地区計画等の区域内',
    scope: 'national',
    asOf: ASOF,
    confidence: 'definite',
    sources: [egovSource('都市計画法'), egovSource('建築基準法')],
    note: '地区計画の区域は国土交通省の都市計画決定GISデータに含まれている。ただし地区整備計画の中身は自治体の告示・条例を見る必要がある。',
    match: (p) => (hasFlag(p, 'districtPlan') ? '地区計画等の区域内と入力されている' : null),
  },
  {
    id: 'slope-act',
    category: '都市計画・土地',
    title: '宅地造成及び特定盛土等規制法(盛土規制法)の許可',
    law: '宅地造成及び特定盛土等規制法',
    provision: '法第12条第1項・第30条第1項',
    action: '許可',
    authority: '都道府県知事または市町村長(盛土対策担当)',
    summary:
      '規制区域内で一定規模以上の盛土・切土を伴う造成をする場合、工事に着手する前に許可が要る。建築確認より前に済ませる必要があるため、造成を伴う計画では工程の起点になる。',
    threshold: '宅地造成等工事規制区域・特定盛土等規制区域内の一定規模以上の造成',
    scope: 'national',
    asOf: ASOF,
    confidence: 'definite',
    sources: [egovSource('盛土規制法')],
    match: (p) => (hasFlag(p, 'soilRegulationArea') ? '規制区域内と入力されている' : null),
  },
  {
    id: 'soil-contamination-4',
    category: '都市計画・土地',
    title: '土地の形質変更の届出(土壌汚染対策法)',
    law: '土壌汚染対策法',
    provision: '法第4条',
    action: '届出',
    authority: '都道府県知事等(環境保全担当課)',
    summary:
      '一定面積以上の土地の形質変更をする場合、着手の30日前までに届出が要る。調査命令が出ると土壌調査の期間が工程に乗るため、早期の判定が要る。',
    threshold: '形質変更 3,000m2 以上(有害物質使用特定施設の敷地は 900m2 以上)',
    scope: 'national',
    asOf: ASOF,
    confidence: 'definite',
    sources: [egovSource('土壌汚染対策法')],
    match: (p) => {
      if (p.formChangeArea >= 3000) {
        return `土地の形質変更 ${m2(p.formChangeArea)} が 3,000m2 以上`;
      }
      if (p.formChangeArea >= 900) {
        return `土地の形質変更 ${m2(p.formChangeArea)}。有害物質使用特定施設の敷地なら 900m2 以上で対象`;
      }
      return null;
    },
  },
  {
    id: 'buried-cultural-93',
    category: '都市計画・土地',
    title: '埋蔵文化財包蔵地における土木工事等の届出',
    law: '文化財保護法',
    provision: '法第93条・第94条',
    action: '届出',
    authority: '教育委員会(埋蔵文化財担当)',
    summary:
      '周知の埋蔵文化財包蔵地で土木工事をする場合、着手の60日前までに届出が要る。試掘・本発掘に進むと数か月単位で工程が動くため、用地取得の段階で確認しておく項目。',
    threshold: '周知の埋蔵文化財包蔵地内での土木工事(着手60日前まで)',
    scope: 'national',
    asOf: ASOF,
    confidence: 'definite',
    sources: [egovSource('文化財保護法')],
    match: (p) => (hasFlag(p, 'buriedCulturalProperty') ? '周知の埋蔵文化財包蔵地内と入力されている' : null),
  },
  {
    id: 'river-26',
    category: '都市計画・土地',
    title: '河川区域内の工作物の新築等の許可',
    law: '河川法',
    provision: '法第24条・第26条',
    action: '許可',
    authority: '河川管理者(国・都道府県・市町村)',
    summary: '河川区域内の土地の占用や工作物の新築には許可が要る。管理者が国か県か市かで窓口が変わる。',
    threshold: '河川区域・河川保全区域内',
    scope: 'national',
    asOf: ASOF,
    confidence: 'definite',
    sources: [egovSource('河川法')],
    match: (p) => (hasFlag(p, 'riverArea') ? '河川区域・河川保全区域内と入力されている' : null),
  },
  {
    id: 'specified-urban-river-30',
    category: '都市計画・土地',
    title: '雨水浸透阻害行為の許可',
    law: '特定都市河川浸水被害対策法',
    provision: '法第30条',
    action: '許可',
    authority: '都道府県知事または市町村長(河川担当課)',
    summary:
      '特定都市河川流域で一定規模以上の雨水浸透阻害行為(宅地化・舗装等)をする場合は許可が要る。雨水貯留浸透施設の設置が条件になり、外構計画と敷地計画に影響する。',
    threshold: '特定都市河川流域内で 1,000m2 以上の雨水浸透阻害行為',
    scope: 'national',
    asOf: ASOF,
    confidence: 'likely',
    sources: [egovSource('特定都市河川浸水被害対策法')],
    match: (p) => {
      if (!hasFlag(p, 'specifiedUrbanRiver')) return null;
      const area = Math.max(p.siteArea, p.formChangeArea);
      if (area < 1000) return `特定都市河川流域内。規模(${m2(area)})が閾値未満だが、区域の指定内容を確認する`;
      return `特定都市河川流域内で対象面積 ${m2(area)} が 1,000m2 以上`;
    },
  },
  {
    id: 'natural-park',
    category: '都市計画・土地',
    title: '自然公園区域内の行為の許可・届出',
    law: '自然公園法',
    provision: '法第20条・第33条',
    action: '許可',
    authority: '環境大臣または都道府県知事(自然環境担当課)',
    summary: '特別地域では許可、普通地域では届出が要る。高さや色彩に基準がかかることが多い。',
    threshold: '自然公園の特別地域・普通地域内',
    scope: 'national',
    asOf: ASOF,
    confidence: 'definite',
    sources: [egovSource('自然公園法')],
    match: (p) => (hasFlag(p, 'naturalPark') ? '自然公園区域内と入力されている' : null),
  },
  {
    id: 'landscape-16',
    category: '都市計画・土地',
    title: '景観計画区域内の行為の届出',
    law: '景観法',
    provision: '法第16条',
    action: '届出',
    authority: '景観行政団体(景観担当課)',
    summary:
      '景観計画区域内では、着手の30日前までに行為の届出が要る。規模が大きいと事前協議を求められ、外装の色彩や形態意匠に制限がかかる。',
    threshold: '景観計画区域内(規模要件は景観計画による)',
    scope: 'national',
    asOf: ASOF,
    confidence: 'definite',
    sources: [egovSource('景観法')],
    match: (p) => (hasFlag(p, 'landscapeArea') ? '景観計画区域内と入力されている' : null),
  },
  {
    id: 'green-area',
    category: '都市計画・土地',
    title: '緑化率の最低限度(緑化地域)',
    law: '都市緑地法',
    provision: '法第34条・第35条',
    action: '適合義務',
    authority: '市町村(公園緑地担当課)',
    summary: '緑化地域内の一定規模以上の建築物には緑化率の最低限度がかかる。外構の面積配分に直結する。',
    threshold: '緑化地域内(規模要件は条例による)',
    scope: 'national',
    asOf: ASOF,
    confidence: 'check',
    sources: [egovSource('都市緑地法')],
    match: (p) => (hasFlag(p, 'greenArea') ? '緑化地域・緑化率規制のある区域と入力されている' : null),
  },
];

// ---------------------------------------------------------------------------
// 規模・高さで効く法令
// ---------------------------------------------------------------------------

const scaleRules: RegulationRule[] = [
  {
    id: 'barrier-free-14',
    category: '規模・高さで効く法令',
    title: '建築物移動等円滑化基準への適合義務',
    law: '高齢者、障害者等の移動等の円滑化の促進に関する法律(バリアフリー法)',
    provision: '法第14条',
    action: '適合義務',
    authority: '所管行政庁(建築指導担当課)',
    summary:
      '特別特定建築物で床面積の合計が2,000m2以上のものは、建築物移動等円滑化基準への適合が義務になる。地方公共団体の条例で対象用途の追加や規模の引き下げがされていることが多い。',
    threshold: '特別特定建築物 かつ 床面積の合計 2,000m2 以上(条例で引き下げ有り)',
    scope: 'national',
    asOf: ASOF,
    confidence: 'definite',
    sources: [egovSource('バリアフリー法')],
    note: '条例による上乗せが全国的に多い項目。自治体の福祉のまちづくり条例と併せて確認する。',
    match: (p) => {
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
    provision: '法第5条',
    action: '届出',
    authority: '保健所(生活衛生担当課)',
    summary:
      '特定用途に供される部分の延べ面積が3,000m2以上(学校は8,000m2以上)の建築物は、使用開始後1か月以内に届出が要る。空気環境の測定など維持管理基準がかかるため、設備計画に影響する。',
    threshold: '特定用途部分 3,000m2 以上(学校教育法1条校は 8,000m2 以上)',
    scope: 'national',
    asOf: ASOF,
    confidence: 'definite',
    sources: [egovSource('建築物衛生法')],
    match: (p) => {
      const targets = usesWith(p, 'hygieneSpecified');
      if (targets.length === 0) return null;
      const isSchool = usesWith(p, 'hygieneSchool').length > 0;
      const limit = isSchool ? 8000 : 3000;
      if (p.totalFloorArea < limit) return null;
      return `特定用途(${targets.join('・')})で、延べ面積 ${m2(p.totalFloorArea)} が ${m2(limit)} 以上`;
    },
  },
  {
    id: 'construction-recycle-10',
    category: '規模・高さで効く法令',
    title: '分別解体等の届出(建設リサイクル法)',
    law: '建設工事に係る資材の再資源化等に関する法律',
    provision: '法第10条',
    action: '届出',
    authority: '都道府県知事または市町村長(建築指導担当課)',
    summary: '対象建設工事は、着手の7日前までに分別解体等の計画を届け出る。解体を伴う計画では見落としやすい。',
    threshold: '解体 80m2 以上 / 新築・増築 500m2 以上 / 修繕・模様替 1億円以上 / その他工作物 500万円以上',
    scope: 'national',
    asOf: ASOF,
    confidence: 'definite',
    sources: [egovSource('建設リサイクル法')],
    match: (p) => {
      const hits: string[] = [];
      if (p.demolitionArea >= 80) hits.push(`解体部分 ${m2(p.demolitionArea)} が 80m2 以上`);
      if (isWork(p, 'new', 'extension') && p.totalFloorArea >= 500) {
        hits.push(`新築・増築で延べ面積 ${m2(p.totalFloorArea)} が 500m2 以上`);
      }
      if (isWork(p, 'majorRepair') && p.contractAmountManYen >= 10000) {
        hits.push(`修繕・模様替で請負金額 ${p.contractAmountManYen.toLocaleString()}万円 が 1億円以上`);
      }
      return hits.length ? hits.join(' / ') : null;
    },
  },
  {
    id: 'large-retail-5',
    category: '規模・高さで効く法令',
    title: '大規模小売店舗の新設の届出',
    law: '大規模小売店舗立地法',
    provision: '法第5条',
    action: '届出',
    authority: '都道府県または政令市(商業担当課)',
    summary:
      '店舗面積1,000m2を超える大規模小売店舗の新設は届出が要る。届出から8か月間は営業を開始できないため、開店時期から逆算すると設計の最上流に影響する。',
    threshold: '店舗面積 1,000m2 超',
    scope: 'national',
    asOf: ASOF,
    confidence: 'definite',
    sources: [egovSource('大規模小売店舗立地法')],
    match: (p) => {
      if (usesWith(p, 'retail').length === 0) return null;
      const area = p.storeArea > 0 ? p.storeArea : p.totalFloorArea;
      if (area <= 1000) return null;
      return `店舗面積 ${m2(area)} が 1,000m2 を超える`;
    },
  },
  {
    id: 'factory-location-6',
    category: '規模・高さで効く法令',
    title: '特定工場の新設の届出(工場立地法)',
    law: '工場立地法',
    provision: '法第6条',
    action: '届出',
    authority: '市町村(産業立地担当課)',
    summary:
      '製造業等の特定工場は、緑地面積率・環境施設面積率の基準を満たす必要があり、着手の90日前までに届出が要る。敷地の2割前後を緑地に取られるため、配置計画の前提が変わる。',
    threshold: '敷地面積 9,000m2 以上 または 建築面積の合計 3,000m2 以上',
    scope: 'national',
    asOf: ASOF,
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
    id: 'radio-102-3',
    category: '規模・高さで効く法令',
    title: '電波伝搬障害防止区域内の高層建築物の届出',
    law: '電波法',
    provision: '法第102条の3',
    action: '届出',
    authority: '総合通信局',
    summary:
      '重要無線通信の電波伝搬障害防止区域内で、地表からの高さが31mを超える建築物を建てる場合は届出が要る。高さ31mは他の規制の節目でもないため見落としやすい。',
    threshold: '電波伝搬障害防止区域内 かつ 地表高 31m 超',
    scope: 'national',
    asOf: ASOF,
    confidence: 'likely',
    sources: [egovSource('電波法')],
    match: (p) => {
      if (p.maxHeight <= 31) return null;
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
    asOf: ASOF,
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
    provision: '法第88条',
    action: '届出',
    authority: '労働基準監督署',
    summary:
      '高さ31mを超える建築物の建設等の仕事は、工事開始の30日前までに届出が要る。施工者側の手続だが、工程表に載せておかないと着工が遅れる。',
    threshold: '高さ 31m 超の建築物の建設等',
    scope: 'national',
    asOf: ASOF,
    confidence: 'definite',
    sources: [egovSource('労働安全衛生法')],
    match: (p) => (p.maxHeight > 31 ? `最高高さ ${p.maxHeight}m が 31m を超える` : null),
  },
  {
    id: 'parking-20',
    category: '規模・高さで効く法令',
    title: '駐車施設の附置義務',
    law: '駐車場法',
    provision: '法第20条',
    action: '適合義務',
    authority: '市町村(都市計画・建築指導担当課)',
    summary:
      '駐車場整備地区や商業地域等では、条例で定める規模以上の建築物に駐車施設の附置が義務づけられる。台数は条例ごとに違い、平面計画に直結する。',
    threshold: '条例による(用途地域と延べ面積で決まることが多い)',
    scope: 'national',
    asOf: ASOF,
    confidence: 'check',
    sources: [egovSource('駐車場法')],
    match: (p) => {
      const targetZone = ['近隣商業地域', '商業地域', '準工業地域'].includes(p.zoning);
      if (!targetZone && p.totalFloorArea < 1000) return null;
      return `${p.zoning} / 延べ面積 ${m2(p.totalFloorArea)}。附置義務条例の有無と必要台数を確認する`;
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
    summary: '公共下水道の処理区域外では浄化槽の設置届が要る。既存浄化槽を使う場合も使用廃止・変更の届出を確認する。',
    threshold: '公共下水道の処理区域外',
    scope: 'national',
    asOf: ASOF,
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
      hasUse(p, 'retailStore', 'restaurant', 'hotel', 'amusement', 'office')
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
      '病院は開設許可、無床診療所は開設届。構造設備基準が医療法施行規則で定まっているため、建築確認とは別に事前協議が要る。',
    threshold: '病院・診療所・助産所を設ける場合',
    scope: 'national',
    asOf: ASOF,
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
    title: '理容所・美容所・クリーニング所の構造設備の確認',
    law: '理容師法 / 美容師法 / クリーニング業法',
    provision: '理容師法第11条の2、美容師法第11条、クリーニング業法第5条',
    action: '協議',
    authority: '保健所(生活衛生担当課)',
    summary:
      '各法で作業室の面積・照度・洗場等の構造設備基準が定められている。開設届の前に保健所と協議する。',
    threshold: '理容所・美容所・クリーニング所を設ける場合',
    scope: 'national',
    asOf: ASOF,
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
    provision: '法第3条',
    action: '許可',
    authority: '保健所(生活衛生担当課)',
    summary: '客室数・寝具・換気・採光等の構造設備基準がある。学校等の周辺では意見聴取の手続が入ることがある。',
    threshold: 'ホテル・旅館を設ける場合',
    scope: 'national',
    asOf: ASOF,
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
    asOf: ASOF,
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
    asOf: ASOF,
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
    asOf: ASOF,
    confidence: 'definite',
    sources: [egovSource('化製場法')],
    match: (p) => (hasUse(p, 'renderingPlant') ? '化製場を選択している' : null),
  },
  {
    id: 'poison-act',
    category: '用途固有の手続',
    title: '毒物劇物販売業の登録',
    law: '毒物及び劇物取締法',
    provision: '法第4条',
    action: '許可',
    authority: '保健所(薬事担当課)',
    summary: '毒物劇物を販売する店舗は、貯蔵設備等の基準を満たしたうえで登録が要る。',
    threshold: '毒物劇物販売業を営む場合',
    scope: 'national',
    asOf: ASOF,
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
      '大規模な事業は環境影響評価の対象になる。手続に年単位の期間がかかるため、規模が近い場合は最初に判定する。',
    threshold: '事業の種類と規模による(条例で国より小さい規模を対象にしている場合がある)',
    scope: 'national',
    asOf: ASOF,
    confidence: 'check',
    sources: [egovSource('環境影響評価法')],
    match: (p) => {
      if (p.siteArea < 20000 && p.totalFloorArea < 50000) return null;
      return `敷地面積 ${m2(p.siteArea)} / 延べ面積 ${m2(p.totalFloorArea)}。条例の対象規模に達していないか確認する`;
    },
  },
];

export const NATIONAL_RULES: RegulationRule[] = [
  ...kenchikuKijunRules,
  ...energyFireRules,
  ...cityPlanningRules,
  ...scaleRules,
  ...useSpecificRules,
];

export const NATIONAL_CATEGORY_ORDER = [
  '建築基準法の手続',
  '省エネ・消防',
  '都市計画・土地',
  '規模・高さで効く法令',
  '用途固有の手続',
];
