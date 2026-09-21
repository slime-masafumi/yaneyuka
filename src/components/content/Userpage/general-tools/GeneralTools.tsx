'use client';

import React, { useState, useEffect } from 'react';
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
import { FiEdit2, FiPlusCircle } from 'react-icons/fi';
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
import {
  GENERAL_TOOL_MENU,
  consumeGeneralTool,
  onGeneralTool,
  type GeneralToolId,
} from '@/lib/generalToolsMenu';
import { db } from '@/lib/firebaseClient';
import { collection, addDoc, doc, updateDoc, onSnapshot, getDocs, query, orderBy, serverTimestamp, writeBatch } from 'firebase/firestore';

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
  const parts = numericPart.split('.');
  const fractionPart = parts[1];
  let integerPart = parts[0];

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

// --- 関数電卓の数式変換 ---
// 表示用の式（sin( / nCr / π / ^ など）をJavaScriptで評価できる形に直す。
// 置換は「1回のパスでまとめて」行う。個別に .replace を重ねると
// asin( → Math.asin( を作った直後に sin( が再マッチして壊れるため。
const FUNC_MAP: Record<string, string> = {
  asin: 'Math.asin',
  acos: 'Math.acos',
  atan: 'Math.atan',
  sin: 'Math.sin',
  cos: 'Math.cos',
  tan: 'Math.tan',
  log: 'Math.log10',
  ln: 'Math.log',
  sqrt: 'Math.sqrt',
  cbrt: 'Math.cbrt',
  exp: 'Math.exp',
};

// nCr（組合せ）。乗除を交互に行い、途中で桁溢れしないようにする。
const nCr = (n: number, r: number): number => {
  if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) return NaN;
  let result = 1;
  for (let i = 1; i <= r; i++) {
    result = (result * (n - r + i)) / i;
  }
  return Math.round(result);
};

const toEvaluableExpression = (raw: string): string =>
  raw
    // nCr は中置記法なので先に関数呼び出しへ（例: 5nCr2 → nCr(5,2)）
    .replace(/(\d+(?:\.\d+)?)nCr(\d+(?:\.\d+)?)/g, 'nCr($1,$2)')
    .replace(/\b(asin|acos|atan|sin|cos|tan|log|ln|sqrt|cbrt|exp)\(/g, (_m, name: string) => `${FUNC_MAP[name]}(`)
    .replace(/π/g, 'Math.PI')
    .replace(/\^/g, '**')
    // JSは -2**2 を構文エラーにするので、負数の底を括弧でくくる（電卓と同じ (-2)²=4）
    .replace(/(^|[+\-*/(,])(-\d+(?:\.\d+)?)\*\*/g, '$1($2)**');

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


// SHIFT併用時に切り替わるボタン（表示ラベル → 入力トークン）
const SHIFT_ALIASES: Record<string, { label: string; input: string }> = {
  sin: { label: 'sin⁻¹', input: 'asin(' },
  cos: { label: 'cos⁻¹', input: 'acos(' },
  tan: { label: 'tan⁻¹', input: 'atan(' },
  log: { label: '10ˣ', input: '10^(' },
  ln: { label: 'eˣ', input: 'exp(' },
  '√': { label: '∛', input: 'cbrt(' },
  'x²': { label: 'x³', input: '^3' },
};

// タブの並び・ラベル・id は src/lib/generalToolsMenu.ts が唯一の定義。
// 左カラムの Ⅲ が同じ並びを出すので、ここで直書きしない。
type TabType = GeneralToolId;

const GeneralTools: React.FC = () => {
  // ★修正: ルーター関連の処理を削除
  // const searchParams = useSearchParams();
  // const router = useRouter();
  // const pathname = usePathname();
  
  // ★修正: シンプルなState管理に変更（初期値は'memo'）
  // 左カラムの Ⅲ からツールを指定して開かれた場合は、それで初期表示する。
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const requested = consumeGeneralTool();
    return GENERAL_TOOL_MENU.some((t) => t.id === requested?.toolId) ? requested!.toolId : 'memo';
  });

  // すでに開いている状態で左カラムの別ツールが押されたとき用。
  useEffect(() => onGeneralTool(({ toolId }) => {
    if (GENERAL_TOOL_MENU.some((t) => t.id === toolId)) setActiveTab(toolId);
  }), []);

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
      case 'π':
        appendToExpression('π');
        setLastCalculated(false);
        break;
      case 'x⁻¹':
        appendToExpression('^(-1)');
        setLastCalculated(false);
        break;
      case 'nCr':
        appendToExpression('nCr');
        setLastCalculated(false);
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
      // SHIFT併用で逆関数に切り替わるキー群
      case 'x²':
      case '√':
      case 'log':
      case 'ln':
      case 'sin':
      case 'cos':
      case 'tan': {
        const normal: Record<string, string> = {
          'x²': '^2', '√': 'sqrt(', log: 'log(', ln: 'ln(',
          sin: 'sin(', cos: 'cos(', tan: 'tan(',
        };
        appendToExpression(shiftMode ? SHIFT_ALIASES[input].input : normal[input]);
        if (shiftMode) setShiftMode(false); // 実機と同じくSHIFTは1回押すと解除
        setLastCalculated(false);
        break;
      }
      case 'x^':
        appendToExpression('^');
        setLastCalculated(false);
        break;
      case 'EXP':
        // 電卓の EXP は指数入力（×10ˣ）
        appendToExpression('*10^');
        setLastCalculated(false);
        break;
      case '(-)':
        // 符号入力。JS は -5 / 5+-3 をそのまま解釈できる
        appendToExpression('-');
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
    // 許可する文字: 数字, 演算子, 括弧, 小数点, スペース, 既知のMath関数, nCr
    const sanitized = expr.replace(/\s/g, '');
    const withoutKnownTokens = sanitized
      .replace(/Math\.(asin|acos|atan|sin|cos|tan|log10|log|sqrt|cbrt|exp|PI|E)\b/g, '')
      .replace(/nCr/g, '');
    // 未知の識別子が残っていたら評価しない
    if (/[a-zA-Z]/.test(withoutKnownTokens)) {
      throw new Error('Invalid expression');
    }
    // Function constructorで評価（グローバルスコープにアクセスできない）
    const fn = new Function('Math', 'nCr', `"use strict"; return (${expr});`);
    const result = fn(Math, nCr);
    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error('Invalid result');
    }
    return result;
  };

  // 計算結果を履歴に追加する関数を更新
  const calculateResult = async () => {
    try {
      const result = safeEvaluate(toEvaluableExpression(calculatorExpression));
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
    const deletable = calculatorHistory.filter(item => !item.isLocked);
    if (deletable.length === 0) return;
    if (!confirm(`ロックしていない履歴 ${deletable.length} 件を削除します。よろしいですか？`)) return;

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

  // SHIFT中は逆関数ラベルに差し替える
  const keyLabel = (key: string) => (shiftMode && SHIFT_ALIASES[key] ? SHIFT_ALIASES[key].label : key);

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
              <button onClick={() => calculatorInput('π')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">π</button>
              <button onClick={() => calculatorInput('x⁻¹')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">x⁻¹</button>
              <button onClick={() => calculatorInput('DEL')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">DEL</button>
              <button onClick={() => calculatorInput('AC')} className="text-[10px] bg-gray-600 hover:bg-gray-500 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">AC</button>

              {/* Row 2 */}
              <button onClick={() => calculatorInput('x²')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">{keyLabel('x²')}</button>
              <button onClick={() => calculatorInput('x^')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">x^</button>
              <button onClick={() => calculatorInput('√')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">{keyLabel('√')}</button>
              <button onClick={() => calculatorInput('log')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">{keyLabel('log')}</button>
              <button onClick={() => calculatorInput('ln')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">{keyLabel('ln')}</button>

              {/* Row 3 */}
              <button onClick={() => calculatorInput('sin')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">{keyLabel('sin')}</button>
              <button onClick={() => calculatorInput('cos')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">{keyLabel('cos')}</button>
              <button onClick={() => calculatorInput('tan')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-2 px-1 text-center rounded">{keyLabel('tan')}</button>
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

      // 電卓が受け取るキーはブラウザ既定動作（Backspaceで前ページへ戻る等）を止める
      const handledKeys = ['0','1','2','3','4','5','6','7','8','9','.','+','-','*','/','Enter','Backspace','Escape','(',')','^'];
      if (handledKeys.includes(e.key)) {
        e.preventDefault();
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
      {/* lg 以上はタブ行を畳むので、いまどれを開いているかをパンくずで出す。 */}
      <p className="hidden lg:block text-[11px] text-gray-500 mb-3">
        一般ツール ＞ {GENERAL_TOOL_MENU.find((t) => t.id === activeTab)?.label}
      </p>
      <p className="lg:hidden text-[12px] text-gray-600 mb-4">
        メモ、表計算、関数電卓、画像変換・PDF圧縮、単位変換、ファイル転送・一時保存、ブックマーク、地図表示、オンラインミーティングツール、スケジュール調整、タイマー・アラーム・業務記録など、日常業務で頻繁に使用するユーティリティツールをまとめています。用途に応じてタブを切り替え、素早く作業を進めてください。
      </p>
      
      {/* ツール選択タブ
          lg 以上では左カラムの Ⅲ が同じ並びを出すので畳む。
          左カラムは hidden lg:block なので、狭い画面ではここが唯一のナビになる。
          並びとラベルは src/lib/generalToolsMenu.ts が唯一の定義。 */}
      <div className="bg-[#3b3b3b] w-full overflow-x-auto lg:hidden">
        <div className="flex">
          {GENERAL_TOOL_MENU.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTab(tool.id)}
              className={`flex-1 px-2 py-2 text-xs font-medium focus:outline-none transition whitespace-nowrap ${
                activeTab === tool.id
                  ? 'bg-[#1dad95] text-white'
                  : 'bg-[#3b3b3b] text-white hover:bg-[#0f6b5a]'
              }`}
            >
              {tool.label}
            </button>
          ))}
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
