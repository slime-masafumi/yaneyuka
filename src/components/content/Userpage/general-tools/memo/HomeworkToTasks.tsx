'use client';
/**
 * メモ（議事録・現場巡回・是正指示）の宿題を拾って Myタスクへ。
 * 拾い方は src/lib/memoTasks.ts。ここでは確認して選ぶだけ。
 */
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTaskContext } from '@/components/providers/TaskProvider';
import { extractHomework, projectOfMemo, taskContent, type Homework } from '@/lib/memoTasks';

export default function HomeworkToTasks({ text, folder, onClose }: { text: string; folder: string; onClose: () => void }) {
  const { categories, addTask } = useTaskContext();
  const found = useMemo(() => extractHomework(text, new Date()), [text]);
  const [items, setItems] = useState<Array<Homework & { on: boolean }>>(() => found.map((h) => ({ ...h, on: true })));
  const [project, setProject] = useState(() => projectOfMemo(text, folder) ?? '');
  const [cat, setCat] = useState(categories[0]?.id ?? '1');
  const [done, setDone] = useState('');

  const patch = (i: number, p: Partial<Homework & { on: boolean }>) => setItems((prev) => prev.map((x, j) => (j === i ? { ...x, ...p } : x)));

  const save = async () => {
    const picked = items.filter((x) => x.on && x.text.trim());
    for (const h of picked) await addTask(cat, taskContent(h, project.trim() || null), h.due || null);
    setDone(`${picked.length} 件を Myタスクに入れました`);
  };

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-[10000] bg-black/40 flex items-start justify-center p-4 pt-12" style={{ top: 'var(--nav-height, 35px)' }} onClick={onClose}>
      <div className="bg-white border border-[#3b3b3b] w-full max-w-xl p-4 space-y-2 text-xs" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <span className="font-bold text-[13px]">宿題を Myタスクへ</span>
          <button type="button" onClick={onClose} aria-label="閉じる">✕</button>
        </div>
        {items.length === 0 ? (
          <p className="text-gray-500 py-4 leading-relaxed">
            宿題が見つかりませんでした。「宿題（担当 / 期限）」「指摘・是正」などの見出しの下に書くか、行の頭に ☐ を付けると拾います。
          </p>
        ) : (
          <>
            <div className="flex gap-2">
              <label className="flex-1">
                <span className="text-gray-500">物件（タスクの頭に【】で付く）</span>
                <input value={project} onChange={(e) => setProject(e.target.value)} placeholder="なし" className="w-full border px-2 py-1 mt-0.5" />
              </label>
              <label className="w-40">
                <span className="text-gray-500">入れるシート</span>
                <select value={cat} onChange={(e) => setCat(e.target.value)} className="w-full border px-1 py-1 mt-0.5">
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </label>
            </div>
            <ul className="border divide-y max-h-80 overflow-y-auto">
              {items.map((h, i) => (
                <li key={i} className="flex items-center gap-1.5 px-2 py-1">
                  <input type="checkbox" checked={h.on} onChange={(e) => patch(i, { on: e.target.checked })} />
                  <input value={h.text} onChange={(e) => patch(i, { text: e.target.value })} className="flex-1 min-w-0 border-b border-transparent focus:border-gray-400 px-1 py-0.5" />
                  <input value={h.who ?? ''} onChange={(e) => patch(i, { who: e.target.value || null })} placeholder="担当" className="w-16 border px-1 py-0.5" />
                  <input type="date" value={h.due ?? ''} onChange={(e) => patch(i, { due: e.target.value || null })} className="border px-1 py-0.5 w-[120px]" />
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-end gap-2">
              {done && <span className="mr-auto text-green-700">{done}</span>}
              <button type="button" onClick={onClose} className="px-3 py-1 border border-gray-300">閉じる</button>
              <button type="button" disabled={!items.some((x) => x.on) || !!done} onClick={() => void save()} className="px-3 py-1 bg-[#3b3b3b] text-white disabled:opacity-40">
                {items.filter((x) => x.on).length} 件を追加
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
