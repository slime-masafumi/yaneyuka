'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/AuthContext'

type Purpose = '打合せ依頼' | 'カタログ請求' | 'サンプル請求'

const MATERIAL_CATEGORIES = [
  '屋根','外壁','開口部','外壁仕上げ','外部床','外部その他','内部床材','内装壁材','内装天井材','内装その他','防水','金物','ファニチャー','電気設備','機械設備','外構','エクステリア'
]

const MANUFACTURERS: Record<string, { name: string; email: string }[]> = {
  '屋根': [ { name: 'サンプル屋根A', email: 'roof-a@example.com' }, { name: 'サンプル屋根B', email: 'roof-b@example.com' } ],
  '外壁': [ { name: 'サンプル外壁A', email: 'wall-a@example.com' } ],
  '開口部': [ { name: 'サンプル開口A', email: 'opening-a@example.com' } ],
  '外壁仕上げ': [ { name: 'サンプル仕上A', email: 'finish-a@example.com' } ],
  '外部床': [ { name: 'サンプル外部床A', email: 'extfloor-a@example.com' } ],
  '外部その他': [ { name: 'サンプル外部その他A', email: 'extetc-a@example.com' } ],
  '内部床材': [ { name: 'サンプル内部床A', email: 'intfloor-a@example.com' } ],
  '内装壁材': [ { name: 'サンプル内装壁A', email: 'intwall-a@example.com' } ],
  '内装天井材': [ { name: 'サンプル内装天井A', email: 'intceil-a@example.com' } ],
  '内装その他': [ { name: 'サンプル内装その他A', email: 'intetc-a@example.com' } ],
  '防水': [ { name: 'サンプル防水A', email: 'waterproof-a@example.com' } ],
  '金物': [ { name: 'サンプル金物A', email: 'hardware-a@example.com' } ],
  'ファニチャー': [ { name: 'サンプル家具A', email: 'furniture-a@example.com' } ],
  '電気設備': [ { name: 'サンプル電気A', email: 'electrical-a@example.com' } ],
  '機械設備': [ { name: 'サンプル機械A', email: 'mechanical-a@example.com' } ],
  '外構': [ { name: 'サンプル外構A', email: 'exinfra-a@example.com' } ],
  'エクステリア': [ { name: 'サンプルエクステリアA', email: 'exterior-a@example.com' } ],
}

type ContactProfile = {
  companyName: string
  personName: string
  email: string
  phone: string
  meetingPlace?: string
  shippingAddress?: string
}

export default function MakerConect() {
  const { currentUser } = useAuth()
  const uid = currentUser?.uid || 'anon'

  const [category, setCategory] = useState<string>('')
  const [manufacturer, setManufacturer] = useState<string>('')
  const [purpose, setPurpose] = useState<Purpose>('打合せ依頼')
  type CandidateSlot = { date: string; hour: string; minute: string; am: boolean; pm: boolean }
  const [candidateSlots, setCandidateSlots] = useState<CandidateSlot[]>([
    { date: '', hour: '', minute: '', am: false, pm: false },
    { date: '', hour: '', minute: '', am: false, pm: false },
    { date: '', hour: '', minute: '', am: false, pm: false },
  ])
  const [body, setBody] = useState<string>('')
  const [useSavedProfile, setUseSavedProfile] = useState<boolean>(true)
  const [profile, setProfile] = useState<ContactProfile>({ companyName: '', personName: '', email: '', phone: '', meetingPlace: '', shippingAddress: '' })
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`userContactProfile:${uid}`)
      if (raw) setProfile(JSON.parse(raw))
    } catch {}
  }, [uid])

  const mfgList = useMemo(() => MANUFACTURERS[category] || [], [category])
  const selectedMfg = useMemo(() => mfgList.find(m => m.name === manufacturer) || null, [mfgList, manufacturer])

  const canSend = !!category && !!selectedMfg && !!purpose && (useSavedProfile ? (profile.companyName && profile.personName && profile.email && profile.phone) : (profile.companyName && profile.personName && profile.email && profile.phone))

  // 9:00〜17:00、15分刻み（時・分を別セレクト）
  const HOURS = useMemo(() => Array.from({ length: 17 - 9 + 1 }, (_, i) => String(9 + i).padStart(2, '0')), [])
  const MINUTES = ['00','15','30','45']

  const handleSend = async () => {
    setMessage('')
    if (!selectedMfg) { setMessage('メーカーを選択してください'); return }
    if (!canSend) { setMessage('依頼者情報が不足しています'); return }
    setSending(true)
    try {
      const subject = purpose === '打合せ依頼' ? 'yaneyuka.comより打合せ依頼が届いています' : `yaneyuka.comより${purpose}が届いています`
      const lines: string[] = []
      lines.push('依頼者情報')
      lines.push(`会社名: ${profile.companyName}`)
      lines.push(`氏名: ${profile.personName}`)
      lines.push(`メール: ${profile.email}`)
      lines.push(`電話: ${profile.phone}`)
      if (purpose === '打合せ依頼') {
        if (profile.meetingPlace) lines.push(`打合せ予定場所: ${profile.meetingPlace}`)
        const cds = candidateSlots
          .filter(s => s.date && s.hour && s.minute)
          .map(s => {
            const tag = `${s.am ? '・午前' : ''}${s.pm ? '・午後' : ''}`
            return `${s.date} ${s.hour}:${s.minute}（前後1時間${tag}）`
          })
        lines.push(`打合せ候補日: ${cds.length ? cds.join(' / ') : '（未入力）'}`)
      }
      if (purpose !== '打合せ依頼') {
        if (profile.shippingAddress) lines.push(`送付先: ${profile.shippingAddress}`)
      }
      lines.push('---')
      lines.push('本文')
      lines.push(body || '（未入力）')

      const res = await fetch('/api/makerconect/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedMfg.email,
          subject,
          text: lines.join('\n'),
          meta: { category, manufacturer, purpose, uid }
        })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || '送信に失敗しました')
      setMessage(json?.dryRun ? '開発モード: 送信シミュレーション完了（コンソール出力）' : '送信しました')
    } catch (e: any) {
      setMessage(e.message || '送信に失敗しました')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <div className="flex items-baseline mb-2">
        <h2 className="text-lg font-semibold">Maker conect</h2>
        <span className="text-red-600 font-bold text-sm ml-4">※現在準備中</span>
        <a href="#" className="ml-3 text-[12px] text-gray-500 hover:text-gray-700">掲載希望はコチラ</a>
      </div>

      <div className="bg-white p-4 rounded border border-gray-300 space-y-4">
        {/* 1) カテゴリー選択 */}
        <div>
          <label className="block text-[12px] text-gray-700 mb-1">建材カテゴリー</label>
          <select className="border rounded px-2 py-1 text-[13px]" value={category} onChange={e => { setCategory(e.target.value); setManufacturer('') }}>
            <option value="">選択してください</option>
            {MATERIAL_CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
          </select>
        </div>

        {/* 2) メーカー選択 */}
        <div>
          <label className="block text-[12px] text-gray-700 mb-1">メーカー</label>
          <select className="border rounded px-2 py-1 text-[13px]" value={manufacturer} onChange={e => setManufacturer(e.target.value)} disabled={!category}>
            <option value="">選択してください</option>
            {mfgList.map(m => (<option key={m.name} value={m.name}>{m.name}</option>))}
          </select>
        </div>

        {/* 3) 目的選択 */}
        <div>
          <label className="block text-[12px] text-gray-700 mb-1">目的</label>
          <div className="flex gap-4 text-[13px]">
            {(['打合せ依頼','カタログ請求','サンプル請求'] as Purpose[]).map(p => (
              <label key={p} className="flex items-center gap-1">
                <input type="radio" name="purpose" value={p} checked={purpose===p} onChange={() => setPurpose(p)} /> {p}
              </label>
            ))}
          </div>
        </div>

        {/* 打合せ依頼の詳細 */}
        {purpose === '打合せ依頼' && (
          <div>
            <label className="block text-[12px] text-gray-700 mb-1">打合せ候補日（最大3つ・時間は9:00〜17:00、15分刻み・前後1時間）</label>
            <div className="space-y-2">
              {candidateSlots.map((slot, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-5">
                    <input type="date" value={slot.date} onChange={e => {
                      const next = [...candidateSlots]; next[i] = { ...next[i], date: e.target.value }; setCandidateSlots(next)
                    }} className="w-full border rounded px-2 py-1 text-[13px]" />
                  </div>
                  <div className="sm:col-span-2">
                    <select value={slot.hour} onChange={e => {
                      const next = [...candidateSlots]; next[i] = { ...next[i], hour: e.target.value }; setCandidateSlots(next)
                    }} className="w-full border rounded px-2 py-1 text-[13px]">
                      <option value="">時</option>
                      {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <select value={slot.minute} onChange={e => {
                      const next = [...candidateSlots]; next[i] = { ...next[i], minute: e.target.value }; setCandidateSlots(next)
                    }} className="w-full border rounded px-2 py-1 text-[13px]">
                      <option value="">分</option>
                      {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="mr-4 text-[12px] text-gray-700">
                      <input type="checkbox" className="mr-1" checked={slot.am} onChange={e => {
                        const next = [...candidateSlots]; next[i] = { ...next[i], am: e.target.checked }; setCandidateSlots(next)
                      }} /> 午前
                    </label>
                    <label className="text-[12px] text-gray-700">
                      <input type="checkbox" className="mr-1" checked={slot.pm} onChange={e => {
                        const next = [...candidateSlots]; next[i] = { ...next[i], pm: e.target.checked }; setCandidateSlots(next)
                      }} /> 午後
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 依頼者情報（保存済みの利用可） */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-[12px] text-gray-700">依頼者情報</label>
            <label className="text-[12px] text-gray-600 flex items-center gap-1">
              <input type="checkbox" checked={useSavedProfile} onChange={e => setUseSavedProfile(e.target.checked)} /> 保存情報を使用
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <input className="border rounded px-2 py-1 text-[13px]" placeholder="会社名" value={profile.companyName} onChange={e=>setProfile(p=>({ ...p, companyName: e.target.value }))} />
            <input className="border rounded px-2 py-1 text-[13px]" placeholder="氏名" value={profile.personName} onChange={e=>setProfile(p=>({ ...p, personName: e.target.value }))} />
            <input className="border rounded px-2 py-1 text-[13px]" placeholder="メールアドレス" value={profile.email} onChange={e=>setProfile(p=>({ ...p, email: e.target.value }))} />
            <input className="border rounded px-2 py-1 text-[13px]" placeholder="電話番号" value={profile.phone} onChange={e=>setProfile(p=>({ ...p, phone: e.target.value }))} />
            <input className="border rounded px-2 py-1 text-[13px]" placeholder="打合せ予定場所（任意）" value={profile.meetingPlace||''} onChange={e=>setProfile(p=>({ ...p, meetingPlace: e.target.value }))} />
            <input className="border rounded px-2 py-1 text-[13px]" placeholder="送付先（任意）" value={profile.shippingAddress||''} onChange={e=>setProfile(p=>({ ...p, shippingAddress: e.target.value }))} />
          </div>
          <div className="mt-2 text-[12px] text-gray-600 flex items-center justify-between">
            <span>この情報はUserpage設定に保存して再利用できます。</span>
            <button type="button" className="px-2 py-0.5 rounded bg-gray-700 text-white text-[11px]" onClick={() => {
              try { localStorage.setItem(`userContactProfile:${uid}`, JSON.stringify(profile)); setMessage('プロフィールを保存しました'); } catch { setMessage('保存に失敗しました') }
            }}>プロフィールを保存</button>
          </div>
        </div>

        {/* 5) 本文 */}
        <div>
          <label className="block text-[12px] text-gray-700 mb-1">本文（任意）</label>
          <textarea className="w-full border rounded px-2 py-1 text-[13px] min-h-[100px]" value={body} onChange={e=>setBody(e.target.value)} placeholder="ご要望や案件の概要など" />
        </div>

        {/* 送信 */}
        <div className="flex items-center justify-end gap-3">
          {message && <div className="text-[12px] text-gray-700 mr-auto">{message}</div>}
          <button type="button" onClick={handleSend} disabled={!canSend || sending} className={`px-3 py-1.5 text-sm rounded ${sending ? 'bg-gray-400 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
            {sending ? '送信中...' : '送信'}
          </button>
        </div>
      </div>
    </div>
  )
}
