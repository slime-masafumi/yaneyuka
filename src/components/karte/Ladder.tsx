'use client';

import React from 'react';
import { pickFirst } from '@/lib/karte/glass';

export type LadderRow = { k: string | number; v: number };

type Props = {
  rows: LadderRow[];
  /** 要求値（赤の縦線） */
  threshold: number;
  /** 縦線のラベル。例: "W 1,800" */
  thLabel: string;
  fmt: (v: number) => string;
  headLeft: string;
  headRight: string;
  /** 最小適合行の下に出す文言 */
  pickLabel?: string;
};

/**
 * ラダー: 候補（板厚・呼び径）を横棒で並べ、棒の長さが許容値、赤の縦線が要求値。
 * 線を越えた最初の棒が答え。選定系の項目の大半がこの形に収まる。
 *
 * 赤線は棒と同じグリッド列を持つ透明レイヤに置くので、幅が変わっても実寸測定なしで棒と揃う。
 */
export default function Ladder({ rows, threshold, thLabel, fmt, headLeft, headRight, pickLabel = '最小適合' }: Props) {
  const finite = rows.filter((r) => Number.isFinite(r.v));
  const max = Math.max(...finite.map((r) => r.v), threshold * 1.15, 1);
  const pick = pickFirst(finite, threshold);
  const ratio = Math.min(threshold / max, 1);
  return (
    <div className="yk-ladder">
      <div className="yk-ladder-head">
        <span>{headLeft}</span>
        <span>{headRight}</span>
      </div>
      <div className="yk-track">
        {rows.map((r) => {
          const pass = Number.isFinite(r.v) && r.v >= threshold;
          const isPick = !!pick && r.k === pick.k;
          const cls = ['yk-rung', pass ? 'yk-pass' : '', isPick ? 'yk-pick' : ''].filter(Boolean).join(' ');
          const width = Number.isFinite(r.v) ? ((r.v / max) * 100).toFixed(1) : '0';
          return (
            <div key={String(r.k)} className={cls}>
              <div className="yk-t yk-num" data-pick={pickLabel}>{r.k}</div>
              <div className="yk-bar"><i style={{ width: `${width}%` }} /></div>
              <div className="yk-p yk-num">{fmt(r.v)}</div>
            </div>
          );
        })}
        <div className="yk-lines" aria-hidden="true">
          <div />
          <div>
            <div className="yk-wline" data-label={thLabel} style={{ left: `${(ratio * 100).toFixed(2)}%` }} />
          </div>
          <div />
        </div>
      </div>
    </div>
  );
}
