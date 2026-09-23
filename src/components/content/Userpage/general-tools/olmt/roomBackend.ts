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
    onSnapshot(sub(name), (s) => cb(s.docs.map((d) => ({ ...(d.data() as T), id: d.id }))));
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
  return onSnapshot(collection(db, 'users', uid, 'drawingRooms'), (s) =>
    cb(s.docs.map((d) => ({ ...(d.data() as MyRoom), id: d.id })).sort((a, b) => b.at - a.at))
  );
}

export async function forgetRoom(uid: string, roomId: string, owner: boolean) {
  await deleteDoc(doc(db, 'users', uid, 'drawingRooms', roomId));
  if (owner) await deleteDoc(doc(db, 'drawingRooms', roomId)).catch(() => undefined);
}

export async function roomExists(roomId: string) {
  return (await getDoc(doc(db, 'drawingRooms', roomId))).exists();
}

