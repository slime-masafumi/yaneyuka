'use client';

/**
 * 物件ハブ(/bukken/)。2026-11-16
 *
 * 物件の台帳(src/lib/projectRegistry.ts)から物件を 1 つ選ぶと、その物件の
 *   ・Myタスクの未完了(【物件名】/ #物件名)
 *   ・メモ(物件のフォルダ、または本文の「物件名」がその物件)
 *   ・yymail の物件に仕分けたメール
 *   ・物件に紐づいた Teamタスクのボードの未完了
 * を 1 画面に集め、物件カルテ・工事写真・業務管理への入口を置く。
 *
 * ここは読むだけ。各ツールと同じ保存先を同じ読み方で読む(書き換えは各ツールで)。
 *   ログイン中 … Firestore(users/{uid}/mytasks・memos・mails、boards)
 *   未ログイン … このブラウザ(localStorage・yymail は IndexedDB)
 * メニューには出さない(各ツールの物件名の横の「物件ハブ」から入る)。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useTaskContext } from '@/components/providers/TaskProvider';
import { projectKey, useProjectRegistry, type RegProject } from '@/lib/projectRegistry';
import { isTaskOf, projectOf } from '@/lib/myTaskView';
import { memoBelongsTo } from '@/lib/memoTasks';
import { cloudStore, localStore, type LedgerState } from '@/components/content/Userpage/yymail/ledgerStore';
import { readGuestBoard } from '@/components/content/Userpage/teamTasks/guestBoard';
import { getUsersByUids, listBoardsForUser, listBoardTasks } from '@/lib/firebaseUserData';
import { loadCases, selectCase } from '@/lib/caseStudies';
import PageHead, { Stat } from '@/components/ui/PageHead';
import { SecHead } from '@/components/ui/Sheet';
import ProjectPicker from '@/components/ui/ProjectPicker';

// ---------------------------------------------------------------------------
// 各ツールの画面(左カラムの ?m= の URL)
// ---------------------------------------------------------------------------
const LINK = {
  tasks: '/?m=my-tasks',
  memo: '/?m=general-tools&t=memo',
  mail: '/?m=yymail',
  team: '/?m=team-tasks',
  photos: '/?m=general-tools&t=construction-photos',
  work: '/?m=general-tools&t=alarm',
  karte: '/karte/',
};

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const md = (s: string) => {
  const [, m, d] = s.split('-').map(Number);
  return m && d ? `${m}/${d}` : s;
};
const shortDay = (ms: number) => {
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? '' : `${d.getMonth() + 1}/${d.getDate()}`;
};

type HubMemo = { id: string; title: string; category: string; content: string; updatedAt: number };
type HubBoard = { id: string; name: string; projectName?: string | null; archived?: boolean; ownerUid?: string; memberUids?: string[] };
type HubBoardTask = { id: string; title: string; completed: boolean; dueDate?: string | null; assigneeUid?: string | null; boardId: string };

// ---------------------------------------------------------------------------
// 読み込み(読むだけ)
// ---------------------------------------------------------------------------

/** メモ。ログイン中は users/{uid}/memos、未ログインはこのブラウザ('yy-guest-memo') */
function useMemos(uid: string | null, authReady: boolean) {
  const [memos, setMemos] = useState<HubMemo[]>([]);
  useEffect(() => {
    if (!authReady) return;
    const norm = (id: string, m: any): HubMemo => ({
      id,
      title: m?.title || '',
      category: m?.category || '',
      content: m?.content || '',
      updatedAt: Number(m?.updatedAt) || 0,
    });
    if (!uid) {
      const read = () => {
        try {
          const v = JSON.parse(localStorage.getItem('yy-guest-memo') || '[]');
          setMemos(Array.isArray(v) ? v.filter((m) => m && m.id).map((m) => norm(String(m.id), m)) : []);
        } catch {
          setMemos([]);
        }
      };
      read();
      window.addEventListener('storage', read);
      return () => window.removeEventListener('storage', read);
    }
    return onSnapshot(
      collection(db, 'users', uid, 'memos'),
      (snap) => setMemos(snap.docs.map((d) => norm(d.id, d.data()))),
      () => setMemos([]),
    );
  }, [uid, authReady]);
  return memos;
}

/** yymail の台帳。yymail の画面と同じ保存先(クラウド / このブラウザの IndexedDB) */
function useLedger(uid: string | null, authReady: boolean) {
  const [ledger, setLedger] = useState<LedgerState>({ projects: [], mails: [], ready: false });
  useEffect(() => {
    if (!authReady) return;
    if (!uid && typeof indexedDB === 'undefined') {
      setLedger({ projects: [], mails: [], ready: true });
      return;
    }
    setLedger({ projects: [], mails: [], ready: false });
    try {
      const store = uid ? cloudStore(uid) : localStore();
      return store.subscribe(setLedger);
    } catch {
      setLedger({ projects: [], mails: [], ready: true, error: true });
    }
  }, [uid, authReady]);
  return ledger;
}

/** Teamタスクのボードの一覧(自分がオーナーか、メンバーのボード)。未ログインはこのブラウザの自分用ボード */
function useBoards(uid: string | null, authReady: boolean) {
  const [boards, setBoards] = useState<HubBoard[] | null>(null);
  useEffect(() => {
    if (!authReady) return;
    let alive = true;
    if (!uid) {
      const g = readGuestBoard();
      setBoards((g?.projects ?? []).map((p) => ({ id: p.id, name: p.name, ...(p as { projectName?: string; archived?: boolean }) })));
      return;
    }
    setBoards(null);
    listBoardsForUser(uid)
      .then((list) => alive && setBoards(list.map((b) => ({ ...(b as HubBoard), id: b.id! }))))
      .catch(() => alive && setBoards([]));
    return () => {
      alive = false;
    };
  }, [uid, authReady]);
  return boards;
}

/** 選んだ物件のボードのタスクと、担当の名前 */
function useBoardTasks(uid: string | null, boards: HubBoard[]) {
  const [tasks, setTasks] = useState<HubBoardTask[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const ids = boards.map((b) => b.id).join(',');
  useEffect(() => {
    let alive = true;
    if (!boards.length) {
      setTasks([]);
      return;
    }
    if (!uid) {
      const g = readGuestBoard();
      setTasks(boards.flatMap((b) => (g?.tasks[b.id] ?? []).map((t) => ({ ...t, boardId: b.id }))));
      return;
    }
    setTasks(null);
    (async () => {
      const all: HubBoardTask[] = [];
      for (const b of boards) {
        try {
          const list = await listBoardTasks(b.id);
          all.push(...list.map((t) => ({ id: t.id!, title: t.title, completed: !!t.completed, dueDate: t.dueDate ?? null, assigneeUid: t.assigneeUid ?? null, boardId: b.id })));
        } catch {
          /* 読めないボードは飛ばす */
        }
      }
      if (!alive) return;
      setTasks(all);
      const uids = [...new Set(all.map((t) => t.assigneeUid).filter(Boolean) as string[])];
      if (uids.length) {
        try {
          const us = await getUsersByUids(uids);
          if (alive) setNames(Object.fromEntries(us.map((u) => [u.uid, u.uid === uid ? '自分' : u.displayName || '名前未登録'])));
        } catch {
          /* 名前が引けなくても一覧は出す */
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [uid, ids]); // eslint-disable-line react-hooks/exhaustive-deps
  return { tasks, names };
}

// ---------------------------------------------------------------------------
// 画面
// ---------------------------------------------------------------------------

export default function ProjectHub() {
  const { currentUser, authReady } = useAuth();
  const uid = currentUser?.uid ?? null;
  const registry = useProjectRegistry();
  const { categories } = useTaskContext();
  const memos = useMemos(uid, authReady);
  const ledger = useLedger(uid, authReady);
  const allBoards = useBoards(uid, authReady);
  const today = ymd(new Date());

  // 選んでいる物件(URL の ?p= に載せる。再読み込み・共有しても同じ物件が開く)
  const [selId, setSelId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [newName, setNewName] = useState('');
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('p');
    if (p) setSelId(p);
  }, []);
  const choose = (id: string) => {
    setSelId(id);
    try {
      const u = new URL(window.location.href);
      u.searchParams.set('p', id);
      window.history.replaceState(null, '', u.toString());
    } catch {
      /* URL に載せられなくても画面は切り替える */
    }
  };
  const selected: RegProject | null =
    registry.projects.find((p) => p.id === selId) ?? (registry.ready && !selId ? registry.active[0] ?? null : null) ?? null;

  // 物件ごとの数(左の索引に出す)
  const openTasksOf = (name: string) => categories.flatMap((c) => c.tasks.filter((t) => !t.completed && isTaskOf(t.content, name)).map((t) => ({ task: t, sheet: c })));
  const counts = useMemo(() => {
    const out: Record<string, { open: number; over: number }> = {};
    for (const p of registry.projects) {
      const list = openTasksOf(p.name);
      out[p.id] = { open: list.length, over: list.filter((x) => x.task.dueDate && x.task.dueDate < today).length };
    }
    return out;
  }, [registry.projects, categories, today]); // eslint-disable-line react-hooks/exhaustive-deps

  // 選んだ物件の中身
  const key = selected ? projectKey(selected.name) : '';
  const myTasks = useMemo(
    () =>
      selected
        ? openTasksOf(selected.name).sort((a, b) => (a.task.dueDate || '9999').localeCompare(b.task.dueDate || '9999'))
        : [],
    [selected, categories], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const myMemos = useMemo(
    () => (selected ? memos.filter((m) => memoBelongsTo(m.content, m.category, selected.name)).sort((a, b) => b.updatedAt - a.updatedAt) : []),
    [selected, memos],
  );
  const mailProjectIds = useMemo(() => new Set(ledger.projects.filter((p) => projectKey(p.name) === key).map((p) => p.id)), [ledger.projects, key]);
  const myMails = useMemo(
    () => (key ? ledger.mails.filter((m) => m.projectId && mailProjectIds.has(m.projectId)).sort((a, b) => b.date.localeCompare(a.date)) : []),
    [ledger.mails, mailProjectIds, key],
  );
  const boards = useMemo(
    () => (allBoards ?? []).filter((b) => key && (projectKey(b.projectName || '') === key || projectKey(b.name) === key)),
    [allBoards, key],
  );
  const { tasks: boardTasks, names } = useBoardTasks(uid, boards);
  const openBoardTasks = (boardTasks ?? []).filter((t) => !t.completed).sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
  const drawings = myMails.reduce((n, m) => n + m.attachments.filter((a) => a.drawing).length, 0);

  // 物件カルテ(この端末の案件)。台帳に karteId があり、この端末のカルテにその案件があるときだけ開ける
  const [karteIds, setKarteIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      setKarteIds(new Set(loadCases().cases.map((c) => c.id)));
    } catch {
      setKarteIds(new Set());
    }
  }, []);
  const openKarte = () => {
    if (selected?.karteId) selectCase(selected.karteId);
    window.location.href = LINK.karte;
  };

  const overdueAll = myTasks.filter((x) => x.task.dueDate && x.task.dueDate < today).length + openBoardTasks.filter((t) => t.dueDate && t.dueDate < today).length;
  const dueTone = (d?: string | null) => (!d ? '' : d < today ? ' is-over' : d === today ? ' is-today' : '');
  const list = showDone ? registry.projects : registry.active;

  return (
    <div className="yy-hub">
      <PageHead
        no="—"
        en="PROJECT HUB"
        title="物件ハブ"
        desc="物件を選ぶと、宿題・メモ・メール・チームのタスクを 1 画面に集めます。書き換えは各ツールで。"
        right={
          <>
            <Stat n={registry.active.length} label="進行中" />
            {registry.projects.length - registry.active.length > 0 && <Stat n={registry.projects.length - registry.active.length} label="竣工・終了" />}
          </>
        }
      />

      <div className="yy-hub__body">
        {/* 左: 物件の索引 */}
        <aside className="yy-hub__index">
          <SecHead no="00" title="物件" right={`${list.length} 件`} />
          {!registry.ready ? (
            <p className="yy-hub__empty">読み込み中…</p>
          ) : list.length === 0 ? (
            <p className="yy-hub__note">
              まだ物件がありません。下で物件名を入れて登録するか、Myタスクの【物件名】・メモのフォルダ・yymail の物件から「台帳に登録」してください。
            </p>
          ) : (
            <ul className="yy-hub__list">
              {list.map((p) => {
                const c = counts[p.id];
                return (
                  <li key={p.id}>
                    <button type="button" className={`yy-hub__pick${selected?.id === p.id ? ' is-on' : ''}`} onClick={() => choose(p.id)} title={p.addr || p.name}>
                      <span className="yy-hub__pickname">{p.name}</span>
                      {p.status === 'done' && <span className="yy-hub__pickn">竣工</span>}
                      {c?.open ? <span className={`yy-hub__pickn${c.over ? ' is-over' : ''}`}>{c.over ? `超過${c.over} / ` : ''}{c.open}</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {registry.projects.length !== registry.active.length && (
            <button type="button" className="yy-hub__toggle" onClick={() => setShowDone((v) => !v)}>
              {showDone ? '進行中だけにする' : '竣工・終了の物件も出す'}
            </button>
          )}
          <div className="yy-hub__add">
            <span className="yy-label">add — 物件を登録</span>
            <ProjectPicker value={newName} onChange={setNewName} placeholder="物件名（例 A邸新築工事）" label="登録する物件" />
            <p className="yy-hub__note">登録した物件は、Myタスク・メモ・yymail・Teamタスクで同じ名前で選べます。</p>
          </div>
          {!uid && authReady && (
            <p className="yy-hub__note">このブラウザに保存した内容を集めています。ログインすると端末間で同じものが見られます。</p>
          )}
        </aside>

        {/* 右: 選んだ物件 */}
        <div className="min-w-0">
          {!selected ? (
            <p className="yy-hub__empty">{registry.ready ? '左から物件を選んでください。' : '読み込み中…'}</p>
          ) : (
            <>
              <section className="yy-hub__case" aria-label="物件">
                <span className="yy-label">case — 物件</span>
                <h2 className="yy-hub__casename">{selected.name}</h2>
                {selected.addr && <span className="yy-hub__casesub">{selected.addr}</span>}
                {selected.status === 'done' && <span className="yy-hub__casesub">竣工・終了</span>}
                <span className="yy-hub__caselinks">
                  {selected.karteId && karteIds.has(selected.karteId) ? (
                    <button type="button" onClick={openKarte}>物件カルテ</button>
                  ) : (
                    <a href={LINK.karte} className="is-sub" title="物件カルテで同じ名前の案件を作ると、ここから開けます">物件カルテで作る</a>
                  )}
                  <a href={LINK.photos} title="工事写真（写真帳）を開く">工事写真</a>
                  <a href={LINK.work} title="業務管理（作業時間・日報）を開く">業務管理</a>
                  <button
                    type="button"
                    className="is-sub"
                    onClick={() => void registry.setStatus(selected.id, selected.status === 'done' ? 'active' : 'done')}
                    title={selected.status === 'done' ? '進行中に戻すと、各ツールの物件の候補にまた出ます' : '竣工・終了にすると、各ツールの物件の候補に出なくなります（中身は消えません）'}
                  >
                    {selected.status === 'done' ? '進行中に戻す' : '竣工・終了にする'}
                  </button>
                </span>
                <span className="yy-hub__stats">
                  <span><b>{myTasks.length}</b>宿題</span>
                  <span><b>{myMemos.length}</b>メモ</span>
                  <span><b>{myMails.length}</b>メール</span>
                  <span><b>{boardTasks === null ? '…' : openBoardTasks.length}</b>チーム</span>
                  {overdueAll > 0 && <span className="is-over"><b>{overdueAll}</b>期限超過</span>}
                </span>
              </section>

              <div className="yy-hub__grid">
                {/* 01 Myタスク */}
                <section className="yy-hub__sec">
                  <SecHead no="01" title="Myタスク（未完了）" right={<a href={LINK.tasks}>Myタスクを開く</a>} />
                  {myTasks.length === 0 ? (
                    <p className="yy-hub__empty">未完了のタスクはありません。Myタスクで「追加する物件」に {selected.name} を選ぶと、頭に【{selected.name}】が付きます。</p>
                  ) : (
                    <ul className="yy-hub__rows">
                      {myTasks.map(({ task, sheet }) => (
                        <li key={sheet.id + task.id}>
                          <span className="yy-hub__main">{projectOf(task.content).rest}</span>
                          <span className="yy-hub__meta">{sheet.title}</span>
                          {task.dueDate && <span className={`yy-hub__date${dueTone(task.dueDate)}`}>{task.dueDate < today ? '超過 ' : ''}{md(task.dueDate)}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* 02 Teamタスク */}
                <section className="yy-hub__sec">
                  <SecHead no="02" title="Teamタスク（未完了）" right={<a href={LINK.team}>Teamタスクを開く</a>} />
                  {allBoards === null || boardTasks === null ? (
                    <p className="yy-hub__empty">読み込み中…</p>
                  ) : boards.length === 0 ? (
                    <p className="yy-hub__empty">この物件のボードはまだありません。Teamタスクでボードを作るとき、物件に {selected.name} を選ぶとここに出ます。</p>
                  ) : openBoardTasks.length === 0 ? (
                    <p className="yy-hub__empty">ボード「{boards.map((b) => b.name).join('」「')}」に未完了のタスクはありません。</p>
                  ) : (
                    <ul className="yy-hub__rows">
                      {openBoardTasks.map((t) => (
                        <li key={t.boardId + t.id}>
                          <span className="yy-hub__main">
                            {t.title}
                            {boards.length > 1 && <span className="yy-hub__sub">{boards.find((b) => b.id === t.boardId)?.name}</span>}
                          </span>
                          {t.assigneeUid && names[t.assigneeUid] && <span className="yy-hub__meta">{names[t.assigneeUid]}</span>}
                          {t.dueDate && <span className={`yy-hub__date${dueTone(t.dueDate)}`}>{t.dueDate < today ? '超過 ' : ''}{md(t.dueDate)}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {boards.some((b) => b.archived) && <p className="yy-hub__empty">竣工済みのボードのタスクも含みます。</p>}
                </section>

                {/* 03 メモ */}
                <section className="yy-hub__sec">
                  <SecHead no="03" title="メモ" right={<a href={LINK.memo}>メモを開く</a>} />
                  {myMemos.length === 0 ? (
                    <p className="yy-hub__empty">この物件のメモはありません。メモで「物件（入れるフォルダ）」に {selected.name} を選ぶと、そのフォルダに入ります。</p>
                  ) : (
                    <ul className="yy-hub__rows">
                      {myMemos.slice(0, 20).map((m) => (
                        <li key={m.id}>
                          <span className="yy-hub__main">{m.title || '無題'}</span>
                          {m.category && projectKey(m.category) !== key && <span className="yy-hub__meta">{m.category}</span>}
                          {m.updatedAt > 0 && <span className="yy-hub__date">{shortDay(m.updatedAt)}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {myMemos.length > 20 && <a className="yy-hub__more" href={LINK.memo}>ほか {myMemos.length - 20} 件はメモで</a>}
                </section>

                {/* 04 メール */}
                <section className="yy-hub__sec">
                  <SecHead no="04" title="yymail（物件のメール）" right={<a href={LINK.mail}>yymail を開く</a>} />
                  {!ledger.ready ? (
                    <p className="yy-hub__empty">読み込み中…</p>
                  ) : mailProjectIds.size === 0 ? (
                    <p className="yy-hub__empty">yymail にこの物件がありません。yymail の左の「物件の台帳から」で {selected.name} を足すと、件名・宛先で仕分けます。</p>
                  ) : myMails.length === 0 ? (
                    <p className="yy-hub__empty">この物件に仕分けたメールはまだありません。</p>
                  ) : (
                    <>
                      {drawings > 0 && <p className="yy-hub__group">添付の図面 {drawings} 枚</p>}
                      <ul className="yy-hub__rows">
                        {myMails.slice(0, 15).map((m) => (
                          <li key={m.id}>
                            <span className="yy-hub__main">
                              {m.subject || '（件名なし）'}
                              <span className="yy-hub__sub">{m.from.name || m.from.address}{m.attachments.length ? ` · 添付 ${m.attachments.length}` : ''}</span>
                            </span>
                            <span className="yy-hub__date">{shortDay(Date.parse(m.date))}</span>
                          </li>
                        ))}
                      </ul>
                      {myMails.length > 15 && <a className="yy-hub__more" href={LINK.mail}>ほか {myMails.length - 15} 件は yymail で</a>}
                    </>
                  )}
                </section>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
