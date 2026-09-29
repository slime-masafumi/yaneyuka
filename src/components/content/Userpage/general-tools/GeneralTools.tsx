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
      <div role="navigation"
        aria-label="一般ツール"
        className="bg-[#141414] w-full overflow-x-auto lg:hidden border-b border-black"
      >
        {/* 墨の帯に等幅の小さな番号と 11px のラベル。選択中は塗らずに差し色の
            細い下線 1 本で示す（見出し帯と同じ「差し色は光として 1 点だけ」）。
            並びが画面幅を超えるので横スクロールのまま、ページ自体ははみ出させない。 */}
        <div className="flex">
          {GENERAL_TOOL_MENU.map((tool, i) => {
            const on = activeTab === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTab(tool.id)}
                aria-current={on ? 'page' : undefined}
                className={`shrink-0 flex items-baseline gap-1.5 px-3 pt-2 pb-[7px] text-[11px] whitespace-nowrap border-b transition-colors focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#52AA96] ${
                  on ? 'text-white border-[#52AA96]' : 'text-[#aaa69d] border-transparent hover:text-white'
                }`}
              >
                <span className={`yy-mono text-[9px] tracking-[0.08em] ${on ? 'text-[#52AA96]' : 'text-[#6f6b63]'}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>
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
