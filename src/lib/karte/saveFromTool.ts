/**
 * 設計ツール(/calc/{id}/ と設計ツール画面)の答えを、物件カルテの記録(Study)として保存する。2026-11-15
 *
 * ツールごとに作りが違うので、画面に出ている答えの面(.yy-result)と入力欄(label の中の input / select)を読む。
 * 保存先は物件カルテで今開いている物件(この端末のブラウザ。物件カルテと同じ保存場所)。
 */
import { Store, uid, type Study } from './engine';

export type SaveResult = { ok: true; project: string } | { ok: false; reason: 'no-karte' | 'no-result' };

function controlValue(el: HTMLInputElement | HTMLSelectElement): string {
  if (el instanceof HTMLSelectElement) return el.selectedOptions[0]?.textContent?.trim() ?? el.value;
  if (el.type === 'checkbox' || el.type === 'radio') return el.checked ? 'あり' : '';
  return el.value;
}

function readInputs(root: HTMLElement): Record<string, string> {
  const out: Record<string, string> = {};
  root.querySelectorAll('label').forEach((label) => {
    const ctl = label.querySelector('input, select') as HTMLInputElement | HTMLSelectElement | null;
    if (!ctl) return;
    const v = controlValue(ctl);
    if (!v) return;
    // 見出しは label の中の最初の文字(入力欄やヒントを除く)
    const head = (label.querySelector('span')?.textContent || label.textContent || '').trim().split('\n')[0].slice(0, 40);
    if (head && !(head in out)) out[head] = v.slice(0, 60);
  });
  return Object.fromEntries(Object.entries(out).slice(0, 14));
}

export function saveToolResult(root: HTMLElement, meta: { title: string; basis?: string; href?: string }): SaveResult {
  const db = Store.load();
  if (!db) return { ok: false, reason: 'no-karte' };
  const res = root.querySelector('.yy-result');
  if (!res) return { ok: false, reason: 'no-result' };
  const label = res.querySelector('.yy-result__label')?.textContent?.trim() ?? '';
  const value = res.querySelector('.yy-result__value')?.textContent?.trim() ?? '';
  const unit = res.querySelector('.yy-result__unit')?.textContent?.trim() ?? '';
  const sub = res.querySelector('.yy-result__sub')?.textContent?.trim() ?? '';
  const rows = Array.from(res.querySelectorAll('.yy-result__row'))
    .map((r) => Array.from(r.children).map((c) => c.textContent?.trim() ?? '').join(' '))
    .filter(Boolean);
  const study: Study = {
    id: uid(),
    projId: db.current,
    tool: 'dt',
    title: meta.title,
    basis: meta.basis || '設計ツール',
    deps: {},
    inputs: readInputs(root),
    result: [label && `${label}:`, value, unit].filter(Boolean).join(' '),
    ok: !res.classList.contains('is-ng'),
    detail: [sub, ...rows].filter(Boolean).join(' / ').slice(0, 600),
    memo: '',
    at: new Date().toISOString(),
    href: meta.href,
  };
  Store.save({ ...db, studies: [study, ...db.studies] });
  const project = db.projects.find((p) => p.id === db.current)?.name ?? '';
  return { ok: true, project };
}
