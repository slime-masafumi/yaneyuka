/**
 * メーカー名 → 商品ページの写真(建材の表と同じ写真。scripts/collect-maker-images.ts が集める)。2026-11-14
 * 1 社が複数の分類に載っているときは、写真のある最初の商品ページの写真を使う。
 */
import makerImages from '@/data/maker-images.json';
import type { MakerData } from '@/lib/makerBox';

const IMAGES = makerImages as Record<string, string>;
let cache: { data: MakerData; map: Map<string, string> } | null = null;

export function makerPhotoMap(data: MakerData): Map<string, string> {
  if (cache?.data === data) return cache.map;
  const map = new Map<string, string>();
  for (const rows of Object.values(data)) {
    for (const r of rows) {
      const img = r.products ? IMAGES[r.products] : undefined;
      if (img && !map.has(r.name)) map.set(r.name, img);
    }
  }
  cache = { data, map };
  return map;
}
