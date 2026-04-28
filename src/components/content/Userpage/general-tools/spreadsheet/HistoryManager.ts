/**
 * スプレッドシートのUndo/Redo履歴管理クラス
 * 操作履歴をスタックで管理し、Undo/Redo機能を提供します
 */

export interface HistorySnapshot {
  cells: Record<string, string>;
  formats: Record<string, any>;
  colWidths: number[];
}

export interface IAction {
  undo: () => void;
  redo: () => void;
}

class HistoryManager {
  private undoStack: HistorySnapshot[] = [];
  private redoStack: HistorySnapshot[] = [];
  private maxHistorySize: number = 50; // 履歴の最大保持数

  /**
   * 新しい操作を履歴に追加
   * @param snapshot 操作前の状態スナップショット
   */
  add(snapshot: HistorySnapshot) {
    this.undoStack.push(snapshot);
    // 新しい操作があればRedoスタックはクリア
    this.redoStack = [];
    
    // 履歴が最大数を超えたら古いものを削除
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
  }

  /**
   * 元に戻す（Undo）
   * @returns 元に戻す前の状態スナップショット、またはnull
   */
  undo(): HistorySnapshot | null {
    const snapshot = this.undoStack.pop();
    if (!snapshot) return null;
    this.redoStack.push(snapshot);
    return snapshot;
  }

  /**
   * やり直す（Redo）
   * @returns やり直す後の状態スナップショット、またはnull
   */
  redo(): HistorySnapshot | null {
    const snapshot = this.redoStack.pop();
    if (!snapshot) return null;
    this.undoStack.push(snapshot);
    return snapshot;
  }

  /**
   * 履歴をクリア（全削除時など）
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Undo可能かどうか
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Redo可能かどうか
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * 履歴の最大保持数を設定
   */
  setMaxHistorySize(size: number) {
    this.maxHistorySize = size;
    // 現在の履歴が最大数を超えている場合は削除
    while (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
  }
}

export default HistoryManager;

