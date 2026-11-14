'use client';

/**
 * yychat の見本（未ログイン用）。
 *
 * これまで未ログインでは「ログインすると使えます」の 1 行だけで、物件ルーム・発言 → タスク・議事録が
 * どう動くのか分からなかった。ここでは架空の部屋で、実物と同じ部品（検索・期限の読み取り・議事録）を
 * このブラウザの中だけで動かす。送った発言は相手に届かず、保存もしない。
 */

import React, { useState } from 'react';
import GuestNote from './general-tools/GuestNote';
import { matchesAll, mentionsIn, parseDueHint, searchTerms, splitHits, taskTextFrom } from '@/lib/chatTools';

type DemoMsg = { id: string; me: boolean; who: string; text: string; at: string; photo?: string };
type DemoRoom = { id: string; name: string; project?: string; unread?: number; messages: DemoMsg[] };

const ROOMS: DemoRoom[] = [
  {
    id: 'a',
    name: '田中（設計）',
    project: 'A邸 新築工事',
    unread: 2,
    messages: [
      { id: 'a1', me: false, who: '田中', at: '11/12 09:12', text: '外壁の色見本、B 案と C 案どちらで進めますか？' },
      { id: 'a2', me: true, who: 'あなた', at: '11/12 09:20', text: 'B 案で進めましょう。施主さんにも確認済みです' },
      { id: 'a3', me: false, who: '田中', at: '11/12 09:41', text: '基礎配筋の写真です', photo: '撮影 2026/11/12 09:38' },
      { id: 'a4', me: false, who: '田中', at: '11/12 10:05', text: '@山田 さん 階段詳細図を 11/20 までに修正お願いします' },
      { id: 'a5', me: true, who: 'あなた', at: '11/12 10:10', text: '了解です。金曜までに一度見てもらえるようにします' },
    ],
  },
  {
    id: 'b',
    name: '定例メンバー（5人）',
    project: 'B ビル改修',
    messages: [
      { id: 'b1', me: false, who: '佐藤', at: '11/11 17:30', text: '来週月曜の定例、議題は防水の範囲と工程の見直しです' },
      { id: 'b2', me: false, who: '鈴木', at: '11/11 17:45', text: '屋上防水は既存撤去ありで見積もり直します。明日中に送ります' },
      { id: 'b3', me: true, who: 'あなた', at: '11/11 18:02', text: '撤去ありで決定でお願いします' },
    ],
  },
  {
    id: 'c',
    name: '佐藤（施主）',
    messages: [
      { id: 'c1', me: false, who: '佐藤', at: '11/10 20:15', text: 'キッチンの位置、もう少し窓側に寄せられますか？' },
      { id: 'c2', me: true, who: 'あなた', at: '11/10 20:40', text: '寄せられます。来週の打合せで図面をお見せします' },
    ],
  },
];

const ymdLabel = (s: string | null) => (s ? s.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, d) => `${y}/${Number(m)}/${Number(d)}`) : '');

const YyChatGuestDemo: React.FC = () => {
  const [roomId, setRoomId] = useState('a');
  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');
  const [added, setAdded] = useState<Record<string, DemoMsg[]>>({});
  const [input, setInput] = useState('');
  const [taskFor, setTaskFor] = useState<DemoMsg | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [decided, setDecided] = useState<Set<string>>(new Set());
  // スマホでは一覧と部屋を切り替える（実物と同じ）
  const [showList, setShowList] = useState(false);

  const room = ROOMS.find((r) => r.id === roomId) ?? ROOMS[0];
  const messages = [...room.messages, ...(added[room.id] ?? [])];
  const projects = Array.from(new Set(ROOMS.map((r) => r.project).filter((p): p is string => !!p)));
  const visible = filter ? ROOMS.filter((r) => r.project === filter) : ROOMS;
  const terms = searchTerms(q);
  const hits = terms.length ? ROOMS.flatMap((r) => r.messages.filter((m) => matchesAll(m.text, terms)).map((m) => ({ room: r, m }))) : null;

  const open = (id: string) => {
    setRoomId(id);
    setTaskFor(null);
    setSelecting(false);
    setPicked(new Set());
    setDecided(new Set());
    setShowList(false);
  };
  const toggle = (set: Set<string>, id: string) => {
    const n = new Set(set);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  };
  const send = () => {
    const text = input.trim();
    if (!text) return;
    const now = new Date();
    const at = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setAdded((a) => ({ ...a, [room.id]: [...(a[room.id] ?? []), { id: `x${Date.now()}`, me: true, who: 'あなた', text, at }] }));
    setInput('');
  };

  const label = room.name + (room.project ? ` / ${room.project}` : '');
  const pickedMsgs = messages.filter((m) => picked.has(m.id));

  return (
    <div className="mx-4 mt-3">
      <GuestNote action="ログインして始める">
        相手と部屋を作って話すにはログインが要ります。下は見本です（送った内容は相手に届かず、保存もしません）。
      </GuestNote>
      <div className="flex flex-col md:flex-row md:h-[520px] bg-white border border-[#3b3b3b] overflow-hidden">
        {/* 部屋の一覧 */}
        <div className={`${showList ? 'flex' : 'hidden md:flex'} w-full md:w-72 flex-col border-b md:border-b-0 md:border-r bg-gray-50 min-h-0`}>
          <div className="px-2 py-2 border-b bg-white space-y-1.5">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="全ルームを検索（例: 防水）"
              className="w-full text-xs border px-2 py-1.5 focus:outline-none focus:border-gray-700"
            />
            <div className="flex flex-wrap gap-1">
              {['', ...projects].map((p) => (
                <button
                  key={p || '__all'}
                  type="button"
                  onClick={() => setFilter(p)}
                  className={`text-[10px] px-1.5 py-0.5 border ${filter === p ? 'bg-[#3b3b3b] text-white border-[#3b3b3b]' : 'bg-white text-gray-600 border-gray-300'}`}
                >
                  {p || 'すべて'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {hits ? (
              <div>
                <div className="px-3 py-1.5 text-[10px] text-gray-500">{hits.length} 件（全ルームから）</div>
                {hits.map(({ room: r, m }) => (
                  <button key={m.id} type="button" onClick={() => open(r.id)} className="w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-white">
                    <div className="text-[10px] text-gray-400 truncate">{r.name}{r.project ? ` / ${r.project}` : ''}</div>
                    <div className="text-xs text-gray-700 break-words">
                      {splitHits(m.text, terms).map(([t, hit], i) => (hit ? <mark key={i} className="bg-[#52AA96]/25 text-gray-900">{t}</mark> : <span key={i}>{t}</span>))}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              visible.map((r) => {
                const last = r.messages[r.messages.length - 1];
                const on = r.id === room.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => open(r.id)}
                    className={`w-full text-left px-3 py-2.5 border-l ${on ? 'bg-white border-l-[#52AA96]' : 'border-l-transparent hover:bg-white'}`}
                  >
                    <div className="flex justify-between items-baseline gap-1">
                      <span className={`text-[12px] truncate ${on ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                        {r.name}
                        {r.project && <span className="ml-1 text-[10px] font-normal px-1 border border-gray-300 text-gray-500">{r.project}</span>}
                      </span>
                      <span className="yy-mono text-[10px] text-gray-400 shrink-0">{last.at.split(' ')[0]}</span>
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                      <span className="text-xs text-gray-500 truncate">{last.text}</span>
                      {!!r.unread && !on && <span className="yy-mono text-[#52AA96] text-[10px] font-bold">{r.unread}</span>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 部屋 */}
        <div className={`${showList ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[#F3F4F6] min-h-0 min-w-0`}>
          <div className="px-3 py-2 bg-white border-b flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setShowList(true)} className="md:hidden text-gray-500 text-[12px]" aria-label="一覧へ">←</button>
            <b className="text-[12px] truncate min-w-0">{room.name}</b>
            {room.project && <span className="text-[10px] px-1 border border-gray-400 text-gray-600">{room.project}</span>}
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => { setSelecting((v) => !v); setPicked(new Set()); setDecided(new Set()); setTaskFor(null); }}
              className={`text-[11px] px-2 py-1 border ${selecting ? 'bg-[#3b3b3b] text-white border-[#3b3b3b]' : 'bg-white border-gray-300 text-gray-700'}`}
            >
              {selecting ? '議事録をやめる' : '議事録にする'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[260px]">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-1.5 ${m.me ? 'justify-end' : 'justify-start'}`}>
                {selecting && (
                  <div className="flex flex-col items-center justify-center gap-0.5 order-first shrink-0">
                    <input type="checkbox" checked={picked.has(m.id)} onChange={() => setPicked((p) => toggle(p, m.id))} aria-label="議事録に入れる" />
                    {picked.has(m.id) && (
                      <button
                        type="button"
                        onClick={() => setDecided((p) => toggle(p, m.id))}
                        className={`text-[9px] px-1 border ${decided.has(m.id) ? 'bg-[#3b3b3b] text-white border-[#3b3b3b]' : 'bg-white text-gray-500 border-gray-300'}`}
                      >
                        決定
                      </button>
                    )}
                  </div>
                )}
                <div className="max-w-[78%]">
                  {!m.me && <div className="text-[9px] text-gray-400 mb-0.5 ml-1">{m.who}</div>}
                  <div className={`px-3 py-1.5 text-[12px] break-words whitespace-pre-wrap ${m.me ? 'bg-[#3b3b3b] text-white' : 'bg-white text-gray-800 border border-gray-200'}`}>
                    {m.photo && (
                      <div className="mb-1 border border-black/10">
                        <div className="h-16 bg-gray-200" aria-hidden="true" />
                        <div className={`yy-mono text-[10px] px-1.5 py-0.5 ${m.me ? 'bg-[#141414] text-gray-300' : 'bg-gray-50 text-gray-500'}`}>{m.photo}</div>
                      </div>
                    )}
                    {m.text}
                  </div>
                  <div className={`text-[9px] text-gray-400 mt-0.5 flex gap-2 ${m.me ? 'justify-end' : 'justify-start'}`}>
                    {m.at}
                    {!selecting && (
                      <button type="button" className="underline hover:text-gray-800" onClick={() => setTaskFor(m)} title="この発言をタスクにする（@名前 と期限を読み取ります）">
                        タスク
                      </button>
                    )}
                    {m.me && m.id.startsWith('x') && <span>見本なので相手には届きません</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 発言 → タスク の見本 */}
          {taskFor && (
            <div className="px-3 py-2 bg-white border-t text-[11px] space-y-1">
              <div className="flex justify-between">
                <b className="text-[12px]">発言をタスクにする</b>
                <button type="button" className="underline text-gray-500" onClick={() => setTaskFor(null)}>閉じる</button>
              </div>
              <dl className="grid grid-cols-[4em_1fr] gap-x-2 gap-y-0.5">
                <dt className="text-gray-500">内容</dt>
                <dd>{room.project ? `【${room.project}】` : ''}{taskTextFrom(taskFor.text) || '（写真の確認）'}</dd>
                <dt className="text-gray-500">期限</dt>
                <dd>{ymdLabel(parseDueHint(taskFor.text, new Date())) || <span className="text-gray-400">文面に無し（自分で選べます）</span>}</dd>
                <dt className="text-gray-500">担当</dt>
                <dd>{mentionsIn(taskFor.text).length ? mentionsIn(taskFor.text).map((n) => `@${n}`).join(' ') : <span className="text-gray-400">なし</span>}</dd>
              </dl>
              <p className="text-gray-500">ログインすると、これが Myタスク・Teamタスクに入ります。</p>
            </div>
          )}

          {/* 議事録の見本 */}
          {selecting && (
            <div className="px-3 py-2 bg-white border-t text-[11px] space-y-1 max-h-48 overflow-y-auto">
              <div className="text-gray-600">{picked.size} 件選択（うち決定 {decided.size}）。発言の左のチェックで選び、「決定」で決定事項にします。</div>
              {pickedMsgs.length > 0 && (
                <div className="border-l-2 border-gray-300 pl-2 space-y-0.5">
                  <div className="font-bold">{label} 打合せ記録</div>
                  {pickedMsgs.some((m) => decided.has(m.id)) && (
                    <>
                      <div className="text-gray-500 pt-0.5">決定事項</div>
                      {pickedMsgs.filter((m) => decided.has(m.id)).map((m) => <div key={m.id}>☐ {m.text.split('\n')[0]}（{m.who}）</div>)}
                    </>
                  )}
                  <div className="text-gray-500 pt-0.5">やりとり</div>
                  {pickedMsgs.map((m) => <div key={m.id}><b>{m.who}</b> <span className="text-gray-400">{m.at}</span> {m.text}</div>)}
                </div>
              )}
              <p className="text-gray-500">ログインすると、メモの「{room.project || '議事録'}」フォルダに保存します。</p>
            </div>
          )}

          {!selecting && (
            <div className="p-2 bg-white border-t">
              <div className="flex gap-2 items-end p-1.5 border border-gray-300 focus-within:border-[#3b3b3b]">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
                  placeholder="試しに書いてみる（例: @田中 さん 明日までに見積もりお願いします）"
                  rows={1}
                  className="flex-1 bg-transparent !border-none !outline-none text-[12px] resize-none py-1 px-1 min-w-0"
                />
                <button type="button" onClick={send} disabled={!input.trim()} className="px-3 py-1 text-[11px] bg-[#17302A] text-white rounded-full disabled:bg-gray-300">
                  送る
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default YyChatGuestDemo;
