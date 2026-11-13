'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { IconType } from 'react-icons';
import {
  FiAward, FiBook, FiBookOpen, FiBookmark, FiBox, FiBriefcase, FiCalendar, FiCompass, FiEdit3, FiExternalLink,
  FiFileText, FiFlag, FiFolder, FiGrid, FiHome, FiImage, FiInfo, FiLayers, FiMessageSquare, FiPackage, FiPenTool,
  FiShoppingBag, FiStar, FiUsers,
} from 'react-icons/fi';
import type { UserpageTarget } from '@/lib/userpageUrl';
import { useAuth } from '@/lib/AuthContext';
import { screenPath, screensInGroup } from '@/lib/siteScreens';
import { GENERAL_TOOL_MENU_IDS, INDEX_MENUS } from '@/lib/railMenu';
import { useForumUnread } from '@/lib/useForumUnread';
import VisitCounter from './VisitCounter';

interface SidebarProps {
  onItemClick?: () => void;
  /** 旧・建材ツリー用。左カラムから建材の小分類を出さなくなったので使っていない(MainLayout からは渡ってくる) */
  onPageChange?: (page: string) => void;
  onLogoClick?: () => void;
  /** 左カラムから画面を開く。MainLayout の handleMenuClick。 */
  onMenuClick?: (menuItem: string, target?: UserpageTarget) => void;
  /** いま中央に出ている画面。選択中の項目を緑にするために使う。 */
  activeContent?: string;
}

/**
 * 左カラム = 入口だけ(モック「高級感 3」の左カラム)。2026-11-13 に作り直した。
 *   01 見る / 02 使う / 03 つながる の 3 群。中身(建材の小分類・ツールの一覧)は中央カラムに出す。
 * 以前は Ⅰ〜Ⅵ のボタンで段を切り替え、各段にツールや建材ツリーを全部並べていた。
 *
 * 行の高さは 21px。24 行 + 群見出し 3 本が 1280×720 でアカウント行の上に収まる高さ。
 */
type Entry = {
  label: string;
  icon: IconType;
  /** URL を持つ画面 */
  href?: string;
  /** 左カラムから開く画面(handleMenuClick) */
  menu?: string;
  /** この入口を選択中にする条件 */
  active: (content: string, path: string) => boolean;
};

const MATERIAL_IDS = new Set([...screensInGroup('material').map((s) => s.id), 'makerconect', 'chatbot']);
const page = (id: string, label: string, icon: IconType): Entry => ({
  label,
  icon,
  href: `${screenPath(id)}/`,
  active: (c) => c === id,
});
const menu = (id: string, label: string, icon: IconType, active?: Entry['active']): Entry => ({
  label,
  icon,
  menu: id,
  active: active ?? ((c) => c === id),
});

const GROUPS: Array<{ no: string; label: string; items: Entry[] }> = [
  {
    no: '01',
    label: '見る',
    items: [
      { label: 'ホーム', icon: FiHome, href: '/', active: (c, p) => p === '/' && c === 'topix' },
      { label: '建材', icon: FiLayers, href: '/roof/', active: (c) => MATERIAL_IDS.has(c) },
      page('news', 'NEWS', FiFileText),
      page('new-products', '新製品', FiPackage),
      page('event', 'イベント', FiCalendar),
      page('regulations', '法規', FiBook),
      page('qualifications', '資格試験', FiAward),
      page('landscape-cad', '添景・CAD', FiImage),
      page('books-software', '書籍・ソフト', FiBookOpen),
      page('pickup', 'Pickup', FiStar),
      menu('design-info', '設計情報', FiInfo),
      menu('material-info', '材料情報', FiBox),
    ],
  },
  {
    no: '02',
    label: '使う',
    items: [
      { label: '物件カルテ', icon: FiBookmark, href: '/karte/', active: (_c, p) => p.startsWith('/karte') },
      menu(INDEX_MENUS.design, '設計ツール', FiPenTool, (c) => c === INDEX_MENUS.design || c === 'design-tools'),
      menu(INDEX_MENUS.general, '一般ツール', FiGrid, (c) => GENERAL_TOOL_MENU_IDS.has(c)),
      { label: '建築の調べもの', icon: FiCompass, href: '/lookup/', active: (_c, p) => p.startsWith('/lookup') || p.startsWith('/calc') },
      menu(INDEX_MENUS.external, '外部ツール', FiExternalLink),
    ],
  },
  {
    no: '03',
    label: 'つながる',
    items: [
      page('projects', 'プロジェクト', FiFolder),
      page('competitions', 'コンペ', FiFlag),
      page('construction-companies', '施工会社', FiUsers),
      page('design-offices', '設計事務所', FiEdit3),
      page('job-info', '求人情報', FiBriefcase),
      page('forum', '掲示板', FiMessageSquare),
      page('shop', 'Shop', FiShoppingBag),
    ],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ onItemClick, onLogoClick, onMenuClick, activeContent = '' }) => {
  const pathname = usePathname() || '/';
  const forumUnread = useForumUnread();
  const { isLoggedIn, currentUser, logout } = useAuth();

  return (
    <aside
      className="w-full md:w-[200px] lg:w-[180px] shrink-0 text-[14px] left-column"
      style={{ ['--rail-bg' as string]: '#121413', ['--rail-ac' as string]: '#52AA96' } as React.CSSProperties}
    >
      <div className="left-column__scroll">
        {/* ロゴ */}
        <div className="yy-rail__logo hidden lg:block">
          <Link href="/" className="block" onClick={() => onLogoClick?.()}>
            {/* 透過版。黒地が焼き込まれた旧ロゴは使わない */}
            <img src="/image/yaneyuka-logo-white.png" alt="yaneyuka" className="w-full max-w-[132px] h-auto" />
          </Link>
        </div>

        <nav className="yy-rail" aria-label="サイトの入口">
          {GROUPS.map((g) => (
            <div key={g.no} className="yy-rail__group">
              <div className="yy-rail__ghead">
                <span className="yy-rail__gno">{g.no}</span>
                <span>{g.label}</span>
              </div>
              {g.items.map((e) => {
                const on = e.active(activeContent, pathname.replace(/\/$/, '') || '/');
                const Icon = e.icon;
                const inner = (
                  <>
                    <Icon className="yy-rail__icon" aria-hidden="true" />
                    <span className="yy-rail__label">{e.label}</span>
                    {e.label === '掲示板' && forumUnread > 0 && (
                      <span className="yy-rail__badge" title={`未読の投稿が${forumUnread}件あります`}>
                        {forumUnread > 99 ? '99+' : forumUnread}
                      </span>
                    )}
                  </>
                );
                return e.href ? (
                  <Link
                    key={e.label}
                    href={e.href}
                    className="yy-rail__item"
                    aria-current={on ? 'page' : undefined}
                    onClick={() => {
                      if (e.href === '/') onLogoClick?.();
                      onItemClick?.();
                    }}
                  >
                    {inner}
                  </Link>
                ) : (
                  <button
                    key={e.label}
                    type="button"
                    className="yy-rail__item"
                    aria-current={on ? 'page' : undefined}
                    onClick={() => {
                      onMenuClick?.(e.menu!, { menu: e.menu! });
                      onItemClick?.();
                    }}
                  >
                    {inner}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>
      {/* left-column__scroll */}

      {/* フッター：アカウント行。lg 以上では viewport に固定される */}
      <div className="left-column__foot">
        <div className="left-column__account">
          {isLoggedIn ? (
            <>
              <span className="left-column__user">ようこそ、{currentUser?.username}さん</span>
              <div className="left-column__authrow">
                <button type="button" onClick={() => { onMenuClick?.('settings'); onItemClick?.(); }}>
                  ユーザー設定
                </button>
                <button type="button" onClick={() => { void logout(); }}>ログアウト</button>
              </div>
            </>
          ) : (
            <div className="left-column__authrow">
              <button type="button" onClick={() => { onMenuClick?.('register'); onItemClick?.(); }}>
                無料会員登録
              </button>
              <button type="button" onClick={() => { onMenuClick?.('login'); onItemClick?.(); }}>
                ログイン
              </button>
            </div>
          )}
          <button
            type="button"
            className="left-column__legal"
            onClick={() => { onMenuClick?.('privacy-policy'); onItemClick?.(); }}
          >
            プライバシーポリシー
          </button>
          {/* 訪問者数。数えるのは全員、表示は管理者だけ（VisitCounter.tsx） */}
          <VisitCounter />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
