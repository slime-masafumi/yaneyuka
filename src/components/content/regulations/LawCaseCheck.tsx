'use client';

import React, { useEffect, useState } from 'react';
import { Store } from '@/lib/karte/engine';
import { USE_LABEL, STR_LABEL, type Project } from '@/lib/karte/masters';
import { evaluate } from '@/lib/regulationEngine';
import { NATIONAL_RULES } from '@/data/regulations/nationalRules';
import type { ProjectInput } from '@/data/regulations/types';
import { SecHead } from '@/components/ui/Sheet';

/**
 * 法規ページの「II 対象法令チェック」(モック「高級感 3」Q2)。
 * 物件カルテのいまの案件の条件を、対象法令チェック(regulationEngine)の入力に置き換えて判定し、
 * 該当 / 要確認 / 対象外 を 2 段組で出す。自治体の上乗せは入れない(全国共通の判定だけ)。
 * 細かい条件で判定し直すときは「対象法令チェック」タブ。
 */

const USE_MAP: Record<string, string> = {
  office: 'office',
  shop: 'retailStore',
  rest: 'restaurant',
  house: 'apartment',
  clinic: 'clinicNoBeds',
  hotel: 'hotel',
  school: 'school',
  factory: 'factory',
};
const STR_MAP: Record<string, ProjectInput['structure']> = { w: 'wood', s: 'steel', rc: 'rc', src: 'src' };

function toInput(p: Project): ProjectInput {
  return {
    municipalityId: '',
    workTypes: ['new'],
    useIds: [USE_MAP[p.use] ?? 'office'],
    totalFloorArea: p.area || 0,
    buildingArea: 0,
    siteArea: 0,
    floorsAbove: p.fl || 0,
    floorsBelow: p.bf || 0,
    maxHeight: p.H || 0,
    structure: STR_MAP[p.str] ?? 'other',
    zoning: p.zone || '未選択',
    inCityPlanningArea: true,
    urbanizationControlArea: false,
    storeArea: p.use === 'shop' ? p.area || 0 : 0,
    contractAmountManYen: 0,
    formChangeArea: 0,
    demolitionArea: 0,
    siteFlags: [],
  };
}

type Row = { title: string; st: 'hit' | 'check' | 'na' };

export default function LawCaseCheck({ onOpenCheck }: { onOpenCheck: () => void }) {
  const [view, setView] = useState<{ p: Project; rows: Row[]; asOf: string } | null | undefined>(undefined);
  useEffect(() => {
    const db = Store.load();
    const p = db ? db.projects.find((x) => x.id === db.current) ?? db.projects[0] : null;
    if (!p) {
      setView(null);
      return;
    }
    const res = evaluate(toInput(p));
    const hits = new Map<string, 'hit' | 'check'>();
    res.categories.forEach((c) => c.hits.forEach((h) => hits.set(h.rule.id, h.rule.confidence === 'definite' ? 'hit' : 'check')));
    const rows: Row[] = NATIONAL_RULES.map((r) => ({ title: r.title, st: hits.get(r.id) ?? 'na' }));
    // 該当 → 要確認 → 対象外 の順に 18 行まで
    rows.sort((a, b) => ['hit', 'check', 'na'].indexOf(a.st) - ['hit', 'check', 'na'].indexOf(b.st));
    setView({ p, rows, asOf: res.sourceCheckedAt?.slice(0, 10) ?? '' });
  }, []);

  if (view === undefined) return null;
  const head = <SecHead no="II" title="対象法令チェック" right={`全国共通の判定${view?.asOf ? ` · ${view.asOf} 時点` : ''} · 自治体の上乗せは別`} />;
  if (view === null) {
    return (
      <section className="yy-lawcheck">
        {head}
        <p className="yy-home__empty">
          物件カルテで案件を作ると、その用途・規模・用途地域で関わる法令をここで判定します。条件を入れて判定するときは{' '}
          <button type="button" className="yy-linkbtn" onClick={onOpenCheck}>対象法令チェック</button>
        </p>
      </section>
    );
  }
  const { p, rows } = view;
  const n = (st: Row['st']) => rows.filter((r) => r.st === st).length;
  return (
    <section className="yy-lawcheck">
      {head}
      <div className="yy-lawcheck__cond">
        {[
          ['案件', p.name],
          ['用途', USE_LABEL[p.use]],
          ['延べ面積', `${(p.area || 0).toLocaleString('ja-JP')} ㎡`],
          ['階数', `地上 ${p.fl}${p.bf ? ` · 地下 ${p.bf}` : ''}`],
          ['構造', STR_LABEL[p.str]],
          ['用途地域', p.zone],
          ['工事', '新築'],
        ].map(([k, v]) => (
          <span key={k}>
            <small>{k}</small>
            {v}
          </span>
        ))}
        <span className="yy-lawcheck__note"><i className="yy-dot" />案件の条件で判定 · 該当 {n('hit')} · 要確認 {n('check')} · 対象外 {n('na')}</span>
      </div>
      <ol className="yy-lawcheck__list">
        {rows.slice(0, 18).map((r, i) => (
          <li key={r.title} className={r.st === 'na' ? 'is-na' : undefined}>
            <span className="yy-home__tocno">{String(i + 1).padStart(2, '0')}</span>
            <span className="yy-home__toct">{r.title}</span>
            <span className="yy-leader" />
            <span className={`yy-lawcheck__st is-${r.st}`}>
              {r.st === 'hit' && <i className="yy-dot" />}
              {r.st === 'hit' ? '該当' : r.st === 'check' ? '要確認' : '対象外'}
            </span>
          </li>
        ))}
      </ol>
      <button type="button" className="yy-home__more yy-linkbtn" onClick={onOpenCheck}>
        条件を変えて判定する(対象法令チェック) ›
      </button>
    </section>
  );
}
