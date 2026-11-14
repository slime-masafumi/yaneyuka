'use client';

import React, { useState } from 'react';
import PublicWorksList from '../PublicWorksList';
import PageHead, { Stat } from '../ui/PageHead';
import { CountList, Photo, RequestPanel, Sec, countBy, regionOf } from './ConnectParts';
import './connect-pages.css';

interface ProjectItem {
  id: string;
  title: string;
  description: string;
  location: string;
  budget: string;
  period: string;
  status: string;
  category: 'public' | 'private' | 'partner' | 'survey';
  image: string;
}

interface ProjectsProps {
  onNavigateToRegistration?: () => void;
  initialCategory?: string;
}

const Projects: React.FC<ProjectsProps> = ({ onNavigateToRegistration, initialCategory = 'public' }) => {
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // プロジェクトデータの定義
  const projectData: Record<string, ProjectItem[]> = {
    public: [
      {
        id: 'public1',
        title: '市庁舎新築工事',
        description: '地上8階建ての新市庁舎建設プロジェクト',
        location: '東京都渋谷区',
        budget: '15億円',
        period: '2024年4月～2026年3月',
        status: '設計段階',
        category: 'public',
        image: '/image/demo project.webp?v=1'
      },
      {
        id: 'public2',
        title: '小学校校舎改修工事',
        description: '既存校舎の耐震補強および内装リニューアル',
        location: '神奈川県横浜市',
        budget: '3億円',
        period: '2024年7月～2025年3月',
        status: '施工中',
        category: 'public',
        image: '/image/demo project.webp?v=1'
      },
      {
        id: 'public3',
        title: '図書館新築工事',
        description: '市民図書館の新築建設プロジェクト',
        location: '埼玉県さいたま市',
        budget: '8億円',
        period: '2024年10月～2026年3月',
        status: '入札準備中',
        category: 'public',
        image: '/image/demo project.webp?v=1'
      }
    ],
    private: [
      {
        id: 'private1',
        title: 'オフィスビル新築工事',
        description: '地上20階建ての高層オフィスビル建設',
        location: '東京都港区',
        budget: '50億円',
        period: '2024年6月～2027年3月',
        status: '設計段階',
        category: 'private',
        image: '/image/demo project.webp?v=1'
      },
      {
        id: 'private2',
        title: 'マンション建設工事',
        description: '総戸数200戸の大型分譲マンション',
        location: '千葉県千葉市',
        budget: '30億円',
        period: '2024年4月～2026年12月',
        status: '施工中',
        category: 'private',
        image: '/image/demo project.webp?v=1'
      },
      {
        id: 'private3',
        title: '商業施設改修工事',
        description: 'ショッピングモールの大規模リニューアル',
        location: '大阪府大阪市',
        budget: '12億円',
        period: '2024年9月～2025年8月',
        status: '計画中',
        category: 'private',
        image: '/image/demo project.webp?v=1'
      }
    ],
    partner: [
      {
        id: 'partner1',
        title: '設計パートナー募集',
        description: '大型プロジェクトの設計業務パートナー',
        location: '全国',
        budget: '応相談',
        period: '長期',
        status: '募集中',
        category: 'partner',
        image: '/image/demo project.webp?v=1'
      },
      {
        id: 'partner2',
        title: '施工協力会社募集',
        description: '建築工事の施工協力会社を募集',
        location: '関東圏',
        budget: '案件による',
        period: '継続',
        status: '募集中',
        category: 'partner',
        image: '/image/demo project.webp?v=1'
      },
      {
        id: 'partner3',
        title: '専門工事業者募集',
        description: '設備・内装等の専門工事業者',
        location: '東京都・神奈川県',
        budget: '案件による',
        period: '継続',
        status: '募集中',
        category: 'partner',
        image: '/image/demo project.webp?v=1'
      }
    ],
    survey: [
      {
        id: 'survey1',
        title: '地盤調査',
        description: '建設予定地の詳細な地盤調査業務',
        location: '東京都江東区',
        budget: '500万円',
        period: '2024年5月～2024年6月',
        status: '準備中',
        category: 'survey',
        image: '/image/demo project.webp?v=1'
      },
      {
        id: 'survey2',
        title: '環境影響調査',
        description: '大型開発プロジェクトの環境アセスメント',
        location: '神奈川県川崎市',
        budget: '1,200万円',
        period: '2024年4月～2025年3月',
        status: '実施中',
        category: 'survey',
        image: '/image/demo project.webp?v=1'
      },
      {
        id: 'survey3',
        title: '建物診断調査',
        description: '既存建物の劣化状況詳細調査',
        location: '千葉県船橋市',
        budget: '300万円',
        period: '2024年6月～2024年8月',
        status: '計画中',
        category: 'survey',
        image: '/image/demo project.webp?v=1'
      }
    ]
  };

  const showContactForm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onNavigateToRegistration) {
      onNavigateToRegistration();
    } else {
      alert('掲載希望フォームを表示します（実装予定）');
    }
  };

  const displayProjectCategory = (category: string) => {
    if (category === activeCategory) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveCategory(category);
      setIsTransitioning(false);
    }, 250);
  };

  const getCurrentItems = (): ProjectItem[] => {
    return projectData[activeCategory] || [];
  };

  // ---- モック「高級感 3」:分類は下線タブ、一覧は 1 行の索引、右に分類・地域の件数と掲載希望 ----
  const TABS: { key: string; label: string }[] = [
    { key: 'public', label: '公共工事' },
    { key: 'private', label: '民間工事' },
    { key: 'partner', label: 'パートナー募集' },
    { key: 'survey', label: '現地調査' },
  ];
  // 公共工事のタブは入札情報(PublicWorksList)を出すので、件数は他の 3 分類だけ数える
  const listed = TABS.filter((t) => t.key !== 'public').flatMap((t) => projectData[t.key] || []);
  const regions = countBy(listed, (x) => regionOf(x.location));
  const isActive = (st: string) => ['施工中', '実施中', '募集中'].includes(st);
  const current = TABS.find((t) => t.key === activeCategory);

  const renderContent = () => {
    // 公共工事タブの場合はPublicWorksListを表示
    if (activeCategory === 'public') {
      return (
        <section className="yy-pj-public">
          <Sec no="I" title="公共工事 · 入札情報" right="各発注機関の公告から" />
          <PublicWorksList />
        </section>
      );
    }

    const items = getCurrentItems();

    if (items.length === 0) {
      return <p className="yy-home__empty">上のタブを選択してプロジェクトを表示してください。</p>;
    }

    return (
      <section className="yy-cn-list">
        <Sec no="I" title={current?.label} right={`${items.length} 件`} />
        <div className="yy-pj-row yy-pj-row--head">
          <span />
          <span />
          <span>件名 · 概要 · 期間</span>
          <span className="yy-pj-loc">場所</span>
          <span className="yy-cn-r">予算</span>
          <span className="yy-pj-st">状況</span>
          <span />
        </div>
        {items.map((item, index) => (
          <div key={item.id} className="yy-pj-row">
            <span className="yy-cn-no">{String(index + 1).padStart(2, '0')}</span>
            <Photo src={item.image} alt={item.title} fallback="/image/demo project.webp?v=1" />
            <span className="yy-cn-body">
              <span className="yy-cn-title" title={item.title}>{item.title}</span>
              <span className="yy-cn-sub" title={`${item.description} · ${item.period}`}>
                {item.description} · {item.period}
              </span>
            </span>
            <span className="yy-cn-cell yy-pj-loc" title={item.location}>{item.location}</span>
            <span className="yy-cn-num">{item.budget}</span>
            <span className={`yy-st yy-pj-st${isActive(item.status) ? ' is-done' : ' is-mute'}`}>
              <i className={`yy-dot${isActive(item.status) ? '' : ' is-none'}`} />
              {item.status}
            </span>
            <button
              type="button"
              className="yy-linkbtn yy-cn-act"
              onClick={() => alert(`${item.title}の詳細を表示します（実装予定）`)}
            >
              詳細
            </button>
          </div>
        ))}
      </section>
    );
  };

  return (
    <div>
      <PageHead
        no="16"
        en="projects"
        title="プロジェクト"
        desc="公共・民間の建設案件、パートナー募集、現地調査案件の情報"
        right={
          <>
            <Stat n={TABS.length} label="分類" />
            <Stat n={listed.length} label="件 民間・募集・調査" />
            <Stat n={regions.length} label="地域" />
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
            onClick={() => displayProjectCategory(t.key)}
            aria-pressed={activeCategory === t.key}
            className="yy-tab"
          >
            {t.label}
            {t.key !== 'public' && <small>{(projectData[t.key] || []).length}</small>}
          </button>
        ))}
      </div>

      <div className="yy-newspage">
        <div id="project-content-area" className={`yy-newspage__main yy-cn-fade${isTransitioning ? ' is-out' : ''}`}>
          {renderContent()}
        </div>
        <aside className="yy-newspage__side">
          <section>
            <Sec no="II" title="分類" right="件数" />
            <CountList
              rows={TABS.map((t) => ({
                key: t.key,
                label: t.label,
                n: t.key === 'public' ? '入札' : (projectData[t.key] || []).length,
              }))}
              active={activeCategory}
              onPick={displayProjectCategory}
            />
          </section>
          <section>
            <Sec no="III" title="地域ごとの件数" right="民間・募集・調査" />
            <CountList rows={regions.map(([k, n]) => ({ key: k, label: k, n }))} />
          </section>
          <section>
            <Sec no="IV" title="掲載希望" />
            <RequestPanel
              what="プロジェクト"
              text="建設案件・パートナー募集・調査業務の情報を、この一覧に掲載できます。"
              onRequest={onNavigateToRegistration}
            />
          </section>
        </aside>
      </div>
    </div>
  );
};

export default Projects;
