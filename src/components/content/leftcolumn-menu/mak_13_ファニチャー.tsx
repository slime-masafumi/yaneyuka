import React, { useState } from 'react';
import MakerLink from '@/components/MakerLink';
import MakerRows from '@/components/MakerRows';
import MakerCount from './MakerCount';
import './materials.css';
import BasicKnowledge, { KnowledgeToggle, type KnowledgeEntry } from '@/components/BasicKnowledge';
import KNOWLEDGE_JSON from '@/data/knowledge/furniture.json';

const KNOWLEDGE = KNOWLEDGE_JSON as unknown as KnowledgeEntry[];


interface FurnitureContentProps {
  subcategory: string;
}

const FurnitureContent: React.FC<FurnitureContentProps> = ({ subcategory }) => {
  const [showBasicKnowledge, setShowBasicKnowledge] = useState(false);

  // リンクの実体は src/components/MakerLink.tsx。
  // 404 になったメーカーページは会社トップへ自動で振り替わる。
  const renderLink = (url: string | undefined, label: string) => (
    <MakerLink url={url} label={label} />
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
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">家具</h2>
        <MakerCount category="ファニチャー" page="家具" />
        <button
          onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
          type="button"
          className="yy-bk-toggle"
          aria-expanded={showBasicKnowledge}
        >
          基本知識<span className={`yy-bk-chev${showBasicKnowledge ? ' is-open' : ''}`} aria-hidden="true" />
        </button>
        <a href="/register" className="yy-mk2-reg">掲載希望はコチラ</a>
      </div>
      
      {/* 基本知識トグル */}
      {showBasicKnowledge && <BasicKnowledge data={KNOWLEDGE} param={subcategory} />}
      
      <div className="yy-mk2-group">
        <h3 className="yy-mk2-group__title">家具（屋内）</h3>
        <span className="yy-mk2-group__rule" />
        <MakerCount category="ファニチャー" page="家具" group="家具（屋内）" />
      </div>
      <div className="mt-2">
        {<MakerRows category="ファニチャー" page="家具" group="家具（屋内）" />}
        <div className="yy-mk2-group">
          <h3 className="yy-mk2-group__title">家具（屋外）</h3>
          <span className="yy-mk2-group__rule" />
          <MakerCount category="ファニチャー" page="家具" group="家具（屋外）" />
        </div>
        {<MakerRows category="ファニチャー" page="家具" group="家具（屋外）" />}
      </div>
    </div>
  );

  const renderCurtainCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">カーテン</h2>
        <MakerCount category="ファニチャー" page="カーテン" />
        <button
          onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
          type="button"
          className="yy-bk-toggle"
          aria-expanded={showBasicKnowledge}
        >
          基本知識<span className={`yy-bk-chev${showBasicKnowledge ? ' is-open' : ''}`} aria-hidden="true" />
        </button>
        <a href="/register" className="yy-mk2-reg">掲載希望はコチラ</a>
      </div>
      
      {/* 基本知識トグル */}
      {showBasicKnowledge && <BasicKnowledge data={KNOWLEDGE} param={subcategory} />}
      
      <div className="mt-4">
        {<MakerRows category="ファニチャー" page="カーテン" />}
      </div>
    </div>
  );

  const renderBlindCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">ブラインド</h2>
        <MakerCount category="ファニチャー" page="ブラインド" />
        <button
          onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
          type="button"
          className="yy-bk-toggle"
          aria-expanded={showBasicKnowledge}
        >
          基本知識<span className={`yy-bk-chev${showBasicKnowledge ? ' is-open' : ''}`} aria-hidden="true" />
        </button>
        <a href="/register" className="yy-mk2-reg">掲載希望はコチラ</a>
      </div>
      
      {/* 基本知識トグル */}
      {showBasicKnowledge && <BasicKnowledge data={KNOWLEDGE} param={subcategory} />}
      
      <div className="mt-4">
        {<MakerRows category="ファニチャー" page="ブラインド" />}
      </div>
    </div>
  );

  const renderFabricCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">生地</h2>
        <MakerCount category="ファニチャー" page="生地" />
        <button
          onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
          type="button"
          className="yy-bk-toggle"
          aria-expanded={showBasicKnowledge}
        >
          基本知識<span className={`yy-bk-chev${showBasicKnowledge ? ' is-open' : ''}`} aria-hidden="true" />
        </button>
        <a href="/register" className="yy-mk2-reg">掲載希望はコチラ</a>
      </div>
      
      {/* 基本知識トグル */}
      {showBasicKnowledge && <BasicKnowledge data={KNOWLEDGE} param={subcategory} />}
      
      <div className="mt-4">
        {<MakerRows category="ファニチャー" page="生地" />}
      </div>
    </div>
  );

  const renderOtherFurnitureCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">ファニチャーその他</h2>
        <MakerCount category="ファニチャー" page="ファニチャーその他" />
        <button
          onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
          type="button"
          className="yy-bk-toggle"
          aria-expanded={showBasicKnowledge}
        >
          基本知識<span className={`yy-bk-chev${showBasicKnowledge ? ' is-open' : ''}`} aria-hidden="true" />
        </button>
        <a href="/register" className="yy-mk2-reg">掲載希望はコチラ</a>
      </div>
      
      {/* 基本知識トグル */}
      {showBasicKnowledge && <BasicKnowledge data={KNOWLEDGE} param={subcategory} />}
      

      {<MakerRows category="ファニチャー" page="ファニチャーその他" />}
    </div>
  );

  const renderGenericCategory = (title: string) => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">{title}</h2>
        <a href="/register" className="yy-mk2-reg">掲載希望はコチラ</a>
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