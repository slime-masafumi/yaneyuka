'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
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
import { FiCopy } from 'react-icons/fi';

interface ScheduleViewClientProps {
  slug: string;
}

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
  // 一時的な回答状態（送信前）
  const [tempResponses, setTempResponses] = useState<Map<string, ResponseValue>>(new Map());

  // スケジュールを読み込む
  const loadSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const scheduleDoc = await getDoc(doc(db, 'schedules', slug));
      
      if (!scheduleDoc.exists()) {
        setError('スケジュールが見つかりません');
        setLoading(false);
        return;
      }

      const scheduleData = { id: scheduleDoc.id, ...scheduleDoc.data() } as Schedule;
      
      // 公開設定のチェック
      if (!scheduleData.isPublic) {
        setError('このスケジュールは会員限定です');
        setLoading(false);
        return;
      }

      setSchedule(scheduleData);

      // オプションを読み込み
      const optionsSnapshot = await getDocs(
        query(
          collection(db, 'schedules', slug, 'options'),
          orderBy('order')
        )
      );
      const optionsData = optionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ScheduleOption[];
      setOptions(optionsData);

      // 参加者を読み込み
      const participantsSnapshot = await getDocs(
        query(
          collection(db, 'schedules', slug, 'participants'),
          orderBy('createdAt', 'desc')
        )
      );
      const participantsData = participantsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ScheduleParticipant[];
      setParticipants(participantsData);

      // 回答を読み込み
      const responsesSnapshot = await getDocs(
        collection(db, 'schedules', slug, 'responses')
      );
      const responsesData = responsesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ScheduleResponse[];
      setResponses(responsesData);

      // 集計を計算
      const summaryMap = new Map<string, OptionSummary>();
      optionsData.forEach((opt) => {
        summaryMap.set(opt.id, { optionId: opt.id, yes: 0, maybe: 0, no: 0, total: 0 });
      });

      responsesData.forEach((resp) => {
        const summary = summaryMap.get(resp.optionId);
        if (summary) {
          summary[resp.value]++;
          summary.total++;
        }
      });

      setSummaries(Array.from(summaryMap.values()));
      setLoading(false);
    } catch (err) {
      console.error('スケジュール読み込みエラー:', err);
      setError('スケジュールの読み込みに失敗しました');
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadSchedule();
    // ローカルストレージから自分の参加者IDを読み込む
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem(`schedule_${slug}_participantId`);
      if (savedId) {
        setMyParticipantId(savedId);
        // 参加者名も復元
        const savedName = localStorage.getItem(`schedule_${slug}_participantName`);
        if (savedName) {
          setParticipantName(savedName);
        }
      }
    }
  }, [loadSchedule, slug]);

  // オプションが読み込まれたら、既存の回答を一時的な回答に反映
  useEffect(() => {
    if (myParticipantId && options.length > 0 && responses.length > 0) {
      const myResponses = new Map<string, ResponseValue>();
      responses
        .filter(r => r.participantId === myParticipantId)
        .forEach(r => {
          myResponses.set(r.optionId, r.value);
        });
      // 未回答のオプションはmaybeで初期化
      options.forEach(option => {
        if (!myResponses.has(option.id)) {
          myResponses.set(option.id, 'maybe');
        }
      });
      setTempResponses(myResponses);
    }
  }, [myParticipantId, options, responses]);

  // 参加者を追加
  const handleAddParticipant = async () => {
    if (!schedule || !participantName.trim()) {
      alert('名前を入力してください');
      return;
    }

    try {
      const participantData: Omit<ScheduleParticipant, 'id'> = {
        name: participantName.trim(),
        comment: participantComment.trim() || undefined,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
      };

      const participantRef = await addDoc(
        collection(db, 'schedules', schedule.id, 'participants'),
        participantData
      );

      // ローカルストレージに保存
      if (typeof window !== 'undefined') {
        localStorage.setItem(`schedule_${schedule.id}_participantId`, participantRef.id);
        localStorage.setItem(`schedule_${schedule.id}_participantName`, participantName.trim());
      }
      setMyParticipantId(participantRef.id);

      // 参加者追加時は一時的な回答を初期化（未選択状態）
      const initialTempResponses = new Map<string, ResponseValue>();
      options.forEach(option => {
        initialTempResponses.set(option.id, 'maybe');
      });
      setTempResponses(initialTempResponses);

      setParticipantComment('');
      await loadSchedule();
    } catch (error) {
      console.error('参加者追加エラー:', error);
      alert('参加者の追加に失敗しました');
    }
  };

  // 一時的な回答を更新（送信前）
  const handleUpdateTempResponse = (optionId: string, value: ResponseValue) => {
    setTempResponses(prev => {
      const newMap = new Map(prev);
      newMap.set(optionId, value);
      return newMap;
    });
  };

  // 回答を一括送信
  const handleSubmitResponses = async () => {
    if (!schedule || !myParticipantId) return;

    // すべての候補日が選択されているかチェック
    const unselectedOptions = options.filter(option => !tempResponses.has(option.id));
    if (unselectedOptions.length > 0) {
      alert('全ての候補日をチェックして下さい');
      return;
    }

    try {
      // すべての回答を送信
      for (const option of options) {
        const value = tempResponses.get(option.id);
        if (!value) continue;

        // 既存の回答を検索
        const existingResponse = responses.find(
          (r) => r.participantId === myParticipantId && r.optionId === option.id
        );

        if (existingResponse) {
          await updateDoc(
            doc(db, 'schedules', schedule.id, 'responses', existingResponse.id),
            { value }
          );
        } else {
          await addDoc(collection(db, 'schedules', schedule.id, 'responses'), {
            participantId: myParticipantId,
            optionId: option.id,
            value,
          });
        }
      }

      // 一時的な回答をクリア
      setTempResponses(new Map());
      await loadSchedule();
    } catch (error) {
      console.error('回答送信エラー:', error);
      alert('回答の送信に失敗しました');
    }
  };

  // URLをコピー
  const handleCopyUrl = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';

    try {
      await navigator.clipboard.writeText(url);
      alert('URLをコピーしました');
    } catch {
      alert('コピーに失敗しました');
    }
  };

  // LINEで共有
  const handleLineShare = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const encoded = encodeURIComponent(url);
    const lineUrl = `https://line.me/R/msg/text/?${encoded}`;
    window.open(lineUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-sm text-red-600">{error || 'スケジュールが見つかりません'}</p>
        </div>
      </div>
    );
  }

  const maxYes = Math.max(...summaries.map((s) => s.yes), 0);
  const currentParticipant = myParticipantId
    ? participants.find((p) => p.id === myParticipantId)
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg p-6 space-y-4 text-center">
        {/* ヘッダー */}
        <div className="mb-4">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">yaneyuka</h1>
          <p className="text-sm text-gray-600 font-semibold">建築・建設業界の業務支援ポータルサイト</p>
        </div>
        <div className="border-t border-gray-200 pt-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">{schedule.title}</h2>
          {schedule.description && (
            <p className="text-xs text-gray-600 mb-2">{schedule.description}</p>
          )}
          <p className="text-xs text-gray-500">
            主催者: {schedule.ownerName}
          </p>
        </div>

        {/* 参加者追加フォーム */}
        {!currentParticipant ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 text-left">お名前</label>
              <input
                type="text"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="名前を入力してください"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 text-left">コメント（任意）</label>
              <input
                type="text"
                value={participantComment}
                onChange={(e) => setParticipantComment(e.target.value)}
                placeholder="コメントを入力してください"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-gray-400"
              />
            </div>
            <button
              onClick={handleAddParticipant}
              className="w-full px-6 py-3 rounded text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#1DAD95' }}
            >
              参加する
            </button>
          </div>
        ) : (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-xs text-gray-700">
              <span className="font-semibold">{currentParticipant.name}</span> として参加中
            </p>
            {currentParticipant.comment && (
              <p className="text-xs text-gray-600 mt-1">コメント: {currentParticipant.comment}</p>
            )}
          </div>
        )}

        {/* 回答テーブル */}
        {currentParticipant && options.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-900 mb-3 text-left">候補日程</h3>
            <div className="overflow-x-auto border border-gray-200 rounded">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 p-2 text-left font-medium text-gray-700">候補</th>
                    {participants.map((participant) => (
                      <th key={participant.id} className="border border-gray-200 p-2 text-center min-w-[80px] font-medium text-gray-700">
                        {participant.name}
                      </th>
                    ))}
                    <th className="border border-gray-200 p-2 text-center bg-yellow-50 font-medium text-gray-700">集計</th>
                  </tr>
                </thead>
                <tbody>
                  {options.map((option) => {
                    const summary = summaries.find((s) => s.optionId === option.id);
                    const isHighlighted = summary && summary.yes === maxYes && maxYes > 0;

                    return (
                      <tr key={option.id} className={isHighlighted ? 'bg-green-50' : ''}>
                        <td className="border border-gray-200 p-2 font-medium text-gray-900">{option.label}</td>
                        {participants.map((participant) => {
                          const response = responses.find(
                            (r) => r.participantId === participant.id && r.optionId === option.id
                          );
                          const savedValue = response?.value;
                          
                          // 自分の回答は一時的な回答を優先表示（未送信の場合）
                          const isMyResponse = currentParticipant && currentParticipant.id === participant.id;
                          const displayValue = isMyResponse && tempResponses.has(option.id)
                            ? tempResponses.get(option.id)!
                            : (savedValue || 'maybe');

                          return (
                            <td key={participant.id} className="border border-gray-200 p-2">
                              {isMyResponse ? (
                                <div className="flex justify-center gap-1">
                                  <button
                                    onClick={() => handleUpdateTempResponse(option.id, 'yes')}
                                    className={`w-7 h-7 rounded flex items-center justify-center transition ${
                                      displayValue === 'yes'
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-100 hover:bg-green-200'
                                    }`}
                                    title="○"
                                  >
                                    <span className="text-sm">〇</span>
                                  </button>
                                  <button
                                    onClick={() => handleUpdateTempResponse(option.id, 'maybe')}
                                    className={`w-7 h-7 rounded flex items-center justify-center transition ${
                                      displayValue === 'maybe'
                                        ? 'bg-yellow-500 text-white'
                                        : 'bg-gray-100 hover:bg-yellow-200'
                                    }`}
                                    title="△"
                                  >
                                    <span className="text-sm">△</span>
                                  </button>
                                  <button
                                    onClick={() => handleUpdateTempResponse(option.id, 'no')}
                                    className={`w-7 h-7 rounded flex items-center justify-center transition ${
                                      displayValue === 'no'
                                        ? 'bg-red-500 text-white'
                                        : 'bg-gray-100 hover:bg-red-200'
                                    }`}
                                    title="×"
                                  >
                                    <span className="text-sm">✕</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="flex justify-center">
                                  {savedValue === 'yes' && (
                                    <span className="text-green-600 text-lg">〇</span>
                                  )}
                                  {savedValue === 'maybe' && (
                                    <span className="text-yellow-600 text-lg">△</span>
                                  )}
                                  {savedValue === 'no' && (
                                    <span className="text-red-600 text-lg">✕</span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="border border-gray-200 p-2 text-center bg-yellow-50">
                          {summary && (
                            <div className="text-xs">
                              <span className="text-green-600 font-medium">〇{summary.yes}</span>
                              {' / '}
                              <span className="text-yellow-600 font-medium">△{summary.maybe}</span>
                              {' / '}
                              <span className="text-red-600 font-medium">✕{summary.no}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {maxYes > 0 && (
              <p className="text-xs text-gray-600 mt-2">
                <span className="bg-green-50 px-2 py-1 rounded">緑色の行</span>は〇が最多の候補です
              </p>
            )}
            {/* 送信ボタン */}
            <div className="mt-4">
              <button
                onClick={handleSubmitResponses}
                className="w-full px-6 py-3 rounded text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#1DAD95' }}
              >
                回答を送信
              </button>
            </div>
          </div>
        )}

        {/* コメント一覧 */}
        {participants.some((p) => p.comment) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-gray-900 mb-3 text-left">コメント</h3>
            <div className="space-y-2">
              {participants
                .filter((p) => p.comment)
                .map((participant) => (
                  <div key={participant.id} className="p-2 bg-gray-50 rounded border border-gray-200 text-left">
                    <span className="text-xs font-medium text-gray-900">{participant.name}:</span>{' '}
                    <span className="text-xs text-gray-700">{participant.comment}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* フッター */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <a
            href="https://yaneyuka.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            yaneyuka.com を開く
          </a>
        </div>
        <button
          type="button"
          onClick={() => window.location.href = '/'}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          トップページへ戻る
        </button>
      </div>
    </div>
  );
};

export default ScheduleViewClient;

