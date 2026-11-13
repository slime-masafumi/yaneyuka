import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LOOKUP_ORDER, countItems, getLookupCategory } from '@/lib/lookup';
import LookupBook from '@/components/content/LookupBook';

type Params = { category: string };

export function generateStaticParams(): Params[] {
  return LOOKUP_ORDER.map((category) => ({ category }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { category } = await params;
  const c = getLookupCategory(category);
  if (!c) return {};
  return {
    title: `${c.label}の調べもの ${countItems(c)}項目｜逆引き索引`,
    description: `${c.label}分野で実務中に引く項目を${c.sections.length}章に整理。${c.sections
      .slice(0, 6)
      .map((s) => s.title)
      .join('・')}ほか。各項目に根拠条文の略記と形式（計算・判定・早見・選定・解説）を付けています。`,
    alternates: { canonical: `/lookup/${c.slug}/` },
  };
}

export default async function LookupCategoryPage({ params }: { params: Promise<Params> }) {
  const { category } = await params;
  const c = getLookupCategory(category);
  if (!c) notFound();
  // モック「高級感 3」Q1 の組み方(src/components/content/LookupBook.tsx)
  return (
    <>
      <h1 className="sr-only">{c.label}の調べもの</h1>
      <LookupBook category={c} />
    </>
  );
}
