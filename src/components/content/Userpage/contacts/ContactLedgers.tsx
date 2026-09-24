'use client';
/**
 * 全連絡先を横断した台帳: サンプル（返却待ち・依頼中）と見積の履歴。
 */
import React, { useState } from 'react';
import { sampleLedger, quoteLedger, SAMPLE_STATES, RETURN_WARN_DAYS, type ContactWithLog, type SampleState } from '@/lib/contactLog';

export function SampleLedger({
  contacts,
  today,
  onStatus,
  onOpen,
}: {
  contacts: ContactWithLog[];
  today: string;
  onStatus: (contactId: string, entryId: string, status: SampleState) => void;
  onOpen: (company: string) => void;
}) {
  const [all, setAll] = useState(false);
  const rows = sampleLedger(contacts, today, all);
  return (
    <div className="text-xs">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-gray-500">到着から {RETURN_WARN_DAYS} 日を過ぎたサンプルは赤で出します（返し忘れ防止）</p>
        <label className="flex items-center gap-1 text-[11px]">
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> 返却済みも出す
        </label>
      </div>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-gray-400">手元にあるサンプル・依頼中のサンプルはありません。連絡先カードの「履歴」で「サンプル」を記録すると、ここに並びます</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-[11px] text-gray-500 border-b border-gray-300">
              <th className="py-1 font-normal">依頼・到着日</th>
              <th className="font-normal">会社</th>
              <th className="font-normal">担当</th>
              <th className="font-normal">品名</th>
              <th className="font-normal">案件</th>
              <th className="font-normal">経過</th>
              <th className="font-normal">状態</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const late = r.entry.status === '到着' && r.days >= RETURN_WARN_DAYS;
              return (
                <tr key={r.contactId + r.entry.id} className={`border-b border-gray-100 ${late ? 'text-red-700' : ''}`}>
                  <td className="py-1 whitespace-nowrap pr-2">{r.entry.date}</td>
                  <td>
                    <button type="button" className="underline text-left" onClick={() => onOpen(r.company)}>
                      {r.company || '（会社名なし）'}
                    </button>
                  </td>
                  <td>{r.name}</td>
                  <td className="break-words">{r.entry.text}</td>
                  <td>{r.entry.project ?? ''}</td>
                  <td className="whitespace-nowrap">{r.days} 日</td>
                  <td>
                    <select value={r.entry.status ?? '依頼中'} onChange={(e) => onStatus(r.contactId, r.entry.id, e.target.value as SampleState)} className="border border-gray-300 px-0.5">
                      {SAMPLE_STATES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function QuoteLedger({ contacts, today, onOpen }: { contacts: ContactWithLog[]; today: string; onOpen: (company: string) => void }) {
  const { rows, byProject } = quoteLedger(contacts, today);
  if (!rows.length) return <p className="py-8 text-center text-gray-400 text-xs">見積の記録はありません。連絡先カードの「履歴」で「見積」を金額つきで記録すると、案件ごとに集計します</p>;
  return (
    <div className="text-xs grid gap-4 md:grid-cols-[1fr_220px]">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left text-[11px] text-gray-500 border-b border-gray-300">
            <th className="py-1 font-normal">日付</th>
            <th className="font-normal">会社</th>
            <th className="font-normal">件名</th>
            <th className="font-normal">案件</th>
            <th className="font-normal text-right">金額</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.contactId + r.entry.id} className="border-b border-gray-100">
              <td className="py-1 whitespace-nowrap pr-2">{r.entry.date}</td>
              <td>
                <button type="button" className="underline text-left" onClick={() => onOpen(r.company)}>
                  {r.company || '（会社名なし）'}
                </button>
              </td>
              <td className="break-words">{r.entry.text}</td>
              <td>{r.entry.project ?? ''}</td>
              <td className="text-right whitespace-nowrap">{r.entry.amount != null ? `¥${r.entry.amount.toLocaleString()}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <div className="text-[11px] text-gray-500 border-b border-gray-300 py-1">案件ごとの合計</div>
        <ul>
          {byProject.map((p) => (
            <li key={p.project} className="flex justify-between py-1 border-b border-gray-100">
              <span>
                {p.project} <span className="text-gray-400">{p.count}件</span>
              </span>
              <span className="font-bold">¥{p.total.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
