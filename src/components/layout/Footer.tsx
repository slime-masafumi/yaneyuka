'use client';

import React, { useState } from 'react';

interface FooterProps {
  onNavigate?: (page: string) => void;
  onSearch?: (query: string) => void;
  onSearchActiveChange?: (active: boolean) => void;
  onSearchQueryChange?: (query: string) => void;
}

export default function Footer({ onNavigate, onSearch, onSearchActiveChange, onSearchQueryChange }: FooterProps) {
  const [searchKeyword, setSearchKeyword] = useState('');

  const handleClick = (page: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigate) onNavigate(page);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchKeyword.trim();
    if (!query) return;
    if (onSearch) {
      onSearch(query);
    }
    onSearchActiveChange?.(true);
    onSearchQueryChange?.(query);
  };

  return (
    <footer style={{ backgroundColor: '#3b3b3b' }} className="text-white text-[11px]">
      <div className="container mx-auto px-4 py-3">
        {/* Google検索バー */}
        <div className="flex justify-center mb-3">
          <form onSubmit={handleSearchSubmit} className="w-full max-w-lg flex">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Google 検索"
              aria-label="Google 検索キーワード"
              className="flex-1 px-3 text-[12px] text-gray-700 placeholder:text-gray-400 focus:outline-none"
              style={{
                height: '28px',
                backgroundColor: '#ffffff',
                border: 'none',
                borderRadius: '0',
                fontSize: '12px',
              }}
            />
            <button
              type="submit"
              className="px-3 bg-gray-600 hover:bg-gray-700 transition-colors flex items-center justify-center"
              style={{ height: '28px' }}
              aria-label="検索する"
            >
              <svg width="13" height="13" viewBox="0 0 13 13">
                <title>search</title>
                <path d="m4.8495 7.8226c0.82666 0 1.5262-0.29146 2.0985-0.87438 0.57232-0.58292 0.86378-1.2877 0.87438-2.1144 0.010599-0.82666-0.28086-1.5262-0.87438-2.0985-0.59352-0.57232-1.293-0.86378-2.0985-0.87438-0.8055-0.010599-1.5103 0.28086-2.1144 0.87438-0.60414 0.59352-0.8956 1.293-0.87438 2.0985 0.021220 0.8055 0.31266 1.5103 0.87438 2.1144 0.56172 0.60414 1.2665 0.8956 2.1144 0.87438z" stroke="#ffffff" fill="none"/>
                <path d="m11.29 10.77l-3.83-3.83" stroke="#ffffff" fill="none"/>
              </svg>
            </button>
          </form>
        </div>
        {/* フッターリンク */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <button onClick={handleClick('feedback')} className="text-gray-300 hover:text-white transition-colors">お問い合わせ</button>
            <button onClick={handleClick('registration')} className="text-gray-300 hover:text-white transition-colors">掲載希望</button>
            <button onClick={handleClick('privacy-policy')} className="text-gray-300 hover:text-white transition-colors">プライバシーポリシー</button>
          </div>
          <p className="text-gray-400">&copy; {new Date().getFullYear()} やねゆか. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
