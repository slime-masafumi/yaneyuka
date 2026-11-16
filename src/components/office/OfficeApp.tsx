'use client';

/**
 * 事務所（/office）。事務所を作る・招待を受ける・抜ける、メンバー、工数集計（物件 × メンバー × 月）。2026-11-16
 * 共有の予定は Myカレンダー、共有の連絡先は担当連絡先、工数の送り出しは業務管理の日報に出る。
 * データの置き場と権限は src/lib/office.ts と firestore.rules の「事務所」の節。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { openLogin } from '@/lib/openLogin';
import {
  acceptInvite,
  cancelInvite,
  clearStaleOffice,
  createOffice,
  declineInvite,
  dissolveOffice,
  downloadText,
  hoursMatrix,
  inviteByEmail,
  leaveOffice,
  matrixCsv,
  monthRange,
  removeMember,
  renameOffice,
  rowsCsv,
  subscribeWorkHours,
  useMemberNames,
  useMyOffice,
  useRecentMonths,
  type Office,
  type WorkHourRow,
} from '@/lib/office';
import './office.css';

const errText = (e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes('permission') ? '権限がないため実行できませんでした（すでに別の事務所に入っている・招待が取り消された等）' : msg;
};

export default function OfficeApp() {
  const { currentUser, authReady } = useAuth();
  const my = useMyOffice();

  if (!authReady) return <div className="yy-office"><p className="yy-office__muted">読み込み中...</p></div>;

  return (
    <div className="yy-office">
      <div className="yy-office__sechead" style={{ marginTop: 16 }}>
        <div>
          <p className="yy-office__kicker">[ OFFICE ]</p>
          <h1 className="yy-office__sectitle" style={{ fontSize: 16 }}>事務所</h1>
        </div>
        {my.office && <span className="yy-office__kicker">{String(my.office.memberUids.length).padStart(2, '0')} MEMBERS</span>}
      </div>
      <p className="yy-office__note">
        事務所のメンバーで、予定（Myカレンダー）・連絡先（担当連絡先）・物件ごとの工数（業務管理）を共有します。
        個人の予定・連絡先・日報はこれまでどおり本人だけのもので、共有するものだけを事務所へ入れます。
      </p>

      {!currentUser ? (
        <Guest />
      ) : !my.ready ? (
        <p className="yy-office__muted">読み込み中...</p>
      ) : my.stale ? (
        <Stale uid={currentUser.uid} />
      ) : my.office ? (
        <InOffice office={my.office} isOwner={my.isOwner} uid={currentUser.uid} userName={currentUser.username} sentInvites={my.sentInvites} />
      ) : (
        <NoOffice uid={currentUser.uid} invites={my.invites} />
      )}
    </div>
  );
}

function Guest() {
  return (
    <section className="yy-office__sec">
      <p className="yy-office__sectitle">ログインして使います</p>
      <ul className="yy-office__note" style={{ listStyle: 'none' }}>
        <li>・所長（オーナー）が事務所を作り、メンバーをメールアドレスで招待します（メール確認を済ませた会員だけ）</li>
        <li>・招待された人がこの画面で承諾すると、メンバーになります。1 人が入れる事務所は 1 つです</li>
        <li>・共有の予定・連絡先はメンバー全員が読み書きできます。工数は本人の分だけを本人が送ります</li>
        <li>・所長は、物件ごと・メンバーごとの月の工数を表で見て、CSV で保存できます</li>
      </ul>
      <button type="button" className="yy-btn is-primary" onClick={openLogin}>ログイン</button>
    </section>
  );
}

function Stale({ uid }: { uid: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  return (
    <section className="yy-office__sec">
      <p className="yy-office__note">
        入っていた事務所を読めません。メンバーから外されたか、事務所が解散した可能性があります。
        通信の問題でなければ、記録を消すと新しく事務所を作る・招待を受けることができます。
      </p>
      {err && <p className="yy-office__err">{err}</p>}
      <button
        type="button"
        className="yy-btn"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr('');
          try {
            await clearStaleOffice(uid);
          } catch (e) {
            setErr(errText(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        記録を消す
      </button>
    </section>
  );
}

function NoOffice({ uid, invites }: { uid: string; invites: ReturnType<typeof useMyOffice>['invites'] }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr('');
    try {
      await fn();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {invites.length > 0 && (
        <section className="yy-office__sec">
          <div className="yy-office__sechead">
            <span className="yy-office__sectitle">届いている招待</span>
            <span className="yy-office__kicker">{invites.length} INVITES</span>
          </div>
          <ul className="yy-office__list">
            {invites.map((inv) => (
              <li key={inv.id}>
                <span style={{ flex: 1 }}>
                  <b>{inv.officeName}</b>
                  {inv.invitedByName ? <span className="yy-office__muted">（{inv.invitedByName} さんから）</span> : null}
                </span>
                <button type="button" className="yy-btn is-primary" disabled={busy} onClick={() => run(() => acceptInvite(inv, uid))}>
                  参加する
                </button>
                <button type="button" className="yy-office__link" disabled={busy} onClick={() => run(() => declineInvite(inv))}>
                  断る
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="yy-office__sec">
        <div className="yy-office__sechead">
          <span className="yy-office__sectitle">事務所を作る</span>
          <span className="yy-office__kicker">あなたがオーナーになります</span>
        </div>
        <form
          className="yy-office__row"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) void run(() => createOffice(uid, name));
          }}
        >
          <input type="text" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="事務所の名前（例: ○○設計事務所）" aria-label="事務所の名前" style={{ flex: '1 1 240px' }} />
          <button type="submit" className="yy-btn is-primary" disabled={busy || !name.trim()}>作る</button>
        </form>
        <p className="yy-office__note">ほかの事務所に入るときは、その事務所のオーナーに、あなたのメールアドレスで招待してもらってください。</p>
        {err && <p className="yy-office__err">{err}</p>}
      </section>
    </>
  );
}

function InOffice({
  office,
  isOwner,
  uid,
  userName,
  sentInvites,
}: {
  office: Office;
  isOwner: boolean;
  uid: string;
  userName: string;
  sentInvites: ReturnType<typeof useMyOffice>['sentInvites'];
}) {
  const names = useMemberNames(office.memberUids);
  const [email, setEmail] = useState('');
  const [newName, setNewName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const inviteeNames = useMemberNames(sentInvites.map((i) => i.inviteeUid));
  const run = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      await fn();
      if (done) setMsg(done);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };
  const alone = office.memberUids.length <= 1;

  return (
    <>
      <section className="yy-office__sec">
        <div className="yy-office__sechead">
          {newName === null ? (
            <span className="yy-office__sectitle" style={{ fontSize: 15 }}>
              {office.name}
              {isOwner && (
                <button type="button" className="yy-office__link" style={{ marginLeft: 10 }} onClick={() => setNewName(office.name)}>
                  名前を変える
                </button>
              )}
            </span>
          ) : (
            <form
              className="yy-office__row"
              onSubmit={(e) => {
                e.preventDefault();
                void run(() => renameOffice(office.id, newName)).then(() => setNewName(null));
              }}
            >
              <input type="text" value={newName} maxLength={100} onChange={(e) => setNewName(e.target.value)} aria-label="事務所の名前" />
              <button type="submit" className="yy-btn" disabled={busy || !newName.trim()}>保存</button>
              <button type="button" className="yy-office__link" onClick={() => setNewName(null)}>やめる</button>
            </form>
          )}
          <span className="yy-office__kicker">{isOwner ? 'あなたはオーナー' : 'メンバー'}</span>
        </div>

        <ul className="yy-office__list">
          {office.memberUids.map((m) => (
            <li key={m}>
              <span style={{ flex: 1 }}>
                {names[m] ?? '…'}
                {m === uid && <span className="yy-office__muted">（あなた）</span>}
              </span>
              {m === office.ownerUid && <span className="yy-office__tag">オーナー</span>}
              {isOwner && m !== uid && (
                <button
                  type="button"
                  className="yy-office__link yy-office__link--danger"
                  disabled={busy}
                  onClick={() => {
                    if (confirm(`${names[m] ?? 'このメンバー'} を事務所から外しますか？（送った工数は集計に残ります）`)) void run(() => removeMember(office.id, m));
                  }}
                >
                  外す
                </button>
              )}
            </li>
          ))}
        </ul>

        {isOwner && (
          <>
            <form
              className="yy-office__row"
              style={{ marginTop: 10 }}
              onSubmit={(e) => {
                e.preventDefault();
                const target = email.trim();
                if (!target) return;
                void run(async () => {
                  const who = await inviteByEmail(office, uid, userName, target);
                  setEmail('');
                  setMsg(`${who} さんに招待を送りました。相手がこの画面（/office）で「参加する」を押すとメンバーになります`);
                });
              }}
            >
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="招待する人のメールアドレス（完全一致）" aria-label="招待する人のメールアドレス" style={{ flex: '1 1 260px' }} />
              <button type="submit" className="yy-btn is-primary" disabled={busy || !email.trim()}>招待する</button>
            </form>
            {sentInvites.length > 0 && (
              <ul className="yy-office__list" style={{ marginTop: 6 }}>
                {sentInvites.map((inv) => (
                  <li key={inv.id}>
                    <span style={{ flex: 1 }} className="yy-office__muted">
                      招待中: {inviteeNames[inv.inviteeUid] ?? '…'}
                    </span>
                    <button type="button" className="yy-office__link" disabled={busy} onClick={() => void run(() => cancelInvite(inv))}>
                      取り消す
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {msg && <p className="yy-office__note">{msg}</p>}
        {err && <p className="yy-office__err">{err}</p>}

        <div className="yy-office__row" style={{ marginTop: 12 }}>
          {!isOwner && (
            <button
              type="button"
              className="yy-office__link yy-office__link--danger"
              disabled={busy}
              onClick={() => {
                if (confirm(`「${office.name}」から抜けますか？（送った工数は事務所の集計に残ります）`)) void run(() => leaveOffice(office.id, uid));
              }}
            >
              事務所から抜ける
            </button>
          )}
          {isOwner && alone && (
            <button
              type="button"
              className="yy-office__link yy-office__link--danger"
              disabled={busy}
              onClick={() => {
                if (confirm(`「${office.name}」を解散しますか？共有の予定・連絡先・工数もすべて消え、元に戻せません。`)) void run(() => dissolveOffice(office.id, uid));
              }}
            >
              事務所を解散する
            </button>
          )}
          {isOwner && !alone && <span className="yy-office__muted">解散するときは、先にほかのメンバーを外してください。</span>}
        </div>
      </section>

      <HoursSummary office={office} names={names} />
    </>
  );
}

function HoursSummary({ office, names }: { office: Office; names: Record<string, string> }) {
  const months = useRecentMonths(13);
  const [ym, setYm] = useState(months[0]);
  const [rows, setRows] = useState<WorkHourRow[] | null>(null);
  useEffect(() => {
    setRows(null);
    const [s, e] = monthRange(ym);
    return subscribeWorkHours(office.id, s, e, setRows);
  }, [office.id, ym]);
  // 抜けたメンバーの名前も引く
  const allUids = useMemo(() => Array.from(new Set([...(rows ?? []).map((r) => r.uid), ...office.memberUids])), [rows, office.memberUids]);
  const allNames = useMemberNames(allUids);
  const nameOf = { ...allNames, ...names };
  const m = useMemo(() => hoursMatrix(rows ?? [], office.memberUids), [rows, office.memberUids]);
  const label = `${ym.replace('-', '年')}月`;
  const fmt = (n: number | undefined) => (n ? (Math.round(n * 10) / 10).toFixed(1) : '');

  return (
    <section className="yy-office__sec">
      <div className="yy-office__sechead">
        <span className="yy-office__sectitle">工数集計</span>
        <span className="yy-office__row">
          <select value={ym} onChange={(e) => setYm(e.target.value)} aria-label="集計する月">
            {months.map((x) => (
              <option key={x} value={x}>
                {x.replace('-', '年')}月
              </option>
            ))}
          </select>
          <button type="button" className="yy-btn" disabled={!m.projects.length} onClick={() => downloadText(matrixCsv(m, nameOf, label), `yaneyuka_工数集計_${ym}.csv`)}>
            集計表 CSV
          </button>
          <button type="button" className="yy-btn" disabled={!rows?.length} onClick={() => downloadText(rowsCsv(rows ?? [], nameOf), `yaneyuka_工数明細_${ym}.csv`)}>
            明細 CSV
          </button>
        </span>
      </div>
      {rows === null ? (
        <p className="yy-office__muted">読み込み中...</p>
      ) : !m.projects.length ? (
        <p className="yy-office__note">
          {label}の工数はまだありません。各メンバーが「業務管理」の日報で「事務所へ送る」を押すと、ここに物件ごと・メンバーごとに積み上がります。
        </p>
      ) : (
        <div className="yy-office__tablewrap">
          <table className="yy-office__table">
            <thead>
              <tr>
                <th>物件</th>
                {m.members.map((u) => (
                  <th key={u}>
                    {nameOf[u] ?? '…'}
                    {!office.memberUids.includes(u) && <span className="yy-office__muted">（退出）</span>}
                  </th>
                ))}
                <th>合計 h</th>
              </tr>
            </thead>
            <tbody>
              {m.projects.map((p) => (
                <tr key={p}>
                  <td>{p}</td>
                  {m.members.map((u) => (
                    <td key={u} className="yy-office__num">{fmt(m.cell[p]?.[u])}</td>
                  ))}
                  <td className="yy-office__num"><b>{fmt(m.projectTotal[p])}</b></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>合計</td>
                {m.members.map((u) => (
                  <td key={u} className="yy-office__num">{fmt(m.memberTotal[u])}</td>
                ))}
                <td className="yy-office__num">{fmt(m.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="yy-office__note">
        物件名は「物件の台帳」の名前で集まります。表記が違うと別の行になるので、送るときは候補から選んでください。
      </p>
    </section>
  );
}
