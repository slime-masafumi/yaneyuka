import { egovSource } from '../lawSources';
import type { MunicipalPack, RegulationRule } from '../types';
import { hasFlag, hasUse, isBuilding, m2 } from './_helpers';

/**
 * 札幌市
 *
 * 一次資料:
 *   (様式-8)建築基準関係規定チェックリスト 令和6年9月更新 / 札幌市都市局建築指導部
 *   https://www.city.sapporo.jp/toshi/k-shido/jourei/documents/kankeikitei-cl_r06.pdf
 *   条例・要綱・取扱様式
 *   https://www.city.sapporo.jp/toshi/k-shido/jourei/jourei-top.html
 *   中高層建築物の建築に係る紛争予防条例
 *   https://www.city.sapporo.jp/toshi/k-shido/chukousou/chukousou-top.html
 *   緑保全創出地域制度(札幌市緑の保全と創出に関する条例)
 *   https://www.city.sapporo.jp/ryokuka/midori/kisei/hozensyousai/hozensyousai.html
 */

const CHECKLIST = {
  label: '札幌市 建築基準関係規定チェックリスト(令和6年9月更新)',
  url: 'https://www.city.sapporo.jp/toshi/k-shido/jourei/documents/kankeikitei-cl_r06.pdf',
};
const JOREI = {
  label: '札幌市 条例・要綱・取扱様式',
  url: 'https://www.city.sapporo.jp/toshi/k-shido/jourei/jourei-top.html',
};
const CHUKOSO = {
  label: '札幌市 中高層建築物の建築に係る紛争予防条例',
  url: 'https://www.city.sapporo.jp/toshi/k-shido/chukousou/chukousou-top.html',
};
const MIDORI = {
  label: '札幌市 緑保全創出地域制度',
  url: 'https://www.city.sapporo.jp/ryokuka/midori/kisei/hozensyousai/hozensyousai.html',
};

const ASOF = '2026-09-05';
const CATEGORY = '札幌市・北海道の条例等';

/** 中高層条例で15m基準になる用途地域 */
const HIGH_LIMIT_ZONES = ['商業地域', '工業専用地域'];

const rules: RegulationRule[] = [
  {
    id: 'sp-chukoso',
    category: CATEGORY,
    title: '中高層建築物の紛争予防と調整に関する条例',
    law: '札幌市中高層建築物の建築に係る紛争の予防と調整に関する条例',
    provision: '札幌市条例(平成12年9月1日施行)',
    action: '届出',
    authority: '札幌市 都市局建築指導部 建築安全推進課(011-211-2867)',
    summary:
      '原則として高さ10mを超える建築物が対象。商業地域と工業専用地域では15m超が基準になる。近隣関係住民への建築計画の事前公開と説明の手続があり、敷地境界から10m未満の近接住民への説明が必須となる用途地域もある。説明期間が確認申請前の工程に乗る。',
    threshold: '高さ 10m 超(商業地域・工業専用地域は 15m 超)',
    scope: 'municipal',
    municipalityId: 'sapporo',
    asOf: ASOF,
    confidence: 'definite',
    sources: [CHUKOSO],
    note: '説明を要する近隣関係住民の範囲は用途地域により異なる。手続の手引きで対象範囲を確認すること。',
    match: (p) => {
      if (!isBuilding(p)) return null;
      const high = HIGH_LIMIT_ZONES.includes(p.zoning);
      const limit = high ? 15 : 10;
      if (p.maxHeight <= limit) return null;
      return `最高高さ ${p.maxHeight}m が ${high ? `${p.zoning}の` : ''}基準 ${limit}m を超える`;
    },
  },
  {
    id: 'sp-midori',
    category: CATEGORY,
    title: '緑保全創出地域制度',
    law: '札幌市緑の保全と創出に関する条例',
    provision: '札幌市条例',
    action: '許可',
    authority: '札幌市 建設局みどりの推進部 みどりの管理課(011-211-2522)',
    summary:
      '市内全域が山岳・里山・里地・居住系市街地・業務系市街地の5地域に区分され、敷地1,000m2以上で建築・工作物の建設・宅地造成・樹木の伐採を行う場合は市長の許可が要る。居住系市街地は緑化率20%以上、業務系市街地は10%以上が条件になるため、外構の面積配分が先に決まる。',
    threshold: '敷地 1,000m2 以上（居住系市街地: 緑化率20%以上 / 業務系市街地: 10%以上）',
    scope: 'municipal',
    municipalityId: 'sapporo',
    asOf: ASOF,
    confidence: 'definite',
    sources: [MIDORI],
    note: '山岳地域・里山地域・里地地域では樹林地率や緑地率の基準になり、面積規模により20%から70%まで変わる。',
    match: (p) => {
      if (!isBuilding(p) && !hasFlag(p, 'soilRegulationArea')) return null;
      if (p.siteArea < 1000) return null;
      return `敷地面積 ${m2(p.siteArea)} が 1,000m2 以上`;
    },
  },
  {
    id: 'sp-sekou-jorei',
    category: CATEGORY,
    title: '札幌市建築基準法施行条例',
    law: '札幌市建築基準法施行条例',
    provision: '札幌市条例',
    action: '適合義務',
    authority: '札幌市 都市局建築指導部 建築確認課',
    summary:
      '建築基準法が条例に委任している事項を定める。積雪寒冷地であるため、雪に関する規定を含めて内容を確認する必要がある。',
    threshold: '条例による',
    scope: 'municipal',
    municipalityId: 'sapporo',
    asOf: ASOF,
    confidence: 'check',
    sources: [JOREI, egovSource('建築基準法')],
    match: (p) => (isBuilding(p) ? '施行条例の適用範囲(特殊建築物の制限・雪に関する規定等)を確認する' : null),
  },
  {
    id: 'sp-chiku-keikaku-jorei',
    category: CATEGORY,
    title: '地区計画の区域内における建築物の制限に関する条例',
    law: '札幌市地区計画の区域内における建築物の制限に関する条例',
    provision: '札幌市条例',
    action: '適合義務',
    authority: '札幌市 都市局建築指導部 建築確認課',
    summary: '地区整備計画の内容が条例により建築基準法の制限になる。区域ごとに内容が違う。',
    threshold: '地区計画等の区域内',
    scope: 'municipal',
    municipalityId: 'sapporo',
    asOf: ASOF,
    confidence: 'definite',
    sources: [JOREI],
    match: (p) => (hasFlag(p, 'districtPlan') ? '地区計画等の区域内と入力されている' : null),
  },
  {
    id: 'sp-chushajo',
    category: CATEGORY,
    title: '建築物における駐車施設の附置等に関する条例',
    law: '札幌市建築物における駐車施設の附置等に関する条例',
    provision: '札幌市条例(駐車場法第20条)',
    action: '適合義務',
    authority: '札幌市 都市局建築指導部 建築安全推進課(011-211-2867)',
    summary: '駐車場整備地区等で駐車施設の附置義務がかかる。必要台数が平面計画に直結する。',
    threshold: '条例による(用途地域と延べ面積で決まる)',
    scope: 'municipal',
    municipalityId: 'sapporo',
    asOf: ASOF,
    confidence: 'check',
    sources: [CHECKLIST, JOREI],
    match: (p) => {
      const target = ['商業地域', '近隣商業地域', '準工業地域'].includes(p.zoning);
      if (!target && p.totalFloorArea < 1000) return null;
      return `${p.zoning} / 延べ面積 ${m2(p.totalFloorArea)}。附置義務の区域と必要台数を確認する`;
    },
  },
  {
    id: 'sp-chuurinjo',
    category: CATEGORY,
    title: '自転車等駐車場の設置等に関する条例',
    law: '札幌市自転車等駐車場の設置等に関する条例',
    provision: '札幌市条例(自転車法第5条)',
    action: '適合義務',
    authority: '札幌市 都市局建築指導部 建築安全推進課(011-211-2867)',
    summary: '一定の用途と規模の建築物に駐輪場の設置義務がかかる。駐車場とは別枠で面積が要る。',
    threshold: '条例による',
    scope: 'municipal',
    municipalityId: 'sapporo',
    asOf: ASOF,
    confidence: 'check',
    sources: [CHECKLIST, JOREI],
    match: (p) =>
      hasUse(p, 'retailStore', 'restaurant', 'amusement', 'office', 'apartment')
        ? `用途と延べ面積 ${m2(p.totalFloorArea)} から、駐輪場の設置義務を確認する`
        : null,
  },
  {
    id: 'sp-oneroom',
    category: CATEGORY,
    title: 'ワンルーム形式集合住宅に関する建築指導要綱',
    law: '札幌市ワンルーム形式集合住宅に関する建築指導要綱',
    provision: '札幌市要綱',
    action: '協議',
    authority: '札幌市 都市局建築指導部 建築安全推進課(011-211-2867)',
    summary:
      'ワンルーム形式の集合住宅には、住戸規模・管理人室・ごみ置場・駐輪場等について要綱の指導が入る。住戸数の想定が変わることがある。',
    threshold: 'ワンルーム形式の集合住宅',
    scope: 'municipal',
    municipalityId: 'sapporo',
    asOf: ASOF,
    confidence: 'check',
    sources: [JOREI],
    match: (p) => (hasUse(p, 'apartment', 'dormitory') ? '共同住宅・寄宿舎を選択している。ワンルーム形式なら要綱の対象' : null),
  },
  {
    id: 'sp-kyodo-parking',
    category: CATEGORY,
    title: '共同住宅等における駐車施設の設置に関する指導要綱',
    law: '札幌市共同住宅等における駐車施設の設置に関する指導要綱',
    provision: '札幌市要綱',
    action: '協議',
    authority: '札幌市 都市局建築指導部 建築安全推進課(011-211-2867)',
    summary: '共同住宅では住戸数に応じた駐車台数の指導がある。積雪期の除排雪スペースも含めて敷地計画に影響する。',
    threshold: '共同住宅等',
    scope: 'municipal',
    municipalityId: 'sapporo',
    asOf: ASOF,
    confidence: 'likely',
    sources: [JOREI],
    match: (p) => (hasUse(p, 'apartment', 'rowHouse', 'dormitory') ? '共同住宅等を選択している' : null),
  },
  {
    id: 'sp-ryutsu',
    category: CATEGORY,
    title: '流通業務地区内の規制',
    law: '流通業務市街地の整備に関する法律',
    provision: '法第5条第1項',
    action: '適合義務',
    authority: '札幌市 まちづくり政策局 都市計画課(011-211-2506)',
    summary: '流通業務地区内では建てられる施設が限定される。用途地域とは別の制限で、物流施設以外は原則建てられない。',
    threshold: '流通業務地区内',
    scope: 'municipal',
    municipalityId: 'sapporo',
    asOf: ASOF,
    confidence: 'check',
    sources: [CHECKLIST],
    match: (p) => (hasUse(p, 'warehouse', 'factory') ? '倉庫・工場を選択している。流通業務地区の指定の有無を確認する' : null),
  },
  {
    id: 'sp-douro-ichi',
    category: CATEGORY,
    title: '道路位置指定申請指導要綱',
    law: '札幌市道路位置指定申請指導要綱',
    provision: '札幌市要綱(建築基準法第42条第1項第五号)',
    action: '協議',
    authority: '札幌市 都市局建築指導部 建築安全推進課(011-211-2867)',
    summary: '位置指定道路を新設または変更する場合の手続。確認申請の前提になるため工程の起点になる。',
    threshold: '位置指定道路を新設・変更する場合',
    scope: 'municipal',
    municipalityId: 'sapporo',
    asOf: ASOF,
    confidence: 'check',
    sources: [JOREI, egovSource('建築基準法')],
    match: (p) => (isBuilding(p) ? '前面道路の種別を確認し、位置指定が要る計画かどうかを判断する' : null),
  },
  {
    id: 'sp-sogo-sekkei',
    category: CATEGORY,
    title: '総合設計制度の許可取扱要綱',
    law: '札幌市総合設計制度許可取扱要綱(一般型・マンション再生型・長期優良住宅型・拠点型・都心まちづくり支援型)',
    provision: '札幌市要綱(建築基準法第59条の2)',
    action: '許可',
    authority: '札幌市 都市局建築指導部 建築安全推進課(011-211-2867)',
    summary:
      '公開空地を設けることで容積率や高さの制限を緩和できる。5種類の型があり、計画の性格により選ぶ。許可に時間がかかるので基本計画の段階で判断する。',
    threshold: '総合設計制度を使う場合',
    scope: 'municipal',
    municipalityId: 'sapporo',
    asOf: ASOF,
    confidence: 'check',
    sources: [JOREI, egovSource('建築基準法')],
    match: (p) => {
      if (!isBuilding(p)) return null;
      if (p.siteArea < 1000 && p.totalFloorArea < 3000) return null;
      return `敷地 ${m2(p.siteArea)} / 延べ ${m2(p.totalFloorArea)}。総合設計制度による緩和の適用可否を検討できる規模`;
    },
  },
];

/** 国の法令の窓口を、札幌市の実際の課名・係名・電話番号に差し替える */
const authorityOverrides: Record<string, string> = {
  'fire-7': '札幌市消防局 予防部予防課(011-215-2040) ※1,000m2以下は各区消防署予防課',
  'fire-17': '札幌市消防局 予防部予防課(011-215-2040) ※1,000m2以下は各区消防署予防課',
  'fire-11': '札幌市消防局 予防部査察規制課(011-215-2050)',
  'gas-acts': '札幌市消防局 予防部査察規制課(011-215-2050)',
  'outdoor-ad': '札幌市 各区土木センター維持管理課',
  'parking-20': '札幌市 都市局建築指導部 建築安全推進課(011-211-2867)',
  'slope-act': '札幌市 都市局 開発指導課(011-211-2512)',
  'cpa-29-43': '札幌市 都市局 開発指導課(011-211-2512)',
  'cpa-53':
    '札幌市 都市局 開発指導課(011-211-2512) / 都市計画道路は交通計画課(011-211-2275) / 土地区画整理は区画整理事業課(011-211-2657)',
  'septic-tank': '札幌市 環境局 事業廃棄物課(011-211-2927)',
  'barrier-free-14': '札幌市 都市局建築指導部 建築安全推進課(011-211-2867)',
  'beea-tekigou': '札幌市 都市局 建築確認課 設備確認担当係(011-211-2846)',
  'beea-tekihan': '札幌市 都市局 建築確認課 設備確認担当係(011-211-2846)',
  'green-area': '札幌市 建設局みどりの推進部 みどりの管理課(011-211-2522)',
};

export const SAPPORO: MunicipalPack = {
  id: 'sapporo',
  label: '札幌市',
  sourceLabel: '札幌市 建築基準関係規定チェックリスト(令和6年9月更新)ほか市公開資料',
  sourceUrl: CHECKLIST.url,
  asOf: ASOF,
  rules,
  authorityOverrides,
};

export const SAPPORO_CATEGORY = CATEGORY;
