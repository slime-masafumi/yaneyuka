'use client';
/**
 * 自分のメーカー資料箱のうち、yaneyuka 側でリンク（カタログ等）が更新されたカードを数える。
 *
 * これまでは資料箱を開いてカードを 1 枚ずつ見ないと気づけなかった。ブックマークを開いた時点で
 * 見出しに件数を出し、ベルにも 1 通知らせる（notifyMakerBoxChanges）。
 * 元データ（makers.json）は大きいので、資料箱に 1 枚でもカードがあるときだけ読む。
 */
import { useEffect, useMemo, useState } from 'react';
import { linkChanges, mergeMaker, type MakerData } from '@/lib/makerBox';
import { useMakerBox, notifyMakerBoxChanges } from '@/lib/useMakerBox';

export function useMakerBoxUpdates(uid: string | null | undefined) {
  const box = useMakerBox(uid);
  const [data, setData] = useState<MakerData | null>(null);
  const hasBox = box.length > 0;

  useEffect(() => {
    if (!uid || !hasBox || data) return;
    let alive = true;
    import('@/data/makers.json')
      .then((m) => {
        if (alive) setData((m.default ?? m) as unknown as MakerData);
      })
      .catch(() => {
        /* 読めなければ件数を出さないだけ */
      });
    return () => {
      alive = false;
    };
  }, [uid, hasBox, data]);

  const changed = useMemo(() => {
    if (!data) return [];
    return box
      .map((item) => {
        const current = mergeMaker(data, item.name)?.links;
        return { item, changes: current ? linkChanges(item.links, current) : [] };
      })
      .filter((x) => x.changes.length > 0);
  }, [data, box]);

  // 通知は失敗しても画面は困らない。再試行もしない（次にカードが変わったときにまた試す）
  useEffect(() => {
    if (!uid || changed.length === 0) return;
    notifyMakerBoxChanges(uid, changed).catch((e) => console.warn('資料箱の更新通知を書けませんでした', e));
  }, [uid, changed]);

  return { count: changed.length };
}
