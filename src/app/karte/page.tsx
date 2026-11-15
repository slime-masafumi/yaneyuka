import type { Metadata } from 'next';
import KarteLoader from './KarteLoader';
import '@/components/karte/karte-premium.css';

export const metadata: Metadata = {
  title: '物件カルテ｜建築の調べもの',
  description:
    '物件の条件（高さ・基準風速・粗度区分・降雨強度・建物側の供給スペック）を一度入れると、ガラス厚・縦樋・内装の必要諸元などの検討で再入力が不要になり、根拠つきの検討記録が貯まります。条件が変わると影響する検討に「要再確認」が付きます。データはこの端末の中だけに保存されます。',
  alternates: { canonical: '/karte/' },
};

// 組版はモック「高級感 3」(karte-premium.css)。旧 .yk の地(yk.css)はもう使わない。
// .yk-app は印刷指定(カルテの中身だけを印刷する)の目印として残す。
export default function KartePage() {
  return (
    <div className="yy-kt yk-app">
      {/* 画面は読み込み後に組むので、ページの見出しだけはサーバーで出す(2026-11-15) */}
      <h1 className="sr-only">物件カルテ</h1>
      <KarteLoader />
    </div>
  );
}
