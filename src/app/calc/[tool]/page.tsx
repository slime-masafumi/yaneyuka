import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PageHead from '@/components/ui/PageHead';
import DesignToolStandalone from '@/components/calc/DesignToolStandalone';
import { SHEET_IDS, TOOL_PAGES, toolPage } from '@/lib/designToolPages';
import '@/components/karte/karte-premium.css';

/**
 * 設計ツールの単体ページ /calc/{id}/。2026-11-15
 * 設計ツール画面(/?m=design-tools)と同じ部品を、検索から来た人がその場で使えるように 1 ツール 1 ページで出す。
 * 一覧は src/lib/designToolPages.ts。ガラス厚・構造フローは専用ページ(静的なフォルダが先に当たる)。
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return TOOL_PAGES.map((t) => ({ tool: t.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }): Promise<Metadata> {
  const { tool } = await params;
  const t = toolPage(tool);
  if (!t) return {};
  // 検索結果の説明。短い説明文(20 字ほど)だけだと Google が本文から勝手に抜き出すので、
  // 根拠・分類と「無料・登録不要・ブラウザで使える」を足して 70〜120 字にする(2026-11-15)
  const desc = `${t.description}。${t.basis ? `根拠は${t.basis}。` : ''}${t.category}の計算を、無料・登録不要でブラウザからすぐに使えます。`;
  return {
    title: `${t.title}｜建築の計算ツール`,
    description: desc,
    alternates: { canonical: `/calc/${t.id}/` },
    openGraph: { title: `${t.title}(建築の計算ツール)`, description: desc, type: 'website' },
  };
}

export default async function DesignToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const t = toolPage(tool);
  if (!t) notFound();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: t.title,
    applicationCategory: 'EngineeringApplication',
    operatingSystem: 'All',
    url: `https://yaneyuka.com/calc/${t.id}/`,
    description: t.description,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
    isAccessibleForFree: true,
  };
  const same = TOOL_PAGES.filter((x) => x.categoryId === t.categoryId && x.id !== t.id);
  return (
    <div className="yy-kt">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="yy-kt-crumb">
        <Link href="/calc/">計算ツール</Link>
        <span>/</span>
        <span>{t.category}</span>
      </p>
      {/* 見出し(h1)は PageHead。計算書の形のツール(PageHead を出さない)だけ、読み上げ用の h1 を置く */}
      {SHEET_IDS.has(t.id) && <h1 className="sr-only">{t.title}</h1>}
      {!SHEET_IDS.has(t.id) && <PageHead en={`calc · ${t.category}`} title={t.title} desc={t.basis ? `根拠:${t.basis}` : t.category} />}
      <p className="yy-kt-note" style={{ marginTop: SHEET_IDS.has(t.id) ? 0 : -6 }}>
        {t.description}
      </p>

      <DesignToolStandalone id={t.id} title={t.title} basis={t.basis} />

      {same.length > 0 && (
        <section className="yy-kt-wide">
          <h2 className="yy-sec yy-kt-h2">
            <span className="yy-sec__no">—</span>
            <span className="yy-sec__title">{t.category}のほかのツール</span>
          </h2>
          <ul className="yy-kt-links">
            {same.map((r, i) => (
              <li key={r.id}>
                <Link href={`/calc/${r.id}/`}>
                  <span className="yy-kt-links__no">{String(i + 1).padStart(2, '0')}</span>
                  <span className="yy-kt-links__text">
                    <span className="yy-kt-links__name">{r.title}</span>
                    <span className="yy-kt-links__desc" title={r.description}>{r.description}</span>
                  </span>
                  <span className="yy-kt-links__field">{r.category}</span>
                  <span className="yy-kt-links__go" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="yy-kt-disc">計算結果は設計の目安です。最終判断は建築士など有資格者が、最新の法令・告示を確認したうえで行ってください。</p>
    </div>
  );
}
