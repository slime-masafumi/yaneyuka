import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LOOKUP_CATEGORIES, LOOKUP_ORDER, LOOKUP_TOOL_LINKS, countItems, getLookupCategory } from '@/lib/lookup';
import '@/components/karte/yk.css';

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
  const others = LOOKUP_ORDER.filter((s) => s !== c.slug).map((s) => LOOKUP_CATEGORIES.find((x) => x.slug === s)!);

  return (
    <div className="yk yk-tool">
      <main className="yk-wrap yk-main">
        <p className="yk-crumb">
          <Link href="/lookup/">建築の調べもの</Link>
          {others.map((o) => (
            <span key={o.slug}>　／　<Link href={`/lookup/${o.slug}/`}>{o.short}</Link></span>
          ))}
        </p>
        <h1>{c.label}の調べもの</h1>
        <p className="yk-intro">
          {countItems(c)}項目・{c.sections.length}章。項目名｜根拠｜優先度｜形式。<br />
          ツールがある項目には緑のリンクが付きます。無い項目も、案件ごとの落ち漏れ確認にそのまま使えます。
        </p>

        <ul className="yk-toc" aria-label="章">
          {c.sections.map((s) => (
            <li key={s.id}><a href={`#${s.id}`}>{s.id} {s.title}</a></li>
          ))}
        </ul>

        {c.sections.map((s) => (
          <section key={s.id} id={s.id} className="yk-sec">
            <h2>
              <span className="yk-secid">{s.id}</span>
              {s.title}
              <span className="yk-cnt">{s.items.length}項目</span>
            </h2>
            <ol className="yk-list">
              {s.items.map((it) => {
                const tool = LOOKUP_TOOL_LINKS[it.id];
                return (
                  <li key={it.id} id={it.id}>
                    <span className="yk-lt">
                      {it.title}
                      <span className="yk-lb2">{it.basis}</span>
                    </span>
                    <span className="yk-meta">
                      <span className="yk-star" aria-label={`優先度 ${it.priority}`}>{'★'.repeat(it.priority)}</span>
                      <span className={`yk-fmt yk-fmt-${it.format}`}>{it.format}</span>
                      {tool && <Link className="yk-toollink" href={tool.href}>{tool.label}</Link>}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}

        <p className="yk-disclaimer">
          根拠条文は略記です。実装・採用の際は必ず原文と最新の改正内容を確認し、最終判断は建築士など有資格者が行ってください。
        </p>
      </main>
      <div className="yk-foot">
        <div className="yk-wrap">
          yaneyuka ｜ <Link href="/lookup/">索引トップ</Link> ｜ <Link href="/calc/">計算ツール</Link> ｜ <Link href="/karte/">物件カルテ</Link>
        </div>
      </div>
    </div>
  );
}
