import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const PWAInstallPrompt = dynamic(() => import('../PWAInstallPrompt'), { ssr: false });
const WeatherWidget = dynamic(() => import('../WeatherWidget'), { ssr: false });

declare global {
  interface Window {
    __gcse?: { callback?: () => void } & Record<string, any>;
    google?: any;
  }
}

interface HeaderProps {
  onNavigateToRegistration?: () => void;
  onNavigateToFeedback?: () => void;
  onNavigateToRegister?: () => void;
  onNavigateToLogin?: () => void;
  onLogoClick?: () => void;
  onNavigateToPrivacy?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToYyChat?: () => void;
  onSearchActiveChange?: (active: boolean) => void;
  onSearchQueryChange?: (query: string) => void;
  onMobileMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
  unreadCount?: number;
  isDarkMode?: boolean;
  setIsDarkMode?: (value: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ 
  onNavigateToRegistration, 
  onNavigateToFeedback, 
  onNavigateToRegister, 
  onNavigateToLogin,
  onLogoClick,
  onNavigateToPrivacy,
  onNavigateToSettings,
  onNavigateToYyChat,
  onSearchActiveChange,
  onSearchQueryChange,
  onMobileMenuToggle,
  mobileMenuOpen = false,
  unreadCount = 0,
  isDarkMode = false,
  setIsDarkMode,
}) => {
  const { isLoggedIn, currentUser, logout } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [pendingQuery, setPendingQuery] = useState('');
  const [searchNotice, setSearchNotice] = useState('');
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const cseExecuteRef = useRef<((query: string) => void) | null>(null);

  // 検索バーやヘッダーのスタイルをJSで変更しない（副作用を排除）

  useEffect(() => {
    const handleSearchClear = () => {
      setSearchNotice('');
      onSearchActiveChange?.(false);
      onSearchQueryChange?.('');
      try { cseExecuteRef.current?.(''); } catch {}
    };
    window.addEventListener('yaneyuka:search-clear', handleSearchClear);
    return () => window.removeEventListener('yaneyuka:search-clear', handleSearchClear);
  }, [onSearchActiveChange, onSearchQueryChange]);

  // クリック外でドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // PWAインストール可能かチェック
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 既にインストールされているかチェック
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    if (isStandalone || isIOSStandalone) {
      setCanInstall(false);
      return;
    }

    // windowオブジェクトにdeferredPromptがあるかチェック
    const checkCanInstall = () => {
      if ((window as any).deferredPrompt) {
        setCanInstall(true);
      } else {
        setCanInstall(false);
      }
    };

    checkCanInstall();
    // 定期的にチェック（beforeinstallpromptイベントが後から来る可能性があるため）
    const interval = setInterval(checkCanInstall, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleInstallClick = () => {
    // 1ヶ月以内に表示したかチェック
    if (typeof window !== 'undefined') {
      const dismissedTime = localStorage.getItem('pwa-install-dismissed');
      if (dismissedTime) {
        const dismissedDate = parseInt(dismissedTime, 10);
        const now = Date.now();
        if (now < dismissedDate) {
          // まだ1ヶ月経過していない
          return;
        }
      }
    }
    setShowInstallPrompt(true);
  };

  // ★追加: ファビコン表示のための監視ロジック
  useEffect(() => {
    const targetNode = document.getElementById('gcse-results-wrapper') || document.body;
    
    const observer = new MutationObserver((mutations) => {
      // まだファビコン処理をしていない検索結果を探す
      const results = document.querySelectorAll('.gsc-webResult.gsc-result:not([data-favicon-processed])');
      
      results.forEach((result) => {
        result.setAttribute('data-favicon-processed', 'true');
        const titleLink = result.querySelector('a.gs-title') as HTMLAnchorElement;
        const urlArea = result.querySelector('.gsc-url-top, .gs-visibleUrl');
        
        if (titleLink && urlArea && titleLink.href) {
          try {
            const urlObj = new URL(titleLink.href);
            const domain = urlObj.hostname;
            // GoogleのFavicon APIを使用
            const img = document.createElement('img');
            img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
            img.width = 16;
            img.height = 16;
            img.style.marginRight = '8px';
            img.style.verticalAlign = 'text-bottom';
            img.style.borderRadius = '2px';
            img.style.display = 'inline-block';
            
            // URL表示エリアにアイコンを挿入
            urlArea.insertBefore(img, urlArea.firstChild);
            
            // URLエリアのスタイル調整
            const urlEl = urlArea as HTMLElement;
            urlEl.style.display = 'flex';
            urlEl.style.alignItems = 'center';
          } catch (e) {
            // エラー時は何もしない
          }
        }
      });
    });

    observer.observe(targetNode, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const cseId = process.env.NEXT_PUBLIC_GOOGLE_CSE_ID;
    if (!cseId) return;

    const executePendingQuery = () => {
      if (cseExecuteRef.current && pendingQuery) {
        const query = pendingQuery;
        cseExecuteRef.current(query);
        onSearchActiveChange?.(true);
        onSearchQueryChange?.(query);
        setPendingQuery('');
        setSearchNotice('');
        return true;
      }
      return false;
    };

    const renderResults = () => {
      const google = window.google;
      if (!google?.search?.cse?.element) return false;
      try {
        cseExecuteRef.current = (query: string) => {
          const container = document.getElementById('gcse-results');
          const wrapper = document.getElementById('gcse-results-wrapper');
          if (!container) return;
          container.innerHTML = '';
          const gname = `yaneyuka-results-${Date.now()}`;
          google.search.cse.element.render({
            div: 'gcse-results',
            tag: 'searchresults-only',
            attributes: { linkTarget: '_blank' },
            gname,
          });
          const element = google.search.cse.element.getElement(gname);
          if (!element) return;
          if (!query) {
            element.clearAllResults?.();
            if (wrapper) {
              wrapper.classList.add('hidden');
              wrapper.classList.remove('block', 'mt-4');
            }
            onSearchActiveChange?.(false);
            onSearchQueryChange?.('');
            return;
          }
          try { element.clearAllResults?.(); } catch {}
          element.execute(query);
          if (wrapper) {
            wrapper.classList.remove('hidden');
            wrapper.classList.add('block', 'mt-4');
          }
          wrapper?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          onSearchActiveChange?.(true);
          onSearchQueryChange?.(query);
        };
        return true;
      } catch (error) {
        console.error('Failed to render Google CSE results', error);
        return false;
      }
    };

    if (!renderResults()) {
      window.__gcse = window.__gcse || {};
      const previousCallback = window.__gcse.callback;
      window.__gcse.callback = () => {
        if (typeof previousCallback === 'function') {
          previousCallback();
        }
        renderResults();
      };
    }

    if (executePendingQuery()) return;
    const interval = setInterval(() => {
      if (executePendingQuery()) {
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [pendingQuery, onSearchActiveChange, onSearchQueryChange]);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchKeyword.trim();
    if (!query) return;

    const cseId = process.env.NEXT_PUBLIC_GOOGLE_CSE_ID;
    if (cseExecuteRef.current) {
      cseExecuteRef.current(query);
      setSearchNotice('');
      onSearchActiveChange?.(true);
      onSearchQueryChange?.(query);
    } else {
      setPendingQuery(query);
      setSearchNotice('検索エンジンを起動しています。数秒後に結果が表示されます。');
      onSearchActiveChange?.(true);
      onSearchQueryChange?.(query);
    }
  };

  return (
    <header className="text-white" style={{ backgroundColor: '#3b3b3b' }}>
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
          `
        }} />
      )}
      <div className="flex flex-col h-full">
        {/* 上部ヘッダー */}
        <div className="flex justify-between items-start px-3 py-1 md:px-4 md:py-2 flex-shrink-0">
          {/* 左側：ハンバーガーメニュー（スマホのみ）とロゴとサブタイトル */}
          <div className="flex items-end gap-2 lg:flex-row">
            {/* ハンバーガーメニューボタン（スマホのみ表示） */}
            <button
              onClick={onMobileMenuToggle}
              className="lg:hidden p-2 text-white hover:bg-white hover:bg-opacity-10 rounded transition-colors flex-shrink-0"
              aria-label="メニューを開く"
              aria-expanded={mobileMenuOpen}
            >
              <svg 
                className="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            {/* スマホ版：ロゴを中央に配置 */}
            <div className="lg:hidden flex-1 flex justify-center">
              <Link href="/" onClick={onLogoClick} className="flex-shrink-0">
                <img
                  src="/image/yaneyukaロゴ3.png"
                  alt="yaneyuka"
                  className="h-8 md:h-10 w-auto translate-y-[2px]"
                  onError={(e) => {
                    // 画像が読み込めない場合はテキストにフォールバック
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const textElement = target.nextElementSibling as HTMLElement;
                    if (textElement) {
                      textElement.style.display = 'block';
                    }
                  }}
                />
              </Link>
            </div>
            {/* PC版：ロゴを左側に配置 */}
            <div className="hidden lg:flex items-end gap-2">
            <Link href="/" onClick={onLogoClick} className="flex-shrink-0">
            <img 
              src="/image/yaneyukaロゴ3.png" 
              alt="yaneyuka" 
              className="h-12 w-auto translate-y-[4px]"
              onError={(e) => {
                // 画像が読み込めない場合はテキストにフォールバック
                const target = e.currentTarget;
                target.style.display = 'none';
                const textElement = target.nextElementSibling as HTMLElement;
                if (textElement) {
                  textElement.style.display = 'block';
                }
              }}
            />
            </Link>
            <span className="text-2xl font-bold hidden">yaneyuka</span>
            <p className="text-xs text-gray-300 hidden sm:block">〜建築・建設業界の業務支援ポータルサイト〜</p>
            </div>
          </div>
          
          {/* 右側：リンク（小さい文字で右上に配置、スマホでは非表示） */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] flex-shrink-0">
            <a
              href="https://rules-yaneyuka.web.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-gray-200 text-[11px] font-medium inline-flex items-center justify-center text-center px-2 transition-colors"
              title="Rulesアプリを開く"
            >
              Rulesアプリ
            </a>
            {canInstall && (
              <button
                onClick={handleInstallClick}
                className="text-white hover:text-gray-200 text-[11px] font-medium inline-flex items-center justify-center text-center px-2 transition-colors"
                title="yaneyukaアプリをインストール"
              >
                yaneyukaアプリ
              </button>
            )}
            {!isLoggedIn ? (
              <>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onNavigateToRegister) {
                      onNavigateToRegister();
                    }
                  }}
                    className="text-blue-300 hover:text-blue-200 hover:underline"
                >
                  新規会員登録
                </a>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onNavigateToLogin) {
                      onNavigateToLogin();
                    }
                  }}
                  className="text-blue-300 hover:text-blue-200 hover:underline"
                >
                  ログイン
                </a>
              </>
            ) : (
              <div className="relative flex items-center gap-2" ref={dropdownRef}>
                {unreadCount > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onNavigateToYyChat) {
                        onNavigateToYyChat();
                      }
                    }}
                    className="bg-red-500 text-white text-[9px] rounded-full px-1.5 py-0.5 mr-2 hover:bg-red-600 cursor-pointer transition-colors"
                    title="yychatを開く"
                  >
                    {unreadCount}
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="text-green-300 hover:text-green-200 text-[11px] font-medium inline-flex items-center justify-center text-center px-2"
                >
                ようこそ、{currentUser?.username}さん
                </button>

              {/* ドロップダウンメニュー */}
              {isOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-auto bg-white rounded shadow-sm border border-gray-200"
                  style={{ zIndex: 10000 }}
                >
                  <div className="py-[2px]">
                    <button
                      onClick={() => {
                        if (onNavigateToSettings) onNavigateToSettings();
                        setIsOpen(false);
                      }}
                      className="block w-full text-center px-2 py-1 text-[11px] leading-tight text-gray-700 hover:bg-gray-100"
                    >
                      ユーザー設定
                    </button>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-center px-2 py-1 text-[11px] leading-tight text-gray-700 hover:bg-gray-100"
                    >
                      ログアウト
                    </button>
                  </div>
                </div>
              )}
            </div>
            )}
            
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onNavigateToRegistration) {
                  onNavigateToRegistration();
                }
              }}
              className="text-blue-300 hover:text-blue-200 hover:underline"
            >
              掲載希望はコチラ
            </a>
            
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onNavigateToFeedback) {
                  onNavigateToFeedback();
                }
              }}
              className="text-blue-300 hover:text-blue-200 hover:underline"
            >
              ご意見・ご要望
            </a>

            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onNavigateToPrivacy) {
                  onNavigateToPrivacy();
                }
              }}
              className="text-blue-300 hover:text-blue-200 hover:underline"
            >
              プライバシーポリシー
            </a>
          </div>
        </div>

        {/* 検索バーと天気ウィジェット */}
        {/* コンテナに relative を追加し、absoluteの基準点にする */}
        <div className="flex-1 flex items-center justify-center px-3 pb-1 md:px-4 md:pb-3 lg:pb-4 flex-shrink-0 gap-2 md:gap-4 relative">
          <form onSubmit={handleSearchSubmit} className="w-full max-w-2xl flex-shrink">
            <div className="gsc-control-searchbox-only">
              <div className="gsc-search-box flex">
                <div className="gsc-input-box flex-1">
                  <input 
                    type="text" 
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="Google 検索"
                    aria-label="Google 検索キーワード"
                    className="gsc-input flex-1 h-full px-3 text-[12px] text-gray-700 placeholder:text-gray-400 focus:outline-none"
                    style={{
                      width: '100%',
                      margin: '0',
                      padding: '0 8px',
                      backgroundColor: '#ffffff',
                      color: '#6b7280',
                      height: '32px',
                      boxSizing: 'border-box',
                      border: 'none',
                      borderRadius: '0',
                      fontSize: '12px',
                      fontFamily: "'Hiragino Kaku Gothic ProN', sans-serif",
                    }}
                  />
                </div>
                <button 
                  type="submit"
                  className="gsc-search-button h-full px-3 bg-gray-600 hover:bg-gray-700 transition-colors flex items-center justify-center"
                  aria-label="検索する"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13">
                    <title>search</title>
                    <path d="m4.8495 7.8226c0.82666 0 1.5262-0.29146 2.0985-0.87438 0.57232-0.58292 0.86378-1.2877 0.87438-2.1144 0.010599-0.82666-0.28086-1.5262-0.87438-2.0985-0.59352-0.57232-1.293-0.86378-2.0985-0.87438-0.8055-0.010599-1.5103 0.28086-2.1144 0.87438-0.60414 0.59352-0.8956 1.293-0.87438 2.0985 0.021220 0.8055 0.31266 1.5103 0.87438 2.1144 0.56172 0.60414 1.2665 0.8956 2.1144 0.87438z" stroke="#ffffff" fill="none"/>
                    <path d="m11.29 10.77l-3.83-3.83" stroke="#ffffff" fill="none"/>
                  </svg>
                </button>
              </div>
            </div>
          </form>
          
          {/* ★修正ポイント: xl(1280px)以上でabsolute右寄せ、それ以下は横並び(flex) */}
          <div className="hidden lg:flex items-center flex-shrink-0 xl:absolute xl:right-4">
            <WeatherWidget />
          </div>
        </div>
        {searchNotice && (
          <div className="px-4 text-[11px] text-blue-200">{searchNotice}</div>
        )}
      </div>
      <PWAInstallPrompt isOpen={showInstallPrompt} onClose={() => setShowInstallPrompt(false)} />
    </header>
  );
};

export default Header; 