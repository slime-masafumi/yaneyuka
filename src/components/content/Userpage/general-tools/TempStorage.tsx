'use client';

/**
 * 端末間受け渡し（旧「一時ファイル」。id は temp-storage のまま）。
 *
 * 自分の端末どうしで、その場でファイルを渡すための置き場。
 * 現場のスマホで撮った写真を事務所の PC で受け取る、PC のファイルをスマホへ渡す。
 * QR を読むだけで開けて、24時間で自動で消える。
 * 相手先へ記録つきで送る「図面送付」とは目的が違うので、名前で区別する。
 */

import React, { useState, useEffect, useRef, DragEvent } from 'react';
import { db, storage } from '@/lib/firebaseClient';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, where, Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuth } from '@/lib/AuthContext';
import { requestGeneralTool } from '@/lib/generalToolsMenu';
import { FiTrash2, FiDownload, FiSmartphone, FiUploadCloud, FiX } from 'react-icons/fi';
import ToolHeader from '../ToolHeader';
import { QrImage, QrModal } from './QrCode';
// JSZipは動的インポートで使用（SSR対応）

interface TempFile {
  id: string;
  name: string;
  url: string;
  storagePath: string;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  userId?: string;
  size?: number; // ファイルサイズ（バイト）
}

// 容量制限設定（コスト抑制のため）。storage.rules の temp/ も 50MB で揃えている
const MAX_FILE_SIZE_MB = 50; // 1ファイルあたりの最大サイズ（MB）
const MAX_TOTAL_SIZE_MB = 200; // ユーザーごとの合計容量上限（MB）
const MAX_FILES_COUNT = 10; // ユーザーごとのファイル数上限

type DirFile = File & { webkitRelativePath?: string };
const relPath = (f: File) => (f as DirFile).webkitRelativePath || '';

const monoLabel = 'yy-mono text-[10px] tracking-[0.12em] uppercase text-gray-500';

// ファイルサイズをフォーマット（FileTransfer.tsx と同じ形式）
const formatBytes = (bytes: number, decimals = 1): string => {
  if (!bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

/** 各段の見出し（連番 + 名前）。線 1 本と小さな等幅で区切る */
const SectionHead: React.FC<{ no: string; title: string; aside?: React.ReactNode }> = ({ no, title, aside }) => (
  <div className="flex items-baseline justify-between gap-2 border-b border-[#3b3b3b] pb-1 mb-3">
    <p className="flex items-baseline gap-2 min-w-0">
      <span className={monoLabel}>{no}</span>
      <span className="text-[12px] font-bold text-[#141414]">{title}</span>
    </p>
    {aside}
  </div>
);

const bar = (pct: number) => (
  <div className="w-full h-px bg-gray-300">
    <div className="h-px bg-[#141414]" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
  </div>
);

type FeatureKey = 'phone' | 'upload' | 'camera' | 'folder' | 'qr';

const TempStorage: React.FC = () => {
  // QR を出しているファイル（スマホで受け取る）
  const [qrFile, setQrFile] = useState<{ name: string; url: string } | null>(null);
  const { isLoggedIn, currentUser } = useAuth();
  const [files, setFiles] = useState<TempFile[]>([]);
  const [status, setStatus] = useState<string>('');
  const [compressionProgress, setCompressionProgress] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null); // ダウンロード中のファイルID
  const [origin, setOrigin] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [activeFeature, setActiveFeature] = useState<FeatureKey | null>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // ファイル一覧を取得（期限切れでないものだけ表示、自分のファイルのみ）
  useEffect(() => {
    if (!isLoggedIn || !currentUser?.uid) {
      setFiles([]);
      return;
    }

    // 複合インデックスを避けるためクエリは userId のみ。
    // 期限切れの除外はクライアント側で行う（実体の削除は cleanupTempFiles 関数が担当）
    const q = query(collection(db, 'tempFiles'), where('userId', '==', currentUser.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // キャッシュからの空読み込みは一覧を消してしまうのでスキップ
        if (snapshot.empty && snapshot.metadata.fromCache) return;

        const nowMs = Date.now();
        const validFiles = snapshot.docs
          .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as TempFile))
          .filter(file => {
            const expiresMs = file.expiresAt?.toMillis?.();
            return typeof expiresMs === 'number' && expiresMs > nowMs;
          })
          .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));

        setFiles(validFiles);
      },
      (error) => {
        console.error('[TempStorage] ファイル一覧の取得に失敗しました:', error);
        setFiles([]);
      }
    );

    return () => unsubscribe();
  }, [isLoggedIn, currentUser?.uid]);

  // ファイル処理とアップロードの統合関数
  // 複数のファイルを受け取り、必要なら圧縮してアップロードする
  const processAndUpload = async (inputFiles: File[]) => {
    if (!isLoggedIn || !currentUser?.uid) {
      setNotice('ファイルを上げるにはログイン（無料の会員登録）が必要です。');
      return;
    }
    if (inputFiles.length === 0) return;

    if (typeof window === 'undefined' || !storage) {
      alert('ストレージ機能が利用できません。ブラウザを更新してください。');
      return;
    }

    // --- 0. 圧縮前チェック ---
    // ZIP圧縮はブラウザのメモリ上で行うため、巨大なフォルダを先に圧縮すると
    // 上限判定に到達する前にタブが落ちる。生サイズの段階で先に弾く。
    const rawTotalMB = inputFiles.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);
    if (rawTotalMB > MAX_FILE_SIZE_MB) {
      alert(`選択されたファイルの合計サイズが上限（${MAX_FILE_SIZE_MB}MB）を超えています。\n選択サイズ: ${rawTotalMB.toFixed(2)}MB\n\n相手先へ大きなファイルを送るときは「図面送付」を使ってください。`);
      return;
    }

    const alreadyUploaded = files.filter(f => f.userId === currentUser.uid);
    if (alreadyUploaded.length >= MAX_FILES_COUNT) {
      alert(`ファイル数の上限（${MAX_FILES_COUNT}ファイル）に達しています。\n古いファイルを削除してから再度お試しください。`);
      return;
    }

    setStatus('準備中');
    setCompressionProgress(null);
    setUploadProgress(null);

    try {
      let fileToUpload: File;

      // --- 1. 圧縮判定ロジック ---
      // フォルダアップロードかどうかを判定（webkitRelativePathが存在するかどうか）
      const isFolderUpload = inputFiles.length > 0 && !!relPath(inputFiles[0]);

      if (inputFiles.length === 1 && !isFolderUpload) {
        // 単一ファイルの場合はそのまま
        fileToUpload = inputFiles[0];
      } else {
        // 複数ファイルまたはフォルダの場合はZIP圧縮
        const fileCount = inputFiles.length;
        const uploadType = isFolderUpload ? 'フォルダ' : 'ファイル';
        setStatus(`${uploadType}を ZIP にまとめています（${fileCount}個）`);
        setCompressionProgress(0);

        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        const nameMap = new Map<string, number>();

        inputFiles.forEach((file, index) => {
          let filePath: string;

          if (isFolderUpload && relPath(file)) {
            // フォルダ構造を保持（先頭のフォルダ名は外す: "folder/sub/file.txt" -> "sub/file.txt"）
            const pathParts = relPath(file).split('/');
            filePath = pathParts.length > 1 ? pathParts.slice(1).join('/') : pathParts[0];
          } else {
            filePath = file.name;
          }

          // 同名ファイル対策（パス全体でチェック）
          let finalPath = filePath;
          if (nameMap.has(finalPath)) {
            const count = nameMap.get(finalPath)! + 1;
            nameMap.set(finalPath, count);
            const dotIndex = finalPath.lastIndexOf('.');
            const slashIndex = finalPath.lastIndexOf('/');
            if (dotIndex !== -1 && dotIndex > slashIndex) {
              finalPath = `${finalPath.slice(0, dotIndex)} (${count})${finalPath.slice(dotIndex)}`;
            } else {
              finalPath = `${finalPath} (${count})`;
            }
          } else {
            nameMap.set(finalPath, 0);
          }

          zip.file(finalPath, file);
          // ファイル追加の進行状況を更新（0%から50%まで）
          setCompressionProgress(Math.round(((index + 1) / inputFiles.length) * 50));
        });

        setCompressionProgress(50);
        const zipBlob = await zip.generateAsync(
          { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
          (meta) => setCompressionProgress(50 + Math.round(meta.percent / 2)),
        );
        setCompressionProgress(100);

        // 日付入りファイル名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const zipFileName = isFolderUpload ? `folder_${timestamp}.zip` : `archive_${timestamp}.zip`;
        fileToUpload = new File([zipBlob], zipFileName, { type: 'application/zip' });
      }

      // --- 2. 各種制限チェック（生成された fileToUpload に対して行う） ---
      const fileSizeMB = fileToUpload.size / (1024 * 1024);
      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        alert(`ファイルサイズが上限（${MAX_FILE_SIZE_MB}MB）を超えています。\n送信サイズ: ${fileSizeMB.toFixed(2)}MB`);
        setStatus('');
        setCompressionProgress(null);
        return;
      }

      // ファイル数チェック (自分のアップロード済みファイル数)
      const userFiles = files.filter(f => f.userId === currentUser.uid);
      if (userFiles.length >= MAX_FILES_COUNT) {
        alert(`ファイル数の上限（${MAX_FILES_COUNT}ファイル）に達しています。\n古いファイルを削除してから再度お試しください。`);
        setStatus('');
        setCompressionProgress(null);
        return;
      }

      // 合計容量チェック
      const currentTotalMB = userFiles.reduce((sum, f) => sum + (f.size || 0) / (1024 * 1024), 0);
      if (currentTotalMB + fileSizeMB > MAX_TOTAL_SIZE_MB) {
        alert(`合計容量の上限（${MAX_TOTAL_SIZE_MB}MB）を超えます。\n現在の使用量: ${currentTotalMB.toFixed(2)}MB / ${MAX_TOTAL_SIZE_MB}MB`);
        setStatus('');
        setCompressionProgress(null);
        return;
      }

      // --- 3. アップロード処理 ---
      setCompressionProgress(null);
      setStatus('アップロード中');
      setUploadProgress(0);

      const timestamp = Date.now();
      const storagePath = `temp/${currentUser.uid}/${timestamp}_${fileToUpload.name}`;
      const storageRef = ref(storage, storagePath);

      // 実際の転送量から進捗を出す（uploadBytes では進捗が取れず固定値になっていた）
      const task = uploadBytesResumable(storageRef, fileToUpload);
      await new Promise<void>((resolve, reject) => {
        task.on(
          'state_changed',
          (snapshot) => {
            const percent = snapshot.totalBytes > 0 ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100) : 0;
            setUploadProgress(percent);
          },
          reject,
          () => resolve()
        );
      });

      const url = await getDownloadURL(storageRef);

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Firestoreに保存
      await addDoc(collection(db, 'tempFiles'), {
        name: fileToUpload.name,
        url: url,
        storagePath: storagePath,
        size: fileToUpload.size,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(expiresAt),
        userId: currentUser.uid,
      });

      setUploadProgress(100);
      setStatus('完了。右の一覧に出ています');

      // 少し待ってからステータスをリセット
      setTimeout(() => {
        setStatus('');
        setCompressionProgress(null);
        setUploadProgress(null);
      }, 2000);
    } catch (error) {
      console.error('処理エラー:', error);
      alert('処理に失敗しました');
      setStatus('');
      setCompressionProgress(null);
      setUploadProgress(null);
    }
  };

  // 複数ファイル対応のハンドラー
  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const picked = Array.from(e.target.files);
    e.target.value = '';
    await processAndUpload(picked);
  };

  // ドラッグ&ドロップ処理
  const handleDragOver = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    await processAndUpload(Array.from(e.dataTransfer.files));
  };

  // ファイルダウンロード処理
  const handleFileClick = async (file: TempFile) => {
    if (downloadingFileId === file.id) return;
    setDownloadingFileId(file.id);

    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('ダウンロードエラー:', error);
      // フォールバック: 新しいタブで開く
      window.open(file.url, '_blank');
    } finally {
      setDownloadingFileId(null);
    }
  };

  // 手動削除
  const handleDelete = async (file: TempFile) => {
    if (!confirm(`「${file.name}」を削除しますか？`)) return;

    if (!storage) {
      alert('ストレージ機能が利用できません。');
      return;
    }

    try {
      try {
        await deleteObject(ref(storage, file.storagePath));
      } catch (error) {
        console.warn('Storageファイルの削除エラー（既に削除されている可能性があります）:', error);
      }
      await deleteDoc(doc(db, 'tempFiles', file.id));
    } catch (err) {
      console.error('削除エラー:', err);
      alert('削除に失敗しました');
    }
  };

  // 残り時間（等幅の短い表記）
  const remaining = (expiresAt?: Timestamp): string => {
    const ms = expiresAt?.toMillis?.();
    if (typeof ms !== 'number') return '—';
    const diff = ms - Date.now();
    if (diff <= 0) return 'EXPIRED';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}H ${String(minutes).padStart(2, '0')}M LEFT` : `${minutes}M LEFT`;
  };
  const createdLabel = (t?: Timestamp) => {
    const ms = t?.toMillis?.();
    return typeof ms === 'number'
      ? new Date(ms).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '—';
  };

  const busy = compressionProgress !== null || uploadProgress !== null || !!status;
  const screenUrl = origin ? `${origin}/?m=general-tools&t=temp-storage` : '';

  // --- 帯の「できること」 ---
  const jump = (el: HTMLElement | null) => el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const needLogin = () => {
    if (isLoggedIn) return false;
    setNotice('端末間受け渡しはログイン（無料の会員登録）して使います。スマホと PC で同じアカウントにログインすると、片方で上げたファイルがもう片方の一覧にすぐ出ます。');
    return true;
  };
  const pick = (key: FeatureKey, run: () => void, msg?: string) => {
    setActiveFeature(key);
    if (needLogin()) return;
    setNotice(msg ?? null);
    run();
  };
  const clickInput = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.click();
  const features = [
    {
      label: 'スマホで開く QR',
      login: true,
      hint: 'PC に出した QR をスマホのカメラで読むと、この画面がスマホで開きます',
      active: activeFeature === 'phone',
      onClick: () => pick('phone', () => jump(phoneRef.current)),
    },
    {
      label: '写真を撮って上げる',
      login: true,
      hint: 'スマホではカメラが開きます',
      active: activeFeature === 'camera',
      onClick: () => pick('camera', () => { jump(dropRef.current); clickInput('camera-upload'); }),
    },
    {
      label: 'フォルダごと ZIP',
      login: true,
      hint: 'フォルダを選ぶと中身を ZIP にまとめて上げます',
      active: activeFeature === 'folder',
      onClick: () => pick('folder', () => { jump(dropRef.current); clickInput('folder-upload'); }),
    },
    {
      label: 'QR で受け取る',
      login: true,
      hint: '一覧の各ファイルの QR をスマホで読むと、そのままダウンロードできます',
      active: activeFeature === 'qr',
      onClick: () =>
        pick('qr', () => jump(listRef.current), files.length ? '一覧の「QR」をスマホのカメラで読むと、ログインせずにそのファイルを落とせます。' : 'ファイルを上げると、一覧の各行に「QR」が出ます。スマホで読むとそのまま落とせます。'),
    },
    { label: '24時間で自動削除', hint: '上げてから24時間で消えます。残したいものは落としておいてください' },
  ];

  const header = (
    <ToolHeader
      no="10"
      code="HANDOFF"
      title="端末間受け渡し"
      description="自分の端末どうしでファイルを渡す。現場のスマホで撮った写真を事務所の PC で受け取る、PC のファイルをスマホへ。QR を読むだけで開けて、24時間で自動で消えます"
      features={features}
      aside={<span className="yy-mono text-[9.5px] tracking-[0.14em] uppercase text-[#8c887f]">旧 一時ファイル</span>}
    />
  );

  const noticeLine = notice && (
    <div className="mb-4 flex items-start justify-between gap-3 border-l border-[#52AA96] pl-3 py-0.5 text-[11px] text-gray-700">
      <span>{notice}</span>
      <button type="button" onClick={() => setNotice(null)} aria-label="閉じる" className="text-gray-400 hover:text-gray-800 shrink-0">
        <FiX size={12} />
      </button>
    </div>
  );

  const toTransmittal = (
    <button type="button" onClick={() => requestGeneralTool({ toolId: 'file-transfer' })} className="underline underline-offset-2 text-gray-700 hover:text-black">
      図面送付
    </button>
  );

  if (!isLoggedIn) {
    return (
      <div className="w-full bg-white border-b border-gray-100">
        {header}
        <div className="p-4">
          {noticeLine}
          <p className="text-[11px] text-gray-600 leading-relaxed">
            この機能はログイン（無料の会員登録）して使います。スマホと PC で同じアカウントにログインすると、片方で上げたファイルがもう片方にすぐ出ます。
          </p>
          <p className="text-[11px] text-gray-500 mt-2">相手先へ図面を送るときは {toTransmittal}（送付状・送付台帳つき）。</p>
        </div>
      </div>
    );
  }

  const currentTotalMB = files.reduce((sum, f) => sum + (f.size || 0) / (1024 * 1024), 0);

  return (
    <div className="w-full bg-white border-b border-gray-100">
      {header}

      <div className="p-4">
        {noticeLine}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* --- 左：上げる --- */}
          <div className="space-y-8 min-w-0">
            {/* 001 スマホで開く */}
            <div ref={phoneRef} className="scroll-mt-4">
              <SectionHead no="001" title="スマホで開く" aside={<span className={monoLabel}>SCAN</span>} />
              <div className="flex gap-4 items-start">
                {screenUrl ? <QrImage text={screenUrl} size={96} /> : <div className="w-24 h-24 bg-gray-100" />}
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  スマホのカメラでこの QR を読むと、この画面がスマホで開きます。同じアカウントでログインしていれば、スマホで上げた写真は右の一覧にすぐ出ます。
                  PC から渡したいファイルは、一覧の「QR」をスマホで読んでください。
                </p>
              </div>
            </div>

            {/* 002 上げる */}
            <div ref={dropRef} className="scroll-mt-4">
              <SectionHead no="002" title="上げる" aside={<span className={monoLabel}>MAX {MAX_FILE_SIZE_MB}MB</span>} />
              <section
                className={`border border-dashed p-6 text-center transition-colors ${isDragging ? 'border-[#52AA96]' : 'border-gray-400 hover:border-[#3b3b3b]'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {busy ? (
                  <div className="w-full max-w-xs mx-auto text-left space-y-3">
                    <p className="text-[11px] text-[#141414]">{status || '処理中'}</p>
                    {compressionProgress !== null && (
                      <div>
                        <p className={`mb-1 ${monoLabel}`}>ZIP {compressionProgress}%</p>
                        {bar(compressionProgress)}
                      </div>
                    )}
                    {uploadProgress !== null && (
                      <div>
                        <p className={`mb-1 ${monoLabel}`}>UPLOAD {uploadProgress}%</p>
                        {bar(uploadProgress)}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <FiUploadCloud className="mx-auto mb-2 text-gray-400" size={14} />
                    <p className="text-[11px] text-gray-600 mb-3">ここへドラッグ＆ドロップ（複数可・フォルダ可）</p>
                    <div className="flex flex-wrap gap-2 items-center justify-center">
                      <label htmlFor="file-upload" className="yy-btn cursor-pointer">
                        ファイルを選択
                      </label>
                      <label htmlFor="camera-upload" className="yy-btn cursor-pointer lg:hidden">
                        写真を撮る
                      </label>
                      <label htmlFor="folder-upload" className="yy-btn cursor-pointer">
                        フォルダを選択
                      </label>
                    </div>
                    <p className={`mt-3 ${monoLabel}`}>複数・フォルダは ZIP にまとめて上げます</p>
                  </>
                )}
                <input id="camera-upload" type="file" accept="image/*" capture="environment" onChange={handleFileInput} disabled={busy} className="hidden" />
                <input id="file-upload" type="file" onChange={handleFileInput} disabled={busy} className="hidden" multiple />
                <input id="folder-upload" type="file" onChange={handleFileInput} disabled={busy} className="hidden" webkitdirectory="" multiple />
              </section>
            </div>

            {/* 003 使用量 */}
            <div>
              <SectionHead no="003" title="使用量" />
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-[11px] text-gray-600">合計容量</span>
                    <span className="yy-mono text-[10px] text-gray-600">
                      {currentTotalMB.toFixed(1)}MB / {MAX_TOTAL_SIZE_MB}MB
                    </span>
                  </div>
                  {bar((currentTotalMB / MAX_TOTAL_SIZE_MB) * 100)}
                </div>
                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-[11px] text-gray-600">ファイル数</span>
                    <span className="yy-mono text-[10px] text-gray-600">
                      {files.length} / {MAX_FILES_COUNT}
                    </span>
                  </div>
                  {bar((files.length / MAX_FILES_COUNT) * 100)}
                </div>
                <p className="text-[10px] text-gray-500">
                  1ファイル最大 {MAX_FILE_SIZE_MB}MB・24時間で自動削除。相手先へ大きな図面を送るときは {toTransmittal}（最大 2GB・送付状つき）。
                </p>
              </div>
            </div>
          </div>

          {/* --- 右：受け取る --- */}
          <div ref={listRef} className="scroll-mt-4 min-w-0">
            <SectionHead no="004" title="受け取る" aside={<span className={monoLabel}>{files.length} FILES</span>} />
            {files.length === 0 ? (
              <p className="text-[11px] text-gray-500 py-2 leading-relaxed">
                まだ何もありません。上げたファイルはここに出て、各行の QR をスマホで読むとそのまま落とせます。{' '}
                <label htmlFor="file-upload" className="underline underline-offset-2 text-gray-700 hover:text-black cursor-pointer">
                  ファイルを選ぶ
                </label>
              </p>
            ) : (
              <ol className="border-t border-[#3b3b3b] max-h-[560px] overflow-y-auto">
                {files.map((file, idx) => (
                  <li key={file.id} className="py-3 border-b border-gray-300">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={monoLabel}>
                        {String(files.length - idx).padStart(3, '0')} · {createdLabel(file.createdAt)}
                      </span>
                      <span className="yy-mono text-[10px] tracking-[0.08em] text-gray-500">{remaining(file.expiresAt)}</span>
                    </div>
                    <div className="flex items-start justify-between gap-2 mt-1">
                      <p className="text-[12px] font-bold text-[#141414] truncate min-w-0">{file.name}</p>
                      <button type="button" className="text-gray-400 hover:text-red-600 shrink-0 mt-0.5" onClick={() => void handleDelete(file)} aria-label="削除" title="削除">
                        <FiTrash2 size={12} />
                      </button>
                    </div>
                    <p className="yy-mono text-[10px] text-gray-500">{file.size ? formatBytes(file.size) : '—'}</p>
                    <div className="flex items-center gap-4 mt-2 text-[11px]">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 underline underline-offset-2 text-[#141414] hover:text-black"
                        onClick={() => setQrFile({ name: file.name, url: file.url })}
                        title="スマホで読むとダウンロードできます"
                      >
                        <FiSmartphone size={12} className="text-gray-500" /> QR
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 underline underline-offset-2 text-gray-700 hover:text-black disabled:opacity-50 disabled:cursor-wait"
                        onClick={() => void handleFileClick(file)}
                        disabled={downloadingFileId === file.id}
                      >
                        <FiDownload size={12} className="text-gray-500" />
                        {downloadingFileId === file.id ? 'ダウンロード中' : 'ダウンロード'}
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
      {qrFile && (
        <QrModal
          title={qrFile.name}
          text={qrFile.url}
          note="スマホのカメラで読むと、ログインせずにダウンロードできます。このリンクを知っている人は誰でも取れるので、他人に見せないでください（24時間で消えます）。"
          onClose={() => setQrFile(null)}
        />
      )}
    </div>
  );
};

export default TempStorage;
