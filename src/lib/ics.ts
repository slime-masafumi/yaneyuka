/**
 * iCalendar（.ics）の読み書き。
 *
 * Myカレンダーが外部カレンダーを読み（URL の購読と .ics ファイルの取り込み）、
 * 自分の予定を書き出すために使う。
 * 仕様（RFC 5545）の全部は要らないので、予定表として意味のある範囲に絞る:
 * 折り返し行の復元、DTSTART/DTEND/DURATION/SUMMARY/DESCRIPTION/LOCATION、
 * 終日と時刻つきの区別、エスケープ（\n \, \; \\）、繰り返し（RRULE）の展開。
 *
 * 繰り返しは以前は初回だけ出していた。それだと「毎週の現場定例」を読み込んでも
 * 1 回しか出ず、取り込んだ意味がない。いまは FREQ=DAILY/WEEKLY/MONTHLY/YEARLY と
 * INTERVAL・COUNT・UNTIL・BYDAY（2TU や -1FR も）・BYMONTHDAY・BYMONTH・BYSETPOS、
 * EXDATE と RECURRENCE-ID（その回だけ変更）を展開する。
 * 件数が読めなくならないよう、1 系列 500 回・既定で「1 年前〜2 年先」に絞る。
 * BYWEEKNO / BYYEARDAY / BYHOUR など、建築の予定でまず使わないものは展開せず初回だけ出す。
 *
 * 日付は必ずローカル時間の YYYY-MM-DD に落とす。toISOString() を使うと
 * UTC に寄って日本時間の朝9時前が前日になる（カレンダー側と同じ約束）。
 *
 * このファイルは import を持たない（node scripts/test-ics.ts でそのまま読めるように）。
 */

export type IcsEvent = {
  uid: string;
  /**
   * 1 回分を見分ける鍵。UID と、その回の開始（DTSTART の書式のまま）をつないだもの。
   * 同じファイルを 2 回読み込んだときの重複よけに使う。
   */
  key: string;
  title: string;
  /** YYYY-MM-DD（ローカル） */
  date: string;
  /** 終わる日（YYYY-MM-DD・その日を含む）。1 日で終わる予定は date と同じ */
  endDate: string;
  allDay: boolean;
  /** 時刻つきのときだけ。'HH' と 'MM'。 */
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
  details: string;
  location: string;
  /** RRULE から展開した回なら true */
  recurring: boolean;
};

export type IcsParseOptions = {
  /** 繰り返しをここより前は出さない（既定: 今日の 365 日前） */
  from?: Date;
  /** 繰り返しをここより後は出さない（既定: 今日の 730 日後） */
  to?: Date;
  /** 1 系列から出す最大回数（既定 500） */
  maxPerSeries?: number;
  /** 期間の既定値を決める「今日」。テストで固定するため */
  now?: Date;
};

export type IcsParseStats = {
  /** 読めた VEVENT の数（繰り返しは 1 つと数える） */
  vevents: number;
  /** 繰り返しのある予定の数 */
  recurringSeries: number;
  /** 期間や回数の上限で打ち切った系列の数 */
  truncatedSeries: number;
  /** 展開できない書き方だったので初回だけ出した系列の数 */
  unsupportedRules: number;
  /** STATUS:CANCELLED で飛ばした数 */
  cancelled: number;
};

const pad = (n: number) => String(n).padStart(2, '0');

export const toLocalDateString = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * 折り返された行を戻す。ics は75オクテットで折り返し、続きは
 * 行頭の空白1つで示す決まりになっている。
 */
export const unfoldLines = (raw: string): string[] => {
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const out: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
};

/** 本文のエスケープを戻す。\\ を最後に戻さないと \\n が改行になってしまう。 */
export const unescapeText = (value: string): string =>
  value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');

/** 書き出すときは逆。\\ を最初に置き換える。 */
export const escapeText = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\r?\n/g, '\\n');

type ParsedDate = { date: Date; allDay: boolean } | null;

/**
 * DTSTART/DTEND の値を読む。
 *   20260401            … 終日
 *   20260401T090000     … その場の時刻
 *   20260401T000000Z    … UTC。ローカルに直す
 * TZID 付き（DTSTART;TZID=Asia/Tokyo:...）は、その場の時刻として扱う。
 * 任意のタイムゾーンを正しく解釈するには tz データベースが要るので、
 * ここでは持ち込まない。日本の予定を日本で読む限りはずれない。
 */
export const parseIcsDate = (value: string): ParsedDate => {
  const w = parseWall(value);
  if (!w) return null;
  return { date: wallToDate(w), allDay: w.dateOnly };
};

// ------------------------------------------------------------------ 壁時計の日時

/**
 * 繰り返しの計算は「その予定の暦の上」でやる。UTC で書かれた予定は UTC の暦で、
 * その場の時刻の予定はその場の暦で数え、1 回ずつ出してからローカルに直す。
 * 先にローカルへ直してから数えると、UTC 23時（日本の翌朝8時）の毎週月曜が
 * 火曜に化ける。
 */
type Wall = { y: number; m: number; d: number; hh: number; mi: number; ss: number; utc: boolean; dateOnly: boolean };

const parseWall = (value: string): Wall | null => {
  const v = value.trim();
  const dateOnly = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return { y: +y, m: +m, d: +d, hh: 0, mi: 0, ss: 0, utc: false, dateOnly: true };
  }
  const dt = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (dt) {
    const [, y, m, d, hh, mi, ss, z] = dt;
    return { y: +y, m: +m, d: +d, hh: +hh, mi: +mi, ss: +ss, utc: !!z, dateOnly: false };
  }
  return null;
};

/** 壁時計 → 実際の時刻（Date）。UTC なら UTC として、そうでなければローカルとして読む */
const wallToDate = (w: Wall): Date =>
  w.utc
    ? new Date(Date.UTC(w.y, w.m - 1, w.d, w.hh, w.mi, w.ss))
    : new Date(w.y, w.m - 1, w.d, w.hh, w.mi, w.ss);

/** DTSTART と同じ書式の文字列（重複よけの鍵に使う） */
const wallStamp = (w: Wall): string =>
  w.dateOnly
    ? `${w.y}${pad(w.m)}${pad(w.d)}`
    : `${w.y}${pad(w.m)}${pad(w.d)}T${pad(w.hh)}${pad(w.mi)}${pad(w.ss)}${w.utc ? 'Z' : ''}`;

const DAY_MS = 86400000;
/** 1970-01-01 からの日数（暦の上の日付だけを数える。時差は関係しない） */
const dayNum = (y: number, m: number, d: number) => Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
const fromDayNum = (n: number) => {
  const x = new Date(n * DAY_MS);
  return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate() };
};
/** 曜日（0=日）。1970-01-01 は木曜 */
const weekday = (n: number) => (((n + 4) % 7) + 7) % 7;
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

const WD: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

// ------------------------------------------------------------------ RRULE

export type RRule = {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  count?: number;
  until?: Wall;
  /** n=0 は「その曜日すべて」。2TU は n=2、-1FR は n=-1 */
  byDay?: { n: number; wd: number }[];
  byMonthDay?: number[];
  byMonth?: number[];
  bySetPos?: number[];
  wkst: number;
};

const intList = (v: string) => v.split(',').map((s) => parseInt(s, 10)).filter((n) => Number.isFinite(n) && n !== 0);

/** RRULE を読む。展開できない書き方なら null（呼び出し側は初回だけ出す） */
export const parseRRule = (value: string): RRule | null => {
  const parts: Record<string, string> = {};
  for (const kv of value.trim().split(';')) {
    const eq = kv.indexOf('=');
    if (eq > 0) parts[kv.slice(0, eq).toUpperCase()] = kv.slice(eq + 1).toUpperCase();
  }
  const freq = parts.FREQ;
  if (freq !== 'DAILY' && freq !== 'WEEKLY' && freq !== 'MONTHLY' && freq !== 'YEARLY') return null;
  // 1 日に何回も出る指定や、週番号・年の通し日での指定は扱わない
  if (parts.BYHOUR || parts.BYMINUTE || parts.BYSECOND || parts.BYWEEKNO || parts.BYYEARDAY) return null;

  const rule: RRule = { freq, interval: Math.max(1, parseInt(parts.INTERVAL || '1', 10) || 1), wkst: WD[parts.WKST] ?? 1 };
  if (parts.COUNT) {
    const c = parseInt(parts.COUNT, 10);
    if (!(c > 0)) return null;
    rule.count = c;
  }
  if (parts.UNTIL) {
    const u = parseWall(parts.UNTIL);
    if (!u) return null;
    rule.until = u;
  }
  if (parts.BYDAY) {
    const days: { n: number; wd: number }[] = [];
    for (const s of parts.BYDAY.split(',')) {
      const m = s.trim().match(/^([+-]?\d{1,2})?(SU|MO|TU|WE|TH|FR|SA)$/);
      if (!m) return null;
      days.push({ n: m[1] ? parseInt(m[1], 10) : 0, wd: WD[m[2]] });
    }
    rule.byDay = days;
  }
  if (parts.BYMONTHDAY) rule.byMonthDay = intList(parts.BYMONTHDAY);
  if (parts.BYMONTH) rule.byMonth = intList(parts.BYMONTH).filter((n) => n >= 1 && n <= 12);
  if (parts.BYSETPOS) rule.bySetPos = intList(parts.BYSETPOS);
  return rule;
};

/** ある月のうち、BYMONTHDAY / BYDAY に合う日（dayNum の昇順） */
const monthCandidates = (y: number, m: number, rule: RRule, defaultDay: number): number[] => {
  const dim = daysInMonth(y, m);
  const first = dayNum(y, m, 1);
  let days: number[] | null = null;

  if (rule.byMonthDay?.length) {
    days = rule.byMonthDay
      .map((v) => (v > 0 ? v : dim + 1 + v))
      .filter((v) => v >= 1 && v <= dim)
      .map((v) => first + v - 1);
  }
  if (rule.byDay?.length) {
    const hit = new Set<number>();
    for (const { n, wd } of rule.byDay) {
      const all: number[] = [];
      for (let i = 0; i < dim; i++) if (weekday(first + i) === wd) all.push(first + i);
      if (n === 0) all.forEach((x) => hit.add(x));
      else {
        const pick = n > 0 ? all[n - 1] : all[all.length + n];
        if (pick !== undefined) hit.add(pick);
      }
    }
    days = days ? days.filter((x) => hit.has(x)) : [...hit];
  }
  if (!days) days = defaultDay <= dim ? [first + defaultDay - 1] : [];
  return [...new Set(days)].sort((a, b) => a - b);
};

/** 年全体での n 番目の曜日（BYMONTH なしの YEARLY;BYDAY=20MO など） */
const yearCandidates = (y: number, rule: RRule): number[] => {
  const first = dayNum(y, 1, 1);
  const last = dayNum(y, 12, 31);
  const hit = new Set<number>();
  for (const { n, wd } of rule.byDay ?? []) {
    const all: number[] = [];
    for (let x = first; x <= last; x++) if (weekday(x) === wd) all.push(x);
    if (n === 0) all.forEach((x) => hit.add(x));
    else {
      const pick = n > 0 ? all[n - 1] : all[all.length + n];
      if (pick !== undefined) hit.add(pick);
    }
  }
  return [...hit].sort((a, b) => a - b);
};

const applySetPos = (days: number[], setPos?: number[]) => {
  if (!setPos?.length) return days;
  const out = new Set<number>();
  for (const p of setPos) {
    const x = p > 0 ? days[p - 1] : days[days.length + p];
    if (x !== undefined) out.add(x);
  }
  return [...out].sort((a, b) => a - b);
};

/** 1 周期（その日・その週・その月・その年）に入る日を出す */
const periodCandidates = (k: number, rule: RRule, start: Wall, startDay: number): { days: number[]; periodStart: number } => {
  const monthOk = (x: number) => !rule.byMonth?.length || rule.byMonth.includes(fromDayNum(x).m);
  switch (rule.freq) {
    case 'DAILY': {
      const x = startDay + k * rule.interval;
      const c = fromDayNum(x);
      let ok = monthOk(x);
      if (ok && rule.byMonthDay?.length) {
        const dim = daysInMonth(c.y, c.m);
        ok = rule.byMonthDay.some((v) => (v > 0 ? v : dim + 1 + v) === c.d);
      }
      if (ok && rule.byDay?.length) ok = rule.byDay.some((b) => b.wd === weekday(x));
      return { days: ok ? [x] : [], periodStart: x };
    }
    case 'WEEKLY': {
      const weekStart0 = startDay - ((weekday(startDay) - rule.wkst + 7) % 7);
      const ws = weekStart0 + k * 7 * rule.interval;
      const wds = rule.byDay?.length ? rule.byDay.map((b) => b.wd) : [weekday(startDay)];
      const days = [...new Set(wds.map((wd) => ws + ((wd - rule.wkst + 7) % 7)))].filter(monthOk).sort((a, b) => a - b);
      return { days, periodStart: ws };
    }
    case 'MONTHLY': {
      const idx = start.y * 12 + (start.m - 1) + k * rule.interval;
      const y = Math.floor(idx / 12);
      const m = (idx % 12) + 1;
      const days = rule.byMonth?.length && !rule.byMonth.includes(m) ? [] : monthCandidates(y, m, rule, start.d);
      return { days, periodStart: dayNum(y, m, 1) };
    }
    case 'YEARLY': {
      const y = start.y + k * rule.interval;
      let days: number[];
      if (rule.byMonth?.length) {
        days = rule.byMonth.flatMap((m) => monthCandidates(y, m, rule, start.d));
      } else if (rule.byDay?.length && !rule.byMonthDay?.length) {
        days = yearCandidates(y, rule);
      } else if (rule.byMonthDay?.length) {
        days = Array.from({ length: 12 }, (_, i) => monthCandidates(y, i + 1, rule, start.d)).flat();
      } else {
        days = start.d <= daysInMonth(y, start.m) ? [dayNum(y, start.m, start.d)] : [];
      }
      return { days: [...new Set(days)].sort((a, b) => a - b), periodStart: dayNum(y, 1, 1) };
    }
  }
};

export type Occurrence = { wall: Wall; stamp: string };

/**
 * 繰り返しを展開する。DTSTART は必ず 1 回目として数える（RFC 5545 3.8.5.3）。
 * COUNT は期間の外（from より前）の回も数える。
 */
export const expandRRule = (
  start: Wall,
  rule: RRule,
  opts: { from: Date; to: Date; max: number; exdates?: Set<string> },
): { occurrences: Occurrence[]; truncated: boolean } => {
  const startDay = dayNum(start.y, start.m, start.d);
  const fromMs = opts.from.getTime();
  const toMs = opts.to.getTime();
  const toDay = dayNum(opts.to.getFullYear(), opts.to.getMonth() + 1, opts.to.getDate()) + 1;

  let untilMs = Infinity;
  if (rule.until) {
    const u = rule.until;
    // 日付だけの UNTIL はその日いっぱいまで
    untilMs = u.dateOnly
      ? wallToDate({ ...u, hh: 23, mi: 59, ss: 59, utc: start.utc }).getTime()
      : wallToDate(u).getTime();
  }

  const make = (x: number): Occurrence => {
    const c = fromDayNum(x);
    const wall: Wall = { ...start, y: c.y, m: c.m, d: c.d };
    return { wall, stamp: wallStamp(wall) };
  };
  const excluded = (o: Occurrence) =>
    !!opts.exdates && (opts.exdates.has(`D:${o.wall.y}${pad(o.wall.m)}${pad(o.wall.d)}`) || opts.exdates.has(`T:${wallToDate(o.wall).getTime()}`));

  const out: Occurrence[] = [];
  let counted = 0;
  let truncated = false;
  let first = true;

  // 周期を 1 つずつ進める。上限は念のため（毎日×数十年でも 5 万に届かない）
  for (let k = 0; k < 200000; k++) {
    const { days, periodStart } = periodCandidates(k, rule, start, startDay);
    if (periodStart > toDay && !first) {
      truncated = rule.count === undefined || counted < rule.count ? untilMs > toMs : false;
      break;
    }
    let list = applySetPos(days, rule.bySetPos).filter((x) => x >= startDay);
    if (first) {
      if (!list.includes(startDay)) list = [startDay, ...list];
      first = false;
    }
    for (const x of list) {
      const o = make(x);
      const ms = wallToDate(o.wall).getTime();
      if (ms > untilMs) return { occurrences: out, truncated: false };
      if (rule.count !== undefined && counted >= rule.count) return { occurrences: out, truncated: false };
      counted++;
      if (excluded(o)) continue;
      if (ms > toMs) {
        return { occurrences: out, truncated: true };
      }
      if (ms < fromMs && !(start.dateOnly && ms + DAY_MS > fromMs)) continue;
      if (out.length >= opts.max) return { occurrences: out, truncated: true };
      out.push(o);
    }
  }
  return { occurrences: out, truncated };
};

// ------------------------------------------------------------------ 読み込み

/** 1行を「プロパティ名」「パラメータ」「値」に割る。値にも : が入りうる。 */
const splitLine = (line: string): { name: string; params: string; value: string } | null => {
  const colon = line.indexOf(':');
  if (colon < 0) return null;
  const left = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const semi = left.indexOf(';');
  return semi < 0
    ? { name: left.toUpperCase(), params: '', value }
    : { name: left.slice(0, semi).toUpperCase(), params: left.slice(semi + 1), value };
};

type Fields = Record<string, { params: string; value: string }>;
type RawEvent = { fields: Fields; exdates: string[] };

/** EXDATE の値を「日付だけ（D:）」「時刻つき（T:実時刻）」の鍵に直す */
const exdateKeys = (values: string[]): string[] => {
  const keys: string[] = [];
  for (const v of values) {
    for (const one of v.split(',')) {
      const w = parseWall(one);
      if (!w) continue;
      keys.push(w.dateOnly ? `D:${wallStamp(w)}` : `T:${wallToDate(w).getTime()}`);
    }
  }
  return keys;
};

/** DURATION（P1D・PT1H30M など）をミリ秒に */
const parseDuration = (v: string): number | null => {
  const m = v.trim().match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return null;
  const [, sign, w, d, h, mi, s] = m;
  const ms = ((+(w || 0) * 7 + +(d || 0)) * 86400 + +(h || 0) * 3600 + +(mi || 0) * 60 + +(s || 0)) * 1000;
  return sign === '-' ? -ms : ms;
};

/**
 * VEVENT を取り出して、繰り返しは展開する。読めない予定は黙って飛ばす
 * （1件の不備でカレンダー全部が出ないほうが困る）。
 */
export const parseIcsCalendar = (raw: string, options: IcsParseOptions = {}): { events: IcsEvent[]; stats: IcsParseStats } => {
  const now = options.now ?? new Date();
  const from = options.from ?? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 365);
  const to = options.to ?? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 730, 23, 59, 59);
  const max = options.maxPerSeries ?? 500;

  const lines = unfoldLines(raw);
  const rawEvents: RawEvent[] = [];
  let current: RawEvent | null = null;
  let depth = 0; // VEVENT の中の VALARM などは読み飛ばす

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      current = { fields: {}, exdates: [] };
      depth = 0;
      continue;
    }
    if (line.startsWith('END:VEVENT')) {
      if (current) rawEvents.push(current);
      current = null;
      continue;
    }
    if (!current) continue;
    if (line.startsWith('BEGIN:')) { depth++; continue; }
    if (line.startsWith('END:')) { depth = Math.max(0, depth - 1); continue; }
    if (depth > 0) continue;

    const parsed = splitLine(line);
    if (!parsed) continue;
    if (parsed.name === 'EXDATE') current.exdates.push(parsed.value);
    else current.fields[parsed.name] = { params: parsed.params, value: parsed.value };
  }

  const stats: IcsParseStats = { vevents: 0, recurringSeries: 0, truncatedSeries: 0, unsupportedRules: 0, cancelled: 0 };

  // RECURRENCE-ID つきの VEVENT は「その回だけ変更」。元の系列からその回を抜く
  const overridden = new Map<string, string[]>();
  for (const ev of rawEvents) {
    const rid = ev.fields['RECURRENCE-ID'];
    const uid = ev.fields['UID']?.value?.trim();
    if (rid && uid) overridden.set(uid, [...(overridden.get(uid) ?? []), rid.value]);
  }

  const events: IcsEvent[] = [];
  for (const ev of rawEvents) {
    const f = ev.fields;
    if ((f['STATUS']?.value || '').trim().toUpperCase() === 'CANCELLED') {
      stats.cancelled++;
      continue;
    }
    const dtstart = f['DTSTART'];
    if (!dtstart) continue;
    const startWall = parseWall(dtstart.value);
    if (!startWall) continue;
    // VALUE=DATE が付いていれば、値の形に関わらず終日
    if (/VALUE=DATE(?!-TIME)/i.test(dtstart.params)) startWall.dateOnly = true;
    stats.vevents++;

    const allDay = startWall.dateOnly;
    const startDate = wallToDate(startWall);
    // 長さ。DTEND か DURATION。無ければ終日は 1 日、時刻つきは 0 分
    let lengthMs = allDay ? DAY_MS : 0;
    const dtendWall = f['DTEND'] ? parseWall(f['DTEND'].value) : null;
    if (dtendWall) {
      const endDate = allDay
        ? new Date(dtendWall.y, dtendWall.m - 1, dtendWall.d)
        : wallToDate(dtendWall);
      lengthMs = Math.max(0, endDate.getTime() - startDate.getTime());
    } else if (f['DURATION']) {
      lengthMs = Math.max(0, parseDuration(f['DURATION'].value) ?? lengthMs);
    }

    const uid = f['UID']?.value?.trim() || `${dtstart.value}-${f['SUMMARY']?.value || ''}`;
    const base = {
      uid,
      title: unescapeText(f['SUMMARY']?.value || '(無題)').trim() || '(無題)',
      details: unescapeText(f['DESCRIPTION']?.value || '').trim(),
      location: unescapeText(f['LOCATION']?.value || '').trim(),
    };

    const toEvent = (wall: Wall, keyStamp: string, recurring: boolean): IcsEvent => {
      if (allDay) {
        const s = new Date(wall.y, wall.m - 1, wall.d);
        const days = Math.max(1, Math.round(lengthMs / DAY_MS));
        const e = new Date(wall.y, wall.m - 1, wall.d + days - 1);
        return {
          ...base, key: `${uid}|${keyStamp}`, date: toLocalDateString(s), endDate: toLocalDateString(e), allDay: true,
          startHour: '00', startMinute: '00', endHour: '00', endMinute: '00', recurring,
        };
      }
      const s = wallToDate(wall);
      const e = new Date(s.getTime() + lengthMs);
      // 0:00 ちょうどに終わる予定は前の日のうちに終わったものとして数える
      const endForDate = lengthMs > 0 && e.getHours() === 0 && e.getMinutes() === 0 ? new Date(e.getTime() - 1) : e;
      return {
        ...base, key: `${uid}|${keyStamp}`, date: toLocalDateString(s), endDate: toLocalDateString(endForDate), allDay: false,
        startHour: pad(s.getHours()), startMinute: pad(s.getMinutes()),
        endHour: dtendWall || f['DURATION'] ? pad(e.getHours()) : '00',
        endMinute: dtendWall || f['DURATION'] ? pad(e.getMinutes()) : '00',
        recurring,
      };
    };

    // その回だけ変更した VEVENT。鍵は元の回（RECURRENCE-ID）にして、再読込で重ならないようにする
    const rid = f['RECURRENCE-ID'];
    const ridWall = rid ? parseWall(rid.value) : null;
    if (ridWall) {
      events.push(toEvent(startWall, wallStamp(ridWall), true));
      continue;
    }

    const rrule = f['RRULE'];
    if (!rrule) {
      events.push(toEvent(startWall, wallStamp(startWall), false));
      continue;
    }

    stats.recurringSeries++;
    const rule = parseRRule(rrule.value);
    if (!rule) {
      stats.unsupportedRules++;
      events.push(toEvent(startWall, wallStamp(startWall), false));
      continue;
    }
    const ex = new Set([...exdateKeys(ev.exdates), ...exdateKeys(overridden.get(uid) ?? [])]);
    const { occurrences, truncated } = expandRRule(startWall, rule, { from, to, max, exdates: ex });
    if (truncated) stats.truncatedSeries++;
    for (const o of occurrences) events.push(toEvent(o.wall, o.stamp, true));
  }

  return { events, stats };
};

/** 予定だけ欲しいとき（購読の表示など） */
export const parseIcs = (raw: string, options?: IcsParseOptions): IcsEvent[] => parseIcsCalendar(raw, options).events;

// ------------------------------------------------------------------ 書き出し

export type ExportableEvent = {
  id: string;
  title: string;
  date: string;
  allDay?: boolean;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
  details?: string;
  category?: string;
};

const stamp = (date: string, hour: string, minute: string) =>
  `${date.replace(/-/g, '')}T${hour.padStart(2, '0')}${minute.padStart(2, '0')}00`;

/** 終日予定の DTEND は「翌日」を指す決まり。 */
const nextDay = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(y, m - 1, d + 1);
  return toLocalDateString(next).replace(/-/g, '');
};

/**
 * .ics を組み立てる。
 * 時刻つきの予定はタイムゾーン指定を付けず「その場の時刻」として書く。
 * 読み込む側（Google 等）はカレンダー既定のタイムゾーンで解釈するので、
 * 同じ国で使っている限りずれない。
 */
export const buildIcs = (events: ExportableEvent[], calendarName = 'yaneyuka'): string => {
  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//yaneyuka//Mycalendar//JA',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];

  for (const e of events) {
    if (!e.date) continue;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${e.id}@yaneyuka.com`);
    lines.push(`DTSTAMP:${dtstamp}`);
    if (e.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${e.date.replace(/-/g, '')}`);
      lines.push(`DTEND;VALUE=DATE:${nextDay(e.date)}`);
    } else {
      lines.push(`DTSTART:${stamp(e.date, e.startHour || '00', e.startMinute || '00')}`);
      lines.push(`DTEND:${stamp(e.date, e.endHour || e.startHour || '00', e.endMinute || e.startMinute || '00')}`);
    }
    lines.push(`SUMMARY:${escapeText(e.title || '(無題)')}`);
    if (e.details) lines.push(`DESCRIPTION:${escapeText(e.details)}`);
    if (e.category) lines.push(`CATEGORIES:${escapeText(e.category)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  // ics の改行は CRLF
  return lines.join('\r\n') + '\r\n';
};
