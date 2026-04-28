'use client';

import { useEffect } from 'react';

export default function ClientSideEffects() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    // PWAインストールプロンプトのイベントをグローバルにキャッチ
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // グローバルエラーハンドラーを設定
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        stack: event.error?.stack,
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason && typeof reason === 'object') {
        const errorCode = (reason as any)?.code;
        const errorMessage = (reason as any)?.message || String(reason);

        // Firebase Messaging関連のエラーを抑制
        if (
          errorCode === 'messaging/unsupported-browser' ||
          errorMessage?.includes('messaging/unsupported-browser') ||
          errorMessage?.includes('Firebase Messaging') ||
          errorMessage?.includes('This browser doesn\'t support the API')
        ) {
          console.log('Firebase Messagingのサポートされていないブラウザエラーを抑制しました。');
          event.preventDefault();
          return;
        }
      }

      console.error('Unhandled promise rejection:', {
        reason: event.reason,
        stack: event.reason?.stack,
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  return null;
}
