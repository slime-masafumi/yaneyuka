'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { requestDesignToolsTarget, onDesignToolsTarget } from '@/lib/designToolsNav';
import { parseUserpageQuery, type UserpageTarget } from '@/lib/userpageUrl';
import { DESIGN_TOOL_MENU } from '@/lib/designToolsMenu';
import { requestGeneralTool, onGeneralTool, type GeneralToolId } from '@/lib/generalToolsMenu';
import { useAuth } from '@/lib/AuthContext';

interface SidebarProps {
  onItemClick?: () => void;
  onPageChange?: (page: string) => void;
  onLogoClick?: () => void;
  /** 左カラム下部の Ⅰ〜Ⅴ から Userpage 系メニューを開く。MainLayout の handleMenuClick。 */
  onMenuClick?: (menuItem: string, target?: UserpageTarget) => void;
  /** いま中央に出ている画面。選択中の項目を緑にするために使う。 */
  activeContent?: string;
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

type RailItem = {
  label: string;
  /** handleMenuClick に渡す ID。http で始まる場合は外部リンク。 */
  menu: string;
  /** アイコン画像のパス。Ⅴ 外部ツールだけが持つ。 */
  icon?: string;
  /** 一般ツールの中の特定タブを直接開く場合に指定する。 */
  tool?: GeneralToolId;
  /** Web 版を開く項目に iOS 版もあるとき、その App Store の URL。行の右端に出す。 */
  store?: string;
};

const appStore = (id: number) => `https://apps.apple.com/jp/app/id${id}`;
type RailMode = {
  label: string;
  bg: string;
  ac: string;
  items: RailItem[];
  /** 2階層で出すもの（設計ツール）。建材検索と同じアコーディオンで描く。 */
  tree?: typeof DESIGN_TOOL_MENU;
};

const ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'];

/**
 * 左カラムの5モード。Ⅰ は従来どおり建材検索ツリー（下の JSX をそのまま使う）。
 * Ⅱ〜Ⅴ は削除した UserpageBottomBar の項目をそのまま引き取ったもの。
 * bg = 左カラムの地色 / ac = 見出し下線と開いたアコーディオンの色。
 */
const RAIL_MODES: RailMode[] = [
  { label: '建材検索', bg: '#000000', ac: '#52AA96', items: [] },
  {
    label: '設計情報', bg: '#0e2635', ac: '#5a9fd4',
    items: [
      { label: '設計情報', menu: 'design-info' },
      { label: '材料情報', menu: 'material-info' },
    ],
  },
  {
    label: '一般ツール', bg: '#241c33', ac: '#9b87d4',
    // 20本を「連絡 → 予定・タスク → 記録と作成 → 調べる → ファイル」の順に並べる。
    // 見出しは付けない（畳まずに収まるので、並び順だけで関連が伝わればよい）。
    // tool を持つ項目は一般ツールの中のタブを直接開く。
    items: [
      // 連絡
      { label: 'yymail', menu: 'yymail' },
      { label: 'yychat', menu: 'yychat' },
      { label: 'OLMT', menu: 'general-tools', tool: 'olmt' },
      { label: '担当連絡先', menu: 'contacts' },
      // 予定・タスク
      { label: 'Myカレンダー', menu: 'my-calendar' },
      { label: 'Myタスク', menu: 'my-tasks' },
      { label: 'Teamタスク', menu: 'team-tasks' },
      { label: 'スケ調', menu: 'general-tools', tool: 'schedule' },
      // 記録・作成
      { label: 'メモ', menu: 'general-tools', tool: 'memo' },
      { label: '表計算', menu: 'general-tools', tool: 'sheet' },
      { label: '業務管理・アラーム', menu: 'general-tools', tool: 'alarm' },
      // 調べる
      { label: 'My法規', menu: 'my-regulations' },
      { label: '単位変換', menu: 'general-tools', tool: 'unit-converter' },
      { label: '関数電卓', menu: 'general-tools', tool: 'calc' },
      { label: '地図', menu: 'general-tools', tool: 'map' },
      { label: 'ブックマーク', menu: 'general-tools', tool: 'bookmark' },
      // ファイル
      { label: '画像変換', menu: 'general-tools', tool: 'image-converter' },
      { label: '工事写真', menu: 'general-tools', tool: 'construction-photos' },
      { label: 'PDF圧縮', menu: 'general-tools', tool: 'pdf-compressor' },
      { label: '図面PDF', menu: 'general-tools', tool: 'drawing-pdf' },
      { label: '一時ファイル', menu: 'general-tools', tool: 'temp-storage' },
      { label: 'ファイル転送', menu: 'general-tools', tool: 'file-transfer' },
    ],
  },
  {
    label: '設計ツール', bg: '#2b2113', ac: '#c79a5a',
    items: [],
    // 分野7 ＞ ツール37。中央のタブ行は lg 以上では畳んであるので、ここが本体。
    tree: DESIGN_TOOL_MENU,
  },
  {
    label: '外部ツール', bg: '#33141c', ac: '#d47b8c',
    // 自作アプリの入口。どれも新しいタブで開く。
    //   Web 版があるもの → Web 版（DayLine / Rules / PDFGap）。iOS 版もあれば右端に App Store を添える
    //   iOS だけのもの   → App Store
    // 建築系を先に、その他を後に並べる。
    // 一覧は App Store の開発者ページ（artistId 1866103675）から起こした。
    // アイコンは public/image/apps/ に App Store の 72px を置いてある。
    items: [
      // 建築
      { label: '建築基準法 yaneyuka', menu: appStore(6757323409), icon: '/image/apps/kenchikukijun.png' },
      { label: '消防法規 yaneyuka', menu: appStore(6762936797), icon: '/image/apps/shoubouhou.png' },
      { label: 'PDFGap', menu: 'https://pdfgap-yaneyuka.web.app/', icon: '/image/PDFGap-icon.svg' },
      { label: 'Rules', menu: 'https://rules-yaneyuka.web.app/', icon: '/image/apps/rules.png', store: appStore(6759982040) },
      { label: 'DayLine', menu: 'https://dayline-yaneyuka.web.app/', icon: '/image/apps/dayline.png', store: appStore(6760655431) },
      // その他
      { label: 'Noteleaf', menu: appStore(6775574147), icon: '/image/apps/noteleaf.png' },
      { label: 'Epoch Camera', menu: appStore(6761734348), icon: '/image/apps/epochcamera.png' },
      { label: 'Trailmark', menu: appStore(6774257425), icon: '/image/apps/trailmark.png' },
      { label: 'Weatherchime', menu: appStore(6774901663), icon: '/image/apps/weatherchime.png' },
      { label: 'NewsFilter', menu: appStore(6760270206), icon: '/image/apps/newsfilter.png' },
      { label: 'World Folkbook', menu: appStore(6766574221), icon: '/image/apps/worldfolkbook.png' },
      { label: 'FX Signal', menu: appStore(6767257165), icon: '/image/apps/fxsignal.png' },
      { label: 'CFD Signal', menu: appStore(6769496079), icon: '/image/apps/cfdsignal.png' },
    ],
  },
];

/** Ⅴ 外部ツールのアプリアイコン。icon が無い項目では何も描かない。 */
const RailIcon: React.FC<{ src?: string }> = ({ src }) =>
  src ? (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      width={18}
      height={18}
      className="w-[18px] h-[18px] rounded-[4px] shrink-0"
      loading="lazy"
    />
  ) : null;

const Sidebar: React.FC<SidebarProps> = ({ onItemClick, onPageChange, onLogoClick, onMenuClick, activeContent }) => {
  const [mode, setMode] = useState(0);
  // 一般ツール・設計ツールは activeContent だけでは中のどれを開いたか分からないので、
  // 左カラムから開いたものを覚えておく（lg 以上では中央のタブを畳んであるので、これで一致する）。
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [activeDesignTool, setActiveDesignTool] = useState<string | null>(null);

  // URL で直接ツールを開かれたときは、左カラムもその段（Ⅰ〜Ⅴ）に合わせる。
  // 押して切り替えた場合はこの効果より前に mode が変わっているので、結果は同じ。
  useEffect(() => {
    if (!activeContent) return;
    // 設計ツールは items ではなく tree で持っているので、そちらも見る。
    const found = RAIL_MODES.findIndex(
      (m) => m.items.some((i) => i.menu === activeContent) || (m.tree && activeContent === 'design-tools')
    );
    if (found >= 0) setMode(found);
  }, [activeContent]);

  // 開いているツールの印。切り替えは MainLayout が投げるイベントで拾う。
  useEffect(() => onGeneralTool(({ toolId }) => setActiveTool(toolId)), []);
  useEffect(() => onDesignToolsTarget(({ subTabId }) => setActiveDesignTool(subTabId ?? null)), []);

  // 初回だけはイベントに間に合わない。MainLayout の復元は親の effect なので、
  // ここが購読し終わる前に投げ終わっている。URL から直接読んで印を合わせる。
  useEffect(() => {
    const target = parseUserpageQuery(window.location.search);
    if (!target) return;
    if (target.tool) setActiveTool(target.tool);
    if (target.sub) setActiveDesignTool(target.sub);
  }, []);

  /** 選択中の項目に付ける文字色。ナビバーと同じ緑。 */
  const ACTIVE = 'text-[#52AA96]';
  const isItemActive = (item: RailItem) =>
    item.tool
      ? activeContent === 'general-tools' && activeTool === item.tool
      : activeContent === item.menu;
  const railMode = RAIL_MODES[mode];
  const { isLoggedIn, currentUser, logout } = useAuth();
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
  }, [onItemClick, onPageChange, mode]);

  return (
    <aside
      className="w-full md:w-[200px] lg:w-[180px] shrink-0 text-[14px] left-column"
      style={{ ['--rail-bg' as string]: railMode.bg, ['--rail-ac' as string]: railMode.ac } as React.CSSProperties}
    >
      <div className="left-column__scroll">
      {/* ロゴ */}
      <div className="px-3 hidden lg:block" style={{ paddingTop: '28px' }}>
        <Link href="/" className="block" onClick={() => onLogoClick?.()}>
          <img
            // 透過版。元の yaneyukaロゴ4.png は黒地が焼き込まれた RGB PNG で、
            // Ⅱ〜Ⅴ の色付き背景だと黒い箱になる。1枚で全モードに対応させる。
            src="/image/yaneyuka-logo-white.png"
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
      <h3 className="font-semibold mb-0 text-white hidden lg:block text-[12px] 2xl:text-[13px]">
        {ROMAN[mode]}　{railMode.label}
      </h3>
      <div className="category-scroll-container"></div>

      {/* Ⅱ〜Ⅴ：旧フッターバーから引き取ったメニュー */}
      {mode !== 0 && (
        <div className="space-y-0 pb-2">
          {railMode.items.map((item) =>
            item.menu.startsWith('http') ? (
              <div key={item.label} className="flex items-center pr-3">
                <a
                  href={item.menu}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={item.label}
                  className="subcategory flex items-center gap-2 flex-1 min-w-0 text-left px-4 py-1 text-[12px] 2xl:text-[13px] hover:text-white text-gray-300"
                >
                  <RailIcon src={item.icon} />
                  <span className="truncate">{item.label}</span>
                </a>
                {item.store && (
                  <a
                    href={item.store}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${item.label}（iOS 版）を App Store で開く`}
                    className="shrink-0 text-[10px] leading-none px-1 py-0.5 border border-gray-500 text-gray-400 hover:text-white hover:border-white"
                  >
                    iOS
                  </a>
                )}
              </div>
            ) : (
              <button
                key={item.label}
                type="button"
                className={`subcategory flex items-center gap-2 w-full text-left px-4 py-1 text-[12px] 2xl:text-[13px] hover:text-white ${
                  isItemActive(item) ? ACTIVE : 'text-gray-300'
                }`}
                onClick={() => {
                  if (item.tool) requestGeneralTool({ toolId: item.tool });
                  setActiveTool(item.tool ?? null);
                  onMenuClick?.(item.menu, { menu: item.menu, tool: item.tool });
                  onItemClick?.();
                }}
              >
                <RailIcon src={item.icon} />
                {item.label}
              </button>
            )
          )}

          {/* Ⅳ 設計ツール：分野7 ＞ ツール37。建材検索とまったく同じアコーディオン。 */}
          {railMode.tree?.map((category) => (
            <div key={category.id}>
              <button
                type="button"
                className="w-full text-left px-4 py-2 cursor-pointer accordion-toggle text-[12px] 2xl:text-[13px] text-gray-300"
              >
                {category.label}
              </button>
              <ul className="accordion-content ml-4 text-[12px] space-y-1">
                {category.subTabs.map((sub) => (
                  <li key={sub.id}>
                    <button
                      type="button"
                      className={`rail-tool ${
                        activeContent === 'design-tools' && activeDesignTool === sub.id
                          ? ACTIVE
                          : 'text-white'
                      }`}
                      onClick={() => {
                        requestDesignToolsTarget({ categoryId: category.id, subTabId: sub.id });
                        setActiveDesignTool(sub.id);
                        onMenuClick?.('design-tools', { menu: 'design-tools', category: category.id, sub: sub.id });
                        onItemClick?.();
                      }}
                    >
                      {sub.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Ⅰ：建材検索ツリー。DOM には常に残す（リンクを消さないため） */}
      <div className="space-y-0" style={mode === 0 ? undefined : { display: 'none' }}>
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
      </div>{/* left-column__scroll */}

      {/* フッター：Ⅰ〜Ⅴ ＋ アカウント行。lg 以上では viewport に固定される */}
      <div className="left-column__foot">
      {/* 切替ボタン：〇の中は常に白、Ⅰ〜Ⅴ は常に黒。バーの地色は左カラムに追従 */}
      <div className="left-column__switch">
        {RAIL_MODES.map((m, index) => (
          <button
            key={m.label}
            type="button"
            title={m.label}
            aria-label={`${ROMAN[index]} ${m.label}`}
            aria-current={index === mode}
            onClick={() => setMode(index)}
          >
            {ROMAN[index]}
          </button>
        ))}
      </div>

      {/* アカウント行：旧フッターバー左端にあった項目 */}
      <div className="left-column__account">
        {isLoggedIn ? (
          <>
            <span className="left-column__user">ようこそ、{currentUser?.username}さん</span>
            <div className="left-column__authrow">
              <button type="button" onClick={() => { onMenuClick?.('settings'); onItemClick?.(); }}>
                ユーザー設定
              </button>
              <button type="button" onClick={() => { void logout(); }}>ログアウト</button>
            </div>
          </>
        ) : (
          <div className="left-column__authrow">
            <button type="button" onClick={() => { onMenuClick?.('register'); onItemClick?.(); }}>
              無料会員登録
            </button>
            <button type="button" onClick={() => { onMenuClick?.('login'); onItemClick?.(); }}>
              ログイン
            </button>
          </div>
        )}
        <button
          type="button"
          className="left-column__legal"
          onClick={() => { onMenuClick?.('privacy-policy'); onItemClick?.(); }}
        >
          プライバシーポリシー
        </button>
      </div>
      </div>{/* left-column__foot */}
    </aside>
  );
};

export default Sidebar;
