'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FiStar, FiTrash2, FiExternalLink, FiSettings, FiGrid, FiList, FiSearch } from 'react-icons/fi';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebaseClient';
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

// スキームを省略して入力されたURL（例: example.com）は相対リンク扱いになり
// サイト内に飛んでしまうため、https:// を補って正規化する。
const normalizeUrl = (url: string): string => {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return trimmed; // http: https: mailto: など
  return `https://${trimmed}`;
};

// --- ファビコン取得用ヘルパー関数 ---
const getFaviconUrl = (url: string) => {
  try {
    if (!url) return null;
    const domain = new URL(normalizeUrl(url)).hostname;
    // Googleの非公式APIを使用してファビコンを取得 (sz=64はサイズ)
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return null;
  }
};

// Firestoreには createdAt/updatedAt を数値(ミリ秒)で書き込んでいるので、
// 読み出しも数値優先で扱う。Timestamp前提で toDate() だけを見ると
// 常に現在時刻へフォールバックしてしまい、日時が意味を失う。
const toDate = (value: any): Date => {
  if (typeof value === 'number') return new Date(value);
  if (value?.toDate) return value.toDate();
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date(0);
};

interface Bookmark {
  id: string;
  title: string;
  url: string;
  description?: string;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  isFavorite?: boolean;
}

const BookmarkTool: React.FC = () => {
  const { currentUser, isLoggedIn } = useAuth();
  
  // --- モード管理ステート（新規追加） ---
  const [isEditMode, setIsEditMode] = useState(false); // デフォルトは閲覧モード

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [currentBookmark, setCurrentBookmark] = useState<Bookmark | null>(null);
  
  // 入力フォーム用ステート
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [bookmarkUrl, setBookmarkUrl] = useState('');
  const [bookmarkDescription, setBookmarkDescription] = useState('');
  const [bookmarkCategory, setBookmarkCategory] = useState('');
  const [bookmarkTags, setBookmarkTags] = useState('');

  // URL からタイトル等を取りに行っている最中か
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [metaMessage, setMetaMessage] = useState('');
  // リンク切れ確認。id → 'alive' | 理由
  const [linkStatus, setLinkStatus] = useState<Record<string, string>>({});
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);
  
  // フィルタリング用ステート
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  
  const [saveStatus, setSaveStatus] = useState('');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isComposingRef = useRef<boolean>(false);
  const isEditingRef = useRef<boolean>(false);
  // onSnapshot は [currentUser] で1度だけ購読するため、
  // ハンドラ内で currentBookmark を直接読むと購読時点の値（null）で固定される。
  const currentBookmarkRef = useRef<Bookmark | null>(null);

  useEffect(() => {
    currentBookmarkRef.current = currentBookmark;
  }, [currentBookmark]);

  // Firestore購読 (既存ロジックそのまま)
  useEffect(() => {
    if (!currentUser) {
      setBookmarks([]);
      setCurrentBookmark(null);
      return;
    }
    try {
      const cached = localStorage.getItem(`generalBookmarks:${currentUser.uid}`);
      if (cached) {
        const parsed = JSON.parse(cached) as any[];
        const list: Bookmark[] = parsed.map((m: any) => ({
          ...m,
          createdAt: new Date(m.createdAt),
          updatedAt: new Date(m.updatedAt),
        }));
        setBookmarks(list);
      }
    } catch {}

    const colRef = collection(db, 'users', currentUser.uid, 'bookmarks');
    const bookmarkQuery = query(colRef, orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(bookmarkQuery, (snap) => {
      const list: Bookmark[] = snap.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          title: data.title || '',
          url: data.url || '',
          description: data.description || '',
          category: data.category || '',
          tags: data.tags || [],
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
          isFavorite: data.isFavorite || false,
        };
      });
      setBookmarks(list);
      try {
        localStorage.setItem(
          `generalBookmarks:${currentUser.uid}`,
          JSON.stringify(list.map((b) => ({ ...b, createdAt: b.createdAt.getTime(), updatedAt: b.updatedAt.getTime() })))
        );
      } catch {}
      
      // 選択状態の復元
      const active = currentBookmarkRef.current;
      if (active) {
        const updated = list.find((b) => b.id === active.id);
        if (updated) setCurrentBookmark(updated);
      }
    });
    return () => unsub();
  }, [currentUser]);

  // フィルタリングロジック
  const filteredBookmarks = bookmarks.filter((bookmark) => {
    const matchesSearch =
      !searchTerm ||
      bookmark.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bookmark.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bookmark.description && bookmark.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !categoryFilter || bookmark.category === categoryFilter;
    const matchesTag = !tagFilter || bookmark.tags.some((tag) => tag === tagFilter);
    return matchesSearch && matchesCategory && matchesTag;
  });

  const allCategories = Array.from(new Set(bookmarks.map((b) => b.category).filter(Boolean))).sort();
  const allTags = Array.from(new Set(bookmarks.flatMap((b) => b.tags).filter(Boolean))).sort();

  // 編集用：ブックマーク選択
  const selectBookmark = (bookmark: Bookmark) => {
    setCurrentBookmark(bookmark);
    setBookmarkTitle(bookmark.title);
    setBookmarkUrl(bookmark.url);
    setBookmarkDescription(bookmark.description || '');
    setBookmarkCategory(bookmark.category || '');
    setBookmarkTags(bookmark.tags.join(', '));
  };

  // 新規作成
  /**
   * URL からタイトル・説明を取ってきて、空欄だけ埋める。
   *
   * これまでは URL もタイトルも説明も全部手打ちで、ブラウザの
   * ブックマーク機能に負けていた。既に書いてある内容は上書きしない
   * （自分で付けた名前のほうが後から探しやすいので）。
   */
  const fetchLinkMeta = async () => {
    const url = normalizeUrl(bookmarkUrl);
    if (!url) {
      setMetaMessage('先に URL を入力してください');
      return;
    }

    setIsFetchingMeta(true);
    setMetaMessage('');
    try {
      const res = await fetch(`/api/link-preview/?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!data?.alive) {
        setMetaMessage(data?.error || 'ページを読み込めませんでした');
        return;
      }

      const filled: string[] = [];
      if (!bookmarkTitle.trim() && data.title) { setBookmarkTitle(data.title); filled.push('タイトル'); }
      if (!bookmarkDescription.trim() && data.description) { setBookmarkDescription(data.description); filled.push('説明'); }
      setMetaMessage(
        filled.length ? `${filled.join('と')}を取り込みました` : '取り込める新しい情報はありませんでした',
      );
    } catch {
      setMetaMessage('ページを読み込めませんでした');
    } finally {
      setIsFetchingMeta(false);
    }
  };

  /**
   * 登録済みのリンクが生きているか、まとめて確かめる。
   * カタログや製品ページの URL は数年で変わるので、溜めるほど死ぬ。
   * 相手のサーバーに一気に投げないよう、少しずつ確かめる。
   */
  const checkAllLinks = async () => {
    if (bookmarks.length === 0) return;
    setIsCheckingLinks(true);
    setLinkStatus({});

    const CONCURRENCY = 4;
    const queue = [...bookmarks];
    const result: Record<string, string> = {};

    const worker = async () => {
      while (queue.length) {
        const item = queue.shift();
        if (!item) break;
        const url = normalizeUrl(item.url);
        if (!url) { result[item.id] = 'URL が空です'; continue; }
        try {
          const res = await fetch(`/api/link-preview/?url=${encodeURIComponent(url)}&check=1`);
          const data = await res.json();
          result[item.id] = data?.alive ? 'alive' : (data?.error || '応答なし');
        } catch {
          result[item.id] = '確認できませんでした';
        }
        setLinkStatus({ ...result });
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, bookmarks.length) }, worker));
    setLinkStatus(result);
    setIsCheckingLinks(false);
  };

  const createNewBookmark = async () => {
    if (!isLoggedIn) return alert('ブックマークを作成するには会員登録が必要です。');
    // 新規作成時は編集モードに強制切り替え
    setIsEditMode(true);
    
    const now = new Date();
    const newBookmark: Bookmark = {
      id: `tmp-${Date.now()}`,
      title: '新しいブックマーク',
      url: '',
      description: '',
      category: categoryFilter || '', // 現在のカテゴリを初期値に
      tags: [],
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
    };
    
    setBookmarks((prev) => [newBookmark, ...prev]);
    selectBookmark(newBookmark);
    try {
      if (currentUser) {
        const ref = await addDoc(collection(db, 'users', currentUser.uid, 'bookmarks'), {
          title: newBookmark.title,
          url: newBookmark.url,
          description: newBookmark.description,
          category: newBookmark.category,
          tags: newBookmark.tags,
          createdAt: now.getTime(),
          updatedAt: now.getTime(),
          isFavorite: false,
        } as any);
        setBookmarks((prev) => prev.map((b) => (b.id === newBookmark.id ? { ...b, id: ref.id } : b)));
        setCurrentBookmark((prev) => (prev && prev.id === newBookmark.id ? { ...prev, id: ref.id } : prev));
      }
    } catch (error) {
      console.error(error);
    }
  };

  // 保存処理 (既存ロジック)
  const saveBookmark = async (isAutoSave: boolean = false) => {
    if (!currentBookmark) return;
    const now = new Date();
    const updatedBookmark = {
      ...currentBookmark,
      title: bookmarkTitle,
      url: normalizeUrl(bookmarkUrl),
      description: bookmarkDescription,
      category: bookmarkCategory,
      tags: bookmarkTags.split(',').map((t) => t.trim()).filter(Boolean),
      updatedAt: now,
    };

    // 楽観的UI更新
    setBookmarks((prev) => prev.map((b) => (b.id === currentBookmark.id ? updatedBookmark : b)));
    setCurrentBookmark(updatedBookmark as Bookmark);

    try {
      if (currentUser) {
        await updateDoc(doc(db, 'users', currentUser.uid, 'bookmarks', currentBookmark.id), {
          title: updatedBookmark.title,
          url: updatedBookmark.url,
          description: updatedBookmark.description,
          category: updatedBookmark.category,
          tags: updatedBookmark.tags,
          updatedAt: now.getTime(),
        } as any);
      }
      if (!isAutoSave) {
        setSaveStatus('保存しました');
        setTimeout(() => setSaveStatus(''), 2000);
      }
    } catch {
      if (!isAutoSave) setSaveStatus('エラー');
    }
  };

  // 削除処理 (既存ロジック)
  const deleteCurrentBookmark = async () => {
    if (!currentBookmark || !currentUser) return;
    if (!confirm(`「${currentBookmark.title || '無題'}」を削除します。よろしいですか？`)) return;
    const id = currentBookmark.id;
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    const nextList = bookmarks.filter((b) => b.id !== id);
    if (nextList.length > 0) {
      setCurrentBookmark(nextList[0]);
      setBookmarkTitle(nextList[0].title);
      setBookmarkUrl(nextList[0].url);
      setBookmarkDescription(nextList[0].description || '');
      setBookmarkCategory(nextList[0].category || '');
      setBookmarkTags(nextList[0].tags.join(', '));
    } else {
      setCurrentBookmark(null);
      setBookmarkTitle('');
      setBookmarkUrl('');
      setBookmarkDescription('');
      setBookmarkCategory('');
      setBookmarkTags('');
    }
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'bookmarks', id));
    } catch {}
  };

  // お気に入りトグル (既存ロジック)
  const toggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) return;
    const b = bookmarks.find((x) => x.id === id);
    if (b) {
      const newVal = !b.isFavorite;
      setBookmarks((prev) => prev.map((x) => (x.id === id ? { ...x, isFavorite: newVal } : x)));
      try {
        await updateDoc(doc(db, 'users', currentUser.uid, 'bookmarks', id), { isFavorite: newVal });
      } catch (error) {
        console.error('Failed to toggle favorite:', error);
      }
    }
  };

  // 自動保存フック (既存ロジック)
  useEffect(() => {
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    if (currentBookmark && !isComposingRef.current && isEditMode) {
      // 編集モード時のみ作動
      autoSaveTimeoutRef.current = setTimeout(() => {
        if (isEditingRef.current) {
          saveBookmark(true).then(() => {
            setTimeout(() => {
              isEditingRef.current = false;
            }, 500);
          });
        }
      }, 1000);
    }
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [bookmarkTitle, bookmarkUrl, bookmarkDescription, bookmarkCategory, bookmarkTags, currentBookmark, isEditMode]);

  // --- メインレンダリング ---
  return (
    <div className="bg-white flex flex-col h-full lg:h-[calc(100vh-var(--nav-height))]">
      {/* ヘッダーエリア：モード切替 */}
      <div className="px-4 py-1.5 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div className="flex justify-between items-start">
        <div>
            <h3 className="text-[13px] font-medium">ブックマーク</h3>
            <p className="text-[11px] mt-0.5">よく使うURLを保存・管理。カテゴリー・タグ分類、お気に入り機能、グリッド/リスト表示切替に対応</p>
        </div>
        <div className="flex items-center gap-3">
          {/* モード切替スイッチ */}
          <div className="bg-gray-700 rounded-lg p-0.5 flex">
            <button
              onClick={() => setIsEditMode(false)}
              className={`px-3 py-1 rounded-md text-[11px] flex items-center gap-1 transition-all ${
                !isEditMode ? 'bg-white text-gray-800 shadow' : 'text-gray-300 hover:text-white'
              }`}
            >
              <FiGrid /> ランチャー
            </button>
            <button
              onClick={() => setIsEditMode(true)}
              className={`px-3 py-1 rounded-md text-[11px] flex items-center gap-1 transition-all ${
                isEditMode ? 'bg-white text-gray-800 shadow' : 'text-gray-300 hover:text-white'
              }`}
            >
              <FiList /> 編集・管理
            </button>
          </div>

          {/* リンク切れ確認。カタログや製品ページの URL は数年で変わるので、
              溜めるほど死ぬ。結果は一覧の各行に出す。 */}
          <button
            onClick={checkAllLinks}
            disabled={isCheckingLinks || bookmarks.length === 0}
            className="flex items-center gap-1 text-[11px] bg-gray-700 text-white px-3 py-1.5 mr-2"
          >
            {isCheckingLinks
              ? `確認中… ${Object.keys(linkStatus).length}/${bookmarks.length}`
              : 'リンク切れ確認'}
          </button>

          <button
            onClick={createNewBookmark}
            className="flex items-center gap-1 text-[11px] bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 transition"
          >
            ＋ 新規
          </button>
          </div>
        </div>
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 p-4 bg-gray-50/50 [&>*]:border [&>*]:border-[#3b3b3b] [&>*]:p-3">
        {/* =================================================================
            【閲覧モード (ランチャーUI)】
           ================================================================= */}
        {!isEditMode && (
          <div className="h-full flex flex-col">
            {/* 1. 検索バー & タブUI */}
            <div className="mb-6">
              {/* 検索 */}
              <div className="relative mb-4 max-w-md mx-auto">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="ブックマークを検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-[13px] border border-gray-200 rounded-full shadow-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition"
                />
              </div>

              {/* タブ (横スクロール) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setCategoryFilter('')}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors ${
                    categoryFilter === ''
                      ? 'bg-gray-800 text-white shadow-md'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  すべて
                </button>
                {allCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-4 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors ${
                      categoryFilter === cat
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. グリッドカード表示 */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-y-auto pb-10">
              {filteredBookmarks.map((bookmark) => (
                <a
                  key={bookmark.id}
                  href={normalizeUrl(bookmark.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex flex-col items-center p-4 bg-white border border-gray-200 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                >
                  {/* クイック編集ボタン (ホバー時表示) */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      selectBookmark(bookmark);
                      setIsEditMode(true);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-gray-100 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-200 hover:text-gray-600 transition"
                    title="編集する"
                  >
                    <FiSettings className="w-3 h-3" />
                  </button>

                  {/* お気に入りバッジ */}
                  {bookmark.isFavorite && (
                    <div className="absolute top-2 left-2 text-yellow-400">
                      <FiStar className="fill-current w-4 h-4" />
                    </div>
                  )}

                  {/* ファビコン画像 */}
                  <div className="w-12 h-12 mb-3 bg-gray-50 rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition">
                    {getFaviconUrl(bookmark.url) ? (
                      <img
                        src={getFaviconUrl(bookmark.url)!}
                        alt=""
                        className="w-7 h-7 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-xl text-gray-300">#</span>
                    )}
                  </div>

                  {/* タイトル */}
                  <h4 className="text-[12px] font-bold text-gray-700 text-center line-clamp-2 w-full mb-1 group-hover:text-blue-600">
                    {bookmark.title}
                  </h4>

                  {/* 説明ありインジケータ */}
                  {bookmark.description && (
                    <span className="inline-block px-1.5 py-0.5 bg-yellow-50 text-yellow-700 text-[9px] rounded border border-yellow-100 mt-auto">
                      Note
                    </span>
                  )}
                </a>
              ))}

              {/* 新規追加カード */}
              <button
                onClick={createNewBookmark}
                className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition text-gray-400 hover:text-blue-500 min-h-[140px]"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                  <span className="text-xl">+</span>
                </div>
                <span className="text-[11px] font-medium">新規追加</span>
              </button>
            </div>
          </div>
        )}

        {/* =================================================================
            【編集モード (従来のUI)】
           ================================================================= */}
        {isEditMode && (
          <div className="flex gap-6 h-full">
            {/* 左サイド：リスト (既存コードのレイアウト調整) */}
            <div className="w-1/4 flex flex-col border-r border-gray-100 pr-4">
              <div className="mb-3 space-y-2">
                <input
                  type="text"
                  placeholder="検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-1.5 text-[11px] border rounded bg-gray-50"
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full text-[11px] border rounded px-2 py-1.5"
                >
                  <option value="">全カテゴリ</option>
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="w-full text-[11px] border rounded px-2 py-1.5"
                >
                  <option value="">全タグ</option>
                  {allTags.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredBookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    onClick={() => selectBookmark(bookmark)}
                    className={`p-2 border rounded cursor-pointer hover:bg-gray-50 flex items-start gap-2 ${
                      currentBookmark?.id === bookmark.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium truncate">{bookmark.title}</div>
                      <div className="text-[9px] text-gray-400 mt-0.5">{bookmark.category}</div>
                      {/* 確認したものだけ結果を出す。生きているものは静かに。 */}
                      {linkStatus[bookmark.id] && linkStatus[bookmark.id] !== 'alive' && (
                        <div className="text-[9px] text-red-600 font-bold mt-0.5">
                          リンク切れ: {linkStatus[bookmark.id]}
                        </div>
                      )}
                      {linkStatus[bookmark.id] === 'alive' && (
                        <div className="text-[9px] text-green-700 mt-0.5">確認OK</div>
                      )}
                    </div>
                    <button
                      onClick={(e) => toggleFavorite(bookmark.id, e)}
                      className="text-gray-400 hover:text-yellow-400"
                    >
                      <FiStar
                        className={`w-3 h-3 ${bookmark.isFavorite ? 'fill-current text-yellow-400' : ''}`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 右サイド：エディタ (既存コードの内容) */}
            <div className="flex-1 pl-2">
              <div className="space-y-4 max-w-2xl">
                {/* 編集フォーム... */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={bookmarkTitle}
                    onChange={(e) => {
                      isEditingRef.current = true;
                      setBookmarkTitle(e.target.value);
                    }}
                    className="flex-1 text-sm font-bold border-b-2 border-gray-200 px-2 py-1 focus:border-blue-500 outline-none"
                    placeholder="タイトル"
                  />
                  {currentBookmark && (
                    <div className="flex gap-2">
                      <a
                        href={normalizeUrl(bookmarkUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-gray-100 rounded hover:bg-gray-200 text-gray-600"
                      >
                        <FiExternalLink />
                      </a>
                      <button
                        onClick={deleteCurrentBookmark}
                        className="p-2 bg-red-50 rounded hover:bg-red-100 text-red-500"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold">URL</label>
                    <input
                      type="text"
                      value={bookmarkUrl}
                      onChange={(e) => {
                        isEditingRef.current = true;
                        setBookmarkUrl(e.target.value);
                      }}
                      className="w-full text-[12px] p-2 border rounded bg-gray-50"
                      placeholder="https://..."
                    />
                    {/* URL からタイトル・説明を取り込む。空欄だけ埋める。 */}
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={fetchLinkMeta}
                        disabled={isFetchingMeta}
                        className="text-[10px] bg-gray-700 text-white px-2 py-1"
                      >
                        {isFetchingMeta ? '取得中…' : 'URLからタイトルを取得'}
                      </button>
                      {metaMessage && <span className="text-[10px] text-gray-500">{metaMessage}</span>}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 font-bold">カテゴリ</label>
                      <input
                        type="text"
                        value={bookmarkCategory}
                        onChange={(e) => {
                          isEditingRef.current = true;
                          setBookmarkCategory(e.target.value);
                        }}
                        className="w-full text-[12px] p-2 border rounded"
                        list="category-list"
                      />
                      <datalist id="category-list">
                        {allCategories.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 font-bold">タグ</label>
                      <input
                        type="text"
                        value={bookmarkTags}
                        onChange={(e) => {
                          isEditingRef.current = true;
                          setBookmarkTags(e.target.value);
                        }}
                        className="w-full text-[12px] p-2 border rounded"
                        placeholder="カンマ区切り"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold">メモ</label>
                    <textarea
                      value={bookmarkDescription}
                      onChange={(e) => {
                        isEditingRef.current = true;
                        setBookmarkDescription(e.target.value);
                      }}
                      className="w-full text-[12px] p-2 border rounded h-32 resize-none"
                      placeholder="共有事項があればここに記入（パスワード等の認証情報は保存しないでください）"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <span className="text-xs text-green-600 font-medium h-5">{saveStatus}</span>
                  <button
                    onClick={() => saveBookmark(false)}
                    className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700 text-xs font-bold transition"
                  >
                    保存する
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookmarkTool;
