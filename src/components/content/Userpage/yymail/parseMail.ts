/**
 * メールのファイル（.eml / Outlook の .msg）を読む。ブラウザの中だけで完結する。
 *
 *   .eml … Gmail「メッセージをダウンロード」、Apple メール・Thunderbird のドラッグ
 *   .msg … Outlook（従来版）でメールをデスクトップへドラッグしたもの
 *
 * 日本のメールは ISO-2022-JP / Shift_JIS が今も多い。postal-mime はブラウザの
 * TextDecoder で復号するので、どちらも読める。
 */
import PostalMime from 'postal-mime';
import MsgReader from '@kenjiuno/msgreader';

export type Address = { name: string; address: string };

export type ParsedAttachment = { filename: string; mimeType: string; data: Uint8Array };

export type ParsedMail = {
  messageId?: string;
  subject: string;
  from: Address;
  to: Address[];
  cc: Address[];
  /** ISO 8601 */
  date: string;
  text: string;
  attachments: ParsedAttachment[];
};

/** Firestore の1文書（1MB）に確実に収まるよう本文は切る */
const MAX_TEXT = 60_000;

const isOle = (buf: ArrayBuffer) => {
  const b = new Uint8Array(buf, 0, 4);
  return b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;
};

/** HTML しか無いメールのための、ごく簡単な文字起こし */
function htmlToText(html: string): string {
  if (typeof DOMParser === 'undefined') return html.replace(/<[^>]*>/g, '');
  const doc = new DOMParser().parseFromString(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li)>/gi, '\n'), 'text/html');
  return (doc.body.textContent ?? '').replace(/\n{3,}/g, '\n\n');
}

const mimeOf = (name: string) => {
  const ext = name.toLowerCase().split('.').pop();
  return (
    { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', dwg: 'application/acad', dxf: 'image/vnd.dxf', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', zip: 'application/zip' } as Record<string, string>
  )[ext ?? ''] ?? 'application/octet-stream';
};

async function parseEml(buf: ArrayBuffer): Promise<ParsedMail> {
  const m = await PostalMime.parse(buf);
  const addr = (a?: { name?: string; address?: string }) => ({ name: a?.name ?? '', address: a?.address ?? '' });
  const list = (xs?: { name?: string; address?: string; group?: unknown[] }[]) =>
    (xs ?? []).flatMap((x) => ((x as { group?: { name?: string; address?: string }[] }).group ?? [x]).map(addr));
  return {
    messageId: m.messageId,
    subject: m.subject ?? '',
    from: addr(m.from as { name?: string; address?: string } | undefined),
    to: list(m.to as never),
    cc: list(m.cc as never),
    date: m.date ? new Date(m.date).toISOString() : new Date().toISOString(),
    text: (m.text || (m.html ? htmlToText(m.html) : '')).slice(0, MAX_TEXT),
    attachments: (m.attachments ?? [])
      // 本文に埋め込まれた画像（署名のロゴなど）は台帳に載せない
      .filter((a) => a.disposition !== 'inline' || !!a.filename?.match(/\.(pdf|dwg|dxf|xlsx?|docx?|zip)$/i))
      .map((a, i) => ({
        filename: a.filename || `添付${i + 1}`,
        mimeType: a.mimeType || mimeOf(a.filename ?? ''),
        data: a.content instanceof Uint8Array ? a.content : new Uint8Array(a.content as ArrayBuffer),
      })),
  };
}

function parseMsg(buf: ArrayBuffer): ParsedMail {
  const reader = new MsgReader(buf);
  const d = reader.getFileData();
  const recips = d.recipients ?? [];
  const pick = (type: string) =>
    recips.filter((r) => (r.recipType ?? 'to') === type).map((r) => ({ name: r.name ?? '', address: r.smtpAddress || r.email || '' }));
  // Message-ID は転送ヘッダの中にしか無い
  const messageId = d.headers?.match(/^message-id:\s*(<[^>]+>)/im)?.[1];
  const when = d.messageDeliveryTime || d.clientSubmitTime;
  return {
    messageId,
    subject: d.subject ?? '',
    from: { name: d.senderName ?? '', address: d.senderSmtpAddress || d.senderEmail || '' },
    to: pick('to'),
    cc: pick('cc'),
    date: when ? new Date(when).toISOString() : new Date().toISOString(),
    text: (d.body || (d.bodyHtml ? htmlToText(d.bodyHtml) : '')).slice(0, MAX_TEXT),
    attachments: (d.attachments ?? [])
      .filter((a) => !a.attachmentHidden)
      .map((a) => {
        const att = reader.getAttachment(a);
        return { filename: att.fileName, mimeType: a.attachMimeTag || mimeOf(att.fileName), data: att.content };
      }),
  };
}

export async function parseMailFile(file: File): Promise<ParsedMail> {
  const buf = await file.arrayBuffer();
  if (isOle(buf)) return parseMsg(buf);
  return parseEml(buf);
}

export const isMailFile = (f: File) => /\.(eml|msg)$/i.test(f.name) || f.type === 'message/rfc822';
