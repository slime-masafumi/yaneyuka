'use client';

import { useState, useEffect, ReactNode } from 'react';

type Lang = 'en' | 'ja';

interface BilingualLegalProps {
  titleEn: string;
  titleJa: string;
  en: ReactNode;
  ja: ReactNode;
  defaultLang?: Lang; // 省略時は 'ja'
}

const STORAGE_KEY = 'yaneyuka-legal-lang';

/**
 * 利用規約・プライバシーポリシー等、日英併記のリーガル文書用ラッパー。
 * ページ側はサーバーコンポーネントに保ちつつ、言語トグルだけをクライアントで動作させる。
 * 両言語のコンテンツはDOMに保持され、displayプロパティで切替 → SEOクローラは両方をインデックス可能。
 * 言語選択はlocalStorageに保存し、プラポリ間ナビゲーション時に維持される。
 */
export default function BilingualLegal({ titleEn, titleJa, en, ja, defaultLang = 'ja' }: BilingualLegalProps) {
  const [lang, setLang] = useState<Lang>(defaultLang);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'ja') {
        setLang(saved);
      }
    } catch {}
  }, []);

  const switchLang = (next: Lang) => {
    setLang(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  };

  const tabBase = 'px-3 py-1 text-[12px] font-medium transition-colors cursor-pointer';
  const tabActive = 'bg-gray-800 text-white';
  const tabInactive = 'bg-white text-gray-600 hover:bg-gray-50';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h2 className="text-lg font-semibold">
          {lang === 'en' ? titleEn : titleJa}
        </h2>
        <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
          <button
            type="button"
            onClick={() => switchLang('en')}
            className={`${tabBase} ${lang === 'en' ? tabActive : tabInactive}`}
            aria-pressed={lang === 'en'}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => switchLang('ja')}
            className={`${tabBase} ${lang === 'ja' ? tabActive : tabInactive}`}
            aria-pressed={lang === 'ja'}
          >
            JA
          </button>
        </div>
      </div>
      <div lang="en" style={{ display: lang === 'en' ? 'block' : 'none' }}>
        {en}
      </div>
      <div lang="ja" style={{ display: lang === 'ja' ? 'block' : 'none' }}>
        {ja}
      </div>
    </div>
  );
}
