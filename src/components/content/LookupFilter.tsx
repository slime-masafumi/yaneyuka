'use client';

import React, { useEffect, useState } from 'react';

/**
 * 調べもののページ内の絞り込み(「排煙」「かぶり厚」など)。
 * 項目はサーバーで全部描いてあるので、ここは表示・非表示を切り替えるだけ(データを持たない)。
 * 当たる項目の無い章は章ごと隠す。
 */
export default function LookupFilter() {
  const [q, setQ] = useState('');
  useEffect(() => {
    const words = q.normalize('NFKC').toLowerCase().split(/\s+/).filter(Boolean);
    document.querySelectorAll<HTMLElement>('.yy-lkb__chap').forEach((sec) => {
      let any = false;
      sec.querySelectorAll<HTMLElement>('li[data-q]').forEach((li) => {
        const t = (li.dataset.q || '').normalize('NFKC').toLowerCase();
        const hit = words.every((w) => t.includes(w));
        li.style.display = hit ? '' : 'none';
        if (hit) any = true;
      });
      sec.style.display = any ? '' : 'none';
    });
  }, [q]);
  return (
    <span className="yy-lkfilter">
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="「排煙」「かぶり厚」など" aria-label="この分野の項目を絞り込む" />
    </span>
  );
}
