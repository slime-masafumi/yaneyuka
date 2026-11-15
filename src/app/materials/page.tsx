// 建材トップ(/materials/)。2026-11-15
// 左メニューの「建材」は以前、屋根材(/roof/)へ直接飛んでいた。16 分類をホームの建材欄と同じ一覧で並べ、
// その下に全小分類の索引を置く。本文はサーバーで組み立てて配信 HTML に載せる(検索エンジン向け)。
import Link from 'next/link';
import type { Metadata } from 'next';
import { screensInGroup, screenPath } from '@/lib/siteScreens';
import { CATEGORY_SUBCATEGORIES, materialSubPath, subcategoryLabel } from '@/lib/materialCategories';
import { MATERIAL_LINKS } from '@/lib/materialLinks';
import { matPhoto } from '@/lib/materialPhotos';
import PageHead, { Stat } from '@/components/ui/PageHead';
import makers from '@/data/makers.json';

export const metadata: Metadata = {
  title: '建材メーカー一覧(16 分類)',
  description:
    '屋根・外壁・開口部・床・壁・天井・防水・金物・設備・外構など 16 分類の建材メーカー一覧。小分類ごとに商品ページ・カタログ・CAD・サンプル・問い合わせ先をまとめています。',
  alternates: { canonical: '/materials/' },
};

type Maker = { name: string; pages: string[] };
const DATA = makers as unknown as Record<string, Maker[]>;

/** 分類のメーカー数(同じ社は 1 と数える) */
const makerCount = (category: string) => new Set((DATA[MATERIAL_LINKS[category]?.maker ?? ''] ?? []).map((m) => m.name)).size;
/** 小分類に載っているメーカー数 */
const subCount = (category: string, sub: string) => (DATA[MATERIAL_LINKS[category]?.maker ?? ''] ?? []).filter((m) => m.pages.includes(sub)).length;

function SecHead({ no, title, right }: { no: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="yy-sec">
      <span className="yy-sec__no">{no}</span>
      <span className="yy-sec__title">{title}</span>
      {right && <span className="yy-sec__right">{right}</span>}
    </div>
  );
}

export default function MaterialsPage() {
  const mats = screensInGroup('material');
  const allMakers = new Set(Object.values(DATA).flat().map((m) => m.name)).size;
  const subTotal = mats.reduce((n, m) => n + (CATEGORY_SUBCATEGORIES[m.id]?.length ?? 0), 0);
  return (
    <div className="yy-kt yy-mats">
      <h1 className="sr-only">建材メーカー一覧</h1>
      <PageHead
        en="materials"
        title="建材"
        desc="16 分類 · 小分類ごとのメーカーと基本知識"
        right={
          <>
            <Stat n={mats.length} label="分類" />
            <Stat n={subTotal} label="小分類" />
            <Stat n={allMakers} label="社" />
          </>
        }
      />

      <section>
        <SecHead no="I" title="分類" right={`${mats.length} 分類`} />
        <div className="yy-home__grid2">
          {mats.map((m, i) => {
            const photo = matPhoto(m.id);
            return (
              <Link key={m.id} className="yy-home__row" href={`${screenPath(m.id)}/`}>
                {photo ? (
                  <span className="yy-photo yy-photo--mat">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt="" loading="lazy" />
                  </span>
                ) : (
                  <span className="yy-photo yy-photo--none" aria-hidden="true" />
                )}
                <span className="yy-home__no">{String(i + 1).padStart(2, '0')}</span>
                <span className="yy-home__name">{m.label}</span>
                <span className="yy-home__n">
                  {CATEGORY_SUBCATEGORIES[m.id]?.length ?? 0} 分類 · {makerCount(m.id)} 社
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <SecHead no="II" title="小分類から探す" right={`${subTotal} 小分類 · 数字は載っているメーカー数`} />
        <div className="yy-mats__index">
          {mats.map((m) => (
            <div key={m.id} className="yy-mats__group">
              <Link className="yy-mats__cat" href={`${screenPath(m.id)}/`}>
                {m.label}
              </Link>
              <ul>
                {(CATEGORY_SUBCATEGORIES[m.id] ?? []).map((sub) => {
                  const n = subCount(m.id, sub);
                  return (
                    <li key={sub}>
                      <Link href={materialSubPath(m.id, sub)}>
                        {subcategoryLabel(sub)}
                        {n > 0 && <span className="yy-mats__n">{n}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
