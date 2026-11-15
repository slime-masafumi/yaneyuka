// 建材の分類ページ(/exterior-other/)。画面は MainLayout が URL から組む。ここではページの見出し(h1)だけを出す(2026-11-15)
import { SCREEN_LABEL } from '@/lib/siteScreens';

export default function ExteriorOtherPage() {
  return <h1 className="sr-only">{`${SCREEN_LABEL['exterior-other']}のメーカー一覧`}</h1>;
}
