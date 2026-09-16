'use client';

import React, { useState } from 'react';

type Props = {
  id: string;
  memo: string;
  onMemo: (v: string) => void;
  placeholder: string;
  onSave: () => void;
  /** true にすると罫線で区切らない（パネル単体で使うとき） */
  bare?: boolean;
};

/**
 * メモ欄 ＋ 「この検討をカルテに残す」。
 * メモは必須にしない。空欄でも記録は成立し、書いた人だけが後で得をする。
 */
export default function SaveBar({ id, memo, onMemo, placeholder, onSave, bare }: Props) {
  const [saved, setSaved] = useState(false);
  const click = () => {
    onSave();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };
  return (
    <div className={bare ? undefined : 'yk-save'}>
      <label htmlFor={id}>メモ（任意）</label>
      <textarea id={id} value={memo} placeholder={placeholder} onChange={(e) => onMemo(e.target.value)} />
      <div style={{ marginTop: 10 }}>
        <button type="button" className="yk-btn" onClick={click}>この検討をカルテに残す</button>
        {saved && <span className="yk-saved">残しました</span>}
      </div>
    </div>
  );
}
