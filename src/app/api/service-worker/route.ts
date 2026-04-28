import { NextResponse } from 'next/server';

/**
 * Service Workerを動的に生成するAPIルート
 * 環境変数を埋め込んだService Workerを返す
 */
export async function GET() {
  const serviceWorkerCode = `
// Firebase Cloud Messaging Service Worker
// このファイルは動的に生成されます

importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

// Firebase設定
const firebaseConfig = {
  apiKey: '${process.env.NEXT_PUBLIC_FIREBASE_API_KEY || ''}',
  authDomain: '${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || ''}',
  projectId: '${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ''}',
  storageBucket: '${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || ''}',
  messagingSenderId: '${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || ''}',
  appId: '${process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''}',
};

// Firebase初期化
let messaging = null;
try {
  firebase.initializeApp(firebaseConfig);
  console.log('[firebase-messaging-sw.js] Firebase初期化完了');
  // メッセージングインスタンスを取得（初期化後に）
  messaging = firebase.messaging();
} catch (error) {
  console.error('[firebase-messaging-sw.js] Firebase初期化エラー:', error);
}

// バックグラウンドメッセージの処理
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] バックグラウンドメッセージを受信:', payload);
    
    const notificationTitle = payload.notification?.title || '新しいメッセージ';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.content || '',
      icon: '/favicon.png',
      badge: '/favicon.png',
      tag: payload.data?.roomId || 'chat',
      data: payload.data,
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] 通知がクリックされました:', event);
  
  event.notification.close();
  
  // チャットページを開く
  const urlToOpen = event.notification.data?.roomId 
    ? '/userpage?room=' + event.notification.data.roomId
    : '/userpage';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 既に開いているウィンドウがあればそこにフォーカス
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // 新しいウィンドウを開く
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
`;

  return new NextResponse(serviceWorkerCode, {
    headers: {
      'Content-Type': 'application/javascript',
      'Service-Worker-Allowed': '/',
    },
  });
}

