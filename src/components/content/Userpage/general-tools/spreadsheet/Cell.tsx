'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';

interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  type?: 'text' | 'number' | 'percent' | 'currency';
  decimals?: number;
  /** 罫線。見積書や拾い出し表の体裁に必須 */
  border?: { top?: boolean; right?: boolean; bottom?: boolean; left?: boolean };
  /** 背景色・文字色（CSSの色文字列） */
  bg?: string;
  color?: string;
  fontSize?: number;
  /** 折り返して全体を表示 */
  wrap?: boolean;
}

const BORDER = '1px solid #6b7280';

/** 書式からセルの見た目を組み立てる。編集中の input と表示用 div の両方で使う。 */
export function formatToStyle(format?: CellFormat): React.CSSProperties {
  if (!format) return {};
  const s: React.CSSProperties = {};
  if (format.bg) s.backgroundColor = format.bg;
  if (format.color) s.color = format.color;
  if (format.fontSize) s.fontSize = `${format.fontSize}px`;
  if (format.italic) s.fontStyle = 'italic';
  if (format.border) {
    if (format.border.top) s.borderTop = BORDER;
    if (format.border.right) s.borderRight = BORDER;
    if (format.border.bottom) s.borderBottom = BORDER;
    if (format.border.left) s.borderLeft = BORDER;
  }
  return s;
}

interface CellProps {
  row: number;
  col: number;
  cellKey: string;
  raw: string;
  computed: number | string;
  format?: CellFormat;
  isEditing: boolean;
  isActive: boolean;
  isSelected: boolean;
  isInSelectionRange: boolean;
  isFormulaReference?: boolean;
  formulaReferenceColor?: string;
  selectionEdge?: {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
  };
  isFillHandleVisible?: boolean;
  onFillStart?: (e: React.MouseEvent) => void;
  colWidth: number;
  /** 結合セルの左上に付ける span。結合していないときは undefined */
  rowSpan?: number;
  colSpan?: number;
  onStartEdit: () => void;
  onEndEdit: (value: string) => void;
  onCancelEdit: () => void;
  onSelect: () => void;
  onStartDrag: (e?: React.MouseEvent) => void;
  onDragEnter: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  formatCellNumber: (val: number, fmt?: CellFormat) => string;
  /** 以前は未ログインだと編集させなかった。今は誰でも編集できる（互換のため受け取るだけ） */
  isLoggedIn?: boolean;
  isFormulaEditing?: boolean; // 数式バーで編集中かどうか
  onContextMenu?: (e: React.MouseEvent) => void;
  /** 編集中の下書き（数式バーと同じ値）。編集を始めた瞬間の中身と、数式バー側で打った内容の反映に使う */
  draft?: string;
  /** セル内で打った内容を数式バーへ写す */
  onDraftChange?: (value: string) => void;
}

const Cell: React.FC<CellProps> = ({
  row,
  col,
  cellKey,
  raw,
  computed,
  format,
  isEditing,
  isActive,
  isSelected,
  isInSelectionRange,
  isFormulaReference = false,
  formulaReferenceColor,
  selectionEdge,
  colWidth,
  rowSpan,
  colSpan,
  onStartEdit,
  onEndEdit,
  onCancelEdit,
  onSelect,
  onStartDrag,
  onDragEnter,
  onKeyDown,
  onPaste,
  isFillHandleVisible,
  onFillStart,
  formatCellNumber,
  isFormulaEditing = false,
  onContextMenu,
  draft,
  onDraftChange,
}) => {
  const [localValue, setLocalValue] = useState(raw);
  const inputRef = useRef<HTMLInputElement>(null);
  /** 確定・取り消しを済ませたか。済んだあとのフォーカス移動（blur）で二重に確定しないため */
  const doneRef = useRef(false);

  /**
   * 編集モードに入った瞬間に、下書き（打ち始めた 1 文字、または今の中身）を入れる。
   * ★以前は select() で全選択していたため、文字を打って編集を始めると 1 文字目が 2 文字目で
   *   上書きされて消えていた（「123」が「23」になる）。描画中に決めるので、入力欄は最初から正しい値で出る。
   */
  const [prevEditing, setPrevEditing] = useState(isEditing);
  if (prevEditing !== isEditing) {
    setPrevEditing(isEditing);
    if (isEditing) setLocalValue(draft ?? raw);
  }

  // 入力欄にフォーカスし、キャレットを末尾へ。数式バーを押して編集を始めたときはフォーカスを奪わない
  useLayoutEffect(() => {
    if (!isEditing) return;
    doneRef.current = false;
    const el = inputRef.current;
    if (!el) return;
    if ((document.activeElement as HTMLElement | null)?.closest?.('.formula-bar')) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [isEditing]);

  // 編集していないときは中身に合わせる。数式バーで打っている間（入力欄にフォーカスが無い）は数式バーの下書きを映す
  useEffect(() => {
    if (!isEditing) setLocalValue(raw);
    else if (draft !== undefined && document.activeElement !== inputRef.current) setLocalValue(draft);
  }, [raw, isEditing, draft]);

  const displayValue = isEditing
    ? localValue
    : typeof computed === 'number'
    ? formatCellNumber(computed, format)
    : String(computed);

  const handleDoubleClick = () => {
    // ダブルクリックで編集モードに入る（数式セルも含む）
    onStartEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTableCellElement>) => {
    if (isEditing) {
      // 編集モード中のキー操作。
      // ★処理したキーは親へ伝えない。以前は入力欄と td の両方でこの関数が動き、
      //   さらにグリッドにも伝わって、1 回の Enter で確定と移動が 2 回ずつ走っていた。
      if (e.nativeEvent.isComposing) return; // 日本語変換中の Enter は確定に使わない
      if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        // 確定して移動（Enter=下 / Shift+Enter=上 / Tab=右 / Shift+Tab=左 / ↑↓）
        e.preventDefault();
        e.stopPropagation();
        doneRef.current = true;
        onEndEdit(localValue);
        onKeyDown(e);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setLocalValue(raw);
        doneRef.current = true;
        onCancelEdit();
      }
    } else {
      // 非編集モード中のキー操作
      // ESCキーで編集モードを解除（グリッドレベルで処理されるが、念のため）
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // 矢印キーでセル移動（画面スクロールを防ぐ）
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        onKeyDown(e);
        return;
      }
      // F2 で編集開始（Excel と同じ。Enter は下へ移動＝親が処理）
      if (e.key === 'F2') {
        e.preventDefault();
        e.stopPropagation();
        onStartEdit();
      } else {
        onKeyDown(e);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    onDraftChange?.(e.target.value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Enter・Tab・Esc で済ませたあとのフォーカス移動では何もしない（二重確定を防ぐ）
    if (doneRef.current) return;
    // 数式バーへ移ったときは、そこで続けて編集するので確定しない（中身は下書きとして共有している）
    if ((e.relatedTarget as HTMLElement | null)?.closest?.('.formula-bar')) return;
    // 数式バーで編集中の場合は、セルクリックで参照を挿入するため、onBlurを無視
    if (isFormulaEditing) {
      // 数式バーの入力フィールドにフォーカスが移った場合は無視
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (relatedTarget && relatedTarget.closest('.formula-bar')) {
        return;
      }
      // 他のセルをクリックした場合も、数式編集中は編集を確定しない
      return;
    }
    if (isEditing) {
      doneRef.current = true;
      onEndEdit(localValue);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (onPaste) {
      onPaste(e);
    }
  };

  // セルのスタイル（書式＝罫線・背景色・文字色などをここで反映する）
  const cellStyle: React.CSSProperties = {
    // 横に結合しているセルに単一列ぶんの幅を指定すると列幅の計算が壊れるので、
    // colSpan があるときは幅指定を外してブラウザに任せる
    width: colSpan && colSpan > 1 ? undefined : colWidth,
    position: 'relative',
    ...formatToStyle(format),
  };

  // 選択範囲のスタイル（数式参照でない場合のみ）
  // ★重要: outlineを使うことで、周囲のレイアウトを押し出さない（ガタつき防止）
  const selectionStyle: React.CSSProperties = isInSelectionRange && !isFormulaReference ? {
    backgroundColor: 'rgba(29, 173, 149, 0.1)', // #1DAD95 の薄い色
  } : {};

  // アクティブセルのスタイル
  // ★重要: outlineを使うことで、セルのサイズが1pxも変わらないため、行の高さがズレない
  const activeStyle: React.CSSProperties = isActive && !isInSelectionRange && !isFormulaReference ? {
    outline: '2px solid #1DAD95', // ご指定の色
    outlineOffset: '-2px', // 内側に枠線を描く
    zIndex: 10, // 隣のセルより手前に表示
  } : {};

  // 数式参照セルのスタイル（色付き）- 必ず適用（最優先）
  const formulaRefStyle: React.CSSProperties = isFormulaReference && formulaReferenceColor ? {
    backgroundColor: `${formulaReferenceColor}33`, // 20% opacity (33 in hex = ~20%)
    outline: `2px dashed ${formulaReferenceColor}`,
    outlineOffset: '-2px',
    zIndex: 20, // アクティブセルより前面に表示
    position: 'relative',
  } : {};

  // スタイルのマージ（優先順位: formulaRefStyle > selectionStyle > activeStyle > cellStyle）
  const mergedStyle: React.CSSProperties = isFormulaReference && formulaReferenceColor ? {
    ...cellStyle,
    ...formulaRefStyle, // 数式参照の場合は優先
  } : {
    ...cellStyle,
    ...selectionStyle,
    ...activeStyle,
  };

  // クラス名の構築（borderは条件付きで適用）
  const cellClassName = `p-0 relative ${
    !isInSelectionRange && !isFormulaReference ? 'border' : ''
  } ${
    isInSelectionRange && !isFormulaReference ? 'bg-blue-50' : ''
  }`;

  return (
    <td
      key={cellKey}
      data-cell={cellKey}
      className={cellClassName}
      rowSpan={rowSpan}
      colSpan={colSpan}
      style={mergedStyle}
      onMouseDown={(e) => {
        // ★ バグ修正: ここでイベントの伝播を止める
        // これにより、親のGridやSpreadsheetの「背景クリック判定」が発火しなくなる
        e.stopPropagation();
        
        if (e.button === 0) {
          // 数式編集中の場合は、onBlurが発火しないように先に処理
          if (isFormulaEditing) {
            e.preventDefault();
            // 数式編集中でもonStartDragを呼び出す（セル参照挿入のため）
            onStartDrag(e);
            return;
          }
          // 左クリックのみ
          onStartDrag(e);
        }
      }}
      onMouseEnter={(e) => {
        // マウスボタンが押されている場合のみonDragEnterを呼び出す
        // e.buttons: 0=ボタンなし, 1=左ボタン, 2=右ボタン, 4=中ボタン
        if (e.buttons === 1) {
          onDragEnter();
        }
      }}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onContextMenu={onContextMenu}
      tabIndex={isActive ? 0 : -1}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          id={`cell-${row}-${col}`}
          className={`w-full h-7 px-2 outline-none ${
            format?.bold ? 'font-bold' : ''
          } ${
            format?.align === 'center'
              ? 'text-center'
              : format?.align === 'right'
              ? 'text-right'
              : 'text-left'
          }`}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onMouseDown={(e) => e.stopPropagation()} // Input内のクリックも伝播させない
        />
      ) : (
        <div
          className={`w-full ${format?.wrap ? 'min-h-7' : 'h-7'} px-2 flex items-center select-none relative ${
            format?.bold ? 'font-bold' : ''
          } ${
            format?.align === 'center'
              ? 'justify-center'
              : format?.align === 'right'
              ? 'justify-end'
              : 'justify-start'
          }`}
          onClick={(e) => {
            // 数式編集中の場合はonClickを無効化（onMouseDownで処理済み）
            if (isFormulaEditing) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            // シングルクリックでは編集モードに入らない（onSelectのみ呼ぶ）
            // 編集モードに入るのは：ダブルクリック（handleDoubleClick）または数式バーをクリックした時のみ
            onSelect();
          }}
        >
          <span className={format?.wrap ? 'w-full whitespace-pre-wrap break-words py-1' : 'truncate w-full'}>
            {/* ★重要: 空の場合でも高さを確保するために &nbsp; を表示 */}
            {(displayValue === '' || displayValue === null || displayValue === undefined) 
              ? '\u00A0' 
              : displayValue}
          </span>
          {/* オートフィルハンドル */}
          {isFillHandleVisible && onFillStart && (
            <div
              className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-crosshair hover:bg-blue-600 border border-white"
              style={{ transform: 'translate(50%, 50%)' }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onFillStart(e);
              }}
            />
          )}
        </div>
      )}
    </td>
  );
};

export default Cell;

