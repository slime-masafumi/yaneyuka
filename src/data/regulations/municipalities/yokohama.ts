import { egovSource } from '../lawSources';
import type { MunicipalPack, RegulationRule } from '../types';
import { COMMERCIAL_ZONES, hasFlag, hasUse, isBuilding, isResidentialZone, m2, usesWith } from './_helpers';

/**
 * 横浜市
 *
 * 一次資料:
 *   建築に関する条例・規則等
 *   https://www.city.yokohama.lg.jp/business/bunyabetsu/kenchiku/tetsuduki/jorei/
 *   横浜市中高層建築物条例
 *   https://www.city.yokohama.lg.jp/business/bunyabetsu/kenchiku/tetsuduki/jorei/chukosojorei/jorei.html
 *   緑化地域制度
 *   https://www.city.yokohama.lg.jp/business/bunyabetsu/kankyo-koen-gesui/kyogi/ryokuka/soan.html
 *   福祉のまちづくり条例
 *   https://www.city.yokohama.lg.jp/business/bunyabetsu/kenchiku/tetsuduki/jorei/machizukuri/barrierfree.html
 *   横浜市建築基準法取扱基準集
 *   https://www.city.yokohama.lg.jp/business/bunyabetsu/kenchiku/tetsuduki/kisoku/toriatsukai.html
 */

const JOREI = {
  label: '横浜市 建築に関する条例・規則等',
  url: 'https://www.city.yokohama.lg.jp/business/bunyabetsu/kenchiku/tetsuduki/jorei/',
};
const CHUKOSO = {
  label: '横浜市中高層建築物条例',
  url: 'https://www.city.yokohama.lg.jp/business/bunyabetsu/kenchiku/tetsuduki/jorei/chukosojorei/jorei.html',
};
const RYOKKA = {
  label: '横浜市 緑化地域制度',
  url: 'https://www.city.yokohama.lg.jp/business/bunyabetsu/kankyo-koen-gesui/kyogi/ryokuka/soan.html',
};
const FUKUSHI = {
  label: '横浜市 福祉のまちづくり条例',
  url: 'https://www.city.yokohama.lg.jp/business/bunyabetsu/kenchiku/tetsuduki/jorei/machizukuri/barrierfree.html',
};
const TORIATSUKAI = {
  label: '横浜市建築基準法取扱基準集',
  url: 'https://www.city.yokohama.lg.jp/business/bunyabetsu/kenchiku/tetsuduki/kisoku/toriatsukai.html',
};
const KIJUN_JOREI = {
  label: '横浜市建築基準条例及び同解説(令和8年5月版)',
  url: 'https://www.city.yokohama.lg.jp/business/bunyabetsu/kenchiku/tetsuduki/jorei/kijunjourei/kijunjourei.files/20260501_joreiall.pdf',
};

const ASOF = '2026-09-05';
const CATEGORY = '横浜市・神奈川県の条例等';

const rules: RegulationRule[] = [
  {
    id: 'yk-chukoso',
    category: CATEGORY,
    title: '横浜市中高層建築物条例',
    law: '横浜市中高層建築物条例',
    provision: '横浜市条例',
    action: '届出',
    authority: '横浜市 建築局建築指導部 情報相談課(045-671-2350)',
    summary:
      '住居系地域では高さ10m超、非住居系地域では高さ15m超が中高層建築物として対象になる。住居系地域では延べ面積1,000m2超の建築物も大規模建築物として対象になる。確認申請の前に敷地に標識を設置して計画を公開し、住民に説明する手続が要る。標識は市政刊行物販売コーナーまたは神奈川県建築士会で購入する。',
    threshold: '住居系: 高さ 10m 超 / 非住居系: 高さ 15m 超 / 住居系で延べ面積 1,000m2 超',
    scope: 'municipal',
    municipalityId: 'yokohama',
    asOf: ASOF,
    confidence: 'definite',
    sources: [CHUKOSO],
    match: (p) => {
      if (!isBuilding(p)) return null;
      const residential = isResidentialZone(p);
      const limit = residential ? 10 : 15;
      if (p.maxHeight > limit) {
        return `最高高さ ${p.maxHeight}m が ${residential ? '住居系の' : '非住居系の'}基準 ${limit}m を超える`;
      }
      if (residential && p.totalFloorArea > 1000) {
        return `住居系地域で延べ面積 ${m2(p.totalFloorArea)} が 1,000m2 を超える(大規模建築物として対象)`;
      }
      return null;
    },
  },
  {
    id: 'yk-ryokka-chiiki',
    category: CATEGORY,
    title: '緑化地域制度',
    law: '都市緑地法 / 横浜市緑の環境をつくり育てる条例',
    provision: '都市緑地法第34条・第35条',
    action: '適合義務',
    authority: '横浜市 みどり環境局 公園緑地管理課',
    summary:
      '緑化地域内で敷地500m2以上の建築物の新築・増築を行う場合、緑化率の最低限度を満たす必要がある。住居系用途地域は10%以上、商業系用途地域は5%以上。外構の面積配分が確定するので、配置計画の前提になる。',
    threshold: '緑化地域内 かつ 敷地 500m2 以上（住居系: 緑化率10%以上 / 商業系: 5%以上）',
    scope: 'municipal',
    municipalityId: 'yokohama',
    asOf: ASOF,
    confidence: 'likely',
    sources: [RYOKKA, egovSource('都市緑地法')],
    note: '緑化地域の指定範囲は住居系用途地域と商業系用途地域。指定の有無は所在地で確認する。',
    match: (p) => {
      if (!isBuilding(p)) return null;
      if (p.siteArea < 500) return null;
      const residential = isResidentialZone(p);
      const commercial = COMMERCIAL_ZONES.includes(p.zoning);
      if (!residential && !commercial && p.zoning !== '未選択') return null;
      const rate = commercial ? '5%以上' : '10%以上';
      return `敷地面積 ${m2(p.siteArea)} が 500m2 以上。緑化地域内なら緑化率 ${rate}`;
    },
  },
  {
    id: 'yk-ryokka-kyogi',
    category: CATEGORY,
    title: '緑化協議(緑の環境をつくり育てる条例)',
    law: '横浜市緑の環境をつくり育てる条例',
    provision: '条例第9条',
    action: '協議',
    authority: '横浜市 みどり環境局 公園緑地管理課',
    summary:
      '市内全域で緑化協議が要る。緑化地域内では緑化地域制度の手続を行うことで協議を省略できる場合がある。',
    threshold: '市内全域(緑化地域内は緑化地域制度の手続で代替できる場合あり)',
    scope: 'municipal',
    municipalityId: 'yokohama',
    asOf: ASOF,
    confidence: 'check',
    sources: [RYOKKA],
    match: (p) => (isBuilding(p) ? '市内全域が対象。緑化地域内かどうかで手続が変わるため確認する' : null),
  },
  {
    id: 'yk-fukushi',
    category: CATEGORY,
    title: '横浜市福祉のまちづくり条例',
    law: '横浜市福祉のまちづくり条例',
    provision: 'バリアフリー法第14条第3項に基づく条例',
    action: '適合義務',
    authority: '横浜市 建築局建築指導部',
    summary:
      'バリアフリー法の特別特定建築物に用途を追加し、基準適合義務の規模を引き下げている。共同住宅は延べ面積2,000m2以上で整備基準への適合が義務になり、建築確認の対象になる。1,000m2以上は努力規定。国のバリアフリー法だけを見ていると漏れる。',
    threshold: '条例による上乗せ(共同住宅は 2,000m2 以上で義務、1,000m2 以上は努力)',
    scope: 'municipal',
    municipalityId: 'yokohama',
    asOf: ASOF,
    confidence: 'likely',
    sources: [FUKUSHI, egovSource('バリアフリー法')],
    note: '条例で付加した事項は、市長の許可により適用を除外できる場合がある。',
    match: (p) => {
      if (!isBuilding(p)) return null;
      if (hasUse(p, 'apartment')) {
        if (p.totalFloorArea >= 2000) {
          return `共同住宅で延べ面積 ${m2(p.totalFloorArea)} が 2,000m2 以上(建築確認の対象になる義務規定)`;
        }
        if (p.totalFloorArea >= 1000) {
          return `共同住宅で延べ面積 ${m2(p.totalFloorArea)} が 1,000m2 以上(努力規定)`;
        }
      }
      const targets = usesWith(p, 'barrierFreeSpecial');
      if (targets.length === 0) return null;
      return `不特定多数が利用する用途(${targets.join('・')})を含む。条例による用途追加と規模引き下げを確認する`;
    },
  },
  {
    id: 'yk-kijun-jorei',
    category: CATEGORY,
    title: '横浜市建築基準条例',
    law: '横浜市建築基準条例',
    provision: '横浜市条例',
    action: '適合義務',
    authority: '横浜市 建築局建築指導部',
    summary:
      '建築基準法が条例に委任している事項について、特殊建築物の敷地・構造・設備の制限を定める。解説つきの冊子が公開されており、令和8年5月版が最新。',
    threshold: '条例による(特殊建築物の用途と規模で決まる)',
    scope: 'municipal',
    municipalityId: 'yokohama',
    asOf: ASOF,
    confidence: 'check',
    sources: [KIJUN_JOREI, JOREI],
    match: (p) => {
      const special = usesWith(p, 'specialBuilding');
      if (special.length === 0) return null;
      return `特殊建築物に当たりうる用途(${special.join('・')})を含む。条例の付加規定を確認する`;
    },
  },
  {
    id: 'yk-toriatsukai',
    category: CATEGORY,
    title: '横浜市建築基準法取扱基準集',
    law: '横浜市の取扱い',
    provision: '横浜市建築基準法取扱基準集',
    action: '適合義務',
    authority: '横浜市 建築局建築指導部',
    summary:
      '面積や高さの算定、道路の扱いなど、法文だけでは決まらない部分の市の解釈をまとめたもの。他の特定行政庁とは違う扱いになる項目があるため、設計初期に該当箇所を押さえる。',
    threshold: '取扱基準集による',
    scope: 'municipal',
    municipalityId: 'yokohama',
    asOf: ASOF,
    confidence: 'check',
    sources: [TORIATSUKAI],
    note: 'この取扱いは横浜市で確認申請を受ける場合の基準。指定確認検査機関に申請する場合は、その機関にも確認すること。',
    match: (p) => (isBuilding(p) ? '面積・高さ・階数の算定と道路の扱いについて、市の取扱基準を確認する' : null),
  },
  {
    id: 'yk-chikashitsu',
    category: CATEGORY,
    title: '地下室マンション条例',
    law: '横浜市斜面地における建築物の制限に関する条例',
    provision: '横浜市条例',
    action: '適合義務',
    authority: '横浜市 建築局建築指導部',
    summary:
      '斜面地に建つ建築物で、地盤面下にある階の扱いに制限がかかる。斜面地の共同住宅では想定していた住戸数が成立しなくなることがある。',
    threshold: '斜面地の建築物(地階を有する共同住宅等)',
    scope: 'municipal',
    municipalityId: 'yokohama',
    asOf: ASOF,
    confidence: 'check',
    sources: [JOREI],
    match: (p) => {
      if (p.floorsBelow <= 0) return null;
      return `地下 ${p.floorsBelow} 階を計画している。斜面地なら条例の対象になるか確認する`;
    },
  },
  {
    id: 'yk-funenka',
    category: CATEGORY,
    title: '不燃化推進条例',
    law: '横浜市不燃化推進地域における建築物の制限に関する条例',
    provision: '横浜市条例',
    action: '適合義務',
    authority: '横浜市 建築局建築指導部',
    summary: '不燃化推進地域では、防火地域・準防火地域の指定とは別に建築物の構造の制限が上乗せされる。',
    threshold: '不燃化推進地域内',
    scope: 'municipal',
    municipalityId: 'yokohama',
    asOf: ASOF,
    confidence: 'check',
    sources: [JOREI],
    match: (p) => (isBuilding(p) ? '不燃化推進地域の指定の有無を確認する' : null),
  },
  {
    id: 'yk-tokubetsu-yoto',
    category: CATEGORY,
    title: '特別用途地区の建築条例',
    law: '横浜市特別工業地区建築条例 / 横浜都心機能誘導地区建築条例 / 横浜生活利便機能誘導低層住居地区建築条例',
    provision: '建築基準法第49条に基づく条例',
    action: '適合義務',
    authority: '横浜市 建築局建築指導部',
    summary:
      '特別用途地区の指定があると、用途地域による制限に上乗せまたは緩和がかかる。用途地域だけを見て判断すると計画が通らない。',
    threshold: '特別工業地区・都心機能誘導地区・生活利便機能誘導低層住居地区の指定区域内',
    scope: 'municipal',
    municipalityId: 'yokohama',
    asOf: ASOF,
    confidence: 'check',
    sources: [JOREI, egovSource('建築基準法')],
    match: (p) => (p.useIds.length > 0 ? '所在地に特別用途地区の指定があるかを確認する' : null),
  },
  {
    id: 'yk-chiku-keikaku',
    category: CATEGORY,
    title: '地区計画条例',
    law: '横浜市地区計画の区域内における建築物等の制限に関する条例',
    provision: '横浜市条例(建築基準法第68条の2)',
    action: '適合義務',
    authority: '横浜市 建築局建築指導部',
    summary: '地区整備計画の内容が条例により建築基準法の制限になる。区域ごとに内容が全く違う。',
    threshold: '地区計画等の区域内',
    scope: 'municipal',
    municipalityId: 'yokohama',
    asOf: ASOF,
    confidence: 'definite',
    sources: [JOREI],
    match: (p) => (hasFlag(p, 'districtPlan') ? '地区計画等の区域内と入力されている' : null),
  },
  {
    id: 'yk-chushajo',
    category: CATEGORY,
    title: '横浜市駐車場条例',
    law: '横浜市駐車場条例',
    provision: '横浜市条例(駐車場法第20条)',
    action: '適合義務',
    authority: '横浜市 建築局建築指導部',
    summary: '駐車場整備地区等で駐車施設の附置義務がかかる。必要台数が平面計画に直結する。',
    threshold: '条例による(用途地域と延べ面積で決まる)',
    scope: 'municipal',
    municipalityId: 'yokohama',
    asOf: ASOF,
    confidence: 'check',
    sources: [JOREI],
    match: (p) => {
      const target = ['商業地域', '近隣商業地域', '準工業地域'].includes(p.zoning);
      if (!target && p.totalFloorArea < 1000) return null;
      return `${p.zoning} / 延べ面積 ${m2(p.totalFloorArea)}。附置義務の区域と必要台数を確認する`;
    },
  },
  {
    id: 'yk-gake',
    category: CATEGORY,
    title: 'がけ関係小規模建築物技術指針',
    law: '横浜市がけ関係小規模建築物技術指針',
    provision: '横浜市指針',
    action: '協議',
    authority: '横浜市 建築局建築指導部',
    summary:
      'がけに近接する小規模建築物の安全確保について市の技術指針がある。横浜は斜面地が多く、擁壁の扱いで計画が変わる。',
    threshold: 'がけに近接する敷地',
    scope: 'municipal',
    municipalityId: 'yokohama',
    asOf: ASOF,
    confidence: 'check',
    sources: [JOREI],
    match: (p) =>
      hasFlag(p, 'landslide') || hasFlag(p, 'soilRegulationArea')
        ? 'がけ・傾斜地に関する入力がある。技術指針の適用を確認する'
        : null,
  },
  {
    id: 'yk-hikage',
    category: CATEGORY,
    title: '日影規制の取扱い',
    law: '建築基準法 / 横浜市の取扱い',
    provision: '法第56条の2、横浜市の取扱い',
    action: '適合義務',
    authority: '横浜市 建築局建築指導部',
    summary: '日影規制の測定方法や複数敷地の扱いについて市の取扱いがある。計算の前提が変わると高さが変わる。',
    threshold: '日影規制の対象区域内',
    scope: 'municipal',
    municipalityId: 'yokohama',
    asOf: ASOF,
    confidence: 'check',
    sources: [JOREI, egovSource('建築基準法')],
    match: (p) => (p.maxHeight > 10 ? `最高高さ ${p.maxHeight}m。日影規制の対象と市の取扱いを確認する` : null),
  },
  {
    id: 'yk-kaihatsu-chosei',
    category: CATEGORY,
    title: '横浜市開発事業等の調整等に関する条例',
    law: '横浜市開発事業等の調整等に関する条例',
    provision: '横浜市条例',
    action: '協議',
    authority: '横浜市 建築局',
    summary:
      '一定規模以上の開発事業では、公共施設の整備や緑化について事前に協議が要る。協議に期間がかかるため工程の起点になる。',
    threshold: '条例で定める規模以上の開発事業',
    scope: 'municipal',
    municipalityId: 'yokohama',
    asOf: ASOF,
    confidence: 'check',
    sources: [RYOKKA, JOREI],
    match: (p) => (p.siteArea >= 500 ? `敷地面積 ${m2(p.siteArea)}。開発事業として条例の対象になるか確認する` : null),
  },
];

/** 国の法令の窓口を、横浜市の実際の所管に差し替える */
const authorityOverrides: Record<string, string> = {
  'barrier-free-14': '横浜市 建築局建築指導部(福祉のまちづくり条例により上乗せあり)',
  'green-area': '横浜市 みどり環境局 公園緑地管理課',
  'parking-20': '横浜市 建築局建築指導部(横浜市駐車場条例)',
  'cpa-68-2': '横浜市 建築局建築指導部(横浜市地区計画条例)',
};

export const YOKOHAMA: MunicipalPack = {
  id: 'yokohama',
  label: '横浜市',
  sourceLabel: '横浜市 建築に関する条例・規則等ほか市公開資料',
  sourceUrl: JOREI.url,
  asOf: ASOF,
  rules,
  authorityOverrides,
};

export const YOKOHAMA_CATEGORY = CATEGORY;
