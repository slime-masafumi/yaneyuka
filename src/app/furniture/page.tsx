// 建材の分類ページ(/furniture/)。画面は MainLayout が URL から組む。ここではページの見出し(h1)だけを出す(2026-11-15)
import { SCREEN_LABEL } from '@/lib/siteScreens';

export default function FurniturePage() {
  return <h1 className="sr-only">{`${SCREEN_LABEL['furniture']}のメーカー一覧`}</h1>;
}
