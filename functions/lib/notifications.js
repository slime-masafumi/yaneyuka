"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDeadlineReminders = exports.notifyTaskAssignee = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
/** 同じ id が既にあれば書かない（定期実行が重なっても二重に届かず、既読も戻らない） */
async function deliver(uid, id, notice) {
    try {
        await admin.firestore().doc(`users/${uid}/notifications/${id}`).create({ ...notice, createdAt: Date.now(), read: false });
        return true;
    }
    catch (e) {
        if (e?.code === 6 /* ALREADY_EXISTS */)
            return false;
        throw e;
    }
}
/** 日本時間の YYYY-MM-DD（Myタスク・Teamタスクの期限は <input type=date> の文字列） */
const ymdJst = (ms) => new Date(ms + 9 * 3600 * 1000).toISOString().slice(0, 10);
const clip = (s, n) => (s.length > n ? `${s.slice(0, n)}…` : s);
async function displayName(uid) {
    if (!uid)
        return '誰か';
    const snap = await admin.firestore().doc(`users/${uid}`).get();
    const d = snap.data();
    return d?.displayName || (d?.email ? String(d.email).split('@')[0] : '誰か');
}
/**
 * Teamタスクの担当者への通知。
 * 担当が「前と違う人」に変わり、付けたのが本人以外のときだけ届ける。
 * 付けた人は画面側が assignedByUid に書く（src/lib/firebaseUserData.ts の withAssigner）。
 */
exports.notifyTaskAssignee = functions.firestore
    .document('boards/{boardId}/tasks/{taskId}')
    .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null;
    if (!after)
        return null;
    const before = change.before.exists ? change.before.data() : null;
    const to = after.assigneeUid || null;
    if (!to || to === (before?.assigneeUid || null))
        return null;
    if (to === after.assignedByUid || after.completed)
        return null;
    const { boardId } = context.params;
    const board = (await admin.firestore().doc(`boards/${boardId}`).get()).data();
    // ボードの外の人には届けない（担当の値が壊れていても他人に通知が飛ばないように）
    if (!board || (board.ownerUid !== to && !(board.memberUids || []).includes(to)))
        return null;
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
 * - 60 日より前の通知は消す
 * tasks は users/{uid}/mytasks/{c}/tasks と boards/{b}/tasks の両方が同じ名前なので、
 * コレクショングループ 1 回で両方を拾う（firestore.indexes.json の fieldOverrides が要る）。
 */
exports.sendDeadlineReminders = (0, scheduler_1.onSchedule)({
    schedule: '0 8 * * *',
    timeZone: 'Asia/Tokyo',
}, async () => {
    const db = admin.firestore();
    const now = Date.now();
    const today = ymdJst(now);
    const tomorrow = ymdJst(now + 24 * 3600 * 1000);
    let sent = 0;
    const tasks = await db.collectionGroup('tasks').where('dueDate', 'in', [today, tomorrow]).limit(5000).get();
    const boards = new Map();
    for (const doc of tasks.docs) {
        const t = doc.data();
        if (t.completed)
            continue;
        const seg = doc.ref.path.split('/');
        const when = t.dueDate === today ? '今日が期限です' : '明日が期限です';
        const id = `due-${seg.join('_')}-${t.dueDate}`;
        try {
            if (seg[0] === 'boards' && seg.length === 4) {
                const boardId = seg[1];
                if (!boards.has(boardId))
                    boards.set(boardId, (await db.doc(`boards/${boardId}`).get()).data() ?? null);
                const board = boards.get(boardId);
                const to = t.assigneeUid || board?.ownerUid;
                if (!board || !to)
                    continue;
                if (await deliver(to, id, {
                    type: 'teamTaskDue',
                    title: `Teamタスク：${when}`,
                    body: `${board.name || 'Teamタスク'}：${clip(t.title || '', 60)}`,
                    link: '/?m=team-tasks',
                }))
                    sent++;
            }
            else if (seg[0] === 'users' && seg[2] === 'mytasks' && seg.length === 6) {
                if (await deliver(seg[1], id, {
                    type: 'myTaskDue',
                    title: `Myタスク：${when}`,
                    body: clip(t.content || '', 80),
                    link: '/?m=my-tasks',
                }))
                    sent++;
            }
        }
        catch (e) {
            console.error('[sendDeadlineReminders] task', doc.ref.path, e);
        }
    }
    const schedules = await db.collection('schedules')
        .where('deadline', '>', admin.firestore.Timestamp.fromMillis(now))
        .where('deadline', '<=', admin.firestore.Timestamp.fromMillis(now + 24 * 3600 * 1000))
        .limit(2000)
        .get();
    for (const doc of schedules.docs) {
        const s = doc.data();
        if (!s.ownerUid)
            continue;
        try {
            const answered = (await doc.ref.collection('participants').count().get()).data().count;
            const deadline = s.deadline.toMillis();
            const hhmm = new Date(deadline + 9 * 3600 * 1000).toISOString().slice(11, 16);
            if (await deliver(s.ownerUid, `sched-${doc.id}-${deadline}`, {
                type: 'scheduleDeadline',
                title: 'スケジュール調整：締切まで 24 時間を切りました',
                body: `${clip(s.title || '', 50)}（${ymdJst(deadline)} ${hhmm} 締切・回答 ${answered} 人）`,
                link: '/?m=general-tools&t=schedule',
            }))
                sent++;
        }
        catch (e) {
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
    console.log(`[sendDeadlineReminders] tasks=${tasks.size} schedules=${schedules.size} sent=${sent} removed=${old.size}`);
});
//# sourceMappingURL=notifications.js.map