'use client';

import { lazy } from 'react';
import AfterMount from '@/components/AfterMount';

// カルテは localStorage に保存する端末内アプリなので SSR しない。
// 初期化時にストレージと URL クエリを同期的に読めるのはこのためでもある。
const KarteApp = lazy(() => import('@/components/karte/KarteApp'));

export default function KarteLoader() {
  return (
    <AfterMount fallback={<div className="yk-empty-state">読み込み中...</div>}>
      <KarteApp />
    </AfterMount>
  );
}
