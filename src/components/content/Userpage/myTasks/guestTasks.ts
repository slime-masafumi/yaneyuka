'use client';
/**
 * Myタスクを未ログインでも使えるようにする「このブラウザに保存」の置き場。
 *
 * これまで未ログインでは「追加」で alert が出て止まり、完了・削除は画面の中だけで
 * 再読み込みすると消えていた。未ログインの間は localStorage（yy-guest-mytasks）に
 * 保存し、ログインしたらクラウド（users/{uid}/mytasks）が空なら手元を上げる。
 * クラウドに既にタスクがあるときは黙って混ぜず、「アカウントに追加」を出す。
 *
 * 形は TaskProvider と同じ（TaskCategory[]）。Myカレンダーもここを読んで期日を重ねる。
 */
import { useCallback, useEffect, useState } from 'react';
import type { TaskCategory, Task } from '@/components/providers/TaskProvider';
import type { useTaskContext } from '@/components/providers/TaskProvider';
import { db } from '@/lib/firebaseClient';
import { collection, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';

export const GUEST_TASKS_KEY = 'yy-guest-mytasks';

type TaskApi = ReturnType<typeof useTaskContext>;

const DEFAULTS: TaskCategory[] = [
  { id: '1', title: '今日', color: 'bg-gray-100', tasks: [] },
  { id: '2', title: '優先', color: 'bg-gray-200', tasks: [] },
  { id: '3', title: '案件', color: 'bg-gray-300', tasks: [] },
  { id: '4', title: 'アイデア', color: 'bg-gray-400', tasks: [] },
  { id: '5', title: '済み', color: 'bg-gray-500', tasks: [] },
];

const gid = () => `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const readGuestTasks = (): TaskCategory[] | null => {
  try {
    const raw = window.localStorage.getItem(GUEST_TASKS_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as TaskCategory[]) : null;
  } catch {
    return null;
  }
};

const writeGuestTasks = (cats: TaskCategory[]) => {
  try { window.localStorage.setItem(GUEST_TASKS_KEY, JSON.stringify(cats)); } catch { /* 容量・プライベートモード */ }
};

export const clearGuestTasks = () => {
  try { window.localStorage.removeItem(GUEST_TASKS_KEY); } catch { /* noop */ }
};

export const countGuestTasks = (cats: TaskCategory[] | null) => (cats || []).reduce((n, c) => n + (c.tasks?.length || 0), 0);

/** 未ログインのときの Myタスク。TaskProvider と同じ形の操作を返す */
export function useGuestTasks(): TaskApi {
  const [categories, setCats] = useState<TaskCategory[]>(DEFAULTS);
  useEffect(() => {
    const saved = readGuestTasks();
    if (saved) setCats(saved);
  }, []);

  // 書き換えるたびに保存する（effect で後追い保存すると、ログイン切り替えの瞬間に別の中身を書きうる）
  const update = useCallback((fn: (prev: TaskCategory[]) => TaskCategory[]) => {
    setCats((prev) => {
      // 同じ保存先を Myタスクの画面と TaskProvider（メモの宿題・yychat などから使う）の 2 か所が持つ。
      // 手元の state が古いまま書くと相手の追加を消すので、毎回保存先を読み直してから書き換える
      const next = fn(readGuestTasks() ?? prev);
      writeGuestTasks(next);
      return next;
    });
  }, []);

  const mapTask = (categoryId: string, taskId: string, fn: (t: Task) => Task) =>
    update((prev) => prev.map((c) => (c.id === categoryId ? { ...c, tasks: c.tasks.map((t) => (t.id === taskId ? fn(t) : t)) } : c)));

  return {
    categories,
    setCategories: (action) => update((prev) => (typeof action === 'function' ? action(prev) : action)),
    addTask: (categoryId, content, dueDate) =>
      update((prev) => prev.map((c) => (c.id === categoryId
        ? { ...c, tasks: [...c.tasks, { id: gid(), content, completed: false, dueDate: dueDate || null, categoryId }] }
        : c))),
    toggleTaskComplete: (categoryId, taskId) =>
      mapTask(categoryId, taskId, (t) => ({ ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : null })),
    changeCategoryColor: (categoryId, color) => update((prev) => prev.map((c) => (c.id === categoryId ? { ...c, color } : c))),
    updateTask: (categoryId, taskId, content, dueDate) => mapTask(categoryId, taskId, (t) => ({ ...t, content, dueDate: dueDate || null })),
    addCategory: async (title, color) => {
      const id = gid();
      update((prev) => [...prev, { id, title: (title && title.trim()) || `リスト ${prev.length + 1}`, color: color || 'bg-gray-100', tasks: [] }]);
      return id;
    },
    deleteCategory: async (categoryId) => update((prev) => prev.filter((c) => c.id !== categoryId)),
    deleteTask: async (categoryId, taskId) =>
      update((prev) => prev.map((c) => (c.id === categoryId ? { ...c, tasks: c.tasks.filter((t) => t.id !== taskId) } : c))),
    clearTasks: async (categoryId) => update((prev) => prev.map((c) => (c.id === categoryId ? { ...c, tasks: [] } : c))),
    renameCategory: async (categoryId, title) => update((prev) => prev.map((c) => (c.id === categoryId ? { ...c, title } : c))),
  };
}

/** クラウドの Myタスクの件数（シートの中のタスクを数える） */
async function cloudTaskCount(uid: string): Promise<number> {
  const cats = await getDocs(collection(db, 'users', uid, 'mytasks'));
  let n = 0;
  for (const c of cats.docs) {
    const ts = await getDocs(collection(db, 'users', uid, 'mytasks', c.id, 'tasks'));
    n += ts.size;
  }
  return n;
}

/** 手元のタスクをクラウドへ足す。同じ id のシートがあればそこへ、無ければシートごと作る */
async function uploadGuestTasks(uid: string, cats: TaskCategory[]): Promise<number> {
  const existing = await getDocs(collection(db, 'users', uid, 'mytasks'));
  const ids = new Set(existing.docs.map((d) => d.id));
  let added = 0;
  for (const c of cats) {
    if (!c.tasks.length && ids.has(c.id)) continue;
    if (!ids.has(c.id)) await setDoc(doc(db, 'users', uid, 'mytasks', c.id), { title: c.title, color: c.color });
    for (let i = 0; i < c.tasks.length; i += 400) {
      const batch = writeBatch(db);
      c.tasks.slice(i, i + 400).forEach((t) => {
        batch.set(doc(collection(db, 'users', uid, 'mytasks', c.id, 'tasks')), {
          content: t.content,
          completed: !!t.completed,
          dueDate: t.dueDate || null,
          ...(t.completedAt ? { completedAt: t.completedAt } : {}),
        });
        added++;
      });
      await batch.commit();
    }
  }
  return added;
}

// 開発時の StrictMode で effect が 2 回走っても、二重に上げない
const inFlight = new Set<string>();

/**
 * ログインしたときの引っ越し。
 * - クラウドが空 → 手元を上げて、手元を消す
 * - クラウドにもある → pending に件数を出し、押されたら足す（黙って混ぜない・黙って捨てない）
 */
export function useGuestTaskMigration(uid: string | undefined) {
  const [pending, setPending] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!uid) { setPending(0); return; }
    const guest = readGuestTasks();
    const n = countGuestTasks(guest);
    if (!guest || !n || inFlight.has(uid)) return;
    inFlight.add(uid);
    (async () => {
      try {
        if ((await cloudTaskCount(uid)) === 0) {
          const added = await uploadGuestTasks(uid, guest);
          clearGuestTasks();
          setMessage(`このブラウザに保存していたタスク ${added} 件をアカウントへ移しました。`);
        } else {
          setPending(n);
        }
      } catch {
        setPending(n);
      } finally {
        inFlight.delete(uid);
      }
    })();
  }, [uid]);

  const addNow = async () => {
    const guest = readGuestTasks();
    if (!uid || !guest) return;
    try {
      const added = await uploadGuestTasks(uid, guest);
      clearGuestTasks();
      setPending(0);
      setMessage(`このブラウザのタスク ${added} 件をアカウントに追加しました。`);
    } catch {
      setMessage('アカウントへの追加に失敗しました。通信を確かめてもう一度押してください。');
    }
  };

  return { pending, addNow, message, dismiss: () => { setPending(0); setMessage(''); } };
}
