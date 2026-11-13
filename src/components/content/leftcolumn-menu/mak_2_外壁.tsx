'use client';

import React, { useState } from 'react';
import MakerLink from '@/components/MakerLink';
import MakerRows from '@/components/MakerRows';
import MakerCount from './MakerCount';
import './materials.css';
import BasicKnowledge, { KnowledgeToggle, type KnowledgeEntry } from '@/components/BasicKnowledge';
import KNOWLEDGE_JSON from '@/data/knowledge/exterior-wall.json';

const KNOWLEDGE = KNOWLEDGE_JSON as unknown as KnowledgeEntry[];


interface ExteriorWallContentProps {
  subcategory: string;
}

const ExteriorWallContent: React.FC<ExteriorWallContentProps> = ({ subcategory }) => {
  const [showBasicKnowledge, setShowBasicKnowledge] = useState(false);
  // リンクの実体は src/components/MakerLink.tsx。
  // 404 になったメーカーページは会社トップへ自動で振り替わる。
  const renderLink = (url: string | undefined, label: string) => (
    <MakerLink url={url} label={label} />
  );

  const renderContent = () => {
    switch (subcategory) {
      case 'alc':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">ALC</h2>
              <MakerCount category="外壁" page="alc" />
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

            {/* 通常企業（テキストリンク形式） */}
            <div className="mt-4 text-[13px]">
              <MakerRows category="外壁" page="alc" />
            </div>
          </div>
        );

      case 'ecp':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">ECP</h2>
              <MakerCount category="外壁" page="ecp" />
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

            {/* 通常企業（テキストリンク形式） */}
            <div className="mt-4 text-[13px]">
              <MakerRows category="外壁" page="ecp" />
            </div>
          </div>
        );

      case 'metal-panel':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">外壁仕上げ 金属パネル</h2>
              <MakerCount category="外壁" page="metal-panel" />
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

            <div className="mb-6">
              <div className="yy-mk2-group">
                <h3 className="yy-mk2-group__title">ガルバリウム鋼板</h3>
                <span className="yy-mk2-group__rule" />
                <MakerCount category="外壁" page="metal-panel" group="ガルバリウム鋼板" />
              </div>
              <div className="text-[13px]">
                <MakerRows category="外壁" page="metal-panel" group="ガルバリウム鋼板" />
              </div>
            </div>

            <div className="mb-6">
              <div className="yy-mk2-group">
                <h3 className="yy-mk2-group__title">アルミ</h3>
                <span className="yy-mk2-group__rule" />
                <MakerCount category="外壁" page="metal-panel" group="アルミ" />
              </div>
              <div className="text-[13px]">
                <MakerRows category="外壁" page="metal-panel" group="アルミ" />
              </div>
            </div>
          </div>
        );

      case 'wood-board':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">外壁仕上げ 木板材</h2>
              <MakerCount category="外壁" page="wood-board" />
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
              <MakerRows category="外壁" page="wood-board" nameWidth="200px" />
            </div>
          </div>
        );

      case 'decorative':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">外壁仕上げ 装飾材</h2>
              <MakerCount category="外壁" page="decorative" />
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
              <MakerRows category="外壁" page="decorative" />
            </div>
          </div>
        );

      case 'other-finish':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">外壁仕上げ その他</h2>
              <MakerCount category="外壁" page="other-finish" />
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
              <MakerRows category="外壁" page="other-finish" />
            </div>
          </div>
        );

      case 'paint':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">外壁仕上げ 塗装</h2>
              <MakerCount category="外壁" page="paint" />
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
              <MakerRows category="外壁" page="paint" />
            </div>
          </div>
        );

      case '金属サイディング':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">金属サイディング</h2>
              <MakerCount category="外壁" page="金属サイディング" />
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
              <MakerRows category="外壁" page="金属サイディング" />
            </div>
          </div>
        );

      case '窯業サイディング':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">窯業サイディング</h2>
              <MakerCount category="外壁" page="窯業サイディング" />
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
              <MakerRows category="外壁" page="窯業サイディング" />
            </div>
          </div>
        );

      case 'siding':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">サイディング</h2>
              <MakerCount category="外壁" page="siding" />
              <a href="/register" className="yy-mk2-reg">掲載希望はコチラ</a>
            </div>
            {/* カテゴリー: 金属サイディング */}
            <div className="mb-6">
              <div className="yy-mk2-group">
                <h3 className="yy-mk2-group__title">金属サイディング</h3>
                <span className="yy-mk2-group__rule" />
                <MakerCount category="外壁" page="siding" group="金属サイディング" />
              </div>
              <div className="text-[13px]">
                <MakerRows category="外壁" page="siding" group="金属サイディング" />
              </div>
            </div>

            {/* カテゴリー: 窯業系サイディング */}
            <div className="mb-6">
              <div className="yy-mk2-group">
                <h3 className="yy-mk2-group__title">窯業系サイディング</h3>
                <span className="yy-mk2-group__rule" />
                <MakerCount category="外壁" page="siding" group="窯業系サイディング" />
              </div>
              <div className="text-[13px]">
                <MakerRows category="外壁" page="siding" group="窯業系サイディング" />
              </div>
            </div>

            {/* カテゴリー: その他サイディング */}
            <div className="mb-6">
              <div className="yy-mk2-group">
                <h3 className="yy-mk2-group__title">その他サイディング</h3>
                <span className="yy-mk2-group__rule" />
                <MakerCount category="外壁" page="siding" group="その他サイディング" />
              </div>
              <div className="text-[13px]">
                <MakerRows category="外壁" page="siding" group="その他サイディング" />
              </div>
            </div>
          </div>
        );

      case 'metalpanel':
      case '金属パネル':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">金属パネル</h2>
              <MakerCount category="外壁" page="金属パネル" />
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
              <MakerRows category="外壁" page="金属パネル" />
            </div>
          </div>
        );

      case 'exterior-wall-other':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">外壁 その他</h2>
              <MakerCount category="外壁" page="exterior-wall-other" />
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
              <MakerRows category="外壁" page="exterior-wall-other" />
            </div>
          </div>
        );

      case 'plaster':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">外壁仕上げ 塗り壁</h2>
              <MakerCount category="外壁" page="plaster" />
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
              <MakerRows category="外壁" page="plaster" />
            </div>
          </div>
        );

      case 'tile':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">外壁仕上げ タイル</h2>
              <MakerCount category="外壁" page="tile" />
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
              <MakerRows category="外壁" page="tile" />
            </div>
          </div>
        );

      case 'stone-brick':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">外壁仕上げ 石・レンガ</h2>
              <MakerCount category="外壁" page="stone-brick" />
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
              <MakerRows category="外壁" page="stone-brick" />
            </div>
          </div>
        );

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

export default ExteriorWallContent; 