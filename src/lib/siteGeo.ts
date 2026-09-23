/**
 * 敷地調査マップの計算。地図や画面から切り離してある（scripts/test-site-geo.ts で確かめる）。
 *
 * 距離・方位・面積は地球を球（半径 6371008.8 m）として測る。敷地の規模（数十〜数百 m）なら
 * 楕円体との差は 0.1% 程度で、確認申請の求積の代わりにはならないが、当たりを付けるには足りる。
 * 画面でもそう断っておく。
 */

export type LatLng = { lat: number; lng: number };

const R = 6371008.8;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** 2点間の距離（m） */
export function distance(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 折れ線の長さ（m） */
export const pathLength = (pts: LatLng[]) => pts.slice(1).reduce((sum, p, i) => sum + distance(pts[i], p), 0);

/**
 * a から b を見た方位角。真北から時計回りに 0〜360°。
 * 敷地境界や道路の向きを「真北から何度」で読むのに使う。
 */
export function bearing(a: LatLng, b: LatLng): number {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

/** 方位角を「N 23.5° E」のような測量の書き方に */
export function bearingLabel(b: number): string {
  const n = b <= 90 || b >= 270;
  const e = b < 180;
  const angle = n ? (e ? b : 360 - b) : e ? 180 - b : b - 180;
  return `${n ? 'N' : 'S'} ${angle.toFixed(1)}° ${e ? 'E' : 'W'}`;
}

/** 多角形の面積（㎡）。球面上の面積の式（頂点の順は問わない） */
export function polygonArea(pts: LatLng[]): number {
  if (pts.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    sum += rad(p2.lng - p1.lng) * (2 + Math.sin(rad(p1.lat)) + Math.sin(rad(p2.lat)));
  }
  return Math.abs((sum * R * R) / 2);
}

export const SQM_PER_TSUBO = 400 / 121; // 1坪 = 400/121 ㎡（≒3.3058）
export const toTsubo = (sqm: number) => sqm / SQM_PER_TSUBO;

/**
 * 磁北の偏角（西偏を正、度）。国土地理院「磁気図2020.0年値」の近似式。
 *   D = 8°15.822′ + 18.462′Δφ − 7.726′Δλ + 0.007′Δφ² − 0.007′ΔφΔλ − 0.655′Δλ²
 *   Δφ = φ − 37°、Δλ = λ − 138°
 * https://vldb.gsi.go.jp/sokuchi/geomag/menu_04/index.html
 * 年に数分ずつ動くので、磁石で真北を出すときの目安として出す。
 */
export function magneticDeclination(p: LatLng): number {
  const dp = p.lat - 37;
  const dl = p.lng - 138;
  const minutes = 495.822 + 18.462 * dp - 7.726 * dl + 0.007 * dp * dp - 0.007 * dp * dl - 0.655 * dl * dl;
  return minutes / 60;
}

/** 7.6 → 「7°36′」 */
export function degMin(d: number): string {
  const abs = Math.abs(d);
  let dd = Math.floor(abs);
  let mm = Math.round((abs - dd) * 60);
  if (mm === 60) {
    dd += 1;
    mm = 0;
  }
  return `${dd}°${String(mm).padStart(2, '0')}′`;
}

// ---------------------------------------------------------------------------
// 用途地域
// ---------------------------------------------------------------------------

type Ring = number[][]; // [lng, lat][]
export type ZoneGeometry = { type: 'Polygon'; coordinates: Ring[] } | { type: 'MultiPolygon'; coordinates: Ring[][] };

function inRing(p: LatLng, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p.lat !== yj > p.lat && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** 点が多角形（穴あき・複数を含む）の内側か */
export function pointInGeometry(p: LatLng, g: ZoneGeometry): boolean {
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  return polys.some((rings) => rings.length > 0 && inRing(p, rings[0]) && !rings.slice(1).some((hole) => inRing(p, hole)));
}

/**
 * 用途地域の塗り色。都市計画図で慣習的に使われる色の系統（住居系=緑〜黄、商業系=赤、工業系=青紫）。
 * 自治体ごとに細かな色は違うので、凡例を必ず横に出す。
 */
export const ZONE_COLORS: [string, string][] = [
  ['第一種低層住居専用地域', '#1f9e5a'],
  ['第二種低層住居専用地域', '#7cc98a'],
  ['田園住居地域', '#b9d98c'],
  ['第一種中高層住居専用地域', '#a6d96a'],
  ['第二種中高層住居専用地域', '#d4e98a'],
  ['第一種住居地域', '#f5e35b'],
  ['第二種住居地域', '#f7c86b'],
  ['準住居地域', '#f2a65a'],
  ['近隣商業地域', '#f29bb0'],
  ['商業地域', '#e0566f'],
  ['準工業地域', '#c2a1dc'],
  ['工業地域', '#8fb8e8'],
  ['工業専用地域', '#5b8fd6'],
];

export const zoneColor = (name: string | undefined) => ZONE_COLORS.find(([n]) => n === name)?.[1] ?? '#bdbdbd';

// ---------------------------------------------------------------------------
// タイル
// ---------------------------------------------------------------------------

/** 経緯度 → XYZ タイル番号 */
export function tileOf(p: LatLng, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const x = Math.floor(((p.lng + 180) / 360) * n);
  const latR = rad(p.lat);
  const y = Math.floor(((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n);
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

/** 表示範囲を覆うタイルの一覧。max を超えるなら null（引きすぎ） */
export function tilesCovering(sw: LatLng, ne: LatLng, z: number, max: number): { x: number; y: number }[] | null {
  const a = tileOf({ lat: ne.lat, lng: sw.lng }, z);
  const b = tileOf({ lat: sw.lat, lng: ne.lng }, z);
  const count = (b.x - a.x + 1) * (b.y - a.y + 1);
  if (count > max) return null;
  const out: { x: number; y: number }[] = [];
  for (let x = a.x; x <= b.x; x++) for (let y = a.y; y <= b.y; y++) out.push({ x, y });
  return out;
}
