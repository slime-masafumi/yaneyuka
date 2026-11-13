import React from 'react';

/**
 * 掲載データがまだサンプルであることを示す表示。
 *
 * 施工会社・設計事務所・求人情報・コンペ・Pickup は、現在すべて架空のデータで
 * できている。以前は「詳細」を押して初めて「サンプルです」と分かる作りだったため、
 * 実在の会社だと誤解されうる状態だった。一覧の時点で分かるようにする。
 *
 * 隠さずに見せているのは、掲載を検討する会社に「ここに載れる」と伝える枠でもあるため。
 */

/** カード等に重ねる小さなバッジ */
export const SampleBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    className={`inline-flex items-center rounded-[3px] border border-[#e6e6e2] px-1 text-[10px] leading-4 tracking-[0.08em] text-[#9a9a96] ${className}`}
  >
    サンプル
  </span>
);

type SampleNoticeProps = {
  /** 「〜の掲載企業を募集しています」の〜の部分 */
  target: string;
  /** 掲載希望フォームへ誘導する処理 */
  onRequest?: () => void;
};

/** 一覧の先頭に置く説明帯 */
const SampleNotice: React.FC<SampleNoticeProps> = ({ target, onRequest }) => (
  // 高級感 3：琥珀色の帯をやめ、罫線 1 本の行に（2026-11-13）
  <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-[#e6e6e2] py-2 text-[12px] text-[#5c5c5a]">
    <SampleBadge />
    <span>
      現在表示されているのは<strong className="font-bold text-[#141414]">すべて架空のサンプル</strong>です。{target}の掲載企業を募集しています。
    </span>
    {onRequest && (
      <button
        type="button"
        onClick={onRequest}
        className="ml-auto text-[11.5px] text-[#2E7D6B] underline-offset-[3px] hover:underline"
      >
        掲載を希望する
      </button>
    )}
  </div>
);

export default SampleNotice;
