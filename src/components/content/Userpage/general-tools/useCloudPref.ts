'use client';
/**
 * ツールの小さな登録データ（電卓の自分の定数・単位変換の定尺品目など）を、
 * ログイン中だけ Firestore にも置いて端末間で同じにする。
 *
 *   users/{uid}/toolSettings/{docId}  … { items, updatedAt }
 *
 * localStorage への保存は呼び出し側が今までどおり行う（未ログインのときと、オフラインの控え）。
 * 初めてログインした端末でクラウドに文書が無ければ、手元の中身を上げる（移行。手元を捨てない）。
 * 文書があればクラウドを正として手元へ入れる。自分の書き込みの戻りは中身が同じなので無視する。
 */
import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

export type CloudPrefStatus = 'local' | 'syncing' | 'synced' | 'error';

export function useCloudPref<T>(
  uid: string | null | undefined,
  docId: string,
  value: T,
  apply: (next: T) => void
): CloudPrefStatus {
  const [status, setStatus] = useState<CloudPrefStatus>('local');
  // 最後にクラウドと一致していた中身。null のあいだは書かない（初回の読み込み待ち）
  const synced = useRef<string | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const applyRef = useRef(apply);
  applyRef.current = apply;

  useEffect(() => {
    synced.current = null;
    if (!uid) {
      setStatus('local');
      return;
    }
    setStatus('syncing');
    const ref = doc(db, 'users', uid, 'toolSettings', docId);
    return onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          if (synced.current !== null) return;
          // 端末の控え（キャッシュ）に無いだけかもしれないので、サーバーの答えを待つ
          if (snap.metadata.fromCache) return;
          // 移行: 手元の中身を上げる
          const local = valueRef.current;
          synced.current = JSON.stringify(local);
          setDoc(ref, { items: local, updatedAt: serverTimestamp() })
            .then(() => setStatus('synced'))
            .catch(() => setStatus('error'));
          return;
        }
        const items = snap.data().items as T | undefined;
        if (items === undefined) return;
        const json = JSON.stringify(items);
        if (json !== synced.current) {
          synced.current = json;
          if (json !== JSON.stringify(valueRef.current)) applyRef.current(items);
        }
        setStatus('synced');
      },
      () => setStatus('error')
    );
  }, [uid, docId]);

  // 手元で変えたら書く（打鍵のたびに書かないよう少し待つ）
  useEffect(() => {
    if (!uid || synced.current === null) return;
    const json = JSON.stringify(value);
    if (json === synced.current) return;
    const t = setTimeout(() => {
      synced.current = json;
      setDoc(doc(db, 'users', uid, 'toolSettings', docId), { items: value, updatedAt: serverTimestamp() })
        .then(() => setStatus('synced'))
        .catch(() => setStatus('error'));
    }, 800);
    return () => clearTimeout(t);
  }, [uid, docId, value]);

  return status;
}
