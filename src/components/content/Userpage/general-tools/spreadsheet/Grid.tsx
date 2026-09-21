'use client';

import React from 'react';
import Cell from './Cell';

interface CellFormat {
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  type?: 'text' | 'number' | 'percent' | 'currency';
  decimals?: number;
}

interface GridProps {
  rows: number;
  cols: number;
  cells: Record<string, string>;
  formats?: Record<string, CellFormat>;
  /** 結合セル。左上（アンカー）以外は描画しない */
  merges?: { r: number; c: number; rs: number; cs: number }[];
  /** 手動書式に条件付き書式を重ねた、最終的な書式を返す */
  effectiveFormat?: (r: number, c: number, computed: number | string) => CellFormat | undefined;
  colWidths: number[];
  editingCellKey: string | null;
  activeCellKey: string | null;
  selStart: { r: number; c: number } | null;
  selEnd: { r: number; c: number } | null;
  evalCacheRef: React.MutableRefObject<Map<string, number | string>>;
  evaluateRaw: (raw: string, visited: Set<string>) => number | string;
  formatCellNumber: (val: number, fmt?: CellFormat) => string;
  toCellKey: (r: number, c: number) => string;
  rcToAddress: (r: number, c: number) => string;
  keyToRC: (key: string) => { r: number; c: number } | null;
  onStartEdit: (key: string, raw: string) => void;
  onEndEdit: (r: number, c: number, value: string) => void;
  onCancelEdit: (raw: string) => void;
  onSelect: () => void;
  onStartDrag: (r: number, c: number, e?: React.MouseEvent) => void;
  onDragEnter: (r: number, c: number) => void;
  onKeyDown: (r: number, c: number, key: string, e: React.KeyboardEvent) => void;
  onPaste: (r: number, c: number, e: React.ClipboardEvent<HTMLInputElement>) => void;
  isSelecting?: boolean;
  isFilling?: boolean;
  fillOrigin?: { start: { r: number; c: number }; end: { r: number; c: number } } | null;
  fillTarget?: { start: { r: number; c: number }; end: { r: number; c: number } } | null;
  onFillStart?: (r: number, c: number, e: React.MouseEvent) => void;
  isLoggedIn: boolean;
  gridRef: React.RefObject<HTMLDivElement | null>;
  isFormulaEditing?: boolean;
  formulaReferenceCells?: Map<string, { r: number; c: number; color: string }>;
  onContextMenu?: (e: React.MouseEvent, type: 'row' | 'col' | 'cell', r?: number, c?: number) => void;
}

const Grid: React.FC<GridProps> = ({
  rows,
  cols,
  cells,
  formats,
  merges,
  effectiveFormat,
  colWidths,
  editingCellKey,
  activeCellKey,
  selStart,
  selEnd,
  evalCacheRef,
  evaluateRaw,
  formatCellNumber,
  toCellKey,
  rcToAddress,
  keyToRC,
  onStartEdit,
  onEndEdit,
  onCancelEdit,
  onSelect,
  onStartDrag,
  onDragEnter,
  onKeyDown,
  onPaste,
  isSelecting,
  isFilling,
  fillOrigin,
  fillTarget,
  onFillStart,
  isLoggedIn,
  gridRef,
  isFormulaEditing = false,
  formulaReferenceCells = new Map<string, { r: number; c: number; color: string }>(),
  onContextMenu,
}) => {
  const rowsArray = Array.from({ length: rows }, (_, i) => i);
  const colsArray = Array.from({ length: cols }, (_, i) => i);

  // 再計算キャッシュは「1レンダーにつき1回」クリアする。
  // 以前はセル描画ループの中でクリアしていたためキャッシュが常に空で、
  // 依存の深い数式ほど再帰的に再計算され続けていた。
  evalCacheRef.current = new Map();

  // 結合セルの索引。
  //   anchors: 左上セル → rowSpan/colSpan（td に span を付ける）
  //   covered: 左上以外の被結合セル → そもそも td を描かない
  const mergeAnchors = new Map<string, { rs: number; cs: number }>();
  const covered = new Set<string>();
  (merges || []).forEach(m => {
    mergeAnchors.set(toCellKey(m.r, m.c), { rs: m.rs, cs: m.cs });
    for (let r = m.r; r < m.r + m.rs; r++) {
      for (let c = m.c; c < m.c + m.cs; c++) {
        if (r === m.r && c === m.c) continue;
        covered.add(toCellKey(r, c));
      }
    }
  });

  // 26列を超えても正しい列名を出す（String.fromCharCode(65+c) では Z の次が '[' になる）
  const colName = (index: number): string => {
    let name = '';
    let n = index + 1;
    while (n > 0) {
      const rem = (n - 1) % 26;
      name = String.fromCharCode(65 + rem) + name;
      n = Math.floor((n - 1) / 26);
    }
    return name;
  };

  // 現在選択されている行・列のインデックスを特定
  let activeR = -1;
  let activeC = -1;
  if (activeCellKey) {
    const m = activeCellKey.match(/^R(\d+)C(\d+)$/);
    if (m) {
      activeR = parseInt(m[1], 10);
      activeC = parseInt(m[2], 10);
    }
  }

  // ドラッグ時の自動スクロール処理
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting && !isFilling) return;
    if (!gridRef.current) return;
    
    const container = gridRef.current;
    const rect = container.getBoundingClientRect();
    const edgeThreshold = 20; // 端から20px以内を閾値に
    
    // マウス位置が右端近く
    if (e.clientX > rect.right - edgeThreshold) {
      container.scrollLeft += 20; // 少し右にスクロール
    } else if (e.clientX < rect.left + edgeThreshold) {
      container.scrollLeft -= 20; // 左端近くなら左に
    }
    
    // マウス位置が下端近く
    if (e.clientY > rect.bottom - edgeThreshold) {
      container.scrollTop += 20; // 下方向スクロール
    } else if (e.clientY < rect.top + edgeThreshold) {
      container.scrollTop -= 20; // 上方向スクロール
    }
  };

  return (
    <div 
      ref={gridRef} 
      tabIndex={0} 
      className="overflow-auto"
      onMouseMove={handleMouseMove}
    >
      <table className="min-w-max text-[12px] border-collapse">
        <thead className="bg-gray-100 sticky top-0 z-20">
          <tr>
            {/* 左上の角。行見出し(sticky left)と列見出し(sticky top)の交点なので
                ここも固定しないと横スクロール時に角だけ流れて見出しが重なる */}
            <th className="border px-2 py-1 w-8 sticky left-0 z-30 bg-gray-100"></th>
            {colsArray.map(c => {
              // ★選択列のハイライト判定
              let isSelectedCol = activeC === c;
              if (selStart && selEnd) {
                const minC = Math.min(selStart.c, selEnd.c);
                const maxC = Math.max(selStart.c, selEnd.c);
                if (c >= minC && c <= maxC) isSelectedCol = true;
              }
              
              return (
                <th 
                  key={`h-${c}`} 
                  className={`border px-2 py-1 text-center transition-colors ${
                    isSelectedCol 
                      ? 'bg-green-100 text-green-700 font-bold' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={{ width: colWidths[c] }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (onContextMenu) {
                      onContextMenu(e, 'col', undefined, c);
                    }
                  }}
                >
                  {colName(c)}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rowsArray.map(r => {
            // ★選択行のハイライト判定
            let isSelectedRow = activeR === r;
            if (selStart && selEnd) {
              const minR = Math.min(selStart.r, selEnd.r);
              const maxR = Math.max(selStart.r, selEnd.r);
              if (r >= minR && r <= maxR) isSelectedRow = true;
            }
            
            return (
              <tr key={`r-${r}`}>
                <td 
                  className={`border px-2 py-1 text-center w-8 sticky left-0 z-10 transition-colors ${
                    isSelectedRow 
                      ? 'bg-green-100 text-green-700 font-bold' 
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-200'
                  }`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (onContextMenu) {
                      onContextMenu(e, 'row', r);
                    }
                  }}
                >
                  {r + 1}
                </td>
              {colsArray.map(c => {
                const key = toCellKey(r, c);
                // 結合に飲み込まれたセルは描かない（左上の td が rowSpan/colSpan で覆う）
                if (covered.has(key)) return null;
                const raw = cells[key] || '';
                const computed = evaluateRaw(raw, new Set());
                const fmt = effectiveFormat ? effectiveFormat(r, c, computed) : formats?.[key];
                const span = mergeAnchors.get(key);
                // 選択範囲の見た目
                let inSel = false;
                let edgeTop = false;
                let edgeBottom = false;
                let edgeLeft = false;
                let edgeRight = false;
                if (selStart && selEnd) {
                  const minR = Math.min(selStart.r, selEnd.r);
                  const maxR = Math.max(selStart.r, selEnd.r);
                  const minC = Math.min(selStart.c, selEnd.c);
                  const maxC = Math.max(selStart.c, selEnd.c);
                  inSel = r >= minR && r <= maxR && c >= minC && c <= maxC;
                  if (inSel) {
                    edgeTop = r === minR;
                    edgeBottom = r === maxR;
                    edgeLeft = c === minC;
                    edgeRight = c === maxC;
                  }
                }
                // オートフィルハンドルの表示判定（選択範囲の右下角）
                const isFillHandleVisible = Boolean(
                  selStart && selEnd && 
                  r === Math.max(selStart.r, selEnd.r) && 
                  c === Math.max(selStart.c, selEnd.c) &&
                  !editingCellKey
                );
                // オートフィル対象範囲の判定
                let inFillTarget = false;
                if (isFilling && fillTarget) {
                  const fillMinR = Math.min(fillTarget.start.r, fillTarget.end.r);
                  const fillMaxR = Math.max(fillTarget.start.r, fillTarget.end.r);
                  const fillMinC = Math.min(fillTarget.start.c, fillTarget.end.c);
                  const fillMaxC = Math.max(fillTarget.start.c, fillTarget.end.c);
                  inFillTarget = r >= fillMinR && r <= fillMaxR && c >= fillMinC && c <= fillMaxC;
                }
                // 数式編集中の参照セルの判定（色付き）
                const cellKey = `${r}-${c}`;
                const refCellInfo = formulaReferenceCells?.get(cellKey);
                const isFormulaReference = refCellInfo !== undefined;
                const formulaReferenceColor = refCellInfo?.color;
                return (
                  <Cell
                    key={key}
                    row={r}
                    col={c}
                    cellKey={key}
                    raw={raw}
                    computed={computed}
                    format={fmt}
                    rowSpan={span?.rs}
                    colSpan={span?.cs}
                    isEditing={editingCellKey === key}
                    isActive={activeCellKey === key}
                    isSelected={activeCellKey === key}
                    isInSelectionRange={inSel || inFillTarget}
                    isFormulaReference={isFormulaReference || false}
                    formulaReferenceColor={formulaReferenceColor}
                    selectionEdge={inSel ? { top: edgeTop, bottom: edgeBottom, left: edgeLeft, right: edgeRight } : undefined}
                    isFillHandleVisible={isFillHandleVisible}
                    onFillStart={onFillStart ? (e) => onFillStart(r, c, e) : undefined}
                    colWidth={colWidths[c]}
                    onStartEdit={() => onStartEdit(key, raw)}
                    onEndEdit={(value) => onEndEdit(r, c, value)}
                    onCancelEdit={() => onCancelEdit(raw)}
                    onSelect={onSelect}
                    onStartDrag={(e) => onStartDrag(r, c, e)}
                    onDragEnter={() => onDragEnter(r, c)}
                    onKeyDown={(e) => onKeyDown(r, c, key, e)}
                    onPaste={(e) => onPaste(r, c, e)}
                    formatCellNumber={formatCellNumber}
                    isLoggedIn={isLoggedIn}
                    isFormulaEditing={isFormulaEditing}
                    onContextMenu={onContextMenu ? (e) => onContextMenu(e, 'cell', r, c) : undefined}
                  />
                );
              })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Grid;

