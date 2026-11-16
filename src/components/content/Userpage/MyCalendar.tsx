'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import ToolHeader from './ToolHeader';
import { FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi';
import { parseIcs, buildIcs, type IcsEvent } from '@/lib/ics';
import DeadlineHelper, { type NewDeadline } from './calendar/DeadlineHelper';
import IcsImport, { type ImportTarget } from './calendar/IcsImport';
import { BUILDING_CATEGORIES, COLOR_PALETTE, DEADLINE_CATEGORY_NAMES, DEFAULT_CATEGORIES } from './calendar/categories';
import WeekView from './calendar/WeekView';
import { GUEST_FEEDS_KEY, GUEST_THEME_KEY, guestId, readGuestCalendar, useGuestCalendarMigration, writeGuestCalendar } from './calendar/guestCalendar';
import { useGuestTasks } from './myTasks/guestTasks';
import { readGuestBoard } from './teamTasks/guestBoard';
import GuestNote from './general-tools/GuestNote';
import { useAuth } from '@/lib/AuthContext';
import { useTaskContext } from '../../providers/TaskProvider';
import { db } from '@/lib/firebaseClient';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, writeBatch } from 'firebase/firestore';
import { addOfficeEvent, deleteOfficeEvent, subscribeOfficeEvents, updateOfficeEvent, useMyOffice, type OfficeEvent } from '@/lib/office';

// --- Types ---

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  allDay?: boolean;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
  category: string;
  details: string;
  color: string;
  recurrenceId?: string;
  recurrenceType?: 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'none';
  recurrenceUntil?: string;
  spanGroupId?: string;
  spanPart?: 'single' | 'start' | 'middle' | 'end';
  /** .ics ファイルから入れた予定の鍵（UID|開始）。同じファイルを読み直しても増やさないため */
  icsKey?: string;
  /** 前日と当日にサイト内通知を送る（functions の定期処理が見る） */
  remind?: boolean;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface IcsFeed {
  id: string;
  name: string;
  url: string;
  color: string;
}

// --- Helper Functions ---

const stripUndefined = (obj: Record<string, any>) => {
  const clean: Record<string, any> = {};
  Object.keys(obj).forEach(k => { const v = obj[k]; if (v !== undefined) clean[k] = v });
  return clean;
};

function isDarkColor(hex: string) {
  if (!/^#([0-9A-Fa-f]{6})$/.test(hex)) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) < 160;
}

// Tailwindクラス名を16進数カラーコードに変換する関数
const convertTailwindToHex = (tailwindClass: string | null | undefined): string | null => {
  if (!tailwindClass) return null;
  const colorMap: Record<string, string> = {
    'bg-red-200': '#FECACA',
    'bg-rose-200': '#FECDD3',
    'bg-pink-200': '#FBCFE8',
    'bg-orange-200': '#FED7AA',
    'bg-amber-200': '#FDE68A',
    'bg-yellow-200': '#FEF08A',
    'bg-lime-200': '#D9F99D',
    'bg-green-200': '#BBF7D0',
    'bg-emerald-200': '#A7F3D0',
    'bg-teal-200': '#99F6E4',
    'bg-cyan-200': '#A5F3FC',
    'bg-sky-200': '#BAE6FD',
    'bg-blue-200': '#BFDBFE',
    'bg-indigo-200': '#C7D2FE',
    'bg-violet-200': '#DDD6FE',
    'bg-purple-200': '#E9D5FF',
    'bg-fuchsia-200': '#F5D0FE',
  };
  return colorMap[tailwindClass] || null;
}

const formatDateForStorage = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatFullDateJP = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${days[d.getDay()]})`;
};

/** 小さな等幅の大文字ラベル（曜日・日付・件数） */
const MONO = 'yy-mono text-[10px] tracking-[0.12em] uppercase';
/** 外部カレンダー（URL 購読）の予定は id が ics- で始まる。読むだけ */
const isFeedEvent = (ev: { id: string }) => ev.id.startsWith('ics-');
/** 事務所の共有の予定（offices/{id}/events）は id が office- で始まる。メンバー全員が見る */
const OFFICE_PREFIX = 'office-';
const isOfficeEvent = (ev: { id: string }) => ev.id.startsWith(OFFICE_PREFIX);
/** 升目・週・Schedule で事務所の予定と分かるよう、題の頭に付ける印 */
const OFFICE_MARK = '［所］';
/** Firestore の 1 回の書き込みは 500 件まで。余裕を見て 400 件ずつ */
const BATCH_LIMIT = 400;
/** 繰り返しで作る回数の上限（毎日を 1 年分） */
const RECUR_MAX = 366;

type Recurrence = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';
const RECURRENCE_LABELS: [Recurrence, string][] = [
  ['none', 'しない'], ['daily', '毎日'], ['weekdays', '平日（月〜金）'], ['weekly', '毎週'], ['monthly', '毎月'],
];

/** 繰り返しの各回の日付。毎月で 31 日のように無い月は飛ばす */
const expandRecurrence = (start: Date, type: Recurrence, untilStr: string): Date[] => {
  const until = new Date(`${untilStr}T00:00:00`);
  if (type === 'none' || isNaN(until.getTime())) return [start];
  const out: Date[] = [];
  for (let i = 0; out.length < RECUR_MAX && i < 3000; i++) {
    const d = type === 'monthly'
      ? new Date(start.getFullYear(), start.getMonth() + i, start.getDate())
      : new Date(start.getFullYear(), start.getMonth(), start.getDate() + i * (type === 'weekly' ? 7 : 1));
    if (d > until) break;
    if (type === 'monthly' && d.getDate() !== start.getDate()) continue;
    if (type === 'weekdays' && (d.getDay() === 0 || d.getDay() === 6)) continue;
    out.push(d);
  }
  return out.length ? out : [start];
};

/** 日付の文字列（YYYY-MM-DD）をその日の 0 時（端末の時刻）として読む */
const parseYmd = (s: string) => new Date(`${s}T00:00:00`);

// --- Main Component ---

const MyCalendar: React.FC = () => {
  const { isLoggedIn, currentUser, authReady } = useAuth();
  // 未ログインはこのブラウザ（localStorage）に保存。ログインしたら Firestore
  const guestMode = authReady && !currentUser;
  const uid = currentUser?.uid;
  const migration = useGuestCalendarMigration(uid);
  // 月 / 週
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateForStorage(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>(() => DEFAULT_CATEGORIES.map((c, i) => ({ id: String(i + 1), ...c })));
  
  // UI State
  const [showModal, setShowModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDeadlines, setShowDeadlines] = useState(false);
  const [deadlineTab, setDeadlineTab] = useState<'permit' | 'exam'>('permit');
  // .ics ファイルの取り込み。カレンダーの上にドロップしたファイルはそのまま渡す
  const [showIcsImport, setShowIcsImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [fileDragOver, setFileDragOver] = useState(false);
  // 帯の「できること」を未ログインで押したときの一行説明
  const [notice, setNotice] = useState('');
  const categorySectionRef = useRef<HTMLDivElement>(null);
  const [showHolidays, setShowHolidays] = useState(true);
  const [holidays, setHolidays] = useState<Record<string, string>>({});
  
  // Form State
  const [eventTitle, setEventTitle] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [eventDetails, setEventDetails] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [startDateInput, setStartDateInput] = useState<string>('');
  const [endDateInput, setEndDateInput] = useState<string>('');
  const [startHour, setStartHour] = useState('09');
  const [startMinute, setStartMinute] = useState('00');
  const [endHour, setEndHour] = useState('10');
  const [endMinute, setEndMinute] = useState('00');
  const [allDay, setAllDay] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<Recurrence>('none');
  const [recurrenceUntil, setRecurrenceUntil] = useState('');
  // 繰り返しの 1 回を直すとき、以降の回にも同じ変更をかけるか
  const [applySeries, setApplySeries] = useState(false);
  const [remind, setRemind] = useState(false);
  // 外部カレンダーの予定を開いたとき、その名前（読むだけ・保存すると自分の予定として複製）
  const [readonlySource, setReadonlySource] = useState<string | null>(null);
  // 事務所の予定として入れる（新しい予定のとき）／編集中の事務所の予定の id
  const [toOffice, setToOffice] = useState(false);
  const [officeEditId, setOfficeEditId] = useState<string | null>(null);

  // 事務所（入っていれば、共有の予定を自分の予定と並べて出す）
  const myOffice = useMyOffice();
  const officeId = myOffice.office?.id ?? null;
  const [officeRaw, setOfficeRaw] = useState<OfficeEvent[]>([]);
  useEffect(() => {
    setOfficeRaw([]);
    if (!officeId) return;
    return subscribeOfficeEvents(officeId, setOfficeRaw);
  }, [officeId]);

  // Category Manager State
  const [categoryName, setCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryColor, setEditingCategoryColor] = useState('');
  
  // Theme State
  // 左の欄は紙色が既定（以前は濃紺）。色を変えたら端末に覚える
  const [leftAreaBgColor, setLeftAreaBgColor] = useState<string>('#f7f6f2');
  const [rightAreaBgColor, setRightAreaBgColor] = useState<string>('#ffffff');
  const [rightAreaFont, setRightAreaFont] = useState<string>('inherit');

  // Task Integration State
  const [showMyTasksOnCalendar, setShowMyTasksOnCalendar] = useState(true);
  const [showTeamTasksOnCalendar, setShowTeamTasksOnCalendar] = useState(true);
  const [teamTasks, setTeamTasks] = useState<any[]>([]);
  // Myタスクの期日。未ログインならこのブラウザの Myタスク（yy-guest-mytasks）を重ねる
  const cloudTaskCtx = useTaskContext();
  const guestTaskCtx = useGuestTasks();
  const { categories: taskCategories, toggleTaskComplete } = guestMode ? guestTaskCtx : cloudTaskCtx;

  // External Calendar State
  const [icsFeeds, setIcsFeeds] = useState<IcsFeed[]>([]);
  // 外部カレンダーから読んだ予定（読み取り専用）と、フィードごとの失敗理由
  const [icsEvents, setIcsEvents] = useState<CalendarEvent[]>([]);
  // 事務所の予定を画面用の形に。題の頭に［所］を付けて、自分の予定と見分ける
  const officeEvents = useMemo<CalendarEvent[]>(() => officeRaw.map((o) => ({
    id: `${OFFICE_PREFIX}${o.id}`,
    title: `${OFFICE_MARK}${o.title}`,
    date: o.date,
    allDay: !!o.allDay,
    startHour: o.startHour || '09', startMinute: o.startMinute || '00',
    endHour: o.endHour || '10', endMinute: o.endMinute || '00',
    category: o.category || '',
    details: o.details || '',
    color: o.color || '#52AA96',
    spanPart: 'single' as const,
  })), [officeRaw]);
  // 自分の予定以外に重ねるもの（外部カレンダー・事務所）。どちらもドラッグでは動かさない
  const sideEvents = useMemo(() => [...icsEvents, ...officeEvents], [icsEvents, officeEvents]);
  const [icsErrors, setIcsErrors] = useState<Record<string, string>>({});
  const [icsLoading, setIcsLoading] = useState(false);
  const [newIcsName, setNewIcsName] = useState('');
  const [newIcsUrl, setNewIcsUrl] = useState('');

  // Drag & Drop Refs
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  
  // 編集中のカテゴリー情報を保持するRef
  const editingCategoryRef = useRef<{ id: string | null; color: string }>({ id: null, color: '' });
  
  // Teamタスク購読管理用のRef
  const teamTasksUnsubsRef = useRef<Record<string, () => void>>({});
  const teamTasksByBoardRef = useRef<Record<string, any[]>>({});
  const boardsInfoRef = useRef<Record<string, any>>({}); // ボード情報（色など）を保存
  
  useEffect(() => {
    editingCategoryRef.current = { id: editingCategoryId, color: editingCategoryColor };
  }, [editingCategoryId, editingCategoryColor]);

  // --- Effects ---

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const response = await fetch('https://holidays-jp.github.io/api/v1/date.json');
        if (response.ok) setHolidays(await response.json());
    } catch {}
    };
    fetchHolidays();
    const savedShowHolidays = localStorage.getItem('calendarShowHolidays');
    if (savedShowHolidays !== null) setShowHolidays(savedShowHolidays === 'true');
  }, []);

  // 端末に覚える設定（色・外部カレンダーの URL）の置き場。未ログインは yy-guest-…
  const themeKey = uid ? `calendarTheme:${uid}` : GUEST_THEME_KEY;
  const feedsKey = uid ? `calendarIcs:${uid}` : GUEST_FEEDS_KEY;

  useEffect(() => {
    if (!authReady) return;
    try {
      const theme = JSON.parse(localStorage.getItem(themeKey) || 'null');
      if (theme) {
        if (theme.left) setLeftAreaBgColor(theme.left);
        if (theme.right) setRightAreaBgColor(theme.right);
        if (theme.font) setRightAreaFont(theme.font);
      }
    } catch {}
  }, [authReady, themeKey]);

  /** 色を変えたら覚える（以前は読むだけで保存しておらず、開き直すと戻っていた） */
  const saveTheme = (left: string, right: string) => {
    setLeftAreaBgColor(left);
    setRightAreaBgColor(right);
    try {
      localStorage.setItem(themeKey, JSON.stringify({ left, right, font: rightAreaFont }));
    } catch {}
  };

  // 未ログイン: このブラウザの予定と種別を読み、書き換えたら保存する（読み終わってから）
  const [guestLoaded, setGuestLoaded] = useState(false);
  useEffect(() => {
    if (!guestMode) return;
    const saved = readGuestCalendar();
    setEvents((saved?.events as unknown as CalendarEvent[]) ?? []);
    setCategories(saved?.categories.length
      ? (saved.categories as unknown as Category[])
      : DEFAULT_CATEGORIES.map((c, i) => ({ id: String(i + 1), ...c })));
    setGuestLoaded(true);
    return () => setGuestLoaded(false);
  }, [guestMode]);
  useEffect(() => {
    if (!guestMode || !guestLoaded) return;
    writeGuestCalendar({ events: events as unknown as { id: string }[], categories: categories as unknown as { id: string }[] });
  }, [guestMode, guestLoaded, events, categories]);

  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;
    const colRef = collection(db, 'users', currentUser.uid, 'calendarCategories');
    const unsub = onSnapshot(colRef, (snap) => {
      if (!snap.empty) {
        const updatedCategories = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        const editingInfo = editingCategoryRef.current;
        const finalCategories = updatedCategories.map(c => {
          if (editingInfo.id && c.id === editingInfo.id && editingInfo.color) {
            return { ...c, color: editingInfo.color };
          }
          return c;
        });
        setCategories(finalCategories);
      } else {
        DEFAULT_CATEGORIES.forEach(c => addDoc(colRef, c));
      }
    });
    return () => unsub();
  }, [isLoggedIn, currentUser]);

  useEffect(() => {
    if (!isLoggedIn || !currentUser) return; // 未ログインは上の「このブラウザ」の読み込みが入れる
    const colRef = collection(db, 'users', currentUser.uid, 'calendarEvents');
    const unsub = onSnapshot(colRef, (snap) => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [isLoggedIn, currentUser]);

  useEffect(() => {
    if (!isLoggedIn || !currentUser) {
      // 未ログインは、このブラウザの自分用ボード（Teamタスク）の期限を重ねる
      const g = guestMode ? readGuestBoard() : null;
      setTeamTasks(g ? g.projects.flatMap((p) => (g.tasks[p.id] || []).filter((t) => t.dueDate).map((t) => ({
        id: t.id,
        title: t.title,
        date: t.dueDate,
        completed: !!t.completed,
        color: p.color?.startsWith('#') ? p.color : (convertTailwindToHex(p.color) ?? '#6B7280'),
        isTeamTask: true,
        categoryId: p.id,
      }))) : []);
      return;
    }

    // オーナーとメンバーの両方のボードを取得
    const ownerQ = query(collection(db, 'boards'), where('ownerUid', '==', currentUser.uid));
    const memberQ = query(collection(db, 'boards'), where('memberUids', 'array-contains', currentUser.uid));

    let ownerBoards: any[] = [];
    let memberBoards: any[] = [];

    const handleBoards = () => {
      // マージして重複を除去
      const map: Record<string, any> = {};
      [...ownerBoards, ...memberBoards].forEach((b) => {
        map[b.id] = b;
      });
      const merged = Object.values(map);

      // 現在のボードIDセット
      const currentBoardIds = new Set(merged.map((b: any) => b.id));

      // 不要な購読を解除
      Object.keys(teamTasksUnsubsRef.current).forEach((boardId) => {
        if (!currentBoardIds.has(boardId)) {
          try {
            teamTasksUnsubsRef.current[boardId]?.();
          } catch {}
          delete teamTasksUnsubsRef.current[boardId];
          delete teamTasksByBoardRef.current[boardId];
          delete boardsInfoRef.current[boardId];
        }
      });

      // ボード情報を保存
      merged.forEach((board: any) => {
        boardsInfoRef.current[board.id] = board;
      });

      // 各ボードのタスクをリアルタイム購読
      merged.forEach((board: any) => {
        const boardId = board.id;
        if (!teamTasksUnsubsRef.current[boardId]) {
          const tasksRef = collection(db, 'boards', boardId, 'tasks');
          teamTasksUnsubsRef.current[boardId] = onSnapshot(
            tasksRef,
            (tasksSnap) => {
              // 最新のボード情報を取得
              const currentBoard = boardsInfoRef.current[boardId] || board;
              
              const tasks = tasksSnap.docs
                .map((taskDoc) => {
          const task = taskDoc.data();
                  const date = task.dueDate;
                  if (!date) return null; // dueDateがないタスクはスキップ
                  
                  // ボードの色を取得（16進数カラーコードまたはTailwindクラス名から変換）
                  let taskColor = '#6B7280'; // デフォルトはグレー
                  if (currentBoard.color) {
                    if (currentBoard.color.startsWith('#')) {
                      taskColor = currentBoard.color;
                    } else {
                      // Tailwindクラス名の場合は16進数に変換
                      const converted = convertTailwindToHex(currentBoard.color);
                      if (converted) {
                        taskColor = converted;
                      }
                      // 変換できない場合はデフォルトのグレーのまま
                    }
                  }
                  
                  return {
              id: taskDoc.id,
                title: task.title,
              date: date, 
                    completed: task.completed || false,
                    color: taskColor,
              isTeamTask: true,
                    categoryId: boardId,
                  };
                })
                .filter((t): t is NonNullable<typeof t> => t !== null);

              // このボードのタスクを保存
              teamTasksByBoardRef.current[boardId] = tasks;

              // 全ボードのタスクを集約して更新
              const allTasks = Object.values(teamTasksByBoardRef.current).flat();
              setTeamTasks(allTasks);
            },
            (err) => {
              console.error(`Team tasks(${boardId}) watch error:`, err);
            }
          );
        }
      });
    };

    const unsubOwner = onSnapshot(
      ownerQ,
      (snap) => {
        ownerBoards = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        handleBoards();
      },
      (err) => {
        console.error('boards(owner) watch error:', err);
      }
    );

    const unsubMember = onSnapshot(
      memberQ,
      (snap) => {
        memberBoards = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        handleBoards();
      },
      (err) => {
        console.error('boards(member) watch error:', err);
      }
    );

    return () => {
      unsubOwner();
      unsubMember();
      // すべてのタスク購読を解除
      Object.values(teamTasksUnsubsRef.current).forEach((unsub) => {
        try {
          unsub();
        } catch {}
      });
      teamTasksUnsubsRef.current = {};
      teamTasksByBoardRef.current = {};
      boardsInfoRef.current = {};
    };
  }, [isLoggedIn, currentUser, guestMode]);

  useEffect(() => {
    if (!authReady) return;
    try {
      const saved = localStorage.getItem(feedsKey);
      setIcsFeeds(saved ? JSON.parse(saved) : []);
    } catch { setIcsFeeds([]); }
  }, [authReady, feedsKey]);

  // --- Logic ---

  const isHoliday = (dateStr: string): string | null => {
    const name = holidays[dateStr];
    return name ? (name.includes('振替休日') ? '振替休日' : name) : null;
  };

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    // 外部カレンダーの予定も同じ日付の箱に入れる。読むだけなので
    // 編集・削除・ドラッグの対象にはしない（id を ics- で始めて見分ける）。
    [...events, ...sideEvents].forEach((event) => {
      const list = map.get(event.date) || [];
      list.push(event);
      map.set(event.date, list);
    });
    return map;
  }, [events, sideEvents]);

  const getEventsForDate = (date: Date) => eventsByDate.get(formatDateForStorage(date)) || [];

  const getTasksForDate = (date: Date) => {
    const dateString = formatDateForStorage(date);
    let tasks: any[] = [];
    if (showMyTasksOnCalendar) {
      taskCategories.forEach(cat => {
        cat.tasks.forEach(t => { 
          const tDate = t.dueDate;
          // Myタスクは本文が content。以前は title しか見ておらず、升目に空の行が出ていた
          if (tDate === dateString) tasks.push({ ...t, title: t.content, categoryName: cat.title, color: '#5B6B73', isTeamTask: false, categoryId: cat.id })
        });
      });
    }
    if (showTeamTasksOnCalendar) {
      const team = teamTasks.filter(t => t.date === dateString);
      tasks = [...tasks, ...team];
    }
    return tasks;
  };

  const dailySlots = useMemo(() => {
    const slots: Record<string, (CalendarEvent | null)[]> = {};
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay()); 
    const endDate = new Date(lastDayOfMonth);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    // 外部カレンダー（URL 購読）の予定も升目に出す。以前は左の「Schedule」にしか出ず、
    // 購読しても月の表には何も出なかった
    const relevantEvents = [...events, ...sideEvents].filter(e => {
        const d = new Date(`${e.date}T00:00:00`);
        return d >= startDate && d <= endDate;
    });

    const groupedEvents: { id: string, events: CalendarEvent[] }[] = [];
    const processedIds = new Set<string>();

    relevantEvents.forEach(e => {
        if(processedIds.has(e.id)) return;
        if(e.spanGroupId) {
            const group = events.filter(ev => ev.spanGroupId === e.spanGroupId).sort((a,b) => a.date.localeCompare(b.date));
            group.forEach(g => processedIds.add(g.id));
            groupedEvents.push({ id: e.spanGroupId, events: group });
        } else {
            groupedEvents.push({ id: e.id, events: [e] });
            processedIds.add(e.id);
        }
    });

    groupedEvents.sort((a, b) => {
        const startA = a.events[0].date;
        const startB = b.events[0].date;
        if(startA !== startB) return startA.localeCompare(startB);
        return b.events.length - a.events.length;
    });

    const dayOccupancy: Record<string, boolean[]> = {}; 
    const getOccupancy = (date: string) => {
        if(!dayOccupancy[date]) dayOccupancy[date] = [];
        return dayOccupancy[date];
    };

    groupedEvents.forEach(group => {
        let slotIndex = 0;
        while(true) {
            let isAvailable = true;
            for(const ev of group.events) {
                const occ = getOccupancy(ev.date);
                if(occ[slotIndex]) { isAvailable = false; break; }
            }
            if(isAvailable) break;
            slotIndex++;
        }
        group.events.forEach(ev => {
            const occ = getOccupancy(ev.date);
            occ[slotIndex] = true;
            if(!slots[ev.date]) slots[ev.date] = [];
            while(slots[ev.date].length <= slotIndex) slots[ev.date].push(null);
            slots[ev.date][slotIndex] = ev;
        });
    });
    return slots;
  }, [events, sideEvents, currentDate]);

  // --- Actions ---

  /** 新しい予定・取り込んだ予定の id。ログイン中は Firestore の自動 id、未ログインは g で始まる id */
  const newEventId = () => (uid ? doc(collection(db, 'users', uid, 'calendarEvents')).id : guestId());
  const eventRef = (id: string) => doc(db, 'users', uid!, 'calendarEvents', id);

  /**
   * 予定の書き込みをまとめて行う。画面（状態）を先に直し、ログイン中なら Firestore にも書く。
   * 未ログインは状態の変化を上の effect がこのブラウザに保存する。
   */
  const commitEvents = async ({ set = [], del = [], update = [] }: {
    set?: CalendarEvent[];
    del?: string[];
    update?: { id: string; patch: Partial<CalendarEvent> }[];
  }) => {
    const delSet = new Set(del);
    const patches = new Map(update.map((u) => [u.id, u.patch]));
    const setIds = new Set(set.map((e) => e.id));
    setEvents((prev) => [
      ...prev
        .filter((e) => !delSet.has(e.id) && !setIds.has(e.id))
        .map((e) => (patches.has(e.id) ? { ...e, ...patches.get(e.id) } : e)),
      ...set,
    ]);
    if (!uid) return;
    type Write = { kind: 'del'; id: string } | { kind: 'set'; ev: CalendarEvent } | { kind: 'upd'; id: string; patch: Partial<CalendarEvent> };
    const writes: Write[] = [
      ...del.map((id) => ({ kind: 'del' as const, id })),
      ...set.map((ev) => ({ kind: 'set' as const, ev })),
      ...update.map((u) => ({ kind: 'upd' as const, id: u.id, patch: u.patch })),
    ];
    for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      writes.slice(i, i + BATCH_LIMIT).forEach((w) => {
        if (w.kind === 'del') batch.delete(eventRef(w.id));
        else if (w.kind === 'set') { const { id, ...rest } = w.ev; batch.set(eventRef(id), stripUndefined(rest)); }
        else batch.update(eventRef(w.id), stripUndefined(w.patch));
      });
      await batch.commit();
    }
  };

  const openModal = (clickedDate?: Date) => {
    const base = clickedDate ? formatDateForStorage(clickedDate) : selectedDate;
    setStartDateInput(base); setEndDateInput(base);
    setEventTitle(''); setEventCategory(''); setEventDetails(''); setEditingEventId(null);
    setStartHour('09'); setStartMinute('00'); setEndHour('10'); setEndMinute('00'); setAllDay(false);
    setRemind(false); setReadonlySource(null);
    setToOffice(false); setOfficeEditId(null);
    // 繰り返しは既定で「しない」。終わりの日は 3 か月先を入れておく
    const until = parseYmd(base);
    until.setMonth(until.getMonth() + 3);
    setRecurrenceType('none'); setRecurrenceUntil(formatDateForStorage(until)); setApplySeries(false);
    if(categories.length > 0) setEventCategory(categories[0].name);
    setShowModal(true);
  };

  const editEvent = (event: CalendarEvent) => {
    // 事務所の予定は、元の（［所］を付けていない）中身で開き、保存すると事務所の予定を書き換える
    if (isOfficeEvent(event)) {
      const raw = officeRaw.find((o) => `${OFFICE_PREFIX}${o.id}` === event.id);
      if (!raw) return;
      setReadonlySource(null);
      setEditingEventId(null);
      setOfficeEditId(raw.id);
      setToOffice(true);
      setEventTitle(raw.title);
      setEventCategory(raw.category || '');
      setEventDetails(raw.details || '');
      setAllDay(!!raw.allDay);
      setRemind(false);
      setStartHour(raw.startHour || '09'); setStartMinute(raw.startMinute || '00');
      setEndHour(raw.endHour || '10'); setEndMinute(raw.endMinute || '00');
      setRecurrenceType('none'); setApplySeries(false);
      setStartDateInput(raw.date); setEndDateInput(raw.date);
      setShowModal(true);
      return;
    }
    setOfficeEditId(null);
    setToOffice(false);
    // 外部カレンダーの予定は書き換えられない。中身を見せて、保存したら自分の予定として複製する
    const fromFeed = isFeedEvent(event);
    setReadonlySource(fromFeed ? event.category : null);
    setEditingEventId(fromFeed ? null : event.id);
    setEventTitle(event.title);
    setEventCategory(fromFeed ? (categories[0]?.name ?? '') : event.category);
    setEventDetails(event.details);
    setAllDay(event.allDay || false);
    // remind が無い古い予定でも、期限の種別なら通知は届く（functions 側が種別でも見る）ので、そのとおりに見せる
    setRemind(event.remind ?? DEADLINE_CATEGORY_NAMES.includes(event.category));
    setStartHour(event.startHour); setStartMinute(event.startMinute);
    setEndHour(event.endHour); setEndMinute(event.endMinute);
    setRecurrenceType('none'); setApplySeries(false);
    setStartDateInput(event.date);
      if (event.spanGroupId) {
        const group = events.filter(e => e.spanGroupId === event.spanGroupId).sort((a,b) => a.date.localeCompare(b.date));
        if(group.length > 0) {
            setStartDateInput(group[0].date);
            setEndDateInput(group[group.length - 1].date);
      } else {
            setStartDateInput(event.date);
            setEndDateInput(event.date);
        }
    } else {
      setStartDateInput(event.date);
      setEndDateInput(event.date);
    }
    setShowModal(true);
  };

  /** 種別を選んだとき。期限の種別なら通知を入れておく（新しい予定のときだけ。編集中の選択は尊重する） */
  const pickCategory = (name: string) => {
    setEventCategory(name);
    if (!editingEventId && DEADLINE_CATEGORY_NAMES.includes(name)) setRemind(true);
  };

  /** 種別の色。まだ作っていない建築の種別は、その既定の色 */
  const colorOfCategory = (name: string) =>
    categories.find(c => c.name === name)?.color
    ?? BUILDING_CATEGORIES.find(c => c.name === name)?.color
    ?? '#6B7280';

  /** 事務所の予定の保存（1 日ずつ。繰り返し・通知は付けない） */
  const saveOfficeEvent = async () => {
    if (!officeId || !uid) return;
    const input = {
      title: eventTitle.trim(), date: startDateInput, allDay,
      startHour, startMinute, endHour, endMinute,
      category: eventCategory, color: eventCategory ? colorOfCategory(eventCategory) : '#52AA96',
      details: eventDetails,
    };
    setShowModal(false);
    try {
      if (officeEditId) await updateOfficeEvent(officeId, uid, officeEditId, input);
      else await addOfficeEvent(officeId, uid, currentUser?.username ?? '', input);
    } catch {
      setNotice('事務所の予定を保存できませんでした（事務所から外れた可能性があります）');
    }
    setOfficeEditId(null);
    setToOffice(false);
  };

  const saveEvent = async () => {
    if (!eventTitle.trim()) return;
    if (toOffice || officeEditId) { await saveOfficeEvent(); return; }
    // 建築の種別を入力欄から選んだときは、ここで初めて種別を作る
    const building = BUILDING_CATEGORIES.find(c => c.name === eventCategory);
    if (building) await ensureCategories([building]);
    const color = colorOfCategory(eventCategory);
    const start = parseYmd(startDateInput);
    const end = parseYmd(endDateInput < startDateInput ? startDateInput : endDateInput);
    const diffDays = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));

    // 編集は「消して作り直す」ので、.ics から入れた印（重複よけ・繰り返しのまとまり）を引き継ぐ
    const prev = editingEventId ? events.find(e => e.id === editingEventId) : undefined;
    // 繰り返しは新しい 1 日の予定のときだけ展開する（複数日の帯とは組み合わせない）
    const repeat: Recurrence = !prev && diffDays === 0 ? recurrenceType : 'none';
    const starts = repeat === 'none' ? [start] : expandRecurrence(start, repeat, recurrenceUntil);
    const recurrenceId = starts.length > 1 ? `rec-${newEventId()}` : prev?.recurrenceId;
    const fields = {
      title: eventTitle.trim(), allDay, startHour, startMinute, endHour, endMinute,
      category: eventCategory, details: eventDetails, color, remind,
    };
    const basePayload = {
      ...fields,
      recurrenceType: prev ? (prev.recurrenceType ?? 'none') : (starts.length > 1 ? repeat : 'none'),
      recurrenceUntil: prev ? prev.recurrenceUntil : (starts.length > 1 ? recurrenceUntil : undefined),
      icsKey: prev?.icsKey, recurrenceId,
    };

    const del = !prev ? [] : prev.spanGroupId
      ? events.filter(e => e.spanGroupId === prev.spanGroupId).map(e => e.id)
      : [prev.id];

    const set: CalendarEvent[] = [];
    for (const s0 of starts) {
      // まとまりの id は Firestore の自動 id を借りる（重ならない）
      const spanGroupId = diffDays > 0 ? `span-${newEventId()}` : undefined;
      for (let i = 0; i <= diffDays; i++) {
        const d = new Date(s0);
        d.setDate(s0.getDate() + i);
        const spanPart = diffDays === 0 ? 'single' : (i === 0 ? 'start' : (i === diffDays ? 'end' : 'middle'));
        set.push({ ...basePayload, id: newEventId(), date: formatDateForStorage(d), spanGroupId, spanPart } as CalendarEvent);
      }
    }

    // 繰り返しの 1 回を直したとき、以降の回にも同じ中身（題名・時刻・種別・詳細・通知）をかける
    const update = prev?.recurrenceId && applySeries
      ? events
          .filter(e => e.recurrenceId === prev.recurrenceId && e.id !== prev.id && e.date > prev.date)
          .map(e => ({ id: e.id, patch: fields }))
      : [];

    setShowModal(false);
    setReadonlySource(null);
    await commitEvents({ set, del, update });
  };

  /** カテゴリが無ければ作る（期限の書き込み・建築の種別の追加で使う） */
  const ensureCategories = async (wanted: { name: string; color: string }[]) => {
    const missing = wanted.filter((w) => !categories.some((c) => c.name === w.name));
    if (!missing.length) return;
    if (!uid) {
      setCategories((prev) => [...prev, ...missing.filter((m) => !prev.some((c) => c.name === m.name)).map((m) => ({ id: guestId(), name: m.name, color: m.color }))]);
      return;
    }
    await Promise.all(missing.map((m) => addDoc(collection(db, 'users', uid, 'calendarCategories'), m)));
  };

  /**
   * 期限を終日の予定としてまとめて入れる。
   * remind: true を付けると、functions の定期処理が前日と当日にサイト内通知を送る（ログイン中）。
   */
  const addDeadlines = async (items: NewDeadline[]) => {
    await ensureCategories(items.map((i) => ({ name: i.category, color: i.color })).filter((c, i, arr) => arr.findIndex((x) => x.name === c.name) === i));
    const set: CalendarEvent[] = items.map((it) => ({
      id: newEventId(),
      title: it.title, date: it.date, allDay: true, startHour: '00', startMinute: '00', endHour: '00', endMinute: '00',
      // 種別を自分で塗り替えていれば、その色に合わせる
      category: it.category, details: it.details, color: categories.find((c) => c.name === it.category)?.color ?? it.color,
      recurrenceType: 'none' as const, spanPart: 'single' as const,
      remind: it.remind ?? true,
    }));
    await commitEvents({ set });
  };

  /** 取り込み済みの .ics の鍵（同じファイルを読み直したときに飛ばす） */
  const importedKeys = useMemo(() => new Set(events.map(e => e.icsKey).filter((k): k is string => !!k)), [events]);

  /**
   * .ics ファイルの予定を自分の予定として書き込む（未ログインはこのブラウザに保存）。
   * 複数日の終日予定（研修・休暇など）は、手で入れたときと同じ「連続した帯」にする。
   * 繰り返しは展開済みの 1 回ずつで届く。recurrenceId に UID を入れて、まとめて消せるようにする。
   */
  const importIcsEvents = async (items: IcsEvent[], target: ImportTarget, remindAll: boolean): Promise<number> => {
    await ensureCategories([target]);
    const color = categories.find(c => c.name === target.name)?.color ?? target.color;
    const set: CalendarEvent[] = [];
    items.forEach((it) => {
      if (importedKeys.has(it.key)) return;
      const details = [it.details, it.location ? `場所: ${it.location}` : ''].filter(Boolean).join('\n');
      const common = {
        title: it.title, allDay: it.allDay, startHour: it.startHour, startMinute: it.startMinute,
        endHour: it.endHour, endMinute: it.endMinute, category: target.name, details, color,
        recurrenceType: 'none' as const, icsKey: it.key,
        ...(it.recurring ? { recurrenceId: `ics:${it.uid}` } : {}),
        ...(remindAll ? { remind: true } : {}),
      };
      const s = parseYmd(it.date);
      const e = parseYmd(it.endDate);
      const days = Math.round((e.getTime() - s.getTime()) / 86400000);
      // 終日で 2〜62 日にまたがるものだけ帯にする（時刻つきは開始日に 1 件）
      if (it.allDay && days > 0 && days <= 61) {
        const spanGroupId = `span-ics-${newEventId()}`;
        for (let i = 0; i <= days; i++) {
          const d = new Date(s);
          d.setDate(s.getDate() + i);
          set.push({ ...common, id: newEventId(), date: formatDateForStorage(d), spanGroupId, spanPart: i === 0 ? 'start' : i === days ? 'end' : 'middle' });
        }
      } else {
        set.push({ ...common, id: newEventId(), date: it.date, spanPart: 'single' });
      }
    });
    await commitEvents({ set });
    return items.filter(it => !importedKeys.has(it.key)).length;
  };

  const deleteEvent = async () => {
    if (officeEditId && officeId) {
      if (!confirm('事務所の予定を削除しますか？メンバー全員のカレンダーから消えます。')) return;
      setShowModal(false);
      try {
        await deleteOfficeEvent(officeId, officeEditId);
      } catch {
        setNotice('事務所の予定を削除できるのは、入れた人とオーナーだけです');
      }
      setOfficeEditId(null);
      return;
    }
    if (!editingEventId) return;
    const target = events.find(e => e.id === editingEventId);
    if (!target) return;
    // 繰り返しは、同じ系列をまとめて消せるようにする（1 回ずつ消すのは数百回になりうる）
    const series = target.recurrenceId ? events.filter(e => e.recurrenceId === target.recurrenceId) : [];
    if (series.length > 1 && confirm(`この繰り返しの予定（${series.length} 件）をまとめて削除しますか？\n「キャンセル」でこの回だけを削除します。`)) {
      setShowModal(false);
      await commitEvents({ del: series.map(e => e.id) });
      return;
    }
    if (target.spanGroupId) {
      if (!confirm('これは連続したスケジュールの一部です。すべて削除しますか？')) return;
      setShowModal(false);
      await commitEvents({ del: events.filter(e => e.spanGroupId === target.spanGroupId).map(e => e.id) });
      return;
    }
    setShowModal(false);
    await commitEvents({ del: [target.id] });
  };

  const addCategory = async () => {
    const name = categoryName.trim();
    if (!name) return;
    const newCat = { name, color: selectedColor };
    setCategoryName('');
    if (!uid) { setCategories(prev => [...prev, { id: guestId(), ...newCat }]); return; }
    await addDoc(collection(db, 'users', uid, 'calendarCategories'), newCat);
  };

  // カテゴリーの色のみを更新（編集モードを維持）
  const updateCategoryColor = async (id: string, color: string) => {
    const oldCat = categories.find(c => c.id === id);
    if(!oldCat || oldCat.color === color) return;

    // Ref更新 (onSnapshot対策)
    editingCategoryRef.current = { id: id, color: color };

    // UI即時更新
    setEditingCategoryColor(color);
    setCategories(prev => prev.map(c => c.id === id ? { ...c, color } : c));

    try {
      if (uid) await updateDoc(doc(db, 'users', uid, 'calendarCategories', id), { color });
      // 関連イベントの色一括更新
      const targetEvents = events.filter(ev => ev.category === oldCat.name);
      if (targetEvents.length > 0) await commitEvents({ update: targetEvents.map(ev => ({ id: ev.id, patch: { color } })) });
    } catch (error) {
      console.error('Update Error:', error);
    }
  };

  // カテゴリー更新（名前変更等）
  const updateCategory = async (id: string, name: string, color: string) => {
    if (!name.trim()) return;
    const oldCat = categories.find(c => c.id === id);
    if(!oldCat) return;

    setCategories(prev => prev.map(c => c.id === id ? { ...c, name, color } : c));
    setEditingCategoryId(null);
    if (uid) await updateDoc(doc(db, 'users', uid, 'calendarCategories', id), { name, color });

    if (oldCat.name !== name || oldCat.color !== color) {
      const targetEvents = events.filter(ev => ev.category === oldCat.name);
      if (targetEvents.length > 0) await commitEvents({ update: targetEvents.map(ev => ({ id: ev.id, patch: { category: name, color } })) });
    }
  };

  const deleteCategory = async (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    if (uid) await deleteDoc(doc(db, 'users', uid, 'calendarCategories', id));
  };

  /**
   * 登録した外部カレンダーを読みに行く。
   *
   * これまで URL は保存するだけで取得していなかったので、追加しても
   * 何も起きなかった。.ics は CORS ヘッダを返さないものが多いので、
   * /api/ics 経由で取る（あちら側で宛先を絞っている）。
   * 読み込めなかったフィードは、そのフィードだけ理由を出して他は出す。
   */
  useEffect(() => {
    let cancelled = false;

    if (icsFeeds.length === 0) {
      setIcsEvents([]);
      setIcsErrors({});
      return;
    }

    (async () => {
      setIcsLoading(true);
      const collected: CalendarEvent[] = [];
      const errors: Record<string, string> = {};

      for (const feed of icsFeeds) {
        try {
          const res = await fetch(`/api/ics/?url=${encodeURIComponent(feed.url)}`);
          if (!res.ok) {
            const body = await res.json().catch(() => null);
            errors[feed.id] = body?.error || '読み込めませんでした';
            continue;
          }
          const text = await res.text();
          parseIcs(text).forEach((e) => {
            collected.push({
              // 繰り返しは 1 回ずつ同じ UID で来るので、回ごとの鍵（UID|開始）で見分ける
              id: `ics-${feed.id}-${e.key}`,
              title: e.title,
              date: e.date,
              allDay: e.allDay,
              startHour: e.startHour,
              startMinute: e.startMinute,
              endHour: e.endHour,
              endMinute: e.endMinute,
              category: feed.name,
              details: [e.details, e.location ? `場所: ${e.location}` : ''].filter(Boolean).join('\n'),
              color: feed.color,
            });
          });
        } catch {
          errors[feed.id] = '読み込めませんでした';
        }
      }

      if (cancelled) return;
      setIcsEvents(collected);
      setIcsErrors(errors);
      setIcsLoading(false);
    })();

    return () => { cancelled = true; };
  }, [icsFeeds]);

  /** 自分の予定を .ics で書き出す。Google 等にそのまま取り込める。 */
  const exportCalendarToIcs = () => {
    if (events.length === 0) {
      setNotice('書き出す予定がまだありません。');
      return;
    }
    const text = buildIcs(
      events.map((e) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        allDay: e.allDay,
        startHour: e.startHour,
        startMinute: e.startMinute,
        endHour: e.endHour,
        endMinute: e.endMinute,
        details: e.details,
        category: e.category,
      })),
      'yaneyuka Myカレンダー',
    );
    const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yaneyuka-calendar-${formatDateForStorage(new Date())}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const addIcsFeed = () => {
    const url = newIcsUrl.trim();
    if (!url) return;
    // 名前は省略できる（URL の宛先名を使う）
    let name = newIcsName.trim();
    if (!name) { try { name = new URL(url).hostname; } catch { name = '外部カレンダー'; } }
    const newFeed = { id: `ics-${Date.now()}`, name, url, color: '#6B7280' };
    const updated = [...icsFeeds, newFeed];
    setIcsFeeds(updated);
    try { localStorage.setItem(feedsKey, JSON.stringify(updated)); } catch {}
    setNewIcsName(''); setNewIcsUrl('');
  };

  const removeIcsFeed = (id: string) => {
    const updated = icsFeeds.filter(f => f.id !== id);
    setIcsFeeds(updated);
    try { localStorage.setItem(feedsKey, JSON.stringify(updated)); } catch {}
  };

  const onDragStartEvent = (ev: React.DragEvent, event: CalendarEvent) => {
    if (isFeedEvent(event) || isOfficeEvent(event)) { ev.preventDefault(); return; }
    setDraggingEventId(event.id);
    const group = event.spanGroupId ? events.filter(e => e.spanGroupId === event.spanGroupId) : [event];
    const cellElement = (ev.target as HTMLElement).closest('.calendar-cell');
    const cellWidth = cellElement ? cellElement.getBoundingClientRect().width : 100;
    
    const ghost = document.createElement('div');
    ghost.textContent = event.title;
    ghost.style.width = `${cellWidth * group.length}px`;
    ghost.style.height = '20px';
    ghost.style.backgroundColor = event.color;
    ghost.style.color = 'white';
    ghost.style.borderRadius = '0';
    ghost.style.padding = '0 4px';
    ghost.style.fontSize = '10px';
    ghost.style.position = 'absolute';
    ghost.style.top = '-1000px';
    ghost.style.zIndex = '9999';
    document.body.appendChild(ghost);
    ev.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const onDragEndEvent = () => { setDraggingEventId(null); setDragOverDate(null); };
  const onDragOverDay = (ev: React.DragEvent, dateStr: string) => {
    ev.preventDefault();
    // ファイルを持ってきたときは日付の升目を光らせない（取り込みの枠を出す）
    if (draggingEventId && dragOverDate !== dateStr) setDragOverDate(dateStr);
  };

  /** カレンダーの上に .ics ファイルを落としたら、取り込みの画面を開く */
  const hasFiles = (ev: React.DragEvent) => Array.from(ev.dataTransfer?.types ?? []).includes('Files');
  const onFileDragOver = (ev: React.DragEvent) => {
    if (!hasFiles(ev)) return;
    ev.preventDefault();
    if (!fileDragOver) setFileDragOver(true);
  };
  const onFileDrop = (ev: React.DragEvent) => {
    if (!hasFiles(ev)) return;
    ev.preventDefault();
    setFileDragOver(false);
    const f = ev.dataTransfer.files?.[0];
    if (!f) return;
    setImportFile(f);
    setShowIcsImport(true);
  };
  
  const onDropToDay = async (ev: React.DragEvent, dateStr: string) => {
    ev.preventDefault();
    const id = draggingEventId;
    setDragOverDate(null); setDraggingEventId(null);
    if (!id) return;

    const target = events.find(e => e.id === id);
    if(!target || target.date === dateStr) return;

    const diffDays = Math.round((parseYmd(dateStr).getTime() - parseYmd(target.date).getTime()) / 86400000);
    if (diffDays === 0) return;

    // 連続した予定は帯ごと動かす
    const group = target.spanGroupId ? events.filter(e => e.spanGroupId === target.spanGroupId) : [target];
    await commitEvents({
      update: group.map(ev => {
        const d = parseYmd(ev.date);
        d.setDate(d.getDate() + diffDays);
        return { id: ev.id, patch: { date: formatDateForStorage(d) } };
      }),
    });
  };

  // --- Render ---

  const dark = isDarkColor(leftAreaBgColor);
  const rdark = isDarkColor(rightAreaBgColor);
  // 升目の線は 1px の細線。地が暗いときは白の細線
  const gridLine = rdark ? 'border-white/15' : 'border-black/10';
  const SUN = '#9A5040';
  const SAT = '#4F6D8A';
  const missingBuilding = BUILDING_CATEGORIES.filter(b => !categories.some(c => c.name === b.name));
  const monthPrefix = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-`;
  const monthCount = events.filter(e => e.date.startsWith(monthPrefix) && (!e.spanPart || e.spanPart === 'single' || e.spanPart === 'start')).length;

  // 帯の「できること」。期限・.ics はブラウザの中で完結するので未ログインでも使える（保存先がこのブラウザになるだけ）
  const features = [
    {
      label: '期限を入れる',
      hint: '着工・特定工程・完了の予定から、確認申請の提出目安と検査の申請期限を逆算して入れる。ログイン中は前日と当日に通知',
      active: showDeadlines && deadlineTab === 'permit',
      onClick: () => { setNotice(''); setDeadlineTab('permit'); setShowDeadlines(true); },
    },
    {
      label: '資格試験',
      hint: '建築士・施工管理技士などの申込締切（目安）を選んで入れる',
      active: showDeadlines && deadlineTab === 'exam',
      onClick: () => { setNotice(''); setDeadlineTab('exam'); setShowDeadlines(true); },
    },
    {
      label: '外部カレンダー連携',
      hint: 'Google カレンダー等の .ics URL を購読して重ねて表示 / 自分の予定を .ics で書き出す',
      active: showSettingsModal,
      onClick: () => { setNotice(''); setShowSettingsModal(true); },
    },
    {
      label: '.icsを読み込む',
      hint: '.ics ファイルの予定を自分の予定として取り込む（カレンダーの上にドロップしても開く）',
      active: showIcsImport,
      onClick: () => { setNotice(''); setImportFile(null); setShowIcsImport(true); },
    },
    {
      label: '種別',
      hint: '現場定例・施主打合せ・中間検査・完了検査などの種別と色',
      active: showCategoryManager,
      onClick: () => {
        setShowCategoryManager(true);
        categorySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
    },
  ];

  const selectDay = (delta: number) => {
    const d = parseYmd(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(formatDateForStorage(d));
    setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
  };
  /**
   * 前へ / 次へ。月は 1 日に寄せてから動かす（以前は 31 日に「次の月」を押すと 2 か月先へ飛んだ）。
   * 週は選んだ日を 7 日ずらす。
   */
  const step = (dir: -1 | 1) => {
    if (viewMode === 'week') { selectDay(dir * 7); return; }
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + dir, 1));
  };
  const goToday = () => {
    const t = new Date();
    setCurrentDate(new Date(t.getFullYear(), t.getMonth(), 1));
    setSelectedDate(formatDateForStorage(t));
  };
  const todayStr = formatDateForStorage(new Date());
  // 週表示の 7 日（選んだ日を含む日曜はじまり）
  const weekDays = (() => {
    const s = parseYmd(selectedDate);
    s.setDate(s.getDate() - s.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(s.getFullYear(), s.getMonth(), s.getDate() + i);
      return { date: d, dateStr: formatDateForStorage(d) };
    });
  })();
  const weekLabel = (() => {
    const a = weekDays[0].date;
    const b = weekDays[6].date;
    const p2 = (n: number) => String(n).padStart(2, '0');
    return `${a.getFullYear()}.${p2(a.getMonth() + 1)}.${p2(a.getDate())}–${p2(b.getMonth() + 1)}.${p2(b.getDate())}`;
  })();
  const selectedEvents = getEventsForDate(parseYmd(selectedDate));
  const selectedTasks = getTasksForDate(parseYmd(selectedDate));
  const fieldCls = 'w-full bg-white px-2 py-1.5 text-[12px]';

  return (
    <div className="pt-0 pb-4">
      {/* PC は画面の高さに収める。スマホ幅は縦に積んで伸ばす（高さを固定すると月の表が数十 px に潰れた） */}
      <div className="w-full md:h-[calc(100vh-var(--nav-height)-1rem)] flex flex-col [&>*:not(:first-child)]:mx-4">

        {/* Header */}
        <ToolHeader
          no="01"
          code="CALENDAR"
          title="Myカレンダー"
          description="現場定例・検査・申請の期限を月の表で。Myタスク・Teamタスクの期日も重ね、Google カレンダー等とは .ics でやりとりする"
          features={features}
          aside={<span className={`${MONO} text-[#aaa69d]`}>{String(monthCount).padStart(3, '0')} EVENTS / MONTH</span>}
        />
        {guestMode && (
          <GuestNote className="mt-2">このブラウザに保存しています。ログインすると端末間で同期し、期限の前日・当日にベルで知らせます。</GuestNote>
        )}
        {migration.message && (
          <div className="flex items-center justify-between gap-2 mt-2 text-[11px] text-gray-600 border-l border-[#52AA96] pl-2" role="status">
            <span>{migration.message}</span>
            <button type="button" onClick={migration.dismiss} aria-label="閉じる" className="text-gray-400 hover:text-gray-700"><FiX size={12} /></button>
          </div>
        )}
        {migration.pending > 0 && (
          <p className="mt-2 text-[11px] text-gray-600 border-l border-[#52AA96] pl-2" role="status">
            このブラウザに、ログイン前に入れた予定が {migration.pending} 件あります。{' '}
            <button type="button" className="underline underline-offset-2 font-bold text-gray-900" onClick={() => void migration.addNow()}>アカウントに追加</button>
            {' / '}
            <button type="button" className="underline underline-offset-2" onClick={migration.dismiss}>今はしない</button>
          </p>
        )}
        {notice && (
          <div className="flex items-center justify-between gap-2 mt-2 text-[11px] text-gray-600 border-l border-[#52AA96] pl-2">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice('')} aria-label="閉じる" className="text-gray-400 hover:text-gray-700"><FiX size={12} /></button>
          </div>
        )}
        {/* Main Card */}
        <div
          className="relative bg-white border border-[#3b3b3b] overflow-hidden flex flex-col md:flex-row flex-1 min-h-0 mt-3"
          onDragOver={onFileDragOver}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFileDragOver(false); }}
          onDrop={onFileDrop}
        >
          {fileDragOver && (
            <div className="absolute inset-0 z-[200] pointer-events-none border border-[#52AA96] bg-white/80 flex items-center justify-center">
              <span className={`${MONO} text-[#141414]`}>[ DROP .ICS TO IMPORT ]</span>
            </div>
          )}

          {/* Left Sidebar */}
          <div
            className={`order-2 md:order-1 w-full md:w-[200px] flex flex-col border-t md:border-t-0 md:border-r transition-colors duration-300 flex-shrink-0 ${dark ? 'border-white/10' : 'border-black/10'}`}
            style={{ backgroundColor: leftAreaBgColor }}
          >
            {/* Today's Schedule */}
            <div className={`p-4 border-b flex flex-col max-h-[300px] md:h-[300px] flex-shrink-0 ${dark ? 'border-white/10' : 'border-black/10'}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`${MONO} ${dark ? 'text-white/70' : 'text-gray-500'}`}>Schedule</h3>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => openModal(parseYmd(selectedDate))} className={`${MONO} underline underline-offset-2 ${dark ? 'text-white/80' : 'text-[#141414]'}`}>+ Add</button>
                  <button type="button" onClick={goToday} className={`${MONO} underline underline-offset-2 ${dark ? 'text-white/80' : 'text-[#141414]'}`}>Today</button>
                </div>
              </div>
              <div className={`flex items-center justify-between border-b pb-1 mb-2 ${dark ? 'border-white/10' : 'border-black/10'}`}>
                <button onClick={() => selectDay(-1)} aria-label="前の日" className={`w-6 h-6 flex items-center justify-center ${dark ? 'text-white/70' : 'text-gray-500'}`}><FiChevronLeft size={13} /></button>
                <div className={`text-[11px] ${dark ? 'text-white' : 'text-[#141414]'}`}>{formatFullDateJP(selectedDate)}</div>
                <button onClick={() => selectDay(1)} aria-label="次の日" className={`w-6 h-6 flex items-center justify-center ${dark ? 'text-white/70' : 'text-gray-500'}`}><FiChevronRight size={13} /></button>
              </div>
              <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {selectedEvents.length === 0 && selectedTasks.length === 0 ? (
                  <p className={`py-4 text-[11px] ${dark ? 'text-white/40' : 'text-gray-400'}`}>
                    予定はありません。<button type="button" onClick={() => openModal(parseYmd(selectedDate))} className="underline underline-offset-2">予定を入れる</button>
                  </p>
                ) : (
                  <>
                    {selectedEvents.map(ev => (
                      <div key={ev.id} className={`flex items-stretch gap-2 py-1.5 cursor-pointer border-b ${dark ? 'border-white/10 hover:bg-white/5' : 'border-black/5 hover:bg-black/[0.03]'}`} onClick={() => editEvent(ev)}>
                        <div className="w-0.5 flex-shrink-0" style={{ backgroundColor: ev.color }}></div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-[11px] font-bold truncate ${dark ? 'text-white' : 'text-[#141414]'}`}>{ev.title}</div>
                          <div className={`yy-mono text-[10px] truncate ${dark ? 'text-white/60' : 'text-gray-500'}`}>
                            {ev.allDay ? 'ALL DAY' : `${ev.startHour}:${ev.startMinute}`}
                            {ev.remind ? ' · 通知' : ''}
                            {isFeedEvent(ev) ? ` · ${ev.category}` : ''}
                            {isOfficeEvent(ev) ? ` · 事務所` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                    {selectedTasks.map((task) => (
                      <div key={task.id || task.task?.id} className={`flex items-center gap-2 py-1.5 border-b ${dark ? 'border-white/10' : 'border-black/5'}`}>
                        <input type="checkbox" checked={task.completed || task.task?.completed} disabled={task.isTeamTask} onChange={() => !task.isTeamTask && task.categoryId && toggleTaskComplete(task.categoryId, task.id || task.task?.id)} className="w-3 h-3 accent-[#3b3b3b]" />
                        <span className={`text-[11px] truncate flex-1 ${dark ? 'text-white' : 'text-gray-700'} ${(task.completed || task.task?.completed) ? 'line-through opacity-50' : ''}`}>{task.title || task.task?.title}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Categories */}
            <div ref={categorySectionRef} className="p-4 flex-1 flex flex-col overflow-hidden scroll-mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3
                  className={`${MONO} cursor-pointer ${dark ? 'text-white/70' : 'text-gray-500'}`}
                  onClick={() => setShowCategoryManager(!showCategoryManager)}
                >
                  Category
                </h3>
                <button
                  type="button"
                  className={`${MONO} underline underline-offset-2 ${dark ? 'text-white/60' : 'text-gray-500 hover:text-[#141414]'}`}
                  onClick={() => setShowCategoryManager(!showCategoryManager)}
                >
                  {showCategoryManager ? 'Done' : 'Edit'}
                </button>
              </div>

              {showCategoryManager && (
                <div className="mb-3">
                  <div className="flex gap-1 mb-2">
                    <input
                      className={`flex-1 min-w-0 border px-2 py-1 text-[11px] focus:outline-none ${dark ? 'bg-white/10 border-white/30 text-white placeholder-white/40' : 'bg-white text-[#141414] placeholder-gray-400'}`}
                      placeholder="新しい種別"
                      value={categoryName}
                      onChange={e => setCategoryName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') void addCategory(); }}
                    />
                    <button onClick={addCategory} className={`px-2 border text-[11px] ${dark ? 'border-white/30 text-white' : 'border-[#3b3b3b] text-[#141414] bg-white'}`}>追加</button>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {COLOR_PALETTE.map(c => (
                      <button key={c} onClick={() => setSelectedColor(c)} aria-label={`色 ${c}`} className={`w-3 h-3 ${selectedColor === c ? (dark ? 'outline outline-1 outline-white outline-offset-1' : 'outline outline-1 outline-[#141414] outline-offset-1') : ''}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  {missingBuilding.length > 0 && (
                    <button
                      type="button"
                      onClick={() => void ensureCategories(BUILDING_CATEGORIES)}
                      className={`w-full text-left text-[11px] underline underline-offset-2 ${dark ? 'text-white/70' : 'text-gray-600 hover:text-[#141414]'}`}
                      title={missingBuilding.map(b => b.name).join('・')}
                    >
                      建築の種別をまとめて追加（{missingBuilding.length}）
                    </button>
                  )}
                  <p className={`mt-1 text-[10px] ${dark ? 'text-white/40' : 'text-gray-400'}`}>予定の入力欄からも、建築の種別を直接選べます。</p>
                </div>
              )}

              <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {categories.map(cat => {
                  const displayColor = editingCategoryId === cat.id && editingCategoryColor
                    ? editingCategoryColor
                    : cat.color;

                  return (
                  <div key={cat.id} className={`group flex flex-col py-1 ${dark ? 'hover:bg-white/5' : 'hover:bg-black/[0.03]'}`}>
                    <div className="flex items-center gap-2">
                      {editingCategoryId === cat.id ? (
                        <div className="flex-1">
                          <input
                            autoFocus
                            className={`bg-transparent border-0 border-b w-full outline-none text-[11px] ${dark ? 'border-white/50 text-white' : 'border-[#3b3b3b] text-[#141414]'}`}
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            onBlur={() => updateCategory(cat.id, editingCategoryName, editingCategoryColor || cat.color)}
                            onKeyDown={(e) => e.key === 'Enter' && updateCategory(cat.id, editingCategoryName, editingCategoryColor || cat.color)}
                          />
                          <div className="flex flex-wrap gap-1 mt-1">
                            {COLOR_PALETTE.map(c => (
                                <div
                                    key={c}
                                    // ★重要: onMouseDownで実行し、blurをキャンセルして即座に反映させる
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      updateCategoryColor(cat.id, c);
                                    }}
                                    className={`w-3 h-3 cursor-pointer ${(editingCategoryColor || cat.color) === c ? (dark ? 'outline outline-1 outline-white outline-offset-1' : 'outline outline-1 outline-[#141414] outline-offset-1') : ''}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: displayColor }}></div>
                          <span
                            className={`flex-1 cursor-pointer text-[11px] ${dark ? 'text-white/80' : 'text-gray-700'}`}
                            onClick={() => {
                                if(showCategoryManager) {
                                    setEditingCategoryId(cat.id);
                                    setEditingCategoryName(cat.name);
                                    setEditingCategoryColor(cat.color);
                                    editingCategoryRef.current = { id: cat.id, color: cat.color };
                                }
                            }}
                            onDoubleClick={() => {
                              setEditingCategoryId(cat.id);
                              setEditingCategoryName(cat.name);
                              setEditingCategoryColor(cat.color);
                              editingCategoryRef.current = { id: cat.id, color: cat.color };
                              setShowCategoryManager(true);
                            }}
                          >
                            {cat.name}
                          </span>
                          {showCategoryManager && <button onClick={() => deleteCategory(cat.id)} aria-label={`${cat.name}を削除`} className="text-red-700 opacity-0 group-hover:opacity-100 ml-1"><FiX size={11} /></button>}
                        </>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Area: Calendar Grid */}
          <div className="order-1 md:order-2 flex-1 min-w-0 flex flex-col bg-white relative min-h-[560px] md:min-h-0 md:h-full" style={{ backgroundColor: rightAreaBgColor, fontFamily: rightAreaFont }}>

            {/* Toolbar */}
            <div className={`px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-b flex-shrink-0 ${gridLine}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <button type="button" onClick={() => step(-1)} aria-label={viewMode === 'week' ? '前の週' : '前の月'} className={`w-6 h-6 flex items-center justify-center ${rdark ? 'text-white/70 hover:text-white' : 'text-gray-500 hover:text-[#141414]'}`}>
                  <FiChevronLeft size={14} />
                </button>
                <span className={`yy-mono text-[12px] font-bold tracking-[0.08em] ${rdark ? 'text-white' : 'text-[#141414]'}`}>
                  {viewMode === 'week' ? weekLabel : `${currentDate.getFullYear()}.${String(currentDate.getMonth() + 1).padStart(2, '0')}`}
                </span>
                <button type="button" onClick={() => step(1)} aria-label={viewMode === 'week' ? '次の週' : '次の月'} className={`w-6 h-6 flex items-center justify-center ${rdark ? 'text-white/70 hover:text-white' : 'text-gray-500 hover:text-[#141414]'}`}>
                  <FiChevronRight size={14} />
                </button>
                <button type="button" onClick={goToday} className={`${MONO} underline underline-offset-2 ml-1 ${rdark ? 'text-white/70' : 'text-gray-500 hover:text-[#141414]'}`}>Today</button>
                {/* 月 / 週 */}
                <span className={`flex items-center gap-2 pl-2 ml-1 border-l ${gridLine}`}>
                  {([['month', 'Month'], ['week', 'Week']] as const).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setViewMode(k)}
                      aria-pressed={viewMode === k}
                      className={`${MONO} ${viewMode === k ? `underline underline-offset-2 ${rdark ? 'text-white' : 'text-[#141414]'}` : (rdark ? 'text-white/50' : 'text-gray-400 hover:text-[#141414]')}`}
                    >
                      {label}
                    </button>
                  ))}
                </span>
                <button type="button" onClick={() => openModal(parseYmd(selectedDate))} className="yy-btn yy-btn--primary !px-2 !py-0.5 !text-[11px] ml-1">＋ 予定</button>
                {icsLoading && <span className={`${MONO} ${rdark ? 'text-white/50' : 'text-gray-400'}`}>Loading feeds…</span>}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <label className={`flex items-center gap-1 cursor-pointer text-[11px] ${rdark ? 'text-white' : 'text-gray-600'}`}>
                  <input type="checkbox" checked={showMyTasksOnCalendar} onChange={e => setShowMyTasksOnCalendar(e.target.checked)} className="accent-[#3b3b3b] w-3 h-3" />
                  Myタスク
                </label>
                <label className={`flex items-center gap-1 cursor-pointer text-[11px] ${rdark ? 'text-white' : 'text-gray-600'}`}>
                  <input type="checkbox" checked={showTeamTasksOnCalendar} onChange={e => setShowTeamTasksOnCalendar(e.target.checked)} className="accent-[#3b3b3b] w-3 h-3" />
                  Teamタスク
                </label>
                <div className={`flex items-center gap-1 pl-3 border-l ${gridLine}`}>
                  <input type="color" value={leftAreaBgColor} onChange={e => saveTheme(e.target.value, rightAreaBgColor)} className="w-4 h-4 border border-black/20 cursor-pointer p-0" title="左の欄の色" />
                  <input type="color" value={rightAreaBgColor} onChange={e => saveTheme(leftAreaBgColor, e.target.value)} className="w-4 h-4 border border-black/20 cursor-pointer p-0" title="カレンダーの地の色" />
                </div>
              </div>
            </div>

            {viewMode === 'week' ? (
              <WeekView
                days={weekDays}
                todayStr={todayStr}
                selectedDate={selectedDate}
                dark={rdark}
                gridLine={gridLine}
                eventsOf={(ds) => eventsByDate.get(ds) || []}
                tasksOf={(d) => getTasksForDate(d).map((t) => ({ id: t.id, title: t.title || t.content || '', completed: t.completed, color: t.color, isTeamTask: t.isTeamTask, categoryId: t.categoryId }))}
                holidayOf={(ds) => (showHolidays ? isHoliday(ds) : null)}
                onSelect={setSelectedDate}
                onAdd={(d) => openModal(d)}
                onOpenEvent={(ev) => { const full = [...events, ...sideEvents].find((e) => e.id === ev.id); if (full) editEvent(full); }}
                onToggleTask={(t) => { if (!t.isTeamTask && t.categoryId) toggleTaskComplete(t.categoryId, t.id); }}
              />
            ) : (<>
            {/* Header Days */}
            <div className={`grid grid-cols-7 border-b flex-shrink-0 ${gridLine}`}>
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, i) => (
                <div
                  key={day}
                  className={`py-1.5 pl-1.5 ${MONO} ${i === 0 || i === 6 ? '' : (rdark ? 'text-white/50' : 'text-gray-500')}`}
                  style={i === 0 ? { color: SUN } : i === 6 ? { color: SAT } : undefined}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Grid Container */}
            <div className="flex-1 grid grid-cols-7 grid-rows-6 h-full min-h-0">
              {(() => {
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const lastDate = new Date(year, month + 1, 0).getDate();
                const days = [];
                const slots = dailySlots;
                let dayCount = 1;
                let nextMonthDay = 1;

                for (let row = 0; row < 6; row++) {
                  for (let col = 0; col < 7; col++) {
                    const isPrevMonth = row === 0 && col < firstDay;
                    const isNextMonth = dayCount > lastDate;

                    const cellZIndex = 50 - col;

                    // ★重要: paddingを0にして、バーが境界線まで届くようにする
                    const cellClass = `calendar-cell border-b border-r ${gridLine} relative p-0 flex flex-col ${rdark ? 'bg-white/5' : 'bg-transparent'}`;

                    if (isPrevMonth) {
                      days.push(<div key={`prev-${col}`} className={cellClass} style={{ zIndex: cellZIndex }} />);
                    } else if (isNextMonth) {
                      days.push(<div key={`next-${nextMonthDay}`} className={cellClass} style={{ zIndex: cellZIndex }} />);
                      nextMonthDay++;
                    } else {
                      const date = new Date(year, month, dayCount);
                      const dateStr = formatDateForStorage(date);
                      const isToday = new Date().toDateString() === date.toDateString();
                      const isSelected = selectedDate === dateStr;
                      const holiday = showHolidays ? isHoliday(dateStr) : null;

                      const daySlots = slots[dateStr] || [];
                      const dayTasks = (showMyTasksOnCalendar || showTeamTasksOnCalendar) ? getTasksForDate(date) : [];

                      const hoverClass = rdark ? 'hover:bg-white/10' : 'hover:bg-black/[0.03]';
                      const numColor = isToday ? '#52AA96' : holiday || col === 0 ? SUN : col === 6 ? SAT : undefined;

                      days.push(
                        <div
                          key={dayCount}
                          className={`
                            ${cellClass} ${hoverClass} transition-colors overflow-visible
                            ${isSelected ? (rdark ? 'bg-white/10' : 'bg-black/[0.035]') : ''}
                          `}
                          style={{ zIndex: cellZIndex }}
                          onClick={() => { setSelectedDate(dateStr); }}
                          onDoubleClick={() => { openModal(date); }}
                          onDragOver={e => onDragOverDay(e, dateStr)}
                          onDrop={e => onDropToDay(e, dateStr)}
                        >
                          {/* 今日は差し色の細線を升目の上辺に 1 本だけ引く */}
                          {isToday && <div className="absolute left-0 right-0 top-0 h-px bg-[#52AA96] pointer-events-none" />}
                          {/* 日付数字部分にのみパディングを適用 */}
                          <div className="flex justify-between items-start gap-1 pl-1.5 pt-1 pr-1 flex-shrink-0 mb-1 pointer-events-none relative z-0">
                            <span
                              className={`yy-mono text-[11px] leading-4 ${isToday ? 'font-bold' : ''} ${numColor ? '' : (rdark ? 'text-white' : 'text-[#3b3b3b]')}`}
                              style={numColor ? { color: numColor } : undefined}
                            >
                              {String(dayCount).padStart(2, '0')}
                            </span>
                            {holiday && <span className="text-[10px] truncate min-w-0" style={{ color: SUN }}>{holiday}</span>}
                          </div>

                          <div className="flex flex-col gap-[1px] relative flex-1 min-h-0 w-full">
                            {daySlots.map((ev, idx) => {
                              if (!ev) return <div key={`empty-${idx}`} className="h-[18px]"></div>;

                              const isStart = !ev.spanPart || ev.spanPart === 'start' || ev.spanPart === 'single';
                              const isEnd = !ev.spanPart || ev.spanPart === 'end' || ev.spanPart === 'single';
                              const fromFeed = isFeedEvent(ev);

                              // ★重要: CSSで連続バーの「完全な結合」を表現
                              // 外部カレンダーの予定は塗らず、色の細線だけ（自分の予定と見分ける・読むだけ）
                              const barStyle: React.CSSProperties = fromFeed
                                ? { borderLeft: `2px solid ${ev.color}`, zIndex: 100, position: 'relative' }
                                : { backgroundColor: ev.color, zIndex: 100, position: 'relative' };

                              if(isStart && isEnd) {
                                  // 単日
                                  barStyle.width = 'calc(100% - 4px)';
                                  barStyle.marginLeft = '2px';
                                  barStyle.marginRight = '2px';
                              } else if(isStart) {
                                  // 左端（右へはみ出す）
                                  barStyle.width = 'calc(100% + 1px - 2px)';
                                  barStyle.marginLeft = '2px';
                                  barStyle.marginRight = '-1px';
                              } else if(isEnd) {
                                  // 右端
                                  barStyle.width = 'calc(100% - 2px)';
                                  barStyle.marginLeft = '0px';
                                  barStyle.marginRight = '2px';
                              } else {
                                  // 中間（両側へはみ出す）
                                  barStyle.width = 'calc(100% + 1px)';
                                  barStyle.marginLeft = '0px';
                                  barStyle.marginRight = '-1px';
                              }

                              return (
                                <div
                                  key={ev.id}
                                  className={`
                                    h-[18px] text-[10px] px-1 truncate cursor-pointer hover:opacity-80 flex items-center relative
                                    ${fromFeed ? (rdark ? 'text-white/80' : 'text-gray-600') : 'text-white'}
                                    ${isStart ? '' : 'pl-2'}
                                  `}
                                  style={barStyle}
                                  title={fromFeed ? `${ev.title}（${ev.category}・読むだけ）` : isOfficeEvent(ev) ? `${ev.title}（事務所の予定・メンバー全員に見えます）` : ev.title}
                                  onClick={(e) => { e.stopPropagation(); editEvent(ev); }}
                                  draggable={!fromFeed && !isOfficeEvent(ev)}
                                  onDragStart={(e) => onDragStartEvent(e, ev)}
                                  onDragEnd={onDragEndEvent}
                                >
                                  {isStart && (
                                    <>
                                      {!ev.allDay && <span className="yy-mono opacity-70 text-[9px] mr-1">{ev.startHour}:{ev.startMinute}</span>}
                                      <span className="truncate">{ev.title}</span>
                                    </>
                                  )}
                                </div>
                              );
                            })}

                            {dayTasks.length > 0 && (
                              <div className={`mt-1 border-t pt-1 px-1 ${gridLine}`}>
                                {dayTasks.map(task => (
                                  <div key={task.id || task.task?.id} className="flex items-center gap-1 text-[10px] h-[14px] mb-0.5">
                                    <div className="w-1.5 h-1.5 flex-shrink-0" style={{backgroundColor: task.color || '#5B6B73'}}></div>
                                    <span className={`truncate ${(task.completed || task.task?.completed) ? 'line-through opacity-60' : ''} ${rdark ? 'text-white' : 'text-gray-600'}`}>{task.title || task.task?.title}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {dragOverDate === dateStr && <div className="absolute inset-0 border border-[#52AA96] z-30 pointer-events-none" />}
                        </div>
                      );
                      dayCount++;
                    }
                  }
                }
                return days;
              })()}
            </div>
            </>)}
          </div>
        </div>

        {/* Modal: New/Edit Event */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/40" onClick={() => { setShowModal(false); setEditingEventId(null); }}>
            <div className="bg-white border border-[#3b3b3b] w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="px-4 py-2 border-b border-[#3b3b3b] flex justify-between items-center">
                <div>
                  <p className={`${MONO} text-gray-500`}>[ EVENT ]</p>
                  <h3 className="text-[12px] font-bold text-[#141414]">{readonlySource ? '外部カレンダーの予定' : officeEditId ? '事務所の予定を編集' : editingEventId ? '予定を編集' : '新しい予定'}</h3>
                </div>
                <button onClick={() => {setShowModal(false); setEditingEventId(null);}} aria-label="閉じる" className="text-gray-500 hover:text-[#141414]"><FiX size={14} /></button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); saveEvent(); }} className="p-4 space-y-3 text-[12px]">
                {readonlySource && (
                  <p className="text-[11px] text-gray-600 border-l border-[#52AA96] pl-2">
                    「{readonlySource}」から読んでいる予定です。ここでは書き換えられません。保存すると自分の予定として複製します。
                  </p>
                )}
                {/* 事務所に入っていれば、新しい予定を事務所の予定（メンバー全員に見える）として入れられる */}
                {myOffice.office && !readonlySource && !editingEventId && (
                  officeEditId ? (
                    <p className="text-[11px] text-gray-600 border-l border-[#52AA96] pl-2">
                      事務所「{myOffice.office.name}」の予定です。メンバー全員に見え、書き換えも全員に反映されます。
                    </p>
                  ) : (
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-700 border-l border-[#52AA96] pl-2">
                      <input type="checkbox" checked={toOffice} onChange={e => { setToOffice(e.target.checked); if (e.target.checked) setEndDateInput(startDateInput); }} className="w-3 h-3 accent-[#3b3b3b]" />
                      事務所「{myOffice.office.name}」の予定にする（メンバー全員に見える・1 日ずつ）
                    </label>
                  )
                )}
                <div>
                  <label className="yy-label">タイトル</label>
                  <input className={fieldCls} placeholder="予定のタイトルを入力" value={eventTitle} onChange={e => setEventTitle(e.target.value)} required autoFocus maxLength={toOffice ? 200 : undefined} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="yy-label">開始日</label>
                    <input type="date" className={fieldCls} value={startDateInput} onChange={e => { setStartDateInput(e.target.value); if(e.target.value > endDateInput) setEndDateInput(e.target.value); }} />
                  </div>
                  <div>
                    <label className="yy-label">終了日</label>
                    <input type="date" className={fieldCls} value={toOffice ? startDateInput : endDateInput} onChange={e => setEndDateInput(e.target.value)} min={startDateInput} disabled={toOffice} title={toOffice ? '事務所の予定は 1 日ずつ入れます' : undefined} />
                  </div>
                </div>

                {/* 種別。建築の種別はまだ作っていなくても選べ、保存したときに作る */}
                <div>
                  <label className="yy-label">種別</label>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { name: '', color: '', missing: false },
                      ...categories.map(c => ({ name: c.name, color: c.color, missing: false })),
                      ...missingBuilding.map(b => ({ ...b, missing: true })),
                    ].map(c => {
                      const on = eventCategory === c.name;
                      return (
                        <button
                          key={c.name || '(none)'}
                          type="button"
                          onClick={() => pickCategory(c.name)}
                          title={c.missing ? '初めて使うと種別に加わります' : undefined}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] border ${c.missing ? 'border-dashed' : ''} ${on ? 'border-[#141414] text-[#141414] font-bold' : 'border-gray-300 text-gray-600 hover:border-gray-500'}`}
                        >
                          {c.color && <span className="w-2 h-2 inline-block" style={{ backgroundColor: c.color }} />}
                          {c.missing && !on ? '＋' : ''}{c.name || 'なし'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {!allDay && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border border-[#3b3b3b] px-2 py-1 flex items-center gap-1 yy-mono">
                      <select value={startHour} onChange={e => setStartHour(e.target.value)} className="!border-0 bg-transparent text-[12px] focus:outline-none appearance-none">{Array.from({length:24},(_,i)=>i.toString().padStart(2,'0')).map(h=><option key={h} value={h}>{h}</option>)}</select>
                      <span>:</span>
                      <select value={startMinute} onChange={e => setStartMinute(e.target.value)} className="!border-0 bg-transparent text-[12px] focus:outline-none appearance-none"><option value="00">00</option><option value="15">15</option><option value="30">30</option><option value="45">45</option></select>
                    </div>
                    <span className="text-gray-400">→</span>
                    <div className="flex-1 border border-[#3b3b3b] px-2 py-1 flex items-center gap-1 yy-mono">
                      <select value={endHour} onChange={e => setEndHour(e.target.value)} className="!border-0 bg-transparent text-[12px] focus:outline-none appearance-none">{Array.from({length:24},(_,i)=>i.toString().padStart(2,'0')).map(h=><option key={h} value={h}>{h}</option>)}</select>
                      <span>:</span>
                      <select value={endMinute} onChange={e => setEndMinute(e.target.value)} className="!border-0 bg-transparent text-[12px] focus:outline-none appearance-none"><option value="00">00</option><option value="15">15</option><option value="30">30</option><option value="45">45</option></select>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-5 flex-wrap">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-700">
                    <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} className="w-3 h-3 accent-[#3b3b3b]" />
                    終日
                  </label>
                  {!toOffice && (
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-700" title="前日と当日に、サイト内の通知（ベル）でお知らせします">
                    <input type="checkbox" checked={remind} onChange={e => setRemind(e.target.checked)} className="w-3 h-3 accent-[#3b3b3b]" />
                    前日と当日に通知{guestMode && <span className="text-gray-400">（ログインすると届きます）</span>}
                  </label>
                  )}
                </div>

                {/* 繰り返し。新しい 1 日の予定のときだけ（複数日の帯とは組み合わせない） */}
                {!editingEventId && !readonlySource && !toOffice && (
                  startDateInput === endDateInput ? (
                    <div className="flex items-end gap-3 flex-wrap">
                      <div>
                        <label className="yy-label">繰り返し</label>
                        <select value={recurrenceType} onChange={e => setRecurrenceType(e.target.value as Recurrence)} className="bg-white px-2 py-1.5 text-[12px]">
                          {RECURRENCE_LABELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                      {recurrenceType !== 'none' && (
                        <div>
                          <label className="yy-label">いつまで</label>
                          <input type="date" className="bg-white px-2 py-1.5 text-[12px]" value={recurrenceUntil} min={startDateInput} onChange={e => setRecurrenceUntil(e.target.value)} />
                        </div>
                      )}
                      {recurrenceType !== 'none' && (
                        <span className="yy-mono text-[10px] text-gray-500 pb-2">
                          {expandRecurrence(parseYmd(startDateInput), recurrenceType, recurrenceUntil).length} 回
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-400">複数日の予定は繰り返しにできません（1 日の予定で選べます）。</p>
                  )
                )}
                {editingEventId && (() => {
                  const ev = events.find(e => e.id === editingEventId);
                  const later = ev?.recurrenceId ? events.filter(e => e.recurrenceId === ev.recurrenceId && e.date > ev.date).length : 0;
                  if (!later) return null;
                  return (
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-700">
                      <input type="checkbox" checked={applySeries} onChange={e => setApplySeries(e.target.checked)} className="w-3 h-3 accent-[#3b3b3b]" />
                      繰り返しのこれより後の {later} 回にも同じ変更をかける（日付はそのまま）
                    </label>
                  );
                })()}

                <div>
                  <label className="yy-label">詳細</label>
                  <textarea rows={3} className={`${fieldCls} resize-none`} placeholder="メモを入力..." value={eventDetails} onChange={e => setEventDetails(e.target.value)} />
                </div>

                <div className="pt-2 flex justify-between items-center">
                  {(editingEventId || officeEditId) ? <button type="button" onClick={deleteEvent} className="text-[11px] text-red-700 underline underline-offset-2">削除</button> : <div></div>}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowModal(false)} className="yy-btn">キャンセル</button>
                    <button type="submit" className="yy-btn yy-btn--primary">{readonlySource ? '自分の予定に複製' : toOffice ? '事務所の予定として保存' : '保存'}</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDeadlines && <DeadlineHelper key={deadlineTab} initialTab={deadlineTab} onAdd={addDeadlines} onClose={() => setShowDeadlines(false)} />}

        {showIcsImport && (
          <IcsImport
            initialFile={importFile}
            categories={categories}
            existingKeys={importedKeys}
            onImport={importIcsEvents}
            onClose={() => { setShowIcsImport(false); setImportFile(null); }}
          />
        )}

        {/* Modal: 外部カレンダー連携（URL の購読と書き出し） */}
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/40" onClick={() => setShowSettingsModal(false)}>
            <div className="bg-white border border-[#3b3b3b] w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="px-4 py-2 border-b border-[#3b3b3b] flex justify-between items-center">
                <div>
                  <p className={`${MONO} text-gray-500`}>[ SYNC ]</p>
                  <h3 className="text-[12px] font-bold text-[#141414]">外部カレンダー連携</h3>
                </div>
                <button onClick={() => setShowSettingsModal(false)} aria-label="閉じる" className="text-gray-500 hover:text-[#141414]"><FiX size={14} /></button>
              </div>
              <div className="p-4 text-[12px]">
                <div className="mb-4">
                  <h4 className={`${MONO} text-gray-500 mb-2`}>001 購読（URL・表示だけ）</h4>
                  <div className="flex flex-col gap-2">
                    <input className={fieldCls} placeholder="カレンダー名 (例: Google)" value={newIcsName} onChange={e => setNewIcsName(e.target.value)} />
                    <div className="flex gap-2">
                      <input className={`${fieldCls} flex-1 min-w-0`} placeholder="https://.../basic.ics" value={newIcsUrl} onChange={e => setNewIcsUrl(e.target.value)} />
                      <button onClick={addIcsFeed} className="yy-btn yy-btn--primary">追加</button>
                    </div>
                  </div>
                  <div className="mt-3">
                    {icsFeeds.map(feed => (
                      <div key={feed.id} className="flex items-center justify-between py-1.5 border-b border-gray-200 text-[11px]">
                        <span className="truncate flex-1">{feed.name}</span>
                        {/* 読めた件数か、読めなかった理由をフィードごとに出す。
                            黙って0件だと、URLが悪いのか予定が無いのか分からない。 */}
                        <span className="ml-2 shrink-0 yy-mono text-[10px] text-gray-500">
                          {icsLoading
                            ? 'LOADING…'
                            : icsErrors[feed.id]
                              ? <span className="text-red-700">{icsErrors[feed.id]}</span>
                              : `${icsEvents.filter(e => e.id.startsWith(`ics-${feed.id}-`)).length} 件`}
                        </span>
                        <button onClick={() => removeIcsFeed(feed.id)} className="text-red-700 underline underline-offset-2 ml-3">削除</button>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">
                    Googleカレンダーの「設定と共有」→「iCal形式の非公開URL」などを貼り付けてください。
                    読んだ予定は表示だけで、編集・通知はできません。繰り返しは 1 年前〜2 年先まで展開して表示します。
                  </p>
                </div>

                <div className="mb-4 pt-3 border-t border-gray-200">
                  <h4 className={`${MONO} text-gray-500 mb-2`}>002 ファイルから取り込む</h4>
                  <button
                    type="button"
                    onClick={() => { setShowSettingsModal(false); setImportFile(null); setShowIcsImport(true); }}
                    className="yy-btn"
                  >
                    .ics ファイルを読み込む
                  </button>
                  <p className="text-[10px] text-gray-400 mt-1">自分の予定として保存します（編集・通知ができる）。カレンダーの上にドロップしても開きます。</p>
                </div>

                {/* 書き出し。取り込みだけだと片道になるので、出す側も用意する。 */}
                <div className="pt-3 border-t border-gray-200">
                  <h4 className={`${MONO} text-gray-500 mb-2`}>003 書き出し</h4>
                  <button onClick={exportCalendarToIcs} className="yy-btn">
                    自分の予定を .ics で保存
                  </button>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Googleカレンダー等の「インポート」から取り込めます。外部カレンダーの予定は含みません。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCalendar; 
