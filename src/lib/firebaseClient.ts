import { initializeApp, getApps } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore, initializeFirestore, enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence } from 'firebase/firestore'
import { connectStorageEmulator, getStorage } from 'firebase/storage'
// 解析(analytics)とプッシュ通知(messaging)は、要るときだけ読み込む(2026-11-15)。
// 以前は全ページの最初の読み込みに入っていた。解析は同意した人だけ、通知は今どこからも使っていない
import type { Analytics } from 'firebase/analytics'
import type { Messaging } from 'firebase/messaging'

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

/*
 * 手元の試験用 Firebase(エミュレータ)につなぐ。npm run dev:emu のときだけ(2026-11-16)。
 * ログインが要る画面(yychat・事務所・設定など)を、本番のデータに触れずに試すため。
 * 本番のビルドには NEXT_PUBLIC_USE_EMULATORS を入れず、localhost 以外では動かない。
 */
// 本番のドメインでは値があっても使わない(localhost で開いたときだけ)
const USE_EMULATORS =
  process.env.NEXT_PUBLIC_USE_EMULATORS === '1' &&
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
if (USE_EMULATORS && typeof window !== 'undefined') {
  const w = window as unknown as { __yyEmu?: boolean }
  if (!w.__yyEmu) {
    w.__yyEmu = true
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
    connectStorageEmulator(storage, '127.0.0.1', 9199)
  }
}
// オフライン永続化（IndexedDB）
if (typeof window !== 'undefined' && !USE_EMULATORS) {
  // 複数タブ対応。失敗したらシングルタブ永続化にフォールバック
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    console.warn('マルチタブ永続化失敗、シングルタブにフォールバック:', err?.code || err)
    return enableIndexedDbPersistence(db).catch((err2) => {
      console.warn('IndexedDB永続化失敗:', err2?.code || err2)
    })
  })
}

// Firebase Analytics（ブラウザのみ、サポート時）
// クッキー同意のバナー(CookieConsent.tsx)が「解析は同意後のみ有効化」と書いているので、
// 同意(consent:v1 の status = all)を見てから起動する。同意した瞬間は 'yy-consent' イベントで起動する。2026-11-14
export let analytics: Analytics | null = null
function consented(): boolean {
  try {
    return JSON.parse(localStorage.getItem('consent:v1') || 'null')?.status === 'all'
  } catch {
    return false
  }
}
let gaLogEvent: typeof import('firebase/analytics').logEvent | null = null
let analyticsLoading = false
function startAnalytics() {
  if (analytics || analyticsLoading || !consented()) return
  analyticsLoading = true
  import('firebase/analytics')
    .then(async (m) => {
      if (!(await m.isSupported()) || analytics) return
      try {
        analytics = m.getAnalytics(app)
        gaLogEvent = m.logEvent
      } catch (err) {
        console.warn('Analytics初期化失敗:', err)
      }
    })
    .catch((err) => console.warn('Analytics読み込み失敗:', err))
    .finally(() => {
      analyticsLoading = false
    })
}
if (typeof window !== 'undefined') {
  startAnalytics()
  window.addEventListener('yy-consent', startAnalytics)
}

export function logEvent(eventName: string, params?: Record<string, any>) {
  if (analytics && gaLogEvent) {
    try { gaLogEvent(analytics, eventName, params) } catch (err) { console.warn('logEvent失敗:', err) }
  }
}

// Firebase Cloud Messaging（ブラウザのみ、Service Workerが利用可能な場合）
// Safariなど、Firebase Messagingをサポートしていないブラウザでは初期化をスキップ
let messaging: Messaging | null = null
let messagingApi: typeof import('firebase/messaging') | null = null
/** 通知が使えるブラウザなら messaging を用意する(初回だけ firebase/messaging を読み込む) */
async function loadMessaging(): Promise<Messaging | null> {
  if (messaging) return messaging
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return null
  if (!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || !process.env.NEXT_PUBLIC_FIREBASE_APP_ID) return null
  try {
    messagingApi = await import('firebase/messaging')
    if (!(await messagingApi.isSupported())) return null
    messaging = messagingApi.getMessaging(app)
    return messaging
  } catch (error: any) {
    console.warn('Firebase Messagingの初期化に失敗しました:', error?.code || error)
    return null
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
  const messaging = await loadMessaging()
  if (!messaging || !messagingApi) {
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
    const token = await messagingApi.getToken(messaging, { vapidKey })
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
  let off: () => void = () => {}
  let stopped = false
  loadMessaging().then((m) => {
    if (!m || !messagingApi || stopped) return
    off = messagingApi.onMessage(m, callback)
  })
  return () => {
    stopped = true
    off()
  }
}


