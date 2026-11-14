// users を他人が読めないこと・publicProfiles / userDirectory の読み書きの範囲を emulator で確かめる。
//   npx firebase emulators:exec --only firestore,auth --project testsite-7f2a6 "node scripts/user-directory-rules-test.mjs"
// 引数 --report を付けると、期待と違っても終了コード 0 で一覧だけ出す（ルールを変える前の挙動を見る用）。
import { initializeApp } from 'firebase/app';
import {
  getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  sendEmailVerification, applyActionCode,
} from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, getDocs, collection, query, where,
} from 'firebase/firestore';

const PROJECT = 'testsite-7f2a6';
const app = initializeApp({ apiKey: 'fake-api-key', projectId: PROJECT });
const auth = getAuth(app);
const db = getFirestore(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8080);

const reportOnly = process.argv.includes('--report');
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

async function as(email, { verified = true } = {}) {
  await signOut(auth).catch(() => {});
  try { await createUserWithEmailAndPassword(auth, email, 'passw0rd!'); }
  catch { await signInWithEmailAndPassword(auth, email, 'passw0rd!'); }
  if (verified && !auth.currentUser.emailVerified) {
    await sendEmailVerification(auth.currentUser);
    const res = await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/oobCodes`).then((r) => r.json());
    const code = (res.oobCodes || []).filter((c) => c.email === email && c.requestType === 'VERIFY_EMAIL').pop();
    await applyActionCode(auth, code.oobCode);
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
  }
  return auth.currentUser.uid;
}

// --- A: 確認済みの会員。自分の users・公開用・索引を書く ---
const uidA = await as('alice@example.com');
await check('A: 自分の users を書く', 'allow', () => setDoc(doc(db, 'users', uidA), { email: 'alice@example.com', displayName: 'alice', role: 'user' }));
await check('A: 自分の users を読む', 'allow', () => getDoc(doc(db, 'users', uidA)));
await check('A: 自分の公開用の名前を書く', 'allow', () => setDoc(doc(db, 'publicProfiles', uidA), { displayName: 'alice', avatarUrl: null }));
await check('A: 自分のメールの索引を書く', 'allow', () => setDoc(doc(db, 'userDirectory', 'alice@example.com'), { uid: uidA }));

// --- B: ほかの会員 ---
const uidB = await as('bob@example.com');
await check('B: users を全件一覧する  ★今回の修正対象', 'deny', () => getDocs(collection(db, 'users')));
await check('B: users をメールで絞って一覧する', 'deny', () => getDocs(query(collection(db, 'users'), where('email', '==', 'alice@example.com'))));
await check('B: 他人(A)の users を 1 件読む（メール・role が入っている）', 'deny', () => getDoc(doc(db, 'users', uidA)));
await check('B: 他人(A)の名前・アイコンを uid で読む', 'allow', () => getDoc(doc(db, 'publicProfiles', uidA)));
await check('B: 公開用の名前を全件一覧する', 'deny', () => getDocs(collection(db, 'publicProfiles')));
await check('B: メールの完全一致で A を引く', 'allow', () => getDoc(doc(db, 'userDirectory', 'alice@example.com')));
await check('B: メールの索引を全件一覧する', 'deny', () => getDocs(collection(db, 'userDirectory')));
await check('B: A のメールの行を自分の uid に書き換える（なりすまし）', 'deny', () => setDoc(doc(db, 'userDirectory', 'alice@example.com'), { uid: uidB }));
await check('B: 他人のメールで行を作る', 'deny', () => setDoc(doc(db, 'userDirectory', 'carol@example.com'), { uid: uidB }));
await check('B: 自分のメールの行を書く', 'allow', () => setDoc(doc(db, 'userDirectory', 'bob@example.com'), { uid: uidB }));
await check('B: 自分の行にメールなど余計な項目を足す', 'deny', () => setDoc(doc(db, 'userDirectory', 'bob@example.com'), { uid: uidB, email: 'bob@example.com' }));
await check('B: 他人(A)の公開用の名前を書き換える', 'deny', () => setDoc(doc(db, 'publicProfiles', uidA), { displayName: 'HIJACKED' }));
await check('B: 自分の公開用にメールを載せる', 'deny', () => setDoc(doc(db, 'publicProfiles', uidB), { displayName: 'bob', email: 'bob@example.com' }));
await check('B: 自分の公開用の名前を書く', 'allow', () => setDoc(doc(db, 'publicProfiles', uidB), { displayName: 'bob', avatarUrl: null }));

// --- C: メール未確認 ---
const uidC = await as('carol@example.com', { verified: false });
await check('C(未確認): 自分のメールの行を作る', 'deny', () => setDoc(doc(db, 'userDirectory', 'carol@example.com'), { uid: uidC }));
await check('C(未確認): 自分の公開用の名前を書く', 'allow', () => setDoc(doc(db, 'publicProfiles', uidC), { displayName: 'carol' }));

// --- 未ログイン ---
await signOut(auth);
await check('未ログイン: 名前を読む', 'deny', () => getDoc(doc(db, 'publicProfiles', uidA)));
await check('未ログイン: メールで引く', 'deny', () => getDoc(doc(db, 'userDirectory', 'alice@example.com')));
await check('未ログイン: users を読む', 'deny', () => getDoc(doc(db, 'users', uidA)));

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} 件が期待どおり`);
process.exit(reportOnly || failed === 0 ? 0 : 1);
