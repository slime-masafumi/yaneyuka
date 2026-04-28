/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

// 頂いた画像の設定値を反映しました
const firebaseConfig = {
  apiKey: "AIzaSyC8ndxDYvNRRyEthj7E8U7lD5XBjDDj_b4",
  authDomain: "testsite-7f2a6.firebaseapp.com",
  projectId: "testsite-7f2a6",
  storageBucket: "testsite-7f2a6.firebasestorage.app",
  messagingSenderId: "715554725653",
  appId: "1:715554725653:web:79ecd13166299c8e5cd31c",
  measurementId: "G-32P20Q14XS"
};

// Firebase初期化
if (firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] バックグラウンドメッセージ:', payload);
  
  const notificationTitle = payload.notification?.title || 'YyChat';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/favicon.png',
    tag: payload.data?.roomId ? `chat-${payload.data.roomId}` : 'chat'
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.roomId 
    ? `/userpage?room=${event.notification.data.roomId}`
    : '/userpage';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
