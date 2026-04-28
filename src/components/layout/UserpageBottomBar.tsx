'use client';

import React from 'react';

interface UserpageBottomBarProps {
  activeContent: string;
  onMenuClick: (menuItem: string) => void;
  isLoggedIn: boolean;
  username?: string;
}

const userpageMenuItems = [
  { id: 'yymail', label: 'yymail' },
  { id: 'yychat', label: 'yychat' },
  { id: 'my-calendar', label: 'Myカレンダー' },
  { id: 'my-regulations', label: 'My法規' },
  { id: 'my-tasks', label: 'Myタスク' },
  { id: 'team-tasks', label: 'Teamタスク' },
  { id: 'pdf-diff', label: 'PDF差分' },
  { id: 'general-tools', label: '一般ツール' },
  { id: 'design-tools', label: '設計ツール' },
  { id: 'design-info', label: '設計情報' },
  { id: 'material-info', label: '材料情報' },
  { id: 'contacts', label: '担当連絡先' },
  { id: 'settings', label: 'ユーザー設定' },
];

const UserpageBottomBar: React.FC<UserpageBottomBarProps> = ({ activeContent, onMenuClick, isLoggedIn, username }) => {
  // 常時表示（ログイン有無問わず）

  const userpageMenuIds = userpageMenuItems.map(item => item.id);
  userpageMenuIds.push('userpage-top');
  const isUserpageActive = userpageMenuIds.includes(activeContent);

  return (
    <div className="userpage-bottom-bar" style={{
      backgroundColor: '#000000',
      borderTop: '1px solid #333',
      position: 'fixed',
      bottom: 0,
      left: '180px',
      right: 0,
      zIndex: 9999,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        overflowX: 'auto',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
        whiteSpace: 'nowrap',
        padding: '0 8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
        {/* ユーザー情報 or 登録・ログインリンク */}
        {isLoggedIn ? (
          <span className="userpage-bottom-bar-item" style={{ color: '#4ade80', padding: '6px 8px', whiteSpace: 'nowrap', fontWeight: 500 }}>
            ようこそ、{username}さん
          </span>
        ) : (
          <>
            <button
              onClick={() => onMenuClick('register')}
              className="userpage-bottom-bar-item"
              style={{ background: 'none', border: 'none', color: '#93c5fd', padding: '6px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#bfdbfe'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#93c5fd'; }}
            >
              無料会員登録
            </button>
            <button
              onClick={() => onMenuClick('login')}
              className="userpage-bottom-bar-item"
              style={{ background: 'none', border: 'none', color: '#93c5fd', padding: '6px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#bfdbfe'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#93c5fd'; }}
            >
              ログイン
            </button>
          </>
        )}
        {userpageMenuItems.map(item => {
          const isActive = activeContent === item.id || (activeContent === 'userpage-top' && item.id === 'my-calendar');
          return (
            <button
              key={item.id}
              onClick={() => onMenuClick(item.id)}
              className="userpage-bottom-bar-item"
              style={{
                background: 'none',
                border: 'none',
                color: isActive ? '#4ade80' : '#d1d5db',
                padding: '6px 8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontWeight: isActive ? 600 : 400,
                borderBottom: isActive ? '2px solid #4ade80' : '2px solid transparent',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = '#d1d5db';
              }}
            >
              {item.label}
            </button>
          );
        })}
        </div>
        <button
          onClick={() => onMenuClick('privacy-policy')}
          style={{
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            fontSize: '11px',
            padding: '6px 8px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            marginLeft: 'auto',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; }}
        >
          プライバシーポリシー
        </button>
      </div>
    </div>
  );
};

export default UserpageBottomBar;
