'use client';
/**
 * OnlineMeetingTool（OLMT）— 図面を囲むオンライン会議。
 *
 * 会議ソフトの代わりは作らない（必ず負ける）。Zoom や Teams は外で開いたまま、
 * 画面共有では出来ないこと —「この通り芯の柱」を指す、同じ図面に全員で赤を入れる、
 * 決定事項をその場で残す — だけを受け持つ。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { SiDiscord, SiGooglemeet, SiSlack, SiWebex, SiZoom } from 'react-icons/si';
import { BsMicrosoftTeams } from 'react-icons/bs';
import { useAuth } from '@/lib/AuthContext';
import Room, { type RoomCommand, type RoomHandle } from './Room';
import ToolHeader, { type ToolFeature } from '../../ToolHeader';
import { clearLocalRoom, createRoom, firestoreRoom, forgetRoom, localRoom, LOCAL_ROOM_ID, rememberRoom, roomExists, watchMyRooms, type MyRoom } from './roomBackend';
import GuestNote from '../GuestNote';

/** 未ログインで「ひとりで試す」ときの自分 */
const GUEST_ME = { uid: 'guest', name: 'あなた' };

/** /olmt/?room=… の招待リンクから来たとき、部屋の ID をここで受け取る */
export const JOIN_KEY = 'olmt-join';

const MEETING_TOOLS = [
  { name: 'Zoom', url: 'https://zoom.us/join', Icon: SiZoom, color: '#2D8CFF' },
  { name: 'Teams', url: 'https://teams.microsoft.com/', Icon: BsMicrosoftTeams, color: '#6264A7' },
  { name: 'Google Meet', url: 'https://meet.google.com/', Icon: SiGooglemeet, color: '#00897B' },
  { name: 'Webex', url: 'https://www.webex.com/', Icon: SiWebex, color: '#07C160' },
  { name: 'Slack', url: 'https://slack.com/', Icon: SiSlack, color: '#4A154B' },
  { name: 'Discord', url: 'https://discord.com/', Icon: SiDiscord, color: '#5865F2' },
];

export default function Olmt() {
  const { isLoggedIn, currentUser } = useAuth();
  const uid = isLoggedIn ? currentUser?.uid : undefined;
  const me = useMemo(() => (uid ? { uid, name: currentUser?.username || 'ゲスト' } : null), [uid, currentUser?.username]);
  const [rooms, setRooms] = useState<MyRoom[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [joinText, setJoinText] = useState('');
  const [msg, setMsg] = useState('');
  const backend = useMemo(() => (roomId ? firestoreRoom(roomId) : null), [roomId]);
  // 未ログイン: このブラウザの中だけで図面ボードを試す
  const [trial, setTrial] = useState(false);
  const [trialKey, setTrialKey] = useState(0);
  const localBackend = useMemo(() => (trial ? localRoom(GUEST_ME) : null), [trial, trialKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // 招待リンク（/olmt/?room=…）から来たが未ログイン。ID はログインするまで残しておき、ログインしたらその部屋に入る
  const [invited, setInvited] = useState(false);
  useEffect(() => {
    if (uid) return;
    try {
      setInvited(!!sessionStorage.getItem(JOIN_KEY));
    } catch {
      /* 読めなければ招待の案内は出さない */
    }
  }, [uid]);
  // 見出し帯の「できること」→ 開いている部屋の機能を呼ぶ口
  const roomRef = useRef<RoomHandle>(null);
  const [headNotice, setHeadNotice] = useState('');
  const createRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  useEffect(() => (uid ? watchMyRooms(uid, setRooms) : undefined), [uid]);

  // 招待リンクから来た
  useEffect(() => {
    if (!uid) return;
    let id: string | null = null;
    try {
      id = sessionStorage.getItem(JOIN_KEY);
      sessionStorage.removeItem(JOIN_KEY);
    } catch {
      /* 取れなければ手で入れてもらう */
    }
    if (id) void join(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const join = async (raw: string) => {
    if (!uid) return;
    const id = raw.trim().match(/[a-z2-9]{24}/)?.[0];
    if (!id) return setMsg('招待リンクか部屋の ID を貼ってください');
    try {
      if (!(await roomExists(id))) return setMsg('その部屋は見つかりません');
    } catch {
      return setMsg('その部屋は開けません');
    }
    const known = rooms.find((r) => r.id === id);
    await rememberRoom(uid, id, known?.title ?? '参加した部屋');
    setJoinText('');
    setMsg('');
    setHeadNotice('');
    setRoomId(id);
  };

  const create = async () => {
    if (!uid || !title.trim()) return;
    if (meetingUrl && !/^https:\/\//.test(meetingUrl.trim())) return setMsg('会議の URL は https:// から始まるものを入れてください');
    try {
      const id = await createRoom(uid, title.trim(), meetingUrl.trim());
      setTitle('');
      setMeetingUrl('');
      setHeadNotice('');
      setMsg('');
      setRoomId(id);
    } catch (e) {
      console.error('部屋を作れませんでした', e);
      setMsg('部屋を作れませんでした。通信を確かめて、もう一度押してください');
    }
  };

  /**
   * 部屋の中でしか使えない機能は、部屋を開いていれば合図を送り、
   * 開いていなければ「どうすれば使えるか」を出して新しい部屋の欄へ移る。
   */
  const inRoom = (cmd: RoomCommand) => {
    if (!me) {
      // 招待・会議の設定は相手が要るのでログインしてから。それ以外は「ひとりで試す」部屋で動かす
      if (cmd === 'settings' || cmd === 'meeting') {
        return setHeadNotice('会議の URL・招待文は、ログインして部屋を作ると使えます。参加者も招待リンクを開いてログインすれば入れます。');
      }
      setHeadNotice('');
      if (!trial) {
        setTrial(true);
        return;
      }
      roomRef.current?.run(cmd);
      return;
    }
    if (!roomId) {
      setHeadNotice('部屋を作るか、一覧から部屋を開くと使えます。');
      createRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setHeadNotice('');
    roomRef.current?.run(cmd);
  };
  const features: ToolFeature[] = [
    { label: '図面ボード（指す・赤入れ）', hint: '図面 PDF を全員で開き、ポインタで指し、赤を入れる（ログインなしでも、ひとりで試せます）', onClick: () => inRoom('pen') },
    { label: '決定事項・宿題', hint: '会議中に決まったこと・宿題（担当 / 期限）を書き足す', onClick: () => inRoom('decisions') },
    { label: '議事録 → メモ', hint: '決定事項と参加者をまとめた議事録を作る。メモ（議事録）への保存はログイン後', onClick: () => inRoom('minutes') },
    { label: '会議設定・招待文', login: true, hint: '会議 URL・パスコード・電話番号・定例日時を部屋に束ね、招待文にしてコピーする', onClick: () => inRoom('settings') },
    {
      label: '会議ソフトを開く',
      hint: 'Zoom・Teams・Meet など。部屋に会議 URL があればそれを開く',
      onClick: () => {
        if (roomId && me) return inRoom('meeting');
        if (linksRef.current) linksRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else setHeadNotice('部屋の左上の ‹ で一覧に戻ると、Zoom・Teams・Meet などを開くボタンがあります。');
      },
    },
  ];
  const header = (
    <>
      <ToolHeader
        no="12"
        code="MEETING"
        title="OnlineMeetingTool"
        description="会議ソフトは開いたまま、隣で同じ図面を囲む。ポインタで指し、全員で赤を入れ、決定事項をその場で議事録にする。"
        features={features}
      />
      {headNotice && (
        <p className="px-4 py-1.5 text-[11px] text-gray-600 border-b border-gray-200 shrink-0" role="status">{headNotice}</p>
      )}
    </>
  );

  // ロゴは色を付けず灰色で揃える（画面の差し色を増やさない）。どれか分かれば足りる
  const quickLinks = (
    <div ref={linksRef} className="flex flex-wrap gap-2 scroll-mt-3">
      {MEETING_TOOLS.map(({ name, url, Icon }) => (
        <a key={name} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 text-[11px] border border-gray-300 bg-white text-gray-700 hover:border-[#3b3b3b]">
          <Icon size={13} className="text-gray-500" /> {name}
        </a>
      ))}
    </div>
  );

  if (!me && trial && localBackend) {
    return (
      <div className="w-full bg-white flex flex-col lg:h-[calc(100vh-var(--nav-height))] lg:overflow-hidden">
        {header}
        <div className="flex-1 min-h-0">
          <Room
            key={`local-${trialKey}`}
            backend={localBackend}
            roomId={LOCAL_ROOM_ID}
            me={GUEST_ME}
            local
            onLeave={() => setTrial(false)}
            handleRef={roomRef}
          />
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="w-full bg-white">
        {header}
        <div className="p-3 sm:p-4 space-y-4 text-[12px]">
          {invited ? (
            <GuestNote action="ログインして入る">招待された部屋があります。ログイン（無料の会員登録）すると、そのまま部屋に入れます。</GuestNote>
          ) : (
            <GuestNote>相手と同じ図面を囲む（招待・ポインタの同期）にはログインが要ります。ひとりで試すだけなら、このままどうぞ。</GuestNote>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-gray-50 p-3 border border-[#3b3b3b] space-y-2">
              <div className="text-[11px] font-bold text-gray-600">ひとりで試す（このブラウザの中だけ）</div>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                図面 PDF を開いて、赤入れ・決定事項・宿題・議事録までを試せます。図面はサーバーに上げません。
                赤入れと決定事項はこのブラウザに残ります。
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => setTrial(true)} className="yy-btn yy-btn--primary">図面ボードを開く</button>
                <button
                  type="button"
                  className="text-[11px] underline text-gray-500"
                  onClick={() => {
                    if (!confirm('ひとりで試した赤入れ・決定事項を消しますか？')) return;
                    clearLocalRoom();
                    setTrialKey((k) => k + 1);
                  }}
                >
                  試した内容を消す
                </button>
              </div>
            </div>
            <div className="p-3 border border-gray-300 space-y-1.5">
              <div className="text-[11px] font-bold text-gray-600">ログインするとできること</div>
              <ul className="text-[11px] text-gray-600 space-y-1 list-none">
                <li><span className="yy-mono text-[10px] text-gray-400 mr-2">001</span>部屋を作り、招待リンクを会議の相手に送る（相手もログインして入る）</li>
                <li><span className="yy-mono text-[10px] text-gray-400 mr-2">002</span>参加者のポインタが見え、同じ図面に全員で赤を入れる</li>
                <li><span className="yy-mono text-[10px] text-gray-400 mr-2">003</span>会議の回ごとに赤入れを残し、前回の赤を薄く重ねる</li>
                <li><span className="yy-mono text-[10px] text-gray-400 mr-2">004</span>会議 URL・パスコードを部屋に束ねて招待文にする / 議事録をメモに保存</li>
              </ul>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[11px] text-gray-500">会議ソフトを開く</div>
            {quickLinks}
          </div>
        </div>
      </div>
    );
  }

  if (roomId && backend) {
    return (
      <div className="w-full bg-white flex flex-col lg:h-[calc(100vh-var(--nav-height))] lg:overflow-hidden">
        {header}
        <div className="flex-1 min-h-0">
          <Room key={roomId} backend={backend} roomId={roomId} me={me} onLeave={() => setRoomId(null)} handleRef={roomRef} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white flex flex-col lg:h-[calc(100vh-var(--nav-height))] lg:overflow-hidden">
      {header}
      <div className="p-3 flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div ref={createRef} className="bg-gray-50 p-3 border border-[#3b3b3b] space-y-2 scroll-mt-3">
            <div className="text-[11px] font-bold text-gray-600">新しい部屋</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="部屋の名前（例: A邸 定例）" className="w-full px-2 py-1 text-[12px]" />
            <input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="会議の URL（Zoom・Teams・Meet など。あとからでも可）" className="w-full px-2 py-1 text-[12px]" />
            <button type="button" onClick={() => void create()} disabled={!title.trim()} className="yy-btn yy-btn--primary flex items-center gap-1">
              <FiPlus /> 部屋を作る
            </button>
            <p className="text-[10px] text-gray-500">作ったら図面の PDF を上げて、招待リンクを会議の相手に送ってください。</p>

            <div className="text-[11px] font-bold text-gray-600 pt-2 border-t">招待された部屋に入る</div>
            <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); void join(joinText); }}>
              <input value={joinText} onChange={(e) => setJoinText(e.target.value)} placeholder="招待リンクを貼る" className="flex-1 px-2 py-1 text-[12px]" />
              <button type="submit" className="yy-btn !py-1">入る</button>
            </form>
            {msg && <p className="text-[11px] text-orange-700">{msg}</p>}
          </div>

          <div className="bg-gray-50 p-3 border border-[#3b3b3b] space-y-2">
            <div className="text-[11px] font-bold text-gray-600">部屋 <span className="yy-mono font-normal text-gray-400">{String(rooms.length).padStart(3, '0')}</span></div>
            {rooms.length === 0 && <p className="text-[11px] text-gray-500">作った部屋・参加した部屋がここに並びます。</p>}
            <ul className="divide-y bg-white border">
              {rooms.map((r) => (
                <li key={r.id} className="flex items-center gap-2 px-2 py-1.5 text-[12px]">
                  <button type="button" className="flex-1 text-left underline truncate" onClick={() => { setHeadNotice(''); setRoomId(r.id); }}>
                    {r.title}
                  </button>
                  <span className="yy-mono text-[10px] tracking-[0.08em] text-gray-500">{r.owner ? '主催' : '参加'}</span>
                  <button
                    type="button"
                    title={r.owner ? '部屋を削除' : '一覧から外す'}
                    className="text-gray-400 hover:text-red-600"
                    onClick={() => {
                      if (confirm(r.owner ? `部屋「${r.title}」を削除しますか？（参加者も入れなくなります）` : `「${r.title}」を一覧から外しますか？`)) {
                        forgetRoom(uid!, r.id, !!r.owner).catch(() => setMsg('一覧から外せませんでした。もう一度試してください'));
                      }
                    }}
                  >
                    <FiTrash2 />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <div className="text-[11px] text-gray-500">会議ソフトを開く</div>
          {quickLinks}
        </div>
      </div>
    </div>
  );
}
