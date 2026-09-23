// 敷地調査マップの計算（src/lib/siteGeo.ts）のテスト。  node scripts/test-site-geo.ts
import {
  distance, bearing, bearingLabel, polygonArea, toTsubo, magneticDeclination, degMin,
  pointInGeometry, tileOf, tilesCovering, zoneColor,
} from '../src/lib/siteGeo.ts';

let bad = 0;
const near = (label: string, got: number, want: number, tol: number) => {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${got.toFixed(4)} (want ${want}±${tol})`);
};
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};

// 緯度1度 ≒ 111.2 km
near('緯度1度の距離(km)', distance({ lat: 35, lng: 139 }, { lat: 36, lng: 139 }) / 1000, 111.19, 0.05);
// 東京駅→東京タワー 約 3.2 km
near('東京駅→東京タワー(km)', distance({ lat: 35.681236, lng: 139.767125 }, { lat: 35.658581, lng: 139.745433 }) / 1000, 3.18, 0.1);

near('真東', bearing({ lat: 35, lng: 139 }, { lat: 35, lng: 139.001 }), 90, 0.01);
near('真北', bearing({ lat: 35, lng: 139 }, { lat: 35.001, lng: 139 }), 0, 0.01);
check('N30E', bearingLabel(30), 'N 30.0° E');
check('S20W', bearingLabel(200), 'S 20.0° W');
check('N10W', bearingLabel(350), 'N 10.0° W');

// 10m × 20m の長方形（35°付近）≒ 200 ㎡
{
  const lat = 35.0;
  const dLat = 10 / 111194.9;
  const dLng = 20 / (111194.9 * Math.cos((lat * Math.PI) / 180));
  const rect = [
    { lat, lng: 139 },
    { lat, lng: 139 + dLng },
    { lat: lat + dLat, lng: 139 + dLng },
    { lat: lat + dLat, lng: 139 },
  ];
  near('10m×20m の面積(㎡)', polygonArea(rect), 200, 0.5);
  near('逆回りでも同じ', polygonArea([...rect].reverse()), 200, 0.5);
}
near('100㎡は30.25坪', toTsubo(100), 30.25, 0.001);

// 偏角: 国土地理院の計算サイトでの東京（35.68, 139.77）はおよそ 7°35′
near('東京の偏角(度)', magneticDeclination({ lat: 35.68, lng: 139.77 }), 7.6, 0.05);
near('那覇の偏角(度)', magneticDeclination({ lat: 26.21, lng: 127.68 }), 5.0, 0.3);
check('度分', degMin(7.595), '7°36′');
check('59.99分は繰り上げ', degMin(7.9999), '8°00′');

const square = { type: 'Polygon' as const, coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]], [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]] };
check('内側', pointInGeometry({ lat: 2, lng: 2 }, square), true);
check('穴の中は外', pointInGeometry({ lat: 5, lng: 5 }, square), false);
check('外側', pointInGeometry({ lat: 12, lng: 2 }, square), false);

// z15 の東京駅のタイル（地理院地図で確認できる値）
check('タイル番号', tileOf({ lat: 35.681236, lng: 139.767125 }, 15), { x: 29105, y: 12903 });
check('範囲のタイル数', tilesCovering({ lat: 35.67, lng: 139.75 }, { lat: 35.69, lng: 139.78 }, 15, 20)?.length, 12);
check('引きすぎは null', tilesCovering({ lat: 35, lng: 139 }, { lat: 36, lng: 140 }, 15, 20), null);
check('色', zoneColor('商業地域'), '#e0566f');

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
