'use client';

import React, { useState, useEffect } from 'react';
// ★修正: ルーティング関連は削除（タブ切り替えでURLを変えないため）
// import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import MapView from './MapView';
import PDFCompressor from './PDFCompressor';
import ImageConverter from './ImageConverter';
import ConstructionPhotos from './ConstructionPhotos';
import FileTransferTool from './FileTransfer';
import TempStorage from './TempStorage';
import Spreadsheet from './Spreadsheet';
import ScheduleTool from './ScheduleTool';
import BookmarkTool from './Bookmark';
import UnitConverter from './UnitConverter';
import AlarmTool from './AlarmTool';
import MemoTool from './Memo';
import Calculator from './Calculator';
import { 
  SiZoom, 
  SiGooglemeet, 
  SiWebex, 
  SiSlack, 
  SiDiscord 
} from 'react-icons/si';
import { BsMicrosoftTeams } from 'react-icons/bs';
import ToolHeader from '../ToolHeader';
import {
  GENERAL_TOOL_MENU,
  consumeGeneralTool,
  onGeneralTool,
  type GeneralToolId,
} from '@/lib/generalToolsMenu';


const MapSection: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="w-full bg-white rounded-b-lg shadow-sm border-b border-gray-100">
      <div className="px-4 py-1.5 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div>
        <h3 className="text-[13px] font-medium">地図</h3>
          <p className="text-[11px] mt-0.5">住所や施設名を検索して地図上で確認。OpenStreetMapを使用した無料の地図表示ツール</p>
        </div>
      </div>
      <div className="p-3">
        <MapView
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearch={() => {}}
        />
      </div>
    </div>
  );
};

const ONLINE_MEETING_TOOLS = [
  {
    name: 'Zoom',
    description: 'ビデオ会議のスタンダード。安定した通信と使いやすさが特徴',
    url: 'https://zoom.us/join',
    iconComponent: SiZoom,
    iconColor: '#2D8CFF', // Zoom Blue
  },
  {
    name: 'Microsoft Teams',
    description: 'Microsoft 365との連携が強み。ビジネス向けコラボレーション機能が充実',
    url: 'https://teams.microsoft.com/',
    iconComponent: BsMicrosoftTeams,
    iconColor: '#6264A7', // Teams Purple
  },
  {
    name: 'Google Meet',
    description: 'Googleアカウントがあれば即座に利用可能。Googleカレンダーとの連携が便利',
    url: 'https://meet.google.com/',
    iconComponent: SiGooglemeet,
    iconColor: '#00897B', // Meet Green/Teal
  },
  {
    name: 'Webex',
    description: 'セキュリティ重視の企業向けWeb会議システム。大規模会議に強み',
    url: 'https://web.webex.com/join-meeting',
    iconComponent: SiWebex,
    iconColor: '#000000', // Webex Black
  },
  {
    name: 'Slack Huddle',
    description: 'Slackユーザー向けの気軽な音声通話。画面共有もスムーズ',
    url: 'https://slack.com/',
    iconComponent: SiSlack,
    iconColor: '#4A154B', // Slack Aubergine
  },
  {
    name: 'Discord',
    description: 'カジュアルなコミュニケーションに最適。画面共有や複数チャンネル管理が可能',
    url: 'https://discord.com/channels/@me',
    iconComponent: SiDiscord,
    iconColor: '#5865F2', // Discord Blurple
  }
];


// タブの並び・ラベル・id は src/lib/generalToolsMenu.ts が唯一の定義。
// 左カラムの Ⅲ が同じ並びを出すので、ここで直書きしない。
type TabType = GeneralToolId;

const GeneralTools: React.FC = () => {
  // ★修正: ルーター関連の処理を削除
  // const searchParams = useSearchParams();
  // const router = useRouter();
  // const pathname = usePathname();
  
  // ★修正: シンプルなState管理に変更（初期値は'memo'）
  // 左カラムの Ⅲ からツールを指定して開かれた場合は、それで初期表示する。
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const requested = consumeGeneralTool();
    return GENERAL_TOOL_MENU.some((t) => t.id === requested?.toolId) ? requested!.toolId : 'memo';
  });

  // すでに開いている状態で左カラムの別ツールが押されたとき用。
  useEffect(() => onGeneralTool(({ toolId }) => {
    if (GENERAL_TOOL_MENU.some((t) => t.id === toolId)) setActiveTab(toolId);
  }), []);




  const renderOLMT = () => (
    <div className="w-full bg-white rounded-b-lg shadow-sm border-b border-gray-100">
      <div className="px-4 py-1.5 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div>
        <h3 className="text-[13px] font-medium">OLMT</h3>
          <p className="text-[11px] mt-0.5">Zoom、Teams、Google Meetなど主要なオンラインミーティングツールへのクイックアクセス</p>
        </div>
      </div>
      <div className="p-3 [&>*]:border [&>*]:border-[#3b3b3b] [&>*]:p-3">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {ONLINE_MEETING_TOOLS.map((tool) => (
        <a
          key={tool.name}
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-100"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 flex-shrink-0 bg-gray-50 rounded-lg flex items-center justify-center">
              {tool.iconComponent ? (
                <tool.iconComponent size={24} color={tool.iconColor} />
              ) : (
                <span className="text-xl font-medium text-gray-400">{tool.name[0]}</span>
              )}
            </div>
            <div>
              <h3 className="text-base font-medium text-gray-900">
                {tool.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {tool.description}
              </p>
            </div>
          </div>
        </a>
      ))}
        </div>
      </div>
    </div>
  );




  return (
    <div className="p-0 bg-white">
      {/* ツール選択タブ
          lg 以上では左カラムの Ⅲ が同じ並びを出すので畳む。
          左カラムは hidden lg:block なので、狭い画面ではここが唯一のナビになる。
          並びとラベルは src/lib/generalToolsMenu.ts が唯一の定義。 */}
      <div className="bg-[#3b3b3b] w-full overflow-x-auto lg:hidden">
        <div className="flex">
          {GENERAL_TOOL_MENU.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTab(tool.id)}
              className={`flex-1 px-2 py-2 text-xs font-medium focus:outline-none transition whitespace-nowrap ${
                activeTab === tool.id
                  ? 'bg-[#1dad95] text-white'
                  : 'bg-[#3b3b3b] text-white hover:bg-[#0f6b5a]'
              }`}
            >
              {tool.label}
            </button>
          ))}
        </div>
        
        {/* アクティブタブの説明文 */}
      </div>

      {/* ツールコンテンツ */}
      {/* 上の余白は、その上にあるタブ行と離すためのもの。タブ行は lg:hidden なので、
          PC では余白も要らない。以前はツール名を全部並べた条件式でこれを出し分けて
          いたため、ツールを足すたびに書き足す必要があり、実際に工事写真で漏れて
          16px ぶん画面からはみ出した。 */}
      <div className="mt-4 lg:mt-0">
      {activeTab === 'memo' && <MemoTool />}
        {activeTab === 'olmt' && renderOLMT()}
        {activeTab === 'schedule' && <ScheduleTool />}
        {activeTab === 'calc' && <Calculator />}
        {activeTab === 'sheet' && <Spreadsheet />}
        {activeTab === 'image-converter' && <ImageConverter />}
        {activeTab === 'construction-photos' && <ConstructionPhotos />}
        {activeTab === 'map' && <MapSection />}
        {activeTab === 'pdf-compressor' && <PDFCompressor />}
        {activeTab === 'temp-storage' && <TempStorage />}
        {activeTab === 'file-transfer' && <FileTransferTool />}
        {activeTab === 'unit-converter' && <UnitConverter />}
        {activeTab === 'alarm' && <AlarmTool />}
        {activeTab === 'bookmark' && <BookmarkTool />}
      {!activeTab && (
          <div className="text-center text-gray-500 py-8">
            ツールを選択してください
        </div>
      )}
      </div>
    </div>
  );
};

export default GeneralTools; 
