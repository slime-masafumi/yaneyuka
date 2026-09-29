'use client';
/**
 * 全連絡先を横断した台帳: やり取りの履歴（全社の時系列）、サンプル（返却待ち・依頼中）、見積の履歴。
 */
import React, { useState } from 'react';
import { sampleLedger, quoteLedger, sortLog, SAMPLE_STATES, RETURN_WARN_DAYS, LOG_KINDS, type ContactWithLog, type SampleState, type LogKind } from '@/lib/contactLog';

const MONO = 'yy-mono text-[10px] tracking-[0.12em] uppercase text-gray-500';
const TH = 'py-1 font-normal yy-mono text-[10px] tracking-[0.12em] uppercase text-gray-500 whitespace-nowrap pr-2';

/**
 * 全連絡先のやり取りを新しい順に 1 本の時系列で見る。
 * 履歴は各カードの中に畳まれていて、記録が溜まっていても見えていなかった。
 * 建材ページ・Maker conect から自動で残った記録（記録元あり）もここに並ぶ。
 */
export function LogTimeline({
  contacts,
  onOpen,
}: {
  contacts: ContactWithLog[];
  onOpen: (company: string, contactId: string) => void;
}) {
  const [kind, setKind] = useState<LogKind | ''>('');
  const [limit, setLimit] = useState(100);
  const rows = contacts
    .flatMap((c) => sortLog(c.log).map((e) => ({ c, e })))
    .filter((r) => !kind || r.e.kind === kind)
    .sort((a, b) => (a.e.date === b.e.date ? (a.e.id < b.e.id ? 1 : -1) : a.e.date < b.e.date ? 1 : -1));

  return (
    <div className="text-xs">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
        <span className={MONO}>{rows.length} ENTRIES</span>
        <select value={kind} onChange={(e) => setKind(e.target.value as LogKind | '')} className="border border-gray-300 px-1 py-0.5 text-[11px]">
          <option value="">すべての種類</option>
          {LOG_KINDS.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <span className="text-[11px] text-gray-500">建材ページでメーカーの「お問い合わせ」「カタログ」「サンプル」を開くと、ここに自動で残ります（ログイン中）</span>
      </div>
      {rows.length === 0 ? (
        <p className="py-4 text-[12px] text-gray-500">まだ記録がありません。連絡先カードの「やり取り」から記録するか、建材ページでメーカーの窓口を開くと残ります。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[520px]">
            <thead>
              <tr className="text-left border-b border-[#3b3b3b]">
                <th className={TH}>日付</th>
                <th className={TH}>会社</th>
                <th className={TH}>種類</th>
                <th className={TH}>内容</th>
                <th className={TH}>記録元</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map(({ c, e }) => (
                <tr key={(c.id ?? '') + e.id} className="border-b border-gray-100 align-top">
                  <td className="py-1 pr-2 whitespace-nowrap yy-mono text-[11px] text-gray-600">{e.date}</td>
                  <td className="pr-2">
                    <button type="button" className="underline decoration-gray-300 hover:decoration-[#141414] text-left" onClick={() => onOpen(c.company ?? '', c.id ?? '')}>
                      {c.company || '（会社名なし）'}
                    </button>
                    {c.name && <span className="block text-[10px] text-gray-400">{c.name}</span>}
                  </td>
                  <td className="pr-2 whitespace-nowrap">{e.kind}{e.kind === 'サンプル' && e.status ? <span className="text-gray-400">・{e.status}</span> : null}</td>
                  <td className="pr-2 break-words">
                    {e.text}
                    {e.kind === '見積' && e.amount != null && <span className="ml-1 font-bold">¥{e.amount.toLocaleString()}</span>}
                  </td>
                  <td className="whitespace-nowrap text-[10px] text-gray-400">{e.source ?? '手入力'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > limit && (
            <button type="button" onClick={() => setLimit((n) => n + 200)} className="mt-2 text-[11px] underline text-gray-600">
              さらに表示（残り {rows.length - limit}）
            </button>
          )}
        </div>
      )}
    </div>
  );
}

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
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="text-[11px] text-gray-500">到着から {RETURN_WARN_DAYS} 日を過ぎたサンプルは赤で出します（返し忘れ防止）</p>
        <label className="flex items-center gap-1 text-[11px]">
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> 返却済みも出す
        </label>
      </div>
      {rows.length === 0 ? (
        <p className="py-4 text-[12px] text-gray-500">手元にあるサンプル・依頼中のサンプルはありません。連絡先カードの「やり取り」で種類を「サンプル」にして記録すると、ここに並びます。</p>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[560px]">
          <thead>
            <tr className="text-left border-b border-[#3b3b3b]">
              <th className={TH}>依頼・到着日</th>
              <th className={TH}>会社</th>
              <th className={TH}>担当</th>
              <th className={TH}>品名</th>
              <th className={TH}>案件</th>
              <th className={TH}>経過</th>
              <th className={TH}>状態</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const late = r.entry.status === '到着' && r.days >= RETURN_WARN_DAYS;
              return (
                <tr key={r.contactId + r.entry.id} className={`border-b border-gray-100 ${late ? 'text-red-700' : ''}`}>
                  <td className="py-1 whitespace-nowrap pr-2 yy-mono text-[11px]">{r.entry.date}</td>
                  <td>
                    <button type="button" className="underline text-left" onClick={() => onOpen(r.company)}>
                      {r.company || '（会社名なし）'}
                    </button>
                  </td>
                  <td>{r.name}</td>
                  <td className="break-words">{r.entry.text}</td>
                  <td>{r.entry.project ?? ''}</td>
                  <td className="whitespace-nowrap yy-mono text-[11px]">{r.days} 日</td>
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
        </div>
      )}
    </div>
  );
}

export function QuoteLedger({ contacts, today, onOpen }: { contacts: ContactWithLog[]; today: string; onOpen: (company: string) => void }) {
  const { rows, byProject } = quoteLedger(contacts, today);
  if (!rows.length) return <p className="py-4 text-[12px] text-gray-500">見積の記録はありません。連絡先カードの「やり取り」で種類を「見積」にして金額つきで記録すると、案件ごとに集計します。</p>;
  return (
    <div className="text-xs grid gap-4 md:grid-cols-[1fr_220px]">
      <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[440px]">
        <thead>
          <tr className="text-left border-b border-[#3b3b3b]">
            <th className={TH}>日付</th>
            <th className={TH}>会社</th>
            <th className={TH}>件名</th>
            <th className={TH}>案件</th>
            <th className={`${TH} text-right`}>金額</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.contactId + r.entry.id} className="border-b border-gray-100">
              <td className="py-1 whitespace-nowrap pr-2 yy-mono text-[11px]">{r.entry.date}</td>
              <td>
                <button type="button" className="underline text-left" onClick={() => onOpen(r.company)}>
                  {r.company || '（会社名なし）'}
                </button>
              </td>
              <td className="break-words">{r.entry.text}</td>
              <td>{r.entry.project ?? ''}</td>
              <td className="text-right whitespace-nowrap yy-mono text-[11px]">{r.entry.amount != null ? `¥${r.entry.amount.toLocaleString()}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div>
        <div className={`${MONO} border-b border-[#3b3b3b] py-1`}>案件ごとの合計</div>
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
