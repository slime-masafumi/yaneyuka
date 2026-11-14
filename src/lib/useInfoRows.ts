'use client';

import { useEffect, useState } from 'react';
import { infoRows, loadPostIndex, type InfoRow, type PostIndex } from './infoLinks';

/** 材料情報の章はすぐ、設計情報の記事の題は読み込めしだい出す(記事本文を初期 JS に入れないため) */
let cache: PostIndex | null = null;
export function useInfoRows(sections: string[] = [], posts: string[] = []): InfoRow[] {
  const [index, setIndex] = useState<PostIndex>(cache ?? []);
  useEffect(() => {
    if (cache || !posts.length) return;
    let alive = true;
    loadPostIndex().then((ix) => {
      cache = ix;
      if (alive) setIndex(ix);
    });
    return () => {
      alive = false;
    };
  }, [posts.length]);
  return infoRows(sections, posts, index);
}
