// APIエンドポイント
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
  },
  CONTENT: '/api/content',
  CONTACT: '/api/contact',
} as const

// カテゴリー定数
export const CATEGORIES = {
  EVENT: 'event',
  PRODUCT: 'product',
  BOOK: 'book',
  SOFTWARE: 'software',
  JOB: 'job',
  CAD: 'cad',
} as const

// メッセージ定数
export const MESSAGES = {
  SUCCESS: {
    LOGIN: 'ログインに成功しました',
    REGISTER: '登録が完了しました',
    CONTACT: 'お問い合わせを送信しました',
  },
  ERROR: {
    LOGIN: 'ログインに失敗しました',
    REGISTER: '登録に失敗しました',
    NETWORK: 'ネットワークエラーが発生しました',
  },
} as const 