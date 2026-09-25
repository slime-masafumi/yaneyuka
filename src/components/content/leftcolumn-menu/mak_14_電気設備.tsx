import React, { useState } from 'react';
import MakerLink from '@/components/MakerLink';
import MakerRows from '@/components/MakerRows';
import BasicKnowledge, { KnowledgeToggle, type KnowledgeEntry } from '@/components/BasicKnowledge';
import KNOWLEDGE_JSON from '@/data/knowledge/electrical-systems.json';

const KNOWLEDGE = KNOWLEDGE_JSON as unknown as KnowledgeEntry[];


interface ElectricalSystemsContentProps {
  subcategory: string;
  onNavigateToRegistration?: () => void;
}

const ElectricalSystemsContent: React.FC<ElectricalSystemsContentProps> = ({ subcategory, onNavigateToRegistration }) => {
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
        {/* カード内のCTAは削除（見出し右に配置） */}
      <img
        src={imageErrors['commercial'] ? '/image/ChatGPT Image 2025年5月1日 16_25_41.webp' : 'image/ChatGPT Image 2025年5月1日 16_25_41.webp'}
        alt="Manufacturer Commercial"
        className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]"
        onError={() => handleImageError('commercial')}
      />
    </div>
  );

  const renderHeader = (title: string) => (
    <div className="mb-2">
      <h2 className="text-xl font-semibold inline">{title}</h2>
      {onNavigateToRegistration ? (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onNavigateToRegistration();
          }}
          className="ml-2 align-baseline text-blue-600 hover:text-blue-800 text-[11px]"
        >
          掲載希望はコチラ
        </a>
      ) : (
        <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
      )}
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

  const renderLightingCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">照明</h2>
        <button
          onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
          className="ml-2 align-baseline text-blue-600 hover:text-blue-800 text-[11px] underline"
        >
          <span className={`inline-block transition-transform ${showBasicKnowledge ? 'rotate-90' : ''}`}>&gt;</span> 基本知識
        </button>
        {onNavigateToRegistration ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigateToRegistration();
            }}
            className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]"
          >
            掲載希望はコチラ
          </a>
        ) : (
          <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
        )}
      </div>
      
      {/* 基本知識トグル */}
      {showBasicKnowledge && <BasicKnowledge data={KNOWLEDGE} param={subcategory} />}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {<MakerRows category="電気設備" page="照明" />}
      </div>
    </div>
  );

  const renderExteriorLightingCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">外構照明</h2>
        <button
          onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
          className="ml-2 align-baseline text-blue-600 hover:text-blue-800 text-[11px] underline"
        >
          <span className={`inline-block transition-transform ${showBasicKnowledge ? 'rotate-90' : ''}`}>&gt;</span> 基本知識
        </button>
        {onNavigateToRegistration ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigateToRegistration();
            }}
            className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]"
          >
            掲載希望はコチラ
          </a>
        ) : (
          <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
        )}
      </div>
      
      {/* 基本知識トグル */}
      {showBasicKnowledge && <BasicKnowledge data={KNOWLEDGE} param={subcategory} />}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {<MakerRows category="電気設備" page="外構照明" />}
      </div>
    </div>
  );

  const renderSwitchConsentCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">SW・コンセント</h2>
        <button
          onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
          className="ml-2 align-baseline text-blue-600 hover:text-blue-800 text-[11px] underline"
        >
          <span className={`inline-block transition-transform ${showBasicKnowledge ? 'rotate-90' : ''}`}>&gt;</span> 基本知識
        </button>
        {onNavigateToRegistration ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigateToRegistration();
            }}
            className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]"
          >
            掲載希望はコチラ
          </a>
        ) : (
          <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
        )}
      </div>
      
      {/* 基本知識トグル */}
      {showBasicKnowledge && <BasicKnowledge data={KNOWLEDGE} param={subcategory} />}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {<MakerRows category="電気設備" page="スイッチコンセント" />}
      </div>
    </div>
  );

  const renderGeneratorCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">発電機</h2>
        <button
          onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
          className="ml-2 align-baseline text-blue-600 hover:text-blue-800 text-[11px] underline"
        >
          <span className={`inline-block transition-transform ${showBasicKnowledge ? 'rotate-90' : ''}`}>&gt;</span> 基本知識
        </button>
        {onNavigateToRegistration ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigateToRegistration();
            }}
            className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]"
          >
            掲載希望はコチラ
          </a>
        ) : (
          <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
        )}
      </div>
      
      {/* 基本知識トグル */}
      {showBasicKnowledge && <BasicKnowledge data={KNOWLEDGE} param={subcategory} />}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>

      {<MakerRows category="電気設備" page="発電機" />}
    </div>
  );

  const renderGenericCategory = (title: string) => (
    <div>
      {renderHeader(title)}
      <KnowledgeToggle data={KNOWLEDGE} param={subcategory} />
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {renderCompanyRow('パナソニック', {
          products: 'https://www2.panasonic.biz/jp/lighting/',
          catalog: 'https://www2.panasonic.biz/jp/catalog/',
          office: 'https://www2.panasonic.biz/jp/company/',
          contact: 'https://www2.panasonic.biz/jp/contact/'
        })}
        {renderCompanyRow('コイズミ照明', {
          products: 'https://www.koizumi-lt.co.jp/product/',
          catalog: 'https://www.koizumi-lt.co.jp/catalog/',
          office: 'https://www.koizumi-lt.co.jp/company/',
          contact: 'https://www.koizumi-lt.co.jp/contact/'
        })}
        {renderCompanyRow('大光電機', {
          products: 'https://www.lighting-daiko.co.jp/product/',
          catalog: 'https://www.lighting-daiko.co.jp/catalog/',
          office: 'https://www.lighting-daiko.co.jp/company/base/',
          contact: 'https://www.lighting-daiko.co.jp/contact/'
        })}
        {renderCompanyRow('オーデリック', {
          products: 'https://www.odelic.co.jp/products/',
          catalog: 'https://www.odelic.co.jp/catalog/',
          office: 'https://www.odelic.co.jp/company/',
          contact: 'https://www.odelic.co.jp/contact/'
        })}
        {renderCompanyRow('遠藤照明', {
          products: 'https://www.endo-lighting.co.jp/products/',
          catalog: '#',
          office: 'https://www.endo-lighting.co.jp/company/base/',
          contact: 'https://www.endo-lighting.co.jp/contact/'
        })}
        {renderCompanyRow('東芝ライテック', {
          products: 'https://www.tlt.co.jp/tlt/products/',
          catalog: '#',
          office: 'https://www.tlt.co.jp/tlt/company/base/',
          contact: 'https://www.tlt.co.jp/tlt/contact/'
        })}
        {renderCompanyRow('岩崎電気', {
          products: 'https://www.iwasaki.co.jp/lighting/products/',
          catalog: '#',
          office: 'https://www.iwasaki.co.jp/company/base/',
          contact: 'https://www.iwasaki.co.jp/contact/'
        })}
      </div>
    </div>
  );

  switch (subcategory) {
    case '照明':
      return renderLightingCategory();
    case '外構照明':
      return renderExteriorLightingCategory();
    case 'スイッチコンセント':
      return renderSwitchConsentCategory();
    case '発電機':
      return renderGeneratorCategory();
    case '電気設備その他':
      return renderGenericCategory('電気設備 その他');
    default:
      return null;
  }
};

export default ElectricalSystemsContent; 