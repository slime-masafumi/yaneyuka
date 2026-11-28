// 日影図(src/lib/shadowDiagram.ts)のテスト。  node scripts/test-shadow-diagram.ts
import { computeDiagram, timeShadows, chain, parseDxf, writeDxf, heightFromText, unitScale, shadowVec, polyArea, contour } from '../src/lib/shadowDiagram.ts';
import { computeShadow } from '../src/lib/shadow.ts';

let bad = 0;
const near = (label: string, got: number, want: number, tol: number) => {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${got.toFixed(4)} (want ${want.toFixed(4)} ±${tol})`);
};
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};

// 1) 正午の影は真北へ。真北が図面の右(90°)なら影は +x
{
  const o = shadowVec(35.68, 12, 0)!;
  near('正午 x', o[0], 0, 1e-9);
  check('正午 北へ', o[1] > 0, true);
  const o2 = shadowVec(35.68, 12, 90)!;
  check('真北 90° で +x', o2[0] > 0 && Math.abs(o2[1]) < 1e-9, true);
  // 冬至の東京の正午 太陽高度 = 90 − 35.68 − 23.44 = 30.88° → 影の長さ 1/tan = 1.674
  near('正午の影の長さ', o[1], 1 / Math.tan((30.88 * Math.PI) / 180), 1e-3);
  // 8 時は北西へ
  const o8 = shadowVec(35.68, 8, 0)!;
  check('8 時 北西', o8[0] < 0 && o8[1] > 0, true);
}

// 2) 直方体は既存の日影規制(computeShadow)と同じ最大時間になる
{
  const bw = 20, bd = 10, bh = 15;
  const sN = 5, sE = 3, sS = 5, sW = 3;
  const old = computeShadow({ lat: 35.68, hokkaido: false, bw, bd, bh, rot: 0, plane: 4, setN: sN, setE: sE, setS: sS, setW: sW });
  const r = computeDiagram({
    lat: 35.68,
    hokkaido: false,
    northDeg: 0,
    plane: 4,
    site: [[-sW, -sS], [bw + sE, -sS], [bw + sE, bd + sN], [-sW, bd + sN]],
    blocks: [{ poly: [[0, 0], [bw, 0], [bw, bd], [0, bd]], top: bh }],
    stepMin: 10,
    maxCells: 120000,
  });
  near('5〜10m の最大(既存と比べる)', r.maxNear, old.maxNear, 0.34);
  near('10m 超の最大(既存と比べる)', r.maxFar, old.maxFar, 0.34);
  console.log(`   参考: 既存 ${old.maxNear.toFixed(2)} / ${old.maxFar.toFixed(2)}、新 ${r.maxNear.toFixed(2)} / ${r.maxFar.toFixed(2)}、格子 ${r.grid.step} m`);
}

// 3) 正午の影の輪郭: 10×10・高さ 10 の箱 → 影は南北 10 + 10×1.674×... の長方形 1 つ(閉じた輪)
{
  const v = { lat: 35.68, hokkaido: false, northDeg: 0, plane: 0, site: null, blocks: [{ poly: [[0, 0], [10, 0], [10, 10], [0, 10]] as [number, number][], top: 10 }], stepMin: 10, maxCells: 20000 };
  const ts = timeShadows(v, 60).find((x) => Math.abs(x.t - 12) < 1e-9)!;
  const loops = chain(ts.segs);
  check('正午の輪郭は 1 つの閉じた輪', loops.length === 1 && loops[0].closed, true);
  const L = 10 / Math.tan((30.88 * Math.PI) / 180);
  near('正午の影の面積 = 10 × (10 + 影の長さ)', Math.abs(polyArea(loops[0].pts)), 10 * (10 + L), 0.05);
}

// 4) L 形(凹んだ形)の影の輪郭も閉じる
{
  const v = { lat: 35.68, hokkaido: false, northDeg: 15, plane: 4, site: null, blocks: [{ poly: [[0, 0], [20, 0], [20, 8], [8, 8], [8, 18], [0, 18]] as [number, number][], top: 14 }, { poly: [[2, 2], [6, 2], [6, 6], [2, 6]] as [number, number][], top: 20, bottom: 14 }], stepMin: 10, maxCells: 20000 };
  for (const x of timeShadows(v, 60)) {
    const loops = chain(x.segs);
    check(`L 形 ${x.t} 時: 輪郭はすべて閉じる`, loops.every((l) => l.closed), true);
  }
}

// 5) 等値線: 円すい状の値の等値線は円
{
  const g = { x0: -10, y0: -10, step: 0.5, nx: 40, ny: 40 };
  const vals = new Float32Array(40 * 40);
  for (let j = 0; j < 40; j++) for (let i = 0; i < 40; i++) vals[j * 40 + i] = 10 - Math.hypot(-10 + (i + 0.5) * 0.5, -10 + (j + 0.5) * 0.5);
  const loops = chain(contour(vals, g, 5));
  check('等値線は閉じた輪 1 つ', loops.length === 1 && loops[0].closed, true);
  near('半径 5 の円の面積', Math.abs(polyArea(loops[0].pts)), Math.PI * 25, 0.6);
}

// 6) DXF: 書き出して読み直すと同じ形。mm の図面は倍率 0.001
{
  const dxf = writeDxf([{ name: 'BLDG', color: 7 }], [{ type: 'poly', layer: 'BLDG', pts: [[0, 0], [12.5, 0], [12.5, 8], [0, 8]], closed: true }, { type: 'text', layer: 'BLDG', at: [1, 1], h: 0.5, text: 'H=12.5' }], 0.001);
  const r = parseDxf(dxf);
  check('読み直した形の数', r.shapes.length, 1);
  check('閉じている', r.shapes[0].closed, true);
  near('x(mm)', r.shapes[0].pts[1][0], 12500, 1e-6);
  check('文字', r.texts[0].text, 'H=12.5');
  check('単位の推定 mm', unitScale(null, r.shapes).label, 'mm');
}
// LWPOLYLINE と bulge(半円)・LINE のつなぎ
{
  const lw = ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '6', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES',
    '0', 'LWPOLYLINE', '8', 'A', '90', '2', '70', '1', '10', '0', '20', '0', '42', '1', '10', '10', '20', '0', '42', '1',
    '0', 'LINE', '8', 'B', '10', '0', '20', '0', '11', '5', '21', '0',
    '0', 'LINE', '8', 'B', '10', '5', '20', '0', '11', '5', '21', '5',
    '0', 'LINE', '8', 'B', '10', '0', '20', '5', '11', '5', '21', '5',
    '0', 'LINE', '8', 'B', '10', '0', '20', '0', '11', '0', '21', '5',
    '0', 'ENDSEC', '0', 'EOF'].join('\n');
  const r = parseDxf(lw);
  check('$INSUNITS = 6(m)', r.insUnits, 6);
  const circ = r.shapes.find((s) => s.layer === 'A')!;
  near('bulge 2 つ = 直径 10 の円の面積', Math.abs(polyArea(circ.pts)), Math.PI * 25, 1.2);
  const sq = r.shapes.find((s) => s.layer === 'B')!;
  check('LINE 4 本が閉じた四角に', sq.closed && sq.pts.length === 4, true);
  near('四角の面積', Math.abs(polyArea(sq.pts)), 25, 1e-9);
}
check('高さ H=12.5', heightFromText('H=12.5'), 12.5);
check('高さ 最高高さ 31.0', heightFromText('最高高さ 31.0'), 31);
check('高さ 9.8m', heightFromText('9.8m'), 9.8);
check('高さ 室名は拾わない', heightFromText('事務室'), null);

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
