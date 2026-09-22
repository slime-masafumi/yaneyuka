/**
 * 左カラムで開いた画面を URL に載せるための決まりごと。
 *
 * これまで左カラムの選択は MainLayout の state にしか無く、URL は `/` のまま
 * だった。そのため「この画面を人に送る」「ブラウザの戻るで前の画面に帰る」
 * 「再読み込みしても同じ画面が出る」がどれも成立していなかった。
 *
 * 公開済みページの URL は動かせない（App Store Connect に登録済みのものが
 * ある）ので、パスには触れずクエリだけで表す。`/` に ?m= が付くだけなので
 * 既存のルートには影響しない。
 *
 * 併せて、左カラムから開く画面の一覧をここに集約する。MainLayout の中に
 * 同じ配列が2箇所あって、片方だけ直すと挙動がずれていた。
 */

/** 左カラム（Ⅰ〜Ⅴ）から開く画面。URL に載せてよいものだけを並べる。 */
export const USERPAGE_MENUS = [
  'my-calendar',
  'my-regulations',
  'my-tasks',
  'team-tasks',
  'pdf-diff',
  'general-tools',
  'design-tools',
  'design-info',
  'material-info',
  'contacts',
  'settings',
  'yychat',
  'yymail',
  'userpage-top',
] as const;

export type UserpageMenu = (typeof USERPAGE_MENUS)[number];

/**
 * 左カラム Ⅲ（一般ツール）から開く画面だけ。
 *
 * 見た目を揃える共通スタイル（globals.css の .yy-tool）はここに挙げた画面に
 * だけ当てる。Ⅱ 設計情報・Ⅳ 設計ツール・Ⅴ 外部ツールは作りも用途も違うので
 * 巻き込まない。
 */
export const GENERAL_TOOL_SCREENS: readonly string[] = [
  'yymail',
  'yychat',
  'general-tools',
  'contacts',
  'my-calendar',
  'my-tasks',
  'team-tasks',
  'my-regulations',
];

export const isGeneralToolScreen = (menu: string) => GENERAL_TOOL_SCREENS.includes(menu);

export const isUserpageMenu = (menu: string): menu is UserpageMenu =>
  (USERPAGE_MENUS as readonly string[]).includes(menu);

export type UserpageTarget = {
  menu: string;
  /** 一般ツールの中のどれか（memo / calc など）。 */
  tool?: string;
  /** 設計ツールの大分類。 */
  category?: string;
  /** 設計ツールの小分類。 */
  sub?: string;
};

const PARAM = { menu: 'm', tool: 't', category: 'c', sub: 's' } as const;

/**
 * 表示中の画面を表すクエリ文字列を作る。`?` から始まる。
 * 対象外の画面なら空文字を返す（＝ URL からクエリを落とす）。
 */
export const buildUserpageQuery = (target: UserpageTarget): string => {
  if (!isUserpageMenu(target.menu)) return '';

  const params = new URLSearchParams();
  params.set(PARAM.menu, target.menu);
  if (target.tool) params.set(PARAM.tool, target.tool);
  if (target.category) params.set(PARAM.category, target.category);
  if (target.sub) params.set(PARAM.sub, target.sub);

  return `?${params.toString()}`;
};

/**
 * URL のクエリから表示すべき画面を読み取る。
 * `useSearchParams` は使わない。あれを呼ぶとページ全体がクライアント描画に
 * 落ちて、配信される HTML から本文が消える（このサイトで実際に起きている）。
 * 呼び出し側が effect の中で window.location.search を渡すこと。
 */
export const parseUserpageQuery = (search: string): UserpageTarget | null => {
  if (!search) return null;

  const params = new URLSearchParams(search);
  const menu = params.get(PARAM.menu);
  if (!menu || !isUserpageMenu(menu)) return null;

  return {
    menu,
    tool: params.get(PARAM.tool) || undefined,
    category: params.get(PARAM.category) || undefined,
    sub: params.get(PARAM.sub) || undefined,
  };
};
