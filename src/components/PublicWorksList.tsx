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
  category?: string
  scrapedAt: string
}

// 都道府県の順序（北海道から）
const PREFECTURE_ORDER = [
  '北海道', '青森', '岩手', '宮城', '秋田', '山形', '福島',
  '茨城', '栃木', '群馬', '埼玉', '千葉', '東京', '神奈川',
  '新潟', '富山', '石川', '福井', '山梨', '長野',
  '岐阜', '静岡', '愛知', '三重',
  '滋賀', '京都', '大阪', '兵庫', '奈良', '和歌山',
  '鳥取', '島根', '岡山', '広島', '山口',
  '徳島', '香川', '愛媛', '高知',
  '福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島', '沖縄'
]

// 工事内容のカテゴリ
const WORK_CATEGORIES = [
  '設備（電気・空調）',
  '建築・解体',
  '水路・河川',
  '業務・その他',
  '土木・道路'
]

export default function PublicWorksList() {
  const [works, setWorks] = useState<PublicWork[]>([])
  const [filteredWorks, setFilteredWorks] = useState<PublicWork[]>([])
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [activeList, setActiveList] = useState<boolean[]>([])

  useEffect(() => {
    fetchWorks()
  }, [])

  // 工事内容を取得（categoryフィールドを使用、なければデフォルト）
  const getWorkCategory = (work: PublicWork): string => {
    return work.category || '土木・道路'
  }

  // 45日以内のデータかどうかを判定
  const isWithin45Days = (dateStr: string): boolean => {
    if (!dateStr) return false
    try {
      const workDate = new Date(dateStr)
      const now = new Date()
      const diffTime = now.getTime() - workDate.getTime()
      const diffDays = diffTime / (1000 * 60 * 60 * 24)
      return diffDays <= 45 && diffDays >= 0
    } catch {
      return false
    }
  }

  useEffect(() => {
    let filtered = works
    
    // 45日以内のデータのみをフィルター
    filtered = filtered.filter(work => isWithin45Days(work.date))
    
    // エリアでフィルター（チェックボックス）
    if (selectedAreas.size > 0) {
      filtered = filtered.filter(work => selectedAreas.has(work.area))
    }
    
    // 工事内容でフィルター
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(work => getWorkCategory(work) === selectedCategory)
    }
    
    setFilteredWorks(filtered)
    
    // フィルター変更時にアニメーションをリセット
    setActiveList(new Array(filtered.length).fill(false))
    setTimeout(() => {
      setActiveList(new Array(filtered.length).fill(true))
    }, 50)
  }, [selectedAreas, selectedCategory, works])
  
  // エリアのチェックボックスをトグル
  const toggleArea = (area: string) => {
    const newSelectedAreas = new Set(selectedAreas)
    if (newSelectedAreas.has(area)) {
      newSelectedAreas.delete(area)
    } else {
      newSelectedAreas.add(area)
    }
    setSelectedAreas(newSelectedAreas)
  }
  
  // すべてのエリアを選択/解除
  const toggleAllAreas = () => {
    if (selectedAreas.size === availableAreas.length) {
      setSelectedAreas(new Set())
    } else {
      setSelectedAreas(new Set(availableAreas))
    }
  }

  // 45日以内のデータかどうかを判定
  const isWithin45Days = (dateStr: string): boolean => {
    if (!dateStr) return false
    try {
      const workDate = new Date(dateStr)
      const now = new Date()
      const diffTime = now.getTime() - workDate.getTime()
      const diffDays = diffTime / (1000 * 60 * 60 * 24)
      return diffDays <= 45 && diffDays >= 0
    } catch {
      return false
    }
  }

  const fetchWorks = async () => {
    try {
      const worksRef = collection(db, 'public_works')
      // 日付でソート（新しい順）
      const q = query(worksRef, orderBy('date', 'desc'))
      const snapshot = await getDocs(q)
      
      const worksData: PublicWork[] = []
      const allData: PublicWork[] = []
      
      snapshot.forEach((doc) => {
        allData.push({
          id: doc.id,
          ...doc.data(),
        } as PublicWork)
      })
      
      // 45日以内のデータのみをフィルタリング
      const filtered45Days = allData.filter(work => isWithin45Days(work.date))
      
      console.log(`取得したデータ: ${allData.length}件, 45日以内: ${filtered45Days.length}件`)
      
      setWorks(filtered45Days)
      setFilteredWorks(filtered45Days)
      
      // アニメーション用の状態を初期化
      setActiveList(new Array(filtered45Days.length).fill(false))
      setTimeout(() => {
        setActiveList(new Array(filtered45Days.length).fill(true))
      }, 50)
    } catch (error) {
      console.error('データの取得に失敗しました:', error)
    } finally {
      setLoading(false)
    }
  }

  // エリアを都道府県順にソート
  const availableAreas = Array.from(new Set(works.map(w => w.area)))
    .sort((a, b) => {
      const indexA = PREFECTURE_ORDER.indexOf(a)
      const indexB = PREFECTURE_ORDER.indexOf(b)
      // 順序リストにないものは最後に
      if (indexA === -1 && indexB === -1) return a.localeCompare(b)
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })

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
      <div className="mb-4 space-y-3">
        {/* エリアフィルター（チェックボックス） */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs font-medium">エリア:</label>
            <button
              onClick={toggleAllAreas}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              {selectedAreas.size === availableAreas.length ? 'すべて解除' : 'すべて選択'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto border rounded p-2">
            {availableAreas.map(area => (
              <label key={area} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAreas.has(area)}
                  onChange={() => toggleArea(area)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-xs">{area}</span>
              </label>
            ))}
          </div>
        </div>
        
        {/* 工事内容フィルター */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium">工事内容:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">すべて</option>
            {WORK_CATEGORIES.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          
          <span className="text-xs text-gray-600">
            {filteredWorks.length}件
          </span>
        </div>
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
                <span className="inline-block px-2 py-1 text-xs rounded bg-green-100 text-green-700 font-medium">
                  {getWorkCategory(work)}
                </span>
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

