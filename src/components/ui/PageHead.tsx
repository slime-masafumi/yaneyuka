import React from 'react';

type Props = {
  /** 左端の番号ラベル（例 '05'）。en と並べて「05 — REGULATIONS」と出す */
  no?: string;
  en?: string;
  title: React.ReactNode;
  desc?: React.ReactNode;
  /** 右端に出す数字など（<Stat /> を並べる） */
  right?: React.ReactNode;
};

/**
 * ページの頭：1 行の見出しと、その下の二重線。
 * 大きな写真や巨大な文字は使わない（1 画面の情報量を優先する方針）。
 */
export default function PageHead({ no, en, title, desc, right }: Props) {
  return (
    <div className="yy-pagehead">
      <div className="yy-pagehead__row">
        {(no || en) && <span className="yy-label">{[no, en].filter(Boolean).join(' — ')}</span>}
        <h2 className="yy-pagehead__title">{title}</h2>
        {desc && <span className="yy-pagehead__desc">{desc}</span>}
        {right && <span className="yy-pagehead__right">{right}</span>}
      </div>
      <div className="yy-rule2" />
    </div>
  );
}

/** ページの頭の右に置く数字。<Stat n="7" label="法令" /> */
export function Stat({ n, label }: { n: React.ReactNode; label: string }) {
  return (
    <span className="yy-stat">
      <b>{n}</b>
      {label}
    </span>
  );
}
