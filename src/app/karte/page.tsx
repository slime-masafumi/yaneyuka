import type { Metadata } from 'next';
import KarteLoader from './KarteLoader';
import '@/components/karte/yk.css';

export const metadata: Metadata = {
  title: '物件カルテ｜建築の調べもの',
  description:
    '物件の条件（高さ・基準風速・粗度区分・降雨強度・建物側の供給スペック）を一度入れると、ガラス厚・縦樋・内装の必要諸元などの検討で再入力が不要になり、根拠つきの検討記録が貯まります。条件が変わると影響する検討に「要再確認」が付きます。データはこの端末の中だけに保存されます。',
  alternates: { canonical: '/karte/' },
};

export default function KartePage() {
  return (
    <div className="yk yk-app">
      <KarteLoader />
    </div>
  );
}
