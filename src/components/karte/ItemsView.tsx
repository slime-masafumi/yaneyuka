'use client';

import React from 'react';
import { itemStatus, type Study } from '@/lib/karte/engine';
import { CATS, ITEMS, itemKey, type CatKey, type Project, type ToolKey } from '@/lib/karte/masters';

type Props = {
  cat: CatKey;
  project: Project;
  studies: Study[];
  checks: Record<string, boolean>;
  onOpen: (tool: ToolKey) => void;
  onCheck: (key: string, on: boolean) => void;
};

/**
 * 分野ごとの検討項目一覧。未検討は赤丸。
 * ツールのある項目は「開く」、ない項目はチェックボックス。
 * ツールのない項目も同じ一覧に並べる（未実装の項目こそ赤丸で残り続ける必要がある）。
 */
export default function ItemsView({ cat, project, studies, checks, onOpen, onCheck }: Props) {
  const label = CATS.find((c) => c[0] === cat)?.[1] ?? cat;
  const list = ITEMS.filter((it) => it.cat === cat);
  const statuses = list.map((it) => itemStatus(it, studies, project, checks));
  const todo = statuses.filter((s) => s === 'todo').length;
  const na = statuses.filter((s) => s === 'na').length;

  return (
    <section>
      <h1>{label}</h1>
      <p className="yk-hint" style={{ marginBottom: 16 }}>
        全{list.length}項目　未検討 {todo} 件{na ? `　対象外 ${na} 件` : ''}　／ {project.name}
      </p>
      {list.map((it, i) => {
        const st = statuses[i];
        const key = itemKey(it);
        const reason = st === 'na' && it.na ? it.na(project) : '';
        return (
          <div key={key} className={`yk-item yk-${st}`}>
            <span className="yk-dot" />
            <span className="yk-lb">
              {it.label}
              <small>{reason || it.basis}</small>
            </span>
            {st === 'warn' && <span className="yk-st">要再確認</span>}
            {st === 'na' ? (
              <span className="yk-st">対象外</span>
            ) : it.tool ? (
              <button type="button" className="yk-go" onClick={() => onOpen(it.tool as ToolKey)}>開く</button>
            ) : (
              <span className="yk-mk">
                <input
                  type="checkbox"
                  checked={!!checks[key]}
                  title="検討済にする"
                  aria-label={`${it.label} を検討済にする`}
                  onChange={(e) => onCheck(key, e.target.checked)}
                />
              </span>
            )}
          </div>
        );
      })}
    </section>
  );
}
