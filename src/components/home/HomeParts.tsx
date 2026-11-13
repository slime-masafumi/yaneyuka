'use client';

import React, { useEffect, useState } from 'react';
import { openScreen, screenHref } from '@/lib/openScreen';
import type { UserpageTarget } from '@/lib/userpageUrl';
import { Store, itemStatus } from '@/lib/karte/engine';
import { ITEMS } from '@/lib/karte/masters';

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
    const st = ITEMS.map((it) => ({ it, s: itemStatus(it, studies, p, checks) }));
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

type News = { title: string; link: string; pubDate: string; source: string };

const md = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;

export function HomeNews({ limit = 6 }: { limit?: number }) {
  const [items, setItems] = useState<News[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/news/', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j) => alive && setItems(((j.items as News[]) || []).slice(0, limit)))
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
        <li key={n.link}>
          <span className="yy-home__meta">
            <span>{n.source.replace(/[（(]検索[)）]$/, '')}</span>
            <span>{md(new Date(n.pubDate))}</span>
          </span>
          <a href={n.link} target="_blank" rel="noopener noreferrer" title={n.title}>
            {n.title.replace(/\s-\s[^-]+$/, '')}
          </a>
        </li>
      ))}
    </ul>
  );
}

type Ev = { id: string; title: string; startDate: string; endDate: string; venue: string; link: string };
const dot = (iso: string) => iso.slice(5).replace('-', '.');

export function HomeEvents({ limit = 4 }: { limit?: number }) {
  const [items, setItems] = useState<Ev[] | null>(null);
  useEffect(() => {
    let alive = true;
    const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
    fetch('/api/events/')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j) => {
        if (!alive) return;
        const up = ((j.items as Ev[]) || []).filter((e) => (e.endDate || e.startDate) >= today);
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
          </li>
        ))}
      </ul>
  );
}
