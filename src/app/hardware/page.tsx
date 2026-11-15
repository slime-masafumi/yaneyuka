// 建材の分類ページ(/hardware/)。画面は MainLayout が URL から組む。ここではページの見出し(h1)だけを出す(2026-11-15)
import { SCREEN_LABEL } from '@/lib/siteScreens';

export default function HardwarePage() {
  return <h1 className="sr-only">{`${SCREEN_LABEL['hardware']}のメーカー一覧`}</h1>;
}
