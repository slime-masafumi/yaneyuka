'use client';
/**
 * 設計ツール › 設計計画 › 工程表。
 *
 * 設計工程・工事工程をガントチャートで組み、A3 / A4 で印刷する。
 * - テンプレート（設計・木造・RC・S・改修）から着手日を入れるだけで並ぶ
 * - 稼働日（日曜・祝日・年末年始・お盆・休工日）で日数を数える
 * - 前工程を結ぶと、前が延びたとき後ろを押し出す。クリティカルパスを赤枠で
 * - 進捗・基準計画（当初の予定）・今日の線で遅れが見える
 * - バーを掴んで動かす・両端で伸び縮み
 * - 行が多ければ複数ページで印刷。CSV（Excel）・.ics の入出力、Myカレンダー・Teamタスクへ送る、閲覧リンク
 *
 * 計算は src/lib/gantt.ts（node scripts/test-gantt.ts）。描画は ./schedule/。
 *
 * 保存先は users/{uid}/ganttProjects/{id}（以前の版と同じ。name と tasks は同じ形で読める）。
 * 編集は 1.2 秒おいて自動で保存する。閲覧リンクを出しているときは publicGantts/{slug} にも写す。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, onSnapshot, query, setDoc, where, writeBatch } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebaseClient';
import { createBoard, listBoardsForUser, addBoardTask, type BoardDoc } from '@/lib/firebaseUserData';
import {
  DEFAULT_CALENDAR, PALETTE, TEMPLATES, addDays, addWorkdays, canLink, cascade, criticalPath, fromCsv, groupSpan, instantiate,
  isBehind, isDate, iso, kindOf, nextWorkday, normalizeCalendar, normalizeTasks, plannedProgress, shiftTasks, stripForSave,
  toCsv, toIcs, workdaysBetween, daysBetween, type GanttKind, type GanttTask, type WorkCalendar,
} from '@/lib/gantt';
import GanttPreview, { DEFAULT_VIEW, normalizeView, type ViewSettings } from './schedule/GanttPreview';
import type { DragResult } from './schedule/GanttPage';
import { downloadText, printSvgPages } from './schedule/output';
import { useHolidays } from './schedule/useHolidays';

type ProjectData = {
  name: string;
  tasks: GanttTask[];
  calendar: WorkCalendar;
  view: ViewSettings;
  /** 題の下に出す（物件名・発注者・工事名など） */
  sub: string;
  /** 右上に出す（会社名・作成者） */
  author: string;
  /** 物件カルテの id（紐づけ） */
  propertyId: string;
  /** 閲覧リンク（publicGantts/{slug}）。空なら出していない */
  shareSlug: string;
  updatedAt?: number;
};

type ProjectRow = ProjectData & { id: string };

const MAX_TASKS = 300;
const CACHE_KEY = 'ganttProjects';
const KIND_LABEL: Record<GanttKind, string> = { task: '工程', milestone: '節目', group: '大項目' };

const emptyProject = (name = ''): ProjectData => ({
  name,
  tasks: [],
  calendar: { ...DEFAULT_CALENDAR, extraOff: [] },
  view: { ...DEFAULT_VIEW },
  sub: '',
  author: '',
  propertyId: '',
  shareSlug: '',
});

/** Firestore・端末の保存から読んだものを整える（以前の版は name と tasks だけ） */
const normalizeProject = (id: string, raw: Record<string, unknown>): ProjectRow => ({
  id,
  name: typeof raw.name === 'string' ? raw.name : '',
  tasks: normalizeTasks(raw.tasks),
  calendar: normalizeCalendar(raw.calendar),
  view: normalizeView(raw.view),
  sub: typeof raw.sub === 'string' ? raw.sub : '',
  author: typeof raw.author === 'string' ? raw.author : '',
  propertyId: typeof raw.propertyId === 'string' ? raw.propertyId : '',
  shareSlug: typeof raw.shareSlug === 'string' ? raw.shareSlug : '',
  updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0,
});

const toDoc = (p: ProjectData) => ({
  name: p.name,
  tasks: stripForSave(p.tasks),
  calendar: p.calendar,
  view: p.view,
  sub: p.sub,
  author: p.author,
  propertyId: p.propertyId,
  shareSlug: p.shareSlug,
  updatedAt: Date.now(),
});

const newSlug = () => {
  const a = new Uint8Array(9);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
};

/** 来週の月曜（見本の着手日） */
const nextMonday = () => {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return iso(d);
};

const md = (s: string) => (s ? `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}` : '');

// --------------------------------------------------------------------------- 入力欄（打っている間は親を描き直さない）

function CellText({ value, onCommit, placeholder, className, maxLength = 60, disabled }: { value: string; onCommit: (v: string) => void; placeholder?: string; className?: string; maxLength?: number; disabled?: boolean }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      type="text"
      value={v}
      maxLength={maxLength}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onCommit(v)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setV(value);
      }}
      className={className}
    />
  );
}

function CellNumber({ value, onCommit, min = 0, max = 9999, className, disabled }: { value: number; onCommit: (v: number) => void; min?: number; max?: number; className?: string; disabled?: boolean }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  const commit = () => {
    const n = Math.min(max, Math.max(min, Math.round(Number(v) || 0)));
    setV(String(n));
    if (n !== value) onCommit(n);
  };
  return (
    <input
      type="number"
      value={v}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className={className}
    />
  );
}

function ColorPick({ value, onChange, disabled }: { value: string; onChange: (c: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" disabled={disabled} onClick={() => setOpen(!open)} className="block w-5 h-5 border border-[#3b3b3b]" style={{ background: value }} title="色" aria-label="色を選ぶ" />
      {open && (
        <div className="absolute z-30 left-0 top-6 bg-white border border-[#3b3b3b] p-1.5 grid grid-cols-4 gap-1 w-[112px]" onMouseLeave={() => setOpen(false)}>
          {PALETTE.map((p) => (
            <button key={p.color} type="button" title={p.label} onClick={() => { onChange(p.color); setOpen(false); }} className="w-5 h-5 border border-gray-300" style={{ background: p.color }} />
          ))}
          <label className="col-span-4 flex items-center gap-1 text-[10px] text-gray-600 mt-1">
            ほか
            <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-5 p-0 border-0" />
          </label>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------- 本体

type Tab = 'list' | 'template' | 'calendar' | 'export' | 'share';

const Schedule: React.FC = () => {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid ?? null;
  const holidays = useHolidays();

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [data, setData] = useState<ProjectData>(() => emptyProject());
  const [past, setPast] = useState<GanttTask[][]>([]);
  const [future, setFuture] = useState<GanttTask[][]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [tab, setTab] = useState<Tab>('list');
  const [zoom, setZoom] = useState(60);
  const previewWrap = useRef<HTMLDivElement>(null);
  /** 用紙の幅が中央の列に収まる拡大率（5% 刻み） */
  const fitZoom = useCallback(() => {
    const w = previewWrap.current?.clientWidth ?? 0;
    if (!w) return;
    const paperW = data.view.paper === 'A4' ? 1123 : 1587;
    setZoom(Math.max(30, Math.min(100, Math.floor(((w - 52) / paperW) * 20) * 5)));
  }, [data.view.paper]);
  useEffect(() => {
    fitZoom();
  }, [fitZoom]);
  const [saveState, setSaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const pagesRef = useRef<SVGSVGElement[]>([]);
  const dirtyRef = useRef(false);
  /** 手を入れるたびに増やす。保存中にさらに直されたら、保存が済んでも「未保存」のままにする */
  const editVersion = useRef(0);
  const lastSavedJson = useRef('');
  const sampleRef = useRef(false);

  const say = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast((t) => (t === m ? '' : t)), 5000);
  }, []);

  const { tasks, calendar: cal, view } = data;

  // ------------------------------------------------------------------ 読み込み
  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
      if (Array.isArray(cached)) setProjects(cached.map((p: Record<string, unknown>) => normalizeProject(String(p.id), p)));
    } catch {}
    if (!uid) return;
    const unsub = onSnapshot(collection(db, 'users', uid, 'ganttProjects'), (snap) => {
      const list = snap.docs.map((d) => normalizeProject(d.id, d.data())).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0) || a.name.localeCompare(b.name, 'ja'));
      setProjects(list);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(list));
      } catch {}
    });
    return () => unsub();
  }, [uid]);

  // 別の端末で直したものを、こちらで手を入れていなければ取り込む
  useEffect(() => {
    if (!currentId || dirtyRef.current) return;
    const row = projects.find((p) => p.id === currentId);
    if (!row) return;
    const { id: _id, ...rest } = row;
    void _id;
    const json = JSON.stringify(toDocComparable(rest));
    if (json === lastSavedJson.current) return;
    lastSavedJson.current = json;
    setData(rest);
  }, [projects, currentId]);

  // 最後に開いていた工程表を開く
  useEffect(() => {
    if (currentId || !projects.length || !uid) return;
    let last = '';
    try {
      last = localStorage.getItem('ganttLastProject') || '';
    } catch {}
    const row = projects.find((p) => p.id === last) ?? projects[0];
    if (row) openProject(row.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, uid]);

  // 未ログインは見本（木造住宅）を見せる。編集はログインしてから。
  // ログインの確認が済む前に見本を出していたら、ログインが分かった時点で片付ける
  useEffect(() => {
    if (uid) {
      if (sampleRef.current && !currentId) {
        sampleRef.current = false;
        setData(emptyProject());
      }
      return;
    }
    if (sampleRef.current) return;
    sampleRef.current = true;
    setData({ ...emptyProject('見本: 木造住宅 新築工事'), sub: '会員登録（無料）すると、テンプレートから自分の工程表を作って保存・印刷できます', tasks: instantiate(TEMPLATES[1], nextMonday(), DEFAULT_CALENDAR, {}, 1) });
  }, [uid, currentId]);

  // ------------------------------------------------------------------ 保存（自動）
  const persist = useCallback(
    async (id: string, p: ProjectData) => {
      if (!uid) return;
      const version = editVersion.current;
      setSaveState('saving');
      try {
        const body = toDoc(p);
        await setDoc(doc(db, 'users', uid, 'ganttProjects', id), body);
        if (p.shareSlug) {
          await setDoc(doc(db, 'publicGantts', p.shareSlug), {
            ownerUid: uid,
            projectId: id,
            name: p.name,
            sub: p.sub,
            author: p.author,
            tasks: body.tasks,
            calendar: p.calendar,
            view: p.view,
            updatedAt: body.updatedAt,
          });
        }
        lastSavedJson.current = JSON.stringify(toDocComparable(p));
        if (version === editVersion.current) {
          dirtyRef.current = false;
          setSaveState('saved');
          setSavedAt(Date.now());
        }
      } catch (e) {
        console.error('[工程表] 保存できませんでした', e);
        setSaveState('error');
      }
    },
    [uid]
  );

  useEffect(() => {
    if (!uid || !currentId || !dirtyRef.current) return;
    const t = window.setTimeout(() => persist(currentId, data), 1200);
    return () => window.clearTimeout(t);
  }, [data, currentId, uid, persist]);

  // 閉じる前に未保存を送る
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const requireLogin = (): boolean => {
    if (uid) return true;
    alert('入力するには会員登録（無料）が必要です。');
    return false;
  };

  /** 工程表が無い状態で手を入れたら、その場で 1 つ作る */
  const ensureProject = (): string => {
    if (currentId) return currentId;
    const id = String(Date.now());
    setCurrentId(id);
    try {
      localStorage.setItem('ganttLastProject', id);
    } catch {}
    return id;
  };

  const patch = (p: Partial<ProjectData>) => {
    if (!requireLogin()) return;
    ensureProject();
    dirtyRef.current = true;
    editVersion.current++;
    setSaveState('dirty');
    setData((d) => ({ ...d, ...p, name: p.name ?? (d.name || '無題の工程表') }));
  };

  /** 工程を変える（元に戻せる）。押し出しが有効なら前工程に合わせて後ろをずらす */
  const commit = (next: GanttTask[], note?: string) => {
    if (!requireLogin()) return;
    if (next.length > MAX_TASKS) {
      alert(`工程は ${MAX_TASKS} 行までです。`);
      return;
    }
    let out = next.map((t, i) => ({ ...t, order: i + 1 }));
    let msg = note ?? '';
    if (view.autoPush) {
      const r = cascade(out, cal, holidays);
      out = r.tasks;
      if (r.moved.length) msg = `${msg ? msg + '。' : ''}前工程に合わせて ${r.moved.length} 件を後ろへ押し出しました`;
    }
    setPast((p) => [...p.slice(-59), tasks]);
    setFuture([]);
    patch({ tasks: out });
    if (msg) say(msg);
  };

  const undo = () => {
    if (!past.length) return;
    setFuture((f) => [tasks, ...f]);
    setPast((p) => p.slice(0, -1));
    patch({ tasks: past[past.length - 1] });
  };
  const redo = () => {
    if (!future.length) return;
    setPast((p) => [...p, tasks]);
    setFuture((f) => f.slice(1));
    patch({ tasks: future[0] });
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ------------------------------------------------------------------ 工程表（プロジェクト）の切り替え
  const flush = () => {
    if (uid && currentId && dirtyRef.current) void persist(currentId, data);
  };

  function openProject(id: string) {
    flush();
    const row = projects.find((p) => p.id === id);
    if (!row) return;
    const { id: _id, ...rest } = row;
    void _id;
    lastSavedJson.current = JSON.stringify(toDocComparable(rest));
    dirtyRef.current = false;
    setCurrentId(id);
    setData(rest);
    setPast([]);
    setFuture([]);
    setChecked(new Set());
    setSelectedId(null);
    setSaveState('idle');
    try {
      localStorage.setItem('ganttLastProject', id);
    } catch {}
  }

  const createProject = (p: ProjectData) => {
    if (!requireLogin()) return;
    flush();
    const id = String(Date.now());
    setCurrentId(id);
    setData(p);
    setPast([]);
    setFuture([]);
    setChecked(new Set());
    dirtyRef.current = true;
    setSaveState('dirty');
    void persist(id, p);
    try {
      localStorage.setItem('ganttLastProject', id);
    } catch {}
  };

  const newProject = () => {
    if (!requireLogin()) return;
    const name = window.prompt('新しい工程表の名前（物件名・工事名など）');
    if (!name?.trim()) return;
    createProject({ ...emptyProject(name.trim()), calendar: cal, view: { ...view, displayStart: '' }, author: data.author });
    setTab('template');
    say('空の工程表を作りました。テンプレートから並べるか、工程リストで行を足してください');
  };

  const duplicateProject = () => {
    if (!requireLogin()) return;
    createProject({ ...data, name: `${data.name || '工程表'}（コピー）`, shareSlug: '' });
    say('複製しました（閲覧リンクは引き継ぎません）');
  };

  const renameProject = () => {
    if (!requireLogin()) return;
    const name = window.prompt('工程表の名前', data.name);
    if (name?.trim() && name.trim() !== data.name) patch({ name: name.trim() });
  };

  const removeProject = async () => {
    if (!uid || !currentId) return;
    if (!window.confirm(`「${data.name}」を削除します。元に戻せません。よろしいですか？`)) return;
    const id = currentId;
    const slug = data.shareSlug;
    dirtyRef.current = false;
    // 一覧から先に外す（外さないと「最後に開いていた工程表を開く」が消したものを開き直す）
    setProjects((ps) => ps.filter((p) => p.id !== id));
    setCurrentId(null);
    setData(emptyProject());
    setPast([]);
    setFuture([]);
    try {
      localStorage.removeItem('ganttLastProject');
    } catch {}
    try {
      await deleteDoc(doc(db, 'users', uid, 'ganttProjects', id));
      if (slug) await deleteDoc(doc(db, 'publicGantts', slug));
    } catch (e) {
      console.error(e);
      alert('削除できませんでした。通信を確かめてください。');
    }
  };

  // ------------------------------------------------------------------ 工程の操作
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const nextId = () => Math.max(Date.now(), ...tasks.map((t) => t.id + 1));

  const updateTask = (id: number, p: Partial<GanttTask>) => {
    const t = byId.get(id);
    if (!t) return;
    const n: GanttTask = { ...t, ...p };
    const k = kindOf(n);
    if (k === 'group') {
      n.after = null;
    } else if ('start' in p && p.start && isDate(p.start) && k === 'task') {
      // 開始を動かしたら日数（稼働日）を保って終了も動かす
      const dur = workdaysBetween(t.start, t.end, cal, holidays);
      n.end = addWorkdays(p.start, dur, cal, holidays);
    } else if ('end' in p && p.end && n.end < n.start) {
      n.start = n.end;
    }
    if (k === 'milestone') n.end = n.start;
    if (p.kind && p.kind !== 'group' && kindOf(t) === 'group') {
      // 大項目から工程に変えたら、中身の期間を入れておく
      const span = groupSpan(tasks, id);
      n.start = span?.start ?? iso(new Date());
      n.end = k === 'milestone' ? n.start : span?.end ?? n.start;
    }
    let next = tasks.map((x) => (x.id === id ? n : x));
    if (k === 'group') next = next.map((x) => (x.after === id ? { ...x, after: null } : x));
    commit(next);
  };

  const setDays = (id: number, days: number) => {
    const t = byId.get(id);
    if (!t) return;
    commit(tasks.map((x) => (x.id === id ? { ...x, end: addWorkdays(x.start, Math.max(1, days), cal, holidays) } : x)));
  };

  const setAfter = (id: number, after: number | null) => {
    if (after != null && !canLink(tasks, id, after)) {
      alert('その工程は前工程にできません（自分自身・大項目・ぐるりと戻るつなぎ）。');
      return;
    }
    commit(tasks.map((x) => (x.id === id ? { ...x, after } : x)));
  };

  /** index の後ろに行を足す。開始は直前の工程の翌稼働日 */
  const addRow = (index: number, kind: GanttKind = 'task') => {
    if (!requireLogin()) return;
    const prev = [...tasks.slice(0, index + 1)].reverse().find((t) => kindOf(t) !== 'group' && isDate(t.end));
    const start = prev ? nextWorkday(addDays(prev.end, 1), cal, holidays) : nextWorkday(iso(new Date()), cal, holidays);
    const color = PALETTE[(tasks.filter((t) => kindOf(t) === 'task').length + 1) % PALETTE.length].color;
    const t: GanttTask = {
      id: nextId(),
      name: kind === 'group' ? '大項目' : kind === 'milestone' ? '節目' : '',
      start: kind === 'group' ? '' : start,
      end: kind === 'group' ? '' : kind === 'milestone' ? start : addWorkdays(start, 5, cal, holidays),
      color: kind === 'milestone' ? '#b24a4a' : color,
      innerText: '',
      order: 0,
      kind,
      after: null,
      lag: 0,
      progress: 0,
    };
    commit([...tasks.slice(0, index + 1), t, ...tasks.slice(index + 1)]);
    setSelectedId(t.id);
  };

  const removeRows = (ids: Set<number>) => {
    if (!ids.size) return;
    const names = tasks.filter((t) => ids.has(t.id)).map((t) => t.name || '(無題)');
    if (!window.confirm(`${names.length > 3 ? `${names.slice(0, 3).join('・')} ほか ${names.length - 3} 件` : names.join('・')} を削除しますか？（元に戻すで戻せます）`)) return;
    commit(tasks.filter((t) => !ids.has(t.id)).map((t) => (t.after != null && ids.has(t.after) ? { ...t, after: null } : t)));
    setChecked(new Set());
  };

  const moveRow = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= tasks.length) return;
    const next = [...tasks];
    [next[index], next[j]] = [next[j], next[index]];
    commit(next);
  };

  const duplicateRow = (index: number) => {
    const t = tasks[index];
    commit([...tasks.slice(0, index + 1), { ...t, id: nextId(), name: `${t.name}（複製）`.slice(0, 60) }, ...tasks.slice(index + 1)]);
  };

  const onDrag = (r: DragResult) => {
    const t = byId.get(r.id);
    if (!t || !requireLogin()) return;
    if (kindOf(t) === 'group') {
      // 大項目は中身ごと動かす
      const kids = new Set<number>();
      const i = tasks.findIndex((x) => x.id === t.id);
      for (let j = i + 1; j < tasks.length && kindOf(tasks[j]) !== 'group'; j++) kids.add(tasks[j].id);
      commit(tasks.map((x) => (kids.has(x.id) && isDate(x.start) ? { ...x, start: addDays(x.start, r.delta), end: addDays(x.end, r.delta) } : x)), `「${t.name}」を ${r.delta > 0 ? '+' : ''}${r.delta} 日動かしました`);
      return;
    }
    let { start, end } = t;
    if (r.mode === 'move' || kindOf(t) === 'milestone') {
      start = addDays(start, r.delta);
      end = kindOf(t) === 'milestone' ? start : addDays(end, r.delta);
    } else if (r.mode === 'start') start = addDays(start, r.delta) > end ? end : addDays(start, r.delta);
    else end = addDays(end, r.delta) < start ? start : addDays(end, r.delta);
    commit(tasks.map((x) => (x.id === t.id ? { ...x, start, end } : x)));
    setSelectedId(t.id);
  };

  const [shiftN, setShiftN] = useState(5);
  const shiftChecked = (dir: 1 | -1) => {
    if (!checked.size) return;
    commit(shiftTasks(tasks, checked, shiftN * dir, cal, holidays), `${checked.size} 件を ${shiftN} 稼働日${dir > 0 ? '後ろ' : '前'}へずらしました`);
  };

  const setBaseline = () => {
    if (!window.confirm('今の予定を「基準計画（当初の予定）」として残します。以後のずれが灰色の線で見えます。前の基準計画は上書きされます。')) return;
    commit(tasks.map((t) => (kindOf(t) === 'group' ? t : { ...t, baseStart: t.start, baseEnd: t.end })), '基準計画を保存しました');
  };
  const clearBaseline = () => {
    if (!window.confirm('基準計画を消しますか？')) return;
    commit(tasks.map((t) => ({ ...t, baseStart: undefined, baseEnd: undefined })), '基準計画を消しました');
  };

  // ------------------------------------------------------------------ テンプレート
  const [tplId, setTplId] = useState(TEMPLATES[0].id);
  const [tplStart, setTplStart] = useState(nextMonday);
  const tpl = TEMPLATES.find((t) => t.id === tplId)!;
  const tplPreview = useMemo(() => instantiate(tpl, tplStart || nextMonday(), cal, holidays, 1), [tpl, tplStart, cal, holidays]);
  const tplEnd = tplPreview.filter((t) => kindOf(t) !== 'group').map((t) => t.end).sort().reverse()[0];

  const applyTemplate = (mode: 'new' | 'append' | 'replace') => {
    if (!requireLogin()) return;
    if (!isDate(tplStart)) {
      alert('着手日を入れてください。');
      return;
    }
    const rows = instantiate(tpl, tplStart, cal, holidays, nextId());
    if (mode === 'new') {
      const name = window.prompt('工程表の名前', tpl.label.replace(/（.*）/, ''));
      if (!name?.trim()) return;
      createProject({ ...emptyProject(name.trim()), tasks: rows, calendar: cal, view: { ...view, displayStart: '', months: 0 }, author: data.author });
      say(`「${tpl.label}」から ${rows.length} 行を並べました。日数は目安なので物件に合わせて直してください`);
    } else if (mode === 'replace') {
      if (tasks.length && !window.confirm('今の工程を消して、テンプレートに置き換えます（元に戻すで戻せます）。')) return;
      commit(rows, `「${tpl.label}」に置き換えました`);
    } else {
      commit([...tasks, ...rows], `「${tpl.label}」の ${rows.length} 行を末尾に足しました`);
    }
    setTab('list');
  };

  // ------------------------------------------------------------------ 物件カルテ
  const [cards, setCards] = useState<{ id: string; name: string; author: string }[]>([]);
  useEffect(() => {
    if (!uid) return;
    getDocs(collection(db, 'users', uid, 'propertyCards'))
      .then((s) => setCards(s.docs.map((d) => ({ id: d.id, name: String(d.data().name ?? ''), author: String(d.data().author ?? '') })).filter((c) => c.name)))
      .catch(() => {});
  }, [uid]);
  const linkCard = (id: string) => {
    const c = cards.find((x) => x.id === id);
    patch({ propertyId: id, sub: c && !data.sub ? c.name : data.sub, author: c && !data.author ? c.author : data.author });
  };

  // ------------------------------------------------------------------ 書き出し・取り込み
  const fileBase = (data.name || '工程表').slice(0, 40);
  const exportCsv = () => downloadText(toCsv(tasks, cal, holidays), `${fileBase}_工程表.csv`, 'text/csv;charset=utf-8');
  const exportIcs = () => downloadText(toIcs(tasks, data.name, currentId ?? 'sample'), `${fileBase}_工程表.ics`, 'text/calendar;charset=utf-8');
  const csvInput = useRef<HTMLInputElement>(null);
  const [csvMode, setCsvMode] = useState<'replace' | 'append'>('replace');
  const importCsv = async (file: File) => {
    if (!requireLogin()) return;
    const text = await file.text();
    const r = fromCsv(text, cal, holidays, nextId());
    if (!r.tasks.length) {
      alert(`読み込める工程がありませんでした。\n${r.errors.join('\n')}`);
      return;
    }
    if (csvMode === 'replace' && tasks.length && !window.confirm(`今の ${tasks.length} 行を、CSV の ${r.tasks.length} 行に置き換えます（元に戻すで戻せます）。`)) return;
    commit(csvMode === 'replace' ? r.tasks : [...tasks, ...r.tasks], `CSV から ${r.tasks.length} 行を読み込みました${r.errors.length ? `（${r.errors.length} 行は飛ばしました）` : ''}`);
    if (r.errors.length) alert(r.errors.join('\n'));
  };

  const print = () => {
    const svgs = pagesRef.current.filter(Boolean);
    if (!svgs.length) return;
    printSvgPages(svgs, view.paper, `${data.name || '工程表'} 工程表`);
  };

  // Myカレンダー（users/{uid}/calendarEvents）へ。同じ工程表から入れた分は入れ直す
  const [calWithTasks, setCalWithTasks] = useState(false);
  const [busy, setBusy] = useState('');
  const sendToCalendar = async () => {
    if (!uid || !currentId) return requireLogin();
    const ms = tasks.filter((t) => kindOf(t) === 'milestone');
    const ts = calWithTasks ? tasks.filter((t) => kindOf(t) === 'task') : [];
    if (!ms.length && !ts.length) {
      alert('入れる節目がありません（区分を「節目」にした行がカレンダーに入ります）。');
      return;
    }
    const dayCount = ts.reduce((s, t) => s + daysBetween(t.start, t.end) + 1, 0) + ms.length;
    if (dayCount > 1500) {
      alert(`日数が多すぎます（${dayCount} 日分）。「工程も期間で入れる」を外して節目だけにしてください。`);
      return;
    }
    if (!window.confirm(`Myカレンダーに 節目 ${ms.length} 件${ts.length ? `・工程 ${ts.length} 件` : ''} を入れます。この工程表から前に入れた予定は入れ直します。`)) return;
    setBusy('calendar');
    try {
      const col = collection(db, 'users', uid, 'calendarEvents');
      const old = await getDocs(query(col, where('ganttProject', '==', currentId)));
      const writes: ((b: ReturnType<typeof writeBatch>) => void)[] = [];
      old.docs.forEach((d) => writes.push((b) => b.delete(d.ref)));
      const base = { allDay: true, startHour: '09', startMinute: '00', endHour: '18', endMinute: '00', category: '工程表', recurrenceType: 'none', ganttProject: currentId };
      for (const t of ms) {
        const ref = doc(col);
        writes.push((b) => b.set(ref, { ...base, title: `◆ ${t.name}`, date: t.start, details: `${data.name}${t.note ? `\n${t.note}` : ''}`, color: t.color, spanPart: 'single' }));
      }
      for (const t of ts) {
        const n = daysBetween(t.start, t.end);
        const group = `span-gantt-${currentId}-${t.id}`;
        for (let i = 0; i <= n; i++) {
          const ref = doc(col);
          const part = n === 0 ? 'single' : i === 0 ? 'start' : i === n ? 'end' : 'middle';
          writes.push((b) => b.set(ref, { ...base, title: t.name, date: addDays(t.start, i), details: data.name, color: t.color, spanPart: part, ...(n ? { spanGroupId: group } : {}) }));
        }
      }
      for (let i = 0; i < writes.length; i += 450) {
        const b = writeBatch(db);
        writes.slice(i, i + 450).forEach((w) => w(b));
        await b.commit();
      }
      // 種別「工程表」が無ければ作る
      const cats = await getDocs(query(collection(db, 'users', uid, 'calendarCategories'), where('name', '==', '工程表')));
      if (cats.empty) await setDoc(doc(collection(db, 'users', uid, 'calendarCategories')), { name: '工程表', color: '#52aa96' });
      say(`Myカレンダーに入れました（節目 ${ms.length} 件${ts.length ? `・工程 ${ts.length} 件` : ''}）`);
    } catch (e) {
      console.error(e);
      alert('カレンダーに入れられませんでした。通信を確かめてください。');
    } finally {
      setBusy('');
    }
  };

  // Teamタスク（boards/{id}/tasks）へ。前工程は「前のタスク」になり、遅れの波及もそのまま効く
  const [boards, setBoards] = useState<BoardDoc[]>([]);
  const [boardId, setBoardId] = useState('');
  useEffect(() => {
    if (!uid || tab !== 'export') return;
    listBoardsForUser(uid).then(setBoards).catch(() => {});
  }, [uid, tab]);
  const sendToTeam = async () => {
    if (!uid) return requireLogin();
    const rows = tasks.filter((t) => kindOf(t) !== 'group' && (checked.size ? checked.has(t.id) : true));
    if (!rows.length) return;
    const target = boardId === '__new' ? '' : boardId;
    if (!window.confirm(`${target ? `「${boards.find((b) => b.id === target)?.name}」` : `新しいプロジェクト「${data.name}」`}に ${rows.length} 件のタスクを作ります。${checked.size ? '（チェックした行だけ）' : ''}`)) return;
    setBusy('team');
    try {
      const bid = target || (await createBoard(uid, data.name || '工程表'));
      const map = new Map<number, string>();
      // 前工程が先に作られるよう、前工程のつながり順に作る
      const order: GanttTask[] = [];
      const seen = new Set<number>();
      const visit = (t: GanttTask, depth = 0) => {
        if (seen.has(t.id) || depth > rows.length) return;
        const p = t.after != null ? rows.find((r) => r.id === t.after) : undefined;
        if (p) visit(p, depth + 1);
        seen.add(t.id);
        order.push(t);
      };
      rows.forEach((t) => visit(t));
      for (const t of order) {
        const id = await addBoardTask(bid, {
          title: kindOf(t) === 'milestone' ? `◆ ${t.name}` : t.name,
          completed: (t.progress ?? 0) >= 100,
          dueDate: t.end,
          startDate: kindOf(t) === 'milestone' ? null : t.start,
          priority: 'medium',
          assigneeUid: null,
          details: `工程表「${data.name}」から${t.note ? `\n${t.note}` : ''}`,
          after: t.after != null ? map.get(t.after) ?? null : null,
        });
        map.set(t.id, id);
      }
      if (!target) setBoardId(bid);
      say(`Teamタスクに ${order.length} 件を作りました`);
    } catch (e) {
      console.error(e);
      alert('Teamタスクに送れませんでした。通信を確かめてください。');
    } finally {
      setBusy('');
    }
  };

  // ------------------------------------------------------------------ 閲覧リンク
  const shareUrl = data.shareSlug && typeof window !== 'undefined' ? `${window.location.origin}/tool/gantt/${data.shareSlug}/` : '';
  const startShare = async () => {
    if (!uid || !currentId) return requireLogin();
    const slug = newSlug();
    const next = { ...data, shareSlug: slug };
    dirtyRef.current = true;
    setData(next);
    await persist(currentId, next);
    say('閲覧リンクを作りました。保存するたびにリンク先も新しくなります');
  };
  const stopShare = async () => {
    if (!uid || !currentId || !data.shareSlug) return;
    if (!window.confirm('閲覧リンクを止めます。知っている人も見られなくなります。')) return;
    const slug = data.shareSlug;
    const next = { ...data, shareSlug: '' };
    dirtyRef.current = true;
    setData(next);
    try {
      await deleteDoc(doc(db, 'publicGantts', slug));
    } catch {}
    await persist(currentId, next);
    say('閲覧リンクを止めました');
  };

  // ------------------------------------------------------------------ 見えるもの
  const today = iso(new Date());
  const critical = useMemo(() => criticalPath(tasks, cal, holidays), [tasks, cal, holidays]);
  const behind = tasks.filter((t) => isBehind(t, today, cal, holidays));
  const real = tasks.filter((t) => kindOf(t) !== 'group' && isDate(t.start));
  const startAll = real.map((t) => t.start).sort()[0];
  const endAll = real.map((t) => t.end).sort().reverse()[0];
  const hasBaseline = tasks.some((t) => t.baseEnd);
  const baseEndAll = tasks.filter((t) => t.baseEnd).map((t) => t.baseEnd!).sort().reverse()[0];
  // 表示と休みの設定は、工程表を開いていなければその場の見え方だけ変える（設定のために工程表を作らない）
  const setView = (p: Partial<ViewSettings>) => (uid && currentId ? patch({ view: { ...view, ...p } }) : setData((d) => ({ ...d, view: { ...d.view, ...p } })));
  const setCal = (p: Partial<WorkCalendar>) => (uid && currentId ? patch({ calendar: { ...cal, ...p } }) : setData((d) => ({ ...d, calendar: { ...d.calendar, ...p } })));

  const features: { label: string; tab?: Tab; act?: () => void }[] = [
    { label: 'テンプレートから作る', tab: 'template' },
    { label: '稼働日で数える', tab: 'calendar' },
    { label: '前工程・押し出し', tab: 'list' },
    { label: 'クリティカルパス', act: () => setView({ showCritical: !view.showCritical }) },
    { label: '進捗と遅れ', act: () => setView({ showProgress: !view.showProgress }) },
    { label: '基準計画と比べる', act: () => (hasBaseline ? setView({ showBaseline: !view.showBaseline }) : setBaseline()) },
    { label: 'A3・A4 複数ページ印刷', act: print },
    { label: 'CSV・.ics 入出力', tab: 'export' },
    { label: 'カレンダー・Teamタスクへ', tab: 'export' },
    { label: '閲覧リンク', tab: 'share' },
  ];

  const inputCls = 'w-full px-1.5 py-1 text-[11px] bg-white';
  const btn = 'yy-btn';
  const mono = 'font-mono text-[10px] tracking-[0.12em] uppercase';

  return (
    <div className="yy-tool text-gray-900" id="schedule-gantt-chart-container">
      {/* できること */}
      <div className="yy-head">
        <div role="navigation" className="yy-head__features" aria-label="工程表でできること">
          {features.map((f, i) => (
            <button
              key={f.label}
              type="button"
              className={`yy-head__feature${f.tab && tab === f.tab ? ' is-active' : ''}`}
              onClick={() => (f.act ? f.act() : setTab(f.tab!))}
            >
              <span className="yy-head__no">{String(i + 1).padStart(3, '0')}</span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 工程表の選択・保存 */}
      <div className="bg-[#3b3b3b] text-[#ece9e2] px-3 py-2 flex flex-wrap items-center gap-2 text-[11px]">
        <span className={`${mono} text-[#9a978f]`}>PROJECT</span>
        <select
          value={currentId ?? ''}
          onChange={(e) => e.target.value && openProject(e.target.value)}
          className="px-2 py-1 bg-white text-gray-900 min-w-[200px] max-w-[320px]"
          disabled={!uid}
          aria-label="工程表を選ぶ"
        >
          <option value="">{uid ? (projects.length ? '工程表を選ぶ' : 'まだありません') : 'ログインすると保存できます'}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name || '(無題)'}
            </option>
          ))}
        </select>
        <button type="button" onClick={newProject} className="px-2 py-1 border border-[#8c8a85] hover:border-white">新規</button>
        <button type="button" onClick={duplicateProject} disabled={!currentId} className="px-2 py-1 border border-[#8c8a85] hover:border-white disabled:opacity-40">複製</button>
        <button type="button" onClick={renameProject} disabled={!currentId} className="px-2 py-1 border border-[#8c8a85] hover:border-white disabled:opacity-40">名前</button>
        <button type="button" onClick={removeProject} disabled={!currentId} className="px-2 py-1 border border-[#8c8a85] hover:border-red-400 hover:text-red-300 disabled:opacity-40">削除</button>
        <span className="mx-1 h-4 w-px bg-[#5a5a5a]" />
        <button type="button" onClick={undo} disabled={!past.length} title="元に戻す（Ctrl+Z）" className="px-2 py-1 border border-[#8c8a85] hover:border-white disabled:opacity-40">↶ 戻す</button>
        <button type="button" onClick={redo} disabled={!future.length} title="やり直す（Ctrl+Y）" className="px-2 py-1 border border-[#8c8a85] hover:border-white disabled:opacity-40">↷ やり直す</button>
        <span className={`ml-auto ${mono} ${saveState === 'error' ? 'text-red-300' : 'text-[#9a978f]'}`}>
          {!uid
            ? 'SAMPLE — 会員登録で編集・保存'
            : saveState === 'saving'
              ? 'SAVING…'
              : saveState === 'dirty'
                ? 'EDITED'
                : saveState === 'error'
                  ? '保存できませんでした（通信を確かめてください）'
                  : savedAt
                    ? `SAVED ${new Date(savedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`
                    : currentId
                      ? 'AUTO SAVE'
                      : ''}
        </span>
      </div>

      {/* 題（印刷に出る） */}
      <div className="border-x border-b border-[#3b3b3b] bg-[#f9fafb] px-3 py-2 grid grid-cols-1 md:grid-cols-[1.2fr_1.2fr_1fr_1fr] gap-2 items-end">
        <label className="block">
          <span className="yy-label">工程表の名前（題）</span>
          <CellText value={data.name} onCommit={(v) => patch({ name: v || '無題の工程表' })} className={inputCls} placeholder="例: 山田邸 新築工事" disabled={!uid} />
        </label>
        <label className="block">
          <span className="yy-label">題の下（物件・工事名など）</span>
          <CellText value={data.sub} onCommit={(v) => patch({ sub: v })} className={inputCls} maxLength={100} placeholder="例: 木造 2 階建 延床 120㎡" disabled={!uid} />
        </label>
        <label className="block">
          <span className="yy-label">右上（会社名・作成者）</span>
          <CellText value={data.author} onCommit={(v) => patch({ author: v })} className={inputCls} maxLength={60} placeholder="例: 〇〇設計事務所" disabled={!uid} />
        </label>
        <label className="block">
          <span className="yy-label">物件カルテと結ぶ</span>
          <select value={data.propertyId} onChange={(e) => linkCard(e.target.value)} className={inputCls} disabled={!uid}>
            <option value="">{cards.length ? '結ばない' : '物件カルテがありません'}</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>

      {/* 全体の数字 */}
      <div className="border-x border-b border-[#3b3b3b] px-3 py-2 flex flex-wrap gap-x-6 gap-y-1 text-[11px] bg-white">
        <span><span className={`${mono} text-gray-500 mr-2`}>START</span>{startAll ?? '—'}</span>
        <span><span className={`${mono} text-gray-500 mr-2`}>FINISH</span>{endAll ?? '—'}</span>
        <span>
          <span className={`${mono} text-gray-500 mr-2`}>DAYS</span>
          {startAll && endAll ? `${daysBetween(startAll, endAll) + 1} 日（稼働 ${workdaysBetween(startAll, endAll, cal, holidays)} 日）` : '—'}
        </span>
        {hasBaseline && baseEndAll && endAll && (
          <span className={endAll > baseEndAll ? 'text-[#b24a4a]' : ''}>
            <span className={`${mono} text-gray-500 mr-2`}>VS BASE</span>
            {endAll === baseEndAll ? '基準どおり' : `${endAll > baseEndAll ? '+' : ''}${daysBetween(baseEndAll, endAll)} 日（基準 ${baseEndAll}）`}
          </span>
        )}
        {behind.length > 0 && (
          <span className="text-[#b24a4a]">
            <span className={`${mono} mr-2`}>BEHIND</span>
            {behind.length} 件（{behind.slice(0, 3).map((t) => t.name).join('・')}{behind.length > 3 ? ' ほか' : ''}）
          </span>
        )}
        <span className="text-gray-500"><span className={`${mono} mr-2`}>CRITICAL</span>{critical.size} 件</span>
      </div>

      {/* パネル */}
      <div className="border-x border-b border-[#3b3b3b] bg-white">
        <div className="flex overflow-x-auto border-b border-[#3b3b3b] text-[11px]">
          {(
            [
              ['list', `工程リスト（${tasks.length}）`],
              ['template', 'テンプレート'],
              ['calendar', '稼働日'],
              ['export', '書き出し・連携'],
              ['share', '閲覧リンク'],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-4 py-2 whitespace-nowrap border-r border-[#d6d3cc] ${tab === id ? 'bg-[#3b3b3b] text-white' : 'hover:bg-gray-50'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'list' && (
          <div className="p-2">
            <div className="flex flex-wrap items-center gap-2 mb-2 text-[11px]">
              <button type="button" className={`${btn} yy-btn--primary`} onClick={() => addRow(tasks.length - 1)}>＋ 工程</button>
              <button type="button" className={btn} onClick={() => addRow(tasks.length - 1, 'milestone')}>＋ 節目 ◆</button>
              <button type="button" className={btn} onClick={() => addRow(tasks.length - 1, 'group')}>＋ 大項目</button>
              <label className="flex items-center gap-1 ml-2" title="前工程が延びたら、後ろの工程を同じ日数だけ押し出す">
                <input type="checkbox" checked={view.autoPush} onChange={(e) => setView({ autoPush: e.target.checked })} />
                前工程が延びたら後ろを押し出す
              </label>
              <span className="mx-1 h-4 w-px bg-gray-300" />
              {hasBaseline ? (
                <>
                  <button type="button" className={btn} onClick={setBaseline}>基準計画を取り直す</button>
                  <button type="button" className={btn} onClick={clearBaseline}>基準計画を消す</button>
                </>
              ) : (
                <button type="button" className={btn} onClick={setBaseline} title="今の予定を当初の予定として残す。以後のずれが見える">今の予定を基準計画にする</button>
              )}
            </div>

            {checked.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-2 px-2 py-1.5 border border-[#52aa96] bg-[#f2f8f6] text-[11px]">
                <span className="font-bold">{checked.size} 件を選択中</span>
                <CellNumber value={shiftN} onCommit={setShiftN} min={1} max={365} className="w-14 px-1 py-0.5 text-[11px]" />
                <span>稼働日</span>
                <button type="button" className={btn} onClick={() => shiftChecked(-1)}>← 前へ</button>
                <button type="button" className={btn} onClick={() => shiftChecked(1)}>後ろへ →</button>
                <button type="button" className={btn} onClick={() => setChecked(new Set(tasks.map((t) => t.id)))}>全部選ぶ</button>
                <button type="button" className={btn} onClick={() => setChecked(new Set())}>選択を外す</button>
                <button type="button" className={`${btn} yy-btn--danger ml-auto`} onClick={() => removeRows(checked)}>削除</button>
              </div>
            )}

            {tasks.length === 0 ? (
              <p className="text-[12px] text-gray-500 py-6 text-center">
                工程がありません。<button type="button" className="underline" onClick={() => setTab('template')}>テンプレートから並べる</button>か、上の「＋ 工程」で足してください。
              </p>
            ) : (
              <div className="overflow-x-auto max-h-[460px] overflow-y-auto border border-[#d6d3cc]">
                <table className="text-[11px] border-collapse w-full min-w-[1080px]">
                  <thead className="sticky top-0 z-10 bg-[#f3f1ec]">
                    <tr className="text-left text-gray-600">
                      <th className="px-1 py-1 w-6">
                        <input type="checkbox" aria-label="全部選ぶ" checked={checked.size === tasks.length && tasks.length > 0} onChange={(e) => setChecked(e.target.checked ? new Set(tasks.map((t) => t.id)) : new Set())} />
                      </th>
                      <th className="px-1 py-1 w-7 font-mono font-normal">NO</th>
                      <th className="px-1 py-1 w-[70px] font-normal">区分</th>
                      <th className="px-1 py-1 font-normal">工程名</th>
                      <th className="px-1 py-1 w-[118px] font-normal">開始</th>
                      <th className="px-1 py-1 w-[118px] font-normal">終了</th>
                      <th className="px-1 py-1 w-[52px] font-normal" title="稼働日数">日数</th>
                      <th className="px-1 py-1 w-[130px] font-normal">前工程</th>
                      <th className="px-1 py-1 w-[46px] font-normal" title="前工程が終わってから空ける稼働日数（養生など）">空け</th>
                      <th className="px-1 py-1 w-[60px] font-normal">進捗%</th>
                      <th className="px-1 py-1 w-7 font-normal">色</th>
                      <th className="px-1 py-1 w-[110px] font-normal">バー内文字</th>
                      <th className="px-1 py-1 w-[132px] font-normal" />
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t, i) => {
                      const k = kindOf(t);
                      const span = k === 'group' ? groupSpan(tasks, t.id) : null;
                      const late = isBehind(t, today, cal, holidays);
                      const crit = critical.has(t.id);
                      const slip = t.baseEnd && k !== 'group' ? daysBetween(t.baseEnd, t.end) : 0;
                      return (
                        <tr
                          key={t.id}
                          onClick={() => setSelectedId(t.id)}
                          className={`border-t border-[#ebe8e1] ${selectedId === t.id ? 'bg-[#eef6f4]' : k === 'group' ? 'bg-[#f7f6f2]' : ''}`}
                        >
                          <td className="px-1">
                            <input
                              type="checkbox"
                              aria-label={`${t.name}を選ぶ`}
                              checked={checked.has(t.id)}
                              onChange={(e) => {
                                const s = new Set(checked);
                                if (e.target.checked) s.add(t.id);
                                else s.delete(t.id);
                                setChecked(s);
                              }}
                            />
                          </td>
                          <td className="px-1 font-mono text-gray-500">
                            {String(i + 1).padStart(2, '0')}
                            {crit && k !== 'group' && <span className="block text-[8px] text-[#b24a4a]" title="クリティカルパス（延びると全体が延びる）">CP</span>}
                          </td>
                          <td className="px-1">
                            <select value={k} onChange={(e) => updateTask(t.id, { kind: e.target.value as GanttKind })} className="w-full px-0.5 py-1 text-[11px]">
                              {(['task', 'milestone', 'group'] as GanttKind[]).map((x) => (
                                <option key={x} value={x}>{KIND_LABEL[x]}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-1">
                            <div className="flex items-center gap-1">
                              <CellText value={t.name} onCommit={(v) => updateTask(t.id, { name: v })} className={`${inputCls} ${k === 'group' ? 'font-bold' : ''}`} placeholder="工程名" />
                              {late && <span className="text-[9px] text-white bg-[#b24a4a] px-1 whitespace-nowrap" title={`予定では ${plannedProgress(t, today, cal, holidays)}% 進んでいるはず`}>遅れ</span>}
                            </div>
                          </td>
                          {k === 'group' ? (
                            <td colSpan={3} className="px-2 text-gray-500 font-mono">
                              {span ? `${span.start} 〜 ${span.end}（中身から）` : '下に工程を置くと期間が決まります'}
                            </td>
                          ) : (
                            <>
                              <td className="px-1">
                                <input type="date" value={t.start} onChange={(e) => isDate(e.target.value) && updateTask(t.id, { start: e.target.value })} className={inputCls} />
                              </td>
                              <td className="px-1">
                                {k === 'milestone' ? (
                                  <span className="text-gray-400 px-1">—</span>
                                ) : (
                                  <input type="date" value={t.end} min={t.start} onChange={(e) => isDate(e.target.value) && updateTask(t.id, { end: e.target.value })} className={inputCls} />
                                )}
                              </td>
                              <td className="px-1">
                                {k === 'task' ? (
                                  <CellNumber value={workdaysBetween(t.start, t.end, cal, holidays)} onCommit={(n) => setDays(t.id, n)} min={1} max={2000} className={inputCls} />
                                ) : (
                                  <span className="text-gray-400 px-1">—</span>
                                )}
                                {slip !== 0 && <span className={`block text-[9px] font-mono ${slip > 0 ? 'text-[#b24a4a]' : 'text-[#3b6ea5]'}`} title={`基準計画の終了 ${t.baseEnd}`}>{slip > 0 ? '+' : ''}{slip}日</span>}
                              </td>
                            </>
                          )}
                          <td className="px-1">
                            {k === 'group' ? null : (
                              <select value={t.after ?? ''} onChange={(e) => setAfter(t.id, e.target.value ? Number(e.target.value) : null)} className="w-full px-0.5 py-1 text-[11px]">
                                <option value="">なし</option>
                                {tasks.map((p, j) =>
                                  p.id !== t.id && kindOf(p) !== 'group' ? (
                                    <option key={p.id} value={p.id}>
                                      {String(j + 1).padStart(2, '0')} {p.name.slice(0, 12)}
                                    </option>
                                  ) : null
                                )}
                              </select>
                            )}
                          </td>
                          <td className="px-1">{k !== 'group' && t.after != null ? <CellNumber value={t.lag ?? 0} onCommit={(n) => updateTask(t.id, { lag: n })} max={365} className={inputCls} /> : null}</td>
                          <td className="px-1">
                            {k === 'group' ? (
                              <span className="font-mono text-gray-500">{span?.progress ?? 0}</span>
                            ) : (
                              <CellNumber value={t.progress ?? 0} onCommit={(n) => updateTask(t.id, { progress: n })} max={100} className={inputCls} />
                            )}
                          </td>
                          <td className="px-1">{k !== 'group' && <ColorPick value={t.color} onChange={(c) => updateTask(t.id, { color: c })} />}</td>
                          <td className="px-1">{k !== 'group' && <CellText value={t.innerText} onCommit={(v) => updateTask(t.id, { innerText: v })} className={inputCls} maxLength={40} />}</td>
                          <td className="px-1 whitespace-nowrap text-right">
                            <button type="button" title="上へ" onClick={() => moveRow(i, -1)} disabled={i === 0} className="px-1.5 py-0.5 border border-[#d6d3cc] disabled:opacity-30">↑</button>
                            <button type="button" title="下へ" onClick={() => moveRow(i, 1)} disabled={i === tasks.length - 1} className="px-1.5 py-0.5 border border-[#d6d3cc] disabled:opacity-30">↓</button>
                            <button type="button" title="この下に工程を足す" onClick={() => addRow(i)} className="px-1.5 py-0.5 border border-[#d6d3cc]">＋</button>
                            <button type="button" title="複製" onClick={() => duplicateRow(i)} className="px-1.5 py-0.5 border border-[#d6d3cc]">⧉</button>
                            <button type="button" title="削除" onClick={() => removeRows(new Set([t.id]))} className="px-1.5 py-0.5 border border-[#d6d3cc] text-[#b24a4a]">×</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-[10px] text-gray-500 mt-1.5">
              日数は稼働日（休みは「稼働日」タブ）。開始を変えると日数を保って終了も動きます。前工程を結ぶと前の終わった翌稼働日から始まり、「空け」で養生期間などを空けられます。
              下の図のバーは掴んで動かせ、両端で伸び縮みします。Ctrl+Z で元に戻せます。
            </p>
          </div>
        )}

        {tab === 'template' && (
          <div className="p-3 grid gap-3 md:grid-cols-[300px_1fr]">
            <div className="space-y-2">
              <label className="block">
                <span className="yy-label">テンプレート</span>
                <select value={tplId} onChange={(e) => setTplId(e.target.value)} className={inputCls}>
                  {TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </label>
              <p className="text-[11px] text-gray-600">{tpl.note}</p>
              <label className="block">
                <span className="yy-label">着手日</span>
                <input type="date" value={tplStart} onChange={(e) => setTplStart(e.target.value)} className={inputCls} />
              </label>
              <p className="text-[11px]">
                <span className={`${mono} text-gray-500 mr-2`}>FINISH</span>
                {tplEnd ?? '—'}
                {tplEnd && isDate(tplStart) ? `（約 ${Math.round((daysBetween(tplStart, tplEnd) / 30.4) * 10) / 10} か月）` : ''}
              </p>
              <div className="flex flex-col gap-1.5 pt-1">
                <button type="button" className={`${btn} yy-btn--primary`} onClick={() => applyTemplate('new')}>新しい工程表として作る</button>
                <button type="button" className={btn} onClick={() => applyTemplate('append')} disabled={!currentId}>今の工程表の末尾に足す</button>
                <button type="button" className={btn} onClick={() => applyTemplate('replace')} disabled={!currentId}>今の工程表を置き換える</button>
              </div>
              <p className="text-[10px] text-gray-500">日数は小〜中規模の目安です。休みは「稼働日」タブの設定で数えます。並べたあと物件に合わせて直してください。</p>
            </div>
            <div className="border border-[#d6d3cc] max-h-[360px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <tbody>
                  {tplPreview.map((t, i) => {
                    const k = kindOf(t);
                    const p = t.after != null ? tplPreview.findIndex((x) => x.id === t.after) : -1;
                    return (
                      <tr key={t.id} className={`border-t border-[#ebe8e1] ${k === 'group' ? 'bg-[#f7f6f2] font-bold' : ''}`}>
                        <td className="px-2 py-1 font-mono text-gray-500 w-8">{String(i + 1).padStart(2, '0')}</td>
                        <td className="px-2 py-1">
                          {k === 'milestone' ? '◆ ' : ''}
                          <span style={k === 'task' ? { borderLeft: `3px solid ${t.color}`, paddingLeft: 6 } : undefined}>{t.name}</span>
                        </td>
                        <td className="px-2 py-1 font-mono text-gray-600 whitespace-nowrap">{k === 'group' ? '' : k === 'milestone' ? md(t.start) : `${md(t.start)}–${md(t.end)}`}</td>
                        <td className="px-2 py-1 font-mono text-gray-600 text-right w-14">{k === 'task' ? `${workdaysBetween(t.start, t.end, cal, holidays)}日` : ''}</td>
                        <td className="px-2 py-1 text-gray-500 w-24">{p >= 0 ? `← ${String(p + 1).padStart(2, '0')}` : ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'calendar' && (
          <div className="p-3 grid gap-4 md:grid-cols-2 text-[11px]">
            <div>
              <span className="yy-label">休みにする日</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    ['sunday', '日曜'],
                    ['saturday', '土曜（週休 2 日の現場）'],
                    ['holidays', '祝日'],
                    ['yearEnd', '年末年始（12/29〜1/3）'],
                    ['summer', 'お盆（8/13〜8/16）'],
                  ] as [keyof WorkCalendar, string][]
                ).map(([k, label]) => (
                  <label key={k} className="flex items-center gap-1.5">
                    <input type="checkbox" checked={Boolean(cal[k])} onChange={(e) => setCal({ [k]: e.target.checked } as Partial<WorkCalendar>)} disabled={!uid} />
                    {label}
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 mt-2">
                日数・押し出し・テンプレートはこの休みを飛ばして数えます。休みを変えても既に入っている日付は動きません（日数の表示が変わります）。
                祝日は内閣府の公表をもとにした一覧を使います{Object.keys(holidays).length ? '' : '（いま読み込めていません。祝日なしで数えています）'}。
              </p>
            </div>
            <div>
              <span className="yy-label">休工日（現場の都合で休む日）</span>
              <ExtraOff dates={cal.extraOff ?? []} onChange={(d) => setCal({ extraOff: d })} disabled={!uid} />
            </div>
          </div>
        )}

        {tab === 'export' && (
          <div className="p-3 grid gap-4 md:grid-cols-3 text-[11px]">
            <div className="space-y-1.5">
              <span className="yy-label">ファイル</span>
              <button type="button" className={`${btn} w-full`} onClick={print}>印刷 / PDF に保存（{view.paper} 横）</button>
              <button type="button" className={`${btn} w-full`} onClick={exportCsv} disabled={!tasks.length}>CSV に書き出す（Excel で開ける）</button>
              <button type="button" className={`${btn} w-full`} onClick={exportIcs} disabled={!tasks.length}>.ics に書き出す（Google・Outlook カレンダー）</button>
              <div className="border border-[#d6d3cc] p-2 space-y-1">
                <div className="flex gap-3">
                  <label className="flex items-center gap-1"><input type="radio" checked={csvMode === 'replace'} onChange={() => setCsvMode('replace')} />置き換え</label>
                  <label className="flex items-center gap-1"><input type="radio" checked={csvMode === 'append'} onChange={() => setCsvMode('append')} />末尾に足す</label>
                </div>
                <button type="button" className={`${btn} w-full`} onClick={() => requireLogin() && csvInput.current?.click()}>CSV を読み込む</button>
                <input ref={csvInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = ''; }} />
                <p className="text-[10px] text-gray-500">書き出した CSV を Excel で直して読み込めます。見出し「工程名」「開始」は必須、「終了」が無ければ「稼働日数」から決めます。</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <span className="yy-label">Myカレンダーへ</span>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={calWithTasks} onChange={(e) => setCalWithTasks(e.target.checked)} />
                工程も期間で入れる（入れないときは節目 ◆ だけ）
              </label>
              <button type="button" className={`${btn} w-full`} onClick={sendToCalendar} disabled={busy !== '' || !currentId}>
                {busy === 'calendar' ? '入れています…' : 'Myカレンダーに入れる'}
              </button>
              <p className="text-[10px] text-gray-500">種別「工程表」で入ります。同じ工程表から前に入れた予定は入れ直すので、工程を直したらもう一度押してください。</p>
            </div>
            <div className="space-y-1.5">
              <span className="yy-label">Teamタスクへ</span>
              <select value={boardId} onChange={(e) => setBoardId(e.target.value)} className={inputCls} disabled={!uid}>
                <option value="">送り先のプロジェクトを選ぶ</option>
                <option value="__new">＋ 新しいプロジェクト「{data.name || '工程表'}」</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <button type="button" className={`${btn} w-full`} onClick={sendToTeam} disabled={busy !== '' || !boardId || !tasks.length}>
                {busy === 'team' ? '送っています…' : checked.size ? `チェックした ${checked.size} 行を送る` : '工程を全部送る'}
              </button>
              <p className="text-[10px] text-gray-500">工程はタスク（開始・期限つき）、節目は期限だけのタスクになります。前工程は「前のタスク」として結ばれ、Teamタスクの工程表で遅れの波及が見えます。担当はTeamタスク側で付けてください。</p>
            </div>
          </div>
        )}

        {tab === 'share' && (
          <div className="p-3 text-[11px] space-y-2 max-w-[720px]">
            <p>施主・施工者・協力会社に、ログインなしで見られるリンクを渡せます（見るだけ。編集はできません）。この工程表を直すと、保存のたびにリンク先も新しくなります。</p>
            {data.shareSlug ? (
              <>
                <div className="flex gap-1">
                  <input type="text" readOnly value={shareUrl} className={`${inputCls} font-mono`} onFocus={(e) => e.target.select()} />
                  <button type="button" className={btn} onClick={() => navigator.clipboard?.writeText(shareUrl).then(() => say('リンクをコピーしました'))}>コピー</button>
                  <a href={shareUrl} target="_blank" rel="noopener noreferrer" className={`${btn} whitespace-nowrap`}>開く</a>
                </div>
                <button type="button" className={`${btn} yy-btn--danger`} onClick={stopShare}>閲覧リンクを止める</button>
              </>
            ) : (
              <button type="button" className={`${btn} yy-btn--primary`} onClick={startShare} disabled={!currentId}>閲覧リンクを作る</button>
            )}
            <p className="text-[10px] text-gray-500">リンクを知っている人は誰でも見られます。名前・題・工程・メモが見えるので、社内向けのメモは書かないでください。</p>
          </div>
        )}
      </div>

      {/* 図 */}
      <div ref={previewWrap} className="mt-4 border border-[#3b3b3b]">
        <div className="bg-[#f9fafb] border-b border-[#3b3b3b] px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
          <span className={`${mono} text-gray-500`}>PREVIEW</span>
          <label className="flex items-center gap-1">
            単位
            <select value={view.unit} onChange={(e) => setView({ unit: e.target.value as ViewSettings['unit'] })} className="px-1 py-0.5">
              <option value="day">日</option>
              <option value="week">週</option>
              <option value="month">月</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            期間
            <select value={view.months} onChange={(e) => setView({ months: Number(e.target.value) })} className="px-1 py-0.5">
              <option value={0}>全部入る長さ</option>
              {[1, 2, 3, 4, 5, 6, 9, 12, 18, 24, 36].map((m) => (
                <option key={m} value={m}>{m} か月</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            開始月
            <input type="month" value={view.displayStart.slice(0, 7)} onChange={(e) => setView({ displayStart: e.target.value ? `${e.target.value}-01` : '' })} className="px-1 py-0.5" />
          </label>
          <label className="flex items-center gap-1">
            用紙
            <select value={view.paper} onChange={(e) => setView({ paper: e.target.value as ViewSettings['paper'] })} className="px-1 py-0.5">
              <option value="A3">A3 横</option>
              <option value="A4">A4 横</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            行の高さ
            <select value={view.rowH} onChange={(e) => setView({ rowH: Number(e.target.value) })} className="px-1 py-0.5">
              {[20, 24, 26, 30, 36].map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-1">
            拡大
            <button type="button" className="px-1.5 border border-[#3b3b3b]" onClick={() => setZoom((z) => Math.max(30, z - 10))}>−</button>
            <span className="font-mono w-10 text-center">{zoom}%</span>
            <button type="button" className="px-1.5 border border-[#3b3b3b]" onClick={() => setZoom((z) => Math.min(200, z + 10))}>＋</button>
            <button type="button" className="px-1.5 border border-[#3b3b3b]" onClick={fitZoom} title="用紙の幅を画面に合わせる">幅に合わせる</button>
          </div>
          <button type="button" className={`${btn} yy-btn--primary ml-auto`} onClick={print}>印刷 / PDF</button>
        </div>
        <div className="px-3 py-1.5 border-b border-[#d6d3cc] flex flex-wrap gap-x-4 gap-y-1 text-[11px] bg-white">
          {(
            [
              ['showDateCol', '期間の列'],
              ['showStart', '開始日'],
              ['showEnd', '終了日'],
              ['showInner', 'バー内文字'],
              ['showLinks', '前工程の線'],
              ['showCritical', 'クリティカルパス'],
              ['showProgress', '進捗'],
              ['showBaseline', '基準計画'],
              ['showToday', '今日の線'],
              ['shadeOff', '休みの色'],
            ] as [keyof ViewSettings, string][]
          ).map(([k, label]) => (
            <label key={k} className="flex items-center gap-1">
              <input type="checkbox" checked={Boolean(view[k])} onChange={(e) => setView({ [k]: e.target.checked } as Partial<ViewSettings>)} />
              {label}
            </label>
          ))}
        </div>
        {tasks.length === 0 ? (
          <p className="p-8 text-center text-[12px] text-gray-500 bg-[#2b2b2b]">工程を入れるとここに工程表が出ます。</p>
        ) : (
          <GanttPreview
            tasks={tasks}
            cal={cal}
            holidays={holidays}
            view={view}
            title={data.name}
            sub={data.sub}
            author={data.author}
            updated={today.replace(/-/g, '.')}
            zoom={zoom}
            editable={!!uid}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setTab('list');
            }}
            onDrag={onDrag}
            pagesRef={pagesRef}
          />
        )}
      </div>

      {toast && (
        <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[#1f1f1f] text-[#ece9e2] text-[12px] px-4 py-2 border-l-2 border-[#52aa96] max-w-[90vw]">
          {toast}
        </div>
      )}
    </div>
  );
};

/** 保存の比較用（updatedAt を除く） */
function toDocComparable(p: ProjectData) {
  const { updatedAt: _u, ...rest } = p;
  void _u;
  return { ...rest, tasks: stripForSave(rest.tasks) };
}

function ExtraOff({ dates, onChange, disabled }: { dates: string[]; onChange: (d: string[]) => void; disabled?: boolean }) {
  const [d, setD] = useState('');
  return (
    <div>
      <div className="flex gap-1 mb-1.5">
        <input type="date" value={d} onChange={(e) => setD(e.target.value)} className="px-1.5 py-1 text-[11px]" disabled={disabled} />
        <button
          type="button"
          className="yy-btn"
          disabled={disabled || !isDate(d) || dates.includes(d)}
          onClick={() => {
            onChange([...dates, d].sort());
            setD('');
          }}
        >
          足す
        </button>
      </div>
      {dates.length === 0 ? (
        <p className="text-[10px] text-gray-500">まだありません（地域の祭り・近隣行事・資材の休業日など）</p>
      ) : (
        <ul className="flex flex-wrap gap-1">
          {dates.map((x) => (
            <li key={x} className="flex items-center gap-1 border border-[#d6d3cc] px-1.5 py-0.5 font-mono text-[10px]">
              {x}
              <button type="button" aria-label={`${x} を外す`} onClick={() => onChange(dates.filter((y) => y !== x))} disabled={disabled} className="text-[#b24a4a]">×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Schedule;
