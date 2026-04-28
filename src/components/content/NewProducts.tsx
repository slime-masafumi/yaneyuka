'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface ProductCard {
  id: string;
  title: string;
  description: string;
  price: string;        // API版ではsource + pubDateをここに入れて表示
  image: string;
  category: string;
  link?: string;        // 外部記事へのリンク（API経由のアイテムのみ）
  source?: string;
  pubDate?: string;
}

interface NewProductsProps {
  onNavigateToRegistration?: () => void;
}

// API停止時のフォールバック用サンプルデータ
const FALLBACK_PRODUCTS: Record<string, ProductCard[]> = {
  exterior: [{
    id: 'exterior-1',
    title: '外装 新製品（サンプル）',
    description: 'こちらはサンプル商品になります。',
    price: '詳細情報はお問い合わせください',
    image: '/image/NewProduct/Gemini_Generated_Image_vwyodivwyodivwyo.webp',
    category: 'exterior'
  }],
  interior: [{
    id: 'interior-1',
    title: '内装仕上材 新製品（サンプル）',
    description: 'こちらはサンプル商品になります。',
    price: '詳細情報はお問い合わせください',
    image: '/image/NewProduct/Gemini_Generated_Image_idc6alidc6alidc6.webp',
    category: 'interior'
  }],
  structure: [{
    id: 'structure-1',
    title: '木造金物 新製品（サンプル）',
    description: 'こちらはサンプル商品になります。',
    price: '詳細情報はお問い合わせください',
    image: '/image/NewProduct/Gemini_Generated_Image_up9ky3up9ky3up9k.webp',
    category: 'structure'
  }],
  opening: [{
    id: 'opening-1',
    title: 'アルミ建具 新製品（サンプル）',
    description: 'こちらはサンプル商品になります。',
    price: '詳細情報はお問い合わせください',
    image: '/image/NewProduct/Gemini_Generated_Image_vredwavredwavred.webp',
    category: 'opening'
  }],
  equipment: [{
    id: 'equipment-1',
    title: 'システムキッチン 新製品（サンプル）',
    description: 'こちらはサンプル商品になります。',
    price: '詳細情報はお問い合わせください',
    image: '/image/NewProduct/Gemini_Generated_Image_vtogzvvtogzvvtog.webp',
    category: 'equipment'
  }],
  technology: [{
    id: 'technology-1',
    title: 'ペンダント照明 新製品（サンプル）',
    description: 'こちらはサンプル商品になります。',
    price: '詳細情報はお問い合わせください',
    image: '/image/NewProduct/Gemini_Generated_Image_e7vx3oe7vx3oe7vx.webp',
    category: 'technology'
  }]
};

// 取得元別の配色（テキストフォールバック用）
const SOURCE_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  '新建ハウジング': { bg: '#f5f1ea', text: '#5a4a32', accent: '#a88860' },
  '住宅産業新聞': { bg: '#eef2f5', text: '#2c4a6b', accent: '#5b88b5' },
  '建設工業新聞': { bg: '#f1f0ec', text: '#3a3a2e', accent: '#7a7560' },
  '建設通信新聞': { bg: '#eef0ed', text: '#2f4a3e', accent: '#5e8674' },
  'PR TIMES': { bg: '#f0ecf2', text: '#4a2f5e', accent: '#7a5b9b' },
};
const DEFAULT_SOURCE_COLOR = { bg: '#f3f4f6', text: '#374151', accent: '#9ca3af' };

// API取得失敗時のローカル汎用画像かどうか（取得元表示に差し替え対象）
function isGenericLocalFallback(url: string): boolean {
  return url.startsWith('/image/NewProduct/') || url.startsWith('/image/掲載募集中');
}

// 画像エリア。実画像が無い/失敗時は取得元名をタイポグラフィで表示する
const ProductImage: React.FC<{ product: ProductCard; index: number }> = ({ product, index }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const useSourceFallback = imgFailed || isGenericLocalFallback(product.image);

  if (useSourceFallback) {
    const source = product.source || '画像なし';
    const colors = SOURCE_COLORS[source] || DEFAULT_SOURCE_COLOR;
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center px-4"
        style={{ backgroundColor: colors.bg }}
      >
        <div
          className="text-[10px] tracking-[0.2em] uppercase mb-2"
          style={{ color: colors.accent }}
        >
          SOURCE
        </div>
        <div
          className="text-base font-semibold text-center leading-snug"
          style={{ color: colors.text }}
        >
          {source}
        </div>
        <div
          className="mt-3 h-px w-10"
          style={{ backgroundColor: colors.accent, opacity: 0.5 }}
        />
      </div>
    );
  }

  return (
    <img
      src={product.image}
      alt={product.title}
      className="w-full h-full object-cover block"
      width={400}
      height={256}
      loading={index < 3 ? 'eager' : 'lazy'}
      fetchPriority={index < 2 ? 'high' : 'auto'}
      decoding="async"
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      onError={() => setImgFailed(true)}
    />
  );
};

type ApiItem = {
  id: string;
  title: string;
  link: string;
  pubDate?: string;
  source: string;
  description?: string;
  category: string;
  image?: string;
};

function formatPubDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

const NewProducts: React.FC<NewProductsProps> = ({ onNavigateToRegistration }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [showCards, setShowCards] = useState<boolean>(true);
  const [activeList, setActiveList] = useState<boolean[]>([]);
  const [apiItems, setApiItems] = useState<ProductCard[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 新商品APIを初回マウントで取得
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/new-products');
        if (!res.ok) throw new Error(`status ${res.status}`);
        const json = await res.json();
        const items = (json?.items || []) as ApiItem[];
        const mapped: ProductCard[] = items.map(it => ({
          id: it.id,
          title: it.title,
          description: it.description || '',
          price: `${it.source}${it.pubDate ? ' ・ ' + formatPubDate(it.pubDate) : ''}`,
          image: it.image || '/image/掲載募集中a.png',
          category: it.category,
          link: it.link,
          source: it.source,
          pubDate: it.pubDate,
        }));
        if (!cancelled) {
          setApiItems(mapped.length > 0 ? mapped : null);
          setIsLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('[NewProducts] API取得失敗、フォールバックを使用:', e);
          setApiItems(null);
          setIsLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // APIデータがあればそれを使用、なければフォールバックのサンプル
  const newProductCategories: Record<string, ProductCard[]> = useMemo(() => {
    if (!apiItems || apiItems.length === 0) return FALLBACK_PRODUCTS;
    const grouped: Record<string, ProductCard[]> = {
      exterior: [], interior: [], structure: [], opening: [], equipment: [], technology: []
    };
    apiItems.forEach(item => {
      if (grouped[item.category]) grouped[item.category].push(item);
    });
    // 空カテゴリはフォールバックで補完
    (Object.keys(grouped) as Array<keyof typeof grouped>).forEach(k => {
      if (grouped[k].length === 0 && FALLBACK_PRODUCTS[k]) grouped[k] = FALLBACK_PRODUCTS[k];
    });
    return grouped;
  }, [apiItems]);

  // カテゴリ切り替え時にactiveListをリセットし、左から順にactive化
  useEffect(() => {
    const products = getCurrentProducts();
    setActiveList(Array(products.length).fill(false));
    products.forEach((_, i) => {
      setTimeout(() => {
        setActiveList(prev => {
          const copy = [...prev];
          copy[i] = true;
          return copy;
        });
      }, i * 80);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  // 最初の3枚の画像をプリロード
  useEffect(() => {
    const products = getCurrentProducts();
    const preloadImages = products.slice(0, 3).map(product => {
      if (product.image) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = product.image;
        document.head.appendChild(link);
        return link;
      }
      return null;
    }).filter(Boolean) as HTMLLinkElement[];

    return () => {
      preloadImages.forEach(link => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  // デバッグ用のログ
  console.log('NewProducts component loaded');
  console.log('Active category:', activeCategory);
  console.log('Show cards:', showCards);

  const showContactForm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onNavigateToRegistration) {
      onNavigateToRegistration();
    } else {
      alert('掲載希望フォームを表示します（実装予定）');
    }
  };

  const displayNewProductCategory = (category: string) => {
    setIsTransitioning(true);
    setShowCards(false);
    
    setTimeout(() => {
      setActiveCategory(category);
      setIsTransitioning(false);
      setShowCards(true);
    }, 250);
  };

  const getCurrentProducts = (): ProductCard[] => {
    if (activeCategory === 'all') {
      return Object.values(newProductCategories).flat();
    } else {
      return newProductCategories[activeCategory] || [];
    }
  };

  const getButtonClass = (category: string) => {
    const baseClass = "text-xs px-2 py-1 rounded w-24 transition new-product-sub-button";
    if (activeCategory === category) {
      return `${baseClass} bg-gray-700 text-white`;
    }
    return `${baseClass} bg-gray-300 text-black hover:bg-gray-700 hover:text-white`;
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-8 text-gray-500 text-sm">
          最新の新製品情報を取得中…
        </div>
      );
    }
    const products = getCurrentProducts();

    if (products.length === 0) {
      return <p className="text-gray-700">該当する情報がありません。</p>;
    }

    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {products.map((product, index) => (
          <div 
            key={product.id}
            className={`border border-gray-200 rounded-lg bg-white overflow-hidden w-full h-[380px] product-card transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-1 flex flex-col ${activeList[index] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
          >
            {/* 画像エリア：大きく表示（h-64 = 256px）。失敗時は取得元ロゴ＋名前にフォールバック */}
            <div className="relative w-full h-64 bg-gray-100 shrink-0 border-b border-gray-50">
                <ProductImage product={product} index={index} />
            </div>

            {/* コンテンツエリア：高さを抑えてコンパクトに */}
            <div className="px-4 py-3 flex flex-col flex-1 justify-between">
                <div>
                    <div className="font-bold text-sm mb-1.5 line-clamp-1 text-gray-800">{product.title}</div>
                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">{product.description}</p>
                </div>
                
                <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-100">
                    <span className="text-[10px] text-gray-400 font-medium truncate mr-2">{product.price}</span>
                    {product.link ? (
                      <a
                        href={product.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors shrink-0 flex items-center gap-0.5"
                      >
                        詳細を見る <span className="text-[9px]">▶</span>
                      </a>
                    ) : (
                      <a
                        href="#"
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors shrink-0 flex items-center gap-0.5"
                        onClick={(e) => {
                          e.preventDefault();
                          alert(`${product.title}の詳細を表示します（実装予定）`);
                        }}
                      >
                        詳細を見る <span className="text-[9px]">▶</span>
                      </a>
                    )}
                </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-baseline mb-2">
        <h2 className="text-xl font-semibold">新製品</h2>
        <a href="#" onClick={showContactForm} className="text-blue-600 hover:text-blue-800 text-[11px] ml-4">掲載希望はコチラ</a>
      </div>
      <p className="text-[12px] text-gray-600 mb-3">
        外装・内装・設備から最新テクノロジーまで、注目の新製品をカテゴリ別に集約しています。PR TIMES等の公式RSSから自動取得・分類しています。提案アイデアや仕様検討の入り口としてご活用ください。
      </p>
      <div id="new-product-navigation" className="mb-4 flex gap-2 flex-wrap">
        <button 
          className={getButtonClass('all')}
          onClick={() => displayNewProductCategory('all')}
        >
          全カテゴリー
        </button>
        <button 
          className={getButtonClass('exterior')}
          onClick={() => displayNewProductCategory('exterior')}
        >
          外装外構
        </button>
        <button 
          className={getButtonClass('interior')}
          onClick={() => displayNewProductCategory('interior')}
        >
          内装仕上
        </button>
        <button 
          className={getButtonClass('structure')}
          onClick={() => displayNewProductCategory('structure')}
        >
          構造下地
        </button>
        <button 
          className={getButtonClass('opening')}
          onClick={() => displayNewProductCategory('opening')}
        >
          建具開口
        </button>
        <button 
          className={getButtonClass('equipment')}
          onClick={() => displayNewProductCategory('equipment')}
        >
          住宅設備
        </button>
        <button 
          className={getButtonClass('technology')}
          onClick={() => displayNewProductCategory('technology')}
        >
          照明器具
        </button>
      </div>
      <div 
        id="new-product-content-area" 
        className={`transition-opacity duration-250 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
      >
        {renderContent()}
      </div>
    </div>
  );
};

export default NewProducts;
