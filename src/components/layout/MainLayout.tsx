'use client';

import React, { useState, useEffect, startTransition, useCallback, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Navigation from './Navigation';
import RelatedPrivacyLinks from '../RelatedPrivacyLinks';
import ReferenceResources from '../content/ReferenceResources';
import Settings from '../content/Userpage/Settings';
import Sidebar from './Sidebar';
import Breadcrumbs from './Breadcrumbs';
import EventInfo from '../content/EventInfo';
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
import NewsFeed from '../content/news/NewsFeed';
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
import PdfDiffTool from '../content/Userpage/PdfDiffTool';
import GeneralTools from '../content/Userpage/general-tools/GeneralTools';
import ContactsManagement from '../content/Userpage/ContactsManagement';
import DesignTools from '../content/Userpage/DesignTools';
import DesignInfo from '../content/Userpage/DesignInfo';
import MaterialInfo from '../content/Userpage/MaterialInfo';
import Userpage_top from '../content/Userpage/Userpage_top';
import Qualifications from '../content/Qualifications';
import QualificationsVideos from '../content/QualificationsVideos';
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
import PublicWorksList from '../PublicWorksList';
import { AuthProvider, useAuth } from '../../lib/AuthContext';
import CookieConsent from './CookieConsent';
import Footer from './Footer';
import UserpageBottomBar from './UserpageBottomBar';
import { db } from '../../lib/firebaseClient';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { usePersistentState } from '../../lib/usePersistentState';

interface MainLayoutProps {
  children?: React.ReactNode;
  initialContent?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, initialContent = 'topix' }) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URLパスからactiveContentを決定
  // ブラウザ更新時は常にトップページに戻る
  const getInitialContent = () => {
    // トップページ（/）の場合はinitialContentを使用、それ以外は常に'topix'を返す
    const normalizedPathname = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
    return normalizedPathname === '/' ? initialContent : 'topix';
  };
  
  const [activeContent, setActiveContent] = useState<string>(getInitialContent());
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
    const userpageMenus = ['my-calendar', 'my-regulations', 'my-tasks', 'team-tasks', 'pdf-diff', 'general-tools', 'design-tools', 'design-info', 'material-info', 'contacts', 'settings', 'yychat', 'yymail', 'userpage-top'];
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
    const urlRoutedPaths = [
      '/event', '/news', '/new-products', '/books-software', '/pickup',
      '/regulations', '/qualifications', '/landscape-cad', '/shop',
      '/projects', '/competitions', '/construction-companies', '/design-offices',
      '/job-info', '/public-works', '/forum',
      '/roof', '/exterior-wall', '/opening', '/external-floor', '/exterior-other',
      '/internal-floor', '/internal-wall', '/internal-ceiling', '/internal-other',
      '/waterproof', '/hardware', '/furniture', '/electrical-systems',
      '/mechanical-systems', '/exterior-infrastructure', '/exterior',
    ];
    if (urlRoutedPaths.includes(normalizedPathname)) {
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
      const userpageMenus = ['my-calendar', 'my-regulations', 'my-tasks', 'team-tasks', 'pdf-diff', 'general-tools', 'design-tools', 'design-info', 'material-info', 'contacts', 'settings', 'yychat', 'yymail'];
      
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
  }, []);
  const { isLoggedIn, currentUser } = useAuth();
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
  useEffect(() => {
    console.log('[MainLayout] pathname changed:', pathname);
    // trailingSlash: trueの設定により、pathnameは末尾にスラッシュが付く可能性があるため、正規化する
    const normalizedPathname = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
    console.log('[MainLayout] normalized pathname:', normalizedPathname);
    
    const pathToContentMap: Record<string, string> = {
      '/event': 'event',
      '/news': 'news',
      '/new-products': 'new-products',
      '/books-software': 'books-software',
      '/pickup': 'pickup',
      '/regulations': 'regulations',
      '/qualifications': 'qualifications',
      '/landscape-cad': 'landscape-cad',
      '/shop': 'shop',
      '/projects': 'projects',
      '/competitions': 'competitions',
      '/construction-companies': 'construction-companies',
      '/design-offices': 'design-offices',
      '/job-info': 'job-info',
      '/public-works': 'public-works',
      '/forum': 'forum',
      '/roof': 'roof',
      '/exterior-wall': 'exterior-wall',
      '/opening': 'opening',
      '/external-floor': 'external-floor',
      '/exterior-other': 'exterior-other',
      '/internal-floor': 'internal-floor',
      '/internal-wall': 'internal-wall',
      '/internal-ceiling': 'internal-ceiling',
      '/internal-other': 'internal-other',
      '/waterproof': 'waterproof',
      '/hardware': 'hardware',
      '/furniture': 'furniture',
      '/electrical-systems': 'electrical-systems',
      '/mechanical-systems': 'mechanical-systems',
      '/exterior-infrastructure': 'exterior-infrastructure',
      '/exterior': 'exterior',
    };
    
    const content = pathToContentMap[normalizedPathname];
    console.log('[MainLayout] content from pathname:', content);
    if (content) {
      console.log('[MainLayout] setting activeContent to:', content);
      setActiveContent(content);
      
      // クエリパラメータからサブカテゴリーを設定
      const subcategory = searchParams.get('subcategory');
      if (subcategory) {
        // サブカテゴリーに応じて適切なstateを更新
        handleSubcategoryFromQuery(content, subcategory);
      }
    }
    // pathname === '/'の場合は、handleMenuClickで管理されるため、ここでは何もしない
    // URLベースのルーティングがないページでは、activeContentはhandleMenuClickで管理される（SPA的な動作を維持）
  }, [pathname, searchParams, handleSubcategoryFromQuery]);
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
  const [searchActive, setSearchActive] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
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
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [mobileRoofOpen, setMobileRoofOpen] = useState<boolean>(false);
  const [mobileExteriorWallOpen, setMobileExteriorWallOpen] = useState<boolean>(false);
  const [mobileOpeningOpen, setMobileOpeningOpen] = useState<boolean>(false);
  const [mobileExteriorWallFinishOpen, setMobileExteriorWallFinishOpen] = useState<boolean>(false);
  const [mobileExternalFloorOpen, setMobileExternalFloorOpen] = useState<boolean>(false);
  const [mobileExteriorOtherOpen, setMobileExteriorOtherOpen] = useState<boolean>(false);
  const [mobileInternalFloorOpen, setMobileInternalFloorOpen] = useState<boolean>(false);
  const [mobileInternalWallOpen, setMobileInternalWallOpen] = useState<boolean>(false);
  const [mobileInternalCeilingOpen, setMobileInternalCeilingOpen] = useState<boolean>(false);
  const [mobileInternalOtherOpen, setMobileInternalOtherOpen] = useState<boolean>(false);
  const [mobileWaterproofOpen, setMobileWaterproofOpen] = useState<boolean>(false);
  const [mobileHardwareOpen, setMobileHardwareOpen] = useState<boolean>(false);
  const [mobileFurnitureOpen, setMobileFurnitureOpen] = useState<boolean>(false);
  const [mobileElectricalSystemsOpen, setMobileElectricalSystemsOpen] = useState<boolean>(false);
  const [mobileMechanicalSystemsOpen, setMobileMechanicalSystemsOpen] = useState<boolean>(false);
  const [mobileExteriorInfrastructureOpen, setMobileExteriorInfrastructureOpen] = useState<boolean>(false);
  const [mobileExteriorOpen, setMobileExteriorOpen] = useState<boolean>(false);

  const handleSearchActiveChange = (active: boolean) => {
    setSearchActive(active);
    if (!active) {
      setSearchQuery('');
    }
  };

  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleMenuClick = (menuItem: string) => {
    console.log('Menu clicked:', menuItem);
    
    // URLベースのルーティングを使用するメニューは、Navigation.tsxで処理される
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
      'roof': '/roof',
      'exterior-wall': '/exterior-wall',
      'opening': '/opening',
      'external-floor': '/external-floor',
      'exterior-other': '/exterior-other',
      'internal-floor': '/internal-floor',
      'internal-wall': '/internal-wall',
      'internal-ceiling': '/internal-ceiling',
      'internal-other': '/internal-other',
      'waterproof': '/waterproof',
      'hardware': '/hardware',
      'furniture': '/furniture',
      'electrical-systems': '/electrical-systems',
      'mechanical-systems': '/mechanical-systems',
      'exterior-infrastructure': '/exterior-infrastructure',
      'exterior': '/exterior',
    };
    
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
      setSearchActive(false);
      setSearchQuery('');
      try {
        window.dispatchEvent(new Event('yaneyuka:search-clear'));
      } catch {}

      return;
    }
    
    // Userpageのツールに遷移する場合、履歴を追加
    const userpageMenus = ['my-calendar', 'my-regulations', 'my-tasks', 'team-tasks', 'pdf-diff', 'general-tools', 'design-tools', 'design-info', 'material-info', 'contacts', 'settings', 'yychat', 'yymail'];
    const isUserpageMenu = userpageMenus.includes(menuItem);
    
    // activeContentを先に更新（白フラッシュを防ぐため）
    const currentContent = activeContent;
    setActiveContent(menuItem);
    activeContentRef.current = menuItem; // refも即座に更新（pathname変更useEffectとの競合を防ぐ）
    
    if (isUserpageMenu) {
      // 現在のactiveContentを保存
      previousContentRef.current = currentContent;
      // Userpage_topから来たかどうかを記録
      const fromUserpageTop = currentContent === 'userpage-top';
      // 履歴に追加（URLは変更せずactiveContentのみ切り替え）
      try {
        window.history.pushState({ content: menuItem, previousContent: currentContent, fromUserpageTop }, '', '/');
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
    setSearchActive(false);
    setSearchQuery('');
    try {
      window.dispatchEvent(new Event('yaneyuka:search-clear'));
    } catch {}
    
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

  // ハンバーガーメニューが開いている時、背景のスクロールを無効化（スマホのみ）
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    
    try {
      if (mobileMenuOpen) {
        // モバイル表示時のみスクロールを無効化
        const isMobile = window.innerWidth < 1024; // lg breakpoint
        if (isMobile) {
          const scrollY = window.scrollY;
          document.body.style.position = 'fixed';
          document.body.style.top = `-${scrollY}px`;
          document.body.style.width = '100%';
          document.body.style.overflow = 'hidden';
          // htmlには設定しない（ハンバーガーメニュー内のスクロールを維持）
        }
      } else {
        const scrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        if (scrollY) {
          window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
      }
    } catch (error) {
      console.warn('Failed to handle mobile menu scroll:', error);
    }
    
    return () => {
      if (typeof document !== 'undefined' && document.body) {
        try {
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.width = '';
          document.body.style.overflow = '';
        } catch (error) {
          // エラーを無視
        }
      }
    };
  }, [mobileMenuOpen]);

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

  const handleSubcategoryClick = (subcategory: string) => {
    console.log('Subcategory clicked:', subcategory);
    
    // カテゴリーページのURLマッピング
    const categoryRouteMap: Record<string, string> = {
      'roof': '/roof',
      'exterior-wall': '/exterior-wall',
      'opening': '/opening',
      'external-floor': '/external-floor',
      'exterior-other': '/exterior-other',
      'internal-floor': '/internal-floor',
      'internal-wall': '/internal-wall',
      'internal-ceiling': '/internal-ceiling',
      'internal-other': '/internal-other',
      'waterproof': '/waterproof',
      'hardware': '/hardware',
      'furniture': '/furniture',
      'electrical-systems': '/electrical-systems',
      'mechanical-systems': '/mechanical-systems',
      'exterior-infrastructure': '/exterior-infrastructure',
      'exterior': '/exterior',
    };
    
    // サブカテゴリーからカテゴリーを判定
    const getCategoryFromSubcategory = (sub: string): string | null => {
      const roofSubcategories = ['折板', '金属屋根', 'スレート', '瓦', '屋根その他'];
      if (roofSubcategories.includes(sub)) return 'roof';
      
      const exteriorWallSubcategories = ['alc', 'ecp', '金属サイディング', '窯業サイディング', 'metalpanel', 'exterior-wall-other', 'paint', 'plaster', 'tile', 'stone-brick', 'metal-panel', 'wood-board', 'decorative', 'other-finish'];
      if (exteriorWallSubcategories.includes(sub)) return 'exterior-wall';
      
      const openingSubcategories = ['aluminum-sash', 'resin-sash', 'wood-sash', 'light-shutter', 'heavy-shutter'];
      if (openingSubcategories.includes(sub)) return 'opening';
      
      const externalFloorSubcategories = ['external-tile', 'external-stone-brick', 'pvc-sheet', 'external-finish'];
      if (externalFloorSubcategories.includes(sub)) return 'external-floor';
      
      const exteriorOtherSubcategories = ['笠木水切', '庇オーニング', '雨どい', 'ハト小屋', '太陽光パネル', '手摺'];
      if (exteriorOtherSubcategories.includes(sub)) return 'exterior-other';
      
      const internalFloorSubcategories = ['フローリング', 'ビニールタイル', 'ビニールシート', 'カーペット', '内装タイル', '内装床石レンガ', '畳', '巾木床見切', '内装床機能性', '内装床その他'];
      if (internalFloorSubcategories.includes(sub)) return 'internal-floor';
      
      const internalWallSubcategories = ['内装壁壁紙', '内装壁化粧板', '内装壁化粧シート', '内装壁化粧パネル', '内装壁金属板', '内装壁塗り壁', '内装壁タイル', '内装壁石レンガ', '内装壁装飾材', '内装壁機能性', '内装壁壁見切', '内装壁その他'];
      if (internalWallSubcategories.includes(sub)) return 'internal-wall';
      
      const internalCeilingSubcategories = ['内装天井ボード', '内装天井化粧材', '内装天井装飾材', '内装天井機能性', '内装天井その他'];
      if (internalCeilingSubcategories.includes(sub)) return 'internal-ceiling';
      
      const internalOtherSubcategories = ['トイレブース', '内装サッシ', '内装シャッター', 'ノンスリップ', '内装手摺', 'グレーチング', '内装緑化', '点検口', '隔壁', '保護材', '点字', 'ディスプレイ', '内装その他製品'];
      if (internalOtherSubcategories.includes(sub)) return 'internal-other';
      
      const waterproofSubcategories = ['ウレタン防水', 'アスファルト防水', 'シート防水', 'FRP防水', '防水その他'];
      if (waterproofSubcategories.includes(sub)) return 'waterproof';
      
      const hardwareSubcategories = ['ハンドル', '引棒', '建具金物', '棚フック', 'サニタリー', '家具金物', '鍵関係', 'EXP,J', '金物その他'];
      if (hardwareSubcategories.includes(sub)) return 'hardware';
      
      const furnitureSubcategories = ['家具', 'カーテン', 'ブラインド', '生地', 'ファニチャーその他'];
      if (furnitureSubcategories.includes(sub)) return 'furniture';
      
      const electricalSystemsSubcategories = ['照明', '外構照明', 'スイッチコンセント', '発電機', '電気設備その他'];
      if (electricalSystemsSubcategories.includes(sub)) return 'electrical-systems';
      
      const mechanicalSystemsSubcategories = ['水栓', '衛生機器', '住宅設備', 'キッチン', '空調機', '機械設備その他'];
      if (mechanicalSystemsSubcategories.includes(sub)) return 'mechanical-systems';
      
      const exteriorInfrastructureSubcategories = ['縁石', '外構舗装', '雨水桝', '桝蓋', '外構グレーチング', '外構その他'];
      if (exteriorInfrastructureSubcategories.includes(sub)) return 'exterior-infrastructure';
      
      const exteriorSubcategories = ['宅配ボックス', '郵便受け', '表札', '門扉', 'フェンス', 'カーポート', '大型引戸', 'ウッドデッキ', '駐輪場', 'ゴミストッカー', 'エクステリア緑化', 'エクステリアその他'];
      if (exteriorSubcategories.includes(sub)) return 'exterior';
      
      return null;
    };
    
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
      'forum': '/forum',
    };
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

    // ファニチャーの小カテゴリーがクリックされた場合
    const furnitureSubcategories = ['家具', 'カーテン', 'ブラインド', '生地', 'ファニチャーその他'];
    if (furnitureSubcategories.includes(subcategory)) {
      console.log('Setting furniture content with subcategory:', subcategory);
      setActiveContent('furniture');
      setFurnitureSubcategory(subcategory);
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

    // 金物の小カテゴリーがクリックされた場合
    const hardwareSubcategories = ['ハンドル', '引棒', '建具金物', '棚フック', 'サニタリー', '家具金物', '鍵関係', 'EXP,J', '金物その他'];
    if (hardwareSubcategories.includes(subcategory)) {
      console.log('Setting hardware content with subcategory:', subcategory);
      setActiveContent('hardware');
      setHardwareSubcategory(subcategory);
      setFurnitureSubcategory('');
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

    // 防水の小カテゴリーがクリックされた場合
    const waterproofSubcategories = ['ウレタン防水', 'アスファルト防水', 'シート防水', 'FRP防水', '防水その他'];
    if (waterproofSubcategories.includes(subcategory)) {
      console.log('Setting waterproof content with subcategory:', subcategory);
      setActiveContent('waterproof');
      setWaterproofSubcategory(subcategory);
      setFurnitureSubcategory('');
      setHardwareSubcategory('');
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

    // 電気設備の小カテゴリーがクリックされた場合
    const electricalSystemsSubcategories = ['照明', '外構照明', 'スイッチコンセント', '発電機', '電気設備その他'];
    if (electricalSystemsSubcategories.includes(subcategory)) {
      console.log('Setting electrical systems content with subcategory:', subcategory);
      setActiveContent('electrical-systems');
      setElectricalSystemsSubcategory(subcategory);
      setWaterproofSubcategory('');
      setHardwareSubcategory('');
      setFurnitureSubcategory('');
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

    // 機械設備の小カテゴリーがクリックされた場合
    const mechanicalSystemsSubcategories = ['水栓', '衛生機器', '住宅設備', 'キッチン', '空調機', '機械設備その他'];
    if (mechanicalSystemsSubcategories.includes(subcategory)) {
      console.log('Setting mechanical systems content with subcategory:', subcategory);
      setActiveContent('mechanical-systems');
      setMechanicalSystemsSubcategory(subcategory);
      setElectricalSystemsSubcategory('');
      setWaterproofSubcategory('');
      setHardwareSubcategory('');
      setFurnitureSubcategory('');
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

    // 外構の小カテゴリーがクリックされた場合
    const exteriorInfrastructureSubcategories = ['縁石', '外構舗装', '雨水桝', '桝蓋', '外構グレーチング', '外構その他'];
    if (exteriorInfrastructureSubcategories.includes(subcategory)) {
      console.log('Setting exterior infrastructure content with subcategory:', subcategory);
      setActiveContent('exterior-infrastructure');
      setExteriorInfrastructureSubcategory(subcategory);
      setMechanicalSystemsSubcategory('');
      setElectricalSystemsSubcategory('');
      setWaterproofSubcategory('');
      setHardwareSubcategory('');
      setFurnitureSubcategory('');
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

    // エクステリアの小カテゴリーがクリックされた場合
    const exteriorSubcategories = ['宅配ボックス', '郵便受け', '表札', '門扉', 'フェンス', 'カーポート', '大型引戸', 'ウッドデッキ', '駐輪場', 'ゴミストッカー', 'エクステリア緑化', 'エクステリアその他'];
    if (exteriorSubcategories.includes(subcategory)) {
      console.log('Setting exterior content with subcategory:', subcategory);
      setActiveContent('exterior');
      setExteriorSubcategory(subcategory);
      setExteriorInfrastructureSubcategory('');
      setMechanicalSystemsSubcategory('');
      setElectricalSystemsSubcategory('');
      setWaterproofSubcategory('');
      setHardwareSubcategory('');
      setFurnitureSubcategory('');
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
    
    // 屋根の小カテゴリーがクリックされた場合
    const roofSubcategories = ['折板', '金属屋根', 'スレート', '瓦', '屋根その他'];
    if (roofSubcategories.includes(subcategory)) {
      console.log('Setting roof content with subcategory:', subcategory);
      setActiveContent('roof');
      setRoofSubcategory(subcategory);
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
      return;
    }

    // 外壁の小カテゴリーがクリックされた場合
    const exteriorWallSubcategories = ['alc', 'ecp', '金属サイディング', '窯業サイディング', 'metalpanel', 'exterior-wall-other', 'paint', 'plaster', 'tile', 'stone-brick', 'metal-panel', 'wood-board', 'decorative', 'other-finish'];
    if (exteriorWallSubcategories.includes(subcategory)) {
      console.log('Setting exterior wall content with subcategory:', subcategory);
      setActiveContent('exterior-wall');
      setExteriorWallSubcategory(subcategory);
      setRoofSubcategory('');
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
      return;
    }

    // 開口部の小カテゴリーがクリックされた場合
    const openingSubcategories = ['aluminum-sash', 'resin-sash', 'wood-sash', 'light-shutter', 'heavy-shutter'];
    if (openingSubcategories.includes(subcategory)) {
      console.log('Setting opening content with subcategory:', subcategory);
      setActiveContent('opening');
      setOpeningSubcategory(subcategory);
      setRoofSubcategory('');
      setExteriorWallSubcategory('');
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
      return;
    }

    // 外部床の小カテゴリーがクリックされた場合
    const externalFloorSubcategories = ['external-tile', 'external-stone-brick', 'pvc-sheet', 'external-finish'];
    if (externalFloorSubcategories.includes(subcategory)) {
      console.log('Setting external floor content with subcategory:', subcategory);
      setActiveContent('external-floor');
      setExternalFloorSubcategory(subcategory);
      setRoofSubcategory('');
      setExteriorWallSubcategory('');
      setOpeningSubcategory('');
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
      return;
    }

    // 外部その他の小カテゴリーがクリックされた場合
    const exteriorOtherSubcategories = ['笠木水切', '庇オーニング', '雨どい', 'ハト小屋', '太陽光パネル', '手摺'];
    if (exteriorOtherSubcategories.includes(subcategory)) {
      console.log('Setting exterior other content with subcategory:', subcategory);
      setActiveContent('exterior-other');
      setExteriorOtherSubcategory(subcategory);
      setRoofSubcategory('');
      setExteriorWallSubcategory('');
      setOpeningSubcategory('');
      setExternalFloorSubcategory('');
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
      return;
    }

    // 内部床材の小カテゴリーがクリックされた場合
    const internalFloorSubcategories = ['フローリング', 'ビニールタイル', 'ビニールシート', 'カーペット', '内装タイル', '内装床石レンガ', '畳', '巾木床見切', '内装床機能性', '内装床その他'];
    if (internalFloorSubcategories.includes(subcategory)) {
      console.log('Setting internal floor content with subcategory:', subcategory);
      setActiveContent('internal-floor');
      setInternalFloorSubcategory(subcategory);
      setRoofSubcategory('');
      setExteriorWallSubcategory('');
      setOpeningSubcategory('');
      setExternalFloorSubcategory('');
      setExteriorOtherSubcategory('');
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
      return;
    }

    // 内装壁材の小カテゴリーがクリックされた場合
    const internalWallSubcategories = ['内装壁壁紙', '内装壁化粧板', '内装壁化粧シート', '内装壁化粧パネル', '内装壁金属板', '内装壁塗り壁', '内装壁タイル', '内装壁石レンガ', '内装壁装飾材', '内装壁機能性', '内装壁壁見切', '内装壁その他'];
    if (internalWallSubcategories.includes(subcategory)) {
      console.log('Setting internal wall content with subcategory:', subcategory);
      setActiveContent('internal-wall');
      setInternalWallSubcategory(subcategory);
      setRoofSubcategory('');
      setExteriorWallSubcategory('');
      setOpeningSubcategory('');
      setExternalFloorSubcategory('');
      setExteriorOtherSubcategory('');
      setInternalFloorSubcategory('');
      setInternalCeilingSubcategory('');
      setInternalOtherSubcategory('');
      setWaterproofSubcategory('');
      setHardwareSubcategory('');
      setFurnitureSubcategory('');
      setElectricalSystemsSubcategory('');
      setMechanicalSystemsSubcategory('');
      setExteriorInfrastructureSubcategory('');
      setExteriorSubcategory('');
      return;
    }

    // 内装天井材の小カテゴリーがクリックされた場合
    const internalCeilingSubcategories = ['内装天井ボード', '内装天井化粧材', '内装天井装飾材', '内装天井機能性', '内装天井その他'];
    if (internalCeilingSubcategories.includes(subcategory)) {
      console.log('Setting internal ceiling content with subcategory:', subcategory);
      setActiveContent('internal-ceiling');
      setInternalCeilingSubcategory(subcategory);
      setRoofSubcategory('');
      setExteriorWallSubcategory('');
      setOpeningSubcategory('');
      setExternalFloorSubcategory('');
      setExteriorOtherSubcategory('');
      setInternalFloorSubcategory('');
      setInternalWallSubcategory('');
      setInternalOtherSubcategory('');
      setWaterproofSubcategory('');
      setHardwareSubcategory('');
      setFurnitureSubcategory('');
      setElectricalSystemsSubcategory('');
      setMechanicalSystemsSubcategory('');
      setExteriorInfrastructureSubcategory('');
      setExteriorSubcategory('');
      return;
    }

    // 内装その他の小カテゴリーがクリックされた場合
    const internalOtherSubcategories = ['トイレブース', '内装サッシ', '内装シャッター', 'ノンスリップ', '内装手摺', 'グレーチング', '内装緑化', '点検口', '隔壁', '保護材', '点字', 'ディスプレイ', '内装その他製品'];
    if (internalOtherSubcategories.includes(subcategory)) {
      console.log('Setting internal other content with subcategory:', subcategory);
      setActiveContent('internal-other');
      setInternalOtherSubcategory(subcategory);
      setRoofSubcategory('');
      setExteriorWallSubcategory('');
      setOpeningSubcategory('');
      setExternalFloorSubcategory('');
      setExteriorOtherSubcategory('');
      setInternalFloorSubcategory('');
      setInternalWallSubcategory('');
      setInternalCeilingSubcategory('');
      setWaterproofSubcategory('');
      setHardwareSubcategory('');
      setFurnitureSubcategory('');
      setElectricalSystemsSubcategory('');
      setMechanicalSystemsSubcategory('');
      setExteriorInfrastructureSubcategory('');
      setExteriorSubcategory('');
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
      const exteriorFinishSubcategories = ['paint', 'plaster', 'tile', 'stone-brick', 'metal-panel', 'wood-board', 'decorative', 'other-finish'];
      if (exteriorFinishSubcategories.includes(exteriorWallSubcategory)) {
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
      case 'pdf-diff':
        return <PdfDiffTool />;
      case 'general-tools':
        return <GeneralTools />;
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
    const userpageMenus = ['my-calendar', 'my-regulations', 'my-tasks', 'team-tasks', 'pdf-diff', 'general-tools', 'design-tools', 'design-info', 'material-info', 'contacts', 'settings', 'yychat', 'yymail', 'userpage-top'];
    return userpageMenus.includes(activeContent);
  };

  return (
    <AuthProvider>
      <div className="min-h-screen">
        {/* サイト全体パスワードゲート（本番のみ有効） */}
        {/* Navigationはmain-layout-container内で左カラムの右に配置 */}
        {/* ハンバーガーメニュー（モバイルのみ） */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 bg-white" style={{ top: 'var(--header-height)', height: 'calc(100vh - var(--header-height))', zIndex: 2147483647 }}>
            <div className="h-full overflow-y-auto">
              <div className="px-4 py-2 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-700">Menu</h2>
              </div>
              <div className="space-y-0">
                {/* メインナビゲーション項目 */}
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
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleMenuClick(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 ${activeContent === item.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    {item.label}
                  </button>
                ))}
                {/* Userpage */}
                <button
                  onClick={() => {
                    handleMenuClick('userpage-top');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100"
                >
                  Userpage
                </button>
                {/* 区切り */}
                <div className="border-b-2 border-gray-300 my-1"></div>
                {/* 新規会員登録 */}
                <button
                  onClick={() => {
                    handleMenuClick('register');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100"
                >
                  新規会員登録
                </button>
                {/* ログイン */}
                <button
                  onClick={() => {
                    handleMenuClick('login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100"
                >
                  ログイン
                </button>
                {/* 掲載希望はコチラ */}
                <button
                  onClick={() => {
                    handleMenuClick('registration');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100"
                >
                  掲載希望はコチラ
                </button>
                {/* ご意見・ご要望 */}
                <button
                  onClick={() => {
                    handleMenuClick('feedback');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100"
                >
                  ご意見・ご要望
                </button>
                {/* プライバシーポリシー */}
                <button
                  onClick={() => {
                    handleMenuClick('privacy-policy');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100"
                >
                  プライバシーポリシー
                </button>
                {/* 建材検索 */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      // 建材検索はサイドバーを表示するだけなので、メニューを閉じるだけ
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    建材検索
                  </button>
                </div>
                {/* Market conect */}
                <button
                  onClick={() => {
                    handleMenuClick('makerconect');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100"
                >
                  Market conect
                </button>
                {/* Chatbot */}
                <button
                  onClick={() => {
                    handleMenuClick('chatbot');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100"
                >
                  Chatbot
                </button>
                {/* トグル屋根 */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => setMobileRoofOpen(!mobileRoofOpen)}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>屋根</span>
                    <span className={`transform transition-transform ${mobileRoofOpen ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                  {mobileRoofOpen && (
                    <ul className="bg-gray-50">
                      <li>
                        <button
                          onClick={() => {
                            handleSubcategoryClick('折板');
                            setMobileMenuOpen(false);
                          }}
                          className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          折板
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            handleSubcategoryClick('金属屋根');
                            setMobileMenuOpen(false);
                          }}
                          className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          金属屋根
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            handleSubcategoryClick('スレート');
                            setMobileMenuOpen(false);
                          }}
                          className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          スレート
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            handleSubcategoryClick('瓦');
                            setMobileMenuOpen(false);
                          }}
                          className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          瓦
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            handleSubcategoryClick('屋根その他');
                            setMobileMenuOpen(false);
                          }}
                          className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          その他
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
                {/* トグル外壁 */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => setMobileExteriorWallOpen(!mobileExteriorWallOpen)}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>外壁</span>
                    <span className={`transform transition-transform ${mobileExteriorWallOpen ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                  {mobileExteriorWallOpen && (
                    <ul className="bg-gray-50">
                      <li>
                        <button
                          onClick={() => {
                            handleSubcategoryClick('alc');
                            setMobileMenuOpen(false);
                          }}
                          className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          ALC
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            handleSubcategoryClick('ecp');
                            setMobileMenuOpen(false);
                          }}
                          className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          ECPパネル
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            handleSubcategoryClick('金属サイディング');
                            setMobileMenuOpen(false);
                          }}
                          className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          金属サイディング
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            handleSubcategoryClick('窯業サイディング');
                            setMobileMenuOpen(false);
                          }}
                          className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          窯業サイディング
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            handleSubcategoryClick('metalpanel');
                            setMobileMenuOpen(false);
                          }}
                          className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          金属パネル
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            handleSubcategoryClick('exterior-wall-other');
                            setMobileMenuOpen(false);
                          }}
                          className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          その他
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
                {/* トグル開口部 */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => setMobileOpeningOpen(!mobileOpeningOpen)}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>開口部</span>
                    <span className={`transform transition-transform ${mobileOpeningOpen ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                  {mobileOpeningOpen && (
                    <ul className="bg-gray-50">
                      <li><button onClick={() => { handleSubcategoryClick('aluminum-sash'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">アルミサッシ</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('resin-sash'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">樹脂サッシ</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('wood-sash'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">木製サッシ</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('light-shutter'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">軽量シャッター</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('heavy-shutter'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">重量シャッター</button></li>
                    </ul>
                  )}
                </div>
                {/* トグル外壁仕上げ */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => setMobileExteriorWallFinishOpen(!mobileExteriorWallFinishOpen)}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>外壁仕上げ</span>
                    <span className={`transform transition-transform ${mobileExteriorWallFinishOpen ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                  {mobileExteriorWallFinishOpen && (
                    <ul className="bg-gray-50">
                      <li><button onClick={() => { handleSubcategoryClick('paint'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">塗装</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('plaster'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">塗り壁</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('tile'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">タイル</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('stone-brick'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">石・レンガ</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('metal-panel'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">金属パネル</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('wood-board'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">木板材</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('decorative'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">装飾材</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('other-finish'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">その他</button></li>
                    </ul>
                  )}
                </div>
                {/* トグル外部床 */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => setMobileExternalFloorOpen(!mobileExternalFloorOpen)}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>外部床</span>
                    <span className={`transform transition-transform ${mobileExternalFloorOpen ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                  {mobileExternalFloorOpen && (
                    <ul className="bg-gray-50">
                      <li><button onClick={() => { handleSubcategoryClick('external-tile'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">タイル</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('external-stone-brick'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">石・レンガ</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('pvc-sheet'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">塩ビシート</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('external-finish'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">その他</button></li>
                    </ul>
                  )}
                </div>
                {/* トグル外部その他 */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => setMobileExteriorOtherOpen(!mobileExteriorOtherOpen)}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>外部その他</span>
                    <span className={`transform transition-transform ${mobileExteriorOtherOpen ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                  {mobileExteriorOtherOpen && (
                    <ul className="bg-gray-50">
                      <li><button onClick={() => { handleSubcategoryClick('笠木水切'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">笠木・水切</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('庇オーニング'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">庇・オーニング</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('雨どい'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">雨どい</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('ハト小屋'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">ハト小屋</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('太陽光パネル'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">太陽光パネル</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('手摺'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">手摺</button></li>
                    </ul>
                  )}
                </div>
                {/* トグル内部床材 */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => setMobileInternalFloorOpen(!mobileInternalFloorOpen)}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>内部床材</span>
                    <span className={`transform transition-transform ${mobileInternalFloorOpen ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                  {mobileInternalFloorOpen && (
                    <ul className="bg-gray-50">
                      <li><button onClick={() => { handleSubcategoryClick('フローリング'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">フローリング</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('ビニールタイル'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">ビニールタイル</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('ビニールシート'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">ビニールシート</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('カーペット'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">カーペット</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('内装タイル'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">タイル</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('内装床石レンガ'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">石・レンガ</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('畳'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">畳</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('巾木床見切'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">巾木・床見切</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('内装床機能性'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">機能性</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('内装床その他'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">その他</button></li>
                    </ul>
                  )}
                </div>
                {/* トグル内装壁材 */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => setMobileInternalWallOpen(!mobileInternalWallOpen)}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>内装壁材</span>
                    <span className={`transform transition-transform ${mobileInternalWallOpen ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                  {mobileInternalWallOpen && (
                    <ul className="bg-gray-50">
                      <li><button onClick={() => { handleSubcategoryClick('内装壁壁紙'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">壁紙</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('内装壁化粧板'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">化粧板</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('内装壁化粧シート'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">化粧シート</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('内装壁化粧パネル'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">化粧パネル</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('内装壁金属板'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">金属板</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('内装壁塗り壁'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">塗り壁</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('内装壁タイル'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">タイル</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('内装壁石レンガ'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">石・レンガ</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('内装壁装飾材'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">装飾材</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('内装壁機能性'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">機能性</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('内装壁壁見切'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">壁見切</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('内装壁その他'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">その他</button></li>
                    </ul>
                  )}
                </div>
                {/* トグル内装天井材 */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => setMobileInternalCeilingOpen(!mobileInternalCeilingOpen)}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>内装天井材</span>
                    <span className={`transform transition-transform ${mobileInternalCeilingOpen ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                  {mobileInternalCeilingOpen && (
                    <ul className="bg-gray-50">
                      <li><button onClick={() => { handleSubcategoryClick('内装天井ボード'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">ボード</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('内装天井化粧材'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">化粧材</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('内装天井装飾材'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">装飾材</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('内装天井機能性'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">機能性</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('内装天井その他'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">その他</button></li>
                    </ul>
                  )}
                </div>
                {/* トグル内装その他 */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => setMobileInternalOtherOpen(!mobileInternalOtherOpen)}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>内装その他</span>
                    <span className={`transform transition-transform ${mobileInternalOtherOpen ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                  {mobileInternalOtherOpen && (
                    <ul className="bg-gray-50">
                      <li><button onClick={() => { handleSubcategoryClick('トイレブース'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">トイレブース</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('内装サッシ'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">サッシ</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('内装シャッター'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">シャッター</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('ノンスリップ'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">ノンスリップ</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('内装手摺'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">手摺</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('グレーチング'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">グレーチング</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('内装緑化'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">緑化</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('点検口'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">点検口</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('隔壁'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">隔壁</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('保護材'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">保護材</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('点字'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">点字</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('ディスプレイ'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">ディスプレイ</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('内装その他製品'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">その他</button></li>
                    </ul>
                  )}
                </div>
                {/* トグル防水 */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => setMobileWaterproofOpen(!mobileWaterproofOpen)}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>防水</span>
                    <span className={`transform transition-transform ${mobileWaterproofOpen ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                  {mobileWaterproofOpen && (
                    <ul className="bg-gray-50">
                      <li><button onClick={() => { handleSubcategoryClick('ウレタン防水'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">ウレタン防水</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('アスファルト防水'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">アスファルト防水</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('シート防水'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">シート防水</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('FRP防水'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">FRP防水</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('防水その他'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">その他</button></li>
                    </ul>
                  )}
                </div>
                {/* トグル金物 */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => setMobileHardwareOpen(!mobileHardwareOpen)}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>金物</span>
                    <span className={`transform transition-transform ${mobileHardwareOpen ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                  {mobileHardwareOpen && (
                    <ul className="bg-gray-50">
                      <li><button onClick={() => { handleSubcategoryClick('ハンドル'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">ハンドル</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('引棒'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">引棒</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('建具金物'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">建具金物</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('棚フック'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">棚・フック他</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('サニタリー'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">サニタリー</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('家具金物'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">家具金物</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('鍵関係'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">鍵関係</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('EXP,J'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">EXP.J</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('金物その他'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">その他</button></li>
                    </ul>
                  )}
                </div>
                {/* トグルファニチャー */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => setMobileFurnitureOpen(!mobileFurnitureOpen)}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>ファニチャー</span>
                    <span className={`transform transition-transform ${mobileFurnitureOpen ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                  {mobileFurnitureOpen && (
                    <ul className="bg-gray-50">
                      <li><button onClick={() => { handleSubcategoryClick('家具'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">家具</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('カーテン'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">カーテン</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('ブラインド'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">ブラインド</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('生地'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">生地</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('ファニチャーその他'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">その他</button></li>
                    </ul>
                  )}
                </div>
                {/* トグル電気設備 */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => setMobileElectricalSystemsOpen(!mobileElectricalSystemsOpen)}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>電気設備</span>
                    <span className={`transform transition-transform ${mobileElectricalSystemsOpen ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                  {mobileElectricalSystemsOpen && (
                    <ul className="bg-gray-50">
                      <li><button onClick={() => { handleSubcategoryClick('照明'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">照明</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('外構照明'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">外構照明</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('スイッチコンセント'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">スイッチ・コンセント</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('発電機'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">発電機</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('電気設備その他'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">その他</button></li>
                    </ul>
                  )}
                </div>
                {/* トグル機械設備 */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => setMobileMechanicalSystemsOpen(!mobileMechanicalSystemsOpen)}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>機械設備</span>
                    <span className={`transform transition-transform ${mobileMechanicalSystemsOpen ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                  {mobileMechanicalSystemsOpen && (
                    <ul className="bg-gray-50">
                      <li><button onClick={() => { handleSubcategoryClick('水栓'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">水栓</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('衛生機器'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">衛生機器</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('住宅設備'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">住宅設備</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('キッチン'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">キッチン</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('空調機'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">空調機</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('機械設備その他'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">その他</button></li>
                    </ul>
                  )}
                </div>
                {/* トグル外構 */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => setMobileExteriorInfrastructureOpen(!mobileExteriorInfrastructureOpen)}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>外構</span>
                    <span className={`transform transition-transform ${mobileExteriorInfrastructureOpen ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                  {mobileExteriorInfrastructureOpen && (
                    <ul className="bg-gray-50">
                      <li><button onClick={() => { handleSubcategoryClick('縁石'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">縁石</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('外構舗装'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">舗装</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('雨水桝'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">雨水桝</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('桝蓋'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">桝蓋</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('外構グレーチング'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">グレーチング</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('外構その他'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">その他</button></li>
                    </ul>
                  )}
                </div>
                {/* トグルエクステリア */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => setMobileExteriorOpen(!mobileExteriorOpen)}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>エクステリア</span>
                    <span className={`transform transition-transform ${mobileExteriorOpen ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                  {mobileExteriorOpen && (
                    <ul className="bg-gray-50">
                      <li><button onClick={() => { handleSubcategoryClick('宅配ボックス'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">宅配ボックス</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('郵便受け'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">郵便受け</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('表札'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">表札</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('門扉'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">門扉</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('フェンス'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">フェンス</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('カーポート'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">カーポート</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('大型引戸'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">大型引戸</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('ウッドデッキ'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">ウッドデッキ</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('駐輪場'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">駐輪場</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('ゴミストッカー'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">ゴミストッカー</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('エクステリア緑化'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">緑化</button></li>
                      <li><button onClick={() => { handleSubcategoryClick('エクステリアその他'); setMobileMenuOpen(false); }} className="w-full text-left px-8 py-2 text-xs text-gray-600 hover:bg-gray-100">その他</button></li>
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        <div id="gcse-results-wrapper" className={`${searchActive ? 'block' : 'hidden'} w-full px-2 md:px-4 lg:px-8`}>
          {/* ★追加: ダークモード時のスタイル定義 (isDarkModeがtrueの時だけ適用) */}
          {isDarkMode && (
            <style dangerouslySetInnerHTML={{
              __html: `
                .gsc-control-cse {
                  background-color: #202124 !important;
                  border: none !important;
                  padding: 1em !important;
                }
                .gsc-webResult.gsc-result {
                  background-color: #202124 !important;
                  border-bottom: 1px solid #3c4043 !important;
                }
                .gsc-webResult.gsc-result:hover {
                  background-color: #202124 !important;
                }
                .gs-webResult.gs-result a.gs-title:link,
                .gs-webResult.gs-result a.gs-title:link b,
                .gs-webResult.gs-result a.gs-title:visited,
                .gs-webResult.gs-result a.gs-title:visited b {
                  color: #a8c8ff !important;
                  text-decoration: none !important;
                }
                .gs-webResult.gs-result a.gs-title:hover {
                  text-decoration: underline !important;
                }
                .gsc-webResult.gsc-result .gs-snippet {
                  color: #e8eaed !important;
                }
                .gsc-url-top, .gs-visibleUrl {
                  color: #bdc1c6 !important;
                }
                .gsc-cursor-page {
                  color: #a8c8ff !important;
                }
                .gsc-cursor-current-page {
                  color: #fff !important;
                }
                #gcse-results-wrapper {
                  background-color: #202124;
                }
                #gcse-results-wrapper h2 {
                  color: #e8eaed !important;
                }
                #gcse-results-wrapper .text-gray-700 {
                  color: #e8eaed !important;
                }
                #gcse-results-wrapper .text-gray-500 {
                  color: #bdc1c6 !important;
                }
                #gcse-results-wrapper .text-gray-600 {
                  color: #e8eaed !important;
                }
                #gcse-results-wrapper button {
                  color: #e8eaed !important;
                  border-color: #5f6368 !important;
                }
                #gcse-results-wrapper button:hover {
                  background-color: #303134 !important;
                }
                .gsc-above-wrapper-area,
                .gsc-above-wrapper-area-container {
                  color: #e8eaed !important;
                }
                .gsc-tabHeader,
                .gsc-tabHeader.gsc-tabhActive {
                  color: #e8eaed !important;
                }
                .gsc-tabHeader.gsc-tabhActive {
                  border-bottom-color: #a8c8ff !important;
                }
                .gsc-result-info,
                .gsc-result-info-container {
                  color: #e8eaed !important;
                }
                .gsc-orderby-label {
                  color: #e8eaed !important;
                }
                .gsc-orderby {
                  background-color: #202124 !important;
                  border-color: #202124 !important;
                  color: #e8eaed !important;
                  box-shadow: none !important;
                }
                .gsc-selected-option-container {
                  background-color: #202124 !important;
                  border-color: #202124 !important;
                  box-shadow: none !important;
                }
                .gsc-selected-option-container .gsc-selected-option {
                  color: #e8eaed !important;
                }
                /* ボタン内のテキスト（Relevance、Dateなど）は明るい色のまま */
                .gsc-orderby .gsc-selected-option,
                .gsc-orderby .gsc-orderby-label,
                .gsc-selected-option-container .gsc-selected-option {
                  color: #e8eaed !important;
                }
                /* ボタンのホバー時のハイライトを削除 */
                .gsc-orderby:hover,
                .gsc-selected-option-container:hover {
                  background-color: #202124 !important;
                  border-color: #202124 !important;
                  box-shadow: none !important;
                }
                /* ドロップダウンメニューの背景も調整 */
                .gsc-orderby-container {
                  background-color: #202124 !important;
                  border-color: #202124 !important;
                  box-shadow: none !important;
                }
                .gsc-orderby-container .gsc-orderby {
                  background-color: #202124 !important;
                  border-color: #202124 !important;
                }
                /* ドロップダウンメニューが開いた時のスタイル */
                .gsc-orderby-container.gsc-orderby-container-active {
                  background-color: #202124 !important;
                  border-color: #202124 !important;
                  box-shadow: none !important;
                }
                .gsc-orderby-container .gsc-orderby-label {
                  color: #e8eaed !important;
                }
                .gsc-option {
                  color: #e8eaed !important;
                  background-color: #202124 !important;
                }
                .gsc-option-selected {
                  background-color: #303134 !important;
                  color: #a8c8ff !important;
                }
                .gsc-option:hover {
                  background-color: #303134 !important;
                }
                .gsc-orderby-container .gsc-selected-option {
                  color: #e8eaed !important;
                }
                /* ドロップダウンメニューのリストコンテナ */
                .gsc-orderby-container .gsc-option-container {
                  background-color: #202124 !important;
                  border-color: #202124 !important;
                  box-shadow: none !important;
                }
                /* ドロップダウンメニューのオーバーレイ */
                .gsc-orderby-container .gsc-orderby-overlay {
                  background-color: #202124 !important;
                }
                .gsc-control-cse .gsc-table-result {
                  color: #e8eaed !important;
                }
                .gsc-control-cse .gsc-table-cell-snippet-close {
                  color: #e8eaed !important;
                }
                .gsc-control-cse .gsc-table-cell-snippet-close .gs-spelling {
                  color: #e8eaed !important;
                }
              `
            }} />
          )}
          <div className="w-full py-6 sm:px-4 lg:px-6">
            {searchActive && (
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-700">
                  Google検索結果
                  {searchQuery && <span className="ml-2 text-sm text-gray-500 break-all">{`「${searchQuery}」`}</span>}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchActive(false);
                      setSearchQuery('');
                      try {
                        window.dispatchEvent(new Event('yaneyuka:search-clear'));
                      } catch {}
                    }}
                    className={`text-xs px-3 py-1 rounded border transition-colors ${
                      isDarkMode 
                        ? 'border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white' 
                        : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    検索結果を閉じる
                  </button>
                  {/* ★追加: ダークモード/標準モード切り替えスイッチ */}
                  <button
                    type="button"
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="h-[28px] w-[28px] bg-gray-600 hover:bg-gray-700 flex items-center justify-center text-white rounded transition-colors"
                    title={isDarkMode ? "標準モードに戻す" : "ダークモードに切り替え"}
                  >
                    {isDarkMode ? (
                      // 太陽アイコン（標準へ）
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    ) : (
                      // 月アイコン（ダークへ）
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}
            <div id="gcse-results"></div>
          </div>
        </div>
        <div id="main-layout-container" className={`${searchActive ? 'hidden' : 'flex'} flex-col lg:flex-row lg:items-stretch`} style={{ minHeight: '100vh' }}>
          {/* 左カラム：ページ最上部から最下部まで（フッターバーより前面） */}
          <div className="hidden lg:block" style={{ zIndex: 10000, position: 'relative' }}>
            <Sidebar
              onPageChange={handleSubcategoryClick}
              onLogoClick={() => {
                // ロゴクリック時はトップページにリセット（URL=/, activeContent=initialContent）
                // SPA系コンテンツ(privacy-policy等)で開いている場合、URLが/のままだとLinkだけでは中央/右が更新されないため
                setActiveContent(initialContent);
                activeContentRef.current = initialContent;
                setSearchActive(false);
                setSearchQuery('');
                try {
                  window.dispatchEvent(new Event('yaneyuka:search-clear'));
                } catch {}
              }}
            />
          </div>
          {/* 右側：ナビバー + コンテンツエリア */}
          <div className="flex-1 min-w-0" style={{ paddingBottom: '34px' }}>
            <Navigation onMenuClick={handleMenuClick} activeItem={activeContent} />
            <div className="flex lg:flex-row flex-col lg:items-start gap-2 p-2 md:p-3 lg:p-4">
          <main className="flex-1 min-w-0">
            {/* 中央カラム右エリアに参考資料（NEWSのブックマーク幅相当: 300px） */}
            <div className="lg:flex lg:gap-4 items-start">
              <div className="flex-1 min-w-0">
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
                      <QualificationsVideos />
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
            const isPrivacyPolicyPage =
              /^\/(rules-app|dayline-app|kijyunhou-app|shoubouhou-app|epoch-camera)-privacy-policy(\/|$)/.test(pathname) ||
              activeContent === 'privacy-policy';
            return (
            <aside className="w-[200px] 2xl:w-[300px] min-w-[200px] shrink bg-white px-1 pt-0 pb-4 rounded text-sm overflow-y-auto overflow-x-hidden hidden md:block">
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
                const allAds = getAdContent(activeContent);
                const shuffled = [...allAds].sort(() => Math.random() - 0.5);
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
                            onClick={() => { try { const { logEvent } = require('@/lib/firebaseClient'); logEvent?.('pr_click', { area: activeContent, index }) } catch {} }}
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
                        onClick={() => { try { const { logEvent } = require('@/lib/firebaseClient'); logEvent?.('pr_click', { area: activeContent, index }) } catch {} }}
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
              {/* 下段：関連アプリ（縦並び・アイコン左＋アプリ名&説明右） */}
              <div className="mt-4 rounded-lg p-3" style={{ backgroundColor: '#a3c4b8' }}>
                <h4 className="text-[11px] font-semibold mb-2 text-gray-700 text-center">yaneyuka関連アプリ</h4>
                <div className="space-y-2">
                  <a href="https://dayline-yaneyuka.web.app" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/60 rounded p-2 hover:bg-white/80 transition">
                    <img src="/image/DayLine-icon.png" alt="DayLine アイコン" className="rounded shrink-0" style={{ width: '40px', height: '40px' }} onError={(e) => { (e.target as HTMLImageElement).src = '/image/掲載募集中a.png'; }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-gray-700 leading-tight">DayLine</p>
                      <p className="text-[9px] text-gray-600 leading-tight">今日が一目でわかる<br />iPhone-PC連動アプリ</p>
                    </div>
                  </a>
                  <a href="https://rules-yaneyuka.web.app" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/60 rounded p-2 hover:bg-white/80 transition">
                    <img src="/image/Rules-icon.png" alt="Rules アイコン" className="rounded shrink-0" style={{ width: '40px', height: '40px' }} onError={(e) => { (e.target as HTMLImageElement).src = '/image/掲載募集中a.png'; }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-gray-700 leading-tight">Rules</p>
                      <p className="text-[9px] text-gray-600 leading-tight">社内ルール・マニュアルを一元管理<br />iPhone-PC連動アプリ</p>
                    </div>
                  </a>
                  <a href="https://pdfgap-yaneyuka.web.app/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/60 rounded p-2 hover:bg-white/80 transition">
                    <img src="/image/PDFGap-icon.svg" alt="PDFGap アイコン" className="rounded shrink-0" style={{ width: '40px', height: '40px' }} onError={(e) => { (e.target as HTMLImageElement).src = '/image/掲載募集中a.png'; }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-gray-700 leading-tight">PDFGap</p>
                      <p className="text-[9px] text-gray-600 leading-tight">図面変更箇所を検出</p>
                    </div>
                  </a>
                  <a href="https://apps.apple.com/us/app/%E5%BB%BA%E7%AF%89%E5%9F%BA%E6%BA%96%E6%B3%95-yaneyuka/id6757323409?itscg=30200&itsct=apps_box_link&mttnsubad=6757323409" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/60 rounded p-2 hover:bg-white/80 transition">
                    <img src="/image/kenchikukijyunhou-icon.png" alt="建築基準法yaneyuka アイコン" className="rounded shrink-0" style={{ width: '40px', height: '40px' }} onError={(e) => { (e.target as HTMLImageElement).src = '/image/掲載募集中a.png'; }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-gray-700 leading-tight">建築基準法yaneyuka</p>
                      <p className="text-[9px] text-gray-600 leading-tight">法令集をポケットに<br />iPhoneアプリ</p>
                    </div>
                  </a>
                </div>
              </div>
            </aside>
            );
          })()}
            </div>{/* コンテンツエリア（中央+右カラム）の閉じ */}
          </div>{/* 右側div（ナビ+コンテンツ）の閉じ */}
        </div>
        {/* Footerは現在不要（リンクはナビバーとフッターバーに移動済み）。コード自体はFooter.tsxに残す */}
        <UserpageBottomBar
          activeContent={activeContent}
          onMenuClick={handleMenuClick}
          isLoggedIn={isLoggedIn}
          username={currentUser?.username}
        />
        {/* 下部固定バーの余白はコンテンツ側のpaddingで対応 */}
        <CookieConsent />
      </div>
    </AuthProvider>
  );
};

export default MainLayout;
