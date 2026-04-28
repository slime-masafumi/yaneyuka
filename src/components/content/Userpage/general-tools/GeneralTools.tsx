'use client';

import React, { useState, useRef, useEffect } from 'react';
// ★修正: ルーティング関連は削除（タブ切り替えでURLを変えないため）
// import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import MapView from './MapView';
import PDFCompressor from './PDFCompressor';
import ImageConverter from './ImageConverter';
import FileTransferTool from './FileTransfer';
import TempStorage from './TempStorage';
import Spreadsheet from './Spreadsheet';
import ScheduleTool from './ScheduleTool';
import BookmarkTool from './Bookmark';
import UnitConverter from './UnitConverter';
import AlarmTool from './AlarmTool';
import MemoTool from './Memo';
import { FiPlus, FiCheck, FiTrash2, FiCalendar, FiEdit2, FiPlusCircle } from 'react-icons/fi';
import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/20/solid';
import { 
  SiZoom, 
  SiGooglemeet, 
  SiWebex, 
  SiSlack, 
  SiDiscord 
} from 'react-icons/si';
import { BsMicrosoftTeams } from 'react-icons/bs';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebaseClient';
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, setDoc, getDoc, getDocs, query, orderBy, serverTimestamp, writeBatch } from 'firebase/firestore';

interface CalculationHistory {
  id: string;
  expression: string;
  result: string;
  timestamp: Date;
  memo: string;
  isLocked: boolean;
}

const formatNumberString = (value: string): string => {
  if (!value) return value;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '-' || trimmed === '+' || trimmed === 'Error') return value;
  if (/e|E/.test(trimmed)) return value;
  if (!/^[-+]?\d*\.?\d*$/.test(trimmed)) return value;

  const sign = trimmed.startsWith('-') ? '-' : '';
  const numericPart = trimmed.replace(/^[-+]/, '');
  let [integerPart, fractionPart] = numericPart.split('.');

  if (!integerPart || integerPart === '') integerPart = '0';
  const formattedInt = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (fractionPart !== undefined) {
    return `${sign}${formattedInt}.${fractionPart}`;
  }

  return `${sign}${formattedInt}`;
};

const shouldAttachSignToNumber = (prevChar: string | null) => {
  if (prevChar === null) return true;
  const operators = ['+', '-', '*', '/', '^', '(', '×', '÷'];
  return operators.includes(prevChar);
};

const formatExpressionForDisplay = (expression: string): string => {
  if (!expression) return expression;

  let result = '';
  let buffer = '';
  let prevChar: string | null = null;

  const flushBuffer = () => {
    if (!buffer) return;
    result += formatNumberString(buffer);
    buffer = '';
  };

  for (let i = 0; i < expression.length; i++) {
    const ch = expression[i];
    const isDigit = ch >= '0' && ch <= '9';
    const isDot = ch === '.';
    const isLetter = /[a-zA-Z]/.test(ch);

    if (isDigit || (isDot && buffer !== '' && !buffer.includes('.'))) {
      buffer += ch;
    } else if (ch === '-' && shouldAttachSignToNumber(prevChar)) {
      if (buffer === '') {
        buffer = '-';
      } else {
        flushBuffer();
        buffer = '-';
      }
    } else if (ch === '+' && buffer === '' && shouldAttachSignToNumber(prevChar)) {
      buffer = '+';
    } else {
      flushBuffer();
      if (ch === '*') {
        result += '×';
      } else if (ch === '/') {
        result += '÷';
      } else {
        result += ch;
      }
    }

    if (!isLetter) {
      prevChar = ch;
    } else {
      prevChar = ch;
    }
  }

  flushBuffer();
  return result;
};

interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

const MapSection: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="w-full bg-white rounded-b-lg shadow-sm border-b border-gray-100">
      <div className="p-4 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div>
        <h3 className="text-[13px] font-medium">地図</h3>
          <p className="text-[11px] mt-0.5">住所や施設名を検索して地図上で確認。OpenStreetMapを使用した無料の地図表示ツール</p>
        </div>
      </div>
      <div className="p-4">
        <MapView
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearch={() => {}}
        />
      </div>
    </div>
  );
};

const ONLINE_MEETING_TOOLS = [
  {
    name: 'Zoom',
    description: 'ビデオ会議のスタンダード。安定した通信と使いやすさが特徴',
    url: 'https://zoom.us/join',
    iconComponent: SiZoom,
    iconColor: '#2D8CFF', // Zoom Blue
  },
  {
    name: 'Microsoft Teams',
    description: 'Microsoft 365との連携が強み。ビジネス向けコラボレーション機能が充実',
    url: 'https://teams.microsoft.com/',
    iconComponent: BsMicrosoftTeams,
    iconColor: '#6264A7', // Teams Purple
  },
  {
    name: 'Google Meet',
    description: 'Googleアカウントがあれば即座に利用可能。Googleカレンダーとの連携が便利',
    url: 'https://meet.google.com/',
    iconComponent: SiGooglemeet,
    iconColor: '#00897B', // Meet Green/Teal
  },
  {
    name: 'Webex',
    description: 'セキュリティ重視の企業向けWeb会議システム。大規模会議に強み',
    url: 'https://web.webex.com/join-meeting',
    iconComponent: SiWebex,
    iconColor: '#000000', // Webex Black
  },
  {
    name: 'Slack Huddle',
    description: 'Slackユーザー向けの気軽な音声通話。画面共有もスムーズ',
    url: 'https://slack.com/',
    iconComponent: SiSlack,
    iconColor: '#4A154B', // Slack Aubergine
  },
  {
    name: 'Discord',
    description: 'カジュアルなコミュニケーションに最適。画面共有や複数チャンネル管理が可能',
    url: 'https://discord.com/channels/@me',
    iconComponent: SiDiscord,
    iconColor: '#5865F2', // Discord Blurple
  }
];


type TabType =
  | 'memo'
  | 'sheet'
  | 'calc'
  | 'olmt'
  | 'schedule'
  | 'map'
  | 'image-converter'
  | 'pdf-compressor'
  | 'temp-storage'
  | 'file-transfer'
  | 'unit-converter'
  | 'bookmark'
  | 'alarm';

const VALID_TABS: TabType[] = [
  'memo',
  'sheet',
  'calc',
  'olmt',
  'schedule',
  'map',
  'image-converter',
  'pdf-compressor',
  'temp-storage',
  'file-transfer',
  'unit-converter',
  'bookmark',
  'alarm'
];

const GeneralTools: React.FC = () => {
  // ★修正: ルーター関連の処理を削除
  // const searchParams = useSearchParams();
  // const router = useRouter();
  // const pathname = usePathname();
  
  // ★修正: シンプルなState管理に変更（初期値は'memo'）
  const [activeTab, setActiveTab] = useState<TabType>('memo');

  // 関数電卓の状態
  const [calculatorExpression, setCalculatorExpression] = useState('');
  const [calculatorDisplay, setCalculatorDisplay] = useState('0');
  // 計算履歴の状態を更新
  const [calculatorHistory, setCalculatorHistory] = useState<CalculationHistory[]>([]);
  const [shiftMode, setShiftMode] = useState(false);
  const [ansValue, setAnsValue] = useState('0');
  const [editingMemo, setEditingMemo] = useState<string | null>(null);
  const [tempMemo, setTempMemo] = useState('');
  const [lastCalculated, setLastCalculated] = useState<boolean>(false); // 計算直後かどうかを示すフラグ
  
  // ハイライト色の状態
  const [highlightColor, setHighlightColor] = useState('#ffff00');
  const highlightColorInputRef = useRef<HTMLInputElement>(null);

  const { currentUser, isLoggedIn } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      setCalculatorHistory([])
      return
    }

    const colRef = collection(db, 'users', currentUser.uid, 'calculatorHistory')
    const historyQuery = query(colRef, orderBy('timestamp', 'desc'))
    const unsubscribe = onSnapshot(historyQuery, (snap) => {
      const histories: CalculationHistory[] = snap.docs.map((docSnap) => {
        const data = docSnap.data() as any
        const rawTimestamp = data.timestamp
        const timestamp =
          rawTimestamp?.toDate?.() ??
          (typeof rawTimestamp === 'number' ? new Date(rawTimestamp) : new Date())
        const isLocked = data.isLocked ?? data.isPinned ?? false
        return {
          id: docSnap.id,
          expression: data.expression || '',
          result: data.result || '',
          memo: data.memo || '',
          isLocked: Boolean(isLocked),
          timestamp,
        }
      })
      setCalculatorHistory(histories)
    })

    return () => unsubscribe()
  }, [currentUser])








  // 関数電卓の機能を更新
  const calculatorInput = (input: string) => {
    if (!isLoggedIn) {
      alert('入力するには会員登録（無料）が必要です。');
      return;
    }
    // 数字、小数点、演算子かどうかをチェック
    const isNumber = /[0-9.]/.test(input);
    const isOperator = ['+', '-', '×', '÷', '^'].includes(input);

    if (isNumber && lastCalculated) {
      // 計算直後に数字が入力された場合は新規入力として扱う
      setCalculatorExpression(input);
      setCalculatorDisplay(input);
      setLastCalculated(false);
      return;
    }

    switch (input) {
      case 'AC':
        setCalculatorExpression('');
        setCalculatorDisplay('0');
        setLastCalculated(false);
        break;
      case 'DEL':
        if (calculatorExpression.length > 0) {
          const newExpression = calculatorExpression.slice(0, -1);
          setCalculatorExpression(newExpression);
          setCalculatorDisplay(newExpression || '0');
        }
        setLastCalculated(false);
        break;
      case '=':
        calculateResult();
        setLastCalculated(true);
        break;
      case 'SHIFT':
        setShiftMode(!shiftMode);
        break;
      case 'ALPHA':
      case 'MODE':
        // 実装予定
        break;
      case 'Ans':
        if (lastCalculated) {
          setCalculatorExpression(ansValue);
          setCalculatorDisplay(ansValue);
        } else {
        const newExprWithAns = calculatorExpression + ansValue;
        setCalculatorExpression(newExprWithAns);
        setCalculatorDisplay(newExprWithAns);
        }
        setLastCalculated(false);
        break;
      case '×':
        appendToExpression('*');
        setLastCalculated(false);
        break;
      case '÷':
        appendToExpression('/');
        setLastCalculated(false);
        break;
      case 'x²':
        appendToExpression('^2');
        setLastCalculated(false);
        break;
      case 'x^':
        appendToExpression('^');
        setLastCalculated(false);
        break;
      case '√':
        appendToExpression('sqrt(');
        setLastCalculated(false);
        break;
      case 'log':
        appendToExpression('log(');
        setLastCalculated(false);
        break;
      case 'ln':
        appendToExpression('ln(');
        setLastCalculated(false);
        break;
      case 'sin':
        appendToExpression('sin(');
        setLastCalculated(false);
        break;
      case 'cos':
        appendToExpression('cos(');
        setLastCalculated(false);
        break;
      case 'tan':
        appendToExpression('tan(');
        setLastCalculated(false);
        break;
      case 'EXP':
        appendToExpression('e^');
        setLastCalculated(false);
        break;
      case '(-)':
        if (calculatorExpression === '' || calculatorExpression === '0') {
          setCalculatorExpression('-');
          setCalculatorDisplay('-');
        } else {
          appendToExpression('*(-1)');
        }
        setLastCalculated(false);
        break;
      default:
        if (calculatorExpression === '0' && isNumber && input !== '.') {
          setCalculatorExpression(input);
          setCalculatorDisplay(input);
        } else {
        appendToExpression(input);
        }
        setLastCalculated(false);
        break;
    }
  };

  const appendToExpression = (value: string) => {
    const newExpression = calculatorExpression + value;
    setCalculatorExpression(newExpression);
    setCalculatorDisplay(newExpression);
  };

  // 安全な数式評価（evalを使わない）
  const safeEvaluate = (expr: string): number => {
    // 許可する文字: 数字, 演算子, 括弧, 小数点, スペース, Math関数
    const sanitized = expr.replace(/\s/g, '');
    // 危険な文字列が含まれていないかチェック
    if (/[a-zA-Z]/.test(sanitized.replace(/Math\.(sin|cos|tan|log10|log|sqrt|PI|exp|abs|ceil|floor|round|pow|min|max|E)\b/g, ''))) {
      throw new Error('Invalid expression');
    }
    // Function constructorで安全に評価（グローバルスコープにアクセスできない）
    const fn = new Function('Math', `"use strict"; return (${expr});`);
    const result = fn(Math);
    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error('Invalid result');
    }
    return result;
  };

  // 計算結果を履歴に追加する関数を更新
  const calculateResult = async () => {
    try {
      let expression = calculatorExpression
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/log\(/g, 'Math.log10(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/\^/g, '**')
        .replace(/π/g, 'Math.PI')
        .replace(/e\^/g, 'Math.exp(');

      const result = safeEvaluate(expression);
      const resultString = result.toString();
      
      setCalculatorDisplay(resultString);
      setAnsValue(resultString);
      
      // 履歴に追加
      const historyItem: CalculationHistory = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        expression: calculatorExpression,
        result: resultString,
        timestamp: new Date(),
        memo: '',
        isLocked: false
      };

      if (currentUser) {
        try {
          const colRef = collection(db, 'users', currentUser.uid, 'calculatorHistory')
          const docRef = await addDoc(colRef, {
            expression: historyItem.expression,
            result: historyItem.result,
            memo: '',
            isLocked: false,
            isPinned: false,
            timestamp: serverTimestamp(),
          })
          setCalculatorHistory(prev => [{ ...historyItem, id: docRef.id }, ...prev])
        } catch (error) {
          console.error('関数電卓履歴の保存に失敗しました', error)
          setCalculatorHistory(prev => [historyItem, ...prev])
        }
      } else {
        setCalculatorHistory(prev => [historyItem, ...prev])
      }
      
      setCalculatorExpression(resultString);
    } catch (error) {
      setCalculatorDisplay('Error');
    }
  };

  const clearCalculatorHistory = async () => {
    setCalculatorHistory(prev => prev.filter(item => item.isLocked));
    if (!currentUser) return;

    try {
      const colRef = collection(db, 'users', currentUser.uid, 'calculatorHistory')
      const snap = await getDocs(colRef)
      if (!snap.empty) {
        const batch = writeBatch(db)
        let hasDeletion = false
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data() as any
          const locked = data?.isLocked ?? data?.isPinned ?? false
          if (!locked) {
            batch.delete(docSnap.ref)
            hasDeletion = true
          }
        })
        if (hasDeletion) {
          await batch.commit()
        }
      }
    } catch (error) {
      console.error('関数電卓履歴の削除に失敗しました', error)
    }
  };

  // ロック機能の追加
  const toggleLock = async (id: string) => {
    const target = calculatorHistory.find(item => item.id === id)
    const nextLocked = target ? !target.isLocked : true

    setCalculatorHistory(prev => 
      prev.map(item => 
        item.id === id ? { ...item, isLocked: nextLocked } : item
      )
    );

    if (!currentUser || !target) return

    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'calculatorHistory', id), { isLocked: nextLocked, isPinned: nextLocked })
    } catch (error) {
      console.error('関数電卓履歴のロック更新に失敗しました', error)
    }
  };

  const startEditingMemo = (id: string, currentMemo: string) => {
    setEditingMemo(id);
    setTempMemo(currentMemo || '');
  };

  const saveMemoToHistory = async (id: string) => {
    const memoToSave = tempMemo;
    setCalculatorHistory(prev => 
      prev.map(item => 
        item.id === id ? { ...item, memo: memoToSave } : item
      )
    );
    setEditingMemo(null);
    setTempMemo('');

    if (!currentUser) return

    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'calculatorHistory', id), { memo: memoToSave })
    } catch (error) {
      console.error('関数電卓履歴のメモ保存に失敗しました', error)
    }
  };

  const cancelEditingMemo = () => {
    setEditingMemo(null);
    setTempMemo('');
  };

  // 計算履歴の表示を更新
  const renderCalculatorHistory = () => {
    const sortedHistory = [...calculatorHistory].sort((a, b) => {
      if (a.isLocked && !b.isLocked) return -1;
      if (!a.isLocked && b.isLocked) return 1;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    return (
      <div className="space-y-2">
        {sortedHistory.map((item, index) => {
          const formattedResult = formatNumberString(item.result);
          return (
          <div 
            key={`${item.id}-${index}`} 
            className={`p-2 rounded-lg border ${item.isLocked ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}
          >
            <div className="flex items-center gap-2">
              {/* ピン留めとメモボタン */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleLock(item.id)}
                  className={`p-1 rounded hover:bg-gray-200 transition-colors ${item.isLocked ? 'text-blue-500' : 'text-gray-400'}`}
                >
                  {item.isLocked ? <LockClosedIcon className="w-3 h-3" /> : <LockOpenIcon className="w-3 h-3" />}
                </button>
                {!editingMemo || editingMemo !== item.id ? (
                  <button
                    onClick={() => startEditingMemo(item.id, item.memo || '')}
                    className="p-1 text-xs text-gray-400 hover:text-blue-500 transition-colors"
                  >
                    {item.memo ? <FiEdit2 className="w-3 h-3" /> : <FiPlusCircle className="w-3 h-3" />}
                  </button>
                ) : null}
              </div>

              {/* メモ表示または編集フォーム */}
              {editingMemo === item.id ? (
                <div className="flex-1 flex items-center gap-1">
                  <input
                    type="text"
                    value={tempMemo}
                    onChange={(e) => setTempMemo(e.target.value)}
                    placeholder="メモを入力..."
                    className="flex-1 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                  <button
                    onClick={() => saveMemoToHistory(item.id)}
                    className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  >
                    保存
                  </button>
                  <button
                    onClick={cancelEditingMemo}
                    className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              ) : (
                <>
                  {/* メモ内容 */}
                  {item.memo && (
                    <div className="text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-100 min-w-[100px] max-w-[200px] truncate">
                      {item.memo}
                    </div>
                  )}

                  {/* 計算式と結果 */}
                  <div className="flex-1 text-xs" style={{ fontFamily: "'Roboto', sans-serif" }}>
                    <span className="text-gray-600">{formatExpressionForDisplay(item.expression)}</span>
                    <span className="text-gray-400 mx-1">=</span>
                    <span className="text-gray-800 font-bold">{formattedResult}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )})}
      </div>
    );
  };

  // 計算機本体の表示部分を更新
  const renderCalculator = () => (
    <div className="w-full bg-white rounded-b-lg shadow-sm border-b border-gray-100">
      <div className="p-4 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div>
        <h3 className="text-[13px] font-medium">関数電卓</h3>
        <p className="text-[11px] mt-0.5">三角関数・対数・累乗などの関数計算に対応した高機能電卓。計算履歴の保存・管理が可能</p>
        </div>
      </div>
      <div className="p-4">
    <div className="flex gap-4">
      {/* 関数電卓本体 */}
      <div className="w-72 bg-gray-800 rounded-lg shadow-sm border border-gray-700 flex-shrink-0 h-fit">
        <div className="p-3 border-b border-gray-700">
          <h3 className="text-[13px] font-medium text-gray-200">関数電卓</h3>
        </div>
        <div className="p-3 pb-4">
          <div className="space-y-3">
            <div className="bg-gray-900 p-3 rounded h-20 flex flex-col justify-between">
              <input 
                type="text" 
                value={formatExpressionForDisplay(calculatorExpression)}
                className="w-full bg-transparent text-right text-xs text-gray-400 focus:outline-none overflow-hidden" 
                readOnly 
              />
              <input 
                type="text" 
                value={formatExpressionForDisplay(calculatorDisplay)}
                className="w-full bg-transparent text-right text-xl font-mono focus:outline-none text-gray-100 overflow-hidden" 
                readOnly 
              />
            </div>
            <div className="grid grid-cols-5 gap-1">
              {/* Row 1 */}
              <button onClick={() => calculatorInput('SHIFT')} className={`text-[10px] ${shiftMode ? 'bg-blue-600' : 'bg-gray-700'} hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded`}>SHIFT</button>
              <button onClick={() => calculatorInput('ALPHA')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">ALPHA</button>
              <button onClick={() => calculatorInput('MODE')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">MODE</button>
              <button onClick={() => calculatorInput('DEL')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">DEL</button>
              <button onClick={() => calculatorInput('AC')} className="text-[10px] bg-gray-600 hover:bg-gray-500 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">AC</button>

              {/* Row 2 */}
              <button onClick={() => calculatorInput('x²')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">x²</button>
              <button onClick={() => calculatorInput('x^')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">x^</button>
              <button onClick={() => calculatorInput('√')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">√</button>
              <button onClick={() => calculatorInput('log')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">log</button>
              <button onClick={() => calculatorInput('ln')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">ln</button>

              {/* Row 3 */}
              <button onClick={() => calculatorInput('sin')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">sin</button>
              <button onClick={() => calculatorInput('cos')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">cos</button>
              <button onClick={() => calculatorInput('tan')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">tan</button>
              <button onClick={() => calculatorInput('nCr')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">nCr</button>
              <button onClick={() => calculatorInput('EXP')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">EXP</button>

              {/* Row 4 */}
              <button onClick={() => calculatorInput('7')} className="py-2 px-1 text-center rounded text-sm font-mono bg-gray-900 hover:bg-gray-800 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all">7</button>
              <button onClick={() => calculatorInput('8')} className="py-2 px-1 text-center rounded text-sm font-mono bg-gray-900 hover:bg-gray-800 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all">8</button>
              <button onClick={() => calculatorInput('9')} className="py-2 px-1 text-center rounded text-sm font-mono bg-gray-900 hover:bg-gray-800 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all">9</button>
              <button onClick={() => calculatorInput('(')} className="py-2 px-1 text-center rounded text-sm font-mono text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all">(</button>
              <button onClick={() => calculatorInput(')')} className="py-2 px-1 text-center rounded text-sm font-mono text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all">)</button>

              {/* Row 5 */}
              <button onClick={() => calculatorInput('4')} className="py-2 px-1 text-center rounded text-sm font-mono bg-gray-900 hover:bg-gray-800 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all">4</button>
              <button onClick={() => calculatorInput('5')} className="py-2 px-1 text-center rounded text-sm font-mono bg-gray-900 hover:bg-gray-800 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all">5</button>
              <button onClick={() => calculatorInput('6')} className="py-2 px-1 text-center rounded text-sm font-mono bg-gray-900 hover:bg-gray-800 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all">6</button>
              <button onClick={() => calculatorInput('×')} className="py-2 px-1 text-center rounded text-sm font-mono bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all">×</button>
              <button onClick={() => calculatorInput('÷')} className="py-2 px-1 text-center rounded text-sm font-mono bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all">÷</button>

              {/* Row 6 */}
              <button onClick={() => calculatorInput('1')} className="py-2 px-1 text-center rounded text-sm font-mono bg-gray-900 hover:bg-gray-800 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all">1</button>
              <button onClick={() => calculatorInput('2')} className="py-2 px-1 text-center rounded text-sm font-mono bg-gray-900 hover:bg-gray-800 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all">2</button>
              <button onClick={() => calculatorInput('3')} className="py-2 px-1 text-center rounded text-sm font-mono bg-gray-900 hover:bg-gray-800 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all">3</button>
              <button onClick={() => calculatorInput('+')} className="py-2 px-1 text-center rounded text-sm font-mono bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all">+</button>
              <button onClick={() => calculatorInput('-')} className="py-2 px-1 text-center rounded text-sm font-mono bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all">-</button>

              {/* Row 7 */}
              <button onClick={() => calculatorInput('0')} className="py-2 px-1 text-center rounded text-sm font-mono bg-gray-900 hover:bg-gray-800 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all">0</button>
              <button onClick={() => calculatorInput('.')} className="py-2 px-1 text-center rounded text-sm font-mono bg-gray-900 hover:bg-gray-800 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all">.</button>
              <button onClick={() => calculatorInput('(-)')} className="py-2 px-1 text-center rounded text-sm font-mono text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all">(-)</button>
              <button onClick={() => calculatorInput('Ans')} className="py-2 px-1 text-center rounded text-sm font-mono text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all">Ans</button>
              <button onClick={() => calculatorInput('=')} className="py-2 px-1 text-center rounded text-sm font-mono bg-orange-500 hover:bg-orange-600 text-white shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all">=</button>
            </div>
          </div>
        </div>
      </div>

      {/* 計算履歴 */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-100 min-h-0 h-[600px]">
        <div className="p-3 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-[13px] font-medium text-gray-800">計算履歴</h3>
          <button 
            onClick={clearCalculatorHistory}
            className="px-2 py-1 text-xs text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
          >
            ALL CLEAR
          </button>
        </div>
        <div className="p-3 h-[calc(600px-80px)] overflow-y-auto">
          {renderCalculatorHistory()}
                  </div>
          </div>
                  </div>
      </div>
    </div>
  );



  const renderOLMT = () => (
    <div className="w-full bg-white rounded-b-lg shadow-sm border-b border-gray-100">
      <div className="p-4 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div>
        <h3 className="text-[13px] font-medium">OLMT</h3>
          <p className="text-[11px] mt-0.5">Zoom、Teams、Google Meetなど主要なオンラインミーティングツールへのクイックアクセス</p>
        </div>
      </div>
      <div className="p-4">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {ONLINE_MEETING_TOOLS.map((tool) => (
        <a
          key={tool.name}
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-100"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 flex-shrink-0 bg-gray-50 rounded-lg flex items-center justify-center">
              {tool.iconComponent ? (
                <tool.iconComponent size={24} color={tool.iconColor} />
              ) : (
                <span className="text-xl font-medium text-gray-400">{tool.name[0]}</span>
              )}
            </div>
            <div>
              <h3 className="text-base font-medium text-gray-900">
                {tool.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {tool.description}
              </p>
            </div>
          </div>
        </a>
      ))}
        </div>
      </div>
    </div>
  );


  const renderTools = () => (
    <div className="p-4">
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setActiveTab('map')}
          className={`px-4 py-2 rounded ${
            activeTab === 'map'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          地図
        </button>

        <button
          onClick={() => setActiveTab('olmt')}
          className={`px-4 py-2 rounded ${
            activeTab === 'olmt'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          OLMT
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 rounded ${
            activeTab === 'schedule'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          スケ調
        </button>

        <button
          onClick={() => setActiveTab('memo')}
          className={`px-4 py-2 rounded ${
            activeTab === 'memo'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          メモ
        </button>

          <button
            onClick={() => setActiveTab('sheet')}
            className={`px-4 py-1 text-xs rounded focus:outline-none transition ${
              activeTab === 'sheet' 
                ? 'bg-gray-700 text-white' 
                : 'bg-gray-200 hover:bg-gray-700 hover:text-white'
            }`}
          >
            表計算
        </button>

        <button
          onClick={() => setActiveTab('calc')}
          className={`px-4 py-2 rounded ${
            activeTab === 'calc'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          関数電卓
        </button>

        <button
          onClick={() => setActiveTab('image-converter')}
          className={`px-4 py-2 rounded ${
            activeTab === 'image-converter'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          画像変換
        </button>

        <button
          onClick={() => setActiveTab('pdf-compressor')}
          className={`px-4 py-2 rounded ${
            activeTab === 'pdf-compressor'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          PDF圧縮
        </button>

        <button
          onClick={() => setActiveTab('temp-storage')}
          className={`px-4 py-2 rounded ${
            activeTab === 'temp-storage'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          一時ファイル
        </button>

        <button
          onClick={() => setActiveTab('file-transfer')}
          className={`px-4 py-2 rounded ${
            activeTab === 'file-transfer'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          ファイル転送
        </button>

        <button
          onClick={() => setActiveTab('unit-converter')}
          className={`px-4 py-2 rounded ${
            activeTab === 'unit-converter'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          単位変換
        </button>

        <button
          onClick={() => setActiveTab('alarm')}
          className={`px-4 py-2 rounded ${
            activeTab === 'alarm'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          アラーム
        </button>

        <button
          onClick={() => setActiveTab('bookmark')}
          className={`px-4 py-2 rounded ${
            activeTab === 'bookmark'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          ブックマーク
        </button>
      </div>

      {activeTab === 'memo' && <MemoTool />}
      {activeTab === 'olmt' && renderOLMT()}
      {activeTab === 'calc' && renderCalculator()}
      {activeTab === 'image-converter' && <ImageConverter />}
      {activeTab === 'map' && <MapSection />}
      {activeTab === 'pdf-compressor' && <PDFCompressor />}
      {activeTab === 'unit-converter' && <UnitConverter />}
      {activeTab === 'alarm' && <AlarmTool />}
      {activeTab === 'bookmark' && <BookmarkTool />}
    </div>
  );

  // キーボードイベントのハンドラーを追加
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+SまたはCmd+Sを無効化（メモタブの場合）
      if (activeTab === 'memo' && (e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        return;
      }

      // 入力フィールドでの入力時は無視
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // アクティブタブが関数電卓の場合のみ処理
      if (activeTab !== 'calc') {
        return;
      }

      // キーに応じた処理
      switch (e.key) {
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
        case '.':
          calculatorInput(e.key);
          break;
        case '+':
          calculatorInput('+');
          break;
        case '-':
          calculatorInput('-');
          break;
        case '*':
          calculatorInput('×');
          break;
        case '/':
          calculatorInput('÷');
          break;
        case 'Enter':
          calculatorInput('=');
          break;
        case 'Backspace':
          calculatorInput('DEL');
          break;
        case 'Escape':
          calculatorInput('AC');
          break;
        case '(':
          calculatorInput('(');
          break;
        case ')':
          calculatorInput(')');
          break;
        case '^':
          calculatorInput('x^');
          break;
      }
    };

    // イベントリスナーの登録
    window.addEventListener('keydown', handleKeyDown);

    // クリーンアップ
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTab, calculatorInput]); // 依存配列にactiveTabとcalculatorInputを追加


  return (
    <div className="p-0 bg-white rounded-lg">
      <div className="flex items-baseline mb-2">
        <h2 className="text-xl font-semibold">一般ツール</h2>
        <span className="text-red-600 font-bold text-sm ml-4">※この機能は現在β版です。ご意見をぜひお聞かせください。</span>
      </div>
      <p className="text-[12px] text-gray-600 mb-4">
        メモ、表計算、関数電卓、画像変換・PDF圧縮、単位変換、ファイル転送・一時保存、ブックマーク、地図表示、オンラインミーティングツール、スケジュール調整、タイマー・アラーム・業務記録など、日常業務で頻繁に使用するユーティリティツールをまとめています。用途に応じてタブを切り替え、素早く作業を進めてください。
      </p>
      
      {/* ツール選択タブ */}
      <div className="bg-[#3b3b3b] w-full overflow-x-auto">
        <div className="flex">
          <button
            onClick={() => setActiveTab('bookmark')}
            className={`flex-1 px-2 py-2 text-xs font-medium focus:outline-none transition whitespace-nowrap ${
              activeTab === 'bookmark'
                ? 'bg-[#1dad95] text-white'
                : 'bg-[#3b3b3b] text-white hover:bg-[#0f6b5a]'
            }`}
          >
            ブックマーク
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 px-2 py-2 text-xs font-medium focus:outline-none transition whitespace-nowrap ${
              activeTab === 'map' 
                ? 'bg-[#1dad95] text-white' 
                : 'bg-[#3b3b3b] text-white hover:bg-[#0f6b5a]'
            }`}
          >
            地図
          </button>

          <button
            onClick={() => setActiveTab('olmt')}
            className={`flex-1 px-2 py-2 text-xs font-medium focus:outline-none transition whitespace-nowrap ${
              activeTab === 'olmt' 
                ? 'bg-[#1dad95] text-white' 
                : 'bg-[#3b3b3b] text-white hover:bg-[#0f6b5a]'
            }`}
          >
            OLMT
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 px-2 py-2 text-xs font-medium focus:outline-none transition whitespace-nowrap ${
              activeTab === 'schedule' 
                ? 'bg-[#1dad95] text-white' 
                : 'bg-[#3b3b3b] text-white hover:bg-[#0f6b5a]'
            }`}
          >
            スケ調
          </button>

          <button
            onClick={() => setActiveTab('memo')}
            className={`flex-1 px-2 py-2 text-xs font-medium focus:outline-none transition whitespace-nowrap ${
              activeTab === 'memo' 
                ? 'bg-[#1dad95] text-white' 
                : 'bg-[#3b3b3b] text-white hover:bg-[#0f6b5a]'
            }`}
          >
            メモ
          </button>

          <button
            onClick={() => setActiveTab('sheet')}
            className={`flex-1 px-2 py-2 text-xs font-medium focus:outline-none transition whitespace-nowrap ${
              activeTab === 'sheet' 
                ? 'bg-[#1dad95] text-white' 
                : 'bg-[#3b3b3b] text-white hover:bg-[#0f6b5a]'
            }`}
          >
            表計算
          </button>

          <button
            onClick={() => setActiveTab('calc')}
            className={`flex-1 px-2 py-2 text-xs font-medium focus:outline-none transition whitespace-nowrap ${
              activeTab === 'calc' 
                ? 'bg-[#1dad95] text-white' 
                : 'bg-[#3b3b3b] text-white hover:bg-[#0f6b5a]'
            }`}
          >
            関数電卓
          </button>

          <button
            onClick={() => setActiveTab('image-converter')}
            className={`flex-1 px-2 py-2 text-xs font-medium focus:outline-none transition whitespace-nowrap ${
              activeTab === 'image-converter' 
                ? 'bg-[#1dad95] text-white' 
                : 'bg-[#3b3b3b] text-white hover:bg-[#0f6b5a]'
            }`}
          >
            画像変換
          </button>

          <button
            onClick={() => setActiveTab('pdf-compressor')}
            className={`flex-1 px-2 py-2 text-xs font-medium focus:outline-none transition whitespace-nowrap ${
              activeTab === 'pdf-compressor' 
                ? 'bg-[#1dad95] text-white' 
                : 'bg-[#3b3b3b] text-white hover:bg-[#0f6b5a]'
            }`}
          >
            PDF圧縮
          </button>

          <button
            onClick={() => setActiveTab('temp-storage')}
            className={`flex-1 px-2 py-2 text-xs font-medium focus:outline-none transition whitespace-nowrap ${
              activeTab === 'temp-storage' 
                ? 'bg-[#1dad95] text-white' 
                : 'bg-[#3b3b3b] text-white hover:bg-[#0f6b5a]'
            }`}
          >
            一時ファイル
          </button>

          <button
            onClick={() => setActiveTab('file-transfer')}
            className={`flex-1 px-2 py-2 text-xs font-medium focus:outline-none transition whitespace-nowrap ${
              activeTab === 'file-transfer' 
                ? 'bg-[#1dad95] text-white' 
                : 'bg-[#3b3b3b] text-white hover:bg-[#0f6b5a]'
            }`}
          >
            ファイル転送
          </button>

          <button
            onClick={() => setActiveTab('unit-converter')}
            className={`flex-1 px-2 py-2 text-xs font-medium focus:outline-none transition whitespace-nowrap ${
              activeTab === 'unit-converter'
                ? 'bg-[#1dad95] text-white' 
                : 'bg-[#3b3b3b] text-white hover:bg-[#0f6b5a]'
            }`}
          >
            単位変換
          </button>

          <button
            onClick={() => setActiveTab('alarm')}
            className={`flex-1 px-2 py-2 text-xs font-medium focus:outline-none transition whitespace-nowrap ${
              activeTab === 'alarm'
                ? 'bg-[#1dad95] text-white'
                : 'bg-[#3b3b3b] text-white hover:bg-[#0f6b5a]'
            }`}
          >
            アラーム
          </button>
        </div>
        
        {/* アクティブタブの説明文 */}
      </div>

      {/* ツールコンテンツ */}
      <div className={['bookmark', 'map', 'olmt', 'schedule', 'memo', 'sheet', 'calc', 'image-converter', 'pdf-compressor', 'temp-storage', 'file-transfer', 'unit-converter', 'alarm'].includes(activeTab || '') ? '' : 'mt-4'}>
      {activeTab === 'memo' && <MemoTool />}
        {activeTab === 'olmt' && renderOLMT()}
        {activeTab === 'schedule' && <ScheduleTool />}
        {activeTab === 'calc' && renderCalculator()}
        {activeTab === 'sheet' && <Spreadsheet />}
        {activeTab === 'image-converter' && <ImageConverter />}
        {activeTab === 'map' && <MapSection />}
        {activeTab === 'pdf-compressor' && <PDFCompressor />}
        {activeTab === 'temp-storage' && <TempStorage />}
        {activeTab === 'file-transfer' && <FileTransferTool />}
        {activeTab === 'unit-converter' && <UnitConverter />}
        {activeTab === 'alarm' && <AlarmTool />}
        {activeTab === 'bookmark' && <BookmarkTool />}
      {!activeTab && (
          <div className="text-center text-gray-500 py-8">
            ツールを選択してください
        </div>
      )}
      </div>
    </div>
  );
};

export default GeneralTools; 