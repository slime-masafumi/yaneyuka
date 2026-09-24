'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  FiPlus, FiStar, FiEdit2, FiType, FiDroplet, 
  FiList, FiAlignLeft, FiAlignCenter, FiAlignRight, 
  FiCheckSquare, FiX, FiTrash2, FiFileText, FiChevronDown, FiCheck, FiFolder 
} from 'react-icons/fi';
import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/20/solid';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebaseClient';
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';
import HtmlDocx from 'html-docx-js/dist/html-docx';

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

const MemoTool: React.FC = () => {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [currentMemo, setCurrentMemo] = useState<Memo | null>(null);
  const [memoTitle, setMemoTitle] = useState('');
  const [memoCategory, setMemoCategory] = useState('');
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

  const { currentUser, isLoggedIn } = useAuth();

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

  useEffect(() => {
    if (!currentUser) { setMemos([]); setCurrentMemo(null); return }
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
    if (!currentUser) { setSavedFolders([]); return; }
    const ref = doc(db, 'users', currentUser.uid, 'memoMeta', FOLDER_DOC);
    const unsub = onSnapshot(ref, (snap) => {
      const names = (snap.data() as any)?.names;
      if (Array.isArray(names)) setSavedFolders(names.filter((n) => typeof n === 'string' && n));
    }, () => { /* 読めないだけなら黙って諦める */ });
    return () => unsub();
  }, [currentUser]);

  const persistFolders = async (names: string[]) => {
    setSavedFolders(names);
    if (!currentUser) return;
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
    const name = newFolderName.trim();
    if (!name) return;
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
    if (!currentUser) return;

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

  const createNewMemo = async (template?: MemoTemplate) => {
    if (!currentUser) { alert('入力するには会員登録（無料）が必要です。'); return; }
    const now = new Date()
    const minOrder = memos.length > 0 ? Math.min(...memos.map(m => m.order ?? 0)) : 0;
    const newOrder = minOrder - 1;

    // ひな形から作る場合は、日付入りの表題と見出しを先に入れておく
    const title = template ? `${template.title} ${now.toLocaleDateString('ja-JP')}` : '新しいメモ';
    const content = template ? template.content : '';
    const category = template ? template.category : '';

    const optimistic: Memo = { id: `tmp-${Date.now()}`, title, content, category, tags: [], createdAt: now, updatedAt: now, isFavorite: false, isLocked: false, order: newOrder }
    setMemos(prev => [optimistic, ...prev])
    setCurrentMemo(optimistic)
    setMemoTitle(title)
    setMemoCategory(category)
    setMemoTags('')
    if (editorRef.current) editorRef.current.innerHTML = content
    updateCharCount()
    const colRef = collection(db, 'users', currentUser.uid, 'memos')
    const ref = await addDoc(colRef, { title, content, category, tags: [], createdAt: now.getTime(), updatedAt: now.getTime(), isFavorite: false, isLocked: false, order: newOrder } as any)
    setMemos(prev => prev.map(m => m.id === optimistic.id ? { ...m, id: ref.id } : m))
    setCurrentMemo(prev => prev && prev.id === optimistic.id ? { ...prev, id: ref.id } : prev)
  };

  const saveMemo = async (isAutoSave: boolean = false): Promise<void> => {
    if (!currentMemo) {
      const now = new Date()
      const minOrder = memos.length > 0 ? Math.min(...memos.map(m => m.order ?? 0)) : 0;
      const newOrder = minOrder - 1;

      const newMemo: Memo = { id: `tmp-${Date.now()}`, title: memoTitle || '新しいメモ', content: editorRef.current?.innerHTML || '', category: memoCategory, tags: memoTags.split(',').map(t=>t.trim()).filter(Boolean), createdAt: now, updatedAt: now, isFavorite: false, isLocked: false, order: newOrder }
      setMemos(prev => [newMemo, ...prev])
      setCurrentMemo(newMemo)
      try {
        if (currentUser) {
          const ref = await addDoc(collection(db, 'users', currentUser.uid, 'memos'), { title: newMemo.title, content: newMemo.content, category: newMemo.category, tags: newMemo.tags, createdAt: now.getTime(), updatedAt: now.getTime(), isFavorite: false, isLocked: false, order: newOrder } as any)
          setMemos(prev => prev.map(m => m.id === newMemo.id ? { ...m, id: ref.id } : m))
          setCurrentMemo(prev => prev && prev.id === newMemo.id ? { ...prev, id: ref.id } : prev)
        } else {
          try { localStorage.setItem('generalMemos:guest', JSON.stringify([newMemo])) } catch {}
        }
        if (!isAutoSave) {
          setSaveStatus('保存しました')
          setTimeout(() => setSaveStatus(''), 2000)
        }
      } catch { 
        if (!isAutoSave) {
          setSaveStatus('保存に失敗しました')
          setTimeout(() => setSaveStatus(''), 2000)
        }
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

    let nextList: Memo[] = []
    setMemos(prev => { const next = prev.map(m => m.id === currentMemo.id ? updatedMemo : m); nextList = next; return next })
    setCurrentMemo(updatedMemo)
    try {
      if (currentUser) {
        localStorage.setItem(`generalMemos:${currentUser.uid}`, JSON.stringify(nextList.map(m => ({ ...m, createdAt: m.createdAt.getTime(), updatedAt: m.updatedAt.getTime() }))))
      }
    } catch {}

    if (!currentUser) { 
      if (!isAutoSave) {
        setSaveStatus('ログインが必要です')
        setTimeout(() => setSaveStatus(''), 2000)
      }
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

  const deleteCurrentMemo = async () => {
    if (!currentMemo || !currentUser) return
    if(!confirm('本当に削除しますか？')) return;
    const id = currentMemo.id
    setMemos(prev => prev.filter(m => m.id !== id))
    setCurrentMemo(null)
    setMemoTitle('');
    setMemoCategory('');
    setMemoTags('');
    if (editorRef.current) editorRef.current.innerHTML = ''
    try { await deleteDoc(doc(db, 'users', currentUser.uid, 'memos', id)) } catch {}
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
      URL.revokeObjectURL(url)
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
    if (!currentUser) return;
    const memo = memos.find(m => m.id === memoId);
    if (!memo) return;
    const newFavorite = !(memo.isFavorite || false);
    setMemos(prev => prev.map(m => m.id === memoId ? { ...m, isFavorite: newFavorite } : m));
    if (currentMemo?.id === memoId) {
      setCurrentMemo(prev => prev ? { ...prev, isFavorite: newFavorite } : null);
    }
    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'memos', memoId), { isFavorite: newFavorite });
    } catch (error) {
      console.error('お気に入りの更新に失敗しました', error);
    }
  };

  const toggleMemoLock = async (memoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;
    const memo = memos.find(m => m.id === memoId);
    if (!memo) return;
    const newLocked = !(memo.isLocked || false);
    setMemos(prev => prev.map(m => m.id === memoId ? { ...m, isLocked: newLocked } : m));
    if (currentMemo?.id === memoId) {
      setCurrentMemo(prev => prev ? { ...prev, isLocked: newLocked } : null);
    }
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
    // ブックマークはどの並び順でも先頭に置く（付けた意味がなくなるので）
    const aFavorite = a.isFavorite || false;
    const bFavorite = b.isFavorite || false;
    if (aFavorite !== bFavorite) return aFavorite ? -1 : 1;
    return compareMemos(a, b, sortOrder);
  });

  const allTagsFlat = memos.map(memo => memo.tags).reduce((acc, curr) => acc.concat(curr), []);
  const allTags = Array.from(new Set(allTagsFlat));

  // フィルター有効時はD&D無効化
  // 並び順を指定している間は手で動かせない（動かしても並べ直されるため）
  const isDragEnabled = !searchTerm && selectedFolder === ALL_FOLDERS && !tagFilter && sortOrder === 'manual';

  return (
    <div className="bg-white h-full lg:h-[calc(100vh-var(--nav-height))] flex flex-col">
      <div className="px-4 py-1.5 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
          <div>
            <h3 className="text-[13px] font-medium">メモ</h3>
          <p className="text-[11px] mt-0.5">テキストメモの作成・管理ができます。フォントや色の変更、カテゴリー・タグ分類に対応</p>
        </div>
      </div>
      <div className="p-4 flex-1 min-h-0 overflow-hidden [&>*]:border [&>*]:border-[#3b3b3b] [&>*]:p-3">
        <div className="flex gap-6 h-full">
          {/* 左サイド：メモ一覧 */}
          <div className="w-1/5 flex flex-col min-w-[200px] border-r border-[#3b3b3b] pr-4">
            <div className="mb-3 shrink-0">
              <button
                onClick={() => createNewMemo()}
                className="w-full flex items-center justify-center gap-1 text-[11px] bg-[#1dad95] text-white px-3 py-1.5 rounded hover:bg-[#1a9a85] transition mb-1.5"
              >
                <FiPlus className="w-3 h-3" />
                新規メモ
              </button>

              {/* ひな形から作る。白紙だと「誰が・いつまでに」が毎回抜けるので。 */}
              <div className="flex flex-wrap gap-1 mb-2">
                {MEMO_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => createNewMemo(t)}
                    title={`${t.label}のひな形で新規作成`}
                    className="text-[10px] px-1.5 py-1 rounded border border-gray-200 bg-gray-50 text-gray-600 hover:border-[#1dad95] hover:text-[#1dad95] transition-colors"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="メモを検索..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 text-[11px] border border-gray-200 rounded focus:outline-none focus:border-gray-400"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
            </div>
            {/* フォルダ。行にメモをドラッグして放り込める。 */}
            <div className="mb-3 shrink-0 border border-[#3b3b3b]">
              <div className="flex items-center justify-between px-2 py-1 bg-gray-50 border-b border-[#3b3b3b]">
                <span className="text-[10px] font-bold text-gray-600">フォルダ</span>
                <button
                  type="button"
                  onClick={() => setShowFolderInput(v => !v)}
                  className="text-[10px] px-1.5 text-gray-600 hover:text-gray-900"
                  title="フォルダを追加"
                >
                  ＋
                </button>
              </div>

              {showFolderInput && (
                <div className="flex gap-1 p-1.5 border-b border-gray-200">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addFolder(); if (e.key === 'Escape') setShowFolderInput(false); }}
                    placeholder="フォルダ名"
                    autoFocus
                    className="flex-1 text-[11px] px-2 py-1 border border-gray-200 focus:outline-none"
                  />
                  <button type="button" onClick={addFolder} className="text-[10px] bg-gray-700 text-white px-2">追加</button>
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
                        onClick={() => setSelectedFolder(folder)}
                        className="flex-1 text-left truncate bg-transparent border-0 p-0"
                      >
                        {isAll ? '' : '📂 '}{label}
                        <span className="ml-1 text-gray-400">({countInFolder(folder)})</span>
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
              </div>
            </div>

            <div className="flex gap-2 mb-3 shrink-0">
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="flex-1 text-[11px] border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-gray-400"
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
            <div className="space-y-2 overflow-y-auto pr-2 flex-1">
              {filteredMemos.map((memo, index) => {
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
                    {showTopBar && <div className="h-1.5 w-full bg-[#1dad95] rounded-full my-1 animate-pulse" />}
                    
                    <div 
                      draggable
                      onDragStart={(e) => handleDragStart(e, memo)}
                      onDragOver={(e) => handleDragOver(e, memo.id)}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, memo.id)}
                  onClick={() => selectMemo(memo)}
                      className={`p-2 border rounded cursor-pointer hover:bg-gray-50 flex items-start gap-2 transition-all ${
                    currentMemo?.id === memo.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      } ${isDragging ? 'opacity-40' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium truncate">{memo.title}</div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    {memo.updatedAt.toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 items-center">
                    <button
                      onClick={(e) => toggleFavorite(memo.id, e)}
                      className={`p-0.5 hover:bg-gray-200 rounded transition-colors ${
                        memo.isFavorite ? 'text-yellow-500' : 'text-gray-400'
                      }`}
                    >
                      <FiStar className={`w-3 h-3 ${memo.isFavorite ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => toggleMemoLock(memo.id, e)}
                      className={`p-0.5 hover:bg-gray-200 rounded transition-colors ${
                        memo.isLocked ? 'text-blue-500' : 'text-gray-400'
                      }`}
                    >
                      {memo.isLocked ? <LockClosedIcon className="w-3 h-3" /> : <LockOpenIcon className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                    {/* 挿入ガイドバー (下) */}
                    {showBottomBar && <div className="h-1.5 w-full bg-[#1dad95] rounded-full my-1 animate-pulse" />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* 右サイド：エディタ */}
          <div className="flex-1 min-w-0 flex flex-col relative h-full">
            <div className="space-y-3 flex flex-col h-full">
              {/* タイトル入力欄 */}
              <div className="flex items-center gap-2 justify-between shrink-0">
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
                      if (currentMemo) {
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
                        if (currentMemo) {
                          saveMemoRef.current(true).then(() => setTimeout(() => { isEditingRef.current = false; }, 500));
                        }
                      }, 1000);
                    }
                  }}
                  className={`flex-1 text-[13px] font-medium border-b border-gray-200 px-2 py-1.5 focus:outline-none focus:border-gray-400 ${currentMemo?.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                />
                <div className="flex gap-2">
                  <button 
                    onClick={exportMemoToPDF}
                    className="text-[11px] bg-gray-700 text-white px-3 py-1.5 transition flex items-center gap-1"
                  >
                    <FiFileText className="w-3 h-3" />
                    PDF書き出し
                  </button>
                  <button 
                    onClick={exportMemoToDocx}
                    className="text-[11px] bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 transition flex items-center gap-1"
                  >
                    Word書き出し
                  </button>
                  {currentMemo && (
                    <button 
                      onClick={deleteCurrentMemo}
                      className="text-[11px] bg-gray-500 text-white px-3 py-1.5 rounded hover:bg-gray-600 transition flex items-center gap-1"
                    >
                      <FiTrash2 className="w-3 h-3"/> 削除
                    </button>
                  )}
                </div>
              </div>

              {/* カテゴリとタグ */}
              <div className="flex gap-2 shrink-0">
                <div className="relative flex-1">
                  <FolderPicker
                    value={memoCategory}
                    folders={folderNames}
                    disabled={!currentMemo || !!currentMemo.isLocked}
                    onPick={(name) => {
                      setMemoCategory(name);
                      if (currentMemo) void moveMemoToFolder(currentMemo.id, name);
                    }}
                  />
                </div>
                <div className="relative flex-1">
                  <input 
                    type="text" 
                    placeholder="タグ (カンマ区切り)..." 
                    value={memoTags}
                    disabled={currentMemo?.isLocked || false}
                    onChange={(e) => {
                      if (currentMemo?.isLocked) return;
                      setMemoTags(e.target.value);
                      if (currentMemo) {
                        if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
                        autoSaveTimeoutRef.current = setTimeout(() => saveMemoRef.current(true), 1000);
                      }
                    }}
                    className={`w-full pl-7 pr-2 py-1.5 text-[11px] border border-gray-200 rounded focus:outline-none focus:border-gray-400 ${currentMemo?.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                  />
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">🏷</div>
                </div>
              </div>

              {/* エディタとステータスバー */}
              <div className="border border-gray-200 rounded flex-1 flex flex-col min-h-0 relative">
                {/* ツールバー */}
                <div className={`flex flex-wrap items-center gap-2 p-2 border-b border-gray-200 bg-gray-50 shrink-0 ${currentMemo?.isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                  
                  {/* フォント設定 */}
                  <select 
                    onChange={(e) => formatDoc('fontName', e.target.value)}
                    disabled={currentMemo?.isLocked || false}
                    className="h-8 text-[11px] border border-gray-200 rounded px-2 focus:outline-none focus:border-gray-400 max-w-[80px]"
                  >
                    <option value="sans-serif">標準</option>
                    <option value="serif">明朝</option>
                    <option value="monospace">等幅</option>
                    <option value="Meiryo">メイリオ</option>
                  </select>

                  <select 
                    onChange={(e) => formatDoc('fontSize', e.target.value)}
                    disabled={currentMemo?.isLocked || false}
                    className="h-8 text-[11px] border border-gray-200 rounded px-2 focus:outline-none focus:border-gray-400"
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
                  <div className="flex h-8 items-center bg-white border border-gray-200 rounded">
                    <button onClick={() => formatDoc('bold')} disabled={currentMemo?.isLocked || false} className="h-full w-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" title="太字"><strong>B</strong></button>
                    <button onClick={() => formatDoc('italic')} disabled={currentMemo?.isLocked || false} className="h-full w-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed italic" title="斜体"><em>I</em></button>
                    <button onClick={() => formatDoc('underline')} disabled={currentMemo?.isLocked || false} className="h-full w-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed underline" title="下線"><u>U</u></button>
                    <button onClick={() => formatDoc('strikeThrough')} disabled={currentMemo?.isLocked || false} className="h-full w-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed line-through" title="取り消し線">S</button>
                  </div>

                  <div className="w-px h-4 bg-gray-300 mx-1"></div>

                  {/* 配置・リスト */}
                  <div className="flex h-8 items-center bg-white border border-gray-200 rounded">
                    <button onClick={() => formatDoc('justifyLeft')} disabled={currentMemo?.isLocked || false} className="h-full w-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" title="左揃え"><FiAlignLeft /></button>
                    <button onClick={() => formatDoc('justifyCenter')} disabled={currentMemo?.isLocked || false} className="h-full w-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" title="中央揃え"><FiAlignCenter /></button>
                    <button onClick={() => formatDoc('justifyRight')} disabled={currentMemo?.isLocked || false} className="h-full w-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" title="右揃え"><FiAlignRight /></button>
                  </div>

                  <div className="flex h-8 items-center bg-white border border-gray-200 rounded">
                    <button onClick={() => formatDoc('insertUnorderedList')} disabled={currentMemo?.isLocked || false} className="h-full w-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" title="箇条書き"><FiList /></button>
                    <button onClick={() => formatDoc('insertOrderedList')} disabled={currentMemo?.isLocked || false} className="h-full w-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" title="番号付きリスト"><FiCheckSquare /></button>
                  </div>

                  <div className="w-px h-4 bg-gray-300 mx-1"></div>

                  {/* カラー設定 */}
                  <div className="flex gap-1 relative items-center">
                    <button 
                      onClick={() => setShowColorPalette(showColorPalette === 'fore' ? null : 'fore')}
                      disabled={currentMemo?.isLocked || false}
                      className={`h-8 px-2 rounded flex items-center gap-1 ${showColorPalette === 'fore' ? 'bg-gray-200' : 'hover:bg-gray-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
                      title="文字色"
                    >
                      <FiType className="text-gray-700" /> <span className="text-[10px] hidden sm:inline">文字</span>
                    </button>

                    <button 
                      onClick={() => setShowColorPalette(showColorPalette === 'back' ? null : 'back')}
                      disabled={currentMemo?.isLocked || false}
                      className={`h-8 px-2 rounded flex items-center gap-1 ${showColorPalette === 'back' ? 'bg-gray-200' : 'hover:bg-gray-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
                      title="ハイライト（背景色）"
                    >
                      <FiDroplet className="text-gray-700" /> <span className="text-[10px] hidden sm:inline">背景</span>
                    </button>

                    {/* カラーパレットポップアップ */}
                    {showColorPalette && (
                      <div 
                        ref={paletteRef}
                        className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-lg rounded-lg p-2 z-50 w-48"
                      >
                        <p className="text-[10px] text-gray-500 mb-2">
                          {showColorPalette === 'fore' ? '文字色を選択' : '背景色を選択'}
                        </p>
                        <div className="grid grid-cols-6 gap-1 mb-2">
                          {PRESET_COLORS.map(color => (
                            <button
                              key={color}
                              onClick={() => formatDoc(showColorPalette === 'fore' ? 'foreColor' : 'backColor', color)}
                              className="w-6 h-6 rounded border border-gray-100 hover:scale-110 transition-transform"
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
                    className="h-8 w-8 flex items-center justify-center hover:bg-gray-200 rounded ml-auto text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed" 
                    title="書式クリア"
                  >
                    <FiX />
                  </button>

                </div>

                {/* エディタ本体 */}
                <div 
                  ref={editorRef}
                  contentEditable={isLoggedIn && !(currentMemo?.isLocked)}
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
                      if (currentMemo) {
                        saveMemoRef.current(true).then(() => setTimeout(() => { isEditingRef.current = false; }, 500));
                      }
                    }, 1000);
                  }}
                  onInput={(e) => {
                    if (!isLoggedIn) {
                      alert('入力するには会員登録（無料）が必要です。');
                      if (editorRef.current) editorRef.current.innerHTML = '';
                      return;
                    }
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
                        if (currentMemo) {
                          saveMemoRef.current(true).then(() => setTimeout(() => { isEditingRef.current = false; }, 500));
                        }
                      }, 1000);
                    }
                  }}
                  className={`w-full h-full p-4 text-[12px] focus:outline-none overflow-y-auto whitespace-pre-wrap break-words leading-relaxed ${currentMemo?.isLocked ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  suppressContentEditableWarning={true}
                />

                {/* ステータスバー */}
                <div className="flex justify-between items-center p-1.5 border-t border-gray-200 bg-gray-50 shrink-0">
                  <span className="text-[10px] text-gray-500">{charCount} 文字</span>
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
  disabled,
  onPick,
}: {
  value: string;
  folders: string[];
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
  const isNew = typed !== '' && !folders.includes(typed);

  return (
    <div ref={boxRef} className="relative">
      <div className={`flex items-stretch border border-gray-200 bg-white ${disabled ? 'bg-gray-100 opacity-60' : ''}`}>
        <FiFolder className="self-center ml-2 w-3 h-3 text-gray-400 shrink-0" />
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
        <ul className="absolute left-0 right-0 top-full mt-0.5 z-30 bg-white border border-[#3b3b3b] shadow-md max-h-60 overflow-y-auto text-[11px]">
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
              </button>
            </li>
          ))}
          {folders.length === 0 && !isNew && <li className="px-3 py-1.5 text-gray-400">フォルダはまだありません。名前を打つと作れます</li>}
        </ul>
      )}
    </div>
  );
}

export default MemoTool;
