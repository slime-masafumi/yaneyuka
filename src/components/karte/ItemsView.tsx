'use client';

import React from 'react';
import { SecHead } from '@/components/ui/Sheet';
import { itemStatus, type ItemStatus, type Study } from '@/lib/karte/engine';
import { CATS, ITEMS, itemKey, type CatKey, type Project, type ToolKey } from '@/lib/karte/masters';

type Props = {
  cat: CatKey;
  project: Project;
  studies: Study[];
  checks: Record<string, boolean>;
  onOpen: (tool: ToolKey) => void;
  onCheck: (key: string, on: boolean) => void;
};

/** 状態の見え方は設計ツール一覧（ToolIndexDesignSide の StatusCell）と同じ：済 = 緑の点 / 未着手 = 黒の輪 / 要確認 = 墨 / 対象外 = 灰 */
function Status({ st }: { st: ItemStatus }) {
  if (st === 'done') return <span className="yy-st is-done"><i className="yy-dot" />済</span>;
  if (st === 'warn') return <span className="yy-st"><i className="yy-kt-mark" />要確認</span>;
  if (st === 'na') return <span className="yy-st is-mute">対象外</span>;
  return <span className="yy-st"><i className="yy-ring" />未着手</span>;
}

/**
 * 分野ごとの検討項目一覧。本の索引の組み方で「番号 / 項目 ……… 根拠 / 状態 / 操作」の 1 行。
 * ツールのある項目は「開く」、ない項目はチェックボックス（付けると済）。
 * ツールのない項目も同じ一覧に並べる（未実装の項目こそ未着手で残り続ける必要がある）。
 */
export default function ItemsView({ cat, project, studies, checks, onOpen, onCheck }: Props) {
  const label = CATS.find((c) => c[0] === cat)?.[1] ?? cat;
  const list = ITEMS.filter((it) => it.cat === cat);
  const statuses = list.map((it) => itemStatus(it, studies, project, checks));
  const todo = statuses.filter((s) => s === 'todo').length;
  const na = statuses.filter((s) => s === 'na').length;
  const done = statuses.filter((s) => s === 'done').length;

  return (
    <section>
      <SecHead
        no="I"
        title={`${label}の検討項目`}
        right={`全 ${list.length} 項目 · 済 ${done} · 未着手 ${todo}${na ? ` · 対象外 ${na}` : ''}`}
      />
      <ol className="yy-kt-idx">
        {list.map((it, i) => {
          const st = statuses[i];
          const key = itemKey(it);
          const reason = st === 'na' && it.na ? it.na(project) : '';
          return (
            <li key={key} className={`is-${st}`}>
              <span className="yy-kt-idx__no">{String(i + 1).padStart(2, '0')}</span>
              <span className="yy-kt-idx__name">
                <span>{it.label}</span>
                {reason && <small>{reason}</small>}
                {st === 'warn' && <small>条件が変わったか、結果が不適合です</small>}
              </span>
              <span className="yy-leader" />
              <span className="yy-kt-idx__basis" title={it.basis}>{it.basis}</span>
              <span className="yy-kt-idx__st">
                <Status st={st} />
              </span>
              <span className="yy-kt-idx__act">
                {st === 'na' ? null : it.tool ? (
                  <button type="button" className="yy-kt-link" onClick={() => onOpen(it.tool as ToolKey)}>
                    開く →
                  </button>
                ) : (
                  <input
                    type="checkbox"
                    checked={!!checks[key]}
                    title="検討済にする"
                    aria-label={`${it.label} を検討済にする`}
                    onChange={(e) => onCheck(key, e.target.checked)}
                  />
                )}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="yy-kt-note">* ツールのある項目は「開く」で計算し、カルテに残すと済になります。ツールのない項目は右端のチェックで済にします。</p>
    </section>
  );
}
