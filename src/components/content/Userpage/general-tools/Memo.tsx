'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  FiPlus, FiStar, FiEdit2, FiType, FiDroplet, 
  FiList, FiAlignLeft, FiAlignCenter, FiAlignRight, 
  FiCheckSquare, FiX, FiTrash2, FiFileText 
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

const MemoTool: React.FC = () => {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [currentMemo, setCurrentMemo] = useState<Memo | null>(null);
  const [memoTitle, setMemoTitle] = useState('');
  const [memoCategory, setMemoCategory] = useState('');
  const [memoTags, setMemoTags] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
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

  const { currentUser, isLoggedIn } = useAuth();

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
        if (list.length && (!currentMemo || !list.find(m => m.id === currentMemo.id))) {
          setCurrentMemo(list[0]); 
          setMemoTitle(list[0].title); 
          setMemoCategory(list[0].category); 
          setMemoTags(list[0].tags.join(', ')); 
          if (editorRef.current) {
            editorRef.current.innerHTML = list[0].content;
          }
        } else if (currentMemo) {
          const updatedMemo = list.find(m => m.id === currentMemo.id);
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

  // --- ドラッグアンドドロップ処理 ---
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, memo: Memo) => {
    // フィルター中は並び替え無効
    if (searchTerm || categoryFilter || tagFilter) {
      e.preventDefault();
      return;
    }
    setDraggedMemoId(memo.id);
    setDragOverMemoId(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', memo.id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, memoId: string) => {
    if (searchTerm || categoryFilter || tagFilter) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverMemoId !== memoId) {
      setDragOverMemoId(memoId);
    }
  };

  const handleDragEnd = () => {
    setDraggedMemoId(null);
    setDragOverMemoId(null);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetMemoId: string) => {
    e.preventDefault();
    setDragOverMemoId(null); // ハイライト解除
    
    if (!draggedMemoId || draggedMemoId === targetMemoId) return;
    if (!currentUser) return;

    const newMemos = [...memos];
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

  const createNewMemo = async () => {
    if (!currentUser) { alert('入力するには会員登録（無料）が必要です。'); return; }
    const now = new Date()
    const minOrder = memos.length > 0 ? Math.min(...memos.map(m => m.order ?? 0)) : 0;
    const newOrder = minOrder - 1;

    const optimistic: Memo = { id: `tmp-${Date.now()}`, title: '新しいメモ', content: '', category: '', tags: [], createdAt: now, updatedAt: now, isFavorite: false, isLocked: false, order: newOrder }
    setMemos(prev => [optimistic, ...prev])
    setCurrentMemo(optimistic)
    setMemoTitle(optimistic.title)
    setMemoCategory('')
    setMemoTags('')
    if (editorRef.current) editorRef.current.innerHTML = ''
    updateCharCount()
    const colRef = collection(db, 'users', currentUser.uid, 'memos')
    const ref = await addDoc(colRef, { title: optimistic.title, content: '', category: '', tags: [], createdAt: now.getTime(), updatedAt: now.getTime(), isFavorite: false, isLocked: false, order: newOrder } as any)
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
  };

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
    const matchesSearch = memo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         memo.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || memo.category === categoryFilter;
    const matchesTag = !tagFilter || memo.tags.includes(tagFilter);
    return matchesSearch && matchesCategory && matchesTag;
  }).sort((a, b) => {
    // ブックマークされているメモを上に並べる
    const aFavorite = a.isFavorite || false;
    const bFavorite = b.isFavorite || false;
    if (aFavorite !== bFavorite) {
      return aFavorite ? -1 : 1; // ブックマークされている方が上
    }
    // ブックマーク状態が同じ場合は、既存のソート順（order順 -> 更新日順）を維持
    const orderA = a.order ?? 99999999;
    const orderB = b.order ?? 99999999;
    if (orderA !== orderB) return orderA - orderB;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  const allCategories = Array.from(new Set(memos.map(memo => memo.category).filter(Boolean)));
  const allTagsFlat = memos.map(memo => memo.tags).reduce((acc, curr) => acc.concat(curr), []);
  const allTags = Array.from(new Set(allTagsFlat));

  // フィルター有効時はD&D無効化
  const isDragEnabled = !searchTerm && !categoryFilter && !tagFilter;

  return (
    <div className="bg-white rounded-b-lg shadow-sm border-b border-gray-100 h-full flex flex-col">
      <div className="p-4 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
          <div>
            <h3 className="text-[13px] font-medium">メモ</h3>
          <p className="text-[11px] mt-0.5">テキストメモの作成・管理ができます。フォントや色の変更、カテゴリー・タグ分類に対応</p>
        </div>
      </div>
      <div className="p-4 flex-1 min-h-0 overflow-hidden">
        <div className="flex gap-6 h-full">
          {/* 左サイド：メモ一覧 */}
          <div className="w-1/5 flex flex-col min-w-[200px]">
            <div className="mb-3 shrink-0">
              <button 
                onClick={createNewMemo}
                className="w-full flex items-center justify-center gap-1 text-[11px] bg-[#1dad95] text-white px-3 py-1.5 rounded hover:bg-[#1a9a85] transition mb-2"
              >
                <FiPlus className="w-3 h-3" />
                新規メモ
              </button>
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
            <div className="flex gap-2 mb-3 shrink-0">
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex-1 text-[11px] border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-gray-400"
              >
                <option value="">カテゴリ</option>
                {allCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
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
                      draggable={isDragEnabled}
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
                        saveMemo(true).then(() => setTimeout(() => { isEditingRef.current = false; }, 500));
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
                          saveMemo(true).then(() => setTimeout(() => { isEditingRef.current = false; }, 500));
                        }
                      }, 1000);
                    }
                  }}
                  className={`flex-1 text-[13px] font-medium border-b border-gray-200 px-2 py-1.5 focus:outline-none focus:border-gray-400 ${currentMemo?.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                />
                <div className="flex gap-2">
                  <button 
                    onClick={exportMemoToPDF}
                    className="text-[11px] bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 transition flex items-center gap-1"
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
                  <input 
                    type="text" 
                    placeholder="カテゴリ..." 
                    value={memoCategory}
                    disabled={currentMemo?.isLocked || false}
                    onChange={(e) => {
                      if (currentMemo?.isLocked) return;
                      setMemoCategory(e.target.value);
                      if (currentMemo) {
                        if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
                        autoSaveTimeoutRef.current = setTimeout(() => saveMemo(true), 1000);
                      }
                    }}
                    className={`w-full pl-7 pr-2 py-1.5 text-[11px] border border-gray-200 rounded focus:outline-none focus:border-gray-400 ${currentMemo?.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                  />
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">📂</div>
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
                        autoSaveTimeoutRef.current = setTimeout(() => saveMemo(true), 1000);
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
                        saveMemo(true).then(() => setTimeout(() => { isEditingRef.current = false; }, 500));
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
                          saveMemo(true).then(() => setTimeout(() => { isEditingRef.current = false; }, 500));
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

export default MemoTool;
