'use client';

import { useState } from 'react';

/**
 * 一覧の行に添える記事の写真(NEWS・新製品・イベント)。
 * 相手のサイトの画像をそのまま小さく出す。読めなければ何も出さない(枠だけ残して行の揃えを保つ)。
 *   size="row"  … 行の右端の小さな写真
 *   size="lead" … 先頭の 1 件だけ少し大きく
 */
export default function FeedPic({
  src,
  size = 'row',
  className = '',
}: {
  src?: string;
  size?: 'row' | 'lead' | 'mini';
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const cls = `yy-pic yy-pic--${size}${className ? ` ${className}` : ''}`;
  if (!src || failed) return <span className={`${cls} is-empty`} aria-hidden="true" />;
  return (
    <span className={cls}>
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        draggable={false}
        onError={() => setFailed(true)}
        onLoad={(e) => {
          // 1px の計測画像など、写真として小さすぎるものは出さない
          const im = e.currentTarget;
          if (im.naturalWidth < 40 || im.naturalHeight < 30) setFailed(true);
        }}
      />
    </span>
  );
}
