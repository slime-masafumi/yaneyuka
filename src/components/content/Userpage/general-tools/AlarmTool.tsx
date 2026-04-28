'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  FiPlay, FiSquare, FiBell, FiBellOff, FiVolume2, FiVolumeX, 
  FiClock, FiActivity, FiClipboard, FiPlus, FiTrash2, FiSave, 
  FiPieChart, FiCalendar, FiSettings, FiEdit2, FiCheck, FiX, FiDownload, FiList 
} from 'react-icons/fi';

// --- 型定義 ---
type Mode = 'timer' | 'alarm' | 'tracker';
type TrackerTab = 'daily' | 'summary' | 'settings';

type TimeEntry = {
  id: string;
  projectId: string;
  description: string;
  hours: number | '';
};

type Project = {
  id: string;
  name: string;
  code: string;
};

// --- 初期データ ---
const INITIAL_PROJECTS: Project[] = [
  { id: 'p1', name: 'A邸新築工事', code: '23-001' },
  { id: 'p2', name: 'Bビル改修工事', code: '23-045' },
  { id: 'p3', name: '社内ミーティング', code: 'INT-01' },
  { id: 'p4', name: '移動・その他', code: 'ETC' },
];

const INITIAL_ENTRY: TimeEntry = { id: '1', projectId: '', description: '', hours: '' };

const AlarmTool: React.FC = () => {
  // ==========================================
  //  共通・タブ管理 State
  // ==========================================
  const [mode, setMode] = useState<Mode>('timer');

  // ==========================================
  //  Timer / Alarm Logic
  // ==========================================
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [alarmTimeStr, setAlarmTimeStr] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  const workerRef = useRef<Worker | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const beepIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    setAlarmTimeStr(`${h}:${m}`);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      workerRef.current = new Worker('/timer-worker.js');
      workerRef.current.onmessage = (e) => {
        const { type, remaining } = e.data;
        if (type === 'TICK') {
          setRemainingTime(remaining);
        } else if (type === 'ALARM') {
          fireAlarm();
        }
      };
    }
    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'STOP' });
        workerRef.current.terminate();
      }
      if (beepIntervalRef.current) {
        clearInterval(beepIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };

  const playBeep = () => {
    if (!audioContextRef.current || !soundEnabled) return;
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      oscillator.type = 'square';
      oscillator.frequency.value = 880; 
      gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.5);
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + 0.5);
    } catch (error) {
      console.error('音の再生に失敗しました:', error);
    }
  };

  const fireAlarm = () => {
    setIsRunning(false);
    setShowOverlay(true);
    setRemainingTime(0);
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    if (soundEnabled) {
      playBeep();
      beepIntervalRef.current = setInterval(() => playBeep(), 1000);
    }
    if (notificationEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('時間です！', {
          body: '予定時刻になりました。画面を確認してください。',
          icon: '/favicon.png',
          tag: 'alarm-timer',
          requireInteraction: true,
        });
    }
  };

  const startTimer = () => {
    let targetTimeMs = 0;
    if (mode === 'timer') {
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      if (totalSeconds <= 0) { alert('時間を設定してください。'); return; }
      targetTimeMs = Date.now() + totalSeconds * 1000;
    } else if (mode === 'alarm') {
      if (!alarmTimeStr) { alert('時刻を設定してください。'); return; }
      const now = new Date();
      const [targetH, targetM] = alarmTimeStr.split(':').map(Number);
      const targetDate = new Date();
      targetDate.setHours(targetH, targetM, 0, 0);
      if (targetDate.getTime() <= now.getTime()) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
      targetTimeMs = targetDate.getTime();
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'START', data: { targetTime: targetTimeMs } });
    }
    setIsRunning(true);
    setShowOverlay(false);
    setRemainingTime(targetTimeMs - Date.now());
  };

  const stopTimer = () => {
    if (workerRef.current) workerRef.current.postMessage({ type: 'STOP' });
    setIsRunning(false);
    setRemainingTime(null);
    setShowOverlay(false);
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
  };

  const formatRemainingTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ==========================================
  //  Time Tracker Logic
  // ==========================================
  const [trackerTab, setTrackerTab] = useState<TrackerTab>('daily');
  const [trackerDate, setTrackerDate] = useState(new Date().toISOString().split('T')[0]);
  
  // 日付ごとのデータを保持するState
  const [dailyRecords, setDailyRecords] = useState<Record<string, TimeEntry[]>>({});
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);

  // 集計期間用State
  const [summaryStartDate, setSummaryStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // 今月1日
    return d.toISOString().split('T')[0];
  });
  const [summaryEndDate, setSummaryEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // 初期ロード
  useEffect(() => {
    try {
      const savedRecords = localStorage.getItem('tracker_daily_records');
      if (savedRecords) {
        setDailyRecords(JSON.parse(savedRecords));
      }
      const savedProjects = localStorage.getItem('tracker_projects');
      if (savedProjects) {
        setProjects(JSON.parse(savedProjects));
      }
    } catch (e) {
      console.error('Failed to load tracker data', e);
    }
  }, []);

  // 保存
  useEffect(() => {
    try {
      localStorage.setItem('tracker_daily_records', JSON.stringify(dailyRecords));
    } catch (e) {}
  }, [dailyRecords]);

  useEffect(() => {
    try {
      localStorage.setItem('tracker_projects', JSON.stringify(projects));
    } catch (e) {}
  }, [projects]);

  const entries = useMemo(() => {
    return dailyRecords[trackerDate] || [{ ...INITIAL_ENTRY, id: crypto.randomUUID() }];
  }, [dailyRecords, trackerDate]);

  // --- Project Management State ---
  const [editProjId, setEditProjId] = useState<string | null>(null);
  const [editProjCode, setEditProjCode] = useState('');
  const [editProjName, setEditProjName] = useState('');

  // --- Entry Handlers ---
  const updateDailyRecords = (newEntries: TimeEntry[]) => {
    setDailyRecords(prev => ({
      ...prev,
      [trackerDate]: newEntries
    }));
  };

  const addEntry = () => {
    const newEntry = { id: crypto.randomUUID(), projectId: '', description: '', hours: '' as const };
    updateDailyRecords([...entries, newEntry]);
  };

  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      updateDailyRecords(entries.filter(e => e.id !== id));
    } else {
      updateDailyRecords([{ ...INITIAL_ENTRY, id: crypto.randomUUID() }]);
    }
  };

  const updateEntry = (id: string, field: keyof TimeEntry, value: string | number) => {
    const newEntries = entries.map(e => e.id === id ? { ...e, [field]: value } : e);
    updateDailyRecords(newEntries);
  };

  const totalHours = useMemo(() => {
    return entries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
  }, [entries]);

  // --- Summary Calculation Logic ---
  const summaryData = useMemo(() => {
    const projectTotals: Record<string, number> = {};
    const dailySummaries: { date: string; projectDetails: { projectId: string; hours: number }[] }[] = [];
    
    const start = new Date(summaryStartDate);
    const end = new Date(summaryEndDate);

    // 日付ループ
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayEntries = dailyRecords[dateStr] || [];
      const validEntries = dayEntries.filter(e => e.projectId && Number(e.hours) > 0);

      if (validEntries.length > 0) {
        // 日別のプロジェクト集計
        const dayProjectMap: Record<string, number> = {};
        validEntries.forEach(e => {
          const h = Number(e.hours);
          dayProjectMap[e.projectId] = (dayProjectMap[e.projectId] || 0) + h;
          // 全体集計
          projectTotals[e.projectId] = (projectTotals[e.projectId] || 0) + h;
        });

        // 日別詳細：プロジェクトコード順にソート
        const projectDetails = Object.entries(dayProjectMap)
          .map(([pid, h]) => ({ projectId: pid, hours: h }))
          .sort((a, b) => {
            const pA = projects.find(p => p.id === a.projectId);
            const pB = projects.find(p => p.id === b.projectId);
            return (pA?.code || '').localeCompare(pB?.code || '');
          });

        dailySummaries.push({ date: dateStr, projectDetails });
      }
    }

    // ソート: 日付降順
    dailySummaries.sort((a, b) => b.date.localeCompare(a.date));

    // 合計時間
    const grandTotal = Object.values(projectTotals).reduce((a, b) => a + b, 0);

    // プロジェクト別合計リスト（表示用：稼働時間が多い順）
    const projectTotalList = Object.entries(projectTotals)
      .map(([pid, h]) => {
        const p = projects.find(proj => proj.id === pid);
        return { projectId: pid, projectCode: p?.code || '', projectName: p?.name || '', hours: h };
      })
      .sort((a, b) => b.hours - a.hours); // 時間降順

    return { projectTotals, dailySummaries, grandTotal, projectTotalList };
  }, [dailyRecords, summaryStartDate, summaryEndDate, projects]);

  // --- Export CSV Handler ---
  const handleExportCSV = () => {
    const start = new Date(summaryStartDate);
    const end = new Date(summaryEndDate);
    let csvContent = "\uFEFF日付,プロジェクトNo,プロジェクト名,作業内容,工数(h)\n";

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayEntries = dailyRecords[dateStr] || [];
      const validEntries = dayEntries.filter(e => e.projectId && Number(e.hours) > 0);

      // プロジェクトNo順にソート
      validEntries.sort((a, b) => {
        const pA = projects.find(p => p.id === a.projectId);
        const pB = projects.find(p => p.id === b.projectId);
        return (pA?.code || '').localeCompare(pB?.code || '');
      });

      validEntries.forEach(e => {
        const project = projects.find(p => p.id === e.projectId);
        const line = [
          dateStr,
          project?.code || '',
          project?.name || '',
          `"${(e.description || '').replace(/"/g, '""')}"`, // エスケープ処理
          e.hours
        ].join(",");
        csvContent += line + "\n";
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    // ファイル名を yaneyuka_ から開始
    link.setAttribute("download", `yaneyuka_業務記録_${summaryStartDate}_${summaryEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Project Management Handlers ---
  const handleSaveProject = () => {
    if (!editProjCode || !editProjName) {
      alert('コードとプロジェクト名を入力してください');
      return;
    }

    if (editProjId) {
      setProjects(projects.map(p => 
        p.id === editProjId ? { ...p, code: editProjCode, name: editProjName } : p
      ));
      setEditProjId(null);
    } else {
      const newId = crypto.randomUUID();
      setProjects([...projects, { id: newId, code: editProjCode, name: editProjName }]);
    }
    setEditProjCode('');
    setEditProjName('');
  };

  const handleEditProject = (p: Project) => {
    setEditProjId(p.id);
    setEditProjCode(p.code);
    setEditProjName(p.name);
  };

  const handleDeleteProject = (id: string) => {
    if (confirm('このプロジェクトを削除しますか？')) {
      setProjects(projects.filter(p => p.id !== id));
      if (editProjId === id) {
        setEditProjId(null);
        setEditProjCode('');
        setEditProjName('');
      }
    }
  };

  const handleCancelEdit = () => {
    setEditProjId(null);
    setEditProjCode('');
    setEditProjName('');
  };


  // ==========================================
  //  Render
  // ==========================================
  return (
    <div className="w-full bg-white rounded-b-lg shadow-sm border-b border-gray-100 flex flex-col h-full overflow-hidden">
      
      {/* Header & Tabs */}
      <div className="border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div className="p-4 pb-0">
          <div>
            <h3 className="text-[13px] font-medium">アラーム・業務管理</h3>
            <p className="text-[11px] mt-0.5 opacity-80">タイマー・アラーム・業務時間記録の統合ツール。作業時間の記録と業務日報の作成に対応</p>
      </div>
          <div className="mt-3">
            <div className="flex gap-1">
            <button
              onClick={() => { setMode('timer'); stopTimer(); }}
                className={`px-4 py-2 text-xs rounded-t-lg transition-colors flex items-center gap-1.5 ${
                  mode === 'timer' 
                    ? 'bg-white text-gray-800 font-bold' 
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
              }`}
            >
              <FiActivity /> タイマー
            </button>
            <button
              onClick={() => { setMode('alarm'); stopTimer(); }}
                className={`px-4 py-2 text-xs rounded-t-lg transition-colors flex items-center gap-1.5 ${
                  mode === 'alarm' 
                    ? 'bg-white text-gray-800 font-bold' 
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
              }`}
            >
              <FiClock /> アラーム
            </button>
              <button
                onClick={() => { setMode('tracker'); stopTimer(); }}
                className={`px-4 py-2 text-xs rounded-t-lg transition-colors flex items-center gap-1.5 ${
                  mode === 'tracker' 
                    ? 'bg-white text-gray-800 font-bold' 
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                }`}
              >
                <FiClipboard /> 業務記録
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 overflow-y-auto text-[12px] text-gray-700">
        
        {/* === TIMER & ALARM MODE === */}
        {(mode === 'timer' || mode === 'alarm') && (
          <div className="max-w-md mx-auto space-y-6 animate-fadeIn">
            {/* Input */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-3 text-center">
              {mode === 'timer' ? '時間をセット' : '時刻をセット'}
            </label>
            {mode === 'timer' ? (
                <div className="flex items-center gap-3 justify-center">
                <div className="flex flex-col items-center">
                    <input type="number" min="0" max="23" value={hours} onChange={(e) => setHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))} disabled={isRunning} className="w-16 text-xl font-bold text-center border border-gray-300 rounded-lg px-1 py-2 outline-none focus:border-blue-500 disabled:bg-gray-50 text-gray-800"/>
                    <span className="text-[10px] text-gray-400 mt-1">時間</span>
                </div>
                  <span className="text-xl font-bold text-gray-300 -mt-4">:</span>
                <div className="flex flex-col items-center">
                    <input type="number" min="0" max="59" value={minutes} onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} disabled={isRunning} className="w-16 text-xl font-bold text-center border border-gray-300 rounded-lg px-1 py-2 outline-none focus:border-blue-500 disabled:bg-gray-50 text-gray-800"/>
                    <span className="text-[10px] text-gray-400 mt-1">分</span>
                </div>
                  <span className="text-xl font-bold text-gray-300 -mt-4">:</span>
                <div className="flex flex-col items-center">
                    <input type="number" min="0" max="59" value={seconds} onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} disabled={isRunning} className="w-16 text-xl font-bold text-center border border-gray-300 rounded-lg px-1 py-2 outline-none focus:border-blue-500 disabled:bg-gray-50 text-gray-800"/>
                    <span className="text-[10px] text-gray-400 mt-1">秒</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                  <input type="time" value={alarmTimeStr} onChange={(e) => setAlarmTimeStr(e.target.value)} disabled={isRunning} className="text-3xl font-bold text-center border border-gray-300 rounded-lg px-6 py-2 outline-none focus:border-blue-500 disabled:bg-gray-50 text-gray-800"/>
              </div>
            )}
          </div>

            {/* Display */}
          {isRunning && remainingTime !== null && (
              <div className="text-center animate-pulse">
                <div className="text-4xl font-bold text-blue-600 mb-1 font-mono tracking-tight">{formatRemainingTime(remainingTime)}</div>
                <p className="text-[10px] text-gray-400">残り時間</p>
                {mode === 'alarm' && <p className="text-[10px] text-blue-400 mt-0.5 font-bold">設定時刻: {alarmTimeStr}</p>}
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-3 justify-center">
              {!isRunning ? (
                <button onClick={startTimer} className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition-colors text-[13px] font-bold"><FiPlay className="w-4 h-4" /> 開始</button>
              ) : (
                <button onClick={stopTimer} className="flex items-center gap-2 px-8 py-2.5 bg-red-600 text-white rounded shadow hover:bg-red-700 transition-colors text-[13px] font-bold"><FiSquare className="w-4 h-4" /> 停止</button>
              )}
            </div>

            <hr className="border-gray-100" />

            {/* Settings */}
            <div className="bg-gray-50 p-3 rounded border border-gray-200 space-y-3">
              <p className="text-[11px] font-bold text-gray-700">通知・サウンド設定</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {soundEnabled ? <FiVolume2 className="text-gray-600"/> : <FiVolumeX className="text-gray-400"/>}
                  <span className="text-[11px] font-medium text-gray-600">アラーム音</span>
                </div>
                <button onClick={() => setSoundEnabled(!soundEnabled)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${soundEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-4' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {notificationEnabled ? <FiBell className="text-gray-600"/> : <FiBellOff className="text-gray-400"/>}
                  <span className="text-[11px] font-medium text-gray-600">デスクトップ通知</span>
                </div>
                <div className="flex items-center gap-2">
                  {notificationPermission === 'default' && <button onClick={requestNotificationPermission} className="text-[9px] px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded border border-yellow-200 hover:bg-yellow-200 transition">許可する</button>}
                  <button onClick={() => setNotificationEnabled(!notificationEnabled)} disabled={notificationPermission !== 'granted'} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${notificationEnabled && notificationPermission === 'granted' ? 'bg-blue-600' : 'bg-gray-300'} ${notificationPermission !== 'granted' ? 'opacity-50' : ''}`}>
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${notificationEnabled && notificationPermission === 'granted' ? 'translate-x-4' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>
            </div>
          )}

        {/* === TRACKER MODE === */}
        {mode === 'tracker' && (
          <div className="animate-fadeIn space-y-4 h-full flex flex-col">
            
            {/* Sub Navigation for Tracker */}
            <div className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200 mb-2 shrink-0">
              <div className="flex gap-2">
                <button 
                  onClick={() => setTrackerTab('daily')} 
                  className={`px-3 py-1.5 text-[11px] rounded transition-colors flex items-center gap-1 ${trackerTab==='daily' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-gray-500 hover:bg-gray-200'}`}
                >
                  <FiClock className="w-3 h-3"/> 日報入力
                </button>
              <button
                  onClick={() => setTrackerTab('summary')} 
                  className={`px-3 py-1.5 text-[11px] rounded transition-colors flex items-center gap-1 ${trackerTab==='summary' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-gray-500 hover:bg-gray-200'}`}
              >
                  <FiPieChart className="w-3 h-3"/> 集計
              </button>
              <button
                  onClick={() => setTrackerTab('settings')} 
                  className={`px-3 py-1.5 text-[11px] rounded transition-colors flex items-center gap-1 ${trackerTab==='settings' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-gray-500 hover:bg-gray-200'}`}
              >
                  <FiSettings className="w-3 h-3"/> 設定
              </button>
              </div>
              {trackerTab === 'daily' && (
                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-gray-300">
                  <FiCalendar className="text-gray-400 w-3 h-3" />
                  <input 
                    type="date" 
                    value={trackerDate} 
                    onChange={(e) => setTrackerDate(e.target.value)} 
                    className="text-[11px] text-gray-700 outline-none font-mono bg-transparent cursor-pointer"
                  />
                </div>
            )}
          </div>

            {/* Content Switch */}
            {trackerTab === 'daily' && (
              // --- 日報入力 UI ---
              <div className="space-y-4">
                <div className="border border-gray-200 rounded overflow-hidden shadow-sm">
                  <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500">
                    <div className="col-span-4 p-2 border-r border-gray-200">プロジェクト名</div>
                    <div className="col-span-6 p-2 border-r border-gray-200">作業内容</div>
                    <div className="col-span-2 p-2 text-center">時間 (h)</div>
                  </div>
                  <div className="divide-y divide-gray-100 bg-white">
                    {entries.map((entry) => (
                      <div key={entry.id} className="grid grid-cols-12 group hover:bg-blue-50/30 transition-colors relative">
                        <div className="col-span-4 p-1 border-r border-gray-100">
                          <select value={entry.projectId} onChange={(e) => updateEntry(entry.id, 'projectId', e.target.value)} className="w-full h-full p-1.5 bg-transparent outline-none text-[11px] text-gray-700 cursor-pointer rounded focus:bg-white focus:ring-1 focus:ring-blue-200">
                            <option value="" className="text-gray-300">選択してください</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.code} : {p.name}</option>)}
                          </select>
                        </div>
                        <div className="col-span-6 p-1 border-r border-gray-100 relative">
                          <input type="text" value={entry.description} onChange={(e) => updateEntry(entry.id, 'description', e.target.value)} placeholder="具体的な内容を入力" className="w-full h-full p-1.5 bg-transparent outline-none text-[11px] text-gray-700 placeholder-gray-300 rounded focus:bg-white focus:ring-1 focus:ring-blue-200"/>
                          <button onClick={() => removeEntry(entry.id)} className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all z-10" title="行を削除"><FiTrash2 className="w-3 h-3" /></button>
                        </div>
                        <div className="col-span-2 p-1">
                          <input type="number" min="0" step="0.5" value={entry.hours} onChange={(e) => updateEntry(entry.id, 'hours', e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full h-full p-1.5 bg-transparent outline-none text-[12px] text-center font-mono text-gray-700 rounded focus:bg-white focus:ring-1 focus:ring-blue-200" placeholder="0.0"/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <button onClick={addEntry} className="flex items-center gap-1 text-[11px] text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded transition-colors border border-dashed border-blue-200 hover:border-blue-300"><FiPlus className="w-3 h-3" /> 行を追加</button>
                  <div className="flex items-center gap-4 bg-gray-50 px-4 py-2 rounded border border-gray-200">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total</span>
                    <span className="text-xl font-bold text-gray-800 font-mono leading-none">{totalHours.toFixed(1)} <span className="text-[10px] font-normal text-gray-500">h</span></span>
                    <div className="w-px h-5 bg-gray-300 mx-1"></div>
                    <button className="flex items-center gap-1.5 bg-gray-100 text-gray-500 text-[11px] font-bold px-4 py-1.5 rounded shadow-sm cursor-default"><FiSave className="w-3.5 h-3.5" /> 自動保存済み</button>
                  </div>
                </div>
              </div>
            )}

            {trackerTab === 'summary' && (
              // --- 集計チャート UI ---
              <div className="flex flex-col h-full space-y-4">
                {/* 期間設定 & CSVダウンロード */}
                <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center bg-gray-50 p-3 rounded border border-gray-200 gap-3 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-gray-500 mb-1">開始日</label>
                      <input 
                        type="date" 
                        value={summaryStartDate} 
                        onChange={(e) => setSummaryStartDate(e.target.value)} 
                        className="text-[11px] border border-gray-300 rounded p-1.5 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <span className="text-gray-400 mt-4">～</span>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-gray-500 mb-1">終了日</label>
                      <input 
                        type="date" 
                        value={summaryEndDate} 
                        onChange={(e) => setSummaryEndDate(e.target.value)} 
                        className="text-[11px] border border-gray-300 rounded p-1.5 focus:border-blue-500 outline-none"
                      />
                    </div>
              </div>
              <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold px-3 py-1.5 rounded shadow-sm transition-colors"
                  >
                    <FiDownload className="w-3.5 h-3.5" /> CSV出力
              </button>
            </div>

                {/* 左右分割コンテンツ */}
                <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
                  
                  {/* 左カラム：日別・プロジェクト別詳細 */}
                  <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col">
                    <h4 className="text-[11px] font-bold text-gray-600 mb-2 border-b border-gray-100 pb-2">
                      日別・プロジェクト別詳細
                    </h4>
                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                      {summaryData.dailySummaries.length === 0 ? (
                        <p className="text-[10px] text-gray-400 text-center py-10">表示するデータがありません</p>
                      ) : (
                        <div className="space-y-4">
                          {summaryData.dailySummaries.map((daySummary) => (
                            <div key={daySummary.date} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                              <div className="text-[11px] font-bold text-gray-800 bg-gray-50 px-2 py-1 rounded inline-block mb-1.5 font-mono">
                                {daySummary.date}
                              </div>
                              <div className="pl-2 space-y-1">
                                {daySummary.projectDetails.map((detail, idx) => {
                                  const project = projects.find(p => p.id === detail.projectId);
                                  return (
                                    <div key={idx} className="flex justify-between items-center text-[11px] hover:bg-gray-50 p-1 rounded">
              <div className="flex items-center gap-2">
                                        <span className="text-gray-500 text-[10px] min-w-[50px] font-mono bg-gray-100 px-1 rounded text-center">{project?.code}</span>
                                        <span className="text-gray-700 font-medium">{project?.name}</span>
                                      </div>
                                      <span className="font-mono font-bold text-gray-600">{detail.hours.toFixed(1)} h</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 右カラム：合計時間 & プロジェクト別内訳 */}
                  <div className="w-1/3 min-w-[250px] bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col">
                    {/* 総合計 */}
                    <div className="mb-6 text-center border-b border-gray-100 pb-6">
                      <h4 className="text-[11px] font-bold text-gray-500 mb-2">期間合計稼働時間</h4>
                      <span className="text-5xl font-bold text-blue-600 font-mono tracking-tighter">
                        {summaryData.grandTotal.toFixed(1)}
                      </span>
                      <span className="text-xl text-gray-500 ml-1">h</span>
                      <p className="text-[10px] text-gray-400 mt-2 bg-gray-50 px-2 py-1 rounded inline-block">
                        {summaryStartDate.replace(/-/g, '/')} ～ {summaryEndDate.replace(/-/g, '/')}
                      </p>
                    </div>

                    {/* プロジェクト別合計 */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                      <h4 className="text-[11px] font-bold text-gray-600 mb-2 flex items-center gap-1">
                        <FiList className="w-3 h-3" /> プロジェクト別合計
                      </h4>
                      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                        {summaryData.projectTotalList.length === 0 ? (
                          <p className="text-[10px] text-gray-400 text-center py-4">データなし</p>
                        ) : (
                          <div className="space-y-2">
                            {summaryData.projectTotalList.map((item) => (
                              <div key={item.projectId} className="flex justify-between items-center text-[11px] p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-100 transition-colors">
                                <div className="flex flex-col min-w-0 pr-2">
                                  <span className="font-bold text-gray-700 truncate" title={item.projectName}>{item.projectName}</span>
                                  <span className="text-[10px] text-gray-400 font-mono">{item.projectCode}</span>
                                </div>
                                <span className="font-mono font-bold text-blue-600 whitespace-nowrap">{item.hours.toFixed(1)} h</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {trackerTab === 'settings' && (
              // --- プロジェクト設定 UI ---
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col h-full animate-fadeIn">
                <h4 className="text-[11px] font-bold text-gray-600 mb-3 border-b border-gray-200 pb-2 flex items-center gap-2"><FiSettings className="w-3 h-3" /> プロジェクト設定</h4>
                
                {/* 入力フォーム */}
                <div className="mb-4 space-y-2 bg-white p-3 rounded border border-gray-200 shadow-sm">
                  <p className="text-[10px] text-gray-500 mb-1">プロジェクトの追加・編集</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="コード (例: 23-001)" 
                      className="w-1/4 p-1.5 text-[11px] border border-gray-300 rounded outline-none focus:border-blue-500"
                      value={editProjCode}
                      onChange={(e)=>setEditProjCode(e.target.value)}
                    />
                    <input 
                      type="text" 
                      placeholder="プロジェクト名" 
                      className="flex-1 p-1.5 text-[11px] border border-gray-300 rounded outline-none focus:border-blue-500"
                      value={editProjName}
                      onChange={(e)=>setEditProjName(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    {editProjId && (
                  <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 text-[10px] text-gray-600 bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1"
                  >
                        <FiX className="w-3 h-3" /> キャンセル
                  </button>
                )}
                <button
                      onClick={handleSaveProject}
                      className={`px-4 py-1.5 text-[10px] text-white rounded flex items-center gap-1 shadow-sm transition-colors ${editProjId ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                      {editProjId ? <><FiCheck className="w-3 h-3" /> 更新</> : <><FiPlus className="w-3 h-3" /> 追加</>}
                </button>
              </div>
            </div>

                {/* プロジェクトリスト */}
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {projects.length === 0 && <p className="text-[10px] text-gray-400 text-center py-4">プロジェクトがありません</p>}
                  {projects.map(p => (
                    <div key={p.id} className={`flex items-center gap-3 p-3 rounded border bg-white transition-colors ${editProjId === p.id ? 'bg-blue-50 border-blue-300' : 'border-gray-200'}`}>
                      <span className="text-[10px] font-mono bg-gray-100 px-2 py-1 rounded text-gray-600 border border-gray-200 min-w-[60px] text-center">{p.code}</span>
                      <span className="text-[11px] text-gray-700 truncate flex-1 font-bold">{p.name}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={()=>handleEditProject(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="編集"><FiEdit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={()=>handleDeleteProject(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="削除"><FiTrash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
          </div>
            )}
          </div>
        )}

      </div>

      {/* Overlay */}
      {showOverlay && (
        <div className="fixed inset-0 bg-gradient-to-br from-red-500 to-orange-500 text-white flex flex-col items-center justify-center" style={{ display: 'flex', zIndex: 2147483647 }}>
          <div className="text-center px-4">
            <div className="text-6xl font-bold mb-6 animate-pulse">TIME'S UP!</div>
            <p className="text-xl mb-8 opacity-90">予定時刻になりました</p>
            <button onClick={stopTimer} className="px-8 py-3 bg-white text-red-600 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors shadow-lg">アラームを停止</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlarmTool;
