/**
 * 物件カルテの「確認書」。全項目の状態・判定・メモ・計算の記録を 1 枚にまとめ、
 * PDF(印刷して PDF に保存)と Excel(.xlsx)で出す。2026-11-14
 *
 * 端末の中だけで作る(サーバーへ送らない)。
 */
import { itemStatus, stamp, type DB, type ItemStatus } from './engine';
import { CATS, ITEMS, STR_LABEL, USE_LABEL, itemKey, type Project } from './masters';

const ST_LABEL: Record<ItemStatus, string> = { done: '済', todo: '未着手', warn: '要確認', na: '対象外' };

export type ReportRow = {
  cat: string;
  no: string;
  label: string;
  basis: string;
  status: string;
  result: string;
  detail: string;
  memo: string;
  at: string;
};

export type Report = {
  project: Project;
  head: Array<[string, string]>;
  rows: ReportRow[];
  studies: Array<{ title: string; basis: string; result: string; ok: boolean; at: string; memo: string }>;
  counts: Record<ItemStatus, number>;
  made: string;
};

export function buildReport(db: DB): Report {
  const p = db.projects.find((x) => x.id === db.current) ?? db.projects[0];
  const studies = db.studies.filter((s) => s.projId === p.id);
  const checks = db.itemChecks[p.id] ?? {};
  const recs = db.itemRecs?.[p.id] ?? {};
  const counts: Record<ItemStatus, number> = { done: 0, todo: 0, warn: 0, na: 0 };
  const rows: ReportRow[] = [];
  for (const [cat, catLabel] of CATS) {
    ITEMS.filter((it) => it.cat === cat).forEach((it, i) => {
      const key = itemKey(it);
      const rec = recs[key] ?? {};
      const st = itemStatus(it, studies, p, checks, rec);
      counts[st] += 1;
      const tool = it.tool ? studies.find((s) => s.tool === it.tool) : undefined;
      const reason = st === 'na' ? (rec.na ? '手で対象外' : it.na?.(p) ?? '') : '';
      rows.push({
        cat: catLabel,
        no: String(i + 1).padStart(2, '0'),
        label: it.label,
        basis: it.basis,
        status: ST_LABEL[st],
        result: rec.res?.summary ?? (tool ? tool.result : reason),
        detail: rec.res ? rec.res.lines.map((l) => `${l.k}: ${l.v}`).join(' / ') : tool?.detail ?? '',
        memo: (rec.memo ?? '').trim(),
        at: rec.res ? stamp(rec.res.at) : tool ? stamp(tool.at) : '',
      });
    });
  }
  const head: Array<[string, string]> = [
    ['物件名', p.name],
    ['所在地', p.addr || '—'],
    ['用途', USE_LABEL[p.use] ?? ''],
    ['構造・階数', `${STR_LABEL[p.str] ?? ''} 地上 ${p.fl} 階${p.bf ? ` · 地下 ${p.bf} 階` : ''}`],
    ['延べ面積', p.area ? `${p.area.toLocaleString('ja-JP')} m²` : '—'],
    ['高さ', `${p.H} m`],
    ['用途地域', p.zone],
    ['防火地域', p.fire],
  ];
  return {
    project: p,
    head,
    rows,
    studies: studies.map((s) => ({ title: s.title, basis: s.basis, result: s.result, ok: s.ok, at: stamp(s.at), memo: s.memo ?? '' })),
    counts,
    made: stamp(new Date().toISOString()),
  };
}

const fileBase = (r: Report) => `物件カルテ確認書_${r.project.name.replace(/[\\/:*?"<>|\s]+/g, '_')}_${r.made.slice(0, 10)}`;

/* ───────── Excel ───────── */
export async function downloadXlsx(db: DB) {
  const r = buildReport(db);
  const XLSX = await import('xlsx');
  const aoa: (string | number)[][] = [
    ['物件カルテ 確認書'],
    ['作成', r.made],
    ...r.head.map(([k, v]) => [k, v]),
    ['集計', `済 ${r.counts.done} / 要確認 ${r.counts.warn} / 未着手 ${r.counts.todo} / 対象外 ${r.counts.na}`],
    [],
    ['分野', 'No', '項目', '根拠', '状態', '結果', '判定の内容', 'メモ', '記録日時'],
    ...r.rows.map((x) => [x.cat, x.no, x.label, x.basis, x.status, x.result, x.detail, x.memo, x.at]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [8, 4, 28, 22, 8, 24, 60, 40, 16].map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '確認書');
  if (r.studies.length) {
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['検討', '根拠', '結果', '判定', 'メモ', '日時'],
      ...r.studies.map((s) => [s.title, s.basis, s.result, s.ok ? '適合' : '要確認', s.memo, s.at]),
    ]);
    ws2['!cols'] = [20, 24, 20, 8, 40, 16].map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws2, '計算の記録');
  }
  XLSX.writeFile(wb, `${fileBase(r)}.xlsx`);
}

/* ───────── PDF(印刷) ───────── */
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

export function reportHtml(r: Report): string {
  const byCat = new Map<string, ReportRow[]>();
  for (const x of r.rows) byCat.set(x.cat, [...(byCat.get(x.cat) ?? []), x]);
  const sections = [...byCat.entries()]
    .map(
      ([cat, rows]) => `
<h2>${esc(cat)}</h2>
<table>
<colgroup><col style="width:5%"><col style="width:23%"><col style="width:17%"><col style="width:8%"><col style="width:47%"></colgroup>
<thead><tr><th>No</th><th>項目</th><th>根拠</th><th>状態</th><th>結果・メモ</th></tr></thead>
<tbody>
${rows
  .map(
    (x) => `<tr class="st-${esc(x.status)}"><td class="no">${x.no}</td><td>${esc(x.label)}</td><td class="mono">${esc(x.basis)}</td><td class="st">${esc(x.status)}</td><td>${
      x.result ? `<b>${esc(x.result)}</b>` : ''
    }${x.detail ? `<div class="d">${esc(x.detail)}</div>` : ''}${x.memo ? `<div class="m">メモ: ${esc(x.memo)}</div>` : ''}${x.at ? `<div class="at">${esc(x.at)}</div>` : ''}</td></tr>`
  )
  .join('\n')}
</tbody></table>`
    )
    .join('\n');
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${esc(fileBase(r))}</title>
<style>
@page { size: A4; margin: 14mm 12mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', sans-serif; font-size: 9pt; color: #141414; }
header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 6px; border-bottom: 1.2px solid #141414; }
h1 { margin: 0; font-family: 'Hiragino Mincho ProN', 'Yu Mincho', serif; font-size: 17pt; font-weight: 500; letter-spacing: 0.04em; }
.made { font-family: ui-monospace, Menlo, monospace; font-size: 7.5pt; color: #5c5c5a; }
.head { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0 14px; margin: 8px 0 4px; }
.head div { display: flex; gap: 6px; padding: 3px 0; border-bottom: 0.5px solid #d8d8d4; }
.head span { flex: 0 0 auto; color: #5c5c5a; font-size: 7.5pt; }
.head b { font-weight: 400; }
.sum { margin: 6px 0 2px; font-size: 8pt; color: #5c5c5a; }
h2 { margin: 14px 0 4px; font-family: 'Hiragino Mincho ProN', 'Yu Mincho', serif; font-size: 11pt; font-weight: 500; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th { padding: 3px 4px; border-bottom: 0.8px solid #141414; font-size: 7pt; font-weight: 400; text-align: left; color: #5c5c5a; }
td { padding: 4px; border-bottom: 0.5px solid #d8d8d4; vertical-align: top; line-height: 1.45; word-break: break-all; }
tr { page-break-inside: avoid; }
.no { font-family: ui-monospace, Menlo, monospace; color: #9a9a96; }
.mono { font-size: 7.5pt; color: #5c5c5a; }
.st { white-space: nowrap; }
.st-済 .st { color: #2E7D6B; }
.st-要確認 .st { color: #c8432f; }
.st-対象外 td { color: #9a9a96; }
td b { font-weight: 700; }
.d { font-size: 7.5pt; color: #5c5c5a; }
.m { margin-top: 2px; font-size: 8pt; }
.at { font-family: ui-monospace, Menlo, monospace; font-size: 6.5pt; color: #9a9a96; }
footer { margin-top: 12px; padding-top: 6px; border-top: 0.5px solid #d8d8d4; font-size: 7pt; color: #9a9a96; }
.sign { display: flex; gap: 10px; justify-content: flex-end; margin-top: 10px; }
.sign div { width: 70px; height: 54px; border: 0.5px solid #9a9a96; font-size: 7pt; color: #5c5c5a; padding: 2px 4px; }
</style></head><body>
<header><h1>物件カルテ 確認書</h1><span class="made">作成 ${esc(r.made)} · yaneyuka.com</span></header>
<div class="head">${r.head.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
<p class="sum">全 ${r.rows.length} 項目 · 済 ${r.counts.done} · 要確認 ${r.counts.warn} · 未着手 ${r.counts.todo} · 対象外 ${r.counts.na}</p>
<div class="sign"><div>作成</div><div>確認</div><div>承認</div></div>
${sections}
<footer>判定は法令の一般的な場合の目安です。特定行政庁の取扱い・条例・告示の緩和は含みません。最終判断は建築士など有資格者が最新の法令を確認して行ってください。</footer>
</body></html>`;
}

/** 見えない枠に確認書を描いて印刷の画面を出す(「PDF に保存」を選べば PDF になる) */
export function printReport(db: DB) {
  const html = reportHtml(buildReport(db));
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const w = frame.contentWindow;
  const go = () => {
    w.focus();
    w.print();
    setTimeout(() => frame.remove(), 60_000);
  };
  // 文字の読み込みを待ってから
  if (doc.readyState === 'complete') setTimeout(go, 50);
  else frame.addEventListener('load', go, { once: true });
}
