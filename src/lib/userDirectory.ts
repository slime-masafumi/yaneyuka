/**
 * 他の会員の名前・アイコンを引く／メールで相手を探すための置き場。
 *
 * 以前は users/{uid}（メール・role 入り）をログインした全員が読めて、yychat の相手選びが
 * getDocs(collection('users')) で全会員の表示名とメールを一覧していた（2026-11-15）。
 * 今は users は本人だけが読み、他人に見せてよいものだけを次の 2 つに分けて置く。
 *
 * - publicProfiles/{uid}   … 表示名とアイコンだけ。uid を知っている人が 1 件ずつ読む（一覧不可）
 * - userDirectory/{メール小文字} … uid だけ。メールを完全に知っている人が 1 件引く（一覧不可）
 *
 * どちらもログインのたびに本人が書く（AuthContext）。まだ書いていない人は名前が出ず、
 * メールでも見つからない。本番で一度だけ scripts/backfill-public-profiles.mjs を流すと埋まる。
 */
import { db } from '@/lib/firebaseClient';
import { deleteDoc, deleteField, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

export type PublicProfile = { uid: string; displayName: string | null; avatarUrl: string | null };

export const emailKey = (email: string) => email.trim().toLowerCase();

const cache = new Map<string, PublicProfile>();

/** ログインしたとき・名前を変えたときに、自分の公開用の名前と索引を書く */
export async function publishOwnProfile(user: {
  uid: string;
  email: string | null;
  emailVerified?: boolean;
  displayName: string | null;
  avatarUrl?: string | null;
}) {
  const profile: Record<string, unknown> = { displayName: user.displayName || null, updatedAt: serverTimestamp() };
  if (user.avatarUrl !== undefined) profile.avatarUrl = user.avatarUrl || null;
  await setDoc(doc(db, 'publicProfiles', user.uid), profile, { merge: true });
  cache.delete(user.uid);
  // 確認済みのメールだけ索引に載せる（ルールも同じ条件）
  if (user.email && user.emailVerified) {
    await setDoc(doc(db, 'userDirectory', emailKey(user.email)), { uid: user.uid, updatedAt: serverTimestamp() });
  }
}

/** 自分のアイコンを変える・消す。users（本人用）と publicProfiles（他人に見せる用）の両方に書く */
export async function setOwnAvatar(uid: string, url: string | null) {
  await setDoc(doc(db, 'users', uid), { avatarUrl: url ?? deleteField() }, { merge: true });
  await setDoc(doc(db, 'publicProfiles', uid), { avatarUrl: url, updatedAt: serverTimestamp() }, { merge: true });
  cache.delete(uid);
}

/** 退会のとき、公開用の名前と索引を消す */
export async function removeOwnProfile(uid: string, email: string | null) {
  try { await deleteDoc(doc(db, 'publicProfiles', uid)); } catch { /* 無ければそれで良い */ }
  if (email) {
    try { await deleteDoc(doc(db, 'userDirectory', emailKey(email))); } catch { /* 同上 */ }
  }
  cache.delete(uid);
}

/** uid から名前・アイコンを引く。読めない人（まだ一度もログインしていない等）は名前 null で返す */
export async function getPublicProfiles(uids: string[]): Promise<PublicProfile[]> {
  const unique = Array.from(new Set((uids || []).filter(Boolean)));
  return Promise.all(unique.map(async (uid) => {
    const hit = cache.get(uid);
    if (hit) return hit;
    try {
      const snap = await getDoc(doc(db, 'publicProfiles', uid));
      const d = snap.exists() ? (snap.data() as { displayName?: string | null; avatarUrl?: string | null }) : {};
      const p: PublicProfile = { uid, displayName: d.displayName || null, avatarUrl: d.avatarUrl || null };
      if (snap.exists()) cache.set(uid, p);
      return p;
    } catch {
      return { uid, displayName: null, avatarUrl: null };
    }
  }));
}

/** メールアドレスの完全一致で相手を 1 人探す。見つからなければ null（部分一致・一覧はしない） */
export async function findUserByExactEmail(email: string): Promise<PublicProfile | null> {
  const key = emailKey(email);
  if (!key || !key.includes('@')) return null;
  const snap = await getDoc(doc(db, 'userDirectory', key));
  if (!snap.exists()) return null;
  const uid = (snap.data() as { uid?: string }).uid;
  if (!uid) return null;
  const [p] = await getPublicProfiles([uid]);
  return p;
}
