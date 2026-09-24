// 舗装設計（src/lib/pavement.ts）のテスト。  node scripts/test-pavement.ts
import { requiredTA, checkPavement, suggestLayers, TRAFFIC } from '../src/lib/pavement.ts';

let bad = 0;
const near = (label: string, got: number, want: number, tol: number) => {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${got.toFixed(2)} (want ${want}±${tol})`);
};
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};

// 公開されている計算例: N = 35,000,000・CBR 4 → TA 41cm
near('N=35,000,000 CBR4', requiredTA(35_000_000, 4), 41, 0.5);
// CBR が上がれば TA は下がる
check('CBR が高いほど薄くて済む', requiredTA(150_000, 12) < requiredTA(150_000, 4), true);

// 構成の判定: N3・CBR6 に 表層5 + 粒調15 + クラッシャラン15 → TA' = 5 + 5.25 + 3.75 = 14.0
{
  const r = checkPavement('N3', 6, [{ material: 'ac', cm: 5 }, { material: 'mechanical', cm: 15 }, { material: 'crusher', cm: 15 }])!;
  near("TA'", r.actualTA, 14, 1e-9);
  check('合計厚', r.totalCm, 35);
  check('N3 CBR6 は OK', r.ok, true);
}
check('表層が薄いと NG', checkPavement('N5', 6, [{ material: 'ac', cm: 5 }, { material: 'mechanical', cm: 40 }, { material: 'crusher', cm: 40 }])!.ok, false);
check('CBR 3 未満は NG', checkPavement('N1', 2, [{ material: 'ac', cm: 5 }, { material: 'mechanical', cm: 30 }])!.ok, false);
check('路盤 1 層 5cm は注意が出る', checkPavement('N1', 6, [{ material: 'ac', cm: 5 }, { material: 'mechanical', cm: 5 }])!.issues.length > 0, true);

// 提案した構成は必ず OK になる
for (const t of TRAFFIC) {
  for (const cbr of [3, 4, 6, 8, 12, 20]) {
    const layers = suggestLayers(t.id, cbr);
    const r = checkPavement(t.id, cbr, layers)!;
    if (!r.ok) {
      bad++;
      console.log(`NG 提案 ${t.id} CBR${cbr} -> ${JSON.stringify(layers)} TA'${r.actualTA.toFixed(1)} < ${r.requiredTA.toFixed(1)}`);
    }
  }
}
console.log('ok  提案した構成はすべての区分・CBR で OK（上に NG が無ければ）');
check('乗用車の駐車場（N1・CBR6）の提案', suggestLayers('N1', 6), [{ material: 'ac', cm: 5 }, { material: 'mechanical', cm: 10 }]);

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
