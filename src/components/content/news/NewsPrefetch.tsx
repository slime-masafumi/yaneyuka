"use client"

import { useEffect } from 'react'

// NEWSの初回アクセス時プリフェッチ用の軽量クライアント。
// 結果はセッション中にメモリキャッシュとして保持される（NewsFeed側のfetchは都度実行されるが、
// ブラウザHTTPキャッシュやプロキシのno-store制御に依存）。
// ここではウォームアップ目的で事前に複数RSSへアクセスし、タイムアウト時の1回目失敗を避ける。

export default function NewsPrefetch() {
  useEffect(() => {
    // クライアント直取得はブロック/451になるため停止
    // ウォームアップはサーバAPIに任せる
  }, [])
  return null
}


