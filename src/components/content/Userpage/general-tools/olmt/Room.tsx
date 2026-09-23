'use client';
/**
 * 図面ボードの1部屋。会議ソフト（Zoom / Teams…）は外で開いたまま、ここで同じ図面を囲む。
 *   - 参加者のポインタが見える（「この通り芯の柱」を指せる）
 *   - 赤入れを全員で書ける。会議の回ごとに残り、前回の赤を薄く重ねて開ける
 *   - 決定事項・宿題を会議中に書き、終わったら議事録にしてメモへ
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { addDoc, collection } from 'firebase/firestore';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import {
  FiChevronLeft, FiChevronRight, FiCopy, FiEdit3, FiExternalLink, FiMousePointer, FiPlay, FiSquare, FiTrash2, FiUpload, FiX,
} from 'react-icons/fi';
import { db } from '@/lib/firebaseClient';
import { usePdfjs } from '@/lib/pdfjs';
import { buildMinutes, encodePts } from '@/lib/drawingBoard';
import BoardCanvas, { type Tool } from './BoardCanvas';
import type { DecisionDoc, Presence, RoomBackend, RoomDoc, Stroke } from './roomBackend';

const PEN_COLORS = [
  { color: '#e53935', label: '赤' },
  { color: '#1e88e5', label: '青' },
  { color: '#43a047', label: '緑' },
];
/** 参加者ごとのポインタの色（uid から決める。毎回同じ人は同じ色） */
const PEOPLE_COLORS = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00897b', '#6d4c41', '#3949ab'];
const colorOf = (uid: string) => PEOPLE_COLORS[[...uid].reduce((s, c) => s + c.charCodeAt(0), 0) % PEOPLE_COLORS.length];
/** 最後に動いてから1分たったポインタは消す（抜けた人を残さない） */
const PRESENCE_TTL = 60_000;

export default function Room({
  backend,
  roomId,
  me,
  onLeave,
}: {
  backend: RoomBackend;
  roomId: string;
  me: { uid: string; name: string };
  onLeave: () => void;
}) {
  const pdfjs = usePdfjs();
  const [room, setRoom] = useState<RoomDoc | null | undefined>(undefined);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [presence, setPresence] = useState<Presence[]>([]);
  const [decisions, setDecisions] = useState<DecisionDoc[]>([]);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pdfError, setPdfError] = useState('');
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [tool, setTool] = useState<Tool>('pointer');
  const [color, setColor] = useState(PEN_COLORS[0].color);
  const [ghostSession, setGhostSession] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [minutes, setMinutes] = useState<{ text: string; html: string; title: string } | null>(null);
  const [copied, setCopied] = useState('');
  const [now, setNow] = useState(Date.now());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => backend.watchRoom(setRoom), [backend]);
  useEffect(() => backend.watchStrokes(setStrokes), [backend]);
  useEffect(() => backend.watchPresence(setPresence), [backend]);
  useEffect(() => backend.watchDecisions(setDecisions), [backend]);

  // 抜けた人のポインタを消すための時計
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(t);
  }, []);

  // 図面 PDF を開く
  const pdfPath = room?.pdf?.path;
  useEffect(() => {
    if (!pdfjs || !pdfPath) {
      setPdf(null);
      return;
    }
    let alive = true;
    let doc: PDFDocumentProxy | null = null;
    (async () => {
      try {
        const url = await backend.pdfUrl(pdfPath);
        const buf = await (await fetch(url)).arrayBuffer();
        doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
        if (alive) {
          setPdf(doc);
          setPdfError('');
          setPage(1);
        }
      } catch {
        if (alive) setPdfError('図面を開けませんでした');
      }
    })();
    return () => {
      alive = false;
      void doc?.destroy();
    };
  }, [pdfjs, pdfPath, backend]);

  const isOwner = room?.ownerUid === me.uid;
  const session = room?.currentSession ?? null;
  const sessions = room?.sessions ?? [];
  const current = sessions.find((s) => s.id === session);
  const ended = sessions.filter((s) => s.endedAt).sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0));

  // 前回の赤は、既定で直近に終わった回
  useEffect(() => {
    if (!ghostSession && ended[0]) setGhostSession(ended[0].id);
  }, [ended, ghostSession]);

  const pageStrokes = useMemo(() => strokes.filter((s) => s.page === page && s.sessionId === session), [strokes, page, session]);
  const ghost = useMemo(
    () => (ghostSession && ghostSession !== session ? strokes.filter((s) => s.page === page && s.sessionId === ghostSession) : []),
    [strokes, page, session, ghostSession]
  );
  const active = presence.filter((p) => now - p.at < PRESENCE_TTL);
  const others = active.filter((p) => p.uid !== me.uid && p.page === page);
  const sessionDecisions = decisions.filter((d) => d.sessionId === session).sort((a, b) => a.at - b.at);

  if (room === undefined) return <p className="p-4 text-[12px] text-gray-500">部屋を開いています…</p>;
  if (room === null)
    return (
      <div className="p-4 text-[12px] space-y-2">
        <p>この部屋は見つかりません（削除されたか、リンクが違います）。</p>
        <button type="button" className="underline" onClick={onLeave}>一覧に戻る</button>
      </div>
    );

  const inviteUrl = `${window.location.origin}/olmt/?room=${roomId}`;
  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      prompt('コピーしてください', text);
    }
  };

  const startSession = async () => {
    const n = sessions.length + 1;
    const s = { id: `s-${Date.now()}`, label: `第${n}回 ${new Date().toLocaleDateString('ja-JP')}`, startedAt: Date.now() };
    await backend.updateRoom({ sessions: [...sessions, s], currentSession: s.id });
  };

  const endSession = async () => {
    if (!current) return;
    const list = sessions.map((s) => (s.id === current.id ? { ...s, endedAt: Date.now() } : s));
    await backend.updateRoom({ sessions: list, currentSession: null });
    setGhostSession(current.id);
    openMinutes(current.label, current.startedAt, current.id);
  };

  const openMinutes = (label: string, startedAt: number, sessionId: string | null) => {
    const names = [...new Set(strokes.filter((s) => s.sessionId === sessionId).map((s) => s.name).concat(active.map((p) => p.name)))];
    const m = buildMinutes({
      title: `${room.title} ${label}`,
      date: new Date(startedAt).toLocaleString('ja-JP', { dateStyle: 'medium', timeStyle: 'short' }),
      participants: names,
      drawing: room.pdf?.name,
      decisions: decisions.filter((d) => d.sessionId === sessionId).sort((a, b) => a.at - b.at),
    });
    setMinutes({ ...m, title: `${room.title} ${label} 議事録` });
  };

  const saveMinutesToMemo = async () => {
    if (!minutes) return;
    await addDoc(collection(db, 'users', me.uid, 'memos'), {
      title: minutes.title,
      content: minutes.html,
      category: '議事録',
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
      isLocked: false,
      order: -Date.now(),
    });
    setCopied('memo');
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== 'application/pdf') return alert('PDF を選んでください');
    if (file.size > 50 * 1024 * 1024) return alert('50MB までの PDF にしてください');
    setUploading(true);
    try {
      const pdfInfo = await backend.uploadPdf(file);
      await backend.updateRoom({ pdf: pdfInfo });
    } catch {
      alert('アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const btn = (on: boolean) => `px-2 py-1 text-[11px] border flex items-center gap-1 ${on ? 'bg-[#3b3b3b] text-white border-[#3b3b3b]' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 上の帯 */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b bg-gray-50 text-[12px]">
        <button type="button" onClick={onLeave} className="text-gray-500 hover:text-black" title="一覧に戻る">
          <FiChevronLeft />
        </button>
        <b className="mr-2 truncate max-w-[240px]">{room.title}</b>
        {room.meetingUrl ? (
          <a href={room.meetingUrl} target="_blank" rel="noopener noreferrer" className={btn(false)}>
            <FiExternalLink /> 会議に入る
          </a>
        ) : isOwner ? (
          <button
            type="button"
            className={btn(false)}
            onClick={() => {
              const url = prompt('会議の URL（Zoom・Teams・Meet など）');
              if (url && /^https:\/\//.test(url)) void backend.updateRoom({ meetingUrl: url });
            }}
          >
            会議の URL を登録
          </button>
        ) : null}
        <button type="button" className={btn(false)} onClick={() => void copy(inviteUrl, 'invite')}>
          <FiCopy /> {copied === 'invite' ? 'コピーしました' : '招待リンク'}
        </button>
        {isOwner && (
          <>
            <button type="button" className={btn(false)} onClick={() => fileRef.current?.click()} disabled={uploading}>
              <FiUpload /> {uploading ? '上げています…' : room.pdf ? '図面を差し替え' : '図面 PDF を上げる'}
            </button>
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
            {current ? (
              <button type="button" className={btn(true)} onClick={() => void endSession()}>
                <FiSquare /> {current.label} を終える
              </button>
            ) : (
              <button type="button" className={btn(false)} onClick={() => void startSession()}>
                <FiPlay /> 会議を始める
              </button>
            )}
          </>
        )}
        {!isOwner && current && <span className="text-[11px] text-green-700">● {current.label} 進行中</span>}
        <span className="ml-auto text-[11px] text-gray-500">
          参加中 {active.length}人{active.length ? `：${active.map((p) => p.name).join('、')}` : ''}
        </span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* 道具 */}
        <div className="w-[132px] shrink-0 border-r p-2 space-y-2 text-[11px] bg-white">
          <button type="button" className={`${btn(tool === 'pointer')} w-full`} onClick={() => setTool('pointer')}>
            <FiMousePointer /> 指す
          </button>
          <button type="button" className={`${btn(tool === 'pen')} w-full`} onClick={() => setTool('pen')}>
            <FiEdit3 /> 赤入れ
          </button>
          {tool === 'pen' && (
            <div className="flex gap-1">
              {PEN_COLORS.map((c) => (
                <button key={c.color} type="button" title={c.label} onClick={() => setColor(c.color)} className={`w-6 h-6 border-2 ${color === c.color ? 'border-black' : 'border-white'}`} style={{ background: c.color }} />
              ))}
            </div>
          )}
          <button type="button" className={`${btn(tool === 'eraser')} w-full`} onClick={() => setTool('eraser')}>
            <FiTrash2 /> 消す
          </button>
          <p className="text-[10px] text-gray-400">{isOwner ? '誰の線でも消せます' : '自分の線だけ消せます'}</p>

          <div className="border-t pt-2 space-y-1">
            <div className="flex items-center justify-between">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1 disabled:opacity-30"><FiChevronLeft /></button>
              <span>{page} / {pdf?.numPages ?? '-'}</span>
              <button type="button" disabled={!pdf || page >= pdf.numPages} onClick={() => setPage((p) => p + 1)} className="p-1 disabled:opacity-30"><FiChevronRight /></button>
            </div>
            <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full px-1 py-0.5 text-[11px]">
              <option value={100}>枠に合わせる</option>
              <option value={150}>150%</option>
              <option value={200}>200%</option>
              <option value={300}>300%</option>
            </select>
          </div>

          {ended.length > 0 && (
            <div className="border-t pt-2">
              <div className="text-gray-500 mb-1">薄く重ねる回</div>
              <select value={ghostSession} onChange={(e) => setGhostSession(e.target.value)} className="w-full px-1 py-0.5 text-[11px]">
                <option value="">重ねない</option>
                {ended.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 図面 */}
        <div className="flex-1 min-w-0">
          {pdfError ? (
            <p className="p-4 text-[12px] text-red-600">{pdfError}</p>
          ) : (
            <BoardCanvas
              pdf={pdf}
              page={page}
              zoom={zoom}
              strokes={pageStrokes}
              ghost={ghost}
              pointers={others}
              tool={tool}
              color={color}
              canErase={(s) => isOwner || s.uid === me.uid}
              onStroke={(pts) =>
                void backend.addStroke({ uid: me.uid, name: me.name, page, pts: encodePts(pts), color, width: 3, sessionId: session })
              }
              onErase={(id) => void backend.deleteStroke(id)}
              onPointer={(p) => void backend.setPresence({ uid: me.uid, name: me.name, color: colorOf(me.uid), page, x: p.x, y: p.y })}
            />
          )}
        </div>

        {/* 決定事項・宿題 */}
        <Decisions
          items={sessionDecisions}
          label={current?.label ?? '会議外'}
          me={me}
          isOwner={isOwner}
          backend={backend}
          session={session}
          onMinutes={() => openMinutes(current?.label ?? '', current?.startedAt ?? Date.now(), session)}
        />
      </div>

      {minutes &&
        createPortal(
          <div className="fixed inset-x-0 bottom-0 z-[10000] bg-black/50 flex items-start justify-center pt-10" style={{ top: 'var(--nav-height, 35px)' }} onClick={() => setMinutes(null)}>
            <div className="bg-white border border-[#3b3b3b] w-[560px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center px-3 py-2 bg-[#3b3b3b] text-white text-[12px]">
                <b>{minutes.title}</b>
                <button type="button" onClick={() => setMinutes(null)} aria-label="閉じる"><FiX /></button>
              </div>
              <pre className="p-3 text-[12px] whitespace-pre-wrap max-h-[50vh] overflow-y-auto font-sans">{minutes.text}</pre>
              <div className="flex justify-end gap-2 px-3 py-2 border-t text-[12px]">
                <button type="button" className="px-3 py-1 border" onClick={() => void copy(minutes.text, 'minutes')}>
                  {copied === 'minutes' ? 'コピーしました' : 'テキストをコピー'}
                </button>
                <button type="button" className="px-3 py-1 bg-[#3b3b3b] text-white" onClick={() => void saveMinutesToMemo()} disabled={copied === 'memo'}>
                  {copied === 'memo' ? 'メモに保存しました' : 'メモ（議事録）に保存'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function Decisions({
  items, label, me, isOwner, backend, session, onMinutes,
}: {
  items: DecisionDoc[];
  label: string;
  me: { uid: string; name: string };
  isOwner: boolean;
  backend: RoomBackend;
  session: string | null;
  onMinutes: () => void;
}) {
  const [kind, setKind] = useState<'decision' | 'todo'>('decision');
  const [text, setText] = useState('');
  const [who, setWho] = useState('');
  const [due, setDue] = useState('');
  const add = () => {
    if (!text.trim()) return;
    void backend.addDecision({ uid: me.uid, text: text.trim(), kind, who: who.trim() || undefined, due: due || undefined, done: false, sessionId: session });
    setText('');
    setWho('');
    setDue('');
  };
  const section = (k: 'decision' | 'todo', title: string) => {
    const list = items.filter((d) => d.kind === k);
    return (
      <div>
        <div className="text-[11px] font-bold text-gray-600 mb-1">{title}（{list.length}）</div>
        <ul className="space-y-1">
          {list.map((d) => (
            <li key={d.id} className="flex items-start gap-1 text-[11px]">
              <input type="checkbox" checked={d.done} onChange={(e) => void backend.updateDecision(d.id, { done: e.target.checked, uid: d.uid, text: d.text })} className="mt-0.5" />
              <span className={`flex-1 ${d.done ? 'line-through text-gray-400' : ''}`}>
                {d.text}
                {(d.who || d.due) && <span className="text-gray-500">（{[d.who, d.due].filter(Boolean).join(' / ')}）</span>}
              </span>
              {(isOwner || d.uid === me.uid) && (
                <button type="button" className="text-gray-400 hover:text-red-600" onClick={() => void backend.deleteDecision(d.id)} title="削除"><FiX /></button>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };
  return (
    <div className="w-[240px] shrink-0 border-l p-2 space-y-3 overflow-y-auto bg-white">
      <div className="text-[11px] text-gray-500">{label}</div>
      {section('decision', '決定事項')}
      {section('todo', '宿題')}
      <div className="border-t pt-2 space-y-1">
        <div className="flex gap-1">
          <button type="button" className={`flex-1 py-0.5 text-[11px] border ${kind === 'decision' ? 'bg-[#3b3b3b] text-white' : 'bg-white'}`} onClick={() => setKind('decision')}>決定</button>
          <button type="button" className={`flex-1 py-0.5 text-[11px] border ${kind === 'todo' ? 'bg-[#3b3b3b] text-white' : 'bg-white'}`} onClick={() => setKind('todo')}>宿題</button>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder={kind === 'decision' ? '外壁はサイディング B 案' : '階段詳細を修正して再提出'} className="w-full px-1 py-0.5 text-[11px]" />
        {kind === 'todo' && (
          <div className="flex gap-1">
            <input value={who} onChange={(e) => setWho(e.target.value)} placeholder="担当" className="w-1/2 px-1 py-0.5 text-[11px]" />
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-1/2 px-1 py-0.5 text-[11px]" />
          </div>
        )}
        <button type="button" className="w-full py-1 text-[11px] bg-[#3b3b3b] text-white" onClick={add}>書き足す</button>
      </div>
      <button type="button" className="w-full py-1 text-[11px] border" onClick={onMinutes}>議事録にする</button>
    </div>
  );
}
