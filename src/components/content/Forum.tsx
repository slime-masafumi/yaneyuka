'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { addForumPost, deleteForumBookmark, listForumBookmarks, listForumPosts, setForumBookmark, addForumReply, listForumReplies, deleteForumPostDoc, deleteForumReply } from '@/lib/firebaseUserData'
import { useAuth } from '@/lib/AuthContext'
import { db } from '@/lib/firebaseClient'
import { collection, onSnapshot } from 'firebase/firestore'

type ForumPost = {
  id: string
  category: string
  title: string
  author: string
  date: string
  content: string
  bookmarked?: boolean
  replies?: { id: string; author: string; content: string; createdAt: number; uid?: string | null }[]
  uid?: string | null
}

type SortMode = 'newest' | 'replies'

const CATEGORIES = [
  '意匠', '構造', '設備', '施工', '法規', '積算', '現場管理', '材料', '内装', '外装'
]

// 不適切な単語のリスト（悪口など）
const INAPPROPRIATE_WORDS = [
  'バカ', 'アホ', '馬鹿', '阿呆', '死ね', 'クソ', '糞', 'キモい', 'キモ', 'ウザい', 'うざい',
  'カス', 'ゴミ', 'クズ', 'ブス', 'デブ', 'チビ', 'ハゲ', 'ガイジ', 'キチガイ', '気違い',
  'ファック', 'fuck', 'shit', 'damn', 'idiot', 'stupid', 'moron', 'asshole', 'bitch',
  '殺す', '死ね', '消えろ', '消えて', '出て行け', '出て行け', '嫌い', '大嫌い'
]

// 不適切な内容をチェックする関数
function checkInappropriateContent(text: string): string | null {
  const lowerText = text.toLowerCase()
  for (const word of INAPPROPRIATE_WORDS) {
    if (lowerText.includes(word.toLowerCase())) {
      return word
    }
  }
  return null
}

/* ─── Shared sub-components to eliminate PC / mobile duplication ─── */

function CategoryButtons({
  activeCategory,
  setActiveCategory,
  uid,
  showForm,
  setShowForm,
  sortMode,
  setSortMode,
}: {
  activeCategory: string
  setActiveCategory: (c: string) => void
  uid: string | null
  showForm: boolean
  setShowForm: React.Dispatch<React.SetStateAction<boolean>>
  sortMode: SortMode
  setSortMode: (m: SortMode) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-2 items-center">
      <div className="mr-auto">
        {uid ? (
          <button
            type="button"
            onClick={() => setShowForm(prev => !prev)}
            className="text-xs px-4 py-1 rounded bg-gray-700 text-white hover:bg-gray-800 min-w-[90px]"
          >
            {showForm ? '閉じる' : '質問する'}
          </button>
        ) : (
          <div className="text-[11px] text-white bg-gray-500 rounded px-2 py-1 min-w-[120px] text-center">閲覧のみ可（投稿・回答はログインが必要）</div>
        )}
      </div>
      <div className="w-full flex gap-2 flex-wrap items-center">
        <button
          key="ALL"
          onClick={() => setActiveCategory('ALL')}
          className={`text-xs py-1 rounded transition min-w-[72px] text-center ${activeCategory === 'ALL' ? 'bg-gray-700 text-white' : 'bg-gray-300 text-black hover:bg-gray-700 hover:text-white'}`}
        >
          ALL
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-xs py-1 rounded transition min-w-[72px] text-center ${activeCategory === cat ? 'bg-gray-700 text-white' : 'bg-gray-300 text-black hover:bg-gray-700 hover:text-white'}`}
          >
            {cat}
          </button>
        ))}
        {/* Sort buttons */}
        <span className="text-[11px] text-gray-500 ml-auto">並替:</span>
        <button
          type="button"
          onClick={() => setSortMode('newest')}
          className={`text-[11px] px-2 py-0.5 rounded border ${sortMode === 'newest' ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
        >
          新着順
        </button>
        <button
          type="button"
          onClick={() => setSortMode('replies')}
          className={`text-[11px] px-2 py-0.5 rounded border ${sortMode === 'replies' ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
        >
          返信数順
        </button>
      </div>
    </div>
  )
}

function PostCard({
  p,
  uid,
  isAdmin,
  toggleBookmark,
  handleDeletePost,
  handleDeleteReply,
  setRawPosts,
}: {
  p: ForumPost
  uid: string | null
  isAdmin: boolean
  toggleBookmark: (id: string) => void
  handleDeletePost: (id: string) => void
  handleDeleteReply: (postId: string, replyId: string) => void
  setRawPosts: React.Dispatch<React.SetStateAction<Omit<ForumPost, 'bookmarked'>[]>>
}) {
  const replyCount = (p.replies || []).length
  return (
    <div className="p-3 border rounded bg-white">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-[12px] text-gray-500">
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-200 text-gray-700 text-[11px]">{p.category}</span>
            <span>{p.author}・{p.date}</span>
            {replyCount > 0 && (
              <span className="inline-flex items-center text-[11px] text-gray-500">返信 {replyCount}件</span>
            )}
          </div>
          <div className="text-[14px] font-medium text-blue-700 mt-1">{p.title}</div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => toggleBookmark(p.id)}
            className={`shrink-0 text-[12px] px-2 py-1 rounded border ${p.bookmarked ? 'bg-yellow-100 border-yellow-300 text-yellow-700' : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'}`}
          >
            {p.bookmarked ? '★ 保存済' : '☆ ブクマ'}
          </button>
          {uid && (p.uid === uid || isAdmin) && (
            <button
              type="button"
              onClick={() => handleDeletePost(p.id)}
              className="shrink-0 text-[12px] px-2 py-1 rounded border bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
            >
              削除
            </button>
          )}
        </div>
      </div>
      <div className="text-[12px] text-gray-700 mt-1 whitespace-pre-line">{p.content}</div>
      {/* 回答一覧 */}
      <div className="mt-2 space-y-2">
        {(p.replies || []).map(r => (
          <div key={r.id} className="text-[12px] text-gray-700 bg-gray-50 border rounded p-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="text-[11px] text-gray-500">{r.author}・{new Date(r.createdAt).toLocaleString('ja-JP')}</div>
                <div className="whitespace-pre-line">{r.content}</div>
              </div>
              {uid && (r.uid === uid || isAdmin) && (
                <button
                  type="button"
                  onClick={() => handleDeleteReply(p.id, r.id)}
                  className="shrink-0 text-[11px] px-2 py-1 rounded border bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                >
                  削除
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* 回答フォーム */}
      {uid ? (
        <ReplyForm postId={p.id} onAdded={(reply) => setRawPosts(prev => prev.map(pp => pp.id === p.id ? { ...pp, replies: [...(pp.replies || []), reply] } : pp))} />
      ) : (
        <div className="mt-2 text-[12px] text-gray-500">回答するにはログインが必要です。</div>
      )}
    </div>
  )
}

function BookmarkCard({ b, toggleBookmark }: { b: ForumPost; toggleBookmark: (id: string) => void }) {
  return (
    <div className="p-3 border rounded bg-white">
      <div className="text-[11px] text-gray-500">{b.author}・{b.date}</div>
      <div className="text-[13px] font-medium text-blue-700">{b.title}</div>
      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={() => toggleBookmark(b.id)}
          className="text-[11px] px-2 py-1 rounded border bg-white hover:bg-gray-50 border-gray-300 text-gray-700"
        >
          解除
        </button>
      </div>
    </div>
  )
}

function PostList({
  filtered,
  loadError,
  uid,
  isAdmin,
  toggleBookmark,
  handleDeletePost,
  handleDeleteReply,
  setRawPosts,
}: {
  filtered: ForumPost[]
  loadError: string
  uid: string | null
  isAdmin: boolean
  toggleBookmark: (id: string) => void
  handleDeletePost: (id: string) => void
  handleDeleteReply: (postId: string, replyId: string) => void
  setRawPosts: React.Dispatch<React.SetStateAction<Omit<ForumPost, 'bookmarked'>[]>>
}) {
  return (
    <div className="space-y-3 mt-4">
      {loadError && (
        <div className="text-[12px] text-red-600">{loadError}</div>
      )}
      {filtered.length === 0 && (
        <div className="text-[12px] text-gray-500">このカテゴリの投稿はまだありません。</div>
      )}
      {filtered.map(p => (
        <PostCard
          key={p.id}
          p={p}
          uid={uid}
          isAdmin={isAdmin}
          toggleBookmark={toggleBookmark}
          handleDeletePost={handleDeletePost}
          handleDeleteReply={handleDeleteReply}
          setRawPosts={setRawPosts}
        />
      ))}
    </div>
  )
}

function BookmarkSection({ bookmarkedList, toggleBookmark }: { bookmarkedList: ForumPost[]; toggleBookmark: (id: string) => void }) {
  return (
    <>
      <div className="text-sm font-semibold">ブックマーク</div>
      {bookmarkedList.length === 0 && (
        <div className="text-[12px] text-gray-500">ブックマークはまだありません。</div>
      )}
      <div className="space-y-2">
        {bookmarkedList.map(b => (
          <BookmarkCard key={`bm-${b.id}`} b={b} toggleBookmark={toggleBookmark} />
        ))}
      </div>
    </>
  )
}

/* ─── Main component ─── */

export default function Forum() {
  const [activeCategory, setActiveCategory] = useState<string>('ALL')
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  // Firestoreからの生データ（bookmarkedフラグは付けない）
  const [rawPosts, setRawPosts] = useState<Omit<ForumPost, 'bookmarked'>[]>([])
  // ブックマークID集合（イベント情報の方式に合わせ、状態を独立保持＋localStorageキャッシュ）
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set())
  const [showForm, setShowForm] = useState<boolean>(false)
  const { currentUser } = useAuth()
  const uid = currentUser?.uid || null
  const isAdmin = currentUser?.email === 'slime-a@outlook.com'
  const [loadError, setLoadError] = useState<string>('')

  useEffect(() => {
    // 1) まずローカルキャッシュを即表示
    try {
      const cached = localStorage.getItem('forumPosts:all')
      if (cached) setRawPosts(JSON.parse(cached))
    } catch {}

    // 2) Firestoreをリアルタイム購読（全ユーザー閲覧可）
    const colRef = collection(db, 'forumPosts')
    const unsub = onSnapshot(colRef, async (snap) => {
      if (snap.empty) {
        if (snap.metadata.fromCache || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
          return
        }
      }
      const list = await Promise.all(snap.docs.map(async d => {
        const data = d.data() as any
        // 返信も取得
        try {
          const rs = await listForumReplies(d.id)
          return {
            id: d.id,
            title: data.title,
            author: data.author,
            date: data.date,
            category: data.category,
            content: data.content,
            uid: data.uid ?? null,
            replies: rs.map(r => ({ id: r.id!, author: r.author, content: r.content, createdAt: r.createdAt, uid: r.uid ?? null }))
          }
        } catch {
          return { id: d.id, title: data.title, author: data.author, date: data.date, category: data.category, content: data.content, uid: data.uid ?? null, replies: [] }
        }
      }))
      setRawPosts(list)
      try { localStorage.setItem('forumPosts:all', JSON.stringify(list)) } catch {}
    }, (err) => {
      setLoadError('投稿を読み込めませんでした。未ログイン閲覧が許可されていない可能性があります。')
      console.error('Forum load error:', err)
    })
    return () => unsub()
  }, [])

  // ブックマーク適用後のpostsを生成
  const posts: ForumPost[] = useMemo(() => {
    const ids = bookmarkIds
    return rawPosts.map(p => ({ ...p, bookmarked: ids.has(p.id) }))
  }, [rawPosts, bookmarkIds])

  const filtered = useMemo(() => {
    let list = activeCategory === 'ALL' ? posts : posts.filter(p => p.category === activeCategory)
    if (sortMode === 'replies') {
      list = [...list].sort((a, b) => (b.replies || []).length - (a.replies || []).length)
    } else {
      // newest first: sort by date descending (ISO date string is sortable)
      list = [...list].sort((a, b) => b.date.localeCompare(a.date))
    }
    return list
  }, [posts, activeCategory, sortMode])
  const bookmarkedList = useMemo(() => posts.filter(p => p.bookmarked), [posts])

  useEffect(() => {
    if (!uid) return
    // 1) キャッシュから即時復元
    try {
      const cached = localStorage.getItem(`forumBookmarks:${uid}`)
      if (cached) {
        const arr = JSON.parse(cached) as string[]
        setBookmarkIds(new Set(arr))
      }
    } catch {}

    // 2) リアルタイム購読（空スナップのオフライン空上書きを防ぐ）
    const colRef = collection(db, 'users', uid, 'forumBookmarks')
    const unsub = onSnapshot(colRef, (snap) => {
      if (snap.empty) {
        if (snap.metadata.fromCache || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
          return
        }
      }
      const ids = snap.docs.map(d => d.id)
      setBookmarkIds(new Set(ids))
      try { localStorage.setItem(`forumBookmarks:${uid}`, JSON.stringify(ids)) } catch {}
    })
    return () => unsub()
  }, [uid])

  const addPost = async (post: Omit<ForumPost, 'id' | 'date' | 'bookmarked' | 'replies'>) => {
    if (!uid) {
      alert('投稿にはログインが必要です。')
      return
    }
    const nowDate = new Date().toISOString().split('T')[0]
    const id = await addForumPost({ title: post.title, author: post.author, category: post.category, content: post.content, date: nowDate, createdAt: Date.now(), uid })
    const newRaw = { id, date: nowDate, replies: [], uid, ...post }
    setRawPosts(prev => [newRaw, ...prev])
  }

  const toggleBookmark = async (id: string) => {
    if (!uid) { alert('ブックマークには会員登録（無料）が必要です。'); return }
    const post = rawPosts.find(p => p.id === id)
    if (!post) return
    setBookmarkIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      try { localStorage.setItem(`forumBookmarks:${uid}`, JSON.stringify(Array.from(next))) } catch {}
      return next
    })
    if (bookmarkIds.has(id)) {
      await deleteForumBookmark(uid, id)
    } else {
      await setForumBookmark(uid, id, { title: post.title, meta: { author: post.author, category: post.category }, createdAt: Date.now() })
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!uid) return
    const post = rawPosts.find(p => p.id === postId)
    if (!post) return

    // 自分の投稿のみ削除可能（管理者以外）
    if (!isAdmin && post.uid !== uid) {
      alert('自分の投稿のみ削除できます。')
      return
    }

    if (!window.confirm('この投稿を削除しますか？')) return
    try {
      await deleteForumPostDoc(postId)
      setRawPosts(prev => {
        const next = prev.filter(p => p.id !== postId)
        try { localStorage.setItem('forumPosts:all', JSON.stringify(next)) } catch {}
        return next
      })
      setBookmarkIds(prev => {
        if (!prev.has(postId)) return prev
        const next = new Set(prev)
        next.delete(postId)
        try { localStorage.setItem(`forumBookmarks:${uid}`, JSON.stringify(Array.from(next))) } catch {}
        return next
      })
    } catch (error) {
      console.error('Failed to delete forum post', error)
      alert('投稿の削除に失敗しました。時間をおいて再度お試しください。')
    }
  }

  const handleDeleteReply = async (postId: string, replyId: string) => {
    if (!uid) return
    const post = rawPosts.find(p => p.id === postId)
    if (!post) return
    const reply = (post.replies || []).find(r => r.id === replyId)
    if (!reply) return

    // 自分の返信のみ削除可能（管理者以外）
    if (!isAdmin && reply.uid !== uid) {
      alert('自分の回答のみ削除できます。')
      return
    }

    if (!window.confirm('この回答を削除しますか？')) return
    try {
      await deleteForumReply(postId, replyId)
      setRawPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, replies: (p.replies || []).filter(r => r.id !== replyId) }
          : p
      ))
    } catch (error) {
      console.error('Failed to delete forum reply', error)
      alert('回答の削除に失敗しました。時間をおいて再度お試しください。')
    }
  }

  // Shared props for PostList
  const postListProps = {
    filtered,
    loadError,
    uid,
    isAdmin,
    toggleBookmark,
    handleDeletePost,
    handleDeleteReply,
    setRawPosts,
  }

  const categoryProps = {
    activeCategory,
    setActiveCategory,
    uid,
    showForm,
    setShowForm,
    sortMode,
    setSortMode,
  }

  return (
    <div>
      <div className="flex items-baseline mb-2">
        <h2 className="text-xl font-semibold">掲示板</h2>
      </div>
      <p className="text-[12px] text-gray-600 mb-3">
        業務の疑問や事例共有、協力先探しなどに使えるコミュニティスペースです。気になるトピックはカテゴリで絞り込み、必要に応じてブックマークしてください。
      </p>

      {/* スマホ: ブックマークを最上段に表示 */}
      <div className="lg:hidden mb-4">
        <div className="space-y-3">
          <BookmarkSection bookmarkedList={bookmarkedList} toggleBookmark={toggleBookmark} />
        </div>
      </div>
      {/* PC: 2列表示 */}
      <div className="hidden lg:grid grid-cols-3 gap-4 items-start">
        <div className="col-span-2">
          <CategoryButtons {...categoryProps} />

          {/* 投稿フォーム（トグル表示） */}
          {uid && showForm && (
            <PostForm
              categories={CATEGORIES}
              defaultCategory={activeCategory === 'ALL' ? CATEGORIES[0] : activeCategory}
              onSubmit={(data) => { addPost(data); setShowForm(false) }}
            />
          )}

          <PostList {...postListProps} />
        </div>
        <div className="col-span-1">
          <div className="sticky top-4 space-y-3">
            <BookmarkSection bookmarkedList={bookmarkedList} toggleBookmark={toggleBookmark} />
          </div>
        </div>
      </div>
      {/* スマホ: 本文エリア（1列表示） */}
      <div className="lg:hidden">
        <CategoryButtons {...categoryProps} />

        {/* 投稿フォーム（トグル表示） */}
        {uid && showForm && (
          <PostForm
            categories={CATEGORIES}
            defaultCategory={activeCategory === 'ALL' ? CATEGORIES[0] : activeCategory}
            onSubmit={(data) => { addPost(data); setShowForm(false) }}
          />
        )}

        <PostList {...postListProps} />
      </div>
    </div>
  )
}

function PostForm({ onSubmit, categories, defaultCategory }: { onSubmit: (data: { title: string; author: string; content: string; category: string }) => void; categories: string[]; defaultCategory: string }) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [content, setContent] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState<string>(defaultCategory)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !author.trim() || !content.trim()) {
      setMessage('未入力の項目があります')
      return
    }

    // 不適切な内容をチェック
    const titleCheck = checkInappropriateContent(title.trim())
    const contentCheck = checkInappropriateContent(content.trim())
    const authorCheck = checkInappropriateContent(author.trim())

    if (titleCheck || contentCheck || authorCheck) {
      const foundWord = titleCheck || contentCheck || authorCheck
      setMessage(`不適切な表現（「${foundWord}」など）が含まれています。内容を書き直してください。`)
      return
    }

    onSubmit({ title: title.trim(), author: author.trim(), content: content.trim(), category })
    setTitle(''); setAuthor(''); setContent(''); setMessage('投稿しました')
  }

  return (
    <form onSubmit={submit} className="bg-white border rounded p-3">
      <div className="flex items-end gap-3 flex-wrap md:flex-nowrap">
        <div className="flex-1 min-w-[240px]">
          <label htmlFor="forum-title" className="block text-[12px] text-gray-700 mb-1">タイトル</label>
          <input id="forum-title" name="title" className="w-full border p-2 rounded text-sm" value={title} onChange={e=>setTitle(e.target.value)} placeholder="質問の要点を簡潔に" />
        </div>
        <div className="w-[140px]">
          <label htmlFor="forum-category-select" className="block text-[12px] text-gray-700 mb-1">カテゴリー</label>
          <select id="forum-category-select" name="category" className="w-full border p-2 rounded text-sm" value={category} onChange={e=>setCategory(e.target.value)}>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="w-[200px]">
          <label htmlFor="forum-author" className="block text-[12px] text-gray-700 mb-1">質問者</label>
          <input id="forum-author" name="author" className="w-full border p-2 rounded text-sm" value={author} onChange={e=>setAuthor(e.target.value)} placeholder="お名前（ニックネーム可）" />
        </div>
      </div>
      <div className="mt-2">
        <label htmlFor="forum-content" className="block text-[12px] text-gray-700 mb-1">質問内容</label>
        <textarea id="forum-content" name="content" className="w-full border p-2 rounded text-sm h-28" value={content} onChange={e=>setContent(e.target.value)} placeholder="詳細を記載してください" />
      </div>
      {message && <div className={`text-[11px] mt-2 ${message.includes('投稿しました') ? 'text-green-600' : 'text-red-600'}`}>{message}</div>}
      <div className="mt-3">
        <button type="submit" className="px-3 py-1 bg-gray-700 text-white rounded text-sm">投稿する</button>
      </div>
    </form>
  )
}

function ReplyForm({ postId, onAdded }: { postId: string; onAdded: (r: { id: string; author: string; content: string; createdAt: number; uid?: string | null }) => void }) {
  const { currentUser } = useAuth()
  const [author, setAuthor] = useState('')
  const [content, setContent] = useState('')
  const [msg, setMsg] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!author.trim() || !content.trim()) { setMsg('未入力の項目があります'); return }

    // 不適切な内容をチェック
    const contentCheck = checkInappropriateContent(content.trim())
    const authorCheck = checkInappropriateContent(author.trim())

    if (contentCheck || authorCheck) {
      const foundWord = contentCheck || authorCheck
      setMsg(`不適切な表現（「${foundWord}」など）が含まれています。内容を書き直してください。`)
      return
    }

    const now = Date.now()
    const replyUid = currentUser?.uid || null
    try {
      await addForumReply(postId, { author: author.trim(), content: content.trim(), createdAt: now, uid: replyUid })
      onAdded({ id: `tmp-${now}`, author: author.trim(), content: content.trim(), createdAt: now, uid: replyUid })
      setAuthor(''); setContent(''); setMsg('投稿しました')
    } catch {
      setMsg('投稿に失敗しました')
    }
  }

  return (
    <form onSubmit={submit} className="mt-2 border-t pt-2">
      <div className="flex gap-2 flex-wrap">
        <input className="border rounded px-2 py-1 text-[12px]" placeholder="お名前（任意）" value={author} onChange={e=>setAuthor(e.target.value)} />
        <input className="flex-1 border rounded px-2 py-1 text-[12px] min-w-[200px]" placeholder="回答を書く" value={content} onChange={e=>setContent(e.target.value)} />
        <button type="submit" className="px-2 py-1 text-[12px] rounded bg-gray-700 text-white hover:bg-gray-800">回答する</button>
      </div>
      {msg && <div className={`text-[11px] mt-1 ${msg.includes('失敗') ? 'text-red-600' : 'text-green-600'}`}>{msg}</div>}
    </form>
  )
}
