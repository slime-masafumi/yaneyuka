import Link from 'next/link';

type LegalApp = {
  href: string;
  label: string;
  isYaneyukaMain?: boolean; // yaneyuka.com本体のプラポリはSPA遷移
};

// プライバシーポリシーの一覧。新アプリ追加時はここに追加。
const LEGAL_APPS: LegalApp[] = [
  { href: '/', label: 'yaneyuka.com', isYaneyukaMain: true },
  { href: '/rules-app-privacy-policy/', label: 'Rules' },
  { href: '/dayline-app-privacy-policy/', label: 'DayLine' },
  { href: '/kijyunhou-app-privacy-policy/', label: '建築基準法yaneyuka' },
  { href: '/shoubouhou-app-privacy-policy/', label: '消防法アプリ' },
  { href: '/epoch-camera-privacy-policy/', label: 'Epoch Camera' },
];

interface RelatedPrivacyLinksProps {
  currentPath: string;
  /** activeContentが'privacy-policy'(yaneyuka本体プラポリ表示中)かどうか */
  isYaneyukaPrivacyActive?: boolean;
  /** yaneyuka.comクリック時のSPA遷移ハンドラ。無ければ通常Link遷移 */
  onYaneyukaPrivacyClick?: () => void;
}

/**
 * 右カラム用のプライバシーポリシー間リンク一覧コンポーネント。
 * 現在のページはリンクを無効化＆強調表示する。
 * 黒背景・白文字。説明文なし。
 *
 * yaneyuka.com本体のプラポリは独立URLを持たずactiveContent='privacy-policy'のSPA表示なので、
 * Link遷移ではなくonYaneyukaPrivacyClickでMainLayout側のSPA状態を切り替える。
 */
export default function RelatedPrivacyLinks({
  currentPath,
  isYaneyukaPrivacyActive,
  onYaneyukaPrivacyClick,
}: RelatedPrivacyLinksProps) {
  // パスの末尾スラッシュ正規化
  const normalize = (p: string) => (p.endsWith('/') && p !== '/' ? p.slice(0, -1) : p);
  const cur = normalize(currentPath);

  const linkClass = 'block text-[11px] text-gray-200 hover:text-white hover:underline';
  const activeClass = 'block text-[11px] font-semibold text-white';

  return (
    <div className="bg-black border border-gray-700 rounded p-3 mb-3">
      <h4 className="text-[11px] font-semibold mb-2 text-white border-b border-gray-700 pb-1.5">
        関連プライバシーポリシー
      </h4>
      <ul className="space-y-1">
        {LEGAL_APPS.map((app) => {
          const isActive = app.isYaneyukaMain
            ? !!isYaneyukaPrivacyActive
            : normalize(app.href) === cur;

          if (isActive) {
            return (
              <li key={app.href}>
                <span className={activeClass}>▸ {app.label}</span>
              </li>
            );
          }

          // yaneyuka本体プラポリはSPA遷移（onYaneyukaPrivacyClick）
          if (app.isYaneyukaMain && onYaneyukaPrivacyClick) {
            return (
              <li key={app.href}>
                <button
                  type="button"
                  onClick={onYaneyukaPrivacyClick}
                  className={`${linkClass} text-left w-full bg-transparent`}
                >
                  {app.label}
                </button>
              </li>
            );
          }

          return (
            <li key={app.href}>
              <Link href={app.href} className={linkClass}>
                {app.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
