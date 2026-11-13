'use client';
/**
 * 建材ページの「基本知識」。
 *
 * 本文は src/data/knowledge/<分類>.json にある（2026-09 に全面的に書き直したもの）。
 * 以前は mak_*.tsx の JSX に直接書かれていて、直すたびにページのコードを触る必要があった。
 * 建材Chatbot も同じデータを読む（scripts/build-knowledge.mjs が src/data/knowledge.json にまとめる）。
 *
 * 見た目はモック「高級感 3」の組み方：箱や影を使わず、本の索引のように
 * 明朝の小さな番号 + 章題、1px の罫線、本文 12px。章は 2 段に流して 1 画面に多く入れる（basic-knowledge.css）。
 */
import React, { useState } from 'react';
import './basic-knowledge.css';

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
          <p key={i} className="yy-bk__p">
            {b.lines[0]}
          </p>
        ) : (
          <ul key={i} className="yy-bk__ul">
            {b.lines.map((l, j) => (
              <li key={j}>
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
    <div className="yy-bk">
      <div className="yy-bk__top">
        <span className="yy-label">Basic knowledge</span>
        <span className="yy-bk__name">{k.name} の基本知識</span>
        <span className="yy-bk__n">{k.sections.length} 項</span>
      </div>
      {k.lead && <p className="yy-bk__lead">{k.lead}</p>}
      <div className="yy-bk__secs">
        {k.sections.map((s, i) => (
          <section key={s.heading} className="yy-bk__sec">
            <h4 className="yy-bk__h">
              <span className="yy-bk__no">{String(i + 1).padStart(2, '0')}</span>
              <span>{s.heading}</span>
            </h4>
            <SectionBody text={s.text} />
          </section>
        ))}
        {k.refs && k.refs.length > 0 && (
          <section className="yy-bk__sec">
            <h4 className="yy-bk__h">
              <span className="yy-bk__no">—</span>
              <span>関連する法令・規格</span>
            </h4>
            <ul className="yy-bk__refs">
              {k.refs.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <p className="yy-bk__note">2026年9月時点の情報です。法令・告示・規格と製品の仕様は、最新の原文とメーカー資料で確認してください。</p>
    </div>
  );
}

/** 基本知識の開閉ボタンが無いページ（汎用の「その他」ページ）用。ボタンと本文をまとめて出す */
export function KnowledgeToggle({ data, param }: { data: KnowledgeEntry[]; param: string }) {
  const [open, setOpen] = useState(false);
  if (!findKnowledge(data, param)) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen((v) => !v)} className="yy-bk-toggle" aria-expanded={open}>
        基本知識<span className={`yy-bk-chev${open ? ' is-open' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="yy-bk-toggle__panel">
          <BasicKnowledge data={data} param={param} />
        </div>
      )}
    </>
  );
}
