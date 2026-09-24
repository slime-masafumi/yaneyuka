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

// ---- チームの資料箱（boards/{boardId}/makerBox）。Teamタスクのボードのメンバーで共有する ----

export type BoxScope = { kind: 'me'; uid: string } | { kind: 'team'; boardId: string; uid: string; userName: string };

const scopeCol = (scope: BoxScope) =>
  scope.kind === 'me' ? collection(db, 'users', scope.uid, 'makerBox') : collection(db, 'boards', scope.boardId, 'makerBox');

export type TeamBoxItem = MakerBoxItem & { addedBy?: string; addedByName?: string };

export function watchTeamBox(boardId: string, cb: (items: TeamBoxItem[]) => void, onError?: (e: unknown) => void) {
  return onSnapshot(
    collection(db, 'boards', boardId, 'makerBox'),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TeamBoxItem, 'id'>) }))),
    (e) => onError?.(e),
  );
}

/** 置き場所を問わず保存。チームに新しく置くときは「足した人」を付ける（ルールで必須） */
export async function saveBoxItem(scope: BoxScope, item: TeamBoxItem) {
  const { id, ...rest } = item;
  const base = {
    name: rest.name,
    categories: rest.categories ?? [],
    links: rest.links,
    extra: rest.extra ?? [],
    note: rest.note ?? '',
    createdAt: rest.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  };
  if (scope.kind === 'me') {
    await setDoc(doc(scopeCol(scope), id), base, { merge: true });
    return;
  }
  await setDoc(doc(scopeCol(scope), id), { ...base, addedBy: rest.addedBy ?? scope.uid, addedByName: rest.addedByName ?? scope.userName }, { merge: true });
}

export async function removeBoxItem(scope: BoxScope, id: string) {
  await deleteDoc(doc(scopeCol(scope), id));
}
