// 埋設管の耐荷重（src/lib/pipeLoad.ts）のテスト。  node scripts/test-pipe-load.ts
// 期待値は「ヒューム管設計施工要覧」の表・計算例、JIS A 5372 の表から取っている。
import { liveLoad, impactFactor, marstonCd, checkPipe, coverRange, wheelLoad } from '../src/lib/pipeLoad.ts';

let bad = 0;
const near = (label: string, got: number, want: number, tol: number) => {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${got.toFixed(3)} (want ${want}±${tol})`);
};
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};

// 要覧 表2.2.2.1-3（T-25、後輪 100kN）。土被り 1m 以上は車線幅の式がそのまま出る
near('活荷重 H=1.0', liveLoad(100, 1.0), 44.63, 0.01);
near('活荷重 H=2.0', liveLoad(100, 2.0), 22.6, 0.01);
near('活荷重 H=3.0', liveLoad(100, 3.0), 14.25, 0.01);
near('活荷重 H=5.0', liveLoad(100, 5.0), 7.38, 0.01);
near('活荷重 H=0.5（表と同じ）', liveLoad(100, 0.5), 81.82, 0.01);
// 浅いときは1輪直下の方が大きい
check('H=0.3 は1輪の方が大きい', liveLoad(100, 0.3) > (2 * 100 * 1.5 * 0.9) / (2.75 * 0.8), true);
near('衝撃係数 H=2.6（計算例 0.39）', impactFactor(2.6), 0.39, 1e-9);
check('車両なしは0', liveLoad(0, 1), 0);
near('10tトラックは後輪 80kN', wheelLoad(20), 80, 1e-9);

// 計算例1 の活荷重（H=2.6 → 16.85 kN/m²）
near('計算例の活荷重', liveLoad(100, 2.6), 16.85, 0.01);
// マーストン Cd: Kμ=0.1924
near('Cd（H=1.2, Bd=0.96）', marstonCd(1.2, 0.96), 0.9928, 0.001);

// JIS A 5372: 呼び1000 1種の Mcr 7.97 は、要覧 計算例の ひび割れ試験荷重 41.3kN/m から出る値と一致
near('Mcr = 0.318·Pc·r + 0.239·W·r', 0.318 * 41.3 * 0.541 + 0.239 * 6.69 * 0.541, 7.97, 0.01);

// ヒューム管 呼び300 1種・砂基礎90°・土被り1.2m・T-25 → S ≒ 1.34（手計算）
{
  const r = checkPipe({ kind: 'HP1', size: 300, cover: 1.2, vehicle: 't25', bedding: 'sand90' })!;
  near('HP300 1種 S', r.checks[0].value, 1.34, 0.02);
  check('HP300 1種 は OK', r.ok, true);
}
// 同じ条件で土被り 0.3m は NG（1輪の荷重が集中する）。0.5m なら S≒1.07 で通る
check('HP300 1種 土被り0.3m は NG', checkPipe({ kind: 'HP1', size: 300, cover: 0.3, vehicle: 't25', bedding: 'sand90' })!.ok, false);
check('2種は1種より強い', checkPipe({ kind: 'HP2', size: 300, cover: 0.5, vehicle: 't25', bedding: 'sand90' })!.checks[0].value > checkPipe({ kind: 'HP1', size: 300, cover: 0.5, vehicle: 't25', bedding: 'sand90' })!.checks[0].value, true);

// VU150・有効60°・土被り1.0m・T-25（手計算: σ 8.70 N/mm²、たわみ率 2.50%）
{
  const r = checkPipe({ kind: 'VU', size: 150, cover: 1.0, vehicle: 't25', bedding: 'pvc60' })!;
  near('VU150 曲げ応力', r.checks[0].value, 8.70, 0.05);
  near('VU150 たわみ率', r.checks[1].value, 2.50, 0.03);
  check('VU150 は OK', r.ok, true);
}
// VU300 は VP300 より弱い
{
  const vu = checkPipe({ kind: 'VU', size: 300, cover: 0.6, vehicle: 't25', bedding: 'pvc60' })!;
  const vp = checkPipe({ kind: 'VP', size: 300, cover: 0.6, vehicle: 't25', bedding: 'pvc60' })!;
  check('VU300 のたわみ率 > VP300', vu.checks[1].value > vp.checks[1].value, true);
}
// 乗用車だけなら浅くても通る
check('VU100 土被り0.3m・乗用車は OK', checkPipe({ kind: 'VU', size: 100, cover: 0.3, vehicle: 't2', bedding: 'pvc60' })!.ok, true);
// 土被りの範囲
{
  const rg = coverRange({ kind: 'HP1', size: 300, vehicle: 't25', bedding: 'sand90' });
  check('HP300 1種 の範囲は取れる', rg.min !== null && rg.max !== null && rg.min < 1.2 && rg.max >= 1.2, true);
}

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
