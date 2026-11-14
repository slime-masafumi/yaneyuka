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
import PageHead, { Stat } from '@/components/ui/PageHead'
import FeedPic from '@/components/ui/FeedPic'
import { makerPhotoMap } from '@/lib/makerPhoto'
import { SecHead } from '@/components/ui/Sheet'
import './materials.css'

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
  const [done, setDone] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('makerconect-done') || '{}')
    } catch {
      return {}
    }
  })
  useEffect(() => {
    try {
      sessionStorage.setItem('makerconect-done', JSON.stringify(done))
    } catch {
      /* 残せなくても送れる */
    }
  }, [done])
  const doneKey = (name: string) => `${name}|${purpose}`

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

  // 同じ部位のメーカー(相見積の候補)。部位が入っていればその分類、無ければ選んだ社が共通して扱う分類
  const suggest = useMemo(() => {
    if (!data) return { page: '', list: [] as string[] }
    const rows = Object.values(data).flat()
    const pages = new Set(rows.flatMap((r) => r.pages))
    let page = detail.part && pages.has(detail.part.trim()) ? detail.part.trim() : ''
    if (!page && makers.length) {
      const count = new Map<string, number>()
      for (const r of rows) if (makers.includes(r.name)) for (const p of r.pages) count.set(p, (count.get(p) ?? 0) + 1)
      page = [...count].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
    }
    if (!page) return { page: '', list: [] as string[] }
    const list = [...new Set(rows.filter((r) => r.pages.includes(page) && r.name !== '掲載準備中').map((r) => r.name))].filter((n) => !makers.includes(n))
    return { page, list: list.slice(0, 12) }
  }, [data, detail.part, makers])
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
    setDone((p) => ({ ...p, [doneKey(d.name)]: `依頼文をコピーしました。開いた${d.target?.label ?? '窓口'}に貼って送ってください。${logged ? '担当者連絡先に記録しました。' : currentUser ? '' : '（ログインすると送った記録が残ります）'}` }))
  }

  const makerTotal = useMemo(() => (data ? new Set(Object.values(data).flat().map((m) => m.name)).size : 0), [data])

  return (
    <div>
      <PageHead
        en="materials"
        title="Maker conect"
        desc="メーカーへの依頼窓口 — カタログ・サンプル・見積・技術資料・打合せ"
        right={
          <>
            <Stat n={`${makers.length}/${MAX_MAKERS}`} label="宛先" />
            <Stat n={REQUEST_PURPOSES.length} label="依頼の種類" />
            <Stat n={data ? makerTotal : '—'} label="社" />
          </>
        }
      />
      <div className="yy-mk2-bar">
        <span>同じ依頼を {MAX_MAKERS} 社までまとめて作れます（相見積・比較）</span>
        <span className="yy-mk2-bar__right">
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('yaneyuka-navigate', { detail: 'registration' }))} className="yy-mk2-link yy-mk2-link--quiet">
            掲載希望はコチラ
          </button>
        </span>
      </div>

      <div className="yy-mk2-mc">
        <div className="yy-mk2-mc__col">
          {/* 1. 宛先 */}
          <section className="yy-mk2-mc__sec">
            <SecHead no="I" title="宛先" right={`${MAX_MAKERS} 社まで`} />
            <div className="yy-mk2-mc__search">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={data ? 'メーカー名・部位で探す（例: 防水、LIXIL、フローリング）' : '読み込み中…'} disabled={!data} className="yy-mk2-in" aria-label="メーカーを探す" />
              {hits.length > 0 && (
                <ul className="yy-mk2-mc__hits">
                  {hits.map((h) => (
                    <li key={h.name}>
                      <button
                        type="button"
                        disabled={makers.includes(h.name) || makers.length >= MAX_MAKERS}
                        onClick={() => { setMakers((p) => [...p, h.name]); setQ('') }}
                      >
                        <FeedPic src={data ? makerPhotoMap(data).get(h.name) : undefined} size="mk" />
                        <span className="yy-mk2-mc__hn">{h.name}</span>
                        <small>{makers.includes(h.name) ? '追加済み' : h.categories.join('・')}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {makers.length ? (
              <ul className="yy-mk2-mc__to">
                {makers.map((m, i) => (
                  <li key={m}>
                    <span className="yy-mk2-cb__no">{String(i + 1).padStart(2, '0')}</span>
                    <FeedPic src={data ? makerPhotoMap(data).get(m) : undefined} size="mk" />
                    <span className="yy-mk2-cb__name">{m}</span>
                    {done[doneKey(m)] && <span className="yy-mk2-mc__sent"><i className="yy-dot" />済</span>}
                    <button type="button" onClick={() => setMakers((p) => p.filter((x) => x !== m))} aria-label="外す" className="yy-mk2-mc__x">✕</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="yy-mk2-mc__hint">建材ページの表で選ぶ・資料箱・Chatbot の「問い合わせ」からも入ります</p>
            )}
            {suggest.list.length > 0 && makers.length < MAX_MAKERS && (
              <div className="yy-mk2-mc__sug">
                <div className="yy-mk2-mc__sugh">
                  <span className="yy-label">{suggest.page} のほかのメーカー</span>
                  <span>押すと宛先に加わります(相見積・比較)</span>
                </div>
                <div className="yy-mk2-mc__sugl">
                  {suggest.list.map((n) => (
                    <button key={n} type="button" className="yy-mk2-btn" disabled={makers.length >= MAX_MAKERS} onClick={() => setMakers((p) => (p.includes(n) || p.length >= MAX_MAKERS ? p : [...p, n]))}>
                      ＋ {n}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 2. 依頼の種類と内容 */}
          <section className="yy-mk2-mc__sec">
            <SecHead no="II" title="依頼" right={purpose} />
            <div className="yy-tabs" role="group" aria-label="依頼の種類">
              {REQUEST_PURPOSES.map((p) => (
                <button key={p} type="button" className="yy-tab" aria-pressed={purpose === p} onClick={() => { setPurpose(p); setEdited({}) }}>
                  {p}
                </button>
              ))}
            </div>
            <div className="yy-mk2-mc__grid">
              <label className="yy-mk2-fl"><span>物件名</span><input value={detail.projectName ?? ''} onChange={(e) => set({ projectName: e.target.value })} placeholder="A邸 新築工事" className="yy-mk2-in" /></label>
              <label className="yy-mk2-fl"><span>所在地（市区町村まで）</span><input value={detail.location ?? ''} onChange={(e) => set({ location: e.target.value })} className="yy-mk2-in" /></label>
              <label className="yy-mk2-fl"><span>部位・用途</span><input value={detail.part ?? ''} onChange={(e) => set({ part: e.target.value })} placeholder="外壁・住宅" className="yy-mk2-in" /></label>
              <label className="yy-mk2-fl"><span>品番・品名</span><input value={detail.items ?? ''} onChange={(e) => set({ items: e.target.value })} className="yy-mk2-in" /></label>
              <label className="yy-mk2-fl"><span>数量</span><input value={detail.quantity ?? ''} onChange={(e) => set({ quantity: e.target.value })} placeholder="約120㎡ / 各色1枚" className="yy-mk2-in" /></label>
              {purpose !== '打合せ依頼' && (
                <label className="yy-mk2-fl"><span>{purpose === '見積依頼' ? '回答希望日' : '希望時期'}</span><input value={detail.deadline ?? ''} onChange={(e) => set({ deadline: e.target.value })} placeholder="10月中旬まで" className="yy-mk2-in" /></label>
              )}
            </div>
            {purpose === '打合せ依頼' && (
              <div className="yy-mk2-mc__grid yy-mk2-mc__grid--3">
                {(detail.slots ?? ['', '', '']).map((s, i) => (
                  <label key={i} className="yy-mk2-fl">
                    <span>候補 {i + 1}</span>
                    <input value={s} onChange={(e) => set({ slots: (detail.slots ?? ['', '', '']).map((x, j) => (j === i ? e.target.value : x)) })} placeholder="10/1(水) 10時〜" className="yy-mk2-in" />
                  </label>
                ))}
                <label className="yy-mk2-fl is-wide"><span>場所</span><input value={detail.meetingPlace ?? ''} onChange={(e) => set({ meetingPlace: e.target.value })} placeholder="当社事務所 / オンライン" className="yy-mk2-in" /></label>
              </div>
            )}
            <label className="yy-mk2-fl"><span>本文に添える一言（任意）</span><textarea value={detail.body ?? ''} onChange={(e) => set({ body: e.target.value })} className="yy-mk2-in" /></label>
          </section>

          {/* 3. 依頼者 */}
          <section className="yy-mk2-mc__sec">
            <SecHead no="III" title="依頼者" right={missing.length ? undefined : 'そろっています'} />
            <div className="yy-mk2-mc__grid">
              <input value={profile.companyName} onChange={(e) => setProfile((p) => ({ ...p, companyName: e.target.value }))} placeholder="会社名" aria-label="会社名" className="yy-mk2-in" />
              <input value={profile.personName} onChange={(e) => setProfile((p) => ({ ...p, personName: e.target.value }))} placeholder="氏名" aria-label="氏名" className="yy-mk2-in" />
              <input value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} placeholder="メール" aria-label="メール" className="yy-mk2-in" />
              <input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="電話" aria-label="電話" className="yy-mk2-in" />
              <input value={profile.address ?? ''} onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))} placeholder="送付先住所（カタログ・サンプル）" aria-label="送付先住所" className="yy-mk2-in is-wide" />
            </div>
            <div className="yy-mk2-mc__foot">
              <span className="yy-mk2-warn">{missing.length ? `足りない: ${missing.join('・')}` : ''}</span>
              <button
                type="button"
                className="yy-mk2-btn"
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
            {profileMsg && <p className="yy-mk2-mc__hint">{profileMsg}</p>}
          </section>
        </div>

        {/* 4. 送る */}
        <div className="yy-mk2-mc__col">
          <section className="yy-mk2-mc__sec">
            <SecHead no="IV" title="送る" right={makers.length ? `${makers.length} 通` : undefined} />
            {!makers.length ? (
              <p className="yy-mk2-mc__empty">宛先のメーカーを選ぶと、メーカーごとの依頼文ができます</p>
            ) : (
              drafts.map((d) => (
                <div key={d.name} className="yy-mk2-mc__draft">
                  <div className="yy-mk2-mc__dhead">
                    <span className="yy-mk2-mc__dname">{d.name}</span>
                    {done[doneKey(d.name)] && <span className="yy-mk2-mc__sent"><i className="yy-dot" />済</span>}
                    <span className="yy-mk2-mc__dto">{d.target ? `送り先: ${d.target.label}` : '窓口のページが登録されていません'}</span>
                  </div>
                  <div className="yy-mk2-mc__subj">件名: {d.subject}</div>
                  <textarea value={d.text} onChange={(e) => setEdited((p) => ({ ...p, [d.name]: e.target.value }))} className="yy-mk2-mc__body" aria-label={`${d.name} への依頼文`} />
                  <div className="yy-mk2-mc__act">
                    <button
                      type="button"
                      disabled={missing.length > 0}
                      onClick={() => void sendVia(d)}
                      className="yy-pill yy-mk2-pill"
                      title={missing.length ? `依頼者の ${missing.join('・')} を入れてください` : ''}
                    >
                      {d.target ? `コピーして${d.target.label}を開く` : '依頼文をコピー'}
                    </button>
                    {done[doneKey(d.name)] && <span className="yy-mk2-ok">{done[doneKey(d.name)]}</span>}
                  </div>
                  {/* 開いた窓口が違ったときのために、そのメーカーのほかの窓口 */}
                  <div className="yy-mk2-mc__alt">
                    {([['catalog', 'カタログ'], ['sample', 'サンプル'], ['cad', 'CAD・技術資料'], ['contact', 'お問い合わせ'], ['office', '営業所'], ['products', '商品']] as const)
                      .filter(([k]) => { const u = (d.links as Record<string, string | undefined>)[k]; return !!u && u !== '#' && /^https?:/.test(u) && u !== d.target?.url })
                      .map(([k, label]) => (
                        <a key={k} href={(d.links as Record<string, string>)[k]} target="_blank" rel="noopener noreferrer">
                          {label} ↗
                        </a>
                      ))}
                  </div>
                </div>
              ))
            )}
          </section>
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
    <section className="yy-mk2-mc__sec">
      <SecHead
        no="V"
        title="これまでの依頼"
        right={
          <button type="button" className="yy-mk2-link" onClick={() => window.dispatchEvent(new CustomEvent('userpage-menu-click', { detail: { menuId: 'contacts' } }))}>
            担当者連絡先で見る
          </button>
        }
      />
      <ul className="yy-mk2-mc__hist">
        {rows.map(({ company, e }) => (
          <li key={company + e.id}>
            <span className="yy-mk2-mc__hdate">{e.date}</span>
            <span className="yy-mk2-mc__hco" title={company}>{company}</span>
            <span className="yy-mk2-mc__htext" title={e.text}>{e.text}</span>
            {e.status && (
              <span className={`yy-mk2-mc__hst${e.status === '依頼中' ? ' is-open' : ''}`}>
                {e.status === '依頼中' && <i className="yy-dot" />}
                {e.status}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
