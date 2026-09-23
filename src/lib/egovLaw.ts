/**
 * e-Gov 法令API（v2）から条文を取る。My法規の「改正追従」の土台。
 *
 *   https://laws.e-gov.go.jp/api/2/
 *
 * - 鍵は要らない。CORS も `Access-Control-Allow-Origin: *` なのでブラウザから直接読める
 *   （サーバーを経由させる理由が無いので経由させない）
 * - `elm` で条・項・号だけを切り出せる。`MainProvision-Article_52-Paragraph_2-Item_1`
 * - `law_revisions` で改正履歴が取れる。**施行前（UnEnforced）の版も入っている**ので、
 *   「この条文は 2028-07-30 施行の改正で変わる」まで前もって分かる
 *
 * 告示の多くは e-Gov に載っていない。載っていない法令は追従の対象外とする。
 */

const API = 'https://laws.e-gov.go.jp/api/2';

// ---------------------------------------------------------------------------
// 番号の読み取り
// ---------------------------------------------------------------------------

const KANJI_DIGIT: Record<string, number> = {
  〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
};
const KANJI_UNIT: Record<string, number> = { 十: 10, 百: 100, 千: 1000 };

/** 「五十二」「百二十六」「52」「５２」を数に。読めなければ null。 */
export function parseJaNumber(input: string): number | null {
  const s = input.trim().replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  if (!s) return null;
  if (/^\d+$/.test(s)) return Number(s);
  if (!/^[〇一二三四五六七八九十百千]+$/.test(s)) return null;
  let total = 0;
  let digit = 0;
  for (const ch of s) {
    if (ch in KANJI_DIGIT) {
      digit = KANJI_DIGIT[ch];
    } else {
      // 「十」単独は 10、「二十」は 20
      total += (digit || 1) * KANJI_UNIT[ch];
      digit = 0;
    }
  }
  return total + digit;
}

const IROHA = 'イロハニホヘトチリヌルヲワカヨタレソツネナラムウヰノオクヤマケフコエテアサキユメミシヱヒモセス';

/**
 * My法規の「条・項・号」欄から e-Gov の elm を組み立てる。
 *
 *   ('第52条', '2項', '')        → MainProvision-Article_52-Paragraph_2
 *   ('第百二十六条の二', '', '') → MainProvision-Article_126_2
 *   ('52', '', '3号')            → MainProvision-Article_52-Paragraph_1-Item_3
 *   ('20', '1', '一イ')          → …-Item_1-Subitem1_1
 *
 * 附則や「別表」のように本則の条番号で表せないものは null（追従の対象外）。
 */
export function buildElm(jo: string, ko: string, go: string): string | null {
  const joBody = jo.trim().replace(/^第/, '').replace(/条/, '');
  if (!joBody) return null;
  const joParts = joBody.split('の').map(parseJaNumber);
  if (joParts.some((n) => n === null || n === 0)) return null;
  let elm = `MainProvision-Article_${joParts.join('_')}`;

  const koBody = ko.trim().replace(/^第/, '').replace(/項$/, '');
  const goBody = go.trim().replace(/^第/, '');
  if (!koBody && !goBody) return elm;

  const koNum = koBody ? parseJaNumber(koBody) : 1;
  if (!koNum) return null;
  elm += `-Paragraph_${koNum}`;
  if (!goBody) return elm;

  // 「3号」「三号イ」「3号の2」
  const m = goBody.match(/^(.+?)号?(?:の(.+?))?([イ-ヱ])?$/);
  if (!m) return null;
  const goNum = parseJaNumber(m[1]);
  if (!goNum) return null;
  const goBranch = m[2] ? parseJaNumber(m[2]) : null;
  if (m[2] && !goBranch) return null;
  elm += `-Item_${goNum}${goBranch ? `_${goBranch}` : ''}`;

  if (m[3]) {
    const idx = IROHA.indexOf(m[3]);
    if (idx < 0) return null;
    elm += `-Subitem1_${idx + 1}`;
  }
  return elm;
}

// ---------------------------------------------------------------------------
// 本文の組み立て
// ---------------------------------------------------------------------------

type LawNode = { tag: string; attr?: Record<string, string>; children?: (LawNode | string)[] };

/** ルビの読み（Rt）は本文に混ぜない。 */
function inline(node: LawNode | string): string {
  if (typeof node === 'string') return node;
  if (node.tag === 'Rt') return '';
  const kids = node.children ?? [];
  // 号の中の「一　木造」のような区切りは Column で来る
  if (kids.some((k) => typeof k !== 'string' && k.tag === 'Column')) {
    return kids.map((k) => inline(k)).filter(Boolean).join('　');
  }
  return kids.map(inline).join('');
}

const child = (node: LawNode, tag: string) =>
  (node.children ?? []).find((k): k is LawNode => typeof k !== 'string' && k.tag === tag);

const ITEM_TAG = /^(Item|Subitem\d+)$/;

function emit(node: LawNode, out: string[], lead = ''): void {
  const tag = node.tag;

  if (tag === 'Article') {
    const caption = child(node, 'ArticleCaption');
    if (caption) out.push(inline(caption));
    const title = inline(child(node, 'ArticleTitle') ?? { tag: 'x' });
    let first = true;
    for (const k of node.children ?? []) {
      if (typeof k === 'string' || k.tag === 'ArticleCaption' || k.tag === 'ArticleTitle') continue;
      emit(k, out, first ? `${title}　` : '');
      first = false;
    }
    return;
  }

  if (tag === 'Paragraph') {
    const num = inline(child(node, 'ParagraphNum') ?? { tag: 'x' });
    const sentence = inline(child(node, 'ParagraphSentence') ?? { tag: 'x' });
    out.push(`${lead || (num ? `${num}　` : '')}${sentence}`);
    for (const k of node.children ?? []) {
      if (typeof k === 'string' || k.tag === 'ParagraphNum' || k.tag === 'ParagraphSentence' || k.tag === 'ParagraphCaption') continue;
      emit(k, out);
    }
    return;
  }

  if (ITEM_TAG.test(tag)) {
    const title = inline(child(node, `${tag}Title`) ?? { tag: 'x' });
    const sentence = inline(child(node, `${tag}Sentence`) ?? { tag: 'x' });
    out.push(`${lead}${title}　${sentence}`);
    for (const k of node.children ?? []) {
      if (typeof k === 'string' || k.tag === `${tag}Title` || k.tag === `${tag}Sentence`) continue;
      emit(k, out);
    }
    return;
  }

  if (tag === 'TableRow') {
    out.push((node.children ?? []).map(inline).join('　｜　'));
    return;
  }

  // 見出しや段落の外にある文（表の注記など）
  if (tag === 'Sentence' || tag === 'ListSentence' || tag === 'Remarks') {
    out.push(inline(node));
    return;
  }

  for (const k of node.children ?? []) {
    if (typeof k === 'string') {
      if (k.trim()) out.push(k);
    } else {
      emit(k, out);
    }
  }
}

/** e-Gov の JSON（条・項・号のどれでも）を、法令集の見た目に近いプレーンテキストに。 */
export function lawNodeToText(node: LawNode): string {
  const out: string[] = [];
  emit(node, out);
  return out.map((l) => l.trimEnd()).filter((l) => l.trim()).join('\n');
}

/** 比べるときは空白と改行を無視する（貼り付けた条文と e-Gov で字詰めが違うため）。 */
export const normalizeLawText = (s: string) => s.replace(/[\s　]+/g, '');

/**
 * 保存してある条文（baseline）が、今の条文の中にそのまま残っているか。
 * 条文の一部だけを抜き出して保存している人もいるので、一致ではなく包含で見る。
 */
export const lawTextStillHolds = (baseline: string, current: string) => {
  const b = normalizeLawText(baseline);
  return b.length > 0 && normalizeLawText(current).includes(b);
};

// ---------------------------------------------------------------------------
// 取得
// ---------------------------------------------------------------------------

export type LawSummary = {
  lawId: string;
  title: string;
  lawNum: string;
  lawType: string;
};

export type LawRevision = {
  revisionId: string;
  /** 施行日（YYYY-MM-DD）。施行日未定の改正は予定日か null */
  enforcementDate: string | null;
  promulgateDate: string | null;
  amendmentLawTitle: string | null;
  status: 'CurrentEnforced' | 'UnEnforced' | 'PreviousEnforced' | string;
  /** 施行日が「政令で定める日」等のときの但し書き */
  enforcementComment: string | null;
};

export type LawElement = {
  text: string;
  revisionId: string;
  enforcementDate: string | null;
};

export class EgovError extends Error {
  readonly kind: 'not-found' | 'network' | 'server';
  constructor(message: string, kind: 'not-found' | 'network' | 'server') {
    super(message);
    this.kind = kind;
  }
}

const cache = new Map<string, Promise<unknown>>();

/**
 * 1回だけ再試行する。e-Gov は公共の API なので、失敗しても叩き続けない。
 * 同じ URL は同じ画面の中で使い回す（改正チェックで同じ条を何度も読まない）。
 */
function getJson<T>(path: string): Promise<T> {
  const url = `${API}${path}`;
  const hit = cache.get(url);
  if (hit) return hit as Promise<T>;

  const run = async (): Promise<T> => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15_000);
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (res.status === 400 || res.status === 404) {
          const body = await res.json().catch(() => ({}));
          throw new EgovError(body?.message || '該当する条文がありません', 'not-found');
        }
        if (res.ok) return (await res.json()) as T;
        if (attempt === 0 && (res.status === 429 || res.status >= 500)) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        throw new EgovError(`e-Gov が応答しません（${res.status}）`, 'server');
      } catch (e) {
        if (e instanceof EgovError) throw e;
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        throw new EgovError('e-Gov に接続できません', 'network');
      } finally {
        clearTimeout(timer);
      }
    }
    throw new EgovError('e-Gov に接続できません', 'network');
  };

  const p = run();
  cache.set(url, p);
  // 失敗は覚えない（次に押したときにやり直せるように）
  p.catch(() => cache.delete(url));
  return p;
}

type RevisionInfoJson = {
  law_revision_id: string;
  law_title: string;
  amendment_enforcement_date: string | null;
  amendment_scheduled_enforcement_date: string | null;
  amendment_promulgate_date: string | null;
  amendment_law_title: string | null;
  amendment_enforcement_comment: string | null;
  current_revision_status: string;
  repeal_status: string;
};

type LawInfoJson = { law_id: string; law_num: string; law_type: string };

/** 法令名で探す（部分一致）。廃止済みは除く。 */
export async function searchLaws(title: string): Promise<LawSummary[]> {
  const q = title.trim();
  if (!q) return [];
  const data = await getJson<{ laws: { law_info: LawInfoJson; revision_info: RevisionInfoJson }[] }>(
    `/laws?law_title=${encodeURIComponent(q)}&limit=20`
  ).catch((e) => {
    if (e instanceof EgovError && e.kind === 'not-found') return { laws: [] };
    throw e;
  });
  return data.laws
    .filter((l) => l.revision_info.repeal_status === 'None')
    .map((l) => ({
      lawId: l.law_info.law_id,
      title: l.revision_info.law_title,
      lawNum: l.law_info.law_num,
      lawType: l.law_info.law_type,
    }));
}

/** 改正履歴。新しい順。 */
export async function fetchRevisions(lawId: string): Promise<LawRevision[]> {
  const data = await getJson<{ revisions: RevisionInfoJson[] }>(`/law_revisions/${encodeURIComponent(lawId)}`);
  return data.revisions.map((r) => ({
    revisionId: r.law_revision_id,
    enforcementDate: r.amendment_enforcement_date ?? r.amendment_scheduled_enforcement_date,
    promulgateDate: r.amendment_promulgate_date,
    amendmentLawTitle: r.amendment_law_title,
    status: r.current_revision_status,
    enforcementComment: r.amendment_enforcement_comment,
  }));
}

/**
 * 条・項・号の本文。`target` は法令ID（＝現行）か版ID（＝その版）。
 * 見つからなければ EgovError('not-found')。
 */
export async function fetchLawElement(target: string, elm: string): Promise<LawElement> {
  const data = await getJson<{ revision_info: RevisionInfoJson; law_full_text: LawNode }>(
    `/law_data/${encodeURIComponent(target)}?response_format=json&elm=${encodeURIComponent(elm)}`
  );
  return {
    text: lawNodeToText(data.law_full_text),
    revisionId: data.revision_info.law_revision_id,
    enforcementDate: data.revision_info.amendment_enforcement_date,
  };
}

/** 同時に投げる数を絞って順に処理する（公共 API に一度に数十本投げない）。 */
export async function mapLimited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** 「2026-05-27」→「令和8年5月27日」。読めなければそのまま。 */
export function toWareki(date: string | null | undefined): string {
  if (!date) return '';
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return date;
  const y = Number(m[1]);
  const md = `${Number(m[2])}月${Number(m[3])}日`;
  if (date.slice(0, 10) >= '2019-05-01') return `令和${y - 2018 === 1 ? '元' : y - 2018}年${md}`;
  if (date.slice(0, 10) >= '1989-01-08') return `平成${y - 1988 === 1 ? '元' : y - 1988}年${md}`;
  return `${y}年${md}`;
}
