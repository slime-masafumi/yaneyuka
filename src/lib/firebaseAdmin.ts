import { cert, getApps, initializeApp, App, applicationDefault } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

// Server-side Firebase Admin 初期化。
// FIREBASE_SERVICE_ACCOUNT_JSON 環境変数にサービスアカウントJSON（文字列）を設定する。
// Firebase Functions / Cloud Run 環境では自動的にADCが使われるためJSONは不要。
// 設定が無い場合は null を返し、呼び出し側でフォールバック動作を選択できる。

let _db: Firestore | null = null
let _initFailed = false

export function getAdminDb(): Firestore | null {
  if (_db) return _db
  if (_initFailed) return null
  try {
    if (getApps().length === 0) {
      const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      let app: App
      if (json) {
        const serviceAccount = JSON.parse(json)
        app = initializeApp({ credential: cert(serviceAccount) })
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE) {
        // Cloud Run / Firebase Functions の Application Default Credentials
        app = initializeApp({ credential: applicationDefault() })
      } else {
        console.warn('[firebaseAdmin] サービスアカウント未設定（FIREBASE_SERVICE_ACCOUNT_JSON / ADC）。Firestore蓄積はスキップ。')
        _initFailed = true
        return null
      }
      void app
    }
    _db = getFirestore()
    return _db
  } catch (e) {
    console.error('[firebaseAdmin] init error:', e)
    _initFailed = true
    return null
  }
}
