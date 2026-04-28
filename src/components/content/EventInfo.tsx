'use client';

import React, { useState, useEffect } from 'react';
import { FiExternalLink, FiCalendar, FiMapPin, FiBookmark, FiSearch, FiRefreshCw, FiGlobe } from 'react-icons/fi';

// イベント情報の型定義
export type EventItem = {
  id: string;
  title: string;
  description: string;
  dateText: string;
  venue: string;
  region: 'tokyo' | 'osaka' | 'fukuoka' | 'nagoya' | 'chiba' | 'other';
  link: string;
  isOfficial: boolean;
}

interface EventInfoProps {
  showHeader?: boolean;
  onNavigateToRegistration?: () => void;
  onToggleBookmark?: (item: EventItem) => void;
  isBookmarked?: (id: string) => boolean;
  initialItems?: EventItem[];
  items?: EventItem[]; // EventsWithBookmarksから渡されるフィルタ済みイベント
}

// ---------------------------------------------------------
// 2026年以降 建築・建設関連イベントリスト（API /api/events と同期）
// フォールバック用。APIが優先、fetch失敗時のみこちらが表示される。
// ---------------------------------------------------------
export const defaultEvents: EventItem[] = [
  {
    id: 'nikkei-architecture-materials-2026',
    title: '建築・建材展 2026（NIKKEI MESSE）',
    description: '建材・工法の総合展（NIKKEI MESSE 構成展）。',
    dateText: '2026年3月3日(火)～6日(金)',
    venue: '東京ビッグサイト 西',
    region: 'tokyo',
    link: 'https://messe.nikkei.co.jp/ac/',
    isOfficial: true
  },
  {
    id: 'japan-shop-2026',
    title: 'JAPAN SHOP 2026（NIKKEI MESSE）',
    description: '商空間の資材・照明・什器等。建材・内装と親和。',
    dateText: '2026年3月3日(火)～6日(金)',
    venue: '東京ビッグサイト',
    region: 'tokyo',
    link: 'https://messe.nikkei.co.jp/js/',
    isOfficial: true
  },
  {
    id: 'lighting-fair-2026',
    title: 'ライティング・フェア 2026（NIKKEI MESSE）',
    description: '照明の総合展（建築照明領域）。',
    dateText: '2026年3月3日(火)～6日(金)',
    venue: '東京ビッグサイト',
    region: 'tokyo',
    link: 'https://messe.nikkei.co.jp/lf/',
    isOfficial: true
  },
  {
    id: 'building-maintenance-connect-2026',
    title: 'ビルメンCONNECT 2026（NIKKEI MESSE）',
    description: 'ビルメンテナンス・FM分野（設備保全/清掃など）。',
    dateText: '2026年3月3日(火)～6日(金)',
    venue: '東京ビッグサイト',
    region: 'tokyo',
    link: 'https://messe.nikkei.co.jp/bmc/',
    isOfficial: true
  },
  {
    id: 'public-week-2026',
    title: '自治体・公共Week 2026',
    description: '公共施設・都市整備・インフラ維持の総合展群。',
    dateText: '2026年5月13日(水)～15日(金)',
    venue: '東京ビッグサイト 西',
    region: 'tokyo',
    link: 'https://www.publicweek.jp/',
    isOfficial: true
  },
  {
    id: 'cspi-expo-2026',
    title: '第8回 建設・測量生産性向上展 (CSPI-EXPO 2026)',
    description: '建機・重機・アタッチメント・建設DXなど、建設・測量業界の最先端技術が集結する国内最大級の展示会。',
    dateText: '2026年6月17日(水)～20日(土)',
    venue: '幕張メッセ',
    region: 'chiba',
    link: 'https://cspi-expo.com/',
    isOfficial: true
  },
  {
    id: 'kyushu-home-building-2026',
    title: '九州ホーム＆ビルディングショー 2026',
    description: '九州圏の住宅・建築・DX複合展。',
    dateText: '2026年6月24日(水)～25日(木)',
    venue: 'マリンメッセ福岡',
    region: 'fukuoka',
    link: 'https://www.kyushu-home.jp/',
    isOfficial: true
  },
  {
    id: 'architecture-materials-osaka-2026',
    title: '建築・建材展 大阪 2026（NIKKEI MESSE）',
    description: 'NIKKEI MESSE の関西版。建材・住設・工法の総合展。',
    dateText: '2026年7月2日(木)～3日(金)',
    venue: 'インテックス大阪 4号館',
    region: 'osaka',
    link: 'https://messe.nikkei.co.jp/as/',
    isOfficial: true
  },
  {
    id: 'maintenance-resilience-tokyo-2026',
    title: 'メンテナンス・レジリエンス TOKYO 2026',
    description: 'インフラ・プラント保全の大型複合展。',
    dateText: '2026年7月15日(水)～17日(金)',
    venue: '東京ビッグサイト 東',
    region: 'tokyo',
    link: 'https://mente.jma.or.jp/',
    isOfficial: true
  },
  {
    id: 'japan-build-osaka-2026',
    title: 'JAPAN BUILD OSAKA 2026（大阪ショー）',
    description: '西日本版のJAPAN BUILD。',
    dateText: '2026年8月26日(水)～28日(金)',
    venue: 'インテックス大阪',
    region: 'osaka',
    link: 'https://www.japan-build.jp/osaka/ja-jp.html',
    isOfficial: true
  },
  {
    id: 'hokkaido-construction-2026',
    title: '北海道 建設開発総合展 2026',
    description: '北海道の建設・インフラ大型展示群。',
    dateText: '2026年10月7日(水)～8日(木)',
    venue: 'アクセスサッポロ',
    region: 'other',
    link: 'https://www.jma.or.jp/toshiken/hkd/',
    isOfficial: true
  },
  {
    id: 'kensetsu-gijutsu-kinki-2026',
    title: '建設技術展 2026 近畿',
    description: '近畿圏の建設新技術展示。',
    dateText: '2026年10月28日(水)～29日(木)',
    venue: 'インテックス大阪 6号館Cゾーン',
    region: 'osaka',
    link: 'https://www.kengi-kinki.jp/kengi2026/top.html',
    isOfficial: true
  },
  {
    id: 'japan-home-building-show-2026',
    title: '第48回 Japan Home & Building Show 2026',
    description: '住宅・建築の老舗総合展（日本能率協会主催、国内最大級）。',
    dateText: '2026年11月18日(水)～20日(金)',
    venue: '東京ビッグサイト 西展示棟',
    region: 'tokyo',
    link: 'https://www.jma.or.jp/homeshow/tokyo/',
    isOfficial: true
  },
  {
    id: 'japan-build-tokyo-2026',
    title: 'JAPAN BUILD TOKYO 2026（東京ショー）',
    description: '建築・建設の大型複合展（建設DX展／スマートビルディング／建物の脱炭素EXPO 等を内包）。',
    dateText: '2026年12月2日(水)～4日(金)',
    venue: '東京ビッグサイト',
    region: 'tokyo',
    link: 'https://www.japan-build.jp/tokyo/ja-jp.html',
    isOfficial: true
  },
  {
    id: 'nikkei-architecture-materials-2027',
    title: '建築・建材展 2027（NIKKEI MESSE）',
    description: '建材・工法の総合展（NIKKEI MESSE 構成展）。',
    dateText: '2027年3月2日(火)～5日(金)',
    venue: '東京ビッグサイト 東展示棟',
    region: 'tokyo',
    link: 'https://messe.nikkei.co.jp/ac/',
    isOfficial: true
  }
];

/**
 * dateText（例: '2026年3月3日(火)～6日(金)' or '2026年9月30日(水)～10月2日(金)'）から
 * 開始日・終了日を抽出する。
 */
function parseDateRange(dateText: string): { start: Date; end: Date } {
  // 開始: "YYYY年M月D日" を抽出
  const startMatch = dateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!startMatch) {
    return { start: new Date(0), end: new Date(0) };
  }
  const year = parseInt(startMatch[1], 10);
  const startMonth = parseInt(startMatch[2], 10);
  const startDay = parseInt(startMatch[3], 10);
  const start = new Date(year, startMonth - 1, startDay);

  // 終了: "～" 以降を解析
  const afterTilde = dateText.split('～')[1] || '';
  // パターン1: "10月2日(金)" — 別の月
  const endFullMatch = afterTilde.match(/(\d{1,2})月(\d{1,2})日/);
  // パターン2: "6日(金)" — 同じ月
  const endDayMatch = afterTilde.match(/(\d{1,2})日/);

  let end: Date;
  if (endFullMatch) {
    end = new Date(year, parseInt(endFullMatch[1], 10) - 1, parseInt(endFullMatch[2], 10));
  } else if (endDayMatch) {
    end = new Date(year, startMonth - 1, parseInt(endDayMatch[1], 10));
  } else {
    end = start;
  }
  return { start, end };
}

function getEventStatus(dateText: string): 'past' | 'active' | 'upcoming' {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const { start, end } = parseDateRange(dateText);
  if (end < today) return 'past';
  if (start <= today && today <= end) return 'active';
  return 'upcoming';
}

const EventInfo: React.FC<EventInfoProps> = ({
  showHeader = true,
  onNavigateToRegistration,
  onToggleBookmark,
  isBookmarked,
  initialItems,
  items
}) => {
  // itemsが渡された場合はそれを使用（フィルタ済み）、なければinitialItemsまたはdefaultEventsを使用
  const [events, setEvents] = useState<EventItem[]>(items || initialItems || defaultEvents);

  // itemsが変更されたら更新
  useEffect(() => {
    if (items) {
      setEvents(items);
    }
  }, [items]);

  // 日付ソート: 開始日が近い順、過去イベントは末尾
  const sortedEvents = React.useMemo(() => {
    return [...events].sort((a, b) => {
      const statusA = getEventStatus(a.dateText);
      const statusB = getEventStatus(b.dateText);
      // 過去イベントを末尾に
      if (statusA === 'past' && statusB !== 'past') return 1;
      if (statusA !== 'past' && statusB === 'past') return -1;
      // 開催中を先頭に
      if (statusA === 'active' && statusB !== 'active') return -1;
      if (statusA !== 'active' && statusB === 'active') return 1;
      // 同じステータス内では開始日順
      const { start: sa } = parseDateRange(a.dateText);
      const { start: sb } = parseDateRange(b.dateText);
      return sa.getTime() - sb.getTime();
    });
  }, [events]);

  // 地域バッジ（視認性向上）
  const RegionBadge = ({ region }: { region: string }) => {
    let label = 'その他';
    let className = 'bg-gray-100 text-gray-600 border-gray-200';

    switch (region) {
      case 'tokyo':
        label = '東京';
        className = 'bg-blue-50 text-blue-700 border-blue-200';
        break;
      case 'chiba': // 幕張メッセ用
        label = '千葉';
        className = 'bg-cyan-50 text-cyan-700 border-cyan-200';
        break;
      case 'osaka':
        label = '大阪';
        className = 'bg-green-50 text-green-700 border-green-200';
        break;
      case 'fukuoka':
        label = '福岡';
        className = 'bg-orange-50 text-orange-700 border-orange-200';
        break;
      case 'nagoya':
        label = '名古屋';
        className = 'bg-purple-50 text-purple-700 border-purple-200';
        break;
    }

    return (
      <span className={`text-[10px] px-2 py-0.5 rounded border ${className} font-medium whitespace-nowrap`}>
        {label}
      </span>
    );
  };

  return (
    <div className="w-full">
      {showHeader && (
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FiCalendar className="text-blue-600" />
            イベント・展示会情報
          </h2>
          <button 
            onClick={onNavigateToRegistration}
            className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
          >
            <FiRefreshCw className="text-[10px]" /> 情報掲載依頼
          </button>
        </div>
      )}

      <div className="space-y-3">
        {sortedEvents.map((ev) => {
          const bookmarked = isBookmarked ? isBookmarked(ev.id) : false;
          const status = getEventStatus(ev.dateText);
          const isPast = status === 'past';
          const isActive = status === 'active';

          return (
            <div key={ev.id} className={`p-3 rounded-lg shadow-sm border transition-colors group ${
              isPast
                ? 'bg-gray-50 border-gray-200 opacity-60'
                : isActive
                  ? 'bg-white border-orange-300 ring-1 ring-orange-200 hover:border-orange-400'
                  : 'bg-white border-gray-200 hover:border-blue-300'
            }`}>
              
              {/* 上段：タイトルと操作ボタン */}
              <div className="flex justify-between items-start gap-3 mb-2">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <RegionBadge region={ev.region} />
                    {isActive && (
                      <span className="text-[10px] px-2 py-0.5 rounded border bg-red-50 text-red-600 border-red-300 font-bold whitespace-nowrap animate-pulse">
                        開催中
                      </span>
                    )}
                    {isPast && (
                      <span className="text-[10px] px-2 py-0.5 rounded border bg-gray-100 text-gray-400 border-gray-200 font-medium whitespace-nowrap">
                        終了
                      </span>
                    )}
                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                      <FiCalendar className="shrink-0" /> {ev.dateText}
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-sm text-gray-800 leading-snug group-hover:text-blue-700 transition-colors">
                    <a href={ev.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {ev.title}
                    </a>
                  </h3>
                </div>
                
                {/* 右上：操作アイコン群 */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* 公式サイトリンク */}
                  <a
                    href={ev.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title={ev.isOfficial ? "公式サイトを開く" : "詳細を検索"}
                  >
                    <FiGlobe className="w-4 h-4" />
                  </a>

                  {/* ブックマーク */}
                  {onToggleBookmark && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleBookmark(ev);
                      }}
                      className={`p-1.5 rounded transition-colors ${
                        bookmarked 
                          ? 'text-yellow-500 hover:bg-yellow-50' 
                          : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
                      }`}
                      title={bookmarked ? "保存済み" : "保存する"}
                    >
                      <FiBookmark className={`w-4 h-4 ${bookmarked ? "fill-current" : ""}`} />
                    </button>
                  )}
                </div>
              </div>

              {/* 下段：場所と説明文（コンパクト化） */}
              <div className="text-xs text-gray-600">
                <div className="flex items-center gap-1.5 mb-1 text-[11px] font-medium text-gray-700">
                  <FiMapPin className="text-gray-400 shrink-0" />
                  <span>{ev.venue}</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-snug line-clamp-2">
                  {ev.description}
                </p>
              </div>
            </div>
          );
        })}
        
        {sortedEvents.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded border border-dashed border-gray-300">
            <p className="text-gray-400 text-xs">現在表示できるイベント情報はありません。</p>
          </div>
        )}
      </div>
      
      <div className="mt-3 text-[10px] text-gray-400 text-right">
        情報確認日: 2026年4月21日
      </div>
    </div>
  );
};

export default EventInfo;
