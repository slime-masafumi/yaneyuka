'use client';

import React from 'react';
import { CALCS, defaults, type CalcOut, type Field } from '@/lib/karte/calcs';
import type { ItemRec, ItemStatus } from '@/lib/karte/engine';
import { stamp } from '@/lib/karte/engine';
import { GUIDES } from '@/lib/karte/guides';
import { itemKey, type ItemDef, type Project, type ToolKey } from '@/lib/karte/masters';
import { useInfoRows } from '@/lib/useInfoRows';

type Props = {
  it: ItemDef;
  project: Project;
  status: ItemStatus;
  rec: ItemRec;
  checked: boolean;
  onRec: (patch: Partial<ItemRec>) => void;
  onCheck: (on: boolean) => void;
  onOpenTool: (tool: ToolKey) => void;
};

const TOOL_NAME: Record<ToolKey, string> = { glass: '必要ガラス厚の計算', pipe: '縦樋の計算', fnb: '内装(区画)の計算' };

/** 入力欄 1 つ(数値・選択・はい/いいえ) */
function Input({ f, value, onChange }: { f: Field; value: string; onChange: (v: string) => void }) {
  const id = `kt-${f.k}`;
  let ctl: React.ReactNode;
  if (f.kind === 'sel') {
    ctl = (
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">選ぶ</option>
        {f.options.map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
    );
  } else if (f.kind === 'bool') {
    ctl = <input id={id} type="checkbox" checked={value === '1'} onChange={(e) => onChange(e.target.checked ? '1' : '')} />;
  } else {
    ctl = (
      <>
        <input id={id} type="number" inputMode="decimal" step={f.step ?? 'any'} value={value} onChange={(e) => onChange(e.target.value)} />
        {f.unit && <span className="yy-kt-unit">{f.unit}</span>}
      </>
    );
  }
  return (
    <div className={`yy-kt-in${f.kind === 'sel' ? ' is-sel' : ''}${f.kind === 'bool' ? ' is-bool' : ''}`}>
      <label htmlFor={id}>
        {f.label}
        {f.hint && <small>{f.hint}</small>}
      </label>
      <span className="yy-kt-in__v">{ctl}</span>
    </div>
  );
}

function Result({ out, saved, stale, onSave }: { out: CalcOut | null; saved?: ItemRec['res']; stale: boolean; onSave: () => void }) {
  if (!out) return <p className="yy-kt-note">値を入れると判定します。</p>;
  return (
    <div className={`yy-kt-res is-${out.verdict}`}>
      <div className="yy-kt-res__head">
        <span className="yy-label">判定</span>
        <b>{out.summary}</b>
      </div>
      <dl>
        {out.lines.map((l) => (
          <div key={l.k} className={l.ng ? 'is-ng' : undefined}>
            <dt>{l.k}</dt>
            <dd>{l.v}</dd>
          </div>
        ))}
      </dl>
      <div className="yy-kt-res__foot">
        <button type="button" className="yy-btn is-primary" onClick={onSave}>
          {saved ? '記録し直す' : 'この判定を記録'}
        </button>
        {saved && (
          <span className={stale ? 'is-stale' : undefined}>
            {stale ? '入力か物件の条件が変わりました。記録し直してください' : `記録 ${stamp(saved.at)} · ${saved.summary}`}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * 検討項目を開いたときの中身。確かめること・必要な値・根拠・見落とし(GUIDES)、
 * その場の判定(CALCS)、メモ、関係する記事、状態の操作。2026-11-14
 */
export default function ItemPanel({ it, project, status, rec, checked, onRec, onCheck, onOpenTool }: Props) {
  const key = itemKey(it);
  const g = GUIDES[key];
  const calc = CALCS[key];
  const vals = { ...(calc ? defaults(calc, project) : {}), ...(rec.vals ?? {}) };
  const out = calc ? calc.run(vals, project) : null;
  const stale = !!(rec.res && out && JSON.stringify(out.lines) !== JSON.stringify(rec.res.lines));
  const rows = useInfoRows(g?.sections, g?.posts);
  const ticks = new Set(rec.ticks ?? []);
  const autoNa = it.na ? it.na(project) : null;

  const tick = (i: number, onOff: boolean) => {
    const next = new Set(ticks);
    if (onOff) next.add(i);
    else next.delete(i);
    onRec({ ticks: [...next].sort((a, b) => a - b) });
  };

  return (
    <div className="yy-kt-item">
      <div className="yy-kt-item__bar">
        <span className="yy-kt-item__basis">根拠 {it.basis}</span>
        <span className="yy-kt-item__ops">
          {it.tool && (
            <button type="button" className="yy-kt-link" onClick={() => onOpenTool(it.tool as ToolKey)}>
              {TOOL_NAME[it.tool]}を開く →
            </button>
          )}
          {!calc && !it.tool && status !== 'na' && (
            <label className="yy-kt-item__chk">
              <input type="checkbox" checked={checked} onChange={(e) => onCheck(e.target.checked)} />
              確かめた(済にする)
            </label>
          )}
          {!autoNa && (
            <label className="yy-kt-item__chk is-mute">
              <input type="checkbox" checked={!!rec.na} onChange={(e) => onRec({ na: e.target.checked })} />
              この物件では対象外
            </label>
          )}
        </span>
      </div>
      {autoNa && <p className="yy-kt-item__na">{autoNa}</p>}

      <div className="yy-kt-item__grid">
        <div className="yy-kt-item__col">
          {g ? (
            <>
              <h4 className="yy-kt-item__h">確かめること</h4>
              <ol className="yy-kt-item__checks">
                {g.check.map((c, i) => (
                  <li key={i}>
                    <label>
                      <input type="checkbox" checked={ticks.has(i)} onChange={(e) => tick(i, e.target.checked)} />
                      <span>{c}</span>
                    </label>
                  </li>
                ))}
              </ol>
              <h4 className="yy-kt-item__h">必要な値・図書</h4>
              <ul className="yy-kt-item__list">
                {g.need.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
              <h4 className="yy-kt-item__h">根拠の要点</h4>
              <p className="yy-kt-item__p">{g.basis}</p>
              {g.pitfalls.length > 0 && (
                <>
                  <h4 className="yy-kt-item__h">よくある見落とし</h4>
                  <ul className="yy-kt-item__list is-warn">
                    {g.pitfalls.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <p className="yy-kt-note">この項目の解説は準備中です。</p>
          )}
        </div>

        <div className="yy-kt-item__col">
          {calc && (
            <>
              <h4 className="yy-kt-item__h">{calc.title}</h4>
              {calc.fields.length > 0 && (
                <div className="yy-kt-item__form">
                  {calc.fields.map((f) => (
                    <Input key={f.k} f={f} value={vals[f.k] ?? ''} onChange={(v) => onRec({ vals: { ...vals, [f.k]: v } })} />
                  ))}
                </div>
              )}
              <Result
                out={out}
                saved={rec.res}
                stale={stale}
                onSave={() => out && onRec({ res: { ...out, at: new Date().toISOString() } })}
              />
              {calc.note && <p className="yy-kt-note">{calc.note}</p>}
            </>
          )}

          <h4 className="yy-kt-item__h">メモ</h4>
          <textarea
            className="yy-kt-item__memo"
            rows={3}
            value={rec.memo ?? ''}
            placeholder="確かめた内容・前提・協議の結果など。確認書に載ります"
            onChange={(e) => onRec({ memo: e.target.value })}
          />

          {rows.length > 0 && (
            <>
              <h4 className="yy-kt-item__h">建築の調べもの</h4>
              <ul className="yy-kt-item__links">
                {rows.map((r) => (
                  <li key={r.href}>
                    <a href={r.href} target="_blank" rel="noopener">
                      <span>{r.title}</span>
                      <span className="yy-leader" />
                      <small>{r.kind === '材料情報' ? '早見表' : '読みもの'}</small>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
