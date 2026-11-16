// 手元の試験用 Firebase(エミュレータ)に試験用の会員を 2 人作る。2026-11-16
//   npm run emulators   (別の端末で)
//   node scripts/emulator-seed.mjs
//   npm run dev:emu     → http://localhost:3200 で下の会員でログインして試す
// エミュレータの中だけの会員で、本番には存在しない。メールは確認済みにする(相手探しの索引が確認済みを条件にするため)。
const AUTH = 'http://127.0.0.1:9099';
const PROJECT = 'testsite-7f2a6';
export const SEED_USERS = [
  { email: 'emu-alice@example.com', password: 'emu-pass-alice-1', displayName: 'エミュ 有栖' },
  { email: 'emu-bob@example.com', password: 'emu-pass-bob-1', displayName: 'エミュ 坊' },
];

for (const u of SEED_USERS) {
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: u.email, password: u.password, displayName: u.displayName, returnSecureToken: true }),
  });
  const j = await res.json();
  if (j.error && !String(j.error.message).includes('EMAIL_EXISTS')) throw new Error(`${u.email}: ${j.error.message}`);
  // メールを確認済みにする(エミュレータの管理 API。Bearer owner はエミュレータ専用)
  const signIn = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: u.email, password: u.password, returnSecureToken: true }),
  }).then((r) => r.json());
  const localId = signIn.localId;
  if (localId) {
    await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ localId, emailVerified: true, displayName: u.displayName }),
    });
  }
  console.log(`ok ${u.email} ${localId ?? ''}`);
}
