'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';

/**
 * 訪問者数のカウンター。
 *   - 誰が開いても、ページを移るたびに /api/visit へ 1 回知らせる(画面には何も出さない)
 *   - 管理者(firestore.rules の isAdmin と同じメール)でログインしているときだけ、
 *     左カラムの最下部に「今日 / 昨日 / 累計」を小さく出す
 * 端末には「今日はもう数えた」日付だけを残す(個人は識別しない)。
 */

const ADMIN_EMAIL = 'slime-a@outlook.com';
const DAY_KEY = 'yy-visit-day';
const SESSION_KEY = 'yy-visit-session';
/** 管理者として一度ログインした端末には印を残し、以後はログアウト中でも数えない */
const SKIP_KEY = 'yy-visit-skip';

/** 参照元を大まかな種類に(検索エンジン名・SNS・ほかのサイト・直接)。URL や検索語は送らない */
function sourceOf(referrer: string): string {
  let host = '';
  try {
    host = referrer ? new URL(referrer).hostname : '';
  } catch {
    return 'direct';
  }
  if (!host || host === location.hostname) return 'direct';
  if (/(^|\.)google\./.test(host)) return 'google';
  if (/(^|\.)bing\.com$/.test(host)) return 'bing';
  if (/(^|\.)yahoo\.co(\.jp|m)$/.test(host)) return 'yahoo';
  if (/duckduckgo|ecosia|baidu|naver/.test(host)) return 'search-other';
  if (/(^|\.)(t\.co|x\.com|twitter\.com|facebook\.com|instagram\.com|threads\.net|linkedin\.com|line\.me|youtube\.com|note\.com|pinterest\.)/.test(host)) return 'social';
  if (/chatgpt|openai|perplexity|claude\.ai|copilot|gemini/.test(host)) return 'ai';
  return 'other';
}

type Count = { pv: number; uv: number };
type Stats = { today: Count; yesterday: Count; total: Count };

const jstDay = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
const n = (v: number) => v.toLocaleString('ja-JP');

export default function VisitCounter() {
  const pathname = usePathname();
  const [admin, setAdmin] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  // ページを移るたびに 1 回数える(その日の最初の 1 回だけ「来た端末」にも数える)
  useEffect(() => {
    // 手元の確認(localhost)と管理者本人の閲覧は数えない。どちらも本番の Firestore に書いていて、
    // 2026-11-13〜15 の 665 PV はほとんどが確認作業だった
    if (location.hostname !== 'yaneyuka.com') return;
    try {
      if (localStorage.getItem(SKIP_KEY)) return;
    } catch {
      /* 数える */
    }
    let first = false;
    try {
      const today = jstDay();
      if (localStorage.getItem(DAY_KEY) !== today) {
        localStorage.setItem(DAY_KEY, today);
        first = true;
      }
    } catch {
      /* 保存できない端末は開いた回数だけ数える */
    }
    // どこから来たか(検索・SNS・直接など)は、その訪問の最初のページでだけ送る。参照元はドメインだけ
    let from: string | undefined;
    try {
      if (!sessionStorage.getItem(SESSION_KEY)) {
        sessionStorage.setItem(SESSION_KEY, '1');
        from = sourceOf(document.referrer);
      }
    } catch {
      /* 数えない */
    }
    fetch('/api/visit/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first, path: pathname, from }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        const isAdmin = u?.email === ADMIN_EMAIL;
        if (isAdmin) {
          try {
            localStorage.setItem(SKIP_KEY, '1');
          } catch {}
        }
        setAdmin(isAdmin ? u : null);
      }),
    [],
  );

  // 管理者のときだけ読む。ページを移るたびに読み直す(数えた直後なので少し待つ)
  useEffect(() => {
    if (!admin) {
      setStats(null);
      return;
    }
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/visit/', { headers: { Authorization: `Bearer ${await admin.getIdToken()}` }, cache: 'no-store' });
        const json = await res.json();
        if (alive && json.ok) setStats(json as Stats);
      } catch {
        /* 読めなければ出さない */
      }
    }, 800);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [admin, pathname]);

  if (!stats) return null;
  return (
    <div
      className="yy-visits"
      title={`開いた回数(PV) 今日 ${n(stats.today.pv)} / 昨日 ${n(stats.yesterday.pv)} / 累計 ${n(stats.total.pv)}`}
    >
      <span>今日 {n(stats.today.uv)}</span>
      <span>昨日 {n(stats.yesterday.uv)}</span>
      <span>累計 {n(stats.total.uv)}</span>
    </div>
  );
}
