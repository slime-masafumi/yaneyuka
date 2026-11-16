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
exports.digestText = digestText;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const nodemailer = __importStar(require("nodemailer"));
/** この実行で届けた通知（朝のまとめメールに載せる）。uid → 通知 */
let delivered = null;
/** 同じ id が既にあれば書かない（定期実行が重なっても二重に届かず、既読も戻らない） */
async function deliver(uid, id, notice) {
    try {
        await admin.firestore().doc(`users/${uid}/notifications/${id}`).create({ ...notice, createdAt: Date.now(), read: false });
        if (delivered) {
            const list = delivered.get(uid) ?? [];
            list.push(notice);
            delivered.set(uid, list);
        }
        return true;
    }
    catch (e) {
        if (e?.code === 6 /* ALREADY_EXISTS */)
            return false;
        throw e;
    }
}
/** 期限の自動配置（src/components/content/Userpage/calendar/DeadlineHelper.tsx）が使う分類 */
const DEADLINE_CATEGORIES = new Set(['申請・検査', '中間検査', '完了検査', '資格試験']);
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
 * - Myカレンダー: 今日・明日の予定のうち、通知を付けたもの（remind: true）と申請・検査・資格試験の期限
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
    delivered = new Map();
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
    // Myカレンダー。date は 'YYYY-MM-DD'。期限の自動配置（DeadlineHelper）で入れた分類は、
    // remind を付け忘れていても知らせる（通知のために入れた期限なので）
    const events = await db.collectionGroup('calendarEvents').where('date', 'in', [today, tomorrow]).limit(5000).get();
    for (const doc of events.docs) {
        const e = doc.data();
        const seg = doc.ref.path.split('/');
        if (seg[0] !== 'users' || seg.length !== 4)
            continue;
        // チェックを外した予定（remind: false）は分類が期限でも送らない。remind が無い古い予定だけ分類で判断する
        if (e.remind === false)
            continue;
        if (e.remind !== true && !DEADLINE_CATEGORIES.has(e.category))
            continue;
        // 複数日にまたがる予定は初日だけ（spanPart が middle / end の分は送らない）
        if (e.spanPart && e.spanPart !== 'single' && e.spanPart !== 'start')
            continue;
        try {
            if (await deliver(seg[1], `cal-${doc.id}-${e.date}`, {
                type: 'calendarDue',
                title: `Myカレンダー：${e.date === today ? '今日' : '明日'}の予定`,
                body: `${e.category ? `［${e.category}］` : ''}${clip(e.title || '', 60)}`,
                link: '/?m=my-calendar',
            }))
                sent++;
        }
        catch (err) {
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
    const mails = await sendMorningDigests(delivered, now, today);
    delivered = null;
    console.log(`[sendDeadlineReminders] tasks=${tasks.size} events=${events.size} schedules=${schedules.size} sent=${sent} removed=${old.size} mails=${mails}`);
});
/**
 * 朝のまとめメール（2026-11-16）。設定画面で「朝のまとめをメールで受け取る」にした人
 * （users/{uid}.digestEmail === true）にだけ、1 日 1 通送る。
 * 中身はこの実行で届けた期限の通知と、前日 8 時以降に付いたまだ読んでいない担当の通知。
 * 何も無い日は送らない。
 *
 * SMTP は functions/.env（Git 管理外。サイトの .env.local と同じ SMTP_HOST / SMTP_PORT /
 * SMTP_SECURE / SMTP_USER / SMTP_PASS / SMTP_FROM）。無ければ送らずにログだけ出す。
 * 1 回の実行で送るのは 500 通まで（無限に送らない）。
 */
const DIGEST_MAX = 500;
const SITE = 'https://yaneyuka.com';
function digestText(items, today) {
    const lines = items.map((n) => `・${n.title}
  ${n.body}
  ${SITE}${n.link}`);
    return {
        subject: `【yaneyuka】今日のお知らせ ${items.length} 件（${today}）`,
        text: [
            `yaneyuka の今日のお知らせ（${today}）`,
            '',
            ...lines,
            '',
            '――',
            'このメールは、ユーザー設定で「朝のまとめをメールで受け取る」にした方にだけ送っています。',
            `止めるときは ${SITE}/?m=settings で切り替えてください。`,
            '合同会社slime / info@yaneyuka.com',
        ].join('\n'),
    };
}
async function sendMorningDigests(map, now, today) {
    const db = admin.firestore();
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const optedIn = await db.collection('users').where('digestEmail', '==', true).limit(DIGEST_MAX).get();
    if (optedIn.empty)
        return 0;
    const transport = host && user && pass
        ? nodemailer.createTransport({ host, port: Number(process.env.SMTP_PORT || '587'), secure: String(process.env.SMTP_SECURE || 'false') === 'true', auth: { user, pass } })
        : null;
    const from = process.env.SMTP_FROM || user || 'info@yaneyuka.com';
    let mails = 0;
    for (const u of optedIn.docs) {
        const uid = u.id;
        try {
            const items = [...(map.get(uid) ?? [])];
            // 前日 8 時以降の、まだ読んでいない担当の通知（担当はその場で届くのでこの実行の分には入らない）
            const assigned = await db.collection(`users/${uid}/notifications`)
                .where('createdAt', '>', now - 24 * 3600 * 1000)
                .limit(50)
                .get();
            for (const d of assigned.docs) {
                const n = d.data();
                if (n.type === 'teamTaskAssigned' && !n.read)
                    items.push({ type: n.type, title: n.title, body: n.body, link: n.link });
            }
            if (!items.length)
                continue;
            // 同じ日に 2 回送らない（定期実行が重なったとき）
            const mark = db.doc(`users/${uid}/digestLog/${today}`);
            if ((await mark.get()).exists)
                continue;
            const email = u.data().email || (await admin.auth().getUser(uid)).email;
            if (!email)
                continue;
            const { subject, text } = digestText(items, today);
            if (!transport) {
                console.log('[digest] (dry-run) to=%s subject=%s', email, subject);
                continue;
            }
            await transport.sendMail({ from, to: email, subject, text });
            // 送った印（ベルの通知とは別の場所に置く）
            await mark.set({ subject, count: items.length, sentAt: Date.now() });
            mails++;
        }
        catch (e) {
            console.error('[digest]', uid, e);
        }
    }
    return mails;
}
//# sourceMappingURL=notifications.js.map