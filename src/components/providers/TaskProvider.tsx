'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebaseClient';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, setDoc, getDocs } from 'firebase/firestore';

export interface Task {
  id: string;
  content: string;
  completed: boolean;
  dueDate?: string | null;
  categoryId: string;
}

export interface TaskCategory {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
}

interface TaskContextType {
  categories: TaskCategory[];
  setCategories: React.Dispatch<React.SetStateAction<TaskCategory[]>>;
  addTask: (categoryId: string, content: string, dueDate?: string | null) => void;
  toggleTaskComplete: (categoryId: string, taskId: string) => void;
  changeCategoryColor: (categoryId: string, color: string) => void;
  updateTask: (categoryId: string, taskId: string, content: string, dueDate?: string | null) => void;
  addCategory: (title?: string, color?: string) => Promise<string>;
  deleteCategory: (categoryId: string) => Promise<void>;
}

const DEFAULT_CATEGORIES: TaskCategory[] = [
  { id: '1', title: 'Today', color: 'bg-gray-100', tasks: [] },
  { id: '2', title: 'Priority', color: 'bg-gray-200', tasks: [] },
  { id: '3', title: 'Projects', color: 'bg-gray-300', tasks: [] },
  { id: '4', title: 'Ideas', color: 'bg-gray-400', tasks: [] },
  { id: '5', title: 'Archive', color: 'bg-gray-500', tasks: [] },
];

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTaskContext = () => {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTaskContext must be used within TaskProvider');
  return ctx;
};

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<TaskCategory[]>(DEFAULT_CATEGORIES);
  const { currentUser } = useAuth();

  // 購読して即時表示＋リアルタイム同期
  useEffect(() => {
    if (!currentUser) { setCategories(DEFAULT_CATEGORIES); return }
    try {
      const cached = localStorage.getItem(`mytasks:${currentUser.uid}`)
      if (cached) setCategories(JSON.parse(cached))
    } catch {}
    const colRef = collection(db, 'users', currentUser.uid, 'mytasks')
    let childUnsubs: Array<() => void> = []
    let unsub: () => void = () => {}
    try {
      unsub = onSnapshot(colRef, (snap) => {
        // 最新受信前に前回のタスク購読を解除（多重購読回避）
        if (childUnsubs.length) {
          childUnsubs.forEach(fn => { try { fn() } catch {} })
          childUnsubs = []
        }
      if (snap.empty) {
        if (snap.metadata.fromCache || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
          return
        }
      }
      const cats: TaskCategory[] = []
      snap.docs.forEach(catDoc => {
        const cdata = catDoc.data() as any
        const tasksCol = collection(db, 'users', currentUser.uid, 'mytasks', catDoc.id, 'tasks')
        // 個別onSnapshotだと多重になるのでここは最低限; 初回は空配列→別購読で差し込む
        cats.push({ id: catDoc.id, title: cdata.title || '', color: cdata.color || 'bg-gray-100', tasks: [] })
        // タスク購読
        const taskUnsub = onSnapshot(tasksCol, (ts) => {
          if (ts.empty) {
            if (ts.metadata.fromCache || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
              return
            }
          }
          const tasks: Task[] = ts.docs.map(d => ({ id: d.id, ...(d.data() as any), categoryId: catDoc.id })) as any
          setCategories(prev => {
            // 既存の配列を常にベースにし、cats（スナップショット構築途中の一時配列）に依存しない
            let base = prev
            // カテゴリが未存在の場合は追加（タイトル・色は最新スナップショットの値を使用）
            if (!base.some(p => p.id === catDoc.id)) {
              base = [...base, { id: catDoc.id, title: cdata.title || '', color: cdata.color || 'bg-gray-100', tasks: [] }]
            }
            const next = base.map(p => p.id === catDoc.id ? { ...p, tasks } : p)
            try { localStorage.setItem(`mytasks:${currentUser.uid}`, JSON.stringify(next)) } catch {}
            return next
          })
        }, (err) => {
          console.error('mytasks tasks watch error:', err)
        })
        childUnsubs.push(taskUnsub)
      })
      if (cats.length) {
        setCategories(cats)
      } else {
        // ユーザー初回: デフォルトカテゴリを自動作成
        DEFAULT_CATEGORIES.forEach(async (c) => {
          try { await setDoc(doc(db, 'users', currentUser.uid, 'mytasks', c.id), { title: c.title, color: c.color }) } catch {}
        })
        setCategories(DEFAULT_CATEGORIES)
      }
      try { localStorage.setItem(`mytasks:${currentUser.uid}`, JSON.stringify(cats)) } catch {}
      }, (err) => {
        console.error('mytasks boards watch error:', err)
    })
    } catch (e) {
      console.error('mytasks onSnapshot init failed:', e)
    }
    return () => { try { unsub() } catch {}; if (childUnsubs.length) childUnsubs.forEach(fn => { try { fn() } catch {} }) }
  }, [currentUser])

  const addTask = async (categoryId: string, content: string, dueDate?: string | null) => {
    if (!currentUser) {
      alert('入力するには会員登録（無料）が必要です。');
      return;
    }
    const tempId = `tmp-${Date.now()}`
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId ? { ...cat, tasks: [...cat.tasks, { id: tempId, content, completed: false, dueDate: dueDate || null, categoryId }] } : cat
    ))
    const colRef = collection(db, 'users', currentUser.uid, 'mytasks', categoryId, 'tasks')
    const ref = await addDoc(colRef, { content, completed: false, dueDate: dueDate || null } as any)
    setCategories(prev => prev.map(cat => cat.id === categoryId ? { ...cat, tasks: cat.tasks.map(t => t.id === tempId ? { ...t, id: ref.id } : t) } : cat))
  };

  const toggleTaskComplete = async (categoryId: string, taskId: string) => {
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId ? { ...cat, tasks: cat.tasks.map(task => task.id === taskId ? { ...task, completed: !task.completed } : task) } : cat
    ))
    if (!currentUser) return
    const ref = doc(db, 'users', currentUser.uid, 'mytasks', categoryId, 'tasks', taskId)
    const cat = categories.find(c => c.id === categoryId)
    const t = cat?.tasks.find(x => x.id === taskId)
    await updateDoc(ref, { completed: !t?.completed } as any)
  };

  const changeCategoryColor = async (categoryId: string, color: string) => {
    setCategories(prev => prev.map(cat => cat.id === categoryId ? { ...cat, color } : cat))
    if (!currentUser) return
    const ref = doc(db, 'users', currentUser.uid, 'mytasks', categoryId)
    await setDoc(ref, { title: categories.find(c => c.id === categoryId)?.title || '', color }, { merge: true })
  };

  const updateTask = async (categoryId: string, taskId: string, content: string, dueDate?: string | null) => {
    setCategories(prev => prev.map(cat => cat.id === categoryId ? { ...cat, tasks: cat.tasks.map(task => task.id === taskId ? { ...task, content, dueDate } : task) } : cat))
    if (!currentUser) return
    const ref = doc(db, 'users', currentUser.uid, 'mytasks', categoryId, 'tasks', taskId)
    await updateDoc(ref, { content, dueDate: dueDate || null } as any)
  };

  const addCategory = async (title?: string, color?: string): Promise<string> => {
    if (!currentUser) {
      alert('入力するには会員登録（無料）が必要です。');
      return '';
    }
    const tempId = `tmp-${Date.now()}`
    const nextTitle = (title && title.trim()) || `List ${(categories?.length || 0) + 1}`
    const nextColor = color || 'bg-gray-100'
    // 楽観的にUIへ反映
    setCategories(prev => [...prev, { id: tempId, title: nextTitle, color: nextColor, tasks: [] }])
    // 永続化
    const colRef = collection(db, 'users', currentUser.uid, 'mytasks')
    const ref = await addDoc(colRef, { title: nextTitle, color: nextColor } as any)
    // 生成IDへ差し替え（購読でも即時反映されるが、ローカルも置換）
    setCategories(prev => prev.map(c => c.id === tempId ? { ...c, id: ref.id } : c))
    return ref.id
  }

  const deleteCategory = async (categoryId: string): Promise<void> => {
    // 楽観的にUIから除去
    setCategories(prev => prev.filter(c => c.id !== categoryId))
    if (!currentUser) return
    try {
      // サブコレクション tasks を削除
      const tasksCol = collection(db, 'users', currentUser.uid, 'mytasks', categoryId, 'tasks')
      const snap = await getDocs(tasksCol)
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
    } catch {}
    try { await deleteDoc(doc(db, 'users', currentUser.uid, 'mytasks', categoryId)) } catch {}
  }

  return (
    <TaskContext.Provider value={{ categories, setCategories, addTask, toggleTaskComplete, changeCategoryColor, updateTask, addCategory, deleteCategory }}>
      {children}
    </TaskContext.Provider>
  );
}; 