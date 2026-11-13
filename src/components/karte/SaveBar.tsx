'use client';

import React, { useState } from 'react';

type Props = {
  id: string;
  memo: string;
  onMemo: (v: string) => void;
  placeholder: string;
  onSave: () => void;
  /** 保存先の物件名（灰色の面に明朝で出す） */
  caseName?: string;
};

/**
 * メモ欄 ＋ 「この検討をカルテに残す」。計算書の右列に置く灰色の面（.yy-gray）。
 * メモは必須にしない。空欄でも記録は成立し、書いた人だけが後で得をする。
 */
export default function SaveBar({ id, memo, onMemo, placeholder, onSave, caseName }: Props) {
  const [saved, setSaved] = useState(false);
  const click = () => {
    onSave();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };
  return (
    <div className="yy-gray yy-kt-save">
      <span className="yy-label">case — 保存先の案件</span>
      {caseName && <span className="yy-gray__title">{caseName}</span>}
      <label htmlFor={id} className="yy-gray__text">
        メモ（任意）
      </label>
      <textarea id={id} value={memo} placeholder={placeholder} onChange={(e) => onMemo(e.target.value)} />
      <div className="yy-kt-save__row">
        <button type="button" className="yy-pill" onClick={click}>
          この検討をカルテに残す
        </button>
        {saved && <span className="yy-kt-saved">✓ 残しました</span>}
      </div>
    </div>
  );
}
