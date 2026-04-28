'use client';

import React from 'react';
import { useAuth } from '../../lib/AuthContext';

interface WelcomePageProps {
  onLogout?: () => void;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onLogout }) => {
  const { currentUser, logout } = useAuth();

  const handleLogout = () => {
    logout();
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div className="opacity-100 transition-all duration-500 ease-in-out">
      <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold mb-4">ようこそ</h2>
        <p className="text-lg mb-6">
          ようこそ、{currentUser?.username} さん
        </p>
        <div className="space-y-4">
          <p className="text-gray-600">
            ログインが完了しました。サイトの全機能をご利用いただけます。
          </p>
          <div className="text-center">
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage; 