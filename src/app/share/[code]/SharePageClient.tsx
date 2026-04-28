'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, Timestamp, setDoc, increment } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';
import { app, db } from '@/lib/firebaseClient';

const storage = getStorage(app);

type ShareDoc = {
  path?: string;
  downloadUrl?: string;
  fileName?: string;
  expiresAt?: Timestamp | null;
  fileId?: string;
  owner?: string;
};

function getMonthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export default function SharePageClient({ code }: { code: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string>('リンクを確認しています...');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const shareRef = doc(db, 'shareLinks', code);
        const snap = await getDoc(shareRef);
        if (!snap.exists()) {
          if (!cancelled) setMessage('共有リンクが見つかりませんでした。');
          return;
        }
        const data = snap.data() as ShareDoc;
        if (!data.path) {
          if (!cancelled) setMessage('共有リンクの情報が不完全です。');
          return;
        }
        if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
          if (!cancelled) setMessage('この共有リンクは期限切れです。');
          return;
        }

        if (!cancelled) {
          setMessage('ファイルの準備ができました');
          setFileName(data.fileName);
          
          // ダウンロードURLを取得（使用量更新はボタンクリック時に行う）
          const url =
            data.downloadUrl ||
            (await getDownloadURL(ref(storage, data.path as string)));
          if (!cancelled) {
            setDownloadUrl(url);
          }
        }
      } catch (error) {
        console.error('[share] failed to resolve link', error);
        if (!cancelled) setMessage('リンクの処理中にエラーが発生しました。');
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleDownload = async () => {
    if (!downloadUrl) return;
    
    // ファイルサイズを取得して使用量を更新
    let fileSize = 0;
    try {
      const shareRef = doc(db, 'shareLinks', code);
      const snap = await getDoc(shareRef);
      if (snap.exists()) {
        const data = snap.data() as ShareDoc;
        if (data.fileId) {
          const uploadRef = doc(db, 'uploads', data.fileId);
          const uploadSnap = await getDoc(uploadRef);
          if (uploadSnap.exists()) {
            fileSize = uploadSnap.data().size || 0;
          }
        }
        
        // 使用量を更新（非同期で実行、エラーが発生してもダウンロードは続行）
        if (fileSize > 0) {
          const monthKey = getMonthKey();
          const siteUsageRef = doc(db, 'usage', `site_${monthKey}`);
          setDoc(
            siteUsageRef,
            {
              downloadedBytes: increment(fileSize),
            },
            { merge: true },
          ).catch(error => {
            console.error('使用量更新に失敗', error);
          });
          
          // オーナーの使用量も更新
          if (data.owner) {
            const userUsageRef = doc(db, 'usage', `${data.owner}_${monthKey}`);
            setDoc(
              userUsageRef,
              {
                downloadedBytes: increment(fileSize),
              },
              { merge: true },
            ).catch(error => {
              console.error('ユーザー使用量更新に失敗', error);
            });
          }
        }
      }
    } catch (error) {
      console.error('使用量更新処理に失敗', error);
    }
    
    // ダウンロードを開始
    window.location.href = downloadUrl;
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg p-6 space-y-4 text-center">
        <div className="mb-4">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">yaneyuka</h1>
          <p className="text-sm text-gray-600 font-semibold">建築・建設業界の業務支援ポータルサイト</p>
        </div>
        <p className="text-sm text-gray-600">{message}</p>
        {downloadUrl && (
          <div className="space-y-3">
            {fileName && <p className="text-xs text-gray-500 break-all">ファイル名: {fileName}</p>}
            <button
              type="button"
              onClick={handleDownload}
              className="px-6 py-3 rounded text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#1DAD95' }}
            >
              共有ファイルをダウンロード
            </button>
          </div>
        )}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <a
            href="https://yaneyuka.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            yaneyuka.com を開く
          </a>
        </div>
        <button
          type="button"
          onClick={handleBack}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          トップページへ戻る
        </button>
      </div>
    </div>
  );
}

