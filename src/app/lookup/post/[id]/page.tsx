import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { designPosts } from '@/data/design-posts';
import { formatDesignContent } from '@/components/content/Userpage/designArticle';
import PageHead from '@/components/ui/PageHead';
import { SecHead } from '@/components/ui/Sheet';
import '@/components/content/Userpage/info-pages.css';

/**
 * 設計情報の記事の単体ページ /lookup/post/{id}/。2026-11-15
 * 記事は /lookup/ の中で開く(?post=)作りで、サーバーの HTML は目録だけ・正規 URL も /lookup/ だったため、
 * 検索エンジンには 1 本の記事として見えていなかった。本文をサーバーで組み、1 記事 1 URL にする。
 * 組み方は /lookup/ の記事画面(DesignInfo の「記事」)と同じ部品・同じクラス。
 */
const SITE = 'https://yaneyuka.com';

export const dynamicParams = false;

export function generateStaticParams() {
  return designPosts.map((p) => ({ id: p.id }));
}

const postOf = (id: string) => designPosts.find((p) => p.id === decodeURIComponent(id));

/** 検索結果の説明:最初の段落(見出し・箇条書き・表・注意書きを飛ばす)を 120 字まで */
function descOf(content: string): string {
  const paras: string[] = [];
  for (const raw of content.replace(/\r/g, '').split('\n')) {
    const l = raw.trim();
    if (!l) {
      if (paras.length) break;
      continue;
    }
    if (/^(#|-|・|\||>|\d+\.\s|【)/.test(l)) {
      if (paras.length) break;
      continue;
    }
    paras.push(l.replace(/\*\*/g, ''));
  }
  const t = paras.join('');
  return t.length > 120 ? `${t.slice(0, 119)}…` : t;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = postOf(id);
  if (!p) return {};
  const url = `/lookup/post/${encodeURIComponent(p.id)}/`;
  const description = descOf(p.content);
  return {
    title: `${p.title}｜設計情報`,
    description,
    alternates: { canonical: url },
    openGraph: { title: p.title, description, type: 'article', url, publishedTime: p.date },
  };
}

export default async function DesignPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = postOf(id);
  if (!p) notFound();
  const article = formatDesignContent(p.content, p.id);
  const same = designPosts.filter((x) => x.category === p.category);
  const i = same.findIndex((x) => x.id === p.id);
  const prev = i > 0 ? same[i - 1] : null;
  const next = i >= 0 && i < same.length - 1 ? same[i + 1] : null;
  const url = `${SITE}/lookup/post/${encodeURIComponent(p.id)}/`;
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: p.title,
      description: descOf(p.content),
      datePublished: p.date,
      dateModified: p.date,
      articleSection: p.category,
      keywords: (p.tags ?? []).join(','),
      inLanguage: 'ja',
      mainEntityOfPage: url,
      author: { '@type': 'Organization', name: 'yaneyuka', url: SITE },
      publisher: { '@type': 'Organization', name: '合同会社slime', url: SITE },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '建築の調べもの', item: `${SITE}/lookup/` },
        { '@type': 'ListItem', position: 2, name: p.category, item: `${SITE}/lookup/` },
        { '@type': 'ListItem', position: 3, name: p.title, item: url },
      ],
    },
  ];
  const postHref = (x: { id: string }) => `/lookup/post/${encodeURIComponent(x.id)}/`;

  return (
    <div className="yy-di" id="yy-di-top">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* 画面の題(設計情報)は h2、記事の題を h1 にする */}
      <PageHead no="15" en="design info" title="設計情報" desc="設計の技術・法規・設備の読みもの" level={2} />
      <div className="yy-di-read">
        <article className="yy-di-article">
          <nav className="yy-di-crumb" aria-label="記事の位置">
            <Link href="/lookup/">← 建築の調べもの</Link>
            <span>/</span>
            <span>{p.category}</span>
          </nav>
          <div className="yy-di-meta">
            <span>{p.category}</span>
            <span>{p.date}</span>
          </div>

          <h1 className="yy-di-title">{p.title}</h1>

          {p.tags && p.tags.length > 0 && (
            <ul className="yy-di-tags">
              {p.tags.map((tag) => (
                <li key={tag}>
                  <span>#{tag}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="yy-di-content">{article.nodes}</div>

          <nav className="yy-di-pager" aria-label="同じ分類の前後の記事">
            {prev ? (
              <Link href={postHref(prev)}>
                <span className="yy-label">← 前の記事</span>
                <span>{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={postHref(next)} className="is-next">
                <span className="yy-label">次の記事 →</span>
                <span>{next.title}</span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </article>

        <aside className="yy-info-side">
          <section className="yy-info-block" aria-label="目次">
            <SecHead no="I" title="目次" right={article.heads.length ? `${article.heads.length} 章` : undefined} />
            {article.heads.length > 0 ? (
              <ol className="yy-info-toc">
                {article.heads.map((h, n) => (
                  <li key={h.id}>
                    <a href={`#${h.id}`} title={h.text}>
                      <span className="yy-info-tocno">{String(n + 1).padStart(2, '0')}</span>
                      <span className="yy-info-toct">{h.text}</span>
                    </a>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="yy-info-empty">この記事には見出しがありません</p>
            )}
          </section>

          <section className="yy-info-block" aria-label="同じ分類の記事">
            <SecHead no="II" title={p.category} right={`${same.length} 本`} />
            <ol className="yy-info-toc yy-di-samecat">
              {same.map((x, n) => (
                <li key={x.id}>
                  <Link href={postHref(x)} title={x.title} aria-current={x.id === p.id ? 'true' : undefined}>
                    <span className="yy-info-tocno">{String(n + 1).padStart(2, '0')}</span>
                    <span className="yy-info-toct">{x.title}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          <section className="yy-info-block" aria-label="関連">
            <SecHead no="III" title="関連" />
            <ul className="yy-info-toc">
              <li>
                <Link href="/lookup/">
                  <span className="yy-info-toct">設計情報の目録</span>
                  <span className="yy-leader" />
                  <span className="yy-info-tocv">{designPosts.length} 本</span>
                </Link>
              </li>
              <li>
                <Link href="/lookup/?tab=material">
                  <span className="yy-info-toct">材料情報</span>
                  <span className="yy-leader" />
                  <span className="yy-info-tocv">規格の早見表</span>
                </Link>
              </li>
              <li>
                <Link href="/calc/">
                  <span className="yy-info-toct">計算ツール</span>
                  <span className="yy-leader" />
                  <span className="yy-info-tocv">根拠つき</span>
                </Link>
              </li>
            </ul>
            <p className="yy-info-text">記事は根拠の条文・告示・規格を末尾に載せています。最終判断は最新の法令・基準を確かめたうえで行ってください。</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
