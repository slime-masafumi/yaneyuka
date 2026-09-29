'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FiStar, FiTrash2, FiExternalLink, FiSettings, FiGrid, FiList, FiSearch, FiPlus, FiX, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebaseClient';
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import ToolHeader, { type ToolFeature } from '../ToolHeader';
import MakerBox from './makerBox/MakerBox';
import LinkThumb from './bookmark/LinkThumb';
import { normalizeUrl, canonicalUrl, hostLabel, looksLikeUrl } from './bookmark/url';
import { checkLinks, AUTO_CHECK_LIMIT, RECHECK_MS, type LinkCheckResult, type LinkState } from './bookmark/linkCheck';
import { useMakerBoxUpdates } from './bookmark/useMakerBoxUpdates';

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
  /** ページの og:image（URL を入れたときに自動で取る） */
  image?: string;
  /** リンク確認の結果。確かめるたびに同じドキュメントへ書く */
  linkStatus?: LinkState;
  linkCheckedAt?: number;
  linkFinalUrl?: string;
  linkError?: string;
}

/**
 * 新規は「下書き」にしてから追加する。
 * 以前は「＋新規」を押した瞬間に空のドキュメントを作っていたため、
 * 重複に気づいても手遅れで、「新しいブックマーク」という空の行も溜まっていた。
 */
const DRAFT_ID = '__draft__';
/** 以前の新規作成で入っていた仮のタイトル。これは自動取得で上書きしてよい */
const LEGACY_DEFAULT_TITLE = '新しいブックマーク';

const ymd = (ms?: number) => {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

/** 小さな等幅のラベル（番号・日付・状態） */
const MONO = 'yy-mono text-[10px] tracking-[0.12em] uppercase';

/** 切り替え・絞り込み。選択中は墨の文字と差し色の下線（塗りのボタンにしない） */
const segClass = (on: boolean) =>
  `px-1.5 py-0.5 text-[11px] whitespace-nowrap border-b ${on ? 'border-[#52AA96] text-[#141414] font-bold' : 'border-transparent text-gray-500 hover:text-[#141414]'}`;

/** リンク確認の結果を、行・カードの端に小さく出す。生きているものは何も出さない */
function LinkMark({ b }: { b: Pick<Bookmark, 'linkStatus' | 'linkCheckedAt' | 'linkError' | 'linkFinalUrl'> }) {
  if (b.linkStatus === 'broken') {
    return (
      <span className={`${MONO} text-red-700`} title={`${b.linkError || 'ページが見つかりません'}（${ymd(b.linkCheckedAt)} 確認）`}>
        リンク切れ
      </span>
    );
  }
  if (b.linkStatus === 'redirect') {
    return (
      <span className={`${MONO} text-gray-500`} title={`転送先: ${b.linkFinalUrl || ''}（${ymd(b.linkCheckedAt)} 確認）`}>
        移転
      </span>
    );
  }
  return null;
}

const BookmarkTool: React.FC = () => {
  const { currentUser, isLoggedIn } = useAuth();

  // --- モード管理 ---
  const [isEditMode, setIsEditMode] = useState(false); // デフォルトは閲覧モード
  // メーカー資料箱（1 メーカー = 1 カード）。ブックマークとは別の保存先（users/{uid}/makerBox）
  const [boxMode, setBoxMode] = useState(false);
  const [boxUpdatesOnly, setBoxUpdatesOnly] = useState(false);
  const [teamRequest, setTeamRequest] = useState(0);
  // 未ログインで押したときなどの、1 行の説明
  const [notice, setNotice] = useState('');

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [currentBookmark, setCurrentBookmark] = useState<Bookmark | null>(null);

  // 入力フォーム用ステート
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [bookmarkUrl, setBookmarkUrl] = useState('');
  const [bookmarkDescription, setBookmarkDescription] = useState('');
  const [bookmarkCategory, setBookmarkCategory] = useState('');
  const [bookmarkTags, setBookmarkTags] = useState('');
  const [bookmarkImage, setBookmarkImage] = useState('');

  // URL からタイトル等を取りに行っている最中か
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [metaMessage, setMetaMessage] = useState('');
  // リンク確認の進み具合（null＝確認していない）
  const [checking, setChecking] = useState<{ done: number; total: number } | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // フィルタリング用ステート
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [brokenOnly, setBrokenOnly] = useState(false);
  const [dupOnly, setDupOnly] = useState(false);
  const [quickUrl, setQuickUrl] = useState('');

  const [saveStatus, setSaveStatus] = useState('');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isComposingRef = useRef<boolean>(false);
  const isEditingRef = useRef<boolean>(false);
  // onSnapshot は [currentUser] で1度だけ購読するため、
  // ハンドラ内で currentBookmark を直接読むと購読時点の値（null）で固定される。
  const currentBookmarkRef = useRef<Bookmark | null>(null);
  // 自動取得が読む「今の入力」。非同期の応答が返ったときに、打ち直された値を上書きしないため
  const formRef = useRef({ title: '', description: '' });
  // URL 欄を人が触ったか（選び直しただけで取りに行かない）
  const urlDirtyRef = useRef(false);
  // 最後に自動で入れたタイトル・説明。これと同じなら、URL を貼り直したときに入れ替えてよい
  const autoTitleRef = useRef('');
  const autoDescRef = useRef('');
  // 古い応答を捨てるための番号
  const metaReqRef = useRef(0);
  // 下書きの URL を取りに行ったときの生死（追加するときに一緒に書く）
  const pendingCheckRef = useRef<LinkCheckResult | null>(null);
  const bookmarksRef = useRef<Bookmark[]>([]);
  const autoCheckedUidRef = useRef<string | null>(null);
  const checkingRef = useRef(false);
  const unmountedRef = useRef(false);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const dupRef = useRef<HTMLDivElement>(null);

  const isDraft = currentBookmark?.id === DRAFT_ID;
  const makerUpdates = useMakerBoxUpdates(currentUser?.uid);

  useEffect(() => {
    currentBookmarkRef.current = currentBookmark;
  }, [currentBookmark]);
  useEffect(() => {
    formRef.current = { title: bookmarkTitle, description: bookmarkDescription };
  }, [bookmarkTitle, bookmarkDescription]);
  useEffect(() => {
    bookmarksRef.current = bookmarks;
  }, [bookmarks]);
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  // ベルの通知（カタログの更新）から来たときは、資料箱の「カタログ更新」を開く
  useEffect(() => {
    try {
      const box = new URLSearchParams(window.location.search).get('box');
      if (box) {
        setBoxMode(true);
        if (box === 'updates') setBoxUpdatesOnly(true);
      }
    } catch {
      /* 読めなければ普段どおり */
    }
  }, []);

  // Firestore購読
  useEffect(() => {
    setLoaded(false);
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
          image: data.image || '',
          linkStatus: data.linkStatus || undefined,
          linkCheckedAt: typeof data.linkCheckedAt === 'number' ? data.linkCheckedAt : undefined,
          linkFinalUrl: data.linkFinalUrl || '',
          linkError: data.linkError || '',
        };
      });
      setBookmarks(list);
      setLoaded(true);
      try {
        localStorage.setItem(
          `generalBookmarks:${currentUser.uid}`,
          JSON.stringify(list.map((b) => ({ ...b, createdAt: b.createdAt.getTime(), updatedAt: b.updatedAt.getTime() })))
        );
      } catch {}

      // 選択状態の復元（下書きは Firestore に無いので、そのまま）
      const active = currentBookmarkRef.current;
      if (active && active.id !== DRAFT_ID) {
        const updated = list.find((b) => b.id === active.id);
        if (updated) setCurrentBookmark(updated);
      }
    });
    return () => unsub();
  }, [currentUser]);

  // --- 重複（utm_* や末尾の / の違いだけの、同じページ） ---
  const canonById = useMemo(() => new Map(bookmarks.map((b) => [b.id, canonicalUrl(b.url)])), [bookmarks]);
  const dupIds = useMemo(() => {
    const groups = new Map<string, string[]>();
    canonById.forEach((c, id) => {
      if (!c) return;
      groups.set(c, [...(groups.get(c) ?? []), id]);
    });
    const out = new Set<string>();
    groups.forEach((ids) => ids.length > 1 && ids.forEach((id) => out.add(id)));
    return out;
  }, [canonById]);
  const brokenCount = useMemo(() => bookmarks.filter((b) => b.linkStatus === 'broken').length, [bookmarks]);

  const currentCanon = canonicalUrl(bookmarkUrl);
  const dupOf =
    currentBookmark && currentCanon ? bookmarks.find((b) => b.id !== currentBookmark.id && canonById.get(b.id) === currentCanon) : undefined;

  // フィルタリングロジック
  const filteredBookmarks = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const list = bookmarks.filter((bookmark) => {
      const matchesSearch =
        !term ||
        bookmark.title.toLowerCase().includes(term) ||
        bookmark.url.toLowerCase().includes(term) ||
        (bookmark.description && bookmark.description.toLowerCase().includes(term));
      const matchesCategory = !categoryFilter || bookmark.category === categoryFilter;
      const matchesTag = !tagFilter || bookmark.tags.some((tag) => tag === tagFilter);
      const matchesBroken = !brokenOnly || bookmark.linkStatus === 'broken';
      const matchesDup = !dupOnly || dupIds.has(bookmark.id);
      return matchesSearch && matchesCategory && matchesTag && matchesBroken && matchesDup;
    });
    // 重複だけを見るときは、同じページ同士を隣に並べる
    if (dupOnly) list.sort((a, b) => (canonById.get(a.id) ?? '').localeCompare(canonById.get(b.id) ?? ''));
    return list;
  }, [bookmarks, searchTerm, categoryFilter, tagFilter, brokenOnly, dupOnly, dupIds, canonById]);

  const allCategories = Array.from(new Set(bookmarks.map((b) => b.category).filter(Boolean))).sort();
  const allTags = Array.from(new Set(bookmarks.flatMap((b) => b.tags).filter(Boolean))).sort();

  /** フォームに読み込む（確認なし） */
  const loadIntoForm = (bookmark: Bookmark | null) => {
    currentBookmarkRef.current = bookmark;
    setCurrentBookmark(bookmark);
    setBookmarkTitle(bookmark?.title ?? '');
    setBookmarkUrl(bookmark?.url ?? '');
    setBookmarkDescription(bookmark?.description ?? '');
    setBookmarkCategory(bookmark?.category ?? '');
    setBookmarkTags(bookmark ? bookmark.tags.join(', ') : '');
    setBookmarkImage(bookmark?.image ?? '');
    formRef.current = { title: bookmark?.title ?? '', description: bookmark?.description ?? '' };
    urlDirtyRef.current = false;
    autoTitleRef.current = '';
    autoDescRef.current = '';
    pendingCheckRef.current = null;
    metaReqRef.current++; // 取りに行っている途中の応答は捨てる
    setIsFetchingMeta(false);
    setMetaMessage('');
    setSaveStatus('');
  };

  // 編集用：ブックマーク選択
  const selectBookmark = (bookmark: Bookmark) => {
    const cur = currentBookmarkRef.current;
    if (cur?.id === DRAFT_ID && bookmark.id !== DRAFT_ID && bookmarkUrl.trim() && !confirm('追加していない新規ブックマークを破棄します。よろしいですか？')) return;
    loadIntoForm(bookmark);
  };

  /** 確かめた結果を画面と Firestore の両方に書く（書けなくても画面は進める。再試行しない） */
  const persistCheck = useCallback(
    async (id: string, result: LinkCheckResult) => {
      setBookmarks((prev) => prev.map((b) => (b.id === id ? { ...b, ...result } : b)));
      setCurrentBookmark((prev) => (prev && prev.id === id ? { ...prev, ...result } : prev));
      if (!currentUser || id === DRAFT_ID) return;
      try {
        await updateDoc(doc(db, 'users', currentUser.uid, 'bookmarks', id), { ...result });
      } catch {
        /* 消された・オフライン。次に開いたときにまた確かめる */
      }
    },
    [currentUser],
  );

  /**
   * URL からタイトル・説明・サムネを取ってきて、空欄だけ埋める。
   *
   * これまでは「URLからタイトルを取得」を押さないと取りに行かず、押し忘れると
   * URL だけのブックマークになっていた。URL を貼る・打ち終えると自動で取りに行く。
   * 既に書いてあるタイトルは上書きしない（自分で付けた名前のほうが後から探しやすいので）。
   * ただし前回自動で入れたタイトルは、URL を貼り直したら入れ替える。
   */
  const fetchLinkMeta = useCallback(
    async (rawUrl: string, manual: boolean) => {
      const url = normalizeUrl(rawUrl);
      if (!url) {
        if (manual) setMetaMessage('先に URL を入力してください');
        return;
      }
      urlDirtyRef.current = false;
      const req = ++metaReqRef.current;
      const targetId = currentBookmarkRef.current?.id;
      setIsFetchingMeta(true);
      setMetaMessage('');
      try {
        const res = await fetch(`/api/link-preview/?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        // 待っている間に別のブックマークを開いた・URL を打ち直した
        if (req !== metaReqRef.current || currentBookmarkRef.current?.id !== targetId || !targetId) return;

        const state: LinkState = data?.state ?? (data?.alive ? 'ok' : 'unknown');
        const check: LinkCheckResult = {
          linkStatus: state,
          linkCheckedAt: Date.now(),
          linkFinalUrl: state === 'redirect' ? data.finalUrl || '' : '',
          linkError: data?.alive ? '' : data?.error || '',
        };
        pendingCheckRef.current = check;
        if (targetId !== DRAFT_ID) void persistCheck(targetId, check);

        if (!data?.alive) {
          setBookmarkImage('');
          isEditingRef.current = true;
          setMetaMessage(
            state === 'broken'
              ? 'このページは見つかりませんでした（リンク切れの可能性）。タイトルは手で入力してください'
              : `${data?.error || 'ページを読み込めませんでした'}。タイトルは手で入力してください`,
          );
          return;
        }

        const filled: string[] = [];
        const cur = formRef.current;
        const t = cur.title.trim();
        if (data.title && (!t || t === LEGACY_DEFAULT_TITLE || t === autoTitleRef.current)) {
          if (t !== data.title) filled.push('タイトル');
          setBookmarkTitle(data.title);
          autoTitleRef.current = data.title;
        }
        const d = cur.description.trim();
        if (data.description && (!d || d === autoDescRef.current)) {
          if (d !== data.description) filled.push('説明');
          setBookmarkDescription(data.description);
          autoDescRef.current = data.description;
        }
        setBookmarkImage(data.image || '');
        if (data.image) filled.push('サムネ');
        // 既存のブックマークなら、取り込んだ内容を自動保存に乗せる
        isEditingRef.current = true;
        setMetaMessage(
          filled.length
            ? `${filled.join('・')}を取り込みました`
            : manual
              ? '取り込める新しい情報はありませんでした'
              : '',
        );
      } catch {
        if (req === metaReqRef.current) setMetaMessage('ページを読み込めませんでした');
      } finally {
        if (req === metaReqRef.current) setIsFetchingMeta(false);
      }
    },
    [persistCheck],
  );

  // URL を貼る・打ち終えたら（0.7 秒止まったら）自動で取りに行く
  useEffect(() => {
    if (!isEditMode || !currentBookmark || !urlDirtyRef.current) return;
    if (!looksLikeUrl(bookmarkUrl)) return;
    const timer = setTimeout(() => void fetchLinkMeta(bookmarkUrl, false), 700);
    return () => clearTimeout(timer);
  }, [bookmarkUrl, isEditMode, currentBookmark, fetchLinkMeta]);

  /**
   * 登録済みのリンクが生きているか確かめて、結果を各ブックマークに書く。
   * カタログや製品ページの URL は数年で変わるので、溜めるほど死ぬ。
   * 相手のサーバーに一気に投げないよう、少しずつ確かめる。
   */
  const runChecks = useCallback(
    async (items: Bookmark[]) => {
      if (checkingRef.current || items.length === 0) return;
      checkingRef.current = true;
      let done = 0;
      setChecking({ done: 0, total: items.length });
      try {
        await checkLinks(
          items,
          async (item, result) => {
            done += 1;
            if (!unmountedRef.current) setChecking({ done, total: items.length });
            await persistCheck(item.id, result);
          },
          { concurrency: 3, shouldStop: () => unmountedRef.current },
        );
      } finally {
        checkingRef.current = false;
        if (!unmountedRef.current) setChecking(null);
      }
    },
    [persistCheck],
  );

  // 開いたとき、7 日以上確かめていないものを古い順に 20 件まで確かめる
  useEffect(() => {
    if (!currentUser || !loaded) return;
    if (autoCheckedUidRef.current === currentUser.uid) return;
    autoCheckedUidRef.current = currentUser.uid;
    const now = Date.now();
    const stale = bookmarksRef.current
      .filter((b) => b.id !== DRAFT_ID && b.url && (!b.linkCheckedAt || now - b.linkCheckedAt > RECHECK_MS))
      .sort((a, b) => (a.linkCheckedAt ?? 0) - (b.linkCheckedAt ?? 0))
      .slice(0, AUTO_CHECK_LIMIT);
    void runChecks(stale);
  }, [currentUser, loaded, runChecks]);

  const checkAllLinks = () => void runChecks(bookmarks.filter((b) => b.url));

  const requireLogin = (message: string, action: () => void) => {
    if (!isLoggedIn) {
      setNotice(message);
      return;
    }
    setNotice('');
    action();
  };

  // 新規（下書き）。URL を渡されたら、そのまま取りに行く
  const createNewBookmark = (initialUrl = '') =>
    requireLogin('ブックマークを保存するにはログイン（無料の会員登録）が必要です。', () => {
      setBoxMode(false);
      setIsEditMode(true);
      const now = new Date();
      const draft: Bookmark = {
        id: DRAFT_ID,
        title: '',
        url: initialUrl,
        description: '',
        category: categoryFilter || '', // 現在のカテゴリを初期値に
        tags: [],
        createdAt: now,
        updatedAt: now,
        isFavorite: false,
      };
      loadIntoForm(draft);
      if (initialUrl) void fetchLinkMeta(initialUrl, false);
      setTimeout(() => urlInputRef.current?.focus(), 0);
    });

  /** 下書きを追加する。同じページが登録済みなら、force しない限り止めて知らせる */
  const addBookmark = async (force = false) => {
    if (!currentUser || !isDraft) return;
    const url = normalizeUrl(bookmarkUrl);
    if (!url) {
      setSaveStatus('URL を入力してください');
      urlInputRef.current?.focus();
      return;
    }
    if (dupOf && !force) {
      setSaveStatus('同じページが登録済みです');
      dupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const now = Date.now();
    const payload = {
      title: bookmarkTitle.trim() || hostLabel(url) || '無題',
      url,
      description: bookmarkDescription,
      category: bookmarkCategory,
      tags: bookmarkTags.split(',').map((t) => t.trim()).filter(Boolean),
      image: bookmarkImage,
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
      ...(pendingCheckRef.current ?? {}),
    };
    setIsAdding(true);
    try {
      const ref = await addDoc(collection(db, 'users', currentUser.uid, 'bookmarks'), payload as any);
      const added: Bookmark = { ...payload, id: ref.id, createdAt: new Date(now), updatedAt: new Date(now) };
      setBookmarks((prev) => (prev.some((b) => b.id === ref.id) ? prev : [added, ...prev]));
      loadIntoForm(added);
      setSaveStatus('追加しました');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error(error);
      setSaveStatus('追加できませんでした');
    } finally {
      setIsAdding(false);
    }
  };

  // 保存処理（既存のブックマーク）
  const saveBookmark = async (isAutoSave: boolean = false) => {
    if (!currentBookmark || currentBookmark.id === DRAFT_ID) return;
    const now = new Date();
    const updatedBookmark = {
      ...currentBookmark,
      title: bookmarkTitle,
      url: normalizeUrl(bookmarkUrl),
      description: bookmarkDescription,
      category: bookmarkCategory,
      tags: bookmarkTags.split(',').map((t) => t.trim()).filter(Boolean),
      image: bookmarkImage,
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
          image: updatedBookmark.image,
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

  // 削除処理（下書きは捨てるだけ）
  const deleteCurrentBookmark = async () => {
    if (!currentBookmark) return;
    const nextList = bookmarks.filter((b) => b.id !== currentBookmark.id);
    if (currentBookmark.id === DRAFT_ID) {
      loadIntoForm(nextList[0] ?? null);
      return;
    }
    if (!currentUser) return;
    if (!confirm(`「${currentBookmark.title || '無題'}」を削除します。よろしいですか？`)) return;
    const id = currentBookmark.id;
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    loadIntoForm(nextList[0] ?? null);
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'bookmarks', id));
    } catch {}
  };

  // お気に入りトグル
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

  // 転送先に移っているリンクを、転送先の URL に書き換える
  const adoptFinalUrl = () => {
    if (!currentBookmark?.linkFinalUrl) return;
    isEditingRef.current = true;
    setBookmarkUrl(currentBookmark.linkFinalUrl);
    void persistCheck(currentBookmark.id, { linkStatus: 'ok', linkCheckedAt: Date.now(), linkFinalUrl: '', linkError: '' });
  };

  // 自動保存フック（既存のブックマークを編集しているときだけ。下書きは「追加する」まで保存しない）
  useEffect(() => {
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    if (currentBookmark && currentBookmark.id !== DRAFT_ID && !isComposingRef.current && isEditMode) {
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
    // saveBookmark は毎回作り直される関数。入力が変わったときだけ動かす（従来どおり）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookmarkTitle, bookmarkUrl, bookmarkDescription, bookmarkCategory, bookmarkTags, bookmarkImage, currentBookmark, isEditMode]);

  const openLauncher = () => {
    setBoxMode(false);
    setIsEditMode(false);
  };
  const openEditor = () => {
    setBoxMode(false);
    setIsEditMode(true);
  };

  // --- 見出しの「できること」 ---
  const features: ToolFeature[] = [
    {
      label: 'ブックマーク',
      hint: 'よく使う URL をカードで並べて開く',
      onClick: () => {
        openLauncher();
        setBrokenOnly(false);
        setDupOnly(false);
      },
      active: !boxMode && !brokenOnly && !dupOnly && !isDraft,
    },
    {
      label: 'URLを貼って追加',
      hint: 'URL を貼るとタイトル・説明・サムネを自動で取り込みます。登録済みのページなら追加の前に知らせます',
      onClick: () => createNewBookmark(),
      active: !boxMode && isEditMode && isDraft,
    },
    {
      label: dupIds.size ? `重複 ${dupIds.size}` : '重複チェック',
      hint: 'utm_* や末尾の / の違いだけの、同じページのブックマークを並べて出します',
      onClick: () => {
        openEditor();
        setBrokenOnly(false);
        setDupOnly((v) => !v);
      },
      active: !boxMode && dupOnly,
    },
    {
      label: brokenCount ? `リンク切れ ${brokenCount}` : 'リンク切れ確認',
      hint: '開くたびに 7 日以上確かめていないものを自動で確認します（1 回 20 件まで）。押すとリンク切れだけに絞り込みます',
      onClick: () => {
        openEditor();
        setDupOnly(false);
        setBrokenOnly((v) => !v);
      },
      active: !boxMode && brokenOnly,
    },
    {
      label: 'メーカー資料箱',
      login: true,
      hint: '1 メーカー＝1 カードに商品ページ・カタログ・CAD・サンプル・担当者・うちの標準仕様を束ねる',
      onClick: () =>
        requireLogin('メーカー資料箱はログインすると使えます。建材ページの「＋資料箱」で控えたメーカーが 1 社 1 枚のカードで並びます。', () => {
          setBoxMode(true);
          setBoxUpdatesOnly(false);
        }),
      active: boxMode && !boxUpdatesOnly,
    },
    {
      label: 'チームの資料箱',
      login: true,
      hint: 'Teamタスクのボードのメンバーで、事務所の標準仕様として資料箱を共有する',
      onClick: () =>
        requireLogin('チームの資料箱はログインすると使えます。Teamタスクのボードのメンバーで資料箱を共有します。', () => {
          setBoxMode(true);
          setBoxUpdatesOnly(false);
          setTeamRequest((n) => n + 1);
        }),
    },
    ...(makerUpdates.count > 0
      ? [
          {
            label: `カタログ更新 ${makerUpdates.count}`,
            hint: 'yaneyuka 側でカタログ等のリンクが更新されたメーカーのカードだけを出します',
            onClick: () => {
              setBoxMode(true);
              setBoxUpdatesOnly(true);
            },
            active: boxMode && boxUpdatesOnly,
          },
        ]
      : []),
  ];

  // 表示の切り替え（ランチャー / 編集・管理 / 新規）。
  // 帯の右端は縮まないので、狭い画面で置くとタイトルが 1 文字ずつ折れる。
  // sm 以上は帯の右端、スマホは本文の先頭に同じものを出す。
  const viewSwitch = (
    <>
      {checking && (
        <span className={`${MONO} opacity-70`} title="リンクを確かめています">
          Check {checking.done}/{checking.total}
        </span>
      )}
      <button
        type="button"
        onClick={openLauncher}
        className={`inline-flex items-center gap-1 text-[11px] border-b ${!isEditMode ? 'border-[#52AA96]' : 'border-transparent opacity-60 hover:opacity-100'}`}
      >
        <FiGrid className="w-3 h-3" aria-hidden /> ランチャー
      </button>
      <button
        type="button"
        onClick={openEditor}
        className={`inline-flex items-center gap-1 text-[11px] border-b ${isEditMode ? 'border-[#52AA96]' : 'border-transparent opacity-60 hover:opacity-100'}`}
      >
        <FiList className="w-3 h-3" aria-hidden /> 編集・管理
      </button>
      <button type="button" onClick={() => createNewBookmark()} className="inline-flex items-center gap-1 text-[11px] border-b border-transparent hover:border-current">
        <FiPlus className="w-3 h-3" aria-hidden /> 新規
      </button>
    </>
  );
  const headerAside = !boxMode ? <div className="hidden sm:flex items-center gap-3">{viewSwitch}</div> : undefined;

  // 絞り込み中であることを 1 行で出す（見出しから入ったとき、何が起きたか分かるように）
  const activeFilterLine =
    brokenOnly || dupOnly ? (
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
        <span className={`${MONO} text-gray-500`}>Filter</span>
        <span>{brokenOnly ? `リンク切れのみ（${brokenCount}）` : `重複のみ（${dupIds.size}）`}</span>
        <button type="button" className="underline underline-offset-2" onClick={() => { setBrokenOnly(false); setDupOnly(false); }}>
          解除
        </button>
        {brokenOnly && (
          <button type="button" className="underline underline-offset-2" onClick={checkAllLinks} disabled={!!checking}>
            {checking ? `確認中 ${checking.done}/${checking.total}` : 'すべて確かめ直す'}
          </button>
        )}
      </div>
    ) : null;

  const quickAdd = () => {
    const url = quickUrl.trim();
    if (!url) return;
    setQuickUrl('');
    createNewBookmark(url);
  };

  // --- メインレンダリング ---
  return (
    <div className="bg-white flex flex-col h-full lg:h-[calc(100vh-var(--nav-height))]">
      <ToolHeader
        no="05"
        code="BOOKMARK"
        title={boxMode ? 'ブックマーク — メーカー資料箱' : 'ブックマーク'}
        description={
          boxMode
            ? '1メーカー＝1カードに商品ページ・カタログ・CAD・サンプル・担当者・うちの標準仕様を束ねる'
            : 'よく使うURLを保存して開く。URLを貼るとタイトル・説明・サムネを自動で取り込み、重複とリンク切れを知らせる'
        }
        features={features}
        aside={headerAside}
      />
      {notice && (
        <p className="shrink-0 px-4 py-2 border-b border-gray-200 text-[11px] text-gray-600 flex items-start gap-2">
          <span className="flex-1">{notice}</span>
          <button type="button" onClick={() => setNotice('')} className="text-gray-400 hover:text-gray-700" aria-label="閉じる">
            <FiX className="w-3 h-3" />
          </button>
        </p>
      )}

      {/* コンテンツエリア */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {!boxMode && <div className="sm:hidden mb-4 flex flex-wrap items-center gap-3 text-[#141414]">{viewSwitch}</div>}
        {boxMode && (
          <MakerBox bookmarks={bookmarks} updatesOnly={boxUpdatesOnly} onUpdatesOnlyChange={setBoxUpdatesOnly} teamRequest={teamRequest} />
        )}

        {/* =================================================================
            【閲覧モード (ランチャー)】
           ================================================================= */}
        {!boxMode && !isEditMode && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-72">
                <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" aria-hidden />
                <input
                  type="text"
                  placeholder="ブックマークを検索"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-6 pr-2 py-1.5 text-[11px]"
                />
              </div>
              {/* URL を貼るだけで追加の下書きが開き、タイトル等を取りに行く */}
              <form
                className="flex w-full sm:w-auto sm:flex-1 sm:max-w-md gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  quickAdd();
                }}
              >
                <input
                  type="text"
                  value={quickUrl}
                  onChange={(e) => setQuickUrl(e.target.value)}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData('text').trim();
                    if (looksLikeUrl(text)) {
                      e.preventDefault();
                      setQuickUrl('');
                      createNewBookmark(text);
                    }
                  }}
                  placeholder="URL を貼って追加"
                  className="flex-1 min-w-0 px-2 py-1.5 text-[11px]"
                  aria-label="URL を貼って追加"
                />
                <button type="submit" className="yy-btn !py-1" disabled={!quickUrl.trim()}>
                  追加
                </button>
              </form>
            </div>

            {allCategories.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-gray-200">
                <button type="button" onClick={() => setCategoryFilter('')} className={segClass(categoryFilter === '')}>
                  すべて <span className="yy-mono text-[10px]">{bookmarks.length}</span>
                </button>
                {allCategories.map((cat) => (
                  <button key={cat} type="button" onClick={() => setCategoryFilter(cat)} className={segClass(categoryFilter === cat)}>
                    {cat}
                  </button>
                ))}
              </div>
            )}
            {activeFilterLine}

            {filteredBookmarks.length === 0 ? (
              <p className="py-8 text-[11px] text-gray-400">
                {!isLoggedIn ? (
                  'ログインすると、よく使う URL を保存してここから開けます。'
                ) : bookmarks.length === 0 ? (
                  <>
                    まだブックマークがありません。{' '}
                    <button type="button" className="underline underline-offset-2 text-gray-600" onClick={() => createNewBookmark()}>
                      URL を貼って追加
                    </button>
                  </>
                ) : (
                  '条件に合うブックマークはありません。'
                )}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-px bg-gray-200 border border-gray-200">
                {filteredBookmarks.map((bookmark, i) => (
                  <a
                    key={bookmark.id}
                    href={normalizeUrl(bookmark.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex items-start gap-3 bg-white p-3 hover:bg-[#fafaf8] transition-colors min-w-0"
                  >
                    <LinkThumb url={bookmark.url} image={bookmark.image} />
                    <span className="min-w-0 flex-1 pr-5">
                      <span className="block text-[12px] font-bold text-[#141414] leading-snug line-clamp-2 break-all">
                        {bookmark.title || hostLabel(bookmark.url) || '無題'}
                      </span>
                      <span className="mt-1 flex items-center gap-2 min-w-0">
                        <span className={`${MONO} text-gray-400`}>{String(i + 1).padStart(3, '0')}</span>
                        <span className="yy-mono text-[10px] text-gray-400 truncate">{hostLabel(bookmark.url)}</span>
                        <LinkMark b={bookmark} />
                        {bookmark.description && <span className={`${MONO} text-gray-400`}>Note</span>}
                      </span>
                    </span>

                    {/* お気に入り */}
                    {bookmark.isFavorite && <FiStar className="absolute top-2 right-2 w-3 h-3 fill-current text-[#141414] group-hover:opacity-0" aria-label="お気に入り" />}
                    {/* クイック編集（ホバー時。タッチ端末では常に出す） */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        selectBookmark(bookmark);
                        setIsEditMode(true);
                      }}
                      className="absolute top-2 right-2 p-0.5 text-gray-400 hover:text-[#141414] lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100"
                      title="編集する"
                      aria-label="編集する"
                    >
                      <FiSettings className="w-3 h-3" />
                    </button>
                  </a>
                ))}
                <button
                  type="button"
                  onClick={() => createNewBookmark()}
                  className="flex items-center gap-2 bg-white p-3 text-[11px] text-gray-400 hover:text-[#141414] min-h-[64px]"
                >
                  <FiPlus className="w-3 h-3" aria-hidden /> 新規追加
                </button>
              </div>
            )}
          </div>
        )}

        {/* =================================================================
            【編集モード】
           ================================================================= */}
        {!boxMode && isEditMode && (
          <div className="flex flex-col lg:flex-row gap-6 lg:h-full">
            {/* 左：リスト */}
            <div className="lg:w-1/3 xl:w-1/4 min-w-0 flex flex-col lg:border-r lg:border-gray-200 lg:pr-4">
              <div className="mb-3 space-y-2">
                <input
                  type="text"
                  placeholder="検索"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-2 py-1.5 text-[11px]"
                />
                <div className="flex gap-2">
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="flex-1 min-w-0 text-[11px] px-1 py-1.5">
                    <option value="">全カテゴリ</option>
                    {allCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="flex-1 min-w-0 text-[11px] px-1 py-1.5">
                    <option value="">全タグ</option>
                    {allTags.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
                  <button type="button" onClick={() => { setDupOnly(false); setBrokenOnly((v) => !v); }} className={segClass(brokenOnly)}>
                    リンク切れのみ <span className="yy-mono text-[10px]">{brokenCount}</span>
                  </button>
                  <button type="button" onClick={() => { setBrokenOnly(false); setDupOnly((v) => !v); }} className={segClass(dupOnly)}>
                    重複のみ <span className="yy-mono text-[10px]">{dupIds.size}</span>
                  </button>
                  <button
                    type="button"
                    onClick={checkAllLinks}
                    disabled={!!checking || bookmarks.length === 0}
                    className="ml-auto inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-[#141414] disabled:opacity-50"
                    title="すべてのリンクを今すぐ確かめ直す（開いたときは 7 日以上前のものだけを自動で確かめています）"
                  >
                    <FiRefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} aria-hidden />
                    {checking ? `${checking.done}/${checking.total}` : '確かめ直す'}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-72 lg:max-h-none border-t border-gray-200">
                {isDraft && (
                  <div className="py-2 pl-2 border-b border-gray-200 border-l-2 border-l-[#52AA96] bg-[#fafaf8] text-[11px] font-bold">
                    <span className={`${MONO} text-[#52AA96] mr-2`}>New</span>
                    {bookmarkTitle || '新規ブックマーク（未追加）'}
                  </div>
                )}
                {filteredBookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    onClick={() => selectBookmark(bookmark)}
                    className={`py-2 pr-1 border-b border-gray-200 cursor-pointer flex items-start gap-2 border-l-2 pl-2 ${
                      currentBookmark?.id === bookmark.id ? 'border-l-[#52AA96] bg-[#fafaf8]' : 'border-l-transparent hover:bg-gray-50'
                    }`}
                  >
                    <LinkThumb url={bookmark.url} image={bookmark.image} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-[#141414] truncate">{bookmark.title || hostLabel(bookmark.url) || '無題'}</div>
                      <div className="flex items-center gap-2 mt-0.5 min-w-0">
                        {bookmark.category && <span className="text-[10px] text-gray-400 truncate">{bookmark.category}</span>}
                        <LinkMark b={bookmark} />
                        {dupIds.has(bookmark.id) && <span className={`${MONO} text-gray-500`}>重複</span>}
                      </div>
                    </div>
                    <button type="button" onClick={(e) => toggleFavorite(bookmark.id, e)} className="text-gray-400 hover:text-[#141414] p-0.5" aria-label="お気に入り">
                      <FiStar className={`w-3 h-3 ${bookmark.isFavorite ? 'fill-current text-[#141414]' : ''}`} />
                    </button>
                  </div>
                ))}
                {filteredBookmarks.length === 0 && !isDraft && (
                  <p className="py-4 text-[11px] text-gray-400">
                    {brokenOnly ? 'リンク切れは見つかっていません。' : dupOnly ? '重複しているブックマークはありません。' : '該当するブックマークはありません。'}
                  </p>
                )}
              </div>
            </div>

            {/* 右：エディタ */}
            <div className="flex-1 min-w-0">
              {!currentBookmark ? (
                <p className="py-8 text-[11px] text-gray-400">
                  左の一覧から選ぶか、{' '}
                  <button type="button" className="underline underline-offset-2 text-gray-600" onClick={() => createNewBookmark()}>
                    URL を貼って追加
                  </button>
                </p>
              ) : (
                <div className="space-y-4 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className={`${MONO} ${isDraft ? 'text-[#52AA96]' : 'text-gray-400'}`}>{isDraft ? 'New' : 'Edit'}</span>
                    <input
                      type="text"
                      value={bookmarkTitle}
                      onChange={(e) => {
                        isEditingRef.current = true;
                        setBookmarkTitle(e.target.value);
                      }}
                      className="flex-1 min-w-0 text-[12px] font-bold px-2 py-1.5"
                      placeholder={isDraft ? 'タイトル（URL を入れると自動で入ります）' : 'タイトル'}
                    />
                    {bookmarkUrl.trim() && (
                      <a
                        href={normalizeUrl(bookmarkUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-500 hover:text-[#141414]"
                        title="開く"
                        aria-label="開く"
                      >
                        <FiExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={deleteCurrentBookmark}
                      className="p-1.5 text-gray-400 hover:text-red-600"
                      title={isDraft ? '下書きを捨てる' : '削除'}
                      aria-label={isDraft ? '下書きを捨てる' : '削除'}
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="yy-label">URL</label>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <input
                            ref={urlInputRef}
                            type="text"
                            value={bookmarkUrl}
                            onChange={(e) => {
                              isEditingRef.current = true;
                              urlDirtyRef.current = true;
                              pendingCheckRef.current = null;
                              setBookmarkUrl(e.target.value);
                            }}
                            className="w-full text-[12px] px-2 py-1.5"
                            placeholder="https://… を貼るとタイトル・説明・サムネを自動で取り込みます"
                          />
                          <div className="flex flex-wrap items-center gap-2 mt-1 min-h-[16px]">
                            {isFetchingMeta ? (
                              <span className={`${MONO} text-gray-400`}>Fetching…</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void fetchLinkMeta(bookmarkUrl, true)}
                                disabled={!bookmarkUrl.trim()}
                                className="text-[10px] text-gray-500 underline underline-offset-2 hover:text-[#141414] disabled:opacity-40 disabled:no-underline"
                              >
                                もう一度取り込む
                              </button>
                            )}
                            {metaMessage && <span className="text-[10px] text-gray-500">{metaMessage}</span>}
                          </div>
                        </div>
                        <LinkThumb url={bookmarkUrl} image={bookmarkImage} />
                      </div>
                    </div>

                    {/* 重複の警告。追加の前に止める */}
                    {dupOf && (
                      <div ref={dupRef} className="border-l-2 border-[#141414] pl-3 py-1 text-[11px] text-gray-700 space-y-1">
                        <div>
                          <span className={`${MONO} text-gray-500 mr-2`}>Duplicate</span>
                          同じページが登録済みです: 「{dupOf.title || hostLabel(dupOf.url)}」
                          {dupOf.category ? <span className="text-gray-400">（{dupOf.category}）</span> : null}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <button type="button" className="underline underline-offset-2 hover:text-[#141414]" onClick={() => { loadIntoForm(dupOf); }}>
                            {isDraft ? '既存のものを開く（下書きは捨てる）' : 'そちらを開く'}
                          </button>
                          {isDraft && (
                            <button type="button" className="underline underline-offset-2 hover:text-[#141414]" onClick={() => void addBookmark(true)} disabled={isAdding}>
                              このまま追加する
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 確認結果（既存のブックマーク） */}
                    {!isDraft && currentBookmark.linkStatus === 'broken' && (
                      <p className="text-[11px] text-red-700">
                        <span className={`${MONO} mr-2`}>Broken</span>
                        {currentBookmark.linkError || 'ページが見つかりません'}（{ymd(currentBookmark.linkCheckedAt)} 確認）。URL を直すか、削除してください
                      </p>
                    )}
                    {!isDraft && currentBookmark.linkStatus === 'redirect' && currentBookmark.linkFinalUrl && (
                      <p className="text-[11px] text-gray-700 break-all">
                        <span className={`${MONO} text-gray-500 mr-2`}>Moved</span>
                        転送されています: {currentBookmark.linkFinalUrl}{' '}
                        <button type="button" className="underline underline-offset-2 hover:text-[#141414] whitespace-nowrap" onClick={adoptFinalUrl}>
                          URL を転送先に書き換える
                        </button>
                      </p>
                    )}
                    {!isDraft && currentBookmark.linkCheckedAt && currentBookmark.linkStatus !== 'broken' && currentBookmark.linkStatus !== 'redirect' && (
                      <p className={`${MONO} text-gray-400`}>
                        Checked {ymd(currentBookmark.linkCheckedAt)}
                        {currentBookmark.linkStatus === 'unknown' ? ' — 相手が確認を受け付けませんでした' : ''}
                      </p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 min-w-0">
                        <label className="yy-label">カテゴリ</label>
                        <input
                          type="text"
                          value={bookmarkCategory}
                          onChange={(e) => {
                            isEditingRef.current = true;
                            setBookmarkCategory(e.target.value);
                          }}
                          className="w-full text-[12px] px-2 py-1.5"
                          list="category-list"
                        />
                        <datalist id="category-list">
                          {allCategories.map((c) => (
                            <option key={c} value={c} />
                          ))}
                        </datalist>
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="yy-label">タグ</label>
                        <input
                          type="text"
                          value={bookmarkTags}
                          onChange={(e) => {
                            isEditingRef.current = true;
                            setBookmarkTags(e.target.value);
                          }}
                          className="w-full text-[12px] px-2 py-1.5"
                          placeholder="カンマ区切り"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="yy-label">メモ</label>
                      <textarea
                        value={bookmarkDescription}
                        onChange={(e) => {
                          isEditingRef.current = true;
                          setBookmarkDescription(e.target.value);
                        }}
                        className="w-full text-[12px] px-2 py-1.5 h-32 resize-none"
                        placeholder="共有事項があればここに記入（パスワード等の認証情報は保存しないでください）"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center gap-3 pt-3 border-t border-gray-200">
                    <span className={`${MONO} text-gray-500 min-h-[14px]`}>
                      {saveStatus || (isDraft ? '追加するまで保存されません' : '入力は自動で保存されます')}
                    </span>
                    {isDraft ? (
                      <button type="button" onClick={() => void addBookmark(false)} disabled={isAdding} className="yy-btn yy-btn--primary">
                        {isAdding ? '追加中…' : '追加する'}
                      </button>
                    ) : (
                      <button type="button" onClick={() => saveBookmark(false)} className="yy-btn yy-btn--primary">
                        保存する
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookmarkTool;
