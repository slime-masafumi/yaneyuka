import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PageHead from '@/components/ui/PageHead';
import { SecHead } from '@/components/ui/Sheet';
import { ZONE_GUIDES, pct, roadRows, zoneGuide, zoneSetback, zoneShadow, zoneUses } from '@/lib/zoneGuide';
import '@/components/content/Userpage/info-pages.css';

/**
 * 用途地域の解説ページ /lookup/zone/{id}/(13 地域)。2026-11-15
 * 1 地域 1 ページで、建てられるもの(別表第二)・建蔽率・容積率・高さの制限・日影規制を条文の値でまとめる。
 * 数値の出どころは src/lib/zoneGuide.ts の頭書き。
 */
const SITE = 'https://yaneyuka.com';
export const dynamicParams = false;

export function generateStaticParams() {
  return ZONE_GUIDES.map((z) => ({ id: z.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const z = zoneGuide(id);
  if (!z) return {};
  const h = z.absHeight ? `絶対高さ ${z.absHeight.join('m / ')}m、` : '';
  const description = `${z.name}で建てられる建物(建築基準法 別表第二${z.item}項)、建蔽率 ${pct(z.bcr)}・容積率 ${z.far[0]}〜${z.far[z.far.length - 1]}%、${h}道路斜線・隣地斜線・北側斜線、日影規制を条文の値でまとめています。`;
  const url = `/lookup/zone/${z.id}/`;
  return {
    title: `${z.name}とは — 建てられる建物・建蔽率・容積率・高さ制限`,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${z.name}の建築制限`, description, type: 'article', url },
  };
}

export default async function ZonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const z = zoneGuide(id);
  if (!z) notFound();
  const uses = zoneUses(z.id);
  const sb = zoneSetback(z);
  const sh = zoneShadow(z);
  const rows = roadRows(z);
  const i = ZONE_GUIDES.findIndex((x) => x.id === z.id);
  const prev = i > 0 ? ZONE_GUIDES[i - 1] : null;
  const next = i < ZONE_GUIDES.length - 1 ? ZONE_GUIDES[i + 1] : null;
  const permitted = uses?.type === 'permitted';
  const heads = ['地域の目的', permitted ? '建てられる建物' : '建てられない建物', '建蔽率・容積率', '高さの制限', '日影規制', '敷地・外壁', '根拠'];

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${z.name}とは — 建てられる建物・建蔽率・容積率・高さ制限`,
      inLanguage: 'ja',
      mainEntityOfPage: `${SITE}/lookup/zone/${z.id}/`,
      author: { '@type': 'Organization', name: 'yaneyuka', url: SITE },
      publisher: { '@type': 'Organization', name: '合同会社slime', url: SITE },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '建築の調べもの', item: `${SITE}/lookup/` },
        { '@type': 'ListItem', position: 2, name: '用途地域', item: `${SITE}/lookup/zone/` },
        { '@type': 'ListItem', position: 3, name: z.name, item: `${SITE}/lookup/zone/${z.id}/` },
      ],
    },
  ];

  const Ch = ({ n }: { n: number }) => (
    <h2 id={`zone-${n}`} className="yy-di-ch">
      <span className="yy-di-chno">{String(n + 1).padStart(2, '0')}</span>
      <span>{heads[n]}</span>
    </h2>
  );

  return (
    <div className="yy-di" id="yy-di-top">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHead no="14" en="zoning" title="用途地域" desc="13 地域の建築制限を条文の値で" level={2} />
      <div className="yy-di-read">
        <article className="yy-di-article">
          <nav className="yy-di-crumb" aria-label="ページの位置">
            <Link href="/lookup/zone/">← 用途地域の一覧</Link>
            <span>/</span>
            <span>{z.group}</span>
          </nav>
          <div className="yy-di-meta">
            <span>{z.group}</span>
            <span>建築基準法 別表第二 {z.item}項</span>
          </div>
          <h1 className="yy-di-title">{z.name}</h1>

          <div className="yy-di-content">
            <p className="yy-di-p">
              {z.name}は、都市計画法の 13 種類の用途地域の 1 つです。建てられる建物の用途・建蔽率・容積率・高さの制限は、建築基準法で地域ごとに決まっています。このページは条文の値をまとめたもので、実際の数値(建蔽率・容積率のどれが指定されているか、日影規制の時間、高度地区など)は市区町村の都市計画図で確かめてください。
            </p>

            <Ch n={0} />
            <p className="yy-di-note">{z.name}は、{z.purpose}とする。(都市計画法 第 9 条)</p>

            <Ch n={1} />
            {permitted ? (
              <p className="yy-di-p">
                {z.name}では、次に挙げる建築物<strong>だけ</strong>が建てられます(建築基準法 別表第二{z.item}項)。ここに無い用途は、特定行政庁の許可(法 48 条ただし書)が無い限り建てられません。
              </p>
            ) : (
              <p className="yy-di-p">
                {z.name}では、次に挙げる建築物<strong>は建てられません</strong>(建築基準法 別表第二{z.item}項)。ここに無い用途は原則として建てられます。他の項(「(ほ)項第二号」など)を引いているものは、その項の号を含みます。
              </p>
            )}
            <ol className="yy-di-ol">
              {uses?.items.map((t) => (
                <li key={t}>{t.replace(/^[一二三四五六七八九十]+　/, '')}</li>
              ))}
            </ol>

            <Ch n={2} />
            <div className="yy-di-tblwrap">
              <table className="yy-di-tbl">
                <thead>
                  <tr>
                    <th>項目</th>
                    <th>値(都市計画で定めるもの)</th>
                    <th>根拠</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>建蔽率</td>
                    <td>{pct(z.bcr)}</td>
                    <td>法 53 条 1 項</td>
                  </tr>
                  <tr>
                    <td>容積率</td>
                    <td>{pct(z.far)}</td>
                    <td>法 52 条 1 項</td>
                  </tr>
                  <tr>
                    <td>前面道路の幅員による容積率(幅員 12m 未満)</td>
                    <td>
                      幅員(m)× {z.roadCoef.base}
                      {z.roadCoef.designated ? `(特定行政庁が指定する区域は ${z.roadCoef.designated})` : ''}
                    </td>
                    <td>法 52 条 2 項</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ul className="yy-di-ul">
              <li>容積率は、都市計画で定めた値と前面道路の幅員による値の小さいほうです。</li>
              <li>
                建蔽率は、防火地域内の耐火建築物等・準防火地域内の耐火建築物等または準耐火建築物等で +10%、特定行政庁が指定する角地で +10% になります(両方なら +20%)。
                {z.bcr.includes(80) ? '建蔽率 80% の地域の防火地域内にある耐火建築物等は、建蔽率の制限がかかりません。' : ''}(法 53 条 3 項・6 項)
              </li>
            </ul>

            <Ch n={3} />
            <div className="yy-di-tblwrap">
              <table className="yy-di-tbl">
                <thead>
                  <tr>
                    <th>制限</th>
                    <th>{z.name}での値</th>
                    <th>根拠</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>絶対高さ</td>
                    <td>{z.absHeight ? `${z.absHeight.join('m または ')}m(都市計画で定める)` : 'かからない'}</td>
                    <td>法 55 条</td>
                  </tr>
                  <tr>
                    <td>道路斜線</td>
                    <td>勾配 {sb.road.slope}(前面道路の反対側の境界線から、下の適用距離の範囲)</td>
                    <td>法 56 条 1 項 1 号・別表第三</td>
                  </tr>
                  <tr>
                    <td>隣地斜線</td>
                    <td>{sb.neighbor ? `立上り ${sb.neighbor[0]}m + 勾配 ${sb.neighbor[1]}` : 'かからない(絶対高さで抑える)'}</td>
                    <td>法 56 条 1 項 2 号</td>
                  </tr>
                  <tr>
                    <td>北側斜線</td>
                    <td>
                      {sb.north === null
                        ? 'かからない'
                        : `立上り ${sb.north}m + 勾配 1.25${sb.north === 10 ? '(日影規制の対象区域では、かからない)' : ''}`}
                    </td>
                    <td>法 56 条 1 項 3 号</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <h3 className="yy-di-sub">道路斜線の適用距離(別表第三)</h3>
            <div className="yy-di-tblwrap">
              <table className="yy-di-tbl">
                <thead>
                  <tr>
                    <th>容積率の限度(%)</th>
                    <th>適用距離</th>
                    <th>勾配</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.far}>
                      <td>{r.far}</td>
                      <td>{r.dist}m</td>
                      <td>{sb.road.slope}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sb.wide12 && <p className="yy-di-note">前面道路の幅員が 12m 以上のときは、道路の反対側の境界線から「1.25 × 幅員」以上離れた範囲の勾配が 1.5 になります(法 56 条 3 項・4 項)。</p>}
            <p className="yy-di-p">
              建物の面ごとの許される高さは、<Link href="/calc/setback-regulation/">斜線制限の計算ツール</Link>で出せます。
            </p>

            <Ch n={4} />
            {sh ? (
              <>
                <p className="yy-di-p">
                  対象になる建築物: <strong>{sh.applies}</strong>。測定面の高さ: {sh.planes.map((p) => `${p}m`).join(' または ')}(平均地盤面から)。規制時間は、別表第四の号のうち地方公共団体が条例で指定したものです。
                </p>
                <div className="yy-di-tblwrap">
                  <table className="yy-di-tbl">
                    <thead>
                      <tr>
                        <th>号</th>
                        <th>5m を超え 10m 以内</th>
                        <th>10m を超える範囲</th>
                        <th>北海道(5m 超 10m 以内 / 10m 超)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sh.rows.map((r) => (
                        <tr key={r.go}>
                          <td>{r.go}</td>
                          <td>{r.near} 時間</td>
                          <td>{r.far} 時間</td>
                          <td>
                            {r.nearH} / {r.farH} 時間
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="yy-di-p">
                  冬至日の真太陽時 8〜16 時(北海道は 9〜15 時)に、敷地境界線からの距離ごとの日影時間で判定します。<Link href="/calc/shadow-regulation/">日影規制の計算ツール</Link>で建物の形から時間を出せます。
                </p>
              </>
            ) : (
              <p className="yy-di-p">
                {z.name}は、日影規制(法 56 条の 2)の対象区域になりません(別表第四に無い)。ただし、対象区域に日影を落とす高さ 10m 超の建築物は、その対象区域にあるものとみなして規制がかかります(法 56 条の 2 第 4 項)。
              </p>
            )}

            <Ch n={5} />
            <ul className="yy-di-ul">
              <li>敷地面積の最低限度: 都市計画で定められた場合、その面積以上(定める場合は 200㎡ 以下。法 53 条の 2)</li>
              <li>
                外壁の後退距離:{' '}
                {z.wallSetback ? '都市計画で定められた場合、外壁またはこれに代わる柱の面から敷地境界線まで 1.5m または 1m 以上(法 54 条)' : 'この地域には、法 54 条の外壁の後退距離はかからない'}
              </li>
            </ul>

            <Ch n={6} />
            <ul className="yy-di-ul">
              <li>都市計画法 第 9 条(用途地域の目的)</li>
              <li>建築基準法 第 48 条・別表第二(用途の制限)</li>
              <li>建築基準法 第 52 条(容積率)・第 53 条(建蔽率)・第 53 条の 2(敷地面積の最低限度)・第 54 条(外壁の後退距離)・第 55 条(絶対高さ)</li>
              <li>建築基準法 第 56 条・別表第三(斜線制限)/ 第 56 条の 2・別表第四(日影規制)</li>
            </ul>
            <p className="yy-di-note">条文は e-Gov 法令検索の現行版(2026-11-15 に照合)。高度地区・地区計画・建築協定・条例による上乗せは、このページに入っていません。</p>
          </div>

          <nav className="yy-di-pager" aria-label="前後の用途地域">
            {prev ? (
              <Link href={`/lookup/zone/${prev.id}/`}>
                <span className="yy-label">← 前の地域</span>
                <span>{prev.name}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={`/lookup/zone/${next.id}/`} className="is-next">
                <span className="yy-label">次の地域 →</span>
                <span>{next.name}</span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </article>

        <aside className="yy-info-side">
          <section className="yy-info-block" aria-label="目次">
            <SecHead no="I" title="目次" right={`${heads.length} 章`} />
            <ol className="yy-info-toc">
              {heads.map((h, n) => (
                <li key={h}>
                  <a href={`#zone-${n}`}>
                    <span className="yy-info-tocno">{String(n + 1).padStart(2, '0')}</span>
                    <span className="yy-info-toct">{h}</span>
                  </a>
                </li>
              ))}
            </ol>
          </section>
          <section className="yy-info-block" aria-label="用途地域">
            <SecHead no="II" title="用途地域" right="13 地域" />
            <ol className="yy-info-toc yy-di-samecat">
              {ZONE_GUIDES.map((x, n) => (
                <li key={x.id}>
                  <Link href={`/lookup/zone/${x.id}/`} aria-current={x.id === z.id ? 'true' : undefined}>
                    <span className="yy-info-tocno">{String(n + 1).padStart(2, '0')}</span>
                    <span className="yy-info-toct">{x.name}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
          <section className="yy-info-block" aria-label="計算ツール">
            <SecHead no="III" title="計算ツール" />
            <ul className="yy-info-toc">
              {[
                ['/calc/use-zone/', '用途地域', '建てられるもの'],
                ['/calc/building-regulations/', '建蔽率・容積率', '面積'],
                ['/calc/setback-regulation/', '斜線制限', '高さ'],
                ['/calc/shadow-regulation/', '日影規制', '時間'],
              ].map(([href, t, v]) => (
                <li key={href}>
                  <Link href={href}>
                    <span className="yy-info-toct">{t}</span>
                    <span className="yy-leader" />
                    <span className="yy-info-tocv">{v}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
