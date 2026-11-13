'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useForumUnread, markForumSeen } from '@/lib/useForumUnread';
import NotificationBell from './NotificationBell';
import TopBar from './TopBar';
import AfterMount from '../AfterMount';
import { INFO_SCREEN_TO_PATH, TOP_NAV_SCREENS } from '@/lib/siteScreens';
import type { UserpageTarget } from '@/lib/userpageUrl';

interface NavigationProps {
  onMenuClick?: (menuItem: string, target?: UserpageTarget) => void;
  activeItem?: string;
}

/**
 * 上部の濃い緑の帯。
 *   lg 以上 … 戻る / パンくず / 検索 / 通知・お問い合わせ・掲載希望(TopBar.tsx)。
 *             情報ページ 15 本は左カラムの Ⅰ「情報」から開く。
 *   lg 未満 … 左カラムが出ないので、従来どおり 15 本を横スクロールで並べる。
 */
const Navigation: React.FC<NavigationProps> = ({ onMenuClick, activeItem }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [loadingMenuItem, setLoadingMenuItem] = useState<string | null>(null);
  const forumUnread = useForumUnread();
  const expectedRouteRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMenuClick = (menuItem: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const route = INFO_SCREEN_TO_PATH[menuItem];
    if (route) {
      setLoadingMenuItem(menuItem);
      expectedRouteRef.current = route;
      router.push(route);
      // 遷移が終わらなかったときの保険(最大 5 秒)
      timeoutRef.current = setTimeout(() => {
        setLoadingMenuItem(null);
        expectedRouteRef.current = null;
        timeoutRef.current = null;
      }, 5000);
      return;
    }
    onMenuClick?.(menuItem);
  };

  // 目的のパスに着いたらローディングを解除
  useEffect(() => {
    if (!loadingMenuItem || !expectedRouteRef.current) return;
    const strip = (p: string) => (p.endsWith('/') && p !== '/' ? p.slice(0, -1) : p);
    if (strip(pathname) !== strip(expectedRouteRef.current)) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const done = () =>
      setTimeout(() => {
        setLoadingMenuItem(null);
        expectedRouteRef.current = null;
      }, 100);
    if (document.readyState === 'complete') done();
    else window.addEventListener('load', done, { once: true });
  }, [pathname, loadingMenuItem]);

  // 掲示板を開いたら既読にする。バッジは次の新規投稿から再び出る。
  useEffect(() => {
    if (pathname?.startsWith('/forum')) markForumSeen();
  }, [pathname]);

  const LoadingSpinner = () => (
    <svg className="animate-spin h-3 w-3 ml-1 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  const rightLinks = (
    <div className="yy-topnav__right">
      <NotificationBell />
      <button type="button" onClick={() => handleMenuClick('feedback')}>お問い合わせ</button>
      <button type="button" onClick={() => handleMenuClick('registration')}>掲載希望</button>
    </div>
  );

  return (
    <nav className="yy-topnav" style={{ backgroundColor: 'var(--yy-deep)', position: 'relative', zIndex: 2147483647, overflow: 'visible' }}>
      {/* lg 以上：戻る / パンくず / 検索 */}
      <div className="yy-topbar hidden lg:flex">
        <AfterMount fallback={<div className="yy-topbar__inner" />}>
          <TopBar activeItem={activeItem} onMenuClick={onMenuClick} />
        </AfterMount>
      </div>

      {/* lg 未満：情報ページ 15 本を横スクロールで */}
      <div className="lg:hidden flex-1 min-w-0 h-full overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex items-stretch h-full justify-start flex-nowrap" style={{ minWidth: '100%', width: 'max-content' }}>
          {TOP_NAV_SCREENS.map((item) => (
            <button
              key={item.id}
              className={`nav-item h-full flex items-center justify-center${activeItem === item.id ? ' active' : ''}${loadingMenuItem === item.id ? ' loading' : ''}`}
              type="button"
              onClick={() => handleMenuClick(item.id)}
              disabled={loadingMenuItem === item.id}
            >
              {item.label}
              {item.id === 'forum' && forumUnread > 0 && (
                <span
                  className="ml-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white"
                  title={`未読の投稿が${forumUnread}件あります`}
                >
                  {forumUnread > 99 ? '99+' : forumUnread}
                </span>
              )}
              {loadingMenuItem === item.id && <LoadingSpinner />}
            </button>
          ))}
        </div>
      </div>

      {/* 右端：通知・お問い合わせ・掲載希望（どの幅でも 1 つだけ描く） */}
      {rightLinks}
    </nav>
  );
};

export default Navigation;
