"use client";

import React, { useEffect, useMemo, useState } from 'react';
import type { EventItem } from '../../content/EventInfo';
import { listEventBookmarks, setEventBookmark, deleteEventBookmark } from '@/lib/firebaseUserData';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebaseClient';
import { collection, onSnapshot } from 'firebase/firestore';
import PageHead, { Stat } from '../../ui/PageHead';

// APIから返ってくるデータの型拡張
type ApiEventItem = EventItem & {
  startDate?: string;
  endDate?: string;
  region?: 'tokyo' | 'osaka' | 'nagoya' | 'fukuoka' | 'chiba' | 'other';
  isLinkActive?: boolean;
};

export default function EventsWithBookmarks() {
  const { currentUser, isLoggedIn } = useAuth();
  const uid = currentUser?.uid || null;
  
  const [bookmarks, setBookmarks] = useState<Record<string, EventItem>>({});
  const [events, setEvents] = useState<ApiEventItem[]>([]);
  // 'other' も選択できるように復活
  const [region, setRegion] = useState<'all' | 'tokyo' | 'nagoya' | 'osaka' | 'fukuoka' | 'other'>('all');

  // --- ブックマーク関連のuseEffect（変更なし） ---
  useEffect(() => {
    if (!uid) {
      if (isLoggedIn === false) setBookmarks({});
      return;
    }
    
    // 1) 即時: localStorageキャッシュを表示
    try {
      const cached = localStorage.getItem(`eventBookmarks:${uid}`);
      if (cached) {
        const parsed = JSON.parse(cached) as Record<string, EventItem>;
        setBookmarks(parsed);
      }
    } catch {}

    // 2) リアルタイム購読: Firestoreの最新を反映
    const colRef = collection(db, 'users', uid, 'eventBookmarks');
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        if (snap.empty) {
          if (snap.metadata.fromCache || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
            return;
          }
        }
        const map: Record<string, EventItem> = {};
        snap.docs.forEach(d => {
          const data = d.data() as any;
          map[d.id] = {
            id: d.id,
            title: data.title || '',
            description: data.meta?.description || '',
            dateText: data.meta?.dateText || '',
            venue: data.meta?.venue || '',
            link: data.link || '#',
            region: data.region || 'other',
            isOfficial: data.isOfficial || false,
          };
        });
        setBookmarks(map);
        try { localStorage.setItem(`eventBookmarks:${uid}`, JSON.stringify(map)); } catch {}
      },
      (error) => {
        console.error('イベントブックマークの購読に失敗しました', error);
      }
    );

    // 3) バックグラウンドで一度フル取得（保険）
    (async () => {
      try {
        const list = await listEventBookmarks(uid);
        const map: Record<string, EventItem> = {};
        list.forEach(b => {
          map[b.id] = { 
            id: b.id, 
            title: b.title, 
            description: b.meta?.description || '', 
            dateText: b.meta?.dateText || '', 
            venue: b.meta?.venue || '', 
            link: b.link || '#' 
          } as EventItem;
        });
        setBookmarks(map);
        try { localStorage.setItem(`eventBookmarks:${uid}`, JSON.stringify(map)); } catch {}
      } catch {}
    })();

    return () => unsub();
  }, [uid, isLoggedIn]);

  // --- イベント取得（ポーリング廃止、初回のみ取得） ---
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/events');
        if (!res.ok) return;
        const json = await res.json();
        // API側ですでにソート・加工済みなのでそのままセット
        setEvents(json?.items || []);
      } catch (e) {
        console.error("イベント取得エラー", e);
      }
    };
    fetchEvents();
    // setIntervalは削除（サーバー負荷軽減・UX向上）
  }, []);

  // --- ブックマーク操作 ---
  const isBookmarked = (id: string) => !!bookmarks[id];
  const toggleBookmark = async (item: EventItem) => {
    if (!uid) { 
      alert('ブックマークには会員登録（無料）が必要です。'); 
      return;
    }
    setBookmarks(prev => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = item;
      }
      try { localStorage.setItem(`eventBookmarks:${uid}`, JSON.stringify(next)); } catch {}
      return next;
    });
    const exists = !!bookmarks[item.id];
    if (exists) {
      await deleteEventBookmark(uid, item.id);
    } else {
      await setEventBookmark(uid, item.id, {
        title: item.title,
        link: item.link,
        meta: { description: item.description, dateText: item.dateText, venue: item.venue },
        createdAt: Date.now(),
      });
    }
  };

  // ブックマークリストのソート
  const bookmarkedList = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return Object.values(bookmarks)
      .filter(b => {
        // startDateまたはendDateで過去判定
        const apiEvent = events.find(e => e.id === b.id);
        if (apiEvent) {
          const compareDate = apiEvent.endDate || apiEvent.startDate;
          if (compareDate) return compareDate >= today;
        }
        return true; // 日付がない場合は表示（後方互換性）
      })
      .sort((a, b) => {
        const aEvent = events.find(e => e.id === a.id);
        const bEvent = events.find(e => e.id === b.id);
        const aDate = aEvent?.startDate || '';
        const bDate = bEvent?.startDate || '';
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return aDate.localeCompare(bDate);
      });
  }, [bookmarks, events]);

  // 地域フィルタボタンのラベル
  const regionLabels: Record<string, string> = {
    'all': 'すべて',
    'tokyo': '首都圏',
    'nagoya': '名古屋',
    'osaka': '大阪',
    'fukuoka': '福岡',
    'other': 'その他'
  };
  const regionName: Record<string, string> = { tokyo: '東京', chiba: '千葉', osaka: '大阪', nagoya: '名古屋', fukuoka: '福岡', other: 'その他' };

  // ---- モック「高級感 3」Q11：これから / 終わったもの の表、右にカレンダー・会場・保存 ----
  const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  const inRegion = events.filter((ev) =>
    region === 'all' ? true : region === 'tokyo' ? ev.region === 'tokyo' || ev.region === 'chiba' : ev.region === region,
  );
  const withLink = (ev: ApiEventItem) => ({
    ...ev,
    link: ev.isLinkActive !== false ? ev.link : `https://www.google.com/search?q=${encodeURIComponent(ev.title + ' ' + ev.dateText)}`,
  });
  const upcoming = inRegion.filter((ev) => (ev.endDate || ev.startDate || '9999') >= today).map(withLink);
  const past = inRegion.filter((ev) => (ev.endDate || ev.startDate || '9999') < today).reverse().map(withLink);
  const md = (iso?: string) => (iso ? iso.slice(5).replace('-', '.') : '');
  const yy = (iso?: string) => (iso && iso.slice(0, 4) !== today.slice(0, 4) ? `’${iso.slice(2, 4)} ` : '');
  const daysTo = upcoming[0]?.startDate ? Math.round((Date.parse(upcoming[0].startDate) - Date.parse(today)) / 86400000) : null;
  const venues = Object.entries(
    events.reduce<Record<string, number>>((m, e) => {
      const k = (e.venue || '').split(/\s/)[0];
      if (k) m[k] = (m[k] || 0) + 1;
      return m;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  // カレンダー：今月と来月。会期の日を濃い緑で塗る
  const months = [0, 1].map((k) => {
    const d = new Date(Date.parse(today));
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + k);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
    const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const hit = new Set<number>();
    events.forEach((e) => {
      if (!e.startDate) return;
      const s0 = Date.parse(e.startDate);
      const s1 = Date.parse(e.endDate || e.startDate);
      for (let t = s0; t <= s1; t += 86400000) {
        const dd = new Date(t);
        if (dd.getUTCFullYear() === y && dd.getUTCMonth() === m) hit.add(dd.getUTCDate());
      }
    });
    const isThis = today.slice(0, 7) === `${y}-${String(m + 1).padStart(2, '0')}`;
    return { label: `${y}.${String(m + 1).padStart(2, '0')}`, first, days, hit, todayD: isThis ? Number(today.slice(8, 10)) : 0 };
  });

  const row = (ev: ApiEventItem, i: number, done: boolean) => (
    <div key={ev.id} className={`yy-ev__row${done ? ' is-past' : ''}${!done && i === 0 ? ' is-next' : ''}`}>
      <span className="yy-ev__date">{yy(ev.startDate)}{md(ev.startDate)}{ev.endDate && ev.endDate !== ev.startDate ? <small> 〜 {md(ev.endDate)}</small> : null}</span>
      <a className="yy-ev__title" href={ev.link} target="_blank" rel="noopener noreferrer" title={ev.description || ev.title}>{ev.title}</a>
      <span className="yy-ev__venue" title={ev.venue}>{ev.venue}</span>
      <span className="yy-ev__region">{regionName[ev.region || 'other'] || 'その他'}</span>
      {!done ? (
        <button type="button" className={`yy-news__bm${isBookmarked(ev.id) ? ' is-on' : ''}`} onClick={() => toggleBookmark(ev)} aria-pressed={isBookmarked(ev.id)}>
          {isBookmarked(ev.id) ? '★' : '☆'}
        </button>
      ) : <span />}
    </div>
  );

  return (
    <div>
      <PageHead
        no="05"
        en="events"
        title="イベント"
        desc="建築・建設の展示会"
        right={
          <>
            <Stat n={upcoming.length} label="件 これから" />
            <Stat n={past.length} label="件 終了" />
            <Stat n={venues.length} label="会場" />
            <a href="/register" className="yy-stat" style={{ textDecoration: 'none' }}>掲載希望 ↗</a>
          </>
        }
      />

      {/* 地域で絞る：下線タブ */}
      <div className="yy-tabs">
        {(['all', 'tokyo', 'nagoya', 'osaka', 'fukuoka', 'other'] as const).map((r) => (
          <button key={r} type="button" onClick={() => setRegion(r)} aria-pressed={region === r} className="yy-tab">
            {regionLabels[r]}
          </button>
        ))}
      </div>

      <div className="yy-newspage">
        <div className="yy-newspage__main">
          <section>
            <div className="yy-sec">
              <span className="yy-sec__no">I</span><span className="yy-sec__title">これから</span>
              <span className="yy-sec__right">{upcoming.length} 件{daysTo !== null ? ` · 次は ${daysTo <= 0 ? '開催中' : `${daysTo} 日後`}` : ''}</span>
            </div>
            <div className="yy-ev__row yy-ev__row--head"><span>会期</span><span>名称</span><span>会場</span><span>地域</span><span /></div>
            {upcoming.length === 0 ? <p className="yy-home__empty">該当するイベントはありません</p> : upcoming.map((ev, i) => row(ev, i, false))}
          </section>
          {past.length > 0 && (
            <section>
              <div className="yy-sec"><span className="yy-sec__no">II</span><span className="yy-sec__title">終わったもの</span><span className="yy-sec__right">{past.length} 件</span></div>
              {past.map((ev, i) => row(ev, i, true))}
            </section>
          )}
        </div>
        <aside className="yy-newspage__side">
          <section>
            <div className="yy-sec"><span className="yy-sec__no">III</span><span className="yy-sec__title">カレンダー</span></div>
            {months.map((mo) => (
              <div key={mo.label} className="yy-cal">
                <span className="yy-label">{mo.label}</span>
                <div className="yy-cal__grid">
                  {['日', '月', '火', '水', '木', '金', '土'].map((w) => <span key={w} className="yy-cal__w">{w}</span>)}
                  {Array.from({ length: mo.first }, (_, i) => <span key={`b${i}`} />)}
                  {Array.from({ length: mo.days }, (_, i) => {
                    const d = i + 1;
                    return <span key={d} className={`yy-cal__d${mo.hit.has(d) ? ' is-hit' : ''}${mo.todayD === d ? ' is-today' : ''}`}>{d}</span>;
                  })}
                </div>
              </div>
            ))}
            <div className="yy-cal__legend"><span><i className="is-hit" />会期</span><span><i className="is-today" />今日 {md(today).replace('.', '/')}</span></div>
          </section>
          <section>
            <div className="yy-sec"><span className="yy-sec__no">IV</span><span className="yy-sec__title">会場</span></div>
            <ol className="yy-home__toc">
              {venues.slice(0, 6).map(([k, n]) => (
                <li key={k}><span className="yy-srcrow"><span className="yy-home__toct">{k}</span><span className="yy-leader" /><span className="yy-serif">{n}</span></span></li>
              ))}
            </ol>
          </section>
          <section>
            <div className="yy-sec"><span className="yy-sec__no">V</span><span className="yy-sec__title">保存したイベント</span><span className="yy-sec__right">{bookmarkedList.length} 件</span></div>
            {bookmarkedList.length === 0 ? (
              <p className="yy-home__empty">各行の ☆ でここに残ります(要ログイン)</p>
            ) : (
              <ul className="yy-home__news">
                {bookmarkedList.map((b) => (
                  <li key={`bm-${b.id}`}>
                    <span className="yy-home__meta"><span>{b.dateText}</span><button type="button" className="yy-linkbtn" onClick={() => toggleBookmark(b)}>解除</button></span>
                    <a href={b.link} target="_blank" rel="noopener noreferrer" title={b.title}>{b.title}</a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
