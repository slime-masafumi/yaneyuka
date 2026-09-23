/**
 * 用途地域・防火地域のタイルの取得と、読み込んだ区域の保持。
 * 地図（SiteMap）が読み込み、画面（MapView）がクリック地点の区域を引く。
 * どちらも Leaflet を持ち込まずに使えるよう、ここは素の関数だけにしてある。
 */
import { pointInGeometry, tilesCovering, type LatLng, type ZoneGeometry } from '@/lib/siteGeo';

export type ZoneLayer = 'youto' | 'bouka';

export type ZoneFeature = {
  type: 'Feature';
  geometry: ZoneGeometry;
  properties: Record<string, string | number | null>;
};

export type ZoningStatus = 'off' | 'zoom-in' | 'loading' | 'ok' | 'not-configured' | 'error';

/** 取得できるのは z11〜15。z13 未満は1画面のタイル数が多すぎるので拡大を促す */
export const ZONING_MIN_ZOOM = 13;
const MAX_TILES = 24;

const tiles = new Map<string, Promise<ZoneFeature[]>>();
const loaded = new Map<string, ZoneFeature[]>();
let notConfigured = false;

class NotConfigured extends Error {}

async function fetchTile(layer: ZoneLayer, z: number, x: number, y: number): Promise<ZoneFeature[]> {
  const key = `${layer}/${z}/${x}/${y}`;
  const hit = tiles.get(key);
  if (hit) return hit;
  const p = (async () => {
    const res = await fetch(`/api/zoning?layer=${layer}&z=${z}&x=${x}&y=${y}`);
    if (res.status === 503) throw new NotConfigured();
    if (!res.ok) throw new Error(`zoning ${res.status}`);
    const json = await res.json();
    const features = (json?.features ?? []).filter(
      (f: ZoneFeature) => f?.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
    ) as ZoneFeature[];
    loaded.set(key, features);
    return features;
  })();
  tiles.set(key, p);
  // 失敗は覚えない（地図を動かしたときに取り直せるように）
  p.catch(() => tiles.delete(key));
  return p;
}

/**
 * 表示範囲の区域を読み込む。返すのは層ごとの「タイル番号 → 区域」。
 * 同じタイルは二度取りに行かない。
 */
export async function loadZoning(
  sw: LatLng,
  ne: LatLng,
  zoom: number
): Promise<{ status: ZoningStatus; tiles: { key: string; layer: ZoneLayer; features: ZoneFeature[] }[] }> {
  if (notConfigured) return { status: 'not-configured', tiles: [] };
  if (zoom < ZONING_MIN_ZOOM) return { status: 'zoom-in', tiles: [] };
  const z = Math.min(15, Math.floor(zoom));
  const list = tilesCovering(sw, ne, z, MAX_TILES);
  if (!list) return { status: 'zoom-in', tiles: [] };

  const jobs = (['youto', 'bouka'] as ZoneLayer[]).flatMap((layer) =>
    list.map(async ({ x, y }) => ({ key: `${layer}/${z}/${x}/${y}`, layer, features: await fetchTile(layer, z, x, y) }))
  );
  const settled = await Promise.allSettled(jobs);
  if (settled.some((s) => s.status === 'rejected' && s.reason instanceof NotConfigured)) {
    notConfigured = true;
    return { status: 'not-configured', tiles: [] };
  }
  const ok = settled.flatMap((s) => (s.status === 'fulfilled' ? [s.value] : []));
  return { status: ok.length < settled.length ? 'error' : 'ok', tiles: ok };
}

export type ZoneInfo = {
  use?: string;
  coverage?: string;
  floorArea?: string;
  fire?: string;
  city?: string;
  decided?: string;
};

/** 読み込み済みの区域から、その地点の用途地域・建蔽率・容積率・防火指定を引く */
export function zoneInfoAt(p: LatLng): ZoneInfo | null {
  let info: ZoneInfo | null = null;
  for (const [key, features] of loaded) {
    const layer = key.split('/')[0] as ZoneLayer;
    for (const f of features) {
      if (!pointInGeometry(p, f.geometry)) continue;
      const pr = f.properties;
      info ??= {};
      if (layer === 'youto') {
        info.use ??= str(pr.use_area_ja);
        info.coverage ??= str(pr.u_building_coverage_ratio_ja);
        info.floorArea ??= str(pr.u_floor_area_ratio_ja);
        info.city ??= str(pr.city_name);
        info.decided ??= str(pr.decision_date);
      } else {
        info.fire ??= str(pr.fire_prevention_ja);
      }
    }
  }
  return info;
}

const str = (v: unknown) => (v === null || v === undefined || v === '' ? undefined : String(v));
