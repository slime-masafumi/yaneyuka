/**
 * OLMT 図面ボードの保存と同期（Firestore / Storage）。
 * 規則は firestore.rules・storage.rules の drawingRooms の節。検証は npm run test:drawing-room-rules。
 *
 * 画面（Room）はこのインターフェースだけを見る。手元で動かして確かめるときは、
 * 同じ形のメモリ版を差し込めるようにしてある。
 */
import {
  addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, setDoc, updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '@/lib/firebaseClient';
import { newRoomId, type Decision } from '@/lib/drawingBoard';

export type Session = { id: string; label: string; startedAt: number; endedAt?: number };

export type RoomDoc = {
  id: string;
  ownerUid: string;
  title: string;
  meetingUrl: string;
  /** 会議のパスコード・電話での参加番号・定例の日時（例: 毎週火曜 10:00）。部屋に入れる人には見える */
  passcode?: string;
  dialIn?: string;
  schedule?: string;
  pdf?: { path: string; name: string };
  sessions: Session[];
  currentSession?: string | null;
  createdAt: number;
};

export type Stroke = { id: string; uid: string; name: string; page: number; pts: number[]; color: string; width: number; sessionId: string | null; at: number };
export type Presence = { uid: string; name: string; color: string; page: number; x: number; y: number; at: number };
export type DecisionDoc = Decision & { id: string; uid: string; sessionId: string | null; at: number };

export interface RoomBackend {
  watchRoom(cb: (r: RoomDoc | null) => void): () => void;
  watchStrokes(cb: (s: Stroke[]) => void): () => void;
  watchPresence(cb: (p: Presence[]) => void): () => void;
  watchDecisions(cb: (d: DecisionDoc[]) => void): () => void;
  updateRoom(patch: Partial<RoomDoc>): Promise<void>;
  addStroke(s: Omit<Stroke, 'id' | 'at'>): Promise<void>;
  deleteStroke(id: string): Promise<void>;
  setPresence(p: Omit<Presence, 'at'>): Promise<void>;
  addDecision(d: Omit<DecisionDoc, 'id' | 'at'>): Promise<void>;
  updateDecision(id: string, patch: Partial<DecisionDoc>): Promise<void>;
  deleteDecision(id: string): Promise<void>;
  uploadPdf(file: File): Promise<{ path: string; name: string }>;
  pdfUrl(path: string): Promise<string>;
}

const clean = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export function firestoreRoom(roomId: string): RoomBackend {
  const roomRef = doc(db, 'drawingRooms', roomId);
  const sub = (name: string) => collection(db, 'drawingRooms', roomId, name);
  const list = <T,>(name: string, cb: (xs: T[]) => void) =>
    onSnapshot(
      sub(name),
      (s) => cb(s.docs.map((d) => ({ ...(d.data() as T), id: d.id }))),
      // 部屋が消された・権限が無いときは空で返す（コンソールに未処理のエラーを出さない）
      () => cb([])
    );
  return {
    watchRoom: (cb) =>
      onSnapshot(
        roomRef,
        (s) => cb(s.exists() ? ({ ...(s.data() as RoomDoc), id: s.id }) : null),
        () => cb(null)
      ),
    watchStrokes: (cb) => list<Stroke>('strokes', cb),
    watchPresence: (cb) => list<Presence>('presence', (xs) => cb(xs.map((p) => ({ ...p, uid: (p as Presence & { id: string }).id })))),
    watchDecisions: (cb) => list<DecisionDoc>('decisions', cb),
    updateRoom: (patch) => updateDoc(roomRef, clean(patch) as Record<string, never>),
    addStroke: async (s) => {
      await addDoc(sub('strokes'), { ...s, at: Date.now() });
    },
    deleteStroke: (id) => deleteDoc(doc(sub('strokes'), id)),
    setPresence: (p) => setDoc(doc(sub('presence'), p.uid), { ...p, at: Date.now() }),
    addDecision: async (d) => {
      await addDoc(sub('decisions'), clean({ ...d, at: Date.now() }));
    },
    updateDecision: (id, patch) => updateDoc(doc(sub('decisions'), id), clean(patch) as Record<string, never>),
    deleteDecision: (id) => deleteDoc(doc(sub('decisions'), id)),
    async uploadPdf(file) {
      // ファイル名も乱数にする（部屋の ID と合わせて、パスを知らなければ読めない）
      const path = `drawingRooms/${roomId}/${newRoomId()}.pdf`;
      await uploadBytes(ref(storage, path), file, { contentType: 'application/pdf' });
      return { path, name: file.name };
    },
    pdfUrl: (path) => getDownloadURL(ref(storage, path)),
  };
}

/** 部屋を作り、作った人の一覧（users/{uid}/drawingRooms）にも載せる */
export async function createRoom(uid: string, title: string, meetingUrl: string): Promise<string> {
  const id = newRoomId();
  await setDoc(doc(db, 'drawingRooms', id), { ownerUid: uid, title, meetingUrl, sessions: [], currentSession: null, createdAt: Date.now() });
  await setDoc(doc(db, 'users', uid, 'drawingRooms', id), { title, owner: true, at: Date.now() });
  return id;
}

/** 参加した部屋を自分の一覧に残す（次回リンクを探さなくて済むように） */
export async function rememberRoom(uid: string, roomId: string, title: string) {
  await setDoc(doc(db, 'users', uid, 'drawingRooms', roomId), { title, at: Date.now() }, { merge: true });
}

export type MyRoom = { id: string; title: string; owner?: boolean; at: number };

export function watchMyRooms(uid: string, cb: (rooms: MyRoom[]) => void) {
  return onSnapshot(
    collection(db, 'users', uid, 'drawingRooms'),
    (s) => cb(s.docs.map((d) => ({ ...(d.data() as MyRoom), id: d.id })).sort((a, b) => b.at - a.at)),
    () => cb([])
  );
}

export async function forgetRoom(uid: string, roomId: string, owner: boolean) {
  await deleteDoc(doc(db, 'users', uid, 'drawingRooms', roomId));
  if (owner) await deleteDoc(doc(db, 'drawingRooms', roomId)).catch(() => undefined);
}

export async function roomExists(roomId: string) {
  return (await getDoc(doc(db, 'drawingRooms', roomId))).exists();
}


/**
 * ひとりで試す部屋（未ログイン用）。サーバーには何も送らず、このブラウザの中だけで動く。
 * 図面 PDF はその場で開くだけ（object URL）。赤入れ・決定事項・会議の回はこのブラウザに残し、
 * 開き直したら同じ図面 PDF をもう一度開けば赤入れが重なる。
 * 招待・同期（相手のポインタ・相手の赤入れ）はログインして部屋を作ったときだけ。
 */
export const LOCAL_ROOM_ID = 'local';
const LOCAL_KEY = 'yy-guest-olmt';
type LocalState = { room: RoomDoc; strokes: Stroke[]; decisions: DecisionDoc[] };

export function localRoom(me: { uid: string }, title = '試しの部屋'): RoomBackend {
  const fresh = (): LocalState => ({
    room: { id: LOCAL_ROOM_ID, ownerUid: me.uid, title, meetingUrl: '', sessions: [], currentSession: null, createdAt: Date.now() },
    strokes: [],
    decisions: [],
  });
  let st: LocalState = fresh();
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as LocalState;
      // 図面は保存していない（object URL はページを閉じると無効）
      if (saved?.room) st = { room: { ...saved.room, pdf: undefined, ownerUid: me.uid }, strokes: saved.strokes ?? [], decisions: saved.decisions ?? [] };
    }
  } catch {
    /* 読めなければ空の部屋 */
  }
  const subs = { room: new Set<(r: RoomDoc | null) => void>(), strokes: new Set<(s: Stroke[]) => void>(), decisions: new Set<(d: DecisionDoc[]) => void>() };
  const save = () => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...st, room: { ...st.room, pdf: undefined } }));
    } catch {
      /* 容量いっぱいなどで残せなくても、開いている間は使える */
    }
  };
  const emit = () => {
    subs.room.forEach((cb) => cb({ ...st.room }));
    subs.strokes.forEach((cb) => cb([...st.strokes]));
    subs.decisions.forEach((cb) => cb([...st.decisions]));
  };
  const change = (fn: () => void) => {
    fn();
    save();
    emit();
  };
  const watch = <T,>(set: Set<T>, cb: T, first: () => void) => {
    set.add(cb);
    first();
    return () => {
      set.delete(cb);
    };
  };
  const id = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return {
    watchRoom: (cb) => watch(subs.room, cb, () => cb({ ...st.room })),
    watchStrokes: (cb) => watch(subs.strokes, cb, () => cb([...st.strokes])),
    // 自分のポインタは画面に出さないので、在席は持たない
    watchPresence: (cb) => {
      cb([]);
      return () => undefined;
    },
    watchDecisions: (cb) => watch(subs.decisions, cb, () => cb([...st.decisions])),
    updateRoom: async (patch) => change(() => { st.room = { ...st.room, ...clean(patch) }; }),
    addStroke: async (s) => change(() => { st.strokes = [...st.strokes, { ...s, id: id(), at: Date.now() }]; }),
    deleteStroke: async (sid) => change(() => { st.strokes = st.strokes.filter((x) => x.id !== sid); }),
    setPresence: async () => undefined,
    addDecision: async (d) => change(() => { st.decisions = [...st.decisions, { ...clean(d), id: id(), at: Date.now() }]; }),
    updateDecision: async (did, patch) => change(() => { st.decisions = st.decisions.map((x) => (x.id === did ? { ...x, ...clean(patch) } : x)); }),
    deleteDecision: async (did) => change(() => { st.decisions = st.decisions.filter((x) => x.id !== did); }),
    async uploadPdf(file) {
      return { path: URL.createObjectURL(file), name: file.name };
    },
    pdfUrl: async (path) => path,
  };
}

/** ひとりで試した内容を消す */
export function clearLocalRoom() {
  try {
    localStorage.removeItem(LOCAL_KEY);
  } catch {
    /* 無視 */
  }
}
