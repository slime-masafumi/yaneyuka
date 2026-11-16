/**
 * 物件カルテの判定の回帰テスト(敷地の部分ごとの採光・日影、高度地区・地区計画・条例)。2026-11-16
 *
 *   node scripts/test-karte-overlay.mjs
 *
 * 判定モジュールは TypeScript なので、OS の一時ディレクトリに CommonJS で吐き出してから読み込む
 * (scripts/test-regulation-rules.mjs と同じ方式)。
 * 古い物件(新しい項目が無いデータ)で結果が変わらないことは、git の HEAD の calcs.ts も同じように
 * 吐き出して、同じ入力で行が一致するかで確かめる(HEAD が取れないときは飛ばす)。
 */

import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'karte-test-'));
const SRC = ['calcs.ts', 'masters.ts', 'site.ts', 'overlay.ts', 'glass.ts'];

function compile(srcDir, outDir) {
  const files = SRC.filter((f) => fs.existsSync(path.join(srcDir, f))).map((f) => JSON.stringify(path.join(srcDir, f)));
  execSync(
    `npx tsc ${files.join(' ')} --outDir ${JSON.stringify(outDir)} --rootDir ${JSON.stringify(srcDir)} ` +
      '--module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node',
    { cwd: root, stdio: 'inherit' },
  );
}

const require = createRequire(import.meta.url);
compile(path.join(root, 'src/lib/karte'), path.join(tmp, 'now'));
const NOW = require(path.join(tmp, 'now', 'calcs.js'));
const OV = require(path.join(tmp, 'now', 'overlay.js'));

// HEAD の版(古い物件の互換確認用)
let OLD = null;
try {
  const oldSrc = path.join(tmp, 'old-src');
  fs.mkdirSync(oldSrc);
  for (const f of ['calcs.ts', 'masters.ts', 'site.ts', 'glass.ts']) {
    fs.writeFileSync(path.join(oldSrc, f), execSync(`git show HEAD:src/lib/karte/${f}`, { cwd: root, maxBuffer: 1 << 26 }));
  }
  compile(oldSrc, path.join(tmp, 'old'));
  OLD = require(path.join(tmp, 'old', 'calcs.js'));
} catch (e) {
  console.log(`(HEAD の版が取れないため互換の確認を飛ばす: ${e.message.split('\n')[0]})`);
}

let pass = 0;
let fail = 0;
function check(name, cond, info) {
  if (cond) {
    pass++;
    console.log(`  ok  ${name}`);
  } else {
    fail++;
    console.log(`  NG  ${name}`);
    if (info !== undefined) console.log('      ', typeof info === 'string' ? info : JSON.stringify(info, null, 1));
  }
}
const line = (out, k) => out?.lines.find((l) => l.k === k);
const lineLike = (out, re) => out?.lines.find((l) => re.test(l.k));

const BASE = {
  id: 't',
  name: 'テスト',
  addr: '',
  zone: '商業地域',
  fire: '指定なし',
  H: 12,
  v0: 34,
  rough: '3',
  rain: 100,
  z: 1,
  snow: 20,
  cap: 0,
  ac: 'individual',
  accap: 0,
  ex: 'talk',
  gas: '0',
  wsup: '20',
  use: 'office',
  str: 'rc',
  fl: 3,
  bf: 0,
  area: 500,
};
const part = (zone, area, extra = {}) => ({ zone, fire: '指定なし', area, bc: 0, far: 0, bldg: true, ...extra });
const C = NOW.CALCS;
const run = (key, v, p) => {
  const spec = C[key];
  return spec.run({ ...NOW.defaults(spec, p), ...v }, p);
};

/* ───── 1. 採光補正係数:2 つの用途地域にまたがる敷地で、部分によって式が変わる(令 20 条 2 項) ───── */
console.log('\n[1] 採光補正係数を敷地の部分ごとに');
{
  const p = { ...BASE, zone: '商業地域', parts: [part('第一種住居地域', 60), part('商業地域', 100)] };
  const K = 'design|採光・換気の検討';
  // d/h = 2/4 = 0.5 → 住居系 0.5×6−1.4 = 1.6、商業系 0.5×10−1 = 4.0 → 上限 3.0
  const fields = NOW.fieldsOf(C[K], p).map((f) => f.k);
  check('部分を選ぶ欄が出る(zp・zp2)', fields.includes('zp') && fields.includes('zp2'), fields);
  const base = { ratio: '7', floor: '20', win: '1.5', d: '2', h: '4', vent: '2' };
  const a = run(K, base, p);
  check('部分を選ばない → 最も小さい住居系の 1.60 を使う', /= 1\.60/.test(line(a, '開口 1 の採光補正係数')?.v ?? ''), a?.lines);
  check('内訳に住居系 1.60 と商業系 3.00 が出る', /1\.60/.test(line(a, '開口 1 の部分ごとの値')?.v ?? '') && /3\.00/.test(line(a, '開口 1 の部分ごとの値')?.v ?? ''), line(a, '開口 1 の部分ごとの値'));
  // 必要 20/7 = 2.86。住居系 1.5×1.6 = 2.40(不足)、商業系 1.5×3.0 = 4.50(足りる)→ 部分で結果が変わる
  check('部分で結果が変わる → 要確認(info)', a?.verdict === 'info' && /部分/.test(a.summary), a?.summary);
  const b = run(K, { ...base, zp: '1' }, p);
  check('開口が商業地域の部分 → 3.00 で適合', b?.verdict === 'ok' && /3\.00/.test(line(b, '開口 1 の有効採光面積')?.v ?? ''), b?.lines);
  const c = run(K, { ...base, zp: '0' }, p);
  check('開口が第一種住居地域の部分 → 1.60 で不足', c?.verdict === 'ng' && /採光/.test(c.summary), c?.summary);
  // 建物が商業地域の部分だけにかかる → 商業系の式だけ(選ぶ欄も出ない)
  const p2 = { ...p, parts: [part('第一種住居地域', 60, { bldg: false }), part('商業地域', 100)] };
  check('建物が 1 つの区分だけにかかる → 選ぶ欄は出ない', !NOW.fieldsOf(C[K], p2).some((f) => f.k === 'zp'));
  const d = run(K, base, p2);
  check('その区分の式(3.00)で判定', d?.verdict === 'ok' && !line(d, '開口 1 の部分ごとの値'), d?.lines);
}

/* ───── 2. 日影:別の区域に日影が落ちる(令 135 条の 13・法 56 条の 2 第 4 項) ───── */
console.log('\n[2] 日影規制を区域ごとに');
{
  const K = 'design|日影規制の検討';
  // 敷地は第一種中高層住居専用地域(二の項(三) 5h/3h・4m)。北側の隣地は第一種低層住居専用地域(一の項(一) 3h/2h・1.5m)
  const p = { ...BASE, zone: '第一種中高層住居専用地域', H: 15, fl: 4, parts: [part('第一種中高層住居専用地域', 300, { shade: '2:3:4' })] };
  const fields = NOW.fieldsOf(C[K], p, { nz: '第一種低層住居専用地域' }).map((f) => f.k);
  check('別の区域を選ぶと、その区域の日影時間の欄が出る', fields.includes('t5_n') && fields.includes('t10_n'), fields);
  const v = { nz: '第一種低層住居専用地域', ns: '1:1:1.5', t5_0: '4', t10_0: '2.5', t5_n: '3.5', t10_n: '1.5' };
  const a = run(K, v, p);
  check('敷地の側は 5h/3h に収まる', !line(a, '敷地の周り(第一種中高層住居専用地域)')?.ng, line(a, '敷地の周り(第一種中高層住居専用地域)'));
  check('別の区域には 3h/2h・測定面 1.5m がかかり 3.5h で超過', line(a, '別の区域(第一種低層住居専用地域)')?.ng === true && /1\.5m/.test(line(a, '別の区域(第一種低層住居専用地域)').v), line(a, '別の区域(第一種低層住居専用地域)'));
  check('判定は超過・別の区域を名指し', a?.verdict === 'ng' && /別の区域/.test(a.summary), a?.summary);
  check('令 135 条の 13 の行が出る', !!lineLike(a, /令 135 条の 13/), a?.lines.map((l) => l.k));
  check('最も厳しい区域は別の区域', /別の区域/.test(line(a, '最も厳しい区域')?.v ?? ''), line(a, '最も厳しい区域'));

  // 商業地域(対象区域外)の高さ 20m の建物が、第一種低層住居専用地域に日影を落とす → 対象区域内とみなす(法 56 条の 2 第 4 項)
  const q = { ...BASE, zone: '商業地域', H: 20, fl: 6, parts: [part('商業地域', 400)] };
  const b = run(K, { nz: '第一種低層住居専用地域', ns: '1:2:1.5', t5_n: '3', t10_n: '2' }, q);
  check('対象区域外の 10m 超 → 第 4 項の行が出る', !!line(b, '法 56 条の 2 第 4 項'), b?.lines);
  check('4h/2.5h に 3h/2h は収まる → 適合', b?.verdict === 'ok', b);
  const b2 = run(K, { nz: '第一種低層住居専用地域', ns: '1:2:1.5', t5_n: '4', t10_n: '2' }, q);
  check('5〜10m の範囲で 4h(規制 4h 以上)→ 超過', b2?.verdict === 'ng', b2?.lines);
  // 高さ 9m の建物は対象区域外なら日影規制の対象にならない
  const c = run(K, { H: '9', fl: '2', nz: '第一種低層住居専用地域', ns: '1:1:1.5', t5_n: '5' }, q);
  check('対象区域外の 10m 以下 → 対象外', c?.verdict === 'ok' && /対象外/.test(c.summary + line(c, '別の区域(第一種低層住居専用地域)')?.v), c);
  // 第一種住居地域(三の項)で高さ 9.5m → (ろ)欄に当たらない
  const r = { ...BASE, zone: '第一種住居地域', H: 9.5, fl: 3, parts: [part('第一種住居地域', 200, { shade: '3:1:4' })] };
  const d = run(K, {}, r);
  check('三の項で高さ 10m 以下 → 対象外', d?.verdict === 'ok' && /対象外/.test(line(d, '敷地の周り(第一種住居地域)')?.v ?? ''), d);
  // 2 つの部分が別の規制(建物がまたがる)→ 部分ごとに判定し、厳しい方を名指し
  const s = { ...BASE, zone: '第一種中高層住居専用地域', H: 12, fl: 4, parts: [part('第一種中高層住居専用地域', 200, { shade: '2:1:4' }), part('第一種住居地域', 150, { shade: '3:2:4' })] };
  const e = run(K, { t5_0: '2.5', t10_0: '1.5', t5_1: '4.5', t10_1: '2.5' }, s);
  check('部分 1(3h/2h)は 2.5h/1.5h で適合、部分 2(5h/3h)は 4.5h/2.5h で適合', e?.verdict === 'ok', e?.lines);
  check('余裕の最も少ない部分を「最も厳しい区域」に出す', /部分 1|部分 2/.test(line(e, '最も厳しい区域')?.v ?? ''), line(e, '最も厳しい区域'));
  // 第一種低層住居専用地域:軒の高さ 7m 以下・地上 2 階 → 対象外
  const t = { ...BASE, zone: '第一種低層住居専用地域', H: 9, fl: 2, parts: [part('第一種低層住居専用地域', 200, { shade: '1:1:1.5' })] };
  const g = run(K, { eave: '6.5' }, t);
  check('低層:軒 6.5m・2 階 → 対象外', /対象外/.test(line(g, '敷地の周り(第一種低層住居専用地域)')?.v ?? ''), g);
}

/* ───── 3. 高度地区で高さが効く(法 58 条)・北側斜線(法 56 条 1 項 3 号) ───── */
console.log('\n[3] 高度地区・北側斜線・地区計画の高さ');
{
  const K = 'design|高さ制限・斜線の検討';
  // 第二種高度地区(東京都の例の形): 5m + 1.25L(L ≤ 8m)、15m + 0.6(L − 8)
  const hd = { name: '第二種高度地区', max: 0, min: 0, rise: 5, grad: 1.25, brk: 8, grad2: 0.6 };
  const p = { ...BASE, zone: '第二種中高層住居専用地域', H: 17, parts: [part('第二種中高層住居専用地域', 300, { hd })] };
  const a = run(K, { l0: '10' }, p);
  // 高度地区 5 + 1.25×8 + 0.6×2 = 16.2 < 17 → 超過。北側斜線 10 + 1.25×10 = 22.5 は適合
  check('高度地区の斜線 16.2m に 17m が超過', a?.verdict === 'ng' && /16\.2/.test(lineLike(a, /第二種高度地区の斜線/)?.v ?? ''), a?.lines);
  check('北側斜線 22.5m は適合', /22\.5/.test(lineLike(a, /^北側斜線/)?.v ?? '') && !lineLike(a, /^北側斜線/)?.ng, lineLike(a, /^北側斜線/));
  check('最も厳しい制限は高度地区の斜線', /第二種高度地区の斜線/.test(line(a, '最も厳しい制限')?.v ?? ''), line(a, '最も厳しい制限'));
  // 中高層で日影規制(二の項)が指定 → 北側斜線は除外。最高限度 15m の高度地区で 14m は適合
  const p2 = { ...p, H: 14, parts: [part('第二種中高層住居専用地域', 300, { hd: { ...hd, max: 15 }, shade: '2:1:4' })] };
  const b = run(K, { l0: '20' }, p2);
  check('日影規制ありの中高層 → 北側斜線はかからない', /かからない/.test(line(b, '北側斜線')?.v ?? ''), b?.lines);
  check('最高限度 15m・斜線 22.2m に 14m は適合し、最も厳しいのは 15m', b?.verdict === 'ok' && /15 m/.test(line(b, '最も厳しい制限')?.v ?? ''), b?.lines);
  // 2 つの部分:第一種低層(絶対高さ 10m)と近隣商業(高度地区 最高限度 20m)に建物がまたがる → 部分ごと
  const p3 = {
    ...BASE,
    zone: '近隣商業地域',
    H: 22,
    parts: [part('第一種低層住居専用地域', 120), part('近隣商業地域', 200, { hd: { name: '最高限度高度地区', max: 20, min: 0, rise: 0, grad: 0, brk: 0, grad2: 0 } })],
  };
  const fields = NOW.fieldsOf(C[K], p3).map((f) => f.k);
  check('部分ごとの高さの欄が出る', fields.includes('h0') && fields.includes('h1'), fields);
  const c = run(K, { h0: '9', l0: '6', h1: '22' }, p3);
  check('部分 1:絶対高さ 10m に 9m は適合', !lineLike(c, /部分 1.*絶対高さ/)?.ng, c?.lines);
  check('部分 2:高度地区の最高限度 20m に 22m が超過', lineLike(c, /部分 2.*最高限度高度地区の最高限度/)?.ng === true && c?.verdict === 'ng', c?.lines);
  // 高度地区の名前だけ入れた → 要確認と出る
  const p4 = { ...BASE, zone: '商業地域', H: 30, parts: [part('商業地域', 300, { hd: { name: '第三種高度地区', max: 0, min: 0, rise: 0, grad: 0, brk: 0, grad2: 0 } })] };
  const d = run(K, {}, p4);
  check('高度地区の数値が未入力 → 「第三種高度地区 … 要確認」', d?.verdict === 'info' && d.lines.some((l) => /第三種高度地区の数値が未入力のため要確認/.test(l.v)), d?.lines);
  // 地区計画の高さの最高限度
  const p5 = { ...BASE, zone: '商業地域', H: 25, dp: { name: '○○地区地区計画', text: '', bc: 0, far: 0, hMax: 24, hMin: 0, wall: 0, minSite: 0, byLaw: true } };
  const e = run(K, {}, p5);
  check('地区計画の高さの最高限度 24m に 25m が超過', e?.verdict === 'ng' && /○○地区地区計画/.test(line(e, '最も厳しい制限')?.v ?? ''), e?.lines);
}

/* ───── 4. 建蔽率・容積率に地区計画・条例の最高限度と敷地面積の最低限度 ───── */
console.log('\n[4] 建蔽率・容積率に地区計画・条例');
{
  const K = 'design|建蔽率・容積率の算定';
  const p = {
    ...BASE,
    zone: '第一種住居地域',
    parts: [part('第一種住居地域', 90, { bc: 60, far: 200 })],
    dp: { name: '△△地区計画', text: '', bc: 50, far: 150, hMax: 0, hMin: 0, wall: 0, minSite: 100, byLaw: true },
  };
  const a = run(K, { bldg: '48', floor: '140', road: '8' }, p);
  check('建蔽率の上限は地区計画の 50%', /^50 %/.test(line(a, '建蔽率の上限')?.v ?? ''), line(a, '建蔽率の上限'));
  check('容積率の上限は地区計画の 150%(法の上限 200%)', /^150 %/.test(line(a, '容積率の上限')?.v ?? ''), line(a, '容積率の上限'));
  check('敷地 90m² は最低限度 100m² に不足 → 不適合', a?.verdict === 'ng' && /敷地面積の最低限度/.test(a.summary), a?.summary);
  const b = run(K, { bldg: '48', floor: '140', road: '8' }, { ...p, dp: { ...p.dp, minSite: 0 }, ord: { name: '安全条例', text: '', bc: 0, far: 0, hMax: 0, hMin: 0, wall: 0, minSite: 0, access: 4 } });
  check('建蔽率 53.3% が地区計画の 50% を超過', b?.verdict === 'ng' && /建蔽率/.test(b.summary), b?.summary);
  const acc = run('design|接道・前面道路の確認', { kind: '1', w: '6', len: '3' }, { ...p, ord: { name: '安全条例', text: '', bc: 0, far: 0, hMax: 0, hMin: 0, wall: 0, minSite: 0, access: 4 } });
  check('条例の接道 4m に 3m は不足', acc?.verdict === 'ng' && line(acc, '条例の接道の長さ')?.ng === true, acc?.lines);
  // 2 地域の加重平均にも地区計画の上限
  const pm = { ...BASE, parts: [part('第一種住居地域', 100, { bc: 60, far: 200 }), part('商業地域', 100, { bc: 80, far: 400 })], dp: { name: '□□地区計画', text: '', bc: 60, far: 0, hMax: 0, hMin: 0, wall: 0, minSite: 0 } };
  const m = run(K, { bldg: '130', floor: '400', road: '12' }, pm);
  check('加重平均 70% より地区計画の 60% が効き、130/200 = 65% で超過', m?.verdict === 'ng' && /^60 %/.test(line(m, '建蔽率の上限(加重平均)')?.v ?? ''), m?.lines);
  // 一覧の項目
  const o = run('design|高度地区・地区計画・条例の確認', { wallD: '0.8' }, { ...p, dp: { ...p.dp, wall: 1, uses: '倉庫は不可', byLaw: false } });
  check('壁面の位置 1m に 0.8m は不足、用途の制限は要確認で出る', o?.verdict === 'ng' && !!lineLike(o, /用途の制限/) && !!lineLike(o, /届出/), o?.lines);
}

/* ───── 5. 古い物件(新しい項目が無い)で、既存の判定の行が HEAD と同じ ───── */
console.log('\n[5] 古い物件の互換');
if (OLD) {
  const old1 = { ...BASE, zone: '第一種住居地域', fire: '準防火地域' };
  const old2 = { ...BASE, zone: '商業地域', fire: '防火地域', parts: [part('商業地域', 150, { bc: 80, far: 600, fire: '防火地域' }), part('第二種住居地域', 50, { bc: 60, far: 300, fire: '準防火地域' })] };
  const old3 = { ...BASE, zone: '準工業地域', parts: [part('準工業地域', 200, { bc: 60, far: 200 })] };
  const cases = [
    ['design|建蔽率・容積率の算定', { site: '200', bldg: '110', floor: '380', bc: '60', far: '200', road: '6', fr: 'juntaika', corner: '1' }],
    ['design|建蔽率・容積率の算定', { bldg: '140', floor: '900', road: '8', fr: 'taika' }],
    ['design|採光・換気の検討', { floor: '20', win: '2', d: '1.5', h: '3', vent: '1', win2: '1', d2: '0', h2: '2', road2: '1' }],
    ['design|採光・換気の検討', { floor: '12', win: '1.5' }],
    ['design|接道・前面道路の確認', { kind: '2', w: '3', len: '2.5' }],
    ['design|階段の寸法', { w: '80', r: '20', t: '22' }],
  ];
  for (const proj of [old1, old2, old3]) {
    for (const [K, v] of cases) {
      const a = C[K].run({ ...NOW.defaults(C[K], proj), ...v }, proj);
      const b = OLD.CALCS[K].run({ ...OLD.defaults(OLD.CALCS[K], proj), ...v }, proj);
      const label = `${proj.parts ? proj.parts.map((x) => x.zone).join('+') : proj.zone} / ${K.split('|')[1]}`;
      // 式の区分が違う 2 地域にまたがる敷地で d・h を入れた採光だけは、部分ごとの式に変わる(この改修の目的)
      if (proj === old2 && K.includes('採光') && v.d) check(`${label}(部分ごとの式に変わる・意図した変更)`, JSON.stringify(a) !== JSON.stringify(b) && !!line(a, '開口 1 の部分ごとの値'), a);
      else check(label, JSON.stringify(a) === JSON.stringify(b), { now: a, old: b });
    }
  }
} else {
  console.log('  (飛ばした)');
}

/* ───── 6. 部品(高度地区の斜線・別表第 4 の選択肢) ───── */
console.log('\n[6] 部品');
{
  const s = OV.hdSlant({ name: '', max: 0, min: 0, rise: 10, grad: 1.25, brk: 8, grad2: 0.6 }, 12);
  check('第三種の形 10 + 1.25×8 + 0.6×4 = 22.4', Math.abs(s.lim - 22.4) < 1e-9, s);
  check('商業地域は別表第 4 にない', OV.shadeOptions('商業地域').length === 0);
  check('第一種住居地域は三の項 (一)(二) × 測定面 4m・6.5m の 4 通り', OV.shadeOptions('第一種住居地域').length === 4);
  check('用途地域の指定のない区域はイ 3 通り + ロ 3 通り', OV.shadeOptions('用途地域の指定のない区域').length === 6);
  const r = OV.shadeRule('2:2:6.5');
  check('二の項(二)は 4h/2.5h、道の区域内 3h/2h', r.t5 === 4 && r.t10 === 2.5 && r.t5d === 3 && r.t10d === 2, r);
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${pass} ok / ${fail} NG`);
process.exit(fail ? 1 : 0);
