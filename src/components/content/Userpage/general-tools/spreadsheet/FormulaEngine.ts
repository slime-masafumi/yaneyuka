/**
 * スプレッドシートの数式処理エンジン
 * セル参照の解釈、関数計算、依存関係の追跡を担当します
 */

export type CellId = { row: number; col: number };

export class CellError {
  constructor(public message: string) {}
  toString() {
    return `#ERROR: ${this.message}`;
  }
}

type GetCellValueFn = (cell: CellId) => { value: string; formula: string };
type EvaluateCellFn = (cell: CellId) => number | string;

class FormulaEngine {
  // 組み込み関数の定義マップ
  private functions: Record<string, (...args: any[]) => any> = {
    SUM: (...args: number[]) => args.reduce((a, b) => a + b, 0),
    AVERAGE: (...args: number[]) => args.reduce((a, b) => a + b, 0) / args.length,
    MIN: (...args: number[]) => args.length ? Math.min(...args) : 0,
    MAX: (...args: number[]) => args.length ? Math.max(...args) : 0,
    COUNT: (...args: number[]) => args.length,
    ABS: (...args: number[]) => args.length ? Math.abs(args[0]) : 0,
    ROUND: (value: number, decimals: number = 0) => {
      const mul = Math.pow(10, decimals);
      return Math.round(value * mul) / mul;
    },
    TODAY: () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },
    NOW: () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    },
  };

  // セルアドレスをCellIdに変換
  addressToRC(addr: string): CellId | null {
    const m = addr.trim().match(/^([A-Za-z]+)(\d+)$/);
    if (!m) return null;
    const letters = m[1].toUpperCase();
    const row = parseInt(m[2], 10) - 1;
    let col = 0;
    for (let i = 0; i < letters.length; i++) {
      col = col * 26 + (letters.charCodeAt(i) - 64);
    }
    col -= 1;
    if (row < 0 || col < 0) return null;
    return { row, col };
  }

  // CellIdをアドレス文字列に変換
  rcToAddress(row: number, col: number): string {
    let colNum = col + 1;
    let letters = '';
    while (colNum > 0) {
      const rem = (colNum - 1) % 26;
      letters = String.fromCharCode(65 + rem) + letters;
      colNum = Math.floor((colNum - 1) / 26);
    }
    return `${letters}${row + 1}`;
  }

  // 引数文字列を値の配列に変換（範囲参照、セル参照、数値を処理）
  private parseArgsToValues(
    argStr: string,
    visited: Set<string>,
    evaluateCell: EvaluateCellFn
  ): number[] {
    const args = argStr.split(',');
    const values: number[] = [];
    for (const a of args) {
      const t = a.trim();
      if (t.includes(':')) {
        // 範囲参照（例: A1:B5）
        const [start, end] = t.split(':');
        const s = this.addressToRC(start);
        const e = this.addressToRC(end);
        if (s && e) {
          const r0 = Math.min(s.row, e.row);
          const r1 = Math.max(s.row, e.row);
          const c0 = Math.min(s.col, e.col);
          const c1 = Math.max(s.col, e.col);
          for (let rr = r0; rr <= r1; rr++) {
            for (let cc = c0; cc <= c1; cc++) {
              const v = Number(evaluateCell({ row: rr, col: cc }));
              if (!Number.isNaN(v)) values.push(v);
            }
          }
        }
      } else if (/^[A-Za-z]+\d+$/.test(t)) {
        // セル参照（例: A1）
        const rc = this.addressToRC(t);
        if (rc) {
          const v = Number(evaluateCell(rc));
          if (!Number.isNaN(v)) values.push(v);
        }
      } else {
        // 数値リテラル
        const v = Number(t);
        if (!Number.isNaN(v)) values.push(v);
      }
    }
    return values;
  }

  // 安全な算術式評価
  private safeEvalArith(expr: string): number {
    const cleaned = expr.replace(/\s+/g, '');
    if (!/^[-+*/().0-9]+$/.test(cleaned)) return NaN;
    try {
      // eslint-disable-next-line no-new-func
      return Function(`return (${cleaned})`)();
    } catch {
      return NaN;
    }
  }

  // 数式文字列を評価
  evaluateRaw(
    raw: string,
    visited: Set<string>,
    getCellValue: GetCellValueFn,
    evaluateCell: EvaluateCellFn
  ): number | string {
    const t = String(raw || '').trim();
    if (!t.startsWith('=')) return t;

    const f = t.substring(1);

    // 関数呼び出しのパターンマッチ（例: SUM(A1:A10)）
    const m = f.match(/^(SUM|AVERAGE|MIN|MAX|COUNT|IF|ROUND|TODAY|NOW|ABS)\((.*)\)$/i);
    if (m) {
      const name = m[1].toUpperCase();
      const argsStr = m[2];

      try {
        switch (name) {
          case 'SUM': {
            const vals = this.parseArgsToValues(argsStr, visited, evaluateCell);
            return this.functions.SUM(...vals);
          }
          case 'AVERAGE': {
            const vals = this.parseArgsToValues(argsStr, visited, evaluateCell);
            return this.functions.AVERAGE(...vals);
          }
          case 'MIN': {
            const vals = this.parseArgsToValues(argsStr, visited, evaluateCell);
            return this.functions.MIN(...vals);
          }
          case 'MAX': {
            const vals = this.parseArgsToValues(argsStr, visited, evaluateCell);
            return this.functions.MAX(...vals);
          }
          case 'COUNT': {
            const vals = this.parseArgsToValues(argsStr, visited, evaluateCell);
            return this.functions.COUNT(...vals);
          }
          case 'ABS': {
            const vals = this.parseArgsToValues(argsStr, visited, evaluateCell);
            return this.functions.ABS(...vals);
          }
          case 'ROUND': {
            const parts = argsStr.split(',');
            const v = parts[0]
              ? Number(this.parseArgsToValues(parts[0], visited, evaluateCell)[0] ?? parts[0])
              : 0;
            const d = parts[1] ? Number(parts[1]) : 0;
            return this.functions.ROUND(v, d);
          }
          case 'TODAY': {
            return this.functions.TODAY();
          }
          case 'NOW': {
            return this.functions.NOW();
          }
          case 'IF': {
            // IF(cond, a, b) condは A1>5 のような単純比較を想定
            const parts: string[] = [];
            let depth = 0;
            let buf = '';
            for (const ch of argsStr) {
              if (ch === ',' && depth === 0) {
                parts.push(buf);
                buf = '';
              } else {
                buf += ch;
                if (ch === '(') depth++;
                else if (ch === ')') depth = Math.max(0, depth - 1);
              }
            }
            if (buf) parts.push(buf);
            const cond = (parts[0] || '').trim();
            const a = (parts[1] || '').trim();
            const b = (parts[2] || '').trim();
            const cm = cond.match(/^(.*?)(>=|<=|<>|=|>|<)(.*)$/);
            let ok = false;
            if (cm) {
              const left = cm[1].trim();
              const op = cm[2];
              const right = cm[3].trim();
              const lv = Number(this.evaluateRaw(`=${left}`, new Set(visited), getCellValue, evaluateCell));
              const rv = Number(this.evaluateRaw(`=${right}`, new Set(visited), getCellValue, evaluateCell));
              switch (op) {
                case '>':
                  ok = lv > rv;
                  break;
                case '<':
                  ok = lv < rv;
                  break;
                case '>=':
                  ok = lv >= rv;
                  break;
                case '<=':
                  ok = lv <= rv;
                  break;
                case '=':
                  ok = lv === rv;
                  break;
                case '<>':
                  ok = lv !== rv;
                  break;
              }
            }
            return String(
              ok
                ? this.evaluateRaw(`=${a}`, new Set(visited), getCellValue, evaluateCell)
                : this.evaluateRaw(`=${b}`, new Set(visited), getCellValue, evaluateCell)
            );
          }
        }
      } catch (err: any) {
        return String(new CellError(err.message || String(err)));
      }
    }

    // 参照を数値に置換して算術式として評価
    let expr = f;
    expr = expr.replace(/([A-Za-z]+\d+)/g, (match) => {
      const rc = this.addressToRC(match);
      if (!rc) return '0';
      const v = Number(evaluateCell(rc));
      return Number.isNaN(v) ? '0' : String(v);
    });
    const n = this.safeEvalArith(expr);
    return Number.isNaN(n) ? 0 : n;
  }

  // 新しい関数を追加（利用側からカスタム数式関数を登録するためのAPI）
  registerFunction(name: string, fn: (...args: any[]) => any) {
    this.functions[name.toUpperCase()] = fn;
  }

  /**
   * 数式内のセル参照を調整（相対参照・絶対参照対応）
   * コピーやオートフィル時に数式の参照先を自動調整します
   * @param formula 元の数式文字列
   * @param rowOffset 行の移動量
   * @param colOffset 列の移動量
   * @returns 調整後の数式文字列
   */
  adjustFormula(formula: string, rowOffset: number, colOffset: number): string {
    // セル参照のパターン: $A$1, A$1, $A1, A1 など
    return formula.replace(/(\$?)([A-Z]+)(\$?)(\d+)/g, 
      (_, colAbs, colLetters, rowAbs, rowNum) => {
        // 列名をインデックスに変換
        let colIndex = this.colNameToIndex(colLetters);
        let rowIndex = parseInt(rowNum, 10) - 1; // 1始まりを0始まりに変換
        
        // 相対参照の場合はオフセットを適用
        if (colAbs !== '$') colIndex += colOffset;
        if (rowAbs !== '$') rowIndex += rowOffset;
        
        // 負の値にならないように調整
        if (colIndex < 0) colIndex = 0;
        if (rowIndex < 0) rowIndex = 0;
        
        // インデックスを列名・行番号に戻す
        const newCol = this.indexToColName(colIndex);
        const newRow = (rowIndex + 1).toString();
        
        // 絶対参照マーカーを保持
        return (colAbs || '') + newCol + (rowAbs || '') + newRow;
      }
    );
  }

  /**
   * 列名（例："AB"）を数値インデックスに変換
   */
  private colNameToIndex(name: string): number {
    let index = 0;
    for (let i = 0; i < name.length; i++) {
      index = index * 26 + (name.charCodeAt(i) - 64); // 'A'→1, 'B'→2...
    }
    return index - 1; // 0始まりに調整
  }

  /**
   * 数値インデックスを列名（例：0->"A", 27->"AB"）に変換
   */
  private indexToColName(index: number): string {
    let name = '';
    index = index + 1; // 1始まりに変換
    while (index > 0) {
      const rem = (index - 1) % 26;
      name = String.fromCharCode(65 + rem) + name;
      index = Math.floor((index - 1) / 26);
    }
    return name;
  }
}

export default FormulaEngine;

