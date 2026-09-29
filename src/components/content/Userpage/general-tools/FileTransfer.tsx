'use client';

/**
 * 図面送付（旧「ファイル転送」。id は file-transfer のまま）。
 *
 * 相手先（施主・施工者・協力事務所）へ図面やデータを送るための道具。
 * 「端末間受け渡し」（自分の端末どうし・24時間）と違い、こちらは
 *   - 送付状（図面番号・図面名・版・縮尺・枚数）を付けて送る
 *   - いつ誰に何を送り、相手が開いたかを台帳に残す
 *   - 合言葉・開封メールで受け渡しを確かめる
 * ことが目的。名前が同じ「ファイル」だったので違いが伝わらず、機能を足しても
 * 「何も変わっていない」と見られていた。
 */

import React, { DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, orderBy, query, Timestamp, where, serverTimestamp, setDoc, deleteDoc, increment, updateDoc, deleteField } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject, type UploadTask } from 'firebase/storage';
import { FiUploadCloud, FiTrash2, FiPrinter, FiCopy, FiLink, FiPause, FiPlay, FiX, FiLock, FiMail, FiDownload } from 'react-icons/fi';
import { db, app, auth } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/AuthContext';
import { hashSharePassword } from '@/lib/sharePassword';
import { requestGeneralTool } from '@/lib/generalToolsMenu';
import ToolHeader from '../ToolHeader';
import DrawingListEditor from './transfer/DrawingListEditor';
import { countPdfPages, fromStored, parseDrawingFileName, toStored, totalSheets, type DrawingRow, type StoredDrawing } from './transfer/drawingList';
import { openTransmittal, transmittalNumber, transmittalText, TRANSMITTAL_PURPOSES, type TransmittalData } from './transfer/transmittal';
// JSZipは動的インポートで使用（SSR対応）

const storage = typeof window !== 'undefined' ? getStorage(app) : undefined;

type LimitsConfig = {
  maxUserMonthlyMB: number;
  maxFileMB: number;
  retentionDays: number;
  signedUrlDefaultHours: number;
  signedUrlMaxHours: number;
  perLinkMaxDownloads: number;
  siteMonthlyDownloadGBCap: number;
  uploadsEnabled: boolean;
  sharingEnabled: boolean;
  // 将来の拡張用: premium プランなど
  // premiumMaxFileMB?: number;
  // premiumMaxUserMonthlyMB?: number;
};

type UploadRecord = {
  id: string;
  fileName: string;
  size: number;
  createdAt?: Timestamp;
  expiresAt?: Timestamp;
  path: string;
  downloadUrl?: string;
  shortCode?: string;
  retentionDays?: number;
  /** 送付台帳: 送り先と件名（送るときに入れるか、後からオーナーが書き足す） */
  recipient?: string;
  note?: string;
  /** 送付状: 図面リスト・送付目的・差出人・備考 */
  drawings?: StoredDrawing[];
  purpose?: string;
  sender?: string;
  remarks?: string;
  /** 送付台帳: 相手が開いた記録（/api/share/download が書く。同じ送信元は1時間に1回） */
  downloadCount?: number;
  firstDownloadedAt?: Timestamp;
  lastDownloadedAt?: Timestamp;
  /** 合言葉がかかっているか（ハッシュそのものは画面に持たない） */
  hasPassword?: boolean;
  /** 初めて開かれたらメールで知らせる */
  notifyOnOpen?: boolean;
};

type UsageDoc = {
  uploadedBytes: number;
  downloadedBytes: number;
};

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const formatMB = (mb: number) => (mb >= 1024 ? `${parseFloat((mb / 1024).toFixed(1))}GB` : `${mb}MB`);

function getMonthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * 1ファイルの上限の既定値（config/limits.maxFileMB が読めないとき）。
 * 図面一式・BIM・点群は数百MB〜GB になるので 2GB。実際の上限は config/limits と
 * storage.rules（userUploads は 2GB）とサーバーの /api/upload/guard の 3 か所で決まる。
 */
const MAX_FILE_MB = 2048;
/** 月間アップロードの既定値。/api/upload/guard の DEFAULT_MAX_USER_MONTHLY_MB と揃える */
const MONTHLY_LIMIT_MB = 2048;
/**
 * 複数ファイルを ZIP にまとめるときの合計の上限。ZIP はブラウザのメモリ上で作るので、
 * これを超えると上限判定より先にタブが落ちる。大きいものは 1 本ずつ送ってもらう。
 */
const MAX_ZIP_TOTAL_MB = 500;
const DEFAULT_RETENTION_OPTIONS = [3, 7, 14];
const SENDER_KEY = 'yaneyuka:transmittal-sender';

/** 各段の見出し（連番 + 名前）。線 1 本と小さな等幅で区切る */
const SectionHead: React.FC<{ no: string; title: string; aside?: React.ReactNode }> = ({ no, title, aside }) => (
  <div className="flex items-baseline justify-between gap-2 border-b border-[#3b3b3b] pb-1 mb-3">
    <p className="flex items-baseline gap-2 min-w-0">
      <span className="yy-mono text-[10px] tracking-[0.12em] uppercase text-gray-500">{no}</span>
      <span className="text-[12px] font-bold text-[#141414]">{title}</span>
    </p>
    {aside}
  </div>
);

const monoLabel = 'yy-mono text-[10px] tracking-[0.12em] uppercase text-gray-500';

type FeatureKey = 'send' | 'large' | 'ledger' | 'password' | 'notify' | 'csv';

const FileTransferTool: React.FC = () => {
  const { currentUser, isLoggedIn } = useAuth();
  const uid = currentUser?.uid ?? null;

  const [limits, setLimits] = useState<LimitsConfig | null>(null);
  const [limitsError, setLimitsError] = useState<string | null>(null);

  const [userUsage, setUserUsage] = useState<UsageDoc | null>(null);
  const [siteUsage, setSiteUsage] = useState<UsageDoc | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);

  const [files, setFiles] = useState<UploadRecord[]>([]);
  const [filesError, setFilesError] = useState<string | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadBytes, setUploadBytes] = useState<{ done: number; total: number } | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const uploadTaskRef = useRef<UploadTask | null>(null);
  const monthKey = useMemo(() => getMonthKey(), []);
  const [selectedRetentionDays, setSelectedRetentionDays] = useState<number | null>(null);
  const [retentionInitApplied, setRetentionInitApplied] = useState(false);
  const [origin, setOrigin] = useState<string>('');
  const [deleteInFlight, setDeleteInFlight] = useState<string | null>(null);
  const generatingShortCodes = useRef<Set<string>>(new Set());

  // --- 送付状の下書き（送る前に書く） ---
  const [drawings, setDrawings] = useState<DrawingRow[]>([]);
  const [draftRecipient, setDraftRecipient] = useState('');
  const [draftSubject, setDraftSubject] = useState('');
  const [draftPurpose, setDraftPurpose] = useState<string>('ご確認');
  const [draftRemarks, setDraftRemarks] = useState('');
  const [draftPassword, setDraftPassword] = useState('');
  const [draftNotify, setDraftNotify] = useState(false);
  const [sender, setSender] = useState('');
  const [lastSentId, setLastSentId] = useState<string | null>(null);

  // 「できること」の案内（ログインが要る機能を未ログインで押したときなど）
  const [notice, setNotice] = useState<string | null>(null);
  const [activeFeature, setActiveFeature] = useState<FeatureKey | null>(null);
  const sendRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const ledgerRef = useRef<HTMLDivElement>(null);

  // 差出人は端末ごとに覚えておく（毎回同じなので）
  useEffect(() => {
    try {
      setSender(window.localStorage.getItem(SENDER_KEY) ?? '');
    } catch {
      /* 保存できない環境では毎回入れてもらう */
    }
  }, []);
  const saveSender = (v: string) => {
    setSender(v);
    try {
      window.localStorage.setItem(SENDER_KEY, v);
    } catch {
      /* 同上 */
    }
  };

  // Fetch config limits
  useEffect(() => {
    let mounted = true;
    const fetchLimits = async () => {
      try {
        const snap = await getDoc(doc(db, 'config', 'limits'));
        if (!snap.exists()) throw new Error('設定ドキュメントが存在しません');
        const data = snap.data() as LimitsConfig;
        if (mounted) setLimits(data);
      } catch (error) {
        console.error('config/limits 取得に失敗しました', error);
        if (mounted) setLimitsError('設定情報を取得できませんでした。時間をおいて再度お試しください。');
      }
    };
    fetchLimits();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.location) {
        setOrigin(window.location.origin);
      }
    } catch (error) {
      console.error('Origin設定エラー:', error);
      setOrigin('');
    }
  }, []);

  // Fetch usage
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    const fetchUsage = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'usage', `${uid}_${monthKey}`));
        if (!cancelled && userDoc.exists()) {
          const data = userDoc.data() as UsageDoc;
          setUserUsage({
            uploadedBytes: data.uploadedBytes ?? 0,
            downloadedBytes: data.downloadedBytes ?? 0,
          });
        }
        const siteDoc = await getDoc(doc(db, 'usage', `site_${monthKey}`));
        if (!cancelled && siteDoc.exists()) {
          const data = siteDoc.data() as UsageDoc;
          setSiteUsage({
            uploadedBytes: data.uploadedBytes ?? 0,
            downloadedBytes: data.downloadedBytes ?? 0,
          });
        }
      } catch (error) {
        console.error('usage 取得に失敗しました', error);
        if (!cancelled) setUsageError('使用量情報を取得できませんでした。');
      }
    };
    fetchUsage();
    return () => {
      cancelled = true;
    };
  }, [uid, monthKey]);

  // Subscribe uploads
  useEffect(() => {
    if (!uid) {
      setFiles([]);
      return;
    }
    const q = query(
      collection(db, 'uploads'),
      where('owner', '==', uid),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, {
      next: snap => {
        const list: UploadRecord[] = [];
        const now = Date.now();
        const oneWeekInMs = 7 * 24 * 60 * 60 * 1000; // 1週間（ミリ秒）

        snap.forEach(docSnap => {
          const data = docSnap.data();
          const expiresAt = data.expiresAt;

          // 保存期間が過ぎてから1週間以上経過したファイルは除外
          if (expiresAt) {
            const expiresAtMs = expiresAt.toDate().getTime();
            const deletionDeadline = expiresAtMs + oneWeekInMs; // 保存期間 + 1週間
            if (now > deletionDeadline) {
              return; // このファイルはスキップ
            }
          }

          list.push({
            id: docSnap.id,
            fileName: data.fileName,
            size: data.size,
            createdAt: data.createdAt,
            expiresAt: data.expiresAt,
            path: data.path,
            downloadUrl: data.downloadUrl,
            shortCode: data.shortCode,
            retentionDays: data.retentionDays,
            recipient: data.recipient,
            note: data.note,
            drawings: Array.isArray(data.drawings) ? toStored(fromStored(data.drawings)) : undefined,
            purpose: typeof data.purpose === 'string' ? data.purpose : undefined,
            sender: typeof data.sender === 'string' ? data.sender : undefined,
            remarks: typeof data.remarks === 'string' ? data.remarks : undefined,
            downloadCount: data.downloadCount,
            firstDownloadedAt: data.firstDownloadedAt,
            lastDownloadedAt: data.lastDownloadedAt,
            hasPassword: typeof data.passwordHash === 'string',
            notifyOnOpen: data.notifyOnOpen === true,
          });
        });
        setFiles(list);
        setFilesError(null);
      },
      error: err => {
        console.error('uploads購読に失敗', err);
        setFilesError('送付台帳を読み込めませんでした。');
      },
    });
    return () => unsub();
  }, [uid]);

  const currentUsageMB = userUsage ? userUsage.uploadedBytes / (1024 * 1024) : 0;
  const effectiveMonthlyLimitMB = limits?.maxUserMonthlyMB ?? MONTHLY_LIMIT_MB;
  const effectiveMaxFileMB = limits?.maxFileMB ?? MAX_FILE_MB;

  const retentionOptions = useMemo(() => {
    const maxDays = limits?.retentionDays ?? Math.max(...DEFAULT_RETENTION_OPTIONS);
    const base = DEFAULT_RETENTION_OPTIONS.filter(day => day <= maxDays);
    return base.length > 0 ? base : [maxDays];
  }, [limits]);

  useEffect(() => {
    if (!retentionInitApplied && retentionOptions.length > 0) {
      setSelectedRetentionDays(retentionOptions[0]);
      setRetentionInitApplied(true);
    }
  }, [retentionInitApplied, retentionOptions]);

  const buildShortLink = useCallback(
    (shortCode?: string) => {
      if (!shortCode) return null;
      if (origin) {
        return `${origin}/share/${shortCode}`;
      }
      return `/share/${shortCode}`;
    },
    [origin],
  );

  // --- 送付台帳 ---
  const fmtTime = (t?: Timestamp) => (t ? t.toDate().toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
  const saveLedgerField = async (id: string, field: 'recipient' | 'note' | 'purpose', value: string) => {
    try {
      await updateDoc(doc(db, 'uploads', id), { [field]: value.trim() });
    } catch (e) {
      console.error('送付台帳の保存に失敗', e);
    }
  };
  // 台帳の図面リストを後から直す
  const [editing, setEditing] = useState<{ id: string; rows: DrawingRow[] } | null>(null);
  const saveDrawings = async () => {
    if (!editing) return;
    try {
      await updateDoc(doc(db, 'uploads', editing.id), { drawings: toStored(editing.rows) });
      setEditing(null);
    } catch (e) {
      console.error('図面リストの保存に失敗', e);
      setNotice('図面リストを保存できませんでした。時間をおいてお試しください。');
    }
  };

  // --- 合言葉・開封のお知らせ ---
  const [pwFor, setPwFor] = useState<string | null>(null);
  const [pwText, setPwText] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const setFilePassword = async (file: UploadRecord, pw: string | null) => {
    setPwMsg('');
    try {
      if (pw) {
        // 古い形式のリンク（共有ドキュメントに実URLが載っている）は合言葉を掛けても素通りできるので断る
        if (file.shortCode) {
          const share = await getDoc(doc(db, 'shareLinks', file.shortCode));
          if (share.exists() && typeof share.data().downloadUrl === 'string') {
            setPwMsg('このリンクは古い形式のため合言葉を掛けられません。ファイルを上げ直してください。');
            return;
          }
        }
        await updateDoc(doc(db, 'uploads', file.id), { ...(await hashSharePassword(pw)) });
        setPwMsg('合言葉を掛けました。相手には別の手段（電話・別のメール）で伝えてください。');
      } else {
        await updateDoc(doc(db, 'uploads', file.id), { passwordHash: deleteField(), passwordSalt: deleteField(), passwordIter: deleteField() });
        setPwMsg('合言葉を外しました');
      }
      setPwText('');
      setPwFor(null);
    } catch (e) {
      console.error('合言葉の設定に失敗', e);
      setPwMsg('設定できませんでした');
    }
  };
  const setNotify = async (file: UploadRecord, on: boolean) => {
    try {
      await updateDoc(doc(db, 'uploads', file.id), { notifyOnOpen: on });
    } catch (e) {
      console.error('お知らせの設定に失敗', e);
    }
  };

  const toTransmittal = (file: UploadRecord): TransmittalData => {
    const created = file.createdAt?.toDate() ?? new Date();
    return {
      number: transmittalNumber(created, file.shortCode),
      date: created,
      recipient: file.recipient ?? '',
      sender: file.sender || sender,
      subject: file.note ?? '',
      purpose: file.purpose ?? '',
      drawings: file.drawings ?? [],
      link: buildShortLink(file.shortCode),
      expiresAt: file.expiresAt?.toDate() ?? null,
      hasPassword: !!file.hasPassword,
      fileName: file.fileName,
      fileSize: formatBytes(file.size),
      remarks: file.remarks,
    };
  };
  const printTransmittal = (file: UploadRecord) => {
    if (!openTransmittal(toTransmittal(file))) {
      setNotice('別窓を開けませんでした。ブラウザのポップアップを許可してください。');
    }
  };

  const downloadLedgerCsv = () => {
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['送付状番号', '送付日時', '送付先', '件名', '送付目的', 'ファイル名', 'サイズ', '図面リスト', '合計枚数', '有効期限', '開封回数', '初回開封', '最終開封', 'リンク']];
    for (const f of files) {
      const list = f.drawings ?? [];
      rows.push([
        transmittalNumber(f.createdAt?.toDate() ?? new Date(), f.shortCode),
        f.createdAt ? f.createdAt.toDate().toLocaleString('ja-JP') : '',
        f.recipient ?? '',
        f.note ?? '',
        f.purpose ?? '',
        f.fileName,
        formatBytes(f.size),
        list.map((d) => [d.no, d.title, d.rev, d.scale, d.sheets ? `${d.sheets}枚` : ''].filter(Boolean).join(' ')).join(' / '),
        list.length ? String(totalSheets(list)) : '',
        f.expiresAt ? f.expiresAt.toDate().toLocaleString('ja-JP') : '',
        String(f.downloadCount ?? 0),
        f.firstDownloadedAt ? f.firstDownloadedAt.toDate().toLocaleString('ja-JP') : '',
        f.lastDownloadedAt ? f.lastDownloadedAt.toDate().toLocaleString('ja-JP') : '',
        buildShortLink(f.shortCode) ?? '',
      ]);
    }
    const blob = new Blob(['﻿' + rows.map((r) => r.map(cell).join(',')).join('\n') + '\n'], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yaneyuka_送付台帳_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // 共有コードはファイルへの唯一のアクセス制御なので、
  // 予測可能な Math.random ではなく暗号論的乱数で作り、長さも8文字に伸ばす
  // （32^8 ≈ 1.1×10^12 通り。6文字だと約10億通りで総当たりの射程に入る）。
  // 既存の6文字コードのリンクはそのまま使える。
  const SHORT_CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // 紛らわしい 0/O/1/I を除いた32文字
  const SHORT_CODE_LENGTH = 8;

  const generateShortCode = useCallback(async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const bytes = new Uint8Array(SHORT_CODE_LENGTH);
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
      } else {
        for (let i = 0; i < SHORT_CODE_LENGTH; i += 1) bytes[i] = Math.floor(Math.random() * 256);
      }
      let code = '';
      for (let i = 0; i < SHORT_CODE_LENGTH; i += 1) {
        // 32文字なので 256 は割り切れ、剰余による偏りは出ない
        code += SHORT_CODE_CHARS[bytes[i] % SHORT_CODE_CHARS.length];
      }
      const candidateRef = doc(db, 'shareLinks', code);
      const snap = await getDoc(candidateRef);
      if (!snap.exists()) {
        return { code, ref: candidateRef };
      }
    }
    throw new Error('shortcode_generation_failed');
  }, []);

  /**
   * 選んだファイルを足し、図面リストをファイル名から下書きする。
   * PDF は頁数を数えて枚数に入れる（人が枚数を変えていなければ）。
   */
  const addFiles = (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setUploadStatus(null);
    setUploadProgress(null);
    setLastSentId(null);
    const rows = newFiles.map((f) => parseDrawingFileName(f.name));
    setDrawings((prev) => [...prev, ...rows]);
    rows.forEach((row, i) => {
      void countPdfPages(newFiles[i]).then((pages) => {
        if (!pages || pages === 1) return;
        setDrawings((prev) => prev.map((r) => (r.key === row.key && r.sheets === '1' ? { ...r, sheets: String(pages) } : r)));
      });
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
      // 同じファイルを連続で選べるようにinputの中身をリセット
      e.target.value = '';
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const resetSelection = () => {
    setSelectedFiles([]);
    setDrawings((prev) => prev.filter((r) => !r.src));
    setCompressionProgress(null);
    setUploadProgress(null);
    setUploadStatus(null);
    if (typeof document !== 'undefined') {
      const input = document.getElementById('file-transfer-input') as HTMLInputElement | null;
      if (input) input.value = '';
    }
  };

  const busy = compressionProgress !== null || uploadProgress !== null;

  // 大きいファイルを上げている途中で画面を閉じると最初からやり直しになるので、閉じる前に確かめる
  useEffect(() => {
    if (uploadProgress === null || uploadProgress >= 100) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [uploadProgress]);

  const cancelUpload = () => {
    uploadTaskRef.current?.cancel();
  };
  const togglePause = () => {
    const task = uploadTaskRef.current;
    if (!task) return;
    if (paused) {
      task.resume();
      setPaused(false);
    } else {
      task.pause();
      setPaused(true);
    }
  };

  const runUpload = async () => {
    if (!uid) {
      setUploadStatus('ログインが必要です。');
      return;
    }
    if (!limits) {
      setUploadStatus('設定情報の読込完了を待っています。');
      return;
    }
    if (selectedFiles.length === 0) {
      setUploadStatus('ファイルを選択してください。');
      return;
    }
    if (!limits.uploadsEnabled) {
      setUploadStatus('現在アップロードは停止中です。');
      return;
    }
    if (!storage) {
      setUploadStatus('Storage クライアントを初期化できません。');
      return;
    }
    if (draftPassword.trim() && draftPassword.trim().length < 4) {
      setUploadStatus('合言葉は4文字以上にしてください（空なら掛けません）。');
      return;
    }

    // 送付状の中身は送り始めた時点のものを使う（上げている間に書き換えても混ざらないように）
    const draft = {
      recipient: draftRecipient.trim(),
      subject: draftSubject.trim(),
      purpose: draftPurpose,
      remarks: draftRemarks.trim(),
      sender: sender.trim(),
      drawings: toStored(drawings),
      password: draftPassword.trim(),
      notify: draftNotify,
    };

    // ZIP はメモリ上で作るので、まとめる前に生の合計で弾く
    if (selectedFiles.length > 1) {
      const rawTotal = selectedFiles.reduce((a, f) => a + f.size, 0);
      if (rawTotal > MAX_ZIP_TOTAL_MB * 1024 * 1024) {
        setUploadStatus(`複数ファイルをまとめて送れるのは合計 ${MAX_ZIP_TOTAL_MB}MB までです（ブラウザ内で ZIP にするため）。大きいファイルは 1 本ずつ送ってください。`);
        return;
      }
    }

    let fileToUpload: File;

    // 複数ファイルなら圧縮、単一ならそのまま使う
    try {
      if (selectedFiles.length === 1) {
        fileToUpload = selectedFiles[0];
      } else {
        setUploadStatus('ファイルを ZIP にまとめています');
        setCompressionProgress(0);

        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        // ファイル名の重複対策用Map
        const nameMap = new Map<string, number>();

        selectedFiles.forEach((file, index) => {
          let fileName = file.name;
          // 重複チェック: image.jpg が既にあれば image (1).jpg にする等の処理
          if (nameMap.has(fileName)) {
            const count = nameMap.get(fileName)! + 1;
            nameMap.set(fileName, count);
            const dotIndex = fileName.lastIndexOf('.');
            if (dotIndex !== -1) {
              fileName = `${fileName.slice(0, dotIndex)} (${count})${fileName.slice(dotIndex)}`;
            } else {
              fileName = `${fileName} (${count})`;
            }
          } else {
            nameMap.set(fileName, 0);
          }

          zip.file(fileName, file);
          // ファイル追加の進行状況を更新（0%から50%まで）
          setCompressionProgress(Math.round(((index + 1) / selectedFiles.length) * 50));
        });

        setCompressionProgress(50);
        const zipBlob = await zip.generateAsync(
          { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
          (meta) => setCompressionProgress(50 + Math.round(meta.percent / 2)),
        );
        setCompressionProgress(100);

        // 件名があれば ZIP 名にする（相手のダウンロードフォルダで見分けられるように）
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const safeSubject = draft.subject.replace(/[\\/:*?"<>|]/g, '').slice(0, 40);
        fileToUpload = new File([zipBlob], safeSubject ? `${safeSubject}_${timestamp.slice(0, 10)}.zip` : `archive_${timestamp}.zip`, {
          type: 'application/zip',
        });
      }
    } catch (err) {
      console.error('Compression failed', err);
      setUploadStatus('ファイルの圧縮に失敗しました。');
      setCompressionProgress(null);
      return;
    }

    // size checks
    const fileSizeMB = fileToUpload.size / (1024 * 1024);
    if (fileSizeMB > effectiveMaxFileMB) {
      setCompressionProgress(null);
      setUploadStatus(`ファイルサイズ(${formatBytes(fileToUpload.size)})が上限 ${formatMB(effectiveMaxFileMB)} を超えています。`);
      return;
    }

    if (effectiveMonthlyLimitMB && currentUsageMB + fileSizeMB > effectiveMonthlyLimitMB) {
      setCompressionProgress(null);
      setUploadStatus('今月のアップロード上限を超えます。');
      return;
    }

    // サイト全体のダウンロード帯域上限チェック
    if (limits && siteUsage) {
      const siteDownloadGB = siteUsage.downloadedBytes / (1024 * 1024 * 1024);
      const fileSizeGB = fileToUpload.size / (1024 * 1024 * 1024);
      if (siteDownloadGB + fileSizeGB > limits.siteMonthlyDownloadGBCap) {
        setCompressionProgress(null);
        setUploadStatus(`サイト全体のダウンロード帯域上限（${limits.siteMonthlyDownloadGBCap}GB/月）を超えます。`);
        return;
      }
    }

    setUploadStatus('アップロード前チェック中');
    try {
      // 上の各チェックはあくまで即時フィードバック用。実際の判定はサーバー側で行うので、
      // 本人確認のための ID トークンを渡す。
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setCompressionProgress(null);
        setUploadStatus('ログイン情報を確認できませんでした。再ログインしてお試しください。');
        return;
      }
      const guardResp = await fetch('/api/upload/guard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ fileSize: fileToUpload.size }),
      });
      if (!guardResp.ok) {
        throw new Error(`uploadGuard error: ${guardResp.status}`);
      }
      const guard = await guardResp.json();
      if (!guard.allowed) {
        setCompressionProgress(null);
        setUploadStatus(guard.reason ?? 'アップロードが拒否されました。');
        return;
      }
    } catch (error) {
      console.error('uploadGuard 呼び出しに失敗', error);
      setCompressionProgress(null);
      setUploadStatus('アップロード前チェックに失敗しました。');
      return;
    }

    const fileId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const path = `userUploads/${uid}/${fileId}`;
    const storageRef = ref(storage, path);

    // 分割して送る（uploadBytesResumable）。GB 級でも途中で一時停止・再開・中止ができ、
    // 回線が一瞬切れても SDK が続きから送り直す。
    const uploadTask = uploadBytesResumable(storageRef, fileToUpload, {
      contentType: fileToUpload.type || 'application/octet-stream',
      contentDisposition: `attachment; filename="${fileToUpload.name}"`,
      customMetadata: {
        owner: uid,
        fileId,
        originalName: fileToUpload.name,
      },
    });
    uploadTaskRef.current = uploadTask;
    setPaused(false);

    setCompressionProgress(null);
    setUploadStatus('アップロード中');
    setUploadProgress(0);
    setUploadBytes({ done: 0, total: fileToUpload.size });

    uploadTask.on(
      'state_changed',
      snapshot => {
        setUploadProgress(snapshot.totalBytes > 0 ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100) : 0);
        setUploadBytes({ done: snapshot.bytesTransferred, total: snapshot.totalBytes });
      },
      error => {
        uploadTaskRef.current = null;
        setPaused(false);
        setUploadProgress(null);
        setUploadBytes(null);
        if ((error as { code?: string }).code === 'storage/canceled') {
          setUploadStatus('アップロードを中止しました。');
          return;
        }
        console.error('アップロード中にエラー', error);
        setUploadStatus(
          (error as { code?: string }).code === 'storage/unauthorized'
            ? 'アップロードが拒否されました（サイズ上限を超えているか、ログインが切れています）。'
            : 'アップロードに失敗しました。',
        );
      },
      () => {
        uploadTaskRef.current = null;
        (async () => {
          let hadError = false;
          try {
            setUploadStatus('アップロード完了。リンクを発行しています');
            setUploadProgress(100);
            if (limits && !limits.sharingEnabled) {
              setUploadStatus('アップロードは完了しましたが、共有リンクの発行は一時停止中です。');
              return;
            }

            // 共有リンク発行前のダウンロード帯域上限チェック
            if (limits && siteUsage) {
              const siteDownloadGB = siteUsage.downloadedBytes / (1024 * 1024 * 1024);
              const fileSizeGB = fileToUpload.size / (1024 * 1024 * 1024);
              if (siteDownloadGB + fileSizeGB > limits.siteMonthlyDownloadGBCap) {
                setUploadStatus(`アップロードは完了しましたが、サイト全体のダウンロード帯域上限（${limits.siteMonthlyDownloadGBCap}GB/月）に達しているため、共有リンクを発行できません。`);
                return;
              }
            }

            const downloadUrl = await getDownloadURL(storageRef);
            const retentionDays =
              selectedRetentionDays ??
              (limits?.retentionDays && limits.retentionDays > 0 ? limits.retentionDays : null);
            const expiresAt =
              retentionDays && retentionDays > 0
                ? Timestamp.fromMillis(Date.now() + retentionDays * 24 * 60 * 60 * 1000)
                : null;
            let shortCode: string | null = null;
            if (limits?.sharingEnabled) {
              const { code, ref: shortRef } = await generateShortCode();
              shortCode = code;
              await setDoc(shortRef, {
                owner: uid,
                fileId,
                path,
                fileName: fileToUpload.name,
                // ★downloadUrl はここに載せない。
                //   shareLinks はコードを知っていれば誰でも読めるので、トークン付きの
                //   実URLを置くと /api/share/download の帯域チェックと計測を通さずに
                //   ファイルを落とせてしまう。実URLはオーナー限定の uploads/{fileId} に
                //   だけ持たせ、サーバー側で払い出す。
                // ダウンロード帯域の集計に使う。ここに持たせておくと
                // 集計時に uploads を追加で読まずに済む
                size: fileToUpload.size,
                createdAt: serverTimestamp(),
                expiresAt,
                retentionDays,
              });
            }
            // 作成時に書けるキーは firestore.rules で決まっている（hasOnly）。
            // 送付状の中身はオーナーの更新として後から足す（送付先・件名と同じ扱い）。
            await setDoc(
              doc(db, 'uploads', fileId),
              {
                owner: uid,
                fileName: fileToUpload.name,
                size: fileToUpload.size,
                path,
                downloadUrl,
                createdAt: serverTimestamp(),
                expiresAt,
                shortCode,
                retentionDays,
              },
              { merge: true },
            );
            const extra: Record<string, string | number | boolean | StoredDrawing[]> = {};
            if (draft.recipient) extra.recipient = draft.recipient;
            if (draft.subject) extra.note = draft.subject;
            if (draft.purpose) extra.purpose = draft.purpose;
            if (draft.sender) extra.sender = draft.sender;
            if (draft.remarks) extra.remarks = draft.remarks;
            if (draft.drawings.length) extra.drawings = draft.drawings;
            if (draft.notify) extra.notifyOnOpen = true;
            if (draft.password) Object.assign(extra, await hashSharePassword(draft.password));
            if (Object.keys(extra).length) {
              await updateDoc(doc(db, 'uploads', fileId), extra);
            }

            // 使用量を更新
            const userUsageRef = doc(db, 'usage', `${uid}_${monthKey}`);
            const siteUsageRef = doc(db, 'usage', `site_${monthKey}`);
            await setDoc(userUsageRef, { uploadedBytes: increment(fileToUpload.size) }, { merge: true });
            await setDoc(siteUsageRef, { uploadedBytes: increment(fileToUpload.size) }, { merge: true });

            setLastSentId(fileId);
            setUploadStatus('送付リンクを発行しました。台帳の「送付状」「送付文」から相手に渡せます。');
          } catch (error) {
            console.error('アップロード完了処理に失敗', error);
            setUploadStatus('アップロードは完了しましたが、リンク生成に失敗しました。');
            hadError = true;
          } finally {
            setUploadBytes(null);
            if (hadError) {
              setUploadProgress(null);
            } else {
              // 次の送付に備えて下書きを空にする（差出人・送付目的は同じことが多いので残す）
              setSelectedFiles([]);
              setDrawings([]);
              setDraftRecipient('');
              setDraftSubject('');
              setDraftRemarks('');
              setDraftPassword('');
              setDraftNotify(false);
              setUploadProgress(null);
              setTimeout(() => setUploadStatus(null), 6000);
            }
          }
        })();
      },
    );
  };

  useEffect(() => {
    if (!limits?.sharingEnabled || !uid) return;
    files.forEach(file => {
      if (file.shortCode || !file.downloadUrl || generatingShortCodes.current.has(file.id)) {
        return;
      }
      generatingShortCodes.current.add(file.id);
      (async () => {
        try {
          const { code, ref: shortRef } = await generateShortCode();
          const expiresAt = file.expiresAt ?? null;
          const retentionDays =
            file.retentionDays ??
            (limits.retentionDays && limits.retentionDays > 0 ? limits.retentionDays : null);
          await setDoc(shortRef, {
            owner: uid,
            fileId: file.id,
            path: file.path,
            // downloadUrl は載せない（理由は上のアップロード処理のコメント参照）
            fileName: file.fileName,
            size: file.size,
            createdAt: serverTimestamp(),
            expiresAt,
            retentionDays,
          });
          await setDoc(
            doc(db, 'uploads', file.id),
            { shortCode: code, retentionDays },
            { merge: true },
          );
        } catch (error) {
          console.error('既存ファイルの短縮リンク生成に失敗', error);
        } finally {
          generatingShortCodes.current.delete(file.id);
        }
      })();
    });
  }, [files, generateShortCode, limits, uid]);

  const handleDelete = useCallback(
    async (file: UploadRecord) => {
      if (!uid || !storage) {
        alert('削除できませんでした。再ログイン後にお試しください。');
        return;
      }
      if (!window.confirm(`「${file.fileName}」を削除しますか？相手はダウンロードできなくなります。`)) return;
      setDeleteInFlight(file.id);
      try {
        await deleteObject(ref(storage, file.path));
      } catch (error) {
        console.error('ストレージからの削除に失敗', error);
      }
      try {
        await deleteDoc(doc(db, 'uploads', file.id));
      } catch (error) {
        console.error('アップロード記録の削除に失敗', error);
      }
      if (file.shortCode) {
        try {
          await deleteDoc(doc(db, 'shareLinks', file.shortCode));
        } catch (error) {
          console.error('共有リンクの削除に失敗', error);
        }
      }
      setDeleteInFlight(null);
    },
    [uid],
  );

  const [copied, setCopied] = useState<string | null>(null);
  const handleCopy = async (text: string | undefined | null, key: string) => {
    if (!text) return;
    const fallback = () => {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        fallback();
      }
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
    } catch (error) {
      console.error('クリップボードコピー失敗', error);
      try {
        fallback();
        setCopied(key);
      } catch (fallbackError) {
        console.error('フォールバックコピーも失敗:', fallbackError);
        alert('コピーできませんでした');
      }
    }
  };

  const uploadDisabledReason = useMemo(() => {
    if (!limits) return '設定情報を読込中です';
    if (!limits.uploadsEnabled) return 'アップロード機能は一時停止中です';
    if (!uid) return '送るにはログイン（無料の会員登録）が必要です';
    return null;
  }, [limits, uid]);

  // --- 帯の「できること」 ---
  const jump = (el: HTMLElement | null) => el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const pick = (key: FeatureKey, el: HTMLElement | null, loginMsg?: string, msg?: string) => {
    setActiveFeature(key);
    jump(el);
    if (loginMsg && !isLoggedIn) setNotice(loginMsg);
    else setNotice(msg ?? null);
  };
  const features = [
    {
      label: '送付状・図面リスト',
      hint: '図面番号・図面名・版・縮尺・枚数の一覧をファイル名から下書きし、送付状（印刷 / PDF）と送付文を出します',
      active: activeFeature === 'send',
      onClick: () => pick('send', sendRef.current, undefined, 'ファイルを選ぶと、ファイル名（例: A-101_平面図_Rev2.pdf）から図面リストを下書きします。送った後は台帳の「送付状」で印刷・PDF 保存できます。'),
    },
    {
      label: `大容量 ${formatMB(effectiveMaxFileMB)}`,
      hint: '1ファイルの上限。送っている途中で一時停止・再開・中止できます',
      active: activeFeature === 'large',
      onClick: () => pick('large', dropRef.current, undefined, `1ファイル ${formatMB(effectiveMaxFileMB)} まで。途中で一時停止・再開・中止ができます。複数ファイルは合計 ${MAX_ZIP_TOTAL_MB}MB まで ZIP にまとめて送ります。`),
    },
    {
      label: '送付台帳',
      login: true,
      hint: 'いつ・誰に・何を送り、相手がいつ開いたか',
      active: activeFeature === 'ledger',
      onClick: () => pick('ledger', ledgerRef.current, 'ログインすると、送ったファイルごとに 送付先・図面リスト・開封の記録 が台帳に残ります。'),
    },
    {
      label: '合言葉',
      login: true,
      hint: 'リンクを開くときに合言葉を求めます（相手には電話など別の手段で伝える）',
      active: activeFeature === 'password',
      onClick: () => pick('password', optionsRef.current, 'ログインすると、送るファイルに合言葉を掛けられます。', '送る前にここで合言葉を入れるか、送った後に台帳の各行の「合言葉を掛ける」から設定します。'),
    },
    {
      label: '開封メール',
      login: true,
      hint: '相手が初めてダウンロードしたとき、登録メールアドレスに知らせます',
      active: activeFeature === 'notify',
      onClick: () => pick('notify', optionsRef.current, 'ログインすると、相手が開いたときにメールで知らせる設定ができます。', '送る前にここで選ぶか、送った後に台帳の各行で切り替えます。'),
    },
    {
      label: '台帳CSV',
      login: true,
      hint: '送付台帳を CSV（Excel で開ける）で保存',
      active: activeFeature === 'csv',
      onClick: () => {
        setActiveFeature('csv');
        if (!isLoggedIn) setNotice('ログインすると、送付台帳を CSV で保存できます。');
        else if (files.length === 0) {
          setNotice('まだ送付の記録がありません。送ると台帳に残り、CSV で保存できます。');
          jump(ledgerRef.current);
        } else {
          setNotice(null);
          downloadLedgerCsv();
        }
      },
    },
  ];

  const bar = (pct: number) => (
    <div className="w-full h-px bg-gray-300">
      <div className="h-px bg-[#141414]" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );

  const renderUsage = () => {
    if (!limits) return null;
    return (
      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-[11px] text-gray-600">あなたの使用量（今月）</span>
            <span className="yy-mono text-[10px] text-gray-600">
              {formatBytes(userUsage?.uploadedBytes ?? 0)} / {formatBytes(effectiveMonthlyLimitMB * 1024 * 1024)}
            </span>
          </div>
          {bar(effectiveMonthlyLimitMB ? (currentUsageMB / effectiveMonthlyLimitMB) * 100 : 0)}
          <p className={`mt-1 ${monoLabel}`}>DL {formatBytes(userUsage?.downloadedBytes ?? 0)}</p>
          {usageError && <p className="text-[10px] text-red-600 mt-1">{usageError}</p>}
        </div>
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-[11px] text-gray-600">サイト全体のダウンロード帯域</span>
            <span className="yy-mono text-[10px] text-gray-600">
              {formatBytes(siteUsage?.downloadedBytes ?? 0)} / {limits.siteMonthlyDownloadGBCap} GB
            </span>
          </div>
          {bar(((siteUsage?.downloadedBytes ?? 0) / (limits.siteMonthlyDownloadGBCap * 1024 * 1024 * 1024)) * 100)}
        </div>
      </div>
    );
  };

  const fieldLabel = 'block mb-1 yy-mono text-[10px] tracking-[0.12em] uppercase text-gray-500';
  const input = 'w-full px-2 py-1 text-[11px] bg-white';

  return (
    <div className="w-full bg-white border-b border-gray-100">
      <ToolHeader
        no="11"
        code="TRANSMITTAL"
        title="図面送付"
        description="図面やデータを相手先へ送る。リンクに送付状（図面番号・版・枚数）を添え、いつ誰に何を送って相手が開いたかを台帳に残します"
        features={features}
        aside={<span className="yy-mono text-[9.5px] tracking-[0.14em] uppercase text-[#8c887f]">旧 ファイル転送</span>}
      />

      <div className="p-4">
        {notice && (
          <div className="mb-4 flex items-start justify-between gap-3 border-l border-[#52AA96] pl-3 py-0.5 text-[11px] text-gray-700">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="閉じる" className="text-gray-400 hover:text-gray-800 shrink-0">
              <FiX size={12} />
            </button>
          </div>
        )}
        {limitsError && <p className="mb-4 text-[11px] text-red-600">{limitsError}</p>}
        {limits && (!limits.uploadsEnabled || !limits.sharingEnabled) && (
          <p className="mb-4 border-l border-[#3b3b3b] pl-3 text-[11px] text-gray-700">
            {[
              !limits.uploadsEnabled && '現在、アップロード機能は一時停止中です。',
              !limits.sharingEnabled && '現在、共有リンクの新規発行は一時停止中です。',
            ]
              .filter(Boolean)
              .join(' ')}
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* --- 左：送るもの --- */}
          <div className="space-y-8 min-w-0">
            {/* 001 ファイル */}
            <div ref={dropRef} className="scroll-mt-4">
              <SectionHead no="001" title="ファイル" aside={<span className={monoLabel}>MAX {formatMB(effectiveMaxFileMB)}</span>} />
              <section
                className={`border border-dashed p-6 text-center transition-colors ${isDragging ? 'border-[#52AA96]' : 'border-gray-400 hover:border-[#3b3b3b]'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {busy || uploadStatus ? (
                  <div className="w-full max-w-sm mx-auto text-left space-y-3">
                    <p className="text-[11px] text-[#141414]">{uploadStatus || '処理中'}</p>
                    {compressionProgress !== null && (
                      <div>
                        <p className={`mb-1 ${monoLabel}`}>ZIP {compressionProgress}%</p>
                        {bar(compressionProgress)}
                      </div>
                    )}
                    {uploadProgress !== null && (
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className={monoLabel}>{paused ? 'PAUSED' : 'UPLOAD'} {uploadProgress}%</span>
                          {uploadBytes && (
                            <span className={monoLabel}>
                              {formatBytes(uploadBytes.done)} / {formatBytes(uploadBytes.total)}
                            </span>
                          )}
                        </div>
                        {bar(uploadProgress)}
                        {uploadProgress < 100 && (
                          <div className="flex gap-4 mt-2 text-[11px]">
                            <button type="button" onClick={togglePause} className="inline-flex items-center gap-1 underline underline-offset-2 text-gray-700 hover:text-black">
                              {paused ? <FiPlay size={12} /> : <FiPause size={12} />}
                              {paused ? '再開' : '一時停止'}
                            </button>
                            <button type="button" onClick={cancelUpload} className="inline-flex items-center gap-1 underline underline-offset-2 text-gray-500 hover:text-red-600">
                              <FiX size={12} /> 中止
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {!busy && uploadStatus && (
                      <button type="button" onClick={() => setUploadStatus(null)} className="text-[11px] underline underline-offset-2 text-gray-600">
                        {selectedFiles.length ? '選んだファイルに戻る' : '次のファイルを選ぶ'}
                      </button>
                    )}
                  </div>
                ) : selectedFiles.length > 0 ? (
                  <div className="text-left">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-[11px] font-bold text-[#141414]">
                        {selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} 個のファイル`}
                      </span>
                      <span className="yy-mono text-[10px] text-gray-500">{formatBytes(selectedFiles.reduce((acc, f) => acc + f.size, 0))}</span>
                    </div>
                    {selectedFiles.length > 1 && (
                      <>
                        <p className="text-[10px] text-gray-500 mb-1">1 つの ZIP にまとめて送ります</p>
                        <ul className="text-[10px] text-gray-500 max-h-24 overflow-y-auto border-t border-gray-200">
                          {selectedFiles.map((f, i) => (
                            <li key={i} className="flex justify-between gap-2 py-0.5 border-b border-gray-100">
                              <span className="truncate">{f.name}</span>
                              <span className="yy-mono shrink-0">{formatBytes(f.size)}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-[11px]">
                      <label htmlFor="file-transfer-input" className="underline underline-offset-2 text-gray-700 hover:text-black cursor-pointer">
                        ファイルを足す
                      </label>
                      <button type="button" className="underline underline-offset-2 text-gray-500 hover:text-red-600" onClick={resetSelection}>
                        選び直す
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <FiUploadCloud className="mx-auto mb-2 text-gray-400" size={14} />
                    <p className="text-[11px] text-gray-600 mb-3">ここへドラッグ＆ドロップ（複数可）</p>
                    <label htmlFor="file-transfer-input" className="yy-btn inline-block cursor-pointer">
                      ファイルを選択
                    </label>
                    <p className={`mt-3 ${monoLabel}`}>
                      1 FILE ≤ {formatMB(effectiveMaxFileMB)} · ZIP ≤ {MAX_ZIP_TOTAL_MB}MB
                    </p>
                  </>
                )}
                <input id="file-transfer-input" type="file" multiple className="hidden" onChange={handleFileInputChange} />
              </section>
            </div>

            {/* 002 送付状 */}
            <div ref={sendRef} className="scroll-mt-4">
              <SectionHead no="002" title="送付状" aside={<span className={monoLabel}>TRANSMITTAL</span>} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className={fieldLabel}>宛先</span>
                  <input type="text" value={draftRecipient} onChange={(e) => setDraftRecipient(e.target.value)} disabled={busy} placeholder="○○建設 田中" className={input} />
                </label>
                <label className="block">
                  <span className={fieldLabel}>差出人</span>
                  <input type="text" value={sender} onChange={(e) => saveSender(e.target.value)} disabled={busy} placeholder="△△設計事務所 山田" className={input} />
                </label>
                <label className="block sm:col-span-2">
                  <span className={fieldLabel}>件名</span>
                  <input type="text" value={draftSubject} onChange={(e) => setDraftSubject(e.target.value)} disabled={busy} placeholder="A邸 実施設計図 第2版" className={input} />
                </label>
              </div>
              <div className="mt-3">
                <span className={fieldLabel}>送付目的</span>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-700">
                  {TRANSMITTAL_PURPOSES.map((p) => (
                    <label key={p} className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="transmittal-purpose" checked={draftPurpose === p} onChange={() => setDraftPurpose(p)} disabled={busy} />
                      {p}
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <span className={fieldLabel}>図面リスト</span>
                <DrawingListEditor rows={drawings} onChange={setDrawings} disabled={busy} />
              </div>
              <label className="block mt-3">
                <span className={fieldLabel}>備考</span>
                <input type="text" value={draftRemarks} onChange={(e) => setDraftRemarks(e.target.value)} disabled={busy} placeholder="前回からの変更: 2階平面の階段位置" className={input} />
              </label>
            </div>

            {/* 003 受け渡しの設定 */}
            <div ref={optionsRef} className="scroll-mt-4">
              <SectionHead no="003" title="受け渡しの設定" />
              <div className="space-y-3 text-[11px] text-gray-700">
                {retentionOptions.length > 0 && (
                  <div>
                    <span className={fieldLabel}>保存期間</span>
                    <div className="flex flex-wrap gap-4">
                      {retentionOptions.map(option => (
                        <label key={option} className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="retention" value={option} checked={selectedRetentionDays === option} onChange={() => setSelectedRetentionDays(option)} disabled={busy} />
                          <span className="yy-mono">{option}</span>日間
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className={fieldLabel}>
                      <FiLock size={10} className="inline -mt-0.5 mr-1" />
                      合言葉（任意・4文字以上）
                    </span>
                    <input type="text" value={draftPassword} onChange={(e) => setDraftPassword(e.target.value)} disabled={busy || !isLoggedIn} placeholder="空なら掛けない" autoComplete="off" className={`${input} yy-mono`} />
                  </label>
                  <label className="flex items-end gap-1.5 cursor-pointer pb-1" title="相手が初めてダウンロードしたとき、登録メールアドレスに知らせます">
                    <input type="checkbox" checked={draftNotify} onChange={(e) => setDraftNotify(e.target.checked)} disabled={busy || !isLoggedIn} />
                    <FiMail size={12} className="text-gray-500 mb-0.5" />
                    開いたらメールで知らせる
                  </label>
                </div>
                {draftPassword.trim() && <p className="text-[10px] text-gray-500">合言葉はリンクと別の手段（電話・別のメール）で相手に伝えてください。</p>}
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => void runUpload()}
                disabled={Boolean(uploadDisabledReason) || selectedFiles.length === 0 || busy}
                className="yy-btn yy-btn--primary w-full py-2.5"
              >
                {selectedFiles.length > 1 ? 'ZIP にまとめて送付リンクを発行' : '送付リンクを発行'}
              </button>
              {uploadDisabledReason && <p className="text-[10px] text-center text-gray-500">{uploadDisabledReason}</p>}
            </div>

            <div>
              <SectionHead no="004" title="使用量" />
              {renderUsage()}
            </div>
          </div>

          {/* --- 右：送付台帳 --- */}
          <div ref={ledgerRef} className="scroll-mt-4 min-w-0 flex flex-col">
            <SectionHead
              no="005"
              title="送付台帳"
              aside={
                files.length > 0 ? (
                  <button type="button" onClick={downloadLedgerCsv} className="inline-flex items-center gap-1 text-[11px] text-gray-600 underline underline-offset-2 hover:text-black">
                    <FiDownload size={12} /> CSV
                  </button>
                ) : (
                  <span className={monoLabel}>LEDGER</span>
                )
              }
            />

            {filesError && <p className="mb-3 text-[11px] text-red-600">{filesError}</p>}

            {!isLoggedIn ? (
              <p className="text-[11px] text-gray-500 py-2 leading-relaxed">
                ログインすると、送ったファイルごとに 送付先・図面リスト・相手が開いた日時 がここに残り、送付状をいつでも出し直せます。
              </p>
            ) : files.length === 0 ? (
              <p className="text-[11px] text-gray-500 py-2 leading-relaxed">
                まだ送付の記録はありません。送ると、ここに送付先・図面リスト・開封の記録が残り、各行で合言葉と開封メールを設定できます。{' '}
                <label htmlFor="file-transfer-input" className="underline underline-offset-2 text-gray-700 hover:text-black cursor-pointer">
                  ファイルを選ぶ
                </label>
              </p>
            ) : (
              <>
                <p className="text-[10px] text-gray-500 mb-2">送付先・件名は後からでも書き足せます。相手が開くと日時が入ります。</p>
                {pwMsg && <p className="mb-2 border-l border-[#52AA96] pl-2 text-[11px] text-gray-700">{pwMsg}</p>}
                <ol className="border-t border-[#3b3b3b]">
                  {files.map((file, idx) => {
                    const remainingHours = file.expiresAt ? Math.ceil((file.expiresAt.toDate().getTime() - Date.now()) / (1000 * 60 * 60)) : null;
                    const isExpired = file.expiresAt ? file.expiresAt.toDate().getTime() < Date.now() : false;
                    const shortLink = buildShortLink(file.shortCode);
                    const list = file.drawings ?? [];
                    const isNew = file.id === lastSentId;
                    const isEditing = editing?.id === file.id;
                    return (
                      <li key={file.id} className={`py-3 border-b border-gray-300 ${isNew ? 'border-l border-l-[#52AA96] pl-3' : ''}`}>
                        {/* 1 行目: 連番・日時・状態 */}
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={monoLabel}>
                            {String(files.length - idx).padStart(3, '0')} · {fmtTime(file.createdAt) || '—'}
                            {isNew && <span className="ml-2 text-[#52AA96]">NEW</span>}
                          </span>
                          <span className={`yy-mono text-[10px] tracking-[0.08em] ${file.downloadCount ? 'text-[#141414]' : 'text-gray-400'}`}>
                            {file.downloadCount ? `OPENED ×${file.downloadCount}` : 'UNOPENED'}
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-2 mt-1">
                          <p className="text-[12px] font-bold text-[#141414] truncate min-w-0">{file.fileName}</p>
                          <button
                            type="button"
                            className="text-gray-400 hover:text-red-600 disabled:opacity-40 shrink-0 mt-0.5"
                            onClick={() => void handleDelete(file)}
                            disabled={deleteInFlight === file.id}
                            aria-label="削除"
                            title="削除（相手はダウンロードできなくなります）"
                          >
                            <FiTrash2 size={12} />
                          </button>
                        </div>
                        <p className="yy-mono text-[10px] text-gray-500">
                          {formatBytes(file.size)}
                          {' · '}
                          <span className={isExpired ? 'text-red-600' : ''}>
                            {file.expiresAt
                              ? isExpired
                                ? 'EXPIRED'
                                : remainingHours !== null && remainingHours > 0
                                  ? remainingHours > 48
                                    ? `${Math.ceil(remainingHours / 24)}D LEFT`
                                    : `${remainingHours}H LEFT`
                                  : 'EXPIRING'
                              : '—'}
                          </span>
                          {file.downloadCount ? ` · 初回 ${fmtTime(file.firstDownloadedAt)} / 最終 ${fmtTime(file.lastDownloadedAt)}` : ''}
                        </p>

                        {/* 送付先・件名・目的 */}
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_88px] gap-1 mt-2">
                          <input
                            type="text"
                            defaultValue={file.recipient ?? ''}
                            onBlur={(e) => e.target.value.trim() !== (file.recipient ?? '') && void saveLedgerField(file.id, 'recipient', e.target.value)}
                            placeholder="送付先（○○建設 田中）"
                            aria-label="送付先"
                            className="px-1.5 py-0.5 text-[11px] bg-white"
                          />
                          <input
                            type="text"
                            defaultValue={file.note ?? ''}
                            onBlur={(e) => e.target.value.trim() !== (file.note ?? '') && void saveLedgerField(file.id, 'note', e.target.value)}
                            placeholder="件名（A邸 実施図 第2版）"
                            aria-label="件名"
                            className="px-1.5 py-0.5 text-[11px] bg-white"
                          />
                          <select value={file.purpose ?? ''} onChange={(e) => void saveLedgerField(file.id, 'purpose', e.target.value)} aria-label="送付目的" className="px-1 py-0.5 text-[11px] bg-white">
                            <option value="">目的 —</option>
                            {TRANSMITTAL_PURPOSES.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 図面リスト */}
                        <div className="mt-2">
                          {isEditing && editing ? (
                            <div className="border-t border-gray-200 pt-2">
                              <DrawingListEditor rows={editing.rows} onChange={(rows) => setEditing({ id: file.id, rows })} />
                              <div className="flex gap-2 mt-2">
                                <button type="button" className="yy-btn yy-btn--primary !py-1 !px-3" onClick={() => void saveDrawings()}>
                                  保存
                                </button>
                                <button type="button" className="yy-btn !py-1 !px-3" onClick={() => setEditing(null)}>
                                  やめる
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditing({ id: file.id, rows: fromStored(list) })}
                              className="text-[11px] text-gray-600 hover:text-black text-left"
                              title="図面リストを直す"
                            >
                              <span className={monoLabel}>DWG</span>{' '}
                              {list.length ? (
                                <>
                                  {list.length} 件 / 計 {totalSheets(list)} 枚
                                  <span className="text-gray-400">
                                    {' — '}
                                    {list
                                      .slice(0, 3)
                                      .map((d) => [d.no, d.title].filter(Boolean).join(' '))
                                      .join('、')}
                                    {list.length > 3 ? ' ほか' : ''}
                                  </span>
                                </>
                              ) : (
                                <span className="underline underline-offset-2">図面リストを付ける</span>
                              )}
                            </button>
                          )}
                        </div>

                        {/* 渡す */}
                        {shortLink ? (
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px]">
                            <button type="button" onClick={() => printTransmittal(file)} className="inline-flex items-center gap-1 underline underline-offset-2 text-[#141414] hover:text-black" title="送付状を別窓で開く（印刷・PDF に保存）">
                              <FiPrinter size={12} className="text-gray-500" /> 送付状
                            </button>
                            <button type="button" onClick={() => void handleCopy(transmittalText(toTransmittal(file)), `text-${file.id}`)} className="inline-flex items-center gap-1 underline underline-offset-2 text-gray-700 hover:text-black" title="宛名・件名・リンク・期限・図面リストを入れたメール本文をコピー">
                              <FiCopy size={12} className="text-gray-500" /> {copied === `text-${file.id}` ? 'コピーしました' : '送付文'}
                            </button>
                            <button type="button" onClick={() => void handleCopy(shortLink, `link-${file.id}`)} className="inline-flex items-center gap-1 underline underline-offset-2 text-gray-700 hover:text-black">
                              <FiLink size={12} className="text-gray-500" /> {copied === `link-${file.id}` ? 'コピーしました' : 'リンク'}
                            </button>
                            <a href={shortLink} target="_blank" rel="noopener noreferrer" className="yy-mono text-[10px] text-gray-400 hover:text-gray-700 truncate max-w-full">
                              {shortLink.replace(/^https?:\/\//, '')}
                            </a>
                          </div>
                        ) : file.downloadUrl ? (
                          <p className={`mt-2 ${monoLabel}`}>リンクを発行中</p>
                        ) : (
                          <p className={`mt-2 ${monoLabel}`}>リンク未発行</p>
                        )}

                        {/* 受け渡しの確認 */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-gray-600">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer" title="初めてダウンロードされたとき、登録メールアドレスに知らせます">
                            <input type="checkbox" checked={!!file.notifyOnOpen} onChange={(e) => void setNotify(file, e.target.checked)} />
                            開いたらメール
                          </label>
                          {file.hasPassword ? (
                            <span className="inline-flex items-center gap-1.5">
                              <FiLock size={12} className="text-gray-500" /> 合言葉あり
                              <button type="button" className="underline underline-offset-2 text-gray-500" onClick={() => void setFilePassword(file, null)}>
                                外す
                              </button>
                            </span>
                          ) : pwFor === file.id ? (
                            <span className="inline-flex items-center gap-1.5">
                              <input type="text" value={pwText} onChange={(e) => setPwText(e.target.value)} placeholder="合言葉（4文字以上）" className="px-1 py-0.5 w-32 text-[11px] yy-mono bg-white" autoComplete="off" />
                              <button type="button" disabled={pwText.trim().length < 4} onClick={() => void setFilePassword(file, pwText.trim())} className="yy-btn !py-0.5 !px-2">
                                掛ける
                              </button>
                              <button type="button" onClick={() => { setPwFor(null); setPwText(''); }} className="underline underline-offset-2 text-gray-500">
                                やめる
                              </button>
                            </span>
                          ) : (
                            <button type="button" className="inline-flex items-center gap-1 underline underline-offset-2" onClick={() => { setPwFor(file.id); setPwText(''); setPwMsg(''); }}>
                              <FiLock size={12} className="text-gray-400" /> 合言葉を掛ける
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}

            {/* 運用ルール概要 */}
            <div className="mt-6 pt-3 border-t border-gray-300">
              <p className={`mb-1 ${monoLabel}`}>Rules</p>
              <ul className="text-[10px] text-gray-500 space-y-0.5">
                <li>1ファイル最大 {formatMB(effectiveMaxFileMB)}、月間アップロード上限 {formatMB(effectiveMonthlyLimitMB)}</li>
                <li>保存期間を過ぎると自動で削除（最長 {retentionOptions[retentionOptions.length - 1] ?? limits?.retentionDays ?? '-'} 日）</li>
                <li>サイト全体の帯域上限（{limits?.siteMonthlyDownloadGBCap ?? '-'} GB/月）に達すると新規リンク発行不可</li>
                <li>
                  自分の端末どうしで一時的に渡すだけなら{' '}
                  <button type="button" onClick={() => requestGeneralTool({ toolId: 'temp-storage' })} className="underline underline-offset-2 text-gray-700 hover:text-black">
                    端末間受け渡し
                  </button>
                  （24時間で消える・QR で開く）
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileTransferTool;
