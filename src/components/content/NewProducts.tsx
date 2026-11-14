'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getJson } from '@/lib/apiCache';
import FeedPic from '@/components/ui/FeedPic';
import BrickWall from '@/components/ui/BrickWall';
import { isNotPhoto } from '@/lib/feedPhotos';
import { topicOf, topicPhoto } from '@/lib/feedTopic';
import { useReadLinks } from '@/lib/readLinks';
import PageHead, { Stat } from '../ui/PageHead';
import './see-pages.css';

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

/** 分類(タブの並び)。key は /api/new-products の category */
const CATEGORIES: Array<[string, string]> = [
  ['exterior', '外装外構'],
  ['interior', '内装仕上'],
  ['structure', '構造下地'],
  ['opening', '建具開口'],
  ['equipment', '住宅設備'],
  ['technology', '照明器具'],
];
const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES);

// API取得失敗時のローカル汎用画像かどうか（小さな写真を出さない対象）
function isGenericLocalFallback(url: string): boolean {
  return url.startsWith('/image/NewProduct/') || url.startsWith('/image/掲載募集中');
}

// 記事の写真。取得できなかった分類の見本画像(ローカルの汎用画像)は出さない
const ProductPhoto: React.FC<{ product: ProductCard; lead: boolean }> = ({ product, lead }) => (
  <FeedPic
    src={product.image && !isGenericLocalFallback(product.image) && !isNotPhoto(product.image) ? product.image : undefined}
    size={lead ? 'lead' : 'row'}
    className="yy-np-photo"
    cover={productCover(product)}
  />
);

function productCover(product: ProductCard) {
  const t = topicOf(product.title, product.category);
  return { label: `NEW · ${CATEGORY_LABEL[product.category] || '新製品'}`, word: product.source || '新製品', photo: topicPhoto(t, product.link || product.id), tag: `IMAGE · ${t.label}` };
}

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

/** 行の日付は月/日だけ(年は今年以外のときだけ付ける) */
function shortDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const md = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  return d.getFullYear() === new Date().getFullYear() ? md : `${d.getFullYear()}/${md}`;
}

const NewProducts: React.FC<NewProductsProps> = ({ onNavigateToRegistration }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  // 開いた製品は既読(灰色)にする。その端末だけに残る
  const { isRead, readProps } = useReadLinks();
  const [apiItems, setApiItems] = useState<ProductCard[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 新商品APIを初回マウントで取得
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 先に取ってあればその場で返る(src/lib/apiCache.ts。MainLayout が手の空いたときに取っておく)
        const json = await getJson<{ items?: ApiItem[] }>('/api/new-products/');
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
    // 以前は空の分類を見本(サンプル)で埋めていたが、本物と見分けにくいのでやめた。
    // 見本を出すのは API から 1 件も取れなかったときだけ(上の分岐)
    return grouped;
  }, [apiItems]);

  // サンプル(リンクの無い見本)を除いた、取得できた件数
  const realCount = (k: string) => (newProductCategories[k] || []).filter(p => !!p.link).length;
  const totalReal = CATEGORIES.reduce((n, [k]) => n + realCount(k), 0);

  // 配信元ごとの件数(多い順)
  const sourceCounts = useMemo(() => {
    const m = new Map<string, number>();
    (apiItems || []).forEach(p => {
      if (!CATEGORY_LABEL[p.category] || !p.source) return;
      m.set(p.source, (m.get(p.source) || 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [apiItems]);

  const showContactForm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onNavigateToRegistration) {
      onNavigateToRegistration();
    } else {
      alert('掲載希望フォームを表示します（実装予定）');
    }
  };

  const getCurrentProducts = (): ProductCard[] => {
    if (activeCategory === 'all') {
      // すべて = 新しい順(分類ごとに固めない)。分類できなかったもの(other)もここには出す
      if (apiItems && apiItems.length) {
        return [...apiItems].sort((a, b) => (Date.parse(b.pubDate || '') || 0) - (Date.parse(a.pubDate || '') || 0));
      }
      return Object.values(newProductCategories).flat();
    } else {
      return newProductCategories[activeCategory] || [];
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <p className="yy-np-loading">最新の新製品情報を取得中…</p>;
    }
    const products = getCurrentProducts();

    if (products.length === 0) {
      return <p className="yy-np-loading">該当する情報がありません。</p>;
    }

    // 馬目地: 1 枚のレンガが 1 製品(2026-11-14)。写真は左、配信元・日付・分類、製品名
    return (
      <BrickWall
        items={products}
        label="新製品"
        brick={290}
        className="yy-brick--card"
        keyOf={(p) => p.id}
        render={(product, { index }) => {
          const meta = (
            <span className="yy-bc__meta">
              <span className="yy-bc__no">{String(index + 1).padStart(2, '0')}</span>
              <span>{product.source || '—'}</span>
              <span>{shortDate(product.pubDate)}</span>
              {activeCategory === 'all' && <span>{CATEGORY_LABEL[product.category]}</span>}
            </span>
          );
          const inner = (
            <>
              <span className="yy-bc__pic">
                <ProductPhoto product={product} lead={false} />
              </span>
              <span className="yy-bc__body">
                <span className="yy-bc__title">{product.title}</span>
                {meta}
              </span>
            </>
          );
          return product.link ? (
            <a href={product.link} target="_blank" rel="noopener noreferrer" className={`yy-bc${isRead(product.link) ? ' is-read' : ''}`} title={product.title} {...readProps(product.link)}>
              {inner}
            </a>
          ) : (
            <span className="yy-bc">{inner}</span>
          );
        }}
      />
    );
  };

  return (
    <div>
      <PageHead
        no="04"
        en="new products"
        title="新製品"
        desc="外装・内装・設備から照明まで、各社の新製品を分類ごとに"
        right={
          <>
            <Stat n={isLoading ? '—' : totalReal} label="件" />
            <Stat n={isLoading ? '—' : sourceCounts.length} label="配信元" />
          </>
        }
      />
      <div id="new-product-navigation" className="yy-tabs">
        <button
          type="button"
          className="yy-tab"
          aria-pressed={activeCategory === 'all'}
          onClick={() => setActiveCategory('all')}
        >
          全カテゴリー
        </button>
        {CATEGORIES.map(([k, label]) => (
          <button
            key={k}
            type="button"
            className="yy-tab"
            aria-pressed={activeCategory === k}
            onClick={() => setActiveCategory(k)}
          >
            {label}
            {!isLoading && <small>{realCount(k)}</small>}
          </button>
        ))}
      </div>
      <div className="yy-np-page">
        <div className="yy-np-main">
          <section id="new-product-content-area">
            <div className="yy-sec">
              <span className="yy-sec__no">I</span>
              <span className="yy-sec__title">{activeCategory === 'all' ? '新製品' : CATEGORY_LABEL[activeCategory]}</span>
              <span className="yy-sec__right">メーカー各社の配信と業界紙から 3 時間ごとに集めて分類</span>
            </div>
            {renderContent()}
          </section>
        </div>
        <aside className="yy-np-side">
          <section>
            <div className="yy-sec"><span className="yy-sec__no">II</span><span className="yy-sec__title">分類ごとの件数</span><span className="yy-sec__right">{isLoading ? '' : `${totalReal} 件`}</span></div>
            <ol className="yy-np-toc">
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
                    <span className="yy-home__n">{isLoading ? '—' : realCount(k) || '—'}</span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="yy-np-note">提案アイデアや仕様検討の入り口に。各社の公式サイト・業界紙・リリース配信から 3 時間ごとに集めています。</p>
          </section>
          <section>
            <div className="yy-sec"><span className="yy-sec__no">III</span><span className="yy-sec__title">掲載希望</span></div>
            <div className="yy-gray">
              <span className="yy-gray__title">新製品を載せる</span>
              <span className="yy-gray__text">メーカー・販売店の新製品を、この一覧に掲載できます。</span>
              <button type="button" className="yy-btn" onClick={showContactForm}>掲載希望はコチラ</button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default NewProducts;
