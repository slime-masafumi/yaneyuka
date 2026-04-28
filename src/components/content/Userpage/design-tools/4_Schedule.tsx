'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebaseClient';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// 工程表関連のインターフェース
interface GanttTask {
  id: number;
  name: string;
  start: string;
  end: string;
  color: string;
  innerText: string;
  order: number;
}

interface GanttProject {
  id: number;
  name: string;
  tasks: GanttTask[];
}

const Schedule: React.FC = () => {
  const { currentUser, isLoggedIn } = useAuth();

  // 工程表の状態
  const [savedProjects, setSavedProjects] = useState<GanttProject[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [projectName, setProjectName] = useState('');
  
  // プロジェクト名の更新とドキュメントタイトルの設定
  const updateProjectName = (name: string) => {
    setProjectName(name);
    const defaultPageTitle = "工程表";
    const defaultChartTitle = "工程表";
    
    // Update page title (document.title) for print filename suggestion
    document.title = name ? `${name} ${defaultPageTitle}` : defaultPageTitle;
    
    localStorage.setItem('ganttProjectName', name);
  };
  const [viewType, setViewType] = useState<'day' | 'week' | 'month'>('day');
  const [showHolidays, setShowHolidays] = useState(false);
  const [showStartDateInBar, setShowStartDateInBar] = useState(true);
  const [showEndDateInBar, setShowEndDateInBar] = useState(true);
  const [showInnerTextInBar, setShowInnerTextInBar] = useState(true);
  const [displayStartDate, setDisplayStartDate] = useState('');
  const [holidays, setHolidays] = useState<Record<string, string>>({});
  const [isTaskListExpanded, setIsTaskListExpanded] = useState(false);
  const [previewPeriod, setPreviewPeriod] = useState<number>(3); // 表示期間（月数）
  const [previewZoom, setPreviewZoom] = useState<number>(100); // プレビュー拡大率（%）
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  
  // --- 定数定義 (A3 @ 96dpi) ---
  const A3_WIDTH_PX = 1587; 
  // CSSに合わせて少し余裕を持たせる（1123 -> 1120）
  const A3_HEIGHT_PX = 1120;
  const PADDING_MM = 10;
  // 10mm ≒ 37.8px (96dpi / 25.4mm * 10)
  const PADDING_PX = Math.round((96 / 25.4) * PADDING_MM); 
  const NAME_COL_WIDTH = 120;
  
  // --- ドラッグスクロール処理 (復活) ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!previewContainerRef.current) return;
    setIsDragging(true);
    setDragStart({
      x: e.pageX,
      y: e.pageY,
      scrollLeft: previewContainerRef.current.scrollLeft,
      scrollTop: previewContainerRef.current.scrollTop
    });
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !previewContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - dragStart.x;
    const y = e.pageY - dragStart.y;
    previewContainerRef.current.scrollLeft = dragStart.scrollLeft - x;
    previewContainerRef.current.scrollTop = dragStart.scrollTop - y;
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);
  
  // 拡大率変更時に左上が見えるようにスクロール位置をリセット
  useEffect(() => {
    if (previewContainerRef.current) {
      previewContainerRef.current.scrollLeft = 0;
      previewContainerRef.current.scrollTop = 0;
    }
    if (topScrollRef.current) {
      topScrollRef.current.scrollLeft = 0;
    }
  }, [previewZoom]);

  // 上側スクロールバーの幅を更新
  useEffect(() => {
    const updateTopScrollWidth = () => {
      if (previewContainerRef.current && topScrollRef.current) {
        const scrollWidthDiv = topScrollRef.current.querySelector('#schedule-top-scroll-track') as HTMLElement;
        if (scrollWidthDiv && previewContainerRef.current) {
          scrollWidthDiv.style.width = `${previewContainerRef.current.scrollWidth}px`;
        }
      }
    };
    
    // 少し遅延させてから更新（レンダリング完了後）
    const timeoutId = setTimeout(updateTopScrollWidth, 100);
    
    // リサイズ時にも更新
    window.addEventListener('resize', updateTopScrollWidth);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateTopScrollWidth);
    };
  }, [previewZoom, previewPeriod, tasks]);

  // スクロール同期ハンドラー
  const handlePreviewScroll = () => {
    if (!previewContainerRef.current || !topScrollRef.current) return;
    topScrollRef.current.scrollLeft = previewContainerRef.current.scrollLeft;
  };

  const handleTopScroll = () => {
    if (!previewContainerRef.current || !topScrollRef.current) return;
    previewContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
  };
  
  // 表示単位別の期間オプション
  const getPeriodOptions = () => {
    switch (viewType) {
      case 'day':
        return [1, 2, 3, 4, 5].map(months => ({ value: months, label: `${months}ヶ月` }));
      case 'week':
        return [3, 4, 5, 6].map(months => ({ value: months, label: `${months}ヶ月` }));
      case 'month':
        return [6, 12, 18, 24].map(months => ({ value: months, label: `${months}ヶ月` }));
      default:
        return [{ value: 3, label: '3ヶ月' }];
    }
  };
  
  // 工程表のタスク追加フォーム状態
  const [taskName, setTaskName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [taskColor, setTaskColor] = useState('#3B82F6');
  const [innerText, setInnerText] = useState('');

  // 日付のズレを防ぐため、時刻を排除してYYYY-MM-DD文字列で比較・生成する（ローカルタイムゾーン統一）
  const toDateStr = (date: Date): string => {
    const y = date.getFullYear();
    const m = ('0' + (date.getMonth() + 1)).slice(-2);
    const d = ('0' + date.getDate()).slice(-2);
    return `${y}-${m}-${d}`;
  };

  const parseDate = (dateStr: string): Date => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const formatDate = (date: Date): string => toDateStr(date);

  const escapeHtml = (unsafe: string): string => {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  };

  // 祝日データを取得する関数
  const fetchHolidays = async (): Promise<void> => {
    try {
      const response = await fetch('https://holidays-jp.github.io/api/v1/date.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const holidayData = await response.json();
      setHolidays(holidayData);
      console.log('Holidays fetched:', holidayData);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      setHolidays({});
    }
  };

  // 工程表のタスク管理関数
  const addTask = (): void => {
    if (!currentUser) {
      alert('入力するには会員登録（無料）が必要です。');
      return;
    }
    if (!taskName.trim() || !startDate || !endDate) {
      alert('全ての項目を入力してください。');
      return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      alert('終了日は開始日以降に設定してください。');
      return;
    }

    let currentMaxOrder = 0;
    tasks.forEach(task => {
      if (typeof task.order === 'number' && task.order > currentMaxOrder) {
        currentMaxOrder = task.order;
      }
    });

    const newTask: GanttTask = {
      id: Math.floor(Date.now() + Math.random() * 1000),
      name: taskName,
      start: startDate,
      end: endDate,
      color: taskColor,
      innerText: innerText,
      order: currentMaxOrder + 1
    };

    setTasks(prev => [...prev, newTask]);
    
    // フォームリセット
    setTaskName('');
    setStartDate('');
    setEndDate('');
    setTaskColor('#3B82F6');
    setInnerText('');
  };

  const deleteTask = (taskId: number): void => {
    const taskToDelete = tasks.find(task => task.id === taskId);
    const taskNameToDelete = taskToDelete ? escapeHtml(taskToDelete.name) : 'このタスク';
    
    if (confirm(`「${taskNameToDelete}」を削除しますか？`)) {
      setTasks(prev => prev.filter(task => task.id !== taskId));
    }
  };

  const updateTask = (taskId: number, updatedTask: Partial<GanttTask>): void => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updatedTask } : task
    ));
  };

  const moveTaskUp = (index: number): void => {
    if (index <= 0) return;
    
    setTasks(prev => {
      const newTasks = [...prev];
      [newTasks[index], newTasks[index - 1]] = [newTasks[index - 1], newTasks[index]];
      return newTasks;
    });
  };

  const moveTaskDown = (index: number): void => {
    if (index >= tasks.length - 1) return;
    
    setTasks(prev => {
      const newTasks = [...prev];
      [newTasks[index], newTasks[index + 1]] = [newTasks[index + 1], newTasks[index]];
      return newTasks;
    });
  };

  // TaskEditItemコンポーネント
  interface TaskEditItemProps {
    task: GanttTask;
    index: number;
    onUpdate: (updatedTask: Partial<GanttTask>) => void;
    onDelete: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
  }

  const TaskEditItem: React.FC<TaskEditItemProps> = ({ 
    task, 
    index, 
    onUpdate, 
    onDelete, 
    onMoveUp, 
    onMoveDown 
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
      name: task.name,
      start: task.start,
      end: task.end,
      color: task.color,
      innerText: task.innerText
    });

    const handleSave = () => {
      if (!editForm.name.trim() || !editForm.start || !editForm.end) {
        alert('全ての項目を入力してください。');
        return;
      }
      
      if (new Date(editForm.start) > new Date(editForm.end)) {
        alert('終了日は開始日以降に設定してください。');
        return;
      }

      onUpdate(editForm);
      setIsEditing(false);
    };

    const handleCancel = () => {
      setEditForm({
        name: task.name,
        start: task.start,
        end: task.end,
        color: task.color,
        innerText: task.innerText
      });
      setIsEditing(false);
    };

    if (isEditing) {
      return (
        <div className="border border-gray-300 p-1 bg-white text-gray-900">
          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-1">
              <input
                type="color"
                value={editForm.color}
                onChange={(e) => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                onClick={(e) => {
                  if (!isLoggedIn) {
                    alert('入力するには会員登録（無料）が必要です。');
                    e.preventDefault();
                  }
                }}
                className="w-full border border-gray-300 cursor-pointer h-8"
              />
            </div>
            
            <div className="col-span-2">
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 10) {
                    setEditForm(prev => ({ ...prev, name: value }));
                  }
                }}
                onClick={(e) => {
                  if (!isLoggedIn) {
                    alert('入力するには会員登録（無料）が必要です。');
                    e.preventDefault();
                  }
                }}
                className="w-full border border-gray-300 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
                placeholder="工程名（10文字まで）"
                maxLength={10}
              />
            </div>
            
            <div className="col-span-2">
              <input
                type="date"
                value={editForm.start}
                onChange={(e) => setEditForm(prev => ({ ...prev, start: e.target.value }))}
                onClick={(e) => {
                  if (!isLoggedIn) {
                    alert('入力するには会員登録（無料）が必要です。');
                    e.preventDefault();
                  }
                }}
                className="w-full border border-gray-300 px-1 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
              />
            </div>
            
            <div className="col-span-2">
              <input
                type="date"
                value={editForm.end}
                onChange={(e) => setEditForm(prev => ({ ...prev, end: e.target.value }))}
                onClick={(e) => {
                  if (!isLoggedIn) {
                    alert('入力するには会員登録（無料）が必要です。');
                    e.preventDefault();
                  }
                }}
                className="w-full border border-gray-300 px-1 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
              />
            </div>
            
            <div className="col-span-2">
              <input
                type="text"
                value={editForm.innerText}
                onChange={(e) => setEditForm(prev => ({ ...prev, innerText: e.target.value }))}
                onClick={(e) => {
                  if (!isLoggedIn) {
                    alert('入力するには会員登録（無料）が必要です。');
                    e.preventDefault();
                  }
                }}
                className="w-full border border-gray-300 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
                placeholder="内文字"
              />
            </div>
            
            <div className="col-span-3 flex gap-1">
              <button
                onClick={handleSave}
                className="flex-1 bg-blue-500 text-white px-2 py-1 hover:bg-blue-600 transition text-[11px]"
              >
                保存
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 bg-gray-500 text-white px-2 py-1 hover:bg-gray-600 transition text-[11px]"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 工程名を全角10文字に制限
    const truncatedName = task.name.length > 10 ? task.name.substring(0, 10) + '...' : task.name;

    return (
      <div className="border border-gray-200 p-1 bg-white text-gray-900">
        <div className="grid grid-cols-12 gap-2 items-center">
          <div className="col-span-1 flex items-center gap-1">
            <div
              className="w-3 h-3 border border-gray-300"
              style={{ backgroundColor: task.color }}
            />
            <span className="text-[11px] text-gray-600 w-6 text-right font-mono">#{index + 1}</span>
          </div>
          
          <div className="col-span-2 font-medium text-[11px] truncate" title={task.name}>
            {truncatedName}
          </div>
          
          <div className="col-span-3 text-gray-600 text-[11px] font-mono">
            {task.start} 〜 {task.end}
          </div>
          
          <div className="col-span-2 text-gray-600 text-[11px]">
            {task.innerText || ''}
          </div>
          
          <div className="col-span-4 flex items-center gap-2 justify-end">
            <button
              onClick={() => setIsEditing(true)}
              className="text-[11px] bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
            >
              編集
            </button>
            <button
              onClick={onDelete}
              className="text-[11px] bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            >
              削除
            </button>
            {onMoveUp && (
              <button
                onClick={onMoveUp}
                className="text-[11px] bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                title="上に移動"
              >
                ↑
              </button>
            )}
            {onMoveDown && (
              <button
                onClick={onMoveDown}
                className="text-[11px] bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                title="下に移動"
              >
                ↓
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ガントチャートのタイムライン描画関数
  // isPrintMode: 印刷用の場合は拡大縮小なしで描画する
  const renderGanttTimeline = () => {
    if (tasks.length === 0) {
      return <p className="text-gray-500 text-sm">タスクを追加してください。</p>;
    }

    // 1. 表示期間の計算（開始日の月初からNか月後の月末まで）
    let startDate: Date;
    let endDate: Date;
    if (displayStartDate) {
      startDate = new Date(displayStartDate);
      // 開始日の月初めに設定
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      // Nか月後の月末を計算（例：11月1日から3か月後 = 2月1日の前日 = 1月31日）
      const endYear = startDate.getFullYear();
      const endMonth = startDate.getMonth() + previewPeriod;
      // 次の月の0日目 = 前の月の最終日
      endDate = new Date(endYear, endMonth, 0);
    } else {
      // タスクの最小開始日から
      const allDates = tasks.flatMap(task => [new Date(task.start), new Date(task.end)]);
      const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      // 開始日の月初めに設定
      startDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
      // Nか月後の月末を計算
      const endYear = startDate.getFullYear();
      const endMonth = startDate.getMonth() + previewPeriod;
      endDate = new Date(endYear, endMonth, 0);
    }

    // 2. dateArray生成（開始日～終了日まで1日ずつ）
    const dateArray: Date[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      dateArray.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    // 3. グリッド幅計算（① 修正ポイント: padding分を考慮）
    // コンテナのpadding(左右)を差し引いた有効幅を基準にする
    const EFFECTIVE_WIDTH = A3_WIDTH_PX - (PADDING_PX * 2); 
    const timelineWidth = EFFECTIVE_WIDTH - NAME_COL_WIDTH;
    const dayWidth = timelineWidth / dateArray.length; // 日割り幅
    
    // グリッド定義
    const gridTemplate = `${NAME_COL_WIDTH}px repeat(${dateArray.length}, ${dayWidth}px)`;
    const rowHeight = 28;

    // ① Single Grid System: 全体を1つのGridコンテナにする（縦線のズレ防止）
    // grid-template-rows: 月ヘッダー(24) + 週ヘッダー(20) + 日ヘッダー(32) + タスク行(N * 28)
    const headerHeight = 76; // 月(24) + 週(20) + 日(32) = 76px
    const totalHeight = headerHeight + tasks.length * rowHeight; // 実際の高さを計算（⑥不要な行を削除）
    
    // 週計算（Gemini3の提案通り）
    const getWeekInfo = (dates: Date[]) => {
      const weeks: { label: string, start: number, span: number }[] = [];
      if (dates.length === 0) return weeks;
      
      let currentWeek = 1;
      let startIdx = 0;
      let lastMonth = dates[0].getMonth();
      
      dates.forEach((d, i) => {
        if (d.getMonth() !== lastMonth) {
          weeks.push({ label: `${currentWeek}W`, start: startIdx, span: i - startIdx });
          currentWeek = 1;
          startIdx = i;
          lastMonth = d.getMonth();
        } else if (d.getDay() === 0 && d.getDate() !== 1) {
          weeks.push({ label: `${currentWeek}W`, start: startIdx, span: i - startIdx });
          currentWeek++;
          startIdx = i;
        }
      });
      weeks.push({ label: `${currentWeek}W`, start: startIdx, span: dates.length - startIdx });
      return weeks;
    };
    const weeks = getWeekInfo(dateArray);
    
    // ⑦⑧ 罫線スタイル（Gemini3の提案通り）
    const getRightBorder = (d: Date, i: number): string => {
      // 最終列
      if (i === dateArray.length - 1) return 'border-r-2 border-r-gray-800';
      // 月末
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      if (next.getMonth() !== d.getMonth()) return 'border-r-2 border-r-gray-800';
      // 土曜
      if (d.getDay() === 6) return 'border-r border-gray-500';
      return 'border-r border-gray-300';
    };
    
    return (
      <div 
        className="grid bg-white box-border border-t-2 border-l-2 border-gray-800"
        data-area="工程表エリア"
        style={{ 
          gridTemplateColumns: gridTemplate,
          gridTemplateRows: `24px 20px 30px repeat(${Math.max(tasks.length, 1)}, 28px)`,
          width: '100%',
          height: '100%',
        }}
      >
          {/* 左上のヘッダー固定セル（①左端の線=このセルの右線は太線） */}
          <div 
            className="border-r-2 border-b-2 border-gray-800 bg-gray-100 flex items-center justify-center font-bold text-sm"
            style={{ gridRow: '1 / span 3', gridColumn: 1 }}
          >
            工程名
          </div>

          {/* 1行目：月 */}
          {(() => {
            let start = 0;
            let m = dateArray[0].getMonth();
            const els: JSX.Element[] = [];
            dateArray.forEach((d, i) => {
              const isChange = i === dateArray.length - 1 || dateArray[i+1].getMonth() !== m;
              if (isChange) {
                els.push(
                  <div 
                    key={`m-${i}`} 
                    className="flex items-center justify-center font-bold text-xs bg-gray-50 border-r-2 border-b-2 border-gray-800"
                    style={{ gridRow: 1, gridColumn: `${start + 2} / span ${i - start + 1}` }}
                  >
                    {dateArray[start].getFullYear()}年 {dateArray[start].getMonth() + 1}月
                  </div>
                );
                start = i + 1;
                if(i < dateArray.length - 1) m = dateArray[i+1].getMonth();
              }
            });
            return els;
          })()}

          {/* 2行目：週 */}
          {weeks.map((w, i) => (
            <div 
              key={`w-${i}`} 
              className={`flex items-center justify-center text-[10px] bg-white border-b border-gray-500 ${getRightBorder(dateArray[w.start+w.span-1], w.start+w.span-1)}`}
              style={{ gridRow: 2, gridColumn: `${w.start + 2} / span ${w.span}` }}
            >
              {w.label}
            </div>
          ))}

          {/* 3行目：日 */}
          {dateArray.map((d, i) => {
            const isHol = showHolidays && holidays[toDateStr(d)];
            const color = (d.getDay() === 0 || isHol) ? 'text-red-600 bg-red-50' : (d.getDay() === 6 ? 'text-blue-600 bg-blue-50' : 'text-gray-700 bg-white');
            return (
              <div 
                key={`d-${i}`} 
                className={`flex flex-col items-center justify-center text-[10px] border-b-2 border-gray-800 ${color} ${getRightBorder(d, i)}`}
                style={{ gridRow: 3, gridColumn: i + 2 }}
              >
                <span className="font-bold">{d.getDate()}</span>
                <span className="text-[8px]">{['日','月','火','水','木','金','土'][d.getDay()]}</span>
              </div>
            );
          })}

          {/* タスク行 */}
          {tasks.map((task, rowIdx) => {
            const r = rowIdx + 4;
            const rowLine = rowIdx === tasks.length - 1 ? 'border-b-2 border-b-gray-800' : 'border-b border-gray-300';
            
            return (
              <React.Fragment key={task.id}>
                {/* 工程名 */}
                <div 
                  className={`px-2 flex items-center text-[11px] font-medium border-r-2 border-gray-800 truncate ${rowLine}`}
                  style={{ gridRow: r, gridColumn: 1 }}
                >
                  {task.name}
                </div>
                
                {/* 背景セル */}
                {dateArray.map((d, colIdx) => {
                  const isHol = showHolidays && holidays[toDateStr(d)];
                  const bg = (isHol || d.getDay() === 0) ? 'bg-red-50' : (d.getDay() === 6 ? 'bg-blue-50' : 'bg-white');
                  return (
                    <div 
                      key={`bg-${task.id}-${colIdx}`} 
                      className={`${bg} ${getRightBorder(d, colIdx)} ${rowLine}`}
                      style={{ gridRow: r, gridColumn: colIdx + 2 }} 
                    />
                  );
                })}

                {/* バー */}
                {(() => {
                  const s = parseDate(task.start);
                  const e = parseDate(task.end);
                  const sStr = toDateStr(s);
                  const eStr = toDateStr(e);
                  let sIdx = dateArray.findIndex(d => toDateStr(d) === sStr);
                  let eIdx = dateArray.findIndex(d => toDateStr(d) === eStr);
                  
                  if (eIdx < 0 && eStr < toDateStr(dateArray[0])) return null;
                  if (sIdx < 0 && sStr > toDateStr(dateArray[dateArray.length-1])) return null;
                  if (sIdx < 0) sIdx = 0;
                  if (eIdx < 0) eIdx = dateArray.length - 1;

                  return (
                    <div 
                      className="z-10 rounded shadow-sm flex items-center justify-between px-1 text-white text-[9px] overflow-hidden"
                      style={{
                        gridRow: r,
                        gridColumn: `${sIdx + 2} / span ${eIdx - sIdx + 1}`,
                        backgroundColor: task.color,
                        height: '20px',
                        alignSelf: 'center',
                        margin: '0 2px'
                      }}
                    >
                      {showStartDateInBar && <span>{s.getMonth()+1}/{s.getDate()}</span>}
                      {showInnerTextInBar && <span className="truncate flex-1 text-center">{task.innerText}</span>}
                      {showEndDateInBar && <span>{e.getMonth()+1}/{e.getDate()}</span>}
                    </div>
                  );
                })()}
              </React.Fragment>
            );
          })}
      </div>
    );
  };

  // useEffect for initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 工程表設定の読み込み
      setShowHolidays(localStorage.getItem('ganttShowHolidays') === 'true');
      setShowStartDateInBar(localStorage.getItem('ganttShowStartDateInBar') !== 'false');
      setShowEndDateInBar(localStorage.getItem('ganttShowEndDateInBar') !== 'false');
      setDisplayStartDate(localStorage.getItem('ganttDisplayStartDate') || '');
    }
    fetchHolidays();
  }, []);

  // Firestore連携
  const saveProject = async () => {
    if (!projectName.trim()) {
      alert("プロジェクト名を入力してください。");
      return;
    }

    const newProject: GanttProject = {
      id: currentProjectId || Date.now(),
      name: projectName,
      tasks: tasks
    };

    const updatedProjects = currentProjectId
      ? savedProjects.map(p => p.id === currentProjectId ? newProject : p)
      : [...savedProjects, newProject];

    setSavedProjects(updatedProjects);
    setCurrentProjectId(newProject.id);
    // LocalStorageキャッシュ
    localStorage.setItem('ganttProjects', JSON.stringify(updatedProjects));
    // Firestore保存
    try {
      if (currentUser) {
        const colRef = collection(db, 'users', currentUser.uid, 'ganttProjects');
        const docRef = doc(colRef, String(newProject.id));
        await setDoc(docRef, { name: newProject.name, tasks: newProject.tasks } as any);
      }
    } catch {}
    alert("プロジェクトを保存しました。");
  };

  const loadProject = (project: GanttProject) => {
    updateProjectName(project.name);
    setTasks(project.tasks);
    setCurrentProjectId(project.id);
  };

  const deleteProject = async (projectId: number) => {
    if (confirm("このプロジェクトを削除してもよろしいですか？")) {
      const updatedProjects = savedProjects.filter(p => p.id !== projectId);
      setSavedProjects(updatedProjects);
      localStorage.setItem('ganttProjects', JSON.stringify(updatedProjects));
      
      if (currentProjectId === projectId) {
        updateProjectName('');
        setTasks([]);
        setCurrentProjectId(null);
      }
      try { if (currentUser) await deleteDoc(doc(db, 'users', currentUser.uid, 'ganttProjects', String(projectId))) } catch {}
    }
  };

  // 初期表示: セッション/ローカルキャッシュ→Firestore購読
  useEffect(() => {
    const loaded = localStorage.getItem('ganttProjects');
    if (loaded) { try { setSavedProjects(JSON.parse(loaded)) } catch {} }
    if (!currentUser) return
    const colRef = collection(db, 'users', currentUser.uid, 'ganttProjects')
    const unsub = onSnapshot(colRef, (snap) => {
      const list = snap.docs.map(d => ({ id: Number(d.id), ...(d.data() as any) })) as any
      setSavedProjects(list)
      localStorage.setItem('ganttProjects', JSON.stringify(list))
    })
    return () => unsub()
  }, [currentUser]);

  // 週計算関数（暦に合わせた週設定）
  // ルール: 月の1日が常にその月の1W。以降、日曜日が来るたびに週番号が増える。
  const getCustomWeekOfMonth = (date: Date) => {
    const day = date.getDate();
    
    // 1日から当日までの間に「日曜日」が何回あったかを数える（1日が日曜の場合はそのまま1W）
    let weekCount = 1;
    
    // 1日からループしてチェック（計算効率より確実性を重視）
    for (let d = 1; d <= day; d++) {
      const current = new Date(date.getFullYear(), date.getMonth(), d);
      // その日が1日以外で、かつ日曜日なら週を進める
      if (d > 1 && current.getDay() === 0) {
        weekCount++;
      }
    }
    
    const week = weekCount;
    // 週の開始日と終了日を計算（簡易版）
    const weekStart = day <= 7 ? 1 : (day <= 14 ? 8 : (day <= 21 ? 15 : 22));
    const weekEnd = Math.min(new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(), weekStart + 6);
    return { week, dayPosition: 0, weekStart, weekEnd, weekLength: weekEnd - weekStart + 1 };
  };


  // 祝日判定関数
  const isHoliday = (date: Date): boolean => {
    const dateStr = formatDate(date);
    return holidays[dateStr] !== undefined;
  };

  return (
    <div className="space-y-0" id="schedule-gantt-chart-container" data-component="schedule-gantt-chart">
      <div className="bg-[#3b3b3b] rounded-none shadow-md p-3 text-white overflow-x-auto" id="schedule-project-management-section">
        <div className="grid grid-cols-3 gap-3">
          {/* プロジェクト管理セクション */}
          <div className="space-y-2" id="schedule-project-controls">
            <h3 className="text-[13px] font-medium mb-1">プロジェクト管理</h3>
            <div className="flex flex-col gap-2">
              <div className="flex gap-1">
                <select
                  value={projectName}
                  onChange={(e) => {
                    const selectedProject = savedProjects.find(p => p.name === e.target.value);
                    if (selectedProject) {
                      loadProject(selectedProject);
                    }
                    updateProjectName(e.target.value);
                  }}
                  className="w-full px-2 py-1 border rounded text-[11px] bg-white text-gray-900 border-gray-300"
                >
                  <option value="">プロジェクトを選択</option>
                  {savedProjects.map((project) => (
                    <option key={project.id} value={project.name}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    if (!currentUser) {
                      alert('入力するには会員登録（無料）が必要です。');
                      return;
                    }
                    const newProjectName = window.prompt('新規プロジェクト名を入力してください');
                    if (newProjectName) {
                      const exists = savedProjects.some(p => p.name === newProjectName);
                      if (exists) {
                        if (!window.confirm('同名のプロジェクトが存在します。上書きしますか？')) {
                          return;
                        }
                      }
                      updateProjectName(newProjectName);
                      setTasks([]);
                      setTimeout(() => saveProject(), 0);
                    }
                  }}
                  className="w-1/4 px-1 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-[11px]"
                >
                  新規
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('現在の内容を保存しますか？')) {
                      saveProject();
                    }
                  }}
                  className="w-1/4 px-1 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-[11px]"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    const newName = window.prompt('新しいプロジェクト名を入力してください', projectName);
                    if (newName && newName !== projectName) {
                      const exists = savedProjects.some(p => p.name === newName);
                      if (exists) {
                        alert('同名のプロジェクトが既に存在します');
                        return;
                      }
                      const oldProject = savedProjects.find(p => p.name === projectName);
                      if (oldProject) {
                        deleteProject(oldProject.id);
                        updateProjectName(newName);
                        setTimeout(() => saveProject(), 0);
                      }
                    }
                  }}
                  className="w-1/4 px-1 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-[11px]"
                >
                  編集
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('このプロジェクトを削除しますか？')) {
                      const project = savedProjects.find(p => p.name === projectName);
                      if (project) {
                        deleteProject(project.id);
                        updateProjectName('');
                      }
                    }
                  }}
                  className="w-1/4 px-1 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-[11px]"
                >
                  削除
                </button>
              </div>
            </div>
          </div>

          {/* 表示設定セクション */}
          <div className="space-y-2" id="schedule-display-settings">
            <h3 className="text-[13px] font-medium mb-1">表示設定</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <label className="whitespace-nowrap text-[11px]">表示単位:</label>
                <select
                  value={viewType}
                  onChange={(e) => setViewType(e.target.value as 'day' | 'week' | 'month')}
                  onClick={(e) => {
                    if (!isLoggedIn) {
                      alert('入力するには会員登録（無料）が必要です。');
                      e.preventDefault();
                    }
                  }}
                  className="px-1 py-0.5 border rounded flex-1 bg-white text-gray-900 border-gray-300 text-[11px]"
                >
                  <option value="day">日</option>
                  <option value="week">週</option>
                  <option value="month">月</option>
                </select>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={showHolidays}
                    onChange={(e) => setShowHolidays(e.target.checked)}
                    onClick={(e) => {
                      if (!isLoggedIn) {
                        alert('入力するには会員登録（無料）が必要です。');
                        e.preventDefault();
                      }
                    }}
                    id="showHolidays"
                    className="w-3 h-3"
                  />
                  <label htmlFor="showHolidays" className="text-[11px]">祝日</label>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={showStartDateInBar}
                    onChange={(e) => setShowStartDateInBar(e.target.checked)}
                    id="showStartDate"
                    className="w-3 h-3"
                  />
                  <label htmlFor="showStartDate" className="text-[11px]">開始日</label>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={showEndDateInBar}
                    onChange={(e) => setShowEndDateInBar(e.target.checked)}
                    onClick={(e) => {
                      if (!isLoggedIn) {
                        alert('入力するには会員登録（無料）が必要です。');
                        e.preventDefault();
                      }
                    }}
                    id="showEndDate"
                    className="w-3 h-3"
                  />
                  <label htmlFor="showEndDate" className="text-[11px]">終了日</label>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={showInnerTextInBar}
                    onChange={(e) => setShowInnerTextInBar(e.target.checked)}
                    onClick={(e) => {
                      if (!isLoggedIn) {
                        alert('入力するには会員登録（無料）が必要です。');
                        e.preventDefault();
                      }
                    }}
                    id="showInnerTextInBar"
                    className="w-3 h-3"
                  />
                  <label htmlFor="showInnerTextInBar" className="text-[11px]">内文字</label>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[11px]">表示開始日:</label>
              <input
                type="date"
                value={displayStartDate}
                onChange={(e) => setDisplayStartDate(e.target.value)}
                onClick={(e) => {
                  if (!isLoggedIn) {
                    alert('入力するには会員登録（無料）が必要です。');
                    e.preventDefault();
                  }
                }}
                className="px-1 py-0.5 border rounded w-full bg-white text-gray-900 border-gray-300 text-[11px]"
                placeholder="指定しない場合はタスクの開始日から自動計算"
              />
            </div>
          </div>

          {/* 工程追加セクション */}
          <div className="space-y-2" id="schedule-task-add-section">
            <h3 className="text-[13px] font-medium mb-1">工程追加</h3>
            <div className="grid gap-1">
              <div className="flex gap-1">
                <input
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  onClick={(e) => {
                    if (!isLoggedIn) {
                      alert('入力するには会員登録（無料）が必要です。');
                      e.preventDefault();
                    }
                  }}
                  placeholder="工程名"
                  className="flex-1 px-2 py-1 border rounded text-[11px] bg-white text-gray-900 placeholder-gray-500 border-gray-300"
                />
                <input
                  type="color"
                  value={taskColor}
                  onChange={(e) => setTaskColor(e.target.value)}
                  className="w-8 h-6 border rounded cursor-pointer bg-white border-gray-300"
                />
              </div>
              <div className="flex gap-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onClick={(e) => {
                    if (!isLoggedIn) {
                      alert('入力するには会員登録（無料）が必要です。');
                      e.preventDefault();
                    }
                  }}
                  className="px-1 py-0.5 border rounded text-[11px] flex-1 bg-white text-gray-900 border-gray-300"
                />
                <span className="text-[11px]">～</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onClick={(e) => {
                    if (!isLoggedIn) {
                      alert('入力するには会員登録（無料）が必要です。');
                      e.preventDefault();
                    }
                  }}
                  className="px-1 py-0.5 border rounded text-[11px] flex-1 bg-white text-gray-900 border-gray-300"
                />
              </div>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={innerText}
                  onChange={(e) => setInnerText(e.target.value)}
                  onClick={(e) => {
                    if (!isLoggedIn) {
                      alert('入力するには会員登録（無料）が必要です。');
                      e.preventDefault();
                    }
                  }}
                  placeholder="バー内テキスト"
                  className="flex-1 px-2 py-1 border rounded text-[11px] bg-white text-gray-900 placeholder-gray-500 border-gray-300"
                />
                <button
                  onClick={addTask}
                  className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-[11px] w-12"
                >
                  追加
                </button>
              </div>
            </div>
          </div>


        </div>
      </div>

      {/* 工程リストエリア */}
      <div className="bg-[#555555] rounded-none shadow-md text-white" id="schedule-task-list-section">
        <div 
          className="p-3 cursor-pointer flex items-center justify-between hover:bg-[#4a4a4a] transition-colors"
          onClick={() => setIsTaskListExpanded(!isTaskListExpanded)}
        >
          <h3 className="text-[13px] font-medium">工程リスト</h3>
          <span className={`text-[13px] transition-transform duration-200 ${isTaskListExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
        {isTaskListExpanded && (
          <div className="px-3 pb-3 border-t border-gray-600">
            <div className="space-y-1 max-h-[300px] overflow-y-auto mt-2">
              {tasks.length === 0 ? (
                <p className="text-[11px] text-gray-400 py-2">工程が登録されていません</p>
              ) : (
                tasks.map((task, index) => (
                  <TaskEditItem
                    key={task.id}
                    task={task}
                    index={index}
                    onUpdate={(updatedTask) => updateTask(task.id, updatedTask)}
                    onDelete={() => deleteTask(task.id)}
                    onMoveUp={index > 0 ? () => moveTaskUp(index) : undefined}
                    onMoveDown={
                      index < tasks.length - 1 ? () => moveTaskDown(index) : undefined
                    }
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 印刷プレビューエリア: A3印刷プレビューエリア */}
      <div 
        id="preview-area" 
        className="bg-white shadow-md rounded-none mt-4 schedule-print-preview-section"
        data-area="印刷プレビューエリア"
      >
        {/* 印刷プレビューエリア: プレビューコントロール */}
        <div 
          className="bg-gray-100 p-3 border-b flex items-center justify-between" 
          id="schedule-preview-controls"
          data-area="印刷プレビューエリア-コントロール"
        >
          <div className="flex items-center gap-4">
            <h3 className="text-[13px] font-medium text-gray-900">A3横 印刷プレビュー</h3>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-600">表示期間:</span>
              <select
                value={previewPeriod}
                onChange={(e) => setPreviewPeriod(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-[11px] bg-white"
              >
                {getPeriodOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1 ml-2">
                <span className="text-[11px] text-gray-600">拡大率:</span>
                <button
                  onClick={() => setPreviewZoom(Math.max(25, previewZoom - 25))}
                  className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-[11px]"
                  title="縮小"
                >
                  −
                </button>
                <span className="text-[11px] text-gray-700 min-w-[50px] text-center">{previewZoom}%</span>
                <button
                  onClick={() => setPreviewZoom(Math.min(200, previewZoom + 25))}
                  className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-[11px]"
                  title="拡大"
                >
                  ＋
                </button>
                <button
                  onClick={() => setPreviewZoom(100)}
                  className="px-2 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 text-[11px]"
                  title="リセット"
                >
                  100%
                </button>
              </div>
              <button
                onClick={() => {
                  // プロジェクト名に応じてドキュメントタイトルを設定
                  const defaultPageTitle = "工程表";
                  document.title = projectName ? `${projectName} ${defaultPageTitle}` : defaultPageTitle;
                  
                  // 印刷実行
                  window.print();
                }}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-[11px] ml-4"
              >
                印刷
              </button>
            </div>
          </div>
        </div>
        
        {/* 印刷プレビューエリア: 上側の疑似スクロールバー */}
        {previewZoom > 100 && (
          <div
            ref={topScrollRef}
            className="w-full overflow-x-auto mb-2"
            id="schedule-top-scrollbar"
            data-area="印刷プレビューエリア-上部スクロールバー"
            style={{ height: '12px', backgroundColor: '#f5f5f5' }}
            onScroll={handleTopScroll}
          >
            {/* ② 拡大率に合わせてスクロール幅を確保 */}
            <div 
              id="schedule-top-scroll-track"
              style={{ 
                width: `${(A3_WIDTH_PX + 80) * (previewZoom / 100)}px`, 
                height: 1 
              }} 
            />
          </div>
        )}
        
        {/* ②③ プレビューコンテナ: ドラッグイベント追加 */}
        <div 
          ref={previewContainerRef}
          className="schedule-preview-container overflow-auto w-full bg-[#525659] relative select-none"
          onScroll={handlePreviewScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{ height: '600px', padding: '40px', cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          {/* ラッパー: ここでサイズを定義し、margin: auto で中央寄せ */}
          {(() => {
            const scale = previewZoom / 100;
            
            // ②③ コンテナサイズを動的に計算（余白パディング込み）
            const wrapperStyle = {
              width: `${A3_WIDTH_PX * scale}px`,
              height: `${A3_HEIGHT_PX * scale}px`,
              margin: 'auto',
              position: 'relative' as const,
              backgroundColor: 'white',
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            };
            
            return (
              <div style={wrapperStyle}>
                {/* 印刷対象（ID付与） */}
                <div 
                  id="print-target-container"
                  style={{
                    width: `${A3_WIDTH_PX}px`,
                    height: `${A3_HEIGHT_PX}px`,
                    padding: `${PADDING_MM}mm`, // 10mm
                    boxSizing: 'border-box',
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    backgroundColor: 'white',
                    overflow: 'hidden'
                  }}
                >
                  {/* ④ ヘッダー部: 幅100%で両端揃え */}
                  <div className="print-header-row flex justify-between items-end border-b border-gray-400 mb-2 pb-1 w-full">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-800">{projectName || '工程表'}</h1>
                    </div>
                    <div className="text-right text-[10px] text-gray-500 leading-tight">
                      <p>印刷日: {new Date().toLocaleDateString()}</p>
                      <p>A3横 (420mm × 297mm)</p>
                    </div>
                  </div>

                  {/* 工程表本体 */}
                  <div className="w-full flex-1 relative">
                    {renderGanttTimeline()}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

    </div>
  );
};

export default Schedule;

