'use client';

import dynamic from 'next/dynamic';

// カルテは localStorage に保存する端末内アプリなので SSR しない。
// 初期化時にストレージと URL クエリを同期的に読めるのはこのためでもある。
const KarteApp = dynamic(() => import('@/components/karte/KarteApp'), {
  ssr: false,
  loading: () => <div className="yk-empty-state">読み込み中...</div>,
});

export default function KarteLoader() {
  return <KarteApp />;
}
