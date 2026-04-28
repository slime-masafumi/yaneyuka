'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { designPosts, DesignPost } from '@/data/design-posts';
import { FiSearch, FiEdit2, FiTrash2, FiTool, FiCalendar, FiTag, FiX, FiStar } from 'react-icons/fi';
import StructureKouzouHari from './design-tools/StructureKouzouHari';
import { listDesignPostBookmarks, setDesignPostBookmark, deleteDesignPostBookmark } from '@/lib/firebaseUserData';

interface EditingPost {
  id?: string;
  title: string;
  content: string;
  date: string;
  category: string;
  tags: string;
}

const DesignInfo: React.FC = () => {
  const { isAdmin, currentUser, isLoggedIn } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'title'>('newest');
  
  // 選択中の記事ID（初期値はnullだが、useEffectでリストの先頭を自動選択させる）
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingPost, setEditingPost] = useState<EditingPost | null>(null);
  const [posts, setPosts] = useState<DesignPost[]>(designPosts);
  
  // ツール表示のトグル用
  const [showTool, setShowTool] = useState(false);
  
  // お気に入り管理
  const [bookmarks, setBookmarks] = useState<Record<string, any>>({});
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  // カテゴリーリスト
  const categories = useMemo(() => 
    ['all', ...Array.from(new Set(posts.map(post => post.category)))],
  [posts]);

  // お気に入り読み込み
  useEffect(() => {
    if (!currentUser?.uid) {
      setBookmarks({});
      return;
    }
    (async () => {
      try {
        const list = await listDesignPostBookmarks(currentUser.uid);
        const bookmarkMap: Record<string, any> = {};
        list.forEach(b => {
          bookmarkMap[b.id] = b;
        });
        setBookmarks(bookmarkMap);
        // localStorageにもキャッシュ
        try {
          localStorage.setItem(`designPostBookmarks:${currentUser.uid}`, JSON.stringify(bookmarkMap));
        } catch {}
      } catch (error) {
        console.error('Failed to load bookmarks:', error);
        // localStorageから復元を試みる
        try {
          const cached = localStorage.getItem(`designPostBookmarks:${currentUser.uid}`);
          if (cached) {
            setBookmarks(JSON.parse(cached));
          }
        } catch {}
      }
    })();
  }, [currentUser?.uid]);

  // お気に入りトグル
  const toggleBookmark = async (post: DesignPost) => {
    if (!currentUser?.uid) {
      alert('お気に入り登録には会員登録（無料）が必要です。');
      return;
    }
    const exists = !!bookmarks[post.id];
    setBookmarks(prev => {
      const next: Record<string, any> = { ...prev };
      if (exists) {
        delete next[post.id];
      } else {
        next[post.id] = { ...post, createdAt: Date.now() };
      }
      try {
        localStorage.setItem(`designPostBookmarks:${currentUser.uid}`, JSON.stringify(next));
      } catch {}
      return next;
    });
    try {
      if (exists) {
        await deleteDesignPostBookmark(currentUser.uid, post.id);
      } else {
        await setDesignPostBookmark(currentUser.uid, post.id, {
          title: post.title,
          meta: {
            category: post.category,
            date: post.date,
            tags: post.tags,
            content: post.content.substring(0, 200), // プレビュー用に最初の200文字
          },
          createdAt: Date.now(),
        });
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  const isBookmarked = (id: string) => !!bookmarks[id];

  // フィルタリング処理
  const filteredPosts = useMemo(() => {
    let result = posts;
    if (showBookmarksOnly) {
      result = result.filter(post => isBookmarked(post.id));
    }
    if (selectedCategory !== 'all') {
      result = result.filter(post => post.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.content.toLowerCase().includes(query) ||
        post.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        post.category.toLowerCase().includes(query)
      );
    }
    
    // ソート処理
    const sorted = [...result].sort((a, b) => {
      if (sortOrder === 'newest') {
        // 新しい順（日付の降順）
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortOrder === 'oldest') {
        // 古い順（日付の昇順）
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortOrder === 'title') {
        // タイトル順（あいうえお順）
        return a.title.localeCompare(b.title, 'ja');
      }
      return 0;
    });
    
    return sorted;
  }, [posts, selectedCategory, searchQuery, showBookmarksOnly, bookmarks, sortOrder]);

  // フィルタリング結果が変わった時、選択中の記事がリストになければ先頭を選択する
  useEffect(() => {
    if (filteredPosts.length > 0) {
      // 現在選択中のIDがフィルタ結果に含まれていない場合、または未選択の場合
      setSelectedPostId(prev => {
        if (!prev || !filteredPosts.find(p => p.id === prev)) {
          return filteredPosts[0].id;
        }
        return prev;
      });
    } else {
      setSelectedPostId(null);
    }
  }, [filteredPosts]);

  // 現在表示すべき記事データ
  const currentPost = useMemo(() => 
    posts.find(p => p.id === selectedPostId),
  [posts, selectedPostId]);

  // --- ハンドラー ---
  const handleCreateNew = () => {
    setEditingPost({
      title: '',
      content: '',
      date: new Date().toISOString().split('T')[0],
      category: '',
      tags: ''
    });
    setIsEditing(true);
  };

  const handleEdit = (post: DesignPost) => {
    setEditingPost({
      ...post,
      tags: post.tags?.join(', ') || ''
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この投稿を削除してもよろしいですか？')) return;
    try {
      setPosts(posts.filter(post => post.id !== id));
      if (selectedPostId === id) setSelectedPostId(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = async () => {
    if (!editingPost) return;
    try {
      const newPost: DesignPost = {
        id: editingPost.id || Date.now().toString(),
        title: editingPost.title,
        content: editingPost.content,
        date: editingPost.date,
        category: editingPost.category,
        tags: editingPost.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      };
      if (editingPost.id) {
        setPosts(posts.map(post => post.id === editingPost.id ? newPost : post));
      } else {
        setPosts([...posts, newPost]);
      }
      setIsEditing(false);
      setEditingPost(null);
      setSelectedPostId(newPost.id); // 保存した記事を選択状態にする
    } catch (error) {
      console.error(error);
    }
  };

  // --- コンテンツ整形 ---
  const formatContent = (content: string) => {
    // （前回のロジックを維持：空行調整、見出し判定など）
    const normalizedContent = content.replace(/\n{3,}/g, '\n\n');
    const lines = normalizedContent.split('\n').map(l => l.trim());
    const formatted: JSX.Element[] = [];
    let currentParagraph: string[] = [];
    let isFirstElement = true;

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join(' ').trim();
        if (text) {
          formatted.push(
            <p key={`p-${formatted.length}`} className="text-[13px] text-gray-700 mt-2 pl-2 leading-relaxed">
              {text}
            </p>
          );
          isFirstElement = false;
        }
        currentParagraph = [];
      }
    };

    lines.forEach((line, index) => {
      if (!line) {
        flushParagraph(); return;
      }
      // 見出しパターン
      if (line.match(/^【.+】/) || line.match(/^\d+\.\s+/) || line.match(/^[A-Z]：/)) {
        flushParagraph();
        if (!isFirstElement) formatted.push(<div key={`sp-${index}`} className="h-4"></div>);
        formatted.push(
          <h5 key={`h-${index}`} className="text-[14px] font-bold text-gray-800 mb-2 border-l-4 border-gray-700 pl-3 bg-gray-50 py-1.5 rounded-r">
            {line}
          </h5>
        );
        isFirstElement = false;
      }
      // サブ見出しパターン
      else if (line.match(/^(種類と特徴|諸元例|一般的な寸法|建築側の必要条件|設置要件|選定基準|必須確認事項|敷設方法)/)) {
        flushParagraph();
        formatted.push(
          <div key={`subh-${index}`} className="text-[13px] font-bold text-gray-700 mt-3 mb-1 pl-3 border-b border-gray-200 inline-block">
            {line}
          </div>
        );
      }
      // リストパターン
      else if (line.match(/^・/)) {
        flushParagraph();
        formatted.push(
          <div key={`li-${index}`} className="text-[13px] text-gray-600 mt-1 pl-6 indent-[-1em] leading-relaxed">
            {line}
          </div>
        );
      }
      else {
        currentParagraph.push(line);
      }
    });
    flushParagraph();
    return formatted;
  };

  return (
    <div className="p-0 bg-white rounded-lg h-[calc(100vh-100px)] min-h-[600px] flex flex-col">
      {/* 上部タイトルエリア（変更禁止） */}
      <div className="flex-none mb-4">
        <div className="flex items-baseline mb-2">
          <h2 className="text-xl font-semibold">設計情報</h2>
          <span className="text-red-600 font-bold text-xs sm:text-sm ml-4">※この機能は現在β版です。ご意見をぜひお聞かせください。</span>
        </div>
        <p className="text-[12px] text-gray-600">
          最新の設計関連情報をお届けします。建築設計に必要な技術情報、法規情報、設備情報などをまとめています。※情報は設計者が実務において適切に調査・確認してください。
        </p>
      </div>

      {/* メインエリア：2カラムレイアウト */}
      <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col md:flex-row">
        
        {/* ========================================== */}
        {/* 左ペイン：記事一覧・検索（幅固定・スクロール） */}
        {/* ========================================== */}
        <div className="w-full md:w-[320px] lg:w-[380px] bg-gray-50 flex flex-col border-b md:border-b-0 md:border-r border-gray-200 shrink-0 z-10">
          
          {/* 検索・フィルターヘッダー */}
          <div className="p-3 border-b border-gray-200 bg-white sticky top-0 z-20">
            <div className="relative mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="キーワード検索"
                className="w-full pl-9 pr-3 py-2 text-[13px] border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none bg-gray-50"
              />
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
            
            {/* お気に入りとソートを横並び */}
            <div className="flex gap-2 mb-2">
              {isLoggedIn && (
                <button
                  onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
                  className={`flex-1 py-1.5 text-[11px] rounded transition flex items-center justify-center gap-1.5 ${
                    showBookmarksOnly
                      ? 'bg-yellow-50 text-yellow-700 border border-yellow-300'
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <FiStar className={`w-3 h-3 ${showBookmarksOnly ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                  {showBookmarksOnly ? 'お気に入りのみ' : 'お気に入り一覧'}
                </button>
              )}
              
              {/* ソート機能 */}
              <div className={isLoggedIn ? 'flex-1' : 'w-full'}>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest' | 'title')}
                  className="w-full px-2 py-1.5 text-[11px] border border-gray-300 rounded bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                >
                  <option value="newest">新しい順</option>
                  <option value="oldest">古い順</option>
                  <option value="title">タイトル順</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors border ${
                    selectedCategory === cat 
                      ? 'bg-gray-800 text-white border-gray-800' 
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {cat === 'all' ? 'すべて' : cat}
                </button>
              ))}
            </div>

            {isAdmin && (
               <button
                 onClick={handleCreateNew}
                 className="w-full mt-2 py-1.5 text-[11px] border border-dashed border-gray-400 text-gray-600 hover:bg-gray-50 hover:text-blue-600 rounded transition flex items-center justify-center gap-1"
               >
                 ＋ 新しい記事を作成
               </button>
            )}
          </div>

          {/* 記事リスト本体 */}
          <div className="flex-1 overflow-y-auto">
            {filteredPosts.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-[12px]">該当なし</div>
            ) : (
              filteredPosts.map(post => (
                <div
                  key={post.id}
                  onClick={() => {
                    setSelectedPostId(post.id);
                    setIsEditing(false); // 閲覧モードに戻す
                  }}
                  className={`w-full text-left p-4 border-b border-gray-100 transition-all hover:bg-white group relative cursor-pointer ${
                    selectedPostId === post.id ? 'bg-white shadow-inner border-l-4 border-l-gray-800' : 'bg-transparent border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      post.category === '構造設計' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>
                      {post.category}
                    </span>
                    <div className="flex items-center gap-2">
                      {isLoggedIn && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(post);
                          }}
                          className={`p-1 rounded transition ${
                            isBookmarked(post.id)
                              ? 'text-yellow-500 hover:bg-yellow-50'
                              : 'text-gray-300 hover:text-yellow-500 hover:bg-gray-50'
                          }`}
                        >
                          <FiStar className={`w-3 h-3 ${isBookmarked(post.id) ? 'fill-current' : ''}`} />
                        </button>
                      )}
                      <span className="text-[10px] text-gray-400">{post.date}</span>
                    </div>
                  </div>
                  <h4 className={`text-[13px] font-bold leading-snug mb-1 ${
                    selectedPostId === post.id ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-800'
                  }`}>
                    {post.title}
                  </h4>
                  {post.tags && (
                    <div className="flex flex-wrap gap-1 opacity-70">
                      {post.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[10px] text-gray-400">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ========================================== */}
        {/* 右ペイン：詳細表示エリア（スクロール） */}
        {/* ========================================== */}
        <div className="flex-1 bg-white overflow-y-auto h-[500px] md:h-auto relative">
          
          {isEditing ? (
            /* --- 編集モード --- */
            <div className="p-6 md:p-8 max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-800">記事編集</h3>
                <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600"><FiX /></button>
              </div>
              <div className="space-y-4">
                <input
                  className="w-full p-2 border rounded text-sm"
                  placeholder="タイトル"
                  value={editingPost?.title}
                  onChange={e => setEditingPost(prev => prev ? {...prev, title: e.target.value} : null)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    className="w-full p-2 border rounded text-sm"
                    placeholder="カテゴリー"
                    value={editingPost?.category}
                    onChange={e => setEditingPost(prev => prev ? {...prev, category: e.target.value} : null)}
                  />
                  <input
                    className="w-full p-2 border rounded text-sm"
                    placeholder="タグ(カンマ区切り)"
                    value={editingPost?.tags}
                    onChange={e => setEditingPost(prev => prev ? {...prev, tags: e.target.value} : null)}
                  />
                </div>
                <textarea
                  className="w-full p-3 border rounded text-sm h-[400px] font-mono bg-gray-50"
                  placeholder="本文"
                  value={editingPost?.content}
                  onChange={e => setEditingPost(prev => prev ? {...prev, content: e.target.value} : null)}
                />
                <div className="flex justify-end gap-3">
                  <button onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded text-sm">キャンセル</button>
                  <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700">保存</button>
                </div>
              </div>
            </div>
          ) : currentPost ? (
            /* --- 閲覧モード --- */
            <div className="p-6 md:p-10 max-w-4xl mx-auto">
              {/* 記事ヘッダー */}
              <div className="mb-8 border-b border-gray-100 pb-6">
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-3">
                  <span className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-0.5 rounded text-gray-700 font-medium text-[11px]">
                    {currentPost.category}
                  </span>
                  <span className="flex items-center gap-1 text-[11px]">
                    <FiCalendar className="w-3 h-3" /> {currentPost.date}
                  </span>
                  {isLoggedIn && (
                    <button
                      onClick={() => toggleBookmark(currentPost)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition ${
                        isBookmarked(currentPost.id)
                          ? 'bg-yellow-50 text-yellow-700 border border-yellow-300 hover:bg-yellow-100'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <FiStar className={`w-3 h-3 ${isBookmarked(currentPost.id) ? 'fill-current' : ''}`} />
                      {isBookmarked(currentPost.id) ? 'お気に入り済み' : 'お気に入りに追加'}
                    </button>
                  )}
                  {isAdmin && (
                    <div className="ml-auto flex gap-2">
                      <button onClick={() => handleEdit(currentPost)} className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-[11px]">
                        <FiEdit2 /> 編集
                      </button>
                      <button onClick={() => handleDelete(currentPost.id)} className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 text-[11px]">
                        <FiTrash2 /> 削除
                      </button>
                    </div>
                  )}
                </div>
                
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-4">
                  {currentPost.title}
                </h1>

                {currentPost.tags && currentPost.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {currentPost.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
                        <FiTag className="w-3 h-3" /> {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 計算ツール（該当カテゴリのみ） */}
              {currentPost.category === '構造設計' && (
                <div className="mb-8 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                    <h5 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <FiTool className="text-slate-500" /> 構造計算ツール：梁のたわみ
                    </h5>
                    <button 
                      onClick={() => setShowTool(!showTool)}
                      className="text-[11px] text-blue-600 hover:underline font-medium"
                    >
                      {showTool ? '閉じる' : 'ツールを開く'}
                    </button>
                  </div>
                  {showTool && (
                    <div className="p-4 bg-white animate-fadeIn">
                      <StructureKouzouHari />
                    </div>
                  )}
                </div>
              )}

              {/* 記事本文 */}
              <div className="prose prose-sm max-w-none text-gray-800">
                {formatContent(currentPost.content)}
              </div>

              {/* フッター空白調整 */}
              <div className="h-20"></div>
            </div>
          ) : (
            /* --- 記事未選択時 --- */
            <div className="h-full flex flex-col items-center justify-center text-gray-300">
              <FiSearch className="w-12 h-12 mb-2 opacity-20" />
              <p className="text-sm font-medium">記事を選択してください</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesignInfo;
