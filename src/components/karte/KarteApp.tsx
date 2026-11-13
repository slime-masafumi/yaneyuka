'use client';

import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import ChartView from './ChartView';
import FnbView from './FnbView';
import GlassView, { type GlassPrefill } from './GlassView';
import ItemsView from './ItemsView';
import KarteSide, { type Progress } from './KarteSide';
import PipeView from './PipeView';
import PageHead, { Stat } from '@/components/ui/PageHead';
import { ROUGH_LABEL } from '@/lib/karte/glass';
import { Store, defaultDb, defaultFnb, itemStatus, uid, type DB, type Fnb, type StudyDraft, type TabView, type View } from '@/lib/karte/engine';
import { CATS, ITEMS, STR_LABEL, USE_LABEL, newProject, type CatKey, type Project, type ToolKey } from '@/lib/karte/masters';

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
 *
 * 組版はモック「高級感 3」: PageHead → 案件の帯（灰色）→ 分野の下線タブ →
 * 本文 + 右列 270px（カルテ・各分野）／計算書の 3 段組（ガラス厚・縦樋・内装）。
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

  const isTab = (v: View) => (TABS as Array<[string, string]>).some(([k]) => k === v);
  const setView = (v: View) => {
    if (isTab(v)) {
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

  const statusOf = new Map(ITEMS.map((it) => [it, itemStatus(it, studies, proj, itemChecks)] as const));
  const todoOf = (cat: CatKey) => ITEMS.filter((it) => it.cat === cat && statusOf.get(it) === 'todo').length;
  const activeTab: TabView = (isTab(view) ? view : db.backTo || 'chart') as TabView;

  // 進み具合（対象外を除く）。設計ツール一覧の右列と同じ数え方
  const live = ITEMS.filter((it) => statusOf.get(it) !== 'na');
  const progress: Progress = {
    done: live.filter((it) => statusOf.get(it) === 'done').length,
    total: live.length,
    cats: CATS.map(([k, l]) => {
      const list = live.filter((it) => it.cat === k);
      return [k, l, list.filter((it) => statusOf.get(it) === 'done').length, list.length];
    }),
    next: live
      .filter((it) => statusOf.get(it) !== 'done')
      .sort((a, b) => Number(!!b.tool) - Number(!!a.tool))
      .slice(0, 5)
      .map((it) => ({ label: it.label, cat: it.cat, tool: it.tool })),
  };
  const todoAll = ITEMS.filter((it) => statusOf.get(it) === 'todo').length;
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  const conds = [proj.zone, proj.fire, `V₀ ${proj.v0} m/s`, `粗度 ${ROUGH_LABEL[proj.rough] ?? proj.rough}`, `降雨 ${proj.rain} mm/h`, `Z ${proj.z}`, `積雪 ${proj.snow} cm`];
  const sub = [
    proj.addr,
    `H ${proj.H} m`,
    USE_LABEL[proj.use],
    `${STR_LABEL[proj.str] ?? ''} ${proj.fl} 階${proj.bf ? ` · 地下 ${proj.bf} 階` : ''}`,
    proj.area ? `延べ ${proj.area.toLocaleString('ja-JP')} ㎡` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const side = (
    <KarteSide
      start={view === 'chart' ? 4 : 2}
      progress={progress}
      persistent={Store.persistent}
      onOpenCat={(cat) => setView(cat)}
      onOpenTool={(tool) => openTool(tool, activeTab)}
    />
  );

  return (
    <div ref={rootRef} style={{ scrollMarginTop: 8 }}>
      <h1 className="sr-only">物件カルテ</h1>
      <PageHead
        no="13"
        en="property chart"
        title="物件カルテ"
        desc="条件を一度入れると、各分野の検討で使い回す · 根拠つきの記録が貯まる"
        right={
          <>
            <Stat n={progress.done} label="済" />
            <Stat n={todoAll} label="未着手" />
            <Stat n={studies.length} label="記録" />
            <Stat n={db.projects.length} label="物件" />
          </>
        }
      />

      {/* ══ 案件の帯（灰色） ══ */}
      <div className="yy-gray yy-kt-case">
        <span className="yy-label">case — 案件</span>
        <select className="yy-kt-case__name" aria-label="物件" value={db.current} onChange={(e) => selectProject(e.target.value)}>
          {db.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <span className="yy-kt-case__sub">{sub}</span>
        <span className="yy-kt-case__prog" title="対象外を除いた検討項目のうち、済の数">
          <b>{progress.done}</b>
          <small>/ {progress.total}</small>
          <span className="yy-kt-case__bar">
            <span style={{ width: `${pct}%` }} />
          </span>
        </span>
        <span className="yy-kt-case__acts">
          <button type="button" className="yy-btn" onClick={() => setView('chart')}>
            条件を編集
          </button>
          <button type="button" className="yy-btn" onClick={createProject}>
            ＋ 新規物件
          </button>
        </span>
        <span className="yy-kt-case__conds">
          {conds.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </span>
      </div>

      <nav className="yy-tabs yy-kt-tabs" aria-label="分野">
        {TABS.map(([key, label]) => {
          const n = key === 'chart' ? 0 : todoOf(key as CatKey);
          return (
            <button key={key} type="button" className="yy-tab" aria-pressed={activeTab === key} onClick={() => setView(key)}>
              {label}
              {n > 0 && <small title="未着手">{n}</small>}
            </button>
          );
        })}
      </nav>

      {view === 'chart' && (
        <div className="yy-kt-body">
          <div className="yy-kt-main">
            <ChartView project={proj} studies={studies} onSaveProject={saveProject} onReopen={(tool) => openTool(tool, 'chart')} onDelete={deleteStudy} />
          </div>
          {side}
        </div>
      )}
      {(view === 'design' || view === 'struct' || view === 'mep' || view === 'elec') && (
        <div className="yy-kt-body">
          <div className="yy-kt-main">
            <ItemsView cat={view} project={proj} studies={studies} checks={itemChecks} onOpen={(tool) => openTool(tool, view)} onCheck={checkItem} />
          </div>
          {side}
        </div>
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

      <p className="yy-kt-disc">
        計算結果は設計の目安です。最終判断は建築士など有資格者が、最新の法令・告示を確認したうえで行ってください。
        <br />
        <Link href="/lookup/">建築の調べもの一覧</Link> · <Link href="/calc/">計算ツール</Link> · <Link href="/calc/glass-thickness/">必要ガラス厚の計算</Link>
      </p>
    </div>
  );
}
