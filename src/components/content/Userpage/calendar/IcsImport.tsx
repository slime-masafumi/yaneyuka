'use client';
/**
 * Myカレンダー › .ics を読み込む（ファイルから取り込み）。
 *
 * URL の購読は「表示するだけ」で、書き込めない・通知も来ない。Google カレンダーや
 * Outlook から書き出したファイルを、自分の予定として入れたいという用途はこちら。
 * 繰り返しは src/lib/ics.ts で 1 回ずつに展開してから入れる（このカレンダーは
 * 繰り返しを 1 件のまま描かないので、展開しないと 1 回しか出ない）。
 *
 * 同じファイルを 2 回読んでも増えないよう、UID と開始日時をつないだ鍵（icsKey）を
 * 予定に残し、既にある鍵は飛ばす。
 *
 * モーダルは portal にしない。.yy-tool の入力欄の見た目をそのまま効かせるため。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiX, FiUpload } from 'react-icons/fi';
import { parseIcsCalendar, type IcsEvent, type IcsParseStats } from '@/lib/ics';
import { BUILDING_CATEGORIES } from './categories';

export type ImportTarget = { name: string; color: string };

const mono = 'yy-mono text-[10px] tracking-[0.12em] uppercase text-gray-500';
const NEW_CATEGORY_COLOR = '#5B6B73';
const MAX_BYTES = 5 * 1024 * 1024;
/** 読むのは上限 +1 バイトまで（それを超えたら大きすぎると分かる） */
const readText = (file: File) => file.slice(0, MAX_BYTES + 1).text();

type Parsed = { fileName: string; calName: string; events: IcsEvent[]; stats: IcsParseStats };

export default function IcsImport({
  initialFile,
  categories,
  existingKeys,
  onImport,
  onClose,
}: {
  initialFile?: File | null;
  categories: { name: string; color: string }[];
  /** 既に入っている予定の icsKey */
  existingKeys: Set<string>;
  onImport: (items: IcsEvent[], target: ImportTarget, remind: boolean) => Promise<number>;
  onClose: () => void;
}) {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [error, setError] = useState('');
  const [target, setTarget] = useState('');
  const [remind, setRemind] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /** 読み終えた本文を確かめて、予定に直す */
  const accept = useCallback((file: File, text: string) => {
    setDone('');
    setError('');
    if (!/\.ics$/i.test(file.name) && file.type !== 'text/calendar') {
      setError('.ics ファイルを選んでください（Google カレンダーは「設定 › インポート/エクスポート」で書き出せます）');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('ファイルが大きすぎます（5MB まで）');
      return;
    }
    if (!text.includes('BEGIN:VCALENDAR')) {
      setError('カレンダー形式（.ics）ではありません');
      return;
    }
    const { events, stats } = parseIcsCalendar(text);
    const calName = (text.match(/^X-WR-CALNAME:(.*)$/m)?.[1] || '').trim() || file.name.replace(/\.ics$/i, '');
    setParsed({ fileName: file.name, calName, events, stats });
    setTarget((t) => t || `new:${calName}`);
  }, []);

  const readFile = (file: File) => readText(file).then((t) => accept(file, t));

  // カレンダーの上にドロップして開いたときは、そのファイルをすぐ読む
  useEffect(() => {
    if (!initialFile) return;
    let alive = true;
    readText(initialFile).then((t) => { if (alive) accept(initialFile, t); });
    return () => { alive = false; };
  }, [initialFile, accept]);

  const fresh = useMemo(() => (parsed ? parsed.events.filter((e) => !existingKeys.has(e.key)) : []), [parsed, existingKeys]);
  const dup = parsed ? parsed.events.length - fresh.length : 0;
  const range = useMemo(() => {
    if (!fresh.length) return '';
    const ds = fresh.map((e) => e.date).sort();
    return ds[0] === ds[ds.length - 1] ? ds[0] : `${ds[0]} — ${ds[ds.length - 1]}`;
  }, [fresh]);

  const missingBuilding = BUILDING_CATEGORIES.filter((b) => !categories.some((c) => c.name === b.name));
  const resolveTarget = (): ImportTarget | null => {
    if (!target) return null;
    if (target.startsWith('new:')) {
      const name = target.slice(4).trim();
      return name ? { name, color: NEW_CATEGORY_COLOR } : null;
    }
    const existing = categories.find((c) => c.name === target);
    if (existing) return { name: existing.name, color: existing.color };
    const b = BUILDING_CATEGORIES.find((c) => c.name === target);
    return b ?? null;
  };

  const run = async () => {
    const t = resolveTarget();
    if (!t || !fresh.length) return;
    setBusy(true);
    try {
      const n = await onImport(fresh, t, remind);
      setDone(`${n} 件を「${t.name}」に入れました${dup ? `（取り込み済みの ${dup} 件は飛ばしました）` : ''}`);
    } catch (e) {
      console.error('[IcsImport]', e);
      setError('書き込めませんでした。時間をおいてもう一度試してください');
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void readFile(f);
  };

  const s = parsed?.stats;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/40" onClick={onClose}>
      <div className="bg-white border border-[#3b3b3b] w-full max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#3b3b3b]">
          <div>
            <p className={mono}>[ IMPORT ]</p>
            <p className="text-[12px] font-bold text-[#141414]">.ics ファイルを読み込む</p>
          </div>
          <button type="button" onClick={onClose} aria-label="閉じる" className="text-gray-500 hover:text-[#141414]"><FiX size={14} /></button>
        </div>

        <div className="p-3 overflow-y-auto text-[12px] space-y-3">
          <div
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
            className={`border border-dashed px-3 py-4 text-center ${over ? 'border-[#52AA96]' : 'border-gray-400'}`}
          >
            <FiUpload className="mx-auto mb-1 text-gray-500" size={14} />
            <p className="text-[11px] text-gray-600">
              ここに .ics をドロップ、または{' '}
              <button type="button" onClick={() => inputRef.current?.click()} className="underline underline-offset-2 text-[#141414]">
                ファイルを選ぶ
              </button>
            </p>
            <p className="text-[10px] text-gray-400 mt-1">カレンダーの上にドロップしても開きます</p>
            <input
              ref={inputRef}
              type="file"
              accept=".ics,text/calendar"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void readFile(f);
                e.target.value = '';
              }}
            />
          </div>

          {error && <p className="text-[11px] text-red-700">{error}</p>}

          {parsed && s && (
            <>
              <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-1 border-t border-gray-200 pt-2">
                <dt className={mono}>File</dt>
                <dd className="truncate">{parsed.fileName}</dd>
                <dt className={mono}>Events</dt>
                <dd>
                  <span className="yy-mono">{fresh.length}</span> 件を入れる
                  {dup > 0 && <span className="text-gray-500">（取り込み済み {dup} 件は飛ばす）</span>}
                </dd>
                {range && (
                  <>
                    <dt className={mono}>Range</dt>
                    <dd className="yy-mono text-[11px]">{range}</dd>
                  </>
                )}
                {s.recurringSeries > 0 && (
                  <>
                    <dt className={mono}>Repeat</dt>
                    <dd className="text-gray-700">
                      繰り返し {s.recurringSeries} 件を 1 回ずつに展開（1 年前〜2 年先・1 件 500 回まで）
                      {s.truncatedSeries > 0 && <span className="text-gray-500">。{s.truncatedSeries} 件は期間の端で打ち切り</span>}
                      {s.unsupportedRules > 0 && <span className="text-gray-500">。{s.unsupportedRules} 件は書き方が特殊なので初回だけ</span>}
                    </dd>
                  </>
                )}
              </dl>

              {fresh.length > 0 && (
                <ul className="border-t border-b border-gray-200 divide-y divide-gray-100 max-h-[160px] overflow-y-auto">
                  {fresh.slice(0, 30).map((e) => (
                    <li key={e.key} className="flex items-baseline gap-2 px-1 py-0.5">
                      <span className="yy-mono text-[10px] text-gray-500 w-[76px] shrink-0">{e.date}</span>
                      <span className="yy-mono text-[10px] text-gray-400 w-[36px] shrink-0">{e.allDay ? 'ALL' : `${e.startHour}:${e.startMinute}`}</span>
                      <span className="truncate">{e.title}</span>
                    </li>
                  ))}
                  {fresh.length > 30 && <li className="px-1 py-0.5 text-[10px] text-gray-400">ほか {fresh.length - 30} 件</li>}
                </ul>
              )}

              <label className="block">
                <span className="yy-label">入れる種別</span>
                <select className="w-full px-2 py-1 text-[12px] bg-white" value={target} onChange={(e) => setTarget(e.target.value)}>
                  <option value={`new:${parsed.calName}`}>＋ 新しい種別「{parsed.calName}」</option>
                  {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                  {missingBuilding.map((b) => <option key={b.name} value={b.name}>＋ {b.name}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-[11px] text-gray-700 cursor-pointer">
                <input type="checkbox" checked={remind} onChange={(e) => setRemind(e.target.checked)} className="w-3 h-3 accent-[#3b3b3b]" />
                前日と当日に通知
              </label>
              <div className="flex items-center gap-3">
                <button type="button" disabled={!fresh.length || busy || !!done} onClick={() => void run()} className="yy-btn yy-btn--primary">
                  {busy ? '入れています…' : `${fresh.length} 件をカレンダーに入れる`}
                </button>
                <button type="button" onClick={onClose} className="yy-btn">閉じる</button>
              </div>
              <p className="text-[10px] text-gray-400">
                入れた予定は自分の予定として編集・削除できます。繰り返しの予定は、削除するときに「まとめて削除」を選べます。
              </p>
            </>
          )}
          {done && <p className="text-[11px] text-[#141414] border-l border-[#52AA96] pl-2">{done}</p>}
        </div>
      </div>
    </div>
  );
}
