import React, { useState } from 'react';
import MakerLink from '@/components/MakerLink';
import MakerRows from '@/components/MakerRows';
import MakerCount from './MakerCount';
import './materials.css';
import BasicKnowledge, { KnowledgeToggle, type KnowledgeEntry } from '@/components/BasicKnowledge';
import KNOWLEDGE_JSON from '@/data/knowledge/exterior.json';

const KNOWLEDGE = KNOWLEDGE_JSON as unknown as KnowledgeEntry[];


interface ExteriorContentProps {
  subcategory: string;
  onNavigateToRegistration?: () => void;
}

const ExteriorContent: React.FC<ExteriorContentProps> = ({ subcategory, onNavigateToRegistration }) => {
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

  const renderDeliveryBoxCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">宅配ボックス</h2>
        <MakerCount category="エクステリア" page="宅配ボックス" />
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
        {<MakerRows category="エクステリア" page="宅配ボックス" />}
      </div>
    </div>
  );

  const renderMailboxCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">郵便受け</h2>
        <MakerCount category="エクステリア" page="郵便受け" />
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
        {<MakerRows category="エクステリア" page="郵便受け" />}
      </div>
    </div>
  );

  const renderNameplateCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">表札</h2>
        <MakerCount category="エクステリア" page="表札" />
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
        {<MakerRows category="エクステリア" page="表札" />}
      </div>
    </div>
  );

  const renderGateCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">門扉</h2>
        <MakerCount category="エクステリア" page="門扉" />
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
        {<MakerRows category="エクステリア" page="門扉" />}
      </div>
    </div>
  );

  const renderFenceCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">フェンス</h2>
        <MakerCount category="エクステリア" page="フェンス" />
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
        {<MakerRows category="エクステリア" page="フェンス" />}
      </div>
    </div>
  );

  const renderCarportCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">カーポート</h2>
        <MakerCount category="エクステリア" page="カーポート" />
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
        {<MakerRows category="エクステリア" page="カーポート" />}
      </div>
    </div>
  );

  const renderWoodDeckCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">ウッドデッキ</h2>
        <MakerCount category="エクステリア" page="ウッドデッキ" />
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
        {<MakerRows category="エクステリア" page="ウッドデッキ" />}
      </div>
    </div>
  );

  const renderLargeSlidingDoorCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">大型引戸</h2>
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
        <p className="yy-mk2-empty">この分類のメーカーは、いまは載せていません。建材の検索や Chatbot で探せます。掲載のご希望は上の「掲載希望はコチラ」から。</p>
      </div>
    </div>
  );

  const renderBicycleParkingCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">駐輪場</h2>
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
        <p className="yy-mk2-empty">この分類のメーカーは、いまは載せていません。建材の検索や Chatbot で探せます。掲載のご希望は上の「掲載希望はコチラ」から。</p>
      </div>
    </div>
  );

  const renderGarbageStorageCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">ゴミストッカー</h2>
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
        <p className="yy-mk2-empty">この分類のメーカーは、いまは載せていません。建材の検索や Chatbot で探せます。掲載のご希望は上の「掲載希望はコチラ」から。</p>
      </div>
    </div>
  );

  const renderGreeningCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">エクステリア緑化</h2>
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
        <p className="yy-mk2-empty">この分類のメーカーは、いまは載せていません。建材の検索や Chatbot で探せます。掲載のご希望は上の「掲載希望はコチラ」から。</p>
      </div>
    </div>
  );

  const renderExteriorOtherCategory = () => (
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
        <p className="yy-mk2-empty">この分類のメーカーは、いまは載せていません。建材の検索や Chatbot で探せます。掲載のご希望は上の「掲載希望はコチラ」から。</p>
      </div>
    </div>
  );

  const renderGenericCategory = (title: string) => (
    <div>
      {renderHeader(title)}
      <div className="mt-4">
        <p className="yy-mk2-empty">この分類のメーカーは、いまは載せていません。建材の検索や Chatbot で探せます。掲載のご希望は上の「掲載希望はコチラ」から。</p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (subcategory) {
      case '宅配ボックス':
        return renderDeliveryBoxCategory();
      case '郵便受け':
        return renderMailboxCategory();
      case '表札':
        return renderNameplateCategory();
      case '門扉':
        return renderGateCategory();
      case 'フェンス':
        return renderFenceCategory();
      case 'カーポート':
        return renderCarportCategory();
      case 'ウッドデッキ':
        return renderWoodDeckCategory();
      case '大型引戸':
        return renderLargeSlidingDoorCategory();
      case '駐輪場':
        return renderBicycleParkingCategory();
      case 'ゴミストッカー':
        return renderGarbageStorageCategory();
      case 'エクステリア緑化':
        return renderGreeningCategory();
      case 'エクステリアその他':
        return renderExteriorOtherCategory();
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

export default ExteriorContent; 