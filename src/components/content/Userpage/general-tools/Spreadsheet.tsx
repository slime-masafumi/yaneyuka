'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebaseClient';
import { collection, doc, deleteDoc, onSnapshot, setDoc, updateDoc, deleteField, getDoc, getDocs } from 'firebase/firestore';
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

type CellBorder = { top?: boolean; right?: boolean; bottom?: boolean; left?: boolean };
type CellFormat = {
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  type?: 'text' | 'number' | 'percent' | 'currency';
  decimals?: number;
  border?: CellBorder;
  bg?: string;
  color?: string;
  fontSize?: number;
  wrap?: boolean;
};
/** 結合セル。r,c は左上（アンカー）の位置で、rs/cs は結合する行数・列数 */
type Merge = { r: number; c: number; rs: number; cs: number };

/** 条件付き書式のルール。範囲・条件・当てはまったときの見た目を持つ */
type CondOp = 'gt' | 'lt' | 'ge' | 'le' | 'eq' | 'ne' | 'contains' | 'between';
type CondRule = {
  id: string;
  r1: number; c1: number; r2: number; c2: number;
  op: CondOp;
  value: string;
  value2?: string;
  style: { bg?: string; color?: string; bold?: boolean };
};

const COND_OP_LABEL: Record<CondOp, string> = {
  gt: 'より大きい', ge: '以上', lt: 'より小さい', le: '以下',
  eq: '等しい', ne: '等しくない', between: 'の範囲内', contains: '文字を含む',
};

type SheetData = {
  id: string;
  name: string;
  rows: number;
  cols: number;
  cells: Record<string, string>;
  formats?: Record<string, CellFormat>;
  merges?: Merge[];
  condRules?: CondRule[];
};

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
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [docBytes, setDocBytes] = useState(0);
  const [findOpen, setFindOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  /** 直近に Firestore へ書いた内容。次回の差分計算の基準になる */
  const lastSavedRef = useRef<(SheetData & { colWidths: number[] }) | null>(null);
  /** デバウンス待ちの保存内容 */
  const pendingSheetRef = useRef<(SheetData & { colWidths: number[] }) | null>(null);
  /** 直前に Ctrl+C したときの範囲。貼り付け時の参照ずらしに使う */
  const copySourceRef = useRef<{ r: number; c: number; text: string } | null>(null);
  const [condOpen, setCondOpen] = useState(false);
  const [condOp, setCondOp] = useState<CondOp>('gt');
  const [condValue, setCondValue] = useState('');
  const [condValue2, setCondValue2] = useState('');
  const [condBg, setCondBg] = useState('#ffe08a');
  const [condColor, setCondColor] = useState('#7a3b00');
  const [condBold, setCondBold] = useState(false);

  // 表計算: 参照/数式ユーティリティ
  const toCellKey = (r: number, c: number) => `R${r}C${c}`;
  const rcToAddress = (r: number, c: number) => formulaEngine.current.rcToAddress(r, c);
  const keyToRC = (key: string): { r: number; c: number } | null => {
    const m = key.match(/^R(\d+)C(\d+)$/);
    if (!m) return null;
    return { r: Number(m[1]), c: Number(m[2]) };
  };
  const addressToRC = (addr: string) => formulaEngine.current.addressToRC(addr);
  /**
   * セルの入力内容。sheetName を渡すと別シートから読む。
   * 別シートの中身は otherSheets（シート一覧の購読結果）に入っている。
   */
  const getRaw = (r: number, c: number, sheetName?: string) => {
    if (!sheetName || sheetName === sheet.name) return sheet.cells[toCellKey(r, c)] || '';
    const target = otherSheetsRef.current[sheetName];
    return target ? target[toCellKey(r, c)] || '' : '';
  };

  /** そのシート名が存在するか（存在しなければ #REF! を返したい） */
  const sheetExists = (name: string) => name === sheet.name || name in otherSheetsRef.current;

  /**
   * セルを評価する。sheetName を渡すと別シートのセルを見る（Sheet1!A1）。
   *
   * キャッシュも循環参照の検出もシート名で名前空間を分ける。分けないと
   * 「シートAのA1」と「シートBのA1」が同じものとみなされ、
   * 誤った循環参照エラーや取り違えが起きる。
   */
  const evaluateCell = (
    r: number,
    c: number,
    visited: Set<string> = new Set(),
    sheetName?: string,
  ): number | string => {
    const key = sheetName ? `${sheetName}!${toCellKey(r, c)}` : toCellKey(r, c);
    if (evalCacheRef.current.has(key)) return evalCacheRef.current.get(key) as any;
    if (visited.has(key)) return '#CIRCULAR!';
    visited.add(key);
    const raw = getRaw(r, c, sheetName);
    // 別シートのセルに入っている数式は、そのシートを基準に評価する
    const result = evaluateRaw(raw, visited, sheetName);
    evalCacheRef.current.set(key, result);
    return result;
  };

  /**
   * シート全体をFirestore・localStorageへ保存（500msデバウンス）。
   *
   * ★保存結果を必ず画面に出すこと。以前は catch {} で握りつぶしていたため、
   *   Firestore の1ドキュメント上限（1MiB）を超えて保存が失敗しても何も表示されず、
   *   ローカルには残るのでユーザーは保存できたと思い込んでいた。
   *   別端末で開くと消えている、という最悪の壊れ方をする。
   */
  const persistSheet = (next: SheetData) => {
    if (!currentUser) return;
    try {
      localStorage.setItem(`sheet:${currentUser.uid}:${currentSheetId}`, JSON.stringify(next));
    } catch {
      // localStorage の容量超過。Firestore には入る可能性があるので続行する
    }
    setSaveState('saving');
    pendingSheetRef.current = { ...next, colWidths } as SheetData & { colWidths: number[] };
    if (sheetSaveTimer.current) window.clearTimeout(sheetSaveTimer.current);
    sheetSaveTimer.current = window.setTimeout(() => { void flushSave(); }, 500);
  };

  /**
   * 実際の書き込み。前回保存した内容と突き合わせて、変わったセルだけを送る。
   *
   * ★シート全体を setDoc で上書きしていると、別のタブや別の端末で開いている
   *   同じシートの編集を丸ごと踏み潰す（後勝ち）。フィールド単位の updateDoc なら
   *   Firestore 側で別々のセルの変更がマージされるので、両方が残る。
   *   送信量も 1セル数十バイトで済む。
   */
  const flushSave = async () => {
    const next = pendingSheetRef.current;
    if (!currentUser || !next) return;
    pendingSheetRef.current = null;
    const ref = doc(db, 'users', currentUser.uid, 'sheets', currentSheetId);

    const full: SheetData & { colWidths: number[] } = {
      id: currentSheetId,
      name: next.name,
      rows: next.rows,
      cols: next.cols,
      cells: next.cells,
      formats: next.formats || {},
      merges: next.merges || [],
      condRules: next.condRules || [],
      colWidths: next.colWidths,
    };
    // Firestore の1ドキュメント上限は 1MiB。近づいたら警告する（超えると保存自体が失敗する）
    const bytes = new Blob([JSON.stringify(full)]).size;
    setDocBytes(bytes);

    const prev = lastSavedRef.current;
    // 変更点を「フィールドパス → 値」に落とす。消えたセルは deleteField を入れる
    const patch: Record<string, any> = {};
    let cellChanges = 0;
    if (prev) {
      for (const [key, value] of Object.entries(next.cells)) {
        if (prev.cells[key] !== value) { patch[`cells.${key}`] = value; cellChanges++; }
      }
      for (const key of Object.keys(prev.cells)) {
        if (!(key in next.cells)) { patch[`cells.${key}`] = deleteField(); cellChanges++; }
      }
      const nf = next.formats || {}, pf = prev.formats || {};
      for (const [key, value] of Object.entries(nf)) {
        if (JSON.stringify(pf[key]) !== JSON.stringify(value)) patch[`formats.${key}`] = value;
      }
      for (const key of Object.keys(pf)) {
        if (!(key in nf)) patch[`formats.${key}`] = deleteField();
      }
      // 配列・スカラーは丸ごと入れ替える（小さいので差分にする意味がない）
      if (prev.name !== next.name) patch.name = next.name;
      if (prev.rows !== next.rows) patch.rows = next.rows;
      if (prev.cols !== next.cols) patch.cols = next.cols;
      if (JSON.stringify(prev.merges || []) !== JSON.stringify(next.merges || [])) patch.merges = next.merges || [];
      if (JSON.stringify(prev.condRules || []) !== JSON.stringify(next.condRules || [])) patch.condRules = next.condRules || [];
      if (JSON.stringify(prev.colWidths) !== JSON.stringify(next.colWidths)) patch.colWidths = next.colWidths;
    }

    try {
      // 初回、または行列の挿入削除・取込のようにほぼ全セルが動いたときは丸ごと書く
      if (!prev || cellChanges > 400) {
        const { id: _id, ...payload } = full; // id はドキュメントIDなので中身には入れない
        void _id;
        await setDoc(ref, payload);
      } else if (Object.keys(patch).length > 0) {
        await updateDoc(ref, patch);
      }
      lastSavedRef.current = full;
      setSaveState('saved');
      setSaveError(null);
    } catch (e) {
      console.error('シートの保存に失敗しました', e);
      setSaveState('error');
      setSaveError(
        bytes > 900_000
          ? 'このシートは容量の上限に達しているため保存できません。不要な行・列を削除してください。'
          : '保存できませんでした。通信状態を確認してください。',
      );
    }
  };

  /** 現在の状態をUndo履歴に積む */
  const pushHistory = () => {
    historyManager.current.add({
      cells: { ...sheet.cells },
      formats: { ...(sheet.formats || {}) },
      colWidths: [...colWidths],
      rows: sheet.rows,
      cols: sheet.cols,
    });
  };

  const currentSnapshot = (): HistorySnapshot => ({
    cells: { ...sheet.cells },
    formats: { ...(sheet.formats || {}) },
    colWidths: [...colWidths],
    rows: sheet.rows,
    cols: sheet.cols,
  });

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

  /** 書式から Excel の表示形式（z）を作る */
  const excelNumberFormat = (fmt?: CellFormat): string | undefined => {
    if (!fmt?.type) return undefined
    const d = fmt.decimals ?? 0
    const frac = d > 0 ? '.' + '0'.repeat(d) : ''
    if (fmt.type === 'percent') return `0${frac}%`
    if (fmt.type === 'currency') return `¥#,##0${frac}`
    if (fmt.type === 'number') return `#,##0${frac}`
    return undefined
  }

  /**
   * Excel 書き出し。
   *
   * ★以前はセルの生テキストをそのまま並べていたため、
   *   - 数式が `=SUM(A1:A3)` という「文字列」として出て計算されない
   *   - 数値も文字列セルになり、Excel 側で集計できない
   *   という状態だった。ここでは数式は数式として、数値は数値として書き出す。
   */
  const exportExcel = () => {
    const ws: Record<string, any> = {}
    for (let r = 0; r < sheet.rows; r++) {
      for (let c = 0; c < sheet.cols; c++) {
        const raw = sheet.cells[toCellKey(r, c)] || ''
        if (raw === '') continue
        const addr = XLSX.utils.encode_cell({ r, c })
        const fmt = sheet.formats?.[toCellKey(r, c)]
        const z = excelNumberFormat(fmt)

        if (raw.trim().startsWith('=')) {
          // 数式は f に入れる（先頭の = は付けない）。v には現在の計算結果を入れておく
          const computed = evaluateRaw(raw, new Set())
          const cell: any = { f: raw.trim().slice(1) }
          if (typeof computed === 'number') { cell.t = 'n'; cell.v = computed }
          else { cell.t = 's'; cell.v = String(computed) }
          if (z) cell.z = z
          ws[addr] = cell
          continue
        }

        const num = Number(raw)
        if (raw.trim() !== '' && !Number.isNaN(num) && Number.isFinite(num)) {
          ws[addr] = z ? { t: 'n', v: num, z } : { t: 'n', v: num }
        } else {
          ws[addr] = { t: 's', v: raw }
        }
      }
    }
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(0, sheet.rows - 1), c: Math.max(0, sheet.cols - 1) } })
    ws['!cols'] = colWidths.slice(0, sheet.cols).map(w => ({ wpx: w }))
    // 結合セルは Excel 側にもそのまま渡す
    if (sheet.merges?.length) {
      ws['!merges'] = sheet.merges.map(m => ({ s: { r: m.r, c: m.c }, e: { r: m.r + m.rs - 1, c: m.c + m.cs - 1 } }))
    }
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws as any, (sheet.name || 'Sheet').slice(0, 31))
    XLSX.writeFile(wb, `${sheet.name || 'sheet'}.xlsx`)
  }

  /** CSV は計算結果を書き出す（数式の文字列ではなく値が欲しい用途のため） */
  const exportCsv = () => {
    const lines: string[] = []
    for (let r = 0; r < sheet.rows; r++) {
      const row: string[] = []
      for (let c = 0; c < sheet.cols; c++) {
        const raw = sheet.cells[toCellKey(r, c)] || ''
        const v = raw.trim().startsWith('=') ? evaluateRaw(raw, new Set()) : raw
        row.push('"' + String(v).replace(/"/g, '""') + '"')
      }
      lines.push(row.join(','))
    }
    // BOM を付けないと Excel が UTF-8 と判定せず日本語が化ける
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${sheet.name}.csv`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  /**
   * Excel / CSV の読み込み。数式も取り込む。
   * 取り込んだ内容に合わせて行数・列数を広げる（従来のCSV取込は既存の枠に切り捨てていた）。
   */
  const importFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const first = wb.SheetNames[0]
      if (!first) { alert('シートが見つかりませんでした。'); return }
      const ws = wb.Sheets[first] as Record<string, any>
      const ref = ws['!ref']
      if (!ref) { alert('データが空でした。'); return }
      const range = XLSX.utils.decode_range(ref)

      const cells: Record<string, string> = {}
      for (let r = range.s.r; r <= range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cell = ws[XLSX.utils.encode_cell({ r, c })]
          if (!cell) continue
          const rr = r - range.s.r
          const cc = c - range.s.c
          // 数式があれば数式を優先して取り込む
          if (cell.f) cells[toCellKey(rr, cc)] = `=${cell.f}`
          else if (cell.v !== undefined && cell.v !== null && cell.v !== '') cells[toCellKey(rr, cc)] = String(cell.v)
        }
      }

      // 結合セルも取り込む（範囲の左上を原点に読み替える）
      const merges: Merge[] = ((ws['!merges'] as any[]) || []).map(m => ({
        r: m.s.r - range.s.r,
        c: m.s.c - range.s.c,
        rs: m.e.r - m.s.r + 1,
        cs: m.e.c - m.s.c + 1,
      })).filter(m => m.r >= 0 && m.c >= 0 && (m.rs > 1 || m.cs > 1))

      const rows = Math.max(20, range.e.r - range.s.r + 1)
      const cols = Math.max(10, range.e.c - range.s.c + 1)
      if (!confirm(`「${file.name}」を読み込みます。\n${rows}行 × ${cols}列。現在のシートの内容は置き換わります。よろしいですか？`)) return

      pushHistory()
      setColWidths(prev => (prev.length >= cols ? prev : prev.concat(Array.from({ length: cols - prev.length }, () => 96))))
      setSheet(prev => {
        const next: SheetData = { ...prev, rows, cols, cells, formats: {}, merges, condRules: [] }
        persistSheet(next)
        return next
      })
    } catch (err) {
      console.error('取り込みに失敗しました', err)
      alert('ファイルを読み込めませんでした。Excel（.xlsx / .xls）または CSV を選んでください。')
    }
  }

  /**
   * 数式を評価する。
   * baseSheet はこの数式が置かれているシート名（別シートのセルを評価するときに使う）。
   */
  const evaluateRaw = (raw: string, visited: Set<string>, baseSheet?: string): number | string => {
    const getCellValue = (cell: { row: number; col: number }) => {
      const key = toCellKey(cell.row, cell.col);
      return { value: sheet.cells[key] || '', formula: sheet.cells[key] || '' };
    };
    const evaluateCellFn = (cell: { row: number; col: number }, sheetName?: string) => {
      // 参照にシート名が付いていなければ、数式が置かれているシートを見る
      const target = sheetName ?? baseSheet;
      if (target && !sheetExists(target)) return '#REF!';
      return evaluateCell(cell.row, cell.col, visited, target);
    };
    return formulaEngine.current.evaluateRaw(raw, visited, getCellValue, evaluateCellFn);
  };

  /**
   * 別シート参照（Sheet1!A1）のために、全シートの内容を購読しておく。
   *
   * 評価はレンダー中に同期的に走るので、state ではなく ref で持つ
   * （state だと1レンダー遅れて古い値で計算してしまう）。
   * 再描画を促すために件数だけ state にも持つ。
   */
  const otherSheetsRef = useRef<Record<string, Record<string, string>>>({});
  const [, setOtherSheetsVersion] = useState(0);

  useEffect(() => {
    if (!currentUser) { otherSheetsRef.current = {}; return }
    const colRef = collection(db, 'users', currentUser.uid, 'sheets')
    const unsub = onSnapshot(colRef, (snap) => {
      const map: Record<string, Record<string, string>> = {}
      snap.docs.forEach(d => {
        const data = d.data() as any
        const name = data?.name || d.id
        map[name] = data?.cells || {}
      })
      otherSheetsRef.current = map
      setOtherSheetsVersion(v => v + 1) // 参照先が変わったら再計算させる
    }, (err) => {
      console.error('シート一覧の購読に失敗しました', err)
    })
    return () => unsub()
  }, [currentUser])

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
    // ★シートを切り替えたら Undo 履歴を捨てる。
    //   同じ HistoryManager を持ち回すと、シートAを編集 → シートBへ切替 → Ctrl+Z で
    //   シートAの内容がシートBに上書き保存され、復旧できなくなる。
    historyManager.current.clear()
    setSaveState('idle')
    setSaveError(null)
    // 差分の基準もリセットする。別シートの内容を基準に差分を出すと、
    // 「消えたセル」を大量に検出して他シートを壊しかねない
    lastSavedRef.current = null
    pendingSheetRef.current = null
    try { setShareCode(localStorage.getItem(`sheetShare:${currentUser.uid}:${currentSheetId}`)) } catch { setShareCode(null) }
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
          const next: SheetData = { id: currentSheetId, name: data.name || 'シート1', rows: data.rows || 20, cols: data.cols || 10, cells: data.cells || {}, formats: data.formats || {}, merges: data.merges || [], condRules: data.condRules || [] }
          setSheet(next)
          // 列幅も復元する（以前は保存していなかったのでリロードで既定幅に戻っていた）
          if (Array.isArray(data.colWidths) && data.colWidths.length) setColWidths(data.colWidths)
          // 差分の基準をサーバーの内容に合わせる。
          // 別のタブや端末が書き込んだあとに古い基準で差分を出すと、
          // 相手の変更を「消えたセル」とみなして削除してしまう。
          if (!snap.metadata.hasPendingWrites) {
            lastSavedRef.current = {
              ...next,
              colWidths: Array.isArray(data.colWidths) && data.colWidths.length ? data.colWidths : colWidths,
            }
          }
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
    pushHistory();
    setSheet(prev => {
      const key = `R${r}C${c}`;
      const next = { ...prev, cells: { ...prev.cells, [key]: value } };
      persistSheet(next);
      return next;
    });
  };

  // 行・列の追加もFirestoreへ保存する（従来はstateだけ変えていたためリロードで消えていた）
  const addRow = () => {
    pushHistory();
    setSheet(prev => {
      const next = { ...prev, rows: prev.rows + 1 };
      persistSheet(next);
      return next;
    });
  };

  const addCol = () => {
    pushHistory();
    setColWidths(prev => [...prev, 96]);
    setSheet(prev => {
      const next = { ...prev, cols: prev.cols + 1 };
      persistSheet(next);
      return next;
    });
  };

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

    pushHistory();

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
            continue;
          }

          // 連続データ。元が数値／日付なら「1,2,3…」「4/1,4/2…」と伸ばす。
          // 従来は同じ値を繰り返すだけで、Excel のオートフィルとして期待外れだった。
          const step = seriesStep(prev, origin, tr, tc, sourceR, sourceC);
          next.cells[targetKey] = step ?? sourceValue;
        }
      }
      
      persistSheet(next);
      return next;
    });
  };

  // 書式適用（選択セルのみ）
  /**
   * 現在の選択範囲（範囲選択が無ければアクティブセル1つ）。
   * 書式・並べ替え・検索置換など、範囲に対する操作はすべてこれを使う。
   */
  const selectedCells = (): { r: number; c: number }[] => {
    if (selStart && selEnd) {
      const out: { r: number; c: number }[] = []
      const minR = Math.min(selStart.r, selEnd.r), maxR = Math.max(selStart.r, selEnd.r)
      const minC = Math.min(selStart.c, selEnd.c), maxC = Math.max(selStart.c, selEnd.c)
      for (let r = minR; r <= maxR; r++) for (let c = minC; c <= maxC; c++) out.push({ r, c })
      return out
    }
    const rc = activeCellKey ? keyToRC(activeCellKey) : null
    return rc ? [rc] : []
  }

  /**
   * 書式適用。
   * ★以前はアクティブセル1つにしか効かず、範囲を選んでも太字にできなかった。
   *   pushHistory も呼んでいなかったので書式変更が Undo できなかった。
   */
  const applyFormat = (fmt: Partial<CellFormat>) => {
    const targets = selectedCells()
    if (!targets.length) return
    pushHistory()
    setSheet(prev => {
      const formats = { ...(prev.formats || {}) }
      targets.forEach(({ r, c }) => {
        const key = toCellKey(r, c)
        const cur = formats[key] || {}
        // border は入れ子なのでマージする（「上罫線だけ足す」が効くように）
        formats[key] = fmt.border
          ? { ...cur, ...fmt, border: { ...(cur.border || {}), ...fmt.border } }
          : { ...cur, ...fmt }
      })
      const next = { ...prev, formats }
      persistSheet(next)
      return next
    })
  }

  /** 選択範囲の外周だけに罫線を引く（表を線で囲む） */
  const applyOuterBorder = () => {
    const targets = selectedCells()
    if (!targets.length) return
    const minR = Math.min(...targets.map(t => t.r)), maxR = Math.max(...targets.map(t => t.r))
    const minC = Math.min(...targets.map(t => t.c)), maxC = Math.max(...targets.map(t => t.c))
    pushHistory()
    setSheet(prev => {
      const formats = { ...(prev.formats || {}) }
      targets.forEach(({ r, c }) => {
        const key = toCellKey(r, c)
        const cur = formats[key] || {}
        formats[key] = {
          ...cur,
          border: {
            ...(cur.border || {}),
            top: r === minR ? true : cur.border?.top,
            bottom: r === maxR ? true : cur.border?.bottom,
            left: c === minC ? true : cur.border?.left,
            right: c === maxC ? true : cur.border?.right,
          },
        }
      })
      const next = { ...prev, formats }
      persistSheet(next)
      return next
    })
  }

  const ISO_DATE_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})$/

  /**
   * オートフィルの連続データ。
   *
   * 元の選択が数値／日付なら、等差で伸ばした値を返す（伸ばせないときは null）。
   * 元が1セルだけのときは +1 ずつ、2セル以上なら差分を等差とみなす。
   */
  const seriesStep = (
    prev: SheetData,
    origin: { start: { r: number; c: number }; end: { r: number; c: number } },
    targetR: number,
    targetC: number,
    sourceR: number,
    sourceC: number,
  ): string | null => {
    const vertical = targetC === sourceC
    const originVals: string[] = []
    const oMinR = Math.min(origin.start.r, origin.end.r), oMaxR = Math.max(origin.start.r, origin.end.r)
    const oMinC = Math.min(origin.start.c, origin.end.c), oMaxC = Math.max(origin.start.c, origin.end.c)
    if (vertical) {
      for (let r = oMinR; r <= oMaxR; r++) originVals.push(prev.cells[toCellKey(r, sourceC)] || '')
    } else {
      for (let c = oMinC; c <= oMaxC; c++) originVals.push(prev.cells[toCellKey(sourceR, c)] || '')
    }
    if (!originVals.length) return null

    // 何個ぶん先か
    const distance = vertical ? targetR - oMinR : targetC - oMinC
    if (distance < originVals.length) return null // 元の範囲内はそのまま

    const nums = originVals.map(v => Number(v))
    if (originVals.every(v => v.trim() !== '') && nums.every(n => !Number.isNaN(n))) {
      const step = nums.length > 1 ? nums[1] - nums[0] : 1
      // 差が一定でなければ連続データとみなさない（Excel と同じ）
      const uniform = nums.every((n, i) => i === 0 || Math.abs(n - nums[i - 1] - step) < 1e-9)
      if (!uniform) return null
      const value = nums[0] + step * distance
      return String(Number(value.toFixed(10)))
    }

    const dates = originVals.map(v => ISO_DATE_RE.exec(v.trim()))
    if (dates.every(Boolean)) {
      const toDate = (m: RegExpExecArray) => new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
      const first = toDate(dates[0]!)
      const DAY = 24 * 60 * 60 * 1000
      const stepDays = dates.length > 1 ? Math.round((toDate(dates[1]!).getTime() - first.getTime()) / DAY) || 1 : 1
      const d = new Date(first.getTime() + stepDays * distance * DAY)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }

    return null
  }

  /** 次の一致セルへ移動する。表示中の計算結果ではなく入力内容を対象にする */
  const findNext = () => {
    const needle = findText.trim()
    if (!needle) return
    const start = activeCellKey ? keyToRC(activeCellKey) : null
    const from = start ? start.r * sheet.cols + start.c + 1 : 0
    const total = sheet.rows * sheet.cols
    for (let i = 0; i < total; i++) {
      const pos = (from + i) % total
      const r = Math.floor(pos / sheet.cols)
      const c = pos % sheet.cols
      const raw = sheet.cells[toCellKey(r, c)] || ''
      if (raw.toLowerCase().includes(needle.toLowerCase())) {
        const key = toCellKey(r, c)
        setActiveCellKey(key)
        setSelStart({ r, c })
        setSelEnd({ r, c })
        setFormulaBar(raw)
        document.getElementById(`cell-${r}-${c}`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        return
      }
    }
    alert(`「${needle}」は見つかりませんでした。`)
  }

  /** シート全体を置換する。件数を出してから確定させる */
  const replaceAll = () => {
    const needle = findText
    if (!needle) return
    const hits: string[] = []
    for (let r = 0; r < sheet.rows; r++) {
      for (let c = 0; c < sheet.cols; c++) {
        const key = toCellKey(r, c)
        if ((sheet.cells[key] || '').includes(needle)) hits.push(key)
      }
    }
    if (!hits.length) { alert(`「${needle}」は見つかりませんでした。`); return }
    if (!confirm(`${hits.length} 件を「${replaceText}」に置き換えます。よろしいですか？`)) return
    pushHistory()
    setSheet(prev => {
      const cells = { ...prev.cells }
      hits.forEach(key => { cells[key] = cells[key].split(needle).join(replaceText) })
      const next = { ...prev, cells }
      persistSheet(next)
      return next
    })
  }

  /**
   * 選択範囲を1列目の値で並べ替える。
   * 行ごと入れ替えるので、選択範囲は表全体（見出しを除く）を選んでおく必要がある。
   */
  const sortSelection = (desc: boolean) => {
    if (!selStart || !selEnd) { alert('並べ替える範囲を選択してください。'); return }
    const minR = Math.min(selStart.r, selEnd.r), maxR = Math.max(selStart.r, selEnd.r)
    const minC = Math.min(selStart.c, selEnd.c), maxC = Math.max(selStart.c, selEnd.c)
    if (maxR - minR < 1) { alert('2行以上を選択してください。'); return }

    const rows: string[][] = []
    for (let r = minR; r <= maxR; r++) {
      const values: string[] = []
      for (let c = minC; c <= maxC; c++) values.push(sheet.cells[toCellKey(r, c)] || '')
      rows.push(values)
    }
    const keyOf = (v: string) => {
      const n = Number(v)
      return v !== '' && !Number.isNaN(n) ? n : v
    }
    rows.sort((a, b) => {
      const x = keyOf(a[0]), y = keyOf(b[0])
      if (typeof x === 'number' && typeof y === 'number') return desc ? y - x : x - y
      return desc ? String(y).localeCompare(String(x), 'ja') : String(x).localeCompare(String(y), 'ja')
    })

    pushHistory()
    setSheet(prev => {
      const cells = { ...prev.cells }
      rows.forEach((values, i) => {
        values.forEach((v, j) => {
          const key = toCellKey(minR + i, minC + j)
          if (v === '') delete cells[key]
          else cells[key] = v
        })
      })
      const next = { ...prev, cells }
      persistSheet(next)
      return next
    })
  }

  // ------------------------------------------------------------ セル結合

  /**
   * 選択範囲を1つのセルに結合する。
   * Excel と同じく、残るのは左上のセルの内容だけ。他に文字が入っていたら確認する。
   */
  const mergeSelection = () => {
    if (!selStart || !selEnd) { alert('結合する範囲を選択してください。'); return }
    const r = Math.min(selStart.r, selEnd.r), r2 = Math.max(selStart.r, selEnd.r)
    const c = Math.min(selStart.c, selEnd.c), c2 = Math.max(selStart.c, selEnd.c)
    if (r === r2 && c === c2) { alert('2つ以上のセルを選択してください。'); return }

    // 既存の結合と重なるものは、まとめて解除してから作り直す
    const overlaps = (m: Merge) => !(m.r + m.rs - 1 < r || m.r > r2 || m.c + m.cs - 1 < c || m.c > c2)

    let dropped = 0
    for (let rr = r; rr <= r2; rr++) {
      for (let cc = c; cc <= c2; cc++) {
        if (rr === r && cc === c) continue
        if ((sheet.cells[toCellKey(rr, cc)] || '') !== '') dropped++
      }
    }
    if (dropped > 0 && !confirm(`左上以外の ${dropped} セルの内容は削除されます。よろしいですか？`)) return

    pushHistory()
    setSheet(prev => {
      const cells = { ...prev.cells }
      const formats = { ...(prev.formats || {}) }
      for (let rr = r; rr <= r2; rr++) {
        for (let cc = c; cc <= c2; cc++) {
          if (rr === r && cc === c) continue
          delete cells[toCellKey(rr, cc)]
          delete formats[toCellKey(rr, cc)]
        }
      }
      const merges = [...(prev.merges || []).filter(m => !overlaps(m)), { r, c, rs: r2 - r + 1, cs: c2 - c + 1 }]
      const next = { ...prev, cells, formats, merges }
      persistSheet(next)
      return next
    })
  }

  /** 選択範囲に掛かっている結合を解除する */
  const unmergeSelection = () => {
    const targets = selectedCells()
    if (!targets.length) return
    const hit = (m: Merge) =>
      targets.some(t => t.r >= m.r && t.r < m.r + m.rs && t.c >= m.c && t.c < m.c + m.cs)
    const remaining = (sheet.merges || []).filter(m => !hit(m))
    if (remaining.length === (sheet.merges || []).length) { alert('選択範囲に結合セルがありません。'); return }
    pushHistory()
    setSheet(prev => {
      const next = { ...prev, merges: remaining }
      persistSheet(next)
      return next
    })
  }

  /**
   * 行・列の挿入削除に合わせて結合範囲もずらす。
   * ここを忘れると、行を1つ挿しただけで結合位置が1行ズレる。
   */
  const shiftMerges = (merges: Merge[], axis: 'row' | 'col', target: number, action: 'insert' | 'delete'): Merge[] => {
    const out: Merge[] = []
    for (const m of merges) {
      const start = axis === 'row' ? m.r : m.c
      const span = axis === 'row' ? m.rs : m.cs
      let nextStart = start
      let nextSpan = span
      if (action === 'insert') {
        if (target <= start) nextStart = start + 1
        else if (target < start + span) nextSpan = span + 1 // 結合の内側に挿入 → 広がる
      } else {
        if (target < start) nextStart = start - 1
        else if (target < start + span) nextSpan = span - 1 // 結合の内側を削除 → 縮む
      }
      if (nextSpan < 1) continue // 結合が消滅
      if (nextSpan === 1 && span > 1 && nextSpan === 1) {
        // 1セルになったら結合を解除する（1x1 の結合は意味がない）
        const otherSpan = axis === 'row' ? m.cs : m.rs
        if (otherSpan <= 1) continue
      }
      out.push(
        axis === 'row'
          ? { ...m, r: nextStart, rs: nextSpan }
          : { ...m, c: nextStart, cs: nextSpan },
      )
    }
    return out
  }

  // -------------------------------------------------- 条件付き書式

  /** ルールが1件のセルに当てはまるか。表示中の計算結果で判定する */
  const condMatches = (rule: CondRule, value: number | string): boolean => {
    const num = typeof value === 'number' ? value : Number(value)
    const isNum = !Number.isNaN(num) && String(value).trim() !== ''
    const rv = Number(rule.value)
    const rvIsNum = !Number.isNaN(rv) && rule.value.trim() !== ''
    const text = String(value)

    switch (rule.op) {
      case 'contains': return rule.value !== '' && text.includes(rule.value)
      case 'eq': return rvIsNum && isNum ? num === rv : text === rule.value
      case 'ne': return rvIsNum && isNum ? num !== rv : text !== rule.value
      case 'gt': return isNum && rvIsNum && num > rv
      case 'lt': return isNum && rvIsNum && num < rv
      case 'ge': return isNum && rvIsNum && num >= rv
      case 'le': return isNum && rvIsNum && num <= rv
      case 'between': {
        const rv2 = Number(rule.value2 ?? '')
        if (!isNum || !rvIsNum || Number.isNaN(rv2)) return false
        return num >= Math.min(rv, rv2) && num <= Math.max(rv, rv2)
      }
    }
    return false
  }

  /**
   * セルに適用する最終的な書式。
   * 手動で付けた書式の上に、当てはまった条件付き書式を重ねる（後勝ち）。
   */
  const effectiveFormat = (r: number, c: number, computed: number | string): CellFormat | undefined => {
    const base = sheet.formats?.[toCellKey(r, c)]
    const rules = sheet.condRules || []
    if (!rules.length) return base
    let merged = base
    for (const rule of rules) {
      if (r < Math.min(rule.r1, rule.r2) || r > Math.max(rule.r1, rule.r2)) continue
      if (c < Math.min(rule.c1, rule.c2) || c > Math.max(rule.c1, rule.c2)) continue
      if (!condMatches(rule, computed)) continue
      merged = { ...(merged || {}), ...rule.style }
    }
    return merged
  }

  const addCondRule = (op: CondOp, value: string, value2: string, style: CondRule['style']) => {
    if (!selStart || !selEnd) { alert('条件付き書式を設定する範囲を選択してください。'); return }
    pushHistory()
    setSheet(prev => {
      const rule: CondRule = {
        id: `cr${Date.now()}`,
        r1: Math.min(selStart.r, selEnd.r), r2: Math.max(selStart.r, selEnd.r),
        c1: Math.min(selStart.c, selEnd.c), c2: Math.max(selStart.c, selEnd.c),
        op, value, value2: value2 || undefined, style,
      }
      const next = { ...prev, condRules: [...(prev.condRules || []), rule] }
      persistSheet(next)
      return next
    })
  }

  const removeCondRule = (id: string) => {
    pushHistory()
    setSheet(prev => {
      const next = { ...prev, condRules: (prev.condRules || []).filter(r => r.id !== id) }
      persistSheet(next)
      return next
    })
  }

  /**
   * シートを閲覧専用リンクとして公開する。
   *
   * 元データ（users/{uid}/sheets/*）は本人しか読めないので、
   * 公開用に「その時点の写し」を sheetShares に置く。相手に Excel も
   * アカウントも要らず、こちらがファイルを送る必要もない。
   * 数式ではなく計算結果を書き出すので、計算式は相手に見えない。
   */
  const publishSheet = async () => {
    if (!currentUser) { alert('共有するにはログインが必要です。'); return }
    if (!confirm('このシートを閲覧専用リンクとして公開します。\nリンクを知っている人は誰でも内容を見られます。よろしいですか？')) return
    setSharing(true)
    try {
      // 数式は結果に置き換えて渡す（相手の環境では再計算できないため）
      const cells: Record<string, string> = {}
      for (let r = 0; r < sheet.rows; r++) {
        for (let c = 0; c < sheet.cols; c++) {
          const key = toCellKey(r, c)
          const raw = sheet.cells[key]
          if (!raw) continue
          const shown = raw.startsWith('=') ? evaluateRaw(raw, new Set()) : raw
          const text = typeof shown === 'number' ? formatCellNumber(shown, sheet.formats?.[key]) : String(shown)
          if (text !== '') cells[key] = text
        }
      }

      // 既に公開済みなら同じコードを使い回して上書きする（リンクを配り直さずに済む）
      const code = shareCode || (await generateSheetShareCode())
      await setDoc(doc(db, 'sheetShares', code), {
        owner: currentUser.uid,
        sheetId: currentSheetId,
        name: sheet.name,
        rows: sheet.rows,
        cols: sheet.cols,
        cells,
        formats: sheet.formats || {},
        merges: sheet.merges || [],
        condRules: sheet.condRules || [],
        colWidths,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      setShareCode(code)
      try { localStorage.setItem(`sheetShare:${currentUser.uid}:${currentSheetId}`, code) } catch {}
      const url = `${window.location.origin}/sheet/${code}/`
      try { await navigator.clipboard.writeText(url) } catch {}
      alert(`公開しました。リンクをコピーしました。\n\n${url}`)
    } catch (e) {
      console.error('シートの公開に失敗しました', e)
      alert('公開できませんでした。時間をおいて再度お試しください。')
    } finally {
      setSharing(false)
    }
  }

  /** 未使用の共有コードを作る。衝突したまま書くと他人の公開を上書きしかねない */
  const generateSheetShareCode = async (): Promise<string> => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
    for (let attempt = 0; attempt < 5; attempt++) {
      const bytes = new Uint8Array(10)
      crypto.getRandomValues(bytes)
      let code = ''
      for (let i = 0; i < 10; i++) code += chars[bytes[i] % chars.length]
      const existing = await getDoc(doc(db, 'sheetShares', code))
      if (!existing.exists()) return code
    }
    throw new Error('共有コードの生成に失敗しました')
  }

  /** 公開を取り消す */
  const unpublishSheet = async () => {
    if (!currentUser || !shareCode) return
    if (!confirm('公開を取り消します。配ったリンクは開けなくなります。よろしいですか？')) return
    try {
      await deleteDoc(doc(db, 'sheetShares', shareCode))
      setShareCode(null)
      try { localStorage.removeItem(`sheetShare:${currentUser.uid}:${currentSheetId}`) } catch {}
    } catch (e) {
      console.error('公開の取り消しに失敗しました', e)
      alert('取り消せませんでした。')
    }
  }

  /** 選択範囲の書式をすべて消す */
  const clearFormat = () => {
    const targets = selectedCells()
    if (!targets.length) return
    pushHistory()
    setSheet(prev => {
      const formats = { ...(prev.formats || {}) }
      targets.forEach(({ r, c }) => { delete formats[toCellKey(r, c)] })
      const next = { ...prev, formats }
      persistSheet(next)
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
    const withSeparator = (n: number, d: number) =>
      n.toLocaleString('ja-JP', { minimumFractionDigits: d, maximumFractionDigits: d })
    switch (fmt?.type) {
      case 'percent':
        return `${(val * 100).toFixed(decimals)}%`
      case 'currency':
        return `¥${withSeparator(val, decimals)}`
      case 'number':
        return withSeparator(val, decimals)
      default:
        // 表示形式未指定でも「桁数を増やす／減らす」ボタンは効くようにする
        // （従来は type を設定するまで decimals が無視され、ボタンが壊れて見えた）
        return fmt?.decimals !== undefined ? val.toFixed(decimals) : String(val)
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
      return;
    }
    
    // 現在のキャレット位置を取得（デフォルトは文字列の末尾）
    const caretStart = inputEl.selectionStart ?? currentFormula.length;
    const caretEnd = inputEl.selectionEnd ?? caretStart;
    
    
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
        } else {
        }
      });
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

  // 列幅の初期化。レンダー本体で setState すると余分な再レンダーを誘発するので effect で行う
  useEffect(() => {
    if (colWidths.length < sheet.cols) {
      setColWidths(w => w.concat(Array.from({ length: sheet.cols - w.length }, () => 96)))
    }
  }, [sheet.cols, colWidths.length])

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
  const applySnapshot = (snap: HistorySnapshot) => {
    setSheet(prev => {
      const next: SheetData = {
        ...prev,
        cells: snap.cells,
        formats: snap.formats || {},
        rows: snap.rows ?? prev.rows,
        cols: snap.cols ?? prev.cols,
      };
      // Undo/Redoの結果もサーバへ反映しないと、リロードで元に戻ってしまう
      persistSheet(next);
      return next;
    });
    // 空配列も「列幅が無い状態」として正しい復元先なので length では判定しない
    if (snap.colWidths) setColWidths(snap.colWidths);
  };

  const handleUndo = () => {
    const snap = historyManager.current.undo(currentSnapshot());
    if (snap) applySnapshot(snap);
  };

  const handleRedo = () => {
    const snap = historyManager.current.redo(currentSnapshot());
    if (snap) applySnapshot(snap);
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
    // colWidths も必要。これが無いと Ctrl+Z / Ctrl+Y の中で呼ぶ currentSnapshot() が
    // 「最後に sheet が変わった時点の列幅」を掴んだままになり、
    // 列幅だけ変えた直後の Undo→Redo で幅が巻き戻る。
  }, [currentUser, currentSheetId, sheet, colWidths]);

  // 右クリックメニューのハンドラー
  const handleContextMenu = (e: React.MouseEvent, type: 'row' | 'col' | 'cell', rowIndex?: number, colIndex?: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type, rowIndex, colIndex });
  };

  /**
   * 行・列の挿入／削除に合わせてセルを詰め直す。
   *
   * 従来は「対象の行のセルを消して rows を1減らす」だけだったため、
   * 下の行が上に詰まらず、代わりに最下行が画面から消えてデータが失われて見えた。
   * 挿入も末尾に1行足すだけで、指定位置に入らなかった。
   */
  const shiftCells = <T,>(
    source: Record<string, T>,
    axis: 'row' | 'col',
    target: number,
    action: 'insert' | 'delete'
  ): Record<string, T> => {
    const result: Record<string, T> = {};
    for (const [k, v] of Object.entries(source)) {
      const m = k.match(/^R(\d+)C(\d+)$/);
      if (!m) continue;
      let r = Number(m[1]);
      let c = Number(m[2]);
      const index = axis === 'row' ? r : c;

      if (action === 'delete') {
        if (index === target) continue; // 対象行/列は破棄
        if (index > target) {
          if (axis === 'row') r -= 1;
          else c -= 1;
        }
      } else if (index >= target) {
        if (axis === 'row') r += 1;
        else c += 1;
      }
      result[`R${r}C${c}`] = v;
    }
    return result;
  };

  /**
   * 行・列の挿入削除に合わせて、シート内すべての数式の参照を書き換える。
   *
   * ★これが無いと =SUM(A1:A3) が古い範囲を指したまま残り、
   *   エラーも出さずに違う合計を出し続ける（Excel は自動で追従する）。
   */
  const reindexFormulas = (
    cells: Record<string, string>,
    axis: 'row' | 'col',
    target: number,
    action: 'insert' | 'delete',
  ): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(cells)) {
      out[key] = value.startsWith('=')
        ? formulaEngine.current.adjustFormulaForStructuralChange(value, axis, target, action)
        : value;
    }
    return out;
  };

  const executeContextAction = (action: 'insert' | 'delete') => {
    if (!contextMenu) return;

    const axis: 'row' | 'col' | null =
      contextMenu.type === 'row' && contextMenu.rowIndex !== undefined ? 'row'
      : contextMenu.type === 'col' && contextMenu.colIndex !== undefined ? 'col'
      : null;
    if (!axis) { setContextMenu(null); return; }

    const target = (axis === 'row' ? contextMenu.rowIndex : contextMenu.colIndex) as number;

    if (action === 'delete') {
      const limit = axis === 'row' ? sheet.rows : sheet.cols;
      if (limit <= 1) { setContextMenu(null); return; }
      const hasData = Object.keys(sheet.cells).some(k => {
        const m = k.match(/^R(\d+)C(\d+)$/);
        return m && Number(axis === 'row' ? m[1] : m[2]) === target;
      });
      const label = axis === 'row' ? '行' : '列';
      if (hasData && !window.confirm(`この${label}にデータがあります。削除しますか？`)) {
        setContextMenu(null);
        return;
      }
    }

    pushHistory();

    const delta = action === 'insert' ? 1 : -1;
    setSheet(prev => {
      const next: SheetData = {
        ...prev,
        rows: axis === 'row' ? prev.rows + delta : prev.rows,
        cols: axis === 'col' ? prev.cols + delta : prev.cols,
        // セルの位置を詰め直したあと、数式の中の参照も追従させる
        cells: reindexFormulas(shiftCells(prev.cells, axis, target, action), axis, target, action),
        formats: shiftCells(prev.formats || {}, axis, target, action),
        // 結合範囲もずらす。忘れると行を1つ挿しただけで結合位置がズレる
        merges: shiftMerges(prev.merges || [], axis, target, action),
      };
      persistSheet(next);
      return next;
    });

    if (axis === 'col') {
      setColWidths(prev => {
        const nextWidths = [...prev];
        if (action === 'insert') nextWidths.splice(target, 0, 96);
        else nextWidths.splice(target, 1);
        return nextWidths;
      });
    }

    setContextMenu(null);
  };

  return (
    <div className="bg-white rounded-b-lg shadow-sm border-b border-gray-100 flex flex-col h-full lg:h-[calc(100vh-var(--nav-height))]">
      {/* ヘッダーエリア */}
      <div className="px-4 py-1.5 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div>
          <h3 className="text-[13px] font-medium">表計算</h3>
          <p className="text-[11px] mt-0.5">Excelライクな表計算ツール。数式・関数計算、セル書式設定、Excel形式でのエクスポートに対応</p>
        </div>
      </div>
      {/* 帯は左右いっぱい、その下の本文だけ他ツールと同じ左右余白を付ける。 */}
      <div className="flex-1 min-h-0 overflow-hidden px-4" onMouseUp={handleMouseUp} onClick={() => setContextMenu(null)}>
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
            pushHistory();
            setSheet(prev => {
              const next: SheetData = {
                ...prev,
                rows: prev.rows - 1,
                cells: reindexFormulas(shiftCells(prev.cells, 'row', target, 'delete'), 'row', target, 'delete'),
                formats: shiftCells(prev.formats || {}, 'row', target, 'delete'),
                merges: shiftMerges(prev.merges || [], 'row', target, 'delete'),
              }
              persistSheet(next)
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
            pushHistory();
            setSheet(prev => {
              const next: SheetData = {
                ...prev,
                cols: prev.cols - 1,
                cells: reindexFormulas(shiftCells(prev.cells, 'col', target, 'delete'), 'col', target, 'delete'),
                formats: shiftCells(prev.formats || {}, 'col', target, 'delete'),
                merges: shiftMerges(prev.merges || [], 'col', target, 'delete'),
              }
              persistSheet(next)
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
          <button type="button" className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50" onClick={exportCsv}>CSV出力</button>
          <button type="button" className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50" onClick={exportExcel}>Excel出力</button>
          <button
            type="button"
            className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50"
            onClick={() => importInputRef.current?.click()}
          >Excel/CSV取込</button>
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,text/csv"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = '' // 同じファイルを続けて選べるようにする
              if (file) await importFile(file)
            }}
          />
          <button type="button" className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50" onClick={() => window.print()}>印刷</button>
          <button
            type="button"
            disabled={sharing}
            className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
            title="閲覧専用リンクを作る。相手にアカウントもExcelも要りません"
            onClick={publishSheet}
          >{sharing ? '公開中...' : shareCode ? '公開を更新' : '共有リンク'}</button>
          {shareCode && (
            <>
              <a
                href={`/sheet/${shareCode}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50 text-blue-600"
              >公開ページを開く</a>
              <button type="button" className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50 text-red-600" onClick={unpublishSheet}>公開停止</button>
            </>
          )}
        </div>
      </div>

      {/* 書式ツールバー（罫線・色・サイズ・折り返し） */}
      <div className="flex items-center gap-1 flex-wrap mb-2 text-xs">
        <span className="text-gray-500 mr-1">罫線</span>
        <button type="button" title="外枠" className="px-2 py-1 rounded border bg-white hover:bg-gray-50" onClick={applyOuterBorder}>外枠</button>
        <button type="button" title="格子（すべての辺）" className="px-2 py-1 rounded border bg-white hover:bg-gray-50"
          onClick={() => applyFormat({ border: { top: true, right: true, bottom: true, left: true } })}>格子</button>
        <button type="button" title="下罫線" className="px-2 py-1 rounded border bg-white hover:bg-gray-50"
          onClick={() => applyFormat({ border: { bottom: true } })}>下線</button>
        <button type="button" title="罫線を消す" className="px-2 py-1 rounded border bg-white hover:bg-gray-50"
          onClick={() => applyFormat({ border: { top: false, right: false, bottom: false, left: false } })}>なし</button>

        <span className="text-gray-500 ml-3 mr-1">色</span>
        <label className="flex items-center gap-1 px-1 py-0.5 rounded border bg-white" title="背景色">
          <span className="text-[10px] text-gray-500">背景</span>
          <input type="color" className="w-6 h-5 cursor-pointer" defaultValue="#fff7cc"
            onChange={(e) => applyFormat({ bg: e.target.value })} />
        </label>
        <label className="flex items-center gap-1 px-1 py-0.5 rounded border bg-white" title="文字色">
          <span className="text-[10px] text-gray-500">文字</span>
          <input type="color" className="w-6 h-5 cursor-pointer" defaultValue="#c00000"
            onChange={(e) => applyFormat({ color: e.target.value })} />
        </label>

        <span className="text-gray-500 ml-3 mr-1">文字</span>
        <button type="button" title="斜体" className="px-2 py-1 rounded border bg-white hover:bg-gray-50 italic"
          onClick={() => applyFormat({ italic: true })}>I</button>
        <select className="px-1 py-1 rounded border bg-white" defaultValue="" title="文字サイズ"
          onChange={(e) => { if (e.target.value) applyFormat({ fontSize: Number(e.target.value) }) }}>
          <option value="">サイズ</option>
          {[10, 11, 12, 14, 16, 18, 24].map(s => <option key={s} value={s}>{s}px</option>)}
        </select>
        <button type="button" title="折り返して全体を表示" className="px-2 py-1 rounded border bg-white hover:bg-gray-50"
          onClick={() => applyFormat({ wrap: true })}>折返</button>
        <button type="button" title="書式をすべて消す" className="px-2 py-1 rounded border bg-white hover:bg-gray-50"
          onClick={clearFormat}>書式解除</button>

        <span className="text-gray-500 ml-3 mr-1">結合</span>
        <button type="button" title="選択範囲を1つのセルに結合する" className="px-2 py-1 rounded border bg-white hover:bg-gray-50"
          onClick={mergeSelection}>セル結合</button>
        <button type="button" title="結合を解除する" className="px-2 py-1 rounded border bg-white hover:bg-gray-50"
          onClick={unmergeSelection}>結合解除</button>
        <button type="button" title="選択範囲に条件付き書式を設定する" className="px-2 py-1 rounded border bg-white hover:bg-gray-50 ml-3"
          onClick={() => setCondOpen(v => !v)}>条件付き書式</button>

        <span className="text-gray-500 ml-3 mr-1">並べ替え</span>
        <button type="button" title="選択範囲を1列目の昇順で並べ替え" className="px-2 py-1 rounded border bg-white hover:bg-gray-50"
          onClick={() => sortSelection(false)}>昇順</button>
        <button type="button" title="選択範囲を1列目の降順で並べ替え" className="px-2 py-1 rounded border bg-white hover:bg-gray-50"
          onClick={() => sortSelection(true)}>降順</button>

        <button type="button" className="px-2 py-1 rounded border bg-white hover:bg-gray-50 ml-3"
          onClick={() => setFindOpen(v => !v)}>検索・置換</button>

        {/* 保存状態。以前はここが無く、保存に失敗しても気づけなかった */}
        <span className="ml-auto flex items-center gap-2">
          {docBytes > 700_000 && (
            <span className="text-amber-700" title="Firestore の1シート上限は約1MBです">
              容量 {Math.round(docBytes / 1024)}KB / 1024KB
            </span>
          )}
          {saveState === 'saving' && <span className="text-gray-400">保存中...</span>}
          {saveState === 'saved' && <span className="text-gray-400">保存しました</span>}
          {saveState === 'error' && <span className="text-red-600 font-semibold">{saveError}</span>}
        </span>
      </div>

      {condOpen && (
        <div className="mb-2 text-xs bg-gray-50 border rounded p-2 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-600">選択範囲が</span>
            <select value={condOp} onChange={(e) => setCondOp(e.target.value as CondOp)} className="px-2 py-1 border rounded">
              <option value="gt">より大きい</option>
              <option value="ge">以上</option>
              <option value="lt">より小さい</option>
              <option value="le">以下</option>
              <option value="eq">等しい</option>
              <option value="ne">等しくない</option>
              <option value="between">の範囲内</option>
              <option value="contains">文字を含む</option>
            </select>
            <input value={condValue} onChange={(e) => setCondValue(e.target.value)} placeholder="値"
              className="px-2 py-1 border rounded w-24" />
            {condOp === 'between' && (
              <input value={condValue2} onChange={(e) => setCondValue2(e.target.value)} placeholder="〜"
                className="px-2 py-1 border rounded w-24" />
            )}
            <span className="text-gray-600">とき</span>
            <label className="flex items-center gap-1 px-1 py-0.5 rounded border bg-white">
              <span className="text-[10px] text-gray-500">背景</span>
              <input type="color" value={condBg} onChange={(e) => setCondBg(e.target.value)} className="w-6 h-5" />
            </label>
            <label className="flex items-center gap-1 px-1 py-0.5 rounded border bg-white">
              <span className="text-[10px] text-gray-500">文字</span>
              <input type="color" value={condColor} onChange={(e) => setCondColor(e.target.value)} className="w-6 h-5" />
            </label>
            <label className="flex items-center gap-1 text-gray-600">
              <input type="checkbox" checked={condBold} onChange={(e) => setCondBold(e.target.checked)} />太字
            </label>
            <button type="button" className="px-2 py-1 rounded border bg-white hover:bg-gray-50"
              onClick={() => addCondRule(condOp, condValue, condValue2, { bg: condBg, color: condColor, bold: condBold || undefined })}>
              追加
            </button>
            <button type="button" className="px-2 py-1 rounded border bg-white hover:bg-gray-50 ml-auto"
              onClick={() => setCondOpen(false)}>閉じる</button>
          </div>
          {(sheet.condRules || []).length > 0 && (
            <ul className="space-y-1">
              {(sheet.condRules || []).map(rule => (
                <li key={rule.id} className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded border" style={{ backgroundColor: rule.style.bg, color: rule.style.color, fontWeight: rule.style.bold ? 700 : undefined }}>
                    {rcToAddress(Math.min(rule.r1, rule.r2), Math.min(rule.c1, rule.c2))}:
                    {rcToAddress(Math.max(rule.r1, rule.r2), Math.max(rule.c1, rule.c2))}
                  </span>
                  <span className="text-gray-600">
                    {COND_OP_LABEL[rule.op]} {rule.value}{rule.op === 'between' ? ` 〜 ${rule.value2 ?? ''}` : ''}
                  </span>
                  <button type="button" className="text-red-600 hover:underline" onClick={() => removeCondRule(rule.id)}>削除</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {findOpen && (
        <div className="flex items-center gap-2 mb-2 text-xs bg-gray-50 border rounded p-2">
          <input value={findText} onChange={(e) => setFindText(e.target.value)} placeholder="検索する文字列"
            className="px-2 py-1 border rounded" />
          <input value={replaceText} onChange={(e) => setReplaceText(e.target.value)} placeholder="置換後"
            className="px-2 py-1 border rounded" />
          <button type="button" className="px-2 py-1 rounded border bg-white hover:bg-gray-50" onClick={() => findNext()}>次を検索</button>
          <button type="button" className="px-2 py-1 rounded border bg-white hover:bg-gray-50" onClick={() => replaceAll()}>すべて置換</button>
          <button type="button" className="px-2 py-1 rounded border bg-white hover:bg-gray-50 ml-auto" onClick={() => setFindOpen(false)}>閉じる</button>
        </div>
      )}
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
          // コピー元の位置を覚えておく。同じ内容を貼り付けたときに、
          // Excel と同じく相対参照を移動量ぶんずらすために使う
          copySourceRef.current = { r: minR, c: minC, text }
          try { void navigator.clipboard.writeText(text) } catch {}
          return
        }
        // Ctrl+Z / Ctrl+Y は window 側のリスナーで処理する。
        // ここでも処理すると1回の押下で2回Undoが走ってしまうため、あえて何もしない。

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
            pushHistory();
            setSheet(prev => {
              const cells = { ...prev.cells }
              const formats = { ...(prev.formats || {}) }
              targets.forEach(({ r, c }) => {
                delete cells[toCellKey(r, c)]
                if (formats[toCellKey(r, c)]) delete formats[toCellKey(r, c)]
              })
              const next = { ...prev, cells, formats }
              persistSheet(next)
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
          merges={sheet.merges}
          effectiveFormat={effectiveFormat}
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
            const pastedRows = text.replace(/\r/g, '').split('\n').filter(Boolean);
            const grid = pastedRows.map(row => row.split('\t'));
            // 貼り付けもUndo対象にする
            pushHistory();
            setSheet(prev => {
              // 貼り付け先がグリッドをはみ出す場合は行・列を広げる（従来は黙って切り捨てていた）
              const neededRows = Math.max(prev.rows, r + grid.length);
              const neededCols = Math.max(prev.cols, c + Math.max(...grid.map(g => g.length)));
              const next: SheetData = {
                ...prev,
                rows: neededRows,
                cols: neededCols,
                cells: { ...prev.cells },
              };
              // このツール内でコピーした内容をそのまま貼るときは、
              // Excel と同じく相対参照を移動量ぶんずらす。
              // 外部からのテキスト貼り付けでは書き換えない（Excel の text 貼り付けも同じ）。
              const src = copySourceRef.current;
              const isInternalCopy = src !== null && src.text === text;
              const rowOffset = isInternalCopy ? r - src!.r : 0;
              const colOffset = isInternalCopy ? c - src!.c : 0;

              grid.forEach((rowVals, rr) => {
                rowVals.forEach((val, cc) => {
                  const shifted =
                    isInternalCopy && val.startsWith('=') && (rowOffset !== 0 || colOffset !== 0)
                      ? formulaEngine.current.adjustFormula(val, rowOffset, colOffset)
                      : val;
                  next.cells[toCellKey(r + rr, c + cc)] = shifted;
                });
              });
              // ここで formats を渡し忘れると setDoc がドキュメントを置き換えて書式が全消しになる
              persistSheet(next);
              return next;
            });
            if (c + Math.max(...grid.map(g => g.length)) > colWidths.length) {
              setColWidths(prev => {
                const needed = c + Math.max(...grid.map(g => g.length));
                return prev.length >= needed ? prev : prev.concat(Array.from({ length: needed - prev.length }, () => 96));
              });
            }
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

