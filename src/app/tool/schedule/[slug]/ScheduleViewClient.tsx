'use client';

/**
 * 日程調整の回答ページ（/tool/schedule/{slug}）。共有リンクを受け取った人が開く。
 *
 * 回答する人にログインは求めない（firestore.rules の schedules/participants・responses は
 * 公開スケジュールなら未ログインでも書ける）。日程調整で回答者にログインを強いると集まらない。
 *
 * 以前は「名前を入れて参加する」→ 候補が初めて出る → 「回答を送信」の 2 段で、
 * 参加するまで候補が見えず、参加だけして回答しない人（全部空欄の列）が残った。
 * 今は候補・名前・○△✕・コメントを 1 画面に出し、1 回の送信で参加者と回答をまとめて書く。
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import {
  Schedule,
  ScheduleOption,
  ScheduleParticipant,
  ScheduleResponse,
  OptionSummary,
  ResponseValue,
} from '@/types/schedule';

interface ScheduleViewClientProps {
  slug: string;
}

const CHOICES: Array<{ value: ResponseValue; mark: string; label: string }> = [
  { value: 'yes', mark: '○', label: '出られる' },
  { value: 'maybe', mark: '△', label: '調整すれば' },
  { value: 'no', mark: '✕', label: '出られない' },
];
const markOf = (v?: ResponseValue) => (v === 'yes' ? '○' : v === 'maybe' ? '△' : v === 'no' ? '✕' : '');
const toneOf = (v?: ResponseValue) => (v === 'yes' ? 'text-[#141414] font-bold' : v === 'maybe' ? 'text-gray-500' : 'text-gray-300');

const idKey = (slug: string) => `schedule_${slug}_participantId`;
const nameKey = (slug: string) => `schedule_${slug}_participantName`;

const ScheduleViewClient: React.FC<ScheduleViewClientProps> = ({ slug }) => {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [options, setOptions] = useState<ScheduleOption[]>([]);
  const [participants, setParticipants] = useState<ScheduleParticipant[]>([]);
  const [responses, setResponses] = useState<ScheduleResponse[]>([]);
  const [summaries, setSummaries] = useState<OptionSummary[]>([]);
  const [participantName, setParticipantName] = useState('');
  const [participantComment, setParticipantComment] = useState('');
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 送信前の自分の回答
  const [picks, setPicks] = useState<Record<string, ResponseValue>>({});
  const [formMsg, setFormMsg] = useState('');
  const [doneMsg, setDoneMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  // 締切判定用の現在時刻。開いたままのタブでも締切を跨いだら受付を止めたいので定期的に進める。
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const loadSchedule = useCallback(async () => {
    try {
      let scheduleDoc;
      try {
        scheduleDoc = await getDoc(doc(db, 'schedules', slug));
      } catch (e) {
        // 会員限定（isPublic=false）と、存在しない slug（未ログインの get は規則で拒否）はどちらも permission-denied になる
        if ((e as { code?: string })?.code === 'permission-denied') {
          setError('このスケジュールは開けません。リンクが途中で切れているか、締切から 1 週間たって片付けられたか、主催者だけが開ける設定です。主催者にリンクを確かめてください');
          return;
        }
        throw e;
      }

      if (!scheduleDoc.exists()) {
        setError('スケジュールが見つかりません。締切から 1 週間たって片付けられたか、リンクが途中で切れています');
        return;
      }

      const scheduleData = { id: scheduleDoc.id, ...scheduleDoc.data() } as Schedule;
      if (!scheduleData.isPublic) {
        setError('このスケジュールは主催者だけが開ける設定です');
        return;
      }
      setSchedule(scheduleData);

      const [optionsSnapshot, participantsSnapshot, responsesSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'schedules', slug, 'options'), orderBy('order'))),
        getDocs(query(collection(db, 'schedules', slug, 'participants'), orderBy('createdAt', 'asc'))),
        getDocs(collection(db, 'schedules', slug, 'responses')),
      ]);
      const optionsData = optionsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as ScheduleOption[];
      const participantsData = participantsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as ScheduleParticipant[];
      const responsesData = responsesSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as ScheduleResponse[];
      setOptions(optionsData);
      setParticipants(participantsData);
      setResponses(responsesData);

      const summaryMap = new Map<string, OptionSummary>();
      optionsData.forEach((opt) => summaryMap.set(opt.id, { optionId: opt.id, yes: 0, maybe: 0, no: 0, total: 0 }));
      responsesData.forEach((resp) => {
        const summary = summaryMap.get(resp.optionId);
        if (summary && (resp.value === 'yes' || resp.value === 'maybe' || resp.value === 'no')) {
          summary[resp.value]++;
          summary.total++;
        }
      });
      setSummaries(Array.from(summaryMap.values()));
    } catch (err) {
      console.error('スケジュール読み込みエラー:', err);
      setError('スケジュールの読み込みに失敗しました。通信を確かめて、開き直してください');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void loadSchedule();
    // この端末で前に回答していれば、その人として開く（回答の修正ができる）
    try {
      const savedId = localStorage.getItem(idKey(slug));
      if (savedId) {
        setMyParticipantId(savedId);
        const savedName = localStorage.getItem(nameKey(slug));
        if (savedName) setParticipantName(savedName);
      }
    } catch {
      /* 読めなければ新しく回答してもらう */
    }
  }, [loadSchedule, slug]);

  const currentParticipant = myParticipantId ? participants.find((p) => p.id === myParticipantId) ?? null : null;

  // 自分の回答を読み込んだら、フォームに入れておく（修正しやすいように）
  useEffect(() => {
    if (!currentParticipant) return;
    const mine: Record<string, ResponseValue> = {};
    responses.filter((r) => r.participantId === currentParticipant.id).forEach((r) => { mine[r.optionId] = r.value; });
    setPicks(mine);
    setParticipantComment(currentParticipant.comment ?? '');
  }, [currentParticipant, responses]);

  const deadlineDate = schedule?.deadline?.toDate?.() ?? null;
  const isClosed = deadlineDate ? deadlineDate.getTime() < now : false;

  const submit = async () => {
    if (!schedule || sending) return;
    setDoneMsg('');
    if (isClosed) return setFormMsg('回答期限を過ぎているため、受け付けられません');
    const name = participantName.trim();
    if (!name) return setFormMsg('お名前を入れてください');
    if (name.length > 100) return setFormMsg('お名前は 100 文字までにしてください');
    if (participantComment.length > 500) return setFormMsg('コメントは 500 文字までにしてください');
    const missing = options.filter((o) => !picks[o.id]);
    if (missing.length) return setFormMsg(`まだ選んでいない候補が ${missing.length} 件あります（○ / △ / ✕ を選んでください）`);
    setFormMsg('');
    setSending(true);
    try {
      // 参加者と回答を 1 バッチで書く。途中で失敗して「名前だけの参加者」が残らないように
      const batch = writeBatch(db);
      let pid = currentParticipant?.id ?? null;
      if (pid) {
        batch.update(doc(db, 'schedules', schedule.id, 'participants', pid), {
          name,
          comment: participantComment.trim() || null,
          updatedAt: serverTimestamp(),
        });
      } else {
        const ref = doc(collection(db, 'schedules', schedule.id, 'participants'));
        pid = ref.id;
        batch.set(ref, {
          name,
          ...(participantComment.trim() ? { comment: participantComment.trim() } : {}),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const option of options) {
        const value = picks[option.id];
        const existing = responses.find((r) => r.participantId === pid && r.optionId === option.id);
        if (existing) {
          if (existing.value !== value) batch.update(doc(db, 'schedules', schedule.id, 'responses', existing.id), { value });
        } else {
          batch.set(doc(collection(db, 'schedules', schedule.id, 'responses')), { participantId: pid, optionId: option.id, value });
        }
      }
      await batch.commit();
      try {
        localStorage.setItem(idKey(schedule.id), pid);
        localStorage.setItem(nameKey(schedule.id), name);
      } catch {
        /* 保存できなくても回答は届いている */
      }
      setDoneMsg(currentParticipant ? '回答を更新しました' : '回答を送りました。この端末で開き直すと修正できます');
      setMyParticipantId(pid);
      await loadSchedule();
    } catch (err) {
      console.error('回答送信エラー:', err);
      setFormMsg('送れませんでした。通信を確かめて、もう一度押してください（入力は残っています）');
    } finally {
      setSending(false);
    }
  };

  /** 共有の端末などで、別の人として新しく回答する */
  const answerAsOther = () => {
    try {
      localStorage.removeItem(idKey(slug));
      localStorage.removeItem(nameKey(slug));
    } catch {
      /* 無視 */
    }
    setMyParticipantId(null);
    setParticipantName('');
    setParticipantComment('');
    setPicks({});
    setDoneMsg('');
    setFormMsg('');
  };

  const handleCopyUrl = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt('コピーしてください', url);
    }
  };

  const frame = (children: React.ReactNode) => (
    <div className="min-h-screen bg-gray-50 px-4 py-8 flex justify-center">
      <div className="max-w-xl w-full bg-white border border-[#3b3b3b] p-5 sm:p-6 space-y-5 text-[#141414]">
        <div className="flex items-baseline justify-between gap-2 border-b border-gray-200 pb-3">
          <Link href="/" className="text-[15px] font-bold tracking-[-0.02em]">yaneyuka</Link>
          <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-gray-500">SCHEDULE</span>
        </div>
        {children}
      </div>
    </div>
  );

  if (loading) return frame(<p className="text-[12px] text-gray-500">読み込み中…</p>);
  if (error || !schedule) return frame(<p className="text-[12px] text-red-700">{error || 'スケジュールが見つかりません'}</p>);

  const maxYes = Math.max(...summaries.map((s) => s.yes), 0);
  const roleMap = schedule.roles ?? {};
  const requiredRoles = schedule.requiredRoles ?? [];
  const canAnswer = !isClosed && options.length > 0;

  return frame(
    <>
      {/* 何の調整か */}
      <div>
        {schedule.kind && (
          <span className="inline-block border border-gray-400 px-1.5 mb-1 text-[10px] tracking-[0.08em] text-gray-600 font-mono">{schedule.kind}</span>
        )}
        <h1 className="text-[15px] font-bold leading-snug">{schedule.title}</h1>
        {schedule.description && <p className="text-[12px] text-gray-600 mt-1 whitespace-pre-wrap">{schedule.description}</p>}
        <p className="font-mono text-[10px] tracking-[0.08em] text-gray-500 mt-2">
          主催 {schedule.ownerName}
          {deadlineDate && (
            <span className={isClosed ? 'text-red-700' : ''}>
              {' '}／ 〆 {deadlineDate.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              {isClosed && '（締切済み）'}
            </span>
          )}
        </p>
        {requiredRoles.length > 0 && <p className="text-[11px] text-gray-500 mt-1">{requiredRoles.join('・')} の出席が必要な日程です</p>}
      </div>

      {isClosed && <p className="text-[12px] text-red-700 border-y border-red-200 py-2">回答期限を過ぎているため、新しい回答・修正は受け付けていません。</p>}

      {/* 回答フォーム（ログイン不要） */}
      {canAnswer && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-[12px] font-bold">{currentParticipant ? `${currentParticipant.name} さんの回答を修正` : 'あなたの回答'}</h2>
            {currentParticipant ? (
              <button type="button" onClick={answerAsOther} className="text-[11px] underline text-gray-500">別の人として回答する</button>
            ) : (
              <span className="text-[10px] text-gray-400">ログインは要りません</span>
            )}
          </div>
          <label className="block">
            <span className="block text-[11px] text-gray-600 mb-1">お名前</span>
            <input
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="例: 山田（〇〇設計）"
              maxLength={100}
              className="w-full px-3 py-2 text-[14px] border border-gray-300 focus:outline-none focus:border-[#3b3b3b]"
            />
          </label>
          <ul className="border-t border-gray-200">
            {options.map((option) => (
              <li key={option.id} className="flex items-center justify-between gap-2 py-2 border-b border-gray-200">
                <span className={`text-[12px] min-w-0 ${formMsg && !picks[option.id] ? 'text-orange-700' : ''}`}>{option.label}</span>
                <span className="flex shrink-0 border border-gray-300">
                  {CHOICES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setPicks((p) => ({ ...p, [option.id]: c.value }))}
                      aria-pressed={picks[option.id] === c.value}
                      title={c.label}
                      className={`w-11 h-9 text-[15px] ${picks[option.id] === c.value ? 'bg-[#141414] text-white' : 'bg-white text-gray-500 hover:text-[#141414]'}`}
                    >
                      {c.mark}
                    </button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <label className="block">
            <span className="block text-[11px] text-gray-600 mb-1">コメント（任意）</span>
            <input
              type="text"
              value={participantComment}
              onChange={(e) => setParticipantComment(e.target.value)}
              placeholder="例: 午後は 15 時以降なら出られます"
              maxLength={500}
              className="w-full px-3 py-2 text-[14px] border border-gray-300 focus:outline-none focus:border-[#3b3b3b]"
            />
          </label>
          {formMsg && <p className="text-[12px] text-orange-700" role="alert">{formMsg}</p>}
          {doneMsg && <p className="text-[12px] text-[#2f7d6b]" role="status">{doneMsg}</p>}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={sending}
            className="w-full px-6 py-3 text-white text-[13px] font-bold bg-[#141414] hover:bg-[#2a2a2a] disabled:opacity-50"
          >
            {sending ? '送っています…' : currentParticipant ? '回答を更新する' : '回答する'}
          </button>
        </section>
      )}

      {/* みんなの回答 */}
      {options.length > 0 && (
        <section>
          <h2 className="text-[12px] font-bold mb-2">
            みんなの回答 <span className="font-mono text-[10px] font-normal text-gray-400">{String(participants.length).padStart(2, '0')} 人</span>
          </h2>
          <div className="overflow-x-auto border border-gray-200">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="p-2 text-left font-bold sticky left-0 bg-gray-50 border-r border-gray-200 min-w-[110px]">候補</th>
                  <th className="p-2 text-center font-bold font-mono text-[10px] whitespace-nowrap">○ / △ / ✕</th>
                  {participants.map((p) => (
                    <th key={p.id} className={`p-2 text-center font-normal min-w-[56px] ${p.id === myParticipantId ? 'text-[#141414] font-bold' : ''}`}>
                      <span className="block truncate max-w-[80px] mx-auto">{p.name}</span>
                      {roleMap[p.id] && <span className="block text-[10px] text-gray-400">{roleMap[p.id]}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {options.map((option) => {
                  const s = summaries.find((x) => x.optionId === option.id);
                  const top = !!s && s.yes === maxYes && maxYes > 0;
                  return (
                    <tr key={option.id} className="border-t border-gray-100">
                      <td className={`p-2 sticky left-0 border-r border-gray-200 ${top ? 'bg-gray-50 shadow-[inset_2px_0_0_#52AA96] font-bold' : 'bg-white'}`}>{option.label}</td>
                      <td className="p-2 text-center font-mono text-[11px] whitespace-nowrap">
                        <b>{s?.yes ?? 0}</b><span className="text-gray-300"> / </span>
                        <span className="text-gray-500">{s?.maybe ?? 0}</span><span className="text-gray-300"> / </span>
                        <span className="text-gray-400">{s?.no ?? 0}</span>
                      </td>
                      {participants.map((p) => {
                        const v = responses.find((r) => r.participantId === p.id && r.optionId === option.id)?.value;
                        return <td key={p.id} className={`p-2 text-center ${toneOf(v)}`}>{markOf(v) || <span className="text-gray-200">—</span>}</td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {maxYes > 0 && <p className="text-[11px] text-gray-500 mt-1.5">左に緑の線がある行は ○ が最多の候補です</p>}
          {participants.length === 0 && <p className="text-[11px] text-gray-500 mt-1.5">まだ誰も回答していません。</p>}
        </section>
      )}
      {options.length === 0 && <p className="text-[12px] text-gray-500">候補がまだありません。主催者に確かめてください。</p>}

      {/* コメント */}
      {participants.some((p) => p.comment) && (
        <section className="border-t border-gray-200 pt-3">
          <h2 className="text-[12px] font-bold mb-1.5">コメント</h2>
          <ul className="space-y-1">
            {participants.filter((p) => p.comment).map((p) => (
              <li key={p.id} className="text-[12px]"><span className="font-bold">{p.name}</span> <span className="text-gray-700">{p.comment}</span></li>
            ))}
          </ul>
        </section>
      )}

      <div className="border-t border-gray-200 pt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
        <button type="button" onClick={() => void handleCopyUrl()} className="underline">{copied ? 'コピーしました' : 'このページのリンクをコピー'}</button>
        <button
          type="button"
          onClick={() => window.open(`https://line.me/R/msg/text/?${encodeURIComponent(window.location.href)}`, '_blank')}
          className="underline"
        >
          LINE で送る
        </button>
        <Link href="/?m=general-tools&t=schedule" className="underline ml-auto">日程調整を自分でも作る</Link>
      </div>
    </>
  );
};

export default ScheduleViewClient;
