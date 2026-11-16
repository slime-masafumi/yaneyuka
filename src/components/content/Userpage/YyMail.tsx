'use client';

/**
 * yymail — 物件メール台帳。
 *
 * 汎用のメーラーとして Gmail と戦うのではなく、建設業のメール特有の困りごとだけを取る:
 *   - 物件で束ねる（件名・宛先・本文のキーワードで自動仕分け）
 *   - 添付の図面を図番と版で積み上げ、前の版と並べて見る
 *   - 本文の「〜までにご送付ください」を Myタスクへ
 *   - 図面の送付状を作る
 * 送受信はしない。今使っているメールソフトから .eml / .msg を落とすと台帳に入る。
 * （転送用アドレスへの BCC で自動取り込みする形は、受信の仕組みを用意してから）
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ToolHeader from './ToolHeader';
import GuestNote from './general-tools/GuestNote';
import { useAuth } from '@/lib/AuthContext';
import { useTaskContext } from '@/components/providers/TaskProvider';
import { mailIdOf, matchProject, normalizeSubject, parseDrawingName, pickTodoLines } from '@/lib/mailLedger';
import { isMailFile, parseMailFile } from './yymail/parseMail';
import { cloudStore, localStore, migrateLocalToCloud, type LedgerState, type LedgerStore, type MailRecord, type Project } from './yymail/ledgerStore';
import { collectDrawings, CompareModal, revLabel, shortDate, Transmittal, type DrawingGroup, type DrawingVersion } from './yymail/DrawingViews';
import { FiCheckSquare, FiFileText, FiInbox, FiPaperclip, FiPlus, FiTrash2, FiUpload } from 'react-icons/fi';
import ProjectPicker from '@/components/ui/ProjectPicker';
import { projectKey, useProjectRegistry } from '@/lib/projectRegistry';
import { localOnlyEntries } from '@/lib/mailLedger';

/** 「このブラウザに N 件あります」を「今はしない」で閉じたメールの id（同じものを毎回出さない） */
const offerDismissKey = (uid: string) => `yymail:localOfferDismissed:${uid}`;
const readDismissed = (uid: string): Set<string> => {
  try {
    const v = JSON.parse(localStorage.getItem(offerDismissKey(uid)) || '[]');
    return new Set(Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
};

const ALL = '__all__';
const UNSORTED = '__unsorted__';
/** Storage のルール（userUploads は 1ファイル 100MB まで）に合わせる */
const MAX_ATTACHMENT = 100 * 1024 * 1024;

const fmtSize = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`);
const who = (a: { name: string; address: string }) => a.name || a.address;

export default function YyMail() {
  const { isLoggedIn, currentUser } = useAuth();
  const uid = isLoggedIn ? currentUser?.uid : undefined;
  const store = useMemo<LedgerStore | null>(() => (typeof window === 'undefined' ? null : uid ? cloudStore(uid) : localStore()), [uid]);
  // kind: どの保存先から来た中身か（切り替わった直後の 1 回の描画では前の保存先の中身が残るため）
  const [state, setState] = useState<LedgerState & { kind?: LedgerStore['kind'] }>({ projects: [], mails: [], ready: false });
  useEffect(() => {
    if (!store) return;
    // 保存先が変わったら（ログイン・ログアウト）前の中身を引きずらない。
    // 引きずると、下の移行の判定が前の保存先の中身で行われる
    setState({ projects: [], mails: [], ready: false });
    return store.subscribe((s) => setState({ ...s, kind: store.kind }));
  }, [store]);

  // ログインした端末で、クラウドの台帳が空なら、このブラウザで取り込んだ台帳を上げる（移行）
  const [migrateMsg, setMigrateMsg] = useState('');
  const migratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!uid || !store || store.kind !== 'cloud' || state.kind !== 'cloud' || !state.ready || state.error) return;
    if (migratedFor.current === uid) return;
    migratedFor.current = uid;
    if (state.mails.length || state.projects.length) return;
    setMigrateMsg('このブラウザで取り込んだ台帳をアカウントへ移しています…');
    migrating.current = uid;
    migrateLocalToCloud(uid, store)
      .then((n) => setMigrateMsg(n ? `このブラウザで取り込んだメール ${n} 件をアカウントへ移しました。ほかの端末でも見られます。` : ''))
      .catch((e) => {
        console.error('[yymail] 移行に失敗', e);
        setMigrateMsg('このブラウザの台帳をアカウントへ移せませんでした。ログアウトすると手元の台帳はそのまま見られます。');
      });
  }, [uid, store, state.kind, state.ready, state.error, state.mails.length, state.projects.length]);

  /**
   * クラウドにもう台帳があるのに、このブラウザ（ログイン前の IndexedDB）にだけあるメール。
   * ★以前は上の移行が「クラウドが空のときだけ」で、1 件でもあると黙って置き去りにしていた。
   * Myカレンダー・Myタスクと同じく「このブラウザに N 件あります → 追加」を出す（押されたときだけ足す）。
   * 手元の IndexedDB は消さない（ログアウトすればまた見える）。
   */
  const migrating = useRef<string | null>(null);
  const offerChecked = useRef<string | null>(null);
  const [localOffer, setLocalOffer] = useState<{ mails: MailRecord[]; projects: Project[]; allProjects: Project[]; projectMap: Map<string, string> } | null>(null);
  const [offerBusy, setOfferBusy] = useState(false);
  useEffect(() => {
    if (!uid || !store || store.kind !== 'cloud' || state.kind !== 'cloud' || !state.ready || state.error) return;
    if (!state.mails.length && !state.projects.length) return; // 空なら上の移行が受け持つ
    if (offerChecked.current === uid || migrating.current === uid) return;
    offerChecked.current = uid;
    if (typeof indexedDB === 'undefined') return;
    const cloud = { projects: state.projects, mails: state.mails };
    let off: (() => void) | null = null;
    let done = false;
    try {
      const local = localStore();
      off = local.subscribe((s) => {
        if (done) return;
        done = true;
        const r = localOnlyEntries(s, cloud, readDismissed(uid));
        if (r.mails.length || r.projects.length) setLocalOffer({ ...r, allProjects: s.projects });
        setTimeout(() => off?.(), 0);
      });
    } catch {
      /* このブラウザに台帳が無い・開けない */
    }
    return () => { if (done) off?.(); };
  }, [uid, store, state.kind, state.ready, state.error, state.mails, state.projects]);

  const addLocalNow = async () => {
    if (!uid || !store || store.kind !== 'cloud' || !localOffer) return;
    setOfferBusy(true);
    const local = localStore();
    const cloudIds = new Set(state.projects.map((p) => p.id));
    // 物件: クラウドに無いもの（同じ名前も無いもの）を足す。足すメールが指している物件も足す
    const used = new Set(localOffer.mails.map((m) => (m.projectId ? localOffer.projectMap.get(m.projectId) : null)).filter(Boolean) as string[]);
    const toPut = localOffer.allProjects.filter((p) => localOffer.projectMap.get(p.id) === p.id && !cloudIds.has(p.id) && (used.has(p.id) || localOffer.projects.some((x) => x.id === p.id)));
    const cloudProjects: Project[] = [...state.projects];
    for (const p of toPut) {
      try {
        await store.putProject(p);
        cloudProjects.push(p);
      } catch (e) {
        console.error('[yymail] 物件を足せませんでした', e);
      }
    }
    let ok = 0;
    const failed: string[] = [];
    for (const m of localOffer.mails) {
      try {
        const files: { path: string; data: Uint8Array; mime: string }[] = [];
        const attachments: MailRecord['attachments'] = [];
        for (const [i, a] of m.attachments.entries()) {
          const path = `userUploads/${uid}/mail-${m.id}-${i}`;
          try {
            const blob = await (await fetch(await local.fileUrl(a.path))).blob();
            files.push({ path, data: new Uint8Array(await blob.arrayBuffer()), mime: a.mime || blob.type });
          } catch {
            /* このブラウザに添付の中身が無い（台帳の行だけ足す） */
          }
          attachments.push({ ...a, path });
        }
        const mapped = m.projectId ? localOffer.projectMap.get(m.projectId) ?? null : null;
        const pid =
          mapped && cloudProjects.some((p) => p.id === mapped)
            ? mapped
            : m.manualProject
              ? null
              : matchProject({ subject: m.subject, text: m.text, from: `${m.from.name} ${m.from.address}`, to: m.to.map((x) => x.address), cc: m.cc.map((x) => x.address) }, cloudProjects);
        await store.putMail({ ...m, projectId: pid, attachments }, files);
        ok++;
      } catch (e) {
        console.error('[yymail] このブラウザのメールを足せませんでした', e);
        failed.push(m.subject || m.id);
      }
    }
    setOfferBusy(false);
    setLocalOffer(null);
    setMigrateMsg(
      `このブラウザのメール ${ok} 件をアカウントに追加しました。` +
        (failed.length ? ` 追加できなかったもの ${failed.length} 件（通信を確かめて、開き直すともう一度出ます）。` : ''),
    );
    if (failed.length) offerChecked.current = null;
  };
  const dismissOffer = () => {
    if (uid && localOffer) {
      const ids = readDismissed(uid);
      localOffer.mails.forEach((m) => ids.add(m.id));
      localOffer.projects.forEach((p) => ids.add(p.id));
      try { localStorage.setItem(offerDismissKey(uid), JSON.stringify([...ids])); } catch { /* 次に開いたらまた出るだけ */ }
    }
    setLocalOffer(null);
  };

  // 物件の台帳（src/lib/projectRegistry.ts）。yymail の物件は台帳から選び、新しく作った物件は台帳にも入れる
  const registry = useProjectRegistry();

  const [projectId, setProjectId] = useState<string>(ALL);
  const [tab, setTab] = useState<'mail' | 'drawing'>('mail');
  const [mailId, setMailId] = useState<string | null>(null);
  const [drawingNo, setDrawingNo] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState<Project | 'new' | null>(null);
  const [compare, setCompare] = useState<{ number: string; older: DrawingVersion; newer: DrawingVersion } | null>(null);
  const [transmittal, setTransmittal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [headNotice, setHeadNotice] = useState('');

  const projects = useMemo(() => [...state.projects].sort((a, b) => a.createdAt - b.createdAt), [state.projects]);
  const inProject = useMemo(
    () =>
      state.mails
        .filter((m) => (projectId === ALL ? true : projectId === UNSORTED ? !m.projectId : m.projectId === projectId))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.mails, projectId]
  );
  const visibleMails = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return inProject;
    return inProject.filter((m) =>
      [m.subject, m.text, who(m.from), ...m.attachments.map((a) => a.name)].join(' ').toLowerCase().includes(q)
    );
  }, [inProject, query]);
  const drawings = useMemo(() => collectDrawings(inProject), [inProject]);
  const mail = state.mails.find((m) => m.id === mailId) ?? null;
  const drawing = drawings.find((d) => d.number === drawingNo) ?? null;
  const count = (id: string) =>
    state.mails.filter((m) => (id === ALL ? true : id === UNSORTED ? !m.projectId : m.projectId === id)).length;

  // ---- 取り込み ----------------------------------------------------------

  const importFiles = async (files: File[]) => {
    if (!store) return;
    const targets = files.filter(isMailFile);
    if (!targets.length) {
      setImportMsg('.eml か .msg のファイルを選んでください');
      return;
    }
    setImporting(true);
    let added = 0;
    let dup = 0;
    const failed: string[] = [];
    const skipped: string[] = [];
    const known = new Set(state.mails.map((m) => m.id));
    for (const file of targets) {
      try {
        const p = await parseMailFile(file);
        const id = await mailIdOf(p.messageId, `${p.subject}|${p.date}|${p.from.address}`);
        if (known.has(id)) {
          dup++;
          continue;
        }
        const files: { path: string; data: Uint8Array; mime: string }[] = [];
        const attachments = p.attachments.flatMap((a, i) => {
          if (a.data.byteLength > MAX_ATTACHMENT) {
            skipped.push(a.filename);
            return [];
          }
          const path = uid ? `userUploads/${uid}/mail-${id}-${i}` : `mail-${id}-${i}`;
          files.push({ path, data: a.data, mime: a.mimeType });
          return [{ name: a.filename, mime: a.mimeType, size: a.data.byteLength, path, drawing: parseDrawingName(a.filename) }];
        });
        const addrs = (xs: { address: string }[]) => xs.map((x) => x.address);
        const record: MailRecord = {
          id,
          messageId: p.messageId,
          subject: p.subject,
          subjectKey: normalizeSubject(p.subject),
          from: p.from,
          to: p.to,
          cc: p.cc,
          date: p.date,
          text: p.text,
          projectId: matchProject(
            { subject: p.subject, text: p.text, from: `${p.from.name} ${p.from.address}`, to: addrs(p.to), cc: addrs(p.cc) },
            projects
          ),
          attachments,
          importedAt: Date.now(),
        };
        await store.putMail(record, files);
        known.add(id);
        added++;
      } catch (e) {
        console.error(e);
        failed.push(file.name);
      }
    }
    setImporting(false);
    setImportMsg(
      [
        `${added}件を取り込みました`,
        dup ? `（取り込み済み ${dup}件は飛ばしました）` : '',
        failed.length ? ` 読めなかったファイル: ${failed.join('、')}` : '',
        skipped.length ? ` 100MB を超える添付は保存していません: ${skipped.join('、')}` : '',
      ].join('')
    );
  };

  // ---- 物件 --------------------------------------------------------------

  /** 物件を足したり言葉を変えたら、手で付け替えていないメールを振り分け直す */
  const resort = async (nextProjects: Project[]) => {
    if (!store) return;
    for (const m of state.mails) {
      if (m.manualProject) continue;
      const pid = matchProject(
        { subject: m.subject, text: m.text, from: `${m.from.name} ${m.from.address}`, to: m.to.map((a) => a.address), cc: m.cc.map((a) => a.address) },
        nextProjects
      );
      if (pid !== m.projectId) await store.updateMail(m.id, { projectId: pid });
    }
  };

  const saveProject = async (p: Project) => {
    if (!store) return;
    // 物件の台帳の書き方にそろえ、台帳に無ければ登録する（ほかのツール・物件ハブでも同じ物件になる）
    const known = registry.find(p.name);
    const name = known?.name ?? p.name;
    const next: Project = name === p.name ? p : { ...p, name, keywords: p.keywords.includes(name) ? p.keywords : [name, ...p.keywords] };
    if (!known) void registry.add(name);
    await store.putProject(next);
    await resort([...projects.filter((x) => x.id !== next.id), next]);
    setEditing(null);
    setProjectId(next.id);
  };

  /** 台帳の物件を yymail の物件にする（仕分けの言葉は物件名から始める） */
  const addFromRegistry = async (name: string) => {
    const hit = projects.find((p) => projectKey(p.name) === projectKey(name));
    if (hit) return hit.id;
    const p: Project = { id: `p-${Date.now()}`, name, keywords: [name], createdAt: Date.now() };
    await saveProject(p);
    return p.id;
  };
  // 台帳にあって、まだ yymail の物件になっていないもの
  const registryOnly = registry.active.filter((rp) => !projects.some((p) => projectKey(p.name) === projectKey(rp.name)));

  const deleteProject = async (p: Project) => {
    if (!store || !confirm(`物件「${p.name}」を削除しますか？\nメールは消さず、未仕分けに戻します。`)) return;
    await store.deleteProject(p.id);
    for (const m of state.mails.filter((x) => x.projectId === p.id)) await store.updateMail(m.id, { projectId: null, manualProject: false });
    setProjectId(ALL);
  };

  const openFile = async (path: string) => {
    if (!store) return;
    try {
      window.open(await store.fileUrl(path), '_blank', 'noopener');
    } catch (e) {
      setHeadNotice(e instanceof Error ? `添付を開けませんでした（${e.message}）` : '添付を開けませんでした');
    }
  };

  /** この添付の前の版（同じ図番で版が一つ前のもの） */
  const previousOf = (m: MailRecord, attIndex: number): { group: DrawingGroup; older: DrawingVersion; newer: DrawingVersion } | null => {
    const att = m.attachments[attIndex];
    if (!att.drawing) return null;
    const group = collectDrawings(state.mails.filter((x) => x.projectId === m.projectId)).find((g) => g.number === att.drawing!.number);
    if (!group) return null;
    const idx = group.versions.findIndex((v) => v.att.path === att.path);
    if (idx <= 0) return null;
    return { group, older: group.versions[idx - 1], newer: group.versions[idx] };
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void importFiles(Array.from(e.dataTransfer.files));
  };

  const projectName = (id: string | null) => projects.find((p) => p.id === id)?.name;

  return (
    <div className="pt-0 pb-4">
      <div
        className="w-full md:h-[calc(100vh-100px)] flex flex-col [&>*:not(:first-child)]:mx-4"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDragging(false);
        }}
        onDrop={onDrop}
      >
        <ToolHeader
          no="10"
          code="MAIL"
          title="yymail"
          description="物件メール台帳。メールのファイル（.eml / .msg）を落とすと物件ごとに仕分け、添付の図面を図番と版で積み上げる。送信はいつものメールソフトのまま。"
          aside={
            <span className="yy-mono text-[10px] tracking-[0.08em] text-[#8c887f]" title={store?.kind === 'cloud' ? '端末間で同期' : 'このブラウザに保存（ログインで同期）'}>
              {store?.kind === 'cloud' ? 'SYNCED' : 'LOCAL'}
            </span>
          }
          features={[
            {
              label: 'メール取り込み（.eml / .msg）',
              hint: 'Outlook・Gmail・Apple メールから落としたファイルを取り込む。ドラッグでも可',
              onClick: () => fileInput.current?.click(),
            },
            {
              label: '物件で自動仕分け',
              hint: '物件名と仕分けの言葉（相手のドメイン・工事番号など）で、件名・宛先・本文から振り分ける',
              onClick: () => setEditing('new'),
            },
            {
              label: '図面の版管理・前版比較',
              hint: '添付の名前から図番と版を読み、版の履歴と前の版を並べて見る',
              active: tab === 'drawing',
              onClick: () => { setTab('drawing'); setHeadNotice(''); },
            },
            {
              label: '送付状',
              hint: '図面の一覧から送付状を作る',
              active: transmittal,
              onClick: () => {
                if (!drawings.length) { setTab('drawing'); setHeadNotice('図番（A-101 など）が付いた添付のあるメールを取り込むと、送付状を作れます。'); return; }
                setHeadNotice('');
                setTransmittal(true);
              },
            },
            {
              label: '依頼文 → Myタスク',
              hint: '本文の「〜までにご送付ください」などを拾って Myタスクに入れる',
              onClick: () => {
                setTab('mail');
                if (!mail) { setHeadNotice('メールを開くと、本文の「〜までに」を拾ってタスクの候補に出します。'); return; }
                setHeadNotice('');
                document.getElementById('yymail-task')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              },
            },
            {
              label: '横断検索',
              hint: '件名・本文・差出人・添付名で探す',
              active: tab === 'mail' && !!query,
              onClick: () => { setTab('mail'); setHeadNotice(''); setTimeout(() => searchRef.current?.focus(), 0); },
            },
          ]}
        />
        {headNotice && <p className="mt-2 text-[11px] text-gray-600" role="status">{headNotice}</p>}
        {store?.kind === 'local' && <GuestNote className="mt-2 !mb-0">このブラウザに保存しています（添付も端末の中だけ）。ログインすると端末間で同期します。</GuestNote>}
        {migrateMsg && <p className="mt-2 text-[11px] text-gray-700" role="status">{migrateMsg}</p>}
        {localOffer && (
          <p className="mt-2 text-[11px] text-gray-600 border-l border-[#52AA96] pl-2" role="status">
            このブラウザに、ログイン前に取り込んだ{localOffer.mails.length ? `メールが ${localOffer.mails.length} 件` : ''}
            {localOffer.mails.length && localOffer.projects.length ? '・' : ''}
            {localOffer.projects.length ? `物件が ${localOffer.projects.length} 件` : ''}あります（アカウントの台帳にはまだ無いもの）。{' '}
            <button type="button" disabled={offerBusy} className="underline underline-offset-2 font-bold text-gray-900 disabled:opacity-50" onClick={() => void addLocalNow()}>
              {offerBusy ? '追加しています…' : 'アカウントに追加'}
            </button>
            {' / '}
            <button type="button" disabled={offerBusy} className="underline underline-offset-2" onClick={dismissOffer}>今はしない</button>
          </p>
        )}
        {state.error && <p className="mt-2 text-[11px] text-red-600" role="alert">台帳を読み込めませんでした。通信状態を確かめて、開き直してください。</p>}

        <div className={`mt-2 bg-white border overflow-hidden flex flex-col md:flex-row md:flex-1 md:min-h-0 ${dragging ? 'border-[#52AA96] outline outline-1 outline-[#52AA96]' : 'border-[#3b3b3b]'}`}>
          {/* 左：取り込みと物件 */}
          <div className="w-full md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-[#3b3b3b] flex flex-col min-h-0 max-h-[50vh] md:max-h-none">
            <div className="p-2 border-b bg-gray-50 space-y-1">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={importing}
                className="yy-btn yy-btn--primary w-full flex items-center justify-center gap-1"
              >
                <FiUpload /> {importing ? '取り込み中…' : 'メールを取り込む'}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".eml,.msg,message/rfc822"
                multiple
                className="hidden"
                onChange={(e) => {
                  void importFiles(Array.from(e.target.files ?? []));
                  e.target.value = '';
                }}
              />
              <p className="text-[10px] text-gray-500">ここへドラッグしても取り込めます</p>
              <button type="button" className="text-[10px] underline text-gray-500" onClick={() => setShowHelp((v) => !v)}>
                メールのファイルの出し方
              </button>
              {showHelp && (
                <ul className="text-[10px] text-gray-600 space-y-0.5 list-disc pl-4">
                  <li>Outlook: メールをデスクトップへドラッグ（.msg）</li>
                  <li>Gmail: メールの︙ →「メッセージをダウンロード」（.eml）</li>
                  <li>Apple メール / Thunderbird: メールをデスクトップへドラッグ（.eml）</li>
                </ul>
              )}
              {importMsg && <p className="text-[10px] text-gray-700">{importMsg}</p>}
            </div>

            <div className="flex-1 overflow-y-auto p-1 text-[12px]">
              {[
                { id: ALL, name: 'すべて' },
                ...projects,
                { id: UNSORTED, name: '未仕分け' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setProjectId(p.id);
                    setMailId(null);
                    setDrawingNo(null);
                  }}
                  className={`w-full flex justify-between px-2 py-1.5 text-left ${projectId === p.id ? 'bg-gray-200 font-bold' : 'hover:bg-gray-100'}`}
                >
                  <span className="truncate">{p.name}</span>
                  <span className="yy-mono text-[10px] text-gray-500">{count(p.id)}</span>
                </button>
              ))}
              <button type="button" onClick={() => setEditing('new')} className="w-full px-2 py-1.5 text-left text-gray-600 hover:bg-gray-100 flex items-center gap-1">
                <FiPlus /> 物件を追加
              </button>
              {/* 物件の台帳（ほかのツールと共通）にあって、まだ yymail の物件になっていないもの */}
              {registryOnly.length > 0 && (
                <div className="mt-1 pt-1 border-t border-gray-200">
                  <div className="px-2 py-0.5 text-[10px] text-gray-500">物件の台帳から</div>
                  {registryOnly.map((rp) => (
                    <button
                      key={rp.id}
                      type="button"
                      onClick={() => void addFromRegistry(rp.name)}
                      className="w-full px-2 py-1 text-left text-gray-600 hover:bg-gray-100 flex items-center gap-1 text-[11px]"
                      title="yymail の物件にする（物件名で仕分け。言葉はあとで足せます）"
                    >
                      <FiPlus className="shrink-0 text-gray-400" /> <span className="truncate">{rp.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {(() => {
              const p = projects.find((x) => x.id === projectId);
              if (!p) return null;
              return (
                <div className="p-2 border-t text-[11px] space-y-1">
                  <div className="text-gray-500">仕分けの言葉</div>
                  <div className="text-gray-800 break-words">{p.keywords.join('、') || '（なし）'}</div>
                  <div className="flex gap-2 flex-wrap">
                    <button type="button" className="underline" onClick={() => setEditing(p)}>変更</button>
                    <button type="button" className="underline text-red-600" onClick={() => void deleteProject(p)}>削除</button>
                    {registry.ready && !registry.find(p.name) && (
                      <button type="button" className="underline text-[#2f7f6d]" onClick={() => void registry.add(p.name)} title="物件の台帳に登録すると、Myタスク・メモ・Teamタスク・物件ハブでも同じ物件として扱えます">
                        台帳に登録
                      </button>
                    )}
                    {registry.find(p.name) && (
                      <a className="underline text-gray-600" href={`/bukken/?p=${encodeURIComponent(registry.find(p.name)!.id)}`}>物件ハブ</a>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 中：メールと図面の一覧 */}
          <div className="w-full md:w-[340px] shrink-0 border-b md:border-b-0 md:border-r border-[#3b3b3b] flex flex-col min-h-0 max-h-[60vh] md:max-h-none">
            <div className="flex border-b text-[12px]">
              {(['mail', 'drawing'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 flex items-center justify-center gap-1 border-b ${tab === t ? 'border-[#52AA96] text-gray-900 font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                >
                  {t === 'mail' ? <><FiInbox /> メール <span className="yy-mono text-[10px] font-normal">{inProject.length}</span></> : <><FiFileText /> 図面 <span className="yy-mono text-[10px] font-normal">{drawings.length}</span></>}
                </button>
              ))}
            </div>

            {tab === 'mail' ? (
              <>
                <div className="p-2 border-b">
                  <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="件名・本文・差出人・添付名で探す" className="w-full px-2 py-1 text-[11px]" />
                </div>
                <div className="flex-1 overflow-y-auto divide-y">
                  {state.ready && visibleMails.length === 0 && (
                    <p className="p-3 text-[11px] text-gray-500">
                      {state.mails.length === 0 ? 'メールのファイルを取り込むと、ここに並びます。' : '該当するメールがありません。'}
                    </p>
                  )}
                  {visibleMails.map((m) => {
                    const thread = state.mails.filter((x) => x.subjectKey === m.subjectKey).length;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMailId(m.id)}
                        className={`w-full text-left px-2 py-1.5 ${mailId === m.id ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                      >
                        <div className="flex justify-between text-[10px] text-gray-500">
                          <span className="truncate">{who(m.from)}</span>
                          <span className="yy-mono shrink-0 ml-2">{shortDate(m.date)}</span>
                        </div>
                        <div className="text-[12px] text-gray-800 truncate">
                          {m.subject || '（件名なし）'}
                          {thread > 1 && <span className="ml-1 text-[10px] text-gray-500">({thread})</span>}
                        </div>
                        <div className="flex gap-2 text-[10px] text-gray-500">
                          {projectId === ALL && <span>{projectName(m.projectId) ?? '未仕分け'}</span>}
                          {m.attachments.length > 0 && (
                            <span className="flex items-center gap-0.5">
                              <FiPaperclip />
                              {m.attachments.length}
                              {m.attachments.some((a) => a.drawing) && '・図面'}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="p-2 border-b flex justify-between items-center">
                  <span className="text-[10px] text-gray-500">添付の名前から図番と版を読んでいます</span>
                  <button
                    type="button"
                    disabled={!drawings.length}
                    onClick={() => setTransmittal(true)}
                    className="px-2 py-1 text-[11px] border border-[#3b3b3b] bg-white disabled:opacity-40"
                  >
                    送付状を作る
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto divide-y">
                  {drawings.length === 0 && (
                    <p className="p-3 text-[11px] text-gray-500">
                      図番（A-101 など）が付いた添付があると、ここに図面ごとの版が並びます。
                    </p>
                  )}
                  {drawings.map((g) => {
                    const latest = g.versions[g.versions.length - 1];
                    return (
                      <button
                        key={g.number}
                        type="button"
                        onClick={() => setDrawingNo(g.number)}
                        className={`w-full text-left px-2 py-1.5 ${drawingNo === g.number ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                      >
                        <div className="flex justify-between text-[12px]">
                          <span className="font-bold">{g.number}</span>
                          <span>{revLabel(latest.att.drawing!.rev)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500">
                          <span className="truncate">{g.title}</span>
                          <span className="shrink-0 ml-2">
                            {g.versions.length}版 / {shortDate(latest.mail.date)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* 右：中身 */}
          <div className="flex-1 min-w-0 overflow-y-auto min-h-[160px]">
            {tab === 'mail' && mail && (
              <MailDetail
                key={mail.id}
                mail={mail}
                projects={projects}
                registryOnly={registryOnly.map((rp) => rp.name)}
                thread={state.mails.filter((x) => x.subjectKey === mail.subjectKey && x.id !== mail.id).sort((a, b) => a.date.localeCompare(b.date))}
                onSelect={setMailId}
                onMove={async (pid) => {
                  // 「台帳から」を選んだら、その物件を yymail の物件にしてから付け替える
                  const target = pid && pid.startsWith('reg:') ? await addFromRegistry(pid.slice(4)) : pid;
                  await store?.updateMail(mail.id, { projectId: target, manualProject: true });
                }}
                onDelete={async () => {
                  if (!store || !confirm('このメールを台帳から削除しますか？（添付も消えます）')) return;
                  await store.deleteMail(mail);
                  setMailId(null);
                }}
                onOpen={(path) => void openFile(path)}
                previousOf={(i) => previousOf(mail, i)}
                onCompare={(c) => setCompare(c)}
              />
            )}
            {tab === 'drawing' && drawing && (
              <div className="p-4 space-y-3">
                <h3 className="text-[12px] font-bold">
                  <span className="yy-mono">{drawing.number}</span> <span className="font-normal">{drawing.title}</span>
                </h3>
                <table className="w-full text-[12px] border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-2 py-1">版</th>
                      <th className="text-left px-2 py-1">受領</th>
                      <th className="text-left px-2 py-1">差出人・件名</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {[...drawing.versions].reverse().map((v, i, arr) => (
                      <tr key={v.att.path} className="border-t align-top">
                        <td className="px-2 py-1 whitespace-nowrap font-bold">
                          {revLabel(v.att.drawing!.rev)}
                          {i === 0 && <span className="yy-mono ml-1 text-[10px] font-normal text-[#52AA96] tracking-[0.08em]">LATEST</span>}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">{shortDate(v.mail.date)}</td>
                        <td className="px-2 py-1">
                          <div>{who(v.mail.from)}</div>
                          <button type="button" className="text-[11px] underline text-gray-600 text-left" onClick={() => { setTab('mail'); setMailId(v.mail.id); }}>
                            {v.mail.subject}
                          </button>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-right space-x-2">
                          <button type="button" className="underline" onClick={() => void openFile(v.att.path)}>開く</button>
                          {i < arr.length - 1 && (
                            <button type="button" className="underline" onClick={() => setCompare({ number: drawing.number, older: arr[i + 1], newer: v })}>
                              前版と並べる
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {((tab === 'mail' && !mail) || (tab === 'drawing' && !drawing)) && (
              <div className="p-4 text-[11px] text-gray-500">
                {tab === 'mail' ? '一覧からメールを選んでください' : '一覧から図面を選ぶと、版の履歴が出ます'}
              </div>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <ProjectEditor
          project={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSave={(p) => void saveProject(p)}
        />
      )}
      {compare && store && (
        <CompareModal number={compare.number} older={compare.older} newer={compare.newer} fileUrl={store.fileUrl} onClose={() => setCompare(null)} />
      )}
      {transmittal && (
        <Transmittal
          projectName={projectName(projectId) ?? ''}
          groups={drawings}
          onClose={() => setTransmittal(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// メールの中身
// ---------------------------------------------------------------------------

function MailDetail({
  mail,
  projects,
  registryOnly = [],
  thread,
  onSelect,
  onMove,
  onDelete,
  onOpen,
  previousOf,
  onCompare,
}: {
  mail: MailRecord;
  projects: Project[];
  /** 台帳にあって yymail の物件にまだなっていない物件名（選ぶと物件を作って付け替える） */
  registryOnly?: string[];
  thread: MailRecord[];
  onSelect: (id: string) => void;
  onMove: (projectId: string | null) => void | Promise<void>;
  onDelete: () => void;
  onOpen: (path: string) => void;
  previousOf: (i: number) => { older: DrawingVersion; newer: DrawingVersion } | null;
  onCompare: (c: { number: string; older: DrawingVersion; newer: DrawingVersion }) => void;
}) {
  const { categories, addTask } = useTaskContext();
  const todos = useMemo(() => pickTodoLines(mail.text), [mail.text]);
  const projectName = projects.find((p) => p.id === mail.projectId)?.name;
  const [taskText, setTaskText] = useState((projectName ? `【${projectName}】` : '') + (todos[0] ?? mail.subjectKey));
  const [taskDue, setTaskDue] = useState('');
  const [taskCat, setTaskCat] = useState(categories[0]?.id ?? '1');
  const [taskDone, setTaskDone] = useState('');
  const line = (label: string, list: { name: string; address: string }[]) =>
    list.length ? (
      <div>
        <span className="text-gray-500 mr-1">{label}</span>
        {list.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(', ')}
      </div>
    ) : null;

  return (
    <div className="p-4 space-y-3 text-[12px]">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[12px] font-bold break-words">{mail.subject || '（件名なし）'}</h3>
        <button type="button" onClick={onDelete} title="台帳から削除" className="p-1 text-red-600 shrink-0">
          <FiTrash2 />
        </button>
      </div>
      <div className="text-[11px] space-y-0.5 text-gray-800">
        {line('差出人', [mail.from])}
        {line('宛先', mail.to)}
        {line('CC', mail.cc)}
        <div>
          <span className="text-gray-500 mr-1">日時</span>
          {new Date(mail.date).toLocaleString('ja-JP')}
        </div>
      </div>
      <label className="flex items-center gap-2 text-[11px]">
        <span className="text-gray-500">物件</span>
        <select value={mail.projectId ?? ''} onChange={(e) => void onMove(e.target.value || null)} className="px-2 py-1 text-[11px]">
          <option value="">未仕分け</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
          {registryOnly.length > 0 && (
            <optgroup label="物件の台帳から">
              {registryOnly.map((n) => (
                <option key={`reg:${n}`} value={`reg:${n}`}>{n}</option>
              ))}
            </optgroup>
          )}
        </select>
        {mail.manualProject && <span className="text-[10px] text-gray-400">手で付け替え済み</span>}
      </label>

      {mail.attachments.length > 0 && (
        <div className="border">
          <div className="px-2 py-1 bg-gray-50 border-b text-[11px] font-bold">添付 <span className="yy-mono font-normal text-gray-500">{mail.attachments.length}</span></div>
          <ul className="divide-y">
            {mail.attachments.map((a, i) => {
              const prev = previousOf(i);
              return (
                <li key={a.path} className="px-2 py-1 flex items-center gap-2">
                  <FiPaperclip className="shrink-0 text-gray-400" />
                  <button type="button" className="underline text-left truncate flex-1" onClick={() => onOpen(a.path)} title={a.name}>
                    {a.name}
                  </button>
                  {a.drawing && (
                    <span className="text-[10px] px-1 border border-gray-400 shrink-0">
                      {a.drawing.number} {revLabel(a.drawing.rev)}
                    </span>
                  )}
                  {prev && (
                    <button type="button" className="text-[10px] underline shrink-0" onClick={() => onCompare({ number: a.drawing!.number, ...prev })}>
                      {revLabel(prev.older.att.drawing!.rev)}と並べる
                    </button>
                  )}
                  <span className="text-[10px] text-gray-500 shrink-0">{fmtSize(a.size)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div id="yymail-task" className="border bg-gray-50 p-2 space-y-1 scroll-mt-3">
        <div className="text-[11px] font-bold flex items-center gap-1">
          <FiCheckSquare className="text-gray-500" /> Myタスクにする
        </div>
        {todos.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {todos.map((t) => (
              <button key={t} type="button" onClick={() => setTaskText((projectName ? `【${projectName}】` : '') + t)} className="text-[10px] px-1 border bg-white text-left max-w-full truncate" title={t}>
                {t}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          <input value={taskText} onChange={(e) => setTaskText(e.target.value)} className="flex-1 min-w-[200px] px-2 py-1 text-[11px]" />
          <input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} className="px-1 py-1 text-[11px]" />
          <select value={taskCat} onChange={(e) => setTaskCat(e.target.value)} className="px-1 py-1 text-[11px]">
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <button
            type="button"
            className="yy-btn yy-btn--primary !px-2 !py-1"
            onClick={() => {
              if (!taskText.trim()) return;
              addTask(taskCat, taskText.trim(), taskDue || null);
              setTaskDone(`「${taskText.trim()}」を追加しました`);
            }}
          >
            追加
          </button>
        </div>
        {taskDone && <p className="text-[10px] text-gray-700">{taskDone}</p>}
      </div>

      <div className="whitespace-pre-wrap break-words leading-relaxed border-t pt-3">{mail.text || '（本文なし）'}</div>

      {thread.length > 0 && (
        <div className="border-t pt-2">
          <div className="text-[11px] font-bold mb-1">同じ件名のやりとり {thread.length}</div>
          <ul className="text-[11px] space-y-0.5">
            {thread.map((t) => (
              <li key={t.id}>
                <button type="button" className="underline text-left" onClick={() => onSelect(t.id)}>
                  {shortDate(t.date)} {who(t.from)} — {t.subject}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 物件の追加・変更
// ---------------------------------------------------------------------------

function ProjectEditor({ project, onSave, onCancel }: { project: Project | null; onSave: (p: Project) => void; onCancel: () => void }) {
  const [name, setName] = useState(project?.name ?? '');
  const [words, setWords] = useState(project ? project.keywords.join('\n') : '');
  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-black/40 flex items-start justify-center pt-[120px] px-4" onClick={onCancel}>
      <form
        className="bg-white border border-[#3b3b3b] w-full max-w-[380px] p-4 space-y-2 text-[12px]"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          const keywords = words.split(/[\n,、]/).map((w) => w.trim()).filter(Boolean);
          onSave({
            id: project?.id ?? `p-${Date.now()}`,
            name: name.trim(),
            // 物件名そのものも仕分けの言葉に入れておく（件名に物件名を入れる慣習が強い）
            keywords: keywords.includes(name.trim()) ? keywords : [name.trim(), ...keywords],
            createdAt: project?.createdAt ?? Date.now(),
          });
        }}
      >
        <div className="font-bold">{project ? '物件を変更' : '物件を追加'}</div>
        <label className="block">
          <span className="text-[11px] text-gray-600">物件名（物件の台帳から選ぶ。無ければ保存したときに台帳にも入ります）</span>
          <span className="block mt-0.5">
            <ProjectPicker value={name} onChange={setName} placeholder="A邸新築工事" label="物件名" autoRegister={false} className="w-full flex-wrap [&_input]:!w-full [&_input]:!h-7 [&_input]:!text-[12px]" />
          </span>
        </label>
        <label className="block">
          <span className="text-[11px] text-gray-600">仕分けの言葉（1行に1つ）</span>
          <textarea
            value={words}
            onChange={(e) => setWords(e.target.value)}
            rows={4}
            className="w-full px-2 py-1"
            placeholder={'A邸\na-kensetsu.co.jp\n工事番号 2026-015'}
          />
          <span className="text-[10px] text-gray-500">件名・宛先・差出人・本文のどれかに含むメールをこの物件に入れます。件名で当たったものが優先です。</span>
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="px-3 py-1 border" onClick={onCancel}>やめる</button>
          <button type="submit" className="yy-btn yy-btn--primary">保存して仕分け直す</button>
        </div>
      </form>
    </div>,
    document.body
  );
}
