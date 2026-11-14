import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FORCE_FLOW_PUBLIC } from '@/lib/forceFlowGate';
import type { Metadata } from 'next';
import ForceFlowLoader from '@/components/forceflow/ForceFlowLoader';
import { FLOW_ARTICLES } from '@/lib/forceFlowArticles';
import { FLOW_DISCLAIMER, FLOW_EXCLUSIONS } from '@/lib/forceFlowModel';
import '@/components/karte/yk.css';

export const metadata: Metadata = {
  title: '構造フロービューア｜壁・梁の力の流れをブラウザで可視化',
  description:
    '壁・梁の力の流れを、実寸・実材料のまま数秒で可視化します。登録不要。梁貫通、耐力壁の開口、ピロティ、片持ち、壁撤去の例題つき。案の比較と説明用の PDF 出力に対応。構造計算の代替ではなく参考表示です。',
  alternates: { canonical: '/calc/force-flow/' },
  openGraph: {
    title: '構造フロービューア｜壁・梁の力の流れを可視化',
    description: '開口や柱を動かすと、力の流れと応力度がその場で描き直されます。登録不要。',
    type: 'website',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: '構造フロービューア',
  applicationCategory: 'EngineeringApplication',
  operatingSystem: 'All',
  url: 'https://yaneyuka.com/calc/force-flow/',
  description: '壁・梁の力の流れを平面応力の有限要素法でブラウザ内で解き、主応力線と応力度を表示します。',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
  isAccessibleForFree: true,
};

export default function ForceFlowPage() {
  // 構造設計者のレビュー前は公開しない(src/lib/forceFlowGate.ts)
  if (!FORCE_FLOW_PUBLIC) notFound();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="yk yk-tool">
        <main className="yk-wrap yk-main">
          <p className="yk-crumb"><Link href="/lookup/">建築の調べもの</Link> ／ <Link href="/calc/">計算ツール</Link></p>
          <h1>構造フロービューア</h1>
          <p className="yk-intro">
            壁・梁の力の流れを、実寸・実材料のまま数秒で可視化します。登録は要りません。開口や柱を動かすと、その場で解き直します。<br />
            位置づけは構造計算の代替ではなく、計算の前と後で使う検討・説明の道具です。
          </p>
        </main>
      </div>

      <ForceFlowLoader />

      <div className="yk yk-tool">
        <main className="yk-wrap yk-main">
          <h2>例題から始める</h2>
          <ul className="yk-rel">
            {FLOW_ARTICLES.map((a) => (
              <li key={a.slug}><Link href={`/calc/force-flow/${a.slug}/`}>{a.h1}<small>{a.description}</small></Link></li>
            ))}
          </ul>

          <h2>使い方</h2>
          <ol>
            <li>形を作る：例題を選ぶか、寸法を入れます。開口や柱は図の上でドラッグできます。</li>
            <li>条件を入れる：材料、壁厚、支点、荷重を入れます。荷重は用途と階数から初期値を入れられます。</li>
            <li>結果を見る：主応力線、ベクトル、応力の濃淡、変形を重ねて見ます。点をタップすると応力度を読めます。</li>
            <li>保存・出力：案名とメモを付けて物件カルテに保存します。画像と PDF には条件一覧と免責文が入ります。</li>
          </ol>

          <h2>解析の前提</h2>
          <p>線形弾性の平面応力解析です。4 節点非適合要素（Q6）を等間隔の格子に敷き、ブラウザの中だけで解きます。入力したデータは計算のためにサーバーへ送りません。単純梁・片持ち梁の曲げ応力とたわみを、リリースごとに理論解（誤差 ±5% 以内）と比較しています。</p>
          <h3>材料定数の初期値（画面で変更できます）</h3>
          <div className="yk-scroll">
            <table className="yk-table">
              <thead><tr><th>材料</th><th>ヤング係数 N/mm²</th><th>ポアソン比</th><th>目安の基準</th></tr></thead>
              <tbody>
                <tr><td>コンクリート Fc24（γ=23）</td><td className="yk-n">約 2.27×10⁴</td><td className="yk-n">0.2</td><td>引張 0.56√Fc／圧縮 Fc</td></tr>
                <tr><td>鋼材</td><td className="yk-n">2.05×10⁵</td><td className="yk-n">0.3</td><td>F=235（相当応力）</td></tr>
                <tr><td>木材 スギ E70（参考値）</td><td className="yk-n">7.0×10³</td><td className="yk-n">0.3</td><td>引張 13.5／圧縮 17.7（無等級材）</td></tr>
              </tbody>
            </table>
          </div>
          <p className="yk-formula yk-num">E = 3.35×10⁴ × (γ/24)² × (Fc/60)^(1/3)</p>

          <h2>解析の対象外</h2>
          <ul>{FLOW_EXCLUSIONS.map((t) => <li key={t}>{t}</li>)}</ul>

          <p className="yk-disclaimer">{FLOW_DISCLAIMER}</p>
        </main>
      </div>
    </>
  );
}
