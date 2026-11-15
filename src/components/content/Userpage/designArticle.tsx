// 設計情報の記事の本文を組む(建築の調べもの /lookup/ の記事画面と、記事の単体ページ /lookup/post/{id}/ で共用)。
// 2026-11-15 に DesignInfo.tsx から切り出した。ブラウザに依存しないので、サーバーでも組める。
import React from 'react';
import { figureSrc, figuresOf } from '@/data/figures';

/** 目録に出す書き出し:見出し・箇条書き・表・注意書きを飛ばした最初の段落(90 字まで) */
export function leadOf(content: string): string {
  for (const raw of content.replace(/\r/g, '').split('\n')) {
    const l = raw.trim();
    if (!l || /^(#|-|・|\||>|\d+\.\s|【)/.test(l)) continue;
    const t = l.replace(/\*\*/g, '');
    return t.length > 90 ? `${t.slice(0, 90)}…` : t;
  }
  return '';
}


// --- コンテンツ整形 ---
// 本文はプレーンテキスト。次の書き方を読みやすい形にして出す(2026-11-14):
//   ## 大見出し(番号を振り、右の目次に出す) / ### 小見出し
//   - 箇条書き(「・」も可) / 1. 番号付き / | 表 | (1 行目が見出し) / > 注意書き / **強調**
// 古い記事(## を使っていない)は従来どおり【…】・「1. 」の行を大見出しとして扱う。
export function formatDesignContent(content: string, postId = '') {
  // 自作の図(src/data/figures)。after の見出しの節の終わりに差し込む。2026-11-14
  const figs = figuresOf(postId);
  const usedFigs = new Set<string>();
  let curChapter = '';
  let firstChapter = '';
  const pushFigs = (head: string, all = false) => {
    for (const f of figs) {
      if (usedFigs.has(f.id)) continue;
      if (!all && !(f.after === head || (!f.after && head && head === firstChapter))) continue;
      usedFigs.add(f.id);
      const n = usedFigs.size;
      formatted.push(
        <figure key={`fig-${f.id}`} className="yy-di-fig">
          <a href={figureSrc(f)} target="_blank" rel="noopener" title="図を別のタブで大きく見る">
            <img src={figureSrc(f)} alt={f.title} width={f.w} height={f.h} loading="lazy" decoding="async" />
          </a>
          <figcaption>
            <span className="yy-di-figno">FIG. {postId}-{n}</span>
            <b>{f.title}</b>
            <span>{f.caption}</span>
          </figcaption>
        </figure>
      );
    }
  };
  const lines = content.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').split('\n').map((l) => l.trim());
  const modern = lines.some((l) => l.startsWith('## '));
  const formatted: React.JSX.Element[] = [];
  const heads: { id: string; text: string }[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let table: string[][] | null = null;
  let note: string[] = [];

  // **強調** を <strong> に
  const inline = (text: string, key: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((t, i) => (t.startsWith('**') && t.endsWith('**') && t.length > 4 ? <strong key={`${key}-${i}`}>{t.slice(2, -2)}</strong> : t));
  };
  // 日本語の行は空白なしでつなぐ(英数字どうしのときだけ空白)
  const joinLines = (ls: string[]) => ls.reduce((acc, l) => (acc && /[A-Za-z0-9.,)]$/.test(acc) && /^[A-Za-z0-9(]/.test(l) ? `${acc} ${l}` : acc + l), '');

  const flush = () => {
    const k = formatted.length;
    if (para.length) {
      const text = joinLines(para).trim();
      if (text) formatted.push(<p key={`p-${k}`} className="yy-di-p">{inline(text, `p${k}`)}</p>);
      para = [];
    }
    if (list) {
      const Tag = list.ordered ? 'ol' : 'ul';
      formatted.push(
        <Tag key={`l-${k}`} className={list.ordered ? 'yy-di-ol' : 'yy-di-ul'}>
          {list.items.map((it, i) => <li key={i}>{inline(it, `l${k}-${i}`)}</li>)}
        </Tag>
      );
      list = null;
    }
    if (table) {
      const [head, ...body] = table;
      formatted.push(
        <div key={`t-${k}`} className="yy-di-tblwrap">
          <table className="yy-di-tbl">
            <thead><tr>{head.map((c, i) => <th key={i}>{inline(c, `th${k}-${i}`)}</th>)}</tr></thead>
            <tbody>{body.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{inline(c, `td${k}-${i}-${j}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      table = null;
    }
    if (note.length) {
      formatted.push(<p key={`n-${k}`} className="yy-di-note">{inline(joinLines(note), `n${k}`)}</p>);
      note = [];
    }
  };
  const chapter = (text: string, index: number) => {
    flush();
    pushFigs(curChapter);
    curChapter = text;
    if (!firstChapter) firstChapter = text;
    const id = `yy-di-h-${index}`;
    heads.push({ id, text });
    formatted.push(
      <h5 key={`h-${index}`} id={id} className="yy-di-ch">
        <span className="yy-di-chno">{String(heads.length).padStart(2, '0')}</span>
        <span>{text}</span>
      </h5>
    );
  };
  const sub = (text: string, index: number) => {
    flush();
    // 「根拠・参考」の前で、その節の図を出し切る
    if (/^根拠|^参考/.test(text)) pushFigs(curChapter);
    formatted.push(<h6 key={`s-${index}`} className="yy-di-sub">{text}</h6>);
  };
  const addItem = (ordered: boolean, text: string) => {
    if (para.length || table || note.length || (list && list.ordered !== ordered)) flush();
    if (!list) list = { ordered, items: [] };
    list.items.push(text);
  };

  lines.forEach((line, index) => {
    if (!line) { flush(); return; }
    if (line.startsWith('## ')) return chapter(line.slice(3).trim(), index);
    if (line.startsWith('### ')) return sub(line.slice(4).trim(), index);
    if (line.startsWith('|')) {
      const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) return; // 区切りの行
      if (!table) { flush(); table = []; }
      table.push(cells);
      return;
    }
    if (line.startsWith('> ')) {
      if (!note.length) flush();
      note.push(line.slice(2));
      return;
    }
    if (/^[-・]\s*/.test(line) && (line.startsWith('- ') || line.startsWith('・'))) return addItem(false, line.replace(/^(- |・)\s*/, ''));
    if (modern && /^\d+\.\s+/.test(line)) return addItem(true, line.replace(/^\d+\.\s+/, ''));
    // 古い書き方の見出し
    if (!modern && (/^【.+】/.test(line) || /^\d+\.\s+/.test(line) || /^[A-Z]：/.test(line))) return chapter(line, index);
    if (!modern && /^(種類と特徴|諸元例|一般的な寸法|建築側の必要条件|設置要件|選定基準|必須確認事項|敷設方法)/.test(line)) return sub(line, index);
    if (list || table || note.length) flush();
    para.push(line);
  });
  flush();
  pushFigs(curChapter);
  pushFigs('', true); // 見出しが見つからなかった図は最後に
  return { nodes: formatted, heads };
}
