'use client';

import React, { useState } from 'react';
import PageHead, { Stat } from '../ui/PageHead';
import { CountList, RequestPanel, Sec, todayJST } from './ConnectParts';
import BrickWall from '../ui/BrickWall';
import FeedPic from '../ui/FeedPic';
import { useReadLinks } from '@/lib/readLinks';
import COMPS from '@/data/competitions.json';
import './connect-pages.css';

/**
 * コンペ。2026-11-14 に架空の見本を外し、主催者・自治体の公式ページから「事実 + リンク」だけを載せる形にした。
 * 名称・主催・締切・対象は src/data/competitions.json(公式ページで確かめた値。説明文・画像は写さない)。
 * 一覧は馬目地のレンガ(1 枚 1 件。締切を大きく)、右に締切が近いもの。
 */
type Comp = {
  id: string;
  title: string;
  organizer: string;
  category: 'public' | 'private' | 'student' | 'idea';
  /** 応募(提出)の締切 YYYY-MM-DD */
  deadline: string;
  /** 参加表明・登録の締切(あれば) */
  register?: string;
  target: string;
  summary?: string;
  url: string;
};

const DATA = COMPS as { checked: string; items: Comp[] };

const TABS: { key: Comp['category'] | 'all'; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'public', label: '公共' },
  { key: 'private', label: '民間' },
  { key: 'student', label: '学生' },
  { key: 'idea', label: 'アイデア' },
];
const LABEL: Record<Comp['category'], string> = { public: '公共', private: '民間', student: '学生', idea: 'アイデア' };

interface CompetitionsProps {
  onNavigateToRegistration?: () => void;
}

const Competitions: React.FC<CompetitionsProps> = ({ onNavigateToRegistration }) => {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('all');
  const { isRead, readProps } = useReadLinks();
  const today = todayJST();
  const md = (iso: string) => iso.slice(5).replace('-', '.');
  const yy = (iso: string) => (iso.slice(0, 4) !== today.slice(0, 4) ? `’${iso.slice(2, 4)} ` : '');
  const daysLeft = (iso: string) => Math.round((Date.parse(iso) - Date.parse(today)) / 86400000);
  const leftLabel = (iso: string) => {
    const d = daysLeft(iso);
    return d < 0 ? '締切済' : d === 0 ? '本日締切' : `あと ${d} 日`;
  };
  // 次に来る締切: 参加表明・登録の締切がまだなら それ、過ぎていれば応募できないので載せない。無ければ提出の締切
  const next = (x: Comp): { date: string; kind: string } | null =>
    x.register ? (x.register >= today ? { date: x.register, kind: '登録締切' } : null) : x.deadline >= today ? { date: x.deadline, kind: '締切' } : null;
  const open = DATA.items
    .map((x) => ({ ...x, next: next(x) }))
    .filter((x): x is Comp & { next: { date: string; kind: string } } => x.next !== null)
    .sort((a, b) => a.next.date.localeCompare(b.next.date));
  const items = tab === 'all' ? open : open.filter((x) => x.category === tab);
  const count = (k: string) => (k === 'all' ? open.length : open.filter((x) => x.category === k).length);

  return (
    <div>
      <PageHead
        no="17"
        en="competitions"
        title="コンペ"
        desc="設計競技・プロポーザル・学生/アイデアコンペを、主催者の公式ページから"
        right={
          <>
            <Stat n={open.length} label="件 募集中" />
            <Stat n={TABS.length - 1} label="分類" />
            <a href="/register" className="yy-stat" style={{ textDecoration: 'none' }}>
              掲載希望はコチラ ↗
            </a>
          </>
        }
      />

      <div className="yy-tabs">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} aria-pressed={tab === t.key} className="yy-tab">
            {t.label}
            <small>{count(t.key)}</small>
          </button>
        ))}
      </div>

      <div className="yy-newspage">
        <div className="yy-newspage__main">
          <section className="yy-cn-list">
            <Sec no="I" title={TABS.find((t) => t.key === tab)?.label} right={`${items.length} 件 · 締切の近い順 · ${md(DATA.checked)} に公式ページで確認`} />
            {items.length === 0 ? (
              <p className="yy-home__empty">いま募集中のコンペはありません。</p>
            ) : (
              <BrickWall
                items={items}
                label="募集中のコンペ"
                brick={290}
                className="yy-brick--card yy-brick--ev"
                keyOf={(item) => item.id}
                render={(item, { half }) => (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`yy-bc${isRead(item.url) ? ' is-read' : ''}`}
                    title={[item.title, `主催: ${item.organizer}`, `対象: ${item.target}`, item.register ? `登録締切 ${item.register}` : '', `締切 ${item.deadline}`].filter(Boolean).join(' / ')}
                    {...readProps(item.url)}
                  >
                    <span className="yy-bc__pic">
                      {/* 主催者の画像は使わない(権利のため)。分類と主催の表紙 */}
                      <FeedPic size="row" cover={{ label: `COMPE · ${LABEL[item.category]}`, word: item.organizer }} />
                    </span>
                    <span className="yy-bc__body">
                      <span className="yy-bc__big">
                        <small>{item.next.kind} </small>
                        {yy(item.next.date)}
                        {md(item.next.date)}
                        <small> {leftLabel(item.next.date)}</small>
                      </span>
                      <span className="yy-bc__title">{item.title}</span>
                      {!half && (
                        <span className="yy-bc__sub">
                          {item.organizer}
                          {item.register ? ` · 提出 ${md(item.deadline)}` : ''} · {item.target}
                        </span>
                      )}
                    </span>
                  </a>
                )}
              />
            )}
            <p className="yy-cn-note">
              名称・主催・締切・対象は、各主催者の公式ページで確かめた事実だけを載せています(説明文・画像は転載していません)。応募の前に、必ず公式ページで最新の要項を確かめてください。
            </p>
          </section>
        </div>
        <aside className="yy-newspage__side">
          <section>
            <Sec no="II" title="締切が近いもの" right={`募集中 ${open.length} 件`} />
            {open.length === 0 && <p className="yy-home__empty">いま募集中のコンペはありません</p>}
            <ul className="yy-cn-due">
              {open.slice(0, 6).map((x) => (
                <li key={x.id}>
                  <span className="yy-cn-due__d">{md(x.next.date)}</span>
                  <span className="yy-cn-due__b">
                    <a className="yy-cn-due__t" href={x.url} target="_blank" rel="noopener noreferrer" title={x.title}>
                      {x.title}
                    </a>
                    <span className="yy-cn-due__s">
                      {x.organizer} · {x.next.kind} {leftLabel(x.next.date)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <Sec no="III" title="分類" right="件数" />
            <CountList rows={TABS.map((t) => ({ key: t.key, label: t.label, n: count(t.key) }))} active={tab} onPick={(k) => setTab(k as typeof tab)} />
          </section>
          <section>
            <Sec no="IV" title="掲載希望" />
            <RequestPanel what="コンペ" text="設計競技・プロポーザル・アイデアコンペを主催される方は、募集ページの URL をお知らせください。名称・締切・対象を掲載します。" onRequest={onNavigateToRegistration} />
          </section>
        </aside>
      </div>
    </div>
  );
};

export default Competitions;
