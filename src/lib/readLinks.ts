'use client';

import { useCallback, useEffect, useState, type MouseEvent } from 'react';

/**
 * 開いた記事(NEWS・新製品・イベント)を覚えて「既読」にする。2026-11-14
 *
 * その端末のブラウザ(localStorage)にだけ、開いたリンクを新しい順に 600 件まで残す。
 * サーバーには送らない。同じ画面の別の一覧・別のタブにもすぐ反映する。
 */
const KEY = 'yy-read-v1';
const MAX = 600;
const EVENT = 'yy-read-change';

function load(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function useReadLinks() {
  const [read, setRead] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const sync = () => setRead(new Set(load()));
    sync();
    const onStorage = (e: StorageEvent) => e.key === KEY && sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const markRead = useCallback((link?: string) => {
    if (!link) return;
    try {
      const list = [link, ...load().filter((x) => x !== link)].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* 残せない端末では既読にしないだけ */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const isRead = useCallback((link?: string) => !!link && read.has(link), [read]);

  /** <a> に付ける。左クリック・中クリック(新しいタブ)の両方で既読にする */
  const readProps = useCallback(
    (link?: string) => ({
      onClick: () => markRead(link),
      onAuxClick: (e: MouseEvent) => e.button === 1 && markRead(link),
    }),
    [markRead]
  );

  return { isRead, markRead, readProps };
}
