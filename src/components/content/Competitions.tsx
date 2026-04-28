'use client';

import React, { useState, useEffect } from 'react';

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
  const [activeList, setActiveList] = useState<boolean[]>([]);

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
    const base = 'text-xs px-2 py-1 rounded transition';
    const width = 'w-28';
    return activeCategory === category
      ? `${base} ${width} bg-gray-700 text-white`
      : `${base} ${width} bg-gray-300 text-black hover:bg-gray-700 hover:text-white`;
  };

  const onClickCategory = (category: string) => {
    setIsTransitioning(true);
    setActiveList([]); // activeListを即座にリセット
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

  return (
    <div>
      <div className="flex items-baseline mb-2">
        <h2 className="text-xl font-semibold">コンペ</h2>
        <a href="#" onClick={showContactForm} className="text-blue-600 hover:text-blue-800 text-[11px] ml-4">掲載希望はコチラ</a>
      </div>
      <p className="text-[12px] text-gray-600 mb-3">
        公共・民間・学生向けなど建築系コンペ情報を収集しています。条件やスケジュールを確認し、参加検討の材料にしてください。
      </p>

      <div className="flex gap-2 flex-wrap mb-4">
        <button onClick={() => onClickCategory('public')} className={getButtonClass('public')}>公共</button>
        <button onClick={() => onClickCategory('private')} className={getButtonClass('private')}>民間</button>
        <button onClick={() => onClickCategory('student')} className={getButtonClass('student')}>学生</button>
        <button onClick={() => onClickCategory('idea')} className={getButtonClass('idea')}>アイデア</button>
      </div>

      <div className={`mt-4 transition-opacity duration-250 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {getCurrentItems().map((item, index) => (
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
                  target.src = '/image/demo project.webp?v=1';
                }}
              />
              <div className="font-bold text-sm mb-1">{item.title}</div>
              <p className="text-xs text-gray-600 mb-1">主催: {item.organizer}</p>
              <p className="text-xs text-gray-600 mb-2 line-clamp-2">{item.outline}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs px-2 py-1 rounded text-gray-600 bg-gray-100">{item.schedule}</span>
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
      </div>
    </div>
  );
};

export default Competitions;


