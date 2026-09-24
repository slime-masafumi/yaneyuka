'use client';
/**
 * Myカレンダー › 期限を入れる。
 *   建築確認・検査 … 着工・特定工程・完了の予定から、確認申請の提出目安と検査の申請期限を逆算して入れる
 *   資格試験の申込 … 資格試験ページの受付期限（目安）から、申し込みの締切を入れる
 * 計算は src/lib/permitSchedule.ts。資格の一覧は Qualifications.tsx と同じものを読む。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { permitMilestones, REVIEW_CLASSES, type ReviewClass } from '@/lib/permitSchedule';

export type NewDeadline = { title: string; date: string; details: string; category: string; color: string };

const PERMIT_CATEGORY = { name: '申請・検査', color: '#EF4444' };
const EXAM_CATEGORY = { name: '資格試験', color: '#8B5CF6' };

type Exam = { name: string; section: string; deadline: string; date: Date | null; url?: string };

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function DeadlineHelper({ onAdd, onClose }: { onAdd: (items: NewDeadline[]) => Promise<void>; onClose: () => void }) {
  const [tab, setTab] = useState<'permit' | 'exam'>('permit');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');

  // 建築確認・検査
  const [project, setProject] = useState('');
  const [start, setStart] = useState('');
  const [specific, setSpecific] = useState('');
  const [finish, setFinish] = useState('');
  const [review, setReview] = useState<ReviewClass>('large');
  const [margin, setMargin] = useState(14);
  const milestones = useMemo(
    () => permitMilestones({ project, start, specificProcess: specific || undefined, finish: finish || undefined, review, margin }),
    [project, start, specific, finish, review, margin]
  );

  // 資格試験
  const [exams, setExams] = useState<Exam[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (tab !== 'exam' || exams.length) return;
    import('@/components/content/Qualifications').then(({ sections, parseApproxDeadlineDate }) => {
      setExams(
        sections.flatMap((s) =>
          s.items.map((it) => ({ name: it.name, section: s.title, deadline: it.applicationDeadline ?? '', date: parseApproxDeadlineDate(it.applicationDeadline), url: it.url }))
        )
      );
    });
  }, [tab, exams.length]);

  const add = async (items: NewDeadline[]) => {
    if (!items.length) return;
    setBusy(true);
    try {
      await onAdd(items);
      setDone(`${items.length} 件をカレンダーに入れました`);
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full px-2 py-1 text-[12px] border border-gray-300';
  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-[10000] bg-black/40 flex items-start justify-center pt-8" style={{ top: 'var(--nav-height, 35px)' }} onClick={onClose}>
      <div className="bg-white border border-[#3b3b3b] w-[640px] max-w-[95vw] max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-3 py-2 bg-[#3b3b3b] text-white text-[12px]">
          <b>期限をカレンダーに入れる</b>
          <button type="button" onClick={onClose} aria-label="閉じる"><FiX /></button>
        </div>
        <div className="flex gap-2 px-3 pt-3">
          {([['permit', '建築確認・検査'], ['exam', '資格試験の申込']] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => { setTab(id); setDone(''); }}
              className={`px-4 py-1.5 text-xs border ${tab === id ? 'bg-[#3b3b3b] text-white border-[#3b3b3b] font-bold' : 'bg-white text-gray-700 border-[#3b3b3b] hover:bg-gray-100'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-3 overflow-y-auto text-[12px] space-y-3">
          {tab === 'permit' ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <label className="block col-span-2"><span className="text-[11px] text-gray-600">物件名</span><input className={input} value={project} onChange={(e) => setProject(e.target.value)} placeholder="A邸新築工事" /></label>
                <label className="block"><span className="text-[11px] text-gray-600">着工予定日 *</span><input type="date" className={input} value={start} onChange={(e) => setStart(e.target.value)} /></label>
                <label className="block"><span className="text-[11px] text-gray-600">確認の審査区分</span>
                  <select className={input} value={review} onChange={(e) => setReview(e.target.value as ReviewClass)}>
                    {REVIEW_CLASSES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </label>
                <label className="block"><span className="text-[11px] text-gray-600">特定工程の完了予定（中間検査がある場合）</span><input type="date" className={input} value={specific} onChange={(e) => setSpecific(e.target.value)} /></label>
                <label className="block"><span className="text-[11px] text-gray-600">工事の完了予定</span><input type="date" className={input} value={finish} onChange={(e) => setFinish(e.target.value)} /></label>
                <label className="block"><span className="text-[11px] text-gray-600">補正などの余裕（日）</span><input type="number" min={0} className={input} value={margin} onChange={(e) => setMargin(Number(e.target.value) || 0)} /></label>
              </div>
              {milestones.length > 0 ? (
                <table className="w-full text-[11px] border">
                  <tbody>
                    {milestones.map((m) => (
                      <tr key={m.title} className="border-t align-top">
                        <td className="px-2 py-1 whitespace-nowrap font-mono">{m.date}</td>
                        <td className={`px-2 py-1 ${m.kind === 'deadline' ? 'font-bold text-red-700' : ''}`}>{m.title}<div className="text-[10px] font-normal text-gray-500">{m.note}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500">着工予定日を入れると、期限が並びます。</p>
              )}
              <p className="text-[10px] text-gray-400">
                建築基準法 6条4項・7条・7条の3 の期間から逆算した目安です。中間検査の特定工程は自治体ごとに違います。事前協議や他法令の手続きは含みません。
              </p>
              <button
                type="button"
                disabled={!milestones.length || busy}
                onClick={() => void add(milestones.map((m) => ({ title: m.title, date: m.date, details: m.note, category: PERMIT_CATEGORY.name, color: PERMIT_CATEGORY.color })))}
                className="px-4 py-1.5 text-[12px] bg-[#3b3b3b] text-white disabled:opacity-40"
              >
                {busy ? '入れています…' : `${milestones.length} 件をカレンダーに入れる`}
              </button>
            </>
          ) : (
            <>
              {!exams.length && <p className="text-gray-500">読み込み中…</p>}
              <ul className="border divide-y max-h-[45vh] overflow-y-auto">
                {exams.map((ex) => {
                  const key = `${ex.section}/${ex.name}`;
                  return (
                    <li key={key}>
                      <label className={`flex items-center gap-2 px-2 py-1 ${ex.date ? 'cursor-pointer hover:bg-gray-50' : 'opacity-50'}`}>
                        <input
                          type="checkbox"
                          disabled={!ex.date}
                          checked={picked.has(key)}
                          onChange={(e) => {
                            const next = new Set(picked);
                            if (e.target.checked) next.add(key);
                            else next.delete(key);
                            setPicked(next);
                          }}
                        />
                        <span className="flex-1">{ex.name}</span>
                        <span className="text-[10px] text-gray-500">{ex.deadline || '未定'}</span>
                        <span className="text-[10px] font-mono w-[76px] text-right">{ex.date ? iso(ex.date) : '—'}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <p className="text-[10px] text-gray-400">「上旬〜中旬」などの受付期限を日付に置き換えた目安です（締切側の日付）。正式な日程は各試験の公式サイトで確かめてください。</p>
              <button
                type="button"
                disabled={!picked.size || busy}
                onClick={() =>
                  void add(
                    exams
                      .filter((ex) => ex.date && picked.has(`${ex.section}/${ex.name}`))
                      .map((ex) => ({
                        title: `【申込締切の目安】${ex.name}`,
                        date: iso(ex.date!),
                        details: `受付期限: ${ex.deadline}${ex.url ? `\n${ex.url}` : ''}`,
                        category: EXAM_CATEGORY.name,
                        color: EXAM_CATEGORY.color,
                      }))
                  )
                }
                className="px-4 py-1.5 text-[12px] bg-[#3b3b3b] text-white disabled:opacity-40"
              >
                {busy ? '入れています…' : `${picked.size} 件をカレンダーに入れる`}
              </button>
            </>
          )}
          {done && <p className="text-[11px] text-green-700">{done}</p>}
        </div>
      </div>
    </div>,
    document.body
  );
}

/** 建築の仕事でよく使う予定の種別（カテゴリ）。無いものだけ足す */
export const BUILDING_CATEGORIES = [
  { name: '現場定例', color: '#3B82F6' },
  { name: '施主打合せ', color: '#10B981' },
  { name: '申請・検査', color: '#EF4444' },
  { name: '中間検査', color: '#F59E0B' },
  { name: '完了検査', color: '#DC2626' },
  { name: '資格試験', color: '#8B5CF6' },
];
