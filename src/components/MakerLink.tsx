import React from 'react';
import report from '@/data/broken-maker-links.json';
import './materials/makerRows.css';

/**
 * 建材メーカーの外部リンク。
 *
 * メーカー各社は製品ページの URL をよく作り替えるため、こちらのリンクは放っておくと
 * 404 が溜まっていく（2026-11 の調査では約 15% が 404 で、そのほとんどは会社サイト
 * 自体は健在だった）。scripts/check-maker-links.mjs が週次で全件を確認し、
 * src/data/broken-maker-links.json に切れたリンクを書き出す。
 *
 * 2026-11-16 まで: 404 のものを黙って会社トップへ振り替えていた。「カタログ」を押すと
 * 会社のトップページが開き、カタログが無いのか、こちらの誤りなのか分からなかった。
 * いま: 「要更新」と出して、押すと会社トップを開く(行き止まりにはしない)。題に確認日と状態を出す。
 */

type Broken = { url: string; status: number; fallback?: string };
const BROKEN: Record<string, Broken> = Object.fromEntries(((report.broken || []) as Broken[]).map((b) => [b.url, b]));
/** 週次の確認日(2026-11-15 → 11/15) */
const CHECKED = String(report.generatedAt || '').slice(5).replace('-', '/');

const isUsable = (url?: string): url is string =>
  Boolean(url && url !== '#' && url.trim() !== '');

/** 切れたリンクの扱い(リンクが生きていれば null) */
export function staleOf(url?: string): { top: string; title: string } | null {
  if (!isUsable(url)) return null;
  const b = BROKEN[url];
  if (!b) return null;
  return {
    top: b.fallback || url,
    title: `登録しているページが見つかりません(${b.status} · ${CHECKED} の確認)。${b.fallback ? '会社のトップページを開きます' : 'リンク先を開きます'}`,
  };
}

type MakerLinkProps = {
  url?: string;
  label: string;
  /** cell = 表のセル用。リンクは ↗、無ければ —（列見出しが名前を持つので文字は出さない） */
  variant?: 'text' | 'cell';
};

const MakerLink: React.FC<MakerLinkProps> = ({ url, label, variant = 'text' }) => {
  if (variant === 'cell') {
    if (!isUsable(url)) return <span className="is-none" aria-label={`${label}なし`}>—</span>;
    const stale = staleOf(url);
    if (stale) {
      return (
        <a href={stale.top} target="_blank" rel="noopener noreferrer" className="yy-mklink is-stale" aria-label={`${label}(要更新 · 会社トップを開く)`} title={`${label} — ${stale.title}`}>
          <span className="yy-mklink__arrow" aria-hidden="true">↗</span>
          <span className="yy-mklink__stale">要更新</span>
        </a>
      );
    }
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
        ↗
      </a>
    );
  }
  if (!isUsable(url)) {
    return <span className="text-gray-600 no-underline cursor-not-allowed">{label}</span>;
  }

  const stale = staleOf(url);
  if (stale) {
    return (
      <a href={stale.top} target="_blank" rel="noopener noreferrer" title={stale.title} className="yy-mklink is-stale is-text">
        {label}
        <span className="yy-mklink__stale">要更新</span>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-800 hover:text-blue-900 underline cursor-pointer"
    >
      {label}
    </a>
  );
};

export default MakerLink;
