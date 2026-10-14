/**
 * 設計ツール「工程表」の計算（画面から切り離してある）。
 * テスト: node scripts/test-gantt.ts
 *
 * - 稼働日: 日曜・祝日・年末年始・お盆を休みにできる（土曜は既定で稼働。現場は 4 週 6 休が多い）
 * - 前工程: 前の工程が終わった次の稼働日から始める（終了→開始・1 本だけ）。前が延びたら後ろを押し出す
 * - クリティカルパス: 前工程のつながりで、1 日延びると竣工が延びる工程
 * - 大項目: 次の大項目までの工程をまとめ、期間は中身から決まる
 * - 書き出し: CSV（Excel で開ける）と .ics（カレンダー）
 *
 * 日付は必ずローカルの YYYY-MM-DD 文字列で扱う（toISOString は UTC に寄って前日になる）。
 * このファイルは import を持たない（node でそのまま読めるように）。
 */

export type GanttKind = 'task' | 'milestone' | 'group';

export type GanttTask = {
  id: number;
  name: string;
  /** YYYY-MM-DD。マイルストーンは start = end */
  start: string;
  end: string;
  color: string;
  /** バーの中に書く文字 */
  innerText: string;
  order: number;
  /** 旧データには無い（= task） */
  kind?: GanttKind;
  /** 前工程の id。前が終わってから始める */
  after?: number | null;
  /** 前工程が終わってから空ける稼働日数（養生期間など） */
  lag?: number;
  /** 進捗 0〜100 */
  progress?: number;
  /** 基準計画（当初の予定）。遅れの説明に使う */
  baseStart?: string;
  baseEnd?: string;
  note?: string;
};

export type WorkCalendar = {
  sunday: boolean;
  saturday: boolean;
  holidays: boolean;
  /** 12/29〜1/3 */
  yearEnd: boolean;
  /** 8/13〜8/16 */
  summer: boolean;
  /** 現場の休工日（YYYY-MM-DD） */
  extraOff?: string[];
};

export const DEFAULT_CALENDAR: WorkCalendar = { sunday: true, saturday: false, holidays: true, yearEnd: true, summer: true };

/** 祝日 { 'YYYY-MM-DD': '名前' } */
export type Holidays = Record<string, string>;

const pad = (n: number) => String(n).padStart(2, '0');
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parse(s).getTime());
export const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
const dayMs = 24 * 60 * 60 * 1000;
/** b - a（暦日） */
export const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / dayMs);

export const kindOf = (t: Pick<GanttTask, 'kind'>): GanttKind => t.kind ?? 'task';

// ------------------------------------------------------------------ 稼働日

/** 休みの理由（稼働日なら null） */
export function offReason(date: string, cal: WorkCalendar, holidays: Holidays): string | null {
  const d = parse(date);
  const md = date.slice(5);
  if (cal.extraOff?.includes(date)) return '休工日';
  if (cal.yearEnd && (md >= '12-29' || md <= '01-03')) return '年末年始';
  if (cal.summer && md >= '08-13' && md <= '08-16') return 'お盆';
  if (cal.holidays && holidays[date]) return holidays[date];
  if (cal.sunday && d.getDay() === 0) return '日曜';
  if (cal.saturday && d.getDay() === 6) return '土曜';
  return null;
}

export const isWorkday = (date: string, cal: WorkCalendar, holidays: Holidays) => offReason(date, cal, holidays) === null;

/** その日が休みなら次の稼働日へ（全部休みの設定でも止まるよう 400 日で打ち切る） */
export function nextWorkday(date: string, cal: WorkCalendar, holidays: Holidays): string {
  let d = date;
  for (let i = 0; i < 400 && !isWorkday(d, cal, holidays); i++) d = addDays(d, 1);
  return d;
}

/** 開始日から数えて n 稼働日目の日（n=1 なら開始日。開始日が休みなら次の稼働日から数える） */
export function addWorkdays(start: string, n: number, cal: WorkCalendar, holidays: Holidays): string {
  let d = nextWorkday(start, cal, holidays);
  for (let i = 1; i < Math.max(1, n); i++) d = nextWorkday(addDays(d, 1), cal, holidays);
  return d;
}

/** n 稼働日ずらす（負なら前へ）。着いた先が休みなら同じ向きに稼働日まで進む */
export function shiftWorkdays(date: string, n: number, cal: WorkCalendar, holidays: Holidays): string {
  const step = n >= 0 ? 1 : -1;
  let d = date;
  for (let i = 0; i < Math.abs(n); i++) {
    d = addDays(d, step);
    for (let g = 0; g < 400 && !isWorkday(d, cal, holidays); g++) d = addDays(d, step);
  }
  return d;
}

/**
 * 工程をまとめて n 稼働日ずらす（工期の変更・着工日の変更）。所要の稼働日数は保つ。
 * 大項目は中身から決まるので触らない。
 */
export function shiftTasks(tasks: GanttTask[], ids: Set<number>, n: number, cal: WorkCalendar, holidays: Holidays): GanttTask[] {
  return tasks.map((t) => {
    if (!ids.has(t.id) || kindOf(t) === 'group' || !isDate(t.start)) return t;
    if (kindOf(t) === 'milestone') {
      const d = shiftWorkdays(t.start, n, cal, holidays);
      return { ...t, start: d, end: d };
    }
    const dur = workdaysBetween(t.start, t.end, cal, holidays);
    const s = shiftWorkdays(nextWorkday(t.start, cal, holidays), n, cal, holidays);
    return { ...t, start: s, end: addWorkdays(s, dur, cal, holidays) };
  });
}

/** start〜end（両端を含む）の稼働日数。休みばかりでも最低 1 */
export function workdaysBetween(start: string, end: string, cal: WorkCalendar, holidays: Holidays): number {
  if (!isDate(start) || !isDate(end) || end < start) return 1;
  let n = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) if (isWorkday(d, cal, holidays)) n++;
  return Math.max(1, n);
}

// ------------------------------------------------------------------ 大項目

/** 大項目の下にある工程（次の大項目まで） */
export function childrenOf(tasks: GanttTask[], groupId: number): GanttTask[] {
  const i = tasks.findIndex((t) => t.id === groupId);
  if (i < 0) return [];
  const out: GanttTask[] = [];
  for (let j = i + 1; j < tasks.length && kindOf(tasks[j]) !== 'group'; j++) out.push(tasks[j]);
  return out;
}

/** 大項目の期間と進捗（中身から決める）。中身が無ければ null */
export function groupSpan(tasks: GanttTask[], groupId: number): { start: string; end: string; progress: number } | null {
  const kids = childrenOf(tasks, groupId).filter((t) => isDate(t.start) && isDate(t.end));
  if (!kids.length) return null;
  const start = kids.map((t) => t.start).sort()[0];
  const end = kids.map((t) => t.end).sort().reverse()[0];
  // 進捗は日数で重み付け
  let w = 0;
  let p = 0;
  for (const k of kids) {
    if (kindOf(k) === 'milestone') continue;
    const len = daysBetween(k.start, k.end) + 1;
    w += len;
    p += len * (k.progress ?? 0);
  }
  return { start, end, progress: w ? Math.round(p / w) : 0 };
}

// ------------------------------------------------------------------ 前工程

/** 前工程に合わせた最も早い開始日。前工程が無い・壊れていれば null */
export function earliestStart(t: GanttTask, byId: Map<number, GanttTask>, cal: WorkCalendar, holidays: Holidays): string | null {
  if (t.after == null) return null;
  const p = byId.get(t.after);
  if (!p || p.id === t.id || kindOf(p) === 'group' || !isDate(p.end)) return null;
  const lag = Math.max(0, t.lag ?? 0);
  // マイルストーン（上棟・検査など）は前工程の終わった日に置く。工程は次の稼働日から
  if (kindOf(t) === 'milestone') return lag ? addWorkdays(addDays(p.end, 1), lag, cal, holidays) : p.end;
  return addWorkdays(addDays(p.end, 1), lag + 1, cal, holidays);
}

/**
 * 前工程が延びた分だけ後ろを押し出す（早まったときは引き寄せない。現場で決めた日を勝手に動かさない）。
 * 所要は稼働日数を保つ。完了（進捗 100）の工程は実績なので動かさない。
 * 循環した指定は無視する。動いた工程の id を返す。
 */
export function cascade(tasks: GanttTask[], cal: WorkCalendar, holidays: Holidays): { tasks: GanttTask[]; moved: number[] } {
  const byId = new Map(tasks.map((t) => [t.id, { ...t }]));
  const moved = new Set<number>();
  const done = new Set<number>();
  const visiting = new Set<number>();

  const visit = (id: number) => {
    if (done.has(id) || visiting.has(id)) return;
    const t = byId.get(id)!;
    visiting.add(id);
    if (t.after != null && byId.has(t.after)) visit(t.after);
    if (kindOf(t) !== 'group' && (t.progress ?? 0) < 100 && isDate(t.start) && isDate(t.end)) {
      const es = earliestStart(t, byId, cal, holidays);
      if (es && es > t.start) {
        if (kindOf(t) === 'milestone') {
          t.start = t.end = es;
        } else {
          const dur = workdaysBetween(t.start, t.end, cal, holidays);
          t.start = es;
          t.end = addWorkdays(es, dur, cal, holidays);
        }
        moved.add(id);
      }
    }
    visiting.delete(id);
    done.add(id);
  };
  for (const t of tasks) visit(t.id);
  return { tasks: tasks.map((t) => byId.get(t.id)!), moved: [...moved] };
}

/** 前工程にしてよいか（自分・大項目・循環になるものは不可） */
export function canLink(tasks: GanttTask[], id: number, after: number): boolean {
  if (id === after) return false;
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const p = byId.get(after);
  if (!p || kindOf(p) === 'group') return false;
  // after から前工程をたどって id に戻ってきたら循環
  let cur: GanttTask | undefined = p;
  for (let i = 0; cur && i < tasks.length + 1; i++) {
    if (cur.after == null) return true;
    if (cur.after === id) return false;
    cur = byId.get(cur.after);
  }
  return true;
}

/**
 * クリティカルパス。全体の終わり（最も遅い終了日）から前工程のつながりを逆にたどり、
 * 余裕（後ろの工程が始まるまでの空き稼働日）が 0 の工程を返す。
 * 前工程を 1 本も結んでいない工程は、全体の終わりに当たるものだけが入る。
 */
export function criticalPath(tasks: GanttTask[], cal: WorkCalendar, holidays: Holidays): Set<number> {
  const real = tasks.filter((t) => kindOf(t) !== 'group' && isDate(t.start) && isDate(t.end));
  if (!real.length) return new Set();
  const finish = real.map((t) => t.end).sort().reverse()[0];
  const byId = new Map(real.map((t) => [t.id, t]));
  const out = new Set<number>();
  // 終わりに当たる工程から逆向きにたどる
  const stack = real.filter((t) => t.end === finish).map((t) => t.id);
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    const t = byId.get(id)!;
    if (t.after == null) continue;
    const p = byId.get(t.after);
    if (!p) continue;
    // 前工程が終わってすぐ（休みを挟んでも）始まっていれば、前工程の遅れがそのまま響く
    const es = earliestStart(t, byId, cal, holidays);
    if (es && es >= t.start) stack.push(p.id);
  }
  return out;
}

// ------------------------------------------------------------------ 遅れ

/** 今日の時点で終わっているはずの割合（稼働日で按分） */
export function plannedProgress(t: GanttTask, today: string, cal: WorkCalendar, holidays: Holidays): number {
  if (!isDate(t.start) || !isDate(t.end)) return 0;
  if (today < t.start) return 0;
  if (today >= t.end) return 100;
  const total = workdaysBetween(t.start, t.end, cal, holidays);
  const done = workdaysBetween(t.start, addDays(today, -1), cal, holidays);
  return Math.min(100, Math.round(((today > t.start ? done : 0) / total) * 100));
}

/** 遅れているか（予定の進み具合より 10 ポイント以上遅い） */
export function isBehind(t: GanttTask, today: string, cal: WorkCalendar, holidays: Holidays): boolean {
  if (kindOf(t) === 'group') return false;
  const actual = t.progress ?? 0;
  if (actual >= 100) return false;
  if (kindOf(t) === 'milestone') return today > t.end;
  return plannedProgress(t, today, cal, holidays) - actual >= 10;
}

// ------------------------------------------------------------------ 表示範囲

export type Unit = 'day' | 'week' | 'month';

/** 工程の最初の月の 1 日から months か月（最後の月の末日まで）。start を指定すればその月から */
export function displayRange(tasks: GanttTask[], months: number, startOverride?: string): { start: string; end: string; days: number } {
  const dates = tasks.filter((t) => isDate(t.start)).map((t) => t.start).sort();
  const base = startOverride && isDate(startOverride) ? startOverride : dates[0] ?? iso(new Date());
  const b = parse(base);
  const start = iso(new Date(b.getFullYear(), b.getMonth(), 1));
  const end = iso(new Date(b.getFullYear(), b.getMonth() + months, 0));
  return { start, end, days: daysBetween(start, end) + 1 };
}

/** 工程が全部入る月数（最低 1・最大 36） */
export function monthsToFit(tasks: GanttTask[], startOverride?: string): number {
  const ends = tasks.filter((t) => isDate(t.end)).map((t) => t.end).sort();
  const starts = tasks.filter((t) => isDate(t.start)).map((t) => t.start).sort();
  if (!ends.length) return 3;
  const s = parse(startOverride && isDate(startOverride) ? startOverride : starts[0]);
  const e = parse(ends[ends.length - 1]);
  const m = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
  return Math.min(36, Math.max(1, m));
}

/** 見出しの区切り（単位ごと）。from は表示開始からの日数、len は日数 */
export function headerCells(range: { start: string; days: number }, unit: Unit): { from: number; len: number; label: string }[] {
  const out: { from: number; len: number; label: string }[] = [];
  if (unit === 'month') {
    let i = 0;
    while (i < range.days) {
      const d = parse(addDays(range.start, i));
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const len = Math.min(last - d.getDate() + 1, range.days - i);
      out.push({ from: i, len, label: `${d.getMonth() + 1}` });
      i += len;
    }
  } else if (unit === 'week') {
    // 月曜始まり。範囲の頭が月曜でなければ最初の週は短い
    let i = 0;
    while (i < range.days) {
      const d = parse(addDays(range.start, i));
      const toSun = (7 - d.getDay()) % 7; // その週の日曜までの日数（月曜なら 6、日曜なら 0）
      const len = Math.min(toSun + 1, range.days - i);
      out.push({ from: i, len, label: `${d.getMonth() + 1}/${d.getDate()}` });
      i += len;
    }
  } else {
    for (let i = 0; i < range.days; i++) out.push({ from: i, len: 1, label: String(parse(addDays(range.start, i)).getDate()) });
  }
  return out;
}

/** 月の区切り（見出しの上段）。label は「2026年 10月」 */
export function monthCells(range: { start: string; days: number }, unit: Unit): { from: number; len: number; label: string }[] {
  const months = headerCells(range, 'month');
  if (unit !== 'month') {
    return months.map((m) => {
      const d = parse(addDays(range.start, m.from));
      return { ...m, label: `${d.getFullYear()}年 ${d.getMonth() + 1}月` };
    });
  }
  // 月表示の上段は年
  const out: { from: number; len: number; label: string }[] = [];
  for (const m of months) {
    const y = parse(addDays(range.start, m.from)).getFullYear();
    const prev = out[out.length - 1];
    if (prev && prev.label === `${y}年`) prev.len += m.len;
    else out.push({ from: m.from, len: m.len, label: `${y}年` });
  }
  return out;
}

/** バーの位置（表示開始からの日数）。範囲外は null、はみ出しは切り詰めて印を付ける */
export function barSpan(start: string, end: string, range: { start: string; days: number }): { from: number; len: number; cutL: boolean; cutR: boolean } | null {
  if (!isDate(start) || !isDate(end)) return null;
  const s = daysBetween(range.start, start);
  const e = daysBetween(range.start, end);
  if (e < 0 || s > range.days - 1) return null;
  const from = Math.max(0, s);
  const to = Math.min(range.days - 1, e);
  return { from, len: to - from + 1, cutL: s < 0, cutR: e > range.days - 1 };
}

// ------------------------------------------------------------------ 用紙

export type Paper = 'A3' | 'A4';
/** 96dpi の横向き寸法（px） */
export const PAPER_PX: Record<Paper, { w: number; h: number; label: string }> = {
  A3: { w: 1587, h: 1123, label: 'A3横 (420 × 297mm)' },
  A4: { w: 1123, h: 794, label: 'A4横 (297 × 210mm)' },
};

/** 行をページに分ける。1 ページに入る行数は最低 1 */
export function paginate<T>(rows: T[], perPage: number): T[][] {
  const n = Math.max(1, Math.floor(perPage));
  if (!rows.length) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += n) out.push(rows.slice(i, i + n));
  return out;
}

// ------------------------------------------------------------------ テンプレート

type TemplateRow = {
  kind?: GanttKind;
  name: string;
  /** 稼働日数（マイルストーンは 0） */
  days?: number;
  /** 前工程（このテンプレート内の行番号。0 始まり）。省略で「1 つ前の工程」、null で前工程なし（着手日から） */
  after?: number | null;
  lag?: number;
  color?: string;
  text?: string;
};

export type GanttTemplate = { id: string; label: string; note: string; rows: TemplateRow[] };

/** 工種の色（地味な色で、隣り合っても見分けがつく） */
export const PALETTE = [
  { color: '#3b3b3b', label: '墨' },
  { color: '#52aa96', label: '青緑' },
  { color: '#3b6ea5', label: '藍' },
  { color: '#c0773a', label: '橙' },
  { color: '#b24a4a', label: '赤' },
  { color: '#7a5aa6', label: '紫' },
  { color: '#8a8a7a', label: '灰' },
  { color: '#a8913f', label: '黄土' },
];
const [INK, TEAL, INDIGO, ORANGE, RED, PURPLE, GRAY, OCHRE] = PALETTE.map((p) => p.color);

/**
 * 日数は目安（小〜中規模の一般的な進み方）。物件ごとに直して使う前提。
 * 前工程は「1 つ前の工程」を既定にし、並行して進むものだけ明示する。
 */
export const TEMPLATES: GanttTemplate[] = [
  {
    id: 'design',
    label: '設計工程（住宅・小規模）',
    note: '基本設計〜確認済証・工事契約まで。確認申請と見積は並行',
    rows: [
      { kind: 'group', name: '設計' },
      { name: '与件整理・現地調査', days: 10, after: null, color: GRAY },
      { name: '基本設計', days: 40, color: INDIGO },
      { kind: 'milestone', name: '基本設計承認', color: RED },
      { name: '実施設計', days: 50, color: INDIGO },
      { kind: 'group', name: '申請・見積' },
      { name: '確認申請（事前相談〜済証）', days: 25, after: 4, color: TEAL },
      { kind: 'milestone', name: '確認済証交付', color: RED },
      { name: '見積・査定・減額調整', days: 20, after: 4, color: ORANGE },
      { kind: 'milestone', name: '工事請負契約', color: RED },
      { kind: 'milestone', name: '着工', after: 7, color: RED },
    ],
  },
  {
    id: 'wood-house',
    label: '木造住宅 工事（延床 30〜40 坪）',
    note: '着工〜引渡し 約 4〜5 か月。設備・電気は造作と並行',
    rows: [
      { kind: 'milestone', name: '着工（地鎮祭）', after: null, color: RED },
      { kind: 'group', name: '基礎' },
      { name: '地縄・遣り方', days: 2, after: 0, color: GRAY },
      { name: '基礎工事', days: 20, color: INK, text: '掘削・配筋・打設' },
      { name: '基礎養生', days: 5, color: GRAY },
      { kind: 'group', name: '躯体' },
      { name: '土台敷き・足場', days: 2, after: 4, color: OCHRE },
      { name: '建方', days: 2, color: OCHRE },
      { kind: 'milestone', name: '上棟', color: RED },
      { name: '屋根工事', days: 7, after: 7, color: INDIGO },
      { name: 'サッシ取付', days: 3, color: INDIGO },
      { kind: 'milestone', name: '中間検査（該当時）', after: 7, lag: 5, color: RED },
      { kind: 'group', name: '外装・内装' },
      { name: '外壁工事', days: 20, after: 10, color: TEAL },
      { name: '断熱工事', days: 7, after: 10, color: PURPLE },
      { name: '内部造作（大工）', days: 30, color: OCHRE },
      { name: '設備配管・電気配線', days: 15, after: 10, color: ORANGE },
      { name: '内装仕上', days: 15, after: 15, color: TEAL, text: 'クロス・床' },
      { name: '住設機器取付', days: 5, color: ORANGE },
      { name: '足場解体', days: 2, after: 13, color: GRAY },
      { name: '外構工事', days: 10, color: GRAY },
      { kind: 'group', name: '検査・引渡し' },
      { name: '美装', days: 3, after: 18, color: GRAY },
      { kind: 'milestone', name: '完了検査', color: RED },
      { name: '施主検査・手直し', days: 5, color: GRAY },
      { kind: 'milestone', name: '引渡し', color: RED },
    ],
  },
  {
    id: 'rc',
    label: 'RC 造 工事（3 階建・中規模）',
    note: '着工〜竣工 約 8〜10 か月。躯体は 1 フロア 1 か月弱',
    rows: [
      { kind: 'milestone', name: '着工', after: null, color: RED },
      { kind: 'group', name: '仮設・土工事' },
      { name: '準備・仮設工事', days: 10, after: 0, color: GRAY },
      { name: '山留・杭工事', days: 20, color: INK },
      { name: '根切・床付け', days: 10, color: INK },
      { kind: 'group', name: '躯体' },
      { name: '基礎躯体', days: 20, color: INK },
      { name: '1 階躯体', days: 20, color: INK },
      { name: '2 階躯体', days: 18, color: INK },
      { kind: 'milestone', name: '中間検査', after: 7, color: RED },
      { name: '3 階躯体', days: 18, after: 8, color: INK },
      { name: 'R 階躯体・パラペット', days: 12, color: INK },
      { kind: 'milestone', name: '躯体完了', color: RED },
      { kind: 'group', name: '仕上' },
      { name: '屋上防水', days: 10, after: 12, color: INDIGO },
      { name: '外装（サッシ・タイル・塗装）', days: 45, after: 12, color: TEAL },
      { name: '内装（軽鉄・ボード・仕上）', days: 60, after: 12, color: TEAL },
      { name: '設備・電気', days: 80, after: 8, color: ORANGE },
      { name: '外構工事', days: 20, after: 15, color: GRAY },
      { kind: 'group', name: '検査・引渡し' },
      { name: '試運転・調整', days: 10, after: 16, color: ORANGE },
      { kind: 'milestone', name: '完了検査', color: RED },
      { name: '是正・美装', days: 7, color: GRAY },
      { kind: 'milestone', name: '引渡し', color: RED },
    ],
  },
  {
    id: 's',
    label: 'S 造 工事（店舗・倉庫・平屋〜2 階）',
    note: '着工〜竣工 約 4〜6 か月。鉄骨の製作期間（発注から 1.5〜2 か月）を先に見る',
    rows: [
      { kind: 'milestone', name: '着工', after: null, color: RED },
      { name: '鉄骨製作（工場）', days: 40, after: 0, color: PURPLE, text: '承認図〜製作' },
      { kind: 'group', name: '基礎' },
      { name: '準備・仮設工事', days: 5, after: 0, color: GRAY },
      { name: '杭・地盤改良', days: 10, color: INK },
      { name: '基礎工事', days: 25, color: INK },
      { kind: 'group', name: '鉄骨・外装' },
      { name: '鉄骨建方', days: 10, after: 1, color: PURPLE },
      { kind: 'milestone', name: '建方完了', color: RED },
      { name: '床デッキ・コンクリート', days: 10, color: INK },
      { name: '屋根工事', days: 15, after: 8, color: INDIGO },
      { name: '外壁（ALC・金属パネル）', days: 25, after: 8, color: TEAL },
      { kind: 'group', name: '内装・設備' },
      { name: '内装工事', days: 30, after: 9, color: TEAL },
      { name: '設備・電気', days: 40, after: 8, color: ORANGE },
      { name: '外構工事', days: 15, after: 11, color: GRAY },
      { kind: 'group', name: '検査・引渡し' },
      { kind: 'milestone', name: '完了検査', after: 13, color: RED },
      { name: '是正・美装', days: 5, color: GRAY },
      { kind: 'milestone', name: '引渡し', color: RED },
    ],
  },
  {
    id: 'renovation',
    label: '改修工事（内装・設備）',
    note: '着工〜竣工 約 1.5〜2 か月。居ながら工事は工期を長めに',
    rows: [
      { kind: 'milestone', name: '着工', after: null, color: RED },
      { name: '仮設・養生', days: 3, after: 0, color: GRAY },
      { name: '解体・撤去', days: 7, color: INK },
      { name: '下地補修', days: 5, color: OCHRE },
      { name: '設備更新（配管・配線）', days: 10, after: 2, color: ORANGE },
      { name: '内装下地', days: 7, after: 3, color: TEAL },
      { name: '内装仕上', days: 10, color: TEAL },
      { name: '器具取付', days: 3, color: ORANGE },
      { name: '美装', days: 2, color: GRAY },
      { kind: 'milestone', name: '竣工検査', color: RED },
      { kind: 'milestone', name: '引渡し', color: RED },
    ],
  },
];

/**
 * テンプレートを着手日から並べる。id は baseId から振る（既存の id と重ならないように渡す）。
 */
export function instantiate(tpl: GanttTemplate, startDate: string, cal: WorkCalendar, holidays: Holidays, baseId: number): GanttTask[] {
  const ids = tpl.rows.map((_, i) => baseId + i);
  const out: GanttTask[] = [];
  // 「1 つ前の工程」= 自分より前で一番近い、大項目でない行
  const prevReal = (i: number) => {
    for (let j = i - 1; j >= 0; j--) if ((tpl.rows[j].kind ?? 'task') !== 'group') return j;
    return null;
  };
  tpl.rows.forEach((r, i) => {
    const kind = r.kind ?? 'task';
    const afterIdx = kind === 'group' ? null : r.after === undefined ? prevReal(i) : r.after;
    out.push({
      id: ids[i],
      name: r.name,
      start: startDate,
      end: startDate,
      color: r.color ?? INK,
      innerText: r.text ?? '',
      order: i + 1,
      kind,
      after: afterIdx == null ? null : ids[afterIdx],
      lag: r.lag ?? 0,
      progress: 0,
    });
  });
  // 期間を入れてから前工程で押し出す
  const first = nextWorkday(startDate, cal, holidays);
  tpl.rows.forEach((r, i) => {
    const t = out[i];
    if (t.kind === 'group') return;
    t.start = t.kind === 'milestone' ? startDate : first;
    t.end = t.kind === 'milestone' ? t.start : addWorkdays(first, r.days ?? 1, cal, holidays);
  });
  return cascade(out, cal, holidays).tasks;
}

// ------------------------------------------------------------------ CSV

const CSV_HEAD = ['No', '区分', '工程名', '開始', '終了', '稼働日数', '前工程No', '空け日数', '進捗%', '色', 'バー内文字', '基準開始', '基準終了', 'メモ'];
const KIND_LABEL: Record<GanttKind, string> = { task: '工程', milestone: '節目', group: '大項目' };

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Excel で文字化けしないよう BOM 付き。前工程は行番号（No）で書く */
export function toCsv(tasks: GanttTask[], cal: WorkCalendar, holidays: Holidays): string {
  const no = new Map(tasks.map((t, i) => [t.id, i + 1]));
  const lines = [CSV_HEAD.join(',')];
  tasks.forEach((t, i) => {
    const k = kindOf(t);
    lines.push(
      [
        i + 1,
        KIND_LABEL[k],
        t.name,
        k === 'group' ? '' : t.start,
        k === 'group' ? '' : t.end,
        k === 'task' ? workdaysBetween(t.start, t.end, cal, holidays) : '',
        t.after != null ? no.get(t.after) ?? '' : '',
        t.lag || '',
        k === 'group' ? '' : t.progress ?? 0,
        t.color,
        t.innerText,
        t.baseStart ?? '',
        t.baseEnd ?? '',
        t.note ?? '',
      ]
        .map(csvCell)
        .join(',')
    );
  });
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

/** CSV を行と列に（引用符・改行入りのセルに対応） */
export function parseCsvRows(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

/** Excel で日付が 2026/10/1 に化けたものも読む */
const normDate = (s: string) => {
  const m = s.trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  return m ? `${m[1]}-${pad(Number(m[2]))}-${pad(Number(m[3]))}` : '';
};

/**
 * CSV から工程を読む。見出し行は名前で列を探す（列の並べ替え・削除に強く）。
 * 開始だけで終了が無ければ稼働日数から決める。読めない行は errors に理由を入れて飛ばす。
 */
export function fromCsv(text: string, cal: WorkCalendar, holidays: Holidays, baseId: number): { tasks: GanttTask[]; errors: string[] } {
  const rows = parseCsvRows(text);
  const errors: string[] = [];
  if (!rows.length) return { tasks: [], errors: ['空のファイルです'] };
  const head = rows[0].map((h) => h.trim());
  const col = (name: string) => head.indexOf(name);
  if (col('工程名') < 0) return { tasks: [], errors: ['見出しに「工程名」の列がありません（このツールで書き出した CSV を直して読み込んでください）'] };
  const get = (r: string[], name: string) => (col(name) >= 0 ? (r[col(name)] ?? '').trim() : '');
  const kindFrom = (s: string): GanttKind => (s === '大項目' ? 'group' : s === '節目' || s === 'マイルストーン' ? 'milestone' : 'task');

  const body = rows.slice(1);
  const noToId = new Map<string, number>();
  body.forEach((r, i) => noToId.set(get(r, 'No') || String(i + 1), baseId + i));

  const tasks: GanttTask[] = [];
  body.forEach((r, i) => {
    const name = get(r, '工程名');
    if (!name) {
      errors.push(`${i + 2} 行目: 工程名が空なので飛ばしました`);
      return;
    }
    const kind = kindFrom(get(r, '区分'));
    let start = normDate(get(r, '開始'));
    let end = normDate(get(r, '終了'));
    const days = Number(get(r, '稼働日数')) || 0;
    if (kind !== 'group') {
      if (!start) {
        errors.push(`${i + 2} 行目「${name}」: 開始日が読めないので飛ばしました`);
        return;
      }
      if (kind === 'milestone') end = start;
      else if (!end || end < start) end = addWorkdays(start, days || 1, cal, holidays);
    } else {
      start = start || '';
      end = end || '';
    }
    const afterNo = get(r, '前工程No');
    const progress = Math.min(100, Math.max(0, Number(get(r, '進捗%')) || 0));
    tasks.push({
      id: baseId + i,
      name: name.slice(0, 60),
      start,
      end,
      color: /^#[0-9a-fA-F]{6}$/.test(get(r, '色')) ? get(r, '色') : INK,
      innerText: get(r, 'バー内文字').slice(0, 40),
      order: tasks.length + 1,
      kind,
      after: afterNo && noToId.has(afterNo) ? noToId.get(afterNo)! : null,
      lag: Math.max(0, Number(get(r, '空け日数')) || 0),
      progress,
      baseStart: normDate(get(r, '基準開始')) || undefined,
      baseEnd: normDate(get(r, '基準終了')) || undefined,
      note: get(r, 'メモ').slice(0, 500) || undefined,
    });
  });
  // 飛ばした行を前工程に指していたら外す
  const ids = new Set(tasks.map((t) => t.id));
  for (const t of tasks) if (t.after != null && (!ids.has(t.after) || !canLink(tasks, t.id, t.after))) t.after = null;
  // 大項目の日付は中身から決まるので、空でも埋めておく（古い版の読み込み側が落ちないように）
  for (const t of tasks) {
    if (t.kind === 'group' && !t.start) {
      const span = groupSpan(tasks, t.id);
      t.start = span?.start ?? '';
      t.end = span?.end ?? '';
    }
  }
  return { tasks, errors };
}

// ------------------------------------------------------------------ .ics

const icsEscape = (v: string) => v.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** 工程は期間の終日予定、節目は 1 日の終日予定。大項目は入れない */
export function toIcs(tasks: GanttTask[], projectName: string, projectId: number | string, now = new Date()): string {
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//yaneyuka//Gantt//JA', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${icsEscape(projectName || '工程表')}`];
  for (const t of tasks) {
    const k = kindOf(t);
    if (k === 'group' || !isDate(t.start) || !isDate(t.end)) continue;
    lines.push(
      'BEGIN:VEVENT',
      `UID:gantt-${projectId}-${t.id}@yaneyuka.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${t.start.replace(/-/g, '')}`,
      // 終日予定の DTEND は最終日の翌日
      `DTEND;VALUE=DATE:${addDays(t.end, 1).replace(/-/g, '')}`,
      `SUMMARY:${icsEscape((k === 'milestone' ? '◆ ' : '') + t.name)}`,
      `DESCRIPTION:${icsEscape([projectName, t.innerText, t.note].filter(Boolean).join('\n'))}`,
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

// ------------------------------------------------------------------ 保存データの読み直し

/** Firestore・localStorage から読んだ工程を整える（古い形・壊れた値に耐える） */
export function normalizeCalendar(raw: unknown): WorkCalendar {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const b = (k: 'sunday' | 'saturday' | 'holidays' | 'yearEnd' | 'summer') => (typeof c[k] === 'boolean' ? (c[k] as boolean) : DEFAULT_CALENDAR[k]);
  return {
    sunday: b('sunday'),
    saturday: b('saturday'),
    holidays: b('holidays'),
    yearEnd: b('yearEnd'),
    summer: b('summer'),
    extraOff: Array.isArray(c.extraOff) ? c.extraOff.filter(isDate).slice(0, 200) : [],
  };
}

export function normalizeTasks(raw: unknown): GanttTask[] {
  if (!Array.isArray(raw)) return [];
  const out: GanttTask[] = [];
  raw.forEach((x, i) => {
    if (!x || typeof x !== 'object') return;
    const t = x as Record<string, unknown>;
    const kind: GanttKind = t.kind === 'milestone' || t.kind === 'group' ? t.kind : 'task';
    const start = isDate(t.start) ? t.start : '';
    const end = isDate(t.end) ? t.end : start;
    if (kind !== 'group' && !start) return;
    out.push({
      id: typeof t.id === 'number' ? t.id : Number(t.id) || Date.now() + i,
      name: typeof t.name === 'string' ? t.name : '',
      start,
      end: end < start ? start : end,
      color: typeof t.color === 'string' ? t.color : INK,
      innerText: typeof t.innerText === 'string' ? t.innerText : '',
      order: typeof t.order === 'number' ? t.order : i + 1,
      kind,
      after: typeof t.after === 'number' ? t.after : null,
      lag: typeof t.lag === 'number' ? t.lag : 0,
      progress: typeof t.progress === 'number' ? Math.min(100, Math.max(0, t.progress)) : 0,
      baseStart: isDate(t.baseStart) ? t.baseStart : undefined,
      baseEnd: isDate(t.baseEnd) ? t.baseEnd : undefined,
      note: typeof t.note === 'string' ? t.note : undefined,
    });
  });
  return out;
}

/** Firestore は undefined を書けないので落とす */
export function stripForSave(tasks: GanttTask[]): Record<string, unknown>[] {
  return tasks.map((t) => Object.fromEntries(Object.entries(t).filter(([, v]) => v !== undefined)));
}
