'use client'

import { useState, useEffect } from 'react'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebaseClient'

interface PublicWork {
  id: string
  date: string
  area: string
  organization: string
  title: string
  link: string
  scrapedAt: string
}

export default function PublicWorksList() {
  const [works, setWorks] = useState<PublicWork[]>([])
  const [filteredWorks, setFilteredWorks] = useState<PublicWork[]>([])
  const [selectedArea, setSelectedArea] = useState<string>('all')
  const [selectedWorkType, setSelectedWorkType] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [activeList, setActiveList] = useState<boolean[]>([])

  useEffect(() => {
    fetchWorks()
  }, [])

  // 工事内容を判定する関数
  const getWorkType = (work: PublicWork): string => {
    const title = (work.title || '').toLowerCase()
    const description = (work.description || '').toLowerCase()
    const text = title + ' ' + description
    
    if (text.includes('新築') || text.includes('新設') || text.includes('建設')) {
      return '新築'
    }
    if (text.includes('改修') || text.includes('改築') || text.includes('リニューアル') || text.includes('補修') || text.includes('補強')) {
      return '改修'
    }
    if (text.includes('解体') || text.includes('撤去') || text.includes('除却')) {
      return '解体'
    }
    return 'その他'
  }

  useEffect(() => {
    let filtered = works
    
    // エリアでフィルター
    if (selectedArea !== 'all') {
      filtered = filtered.filter(work => work.area === selectedArea)
    }
    
    // 工事内容でフィルター
    if (selectedWorkType !== 'all') {
      filtered = filtered.filter(work => getWorkType(work) === selectedWorkType)
    }
    
    setFilteredWorks(filtered)
    
    // フィルター変更時にアニメーションをリセット
    setActiveList(new Array(filtered.length).fill(false))
    setTimeout(() => {
      setActiveList(new Array(filtered.length).fill(true))
    }, 50)
  }, [selectedArea, selectedWorkType, works])

  const fetchWorks = async () => {
    try {
      const worksRef = collection(db, 'public_works')
      const q = query(worksRef, orderBy('scrapedAt', 'desc'))
      const snapshot = await getDocs(q)
      
      const worksData: PublicWork[] = []
      snapshot.forEach((doc) => {
        worksData.push({
          id: doc.id,
          ...doc.data(),
        } as PublicWork)
      })
      
      setWorks(worksData)
      setFilteredWorks(worksData)
      
      // アニメーション用の状態を初期化
      setActiveList(new Array(worksData.length).fill(false))
      setTimeout(() => {
        setActiveList(new Array(worksData.length).fill(true))
      }, 50)
    } catch (error) {
      console.error('データの取得に失敗しました:', error)
    } finally {
      setLoading(false)
    }
  }

  const areas = ['all', ...Array.from(new Set(works.map(w => w.area)))]

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '日付不明'
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <p>読み込み中...</p>
      </div>
    )
  }

  return (
    <div>
      {/* フィルター */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium">エリア:</label>
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {areas.map(area => (
              <option key={area} value={area}>
                {area === 'all' ? 'すべて' : area}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium">工事内容:</label>
          <select
            value={selectedWorkType}
            onChange={(e) => setSelectedWorkType(e.target.value)}
            className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">すべて</option>
            <option value="新築">新築</option>
            <option value="改修">改修</option>
            <option value="解体">解体</option>
          </select>
        </div>
        
        <span className="text-xs text-gray-600">
          {filteredWorks.length}件
        </span>
      </div>

      {/* カード式グリッドレイアウト */}
      {filteredWorks.length === 0 ? (
        <p className="text-gray-700 text-xs">データがありません</p>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {filteredWorks.map((work, index) => (
            <div
              key={work.id}
              className={`border rounded p-3 bg-white text-sm w-full h-[350px] dynamic-card transition-all duration-500 flex flex-col hover:shadow-lg hover:border-blue-300 ${
                activeList[index] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              }`}
            >
              {/* バッジ */}
              <div className="mb-2 flex flex-wrap gap-1">
                <span className="inline-block px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 font-medium">
                  {work.area}
                </span>
                {getWorkType(work) !== 'その他' && (
                  <span className="inline-block px-2 py-1 text-xs rounded bg-green-100 text-green-700 font-medium">
                    {getWorkType(work)}
                  </span>
                )}
              </div>

              {/* タイトル */}
              <h3 className="font-bold text-sm mb-1 line-clamp-2 flex-1">
                <a
                  href={work.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {work.title}
                </a>
              </h3>

              {/* 詳細情報 */}
              <div className="space-y-1 text-xs text-gray-600 mb-3 flex-shrink-0">
                <div className="flex items-start">
                  <span className="font-medium text-gray-700 min-w-[80px]">発注機関:</span>
                  <span className="line-clamp-2">{work.organization || '未記載'}</span>
                </div>
                <div className="flex items-start">
                  <span className="font-medium text-gray-700 min-w-[80px]">日付:</span>
                  <span>{formatDate(work.date)}</span>
                </div>
              </div>

              {/* リンクボタン */}
              <div className="mt-auto pt-2 border-t">
                <a
                  href={work.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-xs bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  詳細を見る →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

