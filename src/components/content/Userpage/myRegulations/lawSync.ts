/**
 * My法規 × e-Gov の照合ロジック（画面から切り離してある）。
 *
 * 1つの条項について、次のどれかを返す:
 *   same      … 保存している条文が、現行の条文の中にそのまま残っている
 *   changed   … e-Gov から取り込んだ（または照合済みの）条文が、その後の改正で変わった
 *   differs   … 手で貼った条文が、現行と一致しない（古い版を貼った / 書き込みがある）
 *   missing   … その条項が e-Gov に無い（削除・繰下げ・番号の打ち間違い）
 *   unsupported … 附則など、条番号から e-Gov の位置を決められない
 *   error     … 通信の失敗
 * どれにも「施行前の改正で変わるか」（upcoming）が付くことがある。
 */
import {
  buildElm,
  EgovError,
  fetchLawElement,
  fetchRevisions,
  lawTextStillHolds,
  mapLimited,
  normalizeLawText,
  type LawElement,
  type LawRevision,
} from '@/lib/egovLaw';
import { diffChars, type StyledText } from '@/lib/lawDiff';

export interface ArticleSource {
  /** e-Gov の位置。`MainProvision-Article_52-Paragraph_2` */
  elm: string;
  /** 照合した版 */
  revisionId: string;
  enforcementDate: string | null;
  /** 照合した時点の条文（プレーンテキスト）。抜き出しの場合はその抜き出し */
  text: string;
  checkedAt: number;
  /** 「このまま残す」を選んだ版。この版の間は警告を弱める */
  ackRevisionId?: string;
}

export interface LawLink {
  lawId: string;
  lawTitle: string;
  lawNum: string;
}

export type Upcoming = { revision: LawRevision; element: LawElement | null };

export type ArticleCheck =
  | { status: 'same'; elm: string; current: LawElement; upcoming?: Upcoming }
  | { status: 'changed'; elm: string; current: LawElement; baseline: ArticleSource; acked: boolean; upcoming?: Upcoming }
  | { status: 'differs'; elm: string; current: LawElement; userText: string; acked: boolean; upcoming?: Upcoming }
  | { status: 'missing'; elm: string }
  | { status: 'unsupported' }
  | { status: 'error'; message: string };

export type HoukiCheck = {
  checkedAt: number;
  current: LawRevision | null;
  upcoming: LawRevision[];
  articles: Record<string, ArticleCheck>;
  /** 照合の結果、保存し直すべき source（初めて照合できた条項・版だけ進んだ条項） */
  sourceUpdates: Record<string, ArticleSource>;
  error?: string;
};

type ArticleLike = { id: string; jo: string; ko: string; go: string; text: string; source?: ArticleSource };

// ---------------------------------------------------------------------------
// HTML ⇔ 書式つき文字列
// ---------------------------------------------------------------------------

/**
 * My法規の本文（contentEditable の HTML）を、1文字ごとの書式に分解する。
 * 太字・文字色・ハイライトだけを拾う（エディタで付けられるのがこの3つだけなので）。
 */
export function htmlToStyled(html: string): StyledText {
  const text: string[] = [];
  const styles: string[] = [];
  if (typeof DOMParser === 'undefined') return { text: html.replace(/<[^>]*>/g, ''), styles: [] };
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');

  type St = { bold: boolean; color: string; bg: string };
  const key = (s: St) =>
    [s.bold ? 'font-weight:bold' : '', s.color ? `color:${s.color}` : '', s.bg ? `background-color:${s.bg}` : '']
      .filter(Boolean)
      .join(';');
  const newline = () => {
    if (text.length && text[text.length - 1] !== '\n') {
      text.push('\n');
      styles.push('');
    }
  };

  const walk = (node: Node, st: St) => {
    if (node.nodeType === Node.TEXT_NODE) {
      for (const ch of Array.from(node.textContent ?? '')) {
        text.push(ch === ' ' ? ' ' : ch);
        styles.push(ch === '\n' ? '' : key(st));
      }
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName;
    if (tag === 'BR') {
      text.push('\n');
      styles.push('');
      return;
    }
    const next: St = { ...st };
    if (tag === 'B' || tag === 'STRONG') next.bold = true;
    const fw = node.style.fontWeight;
    if (fw === 'bold' || Number(fw) >= 600) next.bold = true;
    const color = node.getAttribute('color') || node.style.color;
    if (color) next.color = color;
    if (node.style.backgroundColor) next.bg = node.style.backgroundColor;
    const block = tag === 'DIV' || tag === 'P' || tag === 'LI';
    if (block) newline();
    node.childNodes.forEach((c) => walk(c, next));
    if (block) newline();
  };
  doc.body.firstChild?.childNodes.forEach((c) => walk(c, { bold: false, color: '', bg: '' }));

  // 末尾の改行は落とす
  while (text.length && text[text.length - 1] === '\n') {
    text.pop();
    styles.pop();
  }
  return { text: text.join(''), styles };
}

export const htmlToPlain = (html: string) => htmlToStyled(html).text;

// ---------------------------------------------------------------------------
// 抜き出しの追従
// ---------------------------------------------------------------------------

/**
 * 条文の一部だけを保存していた人の、新しい版での「同じ部分」を返す。
 * 旧全文の中で抜き出しがある範囲を探し、差分の対応づけで新全文の範囲に写す。
 * 見つからなければ新全文をそのまま返す。
 */
export function mapExcerpt(oldFull: string, newFull: string, excerpt: string): string {
  const ex = normalizeLawText(excerpt);
  const oldChars = Array.from(oldFull);
  // 空白を除いた列と元の位置
  const pos: number[] = [];
  let norm = '';
  oldChars.forEach((c, i) => {
    if (!/[\s　]/.test(c)) {
      pos.push(i);
      norm += c;
    }
  });
  if (!ex || norm === ex) return newFull;
  const at = norm.indexOf(ex);
  if (at < 0) return newFull;
  const start = pos[at];
  const end = pos[at + Array.from(ex).length - 1];

  const d = diffChars(oldFull, newFull);
  let ns = -1;
  for (let i = start; i <= end && ns < 0; i++) ns = d.aToB[i];
  let ne = -1;
  for (let i = end; i >= start && ne < 0; i--) ne = d.aToB[i];
  if (ns < 0 || ne < ns) return newFull;
  return Array.from(newFull).slice(ns, ne + 1).join('');
}

// ---------------------------------------------------------------------------
// 照合
// ---------------------------------------------------------------------------

const notFound = (e: unknown) => e instanceof EgovError && e.kind === 'not-found';

export async function checkHouki(link: LawLink, articles: ArticleLike[]): Promise<HoukiCheck> {
  const result: HoukiCheck = { checkedAt: Date.now(), current: null, upcoming: [], articles: {}, sourceUpdates: {} };
  let revisions: LawRevision[];
  try {
    revisions = await fetchRevisions(link.lawId);
  } catch (e) {
    result.error = e instanceof Error ? e.message : 'e-Gov に接続できません';
    return result;
  }
  result.current = revisions.find((r) => r.status === 'CurrentEnforced') ?? null;
  result.upcoming = revisions
    .filter((r) => r.status === 'UnEnforced')
    .sort((a, b) => (a.enforcementDate ?? '9999').localeCompare(b.enforcementDate ?? '9999'));

  await mapLimited(articles, 3, async (art) => {
    try {
      result.articles[art.id] = await checkArticle(link, art, result);
    } catch (e) {
      result.articles[art.id] = { status: 'error', message: e instanceof Error ? e.message : '照合に失敗しました' };
    }
  });
  return result;
}

async function checkArticle(link: LawLink, art: ArticleLike, ctx: HoukiCheck): Promise<ArticleCheck> {
  const elm = art.source?.elm || buildElm(art.jo, art.ko, art.go);
  if (!elm) return { status: 'unsupported' };
  const userText = htmlToPlain(art.text);
  if (!art.source && !normalizeLawText(userText)) return { status: 'unsupported' };

  let current: LawElement;
  try {
    // 照合済みの版がそのまま現行なら、取りに行かない
    current =
      art.source && ctx.current && art.source.revisionId === ctx.current.revisionId
        ? { text: art.source.text, revisionId: art.source.revisionId, enforcementDate: art.source.enforcementDate }
        : await fetchLawElement(link.lawId, elm);
  } catch (e) {
    if (notFound(e)) return { status: 'missing', elm };
    throw e;
  }

  const baselineText = art.source?.text ?? userText;
  const holds = lawTextStillHolds(baselineText, current.text);
  // この先の版でも残るか。現行と既に違う条項は、現行の条文がこの先も残るかを見る
  // （保存分で見ると、どの版とも違うので「次の版で変わる」と誤って出る）
  const upcoming = await findUpcoming(elm, holds ? baselineText : current.text, ctx.upcoming);

  if (holds) {
    // 一致した。初めての照合なら記録し、版だけ進んだなら版を進める
    if (!art.source || art.source.revisionId !== current.revisionId || art.source.elm !== elm) {
      ctx.sourceUpdates[art.id] = {
        elm,
        revisionId: current.revisionId,
        enforcementDate: current.enforcementDate,
        text: art.source?.text ?? userText,
        checkedAt: Date.now(),
      };
    }
    // 照合済みの版が現行でない場合、current.text は取り直した全文。そうでなければ保存分
    return { status: 'same', elm, current, upcoming };
  }

  if (art.source) {
    return {
      status: 'changed',
      elm,
      current,
      baseline: art.source,
      acked: art.source.ackRevisionId === current.revisionId,
      upcoming,
    };
  }
  return { status: 'differs', elm, current, userText, acked: false, upcoming };
}

/**
 * 施行前の版のうち、保存している条文が崩れる最初の版を探す。
 * いちばん先の版で崩れないなら、途中の版も（ふつうは）崩れないので、先に最後の版を見る。
 */
async function findUpcoming(elm: string, baseline: string, upcoming: LawRevision[]): Promise<Upcoming | undefined> {
  if (!upcoming.length) return undefined;
  const readAt = async (rev: LawRevision) => {
    try {
      return await fetchLawElement(rev.revisionId, elm);
    } catch (e) {
      if (notFound(e)) return null; // その版では条項ごと無くなる
      throw e;
    }
  };
  const last = upcoming[upcoming.length - 1];
  const lastEl = await readAt(last);
  if (lastEl && lawTextStillHolds(baseline, lastEl.text)) return undefined;
  for (const rev of upcoming.slice(0, -1)) {
    const el = await readAt(rev);
    if (!el || !lawTextStillHolds(baseline, el.text)) return { revision: rev, element: el };
  }
  return { revision: last, element: lastEl };
}

/** 条項の数とステータスから、法規一覧に出す印を決める。 */
export function summarize(check: HoukiCheck | undefined): 'changed' | 'upcoming' | 'ok' | null {
  if (!check || check.error) return null;
  const all = Object.values(check.articles);
  if (all.some((a) => (a.status === 'changed' || a.status === 'differs') && !a.acked) || all.some((a) => a.status === 'missing'))
    return 'changed';
  if (all.some((a) => 'upcoming' in a && a.upcoming)) return 'upcoming';
  return 'ok';
}
