'use client';
/**
 * Myカレンダーの「このブラウザに保存」。
 *
 * 未ログインでは日付を押すと alert('会員登録が必要です') で止まり、予定を 1 件も入れられなかった。
 * 未ログインの間は localStorage（yy-guest-calendar）に予定と種別を保存し、
 * ログインしたらクラウド（users/{uid}/calendarEvents）が空なら手元を上げる。
 * クラウドに既に予定があるときは黙って混ぜず、「アカウントに追加」を出す。
 */
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebaseClient';
import { addDoc, collection, doc, getDocs, limit, query, writeBatch } from 'firebase/firestore';
import { DEFAULT_CATEGORIES } from './categories';

export const GUEST_CALENDAR_KEY = 'yy-guest-calendar';
/** 外部カレンダー（URL 購読）の一覧。ログイン中は calendarIcs:{uid} */
export const GUEST_FEEDS_KEY = 'yy-guest-calendar-feeds';
/** 左の欄・地の色。ログイン中は calendarTheme:{uid} */
export const GUEST_THEME_KEY = 'yy-guest-calendar-theme';

type Row = Record<string, unknown> & { id: string };
export type GuestCalendar = { events: Row[]; categories: Row[] };

/** 未ログインの予定の id。Firestore の id と重ならないよう g で始める */
export const guestId = () => `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const readGuestCalendar = (): GuestCalendar | null => {
  try {
    const raw = window.localStorage.getItem(GUEST_CALENDAR_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || !Array.isArray(v.events)) return null;
    return { events: v.events, categories: Array.isArray(v.categories) ? v.categories : [] };
  } catch {
    return null;
  }
};

export const writeGuestCalendar = (data: GuestCalendar) => {
  try { window.localStorage.setItem(GUEST_CALENDAR_KEY, JSON.stringify(data)); } catch { /* 容量・プライベートモード */ }
};

export const clearGuestCalendar = () => {
  try { window.localStorage.removeItem(GUEST_CALENDAR_KEY); } catch { /* noop */ }
};

/** 連続した予定（帯）は 1 件と数える */
const countEvents = (events: Row[]) => events.filter((e) => !e.spanPart || e.spanPart === 'single' || e.spanPart === 'start').length;

async function uploadGuestCalendar(uid: string, data: GuestCalendar): Promise<number> {
  // 種別: 既定の種別はカレンダー側の購読が作るので、それ以外で無いものだけ足す（二重にしない）
  const catSnap = await getDocs(collection(db, 'users', uid, 'calendarCategories'));
  const names = new Set<string>([
    ...catSnap.docs.map((d) => String((d.data() as { name?: string }).name ?? '')),
    ...DEFAULT_CATEGORIES.map((c) => c.name),
  ]);
  for (const c of data.categories) {
    const name = String(c.name ?? '');
    if (!name || names.has(name)) continue;
    names.add(name);
    await addDoc(collection(db, 'users', uid, 'calendarCategories'), { name, color: String(c.color ?? '#6B7280') });
  }
  for (let i = 0; i < data.events.length; i += 400) {
    const batch = writeBatch(db);
    data.events.slice(i, i + 400).forEach(({ id: _id, ...rest }) => {
      const clean: Record<string, unknown> = {};
      Object.entries(rest).forEach(([k, v]) => { if (v !== undefined) clean[k] = v; });
      batch.set(doc(collection(db, 'users', uid, 'calendarEvents')), clean);
    });
    await batch.commit();
  }
  return countEvents(data.events);
}

const inFlight = new Set<string>();

/** ログインしたときの引っ越し（Myタスクと同じ考え方） */
export function useGuestCalendarMigration(uid: string | undefined) {
  const [pending, setPending] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!uid) { setPending(0); return; }
    const guest = readGuestCalendar();
    if (!guest || !guest.events.length || inFlight.has(uid)) return;
    inFlight.add(uid);
    (async () => {
      try {
        const cloud = await getDocs(query(collection(db, 'users', uid, 'calendarEvents'), limit(1)));
        if (cloud.empty) {
          const n = await uploadGuestCalendar(uid, guest);
          clearGuestCalendar();
          setMessage(`このブラウザに保存していた予定 ${n} 件をアカウントへ移しました。`);
        } else {
          setPending(countEvents(guest.events));
        }
      } catch {
        setPending(countEvents(guest.events));
      } finally {
        inFlight.delete(uid);
      }
    })();
  }, [uid]);

  const addNow = async () => {
    const guest = readGuestCalendar();
    if (!uid || !guest) return;
    try {
      const n = await uploadGuestCalendar(uid, guest);
      clearGuestCalendar();
      setPending(0);
      setMessage(`このブラウザの予定 ${n} 件をアカウントに追加しました。`);
    } catch {
      setMessage('アカウントへの追加に失敗しました。通信を確かめてもう一度押してください。');
    }
  };

  return { pending, addNow, message, dismiss: () => { setPending(0); setMessage(''); } };
}
