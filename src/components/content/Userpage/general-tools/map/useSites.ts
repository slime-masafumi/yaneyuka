'use client';
/**
 * 地図に保存した敷地（ピン＋メモ＋求積）。
 * ログイン中は Firestore（users/{uid}/mapMeta/sites）に置いて端末間で揃え、
 * ログインしていなければこのブラウザの localStorage に置く。
 * 件数は多くないので1文書の配列で持つ（Firestore ルールは users/{uid}/** で既に許可済み）。
 */
import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/AuthContext';
import type { LatLng } from '@/lib/siteGeo';
import type { ZoneInfo } from './zoningStore';

export type Site = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  zoom: number;
  memo: string;
  /** 求積した敷地の頂点 */
  polygon?: LatLng[];
  area?: number;
  zone?: ZoneInfo;
  createdAt: number;
};

const LOCAL_KEY = 'yy-map-sites';

const readLocal = (): Site[] => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  } catch {
    return [];
  }
};

export function useSites() {
  const { isLoggedIn, currentUser } = useAuth();
  const uid = isLoggedIn ? currentUser?.uid : undefined;
  const [sites, setSites] = useState<Site[]>([]);

  useEffect(() => {
    if (!uid) {
      setSites(readLocal());
      return;
    }
    return onSnapshot(doc(db, 'users', uid, 'mapMeta', 'sites'), (snap) => {
      setSites(((snap.data()?.items as Site[]) ?? []).slice().sort((a, b) => b.createdAt - a.createdAt));
    });
  }, [uid]);

  const save = useCallback(
    async (next: Site[]) => {
      setSites(next);
      // Firestore は undefined を受け付けない
      const clean = JSON.parse(JSON.stringify(next));
      if (uid) await setDoc(doc(db, 'users', uid, 'mapMeta', 'sites'), { items: clean });
      else
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(clean));
        } catch {
          /* 保存できない環境では、この画面を開いている間だけ持つ */
        }
    },
    [uid]
  );

  const add = (site: Omit<Site, 'id' | 'createdAt'>) =>
    save([{ ...site, id: `s-${Date.now()}`, createdAt: Date.now() }, ...sites]);
  const update = (id: string, patch: Partial<Site>) => save(sites.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const remove = (id: string) => save(sites.filter((s) => s.id !== id));

  return { sites, add, update, remove, synced: !!uid };
}
