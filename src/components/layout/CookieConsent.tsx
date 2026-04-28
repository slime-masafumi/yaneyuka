'use client';

import React, { useEffect, useState } from 'react';

const CONSENT_KEY = 'consent:v1';

interface ConsentData {
  status: 'all' | 'deny';
  timestamp: number;
}

const CookieConsent: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (!stored) {
        // 保存されていない場合は表示（初回のみ）
        setOpen(true);
      }
      // 保存されている場合は表示しない（一度保存されたら二度と表示しない）
    } catch {}
  }, []);

  const handleConsent = (status: 'all' | 'deny') => {
    try {
      const consentData: ConsentData = {
        status,
        timestamp: Date.now(),
      };
      localStorage.setItem(CONSENT_KEY, JSON.stringify(consentData));
    } catch {}
    setOpen(false);
  };

  if (!open) return null;
  return (
    <div className="fixed bottom-2 left-2 right-2 md:left-auto md:w-[360px] bg-white border rounded shadow p-2 text-[12px] z-[9999]">
      <div className="font-semibold mb-1 text-[12px]">クッキーとローカル保存について</div>
      <p className="text-gray-700 mb-2 leading-5">
        体験向上のため、設定や閲覧状態をブラウザに保存します。解析は同意後のみ有効化します。
      </p>
      <div className="flex gap-2 justify-end">
        <button
          className="px-2 py-1 text-[11px] border rounded"
          onClick={() => handleConsent('deny')}
        >
          拒否する
        </button>
        <button
          className="px-2 py-1 text-[11px] bg-emerald-600 text-white rounded"
          onClick={() => handleConsent('all')}
        >
          同意する
        </button>
      </div>
    </div>
  );
};

export default CookieConsent;


