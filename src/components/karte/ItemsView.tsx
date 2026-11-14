'use client';

import React, { useState } from 'react';
import { SecHead } from '@/components/ui/Sheet';
import { CALCS } from '@/lib/karte/calcs';
import { itemStatus, type ItemRec, type ItemStatus, type Study } from '@/lib/karte/engine';
import { CATS, ITEMS, itemKey, type CatKey, type Project, type ToolKey } from '@/lib/karte/masters';
import ItemPanel from './ItemPanel';

type Props = {
  cat: CatKey;
  project: Project;
  studies: Study[];
  checks: Record<string, boolean>;
  recs: Record<string, ItemRec>;
  onOpen: (tool: ToolKey) => void;
  onCheck: (key: string, on: boolean) => void;
  onRec: (key: string, patch: Partial<ItemRec>) => void;
};

/** 状態の見え方は設計ツール一覧（ToolIndexDesignSide の StatusCell）と同じ：済 = 緑の点 / 未着手 = 黒の輪 / 要確認 = 墨 / 対象外 = 灰 */
function Status({ st }: { st: ItemStatus }) {
  if (st === 'done') return <span className="yy-st is-done"><i className="yy-dot" />済</span>;
  if (st === 'warn') return <span className="yy-st"><i className="yy-kt-mark" />要確認</span>;
  if (st === 'na') return <span className="yy-st is-mute">対象外</span>;
  return <span className="yy-st"><i className="yy-ring" />未着手</span>;
}

/**
 * 分野ごとの検討項目一覧。本の索引の組み方で「番号 / 項目 ……… 根拠 / 状態 / 開く」の 1 行。
 * 行を押すとその場で開き、確かめること・判定・メモ・関係する記事が出る（ItemPanel）。2026-11-14
 */
export default function ItemsView({ cat, project, studies, checks, recs, onOpen, onCheck, onRec }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const label = CATS.find((c) => c[0] === cat)?.[1] ?? cat;
  const list = ITEMS.filter((it) => it.cat === cat);
  const statuses = list.map((it) => itemStatus(it, studies, project, checks, recs[itemKey(it)]));
  const todo = statuses.filter((s) => s === 'todo').length;
  const na = statuses.filter((s) => s === 'na').length;
  const done = statuses.filter((s) => s === 'done').length;
  const warn = statuses.filter((s) => s === 'warn').length;

  return (
    <section>
      <SecHead
        no="I"
        title={`${label}の検討項目`}
        right={`全 ${list.length} 項目 · 済 ${done} · 未着手 ${todo}${warn ? ` · 要確認 ${warn}` : ''}${na ? ` · 対象外 ${na}` : ''}`}
      />
      <ol className="yy-kt-idx">
        {list.map((it, i) => {
          const st = statuses[i];
          const key = itemKey(it);
          const rec = recs[key] ?? {};
          const isOpen = open === key;
          const reason = st === 'na' ? (rec.na ? '手で対象外にしました' : it.na?.(project) ?? '') : '';
          const notes = [
            rec.res && `判定 ${rec.res.summary}`,
            rec.memo?.trim() && 'メモあり',
            CALCS[key] && !rec.res && 'その場で判定できます',
          ].filter(Boolean);
          return (
            <li key={key} className={`is-${st}${isOpen ? ' is-open' : ''}`}>
              <button type="button" className="yy-kt-idx__row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : key)}>
                <span className="yy-kt-idx__no">{String(i + 1).padStart(2, '0')}</span>
                <span className="yy-kt-idx__name">
                  <span>{it.label}</span>
                  {reason && <small>{reason}</small>}
                  {!reason && st === 'warn' && <small>{rec.res?.verdict === 'ng' ? '判定が不適合です' : '条件が変わったか、結果が不適合です'}</small>}
                  {!reason && st !== 'warn' && notes.length > 0 && <small>{notes.join(' · ')}</small>}
                </span>
                <span className="yy-leader" />
                <span className="yy-kt-idx__basis" title={it.basis}>{it.basis}</span>
                <span className="yy-kt-idx__st">
                  <Status st={st} />
                </span>
                <span className="yy-kt-idx__act">{isOpen ? '閉じる' : '開く'}</span>
              </button>
              {isOpen && (
                <ItemPanel
                  it={it}
                  project={project}
                  status={st}
                  rec={rec}
                  checked={!!checks[key]}
                  onRec={(patch) => onRec(key, patch)}
                  onCheck={(on) => onCheck(key, on)}
                  onOpenTool={onOpen}
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="yy-kt-note">
        * 項目を押すと、確かめること・必要な値・根拠・関係する記事が出ます。建蔽率・採光・階段・歩行距離・照度・電圧降下などはその場で判定して記録でき、メモも残せます。
        計算ツールのある項目（ガラス厚・縦樋・内装）は、ツールで計算してカルテに残すと済になります。
      </p>
    </section>
  );
}
