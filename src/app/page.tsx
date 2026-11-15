// yaneyuka トップページ中央カラム(モック「高級感 3」Q4:ポータルとして密に)。2026-11-13 に作り直した。
// 本文はサーバーで組み立てて配信 HTML に載せる(検索エンジン向け)。案件・NEWS・イベントだけブラウザで読む。
import { FORCE_FLOW_PUBLIC } from '@/lib/forceFlowGate';
import Link from 'next/link';
import { screensInGroup, screenPath } from '@/lib/siteScreens';
import { designPosts } from '@/data/design-posts';
import { DESIGN_TOOL_MENU } from '@/lib/designToolsMenu';
import { TOOL_ART } from '@/components/home/toolArt';
import { HomeCase, HomeComps, HomeEvents, HomeNews, HomeNewProducts, ScreenLink, type HomeComp } from '@/components/home/HomeParts';
import makers from '@/data/makers.json';
import makerFeeds from '@/data/maker-feeds.json';
import competitions from '@/data/competitions.json';

/** よく使う設計ツール 8 本(分野の略称・図・短い説明はモックどおり) */
const FAVORITES: Array<{ cat: string; sub: string; tag: string; art: string; desc: string }> = [
  { cat: 'detail-design', sub: 'glass-thickness', tag: '意匠', art: 'glass', desc: '風圧力に対する板厚' },
  { cat: 'detail-design', sub: 'condensation', tag: '意匠', art: 'cond', desc: '温度分布と露点' },
  { cat: 'detail-design', sub: 'building-rainwater', tag: '意匠', art: 'rain', desc: '軒樋・ルーフドレン' },
  // 構造フローは公開前(src/lib/forceFlowGate.ts)。それまでは荷重計算を出す
  FORCE_FLOW_PUBLIC
    ? { cat: 'structural-design', sub: 'force-flow', tag: '構造', art: 'force', desc: '力の流れを実寸で' }
    : { cat: 'structural-design', sub: 'load-calc', tag: '構造', art: 'force', desc: '固定・積載・積雪' },
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
  // 建築の調べもの(/lookup/)= 設計情報 / 材料情報。設計情報は記事の分類と件数、材料情報は分野
  const infoCats = Object.entries(
    designPosts.reduce<Record<string, number>>((m, p) => ((m[p.category] = (m[p.category] || 0) + 1), m), {})
  ).sort((a, b) => b[1] - a[1]);
  const MATERIAL_FIELDS = ['意匠', '構造', '機械', '電気'];
  const makerTotal = new Set(Object.values(makers as unknown as Record<string, { name: string }[]>).flat().map((m) => m.name)).size;
  // メーカーのお知らせ:各社サイトの更新(新しい順 5 件。社名と同じだけの題は除く)
  const makerNews = (makerFeeds as { feeds: { origin: string; name: string; sample: string[]; newest: string }[] }).feeds
    .filter((f) => f.newest && f.sample?.length && (f.sample[1] || f.sample[0]) !== f.name)
    .sort((x, y) => y.newest.localeCompare(x.newest))
    .slice(0, 5);
  const latestPosts = [...designPosts].sort((x, y) => y.date.localeCompare(x.date) || y.id.localeCompare(x.id)).slice(0, 5);
  const month = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 7);

  return (
    <div className="yy-home">
      <h1 className="sr-only">yaneyuka — 建築・建設業界の業務支援ポータル</h1>
      <HomeCase />

      <div className="yy-home__cols">
        {/* 左:建材と設計ツール */}
        <div className="yy-home__main">
          {/* 建材(2026-11-15 作り替え)。16 分類の一覧は建材トップ(/materials/)にあるので、ここは分類の入口 1 行と
              新製品・メーカーのお知らせ(動きのあるもの)にする */}
          <section>
            <SecHead no="I" title="建材" right={<Link href="/materials/">{mats.length} 分類 · {makerTotal} 社 ›</Link>} />
            <nav className="yy-home__matstrip" aria-label="建材の分類">
              {mats.map((m) => (
                <Link key={m.id} href={`${screenPath(m.id)}/`}>
                  {m.label}
                </Link>
              ))}
            </nav>
            <div className="yy-home__grid2 yy-home__matnews">
              <div>
                <h3 className="yy-home__h3">
                  新製品 <Link href="/new-products/">すべて ›</Link>
                </h3>
                <HomeNewProducts limit={5} />
              </div>
              <div>
                <h3 className="yy-home__h3">メーカーのお知らせ</h3>
                <ul className="yy-home__notes">
                  {makerNews.map((f) => (
                    <li key={f.origin}>
                      <span className="yy-home__meta">
                        <span>{f.name}</span>
                        <span>{f.newest.slice(5).replace('-', '/')}</span>
                      </span>
                      <a href={f.origin} target="_blank" rel="noopener noreferrer" title={f.sample[1] || f.sample[0]}>
                        {f.sample[1] || f.sample[0]}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
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
          <section>
            <SecHead no="V" title="コンペ · 締切が近いもの" right={<Link href="/competitions/">すべて</Link>} />
            <HomeComps items={(competitions as { items: HomeComp[] }).items} />
          </section>
        </div>

        {/* 右:調べものと法規 */}
        <div className="yy-home__side">
          <section>
            <SecHead no="VI" title="建築の調べもの" right={`${designPosts.length} 記事 · ${MATERIAL_FIELDS.length} 分野`} />
            <h3 className="yy-home__h3">新着の記事</h3>
            <ol className="yy-home__toc yy-home__latest">
              {latestPosts.map((p) => (
                <li key={p.id}>
                  <Link href={`/lookup/post/${encodeURIComponent(p.id)}/`} title={p.title}>
                    <span className="yy-home__toct">{p.title}</span>
                    <span className="yy-home__n">{p.category}</span>
                  </Link>
                </li>
              ))}
            </ol>
            <h3 className="yy-home__h3">分野</h3>
            <ol className="yy-home__toc">
              {infoCats.map(([cat, n], i) => (
                <li key={cat}>
                  <Link href="/lookup/">
                    <span className="yy-home__tocno">{String(i + 1).padStart(2, '0')}</span>
                    <span className="yy-home__toct">設計情報 · {cat}</span>
                    <span className="yy-leader" />
                    <span className="yy-home__n">{n}</span>
                  </Link>
                </li>
              ))}
              {MATERIAL_FIELDS.map((f, i) => (
                <li key={f}>
                  <Link href="/lookup/?tab=material">
                    <span className="yy-home__tocno is-tool">{String(infoCats.length + i + 1).padStart(2, '0')}</span>
                    <span className="yy-home__toct">材料情報 · {f}の早見表</span>
                    <span className="yy-leader" />
                    <span className="yy-home__n">表</span>
                  </Link>
                </li>
              ))}
            </ol>
            <Link className="yy-home__more" href="/lookup/">
              調べものへ <span aria-hidden="true">›</span>
            </Link>
          </section>
          <section>
            <SecHead no="VII" title="法規" />
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
