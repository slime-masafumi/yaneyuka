/**
 * Service Workerの初期化
 * 環境変数からFirebase設定を読み込んでService Workerを登録
 */

export async function initServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('[initServiceWorker] Service Workerが利用できません');
    return null;
  }

  // ローカル開発環境ではService Workerのエラーを抑制
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname === '');

  try {
    // 既に登録されているService Workerを確認
    const existingRegistration = await navigator.serviceWorker.getRegistration('/');
    if (existingRegistration && existingRegistration.active) {
      console.log('[initServiceWorker] 既存のService Workerが見つかりました');
      
      // Firebase設定をService Workerに送信
      if (existingRegistration.active) {
        existingRegistration.active.postMessage({
          type: 'FIREBASE_CONFIG',
          config: {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
          },
        });
      }
      
      return existingRegistration;
    }

    // 静的ファイルを優先的に使用（リダイレクトエラーを回避）
    console.log('[initServiceWorker] 静的Service Workerを登録します...');
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    });

    console.log('[initServiceWorker] Service Worker登録成功');

    // Firebase設定をService Workerに送信
    if (registration.active) {
      registration.active.postMessage({
        type: 'FIREBASE_CONFIG',
        config: {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        },
      });
    } else if (registration.installing) {
      registration.installing.addEventListener('statechange', () => {
        if (registration.installing?.state === 'activated' && registration.active) {
          registration.active.postMessage({
            type: 'FIREBASE_CONFIG',
            config: {
              apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
              authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
              projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
              storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
              messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
              appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
            },
          });
        }
      });
    }

    // Service Workerがアクティブになるまで待つ（最大10秒）
    if (registration.installing) {
      console.log('[initServiceWorker] Service Workerをインストール中...');
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Service Workerのインストールがタイムアウトしました'));
        }, 10000);

        registration.installing!.addEventListener('statechange', () => {
          if (registration.installing!.state === 'activated') {
            clearTimeout(timeout);
            console.log('[initServiceWorker] Service Workerがアクティブになりました');
            resolve();
          }
        });
      });
    } else if (registration.waiting) {
      console.log('[initServiceWorker] Service Workerが待機中です');
      // 既存のService Workerをスキップして新しいものを有効化
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else if (registration.active) {
      console.log('[initServiceWorker] Service Workerが既にアクティブです');
    }

    return registration;
  } catch (error) {
    console.error('[initServiceWorker] Service Worker登録エラー:', error);
    return null;
  }
}

