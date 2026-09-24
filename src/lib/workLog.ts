/**
 * 業務管理（工数記録）の計算と保存の形。画面から切り離してある（scripts/test-work-log.ts）。
 *
 * 設計事務所の一番の悩みは「この物件にどれだけ時間を使ったか＝設計料が妥当だったか」。
 * 工数を物件 × 工種で積み上げ、設計料が入っていれば時間単価と予算時間の消化率を出す。
 */

export const PHASES = ['企画・調査', '基本設計', '実施設計', '確認申請', '工事監理', '打合せ', 'その他'] as const;
export const NO_PHASE = '未分類';

export type WorkEntry = {
  id: string;
  projectId: string;
  description: string;
  hours: number | '';
  /** 工種。古い記録には無い（未分類として数える） */
  phase?: string;
};

export type WorkProject = {
  id: string;
  name: string;
  code: string;
  /** 設計料（円・税抜）。入っていれば時間単価を出す */
  fee?: number;
};

export type DailyRecords = Record<string, WorkEntry[]>;

// ---------------------------------------------------------------------------
// 日付
// ---------------------------------------------------------------------------

export const toLocalDateString = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 期間の決まり文句。today を渡すとテストできる */
export function periodPreset(kind: 'thisMonth' | 'lastMonth' | 'fiscalYear' | 'all', today = new Date()): [string, string] {
  const y = today.getFullYear();
  const m = today.getMonth();
  if (kind === 'thisMonth') return [toLocalDateString(new Date(y, m, 1)), toLocalDateString(today)];
  if (kind === 'lastMonth') return [toLocalDateString(new Date(y, m - 1, 1)), toLocalDateString(new Date(y, m, 0))];
  if (kind === 'fiscalYear') {
    // 4月始まり
    const fy = m >= 3 ? y : y - 1;
    return [toLocalDateString(new Date(fy, 3, 1)), toLocalDateString(today)];
  }
  return ['2000-01-01', toLocalDateString(today)];
}

// ---------------------------------------------------------------------------
// 保存の形（月ごとに1文書）
// ---------------------------------------------------------------------------

export const monthOf = (date: string) => date.slice(0, 7);

/** 日付ごとの記録を月ごとに分ける。空の行（案件も時間も無い）は保存しない */
export function splitByMonth(records: DailyRecords): Record<string, DailyRecords> {
  const out: Record<string, DailyRecords> = {};
  for (const [date, entries] of Object.entries(records)) {
    const kept = entries.filter((e) => e.projectId || e.description || e.hours !== '');
    if (!kept.length) continue;
    (out[monthOf(date)] ??= {})[date] = kept;
  }
  return out;
}

export function mergeMonths(months: Record<string, DailyRecords>): DailyRecords {
  return Object.assign({}, ...Object.values(months));
}

// ---------------------------------------------------------------------------
// 集計
// ---------------------------------------------------------------------------

export type ProjectStat = {
  projectId: string;
  code: string;
  name: string;
  hours: number;
  byPhase: Record<string, number>;
  fee?: number;
  /** 設計料 ÷ 時間 */
  hourlyValue?: number;
  /** 設計料 ÷ 目標時間単価 */
  budgetHours?: number;
  /** 使った時間 ÷ 予算時間 */
  usage?: number;
};

/**
 * 期間内の物件別・工種別の時間。
 * 時間単価と予算の消化率は「その物件の全期間の時間」で見るべきなので、allTime を別に渡す。
 */
export function projectStats(
  records: DailyRecords,
  projects: WorkProject[],
  start: string,
  end: string,
  targetRate?: number
): { list: ProjectStat[]; total: number; byPhase: Record<string, number> } {
  const map = new Map<string, ProjectStat>();
  const allTime = new Map<string, number>();
  const byPhase: Record<string, number> = {};
  let total = 0;
  for (const [date, entries] of Object.entries(records)) {
    for (const e of entries) {
      const h = Number(e.hours);
      if (!e.projectId || !(h > 0)) continue;
      allTime.set(e.projectId, (allTime.get(e.projectId) ?? 0) + h);
      if (date < start || date > end) continue;
      const p = projects.find((x) => x.id === e.projectId);
      const stat = map.get(e.projectId) ?? { projectId: e.projectId, code: p?.code ?? '', name: p?.name ?? '（削除した案件）', hours: 0, byPhase: {} };
      const phase = e.phase || NO_PHASE;
      stat.hours += h;
      stat.byPhase[phase] = (stat.byPhase[phase] ?? 0) + h;
      byPhase[phase] = (byPhase[phase] ?? 0) + h;
      total += h;
      map.set(e.projectId, stat);
    }
  }
  const list = [...map.values()].map((s) => {
    const p = projects.find((x) => x.id === s.projectId);
    const fee = p?.fee && p.fee > 0 ? p.fee : undefined;
    const spent = allTime.get(s.projectId) ?? s.hours;
    const budgetHours = fee && targetRate && targetRate > 0 ? fee / targetRate : undefined;
    return {
      ...s,
      fee,
      hourlyValue: fee ? fee / spent : undefined,
      budgetHours,
      usage: budgetHours ? spent / budgetHours : undefined,
    };
  });
  list.sort((a, b) => b.hours - a.hours);
  return { list, total, byPhase };
}

const csvCell = (value: unknown): string => `"${String(value ?? '').replace(/"/g, '""')}"`;

/** 期間の明細 CSV（Excel で開けるよう BOM 付き） */
export function toCsv(records: DailyRecords, projects: WorkProject[], start: string, end: string): string {
  const rows = ['日付,プロジェクトNo,プロジェクト名,工種,作業内容,工数(h)'];
  for (const date of Object.keys(records).sort()) {
    if (date < start || date > end) continue;
    const entries = records[date]
      .filter((e) => e.projectId && Number(e.hours) > 0)
      .sort((a, b) => (projects.find((p) => p.id === a.projectId)?.code ?? '').localeCompare(projects.find((p) => p.id === b.projectId)?.code ?? ''));
    for (const e of entries) {
      const p = projects.find((x) => x.id === e.projectId);
      rows.push([date, p?.code, p?.name, e.phase || NO_PHASE, e.description, e.hours].map(csvCell).join(','));
    }
  }
  return '﻿' + rows.join('\n') + '\n';
}

export const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;
