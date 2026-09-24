/**
 * スケジュール調整の補助（候補日のまとめ作成・確定した日の時刻・回答の CSV）。
 * テスト: node scripts/test-schedule-batch.ts
 */

export type Slot = 'am' | 'pm';
export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * 期間・曜日・時間帯から候補を作る。「来週〜再来週の平日の午後」や「毎週火曜の定例」を一度に並べる。
 * 候補が多すぎると回答する側が疲れるので max で打ち切る。
 */
export function generateCandidates(from: string, to: string, weekdays: number[], slots: Slot[], max = 40): { date: string; slot: Slot }[] {
  if (!from || !to || !slots.length || !weekdays.length) return [];
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const end = new Date(ty, tm - 1, td);
  const out: { date: string; slot: Slot }[] = [];
  for (const d = new Date(fy, fm - 1, fd); d <= end && out.length < max; d.setDate(d.getDate() + 1)) {
    if (!weekdays.includes(d.getDay())) continue;
    for (const s of slots) if (out.length < max) out.push({ date: iso(d), slot: s });
  }
  return out;
}

/** 「9/24(木) 午前」— 既存の候補ラベルと同じ書式 */
export function candidateLabel(date: string, slot: Slot): string {
  const [y, m, d] = date.split('-').map(Number);
  const w = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${m}/${d}(${w}) ${slot === 'am' ? '午前' : '午後'}`;
}

/**
 * 候補のラベルから時刻を読む（確定した日を .ics やカレンダーに入れるとき）。
 * 「10:00〜11:30」があればそれ、「午前」は 9:00〜12:00、「午後」は 13:00〜17:00（作成画面と同じ）。
 * 読めなければ null（終日で入れる）。
 */
export function timeRangeOf(label: string): { startHour: string; startMinute: string; endHour: string; endMinute: string } | null {
  const m = label.match(/(\d{1,2}):(\d{2})\s*[〜~\-－]\s*(\d{1,2}):(\d{2})/);
  if (m) return { startHour: m[1].padStart(2, '0'), startMinute: m[2], endHour: m[3].padStart(2, '0'), endMinute: m[4] };
  if (/午前/.test(label)) return { startHour: '09', startMinute: '00', endHour: '12', endMinute: '00' };
  if (/午後/.test(label)) return { startHour: '13', startMinute: '00', endHour: '17', endMinute: '00' };
  return null;
}

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const MARK: Record<string, string> = { yes: '○', maybe: '△', no: '×' };

/** 回答の一覧を CSV に（行＝参加者、列＝候補）。最後に集計行を付ける */
export function responsesCsv(
  options: { id: string; label: string }[],
  participants: { id: string; name: string; comment?: string }[],
  responses: { participantId: string; optionId: string; value: string }[]
): string {
  const lines = [['名前', ...options.map((o) => o.label), 'コメント'].map(csvCell).join(',')];
  for (const p of participants) {
    const row = options.map((o) => MARK[responses.find((r) => r.participantId === p.id && r.optionId === o.id)?.value ?? ''] ?? '');
    lines.push([p.name, ...row, p.comment ?? ''].map(csvCell).join(','));
  }
  const count = (o: { id: string }) => responses.filter((r) => r.optionId === o.id && r.value === 'yes').length;
  lines.push(['○ の数', ...options.map(count), ''].map(csvCell).join(','));
  return '﻿' + lines.join('\n') + '\n';
}
