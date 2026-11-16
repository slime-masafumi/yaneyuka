// yychat の添付(storage.rules の chatRooms/{roomId}/{senderId}/{fileName})の検証。2026-11-16
//   npm run test:chat-storage-rules
// 攻撃の筋書き: 部屋の外の人が読む / 他人の名前の場所に置く / HTML を置く / 20MB 超 / 他人の添付を消す・上書き
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage';

const app = initializeApp({ apiKey: 'fake-api-key', projectId: 'testsite-7f2a6', storageBucket: 'testsite-7f2a6.appspot.com' });
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8080);
connectStorageEmulator(storage, '127.0.0.1', 9199);

let failed = 0;
async function check(label, expected, fn) {
  let actual = 'allow';
  try {
    await fn();
  } catch (e) {
    const s = String(e?.code || e?.message || e);
    actual = s.includes('permission-denied') || s.includes('unauthorized') ? 'deny' : `error(${s})`;
  }
  const pass = actual === expected;
  if (!pass) failed++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}  (期待:${expected} 実際:${actual})`);
}
async function as(email) {
  await signOut(auth).catch(() => {});
  try { await createUserWithEmailAndPassword(auth, email, 'passw0rd!'); }
  catch { await signInWithEmailAndPassword(auth, email, 'passw0rd!'); }
  return auth.currentUser.uid;
}

const ROOM = 'chat-room-test-1';
const bytes = new Uint8Array([37, 80, 68, 70]);

const b = await as('bob@example.com');
const a = await as('alice@example.com');
await check('A: 2 人の部屋を作る', 'allow', () => setDoc(doc(db, 'chatRooms', ROOM), { participants: [a, b], createdAt: Date.now() }));
await check('A: 自分の場所に写真を置く', 'allow', () => uploadBytes(ref(storage, `chatRooms/${ROOM}/${a}/p1.jpg`), bytes, { contentType: 'image/jpeg' }));
await check('A: 自分の場所に PDF を置く', 'allow', () => uploadBytes(ref(storage, `chatRooms/${ROOM}/${a}/d1.pdf`), bytes, { contentType: 'application/pdf' }));
await check('A: 自分の添付を読む', 'allow', () => getBytes(ref(storage, `chatRooms/${ROOM}/${a}/p1.jpg`)));
await check('A: HTML は置けない', 'deny', () => uploadBytes(ref(storage, `chatRooms/${ROOM}/${a}/x.html`), bytes, { contentType: 'text/html' }));
await check('A: 20MB を超えるものは置けない', 'deny', () => uploadBytes(ref(storage, `chatRooms/${ROOM}/${a}/big.pdf`), new Uint8Array(20 * 1024 * 1024 + 1), { contentType: 'application/pdf' }));
await check('A: B の名前の場所には置けない', 'deny', () => uploadBytes(ref(storage, `chatRooms/${ROOM}/${b}/spoof.jpg`), bytes, { contentType: 'image/jpeg' }));
await check('A: 同じ名前で上書きはできない', 'deny', () => uploadBytes(ref(storage, `chatRooms/${ROOM}/${a}/p1.jpg`), bytes, { contentType: 'image/jpeg' }));
await check('A: 存在しない部屋には置けない', 'deny', () => uploadBytes(ref(storage, `chatRooms/no-such-room/${a}/p.jpg`), bytes, { contentType: 'image/jpeg' }));

await as('bob@example.com');
await check('B(参加者): A の写真を読む', 'allow', () => getBytes(ref(storage, `chatRooms/${ROOM}/${a}/p1.jpg`)));
await check('B(参加者): A の添付は消せない', 'deny', () => deleteObject(ref(storage, `chatRooms/${ROOM}/${a}/p1.jpg`)));
await check('B(参加者): 自分の場所に写真を置く', 'allow', () => uploadBytes(ref(storage, `chatRooms/${ROOM}/${b}/p2.jpg`), bytes, { contentType: 'image/jpeg' }));

const m = await as('mallory@example.com');
await check('M(部屋の外): A の写真は読めない', 'deny', () => getBytes(ref(storage, `chatRooms/${ROOM}/${a}/p1.jpg`)));
await check('M(部屋の外): 自分の uid でも部屋には置けない', 'deny', () => uploadBytes(ref(storage, `chatRooms/${ROOM}/${m}/x.jpg`), bytes, { contentType: 'image/jpeg' }));

await signOut(auth);
await check('未ログイン: 読めない', 'deny', () => getBytes(ref(storage, `chatRooms/${ROOM}/${a}/p1.jpg`)));

await as('alice@example.com');
await check('A: 自分の添付を消す', 'allow', () => deleteObject(ref(storage, `chatRooms/${ROOM}/${a}/d1.pdf`)));

console.log(failed ? `\n${failed} 件 FAIL` : '\nすべて PASS');
process.exit(failed ? 1 : 0);
