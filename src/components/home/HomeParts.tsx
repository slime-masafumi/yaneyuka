'use client';

import React, { useEffect, useState } from 'react';
import { getJson } from '@/lib/apiCache';
import FeedPic from '@/components/ui/FeedPic';
import { openScreen, screenHref } from '@/lib/openScreen';
import type { UserpageTarget } from '@/lib/userpageUrl';
import { Store, itemStatus } from '@/lib/karte/engine';
import { ITEMS, itemKey } from '@/lib/karte/masters';

/**
 * ホーム(モック「高級感 3」Q4)のうち、ブラウザでしか作れない部分。
 *   ScreenLink … 左カラムの画面(ツール)を開く a。href は ?m= の URL なので新しいタブでも開ける
 *   HomeCase   … 物件カルテの案件と進み具合(端末に保存されたもの)
 *   HomeNews / HomeEvents … /api/news・/api/events から最新を数件
 */

export function ScreenLink({ target, className, children }: { target: UserpageTarget; className?: string; children: React.ReactNode }) {
  return (
    <a
      href={screenHref(target)}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        openScreen(target);
      }}
    >
      {children}
    </a>
  );
}

type CaseView = { name: string; sub: string; done: number; total: number; next?: string };

/** 物件カルテ(/karte、端末に保存)の、いま開いている案件 */
export function HomeCase() {
  const [view, setView] = useState<CaseView | null | undefined>(undefined);
  useEffect(() => {
    const db = Store.load();
    if (!db) {
      setView(null);
      return;
    }
    const p = db.projects.find((x) => x.id === db.current) ?? db.projects[0];
    const studies = db.studies.filter((s) => s.projId === p.id);
    const checks = db.itemChecks[p.id] ?? {};
    const st = ITEMS.map((it) => ({ it, s: itemStatus(it, studies, p, checks, db.itemRecs?.[p.id]?.[itemKey(it)]) }));
    const live = st.filter((x) => x.s !== 'na');
    setView({
      name: p.name,
      sub: [p.addr, p.H ? `高さ ${p.H} m` : ''].filter(Boolean).join(' · '),
      done: live.filter((x) => x.s === 'done').length,
      total: live.length,
      next: live.find((x) => x.s === 'todo' || x.s === 'warn')?.it.label,
    });
  }, []);

  if (view === undefined) return <div className="yy-home__case" aria-hidden="true" />;
  if (view === null) {
    return (
      <div className="yy-home__case">
        <span className="yy-label">continue — 案件</span>
        <span className="yy-home__casename is-empty">案件はまだありません</span>
        <span className="yy-home__casesub">物件カルテで案件を作ると、ここに進み具合と次にやることが出ます</span>
        <a className="yy-home__go" href="/karte/">物件カルテを開く <span aria-hidden="true">›</span></a>
      </div>
    );
  }
  const pct = view.total ? Math.round((view.done / view.total) * 100) : 0;
  return (
    <div className="yy-home__case">
      <span className="yy-label">continue — 案件</span>
      <span className="yy-home__casename">{view.name}</span>
      {view.sub && <span className="yy-home__casesub">{view.sub}</span>}
      <span className="yy-home__prog">
        <b>{view.done}</b>
        <small>/ {view.total}</small>
        <span className="yy-home__bar">
          <span style={{ width: `${pct}%` }} />
        </span>
      </span>
      {view.next && <span className="yy-home__casesub">次 · {view.next}</span>}
      <a className="yy-home__go" href="/karte/">
        続ける <span aria-hidden="true">›</span>
      </a>
    </div>
  );
}

type News = { title: string; link: string; pubDate: string; source: string; image?: string };

const md = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;

export function HomeNews({ limit = 6 }: { limit?: number }) {
  const [items, setItems] = useState<News[] | null>(null);
  useEffect(() => {
    let alive = true;
    getJson<{ items?: News[] }>('/api/news/')
      .then((j) => alive && setItems((j.items || []).slice(0, limit)))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [limit]);
  if (!items) return <p className="yy-home__empty">読み込み中…</p>;
  if (!items.length) return <p className="yy-home__empty">いまは取得できません</p>;
  return (
    <ul className="yy-home__news">
      {items.map((n) => (
        <li key={n.link} className="has-pic">
          <span className="yy-home__newsbody">
            <span className="yy-home__meta">
              <span>{n.source.replace(/[（(]検索[)）]$/, '')}</span>
              <span>{md(new Date(n.pubDate))}</span>
            </span>
            <a href={n.link} target="_blank" rel="noopener noreferrer" title={n.title}>
              {n.title.replace(/\s-\s[^-]+$/, '')}
            </a>
          </span>
          <FeedPic src={n.image} size="mini" />
        </li>
      ))}
    </ul>
  );
}

type Ev = { id: string; title: string; startDate: string; endDate: string; venue: string; link: string; image?: string };
const dot = (iso: string) => iso.slice(5).replace('-', '.');

export function HomeEvents({ limit = 4 }: { limit?: number }) {
  const [items, setItems] = useState<Ev[] | null>(null);
  useEffect(() => {
    let alive = true;
    const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
    getJson<{ items?: Ev[] }>('/api/events/')
      .then((j) => {
        if (!alive) return;
        const up = (j.items || []).filter((e) => (e.endDate || e.startDate) >= today);
        setItems(up.slice(0, limit));
      })
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [limit]);
  if (!items) return <p className="yy-home__empty">読み込み中…</p>;
  if (!items.length) return <p className="yy-home__empty">予定されているイベントはありません</p>;
  return (
      <ul className="yy-home__events">
        {items.map((e) => (
          <li key={e.id}>
            <span className="yy-home__date">{dot(e.startDate)}</span>
            <span className="yy-home__evbody">
              <a href={e.link} target="_blank" rel="noopener noreferrer" title={e.title}>
                {e.title}
              </a>
              <span>
                {e.endDate && e.endDate !== e.startDate ? `〜 ${dot(e.endDate)} · ` : ''}
                {e.venue}
              </span>
            </span>
            <FeedPic src={e.image} size="mini" />
          </li>
        ))}
      </ul>
  );
}

type Product = { id?: string; title: string; link: string; pubDate: string; source: string; image?: string };

/** 新製品(/api/new-products)の最新を数件。ホームの建材欄に出す(2026-11-15) */
export function HomeNewProducts({ limit = 5 }: { limit?: number }) {
  const [items, setItems] = useState<Product[] | null>(null);
  useEffect(() => {
    let alive = true;
    getJson<{ items?: Product[] }>('/api/new-products/')
      .then((j) => alive && setItems((j.items || []).slice(0, limit)))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [limit]);
  if (!items) return <p className="yy-home__empty">読み込み中…</p>;
  if (!items.length) return <p className="yy-home__empty">いまは取得できません</p>;
  return (
    <ul className="yy-home__news">
      {items.map((n) => (
        <li key={n.link} className="has-pic">
          <span className="yy-home__newsbody">
            <span className="yy-home__meta">
              <span>{n.source}</span>
              <span>{md(new Date(n.pubDate))}</span>
            </span>
            <a href={n.link} target="_blank" rel="noopener noreferrer" title={n.title}>
              {n.title}
            </a>
          </span>
          <FeedPic src={n.image} size="mini" />
        </li>
      ))}
    </ul>
  );
}

export type HomeComp = { id: string; title: string; organizer: string; register?: string; deadline?: string; url: string };

/**
 * コンペの締切が近いもの。ホームはビルド時に作るので、締切を過ぎたものが次のデプロイまで残らないよう、
 * 日付の判定はブラウザでもやり直す(サーバーではビルドした日で判定した一覧を出す)。2026-11-15
 */
export function HomeComps({ items, limit = 4 }: { items: HomeComp[]; limit?: number }) {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)), []);
  const day = today ?? new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  const list = items
    .map((c) => {
      const reg = c.register && c.register >= day ? c.register : '';
      const next = reg || (c.deadline && c.deadline >= day ? c.deadline : '');
      return { ...c, next, kind: reg ? '登録締切' : '提出締切' };
    })
    .filter((c) => c.next)
    .sort((x, y) => x.next.localeCompare(y.next))
    .slice(0, limit);
  if (!list.length) return <p className="yy-home__empty">募集中のものはありません</p>;
  return (
    <ul className="yy-home__events">
      {list.map((c) => (
        <li key={c.id}>
          <span className="yy-home__date">{dot(c.next)}</span>
          <span className="yy-home__evbody">
            <a href={c.url} target="_blank" rel="noopener noreferrer" title={c.title}>
              {c.title}
            </a>
            <span>
              {c.kind} · {c.organizer}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
