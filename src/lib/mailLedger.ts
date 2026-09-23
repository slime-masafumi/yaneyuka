/**
 * yymail（物件メール台帳）の判定まわり。画面と保存から切り離してある。
 * テスト: node scripts/test-mail-ledger.ts
 */

// ---------------------------------------------------------------------------
// 図面の番号と版
// ---------------------------------------------------------------------------

export type DrawingRef = {
  /** 図番。「A101」「Ａ－１０１」も「A-101」に揃える（同じ図面を同じ束にするため） */
  number: string;
  /** 版。「2」「B」など。読めなければ null（＝初版扱い） */
  rev: string | null;
  /** 版の並び順。数字はその値、英字は A=1, B=2… */
  revOrder: number;
  /** ファイル名から図番・版・日付を除いた残り（図面名） */
  title: string;
};

/** 図番と間違えやすい接頭辞（版やナンバリングの記号） */
const NOT_A_SERIES = new Set(['R', 'REV', 'V', 'VER', 'NO', 'P', 'PP', 'VOL']);

/**
 * 添付ファイル名から図番と版を読む。図番が無ければ null（図面ではない添付）。
 *
 *   A-101_1階平面図_rev2.pdf     → A-101 / 2
 *   A101 1階平面図 (B).pdf       → A-101 / B
 *   S-02_基礎伏図_第3版.pdf      → S-02 / 3
 *   20260415_E-10_電灯設備図△1.pdf → E-10 / 1
 */
export function parseDrawingName(filename: string): DrawingRef | null {
  let base = filename.normalize('NFKC').replace(/\.[A-Za-z0-9]{1,5}$/, '');
  // 日付（20260415 / 2026-04-15）は図番や版と取り違えないよう先に外す
  base = base.replace(/(?<!\d)(?:19|20)\d{2}[-._]?\d{2}[-._]?\d{2}(?!\d)/g, ' ');

  const numRe = /(^|[^A-Za-z])([A-Za-z]{1,3})([-_ ]?)(\d{1,4})(?![\d.])/g;
  let number: string | null = null;
  let numText = '';
  for (let m = numRe.exec(base); m; m = numRe.exec(base)) {
    const series = m[2].toUpperCase();
    if (NOT_A_SERIES.has(series)) continue;
    // 区切りが無いときは2桁以上に限る（「B1」のような階の表記を図番にしない）
    if (!m[3] && m[4].length < 2) continue;
    number = `${series}-${m[4]}`;
    numText = m[0].slice(m[1].length);
    break;
  }
  if (!number) return null;
  let rest = base.replace(numText, ' ');

  let rev: string | null = null;
  const revPatterns: RegExp[] = [
    /(?:rev|ver)\.?[\s_-]?(\d{1,3}|[A-Z])(?![A-Za-z\d])/i,
    /(?<![A-Za-z])[RrVv][\s._-]?(\d{1,3})(?!\d)/,
    /第\s*(\d{1,3})\s*版/,
    /[△▲](\d{1,2})/,
    /改\s*(\d{1,2})/,
    // 英字1字の括弧だけを版と見る（「(2)」は保存時の重複番号のことが多い）
    /[(（]([A-Z])[)）]/,
  ];
  for (const re of revPatterns) {
    const m = rest.match(re);
    if (m) {
      rev = m[1].toUpperCase();
      rest = rest.replace(m[0], ' ');
      break;
    }
  }

  const revOrder = rev === null ? 0 : /^\d+$/.test(rev) ? Number(rev) : rev.charCodeAt(0) - 64;
  const title = rest.replace(/[\s_\-.]+/g, ' ').trim();
  return { number, rev, revOrder, title };
}

// ---------------------------------------------------------------------------
// 件名と物件
// ---------------------------------------------------------------------------

/** 「Re: Fwd: [A邸] 件名」→「[A邸] 件名」。返信・転送の接頭辞だけを外す */
export function normalizeSubject(subject: string): string {
  let s = subject.normalize('NFKC').trim();
  for (;;) {
    const next = s.replace(/^(?:re|fw|fwd|返信|転送|aw)\s*(?:\[\d+\])?\s*[:：]\s*/i, '').trim();
    if (next === s) return s;
    s = next;
  }
}

export type ProjectRule = {
  id: string;
  name: string;
  /** 件名・本文・差出人・宛先のどれかに含まれていたらこの物件 */
  keywords: string[];
};

export type MailLike = {
  subject: string;
  text: string;
  from: string;
  to: string[];
  cc: string[];
};

/**
 * どの物件のメールか。件名で当たったものを優先し（件名に物件名を入れる慣習が強いので）、
 * 次に宛先・差出人、最後に本文で見る。どれにも当たらなければ null（未仕分け）。
 */
export function matchProject(mail: MailLike, projects: ProjectRule[]): string | null {
  const subject = mail.subject.normalize('NFKC').toLowerCase();
  const people = [mail.from, ...mail.to, ...mail.cc].join(' ').toLowerCase();
  const body = mail.text.normalize('NFKC').toLowerCase();
  let best: { id: string; score: number } | null = null;
  for (const p of projects) {
    let score = 0;
    for (const raw of p.keywords) {
      const k = raw.normalize('NFKC').trim().toLowerCase();
      if (!k) continue;
      if (subject.includes(k)) score += 100;
      else if (people.includes(k)) score += 10;
      else if (body.includes(k)) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { id: p.id, score };
  }
  return best?.id ?? null;
}

// ---------------------------------------------------------------------------
// その他
// ---------------------------------------------------------------------------

/** 同じメールを二度取り込まないための ID（Message-ID が無ければ件名・日時・差出人から） */
export async function mailIdOf(messageId: string | undefined, fallback: string): Promise<string> {
  const key = messageId?.trim() || fallback;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return Array.from(new Uint8Array(buf).slice(0, 12), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** 本文から宿題らしい行を拾う（タスク化の候補）。「〜してください」「期限」「までに」など */
export function pickTodoLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[>\s・\-*●○■□◆◇]+/, '').trim())
    .filter((l) => l.length >= 6 && l.length <= 120)
    // 依頼の言い回しがある行だけ。「修正版です」のような報告は拾わない
    .filter((l) => /(ください|下さい|お願い(いた)?します|までに|期限|至急|ご確認|ご回答)/.test(l))
    .filter((l) => !/^(差出人|送信日時|宛先|件名|From|To|Sent|Subject)[:：]/i.test(l))
    .slice(0, 8);
}
