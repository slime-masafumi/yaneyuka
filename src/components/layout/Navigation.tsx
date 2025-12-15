'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface NavigationProps {
  onMenuClick?: (menuItem: string) => void;
  activeItem?: string;
}

const BASE_WIDTH = 1280; // デザイン想定幅
const HORIZONTAL_SCROLL_BREAKPOINT = 1366; // iPad Pro (12.9インチ) まで横スクロール

const Navigation: React.FC<NavigationProps> = ({ onMenuClick, activeItem }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // ★ボタンの位置を特定するためのRefを追加
  const userPageBtnRef = useRef<HTMLButtonElement>(null);
  // ★メニューの表示位置を管理するStateを追加
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [useHorizontalScroll, setUseHorizontalScroll] = useState(false);
  const [loadingMenuItem, setLoadingMenuItem] = useState<string | null>(null);

  const handleMenuClick = (menuItem: string) => {
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
      router.push(route);
      setTimeout(() => {
        setLoadingMenuItem(null);
      }, 2000);
      return;
    }
    
    if (onMenuClick) {
      onMenuClick(menuItem);
      setLoadingMenuItem(null);
    }
  };

  const toggleDropdown = () => {
    // ★開く瞬間にボタンの位置を計算してセット
    if (!isDropdownOpen && userPageBtnRef.current) {
      const rect = userPageBtnRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom,
        left: rect.left
      });
    }
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleDropdownItemClick = (menuItem: string) => {
    setIsDropdownOpen(false);
    if (onMenuClick) {
      onMenuClick(menuItem);
    }
  };

  // クリック外またはスクロールで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // ドロップダウンまたはボタン以外をクリックしたら閉じる
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        userPageBtnRef.current && 
        !userPageBtnRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    // ★スクロールしたらメニューを閉じる（Fixed配置のズレ防止）
    const handleScroll = () => {
      if (isDropdownOpen) setIsDropdownOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth || BASE_WIDTH;
      const s = Math.min(1, w / BASE_WIDTH);
      setScale(s);
      
      if (w <= HORIZONTAL_SCROLL_BREAKPOINT) {
        setUseHorizontalScroll(true);
        if (wrapRef.current) wrapRef.current.style.height = '40px';
      } else {
        setUseHorizontalScroll(false);
        if (wrapRef.current) wrapRef.current.style.height = `${40 * s}px`;
      }
      // リサイズ時は閉じる
      setIsDropdownOpen(false);
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
      <nav style={{ backgroundColor: '#1dad95', height: wrapRef.current?.style.height || '40px', minHeight: wrapRef.current?.style.height || '40px', position: 'relative', zIndex: 2147483647, overflow: 'visible' }}>
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
              { id: 'new-products', label: '新商品' },
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
            
            {/* Userpage ドロップダウンボタン */}
            <div className="hidden lg:block relative h-full" style={{ overflow: 'visible' }}>
              <button
                ref={userPageBtnRef} // ★Refを設定
                onClick={toggleDropdown}
                className="nav-item h-full flex items-center justify-center gap-1"
              >
                Userpage
                <svg
                  className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ★ドロップダウンメニューをnavの外に出し、fixedで配置 */}
      {isDropdownOpen && (
        <div 
          ref={dropdownRef}
          className="fixed bg-white rounded-md shadow-lg border animate-in fade-in zoom-in-95 duration-100"
          style={{ 
            zIndex: 2147483650,
            top: `${menuPos.top + 4}px`, // ボタンの下に表示
            left: `${menuPos.left}px`,   // ボタンの左端に合わせる
            width: '12rem',              // w-48相当
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto'
          }}
        >
          <div className="py-1">
            <button className="block w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => handleDropdownItemClick('yymail')}>yymail</button>
            <button className="block w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => handleDropdownItemClick('yychat')}>yychat</button>
            <button className="block w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => handleDropdownItemClick('my-calendar')}>Myカレンダー</button>
            <button className="block w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => handleDropdownItemClick('my-regulations')}>My法規</button>
            <button className="block w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => handleDropdownItemClick('my-tasks')}>Myタスク</button>
            <button className="block w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => handleDropdownItemClick('team-tasks')}>Teamタスク</button>
            <button className="block w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => handleDropdownItemClick('general-tools')}>一般ツール</button>
            <button className="block w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => handleDropdownItemClick('design-tools')}>設計ツール</button>
            <button className="block w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => handleDropdownItemClick('design-info')}>設計情報</button>
            <button className="block w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => handleDropdownItemClick('material-info')}>材料情報</button>
            <button className="block w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => handleDropdownItemClick('contacts')}>担当連絡先</button>
            <button className="block w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => handleDropdownItemClick('settings')}>ユーザー設定</button>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;
