'use client';
/**
 * Teamタスクの「自分用の 1 枚のボード」（未ログイン）。
 *
 * 共有・招待・担当の通知はサーバーが要るのでログイン必須のまま。ただし未ログインでも
 * カード・工程表・遅れの波及を試せるよう、ボード 1 枚だけをこのブラウザ（yy-guest-teamtasks）に置く。
 * ログインしたら「アカウントのボードとして作る」で、同じ中身のクラウドのボードを作る。
 */
import { addBoardTask, createBoard, updateBoardTask } from '@/lib/firebaseUserData';

export const GUEST_TEAM_KEY = 'yy-guest-teamtasks';
export const GUEST_BOARD_LIMIT = 1;

export type GuestTask = {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string | null;
  startDate?: string | null;
  role?: string;
  after?: string | null;
  priority?: 'low' | 'medium' | 'high';
};
export type GuestProject = { id: string; name: string; color?: string };
export type GuestBoard = { projects: GuestProject[]; tasks: Record<string, GuestTask[]> };

export const guestTaskId = () => `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const readGuestBoard = (): GuestBoard | null => {
  try {
    const raw = window.localStorage.getItem(GUEST_TEAM_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || !Array.isArray(v.projects)) return null;
    return { projects: v.projects, tasks: v.tasks && typeof v.tasks === 'object' ? v.tasks : {} };
  } catch {
    return null;
  }
};

export const writeGuestBoard = (data: GuestBoard) => {
  try { window.localStorage.setItem(GUEST_TEAM_KEY, JSON.stringify(data)); } catch { /* 容量・プライベートモード */ }
};

export const clearGuestBoard = () => {
  try { window.localStorage.removeItem(GUEST_TEAM_KEY); } catch { /* noop */ }
};

/**
 * 手元のボードをクラウドのボードとして作る。
 * 「前のタスク」は id で指しているので、作った後に新しい id へ付け替える。
 * 担当は作った本人（自分に付けた扱いなので通知は飛ばない）。
 */
export async function uploadGuestBoard(uid: string, data: GuestBoard, room: number): Promise<{ boards: number; tasks: number }> {
  let boards = 0;
  let tasks = 0;
  for (const p of data.projects.slice(0, Math.max(0, room))) {
    const boardId = await createBoard(uid, p.name, p.color);
    boards++;
    const idMap = new Map<string, string>();
    const list = data.tasks[p.id] || [];
    for (const t of list) {
      const id = await addBoardTask(boardId, {
        title: t.title,
        completed: !!t.completed,
        dueDate: t.dueDate ?? null,
        startDate: t.startDate ?? null,
        role: t.role || null,
        priority: t.priority || 'medium',
        assigneeUid: uid,
      });
      idMap.set(t.id, id);
      tasks++;
    }
    for (const t of list) {
      const after = t.after ? idMap.get(t.after) : undefined;
      const self = idMap.get(t.id);
      if (after && self) await updateBoardTask(boardId, self, { after });
    }
  }
  return { boards, tasks };
}
