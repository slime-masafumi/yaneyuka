import type { Metadata } from 'next';
import makers from '@/data/makers.json';
import { SCREEN_LABEL } from './siteScreens';
import { CATEGORY_ROUTES, CATEGORY_SUBCATEGORIES, materialSubPath, subFromSlug, subSlug, subcategoryLabel } from './materialCategories';

/**
 * 建材の小分類ページ(/roof/seppan/ など)の、サーバー側で決めるもの。
 * 画面そのものは MainLayout が URL から小分類を読んで組む(建材のメーカー表・右列・お知らせ)。
 * ここでは「検索結果に出る題と説明」「正規の URL」「メーカーの一覧(構造化データ)」だけを出す。
 *
 * 各分類のフォルダの [sub]/page.tsx が materialSubPage('roof') を呼ぶだけにしてある。
 */

type Maker = { name: string; pages: string[]; catalog: string; cad: string; sample: string };
const DATA = makers as unknown as Record<string, Maker[]>;
const SITE = 'https://yaneyuka.com';

/** 画面の分類 → makers.json のキー */
const MAKERS_KEY: Record<string, string> = {
  roof: '屋根', 'exterior-wall': '外壁', opening: '開口部', 'external-floor': '外部床', 'exterior-other': '外部その他',
  'internal-floor': '内部床', 'internal-wall': '内装壁材', 'internal-ceiling': '内装天井材', 'internal-other': '内装その他',
  waterproof: '防水', hardware: '金物', furniture: 'ファニチャー', 'electrical-systems': '電気設備',
  'mechanical-systems': '機械設備', 'exterior-infrastructure': '外構', exterior: 'エクステリア',
};

/** その小分類に載っているメーカー(同じ社は 1 回)。makers.json の pages は id か表示名のどちらかで入っている */
export function makersOfSub(category: string, sub: string) {
  const label = subcategoryLabel(sub);
  const seen = new Map<string, { name: string; catalog: boolean; cad: boolean; sample: boolean }>();
  for (const m of DATA[MAKERS_KEY[category]] || []) {
    if (!m.pages.includes(sub) && !m.pages.includes(label)) continue;
    const prev = seen.get(m.name);
    seen.set(m.name, {
      name: m.name,
      catalog: Boolean(prev?.catalog || m.catalog),
      cad: Boolean(prev?.cad || m.cad),
      sample: Boolean(prev?.sample || m.sample),
    });
  }
  return [...seen.values()];
}

type Params = Promise<{ sub: string }>;

export function materialSubPage(category: string) {
  const catLabel = SCREEN_LABEL[category] || category;

  const generateStaticParams = () => (CATEGORY_SUBCATEGORIES[category] || []).map((s) => ({ sub: subSlug(category, s) }));

  async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { sub: slug } = await params;
    const sub = subFromSlug(category, slug);
    if (!sub) return {};
    const label = subcategoryLabel(sub);
    const list = makersOfSub(category, sub);
    const n = list.length;
    const cad = list.filter((m) => m.cad).length;
    const url = `${SITE}${materialSubPath(category, sub)}`;
    // 「装飾材」「機能性」のように分類をまたいで同じ名前があるので、分類名も入れる
    const title = n ? `${label}(${catLabel})のメーカー一覧・比較 ${n} 社` : `${label}(${catLabel})のメーカー`;
    const description = n
      ? `${catLabel}「${label}」のメーカー ${n} 社を、カタログ・CAD(${cad} 社)・サンプルの有無で比べられます。${list.slice(0, 5).map((m) => m.name).join('、')}${n > 5 ? ' ほか' : ''}。商品ページ・営業所・問い合わせ先へ直接つながります。`
      : `${catLabel}「${label}」のメーカー情報。掲載メーカーを募集しています。`;
    return {
      // 分類の layout が題を文字列で決めているため、サイト共通の「 | yaneyuka」が付かない。ここで付ける
      title: { absolute: `${title} | yaneyuka` },
      description,
      alternates: { canonical: url },
      openGraph: { title: `yaneyuka | ${title}`, description, type: 'website', url },
    };
  }

  async function Page({ params }: { params: Params }) {
    const { sub: slug } = await params;
    const sub = subFromSlug(category, slug);
    if (!sub) return null;
    const label = subcategoryLabel(sub);
    const list = makersOfSub(category, sub);
    const url = `${SITE}${materialSubPath(category, sub)}`;
    const data = [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${label}のメーカー一覧・比較`,
        url,
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: list.length,
          itemListElement: list.map((m, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'Organization', name: m.name } })),
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'ホーム', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: catLabel, item: `${SITE}${CATEGORY_ROUTES[category]}/` },
          { '@type': 'ListItem', position: 3, name: label, item: url },
        ],
      },
    ];
    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
  }

  return { generateStaticParams, generateMetadata, Page };
}
