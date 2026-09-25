'use client';
/**
 * 建材ページの「基本知識」。
 *
 * 本文は src/data/knowledge/<分類>.json にある（2026-09 に全面的に書き直したもの）。
 * 以前は mak_*.tsx の JSX に直接書かれていて、直すたびにページのコードを触る必要があった。
 * 建材Chatbot も同じデータを読む（scripts/build-knowledge.mjs が src/data/knowledge.json にまとめる）。
 */
import React, { useState } from 'react';

export type KnowledgeSection = { heading: string; text: string };
export type KnowledgeEntry = {
  route: string;
  param: string;
  name: string;
  lead: string;
  sections: KnowledgeSection[];
  refs?: string[];
  aliases?: string[];
};

const key = (s: string) => s.normalize('NFKC').replace(/[\s・,，.]/g, '').toLowerCase();

export function findKnowledge(data: KnowledgeEntry[], param: string): KnowledgeEntry | undefined {
  const k = key(param);
  return data.find((d) => key(d.param) === k || (d.aliases ?? []).some((a) => key(a) === k));
}

/** 「用語: 説明」の行は用語を太字にする */
function Line({ text }: { text: string }) {
  const m = text.match(/^([^:：]{1,24})[:：]\s*(.+)$/);
  if (!m) return <>{text}</>;
  return (
    <>
      <strong>{m[1]}</strong>: {m[2]}
    </>
  );
}

function SectionBody({ text }: { text: string }) {
  // 段落と「・」の箇条を、出てきた順にまとめる
  const blocks: Array<{ kind: 'p' | 'ul'; lines: string[] }> = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = line.startsWith('・');
    const kind = bullet ? 'ul' : 'p';
    const last = blocks[blocks.length - 1];
    if (bullet && last?.kind === 'ul') last.lines.push(line.slice(1).trim());
    else blocks.push({ kind, lines: [bullet ? line.slice(1).trim() : line] });
  }
  return (
    <>
      {blocks.map((b, i) =>
        b.kind === 'p' ? (
          <p key={i} className="mb-1.5 text-xs ml-3 leading-relaxed">
            {b.lines[0]}
          </p>
        ) : (
          <ul key={i} className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            {b.lines.map((l, j) => (
              <li key={j} className="leading-relaxed">
                <span className="mr-1">・</span>
                <Line text={l} />
              </li>
            ))}
          </ul>
        ),
      )}
    </>
  );
}

export default function BasicKnowledge({ data, param }: { data: KnowledgeEntry[]; param: string }) {
  const k = findKnowledge(data, param);
  if (!k) return null;
  return (
    <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
      {k.lead && <p className="text-[13px] font-bold mb-2 leading-relaxed">{k.lead}</p>}
      {k.sections.map((s) => (
        <section key={s.heading} className="mb-2">
          <h4 className="font-bold text-[12px] mb-1">{s.heading}</h4>
          <SectionBody text={s.text} />
        </section>
      ))}
      {k.refs && k.refs.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <h4 className="font-bold text-[11px] mb-1 text-gray-600">関連する法令・規格</h4>
          <ul className="text-[11px] text-gray-600 ml-3 space-y-0.5 list-none">
            {k.refs.map((r) => (
              <li key={r}>
                <span className="mr-1">・</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-2 text-[10px] text-gray-400">2026年9月時点の情報です。法令・告示・規格と製品の仕様は、最新の原文とメーカー資料で確認してください。</p>
    </div>
  );
}

/** 基本知識の開閉ボタンが無いページ（汎用の「その他」ページ）用。ボタンと本文をまとめて出す */
export function KnowledgeToggle({ data, param }: { data: KnowledgeEntry[]; param: string }) {
  const [open, setOpen] = useState(false);
  if (!findKnowledge(data, param)) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen((v) => !v)} className="ml-2 align-baseline text-blue-600 hover:text-blue-800 text-[11px] underline">
        <span className={`inline-block transition-transform ${open ? 'rotate-90' : ''}`}>&gt;</span> 基本知識
      </button>
      {open && (
        <div className="mt-2">
          <BasicKnowledge data={data} param={param} />
        </div>
      )}
    </>
  );
}
