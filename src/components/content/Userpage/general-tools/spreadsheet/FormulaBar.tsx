'use client';

import React, { useState, useRef, useEffect } from 'react';
import FormulaSuggestions from './FormulaSuggestions';
import FormulaSyntaxHint from './FormulaSyntaxHint';

interface FormulaBarProps {
  cellAddress: string;
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
  onFormulaBarFocus?: () => void;
}

// 既知の関数名リスト
const knownFunctions = [
  'SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'IF', 'ROUND', 
  'TODAY', 'NOW', 'ABS', 'SUMIF', 'COUNTIF', 'VLOOKUP', 
  'HLOOKUP', 'INDEX', 'MATCH', 'CONCATENATE', 'LEFT', 'RIGHT', 'MID'
];

const FormulaBar: React.FC<FormulaBarProps> = ({
  cellAddress,
  value,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
  inputRef: externalInputRef,
  onFormulaBarFocus,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorIndex, setCursorIndex] = useState(0);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef || internalInputRef;
  const containerRef = useRef<HTMLDivElement>(null);

  // 数式入力時の関数候補を更新
  useEffect(() => {
    if (value.startsWith('=')) {
      const input = value.slice(1).toUpperCase(); // '='除去、大文字化
      if (input.length > 0) {
        const matches = knownFunctions.filter(fn => fn.startsWith(input));
        setSuggestions(matches);
        setShowSuggestions(matches.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [value]);

  const handleSelectSuggestion = (fnName: string) => {
    if (!value.startsWith('=')) {
      onChange('=' + fnName + '(');
    } else {
      const typed = value.slice(1); // '='を除いた現在の入力
      // 部分入力を関数名で置き換え、括弧を追加
      onChange('=' + fnName + '(');
    }
    setShowSuggestions(false);
    // カーソル位置を更新
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      if (inputRef.current) {
        const newCursorPos = `=${fnName}(`.length;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        setCursorIndex(newCursorPos);
      }
    });
  };

  const getSuggestionPosition = () => {
    if (!containerRef.current || !inputRef.current) {
      return { top: 0, left: 0 };
    }
    const rect = containerRef.current.getBoundingClientRect();
    const inputRect = inputRef.current.getBoundingClientRect();
    return {
      top: inputRect.bottom + window.scrollY,
      left: inputRect.left + window.scrollX,
    };
  };

  return (
    <div ref={containerRef} className="mb-2 relative formula-bar">
      <div className="flex items-center gap-0 border border-gray-300 rounded">
        {/* セルアドレス表示 */}
        <div className="text-[12px] text-gray-600 w-20 h-9 flex items-center justify-center text-center px-2 bg-gray-50 border-r border-gray-300 font-mono">
          {cellAddress || ''}
        </div>
        {/* 数式入力欄 */}
        <input
          ref={inputRef}
          className="flex-1 text-[12px] border-0 rounded-r px-3 py-2 h-9 focus:outline-none focus:ring-2 focus:ring-blue-500"
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            // カーソル位置を更新
            if (inputRef.current) {
              setCursorIndex(inputRef.current.selectionStart || 0);
            }
          }}
          onKeyUp={(e) => {
            // カーソル位置を更新
            if (inputRef.current) {
              setCursorIndex(inputRef.current.selectionStart || 0);
            }
          }}
          onSelect={(e) => {
            // 選択範囲変更時もカーソル位置を更新
            if (inputRef.current) {
              setCursorIndex(inputRef.current.selectionStart || 0);
            }
          }}
          onKeyDown={(e) => {
            // カーソル位置を更新（キー押下時）
            requestAnimationFrame(() => {
              if (inputRef.current) {
                setCursorIndex(inputRef.current.selectionStart || 0);
              }
            });
            // 候補選択中のキーボード操作
            if (showSuggestions && suggestions.length > 0) {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Tab') {
                // 候補選択機能は後で拡張可能
                // 今はEnterで候補を閉じる
                if (e.key === 'Enter' && suggestions.length === 1) {
                  e.preventDefault();
                  handleSelectSuggestion(suggestions[0]);
                  return;
                }
              }
            }
            onKeyDown(e);
          }}
          onFocus={(e) => {
            onFormulaBarFocus?.();
            onFocus?.();
          }}
          onBlur={(e) => {
            // 候補リストのクリックを待つため、少し遅延
            setTimeout(() => {
              setShowSuggestions(false);
              onBlur?.(e);
            }, 200);
          }}
          placeholder="数式または値を入力..."
        />
      </div>
      {/* 関数候補ドロップダウン */}
      {showSuggestions && suggestions.length > 0 && (
        <FormulaSuggestions
          suggestions={suggestions}
          onSelect={handleSelectSuggestion}
          position={getSuggestionPosition()}
        />
      )}
      {/* 関数構文ガイド */}
      {value.startsWith('=') && (
        <FormulaSyntaxHint
          formula={value}
          cursorIndex={cursorIndex}
          position={getSuggestionPosition()}
        />
      )}
    </div>
  );
};

export default FormulaBar;

