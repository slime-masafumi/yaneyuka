'use client';

import React, { useState } from 'react';
import ToolHeader from './ToolHeader';
import { FiEdit2, FiTrash2, FiCheck, FiCalendar } from 'react-icons/fi';
import { useTaskContext } from '../../providers/TaskProvider';
import { useAuth } from '@/lib/AuthContext';
import { ProjectView, DoneHistory } from './myTasks/MyTaskViews';
import { useGuestTasks, useGuestTaskMigration } from './myTasks/guestTasks';
import GuestNote from './general-tools/GuestNote';
import ProjectPicker from '@/components/ui/ProjectPicker';
import { useProjectRegistry } from '@/lib/projectRegistry';
import { projectOf, sameProjectKey, withProject } from '@/lib/myTaskView';

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

/**
 * 期日の状態。
 *
 * 期日を持たせても、過ぎていることが分からなければ「ただのリスト」のまま。
 * 超過と当日だけは地の色に関係なく目立たせる。
 * 日付は YYYY-MM-DD の文字列なので、そのまま比較すれば時刻もタイムゾーンも絡まない。
 */
type DueState = 'overdue' | 'today' | 'soon' | 'later' | 'none';

const ymd = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const dueState = (dueDate: string | null | undefined, completed: boolean): DueState => {
  if (!dueDate || completed) return 'none';
  const today = ymd(new Date());
  if (dueDate < today) return 'overdue';
  if (dueDate === today) return 'today';

  // 3日先までは「近い」。週末を挟むと実質ほぼ猶予がないので短めに取る。
  const limit = new Date();
  limit.setDate(limit.getDate() + 3);
  return dueDate <= ymd(limit) ? 'soon' : 'later';
};

/** 期日の早い順。期日なしは末尾、完了したものはさらに後ろ。 */
const byDueDate = (a: Task, b: Task) => {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;
  if (!a.dueDate && !b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0;
};

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
  { id: '1', title: '今日', tasks: [], color: 'bg-gray-100' },
  { id: '2', title: '優先', tasks: [], color: 'bg-gray-200' },
  { id: '3', title: '案件', tasks: [], color: 'bg-gray-300' },
  { id: '4', title: 'アイデア', tasks: [], color: 'bg-gray-400' },
  { id: '5', title: '済み', tasks: [], color: 'bg-gray-500' },
];

export default function MyTasks() {
  const { isLoggedIn, currentUser, authReady } = useAuth();
  // 未ログインはこのブラウザ（localStorage）に保存。ログインしたらクラウド（TaskProvider）
  const guestMode = authReady && !currentUser;
  const cloudTasks = useTaskContext();
  const guestTasks = useGuestTasks();
  const migration = useGuestTaskMigration(currentUser?.uid);
  const { categories, setCategories, addTask, toggleTaskComplete, changeCategoryColor, updateTask, addCategory, deleteCategory, deleteTask: removeTask, clearTasks, renameCategory } = guestMode ? guestTasks : cloudTasks;
  // スマホ幅では 5 列だと 1 列が 50px ほどになり読めない。幅に応じて列数の上限をかける
  const [maxCols, setMaxCols] = useState<1 | 2 | 5>(5);
  React.useEffect(() => {
    const narrow = window.matchMedia('(max-width: 639px)');
    const mid = window.matchMedia('(max-width: 1023px)');
    const apply = () => setMaxCols(narrow.matches ? 1 : mid.matches ? 2 : 5);
    apply();
    narrow.addEventListener('change', apply);
    mid.addEventListener('change', apply);
    return () => { narrow.removeEventListener('change', apply); mid.removeEventListener('change', apply); };
  }, []);
  // シート / 物件別 / 完了の履歴
  const [view, setView] = useState<'sheets' | 'projects' | 'done'>('sheets');
  const [hideCompleted, setHideCompleted] = useState(false);
  React.useEffect(() => {
    try { setHideCompleted(window.localStorage.getItem('myTasks:hideCompleted') === '1'); } catch {}
  }, []);
  const toggleHideCompleted = () => {
    setHideCompleted(v => {
      try { window.localStorage.setItem('myTasks:hideCompleted', v ? '0' : '1'); } catch {}
      return !v;
    });
  };
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTaskContents, setNewTaskContents] = useState<{[key: string]: { content: string; dueDate?: string | null }}>({});
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [tempTaskContent, setTempTaskContent] = useState<string>('');
  // 編集中のタスクの物件（【】）。触ったときだけ本文の【】を付け替える（本文で直接【】を直した人の手を戻さない）
  const [tempTaskProject, setTempTaskProject] = useState<{ name: string; touched: boolean }>({ name: '', touched: false });
  // 物件の台帳（src/lib/projectRegistry.ts）。【物件名】の書き方は変えず、選ぶ元と束ね方だけを台帳にそろえる
  const registry = useProjectRegistry();
  // 追加するタスクに付ける物件（空なら付けない）。「物件で絞る」で物件を選ぶとそれに合わせる
  const [addProject, setAddProject] = useState('');
  // 物件で絞る。null = すべて / '' = 物件なし / それ以外 = 物件名
  const [projFilter, setProjFilter] = useState<string | null>(null);
  /** 追加する本文。物件を選んでいて、本文にまだ【】が無ければ頭に付ける */
  const contentFor = (content: string) => {
    const p = addProject.trim();
    return p && !projectOf(content).project ? withProject(content, registry.find(p)?.name ?? p) : content;
  };
  const matchesProjFilter = (content: string) => {
    if (projFilter === null) return true;
    const p = projectOf(content).project;
    if (projFilter === '') return !p;
    return !!p && sameProjectKey(p) === sameProjectKey(projFilter);
  };
  // 絞り込みの候補: 台帳の物件 + タスクにだけある物件名（台帳に無いものは「台帳に登録」できる）
  const projectChoices = (() => {
    const out: { name: string; known: boolean; n: number }[] = registry.active.map((p) => ({ name: p.name, known: true, n: 0 }));
    for (const c of categories) {
      for (const t of c.tasks) {
        if (t.completed) continue;
        const p = projectOf(t.content).project;
        if (!p) continue;
        const k = sameProjectKey(p);
        const hit = out.find((o) => sameProjectKey(o.name) === k);
        if (hit) hit.n++;
        else out.push({ name: registry.find(p)?.name ?? p, known: !!registry.find(p), n: 1 });
      }
    }
    return out;
  })();
  const filterUnknown = projFilter ? !registry.find(projFilter) : false;
  // 期日順に並べ替えるか。既定は登録順のまま（並びを覚えている人がいるので）。
  const [sortByDue, setSortByDue] = useState(false);
  const [taskNotice, setTaskNotice] = useState('');
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
    void renameCategory(categoryId, tempTitle.trim());
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
      void clearTasks(categoryId);
    }
  };

  const updateNewTaskContent = (categoryId: string, content: { content: string; dueDate?: string | null }) => {
    setNewTaskContents(prev => ({ ...prev, [categoryId]: content }));
  };

  const deleteTask = (categoryId: string, taskId: string) => {
    void removeTask(categoryId, taskId);
  };

  const startEditingTask = (taskId: string, currentContent: string) => {
    setEditingTaskId(taskId);
    setTempTaskContent(currentContent);
    setTempTaskProject({ name: projectOf(currentContent).project ?? '', touched: false });
  };

  const saveTaskEdit = (categoryId: string, taskId: string) => {
    if (editingTaskId !== taskId) return;
    let content = tempTaskContent.trim();
    if (tempTaskProject.touched) {
      const n = tempTaskProject.name.trim();
      content = withProject(content, n ? registry.find(n)?.name ?? n : '');
    }
    if (!content.trim()) return;
    const task = categories.find(c => c.id === categoryId)?.tasks.find(t => t.id === taskId);
    if (task && task.content !== content) void updateTask(categoryId, taskId, content, task?.dueDate ?? null);
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
    // 帯は左右いっぱい、その下の本文だけ他ツールと同じ左右余白を付ける。
    <div className="pt-0 pb-4 [&>*:not(:first-child)]:mx-4 [&>*:nth-child(2)]:mt-3">
      <ToolHeader
        no="02"
        code="TASKS"
        title="Myタスク"
        description="宿題管理。シートで整理し、【物件名】でまとめて見る。期限超過は赤で出し、前日と当日にはベルで知らせる。Myカレンダーにも出る。"
        features={[
          {
            label: 'シート',
            hint: '色分けしたシートに並べる。3〜5 列で表示',
            active: view === 'sheets' && !sortByDue,
            onClick: () => { setView('sheets'); setSortByDue(false); setTaskNotice(''); },
          },
          {
            label: '物件別',
            hint: 'タスクの頭の【物件名】でまとめて見る',
            active: view === 'projects',
            onClick: () => { setView('projects'); setTaskNotice(''); },
          },
          {
            label: '完了の履歴',
            hint: '完了した日ごとに振り返る',
            active: view === 'done',
            onClick: () => { setView('done'); setTaskNotice(''); },
          },
          {
            label: '期日順・期限超過',
            hint: '期日の早い順に並べ、超過と当日を目立たせる',
            active: view === 'sheets' && sortByDue,
            onClick: () => { setView('sheets'); setSortByDue(true); setTaskNotice(''); },
          },
          {
            label: '期限の通知（前日・当日）',
            login: true,
            hint: 'ログインすると、期日の前日と当日の朝 8 時に上部のベルへ通知が届きます',
            onClick: () => setTaskNotice(
              isLoggedIn
                ? '期日を入れたタスクは、前日と当日の朝 8 時に上部のベル（通知）でお知らせします。期日は各タスクの日付欄で入れます。'
                : 'ログイン（無料の会員登録）すると、期日の前日と当日の朝 8 時に上部のベルへ通知が届きます。',
            ),
          },
        ]}
      />
      {taskNotice && <p className="text-[11px] text-gray-600" role="status">{taskNotice}</p>}
      {guestMode && <GuestNote>このブラウザに保存しています。ログインすると端末間で同期し、期日の前日・当日にベルで知らせます。</GuestNote>}
      {migration.message && (
        <p className="text-[11px] text-gray-600 border-l border-[#52AA96] pl-2" role="status">
          {migration.message}{' '}
          <button type="button" className="underline underline-offset-2" onClick={migration.dismiss}>閉じる</button>
        </p>
      )}
      {migration.pending > 0 && (
        <p className="text-[11px] text-gray-600 border-l border-[#52AA96] pl-2" role="status">
          このブラウザに、ログイン前に入れたタスクが {migration.pending} 件あります。{' '}
          <button type="button" className="underline underline-offset-2 font-bold text-gray-900" onClick={() => void migration.addNow()}>アカウントに追加</button>
          {' / '}
          <button type="button" className="underline underline-offset-2" onClick={migration.dismiss}>今はしない</button>
        </p>
      )}
      {/* 列数はスマホ幅では 1 列に固定するので、切り替えはタブレット幅以上だけ出す */}
      <div className="hidden sm:flex items-center gap-2 mb-3 flex-wrap">
        <span className="yy-mono text-[10px] tracking-[0.12em] uppercase text-gray-500">Columns</span>
        {[3, 4, 5].map(cols => (
          <button
            key={cols}
            type="button"
            onClick={() => setColumnMode(cols as 3 | 4 | 5)}
            className={`px-2.5 py-1 text-[11px] border transition-colors ${
              columnMode === cols
                ? 'bg-[#3b3b3b] text-white border-[#3b3b3b]'
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
          className="px-2 py-1 text-xs border border-gray-300 bg-white hover:bg-gray-100"
          onClick={async () => {
            const name = prompt('新しいタスクシート名を入力', `リスト ${(categories?.length || 0) + 1}`)?.trim() || undefined
            try { await addCategory(name) } catch {}
          }}
        >
          ＋ シート追加
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="px-2 py-1 text-xs border border-gray-300 bg-white hover:text-red-600 hover:border-red-600"
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
            className="text-xs border px-2 py-1"
            value={deleteTargetId}
            onChange={e => setDeleteTargetId(e.target.value)}
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.title || c.id}</option>
            ))}
          </select>

          {/* 期日まわり。超過が何件あるかは、シートを開いた瞬間に分かるべきもの。 */}
          <button
            type="button"
            onClick={() => setSortByDue(v => !v)}
            className={`text-xs px-2 py-1 border transition-colors ${
              sortByDue
                ? 'bg-[#3b3b3b] text-white border-[#3b3b3b] font-bold'
                : 'bg-white text-gray-700 border-[#3b3b3b] hover:bg-gray-100'
            }`}
            title="期日の早い順に並べ替える（完了は末尾）"
          >
            期日順
          </button>
          <label className="text-xs flex items-center gap-1 ml-1">
            <input type="checkbox" checked={hideCompleted} onChange={toggleHideCompleted} /> 完了を隠す
          </label>
          {(() => {
            const overdue = categories.reduce(
              (n, c) => n + c.tasks.filter(t => dueState(t.dueDate, t.completed) === 'overdue').length,
              0,
            );
            if (overdue === 0) return null;
            return (
              <span className="text-xs bg-red-600 text-white font-bold px-2 py-1">
                期限超過 {overdue}件
              </span>
            );
          })()}
        </div>
      </div>
      {/* 物件: 追加するタスクに【物件名】を付ける / 物件で絞る。物件は台帳（ほかのツールと共通）から選ぶ */}
      <div className="mb-3 flex items-center gap-x-3 gap-y-2 flex-wrap text-xs">
        <label className="flex items-center gap-1.5 min-w-0">
          <span className="yy-mono text-[10px] tracking-[0.12em] uppercase text-gray-500 shrink-0">Project</span>
          <span className="text-gray-600 shrink-0">追加する物件</span>
          <ProjectPicker
            value={addProject}
            onChange={setAddProject}
            placeholder="なし（【】を付けない）"
            label="追加するタスクの物件"
            className="[&_input]:!h-7 [&_input]:!w-[200px] [&_input]:!text-[12px]"
          />
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-gray-600">物件で絞る</span>
          <select
            className="text-xs border px-2 py-1 max-w-[220px]"
            value={projFilter === null ? '__all__' : projFilter === '' ? '__none__' : projFilter}
            onChange={(e) => {
              const v = e.target.value;
              const next = v === '__all__' ? null : v === '__none__' ? '' : v;
              setProjFilter(next);
              // 物件を選んだら、追加するタスクもその物件に付ける（A 邸を見ながら足したものは A 邸）
              if (next) setAddProject(next);
            }}
          >
            <option value="__all__">すべて</option>
            {projectChoices.map((p) => (
              <option key={p.name} value={p.name}>{p.name}{p.n ? `（${p.n}）` : ''}{p.known ? '' : ' ・台帳なし'}</option>
            ))}
            <option value="__none__">物件なし</option>
          </select>
        </label>
        {projFilter && filterUnknown && (
          <button
            type="button"
            className="underline underline-offset-2 text-[#2f7f6d]"
            onClick={() => void registry.add(projFilter)}
            title="物件の台帳に登録すると、メモ・yymail・Teamタスク・物件ハブでも同じ物件として扱えます"
          >
            「{projFilter}」を台帳に登録
          </button>
        )}
        {projFilter && !filterUnknown && registry.find(projFilter) && (
          <a className="underline underline-offset-2 text-gray-600" href={`/bukken/?p=${encodeURIComponent(registry.find(projFilter)!.id)}`}>
            物件ハブで見る
          </a>
        )}
      </div>
      <div className="flex items-center gap-0 mb-2 border-b border-gray-300">
        {([['sheets', 'シート'], ['projects', '物件別'], ['done', '完了の履歴']] as const).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setView(k)}
            className={`px-3 py-1 text-xs -mb-px border-b ${view === k ? 'border-[#52AA96] font-bold text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {view === 'projects' && (
        <div className="border border-[#3b3b3b] p-3">
          <ProjectView categories={categories} today={ymd(new Date())} onToggle={toggleTaskComplete} only={projFilter ?? undefined} />
        </div>
      )}
      {view === 'done' && (
        <div className="border border-[#3b3b3b] p-3">
          <DoneHistory categories={categories} onToggle={toggleTaskComplete} />
        </div>
      )}
      {view === 'sheets' && (
      <div className="my-task-grid border border-[#3b3b3b] p-3">
        {categories.map(category => {
          const cols = Math.min(columnMode, maxCols);
          const flexBasis = `calc((100% - ${(cols - 1)} * 0.75rem) / ${cols})`;
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
                    className={`flex-1 text-[12px] bg-transparent border-b border-black/10 focus:outline-none px-1 ${isDarkColor(category.color) ? 'text-white placeholder-white/80' : 'text-gray-800 placeholder:text-black/30'}`}
                    autoFocus
                  />
                ) : (
                  <>
                    <h3 className={`text-[12px] font-bold ${isDarkColor(category.color) ? 'text-white' : 'text-gray-800'}`}>{category.title}</h3>
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
                  <span className={`yy-mono text-[10px] ${isDarkColor(category.color) ? 'text-white/70' : 'text-black/40'}`}>{category.tasks.length}</span>
                  <button
                    onClick={() => clearAllTasks(category.id)}
                    title="このシートのタスクをすべて消す"
                    className={`yy-mono text-[10px] ${isDarkColor(category.color) ? 'text-white/70 hover:text-white' : 'text-black/40 hover:text-black/60'}`}
                  >
                    AC
                  </button>
                  {/* 追加ボタンをACの右に固定 */}
                  <button
                    type="button"
                    className={`ml-1 px-1.5 py-0.5 text-[10px] border-none bg-transparent ${isDarkColor(category.color) ? 'text-white/70 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                    aria-label="タスクを登録"
                    onClick={() => {
                      const content = newTaskContents[category.id]?.content || '';
                      const dueDate = newTaskContents[category.id]?.dueDate || null;
                      if (content.trim()) {
                        addTask(category.id, contentFor(content.trim()), dueDate);
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
                  placeholder={addProject.trim() ? `【${addProject.trim()}】Add task` : 'Add task'}
                  title={addProject.trim() ? `頭に【${addProject.trim()}】を付けて追加します（上の「追加する物件」）` : undefined}
                  value={newTaskContents[category.id]?.content || ''}
                  onChange={(e) => updateNewTaskContent(category.id, { ...newTaskContents[category.id], content: e.target.value })}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const content = newTaskContents[category.id]?.content || '';
                      const dueDate = newTaskContents[category.id]?.dueDate || null;
                      if (content.trim()) {
                        addTask(category.id, contentFor(content.trim()), dueDate);
                        setNewTaskContents(prev => ({ ...prev, [category.id]: { content: '', dueDate: '' } }));
                      }
                    }
                  }}
                  className={`flex-1 text-[12px] bg-transparent focus:outline-none min-w-0 ${isDarkColor(category.color) ? 'text-white placeholder-white/60' : 'text-gray-800 placeholder:text-black/30'}`}
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
              {(sortByDue ? [...category.tasks].sort(byDueDate) : category.tasks).filter(task => !(hideCompleted && task.completed) && matchesProjFilter(task.content)).map(task => (
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
                    // 本文と物件（【】）をまとめて直す。欄の外へ出たら保存（物件の欄・登録ボタンへ移るだけなら保存しない）
                    <div
                      className="flex-1 min-w-0 space-y-1"
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) saveTaskEdit(category.id, task.id);
                      }}
                    >
                      <input
                        type="text"
                        value={tempTaskContent}
                        onChange={(e) => setTempTaskContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.nativeEvent.isComposing) saveTaskEdit(category.id, task.id);
                          if (e.key === 'Escape') setEditingTaskId(null);
                        }}
                        className={`w-full text-[12px] bg-transparent border-b border-black/10 focus:outline-none ${isDarkColor(category.color) ? 'text-white placeholder-white/80' : 'text-gray-800'}`}
                        autoFocus
                      />
                      <div
                        className="flex items-center gap-1 min-w-0"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.nativeEvent.isComposing && (e.target as HTMLElement).tagName === 'INPUT') saveTaskEdit(category.id, task.id);
                        }}
                      >
                        <span className={`text-[10px] shrink-0 ${isDarkColor(category.color) ? 'text-white/70' : 'text-black/50'}`}>物件</span>
                        <ProjectPicker
                          value={tempTaskProject.name}
                          onChange={(name) => setTempTaskProject({ name, touched: true })}
                          placeholder="なし"
                          label="このタスクの物件"
                          className="min-w-0 flex-wrap [&_input]:!h-6 [&_input]:!w-full [&_input]:!text-[11px] [&_input]:!px-1"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-start justify-between min-w-0 gap-1">
                      <span className={`text-xs min-w-0 break-words ${task.completed ? (isDarkColor(category.color) ? 'line-through text-white/60' : 'line-through text-black/40') : (isDarkColor(category.color) ? 'text-white' : 'text-gray-800')}`}>
                        {task.content}
                      </span>
                      <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
                        {/* 期日表示 */}
                        {task.dueDate && (() => {
                          const state = dueState(task.dueDate, task.completed);
                          // 超過・当日は地の色に関係なく目立たせる。それ以外は控えめに。
                          const tone =
                            state === 'overdue' ? 'bg-red-600 text-white font-bold px-1'
                            : state === 'today' ? 'bg-amber-400 text-gray-900 font-bold px-1'
                            : state === 'soon' ? (isDarkColor(category.color) ? 'text-amber-200 font-bold' : 'text-amber-700 font-bold')
                            : isDarkColor(category.color) ? 'text-white/70' : 'text-gray-800/70';
                          const d = new Date(task.dueDate);
                          const label = isNaN(d.getTime())
                            ? task.dueDate
                            : `${d.getMonth() + 1}/${d.getDate()}`;
                          return (
                            <span
                              className={`text-xs whitespace-nowrap ${tone}`}
                              title={state === 'overdue' ? '期限超過' : state === 'today' ? '本日が期日' : undefined}
                            >
                              {state === 'overdue' ? '超過 ' : ''}{label}
                            </span>
                          );
                        })()}
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
      )}
    </div>
  );
} 