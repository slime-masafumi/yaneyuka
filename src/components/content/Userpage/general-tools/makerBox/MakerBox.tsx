'use client';
/**
 * メーカー資料箱。1 メーカー = 1 カードに、商品ページ・カタログ・営業所・お問い合わせ・サンプル・CAD、
 * 自分で足したリンク、うちの標準仕様メモ、担当者（担当者連絡先から）、関連ブックマークを束ねる。
 * 建材ページの「＋資料箱」か、ここの検索から登録する。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/AuthContext';
import { BOX_SLOTS, boxId, mergeMaker, searchMakers, linkChanges, fallbackFor, relatedBookmarks, type MakerData, type MakerBoxItem } from '@/lib/makerBox';
import { useMakerBox, saveMakerBoxItem, removeMakerBoxItem } from '@/lib/useMakerBox';
import { findByCompany, isChatNicknameOnly, summarize, todayYmd, newLogId, type ContactLogEntry } from '@/lib/contactLog';
import { recordContactLog } from '@/lib/contactLogStore';

type Contact = { id: string; company?: string; name?: string; phone?: string; email?: string; log?: ContactLogEntry[] };
type Broken = Array<{ url: string; fallback?: string }>;

export default function MakerBox({ bookmarks }: { bookmarks: Array<{ id: string; title: string; url: string }> }) {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  const box = useMakerBox(uid);
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
  const shown = useMemo(
    () => [...box].filter((b) => !filter || b.categories?.includes(filter)).sort((a, b) => a.name.localeCompare(b.name, 'ja')),
    [box, filter],
  );

  const add = async (name: string) => {
    if (!uid || !data) return;
    const m = mergeMaker(data, name);
    if (!m) return;
    await saveMakerBoxItem(uid, { id: boxId(name), ...m, extra: [], note: '', createdAt: Date.now() });
    setQ('');
  };

  if (!uid) return <p className="text-xs text-gray-500">メーカー資料箱を使うにはログインしてください。</p>;

  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap items-start gap-3">
        <div className="relative w-72">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={data ? `メーカー名・分類で探して追加（${Object.values(data).flat().length} 行から）` : '読み込み中…'}
            disabled={!data}
            className="w-full border border-gray-300 px-2 py-1.5 focus:outline-none focus:border-gray-700"
          />
          {hits.length > 0 && (
            <ul className="absolute z-20 left-0 right-0 top-full bg-white border border-[#3b3b3b] max-h-72 overflow-y-auto">
              {hits.map((h) => {
                const saved = box.some((b) => b.id === boxId(h.name));
                return (
                  <li key={h.name}>
                    <button type="button" disabled={saved} onClick={() => void add(h.name)} className="w-full text-left px-2 py-1.5 hover:bg-gray-100 disabled:text-gray-400 flex justify-between gap-2">
                      <span>{h.name}</span>
                      <span className="text-[10px] text-gray-400 truncate">{saved ? '登録済み' : h.categories.join('・')}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <p className="text-[11px] text-gray-500 flex-1 min-w-[240px] leading-relaxed">
          建材ページのメーカー行にある「＋資料箱」からも登録できます。yaneyuka 側でカタログ等の URL が更新されると、カードでお知らせします。
          担当者は「担当者連絡先」の会社名と照らし合わせて出します。
        </p>
      </div>

      {categories.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {['', ...categories].map((c) => (
            <button key={c || '__all'} type="button" onClick={() => setFilter(c)} className={`px-1.5 py-0.5 border text-[10px] ${filter === c ? 'bg-[#3b3b3b] text-white border-[#3b3b3b]' : 'bg-white border-gray-300 text-gray-600'}`}>
              {c || `すべて ${box.length}`}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="py-10 text-center text-gray-400">まだメーカーがありません。上の検索か、建材ページの「＋資料箱」から追加してください。</p>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 2xl:grid-cols-3">
          {shown.map((item) => (
            <MakerCard
              key={item.id}
              uid={uid}
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
  item,
  current,
  broken,
  contact,
  related,
}: {
  uid: string;
  item: MakerBoxItem;
  current: MakerBoxItem['links'] | null;
  broken: Broken;
  contact: Contact | null;
  related: Array<{ id: string; title: string; url: string }>;
}) {
  const [note, setNote] = useState(item.note ?? '');
  const [extraLabel, setExtraLabel] = useState('');
  const [extraUrl, setExtraUrl] = useState('');
  const [sampleText, setSampleText] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => setNote(item.note ?? ''), [item.note]);

  const changes = current ? linkChanges(item.links, current) : [];
  const save = (patch: Partial<MakerBoxItem>) => saveMakerBoxItem(uid, { ...item, ...patch });
  const sum = contact ? summarize(contact.log, todayYmd()) : null;

  const requestSample = async () => {
    const text = sampleText.trim() || 'サンプル';
    await recordContactLog(uid, item.name, { id: newLogId(), date: todayYmd(), kind: 'サンプル', text, status: '依頼中', source: 'メーカー資料箱' });
    setSampleText('');
    setMsg(`担当者連絡先に「${text}」を依頼中として記録しました`);
  };

  return (
    <div className="bg-white border border-gray-300 flex flex-col">
      <div className="px-3 pt-2 pb-1 flex items-start justify-between gap-2 border-b border-gray-200">
        <div className="min-w-0">
          <div className="text-[14px] font-bold truncate">{item.name}</div>
          <div className="text-[9px] tracking-widest text-gray-400 font-mono uppercase truncate">{(item.categories ?? []).join(' / ')}</div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm(`${item.name} を資料箱から外しますか？（メモと追加リンクも消えます）`)) void removeMakerBoxItem(uid, item.id);
          }}
          className="text-gray-300 hover:text-red-600 shrink-0"
          aria-label="資料箱から外す"
        >
          ✕
        </button>
      </div>

      <div className="px-3 py-2 grid grid-cols-3 gap-x-2 gap-y-1">
        {BOX_SLOTS.map(({ key, label }) => {
          const url = item.links[key];
          if (!url || url === '#') return <span key={key} className="text-gray-300">{label}</span>;
          const fb = fallbackFor(url, broken);
          const href = fb ? fb || url : url;
          return (
            <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="underline truncate" title={fb !== null ? 'リンク先が見つからないため、会社のトップページを開きます' : url}>
              {label}
              {fb !== null && <span className="text-[9px] text-gray-400 no-underline">（移転）</span>}
            </a>
          );
        })}
      </div>

      {changes.length > 0 && (
        <div className="mx-3 mb-2 px-2 py-1 border border-amber-500 bg-amber-50 text-[11px] flex items-center justify-between gap-2">
          <span>yaneyuka 側で {changes.map((c) => c.label).join('・')} のリンクが更新されています</span>
          <button type="button" className="underline shrink-0" onClick={() => void save({ links: { ...item.links, ...Object.fromEntries(changes.map((c) => [c.key, c.to])) } })}>
            取り込む
          </button>
        </div>
      )}

      {(item.extra ?? []).length > 0 && (
        <ul className="px-3 pb-1 space-y-0.5">
          {(item.extra ?? []).map((x, i) => (
            <li key={i} className="flex items-center gap-1 group">
              <span className="text-gray-400">・</span>
              <a href={x.url} target="_blank" rel="noopener noreferrer" className="underline truncate flex-1">{x.label || x.url}</a>
              <button type="button" className="text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100" onClick={() => void save({ extra: (item.extra ?? []).filter((_, j) => j !== i) })} aria-label="リンクを外す">✕</button>
            </li>
          ))}
        </ul>
      )}
      <div className="px-3 pb-2 flex gap-1">
        <input value={extraLabel} onChange={(e) => setExtraLabel(e.target.value)} placeholder="名前（施工要領書）" className="border border-gray-200 px-1 py-0.5 w-28" />
        <input value={extraUrl} onChange={(e) => setExtraUrl(e.target.value)} placeholder="URL" className="border border-gray-200 px-1 py-0.5 flex-1 min-w-0" />
        <button
          type="button"
          disabled={!/^https?:\/\//.test(extraUrl.trim())}
          onClick={() => {
            void save({ extra: [...(item.extra ?? []), { label: extraLabel.trim(), url: extraUrl.trim() }] });
            setExtraLabel('');
            setExtraUrl('');
          }}
          className="px-2 border border-gray-400 disabled:opacity-40"
        >
          足す
        </button>
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => note !== (item.note ?? '') && void save({ note })}
        placeholder="うちの標準仕様・品番・色・注意点（外壁: ○○ 37mm、色は△△ …）"
        className="mx-3 mb-2 border border-gray-200 px-2 py-1 h-14 resize-none"
      />

      <div className="mt-auto border-t border-gray-200 px-3 py-2 bg-gray-50 space-y-1">
        {contact ? (
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-gray-500">担当</span>
            <span className="font-bold">{contact.name || '（氏名未入力）'}</span>
            {contact.phone && <a href={`tel:${contact.phone}`} className="underline">{contact.phone}</a>}
            {contact.email && <a href={`mailto:${contact.email}`} className="underline truncate">{contact.email}</a>}
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
        <div className="flex gap-1">
          <input value={sampleText} onChange={(e) => setSampleText(e.target.value)} placeholder="サンプルの品名・品番" className="border border-gray-200 px-1 py-0.5 flex-1 min-w-0 bg-white" />
          <button type="button" onClick={() => void requestSample()} className="px-2 border border-gray-400 bg-white shrink-0">サンプル依頼を記録</button>
        </div>
        {msg && <p className="text-[10px] text-green-700">{msg}</p>}
        {related.length > 0 && (
          <div className="text-[10px] text-gray-500 truncate">
            関連ブックマーク:{' '}
            {related.slice(0, 3).map((b, i) => (
              <React.Fragment key={b.id}>
                {i > 0 && '、'}
                <a href={b.url} target="_blank" rel="noopener noreferrer" className="underline">{b.title || b.url}</a>
              </React.Fragment>
            ))}
            {related.length > 3 && ` ほか ${related.length - 3}`}
          </div>
        )}
      </div>
    </div>
  );
}
