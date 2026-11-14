'use client';

import React, { useState } from 'react';
import PublicWorksList from '../PublicWorksList';
import PageHead, { Stat } from '../ui/PageHead';
import { CountList, Intake, RequestPanel, Sec } from './ConnectParts';
import './connect-pages.css';

interface ProjectsProps {
  onNavigateToRegistration?: () => void;
  initialCategory?: string;
}

/**
 * プロジェクト。公共工事は各発注機関の公告(PublicWorksList)。
 * 民間工事・パートナー募集・現地調査は 2026-11-14 に架空の見本を外し、発注者・募集者からの申し込みで載せる形にした。
 */
const TABS: { key: string; label: string; uses: string; columns: string[]; fields: string[] }[] = [
  { key: 'public', label: '公共工事', uses: '', columns: [], fields: [] },
  {
    key: 'private',
    label: '民間工事',
    uses: '施工会社・設計事務所が、民間の建設案件を探すときに見る一覧です。発注者・事業者からの申し込みで載せます。',
    columns: ['件名 · 概要 · 期間', '場所', '規模・予算', '状況'],
    fields: ['件名・発注者(公開できる範囲で)', '場所・規模・用途', '期間・予算の目安', '求める会社の条件', '問い合わせ先(公式ページか窓口)'],
  },
  {
    key: 'partner',
    label: 'パートナー募集',
    uses: '協力会社・協力事務所・職人を探すときの募集を載せる一覧です。募集する会社からの申し込みで載せます。',
    columns: ['募集の内容', '地域', '期間', '状況'],
    fields: ['会社名・公式ページの URL', '求める分野・人数', '地域・期間', '条件(公開できる範囲で)', '問い合わせ先'],
  },
  {
    key: 'survey',
    label: '現地調査',
    uses: '既存建物の調査・測量・診断などの業務を依頼したいときの募集を載せる一覧です。依頼者からの申し込みで載せます。',
    columns: ['調査の内容', '場所', '時期', '状況'],
    fields: ['調査の種類(劣化診断・測量・アスベストなど)', '場所・建物の規模', '時期・期限', '求める資格・条件', '問い合わせ先'],
  },
];

const Projects: React.FC<ProjectsProps> = ({ onNavigateToRegistration, initialCategory = 'public' }) => {
  const [activeCategory, setActiveCategory] = useState<string>(TABS.some((t) => t.key === initialCategory) ? initialCategory : 'public');
  const current = TABS.find((t) => t.key === activeCategory) ?? TABS[0];

  return (
    <div>
      <PageHead
        no="16"
        en="projects"
        title="プロジェクト"
        desc="公共工事の入札公告と、民間の案件・パートナー募集・現地調査の掲載"
        right={
          <>
            <Stat n={TABS.length} label="分類" />
            <a href="/register" className="yy-stat" style={{ textDecoration: 'none' }}>
              掲載希望はコチラ ↗
            </a>
          </>
        }
      />

      <div className="yy-tabs">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setActiveCategory(t.key)} aria-pressed={activeCategory === t.key} className="yy-tab">
            {t.label}
          </button>
        ))}
      </div>

      <div className="yy-newspage">
        <div id="project-content-area" className="yy-newspage__main">
          {current.key === 'public' ? (
            <section className="yy-pj-public">
              <Sec no="I" title="公共工事 · 入札情報" right="各発注機関の公告から" />
              {/* 官公需情報ポータルサイトの利用規約 第 3 条(API を用いている旨の明記とリンク)。2026-11-15 */}
              <p className="yy-cn-note" style={{ margin: '0 0 8px' }}>
                この一覧は
                <a href="https://www.kkj.go.jp/s/" target="_blank" rel="noopener noreferrer" className="yy-dt-link">
                  官公需情報ポータルサイト
                </a>
                の API を利用しています。公告の本文は各発注機関のページでご確認ください。
              </p>
              <PublicWorksList />
            </section>
          ) : (
            <Intake
              what={current.label}
              uses={current.uses}
              columns={current.columns}
              fields={current.fields}
              cats={TABS.filter((t) => t.key !== 'public').map((t) => t.label)}
              onRequest={onNavigateToRegistration}
            />
          )}
        </div>
        <aside className="yy-newspage__side">
          <section>
            <Sec no="V" title="分類" />
            <CountList
              rows={TABS.map((t) => ({ key: t.key, label: t.label, n: t.key === 'public' ? '入札' : '受付中' }))}
              active={activeCategory}
              onPick={setActiveCategory}
            />
          </section>
          <section>
            <Sec no="VI" title="掲載希望" />
            <RequestPanel what="プロジェクト" text="民間の建設案件・パートナー募集・調査業務の情報を、この一覧に掲載できます。" onRequest={onNavigateToRegistration} />
          </section>
        </aside>
      </div>
    </div>
  );
};

export default Projects;
