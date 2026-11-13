'use client';

import React, { useState } from 'react';
import MakerLink from '@/components/MakerLink';
import MakerRows from '@/components/MakerRows';
import MakerCount from './MakerCount';
import './materials.css';
import BasicKnowledge, { KnowledgeToggle, type KnowledgeEntry } from '@/components/BasicKnowledge';
import KNOWLEDGE_JSON from '@/data/knowledge/exterior-other.json';

const KNOWLEDGE = KNOWLEDGE_JSON as unknown as KnowledgeEntry[];


interface ExteriorOtherContentProps {
  subcategory: string;
}

const ExteriorOtherContent: React.FC<ExteriorOtherContentProps> = ({ subcategory }) => {
  const [showBasicKnowledge, setShowBasicKnowledge] = useState(false);
  // リンクの実体は src/components/MakerLink.tsx。
  // 404 になったメーカーページは会社トップへ自動で振り替わる。
  const renderLink = (url: string | undefined, label: string) => (
    <MakerLink url={url} label={label} />
  );

  const renderContent = () => {
    switch (subcategory) {
      case '笠木水切':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">笠木・水切</h2>
              <MakerCount category="外部その他" page="笠木水切" />
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
              <MakerRows category="外部その他" page="笠木水切" />
            </div>
          </div>
        );
      case '庇オーニング':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">庇・オーニング</h2>
              <MakerCount category="外部その他" page="庇オーニング" />
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
              <h3 className="yy-mk2-group__title">庇（アルミ）</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="外部その他" page="庇オーニング" group="庇（アルミ）" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="外部その他" page="庇オーニング" group="庇（アルミ）" />
            </div>

            <div className="yy-mk2-group">
              <h3 className="yy-mk2-group__title">庇（ガラス）</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="外部その他" page="庇オーニング" group="庇（ガラス）" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="外部その他" page="庇オーニング" group="庇（ガラス）" />
            </div>

            <div className="yy-mk2-group">
              <h3 className="yy-mk2-group__title">オーニング</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="外部その他" page="庇オーニング" group="オーニング" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="外部その他" page="庇オーニング" group="オーニング" />
            </div>
          </div>
        );
      case '雨どい':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">雨どい</h2>
              <MakerCount category="外部その他" page="雨どい" />
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

            <div className="text-[13px]">
              <MakerRows category="外部その他" page="雨どい" />
            </div>
          </div>
        );
      case 'ハト小屋':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">ハト小屋</h2>
              <MakerCount category="外部その他" page="ハト小屋" />
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

            <div className="text-[13px]">
              <MakerRows category="外部その他" page="ハト小屋" />
            </div>
          </div>
        );
      case '太陽光パネル':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">太陽光パネル</h2>
              <MakerCount category="外部その他" page="太陽光パネル" />
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

            <div className="text-[13px]">
              <MakerRows category="外部その他" page="太陽光パネル" />
            </div>
          </div>
        );
      case '手摺':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">手摺</h2>
              <MakerCount category="外部その他" page="手摺" />
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

            <div className="text-[13px]">
              <MakerRows category="外部その他" page="手摺" />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="content-container">
      {renderContent()}
    </div>
  );
};

export default ExteriorOtherContent; 