'use client';

import React, { useState, useEffect } from 'react';
import { FiEdit2, FiPlusCircle } from 'react-icons/fi';
import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/20/solid';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebaseClient';
import { collection, addDoc, doc, updateDoc, onSnapshot, getDocs, query, orderBy, serverTimestamp, writeBatch } from 'firebase/firestore';

interface CalculationHistory {
  id: string;
  expression: string;
  result: string;
  timestamp: Date;
  memo: string;
  isLocked: boolean;
  /** 式から単位が一意に決まったときだけ入る。決まらなければ空。 */
  unit?: string;
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

/**
 * 単位つき計算。
 *
 * 式の中に「3間」「200㎡」のように単位を書けるようにする。数値に直して
 * 評価し、式全体で単位が 1 種類に定まるときだけ結果にその単位を付ける。
 * 2 種類以上混ざったときは何の値か決められないので、単位なしで返す。
 *
 * 長さは mm、面積は ㎡、体積は m³ に寄せる。図面が mm なので mm が基準。
 * 並び順が重要で、長いトークンから先に当てないと `mm` が `m` に食われる。
 */
const UNIT_TOKENS: Array<{ token: string; factor: number; unit: string }> = [
  // 尺貫法（長さ）
  { token: '丈', factor: 3030, unit: 'mm' },
  { token: '間', factor: 1818, unit: 'mm' },
  { token: '尺', factor: 303, unit: 'mm' },
  { token: '寸', factor: 30.3, unit: 'mm' },
  // 尺貫法（面積）
  { token: '坪', factor: 3.30579, unit: '㎡' },
  { token: '畳', factor: 1.6562, unit: '㎡' },
  // メートル法
  { token: '㎥', factor: 1, unit: 'm³' },
  { token: 'm³', factor: 1, unit: 'm³' },
  { token: '㎡', factor: 1, unit: '㎡' },
  { token: 'm2', factor: 1, unit: '㎡' },
  { token: 'mm', factor: 1, unit: 'mm' },
  { token: 'cm', factor: 10, unit: 'mm' },
  { token: 'km', factor: 1000000, unit: 'mm' },
  { token: 'm', factor: 1000, unit: 'mm' },
];

/** 単位トークンを含むか（履歴の表示切替に使う）。 */
const UNIT_PATTERN = new RegExp(
  `(\\d+(?:\\.\\d+)?)(${UNIT_TOKENS.map((u) => u.token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
  'g'
);

/**
 * 単位つきの式を、数値だけの式と結果の単位に分ける。
 * 「半坪」のような言い方も実務では使うので 0.5 に開いてから処理する。
 */
const resolveUnits = (raw: string): { expression: string; unit: string | null } => {
  const expanded = raw.replace(/半(丈|間|尺|寸|坪|畳)/g, '0.5$1');
  const seen = new Set<string>();

  const expression = expanded.replace(UNIT_PATTERN, (_m, num: string, token: string) => {
    const found = UNIT_TOKENS.find((u) => u.token === token);
    if (!found) return _m;
    seen.add(found.unit);
    return `(${num}*${found.factor})`;
  });

  // % は「〜掛け」の意味でしか使わないので、単位には数えない
  const withPercent = expression.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');

  return { expression: withPercent, unit: seen.size === 1 ? [...seen][0] : null };
};

/**
 * 建築でよく置く単位体積重量。令84 の代表値。
 * 積載荷重のように用途で細かく変わるものは、こちらで表を決め打ちせず
 * ユーザーが自分の定数として登録する（下の CUSTOM_CONSTANTS_KEY）。
 */
const BUILTIN_CONSTANTS: Array<{ label: string; value: string; note: string }> = [
  { label: 'コンクリート', value: '23', note: 'kN/m³' },
  { label: '鉄筋コンクリート', value: '24', note: 'kN/m³' },
  { label: '鋼材', value: '77', note: 'kN/m³' },
  { label: '木材', value: '6', note: 'kN/m³' },
  { label: '水', value: '9.8', note: 'kN/m³' },
];

const CUSTOM_CONSTANTS_KEY = 'yy-calculator-constants';

/** PDF は innerHTML で組み立てるので、式やメモの記号をそのまま入れない。 */
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

type CustomConstant = { id: string; label: string; value: string; note: string };

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


const Calculator: React.FC = () => {
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
  // 直前の計算で単位が一意に決まったとき、その単位。決まらなければ null。
  const [resultUnit, setResultUnit] = useState<string | null>(null);
  const [customConstants, setCustomConstants] = useState<CustomConstant[]>([]);
  const [showConstantForm, setShowConstantForm] = useState(false);
  const [newConstant, setNewConstant] = useState({ label: '', value: '', note: '' });
  const [isExporting, setIsExporting] = useState(false);
  
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
          unit: data.unit || '',
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
      // 単位を数値へ開いてから評価する。単位が一意なら結果に付ける。
      const { expression: numeric, unit } = resolveUnits(calculatorExpression);
      const result = safeEvaluate(toEvaluableExpression(numeric));
      const resultString = result.toString();

      setCalculatorDisplay(resultString);
      setAnsValue(resultString);
      setResultUnit(unit);

      // 履歴に追加
      const historyItem: CalculationHistory = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        expression: calculatorExpression,
        result: resultString,
        timestamp: new Date(),
        memo: '',
        isLocked: false,
        unit: unit ?? ''
      };

      if (currentUser) {
        try {
          const colRef = collection(db, 'users', currentUser.uid, 'calculatorHistory')
          const docRef = await addDoc(colRef, {
            expression: historyItem.expression,
            result: historyItem.result,
            unit: historyItem.unit,
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

  // 自分で登録した定数の読み込み。積載荷重など用途で変わる値はここに入る想定。
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_CONSTANTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCustomConstants(parsed);
      }
    } catch {
      /* 読めなくても組込みの定数だけで動く */
    }
  }, []);

  const saveConstants = (next: CustomConstant[]) => {
    setCustomConstants(next);
    try {
      localStorage.setItem(CUSTOM_CONSTANTS_KEY, JSON.stringify(next));
    } catch {
      /* 保存できなくても、このセッション中は使える */
    }
  };

  const addConstant = () => {
    const label = newConstant.label.trim();
    if (!label || !newConstant.value.trim()) return;
    saveConstants([
      ...customConstants,
      { id: `c-${Date.now()}`, label, value: newConstant.value.trim(), note: newConstant.note.trim() },
    ]);
    setNewConstant({ label: '', value: '', note: '' });
    setShowConstantForm(false);
  };

  /**
   * 計算書の書き出し。ロックした履歴とメモがそのまま根拠の一覧になる。
   * 手元の検討を提出物に付けるとき、電卓の画面を撮るしかなかったのを置き換える。
   */
  const exportCalculationSheet = async () => {
    const rows = calculatorHistory.filter((item) => item.isLocked);
    const target = rows.length > 0 ? rows : calculatorHistory;
    if (target.length === 0) {
      alert('書き出す計算がありません。');
      return;
    }

    setIsExporting(true);
    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = (html2pdfModule as any).default || html2pdfModule;

      const container = document.createElement('div');
      container.style.padding = '16mm';
      container.style.fontFamily = "'Noto Sans JP', sans-serif";
      container.style.fontSize = '11px';
      container.style.color = '#111';

      const today = new Date().toLocaleDateString('ja-JP');
      const bodyRows = target
        .map((item, i) => {
          const value = `${formatNumberString(item.result)}${item.unit ? ` ${item.unit}` : ''}`;
          return `<tr>
            <td style="border:1px solid #ccc;padding:5px;text-align:right;width:32px;">${i + 1}</td>
            <td style="border:1px solid #ccc;padding:5px;">${escapeHtml(formatExpressionForDisplay(item.expression))}</td>
            <td style="border:1px solid #ccc;padding:5px;text-align:right;font-weight:bold;white-space:nowrap;">${escapeHtml(value)}</td>
            <td style="border:1px solid #ccc;padding:5px;">${escapeHtml(item.memo || '')}</td>
          </tr>`;
        })
        .join('');

      container.innerHTML = `
        <h1 style="font-size:16px;margin:0 0 4px;">計算書</h1>
        <p style="font-size:10px;color:#666;margin:0 0 12px;">作成日 ${today} ／ yaneyuka 関数電卓</p>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f1f1f1;">
              <th style="border:1px solid #ccc;padding:5px;">No</th>
              <th style="border:1px solid #ccc;padding:5px;text-align:left;">式</th>
              <th style="border:1px solid #ccc;padding:5px;">結果</th>
              <th style="border:1px solid #ccc;padding:5px;text-align:left;">摘要</th>
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      `;

      document.body.appendChild(container);
      await html2pdf()
        .set({
          margin: 0,
          filename: `計算書_${today.replace(/\//g, '')}.pdf`,
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(container)
        .save();
      document.body.removeChild(container);
    } catch (error) {
      console.error('計算書の書き出しに失敗しました', error);
      alert('計算書の書き出しに失敗しました。');
    } finally {
      setIsExporting(false);
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
                    {item.unit && <span className="text-teal-600 font-bold ml-1">{item.unit}</span>}
                  </div>
                </>
              )}
            </div>
          </div>
        )})}
      </div>
    );
  };

  // 物理キーボードからの入力。
  // 以前は GeneralTools 側で activeTab を見て振り分けていたが、
  // このツールが表示されているときだけマウントされるので、ここで持てば条件が要らない。
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 入力フィールドでの入力時は無視
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // 電卓が受け取るキーはブラウザ既定動作（Backspaceで前ページへ戻る等）を止める
      const handledKeys = ['0','1','2','3','4','5','6','7','8','9','.','+','-','*','/','Enter','Backspace','Escape','(',')','^'];
      if (handledKeys.includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case '0': case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8': case '9':
        case '.':
          calculatorInput(e.key);
          break;
        case '+': calculatorInput('+'); break;
        case '-': calculatorInput('-'); break;
        case '*': calculatorInput('×'); break;
        case '/': calculatorInput('÷'); break;
        case 'Enter': calculatorInput('='); break;
        case 'Backspace': calculatorInput('DEL'); break;
        case 'Escape': calculatorInput('AC'); break;
        case '(': calculatorInput('('); break;
        case ')': calculatorInput(')'); break;
        case '^': calculatorInput('x^'); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [calculatorInput]);

  // SHIFT中は逆関数ラベルに差し替える
  const keyLabel = (key: string) => (shiftMode && SHIFT_ALIASES[key] ? SHIFT_ALIASES[key].label : key);

  return (
    <div className="w-full bg-white rounded-b-lg shadow-sm border-b border-gray-100">
      <div className="px-4 py-1.5 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div>
        <h3 className="text-[13px] font-medium">関数電卓</h3>
        <p className="text-[11px] mt-0.5">三角関数・対数・累乗などの関数計算に対応した高機能電卓。計算履歴の保存・管理が可能</p>
        </div>
      </div>
      <div className="p-3">
    <div className="flex gap-4">
      {/* 関数電卓本体 */}
      <div className="w-72 bg-gray-800 rounded-lg shadow-sm self-start border border-gray-700 flex-shrink-0 h-fit">
        <div className="p-2 border-b border-gray-700">
          <h3 className="text-[13px] font-medium text-gray-200">関数電卓</h3>
        </div>
        <div className="p-2 pb-3">
          <div className="space-y-3">
            <div className="bg-gray-900 p-2 rounded h-16 flex flex-col justify-between">
              <input 
                type="text" 
                value={formatExpressionForDisplay(calculatorExpression)}
                className="w-full bg-transparent text-right text-xs text-gray-400 focus:outline-none overflow-hidden" 
                readOnly 
              />
              <div className="flex items-baseline justify-end gap-1.5">
                <input
                  type="text"
                  value={formatExpressionForDisplay(calculatorDisplay)}
                  className="flex-1 bg-transparent text-right text-xl font-mono focus:outline-none text-gray-100 overflow-hidden"
                  readOnly
                />
                {/* 単位が一意に決まった計算だけ、結果の横に出す */}
                {resultUnit && <span className="text-sm text-teal-300 font-bold shrink-0">{resultUnit}</span>}
              </div>
            </div>

            {/* 尺貫法・単位キー。数値のうしろに付けると単位つきの計算になる */}
            <div className="grid grid-cols-8 gap-1">
              {['間', '尺', '寸', '坪', '畳', '㎡', 'm', '%'].map((u) => (
                <button
                  key={u}
                  onClick={() => calculatorInput(u)}
                  className="text-[10px] bg-teal-800 hover:bg-teal-700 text-teal-100 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-1 px-1 text-center rounded"
                >
                  {u}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-5 gap-1">
              {/* Row 1 */}
              <button onClick={() => calculatorInput('SHIFT')} className={`text-[10px] ${shiftMode ? 'bg-blue-600' : 'bg-gray-700'} hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-1.5 px-1 text-center rounded`}>SHIFT</button>
              <button onClick={() => calculatorInput('π')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-1.5 px-1 text-center rounded">π</button>
              <button onClick={() => calculatorInput('x⁻¹')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-1.5 px-1 text-center rounded">x⁻¹</button>
              <button onClick={() => calculatorInput('DEL')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-1.5 px-1 text-center rounded">DEL</button>
              <button onClick={() => calculatorInput('AC')} className="text-[10px] bg-gray-600 hover:bg-gray-500 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-1.5 px-1 text-center rounded">AC</button>

              {/* Row 2 */}
              <button onClick={() => calculatorInput('x²')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-1.5 px-1 text-center rounded">{keyLabel('x²')}</button>
              <button onClick={() => calculatorInput('x^')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-1.5 px-1 text-center rounded">x^</button>
              <button onClick={() => calculatorInput('√')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-1.5 px-1 text-center rounded">{keyLabel('√')}</button>
              <button onClick={() => calculatorInput('log')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-1.5 px-1 text-center rounded">{keyLabel('log')}</button>
              <button onClick={() => calculatorInput('ln')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-1.5 px-1 text-center rounded">{keyLabel('ln')}</button>

              {/* Row 3 */}
              <button onClick={() => calculatorInput('sin')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-1.5 px-1 text-center rounded">{keyLabel('sin')}</button>
              <button onClick={() => calculatorInput('cos')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-1.5 px-1 text-center rounded">{keyLabel('cos')}</button>
              <button onClick={() => calculatorInput('tan')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-1.5 px-1 text-center rounded">{keyLabel('tan')}</button>
              <button onClick={() => calculatorInput('nCr')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-1.5 px-1 text-center rounded">nCr</button>
              <button onClick={() => calculatorInput('EXP')} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm active:shadow-inner active:translate-y-[0.5px] transition-all py-1.5 px-1 text-center rounded">EXP</button>

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
        <div className="p-3 border-b border-gray-100 flex justify-between items-center gap-2">
          <h3 className="text-[13px] font-medium text-gray-800 shrink-0">計算履歴</h3>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowConstantForm((v) => !v)}
              className={`px-2 py-1 text-xs rounded transition-colors border ${
                showConstantForm
                  ? 'bg-teal-50 border-teal-300 text-teal-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-teal-300'
              }`}
            >
              定数
            </button>
            <button
              onClick={exportCalculationSheet}
              disabled={isExporting}
              className="px-2 py-1 text-xs text-white bg-gray-700 hover:bg-gray-800 rounded transition-colors disabled:bg-gray-300"
            >
              {isExporting ? '出力中…' : '計算書PDF'}
            </button>
            <button
              onClick={clearCalculatorHistory}
              className="px-2 py-1 text-xs text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
            >
              ALL CLEAR
            </button>
          </div>
        </div>

        {/* 建築定数。押すと式に値が入る。組込みは単位体積重量の代表値だけ。 */}
        {showConstantForm && (
          <div className="px-3 py-2 border-b border-gray-100 bg-teal-50/40">
            <div className="flex flex-wrap gap-1 mb-2">
              {BUILTIN_CONSTANTS.map((c) => (
                <button
                  key={c.label}
                  onClick={() => calculatorInput(c.value)}
                  title={`${c.value} ${c.note}`}
                  className="text-[10px] px-2 py-1 rounded border bg-white border-teal-200 text-teal-800 hover:border-teal-400 transition-colors"
                >
                  {c.label} <span className="text-teal-500">{c.value}</span>
                </button>
              ))}
              {customConstants.map((c) => (
                <span key={c.id} className="inline-flex items-center rounded border bg-white border-gray-200 overflow-hidden">
                  <button
                    onClick={() => calculatorInput(c.value)}
                    title={`${c.value} ${c.note}`}
                    className="text-[10px] px-2 py-1 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {c.label} <span className="text-gray-400">{c.value}</span>
                  </button>
                  <button
                    onClick={() => saveConstants(customConstants.filter((x) => x.id !== c.id))}
                    className="px-1.5 py-1 text-[10px] text-gray-300 hover:text-red-500 transition-colors"
                    title="削除"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newConstant.label}
                onChange={(e) => setNewConstant({ ...newConstant, label: e.target.value })}
                placeholder="名称（例: 積載荷重 事務室 床）"
                className="flex-1 text-[11px] px-2 py-1 border border-gray-200 rounded bg-white outline-none focus:ring-1 focus:ring-teal-300"
              />
              <input
                type="text"
                value={newConstant.value}
                onChange={(e) => setNewConstant({ ...newConstant, value: e.target.value })}
                placeholder="値"
                className="w-20 text-right text-[11px] px-2 py-1 border border-gray-200 rounded bg-white outline-none focus:ring-1 focus:ring-teal-300"
              />
              <input
                type="text"
                value={newConstant.note}
                onChange={(e) => setNewConstant({ ...newConstant, note: e.target.value })}
                placeholder="単位"
                className="w-20 text-[11px] px-2 py-1 border border-gray-200 rounded bg-white outline-none focus:ring-1 focus:ring-teal-300"
              />
              <button
                onClick={addConstant}
                className="text-[11px] font-bold text-white bg-teal-500 px-2.5 py-1 rounded hover:bg-teal-600 transition-colors"
              >
                追加
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              組込みは単位体積重量（kN/m³）の代表値です。用途で変わる値は自分で登録してください。
            </p>
          </div>
        )}
        <div className="p-3 h-[calc(min(600px,100vh-var(--nav-height)-130px)-80px)] overflow-y-auto">
          {renderCalculatorHistory()}
                  </div>
          </div>
                  </div>
      </div>
    </div>
  );
};

export default Calculator;
