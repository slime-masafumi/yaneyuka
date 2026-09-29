'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FiBell } from 'react-icons/fi';
import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc, writeBatch } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebaseClient';

/**
 * 上部ナビのベル。users/{uid}/notifications を新しい順に出す。
 *
 * 他人宛ての通知は Cloud Functions だけが書く（functions/src/notifications.ts）:
 * Teamタスクの担当になった / Myタスク・Teamタスク・カレンダーの期限が今日・明日 / スケ調の締切まで 24 時間。
 * 自分宛ての通知は画面からも書く（ルールは本人のみ書き込み可）: My法規の改正検知、資料箱のカタログ更新。
 * 画面を開いている間に新しく届いたものは、ブラウザの通知が許可されていればそちらにも出す。
 */
type Notice = { id: string; title: string; body: string; link: string; createdAt: number; read: boolean };

const stamp = (ms: number) => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function NotificationBell() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const seenRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setItems([]);
      seenRef.current = null;
      return;
    }
    const q = query(collection(db, 'users', currentUser.uid, 'notifications'), orderBy('createdAt', 'desc'), limit(30));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Notice, 'id'>) }));
      // 最初の読み込みで出すと、開くたびに古い通知が鳴る。2回目以降に増えた未読だけ
      if (seenRef.current && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        for (const n of list) {
          if (!n.read && !seenRef.current.has(n.id)) {
            try { new Notification(n.title, { body: n.body, icon: '/favicon.png', tag: `yy-${n.id}` }); } catch {}
          }
        }
      }
      seenRef.current = new Set(list.map((n) => n.id));
      setItems(list);
    }, () => setItems([]));
  }, [currentUser]);

  // 外側を押すか Esc で閉じる
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!currentUser) return null;
  const unread = items.filter((n) => !n.read).length;

  const openNotice = async (n: Notice) => {
    setOpen(false);
    if (!n.read) {
      try { await updateDoc(doc(db, 'users', currentUser.uid, 'notifications', n.id), { read: true }); } catch {}
    }
    // 左カラムの画面は URL を初回読み込みでしか見ないので、ページごと開き直す
    if (n.link) window.location.assign(n.link);
  };

  const readAll = async () => {
    const batch = writeBatch(db);
    items.filter((n) => !n.read).forEach((n) => batch.update(doc(db, 'users', currentUser.uid, 'notifications', n.id), { read: true }));
    try { await batch.commit(); } catch {}
  };

  return (
    <div ref={boxRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `通知 ${unread} 件` : '通知'}
        title={unread ? `未読の通知が${unread}件あります` : '通知'}
        className="relative flex items-center px-2 text-gray-500 hover:text-gray-800"
      >
        <FiBell className="w-3.5 h-3.5" />
        {unread > 0 && (
          <span className="absolute -top-1.5 right-0 inline-flex min-w-[14px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-[14px] text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[320px] bg-white border border-[#3b3b3b] text-left shadow-md">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
            <span className="font-mono text-[10px] tracking-[0.12em] text-gray-500">NOTICE</span>
            {unread > 0 && (
              <button type="button" onClick={readAll} className="text-[10px] text-gray-500 underline underline-offset-2 hover:text-gray-800">
                すべて既読にする
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-[11px] text-gray-400">
              通知はまだありません
              <br />
              <span className="text-[10px]">Teamタスクの担当・タスクとカレンダーの期限（前日と当日）・スケ調の締切・法令の改正・カタログの更新が届きます</span>
            </p>
          ) : (
            <ul className="max-h-[360px] overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} className="border-b border-gray-100 last:border-b-0">
                  <button type="button" onClick={() => openNotice(n)} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex gap-2">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-red-500'}`} />
                    <span className="min-w-0">
                      <span className={`block text-[11px] ${n.read ? 'text-gray-500' : 'text-gray-900 font-bold'}`}>{n.title}</span>
                      <span className="block text-[11px] text-gray-600 break-words">{n.body}</span>
                      <span className="block font-mono text-[9px] tracking-wider text-gray-400 mt-0.5">{stamp(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
