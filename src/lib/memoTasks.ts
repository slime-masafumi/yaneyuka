/**
 * メモ（議事録・現場巡回・是正指示）から宿題を拾って Myタスクにする（純粋ロジック）。
 *   - 「宿題」「指摘・是正」「是正期限」などの見出しの下の行
 *   - どこに書いてあっても、☐ で始まる行（未完了のチェック項目）
 * 担当は「担当: 田中」「（田中）」「@田中」、期限は「9/30」「来週月曜」などから読む。
 */
import { parseDueHint } from './chatTools';

/** メモのひな形の見出し（Memo.tsx の MEMO_TEMPLATES と合わせる） */
const HEADINGS = [
  'コスト・工期への影響', '写真メモ', '出席者', '反映可否', '回答内容', '宛先', '宿題（担当 / 期限）', '折返しの要否',
  '指摘・是正', '指摘内容', '指摘箇所', '日時', '日時・場所', '日時・天候', '是正期限', '次回', '決定事項', '物件名',
  '用件', '相手（会社 / 氏名）', '確認事項', '確認結果', '立会者', '要望内容',
];
/** この見出しの下は宿題として拾う */
const TASK_SECTION = /宿題|指摘・是正|指摘内容|ToDo|TODO|やること|要対応/;
/** 汎用フォルダ名は物件名とみなさない */
const GENERIC_FOLDERS = new Set(['', '議事録', '現場', '連絡', '施主', '未分類', 'メモ', 'yychat']);

export type Homework = { text: string; who: string | null; due: string | null };

const isHeading = (line: string) => HEADINGS.includes(line) || (line.length <= 16 && /^[【■◆]/.test(line));

function parseItem(raw: string, today: Date): Homework | null {
  let line = raw.replace(/^[\s☐□・\-－*•●○]+/, '').replace(/^\d+[.)．）]\s*/, '').trim();
  if (!line || line.length < 2) return null;
  let who: string | null = null;
  const m1 = line.match(/担当[:：]\s*([^\s/／,、）)]+)/);
  const m2 = line.match(/@([^\s@、。/／]+)/);
  const m3 = line.match(/[（(]([^（）()]{1,12})[)）]\s*$/);
  if (m1) who = m1[1];
  else if (m2) who = m2[1].replace(/(さん|様)$/, '');
  else if (m3 && !/\d/.test(m3[1])) who = m3[1].replace(/(さん|様)$/, '');
  const due = parseDueHint(line, today);
  // 本文からは担当・期限の書き方だけ落とす（中身は残す）
  line = line
    .replace(/担当[:：]\s*[^\s/／,、）)]+/, '')
    .replace(/期限[:：]?\s*/, '')
    // 「/ 9/30」のように区切って書いた期限は期限欄へ移したので本文から外す
    .replace(/\s*[/／]\s*\d{1,2}\s*[/月]\s*\d{1,2}\s*日?\s*(まで)?\s*$/, '')
    .replace(/[（(][^（）()]{1,12}[)）]\s*$/, (s) => (who && s.includes(who) ? '' : s))
    .replace(/\s*[/／]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return line ? { text: line.slice(0, 80), who, due } : null;
}

export function extractHomework(plainText: string, today: Date): Homework[] {
  const lines = plainText.split(/\r?\n/).map((l) => l.trim());
  const out: Homework[] = [];
  const seen = new Set<string>();
  let inTask = false;
  for (const line of lines) {
    if (!line) continue;
    if (isHeading(line) || TASK_SECTION.test(line) && line.length <= 16) {
      inTask = TASK_SECTION.test(line);
      continue;
    }
    const checkbox = /^[☐□]/.test(line);
    if (/^[☑✓✔]/.test(line)) continue;
    if (!inTask && !checkbox) continue;
    const item = parseItem(line, today);
    if (item && !seen.has(item.text)) {
      seen.add(item.text);
      out.push(item);
    }
  }
  return out;
}

/** メモの物件名: 「物件名」見出しの下の1行、無ければ物件らしいフォルダ名 */
export function projectOfMemo(plainText: string, folder: string): string | null {
  const lines = plainText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const i = lines.indexOf('物件名');
  if (i >= 0 && lines[i + 1] && !isHeading(lines[i + 1])) return lines[i + 1].slice(0, 40);
  return GENERIC_FOLDERS.has(folder.trim()) ? null : folder.trim();
}

/** Myタスクに入れる文言（【物件】本文（担当）） */
export function taskContent(h: Homework, project: string | null): string {
  return `${project ? `【${project}】` : ''}${h.text}${h.who ? `（${h.who}）` : ''}`;
}
