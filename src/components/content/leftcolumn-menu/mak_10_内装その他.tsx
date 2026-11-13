import React, { useState } from 'react';
import MakerLink from '@/components/MakerLink';
import MakerRows from '@/components/MakerRows';
import MakerCount from './MakerCount';
import './materials.css';
import BasicKnowledge, { KnowledgeToggle, type KnowledgeEntry } from '@/components/BasicKnowledge';
import KNOWLEDGE_JSON from '@/data/knowledge/internal-other.json';

const KNOWLEDGE = KNOWLEDGE_JSON as unknown as KnowledgeEntry[];


interface InternalOtherContentProps {
  subcategory: string;
}

const InternalOtherContent: React.FC<InternalOtherContentProps> = ({ subcategory }) => {
  const [showBasicKnowledge, setShowBasicKnowledge] = useState(false);

  // URLの有効性をチェックする関数

  // リンクの実体は src/components/MakerLink.tsx。
  // 404 になったメーカーページは会社トップへ自動で振り替わる。
  const renderLink = (url: string | undefined, label: string) => (
    <MakerLink url={url} label={label} />
  );

  const renderToiletBooth = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">トイレブース</h2>
        <MakerCount category="内装その他" page="トイレブース" />
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

      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="トイレブース" />
      </div>
    </div>
  );

  const renderInteriorSash = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">内装サッシ</h2>
        <MakerCount category="内装その他" page="内装サッシ" />
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

      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="内装サッシ" />
      </div>
    </div>
  );

  const renderNonSlip = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">ノンスリップ</h2>
        <MakerCount category="内装その他" page="ノンスリップ" />
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

      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="ノンスリップ" />
      </div>
    </div>
  );

  const renderInteriorShutter = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">内装シャッター</h2>
        <MakerCount category="内装その他" page="内装シャッター" />
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

      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="内装シャッター" />
      </div>
    </div>
  );

  const renderInteriorHandrail = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">内装手摺</h2>
        <MakerCount category="内装その他" page="内装手摺" />
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

      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="内装手摺" />
      </div>
    </div>
  );

  const renderGrating = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">グレーチング</h2>
        <MakerCount category="内装その他" page="グレーチング" />
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

      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="グレーチング" />
      </div>
    </div>
  );

  const renderInspectionPort = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">点検口</h2>
        <MakerCount category="内装その他" page="点検口" />
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

      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="点検口" />
      </div>
    </div>
  );

  const renderBraille = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">点字</h2>
        <MakerCount category="内装その他" page="点字" />
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

      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="点字" />
      </div>
    </div>
  );

  const renderDisplay = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">ディスプレイ</h2>
        <MakerCount category="内装その他" page="ディスプレイ" />
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
      

      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="ディスプレイ" />
      </div>
    </div>
  );

  const renderOtherInterior = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">内装その他製品</h2>
        <MakerCount category="内装その他" page="内装その他製品" />
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


      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="内装その他製品" />
      </div>
    </div>
  );

  const renderGreen化 = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">内装 緑化</h2>
        <MakerCount category="内装その他" page="内装緑化" />
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
      

      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="内装緑化" />
      </div>
    </div>
  );

  const renderPartition = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">隔壁</h2>
        <MakerCount category="内装その他" page="隔壁" />
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


      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="隔壁" />
      </div>
    </div>
  );

  const renderProtectionMaterial = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">保護材</h2>
        <MakerCount category="内装その他" page="保護材" />
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


      <div className="mt-4 text-[13px]">
        <MakerRows category="内装その他" page="保護材" />
      </div>
    </div>
  );

  const renderGenericCategory = (title: string) => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">{title}</h2>
        <a href="/register" className="yy-mk2-reg">掲載希望はコチラ</a>
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