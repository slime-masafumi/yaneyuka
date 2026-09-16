import Link from 'next/link';
import type { Metadata } from 'next';
import '@/components/karte/yk.css';

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
];

// 単体ページはまだ無いが、物件カルテの中では使える検討。
const IN_KARTE = [
  { href: '/karte/?open=pipe', title: '縦樋のサイズ選定', desc: 'SHASE-S206 の許容屋根面積を降雨強度で換算', field: '設備' },
  { href: '/karte/?open=fnb', title: '内装（区画）の必要諸元', desc: '業種・室・機器から電力・空調・換気・ガス・給排水・床荷重を積み上げ、建物側の供給と突合せ', field: '意匠・設備・電気' },
];

export default function CalcIndexPage() {
  return (
    <div className="yk yk-tool">
      <main className="yk-wrap yk-main">
        <p className="yk-crumb"><Link href="/lookup/">建築の調べもの</Link></p>
        <h1>計算ツール</h1>
        <p className="yk-intro">
          検索から来て、その場で答えが出る単体ページです。ログイン不要・物件登録不要。<br />
          各ページに根拠条文と計算式を併記しています。数値だけの結果は載せません。
        </p>

        <h2>公開中</h2>
        <ul className="yk-rel">
          {TOOLS.map((t) => (
            <li key={t.href}>
              <Link href={t.href}>
                {t.title}<small>{t.field}｜{t.desc}</small>
              </Link>
            </li>
          ))}
        </ul>

        <h2>物件カルテの中で使える検討</h2>
        <p className="yk-hint" style={{ marginBottom: 10 }}>単体ページは準備中。物件条件（降雨強度・供給スペック）と組み合わせて使います。</p>
        <ul className="yk-rel">
          {IN_KARTE.map((t) => (
            <li key={t.href}>
              <Link href={t.href}>
                {t.title}<small>{t.field}｜{t.desc}</small>
              </Link>
            </li>
          ))}
        </ul>

        <h2>これから</h2>
        <p>
          <Link href="/lookup/">逆引き索引</Link>の2,000項目のうち、★★★で実装が軽いものから順にツール化していきます。索引の各項目は、ツールができ次第リンクに差し替わります。
        </p>

        <p className="yk-disclaimer">
          計算結果は設計の目安です。最終判断は建築士など有資格者が、最新の法令・告示を確認したうえで行ってください。
        </p>
      </main>
    </div>
  );
}
