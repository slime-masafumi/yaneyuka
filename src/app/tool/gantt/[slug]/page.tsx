import type { Metadata } from 'next';
import GanttViewClient from './GanttViewClient';

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  return [];
}

// 閲覧リンクは知っている人だけに渡すもの。検索に出さない
export const metadata: Metadata = {
  title: '工程表',
  robots: { index: false, follow: false },
};

export default async function GanttViewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <GanttViewClient slug={slug} />;
}
