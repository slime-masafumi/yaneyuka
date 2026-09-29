'use client';
/**
 * 図面リストの編集表（図面番号・図面名・版・縮尺・枚数）。
 * 送る前（送付状の下書き）と、送った後の台帳の両方で同じものを使う。
 */
import React from 'react';
import { FiPlus, FiX } from 'react-icons/fi';
import { emptyRow, type DrawingRow } from './drawingList';

type Props = {
  rows: DrawingRow[];
  onChange: (rows: DrawingRow[]) => void;
  disabled?: boolean;
};

const cell = 'min-w-0 px-1.5 py-1 text-[11px] bg-white';
const head = 'yy-mono text-[10px] tracking-[0.12em] uppercase text-gray-500';

const DrawingListEditor: React.FC<Props> = ({ rows, onChange, disabled }) => {
  const update = (key: string, patch: Partial<DrawingRow>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const remove = (key: string) => onChange(rows.filter((r) => r.key !== key));
  const total = rows.reduce((a, r) => a + (Math.floor(Number(r.sheets)) || 0), 0);

  return (
    <div className="text-[11px]">
      {/*
        見出しと各行は同じ幅の並びにしておき、置き場所が狭いと「版・縮尺・枚数」が
        まとめて次の段へ回る（画面幅ではなく置き場所の幅で決まるので、2 列組の中でも崩れない）。
      */}
      <div className={`flex items-end gap-1 pb-1 border-b border-[#3b3b3b] ${head}`}>
        <span className="w-7 shrink-0">#</span>
        <div className="flex-1 min-w-0 flex flex-wrap gap-1">
          <span className="w-20 shrink-0">図面番号</span>
          <span className="flex-1 min-w-[9rem]">図面名</span>
          <span className="flex gap-1 shrink-0">
            <span className="w-14">版</span>
            <span className="w-16">縮尺</span>
            <span className="w-11 text-right">枚数</span>
          </span>
        </div>
        <span className="w-4 shrink-0" />
      </div>
      {rows.length === 0 ? (
        <p className="py-2 text-gray-400">図面リストは空です。ファイルを選ぶとファイル名から下書きします。</p>
      ) : (
        <ol>
          {rows.map((r, i) => (
            <li key={r.key} className="flex items-start gap-1 py-1 border-b border-gray-200">
              <span className="w-7 shrink-0 pt-1 yy-mono text-[10px] text-gray-400">{String(i + 1).padStart(3, '0')}</span>
              <div className="flex-1 min-w-0 flex flex-wrap gap-1">
                <input type="text" value={r.no} disabled={disabled} onChange={(e) => update(r.key, { no: e.target.value })} placeholder="A-101" aria-label="図面番号" className={`${cell} w-20 shrink-0 yy-mono`} />
                <input type="text" value={r.title} disabled={disabled} onChange={(e) => update(r.key, { title: e.target.value })} placeholder="図面名" aria-label="図面名" className={`${cell} flex-1 min-w-[9rem]`} />
                <span className="flex gap-1 shrink-0">
                  <input type="text" value={r.rev} disabled={disabled} onChange={(e) => update(r.key, { rev: e.target.value })} placeholder="Rev" aria-label="版" className={`${cell} w-14 yy-mono`} />
                  <input type="text" value={r.scale} disabled={disabled} onChange={(e) => update(r.key, { scale: e.target.value })} placeholder="1/100" aria-label="縮尺" className={`${cell} w-16 yy-mono`} />
                  <input
                    type="number"
                    min={0}
                    value={r.sheets}
                    disabled={disabled}
                    onChange={(e) => update(r.key, { sheets: e.target.value })}
                    aria-label="枚数"
                    className={`${cell} w-11 yy-mono text-right`}
                  />
                </span>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => remove(r.key)}
                aria-label={`${i + 1} 行目を消す`}
                className="w-4 shrink-0 pt-1.5 text-gray-400 hover:text-gray-800 disabled:opacity-40"
              >
                <FiX size={12} />
              </button>
            </li>
          ))}
        </ol>
      )}
      <div className="flex items-center justify-between pt-1.5">
        <button type="button" disabled={disabled} onClick={() => onChange([...rows, emptyRow()])} className="inline-flex items-center gap-1 text-gray-600 underline underline-offset-2 hover:text-gray-900 disabled:opacity-40">
          <FiPlus size={12} /> 行を足す
        </button>
        <span className={head}>
          {rows.length} 件 / 計 {total} 枚
        </span>
      </div>
    </div>
  );
};

export default DrawingListEditor;
