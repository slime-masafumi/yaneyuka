'use client';

import React, { useState, useEffect } from 'react';
import { decorateAffiliateLink } from '../../lib/affiliate';
import PageHead, { Stat } from '../ui/PageHead';
import './see-pages.css';

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

/** 分類(タブの並び) */
const CATEGORIES: Array<[string, string]> = [
  ['magazine', '雑誌'],
  ['book', '専門書'],
  ['reading', '書籍'],
  ['software', 'ソフト'],
  ['ai', 'AI'],
];
const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES);

/** 楽天・Amazon の購入リンクを出す品(もしもアフィリエイト経由) */
const SHOP_IDS = ['book1', 'book2', 'book3', 'book4', 'book5', 'software1'];
/** 表紙を Fujisan へのリンクにする雑誌 */
const MAG_LINK_IDS = ['mag2', 'mag3', 'mag4', 'mag5', 'mag6', 'mag7', 'mag8'];

/** 表紙が読めないときの代わり(棚の表紙の大きさに合わせて伸びる) */
const NO_IMAGE_SVG = `
  <svg viewBox="0 0 120 160" width="120" height="160" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="160" fill="#EBEAE4"/>
    <text x="60" y="84" text-anchor="middle" fill="#9A9A96" font-family="monospace" font-size="9" letter-spacing="1.5">NO IMAGE</text>
  </svg>`;
const onCoverError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const target = e.target as HTMLImageElement;
  target.src = `data:image/svg+xml;utf8,${encodeURIComponent(NO_IMAGE_SVG)}`;
};

/** リンク先の名前(↗ の前に出す) */
function siteName(url?: string): string {
  if (!url) return '';
  if (/fujisan\.co\.jp/.test(url)) return 'Fujisan';
  return '公式サイト';
}

const BooksSoftware: React.FC<BooksSoftwareProps> = ({ onNavigateToRegistration }) => {
  const [activeCategory, setActiveCategory] = useState<string>('magazine');

  // 書籍・ソフト・AIデータの定義
  const bookSoftwareData: Record<string, BookSoftwareItem[]> = {
    magazine: [
      {
        id: 'mag2',
        title: '新建築',
        description: '国内外の優れた建築事例を豊富な写真と図面で紹介。',
        price: '',
        image: 'https://img.fujisan.co.jp/images/products/backnumbers/2726263_o.jpg',
        category: 'magazine',
        link: 'https://www.fujisan.co.jp/product/1259/'
      },
      {
        id: 'mag3',
        title: '建築知識',
        description: '実務に役立つ法規・納まり・ディテールを特集。',
        price: '',
        image: 'https://img.fujisan.co.jp/images/products/684_o.jpg',
        category: 'magazine',
        link: 'https://www.fujisan.co.jp/product/684/'
      },
      {
        id: 'mag4',
        title: '住宅建築',
        description: '住宅設計の先端事例を丁寧に紹介。',
        price: '',
        image: 'https://img.fujisan.co.jp/images/products/backnumbers/2721837_o.jpg',
        category: 'magazine',
        link: 'https://www.fujisan.co.jp/product/1351/'
      },
      {
        id: 'mag5',
        title: '商店建築',
        description: '店舗デザインと商空間のトレンドを網羅。',
        price: '',
        image: 'https://img.fujisan.co.jp/images/products/backnumbers/2722595_o.jpg',
        category: 'magazine',
        link: 'https://www.fujisan.co.jp/product/1223/'
      },
      {
        id: 'mag6',
        title: 'a+u',
        description: '国内外の建築と都市を英日バイリンガルで特集。',
        price: '',
        image: 'https://img.fujisan.co.jp/images/products/backnumbers/2722491_p.jpg',
        category: 'magazine',
        link: 'https://www.fujisan.co.jp/product/199/'
      },
      {
        id: 'mag7',
        title: 'Casa BRUTUS',
        description: '建築・デザイン・ライフスタイルを横断的に紹介。',
        price: '',
        image: 'https://img.fujisan.co.jp/images/products/backnumbers/2728639_o.jpg',
        category: 'magazine',
        link: 'https://www.fujisan.co.jp/product/1217008/'
      },
      {
        id: 'mag8',
        title: '日経アーキテクチュア',
        description: '業界のニュース、技術、実務情報を深掘り。',
        price: '',
        image: 'https://img.fujisan.co.jp/images/products/backnumbers/2685063_o.jpg',
        category: 'magazine',
        link: 'https://www.fujisan.co.jp/product/1281679713/'
      },
      {
        id: 'mag9',
        title: 'ELLE DECOR',
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
        title: '建築ジャーナル',
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
        title: 'CONFORT',
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
        price: '',
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
        price: '',
        image: '/image/software2.jpg',
        category: 'software',
        link: 'https://www.autodesk.com/jp/products/revit/overview',
        isExternal: true
      },
      {
        id: 'software3',
        title: 'AutoCAD',
        description: '2D CADソフトウェア',
        price: '',
        image: '/image/software3.jpg',
        category: 'software',
        link: 'https://www.autodesk.com/jp/products/autocad/overview',
        isExternal: true
      },
      {
        id: 'software4',
        title: 'SketchUp',
        description: '3Dモデリングソフト',
        price: '',
        image: '/image/software4.jpg',
        category: 'software',
        link: 'https://www.sketchup.com/ja',
        isExternal: true
      },
      {
        id: 'software5',
        title: 'ARCHICAD',
        description: 'BIMソフトウェア',
        price: '',
        image: '/image/software5.jpg',
        category: 'software',
        link: 'https://graphisoft.com/jp',
        isExternal: true
      }
    ],
    ai: [
      {
        id: 'ai1',
        title: 'ChatGPT',
        description: 'OpenAIの対話型AI',
        price: '',
        image: '/image/ChatGPT Image 2025年5月1日 15_33_37.png',
        category: 'ai',
        link: 'https://chat.openai.com/',
        isExternal: true
      },
      {
        id: 'ai2',
        title: 'Claude',
        description: 'Anthropicの高性能AI',
        price: '',
        image: '/image/ChatGPT Image 2025年5月1日 15_39_58.png',
        category: 'ai',
        link: 'https://claude.ai/',
        isExternal: true
      },
      {
        id: 'ai3',
        title: 'Midjourney',
        description: 'AIイメージ生成ツール',
        price: '',
        image: '/image/ChatGPT Image 2025年5月1日 15_48_44.png',
        category: 'ai',
        link: 'https://www.midjourney.com/',
        isExternal: true
      },
      {
        id: 'ai4',
        title: 'DALL-E',
        description: 'OpenAIの画像生成AI',
        price: '',
        image: '/image/ChatGPT Image 2025年5月1日 16_00_25.png',
        category: 'ai',
        link: 'https://openai.com/dall-e-3',
        isExternal: true
      },
      {
        id: 'ai5',
        title: 'Stable Diffusion',
        description: 'オープンソースの画像生成AI',
        price: '',
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

  const getCurrentItems = (): BookSoftwareItem[] => {
    return bookSoftwareData[activeCategory] || [];
  };

  // 以前の「カードを押すと開く」先(楽天・Amazon・A8 の品を除く)。Amazon なら tag を付ける
  const itemHref = (item: BookSoftwareItem): string => {
    const baseUrl = item.link && /^https?:\/\//i.test(item.link)
      ? item.link
      : `https://www.amazon.co.jp/s?k=${encodeURIComponent(item.title)}`;
    return decorateAffiliateLink(baseUrl);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  const renderRow = (item: BookSoftwareItem, index: number) => {
    const isShop = SHOP_IDS.includes(item.id) && !!item.rakutenImage && !!item.rakutenLink;
    const isA8 = !isShop && !!item.isA8Ad;
    const isMagLink = !isShop && !isA8 && MAG_LINK_IDS.includes(item.id);
    // 楽天・Amazon・A8 以外でリンクのある品は、題と ↗ から開く(以前のカードのクリックと同じ先)
    const opensSite = !isShop && !isA8 && !!item.link;
    const isPR = isShop || isA8;

    let cover: React.ReactNode;
    if (isShop) {
      cover = (
        <>
          <img src={`https:${item.rakutenImage}`} alt={item.title} loading="lazy" onError={onCoverError} />
          <img
            src={`https://i.moshimo.com/af/i/impression?a_id=5277132&p_id=54&pc_id=54&pl_id=616`}
            alt=""
            loading="lazy"
            width="1"
            height="1"
            className="yy-bk-pixel"
            style={{ border: 0, display: 'none' }}
          />
        </>
      );
    } else if (isA8) {
      cover = (
        <span className="yy-bk-a8 a8ad-container">
          <span className={`a8ad ${item.a8AdId || ''}`}></span>
          <a href={item.link} target="_blank" rel="noopener noreferrer nofollow sponsored">
            <img src={item.image} alt={item.title} loading="lazy" onError={onCoverError} />
          </a>
        </span>
      );
    } else if (isMagLink) {
      cover = (
        <a href={item.link} target="_blank" rel="noopener noreferrer nofollow sponsored">
          <img src={item.image} alt={item.title} loading="lazy" onError={onCoverError} />
        </a>
      );
    } else {
      cover = <img src={item.image} alt={item.title} loading="lazy" onError={onCoverError} />;
    }

    let title: React.ReactNode;
    if (isA8) {
      title = <a href={item.link} target="_blank" rel="noopener noreferrer nofollow sponsored" className="yy-bk-title" title={item.title}>{item.title}</a>;
    } else if (opensSite) {
      title = <a href={itemHref(item)} target="_blank" rel="noopener noreferrer" className="yy-bk-title" title={item.title}>{item.title}</a>;
    } else {
      title = <span className="yy-bk-title" title={item.title}>{item.title}</span>;
    }

    let links: React.ReactNode;
    if (isShop) {
      links = (
        <>
          <a href={`https:${item.rakutenLink}`} target="_blank" rel="nofollow noopener noreferrer">楽天で購入 ↗</a>
          {item.amazonLink && (
            <a href={decorateAffiliateLink(item.amazonLink)} target="_blank" rel="nofollow noopener noreferrer">Amazonで購入 ↗</a>
          )}
        </>
      );
    } else if (isA8) {
      links = <a href={item.link} target="_blank" rel="noopener noreferrer nofollow sponsored">{siteName(item.link)} ↗</a>;
    } else if (opensSite) {
      links = <a href={itemHref(item)} target="_blank" rel="noopener noreferrer">{siteName(item.link)} ↗</a>;
    } else {
      links = <span className="is-none">—</span>;
    }

    return (
      <li key={item.id} className="yy-bk-row">
        <span className="yy-bk-no">{String(index + 1).padStart(2, '0')}</span>
        <span className="yy-bk-cover">{cover}</span>
        <div className="yy-bk-body">
          {title}
          {item.description && <span className="yy-bk-desc">{item.description}</span>}
        </div>
        <span className="yy-bk-price">
          {/* 価格・料金は変わるので載せない(各販売・公式ページで。2026-11-15) */}
          {isPR ? <span className="yy-fmt" title="アフィリエイト(広告)リンクを含みます">PR</span> : ''}
        </span>
        <span className="yy-bk-links">{links}</span>
      </li>
    );
  };

  const renderContent = () => {
    const items = getCurrentItems();

    if (items.length === 0) {
      return <p className="yy-bk-empty">該当する情報がありません。</p>;
    }

    return <ol className="yy-bk-list">{items.map(renderRow)}</ol>;
  };

  const total = CATEGORIES.reduce((n, [k]) => n + (bookSoftwareData[k]?.length || 0), 0);

  return (
    <div>
      <PageHead
        no="09"
        en="books & software"
        title="書籍・ソフト"
        desc="設計・施工に役立つ専門書、BIM / CAD ソフト、AI サービス"
        right={
          <>
            <Stat n={total} label="点" />
            <Stat n={CATEGORIES.length} label="分類" />
          </>
        }
      />
      <div className="yy-tabs">
        {CATEGORIES.map(([k, label]) => (
          <button
            key={k}
            type="button"
            className="yy-tab"
            aria-pressed={activeCategory === k}
            onClick={() => setActiveCategory(k)}
          >
            {label}
            <small>{bookSoftwareData[k]?.length || 0}</small>
          </button>
        ))}
      </div>
      <div className="yy-bk-page">
        <div className="yy-bk-main">
          <section id="book-software-content-area">
            <div className="yy-sec">
              <span className="yy-sec__no">I</span>
              <span className="yy-sec__title">{CATEGORY_LABEL[activeCategory]}</span>
              <span className="yy-sec__right">{getCurrentItems().length} 点</span>
            </div>
            {renderContent()}
          </section>
        </div>
        <aside className="yy-bk-side">
          <section>
            <div className="yy-sec"><span className="yy-sec__no">II</span><span className="yy-sec__title">分類</span><span className="yy-sec__right">{total} 点</span></div>
            <ol className="yy-bk-toc">
              {CATEGORIES.map(([k, label], i) => (
                <li key={k}>
                  <button
                    type="button"
                    className="yy-srcrow yy-srcrow--btn"
                    aria-pressed={activeCategory === k}
                    onClick={() => setActiveCategory(k)}
                  >
                    <span className="yy-home__tocno">{String(i + 1).padStart(2, '0')}</span>
                    <span className="yy-home__toct">{label}</span>
                    <span className="yy-leader" />
                    <span className="yy-home__n">{bookSoftwareData[k]?.length || 0}</span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="yy-bk-note">日々のインプットやツール選定の参考に。PR の品は楽天・Amazon・A8.net のアフィリエイト(広告)リンクです。</p>
          </section>
          <section>
            <div className="yy-sec"><span className="yy-sec__no">III</span><span className="yy-sec__title">掲載希望</span></div>
            <div className="yy-gray">
              <span className="yy-gray__title">書籍・ソフトを載せる</span>
              <span className="yy-gray__text">出版社・ソフトウェア会社の方は、この一覧への掲載をご相談ください。</span>
              <button type="button" className="yy-btn" onClick={showContactForm}>掲載希望はコチラ</button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default BooksSoftware;
