import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, initializeFirestore, enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAnalytics, isSupported, type Analytics, logEvent as gaLogEvent } from 'firebase/analytics'
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging'

// 必須環境変数のバリデーション
// 注意: Next.jsのwebpackは process.env.NEXT_PUBLIC_XXX の静的アクセスのみインライン化する
//       process.env[dynamicKey] はインライン化されないため、直接参照でチェックする
const missingEnv: string[] = []
if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) missingEnv.push('NEXT_PUBLIC_FIREBASE_API_KEY')
if (!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) missingEnv.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN')
if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) missingEnv.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID')
if (!process.env.NEXT_PUBLIC_FIREBASE_APP_ID) missingEnv.push('NEXT_PUBLIC_FIREBASE_APP_ID')
if (missingEnv.length > 0) {
  const msg = `Firebase必須環境変数が未設定です: ${missingEnv.join(', ')}。.env.localを確認してください。`
  console.error(msg)
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

export const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig)
export const auth = getAuth(app)
// メール文言を日本語に
auth.languageCode = 'ja'
// Firestoreの初期化
// initializeFirestoreとgetFirestoreの両方を呼ぶとエラーになるため、一度だけ初期化
let dbInstance: ReturnType<typeof getFirestore> | null = null;

if (typeof window !== 'undefined') {
  try { 
    // ブラウザ環境では設定付きで初期化
    dbInstance = initializeFirestore(app, { 
      experimentalAutoDetectLongPolling: true, 
      ignoreUndefinedProperties: true as any 
    });
  } catch (error: any) {
    // 既に初期化されている場合はgetFirestoreを使用
    if (error?.code === 'failed-precondition') {
      dbInstance = getFirestore(app);
    } else {
      console.warn('Firestore初期化エラー、デフォルト設定で再試行:', error);
      dbInstance = getFirestore(app);
    }
  }
} else {
  dbInstance = getFirestore(app);
}

export const db = dbInstance!
// Firebase Storageの初期化
export const storage = getStorage(app)
// オフライン永続化（IndexedDB）
if (typeof window !== 'undefined') {
  // 複数タブ対応。失敗したらシングルタブ永続化にフォールバック
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    console.warn('マルチタブ永続化失敗、シングルタブにフォールバック:', err?.code || err)
    return enableIndexedDbPersistence(db).catch((err2) => {
      console.warn('IndexedDB永続化失敗:', err2?.code || err2)
    })
  })
}

// Firebase Analytics（ブラウザのみ、サポート時）
export let analytics: Analytics | null = null
if (typeof window !== 'undefined') {
  isSupported().then((ok) => {
    if (ok) {
      try { analytics = getAnalytics(app) } catch (err) { console.warn('Analytics初期化失敗:', err) }
    }
  })
}

export function logEvent(eventName: string, params?: Record<string, any>) {
  if (analytics) {
    try { gaLogEvent(analytics, eventName, params) } catch (err) { console.warn('logEvent失敗:', err) }
  }
}

// Firebase Cloud Messaging（ブラウザのみ、Service Workerが利用可能な場合）
// Safariなど、Firebase Messagingをサポートしていないブラウザでは初期化をスキップ
export let messaging: Messaging | null = null
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // ブラウザサポートのチェック（Push APIとNotification APIが必要）
  const isMessagingSupported = 
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    ('Notification' in window || 'webkitNotifications' in window);
  
  if (!isMessagingSupported) {
    // Safariなど、Firebase Messagingをサポートしていないブラウザでは初期化をスキップ
    console.log('⚠️ このブラウザはFirebase Messagingをサポートしていません。プッシュ通知機能は使用できませんが、アプリの動作には影響しません。')
  } else {
    try {
      // messagingSenderIdとappIdが設定されている場合のみ初期化を試みる
      if (process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID && process.env.NEXT_PUBLIC_FIREBASE_APP_ID) {
        messaging = getMessaging(app)
      } else {
        console.warn('⚠️ Firebase Messagingの設定が不完全です。messagingSenderIdまたはappIdが設定されていません。')
      }
    } catch (error: any) {
      // 403 PERMISSION_DENIEDエラーは、FCM APIが有効化されていない場合に発生するが、アプリの動作には影響しない
      if (error?.code === 'installations/request-failed' || error?.message?.includes('PERMISSION_DENIED')) {
        console.warn('⚠️ Firebase Cloud Messaging APIが有効化されていないか、権限が不足しています。プッシュ通知機能は使用できませんが、アプリの動作には影響しません。')
      } else if (error?.code === 'messaging/unsupported-browser') {
        // Safariなど、サポートされていないブラウザの場合
        console.log('⚠️ このブラウザはFirebase Messagingをサポートしていません。プッシュ通知機能は使用できませんが、アプリの動作には影響しません。')
      } else {
        console.warn('Firebase Messagingの初期化に失敗しました:', error)
      }
    }
  }
}

// Service Workerの登録を待つ関数
async function waitForServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  try {
    // 既に登録されているService Workerを取得
    const registration = await navigator.serviceWorker.ready
    if (registration && registration.active) {
      console.log('[getFCMToken] Service Workerがアクティブです')
      return registration
    }

    // Service Workerがアクティブになるまで待つ（最大10秒）
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('[getFCMToken] Service Workerの待機がタイムアウトしました')
        resolve(null)
      }, 10000)

      navigator.serviceWorker.ready.then((reg) => {
        clearTimeout(timeout)
        if (reg && reg.active) {
          console.log('[getFCMToken] Service Workerがアクティブになりました')
          resolve(reg)
        } else {
          console.warn('[getFCMToken] Service Workerがアクティブではありません')
          resolve(null)
        }
      }).catch((error) => {
        clearTimeout(timeout)
        console.error('[getFCMToken] Service Workerの待機中にエラー:', error)
        resolve(null)
      })
    })
  } catch (error) {
    console.error('[getFCMToken] Service Workerの取得に失敗しました:', error)
    return null
  }
}

// FCMトークンを取得する関数
export async function getFCMToken(): Promise<string | null> {
  if (!messaging) {
    console.warn('[getFCMToken] Firebase Messagingが利用できません')
    return null
  }

  try {
    // Service Workerがアクティブになるまで待つ
    console.log('[getFCMToken] Service Workerの登録を待っています...')
    const registration = await waitForServiceWorkerRegistration()
    if (!registration) {
      console.warn('[getFCMToken] Service Workerが登録されていません。FCMトークンの取得をスキップします。')
      return null
    }

    // VAPIDキーは環境変数から取得（後で設定が必要）
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    if (!vapidKey) {
      console.error('[getFCMToken] VAPIDキーが設定されていません。.env.localファイルにNEXT_PUBLIC_FIREBASE_VAPID_KEYを設定してください。')
      return null
    }

    console.log('[getFCMToken] VAPIDキーが設定されています。FCMトークンを取得します...')
    const token = await getToken(messaging, { vapidKey })
    if (token) {
      console.log('[getFCMToken] FCMトークン取得成功:', token.substring(0, 20) + '...')
    } else {
      console.warn('[getFCMToken] FCMトークンがnullです')
    }
    return token
  } catch (error: any) {
    console.error('[getFCMToken] FCMトークンの取得に失敗しました:', error)
    if (error.code) {
      console.error('[getFCMToken] エラーコード:', error.code)
    }
    if (error.message) {
      console.error('[getFCMToken] エラーメッセージ:', error.message)
    }
    return null
  }
}

// フォアグラウンドメッセージの処理
export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) {
    console.warn('Firebase Messagingが利用できません')
    return () => {}
  }

  return onMessage(messaging, callback)
}


