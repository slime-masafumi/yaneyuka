'use client';

import React, { useState } from 'react';

interface UseZoneProps {
  hideHeader?: boolean;
}

import { USE_ZONE_TABLE as useZoneData } from '@/data/useZoneTable';

const UseZone: React.FC<UseZoneProps> = ({ hideHeader }) => {
  const [selectedZone, setSelectedZone] = useState<string>('');

  const handleZoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedZone(e.target.value);
  };

  const selectedData = selectedZone ? useZoneData[selectedZone] : null;

  return (
    <div className="w-full bg-white rounded-b-lg shadow-sm border-b border-gray-100">
      {!hideHeader && (
      <div className="px-4 py-1.5 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div>
        <h3 className="text-[13px] font-medium">用途地域 建築物制限</h3>
        <p className="text-[11px] mt-0.5">用途地域を選択して建築物の制限を確認</p>
        </div>
      </div>
      )}
      
      <div className="p-4">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          {/* 左側：用途地域選択 */}
          <div className="space-y-4 w-full lg:w-1/2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                用途地域を選択
              </label>
              <select
                value={selectedZone}
                onChange={handleZoneChange}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
              >
                <option value="">選択してください</option>
                <option value="1-low-residential">第一種低層住居専用地域</option>
                <option value="2-low-residential">第二種低層住居専用地域</option>
                <option value="1-mid-high-residential">第一種中高層住居専用地域</option>
                <option value="2-mid-high-residential">第二種中高層住居専用地域</option>
                <option value="1-residential">第一種住居地域</option>
                <option value="2-residential">第二種住居地域</option>
                <option value="quasi-residential">準住居地域</option>
                <option value="rural-residential">田園住居地域</option>
                <option value="neighborhood-commercial">近隣商業地域</option>
                <option value="commercial">商業地域</option>
                <option value="quasi-industrial">準工業地域</option>
                <option value="industrial">工業地域</option>
                <option value="exclusively-industrial">工業専用地域</option>
              </select>
            </div>
          </div>

          {/* 右側：結果表示 */}
          {selectedData ? (
            <div className="w-full lg:w-1/2">
              <h2 className="yy-label mb-2">restriction — 建築物制限</h2>
              <div className="bg-gray-50 p-3 rounded mb-3">
                <h4 className="text-[13px] font-semibold text-gray-800 mb-1">
                  {selectedData.name}
                </h4>
                <p className="text-[11px] text-gray-600">
                  {selectedData.type === 'permitted' 
                    ? '建築することができる建築物' 
                    : '建築してはならない建築物'}
                </p>
              </div>
              
              <div className="max-h-96 overflow-y-auto text-[12px] leading-[1.9] text-gray-700 whitespace-pre-line">
                {selectedData.items.join('\n')}
              </div>
              {/* 建蔽率・容積率・高さの制限・日影規制まで載せた解説ページ(2026-11-15) */}
              <a className="mt-2 inline-block text-[12px] text-[var(--yy-acc-ink)] underline underline-offset-2" href={`/lookup/zone/${selectedZone}/`}>
                {selectedData.name}の建蔽率・容積率・高さの制限を見る →
              </a>
            </div>
          ) : (
            <div className="w-full lg:w-1/2">
              <div className="text-center py-8 text-gray-400 text-xs">
                用途地域を選択すると、建築物の制限内容が表示されます
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UseZone;

