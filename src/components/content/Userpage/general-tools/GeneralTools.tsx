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
import './tool-premium.css';
import { GENERAL_TOOL_GROUPS } from '@/lib/railMenu';
import { buildUserpageQuery, parseUserpageQuery } from '@/lib/userpageUrl';

import {
  GENERAL_TOOL_MENU,
  consumeGeneralTool,
  onGeneralTool,
  type GeneralToolId,
} from '@/lib/generalToolsMenu';

// 番号は一般ツール一覧（22 本）の並び。ツールの見出し（ToolHeader の no）と同じ番号を出す。
const LIST_NO: Record<string, string> = Object.fromEntries(
  GENERAL_TOOL_GROUPS.flatMap((g) => g.items)
    .map((it, i) => [it.tool ?? it.menu, String(i + 1).padStart(2, '0')]),
);





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
  // 頼みが無ければ URL の &t= を見る。頼みは読んだら消えるので、開発時の StrictMode で初期化が 2 回走ると
  // 2 回目は空になり、?m=general-tools&t=pdf-compressor を再読み込みしてもメモが出ていた（2026-11-15）。
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const isTool = (id?: string): id is TabType => GENERAL_TOOL_MENU.some((t) => t.id === id);
    const requested = consumeGeneralTool()?.toolId;
    if (isTool(requested)) return requested;
    if (typeof window !== 'undefined') {
      const fromUrl = parseUserpageQuery(window.location.search);
      if (fromUrl?.menu === 'general-tools' && isTool(fromUrl.tool)) return fromUrl.tool;
    }
    return 'memo';
  });

  // すでに開いている状態で左カラムの別ツールが押されたとき用。
  useEffect(() => onGeneralTool(({ toolId }) => {
    if (GENERAL_TOOL_MENU.some((t) => t.id === toolId)) setActiveTab(toolId);
  }), []);

  // 上のタブ（スマホ）で切り替えたときも URL の &t= を合わせる。合わせないと、再読み込み・共有で前のツールが開く。
  // 履歴は積まない（タブの行き来で「戻る」が埋まらないように）。
  useEffect(() => {
    const cur = parseUserpageQuery(window.location.search);
    if (cur?.menu !== 'general-tools' || cur.tool === activeTab) return;
    const query = buildUserpageQuery({ menu: 'general-tools', tool: activeTab });
    try {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${query}`);
    } catch { /* 失敗しても表示は変わらない */ }
  }, [activeTab]);









  return (
    <div className="p-0 bg-white">
      {/* ツール選択タブ
          lg 以上では左カラムの Ⅲ が同じ並びを出すので畳む。
          左カラムは hidden lg:block なので、狭い画面ではここが唯一のナビになる。
          並びとラベルは src/lib/generalToolsMenu.ts が唯一の定義。 */}
      <div role="navigation" aria-label="一般ツール" className="yy-gt-tabs lg:hidden">
        {/* 白地の下線タブ（.yy-tabs）。小さな等幅の番号とラベル、選択中は緑の下線 1 本。
            並びが画面幅を超えるので横スクロールのまま、ページ自体ははみ出させない。 */}
        <div className="yy-tabs">
          {GENERAL_TOOL_MENU.map((tool, i) => {
            const on = activeTab === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTab(tool.id)}
                aria-current={on ? 'page' : undefined}
                aria-pressed={on}
                className="yy-tab"
              >
                <small>{LIST_NO[tool.id] ?? String(i + 1).padStart(2, '0')}</small>
                {tool.label}
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
