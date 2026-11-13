'use client';

import React, { useState } from 'react';
import MakerLink from '@/components/MakerLink';
import MakerRows from '@/components/MakerRows';
import MakerCount from './MakerCount';
import './materials.css';
import BasicKnowledge, { KnowledgeToggle, type KnowledgeEntry } from '@/components/BasicKnowledge';
import KNOWLEDGE_JSON from '@/data/knowledge/external-floor.json';

const KNOWLEDGE = KNOWLEDGE_JSON as unknown as KnowledgeEntry[];


interface ExternalFloorContentProps {
  subcategory: string;
}

const ExternalFloorContent: React.FC<ExternalFloorContentProps> = ({ subcategory }) => {
  const [showBasicKnowledge, setShowBasicKnowledge] = useState(false);
  // リンクの実体は src/components/MakerLink.tsx。
  // 404 になったメーカーページは会社トップへ自動で振り替わる。
  const renderLink = (url: string | undefined, label: string) => (
    <MakerLink url={url} label={label} />
  );

  const renderContent = () => {
    switch (subcategory) {
      case 'external-tile':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">外部床 タイル</h2>
              <MakerCount category="外部床" page="external-tile" />
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
              <MakerRows category="外部床" page="external-tile" nameWidth="200px" />
            </div>
          </div>
        );

      case 'external-stone-brick':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">外部床 石・レンガ</h2>
              <MakerCount category="外部床" page="external-stone-brick" />
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
              <MakerRows category="外部床" page="external-stone-brick" nameWidth="200px" />
            </div>
          </div>
        );

      case 'pvc-sheet':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">外部床 塩ビシート</h2>
              <MakerCount category="外部床" page="pvc-sheet" />
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
              <MakerRows category="外部床" page="pvc-sheet" nameWidth="200px" />
            </div>
          </div>
        );

      case 'external-finish':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">外部床 その他</h2>
              <MakerCount category="外部床" page="external-finish" />
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
              <MakerRows category="外部床" page="external-finish" nameWidth="200px" />
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

export default ExternalFloorContent; 