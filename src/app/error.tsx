'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // エラーをコンソールに記録
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">エラーが発生しました</h2>
        <p className="text-gray-600 mb-6">
          申し訳ございません。アプリケーションでエラーが発生しました。
        </p>
        <div className="mb-6 p-4 bg-red-50 rounded border border-red-200 text-left">
          <p className="text-sm text-red-800 font-mono break-all">
            {error.message || 'Unknown error'}
          </p>
          {error.stack && (
            <pre className="text-xs text-red-600 mt-2 overflow-auto max-h-40">
              {error.stack}
            </pre>
          )}
          {error.digest && (
            <p className="text-xs text-red-600 mt-2">
              エラーID: {error.digest}
            </p>
          )}
        </div>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            再試行
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/';
              }
            }}
            className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    </div>
  );
}









