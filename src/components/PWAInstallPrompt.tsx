'use client';

import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    deferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

interface PWAInstallPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 既にインストールされているかチェック
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      if (isStandalone || isIOSStandalone) {
        setIsInstalled(true);
        return;
      }
    }

    // windowオブジェクトからdeferredPromptを取得
    if (typeof window !== 'undefined' && window.deferredPrompt) {
      setDeferredPrompt(window.deferredPrompt);
    }

    // インストール完了を検知
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      if (typeof window !== 'undefined') {
        window.deferredPrompt = null;
      }
      onClose();
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onClose]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('ユーザーがインストールを承認しました');
      } else {
        console.log('ユーザーがインストールを拒否しました');
      }
      
      setDeferredPrompt(null);
      // ★修正箇所: 定義されていない setShowPrompt(false) を onClose() に変更
      onClose();
    } catch (error) {
      console.error('インストールプロンプトの表示に失敗しました:', error);
    }
  };

  const handleDismiss = () => {
    // 1ヶ月後に再度表示できるようにする
    if (typeof window !== 'undefined') {
      const oneMonth = 30 * 24 * 60 * 60 * 1000;
      const nextShowTime = Date.now() + oneMonth;
      localStorage.setItem('pwa-install-dismissed', nextShowTime.toString());
    }
    onClose();
  };

  if (isInstalled || !isOpen || !deferredPrompt) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2147483647]"
      style={{ zIndex: 2147483647 }}
      onClick={handleDismiss}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start mb-4">
          <div className="flex-shrink-0 mr-4">
            <img
              src="/image/ファビコンb.png"
              alt="yaneyuka"
              className="w-16 h-16 rounded-lg"
            />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              yaneyukaをインストール
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              yaneyuka - 建築・建設業界の業務支援ポータルサイト
            </p>
            <p className="text-xs text-gray-500">
              {typeof window !== 'undefined' ? window.location.hostname : 'localhost:3000'}
            </p>
          </div>
        </div>

        {/* 説明文を追加 */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-gray-700 leading-relaxed">
            <strong className="text-blue-700">yaneyukaをアプリとしてインストールすると：</strong>
            <br />
            • ホーム画面から直接起動できます
            <br />
            • ブラウザのタブなしで快適にご利用いただけます
            <br />
            • オフラインでも一部機能がご利用いただけます
            <br />
            <span className="text-xs text-gray-600 mt-2 block">
              建築設計・施工・設備・メーカー・職人まで建設業界全体を支援する業務効率化ポータルサイトです。
            </span>
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleInstallClick}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            インストール
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
