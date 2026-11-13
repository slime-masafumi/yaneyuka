'use client';

import React from 'react';

/**
 * 設計ツールの答えの面(深い緑。1 画面に 1 つ)。
 * 中身は ui/Sheet の ResultPanel と同じ組み方で、ng = true のとき数字を淡い赤にする(.yy-result.is-ng)。
 * 行は ui/Sheet の ResultRow をそのまま使う。
 */
export default function DtResult({
  label,
  value,
  unit,
  sub,
  ng,
  text,
  children,
}: {
  label: string;
  value: React.ReactNode;
  unit?: React.ReactNode;
  sub?: React.ReactNode;
  ng?: boolean;
  /** 答えが数字でなく文字(金物の種別など)のとき。明朝の大きさを 1 段下げる */
  text?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`yy-result${ng ? ' is-ng' : ''}${text ? ' is-text' : ''}`}>
      <span className="yy-label yy-result__label">{label}</span>
      <div className="yy-result__main">
        <span className="yy-result__value">{value}</span>
        {unit && <span className="yy-result__unit">{unit}</span>}
      </div>
      {sub && <span className="yy-result__sub">{sub}</span>}
      {children && <div className="yy-result__more">{children}</div>}
    </div>
  );
}
