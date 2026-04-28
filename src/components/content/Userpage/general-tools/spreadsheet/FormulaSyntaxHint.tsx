'use client';

import React from 'react';

// 関数名 -> 構文説明 のマップ
const functionSignatures: Record<string, string> = {
  IF: 'IF(条件, 真の場合の値, 偽の場合の値)',
  SUM: 'SUM(数値1, 数値2, ...)',
  AVERAGE: 'AVERAGE(数値1, 数値2, ...)',
  MIN: 'MIN(数値1, 数値2, ...)',
  MAX: 'MAX(数値1, 数値2, ...)',
  COUNT: 'COUNT(数値1, 数値2, ...)',
  ROUND: 'ROUND(数値, 桁数)',
  TODAY: 'TODAY()',
  NOW: 'NOW()',
  ABS: 'ABS(数値)',
  SUMIF: 'SUMIF(範囲, 条件, [合計範囲])',
  COUNTIF: 'COUNTIF(範囲, 条件)',
  VLOOKUP: 'VLOOKUP(検索値, 範囲, 列番号, [完全一致])',
  HLOOKUP: 'HLOOKUP(検索値, 範囲, 行番号, [完全一致])',
  INDEX: 'INDEX(範囲, 行番号, [列番号])',
  MATCH: 'MATCH(検索値, 範囲, [照合の型])',
  CONCATENATE: 'CONCATENATE(文字列1, 文字列2, ...)',
  LEFT: 'LEFT(文字列, 文字数)',
  RIGHT: 'RIGHT(文字列, 文字数)',
  MID: 'MID(文字列, 開始位置, 文字数)',
};

interface FormulaSyntaxHintProps {
  formula: string;
  cursorIndex: number;
  position: { top: number; left: number };
}

const FormulaSyntaxHint: React.FC<FormulaSyntaxHintProps> = ({
  formula,
  cursorIndex,
  position,
}) => {
  // カーソル位置までの文字列を取得し、最後の関数名+括弧開始を検出
  const uptoCursor = formula.slice(0, cursorIndex);
  const match = uptoCursor.match(/([A-Za-z_]+)\($/i);
  
  if (!match) return null;
  
  const funcName = match[1].toUpperCase();
  const signature = functionSignatures[funcName];
  
  if (!signature) return null;

  return (
    <div
      className="absolute z-50 bg-blue-50 border border-blue-300 rounded shadow-lg px-3 py-2 text-sm"
      style={{ top: position.top, left: position.left }}
    >
      <strong className="text-blue-700">{funcName}</strong>関数: <span className="text-gray-700">{signature}</span>
    </div>
  );
};

export default FormulaSyntaxHint;

