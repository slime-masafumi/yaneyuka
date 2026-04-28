'use client';

import React, { useEffect, useState } from 'react';

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
  const [activeList, setActiveList] = useState<boolean[]>([]);

  const showContactForm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onNavigateToRegistration) {
      onNavigateToRegistration();
    }
  };

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

  const getButtonClass = (category: CompanyCategory) => {
    const base = 'px-4 py-1 text-xs rounded focus:outline-none company-sub-button transition w-28';
    return activeCategory === category ? `${base} bg-gray-700 text-white` : `${base} bg-gray-200 hover:bg-gray-700 hover:text-white`;
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

  // カテゴリ切り替え時にactiveListをリセットし、左から順にactive化
  useEffect(() => {
    const items = data[activeCategory] || [];
    setActiveList(Array(items.length).fill(false));
    
    items.forEach((_, i) => {
      setTimeout(() => {
        setActiveList(prev => {
          const copy = [...prev];
          copy[i] = true;
          return copy;
        });
      }, i * 80);
    });
  }, [activeCategory]);

  return (
    <div>
      <div className="mb-2 content-title-wrapper">
        <h2 className="text-xl font-semibold inline">施工会社</h2>
        <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
      </div>
      <p className="text-[12px] text-gray-600 mb-3">
        建築・土木・設備など各専門分野の施工会社をピックアップしています。協力会社の検討や見積依頼先リスト作成にお役立てください。
      </p>

      <div className="mb-4 flex gap-2">
        <button className={getButtonClass('building')} onClick={() => setActiveCategory('building')}>建築一式</button>
        <button className={getButtonClass('civil')} onClick={() => setActiveCategory('civil')}>土木工事</button>
        <button className={getButtonClass('equipment')} onClick={() => setActiveCategory('equipment')}>設備工事</button>
        <button className={getButtonClass('interior')} onClick={() => setActiveCategory('interior')}>内装仕上</button>
        <button className={getButtonClass('exterior')} onClick={() => setActiveCategory('exterior')}>外構工事</button>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {(data[activeCategory] || []).map((item, index) => (
          <div 
            key={item.id} 
            className={`border rounded p-3 bg-white text-sm w-full h-[350px] shadow dynamic-card transition-all duration-500 flex flex-col justify-between ${
              activeList[index] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}
          >
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-32 object-contain bg-gray-50 rounded mb-2"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/image/demo company.webp?v=1';
              }}
            />
            <div className="font-bold text-sm mb-1">{item.name}</div>
            <p className="text-xs text-gray-600 mb-2 line-clamp-2">{item.description}</p>
            <div className="space-y-1 text-xs mb-2">
              <div><span className="font-medium">専門:</span> {item.speciality}</div>
              <div><span className="font-medium">所在地:</span> {item.location}</div>
              <div><span className="font-medium">設立:</span> {item.established}</div>
              <div><span className="font-medium">従業員:</span> {item.employees}</div>
            </div>
            <div className="flex justify-between items-center mt-auto">
              <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-600">{getCategoryName(item.category)}</span>
              <button className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition" onClick={() => alert('こちらはサンプルになります。\n掲載希望の方は「掲載希望はコチラ」よりご連絡下さい。')}>詳細</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConstructionCompanies;