'use client';

import React, { useState, useEffect } from 'react';
// ★修正: ルーティング関連は削除（タブ切り替えでURLを変えないため）
// import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import MapView from './MapView';
import PDFCompressor from './PDFCompressor';
import ImageConverter from './ImageConverter';
import ConstructionPhotos from './ConstructionPhotos';
import DrawingPdf from './DrawingPdf';
import FileTransferTool from './FileTransfer';
import TempStorage from './TempStorage';
import Spreadsheet from './Spreadsheet';
import ScheduleTool from './ScheduleTool';
import BookmarkTool from './Bookmark';
import UnitConverter from './UnitConverter';
import AlarmTool from './AlarmTool';
import MemoTool from './Memo';
import Calculator from './Calculator';
import Olmt from './olmt/Olmt';
import ToolHeader from '../ToolHeader';
import {
  GENERAL_TOOL_MENU,
  consumeGeneralTool,
  onGeneralTool,
  type GeneralToolId,
} from '@/lib/generalToolsMenu';





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
        {activeTab === 'olmt' && <Olmt />}
        {activeTab === 'schedule' && <ScheduleTool />}
        {activeTab === 'calc' && <Calculator />}
        {activeTab === 'sheet' && <Spreadsheet />}
        {activeTab === 'image-converter' && <ImageConverter />}
        {activeTab === 'construction-photos' && <ConstructionPhotos />}
        {activeTab === 'map' && <MapView />}
        {activeTab === 'pdf-compressor' && <PDFCompressor />}
        {activeTab === 'drawing-pdf' && <DrawingPdf />}
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
