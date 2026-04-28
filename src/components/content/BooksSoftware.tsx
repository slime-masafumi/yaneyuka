'use client';

import React, { useState, useEffect } from 'react';
import { decorateAffiliateLink } from '../../lib/affiliate';
import styles from './BooksSoftware.module.css';

interface BookSoftwareItem {
  id: string;
  title: string;
  description: string;
  price: string;
  image: string;
  category: 'book' | 'reading' | 'software' | 'ai' | 'magazine';
  link?: string;
  isExternal?: boolean;
  isA8Ad?: boolean;
  a8AdId?: string;
  a8Mat?: string;
  rakutenLink?: string;
  rakutenImage?: string;
  amazonLink?: string;
}

interface BooksSoftwareProps {
  onNavigateToRegistration?: () => void;
}

const BooksSoftware: React.FC<BooksSoftwareProps> = ({ onNavigateToRegistration }) => {
  const [activeCategory, setActiveCategory] = useState<string>('magazine');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [activeList, setActiveList] = useState<boolean[]>([]);
  const [columns, setColumns] = useState<number>(1);

  // 画面幅で列数を決め打ち
  useEffect(() => {
    const updateColumns = () => {
      const w = window.innerWidth;
      if (w < 640) setColumns(1);
      else if (w < 1024) setColumns(2);
      else if (w < 1280) setColumns(3);
      else setColumns(5);
    };
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);


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


  // 書籍・ソフト・AIデータの定義
  const bookSoftwareData: Record<string, BookSoftwareItem[]> = {
    magazine: [
      {
        id: 'mag2',
        title: '新建築 最新号',
        description: '国内外の優れた建築事例を豊富な写真と図面で紹介。',
        price: '',
        image: 'https://img.fujisan.co.jp/images/products/backnumbers/2726263_o.jpg',
        category: 'magazine',
        link: 'https://www.fujisan.co.jp/product/1259/'
      },
      {
        id: 'mag3',
        title: '建築知識 最新号',
        description: '実務に役立つ法規・納まり・ディテールを特集。',
        price: '',
        image: 'https://img.fujisan.co.jp/images/products/684_o.jpg',
        category: 'magazine',
        link: 'https://www.fujisan.co.jp/product/684/'
      },
      {
        id: 'mag4',
        title: '住宅建築 最新号',
        description: '住宅設計の先端事例を丁寧に紹介。',
        price: '',
        image: 'https://img.fujisan.co.jp/images/products/backnumbers/2721837_o.jpg',
        category: 'magazine',
        link: 'https://www.fujisan.co.jp/product/1351/'
      },
      {
        id: 'mag5',
        title: '商店建築 最新号',
        description: '店舗デザインと商空間のトレンドを網羅。',
        price: '',
        image: 'https://img.fujisan.co.jp/images/products/backnumbers/2722595_o.jpg',
        category: 'magazine',
        link: 'https://www.fujisan.co.jp/product/1223/'
      },
      {
        id: 'mag6',
        title: 'a+u 最新号',
        description: '国内外の建築と都市を英日バイリンガルで特集。',
        price: '',
        image: 'https://img.fujisan.co.jp/images/products/backnumbers/2722491_p.jpg',
        category: 'magazine',
        link: 'https://www.fujisan.co.jp/product/199/'
      },
      {
        id: 'mag7',
        title: 'Casa BRUTUS 最新号',
        description: '建築・デザイン・ライフスタイルを横断的に紹介。',
        price: '',
        image: 'https://img.fujisan.co.jp/images/products/backnumbers/2728639_o.jpg',
        category: 'magazine',
        link: 'https://www.fujisan.co.jp/product/1217008/'
      },
      {
        id: 'mag8',
        title: '日経アーキテクチュア 最新号',
        description: '業界のニュース、技術、実務情報を深掘り。',
        price: '',
        image: 'https://img.fujisan.co.jp/images/products/backnumbers/2685063_o.jpg',
        category: 'magazine',
        link: 'https://www.fujisan.co.jp/product/1281679713/'
      },
      {
        id: 'mag9',
        title: 'ELLE DECOR 最新号',
        description: '',
        price: '',
        image: 'https://img.fujisan.co.jp/images/products/1281690833_p.jpg',
        category: 'magazine',
        link: 'https://www.fujisan.co.jp/product/1281690833/',
        isA8Ad: true,
        a8AdId: '4q6TeTS-g7-v3BVKb5',
        a8Mat: '45IF57+50ZSOI+13X8+BWGDT'
      },
      {
        id: 'mag10',
        title: '建築ジャーナル 最新号',
        description: '',
        price: '',
        image: 'https://img.fujisan.co.jp/images/products/backnumbers/2726480_p.jpg',
        category: 'magazine',
        link: 'https://www.fujisan.co.jp/product/1281680203/',
        isA8Ad: true,
        a8AdId: '4q6TeTS-g7-v3BWPcD',
        a8Mat: '45IF57+50ZSOI+13X8+BWGDT'
      },
      {
        id: 'mag11',
        title: 'CONFORT 最新号',
        description: '',
        price: '',
        image: 'https://img.fujisan.co.jp/images/products/backnumbers/2726521_p.jpg',
        category: 'magazine',
        link: 'https://www.fujisan.co.jp/product/1281680618/',
        isA8Ad: true,
        a8AdId: '4q6TeTS-g7-v3BX6RJ',
        a8Mat: '45IF57+50ZSOI+13X8+BWGDT'
      }
    ],
    // 専門書（実務寄り）
    book: [
      {
        id: 'book1',
        title: '建築物の防火避難規定の解説2025',
        description: '2024年４月施行分（2022年法改正）に対応！2024年告示・通知改正に対応した最新版！',
        price: '',
        image: '/image/book1.jpg',
        category: 'book',
        link: 'https://amzn.to/3Kf9G9W',
        isExternal: true,
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fbook%2F18243452%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fbook%2Fi%2F21617055%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/5268/9784324115268_1_2.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/3Kf9G9W'
      },
      {
        id: 'book2',
        title: '建築基準法関係法令集2026年版',
        description: '建築士試験受験者、設計・施工者、確認・検査実務者のための［建築系］法令集。使いやすく、見やすく、携帯に便利なB5判。',
        price: '',
        image: '/image/book2.jpg',
        category: 'book',
        link: 'https://amzn.to/4p4bQIO',
        isExternal: true,
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fbook%2F18370932%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fbook%2Fi%2F21738204%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/0232/9784868340232.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/4p4bQIO'
      },
      {
        id: 'book3',
        title: '建築申請memo',
        description: '※「建築申請memo2025」の入荷は2025年1月に予定しております。（予約販売受付中）主な改正概要◆脱炭素社会の実現に資するための建築物省エネ法等の改正に伴い、令和７年４月１日より施行される「４号特例の見直し」、「小規模木造住宅・建築物の構造基準の見直し」、「建築主の性能向上努力義務」、「省エネ基準適合の拡大」等の内容を解説に織り込みました。◆「大規模木造建築物の主要構造部規制の合理化」や「壁等の構造方法等」に係る新規告示等に基づき、関連する項目の解説を充実させました。',
        price: '',
        image: '/image/book3.jpg',
        category: 'book',
        link: 'https://amzn.to/4iBWRDp',
        isExternal: true,
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fbook%2F18461133%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fbook%2Fi%2F21810715%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/5445/9784788295445.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/4iBWRDp'
      },
      {
        id: 'book4',
        title: '建築消防advice',
        description: '主な改正概要令和６年４月１日施行の消防法施行令及び消防法施行規則の改正に基づき、主に消防用設備等の技術基準に係る別棟みなし規定の拡充等について補正を行いました。また、関係省令の改正による特定小規模施設用自動火災報知設備を用いることができる防火対象物の拡大及び設置基準等の見直しに伴う補正を加えるとともに、行政実例の追加等を行いました。',
        price: '',
        image: '/image/book4.jpg',
        category: 'book',
        link: 'https://amzn.to/3McImKg',
        isExternal: true,
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fbook%2F18461132%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fbook%2Fi%2F21810725%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/5452/9784788295452.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/3McImKg'
      },
      {
        id: 'book5',
        title: '構造関係技術解説書',
        description: '◆最新の基準に完全準拠：常に改正される建築基準法の構造関係規定に対応 2025年版として、最新の法改正、通達、質疑応答を完全に反映しました。',
        price: '',
        image: '/image/book5.jpg',
        category: 'book',
        link: 'https://amzn.to/4pBZyaB',
        isExternal: true,
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fbooks-sanseido%2F9784864583589%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fbooks-sanseido%2Fi%2F10364481%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/books-sanseido/cabinet/books/book/9784864583589.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/4pBZyaB'
      }
    ],
    // 書籍（読み物・建築家の本）
    reading: [
      { 
        id: 'rd1', 
        title: 'AXIS(安藤忠雄)', 
        description: '安藤忠雄の制作プロセスに迫る。', 
        price: '', 
        image: 'https://img.fujisan.co.jp/images/products/backnumbers/2558440_p.jpg', 
        category: 'reading',
        link: 'https://www.fujisan.co.jp/product/32/b/2558440/',
        isA8Ad: true,
        a8AdId: '4q6TeTS-g7-v5QIu47',
        a8Mat: '45IF57+50ZSOI+13X8+BWGDT'
      },
      { id: 'rd2', title: '伊東豊雄 建築論', description: '詩的な空間観と社会への視点。', price: '', image: '/image/book_architect2.jpg', category: 'reading' },
      { id: 'rd3', title: 'SANAA Works', description: '妹島和世＋西沢立衛による代表作。', price: '', image: '/image/book_architect3.jpg', category: 'reading' },
      { id: 'rd4', title: '磯崎新 建築に何が可能か', description: '思想と作品を横断する批評集。', price: '', image: '/image/book_architect4.jpg', category: 'reading' },
      { id: 'rd5', title: 'ル・コルビュジエ 建築と都市', description: '近代建築の理論と歩み。', price: '', image: '/image/book_architect5.jpg', category: 'reading' }
    ],
    software: [
      {
        id: 'software1',
        title: 'Vectorworks',
        description: '2D/3D CADソフトウェア',
        price: '¥150,000',
        image: '/image/software1.jpg',
        category: 'software',
        link: 'https://amzn.to/4rzc8ZH',
        isExternal: true,
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fbiccamera%2F4513825013477%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fbiccamera%2Fi%2F15029205%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/biccamera/cabinet/product/11333/00000013744359_a01.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/4rzc8ZH'
      },
      {
        id: 'software2',
        title: 'Revit',
        description: 'BIMソフトウェア',
        price: '¥180,000',
        image: '/image/software2.jpg',
        category: 'software'
      },
      {
        id: 'software3',
        title: 'AutoCAD',
        description: '2D CADソフトウェア',
        price: '¥160,000',
        image: '/image/software3.jpg',
        category: 'software'
      },
      {
        id: 'software4',
        title: 'SketchUp',
        description: '3Dモデリングソフト',
        price: '¥80,000',
        image: '/image/software4.jpg',
        category: 'software'
      },
      {
        id: 'software5',
        title: 'ARCHICAD',
        description: 'BIMソフトウェア',
        price: '¥170,000',
        image: '/image/software5.jpg',
        category: 'software'
      }
    ],
    ai: [
      {
        id: 'ai1',
        title: 'ChatGPT',
        description: 'OpenAIの対話型AI',
        price: '¥2,000/月～',
        image: '/image/ChatGPT Image 2025年5月1日 15_33_37.png',
        category: 'ai',
        link: 'https://chat.openai.com/',
        isExternal: true
      },
      {
        id: 'ai2',
        title: 'Claude',
        description: 'Anthropicの高性能AI',
        price: '¥2,500/月～',
        image: '/image/ChatGPT Image 2025年5月1日 15_39_58.png',
        category: 'ai',
        link: 'https://claude.ai/',
        isExternal: true
      },
      {
        id: 'ai3',
        title: 'Midjourney',
        description: 'AIイメージ生成ツール',
        price: '¥1,500/月～',
        image: '/image/ChatGPT Image 2025年5月1日 15_48_44.png',
        category: 'ai',
        link: 'https://www.midjourney.com/',
        isExternal: true
      },
      {
        id: 'ai4',
        title: 'DALL-E',
        description: 'OpenAIの画像生成AI',
        price: '従量課金制',
        image: '/image/ChatGPT Image 2025年5月1日 16_00_25.png',
        category: 'ai',
        link: 'https://openai.com/dall-e-3',
        isExternal: true
      },
      {
        id: 'ai5',
        title: 'Stable Diffusion',
        description: 'オープンソースの画像生成AI',
        price: '無料',
        image: '/image/ChatGPT Image 2025年5月1日 16_21_16.png',
        category: 'ai',
        link: 'https://stability.ai/',
        isExternal: true
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

  const displayBookSoftwareCategory = (category: string) => {
    setIsTransitioning(true);
    // activeListを即座にリセットしてアニメーションをリセット
    setActiveList([]);
    
    setTimeout(() => {
      setActiveCategory(category);
      setIsTransitioning(false);
    }, 250);
  };

  const getCurrentItems = (): BookSoftwareItem[] => {
    return bookSoftwareData[activeCategory] || [];
  };

  const getButtonClass = (category: string) => {
    const baseClass = "text-xs px-2 py-1 rounded w-24 transition";
    if (activeCategory === category) {
      return `${baseClass} bg-gray-700 text-white`;
    }
    return `${baseClass} bg-gray-300 text-black hover:bg-gray-700 hover:text-white`;
  };

  const handleItemClick = (item: BookSoftwareItem) => {
    const baseUrl = item.link && /^https?:\/\//i.test(item.link)
      ? item.link
      : `https://www.amazon.co.jp/s?k=${encodeURIComponent(item.title)}`;
    const href = decorateAffiliateLink(baseUrl);
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  // A8.net広告スクリプトの読み込み
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '//statics.a8.net/ad/ad.js';
    script.async = true;
    if (!document.querySelector('script[src="//statics.a8.net/ad/ad.js"]')) {
      document.body.appendChild(script);
    }
  }, []);

  // A8.net広告の初期化（スクリプト読み込み後に実行）
  useEffect(() => {
    const items = getCurrentItems();
    const a8Items = items.filter(item => item.isA8Ad);
    
    if (a8Items.length > 0) {
      const checkAndInit = () => {
        if (typeof window !== 'undefined' && (window as any).a8adscript) {
          a8Items.forEach(item => {
            if (item.a8AdId && item.a8Mat && item.link) {
              const ejp = item.link.replace(/^https?:\/\//, '');
              const imu = item.image.replace(/^https?:\/\//, '');
              try {
                (window as any).a8adscript('body').showAd({
                  req: {
                    mat: item.a8Mat,
                    alt: '商品リンク',
                    id: item.a8AdId
                  },
                  goods: {
                    ejp: ejp,
                    imu: imu
                  }
                });
              } catch (e) {
                console.error('A8広告エラー:', e);
              }
            }
          });
        } else {
          setTimeout(checkAndInit, 100);
        }
      };
      const timer = setTimeout(checkAndInit, 500);
      return () => clearTimeout(timer);
    }
  }, [activeCategory, activeList]);

  const renderContent = () => {
    const items = getCurrentItems();
    
    if (items.length === 0) {
      return <p className="text-gray-700">該当する情報がありません。</p>;
    }

    return (
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {items.map((item, index) => (
          <div 
            key={item.id}
            className={`${styles.card} border rounded p-3 bg-white text-sm w-full flex flex-col ${item.id === 'book1' || item.id === 'book2' || item.id === 'book3' || item.id === 'book4' || item.id === 'book5' || item.id === 'software1' ? '' : 'cursor-pointer'} hover:shadow-md transition-shadow${activeList[index] ? ' ' + styles.active : ''}`}
            onClick={() => item.id !== 'book1' && item.id !== 'book2' && item.id !== 'book3' && item.id !== 'book4' && item.id !== 'book5' && item.id !== 'software1' && item.link && !item.isA8Ad && handleItemClick(item)}
          >
            <div className="font-bold text-sm mb-2 text-center line-clamp-1">{item.title}</div>
            {(item.id === 'book1' || item.id === 'book2' || item.id === 'book3' || item.id === 'book4' || item.id === 'book5' || item.id === 'software1') && item.rakutenImage && item.rakutenLink ? (
              <div className="mb-2" onClick={(e) => e.stopPropagation()}>
                <img 
                  src={`https:${item.rakutenImage}`}
                  alt={item.title}
                  className={`max-w-full h-auto max-h-[270px] object-contain mb-2 mx-auto ${styles.bookImage}`}
                  style={{ 
                    border: '0', 
                    outline: 'none', 
                    boxShadow: 'none',
                    borderWidth: '0',
                    borderStyle: 'none',
                    borderColor: 'transparent'
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    const svg = `
                      <svg width="360" height="288" xmlns="http://www.w3.org/2000/svg">
                        <rect width="360" height="288" fill="#F3F4F6"/>
                        <text x="180" y="150" text-anchor="middle" fill="#9B9B9B" font-size="14">No Image</text>
                      </svg>`;
                    target.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
                  }}
                />
                <img 
                  src={`https://i.moshimo.com/af/i/impression?a_id=5277132&p_id=54&pc_id=54&pl_id=616`}
                  alt=""
                  loading="lazy"
                  width="1"
                  height="1"
                  style={{ border: 0, display: 'none' }}
                />
                <div className="flex gap-2 justify-center mt-2">
                  <a
                    href={`https:${item.rakutenLink}`}
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 px-3 py-1.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors text-center"
                  >
                    楽天で購入
                  </a>
                  {item.amazonLink && (
                    <a
                      href={decorateAffiliateLink(item.amazonLink)}
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 px-3 py-1.5 bg-cyan-500 text-white text-xs rounded hover:bg-cyan-600 transition-colors text-center"
                    >
                      Amazonで購入
                    </a>
                  )}
                </div>
              </div>
            ) : item.isA8Ad ? (
              <div className="a8ad-container">
                <span className={`a8ad ${item.a8AdId || ''}`}></span>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer nofollow sponsored"
                  className="block"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="max-w-full h-auto max-h-[270px] object-contain rounded mb-2 mx-auto cursor-pointer hover:opacity-80 transition-opacity"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const svg = `
                        <svg width="360" height="288" xmlns="http://www.w3.org/2000/svg">
                          <rect width="360" height="288" fill="#F3F4F6"/>
                          <text x="180" y="150" text-anchor="middle" fill="#9B9B9B" font-size="14">No Image</text>
                        </svg>`;
                      target.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
                    }}
                  />
                </a>
              </div>
            ) : (item.id === 'mag2' || item.id === 'mag3' || item.id === 'mag4' || item.id === 'mag5' || item.id === 'mag6' || item.id === 'mag7' || item.id === 'mag8') ? (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer nofollow sponsored"
                className="block"
                onClick={(e) => e.stopPropagation()}
              >
                <img 
                  src={item.image} 
                  alt={item.title}
                  className="max-w-full h-auto max-h-[270px] object-contain rounded mb-2 mx-auto cursor-pointer hover:opacity-80 transition-opacity"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    const svg = `
                      <svg width="360" height="288" xmlns="http://www.w3.org/2000/svg">
                        <rect width="360" height="288" fill="#F3F4F6"/>
                        <text x="180" y="150" text-anchor="middle" fill="#9B9B9B" font-size="14">No Image</text>
                      </svg>`;
                    target.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
                  }}
                />
              </a>
            ) : (
              <img 
                src={item.image} 
                alt={item.title}
                className="max-w-full h-auto max-h-[270px] object-contain rounded mb-2 mx-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const svg = `
                    <svg width="360" height="288" xmlns="http://www.w3.org/2000/svg">
                      <rect width="360" height="288" fill="#F3F4F6"/>
                      <text x="180" y="150" text-anchor="middle" fill="#9B9B9B" font-size="14">No Image</text>
                    </svg>`;
                  target.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
                }}
              />
            )}
            <p className="text-xs text-gray-600 mb-1 line-clamp-2">{item.description}</p>
            {item.price && (
              <div className="mt-1">
                <span className="text-xs text-gray-500">{item.price}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-baseline mb-2">
        <h2 className="text-xl font-semibold">書籍・ソフト</h2>
        <a href="#" onClick={showContactForm} className="text-blue-600 hover:text-blue-800 text-[11px] ml-4">掲載希望はコチラ</a>
      </div>
      <p className="text-[12px] text-gray-600 mb-3">
        設計・施工に役立つ専門書やマニュアル、BIM/CADソフト、AIサービスのおすすめを整理しています。日々のインプットやツール選定の参考にどうぞ。
      </p>
      
      <div className="flex gap-2 flex-wrap mb-4">
        <button 
          onClick={() => displayBookSoftwareCategory('magazine')}
          className={getButtonClass('magazine')}
        >
          雑誌
        </button>
        <button 
          onClick={() => displayBookSoftwareCategory('book')}
          className={getButtonClass('book')}
        >
          専門書
        </button>
        <button 
          onClick={() => displayBookSoftwareCategory('reading')}
          className={getButtonClass('reading')}
        >
          書籍
        </button>
        <button 
          onClick={() => displayBookSoftwareCategory('software')}
          className={getButtonClass('software')}
        >
          ソフト
        </button>
        <button 
          onClick={() => displayBookSoftwareCategory('ai')}
          className={getButtonClass('ai')}
        >
          AI
        </button>
      </div>

      <div 
        id="book-software-content-area"
        className={`transition-opacity duration-250 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
      >
        {renderContent()}
      </div>
    </div>
  );
};

export default BooksSoftware; 