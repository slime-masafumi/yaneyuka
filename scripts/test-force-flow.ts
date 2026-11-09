// 構造フロービューア（src/lib/forceFlow.ts）のテスト。node scripts/test-force-flow.ts
// 品質基準: 単純梁・片持ち梁の曲げ応力とたわみが理論解の ±5% 以内。リリースごとに実行する。
import { solveFlow, nearestNode, traceStressLines, FlowError, type FlowModel, type FlowResult } from '../src/lib/forceFlow.ts';
import { FLOW_EXAMPLES, FLOW_DISCLAIMER, LEVEL_LABELS, concreteE, estimateLoad, materialPreset } from '../src/lib/forceFlowModel.ts';

let bad = 0;
const pct = (label: string, got: number, want: number, tol = 5) => {
  const e = ((got - want) / want) * 100;
  const ok = Math.abs(e) <= tol;
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${got.toPrecision(5)} (理論 ${want.toPrecision(5)}, 誤差 ${e.toFixed(2)}%)`);
};
const check = (label: string, cond: boolean, note = '') => {
  if (!cond) bad++;
  console.log(`${cond ? 'ok ' : 'NG '} ${label}${note ? ` -> ${note}` : ''}`);
};
const at = (r: FlowResult, f: Float32Array, x: number, y: number) => f[nearestNode(r, x, y)];

const E = 2.05e5;
const nu = 0.3;
const G = E / (2 * (1 + nu));
const base = (over: Partial<FlowModel>): FlowModel => ({
  version: 1,
  width: 3000,
  height: 300,
  thickness: 100,
  material: { kind: 'steel', label: 't', E, nu, ft: 235, fc: 235, density: 77, criterion: 'mises' },
  zones: [],
  supports: [],
  loads: [],
  selfWeight: false,
  mesh: 'standard',
  ...over,
});
const I = (t: number, h: number) => (t * h ** 3) / 12;
const Z = (t: number, h: number) => (t * h ** 2) / 6;
const KAPPA = 5 / 6;

// 片持ち梁（等分布）
{
  const L = 3000, h = 300, t = 100, q = 10;
  const r = solveFlow(base({ width: L, height: h, thickness: t, supports: [{ id: 's', edge: 'left', from: 0, to: h, type: 'fixed' }], loads: [{ id: 'l', kind: 'line', y: h, x0: 0, x1: L, q }] }));
  const delta = (q * L ** 4) / (8 * E * I(t, h)) + (q * L ** 2) / (2 * KAPPA * G * t * h);
  pct('片持ち梁 等分布 先端たわみ', Math.abs(at(r, r.uy, L, h / 2)), delta);
  pct('片持ち梁 等分布 中央の上端 σx', at(r, r.sx, L / 2, h), (q * (L / 2) ** 2) / 2 / Z(t, h));
  pct('片持ち梁 等分布 中央の下端 σx', -at(r, r.sx, L / 2, 0), (q * (L / 2) ** 2) / 2 / Z(t, h));
}

// 片持ち梁（先端集中）
{
  const L = 3000, h = 300, t = 100, P = 20;
  const r = solveFlow(base({ width: L, height: h, thickness: t, supports: [{ id: 's', edge: 'left', from: 0, to: h, type: 'fixed' }], loads: [{ id: 'l', kind: 'point', x: L, y: h / 2, fx: 0, fy: P }] }));
  const p = P * 1000;
  const delta = (p * L ** 3) / (3 * E * I(t, h)) + (p * L) / (KAPPA * G * t * h);
  pct('片持ち梁 先端集中 先端たわみ', Math.abs(at(r, r.uy, L, h)), delta);
  pct('片持ち梁 先端集中 中央の上端 σx', at(r, r.sx, L / 2, h), (p * (L / 2)) / Z(t, h));
  check('片持ち梁 スパンは張り出し長さ', r.summary.deflection.span === L, String(r.summary.deflection.span));
}

// 単純梁（等分布）
{
  const L = 6000, h = 400, t = 150, q = 20;
  const r = solveFlow(base({
    width: L, height: h, thickness: t,
    supports: [{ id: 'a', edge: 'bottom', from: 0, to: 0, type: 'pin' }, { id: 'b', edge: 'bottom', from: L, to: L, type: 'roller' }],
    loads: [{ id: 'l', kind: 'line', y: h, x0: 0, x1: L, q }],
  }));
  const M = (q * L ** 2) / 8;
  const delta = (5 * q * L ** 4) / (384 * E * I(t, h)) + M / (KAPPA * G * t * h);
  pct('単純梁 等分布 中央たわみ', Math.abs(at(r, r.uy, L / 2, h / 2)), delta);
  pct('単純梁 等分布 中央の下端 σx', at(r, r.sx, L / 2, 0), M / Z(t, h));
  pct('単純梁 反力の合計 = 荷重', r.summary.reaction.fy, (q * L) / 1000, 0.001);
  const c = r.summary.deflection;
  pct('単純梁 スパン/たわみ', c.spanRatio as number, L / c.vertical.value, 0.01);
}

// 薄い梁（H/L = 1/40）でも曲げが硬く出ない（Q6 の確認）
{
  const L = 8000, h = 200, t = 100, q = 2;
  const r = solveFlow(base({
    width: L, height: h, thickness: t, mesh: 'coarse',
    supports: [{ id: 'a', edge: 'bottom', from: 0, to: 0, type: 'pin' }, { id: 'b', edge: 'bottom', from: L, to: L, type: 'roller' }],
    loads: [{ id: 'l', kind: 'line', y: h, x0: 0, x1: L, q }],
  }));
  pct('薄い梁 中央たわみ（粗いメッシュ）', Math.abs(at(r, r.uy, L / 2, h / 2)), (5 * q * L ** 4) / (384 * E * I(t, h)) + (q * L ** 2) / 8 / (KAPPA * G * t * h));
}

// 一様引張のパッチテスト（x 方向・y 方向の並びの両方）
for (const [W, H] of [[1000, 500], [500, 1000]] as const) {
  const r = solveFlow(base({
    width: W, height: H, thickness: 10,
    supports: [{ id: 'a', edge: 'left', from: 0, to: H, type: 'roller' }, { id: 'b', edge: 'bottom', from: 0, to: 0, type: 'roller' }],
    loads: [{ id: 'l', kind: 'point', x: W, y: 0, fx: 0, fy: 0 }],
  }));
  check(`無荷重では応力ゼロ（${W}×${H}）`, Math.abs(r.summary.tension.value) < 1e-6);
}
{
  // 引張は右端の両端支持で再現する。右端を x 方向に等分布で引くのと同等の節点力を置く
  const W = 1000, H = 400, t = 10, p = 50; // N/mm²
  const ny = 20; // 標準メッシュ: 短辺 20 分割
  const per = (p * H * t) / ny / 1000; // kN
  const loads: FlowModel['loads'] = [];
  for (let j = 0; j <= ny; j++) {
    loads.push({ id: `p${j}`, kind: 'point', x: W, y: (j * H) / ny, fx: j === 0 || j === ny ? per / 2 : per, fy: 0 });
  }
  const r = solveFlow(base({
    width: W, height: H, thickness: t, loads,
    supports: [{ id: 'a', edge: 'left', from: 0, to: H, type: 'roller' }, { id: 'b', edge: 'bottom', from: 0, to: 0, type: 'pin' }],
  }));
  pct('一様引張 中央 σx', at(r, r.sx, W / 2, H / 2), p, 0.01);
  pct('一様引張 伸び', at(r, r.ux, W, H / 2), (p * W) / E, 0.01);
  pct('一様引張 ポアソン収縮', -at(r, r.uy, W / 2, H), (nu * p * H) / E, 0.01);
}

// 自重と反力
{
  const r = solveFlow(base({ selfWeight: true, width: 2000, height: 1000, thickness: 200, supports: [{ id: 'a', edge: 'bottom', from: 0, to: 2000, type: 'fixed' }] }));
  pct('自重の合計', r.summary.reaction.fy, 77e-6 * 200 * 2000 * 1000 / 1000, 0.001);
}

// 水平力は反力と釣り合い、層間変形が出る
{
  const r = solveFlow(base({
    width: 3000, height: 3000, thickness: 200, supports: [{ id: 'a', edge: 'bottom', from: 0, to: 3000, type: 'fixed' }],
    loads: [{ id: 'l', kind: 'shear', y: 3000, H: 100 }],
  }));
  pct('水平力と反力', -r.summary.reaction.fx, 100, 0.001);
  check('水平力があるとスパン比は出さない', r.summary.deflection.spanRatio === null);
  check('水平力があると H/δ を出す', (r.summary.deflection.driftRatio ?? 0) > 0);
}

// 開口があると梁は柔らかくなる
{
  const m = (zones: FlowModel['zones']) => base({
    width: 6000, height: 600, thickness: 200, zones,
    supports: [{ id: 'a', edge: 'left', from: 0, to: 600, type: 'fixed' }, { id: 'b', edge: 'right', from: 0, to: 600, type: 'fixed' }],
    loads: [{ id: 'l', kind: 'line', y: 600, x0: 0, x1: 6000, q: 30 }],
  });
  const a = solveFlow(m([]));
  const b = solveFlow(m([{ id: 'z', kind: 'opening', shape: 'rect', x: 2000, y: 150, w: 2000, h: 300 }]));
  check('開口でたわみが増える', b.summary.deflection.vertical.value > a.summary.deflection.vertical.value * 1.2, `${a.summary.deflection.vertical.value.toFixed(3)} → ${b.summary.deflection.vertical.value.toFixed(3)} mm`);
  check('入隅が応力集中部になる', b.flag.some((v) => v) && b.summary.concentration > b.summary.tension.value);
}

// 柱は開口より優先し、厚さの増えた部分は変形が小さくなる
{
  const m = (t?: number) => base({
    width: 3000, height: 3000, thickness: 100,
    zones: t ? [{ id: 'c', kind: 'column', shape: 'rect', x: 0, y: 0, w: 3000, h: 3000, t }] : [],
    supports: [{ id: 'a', edge: 'bottom', from: 0, to: 3000, type: 'fixed' }],
    loads: [{ id: 'l', kind: 'shear', y: 3000, H: 100 }],
  });
  const a = solveFlow(m());
  const b = solveFlow(m(200));
  pct('厚さ 2 倍で水平変位 1/2', a.summary.deflection.horizontal.value / b.summary.deflection.horizontal.value, 2, 0.001);
}

// 異常系
const throws = (label: string, m: FlowModel) => {
  try {
    solveFlow(m);
    check(label, false, '例外が出ない');
  } catch (e) {
    check(label, e instanceof FlowError, (e as Error).message);
  }
};
throws('支点が足りないと止まる', base({ supports: [{ id: 'a', edge: 'bottom', from: 0, to: 0, type: 'roller' }] }));
throws('支点なしは止まる', base({ supports: [] }));
throws('開口が全面だと止まる', base({ supports: [{ id: 'a', edge: 'left', from: 0, to: 300, type: 'fixed' }], zones: [{ id: 'z', kind: 'opening', shape: 'rect', x: 0, y: 0, w: 3000, h: 300 }] }));
{
  const r = solveFlow(base({
    width: 2000, height: 1000,
    supports: [{ id: 'a', edge: 'left', from: 0, to: 1000, type: 'fixed' }],
    zones: [{ id: 'z', kind: 'opening', shape: 'rect', x: 900, y: 0, w: 200, h: 1000 }],
  }));
  check('切り離された部分は外して警告', r.warnings.length > 0 && r.active.reduce((s, v) => s + v, 0) < r.nx * r.ny / 2 + 1);
}

// 材料・積算
pct('Fc24 γ23 の E', concreteE(24, 23), 2.27e4, 0.5);
check('RC 既定値', materialPreset('rc').E === Math.round(concreteE(24, 23)) && materialPreset('rc').nu === 0.2);
{
  const e = estimateLoad({ use: 'office', structure: 'rc', floors: 3, tributary: 5 });
  pct('簡易積算 q', e.q, (7 + 1.8) * 5 * 3, 0.001);
  pct('簡易積算 水平力', e.shear(6000), 0.2 * (7 + 0.8) * 5 * 3 * 6, 1);
}

// 例題がすべて解け、主応力線が出る
for (const ex of FLOW_EXAMPLES) {
  const r = solveFlow(ex.model);
  const c = traceStressLines(r, 2, Math.max(r.W, r.H) / 70);
  check(`例題 ${ex.label}`, r.summary.compression.value > 0 && c.lines.length > 0, `${r.elements} 要素 ${r.ms.toFixed(0)}ms 引張 ${r.summary.tension.value.toFixed(2)} 圧縮 ${r.summary.compression.value.toFixed(2)} δv ${r.summary.deflection.vertical.value.toFixed(2)}mm 線 ${c.lines.length} 本`);
  pct(`例題 ${ex.label} 鉛直の釣り合い`, r.summary.reaction.fy, r.summary.load.fy, 0.01);
}

// 判定と読める言葉を出力物に入れない
{
  const text = [FLOW_DISCLAIMER, ...LEVEL_LABELS, ...FLOW_EXAMPLES.map((e) => e.hint)].join(' ');
  check('OK/NG・安全/危険を使っていない', !/\bOK\b|\bNG\b|安全|危険/.test(text));
}

// 性能の実測（基準: 2 万要素で 1 秒以内。合否にはしない）
{
  const r = solveFlow(base({
    // 短辺 60 分割（メッシュの最大の細かさ）× 長辺 330 ≒ 2 万要素
    width: 33000, height: 6000, thickness: 200, mesh: 'fine',
    zones: [{ id: 'z', kind: 'opening', shape: 'rect', x: 4000, y: 0, w: 300, h: 2000 }],
    supports: [{ id: 'a', edge: 'bottom', from: 0, to: 33000, type: 'fixed' }],
    loads: [{ id: 'l', kind: 'line', y: 6000, x0: 0, x1: 33000, q: 50 }],
  }));
  console.log(`-- 性能: ${r.elements} 要素 / ${r.dofs} 自由度 / 帯幅 ${r.bandwidth} / ${r.ms.toFixed(0)} ms`);
}

console.log(bad ? `\n${bad} 件 NG` : '\nすべて OK');
process.exit(bad ? 1 : 0);
