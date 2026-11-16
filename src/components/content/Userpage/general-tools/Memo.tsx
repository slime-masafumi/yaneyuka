'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  FiPlus, FiStar, FiEdit2, FiType, FiDroplet, 
  FiList, FiAlignLeft, FiAlignCenter, FiAlignRight, 
  FiCheckSquare, FiX, FiTrash2, FiFileText, FiChevronDown, FiCheck, FiFolder, FiImage, FiMic, FiSquare, FiTag,
  FiSearch, FiDownload
} from 'react-icons/fi';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/20/solid';
import { useAuth } from '@/lib/AuthContext';
import { db, storage } from '@/lib/firebaseClient';
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, setDoc, writeBatch, arrayUnion } from 'firebase/firestore';
import HtmlDocx from 'html-docx-js/dist/html-docx';
import HomeworkToTasks from './memo/HomeworkToTasks';
import ToolHeader from '../ToolHeader';
import GuestNote from './GuestNote';
import ProjectPicker from '@/components/ui/ProjectPicker';
import { projectKey, useProjectRegistry } from '@/lib/projectRegistry';
import { daysLeftInTrash, fillProjectName, isExpired, TRASH_DAYS } from './memo/memoTrash';

interface Memo {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  isFavorite?: boolean;
  isLocked?: boolean;
  order?: number;
}

const PRESET_COLORS = [
  '#000000', '#4B5563', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
  '#FFFFFF', '#F3F4F6', '#FEE2E2', '#FEF3C7', '#D1FAE5', '#DBEAFE', '#E0E7FF', '#EDE9FE', '#FCE7F3'
];

/**
 * メモのひな形。
 *
 * 白紙から書き始めると、あとで見返したときに「誰が・いつまでに」が抜けている。
 * 打合せや巡回でその場で埋める項目を先に置いておくと、記録として使えるものが残る。
 * 見出しだけ置いて中身は空にしてあるので、要らない行は消して使う。
 */
type MemoTemplate = {
  id: string;
  label: string;
  category: string;
  title: string;
  /** 本文。contentEditable にそのまま入る HTML。 */
  content: string;
};

const section = (heading: string, lines: number = 1) =>
  `<p><strong>${heading}</strong></p>${'<p><br></p>'.repeat(lines)}`;

const MEMO_TEMPLATES: MemoTemplate[] = [
  {
    id: 'minutes',
    label: '議事録',
    category: '議事録',
    title: '議事録',
    content:
      section('日時・場所') +
      section('出席者') +
      section('決定事項', 2) +
      section('宿題（担当 / 期限）', 2) +
      section('次回'),
  },
  {
    id: 'patrol',
    label: '現場巡回記録',
    category: '現場',
    title: '現場巡回記録',
    content:
      section('物件名') +
      section('日時・天候') +
      section('立会者') +
      section('確認事項', 2) +
      section('指摘・是正', 2) +
      section('写真メモ'),
  },
  {
    id: 'correction',
    label: '是正指示',
    category: '現場',
    title: '是正指示',
    content:
      section('宛先') +
      section('物件名') +
      section('指摘箇所') +
      section('指摘内容', 2) +
      section('是正期限') +
      section('確認結果'),
  },
  {
    id: 'phone',
    label: '電話メモ',
    category: '連絡',
    title: '電話メモ',
    content:
      section('日時') +
      section('相手（会社 / 氏名）') +
      section('用件', 2) +
      section('折返しの要否'),
  },
  {
    id: 'request',
    label: '施主要望',
    category: '施主',
    title: '施主要望',
    content:
      section('日時') +
      section('要望内容', 2) +
      section('反映可否') +
      section('コスト・工期への影響') +
      section('回答内容'),
  },
];

/**
 * 一覧の並び順。
 *
 * 既定の「手動」は、これまでの並び（ドラッグで決めた order → 更新日）をそのまま
 * 使う。並びを覚えて使っている人がいるので、開いた見た目は変えない。
 * 手動以外を選んでいる間はドラッグ＆ドロップを止める（並べ替えても
 * すぐ上書きされてしまい、動かないように見えるため）。
 */
type MemoSortOrder = 'manual' | 'updated' | 'created' | 'title' | 'category';

const MEMO_SORT_OPTIONS: Array<{ value: MemoSortOrder; label: string }> = [
  { value: 'manual', label: '手動（ドラッグ順）' },
  { value: 'updated', label: '更新が新しい順' },
  { value: 'created', label: '作成が新しい順' },
  { value: 'title', label: 'タイトル順' },
  { value: 'category', label: 'カテゴリ順' },
];

const compareMemos = (a: Memo, b: Memo, order: MemoSortOrder): number => {
  switch (order) {
    case 'updated':
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    case 'created':
      return b.createdAt.getTime() - a.createdAt.getTime();
    case 'title':
      // 日本語を含むので localeCompare。空の表題は末尾へ。
      if (!a.title && !b.title) return 0;
      if (!a.title) return 1;
      if (!b.title) return -1;
      return a.title.localeCompare(b.title, 'ja');
    case 'category': {
      const ca = a.category || '';
      const cb = b.category || '';
      if (ca !== cb) {
        if (!ca) return 1;
        if (!cb) return -1;
        return ca.localeCompare(cb, 'ja');
      }
      // 同じカテゴリの中は更新が新しい順
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    }
    case 'manual':
    default: {
      const orderA = a.order ?? 99999999;
      const orderB = b.order ?? 99999999;
      if (orderA !== orderB) return orderA - orderB;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    }
  }
};

/**
 * フォルダ。
 *
 * メモは前からカテゴリ（自由入力・📂アイコン付き）を1つ持っていたので、
 * それをそのままフォルダの中身として使う。別に folderId を持たせると
 * 「カテゴリ」と「フォルダ」の2つの仕分けが並んでしまい、どちらに入れたか
 * 分からなくなる。既存のメモも、付けていたカテゴリがそのままフォルダになる。
 *
 * ただしカテゴリはメモ側にしか無いので、それだけでは「空のフォルダ」を
 * 作れない（メモを入れるまで消えてしまう）。フォルダ名の一覧だけを
 * users/{uid}/memoMeta/folders に置いて、空でも残るようにする。
 */
const FOLDER_DOC = 'folders';

/** 「すべて」＝null、「未分類」＝空文字。どちらもフォルダ名ではないので分けて扱う。 */
type FolderSelection = string | null;
const ALL_FOLDERS: FolderSelection = null;
const UNFILED = '';

/** 本文は HTML なので、検索にはタグを外した文字列を使う。 */
const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ');

/**
 * 未ログインのときの保存先（このブラウザの localStorage）。
 *
 * 以前は未ログインだと「新規メモ」も本文の入力も alert で止まり、メモとして使えなかった。
 * 未ログインでもこのブラウザに保存して使えるようにし、ログインしたらアカウント
 * （users/{uid}/memos）へ移す。画像は本文に埋め込み（dataURL）、移すときに保管場所へ上げ直す。
 */
const GUEST_MEMOS_KEY = 'yy-guest-memo';
const GUEST_FOLDERS_KEY = 'yy-guest-memo-folders';

const fromStored = (m: any): Memo => ({
  id: String(m.id),
  title: m.title || '',
  content: m.content || '',
  category: m.category || '',
  tags: Array.isArray(m.tags) ? m.tags : [],
  createdAt: new Date(m.createdAt || Date.now()),
  updatedAt: new Date(m.updatedAt || Date.now()),
  isFavorite: !!m.isFavorite,
  isLocked: !!m.isLocked,
  order: typeof m.order === 'number' ? m.order : 99999999,
});
const readGuestMemos = (): Memo[] => {
  try {
    const v = JSON.parse(localStorage.getItem(GUEST_MEMOS_KEY) || '[]');
    return Array.isArray(v) ? v.filter((m) => m && m.id).map(fromStored) : [];
  } catch {
    return [];
  }
};
/** 書けたら true。容量（約 5MB）を超えると false */
const writeGuestMemos = (list: Memo[]): boolean => {
  try {
    localStorage.setItem(
      GUEST_MEMOS_KEY,
      JSON.stringify(list.map((m) => ({ ...m, createdAt: m.createdAt.getTime(), updatedAt: m.updatedAt.getTime() }))),
    );
    return true;
  } catch {
    return false;
  }
};
const readGuestFolders = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(GUEST_FOLDERS_KEY) || '[]');
    return Array.isArray(v) ? v.filter((n) => typeof n === 'string' && n) : [];
  } catch {
    return [];
  }
};
const writeGuestFolders = (names: string[]) => {
  try { localStorage.setItem(GUEST_FOLDERS_KEY, JSON.stringify(names)); } catch { /* 容量超過は諦める */ }
};

/** ゴミ箱のメモ（削除した時刻つき）。中身は削除した時点のまま（保存前の打ちかけも含む） */
type TrashedMemo = Memo & { deletedAt: number };
const GUEST_TRASH_KEY = 'yy-guest-memo-trash';
const readGuestTrash = (): TrashedMemo[] => {
  try {
    const v = JSON.parse(localStorage.getItem(GUEST_TRASH_KEY) || '[]');
    return Array.isArray(v) ? v.filter((m) => m && m.id).map((m) => ({ ...fromStored(m), deletedAt: Number(m.deletedAt) || Date.now() })) : [];
  } catch {
    return [];
  }
};
/** 書けたら true（容量超過は false） */
const writeGuestTrash = (list: TrashedMemo[]): boolean => {
  try {
    if (!list.length) { localStorage.removeItem(GUEST_TRASH_KEY); return true; }
    localStorage.setItem(
      GUEST_TRASH_KEY,
      JSON.stringify(list.map((m) => ({ ...m, createdAt: m.createdAt.getTime(), updatedAt: m.updatedAt.getTime() }))),
    );
    return true;
  } catch {
    return false;
  }
};
/** Firestore に置く形（日付は ms） */
const memoDoc = (m: Memo) => ({
  title: m.title, content: m.content, category: m.category, tags: m.tags,
  createdAt: m.createdAt.getTime(), updatedAt: m.updatedAt.getTime(),
  isFavorite: !!m.isFavorite, isLocked: !!m.isLocked, order: m.order ?? 0,
});

/** 本文に埋め込んだ画像（dataURL）を自分の保管場所へ上げ、URL に差し替える（ログイン時の移行用） */
const uploadInlineImages = async (html: string, uid: string): Promise<string> => {
  const found = Array.from(new Set(html.match(/data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/g) || []));
  let out = html;
  for (const dataUrl of found) {
    const blob = await (await fetch(dataUrl)).blob();
    const path = `userUploads/${uid}/memo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    await uploadBytes(storageRef(storage, path), blob, { contentType: blob.type || 'image/jpeg' });
    const url = await getDownloadURL(storageRef(storage, path));
    out = out.split(dataUrl).join(url);
  }
  return out;
};

const MemoTool: React.FC = () => {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [currentMemo, setCurrentMemo] = useState<Memo | null>(null);
  const [memoTitle, setMemoTitle] = useState('');
  const [memoCategory, setMemoCategory] = useState('');
  // 宿題を Myタスクへ（開いたときの本文を渡す）
  const [homeworkText, setHomeworkText] = useState<string | null>(null);
  const [memoTags, setMemoTags] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  // 選択中のフォルダ。null = すべて / '' = 未分類 / それ以外 = フォルダ名
  const [selectedFolder, setSelectedFolder] = useState<FolderSelection>(ALL_FOLDERS);
  // 保存されているフォルダ名（空のフォルダを残すため）
  const [savedFolders, setSavedFolders] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [dragOverFolder, setDragOverFolder] = useState<FolderSelection | undefined>(undefined);
  const [tagFilter, setTagFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<MemoSortOrder>('manual');
  const [charCount, setCharCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState('');
  
  // ドラッグアンドドロップ用State
  const [draggedMemoId, setDraggedMemoId] = useState<string | null>(null);
  const [dragOverMemoId, setDragOverMemoId] = useState<string | null>(null); // ドロップ先のIDを保持
  
  const [showColorPalette, setShowColorPalette] = useState<'fore' | 'back' | null>(null);
  const paletteRef = useRef<HTMLDivElement>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isComposingRef = useRef<boolean>(false);
  const isEditingRef = useRef<boolean>(false);
  // onSnapshot リスナーは [currentUser] で一度だけ登録されるため、
  // クロージャ内の currentMemo が古い値で固定される（stale closure）。
  // 常に最新の currentMemo を ref で参照できるようにしてジャンプを防ぐ。
  const currentMemoRef = useRef<Memo | null>(null);

  const { currentUser } = useAuth();

  useEffect(() => {
    currentMemoRef.current = currentMemo;
  }, [currentMemo]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
        setShowColorPalette(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 今 memos に入っているのが誰のメモか（'guest' / uid）。ログイン・ログアウトの切り替わりの
  // 一瞬に、アカウントのメモをこのブラウザの保存先へ書いてしまわないための目印。
  const [memoOwner, setMemoOwner] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      // 未ログイン: このブラウザに保存したメモを開く
      const list = readGuestMemos().sort((a, b) => compareMemos(a, b, 'manual'));
      setMemos(list);
      setMemoOwner('guest');
      const first = list[0] ?? null;
      setCurrentMemo(first);
      setMemoTitle(first?.title ?? '');
      setMemoCategory(first?.category ?? '');
      setMemoTags(first ? first.tags.join(', ') : '');
      if (editorRef.current) editorRef.current.innerHTML = first?.content ?? '';
      updateCharCount();
      return;
    }
    setMemoOwner(currentUser.uid);
    try {
      const cached = localStorage.getItem(`generalMemos:${currentUser.uid}`)
      if (cached) {
        const parsed = JSON.parse(cached) as any[]
        const list: Memo[] = parsed.map((m: any) => ({ ...m, createdAt: new Date(m.createdAt), updatedAt: new Date(m.updatedAt), isFavorite: m.isFavorite || false, isLocked: m.isLocked || false, order: m.order ?? 0 }))
        // ソート: order順 -> 更新日順
        list.sort((a, b) => {
          const orderA = typeof a.order === 'number' ? a.order : 0;
          const orderB = typeof b.order === 'number' ? b.order : 0;
          if (orderA !== orderB) return orderA - orderB;
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        });
        setMemos(list)
        if (list.length) { setCurrentMemo(list[0]); setMemoTitle(list[0].title); setMemoCategory(list[0].category); setMemoTags(list[0].tags.join(', ')); if (editorRef.current) editorRef.current.innerHTML = list[0].content }
      }
    } catch {}
    
    const colRef = collection(db, 'users', currentUser.uid, 'memos')
    const unsub = onSnapshot(colRef, (snap) => {
      const list: Memo[] = snap.docs.map(d => {
        const data = d.data() as any
        return { 
          id: d.id, 
          title: data.title || '', 
          content: data.content || '', 
          category: data.category || '', 
          tags: (data.tags || []), 
          createdAt: new Date(data.createdAt || Date.now()), 
          updatedAt: new Date(data.updatedAt || Date.now()), 
          isFavorite: data.isFavorite || false, 
          isLocked: data.isLocked || false,
          order: typeof data.order === 'number' ? data.order : 99999999
        }
      })
      
      list.sort((a, b) => {
        const orderA = a.order ?? 99999999;
        const orderB = b.order ?? 99999999;
        if (orderA !== orderB) return orderA - orderB;
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      })

      setMemos(list)
      try { localStorage.setItem(`generalMemos:${currentUser.uid}`, JSON.stringify(list.map(m => ({ ...m, createdAt: m.createdAt.getTime(), updatedAt: m.updatedAt.getTime() })))) } catch {}
      
      if (!isEditingRef.current && document.activeElement !== editorRef.current) {
        const activeMemo = currentMemoRef.current;
        if (list.length && (!activeMemo || !list.find(m => m.id === activeMemo.id))) {
          setCurrentMemo(list[0]);
          setMemoTitle(list[0].title);
          setMemoCategory(list[0].category);
          setMemoTags(list[0].tags.join(', '));
          if (editorRef.current) {
            editorRef.current.innerHTML = list[0].content;
            editorRef.current.scrollTop = 0;
          }
        } else if (activeMemo) {
          const updatedMemo = list.find(m => m.id === activeMemo.id);
          if (updatedMemo) {
            if (editorRef.current && updatedMemo.content !== editorRef.current.innerHTML) {
              const cursorPos = saveCursorPosition();
              editorRef.current.innerHTML = updatedMemo.content;
              setTimeout(() => { restoreCursorPosition(cursorPos); }, 0);
            }
            setCurrentMemo(prev => prev ? { ...prev, isFavorite: updatedMemo.isFavorite, isLocked: updatedMemo.isLocked, order: updatedMemo.order } : null);
          }
        }
      }
    })
    return () => unsub()
  }, [currentUser])

  // --- フォルダ ---

  // 保存済みのフォルダ名を読む。読めなくてもメモ側のカテゴリから復元できる。
  useEffect(() => {
    if (!currentUser) { setSavedFolders(readGuestFolders()); return; }
    const ref = doc(db, 'users', currentUser.uid, 'memoMeta', FOLDER_DOC);
    const unsub = onSnapshot(ref, (snap) => {
      const names = (snap.data() as any)?.names;
      if (Array.isArray(names)) setSavedFolders(names.filter((n) => typeof n === 'string' && n));
    }, () => { /* 読めないだけなら黙って諦める */ });
    return () => unsub();
  }, [currentUser]);

  // --- ゴミ箱（30 日）。削除したメモはここへ移し、元に戻せるようにする ---
  const [trash, setTrash] = useState<TrashedMemo[]>([]);
  const [showTrash, setShowTrash] = useState(false);
  useEffect(() => {
    if (!currentUser) {
      const all = readGuestTrash();
      const keep = all.filter((m) => !isExpired(m.deletedAt));
      if (keep.length !== all.length) writeGuestTrash(keep);
      setTrash(keep.sort((a, b) => b.deletedAt - a.deletedAt));
      return;
    }
    const col = collection(db, 'users', currentUser.uid, 'memoTrash');
    const unsub = onSnapshot(col, (snap) => {
      const list: TrashedMemo[] = [];
      snap.docs.forEach((d) => {
        const data = d.data() as any;
        const m: TrashedMemo = { ...fromStored({ ...data, id: d.id }), deletedAt: Number(data.deletedAt) || Date.now() };
        // 30 日を過ぎたものはここで片付ける（期限どおりに消えるのは、この画面を開いたときだけ）
        if (isExpired(m.deletedAt)) { void deleteDoc(d.ref).catch(() => {}); return; }
        list.push(m);
      });
      setTrash(list.sort((a, b) => b.deletedAt - a.deletedAt));
    }, () => { /* 読めないときはゴミ箱を空として出す（メモ本体には触らない） */ });
    return () => unsub();
  }, [currentUser]);

  // 物件の台帳（src/lib/projectRegistry.ts）。フォルダ名が台帳の物件ならその物件のメモとして扱う
  const registry = useProjectRegistry();
  const projectOfFolder = (name: string) => (name ? registry.find(name) : null);
  // 新しく作るメモの物件（＝入れるフォルダ）。物件のフォルダを開くとそれに合わせる
  const [newMemoProject, setNewMemoProject] = useState('');

  // 未ログインのとき、メモの変更（作成・本文・★・ロック・並べ替え・フォルダ移動・削除）を
  // まとめてこのブラウザへ書く。書けなかった（容量超過）ことは必ず画面に出す。
  const [guestSaveFailed, setGuestSaveFailed] = useState(false);
  const migratedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentUser || memoOwner !== 'guest') return;
    setGuestSaveFailed(!writeGuestMemos(memos));
  }, [memos, memoOwner, currentUser]);

  // 移行: ログインする前にこのブラウザで書いたメモをアカウントへ上げる。
  // メモは 1 件 1 文書で id も重ならないので、アカウント側に既にメモがあってもそのまま足す。
  // 上げられたものだけ手元から消す（失敗したものは残して、次のログインでまた試す）。
  useEffect(() => {
    if (!currentUser) return;
    const guest = readGuestMemos();
    const guestFolders = readGuestFolders();
    const guestTrash = readGuestTrash().filter((m) => !isExpired(m.deletedAt));
    if (!guest.length && !guestFolders.length && !guestTrash.length) return;
    // 同じ人の移行は 1 回だけ（開発時の effect 二重実行で、移し終えたものを書き戻さないように）
    if (migratedForRef.current === currentUser.uid) return;
    migratedForRef.current = currentUser.uid;
    (async () => {
      const left: Memo[] = [];
      let moved = 0;
      for (const m of guest) {
        try {
          const content = await uploadInlineImages(m.content, currentUser.uid);
          await setDoc(doc(db, 'users', currentUser.uid, 'memos', m.id), {
            title: m.title, content, category: m.category, tags: m.tags,
            createdAt: m.createdAt.getTime(), updatedAt: m.updatedAt.getTime(),
            isFavorite: !!m.isFavorite, isLocked: !!m.isLocked, order: m.order ?? 0,
          });
          moved++;
        } catch (e) {
          console.error('メモの移行に失敗しました', e);
          left.push(m);
        }
      }
      if (guestFolders.length) {
        try {
          await setDoc(doc(db, 'users', currentUser.uid, 'memoMeta', FOLDER_DOC), { names: arrayUnion(...guestFolders) }, { merge: true });
          try { localStorage.removeItem(GUEST_FOLDERS_KEY); } catch { /* 無視 */ }
        } catch (e) {
          console.error('フォルダの移行に失敗しました', e);
        }
      }
      // ゴミ箱も一緒に移す（ログインした途端に、30 日は戻せるはずのメモが見えなくならないように）
      const trashLeft: TrashedMemo[] = [];
      for (const m of guestTrash) {
        try {
          const content = await uploadInlineImages(m.content, currentUser.uid);
          await setDoc(doc(db, 'users', currentUser.uid, 'memoTrash', m.id), { ...memoDoc({ ...m, content }), deletedAt: m.deletedAt });
        } catch (e) {
          console.error('ゴミ箱のメモの移行に失敗しました', e);
          trashLeft.push(m);
        }
      }
      if (guestTrash.length) writeGuestTrash(trashLeft);
      if (left.length) writeGuestMemos(left);
      else { try { localStorage.removeItem(GUEST_MEMOS_KEY); } catch { /* 無視 */ } }
      if (moved) flashHeadNotice(`このブラウザのメモ ${moved} 件をアカウントに移しました。`);
      if (left.length) flashHeadNotice(`このブラウザのメモ ${left.length} 件を移せませんでした。次にログインしたときにもう一度移します。`);
    })();
  }, [currentUser]);

  const persistFolders = async (names: string[]) => {
    setSavedFolders(names);
    if (!currentUser) { writeGuestFolders(names); return; }
    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'memoMeta', FOLDER_DOC), { names }, { merge: true });
    } catch (error) {
      console.error('フォルダの保存に失敗しました', error);
    }
  };

  /**
   * 画面に出すフォルダ。保存済みの名前と、メモが実際に持っているカテゴリを
   * 足し合わせる。カテゴリだけ付けていた既存のメモも、そのままフォルダに並ぶ。
   */
  const folderNames = Array.from(
    new Set([...savedFolders, ...memos.map((m) => m.category).filter(Boolean)]),
  ).sort((a, b) => a.localeCompare(b, 'ja'));

  const countInFolder = (name: FolderSelection) =>
    name === ALL_FOLDERS
      ? memos.length
      : memos.filter((m) => (m.category || UNFILED) === name).length;

  const addFolder = async () => {
    const typed = newFolderName.trim();
    if (!typed) return;
    // 台帳の物件なら台帳の書き方にそろえる（「Ａ邸」と「A邸」で別のフォルダにしない）
    const name = registry.find(typed)?.name ?? typed;
    if (folderNames.includes(name)) {
      setSelectedFolder(name);
    } else {
      await persistFolders([...savedFolders, name]);
      setSelectedFolder(name);
    }
    setNewFolderName('');
    setShowFolderInput(false);
  };

  /** フォルダ名の変更。中のメモのカテゴリも書き換える（実体がそこなので）。 */
  const renameFolder = async (oldName: string) => {
    const next = window.prompt('フォルダ名を変更', oldName);
    if (next === null) return;
    const name = next.trim();
    if (!name || name === oldName) return;

    const targets = memos.filter((m) => m.category === oldName);
    setMemos((prev) => prev.map((m) => (m.category === oldName ? { ...m, category: name } : m)));
    if (memoCategory === oldName) setMemoCategory(name);
    if (selectedFolder === oldName) setSelectedFolder(name);
    await persistFolders(
      Array.from(new Set(savedFolders.filter((n) => n !== oldName).concat(name))),
    );

    if (!currentUser || targets.length === 0) return;
    try {
      const batch = writeBatch(db);
      targets.forEach((m) => {
        if (m.id.startsWith('tmp-')) return;
        batch.update(doc(db, 'users', currentUser.uid, 'memos', m.id), { category: name });
      });
      await batch.commit();
    } catch (error) {
      console.error('フォルダ名の変更に失敗しました', error);
    }
  };

  /** フォルダを削除。中のメモは消さず未分類に戻す（消えると取り返せないので）。 */
  const deleteFolder = async (name: string) => {
    const inside = memos.filter((m) => m.category === name);
    const message = inside.length
      ? `フォルダ「${name}」を削除します。\n中のメモ ${inside.length} 件は削除せず「未分類」に戻します。`
      : `フォルダ「${name}」を削除します。`;
    if (!window.confirm(message)) return;

    setMemos((prev) => prev.map((m) => (m.category === name ? { ...m, category: UNFILED } : m)));
    if (memoCategory === name) setMemoCategory(UNFILED);
    if (selectedFolder === name) setSelectedFolder(ALL_FOLDERS);
    await persistFolders(savedFolders.filter((n) => n !== name));

    if (!currentUser || inside.length === 0) return;
    try {
      const batch = writeBatch(db);
      inside.forEach((m) => {
        if (m.id.startsWith('tmp-')) return;
        batch.update(doc(db, 'users', currentUser.uid, 'memos', m.id), { category: UNFILED });
      });
      await batch.commit();
    } catch (error) {
      console.error('フォルダの削除に失敗しました', error);
    }
  };

  /** メモ1件をフォルダへ移す。 */
  const moveMemoToFolder = async (memoId: string, folder: string) => {
    const target = memos.find((m) => m.id === memoId);
    if (!target || (target.category || UNFILED) === folder) return;

    setMemos((prev) => prev.map((m) => (m.id === memoId ? { ...m, category: folder } : m)));
    if (currentMemo?.id === memoId) setMemoCategory(folder);

    if (!currentUser || memoId.startsWith('tmp-')) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'memos', memoId), { category: folder });
    } catch (error) {
      console.error('メモの移動に失敗しました', error);
    }
  };

  // --- ドラッグアンドドロップ処理 ---

  // 並べ替えは絞り込み中・手動以外の並び順のときはできない。
  // ただしフォルダへ放り込むほうは常にできる（それが主な移動手段なので）。
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, memo: Memo) => {
    setDraggedMemoId(memo.id);
    setDragOverMemoId(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', memo.id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, memoId: string) => {
    if (!isDragEnabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverMemoId !== memoId) {
      setDragOverMemoId(memoId);
    }
  };

  const handleDragEnd = () => {
    setDraggedMemoId(null);
    setDragOverMemoId(null);
    setDragOverFolder(undefined);
  };

  const handleFolderDragOver = (e: React.DragEvent<HTMLElement>, folder: FolderSelection) => {
    if (!draggedMemoId || folder === ALL_FOLDERS) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverFolder !== folder) setDragOverFolder(folder);
  };

  const handleFolderDrop = async (e: React.DragEvent<HTMLElement>, folder: FolderSelection) => {
    e.preventDefault();
    setDragOverFolder(undefined);
    const id = draggedMemoId;
    setDraggedMemoId(null);
    if (!id || folder === ALL_FOLDERS) return;
    await moveMemoToFolder(id, folder);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetMemoId: string) => {
    e.preventDefault();
    setDragOverMemoId(null); // ハイライト解除
    
    if (!isDragEnabled) return; // 並べ替えができない状態（絞り込み中・並び順指定中）
    if (!draggedMemoId || draggedMemoId === targetMemoId) return;

    // 並べ替えは「画面に見えている順」(filteredMemos: ★優先ソート済み) を基準にする。
    // 元の memos 配列でインデックスを取ると、★付きメモがあるだけで
    // 表示順とズレて意図しない行が動いてしまう。
    const newMemos = [...filteredMemos];
    const dragIndex = newMemos.findIndex(m => m.id === draggedMemoId);
    const dropIndex = newMemos.findIndex(m => m.id === targetMemoId);

    if (dragIndex === -1 || dropIndex === -1) return;

    // 配列の並び替え
    const [draggedItem] = newMemos.splice(dragIndex, 1);
    newMemos.splice(dropIndex, 0, draggedItem);

    // orderフィールドを更新
    const updatedMemos = newMemos.map((m, index) => ({ ...m, order: index }));
    setMemos(updatedMemos);
    setDraggedMemoId(null);

    // 未ログインはこのブラウザへ（memos の変更をまとめて書く effect が拾う）
    if (!currentUser) return;
    // Firestoreに一括保存
    try {
      const batch = writeBatch(db);
      updatedMemos.forEach(m => {
        const ref = doc(db, 'users', currentUser.uid, 'memos', m.id);
        batch.update(ref, { order: m.order });
      });
      await batch.commit();
    } catch (error) {
      console.error('並び替えの保存に失敗しました', error);
    }
  };

  // ------------------------------------

  const formatDoc = (command: string, value?: string) => {
    if (currentMemo?.isLocked) return;
    document.execCommand(command, false, value);
    updateCharCount();
    if (command === 'foreColor' || command === 'backColor') {
      setShowColorPalette(null);
    }
  };

  /** 手で DOM を書き換えたとき（入力イベントが出ない操作）の自動保存 */
  const scheduleSave = () => {
    isEditingRef.current = true;
    updateCharCount();
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveMemoRef.current(true).then(() => setTimeout(() => { isEditingRef.current = false; }, 500));
    }, 1000);
  };

  // --- チェック項目: 行頭に ☐ を入れ、☐ / ☑ を押すと切り替わる（PDF・Word にもそのまま出る文字）
  const insertCheckItem = () => {
    if (currentMemo?.isLocked) return;
    editorRef.current?.focus();
    document.execCommand('insertText', false, '☐ ');
  };
  const toggleCheckAtCaret = () => {
    const sel = window.getSelection();
    const node = sel?.anchorNode;
    if (!sel || !node || node.nodeType !== Node.TEXT_NODE || !editorRef.current?.contains(node)) return;
    const text = node.textContent ?? '';
    const off = sel.anchorOffset;
    // 押した位置の直前・直後どちらかの ☐☑ を切り替える
    for (const i of [off - 1, off]) {
      const ch = text[i];
      if (ch === '☐' || ch === '☑') {
        (node as Text).replaceData(i, 1, ch === '☐' ? '☑' : '☐');
        scheduleSave();
        return;
      }
    }
  };

  // --- 画像: 長辺 1600px に縮めて、自分の保管場所（userUploads/{uid}/）に置き、その画像を挿入。
  // 未ログインは保管場所が無いので、長辺 1000px・やや強めの圧縮で本文に埋め込む（このブラウザの容量は約 5MB）。
  // ログインしたときの移行で、埋め込んだ画像は保管場所へ上げ直す（uploadInlineImages）。
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const insertImage = async (file: File) => {
    if (currentMemo?.isLocked) return;
    setImageBusy(true);
    try {
      const bitmap = await createImageBitmap(file);
      const longSide = currentUser ? 1600 : 1000;
      const scale = Math.min(1, longSide / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      let url: string;
      if (currentUser) {
        const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('変換できません'))), 'image/jpeg', 0.82));
        const path = `userUploads/${currentUser.uid}/memo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        await uploadBytes(storageRef(storage, path), blob, { contentType: 'image/jpeg' });
        url = await getDownloadURL(storageRef(storage, path));
      } else {
        url = canvas.toDataURL('image/jpeg', 0.7);
        // 1 枚 400KB を超える画像は、このブラウザの容量をすぐ使い切るので断る
        if (url.length > 400_000) {
          flashHeadNotice('画像が大きすぎてこのブラウザには保存できません。ログインすると大きな画像も貼れます。');
          return;
        }
      }
      editorRef.current?.focus();
      document.execCommand('insertHTML', false, `<img src="${url}" alt="" style="max-width:100%;height:auto;display:block;margin:4px 0" /><br>`);
      scheduleSave();
    } catch (e) {
      console.error('画像の挿入に失敗', e);
      flashHeadNotice('画像を入れられませんでした（JPEG・PNG・HEIC 以外は読めないことがあります）');
    } finally {
      setImageBusy(false);
    }
  };

  // --- 音声入力: ブラウザの音声認識（Chrome・Edge・Safari）。確定した文だけをカーソル位置に入れる
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const speechSupported = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || currentMemo?.isLocked) return;
    const rec = new SR();
    rec.lang = 'ja-JP';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (ev: any) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) {
          editorRef.current?.focus();
          document.execCommand('insertText', false, ev.results[i][0].transcript);
        }
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    editorRef.current?.focus();
    rec.start();
    setListening(true);
  };
  useEffect(() => () => recognitionRef.current?.stop(), []);

  // --- 見出し帯の「できること」から各機能へ飛ぶための足場。
  // ツールバーの奥にあって気づかれなかった機能を、帯から直接呼べるようにする。
  const templatesRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const foldersRef = useRef<HTMLDivElement>(null);
  const [headNotice, setHeadNotice] = useState('');
  const headNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashHeadNotice = (text: string) => {
    setHeadNotice(text);
    if (headNoticeTimer.current) clearTimeout(headNoticeTimer.current);
    headNoticeTimer.current = setTimeout(() => setHeadNotice(''), 5000);
  };
  useEffect(() => () => { if (headNoticeTimer.current) clearTimeout(headNoticeTimer.current); }, []);
  const scrollToRef = (r: React.RefObject<HTMLElement | null>) =>
    r.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  /** メモに書き込む機能は、メモを開いているときだけ動く（未ログインでも可）。足りなければ理由を出す。 */
  const needMemo = () => {
    if (!currentMemo) { flashHeadNotice('左の一覧からメモを開くか、「新規メモ」で作ってから使ってください。'); return false; }
    if (currentMemo.isLocked) { flashHeadNotice('このメモはロック中です。一覧の鍵を外すと書き込めます。'); return false; }
    return true;
  };

  /**
   * 宿題→Myタスク。未ログインでも使える（Myタスクも未ログインはこのブラウザに入る）。
   * 以前は未ログインだとボタンが押せず、「ログイン」札だけで何が要るのか分からなかった。
   */
  const openHomework = () => {
    if (needMemo()) setHomeworkText(editorRef.current?.innerText ?? '');
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const updateCharCount = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || '';
      setCharCount(text.length);
    }
  };

  const saveCursorPosition = (): number => {
    if (!editorRef.current) return 0;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
  };

  const restoreCursorPosition = (cursorPos: number) => {
    if (!editorRef.current || cursorPos === 0) return;
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT, null);
    let charCount = 0;
    let textNode: Node | null = null;
    let offset = 0;
    
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const nodeLength = node.textContent?.length || 0;
      if (charCount + nodeLength >= cursorPos) {
        textNode = node;
        offset = cursorPos - charCount;
        break;
      }
      charCount += nodeLength;
    }
    
    if (textNode) {
      const maxOffset = textNode.textContent?.length || 0;
      range.setStart(textNode, Math.min(offset, maxOffset));
      range.setEnd(textNode, Math.min(offset, maxOffset));
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  /**
   * 新しいメモの id を先に決める。
   * ★以前は仮の id（tmp-）で表示し addDoc の完了後に差し替えていたため、その間に打った文字の
   *   自動保存がもう一度 addDoc を呼び、同じメモが 2 件できることがあった。
   *   ログイン中は Firestore の自動 id を先に取り、未ログインは g- で始まる id にする。
   */
  const newMemoId = () =>
    currentUser ? doc(collection(db, 'users', currentUser.uid, 'memos')).id : `g-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const createNewMemo = async (template?: MemoTemplate) => {
    // 未ログインでも作れる（このブラウザに保存）。以前はここで alert を出して止めていた
    const now = new Date()
    const minOrder = memos.length > 0 ? Math.min(...memos.map(m => m.order ?? 0)) : 0;
    const newOrder = minOrder - 1;

    // ひな形から作る場合は、日付入りの表題と見出しを先に入れておく
    const title = template ? `${template.title} ${now.toLocaleDateString('ja-JP')}` : '新しいメモ';
    // 物件を選んでいれば、その物件のフォルダに入れ、ひな形の「物件名」にも入れる（台帳の名前にそろえる）
    const typedProject = newMemoProject.trim();
    const project = typedProject ? registry.find(typedProject)?.name ?? typedProject : '';
    const content = template ? fillProjectName(template.content, project) : '';
    const category = project || (template ? template.category : '');
    if (project && !folderNames.includes(project)) void persistFolders([...savedFolders, project]);

    const created: Memo = { id: newMemoId(), title, content, category, tags: [], createdAt: now, updatedAt: now, isFavorite: false, isLocked: false, order: newOrder }
    // 絞り込み中のフォルダに作ったメモが見えなくならないよう、フォルダの絞り込みを外す
    if (selectedFolder !== ALL_FOLDERS && selectedFolder !== category) setSelectedFolder(ALL_FOLDERS)
    setMemos(prev => [created, ...prev])
    setCurrentMemo(created)
    setMemoTitle(title)
    setMemoCategory(category)
    setMemoTags('')
    if (editorRef.current) {
      editorRef.current.innerHTML = content
      editorRef.current.focus()
      // ひな形なら最初の空行（最初の見出しの下）にキャレットを置く。
      // 以前は先頭に置かれ、打った文字が見出し「日時・場所」の前に入っていた
      const blank = Array.from(editorRef.current.querySelectorAll('p')).find(p => p.innerHTML === '<br>')
      const sel = window.getSelection()
      if (blank && sel) {
        const range = document.createRange()
        range.setStart(blank, 0)
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
      }
    }
    updateCharCount()
    if (!currentUser) return
    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'memos', created.id), { title, content, category, tags: [], createdAt: now.getTime(), updatedAt: now.getTime(), isFavorite: false, isLocked: false, order: newOrder } as any)
    } catch (e) {
      console.error('メモの作成に失敗しました', e)
      setSaveStatus('保存に失敗しました。通信状態を確認してください')
    }
  };

  const saveMemo = async (isAutoSave: boolean = false): Promise<void> => {
    if (!currentMemo) {
      const now = new Date()
      const minOrder = memos.length > 0 ? Math.min(...memos.map(m => m.order ?? 0)) : 0;
      const newOrder = minOrder - 1;

      // メモを開かずに本文・表題を書き始めたとき。その内容で新しいメモを作る
      const newMemo: Memo = { id: newMemoId(), title: memoTitle || '新しいメモ', content: editorRef.current?.innerHTML || '', category: memoCategory, tags: memoTags.split(',').map(t=>t.trim()).filter(Boolean), createdAt: now, updatedAt: now, isFavorite: false, isLocked: false, order: newOrder }
      setMemos(prev => [newMemo, ...prev])
      setCurrentMemo(newMemo)
      if (!memoTitle) setMemoTitle(newMemo.title)
      try {
        if (currentUser) {
          await setDoc(doc(db, 'users', currentUser.uid, 'memos', newMemo.id), { title: newMemo.title, content: newMemo.content, category: newMemo.category, tags: newMemo.tags, createdAt: now.getTime(), updatedAt: now.getTime(), isFavorite: false, isLocked: false, order: newOrder } as any)
        }
        // 未ログインは memos の変更を書く effect がこのブラウザへ保存する
        setSaveStatus(currentUser ? '保存しました' : 'このブラウザに保存しました')
        setTimeout(() => setSaveStatus(''), 2000)
      } catch {
        setSaveStatus('保存に失敗しました')
        setTimeout(() => setSaveStatus(''), 3000)
      }
      return
    }
    // ロック状態のメモは保存を防止
    if (currentMemo.isLocked) {
      if (!isAutoSave) {
        setSaveStatus('ロックされているため編集できません')
        setTimeout(() => setSaveStatus(''), 2000)
      }
      return
    }
    const now = new Date()
    const html = editorRef.current?.innerHTML || ''
    const updatedMemo: Memo = { ...currentMemo, title: memoTitle, content: html, category: memoCategory, tags: memoTags.split(',').map(tag => tag.trim()).filter(Boolean), updatedAt: now }

    setMemos(prev => prev.map(m => m.id === currentMemo.id ? updatedMemo : m))
    setCurrentMemo(updatedMemo)
    // ★更新関数の中で外の変数に代入しても、その時点で実行されている保証はない（空の一覧を控えに書いていた）
    const nextList = memos.map(m => m.id === currentMemo.id ? updatedMemo : m)
    try {
      if (currentUser) {
        localStorage.setItem(`generalMemos:${currentUser.uid}`, JSON.stringify(nextList.map(m => ({ ...m, createdAt: m.createdAt.getTime(), updatedAt: m.updatedAt.getTime() }))))
      }
    } catch {}

    if (!currentUser) {
      // memos の変更を書く effect がこのブラウザへ保存する（失敗は guestSaveFailed で出す）
      setSaveStatus(isAutoSave ? 'このブラウザに自動保存しました' : 'このブラウザに保存しました')
      setTimeout(() => setSaveStatus(''), 2000)
      return
    }

    try {
      const memoId = currentMemo.id
      if (memoId && memoId.startsWith('tmp-')) {
        const ref = await addDoc(collection(db, 'users', currentUser.uid, 'memos'), { title: updatedMemo.title, content: updatedMemo.content, category: updatedMemo.category, tags: updatedMemo.tags, createdAt: (updatedMemo.createdAt?.getTime?.() || Date.now()), updatedAt: now.getTime(), isFavorite: updatedMemo.isFavorite || false, isLocked: updatedMemo.isLocked || false, order: updatedMemo.order ?? 0 } as any)
        setMemos(prev => prev.map(m => m.id === memoId ? { ...m, id: ref.id } : m))
        setCurrentMemo(prev => prev && prev.id === memoId ? { ...prev, id: ref.id } : prev)
      } else {
        await setDoc(doc(db, 'users', currentUser.uid, 'memos', memoId), { title: updatedMemo.title, content: updatedMemo.content, category: updatedMemo.category, tags: updatedMemo.tags, updatedAt: now.getTime(), isFavorite: updatedMemo.isFavorite || false, isLocked: updatedMemo.isLocked || false, order: updatedMemo.order ?? 0 } as any, { merge: true })
      }
      // 手動保存ボタンが無く自動保存のみのため、自動保存でも結果を表示する
      setSaveStatus(isAutoSave ? '自動保存しました' : '保存しました')
      setTimeout(() => setSaveStatus(''), 2000)
    } catch {
      setSaveStatus('保存に失敗しました')
      setTimeout(() => setSaveStatus(''), 3000)
    }
  };

  // 自動保存のタイマーは「入力した瞬間の描画」の saveMemo を掴むので、そのままだと
  // 1つ前の値（変える前のフォルダ・最後の1文字が欠けた表題）を保存してしまう。
  // タイマーからは常にこの ref 経由で、その時点の最新の saveMemo を呼ぶ。
  const saveMemoRef = useRef(saveMemo);
  saveMemoRef.current = saveMemo;

  /**
   * 削除 = ゴミ箱へ移す（30 日は「ゴミ箱」から元に戻せる）。
   * ★以前は確認のあと即座に消え、取り返せなかった。
   * ゴミ箱へ書けたことを確かめてから元のメモを消す（ゴミ箱にも元にも無い、を作らない）。
   */
  const deleteCurrentMemo = async () => {
    if (!currentMemo) return
    if (!confirm(`「${memoTitle || currentMemo.title || '無題'}」をゴミ箱へ移します。\n${TRASH_DAYS} 日間は左の「ゴミ箱」から元に戻せます。`)) return;
    const id = currentMemo.id
    // 打ちかけの自動保存を止める（消したあとに保存が走って、メモが作り直されないように）
    if (autoSaveTimeoutRef.current) { clearTimeout(autoSaveTimeoutRef.current); autoSaveTimeoutRef.current = null }
    isEditingRef.current = false
    // 中身は画面のいま（保存前の打ちかけも含む）
    const snapshot: TrashedMemo = {
      ...currentMemo,
      title: memoTitle || currentMemo.title,
      content: editorRef.current?.innerHTML ?? currentMemo.content,
      category: memoCategory,
      tags: memoTags.split(',').map(t => t.trim()).filter(Boolean),
      deletedAt: Date.now(),
    }
    if (currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid, 'memoTrash', id), { ...memoDoc(snapshot), deletedAt: snapshot.deletedAt })
      } catch (e) {
        console.error('ゴミ箱へ移せませんでした', e)
        alert('ゴミ箱へ移せなかったので、削除をやめました。通信の状態を確かめて、もう一度押してください。')
        return
      }
    } else {
      // このブラウザ: 先にメモの一覧から外して容量を空けてから、ゴミ箱へ書く
      const rest = memos.filter(m => m.id !== id)
      writeGuestMemos(rest)
      const nextTrash = [snapshot, ...readGuestTrash().filter(m => m.id !== id)]
      if (!writeGuestTrash(nextTrash)) {
        writeGuestMemos(memos)
        if (!confirm('このブラウザの保存容量が足りず、ゴミ箱に入れられません。\nゴミ箱を通さずに完全に削除しますか？（元に戻せません）')) return
      } else {
        setTrash(nextTrash)
      }
    }
    setMemos(prev => prev.filter(m => m.id !== id))
    // 一覧で次に並んでいるメモを開く（以前は空の画面になり、続けて打つと新しいメモができていた）
    const next = filteredMemos.find(m => m.id !== id) ?? null
    if (next) selectMemo(next)
    else {
      setCurrentMemo(null)
      setMemoTitle('');
      setMemoCategory('');
      setMemoTags('');
      if (editorRef.current) editorRef.current.innerHTML = ''
      updateCharCount()
    }
    if (!currentUser) return
    try { await deleteDoc(doc(db, 'users', currentUser.uid, 'memos', id)) } catch {}
  };

  /** ゴミ箱から戻す。元のフォルダ（カテゴリ）のまま一覧に戻る */
  const restoreFromTrash = async (t: TrashedMemo) => {
    const { deletedAt: _d, ...memo } = t
    const restored: Memo = { ...memo, updatedAt: new Date() }
    if (currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid, 'memos', t.id), memoDoc(restored))
      } catch (e) {
        console.error('ゴミ箱から戻せませんでした', e)
        flashHeadNotice('元に戻せませんでした。通信の状態を確かめて、もう一度押してください。')
        return
      }
      try { await deleteDoc(doc(db, 'users', currentUser.uid, 'memoTrash', t.id)) } catch { /* 次に開いたとき残っていても、戻したメモは消えない */ }
    } else {
      const nextMemos = [restored, ...memos.filter(m => m.id !== t.id)]
      if (!writeGuestMemos(nextMemos)) {
        flashHeadNotice('このブラウザの保存容量が足りず、元に戻せませんでした。ほかのメモの画像を減らしてください。')
        return
      }
      const nextTrash = trash.filter(m => m.id !== t.id)
      writeGuestTrash(nextTrash)
      setTrash(nextTrash)
      setMemos(nextMemos)
    }
    setShowTrash(false)
    setSelectedFolder(ALL_FOLDERS)
    selectMemo(restored)
    flashHeadNotice(`「${restored.title || '無題'}」を元に戻しました。`)
  };

  /** ゴミ箱から完全に消す（ここだけは元に戻せない） */
  const purgeFromTrash = async (t: TrashedMemo) => {
    if (!confirm(`「${t.title || '無題'}」を完全に削除します。元に戻せません。`)) return
    if (currentUser) {
      try { await deleteDoc(doc(db, 'users', currentUser.uid, 'memoTrash', t.id)) } catch { flashHeadNotice('削除できませんでした。'); return }
    } else {
      const nextTrash = trash.filter(m => m.id !== t.id)
      writeGuestTrash(nextTrash)
      setTrash(nextTrash)
    }
  };

  const exportMemoToDocx = async () => {
    try {
      const html = editorRef.current?.innerHTML || ''
      const title = (memoTitle && memoTitle.trim()) ? memoTitle.trim() : 'メモ'
      const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_')
      const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>body{font-family:Meiryo, \"Yu Gothic\", sans-serif; font-size:12pt;}</style></head><body><h1>${title}</h1>${html}</body></html>`
      const blob = HtmlDocx.asBlob(fullHtml)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${safeTitle}.docx`
      a.click()
      // ★すぐ revoke するとダウンロードが始まる前に URL が消え、保存されないことがある
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (e) {
      console.error('Failed to export docx', e)
      alert('Word書き出しに失敗しました。')
    }
  }

  const exportMemoToPDF = async () => {
    // 既存のwrapperがあれば先に削除
    const existingWrapper = document.getElementById('pdf-export-wrapper');
    if (existingWrapper) document.body.removeChild(existingWrapper);

    let wrapper: HTMLDivElement | null = null;
    try {
      let html2pdfModule;
      try {
        html2pdfModule = await import('html2pdf.js');
      } catch (importError) {
        console.error('html2pdf.js import failed:', importError);
        alert('PDFライブラリの読み込みに失敗しました。ページを再読み込みしてお試しください。');
        return;
      }
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const element = editorRef.current;
      if (!element) {
        alert('エディタが見つかりません。');
        return;
      }

      const title = (memoTitle && memoTitle.trim()) ? memoTitle.trim() : 'メモ';
      const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_');

      wrapper = document.createElement('div');
      wrapper.id = 'pdf-export-wrapper';

      // タイトルはテキストノードとして安全に挿入
      const containerDiv = document.createElement('div');
      containerDiv.className = 'pdf-container';
      const h1 = document.createElement('h1');
      h1.style.cssText = 'font-size:18pt; margin-bottom:20px; border-bottom:2px solid #333; padding-bottom:10px; font-family: Meiryo, sans-serif;';
      h1.textContent = title;
      const contentDiv = document.createElement('div');
      contentDiv.className = 'pdf-content';
      contentDiv.innerHTML = element.innerHTML;
      containerDiv.appendChild(h1);
      containerDiv.appendChild(contentDiv);
      wrapper.appendChild(containerDiv);

      Object.assign(wrapper.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        zIndex: '10000',
        backgroundColor: '#ffffff',
        overflow: 'auto',
        padding: '20px',
        boxSizing: 'border-box'
      });

      const containerStyle = document.createElement('style');
      containerStyle.innerHTML = `
        #pdf-export-wrapper .pdf-container {
          width: 750px;
          margin: 0 auto;
          color: #000000;
          font-family: "Meiryo", "Yu Gothic", "Hiragino Kaku Gothic ProN", sans-serif;
          font-size: 10.5pt;
          line-height: 1.8;
          text-align: left;
          word-wrap: break-word;
        }
        #pdf-export-wrapper .pdf-content span {
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
          padding: 2px 0;
        }
        #pdf-export-wrapper img {
          max-width: 100%;
          height: auto;
        }
        #pdf-export-wrapper p,
        #pdf-export-wrapper div,
        #pdf-export-wrapper li {
          page-break-inside: avoid;
        }
      `;
      wrapper.appendChild(containerStyle);
      document.body.appendChild(wrapper);

      const opt = {
        margin:       [10, 10, 10, 10] as [number, number, number, number],
        filename:     `${safeTitle}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.95 },
        html2canvas:  {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          letterRendering: true,
          scrollY: 0,
          windowWidth: 1000,
          backgroundColor: '#ffffff',
          logging: false
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak:    { mode: ['css', 'legacy'] }
      };

      const pdfContainer = wrapper.querySelector('.pdf-container') as HTMLElement;
      if (!pdfContainer) {
        throw new Error('PDF container not found');
      }
      await html2pdf().set(opt).from(pdfContainer).save();
    } catch (e) {
      console.error('Failed to export PDF', e);
      alert('PDF書き出しに失敗しました。');
    } finally {
      if (wrapper && document.body.contains(wrapper)) {
        document.body.removeChild(wrapper);
      }
    }
  };

  const selectMemo = (memo: Memo) => {
    isEditingRef.current = false;
    setCurrentMemo(memo);
    setMemoTitle(memo.title);
    setMemoCategory(memo.category);
    setMemoTags(memo.tags.join(', '));
    if (editorRef.current) {
      editorRef.current.innerHTML = memo.content;
      editorRef.current.scrollTop = 0; // 別メモ選択時は本文を常に最上部から表示
    }
    updateCharCount();
  };

  const toggleFavorite = async (memoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const memo = memos.find(m => m.id === memoId);
    if (!memo) return;
    const newFavorite = !(memo.isFavorite || false);
    setMemos(prev => prev.map(m => m.id === memoId ? { ...m, isFavorite: newFavorite } : m));
    if (currentMemo?.id === memoId) {
      setCurrentMemo(prev => prev ? { ...prev, isFavorite: newFavorite } : null);
    }
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'memos', memoId), { isFavorite: newFavorite });
    } catch (error) {
      console.error('お気に入りの更新に失敗しました', error);
    }
  };

  const toggleMemoLock = async (memoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const memo = memos.find(m => m.id === memoId);
    if (!memo) return;
    const newLocked = !(memo.isLocked || false);
    setMemos(prev => prev.map(m => m.id === memoId ? { ...m, isLocked: newLocked } : m));
    if (currentMemo?.id === memoId) {
      setCurrentMemo(prev => prev ? { ...prev, isLocked: newLocked } : null);
    }
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'memos', memoId), { isLocked: newLocked });
    } catch (error) {
      console.error('ロックの更新に失敗しました', error);
    }
  };

  const filteredMemos = memos.filter(memo => {
    // 本文の HTML をそのまま突き合わせると、色やフォントの指定に当たって
    // 関係ないメモが引っかかる。タグを外した文字列で探す。
    const needle = searchTerm.toLowerCase();
    const matchesSearch = !needle ||
                         memo.title.toLowerCase().includes(needle) ||
                         stripHtml(memo.content).toLowerCase().includes(needle);
    // フォルダ = メモのカテゴリ。null なら全部、空文字なら未分類だけ。
    const matchesFolder = selectedFolder === ALL_FOLDERS || (memo.category || UNFILED) === selectedFolder;
    const matchesTag = !tagFilter || memo.tags.includes(tagFilter);
    return matchesSearch && matchesFolder && matchesTag;
  }).sort((a, b) => {
    // ★ を先頭に置くのは手動（ドラッグ順）のときだけ。更新順などを選んだのに ★ が
    // 先に来ると、選んだ順に並ばず「効かない」ように見えるので、その順番どおりに並べる。
    if (sortOrder === 'manual') {
      const aFavorite = a.isFavorite || false;
      const bFavorite = b.isFavorite || false;
      if (aFavorite !== bFavorite) return aFavorite ? -1 : 1;
    }
    return compareMemos(a, b, sortOrder);
  });

  const allTagsFlat = memos.map(memo => memo.tags).reduce((acc, curr) => acc.concat(curr), []);
  const allTags = Array.from(new Set(allTagsFlat));

  // フィルター有効時はD&D無効化
  // 並び順を指定している間は手で動かせない（動かしても並べ直されるため）
  const isDragEnabled = !searchTerm && selectedFolder === ALL_FOLDERS && !tagFilter && sortOrder === 'manual';

  return (
    <div className="bg-white h-full lg:h-[calc(100vh-var(--nav-height))] flex flex-col">
      <ToolHeader
        no="03"
        code="MEMO"
        title="メモ"
        description="打合せ・現場巡回・電話の記録をその場で残し、宿題はタスクへ、清書は PDF・Word で渡す。"
        features={[
          {
            label: 'テンプレート（議事録ほか）',
            hint: '議事録・現場巡回記録・是正指示・電話メモ・施主要望のひな形から作る',
            onClick: () => scrollToRef(templatesRef),
          },
          {
            label: 'チェック項目',
            hint: '行頭に ☐ を入れる。☐ を押すと ☑ に切り替わる',
            onClick: () => { if (needMemo()) insertCheckItem(); },
          },
          {
            label: '画像',
            hint: '写真を縮めてメモに貼る（ログイン中は写真の保管場所に置き、端末間でも見られる）',
            onClick: () => { if (needMemo()) imageInputRef.current?.click(); },
          },
          {
            label: '音声入力',
            hint: speechSupported ? '話した言葉をカーソル位置に入れる' : 'このブラウザは音声入力に対応していません',
            active: listening,
            onClick: () => {
              if (!speechSupported) { flashHeadNotice('このブラウザは音声入力に対応していません（Chrome・Edge・Safari で使えます）'); return; }
              if (listening || needMemo()) toggleVoice();
            },
          },
          {
            label: '宿題→Myタスク',
            hint: '宿題・指摘・☐ の行を担当・期限ごと Myタスクに入れる',
            active: homeworkText !== null,
            onClick: () => openHomework(),
          },
          {
            label: 'PDF・Word書き出し',
            hint: '開いているメモを A4 の PDF か Word（.docx）で書き出す',
            onClick: () => scrollToRef(exportRef),
          },
          {
            label: 'フォルダ・タグ',
            hint: 'メモをフォルダへドラッグして仕分け、タグで絞り込む',
            onClick: () => scrollToRef(foldersRef),
          },
        ]}
      />
      {headNotice && (
        <p className="px-4 py-1.5 text-[11px] text-gray-600 border-b border-gray-200 shrink-0" role="status">{headNotice}</p>
      )}
      {!currentUser && (
        <div className="px-4 pt-3 shrink-0">
          {guestSaveFailed ? (
            <GuestNote>このブラウザの保存容量（約 5MB）を超えたため、最後の変更を保存できていません。画像を減らすか、ログインしてください。</GuestNote>
          ) : (
            <GuestNote />
          )}
        </div>
      )}
      {/* スマホ幅では一覧と本文を縦に積む（以前は 2 列のまま詰まり、書式ツールバーが縦 1 列に崩れていた） */}
      <div className="p-4 flex-1 min-h-0 overflow-y-auto md:overflow-hidden [&>*]:border [&>*]:border-[#3b3b3b] [&>*]:p-3">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:h-full">
          {/* 左サイド：メモ一覧 */}
          <div className="w-full md:w-1/5 flex flex-col md:min-w-[200px] border-b md:border-b-0 md:border-r border-[#3b3b3b] pb-4 md:pb-0 md:pr-4">
            <div className="mb-3 shrink-0">
              <button
                onClick={() => createNewMemo()}
                className="yy-btn yy-btn--primary w-full flex items-center justify-center gap-1 mb-1.5"
              >
                <FiPlus className="w-3 h-3" />
                新規メモ
              </button>
              {/* 物件を選ぶと、新しいメモ（ひな形も）はその物件のフォルダに入る。物件は台帳（ほかのツールと共通）から */}
              <div className="mb-2">
                <p className="yy-mono text-[10px] tracking-[0.12em] uppercase text-gray-500 mb-1">物件（入れるフォルダ）</p>
                <ProjectPicker
                  value={newMemoProject}
                  onChange={setNewMemoProject}
                  placeholder="なし（ひな形のフォルダ）"
                  label="新しいメモの物件"
                  className="w-full flex-wrap [&_input]:!w-full [&_input]:!h-7 [&_input]:!text-[11px]"
                />
              </div>

              {/* ひな形から作る。白紙だと「誰が・いつまでに」が毎回抜けるので。 */}
              <div ref={templatesRef} className="scroll-mt-2 mb-2">
                <p className="yy-mono text-[10px] tracking-[0.12em] uppercase text-gray-500 mb-1">ひな形</p>
                <div className="flex flex-wrap gap-1">
                  {MEMO_TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => createNewMemo(t)}
                      title={`${t.label}のひな形で新規作成`}
                      className="text-[10px] px-1.5 py-1 border border-gray-300 bg-white text-gray-600 hover:border-[#3b3b3b] hover:text-gray-900 transition-colors"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="メモを検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 text-[11px] border border-gray-200 focus:outline-none focus:border-gray-400"
                />
                <FiSearch className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            {/* フォルダ。行にメモをドラッグして放り込める。 */}
            <div ref={foldersRef} className="scroll-mt-2 mb-3 shrink-0 border border-[#3b3b3b]">
              <div className="flex items-center justify-between px-2 py-1 bg-gray-50 border-b border-[#3b3b3b]">
                <span className="yy-mono text-[10px] tracking-[0.12em] uppercase text-gray-500">フォルダ</span>
                <button
                  type="button"
                  onClick={() => setShowFolderInput(v => !v)}
                  className="px-1 text-gray-500 hover:text-gray-900"
                  title="フォルダを追加"
                  aria-label="フォルダを追加"
                >
                  <FiPlus className="w-3 h-3" />
                </button>
              </div>

              {showFolderInput && (
                // フォルダ名は物件の台帳から選べる（議事録・現場のような物件でないフォルダもそのまま作れる）
                <div
                  className="flex gap-1 p-1.5 border-b border-gray-200 items-start"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing && (e.target as HTMLElement).tagName === 'INPUT') addFolder();
                    if (e.key === 'Escape') setShowFolderInput(false);
                  }}
                >
                  <ProjectPicker
                    value={newFolderName}
                    onChange={setNewFolderName}
                    placeholder="フォルダ名・物件"
                    label="新しいフォルダの名前"
                    className="flex-1 min-w-0 flex-wrap [&_input]:!w-full [&_input]:!h-7 [&_input]:!text-[11px]"
                  />
                  <button type="button" onClick={addFolder} className="yy-btn yy-btn--primary !px-2 !py-1 text-[10px] shrink-0">追加</button>
                </div>
              )}

              <div className="max-h-[132px] overflow-y-auto">
                {([ALL_FOLDERS, ...folderNames, UNFILED] as FolderSelection[]).map((folder) => {
                  const isAll = folder === ALL_FOLDERS;
                  const isUnfiled = folder === UNFILED;
                  const label = isAll ? 'すべて' : isUnfiled ? '未分類' : folder;
                  const selected = selectedFolder === folder;
                  const isOver = dragOverFolder === folder;
                  // 未分類はメモが無ければ出さない（常にある空行は邪魔なので）
                  if (isUnfiled && countInFolder(UNFILED) === 0) return null;

                  return (
                    <div
                      key={isAll ? '__all__' : isUnfiled ? '__unfiled__' : folder}
                      onDragOver={(e) => handleFolderDragOver(e, folder)}
                      onDragLeave={() => setDragOverFolder(undefined)}
                      onDrop={(e) => handleFolderDrop(e, folder)}
                      className={`flex items-center gap-1 px-2 py-1 text-[11px] cursor-pointer group ${
                        isOver ? 'bg-amber-100' : selected ? 'bg-gray-200 font-bold' : 'hover:bg-gray-50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFolder(folder);
                          setShowTrash(false);
                          // 物件のフォルダを開いたら、新しいメモもその物件に入れる
                          if (folder && projectOfFolder(folder)) setNewMemoProject(projectOfFolder(folder)!.name);
                        }}
                        className="flex-1 text-left truncate bg-transparent border-0 p-0"
                      >
                        {!isAll && <FiFolder className="inline w-3 h-3 mr-1 -mt-px text-gray-400" />}{label}
                        <span className="yy-mono ml-1 text-[10px] text-gray-400">{countInFolder(folder)}</span>
                        {!isAll && !isUnfiled && projectOfFolder(folder as string) && (
                          <span className="yy-mono ml-1 text-[9px] tracking-[0.08em] text-[#2f7f6d]" title="物件の台帳にある物件">物件</span>
                        )}
                      </button>
                      {!isAll && !isUnfiled && (
                        <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => renameFolder(folder as string)}
                            className="text-gray-400 hover:text-gray-700 bg-transparent border-0 p-0"
                            title="名前を変更"
                          >
                            <FiEdit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteFolder(folder as string)}
                            className="text-gray-400 hover:text-red-600 bg-transparent border-0 p-0"
                            title="フォルダを削除（中のメモは未分類へ）"
                          >
                            <FiTrash2 className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                    </div>
                  );
                })}
                {/* ゴミ箱（30 日で消える。それまでは元に戻せる） */}
                {trash.length > 0 && (
                  <div className={`flex items-center gap-1 px-2 py-1 text-[11px] cursor-pointer border-t border-gray-200 ${showTrash ? 'bg-gray-200 font-bold' : 'hover:bg-gray-50'}`}>
                    <button type="button" onClick={() => setShowTrash(v => !v)} className="flex-1 text-left truncate bg-transparent border-0 p-0 text-gray-600">
                      <FiTrash2 className="inline w-3 h-3 mr-1 -mt-px text-gray-400" />ゴミ箱
                      <span className="yy-mono ml-1 text-[10px] text-gray-400">{trash.length}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 mb-3 shrink-0">
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="flex-1 text-[11px] border border-gray-200 px-2 py-1.5 focus:outline-none focus:border-gray-400"
              >
                <option value="">タグ</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            {/* 並び順。ブックマークは順番に関係なく先頭に残る。 */}
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <label className="text-[10px] text-gray-500 shrink-0">並び順</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as MemoSortOrder)}
                className="flex-1 text-[11px] border border-gray-200 px-2 py-1.5 focus:outline-none"
              >
                {MEMO_SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 overflow-y-auto pr-2 flex-1 max-h-56 md:max-h-none">
              {showTrash ? (
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    削除したメモは {TRASH_DAYS} 日ここに残り、過ぎると消えます。
                  </p>
                  {trash.map((t) => (
                    <div key={t.id} className="p-2 border border-gray-200">
                      <div className="text-[11px] truncate">{t.title || '無題'}</div>
                      <div className="yy-mono text-[10px] tracking-[0.08em] text-gray-500 mt-0.5">
                        {new Date(t.deletedAt).toLocaleDateString()} 削除 · あと {daysLeftInTrash(t.deletedAt)} 日{t.category ? ` · ${t.category}` : ''}
                      </div>
                      <div className="flex gap-3 mt-1 text-[10px]">
                        <button type="button" onClick={() => void restoreFromTrash(t)} className="underline underline-offset-2 font-bold text-gray-900">元に戻す</button>
                        <button type="button" onClick={() => void purgeFromTrash(t)} className="underline underline-offset-2 text-gray-500 hover:text-red-600">完全に削除</button>
                      </div>
                    </div>
                  ))}
                  {trash.length === 0 && <p className="text-[11px] text-gray-400">ゴミ箱は空です</p>}
                </div>
              ) : filteredMemos.map((memo, index) => {
                const isDragging = isDragEnabled && draggedMemoId === memo.id;
                const isOver = isDragEnabled && dragOverMemoId === memo.id;
                
                // 挿入位置（バー）の表示判定
                let showTopBar = false;
                let showBottomBar = false;
                
                if (isOver && draggedMemoId) {
                  const dragIndex = filteredMemos.findIndex(m => m.id === draggedMemoId);
                  if (dragIndex !== -1 && dragIndex !== index) {
                     if (dragIndex > index) showTopBar = true; // 上に移動中 -> 上にバー
                     if (dragIndex < index) showBottomBar = true; // 下に移動中 -> 下にバー
                  }
                }

                return (
                  <React.Fragment key={memo.id}>
                    {/* 挿入ガイドバー (上) */}
                    {showTopBar && <div className="h-px w-full bg-[#52AA96] my-1" />}
                    
                    <div 
                      draggable
                      onDragStart={(e) => handleDragStart(e, memo)}
                      onDragOver={(e) => handleDragOver(e, memo.id)}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, memo.id)}
                  onClick={() => selectMemo(memo)}
                      className={`p-2 border cursor-pointer hover:bg-gray-50 flex items-start gap-2 transition-colors ${
                    currentMemo?.id === memo.id ? 'border-[#141414] border-l-[#52AA96] bg-gray-50' : 'border-gray-200'
                      } ${isDragging ? 'opacity-40' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                  <div className={`text-[11px] truncate ${currentMemo?.id === memo.id ? 'font-bold' : ''}`}>{memo.title}</div>
                  <div className="yy-mono text-[10px] tracking-[0.08em] text-gray-500 mt-1 truncate">
                    {memo.updatedAt.toLocaleDateString()}
                    {selectedFolder === ALL_FOLDERS && projectOfFolder(memo.category) && <span className="ml-1 text-[#2f7f6d]">{projectOfFolder(memo.category)!.name}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 items-center">
                    <button
                      onClick={(e) => toggleFavorite(memo.id, e)}
                      title={memo.isFavorite ? 'ブックマークを外す' : 'ブックマーク（手動の並びで先頭に残す）'}
                      className={`p-0.5 hover:bg-gray-200 transition-colors ${
                        memo.isFavorite ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      <FiStar className={`w-3 h-3 ${memo.isFavorite ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => toggleMemoLock(memo.id, e)}
                      title={memo.isLocked ? 'ロックを外す' : '書き換えられないようにロック'}
                      className={`p-0.5 hover:bg-gray-200 transition-colors ${
                        memo.isLocked ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {memo.isLocked ? <LockClosedIcon className="w-3 h-3" /> : <LockOpenIcon className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                    {/* 挿入ガイドバー (下) */}
                    {showBottomBar && <div className="h-px w-full bg-[#52AA96] my-1" />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* 右サイド：エディタ */}
          <div className="flex-1 min-w-0 flex flex-col relative md:h-full">
            <div className="space-y-3 flex flex-col md:h-full">
              {/* タイトル入力欄 */}
              <div className="flex flex-wrap items-center gap-2 justify-between shrink-0">
                <input 
                  type="text" 
                  placeholder="memo title" 
                  value={memoTitle}
                  disabled={currentMemo?.isLocked || false}
                  onCompositionStart={() => { isComposingRef.current = true; }}
                  onCompositionEnd={(e) => {
                    if (currentMemo?.isLocked) return;
                    isComposingRef.current = false;
                    isEditingRef.current = true;
                    setMemoTitle(e.currentTarget.value);
                    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
                    autoSaveTimeoutRef.current = setTimeout(() => {
                      { // メモを開いていなくても保存する（無ければこの内容で新しいメモを作る）
                        saveMemoRef.current(true).then(() => setTimeout(() => { isEditingRef.current = false; }, 500));
                      }
                    }, 1000);
                  }}
                  onChange={(e) => {
                    if (currentMemo?.isLocked) return;
                    isEditingRef.current = true;
                    setMemoTitle(e.target.value);
                    if (!isComposingRef.current) {
                      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
                      autoSaveTimeoutRef.current = setTimeout(() => {
                        { // メモを開いていなくても保存する（無ければこの内容で新しいメモを作る）
                          saveMemoRef.current(true).then(() => setTimeout(() => { isEditingRef.current = false; }, 500));
                        }
                      }, 1000);
                    }
                  }}
                  className={`flex-1 min-w-[12rem] text-[12px] font-bold border-b border-gray-200 px-2 py-1.5 focus:outline-none focus:border-gray-400 ${currentMemo?.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                />
                <div ref={exportRef} className="flex flex-wrap gap-2 scroll-mt-2">
                  <button
                    onClick={exportMemoToPDF}
                    className="yy-btn flex items-center gap-1"
                  >
                    <FiFileText className="w-3 h-3" />
                    PDF書き出し
                  </button>
                  <button
                    onClick={exportMemoToDocx}
                    className="yy-btn flex items-center gap-1"
                  >
                    <FiDownload className="w-3 h-3" />
                    Word書き出し
                  </button>
                  {currentMemo && (
                    <button
                      onClick={deleteCurrentMemo}
                      className="yy-btn flex items-center gap-1 hover:!text-red-600"
                    >
                      <FiTrash2 className="w-3 h-3"/> 削除
                    </button>
                  )}
                </div>
              </div>

              {/* カテゴリとタグ */}
              <div className="flex flex-wrap gap-2 shrink-0">
                <div className="relative flex-1 min-w-[10rem]">
                  <FolderPicker
                    value={memoCategory}
                    folders={folderNames}
                    projects={registry.active.map(p => p.name).filter(n => !folderNames.some(f => projectKey(f) === projectKey(n)))}
                    isProject={(name) => !!projectOfFolder(name)}
                    disabled={!currentMemo || !!currentMemo.isLocked}
                    onPick={(typed) => {
                      const name = typed ? registry.find(typed)?.name ?? typed : typed;
                      setMemoCategory(name);
                      if (currentMemo) void moveMemoToFolder(currentMemo.id, name);
                    }}
                  />
                </div>
                {/* このメモの物件（フォルダが台帳の物件のとき）。物件ハブでタスク・メール・ボードと並べて見られる */}
                {currentMemo && projectOfFolder(memoCategory) && (
                  <a
                    href={`/bukken/?p=${encodeURIComponent(projectOfFolder(memoCategory)!.id)}`}
                    className="self-center text-[10px] text-[#2f7f6d] underline underline-offset-2 shrink-0"
                    title="この物件のタスク・メモ・メール・ボードを 1 画面で見る"
                  >
                    物件: {projectOfFolder(memoCategory)!.name}
                  </a>
                )}
                <div className={`flex-1 min-w-[10rem] flex items-stretch border border-gray-200 bg-white ${currentMemo?.isLocked ? 'bg-gray-100 opacity-60' : ''}`}>
                  <span className="flex items-center px-2 text-gray-400 shrink-0">
                    <FiTag className="w-3 h-3" />
                  </span>
                  <input 
                    type="text" 
                    placeholder="タグ (カンマ区切り)..." 
                    value={memoTags}
                    disabled={currentMemo?.isLocked || false}
                    onChange={(e) => {
                      if (currentMemo?.isLocked) return;
                      setMemoTags(e.target.value);
                      { // メモを開いていなくても保存する（無ければこの内容で新しいメモを作る）
                        if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
                        autoSaveTimeoutRef.current = setTimeout(() => saveMemoRef.current(true), 1000);
                      }
                    }}
                    className={`flex-1 min-w-0 px-2 py-1.5 text-[11px] outline-none bg-transparent ${currentMemo?.isLocked ? 'cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>

              {/* エディタとステータスバー */}
              <div className="border border-gray-200 flex-1 flex flex-col min-h-[60vh] md:min-h-0 relative">
                {/* ツールバー */}
                <div className={`flex flex-wrap items-center gap-2 p-2 border-b border-gray-200 bg-gray-50 shrink-0 ${currentMemo?.isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                  
                  {/* フォント設定 */}
                  <select 
                    onChange={(e) => formatDoc('fontName', e.target.value)}
                    disabled={currentMemo?.isLocked || false}
                    className="h-8 text-[11px] border border-gray-200 px-2 focus:outline-none focus:border-gray-400 max-w-[80px]"
                  >
                    <option value="sans-serif">標準</option>
                    <option value="serif">明朝</option>
                    <option value="monospace">等幅</option>
                    <option value="Meiryo">メイリオ</option>
                  </select>

                  <select 
                    defaultValue="3"
                    onChange={(e) => formatDoc('fontSize', e.target.value)}
                    disabled={currentMemo?.isLocked || false}
                    className="h-8 text-[11px] border border-gray-200 px-2 focus:outline-none focus:border-gray-400"
                  >
                    <option value="1">8pt</option>
                    <option value="2">10pt</option>
                    <option value="3">12pt</option>
                    <option value="4">14pt</option>
                    <option value="5">18pt</option>
                    <option value="6">24pt</option>
                    <option value="7">36pt</option>
                  </select>

                  <div className="w-px h-4 bg-gray-300 mx-1"></div>

                  {/* スタイル */}
                  <div className="flex h-8 items-center bg-white border border-gray-200">
                    <button onClick={() => formatDoc('bold')} disabled={currentMemo?.isLocked || false} className="h-full w-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" title="太字"><strong>B</strong></button>
                    <button onClick={() => formatDoc('italic')} disabled={currentMemo?.isLocked || false} className="h-full w-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed italic" title="斜体"><em>I</em></button>
                    <button onClick={() => formatDoc('underline')} disabled={currentMemo?.isLocked || false} className="h-full w-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed underline" title="下線"><u>U</u></button>
                    <button onClick={() => formatDoc('strikeThrough')} disabled={currentMemo?.isLocked || false} className="h-full w-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed line-through" title="取り消し線">S</button>
                  </div>

                  <div className="w-px h-4 bg-gray-300 mx-1"></div>

                  {/* 配置・リスト */}
                  <div className="flex h-8 items-center bg-white border border-gray-200">
                    <button onClick={() => formatDoc('justifyLeft')} disabled={currentMemo?.isLocked || false} className="h-full w-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" title="左揃え"><FiAlignLeft /></button>
                    <button onClick={() => formatDoc('justifyCenter')} disabled={currentMemo?.isLocked || false} className="h-full w-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" title="中央揃え"><FiAlignCenter /></button>
                    <button onClick={() => formatDoc('justifyRight')} disabled={currentMemo?.isLocked || false} className="h-full w-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" title="右揃え"><FiAlignRight /></button>
                  </div>

                  <div className="flex h-8 items-center bg-white border border-gray-200">
                    <button onClick={() => formatDoc('insertUnorderedList')} disabled={currentMemo?.isLocked || false} className="h-full w-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" title="箇条書き"><FiList /></button>
                    <button onClick={() => formatDoc('insertOrderedList')} disabled={currentMemo?.isLocked || false} className="h-full w-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" title="番号付きリスト"><span className="text-[10px] font-bold">1.</span></button>
                    <button onClick={insertCheckItem} disabled={currentMemo?.isLocked || false} className="h-full w-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" title="チェック項目（☐ を押すと ☑ に）"><FiCheckSquare /></button>
                  </div>

                  <div className="flex h-8 items-center bg-white border border-gray-200">
                    <button onClick={() => imageInputRef.current?.click()} disabled={currentMemo?.isLocked || imageBusy} className="h-full px-2 flex items-center gap-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-[10px]" title="写真・画像を入れる">
                      <FiImage /> {imageBusy ? '…' : '画像'}
                    </button>
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void insertImage(f); e.target.value = ''; }} />
                    <button
                      onClick={toggleVoice}
                      disabled={!speechSupported || currentMemo?.isLocked || false}
                      className={`h-full px-2 flex items-center gap-1 text-[10px] disabled:opacity-50 disabled:cursor-not-allowed ${listening ? 'bg-red-600 text-white' : 'hover:bg-gray-100'}`}
                      title={speechSupported ? (listening ? '音声入力を止める' : '話した言葉をカーソル位置に入れる') : 'このブラウザは音声入力に対応していません'}
                    >
                      {listening ? <FiSquare /> : <FiMic />} {listening ? '停止' : '音声'}
                    </button>
                  </div>

                  <div className="flex h-8 items-center bg-white border border-gray-200">
                    <button
                      onClick={openHomework}
                      disabled={!currentMemo}
                      className="h-full px-2 flex items-center gap-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-[10px]"
                      title="宿題・指摘・☐ の行を拾って Myタスクに入れる（担当・期限も読み取ります）"
                    >
                      <FiCheckSquare /> 宿題→タスク
                    </button>
                  </div>
                  {homeworkText !== null && <HomeworkToTasks text={homeworkText} folder={memoCategory} onClose={() => setHomeworkText(null)} />}

                  <div className="w-px h-4 bg-gray-300 mx-1"></div>

                  {/* カラー設定 */}
                  <div className="flex gap-1 relative items-center">
                    <button 
                      onClick={() => setShowColorPalette(showColorPalette === 'fore' ? null : 'fore')}
                      disabled={currentMemo?.isLocked || false}
                      className={`h-8 px-2 flex items-center gap-1 ${showColorPalette === 'fore' ? 'bg-gray-200' : 'hover:bg-gray-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
                      title="文字色"
                    >
                      <FiType className="text-gray-700" /> <span className="text-[10px] hidden sm:inline">文字</span>
                    </button>

                    <button 
                      onClick={() => setShowColorPalette(showColorPalette === 'back' ? null : 'back')}
                      disabled={currentMemo?.isLocked || false}
                      className={`h-8 px-2 flex items-center gap-1 ${showColorPalette === 'back' ? 'bg-gray-200' : 'hover:bg-gray-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
                      title="ハイライト（背景色）"
                    >
                      <FiDroplet className="text-gray-700" /> <span className="text-[10px] hidden sm:inline">背景</span>
                    </button>

                    {/* カラーパレットポップアップ */}
                    {showColorPalette && (
                      <div 
                        ref={paletteRef}
                        className="absolute top-full left-0 mt-1 bg-white border border-[#3b3b3b] p-2 z-50 w-48"
                      >
                        <p className="text-[10px] text-gray-500 mb-2">
                          {showColorPalette === 'fore' ? '文字色を選択' : '背景色を選択'}
                        </p>
                        <div className="grid grid-cols-6 gap-1 mb-2">
                          {PRESET_COLORS.map(color => (
                            <button
                              key={color}
                              onClick={() => formatDoc(showColorPalette === 'fore' ? 'foreColor' : 'backColor', color)}
                              className="w-6 h-6 border border-gray-200 hover:outline hover:outline-1 hover:outline-[#3b3b3b]"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                        <div className="border-t pt-2 mt-2 flex justify-between items-center">
                          <span className="text-[10px]">カスタム:</span>
                          <input 
                            type="color" 
                            onChange={(e) => formatDoc(showColorPalette === 'fore' ? 'foreColor' : 'backColor', e.target.value)}
                            className="w-6 h-6 p-0 border-0 cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                   <button 
                    onClick={() => formatDoc('removeFormat')} 
                    disabled={currentMemo?.isLocked || false}
                    className="h-8 w-8 flex items-center justify-center hover:bg-gray-200 ml-auto text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed" 
                    title="書式クリア"
                  >
                    <FiX />
                  </button>

                </div>

                {/* エディタ本体 */}
                <div 
                  ref={editorRef}
                  contentEditable={!(currentMemo?.isLocked)}
                  onClick={() => { if (!currentMemo?.isLocked) toggleCheckAtCaret(); }}
                  onPaste={(e) => {
                    if (currentMemo?.isLocked) {
                      e.preventDefault();
                      return;
                    }
                    handlePaste(e);
                  }}
                  onCompositionStart={() => { isComposingRef.current = true; }}
                  onCompositionEnd={() => {
                    if (currentMemo?.isLocked) return;
                    isComposingRef.current = false;
                    isEditingRef.current = true;
                    updateCharCount();
                    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
                    autoSaveTimeoutRef.current = setTimeout(() => {
                      { // メモを開いていなくても保存する（無ければこの内容で新しいメモを作る）
                        saveMemoRef.current(true).then(() => setTimeout(() => { isEditingRef.current = false; }, 500));
                      }
                    }, 1000);
                  }}
                  onInput={(e) => {
                    if (currentMemo?.isLocked) {
                      // ロック状態の場合は元の内容に戻す
                      if (editorRef.current && currentMemo) {
                        editorRef.current.innerHTML = currentMemo.content;
                      }
                      return;
                    }
                    isEditingRef.current = true;
                    updateCharCount();
                    if (!isComposingRef.current) {
                      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
                      autoSaveTimeoutRef.current = setTimeout(() => {
                        { // メモを開いていなくても保存する（無ければこの内容で新しいメモを作る）
                          saveMemoRef.current(true).then(() => setTimeout(() => { isEditingRef.current = false; }, 500));
                        }
                      }, 1000);
                    }
                  }}
                  className={`w-full flex-1 min-h-[40vh] md:min-h-0 md:h-full p-4 text-[12px] focus:outline-none overflow-y-auto whitespace-pre-wrap break-words leading-relaxed ${currentMemo?.isLocked ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  suppressContentEditableWarning={true}
                />

                {/* ステータスバー */}
                <div className="flex justify-between items-center p-1.5 border-t border-gray-200 bg-gray-50 shrink-0">
                  <span className="yy-mono text-[10px] tracking-[0.08em] text-gray-500">{charCount} 文字</span>
                  <span className="text-[10px] text-gray-500">{saveStatus}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * メモのフォルダ欄。右の ▼ で既存のフォルダから選び、名前を打てば新しいフォルダになる。
 * 以前はブラウザ標準の候補（datalist）を出していたが、見た目がサイトと揃わず、
 * 選んだ値も保存されていなかった。選んだ時点でそのメモを移す（moveMemoToFolder）。
 */
function FolderPicker({
  value,
  folders,
  projects = [],
  isProject = () => false,
  disabled,
  onPick,
}: {
  value: string;
  folders: string[];
  /** 物件の台帳にあって、まだフォルダになっていない物件（選ぶとその名前のフォルダになる） */
  projects?: string[];
  isProject?: (name: string) => boolean;
  disabled: boolean;
  onPick: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => setDraft(value), [value]);

  // 外側を押すか Esc で閉じる
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (name: string) => {
    setOpen(false);
    setDraft(name);
    if (name !== value) onPick(name);
  };
  const typed = draft.trim();
  const isNew = typed !== '' && !folders.includes(typed) && !projects.includes(typed);

  return (
    <div ref={boxRef} className="relative">
      <div className={`flex items-stretch border border-gray-200 bg-white ${disabled ? 'bg-gray-100 opacity-60' : ''}`}>
        {/* アイコンは入力欄の外。左右の余白を同じにする（以前は右が 0 で欄に貼り付いていた） */}
        <span className="flex items-center px-2 text-gray-400 shrink-0">
          <FiFolder className="w-3 h-3" />
        </span>
        <input
          type="text"
          placeholder="フォルダ（未分類）"
          value={draft}
          disabled={disabled}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              pick(typed);
            }
          }}
          onBlur={() => {
            // 打ち込んだまま離れたら、その名前で決める
            if (typed !== value) pick(typed);
          }}
          className="flex-1 min-w-0 px-2 py-1.5 text-[11px] border-0 outline-none bg-transparent"
        />
        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpen((o) => !o)}
          className="px-2 border-l border-gray-200 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed"
          aria-label="フォルダを選ぶ"
          title="フォルダを選ぶ"
        >
          <FiChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && !disabled && (
        <ul className="absolute left-0 right-0 top-full mt-0.5 z-30 bg-white border border-[#3b3b3b] max-h-60 overflow-y-auto text-[11px]">
          {isNew && (
            <li>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(typed)} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2">
                <FiPlus className="w-3 h-3" />「{typed}」を新しいフォルダにする
              </button>
            </li>
          )}
          <li>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick('')} className={`w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2 ${value === '' ? 'font-bold' : 'text-gray-500'}`}>
              <span className="w-3">{value === '' && <FiCheck className="w-3 h-3" />}</span>未分類
            </button>
          </li>
          {folders.map((name) => (
            <li key={name}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(name)} className={`w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2 ${value === name ? 'font-bold' : ''}`}>
                <span className="w-3">{value === name && <FiCheck className="w-3 h-3" />}</span>
                {name}
                {isProject(name) && <span className="yy-mono ml-auto text-[9px] tracking-[0.08em] text-[#2f7f6d]">物件</span>}
              </button>
            </li>
          ))}
          {projects.length > 0 && (
            <li className="px-3 pt-2 pb-0.5 text-[10px] text-gray-500 border-t border-gray-200">物件の台帳から（選ぶとフォルダになる）</li>
          )}
          {projects.map((name) => (
            <li key={`p:${name}`}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(name)} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2">
                <span className="w-3"><FiPlus className="w-3 h-3 text-gray-400" /></span>
                {name}
              </button>
            </li>
          ))}
          {folders.length === 0 && projects.length === 0 && !isNew && <li className="px-3 py-1.5 text-gray-400">フォルダはまだありません。名前を打つと作れます</li>}
        </ul>
      )}
    </div>
  );
}

export default MemoTool;
