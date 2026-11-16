'use client';

/**
 * 業務管理の日報の下に出す「事務所へ送る」。2026-11-16
 * その日の行（案件と時間が入っている行）を、物件の台帳の名前（ProjectPicker）で事務所の工数
 * offices/{id}/workHours/{uid_日付_行} へ送る。送るのは押したときだけ（自動では送らない）。
 * 業務管理の案件 → 事務所での物件名 の対応は、このブラウザに覚える（次からは選ばなくてよい）。
 */
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProjectPicker from '@/components/ui/ProjectPicker';
import { useAuth } from '@/lib/AuthContext';
import { useProjectRegistry } from '@/lib/projectRegistry';
import { shareDayHours, subscribeMyDayHours, useMyOffice, workHourRowId, type Office, type WorkHourRow } from '@/lib/office';
import type { WorkEntry, WorkProject } from '@/lib/workLog';
import './office.css';

const ON_KEY = 'office_share_hours';
const MAP_KEY = 'office_project_map';

const readMap = (): Record<string, string> => {
  try {
    const d = JSON.parse(localStorage.getItem(MAP_KEY) || '{}');
    return d && typeof d === 'object' ? d : {};
  } catch {
    return {};
  }
};

type Props = { date: string; entries: WorkEntry[]; projects: WorkProject[] };

export default function OfficeHoursShare(props: Props) {
  const { currentUser } = useAuth();
  const my = useMyOffice();
  // 事務所に入っていない人には何も出さない（台帳の読み込みもしない）
  if (!currentUser || !my.office) return null;
  return <SharePanel {...props} uid={currentUser.uid} office={my.office} />;
}

function SharePanel({ date, entries, projects, uid, office }: Props & { uid: string; office: Office }) {
  const [on, setOn] = useState(false);
  const [map, setMap] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<WorkHourRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  // いま物件を選び直している業務管理の案件
  const [editing, setEditing] = useState<string | null>(null);
  const reg = useProjectRegistry();

  useEffect(() => {
    try {
      setOn(localStorage.getItem(ON_KEY) === '1');
    } catch {
      /* 既定は切 */
    }
    setMap(readMap());
  }, []);

  const officeId = office.id;
  useEffect(() => {
    setSent([]);
    if (!on) return;
    return subscribeMyDayHours(officeId, uid, date, setSent);
  }, [officeId, uid, date, on]);
  useEffect(() => {
    setMsg('');
    setEditing(null);
  }, [date]);

  // 送る行（案件と時間が入っている行）
  const rows = useMemo(
    () =>
      entries
        .filter((e) => e.projectId && Number(e.hours) > 0)
        .map((e) => {
          const p = projects.find((x) => x.id === e.projectId);
          return {
            entry: e,
            label: p ? `${p.code ? `${p.code} : ` : ''}${p.name}` : '（削除した案件）',
            project: map[e.projectId] ?? p?.name ?? '',
          };
        }),
    [entries, projects, map],
  );

  const toggle = (v: boolean) => {
    setOn(v);
    try {
      localStorage.setItem(ON_KEY, v ? '1' : '0');
    } catch {
      /* 覚えられなくても、今は使える */
    }
  };
  const setProject = (workProjectId: string, name: string) => {
    const next = { ...map, [workProjectId]: name };
    setMap(next);
    try {
      localStorage.setItem(MAP_KEY, JSON.stringify(next));
    } catch {
      /* 同上 */
    }
  };

  // 送った内容と今の日報が同じか
  const key = (id: string, project: string, hours: number, task: string, phase: string) => [id, project.trim(), Math.round(hours * 100) / 100, task, phase].join('\u0001');
  const want = rows
    .filter((r) => r.project.trim())
    .map((r) => key(workHourRowId(uid, date, r.entry.id), r.project, Number(r.entry.hours), r.entry.description || '', r.entry.phase || ''))
    .sort();
  const have = sent.map((s) => key(s.id, s.project, Number(s.hours), s.task || '', s.phase || '')).sort();
  const inSync = want.join('\n') === have.join('\n');
  const sentTotal = sent.reduce((a, s) => a + (Number(s.hours) || 0), 0);
  const missing = rows.filter((r) => !r.project.trim()).length;

  const send = async () => {
    setBusy(true);
    setMsg('');
    try {
      const n = await shareDayHours(
        office.id,
        uid,
        date,
        rows.map((r) => ({ entryId: r.entry.id, project: r.project, hours: Number(r.entry.hours), task: r.entry.description, phase: r.entry.phase })),
      );
      setMsg(n ? `${n} 行を事務所へ送りました` : 'この日の事務所の工数を空にしました');
    } catch {
      setMsg('送れませんでした（事務所から外れた・通信の問題の可能性があります）');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="yy-office-share">
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input type="checkbox" checked={on} onChange={(e) => toggle(e.target.checked)} className="w-3 h-3 accent-[#3b3b3b]" />
        事務所「{office.name}」に工数を送る
        <span className="text-gray-400">（物件ごと・メンバーごとに集計されます）</span>
      </label>
      {on && (
        <>
          {rows.length === 0 ? (
            <p className="mt-2 text-gray-500">この日は、案件と時間が入った行がまだありません。</p>
          ) : (
            <div className="yy-office-share__rows">
              <span className="yy-office__kicker">業務管理の案件</span>
              <span className="yy-office__kicker">事務所での物件名（台帳）</span>
              <span className="yy-office__kicker" style={{ textAlign: 'right' }}>h</span>
              {rows.map((r) => (
                <React.Fragment key={r.entry.id}>
                  <span className="yy-office-share__src truncate" title={r.entry.description || undefined}>
                    {r.label}
                    {r.entry.description ? <span className="text-gray-400"> · {r.entry.description}</span> : null}
                  </span>
                  {/* 物件を選ぶ欄は 1 つずつ開く（台帳の読み込みを行の数だけ重ねない） */}
                  {editing === r.entry.projectId ? (
                    <span className="flex items-center gap-2 min-w-0">
                      <ProjectPicker value={r.project} onChange={(v) => setProject(r.entry.projectId, v)} label="事務所での物件名" placeholder="物件を選ぶ" />
                      <button type="button" className="yy-office__link" onClick={() => setEditing(null)}>決定</button>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={`truncate ${r.project ? '' : 'text-[#9A5040]'}`}>{r.project || '未選択'}</span>
                      {r.project && reg.find(r.project) && <span className="yy-office__tag">台帳</span>}
                      <button type="button" className="yy-office__link" onClick={() => setEditing(r.entry.projectId)}>選ぶ</button>
                    </span>
                  )}
                  <span className="yy-office__num" style={{ textAlign: 'right' }}>{Number(r.entry.hours).toFixed(1)}</span>
                </React.Fragment>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <button type="button" className="yy-btn" disabled={busy || (!rows.length && !sent.length) || missing > 0} onClick={() => void send()}>
              {busy ? '送信中…' : 'この日の工数を事務所へ送る'}
            </button>
            <span className={inSync ? 'text-gray-500' : 'text-[#9A5040]'}>
              {sent.length ? `送信済み ${sent.length} 行・${(Math.round(sentTotal * 10) / 10).toFixed(1)} h` : '未送信'}
              {!inSync && (sent.length || rows.length) ? '（日報と違います）' : ''}
            </span>
            {missing > 0 && <span className="text-[#9A5040]">物件名が空の行が {missing} 行あります</span>}
            <Link href="/office/" className="underline underline-offset-2 text-gray-500 hover:text-gray-900">
              事務所の工数集計
            </Link>
          </div>
          {msg && <p className="mt-1 text-gray-600">{msg}</p>}
        </>
      )}
    </div>
  );
}
