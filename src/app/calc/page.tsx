import Link from 'next/link';
import type { Metadata } from 'next';
import PageHead, { Stat } from '@/components/ui/PageHead';
import '@/components/karte/karte-premium.css';

export const metadata: Metadata = {
  title: '建築の計算ツール一覧',
  description:
    'ログイン不要・単体で完結する建築実務の計算ツール。根拠条文と計算式を併記し、最小適合値をラダー表示します。',
  alternates: { canonical: '/calc/' },
};

// ツールを 1 本公開するたびにここへ 1 行足す（/lookup/ 側は src/lib/lookup.ts の LOOKUP_TOOL_LINKS）。
const TOOLS = [
  {
    href: '/calc/glass-thickness/',
    title: '必要ガラス厚の計算',
    desc: '耐風圧による板厚の決め方。令82条の4・平成12年建設省告示第1458号',
    field: '意匠',
  },
  {
    href: '/calc/force-flow/',
    title: '構造フロービューア',
    desc: '壁・梁の力の流れを実寸・実材料で可視化。梁貫通、耐力壁の開口、ピロティ、壁撤去の例題つき（参考表示）',
    field: '構造',
  },
];

// 単体ページはまだ無いが、物件カルテの中では使える検討。
const IN_KARTE = [
  { href: '/karte/?open=pipe', title: '縦樋のサイズ選定', desc: 'SHASE-S206 の許容屋根面積を降雨強度で換算', field: '設備' },
  { href: '/karte/?open=fnb', title: '内装（区画）の必要諸元', desc: '業種・室・機器から電力・空調・換気・ガス・給排水・床荷重を積み上げ、建物側の供給と突合せ', field: '意匠・設備・電気' },
];

/** 一覧の 1 行：番号 / 名前 + 補足 / 分野 / → */
function Rows({ rows }: { rows: typeof TOOLS }) {
  return (
    <ul className="yy-kt-links">
      {rows.map((t, i) => (
        <li key={t.href}>
          <Link href={t.href}>
            <span className="yy-kt-links__no">{String(i + 1).padStart(2, '0')}</span>
            <span className="yy-kt-links__text">
              <span className="yy-kt-links__name">{t.title}</span>
              <span className="yy-kt-links__desc" title={t.desc}>{t.desc}</span>
            </span>
            <span className="yy-kt-links__field">{t.field}</span>
            <span className="yy-kt-links__go" aria-hidden="true">→</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// 組版はモック「高級感 3」（PageHead + 本文 + 右列 270px、一覧は番号つきの 1 行）
export default function CalcIndexPage() {
  return (
    <div className="yy-kt">
      <p className="yy-kt-crumb">
        <Link href="/lookup/">建築の調べもの</Link>
        <span>/</span>
        <span>計算ツール</span>
      </p>
      <h1 className="sr-only">計算ツール</h1>
      <PageHead
        en="calculation"
        title="計算ツール"
        desc="ログイン不要・物件登録不要 · 根拠条文と計算式を併記"
        right={
          <>
            <Stat n={TOOLS.length} label="公開中" />
            <Stat n={IN_KARTE.length} label="カルテ内" />
          </>
        }
      />
      <div className="yy-kt-body">
        <div className="yy-kt-main">
          <p className="yy-kt-p">
            検索から来て、その場で答えが出る単体ページです。ログイン不要・物件登録不要。各ページに根拠条文と計算式を併記しています。数値だけの結果は載せません。
          </p>
          <section>
            <h2 className="yy-sec yy-kt-h2">
              <span className="yy-sec__no">I</span>
              <span className="yy-sec__title">公開中</span>
              <span className="yy-sec__right">{TOOLS.length} 本</span>
            </h2>
            <Rows rows={TOOLS} />
          </section>
          <section>
            <h2 className="yy-sec yy-kt-h2">
              <span className="yy-sec__no">II</span>
              <span className="yy-sec__title">物件カルテの中で使える検討</span>
              <span className="yy-sec__right">単体ページは準備中</span>
            </h2>
            <Rows rows={IN_KARTE} />
            <p className="yy-kt-note">物件条件（降雨強度・供給スペック）と組み合わせて使います。</p>
          </section>
          <section>
            <h2 className="yy-sec yy-kt-h2">
              <span className="yy-sec__no">III</span>
              <span className="yy-sec__title">これから</span>
            </h2>
            <p className="yy-kt-p">
              <Link className="yy-kt-link" style={{ fontSize: 'inherit' }} href="/lookup/">逆引き索引</Link>
              の2,000項目のうち、★★★で実装が軽いものから順にツール化していきます。索引の各項目は、ツールができ次第リンクに差し替わります。
            </p>
          </section>
        </div>
        <aside className="yy-kt-side">
          <div className="yy-gray">
            <span className="yy-label">case — 物件カルテ</span>
            <span className="yy-gray__text">物件の条件を一度入れると、以後の検討で再入力が不要。根拠つきの記録が貯まり、条件が変わると要再確認が付きます。</span>
            <Link className="yy-pill" href="/karte/">物件カルテを開く</Link>
          </div>
        </aside>
      </div>

      <p className="yy-kt-disc">
        計算結果は設計の目安です。最終判断は建築士など有資格者が、最新の法令・告示を確認したうえで行ってください。
      </p>
    </div>
  );
}
