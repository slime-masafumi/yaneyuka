'use client';
/**
 * メーカー資料箱（users/{uid}/makerBox）の購読。建材ページの各行に「資料箱へ」ボタンが並ぶので、
 * 行ごとに購読せず、1 本の購読を全ボタンで分け合う。
 */
import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import type { MakerBoxItem } from '@/lib/makerBox';

type Listener = (items: MakerBoxItem[]) => void;

let currentUid: string | null = null;
let items: MakerBoxItem[] = [];
let unsub: (() => void) | null = null;
const listeners = new Set<Listener>();

function start(uid: string) {
  if (currentUid === uid && unsub) return;
  unsub?.();
  currentUid = uid;
  items = [];
  unsub = onSnapshot(
    collection(db, 'users', uid, 'makerBox'),
    (snap) => {
      items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MakerBoxItem, 'id'>) }));
      listeners.forEach((l) => l(items));
    },
    (err) => console.error('makerBox watch error', err),
  );
}

function stopIfIdle() {
  if (listeners.size === 0 && unsub) {
    unsub();
    unsub = null;
    currentUid = null;
    items = [];
  }
}

export function useMakerBox(uid: string | null | undefined): MakerBoxItem[] {
  const [list, setList] = useState<MakerBoxItem[]>(uid && uid === currentUid ? items : []);
  useEffect(() => {
    if (!uid) {
      setList([]);
      return;
    }
    start(uid);
    setList(items);
    const l: Listener = (next) => setList(next);
    listeners.add(l);
    return () => {
      listeners.delete(l);
      stopIfIdle();
    };
  }, [uid]);
  return list;
}

export async function saveMakerBoxItem(uid: string, item: MakerBoxItem) {
  const { id, ...rest } = item;
  await setDoc(doc(db, 'users', uid, 'makerBox', id), { ...rest, updatedAt: Date.now() }, { merge: true });
}

export async function removeMakerBoxItem(uid: string, id: string) {
  await deleteDoc(doc(db, 'users', uid, 'makerBox', id));
}
