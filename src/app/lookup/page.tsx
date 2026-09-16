import Link from 'next/link';
import type { Metadata } from 'next';
import { FORMAT_HELP, LOOKUP_CATEGORIES, LOOKUP_ORDER, LOOKUP_TOOL_LINKS, LOOKUP_TOTAL, countItems, type LookupFormat } from '@/lib/lookup';
import '@/components/karte/yk.css';

export const metadata: Metadata = {
  title: '建築の調べもの 逆引き索引（意匠・構造・設備・電気）',
  description:
    '建築実務で「すぐ引きたい」項目を、意匠・構造・設備・電気の4分野・各28章に分けた逆引き索引。各項目に根拠条文の略記と、計算ツール／判定／早見表／選定表の形式を付けています。',
  alternates: { canonical: '/lookup/' },
};

const toolCount = Object.keys(LOOKUP_TOOL_LINKS).length;

export default function LookupIndexPage() {
  const cats = LOOKUP_ORDER.map((slug) => LOOKUP_CATEGORIES.find((c) => c.slug === slug)!).filter(Boolean);
  return (
    <div className="yk yk-tool">
      <main className="yk-wrap yk-main">
        <h1>建築の調べもの 逆引き索引</h1>
        <p className="yk-intro">
          設計・監理・審査のやり取りで繰り返し出てくる {LOOKUP_TOTAL.toLocaleString('ja-JP')} 項目を、4分野・各28章に整理しました。<br />
          項目名｜根拠条文｜優先度｜形式 の順です。ツールができた項目からリンクに差し替えていきます（現在 {toolCount} 項目）。
        </p>

        <div className="yk-cards">
          {cats.map((c) => (
            <section key={c.slug} className="yk-card">
              <h2>
                <Link href={`/lookup/${c.slug}/`}>{c.label}</Link>
                <span className="yk-cnt">{countItems(c)}項目</span>
              </h2>
              <ol>
                {c.sections.map((s) => (
                  <li key={s.id}>
                    <Link href={`/lookup/${c.slug}/#${s.id}`}>{s.title}</Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>

        <h2>使い方</h2>
        <div className="yk-legend">
          <span><span className="yk-star">★★★</span> 検索需要大・ツール化で明確に時短</span>
          <span><span className="yk-star">★★</span> 需要はあるが対象者が限定的、または実装が重い</span>
          <span><span className="yk-star">★</span> ロングテール</span>
        </div>
        <div className="yk-legend">
          {(Object.keys(FORMAT_HELP) as LookupFormat[]).map((f) => (
            <span key={f}><span className={`yk-fmt yk-fmt-${f}`}>{f}</span> {FORMAT_HELP[f]}</span>
          ))}
        </div>
        <p>
          根拠条文は略記です。実装・採用の際は必ず原文と最新の改正（2025年4月施行の4号特例縮小・省エネ義務化・壁量計算改正を含む）を確認してください。
        </p>

        <h2>物件ごとに検討を貯める</h2>
        <p>
          <Link href="/karte/">物件カルテ</Link>に物件条件（高さ・基準風速・粗度区分・降雨強度・建物側の供給スペック）を一度入れると、以後どの検討でも再入力が不要になり、根拠つきの記録が貯まります。条件が変わると影響する検討に「要再確認」が付きます。会員登録不要、データはこの端末の中だけに保存されます。
        </p>
        <p>
          <Link className="yk-btn yk-ghost yk-small" href="/karte/">物件カルテを開く</Link>
          <Link className="yk-btn yk-ghost yk-small" href="/calc/" style={{ marginLeft: 8 }}>計算ツール一覧</Link>
        </p>

        <p className="yk-disclaimer">
          この索引と各ツールの結果は設計の目安です。最終判断は建築士など有資格者が、最新の法令・告示を確認したうえで行ってください。
        </p>
      </main>
    </div>
  );
}
