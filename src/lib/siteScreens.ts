/**
 * 画面台帳。URL を持つ画面（上部ナビの情報ページ・建材 16 分類）の唯一の定義。
 *
 * ここから作っているもの:
 *   - 上部ナビ（Navigation.tsx）の並びと遷移先
 *   - MainLayout の URL → 中央カラム画面の対応
 *   - パンくず（Breadcrumbs.tsx）の見出し
 *   - sitemap.ts の情報ページ・建材ページ
 *
 * 画面を足すときはここに 1 行足し、src/app/<id>/ にページを置く。
 * id はそのまま URL（/<id>）になる。公開済みの id は変えない（外部リンク・検索結果が切れる）。
 */

export type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

export type ScreenGroup = 'info' | 'material';

export interface RoutedScreen {
  /** 画面 ID。URL は `/${id}` */
  id: string;
  /** 上部ナビ・パンくずに出す名前 */
  label: string;
  group: ScreenGroup;
  /** 上部の緑バーに並べるか */
  topNav: boolean;
  /** fresh: 中身が頻繁に変わる。sitemap の lastModified をビルド日にする */
  sitemap: { changeFrequency: ChangeFreq; priority: number; fresh?: boolean };
}

const info = (
  id: string,
  label: string,
  changeFrequency: ChangeFreq,
  priority: number,
  fresh = false,
): RoutedScreen => ({ id, label, group: 'info', topNav: true, sitemap: { changeFrequency, priority, fresh } });

const material = (id: string, label: string, priority = 0.5): RoutedScreen => ({
  id,
  label,
  group: 'material',
  topNav: false,
  sitemap: { changeFrequency: 'monthly', priority },
});

/** 並び順 = 上部ナビの並び順 */
export const ROUTED_SCREENS: readonly RoutedScreen[] = [
  info('event', 'イベント情報', 'daily', 0.8, true),
  info('news', 'NEWS', 'daily', 0.9, true),
  info('new-products', '新製品', 'daily', 0.8, true),
  info('books-software', '書籍・ソフト', 'weekly', 0.6),
  info('pickup', 'Pickup', 'weekly', 0.7, true),
  info('regulations', '法規', 'monthly', 0.8),
  info('qualifications', '資格試験', 'monthly', 0.7),
  info('landscape-cad', '添景・CAD', 'monthly', 0.6),
  info('shop', 'Shop', 'weekly', 0.6),
  info('projects', 'プロジェクト', 'weekly', 0.6),
  info('competitions', 'コンペ', 'monthly', 0.5),
  info('construction-companies', '施工会社', 'monthly', 0.5),
  info('design-offices', '設計事務所', 'monthly', 0.5),
  info('job-info', '求人情報', 'weekly', 0.7, true),
  info('forum', '掲示板', 'daily', 0.7, true),

  material('roof', '屋根材', 0.6),
  material('exterior-wall', '外壁材', 0.6),
  material('opening', '開口部', 0.6),
  material('external-floor', '外部床材'),
  material('exterior-other', '外部その他'),
  material('internal-floor', '内部床材'),
  material('internal-wall', '内装壁材'),
  material('internal-ceiling', '内装天井材'),
  material('internal-other', '内装その他'),
  material('waterproof', '防水材'),
  material('hardware', '金物'),
  material('furniture', 'ファニチャー'),
  material('electrical-systems', '電気設備'),
  material('mechanical-systems', '機械設備'),
  material('exterior-infrastructure', '外構'),
  material('exterior', 'エクステリア'),
];

export const screenPath = (id: string) => `/${id}`;

/** URL パス（末尾スラッシュ無し）→ 画面 ID */
export const PATH_TO_SCREEN: Readonly<Record<string, string>> = Object.fromEntries(
  ROUTED_SCREENS.map((s) => [screenPath(s.id), s.id]),
);

/** 画面 ID → URL パス */
export const SCREEN_TO_PATH: Readonly<Record<string, string>> = Object.fromEntries(
  ROUTED_SCREENS.map((s) => [s.id, screenPath(s.id)]),
);

/** 画面 ID → 表示名 */
export const SCREEN_LABEL: Readonly<Record<string, string>> = Object.fromEntries(
  ROUTED_SCREENS.map((s) => [s.id, s.label]),
);

export const TOP_NAV_SCREENS = ROUTED_SCREENS.filter((s) => s.topNav);

export const screensInGroup = (group: ScreenGroup) => ROUTED_SCREENS.filter((s) => s.group === group);

const pathMapOf = (group: ScreenGroup): Readonly<Record<string, string>> =>
  Object.fromEntries(screensInGroup(group).map((s) => [s.id, screenPath(s.id)]));

/** 情報ページ（上部ナビ）の画面 ID → URL パス */
export const INFO_SCREEN_TO_PATH = pathMapOf('info');

/** 建材 16 分類の画面 ID → URL パス */
export const MATERIAL_SCREEN_TO_PATH = pathMapOf('material');
