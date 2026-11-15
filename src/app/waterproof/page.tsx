// 建材の分類ページ(/waterproof/)。画面は MainLayout が URL から組む。ここではページの見出し(h1)だけを出す(2026-11-15)
import { SCREEN_LABEL } from '@/lib/siteScreens';

export default function WaterproofPage() {
  return <h1 className="sr-only">{`${SCREEN_LABEL['waterproof']}のメーカー一覧`}</h1>;
}
