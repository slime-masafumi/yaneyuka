import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ページが見つかりません',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    // data-yy-not-found: MainLayout が「この HTML は 404」と知るための印(骨組みの食い違いを防ぐ)
    <div data-yy-not-found="" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ fontSize: '4rem', fontWeight: 700, color: '#3b3b3b', margin: 0 }}>404</h1>
        <p style={{ fontSize: '1.125rem', color: '#666', marginTop: '0.5rem' }}>
          お探しのページは見つかりませんでした。
        </p>
        <p style={{ fontSize: '0.875rem', color: '#999', marginTop: '0.25rem' }}>
          URLが正しいかご確認ください。
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            marginTop: '1.5rem',
            padding: '0.625rem 1.5rem',
            backgroundColor: '#3b3b3b',
            color: '#fff',
            borderRadius: '0.375rem',
            textDecoration: 'none',
            fontSize: '0.875rem',
          }}
        >
          トップページへ戻る
        </Link>
      </div>
    </div>
  );
}
