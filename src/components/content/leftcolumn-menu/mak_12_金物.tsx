import React, { useState } from 'react';
import MakerLink from '@/components/MakerLink';
import MakerRows from '@/components/MakerRows';
import MakerCount from './MakerCount';
import './materials.css';
import BasicKnowledge, { KnowledgeToggle, type KnowledgeEntry } from '@/components/BasicKnowledge';
import KNOWLEDGE_JSON from '@/data/knowledge/hardware.json';

const KNOWLEDGE = KNOWLEDGE_JSON as unknown as KnowledgeEntry[];


interface HardwareContentProps {
  subcategory: string;
  onNavigateToRegistration?: () => void;
}

const HardwareContent: React.FC<HardwareContentProps> = ({ subcategory, onNavigateToRegistration }) => {
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

  const renderHandleCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">ハンドル</h2>
        <MakerCount category="金物" page="ハンドル" />
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
        <MakerRows category="金物" page="ハンドル" />
      </div>
    </div>
  );

  const renderPullBarCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">引棒</h2>
        <MakerCount category="金物" page="引棒" />
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
        <MakerRows category="金物" page="引棒" />
      </div>
    </div>
  );

  const renderJoguHardwareCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">建具金物</h2>
        <MakerCount category="金物" page="建具金物" />
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
        <MakerRows category="金物" page="建具金物" />
      </div>
    </div>
  );

  const renderShelfHookCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">棚・フック他</h2>
        <MakerCount category="金物" page="棚フック" />
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
        <MakerRows category="金物" page="棚フック" />
      </div>
    </div>
  );

  const renderSanitaryCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">サニタリー金物</h2>
        <MakerCount category="金物" page="サニタリー" />
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
        <MakerRows category="金物" page="サニタリー" />
      </div>
    </div>
  );

  const renderFurnitureHardwareCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">家具金物</h2>
        <MakerCount category="金物" page="家具金物" />
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
        <MakerRows category="金物" page="家具金物" />
      </div>
    </div>
  );

  const renderGenericCategory = (title: string) => (
    <div>
      {renderHeader(title)}

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・スガツネ工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.sugatsune.co.jp/products/', '商品ページ')}｜
          {renderLink('https://www.sugatsune.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.sugatsune.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.sugatsune.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・シブタニ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.shibutani.co.jp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.shibutani.co.jp/company/', '営業所')}｜
          {renderLink('https://www.shibutani.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ベスト</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.bestlock.co.jp/products/', '商品ページ')}｜
          {renderLink('https://www.bestlock.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.bestlock.co.jp/company/', '営業所')}｜
          {renderLink('https://www.bestlock.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ロイヤル</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.royal-co.net/products/', '商品ページ')}｜
          {renderLink('https://www.royal-co.net/catalog/', 'カタログ')}｜
          {renderLink('https://www.royal-co.net/company/', '営業所')}｜
          {renderLink('https://www.royal-co.net/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・カワジュン</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.kawajun.jp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.kawajun.jp/company/', '営業所')}｜
          {renderLink('https://www.kawajun.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderLockCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">鍵関係</h2>
        <MakerCount category="金物" page="鍵関係" />
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
        <MakerRows category="金物" page="鍵関係" />
      </div>
    </div>
  );

  const renderExpJCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">EXP.J</h2>
        <MakerCount category="金物" page="EXP,J" />
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
      

      <div className="yy-mk2-group">
        <h3 className="yy-mk2-group__title">免震用</h3>
        <span className="yy-mk2-group__rule" />
        <MakerCount category="金物" page="EXP,J" group="免震用" />
      </div>
      <div className="text-[13px]">
        <MakerRows category="金物" page="EXP,J" group="免震用" />
      </div>

      <div className="yy-mk2-group">
        <h3 className="yy-mk2-group__title">耐震用</h3>
        <span className="yy-mk2-group__rule" />
        <MakerCount category="金物" page="EXP,J" group="耐震用" />
      </div>
      <div className="text-[13px]">
        <MakerRows category="金物" page="EXP,J" group="耐震用" />
      </div>

      <div className="yy-mk2-group">
        <h3 className="yy-mk2-group__title">非免震用</h3>
        <span className="yy-mk2-group__rule" />
        <MakerCount category="金物" page="EXP,J" group="非免震用" />
      </div>
      <div className="text-[13px]">
        <MakerRows category="金物" page="EXP,J" group="非免震用" />
      </div>
    </div>
  );

  const renderOtherHardwareCategory = () => (
    <div>
      <div className="yy-mk2-head">
        <h2 className="yy-mk2-title">金物 その他</h2>
        <MakerCount category="金物" page="金物その他" />
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
        <MakerRows category="金物" page="金物その他" />
      </div>
    </div>
  );

  const renderContent = () => {
    switch (subcategory) {
      case 'ハンドル':
        return renderHandleCategory();
      case '引棒':
        return renderPullBarCategory();
      case '建具金物':
        return renderJoguHardwareCategory();
      case '棚フック':
        return renderShelfHookCategory();
      case 'サニタリー':
        return renderSanitaryCategory();
      case '家具金物':
        return renderFurnitureHardwareCategory();
      case '鍵関係':
        return renderLockCategory();
      case 'EXP,J':
        return renderExpJCategory();
      case '金物その他':
        return renderOtherHardwareCategory();
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

export default HardwareContent; 