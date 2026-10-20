// 設計ツール「結露検討」の計算（src/lib/condensation.ts）のテスト。  node scripts/test-condensation.ts
import {
  DEFAULT_MATERIALS, PRESETS, calculateProfile, findLimitTemp, buildFixes, evaluateFixes, dewPoint, satPressure,
  satPressureWater, vaporPressure, interfaceLabel, toStoredMaterials, fromStoredMaterials, migrateLegacyMaterials,
  type Conditions, type Layer,
} from '../src/lib/condensation.ts';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};
const r1 = (v: number) => Math.round(v * 10) / 10;
const M = DEFAULT_MATERIALS;
let seq = 0;
const preset = (key: string): Layer[] => PRESETS[key].layers.map((l) => ({ ...l, id: `p${++seq}` }));
const cond = (key: string, o: Partial<Conditions>): Conditions => ({
  ti: 20, rhi: 50, te: 0, rhe: 80, rsi: PRESETS[key].rsi, rse: PRESETS[key].rse, isSlab: PRESETS[key].part === 'slab', ...o,
});
const newId = () => `n${++seq}`;

// --- 湿り空気
check('0℃の飽和水蒸気圧は水面・氷面とも 610.78Pa', [r1(satPressure(0)), r1(satPressureWater(0))], [610.8, 610.8]);
check('露点は飽和圧の逆関数（15℃）', r1(dewPoint(satPressure(15))), 15);
check('霜点も逆関数（−5℃）', r1(dewPoint(satPressure(-5))), -5);
check('20℃50% の露点 ≒ 9.3℃', r1(dewPoint(vaporPressure(20, 50))), 9.3);
check('氷点下は氷面で判定するので水面より飽和圧が低い', satPressure(-10) < satPressureWater(-10), true);

// --- 木造外壁（通気工法）: 結露しない・通気層より外は除外
{
  const L = preset('wall_wood');
  const p = calculateProfile(L, cond('wall_wood', { ti: 22, te: 0 }), M);
  check('木造外壁 U値', p.uValue.toFixed(2), '0.32');
  check('木造外壁 結露しない', p.isCondensing, false);
  check('木造外壁 通気層より外は除外', p.layers.map((l) => l.excluded), [true, true, false, false, false, false, false]);
  check('木造外壁 通気層側の Rse は Rsi と同じ', p.rseUsed, 0.11);
  check('木造外壁 外側 2 つの界面は判定しない', p.interfaces.slice(0, 2).map((f) => f.status), ['vent', 'vent']);
  check('木造外壁 通気層の内側の面は判定する', p.interfaces[2].status, 'ok');
  check('木造外壁 −30℃でも結露しない', findLimitTemp(L, cond('wall_wood', { ti: 22 }), M), null);
}

// --- 空気層は厚さによらず R 0.09
{
  const p = calculateProfile([{ id: 'a', materialId: 'air_stat', thickness: 100 }], cond('wall_s', {}), M);
  check('密閉空気層 100mm の R は 0.09', p.layers[0].r, 0.09);
}

// --- S造シングル折板: 結露する → 天井裏の換気で解消
{
  const L = preset('roof_s');
  const c = cond('roof_s', { ti: 22, rhi: 40, te: 1, rhe: 55 });
  const p = calculateProfile(L, c, M);
  check('折板 結露する', p.isCondensing, true);
  check('折板 最も厳しいのは屋根裏面', interfaceLabel(p, p.worst!.k, '室外'), '金属屋根(鋼板) ｜ ペフ(ポリエチレンフォーム)');
  check('折板 室内表面は結露しない', p.surface.status, 'ok');
  const fx = evaluateFixes(buildFixes(L, p, c, 'roof', M, newId), L, c, M);
  check('折板 いちばん効く対策は天井裏の換気', fx[0].fix.key, 'vent-air');
  check('折板 天井裏の換気で結露しない', fx[0].result.isCondensing, false);
  check('折板 防湿シートだけでは解消しない', fx.find((f) => f.fix.key === 'vb')!.result.isCondensing, true);
}

// --- RC 内断熱: 密着にすると判定から外れる
{
  const L = preset('wall_rc');
  const c = cond('wall_rc', { ti: 20, rhi: 50, te: 1, rhe: 55 });
  const p = calculateProfile(L, c, M);
  check('RC内断熱 コンクリート｜ウレタンで結露', interfaceLabel(p, p.worst!.k, '室外'), 'コンクリート ｜ 硬質ウレタンフォーム 1種');
  const fx = evaluateFixes(buildFixes(L, p, c, 'wall', M, newId), L, c, M);
  check('RC内断熱 密着と防湿シートが効く', fx.filter((f) => !f.result.isCondensing).map((f) => f.fix.key).sort(), ['bond', 'vb']);
}

// --- 土間
{
  const summer = (k: string) => cond(k, { ti: 28, rhi: 75, te: 18, rhe: 100, rse: 0 });
  const winter = (k: string) => cond(k, { ti: 20, rhi: 50, te: 10, rhe: 100, rse: 0 });
  const plainS = calculateProfile(preset('slab_plain'), summer('slab_plain'), M);
  check('土間 断熱なし 夏は表面結露', [plainS.isCondensing, plainS.worst!.k === plainS.layers.length], [true, true]);
  check('土間 断熱なし 夏の表面温度 21.9℃・露点 23.1℃', [r1(plainS.surface.temp), r1(plainS.surface.dewPoint)], [21.9, 23.1]);
  check('土間 防湿フィルムより地盤側は判定しない', plainS.interfaces.slice(0, 2).map((f) => f.status), ['ground', 'ground-ng']);
  check('土間 断熱なし 冬は結露しない', calculateProfile(preset('slab_plain'), winter('slab_plain'), M).isCondensing, false);
  check('土間 スラブ下XPS 夏も結露しない', calculateProfile(preset('slab_xps'), summer('slab_xps'), M).isCondensing, false);
  const fl = calculateProfile(preset('slab_floor'), summer('slab_floor'), M);
  check('土間 置床 夏は床下（土間コンの上面）で内部結露', interfaceLabel(fl, fl.worst!.k, '地盤'), 'コンクリート ｜ 密閉空気層');
  const L = preset('slab_plain');
  const fx = evaluateFixes(buildFixes(L, plainS, summer('slab_plain'), 'slab', M, newId), L, summer('slab_plain'), M);
  check('土間 スラブ下断熱で解消', fx[0].fix.key, 'slab-ins');
  check('土間 地盤の熱抵抗を入れると表面は暖かくなる', calculateProfile(L, { ...summer('slab_plain'), rse: 1 }, M).surface.temp > plainS.surface.temp, true);
}

// --- 材料DBの保存（差分だけ）
{
  const edited = M.map((m) => (m.id === 'gb' ? { ...m, lambda: 0.3 } : m));
  const stored = toStoredMaterials([...edited, { id: 'custom_1', name: '自作', lambda: 0.1, mu: 5, category: 'board' }]);
  check('保存は変えた値と自作材料だけ', [Object.keys(stored.overrides), stored.custom.length], [['gb'], 1]);
  check('読み込むと既定値に差分が重なる', fromStoredMaterials(stored).find((m) => m.id === 'gb')!.lambda, 0.3);
  const legacy = M.map((m) => (m.id === 'ecp' ? { ...m, lambda: 1.0 } : m.id === 'breathable' ? { ...m, mu: 0.5 } : m));
  check('旧形式の旧既定値はユーザー編集とみなさない', Object.keys(migrateLegacyMaterials(legacy).overrides), []);
}

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
