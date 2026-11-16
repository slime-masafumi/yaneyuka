/**
 * yychat の招待リンク(2026-11-16)。アカウントの無い相手にも URL を送り、無料の会員登録(またはログイン)の後に部屋へ入ってもらう。
 *
 *   chatInvites/{token}  { roomId, roomName, isGroup, createdBy, createdByName, createdAt, expiresAt }
 *
 * - 作れるのは部屋の参加者だけ。7 日で切れる。token は 24 文字の乱数(URL を知っている人だけが引ける。一覧は不可)
 * - グループの部屋: リンクから自分 1 人を足す(firestore.rules の chatRooms の update。joinedVia に token を書く)
 * - 2 人の部屋: 顔ぶれは変えられないので、招待した人と新しい 2 人の部屋を作る
 * - ログイン前に開いたときは token を sessionStorage に預け、ログイン後に yychat を開いたときに続きをする
 */
import { arrayUnion, collection, doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

export const INVITE_DAYS = 7;
const PENDING_KEY = 'yy-chat-invite';

export type ChatInvite = {
  token: string;
  roomId: string;
  roomName: string | null;
  isGroup: boolean;
  createdBy: string;
  createdByName: string | null;
  expiresAt: Date;
};

function randomToken(n = 24): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const buf = new Uint32Array(n);
  crypto.getRandomValues(buf);
  return Array.from(buf, (x) => chars[x % chars.length]).join('');
}

export function inviteUrl(token: string): string {
  return `${window.location.origin}/?m=yychat&invite=${token}`;
}

export async function createChatInvite(room: { id: string; name?: string | null; isGroup?: boolean }, uid: string, name: string): Promise<string> {
  const token = randomToken();
  await setDoc(doc(db, 'chatInvites', token), {
    roomId: room.id,
    roomName: (room.name || '').slice(0, 100) || null,
    isGroup: !!room.isGroup,
    createdBy: uid,
    createdByName: (name || '').slice(0, 100) || null,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + INVITE_DAYS * 24 * 3600 * 1000),
  });
  return token;
}

export async function readChatInvite(token: string): Promise<ChatInvite | null> {
  if (!/^[A-Za-z0-9]{20,40}$/.test(token)) return null;
  const snap = await getDoc(doc(db, 'chatInvites', token));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    token,
    roomId: d.roomId,
    roomName: d.roomName ?? null,
    isGroup: !!d.isGroup,
    createdBy: d.createdBy,
    createdByName: d.createdByName ?? null,
    expiresAt: d.expiresAt?.toDate?.() ?? new Date(0),
  };
}

/**
 * 招待を受ける。入った(または作った)部屋の id を返す。
 * グループ: 自分を参加者に足す。2 人の部屋: 招待した人と新しい部屋を作る(既にあればそれを使う)。
 */
export async function acceptChatInvite(
  inv: ChatInvite,
  me: { uid: string; username: string },
  existingDmWith: (uid: string) => string | null,
): Promise<string> {
  if (inv.expiresAt.getTime() < Date.now()) throw new Error('この招待リンクは期限(7 日)が切れています。送った人にもう一度出してもらってください');
  if (inv.createdBy === me.uid) throw new Error('自分が出した招待リンクです。相手に送ってください');
  if (inv.isGroup) {
    await updateDoc(doc(db, 'chatRooms', inv.roomId), {
      participants: arrayUnion(me.uid),
      [`participantUsernames.${me.uid}`]: me.username,
      joinedVia: inv.token,
    });
    return inv.roomId;
  }
  const dm = existingDmWith(inv.createdBy);
  if (dm) return dm;
  const ref = doc(collection(db, 'chatRooms'));
  await setDoc(ref, {
    participants: [me.uid, inv.createdBy],
    participantUsernames: { [me.uid]: me.username, [inv.createdBy]: inv.createdByName || '' },
    createdAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
  });
  return ref.id;
}

export function holdPendingInvite(token: string) {
  try { sessionStorage.setItem(PENDING_KEY, token); } catch { /* プライベートモード */ }
}
export function takePendingInvite(): string | null {
  try {
    const t = sessionStorage.getItem(PENDING_KEY);
    if (t) sessionStorage.removeItem(PENDING_KEY);
    return t;
  } catch {
    return null;
  }
}

/** URL の ?invite= を読む(読んだら URL から消す。再読み込みで二度受けないように) */
export function readInviteFromUrl(): string | null {
  try {
    const u = new URL(window.location.href);
    const t = u.searchParams.get('invite');
    if (!t) return null;
    u.searchParams.delete('invite');
    window.history.replaceState(window.history.state, '', u.pathname + (u.search ? u.search : '') + u.hash);
    return t;
  } catch {
    return null;
  }
}
