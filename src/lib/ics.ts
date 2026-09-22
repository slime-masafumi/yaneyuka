/**
 * iCalendar（.ics）の読み書き。
 *
 * Myカレンダーが外部カレンダーを読み、自分の予定を書き出すために使う。
 * 仕様（RFC 5545）の全部は要らないので、予定表として意味のある範囲に絞る:
 * 折り返し行の復元、DTSTART/DTEND/SUMMARY、終日と時刻つきの区別、
 * エスケープ（\n \, \; \\）。繰り返し（RRULE）は読み飛ばし、
 * 展開せず初回だけを出す（展開すると件数が読めず、重い上に取り消しも効かない）。
 *
 * 日付は必ずローカル時間の YYYY-MM-DD に落とす。toISOString() を使うと
 * UTC に寄って日本時間の朝9時前が前日になる（カレンダー側と同じ約束）。
 */

export type IcsEvent = {
  uid: string;
  title: string;
  /** YYYY-MM-DD（ローカル） */
  date: string;
  allDay: boolean;
  /** 時刻つきのときだけ。'HH' と 'MM'。 */
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
  details: string;
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
  const v = value.trim();

  const dateOnly = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return { date: new Date(Number(y), Number(m) - 1, Number(d)), allDay: true };
  }

  const dateTime = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (dateTime) {
    const [, y, m, d, hh, mm, ss, z] = dateTime;
    const date = z
      ? new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)))
      : new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
    return { date, allDay: false };
  }

  return null;
};

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

/**
 * VEVENT を取り出す。読めない予定は黙って飛ばす（1件の不備で
 * カレンダー全部が出ないほうが困る）。
 */
export const parseIcs = (raw: string): IcsEvent[] => {
  const lines = unfoldLines(raw);
  const events: IcsEvent[] = [];

  let current: Record<string, { params: string; value: string }> | null = null;

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      current = {};
      continue;
    }
    if (line.startsWith('END:VEVENT')) {
      if (current) {
        const built = buildEvent(current);
        if (built) events.push(built);
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const parsed = splitLine(line);
    if (parsed) current[parsed.name] = { params: parsed.params, value: parsed.value };
  }

  return events;
};

const buildEvent = (fields: Record<string, { params: string; value: string }>): IcsEvent | null => {
  const dtstart = fields['DTSTART'];
  if (!dtstart) return null;

  const start = parseIcsDate(dtstart.value);
  if (!start) return null;

  // VALUE=DATE が付いていれば、値の形に関わらず終日
  const allDay = start.allDay || /VALUE=DATE(?!-TIME)/i.test(dtstart.params);

  const dtend = fields['DTEND'];
  const end = dtend ? parseIcsDate(dtend.value) : null;

  return {
    uid: fields['UID']?.value?.trim() || `${dtstart.value}-${fields['SUMMARY']?.value || ''}`,
    title: unescapeText(fields['SUMMARY']?.value || '(無題)').trim() || '(無題)',
    date: toLocalDateString(start.date),
    allDay,
    startHour: allDay ? '00' : pad(start.date.getHours()),
    startMinute: allDay ? '00' : pad(start.date.getMinutes()),
    endHour: allDay || !end ? '00' : pad(end.date.getHours()),
    endMinute: allDay || !end ? '00' : pad(end.date.getMinutes()),
    details: unescapeText(fields['DESCRIPTION']?.value || '').trim(),
  };
};

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
