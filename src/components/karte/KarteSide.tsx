'use client';

import React from 'react';
import { SecHead } from '@/components/ui/Sheet';
import type { CatKey, ToolKey } from '@/lib/karte/masters';

export type Progress = {
  done: number;
  total: number;
  /** [分野, 表示名, 済, 対象外を除いた項目数] */
  cats: Array<[CatKey, string, number, number]>;
  next: Array<{ label: string; cat: CatKey; tool?: ToolKey }>;
};

export const TOOL_LABEL: Record<ToolKey, string> = { glass: '必要ガラス厚', pipe: '縦樋のサイズ', fnb: '内装の必要諸元', dt: '設計ツール' };

type Props = {
  progress: Progress;
  persistent: boolean;
  onOpenCat: (cat: CatKey) => void;
  onOpenTool: (tool: ToolKey) => void;
  /** 章番号の始まり（本文の章の続きから数える） */
  start?: number;
};

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

/** カルテ・各分野の右列：進み具合 / 次にやること / 保存先の注意 */
export default function KarteSide({ progress, persistent, onOpenCat, onOpenTool, start = 1 }: Props) {
  const no = (i: number) => ROMAN[start - 1 + i] ?? String(start + i);
  const catLabel = Object.fromEntries(progress.cats.map(([k, l]) => [k, l])) as Record<CatKey, string>;
  return (
    <aside className="yy-kt-side">
      <section>
        <SecHead no={no(0)} title="進み具合" right="対象外を除く" />
        <div className="yy-prog">
          <b>{progress.done}</b>
          <span>/ {progress.total} 項目</span>
        </div>
        {progress.cats.map(([k, l, d, t]) => (
          <div key={k} className="yy-prog__row">
            <button type="button" className="yy-kt-progcat" onClick={() => onOpenCat(k)} title={`${l}の項目を開く`}>
              {l}
            </button>
            <span className="yy-prog__bar">
              <span style={{ width: `${t ? Math.round((d / t) * 100) : 0}%` }} />
            </span>
            <span className="yy-prog__n">
              {d} / {t}
            </span>
          </div>
        ))}
      </section>

      {progress.next.length > 0 && (
        <section>
          <SecHead no={no(1)} title="次にやること" />
          <ol className="yy-home__toc">
            {progress.next.map((n, i) => (
              <li key={n.label}>
                <button type="button" className="yy-srcrow yy-srcrow--btn" onClick={() => (n.tool ? onOpenTool(n.tool) : onOpenCat(n.cat))}>
                  <span className="yy-home__tocno">{i + 1}</span>
                  <span className="yy-home__toct">{n.label}</span>
                  <span className="yy-leader" />
                  <span className="yy-next__tool">{n.tool ? TOOL_LABEL[n.tool] : catLabel[n.cat]}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section>
        <SecHead no={progress.next.length ? no(2) : no(1)} title="保存先" right="この端末" />
        <p className="yy-home__empty" style={{ lineHeight: 1.7 }}>
          {persistent
            ? 'データはこの端末（ブラウザ）の中だけに保存され、サーバーには送られません。別の端末や他の人とは共有されません。ブラウザのサイトデータを消すと記録も消えます。'
            : 'このブラウザでは保存領域が使えないため、記録はページを閉じると消えます。'}
        </p>
      </section>
    </aside>
  );
}
