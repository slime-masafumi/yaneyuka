/**
 * 構造フロービューアの検討を物件カルテに紐づけて保存する（users/{uid}/forceFlowStudies）。
 * 保存するのはモデルの JSON だけ。結果は開くたびに再計算するので、エンジンを直すと過去の検討も最新の結果になる。
 * 物件は「設計ツール > 物件カルテ」（users/{uid}/propertyCards）の ID をキーにする。
 */
import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebaseClient';
import { createToolNav } from './toolNav';

export type FlowStudy = {
  id: string;
  /** 紐づける物件カルテの ID。紐づけないときは空 */
  propertyId: string;
  propertyName: string;
  planName: string;
  memo: string;
  modelJson: string;
  createdAt: string;
};

export type PropertyOption = { id: string; name: string };

const studies = (uid: string) => collection(db, 'users', uid, 'forceFlowStudies');

const byNewest = (a: FlowStudy, b: FlowStudy) => b.createdAt.localeCompare(a.createdAt);

export async function listStudies(uid: string): Promise<FlowStudy[]> {
  const snap = await getDocs(studies(uid));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FlowStudy, 'id'>) })).sort(byNewest);
}

export async function listStudiesOfProperty(uid: string, propertyId: string): Promise<FlowStudy[]> {
  const snap = await getDocs(query(studies(uid), where('propertyId', '==', propertyId)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FlowStudy, 'id'>) })).sort(byNewest);
}

export async function saveStudy(uid: string, input: Omit<FlowStudy, 'id' | 'createdAt'>): Promise<FlowStudy> {
  const data = { ...input, createdAt: new Date().toISOString() };
  const ref = await addDoc(studies(uid), data);
  return { id: ref.id, ...data };
}

export const deleteStudy = (uid: string, id: string) => deleteDoc(doc(db, 'users', uid, 'forceFlowStudies', id));

export async function listProperties(uid: string): Promise<PropertyOption[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'propertyCards'));
  return snap.docs.map((d) => ({ id: d.id, name: String((d.data() as { name?: string }).name || '無題') }));
}

/** 物件カルテの一覧から検討を開くときの受け渡し。 */
export const flowStudyNav = createToolNav<FlowStudy>('yaneyuka:force-flow-open');
