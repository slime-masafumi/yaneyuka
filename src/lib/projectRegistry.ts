'use client';

/**
 * 物件の共通台帳(2026-11-16)。
 *
 * それまで物件名はツールごとの自由文字だった(Myタスクの【】・メモのフォルダ・工事写真の工事名・
 * yymail の物件・業務管理の案件・物件カルテ)。表記ゆれで束が割れ、「A 邸の宿題・メール・写真・工数」を
 * 1 画面で見られなかった。ここを正本にして、各ツールは物件をここから選ぶ。
 *
 * 保存先:
 *   ログイン中 … Firestore users/{uid}/projectRegistry/{id}(本人だけが読み書き。既存のルール users/{uid}/{document=**})
 *   未ログイン … このブラウザ(localStorage 'yy-project-registry')
 * ログインしたとき、このブラウザの物件と物件カルテの案件を台帳へ足す(同じ名前は足さない)。
 *
 * 使い方:
 *   const { projects, active, add, rename, setStatus, ready } = useProjectRegistry();
 *   add('（仮）神田オフィスビル') → 既にあれば既存の id を返す
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebaseClient';
import { useAuth } from './AuthContext';

export type RegProject = {
  id: string;
  name: string;
  /** 所在地(任意) */
  addr?: string;
  /** 進行中 / 竣工・終了(終了は選択肢に出さない) */
  status: 'active' | 'done';
  /** 物件カルテの案件 id(つながっているとき) */
  karteId?: string;
  createdAt: number;
  updatedAt: number;
};

const LOCAL_KEY = 'yy-project-registry';
const KARTE_KEY = 'yaneyuka.karte';
const EVENT = 'yy-project-registry';

/** 表記ゆれをそろえた比較用の名前(全角/半角・空白・括弧の違いを吸収) */
export const projectKey = (name: string) =>
  name
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[()（）【】「」]/g, '')
    .toLowerCase();

const newId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function readLocal(): RegProject[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const list = raw ? (JSON.parse(raw) as RegProject[]) : [];
    return Array.isArray(list) ? list.filter((p) => p && p.id && p.name) : [];
  } catch {
    return [];
  }
}
function writeLocal(list: RegProject[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* 保存できない端末はメモリだけ */
  }
}

/** 物件カルテ(このブラウザ)の案件。台帳に無いものを足すのに使う */
function karteProjects(): { id: string; name: string; addr?: string }[] {
  try {
    const raw = localStorage.getItem(KARTE_KEY);
    const d = raw ? (JSON.parse(raw) as { projects?: { id: string; name: string; addr?: string }[] }) : null;
    return (d?.projects ?? []).filter((p) => p && p.id && p.name && p.id !== 'demo');
  } catch {
    return [];
  }
}

/** 足りない物件を足した一覧(名前の表記ゆれは同じ物件とみなす) */
function mergeIn(base: RegProject[], extra: { name: string; addr?: string; karteId?: string }[]): RegProject[] {
  const out = [...base];
  const keys = new Set(out.map((p) => projectKey(p.name)));
  const now = Date.now();
  for (const e of extra) {
    const k = projectKey(e.name);
    if (!k || keys.has(k)) {
      // 既にある物件にカルテの id をつなぐ
      if (e.karteId) {
        const hit = out.find((p) => projectKey(p.name) === k);
        if (hit && !hit.karteId) Object.assign(hit, { karteId: e.karteId, updatedAt: now });
      }
      continue;
    }
    keys.add(k);
    out.push({ id: newId(), name: e.name.trim(), addr: e.addr, karteId: e.karteId, status: 'active', createdAt: now, updatedAt: now });
  }
  return out;
}

export function useProjectRegistry() {
  const { currentUser, authReady } = useAuth();
  const uid = currentUser?.uid ?? null;
  const [projects, setProjects] = useState<RegProject[]>([]);
  const [ready, setReady] = useState(false);

  // 読み込み
  useEffect(() => {
    if (!authReady) return;
    if (!uid) {
      const sync = () => {
        const local = readLocal();
        const merged = mergeIn(local, karteProjects().map((k) => ({ name: k.name, addr: k.addr, karteId: k.id })));
        // カルテから足した物件は保存して id を固定する(足すものが無ければ書かないので、通知の往復は 1 回で止まる)
        if (merged.length !== local.length || merged.some((p, i) => p.karteId !== local[i]?.karteId)) writeLocal(merged);
        setProjects(merged);
        setReady(true);
      };
      sync();
      window.addEventListener(EVENT, sync);
      window.addEventListener('storage', sync);
      return () => {
        window.removeEventListener(EVENT, sync);
        window.removeEventListener('storage', sync);
      };
    }
    let first = true;
    const unsub = onSnapshot(
      collection(db, 'users', uid, 'projectRegistry'),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as Omit<RegProject, 'id'>), id: d.id }));
        if (first) {
          first = false;
          // このブラウザの物件とカルテの案件を、まだ台帳に無ければ足す(1 回だけ)
          const merged = mergeIn(list, [
            ...readLocal().map((p) => ({ name: p.name, addr: p.addr, karteId: p.karteId })),
            ...karteProjects().map((k) => ({ name: k.name, addr: k.addr, karteId: k.id })),
          ]);
          for (const p of merged) {
            const before = list.find((x) => x.id === p.id);
            if (!before || before.karteId !== p.karteId) {
              const { id, ...data } = p;
              void setDoc(doc(db, 'users', uid, 'projectRegistry', id), JSON.parse(JSON.stringify(data)), { merge: true }).catch(() => {});
            }
          }
          setProjects(merged);
        } else {
          setProjects(list);
        }
        setReady(true);
      },
      () => {
        setProjects(readLocal());
        setReady(true);
      },
    );
    return () => unsub();
  }, [uid, authReady]);

  const persist = useCallback(
    async (p: RegProject) => {
      if (uid) {
        const { id, ...data } = p;
        await setDoc(doc(db, 'users', uid, 'projectRegistry', id), JSON.parse(JSON.stringify(data)), { merge: true });
      } else {
        const list = readLocal();
        const i = list.findIndex((x) => x.id === p.id);
        if (i >= 0) list[i] = p;
        else list.push(p);
        writeLocal(list);
      }
    },
    [uid],
  );

  /** 物件を登録する。同じ名前(表記ゆれ込み)があればその id を返す */
  const add = useCallback(
    async (name: string, extra: Partial<Pick<RegProject, 'addr' | 'karteId'>> = {}): Promise<string | null> => {
      const n = name.trim();
      if (!n) return null;
      const hit = projects.find((p) => projectKey(p.name) === projectKey(n));
      if (hit) return hit.id;
      const now = Date.now();
      const p: RegProject = { id: newId(), name: n, status: 'active', createdAt: now, updatedAt: now, ...extra };
      setProjects((prev) => [...prev, p]);
      await persist(p).catch(() => {});
      return p.id;
    },
    [projects, persist],
  );

  const patch = useCallback(
    async (id: string, data: Partial<Omit<RegProject, 'id' | 'createdAt'>>) => {
      const cur = projects.find((p) => p.id === id);
      if (!cur) return;
      const next = { ...cur, ...data, updatedAt: Date.now() };
      setProjects((prev) => prev.map((p) => (p.id === id ? next : p)));
      if (uid) await updateDoc(doc(db, 'users', uid, 'projectRegistry', id), JSON.parse(JSON.stringify({ ...data, updatedAt: next.updatedAt }))).catch(() => {});
      else await persist(next);
    },
    [projects, uid, persist],
  );

  const rename = useCallback((id: string, name: string) => patch(id, { name: name.trim() }), [patch]);
  const setStatus = useCallback((id: string, status: RegProject['status']) => patch(id, { status }), [patch]);

  const sorted = useMemo(() => [...projects].sort((a, b) => b.updatedAt - a.updatedAt), [projects]);
  const active = useMemo(() => sorted.filter((p) => p.status === 'active'), [sorted]);
  /** 名前(表記ゆれ込み)から物件を引く */
  const find = useCallback((name: string) => projects.find((p) => projectKey(p.name) === projectKey(name)) ?? null, [projects]);

  return { projects: sorted, active, ready, add, rename, setStatus, find, loggedIn: !!uid };
}
