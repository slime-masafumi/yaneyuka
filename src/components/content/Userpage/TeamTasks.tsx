'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiEdit2, FiTrash2, FiCheck, FiCalendar } from 'react-icons/fi';
import { useAuth } from '@/lib/AuthContext';
import { addBoardTask, createBoard, deleteBoard, deleteBoardTask, findUserByEmail, getUsersByUids, listBoardTasks, listBoardsForUser, setBoardMembers, updateBoard, updateBoardTask } from '@/lib/firebaseUserData';
import { db } from '@/lib/firebaseClient';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  ownerUid?: string;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string | null;
  assigneeId?: string;
  assignee?: { id: string; email: string };
  priority?: 'low' | 'medium' | 'high';
  details?: string;
}

const COLORS = [
  'bg-red-200', 'bg-rose-200', 'bg-pink-200', 'bg-orange-200', 'bg-amber-200',
  'bg-yellow-200', 'bg-lime-200', 'bg-green-200', 'bg-emerald-200', 'bg-teal-200',
  'bg-cyan-200', 'bg-sky-200', 'bg-blue-200', 'bg-indigo-200', 'bg-violet-200',
  'bg-purple-200', 'bg-fuchsia-200',
];

const getColor = (idx: number) => COLORS[idx % COLORS.length];

const TeamTasks: React.FC = () => {
  const { isLoggedIn, currentUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasksByProject, setTasksByProject] = useState<Record<string, Task[]>>({});
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [tempProjectName, setTempProjectName] = useState('');
  const [editingColor, setEditingColor] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newTaskContents, setNewTaskContents] = useState<Record<string, { title: string; dueDate?: string | null; assigneeId?: string }>>({});
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [tempTaskTitle, setTempTaskTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [memberEmailInput, setMemberEmailInput] = useState<Record<string, string>>({});
  const [membersByProject, setMembersByProject] = useState<Record<string, { uid: string; label: string }[]>>({});
  const [membersLoading, setMembersLoading] = useState<Record<string, boolean>>({});
  const tasksUnsubsRef = useRef<Record<string, () => void>>({});
  const [columnMode, setColumnModeState] = useState<2 | 3 | 4>(3);
  const [deleteTargetId, setDeleteTargetId] = useState<string>('');

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('teamTasks:columnMode');
    const num = stored ? parseInt(stored, 10) : null;
    if (num === 2 || num === 3 || num === 4) {
      setColumnModeState(num);
    }
  }, []);

  const setColumnMode = (cols: 2 | 3 | 4) => {
    setColumnModeState(cols);
    try { window.localStorage.setItem('teamTasks:columnMode', String(cols)); } catch {}
  };

  React.useEffect(() => {
    if (!projects.length) {
      setDeleteTargetId('');
      return;
    }
    if (!deleteTargetId || !projects.find(p => p.id === deleteTargetId)) {
      setDeleteTargetId(projects[0].id);
    }
  }, [projects]);

  // Firestore: ボード一覧をリアルタイム購読＋即時キャッシュ表示
  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    // 1) 即時: ローカルキャッシュ表示
    try {
      const cachedBoards = localStorage.getItem(`teamBoards:${currentUser.uid}`)
      if (cachedBoards) {
        const arr = JSON.parse(cachedBoards) as any[]
        setProjects(arr)
        arr.slice(0,4).forEach((b, i) => {
          try {
            const t = localStorage.getItem(`teamTasks:${currentUser.uid}:${b.id}`)
            if (t) setTasksByProject(prev => ({ ...prev, [b.id]: JSON.parse(t) }))
            const m = localStorage.getItem(`teamMembers:${currentUser.uid}:${b.id}`)
            if (m) setMembersByProject(prev => ({ ...prev, [b.id]: JSON.parse(m) }))
          } catch {}
        })
      }
    } catch {}

    const ownerQ = query(collection(db, 'boards'), where('ownerUid', '==', currentUser.uid))
    const memberQ = query(collection(db, 'boards'), where('memberUids', 'array-contains', currentUser.uid))

    const handleBoards = (lists: any[][]) => {
      // マージして最大4件に
      const map: Record<string, any> = {}
      lists.flat().forEach((d) => { map[d.id] = d })
      const merged = Object.values(map).slice(0,4)
      const normalized = merged.map((b: any, i: number) => ({
        id: b.id!,
        name: b.name,
        description: '',
        color: b.color || getColor(i),
        ownerUid: b.ownerUid
      }))
      setProjects(normalized)
      try { localStorage.setItem(`teamBoards:${currentUser.uid}`, JSON.stringify(normalized)) } catch {}

      // ボードごとのタスク購読をセット
      const currentIds = new Set(merged.map((b: any) => b.id))
      // 解除対象
      Object.keys(tasksUnsubsRef.current).forEach(id => {
        if (!currentIds.has(id)) { tasksUnsubsRef.current[id](); delete tasksUnsubsRef.current[id] }
      })
      merged.forEach((b: any) => {
        if (!tasksUnsubsRef.current[b.id]) {
          const col = collection(db, 'boards', b.id, 'tasks')
          tasksUnsubsRef.current[b.id] = onSnapshot(
            col,
            (snap) => {
            const list = snap.docs.map(d => {
              const t = d.data() as any
              return { id: d.id, title: t.title, completed: t.completed, dueDate: (t.dueDate ?? null), priority: (t.priority as any) ?? 'medium', assigneeId: t.assigneeUid || undefined }
            })
            setTasksByProject(prev => ({ ...prev, [b.id]: list }))
            try { localStorage.setItem(`teamTasks:${currentUser.uid}:${b.id}`, JSON.stringify(list)) } catch {}
            },
            async (err) => {
              console.error(`tasks(${b.id}) watch error:`, err)
              setError('タスクのリアルタイム購読に失敗しました。再接続を試みています。')
              // フォールバック: 一度だけ現在の状態を取得して表示
              try {
                const list = await listBoardTasks(b.id)
                setTasksByProject(prev => ({ ...prev, [b.id]: (list || []).map(t => ({
                  id: t.id!, title: t.title, completed: t.completed, dueDate: (t.dueDate ?? null), priority: (t.priority as any) ?? 'medium', assigneeId: t.assigneeUid || undefined
                })) as any }))
              } catch {}
              // 失敗した購読を解除し、次回handleBoardsで再購読できるようにする
              try { tasksUnsubsRef.current[b.id]?.(); } catch {}
              delete tasksUnsubsRef.current[b.id]
            }
          )
        }
        // メンバー情報（キャッシュ→取得）
        setMembersLoading(prev => ({ ...prev, [b.id]: true }))
        try {
          const cached = localStorage.getItem(`teamMembers:${currentUser.uid}:${b.id}`)
          if (cached) setMembersByProject(prev => ({ ...prev, [b.id]: JSON.parse(cached) }))
        } catch {}
        ;(async () => {
          try {
            const members = await getUsersByUids([b.ownerUid, ...((b.memberUids || []) as any)])
            const list = members.map(m => ({ uid: m.uid, label: m.displayName || m.email || m.uid }))
            setMembersByProject(prev => ({ ...prev, [b.id]: list }))
            try { localStorage.setItem(`teamMembers:${currentUser.uid}:${b.id}`, JSON.stringify(list)) } catch {}
          } finally {
            setMembersLoading(prev => ({ ...prev, [b.id]: false }))
          }
        })()
      })
    }

    let ownerBoards: any[] = []
    let memberBoards: any[] = []
    const unsubOwner = onSnapshot(
      ownerQ,
      (snap) => {
      ownerBoards = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
      handleBoards([ownerBoards, memberBoards])
      },
      (err) => {
        console.error('boards(owner) watch error:', err)
        setError('ボードの購読に失敗しました。ネットワーク状態をご確認ください。')
      }
    )
    const unsubMember = onSnapshot(
      memberQ,
      (snap) => {
      memberBoards = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
      handleBoards([ownerBoards, memberBoards])
      },
      (err) => {
        console.error('boards(member) watch error:', err)
        setError('ボードの購読に失敗しました。ネットワーク状態をご確認ください。')
      }
    )

    return () => { unsubOwner(); unsubMember(); Object.values(tasksUnsubsRef.current).forEach(fn => fn()); tasksUnsubsRef.current = {} }
  }, [isLoggedIn, currentUser]);

  // プロジェクトごとのタスク取得
  const fetchTasks = async (projectId: string) => {
    const tasks = await listBoardTasks(projectId)
    // 取得順が新しい→古いの場合に備え、古い→新しいへ整列
    const ordered = Array.isArray(tasks) ? [...tasks].reverse() : tasks
    setTasksByProject(prev => ({ ...prev, [projectId]: ordered as any }))
  };

  // プロジェクト新規作成
  const handleCreateProject = async () => {
    if (!isLoggedIn) {
      alert('入力するには会員登録（無料）が必要です。');
      return;
    }
    if (!newProjectName.trim()) return;
    setError(null);
    if (!currentUser) return;
    if (projects.length >= 4) { alert('ボードは最大4つまでです'); return }
    try {
      // 先にサーバで作成してID確定 → その後UIへ追加（同時多発による5枚目表示を防ぐ）
      const currentCount = projects.length
      if (currentCount >= 4) { alert('ボードは最大4つまでです'); return }
      const boardId = await createBoard(currentUser.uid, newProjectName)
      setProjects(prev => {
        const capped = prev.length >= 4 ? prev.slice(0, 4) : prev
        if (capped.length >= 4) return capped
        return [...capped, { id: boardId, name: newProjectName, color: getColor(capped.length), ownerUid: currentUser.uid }]
      })
      setTasksByProject(prev => ({ ...prev, [boardId]: [] }))
      setNewProjectName('')
      fetchTasks(boardId)
    } catch {
      setError('プロジェクト作成に失敗しました')
    }
  };

  // プロジェクト名編集
  const startEditingProject = (project: Project) => {
    setEditingProjectId(project.id);
    setTempProjectName(project.name);
  };
  const saveProjectName = async (project: Project, nextName?: string) => {
    const nameToSave = (nextName ?? tempProjectName).trim();
    if (!nameToSave) return;
    // 先にUIを確定させてから永続化（体感を良くし、blur競合を避ける）
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, name: nameToSave } : p));
    setEditingProjectId(null);
    try { await updateBoard(project.id, { name: nameToSave }) } catch {}
  };
  const changeColor = async (projectId: string, color: string) => {
    setProjects(prev => {
      const next = prev.map(p => p.id === projectId ? { ...p, color } : p);
      try {
        if (currentUser) {
          localStorage.setItem(`teamBoards:${currentUser.uid}`, JSON.stringify(next));
        }
      } catch {}
      return next;
    });
    try { await updateBoard(projectId, { color }) } catch {}
  };
  const clearAllTasks = async (projectId: string) => {
    const ok = window.confirm('このシートを削除します。よろしいですか？（元に戻せません）')
    if (!ok) return
    // 楽観的に除去
    setProjects(prev => prev.filter(p => p.id !== projectId))
    const { [projectId]: removed, ...rest } = tasksByProject as any
    setTasksByProject(rest)
    try { await deleteBoard(projectId) } catch {}
  };

  // タスク追加
  const handleAddTask = async (projectId: string) => {
    if (!isLoggedIn) {
      alert('入力するには会員登録（無料）が必要です。');
      return;
    }
    const content = newTaskContents[projectId]?.title || '';
    const dueDate: string | null = (newTaskContents[projectId]?.dueDate as any) || null;
    const assigneeId: string | null = (newTaskContents[projectId]?.assigneeId as any) || (currentUser?.uid || null)
    const priority: 'low' | 'medium' | 'high' = ((newTaskContents as any)[projectId]?.priority as any) || 'medium'
    if (!content.trim()) return;
    const tempId = `tmp-${Date.now()}`
    // 楽観的に先に表示（末尾に追加）
    setTasksByProject(prev => ({ ...prev, [projectId]: [ ...(prev[projectId] || []), { id: tempId, title: content, completed: false, dueDate, assigneeId: assigneeId || undefined, priority } ] }));
    setNewTaskContents(prev => ({ ...prev, [projectId]: { title: '', dueDate: '', assigneeId: '', priority: 'medium' as any } }));
    try {
      const id = await addBoardTask(projectId, { title: content, completed: false, dueDate, priority, assigneeUid: assigneeId })
      // 置換（末尾に残す）
      setTasksByProject(prev => ({ ...prev, [projectId]: (prev[projectId] || []).map(t => t.id === tempId ? { ...t, id } : t) }))
    } catch (e) {
      // ロールバック
      setTasksByProject(prev => ({ ...prev, [projectId]: (prev[projectId] || []).filter(t => t.id !== tempId) }))
      alert('タスクの追加に失敗しました。ネットワーク状態を確認してください。')
    }
  };

  // タスク完了・編集・削除
  const toggleTaskComplete = async (projectId: string, taskId: string) => {
    const task = (tasksByProject[projectId] || []).find(t => t.id === taskId)
    if (task) { try { await updateBoardTask(projectId, taskId, { completed: !task.completed }) } catch {} }
    setTasksByProject(prev => ({ ...prev, [projectId]: prev[projectId].map(task => task.id === taskId ? { ...task, completed: !task.completed } : task) }));
  };
  const startEditingTask = (taskId: string, currentTitle: string) => {
    setEditingTaskId(taskId);
    setTempTaskTitle(currentTitle);
  };
  const saveTaskEdit = async (projectId: string, taskId: string) => {
    if (!tempTaskTitle.trim()) return;
    try { await updateBoardTask(projectId, taskId, { title: tempTaskTitle }) } catch {}
    setTasksByProject(prev => ({
      ...prev,
      [projectId]: prev[projectId].map(task => task.id === taskId ? { ...task, title: tempTaskTitle } : task)
    }));
    setEditingTaskId(null);
  };
  const deleteTask = async (projectId: string, taskId: string) => {
    try { await deleteBoardTask(projectId, taskId) } catch {}
    setTasksByProject(prev => ({ ...prev, [projectId]: prev[projectId].filter(task => task.id !== taskId) }));
  };

  // 色が暗いかどうか
  function isDarkColor(bg: string): boolean {
    if (bg.startsWith('bg-gray-')) {
      const n = parseInt(bg.replace('bg-gray-', ''));
      return n >= 400;
    }
    if (/^#([0-9A-Fa-f]{6})$/.test(bg)) {
      const r = parseInt(bg.slice(1, 3), 16);
      const g = parseInt(bg.slice(3, 5), 16);
      const b = parseInt(bg.slice(5, 7), 16);
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      return luminance < 160;
    }
    return false;
  }

  return (
    <div className="pt-0 pb-4">
      <div className="flex items-center gap-4 mb-3">
        <h2 className="text-xl font-semibold">Teamタスク</h2>
        <span className="text-red-600 font-bold text-xs sm:text-sm">※この機能は現在β版です。ご意見をぜひお聞かせください。</span>
      </div>
      <p className="text-[12px] text-gray-600 mb-2">
        チームで共有するプロジェクトをボード形式で管理し、タスクの追加・担当者設定・進捗更新をリアルタイムに連携できます。ボードは最大4枚まで作成できます。
      </p>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-[11px] text-gray-600">表示列数</span>
        {[2, 3, 4].map(cols => (
          <button
            key={cols}
            type="button"
            onClick={() => setColumnMode(cols as 2 | 3 | 4)}
            className={`px-3 py-1 text-[12px] rounded border transition-colors ${
              columnMode === cols
                ? 'bg-gray-700 text-white border-gray-700'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
            }`}
          >
            {cols}列表示
          </button>
        ))}
      </div>
      {error && <div className="mb-2 text-red-600 font-bold">{error}</div>}
      <div className="mb-3 flex gap-2 items-center flex-wrap">
        <label className="text-xs text-gray-700">プロジェクト名称</label>
        <input
          className="border rounded px-2 py-1 h-7 text-[12px]"
          placeholder="新規プロジェクト名"
          value={newProjectName}
          onChange={e => setNewProjectName(e.target.value)}
        />
        <button
          className="px-2 py-1 text-[12px] bg-gray-700 text-white rounded hover:bg-gray-800"
          onClick={handleCreateProject}
        >
          作成
        </button>
        {projects.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-2 py-1 text-[12px] rounded bg-gray-200 hover:bg-red-600 hover:text-white"
              onClick={async () => {
                if (!deleteTargetId) return;
                const target = projects.find(p => p.id === deleteTargetId);
                if (!target) return;
                if (!window.confirm(`「${target.name}」ボードを削除します。よろしいですか？\n（このボード内のタスクも削除されます）`)) return;
                try { await deleteBoard(target.id); } catch {}
              }}
            >
              － ボード削除
            </button>
            <select
              className="text-xs border rounded px-2 py-1"
              value={deleteTargetId}
              onChange={e => setDeleteTargetId(e.target.value)}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name || p.id}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      {projects.length === 0 && (
        <div className="text-gray-500 mb-4">プロジェクトがありません。新規作成してください。</div>
      )}
      <div className="team-task-grid">
        {projects.map((project, idx) => {
          const flexBasis = `calc((100% - ${(columnMode - 1)} * 0.75rem) / ${columnMode})`;
          const cardStyle: React.CSSProperties = {
            flex: `0 0 ${flexBasis}`,
            maxWidth: flexBasis,
            minWidth: '240px',
          };
          if (project.color?.startsWith('#')) {
            cardStyle.backgroundColor = project.color;
          }
          return (
          <div
            key={project.id}
            className={`overflow-hidden ${project.color}`}
              style={cardStyle}
          >
            {/* プロジェクトヘッダー */}
            <div className="px-3 py-2 flex items-center justify-between border-b border-black/5 gap-2 flex-wrap"
              style={project.color?.startsWith('#') ? { backgroundColor: project.color } : {}}
            >
              <div className="flex items-center gap-2 flex-1">
                {editingProjectId === project.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={tempProjectName}
                      onChange={(e) => setTempProjectName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); saveProjectName(project, (e.target as HTMLInputElement).value) } }}
                      className="flex-1 text-[12px] bg-white/90 text-gray-800 border border-black/10 rounded px-2 py-1 h-7"
                      autoFocus
                    />
                    <button
                      className={`${isDarkColor(project.color || '') ? 'bg-white/90 text-gray-800' : 'bg-white text-gray-800'} text-xs px-2 py-1 h-7 border rounded`}
                      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); saveProjectName(project, tempProjectName) }}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); saveProjectName(project, tempProjectName) }}
                    >決定</button>
                  </div>
                ) : (
                  <div className="flex-1">
                    <span className={`block text-[11px] leading-none mb-1 ${isDarkColor(project.color || '') ? 'text-white/80' : 'text-gray-600'}`}>プロジェクト</span>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-medium ${isDarkColor(project.color || '') ? 'text-white' : 'text-gray-800'}`}>{project.name}</h3>
                      <button
                        onClick={() => startEditingProject(project)}
                        className={`${isDarkColor(project.color || '') ? 'text-white/70 hover:text-white' : 'text-black/40 hover:text-black/60'}`}
                      >
                        <FiEdit2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div style={{ position: 'relative', width: 24, height: 24 }}>
                  <button
                    type="button"
                    className={`w-6 h-6 rounded-full border ${isDarkColor(project.color || '') ? 'border-white/70 hover:border-white' : 'border-black/10 hover:border-black/20'} focus:outline-none`}
                    style={{ backgroundColor: project.color?.startsWith('#') ? project.color : '', padding: 0 }}
                    tabIndex={-1}
                    aria-label="色を選択"
                  />
                  <input
                    type="color"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                    value={project.color?.startsWith('#') ? project.color : '#cccccc'}
                    title="色を選択"
                    onChange={e => changeColor(project.id, e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-xs ${isDarkColor(project.color || '') ? 'text-white/70' : 'text-black/40'}`}>{tasksByProject[project.id]?.length || 0}</span>
                  <button
                    onClick={() => clearAllTasks(project.id)}
                    className={`text-[10px] font-medium ${isDarkColor(project.color || '') ? 'text-white/70 hover:text-white' : 'text-black/40 hover:text-black/60'}`}
                  >
                    AC
                  </button>
                </div>
              </div>
            </div>
            
            {/* メンバー管理 */}
            <div className="px-3 py-2 border-b border-black/5" style={project.color?.startsWith('#') ? { backgroundColor: project.color } : {}}>
              <div className="flex items-center gap-2">
                <input
                  className={`text-xs border rounded px-2 py-1 flex-1 ${isDarkColor(project.color || '') ? 'bg-white/90 text-gray-800' : ''}`}
                  placeholder={membersLoading[project.id] ? 'メンバー情報取得中...' : 'メンバーのメールを追加'}
                  value={memberEmailInput[project.id] || ''}
                  onChange={e => setMemberEmailInput(prev => ({ ...prev, [project.id]: e.target.value }))}
                  disabled={!!membersLoading[project.id]}
                />
                <button
                  className={`text-xs px-2 py-1 rounded ${isDarkColor(project.color || '') ? 'bg-white/90 text-gray-800' : 'bg-white text-gray-800'} border`}
                  onClick={async () => {
                    const email = (memberEmailInput[project.id] || '').trim()
                    if (!email) return
                    const user = await findUserByEmail(email)
                    if (!user) { alert('該当ユーザーが見つかりません'); return }
                    const current = membersByProject[project.id] || []
                    if (current.some(m => m.uid === user.uid)) return
                    const next = [...current, { uid: user.uid, label: user.displayName || user.email || user.uid }]
                    setMembersByProject(prev => ({ ...prev, [project.id]: next }))
                    setMemberEmailInput(prev => ({ ...prev, [project.id]: '' }))
                    try {
                      const ownerId = projects.find(p => p.id === project.id)?.ownerUid
                      await setBoardMembers(project.id, next.map(n => n.uid).filter(uid => uid !== ownerId))
                    } catch {}
                  }}
                >追加</button>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {membersLoading[project.id] && (
                  <span className={`text-[10px] px-2 py-0.5 rounded ${isDarkColor(project.color || '') ? 'bg-white/80 text-gray-800' : 'bg-white text-gray-800'} border`}>読込中...</span>
                )}
                {(membersByProject[project.id] || []).map(m => (
                  <span key={m.uid} className={`text-[10px] px-2 py-0.5 rounded inline-flex items-center gap-1 ${isDarkColor(project.color || '') ? 'bg-white/80 text-gray-800' : 'bg-white text-gray-800'} border`}>
                    {m.label}
                    {projects.find(p => p.id === project.id)?.ownerUid === currentUser?.uid && (
                      <button className="text-[10px] opacity-60 hover:opacity-100" onClick={async () => {
                        const filtered = (membersByProject[project.id] || []).filter(x => x.uid !== m.uid)
                        setMembersByProject(prev => ({ ...prev, [project.id]: filtered }))
                        try {
                          const ownerId = projects.find(p => p.id === project.id)?.ownerUid
                          await setBoardMembers(project.id, filtered.map(x => x.uid).filter(uid => uid !== ownerId))
                        } catch {}
                      }}>×</button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            

            {/* 新規タスク入力 */}
            <div className="px-3 pt-2 pb-2 border-t border-black/5"
              style={project.color?.startsWith('#') ? { backgroundColor: project.color } : {}}
            >
              {/* 1行目: タスク入力欄と期限カレンダーマーク */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <input
                  type="text"
                  placeholder="新規タスクを入力"
                  value={newTaskContents[project.id]?.title || ''}
                  onChange={e => setNewTaskContents(prev => ({ ...prev, [project.id]: { ...prev[project.id], title: e.target.value } }))}
                  onKeyPress={e => { if (e.key === 'Enter') handleAddTask(project.id) }}
                  className={`flex-1 text-[12px] bg-white/90 rounded px-2 py-1 h-7 ${isDarkColor(project.color || '') ? 'text-gray-800 placeholder-gray-500' : 'text-gray-800 placeholder-gray-500'}`}
                />
                {/* 期限カレンダーマーク */}
                <div className="flex items-center gap-0">
                  <span className={`text-xs mr-0 ${isDarkColor(project.color || '') ? 'text-white/70' : 'text-gray-800/70'}`}>期限</span>
                  <div style={{ position: 'relative', width: 24, height: 24, cursor: 'pointer' }}>
                    <button
                      type="button"
                      className={`flex items-center justify-center w-6 h-6 ${isDarkColor(project.color || '') ? 'text-white/70 hover:text-white' : 'text-black/40 hover:text-black/60'}`}
                      tabIndex={-1}
                      aria-label="期日を選択"
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      <FiCalendar size={16} />
                    </button>
                    <input
                      type="date"
                      value={newTaskContents[project.id]?.dueDate || ''}
                      onChange={e => setNewTaskContents(prev => ({ ...prev, [project.id]: { ...prev[project.id], dueDate: e.target.value } }))}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                      tabIndex={0}
                    />
                  </div>
                </div>
              </div>
              
              {/* 2行目: 担当者選択欄、重要度、期限表示、追加ボタン */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* 担当者セレクト */}
                <select
                  className={`text-xs rounded px-1 py-0.5 w-[96px] ${isDarkColor(project.color || '') ? 'bg-white/90 text-gray-800' : 'bg-white text-gray-800'}`}
                  value={newTaskContents[project.id]?.assigneeId || ''}
                  onChange={e => setNewTaskContents(prev => ({ ...prev, [project.id]: { ...prev[project.id], assigneeId: e.target.value } }))}
                  disabled={!!membersLoading[project.id]}
                >
                  <option value="">担当者</option>
                  {(membersByProject[project.id] || []).map(m => (
                    <option key={m.uid} value={m.uid}>{m.label}</option>
                  ))}
                </select>
                {/* 重要度 */}
                <select
                  className={`text-xs rounded px-1 py-0.5 w-[72px] ${isDarkColor(project.color || '') ? 'bg-white/90 text-gray-800' : 'bg-white text-gray-800'}`}
                  value={(newTaskContents as any)[project.id]?.priority || ''}
                  onChange={e => setNewTaskContents(prev => ({ ...prev, [project.id]: { ...prev[project.id], priority: e.target.value as any } }))}
                >
                  <option value="">重要度</option>
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
                {/* 期限表示 */}
                {newTaskContents[project.id]?.dueDate && (
                  <div className="flex items-center gap-0">
                    <span className={`text-xs mr-0 ${isDarkColor(project.color || '') ? 'text-white/70' : 'text-gray-800/70'}`}>期限</span>
                    <span className={`ml-0.5 text-xs ${isDarkColor(project.color || '') ? 'text-white/80' : 'text-gray-800/80'}`}>
                      {(() => {
                        const v = newTaskContents[project.id]?.dueDate as string
                        if (!v) return ''
                        const d = new Date(v)
                        if (isNaN(d.getTime())) return v
                        const y = d.getFullYear()
                        const m = String(d.getMonth() + 1).padStart(2, '0')
                        const day = String(d.getDate()).padStart(2, '0')
                        return `${y}.${m}.${day}`
                      })()}
                    </span>
                  </div>
                )}
                {/* 追加ボタン（一番右） */}
                <button
                  type="button"
                  className={`text-xs px-2 py-1 rounded ml-auto ${isDarkColor(project.color || '') ? 'bg-white/90 text-gray-800' : 'bg-white text-gray-800'} border`}
                  aria-label="タスクを登録"
                  onClick={() => handleAddTask(project.id)}
                >
                  追加
                </button>
              </div>
            </div>

            {/* タスクリスト（フォームの下） */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-black/5"
              style={project.color?.startsWith('#') ? { backgroundColor: project.color } : {}}
            >
              {[...(tasksByProject[project.id] || [])]
                .sort((a, b) => {
                  // 日付順にソート（dueDateがnull/undefinedのものは最後に）
                  if (!a.dueDate && !b.dueDate) return 0;
                  if (!a.dueDate) return 1;
                  if (!b.dueDate) return -1;
                  return a.dueDate.localeCompare(b.dueDate);
                })
                .map(task => (
                <div
                  key={task.id}
                  className="px-3 py-2 flex items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTaskComplete(project.id, task.id)}
                    className="w-4 h-4 rounded border-black/20 accent-emerald-500 cursor-pointer"
                  />
                  {/* タスク名 */}
                  {editingTaskId === task.id ? (
                    <input
                      type="text"
                      value={tempTaskTitle}
                      onChange={(e) => setTempTaskTitle(e.target.value)}
                      onBlur={() => saveTaskEdit(project.id, task.id)}
                      onKeyPress={(e) => e.key === 'Enter' && saveTaskEdit(project.id, task.id)}
                      className="flex-1 text-sm bg-transparent border-b border-black/10 focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => toggleTaskComplete(project.id, task.id)}
                      className={`flex-1 text-xs select-none cursor-pointer ${task.completed ? (isDarkColor(project.color || '') ? 'line-through text-white/60' : 'line-through text-black/40') : (isDarkColor(project.color || '') ? 'text-white' : 'text-gray-800')}`}
                    >{task.title}</span>
                  )}

                  {/* 担当者名 or セレクト（編集時） */}
                  {editingTaskId === task.id ? (
                    <select
                      className={`text-[10px] rounded px-1 py-0.5 ${isDarkColor(project.color || '') ? 'bg-white/90 text-gray-800' : 'bg-white text-gray-800'}`}
                      value={task.assigneeId || ''}
                      onChange={async (e) => {
                        const uid = e.target.value
                        try { await updateBoardTask(project.id, task.id, { assigneeUid: uid }) } catch {}
                        setTasksByProject(prev => ({ ...prev, [project.id]: prev[project.id].map(t => t.id === task.id ? { ...t, assigneeId: uid } : t) }))
                      }}
                      style={{ minWidth: 88 }}
                    >
                      <option value="">担当者</option>
                      {(membersByProject[project.id] || []).map(m => (
                        <option key={m.uid} value={m.uid}>{m.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`text-[10px] ${isDarkColor(project.color || '') ? 'text-white/80' : 'text-gray-800/80'}`} style={{ minWidth: 72 }}>
                      {(() => {
                        const label = (membersByProject[project.id] || []).find(m => m.uid === (task.assigneeId || ''))?.label
                        return label || '-'
                      })()}
                    </span>
                  )}

                  {/* 重要度 or セレクト（編集時） */}
                  {editingTaskId === task.id ? (
                    <select
                      className={`text-[10px] rounded px-1 py-0.5 ${isDarkColor(project.color || '') ? 'bg-white/90 text-gray-800' : 'bg-white text-gray-800'}`}
                      value={task.priority || 'medium'}
                      onChange={async (e) => {
                        const pr = e.target.value as any
                        try { await updateBoardTask(project.id, task.id, { priority: pr }) } catch {}
                        setTasksByProject(prev => ({ ...prev, [project.id]: prev[project.id].map(t => t.id === task.id ? { ...t, priority: pr } : t) }))
                      }}
                      style={{ minWidth: 64 }}
                    >
                      <option value="high">高</option>
                      <option value="medium">中</option>
                      <option value="low">低</option>
                    </select>
                  ) : (
                    <span className={`text-[10px] ${isDarkColor(project.color || '') ? 'text-white/80' : 'text-gray-800/80'}`} style={{ minWidth: 28 }}>
                      {task.priority === 'high' ? '高' : task.priority === 'low' ? '低' : task.priority === 'medium' ? '中' : '—'}
                    </span>
                  )}

                  {/* 期限（表示） */}
                  <span className={`text-[10px] ${isDarkColor(project.color || '') ? 'text-white/70' : 'text-gray-800/70'}`} style={{ minWidth: 72, textAlign: 'right' }}>
                    {(() => {
                      const v = task.dueDate
                      if (!v) return ''
                      const d = new Date(v)
                      if (isNaN(d.getTime())) return v
                      const y = d.getFullYear()
                      const m = String(d.getMonth() + 1).padStart(2, '0')
                      const day = String(d.getDate()).padStart(2, '0')
                      return `${y}.${m}.${day}`
                    })()}
                  </span>

                  {/* カレンダーマーク＋日付ピッカー */}
                  <div style={{ position: 'relative', width: 20, height: 20 }}>
                    <button
                      type="button"
                      className={`${isDarkColor(project.color || '') ? 'text-white/70 hover:text-white' : 'text-black/40 hover:text-black/60'} flex items-center justify-center w-5 h-5`}
                      tabIndex={-1}
                      aria-label="期日を編集"
                      style={{ background: 'none', border: 'none', padding: 0 }}
                    >
                      <FiCalendar size={14} />
                    </button>
                    <input
                      type="date"
                      value={task.dueDate || ''}
                      onChange={async e => {
                        const v = e.target.value
                        try { await updateBoardTask(project.id, task.id, { dueDate: v }) } catch {}
                        setTasksByProject(prev => ({ ...prev, [project.id]: prev[project.id].map(t => t.id === task.id ? { ...t, dueDate: v } : t) }))
                      }}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                      tabIndex={0}
                    />
                  </div>

                  {/* 鉛筆・ゴミ箱 */}
                  <button
                    onClick={() => startEditingTask(task.id, task.title)}
                    className={`${isDarkColor(project.color || '') ? 'text-white/70 hover:text-white' : 'text-black/40 hover:text-black/60'}`}
                  >
                    <FiEdit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => deleteTask(project.id, task.id)}
                    className={`${isDarkColor(project.color || '') ? 'text-white/70 hover:text-white' : 'text-black/40 hover:text-black/60'}`}
                  >
                    <FiTrash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
        })}
      </div>
      {/* 共有ユーザー管理UIはここに追加可能 */}
    </div>
  );
};

export default TeamTasks; 