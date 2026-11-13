// yaneyuka トップページ中央カラム(モック「高級感 3」Q4:ポータルとして密に)。2026-11-13 に作り直した。
// 本文はサーバーで組み立てて配信 HTML に載せる(検索エンジン向け)。案件・NEWS・イベントだけブラウザで読む。
import Link from 'next/link';
import { screensInGroup, screenPath } from '@/lib/siteScreens';
import { CATEGORY_SUBCATEGORIES } from '@/lib/materialCategories';
import { LOOKUP_CATEGORIES, LOOKUP_TOOL_LINKS, LOOKUP_TOTAL } from '@/lib/lookup';
import { DESIGN_TOOL_MENU } from '@/lib/designToolsMenu';
import { TOOL_ART } from '@/components/home/toolArt';
import { HomeCase, HomeEvents, HomeNews, ScreenLink } from '@/components/home/HomeParts';

/** 建材 16 分類の小さな写真(サイトの広告見本を流用。無い分類は図形) */
const MAT_PHOTO: Record<string, string> = {
  roof: '/image/seppan_cm_sample.png',
  'exterior-wall': '/image/gaiheki_cm_sample.png',
  opening: '/image/kaikou_cm_sample.png',
  'external-floor': '/image/gaibu-floor_cm_sample.png',
  'exterior-other': '/image/gaibu-etc_cm_sample.png',
  'internal-floor': '/image/naibu-floor_cm_sample.png',
  'internal-wall': '/image/naibu-wall_cm_sample.png',
  'internal-other': '/image/naibu-etc_cm_sample.png',
  waterproof: '/image/bousui_cm_sample.png',
  hardware: '/image/kanamono_cm_sample.png',
  furniture: '/image/kagu_cm_sample.png',
};

/** よく使う設計ツール 8 本(分野の略称・図・短い説明はモックどおり) */
const FAVORITES: Array<{ cat: string; sub: string; tag: string; art: string; desc: string }> = [
  { cat: 'detail-design', sub: 'glass-thickness', tag: '意匠', art: 'glass', desc: '風圧力に対する板厚' },
  { cat: 'detail-design', sub: 'condensation', tag: '意匠', art: 'cond', desc: '温度分布と露点' },
  { cat: 'detail-design', sub: 'building-rainwater', tag: '意匠', art: 'rain', desc: '軒樋・ルーフドレン' },
  { cat: 'structural-design', sub: 'force-flow', tag: '構造', art: 'force', desc: '力の流れを実寸で' },
  { cat: 'structural-design', sub: 'section', tag: '構造', art: 'sect', desc: '断面二次モーメント等' },
  { cat: 'mechanical', sub: 'vent-24h', tag: '設備', art: 'vent', desc: 'シックハウス対策の換気量' },
  { cat: 'mechanical', sub: 'duct-sizing', tag: '設備', art: 'duct', desc: '風量・許容圧損から' },
  { cat: 'mechanical', sub: 'vent-occupancy', tag: '設備', art: 'people', desc: '在室人数から' },
];

const LAWS: Array<[string, string]> = [
  ['建築基準法', '法 · 令 · 規則'],
  ['消防法', '法 · 令 · 規則'],
  ['都市計画法', '法 · 令 · 規則'],
  ['告示', '検索 · 通達'],
];

const toolTitle = (cat: string, sub: string) =>
  DESIGN_TOOL_MENU.find((c) => c.id === cat)?.subTabs.find((t) => t.id === sub)?.label ?? sub;
const designToolCount = DESIGN_TOOL_MENU.reduce((n, c) => n + c.subTabs.length, 0);

function SecHead({ no, title, right }: { no: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="yy-sec">
      <span className="yy-sec__no">{no}</span>
      <span className="yy-sec__title">{title}</span>
      {right && <span className="yy-sec__right">{right}</span>}
    </div>
  );
}

export default function Home() {
  const mats = screensInGroup('material');
  const design = LOOKUP_CATEGORIES[0];
  const toolSections = new Set(Object.keys(LOOKUP_TOOL_LINKS).map((id) => id.split('-').slice(0, 2).join('-')));
  const month = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 7);

  return (
    <div className="yy-home">
      <h1 className="sr-only">yaneyuka — 建築・建設業界の業務支援ポータル</h1>
      <HomeCase />

      <div className="yy-home__cols">
        {/* 左:建材と設計ツール */}
        <div className="yy-home__main">
          <section>
            <SecHead no="I" title="建材" right={`${mats.length} カテゴリ · メーカーと基本知識`} />
            <div className="yy-home__grid2">
              {mats.map((m, i) => {
                const subs = CATEGORY_SUBCATEGORIES[m.id] ?? [];
                const photo = MAT_PHOTO[m.id];
                return (
                  <Link key={m.id} className="yy-home__row" href={`${screenPath(m.id)}/`}>
                    {photo ? (
                      <span className="yy-photo">
                        <img src={photo} alt="" loading="lazy" />
                      </span>
                    ) : (
                      <span className="yy-photo yy-photo--none" aria-hidden="true" />
                    )}
                    <span className="yy-home__no">{String(i + 1).padStart(2, '0')}</span>
                    <span className="yy-home__name">{m.label}</span>
                    <span className="yy-home__n">{subs.length} 分類</span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section>
            <SecHead no="II" title="設計ツール" right={`${designToolCount} 本 · よく使うもの`} />
            <div className="yy-home__grid2">
              {FAVORITES.map((t) => (
                <ScreenLink
                  key={t.sub}
                  className="yy-home__row"
                  target={{ menu: 'design-tools', category: t.cat, sub: t.sub }}
                >
                  <svg className="yy-thumb" viewBox="0 0 270 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" dangerouslySetInnerHTML={{ __html: TOOL_ART[t.art] ?? '' }} />
                  <span className="yy-home__tag">{t.tag}</span>
                  <span className="yy-home__name">{toolTitle(t.cat, t.sub)}</span>
                  <span className="yy-home__desc">{t.desc}</span>
                </ScreenLink>
              ))}
            </div>
            <ScreenLink className="yy-home__more" target={{ menu: 'design-index' }}>
              {designToolCount} 本すべて <span aria-hidden="true">›</span>
            </ScreenLink>
          </section>
        </div>

        {/* 中:NEWS とイベント */}
        <div className="yy-home__mid">
          <section>
            <SecHead no="III" title="NEWS" right={<Link href="/news/">{month}</Link>} />
            <HomeNews />
          </section>
          <section>
            <SecHead no="IV" title="イベント" right={<Link href="/event/">すべて</Link>} />
            <HomeEvents />
          </section>
        </div>

        {/* 右:調べものと法規 */}
        <div className="yy-home__side">
          <section>
            <SecHead no="V" title="建築の調べもの" right={`${LOOKUP_TOTAL.toLocaleString('ja-JP')} 項目`} />
            <ol className="yy-home__toc">
              {design.sections.slice(0, 12).map((s, i) => (
                <li key={s.id}>
                  <Link href={`/lookup/${design.slug}/#${s.id}`}>
                    <span className={`yy-home__tocno${toolSections.has(s.id) ? ' is-tool' : ''}`}>{String(i + 1).padStart(2, '0')}</span>
                    <span className="yy-home__toct">{s.title}</span>
                    <span className="yy-leader" />
                    <span className="yy-home__n">{s.items.length}</span>
                  </Link>
                </li>
              ))}
            </ol>
            <Link className="yy-home__more" href="/lookup/">
              目次へ <span aria-hidden="true">›</span>
            </Link>
          </section>
          <section>
            <SecHead no="VI" title="法規" />
            <ol className="yy-home__toc">
              {LAWS.map(([a, b]) => (
                <li key={a}>
                  <Link href="/regulations/">
                    <span className="yy-home__toct">{a}</span>
                    <span className="yy-leader" />
                    <span className="yy-home__n">{b}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
