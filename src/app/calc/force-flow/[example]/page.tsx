import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ForceFlowLoader from '@/components/forceflow/ForceFlowLoader';
import { FLOW_ARTICLES, flowArticle } from '@/lib/forceFlowArticles';
import { FORCE_FLOW_PUBLIC } from '@/lib/forceFlowGate';
import { FLOW_DISCLAIMER, FLOW_EXCLUSIONS } from '@/lib/forceFlowModel';
import '@/components/karte/yk.css';

export const dynamicParams = false;

export function generateStaticParams() {
  // 構造設計者のレビュー前は公開しない(src/lib/forceFlowGate.ts)
  return FORCE_FLOW_PUBLIC ? FLOW_ARTICLES.map((a) => ({ example: a.slug })) : [];
}

type Params = { params: Promise<{ example: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const a = flowArticle((await params).example);
  if (!a) return {};
  return {
    title: a.title,
    description: a.description,
    alternates: { canonical: `/calc/force-flow/${a.slug}/` },
    openGraph: { title: a.title, description: a.description, type: 'article' },
  };
}

export default async function ForceFlowExamplePage({ params }: Params) {
  const a = flowArticle((await params).example);
  if (!a || !FORCE_FLOW_PUBLIC) notFound();
  return (
    <>
      <div className="yk yk-tool">
        <main className="yk-wrap yk-main">
          <p className="yk-crumb"><Link href="/calc/">計算ツール</Link> ／ <Link href="/calc/force-flow/">構造フロービューア</Link></p>
          <h1>{a.h1}</h1>
          <p className="yk-intro">{a.lead}</p>
        </main>
      </div>

      <ForceFlowLoader example={a.example} />

      <div className="yk yk-tool">
        <main className="yk-wrap yk-main">
          {a.sections.map((s) => (
            <section key={s.heading}>
              <h2>{s.heading}</h2>
              {s.paragraphs?.map((p) => <p key={p}>{p}</p>)}
              {s.items && <ul>{s.items.map((t) => <li key={t}>{t}</li>)}</ul>}
            </section>
          ))}

          <h2>解析の対象外</h2>
          <ul>{FLOW_EXCLUSIONS.map((t) => <li key={t}>{t}</li>)}</ul>

          <h2>あわせて見る</h2>
          <ul className="yk-rel">
            {a.related.map((r) => (
              <li key={r.href}><Link href={r.href}>{r.label}<small>{r.note}</small></Link></li>
            ))}
          </ul>

          <p className="yk-disclaimer">{FLOW_DISCLAIMER}</p>
        </main>
      </div>
    </>
  );
}
