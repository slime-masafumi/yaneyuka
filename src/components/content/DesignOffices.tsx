'use client';

import React, { useState } from 'react';
import PageHead, { Stat } from '../ui/PageHead';
import { CountList, Photo, RequestPanel, SampleLine, Sec, countBy, regionOf } from './ConnectParts';
import './connect-pages.css';

interface OfficeItem {
  id: string;
  name: string;
  speciality: string;
  location: string;
  established: string;
  employees: string;
  category: 'isho' | 'kozo' | 'setsubi' | 'kankyo';
  image: string;
  description: string;
}

interface DesignOfficesProps {
  onNavigateToRegistration?: () => void;
}

const DesignOffices: React.FC<DesignOfficesProps> = ({ onNavigateToRegistration }) => {
  const [activeCategory, setActiveCategory] = useState<string>('isho');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // 設計事務所データの定義
  const officeData: Record<string, OfficeItem[]> = {
    isho: [
      {
        id: 'isho1',
        name: '株式会社アーキテクト・デザイン',
        speciality: '住宅・商業建築の意匠設計',
        location: '東京都渋谷区',
        established: '2010年',
        employees: '15名',
        category: 'isho',
        image: '/image/demo company.webp?v=1',
        description: '創造性豊かなデザインで住空間を提案します。'
      },
      {
        id: 'isho2',
        name: '有限会社モダン建築設計',
        speciality: 'オフィスビル・公共建築',
        location: '神奈川県横浜市',
        established: '2005年',
        employees: '22名',
        category: 'isho',
        image: '/image/demo company.webp?v=1',
        description: '機能美を追求したモダンデザインが特徴です。'
      },
      {
        id: 'isho3',
        name: 'クリエイティブ・スペース設計',
        speciality: '文化施設・教育施設',
        location: '大阪府大阪市',
        established: '2012年',
        employees: '18名',
        category: 'isho',
        image: '/image/demo company.webp?v=1',
        description: '人々が集う空間の設計を得意としています。'
      }
    ],
    kozo: [
      {
        id: 'kozo1',
        name: '構造設計ラボ',
        speciality: '高層建築・耐震設計',
        location: '東京都中央区',
        established: '2008年',
        employees: '20名',
        category: 'kozo',
        image: '/image/demo company.webp?v=1',
        description: '最新の耐震技術で安全な建物を実現します。'
      },
      {
        id: 'kozo2',
        name: 'ストラクチャー・パートナーズ',
        speciality: '橋梁・インフラ構造',
        location: '大阪府堺市',
        established: '2011年',
        employees: '12名',
        category: 'kozo',
        image: '/image/demo company.webp?v=1',
        description: 'インフラ構造物の設計・補強に強み。'
      },
      {
        id: 'kozo3',
        name: 'エンジニアリング・デザイン',
        speciality: '特殊構造・リノベーション',
        location: '愛知県名古屋市',
        established: '2015年',
        employees: '10名',
        category: 'kozo',
        image: '/image/demo company.webp?v=1',
        description: 'リノベーションや特殊構造の実績多数。'
      }
    ],
    setsubi: [
      {
        id: 'setsubi1',
        name: '設備設計ソリューション',
        speciality: '空調・衛生・電気設備',
        location: '東京都新宿区',
        established: '2013年',
        employees: '25名',
        category: 'setsubi',
        image: '/image/demo company.webp?v=1',
        description: '快適な室内環境を創造する設備設計。'
      },
      {
        id: 'setsubi2',
        name: 'スマート設備研究所',
        speciality: '省エネ・BIM・自動制御',
        location: '神奈川県川崎市',
        established: '2017年',
        employees: '18名',
        category: 'setsubi',
        image: '/image/demo company.webp?v=1',
        description: '省エネ・BIM活用の最先端設備設計。'
      },
      {
        id: 'setsubi3',
        name: 'エコエンジニアリング',
        speciality: '再生可能エネルギー・環境設備',
        location: '京都府京都市',
        established: '2019年',
        employees: '8名',
        category: 'setsubi',
        image: '/image/demo company.webp?v=1',
        description: '環境にやさしい設備設計を提案します。'
      }
    ],
    kankyo: [
      {
        id: 'kankyo1',
        name: 'グリーン環境設計',
        speciality: '環境アセスメント・緑化計画',
        location: '東京都千代田区',
        established: '2010年',
        employees: '14名',
        category: 'kankyo',
        image: '/image/demo company.webp?v=1',
        description: '自然と調和した建築環境を提案します。'
      },
      {
        id: 'kankyo2',
        name: 'サステナブル・デザイン研究所',
        speciality: 'CASBEE・LEED認証支援',
        location: '大阪府大阪市',
        established: '2014年',
        employees: '11名',
        category: 'kankyo',
        image: '/image/demo company.webp?v=1',
        description: '持続可能な建築の認証取得をサポート。'
      },
      {
        id: 'kankyo3',
        name: 'バイオクライマ設計',
        speciality: 'バイオクライマティック設計',
        location: '北海道札幌市',
        established: '2018年',
        employees: '7名',
        category: 'kankyo',
        image: '/image/demo company.webp?v=1',
        description: '気候風土を活かした環境設計を実現。'
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

  const displayOfficeSubType = (category: string) => {
    if (category === activeCategory) return; // 同じカテゴリーがクリックされた場合は何もしない

    setIsTransitioning(true);
    setTimeout(() => {
      setActiveCategory(category);
      setIsTransitioning(false);
    }, 250);
  };

  const getCurrentItems = (): OfficeItem[] => {
    return officeData[activeCategory] || [];
  };

  const getCategoryName = (category: string) => {
    const names: Record<string, string> = {
      isho: '意匠設計',
      kozo: '構造設計',
      setsubi: '設備設計',
      kankyo: '環境設計'
    };
    return names[category] || category;
  };

  // ---- モック「高級感 3」:専門は下線タブ、事務所は 1 行の索引(写真は小さな四角)、右に地域ごとの件数と掲載希望 ----
  const CATS = ['isho', 'kozo', 'setsubi', 'kankyo'];
  const all = CATS.flatMap((c) => officeData[c] || []);
  const regions = countBy(all, (x) => regionOf(x.location));
  const items = getCurrentItems();
  const sampleAlert = () => alert('こちらはサンプルになります。\n掲載希望の方は「掲載希望はコチラ」よりご連絡下さい。');

  return (
    <div>
      <PageHead
        no="21"
        en="design offices"
        title="設計事務所"
        desc="意匠・構造・設備など専門分野ごとの設計事務所"
        right={
          <>
            <Stat n={all.length} label="事務所" />
            <Stat n={CATS.length} label="分野" />
            <Stat n={regions.length} label="地域" />
            <a href="#" onClick={showContactForm} className="yy-stat" style={{ textDecoration: 'none' }}>
              掲載希望はコチラ ↗
            </a>
          </>
        }
      />

      <div id="office-navigation" className="yy-tabs">
        {CATS.map((c) => (
          <button
            key={c}
            type="button"
            className="yy-tab"
            aria-pressed={activeCategory === c}
            onClick={() => displayOfficeSubType(c)}
            data-office-type={c}
          >
            {getCategoryName(c)}
            <small>{(officeData[c] || []).length}</small>
          </button>
        ))}
      </div>

      <div className="yy-newspage">
        <div id="design-office-content-area" className={`yy-newspage__main yy-cn-fade${isTransitioning ? ' is-out' : ''}`}>
          <section className="yy-cn-list">
            <Sec no="I" title={getCategoryName(activeCategory)} right={`${items.length} 事務所`} />
            <SampleLine target="設計事務所" onRequest={onNavigateToRegistration} />
            {items.length === 0 ? (
              <p className="yy-home__empty">該当する設計事務所がありません。</p>
            ) : (
              <>
                <div className="yy-of-row yy-of-row--head">
                  <span />
                  <span />
                  <span>事務所名 · 紹介</span>
                  <span className="yy-of-spec">得意領域</span>
                  <span>所在地</span>
                  <span className="yy-of-est yy-cn-r">設立</span>
                  <span className="yy-of-emp yy-cn-r">従業員</span>
                  <span />
                </div>
                {items.map((item, idx) => (
                  <div key={item.id || idx} className="yy-of-row">
                    <span className="yy-cn-no">{String(idx + 1).padStart(2, '0')}</span>
                    <Photo src={item.image} alt={item.name} fallback="/image/demo company.webp?v=1" />
                    <span className="yy-cn-body">
                      <span className="yy-cn-title is-serif" title={item.name}>{item.name}</span>
                      <span className="yy-cn-sub" title={item.description}>{item.description}</span>
                    </span>
                    <span className="yy-cn-cell yy-of-spec" title={`専門: ${item.speciality}`}>{item.speciality}</span>
                    <span className="yy-cn-cell" title={`所在地: ${item.location}`}>{item.location}</span>
                    <span className="yy-cn-num yy-of-est">{item.established.replace('年', '')}</span>
                    <span className="yy-cn-num yy-of-emp">
                      {item.employees.replace('名', '')}
                      <small>名</small>
                    </span>
                    <button type="button" className="yy-linkbtn yy-cn-act" onClick={sampleAlert}>
                      詳細
                    </button>
                  </div>
                ))}
              </>
            )}
          </section>
        </div>
        <aside className="yy-newspage__side">
          <section>
            <Sec no="II" title="地域ごとの件数" right="全分野" />
            <CountList rows={regions.map(([k, n]) => ({ key: k, label: k, n }))} />
          </section>
          <section>
            <Sec no="III" title="分野" right="件数" />
            <CountList
              rows={CATS.map((c) => ({ key: c, label: getCategoryName(c), n: (officeData[c] || []).length }))}
              active={activeCategory}
              onPick={displayOfficeSubType}
            />
          </section>
          <section>
            <Sec no="IV" title="掲載希望" />
            <RequestPanel
              what="設計事務所"
              text="外部パートナーの探索や提携検討に使われる一覧です。得意領域・所在地・実績を掲載できます。"
              onRequest={onNavigateToRegistration}
            />
          </section>
        </aside>
      </div>
    </div>
  );
};

export default DesignOffices;
