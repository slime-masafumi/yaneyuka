/**
 * 斜線制限・天空率・日影・ボリューム検討の回帰テスト(2026-11-16)
 *
 *   node scripts/test-setback-sky.mjs
 *
 * 手計算で出せる値と照らす:
 *   1. 2 以上の前面道路(令 132 条): 角地・二方道路で、狭い道路側の面が最大幅員とみなされる区間
 *   2. 天空率(令 135 条の 5〜9): 箱の天空率を式で解いた値(正射影の積分の閉じた形)と、数値積分を比べる。
 *      道路斜線の適合建築物も、前面の上端で仰角が最大になるので同じ式で解ける → 通る / 通らないを手計算と比べる
 *   3. 塔屋(令 2 条 1 項 6 号ロ): 建築面積の 1/8 以内 / 超え
 *   4. 日影の区域またがり(令 135 条の 13)と塔屋の影
 *   5. 道路 1 本・塔屋なしでは、日影とボリューム検討の結果が変更前(git の HEAD)と変わらないこと
 *
 * TypeScript なので、一時ディレクトリに CommonJS で吐き出してから読み込む(test-regulation-rules.mjs と同じ方式)。
 */

import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.tmp-skytest');
const oldSrc = path.join(outDir, 'old-src');
const TSC = '--module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node';

fs.rmSync(outDir, { recursive: true, force: true });
execSync(`npx tsc src/lib/setback.ts src/lib/skyFactor.ts src/lib/shadow.ts src/lib/volume.ts --outDir ${JSON.stringify(path.join(outDir, 'new'))} --rootDir src/lib ${TSC}`, { cwd: root, stdio: 'inherit' });

// 変更前(HEAD)の shadow.ts / setback.ts / volume.ts。karte/ は今のものをそのまま使う(このテストの対象外)
let hasOld = true;
try {
  fs.mkdirSync(path.join(oldSrc, 'karte'), { recursive: true });
  for (const f of ['setback.ts', 'shadow.ts', 'volume.ts']) {
    fs.writeFileSync(path.join(oldSrc, f), execSync(`git show HEAD:src/lib/${f}`, { cwd: root }));
  }
  for (const f of fs.readdirSync(path.join(root, 'src/lib/karte'))) {
    if (f.endsWith('.ts')) fs.copyFileSync(path.join(root, 'src/lib/karte', f), path.join(oldSrc, 'karte', f));
  }
  execSync(`npx tsc ${['setback.ts', 'shadow.ts', 'volume.ts'].map((f) => JSON.stringify(path.join(oldSrc, f))).join(' ')} --outDir ${JSON.stringify(path.join(outDir, 'old'))} --rootDir ${JSON.stringify(oldSrc)} ${TSC}`, { cwd: root, stdio: 'inherit' });
} catch (e) {
  hasOld = false;
  console.log('変更前のファイルを読めなかったので、変更前との比較は飛ばします:', e.message);
}

const require = createRequire(import.meta.url);
const N = (f) => require(path.join(outDir, 'new', f));
const { road132, faceRoadLimit, penthouseCounted, roadLimit } = N('setback.js');
const { skyFactorAt, prepareSky, evalSky } = N('skyFactor.js');
const { computeShadow, computeShadowZones } = N('shadow.js');
const { calcVolume } = N('volume.js');

let pass = 0;
let fail = 0;
const failures = [];
function ok(name, cond, detail = '') {
  if (cond) {
    pass += 1;
    return;
  }
  fail += 1;
  failures.push(`  x ${name}${detail ? `\n      ${detail}` : ''}\n`);
}
const near = (a, b, tol = 1e-9) => a !== null && b !== null && Math.abs(a - b) <= tol;

// ===========================================================================
// 1. 2 以上の前面道路(令 132 条)
// ===========================================================================
// 第一種住居地域・容積率の限度 300%(別表第 3 一の項 → 勾配 1.25・適用距離 25m)
const SB = { zone: '1r', far: 300, farDirect: true, roadW: 0, roadSet: 0, sideSet: 0, northDist: 0, height: 0, note3: false, noneSlope: 1.25, shadowZone: false };

{
  // 角地: 南 8m(最大)・東 4m、後退 1m・1m、建物の南北の奥行き 20m
  // 1 項の区域 = min(2 × 8, 35) = 16m。東の道路の中心線から面まで 2 + 1 = 3m(10m 以下)
  // 東の面: 南の道路から 1〜16m は幅員 8m とみなす → 1.25 ×(8 + 2 × 1)= 12.5m
  //         16〜21m は東の道路(4m)だけ(3 項)→ 1.25 ×(4 + 2 × 1)= 7.5m → 面で厳しいのは 7.5m
  const m = road132({ roads: [{ width: 8, set: 1 }, { width: 4, set: 1 }], layout: 'corner', reach: [1 + 12, 1 + 20], depth: 0 });
  ok('角地: 1 項の区域は min(2W, 35) = 16m', m.zone === 16 && m.base === 0, JSON.stringify(m));
  const f2 = faceRoadLimit(SB, m.faces[1], 1);
  ok('角地: 東の面は 1〜16m が 8m とみなし・16〜21m が 4m のまま', f2.segs.length === 2 && f2.segs[0].deemed && f2.segs[0].from === 1 && f2.segs[0].to === 16 && !f2.segs[1].deemed && f2.segs[1].to === 21, JSON.stringify(f2.segs.map((s) => [s.from, s.to, s.width])));
  ok('角地: みなし区間 1.25 × (8 + 2) = 12.5m', near(f2.segs[0].r.limitAtFace, 12.5), String(f2.segs[0].r.limitAtFace));
  ok('角地: 4m のままの区間 1.25 × (4 + 2) = 7.5m・面の値は 7.5m', near(f2.segs[1].r.limitAtFace, 7.5) && near(f2.lim, 7.5), String(f2.lim));
  const f1 = faceRoadLimit(SB, m.faces[0], 1);
  ok('角地: 最大幅員の道路側は 1.25 × (8 + 2) = 12.5m', near(f1.lim, 12.5), String(f1.lim));

  // 奥行き 14m なら東の面は 1〜15m で全部 16m 以内 → 全部 8m とみなす → 12.5m
  const m2 = road132({ roads: [{ width: 8, set: 1 }, { width: 4, set: 1 }], layout: 'corner', reach: [13, 15], depth: 0 });
  const g2 = faceRoadLimit(SB, m2.faces[1], 1);
  ok('角地: 面が全部 2W 以内なら 12.5m', g2.segs.length === 1 && g2.segs[0].deemed && near(g2.lim, 12.5), JSON.stringify(g2.segs.map((s) => [s.from, s.to, s.width])));

  // 東の道路の中心線から面まで 2 + 9 = 11m > 10m → 面の全部が 8m とみなされる
  const m3 = road132({ roads: [{ width: 8, set: 1 }, { width: 4, set: 9 }], layout: 'corner', reach: [13, 21], depth: 0 });
  ok('角地: 他の道路の中心線から 10m 超は全部みなし', m3.faces[1].length === 1 && m3.faces[1][0].deemed && m3.faces[1][0].width === 8);

  // 二方道路: 道路境界線の間 20m、北 4m 側の後退 1m → 南の道路から 19m > 16m → 4m のまま 7.5m
  const o1 = road132({ roads: [{ width: 8, set: 1 }, { width: 4, set: 1 }], layout: 'opposite', reach: [0, 0], depth: 20 });
  ok('二方道路: 奥の面が 2W を超えると狭い道路のまま 7.5m', near(faceRoadLimit(SB, o1.faces[1], 1).lim, 7.5));
  // 境界線の間 16m → 15m ≤ 16m → 8m とみなす 12.5m
  const o2 = road132({ roads: [{ width: 8, set: 1 }, { width: 4, set: 1 }], layout: 'opposite', reach: [0, 0], depth: 16 });
  ok('二方道路: 奥の面が 2W 以内なら 12.5m', near(faceRoadLimit(SB, o2.faces[1], 1).lim, 12.5));

  // 狭い方が道路 1 のとき(道路 2 が最大)も同じに出る
  const s1 = road132({ roads: [{ width: 4, set: 1 }, { width: 8, set: 1 }], layout: 'corner', reach: [21, 13], depth: 0 });
  ok('角地: 道路の順番を入れ替えても同じ', s1.base === 1 && near(faceRoadLimit(SB, s1.faces[0], 1).lim, 7.5));

  // 令 134 条 2 項: 南 6m + 公園 4m を基準 → 区域 min(2 × 10, 35) = 20m、東の面は 幅員 6m + 公園 4m とみなす
  //   1.25 ×(6 + 4 + 2 × 1)= 15m
  const p1 = road132({ roads: [{ width: 6, set: 1, park: 4 }, { width: 4, set: 1 }], layout: 'corner', reach: [13, 19], depth: 0, use134: true });
  ok('令 134 条 2 項: 区域 20m・東の面 15m', p1.zone === 20 && near(faceRoadLimit(SB, p1.faces[1], 1).lim, 15), JSON.stringify(p1.faces[1]));
}

// ===========================================================================
// 2. 天空率
// ===========================================================================
/**
 * 高さ h(測定点から)の上端の水平な辺 1 本を、辺までの垂直距離 d の点から見たときの寄与。
 * 方位 ψ(辺の垂線から測る)で仰角 tan α = h cos ψ / d → sin² α = h² cos² ψ /(d² + h² cos² ψ)。
 * ∫ sin² α dψ = ψ −(d / √(d² + h²))· atan(d tan ψ / √(d² + h²))
 */
const F = (d, h, psi) => {
  const q = Math.sqrt(d * d + h * h);
  return psi - (d / q) * Math.atan((d * Math.tan(psi)) / q);
};
/** 点 (px, py) から、py より北にある箱 [x0,x1]×[y0,y1](上端の高さ h)の Ab / As。前の面と、点が横にずれていれば横の面 */
function boxAb(px, py, b, h) {
  let s = 0;
  const d = b.y0 - py;
  s += F(d, h, Math.atan((b.x1 - px) / d)) - F(d, h, Math.atan((b.x0 - px) / d));
  if (px < b.x0) {
    const dx = b.x0 - px;
    s += F(dx, h, Math.atan((b.y1 - py) / dx)) - F(dx, h, Math.atan((b.y0 - py) / dx));
  }
  if (px > b.x1) {
    const dx = px - b.x1;
    s += F(dx, h, Math.atan((b.y1 - py) / dx)) - F(dx, h, Math.atan((b.y0 - py) / dx));
  }
  return s / (2 * Math.PI);
}

{
  // 2-1 数値積分の精度: 箱 1 つ
  let worst = 0;
  for (const [px, d, h, w] of [
    [0, 7, 10, 10],
    [0, 3, 15, 8],
    [-6, 7, 20, 30],
    [12, 5, 9, 6],
  ]) {
    const b = { x0: -w / 2, y0: d, x1: w / 2, y1: d + 25 };
    const num = skyFactorAt(px, 0, [{ r: b, z: () => h }]);
    const ex = 1 - boxAb(px, 0, b, h);
    worst = Math.max(worst, Math.abs(num - ex));
  }
  ok('天空率: 箱の天空率が式で解いた値と 1e-6 以内', worst < 1e-6, `最大の差 ${worst.toExponential(2)}`);

  // 2-2 道路の天空率(令 135 条の 6・135 条の 9)
  // 敷地 間口 10m(東西)× 奥行 20m、南に幅員 6m の道路。第一種住居・容積率の限度 200% → 勾配 1.25・適用距離 20m
  // 後退距離 a = 1m。測定点 = 道路の反対側の境界線上(y = −6)、間隔 6/2 = 3m 以内 → 10 / 4 = 2.5m 間隔で 5 点
  // 適合建築物: 南の面 y = 1、上端 1.25 ×(6 + 2 × 1)= 10m(起点から 8m)。適用距離の端は 起点から 20m → 敷地の内側 13m まで
  //   奥へ行くほど 高さ / 距離 が下がるので、仰角の最大は前の面の上端 = 「高さ 10m・距離 7m・幅 0〜10m の箱」と同じ式
  // 計画建築物: x = 2〜8m・y = 1〜15m の箱(適用距離の内側 y ≤ 13 だけ数える)
  const r = roadLimit({ ...SB, far: 200, roadW: 6, roadSet: 1 });
  ok('天空率の例: 勾配 1.25・適用距離 20m', r.slope === 1.25 && r.dist === 20 && near(r.limitAtFace, 10));
  const model = (H) => ({
    ew: 10,
    ns: 20,
    bldg: { x0: 2, y0: 1, x1: 8, y1: 15 },
    height: H,
    pent: null,
    roads: { S: { width: 6, park: 0, slope: r.slope, dist: r.dist, slope15From: r.slope15From, diff: 0 } },
    side: null,
    north: null,
  });
  const fitBox = { x0: 0, y0: 1, x1: 10, y1: 13 };
  const planBox = { x0: 2, y0: 1, x1: 8, y1: 13 };
  const hand = (H) =>
    [0, 2.5, 5, 7.5, 10].map((px) => {
      const fit = 1 - boxAb(px, -6, fitBox, 10);
      const plan = 1 - boxAb(px, -6, planBox, H);
      return { px, fit, plan };
    });
  for (const [H, expect] of [
    [14, true],
    [17, false],
  ]) {
    const preps = prepareSky(model(H));
    const [c] = evalSky(preps, H);
    const hh = hand(H);
    const handOk = hh.every((p) => p.plan >= p.fit);
    const diff = Math.max(...c.points.map((p, i) => Math.max(Math.abs(p.fit - hh[i].fit), Math.abs(p.plan - hh[i].plan))));
    ok(`天空率(道路): 測定点 5 点(2.5m 間隔)`, c.points.length === 5 && c.points.every((p, i) => near(p.x, hh[i].px) && near(p.y, -6)), JSON.stringify(c.points.map((p) => [p.x, p.y])));
    ok(`天空率(道路): 高さ ${H}m の計画・適合の天空率が手計算と 1e-6 以内`, diff < 1e-6, `最大の差 ${diff.toExponential(2)}`);
    ok(`天空率(道路): 高さ ${H}m は手計算で${expect ? '通る' : '通らない'}・ツールも同じ`, handOk === expect && c.ok === expect, `手計算 ${handOk} / ツール ${c.ok} / 最小の差 ${c.margin.toFixed(5)}`);
  }
  // 斜線そのもの(面の位置で 10m)は超えているが天空率で通る例になっていること
  ok('天空率(道路): 高さ 14m は斜線(10m)を超えるが天空率で通る', 14 > r.limitAtFace);
}

// ===========================================================================
// 3. 塔屋(令 2 条 1 項 6 号ロ)
// ===========================================================================
{
  // 建築面積 200m² → 1/8 = 25m²
  const inP = { area: 25, height: 4, bldgArea: 200 };
  ok('塔屋 25m²(1/8 ちょうど)は不算入の対象', penthouseCounted(inP, 'road').within);
  ok('塔屋 1/8 以内・高さ 4m: 道路・隣地斜線は算入 0m', penthouseCounted(inP, 'road').counted === 0 && penthouseCounted(inP, 'side').counted === 0);
  ok('塔屋 1/8 以内・高さ 4m: 北側斜線は全部算入 4m', penthouseCounted(inP, 'north').counted === 4);
  ok('塔屋 1/8 以内・高さ 4m: 絶対高さ・日影の対象判定(5m まで不算入)は 0m', penthouseCounted(inP, 'abs').counted === 0 && penthouseCounted(inP, 'shadow10').counted === 0);
  const tall = { area: 25, height: 15, bldgArea: 200 };
  ok('塔屋 1/8 以内・高さ 15m: 斜線は 15 − 12 = 3m、絶対高さは 15 − 5 = 10m を算入', penthouseCounted(tall, 'road').counted === 3 && penthouseCounted(tall, 'abs').counted === 10);
  const over = { area: 26, height: 4, bldgArea: 200 };
  ok('塔屋 26m²(1/8 超え)は全部算入 4m', !penthouseCounted(over, 'road').within && penthouseCounted(over, 'road').counted === 4 && penthouseCounted(over, 'abs').counted === 4);
}

// ===========================================================================
// 4. ボリューム検討(塔屋・令 132 条・天空率)
// ===========================================================================
const VOL = {
  parts: [{ zone: '第一種住居地域', fire: '準防火地域', area: 200, bc: 60, far: 200, bldg: true, roadK: 0.4 }],
  frontPart: 0,
  road1: { dir: 'S', width: 6 },
  road2: null,
  nisetsu: false,
  nisetsuDeemed: 4,
  nisetsuOneSide: false,
  tokutei: false,
  tokuteiL: NaN,
  corner: false,
  fr: 'juntaika',
  siteWidth: 12,
  siteDepth: 16.7,
  roadSet: 1,
  sideSet: 1,
  northDistOverride: null,
  ftf: 3,
  extra: 1,
  basement: 0,
  absHeight: 10,
  kodo: 0,
  note3: false,
  side25: false,
  noneSlope: 1.25,
  shadow: null,
};
{
  const a = calcVolume(VOL);
  // 建築面積 = 建蔽率(60 + 準防火地域の準耐火建築物等 10)% × 200 = 140m²(箱 10 × 14.7 = 147 を奥で引いて合わせる)→ 1/8 = 17.5m²
  ok('ボリューム: 建築面積 140m²', near(a.plan.footprint, 140, 1e-9), String(a.plan.footprint));
  const inP = calcVolume({ ...VOL, pent: { area: 17, height: 3 } });
  const overP = calcVolume({ ...VOL, pent: { area: 18, height: 3 } });
  const roadFloors = (r) => r.constraints.find((c) => c.key === 'road').floors;
  ok('ボリューム: 塔屋 1/8 以内・3m は道路斜線の階数を変えない', roadFloors(inP) === roadFloors(a), `${roadFloors(inP)} / ${roadFloors(a)}`);
  ok('ボリューム: 塔屋 1/8 超え・3m は道路斜線の階数が 1 階減る', roadFloors(overP) === roadFloors(a) - 1, `${roadFloors(overP)} / ${roadFloors(a)}`);
  ok('ボリューム: 塔屋の算入の表が出る', inP.pent && inP.pent.within && !overP.pent.within);

  // 角地(南 6m・東 4m)。東の面は南の道路から 1〜(1 + 14.7)m。区域 min(12, 35) = 12m → 12m より奥は 4m のまま
  const c = calcVolume({ ...VOL, road2: { dir: 'E', width: 4 } });
  const east = c.faces.find((f) => f.kind === 'road' && f.dir === 'E');
  // 4m のまま: 1.25 ×(4 + 2 × 1)= 7.5m
  ok('ボリューム(角地): 東の面は 12m より奥が 4m のまま 7.5m', near(east.limit, 7.5), `${east.limit} ${east.formula}`);
  const c2 = calcVolume({ ...VOL, road2: { dir: 'E', width: 4 }, siteWidth: 12, siteDepth: 11 });
  const east2 = c2.faces.find((f) => f.kind === 'road' && f.dir === 'E');
  // 奥行 11 → 建物の南北 9m → 東の面は 1〜10m で全部 12m 以内 → 6m とみなす 1.25 ×(6 + 2)= 10m
  ok('ボリューム(角地): 東の面が全部 2W 以内なら 6m とみなして 10m', near(east2.limit, 10), `${east2.limit} ${east2.formula}`);

  // 天空率: 既定の入力(第一種住居・6m 道路・容積率 200%)は道路斜線で頭打ち → 天空率の欄が出る
  ok('ボリューム: 斜線で頭打ちなら天空率の結果が出る', a.governing.key === 'far' ? a.sky === null : a.sky !== null, `${a.governing.key} ${a.sky && a.sky.floors}`);
}

// ===========================================================================
// 5. 日影(塔屋の影・区域またがり)と、変更前との比較
// ===========================================================================
const SH = { lat: 35.68, hokkaido: false, bw: 20, bd: 10, bh: 15, rot: 0, plane: 4, setN: 5, setE: 3, setS: 5, setW: 3, wayN: 0, wayE: 0, wayS: 0, wayW: 0, diff: 0 };
{
  const base = computeShadow(SH);
  const withP = computeShadow({ ...SH, pent: { x0: 8, y0: 3, x1: 12, y1: 7, h: 4 } });
  // 塔屋の影の分だけ格子が広がるので、点ごとではなく「日影時間 × 面積」の合計と最大で比べる
  const vol = (r) => r.hours.reduce((s, h) => s + h, 0) * r.step * r.step;
  ok('日影: 塔屋を足すと 日影時間 × 面積 の合計が増える', vol(withP) > vol(base) + 1, `${vol(base).toFixed(1)} → ${vol(withP).toFixed(1)}`);
  ok('日影: 塔屋を足しても最大は減らない', withP.maxFar >= base.maxFar - 1e-6 && withP.maxNear >= base.maxNear - 1e-6);
  // 塔屋の高さ 0 は塔屋なしと同じ
  const zeroP = computeShadow({ ...SH, pent: { x0: 8, y0: 3, x1: 12, y1: 7, h: 0 } });
  ok('日影: 高さ 0 の塔屋は無いのと同じ', zeroP.hours.every((h, k) => h === base.hours[k]));

  // 区域またがり: 2 つ目の区域を遠く(200m 先)に置けば 1 区域と同じ
  const A = { group: 'mid', go: '(一)', plane: 4 };
  const one = computeShadowZones(SH, A, null, null, false, { eave: 15, floors3: false, h10: 15 });
  ok('区域またがり: 1 区域なら computeShadow と同じ最大', near(one.zones[0].maxNear, base.maxNear, 1e-6) && near(one.zones[0].maxFar, base.maxFar, 1e-6));
  // 北の敷地境界線から 6m 先から北は 対象区域外 → 北の 10m 超の範囲(敷地境界線から 10m 超)はすべて対象区域外
  const out = computeShadowZones(SH, A, { group: 'out', go: '', plane: 4 }, { dir: 'N', dist: 6 }, false, { eave: 15, floors3: false, h10: 15 });
  ok('区域またがり: 対象区域外の区域は規制しない', out.zones[1].applies === false && out.zones[1].ngNear === false && out.zones[1].ngFar === false);
  ok('区域またがり: 区域を分けると、もとの区域の最大は 1 区域のとき以下', out.zones[0].maxFar <= one.zones[0].maxFar + 1e-6 && out.zones[0].maxNear <= one.zones[0].maxNear + 1e-6);
  // 北側が低層(測定面 1.5m・(一)3h / 2h)。高さ 15m の建物は対象建築物 → 北の区域に低層の規制を当てる
  const low = computeShadowZones(SH, A, { group: 'low', go: '(一)', plane: 1.5 }, { dir: 'N', dist: 6 }, false, { eave: 15, floors3: false, h10: 15 });
  ok('区域またがり: 北の低層の区域は測定面 1.5m・規制 3h / 2h で判定', low.zones[1].applies && low.zones[1].plane === 1.5 && low.zones[1].near === 3 && low.zones[1].far === 2);
  // 測定面が低いほど影は長い → 同じ点で 1.5m の日影時間 ≥ 4m の日影時間
  const r15 = computeShadow({ ...SH, plane: 1.5, gridPlane: 1.5 });
  const r4 = computeShadow({ ...SH, plane: 4, gridPlane: 1.5 });
  ok('区域またがり: 2 つの測定面で同じ格子になる', r15.nx === r4.nx && r15.ny === r4.ny && r15.x0 === r4.x0);
  ok('区域またがり: 北の区域の時間は 1.5m の測定面で数えている', Math.abs(low.zones[1].maxFar - Math.max(...[...r15.hours].filter((_, k) => low.zoneIdx[k] === 1 && r15.dist[k] > 10))) < 1e-6);
  // 高さ 9m・軒高 9m の建物(10m 以下)は、中高層の区域では対象外。低層の区域に影を落としても対象建築物ではない(低層の区域内に建物がない)
  const small = computeShadowZones({ ...SH, bh: 9 }, A, { group: 'low', go: '(一)', plane: 1.5 }, { dir: 'N', dist: 6 }, false, { eave: 9, floors3: false, h10: 9 });
  ok('区域またがり: 中高層の区域の高さ 9m の建物は対象建築物でない', !small.target && !small.zones[0].applies && !small.zones[1].applies);
}

if (hasOld) {
  const O = (f) => require(path.join(outDir, 'old', f));
  // 日影: 既定の入力で変更前と同じ
  const o = O('shadow.js').computeShadow(SH);
  const n = computeShadow(SH);
  ok('変更前と比較: 日影(既定の入力)の各点の時間が同じ', o.hours.length === n.hours.length && o.hours.every((h, k) => h === n.hours[k]) && o.maxNear === n.maxNear && o.maxFar === n.maxFar);
  const o2 = O('shadow.js').computeShadow({ ...SH, rot: 30, wayS: 6, diff: 2 });
  const n2 = computeShadow({ ...SH, rot: 30, wayS: 6, diff: 2 });
  ok('変更前と比較: 日影(回転・道路・高低差あり)の各点の時間が同じ', o2.hours.every((h, k) => h === n2.hours[k]));
  // ボリューム検討: 道路 1 本・塔屋なしで変更前と同じ
  for (const [name, inp] of [
    ['既定', VOL],
    ['日影あり', { ...VOL, shadow: { group: 'res', go: '(一)', plane: 4, lat: 35.68, hokkaido: false } }],
    ['低層・北道路', { ...VOL, parts: [{ ...VOL.parts[0], zone: '第一種低層住居専用地域', bc: 50, far: 100 }], road1: { dir: 'N', width: 4 } }],
  ]) {
    const a = O('volume.js').calcVolume(inp);
    const b = calcVolume(inp);
    const same =
      a.floors === b.floors &&
      a.achievable === b.achievable &&
      a.height === b.height &&
      JSON.stringify(a.faces) === JSON.stringify(b.faces) &&
      JSON.stringify(a.constraints) === JSON.stringify(b.constraints) &&
      JSON.stringify(a.shadow) === JSON.stringify(b.shadow);
    ok(`変更前と比較: ボリューム検討(${name})の階数・面積・面の高さが同じ`, same, `floors ${a.floors}/${b.floors} area ${a.achievable}/${b.achievable}`);
  }
}

fs.rmSync(outDir, { recursive: true, force: true });

console.log(`テスト: ${pass} pass / ${fail} fail`);
if (failures.length) {
  console.log('');
  failures.forEach((f) => process.stdout.write(f));
  process.exit(1);
}
console.log('すべて通過しました。');
