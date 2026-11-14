'use client';

import React from 'react';
import { openLogin } from '@/lib/openLogin';

/**
 * 未ログインのときにツールの中へ出す 1 行の案内。
 *
 * これまで未ログインで触ると alert('入力するには会員登録（無料）が必要です。') で止まり、
 * ツールそのものが使えなかった。ブラウザ内で完結する処理や、このブラウザ（localStorage）に
 * 保存できるものは未ログインでも使えるようにし、ログインで増えること（端末間の同期・共有）を
 * ここで 1 行だけ伝える。alert は使わない。
 *
 * 使い方:
 *   <GuestNote />                                   … 既定の文（このブラウザに保存・ログインで同期）
 *   <GuestNote>共有リンクの発行はログインが要ります。</GuestNote>
 *   <GuestNote action="ログインして共有">…</GuestNote>
 */
type Props = {
  children?: React.ReactNode;
  /** ボタンの文言。既定は「ログイン」 */
  action?: string;
  className?: string;
};

const GuestNote: React.FC<Props> = ({ children, action = 'ログイン', className }) => (
  <p className={`yy-guest${className ? ` ${className}` : ''}`} role="note">
    <span className="yy-guest__dot" aria-hidden="true" />
    <span className="yy-guest__text">
      {children ?? 'このブラウザに保存しています。ログインすると端末間で同期します。'}
    </span>
    <button type="button" className="yy-guest__btn" onClick={openLogin}>
      {action}
    </button>
  </p>
);

export default GuestNote;
