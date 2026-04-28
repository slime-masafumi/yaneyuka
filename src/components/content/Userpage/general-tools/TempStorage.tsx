'use client';

import React, { useState, useEffect, DragEvent } from 'react';
import { db, storage } from '@/lib/firebaseClient';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, where, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuth } from '@/lib/AuthContext';
import { FiUpload, FiTrash2, FiDownload, FiClock, FiPackage, FiFile } from 'react-icons/fi';
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

// 容量制限設定（コスト抑制のため）
const MAX_FILE_SIZE_MB = 50; // 1ファイルあたりの最大サイズ（MB）
const MAX_TOTAL_SIZE_MB = 200; // ユーザーごとの合計容量上限（MB）
const MAX_FILES_COUNT = 10; // ユーザーごとのファイル数上限

const TempStorage: React.FC = () => {
  const { isLoggedIn, currentUser } = useAuth();
  const [files, setFiles] = useState<TempFile[]>([]);
  const [status, setStatus] = useState<string>('');
  const [compressionProgress, setCompressionProgress] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null); // ダウンロード中のファイルID

  // ファイル一覧を取得（期限切れでないものだけ表示、自分のファイルのみ）
  useEffect(() => {
    if (!isLoggedIn || !currentUser?.uid) {
      console.log('[TempStorage] ログイン状態またはユーザーIDがありません', { isLoggedIn, uid: currentUser?.uid });
      setFiles([]);
      return;
    }

    try {
    console.log('[TempStorage] ファイル一覧の取得を開始', { uid: currentUser.uid });

    // インデックスエラーを回避するため、シンプルなクエリを使用し、
    // クライアント側で期限切れをフィルタリング
    const q = query(
      collection(db, 'tempFiles'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
          try {
        console.log('[TempStorage] スナップショット取得', { 
          docsCount: snapshot.docs.length,
          fromCache: snapshot.metadata.fromCache,
          hasPendingWrites: snapshot.metadata.hasPendingWrites
        });

        // キャッシュからの読み込みで空の場合はスキップ
        if (snapshot.empty && snapshot.metadata.fromCache) {
          console.log('[TempStorage] キャッシュからの空の読み込みをスキップ');
          return;
        }

        const allFiles = snapshot.docs.map(doc => {
          const data = doc.data();
              try {
          console.log('[TempStorage] ファイルデータ:', { 
            id: doc.id, 
            name: data.name, 
            userId: data.userId,
            expiresAt: data.expiresAt?.toDate(),
            expiresAtMs: data.expiresAt?.toMillis()
          });
              } catch (logError) {
                console.warn('[TempStorage] ログ出力エラー:', logError);
              }
          return {
            id: doc.id,
            ...data
          } as TempFile;
        });
        
        // クライアント側で期限切れをフィルタリング
        const nowMs = Date.now();
        const validFiles = allFiles.filter(file => {
          if (!file.expiresAt) {
            console.warn('[TempStorage] expiresAtが存在しないファイルをスキップ:', file.id);
            return false;
          }
              try {
          const expiresMs = file.expiresAt.toMillis();
          const isValid = expiresMs > nowMs;
          if (!isValid) {
                  try {
            console.log('[TempStorage] 期限切れファイルを除外:', { 
              id: file.id, 
              name: file.name,
              expiresAt: file.expiresAt.toDate(),
              now: new Date(nowMs)
            });
                  } catch (logError) {
                    console.warn('[TempStorage] ログ出力エラー:', logError);
                  }
          }
          return isValid;
              } catch (dateError) {
                console.error('[TempStorage] 日付処理エラー:', dateError);
                return false;
              }
        });
        
            // 最新のファイルを上に表示（作成日時の降順）
            try {
        validFiles.sort((a, b) => {
                try {
                  const aTime = a.createdAt?.toMillis() || 0;
                  const bTime = b.createdAt?.toMillis() || 0;
                  return bTime - aTime; // 新しい順（降順）
                } catch (sortError) {
                  console.error('[TempStorage] ソートエラー:', sortError);
                  return 0;
                }
              });
            } catch (sortError) {
              console.error('[TempStorage] ソート処理エラー:', sortError);
            }
        
        console.log('[TempStorage] ファイル一覧を更新', { 
          totalCount: allFiles.length,
          validCount: validFiles.length 
        });
        setFiles(validFiles);
          } catch (processError) {
            console.error('[TempStorage] ファイル処理エラー:', processError);
            setFiles([]);
          }
      }, 
      (error) => {
        console.error('[TempStorage] ファイル一覧の取得エラー:', error);
        console.error('[TempStorage] エラー詳細:', {
          code: error.code,
          message: error.message,
          stack: error.stack
        });
        setFiles([]);
      }
    );

    return () => {
        try {
      console.log('[TempStorage] 購読を解除');
      unsubscribe();
        } catch (cleanupError) {
          console.error('[TempStorage] クリーンアップエラー:', cleanupError);
        }
    };
    } catch (initError) {
      console.error('[TempStorage] 初期化エラー:', initError);
      setFiles([]);
    }
  }, [isLoggedIn, currentUser?.uid]);

  // ファイル処理とアップロードの統合関数
  // 複数のファイルを受け取り、必要なら圧縮してアップロードする
  const processAndUpload = async (inputFiles: File[]) => {
    if (!isLoggedIn || !currentUser?.uid) {
      alert('ファイルをアップロードするには会員登録（無料）が必要です。');
      return;
    }
    if (inputFiles.length === 0) return;
    
    if (typeof window === 'undefined' || !storage) {
      alert('ストレージ機能が利用できません。ブラウザを更新してください。');
      return;
    }

    setStatus('準備中...');
    setCompressionProgress(null);
    setUploadProgress(null);

    try {
      let fileToUpload: File;
    
      // --- 1. 圧縮判定ロジック ---
      // フォルダアップロードかどうかを判定（webkitRelativePathが存在するかどうか）
      const isFolderUpload = inputFiles.length > 0 && 'webkitRelativePath' in inputFiles[0] && (inputFiles[0] as any).webkitRelativePath;
      
      if (inputFiles.length === 1 && !isFolderUpload) {
        // 単一ファイルの場合はそのまま
        fileToUpload = inputFiles[0];
      } else {
        // 複数ファイルまたはフォルダの場合はZIP圧縮
        const fileCount = inputFiles.length;
        const uploadType = isFolderUpload ? 'フォルダ' : 'ファイル';
        setStatus(`${uploadType}を圧縮中 (${fileCount}個)...`);
        setCompressionProgress(0);
        
        // JSZipを動的インポート（SSR対応）
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        const nameMap = new Map<string, number>();

        // ファイルをZIPに追加
        inputFiles.forEach((file, index) => {
          let filePath: string;
          
          if (isFolderUpload && 'webkitRelativePath' in file && (file as any).webkitRelativePath) {
            // フォルダ構造を保持
            filePath = (file as any).webkitRelativePath;
            // 先頭のフォルダ名を削除（例: "folder/file.txt" -> "file.txt" または "folder/subfolder/file.txt" -> "subfolder/file.txt"）
            const pathParts = filePath.split('/');
            if (pathParts.length > 1) {
              // 最初のフォルダ名を除いたパスを使用
              filePath = pathParts.slice(1).join('/');
            }
          } else {
            // 通常のファイル名
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
              // 拡張子がある場合
              const basePath = finalPath.slice(0, dotIndex);
              const ext = finalPath.slice(dotIndex);
              finalPath = `${basePath} (${count})${ext}`;
            } else {
              // 拡張子がない場合
              finalPath = `${finalPath} (${count})`;
            }
          } else {
            nameMap.set(finalPath, 0);
          }
          
          zip.file(finalPath, file);
          // ファイル追加の進行状況を更新（0%から50%まで）
          const addProgress = Math.round(((index + 1) / inputFiles.length) * 50);
          setCompressionProgress(addProgress);
        });

        // ZIP生成
        // ファイル追加完了（50%）
        setCompressionProgress(50);
        
        const zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });
        
        // 圧縮完了（100%）
        setCompressionProgress(100);

        // 日付入りファイル名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const zipFileName = isFolderUpload 
          ? `folder_${timestamp}.zip` 
          : `archive_${timestamp}.zip`;
        fileToUpload = new File([zipBlob], zipFileName, {
          type: 'application/zip'
        });
      }

      // --- 2. 各種制限チェック（生成された fileToUpload に対して行う） ---
      
      // サイズチェック
      const fileSizeMB = fileToUpload.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
        alert(`ファイルサイズが上限（${MAX_FILE_SIZE_MB}MB）を超えています。\n送信サイズ: ${fileSizeMB.toFixed(2)}MB`);
        setStatus('');
      return;
    }

      // ファイル数チェック (自分のアップロード済みファイル数)
    const userFiles = files.filter(f => f.userId === currentUser.uid);
    if (userFiles.length >= MAX_FILES_COUNT) {
      alert(`ファイル数の上限（${MAX_FILES_COUNT}ファイル）に達しています。\n古いファイルを削除してから再度お試しください。`);
        setStatus('');
      return;
    }

      // 合計容量チェック
      const currentTotalMB = userFiles.reduce((sum, f) => sum + (f.size || 0) / (1024 * 1024), 0);
      if (currentTotalMB + fileSizeMB > MAX_TOTAL_SIZE_MB) {
        alert(`合計容量の上限（${MAX_TOTAL_SIZE_MB}MB）を超えます。\n現在の使用量: ${currentTotalMB.toFixed(2)}MB / ${MAX_TOTAL_SIZE_MB}MB`);
        setStatus('');
      return;
    }

      // --- 3. アップロード処理 ---
      // 圧縮が完了したら、アップロードを開始
      setCompressionProgress(null);
      setStatus('アップロード中...');
    setUploadProgress(0);

      const timestamp = Date.now();
      const storagePath = `temp/${currentUser.uid}/${timestamp}_${fileToUpload.name}`;
      const storageRef = ref(storage, storagePath);
      
      await uploadBytes(storageRef, fileToUpload);
      setUploadProgress(50);
      
      const url = await getDownloadURL(storageRef);
      setUploadProgress(80);

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
      setStatus('完了！');
      
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
    // FileList -> File[] 変換して渡す
    await processAndUpload(Array.from(e.target.files));
    e.target.value = '';
  };

  // ドラッグ&ドロップ処理
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    await processAndUpload(Array.from(e.dataTransfer.files));
  };

  // ファイルダウンロード処理
  const handleFileClick = async (file: TempFile) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    
    // 既にダウンロード中の場合は処理しない
    if (downloadingFileId === file.id) {
      return;
    }
    
    // ダウンロード開始
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
      
      // ダウンロード完了
      setDownloadingFileId(null);
    } catch (error) {
      console.error('ダウンロードエラー:', error);
      setDownloadingFileId(null);
      // フォールバック: 新しいタブで開く
      if (typeof window !== 'undefined') {
      window.open(file.url, '_blank');
      }
    }
  };

  // 手動削除
  const handleDelete = async (file: TempFile) => {
    if (typeof window === 'undefined' || !window.confirm) {
    if (!confirm(`「${file.name}」を削除しますか？`)) return;
    } else {
      if (!window.confirm(`「${file.name}」を削除しますか？`)) return;
    }
    
    if (!storage) {
      alert('ストレージ機能が利用できません。');
      return;
    }

    try {
      // Storageからファイルを削除
      try {
        await deleteObject(ref(storage, file.storagePath));
      } catch (error) {
        console.warn('Storageファイルの削除エラー（既に削除されている可能性があります）:', error);
      }

      // Firestoreからデータを削除
      await deleteDoc(doc(db, 'tempFiles', file.id));
    } catch (err) {
      console.error('削除エラー:', err);
      alert('削除に失敗しました');
    }
  };

  // 残り時間を計算
  const getRemainingTime = (expiresAt: Timestamp): string => {
    try {
    const now = new Date();
      let expires: Date;
      try {
        expires = expiresAt.toDate();
      } catch (dateError) {
        console.error('[TempStorage] toDate()エラー:', dateError);
        // フォールバック: タイムスタンプから直接作成
        const expiresMs = expiresAt.toMillis();
        expires = new Date(expiresMs);
      }
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return '期限切れ';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `残り${hours}時間${minutes}分`;
    } else {
      return `残り${minutes}分`;
      }
    } catch (error) {
      console.error('[TempStorage] 残り時間計算エラー:', error);
      return '期限不明';
    }
  };

  // ファイルサイズをフォーマット（FileTransfer.tsxと同じ形式）
  const formatBytes = (bytes: number, decimals = 1): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  if (!isLoggedIn) {
    return (
      <div className="w-full bg-white rounded-b-lg shadow-sm border-b border-gray-100">
        <div className="p-4 border-b border-gray-100 bg-[#3b3b3b] text-white">
          <h3 className="text-[13px] font-medium">24時間限定ファイル置き場</h3>
        </div>
        <div className="p-4">
          <p className="text-red-500 font-semibold text-[12px]">
          この機能を使用するには会員登録（無料）が必要です。
        </p>
        </div>
      </div>
    );
  }

  const currentTotalMB = files.reduce((sum, f) => sum + (f.size || 0) / (1024 * 1024), 0);

  return (
    <div className="w-full bg-white rounded-b-lg shadow-sm border-b border-gray-100">
      <div className="p-4 border-b border-gray-100 bg-[#3b3b3b] text-white">
        <h3 className="text-[13px] font-medium">24時間限定ファイル置き場</h3>
        <p className="text-[11px] mt-0.5">ファイルを一時的に保存できます。24時間後に自動削除される安全な一時ファイル置き場</p>
      </div>

      <div className="p-4">
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
                {compressionProgress !== null || uploadProgress !== null || status ? (
                  // 処理中・アップロード中の表示
                  <div className="w-full max-w-xs mx-auto">
                    <div className="animate-bounce mb-4 text-blue-500 text-3xl flex justify-center">
                      <FiPackage />
                    </div>
                    <p className="text-sm font-bold text-blue-600 mb-2">{status || '処理中...'}</p>
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
                ) : (
                  // 通常時の表示
                  <>
                    <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-[12px] text-gray-600 mb-2">ファイルをドラッグ＆ドロップ（複数可・フォルダ可）</p>
                    <div className="flex flex-row gap-2 items-center justify-center">
                      <label
                        htmlFor="file-upload"
                        className="inline-flex items-center px-4 py-2 rounded bg-gray-200 text-gray-700 text-[11px] hover:bg-gray-300 cursor-pointer"
                      >
                        ファイルを選択
                      </label>
                      <label
                        htmlFor="folder-upload"
                        className="inline-flex items-center px-4 py-2 rounded bg-blue-100 text-blue-700 text-[11px] hover:bg-blue-200 cursor-pointer"
                      >
                        フォルダを選択
                      </label>
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      onChange={handleFileInput}
                      disabled={compressionProgress !== null || uploadProgress !== null || !!status}
                      className="hidden"
                      multiple
                    />
                    <input
                      id="folder-upload"
                      type="file"
                      onChange={handleFileInput}
                      disabled={compressionProgress !== null || uploadProgress !== null || !!status}
                      className="hidden"
                      webkitdirectory=""
                      multiple
                    />
                    <p className="text-[10px] text-gray-500 mt-2">複数選択可・フォルダ選択可・自動圧縮対応</p>
                  </>
                )}
              </section>
        </div>

            {/* 2. 使用量表示 */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-[12px] font-bold mb-3 text-gray-700 border-b border-gray-200 pb-1">使用量</label>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] text-gray-600">合計容量</span>
                    <span className="text-[11px] font-mono text-gray-700">
                      {currentTotalMB.toFixed(1)}MB / {MAX_TOTAL_SIZE_MB}MB
                    </span>
              </div>
                  <div className="w-full h-2 bg-gray-200 rounded">
                  <div 
                      className="h-2 bg-blue-500 rounded"
                      style={{
                        width: `${Math.min(100, (currentTotalMB / MAX_TOTAL_SIZE_MB) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] text-gray-600">ファイル数</span>
                    <span className="text-[11px] font-mono text-gray-700">
                      {files.length} / {MAX_FILES_COUNT} ファイル
                      </span>
                    </div>
                  </div>
                <div className="text-[10px] text-gray-500 space-y-1">
                  <p>• 1ファイル最大{MAX_FILE_SIZE_MB}MBまで</p>
                  <p className="text-blue-600 font-semibold">• 複数ファイルをドロップすると自動でZIP圧縮されます</p>
                </div>
              </div>
            </div>

            {/* 3. ステータス表示 */}
            {status && (
              <p className="text-[11px] text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">{status}</p>
            )}
          </div>

          {/* --- 右カラム：結果・出力 --- */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 flex flex-col h-full min-h-[300px]">
            <label className="block text-[12px] font-bold mb-3 text-gray-700 border-b border-gray-200 pb-1">アップロード済みファイル</label>

            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {files.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                  <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-[11px]">まだアップロードされたファイルはありません</p>
                </div>
              ) : (
                files.map((file) => {
                  const remainingHours = file.expiresAt
                    ? Math.ceil((file.expiresAt.toMillis() - Date.now()) / (1000 * 60 * 60))
                    : null;
                  const isExpired = file.expiresAt ? file.expiresAt.toMillis() < Date.now() : false;
                  return (
                    <div key={file.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold text-gray-800 truncate">{file.name}</p>
                          <p className="text-[11px] text-gray-500">{file.size && formatBytes(file.size)}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {file.createdAt ? (() => {
                              try {
                                return file.createdAt.toDate().toLocaleString();
                              } catch (e) {
                                try {
                                  return new Date(file.createdAt.toMillis()).toLocaleString();
                                } catch (e2) {
                                  return '-';
                                }
                              }
                            })() : '-'}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="px-2 py-1 rounded text-[10px] font-semibold bg-red-500 text-white hover:bg-red-600 ml-2"
                          onClick={() => handleDelete(file)}
                        >
                          削除
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
                        <div className="flex items-center gap-2 mt-2">
                  <button
                            type="button"
                            className={`px-2 py-0.5 border rounded text-[10px] flex items-center gap-1 ${
                              downloadingFileId === file.id 
                                ? 'bg-gray-100 cursor-wait opacity-70' 
                                : 'hover:bg-gray-100'
                            }`}
                            onClick={() => handleFileClick(file)}
                            disabled={downloadingFileId === file.id}
                          >
                            {downloadingFileId === file.id ? (
                              <>
                                <svg 
                                  className="animate-spin h-3 w-3" 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  fill="none" 
                                  viewBox="0 0 24 24"
                                >
                                  <circle 
                                    className="opacity-25" 
                                    cx="12" 
                                    cy="12" 
                                    r="10" 
                                    stroke="currentColor" 
                                    strokeWidth="4"
                                  />
                                  <path 
                                    className="opacity-75" 
                                    fill="currentColor" 
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  />
                                </svg>
                                ダウンロード中...
                              </>
                            ) : (
                              <>
                                <FiDownload className="w-3 h-3 inline" />
                                ダウンロード
                              </>
                            )}
                  </button>
                </div>
                      </div>
                    </div>
                  );
                })
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TempStorage;

