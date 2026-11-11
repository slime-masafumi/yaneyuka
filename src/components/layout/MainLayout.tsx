'use client';

import React, { useState, useEffect, startTransition, useCallback, useRef, lazy, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Navigation from './Navigation';
import UserpageBottomBar from './UserpageBottomBar';
import RelatedPrivacyLinks from '../RelatedPrivacyLinks';
import AfterMount from '../AfterMount';
import { isPrivacyPolicyPath } from '@/lib/legalPages';
import { CATEGORY_ROUTES, EXTERIOR_FINISH_SUBCATEGORIES, findCategoryBySubcategory } from '@/lib/materialCategories';
import {
  USERPAGE_MENUS,
  isUserpageMenu as isUserpageMenuId,
  isGeneralToolScreen,
  buildUserpageQuery,
  parseUserpageQuery,
  type UserpageTarget,
} from '@/lib/userpageUrl';
import { requestGeneralTool, type GeneralToolId } from '@/lib/generalToolsMenu';
import { requestDesignToolsTarget } from '@/lib/designToolsNav';
import ReferenceResources from '../content/ReferenceResources';
import Settings from '../content/Userpage/Settings';
import Sidebar from './Sidebar';
import Breadcrumbs from './Breadcrumbs';
import { INFO_SCREEN_TO_PATH, PATH_TO_SCREEN, SCREEN_TO_PATH } from '@/lib/siteScreens';
import EventsWithBookmarks from '../content/events/EventsWithBookmarks';
import NewProducts from '../content/NewProducts';
import BooksSoftware from '../content/BooksSoftware';
import LawsRegulations from '../content/LawsRegulations';
import LandscapeCAD from '../content/LandscapeCAD';
import Projects from '../content/Projects';
import Competitions from '../content/Competitions';
import ConstructionCompanies from '../content/ConstructionCompanies';
import DesignOffices from '../content/DesignOffices';
import JobInfo from '../content/JobInfo';
import Chatbot from '../content/leftcolumn-menu/Chatbot';
import NewsWithBookmarks from '../content/news/NewsWithBookmarks';
import RegistrationForm from '../content/RegistrationForm';
import FeedbackForm from '../content/FeedbackForm';
import RegisterForm from '../content/RegisterForm';
import LoginForm from '../content/LoginForm';
import WelcomePage from '../content/WelcomePage';
import MyCalendar from '../content/Userpage/MyCalendar';
import YyMail from '../content/Userpage/YyMail';
import YyChat from '../content/Userpage/YyChat';
import MyRegulations from '../content/Userpage/MyRegulations';
import MyTasks from '../content/Userpage/MyTasks';
import TeamTasks from '../content/Userpage/TeamTasks';
// 重い外部ライブラリを抱える画面は、開かれたときに初めて読み込む。
// MainLayout は全ページ共通の土台なので、ここで静的 import すると
// トップページを開いただけで Excel / PDF 系のライブラリまで配信されてしまう
// （実測 561KB、初期 JS の 53%）。Userpage_top.tsx は元から lazy にしてある。
const GeneralTools = lazy(() => import('../content/Userpage/general-tools/GeneralTools'));
import ContactsManagement from '../content/Userpage/ContactsManagement';
import DesignTools from '../content/Userpage/DesignTools';
import DesignInfo from '../content/Userpage/DesignInfo';
import MaterialInfo from '../content/Userpage/MaterialInfo';
import Userpage_top from '../content/Userpage/Userpage_top';
import Qualifications from '../content/Qualifications';
const QualificationsVideos = lazy(() => import('../content/QualificationsVideos'));
import UserpageMusicPanel from '../content/Userpage/UserpageMusicPanel';
import ShopContent from '../content/ShopContent';
import Forum from '../content/Forum';
import MakerConect from '../content/leftcolumn-menu/makerconect';
import PrivacyPolicy from '../content/PrivacyPolicy';
import Pickup from '../content/Pickup';
import Mak1Roof from '../content/leftcolumn-menu/mak_1_屋根';
import Mak2ExteriorWall from '../content/leftcolumn-menu/mak_2_外壁';
import Mak3Opening from '../content/leftcolumn-menu/mak_3_開口部';
import Mak5ExternalFloor from '../content/leftcolumn-menu/mak_5_外部床';
import Mak6ExteriorOther from '../content/leftcolumn-menu/mak_6_外部その他';
import Mak7InternalFloor from '../content/leftcolumn-menu/mak_7_内部床';
import Mak8InternalWall from '../content/leftcolumn-menu/mak_8_内装壁材';
import Mak9InternalCeiling from '../content/leftcolumn-menu/mak_9_内装天井材';
import Mak10InternalOther from '../content/leftcolumn-menu/mak_10_内装その他';
import Mak11Waterproof from '../content/leftcolumn-menu/mak_11_防水';
import Mak12Hardware from '../content/leftcolumn-menu/mak_12_金物';
import Mak13Furniture from '../content/leftcolumn-menu/mak_13_ファニチャー';
import Mak14ElectricalSystems from '../content/leftcolumn-menu/mak_14_電気設備';
import Mak15MechanicalSystems from '../content/leftcolumn-menu/mak_15_機械設備';
import Mak16ExteriorInfrastructure from '../content/leftcolumn-menu/mak_16_外構';
import Mak17Exterior from '../content/leftcolumn-menu/mak_17_エクステリア';
import { AuthProvider, useAuth } from '../../lib/AuthContext';
import CookieConsent from './CookieConsent';
import { db, logEvent } from '../../lib/firebaseClient';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface MainLayoutProps {
  children?: React.ReactNode;
  initialContent?: string;
}

/** lazy 読み込み中のつなぎ表示。切り替え時に高さが潰れないよう最低限の余白を持たせる。 */
const ToolLoading = () => (
  <div className="flex items-center justify-center py-16 text-sm text-gray-500">
    読み込み中...
  </div>
);

/** URL パスと、中央カラムに出す画面の対応（定義は画面台帳 src/lib/siteScreens.ts） */
const PATH_TO_CONTENT = PATH_TO_SCREEN;

/**
 * パスが同じままクエリだけ変わった遷移（/roof?subcategory=a → b）を拾う。
 * useSearchParams をサーバーで呼ぶとページがクライアント描画に落ち、配信 HTML から
 * 本文が消えるので、この部品は必ず AfterMount の中に置く。
 */
const SearchParamsWatcher: React.FC<{ onChange: (pathname: string) => void }> = ({ onChange }) => {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    onChange(pathname);
  }, [pathname, search, onChange]);
  return null;
};

const MainLayout: React.FC<MainLayoutProps> = ({ children, initialContent = 'topix' }) => {
  const pathname = usePathname();
  const router = useRouter();

  // URLパスからactiveContentを決定
  // ブラウザ更新時は常にトップページに戻る
  const getInitialContent = () => {
    // トップページ（/）の場合はinitialContentを使用、それ以外は常に'topix'を返す
    const normalizedPathname = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
    return normalizedPathname === '/' ? initialContent : 'topix';
  };
  
  // 中央カラムを全面に使う画面。余白と角丸を外して、ナビ直下・左右いっぱいに広げる。
  // 左カラム Ⅲ（一般ツール）から開くものはすべてこの扱いに揃える。
  const FLUSH_CONTENTS = [
    'general-tools',
    'yymail',
    'yychat',
    'my-calendar',
    'my-tasks',
    'team-tasks',
    'my-regulations',
    'contacts',
  ];

  const [activeContent, setActiveContent] = useState<string>(getInitialContent());
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  /**
   * URL が指している画面を開く。ツールの指定は、画面が組み立てられる前に
   * 置いておく必要があるので、setActiveContent より先に渡す。
   */
  const applyUserpageTarget = useCallback((target: UserpageTarget) => {
    if (target.menu === 'general-tools' && target.tool) {
      requestGeneralTool({ toolId: target.tool as GeneralToolId });
    }
    if (target.menu === 'design-tools' && target.category) {
      requestDesignToolsTarget({ categoryId: target.category, subTabId: target.sub });
    }
    setActiveContent(target.menu);
    activeContentRef.current = target.menu;
  }, []);

  // 開いた直後の復元。?m= が付いた URL で入ってきたらその画面を出す。
  // useSearchParams は使わない（サーバーで呼ぶとページ全体がクライアント描画に
  // 落ちて配信 HTML から本文が消えるため）。window から直接読む。
  useEffect(() => {
    const target = parseUserpageQuery(window.location.search);
    if (target) applyUserpageTarget(target);
    // 初回だけ。以降は handleMenuClick と popstate が面倒を見る。
  }, [applyUserpageTarget]);

  // lg 以上では中央カラムだけがスクロールするので、表示を切り替えたときに
  // 前の画面のスクロール位置が残る。ページ全体がスクロールしていた頃は
  // ブラウザが勝手に詰めていた分を、ここで明示的に戻す。
  useEffect(() => {
    document.getElementById('yy-main-scroll')?.scrollTo({ top: 0 });
  }, [activeContent]);
  const previousContentRef = useRef<string>('');
  const isPopStateHandlingRef = useRef<boolean>(false);
  const activeContentRef = useRef<string>(getInitialContent());
  const handleSubcategoryClickRef = useRef<(subcategory: string) => void>(() => {});
  const handleMenuClickRef = useRef<(menuItem: string) => void>(() => {});

  // activeContentが変更されたらrefも更新
  useEffect(() => {
    activeContentRef.current = activeContent;
  }, [activeContent]);

  // pathnameが変更されたときにactiveContentを更新
  // ただし、popstateイベントの処理中は更新しない
  // userpageMenusのメニューが表示されている場合は、pathnameが変更されてもactiveContentを保持
  // 注意: URLルートがあるページ（/shop, /electrical-systemsなど）への遷移時は
  //       下のpathToContentMapベースのuseEffectで正しくactiveContentが設定されるため、ここではスキップする
  useEffect(() => {
    if (isPopStateHandlingRef.current) {
      isPopStateHandlingRef.current = false;
      return;
    }

    // userpageMenusのメニューが表示されている場合は、pathnameが変更されてもactiveContentを保持
    // activeContentRefを使用して、最新の値を参照する（依存配列に含めないことで無限ループを防ぐ）
    const userpageMenus = USERPAGE_MENUS as readonly string[];
    if (userpageMenus.includes(activeContentRef.current)) {
      return;
    }

    const normalizedPathname = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;

    // SPA的に管理されるページ（URL=/のままactiveContentで切替）はURLが/のままなら保持
    // ただしURLが/から離れた場合は実ルート遷移なのでactiveContentをリセットしてchildrenを描画させる
    const spaPages = ['chatbot', 'makerconect', 'registration', 'feedback', 'register', 'login', 'welcome', 'privacy-policy', 'topix'];
    if (spaPages.includes(activeContentRef.current)) {
      if (normalizedPathname === '/') {
        return;
      }
      // URLが/以外に変わった → SPA状態を解除（'topix'にすれば renderContent は children を返す）
      setActiveContent('topix');
      return;
    }

    // URLルートがあるページへの遷移時は、pathToContentMapベースのuseEffectに任せる
    if (normalizedPathname in PATH_TO_SCREEN) {
      return;
    }

    const newContent = normalizedPathname === '/' ? initialContent : 'topix';
    if (activeContentRef.current !== newContent) {
      setActiveContent(newContent);
    }
  }, [pathname, initialContent]);

  // ブラウザの戻るボタンやマウスの戻るボタンが押された場合の処理
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const userpageMenus = USERPAGE_MENUS as readonly string[];

      // 戻った先の URL が画面を指しているなら、それをそのまま開く。
      // state だけを見ていた頃は、履歴を2つ戻ると URL と画面がずれていた。
      const fromUrl = parseUserpageQuery(window.location.search);
      if (fromUrl) {
        isPopStateHandlingRef.current = true;
        applyUserpageTarget(fromUrl);
        return;
      }

      // 現在のactiveContentをrefから取得（最新の状態を確実に取得）
      const currentContent = activeContentRef.current;
      
      // event.stateから前のコンテンツを取得
      const state = event.state as { content?: string; previousContent?: string; fromUserpageTop?: boolean } | null;
      const previousContent = state?.previousContent || previousContentRef.current;
      const fromUserpageTop = state?.fromUserpageTop || false;
      
      console.log('[popstate] currentContent:', currentContent, 'previousContent:', previousContent, 'fromUserpageTop:', fromUserpageTop, 'state:', state);
      
      // 現在のactiveContentがUserpageのツールの場合
      if (userpageMenus.includes(currentContent)) {
        // Userpage_topから来た場合、userpage-topに遷移
        if (fromUserpageTop || previousContent === 'userpage-top') {
          console.log('[popstate] Redirecting to userpage-top from currentContent check');
          // popstateイベントの処理中であることを示すフラグを設定
          isPopStateHandlingRef.current = true;
          setActiveContent('userpage-top');
          // 履歴を更新（戻るボタンで再度戻れるように）
          try {
            window.history.replaceState({ content: 'userpage-top', fromUserpageTop: false }, '', window.location.pathname);
          } catch (e) {
            console.warn('Failed to replace state:', e);
          }
          return;
        }
      }
      // Userpage_topから来た場合で、Userpageのツールから戻る場合、userpage-topに遷移（フォールバック）
      if (fromUserpageTop && userpageMenus.includes(previousContent)) {
        console.log('[popstate] Fallback: Redirecting to userpage-top');
        // popstateイベントの処理中であることを示すフラグを設定
        isPopStateHandlingRef.current = true;
        setActiveContent('userpage-top');
        // 履歴を更新（戻るボタンで再度戻れるように）
        try {
          window.history.replaceState({ content: 'userpage-top', fromUserpageTop: false }, '', window.location.pathname);
        } catch (e) {
          console.warn('Failed to replace state:', e);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [applyUserpageTarget]);
  const { isLoggedIn, currentUser, authReady } = useAuth();
  const [totalUnreadCount, setTotalUnreadCount] = useState<number>(0);
  
  // 未読カウントを取得（相手から送られたメッセージの未読のみ）
  useEffect(() => {
    if (!currentUser) {
      setTotalUnreadCount(0);
      return;
    }

    const roomsRef = collection(db, 'chatRooms');
    const roomsQuery = query(roomsRef, where('participants', 'array-contains', currentUser.uid));
    
    const unsubscribe = onSnapshot(
      roomsQuery,
      (snapshot) => {
        let total = 0;
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          // unreadCountは既に相手から送られたメッセージの未読カウントとして計算されている
          const unreadCount = data.unreadCount?.[currentUser.uid] || 0;
          total += unreadCount;
        });
        setTotalUnreadCount(total);
      },
      (error) => {
        console.error('[MainLayout] 未読カウント取得エラー:', error);
        setTotalUnreadCount(0);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);
  
  // クエリパラメータからサブカテゴリーを設定するヘルパー関数
  const handleSubcategoryFromQuery = useCallback((content: string, subcategory: string) => {
    // まず全てのサブカテゴリーをリセット
    setRoofSubcategory('');
    setExteriorWallSubcategory('');
    setOpeningSubcategory('');
    setExternalFloorSubcategory('');
    setExteriorOtherSubcategory('');
    setInternalFloorSubcategory('');
    setInternalWallSubcategory('');
    setInternalCeilingSubcategory('');
    setInternalOtherSubcategory('');
    setWaterproofSubcategory('');
    setHardwareSubcategory('');
    setFurnitureSubcategory('');
    setElectricalSystemsSubcategory('');
    setMechanicalSystemsSubcategory('');
    setExteriorInfrastructureSubcategory('');
    setExteriorSubcategory('');
    
    // 各カテゴリーに応じて適切なサブカテゴリーステートを更新
    switch (content) {
      case 'roof':
        setRoofSubcategory(subcategory);
        break;
      case 'exterior-wall':
        setExteriorWallSubcategory(subcategory);
        break;
      case 'opening':
        setOpeningSubcategory(subcategory);
        break;
      case 'external-floor':
        setExternalFloorSubcategory(subcategory);
        break;
      case 'exterior-other':
        setExteriorOtherSubcategory(subcategory);
        break;
      case 'internal-floor':
        setInternalFloorSubcategory(subcategory);
        break;
      case 'internal-wall':
        setInternalWallSubcategory(subcategory);
        break;
      case 'internal-ceiling':
        setInternalCeilingSubcategory(subcategory);
        break;
      case 'internal-other':
        setInternalOtherSubcategory(subcategory);
        break;
      case 'waterproof':
        setWaterproofSubcategory(subcategory);
        break;
      case 'hardware':
        setHardwareSubcategory(subcategory);
        break;
      case 'furniture':
        setFurnitureSubcategory(subcategory);
        break;
      case 'electrical-systems':
        setElectricalSystemsSubcategory(subcategory);
        break;
      case 'mechanical-systems':
        setMechanicalSystemsSubcategory(subcategory);
        break;
      case 'exterior-infrastructure':
        setExteriorInfrastructureSubcategory(subcategory);
        break;
      case 'exterior':
        setExteriorSubcategory(subcategory);
        break;
    }
  }, []);
  
  // URLパスとクエリパラメータが変更された時にactiveContentとサブカテゴリーを更新
  // pathname === '/'の場合は、handleMenuClickで管理されるため、ここでは何もしない
  // URLベースのルーティングがないページでは、activeContentはhandleMenuClickで管理される（SPA的な動作を維持）
  const applyRouteFromUrl = useCallback((currentPath: string) => {
    // trailingSlash: trueの設定により、pathnameは末尾にスラッシュが付く可能性があるため、正規化する
    const normalizedPathname = currentPath.endsWith('/') && currentPath !== '/' ? currentPath.slice(0, -1) : currentPath;
    const content = PATH_TO_CONTENT[normalizedPathname];
    if (!content) return;
    setActiveContent(content);

    const subcategory = new URLSearchParams(window.location.search).get('subcategory');
    if (subcategory) {
      handleSubcategoryFromQuery(content, subcategory);
    }
  }, [handleSubcategoryFromQuery]);

  // パスの変化はここで受ける（クエリだけの変化は SearchParamsWatcher）。
  // 上の pathname の useEffect より後に走らせて、そちらの 'topix' 戻しを上書きする順序を保つ。
  useEffect(() => {
    applyRouteFromUrl(pathname);
  }, [pathname, applyRouteFromUrl]);
  const [roofSubcategory, setRoofSubcategory] = useState<string>('');
  const [exteriorWallSubcategory, setExteriorWallSubcategory] = useState<string>('');
  const [openingSubcategory, setOpeningSubcategory] = useState<string>('');
  const [externalFloorSubcategory, setExternalFloorSubcategory] = useState<string>('');
  const [exteriorOtherSubcategory, setExteriorOtherSubcategory] = useState<string>('');
  const [internalFloorSubcategory, setInternalFloorSubcategory] = useState<string>('');
  const [internalWallSubcategory, setInternalWallSubcategory] = useState<string>('');
  const [internalCeilingSubcategory, setInternalCeilingSubcategory] = useState<string>('');
  const [internalOtherSubcategory, setInternalOtherSubcategory] = useState<string>('');
  const [waterproofSubcategory, setWaterproofSubcategory] = useState<string>('');
  const [hardwareSubcategory, setHardwareSubcategory] = useState<string>('');
  const [furnitureSubcategory, setFurnitureSubcategory] = useState<string>('');
  const [electricalSystemsSubcategory, setElectricalSystemsSubcategory] = useState<string>('');
  const [mechanicalSystemsSubcategory, setMechanicalSystemsSubcategory] = useState<string>('');
  const [exteriorInfrastructureSubcategory, setExteriorInfrastructureSubcategory] = useState<string>('');
  const [exteriorSubcategory, setExteriorSubcategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  // ★修正: ハイドレーションエラー対策
  // 初期値は必ず false にして、useEffect でクライアントのみ設定を読み込む
  const getStorageKey = () => isLoggedIn && currentUser ? `darkMode_${currentUser.uid}` : 'darkMode_guest';
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // マウント後に設定を読み込む
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const key = getStorageKey();
      const saved = localStorage.getItem(key);
      if (saved === 'true') {
        setIsDarkMode(true);
      } else {
        setIsDarkMode(false);
      }
    } catch {}
  }, [isLoggedIn, currentUser?.uid]);

  // 設定変更時に保存
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const key = getStorageKey();
      localStorage.setItem(key, String(isDarkMode));
    } catch {}
  }, [isDarkMode, isLoggedIn, currentUser?.uid]);
  

  const handleMenuClick = (menuItem: string, target?: UserpageTarget) => {
    console.log('Menu clicked:', menuItem);
    
    // URLベースのルーティングを使用するメニューは、Navigation.tsxで処理される
    const routeMap = SCREEN_TO_PATH;
    
    if (routeMap[menuItem]) {
      // URLベースのルーティングがあるメニューでもactiveContentを更新
      const currentContent = activeContent;
      setActiveContent(menuItem);
      activeContentRef.current = menuItem;

      // URLベースのルーティングがあるページから、URLベースのルーティングがないメニューをクリックした時は/に戻す
      const currentRoute = Object.keys(routeMap).find(key => routeMap[key] === pathname);
      if (currentRoute) {
        startTransition(() => {
          router.replace('/');
        });
      }

      // 全てのサブカテゴリーをリセット
      setRoofSubcategory('');
      setExteriorWallSubcategory('');
      setOpeningSubcategory('');
      setExternalFloorSubcategory('');
      setExteriorOtherSubcategory('');
      setInternalFloorSubcategory('');
      setInternalWallSubcategory('');
      setInternalCeilingSubcategory('');
      setInternalOtherSubcategory('');
      setWaterproofSubcategory('');
      setHardwareSubcategory('');
      setFurnitureSubcategory('');
      setElectricalSystemsSubcategory('');
      setMechanicalSystemsSubcategory('');
      setExteriorInfrastructureSubcategory('');
      setExteriorSubcategory('');
      setSelectedSubcategory('');

      return;
    }
    
    // Userpageのツールに遷移する場合、履歴を追加
    const isUserpage = isUserpageMenuId(menuItem);

    // activeContentを先に更新（白フラッシュを防ぐため）
    const currentContent = activeContent;
    setActiveContent(menuItem);
    activeContentRef.current = menuItem; // refも即座に更新（pathname変更useEffectとの競合を防ぐ）

    if (isUserpage) {
      // 現在のactiveContentを保存
      previousContentRef.current = currentContent;
      // Userpage_topから来たかどうかを記録
      const fromUserpageTop = currentContent === 'userpage-top';
      // 履歴に追加。どの画面を開いたかを URL に載せるので、
      // 再読み込み・共有・戻るのどれでも同じ画面に戻れる。
      try {
        const query = buildUserpageQuery(target ?? { menu: menuItem });
        window.history.pushState(
          { content: menuItem, previousContent: currentContent, fromUserpageTop },
          '',
          `/${query}`
        );
      } catch (e) {
        console.warn('Failed to push state:', e);
      }
      // URLベースのページにいる場合、pathnameをブラウザ上で/に変更するが
      // router.replaceは使わない（useEffectによるactiveContent上書きを防ぐ）
      return;
    } else {
      // URLベースのルーティングがあるページから、URLベースのルーティングがないメニューをクリックした時は/に戻す
      const currentRoute = Object.keys(routeMap).find(key => routeMap[key] === pathname);
      if (currentRoute) {
        startTransition(() => {
          router.replace('/');
        });
      }
    }
    
    // 全てのサブカテゴリーをリセット
    setRoofSubcategory('');
    setExteriorWallSubcategory('');
    setOpeningSubcategory('');
    setExternalFloorSubcategory('');
    setExteriorOtherSubcategory('');
    setInternalFloorSubcategory('');
    setInternalWallSubcategory('');
    setInternalCeilingSubcategory('');
    setInternalOtherSubcategory('');
    setWaterproofSubcategory('');
    setHardwareSubcategory('');
    setFurnitureSubcategory('');
    setElectricalSystemsSubcategory('');
    setMechanicalSystemsSubcategory('');
    setExteriorInfrastructureSubcategory('');
    setExteriorSubcategory('');
    setSelectedSubcategory('');
    
    // ツールページの初期化処理
    if (menuItem === 'general-tools') {
      // カードアニメーションの初期化
      setTimeout(() => {
        const cards = document.querySelectorAll('.card');
        cards.forEach((card, index) => {
          setTimeout(() => {
            card.classList.add('active');
          }, index * 100);
        });
      }, 100);
    }
  };

  // refを常に最新のハンドラで更新（documentレベルのイベントハンドラから参照するため）
  handleMenuClickRef.current = handleMenuClick;

  // Userpage_topからのカスタムイベントをリッスン（handleMenuClickの定義後に配置）
  // refを経由することでstale closure問題を回避する
  useEffect(() => {
    const handleUserpageMenuClick = (event: CustomEvent) => {
      const menuId = event.detail?.menuId;
      if (menuId) {
        handleMenuClickRef.current(menuId);
      }
    };

    window.addEventListener('userpage-menu-click', handleUserpageMenuClick as EventListener);

    const handleNavigateEvent = (event: CustomEvent) => {
      const page = event.detail;
      if (page) handleMenuClickRef.current(page);
    };
    window.addEventListener('yaneyuka-navigate', handleNavigateEvent as EventListener);

    return () => {
      window.removeEventListener('userpage-menu-click', handleUserpageMenuClick as EventListener);
      window.removeEventListener('yaneyuka-navigate', handleNavigateEvent as EventListener);
    };
  }, []);

  // ブラウザの戻るボタン押下時は「ページ離脱」させず、中央カラムをトップ表示に戻す
  useEffect(() => {
    if (typeof window === 'undefined' || typeof history === 'undefined') {
      return;
    }
    
    try {
      // 現在のURLで履歴を1つ積み、戻る操作を同一ページ内に留める
      history.pushState({ page: 'in-app' }, '', window.location.href);
    } catch (error) {
      console.warn('Failed to push history state:', error);
    }

    const onPopState = (e: PopStateEvent) => {
      // 戻った先が左カラムの画面を指しているなら、上の popstate が復元するので
      // ここは何もしない。無条件に topix へ戻していたため、左カラムの中で
      // 戻ろうとしても必ずトップページに落ちていた。
      if (parseUserpageQuery(window.location.search)) {
        return;
      }

      try {
        if (e.preventDefault) {
          e.preventDefault();
        }
      } catch (error) {
        // エラーを無視
      }
      // 中央カラムをトップ表示に切り替え
      setActiveContent('topix');
      // さらに履歴を積み直して、連続の戻るでページ離脱しないようにする
      try {
        if (typeof window !== 'undefined' && typeof history !== 'undefined') {
          history.pushState({ page: 'in-app' }, '', window.location.href);
        }
      } catch (error) {
        console.warn('Failed to push history state in popstate:', error);
      }
    };

    try {
      window.addEventListener('popstate', onPopState);
    } catch (error) {
      console.warn('Failed to add popstate listener:', error);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        try {
          window.removeEventListener('popstate', onPopState);
        } catch (error) {
          // エラーを無視
        }
      }
    };
  }, []);

  // カテゴリ -> その小分類を保持する state の更新関数。
  // 小分類を選ぶと、選んだカテゴリ以外はすべて空にする。
  const materialSubcategorySetters: Record<string, (v: string) => void> = {
    'roof': setRoofSubcategory,
    'exterior-wall': setExteriorWallSubcategory,
    'opening': setOpeningSubcategory,
    'external-floor': setExternalFloorSubcategory,
    'exterior-other': setExteriorOtherSubcategory,
    'internal-floor': setInternalFloorSubcategory,
    'internal-wall': setInternalWallSubcategory,
    'internal-ceiling': setInternalCeilingSubcategory,
    'internal-other': setInternalOtherSubcategory,
    'waterproof': setWaterproofSubcategory,
    'hardware': setHardwareSubcategory,
    'furniture': setFurnitureSubcategory,
    'electrical-systems': setElectricalSystemsSubcategory,
    'mechanical-systems': setMechanicalSystemsSubcategory,
    'exterior-infrastructure': setExteriorInfrastructureSubcategory,
    'exterior': setExteriorSubcategory,
  };

  const handleSubcategoryClick = (subcategory: string) => {
    console.log('Subcategory clicked:', subcategory);
    
    // 対応表は src/lib/materialCategories.ts に集約。
    // ここには 16 カテゴリぶんの配列が直書きされていた。
    const categoryRouteMap = CATEGORY_ROUTES;
    const getCategoryFromSubcategory = findCategoryBySubcategory;
    
    const category = getCategoryFromSubcategory(subcategory);
    
    if (category && categoryRouteMap[category]) {
      // URL遷移前にサブカテゴリーステートを設定（ハイライトを即座に表示するため）
      handleSubcategoryFromQuery(category, subcategory);

      // カテゴリーページに遷移し、クエリパラメータでサブカテゴリーを指定
      const route = categoryRouteMap[category];
      const url = `${route}?subcategory=${encodeURIComponent(subcategory)}`;
      router.push(url);
      return;
    }
    
    // URLベースのルーティングがあるページから遷移する場合は/に戻す
    const routeMap = INFO_SCREEN_TO_PATH;
    const currentRoute = Object.keys(routeMap).find(key => routeMap[key] === pathname);
    if (currentRoute) {
      startTransition(() => {
        router.replace('/');
      });
    }
    
    // Chatbot 直リンク（左カラムからの遷移）
    if (subcategory === 'chatbot') {
      setActiveContent('chatbot');
      setFurnitureSubcategory('');
      setHardwareSubcategory('');
      setWaterproofSubcategory('');
      setElectricalSystemsSubcategory('');
      setMechanicalSystemsSubcategory('');
      setExteriorInfrastructureSubcategory('');
      setExteriorSubcategory('');
      setRoofSubcategory('');
      setExteriorWallSubcategory('');
      setOpeningSubcategory('');
      setExternalFloorSubcategory('');
      setExteriorOtherSubcategory('');
      setInternalFloorSubcategory('');
      setInternalWallSubcategory('');
      setInternalCeilingSubcategory('');
      setInternalOtherSubcategory('');
      return;
    }

    // maker conect 直リンク
    if (subcategory === 'makerconect') {
      setActiveContent('makerconect');
      setFurnitureSubcategory('');
      setHardwareSubcategory('');
      setWaterproofSubcategory('');
      setElectricalSystemsSubcategory('');
      setMechanicalSystemsSubcategory('');
      setExteriorInfrastructureSubcategory('');
      setExteriorSubcategory('');
      setRoofSubcategory('');
      setExteriorWallSubcategory('');
      setOpeningSubcategory('');
      setExternalFloorSubcategory('');
      setExteriorOtherSubcategory('');
      setInternalFloorSubcategory('');
      setInternalWallSubcategory('');
      setInternalCeilingSubcategory('');
      setInternalOtherSubcategory('');
      return;
    }

    // 建材の小分類がクリックされた場合。
    // 対応表は src/lib/materialCategories.ts。以前はカテゴリごとに 24 行の同じ処理が
    // 16 組並んでいて、小分類を足すたびに 16 箇所すべてを直す必要があった。
    const materialCategory = findCategoryBySubcategory(subcategory);
    if (materialCategory) {
      setActiveContent(materialCategory);
      // 選んだカテゴリだけ値を入れ、ほかは空にする（前の選択が残らないように）
      Object.entries(materialSubcategorySetters).forEach(([category, setValue]) => {
        setValue(category === materialCategory ? subcategory : '');
      });
      return;
    }


    // 既存のロジックはそのまま保持...
    console.log('No matching subcategory found for:', subcategory);
  };

  // refを常に最新のハンドラで更新（documentレベルのイベントハンドラから参照するため）
  handleSubcategoryClickRef.current = handleSubcategoryClick;

  // 左カラム（サイドバー）選択中ハイライト（黒い下線）
  useEffect(() => {
    try {
      const links = document.querySelectorAll('.left-column .subcategory');
      links.forEach(link => {
        const el = link as HTMLElement;
        // 既存のハイライトをリセット
        el.style.backgroundColor = '';
        el.style.borderRadius = '';
        // パディング/マージンはCSSで統一管理（ズレ防止のため触らない）
        el.classList.remove('bg-gray-200', 'rounded');
      });
      if (!selectedSubcategory) return;
      links.forEach(link => {
        const el = link as HTMLElement;
        const page = el.getAttribute('data-page');
        if (page === selectedSubcategory) {
          // インラインスタイルでグレー背景を付与
          el.style.backgroundColor = '#9ca3af'; // gray-400（さらに少し暗め）
          el.style.borderRadius = '4px';
          // パディングやマージンは変更しない（位置ズレ防止）
        }
      });
    } catch (e) {
      console.warn('Failed to update sidebar highlight', e);
    }
  }, [selectedSubcategory]);

  // 中央カラムの表示状態に合わせてハイライト同期（プログラム変更時も追従）
  useEffect(() => {
    const current =
      roofSubcategory ||
      exteriorWallSubcategory ||
      openingSubcategory ||
      externalFloorSubcategory ||
      exteriorOtherSubcategory ||
      internalFloorSubcategory ||
      internalWallSubcategory ||
      internalCeilingSubcategory ||
      internalOtherSubcategory ||
      waterproofSubcategory ||
      hardwareSubcategory ||
      furnitureSubcategory ||
      electricalSystemsSubcategory ||
      mechanicalSystemsSubcategory ||
      exteriorInfrastructureSubcategory ||
      exteriorSubcategory ||
      '';
    setSelectedSubcategory(current);
  }, [
    roofSubcategory,
    exteriorWallSubcategory,
    openingSubcategory,
    externalFloorSubcategory,
    exteriorOtherSubcategory,
    internalFloorSubcategory,
    internalWallSubcategory,
    internalCeilingSubcategory,
    internalOtherSubcategory,
    waterproofSubcategory,
    hardwareSubcategory,
    furnitureSubcategory,
    electricalSystemsSubcategory,
    mechanicalSystemsSubcategory,
    exteriorInfrastructureSubcategory,
    exteriorSubcategory
  ]);

  useEffect(() => {
    // サイドバーの小カテゴリーのクリックイベントをリスンする
    // refを経由することでstale closure問題を回避する
    const handleSubcategoryClickEvent = (event: Event) => {
      const target = event.target as HTMLElement;

      // 見出し横「掲載希望はコチラ」クリック時は登録フォームへ遷移
      const anchorEl = target.closest('a');
      if (anchorEl && anchorEl.textContent && anchorEl.textContent.includes('掲載希望はコチラ')) {
        event.preventDefault();
        handleMenuClickRef.current('registration');
        return;
      }

      if (target.classList.contains('subcategory')) {
        event.preventDefault(); // デフォルトのリンク動作を防ぐ
        // Sidebarのハンドラで既に処理済みかチェック（二重呼び出し防止）
        if ((event as any).__subcategoryHandled) return;
        const subcategory = target.getAttribute('data-page');
        if (subcategory) {
          handleSubcategoryClickRef.current(subcategory);
        }
      }
    };

    // DOM要素が準備されるまで少し待つ
    const timer = setTimeout(() => {
      document.addEventListener('click', handleSubcategoryClickEvent);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleSubcategoryClickEvent);
    };
  }, []);

  // ページに応じた広告表示機能
  const getAdContent = (page: string) => {
    const amazonTag = process.env.NEXT_PUBLIC_AMAZON_TAG || ''
    const amazonSearch = (q: string) => `https://www.amazon.co.jp/s?k=${encodeURIComponent(q)}&tag=${encodeURIComponent(amazonTag)}`
    // 外壁関連で外壁仕上げのサブカテゴリの場合
    if (page === 'exterior-wall') {
      if (EXTERIOR_FINISH_SUBCATEGORIES.includes(exteriorWallSubcategory)) {
        return [
          { src: '/image/gaiheki-shiage_cm_sample.png', alt: '外壁仕上げ掲載希望広告', link: 'registration' }
        ];
      }
    }
    
    switch (page) {
      case 'event':
        return [
          { src: 'https://h.accesstrade.net/sp/rr?rk=0100ntts00ol67', alt: '日旅まつり　お得まとめ', link: 'https://h.accesstrade.net/sp/cc?rk=0100ntts00ol67', isAccessTrade: true },
          { src: 'https://h.accesstrade.net/sp/rr?rk=0100lfl300ol67', alt: 'skyticketプレミアム', link: 'https://h.accesstrade.net/sp/cc?rk=0100lfl300ol67', isAccessTrade: true },
          { src: 'https://h.accesstrade.net/sp/rr?rk=0100nha300ol67', alt: '国内格安航空券・飛行機予約の「ソラハピ」', link: 'https://h.accesstrade.net/sp/cc?rk=0100nha300ol67', isAccessTrade: true },
          { src: 'https://h.accesstrade.net/sp/rr?rk=0100o4y600ol67', alt: 'きっぷる', link: 'https://h.accesstrade.net/sp/cc?rk=0100o4y600ol67', isAccessTrade: true },
          { src: 'https://www23.a8.net/svt/bgt?aid=251123227485&wid=001&eno=01&mid=s00000000040014032000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IFX7+80R96A+B4+2BJJLT', trackingPixelSrc: 'https://www11.a8.net/0.gif?a8mat=45IFX7+80R96A+B4+2BJJLT' }
        ];
      case 'news':
        return [
          { src: 'https://www23.a8.net/svt/bgt?aid=251026036333&wid=001&eno=01&mid=s00000008903001069000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45GCXG+5I9D82+1WP2+6D4GH', trackingPixelSrc: 'https://www15.a8.net/0.gif?a8mat=45GCXG+5I9D82+1WP2+6D4GH' },
          { src: 'https://www20.a8.net/svt/bgt?aid=251122219295&wid=001&eno=01&mid=s00000015526001018000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+4VMW8I+3BSS+626XT', trackingPixelSrc: 'https://www19.a8.net/0.gif?a8mat=45IF57+4VMW8I+3BSS+626XT' },
          { src: 'https://www27.a8.net/svt/bgt?aid=251122219210&wid=001&eno=01&mid=s00000023752002029000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+3H11TE+539S+C2VV5', trackingPixelSrc: 'https://www16.a8.net/0.gif?a8mat=45IF57+3H11TE+539S+C2VV5' },
          { src: 'https://www28.a8.net/svt/bgt?aid=251122219148&wid=001&eno=01&mid=s00000013133002056000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+2G46B6+2TC2+C8O75', trackingPixelSrc: 'https://www17.a8.net/0.gif?a8mat=45IF57+2G46B6+2TC2+C8O75' },
          { src: 'https://www20.a8.net/svt/bgt?aid=251026036613&wid=001&eno=01&mid=s00000020603003003000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45GCXG+A4YQLU+4EZ2+HVNAP', trackingPixelSrc: 'https://www17.a8.net/0.gif?a8mat=45GCXG+A4YQLU+4EZ2+HVNAP' },
          { src: 'https://www20.a8.net/svt/bgt?aid=251026036612&wid=001&eno=01&mid=s00000017675001013000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45GCXG+A4DB02+3SDQ+614CX', trackingPixelSrc: 'https://www18.a8.net/0.gif?a8mat=45GCXG+A4DB02+3SDQ+614CX' }
        ];
      case 'roof':
      case '折板':
        return [
          { src: '/image/seppan_cm_sample.png', alt: '折板広告', link: null }
        ];
      case 'exterior-wall':
      case 'alc':
        return [
          { src: '/image/gaiheki_cm_sample.png', alt: '外壁掲載希望広告', link: 'registration' }
        ];
      case 'siding':
        return [
          { src: '/image/gaiheki_cm_sample.png', alt: '外壁掲載希望広告', link: 'registration' }
        ];
      case 'metalpanel':
        return [
          { src: '/image/gaiheki_cm_sample.png', alt: '外壁掲載希望広告', link: 'registration' }
        ];
      case 'opening':
        return [
          { src: '/image/kaikou_cm_sample.png', alt: '開口部掲載希望広告', link: 'registration' }
        ];
      case 'external-floor':
        return [
          { src: '/image/gaibu-floor_cm_sample.png', alt: '外部床掲載希望広告', link: 'registration' }
        ];
      case 'exterior-other':
        return [
          { src: '/image/gaibu-etc_cm_sample.png', alt: '外部その他掲載希望広告', link: 'registration' }
        ];
      case 'internal-floor':
        return [
          { src: '/image/naibu-floor_cm_sample.png', alt: '内部床材掲載希望広告', link: 'registration' }
        ];
      case 'internal-wall':
        return [
          { src: '/image/naibu-wall_cm_sample.png', alt: '内装壁材掲載希望広告', link: 'registration' }
        ];
      case 'internal-other':
        return [
          { src: '/image/naibu-etc_cm_sample.png', alt: '内装その他掲載希望広告', link: 'registration' }
        ];
      case 'waterproof':
        return [
          { src: '/image/bousui_cm_sample.png', alt: '防水掲載希望広告', link: 'registration' }
        ];
      case 'hardware':
        return [
          { src: '/image/kanamono_cm_sample.png', alt: '金物掲載希望広告', link: 'registration' }
        ];
      case 'furniture':
        return [
          { src: '/image/kagu_cm_sample.png', alt: '家具掲載希望広告', link: 'registration' }
        ];
      case 'internal-ceiling':
        return [
          { src: '/image/掲載募集中a.png', alt: '内装天井材掲載希望広告', link: 'registration' }
        ];
      case 'electrical-systems':
        return [
          { src: '/image/掲載募集中a.png', alt: '電気設備掲載希望広告', link: 'registration' }
        ];
      case 'mechanical-systems':
        return [
          { src: '/image/掲載募集中a.png', alt: '機械設備掲載希望広告', link: 'registration' }
        ];
      case 'exterior-infrastructure':
        return [
          { src: '/image/掲載募集中a.png', alt: '外構掲載希望広告', link: 'registration' }
        ];
      case 'exterior':
        return [
          { src: '/image/掲載募集中a.png', alt: 'エクステリア掲載希望広告', link: 'registration' }
        ];
      case 'construction-companies':
        return [
          { src: 'https://www20.a8.net/svt/bgt?aid=251123227493&wid=001&eno=01&mid=s00000020552003012000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IFX7+85IQ0I+4EKW+HXKQP', trackingPixelSrc: 'https://www10.a8.net/0.gif?a8mat=45IFX7+85IQ0I+4EKW+HXKQP' },
          { src: 'https://www26.a8.net/svt/bgt?aid=251123227489&wid=001&eno=01&mid=s00000008928001030000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IFX7+834ZLE+1WW0+64RJ5', trackingPixelSrc: 'https://www15.a8.net/0.gif?a8mat=45IFX7+834ZLE+1WW0+64RJ5' },
          { src: 'https://www24.a8.net/svt/bgt?aid=251123227488&wid=001&eno=01&mid=s00000018472001010000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IFX7+82JJZM+3YJ4+60H7L', trackingPixelSrc: 'https://www16.a8.net/0.gif?a8mat=45IFX7+82JJZM+3YJ4+60H7L' },
          { src: 'https://www27.a8.net/svt/bgt?aid=251123227490&wid=001&eno=01&mid=s00000021288004006000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IFX7+83QF76+4K9C+NUMHT', trackingPixelSrc: 'https://www17.a8.net/0.gif?a8mat=45IFX7+83QF76+4K9C+NUMHT' }
        ];
      case 'design-offices':
        return [
          { src: 'https://www24.a8.net/svt/bgt?aid=251123227495&wid=001&eno=01&mid=s00000014635006019000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IFX7+86PL82+34XA+ZU2WH', trackingPixelSrc: 'https://www15.a8.net/0.gif?a8mat=45IFX7+86PL82+34XA+ZU2WH' },
          { src: 'https://www25.a8.net/svt/bgt?aid=251123227406&wid=001&eno=01&mid=s00000019044001021000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IFX7+6PQ0DU+42Y0+62U35', trackingPixelSrc: 'https://www13.a8.net/0.gif?a8mat=45IFX7+6PQ0DU+42Y0+62U35' },
          { src: 'https://www27.a8.net/svt/bgt?aid=251123227555&wid=001&eno=01&mid=s00000007052006016000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IFX7+96FLIQ+1IEW+ZTFR5', trackingPixelSrc: 'https://www15.a8.net/0.gif?a8mat=45IFX7+96FLIQ+1IEW+ZTFR5' },
          { src: 'https://www27.a8.net/svt/bgt?aid=251123227498&wid=001&eno=01&mid=s00000026650001006000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IFX7+88HW1E+5PMS+5ZMCH', trackingPixelSrc: 'https://www18.a8.net/0.gif?a8mat=45IFX7+88HW1E+5PMS+5ZMCH' }
        ];
      case 'job-info':
        return [
          { src: 'https://h.accesstrade.net/sp/rr?rk=0100nsf500ol67', alt: '転職会議', link: 'https://h.accesstrade.net/sp/cc?rk=0100nsf500ol67', isAccessTrade: true },
          {
            src: 'https://www21.a8.net/svt/bgt?aid=251112146887&wid=001&eno=01&mid=s00000021455001004000&mc=1',
            alt: 'A8広告',
            link: 'https://px.a8.net/svt/ejp?a8mat=45I7DE+EO3ICY+4LJQ+5Z6WX',
            trackingPixelSrc: 'https://www14.a8.net/0.gif?a8mat=45I7DE+EO3ICY+4LJQ+5Z6WX'
          },
          { src: 'https://www22.a8.net/svt/bgt?aid=251122219071&wid=001&eno=01&mid=s00000018337001010000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+169SQA+3XHM+60H7L', trackingPixelSrc: 'https://www11.a8.net/0.gif?a8mat=45IF57+169SQA+3XHM+60H7L' },
          { src: 'https://www22.a8.net/svt/bgt?aid=251123227535&wid=001&eno=01&mid=s00000001783020010000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IFX7+8UIXF6+DRA+3B4U5D', trackingPixelSrc: 'https://www19.a8.net/0.gif?a8mat=45IFX7+8UIXF6+DRA+3B4U5D' }
        ];
      case 'projects':
        return [
          { src: 'https://www28.a8.net/svt/bgt?aid=251123227449&wid=001&eno=01&mid=s00000017718046009000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IFX7+7FBNEA+3SPO+7LXBPT', trackingPixelSrc: 'https://www18.a8.net/0.gif?a8mat=45IFX7+7FBNEA+3SPO+7LXBPT' },
          { src: 'https://www29.a8.net/svt/bgt?aid=251123227554&wid=001&eno=01&mid=s00000025613001003000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IFX7+95U5WY+5HMQ+5YZ75', trackingPixelSrc: 'https://www19.a8.net/0.gif?a8mat=45IFX7+95U5WY+5HMQ+5YZ75' },
          { src: 'https://www21.a8.net/svt/bgt?aid=251123227532&wid=001&eno=01&mid=s00000020542002003000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IFX7+8SQMLU+4EI4+BXB8X', trackingPixelSrc: 'https://www11.a8.net/0.gif?a8mat=45IFX7+8SQMLU+4EI4+BXB8X' },
          { src: 'https://www27.a8.net/svt/bgt?aid=251123227534&wid=001&eno=01&mid=s00000017980001011000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IFX7+8TXHTE+3UQG+60OXD', trackingPixelSrc: 'https://www13.a8.net/0.gif?a8mat=45IFX7+8TXHTE+3UQG+60OXD' }
        ];
      case 'competitions':
        return [
          { src: 'https://www27.a8.net/svt/bgt?aid=251123227487&wid=001&eno=01&mid=s00000008091016010000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IFX7+81Y4DU+1QFI+2NBHY9', trackingPixelSrc: 'https://www10.a8.net/0.gif?a8mat=45IFX7+81Y4DU+1QFI+2NBHY9' },
          { src: 'https://www24.a8.net/svt/bgt?aid=251123227540&wid=001&eno=01&mid=s00000012139002015000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IFX7+8XI3G2+2LNY+BZVU9', trackingPixelSrc: 'https://www15.a8.net/0.gif?a8mat=45IFX7+8XI3G2+2LNY+BZVU9' },
          { src: 'https://www23.a8.net/svt/bgt?aid=251123227553&wid=001&eno=01&mid=s00000020637002026000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IFX7+958QB6+4F8I+C28PT', trackingPixelSrc: 'https://www10.a8.net/0.gif?a8mat=45IFX7+958QB6+4F8I+C28PT' },
          { src: 'https://www21.a8.net/svt/bgt?aid=251122219057&wid=001&eno=01&mid=s00000001343001062000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+XXQ9E+AD2+6BMG1', trackingPixelSrc: 'https://www17.a8.net/0.gif?a8mat=45IF57+XXQ9E+AD2+6BMG1' }
        ];
      case 'chatbot':
        return [
          { src: '/image/testcmA.webp', alt: 'デフォルト広告1', link: 'https://suzuri.jp/sperz' },
          { src: '/image/gaiheki_cm_sample.png', alt: 'デフォルト広告2', link: null }
        ];
      case 'makerconect':
        return [
          { src: '/image/testcmA.webp', alt: 'デフォルト広告1', link: 'https://suzuri.jp/sperz' },
          { src: '/image/gaiheki_cm_sample.png', alt: 'デフォルト広告2', link: null }
        ];
      case 'pickup':
        return [
          { src: 'https://h.accesstrade.net/sp/rr?rk=0100p0vy00ol67', alt: 'フレシャス', link: 'https://h.accesstrade.net/sp/cc?rk=0100p0vy00ol67', isAccessTrade: true },
          { src: 'https://h.accesstrade.net/sp/rr?rk=0100c75v00ol67', alt: 'エア・リゾーム インテリア本店', link: 'https://h.accesstrade.net/sp/cc?rk=0100c75v00ol67', isAccessTrade: true },
          { src: 'https://www26.a8.net/svt/bgt?aid=251122219251&wid=001&eno=01&mid=s00000015871001046000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+45FTMA+3EGM+686ZL', trackingPixelSrc: 'https://www10.a8.net/0.gif?a8mat=45IF57+45FTMA+3EGM+686ZL' },
          { src: 'https://h.accesstrade.net/sp/rr?rk=0100pgck00ol67', alt: 'JMGO日本公式ストア', link: 'https://h.accesstrade.net/sp/cc?rk=0100pgck00ol67', isAccessTrade: true }
        ];
      case 'shop':
        return [
          { src: 'https://h.accesstrade.net/sp/rr?rk=0100prnv00ol67', alt: 'CAGUUU', link: 'https://h.accesstrade.net/sp/cc?rk=0100prnv00ol67', isAccessTrade: true },
          { src: 'https://www23.a8.net/svt/bgt?aid=251026036611&wid=001&eno=01&mid=s00000026663001003000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45GCXG+A3RVEA+5PQE+5YZ75', trackingPixelSrc: 'https://www10.a8.net/0.gif?a8mat=45GCXG+A3RVEA+5PQE+5YZ75' },
          { src: 'https://www25.a8.net/svt/bgt?aid=251026036506&wid=001&eno=01&mid=s00000025417001003000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45GCXG+8D9CVM+5G4A+5YZ75', trackingPixelSrc: 'https://www12.a8.net/0.gif?a8mat=45GCXG+8D9CVM+5G4A+5YZ75' },
          { src: 'https://www20.a8.net/svt/bgt?aid=251122219213&wid=001&eno=01&mid=s00000024637001006000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+3ITCMQ+5A3M+5ZMCH', trackingPixelSrc: 'https://www14.a8.net/0.gif?a8mat=45IF57+3ITCMQ+5A3M+5ZMCH' },
          { src: 'https://www29.a8.net/svt/bgt?aid=251122219290&wid=001&eno=01&mid=s00000022582001009000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+4SNQ7M+4U8S+609HT', trackingPixelSrc: 'https://www15.a8.net/0.gif?a8mat=45IF57+4SNQ7M+4U8S+609HT' },
          { src: 'https://www26.a8.net/svt/bgt?aid=251122219058&wid=001&eno=01&mid=s00000014286009012000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+YJ5V6+328C+1HNL1D', trackingPixelSrc: 'https://www16.a8.net/0.gif?a8mat=45IF57+YJ5V6+328C+1HNL1D' }
        ];
      case 'landscape-cad':
        return [
          { src: 'https://h.accesstrade.net/sp/rr?rk=0100pbxc00ol67', alt: 'AND PLANTS', link: 'https://h.accesstrade.net/sp/cc?rk=0100pbxc00ol67', isAccessTrade: true },
          { src: 'https://www24.a8.net/svt/bgt?aid=251122219383&wid=001&eno=01&mid=s00000024017004011000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+6C11GY+55BE+NVP2P', trackingPixelSrc: 'https://www13.a8.net/0.gif?a8mat=45IF57+6C11GY+55BE+NVP2P' },
          { src: 'https://www26.a8.net/svt/bgt?aid=251122219144&wid=001&eno=01&mid=s00000018045001018000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+2DQFW2+3V8I+626XT', trackingPixelSrc: 'https://www13.a8.net/0.gif?a8mat=45IF57+2DQFW2+3V8I+626XT' },
          { src: 'https://www24.a8.net/svt/bgt?aid=251122219146&wid=001&eno=01&mid=s00000018952003004000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+2EXB3M+428G+HVV0H', trackingPixelSrc: 'https://www10.a8.net/0.gif?a8mat=45IF57+2EXB3M+428G+HVV0H' },
          { src: 'https://www23.a8.net/svt/bgt?aid=251122219190&wid=001&eno=01&mid=s00000027007001009000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+354DPU+5SDY+609HT', trackingPixelSrc: 'https://www16.a8.net/0.gif?a8mat=45IF57+354DPU+5SDY+609HT' },
          { src: '/image/testcmA.webp', alt: 'デフォルト広告1', link: 'https://suzuri.jp/sperz' }
        ];
      case 'new-products':
        return [
          { src: 'https://www28.a8.net/svt/bgt?aid=251122219452&wid=001&eno=01&mid=s00000021842001006000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+7H3Y7M+4OJ8+5ZMCH', trackingPixelSrc: 'https://www13.a8.net/0.gif?a8mat=45IF57+7H3Y7M+4OJ8+5ZMCH' },
          { src: 'https://www24.a8.net/svt/bgt?aid=251122219145&wid=001&eno=01&mid=s00000025186001012000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+2EBVHU+5EC4+60WN5', trackingPixelSrc: 'https://www18.a8.net/0.gif?a8mat=45IF57+2EBVHU+5EC4+60WN5' },
          { src: 'https://www27.a8.net/svt/bgt?aid=251122219211&wid=001&eno=01&mid=s00000022845001007000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+3HMHF6+4W9U+5ZU29', trackingPixelSrc: 'https://www15.a8.net/0.gif?a8mat=45IF57+3HMHF6+4W9U+5ZU29' },
          { src: 'https://www26.a8.net/svt/bgt?aid=251122219212&wid=001&eno=01&mid=s00000022598001007000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+3I7X0Y+4UD8+5ZU29', trackingPixelSrc: 'https://www19.a8.net/0.gif?a8mat=45IF57+3I7X0Y+4UD8+5ZU29' },
          { src: 'https://www25.a8.net/svt/bgt?aid=251122219382&wid=001&eno=01&mid=s00000019313001030000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+6BFLV6+450Q+64RJ5', trackingPixelSrc: 'https://www17.a8.net/0.gif?a8mat=45IF57+6BFLV6+450Q+64RJ5' }
        ];
      case 'books-software':
        return [
          { src: 'https://www20.a8.net/svt/bgt?aid=251122219384&wid=001&eno=01&mid=s00000025420001003000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+6CMH2Q+5G54+5YZ75', trackingPixelSrc: 'https://www18.a8.net/0.gif?a8mat=45IF57+6CMH2Q+5G54+5YZ75' },
          { src: 'https://www27.a8.net/svt/bgt?aid=251122219191&wid=001&eno=01&mid=s00000016371001009000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+35PTBM+3IBI+609HT', trackingPixelSrc: 'https://www12.a8.net/0.gif?a8mat=45IF57+35PTBM+3IBI+609HT' },
          { src: 'https://www24.a8.net/svt/bgt?aid=251122219189&wid=001&eno=01&mid=s00000019939001025000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+34IY42+49UM+63OY9', trackingPixelSrc: 'https://www12.a8.net/0.gif?a8mat=45IF57+34IY42+49UM+63OY9' },
          { src: 'https://www26.a8.net/svt/bgt?aid=251122219252&wid=001&eno=01&mid=s00000013799002015000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+461982+2YH2+BZVU9', trackingPixelSrc: 'https://www17.a8.net/0.gif?a8mat=45IF57+461982+2YH2+BZVU9' }
        ];
      case 'qualifications':
        return [
          { src: 'https://www22.a8.net/svt/bgt?aid=251122219169&wid=001&eno=01&mid=s00000014262001005000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+2SMA0I+321O+5ZEMP', trackingPixelSrc: 'https://www10.a8.net/0.gif?a8mat=45IF57+2SMA0I+321O+5ZEMP' },
          { src: 'https://www24.a8.net/svt/bgt?aid=251122219070&wid=001&eno=01&mid=s00000018694001006000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+15OD4I+408S+5ZMCH', trackingPixelSrc: 'https://www17.a8.net/0.gif?a8mat=45IF57+15OD4I+408S+5ZMCH' },
          { src: 'https://www28.a8.net/svt/bgt?aid=251122219011&wid=001&eno=01&mid=s00000021666002015000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+6JSFM+4N6C+BZVU9', trackingPixelSrc: 'https://www11.a8.net/0.gif?a8mat=45IF57+6JSFM+4N6C+BZVU9' },
          { src: 'https://www26.a8.net/svt/bgt?aid=251026036610&wid=001&eno=01&mid=s00000022683006006000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45GCXG+A36FSI+4V0U+ZRALD', trackingPixelSrc: 'https://www13.a8.net/0.gif?a8mat=45GCXG+A36FSI+4V0U+ZRALD' }
        ];
      case 'forum':
        return [
          { src: 'https://www25.a8.net/svt/bgt?aid=251122219451&wid=001&eno=01&mid=s00000026648001003000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+7GIILU+5PM8+5YZ75', trackingPixelSrc: 'https://www19.a8.net/0.gif?a8mat=45IF57+7GIILU+5PM8+5YZ75' },
          { src: 'https://www20.a8.net/svt/bgt?aid=251122219192&wid=001&eno=01&mid=s00000018836001007000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+36B8XE+41C8+5ZU29', trackingPixelSrc: 'https://www15.a8.net/0.gif?a8mat=45IF57+36B8XE+41C8+5ZU29' },
          { src: 'https://www21.a8.net/svt/bgt?aid=251122219147&wid=001&eno=01&mid=s00000011117002013000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+2FIQPE+2DS2+BZGEP', trackingPixelSrc: 'https://www11.a8.net/0.gif?a8mat=45IF57+2FIQPE+2DS2+BZGEP' },
          { src: 'https://www22.a8.net/svt/bgt?aid=251122219253&wid=001&eno=01&mid=s00000020232001006000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45IF57+46MOTU+4C40+5ZMCH', trackingPixelSrc: 'https://www16.a8.net/0.gif?a8mat=45IF57+46MOTU+4C40+5ZMCH' },
          { src: 'https://www26.a8.net/svt/bgt?aid=251026036380&wid=001&eno=01&mid=s00000026912001004000&mc=1', alt: 'A8広告', link: 'https://px.a8.net/svt/ejp?a8mat=45GCXG+6A8QNM+5RNK+5Z6WX', trackingPixelSrc: 'https://www19.a8.net/0.gif?a8mat=45GCXG+6A8QNM+5RNK+5Z6WX' }
        ];
      case 'topix':
        // トップページは gaiheki_cm_sample.png を除外（ユーザー指示により）
        return [
          { src: '/image/testcmA.webp', alt: 'デフォルト広告1', link: 'https://suzuri.jp/sperz' }
        ];
      default:
        return [
          { src: '/image/testcmA.webp', alt: 'デフォルト広告1', link: 'https://suzuri.jp/sperz' },
          { src: '/image/gaiheki_cm_sample.png', alt: 'デフォルト広告2', link: null }
        ];
    }
  };

  const renderContent = () => {
    console.log('Rendering content. Active content:', activeContent, 'Opening subcategory:', openingSubcategory);

    // サーバーで出すのは children（各ページ本文）だけ。ツールや掲載情報の画面は
    // ログイン状態を前提に読み書きするので、確認が終わるまで組み立てない。
    if (!authReady && activeContent !== 'topix') {
      return <ToolLoading />;
    }

    switch (activeContent) {
      case 'event':
        return <EventsWithBookmarks />;
      case 'news':
        return <NewsWithBookmarks />;
      case 'new-products':
        return <NewProducts onNavigateToRegistration={() => handleMenuClick('registration')} />;
      case 'books-software':
        return <BooksSoftware onNavigateToRegistration={() => handleMenuClick('registration')} />;
      case 'pickup':
        return <Pickup />;
      case 'regulations':
        return <LawsRegulations />;
      case 'qualifications':
        return <Qualifications />;
      case 'landscape-cad':
        return <LandscapeCAD onNavigateToLogin={() => handleMenuClick('login')} />;
      case 'shop':
        return <ShopContent />;
      case 'projects':
        return <Projects onNavigateToRegistration={() => handleMenuClick('registration')} />;
      case 'competitions':
        return <Competitions onNavigateToRegistration={() => handleMenuClick('registration')} />;
      case 'construction-companies':
        return <ConstructionCompanies onNavigateToRegistration={() => handleMenuClick('registration')} />;
      case 'design-offices':
        return <DesignOffices onNavigateToRegistration={() => handleMenuClick('registration')} />;
      case 'job-info':
        return <JobInfo onNavigateToRegistration={() => handleMenuClick('registration')} />;
      case 'forum':
        return <Forum />;
      case 'chatbot':
        return <Chatbot />;
      case 'makerconect':
        return <MakerConect />;
      case 'privacy-policy':
        console.log('[MainLayout] PrivacyPolicyをレンダリング - totalUnreadCount:', totalUnreadCount);
        return <PrivacyPolicy unreadCount={totalUnreadCount} />;
      case 'roof':
        return <Mak1Roof subcategory={roofSubcategory} />;
      case 'exterior-wall':
        return <Mak2ExteriorWall subcategory={exteriorWallSubcategory} />;
      case 'opening':
        console.log('Rendering OpeningContent with subcategory:', openingSubcategory);
        return <Mak3Opening subcategory={openingSubcategory} />;
      case 'external-floor':
        return <Mak5ExternalFloor subcategory={externalFloorSubcategory} />;
      case 'exterior-other':
        return <Mak6ExteriorOther subcategory={exteriorOtherSubcategory} />;
      case 'internal-floor':
        return <Mak7InternalFloor subcategory={internalFloorSubcategory} />;
      case 'internal-wall':
        return <Mak8InternalWall subcategory={internalWallSubcategory} />;
      case 'internal-ceiling':
        return <Mak9InternalCeiling subcategory={internalCeilingSubcategory} />;
      case 'internal-other':
        return <Mak10InternalOther subcategory={internalOtherSubcategory} />;
      case 'waterproof':
        return <Mak11Waterproof subcategory={waterproofSubcategory} onNavigateToRegistration={() => handleMenuClick('registration')} />;
      case 'hardware':
        return <Mak12Hardware subcategory={hardwareSubcategory} onNavigateToRegistration={() => handleMenuClick('registration')} />;
      case 'furniture':
        return <Mak13Furniture subcategory={furnitureSubcategory} />;
      case 'electrical-systems':
        return <Mak14ElectricalSystems subcategory={electricalSystemsSubcategory} onNavigateToRegistration={() => handleMenuClick('registration')} />;
      case 'mechanical-systems':
        return <Mak15MechanicalSystems subcategory={mechanicalSystemsSubcategory} />;
      case 'exterior-infrastructure':
        return <Mak16ExteriorInfrastructure subcategory={exteriorInfrastructureSubcategory} />;
      case 'exterior':
        return <Mak17Exterior subcategory={exteriorSubcategory} onNavigateToRegistration={() => handleMenuClick('registration')} />;
      case 'registration':
        console.log('Rendering RegistrationForm');
        return <RegistrationForm />;
      case 'feedback':
        console.log('Rendering FeedbackForm');
        return <FeedbackForm />;
      case 'register':
        console.log('Rendering RegisterForm');
        return <RegisterForm 
          onNavigateToLogin={() => handleMenuClick('login')} 
        />;
      case 'login':
        console.log('Rendering LoginForm');
        return <LoginForm 
          onNavigateToRegister={() => handleMenuClick('register')}
          onLoginSuccess={() => handleMenuClick('topix')}
        />;
      case 'welcome':
        console.log('Rendering WelcomePage');
        return <WelcomePage 
          onLogout={() => handleMenuClick('topix')}
        />;
      case 'my-calendar':
        return <MyCalendar />;
      case 'yymail':
        return <YyMail />;
      case 'yychat':
        return <YyChat />;
      case 'my-regulations':
        return <MyRegulations />;
      case 'my-tasks':
        return <MyTasks />;
      case 'team-tasks':
        return <TeamTasks />;
      case 'general-tools':
        return <Suspense fallback={<ToolLoading />}><GeneralTools /></Suspense>;
      case 'design-tools':
        return <DesignTools />;
      case 'design-info':
        return <DesignInfo />;
      case 'material-info':
        return <MaterialInfo />;
      case 'contacts':
        return <ContactsManagement />;
      case 'settings':
        return <Settings />;
      case 'userpage-top':
        return <Userpage_top />;
      case 'public-works':
        return <Projects onNavigateToRegistration={() => handleMenuClick('registration')} initialCategory="public" />;
      case 'topix':
      default:
        return <>{children}</>;
    }
  };

  // Userpageのメニューかどうかを判定する関数
  const isUserpageMenu = () => {
    const userpageMenus = USERPAGE_MENUS as readonly string[];
    return userpageMenus.includes(activeContent);
  };

  return (
    <AuthProvider>
      <div className="min-h-screen">
        <AfterMount><SearchParamsWatcher onChange={applyRouteFromUrl} /></AfterMount>
        <div id="main-layout-container" className="flex flex-col lg:flex-row lg:items-stretch">
          {/* 左カラム：ページ最上部から最下部まで（フッターバーより前面） */}
          <div className="hidden lg:block" style={{ zIndex: 10000, position: 'relative' }}>
            <Sidebar
              onPageChange={handleSubcategoryClick}
              onMenuClick={handleMenuClick}
              activeContent={activeContent}
              onLogoClick={() => {
                // ロゴクリック時はトップページにリセット（URL=/, activeContent=initialContent）
                // SPA系コンテンツ(privacy-policy等)で開いている場合、URLが/のままだとLinkだけでは中央/右が更新されないため
                setActiveContent(initialContent);
                activeContentRef.current = initialContent;
              }}
            />
          </div>
          {/* 右側：ナビバー + コンテンツエリア */}
          <div className="yy-shell__right flex-1 min-w-0 pb-[34px] lg:pb-0">
            <Navigation onMenuClick={handleMenuClick} activeItem={activeContent} />
            {/* 一般ツールは中央を全面に使う。ナビ直下から左右いっぱいまで余白ゼロ。 */}
            <div
              className={
                'yy-shell__cols flex lg:flex-row flex-col lg:items-start gap-2 p-2 md:p-3 lg:p-4' +
                (FLUSH_CONTENTS.includes(activeContent) ? ' yy-shell__cols--flush' : '')
              }
            >
          <main id="yy-main-scroll" className="yy-shell__main flex-1 min-w-0">
            {/* 中央カラム右エリアに参考資料（NEWSのブックマーク幅相当: 300px） */}
            <div className="lg:flex lg:gap-4 items-start">
              {/* 左カラム Ⅲ の画面は yy-tool を付けて、入力欄やボタンの見た目を
                  globals.css 側でまとめて揃える。20本それぞれが別々の角丸・枠線を
                  持っていたので、1箇所で決められるようにした。 */}
              <div className={`flex-1 min-w-0${isGeneralToolScreen(activeContent) ? ' yy-tool' : ''}`}>
                <Breadcrumbs />
                {renderContent()}
              </div>
              {/* 右側: 参考資料 / 資格動画 */}
              {!isUserpageMenu() && (activeContent === 'regulations' || activeContent === 'qualifications') && (
                <aside className={`hidden lg:block ${activeContent === 'qualifications' ? 'w-[360px]' : 'w-[275px]'} shrink-0`}>
                  <div className="sticky top-2" id={activeContent === 'qualifications' ? 'qual-right-sticky' : undefined}>
                    {activeContent === 'regulations' ? (
                      <ReferenceResources />
                    ) : (
                      <Suspense fallback={<ToolLoading />}>
                        <QualificationsVideos />
                      </Suspense>
                    )}
                  </div>
                </aside>
              )}
              {/* 右側: 折り畳み可能な作業music（Userpage内ツール向け） */}
              {isUserpageMenu() && (
                <div className="hidden lg:block shrink-0">
                  <UserpageMusicPanel />
                </div>
              )}
            </div>
          </main>
          {/* 右サイドバー：広告欄（Userpageメニュー以外で表示） */}
          {/* iPadサイズ(md:768px)以上で表示、最小200px〜最大300pxで縮小対応 */}
          {!isUserpageMenu() && (() => {
            // プライバシーポリシーページ判定（広告を非表示にして関連プライポリ一覧を出す）
            // - 個別アプリページ: URLパス /xxx-app-privacy-policy/ で開いている
            // - yaneyuka.com 本体のプライポリ: フッターバー「プライバシーポリシー」から SPA遷移 → URLは / のまま、activeContent='privacy-policy'
            // 対象パスの一覧は src/lib/legalPages.ts が唯一の定義。
            // 以前はここに正規表現でアプリ名を並べていたため、新アプリ追加時に
            // 更新を忘れると右カラムのリンク一覧が出ない状態になっていた。
            const isPrivacyPolicyPage =
              isPrivacyPolicyPath(pathname) ||
              activeContent === 'privacy-policy';
            return (
            <aside className="yy-shell__aside w-[200px] 2xl:w-[300px] min-w-[200px] shrink bg-white px-1 pt-0 pb-4 rounded text-sm overflow-y-auto overflow-x-hidden hidden md:block">
              {isPrivacyPolicyPage && (
                <RelatedPrivacyLinks
                  currentPath={pathname}
                  isYaneyukaPrivacyActive={activeContent === 'privacy-policy'}
                  onYaneyukaPrivacyClick={() => handleMenuClick('privacy-policy')}
                />
              )}
              {!isPrivacyPolicyPage && (() => {
                // 対象ページリスト
                const targetPages = ['event', 'news', 'new-products', 'books-software', 'pickup', 'qualifications', 'landscape-cad', 'shop', 'projects', 'competitions', 'construction-companies', 'design-offices', 'job-info', 'forum'];
                const isTargetPage = targetPages.includes(activeContent);

                // アフィリエイト広告をランダムに最大2個選択
                // 乱数はマウント後だけ。サーバーの HTML と初回描画は同じ並びにしないと
                // ハイドレーションが失敗し、ページ全体が描き直しになる。
                const allAds = getAdContent(activeContent);
                const shuffled = hasMounted ? [...allAds].sort(() => Math.random() - 0.5) : allAds;
                const displayAds = shuffled.slice(0, 2);

                return (
              <div className={isTargetPage ? '' : 'space-y-2'}>
                {displayAds.map((ad, index) => {
                  // 対象ページの場合は個別にmargin-topを制御
                  let targetPageTopMarginClass = '';
                  if (isTargetPage) {
                    if (index === 0) {
                      targetPageTopMarginClass = '';              // 1個目は余白なし
                    } else {
                      targetPageTopMarginClass = 'mt-2';          // 2個目以降は同じ間隔（0.5rem）
                    }
                  }
                  
                  const extraMarginClass = '';
                  const extraBottomMarginClass = isTargetPage ? '' : 'mb-2';
                  // 対象ページの全ての広告にグレーの細い線の外枠を追加
                  const borderClass = isTargetPage ? 'border border-gray-400 rounded' : '';
                  
                  // classNameを正しく結合（空文字列を除外）
                  const marginClass = isTargetPage ? targetPageTopMarginClass : `${extraMarginClass} ${extraBottomMarginClass}`.trim();
                  const finalClassName = [marginClass, borderClass].filter(Boolean).join(' ');
                  
                  return 'isAccessTrade' in ad && (ad as any).isAccessTrade ? (
                    <div 
                      key={index}
                      className={finalClassName || undefined}
                      dangerouslySetInnerHTML={{
                        __html: `<a href="${ad.link}" target="_blank" rel="noopener noreferrer nofollow" referrerpolicy="no-referrer-when-downgrade"><img src="${ad.src}" alt="${ad.alt}" border="0" width="300" height="250" loading="lazy" style="width: 100%; max-width: 100%; height: auto; border-radius: 4px;" /></a>`
                      }}
                    />
                  ) : ad.link ? (
                    ad.link.startsWith('http') ? (
                      isTargetPage ? (
                        <div key={index} className={marginClass || undefined}>
                          <a 
                            href={ad.link}
                            target="_blank"
                            rel="noopener noreferrer nofollow sponsored"
                            onClick={() => { try { logEvent('pr_click', { area: activeContent, index }) } catch {} }}
                          >
                            <div className={borderClass ? `rounded overflow-hidden ${borderClass}` : 'rounded overflow-hidden'}>
                              <img 
                                src={ad.src} 
                                className="w-full h-auto hover:opacity-80 transition-opacity cursor-pointer" 
                                alt={ad.alt}
                                width={300}
                                height={250}
                                loading="lazy"
                                style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/image/掲載募集中a.png";
                                }}
                              />
                            </div>
                            {'trackingPixelSrc' in ad && (ad as any).trackingPixelSrc ? (
                              <img src={(ad as any).trackingPixelSrc} width="1" height="1" alt="" loading="lazy" style={{ display: 'block' }} />
                            ) : null}
                          </a>
                        </div>
                      ) : (
                      <a 
                        key={index}
                        href={ad.link}
                        target="_blank"
                        rel="noopener noreferrer nofollow sponsored"
                        onClick={() => { try { logEvent('pr_click', { area: activeContent, index }) } catch {} }}
                        className={marginClass || undefined}
                      >
                        <div className={borderClass ? `rounded overflow-hidden ${borderClass}` : 'rounded overflow-hidden'}>
                          <img 
                            src={ad.src} 
                            className="w-full h-auto hover:opacity-80 transition-opacity cursor-pointer" 
                            alt={ad.alt}
                            width={300}
                            height={250}
                            loading="lazy"
                            style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/image/掲載募集中a.png";
                            }}
                          />
                        </div>
                        {'trackingPixelSrc' in ad && (ad as any).trackingPixelSrc ? (
                          <img src={(ad as any).trackingPixelSrc} width="1" height="1" alt="" loading="lazy" style={{ display: 'block' }} />
                        ) : null}
                      </a>
                      )
                    ) : (
                      <img 
                        key={index}
                        src={ad.src} 
                        className={`${marginClass} rounded w-full max-w-full hover:opacity-80 transition-opacity cursor-pointer ${borderClass}`.trim()}
                        alt={ad.alt}
                        width={300}
                        height={250}
                        loading="lazy"
                        style={{ width: '100%', height: 'auto' }}
                        onClick={() => handleMenuClick(ad.link)}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/image/掲載募集中a.png";
                        }}
                      />
                    )
                  ) : (
                    <img 
                      key={index}
                      src={ad.src} 
                      className={`${marginClass} rounded w-full max-w-full hover:opacity-80 transition-opacity cursor-pointer ${borderClass}`.trim()}
                      alt={ad.alt}
                      width={300}
                      height={250}
                      loading="lazy"
                      style={{ width: '100%', height: 'auto' }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/image/掲載募集中a.png";
                      }}
                    />
                  );
                })}
              </div>
                );
              })()}
              {/* 「yaneyuka関連アプリ」は左カラムの Ⅴ 外部ツールへ集約した（Sidebar.tsx の RAIL_MODES）。
                  アイコン付きで常時見えるようになったので、ここでの重複掲載はやめる。 */}
            </aside>
            );
          })()}
            </div>{/* コンテンツエリア（中央+右カラム）の閉じ */}
          </div>{/* 右側div（ナビ+コンテンツ）の閉じ */}
        </div>
        {/* Footer は現在不要。コード自体は Footer.tsx に残してある。
            フッターバーの13項目は左カラムの Ⅱ〜Ⅴ（Sidebar.tsx の RAIL_MODES）へ移したが、
            左カラムは hidden lg:block なので、lg 未満ではこのバーが唯一の導線になる。 */}
        <div className="lg:hidden">
          <UserpageBottomBar
            activeContent={activeContent}
            onMenuClick={handleMenuClick}
            isLoggedIn={isLoggedIn}
            username={currentUser?.username}
          />
        </div>
        <CookieConsent />
      </div>
    </AuthProvider>
  );
};

export default MainLayout;
