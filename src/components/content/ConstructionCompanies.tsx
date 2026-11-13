'use client';

import React, { useState } from 'react';
import PageHead, { Stat } from '../ui/PageHead';
import { CountList, Photo, RequestPanel, SampleLine, Sec, countBy, regionOf } from './ConnectParts';
import './connect-pages.css';

interface ConstructionCompaniesProps {
  onNavigateToRegistration?: () => void;
}

type CompanyCategory = 'building' | 'civil' | 'equipment' | 'interior' | 'exterior';

interface CompanyItem {
  id: string;
  name: string;
  speciality: string;
  location: string;
  established: string;
  employees: string;
  category: CompanyCategory;
  image: string;
  description: string;
}

const ConstructionCompanies: React.FC<ConstructionCompaniesProps> = ({ onNavigateToRegistration }) => {
  const [activeCategory, setActiveCategory] = useState<CompanyCategory>('building');

  const data: Record<CompanyCategory, CompanyItem[]> = {
    building: [
      { id: 'b1', name: '東都ゼネラル建設', speciality: '建築一式・S造/RC造', location: '東京都品川区', established: '1998年', employees: '220名', category: 'building', image: '/image/demo company.webp?v=1', description: '中大規模のオフィス・商業施設の実績多数。' },
      { id: 'b2', name: '新星都市建設', speciality: '集合住宅・公共施設', location: '神奈川県川崎市', established: '2006年', employees: '130名', category: 'building', image: '/image/demo company.webp?v=1', description: '意匠との協働で高品質な施工を実現。' },
      { id: 'b3', name: 'アークス工務店', speciality: '木造/中大規模木質', location: '千葉県船橋市', established: '2012年', employees: '65名', category: 'building', image: '/image/demo company.webp?v=1', description: '木造大断面の施工ノウハウが強み。' },
    ],
    civil: [
      { id: 'c1', name: '日本インフラ開発', speciality: '土木一式・橋梁/道路', location: '埼玉県さいたま市', established: '2001年', employees: '300名', category: 'civil', image: '/image/demo company.webp?v=1', description: '地域インフラの整備・保全に注力。' },
      { id: 'c2', name: 'グラウンドワークス', speciality: '造成・基礎・擁壁', location: '茨城県つくば市', established: '2010年', employees: '90名', category: 'civil', image: '/image/demo company.webp?v=1', description: '造成から基礎まで一貫対応。' },
      { id: 'c3', name: 'アースライン土木', speciality: '河川/上下水/法面', location: '群馬県高崎市', established: '2007年', employees: '110名', category: 'civil', image: '/image/demo company.webp?v=1', description: '災害対策工事の実績多数。' },
    ],
    equipment: [
      { id: 'e1', name: 'テクノ設備工業', speciality: '空調・衛生・給排水', location: '東京都墨田区', established: '2009年', employees: '120名', category: 'equipment', image: '/image/demo company.webp?v=1', description: 'BIM/省エネに対応した設備施工。' },
      { id: 'e2', name: 'グリーンエナジー設備', speciality: '再エネ/太陽光/ヒートポンプ', location: '千葉県市川市', established: '2015年', employees: '70名', category: 'equipment', image: '/image/demo company.webp?v=1', description: '再生可能エネルギー設備の導入支援。' },
      { id: 'e3', name: 'シティ配管システム', speciality: '配管/消火/排煙', location: '東京都板橋区', established: '2011年', employees: '85名', category: 'equipment', image: '/image/demo company.webp?v=1', description: '大型物件の配管施工に強み。' },
    ],
    interior: [
      { id: 'i1', name: 'インテリア・クラフト', speciality: '内装仕上/LGS・PB', location: '東京都練馬区', established: '2004年', employees: '95名', category: 'interior', image: '/image/demo company.webp?v=1', description: 'オフィス/商業施設の短工期対応。' },
      { id: 'i2', name: 'スペースワークス内装', speciality: '床/壁/天井仕上げ', location: '神奈川県横浜市', established: '2013年', employees: '60名', category: 'interior', image: '/image/demo company.webp?v=1', description: '品質とコストの最適解を提案。' },
      { id: 'i3', name: 'プレイスデザイン内装', speciality: '造作/家具/特注什器', location: '東京都江東区', established: '2018年', employees: '35名', category: 'interior', image: '/image/demo company.webp?v=1', description: '什器造作から現場納めまで一貫対応。' },
    ],
    exterior: [
      { id: 'x1', name: 'エクステリア京浜', speciality: '外構/舗装/フェンス', location: '東京都大田区', established: '2006年', employees: '50名', category: 'exterior', image: '/image/demo company.webp?v=1', description: '戸建/集合住宅の外構トータル対応。' },
      { id: 'x2', name: 'ガーデンアーキ', speciality: 'ウッドデッキ/緑化', location: '千葉県松戸市', established: '2014年', employees: '28名', category: 'exterior', image: '/image/demo company.webp?v=1', description: '植栽と素材の調和を重視。' },
      { id: 'x3', name: 'ストリートファブ', speciality: 'カーポート/引戸/宅配BOX', location: '埼玉県所沢市', established: '2017年', employees: '24名', category: 'exterior', image: '/image/demo company.webp?v=1', description: '各社製品の現地調整・施工が得意。' },
    ],
  };

  const getCategoryName = (category: CompanyCategory) => {
    const map: Record<CompanyCategory, string> = {
      building: '建築一式',
      civil: '土木工事',
      equipment: '設備工事',
      interior: '内装仕上',
      exterior: '外構工事',
    };
    return map[category];
  };

  // ---- モック「高級感 3」:分類は下線タブ、会社は 1 行の索引(写真は小さな四角)、右に地域ごとの件数と掲載希望 ----
  const CATS: CompanyCategory[] = ['building', 'civil', 'equipment', 'interior', 'exterior'];
  const all = CATS.flatMap((c) => data[c] || []);
  const regions = countBy(all, (x) => regionOf(x.location));
  const items = data[activeCategory] || [];
  const sampleAlert = () => alert('こちらはサンプルになります。\n掲載希望の方は「掲載希望はコチラ」よりご連絡下さい。');

  return (
    <div>
      <PageHead
        no="20"
        en="contractors"
        title="施工会社"
        desc="建築・土木・設備など各専門分野の施工会社"
        right={
          <>
            <Stat n={all.length} label="社" />
            <Stat n={CATS.length} label="分類" />
            <Stat n={regions.length} label="地域" />
            <a href="/register" className="yy-stat" style={{ textDecoration: 'none' }}>
              掲載希望はコチラ ↗
            </a>
          </>
        }
      />

      <div className="yy-tabs">
        {CATS.map((c) => (
          <button key={c} type="button" className="yy-tab" aria-pressed={activeCategory === c} onClick={() => setActiveCategory(c)}>
            {getCategoryName(c)}
            <small>{(data[c] || []).length}</small>
          </button>
        ))}
      </div>

      <div className="yy-newspage">
        <div className="yy-newspage__main">
          <section className="yy-cn-list">
            <Sec no="I" title={getCategoryName(activeCategory)} right={`${items.length} 社`} />
            <SampleLine target="施工会社" onRequest={onNavigateToRegistration} />
            <div className="yy-co-row yy-co-row--head">
              <span />
              <span />
              <span>社名 · 紹介</span>
              <span className="yy-co-spec">専門</span>
              <span>所在地</span>
              <span className="yy-co-est yy-cn-r">設立</span>
              <span className="yy-co-emp yy-cn-r">従業員</span>
              <span />
            </div>
            {items.map((item, index) => (
              <div key={item.id} className="yy-co-row">
                <span className="yy-cn-no">{String(index + 1).padStart(2, '0')}</span>
                <Photo src={item.image} alt={item.name} fallback="/image/demo company.webp?v=1" />
                <span className="yy-cn-body">
                  <span className="yy-cn-title is-serif" title={item.name}>{item.name}</span>
                  <span className="yy-cn-sub" title={item.description}>{item.description}</span>
                </span>
                <span className="yy-cn-cell yy-co-spec" title={`専門: ${item.speciality}`}>{item.speciality}</span>
                <span className="yy-cn-cell" title={`所在地: ${item.location}`}>{item.location}</span>
                <span className="yy-cn-num yy-co-est">{item.established.replace('年', '')}</span>
                <span className="yy-cn-num yy-co-emp">
                  {item.employees.replace('名', '')}
                  <small>名</small>
                </span>
                <button type="button" className="yy-linkbtn yy-cn-act" onClick={sampleAlert}>
                  詳細
                </button>
              </div>
            ))}
          </section>
        </div>
        <aside className="yy-newspage__side">
          <section>
            <Sec no="II" title="地域ごとの件数" right="全分類" />
            <CountList rows={regions.map(([k, n]) => ({ key: k, label: k, n }))} />
          </section>
          <section>
            <Sec no="III" title="分類" right="件数" />
            <CountList
              rows={CATS.map((c) => ({ key: c, label: getCategoryName(c), n: (data[c] || []).length }))}
              active={activeCategory}
              onPick={(k) => setActiveCategory(k as CompanyCategory)}
            />
          </section>
          <section>
            <Sec no="IV" title="掲載希望" />
            <RequestPanel
              what="施工会社"
              text="協力会社の検討や見積依頼先リスト作成に使われる一覧です。専門・所在地・実績を掲載できます。"
              onRequest={onNavigateToRegistration}
            />
          </section>
        </aside>
      </div>
    </div>
  );
};

export default ConstructionCompanies;
