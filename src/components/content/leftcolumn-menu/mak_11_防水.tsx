import React, { useState } from 'react';
import MakerLink from '@/components/MakerLink';
import MakerRows from '@/components/MakerRows';
import MakerCount from './MakerCount';
import './materials.css';
import BasicKnowledge, { KnowledgeToggle, type KnowledgeEntry } from '@/components/BasicKnowledge';
import KNOWLEDGE_JSON from '@/data/knowledge/waterproof.json';

const KNOWLEDGE = KNOWLEDGE_JSON as unknown as KnowledgeEntry[];


interface WaterproofContentProps {
  subcategory: string;
  onNavigateToRegistration?: () => void;
}

const WaterproofContent: React.FC<WaterproofContentProps> = ({ subcategory, onNavigateToRegistration }) => {
  const [showBasicKnowledge, setShowBasicKnowledge] = useState(false);

  // URLの有効性をチェックする関数

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

  const renderUrethaneWaterproof = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">ウレタン防水</h2>
        <MakerCount category="防水" page="ウレタン防水" />
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
      

      <div className="mt-4 text-[13px]">
        <MakerRows category="防水" page="ウレタン防水" />
      </div>
    </div>
  );

  const renderAsphaltWaterproof = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">アスファルト防水</h2>
        <MakerCount category="防水" page="アスファルト防水" />
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
      

      <div className="mt-4 text-[13px]">
        <MakerRows category="防水" page="アスファルト防水" />
      </div>
    </div>
  );

  const renderSheetWaterproof = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">シート防水</h2>
        <MakerCount category="防水" page="シート防水" />
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
      

      <div className="mt-4 text-[13px]">
        <MakerRows category="防水" page="シート防水" />
      </div>
    </div>
  );

  const renderFRPWaterproof = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">FRP防水</h2>
        <MakerCount category="防水" page="FRP防水" />
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
      

      <div className="mt-4 text-[13px]">
        <MakerRows category="防水" page="FRP防水" />
      </div>
    </div>
  );

  const renderOtherWaterproof = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">防水 その他</h2>
        <MakerCount category="防水" page="防水その他" />
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
      

      <div className="text-[13px]">
        <MakerRows category="防水" page="防水その他" />
      </div>
    </div>
  );

  const renderGenericCategory = (title: string) => (
    <div>
      {renderHeader(title)}

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・シーカ・ジャパン</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://jpn.sika.com/ja/construction/roofing.html', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://jpn.sika.com/ja/about-us/sika-japan/offices.html', '営業所')}｜
          {renderLink('https://jpn.sika.com/ja/contact.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・日新工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.nisshinkogyo.co.jp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.nisshinkogyo.co.jp/company/office/', '営業所')}｜
          {renderLink('https://www.nisshinkogyo.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・日本特殊塗料</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.nittoku.co.jp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.nittoku.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.nittoku.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ニッタ化工品</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.nitta.co.jp/product/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.nitta.co.jp/company/office/', '営業所')}｜
          {renderLink('https://www.nitta.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (subcategory) {
      case 'ウレタン防水':
        return renderUrethaneWaterproof();
      case 'アスファルト防水':
        return renderAsphaltWaterproof();
      case 'シート防水':
        return renderSheetWaterproof();
      case 'FRP防水':
        return renderFRPWaterproof();
      case '防水その他':
        return renderOtherWaterproof();
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

export default WaterproofContent; 