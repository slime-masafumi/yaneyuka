/**
 * 消防設備判定(src/lib/fireEquipment.ts)の回帰テスト
 *
 *   node scripts/test-fire-equipment.mjs
 *
 * 条文(消防法施行令・e-Gov lawId 336CO0000000037)の閾値の境目と、階ごとの表で結果が変わる典型例を固定する。
 * 判定モジュールは TypeScript なので、一時ディレクトリに CommonJS で吐き出してから読み込む
 * (scripts/test-regulation-rules.mjs と同じ方式)。
 */

import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yy-firetest-'));

execSync(
  `npx tsc src/lib/fireEquipment.ts --outDir ${JSON.stringify(outDir)} ` +
    '--module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node',
  { cwd: root, stdio: 'inherit' }
);

const require = createRequire(import.meta.url);
const { judge, judgeWithFloors, deriveFromFloors, EQ } = require(path.join(outDir, 'fireEquipment.js'));

const BASE = {
  use: '15',
  total: 0,
  above: 1,
  below: 0,
  bwMax: 0,
  up3Max: 0,
  up4Max: 0,
  basementTotal: 0,
  f12: 0,
  site: 0,
  height: 0,
  structure: 'other',
  interiorNonComb: false,
  cap: NaN,
  capBW: NaN,
  capFloor: NaN,
  lowerTokutei: false,
  stairsLack: false,
  fireUse: false,
  assisted: false,
  lodging: false,
};
const p = (over) => ({ ...BASE, ...over });
/** 階の行。f(階, 床面積, 追加) */
const f = (level, area, over = {}) => ({ level, area, ...over });

let pass = 0;
let fail = 0;
const failures = [];

function ok(name, condition, detail = '') {
  if (condition) {
    pass += 1;
    return;
  }
  fail += 1;
  failures.push(`  x ${name}${detail ? `\n      ${detail}` : ''}\n`);
}

const rowOf = (rows, name) => rows.find((r) => r.name === name);
/** 建物全体の行の状態(req / part / no / check)と、条文の一部を確かめる */
function expectRow(name, rows, eq, status, lawPart = '', textPart = '') {
  const r = rowOf(rows, eq);
  const good = r && r.status === status && (!lawPart || r.law.includes(lawPart)) && (!textPart || r.text.includes(textPart));
  ok(name, good, r ? `${eq}: ${r.status} / ${r.law} / ${r.text}` : `${eq} の行が無い`);
}
/** 階ごとの結果で、その設備が当たった階の一覧 */
const floorsHit = (res, eq, status = 'part') => res.floors.filter((x) => x.hits.some((h) => h.name === eq && h.status === status)).map((x) => x.label);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ===========================================================================
// 1. 階ごとの表: 地階・無窓階で決まる自動火災報知設備
// ===========================================================================
{
  // (3)項ロ 飲食店。延べ 220㎡ で 3 号(300㎡)に当たらないが、地階 120㎡ が 10 号(地階・無窓階 100㎡)に当たる
  const r = judgeWithFloors(p({ use: '3ro' }), [f(1, 100), f(-1, 120)]);
  expectRow('地階 120㎡ の飲食店: 自火報は該当する階に必要(令 21 条 1 項 10 号)', r.rows, EQ.afa, 'part', '10 号', '地下 1 階');
  ok('地階 120㎡ の飲食店: 当たる階は地下 1 階だけ', same(floorsHit(r, EQ.afa), ['地下 1 階']), JSON.stringify(floorsHit(r, EQ.afa)));
  const r2 = judgeWithFloors(p({ use: '3ro' }), [f(1, 100), f(-1, 99)]);
  expectRow('地階 99㎡ の飲食店: 自火報は不要(10 号の 100㎡ 未満)', r2.rows, EQ.afa, 'no');
  const r3 = judgeWithFloors(p({ use: '3ro' }), [f(1, 100), f(-1, 100)]);
  expectRow('地階 100㎡ ちょうど: 自火報が必要(以上)', r3.rows, EQ.afa, 'part', '10 号');
}
{
  // (15)項 事務所。延べ 620㎡(6 号の 1,000㎡ 未満)。2 階が無窓階 320㎡ → 自火報 11 号・屋内消火栓 6 号(200㎡)
  const r = judgeWithFloors(p({ use: '15' }), [f(3, 100), f(2, 320, { windowless: true }), f(1, 200)]);
  expectRow('(15)項 2 階無窓階 320㎡: 自火報は該当する階に必要(11 号)', r.rows, EQ.afa, 'part', '11 号', '2 階');
  ok('(15)項 2 階無窓階 320㎡: 自火報は 2 階だけ', same(floorsHit(r, EQ.afa), ['2 階']), JSON.stringify(floorsHit(r, EQ.afa)));
  expectRow('(15)項 2 階無窓階 320㎡: 屋内消火栓も 2 階に必要(令 11 条 1 項 6 号・200㎡)', r.rows, EQ.hydrant, 'part', '6 号', '2 階');
  ok('(15)項 2 階無窓階 320㎡: 3 階 100㎡ は消火器具(3 階以上 50㎡)', floorsHit(r, EQ.ext).includes('3 階'));
  const r2 = judgeWithFloors(p({ use: '15' }), [f(3, 100), f(2, 320), f(1, 200)]);
  expectRow('同じ面積で無窓階でなければ自火報は不要', r2.rows, EQ.afa, 'no');
}

// ===========================================================================
// 2. 11 階以上の階
// ===========================================================================
{
  const floors = Array.from({ length: 12 }, (_, i) => f(i + 1, 80)); // (15)項 80㎡ × 12 階 = 960㎡
  const r = judgeWithFloors(p({ use: '15' }), floors);
  ok('80㎡×12 階: 延べ 960㎡・地上 12 階を表から出す', r.v.total === 960 && r.v.above === 12, `${r.v.total} / ${r.v.above}`);
  expectRow('80㎡×12 階: 自火報は 11 階以上の階(14 号)', r.rows, EQ.afa, 'part', '14 号');
  ok('80㎡×12 階: 自火報は 11・12 階だけ', same(floorsHit(r, EQ.afa), ['12 階', '11 階']), JSON.stringify(floorsHit(r, EQ.afa)));
  expectRow('80㎡×12 階: スプリンクラーは 11 階以上の階(令 12 条 1 項 12 号)', r.rows, EQ.sp, 'part', '12 号');
  ok('80㎡×12 階: スプリンクラーは 11・12 階だけ', same(floorsHit(r, EQ.sp), ['12 階', '11 階']), JSON.stringify(floorsHit(r, EQ.sp)));
  expectRow('80㎡×12 階: 誘導灯は 11 階以上の部分', r.rows, EQ.guide, 'part', '令 26 条');
  expectRow('80㎡×12 階: 非常コンセントは建物全体(令 29 条の 2)', r.rows, EQ.outlet, 'req', '29 条の 2');
  expectRow('80㎡×12 階: 連結送水管(7 階以上)', r.rows, EQ.standpipe, 'req', '29 条 1 項 1 号');
  const r4 = judgeWithFloors(p({ use: '4' }), Array.from({ length: 11 }, (_, i) => f(i + 1, 80)));
  expectRow('(4)項で地上 11 階: スプリンクラーは建物全体(令 12 条 1 項 3 号)', r4.rows, EQ.sp, 'req', '3 号');
}

// ===========================================================================
// 3. 避難器具: 階ごとの収容人員と無窓階(最大の階だけでは決まらなかったもの)
// ===========================================================================
{
  const simple = judge(p({ use: '15', total: 900, above: 3, up3Max: 300, capFloor: 120 }));
  expectRow('最大の階だけ: (15)項 3 階 120 人は無窓階かで決まるので要確認', simple, EQ.escape, 'check', '4 号');
  const r = judgeWithFloors(p({ use: '15' }), [f(3, 300, { cap: 120 }), f(2, 300, { cap: 120 }), f(1, 300, { cap: 30 })]);
  expectRow('階の表: 3 階 120 人(無窓階でない)は 150 人未満で不要', r.rows, EQ.escape, 'no');
  const rw = judgeWithFloors(p({ use: '15' }), [f(3, 300, { cap: 120, windowless: true }), f(2, 300, { cap: 120 }), f(1, 300, { cap: 30 })]);
  expectRow('階の表: 3 階 120 人が無窓階なら 100 人以上で必要', rw.rows, EQ.escape, 'part', '4 号', '3 階');
  const r6 = judgeWithFloors(p({ use: '6ha' }), [f(2, 200, { cap: 19 }), f(1, 200, { cap: 30 })]);
  expectRow('(6)項 2 階 19 人: 避難器具は不要(20 人未満)', r6.rows, EQ.escape, 'no');
  const r6b = judgeWithFloors(p({ use: '6ha' }), [f(2, 200, { cap: 20 }), f(1, 200, { cap: 30 })]);
  expectRow('(6)項 2 階 20 人: 避難器具が必要(1 号)', r6b.rows, EQ.escape, 'part', '1 号');
  const r6c = judgeWithFloors(p({ use: '6ha' }), [f(2, 200)]);
  expectRow('収容人員が未入力の階は要確認', [...r6c.rows], EQ.escape, 'check');
}

// ===========================================================================
// 4. ガス漏れ火災警報設備(令 21 条の 2)
// ===========================================================================
{
  expectRow('地下街 1,000㎡ + 燃料用ガス: 必要(1 号)', judge(p({ use: '16-2', total: 1000, fuelGas: true })), EQ.gas, 'req', '第 1 項 1 号');
  expectRow('地下街 999㎡: 不要', judge(p({ use: '16-2', total: 999, fuelGas: true })), EQ.gas, 'no');
  expectRow('地下街 1,000㎡ で燃料用ガスの指定なし: 要確認(規則 24 条の 2 の 2)', judge(p({ use: '16-2', total: 1000 })), EQ.gas, 'check', '24 条の 2 の 2');
  expectRow('準地下街 1,000㎡・特定 500㎡: 必要(2 号)', judge(p({ use: '16-3', total: 1000, tokuteiArea: 500, fuelGas: true })), EQ.gas, 'req', '2 号');
  expectRow('準地下街 1,000㎡・特定 499㎡: 不要', judge(p({ use: '16-3', total: 1000, tokuteiArea: 499, fuelGas: true })), EQ.gas, 'no');
  expectRow('準地下街で特定用途部分が未入力: 要確認', judge(p({ use: '16-3', total: 1000, fuelGas: true })), EQ.gas, 'check');

  const r = judgeWithFloors(p({ use: '4', fuelGas: true }), [f(1, 800), f(-1, 600), f(-2, 400)]);
  expectRow('(4)項 地階計 1,000㎡: 地階に必要(4 号)', r.rows, EQ.gas, 'part', '4 号');
  ok('(4)項 地階計 1,000㎡: 当たる階は地下 1・2 階', same(floorsHit(r, EQ.gas), ['地下 1 階', '地下 2 階']), JSON.stringify(floorsHit(r, EQ.gas)));
  const r2 = judgeWithFloors(p({ use: '4', fuelGas: true }), [f(1, 800), f(-1, 600), f(-2, 399)]);
  expectRow('(4)項 地階計 999㎡: 不要', r2.rows, EQ.gas, 'no');

  const m = [f(2, 300, { use: '15' }), f(1, 300, { use: '4' }), f(-1, 600, { use: '3ro' }), f(-2, 500, { use: '15' })];
  const r3 = judgeWithFloors(p({ use: '16i', fuelGas: true }), m);
  ok('(16)項イ: 地階の特定用途部分を表から出す', r3.v.basementTokutei === 600 && r3.v.basementTotal === 1100, `${r3.v.basementTokutei} / ${r3.v.basementTotal}`);
  expectRow('(16)項イ 地階計 1,100㎡・地階の特定 600㎡: 地階に必要(5 号)', r3.rows, EQ.gas, 'part', '5 号');
  const m2 = [f(2, 300, { use: '15' }), f(1, 300, { use: '4' }), f(-1, 400, { use: '3ro' }), f(-2, 700, { use: '15' })];
  expectRow('(16)項イ 地階の特定 400㎡: 不要', judgeWithFloors(p({ use: '16i', fuelGas: true }), m2).rows, EQ.gas, 'no');
  expectRow('温泉の採取設備: 規模によらず必要(3 号)', judge(p({ use: '15', total: 100, hotSpring: true })), EQ.gas, 'req', '3 号');
}

// ===========================================================================
// 5. 漏電火災警報器(令 22 条)の境目
// ===========================================================================
{
  const L = { lath: true, ampere: 30 };
  expectRow('(15)項 999㎡: 不要', judge(p({ use: '15', total: 999, ...L })), EQ.leak, 'no');
  expectRow('(15)項 1,000㎡: 必要(5 号)', judge(p({ use: '15', total: 1000, ...L })), EQ.leak, 'req', '5 号');
  expectRow('(5)項ロ 149㎡: 不要', judge(p({ use: '5ro', total: 149, ...L })), EQ.leak, 'no');
  expectRow('(5)項ロ 150㎡: 必要(2 号)', judge(p({ use: '5ro', total: 150, ...L })), EQ.leak, 'req', '2 号');
  expectRow('(3)項ロ 299㎡: 不要', judge(p({ use: '3ro', total: 299, ...L })), EQ.leak, 'no');
  expectRow('(3)項ロ 300㎡: 必要(3 号)', judge(p({ use: '3ro', total: 300, ...L })), EQ.leak, 'req', '3 号');
  expectRow('(7)項 500㎡: 必要(4 号)', judge(p({ use: '7', total: 500, ...L })), EQ.leak, 'req', '4 号');
  expectRow('(15)項 200㎡・契約電流 50A: 不要(超えない)', judge(p({ use: '15', total: 200, lath: true, ampere: 50 })), EQ.leak, 'no');
  expectRow('(15)項 200㎡・契約電流 51A: 必要(7 号)', judge(p({ use: '15', total: 200, lath: true, ampere: 51 })), EQ.leak, 'req', '7 号');
  expectRow('(15)項 200㎡・契約電流が未入力: 要確認', judge(p({ use: '15', total: 200, lath: true })), EQ.leak, 'check', '7 号');
  expectRow('(7)項は 7 号の用途に無いので契約電流は見ない', judge(p({ use: '7', total: 200, lath: true, ampere: 100 })), EQ.leak, 'no');
  expectRow('鉄網入りの壁等が無ければ不要', judge(p({ use: '15', total: 5000, lath: false, ampere: 100 })), EQ.leak, 'no');
  expectRow('(17)項: 面積によらず必要(1 号)', judge(p({ use: '17', total: 50, lath: true })), EQ.leak, 'req', '1 号');
  expectRow('(13)項イ: 用途に無いので不要', judge(p({ use: '13i', total: 5000, lath: true, ampere: 100 })), EQ.leak, 'no');
  expectRow('(16)項イ 500㎡・特定 300㎡: 必要(6 号)', judge(p({ use: '16i', total: 500, tokuteiArea: 300, ...L })), EQ.leak, 'req', '6 号');
  expectRow('(16)項イ 500㎡・特定 299㎡: 用途ごとに要確認', judge(p({ use: '16i', total: 500, tokuteiArea: 299, ...L })), EQ.leak, 'check');
}

// ===========================================================================
// 6. 消防機関へ通報する火災報知設備(令 23 条)の境目
// ===========================================================================
{
  expectRow('(15)項 999㎡: 不要', judge(p({ use: '15', total: 999 })), EQ.call, 'no');
  expectRow('(15)項 1,000㎡: 必要(3 号)', judge(p({ use: '15', total: 1000 })), EQ.call, 'req', '3 号');
  expectRow('(4)項 499㎡: 不要', judge(p({ use: '4', total: 499 })), EQ.call, 'no');
  expectRow('(4)項 500㎡: 必要(2 号)', judge(p({ use: '4', total: 500 })), EQ.call, 'req', '2 号');
  expectRow('(5)項ロ 1,000㎡: 必要(3 号)', judge(p({ use: '5ro', total: 1000 })), EQ.call, 'req', '3 号');
  expectRow('(5)項イ 500㎡: 必要(2 号)・電話で代えられない', judge(p({ use: '5i', total: 500 })), EQ.call, 'req', '2 号', '代替はできない');
  expectRow('(6)項ロ(1) 100㎡: 面積によらず必要(1 号)', judge(p({ use: '6ro1', total: 100 })), EQ.call, 'req', '1 号', '代替はできない');
  expectRow('(15)項 1,000㎡ で消防機関まで 500m 以下: 不要(ただし書)', judge(p({ use: '15', total: 1000, nearStation: true })), EQ.call, 'no', 'ただし書');
  expectRow('(6)項イ(1) は 500m 以下でも必要(建物内に消防機関があるときだけ不要)', judge(p({ use: '6i1', total: 100, nearStation: true })), EQ.call, 'req', '1 号');
  expectRow('(16)項イ: 用途ごとの部分で判定(要確認)', judge(p({ use: '16i', total: 3000 })), EQ.call, 'check', '9 条');
  expectRow('(16の3)項: 面積によらず必要(1 号)', judge(p({ use: '16-3', total: 100 })), EQ.call, 'req', '1 号');
}

// ===========================================================================
// 7. (16)項: 階ごとの用途から、用途ごとの部分(令 9 条)で判定
// ===========================================================================
{
  const m = [f(3, 300, { use: '15' }), f(2, 300, { use: '15' }), f(1, 200, { use: '3ro' })];
  const r = judgeWithFloors(p({ use: '16i' }), m);
  expectRow('(16)項イ 延べ 800㎡: 自火報は建物全体(令 21 条 1 項 3 号)', r.rows, EQ.afa, 'req', '3 号');
  expectRow('(16)項イ: 消火器具は用途の部分ごと((3)項ロ 200㎡ ≥ 150㎡)', r.rows, EQ.ext, 'part', '令 10 条', '(3)項ロの部分');
  expectRow('(16)項イ: 通報は (3)項ロ 200㎡・(15)項 600㎡ ともに 1,000㎡ 未満で不要', r.rows, EQ.call, 'no');
  ok('(16)項イ: 特定用途部分 200㎡ を表から出す', r.v.tokuteiArea === 200, String(r.v.tokuteiArea));
  const r2 = judgeWithFloors(p({ use: '16i' }), [f(2, 300, { use: '15' }), f(1, 200)]);
  ok('(16)項で用途が未選択の階は要確認', floorsHit(r2, '階の用途', 'check').includes('1 階'));
}

// ===========================================================================
// 8. 表から出す建物全体の値
// ===========================================================================
{
  const v = deriveFromFloors(p({ use: '15' }), [f(3, 100), f(2, 320, { windowless: true, cap: 25 }), f(1, 200), f(-1, 150, { cap: 10 })]);
  ok('延べ面積は階の合計', v.total === 770, String(v.total));
  ok('地上・地階の階数', v.above === 3 && v.below === 1, `${v.above} / ${v.below}`);
  ok('地階・無窓階のうち最大', v.bwMax === 320, String(v.bwMax));
  ok('1・2 階の合計', v.f12 === 520, String(v.f12));
  ok('地階の合計', v.basementTotal === 150, String(v.basementTotal));
  ok('地階・無窓階の収容人員の合計', v.capBW === 35, String(v.capBW));
  ok('3 階以上の最大', v.up3Max === 100, String(v.up3Max));
}

// ===========================================================================
// 9. 階の表を使わないときは従来と同じ(代表例)
// ===========================================================================
{
  const rows = judge(p({ use: '15', total: 800, above: 4, bwMax: 320, up3Max: 300, up4Max: 300 }));
  expectRow('最大の階だけ: 自火報 11 号', rows, EQ.afa, 'part', '11 号');
  expectRow('最大の階だけ: 屋内消火栓 6 号', rows, EQ.hydrant, 'part', '6 号');
  expectRow('(16の2)項の屋外消火栓は用途に無いので不要', judge(p({ use: '16-2', total: 5000, f12: 0 })), EQ.outdoor, 'no');
}

fs.rmSync(outDir, { recursive: true, force: true });

console.log(`テスト: ${pass} pass / ${fail} fail`);
if (failures.length) {
  console.log('');
  failures.forEach((x) => process.stdout.write(x));
  process.exit(1);
}
console.log('すべて通過しました。');
