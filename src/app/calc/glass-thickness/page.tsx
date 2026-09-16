import Link from 'next/link';
import type { Metadata } from 'next';
import GlassThicknessTool from '@/components/calc/GlassThicknessTool';
import '@/components/karte/yk.css';

// 単体ツールページの型（共有/カルテ機能/glass-thickness.html を移植）。
// 構成: ツール本体 → 判定 → ラダー → 根拠条文 → 計算式 → 係数表 → 早見表 → 関連 → 免責。
// 根拠条文と計算式は省略不可。数値だけ出すツールは信用されない。

export const metadata: Metadata = {
  title: '必要ガラス厚の計算｜耐風圧による板厚の決め方（令82条の4・告示1458号）',
  description:
    '見付寸法とガラスの種類を入れると、標準板厚ごとの許容耐力と設計風圧力を並べて最小適合厚を表示します。平成12年建設省告示第1458号の計算式・係数表つき。',
  alternates: { canonical: '/calc/glass-thickness/' },
  openGraph: {
    title: '必要ガラス厚の計算（令82条の4・告示1458号）',
    description: '見付寸法とガラスの種類から、耐風圧に必要な板ガラスの厚さを最小適合厚で表示。計算式・係数表つき。',
    type: 'website',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: '必要ガラス厚の計算',
  applicationCategory: 'EngineeringApplication',
  operatingSystem: 'All',
  url: 'https://yaneyuka.com/calc/glass-thickness/',
  description: '耐風圧による板ガラスの必要厚さを、平成12年建設省告示第1458号の計算式で算定します。',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
  isAccessibleForFree: true,
};

const LAST_UPDATED = '2026-09-16';

function StaticSections() {
  return (
    <>
      <h2>根拠となる条文</h2>
      <blockquote className="yk-quote">
        帳壁にガラスを使用する場合には、第一号の規定により計算した風圧が、当該ガラスの種類、構成、板厚及び見付面積に応じて次の表により計算した許容耐力を超えないことを確かめること。
        <cite>平成12年5月31日建設省告示第1458号 第1 第二号</cite>
      </blockquote>
      <p>
        この告示が直接かかるのは、高さ13mを超える建築物の帳壁です。13m以下の部分や1階部分は告示の適用外ですが、令第39条により脱落しない構造であることは当然に求められるため、実務では同じ式で検討しておくのが安全側です。
      </p>

      <h2>計算式</h2>
      <p className="yk-formula yk-num">P = 300 · k₁ · k₂ ÷ A × ( t + t² ÷ 4 )</p>
      <dl className="yk-sym">
        <div><dt>P</dt><dd>許容耐力（N/m²）</dd></div>
        <div><dt>k₁</dt><dd>ガラスの種類別係数</dd></div>
        <div><dt>k₂</dt><dd>ガラスの構成別係数</dd></div>
        <div><dt>A</dt><dd>見付面積（m²）</dd></div>
        <div><dt>t</dt><dd>板厚（mm）</dd></div>
      </dl>
      <p style={{ marginTop: 14 }}>
        複層ガラスは2枚それぞれについてk₂を計算し、許容耐力の小さい側で判定します。このページでは自動的に不利側を採用しています。
      </p>

      <h3>k₁：ガラスの種類別係数</h3>
      <div className="yk-scroll">
        <table className="yk-table">
          <thead><tr><th>種類</th><th>k₁</th></tr></thead>
          <tbody>
            <tr><td>普通板ガラス</td><td className="yk-n">1.0</td></tr>
            <tr><td>磨き板ガラス</td><td className="yk-n">0.8</td></tr>
            <tr><td>フロート板ガラス　厚さ8mm以下</td><td className="yk-n">1.0</td></tr>
            <tr><td>　　　　　　　　　8mm超〜12mm以下</td><td className="yk-n">0.9</td></tr>
            <tr><td>　　　　　　　　　12mm超〜20mm以下</td><td className="yk-n">0.8</td></tr>
            <tr><td>　　　　　　　　　20mm超</td><td className="yk-n">0.75</td></tr>
            <tr><td>倍強度ガラス</td><td className="yk-n">2.0</td></tr>
            <tr><td>強化ガラス</td><td className="yk-n">3.5</td></tr>
            <tr><td>網入・線入磨き板ガラス</td><td className="yk-n">0.8</td></tr>
            <tr><td>網入・線入型板ガラス</td><td className="yk-n">0.6</td></tr>
            <tr><td>型板ガラス</td><td className="yk-n">0.6</td></tr>
            <tr><td>色焼付ガラス</td><td className="yk-n">2.0</td></tr>
          </tbody>
        </table>
      </div>

      <h3>k₂：ガラスの構成別係数</h3>
      <div className="yk-scroll">
        <table className="yk-table">
          <thead><tr><th>構成</th><th>k₂</th></tr></thead>
          <tbody>
            <tr><td>単板ガラス</td><td className="yk-n">1.0</td></tr>
            <tr><td>合わせガラス</td><td className="yk-n">0.75</td></tr>
            <tr><td>複層ガラス（t₁について計算する場合）</td><td className="yk-n">0.75 × {'{'} 1 + (t₂/t₁)³ {'}'}</td></tr>
            <tr><td>複層ガラス（t₂について計算する場合）</td><td className="yk-n">0.75 × {'{'} 1 + (t₁/t₂)³ {'}'}</td></tr>
          </tbody>
        </table>
      </div>

      <h3>設計風圧力の簡易算定について</h3>
      <p>
        上の「簡易算定」は、平均速度圧 q = 0.6·Er²·V₀²（H12建告1454）に、閉鎖型建築物の壁面を想定したピーク風力係数（正圧 0.8kz+0.5、負圧 一般部 1.0／隅角部 1.6）を掛けた参考値です。
        ピーク風力係数の値は実務の相場から置いたもので、告示1458第3の数値と突き合わせて確認してください。
      </p>
    </>
  );
}

export default function GlassThicknessPage() {
  return (
    <div className="yk yk-tool">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="yk-wrap yk-main">
        <p className="yk-crumb"><Link href="/lookup/">建築の調べもの</Link> ／ <Link href="/calc/">計算ツール</Link></p>
        <h1>必要ガラス厚の計算</h1>
        <p className="yk-intro">
          見付寸法とガラスの種類を入れると、標準板厚ごとの許容耐力を設計風圧力と並べ、最小適合厚を示します。<br />
          根拠：建築基準法施行令第82条の4／平成12年建設省告示第1458号
        </p>

        <GlassThicknessTool middle={<StaticSections />} />

        <h2>あわせて使う</h2>
        <ul className="yk-rel">
          <li><Link href="/karte/?open=glass">物件カルテで検討を残す<small>物件の風速・粗度・高さを一度入れれば、以後の検討で再入力が不要。条件が変わると要再確認が付く</small></Link></li>
          <li><Link href="/lookup/design/#1-8-02">設計風圧力の算定<small>基準風速・粗度区分・ピーク風力係数から外装材用の風圧力を求める</small></Link></li>
          <li><Link href="/lookup/design/#1-8-08">ガラスの重量計算<small>比重2.5から質量を求める。搬入・取付の可否検討に</small></Link></li>
          <li><Link href="/lookup/design/#1-8">開口部・ガラスの調べもの一覧<small>安全ガラスの選定、サッシの耐風圧等級など開口部まわりの項目をまとめて見る</small></Link></li>
          <li><Link href="/lookup/">建築の調べもの 逆引き索引<small>意匠・構造・設備・電気の2,000項目</small></Link></li>
        </ul>

        <p className="yk-disclaimer">
          計算結果は設計の目安です。実際の採用にあたっては告示の原文と最新の改正内容、ガラスメーカーの技術資料を確認し、最終判断は建築士が行ってください。二辺支持・点支持・特殊形状には対応していません。熱割れ・人体衝突・防火性能は別途の検討が必要です。
        </p>
      </main>
      <div className="yk-foot">
        <div className="yk-wrap">
          yaneyuka ｜ <Link href="/lookup/">建築の調べもの一覧</Link> ｜ <Link href="/karte/">物件カルテ</Link>
          <br />
          最終更新 {LAST_UPDATED}
        </div>
      </div>
    </div>
  );
}
