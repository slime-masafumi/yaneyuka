// 既存会員の publicProfiles（名前・アイコン）と userDirectory（メール→uid の索引）を一度だけ埋める。
//
// firestore.rules で users を本人しか読めなくした（2026-11-15）ので、yychat・Teamタスクの相手の名前は
// publicProfiles から引く。ログインのたびに本人が書く（src/lib/AuthContext.tsx）が、ルールを出したあと
// まだログインしていない会員は名前が「名前未登録」になり、メールでも見つからない。それを埋める。
//
// 本番 DB に書く。足すだけ（消さない・users は触らない）。既定は件数を出すだけで書かない。
//   node --env-file=.env.local scripts/backfill-public-profiles.mjs          # 件数を見る（書かない）
//   node --env-file=.env.local scripts/backfill-public-profiles.mjs --apply  # 書く
//
// 索引には、Firebase Auth でメール確認済みの会員だけを載せる（ルールと同じ条件）。
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const apply = process.argv.includes('--apply');
const raw = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!raw) {
  console.error('サービスアカウントがありません（node --env-file=.env.local で渡す）');
  process.exit(1);
}
initializeApp({ credential: cert(JSON.parse(raw)) });
const db = getFirestore();
const auth = getAuth();

const users = await db.collection('users').get();
let profiles = 0;
let directory = 0;
let skippedUnverified = 0;
let batch = db.batch();
let inBatch = 0;
const flush = async () => {
  if (apply && inBatch) await batch.commit();
  batch = db.batch();
  inBatch = 0;
};

for (const d of users.docs) {
  const data = d.data();
  const displayName = typeof data.displayName === 'string' && data.displayName ? data.displayName.slice(0, 100) : null;
  const avatarUrl = typeof data.avatarUrl === 'string' && data.avatarUrl.length <= 400000 ? data.avatarUrl : null;
  batch.set(db.doc(`publicProfiles/${d.id}`), { displayName, avatarUrl, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  profiles++;
  inBatch++;

  let rec = null;
  try { rec = await auth.getUser(d.id); } catch { /* Auth に居ない（退会済み）なら索引に載せない */ }
  if (rec?.email && rec.emailVerified) {
    batch.set(db.doc(`userDirectory/${rec.email.trim().toLowerCase()}`), { uid: d.id, updatedAt: FieldValue.serverTimestamp() });
    directory++;
    inBatch++;
  } else if (rec?.email) {
    skippedUnverified++;
  }
  if (inBatch >= 400) await flush();
}
await flush();

console.log(`${apply ? '書いた' : '書く予定（--apply で書く）'}: publicProfiles ${profiles} 件 / userDirectory ${directory} 件（メール未確認で載せない ${skippedUnverified} 件）`);
