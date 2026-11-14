'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { designPosts, DesignPost } from '@/data/design-posts';
import { FiSearch } from 'react-icons/fi';
import StructureKouzouHari from './design-tools/StructureKouzouHari';
import { listDesignPostBookmarks, setDesignPostBookmark, deleteDesignPostBookmark } from '@/lib/firebaseUserData';
import PageHead, { Stat } from '@/components/ui/PageHead';
import { SecHead } from '@/components/ui/Sheet';
import { ScreenLink } from '@/components/home/HomeParts';
import './info-pages.css';

/**
 * 設計情報(左カラム「01 見る」の 11)。読みものを本のように組む。
 *   頭 … 1 行の見出し + 数字
 *   分類タブ … すべて / 法規制 / 用語集 …(下線タブ)
 *   左 … I 記事の索引(番号・題・分類と日付)。検索・お気に入り・並び替え
 *   中央 … 記事。見出しは明朝の番号 + 黒 1px、本文はゴシック 13px
 *   右 … II 目次(いまの記事の見出し。追従)/ III 関連 / IV この画面について
 */
interface EditingPost {
  id?: string;
  title: string;
  content: string;
  date: string;
  category: string;
  tags: string;
}

/** embedded: 建築の調べもの(/lookup/)のタブの中で出すとき。自前の見出しを出さない */
const DesignInfo: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
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
  // 見出し(【…】/ 1. … / A:…)は章として番号を振り、右の目次にも出す
  const formatContent = (content: string) => {
    // （前回のロジックを維持：空行調整、見出し判定など）
    const normalizedContent = content.replace(/\n{3,}/g, '\n\n');
    const lines = normalizedContent.split('\n').map(l => l.trim());
    const formatted: React.JSX.Element[] = [];
    const heads: { id: string; text: string }[] = [];
    let currentParagraph: string[] = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join(' ').trim();
        if (text) {
          formatted.push(
            <p key={`p-${formatted.length}`} className="yy-di-p">
              {text}
            </p>
          );
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
        const id = `yy-di-h-${index}`;
        heads.push({ id, text: line });
        formatted.push(
          <h5 key={`h-${index}`} id={id} className="yy-di-ch">
            <span className="yy-di-chno">{String(heads.length).padStart(2, '0')}</span>
            <span>{line}</span>
          </h5>
        );
      }
      // サブ見出しパターン
      else if (line.match(/^(種類と特徴|諸元例|一般的な寸法|建築側の必要条件|設置要件|選定基準|必須確認事項|敷設方法)/)) {
        flushParagraph();
        formatted.push(
          <div key={`subh-${index}`} className="yy-di-sub">
            {line}
          </div>
        );
      }
      // リストパターン
      else if (line.match(/^・/)) {
        flushParagraph();
        formatted.push(
          <div key={`li-${index}`} className="yy-di-li">
            {line}
          </div>
        );
      }
      else {
        currentParagraph.push(line);
      }
    });
    flushParagraph();
    return { nodes: formatted, heads };
  };

  const article = useMemo(() => (currentPost ? formatContent(currentPost.content) : null), [currentPost]); // eslint-disable-line react-hooks/exhaustive-deps
  const countOf = (cat: string) => (cat === 'all' ? posts.length : posts.filter(p => p.category === cat).length);
  const bookmarkCount = Object.keys(bookmarks).length;

  const scrollToHead = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selectPost = (id: string) => {
    setSelectedPostId(id);
    setIsEditing(false); // 閲覧モードに戻す
    const top = document.getElementById('yy-di-top');
    if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: 'start' });
  };

  return (
    <div className="yy-di" id="yy-di-top">
      {!embedded && <PageHead
        no="15"
        en="design info"
        title="設計情報"
        desc={
          <>
            設計の技術・法規・設備の読みもの <span className="yy-fmt yy-info-beta">β版</span>
          </>
        }
        right={
          <>
            <Stat n={posts.length} label="記事" />
            <Stat n={categories.length - 1} label="分類" />
            {isLoggedIn && <Stat n={bookmarkCount} label="お気に入り" />}
          </>
        }
      />}

      <nav className="yy-tabs" aria-label="分類">
        {categories.map(cat => (
          <button
            key={cat}
            type="button"
            className="yy-tab"
            aria-pressed={selectedCategory === cat}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat === 'all' ? 'すべて' : cat}
            <small>{countOf(cat)}</small>
          </button>
        ))}
      </nav>

      <div className="yy-di-body">
        {/* ========================================== */}
        {/* 左：記事の索引・検索 */}
        {/* ========================================== */}
        <section className="yy-di-index" aria-label="記事">
          <SecHead no="I" title="記事" right={`${filteredPosts.length} 件`} />
          <div className="yy-di-search">
            <FiSearch />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="キーワード検索"
            />
          </div>
          <div className="yy-di-ctrl">
            {isLoggedIn && (
              <button
                type="button"
                className="yy-di-textbtn"
                aria-pressed={showBookmarksOnly}
                onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
              >
                {showBookmarksOnly ? '★ お気に入りのみ' : '☆ お気に入り一覧'}
              </button>
            )}
            {isAdmin && (
              <button type="button" className="yy-di-textbtn is-acc" onClick={handleCreateNew}>
                ＋ 新しい記事を作成
              </button>
            )}
            {/* ソート機能 */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest' | 'title')}
              aria-label="並び順"
            >
              <option value="newest">新しい順</option>
              <option value="oldest">古い順</option>
              <option value="title">タイトル順</option>
            </select>
          </div>

          {/* 記事リスト本体 */}
          {filteredPosts.length === 0 ? (
            <p className="yy-info-empty">該当なし</p>
          ) : (
            <ol className="yy-di-list">
              {filteredPosts.map((post, i) => (
                <li
                  key={post.id}
                  className="yy-di-row"
                  aria-current={selectedPostId === post.id ? 'true' : undefined}
                  onClick={() => selectPost(post.id)}
                >
                  <span className="yy-di-rowno">{String(i + 1).padStart(2, '0')}</span>
                  <span className="yy-di-rowbody">
                    <span className="yy-di-rowt">{post.title}</span>
                    <span className="yy-di-rowmeta">
                      <span>{post.category}</span>
                      <span>{post.date}</span>
                      {post.tags && post.tags.slice(0, 2).map(tag => (
                        <span key={tag}>#{tag}</span>
                      ))}
                    </span>
                  </span>
                  {isLoggedIn && (
                    <button
                      type="button"
                      className="yy-di-star"
                      aria-pressed={isBookmarked(post.id)}
                      aria-label={isBookmarked(post.id) ? 'お気に入りから外す' : 'お気に入りに追加'}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(post);
                      }}
                    >
                      {isBookmarked(post.id) ? '★' : '☆'}
                    </button>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* ========================================== */}
        {/* 中央：記事 */}
        {/* ========================================== */}
        <article className="yy-di-article">
          {isEditing ? (
            /* --- 編集モード --- */
            <div>
              <SecHead
                title="記事編集"
                right={
                  <button type="button" className="yy-di-textbtn" onClick={() => setIsEditing(false)}>
                    閉じる ×
                  </button>
                }
              />
              <div className="yy-di-edit">
                <input
                  placeholder="タイトル"
                  value={editingPost?.title}
                  onChange={e => setEditingPost(prev => prev ? {...prev, title: e.target.value} : null)}
                />
                <div className="yy-di-edit__row">
                  <input
                    placeholder="カテゴリー"
                    value={editingPost?.category}
                    onChange={e => setEditingPost(prev => prev ? {...prev, category: e.target.value} : null)}
                  />
                  <input
                    placeholder="タグ(カンマ区切り)"
                    value={editingPost?.tags}
                    onChange={e => setEditingPost(prev => prev ? {...prev, tags: e.target.value} : null)}
                  />
                </div>
                <textarea
                  placeholder="本文"
                  value={editingPost?.content}
                  onChange={e => setEditingPost(prev => prev ? {...prev, content: e.target.value} : null)}
                />
                <div className="yy-di-edit__act">
                  <button type="button" className="yy-btn" onClick={() => setIsEditing(false)}>キャンセル</button>
                  <button type="button" className="yy-btn is-primary" onClick={handleSave}>保存</button>
                </div>
              </div>
            </div>
          ) : currentPost && article ? (
            /* --- 閲覧モード --- */
            <>
              {/* 記事ヘッダー */}
              <div className="yy-di-meta">
                <span>{currentPost.category}</span>
                <span>{currentPost.date}</span>
                {isLoggedIn && (
                  <button
                    type="button"
                    className="yy-di-textbtn"
                    aria-pressed={isBookmarked(currentPost.id)}
                    onClick={() => toggleBookmark(currentPost)}
                  >
                    {isBookmarked(currentPost.id) ? '★ お気に入り済み' : '☆ お気に入りに追加'}
                  </button>
                )}
                {isAdmin && (
                  <span className="yy-di-meta__admin">
                    <button type="button" className="yy-di-textbtn" onClick={() => handleEdit(currentPost)}>編集</button>
                    <button type="button" className="yy-di-textbtn is-danger" onClick={() => handleDelete(currentPost.id)}>削除</button>
                  </span>
                )}
              </div>

              <h1 className="yy-di-title">{currentPost.title}</h1>

              {currentPost.tags && currentPost.tags.length > 0 && (
                <ul className="yy-di-tags">
                  {currentPost.tags.map(tag => (
                    <li key={tag}>#{tag}</li>
                  ))}
                </ul>
              )}

              {/* 計算ツール（該当カテゴリのみ） */}
              {currentPost.category === '構造設計' && (
                <section className="yy-di-tool">
                  <SecHead
                    title="構造計算ツール：梁のたわみ"
                    right={
                      <button type="button" className="yy-di-textbtn is-acc" onClick={() => setShowTool(!showTool)}>
                        {showTool ? '閉じる' : 'ツールを開く'}
                      </button>
                    }
                  />
                  {showTool && (
                    <div className="yy-di-tool__body">
                      <StructureKouzouHari />
                    </div>
                  )}
                </section>
              )}

              {/* 記事本文 */}
              <div className="yy-di-content">{article.nodes}</div>
            </>
          ) : (
            /* --- 記事未選択時 --- */
            <p className="yy-di-none">記事を選択してください</p>
          )}
        </article>

        {/* ========================================== */}
        {/* 右：目次 / 関連 / この画面について */}
        {/* ========================================== */}
        <aside className="yy-info-side">
          <section className="yy-info-block" aria-label="目次">
            <SecHead no="II" title="目次" right={article && !isEditing ? `${article.heads.length} 章` : undefined} />
            {article && article.heads.length > 0 && !isEditing ? (
              <ol className="yy-info-toc">
                {article.heads.map((h, i) => (
                  <li key={h.id}>
                    <a
                      href={`#${h.id}`}
                      title={h.text}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToHead(h.id);
                      }}
                    >
                      <span className="yy-info-tocno">{String(i + 1).padStart(2, '0')}</span>
                      <span className="yy-info-toct">{h.text}</span>
                    </a>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="yy-info-empty">この記事には見出しがありません</p>
            )}
          </section>

          <section className="yy-info-block" aria-label="関連">
            <SecHead no="III" title="関連" />
            <ul className="yy-info-toc">
              <li>
                <ScreenLink target={{ menu: 'material-info' }}>
                  <span className="yy-info-toct">材料情報</span>
                  <span className="yy-leader" />
                  <span className="yy-info-tocv">規格の早見表</span>
                </ScreenLink>
              </li>
              <li>
                <Link href="/lookup/">
                  <span className="yy-info-toct">建築の調べもの</span>
                  <span className="yy-leader" />
                  <span className="yy-info-tocv">条文と計算 ↗</span>
                </Link>
              </li>
              <li>
                <ScreenLink target={{ menu: 'design-index' }}>
                  <span className="yy-info-toct">設計ツール</span>
                  <span className="yy-leader" />
                  <span className="yy-info-tocv">計算書</span>
                </ScreenLink>
              </li>
            </ul>
          </section>

          <section className="yy-info-block" aria-label="この画面について">
            <SecHead no="IV" title="この画面について" />
            <p className="yy-info-text">
              最新の設計関連情報をお届けします。建築設計に必要な技術情報、法規情報、設備情報などをまとめています。※情報は設計者が実務において適切に調査・確認してください。
            </p>
            <p className="yy-info-text is-beta">※この機能は現在β版です。ご意見をぜひお聞かせください。</p>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default DesignInfo;
