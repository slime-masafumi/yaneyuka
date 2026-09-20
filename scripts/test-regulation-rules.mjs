/**
 * 対象法令チェックの判定ルールの回帰テスト
 *
 *   node scripts/test-regulation-rules.mjs
 *
 * 閾値の境界（超 と 以上 の違い、用途地域による切り替え、自治体レイヤーの
 * 出し分け）を実データで固定する。ここが崩れると調査項目の抜けに直結するので、
 * ルールを触ったら必ず実行する。
 *
 * 判定モジュールは TypeScript なので、一時ディレクトリに CommonJS で
 * 吐き出してから読み込んでいる。
 */

import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.tmp-regtest');
const srcDir = 'src/data/regulations';

const SOURCES = [
  `${srcDir}/types.ts`,
  `${srcDir}/lawSources.ts`,
  `${srcDir}/options.ts`,
  `${srcDir}/nationalRules.ts`,
  `${srcDir}/municipalities/_helpers.ts`,
  `${srcDir}/municipalities/shizuoka.ts`,
  `${srcDir}/municipalities/sapporo.ts`,
  `${srcDir}/municipalities/yokohama.ts`,
  `${srcDir}/municipalities/index.ts`,
];

fs.rmSync(outDir, { recursive: true, force: true });
execSync(
  `npx tsc ${SOURCES.join(' ')} --outDir ${JSON.stringify(outDir)} --rootDir ${srcDir} ` +
    '--module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node',
  { cwd: root, stdio: 'inherit' }
);

const require = createRequire(import.meta.url);
const { NATIONAL_RULES } = require(path.join(outDir, 'nationalRules.js'));
const { PACKS, getMunicipalRules, getAuthorityOverrides } = require(path.join(outDir, 'municipalities', 'index.js'));

const BASE = {
  municipalityId: 'shizuoka',
  workTypes: ['new'],
  useIds: [],
  totalFloorArea: 0,
  buildingArea: 0,
  siteArea: 0,
  floorsAbove: 1,
  floorsBelow: 0,
  maxHeight: 0,
  structure: 'wood',
  zoning: '未選択',
  inCityPlanningArea: true,
  urbanizationControlArea: false,
  storeArea: 0,
  contractAmountManYen: 0,
  formChangeArea: 0,
  demolitionArea: 0,
  siteFlags: [],
};

const p = (over) => ({ ...BASE, ...over });

/** 入力に対して該当したルールIDの集合を返す */
function hitIds(input) {
  const rules = [...NATIONAL_RULES, ...getMunicipalRules(input.municipalityId)];
  const ids = new Set();
  for (const r of rules) {
    if (r.match(input)) ids.add(r.id);
  }
  return ids;
}

let pass = 0;
let fail = 0;
const failures = [];

/** name: 説明 / input / expect: 該当すべきID / reject: 該当してはいけないID */
function check(name, input, expect = [], reject = []) {
  const ids = hitIds(input);
  const missing = expect.filter((id) => !ids.has(id));
  const unexpected = reject.filter((id) => ids.has(id));
  if (missing.length === 0 && unexpected.length === 0) {
    pass += 1;
    return;
  }
  fail += 1;
  failures.push(
    `  x ${name}\n` +
      (missing.length ? `      出るはずが出ていない: ${missing.join(', ')}\n` : '') +
      (unexpected.length ? `      出てはいけないのに出た: ${unexpected.join(', ')}\n` : '')
  );
}

function ok(name, condition, detail = '') {
  if (condition) {
    pass += 1;
    return;
  }
  fail += 1;
  failures.push(`  x ${name}${detail ? `\n      ${detail}` : ''}\n`);
}

// ===========================================================================
// 全国共通レイヤー
// ===========================================================================

// --- 建築確認の号の切り分け（令和7年4月施行の再編） ---------------------------
check(
  '木造平屋100m2の戸建は新3号、新2号ではない',
  p({ useIds: ['detachedHouse'], totalFloorArea: 100, floorsAbove: 1, maxHeight: 5 }),
  ['bsl-6-1-3', 'beea-tekigou'],
  ['bsl-6-1-2', 'bsl-6-1-1']
);
check(
  '木造2階120m2の戸建は新2号、新3号ではない',
  p({ useIds: ['detachedHouse'], totalFloorArea: 120, floorsAbove: 2, maxHeight: 7 }),
  ['bsl-6-1-2'],
  ['bsl-6-1-3']
);
check(
  '都市計画区域外の木造平屋100m2は確認申請の号がどれも立たない',
  p({ useIds: ['detachedHouse'], totalFloorArea: 100, floorsAbove: 1, inCityPlanningArea: false }),
  [],
  ['bsl-6-1-1', 'bsl-6-1-2', 'bsl-6-1-3']
);
check(
  '特殊建築物で用途部分200m2超は一号',
  p({ useIds: ['apartment'], totalFloorArea: 300, floorsAbove: 2 }),
  ['bsl-6-1-1', 'bsl-6-1-2']
);
check(
  '特殊建築物でも200m2ちょうどなら一号は立たない',
  p({ useIds: ['apartment'], totalFloorArea: 200, floorsAbove: 2 }),
  ['bsl-6-1-2'],
  ['bsl-6-1-1']
);

// --- 高さで効く国の法令（31m超 / 60m以上） ------------------------------------
check(
  '高さ31.5mは電波法と労働安全衛生法88条に該当',
  p({ useIds: ['office'], totalFloorArea: 8000, floorsAbove: 9, maxHeight: 31.5, structure: 'rc' }),
  ['radio-102-3', 'osha-88']
);
check(
  '高さ31.0mちょうどは「超」ではないので該当しない',
  p({ useIds: ['office'], totalFloorArea: 8000, floorsAbove: 9, maxHeight: 31, structure: 'rc' }),
  [],
  ['radio-102-3', 'osha-88']
);
check(
  '高さ60mは航空障害灯の対象',
  p({ useIds: ['office'], totalFloorArea: 20000, floorsAbove: 15, maxHeight: 60, structure: 'rc' }),
  ['aviation-51']
);

// --- 店舗面積（1,000m2「超」） ------------------------------------------------
check(
  '店舗面積1,200m2は大店立地法と静岡市商業環境条例に該当',
  p({ useIds: ['retailStore'], storeArea: 1200, totalFloorArea: 1800, floorsAbove: 2 }),
  ['large-retail-5', 'sz-shogyo-kankyo']
);
check(
  '店舗面積1,000m2ちょうどは該当しない',
  p({ useIds: ['retailStore'], storeArea: 1000, totalFloorArea: 1800, floorsAbove: 2 }),
  [],
  ['large-retail-5', 'sz-shogyo-kankyo']
);

// --- 建築物衛生法（学校だけ8,000m2） -----------------------------------------
check(
  '学校5,000m2は建築物衛生法に該当しない（学校の基準は8,000m2）',
  p({ useIds: ['school'], totalFloorArea: 5000, floorsAbove: 3 }),
  [],
  ['building-hygiene-5']
);
check('学校8,000m2は建築物衛生法に該当', p({ useIds: ['school'], totalFloorArea: 8000, floorsAbove: 3 }), [
  'building-hygiene-5',
]);
check('事務所3,000m2は建築物衛生法に該当', p({ useIds: ['office'], totalFloorArea: 3000, floorsAbove: 3 }), [
  'building-hygiene-5',
]);

// --- 工場立地法（敷地9,000m2以上 または 建築面積3,000m2以上） -----------------
check(
  '工場で敷地9,000m2は工場立地法に該当',
  p({ useIds: ['factory'], siteArea: 9000, buildingArea: 2000, totalFloorArea: 2000, floorsAbove: 1 }),
  ['factory-location-6']
);
check(
  '工場でも敷地8,000m2・建築面積2,000m2なら該当しない',
  p({ useIds: ['factory'], siteArea: 8000, buildingArea: 2000, totalFloorArea: 2000, floorsAbove: 1 }),
  [],
  ['factory-location-6']
);

// --- 建設リサイクル法 --------------------------------------------------------
check('解体80m2は建設リサイクル法に該当', p({ workTypes: ['demolition'], demolitionArea: 80 }), [
  'construction-recycle-10',
]);
check('解体79m2は該当しない', p({ workTypes: ['demolition'], demolitionArea: 79 }), [], ['construction-recycle-10']);
check('新築500m2は建設リサイクル法に該当', p({ useIds: ['office'], totalFloorArea: 500, floorsAbove: 2 }), [
  'construction-recycle-10',
]);

// --- 立地フラグ --------------------------------------------------------------
check(
  '埋蔵文化財包蔵地は文化財保護法93条に該当',
  p({ useIds: ['detachedHouse'], totalFloorArea: 120, floorsAbove: 2, siteFlags: ['buriedCulturalProperty'] }),
  ['buried-cultural-93']
);
check(
  '市街化調整区域は都市計画法の建築許可に該当',
  p({ useIds: ['detachedHouse'], totalFloorArea: 120, floorsAbove: 2, urbanizationControlArea: true }),
  ['cpa-29-43']
);

// --- 土壌汚染対策法（3,000m2 と 900m2 の二段） -------------------------------
check('形質変更3,000m2は土対法4条に該当', p({ formChangeArea: 3000 }), ['soil-contamination-4']);
check('形質変更900m2も条件付きで挙がる', p({ formChangeArea: 900 }), ['soil-contamination-4']);
check('形質変更800m2は挙がらない', p({ formChangeArea: 800 }), [], ['soil-contamination-4']);

// ===========================================================================
// 静岡市
// ===========================================================================

check(
  '静岡: 第一種住居地域で高さ10.5mは中高層条例に該当',
  p({ useIds: ['apartment'], zoning: '第一種住居地域', maxHeight: 10.5, totalFloorArea: 500, floorsAbove: 3 }),
  ['sz-chukoso']
);
check(
  '静岡: 商業地域で高さ10.5mは中高層条例に該当しない（基準は15m）',
  p({ useIds: ['office'], zoning: '商業地域', maxHeight: 10.5, totalFloorArea: 500, floorsAbove: 3 }),
  [],
  ['sz-chukoso']
);
check(
  '静岡: 商業地域でも高さ15.5mなら中高層条例に該当',
  p({ useIds: ['office'], zoning: '商業地域', maxHeight: 15.5, totalFloorArea: 900, floorsAbove: 4 }),
  ['sz-chukoso']
);
check(
  '静岡: 事務所2,400m2はCASBEE静岡に該当（用途を問わず2,000m2以上）',
  p({ useIds: ['office'], totalFloorArea: 2400, floorsAbove: 4, maxHeight: 16 }),
  ['sz-casbee']
);
check(
  '静岡: 事務所1,999m2はCASBEE静岡に該当しない',
  p({ useIds: ['office'], totalFloorArea: 1999, floorsAbove: 4, maxHeight: 16 }),
  [],
  ['sz-casbee']
);
check(
  '静岡: 砂防指定地は静岡県砂防指定地管理条例に該当',
  p({ useIds: ['detachedHouse'], totalFloorArea: 120, floorsAbove: 2, siteFlags: ['erosionControl'] }),
  ['sz-sabo']
);

// ===========================================================================
// 札幌市
// ===========================================================================

const sp = (over) => p({ municipalityId: 'sapporo', ...over });

check(
  '札幌: 第一種住居地域で高さ10.5mは中高層条例に該当',
  sp({ useIds: ['apartment'], zoning: '第一種住居地域', maxHeight: 10.5, totalFloorArea: 500, floorsAbove: 3 }),
  ['sp-chukoso']
);
check(
  '札幌: 商業地域で高さ10.5mは該当しない（基準は15m）',
  sp({ useIds: ['office'], zoning: '商業地域', maxHeight: 10.5, totalFloorArea: 500, floorsAbove: 3 }),
  [],
  ['sp-chukoso']
);
check(
  '札幌: 準工業地域で高さ10.5mは該当する（15m基準は商業と工業専用だけ）',
  sp({ useIds: ['factory'], zoning: '準工業地域', maxHeight: 10.5, totalFloorArea: 900, floorsAbove: 2 }),
  ['sp-chukoso']
);
check(
  '札幌: 敷地1,000m2は緑保全創出地域制度に該当',
  sp({ useIds: ['office'], siteArea: 1000, totalFloorArea: 800, floorsAbove: 2 }),
  ['sp-midori']
);
check(
  '札幌: 敷地999m2は緑保全創出地域制度に該当しない',
  sp({ useIds: ['office'], siteArea: 999, totalFloorArea: 800, floorsAbove: 2 }),
  [],
  ['sp-midori']
);
check(
  '札幌: 地下がなければ横浜の地下室マンション条例は当然出ない（自治体分離の確認）',
  sp({ useIds: ['apartment'], floorsBelow: 2, totalFloorArea: 3000, floorsAbove: 5, maxHeight: 15 }),
  ['sp-chukoso'],
  ['yk-chikashitsu', 'sz-chukoso']
);

// ===========================================================================
// 横浜市
// ===========================================================================

const yk = (over) => p({ municipalityId: 'yokohama', ...over });

check(
  '横浜: 住居系で高さ10.5mは中高層建築物条例に該当',
  yk({ useIds: ['apartment'], zoning: '第一種住居地域', maxHeight: 10.5, totalFloorArea: 500, floorsAbove: 3 }),
  ['yk-chukoso']
);
check(
  '横浜: 住居系で高さ9mでも延べ1,200m2なら大規模建築物として該当',
  yk({ useIds: ['apartment'], zoning: '第一種住居地域', maxHeight: 9, totalFloorArea: 1200, floorsAbove: 2 }),
  ['yk-chukoso']
);
check(
  '横浜: 住居系で高さ9m・延べ900m2なら該当しない',
  yk({ useIds: ['apartment'], zoning: '第一種住居地域', maxHeight: 9, totalFloorArea: 900, floorsAbove: 2 }),
  [],
  ['yk-chukoso']
);
check(
  '横浜: 商業地域で高さ12mは該当しない（基準は15m、延べ要件は住居系のみ）',
  yk({ useIds: ['office'], zoning: '商業地域', maxHeight: 12, totalFloorArea: 3000, floorsAbove: 3 }),
  [],
  ['yk-chukoso']
);
check(
  '横浜: 共同住宅2,000m2は福祉のまちづくり条例の義務規定',
  yk({ useIds: ['apartment'], zoning: '第一種住居地域', totalFloorArea: 2000, floorsAbove: 4, maxHeight: 12 }),
  ['yk-fukushi']
);
check(
  '横浜: 敷地500m2の住居系は緑化地域制度に該当',
  yk({ useIds: ['apartment'], zoning: '第一種住居地域', siteArea: 500, totalFloorArea: 600, floorsAbove: 2 }),
  ['yk-ryokka-chiiki']
);
check(
  '横浜: 敷地499m2は緑化地域制度に該当しない',
  yk({ useIds: ['apartment'], zoning: '第一種住居地域', siteArea: 499, totalFloorArea: 600, floorsAbove: 2 }),
  [],
  ['yk-ryokka-chiiki']
);
check(
  '横浜: 地下2階の計画は地下室マンション条例の確認対象',
  yk({ useIds: ['apartment'], zoning: '第一種住居地域', floorsBelow: 2, totalFloorArea: 3000, floorsAbove: 3, maxHeight: 9 }),
  ['yk-chikashitsu']
);

// ===========================================================================
// 自治体レイヤーの出し分け
// ===========================================================================

const sharedInput = {
  useIds: ['office'],
  totalFloorArea: 2400,
  floorsAbove: 4,
  maxHeight: 16,
  zoning: '第一種住居地域',
  siteArea: 1200,
};

check(
  '「その他の自治体」を選ぶと条例レイヤーが一切出ない',
  p({ municipalityId: 'other', ...sharedInput }),
  ['bsl-6-1-2'],
  ['sz-casbee', 'sz-chukoso', 'sp-chukoso', 'sp-midori', 'yk-chukoso', 'yk-fukushi']
);
check(
  '静岡を選ぶと札幌・横浜の条例は出ない',
  p({ municipalityId: 'shizuoka', ...sharedInput }),
  ['sz-chukoso', 'sz-casbee'],
  ['sp-chukoso', 'yk-chukoso']
);
check(
  '札幌を選ぶと静岡・横浜の条例は出ない',
  p({ municipalityId: 'sapporo', ...sharedInput }),
  ['sp-chukoso', 'sp-midori'],
  ['sz-chukoso', 'sz-casbee', 'yk-chukoso']
);
check(
  '横浜を選ぶと静岡・札幌の条例は出ない',
  p({ municipalityId: 'yokohama', ...sharedInput }),
  ['yk-chukoso'],
  ['sz-chukoso', 'sp-chukoso', 'sp-midori']
);

// --- 国の法令の窓口が自治体ごとに差し替わること -------------------------------
const szFire = getAuthorityOverrides('shizuoka')['fire-7'];
const spFire = getAuthorityOverrides('sapporo')['fire-7'];
ok('消防同意の窓口が静岡市の課名に差し替わる', !!szFire && szFire.includes('静岡市'), `実際: ${szFire}`);
ok('消防同意の窓口が札幌市の課名に差し替わる', !!spFire && spFire.includes('札幌市'), `実際: ${spFire}`);
ok('同じ国の法令でも自治体ごとに窓口が違う', szFire !== spFire);
ok('条例レイヤーのない自治体には上書きがない', Object.keys(getAuthorityOverrides('other')).length === 0);

// ===========================================================================
// ルール定義そのものの健全性
// ===========================================================================

const allRules = [...NATIONAL_RULES, ...PACKS.flatMap((pack) => pack.rules)];
const ids = allRules.map((r) => r.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
ok('ルールIDが重複していない', dupes.length === 0, `重複: ${[...new Set(dupes)].join(', ')}`);

const noSource = allRules.filter((r) => !r.sources || r.sources.length === 0);
ok('すべてのルールに出典がある', noSource.length === 0, `出典なし: ${noSource.map((r) => r.id).join(', ')}`);

const badUrl = allRules.filter((r) => r.sources.some((s) => !/^https?:\/\//.test(s.url)));
ok('出典URLの書式が正しい', badUrl.length === 0, `不正: ${badUrl.map((r) => r.id).join(', ')}`);

const noAsOf = allRules.filter((r) => !/^\d{4}-\d{2}-\d{2}$/.test(r.asOf));
ok('基準日の書式が正しい', noAsOf.length === 0, `不正: ${noAsOf.map((r) => r.id).join(', ')}`);

const nationalIds = new Set(NATIONAL_RULES.map((r) => r.id));
const danglingOverrides = PACKS.flatMap((pack) =>
  Object.keys(pack.authorityOverrides)
    .filter((id) => !nationalIds.has(id))
    .map((id) => `${pack.id}:${id}`)
);
ok(
  '窓口の上書きが実在する全国共通ルールだけを指している',
  danglingOverrides.length === 0,
  `存在しないID: ${danglingOverrides.join(', ')}`
);

const wrongScope = PACKS.flatMap((pack) =>
  pack.rules.filter((r) => r.municipalityId !== pack.id || r.scope !== 'municipal').map((r) => `${pack.id}:${r.id}`)
);
ok('自治体ルールの scope と municipalityId が揃っている', wrongScope.length === 0, `不一致: ${wrongScope.join(', ')}`);

fs.rmSync(outDir, { recursive: true, force: true });

console.log('');
console.log(`全国共通レイヤー: ${NATIONAL_RULES.length} 件`);
PACKS.forEach((pack) => {
  console.log(
    `  ${pack.label}: 条例 ${pack.rules.length} 件 / 窓口の上書き ${Object.keys(pack.authorityOverrides).length} 件`
  );
});
console.log(`テスト: ${pass} pass / ${fail} fail`);
if (failures.length) {
  console.log('');
  failures.forEach((f) => process.stdout.write(f));
  process.exit(1);
}
console.log('すべて通過しました。');
