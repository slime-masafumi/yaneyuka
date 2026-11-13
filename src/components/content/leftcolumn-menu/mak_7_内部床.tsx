'use client';

import React, { useState } from 'react';
import MakerLink from '@/components/MakerLink';
import MakerRows from '@/components/MakerRows';
import MakerCount from './MakerCount';
import './materials.css';
import BasicKnowledge, { KnowledgeToggle, type KnowledgeEntry } from '@/components/BasicKnowledge';
import KNOWLEDGE_JSON from '@/data/knowledge/internal-floor.json';

const KNOWLEDGE = KNOWLEDGE_JSON as unknown as KnowledgeEntry[];


interface InternalFloorContentProps {
  subcategory: string;
}

const InternalFloorContent: React.FC<InternalFloorContentProps> = ({ subcategory }) => {
  const [showBasicKnowledge, setShowBasicKnowledge] = useState(false);
  // リンクの実体は src/components/MakerLink.tsx。
  // 404 になったメーカーページは会社トップへ自動で振り替わる。
  const renderLink = (url: string | undefined, label: string) => (
    <MakerLink url={url} label={label} />
  );

  const renderContent = () => {
    switch (subcategory) {
      case 'フローリング':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">フローリング</h2>
              <MakerCount category="内部床" page="フローリング" />
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
              <MakerRows category="内部床" page="フローリング" />
            </div>
          </div>
        );

      case 'ビニールタイル':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">ビニールタイル</h2>
              <MakerCount category="内部床" page="ビニールタイル" />
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
              <MakerRows category="内部床" page="ビニールタイル" />
            </div>
          </div>
        );

      case 'ビニールシート':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">ビニールシート</h2>
              <MakerCount category="内部床" page="ビニールシート" />
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
              <MakerRows category="内部床" page="ビニールシート" />
            </div>
          </div>
        );

      case 'カーペット':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">カーペット</h2>
              <MakerCount category="内部床" page="カーペット" />
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
              <h3 className="yy-mk2-group__title">タイルカーペット</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="内部床" page="カーペット" group="タイルカーペット" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="内部床" page="カーペット" group="タイルカーペット" />
            </div>

            <div className="yy-mk2-group">
              <h3 className="yy-mk2-group__title">ロールカーペット</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="内部床" page="カーペット" group="ロールカーペット" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="内部床" page="カーペット" group="ロールカーペット" />
            </div>
          </div>
        );

      case '内装タイル':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">内装床タイル</h2>
              <MakerCount category="内部床" page="内装タイル" />
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
              <MakerRows category="内部床" page="内装タイル" />
            </div>
          </div>
        );

      case '内装床石レンガ':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">内装床 石・レンガ</h2>
              <MakerCount category="内部床" page="内装床石レンガ" />
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
              <MakerRows category="内部床" page="内装床石レンガ" />
            </div>
          </div>
        );

      case '畳':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">畳</h2>
              <MakerCount category="内部床" page="畳" />
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
              <MakerRows category="内部床" page="畳" />
            </div>
          </div>
        );

      case '巾木床見切':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">巾木・床見切</h2>
              <MakerCount category="内部床" page="巾木床見切" />
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
              <h3 className="yy-mk2-group__title">巾木</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="内部床" page="巾木床見切" group="巾木" />
            </div>

            <div className="text-[13px]">
              <MakerRows category="内部床" page="巾木床見切" group="巾木" />
            </div>

            <div className="yy-mk2-group">
              <h3 className="yy-mk2-group__title">床見切</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="内部床" page="巾木床見切" group="床見切" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="内部床" page="巾木床見切" group="床見切" nameWidth="200px" />
            </div>
          </div>
        );

      case '内装床機能性':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">機能性</h2>
              <MakerCount category="内部床" page="内装床機能性" />
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
              <h3 className="yy-mk2-group__title">制振・遮音材</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="内部床" page="内装床機能性" group="制振・遮音材" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="内部床" page="内装床機能性" group="制振・遮音材" nameWidth="200px" />
            </div>

            <div className="yy-mk2-group">
              <h3 className="yy-mk2-group__title">床暖房</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="内部床" page="内装床機能性" group="床暖房" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="内部床" page="内装床機能性" group="床暖房" nameWidth="200px" />
            </div>
          </div>
        );

      case '内装床その他':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">その他</h2>
              <MakerCount category="内部床" page="内装床その他" />
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
              <h3 className="yy-mk2-group__title">床下地材</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="内部床" page="内装床その他" group="床下地材" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="内部床" page="内装床その他" group="床下地材" nameWidth="200px" />
            </div>

            <div className="yy-mk2-group">
              <h3 className="yy-mk2-group__title">接着剤</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="内部床" page="内装床その他" group="接着剤" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="内部床" page="内装床その他" group="接着剤" />
            </div>

            <div className="yy-mk2-group">
              <h3 className="yy-mk2-group__title">フロアコーティング</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="内部床" page="内装床その他" group="フロアコーティング" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="内部床" page="内装床その他" group="フロアコーティング" />
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

export default InternalFloorContent; 