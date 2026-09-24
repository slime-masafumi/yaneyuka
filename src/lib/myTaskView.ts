/**
 * Myタスクの見え方（純粋ロジック）。
 *   - 物件でまとめる: 本文の【A邸】や #A邸 を物件名として読む（yychat の物件ルーム・yymail から作ったタスクは自動で付く）
 *   - 完了の履歴: 完了した日（completedAt）ごとに並べる
 */

export type MyTaskLike = { id: string; content: string; completed: boolean; dueDate?: string | null; completedAt?: number | null };
export type SheetLike<T extends MyTaskLike = MyTaskLike> = { id: string; title: string; tasks: T[] };

/** 本文から物件名を読む。【A邸】… / #A邸 … / 「A邸:」は読まない（誤読が多い） */
export function projectOf(content: string): { project: string | null; rest: string } {
  const t = content.trim();
  const br = t.match(/^[【\[]([^】\]]{1,40})[】\]]\s*(.*)$/s);
  if (br) return { project: br[1].trim(), rest: br[2].trim() };
  const tag = t.match(/(?:^|\s)#([^\s#]{1,40})/);
  if (tag) return { project: tag[1], rest: t.replace(tag[0], ' ').replace(/\s+/g, ' ').trim() };
  return { project: null, rest: t };
}

/** 物件名を付けた本文にする（すでに付いていれば付け替え） */
export function withProject(content: string, project: string): string {
  const { rest } = projectOf(content);
  return project.trim() ? `【${project.trim()}】${rest}` : rest;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const ymdOf = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export type Placed<T extends MyTaskLike> = { task: T; sheetId: string; sheetTitle: string; rest: string };

/** 物件ごと（未完了の多い順、物件なしは最後）。各物件の中は未完了→期日順 */
export function groupByProject<T extends MyTaskLike>(sheets: SheetLike<T>[], today: string, includeDone = false) {
  const map = new Map<string, Placed<T>[]>();
  for (const s of sheets) {
    for (const t of s.tasks) {
      if (!includeDone && t.completed) continue;
      const { project, rest } = projectOf(t.content);
      const key = project ?? '';
      const arr = map.get(key) ?? [];
      arr.push({ task: t, sheetId: s.id, sheetTitle: s.title, rest });
      map.set(key, arr);
    }
  }
  const byDue = (a: Placed<T>, b: Placed<T>) => {
    if (a.task.completed !== b.task.completed) return a.task.completed ? 1 : -1;
    const x = a.task.dueDate || '9999';
    const y = b.task.dueDate || '9999';
    return x < y ? -1 : x > y ? 1 : 0;
  };
  return [...map.entries()]
    .map(([project, items]) => ({
      project,
      items: items.sort(byDue),
      open: items.filter((i) => !i.task.completed).length,
      overdue: items.filter((i) => !i.task.completed && !!i.task.dueDate && i.task.dueDate < today).length,
    }))
    .sort((a, b) => (a.project === '' ? 1 : b.project === '' ? -1 : b.open - a.open || a.project.localeCompare(b.project, 'ja')));
}

/** 完了の履歴（新しい日から）。完了日の記録が無い古いものは最後に「日付なし」 */
export function completedHistory<T extends MyTaskLike>(sheets: SheetLike<T>[]) {
  const map = new Map<string, Placed<T>[]>();
  for (const s of sheets) {
    for (const t of s.tasks) {
      if (!t.completed) continue;
      const key = t.completedAt ? ymdOf(t.completedAt) : '';
      const arr = map.get(key) ?? [];
      arr.push({ task: t, sheetId: s.id, sheetTitle: s.title, rest: t.content });
      map.set(key, arr);
    }
  }
  return [...map.entries()]
    .map(([date, items]) => ({ date, items: items.sort((a, b) => (b.task.completedAt ?? 0) - (a.task.completedAt ?? 0)) }))
    .sort((a, b) => (a.date === '' ? 1 : b.date === '' ? -1 : a.date < b.date ? 1 : -1));
}
