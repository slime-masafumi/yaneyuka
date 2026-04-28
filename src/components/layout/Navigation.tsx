'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface NavigationProps {
  onMenuClick?: (menuItem: string) => void;
  activeItem?: string;
}

const BASE_WIDTH = 1280; // デザイン想定幅
const HORIZONTAL_SCROLL_BREAKPOINT = 1366; // iPad Pro (12.9インチ) まで横スクロール

const Navigation: React.FC<NavigationProps> = ({ onMenuClick, activeItem }) => {

  const router = useRouter();
  const pathname = usePathname();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [useHorizontalScroll, setUseHorizontalScroll] = useState(false);
  const [loadingMenuItem, setLoadingMenuItem] = useState<string | null>(null);
  const expectedRouteRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMenuClick = (menuItem: string) => {
    // 既存のタイムアウトをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setLoadingMenuItem(menuItem);
    
    const routeMap: Record<string, string> = {
      'event': '/event',
      'news': '/news',
      'new-products': '/new-products',
      'books-software': '/books-software',
      'pickup': '/pickup',
      'regulations': '/regulations',
      'qualifications': '/qualifications',
      'landscape-cad': '/landscape-cad',
      'shop': '/shop',
      'projects': '/projects',
      'competitions': '/competitions',
      'construction-companies': '/construction-companies',
      'design-offices': '/design-offices',
      'job-info': '/job-info',
      'public-works': '/public-works',
      'forum': '/forum',
    };
    
    const route = routeMap[menuItem];
    if (route) {
      expectedRouteRef.current = route;
      router.push(route);
      // タイムアウトはフォールバックとして残す（最大5秒）
      timeoutRef.current = setTimeout(() => {
        setLoadingMenuItem(null);
        expectedRouteRef.current = null;
        timeoutRef.current = null;
      }, 5000);
      return;
    }
    
    if (onMenuClick) {
      onMenuClick(menuItem);
      setLoadingMenuItem(null);
    }
  };

  // pathnameが変更されたらローディングを解除
  useEffect(() => {
    if (loadingMenuItem && expectedRouteRef.current) {
      const normalizedPathname = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
      const normalizedExpected = expectedRouteRef.current.endsWith('/') && expectedRouteRef.current !== '/' 
        ? expectedRouteRef.current.slice(0, -1) 
        : expectedRouteRef.current;
      
      if (normalizedPathname === normalizedExpected || normalizedPathname === expectedRouteRef.current) {
        // タイムアウトをクリア
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        // ページ読み込み完了を待つ（DOMContentLoaded + 少し余裕を持たせる）
        const checkPageLoaded = () => {
          if (document.readyState === 'complete') {
            // さらに少し待ってからローディングを解除（コンテンツのレンダリング完了を待つ）
            setTimeout(() => {
              setLoadingMenuItem(null);
              expectedRouteRef.current = null;
            }, 100);
          } else {
            const handleLoad = () => {
              setTimeout(() => {
                setLoadingMenuItem(null);
                expectedRouteRef.current = null;
              }, 100);
            };
            window.addEventListener('load', handleLoad, { once: true });
            return () => window.removeEventListener('load', handleLoad);
          }
        };
        
        checkPageLoaded();
      }
    }
  }, [pathname, loadingMenuItem]);

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth || BASE_WIDTH;
      // モバイル・タブレット（1024px未満）ではスケーリングせず横スクロール
      if (w < 1024) {
        setScale(1);
        setUseHorizontalScroll(true);
      } else if (w <= HORIZONTAL_SCROLL_BREAKPOINT) {
        setScale(1);
        setUseHorizontalScroll(true);
      } else {
        const s = Math.min(1, w / BASE_WIDTH);
        setScale(s);
        setUseHorizontalScroll(false);
      }
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const LoadingSpinner = () => (
    <svg 
      className="animate-spin h-3 w-3 ml-1 inline-block" 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  return (
    <>
      <nav style={{ backgroundColor: '#52AA96', position: 'relative', zIndex: 2147483647, overflow: 'visible', borderBottom: '5px solid #52AA96' }}>
        <div 
          className={`w-full px-4 h-full ${useHorizontalScroll ? 'overflow-x-auto' : ''}`} 
          ref={wrapRef}
          style={useHorizontalScroll ? { overflowX: 'auto', overflowY: 'visible', WebkitOverflowScrolling: 'touch' } : { overflowY: 'visible', overflowX: 'visible' }}
        >
          <div 
            className={`flex items-stretch h-full ${useHorizontalScroll ? 'justify-start flex-nowrap' : 'justify-center'}`} 
            style={useHorizontalScroll 
              ? { transform: 'scale(1)', transformOrigin: 'top left', width: 'auto', minWidth: '100%' }
              : { transform: `scale(${scale})`, transformOrigin: 'top left', width: `${100 / scale}%` }
            }
          >
            {/* メニュー項目群 */}
            {[
              { id: 'event', label: 'イベント情報' },
              { id: 'news', label: 'NEWS' },
              { id: 'new-products', label: '新製品' },
              { id: 'books-software', label: '書籍・ソフト' },
              { id: 'pickup', label: 'Pickup' },
              { id: 'regulations', label: '法規' },
              { id: 'qualifications', label: '資格試験' },
              { id: 'landscape-cad', label: '添景・CAD' },
              { id: 'shop', label: 'Shop' },
              { id: 'projects', label: 'プロジェクト' },
              { id: 'competitions', label: 'コンペ' },
              { id: 'construction-companies', label: '施工会社' },
              { id: 'design-offices', label: '設計事務所' },
              { id: 'job-info', label: '求人情報' },
              { id: 'forum', label: '掲示板' },
            ].map((item) => (
              <button 
                key={item.id}
                className={`nav-item h-full flex items-center justify-center${activeItem === item.id ? ' active' : ''}${loadingMenuItem === item.id ? ' loading' : ''}`}
                type="button"
                onClick={() => handleMenuClick(item.id)}
                disabled={loadingMenuItem === item.id}
              >
                {item.label}
                {loadingMenuItem === item.id && <LoadingSpinner />}
              </button>
            ))}
            {/* 右端：お問い合わせ・掲載希望 */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => handleMenuClick('feedback')}
                style={{ fontSize: '11px', color: '#6b7280', padding: '0 6px', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#1f2937'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#6b7280'; }}
              >
                お問い合わせ
              </button>
              <button
                type="button"
                onClick={() => handleMenuClick('registration')}
                style={{ fontSize: '11px', color: '#6b7280', padding: '0 6px', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#1f2937'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#6b7280'; }}
              >
                掲載希望
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navigation;
