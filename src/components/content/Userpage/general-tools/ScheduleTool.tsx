'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ToolHeader from '../ToolHeader';
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
  writeBatch,
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
import { buildIcs } from '@/lib/ics';
import { candidateLabel, generateCandidates, responsesCsv, timeRangeOf, WEEKDAYS, type Slot } from '@/lib/scheduleBatch';
import { MEETING_KINDS, PARTY_ROLES, roleCoverage, bestOption } from '@/lib/scheduleRoles';
import {
  FiPlus, FiTrash2, FiCopy, FiCalendar, FiEdit2, FiCheck,
  FiX, FiMinus, FiCircle, FiEye, FiShare2, FiList, FiUsers, FiMessageSquare, FiClock, FiRefreshCw
} from 'react-icons/fi';

// 共有URL用のランダム文字列を生成。
// このslugは公開スケジュールへの唯一のアクセス制御なので、
// 予測可能な Math.random ではなく暗号論的乱数を使い、長さも10文字に伸ばす
// （62^10 ≈ 8.4×10^17 通り）。既存の8文字slugはそのまま使える。
const SLUG_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const SLUG_LENGTH = 10;

const generateSlug = (): string => {
  const bytes = new Uint8Array(SLUG_LENGTH);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < SLUG_LENGTH; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let result = '';
  for (let i = 0; i < SLUG_LENGTH; i++) {
    result += SLUG_CHARS.charAt(bytes[i] % SLUG_CHARS.length);
  }
  return result;
};

// 既存スケジュールと衝突しないslugを取る。
// slugはドキュメントIDそのものなので、衝突したまま setDoc すると
// 自分の既存スケジュールを黙って上書きしてしまう。
const generateUniqueSlug = async (): Promise<string> => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateSlug();
    const existing = await getDoc(doc(db, 'schedules', candidate));
    if (!existing.exists()) return candidate;
  }
  throw new Error('共有URLの生成に失敗しました');
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

  // 候補のまとめ作成
  const [showBatch, setShowBatch] = useState(false);
  const [batchFrom, setBatchFrom] = useState('');
  const [batchTo, setBatchTo] = useState('');
  const [batchDays, setBatchDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [batchSlots, setBatchSlots] = useState<Slot[]>(['pm']);
  // 確定・書き出しで選んでいる候補
  const [fixOptionId, setFixOptionId] = useState('');
  const [fixMsg, setFixMsg] = useState('');
  // 作成時の種別と、必ず出てほしい役割（作ってからでないと付けられなかったので、作成フォームにも出す）
  const [kind, setKind] = useState('');
  const [createRoles, setCreateRoles] = useState<string[]>([]);
  // 見出しの「できること」を押したときの一言（ログインが要る・スケジュールを選ぶ必要がある等）
  const [headNotice, setHeadNotice] = useState('');
  const batchRef = useRef<HTMLDivElement>(null);
  const deadlineRef = useRef<HTMLDivElement>(null);
  const fixRef = useRef<HTMLDivElement>(null);
  const rolesRef = useRef<HTMLDivElement>(null);
  const createRolesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!headNotice) return;
    const t = setTimeout(() => setHeadNotice(''), 7000);
    return () => clearTimeout(t);
  }, [headNotice]);

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

    // 締切から1週間経過したスケジュールを自動削除する。
    // ※この挙動はUI上どこにも書かれておらず、ユーザーには予告なくデータが消える。
    //   仕様として残すか要確認（残す場合は画面に明示すべき）。
    const cleanupOldSchedules = async (schedules: Schedule[]): Promise<Set<string>> => {
      const removed = new Set<string>();
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      for (const schedule of schedules) {
        if (!schedule.deadline) continue;
        if (schedule.deadline.toDate() >= oneWeekAgo) continue;
        try {
          await deleteDoc(doc(db, 'schedules', schedule.id));
          removed.add(schedule.id);
        } catch (error) {
          console.error('スケジュール削除エラー:', error);
        }
      }
      return removed;
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

        // 削除対象のIDを受け取り、取得済みの一覧から差し引く。
        // 以前は削除後にもう一度コレクション全体を getDocs しており、
        // 表示のたびに読み取り回数が倍になっていた。
        const removedIds = await cleanupOldSchedules(data);
        const updatedData = removedIds.size
          ? data.filter((s) => !removedIds.has(s.id))
          : data;

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
      const slug = await generateUniqueSlug();
      const scheduleData: Omit<Schedule, 'id'> = {
        slug,
        title: title.trim(),
        description: description.trim() || undefined,
        ownerUid: currentUser.uid,
        ownerName: currentUser.username || currentUser.email?.split('@')[0] || '匿名',
        // ownerEmail は保存しない。
        // このドキュメントは isPublic な場合に誰でも読めるため、
        // 共有URLを受け取った全員に作成者のメールアドレスが見えてしまっていた。
        // アプリ内でこの値を読んでいる箇所も無い。
        mode,
        isPublic,
        ...(kind ? { kind } : {}),
        ...(createRoles.length ? { requiredRoles: createRoles } : {}),
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

      // pendingResponsesの内容を使って回答を保存（指定がない場合は'maybe'）。
      // 候補数ぶんの個別書き込みではなく1バッチにまとめる（途中で失敗して
      // 一部だけ登録された状態になるのも防げる）
      const batch = writeBatch(db);
      options.forEach(option => {
        const responseRef = doc(collection(db, 'schedules', currentSchedule.id, 'responses'));
        batch.set(responseRef, {
          participantId: participantRef.id,
          optionId: option.id,
          value: pendingResponses[option.id] || 'maybe',
        });
      });
      await batch.commit();

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

        // 候補ごとの回答をまとめて1バッチで更新する
        const batch = writeBatch(db);
        let hasChange = false;
        options.forEach((option) => {
             const existing = responses.find(r => r.participantId === editingParticipantId && r.optionId === option.id);
             const newValue = pendingResponses[option.id] || 'maybe';

             if (existing) {
                 if (existing.value !== newValue) {
                     batch.update(doc(db, 'schedules', currentSchedule.id, 'responses', existing.id), { value: newValue });
                     hasChange = true;
                 }
             } else {
                 batch.set(doc(collection(db, 'schedules', currentSchedule.id, 'responses')), {
                     participantId: editingParticipantId,
                     optionId: option.id,
                     value: newValue,
                 });
                 hasChange = true;
             }
        });
        if (hasChange) await batch.commit();


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
    setTitle(''); setDescription(''); setMode('date'); setIsPublic(true); setKind(''); setCreateRoles([]);
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

  /** 期間・曜日・時間帯から候補をまとめて入れる（空の行は置き換える） */
  const applyBatch = () => {
    const list = generateCandidates(batchFrom, batchTo, batchDays, batchSlots);
    if (!list.length) return alert('期間・曜日・時間帯を選んでください');
    const keep = optionLabels.map((l, i) => i).filter((i) => optionLabels[i].trim());
    const time = (slot: Slot) => (slot === 'am'
      ? { timeType: 'am' as const, startHour: '09', startMinute: '00', endHour: '12', endMinute: '00' }
      : { timeType: 'pm' as const, startHour: '13', startMinute: '00', endHour: '17', endMinute: '00' });
    setOptionLabels([...keep.map((i) => optionLabels[i]), ...list.map((c) => candidateLabel(c.date, c.slot))]);
    setOptionDates([...keep.map((i) => optionDates[i] ?? ''), ...list.map((c) => c.date)]);
    setOptionTimes([...keep.map((i) => optionTimes[i]), ...list.map((c) => time(c.slot))]);
    setShowBatch(false);
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

  // --- 確定・書き出し ---
  const saveFile = (text: string, name: string, type: string) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const isoLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  // 役割: 主催者が回答者に付けた役割と、必ず出てほしい役割
  const roleMap = currentSchedule?.roles ?? {};
  const requiredRoles = currentSchedule?.requiredRoles ?? [];
  const coverage = roleCoverage(options, participants, responses, roleMap, requiredRoles);
  const isScheduleOwner = !!currentUser && currentSchedule?.ownerUid === currentUser.uid;
  const patchSchedule = async (patch: Record<string, string | string[] | Record<string, string> | Timestamp | null>, local: Partial<Schedule>) => {
    if (!currentSchedule) return;
    setCurrentSchedule({ ...currentSchedule, ...local });
    setSchedules((prev) => prev.map((s) => (s.id === currentSchedule.id ? { ...s, ...local } : s)));
    try { await updateDoc(doc(db, 'schedules', currentSchedule.id), patch); } catch (e) { console.error('スケジュールの更新に失敗', e); }
  };
  /** 確定の候補: 必須の役割が全員○の日 → ○ が一番多い日（同数なら先の候補） */
  const bestOptionId = () => bestOption(coverage);
  const fixedEvent = () => {
    const o = options.find((x) => x.id === (fixOptionId || bestOptionId()));
    if (!o || !o.dateTime || !currentSchedule) return null;
    const t = timeRangeOf(o.label);
    return {
      id: `${currentSchedule.slug}-${o.id}`,
      title: currentSchedule.kind ? `【${currentSchedule.kind}】${currentSchedule.title}` : currentSchedule.title,
      date: isoLocal(o.dateTime.toDate()),
      allDay: !t,
      startHour: t?.startHour ?? '00',
      startMinute: t?.startMinute ?? '00',
      endHour: t?.endHour ?? '00',
      endMinute: t?.endMinute ?? '00',
      details: [currentSchedule.description, `日程調整: ${window.location.origin}/tool/schedule/${currentSchedule.slug}`].filter(Boolean).join('\n'),
    };
  };
  const addFixedToMyCalendar = async () => {
    const ev = fixedEvent();
    if (!ev || !currentUser) return;
    const { id: _id, ...rest } = ev;
    void _id;
    await addDoc(collection(db, 'users', currentUser.uid, 'calendarEvents'), { ...rest, category: currentSchedule?.kind || '会議', color: '#3B82F6', recurrenceType: 'none', spanPart: 'single' });
    setFixMsg(`Myカレンダーの ${ev.date} に入れました`);
  };

  // --- UIコンポーネント (Render Functions) ---

  /** 締切の日時（作成フォームの「日付 + 午前中 / その日中 / 時刻」と同じ決め方） */
  const deadlineOf = (date: string, t: { timeType: 'am' | 'pm' | 'custom'; startHour: string; startMinute: string }) => {
    const d = date.replace(/-/g, '/');
    const hm = t.timeType === 'custom' ? `${t.startHour}:${t.startMinute}:00` : t.timeType === 'am' ? '11:59:59' : '23:59:59';
    return Timestamp.fromDate(new Date(`${d} ${hm}`));
  };
  const scrollToRef = (r: React.RefObject<HTMLDivElement | null>) =>
    setTimeout(() => r.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  /** 作成画面を開いてから、その場所へ移る */
  const openCreateAt = (r: React.RefObject<HTMLDivElement | null>) => {
    if (view !== 'create') { resetForm(); setView('create'); }
    scrollToRef(r);
  };
  const needLogin = () => {
    if (currentUser) return false;
    setHeadNotice('スケジュール調整を作るにはログイン（無料の会員登録）が必要です。回答だけなら、共有URLからログインなしでできます');
    return true;
  };
  const inList = view === 'list' && !!currentSchedule;

  const header = (
    <>
      <ToolHeader
        no="09"
        code="SCHEDULE"
        title="スケジュール調整"
        description="現場定例・検査・施主打合せの日程を、施主・設計・施工など必要な人が揃う日に決める"
        aside={<span className="yy-mono text-[10px] tracking-[0.12em] uppercase">{schedules.length} SCHEDULES</span>}
        features={[
          {
            label: 'まとめて候補を作る',
            login: true,
            active: view === 'create' && showBatch,
            hint: '期間・曜日・午前午後から候補を一度に並べます（例: 来週の平日の午後）',
            onClick: () => { if (needLogin()) return; setMode('date'); setShowBatch(true); openCreateAt(batchRef); },
          },
          {
            label: '締切',
            login: true,
            hint: '回答の締切。締切の 24 時間前にベルでお知らせし、過ぎると回答を締め切ります',
            onClick: () => {
              if (needLogin()) return;
              if (inList && isScheduleOwner) scrollToRef(deadlineRef);
              else openCreateAt(deadlineRef);
            },
          },
          {
            label: '確定・.ics',
            login: true,
            hint: '決めた日を .ics（Google・Outlook・iPhone）で保存、または Myカレンダーに入れます',
            onClick: () => {
              if (needLogin()) return;
              if (inList) scrollToRef(fixRef);
              else setHeadNotice('右の一覧（スマホでは下）からスケジュールを選ぶと、確定と .ics の書き出しができます');
            },
          },
          {
            label: '回答CSV',
            login: true,
            hint: '全員の回答を表計算ソフトで開ける CSV に',
            onClick: () => {
              if (needLogin()) return;
              if (inList) scrollToRef(fixRef);
              else setHeadNotice('スケジュールを選ぶと、回答を CSV で保存できます');
            },
          },
          {
            label: '役割',
            login: true,
            hint: '施主・設計・施工など、必ず出てほしい役割が揃う日を探します',
            onClick: () => {
              if (needLogin()) return;
              if (inList && isScheduleOwner) scrollToRef(rolesRef);
              else openCreateAt(createRolesRef);
            },
          },
        ]}
      />
      {headNotice && (
        <p className="px-4 py-1.5 text-[11px] text-gray-600 border-b border-gray-200 bg-white shrink-0">
          {headNotice}
          <button type="button" onClick={() => setHeadNotice('')} className="ml-2 underline text-gray-500">閉じる</button>
        </p>
      )}
    </>
  );

  /** 締切の入力（作成フォームと、作成後の主催者の設定で共通） */
  const deadlineFields = (
    date: string,
    t: { timeType: 'am' | 'pm' | 'custom'; startHour: string; startMinute: string },
    onDate: (v: string) => void,
    onTime: (v: { timeType: 'am' | 'pm' | 'custom'; startHour: string; startMinute: string }) => void,
  ) => (
    <div className="flex flex-wrap items-center gap-2 text-[11px]">
      <input type="date" value={date} onChange={(e) => onDate(e.target.value)} className="px-2 py-1 border border-gray-300" />
      <select
        value={t.timeType}
        onChange={(e) => onTime({ ...t, timeType: e.target.value as 'am' | 'pm' | 'custom' })}
        className="px-2 py-1 border border-gray-300"
        disabled={!date}
      >
        <option value="am">午前中（11:59）</option>
        <option value="pm">その日中（23:59）</option>
        <option value="custom">時刻を指定</option>
      </select>
      {t.timeType === 'custom' && (
        <span className="flex items-center gap-1">
          <select value={t.startHour} onChange={(e) => onTime({ ...t, startHour: e.target.value })} className="px-1 py-1 border border-gray-300">
            {generateHours().map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          :
          <select value={t.startMinute} onChange={(e) => onTime({ ...t, startMinute: e.target.value })} className="px-1 py-1 border border-gray-300">
            {generateMinutes().map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </span>
      )}
    </div>
  );

  // 右サイドバー：依頼中のスケジュールリスト
  // 【修正】数字を「回答数」から「参加人数」に変更
  const renderScheduleList = () => (
    <div className="bg-white border border-[#3b3b3b] h-full flex flex-col overflow-hidden">
      <div className="px-3 py-2.5 border-b border-gray-200 flex justify-between items-center shrink-0">
        <h3 className="yy-mono text-[10px] tracking-[0.12em] uppercase text-gray-500 flex items-center gap-1.5">
          <FiList className="w-3.5 h-3.5" /> 履歴一覧
        </h3>
        <div className="flex items-center gap-2">
            <span className="yy-mono text-[10px] text-gray-400">{schedules.length}</span>
            <button
                onClick={() => { if (needLogin()) return; resetForm(); setView('create'); }}
                className="yy-btn yy-btn--primary flex items-center gap-1 !px-2 !py-1 !text-[10px]"
                title="新規作成"
            >
                <FiPlus className="w-3 h-3" /> 新規
            </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {schedules.length === 0 ? (
          <p className="text-[11px] text-gray-500 px-3 py-4">スケジュールはありません。</p>
        ) : (
          schedules.map((schedule) => {
            const stats = scheduleStats.get(schedule.id);
            const isSelected = currentSchedule?.id === schedule.id && view === 'list';
            return (
              <div
                key={schedule.id}
                onClick={() => { setView('list'); loadSchedule(schedule.id); }}
                className={`group relative px-3 py-2.5 border-b border-gray-200 border-l cursor-pointer ${
                  isSelected
                    ? 'bg-gray-50 border-l-[#52AA96]'
                    : 'bg-white border-l-transparent hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h4 className={`text-[11px] font-bold line-clamp-2 leading-tight ${isSelected ? 'text-[#141414]' : 'text-gray-700'}`}>
                    {schedule.kind && <span className="font-light text-gray-500 mr-1">{schedule.kind}</span>}
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
                    <span className="yy-mono px-1 text-[9px] tracking-[0.08em] border border-gray-300 text-gray-500">
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
      <div className="flex flex-col h-full bg-white">
        {header}

        <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden p-3 gap-3">
          {/* 左カラム：メインコンテンツ */}
          <div className="flex-1 flex flex-col min-h-0 bg-white border border-[#3b3b3b] overflow-hidden">
            {currentSchedule ? (
              <div className="flex-1 overflow-y-auto">
                <div className="p-5">
                  {/* タイトルセクション */}
                  <div className="flex justify-between items-start mb-5 pb-4 border-b border-gray-100">
                    <div>
                      <h2 className="text-[12px] font-bold text-[#141414] leading-tight mb-2">
                        {currentSchedule.kind && <span className="yy-mono text-[10px] tracking-[0.08em] font-normal border border-gray-400 px-1 mr-2 align-middle">{currentSchedule.kind}</span>}
                        {currentSchedule.title}
                      </h2>
                      {currentSchedule.description && (
                        <p className="text-[11px] text-gray-600 whitespace-pre-wrap leading-relaxed pl-2 border-l border-gray-300 inline-block max-w-2xl">
                            {currentSchedule.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-4">
                       <span className="yy-mono text-[10px] tracking-[0.08em] text-gray-500">
                        主催: {currentSchedule.ownerName}
                      </span>
                      {currentSchedule.deadline && (
                        <span className="block yy-mono text-[10px] tracking-[0.08em] text-gray-500 mt-1">
                          〆 {currentSchedule.deadline.toDate().toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 共有エリア */}
                  <div className="border-y border-gray-200 py-3 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2 text-gray-700 font-bold text-[11px] shrink-0">
                      <FiShare2 className="w-3.5 h-3.5" />
                      共有URL
                    </div>
                    <div className="flex-1 w-full flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={typeof window !== 'undefined' ? `${window.location.origin}/tool/schedule/${currentSchedule.slug}` : ''}
                        className="flex-1 min-w-0 px-2.5 py-1.5 text-[11px] border border-gray-300 bg-white text-gray-600 select-all outline-none yy-mono"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        onClick={handleCopyUrl}
                        className="yy-btn whitespace-nowrap"
                      >
                        コピー
                      </button>
                      <button
                        onClick={handleLineShare}
                        className="yy-btn whitespace-nowrap"
                        title="LINE で共有URLを送る"
                      >
                        LINE
                      </button>
                    </div>
                  </div>

                  {/* 確定・書き出し */}
                  <div ref={fixRef} className="border border-[#3b3b3b] p-3 mb-6 flex flex-wrap items-center gap-2 text-[11px] scroll-mt-2">
                    <span className="yy-mono text-[10px] tracking-[0.12em] uppercase text-gray-500 mr-1">確定・書き出し</span>
                    <select
                      value={fixOptionId || bestOptionId()}
                      onChange={(e) => { setFixOptionId(e.target.value); setFixMsg(''); }}
                      className="px-2 py-1 border border-gray-300 max-w-[260px]"
                    >
                      {options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}（○ {summaries.find((x) => x.optionId === o.id)?.yes ?? 0}）
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!fixedEvent()}
                      onClick={() => {
                        const ev = fixedEvent();
                        if (ev) saveFile(buildIcs([ev]), `${currentSchedule.title}.ics`, 'text/calendar');
                      }}
                      className="px-3 py-1 border border-[#3b3b3b] bg-white hover:bg-gray-50 disabled:opacity-40"
                      title="Google・Outlook・iPhone のカレンダーに取り込めるファイル"
                    >
                      .ics で保存
                    </button>
                    {currentUser && (
                      <button type="button" disabled={!fixedEvent()} onClick={() => void addFixedToMyCalendar()} className="px-3 py-1 border border-[#3b3b3b] bg-white hover:bg-gray-50 disabled:opacity-40">
                        Myカレンダーに入れる
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!participants.length}
                      onClick={() => saveFile(responsesCsv(options, participants, responses), `${currentSchedule.title}_回答.csv`, 'text/csv;charset=utf-8')}
                      className="px-3 py-1 border border-[#3b3b3b] bg-white hover:bg-gray-50 disabled:opacity-40"
                    >
                      回答を CSV で保存
                    </button>
                    {fixMsg && <span className="text-gray-700"><FiCheck className="inline text-[#52AA96] mr-1" />{fixMsg}</span>}
                    {!fixedEvent() && options.length > 0 && <span className="text-gray-400">日付の無い候補（アンケート）はカレンダーに入れられません</span>}
                  </div>

                  {/* 種別と役割（主催者だけ）。回答者には役割を聞かず、主催者が付ける */}
                  {isScheduleOwner && (
                    <div ref={rolesRef} className="border border-gray-300 p-3 mb-6 text-[11px] space-y-2 scroll-mt-2">
                      <p className="yy-mono text-[10px] tracking-[0.12em] uppercase text-gray-500">種別・役割・締切（主催者だけに見えます）</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-gray-700">種別</span>
                        <select
                          value={currentSchedule.kind ?? ''}
                          onChange={(e) => void patchSchedule({ kind: e.target.value || null }, { kind: e.target.value || undefined })}
                          className="px-2 py-1 border border-gray-300"
                        >
                          <option value="">なし</option>
                          {MEETING_KINDS.map((k) => <option key={k}>{k}</option>)}
                        </select>
                        <span className="font-bold text-gray-700 ml-3">必ず出てほしい役割</span>
                        {PARTY_ROLES.filter((r) => r !== 'その他').map((r) => (
                          <label key={r} className="flex items-center gap-0.5">
                            <input
                              type="checkbox"
                              checked={requiredRoles.includes(r)}
                              onChange={(e) => {
                                const next = e.target.checked ? [...requiredRoles, r] : requiredRoles.filter((x) => x !== r);
                                void patchSchedule({ requiredRoles: next }, { requiredRoles: next });
                              }}
                            />
                            {r}
                          </label>
                        ))}
                      </div>
                      {participants.length === 0 && (
                        <p className="flex flex-wrap items-center gap-x-2 text-gray-400">
                          <span className="font-bold text-gray-400">回答者の役割</span>
                          回答が届くと、ここで一人ずつ役割（{PARTY_ROLES.filter((r) => r !== 'その他').join('・')}）を付けられます。必ず出てほしい役割が揃う日を探して、確定の候補にします。
                        </p>
                      )}
                      {participants.length > 0 && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-bold text-gray-700">回答者の役割</span>
                          {participants.map((p) => (
                            <label key={p.id} className="flex items-center gap-1">
                              <span className="truncate max-w-[100px]">{p.name}</span>
                              <select
                                value={roleMap[p.id] ?? ''}
                                onChange={(e) => {
                                  const next = { ...roleMap };
                                  if (e.target.value) next[p.id] = e.target.value;
                                  else delete next[p.id];
                                  void patchSchedule({ roles: next }, { roles: next });
                                }}
                                className="px-1 py-0.5 border border-gray-300"
                              >
                                <option value="">—</option>
                                {PARTY_ROLES.map((r) => <option key={r}>{r}</option>)}
                              </select>
                            </label>
                          ))}
                        </div>
                      )}
                      {requiredRoles.length > 0 && options.length > 0 && (
                        <ul className="border-t border-gray-200 pt-1.5 space-y-0.5">
                          {coverage.map((c) => {
                            const o = options.find((x) => x.id === c.optionId);
                            return (
                              <li key={c.optionId} className="flex gap-2">
                                <span className={`w-4 ${c.allOk ? 'text-[#52AA96] font-bold' : 'text-gray-300'}`}>{c.allOk ? '◎' : '・'}</span>
                                <span className="min-w-[160px]">{o?.label}</span>
                                <span className="text-gray-500">
                                  {c.allOk ? '必要な役割が全員 ○' : [c.missing.length ? `出られない: ${c.missing.join('・')}` : '', c.weak.length ? `△のみ: ${c.weak.join('・')}` : ''].filter(Boolean).join('　')}
                                </span>
                              </li>
                            );
                          })}
                          <li className="text-gray-400 pt-0.5">確定・書き出しの候補は、必要な役割が全員 ○ の日を先に選びます。役割を付けていない回答者は数に入りません。</li>
                        </ul>
                      )}
                      <div ref={deadlineRef} className="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-2 scroll-mt-2">
                        <span className="font-bold text-gray-700">締切</span>
                        {deadlineFields(
                          currentSchedule.deadline ? isoLocal(currentSchedule.deadline.toDate()) : '',
                          (() => {
                            const d = currentSchedule.deadline?.toDate();
                            if (!d) return { timeType: 'pm' as const, startHour: '18', startMinute: '00' };
                            const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                            if (hm === '11:59') return { timeType: 'am' as const, startHour: '11', startMinute: '59' };
                            if (hm === '23:59') return { timeType: 'pm' as const, startHour: '23', startMinute: '59' };
                            return { timeType: 'custom' as const, startHour: String(d.getHours()).padStart(2, '0'), startMinute: String(d.getMinutes()).padStart(2, '0') };
                          })(),
                          (date) => {
                            if (!date) {
                              void patchSchedule({ deadline: null }, { deadline: undefined });
                              return;
                            }
                            const ts = deadlineOf(date, { timeType: 'pm', startHour: '23', startMinute: '59' });
                            void patchSchedule({ deadline: ts }, { deadline: ts });
                          },
                          (t) => {
                            if (!currentSchedule.deadline) return;
                            const ts = deadlineOf(isoLocal(currentSchedule.deadline.toDate()), t);
                            void patchSchedule({ deadline: ts }, { deadline: ts });
                          },
                        )}
                        <span className="text-gray-400">締切の 24 時間前にベルでお知らせします。過ぎると回答を受け付けません</span>
                      </div>
                    </div>
                  )}

                  {/* 入力フォームと集計表のレイアウト */}
                  <div className="flex flex-col lg:flex-row gap-5">

                    {/* 左側：入力フォーム（回答入力機能を追加） */}
                    <div className="lg:w-1/3 order-2 lg:order-1">
                      <div className="bg-white border border-gray-300 flex flex-col max-h-[calc(100vh-250px)] sticky top-0">
                        <div className="p-4 border-b border-gray-200 shrink-0">
                          <div className="flex items-center gap-2 mb-3">
                            <FiEdit2 className="w-3.5 h-3.5 text-gray-500" />
                            <h3 className="text-[11px] font-bold text-gray-800">
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
                                className="w-full px-3 py-2 text-[12px] border border-gray-300 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* 回答リスト（スクロール可能） */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <label className="block text-[11px] font-bold text-gray-600 mb-2">日程・候補の回答</label>
                            <div className="space-y-2">
                                {options.map(option => {
                                    const val = pendingResponses[option.id] || 'maybe';
                                    return (
                                        <div key={option.id} className="bg-white py-2 border-b border-gray-200">
                                            <div className="text-[11px] font-bold text-gray-700 mb-2">{option.label}</div>
                                            <div className="flex border border-gray-300">
                                                <button
                                                    onClick={() => handleResponseChange(option.id, 'yes')}
                                                    className={`flex-1 py-1 flex items-center justify-center gap-1 text-[10px] font-bold ${val === 'yes' ? 'bg-[#141414] text-white' : 'text-gray-400 hover:text-gray-700'}`}
                                                >
                                                    <FiCircle className="w-3 h-3" /> OK
                                                </button>
                                                <button
                                                    onClick={() => handleResponseChange(option.id, 'maybe')}
                                                    className={`flex-1 py-1 flex items-center justify-center gap-1 text-[10px] font-bold ${val === 'maybe' ? 'bg-[#141414] text-white' : 'text-gray-400 hover:text-gray-700'}`}
                                                >
                                                    △
                                                </button>
                                                <button
                                                    onClick={() => handleResponseChange(option.id, 'no')}
                                                    className={`flex-1 py-1 flex items-center justify-center gap-1 text-[10px] font-bold ${val === 'no' ? 'bg-[#141414] text-white' : 'text-gray-400 hover:text-gray-700'}`}
                                                >
                                                    <FiX className="w-3 h-3" /> NG
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-200 shrink-0 bg-white">
                           <div className="mb-3">
                              <label className="block text-[11px] font-bold text-gray-600 mb-1">コメント（任意）</label>
                              <input
                                type="text"
                                value={participantComment}
                                onChange={(e) => setParticipantComment(e.target.value)}
                                placeholder="例: 13時以降なら空いています"
                                className="w-full px-3 py-2 text-[12px] border border-gray-300 focus:outline-none"
                              />
                            </div>
                            {editingParticipantId ? (
                                <button
                                    onClick={handleUpdateParticipant}
                                    className="yy-btn yy-btn--primary w-full !py-2.5 flex items-center justify-center gap-2"
                                >
                                    <FiRefreshCw className="w-3 h-3" /> 回答を更新する
                                </button>
                            ) : (
                                <button
                                    onClick={handleAddParticipant}
                                    className="yy-btn yy-btn--primary w-full !py-2.5 flex items-center justify-center gap-2"
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
                        <h3 className="text-[11px] font-bold text-gray-800 flex items-center gap-2">
                           <FiList className="w-3.5 h-3.5 text-gray-500" />
                           回答一覧 <span className="text-gray-400 font-normal">({participants.length}名)</span>
                        </h3>
                        <button
                            onClick={() => setShowAllAnswers(!showAllAnswers)}
                            className="text-[10px] text-gray-600 hover:text-black underline flex items-center gap-1"
                        >
                            <FiEye className="w-3 h-3" />
                            {showAllAnswers ? '詳細を隠す' : '全員の回答を見る'}
                        </button>
                      </div>

                      <div className="overflow-hidden border border-gray-300">
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
                                      <span className="text-gray-900 font-bold text-[11px] truncate max-w-[80px]">{p.name}</span>
                                      {roleMap[p.id] && <span className="yy-mono text-[9px] text-gray-500 normal-case">{roleMap[p.id]}</span>}
                                      {p.comment && (
                                        <div className="group relative">
                                            <FiMessageSquare className="w-3 h-3 text-gray-400 mt-0.5" />
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-[#141414] text-white text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
                                                {p.comment}
                                            </div>
                                        </div>
                                      )}
                                      {/* 編集ボタン */}
                                      <button
                                        onClick={() => startEditing(p)}
                                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-[#141414]"
                                        title="修正する"
                                      >
                                          <FiEdit2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </th>
                                ))}
                                <th className="p-2 text-center font-bold text-gray-700 min-w-[80px]">
                                  集計
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-[12px]">
                              {options.map((option) => {
                                const summary = summaries.find((s) => s.optionId === option.id);
                                const isTopCandidate = summary && summary.yes === maxYes && maxYes > 0;

                                return (
                                  <tr key={option.id} className={`group ${isTopCandidate ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                                    {/* 候補名 */}
                                    <td className={`p-2.5 font-bold text-gray-700 sticky left-0 z-10 border-r border-gray-100 ${isTopCandidate ? 'bg-gray-50 shadow-[inset_2px_0_0_#52AA96]' : 'bg-white group-hover:bg-gray-50'}`}>
                                      <div className="flex items-center gap-2">
                                        {isTopCandidate && <FiCheck className="text-[#52AA96] w-3.5 h-3.5 shrink-0" />}
                                        <span className={isTopCandidate ? 'text-[#141414]' : ''}>{option.label}</span>
                                      </div>
                                    </td>

                                    {/* 各参加者の回答（クリック無効化・Read Only） */}
                                    {showAllAnswers && participants.map((participant) => {
                                      const response = responses.find((r) => r.participantId === participant.id && r.optionId === option.id);
                                      const value = response?.value || 'maybe';
                                      return (
                                        <td key={participant.id} className="p-1.5 text-center border-r border-gray-50">
                                          <div
                                            className={`w-6 h-6 flex items-center justify-center mx-auto text-[10px] font-bold ${
                                                value === 'yes' ? 'text-[#141414]' :
                                                value === 'maybe' ? 'text-gray-500' :
                                                'text-gray-300'
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
                                    <td className="p-2 text-center yy-mono">
                                        {summary && (
                                            <div className="flex justify-center items-center gap-1.5">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-bold text-[#141414]">{summary.yes}</span>
                                                </div>
                                                <span className="text-gray-300 text-[10px]">/</span>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-gray-500">{summary.maybe}</span>
                                                </div>
                                                <span className="text-gray-300 text-[10px]">/</span>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-gray-300">{summary.no}</span>
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
                            <p className="px-3 py-3 text-[11px] text-gray-500 border-t border-gray-200">
                                個別の回答は隠しています。
                                <button
                                    onClick={() => setShowAllAnswers(true)}
                                    className="ml-1 underline text-gray-700 hover:text-black"
                                >
                                    全員の回答を表示する
                                </button>
                            </p>
                          )}
                        </div>
                      </div>
                      {maxYes > 0 && (
                         <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-500 justify-end">
                            <FiCheck className="text-[#52AA96]" />
                            <span>印の行は「○」が最多の候補です</span>
                         </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // スケジュール未選択時
              <div className="flex-1 p-6">
                <p className="text-[12px] text-gray-500">
                  <FiCalendar className="inline mr-1 text-gray-400" />
                  一覧からスケジュールを選ぶか、
                  <button
                    onClick={() => { if (needLogin()) return; resetForm(); setView('create'); }}
                    className="ml-1 underline text-gray-700 hover:text-black"
                  >
                    新しく作成
                  </button>
                  してください。
                </p>
              </div>
            )}
          </div>

          {/* 右カラム：リスト（スマホでは本文の下） */}
          <div className="w-full md:w-64 shrink-0 max-h-[50vh] md:max-h-none">
            {renderScheduleList()}
          </div>
        </div>
      </div>
    );
  }

  // 作成画面
  if (view === 'create') {
    return (
      <div className="flex flex-col h-full bg-white">
        {header}

        <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden p-3 gap-3">
          {/* メインフォーム */}
          <div className="flex-1 min-h-0 bg-white border border-[#3b3b3b] overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-3xl mx-auto w-full">
                {/* 戻るボタンをフォームタイトル横に移動（黒帯には置かない） */}
                <div className="mb-6 border-b border-gray-200 pb-2 flex justify-between items-end gap-2">
                    <div>
                        <h2 className="text-[12px] font-bold text-[#141414]">新しいスケジュールを作成</h2>
                        <p className="text-[11px] text-gray-500 mt-1">基本情報と候補日程を入力してください</p>
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
                    <div className="p-4 bg-white border border-gray-300">
                        <div className="grid gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1.5">タイトル <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-3 py-2 text-[12px] border border-gray-300 focus:outline-none"
                                    placeholder="例: 第3回 企画会議の日程調整"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1.5">説明（任意）</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-3 py-2 text-[12px] border border-gray-300 focus:outline-none"
                                    rows={2}
                                    placeholder="場所や議題などの詳細..."
                                />
                            </div>
                            <div ref={createRolesRef} className="grid gap-3 sm:grid-cols-[160px_1fr] scroll-mt-2">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 mb-1.5">種別</label>
                                    <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full px-2 py-2 text-[12px] border border-gray-300">
                                        <option value="">なし</option>
                                        {MEETING_KINDS.map((k) => <option key={k}>{k}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 mb-1.5">必ず出てほしい役割（任意）</label>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] pt-1">
                                        {PARTY_ROLES.filter((r) => r !== 'その他').map((r) => (
                                            <label key={r} className="flex items-center gap-1">
                                                <input
                                                    type="checkbox"
                                                    checked={createRoles.includes(r)}
                                                    onChange={(e) => setCreateRoles((v) => (e.target.checked ? [...v, r] : v.filter((x) => x !== r)))}
                                                    className="accent-[#141414]"
                                                />
                                                {r}
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">回答が届いたら、回答者ごとに役割を付けると、この役割が揃う日を確定の候補にします。</p>
                                </div>
                            </div>
                            <div ref={deadlineRef} className="scroll-mt-2">
                                <label className="block text-[11px] font-bold text-gray-700 mb-1.5">回答の締切（任意）</label>
                                {deadlineFields(deadlineDate, deadlineTime, setDeadlineDate, setDeadlineTime)}
                                <p className="text-[10px] text-gray-400 mt-1">締切の 24 時間前にベルでお知らせします。過ぎると回答を受け付けません。締切から 1 週間で自動で片付きます。</p>
                            </div>
                        </div>
                    </div>

                    {/* 設定セクション（2カラム） */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-white border border-gray-300">
                            <label className="block text-[11px] font-bold text-gray-700 mb-2">回答方式</label>
                            <div className="flex gap-3">
                                <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 cursor-pointer hover:border-[#3b3b3b] flex-1">
                                    <input
                                        type="radio"
                                        value="date"
                                        checked={mode === 'date'}
                                        onChange={(e) => setMode(e.target.value as ScheduleMode)}
                                        className="accent-[#141414]"
                                    />
                                    <span className="text-[11px]">日程調整</span>
                                </label>
                                <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 cursor-pointer hover:border-[#3b3b3b] flex-1">
                                    <input
                                        type="radio"
                                        value="question"
                                        checked={mode === 'question'}
                                        onChange={(e) => setMode(e.target.value as ScheduleMode)}
                                        className="accent-[#141414]"
                                    />
                                    <span className="text-[11px]">一般投票</span>
                                </label>
                            </div>
                        </div>

                        <div className="p-4 bg-white border border-gray-300">
                            <label className="block text-[11px] font-bold text-gray-700 mb-2">公開設定</label>
                            <div className="flex gap-3">
                                <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 cursor-pointer hover:border-[#3b3b3b] flex-1">
                                    <input
                                        type="radio"
                                        checked={isPublic}
                                        onChange={() => setIsPublic(true)}
                                        className="accent-[#141414]"
                                    />
                                    <span className="text-[11px]">URL公開</span>
                                </label>
                                <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 cursor-pointer hover:border-[#3b3b3b] flex-1">
                                    <input
                                        type="radio"
                                        checked={!isPublic}
                                        onChange={() => setIsPublic(false)}
                                        className="accent-[#141414]"
                                    />
                                    <span className="text-[11px]">会員限定</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* 候補入力セクション */}
                    <div className="p-4 bg-white border border-gray-300">
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-[11px] font-bold text-gray-700">
                                候補 {mode === 'date' ? '日程' : '項目'} <span className="text-red-500">*</span>
                            </label>
                            <button
                                onClick={addOption}
                                className="yy-btn flex items-center gap-1 !px-3 !py-1.5 !text-[10px]"
                            >
                                <FiPlus className="w-3 h-3" /> 候補を追加
                            </button>
                        </div>
                        {mode === 'date' && (
                          <div ref={batchRef} className="mb-3 scroll-mt-2">
                            <button type="button" onClick={() => setShowBatch((v) => !v)} className="text-[11px] underline text-gray-600">
                              {showBatch ? 'まとめて作るのをやめる' : '期間と曜日からまとめて作る（例: 来週の平日の午後、毎週火曜）'}
                            </button>
                            {showBatch && (
                              <div className="mt-2 p-3 border border-gray-300 space-y-2 text-[11px]">
                                <div className="flex flex-wrap items-center gap-2">
                                  <input type="date" value={batchFrom} onChange={(e) => setBatchFrom(e.target.value)} className="px-2 py-1 border border-gray-300" />
                                  <span>〜</span>
                                  <input type="date" value={batchTo} onChange={(e) => setBatchTo(e.target.value)} className="px-2 py-1 border border-gray-300" />
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {WEEKDAYS.map((w, i) => (
                                    <button
                                      key={w}
                                      type="button"
                                      onClick={() => setBatchDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]))}
                                      className={`w-7 py-1 border ${batchDays.includes(i) ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white border-gray-300'}`}
                                    >
                                      {w}
                                    </button>
                                  ))}
                                  <span className="mx-2 border-l border-gray-300" />
                                  {(['am', 'pm'] as Slot[]).map((sl) => (
                                    <label key={sl} className="flex items-center gap-1">
                                      <input
                                        type="checkbox"
                                        checked={batchSlots.includes(sl)}
                                        onChange={(e) => setBatchSlots((v) => (e.target.checked ? [...v, sl] : v.filter((x) => x !== sl)))}
                                      />
                                      {sl === 'am' ? '午前' : '午後'}
                                    </label>
                                  ))}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button type="button" onClick={applyBatch} className="yy-btn yy-btn--primary !px-3 !py-1">
                                    候補に入れる（{generateCandidates(batchFrom, batchTo, batchDays, batchSlots).length} 件）
                                  </button>
                                  <span className="text-gray-500">最大 40 件。回答する人の負担を考えて絞ってください</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="space-y-3">
                            {optionLabels.map((label, index) => (
                                <div key={index} className="py-3 border-b border-gray-200 group">
                                    {mode === 'date' ? (
                                        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                            {/* 日付選択 */}
                                            <div className="relative w-full sm:w-auto">
                                                <input
                                                    type="date"
                                                    id={`date-input-${index}`}
                                                    value={optionDates[index] || ''}
                                                    onChange={(e) => handleDateSelect(index, e.target.value)}
                                                    className="w-full sm:w-40 px-3 py-1.5 text-[12px] border border-gray-300 focus:outline-none"
                                                />
                                            </div>
                                            {/* 時間選択 */}
                                            <div className="flex-1 flex flex-wrap gap-2 items-center w-full">
                                                 <div className="flex bg-white border border-gray-300 overflow-hidden shrink-0">
                                                    {['am', 'pm', 'custom'].map((tType) => (
                                                        <label key={tType} className={`px-2 py-1.5 cursor-pointer text-[10px] font-medium transition-colors ${optionTimes[index]?.timeType === tType ? 'bg-[#141414] text-white' : 'hover:bg-gray-50 text-gray-600'}`}>
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
                                                            className="px-1 py-1 border border-gray-300 bg-white"
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
                                                            className="px-1 py-1 border border-gray-300 bg-white"
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
                                                            className="px-1 py-1 border border-gray-300 bg-white"
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
                                                            className="px-1 py-1 border border-gray-300 bg-white"
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
                                                className="w-full sm:w-1/3 px-3 py-1.5 text-[11px] !border-0 !border-b !border-gray-200 bg-transparent text-gray-500 focus:outline-none"
                                                placeholder="自動生成されます"
                                            />

                                            {optionLabels.length > 1 && (
                                                <button
                                                    onClick={() => removeOption(index)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600"
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
                                                className="flex-1 px-3 py-2 text-[12px] border border-gray-300 focus:outline-none"
                                                placeholder="選択肢を入力 (例: A案、中華料理、など)"
                                            />
                                            {optionLabels.length > 1 && (
                                                <button
                                                    onClick={() => removeOption(index)}
                                                    className="p-2 text-gray-400 hover:text-red-600"
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
                        className="yy-btn yy-btn--primary w-full max-w-sm !py-3"
                    >
                        スケジュールを作成する
                    </button>
                </div>
            </div>
          </div>

           {/* 右カラム：リスト（作成画面でも表示しておくと便利） */}
           <div className="w-full md:w-64 shrink-0 max-h-[50vh] md:max-h-none">
            {renderScheduleList()}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ScheduleTool;
