'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { addForumPost, deleteForumBookmark, listForumBookmarks, listForumPosts, setForumBookmark, addForumReply, listForumReplies, deleteForumPostDoc, deleteForumReply, reportForumPost } from '@/lib/firebaseUserData'
import { useAuth } from '@/lib/AuthContext'
import { db } from '@/lib/firebaseClient'
import { collection, onSnapshot } from 'firebase/firestore'
import PageHead, { Stat } from '../ui/PageHead'
import { SecHead } from '../ui/Sheet'
import './connect-pages-2.css'

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

/**
 * 投稿がまだ少ないあいだに出す「質問のきっかけ」(2026-11-15)。架空の投稿は作らない。
 * 押すと、分類とタイトル・本文の書き出しが入った投稿フォームが開く(ログインが要る)。
 */
const STARTERS: { category: string; title: string; content: string }[] = [
  { category: '法規', title: '排煙設備の要否の考え方', content: ['用途:', '階数・延べ面積:', '検討している室:', '迷っている点:'].join('\n') },
  { category: '構造', title: '梁せいを抑えたいときの選択肢', content: ['構造種別:', 'スパン:', '荷重の条件:', '今考えている案:'].join('\n') },
  { category: '設備', title: '電気容量・需要率の見方', content: ['用途・延べ面積:', '主な負荷:', '迷っている点:'].join('\n') },
  { category: '施工', title: '外壁の取り合いの雨仕舞', content: ['部位・材料:', '下地:', '気になっている点:'].join('\n') },
  { category: '材料', title: '建材を比べるときの観点', content: ['部位:', '候補のメーカー・製品:', '重視したいこと:'].join('\n') },
  { category: '現場管理', title: '工程の遅れを取り戻した工夫', content: ['工事の種類・規模:', '遅れた原因:', '試したこと:'].join('\n') },
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

/* ─── 表示用の小さな関数（モック「高級感 3」：日時は等幅・灰） ─── */

const pad2 = (n: number) => String(n).padStart(2, '0')
/** 'YYYY-MM-DD' → 'YYYY.MM.DD' */
const dotDate = (iso: string) => (iso || '').replace(/-/g, '.')
/** ミリ秒 → 'YYYY.MM.DD HH:mm'（端末の時刻） */
const dotDateTime = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
/** 投稿日と返信のうち、いちばん新しい時刻（ミリ秒） */
const lastTouched = (p: ForumPost) => {
  const base = Date.parse(p.date || '') || 0
  return (p.replies || []).reduce((m, r) => Math.max(m, r.createdAt || 0), base)
}
/** 最終更新の短い表記。今年なら 'MM.DD'、それ以外は 'YY.MM.DD' */
const shortDate = (ms: number) => {
  if (!ms) return '—'
  const d = new Date(ms)
  const md = `${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`
  return d.getFullYear() === new Date().getFullYear() ? md : `${String(d.getFullYear()).slice(2)}.${md}`
}

/* ─── 分類の下線タブと、質問する / 並べ替え ─── */

function CategoryButtons({
  activeCategory,
  setActiveCategory,
  counts,
  total,
  uid,
  showForm,
  setShowForm,
  sortMode,
  setSortMode,
}: {
  activeCategory: string
  setActiveCategory: (c: string) => void
  counts: Record<string, number>
  total: number
  uid: string | null
  showForm: boolean
  setShowForm: React.Dispatch<React.SetStateAction<boolean>>
  sortMode: SortMode
  setSortMode: (m: SortMode) => void
}) {
  return (
    <>
      <div className="yy-tabs yy-fr-tabs">
        <button type="button" className="yy-tab" aria-pressed={activeCategory === 'ALL'} onClick={() => setActiveCategory('ALL')}>
          すべて<small>{total}</small>
        </button>
        {CATEGORIES.map(cat => (
          <button key={cat} type="button" className="yy-tab" aria-pressed={activeCategory === cat} onClick={() => setActiveCategory(cat)}>
            {cat}<small>{counts[cat] || 0}</small>
          </button>
        ))}
      </div>
      <div className="yy-fr-tools">
        {uid ? (
          <button type="button" onClick={() => setShowForm(prev => !prev)} className="yy-btn" aria-expanded={showForm}>
            {showForm ? '閉じる' : '質問する'}
          </button>
        ) : (
          <span className="yy-fr-note">閲覧のみ可（投稿・回答はログインが必要）</span>
        )}
        <span className="yy-fr-sort">
          <span className="yy-label">並替</span>
          <button type="button" className="yy-fr-sortbtn" aria-pressed={sortMode === 'newest'} onClick={() => setSortMode('newest')}>新着順</button>
          <button type="button" className="yy-fr-sortbtn" aria-pressed={sortMode === 'replies'} onClick={() => setSortMode('replies')}>返信数順</button>
        </span>
      </div>
    </>
  )
}

const REPORT_REASONS = [
  '宣伝・スパム',
  '誹謗中傷・不快な表現',
  '個人情報が含まれる',
  '掲示板の趣旨に合わない',
  'その他',
]

/**
 * 投稿・返信の通報ボタン。
 * 通報は管理者しか読めない（firestore.rules の forumReports）。
 * 送信済みかどうかは端末側に覚えさせる。通報一覧を引けるようにすると、
 * 誰が通報したかを他の利用者に知られてしまうため。
 */
function ReportButton({
  uid,
  postId,
  replyId,
}: {
  uid: string
  postId: string
  replyId?: string
  small?: boolean
}) {
  const key = `forumReported:${postId}:${replyId || ''}`
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    try { if (localStorage.getItem(key)) setSent(true) } catch {}
  }, [key])

  const submit = async (reason: string) => {
    setBusy(true)
    try {
      await reportForumPost({ reporterUid: uid, postId, replyId, reason })
      try { localStorage.setItem(key, '1') } catch {}
      setSent(true)
      setOpen(false)
    } catch (e) {
      console.error('通報の送信に失敗', e)
      alert('通報を送信できませんでした。時間をおいてお試しください。')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return <span className="yy-fr-act is-done">通報済</span>
  }

  return (
    <span className="yy-fr-popwrap">
      <button type="button" onClick={() => setOpen(v => !v)} className="yy-fr-act" aria-expanded={open}>
        通報
      </button>
      {open && (
        <div className="yy-fr-pop">
          <div className="yy-label yy-fr-pophead">理由を選んでください</div>
          {REPORT_REASONS.map(r => (
            <button key={r} type="button" disabled={busy} onClick={() => submit(r)} className="yy-fr-popitem">
              {r}
            </button>
          ))}
          <button type="button" onClick={() => setOpen(false)} className="yy-fr-popitem is-cancel">
            キャンセル
          </button>
        </div>
      )}
    </span>
  )
}

/* ─── 1 行の索引 + 開くと本のような読む欄 ─── */

function PostCard({
  p,
  no,
  open,
  onToggle,
  uid,
  isAdmin,
  toggleBookmark,
  handleDeletePost,
  handleDeleteReply,
  setRawPosts,
}: {
  p: ForumPost
  no: number
  open: boolean
  onToggle: (id: string) => void
  uid: string | null
  isAdmin: boolean
  toggleBookmark: (id: string) => void
  handleDeletePost: (id: string) => void
  handleDeleteReply: (postId: string, replyId: string) => void
  setRawPosts: React.Dispatch<React.SetStateAction<Omit<ForumPost, 'bookmarked'>[]>>
}) {
  const replyCount = (p.replies || []).length
  return (
    <article id={`forum-post-${p.id}`} className={`yy-fr-thread${open ? ' is-open' : ''}`}>
      <div className="yy-fr-row">
        <span className="yy-fr-no">{pad2(no)}</span>
        <button type="button" className="yy-fr-title" onClick={() => onToggle(p.id)} aria-expanded={open} title={p.title}>
          <span className="yy-fmt">{p.category}</span>
          <span className="yy-fr-titletext">{p.title}</span>
        </button>
        <span className="yy-fr-by" title={`${p.author}・${p.date}`}>{p.author} · {dotDate(p.date)}</span>
        <span className={`yy-fr-rep${replyCount === 0 ? ' is-zero' : ''}`} title={`返信 ${replyCount}件`}>{replyCount}</span>
        <span className="yy-fr-last">{shortDate(lastTouched(p))}</span>
        <button
          type="button"
          onClick={() => toggleBookmark(p.id)}
          className={`yy-news__bm yy-fr-bm${p.bookmarked ? ' is-on' : ''}`}
          aria-pressed={!!p.bookmarked}
          title={p.bookmarked ? '保存済' : 'ブクマ'}
        >
          {p.bookmarked ? '★' : '☆'}
        </button>
      </div>

      {open && (
        <div className="yy-fr-read">
          <div className="yy-fr-meta">
            <span>{p.author}</span>
            <span>{dotDate(p.date)}</span>
            <span>{p.category}</span>
            <span className="yy-fr-acts">
              {/* 自分の投稿は通報できない（誤操作防止） */}
              {uid && p.uid !== uid && (
                <ReportButton uid={uid} postId={p.id} />
              )}
              {uid && (p.uid === uid || isAdmin) && (
                <button type="button" onClick={() => handleDeletePost(p.id)} className="yy-fr-act is-danger">
                  削除
                </button>
              )}
            </span>
          </div>
          <h3 className="yy-fr-readtitle">{p.title}</h3>
          <div className="yy-fr-body">{p.content}</div>

          {/* 回答一覧 */}
          <div className="yy-fr-replyhead">
            <span className="yy-label">回答</span>
            <span className="yy-serif">{replyCount}</span>
          </div>
          {replyCount > 0 && (
            <ol className="yy-fr-replies">
              {(p.replies || []).map((r, i) => (
                <li key={r.id}>
                  <div className="yy-fr-meta">
                    <span className="yy-fr-rno">{i + 1}</span>
                    <span>{r.author}</span>
                    <span>{dotDateTime(r.createdAt)}</span>
                    <span className="yy-fr-acts">
                      {uid && r.uid !== uid && (
                        <ReportButton uid={uid} postId={p.id} replyId={r.id} small />
                      )}
                      {uid && (r.uid === uid || isAdmin) && (
                        <button type="button" onClick={() => handleDeleteReply(p.id, r.id)} className="yy-fr-act is-danger">
                          削除
                        </button>
                      )}
                    </span>
                  </div>
                  <div className="yy-fr-body yy-fr-body--reply">{r.content}</div>
                </li>
              ))}
            </ol>
          )}
          {/* 回答フォーム */}
          {uid ? (
            <ReplyForm postId={p.id} onAdded={(reply) => setRawPosts(prev => prev.map(pp => pp.id === p.id ? { ...pp, replies: [...(pp.replies || []), reply] } : pp))} />
          ) : (
            <p className="yy-fr-hint">回答するにはログインが必要です。</p>
          )}
        </div>
      )}
    </article>
  )
}

function PostList({
  filtered,
  loadError,
  openIds,
  onToggle,
  allOpen,
  setAllOpen,
  uid,
  isAdmin,
  toggleBookmark,
  handleDeletePost,
  handleDeleteReply,
  setRawPosts,
}: {
  filtered: ForumPost[]
  loadError: string
  openIds: Set<string>
  onToggle: (id: string) => void
  allOpen: boolean
  setAllOpen: (v: boolean) => void
  uid: string | null
  isAdmin: boolean
  toggleBookmark: (id: string) => void
  handleDeletePost: (id: string) => void
  handleDeleteReply: (postId: string, replyId: string) => void
  setRawPosts: React.Dispatch<React.SetStateAction<Omit<ForumPost, 'bookmarked'>[]>>
}) {
  return (
    <section>
      <SecHead
        no="I"
        title="スレッド"
        right={
          <>
            {filtered.length} 件 ·{' '}
            <button type="button" className="yy-linkbtn" onClick={() => setAllOpen(!allOpen)}>
              {allOpen ? 'すべて閉じる' : 'すべて開く'}
            </button>
          </>
        }
      />
      {loadError && <p className="yy-fr-error">{loadError}</p>}
      <div className="yy-fr-row yy-fr-row--head" aria-hidden="true">
        <span>No.</span><span>題</span><span>投稿者・日時</span><span>返信</span><span>最終更新</span><span />
      </div>
      {filtered.length === 0 && (
        <p className="yy-home__empty">このカテゴリの投稿はまだありません。</p>
      )}
      {filtered.map((p, i) => (
        <PostCard
          key={p.id}
          p={p}
          no={i + 1}
          open={allOpen || openIds.has(p.id)}
          onToggle={onToggle}
          uid={uid}
          isAdmin={isAdmin}
          toggleBookmark={toggleBookmark}
          handleDeletePost={handleDeletePost}
          handleDeleteReply={handleDeleteReply}
          setRawPosts={setRawPosts}
        />
      ))}
    </section>
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
  // 「質問のきっかけ」から開いたときの書き出し
  const [draft, setDraft] = useState<{ category: string; title: string; content: string } | null>(null)
  const [starterNote, setStarterNote] = useState('')
  // 開いているスレッド（索引の行を押すと、その下に本文と回答を開く）
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [allOpen, setAllOpen] = useState<boolean>(false)
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

  // 右列と見出しの数字
  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    posts.forEach(p => { m[p.category] = (m[p.category] || 0) + 1 })
    return m
  }, [posts])
  const replyTotal = useMemo(() => posts.reduce((s, p) => s + (p.replies || []).length, 0), [posts])
  const unanswered = useMemo(() => posts.filter(p => (p.replies || []).length === 0).length, [posts])
  const recent = useMemo(() => [...posts].sort((a, b) => lastTouched(b) - lastTouched(a)).slice(0, 6), [posts])

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

  const toggleOpen = (id: string) => {
    if (allOpen) {
      // 「すべて開く」中に 1 本を閉じたら、その 1 本以外を開いたままにする
      setAllOpen(false)
      setOpenIds(new Set(filtered.map(p => p.id).filter(x => x !== id)))
      return
    }
    setOpenIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // 右列（新着・ブックマーク）から開く：分類を外し、開いて、そこまで送る
  const openFromSide = (id: string) => {
    const post = posts.find(p => p.id === id)
    if (post && activeCategory !== 'ALL' && post.category !== activeCategory) setActiveCategory('ALL')
    setOpenIds(prev => new Set(prev).add(id))
    setTimeout(() => {
      document.getElementById(`forum-post-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  return (
    <div className="yy-fr">
      <PageHead
        no="21"
        en="forum"
        title="掲示板"
        desc="業務の疑問・事例共有・協力先探し"
        right={
          <>
            <Stat n={posts.length} label="件 投稿" />
            <Stat n={replyTotal} label="件 回答" />
            <Stat n={unanswered} label="件 未回答" />
          </>
        }
      />

      <CategoryButtons
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        counts={counts}
        total={posts.length}
        uid={uid}
        showForm={showForm}
        setShowForm={setShowForm}
        sortMode={sortMode}
        setSortMode={setSortMode}
      />

      <div className="yy-newspage">
        <div className="yy-newspage__main">
          {/* 投稿フォーム（トグル表示） */}
          {uid && showForm && (
            <PostForm
              key={draft ? draft.title : 'blank'}
              categories={CATEGORIES}
              defaultCategory={draft?.category ?? (activeCategory === 'ALL' ? CATEGORIES[0] : activeCategory)}
              initialTitle={draft?.title}
              initialContent={draft?.content}
              onSubmit={(data) => { addPost(data); setShowForm(false); setDraft(null) }}
            />
          )}

          <PostList
            filtered={filtered}
            loadError={loadError}
            openIds={openIds}
            onToggle={toggleOpen}
            allOpen={allOpen}
            setAllOpen={(v) => { setAllOpen(v); if (!v) setOpenIds(new Set()) }}
            uid={uid}
            isAdmin={isAdmin}
            toggleBookmark={toggleBookmark}
            handleDeletePost={handleDeletePost}
            handleDeleteReply={handleDeleteReply}
            setRawPosts={setRawPosts}
          />

          {/* 投稿がまだ少ないあいだの「質問のきっかけ」 */}
          {rawPosts.length < 10 && (
            <section className="yy-fr-starters">
              <SecHead no="—" title="質問のきっかけ" right="押すと書き出しが入ったフォームが開きます" />
              <ul>
                {STARTERS.map((st) => (
                  <li key={st.title}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!uid) { setStarterNote('質問するには会員登録(無料)・ログインが必要です。左下の「ログイン」からどうぞ。'); return }
                        setDraft(st)
                        setShowForm(true)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                    >
                      <span className="yy-fr-starters__cat">{st.category}</span>
                      <span className="yy-fr-starters__t">{st.title}</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  </li>
                ))}
              </ul>
              {starterNote && <p className="yy-home__empty">{starterNote}</p>}
            </section>
          )}
        </div>

        <aside className="yy-newspage__side">
          <section>
            <SecHead no="II" title="カテゴリ別の件数" right={`${CATEGORIES.length} 分類`} />
            <ol className="yy-home__toc yy-fr-count">
              {CATEGORIES.map(cat => (
                <li key={cat}>
                  <button
                    type="button"
                    className={`yy-srcrow yy-srcrow--btn${activeCategory === cat ? ' is-on' : ''}`}
                    aria-pressed={activeCategory === cat}
                    onClick={() => setActiveCategory(activeCategory === cat ? 'ALL' : cat)}
                  >
                    <span className="yy-home__toct">{cat}</span>
                    <span className="yy-leader" />
                    <span className={`yy-serif${counts[cat] ? '' : ' yy-fr-zero'}`}>{counts[cat] || 0}</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <SecHead no="III" title="新着" />
            {recent.length === 0 ? (
              <p className="yy-home__empty">投稿はまだありません。</p>
            ) : (
              <ul className="yy-home__news">
                {recent.map(p => (
                  <li key={`nw-${p.id}`}>
                    <span className="yy-home__meta"><span>{lastTouched(p) ? dotDateTime(lastTouched(p)).slice(0, 10) : '—'}</span><span>{p.category}</span><span>返信 {(p.replies || []).length}</span></span>
                    <button type="button" className="yy-fr-sidelink" onClick={() => openFromSide(p.id)} title={p.title}>{p.title}</button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <SecHead no="IV" title="投稿のきまり" />
            <p className="yy-fr-rulelead">
              業務の疑問や事例共有、協力先探しなどに使えるコミュニティスペースです。気になるトピックはカテゴリで絞り込み、必要に応じてブックマークしてください。
            </p>
            <ol className="yy-fr-rules">
              <li><span className="yy-serif">1</span>閲覧は誰でもできます。質問・回答の投稿はログインが必要です。</li>
              <li><span className="yy-serif">2</span>意見の対立があっても、暴力的な言葉遣いや、相手を威圧・攻撃する書き込みはお断りします。互いの立場や経験を尊重してください。</li>
              <li><span className="yy-serif">3</span>悪口・不適切な表現を含む投稿は送信できません。</li>
              <li><span className="yy-serif">4</span>不適切な投稿は「通報」で管理者に知らせてください（理由を選んで送信）。</li>
              <li><span className="yy-serif">5</span>自分の投稿・回答はいつでも削除できます。</li>
              <li><span className="yy-serif">6</span>ブックマークには会員登録（無料）が必要です。</li>
            </ol>
          </section>

          <section>
            <SecHead no="V" title="ブックマーク" right={`${bookmarkedList.length} 件`} />
            {bookmarkedList.length === 0 ? (
              <p className="yy-home__empty">ブックマークはまだありません。</p>
            ) : (
              <ul className="yy-home__news">
                {bookmarkedList.map(b => (
                  <li key={`bm-${b.id}`}>
                    <span className="yy-home__meta">
                      <span>{b.author}・{dotDate(b.date)}</span>
                      <button type="button" className="yy-linkbtn" onClick={() => toggleBookmark(b.id)}>解除</button>
                    </span>
                    <button type="button" className="yy-fr-sidelink" onClick={() => openFromSide(b.id)} title={b.title}>{b.title}</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

function PostForm({ onSubmit, categories, defaultCategory, initialTitle, initialContent }: { onSubmit: (data: { title: string; author: string; content: string; category: string }) => void; categories: string[]; defaultCategory: string; initialTitle?: string; initialContent?: string }) {
  const [title, setTitle] = useState(initialTitle ?? '')
  const [author, setAuthor] = useState('')
  const [content, setContent] = useState(initialContent ?? '')
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
    <section>
      <SecHead no="—" title="質問する" right="投稿はすぐに公開されます" />
      <form onSubmit={submit} className="yy-fr-form">
        <div className="yy-fr-formrow">
          <div className="yy-fr-field yy-fr-field--grow">
            <label htmlFor="forum-title" className="yy-label">タイトル</label>
            <input id="forum-title" name="title" className="yy-fr-input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="質問の要点を簡潔に" />
          </div>
          <div className="yy-fr-field yy-fr-field--cat">
            <label htmlFor="forum-category-select" className="yy-label">カテゴリー</label>
            <select id="forum-category-select" name="category" className="yy-fr-input" value={category} onChange={e=>setCategory(e.target.value)}>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="yy-fr-field yy-fr-field--name">
            <label htmlFor="forum-author" className="yy-label">質問者</label>
            <input id="forum-author" name="author" className="yy-fr-input" value={author} onChange={e=>setAuthor(e.target.value)} placeholder="お名前（ニックネーム可）" />
          </div>
        </div>
        <div className="yy-fr-field">
          <label htmlFor="forum-content" className="yy-label">質問内容</label>
          <textarea id="forum-content" name="content" className="yy-fr-input yy-fr-textarea" value={content} onChange={e=>setContent(e.target.value)} placeholder="詳細を記載してください" />
        </div>
        <div className="yy-fr-formfoot">
          {message && <span className={`yy-fr-msg${message.includes('投稿しました') ? ' is-ok' : ' is-ng'}`}>{message}</span>}
          <button type="submit" className="yy-pill">投稿する</button>
        </div>
      </form>
    </section>
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
    <form onSubmit={submit} className="yy-fr-replyform">
      <div className="yy-fr-replyrow">
        <input className="yy-fr-input yy-fr-input--name" placeholder="お名前（任意）" value={author} onChange={e=>setAuthor(e.target.value)} aria-label="お名前" />
        <input className="yy-fr-input yy-fr-input--grow" placeholder="回答を書く" value={content} onChange={e=>setContent(e.target.value)} aria-label="回答" />
        <button type="submit" className="yy-btn">回答する</button>
      </div>
      {msg && <div className={`yy-fr-msg${msg.includes('失敗') || msg.includes('未入力') || msg.includes('不適切') ? ' is-ng' : ' is-ok'}`}>{msg}</div>}
    </form>
  )
}
