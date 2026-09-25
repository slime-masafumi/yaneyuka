import React, { useState } from 'react';
import MakerLink from '@/components/MakerLink';
import MakerRows from '@/components/MakerRows';
import BasicKnowledge, { KnowledgeToggle, type KnowledgeEntry } from '@/components/BasicKnowledge';
import KNOWLEDGE_JSON from '@/data/knowledge/furniture.json';

const KNOWLEDGE = KNOWLEDGE_JSON as unknown as KnowledgeEntry[];


interface FurnitureContentProps {
  subcategory: string;
}

const FurnitureContent: React.FC<FurnitureContentProps> = ({ subcategory }) => {
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});
  const [showBasicKnowledge, setShowBasicKnowledge] = useState(false);

  const handleImageError = (imageKey: string) => {
    setImageErrors(prev => ({ ...prev, [imageKey]: true }));
  };

  // リンクの実体は src/components/MakerLink.tsx。
  // 404 になったメーカーページは会社トップへ自動で振り替わる。
  const renderLink = (url: string | undefined, label: string) => (
    <MakerLink url={url} label={label} />
  );

  const renderRecruitmentCard = () => (
    <div className="border rounded p-3 bg-white text-sm w-[240px] h-[365px] card">
      <img
        src={imageErrors['recruitment'] ? '/image/掲載募集中a.png' : 'image/掲載募集中a.png'}
        alt="掲載企業様募集中"
        className="w-30 mb-1 w-[clamp(300px,5vw,120px)]"
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
        src={imageErrors['commercial'] ? '/image/ChatGPT Image 2025年5月1日 16_25_41.webp' : 'image/ChatGPT Image 2025年5月1日 16_25_41.webp'}
        alt="Manufacturer Commercial"
        className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]"
        onError={() => handleImageError('commercial')}
      />
    </div>
  );

  const renderCompanyRow = (companyName: string, links: { [key: string]: string }) => {
    return (
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・{companyName}</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink(links.products, '商品ページ')}｜
          {renderLink(links.catalog, 'カタログ')}｜
          {renderLink(links.office, '営業所')}｜
          {renderLink(links.contact, 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    );
  };

  const renderFurnitureCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">家具</h2>
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
        {renderRecruitmentCard()}
      </div>
      <div className="flex items-center mt-0 mb-1">
        <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">家具（屋内）</span>
        <div className="flex-1 h-px bg-gray-300 ml-2"></div>
      </div>
      <div className="mt-2">
        {<MakerRows category="ファニチャー" page="家具" group="家具（屋内）" />}
        <div className="flex items-center mt-4 mb-1">
          <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">家具（屋外）</span>
          <div className="flex-1 h-px bg-gray-300 ml-2"></div>
        </div>
        {<MakerRows category="ファニチャー" page="家具" group="家具（屋外）" />}
      </div>
    </div>
  );

  const renderCurtainCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">カーテン</h2>
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
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {<MakerRows category="ファニチャー" page="カーテン" />}
      </div>
    </div>
  );

  const renderBlindCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">ブラインド</h2>
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
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {<MakerRows category="ファニチャー" page="ブラインド" />}
      </div>
    </div>
  );

  const renderFabricCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">生地</h2>
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
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {<MakerRows category="ファニチャー" page="生地" />}
      </div>
    </div>
  );

  const renderOtherFurnitureCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">ファニチャーその他</h2>
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
        {renderRecruitmentCard()}
      </div>

      {<MakerRows category="ファニチャー" page="ファニチャーその他" />}
    </div>
  );

  const renderGenericCategory = (title: string) => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">{title}</h2>
        <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
      </div>
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {renderCompanyRow('サンゲツ', {
          products: 'https://www.sangetsu.co.jp/product/',
          catalog: 'https://www.sangetsu.co.jp/catalog/',
          office: 'https://www.sangetsu.co.jp/company/base/',
          contact: 'https://www.sangetsu.co.jp/contact/'
        })}
        {renderCompanyRow('リリカラ', {
          products: 'https://www.lilycolor.co.jp/interior/',
          catalog: 'https://www.lilycolor.co.jp/catalog/',
          office: 'https://www.lilycolor.co.jp/company/base/',
          contact: 'https://www.lilycolor.co.jp/contact/'
        })}
        {renderCompanyRow('川島織物セルコン', {
          products: 'https://www.kawashimaselkon.co.jp/curtain/',
          catalog: '#',
          office: 'https://www.kawashimaselkon.co.jp/company/base/',
          contact: 'https://www.kawashimaselkon.co.jp/contact/'
        })}
        {renderCompanyRow('タチカワブラインド', {
          products: 'https://www.blind.co.jp/products/',
          catalog: 'https://www.blind.co.jp/catalog/',
          office: 'https://www.blind.co.jp/company/base/',
          contact: 'https://www.blind.co.jp/contact/'
        })}
        {renderCompanyRow('ニチベイ', {
          products: 'https://www.nichi-bei.co.jp/products/',
          catalog: 'https://www.nichi-bei.co.jp/catalog/',
          office: 'https://www.nichi-bei.co.jp/company/base/',
          contact: 'https://www.nichi-bei.co.jp/contact/'
        })}
      </div>
    </div>
  );

  switch (subcategory) {
    case '家具':
      return renderFurnitureCategory();
    case 'カーテン':
      return renderCurtainCategory();
    case 'ブラインド':
      return renderBlindCategory();
    case '生地':
      return renderFabricCategory();
    case 'ファニチャーその他':
      return renderOtherFurnitureCategory();
    default:
      return null;
  }
};

export default FurnitureContent; 