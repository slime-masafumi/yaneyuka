'use client';
/**
 * 日本の祝日（holidays-jp.github.io。内閣府の CSV を元にした JSON・前後数年分）。
 * 開くたびに取りに行かないよう、端末に 7 日だけ持っておく。取れなければ祝日なしで動く。
 */
import { useEffect, useState } from 'react';
import type { Holidays } from '@/lib/gantt';

const KEY = 'yyHolidaysJp';
const TTL = 7 * 24 * 60 * 60 * 1000;

export function useHolidays(): Holidays {
  const [h, setH] = useState<Holidays>({});
  useEffect(() => {
    let cancelled = false;
    try {
      const cached = JSON.parse(localStorage.getItem(KEY) || 'null') as { at: number; data: Holidays } | null;
      if (cached?.data) {
        setH(cached.data);
        if (Date.now() - cached.at < TTL) return;
      }
    } catch {}
    fetch('https://holidays-jp.github.io/api/v1/date.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: Holidays) => {
        if (cancelled || !data || typeof data !== 'object') return;
        setH(data);
        try {
          localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), data }));
        } catch {}
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return h;
}
