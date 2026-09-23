'use client';

/**
 * My法規の改正追従まわりの画面部品。
 *   LawLinkPicker     … 法規を e-Gov の法令に紐付ける
 *   ArticleLawStatus  … 条項カードの「現行と一致 / 改正されています」の1行
 *   RevisionModal     … 新旧比較と、新条文への更新（ハイライト引継ぎ）
 */
import React, { useEffect, useMemo, useState } from 'react';
import { FiAlertTriangle, FiCheck, FiClock, FiLink, FiRefreshCw, FiX } from 'react-icons/fi';
import { EgovError, fetchLawElement, searchLaws, toWareki, type LawSummary } from '@/lib/egovLaw';
import { carryStyles, diffChars, styledToHtml } from '@/lib/lawDiff';
import { sanitizeHtml } from '@/lib/sanitize';
import { htmlToStyled, mapExcerpt, type ArticleCheck, type ArticleSource, type HoukiCheck, type LawLink } from './lawSync';

// ---------------------------------------------------------------------------
// e-Gov との紐付け
// ---------------------------------------------------------------------------

export const LawLinkPicker: React.FC<{
  houkiName: string;
  link?: LawLink;
  disabled?: boolean;
  onLink: (link: LawLink | null) => void;
}> = ({ houkiName, link, disabled, onLink }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LawSummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (q: string) => {
    setBusy(true);
    setError('');
    try {
      setResults(await searchLaws(q));
    } catch (e) {
      setError(e instanceof Error ? e.message : '検索に失敗しました');
      setResults(null);
    } finally {
      setBusy(false);
    }
  };

  const toggle = () => {
    if (open) return setOpen(false);
    setOpen(true);
    // 法規名（「建築基準法」など）でそのまま探しておく
    const q = link?.lawTitle || houkiName;
    setQuery(q);
    if (q.trim()) void run(q);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        title={disabled ? 'ロック中は変更できません' : 'e-Gov 法令検索の法令と紐付けると、改正を追えます'}
        className={`flex items-center gap-1 px-3 py-1.5 text-xs whitespace-nowrap border ${
          link ? 'bg-white border-[#3b3b3b] text-gray-800' : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
        } disabled:opacity-50`}
      >
        <FiLink /> {link ? 'e-Gov 連携中' : 'e-Gov と連携'}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-[360px] bg-white border border-[#3b3b3b] shadow-lg p-3 text-xs">
          <p className="text-gray-600 mb-2 leading-relaxed">
            e-Gov 法令検索の法令と紐付けると、条文の取り込みと改正のお知らせができます。
            告示の多くは e-Gov に載っていないため、紐付けられません。
          </p>
          <form
            className="flex gap-1 mb-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(query);
            }}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="法令名（例: 建築基準法施行令）"
              className="flex-1 px-2 py-1 border"
              autoFocus
            />
            <button type="submit" className="px-3 py-1 bg-[#3b3b3b] text-white">
              検索
            </button>
          </form>
          {busy && <p className="text-gray-500">検索中…</p>}
          {error && <p className="text-red-600">{error}</p>}
          {results && !busy && (
            <ul className="max-h-[240px] overflow-y-auto divide-y border">
              {results.length === 0 && <li className="p-2 text-gray-500">見つかりません（告示は e-Gov に無いことが多いです）</li>}
              {results.map((r) => (
                <li key={r.lawId}>
                  <button
                    type="button"
                    onClick={() => {
                      onLink({ lawId: r.lawId, lawTitle: r.title, lawNum: r.lawNum });
                      setOpen(false);
                    }}
                    className={`w-full text-left p-2 hover:bg-gray-50 ${link?.lawId === r.lawId ? 'bg-gray-100 font-bold' : ''}`}
                  >
                    <span className="block text-gray-800">{r.title}</span>
                    <span className="block text-[10px] text-gray-500">{r.lawNum}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-between mt-2">
            {link ? (
              <button
                type="button"
                onClick={() => {
                  onLink(null);
                  setOpen(false);
                }}
                className="text-gray-500 hover:text-red-600 underline"
              >
                連携を外す
              </button>
            ) : (
              <span />
            )}
            <button type="button" onClick={() => setOpen(false)} className="text-gray-500 underline">
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 法規ごとの状況（見出しの下の1行）
// ---------------------------------------------------------------------------

export const LawCheckBar: React.FC<{
  link: LawLink;
  check?: HoukiCheck;
  checking: boolean;
  onCheck: () => void;
}> = ({ link, check, checking, onCheck }) => {
  const counts = useMemo(() => {
    const c = { changed: 0, upcoming: 0, same: 0, missing: 0 };
    for (const a of Object.values(check?.articles ?? {})) {
      if ((a.status === 'changed' || a.status === 'differs') && !a.acked) c.changed++;
      else if (a.status === 'missing') c.missing++;
      else if (a.status === 'same') c.same++;
      if ('upcoming' in a && a.upcoming) c.upcoming++;
    }
    return c;
  }, [check]);
  const next = check?.upcoming[0];

  return (
    <div className="px-6 py-1.5 border-b bg-gray-50 text-[11px] text-gray-600 flex flex-wrap items-center gap-x-4 gap-y-1 shrink-0">
      <span className="font-bold text-gray-800">
        {link.lawTitle}
        <span className="font-normal text-gray-500">（{link.lawNum}）</span>
      </span>
      {check?.current && <span>現行: {toWareki(check.current.enforcementDate)}施行</span>}
      {next && (
        <span className="text-amber-700">
          施行予定の改正 {check.upcoming.length}件（次: {toWareki(next.enforcementDate) || next.enforcementComment || '日付未定'}）
        </span>
      )}
      {check && !check.error && (
        <span>
          {counts.changed > 0 && <b className="text-red-600 mr-2">要確認 {counts.changed}</b>}
          {counts.upcoming > 0 && <b className="text-amber-700 mr-2">この先変わる {counts.upcoming}</b>}
          {counts.missing > 0 && <b className="text-gray-700 mr-2">見つからない {counts.missing}</b>}
          {counts.changed + counts.upcoming + counts.missing === 0 && counts.same > 0 && (
            <span className="text-green-700">すべて現行と一致</span>
          )}
        </span>
      )}
      {check?.error && <span className="text-red-600">{check.error}</span>}
      <button
        type="button"
        onClick={onCheck}
        disabled={checking}
        className="ml-auto flex items-center gap-1 px-2 py-0.5 border border-[#3b3b3b] bg-white text-gray-800 disabled:opacity-50"
      >
        <FiRefreshCw className={checking ? 'animate-spin' : ''} />
        {checking ? '照合中…' : '改正チェック'}
      </button>
      {check && !checking && (
        <span className="text-gray-400">
          {new Date(check.checkedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 照合
        </span>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 条項カードの1行
// ---------------------------------------------------------------------------

export type RevisionView = 'current' | 'upcoming';

export const ArticleLawStatus: React.FC<{
  check?: ArticleCheck;
  source?: ArticleSource;
  onOpen: (view: RevisionView) => void;
}> = ({ check, source, onOpen }) => {
  const link = (label: string, view: RevisionView) => (
    <button type="button" onClick={() => onOpen(view)} className="underline ml-1 hover:text-black">
      {label}
    </button>
  );

  if (!check) {
    if (!source) return null;
    return (
      <p className="text-[11px] text-gray-400 mb-1">
        e-Gov {toWareki(source.enforcementDate)}施行版で照合済み
      </p>
    );
  }

  const upcoming =
    'upcoming' in check && check.upcoming ? (
      <span className="inline-flex items-center gap-1 text-amber-700 ml-3">
        <FiClock />
        {toWareki(check.upcoming.revision.enforcementDate) || '日付未定'}施行の改正で
        {check.upcoming.element ? '変わります' : '削除されます'}
        {link('新旧を比較', 'upcoming')}
      </span>
    ) : null;

  switch (check.status) {
    case 'same':
      return (
        <p className="text-[11px] text-green-700 mb-1 flex flex-wrap items-center">
          <span className="inline-flex items-center gap-1">
            <FiCheck /> e-Gov 現行（{toWareki(check.current.enforcementDate)}施行）と一致
          </span>
          {upcoming}
        </p>
      );
    case 'changed':
      return (
        <p className={`text-[11px] mb-1 flex flex-wrap items-center ${check.acked ? 'text-gray-500' : 'text-red-600 font-bold'}`}>
          <span className="inline-flex items-center gap-1">
            <FiAlertTriangle />
            {check.acked
              ? '改正前の条文のまま保持しています'
              : `この条文は改正されています（現行 ${toWareki(check.current.enforcementDate)}施行）`}
          </span>
          {link('新旧を比較', 'current')}
          {upcoming}
        </p>
      );
    case 'differs':
      return (
        <p className={`text-[11px] mb-1 flex flex-wrap items-center ${check.acked ? 'text-gray-500' : 'text-orange-600 font-bold'}`}>
          <span className="inline-flex items-center gap-1">
            <FiAlertTriangle />
            {check.acked ? 'e-Gov と異なる内容を保持しています' : 'e-Gov の現行条文と一致しません'}
          </span>
          {link('比較', 'current')}
          {upcoming}
        </p>
      );
    case 'missing':
      return (
        <p className="text-[11px] text-gray-600 mb-1 inline-flex items-center gap-1">
          <FiAlertTriangle /> e-Gov でこの条項が見つかりません（削除・繰下げ、または番号の違い）
        </p>
      );
    case 'error':
      return <p className="text-[11px] text-gray-400 mb-1">照合できませんでした: {check.message}</p>;
    default:
      return null;
  }
};

// ---------------------------------------------------------------------------
// 新旧比較
// ---------------------------------------------------------------------------

const DiffText: React.FC<{ text: string; marks: Uint8Array; kind: 'del' | 'ins' }> = ({ text, marks, kind }) => {
  const chars = Array.from(text);
  const parts: React.ReactNode[] = [];
  let i = 0;
  while (i < chars.length) {
    const on = marks[i] === 1;
    let j = i;
    while (j < chars.length && (marks[j] === 1) === on) j++;
    const run = chars.slice(i, j).join('');
    parts.push(
      on ? (
        kind === 'del' ? (
          <del key={i} className="bg-red-100 text-red-700">
            {run}
          </del>
        ) : (
          <ins key={i} className="bg-green-100 text-green-800 no-underline">
            {run}
          </ins>
        )
      ) : (
        <span key={i}>{run}</span>
      )
    );
    i = j;
  }
  return <div className="whitespace-pre-wrap break-words leading-relaxed">{parts}</div>;
};

type Loaded = {
  oldLabel: string;
  newLabel: string;
  oldText: string;
  newText: string;
  /** 更新するときに本文へ入れる条文（抜き出しなら、その部分だけ） */
  adoptText: string | null;
};

export const RevisionModal: React.FC<{
  link: LawLink;
  articleTitle: string;
  articleHtml: string;
  check: ArticleCheck;
  view: RevisionView;
  locked: boolean;
  onClose: () => void;
  onAdopt: (html: string, source: ArticleSource) => void;
  onAck: (source: ArticleSource) => void;
}> = ({ link, articleTitle, articleHtml, check, view, locked, onClose, onAdopt, onAck }) => {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (check.status !== 'same' && check.status !== 'changed' && check.status !== 'differs') return;
        // 現行の全文（照合済みの版が現行のときは、保存分が抜き出しのことがあるので取り直す）
        const currentFull = (await fetchLawElement(link.lawId, check.elm)).text;

        if (view === 'upcoming' && check.upcoming) {
          const u = check.upcoming;
          alive &&
            setData({
              oldLabel: `現行（${toWareki(check.current.enforcementDate)}施行）`,
              newLabel: `${toWareki(u.revision.enforcementDate) || '施行日未定'}施行後`,
              oldText: currentFull,
              newText: u.element?.text ?? '（この版で条項が削除されます）',
              adoptText: null,
            });
          return;
        }

        if (check.status === 'changed') {
          let oldFull = check.baseline.text;
          try {
            oldFull = (await fetchLawElement(check.baseline.revisionId, check.baseline.elm)).text;
          } catch {
            /* 旧版が取れなければ保存分で比べる */
          }
          alive &&
            setData({
              oldLabel: `照合時（${toWareki(check.baseline.enforcementDate)}施行版）`,
              newLabel: `現行（${toWareki(check.current.enforcementDate)}施行）`,
              oldText: oldFull,
              newText: currentFull,
              adoptText: mapExcerpt(oldFull, currentFull, check.baseline.text),
            });
          return;
        }

        if (check.status === 'differs') {
          alive &&
            setData({
              oldLabel: 'あなたの条文',
              newLabel: `e-Gov 現行（${toWareki(check.current.enforcementDate)}施行）`,
              oldText: check.userText,
              newText: currentFull,
              adoptText: currentFull,
            });
        }
      } catch (e) {
        alive && setError(e instanceof EgovError || e instanceof Error ? e.message : '取得に失敗しました');
      }
    })();
    return () => {
      alive = false;
    };
  }, [check, view, link.lawId]);

  const diff = useMemo(() => (data ? diffChars(data.oldText, data.newText) : null), [data]);
  const preview = useMemo(() => {
    if (!data?.adoptText) return null;
    const styled = htmlToStyled(articleHtml);
    return styledToHtml(data.adoptText, carryStyles(styled, data.adoptText));
  }, [data, articleHtml]);

  const current = 'current' in check ? check.current : null;
  const newSource = (text: string, ack?: boolean): ArticleSource | null =>
    current && 'elm' in check
      ? {
          elm: check.elm,
          revisionId: current.revisionId,
          enforcementDate: current.enforcementDate,
          text,
          checkedAt: Date.now(),
          ...(ack ? { ackRevisionId: current.revisionId } : {}),
        }
      : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-[80px]" onClick={onClose}>
      <div
        className="bg-white w-full max-w-[1100px] max-h-[calc(100vh-110px)] flex flex-col border border-[#3b3b3b]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b bg-[#3b3b3b] text-white">
          <h3 className="text-sm font-bold">
            {link.lawTitle} {articleTitle} — 新旧比較
          </h3>
          <button type="button" onClick={onClose} aria-label="閉じる">
            <FiX />
          </button>
        </div>

        <div className="overflow-y-auto p-4 text-[13px]">
          {error && <p className="text-red-600">{error}</p>}
          {!data && !error && <p className="text-gray-500">e-Gov から取得しています…</p>}
          {data && diff && (
            <>
              {!diff.changed && <p className="mb-2 text-gray-600">文字の違いはありません（空白・改行の違いのみ）。</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <section className="border">
                  <h4 className="px-3 py-1 text-xs font-bold bg-gray-100 border-b">旧: {data.oldLabel}</h4>
                  <div className="p-3">
                    <DiffText text={data.oldText} marks={diff.aMark} kind="del" />
                  </div>
                </section>
                <section className="border">
                  <h4 className="px-3 py-1 text-xs font-bold bg-gray-100 border-b">新: {data.newLabel}</h4>
                  <div className="p-3">
                    <DiffText text={data.newText} marks={diff.bMark} kind="ins" />
                  </div>
                </section>
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                <del className="bg-red-100 text-red-700">赤</del> は削られた字、
                <ins className="bg-green-100 text-green-800 no-underline">緑</ins> は加わった字。空白と改行の違いは無視しています。
              </p>

              {preview && (
                <section className="mt-4 border">
                  <h4 className="px-3 py-1 text-xs font-bold bg-gray-100 border-b">
                    更新後の本文（あなたのハイライトを引き継ぎます）
                  </h4>
                  <div
                    className="p-3 whitespace-pre-wrap break-words leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(preview) }}
                  />
                  <p className="px-3 pb-2 text-[11px] text-gray-500">
                    改正で入った字にはハイライトが付きません（線の途中に色の無い字があれば、そこが改正箇所です）。
                    条文以外の書き込みは消えますが、更新後に「更新前に戻す」で元に戻せます。
                  </p>
                </section>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 px-4 py-2 border-t">
          {view === 'current' && (check.status === 'changed' || check.status === 'differs') && data && (
            <>
              <button
                type="button"
                disabled={locked}
                title={locked ? 'ロック中は変更できません' : undefined}
                onClick={() => {
                  const text = check.status === 'changed' ? check.baseline.text : check.userText;
                  const s = check.status === 'changed' ? { ...check.baseline, ackRevisionId: check.current.revisionId } : newSource(text, true);
                  if (s) onAck(s);
                }}
                className="px-3 py-1.5 text-xs border border-gray-400 bg-white disabled:opacity-50"
              >
                {check.status === 'changed' ? '旧条文のまま残す' : 'このまま残す'}
              </button>
              <button
                type="button"
                disabled={locked || !preview}
                title={locked ? 'ロック中は変更できません' : undefined}
                onClick={() => {
                  const s = newSource(data.adoptText!);
                  if (s && preview) onAdopt(preview, s);
                }}
                className="px-3 py-1.5 text-xs bg-[#3b3b3b] text-white disabled:opacity-50"
              >
                新しい条文に更新する
              </button>
            </>
          )}
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs border border-gray-400 bg-white">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
