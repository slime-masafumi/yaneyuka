'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FiChevronLeft, FiSearch } from 'react-icons/fi';
import { ROUTED_SCREENS, screenPath } from '@/lib/siteScreens';
import { subcategoryLabel } from '@/lib/materialCategories';
import { GENERAL_TOOL_MENU, onGeneralTool, requestGeneralTool, type GeneralToolId } from '@/lib/generalToolsMenu';
import { DESIGN_TOOL_MENU } from '@/lib/designToolsMenu';
import { onDesignToolsTarget, requestDesignToolsTarget } from '@/lib/designToolsNav';
import { parseUserpageQuery, type UserpageTarget } from '@/lib/userpageUrl';
import type { SearchEntry } from '@/lib/siteIndex';
import { INDEX_MENUS } from '@/lib/railMenu';

/**
 * 上部の濃い緑の帯(lg 以上)。左から 戻る / パンくず / 検索。
 * 以前ここに並べていた情報ページ 15 本は左カラムの Ⅰ「情報」へ移した(2026-11-13)。
 * lg 未満は左カラムが出ないので、Navigation.tsx が従来の横並びを出し続ける。
 *
 * useSearchParams を使うので、必ず AfterMount の中に置く(サーバーで呼ぶと本文が配信 HTML から消える)。
 */

/** href = URL で開く / menu = 左カラムの画面として開く（ツール一覧など） */
type Crumb = { label: string; href?: string; menu?: string };

const SCREEN = Object.fromEntries(ROUTED_SCREENS.map((s) => [s.id, s]));
const GENERAL_LABEL = Object.fromEntries(GENERAL_TOOL_MENU.map((t) => [t.id, t.label])) as Record<string, string>;

/** 左カラムの Ⅲ にある、一般ツールの中のタブではない画面 */
const TOOL_SCREENS: Record<string, [string, string]> = {
  [INDEX_MENUS.general]: ['', '一般ツール'],
  [INDEX_MENUS.design]: ['', '設計ツール'],
  [INDEX_MENUS.external]: ['', '外部ツール'],
  'my-calendar': ['一般ツール', 'Myカレンダー'],
  'my-tasks': ['一般ツール', 'Myタスク'],
  'team-tasks': ['一般ツール', 'Teamタスク'],
  'my-regulations': ['一般ツール', 'My法規'],
  yymail: ['一般ツール', 'yymail'],
  yychat: ['一般ツール', 'yychat'],
  contacts: ['一般ツール', '担当連絡先'],
  'design-info': ['', '設計情報'],
  'material-info': ['', '材料情報'],
};

/** 左カラムにも上部にも無い画面(会員・問い合わせなど) */
const OTHER_SCREENS: Record<string, string> = {
  'privacy-policy': 'プライバシーポリシー',
  feedback: 'お問い合わせ',
  registration: '掲載希望',
  register: '無料会員登録',
  login: 'ログイン',
  welcome: 'ようこそ',
  settings: 'ユーザー設定',
  chatbot: '建材Chatbot',
  makerconect: 'Maker conect',
  'userpage-top': 'マイページ',
  'public-works': '公共工事',
};

/** /lookup・/calc・/karte はパスの区切りごとに名前を引く */
const PATH_LABEL: Record<string, string> = {
  lookup: '建築の調べもの',
  design: '意匠・法規',
  structure: '構造',
  mep: '設備',
  electrical: '電気・通信',
  calc: '計算ツール',
  'glass-thickness': '必要ガラス厚の計算',
  karte: '物件カルテ',
};

function buildCrumbs(
  pathname: string,
  active: string | undefined,
  search: URLSearchParams,
  tool: string | null,
  design: { c?: string; s?: string },
): Crumb[] {
  const home: Crumb = { label: 'ホーム', href: '/' };
  const path = pathname.replace(/\/$/, '') || '/';
  const first = path.split('/')[1] ?? '';

  if (first && PATH_LABEL[first]) {
    let acc = '';
    const rest = path
      .split('/')
      .filter(Boolean)
      .map((seg) => {
        acc += `/${seg}`;
        return { label: PATH_LABEL[seg] ?? seg, href: `${acc}/` };
      });
    return [home, ...rest];
  }

  const screen = active ? SCREEN[active] : undefined;
  if (screen?.group === 'info') return [home, { label: screen.label }];
  if (screen?.group === 'material') {
    const sub = search.get('subcategory');
    return [
      home,
      { label: '建材' },
      { label: screen.label, href: sub ? `${screenPath(screen.id)}/` : undefined },
      ...(sub ? [{ label: subcategoryLabel(sub) }] : []),
    ];
  }
  if (active === 'general-tools') return [home, { label: '一般ツール', menu: INDEX_MENUS.general }, { label: (tool && GENERAL_LABEL[tool]) || '一般ツール' }];
  if (active === 'design-tools') {
    const cat = DESIGN_TOOL_MENU.find((c) => c.id === design.c) ?? DESIGN_TOOL_MENU[0];
    const sub = cat.subTabs.find((t) => t.id === design.s) ?? cat.subTabs[0];
    return [home, { label: '設計ツール', menu: INDEX_MENUS.design }, { label: cat.label }, { label: sub?.label ?? '' }];
  }
  if (active && TOOL_SCREENS[active]) {
    const [group, label] = TOOL_SCREENS[active];
    if (!group) return [home, { label }];
    return [home, { label: group, menu: group === '一般ツール' ? INDEX_MENUS.general : undefined }, { label }];
  }
  if (active && OTHER_SCREENS[active]) return [home, { label: OTHER_SCREENS[active] }];
  return [{ label: 'ホーム' }];
}

export default function TopBar({
  activeItem,
  onMenuClick,
}: {
  activeItem?: string;
  onMenuClick?: (menu: string, target?: UserpageTarget) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const [tool, setTool] = useState<string | null>(null);
  const [design, setDesign] = useState<{ c?: string; s?: string }>({});

  // 開いているツールの名前。左カラムから開くと URL より先にイベントが来る
  useEffect(() => onGeneralTool(({ toolId }) => setTool(toolId)), []);
  useEffect(() => onDesignToolsTarget(({ categoryId, subTabId }) => setDesign({ c: categoryId, s: subTabId })), []);
  useEffect(() => {
    const t = parseUserpageQuery(params.toString() ? `?${params.toString()}` : '');
    if (!t) return;
    if (t.tool) setTool(t.tool);
    if (t.category) setDesign({ c: t.category, s: t.sub });
  }, [params]);

  const crumbs = useMemo(() => buildCrumbs(pathname, activeItem, params, tool, design), [pathname, activeItem, params, tool, design]);
  const atHome = crumbs.length === 1;

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/');
  };

  const open = (e: SearchEntry) => {
    if (e.href) {
      router.push(e.href);
      return;
    }
    const t = e.target;
    if (!t) return;
    if (t.tool) requestGeneralTool({ toolId: t.tool as GeneralToolId });
    if (t.category) requestDesignToolsTarget({ categoryId: t.category, subTabId: t.sub });
    onMenuClick?.(t.menu, t);
  };

  return (
    <div className="yy-topbar__inner">
      {!atHome && (
        <button type="button" className="yy-topbar__back" onClick={goBack} title="前の画面に戻る">
          <FiChevronLeft aria-hidden="true" />
          戻る
        </button>
      )}
      <ol className="yy-crumbs" aria-label="現在地">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={`${i}-${c.label}`} aria-current={last ? 'page' : undefined}>
              {c.href && !last ? (
                <Link href={c.href}>{c.label}</Link>
              ) : c.menu && !last ? (
                <button type="button" onClick={() => onMenuClick?.(c.menu!, { menu: c.menu! })}>{c.label}</button>
              ) : (
                <span>{c.label}</span>
              )}
            </li>
          );
        })}
      </ol>
      <SiteSearch onOpen={open} />
    </div>
  );
}

const GROUP_ORDER: SearchEntry['group'][] = ['情報', '建材', '一般ツール', '設計ツール', '調べもの'];

function SiteSearch({ onOpen }: { onOpen: (e: SearchEntry) => void }) {
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<SearchEntry[]>([]);
  const [cursor, setCursor] = useState(0);
  const engine = useRef<typeof import('@/lib/siteIndex') | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // 索引(調べもの 2,016 項目を含む)は、検索窓に触れたときに初めて読む
  const load = async () => {
    if (!engine.current) engine.current = await import('@/lib/siteIndex');
    return engine.current;
  };

  useEffect(() => {
    let alive = true;
    if (!q.trim()) {
      setResults([]);
      return;
    }
    load().then((m) => {
      if (!alive) return;
      const hits = m.searchSite(q, 14);
      // 見出しごとにまとめて出す(順位は見出しの中で保つ)
      hits.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
      setResults(hits);
      setCursor(0);
    });
    return () => {
      alive = false;
    };
  }, [q]);

  // 「/」で検索窓へ。入力中の欄があるときは奪わない
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!focused) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [focused]);

  const choose = (e: SearchEntry) => {
    setQ('');
    setFocused(false);
    inputRef.current?.blur();
    onOpen(e);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter' && results[cursor]) {
      e.preventDefault();
      choose(results[cursor]);
    } else if (e.key === 'Escape') {
      setFocused(false);
      inputRef.current?.blur();
    }
  };

  const showPanel = focused && q.trim() !== '';

  return (
    <div className="yy-search" ref={boxRef}>
      <FiSearch className="yy-search__icon" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        value={q}
        placeholder="建材・ツール・法規を検索"
        aria-label="サイト内を検索"
        autoComplete="off"
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => {
          setFocused(true);
          void load();
        }}
        onKeyDown={onKeyDown}
      />
      <kbd className="yy-search__key">/</kbd>
      {showPanel && (
        <div className="yy-search__panel" role="listbox">
          {results.length === 0 ? (
            <p className="yy-search__empty">「{q}」に当たるものはありません</p>
          ) : (
            results.map((r, i) => (
              <React.Fragment key={`${r.group}-${r.label}-${r.sub}-${i}`}>
                {(i === 0 || results[i - 1].group !== r.group) && <div className="yy-search__group">{r.group}</div>}
                <button
                  type="button"
                  role="option"
                  aria-selected={i === cursor}
                  className="yy-search__row"
                  onMouseEnter={() => setCursor(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(r)}
                >
                  <span className="yy-search__label">{r.label}</span>
                  <span className="yy-search__sub">{r.sub}</span>
                </button>
              </React.Fragment>
            ))
          )}
        </div>
      )}
    </div>
  );
}
