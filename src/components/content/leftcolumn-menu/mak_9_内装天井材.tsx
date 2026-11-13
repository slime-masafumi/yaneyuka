import React, { useState } from 'react';
import MakerLink from '@/components/MakerLink';
import MakerRows from '@/components/MakerRows';
import MakerCount from './MakerCount';
import './materials.css';
import BasicKnowledge, { KnowledgeToggle, type KnowledgeEntry } from '@/components/BasicKnowledge';
import KNOWLEDGE_JSON from '@/data/knowledge/internal-ceiling.json';

const KNOWLEDGE = KNOWLEDGE_JSON as unknown as KnowledgeEntry[];


interface InternalCeilingContentProps {
  subcategory: string;
}

const InternalCeilingContent: React.FC<InternalCeilingContentProps> = ({ subcategory }) => {
  const [showBasicKnowledge, setShowBasicKnowledge] = useState(false);

  // URLの有効性をチェックする関数

  // リンクの実体は src/components/MakerLink.tsx。
  // 404 になったメーカーページは会社トップへ自動で振り替わる。
  const renderLink = (url: string | undefined, label: string) => (
    <MakerLink url={url} label={label} />
  );

  const renderBoard = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">内装天井 ボード</h2>
        <MakerCount category="内装天井材" page="ボード" />
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

      {/* 化粧石膏ボード */}
      <div className="yy-mk2-group">
        <h3 className="yy-mk2-group__title">化粧石膏ボード</h3>
        <span className="yy-mk2-group__rule" />
        <MakerCount category="内装天井材" page="ボード" group="化粧石膏ボード" />
      </div>
      <div className="text-[13px]">
        <MakerRows category="内装天井材" page="ボード" group="化粧石膏ボード" />
      </div>

      {/* 吸音石膏ボード */}
      <div className="yy-mk2-group">
        <h3 className="yy-mk2-group__title">吸音石膏ボード</h3>
        <span className="yy-mk2-group__rule" />
        <MakerCount category="内装天井材" page="ボード" group="吸音石膏ボード" />
      </div>
      <div className="text-[13px]">
        <MakerRows category="内装天井材" page="ボード" group="吸音石膏ボード" />
      </div>
      
      {/* ロックウール吸音板 */}
      <div className="yy-mk2-group">
        <h3 className="yy-mk2-group__title">ロックウール吸音板</h3>
        <span className="yy-mk2-group__rule" />
        <MakerCount category="内装天井材" page="ボード" group="ロックウール吸音板" />
      </div>
      <div className="text-[13px]">
        <MakerRows category="内装天井材" page="ボード" group="ロックウール吸音板" />
      </div>
    </div>
  );

  const renderDecorative = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">内装天井 化粧材</h2>
        <MakerCount category="内装天井材" page="化粧材" />
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

      {/* スパンドレル */}
      <div className="yy-mk2-group">
        <h3 className="yy-mk2-group__title">スパンドレル</h3>
        <span className="yy-mk2-group__rule" />
        <MakerCount category="内装天井材" page="化粧材" group="スパンドレル" />
      </div>
      <div className="text-[13px]">
        <MakerRows category="内装天井材" page="化粧材" group="スパンドレル" />
      </div>

      {/* 木質パネル */}
      <div className="yy-mk2-group">
        <h3 className="yy-mk2-group__title">木質パネル</h3>
        <span className="yy-mk2-group__rule" />
        <MakerCount category="内装天井材" page="化粧材" group="木質パネル" />
      </div>
      <div className="text-[13px]">
        <MakerRows category="内装天井材" page="化粧材" group="木質パネル" />
      </div>
    </div>
  );

  const renderDecorativeMaterial = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">内装天井 装飾材</h2>
        <MakerCount category="内装天井材" page="装飾材" />
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

      {/* ルーバー */}
      <div className="yy-mk2-group">
        <h3 className="yy-mk2-group__title">ルーバー</h3>
        <span className="yy-mk2-group__rule" />
        <MakerCount category="内装天井材" page="装飾材" group="ルーバー" />
      </div>
      <div className="text-[13px]">
        <MakerRows category="内装天井材" page="装飾材" group="ルーバー" />
      </div>

      {/* 格子 */}
      <div className="yy-mk2-group">
        <h3 className="yy-mk2-group__title">格子</h3>
        <span className="yy-mk2-group__rule" />
        <MakerCount category="内装天井材" page="装飾材" group="格子" />
      </div>
      <div className="text-[13px]">
        <MakerRows category="内装天井材" page="装飾材" group="格子" />
      </div>
    </div>
  );

  const renderFunctional = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">機能性内装天井</h2>
        <MakerCount category="内装天井材" page="機能性" />
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

      {/* システム天井 */}
      <div className="yy-mk2-group">
        <h3 className="yy-mk2-group__title">システム天井</h3>
        <span className="yy-mk2-group__rule" />
        <MakerCount category="内装天井材" page="機能性" group="システム天井" />
      </div>
      <div className="text-[13px]">
        <MakerRows category="内装天井材" page="機能性" group="システム天井" />
      </div>
    </div>
  );

  const renderOther = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">内装天井 その他</h2>
        <MakerCount category="内装天井材" page="その他" />
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

      {/* その他企業 */}
      <div className="mt-4 text-[13px]">
        <MakerRows category="内装天井材" page="その他" />
      </div>
    </div>
  );

  const renderContent = () => {
    switch (subcategory) {
      case '内装天井ボード':
      case 'ボード':
        return renderBoard();
      case '内装天井化粧材':
      case '化粧材':
        return renderDecorative();
      case '内装天井装飾材':
      case '装飾材':
        return renderDecorativeMaterial();
      case '内装天井機能性':
      case '機能性':
        return renderFunctional();
      case '内装天井その他':
      case 'その他':
        return renderOther();
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

export default InternalCeilingContent; 