'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useTaskContext } from '../../providers/TaskProvider';
import { db } from '@/lib/firebaseClient';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, getDocs, writeBatch } from 'firebase/firestore';

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
  recurrenceType?: 'daily' | 'weekly' | 'monthly' | 'none';
  recurrenceUntil?: string;
  spanGroupId?: string;
  spanPart?: 'single' | 'start' | 'middle' | 'end';
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

const formatDateForStorage = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatFullDateJP = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${days[d.getDay()]})`;
};

// カラーパレット (青→緑→黄→赤...の順)
const COLOR_PALETTE = [
  '#3B82F6', // 青
  '#10B981', // 緑
  '#F59E0B', // 黄
  '#EF4444', // 赤
  '#8B5CF6', // 紫
  '#06B6D4', // 水色
  '#84CC16', // ライム
  '#F97316', // オレンジ
  '#EC4899', // ピンク
  '#6B7280', // グレー
  '#14B8A6', // ティール
];

// --- Main Component ---

const MyCalendar: React.FC = () => {
  const { isLoggedIn, currentUser } = useAuth();
  
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateForStorage(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>([
    { id: '1', name: '会議', color: '#3B82F6' },
    { id: '2', name: '作業', color: '#10B981' },
    { id: '3', name: '締切', color: '#EF4444' }
  ]);
  
  // UI State
  const [showModal, setShowModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
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
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [recurrenceUntil, setRecurrenceUntil] = useState('');

  // Category Manager State
  const [categoryName, setCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryColor, setEditingCategoryColor] = useState('');
  
  // Theme State
  const [leftAreaBgColor, setLeftAreaBgColor] = useState<string>('#1e293b');
  const [rightAreaBgColor, setRightAreaBgColor] = useState<string>('#ffffff');
  const [rightAreaFont, setRightAreaFont] = useState<string>('inherit');

  // Task Integration State
  const [showMyTasksOnCalendar, setShowMyTasksOnCalendar] = useState(true);
  const [showTeamTasksOnCalendar, setShowTeamTasksOnCalendar] = useState(true);
  const [teamTasks, setTeamTasks] = useState<any[]>([]);
  const { categories: taskCategories, toggleTaskComplete } = useTaskContext();

  // External Calendar State
  const [icsFeeds, setIcsFeeds] = useState<IcsFeed[]>([]);
  const [newIcsName, setNewIcsName] = useState('');
  const [newIcsUrl, setNewIcsUrl] = useState('');

  // Drag & Drop Refs
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  
  // 編集中のカテゴリー情報を保持するRef
  const editingCategoryRef = useRef<{ id: string | null; color: string }>({ id: null, color: '' });
  
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

  useEffect(() => {
    if (!currentUser) return;
    try {
      const theme = JSON.parse(localStorage.getItem(`calendarTheme:${currentUser.uid}`) || 'null');
      if (theme) {
        if (theme.left) setLeftAreaBgColor(theme.left);
        if (theme.right) setRightAreaBgColor(theme.right);
        if (theme.font) setRightAreaFont(theme.font);
      }
    } catch {}
  }, [currentUser]);

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
        const defaults = [
            { name: '会議', color: '#3B82F6' },
            { name: '作業', color: '#10B981' },
            { name: '締切', color: '#EF4444' }
          ];
        defaults.forEach(c => addDoc(colRef, c));
      }
    });
    return () => unsub();
  }, [isLoggedIn, currentUser]);

  useEffect(() => {
    if (!isLoggedIn || !currentUser) { setEvents([]); return; }
    const colRef = collection(db, 'users', currentUser.uid, 'calendarEvents');
    const unsub = onSnapshot(colRef, (snap) => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [isLoggedIn, currentUser]);

  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;
    const boardsQuery = query(collection(db, 'boards'), where('memberUids', 'array-contains', currentUser.uid));
    const unsubBoards = onSnapshot(boardsQuery, async (boardSnap) => {
      const allTasks: any[] = [];
      const boardPromises = boardSnap.docs.map(async (boardDoc) => {
        const boardData = boardDoc.data();
        const tasksRef = collection(db, 'boards', boardDoc.id, 'tasks');
        const tasksSnap = await getDocs(tasksRef);
        tasksSnap.forEach(taskDoc => {
          const task = taskDoc.data();
          const date = task.dueDate || task.limit;
          if (date) {
            allTasks.push({
              id: taskDoc.id,
                title: task.title,
              date: date, 
              completed: task.status === '完了',
              color: boardData.color || '#6B7280',
              isTeamTask: true,
              categoryId: boardDoc.id
            });
          }
        });
      });
      await Promise.all(boardPromises);
      setTeamTasks(allTasks);
    });
    return () => unsubBoards();
  }, [isLoggedIn, currentUser]);

  useEffect(() => {
    if(!currentUser) return;
    const saved = localStorage.getItem(`calendarIcs:${currentUser.uid}`);
    if(saved) setIcsFeeds(JSON.parse(saved));
  }, [currentUser]);

  // --- Logic ---

  const isHoliday = (dateStr: string): string | null => {
    const name = holidays[dateStr];
    return name ? (name.includes('振替休日') ? '振替休日' : name) : null;
  };

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const list = map.get(event.date) || [];
      list.push(event);
      map.set(event.date, list);
    });
    return map;
  }, [events]);

  const getEventsForDate = (date: Date) => eventsByDate.get(formatDateForStorage(date)) || [];

  const getTasksForDate = (date: Date) => {
    const dateString = formatDateForStorage(date);
    let tasks: any[] = [];
    if (showMyTasksOnCalendar) {
      taskCategories.forEach(cat => {
        cat.tasks.forEach(t => { 
          const tDate = t.dueDate;
          if (tDate === dateString) tasks.push({ ...t, categoryName: cat.title, color: '#3B82F6', isTeamTask: false, categoryId: cat.id }) 
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

    let relevantEvents = events.filter(e => {
        const d = new Date(e.date);
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
  }, [events, currentDate]);

  // --- Actions ---

  const openModal = (clickedDate?: Date) => {
    if (!isLoggedIn) { alert('会員登録が必要です'); return; }
    const base = clickedDate ? formatDateForStorage(clickedDate) : selectedDate;
    setStartDateInput(base); setEndDateInput(base);
    setEventTitle(''); setEventCategory(''); setEventDetails(''); setEditingEventId(null);
    setStartHour('09'); setStartMinute('00'); setEndHour('10'); setEndMinute('00'); setAllDay(false);
    if(categories.length > 0) setEventCategory(categories[0].name);
    setShowModal(true);
  };

  const editEvent = (event: CalendarEvent) => {
    setEditingEventId(event.id);
    setEventTitle(event.title);
    setEventCategory(event.category);
    setEventDetails(event.details);
    setAllDay(event.allDay || false);
    setStartHour(event.startHour); setStartMinute(event.startMinute);
    setEndHour(event.endHour); setEndMinute(event.endMinute);
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

  const saveEvent = async () => {
    if (!eventTitle || !currentUser) return;
    const color = categories.find(c => c.name === eventCategory)?.color || '#6B7280';
    const start = new Date(startDateInput);
    const end = new Date(endDateInput);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    const spanGroupId = diffDays > 0 ? `span-${Date.now()}` : undefined;

    const basePayload = {
      title: eventTitle, allDay, startHour, startMinute, endHour, endMinute,
      category: eventCategory, details: eventDetails, color, recurrenceType, recurrenceUntil, spanGroupId
    };

    if (editingEventId) {
        const target = events.find(e => e.id === editingEventId);
        if (target) {
            let idsToDelete = [editingEventId];
            if (target.spanGroupId) {
                idsToDelete = events.filter(e => e.spanGroupId === target.spanGroupId).map(e => e.id);
            }
            setEvents(prev => prev.filter(e => !idsToDelete.includes(e.id)));
            const batchDel = writeBatch(db);
            idsToDelete.forEach(id => batchDel.delete(doc(db, 'users', currentUser.uid, 'calendarEvents', id)));
            await batchDel.commit();
        }
    }

    const batch = writeBatch(db);
    const newEvents: CalendarEvent[] = [];
    for (let i = 0; i <= diffDays; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        const dateStr = formatDateForStorage(currentDate);
        const spanPart = diffDays === 0 ? 'single' : (i === 0 ? 'start' : (i === diffDays ? 'end' : 'middle'));
        const payload = { ...basePayload, date: dateStr, spanPart };
        const ref = doc(collection(db, 'users', currentUser.uid, 'calendarEvents'));
        batch.set(ref, stripUndefined(payload));
        newEvents.push({ id: ref.id, ...payload } as CalendarEvent);
    }
    await batch.commit();
    setEvents(prev => [...prev, ...newEvents]);
          setShowModal(false);
  };

  const deleteEvent = async () => {
    if (!editingEventId || !currentUser) return;
    const target = events.find(e => e.id === editingEventId);
    if (target?.spanGroupId) {
        if(!confirm('これは連続したスケジュールの一部です。すべて削除しますか？')) return;
        const groupEvents = events.filter(e => e.spanGroupId === target.spanGroupId);
        setEvents(prev => prev.filter(e => e.spanGroupId !== target.spanGroupId));
        const batch = writeBatch(db);
        groupEvents.forEach(e => batch.delete(doc(db, 'users', currentUser.uid, 'calendarEvents', e.id)));
        await batch.commit();
    } else {
        setEvents(prev => prev.filter(e => e.id !== editingEventId));
        await deleteDoc(doc(db, 'users', currentUser.uid, 'calendarEvents', editingEventId));
    }
    setShowModal(false);
  };

  const addCategory = async () => {
    if (!categoryName.trim() || !currentUser) return;
    const newCat = { name: categoryName, color: selectedColor };
    setCategoryName('');
    await addDoc(collection(db, 'users', currentUser.uid, 'calendarCategories'), newCat);
  };

  // カテゴリーの色のみを更新（編集モードを維持）
  const updateCategoryColor = async (id: string, color: string) => {
    if (!currentUser) return;
    const oldCat = categories.find(c => c.id === id);
    if(!oldCat || oldCat.color === color) return;

    // Ref更新 (onSnapshot対策)
    editingCategoryRef.current = { id: id, color: color };
    
    // UI即時更新
    setEditingCategoryColor(color);
    setCategories(prev => prev.map(c => c.id === id ? { ...c, color } : c));

    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'calendarCategories', id), { color });

      // 関連イベントの色一括更新
      const targetEvents = events.filter(ev => ev.category === oldCat.name);
      if (targetEvents.length > 0) {
          setEvents(prev => prev.map(ev => ev.category === oldCat.name ? { ...ev, color: color } : ev));
        const batch = writeBatch(db);
          targetEvents.forEach(ev => {
              const ref = doc(db, 'users', currentUser.uid, 'calendarEvents', ev.id);
              batch.update(ref, { color: color });
        });
        await batch.commit();
      }
    } catch (error) {
      console.error('Update Error:', error);
    }
  };

  // カテゴリー更新（名前変更等）
  const updateCategory = async (id: string, name: string, color: string) => {
    if (!name.trim() || !currentUser) return;
    const oldCat = categories.find(c => c.id === id);
    if(!oldCat) return;

    setCategories(prev => prev.map(c => c.id === id ? { ...c, name, color } : c));
    setEditingCategoryId(null);
    await updateDoc(doc(db, 'users', currentUser.uid, 'calendarCategories', id), { name, color });

    if (oldCat.name !== name || oldCat.color !== color) {
        const targetEvents = events.filter(ev => ev.category === oldCat.name);
        if (targetEvents.length > 0) {
            setEvents(prev => prev.map(ev => ev.category === oldCat.name ? { ...ev, category: name, color: color } : ev));
        const batch = writeBatch(db);
            targetEvents.forEach(ev => {
                const ref = doc(db, 'users', currentUser.uid, 'calendarEvents', ev.id);
                batch.update(ref, { category: name, color: color });
        });
        await batch.commit();
      }
    }
  };

  const deleteCategory = async (id: string) => {
    if (!currentUser) return;
    await deleteDoc(doc(db, 'users', currentUser.uid, 'calendarCategories', id));
  };

  const addIcsFeed = () => {
    if (!newIcsName || !newIcsUrl || !currentUser) return;
    const newFeed = { id: `ics-${Date.now()}`, name: newIcsName, url: newIcsUrl, color: '#6B7280' };
    const updated = [...icsFeeds, newFeed];
    setIcsFeeds(updated);
    localStorage.setItem(`calendarIcs:${currentUser.uid}`, JSON.stringify(updated));
    setNewIcsName(''); setNewIcsUrl('');
  };

  const removeIcsFeed = (id: string) => {
    if(!currentUser) return;
    const updated = icsFeeds.filter(f => f.id !== id);
    setIcsFeeds(updated);
    localStorage.setItem(`calendarIcs:${currentUser.uid}`, JSON.stringify(updated));
  };

  const onDragStartEvent = (ev: React.DragEvent, event: CalendarEvent) => {
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
    ghost.style.borderRadius = '4px';
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
  const onDragOverDay = (ev: React.DragEvent, dateStr: string) => { ev.preventDefault(); if (dragOverDate !== dateStr) setDragOverDate(dateStr); };
  
  const onDropToDay = async (ev: React.DragEvent, dateStr: string) => {
    ev.preventDefault();
    const id = draggingEventId;
    setDragOverDate(null); setDraggingEventId(null);
    if (!id || !currentUser) return;

    const target = events.find(e => e.id === id);
    if(!target || target.date === dateStr) return;

    const toDate = (s: string) => new Date(`${s}T00:00:00`);
    const dateToStr = (d: Date) => formatDateForStorage(d);
    const oldDate = toDate(target.date);
    const newDate = toDate(dateStr);
    const diffTime = newDate.getTime() - oldDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return;

    if (target.spanGroupId) {
        const group = events.filter(e => e.spanGroupId === target.spanGroupId);
        const updates = group.map(ev => {
            const d = toDate(ev.date);
            d.setDate(d.getDate() + diffDays);
            return { id: ev.id, date: dateToStr(d) };
        });
        setEvents(prev => prev.map(ev => {
            const update = updates.find(u => u.id === ev.id);
            return update ? { ...ev, date: update.date } : ev;
        }));
        const batch = writeBatch(db);
        updates.forEach(u => {
            const ref = doc(db, 'users', currentUser.uid, 'calendarEvents', u.id);
            batch.update(ref, { date: u.date });
        });
        await batch.commit();
      } else {
        setEvents(prev => prev.map(e => e.id === id ? { ...e, date: dateStr } : e));
        await updateDoc(doc(db, 'users', currentUser.uid, 'calendarEvents', id), { date: dateStr });
    }
  };

  // --- Render ---
  return (
    <div className="pt-0 pb-4">
      <div className="w-full h-[calc(100vh-100px)] flex flex-col">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-baseline justify-between mb-2 flex-shrink-0">
          <div className="flex items-baseline gap-4">
            <h2 className="text-xl font-semibold">Myカレンダー</h2>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Beta</span>
                    </div>
          <button onClick={() => setShowSettingsModal(true)} className="text-gray-500 hover:text-gray-700 text-xs flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            設定・連携
                    </button>
                  </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden flex flex-col md:flex-row flex-1">
          
          {/* Left Sidebar */}
          <div 
            className="w-full md:w-[200px] flex flex-col border-r border-gray-100 transition-colors duration-300 flex-shrink-0"
            style={{ backgroundColor: leftAreaBgColor }}
          >
            {/* Today's Schedule */}
            <div className="p-4 border-b border-white/10 flex flex-col h-[300px] flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-xs font-bold tracking-wider ${isDarkColor(leftAreaBgColor) ? 'text-white/90' : 'text-gray-500'}`}>Schedule</h3>
                <button onClick={() => { const today = new Date(); setSelectedDate(formatDateForStorage(today)); setCurrentDate(today); }} className={`text-[9px] px-2 py-1 rounded-full font-bold transition ${isDarkColor(leftAreaBgColor) ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'}`}>TODAY</button>
              </div>
              <div className="flex items-center justify-between bg-black/10 rounded-lg p-1 mb-2">
                <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(formatDateForStorage(d)); }} className={`w-6 h-6 flex items-center justify-center rounded-md ${isDarkColor(leftAreaBgColor) ? 'text-white' : 'text-gray-600'}`}>←</button>
                <div className={`text-[10px] font-bold ${isDarkColor(leftAreaBgColor) ? 'text-white' : 'text-gray-800'}`}>{formatFullDateJP(selectedDate)}</div>
                <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(formatDateForStorage(d)); }} className={`w-6 h-6 flex items-center justify-center rounded-md ${isDarkColor(leftAreaBgColor) ? 'text-white' : 'text-gray-600'}`}>→</button>
              </div>
              <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {getEventsForDate(new Date(selectedDate)).length === 0 && getTasksForDate(new Date(selectedDate)).length === 0 ? (
                  <div className={`text-center py-6 text-[10px] italic ${isDarkColor(leftAreaBgColor) ? 'text-white/40' : 'text-gray-400'}`}>No events</div>
                          ) : (
                            <>
                    {getEventsForDate(new Date(selectedDate)).map(ev => (
                      <div key={ev.id} className="group flex items-center gap-2 p-1.5 rounded cursor-pointer transition hover:scale-[1.02]" style={{ backgroundColor: `${ev.color}20` }} onClick={() => editEvent(ev)}>
                        <div className="w-1 h-6 rounded-full" style={{ backgroundColor: ev.color }}></div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-[10px] font-bold truncate ${isDarkColor(leftAreaBgColor) ? 'text-white' : 'text-gray-800'}`}>{ev.title}</div>
                          <div className={`text-[9px] truncate ${isDarkColor(leftAreaBgColor) ? 'text-white/60' : 'text-gray-500'}`}>{ev.allDay ? 'All Day' : `${ev.startHour}:${ev.startMinute} -`}</div>
                        </div>
                      </div>
                    ))}
                    {getTasksForDate(new Date(selectedDate)).map((task) => (
                      <div key={task.id || task.task?.id} className={`flex items-center gap-2 p-1.5 rounded border ${isDarkColor(leftAreaBgColor) ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-white'}`}>
                        <input type="checkbox" checked={task.completed || task.task?.completed} disabled={task.isTeamTask} onChange={() => !task.isTeamTask && task.categoryId && toggleTaskComplete(task.categoryId, task.id || task.task?.id)} className="w-3 h-3 rounded border-gray-300 accent-blue-500" />
                        <span className={`text-[10px] truncate flex-1 ${isDarkColor(leftAreaBgColor) ? 'text-white' : 'text-gray-700'} ${(task.completed || task.task?.completed) ? 'line-through opacity-50' : ''}`}>{task.title || task.task?.title}</span>
                      </div>
                    ))}
                            </>
                          )}
                </div>
                  </div>
                  
            {/* Categories */}
            <div className="p-4 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setShowCategoryManager(!showCategoryManager)}>
                <h3 className={`text-xs font-bold tracking-wider ${isDarkColor(leftAreaBgColor) ? 'text-white/90' : 'text-gray-500'}`}>Category</h3>
                <span className={`text-[9px] ${isDarkColor(leftAreaBgColor) ? 'text-white/50' : 'text-gray-400'}`}>{showCategoryManager ? 'Hide' : 'Edit'}</span>
                    </div>
                    
                    {showCategoryManager && (
                <div className="mb-3 animate-in slide-in-from-top-2">
                  <div className="flex gap-1 mb-2">
                    <input className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-[10px] text-white placeholder-white/40 focus:outline-none focus:border-blue-400" placeholder="New..." value={categoryName} onChange={e => setCategoryName(e.target.value)} />
                    <button onClick={addCategory} className="bg-blue-500 hover:bg-blue-600 text-white px-2 rounded text-[10px]">+</button>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {COLOR_PALETTE.map(c => (
                      <button key={c} onClick={() => setSelectedColor(c)} className={`w-3 h-3 rounded-full ${selectedColor === c ? 'ring-1 ring-white scale-125' : ''}`} style={{ backgroundColor: c }} />
                            ))}
                          </div>
                        </div>
              )}

              <div className="space-y-0.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {categories.map(cat => {
                  const displayColor = editingCategoryId === cat.id && editingCategoryColor 
                    ? editingCategoryColor 
                    : cat.color;
                  
                  return (
                  <div key={cat.id} className="group flex flex-col py-1 px-2 rounded hover:bg-white/10 transition">
                    <div className="flex items-center gap-2">
                      {editingCategoryId === cat.id ? (
                        <div className="flex-1">
                                  <input 
                            autoFocus
                            className="bg-transparent border-b border-white/50 text-white w-full outline-none text-xs"
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
                                    className={`w-3 h-3 rounded-full cursor-pointer ${(editingCategoryColor || cat.color) === c ? 'ring-1 ring-white' : ''}`} 
                                    style={{ backgroundColor: c }} 
                                      />
                                    ))}
                                  </div>
                                </div>
                              ) : (
                        <>
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: displayColor }}></div>
                          <span 
                            className={`flex-1 cursor-pointer text-xs ${isDarkColor(leftAreaBgColor) ? 'text-white/80' : 'text-gray-700'}`}
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
                          {showCategoryManager && <button onClick={() => deleteCategory(cat.id)} className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-300 ml-1 text-[10px]">×</button>}
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
          <div className="flex-1 flex flex-col bg-white relative h-full" style={{ backgroundColor: rightAreaBgColor, fontFamily: rightAreaFont }}>
            
            {/* Toolbar */}
            <div className={`px-6 py-3 flex items-center justify-between border-b flex-shrink-0 ${isDarkColor(rightAreaBgColor) ? 'border-white/20' : 'border-gray-300'}`}>
              <div className="flex items-center gap-4">
                <span className={`text-xl font-bold tracking-tight ${isDarkColor(rightAreaBgColor) ? 'text-white' : 'text-gray-800'}`}>
                  {currentDate.getFullYear()}.{String(currentDate.getMonth() + 1).padStart(2, '0')}
                  </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth()-1); setCurrentDate(d); }} className="w-7 h-7 flex items-center justify-center rounded-full bg-white hover:bg-white transition text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                  <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth()+1); setCurrentDate(d); }} className="w-7 h-7 flex items-center justify-center rounded-full bg-white hover:bg-white transition text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-[10px] font-medium mr-2">
                  <label className={`flex items-center gap-1 cursor-pointer px-2 py-1 rounded transition ${isDarkColor(rightAreaBgColor) ? 'text-white hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <input type="checkbox" checked={showMyTasksOnCalendar} onChange={e => setShowMyTasksOnCalendar(e.target.checked)} className="accent-blue-600 rounded-sm w-3 h-3" />
                    Myタスク
                  </label>
                  <label className={`flex items-center gap-1 cursor-pointer px-2 py-1 rounded transition ${isDarkColor(rightAreaBgColor) ? 'text-white hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <input type="checkbox" checked={showTeamTasksOnCalendar} onChange={e => setShowTeamTasksOnCalendar(e.target.checked)} className="accent-blue-600 rounded-sm w-3 h-3" />
                    Teamタスク
                  </label>
                      </div>
                
                <div className="flex gap-1 pl-2 border-l border-gray-200">
                  <input type="color" value={leftAreaBgColor} onChange={e => setLeftAreaBgColor(e.target.value)} className="w-5 h-5 rounded-full overflow-hidden border border-gray-200 cursor-pointer p-0" title="Sidebar Color" />
                  <input type="color" value={rightAreaBgColor} onChange={e => setRightAreaBgColor(e.target.value)} className="w-5 h-5 rounded-full overflow-hidden border border-gray-200 cursor-pointer p-0" title="Background Color" />
                </div>
              </div>
            </div>

            {/* Header Days */}
            <div className={`grid grid-cols-7 border-b flex-shrink-0 ${isDarkColor(rightAreaBgColor) ? 'border-white/20' : 'border-gray-300'}`}>
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, i) => (
                <div key={day} className={`py-1.5 text-center text-[10px] font-bold tracking-wider ${
                  i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : (isDarkColor(rightAreaBgColor) ? 'text-white/60' : 'text-gray-400')
                }`}>{day}</div>
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

                const borderColor = isDarkColor(rightAreaBgColor) ? 'border-white/20' : 'border-gray-300';

                for (let row = 0; row < 6; row++) {
                  for (let col = 0; col < 7; col++) {
                    const isPrevMonth = row === 0 && col < firstDay;
                    const isNextMonth = dayCount > lastDate;
                    
                    const cellZIndex = 50 - col;

                    // ★重要: paddingを0にして、バーが境界線まで届くようにする
                    const cellClass = `calendar-cell border-b border-r ${borderColor} relative p-0 flex flex-col ${isDarkColor(rightAreaBgColor) ? 'bg-white/5' : 'bg-transparent'}`;

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

                      const hoverClass = isDarkColor(rightAreaBgColor) ? 'hover:bg-white/10' : 'hover:bg-gray-100';
                        
                        days.push(
                          <div
                          key={dayCount}
                          className={`
                            ${cellClass} ${hoverClass} transition-colors overflow-visible
                            ${isSelected ? (isDarkColor(rightAreaBgColor) ? 'bg-white/10' : 'bg-blue-50/50') : ''}
                          `}
                          style={{ zIndex: cellZIndex }}
                          onClick={() => { setSelectedDate(dateStr); }}
                          onDoubleClick={() => { openModal(date); }}
                          onDragOver={e => onDragOverDay(e, dateStr)}
                          onDrop={e => onDropToDay(e, dateStr)}
                        >
                          {/* 日付数字部分にのみパディングを適用 */}
                          <div className="flex justify-between items-start pl-1 pt-1 pr-1 flex-shrink-0 mb-1 pointer-events-none relative z-0">
                            <span className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-md' : (holiday || col===0 ? 'text-red-400' : col===6 ? 'text-blue-400' : (isDarkColor(rightAreaBgColor) ? 'text-white' : 'text-gray-700'))}`}>
                              {dayCount}
                            </span>
                            {holiday && <span className="text-[9px] text-red-400 font-medium truncate max-w-[50px] mr-1">{holiday}</span>}
                            </div>

                          <div className="flex flex-col gap-[1px] relative flex-1 min-h-0 w-full">
                            {daySlots.map((ev, idx) => {
                              if (!ev) return <div key={`empty-${idx}`} className="h-[18px]"></div>; 
                              
                              const isStart = !ev.spanPart || ev.spanPart === 'start' || ev.spanPart === 'single';
                              const isEnd = !ev.spanPart || ev.spanPart === 'end' || ev.spanPart === 'single';

                              // ★重要: CSSで連続バーの「完全な結合」を表現
                              const barStyle: React.CSSProperties = { 
                                  backgroundColor: ev.color, 
                                  zIndex: 100, 
                                  position: 'relative'
                              };
                              
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
                                    h-[18px] text-[10px] px-1 text-white truncate cursor-pointer hover:opacity-80 flex items-center relative
                                    ${isStart ? 'rounded-l ml-0.5' : 'rounded-l-none pl-2 border-l-0'}
                                    ${isEnd ? 'rounded-r mr-0.5' : 'rounded-r-none pr-0 border-r-0'}
                                  `}
                                  style={barStyle}
                                  onClick={(e) => { e.stopPropagation(); editEvent(ev); }}
                                  draggable
                                  onDragStart={(e) => onDragStartEvent(e, ev)}
                                  onDragEnd={onDragEndEvent}
                                >
                                  {isStart && (
                                    <>
                                      <span className="opacity-70 text-[9px] mr-1">{ev.allDay ? '' : ev.startHour + ':'}</span>
                                      <span className="truncate">{ev.title}</span>
                                    </>
                                  )}
                                </div>
                                );
                              })}
                            
                            {dayTasks.length > 0 && (
                                <div className="mt-1 border-t border-gray-300/30 pt-1 px-1">
                                    {dayTasks.map(task => (
                                        <div key={task.id || task.task?.id} className="flex items-center gap-1 text-[9px] opacity-80 h-[14px] mb-0.5">
                                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{backgroundColor: task.color || '#3B82F6'}}></div>
                                            <span className={`truncate ${(task.completed || task.task?.completed) ? 'line-through' : ''} ${isDarkColor(rightAreaBgColor) ? 'text-white' : 'text-gray-600'}`}>{task.title || task.task?.title}</span>
                                </div>
                              ))}
                            </div>
                            )}
                          </div>
                          
                          {dragOverDate === dateStr && <div className="absolute inset-0 bg-blue-500/10 border-2 border-blue-500 rounded-sm z-30 pointer-events-none" />}
                      </div>
                    );
                      dayCount++;
                      }
                  }
                }
                      return days;
                    })()}
                  </div>
                </div>
              </div>

        {/* Modal: New/Edit Event */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-800">{editingEventId ? '予定を編集' : '新しい予定'}</h3>
                <button onClick={() => {setShowModal(false); setEditingEventId(null);}} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
              
              <form onSubmit={(e) => { e.preventDefault(); saveEvent(); }} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">タイトル</label>
                  <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="予定のタイトルを入力" value={eventTitle} onChange={e => setEventTitle(e.target.value)} required autoFocus />
        </div>

                <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">開始日</label>
                    <input type="date" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" value={startDateInput} onChange={e => { setStartDateInput(e.target.value); if(e.target.value > endDateInput) setEndDateInput(e.target.value); }} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">終了日</label>
                    <input type="date" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" value={endDateInput} onChange={e => setEndDateInput(e.target.value)} min={startDateInput} />
                </div>
              </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">カテゴリー</label>
                    <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" value={eventCategory} onChange={e => setEventCategory(e.target.value)}>
                      <option value="">(選択なし)</option>
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
          </div>

                {!allDay && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-1">
                      <select value={startHour} onChange={e => setStartHour(e.target.value)} className="bg-transparent text-sm font-medium focus:outline-none appearance-none">{Array.from({length:24},(_,i)=>i.toString().padStart(2,'0')).map(h=><option key={h} value={h}>{h}</option>)}</select>
                      <span>:</span>
                      <select value={startMinute} onChange={e => setStartMinute(e.target.value)} className="bg-transparent text-sm font-medium focus:outline-none appearance-none"><option value="00">00</option><option value="15">15</option><option value="30">30</option><option value="45">45</option></select>
                  </div>
                    <span className="text-gray-400">→</span>
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-1">
                      <select value={endHour} onChange={e => setEndHour(e.target.value)} className="bg-transparent text-sm font-medium focus:outline-none appearance-none">{Array.from({length:24},(_,i)=>i.toString().padStart(2,'0')).map(h=><option key={h} value={h}>{h}</option>)}</select>
                      <span>:</span>
                      <select value={endMinute} onChange={e => setEndMinute(e.target.value)} className="bg-transparent text-sm font-medium focus:outline-none appearance-none"><option value="00">00</option><option value="15">15</option><option value="30">30</option><option value="45">45</option></select>
                </div>
            </div>
          )}

                <div className="flex items-center gap-4 py-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${allDay ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'}`}>
                      {allDay && <span className="text-white text-xs">✓</span>}
        </div>
                    <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} className="hidden" />
                    <span className="text-xs text-gray-600 font-medium">終日</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">詳細</label>
                  <textarea rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none" placeholder="メモを入力..." value={eventDetails} onChange={e => setEventDetails(e.target.value)} />
                </div>
                
                <div className="pt-4 flex justify-between items-center">
                  {editingEventId ? <button type="button" onClick={deleteEvent} className="text-red-500 text-sm hover:underline font-medium">削除</button> : <div></div>}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition">キャンセル</button>
                    <button type="submit" className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition transform hover:scale-105">保存</button>
                    </div>
                  </div>
              </form>
                    </div>
                  </div>
        )}

        {/* Modal: Settings / ICS */}
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-800">カレンダー設定・連携</h3>
                <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
                  </div>
              <div className="p-6">
                <div className="mb-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">外部カレンダー読み込み (ICS)</h4>
                  <div className="flex flex-col gap-2">
                    <input className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-xs" placeholder="カレンダー名 (例: Google)" value={newIcsName} onChange={e => setNewIcsName(e.target.value)} />
                    <div className="flex gap-2">
                        <input className="flex-1 bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-xs" placeholder="https://.../basic.ics" value={newIcsUrl} onChange={e => setNewIcsUrl(e.target.value)} />
                        <button onClick={addIcsFeed} className="bg-blue-600 text-white px-3 rounded text-xs">追加</button>
                  </div>
                </div>
                  <div className="mt-3 space-y-1">
                    {icsFeeds.map(feed => (
                        <div key={feed.id} className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs">
                            <span className="truncate flex-1">{feed.name}</span>
                            <button onClick={() => removeIcsFeed(feed.id)} className="text-red-500 hover:text-red-700 ml-2">削除</button>
                        </div>
                    ))}
                </div>
                </div>
                <div className="text-[10px] text-gray-400">
                    ※Googleカレンダーの「設定と共有」→「iCal形式の非公開URL」などを貼り付けてください。
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
