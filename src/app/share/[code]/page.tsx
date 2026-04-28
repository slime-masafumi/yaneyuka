import SharePageClient from './SharePageClient';

// output: export を使用する場合、動的ルートは静的生成のみをサポートします
// 共有リンクは動的に生成されるため、空の配列を返します
export async function generateStaticParams(): Promise<Array<{ code: string }>> {
  return [];
}

export default async function SharePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <SharePageClient code={code} />;
}
