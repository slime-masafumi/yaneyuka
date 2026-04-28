'use client';

import React, { useEffect, useState } from 'react';

interface SiteGateProps {
  password?: string;
}

const DEFAULT_PASSWORD = 'slime';

const SiteGate: React.FC<SiteGateProps> = ({ password = DEFAULT_PASSWORD }) => {
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    try {
      const granted = typeof window !== 'undefined' && window.localStorage.getItem('siteAccessGranted');
      // URLパラメータでの解除: ?unlock=<password>
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const unlock = params?.get('unlock');
      if (unlock && unlock === password) {
        window.localStorage.setItem('siteAccessGranted', 'true');
        setAuthorized(true);
        return;
      }
      if (granted === 'true') {
        setAuthorized(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (input.trim() === password) {
      try {
        window.localStorage.setItem('siteAccessGranted', 'true');
      } catch {
        // ignore
      }
      setAuthorized(true);
      setError('');
    } else {
      setError('パスワードが違います');
    }
  };

  if (authorized) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-lg p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">閲覧パスワード</h2>
        <p className="text-sm text-gray-600 mb-4">サイト全体を閲覧するにはパスワードを入力してください。</p>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
            placeholder="パスワード"
            autoFocus
          />
          {error && <div className="text-xs text-red-600">{error}</div>}
          <button
            type="submit"
            className="w-full bg-gray-800 hover:bg-gray-700 text-white text-sm py-2 rounded transition"
          >
            送信
          </button>
        </form>
      </div>
    </div>
  );
};

export default SiteGate;


