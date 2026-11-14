import Link from 'next/link';
import type { Metadata } from 'next';
import GlassThicknessTool from '@/components/calc/GlassThicknessTool';
import PageHead from '@/components/ui/PageHead';
import '@/components/karte/karte-premium.css';

// 単体ツールページの型（共有/カルテ機能/glass-thickness.html を移植）。
// 構成: ツール本体 → 判定 → ラダー → 根拠条文 → 計算式 → 係数表 → 早見表 → 関連 → 免責。
// 根拠条文と計算式は省略不可。数値だけ出すツールは信用されない。
// 組版はモック「高級感 3」：PageHead → 計算書の 3 段組 → 本文は 2 段組の章（明朝の番号 + 黒の 1px）。

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

/** 章の見出し（明朝の番号 + 題 + 黒の 1px）。h2 のまま検索に読ませる */
function H2({ no, children }: { no: string; children: React.ReactNode }) {
  return (
    <h2 className="yy-sec yy-kt-h2">
      <span className="yy-sec__no">{no}</span>
      <span className="yy-sec__title">{children}</span>
    </h2>
  );
}

function StaticSections() {
  return (
    <>
      <section>
        <H2 no="V">根拠となる条文</H2>
        <blockquote className="yy-kt-quote">
          帳壁にガラスを使用する場合には、第一号の規定により計算した風圧が、当該ガラスの種類、構成、板厚及び見付面積に応じて次の表により計算した許容耐力を超えないことを確かめること。
          <cite>平成12年5月31日建設省告示第1458号 第1 第二号</cite>
        </blockquote>
        <p className="yy-kt-p">
          この告示が直接かかるのは、高さ13mを超える建築物の帳壁です。13m以下の部分や1階部分は告示の適用外ですが、令第39条により脱落しない構造であることは当然に求められるため、実務では同じ式で検討しておくのが安全側です。
        </p>
      </section>

      <section>
        <H2 no="VI">計算式</H2>
        <p className="yy-kt-formula">P = 300 · k₁ · k₂ ÷ A × ( t + t² ÷ 4 )</p>
        <dl className="yy-kt-sym">
          <div><dt>P</dt><dd>許容耐力（N/m²）</dd></div>
          <div><dt>k₁</dt><dd>ガラスの種類別係数</dd></div>
          <div><dt>k₂</dt><dd>ガラスの構成別係数</dd></div>
          <div><dt>A</dt><dd>見付面積（m²）</dd></div>
          <div><dt>t</dt><dd>板厚（mm）</dd></div>
        </dl>
        <p className="yy-kt-p">
          複層ガラスは2枚それぞれについてk₂を計算し、許容耐力の小さい側で判定します。このページでは自動的に不利側を採用しています。
        </p>
      </section>

      <section>
        <h3 className="yy-kt-h3">k₁：ガラスの種類別係数</h3>
        <div className="yy-kt-scroll">
          <table className="yy-tbl">
            <thead><tr><th>種類</th><th className="is-n">k₁</th></tr></thead>
            <tbody>
              <tr><td>普通板ガラス</td><td className="is-n">1.0</td></tr>
              <tr><td>磨き板ガラス</td><td className="is-n">0.8</td></tr>
              <tr><td>フロート板ガラス　厚さ8mm以下</td><td className="is-n">1.0</td></tr>
              <tr><td>　　　　　　　　　8mm超〜12mm以下</td><td className="is-n">0.9</td></tr>
              <tr><td>　　　　　　　　　12mm超〜20mm以下</td><td className="is-n">0.8</td></tr>
              <tr><td>　　　　　　　　　20mm超</td><td className="is-n">0.75</td></tr>
              <tr><td>倍強度ガラス</td><td className="is-n">2.0</td></tr>
              <tr><td>強化ガラス</td><td className="is-n">3.5</td></tr>
              <tr><td>網入・線入磨き板ガラス</td><td className="is-n">0.8</td></tr>
              <tr><td>網入・線入型板ガラス</td><td className="is-n">0.6</td></tr>
              <tr><td>型板ガラス</td><td className="is-n">0.6</td></tr>
              <tr><td>色焼付ガラス</td><td className="is-n">2.0</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="yy-kt-h3">k₂：ガラスの構成別係数</h3>
        <div className="yy-kt-scroll">
          <table className="yy-tbl">
            <thead><tr><th>構成</th><th className="is-n">k₂</th></tr></thead>
            <tbody>
              <tr><td>単板ガラス</td><td className="is-n">1.0</td></tr>
              <tr><td>合わせガラス</td><td className="is-n">0.75</td></tr>
              <tr><td>複層ガラス（t₁について計算する場合）</td><td className="is-n">0.75 × {'{'} 1 + (t₂/t₁)³ {'}'}</td></tr>
              <tr><td>複層ガラス（t₂について計算する場合）</td><td className="is-n">0.75 × {'{'} 1 + (t₁/t₂)³ {'}'}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="yy-kt-h3">設計風圧力の簡易算定について</h3>
        <p className="yy-kt-p">
          上の「簡易算定」は、平均速度圧 q = 0.6·Er²·V₀²（H12建告1454）に、閉鎖型建築物の壁面を想定したピーク風力係数（正圧 0.8kz+0.5、負圧 一般部 1.0／隅角部 1.6）を掛けた参考値です。
          ピーク風力係数の値は実務の相場から置いたもので、告示1458第3の数値と突き合わせて確認してください。
        </p>
      </section>
    </>
  );
}

const RELATED = [
  { href: '/karte/?open=glass', title: '物件カルテで検討を残す', desc: '物件の風速・粗度・高さを一度入れれば、以後の検討で再入力が不要。条件が変わると要再確認が付く' },
  { href: '/lookup/?tab=material&sec=section-1', title: 'ガラス種別(JIS R 3202 他)', desc: 'フロート・強化・合わせ・複層ガラスの厚さと用途の早見表' },
  { href: '/lookup/?tab=material&sec=section-10', title: 'シーリング材', desc: 'ガラスまわり・目地に使うシーリング材の種類と使い分け' },
  { href: '/lookup/?post=7', title: '耐火・準耐火構造の考え方', desc: '防火設備としての開口部・ガラスを選ぶ前提' },
  { href: '/lookup/', title: '建築の調べもの', desc: '設計情報(読みもの)と材料情報(規格・寸法の早見表)' },
];

export default function GlassThicknessPage() {
  return (
    <div className="yy-kt">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="yy-kt-crumb">
        <Link href="/lookup/">建築の調べもの</Link>
        <span>/</span>
        <Link href="/calc/">計算ツール</Link>
      </p>
      <h1 className="sr-only">必要ガラス厚の計算</h1>
      <PageHead
        en="calc · glass thickness"
        title="必要ガラス厚の計算"
        desc="根拠：建築基準法施行令第82条の4／平成12年建設省告示第1458号"
      />
      <p className="yy-kt-note" style={{ marginTop: -6 }}>
        見付寸法とガラスの種類を入れると、標準板厚ごとの許容耐力を設計風圧力と並べ、最小適合厚を示します。
      </p>

      <GlassThicknessTool middle={<StaticSections />} />

      <section className="yy-kt-wide">
        <H2 no="VIII">あわせて使う</H2>
        <ul className="yy-kt-links">
          {RELATED.map((r, i) => (
            <li key={r.href}>
              <Link href={r.href}>
                <span className="yy-kt-links__no">{String(i + 1).padStart(2, '0')}</span>
                <span className="yy-kt-links__text">
                  <span className="yy-kt-links__name">{r.title}</span>
                  <span className="yy-kt-links__desc" title={r.desc}>{r.desc}</span>
                </span>
                <span className="yy-kt-links__go" aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="yy-kt-disc">
        計算結果は設計の目安です。実際の採用にあたっては告示の原文と最新の改正内容、ガラスメーカーの技術資料を確認し、最終判断は建築士が行ってください。二辺支持・点支持・特殊形状には対応していません。熱割れ・人体衝突・防火性能は別途の検討が必要です。
        <br />
        yaneyuka · <Link href="/lookup/">建築の調べもの</Link> · <Link href="/karte/">物件カルテ</Link> · 最終更新 {LAST_UPDATED}
      </p>
    </div>
  );
}
