'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebaseClient';
import { collection, doc, deleteDoc, onSnapshot, setDoc, getDoc, getDocs } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { 
  ArrowUturnLeftIcon, 
  ArrowUturnRightIcon, 
  BoldIcon, 
  Bars3BottomLeftIcon, 
  Bars3Icon, 
  Bars3BottomRightIcon,
  CurrencyDollarIcon,
  PlusIcon,
  TrashIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import Cell from './spreadsheet/Cell';
import FormulaBar from './spreadsheet/FormulaBar';
import Grid from './spreadsheet/Grid';
import HistoryManager, { HistorySnapshot } from './spreadsheet/HistoryManager';
import FormulaEngine from './spreadsheet/FormulaEngine';

type CellFormat = { bold?: boolean; align?: 'left' | 'center' | 'right'; type?: 'text' | 'number' | 'percent' | 'currency'; decimals?: number };
type SheetData = { id: string; name: string; rows: number; cols: number; cells: Record<string, string>; formats?: Record<string, CellFormat> };

const Spreadsheet: React.FC = () => {
  const { currentUser, isLoggedIn } = useAuth();
  const [sheet, setSheet] = useState<SheetData>({ id: 'default', name: 'シート1', rows: 20, cols: 10, cells: {}, formats: {} });
  const [sheetList, setSheetList] = useState<{ id: string; name: string }[]>([]);
  const [currentSheetId, setCurrentSheetId] = useState<string>('default');
  const sheetSaveTimer = useRef<number | null>(null);
  const [editingCellKey, setEditingCellKey] = useState<string | null>(null);
  const [activeCellKey, setActiveCellKey] = useState<string | null>(null);
  const [formulaBar, setFormulaBar] = useState<string>('');
  const [colWidths, setColWidths] = useState<number[]>(Array.from({ length: 10 }, () => 96));
  const historyManager = useRef(new HistoryManager());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selStart, setSelStart] = useState<{ r: number; c: number } | null>(null);
  const [selEnd, setSelEnd] = useState<{ r: number; c: number } | null>(null);
  const [isFilling, setIsFilling] = useState(false);
  const [fillOrigin, setFillOrigin] = useState<{ start: { r: number; c: number }; end: { r: number; c: number } } | null>(null);
  const [fillTarget, setFillTarget] = useState<{ start: { r: number; c: number }; end: { r: number; c: number } } | null>(null);
  const [formulaReferenceCells, setFormulaReferenceCells] = useState<Map<string, { r: number; c: number; color: string }>>(new Map()); // 数式編集中に参照しているセル（複数、色付き）
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'row' | 'col' | 'cell'; rowIndex?: number; colIndex?: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const formulaBarInputRef = useRef<HTMLInputElement>(null);
  const didDragRef = useRef<boolean>(false);
  const isMouseDownRef = useRef<boolean>(false); // マウスボタンが押されているかどうか
  const evalCacheRef = useRef<Map<string, number | string>>(new Map());
  const formulaEngine = useRef(new FormulaEngine());

  // 表計算: 参照/数式ユーティリティ
  const toCellKey = (r: number, c: number) => `R${r}C${c}`;
  const rcToAddress = (r: number, c: number) => formulaEngine.current.rcToAddress(r, c);
  const keyToRC = (key: string): { r: number; c: number } | null => {
    const m = key.match(/^R(\d+)C(\d+)$/);
    if (!m) return null;
    return { r: Number(m[1]), c: Number(m[2]) };
  };
  const addressToRC = (addr: string) => formulaEngine.current.addressToRC(addr);
  const getRaw = (r: number, c: number) => sheet.cells[toCellKey(r, c)] || '';

  const evaluateCell = (r: number, c: number, visited: Set<string> = new Set()): number | string => {
    const key = toCellKey(r, c);
    if (evalCacheRef.current.has(key)) return evalCacheRef.current.get(key) as any;
    if (visited.has(key)) return 0; // 循環参照は0扱い
    visited.add(key);
    const raw = getRaw(r, c);
    const result = evaluateRaw(raw, visited);
    evalCacheRef.current.set(key, result);
    return result;
  };

  // 表計算: シート管理（追加/名称変更/削除/エクスポート）
  const createNewSheet = async () => {
    if (!currentUser) return
    const id = `s${Date.now()}`
    const name = `シート${(sheetList.length || 0) + 1}`
    const init: SheetData = { id, name, rows: 20, cols: 10, cells: {}, formats: {} }
    setSheetList(prev => { const next = [{ id, name }, ...prev]; try { localStorage.setItem(`sheets:${currentUser.uid}`, JSON.stringify(next)) } catch {}; return next })
    setCurrentSheetId(id)
    setSheet(init)
    try { await setDoc(doc(db, 'users', currentUser.uid, 'sheets', id), init as any) } catch {}
  }

  const renameCurrentSheet = async () => {
    if (!currentUser) return
    const nextName = prompt('シート名を入力', sheet.name || '')?.trim()
    if (!nextName) return
    setSheet(prev => ({ ...prev, name: nextName }))
    setSheetList(prev => { const next = prev.map(s => s.id === currentSheetId ? { ...s, name: nextName } : s); try { localStorage.setItem(`sheets:${currentUser.uid}`, JSON.stringify(next)) } catch {}; return next })
    try { await setDoc(doc(db, 'users', currentUser.uid, 'sheets', currentSheetId), { name: nextName }, { merge: true }) } catch {}
  }

  const deleteCurrentSheet = async () => {
    if (!currentUser) return
    if (!confirm('このシートを削除します。よろしいですか？')) return
    try { await deleteDoc(doc(db, 'users', currentUser.uid, 'sheets', currentSheetId)) } catch {}
    setSheetList(prev => { const next = prev.filter(s => s.id !== currentSheetId); try { localStorage.setItem(`sheets:${currentUser.uid}`, JSON.stringify(next)) } catch {}; return next })
    const nextId = (sheetList.find(s => s.id !== currentSheetId)?.id) || 'default'
    setCurrentSheetId(nextId)
  }

  const exportExcel = () => {
    const rows: any[][] = []
    for (let r = 0; r < sheet.rows; r++) {
      const row: any[] = []
      for (let c = 0; c < sheet.cols; c++) row.push(sheet.cells[toCellKey(r, c)] || '')
      rows.push(row)
    }
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheet.name || 'Sheet')
    XLSX.writeFile(wb, `${sheet.name || 'sheet'}.xlsx`)
  }

  const parseArgsToValues = (argStr: string, visited: Set<string>): number[] => {
    const args = argStr.split(',')
    const values: number[] = []
    for (const a of args) {
      const t = a.trim()
      if (t.includes(':')) {
        const [start, end] = t.split(':')
        const s = addressToRC(start)
        const e = addressToRC(end)
        if (s && e) {
          const r0 = Math.min(s.row, e.row), r1 = Math.max(s.row, e.row)
          const c0 = Math.min(s.col, e.col), c1 = Math.max(s.col, e.col)
          for (let rr = r0; rr <= r1; rr++) {
            for (let cc = c0; cc <= c1; cc++) {
              const v = Number(evaluateCell(rr, cc, new Set(visited)))
              if (!Number.isNaN(v)) values.push(v)
            }
          }
        }
      } else if (/^[A-Za-z]+\d+$/.test(t)) {
        const rc = addressToRC(t)
        if (rc) {
          const v = Number(evaluateCell(rc.row, rc.col, new Set(visited)))
          if (!Number.isNaN(v)) values.push(v)
        }
      } else {
        const v = Number(t)
        if (!Number.isNaN(v)) values.push(v)
      }
    }
    return values
  }

  const safeEvalArith = (expr: string): number => {
    // 許可: 数字,+-*/(). スペース除去
    const cleaned = expr.replace(/\s+/g, '')
    if (!/^[-+*/().0-9]+$/.test(cleaned)) return NaN
    try {
      // eslint-disable-next-line no-new-func
      return Function(`return (${cleaned})`)()
    } catch { return NaN }
  }

  const evaluateRaw = (raw: string, visited: Set<string>): number | string => {
    const getCellValue = (cell: { row: number; col: number }) => {
      const key = toCellKey(cell.row, cell.col);
      return { value: sheet.cells[key] || '', formula: sheet.cells[key] || '' };
    };
    const evaluateCellFn = (cell: { row: number; col: number }) => {
      return evaluateCell(cell.row, cell.col, visited);
    };
    return formulaEngine.current.evaluateRaw(raw, visited, getCellValue, evaluateCellFn);
  };

  // 表計算: シート一覧 + 選択シート購読
  useEffect(() => {
    if (!currentUser) { setSheet({ id: 'default', name: 'シート1', rows: 20, cols: 10, cells: {}, formats: {} }); setSheetList([]); setCurrentSheetId('default'); return }
    // 一覧を取得
    (async () => {
      try {
        const colRef = collection(db, 'users', currentUser.uid, 'sheets')
        const snaps = await getDocs(colRef)
        const list = snaps.docs.map(d => ({ id: d.id, name: (d.data() as any)?.name || d.id }))
        if (list.length) {
          setSheetList(list)
          try { localStorage.setItem(`sheets:${currentUser.uid}`, JSON.stringify(list)) } catch {}
          if (!list.find(s => s.id === currentSheetId)) setCurrentSheetId(list[0].id)
        } else {
          setSheetList([{ id: 'default', name: 'シート1' }])
          try { localStorage.setItem(`sheets:${currentUser.uid}`, JSON.stringify([{ id: 'default', name: 'シート1' }])) } catch {}
          setCurrentSheetId('default')
        }
      } catch {}
    })()
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) return
    try {
      const cached = localStorage.getItem(`sheet:${currentUser.uid}:${currentSheetId}`)
      if (cached) setSheet(JSON.parse(cached))
    } catch {}
    // 購読
    const ref = doc(db, 'users', currentUser.uid, 'sheets', currentSheetId)
    const unsub = onSnapshot(ref, (snap) => {
      try {
        if (snap.exists()) {
          const data = snap.data() as any
          const next: SheetData = { id: currentSheetId, name: data.name || 'シート1', rows: data.rows || 20, cols: data.cols || 10, cells: data.cells || {}, formats: data.formats || {} }
          setSheet(next)
          try { localStorage.setItem(`sheet:${currentUser.uid}:${currentSheetId}`, JSON.stringify(next)) } catch {}
        }
      } catch {}
    })
    ;(async () => {
      try { const snap = await getDoc(ref); if (!snap.exists()) await setDoc(ref, { name: 'シート1', rows: 20, cols: 10, cells: {}, formats: {} }) } catch {}
    })()
    return () => unsub()
  }, [currentUser, currentSheetId])

  // アクティブセルが変わったら数式バーにそのセルの内容を常に反映
  // ただし、編集中の場合は上書きしない（onChangeで更新した値を保持）
  useEffect(() => {
    // 編集中の場合は、数式バーの値を保持（onChangeで更新した値を保持）
    if (editingCellKey) {
      return;
    }
    
    if (!activeCellKey) { 
      setFormulaBar(''); 
      return;
    }
    
    // 編集中でない場合のみ更新
    // 重要: sheet.cellsの変更は監視しない（onChangeで更新されるため）
    const raw = sheet.cells[activeCellKey] || '';
    setFormulaBar(raw);
  }, [activeCellKey, editingCellKey]) // sheet.cellsは依存配列に含めない
  
  // sheet.cellsの変更を監視しない
  // 理由: onChangeでsheet.cellsを更新すると、このuseEffectが発火してformulaBarを上書きしてしまう
  // activeCellKeyが変わったときのみ、useEffectでformulaBarを更新する（上記のuseEffectで処理）

  const updateCell = (r: number, c: number, value: string) => {
    if (!isLoggedIn) {
      alert('入力するには会員登録（無料）が必要です。');
      return;
    }
    // 履歴に積む（直前状態）
    historyManager.current.add({
      cells: { ...sheet.cells },
      formats: { ...(sheet.formats || {}) },
      colWidths: [...colWidths],
    });
    setSheet(prev => {
      const key = `R${r}C${c}`;
      const next = { ...prev, cells: { ...prev.cells, [key]: value } };
      if (currentUser) { try { localStorage.setItem(`sheet:${currentUser.uid}:${currentSheetId}`, JSON.stringify(next)) } catch {} }
      // debounce save
      if (sheetSaveTimer.current) window.clearTimeout(sheetSaveTimer.current);
      sheetSaveTimer.current = window.setTimeout(async () => {
        if (!currentUser) return;
        try { await setDoc(doc(db, 'users', currentUser.uid, 'sheets', currentSheetId), { name: next.name, rows: next.rows, cols: next.cols, cells: next.cells, formats: next.formats || {} }) } catch {}
      }, 500);
      return next;
    });
  };

  const addRow = () => setSheet(prev => ({ ...prev, rows: prev.rows + 1 }));
  const addCol = () => setSheet(prev => ({ ...prev, cols: prev.cols + 1 }));

  // オートフィル機能
  const handleFillStart = (r: number, c: number) => {
    if (!selStart || !selEnd) return;
    setFillOrigin({ start: selStart, end: selEnd });
    setIsFilling(true);
  };

  const applyFill = (
    origin: { start: { r: number; c: number }; end: { r: number; c: number } },
    target: { start: { r: number; c: number }; end: { r: number; c: number } }
  ) => {
    const originMinR = Math.min(origin.start.r, origin.end.r);
    const originMaxR = Math.max(origin.start.r, origin.end.r);
    const originMinC = Math.min(origin.start.c, origin.end.c);
    const originMaxC = Math.max(origin.start.c, origin.end.c);
    const originRows = originMaxR - originMinR + 1;
    const originCols = originMaxC - originMinC + 1;

    const targetMinR = Math.min(target.start.r, target.end.r);
    const targetMaxR = Math.max(target.start.r, target.end.r);
    const targetMinC = Math.min(target.start.c, target.end.c);
    const targetMaxC = Math.max(target.start.c, target.end.c);

    historyManager.current.add({
      cells: { ...sheet.cells },
      formats: { ...(sheet.formats || {}) },
      colWidths: [...colWidths],
    });

    setSheet(prev => {
      const next = { ...prev, cells: { ...prev.cells } as Record<string, string> };
      
      for (let tr = targetMinR; tr <= targetMaxR; tr++) {
        for (let tc = targetMinC; tc <= targetMaxC; tc++) {
          // 元の範囲内の相対位置を計算
          const relR = (tr - targetMinR) % originRows;
          const relC = (tc - targetMinC) % originCols;
          const sourceR = originMinR + relR;
          const sourceC = originMinC + relC;
          
          const sourceKey = toCellKey(sourceR, sourceC);
          const targetKey = toCellKey(tr, tc);
          const sourceValue = prev.cells[sourceKey] || '';
          
          // 数式の場合は参照を調整
          if (sourceValue.startsWith('=')) {
            const rowOffset = tr - sourceR;
            const colOffset = tc - sourceC;
            const adjustedFormula = formulaEngine.current.adjustFormula(sourceValue, rowOffset, colOffset);
            next.cells[targetKey] = adjustedFormula;
          } else {
            // 通常の値はそのままコピー
            next.cells[targetKey] = sourceValue;
          }
        }
      }
      
      if (currentUser) {
        try {
          localStorage.setItem(`sheet:${currentUser.uid}:${currentSheetId}`, JSON.stringify(next));
        } catch {}
      }
      
      if (sheetSaveTimer.current) window.clearTimeout(sheetSaveTimer.current);
      sheetSaveTimer.current = window.setTimeout(async () => {
        if (!currentUser) return;
        try {
          await setDoc(doc(db, 'users', currentUser.uid, 'sheets', currentSheetId), {
            name: next.name,
            rows: next.rows,
            cols: next.cols,
            cells: next.cells,
            formats: next.formats || {},
          });
        } catch {}
      }, 500);
      
      return next;
    });
  };

  // 書式適用（選択セルのみ）
  const applyFormat = (fmt: Partial<CellFormat>) => {
    if (!activeCellKey) return
    setSheet(prev => {
      const formats = { ...(prev.formats || {}) }
      formats[activeCellKey] = { ...(formats[activeCellKey] || {}), ...fmt }
      const next = { ...prev, formats }
        if (currentUser) { try { localStorage.setItem(`sheet:${currentUser.uid}:${currentSheetId}`, JSON.stringify(next)) } catch {} }
      if (sheetSaveTimer.current) window.clearTimeout(sheetSaveTimer.current)
      sheetSaveTimer.current = window.setTimeout(async () => {
        if (!currentUser) return
          try { await setDoc(doc(db, 'users', currentUser.uid, 'sheets', currentSheetId), { name: next.name, rows: next.rows, cols: next.cols, cells: next.cells, formats: next.formats || {} }) } catch {}
      }, 500)
      return next
    })
  }

  const adjustDecimals = (delta: number) => {
    if (!activeCellKey) return
    const current = sheet.formats?.[activeCellKey]?.decimals || 0
    const nextDecimals = Math.max(0, Math.min(6, current + delta))
    applyFormat({ decimals: nextDecimals })
  }

  const formatCellNumber = (val: number, fmt?: CellFormat): string => {
    if (!isFinite(val)) return String(val)
    const decimals = fmt?.decimals ?? 0
    switch (fmt?.type) {
      case 'percent':
        return `${(val * 100).toFixed(decimals)}%`
      case 'currency':
        return `¥${val.toFixed(decimals)}`
      case 'number':
        return val.toFixed(decimals)
      default:
        return String(val)
    }
  }

  // 数式入力中のクリックの扱いをExcel風に判定
  const decideClickAction = (formula: string): 'append' | 'extend' | 'none' => {
    const t = (formula || '').trim()
    if (!t.startsWith('=')) return 'none'
    if (/[,:\(]$/.test(t)) {
      // 末尾が '(' または ',' のときはアドレスを追加
      if (/\($/.test(t) || /,$/.test(t)) return 'append'
      // 末尾が ':' のときは範囲拡張
      if (/:$/.test(t)) return 'extend'
    }
    return 'none'
  }

  const insertTemplate = (tpl: string) => {
    if (!activeCellKey) return
    const current = sheet.cells[activeCellKey] || ''
    const nextVal = tpl
    setSheet(prev => {
      const next = { ...prev, cells: { ...prev.cells, [activeCellKey]: nextVal } }
      if (currentUser) { try { localStorage.setItem(`sheet:${currentUser.uid}:${currentSheetId}`, JSON.stringify(next)) } catch {} }
      if (sheetSaveTimer.current) window.clearTimeout(sheetSaveTimer.current)
      sheetSaveTimer.current = window.setTimeout(async () => {
        if (!currentUser) return
        try { await setDoc(doc(db, 'users', currentUser.uid, 'sheets', currentSheetId), { name: next.name, rows: next.rows, cols: next.cols, cells: next.cells, formats: next.formats || {} }) } catch {}
      }, 500)
      return next
    })
    const rc = keyToRC(activeCellKey)
    if (rc) {
      const el = document.getElementById(`cell-${rc.r}-${rc.c}`) as HTMLInputElement | null
      if (el) { el.focus(); el.select() }
    }
  }

  // 数式入力中にセル参照を挿入する関数（改善版）
  const insertCellReferenceToFormula = (r: number, c: number, addComma: boolean) => {
    // activeCellKeyがなければ、editingCellKeyまたはactiveCellKeyを使用
    const targetKey = activeCellKey || editingCellKey;
    if (!targetKey) {
      console.warn('insertCellReferenceToFormula: No target cell key');
      return;
    }
    
    // editingCellKeyが設定されていない場合は、activeCellKeyを設定
    if (!editingCellKey && activeCellKey) {
      setEditingCellKey(activeCellKey);
    }
    
    const addr = rcToAddress(r, c);
    const inputEl = formulaBarInputRef.current;
    
    if (!inputEl) {
      // 数式バーが使えない場合はセル内の入力フィールドを使用
      if (targetKey) {
        const rc = keyToRC(targetKey);
        if (rc) {
          const cellEl = document.getElementById(`cell-${rc.r}-${rc.c}`) as HTMLInputElement | null;
          if (cellEl) {
            insertAddressToFormulaOld(r, c, false);
            cellEl.focus();
            const newVal = (sheet.cells[targetKey] || '').trim();
            cellEl.setSelectionRange(newVal.length, newVal.length);
          }
        }
      }
      return;
    }
    
    // 数式バーの現在の値を直接取得（formulaBarステートではなく、入力フィールドの実際の値）
    // フォーカスを確実にする
    inputEl.focus();
    const currentFormula = inputEl.value || formulaBar;
    if (!currentFormula.startsWith('=')) {
      console.log('Not a formula:', currentFormula, 'formulaBar:', formulaBar);
      return;
    }
    
    // 現在のキャレット位置を取得（デフォルトは文字列の末尾）
    const caretStart = inputEl.selectionStart ?? currentFormula.length;
    const caretEnd = inputEl.selectionEnd ?? caretStart;
    
    console.log('Inserting reference:', addr, 'into formula:', currentFormula, 'at position:', caretStart);
    
    let newText = currentFormula;
    
    // キャレット位置の前の文字列を取得
    const textBeforeCaret = currentFormula.substring(0, caretStart);
    const lastChar = textBeforeCaret.slice(-1);
    
    if (addComma) {
      // Ctrlキーが押されている場合：カンマを追加して参照を追加
      // 前の文字が '=', '(', ',' でない場合、かつ前の文字が存在する場合
      const needsComma = textBeforeCaret.length > 0 && 
                         lastChar !== '=' && 
                         lastChar !== '(' && 
                         lastChar !== ',' &&
                         lastChar !== ':';
      
      if (needsComma) {
        // カンマを挿入してから参照を挿入
        newText = currentFormula.substring(0, caretStart) + ',' + addr + currentFormula.substring(caretEnd);
      } else {
        // カンマ不要の場合は直接参照を挿入
        newText = currentFormula.substring(0, caretStart) + addr + currentFormula.substring(caretEnd);
      }
    } else {
      // Ctrlキーが押されていない場合：前のセル参照を新しい参照に置き換える
      // セル参照のパターンを検出（例：A1, B2, AA10など）
      const cellRefPattern = /([A-Z]+)(\d+)$/;
      const match = textBeforeCaret.match(cellRefPattern);
      
      if (match) {
        // 前のセル参照が見つかった場合、それを新しい参照に置き換え
        const refStart = caretStart - match[0].length;
        newText = currentFormula.substring(0, refStart) + addr + currentFormula.substring(caretEnd);
      } else {
        // セル参照が見つからない場合は、キャレット位置に直接挿入
        newText = currentFormula.substring(0, caretStart) + addr + currentFormula.substring(caretEnd);
      }
    }
    
    // 数式バーとセルの値を更新
    setFormulaBar(newText);
    
    // 参照セル位置を即座に更新（onChangeを待たない）
    if (newText.trim().startsWith('=')) {
      const cellRefPattern = /([A-Z]+)(\d+)(?![A-Z0-9])/g;
      const matches: string[] = [];
      let match: RegExpMatchArray | null;
      // 正規表現をリセットして再実行
      cellRefPattern.lastIndex = 0;
      while ((match = cellRefPattern.exec(newText)) !== null) {
        matches.push(match[0]);
      }
      
      const colorPalette = [
        '#3b82f6', '#ef4444', '#8b5cf6', '#10b981', '#1e40af',
        '#f97316', '#06b6d4', '#ec4899', '#059669', '#dc2626',
        '#7c3aed', '#34d399',
      ];
      
      const newRefCells = new Map<string, { r: number; c: number; color: string }>();
      matches.forEach((cellAddr, index) => {
        const rc = addressToRC(cellAddr);
        if (rc) {
          const color = colorPalette[index % colorPalette.length];
          const key = `${rc.row}-${rc.col}`;
          newRefCells.set(key, { r: rc.row, c: rc.col, color });
          console.log('[insertCellReferenceToFormula] Setting formulaReferenceCell:', cellAddr, '->', key, rc);
        } else {
          console.warn('[insertCellReferenceToFormula] Failed to parse cell address:', cellAddr);
        }
      });
      console.log('[insertCellReferenceToFormula] formulaReferenceCells updated:', Array.from(newRefCells.entries()), 'formula:', newText, 'matches:', matches);
      setFormulaReferenceCells(newRefCells);
    } else {
      setFormulaReferenceCells(new Map());
    }
    
    // セルの値を更新（setFormulaBarだけではonChangeが発火しないため）
    if (targetKey) {
      setSheet(prev => {
        const next = { ...prev, cells: { ...prev.cells, [targetKey]: newText } };
        if (currentUser) { 
          try { 
            localStorage.setItem(`sheet:${currentUser.uid}:${currentSheetId}`, JSON.stringify(next)) 
          } catch {} 
        }
        return next;
      });
    }
    
    // 挿入後に入力フィールドへフォーカスを戻し、キャレット位置を挿入した参照の直後に復元
    setTimeout(() => {
      inputEl.focus();
      let caretPosAfterInsert: number;
      if (addComma && newText.includes(',')) {
        // カンマが追加された場合
        const commaIndex = newText.indexOf(',', caretStart);
        if (commaIndex >= 0) {
          caretPosAfterInsert = commaIndex + 1 + addr.length;
        } else {
          caretPosAfterInsert = caretStart + 1 + addr.length;
        }
      } else if (!addComma) {
        // 前の参照を置き換えた場合、新しい参照の後ろにキャレットを配置
        const cellRefPattern = /([A-Z]+)(\d+)$/;
        const match = currentFormula.substring(0, caretStart).match(cellRefPattern);
        if (match) {
          const refStart = caretStart - match[0].length;
          caretPosAfterInsert = refStart + addr.length;
        } else {
          caretPosAfterInsert = caretStart + addr.length;
        }
      } else {
        caretPosAfterInsert = caretStart + addr.length;
      }
      inputEl.setSelectionRange(caretPosAfterInsert, caretPosAfterInsert);
    }, 0);
  }

  // 旧バージョン（セル内編集用）
  const insertAddressToFormulaOld = (r: number, c: number, extend: boolean) => {
    if (!activeCellKey) return
    if (editingCellKey !== activeCellKey) return
    const raw = sheet.cells[activeCellKey] || ''
    if (!raw.startsWith('=')) return
    const addr = rcToAddress(r, c)
    // 末尾の連続した閉じ括弧を退避
    const closersMatch = raw.match(/\)+$/)
    const closers = closersMatch ? closersMatch[0] : ''
    let body = closers ? raw.slice(0, -closers.length) : raw
    // 直前が '(' か ',' ならアドレスを追加、 ':' なら範囲拡張
    if (extend || /:$/.test(body)) {
      if (!/:$/.test(body)) body += ':'
      body += addr
    } else {
      if (!/[,(]$/.test(body)) body += ','
      body += addr
    }
    const nextVal = body + closers
    setSheet(prev => {
      const next = { ...prev, cells: { ...prev.cells, [activeCellKey]: nextVal } }
      if (currentUser) { try { localStorage.setItem(`sheet:${currentUser.uid}:${currentSheetId}`, JSON.stringify(next)) } catch {} }
      return next
    })
    const rc = keyToRC(activeCellKey)
    if (rc) {
      const el = document.getElementById(`cell-${rc.r}-${rc.c}`) as HTMLInputElement | null
      if (el) { el.focus(); el.setSelectionRange(nextVal.length, nextVal.length) }
    }
  }

  const rows = Array.from({ length: sheet.rows }, (_, i) => i)
  const cols = Array.from({ length: sheet.cols }, (_, i) => i)
  // 列幅初期化
  if (colWidths.length < sheet.cols) setColWidths(w => w.concat(Array.from({ length: sheet.cols - w.length }, () => 96)))
  // よく使う関数テンプレ（右エリア）
  const commonFuncs = [
    { name: 'SUM', tpl: '=SUM(A1:A10)', hint: '合計' },
    { name: 'AVERAGE', tpl: '=AVERAGE(A1:A10)', hint: '平均' },
    { name: 'MIN', tpl: '=MIN(A1:A10)', hint: '最小' },
    { name: 'MAX', tpl: '=MAX(A1:A10)', hint: '最大' },
    { name: 'COUNT', tpl: '=COUNT(A1:A10)', hint: '数える' },
    { name: 'IF', tpl: '=IF(A1>10,1,0)', hint: '条件' },
    { name: 'ROUND', tpl: '=ROUND(A1,2)', hint: '四捨五入' },
    { name: 'TODAY', tpl: '=TODAY()', hint: '本日' },
    { name: 'NOW', tpl: '=NOW()', hint: '日時' },
  ] as const

  // マウスアップ時の処理（オートフィル確定）
  const handleMouseUp = () => {
    isMouseDownRef.current = false; // マウスボタンが離された
    if (isFilling && fillOrigin && fillTarget) {
      applyFill(fillOrigin, fillTarget);
      setIsFilling(false);
      setFillOrigin(null);
      setFillTarget(null);
    }
    setIsSelecting(false);
  };

  // グローバルなマウスアップイベント
  useEffect(() => {
    const handleGlobalMouseUp = () => handleMouseUp();
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isFilling, fillOrigin, fillTarget]);

  // グローバルなキーダウンイベントは削除（グリッドのonKeyDownで処理するため）

  // Undo/Redoハンドラー
  const handleUndo = () => {
    const snap = historyManager.current.undo();
    if (snap) {
      setSheet(prev => ({ ...prev, cells: snap.cells, formats: snap.formats || {} }));
      setColWidths(snap.colWidths || []);
    }
  };

  const handleRedo = () => {
    const snap = historyManager.current.redo();
    if (snap) {
      setSheet(prev => ({ ...prev, cells: snap.cells, formats: snap.formats || {} }));
      setColWidths(snap.colWidths || []);
    }
  };

  // Ctrl+Sで保存、Ctrl+Z/YでUndo/Redo（Excelライクなショートカット）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 入力フィールドにフォーカスがある場合は無視（数式バーやセル編集中）
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Undo/Redoは入力フィールドでも有効にする
        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'y')) {
          e.preventDefault();
          if (e.shiftKey && e.key === 'z') {
            // Ctrl+Shift+Z (Mac用のRedo)
            handleRedo();
          } else if (e.key === 'z') {
            handleUndo();
          } else if (e.key === 'y') {
            handleRedo();
          }
          return;
        }
        // その他のショートカットは入力フィールドでは無視
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
          e.preventDefault();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        // 現在のシートを保存（既に自動保存されているが、明示的な保存処理を実行）
        if (currentUser && currentSheetId) {
          const currentSheet = sheet;
          try {
            setDoc(doc(db, 'users', currentUser.uid, 'sheets', currentSheetId), {
              name: currentSheet.name,
              rows: currentSheet.rows,
              cols: currentSheet.cols,
              cells: currentSheet.cells,
              formats: currentSheet.formats || {},
            });
            // 保存成功のフィードバック（オプション）
            // toast.success('保存しました');
          } catch (err) {
            console.error('保存エラー:', err);
          }
        }
      }
      
      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      
      // Redo: Ctrl+Y または Ctrl+Shift+Z (Mac用)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser, currentSheetId, sheet]);

  // 右クリックメニューのハンドラー
  const handleContextMenu = (e: React.MouseEvent, type: 'row' | 'col' | 'cell', rowIndex?: number, colIndex?: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type, rowIndex, colIndex });
  };

  const executeContextAction = (action: 'insert' | 'delete') => {
    if (!contextMenu) return;
    
    historyManager.current.add({
      cells: { ...sheet.cells },
      formats: { ...(sheet.formats || {}) },
      colWidths: [...colWidths],
    });

    if (contextMenu.type === 'row' && contextMenu.rowIndex !== undefined) {
      if (action === 'insert') {
        // 行の挿入（簡易版：行数を増やす）
        setSheet(prev => ({ ...prev, rows: prev.rows + 1 }));
      } else if (action === 'delete') {
        // 行の削除
        const target = contextMenu.rowIndex;
        if (sheet.rows <= 1) return;
        const hasData = Object.keys(sheet.cells).some(k => {
          const m = k.match(/^R(\d+)C(\d+)$/);
          return m && Number(m[1]) === target;
        });
        if (hasData && !window.confirm('この行にデータがあります。削除しますか？')) {
          setContextMenu(null);
          return;
        }
        setSheet(prev => {
          const cells = { ...prev.cells };
          const formats = { ...(prev.formats || {}) };
          Object.keys(cells).forEach(k => {
            const m = k.match(/^R(\d+)C(\d+)$/);
            if (m && Number(m[1]) === target) delete cells[k];
          });
          Object.keys(formats).forEach(k => {
            const m = k.match(/^R(\d+)C(\d+)$/);
            if (m && Number(m[1]) === target) delete formats[k];
          });
          const next = { ...prev, rows: prev.rows - 1, cells, formats };
          if (currentUser) {
            try {
              localStorage.setItem(`sheet:${currentUser.uid}:${currentSheetId}`, JSON.stringify(next));
            } catch {}
          }
          return next;
        });
      }
    } else if (contextMenu.type === 'col' && contextMenu.colIndex !== undefined) {
      if (action === 'insert') {
        // 列の挿入（簡易版：列数を増やす）
        setSheet(prev => ({ ...prev, cols: prev.cols + 1 }));
        setColWidths(prev => [...prev, 96]);
      } else if (action === 'delete') {
        // 列の削除
        const target = contextMenu.colIndex;
        if (sheet.cols <= 1) return;
        const hasData = Object.keys(sheet.cells).some(k => {
          const m = k.match(/^R(\d+)C(\d+)$/);
          return m && Number(m[2]) === target;
        });
        if (hasData && !window.confirm('この列にデータがあります。削除しますか？')) {
          setContextMenu(null);
          return;
        }
        setSheet(prev => {
          const cells = { ...prev.cells };
          const formats = { ...(prev.formats || {}) };
          Object.keys(cells).forEach(k => {
            const m = k.match(/^R(\d+)C(\d+)$/);
            if (m && Number(m[2]) === target) delete cells[k];
          });
          Object.keys(formats).forEach(k => {
            const m = k.match(/^R(\d+)C(\d+)$/);
            if (m && Number(m[2]) === target) delete formats[k];
          });
          const next = { ...prev, cols: prev.cols - 1, cells, formats };
          if (currentUser) {
            try {
              localStorage.setItem(`sheet:${currentUser.uid}:${currentSheetId}`, JSON.stringify(next));
            } catch {}
          }
          return next;
        });
        setColWidths(prev => prev.filter((_, i) => i !== target));
      }
    }
    
    setContextMenu(null);
  };

  return (
    <div className="bg-white rounded-b-lg shadow-sm border-b border-gray-100 flex flex-col h-full">
      {/* ヘッダーエリア */}
      <div className="p-4 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div>
          <h3 className="text-[13px] font-medium">表計算</h3>
          <p className="text-[11px] mt-0.5">Excelライクな表計算ツール。数式・関数計算、セル書式設定、Excel形式でのエクスポートに対応</p>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden" onMouseUp={handleMouseUp} onClick={() => setContextMenu(null)}>
      {/* フォーミュラバー */}
      <FormulaBar
        cellAddress={activeCellKey ? (() => {
          const rc = keyToRC(activeCellKey);
          return rc ? rcToAddress(rc.r, rc.c) : '';
        })() : ''}
        value={formulaBar}
        onChange={(value) => {
          // まず、編集中のセルを確実に設定（これが最優先）
          const targetKey = editingCellKey || activeCellKey;
          if (!editingCellKey && activeCellKey) {
            setEditingCellKey(activeCellKey);
          }
          
          // 数式バーの値を更新
          setFormulaBar(value);
          
          // 数式が入力されている場合、数式内のすべてのセル参照を解析してハイライト（確定前でも表示）
          if (value.trim().startsWith('=')) {
            // 数式内のすべてのセル参照を検出（例：A1, B2, E17など）
            // セル参照のパターン: 1つ以上の大文字の後に1つ以上の数字
            const cellRefPattern = /([A-Z]+)(\d+)(?![A-Z0-9])/g;
            const matches: string[] = [];
            let match: RegExpMatchArray | null;
            
            // 数式全体からすべてのセル参照を検出
            cellRefPattern.lastIndex = 0; // 正規表現をリセット
            while ((match = cellRefPattern.exec(value)) !== null) {
              matches.push(match[0]);
            }
            
            // 各セル参照に異なる色を割り当て
            const colorPalette = [
              '#3b82f6', '#ef4444', '#8b5cf6', '#10b981', '#1e40af',
              '#f97316', '#06b6d4', '#ec4899', '#059669', '#dc2626',
              '#7c3aed', '#34d399',
            ];
            
            const newRefCells = new Map<string, { r: number; c: number; color: string }>();
            matches.forEach((cellAddr, index) => {
              const rc = addressToRC(cellAddr);
              if (rc) {
                const color = colorPalette[index % colorPalette.length];
                const key = `${rc.row}-${rc.col}`;
                newRefCells.set(key, { r: rc.row, c: rc.col, color });
              }
            });
            setFormulaReferenceCells(newRefCells);
          } else {
            // 数式でない場合は参照セルをクリア
            setFormulaReferenceCells(new Map());
          }
          
          // 数式バーの値が変更されたら、編集中のセルの値も即座に更新
          // 重要: editingCellKeyまたはactiveCellKeyが設定されている場合のみ更新
          if (targetKey) {
            // 現在のsheet.cellsの値と異なる場合のみ更新（無限ループを防ぐ）
            const currentCellValue = sheet.cells[targetKey] || '';
            if (currentCellValue !== value) {
              // 同期的にsheet.cellsを更新
              setSheet(prev => {
                const next = { ...prev, cells: { ...prev.cells, [targetKey]: value } };
                if (currentUser) { 
                  try { 
                    localStorage.setItem(`sheet:${currentUser.uid}:${currentSheetId}`, JSON.stringify(next)) 
                  } catch {} 
                }
                return next;
              });
            }
          }
        }}
        inputRef={formulaBarInputRef}
        onFormulaBarFocus={() => {
          // 数式バーにフォーカスが当たったら、編集中のセルを設定
          if (activeCellKey && !editingCellKey) {
            setEditingCellKey(activeCellKey);
          }
        }}
        onKeyDown={(e) => {
          if (!activeCellKey) return;
          // 数式バーで入力している場合は、編集中のセルを設定
          if (!editingCellKey && activeCellKey) {
            setEditingCellKey(activeCellKey);
          }
          
          // 編集モード時の矢印キー処理
          if (editingCellKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
            const rc = keyToRC(activeCellKey);
            if (!rc) return;
            
            const currentValue = formulaBar.trim();
            
            // セルが空の場合は何もしない
            if (currentValue === '') {
              e.preventDefault();
              return;
            }
            
            // 数式が入力されている場合（=で始まる）：セル参照を挿入/変更
            if (currentValue.startsWith('=')) {
              e.preventDefault();
              
              const inputEl = formulaBarInputRef.current;
              if (!inputEl) return;
              
              const caretStart = inputEl.selectionStart ?? currentValue.length;
              const caretEnd = inputEl.selectionEnd ?? caretStart;
              
              // キャレット位置の前の文字列を取得
              const textBeforeCaret = currentValue.substring(0, caretStart);
              
              // セル参照のパターンを検出（例：A1, B2, AA10など）
              const cellRefPattern = /([A-Z]+)(\d+)$/;
              const match = textBeforeCaret.match(cellRefPattern);
              
              // 現在の参照セル位置を取得（既存の参照がある場合はその位置、ない場合は編集中のセル位置）
              let currentRefR = rc.r;
              let currentRefC = rc.c;
              
              if (match) {
                // 既存のセル参照がある場合、その位置を取得
                const existingAddr = match[0];
                const existingRC = addressToRC(existingAddr);
                if (existingRC) {
                  currentRefR = existingRC.row;
                  currentRefC = existingRC.col;
                }
              } else {
                // 既存の参照セルから位置を取得（最後の参照セルを使用）
                const refCellsArray = Array.from(formulaReferenceCells.values());
                if (refCellsArray.length > 0) {
                  const lastRef = refCellsArray[refCellsArray.length - 1];
                  currentRefR = lastRef.r;
                  currentRefC = lastRef.c;
                }
              }
              
              // 矢印キーの方向に応じてセル参照を計算（現在の参照位置から移動）
              let targetR = currentRefR;
              let targetC = currentRefC;
              if (e.key === 'ArrowDown') targetR = Math.min(sheet.rows - 1, currentRefR + 1);
              if (e.key === 'ArrowUp') targetR = Math.max(0, currentRefR - 1);
              if (e.key === 'ArrowRight') targetC = Math.min(sheet.cols - 1, currentRefC + 1);
              if (e.key === 'ArrowLeft') targetC = Math.max(0, currentRefC - 1);
              
              const targetAddr = rcToAddress(targetR, targetC);
              
              let newText: string;
              if (match) {
                // 前のセル参照が見つかった場合、それを新しい参照に置き換え
                const refStart = caretStart - match[0].length;
                newText = currentValue.substring(0, refStart) + targetAddr + currentValue.substring(caretEnd);
              } else {
                // セル参照が見つからない場合は、キャレット位置に直接挿入
                newText = currentValue.substring(0, caretStart) + targetAddr + currentValue.substring(caretEnd);
              }
              
              setFormulaBar(newText);
              setSheet(prev => {
                const next = { ...prev, cells: { ...prev.cells, [activeCellKey]: newText } };
                if (currentUser) { 
                  try { 
                    localStorage.setItem(`sheet:${currentUser.uid}:${currentSheetId}`, JSON.stringify(next)) 
                  } catch {} 
                }
                return next;
              });
              
              // 参照セルを即座に更新（onChangeが呼ばれる前に更新）
              if (newText.trim().startsWith('=')) {
                const cellRefPattern = /([A-Z]+)(\d+)(?![A-Z0-9])/g;
                const matches: string[] = [];
                let match: RegExpMatchArray | null;
                while ((match = cellRefPattern.exec(newText)) !== null) {
                  matches.push(match[0]);
                }
                
                const colorPalette = [
                  '#3b82f6', '#ef4444', '#8b5cf6', '#10b981', '#1e40af',
                  '#f97316', '#06b6d4', '#ec4899', '#059669', '#dc2626',
                  '#7c3aed', '#34d399',
                ];
                
                const newRefCells = new Map<string, { r: number; c: number; color: string }>();
                matches.forEach((cellAddr, index) => {
                  const rc = addressToRC(cellAddr);
                  if (rc) {
                    const color = colorPalette[index % colorPalette.length];
                    const key = `${rc.row}-${rc.col}`;
                    newRefCells.set(key, { r: rc.row, c: rc.col, color });
                  }
                });
                setFormulaReferenceCells(newRefCells);
              } else {
                setFormulaReferenceCells(new Map());
              }
              
              // 挿入後に入力フィールドへフォーカスを戻し、キャレット位置を調整
              setTimeout(() => {
                inputEl.focus();
                let caretPosAfterInsert: number;
                if (match) {
                  const refStart = caretStart - match[0].length;
                  caretPosAfterInsert = refStart + targetAddr.length;
                } else {
                  caretPosAfterInsert = caretStart + targetAddr.length;
                }
                inputEl.setSelectionRange(caretPosAfterInsert, caretPosAfterInsert);
              }, 0);
              return;
            }
            
            // 数字や文字が入力されている場合：セル移動（編集を確定してから移動）
            e.preventDefault();
            const rc_current = keyToRC(activeCellKey);
            if (!rc_current) return;
            
            // 現在の値を確定
            updateCell(rc_current.r, rc_current.c, currentValue);
            setEditingCellKey(null);
            
            // 矢印キーの方向に応じてセル移動
            let nr = rc_current.r;
            let nc = rc_current.c;
            if (e.key === 'ArrowDown') nr = Math.min(sheet.rows - 1, rc_current.r + 1);
            if (e.key === 'ArrowUp') nr = Math.max(0, rc_current.r - 1);
            if (e.key === 'ArrowRight') nc = Math.min(sheet.cols - 1, rc_current.c + 1);
            if (e.key === 'ArrowLeft') nc = Math.max(0, rc_current.c - 1);
            
            const nk = toCellKey(nr, nc);
            setActiveCellKey(nk);
            setSelStart({ r: nr, c: nc });
            setSelEnd({ r: nr, c: nc });
            
            // 移動先のセルの値を数式バーに設定
            const nextRaw = sheet.cells[nk] || '';
            setFormulaBar(nextRaw);
            
            // グリッドにフォーカスを維持
            if (gridRef.current) {
              gridRef.current.focus();
            }
            return;
          }
          
          if (e.key === 'Enter') {
            e.preventDefault();
            const rc = keyToRC(activeCellKey);
            if (!rc) return;
            
            // 開き括弧があれば閉じ括弧を自動補完
            let finalValue = formulaBar;
            if (finalValue.startsWith('=')) {
              const opens = (finalValue.match(/\(/g) || []).length;
              const closes = (finalValue.match(/\)/g) || []).length;
              if (closes < opens) {
                finalValue = finalValue + ')'.repeat(opens - closes);
              }
            }
            
            updateCell(rc.r, rc.c, finalValue);
            setEditingCellKey(null);
            setFormulaReferenceCells(new Map()); // 編集終了時に参照セルをクリア
            // Enter押下後は下のセルに移動
            const nextRow = Math.min(sheet.rows - 1, rc.r + 1);
            const nextKey = toCellKey(nextRow, rc.c);
            setActiveCellKey(nextKey);
            setSelStart({ r: nextRow, c: rc.c });
            setSelEnd({ r: nextRow, c: rc.c });
          }
          if (e.key === 'Escape') {
            const raw = sheet.cells[activeCellKey] || '';
            setFormulaBar(raw);
            setEditingCellKey(null);
            setFormulaReferenceCells(new Map()); // 編集キャンセル時に参照セルをクリア
          }
        }}
      />

      <div className="mb-2 flex items-center gap-2 flex-wrap">
        {/* シートタブUI */}
        <div className="flex items-center gap-1 border-b border-gray-300">
          {sheetList.map(s => (
            <button
              key={s.id}
              type="button"
              className={`px-4 py-1.5 text-xs rounded-t border-t border-l border-r transition-colors ${
                currentSheetId === s.id
                  ? 'bg-white border-gray-300 font-semibold text-green-700 relative -bottom-px pb-2'
                  : 'bg-gray-100 border-transparent text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setCurrentSheetId(s.id)}
            >
              {s.name}
            </button>
          ))}
          <button 
            type="button" 
            className="px-2 py-1.5 text-xs rounded-t border-t border-l border-r border-transparent bg-gray-100 hover:bg-gray-200 text-gray-600" 
            onClick={createNewSheet}
            title="新しいシートを追加"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
        <button type="button" className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-700 hover:text-white" onClick={renameCurrentSheet}>名称変更</button>
        <button type="button" className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-red-600 hover:text-white" onClick={deleteCurrentSheet}>削除</button>
        <button type="button" className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-700 hover:text-white" onClick={addRow}>行を追加</button>
        <button type="button" className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-700 hover:text-white" onClick={addCol}>列を追加</button>
        <button
          type="button"
          className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-red-600 hover:text-white"
          onClick={() => {
            if (sheet.rows <= 1) return
            const target = sheet.rows - 1
            // データ有無チェック
            const hasData = Object.keys(sheet.cells).some(k => /^R\d+C\d+$/.test(k) && Number(k.match(/^R(\d+)C/)! [1]) === target)
            if (hasData && !window.confirm('最下行にデータがあります。削除しますか？')) return
            historyManager.current.add({ cells: { ...sheet.cells }, formats: { ...(sheet.formats || {}) }, colWidths: [...colWidths] });
            setSheet(prev => {
              const cells = { ...prev.cells }; const formats = { ...(prev.formats || {}) }
              Object.keys(cells).forEach(k => { const m = k.match(/^R(\d+)C(\d+)$/)!; if (Number(m[1]) === target) delete cells[k] })
              Object.keys(formats).forEach(k => { const m = k.match(/^R(\d+)C(\d+)$/)!; if (Number(m[1]) === target) delete formats[k] })
              const next = { ...prev, rows: prev.rows - 1, cells, formats }
              try { if (currentUser) localStorage.setItem(`sheet:${currentUser.uid}:${currentSheetId}`, JSON.stringify(next)) } catch {}
              return next
            })
          }}
        >行を削除</button>
        <button
          type="button"
          className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-red-600 hover:text-white"
          onClick={() => {
            if (sheet.cols <= 1) return
            const target = sheet.cols - 1
            const hasData = Object.keys(sheet.cells).some(k => /^R\d+C\d+$/.test(k) && Number(k.match(/C(\d+)$/)! [1]) === target)
            if (hasData && !window.confirm('最右列にデータがあります。削除しますか？')) return
            historyManager.current.add({ cells: { ...sheet.cells }, formats: { ...(sheet.formats || {}) }, colWidths: [...colWidths] });
            setSheet(prev => {
              const cells = { ...prev.cells }; const formats = { ...(prev.formats || {}) }
              Object.keys(cells).forEach(k => { const m = k.match(/^R(\d+)C(\d+)$/)!; if (Number(m[2]) === target) delete cells[k] })
              Object.keys(formats).forEach(k => { const m = k.match(/^R(\d+)C(\d+)$/)!; if (Number(m[2]) === target) delete formats[k] })
              const next = { ...prev, cols: prev.cols - 1, cells, formats }
              try { if (currentUser) localStorage.setItem(`sheet:${currentUser.uid}:${currentSheetId}`, JSON.stringify(next)) } catch {}
              return next
            })
            setColWidths(w => w.slice(0, -1))
          }}
        >列を削除</button>

        {/* 書式ツールバー */}
        <div className="ml-4 flex items-center gap-2">
          <button 
            type="button" 
            className={`px-2 py-1 text-xs rounded border flex items-center gap-1 ${
              sheet.formats?.[activeCellKey || '']?.bold 
                ? 'bg-green-100 text-green-700 border-green-300' 
                : 'bg-white hover:bg-gray-50'
            }`}
            onClick={() => applyFormat({ bold: !(sheet.formats?.[activeCellKey || '']?.bold) })}
            title="太字"
          >
            <BoldIcon className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-gray-300"></div>
          <button 
            type="button" 
            className={`px-2 py-1 text-xs rounded border flex items-center ${
              sheet.formats?.[activeCellKey || '']?.align === 'left' 
                ? 'bg-green-100 text-green-700 border-green-300' 
                : 'bg-white hover:bg-gray-50'
            }`}
            onClick={() => applyFormat({ align: 'left' })}
            title="左揃え"
          >
            <Bars3BottomLeftIcon className="w-4 h-4" />
          </button>
          <button 
            type="button" 
            className={`px-2 py-1 text-xs rounded border flex items-center ${
              sheet.formats?.[activeCellKey || '']?.align === 'center' 
                ? 'bg-green-100 text-green-700 border-green-300' 
                : 'bg-white hover:bg-gray-50'
            }`}
            onClick={() => applyFormat({ align: 'center' })}
            title="中央揃え"
          >
            <Bars3Icon className="w-4 h-4" />
          </button>
          <button 
            type="button" 
            className={`px-2 py-1 text-xs rounded border flex items-center ${
              sheet.formats?.[activeCellKey || '']?.align === 'right' 
                ? 'bg-green-100 text-green-700 border-green-300' 
                : 'bg-white hover:bg-gray-50'
            }`}
            onClick={() => applyFormat({ align: 'right' })}
            title="右揃え"
          >
            <Bars3BottomRightIcon className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-gray-300"></div>
          <button 
            type="button" 
            className={`px-2 py-1 text-xs rounded border flex items-center ${
              sheet.formats?.[activeCellKey || '']?.type === 'currency' 
                ? 'bg-green-100 text-green-700 border-green-300' 
                : 'bg-white hover:bg-gray-50'
            }`}
            onClick={() => applyFormat({ type: 'currency' })}
            title="通貨形式"
          >
            <CurrencyDollarIcon className="w-4 h-4" />
          </button>
          <button 
            type="button" 
            className={`px-2 py-1 text-xs rounded border flex items-center font-semibold ${
              sheet.formats?.[activeCellKey || '']?.type === 'percent' 
                ? 'bg-green-100 text-green-700 border-green-300' 
                : 'bg-white hover:bg-gray-50'
            }`}
            onClick={() => applyFormat({ type: 'percent' })}
            title="パーセント形式"
          >
            <span>%</span>
          </button>
          <select className="text-xs border rounded px-2 py-1" value={sheet.formats?.[activeCellKey || '']?.type || 'text'} onChange={(e) => applyFormat({ type: e.target.value as any })}>
            <option value="text">文字列</option>
            <option value="number">数値</option>
            <option value="percent">百分率</option>
            <option value="currency">通貨</option>
          </select>
          <button type="button" className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50" onClick={() => adjustDecimals(1)}>小数+ </button>
          <button type="button" className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50" onClick={() => adjustDecimals(-1)}>小数- </button>

          {/* 列幅調整（アクティブセルの列） */}
          <button type="button" className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50" onClick={() => {
            if (!activeCellKey) return; const c = Number(activeCellKey.split('C')[1] || '0');
            setColWidths(prev => prev.map((w, i) => i === c ? Math.max(48, w - 8) : w))
          }}>列幅-</button>
          <button type="button" className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50" onClick={() => {
            if (!activeCellKey) return; const c = Number(activeCellKey.split('C')[1] || '0');
            setColWidths(prev => prev.map((w, i) => i === c ? Math.min(320, w + 8) : w))
          }}>列幅+</button>

          {/* Undo / Redo */}
          <button 
            type="button" 
            className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50 flex items-center gap-1" 
            onClick={handleUndo}
            title="元に戻す (Ctrl+Z)"
          >
            <ArrowUturnLeftIcon className="w-4 h-4" />
            <span>Undo</span>
          </button>
          <button 
            type="button" 
            className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50 flex items-center gap-1" 
            onClick={handleRedo}
            title="やり直し (Ctrl+Y)"
          >
            <ArrowUturnRightIcon className="w-4 h-4" />
            <span>Redo</span>
          </button>

          {/* CSV/Excel 入出力 */}
          <button type="button" className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50" onClick={() => {
            const lines: string[] = []
            for (let r = 0; r < sheet.rows; r++) {
              const row: string[] = []
              for (let c = 0; c < sheet.cols; c++) {
                const v = sheet.cells[toCellKey(r, c)] || ''
                const esc = '"' + String(v).replace(/"/g, '""') + '"'
                row.push(esc)
              }
              lines.push(row.join(','))
            }
            const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = `${sheet.name}.csv`; a.click(); URL.revokeObjectURL(url)
          }}>CSV出力</button>
          <button type="button" className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50" onClick={exportExcel}>Excel出力</button>
          <label className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50 cursor-pointer">
            CSV取込
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const text = await file.text()
              const rows = text.replace(/\r/g, '').split('\n')
              setSheet(prev => {
                const next = { ...prev, cells: { ...prev.cells } as Record<string, string> }
                rows.forEach((line, ri) => {
                  const cols = line.split(',').map(s => s.replace(/^"|"$/g, '').replace(/""/g, '"'))
                  cols.forEach((val, ci) => { if (ri < prev.rows && ci < prev.cols) next.cells[toCellKey(ri, ci)] = val })
                })
                if (currentUser) { try { localStorage.setItem(`sheet:${currentUser.uid}:${currentSheetId}`, JSON.stringify(next)) } catch {} }
                if (sheetSaveTimer.current) window.clearTimeout(sheetSaveTimer.current)
                sheetSaveTimer.current = window.setTimeout(async () => {
                  if (!currentUser) return
                  try { await setDoc(doc(db, 'users', currentUser.uid, 'sheets', currentSheetId), { name: next.name, rows: next.rows, cols: next.cols, cells: next.cells, formats: next.formats || {} }) } catch {}
                }, 500)
                return next
              })
            }} />
          </label>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_210px] gap-4 items-start">
        <div 
          ref={gridRef} 
          tabIndex={0} 
          className="overflow-auto border rounded" 
          // ★ バグ修正: コンテナ自体のクリックでの解除ロジックを強化
          onMouseDown={(e) => {
            // クリックされたターゲットがまさにこの「背景コンテナ」である場合のみ解除する
            // セル(Cell)がクリックされた場合は、Cell側で stopPropagation しているのでここは呼ばれないはずだが、念のため
            if (e.target === e.currentTarget) {
              setSelStart(null);
              setSelEnd(null);
              setIsSelecting(false);
              setActiveCellKey(null);
              setFormulaBar('');
              if (gridRef.current) {
                gridRef.current.focus();
              }
            }
          }}
          onClick={(e) => {
            if (!isLoggedIn) {
              alert('入力するには会員登録（無料）が必要です。');
              e.preventDefault();
              return;
            }
            // グリッドの空白部分をクリックした場合は、選択を解除してフォーカスを当てる
            // セルがクリックされた場合は、Cell側で stopPropagation しているのでここは呼ばれない
            const target = e.target as HTMLElement;
            if (target === gridRef.current || (target.tagName === 'DIV' && !target.closest('td'))) {
              e.preventDefault();
              setSelStart(null);
              setSelEnd(null);
              setIsSelecting(false);
              setActiveCellKey(null);
              setFormulaBar('');
            }
            // クリック時にグリッドにフォーカスを当てる（矢印キーが確実に動作するように）
            if (gridRef.current) {
              gridRef.current.focus();
            }
          }} 
          onKeyDown={(e) => {
            // 矢印キーは最初に処理して画面スクロールを防ぐ（必ずpreventDefaultを呼ぶ）
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault();
              e.stopPropagation();
              // 編集モードでない場合のみセル移動
              if (!editingCellKey) {
                if (activeCellKey) {
                  const rc = keyToRC(activeCellKey);
                  if (rc) {
                    let nr = rc.r, nc = rc.c;
                    if (e.key === 'ArrowDown') nr = Math.min(sheet.rows - 1, rc.r + 1);
                    if (e.key === 'ArrowUp') nr = Math.max(0, rc.r - 1);
                    if (e.key === 'ArrowRight') nc = Math.min(sheet.cols - 1, rc.c + 1);
                    if (e.key === 'ArrowLeft') nc = Math.max(0, rc.c - 1);
                    const nk = `R${nr}C${nc}`;
                    setActiveCellKey(nk);
                    setSelStart({ r: nr, c: nc });
                    setSelEnd({ r: nr, c: nc });
                  }
                } else {
                  // activeCellKeyがnullの場合は、最初のセル（A1）を選択
                  const nk = 'R0C0';
                  setActiveCellKey(nk);
                  setSelStart({ r: 0, c: 0 });
                  setSelEnd({ r: 0, c: 0 });
                }
                // グリッドにフォーカスを維持（画面スクロールを防ぐ）
                if (gridRef.current) {
                  gridRef.current.focus();
                }
              }
              return;
            }
            // ESCキーで編集モードを解除または全選択を解除
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              if (editingCellKey) {
                // 編集中の場合は編集をキャンセル
                const raw = sheet.cells[editingCellKey] || '';
                setFormulaBar(raw);
                setEditingCellKey(null);
                setFormulaReferenceCells(new Map());
              } else {
                // 編集中でない場合は全選択を解除
                setSelStart(null);
                setSelEnd(null);
                setIsSelecting(false);
                setActiveCellKey(null);
                setFormulaBar('');
              }
              // グリッドにフォーカスを戻す
              if (gridRef.current) {
                gridRef.current.focus();
              }
              return;
            }
            // 矢印キーでセル移動（編集モードでないとき）/ Enterで編集開始 / Ctrl+Cでコピー
            if (!editingCellKey && activeCellKey) {
              const rc = keyToRC(activeCellKey)
              if (rc) {
                // 非編集時に文字/数字など1文字入力でその内容から編集開始
                if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
                  e.preventDefault()
                  const ch = e.key
                  const nk = activeCellKey
                  setEditingCellKey(nk)
                  setFormulaBar(ch)
                  setSheet(prev => {
                    const next = { ...prev, cells: { ...prev.cells, [nk]: ch } }
                    if (currentUser) { try { localStorage.setItem(`sheet:${currentUser.uid}:${currentSheetId}`, JSON.stringify(next)) } catch {} }
                    return next
                  })
                  return
                }
            if (e.key === 'Enter') {
              e.preventDefault();
              // 数式が入っているセルは編集モードに入らない（ダブルクリックまたは数式バーからのみ編集可能）
              const cellValue = sheet.cells[activeCellKey] || '';
              const isFormula = cellValue.trim().startsWith('=');
              if (!isFormula) {
                // 数式でない場合のみ編集モードに入る
                setEditingCellKey(activeCellKey);
                setFormulaBar(cellValue);
              }
              return
            }
            if (e.key === 'Tab') {
              e.preventDefault();
              const nc = Math.max(0, Math.min(sheet.cols - 1, rc.c + (e.shiftKey ? -1 : 1)))
              const nk = `R${rc.r}C${nc}`
              setActiveCellKey(nk); setSelStart({ r: rc.r, c: nc }); setSelEnd({ r: rc.r, c: nc })
              return
            }
          }
        }
        if (!editingCellKey && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
          // 選択範囲のコピー（TSV）
          e.preventDefault()
          let minR: number, maxR: number, minC: number, maxC: number
          if (selStart && selEnd) {
            minR = Math.min(selStart.r, selEnd.r); maxR = Math.max(selStart.r, selEnd.r)
            minC = Math.min(selStart.c, selEnd.c); maxC = Math.max(selStart.c, selEnd.c)
          } else if (activeCellKey) {
            const rc = keyToRC(activeCellKey); if (!rc) return
            minR = maxR = rc.r; minC = maxC = rc.c
          } else { return }
          const lines: string[] = []
          for (let r = minR; r <= maxR; r++) {
            const row: string[] = []
            for (let c = minC; c <= maxC; c++) row.push(sheet.cells[`R${r}C${c}`] || '')
            lines.push(row.join('\t'))
          }
          const text = lines.join('\n')
          try { void navigator.clipboard.writeText(text) } catch {}
          return
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          const snap = historyManager.current.undo();
          if (!snap) return;
          setSheet(prev => ({ ...prev, cells: snap.cells, formats: snap.formats })); setColWidths(snap.colWidths);
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
          e.preventDefault();
          const snap = historyManager.current.redo();
          if (!snap) return;
          setSheet(prev => ({ ...prev, cells: snap.cells, formats: snap.formats })); setColWidths(snap.colWidths);
        }
        // Delete/Backspace: 選択セル（範囲）をクリア（編集モードでないとき）
        if (!editingCellKey && (e.key === 'Delete' || e.key === 'Backspace')) {
          e.preventDefault()
          let targets: { r: number; c: number }[] = []
          if (selStart && selEnd) {
            const minR = Math.min(selStart.r, selEnd.r)
            const maxR = Math.max(selStart.r, selEnd.r)
            const minC = Math.min(selStart.c, selEnd.c)
            const maxC = Math.max(selStart.c, selEnd.c)
            for (let rr = minR; rr <= maxR; rr++) {
              for (let cc = minC; cc <= maxC; cc++) targets.push({ r: rr, c: cc })
            }
          } else if (activeCellKey) {
            const rc = keyToRC(activeCellKey); if (rc) targets = [rc]
          }
          if (targets.length) {
            historyManager.current.add({ cells: { ...sheet.cells }, formats: { ...(sheet.formats || {}) }, colWidths: [...colWidths] });
            setSheet(prev => {
              const cells = { ...prev.cells }
              const formats = { ...(prev.formats || {}) }
              targets.forEach(({ r, c }) => {
                delete cells[toCellKey(r, c)]
                if (formats[toCellKey(r, c)]) delete formats[toCellKey(r, c)]
              })
              const next = { ...prev, cells, formats }
              try { if (currentUser) localStorage.setItem(`sheet:${currentUser.uid}:${currentSheetId}`, JSON.stringify(next)) } catch {}
              if (sheetSaveTimer.current) window.clearTimeout(sheetSaveTimer.current)
              sheetSaveTimer.current = window.setTimeout(async () => {
                if (!currentUser) return
                try { await setDoc(doc(db, 'users', currentUser.uid, 'sheets', currentSheetId), { name: next.name, rows: next.rows, cols: next.cols, cells: next.cells, formats: next.formats || {} }) } catch {}
              }, 300)
              return next
            })
          }
        }
        }}>
        <Grid
          rows={sheet.rows}
          cols={sheet.cols}
          cells={sheet.cells}
          formats={sheet.formats}
          colWidths={colWidths}
          editingCellKey={editingCellKey}
          activeCellKey={activeCellKey}
          selStart={selStart}
          selEnd={selEnd}
          evalCacheRef={evalCacheRef}
          evaluateRaw={evaluateRaw}
          formatCellNumber={formatCellNumber}
          toCellKey={toCellKey}
          rcToAddress={rcToAddress}
          keyToRC={keyToRC}
          onStartEdit={(key, raw) => {
            if (!isLoggedIn) {
              alert('入力するには会員登録（無料）が必要です。');
              return;
            }
            setEditingCellKey(key);
            setActiveCellKey(key);
            setFormulaBar(raw);
            // 数式バーにフォーカスを移す
            setTimeout(() => {
              formulaBarInputRef.current?.focus();
            }, 0);
          }}
          onEndEdit={(r, c, value) => {
            // 不足している閉じ括弧を自動補完
            let finalValue = value;
            if (finalValue.startsWith('=')) {
              const opens = (finalValue.match(/\(/g) || []).length;
              const closes = (finalValue.match(/\)/g) || []).length;
              if (closes < opens) {
                finalValue = finalValue + ')'.repeat(opens - closes);
              }
            }
            updateCell(r, c, finalValue);
            setEditingCellKey(null);
            setFormulaReferenceCells(new Map()); // 編集終了時に参照セルをクリア
            setFormulaBar(finalValue);
          }}
          onCancelEdit={(raw) => {
            setEditingCellKey(null);
            setFormulaReferenceCells(new Map()); // 編集キャンセル時に参照セルをクリア
            setFormulaBar(raw);
          }}
          onSelect={() => {
            if (didDragRef.current) {
              didDragRef.current = false;
            }
          }}
          onStartDrag={(r, c, e) => {
            didDragRef.current = false;
            isMouseDownRef.current = true; // マウスボタンが押された
            const key = toCellKey(r, c);
            
            // 数式編集中の場合のみ、セルクリックで参照を挿入
            // 重要: editingCellKeyが設定されている場合のみ（実際に編集中の場合のみ）
            // シングルクリックでセルを選択しただけの場合は、editingCellKeyは設定されていないので参照を挿入しない
            if (editingCellKey && formulaBar.trim().startsWith('=')) {
              if (e) {
                e.preventDefault();
                e.stopPropagation();
              }
              
              const addComma = e ? (e.ctrlKey || e.metaKey) : false;
              
              // 数式バーにフォーカスを維持
              if (formulaBarInputRef.current) {
                formulaBarInputRef.current.focus();
              }
              
              // 参照を挿入
              insertCellReferenceToFormula(r, c, addComma);
              return;
            }
            
            // 通常時: セル選択を移動（単一セルのみ選択）
            setActiveCellKey(key);
            setSelStart({ r, c });
            setSelEnd({ r, c });
            setIsSelecting(false); // 最初は単一セルのみ選択
            if (gridRef.current) gridRef.current.focus();
          }}
          onDragEnter={(r, c) => {
            if (isFilling && fillOrigin) {
              // オートフィルモード中
              const origin = fillOrigin;
              const originMinR = Math.min(origin.start.r, origin.end.r);
              const originMaxR = Math.max(origin.start.r, origin.end.r);
              const originMinC = Math.min(origin.start.c, origin.end.c);
              const originMaxC = Math.max(origin.start.c, origin.end.c);
              // オートフィルの対象範囲＝元範囲と現在位置のセルとの結合範囲
              const newStart = {
                r: Math.min(originMinR, r),
                c: Math.min(originMinC, c),
              };
              const newEnd = {
                r: Math.max(originMaxR, r),
                c: Math.max(originMaxC, c),
              };
              setFillTarget({ start: newStart, end: newEnd });
              // 選択範囲も更新して視覚的フィードバック
              setSelStart(newStart);
              setSelEnd(newEnd);
            } else if (isMouseDownRef.current && selStart && (selStart.r !== r || selStart.c !== c)) {
              // マウスボタンが押されている場合のみ範囲を拡張（開始位置と現在位置が異なる場合）
              setIsSelecting(true);
              setSelEnd({ r, c });
              didDragRef.current = true;
              // 数式編集中はドラッグで範囲拡張（A1:A5）
              if (editingCellKey) {
                const rawActive = (sheet.cells[editingCellKey] || '').trim();
                if (rawActive.startsWith('=')) {
                  const addr = rcToAddress(r, c);
                  setSheet(prev => {
                    const closers = rawActive.match(/\)+$/)?.[0] || '';
                    let body = closers ? rawActive.slice(0, -closers.length) : rawActive;
                    const li = Math.max(body.lastIndexOf('('), body.lastIndexOf(','));
                    if (li >= 0) {
                      const head = body.slice(0, li + 1);
                      const after = body.slice(li + 1);
                      if (after.includes(':')) {
                        const start = after.split(':')[0];
                        body = head + start + ':' + addr;
                      } else {
                        body = head + after + ':' + addr;
                      }
                      const nextVal = body + closers;
                      const next = { ...prev, cells: { ...prev.cells, [editingCellKey]: nextVal } };
                      if (currentUser) { try { localStorage.setItem(`sheet:${currentUser.uid}:${currentSheetId}`, JSON.stringify(next)) } catch {} }
                      setFormulaBar(nextVal);
                      return next;
                    }
                    return prev;
                  });
                }
              }
            }
          }}
          onFillStart={(r, c, e) => {
            handleFillStart(r, c);
          }}
          isSelecting={isSelecting}
          isFilling={isFilling}
          fillOrigin={fillOrigin}
          fillTarget={fillTarget}
          isFormulaEditing={formulaBar.trim().startsWith('=') || (editingCellKey !== null && (sheet.cells[editingCellKey] || '').trim().startsWith('='))}
          formulaReferenceCells={formulaReferenceCells}
          onContextMenu={handleContextMenu}
          onKeyDown={(r, c, key, e) => {
            // セルがフォーカスされているときにキー入力を受け付ける
            if (!editingCellKey && activeCellKey === key) {
              // 数値や文字を直接入力できるようにする（=を含む）
              if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && isLoggedIn) {
                e.preventDefault();
                // 編集モードを開始
                setEditingCellKey(key);
                setFormulaBar(e.key);
                // 数式バーにフォーカスを移す
                setTimeout(() => {
                  if (formulaBarInputRef.current) {
                    formulaBarInputRef.current.focus();
                    formulaBarInputRef.current.setSelectionRange(1, 1);
                  }
                }, 0);
                // セルの値を更新
                setSheet(prev => {
                  const next = { ...prev, cells: { ...prev.cells, [key]: e.key } };
                  if (currentUser) { 
                    try { 
                      localStorage.setItem(`sheet:${currentUser.uid}:${currentSheetId}`, JSON.stringify(next)) 
                    } catch {} 
                  }
                  return next;
                });
                return;
              }
              // 編集モードでない時のみ矢印キーでセル移動
              if (!editingCellKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
                e.preventDefault();
                let nr = r, nc = c;
                if (e.key === 'ArrowDown') nr = Math.min(sheet.rows - 1, r + 1);
                if (e.key === 'ArrowUp') nr = Math.max(0, r - 1);
                if (e.key === 'ArrowRight') nc = Math.min(sheet.cols - 1, c + 1);
                if (e.key === 'ArrowLeft') nc = Math.max(0, c - 1);
                const nk = toCellKey(nr, nc);
                setActiveCellKey(nk);
                setSelStart({ r: nr, c: nc });
                setSelEnd({ r: nr, c: nc });
                // グリッドにフォーカスを維持
                if (gridRef.current) {
                  gridRef.current.focus();
                }
                return;
              }
              if (e.key === 'Tab') {
                e.preventDefault();
                const nc = Math.max(0, Math.min(sheet.cols - 1, c + (e.shiftKey ? -1 : 1)));
                const nk = toCellKey(r, nc);
                setActiveCellKey(nk);
                setSelStart({ r, c: nc });
                setSelEnd({ r, c: nc });
                return;
              }
              if (e.key === 'Enter') {
                e.preventDefault();
                // 数式が入っているセルは編集モードに入らない（ダブルクリックまたは数式バーからのみ編集可能）
                const cellValue = sheet.cells[key] || '';
                const isFormula = cellValue.trim().startsWith('=');
                if (!isFormula) {
                  // 数式でない場合のみ編集モードに入る
                  setEditingCellKey(key);
                  setFormulaBar(cellValue);
                  setTimeout(() => {
                    if (formulaBarInputRef.current) {
                      formulaBarInputRef.current.focus();
                    }
                  }, 0);
                }
                return;
              }
            }
            // 編集中のEnter押下後のセル移動
            if (editingCellKey === key && (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
              const nr = e.key === 'ArrowUp' ? Math.max(0, r - 1) : e.key === 'ArrowDown' ? Math.min(sheet.rows - 1, r + 1) : Math.min(sheet.rows - 1, r + (e.shiftKey ? -1 : 1));
              const nk = toCellKey(nr, c);
              setActiveCellKey(nk);
              setSelStart({ r: nr, c });
              setSelEnd({ r: nr, c });
              const nextRaw = sheet.cells[nk] || '';
              setFormulaBar(nextRaw);
              if (e.key === 'Enter') {
                setEditingCellKey(nk);
              }
              return;
            }
            // 編集中のTab押下後のセル移動
            if (editingCellKey === key && e.key === 'Tab') {
              const nc = Math.max(0, Math.min(sheet.cols - 1, c + (e.shiftKey ? -1 : 1)));
              const nk = toCellKey(r, nc);
              setActiveCellKey(nk);
              setSelStart({ r, c: nc });
              setSelEnd({ r, c: nc });
              const nextRaw = sheet.cells[nk] || '';
              setFormulaBar(nextRaw);
              setEditingCellKey(nk);
              return;
            }
          }}
          onPaste={(r, c, e) => {
            const text = e.clipboardData.getData('text');
            if (!text || (!text.includes('\t') && !text.includes('\n'))) return;
            e.preventDefault();
            const rows = text.replace(/\r/g, '').split('\n').filter(Boolean);
            const grid = rows.map(row => row.split('\t'));
            setSheet(prev => {
              const next = { ...prev, cells: { ...prev.cells } as Record<string, string> };
              grid.forEach((rowVals, rr) => {
                rowVals.forEach((val, cc) => {
                  const rrIdx = r + rr;
                  const ccIdx = c + cc;
                  if (rrIdx < prev.rows && ccIdx < prev.cols) {
                    next.cells[toCellKey(rrIdx, ccIdx)] = val;
                  }
                });
              });
              if (currentUser) { try { localStorage.setItem(`sheet:${currentUser.uid}:${currentSheetId}`, JSON.stringify(next)) } catch {} }
              if (sheetSaveTimer.current) window.clearTimeout(sheetSaveTimer.current);
              sheetSaveTimer.current = window.setTimeout(async () => {
                if (!currentUser) return;
                try { await setDoc(doc(db, 'users', currentUser.uid, 'sheets', currentSheetId), { name: next.name, rows: next.rows, cols: next.cols, cells: next.cells }) } catch {}
              }, 500);
              return next;
            });
          }}
          isLoggedIn={isLoggedIn}
          gridRef={gridRef}
        />
        </div>
        
        {/* 右クリックメニュー */}
        {contextMenu && (
          <div 
            className="fixed bg-white border border-gray-200 shadow-lg rounded py-1 z-50 w-48"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1 text-xs text-gray-400 font-semibold border-b mb-1">メニュー</div>
            <button
              onClick={() => executeContextAction('insert')}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center space-x-2 text-gray-700"
            >
              <PlusIcon className="w-4 h-4" />
              <span>挿入</span>
            </button>
            <button
              onClick={() => executeContextAction('delete')}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center space-x-2 text-red-600"
            >
              <TrashIcon className="w-4 h-4" />
              <span>削除</span>
            </button>
          </div>
        )}
        {/* 右サイド: よく使う関数（幅を約半分に縮小） */}
        <div className="sticky top-4 space-y-2 w-[210px]">
          <div className="text-sm font-semibold">よく使う関数</div>
          <div className="space-y-1">
            {commonFuncs.map(fn => (
              <button key={fn.name} type="button" onClick={() => insertTemplate(fn.tpl)} className="w-full text-left text-[11px] px-2 py-1 rounded border bg-white hover:bg-gray-50" title={fn.hint}>
                <span className="font-mono text-[11px]">{fn.tpl}</span>
                <span className="ml-2 text-gray-500">{fn.hint}</span>
              </button>
            ))}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Spreadsheet;

