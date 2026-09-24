/**
 * yychat を「現場チャット」にするための純粋ロジック（画面・Firestore に依存しない）。
 *   - 検索（全角半角・大小を寄せて、空白区切りは AND）
 *   - @メンションからタスクの文言と期限を拾う
 *   - 選んだ発言を議事録（メモ）の HTML にする
 */

export type ChatLine = { id: string; senderId: string; content: string; createdAt: Date; imageUrl?: string | null; photoTakenAt?: string | null };

/** 検索用に寄せる: 全角英数→半角、カタカナ→ひらがな、大文字→小文字 */
export function normalizeForSearch(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

export function searchTerms(q: string): string[] {
  return normalizeForSearch(q).split(/\s+/).filter(Boolean);
}

export function matchesAll(text: string, terms: string[]): boolean {
  if (!terms.length) return false;
  const n = normalizeForSearch(text);
  return terms.every((t) => n.includes(t));
}

/** 最初に当たった語の前後を切り出す（一覧に出す抜粋） */
export function snippet(text: string, terms: string[], radius = 24): string {
  const n = normalizeForSearch(text);
  let at = -1;
  for (const t of terms) {
    const i = n.indexOf(t);
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  if (at < 0) return text.slice(0, radius * 2);
  // NFKC で長さが変わる文字（半角カナ等）があるとずれるが、抜粋なので許す
  const from = Math.max(0, at - radius);
  const to = Math.min(text.length, at + radius * 2);
  return (from > 0 ? '…' : '') + text.slice(from, to).replace(/\s+/g, ' ') + (to < text.length ? '…' : '');
}

/** 表示用に当たった部分を区切る（[text, hit][]） */
export function splitHits(text: string, terms: string[]): Array<[string, boolean]> {
  if (!terms.length || !text) return [[text, false]];
  const n = normalizeForSearch(text);
  // 文字数が変わらない前提で位置を使う（変わるときは強調しないで返す）
  if (n.length !== text.length) return [[text, false]];
  const mark = new Array<boolean>(text.length).fill(false);
  for (const t of terms) {
    let i = n.indexOf(t);
    while (i >= 0) {
      for (let k = i; k < i + t.length; k++) mark[k] = true;
      i = n.indexOf(t, i + t.length);
    }
  }
  const out: Array<[string, boolean]> = [];
  let cur = '';
  let curHit = mark[0];
  for (let i = 0; i < text.length; i++) {
    if (mark[i] !== curHit) {
      out.push([cur, curHit]);
      cur = '';
      curHit = mark[i];
    }
    cur += text[i];
  }
  out.push([cur, curHit]);
  return out;
}

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * 文中の期限らしき表現を YYYY-MM-DD にする。拾えなければ null。
 * 「9/30まで」「9月30日」「明日」「明後日」「今週中」「来週月曜」「金曜まで」
 * 月日だけで今日より前なら来年とみなす。
 */
export function parseDueHint(text: string, today: Date): string | null {
  const t = text.normalize('NFKC');
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const add = (days: number) => {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return ymd(d);
  };

  const md = t.match(/(\d{1,2})\s*[\/月]\s*(\d{1,2})\s*日?/);
  if (md) {
    const m = Number(md[1]);
    const d = Number(md[2]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      let y = base.getFullYear();
      if (new Date(y, m - 1, d) < base) y += 1;
      return ymd(new Date(y, m - 1, d));
    }
  }
  if (/明後日|あさって/.test(t)) return add(2);
  if (/明日|あした/.test(t)) return add(1);
  if (/今日中|本日中|今日まで/.test(t)) return add(0);

  const WD = '日月火水木金土';
  const wd = t.match(/(来週)?\s*([日月火水木金土])曜/);
  if (wd) {
    const target = WD.indexOf(wd[2]);
    const now = base.getDay();
    let diff = (target - now + 7) % 7;
    if (wd[1]) {
      // 来週X曜: 次の月曜から数えた週の X 曜
      const toNextMon = ((1 - now + 7) % 7) || 7;
      diff = toNextMon + ((target - 1 + 7) % 7);
    } else if (diff === 0) {
      diff = 7;
    }
    return add(diff);
  }
  if (/今週中/.test(t)) return add((5 - base.getDay() + 7) % 7); // 金曜
  if (/来週中/.test(t)) return add(((5 - base.getDay() + 7) % 7) + 7);
  return null;
}

/** メンション（@名前）を拾う。名前は空白・読点・句点・「さん」で切る */
export function mentionsIn(text: string): string[] {
  const out: string[] = [];
  for (const m of text.normalize('NFKC').matchAll(/@([^\s@、。,.:：]+)/g)) {
    out.push(m[1].replace(/(さん|様|くん|君)$/, ''));
  }
  return out;
}

/** タスクにする文言: 先頭の @メンションを外し、1行目を80字まで */
export function taskTextFrom(content: string): string {
  const first = content.split(/\r?\n/).find((l) => l.trim()) ?? '';
  return first
    .replace(/^\s*(@[^\s@]+\s*)+/, '')
    .trim()
    .slice(0, 80);
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const stamp = (d: Date) => `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** 選んだ発言をメモ（議事録）の HTML にする。決定事項は ☐ でチェック項目にする */
export function minutesHtml(opts: { room: string; lines: ChatLine[]; nameOf: (uid: string) => string; decisions?: Set<string> }): string {
  const lines = [...opts.lines].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const first = lines[0]?.createdAt;
  const last = lines[lines.length - 1]?.createdAt;
  const period = first && last ? (ymd(first) === ymd(last) ? ymd(first) : `${ymd(first)} 〜 ${ymd(last)}`) : '';
  const decided = lines.filter((l) => opts.decisions?.has(l.id));
  const parts = [
    `<h2>${esc(opts.room)} 打合せ記録</h2>`,
    `<p>期間: ${esc(period)}（yychat より ${lines.length} 件）</p>`,
  ];
  if (decided.length) {
    parts.push('<h3>決定事項</h3>');
    for (const l of decided) parts.push(`<div>☐ ${esc(l.content.split(/\r?\n/)[0])}（${esc(opts.nameOf(l.senderId))}）</div>`);
  }
  parts.push('<h3>やりとり</h3>');
  for (const l of lines) {
    const body = esc(l.content).replace(/\r?\n/g, '<br>');
    const photo = l.imageUrl ? `<br><img src="${esc(l.imageUrl)}" alt="" style="max-width:320px;height:auto" />${l.photoTakenAt ? `<br><small>撮影 ${esc(l.photoTakenAt)}</small>` : ''}` : '';
    parts.push(`<p><b>${esc(opts.nameOf(l.senderId))}</b> <small>${stamp(l.createdAt)}</small><br>${body}${photo}</p>`);
  }
  return parts.join('');
}

/** EXIF の撮影日時（Date）を表示用に「2026/9/24 10:32」 */
export function formatTaken(d: Date): string {
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
