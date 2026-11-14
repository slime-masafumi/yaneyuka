'use client';

import React, { useEffect, useState } from 'react';

/**
 * 物件カルテの使い方(画面の頭に出す。閉じたらこの端末では閉じたまま)。2026-11-14
 */
const KEY = 'yy-karte-guide-closed';

export default function KarteGuide() {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === '1') setOpen(false);
    } catch {}
  }, []);
  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(KEY, next ? '0' : '1');
    } catch {}
  };

  return (
    <section className="yy-kt-guide" aria-label="物件カルテの使い方">
      <button type="button" className="yy-kt-guide__head" onClick={toggle} aria-expanded={open}>
        <span className="yy-label">guide — 使い方</span>
        <span className="yy-kt-guide__title">物件カルテは、1 つの建物について「法規・設計で確かめること」を漏れなく進めるための台帳です</span>
        <span className="yy-kt-guide__toggle">{open ? '閉じる' : '開く'}</span>
      </button>
      {open && (
        <div className="yy-kt-guide__body">
          <ol className="yy-kt-guide__steps">
            <li>
              <b>条件を入れる</b>
              <span>
                「カルテ」タブで、用途地域・構造・階数・延べ面積・基準風速などを入れます。ここで入れた値が、各計算の初期値になります(一度入れれば使い回せます)。
              </span>
            </li>
            <li>
              <b>分野ごとに確かめる</b>
              <span>
                「意匠・構造・設備・電気」タブの項目を押すと、確かめること・必要な値・根拠・よくある見落とし・関係する記事が出ます。建蔽率・容積率、採光・換気、階段、歩行距離、照度、電圧降下などはその場で値を入れて判定し、記録できます。メモも項目ごとに残せます。条件から関係ない項目は自動で「対象外」になります。
              </span>
            </li>
            <li>
              <b>記録して確認書に</b>
              <span>
                判定・メモ・計算の結果は物件ごとに残り、不適合の項目には「要確認」が付きます。右の「進み具合」「次にやること」で残りが分かり、案件の帯の「確認書 PDF / Excel」で全項目を 1 枚にまとめて出せます。
              </span>
            </li>
          </ol>
          <p className="yy-kt-guide__note">
            保存先はこのブラウザの中だけです(サーバーには送りません)。別の端末やブラウザでは見えません。物件は「＋ 新規物件」でいくつでも作れます。
          </p>
        </div>
      )}
    </section>
  );
}
