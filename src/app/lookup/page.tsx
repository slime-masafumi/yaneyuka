import type { Metadata } from 'next';
import LookupTabs from '@/components/content/LookupTabs';

export const metadata: Metadata = {
  title: '建築の調べもの(設計情報・材料情報)',
  description:
    '設計の技術・法規・設備の読みもの(設計情報)と、建材の規格・寸法・特性の早見表(材料情報)。意匠・構造・機械・電気の分野ごとにまとめています。',
  alternates: { canonical: '/lookup/' },
};

// 建築の調べもの = 設計情報 / 材料情報 のタブ(2026-11-14 に作り替え)。
// 以前ここにあった条文の目次(意匠・構造・設備・電気 2,016 項目)は /lookup/{分野}/ に残っている(公開済みの URL)。
export default function LookupIndexPage() {
  return (
    <>
      <h1 className="sr-only">建築の調べもの(設計情報・材料情報)</h1>
      <LookupTabs />
    </>
  );
}
