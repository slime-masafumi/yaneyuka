import React from 'react';
import './connect-pages.css';

/**
 * 「03 つながる」の 5 画面(プロジェクト / コンペ / 施工会社 / 設計事務所 / 求人情報)で共有する部品。
 * モック「高級感 3」の組み方:一覧は 1 行の索引、右列は章(I, II…)+ 灰色の掲載希望。
 */

/** 所在地の先頭から都道府県を取り出す(「全国」「関東圏」などはそのまま) */
export function regionOf(location: string): string {
  const m = location.match(/^(北海道|東京都|京都府|大阪府|.{2,3}県)/);
  return m ? m[1] : location.split(/[・、\s]/)[0] || 'その他';
}

/** [名前, 件数] を件数の多い順に */
export function countBy<T>(items: T[], key: (x: T) => string): [string, number][] {
  const m = new Map<string, number>();
  items.forEach((x) => {
    const k = key(x);
    m.set(k, (m.get(k) || 0) + 1);
  });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/** 日本時間の今日(YYYY-MM-DD) */
export const todayJST = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

/** 章の頭:明朝の番号 + 章題 + 右の補足 + 黒 1px */
export function Sec({ no, title, right }: { no: string; title: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="yy-sec">
      <span className="yy-sec__no">{no}</span>
      <span className="yy-sec__title">{title}</span>
      {right !== undefined && <span className="yy-sec__right">{right}</span>}
    </div>
  );
}

/** 名前 ……… 件数 の索引。onPick があれば行を押せる(タブの切り替えなど) */
export function CountList({
  rows,
  active,
  onPick,
}: {
  rows: { key: string; label: string; n: React.ReactNode }[];
  active?: string;
  onPick?: (key: string) => void;
}) {
  return (
    <ol className="yy-home__toc yy-cn-count">
      {rows.map((r) => (
        <li key={r.key}>
          {onPick ? (
            <button
              type="button"
              className={`yy-srcrow yy-srcrow--btn${active === r.key ? ' is-on' : ''}`}
              onClick={() => onPick(r.key)}
              aria-pressed={active === r.key}
            >
              <span className="yy-home__toct">{r.label}</span>
              <span className="yy-leader" />
              <span className="yy-serif">{r.n}</span>
            </button>
          ) : (
            <span className="yy-srcrow">
              <span className="yy-home__toct">{r.label}</span>
              <span className="yy-leader" />
              <span className="yy-serif">{r.n}</span>
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

/** 灰色の掲載希望の案内。押すと掲載希望フォームへ */
export function RequestPanel({ what, text, onRequest }: { what: string; text: string; onRequest?: () => void }) {
  return (
    <div className="yy-gray">
      <span className="yy-label">掲載希望</span>
      <span className="yy-gray__title">{what}を掲載する</span>
      <span className="yy-gray__text">{text}</span>
      <button
        type="button"
        className="yy-pill"
        onClick={() => (onRequest ? onRequest() : alert('掲載希望フォームを表示します（実装予定）'))}
      >
        掲載希望はコチラ ↗
      </button>
    </div>
  );
}

/**
 * 掲載データが架空のサンプルであることを示す 1 行(SampleNotice と同じ文言)。
 * 色帯にはせず、小さな枠付きラベル + 灰の文字で一覧の先頭に置く。
 */
export function SampleLine({ target, onRequest }: { target: string; onRequest?: () => void }) {
  return (
    <p className="yy-cn-sample">
      <span className="yy-fmt">サンプル</span>
      <span>
        現在表示されているのは<strong>すべて架空のサンプル</strong>です。{target}の掲載企業を募集しています。
      </span>
      {onRequest && (
        <button type="button" className="yy-linkbtn" onClick={onRequest}>
          掲載を希望する ↗
        </button>
      )}
    </p>
  );
}

/** 小さな写真の四角(白黒 + 緑)。読めなければ代わりの画像へ */
export function Photo({ src, alt, fallback, size }: { src: string; alt: string; fallback: string; size?: 'm' }) {
  return (
    <span className={`yy-photo${size === 'm' ? ' yy-cn-photo--m' : ''}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={(e) => {
          const t = e.target as HTMLImageElement;
          if (!t.src.endsWith(encodeURI(fallback))) t.src = fallback;
        }}
      />
    </span>
  );
}
