'use client';

import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import ChartView from './ChartView';
import FnbView from './FnbView';
import GlassView, { type GlassPrefill } from './GlassView';
import ItemsView from './ItemsView';
import PipeView from './PipeView';
import { ROUGH_LABEL } from '@/lib/karte/glass';
import { Store, defaultDb, defaultFnb, itemStatus, uid, type DB, type Fnb, type StudyDraft, type TabView, type View } from '@/lib/karte/engine';
import { CATS, ITEMS, newProject, type CatKey, type Project, type ToolKey } from '@/lib/karte/masters';

const TABS: Array<[TabView, string]> = [['chart', 'カルテ'], ...CATS];
const TOOLS: View[] = ['glass', 'pipe', 'fnb'];

type Prefill = { open?: View; glass?: GlassPrefill };

/** /calc/ の単体ページから「この検討を物件カルテに残す」で飛んできたときの引継ぎ */
function readQuery(): Prefill {
  if (typeof window === 'undefined') return {};
  const q = new URLSearchParams(window.location.search);
  const open = q.get('open');
  const out: Prefill = {};
  if (open && (TOOLS as string[]).includes(open)) out.open = open as View;
  if (open === 'glass') {
    const g: GlassPrefill = {};
    const kind = q.get('kind');
    const comp = q.get('comp');
    if (kind) g.kind = kind as GlassPrefill['kind'];
    if (comp) g.comp = comp as GlassPrefill['comp'];
    for (const k of ['t2', 'w', 'h', 'z'] as const) {
      const v = q.get(k);
      if (v && Number.isFinite(+v)) g[k] = v;
    }
    if (q.get('part') === 'corner') g.part = 'corner';
    out.glass = g;
  }
  return out;
}

/** 現在の物件に内装データが無ければ標準構成で作る（ID を安定させるため state 内に持つ） */
function ensureFnb(d: DB): DB {
  if (d.fnb[d.current]) return d;
  return { ...d, fnb: { ...d.fnb, [d.current]: defaultFnb() } };
}

/**
 * 物件カルテ本体。next/dynamic({ ssr:false }) で読み込む前提なので、
 * 初期化時に localStorage と URL クエリを直接読める。
 */
export default function KarteApp() {
  const [prefill] = useState<Prefill>(readQuery);
  const [db, setDb] = useState<DB>(() => ensureFnb(Store.load() ?? defaultDb()));
  const [view, setViewRaw] = useState<View>(() => prefill.open ?? 'chart');
  const rootRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    Store.save(db);
  }, [db]);

  // 画面が切り替わったらカルテの先頭までスクロールする（初回は除く）
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    rootRef.current?.scrollIntoView({ block: 'start' });
  }, [view]);

  const proj: Project = db.projects.find((p) => p.id === db.current) ?? db.projects[0];
  const studies = db.studies.filter((s) => s.projId === db.current);
  const fnb: Fnb = db.fnb[db.current];
  const itemChecks = db.itemChecks[db.current] ?? {};
  const fnbChecks = db.fnbChecks[db.current] ?? {};

  const setView = (v: View) => {
    if ((TABS as Array<[string, string]>).some(([k]) => k === v)) {
      setDb((d) => ({ ...d, backTo: v as TabView }));
    }
    setViewRaw(v);
  };
  const back = () => setViewRaw(db.backTo || 'chart');
  const openTool = (tool: ToolKey, from: TabView) => {
    setDb((d) => ({ ...d, backTo: from }));
    setViewRaw(tool);
  };

  const selectProject = (id: string) => {
    setDb((d) => ensureFnb({ ...d, current: id }));
    setViewRaw('chart');
  };
  const createProject = () => {
    const p = newProject(uid());
    setDb((d) => ensureFnb({ ...d, projects: [...d.projects, p], current: p.id }));
    setViewRaw('chart');
  };
  const saveProject = (p: Project) => setDb((d) => ({ ...d, projects: d.projects.map((x) => (x.id === p.id ? p : x)) }));

  const saveStudy = (draft: StudyDraft, memo: string) =>
    setDb((d) => ({
      ...d,
      studies: [{ ...draft, id: uid(), projId: d.current, memo: memo.trim(), at: new Date().toISOString() }, ...d.studies],
    }));
  const deleteStudy = (id: string) => setDb((d) => ({ ...d, studies: d.studies.filter((s) => s.id !== id) }));
  const checkItem = (key: string, on: boolean) =>
    setDb((d) => ({ ...d, itemChecks: { ...d.itemChecks, [d.current]: { ...(d.itemChecks[d.current] ?? {}), [key]: on } } }));
  const changeFnb = (f: Fnb) => setDb((d) => ({ ...d, fnb: { ...d.fnb, [d.current]: f } }));
  const checkFnb = (id: string, on: boolean) =>
    setDb((d) => ({ ...d, fnbChecks: { ...d.fnbChecks, [d.current]: { ...(d.fnbChecks[d.current] ?? {}), [id]: on } } }));

  const todoOf = (cat: CatKey) =>
    ITEMS.filter((it) => it.cat === cat && itemStatus(it, studies, proj, itemChecks) === 'todo').length;
  const activeTab: TabView = (TABS.some(([k]) => k === view) ? view : db.backTo || 'chart') as TabView;

  const chips = [proj.zone, proj.fire, `H ${proj.H}m`, `V₀ ${proj.v0}m/s`, `粗度${ROUGH_LABEL[proj.rough] ?? proj.rough}`, `降雨 ${proj.rain}mm/h`, `Z ${proj.z}`];

  return (
    <div ref={rootRef} style={{ scrollMarginTop: 8 }}>
      {/* ══ 物件バー ══ */}
      <div className="yk-projbar">
        <div className="yk-wrap">
          <select aria-label="物件" value={db.current} onChange={(e) => selectProject(e.target.value)}>
            {db.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button type="button" onClick={() => setView('chart')}>条件を編集</button>
          <button type="button" onClick={createProject}>＋ 新規物件</button>
          <span className="yk-sp" />
        </div>
        <div className="yk-chips">
          {chips.map((t, i) => <span key={i} className="yk-chip">{t}</span>)}
        </div>
      </div>

      <nav className="yk-tabs" aria-label="分野">
        <div className="yk-wrap">
          {TABS.map(([key, label]) => {
            const n = key === 'chart' ? 0 : todoOf(key as CatKey);
            return (
              <button key={key} type="button" aria-pressed={activeTab === key} onClick={() => setView(key)}>
                {label}
                {n > 0 && <span className="yk-badge">{n}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="yk-wrap yk-main">
        {view === 'chart' && (
          <ChartView
            project={proj}
            studies={studies}
            onSaveProject={saveProject}
            onReopen={(tool) => openTool(tool, 'chart')}
            onDelete={deleteStudy}
            persistent={Store.persistent}
          />
        )}
        {(view === 'design' || view === 'struct' || view === 'mep' || view === 'elec') && (
          <ItemsView
            cat={view}
            project={proj}
            studies={studies}
            checks={itemChecks}
            onOpen={(tool) => openTool(tool, view)}
            onCheck={checkItem}
          />
        )}
        {view === 'glass' && (
          <GlassView key={proj.id} project={proj} prefill={prefill.glass} onBack={back} onGotoProject={() => setView('chart')} onSave={saveStudy} />
        )}
        {view === 'pipe' && <PipeView key={proj.id} project={proj} onBack={back} onGotoProject={() => setView('chart')} onSave={saveStudy} />}
        {view === 'fnb' && (
          <FnbView
            key={proj.id}
            project={proj}
            fnb={fnb}
            checks={fnbChecks}
            onChange={changeFnb}
            onCheck={checkFnb}
            onBack={back}
            onGotoProject={() => setView('chart')}
            onSave={saveStudy}
          />
        )}
      </main>

      <div className="yk-foot">
        <div className="yk-wrap">
          yaneyuka ｜ 物件カルテ ｜ <Link href="/lookup/">建築の調べもの一覧</Link> ｜ <Link href="/calc/glass-thickness/">必要ガラス厚の計算</Link>
          <br />
          計算結果は設計の目安です。最終判断は建築士など有資格者が、最新の法令・告示を確認したうえで行ってください。
        </div>
      </div>
    </div>
  );
}
