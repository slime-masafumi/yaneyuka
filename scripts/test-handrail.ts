// 手すり強度(src/lib/handrail.ts)のテスト。  node scripts/test-handrail.ts
import { sectionProps, checkHandrail, maxPitch, maxHeight, maxLoad, required, pickSections } from '../src/lib/handrail.ts';

let bad = 0;
const near = (label: string, got: number, want: number, tolRel: number) => {
  const ok = Math.abs(got - want) <= Math.abs(want) * tolRel;
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${got.toFixed(3)} (want ${want} ±${tolRel * 100}%)`);
};
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};

// JIS G 3466 角形鋼管の表: □-50×50×2.3 A 4.252 cm²・I 15.9 cm⁴・Z 6.34 cm³ / □-100×100×3.2 A 12.13・I 187・Z 37.5
{
  const p = sectionProps({ kind: 'box', b: 50, d: 50, t: 2.3 })!;
  near('□50×2.3 A', p.A, 425.2, 0.02);
  near('□50×2.3 I', p.I, 159000, 0.03);
  near('□50×2.3 Z', p.Z, 6340, 0.03);
  const q = sectionProps({ kind: 'box', b: 100, d: 100, t: 3.2 })!;
  near('□100×3.2 I', q.I, 1870000, 0.03);
  near('□100×3.2 Z', q.Z, 37500, 0.03);
}
// JIS G 3444 鋼管: 48.6×2.3 I 8.99 cm⁴・Z 3.70 cm³ / 60.5×3.2 I 23.7・Z 7.84
{
  const p = sectionProps({ kind: 'pipe', d: 48.6, t: 2.3 })!;
  near('○48.6×2.3 I', p.I, 89900, 0.01);
  near('○48.6×2.3 Z', p.Z, 3700, 0.01);
  near('○60.5×3.2 Z', sectionProps({ kind: 'pipe', d: 60.5, t: 3.2 })!.Z, 7840, 0.01);
}
// FB 12×75: I = 12×75³/12 = 421,875、Z = 11,250
near('FB12×75 Z', sectionProps({ kind: 'flat', b: 12, d: 75 })!.Z, 11250, 1e-9);

// 手計算: 支柱 FB12×75(SS400 短期 235)、ピッチ 1,000・高さ 1,100・w = 2,950 N/m
//   M = 2.95×1000×1100 = 3,245,000 N·mm、σ = 3,245,000 / 11,250 = 288.4 → 超える
{
  const post = sectionProps({ kind: 'flat', b: 12, d: 75 })!;
  const base = { H: 1100, w: 2950, ws: 295, wv: null, post, rail: null, F: 235, E: 205000, term: 'short' as const };
  const r = checkHandrail({ ...base, L: 1000 });
  near('σ 支柱', r.checks[0].value, 288.44, 0.001);
  check('超える', r.worst.ratio > 1, true);
  // 逆算: 最大ピッチ = 235×11,250×1000 / (2950×1100) = 814.7 mm
  const mp = maxPitch(base);
  near('最大ピッチ', mp.value, 814.7, 0.001);
  // その値で順算すると比 1
  near('最大ピッチで比 1', checkHandrail({ ...base, L: mp.value }).worst.ratio, 1, 1e-6);
  const mh = maxHeight({ ...base, L: 1000 });
  near('最大高さで比 1', checkHandrail({ ...base, L: 1000, H: mh.value }).worst.ratio, 1, 1e-6);
  const ml = maxLoad({ ...base, L: 1000, ws: 295 });
  near('耐えられる荷重', ml.value, (235 * 11250 * 1000) / (1000 * 1100), 1e-9);
  // 必要断面: Z = 3,245,000 / 235 = 13,809
  const rq = required({ ...base, L: 1000 });
  near('必要 Z', rq.postZ, 13808.5, 0.001);
  const picks = pickSections({ Z: rq.postZ, I: rq.postI }, 7.85, 'flat');
  check('FB で最も軽いもの', picks[0] && `${picks[0].shape.kind}`, 'flat');
  check('選んだ FB は必要 Z 以上', picks.every((p) => p.props.Z >= rq.postZ), true);
}
// 笠木: 単純梁 4 等分点 2 線荷重、δ = 11wL⁴/768EI
{
  const rail = sectionProps({ kind: 'pipe', d: 48.6, t: 2.3 })!;
  const post = sectionProps({ kind: 'box', b: 50, d: 50, t: 2.3 })!;
  const r = checkHandrail({ L: 1500, H: 1100, w: 1450, ws: 295, wv: 1600, post, rail, F: 235, E: 205000, term: 'short' });
  const rs = r.checks.find((c) => c.key === 'rail-s')!;
  near('笠木 σ', rs.value, (1450 * 1.5 * 1500) / 8 / rail.Z, 1e-9);
  const rd = r.checks.find((c) => c.key === 'rail-d')!;
  near('笠木 δ', rd.value, (11 * 0.295 * 1500 ** 4) / (768 * 205000 * rail.I), 1e-9);
  const mp = maxPitch({ H: 1100, w: 1450, ws: 295, wv: 1600, post, rail, F: 235, E: 205000, term: 'short' });
  near('笠木込みの最大ピッチで比 1', checkHandrail({ L: mp.value, H: 1100, w: 1450, ws: 295, wv: 1600, post, rail, F: 235, E: 205000, term: 'short' }).worst.ratio, 1, 1e-6);
}

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
