'use client';
/**
 * OnlineMeetingTool（OLMT）— 図面を囲むオンライン会議。
 *
 * 会議ソフトの代わりは作らない（必ず負ける）。Zoom や Teams は外で開いたまま、
 * 画面共有では出来ないこと —「この通り芯の柱」を指す、同じ図面に全員で赤を入れる、
 * 決定事項をその場で残す — だけを受け持つ。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { SiDiscord, SiGooglemeet, SiSlack, SiWebex, SiZoom } from 'react-icons/si';
import { BsMicrosoftTeams } from 'react-icons/bs';
import { useAuth } from '@/lib/AuthContext';
import Room from './Room';
import { createRoom, firestoreRoom, forgetRoom, rememberRoom, roomExists, watchMyRooms, type MyRoom } from './roomBackend';

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
    setRoomId(id);
  };

  const create = async () => {
    if (!uid || !title.trim()) return;
    if (meetingUrl && !/^https:\/\//.test(meetingUrl.trim())) return setMsg('会議の URL は https:// から始まるものを入れてください');
    const id = await createRoom(uid, title.trim(), meetingUrl.trim());
    setTitle('');
    setMeetingUrl('');
    setRoomId(id);
  };

  const header = (
    <div className="px-4 py-1.5 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
      <h3 className="text-[13px] font-medium">OnlineMeetingTool — 図面ボード</h3>
      <p className="text-[11px] mt-0.5">
        会議ソフトは開いたまま、隣で同じ図面を囲む。参加者のポインタが見え、全員で赤を入れ、決定事項をその場で議事録にします
      </p>
    </div>
  );

  const quickLinks = (
    <div className="flex flex-wrap gap-2">
      {MEETING_TOOLS.map(({ name, url, Icon, color }) => (
        <a key={name} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 text-[11px] border border-gray-300 bg-white hover:bg-gray-50">
          <Icon size={14} color={color} /> {name}
        </a>
      ))}
    </div>
  );

  if (!me) {
    return (
      <div className="w-full bg-white">
        {header}
        <div className="p-4 space-y-3 text-[12px]">
          <p>図面ボードを使うには、ログイン（無料の会員登録）が必要です。会議の参加者も、招待リンクを開いてログインすれば入れます。</p>
          <div className="text-[11px] text-gray-500">会議ソフトを開く</div>
          {quickLinks}
        </div>
      </div>
    );
  }

  if (roomId && backend) {
    return (
      <div className="w-full bg-white flex flex-col h-full lg:h-[calc(100vh-var(--nav-height))] overflow-hidden">
        {header}
        <div className="flex-1 min-h-0">
          <Room key={roomId} backend={backend} roomId={roomId} me={me} onLeave={() => setRoomId(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white flex flex-col h-full lg:h-[calc(100vh-var(--nav-height))] overflow-hidden">
      {header}
      <div className="p-3 flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-gray-50 p-3 border border-[#3b3b3b] space-y-2">
            <div className="text-[11px] font-bold text-gray-600">新しい部屋</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="部屋の名前（例: A邸 定例）" className="w-full px-2 py-1 text-[12px]" />
            <input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="会議の URL（Zoom・Teams・Meet など。あとからでも可）" className="w-full px-2 py-1 text-[12px]" />
            <button type="button" onClick={() => void create()} disabled={!title.trim()} className="px-3 py-1.5 text-[12px] bg-[#3b3b3b] text-white flex items-center gap-1 disabled:opacity-40">
              <FiPlus /> 部屋を作る
            </button>
            <p className="text-[10px] text-gray-500">作ったら図面の PDF を上げて、招待リンクを会議の相手に送ってください。</p>

            <div className="text-[11px] font-bold text-gray-600 pt-2 border-t">招待された部屋に入る</div>
            <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); void join(joinText); }}>
              <input value={joinText} onChange={(e) => setJoinText(e.target.value)} placeholder="招待リンクを貼る" className="flex-1 px-2 py-1 text-[12px]" />
              <button type="submit" className="px-3 py-1 text-[12px] border border-[#3b3b3b] bg-white">入る</button>
            </form>
            {msg && <p className="text-[11px] text-orange-700">{msg}</p>}
          </div>

          <div className="bg-gray-50 p-3 border border-[#3b3b3b] space-y-2">
            <div className="text-[11px] font-bold text-gray-600">部屋（{rooms.length}）</div>
            {rooms.length === 0 && <p className="text-[11px] text-gray-500">作った部屋・参加した部屋がここに並びます。</p>}
            <ul className="divide-y bg-white border">
              {rooms.map((r) => (
                <li key={r.id} className="flex items-center gap-2 px-2 py-1.5 text-[12px]">
                  <button type="button" className="flex-1 text-left underline truncate" onClick={() => setRoomId(r.id)}>
                    {r.title}
                  </button>
                  <span className="text-[10px] text-gray-500">{r.owner ? '主催' : '参加'}</span>
                  <button
                    type="button"
                    title={r.owner ? '部屋を削除' : '一覧から外す'}
                    className="text-gray-400 hover:text-red-600"
                    onClick={() => {
                      if (confirm(r.owner ? `部屋「${r.title}」を削除しますか？（参加者も入れなくなります）` : `「${r.title}」を一覧から外しますか？`)) void forgetRoom(uid!, r.id, !!r.owner);
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
