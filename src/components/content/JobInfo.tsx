'use client';

import React, { useState, useEffect } from 'react';

interface JobItem {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  employment: string;
  experience: string;
  category: 'isho' | 'kozo' | 'setsubi' | 'sekou' | 'koshubetsu';
  description: string;
  requirements: string[];
  benefits: string[];
  postedDate: string;
}

interface JobInfoProps {
  onNavigateToRegistration?: () => void;
}

const JobInfo: React.FC<JobInfoProps> = ({ onNavigateToRegistration }) => {
  const [activeCategory, setActiveCategory] = useState<string>('isho');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [activeList, setActiveList] = useState<boolean[]>([]);

  // 求人情報データの定義
  const jobData: Record<string, JobItem[]> = {
    isho: [
      {
        id: 'isho1',
        title: '意匠設計士（住宅・商業建築）',
        company: '株式会社アーキテクトワークス',
        location: '東京都渋谷区',
        salary: '月給 28万円～45万円',
        employment: '正社員',
        experience: '実務経験3年以上',
        category: 'isho',
        description: '住宅から商業建築まで幅広いプロジェクトに携わっていただきます。',
        requirements: ['建築士資格（一級または二級）', 'AutoCAD・Revitスキル', 'チームワーク重視'],
        benefits: ['交通費全額支給', '資格取得支援', '年2回賞与'],
        postedDate: '2024-12-15'
      },
      {
        id: 'isho2',
        title: 'BIM設計エンジニア',
        company: '有限会社モダンデザイン',
        location: '神奈川県横浜市',
        salary: '年俸 400万円～600万円',
        employment: '正社員',
        experience: 'BIM経験2年以上',
        category: 'isho',
        description: 'BIMを活用した最先端の建築設計業務をお任せします。',
        requirements: ['Revit・ArchiCAD経験', '英語読解能力', '新技術への関心'],
        benefits: ['リモートワーク可', '最新ソフトウェア環境', '研修制度充実'],
        postedDate: '2024-12-10'
      },
      {
        id: 'isho3',
        title: 'プロジェクトマネージャー（意匠）',
        company: 'クリエイティブ建築事務所',
        location: '大阪府大阪市',
        salary: '月給 35万円～55万円',
        employment: '正社員',
        experience: '管理経験5年以上',
        category: 'isho',
        description: '大型プロジェクトの企画・管理をリードしていただきます。',
        requirements: ['プロジェクト管理経験', 'コミュニケーション力', '問題解決能力'],
        benefits: ['管理職手当', '社用車支給', '海外研修制度'],
        postedDate: '2024-12-08'
      }
    ],
    kozo: [
      {
        id: 'kozo1',
        title: '構造設計エンジニア',
        company: '構造設計コンサルタント株式会社',
        location: '東京都港区',
        salary: '月給 32万円～50万円',
        employment: '正社員',
        experience: '構造設計経験3年以上',
        category: 'kozo',
        description: '高層建築・大スパン構造の設計業務を担当していただきます。',
        requirements: ['構造設計一級建築士優遇', '構造解析ソフト経験', '耐震設計知識'],
        benefits: ['技術者手当', '学会参加支援', '資格取得奨励金'],
        postedDate: '2024-12-12'
      },
      {
        id: 'kozo2',
        title: '耐震診断技術者',
        company: 'エンジニアリング・ストラクチャー',
        location: '神奈川県川崎市',
        salary: '年俸 450万円～650万円',
        employment: '正社員',
        experience: '耐震診断経験2年以上',
        category: 'kozo',
        description: '既存建物の耐震診断・補強設計を行います。',
        requirements: ['耐震診断資格', '現地調査経験', '報告書作成能力'],
        benefits: ['出張手当', '技術研修充実', '昇進制度明確'],
        postedDate: '2024-12-14'
      },
      {
        id: 'kozo3',
        title: '構造解析スペシャリスト',
        company: 'ストラクチュラル・デザイン',
        location: '愛知県名古屋市',
        salary: '月給 30万円～48万円',
        employment: '正社員',
        experience: '解析業務経験3年以上',
        category: 'kozo',
        description: '最新の構造解析技術を用いた設計業務です。',
        requirements: ['構造解析ソフト精通', 'プログラミング知識歓迎', '数学・物理学素養'],
        benefits: ['在宅勤務可', '最新解析ソフト', '学会発表支援'],
        postedDate: '2024-12-11'
      }
    ],
    setsubi: [
      {
        id: 'setsubi1',
        title: '設備設計技術者（空調・衛生）',
        company: '総合設備設計事務所',
        location: '東京都新宿区',
        salary: '月給 28万円～42万円',
        employment: '正社員',
        experience: '設備設計経験2年以上',
        category: 'setsubi',
        description: '商業施設・オフィスビルの設備設計を担当します。',
        requirements: ['設備士資格歓迎', 'CADスキル必須', '省エネ知識'],
        benefits: ['資格手当', '設計ソフト完備', '継続教育制度'],
        postedDate: '2024-12-13'
      },
      {
        id: 'setsubi2',
        title: '再生可能エネルギー設計者',
        company: 'エコ・エンジニアリング',
        location: '大阪府大阪市',
        salary: '年俸 380万円～580万円',
        employment: '正社員',
        experience: '新卒・第二新卒歓迎',
        category: 'setsubi',
        description: '太陽光発電・地中熱システムの設計業務です。',
        requirements: ['環境工学知識', '新技術への興味', 'チャレンジ精神'],
        benefits: ['研修制度充実', '環境認定資格支援', '成長企業'],
        postedDate: '2024-12-09'
      },
      {
        id: 'setsubi3',
        title: 'スマートビル設計エンジニア',
        company: 'スマート設備デザイン',
        location: '福岡県福岡市',
        salary: '月給 30万円～45万円',
        employment: '正社員',
        experience: 'IoT・自動制御経験',
        category: 'setsubi',
        description: 'IoT技術を活用したスマートビルシステムの設計です。',
        requirements: ['プログラミング能力', 'IoT知識', 'システム設計経験'],
        benefits: ['最新技術環境', 'リモートワーク', 'ストックオプション'],
        postedDate: '2024-12-07'
      }
    ],
    sekou: [
      {
        id: 'sekou1',
        title: '建築施工管理技士',
        company: '大手総合建設会社',
        location: '東京都千代田区',
        salary: '月給 35万円～55万円',
        employment: '正社員',
        experience: '施工管理経験3年以上',
        category: 'sekou',
        description: '大型建築プロジェクトの施工管理業務です。',
        requirements: ['一級建築施工管理技士', '現場経験豊富', 'リーダーシップ'],
        benefits: ['現場手当', '社宅制度', '海外プロジェクト参加機会'],
        postedDate: '2024-12-16'
      },
      {
        id: 'sekou2',
        title: '土木施工管理者',
        company: 'インフラ建設株式会社',
        location: '神奈川県相模原市',
        salary: '年俸 500万円～750万円',
        employment: '正社員',
        experience: '土木工事経験5年以上',
        category: 'sekou',
        description: '道路・橋梁・上下水道工事の施工管理を行います。',
        requirements: ['土木施工管理技士', '測量知識', '安全管理意識'],
        benefits: ['危険手当', '技術研修', '昇格制度'],
        postedDate: '2024-12-05'
      },
      {
        id: 'sekou3',
        title: '品質管理責任者',
        company: 'クオリティ建設',
        location: '愛知県名古屋市',
        salary: '月給 32万円～48万円',
        employment: '正社員',
        experience: '品質管理経験3年以上',
        category: 'sekou',
        description: '建築品質の管理・検査業務を担当します。',
        requirements: ['品質管理資格', '検査経験', '細かい作業が得意'],
        benefits: ['品質手当', '検査機器完備', '安定企業'],
        postedDate: '2024-12-06'
      }
    ],
    koshubetsu: [
      {
        id: 'koshu1',
        title: '鉄筋工事技能者',
        company: '専門工事業者協同組合',
        location: '東京都江東区',
        salary: '日給 12,000円～18,000円',
        employment: '正社員・日雇い選択可',
        experience: '未経験者歓迎',
        category: 'koshubetsu',
        description: '鉄筋組立・配筋作業を行います。技能習得支援あり。',
        requirements: ['体力に自信', '高所作業可能', 'チームワーク'],
        benefits: ['技能講習費用負担', '道具貸与', '昇給制度'],
        postedDate: '2024-12-14'
      },
      {
        id: 'koshu2',
        title: '左官職人',
        company: '伝統左官技術保存会',
        location: '京都府京都市',
        salary: '月給 25万円～40万円',
        employment: '正社員',
        experience: '左官経験1年以上',
        category: 'koshubetsu',
        description: '伝統的な左官技術から現代工法まで幅広く対応。',
        requirements: ['左官技能', '伝統技術への関心', '職人気質'],
        benefits: ['技能検定支援', '伝統技術継承', '独立支援'],
        postedDate: '2024-12-03'
      },
      {
        id: 'koshu3',
        title: '防水工事スペシャリスト',
        company: '防水工事専門会社',
        location: '大阪府堺市',
        salary: '月給 28万円～42万円',
        employment: '正社員',
        experience: '防水工事経験2年以上',
        category: 'koshubetsu',
        description: '屋上・外壁防水工事の施工・管理業務です。',
        requirements: ['防水施工技能士', '高所作業資格', '責任感'],
        benefits: ['技術研修充実', '資格取得支援', '独立支援制度'],
        postedDate: '2024-12-01'
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

  const displayJobSubType = (category: string) => {
    setIsTransitioning(true);
    setActiveList([]); // activeListを即座にリセット
    
    setTimeout(() => {
      setActiveCategory(category);
      setIsTransitioning(false);
    }, 250);
  };

  const getCurrentItems = (): JobItem[] => {
    if (!activeCategory) return [];
    return jobData[activeCategory] || [];
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
    const baseClass = "text-xs px-2 py-1 rounded w-24 transition job-sub-button";
    if (activeCategory === category) {
      return `${baseClass} bg-gray-700 text-white`;
    }
    return `${baseClass} bg-gray-300 text-black hover:bg-gray-700 hover:text-white`;
  };

  const getCategoryName = (category: string) => {
    const names: Record<string, string> = {
      isho: '意匠設計',
      kozo: '構造設計',
      setsubi: '設備設計',
      sekou: '施工管理',
      koshubetsu: '工種別'
    };
    return names[category] || category;
  };

  const renderContent = () => {
    if (!activeCategory) {
      return <p className="text-xs text-gray-700">上のボタンから表示する内容を選択してください。</p>;
    }

    const items = getCurrentItems();
    
    if (items.length === 0) {
      return <p className="text-gray-700 text-xs">該当する求人情報がありません。</p>;
    }

    return (
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {items.map((item, index) => (
          <div 
            key={item.id}
            className={`border rounded p-3 bg-white text-sm w-full h-[400px] dynamic-card transition-all duration-500 ${
              activeList[index] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="font-bold text-sm">{item.title}</div>
              <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-600">
                {getCategoryName(item.category)}
              </span>
            </div>
            
            <div className="text-xs text-gray-600 mb-2">{item.company}</div>
            <p className="text-xs text-gray-700 mb-2 line-clamp-2">{item.description}</p>
            
            <div className="space-y-1 text-xs mb-2">
              <div><span className="font-medium">勤務地:</span> {item.location}</div>
              <div><span className="font-medium">給与:</span> {item.salary}</div>
              <div><span className="font-medium">雇用形態:</span> {item.employment}</div>
              <div><span className="font-medium">経験:</span> {item.experience}</div>
            </div>
            
            <div className="mb-2">
              <div className="font-medium text-xs mb-1">応募要件:</div>
              <ul className="text-xs text-gray-600 list-disc list-inside">
                {item.requirements.slice(0, 2).map((req, idx) => (
                  <li key={idx} className="line-clamp-1">{req}</li>
                ))}
              </ul>
            </div>
            
            <div className="mb-3">
              <div className="font-medium text-xs mb-1">待遇・福利厚生:</div>
              <div className="text-xs text-gray-600">
                {item.benefits.slice(0, 2).join('、')}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">
                掲載日: {item.postedDate}
              </div>
              <button 
                className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                onClick={() => alert('こちらはサンプルになります。\n掲載希望の方は「掲載希望はコチラ」よりご連絡下さい。')}
              >
                応募する
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
        <h2 className="text-xl font-semibold">求人情報</h2>
        <a href="#" onClick={showContactForm} className="text-blue-600 hover:text-blue-800 text-[11px] ml-4">掲載希望はコチラ</a>
      </div>
      <p className="text-[12px] text-gray-600 mb-3">
        建築・設備・施工分野の求人情報を職種別に掲載しています。採用動向の把握や転職検討、社内共有にご活用ください。
      </p>
      
      <div id="job-navigation" className="mb-4 flex gap-2 flex-wrap">
        <button 
          className={getButtonClass('isho')}
          onClick={() => displayJobSubType('isho')}
        >
          意匠設計
        </button>
        <button 
          className={getButtonClass('kozo')}
          onClick={() => displayJobSubType('kozo')}
        >
          構造設計
        </button>
        <button 
          className={getButtonClass('setsubi')}
          onClick={() => displayJobSubType('setsubi')}
        >
          設備設計
        </button>
        <button 
          className={getButtonClass('sekou')}
          onClick={() => displayJobSubType('sekou')}
        >
          施工管理
        </button>
        <button 
          className={getButtonClass('koshubetsu')}
          onClick={() => displayJobSubType('koshubetsu')}
        >
          工種別
        </button>
      </div>

      <div 
        id="job-subtype-content"
        className={`content-visible transition-opacity duration-250 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
      >
        {renderContent()}
      </div>
    </div>
  );
};

export default JobInfo; 