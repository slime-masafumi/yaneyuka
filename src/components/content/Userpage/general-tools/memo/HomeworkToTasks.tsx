'use client';
/**
 * メモ（議事録・現場巡回・是正指示）の宿題を拾って Myタスク か Teamタスクのボードへ。
 * 拾い方は src/lib/memoTasks.ts。ここでは確認して選ぶだけ。
 *
 * 2026-11-16: 送り先に Teamタスクのボードを足した。議事録の宿題は「誰が」が自分以外のことが多く、
 * Myタスクに入れても担当の人には届かなかった。ボードを選ぶと、担当をそのボードのメンバーから選べる
 * （担当に付けた人には上部のベルで通知が届く。未ログインの自分用ボードは担当なし）。
 * 物件は物件の台帳（src/lib/projectRegistry.ts）から選び、物件に紐づいたボードを先に選んでおく。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { useTaskContext } from '@/components/providers/TaskProvider';
import { useAuth } from '@/lib/AuthContext';
import { addBoardTask, getUsersByUids, listBoardsForUser } from '@/lib/firebaseUserData';
import { readGuestBoard, writeGuestBoard, guestTaskId } from '../../teamTasks/guestBoard';
import { extractHomework, projectOfMemo, taskContent, type Homework } from '@/lib/memoTasks';
import ProjectPicker from '@/components/ui/ProjectPicker';
import { projectKey, useProjectRegistry } from '@/lib/projectRegistry';

type Item = Homework & { on: boolean; assignee: string };
type BoardChoice = { id: string; name: string; projectName?: string; members: { uid: string; label: string }[] };

/** 担当の書き方（田中・田中さん）とメンバーの表示名を突き合わせる */
const matchMember = (who: string | null, members: BoardChoice['members']) => {
  if (!who) return '';
  const w = who.replace(/(さん|様|君)$/, '').trim();
  if (!w) return '';
  return members.find((m) => m.label.includes(w) || w.includes(m.label))?.uid ?? '';
};

export default function HomeworkToTasks({ text, folder, onClose }: { text: string; folder: string; onClose: () => void }) {
  const { categories, addTask } = useTaskContext();
  const { currentUser, authReady } = useAuth();
  const registry = useProjectRegistry();
  const found = useMemo(() => extractHomework(text, new Date()), [text]);
  const [items, setItems] = useState<Item[]>(() => found.map((h) => ({ ...h, on: true, assignee: '' })));
  const [project, setProject] = useState(() => projectOfMemo(text, folder) ?? '');
  const [cat, setCat] = useState(categories[0]?.id ?? '1');
  const [dest, setDest] = useState<'my' | 'team'>('my');
  const [boards, setBoards] = useState<BoardChoice[] | null>(null);
  const [boardId, setBoardId] = useState('');
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);

  // ボードの一覧（Teamタスクを選んだときだけ読む）。ログイン中は自分が入っているボード、未ログインはこのブラウザの自分用ボード
  useEffect(() => {
    if (dest !== 'team' || boards !== null || !authReady) return;
    let alive = true;
    (async () => {
      try {
        if (!currentUser) {
          const g = readGuestBoard();
          const list = (g?.projects ?? [])
            .filter((p) => !(p as { archived?: boolean }).archived)
            .map((p) => ({ id: p.id, name: p.name, projectName: (p as { projectName?: string }).projectName, members: [] }));
          if (alive) setBoards(list);
          return;
        }
        const raw = await listBoardsForUser(currentUser.uid);
        const live = raw.filter((b) => !(b as { archived?: boolean }).archived);
        const list: BoardChoice[] = await Promise.all(
          live.map(async (b) => {
            let members: BoardChoice['members'] = [];
            try {
              const us = await getUsersByUids([b.ownerUid, ...(b.memberUids || [])]);
              members = us.map((u) => ({ uid: u.uid, label: u.uid === currentUser.uid ? `${u.displayName || '自分'}（自分）` : u.displayName || '名前未登録' }));
            } catch {
              members = [{ uid: currentUser.uid, label: '自分' }];
            }
            return { id: b.id!, name: b.name, projectName: (b as { projectName?: string }).projectName, members };
          }),
        );
        if (alive) setBoards(list);
      } catch {
        if (alive) setBoards([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [dest, boards, authReady, currentUser]);

  // 物件に紐づいたボード（物件名かボード名が同じ）を先に選ぶ
  useEffect(() => {
    if (!boards?.length) return;
    if (boardId && boards.some((b) => b.id === boardId)) return;
    const k = project.trim() ? projectKey(project) : '';
    const hit = k ? boards.find((b) => projectKey(b.projectName || '') === k || projectKey(b.name) === k) : undefined;
    setBoardId((hit ?? boards[0]).id);
  }, [boards, project, boardId]);

  const board = boards?.find((b) => b.id === boardId) ?? null;
  // ボードを替えたら、担当を「担当: 田中」などの書き方からそのボードのメンバーに当て直す
  useEffect(() => {
    if (!board) return;
    setItems((prev) => prev.map((x) => ({ ...x, assignee: matchMember(x.who, board.members) })));
  }, [board?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (i: number, p: Partial<Item>) => setItems((prev) => prev.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const projectName = () => {
    const p = project.trim();
    return p ? registry.find(p)?.name ?? p : null;
  };

  const save = async () => {
    const picked = items.filter((x) => x.on && x.text.trim());
    if (!picked.length) return;
    setBusy(true);
    try {
      if (dest === 'my') {
        for (const h of picked) await addTask(cat, taskContent(h, projectName()), h.due || null);
        setDone(`${picked.length} 件を Myタスクに入れました`);
        return;
      }
      if (!board) return;
      if (!currentUser) {
        // 自分用ボード（このブラウザ）。開いている Teamタスクの画面があればそちらが書き直すので、読み直してから足す
        const g = readGuestBoard();
        if (!g || !g.projects.some((p) => p.id === board.id)) { setDone('ボードが見つかりませんでした'); return; }
        const list = g.tasks[board.id] || [];
        const added = picked.map((h) => ({
          id: guestTaskId(),
          title: `${h.text}${h.who ? `（${h.who}）` : ''}`,
          completed: false,
          dueDate: h.due || null,
          priority: 'medium' as const,
        }));
        writeGuestBoard({ ...g, tasks: { ...g.tasks, [board.id]: [...list, ...added] } });
        setDone(`${picked.length} 件をボード「${board.name}」に入れました`);
        return;
      }
      let n = 0;
      const failed: string[] = [];
      for (const h of picked) {
        // 担当がメンバーに当たらなかったものは、担当の書き方を本文に残す（誰の宿題か消えないように）
        const title = `${h.text}${h.who && !h.assignee ? `（${h.who}）` : ''}`;
        try {
          await addBoardTask(board.id, { title, completed: false, dueDate: h.due || null, priority: 'medium', assigneeUid: h.assignee || currentUser.uid });
          n++;
        } catch {
          failed.push(h.text);
        }
      }
      setDone(
        `${n} 件をボード「${board.name}」に入れました${failed.length ? `。入れられなかったもの: ${failed.join('、')}（通信を確かめてもう一度）` : ''}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const onCount = items.filter((x) => x.on).length;
  const canSave = onCount > 0 && !done && !busy && (dest === 'my' || !!board);

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-[10000] bg-black/40 flex items-start justify-center p-4 pt-12" style={{ top: 'var(--nav-height, 35px)' }} onClick={onClose}>
      <div className="bg-white border border-[#3b3b3b] w-full max-w-2xl p-4 space-y-2 text-xs" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <span className="font-bold text-[12px]">宿題をタスクへ</span>
          <button type="button" onClick={onClose} aria-label="閉じる" className="text-gray-500 hover:text-gray-900"><FiX className="w-3.5 h-3.5" /></button>
        </div>
        {items.length === 0 ? (
          <p className="text-gray-500 py-4 leading-relaxed">
            宿題が見つかりませんでした。「宿題（担当 / 期限）」「指摘・是正」などの見出しの下に書くか、行の頭に ☐ を付けると拾います。
          </p>
        ) : (
          <>
            {/* 送り先 */}
            <div className="flex items-center gap-0 border-b border-gray-300" role="tablist" aria-label="送り先">
              {([['my', 'Myタスク（自分の宿題）'], ['team', 'Teamタスク（担当を付けて共有）']] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={dest === k}
                  onClick={() => { setDest(k); setDone(''); }}
                  className={`px-3 py-1 -mb-px border-b ${dest === k ? 'border-[#52AA96] font-bold text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              <label className="flex-1 min-w-[200px]">
                <span className="text-gray-500">物件{dest === 'my' ? '（タスクの頭に【】で付く）' : '（紐づいたボードを先に選ぶ）'}</span>
                <span className="block mt-0.5">
                  <ProjectPicker value={project} onChange={setProject} placeholder="なし" label="宿題の物件" className="w-full flex-wrap [&_input]:!w-full [&_input]:!h-7 [&_input]:!text-[12px]" />
                </span>
              </label>
              {dest === 'my' ? (
                <label className="w-40">
                  <span className="text-gray-500">入れるシート</span>
                  <select value={cat} onChange={(e) => setCat(e.target.value)} className="w-full border px-1 py-1 mt-0.5">
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="w-56">
                  <span className="text-gray-500">入れるボード</span>
                  {boards === null ? (
                    <span className="block mt-1 text-gray-400">読み込み中…</span>
                  ) : boards.length === 0 ? (
                    <span className="block mt-1 text-gray-500">ボードがありません。Teamタスクで物件のボードを作ってください。</span>
                  ) : (
                    <select value={boardId} onChange={(e) => setBoardId(e.target.value)} className="w-full border px-1 py-1 mt-0.5">
                      {boards.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}{b.projectName && projectKey(b.projectName) !== projectKey(b.name) ? `（${b.projectName}）` : ''}</option>
                      ))}
                    </select>
                  )}
                </label>
              )}
            </div>
            {dest === 'team' && !currentUser && authReady && (
              <p className="text-[10px] text-gray-500">未ログインの自分用ボードには担当を付けられません（担当の書き方は本文に残します）。ログインするとメンバーを担当にでき、担当の人に通知が届きます。</p>
            )}
            <ul className="border divide-y max-h-80 overflow-y-auto">
              {items.map((h, i) => (
                <li key={i} className="flex items-center gap-1.5 px-2 py-1 flex-wrap sm:flex-nowrap">
                  <input type="checkbox" checked={h.on} onChange={(e) => patch(i, { on: e.target.checked })} />
                  <input value={h.text} onChange={(e) => patch(i, { text: e.target.value })} className="flex-1 min-w-[8rem] border-b border-transparent focus:border-gray-400 px-1 py-0.5" />
                  {dest === 'team' && board && currentUser ? (
                    <select
                      value={h.assignee}
                      onChange={(e) => patch(i, { assignee: e.target.value })}
                      className="w-28 border px-1 py-0.5"
                      title={h.who ? `メモの担当: ${h.who}` : '担当'}
                    >
                      <option value="">{h.who ? `担当: ${h.who}?` : '担当（自分）'}</option>
                      {board.members.map((m) => (
                        <option key={m.uid} value={m.uid}>{m.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input value={h.who ?? ''} onChange={(e) => patch(i, { who: e.target.value || null })} placeholder="担当" className="w-16 border px-1 py-0.5" />
                  )}
                  <input type="date" value={h.due ?? ''} onChange={(e) => patch(i, { due: e.target.value || null })} className="border px-1 py-0.5 w-[120px]" />
                </li>
              ))}
            </ul>
            {dest === 'team' && currentUser && board && items.some((x) => x.on && x.who && !x.assignee) && (
              <p className="text-[10px] text-gray-500">担当がメンバーに当たらなかった行は、自分を担当にして本文に（担当名）を残します。</p>
            )}
            <div className="flex items-center justify-end gap-2">
              {done && <span className="mr-auto text-gray-700">{done}</span>}
              <button type="button" onClick={onClose} className="px-3 py-1 border border-gray-300">閉じる</button>
              <button type="button" disabled={!canSave} onClick={() => void save()} className="px-3 py-1 bg-[#17302A] text-white rounded-full disabled:opacity-40">
                {busy ? '追加中…' : `${onCount} 件を${dest === 'my' ? 'Myタスク' : 'ボード'}に追加`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
