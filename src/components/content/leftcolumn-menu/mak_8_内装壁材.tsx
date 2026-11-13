'use client';

import React, { useState } from 'react';
import MakerLink from '@/components/MakerLink';
import MakerRows from '@/components/MakerRows';
import MakerCount from './MakerCount';
import './materials.css';
import BasicKnowledge, { KnowledgeToggle, type KnowledgeEntry } from '@/components/BasicKnowledge';
import KNOWLEDGE_JSON from '@/data/knowledge/internal-wall.json';

const KNOWLEDGE = KNOWLEDGE_JSON as unknown as KnowledgeEntry[];


interface InternalWallContentProps {
  subcategory: string;
}

const InternalWallContent: React.FC<InternalWallContentProps> = ({ subcategory }) => {
  const [showBasicKnowledge, setShowBasicKnowledge] = useState(false);
  
  // URLの有効性をチェックする関数

  // リンクの実体は src/components/MakerLink.tsx。
  // 404 になったメーカーページは会社トップへ自動で振り替わる。
  const renderLink = (url: string | undefined, label: string) => (
    <MakerLink url={url} label={label} />
  );

  const renderContent = () => {
    switch (subcategory) {
      case '内装壁壁紙':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">壁紙</h2>
              <MakerCount category="内装壁材" page="内装壁壁紙" />
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
              <MakerRows category="内装壁材" page="内装壁壁紙" />
            </div>
          </div>
        );

      case '内装壁化粧板':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">化粧板</h2>
              <MakerCount category="内装壁材" page="内装壁化粧板" />
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
              <MakerRows category="内装壁材" page="内装壁化粧板" />
            </div>
          </div>
        );

      case '内装壁化粧シート':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">化粧シート</h2>
              <MakerCount category="内装壁材" page="内装壁化粧シート" />
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
              <MakerRows category="内装壁材" page="内装壁化粧シート" />
            </div>
          </div>
        );

      case '内装壁化粧パネル':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">化粧パネル</h2>
              <MakerCount category="内装壁材" page="内装壁化粧パネル" />
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
              <h3 className="yy-mk2-group__title">金属パネル</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="内装壁材" page="内装壁化粧パネル" group="金属パネル" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="内装壁材" page="内装壁化粧パネル" group="金属パネル" />
            </div>

            <div className="yy-mk2-group">
              <h3 className="yy-mk2-group__title">木質パネル</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="内装壁材" page="内装壁化粧パネル" group="木質パネル" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="内装壁材" page="内装壁化粧パネル" group="木質パネル" />
            </div>
          </div>
        );

      case '内装壁塗り壁':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">内装 塗り壁</h2>
              <MakerCount category="内装壁材" page="内装壁塗り壁" />
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
              <MakerRows category="内装壁材" page="内装壁塗り壁" />
            </div>
          </div>
        );

      case '内装壁タイル':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">内装タイル</h2>
              <MakerCount category="内装壁材" page="内装壁タイル" />
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
              <MakerRows category="内装壁材" page="内装壁タイル" />
            </div>
          </div>
        );

      case '内装壁石レンガ':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">内装 石・レンガ</h2>
              <MakerCount category="内装壁材" page="内装壁石レンガ" />
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
              <h3 className="yy-mk2-group__title">石</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="内装壁材" page="内装壁石レンガ" group="石" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="内装壁材" page="内装壁石レンガ" group="石" />
            </div>

            <div className="yy-mk2-group">
              <h3 className="yy-mk2-group__title">レンガ</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="内装壁材" page="内装壁石レンガ" group="レンガ" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="内装壁材" page="内装壁石レンガ" group="レンガ" />
            </div>

            <div className="yy-mk2-group">
              <h3 className="yy-mk2-group__title">人工大理石</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="内装壁材" page="内装壁石レンガ" group="人工大理石" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="内装壁材" page="内装壁石レンガ" group="人工大理石" />
            </div>

            <div className="yy-mk2-group">
              <h3 className="yy-mk2-group__title">ブロック</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="内装壁材" page="内装壁石レンガ" group="ブロック" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="内装壁材" page="内装壁石レンガ" group="ブロック" />
            </div>
          </div>
        );

      case '内装壁装飾材':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">内装装飾材</h2>
              <MakerCount category="内装壁材" page="内装壁装飾材" />
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
              <h3 className="yy-mk2-group__title">ルーバー</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="内装壁材" page="内装壁装飾材" group="ルーバー" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="内装壁材" page="内装壁装飾材" group="ルーバー" />
            </div>
          </div>
        );

      case '内装壁機能性':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">内装 機能性壁材</h2>
              <MakerCount category="内装壁材" page="内装壁機能性" />
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
              <h3 className="yy-mk2-group__title">GW吸音板</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="内装壁材" page="内装壁機能性" group="GW吸音板" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="内装壁材" page="内装壁機能性" group="GW吸音板" />
            </div>
          </div>
        );

      case '内装壁壁見切':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">内装 壁見切</h2>
              <MakerCount category="内装壁材" page="内装壁壁見切" />
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
              <h3 className="yy-mk2-group__title">出入隅</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="内装壁材" page="内装壁壁見切" group="出入隅" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="内装壁材" page="内装壁壁見切" group="出入隅" nameWidth="200px" />
            </div>

            <div className="yy-mk2-group">
              <h3 className="yy-mk2-group__title">笠木</h3>
              <span className="yy-mk2-group__rule" />
              <MakerCount category="内装壁材" page="内装壁壁見切" group="笠木" />
            </div>
            <div className="text-[13px]">
              <MakerRows category="内装壁材" page="内装壁壁見切" group="笠木" nameWidth="200px" />
            </div>
          </div>
        );

      case '内装壁金属板':
      case '内装壁その他':
        return (
          <div>
            <div className="yy-mk2-head">
              <h2 className="yy-mk2-title">{subcategory === '内装壁金属板' ? '内装 金属板' : '内装壁 その他'}</h2>
              {(subcategory === '内装壁金属板' || subcategory === '内装壁その他') && (
                <button
                  onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
                  type="button"
                  className="yy-bk-toggle"
                  aria-expanded={showBasicKnowledge}
                >
                  基本知識<span className={`yy-bk-chev${showBasicKnowledge ? ' is-open' : ''}`} aria-hidden="true" />
                </button>
              )}
              <a href="/register" className="yy-mk2-reg">掲載希望はコチラ</a>
            </div>
            
            {/* 基本知識トグル */}
            {showBasicKnowledge && <BasicKnowledge data={KNOWLEDGE} param={subcategory} />}
            
            {/* 内装壁その他の基本知識トグル */}
            {showBasicKnowledge && <BasicKnowledge data={KNOWLEDGE} param={subcategory} />}
            

            <div className="mt-4 text-[13px]">
              <MakerRows category="内装壁材" page="内装壁その他" nameWidth="200px" />
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

export default InternalWallContent; 