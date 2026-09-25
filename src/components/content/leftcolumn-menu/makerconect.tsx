'use client'
/**
 * Maker conect — メーカーへの依頼窓口。
 *
 * 宛先は建材ページと同じメーカー一覧（makers.json）。同じ依頼を複数社にまとめて作れる（相見積・比較）。
 * yaneyuka から直接メールを送れるのは登録済みのメーカーだけなので、ほかは
 * 「依頼文をコピーして、そのメーカーの窓口（お問い合わせ・サンプル・カタログのページ）を開く」で送る。
 * 送ったものは担当者連絡先のやり取り履歴に残り、サンプルは返却まで追える。
 */
import React, { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebaseClient'
import { useAuth } from '@/lib/AuthContext'
import { searchMakers, mergeMaker, type MakerData } from '@/lib/makerBox'
import { REQUEST_PURPOSES, buildRequest, targetFor, logKindOf, missingRequester, type RequestPurpose, type Requester, type RequestDetail } from '@/lib/makerRequest'
import { recordContactLog } from '@/lib/contactLogStore'
import { isChatNicknameOnly, newLogId, todayYmd, type ContactLogEntry } from '@/lib/contactLog'
import { PRESET_EVENT, takePreset, type MakerConectPreset } from '@/lib/makerConectPreset'

const MAX_MAKERS = 5

type Profile = Requester & { meetingPlace?: string; shippingAddress?: string }

export default function MakerConect() {
  const { currentUser } = useAuth()
  const uid = currentUser?.uid || 'anon'

  const [data, setData] = useState<MakerData | null>(null)
  const [q, setQ] = useState('')
  const [makers, setMakers] = useState<string[]>([])
  const [purpose, setPurpose] = useState<RequestPurpose>('カタログ請求')
  const [detail, setDetail] = useState<RequestDetail>({ slots: ['', '', ''] })
  const [profile, setProfile] = useState<Profile>({ companyName: '', personName: '', email: '', phone: '', address: '' })
  const [profileMsg, setProfileMsg] = useState('')
  // メーカーごとに手で直した本文（直していなければ自動で作った文面）
  const [edited, setEdited] = useState<Record<string, string>>({})
  const [done, setDone] = useState<Record<string, string>>({})

  useEffect(() => {
    import('@/data/makers.json').then((m) => setData((m.default ?? m) as unknown as MakerData))
  }, [])

  // 保存済みの依頼者情報（以前の形式の shippingAddress も読む）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`userContactProfile:${uid}`)
      if (raw) {
        const p = JSON.parse(raw)
        setProfile({ companyName: p.companyName ?? '', personName: p.personName ?? '', email: p.email ?? '', phone: p.phone ?? '', address: p.address ?? p.shippingAddress ?? '' })
      }
    } catch {
      /* 無ければ空のまま */
    }
  }, [uid])

  // 他の画面から「このメーカーに問い合わせる」で来た
  useEffect(() => {
    const apply = (p: MakerConectPreset | null) => {
      if (!p) return
      setMakers((prev) => Array.from(new Set([...p.makers, ...prev])).slice(0, MAX_MAKERS))
      if (p.purpose && (REQUEST_PURPOSES as readonly string[]).includes(p.purpose)) setPurpose(p.purpose as RequestPurpose)
      if (p.part) setDetail((d) => ({ ...d, part: d.part || p.part }))
    }
    apply(takePreset())
    const onPreset = () => apply(takePreset())
    window.addEventListener(PRESET_EVENT, onPreset)
    return () => window.removeEventListener(PRESET_EVENT, onPreset)
  }, [])

  const hits = useMemo(() => (data && q.trim() ? searchMakers(data, q, 10) : []), [data, q])
  const missing = missingRequester(profile)
  const who: Requester = profile
  const set = (patch: Partial<RequestDetail>) => {
    setDetail((d) => ({ ...d, ...patch }))
    setEdited({})
  }

  const drafts = makers.map((name) => {
    const m = data ? mergeMaker(data, name) : null
    const req = buildRequest(purpose, name, who, detail)
    return { name, links: m?.links ?? {}, target: m ? targetFor(purpose, m.links) : null, subject: req.subject, text: edited[name] ?? req.text }
  })

  const log = async (name: string, text: string) => {
    if (!currentUser) return false
    const k = logKindOf(purpose)
    const entry: ContactLogEntry = {
      id: newLogId(),
      date: todayYmd(),
      kind: k.kind,
      text: [purpose, detail.items || detail.part].filter(Boolean).join(': ').slice(0, 80) || text.split('\n')[3]?.slice(0, 80) || purpose,
      ...(k.status ? { status: k.status } : {}),
      ...(k.kind === '見積' ? { amount: null } : {}),
      ...(detail.projectName ? { project: detail.projectName } : {}),
      source: 'Maker conect',
    }
    try {
      await recordContactLog(currentUser.uid, name, entry)
      return true
    } catch (e) {
      console.error('担当者連絡先への記録に失敗', e)
      return false
    }
  }

  const sendVia = async (d: (typeof drafts)[number]) => {
    const full = `件名: ${d.subject}\n\n${d.text}`
    try {
      await navigator.clipboard.writeText(full)
    } catch {
      window.prompt('コピーして窓口に貼ってください', full)
    }
    if (d.target) window.open(d.target.url, '_blank', 'noopener,noreferrer')
    const logged = await log(d.name, d.text)
    setDone((p) => ({ ...p, [d.name]: `依頼文をコピーしました。開いた${d.target?.label ?? '窓口'}に貼って送ってください。${logged ? '担当者連絡先に記録しました。' : currentUser ? '' : '（ログインすると送った記録が残ります）'}` }))
  }

  const field = 'border border-gray-300 px-2 py-1 text-[12px] w-full'
  const label = 'block text-[11px] text-gray-500 mb-0.5'

  return (
    <div>
      <div className="flex items-baseline mb-2 gap-3 flex-wrap">
        <h2 className="text-lg font-semibold">Maker conect</h2>
        <span className="text-[12px] text-gray-500">メーカーへの依頼窓口 — カタログ・サンプル・見積・技術資料・打合せ</span>
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('yaneyuka-navigate', { detail: 'registration' }))} className="text-[11px] text-gray-500 hover:text-gray-800 ml-auto">
          掲載希望はコチラ
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="bg-white border border-gray-300 p-4 space-y-4 text-[12px]">
          {/* 1. 宛先 */}
          <section>
            <div className="text-[10px] tracking-widest font-mono text-gray-400 mb-1">001 宛先（{MAX_MAKERS}社まで）</div>
            <div className="relative">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={data ? 'メーカー名・部位で探す（例: 防水、LIXIL、フローリング）' : '読み込み中…'} disabled={!data} className={field} />
              {hits.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 top-full bg-white border border-[#3b3b3b] max-h-64 overflow-y-auto">
                  {hits.map((h) => (
                    <li key={h.name}>
                      <button
                        type="button"
                        disabled={makers.includes(h.name) || makers.length >= MAX_MAKERS}
                        onClick={() => { setMakers((p) => [...p, h.name]); setQ('') }}
                        className="w-full text-left px-2 py-1.5 hover:bg-gray-100 disabled:text-gray-400 flex justify-between gap-2"
                      >
                        <span>{h.name}</span>
                        <span className="text-[10px] text-gray-400 truncate">{makers.includes(h.name) ? '追加済み' : h.categories.join('・')}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {makers.map((m) => (
                <span key={m} className="inline-flex items-center gap-1 border border-[#3b3b3b] px-1.5 py-0.5">
                  {m}
                  <button type="button" onClick={() => setMakers((p) => p.filter((x) => x !== m))} aria-label="外す" className="text-gray-400 hover:text-red-600">✕</button>
                </span>
              ))}
              {!makers.length && <span className="text-gray-400">建材ページ・資料箱・Chatbot の「問い合わせ」からも入ります</span>}
            </div>
          </section>

          {/* 2. 依頼の種類と内容 */}
          <section className="space-y-2">
            <div className="text-[10px] tracking-widest font-mono text-gray-400">002 依頼</div>
            <div className="flex flex-wrap gap-1">
              {REQUEST_PURPOSES.map((p) => (
                <button key={p} type="button" onClick={() => { setPurpose(p); setEdited({}) }} className={`px-2 py-1 border ${purpose === p ? 'bg-[#3b3b3b] text-white border-[#3b3b3b]' : 'bg-white border-gray-300 text-gray-700'}`}>
                  {p}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label><span className={label}>物件名</span><input value={detail.projectName ?? ''} onChange={(e) => set({ projectName: e.target.value })} placeholder="A邸 新築工事" className={field} /></label>
              <label><span className={label}>所在地（市区町村まで）</span><input value={detail.location ?? ''} onChange={(e) => set({ location: e.target.value })} className={field} /></label>
              <label><span className={label}>部位・用途</span><input value={detail.part ?? ''} onChange={(e) => set({ part: e.target.value })} placeholder="外壁・住宅" className={field} /></label>
              <label><span className={label}>品番・品名</span><input value={detail.items ?? ''} onChange={(e) => set({ items: e.target.value })} className={field} /></label>
              <label><span className={label}>数量</span><input value={detail.quantity ?? ''} onChange={(e) => set({ quantity: e.target.value })} placeholder="約120㎡ / 各色1枚" className={field} /></label>
              {purpose !== '打合せ依頼' && (
                <label><span className={label}>{purpose === '見積依頼' ? '回答希望日' : '希望時期'}</span><input value={detail.deadline ?? ''} onChange={(e) => set({ deadline: e.target.value })} placeholder="10月中旬まで" className={field} /></label>
              )}
            </div>
            {purpose === '打合せ依頼' && (
              <div className="grid grid-cols-3 gap-2">
                {(detail.slots ?? ['', '', '']).map((s, i) => (
                  <label key={i}>
                    <span className={label}>候補 {i + 1}</span>
                    <input value={s} onChange={(e) => set({ slots: (detail.slots ?? ['', '', '']).map((x, j) => (j === i ? e.target.value : x)) })} placeholder="10/1(水) 10時〜" className={field} />
                  </label>
                ))}
                <label className="col-span-3"><span className={label}>場所</span><input value={detail.meetingPlace ?? ''} onChange={(e) => set({ meetingPlace: e.target.value })} placeholder="当社事務所 / オンライン" className={field} /></label>
              </div>
            )}
            <label className="block"><span className={label}>本文に添える一言（任意）</span><textarea value={detail.body ?? ''} onChange={(e) => set({ body: e.target.value })} className={`${field} h-16`} /></label>
          </section>

          {/* 3. 依頼者 */}
          <section className="space-y-2">
            <div className="text-[10px] tracking-widest font-mono text-gray-400">003 依頼者</div>
            <div className="grid grid-cols-2 gap-2">
              <input value={profile.companyName} onChange={(e) => setProfile((p) => ({ ...p, companyName: e.target.value }))} placeholder="会社名" className={field} />
              <input value={profile.personName} onChange={(e) => setProfile((p) => ({ ...p, personName: e.target.value }))} placeholder="氏名" className={field} />
              <input value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} placeholder="メール" className={field} />
              <input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="電話" className={field} />
              <input value={profile.address ?? ''} onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))} placeholder="送付先住所（カタログ・サンプル）" className={`${field} col-span-2`} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-orange-700">{missing.length ? `足りない: ${missing.join('・')}` : ''}</span>
              <button
                type="button"
                className="px-2 py-0.5 border border-gray-400 text-[11px]"
                onClick={() => {
                  try {
                    localStorage.setItem(`userContactProfile:${uid}`, JSON.stringify(profile))
                    setProfileMsg('この端末に保存しました')
                  } catch {
                    setProfileMsg('保存できませんでした')
                  }
                }}
              >
                次回も使う
              </button>
            </div>
            {profileMsg && <p className="text-[11px] text-gray-500">{profileMsg}</p>}
          </section>
        </div>

        {/* 4. 送る */}
        <div className="space-y-3 text-[12px]">
          <div className="text-[10px] tracking-widest font-mono text-gray-400">004 送る</div>
          {!makers.length ? (
            <p className="text-gray-400 border border-dashed border-gray-300 p-6 text-center">宛先のメーカーを選ぶと、メーカーごとの依頼文ができます</p>
          ) : (
            drafts.map((d) => (
              <div key={d.name} className="bg-white border border-gray-300">
                <div className="px-3 py-1.5 border-b border-gray-200 flex items-baseline justify-between gap-2">
                  <b className="text-[13px]">{d.name}</b>
                  <span className="text-[10px] text-gray-500 truncate">{d.target ? `送り先: ${d.target.label}` : '窓口のページが登録されていません'}</span>
                </div>
                <div className="px-3 pt-2 text-[11px] text-gray-600">件名: {d.subject}</div>
                <textarea value={d.text} onChange={(e) => setEdited((p) => ({ ...p, [d.name]: e.target.value }))} className="w-full px-3 py-2 text-[11px] leading-relaxed h-52 border-0 focus:outline-none resize-y" />
                <div className="px-3 py-2 border-t border-gray-200 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={missing.length > 0}
                    onClick={() => void sendVia(d)}
                    className="px-3 py-1 bg-[#3b3b3b] text-white disabled:opacity-40"
                    title={missing.length ? `依頼者の ${missing.join('・')} を入れてください` : ''}
                  >
                    {d.target ? `コピーして${d.target.label}を開く` : '依頼文をコピー'}
                  </button>
                  {done[d.name] && <span className="text-[11px] text-green-700">{done[d.name]}</span>}
                </div>
              </div>
            ))
          )}
          {currentUser && <RequestHistory uid={currentUser.uid} />}
        </div>
      </div>
    </div>
  )
}

/** これまでの依頼（担当者連絡先の履歴のうち、Maker conect から送ったもの） */
function RequestHistory({ uid }: { uid: string }) {
  const [rows, setRows] = useState<Array<{ company: string; e: ContactLogEntry }>>([])
  useEffect(
    () =>
      onSnapshot(collection(db, 'users', uid, 'contacts'), (snap) => {
        const out: Array<{ company: string; e: ContactLogEntry }> = []
        snap.docs.forEach((d) => {
          const data = d.data()
          if (isChatNicknameOnly(data)) return
          for (const e of (data.log ?? []) as ContactLogEntry[]) if (e.source === 'Maker conect') out.push({ company: String(data.company ?? ''), e })
        })
        out.sort((a, b) => (a.e.date < b.e.date ? 1 : a.e.date > b.e.date ? -1 : a.e.id < b.e.id ? 1 : -1))
        setRows(out.slice(0, 30))
      }),
    [uid],
  )
  if (!rows.length) return null
  return (
    <div className="bg-white border border-gray-300">
      <div className="px-3 py-1.5 border-b border-gray-200 flex justify-between items-baseline">
        <span className="text-[10px] tracking-widest font-mono text-gray-400">HISTORY これまでの依頼</span>
        <button type="button" className="text-[11px] underline text-gray-500" onClick={() => window.dispatchEvent(new CustomEvent('userpage-menu-click', { detail: { menuId: 'contacts' } }))}>
          担当者連絡先で見る
        </button>
      </div>
      <ul className="divide-y divide-gray-100">
        {rows.map(({ company, e }) => (
          <li key={company + e.id} className="px-3 py-1 flex gap-2 text-[11px]">
            <span className="text-gray-500 w-20 shrink-0">{e.date}</span>
            <span className="w-28 shrink-0 truncate">{company}</span>
            <span className="flex-1 min-w-0 truncate">{e.text}</span>
            {e.status && <span className={`shrink-0 px-1 border ${e.status === '依頼中' ? 'border-amber-500 text-amber-700' : 'border-gray-300 text-gray-500'}`}>{e.status}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
