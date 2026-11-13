import React from 'react';
import makers from '@/data/makers.json';

/**
 * 建材ページの見出しの右に出す「◯ 社」。数えるのは MakerRows と同じ makers.json。
 * group を省くとそのページの全社（群をまたいで同じ社は 1 社）、group を渡すとその群だけ。
 * 0 社なら何も出さない（見出しだけのページで「0 社」と出さないため）。
 */
type Row = { name: string; pages: string[]; group?: string };
const DATA = makers as unknown as Record<string, Row[]>;

export function makerCount(category: string, page: string, group?: string): number {
  const names = new Set(
    (DATA[category] || [])
      .filter((m) => m.pages.includes(page) && (group === undefined || (m.group || '') === group))
      .map((m) => m.name),
  );
  return names.size;
}

export default function MakerCount({ category, page, group }: { category: string; page: string; group?: string }) {
  const n = makerCount(category, page, group);
  if (!n) return null;
  return <span className="yy-mk2-count">{n} 社</span>;
}
