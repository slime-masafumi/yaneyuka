import type { Metadata } from 'next';
import MaterialInfo from '@/components/content/Userpage/MaterialInfo';
import { MATERIAL_INFO_SECTIONS } from '@/lib/infoLinks';

/**
 * 材料情報(規格・寸法・特性の早見表)の単体ページ /lookup/material/。2026-11-15
 * 以前は /lookup/ のタブ(?tab=material)の中だけで、サーバーの HTML は設計情報のタブだったため、
 * 48 章の表が検索エンジンから見えていなかった。章は /lookup/material/#section-6 のように # で指定する。
 */
const all = Object.values(MATERIAL_INFO_SECTIONS).flat();
const names = all.map((s) => s.title.replace(/（.*?）/g, ''));

export const metadata: Metadata = {
  title: `材料情報 — 建材の規格・寸法の早見表 ${all.length} 章`,
  description: `建築で使う材料の規格・寸法・特性の早見表。${names.slice(0, 4).join('・')}、${names[15]}・${names[16]}・${names[17]}、配管・ダクト・電線など、意匠・構造・機械・電気の ${all.length} 章を JIS などの規格名つきでまとめています。`,
  alternates: { canonical: '/lookup/material/' },
};

export default function MaterialInfoPage() {
  return <MaterialInfo />;
}
