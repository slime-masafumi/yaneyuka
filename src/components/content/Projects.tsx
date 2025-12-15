'use client';

import React, { useState, useEffect } from 'react';
import PublicWorksList from '../PublicWorksList';

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
  const [activeList, setActiveList] = useState<boolean[]>([]);

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
        image: '/image/demo project.png?v=1'
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
        image: '/image/demo project.png?v=1'
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
        image: '/image/demo project.png?v=1'
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
        image: '/image/demo project.png?v=1'
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
        image: '/image/demo project.png?v=1'
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
        image: '/image/demo project.png?v=1'
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
        image: '/image/demo project.png?v=1'
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
        image: '/image/demo project.png?v=1'
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
        image: '/image/demo project.png?v=1'
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
        image: '/image/demo project.png?v=1'
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
        image: '/image/demo project.png?v=1'
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
        image: '/image/demo project.png?v=1'
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
    setIsTransitioning(true);
    setActiveList([]); // activeListを即座にリセット
    
    setTimeout(() => {
      setActiveCategory(category);
      setIsTransitioning(false);
    }, 250);
  };

  const getCurrentItems = (): ProjectItem[] => {
    return projectData[activeCategory] || [];
  };

  // カテゴリ切り替え時にactiveListをリセットし、左から順にactive化
  useEffect(() => {
    if (isTransitioning) return; // トランジション中はアニメーションを開始しない
    
    const items = getCurrentItems();
    setActiveList(Array(items.length).fill(false));
    
    // 少し遅延させてからアニメーションを開始（トランジション完了後）
    const timer = setTimeout(() => {
      items.forEach((_, i) => {
        setTimeout(() => {
          setActiveList(prev => {
            const copy = [...prev];
            copy[i] = true;
            return copy;
          });
        }, i * 80);
      });
    }, 50);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, isTransitioning]);

  const getButtonClass = (category: string) => {
    const baseClass = "text-xs px-2 py-1 rounded transition";
    const widthClass = category === 'partner' ? 'w-28' : 'w-24';
    if (activeCategory === category) {
      return `${baseClass} ${widthClass} bg-gray-700 text-white`;
    }
    return `${baseClass} ${widthClass} bg-gray-300 text-black hover:bg-gray-700 hover:text-white`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '施工中':
      case '実施中':
        return 'text-green-600 bg-green-100';
      case '募集中':
        return 'text-blue-600 bg-blue-100';
      case '設計段階':
      case '計画中':
      case '準備中':
        return 'text-yellow-600 bg-yellow-100';
      case '入札準備中':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const renderContent = () => {
    // 公共工事タブの場合はPublicWorksListを表示
    if (activeCategory === 'public') {
      return <PublicWorksList />;
    }
    
    const items = getCurrentItems();
    
    if (items.length === 0) {
      return <p className="text-gray-700 text-xs">上のボタンを選択してプロジェクトを表示してください。</p>;
    }

    return (
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {items.map((item, index) => (
          <div 
            key={item.id}
            className={`border rounded p-3 bg-white text-sm w-full h-[350px] dynamic-card transition-all duration-500 ${
              activeList[index] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}
          >
            <img 
              src={item.image} 
              alt={item.title}
              className="w-full h-32 object-contain bg-gray-50 rounded mb-2"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/image/demo project.png?v=1';
              }}
            />
            <div className="font-bold text-sm mb-1">{item.title}</div>
            <p className="text-xs text-gray-600 mb-2 line-clamp-2">{item.description}</p>
            
            <div className="space-y-1 text-xs mb-2">
              <div><span className="font-medium">場所:</span> {item.location}</div>
              <div><span className="font-medium">予算:</span> {item.budget}</div>
              <div><span className="font-medium">期間:</span> {item.period}</div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className={`text-xs px-2 py-1 rounded ${getStatusColor(item.status)}`}>
                {item.status}
              </span>
              <button 
                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition"
                onClick={() => alert(`${item.title}の詳細を表示します（実装予定）`)}
              >
                詳細
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-baseline mb-2">
        <h2 className="text-xl font-semibold">プロジェクト</h2>
        <a href="#" onClick={showContactForm} className="text-blue-600 hover:text-blue-800 text-[11px] ml-4">掲載希望はコチラ</a>
      </div>
      <p className="text-[12px] text-gray-600 mb-3">
        公共・民間の建設案件やパートナー募集、現地調査案件の情報をまとめています。案件の優先度付けや社内共有に役立ててください。
      </p>
      
      <div className="flex gap-2 flex-wrap mb-4">
        <button 
          onClick={() => displayProjectCategory('public')}
          className={getButtonClass('public')}
        >
          公共工事
        </button>
        <button 
          onClick={() => displayProjectCategory('private')}
          className={getButtonClass('private')}
        >
          民間工事
        </button>
        <button 
          onClick={() => displayProjectCategory('partner')}
          className={getButtonClass('partner')}
        >
          パートナー募集
        </button>
        <button 
          onClick={() => displayProjectCategory('survey')}
          className={getButtonClass('survey')}
        >
          現地調査
        </button>
      </div>

      <div 
        id="project-content-area"
        className={`mt-4 transition-opacity duration-250 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
      >
        {renderContent()}
      </div>
    </div>
  );
};

export default Projects; 