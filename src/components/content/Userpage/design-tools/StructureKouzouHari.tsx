'use client';

import React from 'react';
import Link from 'next/link';

const SRC_URL = 'http://repoengineer.jp/Technology/kousiki/kousiki-kouzouhari/kousikikouzouhari-01-01.html';

/**
 * 構造計算（公式：梁のたわみ 等）外部記事ビューア
 * - まずは iframe で外部ページを表示（X-Frame-Options 制限時は下部のフォールバックを提示）
 * - 参照元リンクを明示
 */
const StructureKouzouHari: React.FC = () => {
  const imgs = [
    'http://repoengineer.jp/Technology/kousiki/kousiki-kouzouhari/kousikikouzouhari-01-01/kousik01-01-1.jpg',
    'http://repoengineer.jp/Technology/kousiki/kousiki-kouzouhari/kousikikouzouhari-01-01/kousik01-01-2.jpg',
    'http://repoengineer.jp/Technology/kousiki/kousiki-kouzouhari/kousikikouzouhari-01-01/kousik01-01-9.jpg',
    'http://repoengineer.jp/Technology/kousiki/kousiki-kouzouhari/kousikikouzouhari-01-01/kousik01-03-1.jpg',
    'http://repoengineer.jp/Technology/kousiki/kousiki-kouzouhari/kousikikouzouhari-01-01/kousik01-03-2.jpg',
    'http://repoengineer.jp/Technology/kousiki/kousiki-kouzouhari/kousikikouzouhari-01-01/kousik01-07-1.jpg',
    'http://repoengineer.jp/Technology/kousiki/kousiki-kouzouhari/kousikikouzouhari-01-01/kousik01-07-2.jpg',
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-gray-800">構造計算（公式：梁のたわみ ほか）</h3>
          <p className="text-[11px] text-gray-600">
            出典：
            <a href={SRC_URL} target="_blank" rel="noreferrer" className="text-blue-600 underline">
              repoengineer.jp「公式・構造梁」
            </a>
          </p>
        </div>
        <Link
          href={SRC_URL}
          target="_blank"
          className="px-2 py-1 text-[11px] bg-gray-100 hover:bg-gray-200 rounded"
        >
          元ページを新規タブで開く
        </Link>
      </div>

      <div className="w-full h-[800px] border rounded overflow-hidden bg-white">
        <iframe
          src={SRC_URL}
          title="構造計算（repoengineer.jp）"
          className="w-full h-full"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <details className="border rounded p-3 bg-gray-50">
        <summary className="cursor-pointer text-[12px] font-medium">もし上の表示がブロックされる場合のフォールバック（画像一覧）</summary>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          {imgs.map((src, i) => (
            <a key={src} href={src} target="_blank" rel="noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`構造公式 図面 ${i + 1}`}
                className="w-full h-48 object-contain bg-white border rounded"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.style.display = 'none';
                }}
              />
            </a>
          ))}
        </div>
      </details>
    </div>
  );
};

export default StructureKouzouHari;


