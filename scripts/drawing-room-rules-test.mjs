// OLMT 図面ボードの firestore.rules / storage.rules の検証。
//   npm run test:drawing-room-rules
// 攻撃の筋書き: 部屋の一覧を覗く / 他人の名前で赤入れ / 他人の赤入れを消す / 部屋の設定を乗っ取る
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, collection } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, ref, uploadBytes, getBytes } from 'firebase/storage';

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

const ROOM = 'abcdefghijkmnpqrstuvwxyz'; // 24文字
const room = () => doc(db, 'drawingRooms', ROOM);

const owner = await as('owner@example.com');
await check('オーナー: 部屋を作る', 'allow', () => setDoc(room(), { ownerUid: owner, title: '定例', createdAt: Date.now() }));
await check('オーナー: 短い ID の部屋は作れない', 'deny', () => setDoc(doc(db, 'drawingRooms', 'short'), { ownerUid: owner, title: 'x' }));
await check('オーナー: 他人名義の部屋は作れない', 'deny', () => setDoc(doc(db, 'drawingRooms', 'zzzzzzzzzzzzzzzzzzzzzzzz'), { ownerUid: 'someone', title: 'x' }));
await check('オーナー: 赤入れ', 'allow', () => setDoc(doc(db, 'drawingRooms', ROOM, 'strokes', 's-owner'), { uid: owner, page: 1, pts: [0.1, 0.1, 0.2, 0.2], color: '#e00' }));
await check('オーナー: 図面 PDF を上げる', 'allow', () => uploadBytes(ref(storage, `drawingRooms/${ROOM}/f1.pdf`), new Uint8Array([37, 80, 68, 70]), { contentType: 'application/pdf' }));
await check('オーナー: PDF 以外は上げられない', 'deny', () => uploadBytes(ref(storage, `drawingRooms/${ROOM}/x.html`), new Uint8Array([60]), { contentType: 'text/html' }));

const guest = await as('guest@example.com');
await check('参加者: リンクの部屋を開ける', 'allow', () => getDoc(room()));
await check('参加者: 部屋の一覧は覗けない', 'deny', () => getDocs(collection(db, 'drawingRooms')));
await check('参加者: 図面 PDF を読める', 'allow', () => getBytes(ref(storage, `drawingRooms/${ROOM}/f1.pdf`)));
await check('参加者: 自分の名前で赤入れ', 'allow', () => setDoc(doc(db, 'drawingRooms', ROOM, 'strokes', 's-guest'), { uid: guest, page: 1, pts: [0.3, 0.3], color: '#00e' }));
await check('参加者: 他人の名前で赤入れ', 'deny', () => setDoc(doc(db, 'drawingRooms', ROOM, 'strokes', 's-spoof'), { uid: owner, page: 1, pts: [0.3, 0.3] }));
await check('参加者: 巨大な線は書けない', 'deny', () => setDoc(doc(db, 'drawingRooms', ROOM, 'strokes', 's-big'), { uid: guest, page: 1, pts: Array(4002).fill(0.5) }));
await check('参加者: オーナーの赤入れを消せない', 'deny', () => deleteDoc(doc(db, 'drawingRooms', ROOM, 'strokes', 's-owner')));
await check('参加者: 赤入れを書き換えられない', 'deny', () => updateDoc(doc(db, 'drawingRooms', ROOM, 'strokes', 's-guest'), { color: '#000' }));
await check('参加者: 自分の赤入れは消せる', 'allow', () => deleteDoc(doc(db, 'drawingRooms', ROOM, 'strokes', 's-guest')));
await check('参加者: 部屋の設定を変えられない', 'deny', () => updateDoc(room(), { title: '乗っ取り' }));
await check('参加者: 部屋を消せない', 'deny', () => deleteDoc(room()));
await check('参加者: 自分のポインタ', 'allow', () => setDoc(doc(db, 'drawingRooms', ROOM, 'presence', guest), { x: 0.5, y: 0.5, page: 1, name: 'g' }));
await check('参加者: 他人のポインタは動かせない', 'deny', () => setDoc(doc(db, 'drawingRooms', ROOM, 'presence', owner), { x: 0, y: 0 }));
await check('参加者: 決定事項を書く', 'allow', () => setDoc(doc(db, 'drawingRooms', ROOM, 'decisions', 'd-guest'), { uid: guest, text: '外壁 B 案', kind: 'decision', done: false }));
await check('参加者: 他人名義の決定事項は書けない', 'deny', () => setDoc(doc(db, 'drawingRooms', ROOM, 'decisions', 'd-spoof'), { uid: owner, text: 'x' }));

await as('owner@example.com');
await check('オーナー: 参加者の決定事項に済の印', 'allow', () => updateDoc(doc(db, 'drawingRooms', ROOM, 'decisions', 'd-guest'), { done: true }));
await check('オーナー: 決定事項の書き手は変えられない', 'deny', () => updateDoc(doc(db, 'drawingRooms', ROOM, 'decisions', 'd-guest'), { uid: owner }));
await check('オーナー: 参加者の赤入れを消せる', 'allow', async () => {
  await as('guest@example.com');
  await setDoc(doc(db, 'drawingRooms', ROOM, 'strokes', 's-guest2'), { uid: guest, page: 1, pts: [0.4, 0.4] });
  await as('owner@example.com');
  await deleteDoc(doc(db, 'drawingRooms', ROOM, 'strokes', 's-guest2'));
});
await check('オーナー: 会議を始める（部屋の更新）', 'allow', () => updateDoc(room(), { currentSession: 's1' }));
await check('オーナー: 持ち主は変えられない', 'deny', () => updateDoc(room(), { ownerUid: 'someone' }));

await signOut(auth);
await check('未ログイン: 部屋を開けない', 'deny', () => getDoc(room()));
await check('未ログイン: 図面を読めない', 'deny', () => getBytes(ref(storage, `drawingRooms/${ROOM}/f1.pdf`)));

console.log(failed ? `\n${failed} 件 FAIL` : '\nすべて PASS');
process.exit(failed ? 1 : 0);
