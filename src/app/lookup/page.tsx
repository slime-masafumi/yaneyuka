import type { Metadata } from 'next';
import { LOOKUP_CATEGORIES, LOOKUP_ORDER } from '@/lib/lookup';
import LookupBook from '@/components/content/LookupBook';
export const metadata: Metadata = {
  title: '建築の調べもの 逆引き索引（意匠・構造・設備・電気）',
  description:
    '建築実務で「すぐ引きたい」項目を、意匠・構造・設備・電気の4分野・各28章に分けた逆引き索引。各項目に根拠条文の略記と、計算ツール／判定／早見表／選定表の形式を付けています。',
  alternates: { canonical: '/lookup/' },
};

// モック「高級感 3」Q1。索引トップは最初の分野(意匠・法規)を開いた状態で出す。他の分野はタブ(/lookup/{分野}/)
export default function LookupIndexPage() {
  const first = LOOKUP_CATEGORIES.find((c) => c.slug === LOOKUP_ORDER[0])!;
  return (
    <>
      <h1 className="sr-only">建築の調べもの 逆引き索引</h1>
      <LookupBook category={first} />
    </>
  );
}
