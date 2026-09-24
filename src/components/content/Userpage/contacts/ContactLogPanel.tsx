'use client';
/**
 * 連絡先カードの中の「やり取りの履歴」。いつ・何を問い合わせ、どう返ってきたかを時系列で残す。
 * サンプルは状態（依頼中 → 到着 → 返却）をその場で切り替え、見積は金額を持たせる。
 */
import React, { useState } from 'react';
import { LOG_KINDS, SAMPLE_STATES, newLogId, sortLog, todayYmd, daysBetween, RETURN_WARN_DAYS, type ContactLogEntry, type LogKind, type SampleState } from '@/lib/contactLog';

const fmtDate = (s: string) => {
  const [, m, d] = s.split('-').map(Number);
  return `${m}/${d}`;
};

export default function ContactLogPanel({
  log,
  project,
  disabled,
  onChange,
}: {
  log: ContactLogEntry[];
  project?: string;
  disabled?: boolean;
  onChange: (next: ContactLogEntry[]) => void;
}) {
  const [date, setDate] = useState(todayYmd());
  const [kind, setKind] = useState<LogKind>('問合せ');
  const [text, setText] = useState('');
  const [amount, setAmount] = useState('');
  const today = todayYmd();

  const add = () => {
    if (!text.trim() && kind !== '見積') return;
    const entry: ContactLogEntry = {
      id: newLogId(),
      date,
      kind,
      text: text.trim(),
      ...(kind === 'サンプル' ? { status: '依頼中' as SampleState } : {}),
      ...(kind === '見積' ? { amount: amount ? Number(amount.replace(/[^\d]/g, '')) || null : null } : {}),
      ...(project?.trim() ? { project: project.trim() } : {}),
    };
    onChange([...log, entry]);
    setText('');
    setAmount('');
  };

  const patch = (id: string, p: Partial<ContactLogEntry>) => onChange(log.map((e) => (e.id === id ? { ...e, ...p } : e)));
  const remove = (id: string) => onChange(log.filter((e) => e.id !== id));

  return (
    <div className="border-t border-gray-200 bg-gray-50 p-2 space-y-1.5 text-[11px]">
      {!disabled && (
        <div className="space-y-1">
          <div className="flex gap-1">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-gray-300 px-1 py-0.5 w-[112px]" />
            <select value={kind} onChange={(e) => setKind(e.target.value as LogKind)} className="border border-gray-300 px-1 py-0.5 flex-1">
              {LOG_KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-1">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) add();
              }}
              placeholder={kind === 'サンプル' ? '品名・品番・色' : kind === '見積' ? '見積の件名' : '内容（Enter で追加）'}
              className="border border-gray-300 px-1.5 py-0.5 flex-1 min-w-0"
            />
            {kind === '見積' && (
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="金額" inputMode="numeric" className="border border-gray-300 px-1 py-0.5 w-20 text-right" />
            )}
            <button type="button" onClick={add} className="px-2 py-0.5 bg-gray-800 text-white shrink-0">
              追加
            </button>
          </div>
        </div>
      )}

      {log.length === 0 ? (
        <p className="text-gray-400">まだ記録がありません</p>
      ) : (
        <ul className="max-h-48 overflow-y-auto divide-y divide-gray-200">
          {sortLog(log).map((e) => {
            const late = e.kind === 'サンプル' && e.status === '到着' && daysBetween(e.date, today) >= RETURN_WARN_DAYS;
            return (
              <li key={e.id} className="py-1 flex gap-1.5 items-start group">
                <span className="text-gray-500 shrink-0 w-9">{fmtDate(e.date)}</span>
                <span className="shrink-0 px-1 border border-gray-300 bg-white">{e.kind}</span>
                <span className="flex-1 min-w-0 break-words">
                  {e.text}
                  {e.kind === '見積' && e.amount != null && <span className="ml-1 font-bold">¥{e.amount.toLocaleString()}</span>}
                  {e.source && <span className="ml-1 text-[9px] text-gray-400">（{e.source}）</span>}
                </span>
                {e.kind === 'サンプル' && (
                  <select
                    value={e.status ?? '依頼中'}
                    disabled={disabled}
                    onChange={(ev) => patch(e.id, { status: ev.target.value as SampleState })}
                    className={`shrink-0 border px-0.5 ${late ? 'border-red-500 text-red-700' : 'border-gray-300'}`}
                    title={late ? `到着から ${daysBetween(e.date, today)} 日。返却を確認してください` : 'サンプルの状態'}
                  >
                    {SAMPLE_STATES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                )}
                {!disabled && (
                  <button type="button" onClick={() => remove(e.id)} className="shrink-0 text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100" aria-label="記録を消す">
                    ✕
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
