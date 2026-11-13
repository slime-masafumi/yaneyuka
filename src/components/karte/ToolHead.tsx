'use client';

import React from 'react';

/** カルテの中のツール画面の頭：← 一覧に戻る / 題（明朝）/ 根拠 / 右に補足。下に 1px の線 */
export default function ToolHead({ title, desc, onBack, right }: { title: string; desc?: React.ReactNode; onBack: () => void; right?: React.ReactNode }) {
  return (
    <div className="yy-kt-th">
      <button type="button" className="yy-kt-link yy-kt-th__back" onClick={onBack}>
        ← 一覧に戻る
      </button>
      <span className="yy-label">tool</span>
      <h2 className="yy-kt-th__title">{title}</h2>
      {desc && <span className="yy-kt-th__desc">{desc}</span>}
      {right && <span className="yy-kt-th__right">{right}</span>}
    </div>
  );
}
