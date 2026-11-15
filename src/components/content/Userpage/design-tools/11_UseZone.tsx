'use client';

import React, { useState } from 'react';
import { USE_ZONE_TABLE as useZoneData, USE_ZONE_ITEM_KEYS, USE_ZONE_SUBITEMS } from '@/data/useZoneTable';

interface UseZoneProps {
  hideHeader?: boolean;
}

/** 解説ページ(/lookup/zone/{id}/)がある地域 */
const HAS_GUIDE = (id: string) => id !== 'non-designated';

const UseZone: React.FC<UseZoneProps> = ({ hideHeader }) => {
  const [selectedZone, setSelectedZone] = useState<string>('');

  const selectedData = selectedZone ? useZoneData[selectedZone] : null;
  const sub = selectedZone ? USE_ZONE_SUBITEMS[selectedZone] ?? {} : {};
  // 他の項を引いている号があるとき、項と地域の対応を出す
  const refs = selectedData ? USE_ZONE_ITEM_KEYS.filter(([k]) => selectedData.items.some((t) => t.includes(`${k.replace(/[()]/g, (c) => (c === '(' ? '（' : '）'))}項`))) : [];

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
              <label className="block text-xs font-medium text-gray-700 mb-1">用途地域を選択</label>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
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
                <option value="non-designated">用途地域の指定のない区域(市街化調整区域を除く)</option>
              </select>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              建築基準法 第 48 条・別表第二の条文です(e-Gov の現行本文で確認)。「政令で定めるもの」の中身は施行令 130 条の 3〜130 条の 9 の 8 にあります。
              特定行政庁の許可(法 48 条ただし書)、特別用途地区・地区計画の条例(法 49 条・68 条の 2)で、建てられるものが変わることがあります。
              敷地が 2 以上の地域にわたるときは、敷地の過半が属する地域の制限がかかります(法 91 条)。
            </p>
          </div>

          {/* 右側：結果表示 */}
          {selectedData ? (
            <div className="w-full lg:w-1/2">
              <h2 className="yy-label mb-2">restriction — 建築物制限</h2>
              <div className="bg-gray-50 p-3 rounded mb-3">
                <h4 className="text-[13px] font-semibold text-gray-800 mb-1">{selectedData.name}</h4>
                <p className="text-[11px] text-gray-600">
                  {selectedData.type === 'permitted' ? '建築することができる建築物(ここに無い用途は建てられない)' : '建築してはならない建築物(ここに無い用途は建てられる)'}
                </p>
              </div>

              <div className="max-h-[32rem] overflow-y-auto text-[12px] leading-[1.9] text-gray-700">
                {selectedData.items.map((t, i) => (
                  <div key={t}>
                    <div>{t}</div>
                    {sub[i] && (
                      <ul className="pl-4 text-[11px] leading-[1.7] text-gray-600">
                        {sub[i].map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
              {refs.length > 0 && (
                <p className="mt-2 text-[10px] text-gray-500 leading-relaxed">
                  他の項を引いている号は、その項の号を含みます。{refs.map(([k, n]) => `${k} = ${n}`).join(' / ')}
                </p>
              )}
              {HAS_GUIDE(selectedZone) && (
                <a className="mt-2 inline-block text-[12px] text-[var(--yy-acc-ink)] underline underline-offset-2" href={`/lookup/zone/${selectedZone}/`}>
                  {selectedData.name}の建蔽率・容積率・高さの制限を見る →
                </a>
              )}
            </div>
          ) : (
            <div className="w-full lg:w-1/2">
              <div className="text-center py-8 text-gray-400 text-xs">用途地域を選択すると、建築物の制限内容が表示されます</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UseZone;
