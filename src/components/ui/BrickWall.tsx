'use client';

import React, { useEffect, useRef, useState } from 'react';
import './brick-wall.css';

/**
 * 馬目地(レンガの馬踏み目地)に並べる一覧。1 枚のレンガが 1 件(NEWS・新製品・イベント)。2026-11-14
 *
 *   ┌────┬────┬────┐      偶数段: 全レンガ × 列数
 *   ┼──┬─┴──┬─┴──┬─┼      奇数段: 半レンガ + 全レンガ × (列数 − 1) + 半レンガ
 *   └────┴────┴────┘
 *
 * 列数は置かれた幅で決める(1 枚 230px 目安、1〜4)。半レンガは写真を出さない小さい組み方で描く。
 * 最後の段の余りは空のレンガで埋め、壁の端をそろえる。
 */
type Props<T> = {
  items: T[];
  keyOf: (item: T) => string;
  render: (item: T, opt: { half: boolean; index: number }) => React.ReactNode;
  /** 1 枚の幅の目安(px) */
  brick?: number;
  /** 一覧の名前(読み上げ用) */
  label?: string;
  className?: string;
};

type Slot<T> = { item?: T; half: boolean; index: number };

export default function BrickWall<T>({ items, keyOf, render, brick = 230, label, className = '' }: Props<T>) {
  const ref = useRef<HTMLUListElement>(null);
  const [cols, setCols] = useState(3);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setCols(Math.max(1, Math.min(4, Math.floor(el.clientWidth / brick) || 1)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [brick]);

  // 段ごとに、全レンガと半レンガの並びを作って順に詰める
  const slots: Slot<T>[] = [];
  let i = 0;
  for (let row = 0; i < items.length; row++) {
    const shape: boolean[] = row % 2 === 0 ? Array(cols).fill(false) : [true, ...Array(cols - 1).fill(false), true];
    for (const half of shape) {
      slots.push(i < items.length ? { item: items[i], half, index: i } : { half, index: -1 });
      i++;
    }
  }

  return (
    <ul ref={ref} className={`yy-brick ${className}`} style={{ gridTemplateColumns: `repeat(${cols * 2}, minmax(0, 1fr))` }} aria-label={label}>
      {slots.map((s, k) =>
        s.item ? (
          <li key={keyOf(s.item)} className={`yy-brick__b${s.half ? ' is-half' : ''}`} style={{ gridColumn: `span ${s.half ? 1 : 2}` }}>
            {render(s.item, { half: s.half, index: s.index })}
          </li>
        ) : (
          <li key={`blank-${k}`} className={`yy-brick__b is-blank${s.half ? ' is-half' : ''}`} style={{ gridColumn: `span ${s.half ? 1 : 2}` }} aria-hidden="true" />
        )
      )}
    </ul>
  );
}
