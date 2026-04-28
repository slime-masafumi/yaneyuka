"use client";

import React, { useEffect, useMemo, useState } from 'react';
import EventInfo, { EventItem, defaultEvents } from '../../content/EventInfo';
import { listEventBookmarks, setEventBookmark, deleteEventBookmark } from '@/lib/firebaseUserData';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebaseClient';
import { collection, onSnapshot } from 'firebase/firestore';

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

  // --- フィルタリングロジック（日付パース等の重い処理を削除） ---
  const visibleEvents = useMemo(() => {
    // データがまだなければ空配列を返す
    if (!events.length) return [];

    // API側ですでに日付順になっている前提
    let filtered = events;

    // 1. 地域フィルタを先に適用（確定したプロパティで比較）
    if (region !== 'all') {
      if (region === 'tokyo') {
        // 首都圏 = 東京 + 千葉
        filtered = filtered.filter(ev => ev.region === 'tokyo' || ev.region === 'chiba');
      } else {
        // その他の地域は完全一致でフィルタ
        filtered = filtered.filter(ev => ev.region === region);
      }
    }

    // 2. 過去イベントの除外（ISO文字列で比較）
    const today = new Date().toISOString().split('T')[0]; // "2025-12-01" 形式
    const beforePastFilter = filtered.length;
    filtered = filtered.filter(ev => {
      // endDateがあればそれを使用、なければstartDateを使用
      const compareDate = ev.endDate || ev.startDate;
      if (!compareDate) return true; // 日付がない場合は表示（後方互換性）
      const isFuture = compareDate >= today;
      // デバッグ用（開発環境のみ）
      if (process.env.NODE_ENV === 'development' && region === 'other') {
        console.log('Past event filter:', {
          title: ev.title,
          region: ev.region,
          compareDate,
          today,
          isFuture
        });
      }
      return isFuture;
    });
    // デバッグ用（開発環境のみ）
    if (process.env.NODE_ENV === 'development' && region === 'other') {
      console.log('Filter summary:', {
        region,
        beforePastFilter,
        afterPastFilter: filtered.length,
        today,
        events: filtered.map(e => ({ title: e.title, startDate: e.startDate, endDate: e.endDate }))
      });
    }

    // 3. リンク切れ対策（Google検索への置換ロジックを注入）
    return filtered.map(ev => ({
      ...ev,
      link: ev.isLinkActive !== false 
        ? ev.link 
        : `https://www.google.com/search?q=${encodeURIComponent(ev.title + " " + ev.dateText)}`
    }));
  }, [events, region]);

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
    'all': '全地域',
    'tokyo': '首都圏',
    'nagoya': '名古屋',
    'osaka': '大阪',
    'fukuoka': '福岡',
    'other': 'その他'
  };

  return (
    <div>
      <div className="flex items-baseline mb-2">
        <h2 className="text-xl font-semibold">イベント情報</h2>
        <a href="/register" className="text-[11px] text-gray-600 hover:text-gray-800 ml-3">掲載希望はコチラ</a>
      </div>
      <p className="text-[12px] text-gray-600 mb-3">
        建築・建材・インフラ分野の展示会やセミナー情報をまとめています。気になるイベントはブックマークして、チームとの共有や訪問計画にご活用ください。
      </p>
      
      {/* フィルタボタンエリア */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2">
        {(['all', 'tokyo', 'nagoya', 'osaka', 'fukuoka', 'other'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            className={`text-xs px-2 py-1 rounded min-w-[60px] whitespace-nowrap ${
              region === r ? 'bg-gray-700 text-white' : 'bg-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {regionLabels[r]}
          </button>
        ))}
      </div>

      {/* スマホ: ブックマークを最上段に表示 */}
      <div className="lg:hidden mb-4">
        <div className="space-y-3">
          <div className="text-sm font-semibold">ブックマーク</div>
          {bookmarkedList.length === 0 && (
            <div className="text-[12px] text-gray-500">ブックマークはまだありません。</div>
          )}
          <div className="space-y-2">
            {bookmarkedList.map(b => {
              const apiEvent = events.find(e => e.id === b.id);
              const link = apiEvent?.isLinkActive !== false 
                ? b.link 
                : `https://www.google.com/search?q=${encodeURIComponent(b.title)}`;
              return (
                <div key={`bm-${b.id}`} className="p-3 border rounded bg-white">
                  <div className="text-[13px] font-medium text-blue-700">
                    <a 
                      href={link}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="hover:underline"
                    >
                      {b.title}
                    </a>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">{b.dateText}・{b.venue}</div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleBookmark(b)}
                      className="text-[11px] px-2 py-1 rounded border bg-white hover:bg-gray-50 border-gray-300 text-gray-700"
                    >
                      解除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PC: 2列表示 */}
      <div className="hidden lg:grid grid-cols-3 gap-4 items-start">
        <div className="col-span-2">
          {visibleEvents.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              該当するイベントはありません。
            </div>
          ) : (
            <EventInfo 
              showHeader={false} 
              onToggleBookmark={toggleBookmark} 
              isBookmarked={isBookmarked} 
              items={visibleEvents} 
            />
          )}
        </div>
        <div className="col-span-1">
          <div className="sticky top-4 space-y-3">
            <div className="text-sm font-semibold">ブックマーク</div>
            {bookmarkedList.length === 0 && (
              <div className="text-[12px] text-gray-500">ブックマークはまだありません。</div>
            )}
            <div className="space-y-2">
              {bookmarkedList.map(b => {
                const apiEvent = events.find(e => e.id === b.id);
                const link = apiEvent?.isLinkActive !== false 
                  ? b.link 
                  : `https://www.google.com/search?q=${encodeURIComponent(b.title)}`;
                return (
                  <div key={`bm-${b.id}`} className="p-3 border rounded bg-white">
                    <div className="text-[13px] font-medium text-blue-700">
                      <a 
                        href={link}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="hover:underline"
                      >
                        {b.title}
                      </a>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">{b.dateText}・{b.venue}</div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleBookmark(b)}
                        className="text-[11px] px-2 py-1 rounded border bg-white hover:bg-gray-50 border-gray-300 text-gray-700"
                      >
                        解除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* スマホ: 本文エリア（1列表示） */}
      <div className="lg:hidden">
        {visibleEvents.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            該当するイベントはありません。
          </div>
        ) : (
          <EventInfo 
            showHeader={false} 
            onToggleBookmark={toggleBookmark} 
            isBookmarked={isBookmarked} 
            items={visibleEvents} 
          />
        )}
      </div>
    </div>
  );
}
