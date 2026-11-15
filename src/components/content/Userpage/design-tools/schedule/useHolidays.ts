'use client';
/**
 * 日本の祝日。
 *
 * 1. 祝日法（国民の祝日に関する法律 第 2 条・第 3 条）から計算した一覧を土台にする
 *    - 第 2 条の日付（ハッピーマンデー・春分日・秋分日を含む）
 *    - 第 3 条第 2 項 振替休日: 祝日が日曜なら、その後で最も近い「祝日でない日」
 *    - 第 3 条第 3 項 国民の休日: 前日と翌日が祝日の日（祝日でない日に限る）
 *    - 2020・2021 年は東京オリンピック特措法で海の日・スポーツの日・山の日が動いた
 * 2. holidays-jp.github.io（内閣府の CSV を元にした JSON。前年〜翌年の 3 年分）が取れたら、
 *    その年はそちらで置き換える（臨時の祝日・法改正に追従するため）
 *
 * 取れない年（翌々年以降・オフライン）でも祝日が抜けないようにするのが 1 の目的。
 * 春分日・秋分日は国立天文台の暦要項（前年 2 月の官報）で正式に決まるので、
 * 公表前の年は「（推定）」を付ける。計算式は 1980〜2099 年で使える近似式。
 *
 * 開くたびに取りに行かないよう、取得した分は端末に 7 日だけ持っておく。
 */
import { useEffect, useState } from 'react';
import type { Holidays } from '@/lib/gantt';

const KEY = 'yyHolidaysJp';
const TTL = 7 * 24 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
/** m 月の第 n 月曜日 */
const nthMonday = (y: number, m: number, n: number) => {
  const first = new Date(y, m - 1, 1).getDay(); // 0 = 日
  return 1 + ((8 - first) % 7) + (n - 1) * 7;
};
/** 春分日・秋分日（1980〜2099 年の近似式） */
const equinox = (y: number, base: number) => Math.floor(base + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4));

/** 計算で出せる年の範囲（2019 年以前は天皇誕生日・即位関係が違うので扱わない） */
export const COMPUTE_FROM = 2020;
export const COMPUTE_TO = 2099;

/**
 * 祝日法から 1 年分の休日を計算する。
 * estimated = true なら春分・秋分の日に「（推定）」を付ける。
 */
export function computeHolidays(y: number, estimated = true): Holidays {
  if (y < COMPUTE_FROM || y > COMPUTE_TO) return {};
  const est = estimated ? '（推定）' : '';
  const base: Holidays = {
    [ymd(y, 1, 1)]: '元日',
    [ymd(y, 1, nthMonday(y, 1, 2))]: '成人の日',
    [ymd(y, 2, 11)]: '建国記念の日',
    [ymd(y, 2, 23)]: '天皇誕生日',
    [ymd(y, 3, equinox(y, 20.8431))]: `春分の日${est}`,
    [ymd(y, 4, 29)]: '昭和の日',
    [ymd(y, 5, 3)]: '憲法記念日',
    [ymd(y, 5, 4)]: 'みどりの日',
    [ymd(y, 5, 5)]: 'こどもの日',
    [ymd(y, 9, nthMonday(y, 9, 3))]: '敬老の日',
    [ymd(y, 9, equinox(y, 23.2488))]: `秋分の日${est}`,
    [ymd(y, 11, 3)]: '文化の日',
    [ymd(y, 11, 23)]: '勤労感謝の日',
  };
  if (y === 2020) {
    base['2020-07-23'] = '海の日';
    base['2020-07-24'] = 'スポーツの日';
    base['2020-08-10'] = '山の日';
  } else if (y === 2021) {
    base['2021-07-22'] = '海の日';
    base['2021-07-23'] = 'スポーツの日';
    base['2021-08-08'] = '山の日';
  } else {
    base[ymd(y, 7, nthMonday(y, 7, 3))] = '海の日';
    base[ymd(y, 8, 11)] = '山の日';
    base[ymd(y, 10, nthMonday(y, 10, 2))] = 'スポーツの日';
  }

  const out: Holidays = { ...base };
  const key = (d: Date) => ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
  // 第 3 条第 3 項 国民の休日（前日と翌日が「国民の祝日」で、その日は祝日でない）
  for (const k of Object.keys(base)) {
    const [yy, mm, dd] = k.split('-').map(Number);
    const mid = new Date(yy, mm - 1, dd + 1);
    const next = new Date(yy, mm - 1, dd + 2);
    if (!base[key(mid)] && base[key(next)]) out[key(mid)] = '国民の休日';
  }
  // 第 3 条第 2 項 振替休日（日曜の祝日の後で、最も近い「国民の祝日」でない日）
  for (const k of Object.keys(base).sort()) {
    const [yy, mm, dd] = k.split('-').map(Number);
    if (new Date(yy, mm - 1, dd).getDay() !== 0) continue;
    const d = new Date(yy, mm - 1, dd + 1);
    while (base[key(d)]) d.setDate(d.getDate() + 1);
    out[key(d)] = `${base[k].replace('（推定）', '')} 振替休日${base[k].endsWith('（推定）') ? '（推定）' : ''}`;
  }
  return out;
}

/**
 * 取得した一覧（取れた年だけ）と計算した一覧を合わせる。
 * 取れた年はその年をまるごと取得分にする（計算と食い違ったら公表を優先）。
 */
export function mergeHolidays(fetched: Holidays | null, fromYear: number, toYear: number): Holidays {
  const fetchedYears = new Set(Object.keys(fetched ?? {}).map((k) => Number(k.slice(0, 4))));
  const out: Holidays = {};
  for (let y = fromYear; y <= toYear; y++) {
    if (fetchedYears.has(y)) continue;
    // 前年〜翌年は暦要項が出ている（翌年分は毎年 2 月の官報）。それより先は推定
    Object.assign(out, computeHolidays(y, y > new Date().getFullYear() + 1));
  }
  if (fetched) for (const [k, v] of Object.entries(fetched)) if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k)) out[k] = v;
  return out;
}

const computedRange = () => {
  const y = new Date().getFullYear();
  return [Math.max(COMPUTE_FROM, y - 5), Math.min(COMPUTE_TO, y + 15)] as const;
};

export function useHolidays(): Holidays {
  const [h, setH] = useState<Holidays>(() => {
    const [a, b] = computedRange();
    return mergeHolidays(null, a, b);
  });
  useEffect(() => {
    let cancelled = false;
    const [a, b] = computedRange();
    try {
      const cached = JSON.parse(localStorage.getItem(KEY) || 'null') as { at: number; data: Holidays } | null;
      if (cached?.data && typeof cached.data === 'object') {
        setH(mergeHolidays(cached.data, a, b));
        if (Date.now() - cached.at < TTL) return;
      }
    } catch {}
    fetch('https://holidays-jp.github.io/api/v1/date.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: Holidays) => {
        if (cancelled || !data || typeof data !== 'object') return;
        setH(mergeHolidays(data, a, b));
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
