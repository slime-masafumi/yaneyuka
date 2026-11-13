'use client';

import React from 'react';
import makers from '@/data/makers.json';
import { useMakerFilter, type MakerFilterKey } from '@/components/MakerFilter';

/**
 * 建材ページの見出しの右に出す「◯ 社」。数えるのは MakerRows と同じ makers.json。
 * group を省くとそのページの全社（群をまたいで同じ社は 1 社）、group を渡すとその群だけ。
 * 0 社なら何も出さない（見出しだけのページで「0 社」と出さないため）。
 *
 * group を省いた(小分類の見出しの)ときは、比べるための集計も出す:
 *   カタログ ◯ · CAD ◯ · サンプル ◯ … 押すとその有無で表を絞る(もう一度押すと解除)
 */
type Row = { name: string; pages: string[]; group?: string; catalog?: string; cad?: string; sample?: string };
const DATA = makers as unknown as Record<string, Row[]>;

function rowsOf(category: string, page: string, group?: string) {
  return (DATA[category] || []).filter((m) => m.pages.includes(page) && (group === undefined || (m.group || '') === group));
}

export function makerCount(category: string, page: string, group?: string): number {
  return new Set(rowsOf(category, page, group).map((m) => m.name)).size;
}

const KEYS: { key: MakerFilterKey; label: string }[] = [
  { key: 'catalog', label: 'カタログ' },
  { key: 'cad', label: 'CAD' },
  { key: 'sample', label: 'サンプル' },
];

export default function MakerCount({ category, page, group }: { category: string; page: string; group?: string }) {
  const { filter, setFilter } = useMakerFilter();
  const rows = rowsOf(category, page, group);
  const n = new Set(rows.map((m) => m.name)).size;
  if (!n) return null;
  if (group !== undefined) return <span className="yy-mk2-count">{n} 社</span>;
  const has = (k: MakerFilterKey) => new Set(rows.filter((m) => m[k]).map((m) => m.name)).size;
  return (
    <>
      <span className="yy-mk2-count">{n} 社</span>
      <span className="yy-mkf" role="group" aria-label="メーカーを絞り込む">
        {KEYS.map(({ key, label }) => {
          const c = has(key);
          return (
            <button
              key={key}
              type="button"
              className="yy-mkf__btn"
              aria-pressed={filter === key}
              disabled={!c}
              onClick={() => setFilter(filter === key ? null : key)}
              title={c ? `${label}がある ${c} 社だけ表示` : `${label}を載せている社はありません`}
            >
              {label} <b>{c}</b>
            </button>
          );
        })}
      </span>
    </>
  );
}
