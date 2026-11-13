'use client';

import React, { useState } from 'react';
import MakerLink from '@/components/MakerLink';
import MakerRows from '@/components/MakerRows';
import MakerCount from './MakerCount';
import './materials.css';
import BasicKnowledge, { KnowledgeToggle, type KnowledgeEntry } from '@/components/BasicKnowledge';
import KNOWLEDGE_JSON from '@/data/knowledge/opening.json';

const KNOWLEDGE = KNOWLEDGE_JSON as unknown as KnowledgeEntry[];


interface OpeningContentProps {
  subcategory: string;
}

const OpeningContent: React.FC<OpeningContentProps> = ({ subcategory }) => {
  const [showBasicKnowledge, setShowBasicKnowledge] = useState(false);
  // リンクの実体は src/components/MakerLink.tsx。
  // 404 になったメーカーページは会社トップへ自動で振り替わる。
  const renderLink = (url: string | undefined, label: string) => (
    <MakerLink url={url} label={label} />
  );

  const renderSubcategoryContent = () => {
    switch (subcategory) {
      case 'aluminum-sash':
        return (
          <div className="opening-subcategory">
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">アルミサッシ</h2>
              <MakerCount category="開口部" page="aluminum-sash" />
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
              <MakerRows category="開口部" page="aluminum-sash" />
            </div>
          </div>
        );

      case 'resin-sash':
        return (
          <div className="opening-subcategory">
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">樹脂サッシ</h2>
              <MakerCount category="開口部" page="resin-sash" />
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
              <MakerRows category="開口部" page="resin-sash" />
            </div>
          </div>
        );

      case 'wood-sash':
        return (
          <div className="opening-subcategory">
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">木製サッシ</h2>
              <MakerCount category="開口部" page="wood-sash" />
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
              <MakerRows category="開口部" page="wood-sash" />
            </div>
          </div>
        );

      case 'light-shutter':
        return (
          <div className="opening-subcategory">
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">軽量シャッター</h2>
              <MakerCount category="開口部" page="light-shutter" />
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
              <MakerRows category="開口部" page="light-shutter" />
            </div>
          </div>
        );

      case 'heavy-shutter':
        return (
          <div className="opening-subcategory">
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">重量シャッター</h2>
              <MakerCount category="開口部" page="heavy-shutter" />
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
              <h3 className="yy-mk2-group__title">重量シャッター</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="開口部" page="heavy-shutter" group="重量シャッター" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="開口部" page="heavy-shutter" group="重量シャッター" />
            </div>

            <div className="yy-mk2-group">
              <h3 className="yy-mk2-group__title">その他シャッター</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="開口部" page="heavy-shutter" group="その他シャッター" />
            </div>
            
            <div className="text-[13px]">
              <MakerRows category="開口部" page="heavy-shutter" group="その他シャッター" />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="opening-content">
      {renderSubcategoryContent()}
    </div>
  );
};

export default OpeningContent; 