'use client';

import React, { useState } from 'react';
import MakerLink from '@/components/MakerLink';
import MakerRows from '@/components/MakerRows';
import MakerCount from './MakerCount';
import './materials.css';
import BasicKnowledge, { KnowledgeToggle, type KnowledgeEntry } from '@/components/BasicKnowledge';
import KNOWLEDGE_JSON from '@/data/knowledge/roof.json';

const KNOWLEDGE = KNOWLEDGE_JSON as unknown as KnowledgeEntry[];


interface RoofContentProps {
  subcategory: string;
}

const RoofContent: React.FC<RoofContentProps> = ({ subcategory }) => {
  const [showBasicKnowledge, setShowBasicKnowledge] = useState(false);
  // リンクの実体は src/components/MakerLink.tsx。
  // 404 になったメーカーページは会社トップへ自動で振り替わる。
  const renderLink = (url: string | undefined, label: string) => (
    <MakerLink url={url} label={label} />
  );

  const renderContent = () => {
    switch (subcategory) {
      case '折板':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">折板</h2>
              <MakerCount category="屋根" page="折板" />
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
              <MakerRows category="屋根" page="折板" />
            </div>
          </div>
        );

      case '金属屋根':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">金属屋根</h2>
              <MakerCount category="屋根" page="金属屋根" />
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
            <div className="yy-mk2-group">
              <h3 className="yy-mk2-group__title">立平葺</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="屋根" page="金属屋根" group="立平葺" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="屋根" page="金属屋根" group="立平葺" />
            </div>

            <div className="yy-mk2-group">
              <h3 className="yy-mk2-group__title">横葺</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="屋根" page="金属屋根" group="横葺" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="屋根" page="金属屋根" group="横葺" />
            </div>
          </div>
        );

      case 'スレート':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">スレート</h2>
              <MakerCount category="屋根" page="スレート" />
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
              <MakerRows category="屋根" page="スレート" />
            </div>
          </div>
        );

      case '瓦':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">瓦</h2>
              <MakerCount category="屋根" page="瓦" />
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
            <div className="yy-mk2-group">
              <h3 className="yy-mk2-group__title">瓦</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="屋根" page="瓦" group="瓦" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="屋根" page="瓦" group="瓦" />
            </div>

            <div className="yy-mk2-group">
              <h3 className="yy-mk2-group__title">金属瓦</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="屋根" page="瓦" group="金属瓦" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="屋根" page="瓦" group="金属瓦" />
            </div>
          </div>
        );

      case '屋根その他':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">屋根その他</h2>
              <MakerCount category="屋根" page="屋根その他" />
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
            <div className="yy-mk2-group">
              <h3 className="yy-mk2-group__title">アスファルトシングル</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="屋根" page="屋根その他" group="アスファルトシングル" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="屋根" page="屋根その他" group="アスファルトシングル" />
            </div>

            <div className="yy-mk2-group">
              <h3 className="yy-mk2-group__title">ガルバリウム鋼板</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="屋根" page="屋根その他" group="ガルバリウム鋼板" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="屋根" page="屋根その他" group="ガルバリウム鋼板" />
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

export default RoofContent; 