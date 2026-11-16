'use client';

/**
 * 担当連絡先の下に出す「事務所で共有」の連絡先（offices/{id}/contacts）。2026-11-16
 * メンバー全員が読み書きする。消せるのは足した人とオーナー（ルール側も同じ）。
 * 個人の連絡先（users/{uid}/contacts）はそのまま本人だけのもの。共有したいカードだけ「事務所に共有」で写す。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import {
  addOfficeContact,
  CONTACT_FIELDS,
  deleteOfficeContact,
  subscribeOfficeContacts,
  updateOfficeContact,
  type ContactField,
  type MyOffice,
  type OfficeContact,
} from '@/lib/office';
import './office.css';

const PLACEHOLDER: Record<ContactField, string> = {
  company: '会社名', dept: '部署名', role: '役職', name: '氏名', phone: '電話', email: 'mail', project: '案件', memo: 'memo',
};

type Props = {
  my: MyOffice;
  uid: string;
  userName: string;
  /** 検索語（個人の一覧と同じ語で絞る） */
  search?: string;
};

export default function OfficeContacts({ my, uid, userName, search = '' }: Props) {
  const office = my.office;
  const [list, setList] = useState<OfficeContact[]>([]);
  const [err, setErr] = useState('');
  // 打鍵ごとに書かない（0.6 秒待って書く）。書くまでは手元の値を見せる
  const [draft, setDraft] = useState<Record<string, Partial<Record<ContactField, string>>>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const officeId = office?.id ?? null;
  useEffect(() => {
    setList([]);
    if (!officeId) return;
    return subscribeOfficeContacts(officeId, setList);
  }, [officeId]);
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  const shown = useMemo(() => {
    const k = search.trim().toLowerCase();
    if (!k) return list;
    return list.filter((c) => CONTACT_FIELDS.some((f) => String(c[f] ?? '').toLowerCase().includes(k)));
  }, [list, search]);

  if (!office) return null;

  const edit = (id: string, field: ContactField, value: string) => {
    setDraft((d) => ({ ...d, [id]: { ...d[id], [field]: value } }));
    const key = `${id}:${field}`;
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => {
      updateOfficeContact(office.id, uid, id, field, value)
        .then(() =>
          setDraft((d) => {
            const cur = { ...d[id] };
            if (cur[field] === value) delete cur[field];
            return { ...d, [id]: cur };
          }),
        )
        .catch(() => setErr('保存できませんでした（事務所から外れた可能性があります）'));
    }, 600);
  };

  const add = async () => {
    setErr('');
    try {
      await addOfficeContact(office.id, uid, userName, { company: '' });
    } catch {
      setErr('追加できませんでした');
    }
  };

  const remove = async (c: OfficeContact) => {
    if (!confirm(`事務所の連絡先「${c.company || c.name || 'この連絡先'}」を削除しますか？メンバー全員の一覧から消えます。`)) return;
    try {
      await deleteOfficeContact(office.id, c.id);
    } catch {
      setErr('削除できるのは、足した人とオーナーだけです');
    }
  };

  return (
    <section className="yy-office-contacts" aria-label="事務所で共有の連絡先">
      <div className="yy-office-contacts__head">
        <span className="yy-office__kicker">[ OFFICE ]</span>
        <b style={{ fontSize: 12 }}>事務所で共有 — {office.name}</b>
        <span className="yy-office__kicker">{shown.length} CONTACTS</span>
        <span style={{ flex: 1 }} />
        <button type="button" className="yy-btn" onClick={() => void add()}>
          <FiPlus /> 共有の連絡先を追加
        </button>
      </div>
      <p className="yy-office__note" style={{ margin: '8px 12px' }}>
        メンバー全員が見て書き換えられる連絡先です。個人のカードの「事務所に共有」で写すこともできます（写したあとは別々のカード）。
      </p>
      {err && <p className="yy-office__err" style={{ margin: '0 12px' }}>{err}</p>}
      {shown.length === 0 ? (
        <p className="yy-office__muted" style={{ padding: '4px 12px 12px', fontSize: 11 }}>
          {search ? '検索条件に一致する共有の連絡先がありません。' : 'まだ共有の連絡先はありません。'}
        </p>
      ) : (
        <div className="yy-office-contacts__grid">
          {shown.map((c) => {
            const val = (f: ContactField) => draft[c.id]?.[f] ?? c[f] ?? '';
            const canDelete = c.createdBy === uid || my.isOwner;
            return (
              <div key={c.id} className="yy-office-contacts__card">
                <div className="yy-office-contacts__cardhead">
                  <input type="text" value={val('company')} placeholder="会社名" maxLength={200} onChange={(e) => edit(c.id, 'company', e.target.value)} aria-label="会社名" />
                  {canDelete && (
                    <button type="button" onClick={() => void remove(c)} title="削除" aria-label="削除" className="text-gray-300 hover:text-red-600 text-[13px]">
                      <FiTrash2 />
                    </button>
                  )}
                </div>
                {CONTACT_FIELDS.filter((f) => f !== 'company').map((f) =>
                  f === 'memo' ? (
                    <textarea key={f} rows={2} value={val(f)} placeholder={PLACEHOLDER[f]} maxLength={2000} onChange={(e) => edit(c.id, f, e.target.value)} aria-label={PLACEHOLDER[f]} />
                  ) : (
                    <input key={f} type="text" value={val(f)} placeholder={PLACEHOLDER[f]} maxLength={f === 'phone' ? 50 : 200} onChange={(e) => edit(c.id, f, e.target.value)} aria-label={PLACEHOLDER[f]} />
                  ),
                )}
                <div className="yy-office-contacts__by">{c.createdByName ? `${c.createdByName} さんが追加` : ''}</div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
