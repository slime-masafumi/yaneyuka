'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

type ShareDoc = {
  path?: string;
  fileName?: string;
  expiresAt?: Timestamp | null;
  fileId?: string;
  owner?: string;
};

export default function SharePageClient({ code }: { code: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string>('リンクを確認しています...');
  // 実ダウンロードURLはここでは持たない。
  // shareLinks はコードを知っていれば誰でも読めるため、URLを画面に載せると
  // /api/share/download の帯域チェックと計測を通さずに落とせてしまう。
  // このフラグはボタンを出してよいかだけを表す。
  const [isReady, setIsReady] = useState(false);
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  const [isDownloading, setIsDownloading] = useState(false);
  // 合言葉つきのリンク。最初のダウンロードで「要る」と返ってきたら入力欄を出す
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');

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
          setIsReady(true);
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
    if (!isReady || isDownloading) return;
    setIsDownloading(true);

    // 使用量の記録と帯域上限の判定、そして実URLの払い出しはすべてサーバー側で行う。
    // 共有リンクの受け取り手は未ログインのため、ブラウザからは
    // uploads/{fileId} を読むことも usage/* に書くこともルールで許可されておらず、
    // これまで downloadedBytes は一度も増えていなかった（＝帯域上限が機能していなかった）。
    let url: string;
    try {
      const resp = await fetch('/api/share/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(needsPassword ? { code, password } : { code }),
      });
      const result = await resp.json().catch(() => null);

      if (!resp.ok || !result?.ok || typeof result.downloadUrl !== 'string') {
        setIsDownloading(false);
        if (result?.reason === 'password_required') {
          setNeedsPassword(true);
          setMessage('このファイルには合言葉がかかっています。送り主から聞いた合言葉を入れてください。');
        } else if (result?.reason === 'wrong_password') {
          setNeedsPassword(true);
          setMessage('合言葉が違います。');
        } else if (result?.reason === 'too_many_attempts') {
          setMessage('合言葉の入れ間違いが続いたため、しばらく受け付けません。1時間ほどおいてお試しください。');
        } else if (result?.reason === 'expired') {
          setMessage('この共有リンクは期限切れです。');
          setIsReady(false);
        } else if (result?.reason === 'site_bandwidth_exceeded') {
          setMessage('今月のダウンロード帯域の上限に達しているため、現在ダウンロードできません。時間をおいてお試しください。');
        } else if (result?.reason === 'too_many_requests') {
          setMessage('このリンクへのアクセスが集中しています。しばらく時間をおいてお試しください。');
        } else {
          setMessage('ダウンロードを開始できませんでした。時間をおいて再度お試しください。');
        }
        return;
      }
      url = result.downloadUrl;
    } catch (error) {
      console.error('ダウンロード記録に失敗', error);
      setIsDownloading(false);
      setMessage('ダウンロードを開始できませんでした。時間をおいて再度お試しください。');
      return;
    }

    // ダウンロードを開始
    window.location.href = url;
    setIsDownloading(false);
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
        {isReady && (
          <div className="space-y-3">
            {fileName && <p className="text-xs text-gray-500 break-all">ファイル名: {fileName}</p>}
            {needsPassword && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && password) void handleDownload(); }}
                placeholder="合言葉"
                autoComplete="off"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            )}
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading || (needsPassword && !password)}
              className="px-6 py-3 rounded text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-wait"
              style={{ backgroundColor: '#1DAD95' }}
            >
              {isDownloading ? '準備中...' : '共有ファイルをダウンロード'}
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

