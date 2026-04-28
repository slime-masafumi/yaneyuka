'use client';

import React, { DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  serverTimestamp,
  setDoc,
  deleteDoc,
  increment,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, app } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/AuthContext';
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
};

type UsageDoc = {
  uploadedBytes: number;
  downloadedBytes: number;
};

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function getMonthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

const MAX_FILE_MB = 100;
const MONTHLY_LIMIT_MB = 1024;
const DEFAULT_RETENTION_OPTIONS = [3, 7, 14];

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
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const monthKey = useMemo(() => getMonthKey(), []);
  const [selectedRetentionDays, setSelectedRetentionDays] = useState<number | null>(null);
  const [retentionInitApplied, setRetentionInitApplied] = useState(false);
  const [origin, setOrigin] = useState<string>('');
  const [deleteInFlight, setDeleteInFlight] = useState<string | null>(null);
  const generatingShortCodes = useRef<Set<string>>(new Set());

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
            
            // 削除期限を過ぎたファイルは表示しない
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
          });
        });
        setFiles(list);
        setFilesError(null);
      },
      error: err => {
        console.error('uploads購読に失敗', err);
        setFilesError('ファイル一覧を読み込めませんでした。');
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

  const generateShortCode = useCallback(async () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      let code = '';
      for (let i = 0; i < 6; i += 1) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      const candidateRef = doc(db, 'shareLinks', code);
      const snap = await getDoc(candidateRef);
      if (!snap.exists()) {
        return { code, ref: candidateRef };
      }
    }
    throw new Error('shortcode_generation_failed');
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      // 既存のファイル配列の後ろに結合する
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      setUploadStatus(null);
      setUploadProgress(null);
      
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
      const newFiles = Array.from(e.dataTransfer.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      setUploadStatus(null);
      setUploadProgress(null);
    }
  };

  const resetSelection = () => {
    setSelectedFiles([]);
    setCompressionProgress(null);
    setUploadProgress(null);
    setUploadStatus(null);
    if (typeof document !== 'undefined') {
    const input = document.getElementById('file-transfer-input') as HTMLInputElement | null;
    if (input) input.value = '';
    }
  };

  const runUpload = useCallback(async () => {
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

    let fileToUpload: File;

    // ---------------------------------------------------------
    // 【追加機能】複数ファイルなら圧縮、単一ならそのまま使う
    // ---------------------------------------------------------
    try {
      if (selectedFiles.length === 1) {
        // 1ファイルならそのまま
        fileToUpload = selectedFiles[0];
      } else {
        // 複数ファイルならZIP圧縮を開始
        setUploadStatus('ファイルを圧縮してまとめています...');
        setCompressionProgress(0);
        
        // JSZipを動的インポート（SSR対応）
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
          const addProgress = Math.round(((index + 1) / selectedFiles.length) * 50);
          setCompressionProgress(addProgress);
        });

        // ZIP生成 (圧縮レベルはお好みで調整)
        // ファイル追加完了（50%）
        setCompressionProgress(50);
        
        const zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });
        
        // 圧縮完了（100%）
        setCompressionProgress(100);

        // 今の日時でファイル名を作成 (例: archive_2025-12-10_123456.zip)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        fileToUpload = new File([zipBlob], `archive_${timestamp}.zip`, {
          type: 'application/zip'
        });
      }
    } catch (err) {
      console.error('Compression failed', err);
      setUploadStatus('ファイルの圧縮に失敗しました。');
      setCompressionProgress(null);
      return;
    }

    // --- ここから先は fileToUpload (単一ファイル) に対して既存ロジックを実行 ---

    // size checks
    const fileSizeMB = fileToUpload.size / (1024 * 1024);
    if (fileSizeMB > effectiveMaxFileMB) {
      setUploadStatus(`ファイルサイズ(${formatBytes(fileToUpload.size)})が上限 ${effectiveMaxFileMB}MB を超えています。`);
      return;
    }

    if (effectiveMonthlyLimitMB && currentUsageMB + fileSizeMB > effectiveMonthlyLimitMB) {
      setUploadStatus('今月のアップロード上限を超えます。');
      return;
    }

    // サイト全体のダウンロード帯域上限チェック
    if (limits && siteUsage) {
      const siteDownloadGB = siteUsage.downloadedBytes / (1024 * 1024 * 1024);
      // アップロードしたファイルがダウンロードされた場合を想定してチェック
      const fileSizeGB = fileToUpload.size / (1024 * 1024 * 1024);
      if (siteDownloadGB + fileSizeGB > limits.siteMonthlyDownloadGBCap) {
        setUploadStatus(`サイト全体のダウンロード帯域上限（${limits.siteMonthlyDownloadGBCap}GB/月）を超えます。`);
        return;
      }
    }

    setUploadStatus('アップロード前チェック中...');
    try {
      const guardResp = await fetch('/api/upload/guard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileSize: fileToUpload.size }),
      });
      if (!guardResp.ok) {
        throw new Error(`uploadGuard error: ${guardResp.status}`);
      }
      const guard = await guardResp.json();
      if (!guard.allowed) {
        setUploadStatus(guard.reason ?? 'アップロードが拒否されました。');
        return;
      }
    } catch (error) {
      console.error('uploadGuard 呼び出しに失敗', error);
      setUploadStatus('アップロード前チェックに失敗しました。');
      return;
    }

    const fileId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const path = `userUploads/${uid}/${fileId}`;
    const storageRef = ref(storage, path);

    const uploadTask = uploadBytesResumable(storageRef, fileToUpload, {
      contentType: fileToUpload.type || 'application/octet-stream',
      contentDisposition: `attachment; filename="${fileToUpload.name}"`,
      customMetadata: {
        owner: uid,
        fileId,
        originalName: fileToUpload.name,
      },
    });

    // 圧縮が完了したら、アップロードを開始
    setCompressionProgress(null);
    setUploadStatus('アップロード中...');
    setUploadProgress(0);
    
    uploadTask.on(
      'state_changed',
      snapshot => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(Math.round(progress));
      },
      error => {
        console.error('アップロード中にエラー', error);
        setUploadStatus('アップロードに失敗しました。');
        setUploadProgress(null);
      },
      () => {
        (async () => {
          let hadError = false;
          try {
            setUploadStatus('アップロードが完了しました。リンクを生成しています...');
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
                downloadUrl,
                fileName: fileToUpload.name,
                createdAt: serverTimestamp(),
                expiresAt,
                retentionDays,
              });
            }
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
            
            // 使用量を更新
            const userUsageRef = doc(db, 'usage', `${uid}_${monthKey}`);
            const siteUsageRef = doc(db, 'usage', `site_${monthKey}`);
            await setDoc(
              userUsageRef,
              {
                uploadedBytes: increment(fileToUpload.size),
              },
              { merge: true },
            );
            await setDoc(
              siteUsageRef,
              {
                uploadedBytes: increment(fileToUpload.size),
              },
              { merge: true },
            );
            
            setUploadStatus('アップロードが完了しました。共有リンクを生成しました。');
          } catch (error) {
            console.error('アップロード完了処理に失敗', error);
            setUploadStatus('アップロードは完了しましたが、リンク生成に失敗しました。');
            hadError = true;
          } finally {
            if (hadError) {
              setUploadProgress(null);
            } else {
              setTimeout(() => {
                setUploadStatus(null);
                setUploadProgress(null);
                setSelectedFiles([]);
              }, 2000);
            }
          }
        })();
      },
    );
  }, [uid, limits, selectedFiles, storage, effectiveMonthlyLimitMB, currentUsageMB, generateShortCode, selectedRetentionDays, monthKey, siteUsage]);

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
            downloadUrl: file.downloadUrl,
            fileName: file.fileName,
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
      if (typeof window === 'undefined' || !window.confirm) {
        // モバイルブラウザでconfirmが使えない場合のフォールバック
        if (!confirm('このファイルを削除しますか？')) return;
      } else {
      if (!window.confirm('このファイルを削除しますか？')) return;
      }
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
    [storage, uid],
  );

  const handleCopy = async (text?: string) => {
    if (!text) return;
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      } else {
        // フォールバック: テキストエリアを使用
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        textArea.style.left = '-999999px';
        if (document.body) {
          document.body.appendChild(textArea);
          textArea.select();
          try {
            document.execCommand('copy');
          } catch (err) {
            console.error('コピーに失敗しました:', err);
            alert('コピーできませんでした。リンクを手動でコピーしてください。');
          }
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      console.error('クリップボードコピー失敗', error);
      // フォールバックを試行
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        textArea.style.left = '-999999px';
        if (document.body) {
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
      } catch (fallbackError) {
        console.error('フォールバックコピーも失敗:', fallbackError);
      alert('コピーできませんでした');
      }
    }
  };

  const uploadDisabledReason = useMemo(() => {
    if (!limits) return '設定情報を読込中です';
    if (!limits.uploadsEnabled) return 'アップロード機能は一時停止中です';
    if (!uid) return 'ログインが必要です';
    return null;
  }, [limits, uid]);

  const renderUsage = () => {
    if (!limits) return null;
    return (
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <label className="block text-[12px] font-bold mb-3 text-gray-700 border-b border-gray-200 pb-1">使用量</label>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] text-gray-600">あなたの使用量（今月）</span>
              <span className="text-[11px] font-mono text-gray-700">
                {formatBytes(userUsage?.uploadedBytes ?? 0)} / {formatBytes(effectiveMonthlyLimitMB * 1024 * 1024)}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded">
              <div
                className="h-2 bg-blue-500 rounded"
                style={{
                  width: `${Math.min(100, effectiveMonthlyLimitMB ? (currentUsageMB / effectiveMonthlyLimitMB) * 100 : 0)}%`,
                }}
              />
            </div>
            <p className="mt-1 text-[10px] text-gray-500">
              ダウンロード帯域: {formatBytes(userUsage?.downloadedBytes ?? 0)}
            </p>
            {usageError && <p className="text-[10px] text-red-500 mt-1">{usageError}</p>}
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] text-gray-600">サイト全体のダウンロード帯域</span>
              <span className="text-[11px] font-mono text-gray-700">
                {formatBytes(siteUsage?.downloadedBytes ?? 0)} / {limits.siteMonthlyDownloadGBCap} GB
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded">
              <div
                className="h-2 bg-purple-500 rounded"
                style={{
                  width: `${Math.min(
                    100,
                    ((siteUsage?.downloadedBytes ?? 0) / (limits.siteMonthlyDownloadGBCap * 1024 * 1024 * 1024)) * 100,
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-white rounded-b-lg shadow-sm border-b border-gray-100">
      <div className="p-4 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div>
        <h3 className="text-[13px] font-medium">ファイル転送（共有）</h3>
        <p className="text-[11px] mt-0.5">ファイルをアップロードすると共有リンクが自動発行。ダウンロード回数制限や有効期限の設定が可能</p>
        </div>
      </div>

      <div className="p-4">
        {limitsError && (
          <div className="mb-4 p-3 rounded bg-red-50 text-red-600 text-xs border border-red-100">
            {limitsError}
          </div>
        )}

        {limits && (!limits.uploadsEnabled || !limits.sharingEnabled) && (
          <div className="mb-4 p-3 rounded bg-yellow-50 text-yellow-700 text-xs border border-yellow-200">
            {[
              !limits.uploadsEnabled && '現在、アップロード機能は一時停止中です。',
              !limits.sharingEnabled && '現在、共有リンクの新規発行は一時停止中です。',
            ]
              .filter(Boolean)
              .join(' ')}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* --- 左カラム：入力・設定 --- */}
          <div className="space-y-6">
            {/* 1. ファイル選択エリア */}
            <div>
              <section
                className={`border-2 border-dashed rounded-lg p-6 text-center transition ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {compressionProgress !== null || uploadProgress !== null || uploadStatus ? (
                  // 処理中・アップロード中の表示
                  <div className="w-full max-w-xs mx-auto">
                    <div className="animate-bounce mb-4 text-blue-500 text-3xl flex justify-center">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-blue-600 mb-2">{uploadStatus || '処理中...'}</p>
                    {compressionProgress !== null && (
                      <div className="mb-2">
                        <p className="text-[10px] text-gray-600 mb-1">圧縮中: {compressionProgress}%</p>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${compressionProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {uploadProgress !== null && (
                      <div>
                        <p className="text-[10px] text-gray-600 mb-1">アップロード中: {uploadProgress}%</p>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : selectedFiles.length > 0 ? (
                  <>
                    <svg className="w-10 h-10 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {selectedFiles.length === 1 ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      )}
                    </svg>

                    {/* ファイル情報の表示切り替え */}
                    {selectedFiles.length === 1 ? (
                      <div>
                        <p className="text-[12px] font-bold text-gray-700">{selectedFiles[0].name}</p>
                        <p className="text-[11px] text-gray-500">{formatBytes(selectedFiles[0].size)}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[12px] font-bold text-gray-700">{selectedFiles.length} 個のファイル</p>
                        <p className="text-[11px] text-gray-500">
                          合計: {formatBytes(selectedFiles.reduce((acc, f) => acc + f.size, 0))}
                          <span className="block text-[10px] text-blue-500 mt-1">※自動的にZIP圧縮されて送信されます</span>
                        </p>
                        {/* 必要ならここに簡易リストを表示してもOK */}
                        <ul className="mt-2 text-[10px] text-gray-400 text-left max-h-20 overflow-y-auto px-4">
                          {selectedFiles.map((f, i) => <li key={i} className="truncate">• {f.name}</li>)}
                        </ul>
                      </div>
                    )}

                    <div className="flex justify-center items-center gap-4 mt-4">
                      {/* 1. 削除ボタン */}
                    <button
                      type="button"
                        className="text-[11px] text-red-500 hover:text-red-700 hover:underline"
                      onClick={resetSelection}
                    >
                        添付ファイルの削除
                    </button>

                      {/* 2. 追加ボタン（inputラベルとして機能させる） */}
                      <label
                        htmlFor="file-transfer-input"
                        className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        別のファイルを追加
                      </label>
                    </div>
                  </>
                ) : (
                  <>
                    <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-[12px] text-gray-600 mb-2">ファイルをドラッグ＆ドロップ（複数可）</p>
                    <label
                      htmlFor="file-transfer-input"
                      onClick={(e) => {
                        if (!isLoggedIn) {
                          alert('入力するには会員登録（無料）が必要です。');
                          e.preventDefault();
                        }
                      }}
                      className="inline-flex items-center px-4 py-2 rounded bg-gray-200 text-gray-700 text-[11px] hover:bg-gray-300 cursor-pointer"
                    >
                      ファイルを選択
                    </label>
                    <input
                      id="file-transfer-input"
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileInputChange}
                    />
                  </>
                )}
              </section>
            </div>

            {/* 2. 設定エリア */}
            {retentionOptions.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-[12px] font-bold mb-3 text-gray-700 border-b border-gray-200 pb-1">保存期間設定</label>
                <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                  {retentionOptions.map(option => (
                    <label key={option} className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="retention"
                        value={option}
                        checked={selectedRetentionDays === option}
                        onChange={() => setSelectedRetentionDays(option)}
                      />
                      <span>{option}日間</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 3. 使用量表示 */}
            {renderUsage()}

            {/* 4. アクションボタン */}
            <button
              type="button"
              onClick={runUpload}
              disabled={Boolean(uploadDisabledReason) || selectedFiles.length === 0 || compressionProgress !== null || uploadProgress !== null}
              className={`w-full py-3 rounded-lg text-sm font-bold shadow-sm transition-all ${
                uploadDisabledReason || selectedFiles.length === 0 || compressionProgress !== null || uploadProgress !== null
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
              }`}
            >
              {selectedFiles.length > 1 // ファイルが2つ以上なら「圧縮して」をつける
                ? '圧縮してアップロードを開始する'
                : 'アップロードを開始する'
              }
            </button>
            {uploadDisabledReason && (
              <p className="text-[10px] text-center text-gray-500">{uploadDisabledReason}</p>
            )}
            {/* アップロード中の表示はファイル選択エリア内に統合済み */}
          </div>

          {/* --- 右カラム：結果・出力 --- */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 flex flex-col h-full min-h-[300px]">
            <label className="block text-[12px] font-bold mb-3 text-gray-700 border-b border-gray-200 pb-1">アップロード済みファイル</label>

            {filesError && (
              <div className="mb-3 p-2 text-xs rounded bg-red-50 text-red-600 border border-red-100">
                {filesError}
              </div>
            )}

            {files.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-[11px]">まだアップロードされたファイルはありません</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-3">
                  {files.map(file => {
                    const remainingHours = file.expiresAt
                      ? Math.ceil((file.expiresAt.toDate().getTime() - Date.now()) / (1000 * 60 * 60))
                      : null;
                    const isExpired = file.expiresAt ? file.expiresAt.toDate().getTime() < Date.now() : false;
                    const shortLink = buildShortLink(file.shortCode);
                    return (
                      <div key={file.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold text-gray-800 truncate">{file.fileName}</p>
                            <p className="text-[11px] text-gray-500">{formatBytes(file.size)}</p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {file.createdAt ? file.createdAt.toDate().toLocaleString() : '-'}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="px-2 py-1 rounded text-[10px] font-semibold bg-red-500 text-white hover:bg-red-600 disabled:bg-red-200 ml-2"
                            onClick={() => handleDelete(file)}
                            disabled={deleteInFlight === file.id}
                          >
                            {deleteInFlight === file.id ? '削除中...' : '削除'}
                          </button>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className={`text-[10px] mb-1 ${isExpired ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                            削除予定: {file.expiresAt
                              ? isExpired
                                ? '削除済み'
                                : remainingHours !== null && remainingHours > 0
                                ? `あと${remainingHours}時間`
                                : 'まもなく削除予定'
                              : '-'}
                          </p>
                          {shortLink ? (
                            <div className="flex flex-col space-y-1">
                              <span className="text-[10px] text-green-600 font-medium">共有リンク生成済み</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="px-2 py-0.5 border rounded text-[10px] hover:bg-gray-100"
                                  onClick={() => handleCopy(shortLink)}
                                >
                                  コピー
                                </button>
                                <a
                                  href={shortLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="truncate text-blue-600 hover:underline text-[10px]"
                                >
                                  {shortLink}
                                </a>
                              </div>
                            </div>
                          ) : file.downloadUrl ? (
                            <div className="flex flex-col space-y-1">
                              <span className="text-[10px] text-yellow-600">短縮リンク生成中...</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="px-2 py-0.5 border rounded text-[10px] hover:bg-gray-100"
                                  onClick={() => handleCopy(file.downloadUrl)}
                                >
                                  コピー
                                </button>
                                <span className="truncate text-gray-600 text-[10px]">{file.downloadUrl}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-500">リンク生成中...</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 運用ルール概要 */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-[11px] font-semibold text-gray-800 mb-2">運用ルール概要</h4>
              <ul className="list-disc list-inside text-[10px] text-gray-600 space-y-1">
                <li>1ファイル最大 {effectiveMaxFileMB} MB、月間アップロード上限 {effectiveMonthlyLimitMB} MB</li>
                <li>保存期間は {retentionOptions[retentionOptions.length - 1] ?? limits?.retentionDays ?? '-'} 日で自動削除</li>
                <li>帯域上限 ({limits?.siteMonthlyDownloadGBCap ?? '-'} GB/月) に達すると新規リンク発行不可</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileTransferTool;


