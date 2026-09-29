'use client';
/**
 * メーカー資料箱。1 メーカー = 1 カードに、商品ページ・カタログ・営業所・お問い合わせ・サンプル・CAD、
 * 自分で足したリンク、うちの標準仕様メモ、担当者（担当者連絡先から）、関連ブックマークを束ねる。
 * 建材ページの「＋資料箱」か、ここの検索から登録する。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { FiX, FiSearch } from 'react-icons/fi';
import { db } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/AuthContext';
import { BOX_SLOTS, boxId, mergeMaker, searchMakers, linkChanges, fallbackFor, relatedBookmarks, type MakerData, type MakerBoxItem } from '@/lib/makerBox';
import { useMakerBox, saveBoxItem, removeBoxItem, watchTeamBox, type BoxScope, type TeamBoxItem } from '@/lib/useMakerBox';
import { listBoardsForUser, type BoardDoc } from '@/lib/firebaseUserData';
import { findByCompany, isChatNicknameOnly, summarize, todayYmd, newLogId, type ContactLogEntry } from '@/lib/contactLog';
import { recordContactLog } from '@/lib/contactLogStore';
import { openMakerConect } from '@/lib/makerConectPreset';

type Contact = { id: string; company?: string; name?: string; phone?: string; email?: string; log?: ContactLogEntry[] };
type Broken = Array<{ url: string; fallback?: string }>;

/** 絞り込み・置き場所の切り替え。選択中は墨の文字と差し色の下線（塗りのボタンにしない） */
const segClass = (on: boolean) =>
  `px-1.5 py-0.5 text-[11px] border-b ${on ? 'border-[#52AA96] text-[#141414] font-bold' : 'border-transparent text-gray-500 hover:text-[#141414]'}`;

export default function MakerBox({
  bookmarks,
  updatesOnly = false,
  onUpdatesOnlyChange,
  teamRequest = 0,
}: {
  bookmarks: Array<{ id: string; title: string; url: string }>;
  /** 「カタログ更新」のあるカードだけ出す（見出しの「カタログ更新 N」から入る） */
  updatesOnly?: boolean;
  onUpdatesOnlyChange?: (v: boolean) => void;
  /** 見出しの「チームの資料箱」を押すたびに増える。チームのボードへ切り替える合図 */
  teamRequest?: number;
}) {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  const myBox = useMakerBox(uid);
  // 置き場所: 自分 / チーム（Teamタスクのボード。メンバーで共有）
  const [boards, setBoards] = useState<BoardDoc[]>([]);
  const [boardsLoaded, setBoardsLoaded] = useState(false);
  const [scopeKey, setScopeKey] = useState('me');
  const [teamItems, setTeamItems] = useState<TeamBoxItem[]>([]);
  const [teamError, setTeamError] = useState('');
  const [teamNotice, setTeamNotice] = useState('');
  useEffect(() => {
    if (!uid) return;
    listBoardsForUser(uid)
      .then(setBoards)
      .catch(() => setBoards([]))
      .finally(() => setBoardsLoaded(true));
    try {
      const saved = localStorage.getItem('makerBox:scope');
      if (saved) setScopeKey(saved);
    } catch {
      /* 覚えていなくても困らない */
    }
  }, [uid]);
  const pickScope = (k: string) => {
    setScopeKey(k);
    setTeamNotice('');
    try {
      localStorage.setItem('makerBox:scope', k);
    } catch {
      /* 同上 */
    }
  };
  const board = boards.find((b) => b.id === scopeKey);

  // 見出しの「チームの資料箱」: 自分の箱を見ているなら最初のチームへ。チームが無ければ作り方を出す
  useEffect(() => {
    if (!teamRequest || !boardsLoaded) return;
    if (boards.length === 0) {
      setTeamNotice('チームの資料箱は、Teamタスクでボードを作ってメンバーを入れると使えます。ボードのメンバー全員で見られ、書き足せます。');
      return;
    }
    if (!board) pickScope(boards[0].id!);
    // pickScope は毎回作り直される関数なので依存に入れない（合図が来たときだけ動かす）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamRequest, boardsLoaded]);

  useEffect(() => {
    setTeamItems([]);
    setTeamError('');
    if (!board?.id) return;
    return watchTeamBox(board.id, setTeamItems, () => setTeamError('このチームの資料箱を開けませんでした'));
  }, [board?.id]);
  const scope: BoxScope | null = !uid ? null : board?.id ? { kind: 'team', boardId: board.id, uid, userName: currentUser?.username || '' } : { kind: 'me', uid };
  const box: TeamBoxItem[] = board ? teamItems : myBox;
  const [data, setData] = useState<MakerData | null>(null);
  const [broken, setBroken] = useState<Broken>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('');

  // 元データは大きいので、資料箱を開いたときに読む
  useEffect(() => {
    import('@/data/makers.json').then((m) => setData((m.default ?? m) as unknown as MakerData));
    import('@/data/broken-maker-links.json').then((m) => setBroken(((m.default ?? m) as { broken?: Broken }).broken ?? []));
  }, []);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(collection(db, 'users', uid, 'contacts'), (snap) =>
      setContacts(snap.docs.filter((d) => !isChatNicknameOnly(d.data())).map((d) => ({ id: d.id, ...(d.data() as Omit<Contact, 'id'>) }))),
    );
  }, [uid]);

  const hits = useMemo(() => (data && q.trim() ? searchMakers(data, q, 12) : []), [data, q]);
  const categories = useMemo(() => Array.from(new Set(box.flatMap((b) => b.categories ?? []))).sort(), [box]);
  // yaneyuka 側でリンクが更新されたカード（カードの中の「取り込む」と同じ判定）
  const updatedIds = useMemo(() => {
    if (!data) return new Set<string>();
    return new Set(
      box.filter((b) => {
        const cur = mergeMaker(data, b.name)?.links;
        return cur ? linkChanges(b.links, cur).length > 0 : false;
      }).map((b) => b.id),
    );
  }, [box, data]);
  const shown = useMemo(
    () =>
      [...box]
        .filter((b) => !filter || b.categories?.includes(filter))
        .filter((b) => !updatesOnly || updatedIds.has(b.id))
        .sort((a, b) => a.name.localeCompare(b.name, 'ja')),
    [box, filter, updatesOnly, updatedIds],
  );

  const add = async (name: string) => {
    if (!uid || !data) return;
    const m = mergeMaker(data, name);
    if (!m) return;
    if (!scope) return;
    await saveBoxItem(scope, { id: boxId(name), ...m, extra: [], note: '', createdAt: Date.now() });
    setQ('');
  };

  if (!uid || !scope)
    return <p className="text-[11px] text-gray-500">メーカー資料箱を使うにはログインしてください。建材ページの「＋資料箱」で控えたメーカーが、ここに 1 社 1 枚のカードで並びます。</p>;

  return (
    <div className="space-y-4 text-[11px]">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 border-b border-gray-200 pb-2">
        <span className="yy-mono text-[10px] tracking-[0.12em] uppercase text-gray-500 mr-2">Box</span>
        {[{ id: 'me', name: '自分' }, ...boards.map((b) => ({ id: b.id!, name: `チーム: ${b.name}` }))].map((o) => (
          <button key={o.id} type="button" onClick={() => pickScope(o.id)} className={segClass((board?.id ?? 'me') === o.id)}>
            {o.name}
          </button>
        ))}
        <span className="text-[10px] text-gray-400 ml-2 min-w-0">
          {boards.length ? 'チームの資料箱は、Teamタスクのボードのメンバー全員で見られ、書き足せます（事務所の標準仕様に）' : 'Teamタスクでボードを作ってメンバーを入れると、チームで共有する資料箱が使えます'}
        </span>
      </div>
      {teamNotice && <p className="text-[11px] text-gray-600 border-l border-[#52AA96] pl-2">{teamNotice}</p>}
      {teamError && <p className="text-[11px] text-red-700">{teamError}</p>}

      <div className="flex flex-wrap items-start gap-3">
        <div className="relative w-full sm:w-72">
          <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" aria-hidden />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={data ? `メーカー名・分類で探して追加（${Object.values(data).flat().length} 行から）` : '読み込み中…'}
            disabled={!data}
            className="w-full pl-6 pr-2 py-1.5 text-[11px]"
          />
          {hits.length > 0 && (
            <ul className="absolute z-20 left-0 right-0 top-full bg-white border border-[#3b3b3b] border-t-0 max-h-72 overflow-y-auto">
              {hits.map((h) => {
                const saved = box.some((b) => b.id === boxId(h.name));
                return (
                  <li key={h.name} className="border-b border-gray-100 last:border-b-0">
                    <button type="button" disabled={saved} onClick={() => void add(h.name)} className="w-full text-left px-2 py-1.5 hover:bg-gray-50 disabled:text-gray-400 flex justify-between gap-2">
                      <span>{h.name}</span>
                      <span className="yy-mono text-[10px] text-gray-400 truncate">{saved ? '登録済み' : h.categories.join(' / ')}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <p className="text-[11px] text-gray-500 flex-1 min-w-[200px] leading-relaxed">
          建材ページのメーカー行にある「＋資料箱」からも登録できます。yaneyuka 側でカタログ等の URL が更新されると、カードと上部のベルでお知らせします。
          担当者は「担当者連絡先」の会社名と照らし合わせて出します。
        </p>
      </div>

      {(categories.length > 1 || updatedIds.size > 0) && (
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
          {['', ...categories].map((c) => (
            <button key={c || '__all'} type="button" onClick={() => setFilter(c)} className={segClass(filter === c && !updatesOnly)}>
              {c || (
                <>
                  すべて <span className="yy-mono text-[10px]">{box.length}</span>
                </>
              )}
            </button>
          ))}
          {updatedIds.size > 0 && (
            <button type="button" onClick={() => onUpdatesOnlyChange?.(!updatesOnly)} className={`${segClass(updatesOnly)} inline-flex items-center gap-1 ml-2`}>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#52AA96]" aria-hidden />
              カタログ更新 <span className="yy-mono text-[10px]">{updatedIds.size}</span>
            </button>
          )}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="py-8 text-[11px] text-gray-400">
          {updatesOnly ? (
            <>
              リンクが更新されたカードはありません。{' '}
              <button type="button" className="underline underline-offset-2 text-gray-600" onClick={() => onUpdatesOnlyChange?.(false)}>
                すべて表示
              </button>
            </>
          ) : (
            'まだメーカーがありません。上の検索か、建材ページの「＋資料箱」から追加してください。'
          )}
        </p>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 2xl:grid-cols-3">
          {shown.map((item) => (
            <MakerCard
              key={item.id}
              uid={uid}
              scope={scope}
              teams={board ? [] : boards}
              item={item}
              current={data ? mergeMaker(data, item.name)?.links ?? null : null}
              broken={broken}
              contact={findByCompany(contacts, item.name)}
              related={relatedBookmarks(item, bookmarks)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function MakerCard({
  uid,
  scope,
  teams,
  item,
  current,
  broken,
  contact,
  related,
}: {
  uid: string;
  scope: BoxScope;
  /** 自分の資料箱のカードから、チームへ写すときの行き先 */
  teams: BoardDoc[];
  item: TeamBoxItem;
  current: MakerBoxItem['links'] | null;
  broken: Broken;
  contact: Contact | null;
  related: Array<{ id: string; title: string; url: string }>;
}) {
  const { currentUser } = useAuth();
  const [note, setNote] = useState(item.note ?? '');
  const [extraLabel, setExtraLabel] = useState('');
  const [extraUrl, setExtraUrl] = useState('');
  const [sampleText, setSampleText] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => setNote(item.note ?? ''), [item.note]);

  const changes = current ? linkChanges(item.links, current) : [];
  const save = (patch: Partial<MakerBoxItem>) => saveBoxItem(scope, { ...item, ...patch });
  const shareTo = async (boardId: string) => {
    const b = teams.find((x) => x.id === boardId);
    if (!b) return;
    try {
      // チームに置くときは「足した人」を自分にする（他人のカードの上書きはルールで断られる）
      await saveBoxItem({ kind: 'team', boardId, uid, userName: currentUser?.username || '' }, { ...item, addedBy: uid, addedByName: currentUser?.username || '' });
      setMsg(`チーム「${b.name}」の資料箱に写しました`);
    } catch {
      setMsg(`チーム「${b.name}」には同じメーカーが既にあります`);
    }
  };
  const sum = contact ? summarize(contact.log, todayYmd()) : null;

  const requestSample = async () => {
    const text = sampleText.trim() || 'サンプル';
    await recordContactLog(uid, item.name, { id: newLogId(), date: todayYmd(), kind: 'サンプル', text, status: '依頼中', source: 'メーカー資料箱' });
    setSampleText('');
    setMsg(`担当者連絡先に「${text}」を依頼中として記録しました`);
  };

  return (
    <div className="bg-white border border-[#3b3b3b] flex flex-col min-w-0">
      <div className="px-3 pt-2.5 pb-2 flex items-start justify-between gap-2 border-b border-gray-200">
        <div className="min-w-0">
          <div className="text-[14px] font-bold tracking-[-0.01em] truncate flex items-center gap-1.5">
            {changes.length > 0 && <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#52AA96]" title="yaneyuka 側でリンクが更新されています" />}
            {item.name}
          </div>
          <div className="yy-mono text-[10px] tracking-[0.12em] text-gray-400 uppercase truncate">
            {(item.categories ?? []).join(' / ')}
            {scope.kind === 'team' && item.addedByName ? `　ADDED BY ${item.addedByName}` : ''}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm(`${item.name} を資料箱から外しますか？（メモと追加リンクも消えます）`)) void removeBoxItem(scope, item.id).catch(() => setMsg('外せるのは、足した人かチームのオーナーだけです'));
          }}
          className="text-gray-400 hover:text-red-600 shrink-0 p-0.5"
          aria-label="資料箱から外す"
          title="資料箱から外す"
        >
          <FiX className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-3 py-2 grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-1">
        {BOX_SLOTS.map(({ key, label }) => {
          const url = item.links?.[key];
          if (!url || url === '#') return <span key={key} className="text-gray-300">{label}</span>;
          const fb = fallbackFor(url, broken);
          const href = fb ? fb || url : url;
          const updated = changes.some((c) => c.key === key);
          return (
            <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 decoration-gray-300 hover:decoration-[#141414] truncate" title={fb !== null ? 'リンク先が見つからないため、会社のトップページを開きます' : url}>
              {label}
              {fb !== null && <span className="text-[10px] text-gray-400 no-underline">（移転）</span>}
              {updated && <span className="text-[10px] text-[#52AA96] no-underline">（更新）</span>}
            </a>
          );
        })}
      </div>

      {changes.length > 0 && (
        <div className="mx-3 mb-2 py-1.5 border-t border-b border-gray-200 text-[11px] flex items-center justify-between gap-2">
          <span className="text-gray-700">
            <span className="yy-mono text-[10px] tracking-[0.12em] text-[#52AA96] mr-1.5">UPDATED</span>
            yaneyuka 側で {changes.map((c) => c.label).join('・')} のリンクが更新されています
          </span>
          <button type="button" className="underline underline-offset-2 shrink-0 text-[#141414]" onClick={() => void save({ links: { ...item.links, ...Object.fromEntries(changes.map((c) => [c.key, c.to])) } })}>
            取り込む
          </button>
        </div>
      )}

      {(item.extra ?? []).length > 0 && (
        <ul className="px-3 pb-1 space-y-0.5">
          {(item.extra ?? []).map((x, i) => (
            <li key={i} className="flex items-center gap-1.5 group">
              <span className="yy-mono text-[10px] text-gray-400">{String(i + 1).padStart(2, '0')}</span>
              <a href={x.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 decoration-gray-300 truncate flex-1">{x.label || x.url}</a>
              <button type="button" className="text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => void save({ extra: (item.extra ?? []).filter((_, j) => j !== i) })} aria-label="リンクを外す">
                <FiX className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="px-3 pb-2 flex gap-1">
        <input type="text" value={extraLabel} onChange={(e) => setExtraLabel(e.target.value)} placeholder="名前（施工要領書）" className="border-gray-200 px-1 py-0.5 w-28 text-[11px]" />
        <input type="text" value={extraUrl} onChange={(e) => setExtraUrl(e.target.value)} placeholder="URL" className="border-gray-200 px-1 py-0.5 flex-1 min-w-0 text-[11px]" />
        <button
          type="button"
          disabled={!/^https?:\/\//.test(extraUrl.trim())}
          onClick={() => {
            void save({ extra: [...(item.extra ?? []), { label: extraLabel.trim(), url: extraUrl.trim() }] });
            setExtraLabel('');
            setExtraUrl('');
          }}
          className="yy-btn !px-2 !py-0.5"
        >
          足す
        </button>
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => note !== (item.note ?? '') && void save({ note })}
        placeholder="うちの標準仕様・品番・色・注意点（外壁: ○○ 37mm、色は△△ …）"
        className="mx-3 mb-2 px-2 py-1 h-14 resize-none text-[11px]"
      />

      <div className="mt-auto border-t border-gray-200 px-3 py-2 space-y-1.5">
        {contact ? (
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="yy-mono text-[10px] tracking-[0.12em] uppercase text-gray-400">Contact</span>
            <span className="font-bold">{contact.name || '（氏名未入力）'}</span>
            {contact.phone && <a href={`tel:${contact.phone}`} className="underline underline-offset-2">{contact.phone}</a>}
            {contact.email && <a href={`mailto:${contact.email}`} className="underline underline-offset-2 truncate">{contact.email}</a>}
            {sum && sum.count > 0 && (
              <span className="text-gray-500">
                履歴 {sum.count}
                {sum.openSamples ? `・サンプル ${sum.openSamples}` : ''}
              </span>
            )}
          </div>
        ) : (
          <div className="text-gray-400">担当者は未登録（サンプル依頼を記録すると担当者連絡先にカードができます）</div>
        )}
        <div className="flex flex-wrap gap-1">
          <input type="text" value={sampleText} onChange={(e) => setSampleText(e.target.value)} placeholder="サンプルの品名・品番" className="border-gray-200 px-1 py-0.5 flex-1 min-w-[8rem] bg-white text-[11px]" />
          <button type="button" onClick={() => void requestSample()} className="yy-btn !px-2 !py-0.5 shrink-0">サンプル依頼を記録</button>
          <button type="button" onClick={() => openMakerConect({ makers: [item.name], part: (item.categories ?? [])[0] })} className="yy-btn !px-2 !py-0.5 shrink-0" title="Maker conect で依頼文を作ってメーカーの窓口を開く">問い合わせ</button>
        </div>
        {teams.length > 0 && (
          <select value="" onChange={(e) => e.target.value && void shareTo(e.target.value)} className="border-gray-200 px-1 py-0.5 bg-white text-[10px] w-full">
            <option value="">チームの資料箱に写す…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
        {msg && <p className="text-[10px] text-gray-600">{msg}</p>}
        {related.length > 0 && (
          <div className="text-[10px] text-gray-500 truncate">
            関連ブックマーク:{' '}
            {related.slice(0, 3).map((b, i) => (
              <React.Fragment key={b.id}>
                {i > 0 && '、'}
                <a href={b.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{b.title || b.url}</a>
              </React.Fragment>
            ))}
            {related.length > 3 && ` ほか ${related.length - 3}`}
          </div>
        )}
      </div>
    </div>
  );
}
