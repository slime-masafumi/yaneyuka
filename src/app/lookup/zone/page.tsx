import Link from 'next/link';
import type { Metadata } from 'next';
import PageHead from '@/components/ui/PageHead';
import { SecHead } from '@/components/ui/Sheet';
import { ZONE_GUIDES, zoneSetback, zoneShadow } from '@/lib/zoneGuide';
import '@/components/content/Userpage/info-pages.css';

/** 用途地域 13 種類の一覧と比較表 /lookup/zone/。2026-11-15。数値の出どころは src/lib/zoneGuide.ts */
export const metadata: Metadata = {
  title: '用途地域 13 種類の一覧 — 建蔽率・容積率・高さ制限・日影規制の比較表',
  description:
    '第一種低層住居専用地域から工業専用地域まで、用途地域 13 種類の建蔽率・容積率・絶対高さ・道路斜線・隣地斜線・北側斜線・日影規制を 1 つの表で比べられます。地域ごとに建てられる建物(建築基準法 別表第二)の解説ページへ。',
  alternates: { canonical: '/lookup/zone/' },
};

const range = (ns: number[]) => (ns.length === 1 ? `${ns[0]}` : `${ns[0]}〜${ns[ns.length - 1]}`);

export default function ZoneIndexPage() {
  const groups = ['住居系', '商業系', '工業系'] as const;
  return (
    <div className="yy-di" id="yy-di-top">
      <PageHead no="14" en="zoning" title="用途地域" desc="13 地域の建築制限を条文の値で" level={2} />
      <div className="yy-di-read">
        <article className="yy-di-article">
          <nav className="yy-di-crumb" aria-label="ページの位置">
            <Link href="/lookup/">← 建築の調べもの</Link>
          </nav>
          <h1 className="yy-di-title">用途地域 13 種類の一覧と比較</h1>
          <div className="yy-di-content">
            <p className="yy-di-p">
              用途地域は、都市計画法で定める 13 種類の地域です。地域ごとに、建てられる建物の用途(建築基準法 別表第二)と、建蔽率・容積率・高さの制限が決まっています。下の表は条文で決まっている値の範囲で、実際の数値は市区町村の都市計画で 1 つに決まります。地域名から、建てられる建物の一覧と詳しい値のページに移れます。
            </p>
            <div className="yy-di-tblwrap">
              <table className="yy-di-tbl">
                <thead>
                  <tr>
                    <th>用途地域</th>
                    <th>建蔽率(%)</th>
                    <th>容積率(%)</th>
                    <th>絶対高さ</th>
                    <th>道路斜線</th>
                    <th>隣地斜線</th>
                    <th>北側斜線</th>
                    <th>日影規制</th>
                  </tr>
                </thead>
                <tbody>
                  {ZONE_GUIDES.map((z) => {
                    const sb = zoneSetback(z);
                    const sh = zoneShadow(z);
                    return (
                      <tr key={z.id}>
                        <td>
                          <Link href={`/lookup/zone/${z.id}/`}>{z.name}</Link>
                        </td>
                        <td>{z.bcr.join(' / ')}</td>
                        <td>{range(z.far)}</td>
                        <td>{z.absHeight ? `${z.absHeight.join(' / ')}m` : '—'}</td>
                        <td>{sb.road.slope}</td>
                        <td>{sb.neighbor ? `${sb.neighbor[0]}m + ${sb.neighbor[1]}` : '—'}</td>
                        <td>{sb.north === null ? '—' : `${sb.north}m + 1.25`}</td>
                        <td>{sh ? sh.applies : '対象外'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="yy-di-note">
              根拠: 都市計画法 第 9 条 / 建築基準法 第 48 条・別表第二、第 52 条(容積率)、第 53 条(建蔽率)、第 55 条(絶対高さ)、第 56 条・別表第三(斜線)、第 56 条の 2・別表第四(日影)。e-Gov の現行条文で照合(2026-11-15)。北側斜線は、第一種・第二種中高層住居専用地域のうち日影規制の対象区域ではかかりません。
            </p>

            {groups.map((g) => (
              <section key={g}>
                <h2 className="yy-di-ch">
                  <span className="yy-di-chno">{g === '住居系' ? '01' : g === '商業系' ? '02' : '03'}</span>
                  <span>{g}</span>
                </h2>
                <ul className="yy-di-ul">
                  {ZONE_GUIDES.filter((z) => z.group === g).map((z) => (
                    <li key={z.id}>
                      <Link href={`/lookup/zone/${z.id}/`}>{z.name}</Link> — {z.purpose}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </article>

        <aside className="yy-info-side">
          <section className="yy-info-block" aria-label="計算ツール">
            <SecHead no="I" title="計算ツール" />
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
          <section className="yy-info-block" aria-label="関連">
            <SecHead no="II" title="関連" />
            <ul className="yy-info-toc">
              <li>
                <Link href="/lookup/">
                  <span className="yy-info-toct">設計情報(法規の記事)</span>
                  <span className="yy-leader" />
                  <span className="yy-info-tocv">読みもの</span>
                </Link>
              </li>
              <li>
                <Link href="/lookup/material/">
                  <span className="yy-info-toct">材料情報</span>
                  <span className="yy-leader" />
                  <span className="yy-info-tocv">早見表</span>
                </Link>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
