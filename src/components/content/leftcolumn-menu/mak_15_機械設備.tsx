import React, { useState } from 'react';
import MakerLink from '@/components/MakerLink';
import MakerRows from '@/components/MakerRows';
import MakerCount from './MakerCount';
import './materials.css';
import BasicKnowledge, { KnowledgeToggle, type KnowledgeEntry } from '@/components/BasicKnowledge';
import KNOWLEDGE_JSON from '@/data/knowledge/mechanical-systems.json';

const KNOWLEDGE = KNOWLEDGE_JSON as unknown as KnowledgeEntry[];


interface MechanicalSystemsContentProps {
  subcategory: string;
}

const MechanicalSystemsContent: React.FC<MechanicalSystemsContentProps> = ({ subcategory }) => {
  const [showBasicKnowledge, setShowBasicKnowledge] = useState(false);

  // リンクの実体は src/components/MakerLink.tsx。
  // 404 になったメーカーページは会社トップへ自動で振り替わる。
  const renderLink = (url: string | undefined, label: string) => (
    <MakerLink url={url} label={label} />
  );

  const renderHeader = (title: string) => (
    <div className="yy-mk2-head">
      <h2 className="yy-mk2-title">{title}</h2>
      <a href="/register" className="yy-mk2-reg">掲載希望はコチラ</a>
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

  const renderWaterFaucetCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">水栓</h2>
        <MakerCount category="機械設備" page="水栓" />
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
        {<MakerRows category="機械設備" page="水栓" />}
      </div>
    </div>
  );

  const renderSanitaryCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">衛生機器</h2>
        <MakerCount category="機械設備" page="衛生機器" />
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
        {<MakerRows category="機械設備" page="衛生機器" />}
      </div>
    </div>
  );

  const renderResidentialEquipmentCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">住宅設備</h2>
        <MakerCount category="機械設備" page="住宅設備" />
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
        {<MakerRows category="機械設備" page="住宅設備" />}
      </div>
    </div>
  );

  const renderKitchenCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">キッチン</h2>
        <MakerCount category="機械設備" page="キッチン" />
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
        {<MakerRows category="機械設備" page="キッチン" />}
      </div>
    </div>
  );

  const renderAirConditioningCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">空調機</h2>
        <MakerCount category="機械設備" page="空調機" />
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
        {<MakerRows category="機械設備" page="空調機" />}
      </div>
    </div>
  );

  const renderOtherCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">その他</h2>
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
        <p className="yy-mk2-empty">準備中...</p>
      </div>
    </div>
  );

  const renderGenericCategory = (title: string) => (
    <div>
      {renderHeader(title)}
      <div className="mt-4">
        <p className="yy-mk2-empty">準備中...</p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (subcategory) {
      case '水栓':
        return renderWaterFaucetCategory();
      case '衛生機器':
        return renderSanitaryCategory();
      case '住宅設備':
        return renderResidentialEquipmentCategory();
      case 'キッチン':
        return renderKitchenCategory();
      case '空調機':
        return renderAirConditioningCategory();
      case '機械設備その他':
        return renderOtherCategory();
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

export default MechanicalSystemsContent; 