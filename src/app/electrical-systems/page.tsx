// 建材の分類ページ(/electrical-systems/)。画面は MainLayout が URL から組む。ここではページの見出し(h1)だけを出す(2026-11-15)
import { SCREEN_LABEL } from '@/lib/siteScreens';

export default function ElectricalSystemsPage() {
  return <h1 className="sr-only">{`${SCREEN_LABEL['electrical-systems']}のメーカー一覧`}</h1>;
}
