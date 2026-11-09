'use client';

import React, { Suspense, useEffect, useState } from 'react';

/**
 * ブラウザでマウントされてから children を描く。サーバーでは fallback だけを出す。
 *
 * `useSearchParams` や `next/dynamic({ ssr: false })` をサーバーで踏むと、
 * Suspense で包んであっても配信 HTML に BAILOUT_TO_CLIENT_SIDE_RENDERING が残る。
 * ブラウザ専用の部品はこれで囲み、サーバー側では一切呼ばないようにする。
 * 遅延読み込みしたいときは React.lazy の部品をそのまま children に渡せばよい。
 */
export default function AfterMount({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <>{fallback}</>;
  return <Suspense fallback={fallback}>{children}</Suspense>;
}
