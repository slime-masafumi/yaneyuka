import React, { useState } from 'react';
import MakerLink from '@/components/MakerLink';
import MakerRows from '@/components/MakerRows';
import MakerCount from './MakerCount';
import './materials.css';
import BasicKnowledge, { KnowledgeToggle, type KnowledgeEntry } from '@/components/BasicKnowledge';
import KNOWLEDGE_JSON from '@/data/knowledge/exterior-infrastructure.json';

const KNOWLEDGE = KNOWLEDGE_JSON as unknown as KnowledgeEntry[];


interface ExteriorInfrastructureContentProps {
  subcategory: string;
}

const ExteriorInfrastructureContent: React.FC<ExteriorInfrastructureContentProps> = ({ subcategory }) => {
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

  const renderSectionHeader = (title: string) => (
    <div className="yy-mk2-group">
      <h3 className="yy-mk2-group__title">{title}</h3>
      <span className="yy-mk2-group__rule" />
    </div>
  );

  const renderHeader = (title: string) => (
    <div className="yy-mk2-head">
      <h2 className="yy-mk2-title">{title}</h2>
      <a href="/register" className="yy-mk2-reg">掲載希望はコチラ</a>
    </div>
  );

  const renderCurbstoneCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">縁石</h2>
        <MakerCount category="外構" page="縁石" />
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
        {<MakerRows category="外構" page="縁石" />}
      </div>
    </div>
  );

  const renderPavementCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">舗装</h2>
        <MakerCount category="外構" page="外構舗装" />
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
        {renderSectionHeader('ブロック')}
        {<MakerRows category="外構" page="外構舗装" />}
      </div>
    </div>
  );

  const renderCoverCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">桝蓋</h2>
        <MakerCount category="外構" page="桝蓋" />
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
        {<MakerRows category="外構" page="桝蓋" />}
      </div>
    </div>
  );

  const renderOtherCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">その他</h2>
        <MakerCount category="外構" page="外構その他" />
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
        {<MakerRows category="外構" page="外構その他" />}
      </div>
    </div>
  );

  const renderGenericCategory = (title: string) => (
    <div>
      {renderHeader(title)}
      <div className="mt-4">
        {renderCompanyRow('奥岡製作所', {
          products: 'https://www.okuoka.co.jp/product/',
          catalog: 'https://www.okuoka.co.jp/catalog/',
          office: 'https://www.okuoka.co.jp/company/',
          contact: 'https://www.okuoka.co.jp/contact/'
        })}
        {renderCompanyRow('ダイクレ', {
          products: 'https://www.daikure.co.jp/products/',
          catalog: '#',
          office: 'https://www.daikure.co.jp/network/',
          contact: 'https://www.daikure.co.jp/contact/'
        })}
        {renderCompanyRow('中部コーポレーション', {
          products: 'https://www.chubu-corp.co.jp/products/',
          catalog: '#',
          office: 'https://www.chubu-corp.co.jp/company/',
          contact: 'https://www.chubu-corp.co.jp/contact/'
        })}
      </div>
    </div>
  );

  const renderRainwaterInletCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">雨水桝</h2>
        <MakerCount category="外構" page="雨水桝" />
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
        {<MakerRows category="外構" page="雨水桝" />}
      </div>
    </div>
  );

  const renderGratingCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">外構 グレーチング</h2>
        <MakerCount category="外構" page="外構グレーチング" />
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
        {<MakerRows category="外構" page="外構グレーチング" />}
      </div>
    </div>
  );

  switch (subcategory) {
    case '縁石':
      return renderCurbstoneCategory();
    case '外構舗装':
      return renderPavementCategory();
    case '雨水桝':
      return renderRainwaterInletCategory();
    case '桝蓋':
      return renderCoverCategory();
    case '外構グレーチング':
      return renderGratingCategory();
    case '外構その他':
      return renderOtherCategory();
    default:
      return null;
  }
};

export default ExteriorInfrastructureContent; 