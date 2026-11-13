'use client';

import React from 'react';
import Link from 'next/link';
import { screensInGroup, screenPath } from '@/lib/siteScreens';
import { CATEGORY_SUBCATEGORIES, materialSubPath, subcategoryLabel } from '@/lib/materialCategories';

/**
 * 建材ページの頭(モック「高級感 3」の建材 Q9)。
 * 左カラムは入口「建材」だけにしたので、16 分類と小分類はここで選ぶ。
 *   1 段目 … 16 分類の下線タブ(どれも URL を持つページ)
 *   2 段目 … その分類の小分類。選択中は緑の点
 * どちらも a で出す(クローラが小分類まで辿れるように)。小分類は /roof/seppan/ のような小分類ごとの URL。
 */
const CATEGORIES = screensInGroup('material');

export default function MaterialNav({
  category,
  subcategory,
  onOpen,
}: {
  category: string;
  subcategory: string;
  /** Maker conect・Chatbot を開く(MainLayout の handleSubcategoryClick) */
  onOpen: (id: string) => void;
}) {
  const subs = CATEGORY_SUBCATEGORIES[category] ?? [];
  const current = subcategory || subs[0];
  return (
    <div className="yy-matnav">
      <nav className="yy-tabs yy-matnav__cats" aria-label="建材の分類">
        {CATEGORIES.map((c) => (
          <Link
            key={c.id}
            href={`${screenPath(c.id)}/`}
            className="yy-tab"
            aria-pressed={c.id === category}
          >
            {c.label}
          </Link>
        ))}
      </nav>
      <div className="yy-matnav__subs">
        {subs.map((s) => (
          <Link
            key={s}
            href={materialSubPath(category, s)}
            className="yy-matnav__sub"
            aria-current={s === current ? 'true' : undefined}
          >
            {subcategoryLabel(s)}
          </Link>
        ))}
        <span className="yy-matnav__tools">
          <button type="button" onClick={() => onOpen('makerconect')}>Maker conect</button>
          <button type="button" onClick={() => onOpen('chatbot')}>建材 Chatbot</button>
        </span>
      </div>
    </div>
  );
}
