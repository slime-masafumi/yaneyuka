import { auth, db } from './firebaseClient'
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, addDoc, deleteDoc, serverTimestamp, documentId, orderBy, limit } from 'firebase/firestore'

export type UserBookmark = {
  id: string;
  title: string;
  link?: string;
  meta?: Record<string, any>;
  createdAt: number;
}
// FirestoreのドキュメントIDに安全な文字列へ変換（URLなどをそのまま使わない）
function toSafeDocId(raw: string): string {
  try {
    return encodeURIComponent(raw)
  } catch (err) {
    console.warn('encodeURIComponent失敗、フォールバック:', err)
    return raw.replace(/[\/\s]/g, '_')
  }
}

export async function getCurrentUid(): Promise<string | null> {
  const user = auth.currentUser
  if (user) return user.uid
  return new Promise(resolve => {
    const unsub = auth.onAuthStateChanged(u => {
      unsub()
      resolve(u ? u.uid : null)
    })
  })
}

// NEWS bookmarks
export async function listNewsBookmarks(uid: string): Promise<UserBookmark[]> {
  const col = collection(db, 'users', uid, 'newsBookmarks')
  const snap = await getDocs(col)
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
}

export async function setNewsBookmark(uid: string, id: string, data: Omit<UserBookmark, 'id'>) {
  const safe = toSafeDocId(id)
  await setDoc(doc(db, 'users', uid, 'newsBookmarks', safe), data)
}

export async function deleteNewsBookmark(uid: string, id: string) {
  const safe = toSafeDocId(id)
  await deleteDoc(doc(db, 'users', uid, 'newsBookmarks', safe))
}

// Event bookmarks
export async function listEventBookmarks(uid: string): Promise<UserBookmark[]> {
  const col = collection(db, 'users', uid, 'eventBookmarks')
  const snap = await getDocs(col)
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
}

export async function setEventBookmark(uid: string, id: string, data: Omit<UserBookmark, 'id'>) {
  const safe = toSafeDocId(id)
  await setDoc(doc(db, 'users', uid, 'eventBookmarks', safe), data)
}

export async function deleteEventBookmark(uid: string, id: string) {
  const safe = toSafeDocId(id)
  await deleteDoc(doc(db, 'users', uid, 'eventBookmarks', safe))
}

// Forum posts
export type ForumPostDoc = {
  id?: string;
  title: string;
  author: string;
  category: string;
  content: string;
  date: string;
  createdAt: number;
  uid?: string | null;
}

export async function addForumPost(post: ForumPostDoc) {
  const col = collection(db, 'forumPosts')
  const ref = await addDoc(col, { ...post, createdAt: post.createdAt || Date.now() })
  return ref.id
}

export async function deleteForumPostDoc(postId: string) {
  const postRef = doc(db, 'forumPosts', postId)
  // 返信サブコレクションを削除
  const repliesRef = collection(db, 'forumPosts', postId, 'replies')
  const repliesSnap = await getDocs(repliesRef)
  await Promise.all(repliesSnap.docs.map(reply => deleteDoc(reply.ref)))
  await deleteDoc(postRef)
}

export async function listForumPosts(maxPosts: number = 200): Promise<ForumPostDoc[]> {
  const col = collection(db, 'forumPosts')
  const q = query(col, orderBy('createdAt', 'desc'), limit(maxPosts))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
}

// Forum replies
export type ForumReplyDoc = {
  id?: string
  author: string
  content: string
  createdAt: number
  uid?: string | null
}

export async function addForumReply(postId: string, reply: ForumReplyDoc) {
  const colRef = collection(db, 'forumPosts', postId, 'replies')
  await addDoc(colRef, { author: reply.author, content: reply.content, createdAt: reply.createdAt, uid: reply.uid || null })
}

export async function listForumReplies(postId: string): Promise<ForumReplyDoc[]> {
  const colRef = collection(db, 'forumPosts', postId, 'replies')
  const snap = await getDocs(colRef)
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
}

export async function deleteForumReply(postId: string, replyId: string) {
  const replyRef = doc(db, 'forumPosts', postId, 'replies', replyId)
  await deleteDoc(replyRef)
}

// Team Boards & Tasks
export type BoardDoc = {
  id?: string
  name: string
  ownerUid: string
  memberUids: string[]
  createdAt?: any
  color?: string
}

export type BoardTaskDoc = {
  id?: string
  title: string
  completed: boolean
  dueDate?: string | null
  priority?: 'low' | 'medium' | 'high'
  assigneeUid?: string | null
  details?: string
  createdAt?: any
  updatedAt?: any
}

export async function listBoardsForUser(uid: string): Promise<BoardDoc[]> {
  const colRef = collection(db, 'boards')
  // ownerとmemberの両方をFirestoreクエリでフィルタリング（配列の合計制限あり）
  const ownerQ = query(colRef, where('ownerUid', '==', uid))
  const memberQ = query(colRef, where('memberUids', 'array-contains', uid))
  const [ownerSnap, memberSnap] = await Promise.all([getDocs(ownerQ), getDocs(memberQ)])
  const seen = new Set<string>()
  const list: BoardDoc[] = []
  for (const d of [...ownerSnap.docs, ...memberSnap.docs]) {
    if (!seen.has(d.id)) {
      seen.add(d.id)
      list.push({ id: d.id, ...(d.data() as any) })
    }
  }
  return list
}

export async function createBoard(uid: string, name: string, color?: string): Promise<string> {
  const colRef = collection(db, 'boards')
  const ref = await addDoc(colRef, { name, ownerUid: uid, memberUids: [], color: color || null, createdAt: serverTimestamp() })
  return ref.id
}

export async function updateBoard(boardId: string, data: Partial<BoardDoc>) {
  await updateDoc(doc(db, 'boards', boardId), data as any)
}

export async function setBoardMembers(boardId: string, memberUids: string[]) {
  await updateDoc(doc(db, 'boards', boardId), { memberUids })
}

export async function listBoardTasks(boardId: string): Promise<BoardTaskDoc[]> {
  const colRef = collection(db, 'boards', boardId, 'tasks')
  const snap = await getDocs(colRef)
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
}

export async function addBoardTask(boardId: string, task: Omit<BoardTaskDoc, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const colRef = collection(db, 'boards', boardId, 'tasks')
  const ref = await addDoc(colRef, { ...task, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  return ref.id
}

export async function updateBoardTask(boardId: string, taskId: string, data: Partial<BoardTaskDoc>) {
  await updateDoc(doc(db, 'boards', boardId, 'tasks', taskId), { ...data, updatedAt: serverTimestamp() } as any)
}

export async function deleteBoardTask(boardId: string, taskId: string) {
  await deleteDoc(doc(db, 'boards', boardId, 'tasks', taskId))
}

// Users lookups
export type UserProfile = { uid: string; email: string | null; displayName: string | null; avatarUrl?: string | null }

export async function findUserByEmail(email: string): Promise<UserProfile | null> {
  const colRef = collection(db, 'users')
  const qy = query(colRef, where('email', '==', email))
  const snap = await getDocs(qy)
  if (snap.empty) return null
  const d = snap.docs[0]
  const data = d.data() as any
  return { uid: d.id, email: data.email || null, displayName: data.displayName || null }
}

// シンプルなメモリキャッシュでユーザープロファイルの再取得を抑制
const userProfileCache = new Map<string, UserProfile>()

export async function getUsersByUids(uids: string[]): Promise<UserProfile[]> {
  if (!uids || uids.length === 0) return []
  const unique = Array.from(new Set(uids.filter(Boolean)))

  const fromCache: UserProfile[] = []
  const toFetch: string[] = []
  for (const uid of unique) {
    const cached = userProfileCache.get(uid)
    // キャッシュがある場合は使用（avatarUrlがnullでも問題ない）
    if (cached) {
      fromCache.push(cached)
    } else {
      toFetch.push(uid)
    }
  }

  if (toFetch.length === 0) return fromCache

  // Firestoreのinクエリでまとめて取得（10件単位）
  const chunks: string[][] = []
  for (let i = 0; i < toFetch.length; i += 10) chunks.push(toFetch.slice(i, i + 10))

  const fetched: UserProfile[] = []
  await Promise.all(chunks.map(async (ids) => {
    const colRef = collection(db, 'users')
    const qy = query(colRef, where(documentId(), 'in', ids))
    const snap = await getDocs(qy)
    snap.docs.forEach(d => {
      const data = d.data() as any
      const profile: UserProfile = { 
        uid: d.id, 
        email: data?.email || null, 
        displayName: data?.displayName || null,
        avatarUrl: data?.avatarUrl || null
      }
      userProfileCache.set(d.id, profile)
      fetched.push(profile)
    })
  }))

  return [...fromCache, ...fetched]
}

export async function deleteBoard(boardId: string) {
  // サブコレクションtasksを削除してからボードを削除
  const tasksCol = collection(db, 'boards', boardId, 'tasks')
  const snap = await getDocs(tasksCol)
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
  await deleteDoc(doc(db, 'boards', boardId))
}

// Forum bookmarks per user
export async function listForumBookmarks(uid: string): Promise<UserBookmark[]> {
  const col = collection(db, 'users', uid, 'forumBookmarks')
  const snap = await getDocs(col)
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
}

export async function setForumBookmark(uid: string, id: string, data: Omit<UserBookmark, 'id'>) {
  await setDoc(doc(db, 'users', uid, 'forumBookmarks', id), data)
}

export async function deleteForumBookmark(uid: string, id: string) {
  await deleteDoc(doc(db, 'users', uid, 'forumBookmarks', id))
}

// General Tools bookmarks
export async function listGeneralToolsBookmarks(uid: string): Promise<UserBookmark[]> {
  const col = collection(db, 'users', uid, 'generalToolsBookmarks')
  const snap = await getDocs(col)
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
}

export async function setGeneralToolsBookmark(uid: string, id: string, data: Omit<UserBookmark, 'id'>) {
  const safe = toSafeDocId(id)
  await setDoc(doc(db, 'users', uid, 'generalToolsBookmarks', safe), data)
}

export async function deleteGeneralToolsBookmark(uid: string, id: string) {
  const safe = toSafeDocId(id)
  await deleteDoc(doc(db, 'users', uid, 'generalToolsBookmarks', safe))
}

// Design Post bookmarks
export async function listDesignPostBookmarks(uid: string): Promise<UserBookmark[]> {
  const col = collection(db, 'users', uid, 'designPostBookmarks')
  const snap = await getDocs(col)
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
}

export async function setDesignPostBookmark(uid: string, id: string, data: Omit<UserBookmark, 'id'>) {
  const safe = toSafeDocId(id)
  await setDoc(doc(db, 'users', uid, 'designPostBookmarks', safe), data)
}

export async function deleteDesignPostBookmark(uid: string, id: string) {
  const safe = toSafeDocId(id)
  await deleteDoc(doc(db, 'users', uid, 'designPostBookmarks', safe))
}


