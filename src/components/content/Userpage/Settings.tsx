'use client'
import React, { useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { auth, db } from '@/lib/firebaseClient'
import { collection, getDocs, deleteDoc, doc, writeBatch, updateDoc, serverTimestamp } from 'firebase/firestore'
import { EmailAuthProvider, deleteUser, reauthenticateWithCredential, updateProfile } from 'firebase/auth'
import { listBoardsForUser, updateBoard } from '@/lib/firebaseUserData'

const Settings: React.FC = () => {
  const { currentUser } = useAuth()
  const [message, setMessage] = useState('')
  const [profile, setProfile] = useState<{ companyName: string; personName: string; email: string; phone: string; meetingPlace?: string; shippingAddress?: string }>({ companyName: '', personName: '', email: '', phone: '', meetingPlace: '', shippingAddress: '' })
  const [resetCalendar, setResetCalendar] = useState<boolean>(true)
  const [resetMyTasks, setResetMyTasks] = useState<boolean>(false)
  const [resetTeamTasks, setResetTeamTasks] = useState<boolean>(false)
  const [accountPassword, setAccountPassword] = useState<string>('')
  const [accountConfirmText, setAccountConfirmText] = useState<string>('')
  const [accountMessage, setAccountMessage] = useState<string>('')
  const [accountDeleting, setAccountDeleting] = useState<boolean>(false)
  const [displayName, setDisplayName] = useState<string>('')
  const [displayNameMessage, setDisplayNameMessage] = useState<string>('')
  const [displayNameUpdating, setDisplayNameUpdating] = useState<boolean>(false)


  // 連絡用プロフィール 読み込み
  React.useEffect(() => {
    const uid = currentUser?.uid || 'anon'
    try {
      const raw = localStorage.getItem(`userContactProfile:${uid}`)
      if (raw) setProfile(JSON.parse(raw))
    } catch {}
  }, [currentUser])

  // 表示名の初期化
  React.useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.username || '')
    }
  }, [currentUser])

  const updateDisplayName = async () => {
    if (!currentUser) {
      setDisplayNameMessage('ログインが必要です。')
      return
    }
    if (!displayName.trim()) {
      setDisplayNameMessage('表示名を入力してください。')
      return
    }
    setDisplayNameUpdating(true)
    setDisplayNameMessage('')
    try {
      const user = auth.currentUser
      if (!user) throw new Error('ユーザー情報が取得できません。')
      
      // Firebase Authのプロフィールを更新
      await updateProfile(user, { displayName: displayName.trim() })
      
      // Firestoreのusersコレクションも更新
      if (currentUser.uid) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          displayName: displayName.trim(),
          updatedAt: serverTimestamp()
        })
      }
      
      setDisplayNameMessage('表示名を更新しました。')
      // ページをリロードして最新のユーザー情報を反映
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error: any) {
      console.error('display name update failed', error)
      setDisplayNameMessage('表示名の更新に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setDisplayNameUpdating(false)
    }
  }

  const resetSelectedColors = async () => {
    if (!currentUser) {
      alert('入力するには会員登録（無料）が必要です。');
      return;
    }
    try {
      const uid = currentUser?.uid
      if (resetCalendar) {
        try { localStorage.removeItem('calendarTheme:latest') } catch {}
        if (uid) { try { localStorage.removeItem(`calendarTheme:${uid}`) } catch {} }
      }
      if (resetMyTasks && uid) {
        const snap = await getDocs(collection(db, 'users', uid, 'mytasks'))
        const defaultById: Record<string, string> = { '1': 'bg-gray-100', '2': 'bg-gray-200', '3': 'bg-gray-300', '4': 'bg-gray-400', '5': 'bg-gray-500' }
        await Promise.all(snap.docs.map(async d => {
          const def = defaultById[d.id] || 'bg-gray-200'
          await updateDoc(doc(db, 'users', uid, 'mytasks', d.id), { color: def } as any)
        }))
      }
      if (resetTeamTasks && uid) {
        const boards = await listBoardsForUser(uid)
        await Promise.all((boards || []).map(b => updateBoard(b.id!, { color: undefined } as any)))
      }
      setMessage('選択した色設定をデフォルトに戻しました。必要に応じて画面を開き直してください。')
    } catch {
      setMessage('色設定の初期化に失敗しました')
    }
  }

  const deleteAccount = async () => {
    if (!currentUser) {
      alert('入力するには会員登録（無料）が必要です。');
      return;
    }
    if (!currentUser.email) { setAccountMessage('メールアドレス情報が取得できません。ログインし直してください。'); return }
    if (accountConfirmText !== 'DELETE') { setAccountMessage('確認テキストが一致しません。DELETE と入力してください。'); return }
    if (!accountPassword) { setAccountMessage('現在のパスワードを入力してください。'); return }
    setAccountDeleting(true); setAccountMessage('')
    try {
      const user = auth.currentUser
      if (!user || !user.email) throw new Error('auth/requires-relogin')
      const credential = EmailAuthProvider.credential(user.email, accountPassword)
      await reauthenticateWithCredential(user, credential)

      const collectionsToClear = [
        'newsBookmarks',
        'eventBookmarks',
        'contacts',
        'calendarEvents',
        'forumBookmarks',
        'mytasks',
        'sheets',
        'generalMemos',
        'teamBoards',
        'teamTasks',
        'backups',
      ]
      for (const col of collectionsToClear) {
        const snap = await getDocs(collection(db, 'users', user.uid, col))
        if (snap.empty) continue
        const batch = writeBatch(db)
        snap.docs.forEach(d => batch.delete(d.ref))
        await batch.commit()
      }
      try { await deleteDoc(doc(db, 'users', user.uid)) } catch {}
      try {
        localStorage.removeItem(`newsBookmarks:${user.uid}`)
        localStorage.removeItem(`eventBookmarks:${user.uid}`)
        localStorage.removeItem(`contacts:${user.uid}`)
        localStorage.removeItem(`calendarEvents:${user.uid}`)
        localStorage.removeItem(`calendarTheme:${user.uid}`)
        localStorage.removeItem(`calendarIcsFeeds:${user.uid}`)
        localStorage.removeItem(`myTasks:${user.uid}`)
        localStorage.removeItem(`myTasks:columnMode`)
        localStorage.removeItem(`teamTasks:columnMode`)
        localStorage.removeItem(`teamBoards:${user.uid}`)
        localStorage.removeItem(`generalMemos:${user.uid}`)
        localStorage.removeItem(`userContactProfile:${user.uid}`)
      } catch {}

      await deleteUser(user)
      setAccountPassword('')
      setAccountConfirmText('')
      setAccountMessage('アカウントを削除しました。ご利用ありがとうございました。')
    } catch (error: any) {
      console.error('delete account failed', error)
      if (error?.code === 'auth/wrong-password') {
        setAccountMessage('パスワードが正しくありません。再度お試しください。')
      } else if (error?.code === 'auth/requires-recent-login') {
        setAccountMessage('直近のログイン情報が古いため、再度ログインしてから削除を実行してください。')
      } else if (error?.code === 'auth/too-many-requests') {
        setAccountMessage('操作が多すぎます。時間を置いてから再度お試しください。')
      } else if (error?.message === 'auth/requires-relogin') {
        setAccountMessage('再ログインが必要です。一度ログアウトしてから再度ログインしてください。')
      } else {
        setAccountMessage('アカウント削除に失敗しました。時間をおいて再度お試しください。')
      }
    } finally {
      setAccountDeleting(false)
    }
  }

  return (
    <div className="p-0">
      <div className="flex items-baseline mb-2">
        <h2 className="text-xl font-semibold">ユーザー設定</h2>
        <span className="text-red-600 font-bold text-xs sm:text-sm ml-4">※この機能は現在β版です。ご意見をぜひお聞かせください。</span>
      </div>
      <p className="text-[12px] text-gray-600 mb-4">
        プロフィール情報の更新や色設定の初期化、アカウント管理に関する操作をまとめています。必要な項目を選んで実行してください。
      </p>
      <div className="space-y-4">
        {/* 表示名の変更 */}
        <div className="p-4 border rounded bg-white">
          <div className="text-sm font-semibold mb-2">表示名の変更</div>
          <p className="text-[12px] text-gray-700 mb-3">
            アカウントの表示名を変更できます。この名前はサイト内で表示されます。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="block text-[12px] text-gray-600 mb-1">表示名</label>
              <input
                type="text"
                className="border rounded px-2 py-1 text-[13px] w-full"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="例）やねゆか 太郎"
                disabled={displayNameUpdating}
              />
            </div>
            <button
              type="button"
              onClick={updateDisplayName}
              disabled={displayNameUpdating}
              className={`px-2.5 py-1 text-[12px] rounded ${displayNameUpdating ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {displayNameUpdating ? '更新中...' : '表示名を更新'}
            </button>
          </div>
          {displayNameMessage && (
            <div className={`mt-2 text-[12px] ${displayNameMessage.includes('失敗') ? 'text-red-600' : 'text-gray-700'}`}>
              {displayNameMessage}
            </div>
          )}
        </div>

        {/* 連絡用プロフィール（最上段） */}
        <div className="p-4 border rounded bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">連絡用プロフィール</div>
            <div className="text-[11px] text-red-600">※この機能はMaker conectサービス開始から使用できます。</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className="border rounded px-2 py-1 text-[13px] bg-gray-100 text-gray-500 cursor-not-allowed" placeholder="会社名" value={profile.companyName} readOnly disabled />
            <input className="border rounded px-2 py-1 text-[13px] bg-gray-100 text-gray-500 cursor-not-allowed" placeholder="氏名" value={profile.personName} readOnly disabled />
            <input className="border rounded px-2 py-1 text-[13px] bg-gray-100 text-gray-500 cursor-not-allowed" placeholder="メールアドレス" value={profile.email} readOnly disabled />
            <input className="border rounded px-2 py-1 text-[13px] bg-gray-100 text-gray-500 cursor-not-allowed" placeholder="電話番号" value={profile.phone} readOnly disabled />
            <input className="border rounded px-2 py-1 text-[13px] bg-gray-100 text-gray-500 cursor-not-allowed" placeholder="打合せ予定場所（任意）" value={profile.meetingPlace||''} readOnly disabled />
            <input className="border rounded px-2 py-1 text-[13px] bg-gray-100 text-gray-500 cursor-not-allowed" placeholder="送付先（任意）" value={profile.shippingAddress||''} readOnly disabled />
          </div>
        </div>

        {message && (
          <div className="mt-3 text-[12px] text-gray-600">{message}</div>
        )}

        {/* 色設定のデフォルト化 */}
        <div className="p-4 border rounded bg-white">
          <div className="text-sm font-semibold mb-2">色設定のデフォルト化</div>
          <div className="text-[12px] text-gray-700 mb-2">初期状態に戻したい項目にチェックを入れて実行してください。</div>
          <div className="flex flex-wrap gap-4 text-[13px] mb-3">
            <label className="flex items-center gap-1"><input type="checkbox" checked={resetCalendar} onChange={e=>setResetCalendar(e.target.checked)} /> Myカレンダー</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={resetMyTasks} onChange={e=>setResetMyTasks(e.target.checked)} /> Myタスク</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={resetTeamTasks} onChange={e=>setResetTeamTasks(e.target.checked)} /> Teamタスク</label>
          </div>
          <div className="flex items-center justify-end">
            <button type="button" onClick={resetSelectedColors} className="px-2.5 py-1 text-[12px] rounded bg-gray-600 text-white hover:bg-gray-700">色設定を初期化</button>
          </div>
        </div>

        {/* バックアップ／復元 */}
        {/* アカウント削除 */}
        <div className="p-4 border rounded bg-white">
          <div className="text-sm mb-2 font-semibold text-red-600">アカウントを削除</div>
          <p className="text-[12px] text-gray-700 mb-2">
            アカウントを削除すると、保存されているブックマークやタスク、連絡先などのデータは復元できません。
            削除を実行するにはパスワードと <span className="font-mono bg-gray-100 px-1 rounded">DELETE</span> を入力してください。
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[12px] text-gray-600 mb-1">現在のパスワード</label>
              <input
                type="password"
                className="border rounded px-2 py-1 text-[13px] w-full"
                value={accountPassword}
                onChange={e => setAccountPassword(e.target.value)}
                autoComplete="current-password"
              />
          </div>
            <div>
              <label className="block text-[12px] text-gray-600 mb-1">確認テキスト</label>
            <input
              type="text"
                className="border rounded px-2 py-1 text-[13px] w-full"
              placeholder="DELETE"
                value={accountConfirmText}
                onChange={e => setAccountConfirmText(e.target.value)}
            />
            </div>
          </div>
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={deleteAccount}
              disabled={accountDeleting}
              className={`px-2.5 py-1 text-[12px] rounded ${accountDeleting ? 'bg-gray-300 text-gray-500' : 'bg-red-600 text-white hover:bg-red-700'}`}
            >
              {accountDeleting ? '削除中...' : 'アカウントを削除する'}
            </button>
          </div>
          {accountMessage && (
            <div className="mt-2 text-[12px] text-gray-700">
              {accountMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Settings