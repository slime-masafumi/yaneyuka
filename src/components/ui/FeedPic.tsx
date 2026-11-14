'use client';

import { useState } from 'react';

/**
 * 一覧の行に添える記事の写真(NEWS・新製品・イベント)。
 * 相手のサイトの画像をそのまま小さく出す。読めなければ何も出さない(枠だけ残して行の揃えを保つ)。
 *   size="row"  … 行の右端の小さな写真
 *   size="lead" … 先頭の 1 件だけ少し大きく
 *
 * cover を渡すと、写真が無い・読めないときに「表紙」を出す(レンガ積みの一覧。2026-11-14)。
 * 図面の断面ハッチの上に、小さな等幅のラベルと明朝の 1 語。写真の場所を空けずに壁の並びをそろえる。
 */
export type PicCover = { label: string; word: string };
export default function FeedPic({
  src,
  size = 'row',
  className = '',
  cover,
}: {
  src?: string;
  size?: 'row' | 'lead' | 'mini' | 'mk';
  className?: string;
  cover?: PicCover;
}) {
  // 読めなかった画像の URL を覚える(src が変われば読み直す。キャッシュの古い画像で失敗したまま残らないように)
  const [failedSrc, setFailedSrc] = useState<string>();
  const failed = !!src && failedSrc === src;
  const cls = `yy-pic yy-pic--${size}${className ? ` ${className}` : ''}`;
  if (!src || failed) {
    if (cover) {
      return (
        <span className={`${cls} is-cover`} aria-hidden="true">
          <span className="yy-pic__label">{cover.label}</span>
          <span className="yy-pic__word">{cover.word}</span>
        </span>
      );
    }
    return <span className={`${cls} is-empty`} aria-hidden="true" />;
  }
  return (
    <span className={cls}>
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        draggable={false}
        onError={() => setFailedSrc(src)}
        onLoad={(e) => {
          // 1px の計測画像など、写真として小さすぎるものは出さない
          const im = e.currentTarget;
          if (im.naturalWidth < 40 || im.naturalHeight < 30) setFailedSrc(src);
        }}
      />
    </span>
  );
}
