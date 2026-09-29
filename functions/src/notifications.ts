import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';

/**
 * サイト内の通知（上部ナビのベル）。
 *
 * 置き場所は users/{uid}/notifications/{id}。本人しか読み書きできない既存のルール
 * （users/{uid}/{document=**}）のままで済むよう、他人宛ての通知はここ（Admin SDK）
 * だけが書く。画面は src/components/layout/NotificationBell.tsx。
 */
type Notice = {
  type: 'teamTaskAssigned' | 'teamTaskDue' | 'myTaskDue' | 'scheduleDeadline' | 'calendarDue';
  title: string;
  body: string;
  /** 押したときに開く URL（サイト内の相対パス） */
  link: string;
  createdAt: number;
  read: boolean;
};

/** 同じ id が既にあれば書かない（定期実行が重なっても二重に届かず、既読も戻らない） */
async function deliver(uid: string, id: string, notice: Omit<Notice, 'createdAt' | 'read'>) {
  try {
    await admin.firestore().doc(`users/${uid}/notifications/${id}`).create({ ...notice, createdAt: Date.now(), read: false });
    return true;
  } catch (e: any) {
    if (e?.code === 6 /* ALREADY_EXISTS */) return false;
    throw e;
  }
}

/** 期限の自動配置（src/components/content/Userpage/calendar/DeadlineHelper.tsx）が使う分類 */
const DEADLINE_CATEGORIES = new Set(['申請・検査', '中間検査', '完了検査', '資格試験']);

/** 日本時間の YYYY-MM-DD（Myタスク・Teamタスクの期限は <input type=date> の文字列） */
const ymdJst = (ms: number) => new Date(ms + 9 * 3600 * 1000).toISOString().slice(0, 10);

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

async function displayName(uid: string | null | undefined): Promise<string> {
  if (!uid) return '誰か';
  const snap = await admin.firestore().doc(`users/${uid}`).get();
  const d = snap.data();
  return d?.displayName || (d?.email ? String(d.email).split('@')[0] : '誰か');
}

/**
 * Teamタスクの担当者への通知。
 * 担当が「前と違う人」に変わり、付けたのが本人以外のときだけ届ける。
 * 付けた人は画面側が assignedByUid に書く（src/lib/firebaseUserData.ts の withAssigner）。
 */
export const notifyTaskAssignee = functions.firestore
  .document('boards/{boardId}/tasks/{taskId}')
  .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null;
    if (!after) return null;
    const before = change.before.exists ? change.before.data() : null;
    const to: string | null = after.assigneeUid || null;
    if (!to || to === (before?.assigneeUid || null)) return null;
    if (to === after.assignedByUid || after.completed) return null;

    const { boardId } = context.params;
    const board = (await admin.firestore().doc(`boards/${boardId}`).get()).data();
    // ボードの外の人には届けない（担当の値が壊れていても他人に通知が飛ばないように）
    if (!board || (board.ownerUid !== to && !(board.memberUids || []).includes(to))) return null;

    const who = await displayName(after.assignedByUid);
    const due = after.dueDate ? `（期限 ${after.dueDate}）` : '';
    await deliver(to, `assign-${context.eventId}`, {
      type: 'teamTaskAssigned',
      title: `${who} さんがタスクの担当にしました`,
      body: `${board.name || 'Teamタスク'}：${clip(after.title || '', 60)}${due}`,
      link: '/?m=team-tasks',
    });
    return null;
  });

/**
 * 毎朝 8 時の締切リマインド。
 * - Myタスク・Teamタスク: 期限が今日・明日で、終わっていないもの（Teamタスクは担当者、担当が無ければボードの持ち主）
 * - スケジュール調整: 締切まで 24 時間を切ったもの（作った人へ、回答の人数を添えて）
 * - Myカレンダー: 今日・明日の予定のうち、通知を付けたもの（remind: true）と申請・検査・資格試験の期限
 * - 60 日より前の通知は消す
 * tasks は users/{uid}/mytasks/{c}/tasks と boards/{b}/tasks の両方が同じ名前なので、
 * コレクショングループ 1 回で両方を拾う（firestore.indexes.json の fieldOverrides が要る）。
 */
export const sendDeadlineReminders = onSchedule({
  schedule: '0 8 * * *',
  timeZone: 'Asia/Tokyo',
}, async () => {
  const db = admin.firestore();
  const now = Date.now();
  const today = ymdJst(now);
  const tomorrow = ymdJst(now + 24 * 3600 * 1000);
  let sent = 0;

  const tasks = await db.collectionGroup('tasks').where('dueDate', 'in', [today, tomorrow]).limit(5000).get();
  const boards = new Map<string, admin.firestore.DocumentData | null>();
  for (const doc of tasks.docs) {
    const t = doc.data();
    if (t.completed) continue;
    const seg = doc.ref.path.split('/');
    const when = t.dueDate === today ? '今日が期限です' : '明日が期限です';
    const id = `due-${seg.join('_')}-${t.dueDate}`;
    try {
      if (seg[0] === 'boards' && seg.length === 4) {
        const boardId = seg[1];
        if (!boards.has(boardId)) boards.set(boardId, (await db.doc(`boards/${boardId}`).get()).data() ?? null);
        const board = boards.get(boardId);
        const to = t.assigneeUid || board?.ownerUid;
        if (!board || !to) continue;
        if (await deliver(to, id, {
          type: 'teamTaskDue',
          title: `Teamタスク：${when}`,
          body: `${board.name || 'Teamタスク'}：${clip(t.title || '', 60)}`,
          link: '/?m=team-tasks',
        })) sent++;
      } else if (seg[0] === 'users' && seg[2] === 'mytasks' && seg.length === 6) {
        if (await deliver(seg[1], id, {
          type: 'myTaskDue',
          title: `Myタスク：${when}`,
          body: clip(t.content || '', 80),
          link: '/?m=my-tasks',
        })) sent++;
      }
    } catch (e) {
      console.error('[sendDeadlineReminders] task', doc.ref.path, e);
    }
  }

  // Myカレンダー。date は 'YYYY-MM-DD'。期限の自動配置（DeadlineHelper）で入れた分類は、
  // remind を付け忘れていても知らせる（通知のために入れた期限なので）
  const events = await db.collectionGroup('calendarEvents').where('date', 'in', [today, tomorrow]).limit(5000).get();
  for (const doc of events.docs) {
    const e = doc.data();
    const seg = doc.ref.path.split('/');
    if (seg[0] !== 'users' || seg.length !== 4) continue;
    if (e.remind !== true && !DEADLINE_CATEGORIES.has(e.category)) continue;
    // 複数日にまたがる予定は初日だけ（spanPart が middle / end の分は送らない）
    if (e.spanPart && e.spanPart !== 'single' && e.spanPart !== 'start') continue;
    try {
      if (await deliver(seg[1], `cal-${doc.id}-${e.date}`, {
        type: 'calendarDue',
        title: `Myカレンダー：${e.date === today ? '今日' : '明日'}の予定`,
        body: `${e.category ? `［${e.category}］` : ''}${clip(e.title || '', 60)}`,
        link: '/?m=my-calendar',
      })) sent++;
    } catch (err) {
      console.error('[sendDeadlineReminders] calendar', doc.ref.path, err);
    }
  }

  const schedules = await db.collection('schedules')
    .where('deadline', '>', admin.firestore.Timestamp.fromMillis(now))
    .where('deadline', '<=', admin.firestore.Timestamp.fromMillis(now + 24 * 3600 * 1000))
    .limit(2000)
    .get();
  for (const doc of schedules.docs) {
    const s = doc.data();
    if (!s.ownerUid) continue;
    try {
      const answered = (await doc.ref.collection('participants').count().get()).data().count;
      const deadline = s.deadline.toMillis() as number;
      const hhmm = new Date(deadline + 9 * 3600 * 1000).toISOString().slice(11, 16);
      if (await deliver(s.ownerUid, `sched-${doc.id}-${deadline}`, {
        type: 'scheduleDeadline',
        title: 'スケジュール調整：締切まで 24 時間を切りました',
        body: `${clip(s.title || '', 50)}（${ymdJst(deadline)} ${hhmm} 締切・回答 ${answered} 人）`,
        link: '/?m=general-tools&t=schedule',
      })) sent++;
    } catch (e) {
      console.error('[sendDeadlineReminders] schedule', doc.id, e);
    }
  }

  // 古い通知の掃除（1 回 500 件まで。残りは翌日）
  const old = await db.collectionGroup('notifications').where('createdAt', '<', now - 60 * 24 * 3600 * 1000).limit(500).get();
  if (!old.empty) {
    const batch = db.batch();
    old.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  console.log(`[sendDeadlineReminders] tasks=${tasks.size} events=${events.size} schedules=${schedules.size} sent=${sent} removed=${old.size}`);
});
