/**
 * 物件メール台帳の保存先。
 *
 *   ログイン中   … Firestore（users/{uid}/mailProjects・mails）＋ Storage（userUploads/{uid}/mail-…）
 *   ログインなし … このブラウザの IndexedDB（添付の図面も含めて端末の中だけ）
 *
 * Storage は既存のファイル転送と同じ userUploads/{uid}/ の下に置く。ここは既に本人だけが
 * 読み書きでき、1ファイル 100MB までの制限が掛かっている（storage.rules）。新しい置き場を
 * 作るとルールの配備が要るので、あえて相乗りしている。名前は mail- で始めて区別する。
 */
import { collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '@/lib/firebaseClient';
import type { DrawingRef } from '@/lib/mailLedger';
import type { Address } from './parseMail';

export type Project = { id: string; name: string; keywords: string[]; createdAt: number };

export type AttachmentRecord = {
  name: string;
  mime: string;
  size: number;
  path: string;
  drawing: DrawingRef | null;
};

export type MailRecord = {
  id: string;
  messageId?: string;
  subject: string;
  /** 返信・転送の接頭辞を外した件名（やりとりの束ね） */
  subjectKey: string;
  from: Address;
  to: Address[];
  cc: Address[];
  date: string;
  text: string;
  projectId: string | null;
  /** 手で物件を付け替えたら、自動の仕分けで上書きしない */
  manualProject?: boolean;
  attachments: AttachmentRecord[];
  importedAt: number;
};

export type LedgerState = { projects: Project[]; mails: MailRecord[]; ready: boolean };

export interface LedgerStore {
  kind: 'cloud' | 'local';
  subscribe(cb: (s: LedgerState) => void): () => void;
  putProject(p: Project): Promise<void>;
  deleteProject(id: string): Promise<void>;
  putMail(m: MailRecord, files: { path: string; data: Uint8Array; mime: string }[]): Promise<void>;
  updateMail(id: string, patch: Partial<MailRecord>): Promise<void>;
  deleteMail(m: MailRecord): Promise<void>;
  /** 添付を開くための URL（ローカルは blob:、クラウドはダウンロード URL） */
  fileUrl(path: string): Promise<string>;
}

const clean = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

// ---------------------------------------------------------------------------
// クラウド
// ---------------------------------------------------------------------------

export function cloudStore(uid: string): LedgerStore {
  const projectsCol = collection(db, 'users', uid, 'mailProjects');
  const mailsCol = collection(db, 'users', uid, 'mails');
  return {
    kind: 'cloud',
    subscribe(cb) {
      const state: LedgerState = { projects: [], mails: [], ready: false };
      let projectsReady = false;
      let mailsReady = false;
      const emit = () => cb({ ...state, ready: projectsReady && mailsReady });
      const u1 = onSnapshot(projectsCol, (s) => {
        state.projects = s.docs.map((d) => ({ ...(d.data() as Project), id: d.id }));
        projectsReady = true;
        emit();
      });
      const u2 = onSnapshot(mailsCol, (s) => {
        state.mails = s.docs.map((d) => ({ ...(d.data() as MailRecord), id: d.id }));
        mailsReady = true;
        emit();
      });
      return () => {
        u1();
        u2();
      };
    },
    putProject: (p) => setDoc(doc(projectsCol, p.id), clean(p)),
    deleteProject: (id) => deleteDoc(doc(projectsCol, id)),
    async putMail(m, files) {
      // 添付を先に置く（台帳に載ったのに開けない、を作らない）
      for (const f of files) {
        await uploadBytes(ref(storage, f.path), f.data, { contentType: f.mime });
      }
      await setDoc(doc(mailsCol, m.id), clean(m));
    },
    updateMail: (id, patch) => updateDoc(doc(mailsCol, id), clean(patch) as Record<string, never>),
    async deleteMail(m) {
      await deleteDoc(doc(mailsCol, m.id));
      await Promise.all(m.attachments.map((a) => deleteObject(ref(storage, a.path)).catch(() => undefined)));
    },
    fileUrl: (path) => getDownloadURL(ref(storage, path)),
  };
}

// ---------------------------------------------------------------------------
// ローカル（IndexedDB）
// ---------------------------------------------------------------------------

const DB_NAME = 'yymail-ledger';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      d.createObjectStore('projects', { keyPath: 'id' });
      d.createObjectStore('mails', { keyPath: 'id' });
      d.createObjectStore('files');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(d: IDBDatabase, stores: string[], mode: IDBTransactionMode, fn: (t: IDBTransaction) => IDBRequest<T> | void): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const t = d.transaction(stores, mode);
    const r = fn(t);
    t.oncomplete = () => resolve(r ? r.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export function localStore(): LedgerStore {
  const listeners = new Set<(s: LedgerState) => void>();
  const dbp = openDb();
  const reload = async () => {
    const d = await dbp;
    const projects = ((await tx(d, ['projects'], 'readonly', (t) => t.objectStore('projects').getAll())) ?? []) as Project[];
    const mails = ((await tx(d, ['mails'], 'readonly', (t) => t.objectStore('mails').getAll())) ?? []) as MailRecord[];
    listeners.forEach((cb) => cb({ projects, mails, ready: true }));
  };
  const blobUrls = new Map<string, string>();
  return {
    kind: 'local',
    subscribe(cb) {
      listeners.add(cb);
      void reload();
      return () => listeners.delete(cb);
    },
    async putProject(p) {
      await tx(await dbp, ['projects'], 'readwrite', (t) => void t.objectStore('projects').put(clean(p)));
      await reload();
    },
    async deleteProject(id) {
      await tx(await dbp, ['projects'], 'readwrite', (t) => void t.objectStore('projects').delete(id));
      await reload();
    },
    async putMail(m, files) {
      await tx(await dbp, ['mails', 'files'], 'readwrite', (t) => {
        t.objectStore('mails').put(clean(m));
        for (const f of files) t.objectStore('files').put(new Blob([f.data as BlobPart], { type: f.mime }), f.path);
      });
      await reload();
    },
    async updateMail(id, patch) {
      const d = await dbp;
      const cur = (await tx(d, ['mails'], 'readonly', (t) => t.objectStore('mails').get(id))) as MailRecord | undefined;
      if (!cur) return;
      await tx(d, ['mails'], 'readwrite', (t) => void t.objectStore('mails').put(clean({ ...cur, ...patch })));
      await reload();
    },
    async deleteMail(m) {
      await tx(await dbp, ['mails', 'files'], 'readwrite', (t) => {
        t.objectStore('mails').delete(m.id);
        for (const a of m.attachments) t.objectStore('files').delete(a.path);
      });
      await reload();
    },
    async fileUrl(path) {
      const hit = blobUrls.get(path);
      if (hit) return hit;
      const blob = (await tx(await dbp, ['files'], 'readonly', (t) => t.objectStore('files').get(path))) as Blob | undefined;
      if (!blob) throw new Error('添付が見つかりません');
      const url = URL.createObjectURL(blob);
      blobUrls.set(path, url);
      return url;
    },
  };
}
