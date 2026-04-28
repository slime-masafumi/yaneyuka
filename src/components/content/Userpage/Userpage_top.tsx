'use client';

import React, { useState, useEffect, Suspense, Component, ReactNode } from 'react';

// React.lazy code splitting - each module is loaded on demand
const YyMail = React.lazy(() => import('./YyMail'));
const YyChat = React.lazy(() => import('./YyChat'));
const MyCalendar = React.lazy(() => import('./MyCalendar'));
const MyRegulations = React.lazy(() => import('./MyRegulations'));
const MyTasks = React.lazy(() => import('./MyTasks'));
const TeamTasks = React.lazy(() => import('./TeamTasks'));
const GeneralTools = React.lazy(() => import('./general-tools/GeneralTools'));
const DesignTools = React.lazy(() => import('./DesignTools'));
const DesignInfo = React.lazy(() => import('./DesignInfo'));
const MaterialInfo = React.lazy(() => import('./MaterialInfo'));
const ContactsManagement = React.lazy(() => import('./ContactsManagement'));
const Settings = React.lazy(() => import('./Settings'));

const STORAGE_KEY = 'userpage-selected-menu';

// Loading fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-32 text-gray-400">
    <p className="text-sm">読み込み中...</p>
  </div>
);

// Error boundary for catching rendering errors in child modules
class ModuleErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ModuleErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-32 text-red-500 gap-2">
          <p className="text-sm">モジュールの読み込み中にエラーが発生しました。</p>
          <button
            className="text-xs text-blue-500 underline"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            再試行
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Userpage_top: React.FC = () => {
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) || 'my-calendar';
    }
    return 'my-calendar';
  });

  // Persist selected menu to localStorage
  useEffect(() => {
    if (selectedMenuId) {
      localStorage.setItem(STORAGE_KEY, selectedMenuId);
    }
  }, [selectedMenuId]);

  // 外部からメニューを選択するためのカスタムイベントをリッスン
  useEffect(() => {
    const handleSelectMenu = (event: Event) => {
      const customEvent = event as CustomEvent<{ menuId: string }>;
      const menuId = customEvent.detail?.menuId;
      if (menuId) {
        setSelectedMenuId(menuId);
      }
    };

    window.addEventListener('userpage-select-menu', handleSelectMenu as EventListener);
    return () => {
      window.removeEventListener('userpage-select-menu', handleSelectMenu as EventListener);
    };
  }, []);

  // 選択されたメニューに応じてコンテンツをレンダリング
  const renderContent = () => {
    switch (selectedMenuId) {
      case 'yymail':
        return <YyMail />;
      case 'yychat':
        return <YyChat />;
      case 'my-calendar':
        return <MyCalendar />;
      case 'my-regulations':
        return <MyRegulations />;
      case 'my-tasks':
        return <MyTasks />;
      case 'team-tasks':
        return <TeamTasks />;
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
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-sm">右のメニューから機能を選択してください</p>
          </div>
        );
    }
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-lg pt-0 pr-0 pb-4 pl-1 h-full">
        <ModuleErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            {renderContent()}
          </Suspense>
        </ModuleErrorBoundary>
      </div>
    </div>
  );
};

export default Userpage_top;
