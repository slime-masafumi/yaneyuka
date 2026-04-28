'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';

interface LandscapeCADItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  downloadUrl: string;
  price: string;
  category: 'cad' | 'landscape';
  type?: 'dxf' | 'BIM';
  subCategory?: 'plants' | 'people' | 'furniture' | 'others' | 'vehicles' | 'background';
}

interface LandscapeCADProps {
  onNavigateToLogin?: () => void;
}

const LandscapeCAD: React.FC<LandscapeCADProps> = ({ onNavigateToLogin }) => {
  const [activeContent, setActiveContent] = useState<'cad' | 'landscape'>('cad');
  const [activeLandscapeSubCategory, setActiveLandscapeSubCategory] = useState<'plants' | 'people' | 'others' | 'background' | 'all' | null>(null);
  const [activeCadSubCategory, setActiveCadSubCategory] = useState<'plants' | 'people' | 'furniture' | 'others' | 'all' | null>('all');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [activeList, setActiveList] = useState<boolean[]>([]);
  const { isLoggedIn } = useAuth();

  const cadItems: LandscapeCADItem[] = [
    {
      id: 'child_running',
      title: 'child_running_01',
      description: 'dxfデータ',
      imageUrl: '/caddata/child_running_01.jpg',
      downloadUrl: '/caddata/child_running_01.dxf',
      price: '無料',
      category: 'cad',
      type: 'dxf',
      subCategory: 'people'
    },
    {
      id: 'child_standing',
      title: 'child_standing_01',
      description: 'dxfデータ',
      imageUrl: '/caddata/child_standing_01.jpg',
      downloadUrl: '/caddata/child_standing_01.dxf',
      price: '無料',
      category: 'cad',
      type: 'dxf',
      subCategory: 'people'
    },
    {
      id: 'child_walking_01',
      title: 'child_walking_01',
      description: 'dxfデータ',
      imageUrl: '/caddata/child_walking_01.jpg',
      downloadUrl: '/caddata/child_walking_01.dxf',
      price: '無料',
      category: 'cad',
      type: 'dxf',
      subCategory: 'people'
    },
    {
      id: 'child_walking_02',
      title: 'child_walking_02',
      description: 'dxfデータ',
      imageUrl: '/caddata/child_walking_02.jpg',
      downloadUrl: '/caddata/child_walking_02.DXF',
      price: '無料',
      category: 'cad',
      type: 'dxf',
      subCategory: 'people'
    },
    {
      id: 'man_standing_01',
      title: 'man_standing_01',
      description: 'dxfデータ',
      imageUrl: '/caddata/man_standing_01.jpg',
      downloadUrl: '/caddata/man_standing_01.dxf',
      price: '無料',
      category: 'cad',
      type: 'dxf',
      subCategory: 'people'
    },
    {
      id: 'man_standing_02',
      title: 'man_standing_02',
      description: 'dxfデータ',
      imageUrl: '/caddata/man_standing_02.jpg',
      downloadUrl: '/caddata/man_standing_02.dxf',
      price: '無料',
      category: 'cad',
      type: 'dxf',
      subCategory: 'people'
    },
    {
      id: 'woman_standing_01',
      title: 'woman_standing_01',
      description: 'dxfデータ',
      imageUrl: '/caddata/woman_standing_01.jpg',
      downloadUrl: '/caddata/woman_standing_01.dxf',
      price: '無料',
      category: 'cad',
      type: 'dxf',
      subCategory: 'people'
    },
    {
      id: 'woman_standing_02',
      title: 'woman_standing_02',
      description: 'dxfデータ',
      imageUrl: '/caddata/woman_standing_02.jpg',
      downloadUrl: '/caddata/woman_standing_02.dxf',
      price: '無料',
      category: 'cad',
      type: 'dxf',
      subCategory: 'people'
    },
    {
      id: 'woman_walking',
      title: 'woman_walking_01',
      description: 'dxfデータ',
      imageUrl: '/caddata/woman_walking_01.jpg',
      downloadUrl: '/caddata/woman_walking_01.DXF',
      price: '無料',
      category: 'cad',
      type: 'dxf',
      subCategory: 'people'
    },
    {
      id: 'running',
      title: 'running_01',
      description: 'dxfデータ',
      imageUrl: '/caddata/running_01.jpg',
      downloadUrl: '/caddata/running_01.dxf',
      price: '無料',
      category: 'cad',
      type: 'dxf',
      subCategory: 'people'
    },
    {
      id: 'sitting_01',
      title: 'Sitting_01',
      description: 'dxfデータ',
      imageUrl: '/caddata/Sitting_01.jpg',
      downloadUrl: '/caddata/Sitting_01.dxf',
      price: '無料',
      category: 'cad',
      type: 'dxf',
      subCategory: 'people'
    },
    {
      id: 'sitting_02',
      title: 'Sitting_02',
      description: 'dxfデータ',
      imageUrl: '/caddata/Sitting_02.jpg',
      downloadUrl: '/caddata/Sitting_02.dxf',
      price: '無料',
      category: 'cad',
      type: 'dxf',
      subCategory: 'people'
    },
    {
      id: 'smartphone',
      title: 'Touching a smartphone_01',
      description: 'dxfデータ',
      imageUrl: '/caddata/Touching a smartphone_01.jpg',
      downloadUrl: '/caddata/Touching a smartphone_01.dxf',
      price: '無料',
      category: 'cad',
      type: 'dxf',
      subCategory: 'people'
    },
    {
      id: 'walking_dog',
      title: 'Walking the dog_01',
      description: 'dxfデータ',
      imageUrl: '/caddata/Walking the dog_01.jpg',
      downloadUrl: '/caddata/Walking the dog_01.dxf',
      price: '無料',
      category: 'cad',
      type: 'dxf',
      subCategory: 'people'
    },
    {
      id: 'older_adult_01',
      title: 'older adult_01',
      description: 'dxfデータ',
      imageUrl: '/caddata/older adult_01.jpg',
      downloadUrl: '/caddata/older adult_01.dxf',
      price: '無料',
      category: 'cad',
      type: 'dxf'
    },
    {
      id: 'older_adult_02',
      title: 'older adult_02',
      description: 'dxfデータ',
      imageUrl: '/caddata/older adult_02.jpg',
      downloadUrl: '/caddata/older adult_02.dxf',
      price: '無料',
      category: 'cad',
      type: 'dxf'
    },
    {
      id: 'parent_child',
      title: 'parent・child_walking_01',
      description: 'dxfデータ',
      imageUrl: '/caddata/parent・child_walking_01.jpg',
      downloadUrl: '/caddata/parent・child_walking_01.dxf',
      price: '無料',
      category: 'cad',
      type: 'dxf'
    }
  ];

  const landscapeItems: LandscapeCADItem[] = [
    // 人物カテゴリ
    {
      id: 'M_stand_01',
      title: 'M_stand_01',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/M_stand_01.png',
      downloadUrl: '/tenkei/person/M_stand_01.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'M_stand_02',
      title: 'M_stand_02',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/M_stand_02.png',
      downloadUrl: '/tenkei/person/M_stand_02.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'M_stand_03',
      title: 'M_stand_03',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/M_stand_03.png',
      downloadUrl: '/tenkei/person/M_stand_03.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'M_stand_04',
      title: 'M_stand_04',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/M_stand_04.png',
      downloadUrl: '/tenkei/person/M_stand_04.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'M_stand_05',
      title: 'M_stand_05',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/M_stand_05.png',
      downloadUrl: '/tenkei/person/M_stand_05.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'W_stand_01',
      title: 'W_stand_01',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/W_stand_01.png',
      downloadUrl: '/tenkei/person/W_stand_01.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'W_stand_02',
      title: 'W_stand_02',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/W_stand_02.png',
      downloadUrl: '/tenkei/person/W_stand_02.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'W_stand_03',
      title: 'W_stand_03',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/W_stand_03.png',
      downloadUrl: '/tenkei/person/W_stand_03.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'W_stand_04',
      title: 'W_stand_04',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/W_stand_04.png',
      downloadUrl: '/tenkei/person/W_stand_04.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'W_stand_05',
      title: 'W_stand_05',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/W_stand_05.png',
      downloadUrl: '/tenkei/person/W_stand_05.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'W_stand_06',
      title: 'W_stand_06',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/W_stand_06.png',
      downloadUrl: '/tenkei/person/W_stand_06.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'W_stand_07',
      title: 'W_stand_07',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/W_stand_07.png',
      downloadUrl: '/tenkei/person/W_stand_07.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'F_stand_01',
      title: 'F_stand_01',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/F_stand_01.png',
      downloadUrl: '/tenkei/person/F_stand_01.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'F_stand_02',
      title: 'F_stand_02',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/F_stand_02.png',
      downloadUrl: '/tenkei/person/F_stand_02.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'MW_stand_01',
      title: 'MW_stand_01',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/MW_stand_01.png',
      downloadUrl: '/tenkei/person/MW_stand_01.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'MW_stand_02',
      title: 'MW_stand_02',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/MW_stand_02.png',
      downloadUrl: '/tenkei/person/MW_stand_02.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'MW_stand_03',
      title: 'MW_stand_03',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/MW_stand_03.png',
      downloadUrl: '/tenkei/person/MW_stand_03.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'SMW_stand_01',
      title: 'SMW_stand_01',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/SMW_stand_01.png',
      downloadUrl: '/tenkei/person/SMW_stand_01.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'SM_stand_01',
      title: 'SM_stand_01',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/SM_stand_01.png',
      downloadUrl: '/tenkei/person/SM_stand_01.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'SM_stand_02',
      title: 'SM_stand_02',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/SM_stand_02.png',
      downloadUrl: '/tenkei/person/SM_stand_02.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'SW_stand_01',
      title: 'SW_stand_01',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/SW_stand_01.png',
      downloadUrl: '/tenkei/person/SW_stand_01.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'SW_stand_02',
      title: 'SW_stand_02',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/SW_stand_02.png',
      downloadUrl: '/tenkei/person/SW_stand_02.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'SW_stand_03',
      title: 'SW_stand_03',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/SW_stand_03.png',
      downloadUrl: '/tenkei/person/SW_stand_03.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'G_stand_01',
      title: 'G_stand_01',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/G_stand_01.png',
      downloadUrl: '/tenkei/person/G_stand_01.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'G_stand_02',
      title: 'G_stand_02',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/G_stand_02.png',
      downloadUrl: '/tenkei/person/G_stand_02.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'B_stand_01',
      title: 'B_stand_01',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/B_stand_01.png',
      downloadUrl: '/tenkei/person/B_stand_01.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'B_stand_02',
      title: 'B_stand_02',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/B_stand_02.png',
      downloadUrl: '/tenkei/person/B_stand_02.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'M_sit_01',
      title: 'M_sit_01',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/M_sit_01.png',
      downloadUrl: '/tenkei/person/M_sit_01.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'M_sit_02',
      title: 'M_sit_02',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/M_sit_02.png',
      downloadUrl: '/tenkei/person/M_sit_02.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'M_sit_04',
      title: 'M_sit_04',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/M_sit_04.png',
      downloadUrl: '/tenkei/person/M_sit_04.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'W_sit_01',
      title: 'W_sit_01',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/W_sit_01.png',
      downloadUrl: '/tenkei/person/W_sit_01.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'W_sit_02',
      title: 'W_sit_02',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/W_sit_02.png',
      downloadUrl: '/tenkei/person/W_sit_02.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'W_sit_03',
      title: 'W_sit_03',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/W_sit_03.png',
      downloadUrl: '/tenkei/person/W_sit_03.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    {
      id: 'W_sit_04',
      title: 'W_sit_04',
      description: '建築パース用人物データ',
      imageUrl: '/tenkei/person/W_sit_04.png',
      downloadUrl: '/tenkei/person/W_sit_04.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'people'
    },
    // 植物カテゴリ
    {
      id: 'aodamo_01',
      title: 'アオダモ_01',
      description: '建築パース用樹木データ',
      imageUrl: '/tenkei/plants/アオダモ_01.png',
      downloadUrl: '/tenkei/plants/アオダモ_01.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'plants'
    },
    {
      id: 'toukaede_01',
      title: 'トウカエデ_01',
      description: '建築パース用樹木データ',
      imageUrl: '/tenkei/plants/トウカエデ_01.png',
      downloadUrl: '/tenkei/plants/トウカエデ_01.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'plants'
    },
    {
      id: 'enju_01',
      title: 'エンジュ_01',
      description: '建築パース用樹木データ',
      imageUrl: '/tenkei/plants/エンジュ_01.png',
      downloadUrl: '/tenkei/plants/エンジュ_01.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'plants'
    },
    {
      id: 'irohamomiji_01',
      title: 'イロハモミジ_01',
      description: '建築パース用樹木データ',
      imageUrl: '/tenkei/plants/イロハモミジ_01.png',
      downloadUrl: '/tenkei/plants/イロハモミジ_01.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'plants'
    },
    {
      id: 'keyaki_01',
      title: 'ケヤキ_01',
      description: '建築パース用樹木データ',
      imageUrl: '/tenkei/plants/ケヤキ_01.png',
      downloadUrl: '/tenkei/plants/ケヤキ_01.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'plants'
    },
    {
      id: 'americafuu_01',
      title: 'アメリカフウ_01',
      description: '建築パース用樹木データ',
      imageUrl: '/tenkei/plants/アメリカフウ_01.png',
      downloadUrl: '/tenkei/plants/アメリカフウ_01.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'plants'
    },
    {
      id: 'shirakashi_01',
      title: 'シラカシ_01',
      description: '建築パース用樹木データ',
      imageUrl: '/tenkei/plants/シラカシ_01.png',
      downloadUrl: '/tenkei/plants/シラカシ_01.png',
      price: '無料',
      category: 'landscape',
      subCategory: 'plants'
    }
  ];

  const handleDownload = (url: string, title: string) => {
    // ログイン必須のチェック
    if (!isLoggedIn) {
      alert('データをダウンロードするには会員登録（無料）が必要です。');
      return;
    }

    if (url === '#') {
      alert(`${title}のダウンロード機能は実装予定です。`);
      return;
    }
    
    // ダウンロード確認ポップアップ
    const fileName = url.split('/').pop() || 'download';
    const confirmed = confirm(
      `「${title}」のCADデータをダウンロードしますか？\n\nファイル名: ${fileName}\n\n※このデータは無料でご利用いただけます。`
    );
    
    if (!confirmed) {
      return;
    }
    
    // 実際のダウンロード処理
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // ダウンロード開始の通知
      setTimeout(() => {
        alert(`「${title}」のダウンロードを開始しました。\nブラウザのダウンロードフォルダをご確認ください。`);
      }, 500);
    } catch (error) {
      console.error('Download error:', error);
      alert('ダウンロードに失敗しました。しばらくしてから再度お試しください。');
    }
  };

  const displayContent = (contentType: 'cad' | 'landscape') => {
    setIsTransitioning(true);
    setActiveList([]); // activeListを即座にリセット
    
    setTimeout(() => {
      setActiveContent(contentType);
      if (contentType === 'cad') {
        setActiveLandscapeSubCategory(null);
        // CADは初期状態を「全カテゴリー」に統一
        setActiveCadSubCategory('all');
      } else {
        // 添景をクリックした場合は全カテゴリー表示をデフォルトに
        setActiveLandscapeSubCategory('all');
      }
      setIsTransitioning(false);
    }, 250);
  };

  const displayLandscapeSubCategory = (subCategory: 'plants' | 'people' | 'others' | 'background' | 'all') => {
    setIsTransitioning(true);
    setActiveList([]); // activeListを即座にリセット
    
    setTimeout(() => {
      setActiveLandscapeSubCategory(subCategory);
      setIsTransitioning(false);
    }, 250);
  };

  const displayCadSubCategory = (subCategory: 'plants' | 'people' | 'furniture' | 'others' | 'all') => {
    setIsTransitioning(true);
    setActiveList([]); // activeListを即座にリセット
    
    setTimeout(() => {
      setActiveCadSubCategory(subCategory);
      setIsTransitioning(false);
    }, 250);
  };

  const getCurrentItems = () => {
    if (activeContent === 'cad') {
      // CADのサブカテゴリフィルタ
      if (!activeCadSubCategory || activeCadSubCategory === 'all') return cadItems;
      return cadItems.filter(i => i.subCategory === activeCadSubCategory);
    } else {
      // 添景の場合、'all' は全表示（背景→植物→人の順でソート）、特定サブカテゴリは絞り込み、未選択は全表示
      if (activeLandscapeSubCategory === 'all' || activeLandscapeSubCategory === null) {
        return landscapeItems
          .slice()
          .sort((a, b) => {
            const rank = (s?: string) => (s === 'background' ? 0 : s === 'plants' ? 1 : s === 'people' ? 2 : 3);
            return rank(a.subCategory) - rank(b.subCategory);
          });
      }
      if (activeLandscapeSubCategory === 'others') {
        // 「その他」は現在landscapeItemsに存在しないので、空配列を返す
        return [];
      }
      if (activeLandscapeSubCategory === 'background') {
        // 「背景」は現在landscapeItemsに存在しないので、空配列を返す
        return [];
      }
      return landscapeItems.filter(item => item.subCategory === activeLandscapeSubCategory);
    }
  };

  // カテゴリ・サブカテゴリ切り替え時にactiveListをリセットし、左から順にactive化
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
  }, [activeContent, activeCadSubCategory, activeLandscapeSubCategory, isTransitioning]);

  const getButtonClass = (contentType: 'cad' | 'landscape') => {
    const baseClass = "text-xs px-2 py-1 rounded w-24 transition";
    if (activeContent === contentType) {
      return `${baseClass} bg-gray-700 text-white`;
    }
    return `${baseClass} bg-gray-300 text-black hover:bg-gray-700 hover:text-white`;
  };

  const getSubButtonClass = (subCategory: 'plants' | 'people' | 'others' | 'background' | 'all') => {
    const widthClass = subCategory === 'all' ? '' : 'w-20';
    const baseClass = `text-xs px-3 py-1 rounded transition whitespace-nowrap ${widthClass}`;
    if (activeLandscapeSubCategory === subCategory || (subCategory === 'all' && activeLandscapeSubCategory === 'all')) {
      return `${baseClass} bg-blue-600 text-white`;
    }
    return `${baseClass} bg-blue-200 text-black hover:bg-blue-600 hover:text-white`;
  };

  const getCadSubButtonClass = (subCategory: 'plants' | 'people' | 'furniture' | 'others' | 'all') => {
    const widthClass = subCategory === 'all' ? '' : 'w-20';
    const baseClass = `text-xs px-3 py-1 rounded transition whitespace-nowrap ${widthClass}`;
    if (activeCadSubCategory === subCategory || (subCategory === 'all' && activeCadSubCategory === 'all')) {
      return `${baseClass} bg-blue-600 text-white`;
    }
    return `${baseClass} bg-blue-200 text-black hover:bg-blue-600 hover:text-white`;
  };

  const renderContent = () => {
    const items = getCurrentItems();
    
    if (items.length === 0) {
      if (activeContent === 'landscape' && !activeLandscapeSubCategory) {
        return <p className="text-gray-700">植物または人のカテゴリーを選択してください。</p>;
      }
      return <p className="text-gray-700">該当する情報がありません。</p>;
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
              src={item.imageUrl} 
              alt={item.title} 
              className="w-full h-48 rounded mb-2 object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = activeContent === 'cad' 
                  ? 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDI0MCAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI0MCIgaGVpZ2h0PSIxOTIiIGZpbGw9IiNGM0Y0RjYiLz48dGV4dCB4PSIxMjAiIHk9Ijk2IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+Q0FE44OH44O844K/</dGV4dD48L3N2Zz4='
                  : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDI0MCAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI0MCIgaGVpZ2h0PSIxOTIiIGZpbGw9IiNGM0Y0RjYiLz48dGV4dCB4PSIxMjAiIHk9Ijk2IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+5re75pmv44OH44O844K/</dGV4dD48L3N2Zz4=';
              }}
            />
            <div className="font-bold text-sm mb-2">{item.title}</div>
            <p className="text-xs text-gray-600 mb-2">{item.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">{item.price}</span>
              <button 
                onClick={() => handleDownload(item.downloadUrl, item.title)}
                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition"
              >
                ダウンロード
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

    return (
    <div>
      <h2 className="text-xl font-semibold mb-2">添景・CAD</h2>
      <p className="text-[12px] text-gray-600 mb-3">
        プレゼンや施工図に使える添景データやCADパーツ、テクスチャ素材をカテゴリ別にまとめています。レイアウト検討や資料作成時にご活用ください。
      </p>
      {/* メインカテゴリボタン */}
      <div className="flex gap-2 flex-wrap mb-4">
        <button 
          onClick={() => displayContent('cad')}
          className={getButtonClass('cad')}
        >
          CAD
        </button>
        <button 
          onClick={() => displayContent('landscape')}
          className={getButtonClass('landscape')}
        >
          添景
        </button>
      </div>

      {/* CADのサブカテゴリボタン */}
      {activeContent === 'cad' && (
        <div className="flex gap-2 flex-wrap mb-4">
          <button 
            onClick={() => displayCadSubCategory('all')}
            className={getCadSubButtonClass('all')}
          >
            全カテゴリー
          </button>
          <button 
            onClick={() => displayCadSubCategory('plants')}
            className={getCadSubButtonClass('plants')}
          >
            植物
          </button>
          <button 
            onClick={() => displayCadSubCategory('people')}
            className={getCadSubButtonClass('people')}
          >
            人
          </button>
          <button 
            onClick={() => displayCadSubCategory('furniture')}
            className={getCadSubButtonClass('furniture')}
          >
            什器
          </button>
          <button 
            onClick={() => displayCadSubCategory('others')}
            className={getCadSubButtonClass('others')}
          >
            その他
          </button>
        </div>
      )}

      {/* 添景のサブカテゴリボタン */}
      {activeContent === 'landscape' && (
        <div className="flex gap-2 flex-wrap mb-4">
          <button 
            onClick={() => displayLandscapeSubCategory('all')}
            className={getSubButtonClass('all')}
          >
            全カテゴリー
          </button>
          <button 
            onClick={() => displayLandscapeSubCategory('background')}
            className={getSubButtonClass('background')}
          >
            背景
          </button>
          <button 
            onClick={() => displayLandscapeSubCategory('plants')}
            className={getSubButtonClass('plants')}
          >
            植物
          </button>
          <button 
            onClick={() => displayLandscapeSubCategory('people')}
            className={getSubButtonClass('people')}
          >
            人
          </button>
          <button 
            onClick={() => displayLandscapeSubCategory('others')}
            className={getSubButtonClass('others')}
          >
            その他
          </button>
        </div>
      )}

      <div 
        id="landscape-cad-content-area"
        className={`transition-opacity duration-250 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
      >
        {renderContent()}
      </div>
    </div>
  );
};

export default LandscapeCAD; 