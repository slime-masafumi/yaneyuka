import Link from 'next/link';
import PageHead, { Stat } from '@/components/ui/PageHead';
import { LOOKUP_CATEGORIES, LOOKUP_ORDER, LOOKUP_TOOL_LINKS, LOOKUP_TOTAL, countItems, type LookupCategory } from '@/lib/lookup';
import LookupFilter from './LookupFilter';

/**
 * 建築の調べもの(モック「高級感 3」Q1)。/lookup/ と /lookup/{分野}/ が共有する本文。
 *   頭 … 1 行の見出し + 数字 + 絞り込み
 *   分野タブ … 4 分野(どれも URL を持つページ)
 *   本文 … 章ごとに「項目 ……… 根拠」を 2 段組。ツールにつながる項目は緑の点 + リンク
 *   右 … 目次(章 ……… 項目数)。ツールにつながる章は番号を緑
 * サーバーで組むので、2,000 項目すべてが配信 HTML に載る(検索エンジン向け)。
 */
const toolSections = new Set(Object.keys(LOOKUP_TOOL_LINKS).map((id) => id.split('-').slice(0, 2).join('-')));

export default function LookupBook({ category }: { category: LookupCategory }) {
  const c = category;
  const cats = LOOKUP_ORDER.map((slug) => LOOKUP_CATEGORIES.find((x) => x.slug === slug)!).filter(Boolean);
  const tools = Object.keys(LOOKUP_TOOL_LINKS).filter((id) => id.startsWith(`${c.sections[0]?.id.split('-')[0]}-`)).length;

  return (
    <div className="yy-lkb">
      <PageHead
        no="06"
        en="lookup"
        title="建築の調べもの"
        desc="「これはどこで決まる?」を条文と計算から引く"
        right={
          <>
            <Stat n={LOOKUP_TOTAL.toLocaleString('ja-JP')} label="項目" />
            <Stat n={cats.length} label="分野" />
            <Stat n={c.sections.length} label="章" />
            <LookupFilter />
          </>
        }
      />
      <nav className="yy-tabs" aria-label="分野">
        {cats.map((x) => (
          <Link key={x.slug} href={`/lookup/${x.slug}/`} className="yy-tab" aria-pressed={x.slug === c.slug}>
            {x.label}
            <small>{countItems(x)}</small>
          </Link>
        ))}
      </nav>

      <div className="yy-lkb__body">
        <div className="yy-lkb__chapters">
          {c.sections.map((s, i) => {
            const hasTool = toolSections.has(s.id);
            return (
              <section key={s.id} id={s.id} className="yy-lkb__chap">
                <h2 className="yy-lkb__ch">
                  <span className={`yy-lkb__no${hasTool ? ' is-tool' : ''}`}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="yy-lkb__title">{s.title}</span>
                  <span className="yy-lkb__n">{s.items.length} 項目</span>
                </h2>
                <ol className="yy-lkb__items">
                  {s.items.map((it) => {
                    const tool = LOOKUP_TOOL_LINKS[it.id];
                    return (
                      <li key={it.id} id={it.id} data-q={`${it.title} ${it.basis}`}>
                        {tool && <i className="yy-dot" />}
                        <span className="yy-lkb__it" title={it.title}>{it.title}</span>
                        <span className="yy-leader" />
                        {tool ? (
                          <Link className="yy-lkb__tool" href={tool.href}>{tool.label}</Link>
                        ) : (
                          <span className="yy-lkb__basis" title={it.basis}>{it.basis}</span>
                        )}
                        <span className="yy-fmt">{it.format}</span>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>

        <aside className="yy-lkb__toc" aria-label="目次">
          <div className="yy-sec">
            <span className="yy-sec__title">目次</span>
            <span className="yy-sec__right">{c.label} · {c.sections.length} 章</span>
          </div>
          <ol>
            {c.sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>
                  <span className={`yy-home__tocno${toolSections.has(s.id) ? ' is-tool' : ''}`}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="yy-home__toct">{s.title}</span>
                  <span className="yy-leader" />
                  <span className="yy-home__n">{s.items.length}</span>
                </a>
              </li>
            ))}
          </ol>
          <p className="yy-lkb__legend">
            <i className="yy-dot" />緑の章・項目は計算ツールにつながる{tools ? `(${tools} 項目)` : ''}
          </p>
          <p className="yy-lkb__legend">根拠条文は略記です。採用の際は原文と最新の改正を確認してください。</p>
        </aside>
      </div>
    </div>
  );
}
