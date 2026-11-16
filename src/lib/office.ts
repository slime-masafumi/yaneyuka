'use client';

/**
 * 事務所（5 人程度の設計事務所）で共有するもの。2026-11-16
 *
 * それまで予定・連絡先・工数は本人だけ（users/{uid}/...）で、事務所の予定や連絡先を共有できず、
 * 所長が物件ごとの工数を集計できなかった。ここに事務所の共有の箱を置く。
 *
 *   offices/{officeId}                 { name, ownerUid, memberUids[], createdAt }
 *   officeInvites/{officeId}_{uid}     オーナーが出す招待（招待された本人が承諾・辞退）
 *   userOffice/{uid}                   { officeId, joinedAt } 自分が入っている事務所（1 人 1 事務所）
 *   offices/{id}/events/{id}           共有の予定
 *   offices/{id}/contacts/{id}         共有の連絡先
 *   offices/{id}/workHours/{uid_日付_行}  工数（本人の行だけ書ける）
 *
 * 権限は firestore.rules の「事務所」の節。メンバーを足すのはオーナーではなく、招待を受けた本人の承諾だけ。
 */
import { useEffect, useMemo, useState } from 'react';
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebaseClient';
import { useAuth } from './AuthContext';
import { findUserByExactEmail, getPublicProfiles, type PublicProfile } from './userDirectory';

export type Office = { id: string; name: string; ownerUid: string; memberUids: string[] };
export type OfficeInvite = {
  id: string;
  officeId: string;
  officeName: string;
  inviteeUid: string;
  ownerUid: string;
  invitedByName?: string | null;
};
export type OfficeEvent = {
  id: string;
  title: string;
  date: string;
  allDay?: boolean;
  startHour?: string;
  startMinute?: string;
  endHour?: string;
  endMinute?: string;
  category?: string;
  color?: string;
  details?: string;
  createdBy: string;
  createdByName?: string | null;
  createdAt?: number;
  updatedAt?: number;
  updatedBy?: string;
};
export type OfficeContact = {
  id: string;
  company?: string;
  dept?: string;
  name?: string;
  role?: string;
  phone?: string;
  email?: string;
  project?: string;
  memo?: string;
  createdBy: string;
  createdByName?: string | null;
  createdAt?: number;
  updatedAt?: number;
  updatedBy?: string;
};
export type WorkHourRow = {
  id: string;
  uid: string;
  date: string;
  project: string;
  hours: number;
  task?: string;
  phase?: string;
  updatedAt?: number;
};

const officeRef = (id: string) => doc(db, 'offices', id);
const userOfficeRef = (uid: string) => doc(db, 'userOffice', uid);
const inviteRef = (officeId: string, uid: string) => doc(db, 'officeInvites', `${officeId}_${uid}`);

/** 文字の長さをルールの上限に合わせて切る */
const cut = (s: unknown, max: number) => String(s ?? '').slice(0, max);

// ---------------------------------------------------------------------------
// 自分の事務所
// ---------------------------------------------------------------------------

export type MyOffice = {
  /** userOffice・事務所・招待を読み終えたら true */
  ready: boolean;
  /** 入っている事務所（読めたとき） */
  office: Office | null;
  officeId: string | null;
  isOwner: boolean;
  /**
   * userOffice は残っているが事務所を読めない（外された・解散した）。
   * 一時的な通信の失敗と区別できないので自動では消さず、画面に「記録を消す」を出す
   */
  stale: boolean;
  /** 自分宛ての招待 */
  invites: OfficeInvite[];
  /** オーナーが出していて、まだ受けられていない招待 */
  sentInvites: OfficeInvite[];
};

const EMPTY: MyOffice = { ready: false, office: null, officeId: null, isOwner: false, stale: false, invites: [], sentInvites: [] };

export function useMyOffice(): MyOffice {
  const { currentUser, authReady } = useAuth();
  const uid = currentUser?.uid ?? null;
  const [officeId, setOfficeId] = useState<string | null>(null);
  const [linkReady, setLinkReady] = useState(false);
  const [office, setOffice] = useState<Office | null>(null);
  // どの officeId の読み込みが済んだか（officeId が変わった直後に「事務所なし」と一瞬出さないため）
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [invites, setInvites] = useState<OfficeInvite[]>([]);
  const [sentInvites, setSentInvites] = useState<OfficeInvite[]>([]);

  // userOffice/{uid}
  useEffect(() => {
    setOfficeId(null);
    setLinkReady(false);
    if (!authReady || !uid) return;
    return onSnapshot(
      userOfficeRef(uid),
      (snap) => {
        setOfficeId(snap.exists() ? ((snap.data() as { officeId?: string }).officeId ?? null) : null);
        setLinkReady(true);
      },
      () => {
        setOfficeId(null);
        setLinkReady(true);
      },
    );
  }, [uid, authReady]);

  // offices/{officeId}
  useEffect(() => {
    setOffice(null);
    setStale(false);
    setLoadedFor(null);
    if (!uid || !officeId) return;
    return onSnapshot(
      officeRef(officeId),
      (snap) => {
        const d = snap.exists() ? (snap.data() as Omit<Office, 'id'>) : null;
        if (!d || !Array.isArray(d.memberUids) || !d.memberUids.includes(uid)) {
          setOffice(null);
          setStale(true);
        } else {
          setOffice({ id: snap.id, name: d.name, ownerUid: d.ownerUid, memberUids: d.memberUids });
          setStale(false);
        }
        setLoadedFor(officeId);
      },
      () => {
        // メンバーでなくなると読めない（permission-denied）
        setOffice(null);
        setStale(true);
        setLoadedFor(officeId);
      },
    );
  }, [uid, officeId]);

  // 自分宛ての招待・自分が出した招待
  useEffect(() => {
    setInvites([]);
    setSentInvites([]);
    if (!authReady || !uid) return;
    const toInvite = (d: { id: string; data: () => unknown }) => ({ ...(d.data() as Omit<OfficeInvite, 'id'>), id: d.id });
    const a = onSnapshot(
      query(collection(db, 'officeInvites'), where('inviteeUid', '==', uid)),
      (snap) => setInvites(snap.docs.map(toInvite)),
      () => setInvites([]),
    );
    const b = onSnapshot(
      query(collection(db, 'officeInvites'), where('ownerUid', '==', uid)),
      (snap) => setSentInvites(snap.docs.map(toInvite)),
      () => setSentInvites([]),
    );
    return () => {
      a();
      b();
    };
  }, [uid, authReady]);

  if (!authReady || !uid) return { ...EMPTY, ready: authReady };
  return {
    ready: linkReady && (!officeId || loadedFor === officeId),
    office,
    officeId: office ? office.id : null,
    isOwner: !!office && office.ownerUid === uid,
    stale,
    invites,
    sentInvites: office ? sentInvites.filter((i) => i.officeId === office.id) : [],
  };
}

/** メンバーの名前（publicProfiles）。名前が無い人は uid の頭を出す */
export function useMemberNames(uids: string[] | undefined): Record<string, string> {
  const key = (uids ?? []).slice().sort().join(',');
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    const list = key ? key.split(',') : [];
    if (!list.length) {
      setNames({});
      return;
    }
    let alive = true;
    void getPublicProfiles(list).then((ps: PublicProfile[]) => {
      if (!alive) return;
      setNames(Object.fromEntries(ps.map((p) => [p.uid, p.displayName || `会員 ${p.uid.slice(0, 6)}`])));
    });
    return () => {
      alive = false;
    };
  }, [key]);
  return names;
}

// ---------------------------------------------------------------------------
// 作る・招待する・入る・抜ける
// ---------------------------------------------------------------------------

export async function createOffice(uid: string, name: string): Promise<string> {
  const n = name.trim().slice(0, 100);
  if (!n) throw new Error('事務所の名前を入れてください');
  const ref = doc(collection(db, 'offices'));
  const b = writeBatch(db);
  b.set(ref, { name: n, ownerUid: uid, memberUids: [uid], createdAt: serverTimestamp() });
  b.set(userOfficeRef(uid), { officeId: ref.id, joinedAt: serverTimestamp() });
  await b.commit();
  return ref.id;
}

export async function renameOffice(officeId: string, name: string) {
  const n = name.trim().slice(0, 100);
  if (!n) return;
  await updateDoc(officeRef(officeId), { name: n });
}

/**
 * メールアドレスの完全一致で会員を探して招待を出す。
 * 索引（userDirectory）には確認済みのメールしか載らないので、未確認のメールの人は見つからない。
 */
export async function inviteByEmail(office: Office, ownerUid: string, ownerName: string, email: string): Promise<string> {
  const p = await findUserByExactEmail(email);
  if (!p) throw new Error('そのメールアドレスの会員が見つかりません（メールアドレスの確認を済ませた会員だけ招待できます）');
  if (p.uid === ownerUid) throw new Error('自分は招待できません');
  if (office.memberUids.includes(p.uid)) throw new Error('すでにメンバーです');
  await setDoc(inviteRef(office.id, p.uid), {
    officeId: office.id,
    officeName: office.name,
    inviteeUid: p.uid,
    ownerUid,
    invitedByName: cut(ownerName, 100) || null,
    createdAt: serverTimestamp(),
  });
  return p.displayName || email;
}

export async function cancelInvite(invite: OfficeInvite) {
  await deleteDoc(doc(db, 'officeInvites', invite.id));
}

/** 招待を受ける。自分を足す・userOffice を作る・招待を消す を 1 回の書き込みで（ルールが同時を求める） */
export async function acceptInvite(invite: OfficeInvite, uid: string) {
  const b = writeBatch(db);
  b.update(officeRef(invite.officeId), { memberUids: arrayUnion(uid) });
  b.set(userOfficeRef(uid), { officeId: invite.officeId, joinedAt: serverTimestamp() });
  b.delete(doc(db, 'officeInvites', invite.id));
  await b.commit();
}

export async function declineInvite(invite: OfficeInvite) {
  await deleteDoc(doc(db, 'officeInvites', invite.id));
}

/** メンバーが抜ける（オーナーは抜けられない。1 人になってから解散する） */
export async function leaveOffice(officeId: string, uid: string) {
  const b = writeBatch(db);
  b.update(officeRef(officeId), { memberUids: arrayRemove(uid) });
  b.delete(userOfficeRef(uid));
  await b.commit();
}

/** オーナーがメンバーを外す。相手の userOffice も消す（消せなくても、相手の画面で「記録を消す」が出る） */
export async function removeMember(officeId: string, memberUid: string) {
  await updateDoc(officeRef(officeId), { memberUids: arrayRemove(memberUid) });
  await deleteDoc(userOfficeRef(memberUid)).catch(() => {});
}

/** 事務所から外れた・解散したあとに残った userOffice を消す */
export async function clearStaleOffice(uid: string) {
  await deleteDoc(userOfficeRef(uid));
}

/** 解散（オーナーが 1 人だけになってから）。共有の予定・連絡先・工数も消す */
export async function dissolveOffice(officeId: string, uid: string) {
  for (const sub of ['events', 'contacts', 'workHours']) {
    const snap = await getDocs(collection(db, 'offices', officeId, sub));
    for (let i = 0; i < snap.docs.length; i += 400) {
      const b = writeBatch(db);
      snap.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
      await b.commit();
    }
  }
  const pending = await getDocs(query(collection(db, 'officeInvites'), where('ownerUid', '==', uid)));
  await Promise.all(pending.docs.filter((d) => d.data().officeId === officeId).map((d) => deleteDoc(d.ref).catch(() => {})));
  const b = writeBatch(db);
  b.delete(officeRef(officeId));
  b.delete(userOfficeRef(uid));
  await b.commit();
}

// ---------------------------------------------------------------------------
// 共有の予定
// ---------------------------------------------------------------------------

export function subscribeOfficeEvents(officeId: string, cb: (list: OfficeEvent[]) => void): () => void {
  return onSnapshot(
    collection(db, 'offices', officeId, 'events'),
    (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as Omit<OfficeEvent, 'id'>), id: d.id }))),
    () => cb([]),
  );
}

type EventInput = Omit<OfficeEvent, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'updatedBy'>;
const eventFields = (e: EventInput) => ({
  title: cut(e.title, 200),
  date: e.date,
  allDay: !!e.allDay,
  startHour: cut(e.startHour, 2),
  startMinute: cut(e.startMinute, 2),
  endHour: cut(e.endHour, 2),
  endMinute: cut(e.endMinute, 2),
  category: cut(e.category, 50),
  color: cut(e.color, 20),
  details: cut(e.details, 2000),
});

export async function addOfficeEvent(officeId: string, uid: string, userName: string, e: EventInput) {
  const now = Date.now();
  await setDoc(doc(collection(db, 'offices', officeId, 'events')), {
    ...eventFields(e),
    createdBy: uid,
    createdByName: cut(userName, 100) || null,
    createdAt: now,
    updatedAt: now,
    updatedBy: uid,
  });
}

export async function updateOfficeEvent(officeId: string, uid: string, id: string, e: EventInput) {
  await updateDoc(doc(db, 'offices', officeId, 'events', id), { ...eventFields(e), updatedAt: Date.now(), updatedBy: uid });
}

export async function deleteOfficeEvent(officeId: string, id: string) {
  await deleteDoc(doc(db, 'offices', officeId, 'events', id));
}

// ---------------------------------------------------------------------------
// 共有の連絡先
// ---------------------------------------------------------------------------

export const CONTACT_FIELDS = ['company', 'dept', 'role', 'name', 'phone', 'email', 'project', 'memo'] as const;
export type ContactField = (typeof CONTACT_FIELDS)[number];
const CONTACT_MAX: Record<ContactField, number> = { company: 200, dept: 200, role: 200, name: 200, phone: 50, email: 200, project: 200, memo: 2000 };

export function subscribeOfficeContacts(officeId: string, cb: (list: OfficeContact[]) => void): () => void {
  return onSnapshot(
    collection(db, 'offices', officeId, 'contacts'),
    (snap) =>
      cb(
        snap.docs
          .map((d) => ({ ...(d.data() as Omit<OfficeContact, 'id'>), id: d.id }))
          .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
      ),
    () => cb([]),
  );
}

export async function addOfficeContact(officeId: string, uid: string, userName: string, c: Partial<Record<ContactField, string>>) {
  const now = Date.now();
  const fields = Object.fromEntries(CONTACT_FIELDS.map((f) => [f, cut(c[f], CONTACT_MAX[f])]));
  const ref = doc(collection(db, 'offices', officeId, 'contacts'));
  await setDoc(ref, { ...fields, createdBy: uid, createdByName: cut(userName, 100) || null, createdAt: now, updatedAt: now, updatedBy: uid });
  return ref.id;
}

export async function updateOfficeContact(officeId: string, uid: string, id: string, field: ContactField, value: string) {
  await updateDoc(doc(db, 'offices', officeId, 'contacts', id), { [field]: cut(value, CONTACT_MAX[field]), updatedAt: Date.now(), updatedBy: uid });
}

export async function deleteOfficeContact(officeId: string, id: string) {
  await deleteDoc(doc(db, 'offices', officeId, 'contacts', id));
}

// ---------------------------------------------------------------------------
// 工数
// ---------------------------------------------------------------------------

const safeIdPart = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80) || 'x';
export const workHourRowId = (uid: string, date: string, entryId: string) => `${uid}_${date}_${safeIdPart(entryId)}`;

/** 期間（YYYY-MM-DD の両端を含む）の全員の工数 */
export function subscribeWorkHours(officeId: string, start: string, end: string, cb: (rows: WorkHourRow[]) => void): () => void {
  return onSnapshot(
    query(collection(db, 'offices', officeId, 'workHours'), where('date', '>=', start), where('date', '<=', end)),
    (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as Omit<WorkHourRow, 'id'>), id: d.id }))),
    () => cb([]),
  );
}

/** その日の自分の行 */
export function subscribeMyDayHours(officeId: string, uid: string, date: string, cb: (rows: WorkHourRow[]) => void): () => void {
  return onSnapshot(
    query(collection(db, 'offices', officeId, 'workHours'), where('uid', '==', uid), where('date', '==', date)),
    (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as Omit<WorkHourRow, 'id'>), id: d.id }))),
    () => cb([]),
  );
}

export type ShareRow = { entryId: string; project: string; hours: number; task?: string; phase?: string };

/**
 * その日の自分の工数を事務所へ送る（その日の行をこの内容に置き換える）。
 * 前に送った行で、今回に無いもの（消した行・時間を 0 にした行）は消す。
 */
export async function shareDayHours(officeId: string, uid: string, date: string, rows: ShareRow[]): Promise<number> {
  const valid = rows.filter((r) => r.project.trim() && r.hours > 0 && r.hours <= 24);
  const ids = new Set(valid.map((r) => workHourRowId(uid, date, r.entryId)));
  const before = await getDocs(query(collection(db, 'offices', officeId, 'workHours'), where('uid', '==', uid), where('date', '==', date)));
  const b = writeBatch(db);
  before.docs.filter((d) => !ids.has(d.id)).forEach((d) => b.delete(d.ref));
  const now = Date.now();
  for (const r of valid) {
    b.set(doc(db, 'offices', officeId, 'workHours', workHourRowId(uid, date, r.entryId)), {
      uid,
      date,
      project: cut(r.project.trim(), 200),
      hours: Math.round(r.hours * 100) / 100,
      task: cut(r.task, 500),
      phase: cut(r.phase, 50),
      updatedAt: now,
    });
  }
  await b.commit();
  return valid.length;
}

export async function deleteWorkHour(officeId: string, rowId: string) {
  await deleteDoc(doc(db, 'offices', officeId, 'workHours', rowId));
}

// ---------------------------------------------------------------------------
// 集計（物件 × メンバー）
// ---------------------------------------------------------------------------

export type HoursMatrix = {
  projects: string[];
  members: string[];
  cell: Record<string, Record<string, number>>;
  projectTotal: Record<string, number>;
  memberTotal: Record<string, number>;
  total: number;
};

export function hoursMatrix(rows: WorkHourRow[], memberOrder: string[] = []): HoursMatrix {
  const cell: Record<string, Record<string, number>> = {};
  const projectTotal: Record<string, number> = {};
  const memberTotal: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    const h = Number(r.hours);
    if (!(h > 0) || !r.project) continue;
    (cell[r.project] ??= {})[r.uid] = (cell[r.project][r.uid] ?? 0) + h;
    projectTotal[r.project] = (projectTotal[r.project] ?? 0) + h;
    memberTotal[r.uid] = (memberTotal[r.uid] ?? 0) + h;
    total += h;
  }
  const projects = Object.keys(projectTotal).sort((a, b) => projectTotal[b] - projectTotal[a] || a.localeCompare(b, 'ja'));
  // 今のメンバーの順。抜けた人の行も集計には残す（後ろに並べる）
  const seen = new Set(Object.keys(memberTotal));
  const members = [...memberOrder.filter((u) => seen.has(u)), ...[...seen].filter((u) => !memberOrder.includes(u))];
  return { projects, members, cell, projectTotal, memberTotal, total };
}

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const h1 = (n: number) => (Math.round(n * 100) / 100).toString();

/** 集計表の CSV（Excel で開けるよう BOM 付き） */
export function matrixCsv(m: HoursMatrix, names: Record<string, string>, label: string): string {
  const head = ['物件', ...m.members.map((u) => names[u] ?? u), '合計'];
  const lines = m.projects.map((p) => [p, ...m.members.map((u) => (m.cell[p]?.[u] ? h1(m.cell[p][u]) : '')), h1(m.projectTotal[p])]);
  lines.push(['合計', ...m.members.map((u) => h1(m.memberTotal[u] ?? 0)), h1(m.total)]);
  return '﻿' + [[`工数集計 ${label}`], head, ...lines].map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

/** 明細の CSV */
export function rowsCsv(rows: WorkHourRow[], names: Record<string, string>): string {
  const head = ['日付', 'メンバー', '物件', '工種', '作業内容', '工数(h)'];
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.project.localeCompare(b.project, 'ja'));
  const lines = sorted.map((r) => [r.date, names[r.uid] ?? r.uid, r.project, r.phase ?? '', r.task ?? '', h1(Number(r.hours) || 0)]);
  return '﻿' + [head, ...lines].map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

export function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** YYYY-MM の初日と末日 */
export function monthRange(ym: string): [string, string] {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return [`${ym}-01`, `${ym}-${String(last).padStart(2, '0')}`];
}

/** 今月から count か月前までの YYYY-MM（新しい順） */
export const useRecentMonths = (count = 13) =>
  useMemo(() => {
    const now = new Date();
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
  }, [count]);
