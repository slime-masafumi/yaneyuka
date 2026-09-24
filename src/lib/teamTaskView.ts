/**
 * Teamタスクの見え方（期限の状態・絞り込み・工程表の並べ方）。画面から切り離してある。
 * テスト: node scripts/test-team-task-view.ts
 */

export type TaskLike = {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string | null;
  startDate?: string | null;
  assigneeId?: string;
  priority?: 'low' | 'medium' | 'high';
  role?: string;
  /** 前のタスクの id。前が終わらないと始められない（遅れが後ろへ波及する） */
  after?: string | null;
};

/** 担当の役割。建築の仕事では「誰の番か」が一番の関心事なので、人とは別に持つ */
export const ROLES = ['設計', '構造', '設備', '施工', '施主', '確認検査機関', 'その他'];

const dayMs = 24 * 60 * 60 * 1000;
const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / dayMs);

export type DueStatus = 'overdue' | 'soon' | 'ok' | 'none' | 'done';

/** 期限切れ／3日以内／それ以降。完了したものは done */
export function dueStatus(t: TaskLike, today: string): { status: DueStatus; days: number | null } {
  if (t.completed) return { status: 'done', days: null };
  if (!t.dueDate || !/^\d{4}-\d{2}-\d{2}/.test(t.dueDate)) return { status: 'none', days: null };
  const days = daysBetween(today, t.dueDate.slice(0, 10));
  return { status: days < 0 ? 'overdue' : days <= 3 ? 'soon' : 'ok', days };
}

export type TaskFilter = { assignee: string; state: 'open' | 'overdue' | 'all'; role: string };

/** assignee: '' = 全員 / 'me:<uid>' = 自分 / それ以外は uid */
export function matchesFilter(t: TaskLike, f: TaskFilter, today: string): boolean {
  if (f.assignee && t.assigneeId !== f.assignee.replace(/^me:/, '')) return false;
  if (f.role && (t.role ?? '') !== f.role) return false;
  if (f.state === 'open' && t.completed) return false;
  if (f.state === 'overdue' && dueStatus(t, today).status !== 'overdue') return false;
  return true;
}

const PRIORITY: Record<string, number> = { high: 0, medium: 1, low: 2 };

export function sortTasks<T extends TaskLike>(list: T[], by: 'due' | 'priority'): T[] {
  const due = (t: T) => t.dueDate || '9999-99-99';
  return [...list].sort((a, b) =>
    by === 'priority'
      ? (PRIORITY[a.priority ?? 'medium'] - PRIORITY[b.priority ?? 'medium']) || due(a).localeCompare(due(b))
      : due(a).localeCompare(due(b)) || (PRIORITY[a.priority ?? 'medium'] - PRIORITY[b.priority ?? 'medium'])
  );
}

/**
 * 工程表の横軸。今日と全タスクの開始・期限を含む範囲を、前後 1 日の余白つきで。
 * 長すぎると横に果てしなく伸びるので最大 120 日で切る（今日を含む側を残す）。
 */
export function ganttRange(tasks: TaskLike[], today: string, maxDays = 120): { start: string; days: number } {
  const dates = [today];
  for (const t of tasks) {
    if (t.startDate) dates.push(t.startDate.slice(0, 10));
    if (t.dueDate) dates.push(t.dueDate.slice(0, 10));
  }
  dates.sort();
  let start = parse(dates[0]);
  start.setDate(start.getDate() - 1);
  const end = parse(dates[dates.length - 1]);
  end.setDate(end.getDate() + 1);
  let days = Math.round((end.getTime() - start.getTime()) / dayMs) + 1;
  if (days > maxDays) {
    // 今日の 2 週前から maxDays 日
    start = parse(today);
    start.setDate(start.getDate() - 14);
    days = maxDays;
  }
  return { start: iso(start), days };
}

/** 工程表の棒。開始が無ければ期限の 1 日だけ（マイルストーン）。範囲外は切り詰める */
export function ganttBar(t: TaskLike, range: { start: string; days: number }): { from: number; len: number; milestone: boolean } | null {
  if (!t.dueDate) return null;
  const due = daysBetween(range.start, t.dueDate.slice(0, 10));
  const hasStart = !!t.startDate && t.startDate <= t.dueDate;
  const st = hasStart ? daysBetween(range.start, t.startDate!.slice(0, 10)) : due;
  const from = Math.max(0, st);
  const to = Math.min(range.days - 1, due);
  if (to < 0 || from > range.days - 1 || to < from) return null;
  return { from, len: to - from + 1, milestone: !hasStart };
}

const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};

export type Slip = {
  /** 期限が何日後ろへずれるか */
  delay: number;
  /** ずれた後の開始・期限 */
  start: string;
  due: string;
  /** 遅れの元（自分が期限切れなら null、前のタスクのせいならその題名） */
  cause: string | null;
};

/**
 * 遅れの波及。「前のタスク」が遅れると、後ろのタスクは前が終わった翌日からしか始められない。
 *   - 未完了で期限を過ぎたタスクは、早くても今日終わるとみなす
 *   - 後ろのタスクは所要日数（開始〜期限）を保ったまま後ろへずらす
 *   - 完了したタスクはずらさない（実績なので）
 * 期限の無いタスクと循環した指定は計算しない。ずれるものだけ返す。
 */
export function cascadeDelays(tasks: TaskLike[], today: string): Map<string, Slip> {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const memo = new Map<string, { start: string; finish: string; cause: string | null } | null>();
  const visiting = new Set<string>();

  const plan = (t: TaskLike): { start: string; finish: string; cause: string | null } | null => {
    if (memo.has(t.id)) return memo.get(t.id)!;
    if (!t.dueDate || visiting.has(t.id)) return null;
    visiting.add(t.id);
    const due = t.dueDate.slice(0, 10);
    const plannedStart = t.startDate && t.startDate <= t.dueDate ? t.startDate.slice(0, 10) : due;
    const dur = daysBetween(plannedStart, due);
    let start = plannedStart;
    let cause: string | null = null;
    const pred = t.after ? byId.get(t.after) : undefined;
    if (pred && !t.completed) {
      const p = plan(pred);
      if (p && p.finish >= start) {
        start = addDays(p.finish, 1);
        cause = pred.title;
      }
    }
    let finish = addDays(start, dur);
    if (!t.completed && finish < today && due < today) {
      finish = today;
      if (!cause) cause = null;
    }
    const r = { start, finish, cause };
    visiting.delete(t.id);
    memo.set(t.id, r);
    return r;
  };

  const out = new Map<string, Slip>();
  for (const t of tasks) {
    const p = plan(t);
    if (!p || t.completed || !t.dueDate) continue;
    const delay = daysBetween(t.dueDate.slice(0, 10), p.finish);
    if (delay > 0) out.set(t.id, { delay, start: p.start, due: p.finish, cause: p.cause });
  }
  return out;
}
