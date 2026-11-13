'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import PageHead, { Stat } from '../ui/PageHead';
import './see-pages-2.css';

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
        }, i * 20);
      });
    }, 50);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContent, activeCadSubCategory, activeLandscapeSubCategory, isTransitioning]);

  // 分類ごとの点数（タブの右に小さく出す）
  const cadCount = (sub: 'plants' | 'people' | 'furniture' | 'others' | 'all') =>
    sub === 'all' ? cadItems.length : cadItems.filter(i => i.subCategory === sub).length;
  const landscapeCount = (sub: 'plants' | 'people' | 'others' | 'background' | 'all') =>
    sub === 'all' ? landscapeItems.length : landscapeItems.filter(i => i.subCategory === sub).length;

  // 形式のラベル（DXF / PNG）。CAD は type、添景はファイルの拡張子から
  const formatOf = (item: LandscapeCADItem) =>
    (item.type || item.downloadUrl.split('.').pop() || '').toUpperCase();

  const fallbackImage = (contentType: 'cad' | 'landscape') =>
    contentType === 'cad'
      ? 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDI0MCAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI0MCIgaGVpZ2h0PSIxOTIiIGZpbGw9IiNGM0Y0RjYiLz48dGV4dCB4PSIxMjAiIHk9Ijk2IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+Q0FE44OH44O844K/</dGV4dD48L3N2Zz4='
      : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDI0MCAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI0MCIgaGVpZ2h0PSIxOTIiIGZpbGw9IiNGM0Y0RjYiLz48dGV4dCB4PSIxMjAiIHk9Ijk2IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+5re75pmv44OH44O844K/</dGV4dD48L3N2Zz4=';

  const renderContent = () => {
    const items = getCurrentItems();

    if (items.length === 0) {
      if (activeContent === 'landscape' && !activeLandscapeSubCategory) {
        return <p className="yy-home__empty">植物または人のカテゴリーを選択してください。</p>;
      }
      return <p className="yy-home__empty">該当する情報がありません。</p>;
    }

    return (
      <div className="yy-cad__grid">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`yy-cad__item${activeList[index] ? ' is-in' : ''}`}
          >
            <button
              type="button"
              className="yy-cad__thumb"
              onClick={() => handleDownload(item.downloadUrl, item.title)}
              title={`${item.title}（${item.description}）をダウンロード`}
              aria-label={`${item.title}をダウンロード`}
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = fallbackImage(activeContent);
                }}
              />
            </button>
            <div className="yy-cad__name" title={item.title}>{item.title}</div>
            <div className="yy-cad__meta">
              <span className="yy-fmt">{formatOf(item)}</span>
              <span className="yy-cad__price">{item.price}</span>
              <button
                type="button"
                className="yy-linkbtn yy-cad__dl"
                onClick={() => handleDownload(item.downloadUrl, item.title)}
              >
                ダウンロード
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const cadSubs: { key: 'all' | 'plants' | 'people' | 'furniture' | 'others'; label: string }[] = [
    { key: 'all', label: '全カテゴリー' },
    { key: 'plants', label: '植物' },
    { key: 'people', label: '人' },
    { key: 'furniture', label: '什器' },
    { key: 'others', label: 'その他' },
  ];
  const landscapeSubs: { key: 'all' | 'background' | 'plants' | 'people' | 'others'; label: string }[] = [
    { key: 'all', label: '全カテゴリー' },
    { key: 'background', label: '背景' },
    { key: 'plants', label: '植物' },
    { key: 'people', label: '人' },
    { key: 'others', label: 'その他' },
  ];
  const shownCount = getCurrentItems().length;

  return (
    <div className="yy-cad">
      <PageHead
        no="08"
        en="cad & entourage"
        title="添景・CAD"
        desc="図面・パースに使える無料データ"
        right={
          <>
            <Stat n={cadItems.length} label="点 CAD" />
            <Stat n={landscapeItems.length} label="点 添景" />
            <span className="yy-stat">すべて無料</span>
          </>
        }
      />

      {/* CAD / 添景：下線タブ */}
      <div className="yy-tabs yy-cad__tabs">
        <button type="button" className="yy-tab" aria-pressed={activeContent === 'cad'} onClick={() => displayContent('cad')}>
          CAD<small>{cadItems.length}</small>
        </button>
        <button type="button" className="yy-tab" aria-pressed={activeContent === 'landscape'} onClick={() => displayContent('landscape')}>
          添景<small>{landscapeItems.length}</small>
        </button>
      </div>

      {/* 小分類：小さめの下線タブ。右に表示中の点数とログインの案内 */}
      <div className="yy-cad__bar">
        <div className="yy-tabs yy-cad__subtabs">
          {activeContent === 'cad'
            ? cadSubs.map((s) => (
                <button key={s.key} type="button" className="yy-tab" aria-pressed={activeCadSubCategory === s.key} onClick={() => displayCadSubCategory(s.key)}>
                  {s.label}<small>{cadCount(s.key)}</small>
                </button>
              ))
            : landscapeSubs.map((s) => (
                <button key={s.key} type="button" className="yy-tab" aria-pressed={activeLandscapeSubCategory === s.key} onClick={() => displayLandscapeSubCategory(s.key)}>
                  {s.label}<small>{landscapeCount(s.key)}</small>
                </button>
              ))}
        </div>
        <span className="yy-cad__info">
          <span className="yy-label">{activeContent === 'cad' ? 'DXF' : 'PNG'} · {shownCount} 点</span>
          {!isLoggedIn && (
            <span className="yy-cad__login">
              ダウンロードは会員登録（無料）が必要です
              {onNavigateToLogin && (
                <button type="button" className="yy-linkbtn" onClick={onNavigateToLogin}>ログイン</button>
              )}
            </span>
          )}
        </span>
      </div>

      <div
        id="landscape-cad-content-area"
        className={`yy-cad__area${isTransitioning ? ' is-fading' : ''}`}
      >
        {renderContent()}
      </div>

      <p className="yy-cad__foot">
        プレゼンや施工図に使える添景データや CAD パーツを分類別にまとめています。画像をクリックしてもダウンロードできます。
      </p>
    </div>
  );
};

export default LandscapeCAD; 