'use client';

import { lazy } from 'react';
import AfterMount from '@/components/AfterMount';

// ログイン状態と Firestore を読むブラウザ専用の画面なので、サーバーでは描かない
const OfficeApp = lazy(() => import('./OfficeApp'));

export default function OfficeLoader() {
  return (
    <AfterMount fallback={<div style={{ padding: 16, fontSize: 12, color: '#888' }}>読み込み中...</div>}>
      <OfficeApp />
    </AfterMount>
  );
}
