'use client';

import React, { useState } from 'react';
import { FiEdit2, FiTrash2, FiCheck, FiCalendar } from 'react-icons/fi';
import { useTaskContext } from '../../providers/TaskProvider';

interface Task {
  id: string;
  content: string;
  completed: boolean;
  dueDate?: string | null; // 期日（YYYY-MM-DD）
}

interface TaskCategory {
  id: string;
  title: string;
  tasks: Task[];
  color: string;
}

const COLORS = [
  'bg-red-200',
  'bg-rose-200',
  'bg-pink-200',
  'bg-orange-200',
  'bg-amber-200',
  'bg-yellow-200',
  'bg-lime-200',
  'bg-green-200',
  'bg-emerald-200',
  'bg-teal-200',
  'bg-cyan-200',
  'bg-sky-200',
  'bg-blue-200',
  'bg-indigo-200',
  'bg-violet-200',
  'bg-purple-200',
  'bg-fuchsia-200',
];

const DEFAULT_CATEGORIES: TaskCategory[] = [
  { id: '1', title: 'Today', tasks: [], color: 'bg-gray-100' },
  { id: '2', title: 'Priority', tasks: [], color: 'bg-gray-200' },
  { id: '3', title: 'Projects', tasks: [], color: 'bg-gray-300' },
  { id: '4', title: 'Ideas', tasks: [], color: 'bg-gray-400' },
  { id: '5', title: 'Archive', tasks: [], color: 'bg-gray-500' },
];

export default function MyTasks() {
  const { categories, setCategories, addTask, toggleTaskComplete, changeCategoryColor, updateTask, addCategory, deleteCategory } = useTaskContext();
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTaskContents, setNewTaskContents] = useState<{[key: string]: { content: string; dueDate?: string | null }}>({});
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [tempTaskContent, setTempTaskContent] = useState<string>('');
  const [tempTitle, setTempTitle] = useState<string>('');
  const [editingColor, setEditingColor] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string>('');
  const [columnMode, setColumnModeState] = useState<3 | 4 | 5>(5);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('myTasks:columnMode');
    const num = stored ? parseInt(stored, 10) : null;
    if (num === 3 || num === 4 || num === 5) {
      setColumnModeState(num);
    }
  }, []);

  const setColumnMode = (cols: 3 | 4 | 5) => {
    setColumnModeState(cols);
    try { window.localStorage.setItem('myTasks:columnMode', String(cols)); } catch {}
  };

  // 削除ターゲット初期化/維持
  React.useEffect(() => {
    if (!categories.length) { setDeleteTargetId(''); return }
    if (!deleteTargetId || !categories.find(c => c.id === deleteTargetId)) {
      setDeleteTargetId(categories[0].id)
    }
  }, [categories])

  const startEditingTitle = (categoryId: string, currentTitle: string) => {
    setEditingTitle(categoryId);
    setTempTitle(currentTitle);
  };

  const saveTitle = (categoryId: string) => {
    if (!tempTitle.trim()) return;
    setCategories(categories.map(category => 
      category.id === categoryId ? { ...category, title: tempTitle } : category
    ));
    setEditingTitle(null);
  };

  const changeColor = (categoryId: string, color: string) => {
    setCategories(categories.map(category =>
      category.id === categoryId ? { ...category, color } : category
    ));
    // サーバーにも反映（TaskProvider経由）
    try { changeCategoryColor(categoryId, color); } catch {}
    setEditingColor(null);
  };

  const clearAllTasks = (categoryId: string) => {
    if (window.confirm('このカテゴリーのタスクを全て削除してもよろしいですか？')) {
      setCategories(categories.map(category =>
        category.id === categoryId ? { ...category, tasks: [] } : category
      ));
    }
  };

  const updateNewTaskContent = (categoryId: string, content: { content: string; dueDate?: string | null }) => {
    setNewTaskContents(prev => ({ ...prev, [categoryId]: content }));
  };

  const deleteTask = (categoryId: string, taskId: string) => {
    setCategories(categories.map(category =>
      category.id === categoryId
        ? { ...category, tasks: category.tasks.filter(task => task.id !== taskId) }
        : category
    ));
  };

  const startEditingTask = (taskId: string, currentContent: string) => {
    setEditingTaskId(taskId);
    setTempTaskContent(currentContent);
  };

  const saveTaskEdit = (categoryId: string, taskId: string) => {
    if (!tempTaskContent.trim()) return;
    setCategories(categories.map(category =>
      category.id === categoryId
        ? {
            ...category,
            tasks: category.tasks.map(task =>
              task.id === taskId ? { ...task, content: tempTaskContent.trim() } : task
            ),
          }
        : category
    ));
    setEditingTaskId(null);
  };

  // 背景色が暗いかどうか判定する関数（カレンダーと同様）
  function isDarkColor(bg: string): boolean {
    // Tailwindクラスの場合は色名で判定（gray-400以上は暗いとみなす）
    if (bg.startsWith('bg-gray-')) {
      const n = parseInt(bg.replace('bg-gray-', ''));
      return n >= 400;
    }
    // カラーコードの場合
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
      <div className="flex items-baseline mb-2">
        <h2 className="text-xl font-semibold">Myタスク</h2>
        <span className="text-red-600 font-bold text-xs sm:text-sm ml-4">※この機能は現在β版です。ご意見をぜひお聞かせください。</span>
      </div>
      <p className="text-[12px] text-gray-600 mb-3">
        個人タスクをカテゴリごとに整理し、期日・担当メモを付けながら進捗管理できます。登録したタスクはMyカレンダーにも同期されるため、スケジュールとの一体管理にご活用ください。
      </p>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-[11px] text-gray-600">表示列数</span>
        {[3, 4, 5].map(cols => (
          <button
            key={cols}
            type="button"
            onClick={() => setColumnMode(cols as 3 | 4 | 5)}
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
      {/* 追加/削除操作（表題の直下） */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-700 hover:text-white"
          onClick={async () => {
            const name = prompt('新しいタスクシート名を入力', `List ${(categories?.length || 0) + 1}`)?.trim() || undefined
            try { await addCategory(name) } catch {}
          }}
        >
          ＋ シート追加
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-red-600 hover:text-white"
            onClick={async () => {
              if (!deleteTargetId) return
              const cat = categories.find(c => c.id === deleteTargetId)
              if (!cat) return
              if (!window.confirm(`「${cat.title}」シートを削除します。よろしいですか？\n（このシート内のタスクも削除されます）`)) return
              try { await deleteCategory(deleteTargetId) } catch {}
            }}
          >
            － シート削除
          </button>
          <select
            className="text-xs border rounded px-2 py-1"
            value={deleteTargetId}
            onChange={e => setDeleteTargetId(e.target.value)}
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.title || c.id}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="my-task-grid">
        {categories.map(category => {
          const flexBasis = `calc((100% - ${(columnMode - 1)} * 0.75rem) / ${columnMode})`;
          const cardStyle: React.CSSProperties = {
            flex: `0 0 ${flexBasis}`,
            maxWidth: flexBasis,
            minWidth: 0, // 高解像度ディスプレイでも5列表示できるようにminWidthを0に
          };
          if (category.color.startsWith('#')) {
            cardStyle.backgroundColor = category.color;
          }
          return (
          <div
            key={category.id}
            className={`overflow-hidden ${category.color.startsWith('bg-') ? category.color : ''}`}
              style={cardStyle}
          >
            {/* カテゴリヘッダー */}
            <div className="px-3 py-2 flex items-center justify-between border-b border-black/5"
              style={category.color.startsWith('#') ? { backgroundColor: category.color } : {}}
            >
              <div className="flex items-center gap-2 flex-1">
                {editingTitle === category.id ? (
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onBlur={() => saveTitle(category.id)}
                    onKeyPress={(e) => e.key === 'Enter' && saveTitle(category.id)}
                    className={`flex-1 text-sm bg-transparent border-b border-black/10 focus:outline-none px-1 ${isDarkColor(category.color) ? 'text-white placeholder-white/80' : 'text-gray-800 placeholder:text-black/30'}`}
                    autoFocus
                  />
                ) : (
                  <>
                    <h3 className={`text-sm font-medium ${isDarkColor(category.color) ? 'text-white' : 'text-gray-800'}`}>{category.title}</h3>
                    <button
                      onClick={() => startEditingTitle(category.id, category.title)}
                      className={`${isDarkColor(category.color) ? 'text-white/70 hover:text-white' : 'text-black/40 hover:text-black/60'}`}
                    >
                      <FiEdit2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div style={{ position: 'relative', width: 24, height: 24 }}>
                  <button
                    type="button"
                    className={`w-6 h-6 rounded-full border ${isDarkColor(category.color) ? 'border-white/70 hover:border-white' : 'border-black/10 hover:border-black/20'} focus:outline-none`}
                    style={{ backgroundColor: category.color.startsWith('#') ? category.color : '', padding: 0 }}
                    tabIndex={-1}
                    aria-label="色を選択"
                  />
                  <input
                    type="color"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                    value={category.color.startsWith('#') ? category.color : '#cccccc'}
                    title="色を選択"
                    onChange={e => changeColor(category.id, e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-xs ${isDarkColor(category.color) ? 'text-white/70' : 'text-black/40'}`}>{category.tasks.length}</span>
                  <button
                    onClick={() => clearAllTasks(category.id)}
                    className={`text-[10px] font-medium ${isDarkColor(category.color) ? 'text-white/70 hover:text-white' : 'text-black/40 hover:text-black/60'}`}
                  >
                    AC
                  </button>
                  {/* 追加ボタンをACの右に固定 */}
                  <button
                    type="button"
                    className={`ml-1 px-1.5 py-0.5 text-[10px] rounded border-none bg-transparent ${isDarkColor(category.color) ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-blue-500'}`}
                    aria-label="タスクを登録"
                    onClick={() => {
                      const content = newTaskContents[category.id]?.content || '';
                      const dueDate = newTaskContents[category.id]?.dueDate || null;
                      if (content.trim()) {
                        addTask(category.id, content, dueDate);
                        setNewTaskContents(prev => ({ ...prev, [category.id]: { content: '', dueDate: '' } }));
                      }
                    }}
                    tabIndex={0}
                  >
                    追加
                  </button>
                </div>
              </div>
            </div>

            {/* カラーピッカーUIは不要なので削除 */}

            {/* 新規タスク入力 */}
            <div className="px-3 py-2 border-b border-black/5"
              style={category.color.startsWith('#') ? { backgroundColor: category.color } : {}}
            >
              <div className="flex items-center gap-1 min-w-0">
                <input
                  type="text"
                  placeholder="Add task"
                  value={newTaskContents[category.id]?.content || ''}
                  onChange={(e) => updateNewTaskContent(category.id, { ...newTaskContents[category.id], content: e.target.value })}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const content = newTaskContents[category.id]?.content || '';
                      const dueDate = newTaskContents[category.id]?.dueDate || null;
                      if (content.trim()) {
                        addTask(category.id, content, dueDate);
                        setNewTaskContents(prev => ({ ...prev, [category.id]: { content: '', dueDate: '' } }));
                      }
                    }
                  }}
                  className={`flex-1 text-sm bg-transparent focus:outline-none min-w-0 ${isDarkColor(category.color) ? 'text-white placeholder-white/60' : 'text-gray-800 placeholder:text-black/30'}`}
                />
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <span className={`text-xs whitespace-nowrap ${isDarkColor(category.color) ? 'text-white/70' : 'text-gray-800/70'}`} style={{ display: newTaskContents[category.id]?.dueDate ? 'inline' : 'none' }}>
                    {(() => {
                      const dueDateVal = newTaskContents[category.id]?.dueDate;
                      if (dueDateVal) {
                        const [y, m, d] = dueDateVal.split('-');
                        return `${Number(y)}-${Number(m)}-${Number(d)}`;
                      } else {
                        return '';
                      }
                    })()}
                  </span>
                  <div style={{ position: 'relative', width: 20, height: 20, flexShrink: 0 }}>
                    <button
                      type="button"
                      className={`flex items-center justify-center w-5 h-5 ${isDarkColor(category.color) ? 'text-white/70 hover:text-white' : 'text-black/40 hover:text-black/60'}`}
                      tabIndex={-1}
                      aria-label="期日を選択"
                      style={{ background: 'none', border: 'none', padding: 0 }}
                    >
                      <FiCalendar size={14} />
                    </button>
                    <input
                      type="date"
                      value={newTaskContents[category.id]?.dueDate || ''}
                      onChange={e => updateNewTaskContent(category.id, { ...newTaskContents[category.id], dueDate: e.target.value })}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                      tabIndex={0}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* タスクリスト */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-black/5"
              style={category.color.startsWith('#') ? { backgroundColor: category.color } : {}}
            >
              {category.tasks.map(task => (
                <div
                  key={task.id}
                  className="px-3 py-2 flex items-start gap-2"
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTaskComplete(category.id, task.id)}
                    className="mt-1 rounded border-black/20"
                  />
                  {editingTaskId === task.id ? (
                    <input
                      type="text"
                      value={tempTaskContent}
                      onChange={(e) => setTempTaskContent(e.target.value)}
                      onBlur={() => saveTaskEdit(category.id, task.id)}
                      onKeyPress={(e) => e.key === 'Enter' && saveTaskEdit(category.id, task.id)}
                      className={`flex-1 text-sm bg-transparent border-b border-black/10 focus:outline-none ${isDarkColor(category.color) ? 'text-white placeholder-white/80' : 'text-gray-800'}`}
                      autoFocus
                    />
                  ) : (
                    <div className="flex-1 flex items-start justify-between min-w-0 gap-1">
                      <span className={`text-xs truncate ${task.completed ? (isDarkColor(category.color) ? 'line-through text-white/60' : 'line-through text-black/40') : (isDarkColor(category.color) ? 'text-white' : 'text-gray-800')}`}>
                        {task.content}
                      </span>
                      <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
                        {/* 期日表示 */}
                        {task.dueDate && (
                          <span className={`text-xs whitespace-nowrap ${isDarkColor(category.color) ? 'text-white/70' : 'text-gray-800/70'}`}>
                            {(() => {
                              const d = new Date(task.dueDate);
                              if (!isNaN(d.getTime())) {
                                return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
                              } else {
                                return task.dueDate;
                              }
                            })()}
                          </span>
                        )}
                        <button
                          onClick={() => startEditingTask(task.id, task.content)}
                          className={`flex-shrink-0 ${isDarkColor(category.color) ? 'text-white/70 hover:text-white' : 'text-black/40 hover:text-black/60'}`}
                        >
                          <FiEdit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteTask(category.id, task.id)}
                          className={`flex-shrink-0 ${isDarkColor(category.color) ? 'text-white/70 hover:text-white' : 'text-black/40 hover:text-black/60'}`}
                        >
                          <FiTrash2 className="w-3 h-3" />
                        </button>
                        {/* カレンダーマーク＋日付ピッカー */}
                        <div style={{ position: 'relative', width: 20, height: 20, flexShrink: 0 }}>
                          <button
                            type="button"
                            className={`${isDarkColor(category.color) ? 'text-white/70 hover:text-white' : 'text-black/40 hover:text-black/60'} flex items-center justify-center w-5 h-5`}
                            tabIndex={-1}
                            aria-label="期日を編集"
                            style={{ background: 'none', border: 'none', padding: 0 }}
                          >
                            <FiCalendar size={14} />
                          </button>
                          <input
                            type="date"
                            value={task.dueDate || ''}
                            onChange={e => updateTask(category.id, task.id, task.content, e.target.value)}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                            tabIndex={0}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
        })}
      </div>
    </div>
  );
} 