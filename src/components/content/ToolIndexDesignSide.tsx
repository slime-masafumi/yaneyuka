'use client';

import React, { useEffect, useState } from 'react';
import { DESIGN_TOOL_MENU } from '@/lib/designToolsMenu';
import { Store, itemStatus, type ItemStatus } from '@/lib/karte/engine';
import { CATS, ITEMS, itemKey } from '@/lib/karte/masters';
import { ago, recentTools, setMode, studiesOf, type RecentTool } from '@/lib/caseStudies';
import { SecHead, useCase } from '@/components/ui/Sheet';

/**
 * 設計ツール一覧(モック「高級感 3」Q5 案件あり / Q6 案件なし)の、行の状態と右列。
 *
 * 設計ツールと物件カルテの項目の対応(カルテの ITEMS のラベル)。ここに無いツールは「カルテ外」。
 * 対応はモック Q5 の表から。項目名が変わったらここを直す。
 */
export const TOOL_TO_ITEM: Record<string, string> = {
  'area-table': '建蔽率・容積率の算定',
  'building-regulations': '建蔽率・容積率の算定',
  'fire-equipment': '消火設備の要否',
  'shadow-regulation': '日影規制の検討',
  'setback-regulation': '高さ制限・斜線の検討',
  'glass-thickness': '必要ガラス厚',
  'building-rainwater': '縦樋サイズの選定',
  section: '幅厚比・保有耐力接合',
  portal: '層間変形角・剛性率・偏心率',
  'force-flow': '荷重・外力の設定',
  beam: '荷重・外力の設定',
  nvalue: 'N値計算と接合金物',
  'load-calc': '荷重・外力の設定',
  'vent-24h': '換気量の算定',
  'vent-fire': '換気量の算定',
  'vent-occupancy': '採光・換気の検討',
  'aircon-business': '空調負荷と機器選定',
  'duct-sizing': '空調負荷と機器選定',
  plumbing: '給水管径の決定',
  illumination: '照度計算',
  'elec-capacity': '受電方式・契約電力の判定',
  'trunk-size': '幹線サイズ・電圧降下',
};

export type ToolState = { item?: string; status: 'done' | 'todo' | 'na' | 'out' | 'soon'; note?: string };

const LABEL: Record<string, string> = Object.fromEntries(DESIGN_TOOL_MENU.flatMap((c) => c.subTabs.map((t) => [t.id, t.label])));

/** 案件ありのとき、各ツールの状態(カルテの項目の状態 + このツールで保存した結果) */
export function useToolStates(): { mode: 'case' | 'free'; states: Record<string, ToolState>; progress: { done: number; total: number; cats: Array<[string, number, number]>; next: Array<[string, string]> } | null } {
  const { mode, currentCase } = useCase();
  const [out, setOut] = useState<ReturnType<typeof useToolStates>>({ mode, states: {}, progress: null });
  useEffect(() => {
    if (mode !== 'case' || !currentCase) {
      setOut({ mode, states: {}, progress: null });
      return;
    }
    const db = Store.load();
    const p = db?.projects.find((x) => x.id === currentCase.id);
    if (!db || !p) return;
    const studies = db.studies.filter((s) => s.projId === p.id);
    const checks = db.itemChecks[p.id] ?? {};
    const byLabel = new Map<string, ItemStatus>(ITEMS.map((it) => [it.label, itemStatus(it, studies, p, checks, db.itemRecs?.[p.id]?.[itemKey(it)])]));
    const saved = studiesOf(p.id);
    const states: Record<string, ToolState> = {};
    for (const c of DESIGN_TOOL_MENU) {
      for (const t of c.subTabs) {
        if (t.description.includes('準備中')) {
          states[t.id] = { item: TOOL_TO_ITEM[t.id], status: 'soon' };
          continue;
        }
        const own = saved.find((s) => s.tool === t.id);
        const item = TOOL_TO_ITEM[t.id];
        const st = item ? byLabel.get(item) : undefined;
        if (own) states[t.id] = { item, status: 'done', note: own.result };
        else if (!item || !st) states[t.id] = { status: 'out' };
        else states[t.id] = { item, status: st === 'na' ? 'na' : st === 'done' ? 'done' : 'todo' };
      }
    }
    const live = ITEMS.map((it) => ({ it, s: byLabel.get(it.label) })).filter((x) => x.s !== 'na');
    const cats = CATS.map(([k, l]) => {
      const list = live.filter((x) => x.it.cat === k);
      return [l, list.filter((x) => x.s === 'done').length, list.length] as [string, number, number];
    });
    const toolFor = (label: string) => Object.entries(TOOL_TO_ITEM).find(([, v]) => v === label)?.[0];
    const next = live
      .filter((x) => x.s !== 'done' && toolFor(x.it.label))
      .slice(0, 5)
      .map((x) => [x.it.label, toolFor(x.it.label)!] as [string, string]);
    setOut({ mode, states, progress: { done: live.filter((x) => x.s === 'done').length, total: live.length, cats, next } });
  }, [mode, currentCase]);
  return out;
}

export function StatusCell({ s }: { s?: ToolState }) {
  if (!s) return null;
  if (s.status === 'soon') return <span className="yy-st is-mute">準備中</span>;
  if (s.status === 'out') return <span className="yy-st is-mute">カルテ外</span>;
  if (s.status === 'na') return <span className="yy-st is-mute">対象外</span>;
  if (s.status === 'done') return <span className="yy-st is-done"><i className="yy-dot" />済{s.note ? ` · ${s.note}` : ''}</span>;
  return <span className="yy-st"><i className="yy-ring" />未着手</span>;
}

/** 右列 */
export function DesignIndexSide({ onOpen }: { onOpen: (sub: string) => void }) {
  const { mode, cases, currentCase } = useCase();
  const { progress } = useToolStates();
  const [recent, setRecent] = useState<RecentTool[]>([]);
  useEffect(() => setRecent(recentTools().filter((r) => LABEL[r.tool])), []);

  if (mode === 'case' && currentCase) {
    return (
      <aside className="yy-tix__side">
        <div className="yy-gray">
          <span className="yy-label">case — 案件</span>
          <span className="yy-gray__title">{currentCase.name}</span>
          {currentCase.sub && <span className="yy-gray__text">{currentCase.sub}</span>}
        </div>
        {progress && (
          <section>
            <SecHead no="I" title="進み具合" right="対象外を除く" />
            <div className="yy-prog">
              <b>{progress.done}</b>
              <span>/ {progress.total} 項目</span>
            </div>
            {progress.cats.map(([k, d, t]) => (
              <div key={k} className="yy-prog__row">
                <span>{k}</span>
                <span className="yy-prog__bar"><span style={{ width: `${t ? Math.round((d / t) * 100) : 0}%` }} /></span>
                <span className="yy-prog__n">{d} / {t}</span>
              </div>
            ))}
          </section>
        )}
        {progress && progress.next.length > 0 && (
          <section>
            <SecHead no="II" title="次にやること" />
            <ol className="yy-home__toc">
              {progress.next.map(([item, tool], i) => (
                <li key={item}>
                  <button type="button" className="yy-srcrow yy-srcrow--btn" onClick={() => onOpen(tool)}>
                    <span className="yy-home__tocno">{i + 1}</span>
                    <span className="yy-home__toct">{item}</span>
                    <span className="yy-leader" />
                    <span className="yy-next__tool">{LABEL[tool]}</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        )}
        <p className="yy-home__empty">* 状態は物件カルテの項目と、ここで「案件に保存」した結果から</p>
      </aside>
    );
  }

  return (
    <aside className="yy-tix__side">
      <section>
        <SecHead no="I" title="最近使ったツール" right="この端末" />
        {recent.length === 0 ? (
          <p className="yy-home__empty">ツールを開くとここに残ります</p>
        ) : (
          <ul className="yy-recent">
            {recent.slice(0, 5).map((r) => (
              <li key={r.tool}>
                <button type="button" onClick={() => onOpen(r.tool)}>
                  <span className="yy-recent__name">{LABEL[r.tool]}</span>
                  {r.result && <span className="yy-recent__v">{r.result}</span>}
                  <span className="yy-recent__at">{ago(r.at)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <SecHead no="II" title="よく一緒に使う" />
        <ol className="yy-home__toc">
          {[
            ['glass-thickness', 'condensation'],
            ['vent-24h', 'duct-sizing'],
            ['force-flow', 'section'],
            ['use-zone', 'building-regulations'],
          ].map(([a, b]) => (
            <li key={a}>
              <span className="yy-srcrow">
                <button type="button" className="yy-linkbtn yy-linkbtn--ink" onClick={() => onOpen(a)}>{LABEL[a]}</button>
                <span className="yy-leader" />
                <button type="button" className="yy-linkbtn yy-linkbtn--ink" onClick={() => onOpen(b)}>{LABEL[b]}</button>
              </span>
            </li>
          ))}
        </ol>
      </section>
      <div className="yy-gray">
        <span className="yy-label">case — 案件を選ぶと</span>
        <span className="yy-gray__text">要るツールだけに絞り、カルテの項目と 済 · 未着手 · 対象外 が並ぶ</span>
        {cases.length ? (
          <button type="button" className="yy-pill" onClick={() => setMode('case')}>案件を選んで使う</button>
        ) : (
          <a className="yy-pill" href="/karte/">物件カルテで案件を作る</a>
        )}
      </div>
    </aside>
  );
}
