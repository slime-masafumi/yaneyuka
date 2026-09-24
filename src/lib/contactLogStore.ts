/**
 * 担当者連絡先へ履歴を自動で書く（Maker conect から送ったとき等）。
 * 同じ会社のカードがあればそこに積み、無ければ会社名だけのカードを作る。
 */
import { collection, getDocs, addDoc, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { findByCompany, isChatNicknameOnly, type ContactLogEntry } from '@/lib/contactLog';

export async function recordContactLog(uid: string, company: string, entry: ContactLogEntry): Promise<void> {
  const col = collection(db, 'users', uid, 'contacts');
  const snap = await getDocs(col);
  const list = snap.docs
    .filter((d) => !isChatNicknameOnly(d.data()))
    .map((d) => ({ id: d.id, company: String(d.data().company ?? '') }));
  const hit = findByCompany(list, company);
  if (hit) {
    await updateDoc(doc(db, 'users', uid, 'contacts', hit.id), { log: arrayUnion(entry) });
    return;
  }
  await addDoc(col, {
    company, dept: '', name: '', role: '', phone: '', email: '', project: '', memo: '',
    locked: false, createdAt: Date.now(), log: [entry],
  });
}
