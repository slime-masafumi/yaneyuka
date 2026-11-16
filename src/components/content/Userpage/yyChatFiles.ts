/**
 * yychat の添付(元の写真・PDF)を Storage に置く。2026-11-16
 *
 * 置き場所: chatRooms/{部屋}/{送った人}/{乱数}-{ファイル名}
 * storage.rules で、部屋の参加者(Firestore の chatRooms/{部屋}.participants)だけが読み書きできる。
 * 1 ファイル 20MB まで、画像と PDF だけ。
 *
 * 発言の文書には、一覧に出す小さな写真(data URL)と、元ファイルの URL を入れる。
 * Storage に置けなかったとき(ルールが未反映・通信など)は、写真は従来どおり文書の中に入れて送る。
 */
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/lib/firebaseClient';

export const CHAT_FILE_MAX_BYTES = 20 * 1024 * 1024;

export type ChatFile = {
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
};

/** ファイル名を Storage のパスに使える形にする(日本語は残す。区切り記号と制御文字だけ除く) */
export function safeFileName(name: string): string {
  const base = name.replace(/[\\/#?[\]*\u0000-\u001f]/g, '_').trim() || 'file';
  return base.length > 80 ? base.slice(base.length - 80) : base;
}

export function isChatAttachable(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name) || file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name);
}

export function formatFileSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export async function uploadChatFile(roomId: string, uid: string, blob: Blob, name: string, type: string): Promise<ChatFile> {
  if (blob.size > CHAT_FILE_MAX_BYTES) throw new Error('too-large');
  const rand = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const path = `chatRooms/${roomId}/${uid}/${rand}-${safeFileName(name)}`;
  const r = ref(storage, path);
  await uploadBytes(r, blob, { contentType: type, contentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(name)}` });
  const url = await getDownloadURL(r);
  return { url, path, name, size: blob.size, type };
}

/** 発言を消したときに元ファイルも消す(失敗しても発言の削除は止めない) */
export async function deleteChatFile(path: string | null | undefined): Promise<void> {
  if (!path) return;
  try {
    await deleteObject(ref(storage, path));
  } catch {
    /* 既に無い・権限が無いときは何もしない */
  }
}
