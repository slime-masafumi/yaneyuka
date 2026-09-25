import React, { useState } from 'react';
import MakerLink from '@/components/MakerLink';
import MakerRows from '@/components/MakerRows';
import BasicKnowledge, { KnowledgeToggle, type KnowledgeEntry } from '@/components/BasicKnowledge';
import KNOWLEDGE_JSON from '@/data/knowledge/internal-ceiling.json';

const KNOWLEDGE = KNOWLEDGE_JSON as unknown as KnowledgeEntry[];


interface InternalCeilingContentProps {
  subcategory: string;
}

const InternalCeilingContent: React.FC<InternalCeilingContentProps> = ({ subcategory }) => {
  const [imageError, setImageError] = useState<{ [key: string]: boolean }>({});
  const [showBasicKnowledge, setShowBasicKnowledge] = useState(false);

  const handleImageError = (imageName: string) => {
    setImageError(prev => ({ ...prev, [imageName]: true }));
  };

  // URLの有効性をチェックする関数

  // リンクの実体は src/components/MakerLink.tsx。
  // 404 になったメーカーページは会社トップへ自動で振り替わる。
  const renderLink = (url: string | undefined, label: string) => (
    <MakerLink url={url} label={label} />
  );

  const renderRecrutmentCard = () => (
    <div className="border rounded p-3 bg-white text-sm w-[240px] h-[365px] card">
      <img 
        src="/image/掲載募集中a.png" 
        alt="掲載企業様募集中" 
        className="w-30 mb-1 w-[clamp(300x,5vw,120px)]"
        onError={() => handleImageError('recruitment')}
      />
      <div className="font-bold text-sm mb-2">□□□</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <a href="#" target="_blank" className="bg-gray-200 text-black text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">商品ページ</a>
        <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">カタログ</a>
        <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">営業所</a>
        <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">お問い合わせ</a>
        <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">サンプル</a>
        <a href="#" className="bg-gray-200 text-center py-1 rounded text-[10px] hover:bg-gray-700 hover:text-white transition">CADDOWNLOAD</a>
      </div>
      <img 
        src="/image/ChatGPT Image 2025年5月1日 16_25_41.webp" 
        alt="Manufacturer Commercial" 
        className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]"
        onError={() => handleImageError('commercial')}
      />
    </div>
  );

  const renderBoard = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">内装天井 ボード</h2>
        <button
          onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
          className="ml-2 align-baseline text-blue-600 hover:text-blue-800 text-[11px] underline"
        >
          <span className={`inline-block transition-transform ${showBasicKnowledge ? 'rotate-90' : ''}`}>&gt;</span> 基本知識
        </button>
        <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
      </div>
      
      {/* 基本知識トグル */}
      {showBasicKnowledge && <BasicKnowledge data={KNOWLEDGE} param={subcategory} />}
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      {/* 化粧石膏ボード */}
      <div className="flex items-center mb-1">
        <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">化粧石膏ボード</span>
        <div className="flex-1 h-px bg-gray-300 ml-2"></div>
      </div>
      <div className="text-[13px]">
        <MakerRows category="内装天井材" page="ボード" group="化粧石膏ボード" />
      </div>

      {/* 吸音石膏ボード */}
      <div className="flex items-center mt-4 mb-1">
        <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">吸音石膏ボード</span>
        <div className="flex-1 h-px bg-gray-300 ml-2"></div>
      </div>
      <div className="text-[13px]">
        <MakerRows category="内装天井材" page="ボード" group="吸音石膏ボード" />
      </div>
      
      {/* ロックウール吸音板 */}
      <div className="flex items-center mt-4 mb-1">
        <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">ロックウール吸音板</span>
        <div className="flex-1 h-px bg-gray-300 ml-2"></div>
      </div>
      <div className="text-[13px]">
        <MakerRows category="内装天井材" page="ボード" group="ロックウール吸音板" />
      </div>
    </div>
  );

  const renderDecorative = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">内装天井 化粧材</h2>
        <button
          onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
          className="ml-2 align-baseline text-blue-600 hover:text-blue-800 text-[11px] underline"
        >
          <span className={`inline-block transition-transform ${showBasicKnowledge ? 'rotate-90' : ''}`}>&gt;</span> 基本知識
        </button>
        <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
      </div>
      
      {/* 基本知識トグル */}
      {showBasicKnowledge && <BasicKnowledge data={KNOWLEDGE} param={subcategory} />}
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      {/* スパンドレル */}
      <div className="flex items-center mb-1">
        <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">スパンドレル</span>
        <div className="flex-1 h-px bg-gray-300 ml-2"></div>
      </div>
      <div className="text-[13px]">
        <MakerRows category="内装天井材" page="化粧材" group="スパンドレル" />
      </div>

      {/* 木質パネル */}
      <div className="flex items-center mt-4 mb-1">
        <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">木質パネル</span>
        <div className="flex-1 h-px bg-gray-300 ml-2"></div>
      </div>
      <div className="text-[13px]">
        <MakerRows category="内装天井材" page="化粧材" group="木質パネル" />
      </div>
    </div>
  );

  const renderDecorativeMaterial = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">内装天井 装飾材</h2>
        <button
          onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
          className="ml-2 align-baseline text-blue-600 hover:text-blue-800 text-[11px] underline"
        >
          <span className={`inline-block transition-transform ${showBasicKnowledge ? 'rotate-90' : ''}`}>&gt;</span> 基本知識
        </button>
        <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
      </div>
      
      {/* 基本知識トグル */}
      {showBasicKnowledge && <BasicKnowledge data={KNOWLEDGE} param={subcategory} />}
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      {/* ルーバー */}
      <div className="flex items-center mb-1">
        <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">ルーバー</span>
        <div className="flex-1 h-px bg-gray-300 ml-2"></div>
      </div>
      <div className="text-[13px]">
        <MakerRows category="内装天井材" page="装飾材" group="ルーバー" />
      </div>

      {/* 格子 */}
      <div className="flex items-center mt-4 mb-1">
        <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">格子</span>
        <div className="flex-1 h-px bg-gray-300 ml-2"></div>
      </div>
      <div className="text-[13px]">
        <MakerRows category="内装天井材" page="装飾材" group="格子" />
      </div>
    </div>
  );

  const renderFunctional = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">機能性内装天井</h2>
        <button
          onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
          className="ml-2 align-baseline text-blue-600 hover:text-blue-800 text-[11px] underline"
        >
          <span className={`inline-block transition-transform ${showBasicKnowledge ? 'rotate-90' : ''}`}>&gt;</span> 基本知識
        </button>
        <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
      </div>
      
      {/* 基本知識トグル */}
      {showBasicKnowledge && <BasicKnowledge data={KNOWLEDGE} param={subcategory} />}
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      {/* システム天井 */}
      <div className="flex items-center mb-1">
        <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">システム天井</span>
        <div className="flex-1 h-px bg-gray-300 ml-2"></div>
      </div>
      <div className="text-[13px]">
        <MakerRows category="内装天井材" page="機能性" group="システム天井" />
      </div>
    </div>
  );

  const renderOther = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">内装天井 その他</h2>
        <button
          onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
          className="ml-2 align-baseline text-blue-600 hover:text-blue-800 text-[11px] underline"
        >
          <span className={`inline-block transition-transform ${showBasicKnowledge ? 'rotate-90' : ''}`}>&gt;</span> 基本知識
        </button>
        <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
      </div>
      
      {/* 基本知識トグル */}
      {showBasicKnowledge && <BasicKnowledge data={KNOWLEDGE} param={subcategory} />}
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      {/* その他企業 */}
      <div className="mt-4 text-[13px]">
        <MakerRows category="内装天井材" page="その他" />
      </div>
    </div>
  );

  const renderContent = () => {
    switch (subcategory) {
      case '内装天井ボード':
      case 'ボード':
        return renderBoard();
      case '内装天井化粧材':
      case '化粧材':
        return renderDecorative();
      case '内装天井装飾材':
      case '装飾材':
        return renderDecorativeMaterial();
      case '内装天井機能性':
      case '機能性':
        return renderFunctional();
      case '内装天井その他':
      case 'その他':
        return renderOther();
      default:
        return null;
    }
  };

  return (
    <div>
      {renderContent()}
    </div>
  );
};

export default InternalCeilingContent; 