'use client';
/**
 * 業務管理の端末間同期。
 *
 * これまで工数はこのブラウザの localStorage にしか無く、職場と自宅で別々の記録になっていた。
 * 業務の記録としては致命的なので、ログイン中は Firestore にも置く。
 *   users/{uid}/workLog/settings   … 案件の一覧・目標時間単価
 *   users/{uid}/workLog/m-YYYY-MM  … その月の日報（1か月 1 文書。何年分でも 1 文書が太らない）
 * localStorage はそのまま残す（ログインしていないときと、オフラインの控え）。
 *
 * 初めてログインした端末に手元の記録があり、クラウドが空なら、手元の記録を上げる（移行）。
 * 以後はクラウドが正。自分の書き込みが戻ってきたときは、中身が同じなので無視する。
 */
import { useEffect, useRef, useState } from 'react';
import { collection, doc, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { mergeMonths, splitByMonth, type DailyRecords, type WorkProject } from '@/lib/workLog';

type Settings = { projects: WorkProject[]; targetRate: number };

export function useWorkLogSync(
  uid: string | undefined,
  state: { records: DailyRecords; settings: Settings },
  apply: (next: { records?: DailyRecords; settings?: Settings }) => void
): 'local' | 'syncing' | 'synced' | 'error' {
  const [status, setStatus] = useState<'local' | 'syncing' | 'synced' | 'error'>('local');
  // 最後にクラウドと一致していた中身（月ごと・設定）。差があるものだけ書く
  const synced = useRef<{ months: Record<string, string>; settings: string } | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!uid) {
      synced.current = null;
      setStatus('local');
      return;
    }
    setStatus('syncing');
    const col = collection(db, 'users', uid, 'workLog');
    let first = true;
    return onSnapshot(
      col,
      async (snap) => {
        const months: Record<string, DailyRecords> = {};
        let settings: Settings | null = null;
        snap.docs.forEach((d) => {
          if (d.id === 'settings') settings = d.data() as Settings;
          else if (d.id.startsWith('m-')) months[d.id.slice(2)] = (d.data().days ?? {}) as DailyRecords;
        });

        if (first) {
          first = false;
          const local = stateRef.current;
          const localMonths = splitByMonth(local.records);
          if (snap.empty && (Object.keys(localMonths).length || local.settings.projects.length)) {
            // 移行: 手元の記録を上げる
            const batch = writeBatch(db);
            batch.set(doc(col, 'settings'), local.settings);
            for (const [m, days] of Object.entries(localMonths)) batch.set(doc(col, `m-${m}`), { days });
            await batch.commit().catch(() => setStatus('error'));
            synced.current = {
              months: Object.fromEntries(Object.entries(localMonths).map(([m, d]) => [m, JSON.stringify(d)])),
              settings: JSON.stringify(local.settings),
            };
            setStatus('synced');
            return;
          }
        }

        // クラウドの中身を正として取り込む（自分の書き込みの戻りは中身が同じ）
        const monthJson = Object.fromEntries(Object.entries(months).map(([m, d]) => [m, JSON.stringify(d)]));
        const settingsJson = settings ? JSON.stringify(settings) : synced.current?.settings ?? '';
        const prev = synced.current;

        if (!prev) {
          // 2台目の端末: クラウドに無い日と案件だけ手元から足す（手元の記録を捨てない）。
          // 足した分は synced と違うので、下の書き込みで上がる
          const local = stateRef.current;
          const cloudRecords = mergeMonths(months);
          const records = { ...cloudRecords };
          for (const [date, entries] of Object.entries(splitByMonth(local.records)).flatMap(([, d]) => Object.entries(d))) {
            if (!records[date]) records[date] = entries;
          }
          const cloudSettings: Settings = settings ?? { projects: [], targetRate: local.settings.targetRate };
          const projects = [...cloudSettings.projects, ...local.settings.projects.filter((p) => !cloudSettings.projects.some((c) => c.id === p.id))];
          synced.current = { months: monthJson, settings: settingsJson };
          apply({ records, settings: { ...cloudSettings, projects } });
          setStatus('synced');
          return;
        }

        const changed =
          !prev ||
          settingsJson !== prev.settings ||
          Object.keys(monthJson).length !== Object.keys(prev.months).length ||
          Object.entries(monthJson).some(([m, j]) => prev.months[m] !== j);
        synced.current = { months: monthJson, settings: settingsJson };
        if (changed) apply({ records: mergeMonths(months), settings: settings ?? undefined });
        setStatus('synced');
      },
      () => setStatus('error')
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // 手元で変えたら、変わった月と設定だけを書く（打鍵のたびに書かないよう 1 秒待つ）
  useEffect(() => {
    if (!uid || !synced.current) return;
    const t = setTimeout(async () => {
      const cur = synced.current;
      if (!cur) return;
      const col = collection(db, 'users', uid, 'workLog');
      const months = splitByMonth(stateRef.current.records);
      const writes: Promise<void>[] = [];
      const next = { months: { ...cur.months }, settings: cur.settings };
      for (const [m, days] of Object.entries(months)) {
        const j = JSON.stringify(days);
        if (cur.months[m] !== j) {
          writes.push(setDoc(doc(col, `m-${m}`), { days }));
          next.months[m] = j;
        }
      }
      // 月の記録を全部消したときは空にする
      for (const m of Object.keys(cur.months)) {
        if (!months[m] && cur.months[m] !== '{}') {
          writes.push(setDoc(doc(col, `m-${m}`), { days: {} }));
          next.months[m] = '{}';
        }
      }
      const s = JSON.stringify(stateRef.current.settings);
      if (s !== cur.settings) {
        writes.push(setDoc(doc(col, 'settings'), stateRef.current.settings));
        next.settings = s;
      }
      if (!writes.length) return;
      synced.current = next;
      try {
        await Promise.all(writes);
        setStatus('synced');
      } catch {
        setStatus('error');
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [uid, state.records, state.settings]);

  return status;
}
