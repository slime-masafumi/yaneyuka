'use client';

import React, { useEffect, useState } from 'react';
import { CASE_EVENT, getMode, loadCases, saveStudy, selectCase, setMode, studiesOf, touchRecent, type CaseInfo } from '@/lib/caseStudies';
import { infoRows } from '@/lib/infoLinks';

/**
 * 計算書の組版(モック「高級感 3」の ガラス厚 Q3 / 結露 Q7 / 換気 Q8 / 設計ツール一覧 Q5・Q6)で使う部品。
 *
 *   <ModeBar />                       案件を選んで使う / 案件なしで検討する
 *   <SheetHead no en title desc actions />  1 行の見出し + 二重線 + 右にボタン
 *   <Sheet left center right />       262px / 可変 / 270px の 3 段組
 *   <SecHead no title right />        明朝の番号と章題 + 黒の 1px
 *   <KV k v fromCase />               項目 ……… 値(● = 案件から)
 *   <Step n k f v strong />           計算の過程 1 行
 *   <ResultPanel label value unit sub>  濃い緑の答えの面(1 画面に 1 つ)
 *   <CaseSave tool result ok />       保存先の案件(灰色)
 *   <LookupList slug section />       調べもの(章の項目を索引の組み方で)
 */

export function SecHead({ no, title, right }: { no?: string; title: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="yy-sec">
      {no && <span className="yy-sec__no">{no}</span>}
      <span className="yy-sec__title">{title}</span>
      {right && <span className="yy-sec__right">{right}</span>}
    </div>
  );
}

export function KV({ k, v, fromCase }: { k: React.ReactNode; v: React.ReactNode; fromCase?: boolean }) {
  return (
    <div className="yy-kv">
      <span className="yy-kv__k">{k}</span>
      <span className="yy-leader" />
      <span className="yy-kv__v">
        {v}
        <i className={fromCase ? 'yy-dot' : 'yy-dot is-none'} aria-label={fromCase ? '案件から' : undefined} />
      </span>
    </div>
  );
}

export function Step({ n, k, f, v, strong }: { n: React.ReactNode; k: React.ReactNode; f?: React.ReactNode; v: React.ReactNode; strong?: boolean }) {
  return (
    <div className="yy-step">
      <span className="yy-step__n">{n}</span>
      <span className="yy-step__body">
        <span>{k}</span>
        {f && <span className="yy-step__f">{f}</span>}
      </span>
      <span className={`yy-step__v${strong ? ' is-strong' : ''}`}>{v}</span>
    </div>
  );
}

export function ResultPanel({ label, value, unit, sub, children }: { label: string; value: React.ReactNode; unit?: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="yy-result">
      <span className="yy-label yy-result__label">{label}</span>
      <div className="yy-result__main">
        <span className="yy-result__value">{value}</span>
        {unit && <span className="yy-result__unit">{unit}</span>}
      </div>
      {sub && <span className="yy-result__sub">{sub}</span>}
      {children && <div className="yy-result__more">{children}</div>}
    </div>
  );
}

/** 答えの面の中の「項目 …… 値」 */
export function ResultRow({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return (
    <div className="yy-result__row">
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}

export function SheetHead({ no, en, title, desc, actions }: { no: string; en: string; title: string; desc?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="yy-pagehead">
      <div className="yy-pagehead__row">
        <span className="yy-label">{`${no} — ${en}`}</span>
        <h2 className="yy-pagehead__title">{title}</h2>
        {desc && <span className="yy-pagehead__desc">{desc}</span>}
        {actions && <span className="yy-pagehead__right yy-sheet__actions">{actions}</span>}
      </div>
      <div className="yy-rule2" />
    </div>
  );
}

/** 見出しの右のボタン。primary は濃い緑の塗り(1 画面に 1 つ) */
export function SheetButton({ children, primary, onClick, disabled, title }: { children: React.ReactNode; primary?: boolean; onClick?: () => void; disabled?: boolean; title?: string }) {
  return (
    <button type="button" className={`yy-btn${primary ? ' is-primary' : ''}`} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
}

export function Sheet({ left, center, right }: { left: React.ReactNode; center: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="yy-sheet">
      <div className="yy-sheet__left">{left}</div>
      <div className="yy-sheet__center">{center}</div>
      <div className="yy-sheet__right">{right}</div>
    </div>
  );
}

/** 案件の一覧といまのモード。カルテ・モード切替・保存のたびに読み直す */
export function useCase() {
  const [state, setState] = useState<{ cases: CaseInfo[]; current: string | null; mode: 'case' | 'free' }>({ cases: [], current: null, mode: 'free' });
  useEffect(() => {
    const load = () => {
      const { cases, current } = loadCases();
      setState({ cases, current, mode: cases.length ? getMode() : 'free' });
    };
    load();
    window.addEventListener(CASE_EVENT, load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener(CASE_EVENT, load);
      window.removeEventListener('storage', load);
    };
  }, []);
  const current = state.cases.find((c) => c.id === state.current) ?? null;
  return { ...state, currentCase: current };
}

/** 案件を選んで使う / 案件なしで検討する(ツール一覧・ツール画面の上) */
export function ModeBar() {
  const { cases, mode, currentCase } = useCase();
  return (
    <div className="yy-modebar">
      <div className="yy-modebar__seg" role="tablist" aria-label="使い方">
        <button type="button" role="tab" aria-selected={mode === 'case'} disabled={!cases.length} title={cases.length ? undefined : '物件カルテで案件を作ると選べます'} onClick={() => setMode('case')}>
          <i />案件を選んで使う
        </button>
        <button type="button" role="tab" aria-selected={mode === 'free'} onClick={() => setMode('free')}>
          <i />案件なしで検討する
        </button>
      </div>
      {mode === 'case' && currentCase ? (
        <>
          <select className="yy-modebar__case" value={currentCase.id} onChange={(e) => selectCase(e.target.value)} aria-label="案件">
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="yy-modebar__sub">{currentCase.sub}</span>
          <a className="yy-modebar__link" href="/karte/">
            カルテ
          </a>
        </>
      ) : (
        <span className="yy-modebar__sub">
          {cases.length ? '条件はその場で入れます。結果はあとから案件に保存できます' : '条件はその場で入れます。物件カルテで案件を作ると、結果を案件に保存できます'}
          {!cases.length && (
            <>
              {' '}
              <a className="yy-modebar__link" href="/karte/">
                物件カルテを開く
              </a>
            </>
          )}
        </span>
      )}
    </div>
  );
}

/** 保存先の案件(灰色の面)+ 保存ボタン。tool は設計ツールの id、result は 1 行の結果 */
export function CaseSave({ tool, result, ok }: { tool: string; result: string; ok?: boolean }) {
  const { cases, current } = useCase();
  const [sel, setSel] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => setSel(current), [current]);
  useEffect(() => {
    touchRecent(tool, result);
  }, [tool, result]);
  if (!cases.length) {
    return (
      <div className="yy-gray">
        <span className="yy-label">case — 保存先の案件</span>
        <span className="yy-gray__text">物件カルテで案件を作ると、この結果を案件に控えておけます</span>
        <a className="yy-pill" href="/karte/">物件カルテを開く</a>
      </div>
    );
  }
  return (
    <div className="yy-gray">
      <span className="yy-label">case — 保存先の案件</span>
      <div className="yy-casepick">
        {cases.map((c) => {
          const done = studiesOf(c.id).find((s) => s.tool === tool);
          return (
            <label key={c.id} className={sel === c.id ? 'is-on' : undefined}>
              <input type="radio" name={`case-${tool}`} checked={sel === c.id} onChange={() => setSel(c.id)} />
              <span className="yy-casepick__name">{c.name}</span>
              <span className="yy-casepick__st">{done ? `済 · ${done.result}` : '未'}</span>
            </label>
          );
        })}
      </div>
      <button
        type="button"
        className="yy-pill"
        disabled={!sel || !result}
        onClick={() => {
          if (!sel) return;
          saveStudy(sel, { tool, result, ok });
          setSaved(sel);
        }}
      >
        {saved === sel ? '✓ 保存しました' : '案件に保存'}
      </button>
    </div>
  );
}

/** 調べもの:章の項目を「項目 ……… 形式」で */
/**
 * 建築の調べもの(材料情報の章・設計情報の記事)へのつなぎ。計算ツールの右列に出す。
 * 2026-11-14 まで LookupList(条文の目次)だった。対応は呼び出し側で章 id・記事 id を渡す(src/lib/infoLinks.ts)。
 */
export function InfoList({ sections = [], posts = [], no = 'V' }: { sections?: string[]; posts?: string[]; no?: string }) {
  const rows = infoRows(sections, posts);
  if (!rows.length) return null;
  return (
    <section className="yy-sheet__block">
      <SecHead no={no} title="建築の調べもの" right={`${rows.length} 件`} />
      <ul className="yy-matside__idx">
        {rows.map((r) => (
          <li key={r.href}>
            <a href={r.href} title={`${r.kind} · ${r.title}`}>
              <span className="yy-matside__it">{r.title}</span>
              <span className="yy-leader" />
              <span className="yy-fmt">{r.kind === '材料情報' ? '早見表' : '読みもの'}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
