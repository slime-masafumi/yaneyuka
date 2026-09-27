/**
 * iOS アプリ法務ページの唯一の定義。
 *
 * 以前はこの一覧が 3 箇所に重複していて（右カラムのリンク一覧・その表示判定の
 * 正規表現・sitemap）、新規アプリ追加時に 1 箇所でも忘れると
 * 「リンクが出ない」「検索に載らない」が静かに起きていた。
 *
 * **新しいアプリを追加するときは、下の LEGAL_APPS に 1 行足すだけでよい。**
 * 参照側（RelatedPrivacyLinks.tsx / MainLayout.tsx / app/sitemap.ts）は
 * すべてここから導出される。
 */

export type LegalApp = {
  /** 右カラムのリンクに表示する名前 */
  label: string;
  /** プライバシーポリシーのパス（全アプリ必須） */
  privacy: string;
  /** 独自の利用規約。Apple 標準 EULA を使うアプリは持たない */
  terms?: string;
  /** アプリ固有のサポートページ。共通の /support/ を使うアプリは持たない */
  support?: string;
};

/** 全アプリ共通のサポートページ */
export const SHARED_SUPPORT_PATH = '/support/';

export const LEGAL_APPS: LegalApp[] = [
  { label: 'Rules', privacy: '/rules-app-privacy-policy/' },
  { label: 'DayLine', privacy: '/dayline-app-privacy-policy/' },
  { label: '建築基準法yaneyuka', privacy: '/kijyunhou-app-privacy-policy/' },
  { label: '消防法アプリ', privacy: '/shoubouhou-app-privacy-policy/' },
  { label: 'Epoch Camera', privacy: '/epoch-camera-privacy-policy/', terms: '/epoch-camera-terms/' },
  { label: 'FX Signal', privacy: '/fx-signal-privacy-policy/', terms: '/fx-signal-terms/', support: '/fx-signal-support/' },
  { label: 'CFD Signal', privacy: '/cfd-signal-privacy-policy/', terms: '/cfd-signal-terms/', support: '/cfd-signal-support/' },
  { label: 'World Folkbook', privacy: '/world-folkbook-privacy-policy/', terms: '/world-folkbook-terms/', support: '/world-folkbook-support/' },
  { label: 'News Filter', privacy: '/news-filter-privacy-policy/', terms: '/news-filter-terms/' },
  { label: 'PasLog', privacy: '/paslog-privacy-policy/' },
  { label: 'Trailmark', privacy: '/trailmark-privacy-policy/' },
  { label: 'Noteleaf', privacy: '/noteleaf-app-privacy-policy/' },
  { label: 'Weatherchime', privacy: '/weatherchime-privacy-policy/' },
  { label: 'Accoria', privacy: '/accoria-privacy-policy/' },
  // 計測ボックス。計測値の免責が必要なため独自の利用規約を持つ
  // （サポートは全アプリ共通の /support/ を使うので support は持たせない）
  { label: '計測ボックス', privacy: '/measurebox-privacy-policy/', terms: '/measurebox-terms/' },
  { label: '情報分解地図', privacy: '/app-map-privacy-policy/' },
];

/** 末尾スラッシュを外して比較用に揃える（next.config.js の trailingSlash 対策） */
export function normalizePath(path: string): string {
  return path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
}

/** sitemap に載せる法務系ページの全パス（共通サポートを含む） */
export function allLegalPaths(): string[] {
  const paths = [SHARED_SUPPORT_PATH];
  for (const app of LEGAL_APPS) {
    paths.push(app.privacy);
    if (app.terms) paths.push(app.terms);
    if (app.support) paths.push(app.support);
  }
  return paths;
}

/**
 * 右カラムに「関連プライバシーポリシー」一覧を出すページかどうか。
 * 現状はプライバシーポリシーのページのみが対象（利用規約・サポートページでは出さない）。
 */
export function isPrivacyPolicyPath(pathname: string): boolean {
  const current = normalizePath(pathname);
  return LEGAL_APPS.some((app) => normalizePath(app.privacy) === current);
}
