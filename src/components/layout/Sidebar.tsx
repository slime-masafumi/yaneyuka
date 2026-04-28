'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

interface SidebarProps {
  onItemClick?: () => void;
  onPageChange?: (page: string) => void;
  onLogoClick?: () => void;
}

// data-page → 親カテゴリURL のマッピング（SEO用: クローラがリンクを辿れるようにする）
const subcategoryToUrl: Record<string, string> = {
  // 屋根
  '折板': '/roof/', '金属屋根': '/roof/', 'スレート': '/roof/', '瓦': '/roof/', '屋根その他': '/roof/',
  // 外壁
  'alc': '/exterior-wall/', 'ecp': '/exterior-wall/', '金属サイディング': '/exterior-wall/', '窯業サイディング': '/exterior-wall/', 'metalpanel': '/exterior-wall/', 'exterior-wall-other': '/exterior-wall/',
  // 開口部
  'aluminum-sash': '/opening/', 'resin-sash': '/opening/', 'wood-sash': '/opening/', 'light-shutter': '/opening/', 'heavy-shutter': '/opening/',
  // 外壁仕上げ
  'paint': '/exterior-wall/', 'plaster': '/exterior-wall/', 'tile': '/exterior-wall/', 'stone-brick': '/exterior-wall/', 'metal-panel': '/exterior-wall/', 'wood-board': '/exterior-wall/', 'decorative': '/exterior-wall/', 'other-finish': '/exterior-wall/',
  // 外部床
  'external-tile': '/external-floor/', 'external-stone-brick': '/external-floor/', 'pvc-sheet': '/external-floor/', 'external-finish': '/external-floor/',
  // 外部その他
  '笠木水切': '/exterior-other/', '庇オーニング': '/exterior-other/', '雨どい': '/exterior-other/', 'ハト小屋': '/exterior-other/', '太陽光パネル': '/exterior-other/', '手摺': '/exterior-other/',
  // 内部床材
  'フローリング': '/internal-floor/', 'ビニールタイル': '/internal-floor/', 'ビニールシート': '/internal-floor/', 'カーペット': '/internal-floor/', '内装タイル': '/internal-floor/', '内装床石レンガ': '/internal-floor/', '畳': '/internal-floor/', '巾木床見切': '/internal-floor/', '内装床機能性': '/internal-floor/', '内装床その他': '/internal-floor/',
  // 内装壁材
  '内装壁壁紙': '/internal-wall/', '内装壁化粧板': '/internal-wall/', '内装壁化粧シート': '/internal-wall/', '内装壁化粧パネル': '/internal-wall/', '内装壁金属板': '/internal-wall/', '内装壁塗り壁': '/internal-wall/', '内装壁タイル': '/internal-wall/', '内装壁石レンガ': '/internal-wall/', '内装壁装飾材': '/internal-wall/', '内装壁機能性': '/internal-wall/', '内装壁壁見切': '/internal-wall/', '内装壁その他': '/internal-wall/',
  // 内装天井材
  '内装天井ボード': '/internal-ceiling/', '内装天井化粧材': '/internal-ceiling/', '内装天井装飾材': '/internal-ceiling/', '内装天井機能性': '/internal-ceiling/', '内装天井その他': '/internal-ceiling/',
  // 内装その他
  'トイレブース': '/internal-other/', '内装サッシ': '/internal-other/', '内装シャッター': '/internal-other/', 'ノンスリップ': '/internal-other/', '内装手摺': '/internal-other/', 'グレーチング': '/internal-other/', '内装緑化': '/internal-other/', '点検口': '/internal-other/', '隔壁': '/internal-other/', '保護材': '/internal-other/', '点字': '/internal-other/', 'ディスプレイ': '/internal-other/', '内装その他製品': '/internal-other/',
  // 防水
  'ウレタン防水': '/waterproof/', 'アスファルト防水': '/waterproof/', 'シート防水': '/waterproof/', 'FRP防水': '/waterproof/', '防水その他': '/waterproof/',
  // 金物
  'ハンドル': '/hardware/', '引棒': '/hardware/', '建具金物': '/hardware/', '棚フック': '/hardware/', 'サニタリー': '/hardware/', '家具金物': '/hardware/', '鍵関係': '/hardware/', 'EXP,J': '/hardware/', '金物その他': '/hardware/',
  // ファニチャー
  '家具': '/furniture/', 'カーテン': '/furniture/', 'ブラインド': '/furniture/', '生地': '/furniture/', 'ファニチャーその他': '/furniture/',
  // 電気設備
  '照明': '/electrical-systems/', '外構照明': '/electrical-systems/', 'スイッチコンセント': '/electrical-systems/', '発電機': '/electrical-systems/', '電気設備その他': '/electrical-systems/',
  // 機械設備
  '水栓': '/mechanical-systems/', '衛生機器': '/mechanical-systems/', '住宅設備': '/mechanical-systems/', 'キッチン': '/mechanical-systems/', '空調機': '/mechanical-systems/', '機械設備その他': '/mechanical-systems/',
  // 外構
  '縁石': '/exterior-infrastructure/', '外構舗装': '/exterior-infrastructure/', '雨水桝': '/exterior-infrastructure/', '桝蓋': '/exterior-infrastructure/', '外構グレーチング': '/exterior-infrastructure/', '外構その他': '/exterior-infrastructure/',
  // エクステリア
  '宅配ボックス': '/exterior/', '郵便受け': '/exterior/', '表札': '/exterior/', '門扉': '/exterior/', 'フェンス': '/exterior/', 'カーポート': '/exterior/', '大型引戸': '/exterior/', 'ウッドデッキ': '/exterior/', '駐輪場': '/exterior/', 'ゴミストッカー': '/exterior/', 'エクステリア緑化': '/exterior/', 'エクステリアその他': '/exterior/',
};

function buildHref(dataPage: string): string {
  const base = subcategoryToUrl[dataPage];
  if (!base) return '#';
  return `${base}?subcategory=${encodeURIComponent(dataPage)}`;
}

const Sidebar: React.FC<SidebarProps> = ({ onItemClick, onPageChange, onLogoClick }) => {
  useEffect(() => {
    // アコーディオン機能の実装（最大2つまで開く、3つ目で最初を閉じる）
    const handleAccordionClick = (event: Event) => {
      event.preventDefault();
      const toggle = event.currentTarget as HTMLButtonElement;
      const parent = toggle.parentElement;
      if (!parent) return;
      const content = parent.querySelector('.accordion-content') as HTMLElement;
      if (!content) return;
      const isOpening = !content.classList.contains('open');

      if (!isOpening) {
        content.classList.remove('open');
        toggle.classList.remove('open');
        return;
      }

      const openAccordions = document.querySelectorAll('.accordion-content.open');

      if (openAccordions.length >= 2) {
        const firstOpenAccordion = openAccordions[0] as HTMLElement;
        const firstOpenParent = firstOpenAccordion.parentElement;
        if (firstOpenParent) {
          const firstOpenBtn = firstOpenParent.querySelector('.accordion-toggle') as HTMLButtonElement;
          if (firstOpenBtn) {
            firstOpenAccordion.classList.remove('open');
            firstOpenBtn.classList.remove('open');
          }
        }
      }

      content.classList.add('open');
      toggle.classList.add('open');

      if (isOpening) {
        setTimeout(() => {
          parent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    };

    const handleSubcategoryClick = (event: Event) => {
      const target = event.target as HTMLElement;
      const page = target.getAttribute('data-page');
      if (page && onPageChange) {
        // documentレベルハンドラとの二重呼び出しを防止するフラグ
        (event as any).__subcategoryHandled = true;
        onPageChange(page);
      }
      if (onItemClick) {
        onItemClick();
      }
    };

    const timer = setTimeout(() => {
      const accordionToggles = document.querySelectorAll('.accordion-toggle');
      accordionToggles.forEach((toggle) => {
        toggle.addEventListener('click', handleAccordionClick);
      });

      const subcategories = document.querySelectorAll('.subcategory');
      subcategories.forEach((subcategory) => {
        subcategory.addEventListener('click', handleSubcategoryClick);
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      const accordionToggles = document.querySelectorAll('.accordion-toggle');
      accordionToggles.forEach(toggle => {
        toggle.removeEventListener('click', handleAccordionClick);
      });
      const subcategories = document.querySelectorAll('.subcategory');
      subcategories.forEach(subcategory => {
        subcategory.removeEventListener('click', handleSubcategoryClick);
      });
    };
  }, [onItemClick, onPageChange]);

  return (
    <aside className="w-full md:w-[200px] lg:w-[180px] shrink-0 text-[14px] left-column">
      {/* ロゴ */}
      <div className="px-3 hidden lg:block" style={{ paddingTop: '28px' }}>
        <Link href="/" className="block" onClick={() => onLogoClick?.()}>
          <img
            src="/image/yaneyukaロゴ4.png"
            alt="yaneyuka"
            className="w-full max-w-[156px] h-auto"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'block';
            }}
          />
          <span className="text-white text-xl font-bold" style={{ display: 'none' }}>yaneyuka</span>
        </Link>
      </div>
      <div style={{ height: '40px' }} className="hidden lg:block" />
      <h3 className="font-semibold mb-0 text-white hidden lg:block text-[12px] 2xl:text-[13px]">建材検索</h3>
      <div className="category-scroll-container"></div>
      <div className="space-y-0">
        {/* Maker conect */}
        <div>
          <button className="subcategory w-full text-left px-4 py-1 text-[12px] 2xl:text-[13px] text-gray-300" data-page="makerconect">Maker conect</button>
        </div>
        {/* Chatbot */}
        <div>
          <button className="subcategory w-full text-left px-4 py-1 text-[12px] 2xl:text-[13px] text-gray-300" data-page="chatbot">Chatbot</button>
        </div>

        {/* 屋根 */}
        <div>
          <button className="w-full text-left px-4 py-2 cursor-pointer accordion-toggle text-[12px] 2xl:text-[13px] text-gray-300">屋根</button>
          <ul className="accordion-content ml-4 text-[12px] space-y-1">
            <li><a href={buildHref('折板')} className="subcategory text-white" data-page="折板">折板</a></li>
            <li><a href={buildHref('金属屋根')} className="subcategory text-white" data-page="金属屋根">金属屋根</a></li>
            <li><a href={buildHref('スレート')} className="subcategory text-white" data-page="スレート">スレート</a></li>
            <li><a href={buildHref('瓦')} className="subcategory text-white" data-page="瓦">瓦</a></li>
            <li><a href={buildHref('屋根その他')} className="subcategory text-white" data-page="屋根その他">その他</a></li>
          </ul>
        </div>

        {/* 外壁 */}
        <div>
          <button className="w-full text-left px-4 py-2 cursor-pointer accordion-toggle text-[12px] 2xl:text-[13px] text-gray-300">外壁</button>
          <ul className="accordion-content ml-4 text-[12px] space-y-1">
            <li><a href={buildHref('alc')} className="subcategory text-white" data-page="alc">ALC</a></li>
            <li><a href={buildHref('ecp')} className="subcategory text-white" data-page="ecp">ECPパネル</a></li>
            <li><a href={buildHref('金属サイディング')} className="subcategory text-white" data-page="金属サイディング">金属サイディング</a></li>
            <li><a href={buildHref('窯業サイディング')} className="subcategory text-white" data-page="窯業サイディング">窯業サイディング</a></li>
            <li><a href={buildHref('metalpanel')} className="subcategory text-white" data-page="metalpanel">金属パネル</a></li>
            <li><a href={buildHref('exterior-wall-other')} className="subcategory text-white" data-page="exterior-wall-other">その他</a></li>
          </ul>
        </div>

        {/* 開口部 */}
        <div>
          <button className="w-full text-left px-4 py-2 cursor-pointer accordion-toggle text-[12px] 2xl:text-[13px] text-gray-300">開口部</button>
          <ul className="accordion-content ml-4 text-[12px] space-y-1">
            <li><a href={buildHref('aluminum-sash')} className="subcategory text-white" data-page="aluminum-sash">アルミサッシ</a></li>
            <li><a href={buildHref('resin-sash')} className="subcategory text-white" data-page="resin-sash">樹脂サッシ</a></li>
            <li><a href={buildHref('wood-sash')} className="subcategory text-white" data-page="wood-sash">木製サッシ</a></li>
            <li><a href={buildHref('light-shutter')} className="subcategory text-white" data-page="light-shutter">軽量シャッター</a></li>
            <li><a href={buildHref('heavy-shutter')} className="subcategory text-white" data-page="heavy-shutter">重量シャッター</a></li>
          </ul>
        </div>

        {/* 外壁仕上げ */}
        <div>
          <button className="w-full text-left px-4 py-2 cursor-pointer accordion-toggle text-[12px] 2xl:text-[13px] text-gray-300">外壁仕上げ</button>
          <ul className="accordion-content ml-4 text-[12px] space-y-1">
            <li><a href={buildHref('paint')} className="subcategory text-white" data-page="paint">塗装</a></li>
            <li><a href={buildHref('plaster')} className="subcategory text-white" data-page="plaster">塗り壁</a></li>
            <li><a href={buildHref('tile')} className="subcategory text-white" data-page="tile">タイル</a></li>
            <li><a href={buildHref('stone-brick')} className="subcategory text-white" data-page="stone-brick">石・レンガ</a></li>
            <li><a href={buildHref('metal-panel')} className="subcategory text-white" data-page="metal-panel">金属パネル</a></li>
            <li><a href={buildHref('wood-board')} className="subcategory text-white" data-page="wood-board">木板材</a></li>
            <li><a href={buildHref('decorative')} className="subcategory text-white" data-page="decorative">装飾材</a></li>
            <li><a href={buildHref('other-finish')} className="subcategory text-white" data-page="other-finish">その他</a></li>
          </ul>
        </div>

        {/* 外部床 */}
        <div>
          <button className="w-full text-left px-4 py-2 cursor-pointer accordion-toggle text-[12px] 2xl:text-[13px] text-gray-300">外部床</button>
          <ul className="accordion-content ml-4 text-[12px] space-y-1">
            <li><a href={buildHref('external-tile')} className="subcategory text-white" data-page="external-tile">タイル</a></li>
            <li><a href={buildHref('external-stone-brick')} className="subcategory text-white" data-page="external-stone-brick">石・レンガ</a></li>
            <li><a href={buildHref('pvc-sheet')} className="subcategory text-white" data-page="pvc-sheet">塩ビシート</a></li>
            <li><a href={buildHref('external-finish')} className="subcategory text-white" data-page="external-finish">その他</a></li>
          </ul>
        </div>

        {/* 外部その他 */}
        <div>
          <button className="w-full text-left px-4 py-2 cursor-pointer accordion-toggle text-[12px] 2xl:text-[13px] text-gray-300">外部その他</button>
          <ul className="accordion-content ml-4 text-[12px] space-y-1">
            <li><a href={buildHref('笠木水切')} className="subcategory text-white" data-page="笠木水切">笠木・水切</a></li>
            <li><a href={buildHref('庇オーニング')} className="subcategory text-white" data-page="庇オーニング">庇・オーニング</a></li>
            <li><a href={buildHref('雨どい')} className="subcategory text-white" data-page="雨どい">雨どい</a></li>
            <li><a href={buildHref('ハト小屋')} className="subcategory text-white" data-page="ハト小屋">ハト小屋</a></li>
            <li><a href={buildHref('太陽光パネル')} className="subcategory text-white" data-page="太陽光パネル">太陽光パネル</a></li>
            <li><a href={buildHref('手摺')} className="subcategory text-white" data-page="手摺">手摺</a></li>
          </ul>
        </div>

        {/* 内部床材 */}
        <div>
          <button className="w-full text-left px-4 py-2 cursor-pointer accordion-toggle text-[12px] 2xl:text-[13px] text-gray-300">内部床材</button>
          <ul className="accordion-content ml-4 text-[12px] space-y-1">
            <li><a href={buildHref('フローリング')} className="subcategory text-white" data-page="フローリング">フローリング</a></li>
            <li><a href={buildHref('ビニールタイル')} className="subcategory text-white" data-page="ビニールタイル">ビニールタイル</a></li>
            <li><a href={buildHref('ビニールシート')} className="subcategory text-white" data-page="ビニールシート">ビニールシート</a></li>
            <li><a href={buildHref('カーペット')} className="subcategory text-white" data-page="カーペット">カーペット</a></li>
            <li><a href={buildHref('内装タイル')} className="subcategory text-white" data-page="内装タイル">タイル</a></li>
            <li><a href={buildHref('内装床石レンガ')} className="subcategory text-white" data-page="内装床石レンガ">石・レンガ</a></li>
            <li><a href={buildHref('畳')} className="subcategory text-white" data-page="畳">畳</a></li>
            <li><a href={buildHref('巾木床見切')} className="subcategory text-white" data-page="巾木床見切">巾木・床見切</a></li>
            <li><a href={buildHref('内装床機能性')} className="subcategory text-white" data-page="内装床機能性">機能性</a></li>
            <li><a href={buildHref('内装床その他')} className="subcategory text-white" data-page="内装床その他">その他</a></li>
          </ul>
        </div>

        {/* 内装壁材 */}
        <div>
          <button className="w-full text-left px-4 py-2 cursor-pointer accordion-toggle text-[12px] 2xl:text-[13px] text-gray-300">内装壁材</button>
          <ul className="accordion-content ml-4 text-[12px] space-y-1">
            <li><a href={buildHref('内装壁壁紙')} className="subcategory text-white" data-page="内装壁壁紙">壁紙</a></li>
            <li><a href={buildHref('内装壁化粧板')} className="subcategory text-white" data-page="内装壁化粧板">化粧板</a></li>
            <li><a href={buildHref('内装壁化粧シート')} className="subcategory text-white" data-page="内装壁化粧シート">化粧シート</a></li>
            <li><a href={buildHref('内装壁化粧パネル')} className="subcategory text-white" data-page="内装壁化粧パネル">化粧パネル</a></li>
            <li><a href={buildHref('内装壁金属板')} className="subcategory text-white" data-page="内装壁金属板">金属板</a></li>
            <li><a href={buildHref('内装壁塗り壁')} className="subcategory text-white" data-page="内装壁塗り壁">塗り壁</a></li>
            <li><a href={buildHref('内装壁タイル')} className="subcategory text-white" data-page="内装壁タイル">タイル</a></li>
            <li><a href={buildHref('内装壁石レンガ')} className="subcategory text-white" data-page="内装壁石レンガ">石・レンガ</a></li>
            <li><a href={buildHref('内装壁装飾材')} className="subcategory text-white" data-page="内装壁装飾材">装飾材</a></li>
            <li><a href={buildHref('内装壁機能性')} className="subcategory text-white" data-page="内装壁機能性">機能性</a></li>
            <li><a href={buildHref('内装壁壁見切')} className="subcategory text-white" data-page="内装壁壁見切">壁見切</a></li>
            <li><a href={buildHref('内装壁その他')} className="subcategory text-white" data-page="内装壁その他">その他</a></li>
          </ul>
        </div>

        {/* 内装天井材 */}
        <div>
          <button className="w-full text-left px-4 py-2 cursor-pointer accordion-toggle text-[12px] 2xl:text-[13px] text-gray-300">内装天井材</button>
          <ul className="accordion-content ml-4 text-[12px] space-y-1">
            <li><a href={buildHref('内装天井ボード')} className="subcategory text-white" data-page="内装天井ボード">ボード</a></li>
            <li><a href={buildHref('内装天井化粧材')} className="subcategory text-white" data-page="内装天井化粧材">化粧材</a></li>
            <li><a href={buildHref('内装天井装飾材')} className="subcategory text-white" data-page="内装天井装飾材">装飾材</a></li>
            <li><a href={buildHref('内装天井機能性')} className="subcategory text-white" data-page="内装天井機能性">機能性</a></li>
            <li><a href={buildHref('内装天井その他')} className="subcategory text-white" data-page="内装天井その他">その他</a></li>
          </ul>
        </div>

        {/* 内装その他 */}
        <div>
          <button className="w-full text-left px-4 py-2 cursor-pointer accordion-toggle text-[12px] 2xl:text-[13px] text-gray-300">内装その他</button>
          <ul className="accordion-content ml-4 text-[12px] space-y-1">
            <li><a href={buildHref('トイレブース')} className="subcategory text-white" data-page="トイレブース">トイレブース</a></li>
            <li><a href={buildHref('内装サッシ')} className="subcategory text-white" data-page="内装サッシ">サッシ</a></li>
            <li><a href={buildHref('内装シャッター')} className="subcategory text-white" data-page="内装シャッター">シャッター</a></li>
            <li><a href={buildHref('ノンスリップ')} className="subcategory text-white" data-page="ノンスリップ">ノンスリップ</a></li>
            <li><a href={buildHref('内装手摺')} className="subcategory text-white" data-page="内装手摺">手摺</a></li>
            <li><a href={buildHref('グレーチング')} className="subcategory text-white" data-page="グレーチング">グレーチング</a></li>
            <li><a href={buildHref('内装緑化')} className="subcategory text-white" data-page="内装緑化">緑化</a></li>
            <li><a href={buildHref('点検口')} className="subcategory text-white" data-page="点検口">点検口</a></li>
            <li><a href={buildHref('隔壁')} className="subcategory text-white" data-page="隔壁">隔壁</a></li>
            <li><a href={buildHref('保護材')} className="subcategory text-white" data-page="保護材">保護材</a></li>
            <li><a href={buildHref('点字')} className="subcategory text-white" data-page="点字">点字</a></li>
            <li><a href={buildHref('ディスプレイ')} className="subcategory text-white" data-page="ディスプレイ">ディスプレイ</a></li>
            <li><a href={buildHref('内装その他製品')} className="subcategory text-white" data-page="内装その他製品">その他</a></li>
          </ul>
        </div>

        {/* 防水 */}
        <div>
          <button className="w-full text-left px-4 py-2 cursor-pointer accordion-toggle text-[12px] 2xl:text-[13px] text-gray-300">防水</button>
          <ul className="accordion-content ml-4 text-[12px] space-y-1">
            <li><a href={buildHref('ウレタン防水')} className="subcategory text-white" data-page="ウレタン防水">ウレタン防水</a></li>
            <li><a href={buildHref('アスファルト防水')} className="subcategory text-white" data-page="アスファルト防水">アスファルト防水</a></li>
            <li><a href={buildHref('シート防水')} className="subcategory text-white" data-page="シート防水">シート防水</a></li>
            <li><a href={buildHref('FRP防水')} className="subcategory text-white" data-page="FRP防水">FRP防水</a></li>
            <li><a href={buildHref('防水その他')} className="subcategory text-white" data-page="防水その他">その他</a></li>
          </ul>
        </div>

        {/* 金物 */}
        <div>
          <button className="w-full text-left px-4 py-2 cursor-pointer accordion-toggle text-[12px] 2xl:text-[13px] text-gray-300">金物</button>
          <ul className="accordion-content ml-4 text-[12px] space-y-1">
            <li><a href={buildHref('ハンドル')} className="subcategory text-white" data-page="ハンドル">ハンドル</a></li>
            <li><a href={buildHref('引棒')} className="subcategory text-white" data-page="引棒">引棒</a></li>
            <li><a href={buildHref('建具金物')} className="subcategory text-white" data-page="建具金物">建具金物</a></li>
            <li><a href={buildHref('棚フック')} className="subcategory text-white" data-page="棚フック">棚・フック他</a></li>
            <li><a href={buildHref('サニタリー')} className="subcategory text-white" data-page="サニタリー">サニタリー</a></li>
            <li><a href={buildHref('家具金物')} className="subcategory text-white" data-page="家具金物">家具金物</a></li>
            <li><a href={buildHref('鍵関係')} className="subcategory text-white" data-page="鍵関係">鍵関係</a></li>
            <li><a href={buildHref('EXP,J')} className="subcategory text-white" data-page="EXP,J">EXP.J</a></li>
            <li><a href={buildHref('金物その他')} className="subcategory text-white" data-page="金物その他">その他</a></li>
          </ul>
        </div>

        {/* ファニチャー */}
        <div>
          <button className="w-full text-left px-4 py-2 cursor-pointer accordion-toggle text-[12px] 2xl:text-[13px] text-gray-300">ファニチャー</button>
          <ul className="accordion-content ml-4 text-[12px] space-y-1">
            <li><a href={buildHref('家具')} className="subcategory text-white" data-page="家具">家具</a></li>
            <li><a href={buildHref('カーテン')} className="subcategory text-white" data-page="カーテン">カーテン</a></li>
            <li><a href={buildHref('ブラインド')} className="subcategory text-white" data-page="ブラインド">ブラインド</a></li>
            <li><a href={buildHref('生地')} className="subcategory text-white" data-page="生地">生地</a></li>
            <li><a href={buildHref('ファニチャーその他')} className="subcategory text-white" data-page="ファニチャーその他">その他</a></li>
          </ul>
        </div>

        {/* 電気設備 */}
        <div>
          <button className="w-full text-left px-4 py-2 cursor-pointer accordion-toggle text-[12px] 2xl:text-[13px] text-gray-300">電気設備</button>
          <ul className="accordion-content ml-4 text-[12px] space-y-1">
            <li><a href={buildHref('照明')} className="subcategory text-white" data-page="照明">照明</a></li>
            <li><a href={buildHref('外構照明')} className="subcategory text-white" data-page="外構照明">外構照明</a></li>
            <li><a href={buildHref('スイッチコンセント')} className="subcategory text-white" data-page="スイッチコンセント">SW・コンセント</a></li>
            <li><a href={buildHref('発電機')} className="subcategory text-white" data-page="発電機">発電機</a></li>
            <li><a href={buildHref('電気設備その他')} className="subcategory text-white" data-page="電気設備その他">その他</a></li>
          </ul>
        </div>

        {/* 機械設備 */}
        <div>
          <button className="w-full text-left px-4 py-2 cursor-pointer accordion-toggle text-[12px] 2xl:text-[13px] text-gray-300">機械設備</button>
          <ul className="accordion-content ml-4 text-[12px] space-y-1">
            <li><a href={buildHref('水栓')} className="subcategory text-white" data-page="水栓">水栓</a></li>
            <li><a href={buildHref('衛生機器')} className="subcategory text-white" data-page="衛生機器">衛生機器</a></li>
            <li><a href={buildHref('住宅設備')} className="subcategory text-white" data-page="住宅設備">住宅設備</a></li>
            <li><a href={buildHref('キッチン')} className="subcategory text-white" data-page="キッチン">キッチン</a></li>
            <li><a href={buildHref('空調機')} className="subcategory text-white" data-page="空調機">空調機</a></li>
            <li><a href={buildHref('機械設備その他')} className="subcategory text-white" data-page="機械設備その他">その他</a></li>
          </ul>
        </div>

        {/* 外構 */}
        <div>
          <button className="w-full text-left px-4 py-2 cursor-pointer accordion-toggle text-[12px] 2xl:text-[13px] text-gray-300">外構</button>
          <ul className="accordion-content ml-4 text-[12px] space-y-1">
            <li><a href={buildHref('縁石')} className="subcategory text-white" data-page="縁石">縁石</a></li>
            <li><a href={buildHref('外構舗装')} className="subcategory text-white" data-page="外構舗装">舗装</a></li>
            <li><a href={buildHref('雨水桝')} className="subcategory text-white" data-page="雨水桝">雨水桝</a></li>
            <li><a href={buildHref('桝蓋')} className="subcategory text-white" data-page="桝蓋">桝蓋</a></li>
            <li><a href={buildHref('外構グレーチング')} className="subcategory text-white" data-page="外構グレーチング">グレーチング</a></li>
            <li><a href={buildHref('外構その他')} className="subcategory text-white" data-page="外構その他">その他</a></li>
          </ul>
        </div>

        {/* エクステリア */}
        <div>
          <button className="w-full text-left px-4 py-2 cursor-pointer accordion-toggle text-[12px] 2xl:text-[13px] text-gray-300">エクステリア</button>
          <ul className="accordion-content ml-4 text-[12px] space-y-1">
            <li><a href={buildHref('宅配ボックス')} className="subcategory text-white" data-page="宅配ボックス">宅配ボックス</a></li>
            <li><a href={buildHref('郵便受け')} className="subcategory text-white" data-page="郵便受け">郵便受け</a></li>
            <li><a href={buildHref('表札')} className="subcategory text-white" data-page="表札">表札</a></li>
            <li><a href={buildHref('門扉')} className="subcategory text-white" data-page="門扉">門扉</a></li>
            <li><a href={buildHref('フェンス')} className="subcategory text-white" data-page="フェンス">フェンス</a></li>
            <li><a href={buildHref('カーポート')} className="subcategory text-white" data-page="カーポート">カーポート</a></li>
            <li><a href={buildHref('大型引戸')} className="subcategory text-white" data-page="大型引戸">大型引戸</a></li>
            <li><a href={buildHref('ウッドデッキ')} className="subcategory text-white" data-page="ウッドデッキ">ウッドデッキ</a></li>
            <li><a href={buildHref('駐輪場')} className="subcategory text-white" data-page="駐輪場">駐輪場</a></li>
            <li><a href={buildHref('ゴミストッカー')} className="subcategory text-white" data-page="ゴミストッカー">ゴミストッカー</a></li>
            <li><a href={buildHref('エクステリア緑化')} className="subcategory text-white" data-page="エクステリア緑化">緑化</a></li>
            <li><a href={buildHref('エクステリアその他')} className="subcategory text-white" data-page="エクステリアその他">その他</a></li>
          </ul>
        </div>

      </div>
    </aside>
  );
};

export default Sidebar;
