'use client';

import React, { useState, useRef, useEffect } from 'react';

interface CellFormat {
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  type?: 'text' | 'number' | 'percent' | 'currency';
  decimals?: number;
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
  onStartEdit: () => void;
  onEndEdit: (value: string) => void;
  onCancelEdit: () => void;
  onSelect: () => void;
  onStartDrag: (e?: React.MouseEvent) => void;
  onDragEnter: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  formatCellNumber: (val: number, fmt?: CellFormat) => string;
  isLoggedIn: boolean;
  isFormulaEditing?: boolean; // 数式バーで編集中かどうか
  onContextMenu?: (e: React.MouseEvent) => void;
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
  isLoggedIn,
  isFormulaEditing = false,
  onContextMenu,
}) => {
  const [localValue, setLocalValue] = useState(raw);
  const inputRef = useRef<HTMLInputElement>(null);

  // 編集モードに入ったら入力フィールドにフォーカス
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // rawが変更されたらlocalValueも更新（外部からの変更に対応）
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(raw);
    }
  }, [raw, isEditing]);

  const displayValue = isEditing
    ? localValue
    : typeof computed === 'number'
    ? formatCellNumber(computed, format)
    : String(computed);

  const handleDoubleClick = () => {
    if (!isLoggedIn) {
      alert('入力するには会員登録（無料）が必要です。');
      return;
    }
    // ダブルクリックで編集モードに入る（数式セルも含む）
    onStartEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTableCellElement>) => {
    if (isEditing) {
      // 編集モード中のキー操作
      if (e.key === 'Enter') {
        e.preventDefault();
        onEndEdit(localValue);
        // Enter押下後は下のセルに移動（Shift+Enterで上のセル）
        const nextRow = e.shiftKey ? row - 1 : row + 1;
        if (nextRow >= 0) {
          // 次のセルへの移動は親コンポーネントで処理
          onKeyDown(e);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setLocalValue(raw);
        onCancelEdit();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        onEndEdit(localValue);
        onKeyDown(e);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        // 編集中の上下矢印キーは編集を確定して移動
        e.preventDefault();
        onEndEdit(localValue);
        onKeyDown(e);
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
      // Enterキーで編集開始（ただし、数式が入っているセルは編集モードに入らない）
      if (e.key === 'Enter' || e.key === 'F2') {
        e.preventDefault();
        // 数式が入っているセルは編集モードに入らない（ダブルクリックまたは数式バーからのみ編集可能）
        const isFormula = raw.trim().startsWith('=');
        if (isLoggedIn && !isFormula) {
          onStartEdit();
        } else {
          // 数式の場合は親コンポーネントに処理を委譲（セル移動など）
          onKeyDown(e);
        }
      } else {
        onKeyDown(e);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
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
      onEndEdit(localValue);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (onPaste) {
      onPaste(e);
    }
  };

  // セルのスタイル
  const cellStyle: React.CSSProperties = {
    width: colWidth,
    position: 'relative',
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
      className={cellClassName}
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
          className={`w-full h-7 px-2 flex items-center select-none relative ${
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
          <span className="truncate w-full">
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

