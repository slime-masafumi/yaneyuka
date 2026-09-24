// firestore.rules の検証用スクリプト（使い捨て。検証後に削除する）
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';

const app = initializeApp({ apiKey: 'fake-api-key', projectId: 'testsite-7f2a6' });
const auth = getAuth(app);
const db = getFirestore(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8080);

const results = [];
async function check(label, expected, fn) {
  let actual = 'allow';
  try { await fn(); } catch (e) {
    actual = String(e?.code || e?.message || e).includes('permission-denied') ? 'deny' : `error(${e?.code || e?.message})`;
  }
  const pass = actual === expected;
  results.push({ label, expected, actual, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}  (期待:${expected} 実際:${actual})`);
}

async function as(email) {
  await signOut(auth).catch(() => {});
  try { await createUserWithEmailAndPassword(auth, email, 'passw0rd!'); }
  catch { await signInWithEmailAndPassword(auth, email, 'passw0rd!'); }
  return auth.currentUser.uid;
}

const POST = 'test-post-1';

// --- 攻撃者A（投稿者）と攻撃者B（第三者）を用意 ---
const uidA = await as('alice@example.com');

await check('A: 自分のuidで投稿を作成', 'allow', () =>
  setDoc(doc(db, 'forumPosts', POST), { title: 't', author: 'alice', category: 'c', content: 'original', date: '2026-08-02', createdAt: Date.now(), uid: uidA }));

await check('A: 他人(uid=stranger)になりすまして作成', 'deny', () =>
  setDoc(doc(db, 'forumPosts', 'spoofed'), { title: 't', author: 'x', category: 'c', content: 'x', date: '2026-08-02', createdAt: Date.now(), uid: 'stranger' }));

await check('A: 自分の投稿を更新', 'allow', () =>
  updateDoc(doc(db, 'forumPosts', POST), { content: 'edited by owner' }));

await check('A: 自分の投稿に返信', 'allow', () =>
  setDoc(doc(db, 'forumPosts', POST, 'replies', 'r1'), { author: 'alice', content: 'reply', createdAt: Date.now(), uid: uidA }));

const uidB = await as('mallory@example.com');

await check('B: 他人(A)の投稿を書き換え  ★今回の修正対象', 'deny', () =>
  updateDoc(doc(db, 'forumPosts', POST), { content: 'HIJACKED' }));

await check('B: 他人(A)の投稿の uid を自分に付け替え', 'deny', () =>
  updateDoc(doc(db, 'forumPosts', POST), { uid: uidB }));

await check('B: 他人(A)の投稿を削除', 'deny', () =>
  deleteDoc(doc(db, 'forumPosts', POST)));

await check('B: 他人(A)の返信を書き換え  ★今回の修正対象', 'deny', () =>
  updateDoc(doc(db, 'forumPosts', POST, 'replies', 'r1'), { content: 'HIJACKED' }));

await check('B: 自分のuidで投稿を作成', 'allow', () =>
  setDoc(doc(db, 'forumPosts', 'test-post-2'), { title: 't', author: 'mallory', category: 'c', content: 'ok', date: '2026-08-02', createdAt: Date.now(), uid: uidB }));

// 未ログインでも閲覧できること（掲示板の要件）
await signOut(auth);
await check('未ログイン: 投稿の閲覧', 'allow', () => getDoc(doc(db, 'forumPosts', POST)));
await check('未ログイン: 投稿の書き換え', 'deny', () =>
  updateDoc(doc(db, 'forumPosts', POST), { content: 'anon hijack' }));

// A の投稿が改竄されていないことを最終確認
const finalSnap = await getDoc(doc(db, 'forumPosts', POST));
const content = finalSnap.data()?.content;
console.log(`\n最終確認: A の投稿本文 = "${content}"`);
const intact = content === 'edited by owner';
console.log(intact ? '  → 改竄されていない' : '  → ★改竄された★');

// ===== 掲示板の通報 (forumReports/*) =====
console.log('\n--- 掲示板の通報 ---');
await as('mallory@example.com');
const myUid = auth.currentUser.uid;

await check('通報を作成（正規の利用）', 'allow', () =>
  setDoc(doc(db, 'forumReports', 'rep1'), {
    reporterUid: myUid, postId: POST, replyId: '', reason: '宣伝目的の投稿', createdAt: new Date(), status: 'open',
  }));
await check('他人になりすまして通報', 'deny', () =>
  setDoc(doc(db, 'forumReports', 'rep2'), {
    reporterUid: 'someone-else', postId: POST, replyId: '', reason: 'x', createdAt: new Date(), status: 'open',
  }));
await check('status を勝手に対応済みにする', 'deny', () =>
  setDoc(doc(db, 'forumReports', 'rep3'), {
    reporterUid: myUid, postId: POST, replyId: '', reason: 'x', createdAt: new Date(), status: 'closed',
  }));
await check('自分が出した通報を読む  ★管理者以外は読めない', 'deny', () =>
  getDoc(doc(db, 'forumReports', 'rep1')));
await check('通報を消して揉み消す', 'deny', () =>
  deleteDoc(doc(db, 'forumReports', 'rep1')));

await signOut(auth);
await check('未ログイン: 通報の作成', 'deny', () =>
  setDoc(doc(db, 'forumReports', 'rep4'), {
    reporterUid: 'anon', postId: POST, replyId: '', reason: 'x', createdAt: new Date(), status: 'open',
  }));

// ===== 使用量メトリクス (usage/*) =====
console.log('\n--- 使用量メトリクス ---');
const uidC = await as('carol@example.com');
const MB50 = 52428800;

await check('C: 自分の使用量を作成', 'allow', () =>
  setDoc(doc(db, 'usage', `${uidC}_202608`), { uploadedBytes: 1000 }));
await check('C: 自分の使用量を加算', 'allow', () =>
  setDoc(doc(db, 'usage', `${uidC}_202608`), { uploadedBytes: 2000 }));
await check('C: 一度に50MB超を加算', 'deny', () =>
  setDoc(doc(db, 'usage', `${uidC}_202608`), { uploadedBytes: 2000 + MB50 + 1 }));
await check('C: 使用量を減らして枠を回復', 'deny', () =>
  setDoc(doc(db, 'usage', `${uidC}_202608`), { uploadedBytes: 0 }));
await check('C: 他人の使用量を書き換え', 'deny', () =>
  setDoc(doc(db, 'usage', `${uidA}_202608`), { uploadedBytes: 999 }));
await check('C: サイト全体の使用量を加算（正規の利用）', 'allow', () =>
  setDoc(doc(db, 'usage', 'site_202608'), { uploadedBytes: 3000 }));
await check('C: サイト全体の使用量を巨大な値に改竄  ★今回の修正対象', 'deny', () =>
  setDoc(doc(db, 'usage', 'site_202608'), { uploadedBytes: 999999999999 }));
await check('C: 想定外フィールドを混入', 'deny', () =>
  setDoc(doc(db, 'usage', `${uidC}_202608`), { uploadedBytes: 2500, isAdmin: true }));

// ===== 共有リンク (shareLinks) =====
console.log('\n--- ファイル転送の共有リンク ---');
const uidS = await as('sam@example.com');
await check('S: 自分の共有リンクを作成', 'allow', () =>
  setDoc(doc(db, 'shareLinks', 'ABCD2345'), {
    owner: uidS, fileId: 'f1', path: `userUploads/${uidS}/f1`,
    downloadUrl: 'https://example.com/f1?token=secret', fileName: 'a.pdf', size: 1234,
    createdAt: new Date(), expiresAt: null, retentionDays: 7,
  }));

await signOut(auth); // 共有リンクの受け取り手（未ログイン）
await check('未ログイン: コードを知って単体取得（正規の利用）', 'allow', () =>
  getDoc(doc(db, 'shareLinks', 'ABCD2345')));
// コレクションを丸ごと引ければ、全ユーザーのファイルのダウンロードURLが取れてしまう
await check('未ログイン: 共有リンクを一覧取得  ★今回の修正対象', 'deny', () =>
  getDocs(collection(db, 'shareLinks')));

// ===== 公開スケジュールの回答 (schedules/*/participants, responses) =====
console.log('\n--- 公開スケジュールの回答 ---');
await as('alice@example.com');
const SCHED = 'public-schedule-1';
await check('A: 公開スケジュールを作成', 'allow', () =>
  setDoc(doc(db, 'schedules', SCHED), { ownerUid: uidA, isPublic: true, title: '打合せ' }));

await signOut(auth); // ここから未ログイン（公開スケジュールの想定利用者）
await check('未ログイン: 参加者として登録（正規の利用）', 'allow', () =>
  setDoc(doc(db, 'schedules', SCHED, 'participants', 'p1'), { name: '山田', comment: 'よろしく', createdAt: new Date(), updatedAt: new Date() }));
await check('未ログイン: 回答を送信（正規の利用）', 'allow', () =>
  setDoc(doc(db, 'schedules', SCHED, 'responses', 'r1'), { participantId: 'p1', optionId: 'o1', value: 'ok' }));
await check('未ログイン: 巨大な名前を登録  ★今回の修正対象', 'deny', () =>
  setDoc(doc(db, 'schedules', SCHED, 'participants', 'p2'), { name: 'x'.repeat(100000), createdAt: new Date(), updatedAt: new Date() }));
await check('未ログイン: 想定外フィールドで容量を埋める  ★今回の修正対象', 'deny', () =>
  setDoc(doc(db, 'schedules', SCHED, 'participants', 'p3'), { name: '山田', payload: 'x'.repeat(100000), createdAt: new Date(), updatedAt: new Date() }));
await check('未ログイン: 回答に巨大な値を入れる  ★今回の修正対象', 'deny', () =>
  setDoc(doc(db, 'schedules', SCHED, 'responses', 'r2'), { participantId: 'p1', optionId: 'o1', value: 'x'.repeat(100000) }));
await check('未ログイン: 参加者を削除', 'deny', () =>
  deleteDoc(doc(db, 'schedules', SCHED, 'participants', 'p1')));

// 共有URL（=ドキュメントID）を知っていれば開ける必要がある
await check('未ログイン: 共有URLから単体取得（正規の利用）', 'allow', () =>
  getDoc(doc(db, 'schedules', SCHED)));

// URLを知らない第三者が公開スケジュールを総なめできてはいけない
await check('未ログイン: 公開スケジュールを列挙  ★今回の修正対象', 'deny', () =>
  getDocs(query(collection(db, 'schedules'), where('isPublic', '==', true))));

const uidD = await as('trudy@example.com');
await check('D: 他人の公開スケジュールを列挙  ★今回の修正対象', 'deny', () =>
  getDocs(query(collection(db, 'schedules'), where('isPublic', '==', true))));
await check('D: 自分のスケジュール一覧を取得（正規の利用）', 'allow', () =>
  getDocs(query(collection(db, 'schedules'), where('ownerUid', '==', uidD))));

// ScheduleTool は新しい共有URLを発行する前に「その slug が未使用か」を getDoc で確認する。
// 存在しないドキュメントの get が deny だと、スケジュールが1件も作成できない。
await check('D: 未使用slugの空き確認（新規作成の前提）  ★今回の修正対象', 'allow', () =>
  getDoc(doc(db, 'schedules', 'NoSuchSlug1')));
await signOut(auth);
await check('未ログイン: 未使用slugを総当たりで探索', 'deny', () =>
  getDoc(doc(db, 'schedules', 'NoSuchSlug2')));

// ===== 回答期限を過ぎたスケジュール =====
console.log('\n--- 回答期限（締切）後の書き込み ---');
await as('alice@example.com');
const CLOSED = 'closed-schedule-1';
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
await check('A: 締切が過ぎた公開スケジュールを作成', 'allow', () =>
  setDoc(doc(db, 'schedules', CLOSED), { ownerUid: uidA, isPublic: true, title: '締切済', deadline: yesterday }));
// 主催者は締切後も参加者を追加・修正できる必要がある
await check('A(主催者): 締切後に参加者を追加（正規の利用）', 'allow', () =>
  setDoc(doc(db, 'schedules', CLOSED, 'participants', 'p1'), { name: '山田', createdAt: new Date(), updatedAt: new Date() }));

await signOut(auth);
await check('未ログイン: 締切後に参加者として登録  ★今回の修正対象', 'deny', () =>
  setDoc(doc(db, 'schedules', CLOSED, 'participants', 'p9'), { name: '遅刻', createdAt: new Date(), updatedAt: new Date() }));
await check('未ログイン: 締切後に回答を送信  ★今回の修正対象', 'deny', () =>
  setDoc(doc(db, 'schedules', CLOSED, 'responses', 'r9'), { participantId: 'p1', optionId: 'o1', value: 'ok' }));
// 締切が無いスケジュールはこれまで通り回答できる
await check('未ログイン: 締切なしのスケジュールには回答できる（回帰確認）', 'allow', () =>
  setDoc(doc(db, 'schedules', SCHED, 'responses', 'r3'), { participantId: 'p1', optionId: 'o2', value: 'ng' }));

// ===== 表計算シートの閲覧専用公開 =====
console.log('\n--- 表計算シートの共有 ---');
const uidSheet = await as('sheetowner@example.com');
await check('所有者: シートを公開', 'allow', () =>
  setDoc(doc(db, 'sheetShares', 'SHEETCODE1'), {
    owner: uidSheet, sheetId: 'default', name: '見積書', rows: 20, cols: 10,
    cells: { R0C0: '合計' }, formats: {}, merges: [], condRules: [], colWidths: [96],
    createdAt: new Date(), updatedAt: new Date(),
  }));
await check('所有者: 想定外フィールドを混入', 'deny', () =>
  setDoc(doc(db, 'sheetShares', 'SHEETCODE2'), {
    owner: uidSheet, sheetId: 'default', name: 'x', rows: 1, cols: 1,
    cells: {}, formats: {}, merges: [], condRules: [], colWidths: [],
    createdAt: new Date(), updatedAt: new Date(), payload: 'x'.repeat(1000),
  }));

const uidOther = await as('sheetstranger@example.com');
await check('第三者: 他人名義で公開', 'deny', () =>
  setDoc(doc(db, 'sheetShares', 'SHEETCODE3'), {
    owner: uidSheet, sheetId: 'x', name: 'なりすまし', rows: 1, cols: 1,
    cells: {}, formats: {}, merges: [], condRules: [], colWidths: [],
    createdAt: new Date(), updatedAt: new Date(),
  }));
await check('第三者: 公開済みシートを書き換え', 'deny', () =>
  setDoc(doc(db, 'sheetShares', 'SHEETCODE1'), {
    owner: uidOther, sheetId: 'x', name: '改竄', rows: 1, cols: 1,
    cells: {}, formats: {}, merges: [], condRules: [], colWidths: [],
    createdAt: new Date(), updatedAt: new Date(),
  }));
await check('第三者: 公開済みシートを削除', 'deny', () =>
  deleteDoc(doc(db, 'sheetShares', 'SHEETCODE1')));

await signOut(auth);
await check('未ログイン: コードを知って閲覧（正規の利用）', 'allow', () =>
  getDoc(doc(db, 'sheetShares', 'SHEETCODE1')));
await check('未ログイン: 公開シートを一覧取得', 'deny', () =>
  getDocs(collection(db, 'sheetShares')));

// ===== ダウンロード計測ガード（サーバー専用コレクション） =====
console.log('\n--- ダウンロード計測ガード ---');
await check('未ログイン: 計測マーカーを読む', 'deny', () =>
  getDoc(doc(db, 'shareDownloadMarks', 'ABCD2345_x_2026083100')));
await check('未ログイン: 計測マーカーを書き換えて計測を無効化', 'deny', () =>
  setDoc(doc(db, 'shareDownloadMarks', 'ABCD2345_x_2026083100'), { createdAt: new Date() }));
await check('未ログイン: 日次カウンタを書き換え', 'deny', () =>
  setDoc(doc(db, 'shareDownloadDaily', 'ABCD2345_20260831'), { count: 0 }));

// ===== yychat: 2人の部屋とグループ =====
console.log('\n--- yychat ---');
const uidC1 = await as('chat-c1@example.com');
const uidC3 = await as('chat-c3@example.com');
const uidC4 = await as('chat-c4@example.com');
const uidC2 = await as('chat-c2@example.com');
await check('2人の部屋を作る', 'allow', () =>
  setDoc(doc(db, 'chatRooms', 'pair1'), { participants: [uidC2, uidC1], participantUsernames: {}, createdAt: new Date(), lastActivityAt: new Date() }));
await check('3人の部屋を「グループ」と名乗らずに作る', 'deny', () =>
  setDoc(doc(db, 'chatRooms', 'g0'), { participants: [uidC2, uidC1, uidC3], participantUsernames: {}, createdAt: new Date() }));
await check('他人を作成者にしてグループを作る', 'deny', () =>
  setDoc(doc(db, 'chatRooms', 'g0'), { participants: [uidC2, uidC1, uidC3], isGroup: true, ownerUid: uidC1, participantUsernames: {}, createdAt: new Date() }));
await check('3人のグループを作る', 'allow', () =>
  setDoc(doc(db, 'chatRooms', 'g1'), { participants: [uidC2, uidC1, uidC3], isGroup: true, ownerUid: uidC2, name: 'A邸 定例', participantUsernames: {}, createdAt: new Date(), lastActivityAt: new Date() }));
await check('21人のグループは作れない', 'deny', () =>
  setDoc(doc(db, 'chatRooms', 'g2'), { participants: [uidC2, ...Array.from({ length: 20 }, (_, i) => 'u' + i)], isGroup: true, ownerUid: uidC2, participantUsernames: {}, createdAt: new Date() }));
await check('作った人がメンバーを足す', 'allow', () =>
  updateDoc(doc(db, 'chatRooms', 'g1'), { participants: [uidC2, uidC1, uidC3, uidC4] }));
await check('2人の部屋に3人目を足す', 'deny', () =>
  updateDoc(doc(db, 'chatRooms', 'pair1'), { participants: [uidC2, uidC1, uidC3] }));
await as('chat-c1@example.com');
await check('メンバー: グループのメッセージを書く', 'allow', () =>
  setDoc(doc(db, 'chatRooms', 'g1', 'messages', 'm1'), { senderId: uidC1, senderUsername: 'c1', content: 'こんにちは', createdAt: new Date(), readBy: [uidC1] }));
await check('メンバー: 最終メッセージ・未読を更新', 'allow', () =>
  updateDoc(doc(db, 'chatRooms', 'g1'), { lastActivityAt: new Date(), [`unreadCount.${uidC3}`]: 1 }));
await check('作った人以外がメンバーを外す', 'deny', () =>
  updateDoc(doc(db, 'chatRooms', 'g1'), { participants: [uidC2, uidC1] }));
await check('作った人以外が作成者を自分に付け替え', 'deny', () =>
  updateDoc(doc(db, 'chatRooms', 'g1'), { ownerUid: uidC1 }));
await as('chat-c4@example.com');
await check('後から足された人: メッセージを読む', 'allow', () =>
  getDoc(doc(db, 'chatRooms', 'g1', 'messages', 'm1')));
await as('mallory@example.com');
await check('部外者: グループを読む', 'deny', () => getDoc(doc(db, 'chatRooms', 'g1')));
await check('部外者: グループに書き込む', 'deny', () =>
  setDoc(doc(db, 'chatRooms', 'g1', 'messages', 'm2'), { senderId: uidB, content: 'x', createdAt: new Date() }));

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} 件成功`);
process.exit(failed === 0 && intact ? 0 : 1);
