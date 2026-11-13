import React, { useState } from 'react';
import MakerLink from '@/components/MakerLink';
import MakerRows from '@/components/MakerRows';
import MakerCount from './MakerCount';
import './materials.css';
import BasicKnowledge, { KnowledgeToggle, type KnowledgeEntry } from '@/components/BasicKnowledge';
import KNOWLEDGE_JSON from '@/data/knowledge/electrical-systems.json';

const KNOWLEDGE = KNOWLEDGE_JSON as unknown as KnowledgeEntry[];


interface ElectricalSystemsContentProps {
  subcategory: string;
  onNavigateToRegistration?: () => void;
}

const ElectricalSystemsContent: React.FC<ElectricalSystemsContentProps> = ({ subcategory, onNavigateToRegistration }) => {
  const [showBasicKnowledge, setShowBasicKnowledge] = useState(false);

  // リンクの実体は src/components/MakerLink.tsx。
  // 404 になったメーカーページは会社トップへ自動で振り替わる。
  const renderLink = (url: string | undefined, label: string) => (
    <MakerLink url={url} label={label} />
  );

  const renderHeader = (title: string) => (
    <div className="yy-mk2-head">
      <h2 className="yy-mk2-title">{title}</h2>
      {onNavigateToRegistration ? (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onNavigateToRegistration();
          }}
          className="yy-mk2-reg"
        >
          掲載希望はコチラ
        </a>
      ) : (
        <a href="/register" className="yy-mk2-reg">掲載希望はコチラ</a>
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
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">照明</h2>
        <MakerCount category="電気設備" page="照明" />
        <button
          onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
          type="button"
          className="yy-bk-toggle"
          aria-expanded={showBasicKnowledge}
        >
          基本知識<span className={`yy-bk-chev${showBasicKnowledge ? ' is-open' : ''}`} aria-hidden="true" />
        </button>
        {onNavigateToRegistration ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigateToRegistration();
            }}
            className="yy-mk2-reg"
          >
            掲載希望はコチラ
          </a>
        ) : (
          <a href="/register" className="yy-mk2-reg">掲載希望はコチラ</a>
        )}
      </div>
      
      {/* 基本知識トグル */}
      {showBasicKnowledge && <BasicKnowledge data={KNOWLEDGE} param={subcategory} />}
      
      <div className="mt-4">
        {<MakerRows category="電気設備" page="照明" />}
      </div>
    </div>
  );

  const renderExteriorLightingCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">外構照明</h2>
        <MakerCount category="電気設備" page="外構照明" />
        <button
          onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
          type="button"
          className="yy-bk-toggle"
          aria-expanded={showBasicKnowledge}
        >
          基本知識<span className={`yy-bk-chev${showBasicKnowledge ? ' is-open' : ''}`} aria-hidden="true" />
        </button>
        {onNavigateToRegistration ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigateToRegistration();
            }}
            className="yy-mk2-reg"
          >
            掲載希望はコチラ
          </a>
        ) : (
          <a href="/register" className="yy-mk2-reg">掲載希望はコチラ</a>
        )}
      </div>
      
      {/* 基本知識トグル */}
      {showBasicKnowledge && <BasicKnowledge data={KNOWLEDGE} param={subcategory} />}
      
      <div className="mt-4">
        {<MakerRows category="電気設備" page="外構照明" />}
      </div>
    </div>
  );

  const renderSwitchConsentCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">SW・コンセント</h2>
        <MakerCount category="電気設備" page="スイッチコンセント" />
        <button
          onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
          type="button"
          className="yy-bk-toggle"
          aria-expanded={showBasicKnowledge}
        >
          基本知識<span className={`yy-bk-chev${showBasicKnowledge ? ' is-open' : ''}`} aria-hidden="true" />
        </button>
        {onNavigateToRegistration ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigateToRegistration();
            }}
            className="yy-mk2-reg"
          >
            掲載希望はコチラ
          </a>
        ) : (
          <a href="/register" className="yy-mk2-reg">掲載希望はコチラ</a>
        )}
      </div>
      
      {/* 基本知識トグル */}
      {showBasicKnowledge && <BasicKnowledge data={KNOWLEDGE} param={subcategory} />}
      
      <div className="mt-4">
        {<MakerRows category="電気設備" page="スイッチコンセント" />}
      </div>
    </div>
  );

  const renderGeneratorCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">発電機</h2>
        <MakerCount category="電気設備" page="発電機" />
        <button
          onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
          type="button"
          className="yy-bk-toggle"
          aria-expanded={showBasicKnowledge}
        >
          基本知識<span className={`yy-bk-chev${showBasicKnowledge ? ' is-open' : ''}`} aria-hidden="true" />
        </button>
        {onNavigateToRegistration ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigateToRegistration();
            }}
            className="yy-mk2-reg"
          >
            掲載希望はコチラ
          </a>
        ) : (
          <a href="/register" className="yy-mk2-reg">掲載希望はコチラ</a>
        )}
      </div>
      
      {/* 基本知識トグル */}
      {showBasicKnowledge && <BasicKnowledge data={KNOWLEDGE} param={subcategory} />}
      

      {<MakerRows category="電気設備" page="発電機" />}
    </div>
  );

  const renderGenericCategory = (title: string) => (
    <div>
      {renderHeader(title)}
      <KnowledgeToggle data={KNOWLEDGE} param={subcategory} />
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