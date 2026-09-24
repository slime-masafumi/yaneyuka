/**
 * アスファルト舗装の構造設計（TA法）。画面から切り離してある（scripts/test-pavement.ts）。
 *
 * 出典: 日本道路協会「舗装設計便覧」／「舗装の構造に関する技術基準」
 *   必要等値換算厚  TA = 3.84·N^0.16 / CBR^0.3   （信頼度 90%）
 *   N  = 疲労破壊輪数（設計期間 10 年）
 *   CBR = 路床の設計 CBR（3 未満は路床の改良が前提）
 *   構成の TA' = Σ aᵢ·hᵢ（aᵢ 等値換算係数、hᵢ 厚さ cm）≧ TA なら OK
 */

export type TrafficClass = { id: string; label: string; heavyPerDay: string; N: number; minSurface: number };

/** 交通量区分（大型車の台/日・方向）と疲労破壊輪数・表層＋基層の最小厚 */
export const TRAFFIC: TrafficClass[] = [
  { id: 'N1', label: 'N1', heavyPerDay: '15 未満', N: 1_500, minSurface: 5 },
  { id: 'N2', label: 'N2', heavyPerDay: '15〜40', N: 7_000, minSurface: 5 },
  { id: 'N3', label: 'N3', heavyPerDay: '40〜100', N: 30_000, minSurface: 5 },
  { id: 'N4', label: 'N4', heavyPerDay: '100〜250', N: 150_000, minSurface: 5 },
  { id: 'N5', label: 'N5', heavyPerDay: '250〜1,000', N: 1_000_000, minSurface: 10 },
  { id: 'N6', label: 'N6', heavyPerDay: '1,000〜3,000', N: 7_000_000, minSurface: 15 },
  { id: 'N7', label: 'N7', heavyPerDay: '3,000 以上', N: 35_000_000, minSurface: 20 },
];

/** 敷地内（構内）でよくある使われ方から交通量区分を選ぶための目安 */
export const SITE_PRESETS: { id: string; label: string; traffic: string }[] = [
  { id: 'car', label: '乗用車のみの駐車場・通路', traffic: 'N1' },
  { id: 'van', label: '宅配車・小型貨物も入る', traffic: 'N2' },
  { id: 'truck-some', label: '大型車がときどき入る（ゴミ収集・消防車など）', traffic: 'N3' },
  { id: 'truck-daily', label: '大型車が毎日出入りする（物流・工場）', traffic: 'N4' },
];

export type Material = { id: string; label: string; a: number; layer: 'surface' | 'upper' | 'lower'; minCm: number };

/** 等値換算係数（舗装設計便覧）。minCm は1層の最小厚の目安 */
export const MATERIALS: Material[] = [
  { id: 'ac', label: '加熱アスファルト混合物（表層・基層）', a: 1.0, layer: 'surface', minCm: 3 },
  { id: 'bitumen-hot', label: '瀝青安定処理（加熱混合）', a: 0.8, layer: 'upper', minCm: 5 },
  { id: 'bitumen-cold', label: '瀝青安定処理（常温混合）', a: 0.55, layer: 'upper', minCm: 5 },
  { id: 'cement-upper', label: 'セメント安定処理（上層・一軸 2.9MPa）', a: 0.55, layer: 'upper', minCm: 10 },
  { id: 'lime-upper', label: '石灰安定処理（上層・一軸 0.98MPa）', a: 0.45, layer: 'upper', minCm: 10 },
  { id: 'mechanical', label: '粒度調整砕石（修正CBR 80以上）', a: 0.35, layer: 'upper', minCm: 10 },
  { id: 'crusher', label: 'クラッシャラン等（修正CBR 30以上）', a: 0.25, layer: 'lower', minCm: 10 },
  { id: 'crusher-low', label: 'クラッシャラン等（修正CBR 20〜30）', a: 0.2, layer: 'lower', minCm: 10 },
  { id: 'cement-lower', label: 'セメント安定処理（下層・一軸 0.98MPa）', a: 0.25, layer: 'lower', minCm: 10 },
];

export const materialOf = (id: string) => MATERIALS.find((m) => m.id === id);

/** 必要等値換算厚 TA（cm） */
export const requiredTA = (N: number, cbr: number) => (3.84 * N ** 0.16) / cbr ** 0.3;

export type Layer = { material: string; cm: number };

export type PavementResult = {
  requiredTA: number;
  actualTA: number;
  totalCm: number;
  ok: boolean;
  issues: string[];
};

export function checkPavement(trafficId: string, cbr: number, layers: Layer[]): PavementResult | null {
  const t = TRAFFIC.find((x) => x.id === trafficId);
  if (!t || !(cbr > 0)) return null;
  const req = requiredTA(t.N, cbr);
  let actual = 0;
  let total = 0;
  let surface = 0;
  const issues: string[] = [];
  for (const l of layers) {
    const m = materialOf(l.material);
    if (!m || !(l.cm > 0)) continue;
    actual += m.a * l.cm;
    total += l.cm;
    if (m.layer === 'surface') surface += l.cm;
    if (l.cm < m.minCm) issues.push(`${m.label} は 1 層 ${m.minCm}cm 以上が目安です（いま ${l.cm}cm）`);
  }
  if (surface < t.minSurface) issues.push(`表層＋基層（アスファルト）は ${t.label} で ${t.minSurface}cm 以上が必要です（いま ${surface}cm）`);
  if (cbr < 3) issues.push('路床の設計 CBR が 3 未満です。置換えや安定処理で路床を改良してから設計してください');
  const ok = actual >= req - 1e-9 && issues.length === 0;
  return { requiredTA: req, actualTA: actual, totalCm: total, ok, issues };
}

/**
 * 標準的な構成を提案する。
 *   1. 表層（最小厚）＋ 上層路盤 粒度調整砕石 ＋ 下層路盤 クラッシャラン
 *   2. 1 で下層・上層とも 40cm に収まらない（交通量が多く路床が弱い）ときは、
 *      上層路盤を瀝青安定処理（加熱）に替える。重交通の標準的な組み方
 * 厚さは 5cm 刻み。路盤は 1 層 10cm 以上（瀝青安定処理は 5cm 以上）。
 */
export function suggestLayers(trafficId: string, cbr: number): Layer[] {
  const t = TRAFFIC.find((x) => x.id === trafficId) ?? TRAFFIC[0];
  const req = requiredTA(t.N, Math.max(cbr, 3));
  const surface = t.minSurface;
  const plans: { upper: string; a: number; upperMin: number }[] = [
    { upper: 'mechanical', a: 0.35, upperMin: 10 },
    { upper: 'bitumen-hot', a: 0.8, upperMin: 5 },
  ];
  for (const plan of plans) {
    for (let upper = plan.upperMin; upper <= 40; upper += 5) {
      for (let lower = 0; lower <= 40; lower += 5) {
        if (lower > 0 && lower < 10) continue;
        if (surface + upper * plan.a + lower * 0.25 >= req) {
          const layers: Layer[] = [{ material: 'ac', cm: surface }, { material: plan.upper, cm: upper }];
          if (lower > 0) layers.push({ material: 'crusher', cm: lower });
          return layers;
        }
      }
    }
  }
  return [{ material: 'ac', cm: surface }, { material: 'bitumen-hot', cm: 40 }, { material: 'crusher', cm: 40 }];
}
