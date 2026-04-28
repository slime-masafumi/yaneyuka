'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/AuthContext';
import {
  Schedule,
  ScheduleOption,
  ScheduleParticipant,
  ScheduleResponse,
  OptionSummary,
  ScheduleMode,
  ResponseValue,
} from '@/types/schedule';
import { 
  FiPlus, FiTrash2, FiCopy, FiCalendar, FiEdit2, FiCheck, 
  FiX, FiMinus, FiCircle, FiEye, FiShare2, FiList, FiUsers, FiMessageSquare, FiClock, FiRefreshCw 
} from 'react-icons/fi';

// 短いランダム文字列を生成
const generateSlug = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const ScheduleTool: React.FC = () => {
  const { currentUser } = useAuth();
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
  const [options, setOptions] = useState<ScheduleOption[]>([]);
  const [participants, setParticipants] = useState<ScheduleParticipant[]>([]);
  const [responses, setResponses] = useState<ScheduleResponse[]>([]);
  const [summaries, setSummaries] = useState<OptionSummary[]>([]);
  const [scheduleStats, setScheduleStats] = useState<Map<string, { participantCount: number; responseCount: number; optionCount: number }>>(new Map());

  // 表示制御用ステート
  const [showAllAnswers, setShowAllAnswers] = useState(false);

  // フォーム状態
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<ScheduleMode>('date');
  const [isPublic, setIsPublic] = useState(true);
  const [deadline, setDeadline] = useState('');
  const [optionLabels, setOptionLabels] = useState<string[]>(['']);
  const [optionDates, setOptionDates] = useState<string[]>(['']);
  const [optionTimes, setOptionTimes] = useState<Array<{ timeType: 'am' | 'pm' | 'custom'; startHour: string; startMinute: string; endHour: string; endMinute: string }>>([{ timeType: 'am', startHour: '09', startMinute: '00', endHour: '12', endMinute: '00' }]);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState<{ timeType: 'am' | 'pm' | 'custom'; startHour: string; startMinute: string }>({ timeType: 'am', startHour: '09', startMinute: '00' });

  // 参加者入力・回答入力
  const [participantName, setParticipantName] = useState('');
  const [participantComment, setParticipantComment] = useState('');
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  // 新規追加・編集時の一時的な回答保持用
  const [pendingResponses, setPendingResponses] = useState<Record<string, ResponseValue>>({});

  // コンポーネントがマウントされたときに一覧表示に戻す
  useEffect(() => {
    setView('list');
  }, []);

  // スケジュールの統計情報を取得
  const loadScheduleStats = useCallback(async (scheduleId: string) => {
    try {
      const [participantsSnapshot, responsesSnapshot, optionsSnapshot] = await Promise.all([
        getDocs(collection(db, 'schedules', scheduleId, 'participants')),
        getDocs(collection(db, 'schedules', scheduleId, 'responses')),
        getDocs(query(collection(db, 'schedules', scheduleId, 'options'), orderBy('order')))
      ]);

      const stats = {
        participantCount: participantsSnapshot.size,
        responseCount: responsesSnapshot.size,
        optionCount: optionsSnapshot.size,
      };

      setScheduleStats(prev => {
        const newMap = new Map(prev);
        newMap.set(scheduleId, stats);
        return newMap;
      });
    } catch (error) {
      console.error('統計情報取得エラー:', error);
    }
  }, []);

  // スケジュール一覧を再取得
  const refreshScheduleList = useCallback(async () => {
    if (!currentUser) return;

    try {
      const q = query(
        collection(db, 'schedules'),
        where('ownerUid', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      
      let snapshot;
      try {
        snapshot = await getDocs(q);
      } catch (orderByError: any) {
        const qWithoutOrderBy = query(
          collection(db, 'schedules'),
          where('ownerUid', '==', currentUser.uid)
        );
        snapshot = await getDocs(qWithoutOrderBy);
      }
      
      const data = snapshot.docs.map((doc) => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
        };
      }) as Schedule[];
      
      setSchedules(prev => {
        const merged = new Map<string, Schedule>();
        prev.forEach(s => {
          if (currentUser && s.ownerUid === currentUser.uid) {
            merged.set(s.id, s);
          }
        });
        data.forEach(s => {
          merged.set(s.id, s);
        });
        return Array.from(merged.values()).sort((a, b) => {
          const aTime = a.createdAt?.toMillis() || 0;
          const bTime = b.createdAt?.toMillis() || 0;
          return bTime - aTime;
        });
      });
      
      data.forEach(schedule => {
        loadScheduleStats(schedule.id);
      });
    } catch (error: any) {
      console.error('スケジュール一覧の再取得エラー:', error);
    }
  }, [currentUser, loadScheduleStats]);

  // 自分のスケジュール一覧を取得
  useEffect(() => {
    if (!currentUser) {
      setSchedules([]);
      return;
    }

    let isUnmounted = false;

    const q = query(
      collection(db, 'schedules'),
      where('ownerUid', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const cleanupOldSchedules = async (schedules: Schedule[]) => {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      for (const schedule of schedules) {
        if (!schedule.deadline) continue;
        const deadlineDate = schedule.deadline.toDate();
        
        if (deadlineDate < oneWeekAgo) {
          try {
            await deleteDoc(doc(db, 'schedules', schedule.id));
          } catch (error) {
            console.error('スケジュール削除エラー:', error);
          }
        }
      }
    };

    const loadOnce = async () => {
      try {
        let snapshot;
        try {
          snapshot = await getDocs(q);
        } catch (orderByError: any) {
          const qWithoutOrderBy = query(
            collection(db, 'schedules'),
            where('ownerUid', '==', currentUser.uid)
          );
          snapshot = await getDocs(qWithoutOrderBy);
        }
        
        if (isUnmounted) return;
        const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Schedule[];
        
        await cleanupOldSchedules(data);
        
        let updatedSnapshot;
        try {
          updatedSnapshot = await getDocs(q);
        } catch (orderByError: any) {
          const qWithoutOrderBy = query(
            collection(db, 'schedules'),
            where('ownerUid', '==', currentUser.uid)
          );
          updatedSnapshot = await getDocs(qWithoutOrderBy);
        }
        
        const updatedData = updatedSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Schedule[];
        
        setSchedules(prev => {
          const merged = new Map<string, Schedule>();
          prev.forEach(s => {
            if (currentUser && s.ownerUid === currentUser.uid) {
              merged.set(s.id, s);
            }
          });
          updatedData.forEach(s => {
            merged.set(s.id, s);
          });
          return Array.from(merged.values()).sort((a, b) => {
            const aTime = a.createdAt?.toMillis() || 0;
            const bTime = b.createdAt?.toMillis() || 0;
            return bTime - aTime;
          });
        });
        
        updatedData.forEach(schedule => {
          loadScheduleStats(schedule.id);
        });
      } catch (error: any) {
        console.error('スケジュール一覧の初期読み込みエラー:', error);
      }
    };

    loadOnce();

    return () => {
      isUnmounted = true;
    };
  }, [currentUser, loadScheduleStats]);

  // スケジュール詳細を読み込む
  const loadSchedule = useCallback(async (scheduleId: string) => {
    try {
      const scheduleDoc = await getDoc(doc(db, 'schedules', scheduleId));
      if (!scheduleDoc.exists()) return;

      const scheduleData = { id: scheduleDoc.id, ...scheduleDoc.data() } as Schedule;
      setCurrentSchedule(scheduleData);
      setShowAllAnswers(true);

      if (currentUser && scheduleData.ownerUid === currentUser.uid) {
        setSchedules(prev => {
          const exists = prev.find(s => s.id === scheduleId);
          if (!exists) {
            return [scheduleData, ...prev];
          }
          return prev.map(s => s.id === scheduleId ? scheduleData : s);
        });
      }

      const optionsSnapshot = await getDocs(query(collection(db, 'schedules', scheduleId, 'options'), orderBy('order')));
      const optionsData = optionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ScheduleOption[];
      setOptions(optionsData);

      const participantsSnapshot = await getDocs(query(collection(db, 'schedules', scheduleId, 'participants'), orderBy('createdAt', 'desc')));
      const participantsData = participantsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ScheduleParticipant[];
      setParticipants(participantsData);

      const responsesSnapshot = await getDocs(collection(db, 'schedules', scheduleId, 'responses'));
      const responsesData = responsesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ScheduleResponse[];
      setResponses(responsesData);

      const summaryMap = new Map<string, OptionSummary>();
      optionsData.forEach((opt) => {
        summaryMap.set(opt.id, { optionId: opt.id, yes: 0, maybe: 0, no: 0, total: 0 });
      });

      responsesData.forEach((resp) => {
        const summary = summaryMap.get(resp.optionId);
        if (summary) {
          summary[resp.value]++;
          summary.total++;
        }
      });
      setSummaries(Array.from(summaryMap.values()));
    } catch (error) {
      console.error('スケジュール読み込みエラー:', error);
      alert('スケジュールの読み込みに失敗しました');
    }
  }, [currentUser]);

  // スケジュール作成
  const handleCreateSchedule = async () => {
    if (!title.trim()) { alert('タイトルを入力してください'); return; }
    if (optionLabels.filter((l) => l.trim()).length === 0) { alert('候補を1つ以上入力してください'); return; }
    if (!currentUser || !currentUser.uid) { alert('スケジュールを作成するにはログインが必要です'); return; }

    try {
      const slug = generateSlug();
      const scheduleData: Omit<Schedule, 'id'> = {
        slug,
        title: title.trim(),
        description: description.trim() || undefined,
        ownerUid: currentUser.uid,
        ownerName: currentUser.username || currentUser.email?.split('@')[0] || '匿名',
        ownerEmail: currentUser.email || undefined,
        mode,
        isPublic,
        deadline: deadlineDate 
          ? (() => {
              const dateStr = deadlineDate.replace(/-/g, '/');
              let dateTimeStr: string;
              if (deadlineTime.timeType === 'custom') {
                dateTimeStr = `${dateStr} ${deadlineTime.startHour}:${deadlineTime.startMinute}:00`;
              } else if (deadlineTime.timeType === 'am') {
                dateTimeStr = `${dateStr} 11:59:59`;
              } else {
                dateTimeStr = `${dateStr} 23:59:59`;
              }
              return Timestamp.fromDate(new Date(dateTimeStr));
            })()
          : undefined,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
      };

      await setDoc(doc(db, 'schedules', slug), scheduleData);

      const validOptions = optionLabels
        .map((label, index) => ({ 
          label: label.trim(), 
          date: optionDates[index]?.trim(),
          time: optionTimes[index] || { startHour: '18', startMinute: '00', endHour: '19', endMinute: '00' }
        }))
        .filter((opt) => opt.label);

      for (let i = 0; i < validOptions.length; i++) {
        const opt = validOptions[i];
        let dateTime: Timestamp | undefined;
        
        if (opt.date && mode === 'date') {
          const timeRange = getTimeRange(opt.time?.timeType || 'am', opt.time?.startHour, opt.time?.startMinute, opt.time?.endHour, opt.time?.endMinute);
          const dateStr = opt.date.replace(/-/g, '/');
          const dateTimeStr = `${dateStr} ${timeRange.startHour}:${timeRange.startMinute}:00`;
          dateTime = Timestamp.fromDate(new Date(dateTimeStr));
        }
        
        await addDoc(collection(db, 'schedules', slug, 'options'), {
          label: opt.label,
          dateTime: dateTime,
          order: i,
        });
      }

      await refreshScheduleList();
      await loadSchedule(slug);
      resetForm();
      setView('list');
    } catch (error: any) {
      console.error('作成エラー:', error);
      alert('スケジュールの作成に失敗しました');
    }
  };

  // フォームリセット（新規追加用にデフォルト回答で初期化）
  const resetParticipantForm = () => {
    setParticipantName('');
    setParticipantComment('');
    setEditingParticipantId(null);
    const defaults: Record<string, ResponseValue> = {};
    options.forEach(opt => { defaults[opt.id] = 'maybe'; });
    setPendingResponses(defaults);
  };

  // 参加者を追加（左フォームから）
  const handleAddParticipant = async () => {
    if (!currentSchedule || !participantName.trim()) { alert('名前を入力してください'); return; }

    try {
      const participantRef = await addDoc(collection(db, 'schedules', currentSchedule.id, 'participants'), {
        name: participantName.trim(),
        comment: participantComment.trim() || undefined,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // pendingResponsesの内容を使って回答を保存
      // 指定がない場合は'maybe'とする
      const addPromises = options.map(option => {
        const value = pendingResponses[option.id] || 'maybe';
        return addDoc(collection(db, 'schedules', currentSchedule.id, 'responses'), {
          participantId: participantRef.id,
          optionId: option.id,
          value: value,
        });
      });
      await Promise.all(addPromises);

      resetParticipantForm();
      await loadSchedule(currentSchedule.id);
    } catch (error) {
      console.error('参加者追加エラー:', error);
      alert('参加者の追加に失敗しました');
    }
  };

  // 参加者情報を更新
  const handleUpdateParticipant = async () => {
    if (!currentSchedule || !editingParticipantId || !participantName.trim()) return;

    try {
        await updateDoc(doc(db, 'schedules', currentSchedule.id, 'participants', editingParticipantId), {
            name: participantName.trim(),
            comment: participantComment.trim() || null,
        });

        const updatePromises = options.map(async (option) => {
             const existing = responses.find(r => r.participantId === editingParticipantId && r.optionId === option.id);
             const newValue = pendingResponses[option.id] || 'maybe';
             
             if (existing) {
                 if (existing.value !== newValue) {
                     await updateDoc(doc(db, 'schedules', currentSchedule.id, 'responses', existing.id), { value: newValue });
                 }
             } else {
                 await addDoc(collection(db, 'schedules', currentSchedule.id, 'responses'), {
                     participantId: editingParticipantId,
                     optionId: option.id,
                     value: newValue
                 });
             }
        });
        await Promise.all(updatePromises);
        
        resetParticipantForm();
        await loadSchedule(currentSchedule.id);
    } catch (e) {
        console.error('更新エラー', e);
        alert('更新に失敗しました');
    }
  };

  // 編集モード開始
  const startEditing = (participant: ScheduleParticipant) => {
      setEditingParticipantId(participant.id);
      setParticipantName(participant.name);
      setParticipantComment(participant.comment || '');
      
      const userResponses: Record<string, ResponseValue> = {};
      options.forEach(opt => {
          const resp = responses.find(r => r.participantId === participant.id && r.optionId === opt.id);
          userResponses[opt.id] = resp ? resp.value : 'maybe';
      });
      setPendingResponses(userResponses);
  };

  // フォーム上の回答変更
  const handleResponseChange = (optionId: string, value: ResponseValue) => {
      setPendingResponses(prev => ({ ...prev, [optionId]: value }));
  };

  const updateComment = async (participantId: string, newComment: string) => {
    if (!currentSchedule) return;
    try {
        await updateDoc(doc(db, 'schedules', currentSchedule.id, 'participants', participantId), { comment: newComment });
        setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, comment: newComment } : p));
    } catch (error) { console.error('コメント更新エラー:', error); }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!currentUser || !window.confirm('このスケジュールを削除しますか？')) return;
    try {
      // サブコレクションを先に削除
      const subCollections = ['options', 'participants', 'responses'];
      for (const sub of subCollections) {
        const snap = await getDocs(collection(db, 'schedules', scheduleId, sub));
        await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
      }
      await deleteDoc(doc(db, 'schedules', scheduleId));
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
      if (currentSchedule?.id === scheduleId) {
        setCurrentSchedule(null);
        setOptions([]); setParticipants([]); setResponses([]); setSummaries([]);
      }
    } catch (error) { console.error('削除エラー:', error); }
  };

  const handleCopyUrl = async () => {
    if (!currentSchedule) return;
    const url = typeof window !== 'undefined' ? `${window.location.origin}/tool/schedule/${currentSchedule.slug}` : '';
    try { await navigator.clipboard.writeText(url); alert('URLをコピーしました'); } catch { alert('コピー失敗'); }
  };

  const handleLineShare = () => {
    if (!currentSchedule) return;
    const url = typeof window !== 'undefined' ? `${window.location.origin}/tool/schedule/${currentSchedule.slug}` : '';
    if (typeof window !== 'undefined') window.open(`https://line.me/R/msg/text/?${encodeURIComponent(url)}`, '_blank');
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setMode('date'); setIsPublic(true);
    setDeadlineDate(''); setDeadlineTime({ timeType: 'am', startHour: '09', startMinute: '00' });
    setOptionLabels(['']); setOptionDates(['']); setOptionTimes([{ timeType: 'am', startHour: '09', startMinute: '00', endHour: '12', endMinute: '00' }]);
  };

  const generateHours = () => Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
  const generateMinutes = () => ['00', '15', '30', '45'];
  
  const getTimeRange = (timeType: string, startHour?: string, startMinute?: string, endHour?: string, endMinute?: string) => {
    if (timeType === 'am') return { startHour: '09', startMinute: '00', endHour: '12', endMinute: '00' };
    if (timeType === 'pm') return { startHour: '13', startMinute: '00', endHour: '17', endMinute: '00' };
    return { startHour: startHour || '18', startMinute: startMinute || '00', endHour: endHour || '19', endMinute: endMinute || '00' };
  };

  const handleDateSelect = (index: number, date: string) => {
    const newDates = [...optionDates];
    newDates[index] = date;
    setOptionDates(newDates);
    const currentTime = optionTimes[index];
    if (!currentTime || !currentTime.timeType) {
      const newTimes = [...optionTimes];
      newTimes[index] = { timeType: 'am', startHour: '09', startMinute: '00', endHour: '12', endMinute: '00' };
      setOptionTimes(newTimes);
      updateLabelWithTime(index, date, 'am', newTimes[index]);
    } else {
      updateLabelWithTime(index, date, undefined, currentTime);
    }
  };

  const updateLabelWithTime = (index: number, date: string, timeTypeOverride?: any, timeOverride?: any) => {
    if (!date) return;
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const time = timeOverride || optionTimes[index];
    const actualTimeType = timeTypeOverride || time?.timeType;
    let timeStr = '';
    if (actualTimeType === 'am') timeStr = ' 午前';
    else if (actualTimeType === 'pm') timeStr = ' 午後';
    else if (actualTimeType === 'custom' && time) timeStr = ` ${time.startHour}:${time.startMinute}〜${time.endHour}:${time.endMinute}`;
    const newLabels = [...optionLabels];
    newLabels[index] = `${dateObj.getMonth() + 1}/${dateObj.getDate()}(${weekdays[dateObj.getDay()]})${timeStr}`;
    setOptionLabels(newLabels);
  };

  const addOption = () => {
    setOptionLabels([...optionLabels, '']);
    setOptionDates([...optionDates, '']);
    setOptionTimes([...optionTimes, { timeType: 'am', startHour: '09', startMinute: '00', endHour: '12', endMinute: '00' }]);
  };

  const removeOption = (index: number) => {
    if (optionLabels.length <= 1) return;
    setOptionLabels(optionLabels.filter((_, i) => i !== index));
    setOptionDates(optionDates.filter((_, i) => i !== index));
    setOptionTimes(optionTimes.filter((_, i) => i !== index));
  };

  // --- UIコンポーネント (Render Functions) ---

  // 右サイドバー：依頼中のスケジュールリスト
  // 【修正】数字を「回答数」から「参加人数」に変更
  const renderScheduleList = () => (
    <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col shadow-sm overflow-hidden">
      <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
        <h3 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
          <FiList className="w-3.5 h-3.5" /> 履歴一覧
        </h3>
        <div className="flex items-center gap-2">
            <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-mono">{schedules.length}</span>
            <button 
                onClick={() => { resetForm(); setView('create'); }}
                className="flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded text-[10px] hover:bg-blue-500 transition-colors shadow-sm font-bold"
                title="新規作成"
            >
                <FiPlus className="w-3 h-3" /> 新規
            </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50/30">
        {schedules.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p className="text-[10px]">スケジュールはありません</p>
          </div>
        ) : (
          schedules.map((schedule) => {
            const stats = scheduleStats.get(schedule.id);
            const isSelected = currentSchedule?.id === schedule.id && view === 'list';
            return (
              <div
                key={schedule.id}
                onClick={() => { setView('list'); loadSchedule(schedule.id); }}
                className={`group relative p-2.5 rounded border cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? 'bg-blue-50 border-blue-300 shadow-sm z-10' 
                    : 'bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h4 className={`text-xs font-bold line-clamp-2 leading-tight ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>
                    {schedule.title}
                  </h4>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(schedule.id); }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-0.5"
                    title="削除"
                  >
                    <FiTrash2 className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${schedule.mode === 'date' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                        {schedule.mode === 'date' ? '日程' : '投票'}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        <FiUsers className="w-3 h-3" />
                        <span>{stats?.participantCount ?? 0}</span>
                    </div>
                  </div>
                  {schedule.deadline && (
                    <span className="text-[9px] text-gray-400 font-mono">
                       〆{schedule.deadline.toDate().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // リスト表示
  if (view === 'list') {
    const maxYes = currentSchedule ? Math.max(...summaries.map((s) => s.yes), 0) : 0;
    
    return (
      <div className="flex flex-col h-full bg-gray-50/50">
        {/* 黒帯ヘッダー（維持） */}
        <div className="p-4 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
          <div>
            <h3 className="text-[13px] font-medium">スケジュール調整</h3>
            <p className="text-[11px] mt-0.5">会議やイベントの日程調整が簡単に。参加者の希望日程を集約し、簡易アンケートも作成可能</p>
          </div>
        </div>
        
        <div className="flex-1 flex overflow-hidden p-3 gap-3">
          {/* 左カラム：メインコンテンツ */}
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {currentSchedule ? (
              <div className="flex-1 overflow-y-auto">
                <div className="p-5">
                  {/* タイトルセクション */}
                  <div className="flex justify-between items-start mb-5 pb-4 border-b border-gray-100">
                    <div>
                      <h2 className="text-lg font-bold text-gray-800 leading-tight mb-2">{currentSchedule.title}</h2>
                      {currentSchedule.description && (
                        <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed bg-gray-50 p-2 rounded border border-gray-100 inline-block max-w-2xl">
                            {currentSchedule.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-4">
                       <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-medium border border-gray-200">
                        主催: {currentSchedule.ownerName}
                      </span>
                    </div>
                  </div>

                  {/* 共有エリア */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2 text-slate-700 font-bold text-xs shrink-0">
                      <FiShare2 className="w-3.5 h-3.5" />
                      共有URL
                    </div>
                    <div className="flex-1 w-full flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={typeof window !== 'undefined' ? `${window.location.origin}/tool/schedule/${currentSchedule.slug}` : ''}
                        className="flex-1 px-2.5 py-1.5 text-[11px] border border-gray-300 rounded bg-white text-gray-600 select-all focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        onClick={handleCopyUrl}
                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-[11px] hover:bg-gray-50 font-bold transition-colors shadow-sm whitespace-nowrap"
                      >
                        コピー
                      </button>
                      <button
                        onClick={handleLineShare}
                        className="px-3 py-1.5 bg-[#06C755] text-white border border-[#06C755] rounded text-[11px] hover:bg-[#05b34c] font-bold transition-colors shadow-sm whitespace-nowrap"
                      >
                        LINE
                      </button>
                    </div>
                  </div>

                  {/* 入力フォームと集計表のレイアウト */}
                  <div className="flex flex-col lg:flex-row gap-5">
                    
                    {/* 左側：入力フォーム（回答入力機能を追加） */}
                    <div className="lg:w-1/3 order-2 lg:order-1">
                      <div className="bg-white border border-blue-100 rounded-lg shadow-sm flex flex-col max-h-[calc(100vh-250px)] sticky top-0 ring-1 ring-blue-50">
                        <div className="p-4 border-b border-gray-100 shrink-0">
                          <div className="flex items-center gap-2 mb-3">
                            <FiEdit2 className="w-3.5 h-3.5 text-blue-600" />
                            <h3 className="text-xs font-bold text-gray-800">
                                {editingParticipantId ? '回答を修正' : 'あなたの回答を入力'}
                            </h3>
                            {editingParticipantId && (
                                <button onClick={resetParticipantForm} className="ml-auto text-[10px] text-gray-400 hover:text-gray-600">キャンセル</button>
                            )}
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-[11px] font-bold text-gray-600 mb-1">お名前 <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                value={participantName}
                                onChange={(e) => setParticipantName(e.target.value)}
                                placeholder="例: 山田 太郎"
                                className="w-full px-3 py-2 text-[12px] border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                              />
                            </div>
                          </div>
                        </div>

                        {/* 回答リスト（スクロール可能） */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
                            <label className="block text-[11px] font-bold text-gray-600 mb-2">日程・候補の回答</label>
                            <div className="space-y-2">
                                {options.map(option => {
                                    const val = pendingResponses[option.id] || 'maybe';
                                    return (
                                        <div key={option.id} className="bg-white p-2.5 rounded border border-gray-200 shadow-sm">
                                            <div className="text-[11px] font-bold text-gray-700 mb-2">{option.label}</div>
                                            <div className="flex bg-gray-100 rounded p-0.5">
                                                <button
                                                    onClick={() => handleResponseChange(option.id, 'yes')}
                                                    className={`flex-1 py-1 flex items-center justify-center gap-1 text-[10px] font-bold rounded-sm transition-all ${val === 'yes' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    <FiCircle className="w-3 h-3" /> OK
                                                </button>
                                                <button
                                                    onClick={() => handleResponseChange(option.id, 'maybe')}
                                                    className={`flex-1 py-1 flex items-center justify-center gap-1 text-[10px] font-bold rounded-sm transition-all ${val === 'maybe' ? 'bg-white text-yellow-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    △
                                                </button>
                                                <button
                                                    onClick={() => handleResponseChange(option.id, 'no')}
                                                    className={`flex-1 py-1 flex items-center justify-center gap-1 text-[10px] font-bold rounded-sm transition-all ${val === 'no' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    <FiX className="w-3 h-3" /> NG
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 shrink-0 bg-white rounded-b-lg">
                           <div className="mb-3">
                              <label className="block text-[11px] font-bold text-gray-600 mb-1">コメント（任意）</label>
                              <input
                                type="text"
                                value={participantComment}
                                onChange={(e) => setParticipantComment(e.target.value)}
                                placeholder="例: 13時以降なら空いています"
                                className="w-full px-3 py-2 text-[12px] border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                              />
                            </div>
                            {editingParticipantId ? (
                                <button
                                    onClick={handleUpdateParticipant}
                                    className="w-full py-2.5 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-500 shadow hover:shadow-md transition-all flex items-center justify-center gap-2"
                                >
                                    <FiRefreshCw className="w-3 h-3" /> 回答を更新する
                                </button>
                            ) : (
                                <button
                                    onClick={handleAddParticipant}
                                    className="w-full py-2.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-500 shadow hover:shadow-md transition-all flex items-center justify-center gap-2"
                                >
                                    <FiPlus className="w-3 h-3" /> 回答を追加する
                                </button>
                            )}
                        </div>
                      </div>
                    </div>

                    {/* 右側：集計表（Read-onlyに変更、編集ボタン追加） */}
                    <div className="lg:w-2/3 order-1 lg:order-2">
                      <div className="flex justify-between items-end mb-2">
                        <h3 className="text-xs font-bold text-gray-800 flex items-center gap-2">
                           <FiList className="w-3.5 h-3.5 text-gray-500" /> 
                           回答一覧 <span className="text-gray-400 font-normal">({participants.length}名)</span>
                        </h3>
                        <button 
                            onClick={() => setShowAllAnswers(!showAllAnswers)}
                            className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 font-medium"
                        >
                            <FiEye className="w-3 h-3" />
                            {showAllAnswers ? '詳細を隠す' : '全員の回答を見る'}
                        </button>
                      </div>

                      <div className="overflow-hidden border border-gray-200 rounded-lg shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-50 text-gray-600 text-[10px] uppercase tracking-wider border-b border-gray-200">
                                <th className="p-2.5 text-left font-bold min-w-[120px] sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                                  候補日程
                                </th>
                                {showAllAnswers && participants.map((p) => (
                                  <th key={p.id} className="p-2 text-center font-medium border-r border-gray-100 min-w-[70px] relative group">
                                    <div className="flex flex-col items-center">
                                      <span className="text-gray-900 font-bold text-xs truncate max-w-[80px]">{p.name}</span>
                                      {p.comment && (
                                        <div className="group relative">
                                            <FiMessageSquare className="w-3 h-3 text-gray-400 mt-0.5" />
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
                                                {p.comment}
                                            </div>
                                        </div>
                                      )}
                                      {/* 編集ボタン */}
                                      <button 
                                        onClick={() => startEditing(p)}
                                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                        title="修正する"
                                      >
                                          <FiEdit2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </th>
                                ))}
                                <th className="p-2 text-center font-bold text-gray-700 bg-blue-50/50 min-w-[80px]">
                                  集計
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-[12px]">
                              {options.map((option) => {
                                const summary = summaries.find((s) => s.optionId === option.id);
                                const isTopCandidate = summary && summary.yes === maxYes && maxYes > 0;

                                return (
                                  <tr key={option.id} className={`group transition-colors ${isTopCandidate ? 'bg-green-50/50' : 'hover:bg-gray-50'}`}>
                                    {/* 候補名 */}
                                    <td className={`p-2.5 font-bold text-gray-700 sticky left-0 z-10 border-r border-gray-100 ${isTopCandidate ? 'bg-[#f0fdf4]' : 'bg-white group-hover:bg-gray-50'}`}>
                                      <div className="flex items-center gap-2">
                                        {isTopCandidate && <FiCheck className="text-green-600 w-3.5 h-3.5 shrink-0" />}
                                        <span className={isTopCandidate ? 'text-green-800' : ''}>{option.label}</span>
                                      </div>
                                    </td>
                                    
                                    {/* 各参加者の回答（クリック無効化・Read Only） */}
                                    {showAllAnswers && participants.map((participant) => {
                                      const response = responses.find((r) => r.participantId === participant.id && r.optionId === option.id);
                                      const value = response?.value || 'maybe';
                                      return (
                                        <td key={participant.id} className="p-1.5 text-center border-r border-gray-50">
                                          <div
                                            className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-all text-[10px] font-bold shadow-sm ${
                                                value === 'yes' ? 'bg-green-100 text-green-700 border border-green-200' :
                                                value === 'maybe' ? 'bg-yellow-50 text-yellow-600 border border-yellow-200' :
                                                'bg-red-50 text-red-400 border border-red-100 opacity-60'
                                            }`}
                                          >
                                            {value === 'yes' && <FiCircle className="w-3.5 h-3.5" />}
                                            {value === 'maybe' && '△'}
                                            {value === 'no' && <FiX className="w-3.5 h-3.5" />}
                                          </div>
                                        </td>
                                      );
                                    })}
                                    
                                    {/* 集計セル */}
                                    <td className={`p-2 text-center ${isTopCandidate ? 'bg-green-100/20' : 'bg-blue-50/20'}`}>
                                        {summary && (
                                            <div className="flex justify-center items-center gap-1.5">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-bold text-green-600">{summary.yes}</span>
                                                </div>
                                                <span className="text-gray-300 text-[10px]">/</span>
                                                <div className="flex flex-col items-center">
                                                    <span className="font-bold text-yellow-600">{summary.maybe}</span>
                                                </div>
                                                <span className="text-gray-300 text-[10px]">/</span>
                                                <div className="flex flex-col items-center">
                                                    <span className="font-bold text-red-400 opacity-70">{summary.no}</span>
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                  </tr>
                                );
                              })}
                              {/* 備考行 */}
                               {showAllAnswers && (
                                <tr className="bg-gray-50 border-t border-gray-200">
                                    <td className="p-2.5 text-[10px] font-bold text-gray-500 sticky left-0 bg-gray-50 z-10 border-r border-gray-200">コメント</td>
                                    {participants.map((p) => (
                                        <td key={p.id} className="p-1 border-r border-gray-200">
                                            {/* コメントも編集ボタン経由で変更してもらうためRead onlyに */}
                                            <div className="text-[10px] text-center text-gray-600 px-1 py-0.5 truncate max-w-[80px]">
                                                {p.comment || '-'}
                                            </div>
                                        </td>
                                    ))}
                                    <td className="bg-gray-100"></td>
                                </tr>
                               )}
                            </tbody>
                          </table>
                          {!showAllAnswers && options.length > 0 && (
                            <div className="p-6 text-center bg-gray-50 text-gray-400 text-xs border-t border-gray-100">
                                <p className="mb-2">個別の回答は非表示になっています</p>
                                <button 
                                    onClick={() => setShowAllAnswers(true)}
                                    className="text-blue-600 hover:underline font-medium"
                                >
                                    詳細を表示する
                                </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {maxYes > 0 && (
                         <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-500 justify-end">
                            <span className="w-2.5 h-2.5 bg-[#f0fdf4] border border-green-100 rounded-sm inline-block"></span>
                            <span>緑色の行は「○」が最多の候補です</span>
                         </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // スケジュール未選択時
              <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 p-8">
                <div className="max-w-md w-full text-center">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                    <FiCalendar className="w-8 h-8 text-blue-300" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-800 mb-2">スケジュールを選択してください</h3>
                  <p className="text-xs text-gray-500 mb-6">右側のリストから履歴を選択するか、履歴一覧の「新規」から新しく作成してください。</p>
                  <button 
                    onClick={() => { resetForm(); setView('create'); }}
                    className="inline-flex items-center gap-2 bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-md text-xs font-bold hover:bg-blue-50 transition shadow-sm"
                  >
                    <FiPlus /> 新規スケジュール作成
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 右カラム：リスト（20%幅、最小200px） */}
          <div className="w-64 shrink-0 hidden md:block">
            {renderScheduleList()}
          </div>
        </div>
      </div>
    );
  }

  // 作成画面
  if (view === 'create') {
    return (
      <div className="flex flex-col h-full bg-gray-50/50">
        {/* 黒帯ヘッダー（維持） */}
        <div className="p-4 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
          <div>
            <h3 className="text-[13px] font-medium">スケジュール調整</h3>
            <p className="text-[11px] mt-0.5">会議やイベントの日程調整が簡単に。参加者の希望日程を集約し、簡易アンケートも作成可能</p>
          </div>
        </div>
        
        <div className="flex-1 flex overflow-hidden p-3 gap-3">
          {/* メインフォーム */}
          <div className="flex-1 min-h-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
                {/* 戻るボタンをフォームタイトル横に移動（黒帯には置かない） */}
                <div className="mb-6 border-b border-gray-100 pb-2 flex justify-between items-end">
                    <div>
                        <h2 className="text-base font-bold text-gray-800">新しいスケジュールを作成</h2>
                        <p className="text-xs text-gray-500 mt-1">基本情報と候補日程を入力してください</p>
                    </div>
                    <button
                        onClick={() => { setView('list'); resetForm(); }}
                        className="text-xs text-gray-500 hover:text-gray-700 underline flex items-center gap-1"
                    >
                        キャンセルして戻る
                    </button>
                </div>

                <div className="space-y-6">
                    {/* 基本情報セクション */}
                    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <div className="grid gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">タイトル <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-3 py-2 text-[12px] border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="例: 第3回 企画会議の日程調整"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">説明（任意）</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-3 py-2 text-[12px] border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    rows={2}
                                    placeholder="場所や議題などの詳細..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* 設定セクション（2カラム） */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <label className="block text-xs font-bold text-gray-700 mb-2">回答方式</label>
                            <div className="flex gap-3">
                                <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded cursor-pointer hover:border-blue-300 transition-colors flex-1">
                                    <input
                                        type="radio"
                                        value="date"
                                        checked={mode === 'date'}
                                        onChange={(e) => setMode(e.target.value as ScheduleMode)}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-xs font-medium">日程調整</span>
                                </label>
                                <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded cursor-pointer hover:border-blue-300 transition-colors flex-1">
                                    <input
                                        type="radio"
                                        value="question"
                                        checked={mode === 'question'}
                                        onChange={(e) => setMode(e.target.value as ScheduleMode)}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-xs font-medium">一般投票</span>
                                </label>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <label className="block text-xs font-bold text-gray-700 mb-2">公開設定</label>
                            <div className="flex gap-3">
                                <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded cursor-pointer hover:border-blue-300 transition-colors flex-1">
                                    <input
                                        type="radio"
                                        checked={isPublic}
                                        onChange={() => setIsPublic(true)}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-xs font-medium">URL公開</span>
                                </label>
                                <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded cursor-pointer hover:border-blue-300 transition-colors flex-1">
                                    <input
                                        type="radio"
                                        checked={!isPublic}
                                        onChange={() => setIsPublic(false)}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-xs font-medium">会員限定</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* 候補入力セクション */}
                    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-xs font-bold text-gray-700">
                                候補 {mode === 'date' ? '日程' : '項目'} <span className="text-red-500">*</span>
                            </label>
                            <button
                                onClick={addOption}
                                className="px-3 py-1.5 text-[10px] bg-blue-50 text-blue-600 border border-blue-100 rounded hover:bg-blue-100 flex items-center gap-1 transition font-bold"
                            >
                                <FiPlus className="w-3 h-3" /> 候補を追加
                            </button>
                        </div>
                        <div className="space-y-3">
                            {optionLabels.map((label, index) => (
                                <div key={index} className="p-3 bg-gray-50/50 border border-gray-200 rounded-lg group hover:border-blue-200 transition-colors">
                                    {mode === 'date' ? (
                                        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                            {/* 日付選択 */}
                                            <div className="relative w-full sm:w-auto">
                                                <input
                                                    type="date"
                                                    id={`date-input-${index}`}
                                                    value={optionDates[index] || ''}
                                                    onChange={(e) => handleDateSelect(index, e.target.value)}
                                                    className="w-full sm:w-40 px-3 py-1.5 text-[12px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                            {/* 時間選択 */}
                                            <div className="flex-1 flex flex-wrap gap-2 items-center w-full">
                                                 <div className="flex bg-white rounded border border-gray-200 overflow-hidden shrink-0">
                                                    {['am', 'pm', 'custom'].map((tType) => (
                                                        <label key={tType} className={`px-2 py-1.5 cursor-pointer text-[10px] font-medium transition-colors ${optionTimes[index]?.timeType === tType ? 'bg-blue-600 text-white' : 'hover:bg-gray-50 text-gray-600'}`}>
                                                            <input
                                                                type="radio"
                                                                name={`timeType-${index}`}
                                                                value={tType}
                                                                checked={optionTimes[index]?.timeType === tType}
                                                                onChange={(e) => {
                                                                    const newTimes = [...optionTimes];
                                                                    const defaultTimes = {
                                                                        am: { startHour: '09', startMinute: '00', endHour: '12', endMinute: '00' },
                                                                        pm: { startHour: '13', startMinute: '00', endHour: '17', endMinute: '00' },
                                                                        custom: { startHour: '18', startMinute: '00', endHour: '19', endMinute: '00' }
                                                                    };
                                                                    const t = tType as 'am' | 'pm' | 'custom';
                                                                    const updatedTime = { ...newTimes[index] || defaultTimes[t], timeType: t, ...defaultTimes[t] };
                                                                    if (tType === 'custom' && newTimes[index]?.timeType === 'custom') {
                                                                         updatedTime.startHour = newTimes[index].startHour;
                                                                         updatedTime.startMinute = newTimes[index].startMinute;
                                                                         updatedTime.endHour = newTimes[index].endHour;
                                                                         updatedTime.endMinute = newTimes[index].endMinute;
                                                                    }
                                                                    newTimes[index] = updatedTime;
                                                                    setOptionTimes(newTimes);
                                                                    updateLabelWithTime(index, optionDates[index], t, updatedTime);
                                                                }}
                                                                className="hidden"
                                                            />
                                                            {tType === 'am' ? '午前' : tType === 'pm' ? '午後' : '時間指定'}
                                                        </label>
                                                    ))}
                                                 </div>
                                                 
                                                 {optionTimes[index]?.timeType === 'custom' && (
                                                    <div className="flex items-center gap-1 text-[11px]">
                                                        <select
                                                            value={optionTimes[index]?.startHour || '18'}
                                                            onChange={(e) => {
                                                                const newTimes = [...optionTimes];
                                                                const currentTime = newTimes[index];
                                                                const updatedTime = { ...currentTime, startHour: e.target.value };
                                                                newTimes[index] = updatedTime;
                                                                setOptionTimes(newTimes);
                                                                updateLabelWithTime(index, optionDates[index], undefined, updatedTime);
                                                            }}
                                                            className="px-1 py-1 border border-gray-300 rounded bg-white"
                                                        >
                                                            {generateHours().map(h => <option key={h} value={h}>{h}</option>)}
                                                        </select>
                                                        :
                                                        <select
                                                            value={optionTimes[index]?.startMinute || '00'}
                                                            onChange={(e) => {
                                                                const newTimes = [...optionTimes];
                                                                const currentTime = newTimes[index];
                                                                const updatedTime = { ...currentTime, startMinute: e.target.value };
                                                                newTimes[index] = updatedTime;
                                                                setOptionTimes(newTimes);
                                                                updateLabelWithTime(index, optionDates[index], undefined, updatedTime);
                                                            }}
                                                            className="px-1 py-1 border border-gray-300 rounded bg-white"
                                                        >
                                                             {generateMinutes().map(m => <option key={m} value={m}>{m}</option>)}
                                                        </select>
                                                        <span className="text-gray-400">~</span>
                                                        <select
                                                            value={optionTimes[index]?.endHour || '19'}
                                                            onChange={(e) => {
                                                                const newTimes = [...optionTimes];
                                                                const currentTime = newTimes[index];
                                                                const updatedTime = { ...currentTime, endHour: e.target.value };
                                                                newTimes[index] = updatedTime;
                                                                setOptionTimes(newTimes);
                                                                updateLabelWithTime(index, optionDates[index], undefined, updatedTime);
                                                            }}
                                                            className="px-1 py-1 border border-gray-300 rounded bg-white"
                                                        >
                                                            {generateHours().map(h => <option key={h} value={h}>{h}</option>)}
                                                        </select>
                                                        :
                                                        <select
                                                            value={optionTimes[index]?.endMinute || '00'}
                                                            onChange={(e) => {
                                                                const newTimes = [...optionTimes];
                                                                const currentTime = newTimes[index];
                                                                const updatedTime = { ...currentTime, endMinute: e.target.value };
                                                                newTimes[index] = updatedTime;
                                                                setOptionTimes(newTimes);
                                                                updateLabelWithTime(index, optionDates[index], undefined, updatedTime);
                                                            }}
                                                            className="px-1 py-1 border border-gray-300 rounded bg-white"
                                                        >
                                                             {generateMinutes().map(m => <option key={m} value={m}>{m}</option>)}
                                                        </select>
                                                    </div>
                                                 )}
                                            </div>
                                            
                                            {/* 自動生成ラベル（確認用） */}
                                            <input
                                                type="text"
                                                value={label}
                                                readOnly
                                                className="w-full sm:w-1/3 px-3 py-1.5 text-[11px] border border-gray-200 bg-gray-100 text-gray-500 rounded focus:outline-none"
                                                placeholder="自動生成されます"
                                            />
                                            
                                            {optionLabels.length > 1 && (
                                                <button
                                                    onClick={() => removeOption(index)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                                                >
                                                    <FiTrash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                value={label}
                                                onChange={(e) => {
                                                    const newLabels = [...optionLabels];
                                                    newLabels[index] = e.target.value;
                                                    setOptionLabels(newLabels);
                                                }}
                                                className="flex-1 px-3 py-2 text-[12px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                placeholder="選択肢を入力 (例: A案、中華料理、など)"
                                            />
                                            {optionLabels.length > 1 && (
                                                <button
                                                    onClick={() => removeOption(index)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                                                >
                                                    <FiTrash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-center pb-6">
                    <button
                        onClick={handleCreateSchedule}
                        className="w-full max-w-sm py-3 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 shadow-md transform transition hover:-translate-y-0.5"
                    >
                        スケジュールを作成する
                    </button>
                </div>
            </div>
          </div>
          
           {/* 右カラム：リスト（作成画面でも表示しておくと便利） */}
           <div className="w-64 shrink-0 hidden md:block">
            {renderScheduleList()}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ScheduleTool;
