import { egovSource } from '../lawSources';
import { USE_OPTIONS } from '../options';
import type { MunicipalPack, RegulationRule } from '../types';
import { hasFlag, hasUse, isBuilding, isResidentialZone, m2, useLabel } from './_helpers';

/**
 * 静岡市
 *
 * 一次資料:
 *   静岡市建築確認事前チェックリスト(調査内容と調査先一覧) 令和7年度版
 *   令和7年6月16日作成 / 静岡市 都市局 建築部 建築安全推進課
 *   https://www.city.shizuoka.lg.jp/documents/10658/r7-kenntikukakuninn-tyeekurisuto.pdf
 *
 * 74項目のチェックリストのうち、国の法令は全国共通レイヤーに入っているので、
 * ここには静岡市・静岡県の条例と要綱、および市が指定する区域に関するものを置く。
 * 国の法令の窓口(課名・係名・電話番号)は authorityOverrides でこの自治体の実際の
 * 値に差し替える。
 */

const SRC = {
  label: '静岡市建築確認事前チェックリスト 令和7年度版(令和7年6月16日)',
  url: 'https://www.city.shizuoka.lg.jp/documents/10658/r7-kenntikukakuninn-tyeekurisuto.pdf',
};

const ASOF = '2025-06-16';

const rules: RegulationRule[] = [
  {
    id: 'sz-chukoso',
    category: '静岡市・静岡県の条例等',
    title: '中高層建築物の紛争予防条例',
    law: '中高層建築物の建築に係る紛争の予防及び調整に関する条例',
    provision: '静岡市条例',
    action: '届出',
    authority: '静岡市 建築安全推進課 指導係(054-221-1267)',
    summary:
      '住居系用途地域および用途地域の指定のない区域では高さ10m超、それ以外の地域では高さ15m超の建築物が対象。標識の設置と近隣説明が要り、説明期間が確認申請前の工程に乗る。着工直前に気づくと工程が崩れる典型例。',
    threshold: '住居系・無指定: 高さ 10m 超 / 非住居系: 高さ 15m 超',
    scope: 'municipal',
    municipalityId: 'shizuoka',
    asOf: ASOF,
    confidence: 'definite',
    sources: [SRC],
    match: (p) => {
      if (!isBuilding(p)) return null;
      const residential = isResidentialZone(p);
      const limit = residential ? 10 : 15;
      if (p.maxHeight <= limit) return null;
      return `最高高さ ${p.maxHeight}m が ${residential ? '住居系・無指定の' : '非住居系の'}基準 ${limit}m を超える`;
    },
  },
  {
    id: 'sz-casbee',
    category: '静岡市・静岡県の条例等',
    title: '静岡県建築物環境配慮制度(CASBEE静岡)',
    law: '静岡県地球温暖化防止条例',
    provision: '静岡県条例',
    action: '届出',
    authority: '静岡市 建築安全推進課 審査係(054-221-1259)',
    summary:
      '延べ面積2,000m2以上のすべての建築物が対象。用途を問わないため、事務所や工場でも該当する。評価書の作成に時間がかかるので、実施設計の途中で気づくと間に合わない。',
    threshold: '延べ面積 2,000m2 以上のすべての建築物',
    scope: 'municipal',
    municipalityId: 'shizuoka',
    asOf: ASOF,
    confidence: 'definite',
    sources: [SRC],
    match: (p) => {
      if (!isBuilding(p)) return null;
      if (p.totalFloorArea < 2000) return null;
      return `延べ面積 ${m2(p.totalFloorArea)} が 2,000m2 以上(用途を問わず対象)`;
    },
  },
  {
    id: 'sz-keikan',
    category: '静岡市・静岡県の条例等',
    title: '景観法の届出と静岡市景観条例の完了届',
    law: '景観法 / 静岡市景観条例',
    provision: '景観法第16条、静岡市景観条例第14条',
    action: '届出',
    authority: '静岡市 景観まちづくり課 都市景観推進係(054-221-1049)',
    summary:
      '行為の届出と変更の届出に加え、完了届が要る。延べ床面積が5,000m2を超える建築物は、届出の60日前までに事前協議が必要。太陽光発電設備も令和2年2月から届出対象の工作物に加わっている。',
    threshold: '景観計画区域内 / 延べ面積 5,000m2 超は届出の60日前までに事前協議',
    scope: 'municipal',
    municipalityId: 'shizuoka',
    asOf: ASOF,
    confidence: 'likely',
    sources: [SRC, egovSource('景観法')],
    match: (p) => {
      if (!isBuilding(p)) return null;
      if (p.totalFloorArea > 5000) {
        return `延べ面積 ${m2(p.totalFloorArea)} が 5,000m2 を超えるため、届出の60日前までに事前協議が要る`;
      }
      if (hasFlag(p, 'landscapeArea')) return '景観計画区域内と入力されている';
      return '景観計画区域に該当するかを確認する';
    },
  },
  {
    id: 'sz-fukushi',
    category: '静岡市・静岡県の条例等',
    title: '静岡県福祉のまちづくり条例の届出',
    law: '静岡県福祉のまちづくり条例',
    provision: '静岡県条例',
    action: '届出',
    authority: '静岡市 建築安全推進課 審査係(054-221-1259)',
    summary:
      '特定公共的施設に該当する場合に届出義務がある。バリアフリー法(国)の2,000m2という規模より小さい建築物も対象になりうるため、法と条例の両方で判定する。',
    threshold: '特定公共的施設に該当する場合(国のバリアフリー法とは対象範囲が異なる)',
    scope: 'municipal',
    municipalityId: 'shizuoka',
    asOf: ASOF,
    confidence: 'check',
    sources: [SRC, egovSource('バリアフリー法')],
    match: (p) => {
      const targets = p.useIds
        .map((id) => USE_OPTIONS.find((u) => u.id === id))
        .filter((u) => u && (u.barrierFreeSpecial || u.barrierFreeGeneral))
        .map((u) => u!.label);
      if (targets.length === 0) return null;
      return `不特定多数が利用する用途(${targets.join('・')})を含む。特定公共的施設への該当を確認する`;
    },
  },
  {
    id: 'sz-daikibo-shukyaku',
    category: '静岡市・静岡県の条例等',
    title: '大規模集客施設制限地区建築条例',
    law: '静岡市条例(特別用途地区)',
    provision: '建築基準法第49条に基づく条例',
    action: '適合義務',
    authority: '静岡市 建築安全推進課 審査係(054-221-1259)',
    summary:
      '準工業地域に指定された大規模集客施設制限地区では、1万m2を超える集客施設が制限される。用途地域上は建てられるはずのものが条例で止まるため、事業計画の前提が崩れる。',
    threshold: '準工業地域の指定地区内 かつ 集客施設 10,000m2 超',
    scope: 'municipal',
    municipalityId: 'shizuoka',
    asOf: ASOF,
    confidence: 'check',
    sources: [SRC],
    match: (p) => {
      if (p.zoning !== '準工業地域') return null;
      if (!hasUse(p, 'retailStore', 'restaurant', 'amusement', 'theater', 'assemblyHall')) return null;
      if (p.totalFloorArea <= 10000) return null;
      return `準工業地域で集客施設(${p.useIds.map(useLabel).join('・')})の延べ面積 ${m2(p.totalFloorArea)} が 10,000m2 を超える。地区指定の有無を確認する`;
    },
  },
  {
    id: 'sz-tokubetsu-kogyo',
    category: '静岡市・静岡県の条例等',
    title: '特別工業地区建築条例',
    law: '静岡市条例(特別用途地区)',
    provision: '建築基準法第49条に基づく条例',
    action: '適合義務',
    authority: '静岡市 建築安全推進課 審査係(054-221-1259)',
    summary:
      '由比、蒲原、西島・下島・平和町の各地区で用途制限が上乗せされる。所在地が該当地区かどうかを最初に確認する。',
    threshold: '由比・蒲原・西島・下島・平和町の各地区内',
    scope: 'municipal',
    municipalityId: 'shizuoka',
    asOf: ASOF,
    confidence: 'check',
    sources: [SRC],
    match: (p) => (isBuilding(p) ? '所在地が特別工業地区(由比・蒲原・西島・下島・平和町)に当たるかを確認する' : null),
  },
  {
    id: 'sz-kodo-chiku',
    category: '静岡市・静岡県の条例等',
    title: '高度地区の制限',
    law: '建築基準法',
    provision: '法第58条',
    action: '適合義務',
    authority: '静岡市 都市計画課 土地利用計画係(054-221-1409)',
    summary:
      '高度地区の指定があると、斜線制限とは別に高さの最高限度がかかる。都市計画で定まる内容なので、用途地域と一緒に都市計画課で確認する。',
    threshold: '高度地区の指定がある区域',
    scope: 'municipal',
    municipalityId: 'shizuoka',
    asOf: ASOF,
    confidence: 'check',
    sources: [SRC, egovSource('建築基準法')],
    match: (p) => (p.maxHeight > 10 ? `最高高さ ${p.maxHeight}m。高度地区の指定の有無と最高限度を確認する` : null),
  },
  {
    id: 'sz-chushajo',
    category: '静岡市・静岡県の条例等',
    title: '駐車場の附置義務条例',
    law: '駐車場法第20条に基づく条例',
    provision: '静岡市条例',
    action: '適合義務',
    authority: '静岡市 都市計画課',
    summary: '商業地域・指定近隣商業地域・周辺地区で附置義務がかかる。必要台数が平面計画に直結する。',
    threshold: '商業地域・指定近隣商業地域・周辺地区',
    scope: 'municipal',
    municipalityId: 'shizuoka',
    asOf: ASOF,
    confidence: 'check',
    sources: [SRC],
    match: (p) =>
      ['商業地域', '近隣商業地域'].includes(p.zoning)
        ? `${p.zoning}。附置義務の区域指定と必要台数を確認する`
        : null,
  },
  {
    id: 'sz-chuurinjo',
    category: '静岡市・静岡県の条例等',
    title: '自転車等駐車場の附置義務条例',
    law: '自転車法第5条に基づく条例',
    provision: '静岡市条例',
    action: '適合義務',
    authority: '静岡市 都市計画課',
    summary: '商業地域・近隣商業地域で駐輪場の附置義務がかかる。駐車場とは別枠で面積が要る。',
    threshold: '商業地域・近隣商業地域',
    scope: 'municipal',
    municipalityId: 'shizuoka',
    asOf: ASOF,
    confidence: 'check',
    sources: [SRC],
    match: (p) =>
      ['商業地域', '近隣商業地域'].includes(p.zoning) ? `${p.zoning}。駐輪場の附置義務を確認する` : null,
  },
  {
    id: 'sz-shogyo-kankyo',
    category: '静岡市・静岡県の条例等',
    title: '静岡市良好な商業環境の形成に関する条例',
    law: '静岡市条例',
    provision: '静岡市条例',
    action: '協議',
    authority: '静岡市 商業労政課 商業・まちなか活性化係(054-354-2306)',
    summary:
      '小売業を行う部分が1,000m2を超える場合が対象。大規模小売店舗立地法とは別の手続なので、両方を並行して見込む。',
    threshold: '小売業を行う部分 1,000m2 超',
    scope: 'municipal',
    municipalityId: 'shizuoka',
    asOf: ASOF,
    confidence: 'definite',
    sources: [SRC],
    match: (p) => {
      if (!hasUse(p, 'retailStore')) return null;
      const area = p.storeArea > 0 ? p.storeArea : p.totalFloorArea;
      if (area <= 1000) return null;
      return `小売部分 ${m2(area)} が 1,000m2 を超える`;
    },
  },
  {
    id: 'sz-usui',
    category: '静岡市・静岡県の条例等',
    title: '静岡市雨水流出抑制対策要綱',
    law: '静岡市要綱',
    provision: '静岡市雨水流出抑制対策要綱',
    action: '協議',
    authority: '静岡市 河川課 河川係(054-221-1087) / 清水区は土木事務所 工事係(054-354-2247)',
    summary:
      '開発や建築に伴う雨水の流出増を抑えるため、貯留浸透施設の設置を求められる。外構と地下の計画に影響する。',
    threshold: '要綱による(区により窓口が分かれる)',
    scope: 'municipal',
    municipalityId: 'shizuoka',
    asOf: ASOF,
    confidence: 'check',
    sources: [SRC],
    match: (p) =>
      p.siteArea >= 500 ? `敷地面積 ${m2(p.siteArea)}。雨水流出抑制の対象規模と必要貯留量を確認する` : null,
  },
  {
    id: 'sz-chikasui',
    category: '静岡市・静岡県の条例等',
    title: '静岡県地下水の採取に関する条例',
    law: '静岡県条例',
    provision: '静岡県地下水の採取に関する条例',
    action: '許可',
    authority: '静岡市 環境保全課 水質係(054-221-1359)',
    summary: '吐出口の内径が42.2mmを超える井戸を設ける場合が対象。設備計画で井戸を使う場合に確認する。',
    threshold: '吐出口の内径 42.2mm 超の井戸',
    scope: 'municipal',
    municipalityId: 'shizuoka',
    asOf: ASOF,
    confidence: 'check',
    sources: [SRC],
    match: (p) => (hasUse(p, 'factory', 'hotel', 'hospital') ? '井戸の設置予定があるかを確認する' : null),
  },
  {
    id: 'sz-gomi',
    category: '静岡市・静岡県の条例等',
    title: 'ごみ集積所設置の協議',
    law: '静岡市の取扱い',
    provision: '宅地造成及び共同住宅等に係るごみ集積所設置に伴う協議',
    action: '協議',
    authority: '静岡市 収集業務課 適正排出推進係(054-221-1365)',
    summary:
      '共同住宅や宅地造成ではごみ集積所の設置について協議が要る。配置と接道の条件がつくため、外構計画の初期に確認する。',
    threshold: '共同住宅等・宅地造成',
    scope: 'municipal',
    municipalityId: 'shizuoka',
    asOf: ASOF,
    confidence: 'likely',
    sources: [SRC],
    match: (p) => (hasUse(p, 'apartment', 'rowHouse', 'dormitory') ? '共同住宅等を選択している' : null),
  },
  {
    id: 'sz-kyoai',
    category: '静岡市・静岡県の条例等',
    title: '狭あい道路・道路種別の確認',
    law: '建築基準法',
    provision: '法第42条第1項第三号・第四号・第五号、第42条第2項',
    action: '協議',
    authority: '静岡市 土木管理課 狭あい道路係(054-221-1238)',
    summary:
      '道路の種別によってセットバックの要否と後退量が変わる。窓口で直接確認するよう市が明記している項目で、図面上の想定と食い違うことが多い。',
    threshold: '前面道路が3号道路・4号道路・位置指定道路・2項道路のいずれかの場合',
    scope: 'municipal',
    municipalityId: 'shizuoka',
    asOf: ASOF,
    confidence: 'likely',
    sources: [SRC, egovSource('建築基準法')],
    note: 'チェックリストに「用途地域、道路については、間違いを避けるため、各担当窓口で直接確認されるようにお願いします」と明記がある。',
    match: (p) => (isBuilding(p) ? '前面道路の種別と後退の要否を窓口で確認する' : null),
  },
  {
    id: 'sz-hoteigai',
    category: '静岡市・静岡県の条例等',
    title: '敷地内の法定外公共物の用途廃止',
    law: '静岡市の取扱い',
    provision: '法定外公共物の用途廃止',
    action: '協議',
    authority: '静岡市 土木管理課 登記係(054-221-1237)',
    summary:
      '敷地内に里道や水路(法定外公共物)が残っていると、用途廃止と払下げの手続が要る。数か月かかることがあり、確認申請の前提になる。',
    threshold: '敷地内に法定外公共物がある場合',
    scope: 'municipal',
    municipalityId: 'shizuoka',
    asOf: ASOF,
    confidence: 'check',
    sources: [SRC],
    match: (p) => (isBuilding(p) ? '公図で敷地内の里道・水路の有無を確認する' : null),
  },
  {
    id: 'sz-sabo',
    category: '静岡市・静岡県の条例等',
    title: '静岡県砂防指定地管理条例',
    law: '静岡県条例',
    provision: '県砂防指定地管理条例第3条',
    action: '許可',
    authority: '静岡県(土木事務所)',
    summary: '砂防指定地内での行為は制限される。許可に時間がかかるため、造成計画の前に確認する。',
    threshold: '砂防指定地内',
    scope: 'municipal',
    municipalityId: 'shizuoka',
    asOf: ASOF,
    confidence: 'definite',
    sources: [SRC],
    match: (p) => (hasFlag(p, 'erosionControl') ? '砂防指定地内と入力されている' : null),
  },
  {
    id: 'sz-koen',
    category: '静岡市・静岡県の条例等',
    title: '臨港地区の分区における構造物の規制',
    law: '港湾法 / 静岡県条例',
    provision: '静岡県の管理する港湾の臨港地区内の分区における構造物の規制に関する条例',
    action: '適合義務',
    authority: '静岡県(港湾担当)',
    summary: '臨港地区の分区ごとに建てられる構造物が限定される。用途地域とは別の制限。',
    threshold: '臨港地区内',
    scope: 'municipal',
    municipalityId: 'shizuoka',
    asOf: ASOF,
    confidence: 'definite',
    sources: [SRC],
    match: (p) => (hasFlag(p, 'portArea') ? '臨港地区内と入力されている' : null),
  },
  {
    id: 'sz-bunkazai-meisho',
    category: '静岡市・静岡県の条例等',
    title: '名勝・史跡の現状変更許可',
    law: '文化財保護法',
    provision: '法第125条第1項',
    action: '許可',
    authority: '静岡市 歴史文化課(名勝三保松原は三保松原文化創造センター 054-340-2100)',
    summary:
      '名勝三保松原、名勝日本平・史跡久能山、史跡片山廃寺跡・史跡小島陣屋跡の区域では現状変更に許可が要る。埋蔵文化財の届出とは別の手続。',
    threshold: '指定された名勝・史跡の区域内',
    scope: 'municipal',
    municipalityId: 'shizuoka',
    asOf: ASOF,
    confidence: 'check',
    sources: [SRC],
    match: (p) =>
      hasFlag(p, 'buriedCulturalProperty') || isBuilding(p)
        ? '名勝・史跡の指定区域(三保・日本平・久能山・片山廃寺跡・小島陣屋跡)に当たるかを確認する'
        : null,
  },
  {
    id: 'sz-jokaso-yoko',
    category: '静岡市・静岡県の条例等',
    title: '静岡市浄化槽取扱要綱',
    law: '浄化槽法 / 静岡市要綱',
    provision: '浄化槽法第7条・第10条の2・第11条、静岡市浄化槽取扱要綱',
    action: '届出',
    authority: '静岡市(浄化槽担当)',
    summary:
      '既存浄化槽を使う場合と使わない場合で必要な届出が違う。使用廃止届の出し忘れが後から問題になる。',
    threshold: '浄化槽を設置または既存浄化槽がある場合',
    scope: 'municipal',
    municipalityId: 'shizuoka',
    asOf: ASOF,
    confidence: 'check',
    sources: [SRC, egovSource('浄化槽法')],
    match: (p) => (isBuilding(p) ? '既存浄化槽の有無と、下水道処理区域内かどうかを確認する' : null),
  },
];

/** 国の法令の窓口を、静岡市の実際の課名・係名・電話番号に差し替える */
const authorityOverrides: Record<string, string> = {
  'cpa-53': '静岡市 都市計画課 都市施設計画係(054-221-1476)',
  'cpa-29-43': '静岡市 都市計画課 開発審査係(054-221-1118)',
  'slope-act': '静岡市 都市計画課 盛土対策係(054-221-1591)',
  'fire-7': '静岡市消防局 査察課 消防同意係(054-280-0144)',
  'fire-11': '静岡市消防局 危険物規制係(054-280-0191)',
  'outdoor-ad': '静岡市 景観まちづくり課 屋外広告物係(054-221-1123)',
  'barrier-free-14': '静岡市 建築安全推進課 審査係(054-221-1259)',
  'beea-tekigou': '静岡市 建築安全推進課 審査係(054-221-1259)',
  'beea-tekihan': '静岡市 建築安全推進課 審査係(054-221-1259)',
  'building-hygiene-5': '静岡市保健所 生活衛生課 生活衛生係(054-249-3155)',
  'medical-7': '静岡市保健所 生活衛生課 医療安全対策係(054-249-3159)',
  'pharma-4': '静岡市保健所 生活衛生課(054-249-3159)',
  'barber-beauty-laundry': '静岡市保健所 生活衛生課 生活衛生係(054-249-3156)',
  'theater-bath': '静岡市保健所 生活衛生課 生活衛生係(054-249-3156)',
  'hotel-3': '静岡市保健所 生活衛生課 生活衛生係(054-249-3156)',
  'dental-lab-21': '静岡市保健所 生活衛生課(054-249-3159)',
  'poison-act': '静岡市保健所 生活衛生課(054-249-3159)',
  'large-retail-5': '静岡市 商業労政課 商業・まちなか活性化係(054-354-2306)',
  'factory-location-6': '静岡市 産業基盤強化本部 立地環境整備係(054-354-2046)',
  'soil-contamination-4': '静岡市 環境保全課 水質係(054-221-1359)',
  'buried-cultural-93': '静岡市 歴史文化課 埋蔵文化財係(054-221-1069)',
  'natural-park': '静岡市 環境共生課 環境影響評価係(054-221-1466)',
  eia: '静岡市 環境共生課 環境影響評価係(054-221-1466)',
  'landscape-16': '静岡市 景観まちづくり課 都市景観推進係(054-221-1049)',
  'river-26': '静岡市 河川課 河川係(054-221-1087) / 清水区は土木事務所 工事係(054-354-2247)',
  'specified-urban-river-30': '静岡市 河川課 河川係(054-221-1087) / 清水区は土木事務所 工事係(054-354-2247)',
  'parking-20': '静岡市 都市計画課',
  'septic-tank': '静岡市(浄化槽担当)',
};

export const SHIZUOKA: MunicipalPack = {
  id: 'shizuoka',
  label: '静岡市',
  sourceLabel: SRC.label,
  sourceUrl: SRC.url,
  asOf: ASOF,
  rules,
  authorityOverrides,
};
