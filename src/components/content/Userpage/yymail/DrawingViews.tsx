'use client';
/**
 * 物件メール台帳の「図面」側。添付から読んだ図番と版で、図面ごとの受領履歴を組む。
 *   collectDrawings … メールの山を図番ごとの版の列にまとめる
 *   CompareModal    … 2つの版を横に並べる（差分の色付けは PDFGap に任せる）
 *   Transmittal     … 送付状（A4 縦）
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiExternalLink, FiPrinter, FiX } from 'react-icons/fi';
import type { AttachmentRecord, MailRecord } from './ledgerStore';

export type DrawingVersion = { att: AttachmentRecord; mail: MailRecord };
export type DrawingGroup = { number: string; title: string; versions: DrawingVersion[] };

/** 版の古い順。版が同じなら受け取った順（同じ版の再送は同じものとして1つにまとめる） */
export function collectDrawings(mails: MailRecord[]): DrawingGroup[] {
  const groups = new Map<string, DrawingVersion[]>();
  for (const mail of mails) {
    for (const att of mail.attachments) {
      if (!att.drawing) continue;
      const list = groups.get(att.drawing.number) ?? [];
      list.push({ att, mail });
      groups.set(att.drawing.number, list);
    }
  }
  return [...groups.entries()]
    .map(([number, versions]) => {
      versions.sort((a, b) => a.att.drawing!.revOrder - b.att.drawing!.revOrder || a.mail.date.localeCompare(b.mail.date));
      // 同じ版・同じ大きさの再送は1つに
      const uniq = versions.filter(
        (v, i) => !versions.slice(0, i).some((w) => w.att.drawing!.rev === v.att.drawing!.rev && w.att.size === v.att.size)
      );
      const latest = uniq[uniq.length - 1];
      return { number, title: latest.att.drawing!.title || latest.att.name, versions: uniq };
    })
    .sort((a, b) => a.number.localeCompare(b.number, 'ja', { numeric: true }));
}

export const revLabel = (rev: string | null) => (rev === null ? '初版' : /^\d+$/.test(rev) ? `第${rev}版` : `${rev}版`);
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString('ja-JP', { year: '2-digit', month: 'numeric', day: 'numeric' });

// ---------------------------------------------------------------------------
// 版の比較
// ---------------------------------------------------------------------------

export const CompareModal: React.FC<{
  number: string;
  older: DrawingVersion;
  newer: DrawingVersion;
  fileUrl: (path: string) => Promise<string>;
  onClose: () => void;
}> = ({ number, older, newer, fileUrl, onClose }) => {
  const [urls, setUrls] = useState<[string, string] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([fileUrl(older.att.path), fileUrl(newer.att.path)])
      .then(([a, b]) => setUrls([a, b]))
      .catch((e) => setError(e instanceof Error ? e.message : '添付を開けません'));
  }, [older, newer, fileUrl]);

  const pane = (v: DrawingVersion, url: string | undefined) => (
    <section className="flex flex-col min-h-0 border border-[#3b3b3b]">
      <h4 className="px-2 py-1 text-[11px] bg-gray-100 border-b flex justify-between gap-2">
        <span className="font-bold">{revLabel(v.att.drawing!.rev)}</span>
        <span className="text-gray-600 truncate">
          {shortDate(v.mail.date)} {v.mail.from.name || v.mail.from.address}
        </span>
      </h4>
      {url ? <iframe src={url} title={v.att.name} className="flex-1 w-full bg-gray-200" /> : <div className="flex-1" />}
    </section>
  );

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-[10000] bg-black/60 flex p-4" style={{ top: 'var(--nav-height, 35px)' }} onClick={onClose}>
      <div className="bg-white w-full flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-3 py-2 bg-[#3b3b3b] text-white text-[12px]">
          <span className="font-bold">
            {number} {revLabel(older.att.drawing!.rev)} → {revLabel(newer.att.drawing!.rev)}
          </span>
          <span className="flex items-center gap-3">
            <a
              href="https://pdfgap-yaneyuka.web.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline flex items-center gap-1"
              title="2つの版を PDFGap に入れると、変わった所に色が付きます"
            >
              差分の色付けは PDFGap で <FiExternalLink />
            </a>
            <button type="button" onClick={onClose} aria-label="閉じる">
              <FiX />
            </button>
          </span>
        </div>
        {error ? (
          <p className="p-4 text-red-600 text-[12px]">{error}</p>
        ) : (
          <div className="flex-1 min-h-0 grid grid-cols-2 gap-2 p-2">
            {pane(older, urls?.[0])}
            {pane(newer, urls?.[1])}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

// ---------------------------------------------------------------------------
// 送付状
// ---------------------------------------------------------------------------

export const Transmittal: React.FC<{
  projectName: string;
  groups: DrawingGroup[];
  onClose: () => void;
}> = ({ projectName, groups, onClose }) => {
  const [picked, setPicked] = useState<Set<string>>(() => new Set(groups.map((g) => g.number)));
  const [to, setTo] = useState('');
  const [sender, setSender] = useState(() => {
    try {
      return localStorage.getItem('yymail-sender') ?? '';
    } catch {
      return '';
    }
  });
  const [subject, setSubject] = useState(`${projectName} 図面送付の件`);
  const [note, setNote] = useState('下記の図面を送付いたします。ご査収のほどよろしくお願いいたします。');
  const rows = useMemo(() => groups.filter((g) => picked.has(g.number)), [groups, picked]);
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

  const input = 'w-full px-2 py-1 text-[12px]';
  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-[10000] bg-black/60 flex gap-3 p-4 overflow-auto" style={{ top: 'var(--nav-height, 35px)' }}>
      {/* 印刷は A4 縦。サイト共通の印刷設定（A3 横）をこの画面を開いている間だけ上書きする */}
      <style>{`@media print {
        @page { size: A4 portrait; margin: 0; }
        html, body { width: 210mm !important; height: 297mm !important; }
        #print-target-container { width: 210mm !important; height: 297mm !important; padding: 18mm 16mm !important; }
      }`}</style>
      <div className="no-print bg-white w-[300px] shrink-0 p-3 space-y-2 self-start border border-[#3b3b3b]">
        <div className="text-[12px] font-bold">送付状</div>
        <label className="block text-[11px] text-gray-600">宛先<input className={input} value={to} onChange={(e) => setTo(e.target.value)} placeholder="○○建設株式会社 ○○様" /></label>
        <label className="block text-[11px] text-gray-600">件名<input className={input} value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
        <label className="block text-[11px] text-gray-600">
          送付者
          <input
            className={input}
            value={sender}
            onChange={(e) => {
              setSender(e.target.value);
              try { localStorage.setItem('yymail-sender', e.target.value); } catch { /* 覚えなくても使える */ }
            }}
            placeholder="会社名・氏名"
          />
        </label>
        <label className="block text-[11px] text-gray-600">本文<textarea className={input} rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <div className="text-[11px] text-gray-600">送る図面（最新版）</div>
        <ul className="max-h-[240px] overflow-y-auto border bg-gray-50 text-[11px]">
          {groups.map((g) => (
            <li key={g.number}>
              <label className="flex items-center gap-2 px-2 py-0.5">
                <input
                  type="checkbox"
                  checked={picked.has(g.number)}
                  onChange={(e) => {
                    const next = new Set(picked);
                    if (e.target.checked) next.add(g.number);
                    else next.delete(g.number);
                    setPicked(next);
                  }}
                />
                {g.number} {g.title}
              </label>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <button type="button" className="flex-1 py-1.5 text-[12px] bg-[#3b3b3b] text-white flex items-center justify-center gap-1" onClick={() => window.print()}>
            <FiPrinter /> 印刷（A4）
          </button>
          <button type="button" className="px-3 py-1.5 text-[12px] border bg-white" onClick={onClose}>閉じる</button>
        </div>
      </div>

      <div className="bg-white shrink-0 shadow" style={{ width: '210mm', minHeight: '297mm' }}>
        <div id="print-target-container" className="bg-white text-[12px] leading-relaxed" style={{ width: '210mm', minHeight: '297mm', padding: '18mm 16mm', boxSizing: 'border-box' }}>
          <div className="text-right">{today}</div>
          <div className="mt-4 text-[14px] border-b border-black inline-block min-w-[60%]">{to || '　'}</div>
          <div className="text-right mt-4 whitespace-pre-wrap">{sender}</div>
          <h1 className="text-center text-[22px] font-bold tracking-[0.5em] my-8">図面送付状</h1>
          <div className="mb-2">件名: {subject}</div>
          <p className="mb-4 whitespace-pre-wrap">{note}</p>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-gray-100">
                {['No.', '図番', '図面名', '版', '版の日付'].map((h) => (
                  <th key={h} className="border border-black px-2 py-1 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((g, i) => {
                const v = g.versions[g.versions.length - 1];
                return (
                  <tr key={g.number}>
                    <td className="border border-black px-2 py-1 text-center">{i + 1}</td>
                    <td className="border border-black px-2 py-1">{g.number}</td>
                    <td className="border border-black px-2 py-1">{g.title}</td>
                    <td className="border border-black px-2 py-1 text-center">{revLabel(v.att.drawing!.rev)}</td>
                    <td className="border border-black px-2 py-1 text-center">{shortDate(v.mail.date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-2 text-right">計 {rows.length} 枚</div>
          <div className="mt-10 text-right">以上</div>
        </div>
      </div>
    </div>,
    document.body
  );
};
