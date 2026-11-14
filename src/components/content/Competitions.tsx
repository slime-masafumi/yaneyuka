'use client';

import React, { useState } from 'react';
import PageHead, { Stat } from '../ui/PageHead';
import { CountList, Photo, RequestPanel, SampleLine, Sec, todayJST } from './ConnectParts';
import './connect-pages.css';

interface CompetitionItem {
  id: string;
  title: string;
  organizer: string;
  outline: string;
  schedule: string;
  category: 'public' | 'private' | 'student' | 'idea';
  image: string;
}

interface CompetitionsProps {
  onNavigateToRegistration?: () => void;
}

const Competitions: React.FC<CompetitionsProps> = ({ onNavigateToRegistration }) => {
  const [activeCategory, setActiveCategory] = useState<string>('public');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  const data: Record<string, CompetitionItem[]> = {
    public: [
      {
        id: 'comp-public-1',
        title: '市民ホール設計プロポーザル',
        organizer: '某市役所',
        outline: '1,000席規模の多目的ホールの基本設計案募集',
        schedule: '募集: 2025/11/01〜12/15',
        category: 'public',
        image: '/image/demo project.webp?v=1'
      },
      {
        id: 'comp-public-2',
        title: '駅前広場基本計画コンペ',
        organizer: '某自治体',
        outline: '交通結節点となる広場の再整備構想',
        schedule: '募集: 2025/11/10〜12/25',
        category: 'public',
        image: '/image/demo project.webp?v=1'
      }
    ],
    private: [
      {
        id: 'comp-private-1',
        title: 'ワークプレイス内装提案コンペ',
        organizer: '某デベロッパー',
        outline: '2,000㎡規模のオフィス内装デザイン案募集',
        schedule: '募集: 2025/10/20〜11/30',
        category: 'private',
        image: '/image/demo project.webp?v=1'
      },
      {
        id: 'comp-private-2',
        title: '商業施設ファサード刷新提案',
        organizer: '某小売グループ',
        outline: '郊外型モールの外装デザイン刷新',
        schedule: '募集: 2025/11/05〜12/20',
        category: 'private',
        image: '/image/demo project.webp?v=1'
      }
    ],
    student: [
      {
        id: 'comp-student-1',
        title: '学生建築アイデアコンテスト',
        organizer: '某学会',
        outline: '次世代キャンパスの学習空間デザイン',
        schedule: '募集: 2025/10/15〜12/10',
        category: 'student',
        image: '/image/demo project.webp?v=1'
      }
    ],
    idea: [
      {
        id: 'comp-idea-1',
        title: '街角ベンチデザインコンペ',
        organizer: '公共デザイン推進協議会',
        outline: 'メンテ性と防犯性を両立した街角ベンチ案',
        schedule: '募集: 2025/11/01〜12/31',
        category: 'idea',
        image: '/image/demo project.webp?v=1'
      }
    ]
  };

  const getCurrentItems = (): CompetitionItem[] => data[activeCategory] || [];

  const onClickCategory = (category: string) => {
    if (category === activeCategory) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveCategory(category);
      setIsTransitioning(false);
    }, 250);
  };

  const showContactForm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onNavigateToRegistration ? onNavigateToRegistration() : alert('掲載希望フォームを表示します（実装予定）');
  };

  // ---- モック「高級感 3」:分類は下線タブ、一覧は 1 行の索引(募集期間は明朝の数字)、右に締切が近いもの ----
  const TABS: { key: string; label: string }[] = [
    { key: 'public', label: '公共' },
    { key: 'private', label: '民間' },
    { key: 'student', label: '学生' },
    { key: 'idea', label: 'アイデア' },
  ];
  const today = todayJST();
  // schedule「募集: 2025/11/01〜12/15」から始まりと締切を読む(締切の月が前なら翌年)
  const term = (s: string) => {
    const m = s.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s*〜\s*(?:(\d{4})\/)?(\d{1,2})\/(\d{1,2})/);
    if (!m) return null;
    const p2 = (v: string) => v.padStart(2, '0');
    const y1 = Number(m[1]);
    const y2 = m[4] ? Number(m[4]) : Number(m[5]) < Number(m[2]) ? y1 + 1 : y1;
    return { start: `${y1}-${p2(m[2])}-${p2(m[3])}`, end: `${y2}-${p2(m[5])}-${p2(m[6])}` };
  };
  const md = (iso: string) => iso.slice(5).replace('-', '.');
  const yy = (iso: string) => (iso.slice(0, 4) !== today.slice(0, 4) ? `’${iso.slice(2, 4)} ` : '');
  const daysLeft = (iso: string) => Math.round((Date.parse(iso) - Date.parse(today)) / 86400000);
  const leftLabel = (iso?: string) => {
    if (!iso) return '';
    const d = daysLeft(iso);
    return d < 0 ? '締切済' : d === 0 ? '本日締切' : `あと ${d} 日`;
  };
  const all = TABS.flatMap((t) => (data[t.key] || []).map((x) => ({ ...x, t: term(x.schedule) })));
  const open = all.filter((x) => x.t && x.t.end >= today).sort((a, b) => a.t!.end.localeCompare(b.t!.end));
  const closed = all.filter((x) => x.t && x.t.end < today).sort((a, b) => b.t!.end.localeCompare(a.t!.end));
  const items = getCurrentItems();
  const current = TABS.find((t) => t.key === activeCategory);

  return (
    <div>
      <PageHead
        no="17"
        en="competitions"
        title="コンペ"
        desc="公共・民間・学生向けなど建築系コンペ情報"
        right={
          <>
            <Stat n={all.length} label="件" />
            <Stat n={open.length} label="件 募集中" />
            <Stat n={TABS.length} label="分類" />
            <a href="#" onClick={showContactForm} className="yy-stat" style={{ textDecoration: 'none' }}>
              掲載希望はコチラ ↗
            </a>
          </>
        }
      />

      <div className="yy-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onClickCategory(t.key)}
            aria-pressed={activeCategory === t.key}
            className="yy-tab"
          >
            {t.label}
            <small>{(data[t.key] || []).length}</small>
          </button>
        ))}
      </div>

      <div className="yy-newspage">
        <div className={`yy-newspage__main yy-cn-fade${isTransitioning ? ' is-out' : ''}`}>
          <section className="yy-cn-list">
            <Sec no="I" title={current?.label} right={`${items.length} 件 · 締切の順は右列`} />
            <SampleLine target="コンペ" onRequest={onNavigateToRegistration} />
            <div className="yy-cp-row yy-cp-row--head">
              <span />
              <span />
              <span>名称 · 概要</span>
              <span className="yy-cp-org">主催</span>
              <span className="yy-cp-term">募集期間</span>
              <span>締切</span>
              <span />
            </div>
            {items.length === 0 ? (
              <p className="yy-home__empty">該当するコンペはありません</p>
            ) : (
              items.map((item, index) => {
                const t = term(item.schedule);
                const d = t ? daysLeft(t.end) : null;
                return (
                  <div key={item.id} className="yy-cp-row">
                    <span className="yy-cn-no">{String(index + 1).padStart(2, '0')}</span>
                    <Photo src={item.image} alt={item.title} fallback="/image/demo project.webp?v=1" />
                    <span className="yy-cn-body">
                      <span className="yy-cn-title" title={item.title}>{item.title}</span>
                      <span className="yy-cn-sub" title={item.outline}>{item.outline}</span>
                    </span>
                    <span className="yy-cn-cell yy-cp-org" title={`主催: ${item.organizer}`}>{item.organizer}</span>
                    <span className="yy-cn-num yy-cp-term" title={item.schedule} style={{ textAlign: 'left' }}>
                      {t ? (
                        <>
                          {yy(t.start)}
                          {md(t.start)}
                          <small>〜 {md(t.end)}</small>
                        </>
                      ) : (
                        item.schedule
                      )}
                    </span>
                    <span className={`yy-cp-left${d !== null && d < 0 ? ' is-past' : ''}`}>{t ? leftLabel(t.end) : ''}</span>
                    <button
                      type="button"
                      className="yy-linkbtn yy-cn-act"
                      onClick={() => alert(`${item.title}の詳細を表示します（実装予定）`)}
                    >
                      詳細
                    </button>
                  </div>
                );
              })
            )}
          </section>
        </div>
        <aside className="yy-newspage__side">
          <section>
            <Sec no="II" title="締切が近いもの" right={`募集中 ${open.length} 件`} />
            {open.length === 0 && <p className="yy-home__empty">いま募集中のコンペはありません</p>}
            <ul className="yy-cn-due">
              {(open.length ? open : closed).slice(0, 5).map((x) => (
                <li key={x.id} className={open.length ? '' : 'is-past'}>
                  <span className="yy-cn-due__d">{md(x.t!.end)}</span>
                  <span className="yy-cn-due__b">
                    <span className="yy-cn-due__t" title={x.title}>{x.title}</span>
                    <span className="yy-cn-due__s">
                      {x.organizer} · {leftLabel(x.t!.end)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <Sec no="III" title="分類" right="件数" />
            <CountList
              rows={TABS.map((t) => ({ key: t.key, label: t.label, n: (data[t.key] || []).length }))}
              active={activeCategory}
              onPick={onClickCategory}
            />
          </section>
          <section>
            <Sec no="IV" title="掲載希望" />
            <RequestPanel
              what="コンペ"
              text="設計競技・プロポーザル・アイデアコンペの募集を、この一覧に掲載できます。"
              onRequest={onNavigateToRegistration}
            />
          </section>
        </aside>
      </div>
    </div>
  );
};

export default Competitions;
