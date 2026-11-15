// 建材 16 分類の写真(サーバー専用。ビルド時にファイルの有無を見る)。2026-11-15 に src/app/page.tsx から移した
import fs from 'node:fs';
import path from 'node:path';

/** 分類ごとに作った写真が無いときに流用する、左の掲載枠の見本画像 */
const FALLBACK: Record<string, string> = {
  roof: '/image/seppan_cm_sample.png',
  'exterior-wall': '/image/gaiheki_cm_sample.png',
  opening: '/image/kaikou_cm_sample.png',
  'external-floor': '/image/gaibu-floor_cm_sample.png',
  'exterior-other': '/image/gaibu-etc_cm_sample.png',
  'internal-floor': '/image/naibu-floor_cm_sample.png',
  'internal-wall': '/image/naibu-wall_cm_sample.png',
  'internal-other': '/image/naibu-etc_cm_sample.png',
  waterproof: '/image/bousui_cm_sample.png',
  hardware: '/image/kanamono_cm_sample.png',
  furniture: '/image/kagu_cm_sample.png',
};

/** public/image/mat/{分類}.jpg があればそれ、無ければ見本画像、それも無ければ undefined */
export const matPhoto = (id: string): string | undefined =>
  fs.existsSync(path.join(process.cwd(), 'public/image/mat', `${id}.jpg`)) ? `/image/mat/${id}.jpg` : FALLBACK[id];
