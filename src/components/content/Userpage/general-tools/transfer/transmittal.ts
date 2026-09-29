/**
 * 送付状（TRANSMITTAL）。図面を送るときに添える「何を・何版で・何枚」送ったかの紙。
 *
 * PDF ライブラリ（jsPDF 等）は日本語フォントを抱えると重く、依存にも無いので、
 * 印刷用の HTML を別窓で開いてブラウザの印刷（PDF に保存も可）に任せる。
 * 相手に送るのはリンクなので、紙はこちらの控えと、必要なら PDF にして添付する用。
 */
import { drawingListText, totalSheets, type StoredDrawing } from './drawingList';

export type TransmittalData = {
  /** 送付状番号（控えと突き合わせる用）。例: T-20260929-AB12CD34 */
  number: string;
  date: Date;
  recipient: string;
  sender: string;
  subject: string;
  purpose: string;
  drawings: StoredDrawing[];
  link: string | null;
  expiresAt: Date | null;
  hasPassword: boolean;
  fileName: string;
  fileSize: string;
  remarks?: string;
};

export const TRANSMITTAL_PURPOSES = ['ご確認', 'ご承認', '施工用', '見積用', '参考', '差替え'] as const;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

const ymd = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

export function transmittalNumber(createdAt: Date, code?: string | null) {
  const d = `${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, '0')}${String(createdAt.getDate()).padStart(2, '0')}`;
  return `T-${d}${code ? `-${code}` : ''}`;
}

/** メール本文に貼る送付文（リンク・期限・図面リスト入り） */
export function transmittalText(t: TransmittalData): string {
  const lines = [
    t.recipient ? `${t.recipient} 様` : '',
    '',
    `下記の${t.drawings.length ? '図面' : 'ファイル'}をお送りします。${t.purpose ? `${t.purpose}のほど、よろしくお願いいたします。` : ''}`,
    '',
    `送付状番号: ${t.number}`,
    t.subject ? `件名: ${t.subject}` : '',
    `ファイル: ${t.fileName}（${t.fileSize}）`,
    t.link ? `ダウンロード: ${t.link}` : '',
    t.expiresAt ? `有効期限: ${t.expiresAt.toLocaleDateString('ja-JP')} まで` : '',
    t.hasPassword ? '合言葉: 別途お知らせします' : '',
    '',
    drawingListText(t.drawings),
    t.remarks ? `\n備考: ${t.remarks}` : '',
    '',
    t.sender ? `${t.sender}` : '',
  ];
  return lines
    .filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
    .join('\n')
    .trim();
}

export function transmittalHtml(t: TransmittalData): string {
  const rows = t.drawings.length
    ? t.drawings
        .map(
          (d, i) =>
            `<tr><td class="m">${String(i + 1).padStart(3, '0')}</td><td class="m">${esc(d.no)}</td><td>${esc(d.title)}</td><td class="m c">${esc(d.rev)}</td><td class="m c">${esc(d.scale)}</td><td class="m r">${d.sheets || ''}</td></tr>`,
        )
        .join('')
    : `<tr><td class="m">001</td><td></td><td>${esc(t.fileName)}</td><td></td><td></td><td class="m r">1</td></tr>`;
  const total = t.drawings.length ? totalSheets(t.drawings) : 1;
  const purposes = TRANSMITTAL_PURPOSES.map((p) => `<span class="${p === t.purpose ? 'on' : ''}">${p === t.purpose ? '■' : '□'} ${p}</span>`).join('');

  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${esc(t.number)} 送付状</title>
<style>
@page { size: A4; margin: 16mm 16mm 18mm; }
* { box-sizing: border-box; }
body { margin: 0; color: #141414; background: #fff; font: 300 10.5pt/1.6 "Helvetica Neue", Helvetica, Arial, "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif; }
.sheet { max-width: 178mm; margin: 0 auto; padding: 8mm 0; }
.m { font-family: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace; letter-spacing: .04em; }
.lbl { font-family: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace; font-size: 7.5pt; letter-spacing: .14em; text-transform: uppercase; color: #6b6b6b; }
.top { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid #141414; padding-bottom: 4mm; }
h1 { margin: 0; font-size: 24pt; font-weight: 700; letter-spacing: -.02em; line-height: 1; }
h1 small { display: block; margin-top: 2mm; font-size: 8pt; font-weight: 300; letter-spacing: .3em; }
.meta { text-align: right; font-size: 9pt; }
.grid { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #141414; }
.grid > div { padding: 3mm 0; border-bottom: 1px solid #d6d6d6; }
.grid > div:nth-child(odd) { padding-right: 4mm; }
.grid > div:nth-child(even) { padding-left: 4mm; border-left: 1px solid #d6d6d6; }
.grid .v { font-size: 11pt; }
.full { grid-column: 1 / -1; padding-left: 0 !important; border-left: 0 !important; }
.purpose span { margin-right: 5mm; font-size: 9.5pt; color: #6b6b6b; white-space: nowrap; }
.purpose span.on { color: #141414; font-weight: 700; }
table { width: 100%; border-collapse: collapse; margin-top: 6mm; font-size: 9.5pt; }
th { text-align: left; font-weight: 300; border-bottom: 1px solid #141414; padding: 1.5mm 1.5mm; }
td { border-bottom: 1px solid #d6d6d6; padding: 2mm 1.5mm; vertical-align: top; }
.c { text-align: center; } .r { text-align: right; }
tfoot td { border-bottom: 1px solid #141414; border-top: 1px solid #141414; }
.link { margin-top: 6mm; font-size: 9pt; word-break: break-all; }
.foot { margin-top: 10mm; display: flex; justify-content: space-between; align-items: flex-end; }
.stamp { width: 24mm; height: 24mm; border: 1px solid #141414; }
.bar { position: fixed; top: 0; left: 0; right: 0; padding: 8px 16px; background: #141414; color: #ece9e2; font: 11px/1.4 sans-serif; display: flex; gap: 12px; align-items: center; }
.bar button { font: inherit; background: none; color: #fff; border: 1px solid #ece9e2; padding: 3px 10px; cursor: pointer; }
@media screen { body { background: #f4f2ec; padding-top: 44px; } .sheet { background: #fff; padding: 14mm 16mm; margin: 16px auto; max-width: 210mm; border: 1px solid #d6d6d6; } }
@media print { .bar { display: none; } }
</style></head><body>
<div class="bar"><button onclick="window.print()">印刷 / PDF に保存</button><span>印刷ダイアログで「PDF に保存」を選ぶと PDF になります</span></div>
<div class="sheet">
  <div class="top">
    <h1>送付状<small class="m">TRANSMITTAL</small></h1>
    <div class="meta"><div class="lbl">No.</div><div class="m">${esc(t.number)}</div><div class="lbl" style="margin-top:2mm">Date</div><div class="m">${ymd(t.date)}</div></div>
  </div>
  <div class="grid">
    <div><div class="lbl">To / 宛先</div><div class="v">${esc(t.recipient || '　')}${t.recipient ? ' 様' : ''}</div></div>
    <div><div class="lbl">From / 差出人</div><div class="v">${esc(t.sender || '　')}</div></div>
    <div class="full"><div class="lbl">Subject / 件名</div><div class="v">${esc(t.subject || '　')}</div></div>
    <div class="full purpose"><div class="lbl">Purpose / 送付目的</div>${purposes}</div>
  </div>
  <table>
    <thead><tr><th class="lbl" style="width:11mm">#</th><th class="lbl" style="width:26mm">図面番号</th><th class="lbl">図面名</th><th class="lbl c" style="width:17mm">版</th><th class="lbl c" style="width:19mm">縮尺</th><th class="lbl r" style="width:13mm">枚数</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td></td><td class="lbl">Total</td><td></td><td></td><td></td><td class="m r">${total}</td></tr></tfoot>
  </table>
  <div class="link">
    <div class="lbl">Download</div>
    <div class="m">${t.link ? esc(t.link) : '（リンク未発行）'}</div>
    <div>${esc(t.fileName)}（${esc(t.fileSize)}）${t.expiresAt ? ` ／ 有効期限 ${ymd(t.expiresAt)} まで` : ''}${t.hasPassword ? ' ／ 合言葉は別途お知らせします' : ''}</div>
  </div>
  ${t.remarks ? `<div class="link"><div class="lbl">Remarks / 備考</div><div>${esc(t.remarks)}</div></div>` : ''}
  <div class="foot"><div class="lbl">yaneyuka.com</div><div class="stamp"></div></div>
</div>
</body></html>`;
}

/** 別窓で開く。ポップアップが止められたら false */
export function openTransmittal(t: TransmittalData): boolean {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open();
  w.document.write(transmittalHtml(t));
  w.document.close();
  return true;
}
