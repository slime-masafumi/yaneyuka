'use client';

import React, { useState } from 'react';
import { getFaviconUrl } from './url';

/**
 * ブックマークのサムネ（64×40）。ページの og:image があればそれ、無いか読めなければファビコン。
 * 画像の読み込み失敗は珍しくない（相手が直リンクを断る・消えた）ので、静かにファビコンへ落とす。
 */
export default function LinkThumb({ url, image, className = '' }: { url: string; image?: string; className?: string }) {
  // 失敗した src を覚える（URL を差し替えたら、新しい画像はもう一度試す）
  const [failedImage, setFailedImage] = useState('');
  const [failedIcon, setFailedIcon] = useState('');
  const favicon = getFaviconUrl(url);
  const showImage = !!image && failedImage !== image;

  return (
    <span className={`relative inline-flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden border border-gray-300 bg-[#f7f6f3] ${className}`}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- 相手先の任意の画像。next/image の許可ドメインに載せられない
        <img
          src={image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setFailedImage(image || '')}
        />
      ) : favicon && failedIcon !== favicon ? (
        // eslint-disable-next-line @next/next/no-img-element -- 同上
        <img src={favicon} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-4 w-4 object-contain opacity-80" onError={() => setFailedIcon(favicon)} />
      ) : (
        <span className="yy-mono text-[10px] text-gray-400">URL</span>
      )}
    </span>
  );
}
