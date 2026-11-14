'use client';

import React, { useEffect, useState } from 'react';
import PageHead from '@/components/ui/PageHead';
import DesignInfo from '@/components/content/Userpage/DesignInfo';
import MaterialInfo from '@/components/content/Userpage/MaterialInfo';
import './lookup-tabs.css';

/**
 * 建築の調べもの(/lookup/)。設計情報と材料情報をタブで切り替える(2026-11-14)。
 *   /lookup/              … 設計情報(設計の技術・法規・設備の読みもの)
 *   /lookup/?tab=material … 材料情報(規格・寸法・特性の早見表)
 *   /lookup/?tab=material&sec=section-6 … 材料情報の章を指定 / /lookup/?post=7 … 設計情報の記事を指定
 * 以前は左メニューに「設計情報」「材料情報」が別々にあり、調べものは条文の目次(2,016 項目)だった。
 * 目次は /lookup/{分野}/ に残してある(公開済みの URL のため。ここからはつながない)。
 *
 * タブは URL の ?tab= で覚える(再読み込み・共有で同じタブが開く)。useSearchParams は使わない
 * (サーバーで呼ぶとページ全体がクライアント描画に落ちるため)。開いた後に window から読む。
 */
type Tab = 'design' | 'material';

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: 'design', label: '設計情報', desc: '設計の技術・法規・設備の読みもの' },
  { id: 'material', label: '材料情報', desc: '規格・寸法・特性の早見表' },
];

export default function LookupTabs() {
  const [tab, setTab] = useState<Tab>('design');
  const [sec, setSec] = useState<string | null>(null);
  const [post, setPost] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      const q = new URLSearchParams(window.location.search);
      setTab(q.get('tab') === 'material' ? 'material' : 'design');
      setSec(q.get('sec'));
      setPost(q.get('post'));
    };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);

  const open = (t: Tab) => {
    if (t === tab) return;
    setTab(t);
    try {
      window.history.pushState(null, '', t === 'material' ? '/lookup/?tab=material' : '/lookup/');
    } catch {}
  };

  return (
    <div className="yy-lkt">
      <PageHead no="14" en="lookup" title="建築の調べもの" desc="設計の読みものと、材料の規格・寸法の早見表" />
      <nav className="yy-lkt__switch" aria-label="調べものの種類">
        {TABS.map((t, i) => (
          <button key={t.id} type="button" className="yy-lkt__tab" aria-pressed={tab === t.id} onClick={() => open(t.id)}>
            <span className="yy-lkt__no">{String(i + 1).padStart(2, '0')}</span>
            <span className="yy-lkt__label">{t.label}</span>
            <span className="yy-lkt__desc">{t.desc}</span>
          </button>
        ))}
      </nav>
      {tab === 'design' ? <DesignInfo embedded initialPost={post} /> : <MaterialInfo embedded initialSection={sec} />}
    </div>
  );
}
