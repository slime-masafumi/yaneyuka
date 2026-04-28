'use client';

import React, { useState, useEffect } from 'react';

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
  const [activeList, setActiveList] = useState<boolean[]>([]);

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
    setActiveList([]); // activeListを即座にリセット
    
    setTimeout(() => {
      setActiveCategory(category);
      setIsTransitioning(false);
    }, 250);
  };

  const getCurrentItems = (): OfficeItem[] => {
    return officeData[activeCategory] || [];
  };

  const getButtonClass = (category: string) => {
    const baseClass = "px-4 py-1 text-xs rounded focus:outline-none office-sub-button transition";
    if (activeCategory === category) {
      return `${baseClass} bg-gray-700 text-white`;
    }
    return `${baseClass} bg-gray-200 hover:bg-gray-700 hover:text-white`;
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


  return (
    <div>
      <div className="mb-2 content-title-wrapper">
        <h2 className="text-xl font-semibold inline">設計事務所</h2>
        <a href="#" onClick={showContactForm} className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
      </div>
      <p className="text-[12px] text-gray-600 mb-3">
        意匠・構造・設備など専門分野ごとに設計事務所の事例と得意領域を整理しています。外部パートナーの探索や提携検討にご活用ください。
      </p>
      <div id="office-navigation" className="mb-4 flex gap-2">
        <button 
          className={getButtonClass('isho')}
          onClick={() => displayOfficeSubType('isho')}
          data-office-type="isho"
        >
          意匠設計
        </button>
        <button 
          className={getButtonClass('kozo')}
          onClick={() => displayOfficeSubType('kozo')}
          data-office-type="kozo"
        >
          構造設計
        </button>
        <button 
          className={getButtonClass('setsubi')}
          onClick={() => displayOfficeSubType('setsubi')}
          data-office-type="setsubi"
        >
          設備設計
        </button>
        <button 
          className={getButtonClass('kankyo')}
          onClick={() => displayOfficeSubType('kankyo')}
          data-office-type="kankyo"
        >
          環境設計
        </button>
      </div>
      <div 
        id="design-office-content-area"
        className={`transition-opacity duration-250 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
      >
        {getCurrentItems().length === 0 ? (
          <p className="text-gray-700 text-xs">該当する設計事務所がありません。</p>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {getCurrentItems().map((item, idx) => (
            <div 
              key={item.id || idx}
              className={`border rounded p-3 bg-white text-sm w-full h-[350px] shadow dynamic-card transition-all duration-500 flex flex-col justify-between ${
                activeList[idx] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              }`}
            >
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-32 object-contain bg-gray-50 rounded mb-2"
              onError={e => {
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
              <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-600">
                {getCategoryName(item.category)}
              </span>
              <button
                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition"
                onClick={() => alert('こちらはサンプルになります。\n掲載希望の方は「掲載希望はコチラ」よりご連絡下さい。')}
              >
                詳細
              </button>
            </div>
          </div>
        ))}
        </div>
        )}
      </div>
    </div>
  );
};

export default DesignOffices; 