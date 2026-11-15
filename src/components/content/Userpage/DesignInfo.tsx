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
import { formatDesignContent, leadOf } from './designArticle';
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
const DesignInfo: React.FC<{ embedded?: boolean; initialPost?: string | null }> = ({ embedded = false, initialPost = null }) => {
  const { isAdmin, currentUser, isLoggedIn } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'title'>('newest');
  
  // 選択中の記事ID（初期値はnullだが、useEffectでリストの先頭を自動選択させる）
  const [selectedPostId, setSelectedPostId] = useState<string | null>(initialPost);
  // 記事を指定して開いたとき(/lookup/?post=7)
  useEffect(() => {
    setSelectedPostId(initialPost);
  }, [initialPost]);
  
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

  // 2026-11-15: 以前は先頭の記事を自動で開き、記事を探す一覧は細い列だけだった。
  // 何も選んでいないときは「目録」(分野ごとの一覧)を中央に出す。

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


  const article = useMemo(() => (currentPost ? formatDesignContent(currentPost.content, currentPost.id) : null), [currentPost]); // eslint-disable-line react-hooks/exhaustive-deps
  const countOf = (cat: string) => (cat === 'all' ? posts.length : posts.filter(p => p.category === cat).length);
  const bookmarkCount = Object.keys(bookmarks).length;

  const scrollToHead = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toTop = () => {
    const top = document.getElementById('yy-di-top');
    if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: 'start' });
  };
  // 記事を開く。調べもの(/lookup/)の中では URL も ?post= にする(共有・戻るボタンで同じ記事)
  const selectPost = (id: string) => {
    setSelectedPostId(id);
    setIsEditing(false); // 閲覧モードに戻す
    if (embedded) {
      try {
        window.history.pushState(null, '', `/lookup/?post=${encodeURIComponent(id)}`);
      } catch {}
    }
    toTop();
  };
  const backToIndex = () => {
    setSelectedPostId(null);
    setIsEditing(false);
    if (embedded) {
      try {
        window.history.pushState(null, '', '/lookup/');
      } catch {}
    }
    toTop();
  };
  const pickCategory = (cat: string) => {
    setSelectedCategory(cat);
    if (currentPost) backToIndex();
  };
  const pickTag = (tag: string) => {
    setSearchQuery(tag);
    setSelectedCategory('all');
    if (currentPost) backToIndex();
  };

  // 目録の並び(分野の順)。データにある分類で、ここに無いものは後ろへ
  const ORDER = ['法規制', '意匠計画', '構造設計', '機械設備', '電気設備', 'インテリア計画', '用語集'];
  const orderedCats = [...categories.filter((c) => c !== 'all')].sort((a, b) => {
    const ia = ORDER.indexOf(a);
    const ib = ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const groups = orderedCats
    .map((cat) => ({ cat, list: filteredPosts.filter((p) => p.category === cat) }))
    .filter((g) => g.list.length);
  const flat = Boolean(searchQuery.trim()) || showBookmarksOnly || selectedCategory !== 'all';
  const recent = [...posts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const topTags = Object.entries(
    posts.flatMap((p) => p.tags ?? []).reduce<Record<string, number>>((acc, t) => ((acc[t] = (acc[t] ?? 0) + 1), acc), {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([t]) => t);
  const sameCat = currentPost ? posts.filter((p) => p.category === currentPost.category) : [];
  const pos = currentPost ? sameCat.findIndex((p) => p.id === currentPost.id) : -1;
  const prevPost = pos > 0 ? sameCat[pos - 1] : null;
  const nextPost = pos >= 0 && pos < sameCat.length - 1 ? sameCat[pos + 1] : null;

  /** 目録の 1 行:番号 / 題 + 書き出し + 分類・日付・タグ / お気に入り */
  const Entry = ({ post, n }: { post: DesignPost; n: number }) => (
    <li className="yy-di-entry">
      {/* 検索エンジンがたどれるように、記事の単体ページへのリンクにする。押したときはこの画面の中で開く */}
      <a
        href={`/lookup/post/${encodeURIComponent(post.id)}/`}
        className="yy-di-entry__main"
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          selectPost(post.id);
        }}
      >
        <span className="yy-di-entry__no">{String(n).padStart(2, '0')}</span>
        <span className="yy-di-entry__body">
          <span className="yy-di-entry__t">{post.title}</span>
          <span className="yy-di-entry__lead">{leadOf(post.content)}</span>
          <span className="yy-di-entry__meta">
            <span>{post.category}</span>
            <span>{post.date}</span>
            {(post.tags ?? []).slice(0, 3).map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </span>
        </span>
      </a>
      {isLoggedIn && (
        <button
          type="button"
          className="yy-di-star"
          aria-pressed={isBookmarked(post.id)}
          aria-label={isBookmarked(post.id) ? 'お気に入りから外す' : 'お気に入りに追加'}
          onClick={() => toggleBookmark(post)}
        >
          {isBookmarked(post.id) ? '★' : '☆'}
        </button>
      )}
    </li>
  );

  const tabs = (
    <nav className="yy-tabs" aria-label="分類">
      {categories.map((cat) => (
        <button key={cat} type="button" className="yy-tab" aria-pressed={!currentPost && selectedCategory === cat} onClick={() => pickCategory(cat)}>
          {cat === 'all' ? 'すべて' : cat}
          <small>{countOf(cat)}</small>
        </button>
      ))}
    </nav>
  );

  const editor = isEditing && (
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
        <input placeholder="タイトル" value={editingPost?.title} onChange={(e) => setEditingPost((prev) => (prev ? { ...prev, title: e.target.value } : null))} />
        <div className="yy-di-edit__row">
          <input placeholder="カテゴリー" value={editingPost?.category} onChange={(e) => setEditingPost((prev) => (prev ? { ...prev, category: e.target.value } : null))} />
          <input placeholder="タグ(カンマ区切り)" value={editingPost?.tags} onChange={(e) => setEditingPost((prev) => (prev ? { ...prev, tags: e.target.value } : null))} />
        </div>
        <textarea placeholder="本文" value={editingPost?.content} onChange={(e) => setEditingPost((prev) => (prev ? { ...prev, content: e.target.value } : null))} />
        <div className="yy-di-edit__act">
          <button type="button" className="yy-btn" onClick={() => setIsEditing(false)}>
            キャンセル
          </button>
          <button type="button" className="yy-btn is-primary" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );

  // ───────── 目録(記事を選んでいないとき) ─────────
  if (!currentPost && !isEditing) {
    let n = 0;
    return (
      <div className="yy-di" id="yy-di-top">
        {!embedded && <PageHead no="15" en="design info" title="設計情報" desc="設計の技術・法規・設備の読みもの" right={<Stat n={posts.length} label="記事" />} />}
        {tabs}
        <div className="yy-di-home">
          <div className="yy-di-home__main">
            <div className="yy-di-finder">
              <FiSearch aria-hidden="true" />
              <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="題・本文・タグから探す(例: 排煙、接地、ALC)" aria-label="記事を探す" />
              <span className="yy-di-finder__n">{filteredPosts.length} 件</span>
            </div>
            <div className="yy-di-ctrl">
              {isLoggedIn && (
                <button type="button" className="yy-di-textbtn" aria-pressed={showBookmarksOnly} onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}>
                  {showBookmarksOnly ? '★ お気に入りのみ' : '☆ お気に入りだけ見る'}
                </button>
              )}
              {(searchQuery || selectedCategory !== 'all' || showBookmarksOnly) && (
                <button
                  type="button"
                  className="yy-di-textbtn"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setShowBookmarksOnly(false);
                  }}
                >
                  絞り込みを外す ×
                </button>
              )}
              {isAdmin && (
                <button type="button" className="yy-di-textbtn is-acc" onClick={handleCreateNew}>
                  ＋ 新しい記事を作成
                </button>
              )}
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest' | 'title')} aria-label="並び順">
                <option value="newest">新しい順</option>
                <option value="oldest">古い順</option>
                <option value="title">タイトル順</option>
              </select>
            </div>

            {filteredPosts.length === 0 ? (
              <p className="yy-info-empty">該当する記事はありません</p>
            ) : flat ? (
              <ol className="yy-di-entries">
                {filteredPosts.map((post, i) => (
                  <Entry key={post.id} post={post} n={i + 1} />
                ))}
              </ol>
            ) : (
              groups.map((g, gi) => (
                <section key={g.cat} className="yy-di-group" aria-label={g.cat}>
                  <SecHead no={String.fromCharCode(0x2160 + gi)} title={g.cat} right={`${g.list.length} 本`} />
                  <ol className="yy-di-entries">
                    {g.list.map((post) => (
                      <Entry key={post.id} post={post} n={++n} />
                    ))}
                  </ol>
                </section>
              ))
            )}
          </div>

          <aside className="yy-info-side">
            <section className="yy-info-block" aria-label="分野">
              <SecHead no="" title="分野" right={`${posts.length} 本`} />
              <ul className="yy-info-toc">
                {orderedCats.map((cat) => (
                  <li key={cat}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        pickCategory(cat);
                      }}
                      aria-current={selectedCategory === cat ? 'true' : undefined}
                    >
                      <span className="yy-info-toct">{cat}</span>
                      <span className="yy-leader" />
                      <span className="yy-info-tocv">{countOf(cat)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
            <section className="yy-info-block" aria-label="新着">
              <SecHead no="" title="新着" />
              <ul className="yy-info-toc">
                {recent.map((p) => (
                  <li key={p.id}>
                    <a
                      href={`/lookup/post/${encodeURIComponent(p.id)}/`}
                      title={p.title}
                      onClick={(e) => {
                        e.preventDefault();
                        selectPost(p.id);
                      }}
                    >
                      <span className="yy-info-toct">{p.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
            <section className="yy-info-block" aria-label="タグ">
              <SecHead no="" title="タグから探す" />
              <ul className="yy-di-tagcloud">
                {topTags.map((t) => (
                  <li key={t}>
                    <button type="button" onClick={() => pickTag(t)} aria-pressed={searchQuery === t}>
                      #{t}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
            <section className="yy-info-block" aria-label="関連">
              <SecHead no="" title="関連" />
              <ul className="yy-info-toc">
                <li>
                  <Link href="/lookup/?tab=material">
                    <span className="yy-info-toct">材料情報</span>
                    <span className="yy-leader" />
                    <span className="yy-info-tocv">規格の早見表</span>
                  </Link>
                </li>
                <li>
                  <Link href="/calc/">
                    <span className="yy-info-toct">計算ツール</span>
                    <span className="yy-leader" />
                    <span className="yy-info-tocv">根拠つき</span>
                  </Link>
                </li>
                <li>
                  <Link href="/lookup/zone/">
                    <span className="yy-info-toct">用途地域 13 種類</span>
                    <span className="yy-leader" />
                    <span className="yy-info-tocv">比較表</span>
                  </Link>
                </li>
              </ul>
              <p className="yy-info-text">記事は根拠の条文・告示・規格を末尾に載せています。最終判断は最新の法令・基準を確かめたうえで行ってください。</p>
            </section>
          </aside>
        </div>
      </div>
    );
  }

  // ───────── 記事 ─────────
  return (
    <div className="yy-di" id="yy-di-top">
      {!embedded && <PageHead no="15" en="design info" title="設計情報" desc="設計の技術・法規・設備の読みもの" right={<Stat n={posts.length} label="記事" />} />}
      {tabs}
      <div className="yy-di-read">
        <article className="yy-di-article">
          {isEditing ? (
            editor
          ) : currentPost && article ? (
            <>
              <nav className="yy-di-crumb" aria-label="記事の位置">
                <button type="button" className="yy-di-textbtn" onClick={backToIndex}>
                  ← 目録
                </button>
                <span>/</span>
                <button type="button" className="yy-di-textbtn" onClick={() => pickCategory(currentPost.category)}>
                  {currentPost.category}
                </button>
              </nav>
              <div className="yy-di-meta">
                <span>{currentPost.category}</span>
                <span>{currentPost.date}</span>
                {isLoggedIn && (
                  <button type="button" className="yy-di-textbtn" aria-pressed={isBookmarked(currentPost.id)} onClick={() => toggleBookmark(currentPost)}>
                    {isBookmarked(currentPost.id) ? '★ お気に入り済み' : '☆ お気に入りに追加'}
                  </button>
                )}
                {isAdmin && (
                  <span className="yy-di-meta__admin">
                    <button type="button" className="yy-di-textbtn" onClick={() => handleEdit(currentPost)}>
                      編集
                    </button>
                    <button type="button" className="yy-di-textbtn is-danger" onClick={() => handleDelete(currentPost.id)}>
                      削除
                    </button>
                  </span>
                )}
              </div>

              <h1 className="yy-di-title">{currentPost.title}</h1>

              {currentPost.tags && currentPost.tags.length > 0 && (
                <ul className="yy-di-tags">
                  {currentPost.tags.map((tag) => (
                    <li key={tag}>
                      <button type="button" onClick={() => pickTag(tag)} title={`「${tag}」の記事を探す`}>
                        #{tag}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

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

              <div className="yy-di-content">{article.nodes}</div>

              <nav className="yy-di-pager" aria-label="同じ分類の前後の記事">
                {prevPost ? (
                  <button type="button" onClick={() => selectPost(prevPost.id)}>
                    <span className="yy-label">← 前の記事</span>
                    <span>{prevPost.title}</span>
                  </button>
                ) : (
                  <span />
                )}
                {nextPost ? (
                  <button type="button" className="is-next" onClick={() => selectPost(nextPost.id)}>
                    <span className="yy-label">次の記事 →</span>
                    <span>{nextPost.title}</span>
                  </button>
                ) : (
                  <span />
                )}
              </nav>
            </>
          ) : null}
        </article>

        <aside className="yy-info-side">
          <section className="yy-info-block" aria-label="目次">
            <SecHead no="I" title="目次" right={article && !isEditing ? `${article.heads.length} 章` : undefined} />
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

          {currentPost && (
            <section className="yy-info-block" aria-label="同じ分類の記事">
              <SecHead no="II" title={currentPost.category} right={`${sameCat.length} 本`} />
              <ol className="yy-info-toc yy-di-samecat">
                {sameCat.map((p, i) => (
                  <li key={p.id}>
                    <a
                      href={`/lookup/post/${encodeURIComponent(p.id)}/`}
                      title={p.title}
                      aria-current={p.id === currentPost.id ? 'true' : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        selectPost(p.id);
                      }}
                    >
                      <span className="yy-info-tocno">{String(i + 1).padStart(2, '0')}</span>
                      <span className="yy-info-toct">{p.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="yy-info-block" aria-label="関連">
            <SecHead no="III" title="関連" />
            <ul className="yy-info-toc">
              <li>
                <Link href="/lookup/?tab=material">
                  <span className="yy-info-toct">材料情報</span>
                  <span className="yy-leader" />
                  <span className="yy-info-tocv">規格の早見表</span>
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
            <p className="yy-info-text">※情報は設計者が実務において適切に調査・確認してください。</p>
          </section>
        </aside>
      </div>
    </div>
  );

};

export default DesignInfo;
