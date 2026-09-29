// 通知関数のテスト（Firestore エミュレータで実行）。
//   firebase emulators:exec --only firestore "node functions/test/notifications.test.js"
const admin = require('firebase-admin');
admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'testsite-7f2a6' });
const { notifyTaskAssignee, sendDeadlineReminders } = require('../lib/notifications');

const db = admin.firestore();
// firebase-functions-test を足さずに済むよう、Change とスナップショットは最小限の形で作る
const fft = {
  wrap: (fn) => (change, ctx) => fn.run(change, ctx),
  makeChange: (before, after) => ({ before, after }),
  firestore: { makeDocumentSnapshot: (data) => ({ exists: data !== null, data: () => data ?? undefined }) },
  cleanup: () => {},
};
let bad = 0;
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};
const notes = async (uid) => (await db.collection(`users/${uid}/notifications`).get()).docs.map((d) => d.data());
const ymd = (ms) => new Date(ms + 9 * 3600e3).toISOString().slice(0, 10);

(async () => {
  await db.doc('users/alice').set({ displayName: 'アリス' });
  await db.doc('users/bob').set({ displayName: 'ボブ' });
  await db.doc('boards/b1').set({ name: '○○邸', ownerUid: 'alice', memberUids: ['bob'] });

  // 担当の通知
  const wrapped = fft.wrap(notifyTaskAssignee);
  const snap = (data, path = 'boards/b1/tasks/t1') => fft.firestore.makeDocumentSnapshot(data, path);
  const empty = (path = 'boards/b1/tasks/t1') => fft.firestore.makeDocumentSnapshot(null, path);
  const ctx = (id) => ({ params: { boardId: 'b1', taskId: 't1' }, eventId: id });

  await wrapped(fft.makeChange(empty(), snap({ title: '確認申請図', assigneeUid: 'bob', assignedByUid: 'alice', dueDate: '2026-10-01', completed: false })), ctx('e1'));
  let n = await notes('bob');
  check('他人に付けたら届く', n.length, 1);
  check('文面', n[0] && [n[0].title, n[0].body, n[0].link], ['アリス さんがタスクの担当にしました', '○○邸：確認申請図（期限 2026-10-01）', '/?m=team-tasks']);

  await wrapped(fft.makeChange(empty(), snap({ title: '自分用', assigneeUid: 'alice', assignedByUid: 'alice', completed: false })), ctx('e2'));
  check('自分で自分に付けたら届かない', (await notes('alice')).length, 0);

  const before = snap({ title: '確認申請図', assigneeUid: 'bob', assignedByUid: 'alice', completed: false });
  await wrapped(fft.makeChange(before, snap({ title: '確認申請図（改）', assigneeUid: 'bob', assignedByUid: 'alice', completed: false })), ctx('e3'));
  check('担当が変わらない編集では届かない', (await notes('bob')).length, 1);

  await wrapped(fft.makeChange(empty(), snap({ title: 'x', assigneeUid: 'mallory', assignedByUid: 'alice', completed: false })), ctx('e4'));
  check('ボードの外の人には届かない', (await notes('mallory')).length, 0);

  // 締切リマインド
  const now = Date.now();
  const today = ymd(now), tomorrow = ymd(now + 86400e3), later = ymd(now + 5 * 86400e3);
  await db.doc('boards/b1/tasks/d1').set({ title: '今日の', dueDate: today, assigneeUid: 'bob', completed: false });
  await db.doc('boards/b1/tasks/d2').set({ title: '担当なし', dueDate: tomorrow, assigneeUid: null, completed: false });
  await db.doc('boards/b1/tasks/d3').set({ title: '済', dueDate: today, assigneeUid: 'bob', completed: true });
  await db.doc('boards/b1/tasks/d4').set({ title: '先', dueDate: later, assigneeUid: 'bob', completed: false });
  await db.doc('users/carol/mytasks/c1/tasks/m1').set({ content: '構造計算の差し替え', dueDate: tomorrow, completed: false });
  await db.doc('schedules/s1').set({ title: '定例', ownerUid: 'carol', deadline: admin.firestore.Timestamp.fromMillis(now + 3 * 3600e3) });
  await db.doc('schedules/s1/participants/p1').set({ name: 'A' });
  await db.doc('schedules/s1/participants/p2').set({ name: 'B' });
  await db.doc('schedules/s2').set({ title: '来週', ownerUid: 'carol', deadline: admin.firestore.Timestamp.fromMillis(now + 3 * 86400e3) });
  await db.doc('users/carol/calendarEvents/e1').set({ title: '中間検査', date: tomorrow, category: '中間検査', spanPart: 'single' });
  await db.doc('users/carol/calendarEvents/e2').set({ title: '打合せ', date: today, category: '施主打合せ', remind: true });
  await db.doc('users/carol/calendarEvents/e3').set({ title: 'ただの予定', date: today, category: '個人' });
  await db.doc('users/carol/calendarEvents/e4').set({ title: '通知を切った検査', date: today, category: '完了検査', remind: false });
  await db.doc('users/carol/notifications/old').set({ title: '古い', createdAt: now - 90 * 86400e3, read: true });

  const run = () => sendDeadlineReminders.run({ scheduleTime: new Date().toISOString() });
  await run();
  const bob = (await notes('bob')).map((x) => x.title).sort();
  check('bob: 担当1件＋今日が期限（済・先は除く）', bob, ['Teamタスク：今日が期限です', 'アリス さんがタスクの担当にしました']);
  check('担当なしはボードの持ち主へ', (await notes('alice')).map((x) => x.title), ['Teamタスク：明日が期限です']);
  const carol = await notes('carol');
  check('Myタスク・通知付きと期限の予定・24時間以内のスケ調だけ・古い通知は消える', carol.map((x) => x.title).sort(), ['Myカレンダー：今日の予定', 'Myカレンダー：明日の予定', 'Myタスク：明日が期限です', 'スケジュール調整：締切まで 24 時間を切りました']);
  check('スケ調に回答人数', carol.find((x) => x.type === 'scheduleDeadline')?.body.includes('回答 2 人'), true);

  await db.doc(`users/bob/notifications/due-boards_b1_tasks_d1-${today}`).update({ read: true });
  await run();
  check('2回動いても増えない', (await notes('bob')).length, 2);
  check('既読が戻らない', (await db.doc(`users/bob/notifications/due-boards_b1_tasks_d1-${today}`).get()).data().read, true);

  console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
  fft.cleanup();
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
