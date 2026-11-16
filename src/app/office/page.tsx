import type { Metadata } from 'next';
import OfficeLoader from '@/components/office/OfficeLoader';

export const metadata: Metadata = {
  title: '事務所',
  description: '事務所のメンバーで予定・連絡先・物件ごとの工数を共有し、所長が工数を物件 × メンバー × 月で集計する。',
  alternates: { canonical: '/office/' },
  // 会員ごとの画面なので検索には出さない（メニュー・サイトマップにも載せていない）
  robots: { index: false, follow: false },
};

export default function OfficePage() {
  return (
    <div className="yy-office-page">
      <h1 className="sr-only">事務所</h1>
      <OfficeLoader />
    </div>
  );
}
