'use client'

import { useState, useEffect, useCallback } from 'react'
import { collection, query, orderBy, getDocs, where, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore'
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

const ITEMS_PER_PAGE = 20

export default function PublicWorksList() {
  const [works, setWorks] = useState<PublicWork[]>([])
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set(['東京'])) // 初期状態は東京のみ表示
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [activeList, setActiveList] = useState<boolean[]>([])
  const [availableAreas, setAvailableAreas] = useState<string[]>(PREFECTURE_ORDER)
  const [indexError, setIndexError] = useState<string | null>(null)
  const [useClientSideFilter, setUseClientSideFilter] = useState(false)

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

  // 工事内容を取得（categoryフィールドを使用、なければデフォルト）
  const getWorkCategory = (work: PublicWork): string => {
    return work.category || '土木・道路'
  }

  // データ取得関数
  const fetchWorks = useCallback(async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true)
        setWorks([])
        setLastVisible(null)
        setHasMore(true)
      } else {
        setLoadingMore(true)
      }

      const worksRef = collection(db, 'public_works')
      
      // エリアフィルター（最大10個まで）
      const areasArray = Array.from(selectedAreas)
      console.log(`🔍 デバッグ: selectedAreas.size=${selectedAreas.size}, areasArray=[${areasArray.join(',')}], length=${areasArray.length}`)
      
      // Firestoreのwhere('area', 'in', ...)は最大10個まで
      let queries: any[] = []
      let needsClientSideFilter = false
      
      if (areasArray.length === 0) {
        // エリアが選択されていない場合はフィルターなし（全件表示）
        queries = []
      } else if (areasArray.length <= 10) {
        // 10個以下の場合はサーバーサイドでフィルタリング
        queries = [where('area', 'in', areasArray)]
      } else {
        // 10個を超える場合は警告を出して、最初の10個のみ使用
        console.warn(`⚠️ エリア選択が10個を超えています（${areasArray.length}個）。最初の10個のみ適用されます。`)
        console.warn(`   選択されたエリア: [${areasArray.join(',')}]`)
        queries = [where('area', 'in', areasArray.slice(0, 10))]
        needsClientSideFilter = true
      }

      // カテゴリフィルター
      if (selectedCategory !== 'all') {
        queries.push(where('category', '==', selectedCategory))
      }

      // 日付でソート（ソート順に応じて）
      if (sortOrder === 'newest') {
        queries.push(orderBy('date', 'desc'))
      } else {
        queries.push(orderBy('date', 'asc'))
      }
      
      // ページネーション
      queries.push(limit(ITEMS_PER_PAGE))
      if (lastVisible && !reset) {
        queries.push(startAfter(lastVisible))
      }

      let snapshot
      let isClientSideFiltering = false
      try {
        const q = query(worksRef, ...queries)
        snapshot = await getDocs(q)
        setIndexError(null)
        setUseClientSideFilter(false)
        console.log(`✅ サーバーサイドフィルタリング成功: エリア=${areasArray.join(',')}, 取得件数=${snapshot.size}`)
      } catch (error: any) {
        // インデックスエラーの場合、クライアントサイドフィルタリングにフォールバック
        if (error?.code === 'failed-precondition' && error?.message?.includes('index')) {
          console.warn('⚠️ インデックスが作成されていません。クライアントサイドフィルタリングにフォールバックします。')
          setIndexError(error.message)
          setUseClientSideFilter(true)
          isClientSideFiltering = true
          
          // クライアントサイドフィルタリング: シンプルなクエリで全データを取得
          const simpleQuery = query(
            worksRef,
            orderBy('date', 'desc'),
            limit(1000) // 一時的に多めに取得
          )
          snapshot = await getDocs(simpleQuery)
          console.log(`🔄 クライアントサイドフィルタリング開始: エリア=[${areasArray.join(',')}], 取得件数=${snapshot.size}`)
        } else {
          throw error
        }
      }

      const newWorks: PublicWork[] = []
      let filteredByArea = 0
      let filteredByCategory = 0
      let filteredByDate = 0
      
      snapshot.forEach((doc) => {
        const data = doc.data() as PublicWork
        
        // 45日以内のデータのみを追加
        if (!isWithin45Days(data.date)) {
          filteredByDate++
          return
        }
        
        // クライアントサイドフィルタリングの場合、エリアとカテゴリでフィルタ
        if (isClientSideFiltering || useClientSideFilter) {
          // エリアフィルター
          if (areasArray.length > 0) {
            if (!areasArray.includes(data.area)) {
              filteredByArea++
              return
            }
          }
          // カテゴリフィルター
          if (selectedCategory !== 'all' && data.category !== selectedCategory) {
            filteredByCategory++
            return
          }
        }
        
        newWorks.push({
          id: doc.id,
          ...data,
        } as PublicWork)
      })
      
      if (isClientSideFiltering || useClientSideFilter) {
        console.log(`📊 クライアントサイドフィルタリング結果: エリア=[${areasArray.join(',')}], 取得=${snapshot.size}件, 表示=${newWorks.length}件, エリア除外=${filteredByArea}件, カテゴリ除外=${filteredByCategory}件, 日付除外=${filteredByDate}件`)
        if (filteredByArea === 0 && areasArray.length > 0) {
          console.warn(`⚠️ エリアフィルターが動作していません。フィルタ対象エリア=[${areasArray.join(',')}]`)
          console.warn(`   データのareaフィールドを確認してください。`)
          // 最初の10件のareaフィールドを確認
          let sampleCount = 0
          snapshot.forEach((doc) => {
            if (sampleCount < 10) {
              const data = doc.data() as PublicWork
              const isIncluded = areasArray.includes(data.area)
              console.log(`  サンプル${sampleCount + 1}: area="${data.area}" ${isIncluded ? '✅' : '❌'}, title="${data.title?.substring(0, 40)}..."`)
              sampleCount++
            }
          })
        }
      }

      // 10個を超えるエリア選択の場合、クライアントサイドでフィルタリング
      let filteredWorks = newWorks
      if (needsClientSideFilter && !useClientSideFilter) {
        // サーバーサイドで10個までしかフィルタリングできないため、クライアントサイドで追加フィルタリング
        filteredWorks = newWorks.filter(work => selectedAreas.has(work.area))
      }

      if (reset) {
        setWorks(filteredWorks)
      } else {
        setWorks(prev => [...prev, ...filteredWorks])
      }

      // ページネーション用の状態を更新
      if (snapshot.docs.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1])
        setHasMore(snapshot.docs.length === ITEMS_PER_PAGE)
      } else {
        setHasMore(false)
      }

      // アニメーション用の状態を更新
      const totalWorks = reset ? filteredWorks.length : works.length + filteredWorks.length
      setActiveList(new Array(totalWorks).fill(false))
      setTimeout(() => {
        setActiveList(new Array(totalWorks).fill(true))
      }, 50)

    } catch (error: any) {
      console.error('データの取得に失敗しました:', error)
      // エラーが発生した場合、インデックスが必要な可能性がある
      if (error?.code === 'failed-precondition' && error?.message?.includes('index')) {
        const indexUrl = error.message.match(/https:\/\/[^\s]+/)?.[0]
        if (indexUrl) {
          setIndexError(`インデックスが必要です: ${indexUrl}`)
          console.error('Firestoreインデックスが必要です。以下のURLをクリックしてインデックスを作成してください:', indexUrl)
        }
      }
      // エラー時は空の配列を設定して無限ループを防ぐ
      if (reset) {
        setWorks([])
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [selectedAreas, selectedCategory, lastVisible, works.length])

  // エリア、カテゴリ、ソート順が変更されたときに再取得
  useEffect(() => {
    fetchWorks(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAreas, selectedCategory, sortOrder])

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

  // もっと見るボタンの処理
  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchWorks(false)
    }
  }

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
      {/* インデックスエラーの警告 */}
      {indexError && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded text-sm">
          <p className="font-bold text-yellow-800 mb-2">⚠️ Firestoreインデックスが必要です</p>
          <p className="text-yellow-700 mb-2">
            現在はクライアントサイドフィルタリングで動作していますが、パフォーマンス向上のためインデックスを作成してください。
          </p>
          <p className="text-yellow-600 text-xs">
            エラーメッセージ内のURLをクリックしてインデックスを作成してください。
          </p>
        </div>
      )}
      
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
            {selectedAreas.size > 10 && (
              <span className="text-xs text-orange-600">
                （10個を超える選択はクライアントサイドでフィルタリングされます）
              </span>
            )}
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
        
        {/* 工事内容フィルターとソート */}
        <div className="flex items-center gap-2 flex-wrap">
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
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium">並び順:</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">新しい順</option>
              <option value="oldest">古い順</option>
            </select>
          </div>
          
          <span className="text-xs text-gray-600">
            {works.length}件
          </span>
        </div>
      </div>

      {/* カード式グリッドレイアウト */}
      {works.length === 0 ? (
        <p className="text-gray-700 text-xs">データがありません</p>
      ) : (
        <>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {works.map((work, index) => (
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

          {/* もっと見るボタン */}
          {hasMore && (
            <div className="mt-4 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loadingMore ? '読み込み中...' : 'もっと見る'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
