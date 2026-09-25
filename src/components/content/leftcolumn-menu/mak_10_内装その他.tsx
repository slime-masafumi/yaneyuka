import React, { useState } from 'react';
import MakerLink from '@/components/MakerLink';
import MakerRows from '@/components/MakerRows';
import BasicKnowledge, { KnowledgeToggle, type KnowledgeEntry } from '@/components/BasicKnowledge';
import KNOWLEDGE_JSON from '@/data/knowledge/internal-other.json';

const KNOWLEDGE = KNOWLEDGE_JSON as unknown as KnowledgeEntry[];


interface InternalOtherContentProps {
  subcategory: string;
}

const InternalOtherContent: React.FC<InternalOtherContentProps> = ({ subcategory }) => {
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
        src={imageError['recruitment'] ? "/image/掲載募集中a.png" : "/image/掲載募集中a.png"} 
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
        src={imageError['commercial'] ? "/image/ChatGPT Image 2025年5月1日 16_25_41.webp" : "/image/ChatGPT Image 2025年5月1日 16_25_41.webp"} 
        alt="Manufacturer Commercial" 
        className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]"
        onError={() => handleImageError('commercial')}
      />
    </div>
  );

  const renderToiletBooth = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">トイレブース</h2>
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

      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="トイレブース" />
      </div>
    </div>
  );

  const renderInteriorSash = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">内装サッシ</h2>
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

      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="内装サッシ" />
      </div>
    </div>
  );

  const renderNonSlip = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">ノンスリップ</h2>
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

      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="ノンスリップ" />
      </div>
    </div>
  );

  const renderInteriorShutter = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">内装シャッター</h2>
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

      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="内装シャッター" />
      </div>
    </div>
  );

  const renderInteriorHandrail = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">内装手摺</h2>
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

      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="内装手摺" />
      </div>
    </div>
  );

  const renderGrating = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">グレーチング</h2>
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

      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="グレーチング" />
      </div>
    </div>
  );

  const renderInspectionPort = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">点検口</h2>
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

      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="点検口" />
      </div>
    </div>
  );

  const renderBraille = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">点字</h2>
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

      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="点字" />
      </div>
    </div>
  );

  const renderDisplay = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">ディスプレイ</h2>
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

      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="ディスプレイ" />
      </div>
    </div>
  );

  const renderOtherInterior = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">内装その他製品</h2>
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

      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="内装その他製品" />
      </div>
    </div>
  );

  const renderGreen化 = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">内装 緑化</h2>
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

      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="内装緑化" />
      </div>
    </div>
  );

  const renderPartition = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">隔壁</h2>
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

      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="隔壁" />
      </div>
    </div>
  );

  const renderProtectionMaterial = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">保護材</h2>
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

      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="保護材" />
      </div>
    </div>
  );

  const renderGenericCategory = (title: string) => (
    <div>
      <div className="content-title-wrapper mb-2">
        <h2 className="text-xl font-semibold inline">{title}</h2>
        <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
      </div>
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ダイケン</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.daiken.ne.jp/product/', '商品ページ')}｜
          {renderLink('https://www.daiken.ne.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.daiken.ne.jp/company/office/', '営業所')}｜
          {renderLink('https://www.daiken.ne.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・フクビ化学</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.fukuvi.co.jp/product/', '商品ページ')}｜
          {renderLink('https://www.fukuvi.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.fukuvi.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.fukuvi.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (subcategory) {
      case 'トイレブース':
        return renderToiletBooth();
      case '内装サッシ':
        return renderInteriorSash();
      case '内装シャッター':
        return renderInteriorShutter();
      case 'ノンスリップ':
        return renderNonSlip();
      case '内装手摺':
        return renderInteriorHandrail();
      case 'グレーチング':
        return renderGrating();
      case '点検口':
        return renderInspectionPort();
      case '内装緑化':
        return renderGreen化();
      case '隔壁':
        return renderPartition();
      case '保護材':
        return renderProtectionMaterial();
      case '点字':
        return renderBraille();
      case 'ディスプレイ':
        return renderDisplay();
      case '内装その他製品':
        return renderOtherInterior();
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

export default InternalOtherContent; 