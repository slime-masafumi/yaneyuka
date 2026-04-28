import { NextResponse, NextRequest } from 'next/server'

// 1) ドメイン集約: 非本番ドメインから本番ドメインへ301
const CANONICAL_HOST = 'yaneyuka.com'
const NON_CANONICAL_HOSTS = new Set([
  'testsite-7f2a6.web.app',
  'testsite-7f2a6.firebaseapp.com',
])

export function middleware(req: NextRequest) {
  // 開発環境ではミドルウェアを無効化（静的アセットの配信に影響しないように）
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next()
  }
  const { nextUrl } = req
  const host = req.headers.get('host') || ''

  if (NON_CANONICAL_HOSTS.has(host)) {
    const url = new URL(nextUrl)
    url.host = CANONICAL_HOST
    url.protocol = 'https:'
    return NextResponse.redirect(url, 301)
  }

  // 2) 認証ページ制御（簡易版）: /userpageはログイン前提（後続で拡張可）
  // ここではローカル開発や静的運用に配慮し、認証の強制はしない。
  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }