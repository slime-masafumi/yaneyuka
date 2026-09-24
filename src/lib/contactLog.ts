/**
 * 担当者連絡先の「やり取りの履歴」（純粋ロジック）。
 * 連絡先 1 件（users/{uid}/contacts/{id}）の `log` 配列に、いつ・何を・どうなったかを積む。
 * サンプルは状態（依頼中 → 到着 → 返却）を持ち、見積は金額を持つ。
 *
 * 役割分担: 人とのやり取りはここ。URL・カタログ・CAD などの資料はブックマーク（メーカー資料箱）。
 */

export const LOG_KINDS = ['問合せ', '回答', '見積', 'サンプル', 'カタログ', '打合せ', '電話・メール'] as const;
export type LogKind = (typeof LOG_KINDS)[number];

export const SAMPLE_STATES = ['依頼中', '到着', '返却済', '返却不要'] as const;
export type SampleState = (typeof SAMPLE_STATES)[number];

export type ContactLogEntry = {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  kind: LogKind;
  text: string;
  /** サンプルだけ */
  status?: SampleState;
  /** 見積だけ（税込・円） */
  amount?: number | null;
  project?: string;
  /** 自動で記録したもの（Maker conect など） */
  source?: string;
};

export type ContactWithLog = { id?: string; company?: string; name?: string; project?: string; log?: ContactLogEntry[] };

const pad = (n: number) => String(n).padStart(2, '0');
export const todayYmd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const newLogId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function daysBetween(from: string, to: string): number {
  const p = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((p(to) - p(from)) / 86400000);
}

/** 新しい順（同じ日なら後から足したものが上） */
export function sortLog(log: ContactLogEntry[] = []): ContactLogEntry[] {
  return [...log].sort((a, b) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1));
}

export const isOpenSample = (e: ContactLogEntry) => e.kind === 'サンプル' && (e.status === '依頼中' || e.status === '到着');

/** 到着してから返却まで何日で「返し忘れ」とみなすか */
export const RETURN_WARN_DAYS = 30;

export type LogSummary = { count: number; last: string | null; openSamples: number; returnDue: number };

export function summarize(log: ContactLogEntry[] = [], today: string): LogSummary {
  let last: string | null = null;
  let openSamples = 0;
  let returnDue = 0;
  for (const e of log) {
    if (!last || e.date > last) last = e.date;
    if (isOpenSample(e)) {
      openSamples++;
      if (e.status === '到着' && daysBetween(e.date, today) >= RETURN_WARN_DAYS) returnDue++;
    }
  }
  return { count: log.length, last, openSamples, returnDue };
}

export type LedgerRow = { contactId: string; company: string; name: string; entry: ContactLogEntry; days: number };

/** 全連絡先を横断したサンプル台帳（返却待ち → 依頼中 → 済みの順、各々古い順） */
export function sampleLedger(contacts: ContactWithLog[], today: string, includeClosed = false): LedgerRow[] {
  const rank = (s?: SampleState) => (s === '到着' ? 0 : s === '依頼中' ? 1 : 2);
  const rows: LedgerRow[] = [];
  for (const c of contacts) {
    for (const e of c.log ?? []) {
      if (e.kind !== 'サンプル') continue;
      if (!includeClosed && !isOpenSample(e)) continue;
      rows.push({ contactId: c.id ?? '', company: c.company ?? '', name: c.name ?? '', entry: e, days: daysBetween(e.date, today) });
    }
  }
  return rows.sort((a, b) => rank(a.entry.status) - rank(b.entry.status) || (a.entry.date < b.entry.date ? -1 : 1));
}

/** 見積の履歴（新しい順）と、案件ごとの合計 */
export function quoteLedger(contacts: ContactWithLog[], today: string): { rows: LedgerRow[]; byProject: Array<{ project: string; total: number; count: number }> } {
  const rows: LedgerRow[] = [];
  for (const c of contacts) {
    for (const e of c.log ?? []) {
      if (e.kind === '見積') rows.push({ contactId: c.id ?? '', company: c.company ?? '', name: c.name ?? '', entry: e, days: daysBetween(e.date, today) });
    }
  }
  rows.sort((a, b) => (a.entry.date < b.entry.date ? 1 : -1));
  const map = new Map<string, { total: number; count: number }>();
  for (const r of rows) {
    const p = r.entry.project?.trim() || '（案件なし）';
    const cur = map.get(p) ?? { total: 0, count: 0 };
    cur.total += r.entry.amount ?? 0;
    cur.count += 1;
    map.set(p, cur);
  }
  const byProject = [...map.entries()].map(([project, v]) => ({ project, ...v })).sort((a, b) => b.total - a.total);
  return { rows, byProject };
}

/** Maker conect の依頼目的を履歴の種類にする */
export function entryFromPurpose(purpose: string, text: string, date: string): ContactLogEntry {
  const base = { id: newLogId(), date, text, source: 'Maker conect' };
  if (purpose === 'サンプル請求') return { ...base, kind: 'サンプル', status: '依頼中' };
  if (purpose === 'カタログ請求') return { ...base, kind: 'カタログ' };
  if (purpose === '打合せ依頼') return { ...base, kind: '打合せ' };
  return { ...base, kind: '問合せ' };
}

const normCompany = (s: string) =>
  s
    .normalize('NFKC')
    .replace(/株式会社|\(株\)|㈱|有限会社|\(有\)|合同会社/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();

/** 会社名で既存の連絡先を探す（株式会社・㈱・空白の違いは無視） */
export function findByCompany<T extends ContactWithLog>(contacts: T[], company: string): T | null {
  const key = normCompany(company);
  if (!key) return null;
  return contacts.find((c) => c.company && normCompany(c.company) === key) ?? null;
}

/** yychat の呼び名だけのドキュメント（同じコレクションに入っている）は連絡先ではない */
export function isChatNicknameOnly(data: Record<string, unknown>): boolean {
  return 'nickname' in data && typeof data.createdAt !== 'number' && !data.company && !data.name;
}

/** 履歴の CSV（全連絡先） */
export function logCsv(contacts: ContactWithLog[]): string {
  const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows: unknown[][] = [['日付', '会社', '担当', '種類', '内容', '状態', '金額', '案件', '記録元']];
  for (const c of contacts) {
    for (const e of sortLog(c.log)) {
      rows.push([e.date, c.company ?? '', c.name ?? '', e.kind, e.text, e.status ?? '', e.amount ?? '', e.project ?? c.project ?? '', e.source ?? '']);
    }
  }
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\n') + '\n';
}
