'use client'

import { useState, useEffect, useCallback } from 'react'
import { collection, query, orderBy, getDocs, where, limit, startAfter, QueryDocumentSnapshot, DocumentData, getCountFromServer } from 'firebase/firestore'
import { db } from '@/lib/firebaseClient'
import { Building2, Calendar, ExternalLink, MapPin } from 'lucide-react'

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

// 地域ごとのグループ化
const REGIONS = {
  '北海道・東北': ['北海道', '青森', '岩手', '宮城', '秋田', '山形', '福島'],
  '関東': ['茨城', '栃木', '群馬', '埼玉', '千葉', '東京', '神奈川'],
  '中部': ['新潟', '富山', '石川', '福井', '山梨', '長野', '岐阜', '静岡', '愛知'],
  '近畿': ['三重', '滋賀', '京都', '大阪', '兵庫', '奈良', '和歌山'],
  '中国・四国': ['鳥取', '島根', '岡山', '広島', '山口', '徳島', '香川', '愛媛', '高知'],
  '九州・沖縄': ['福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島', '沖縄'],
}

// 工事内容のカテゴリ
const WORK_CATEGORIES = [
  '設備（電気・空調）',
  '建築・解体',
  '水路・河川',
  '業務・その他',
  '土木・道路'
]

const ITEMS_PER_PAGE = 20

// NEWマークを表示する日数基準（3日以内）
const NEW_ARRIVAL_DAYS = 3

// カテゴリごとの色分け（少し彩度を落として目に優しく）
const CATEGORY_STYLES: Record<string, string> = {
  '設備（電気・空調）': 'bg-orange-50 text-orange-700 border-orange-100',
  '建築・解体': 'bg-blue-50 text-blue-700 border-blue-100',
  '水路・河川': 'bg-cyan-50 text-cyan-700 border-cyan-100',
  '土木・道路': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  '業務・その他': 'bg-slate-50 text-slate-700 border-slate-100',
}

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
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [loadingCount, setLoadingCount] = useState(false)
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false)

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

  // 新着判定ロジック
  const isNewArrival = (dateStr: string): boolean => {
    if (!dateStr) return false
    try {
      const workDate = new Date(dateStr)
      const now = new Date()
      const diffTime = now.getTime() - workDate.getTime()
      const diffDays = diffTime / (1000 * 60 * 60 * 24)
      return diffDays <= NEW_ARRIVAL_DAYS
    } catch {
      return false
    }
  }

  // 総件数を取得する関数
  const fetchTotalCount = useCallback(async () => {
    try {
      setLoadingCount(true)
      const worksRef = collection(db, 'public_works')
      const areasArray = Array.from(selectedAreas)
      
      let countQueries: any[] = []
      
      if (areasArray.length === 0) {
        // エリアが選択されていない場合は全件カウント
        countQueries = []
      } else if (areasArray.length <= 10) {
        // 10個以下の場合はサーバーサイドでフィルタリング
        countQueries = [where('area', 'in', areasArray)]
      } else {
        // 10個を超える場合は最初の10個のみ使用（後でクライアントサイドでフィルタリング）
        countQueries = [where('area', 'in', areasArray.slice(0, 10))]
      }
      
      // カテゴリフィルター
      if (selectedCategory !== 'all') {
        countQueries.push(where('category', '==', selectedCategory))
      }
      
      // 45日以内のデータのみをカウントするため、全データを取得してフィルタリング
      const simpleQuery = query(
        worksRef,
        ...countQueries,
        orderBy('date', 'desc'),
        limit(1000) // 一時的に多めに取得
      )
      const snapshot = await getDocs(simpleQuery)
      
      let filteredCount = 0
      snapshot.forEach((doc) => {
        const data = doc.data() as PublicWork
        // 45日以内のデータのみをカウント
        if (isWithin45Days(data.date)) {
          // 10個を超えるエリア選択の場合、クライアントサイドでフィルタリング
          if (areasArray.length > 10) {
            if (areasArray.includes(data.area)) {
              filteredCount++
            }
          } else {
            filteredCount++
          }
        }
      })
      
      setTotalCount(filteredCount)
    } catch (error: any) {
      console.error('総件数の取得に失敗しました:', error)
      // エラー時はnullのまま（件数非表示）
      setTotalCount(null)
    } finally {
      setLoadingCount(false)
    }
  }, [selectedAreas, selectedCategory])

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
        queries.push(orderBy('date', 'desc')) // 降順（新しい順）
      } else {
        queries.push(orderBy('date', 'asc')) // 昇順（古い順）
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
        if (error?.code === 'failed-precondition' && (error?.message?.includes('index') || error?.message?.includes('requires an index'))) {
          console.warn('⚠️ インデックスが作成されていません。クライアントサイドフィルタリングにフォールバックします。')
          
          // エラーメッセージからインデックスURLを抽出
          const indexUrlMatch = error?.message?.match(/https:\/\/[^\s\)]+/)
          if (indexUrlMatch) {
            setIndexError(`インデックスが必要です: ${indexUrlMatch[0]}`)
            console.error('Firestoreインデックスが必要です。以下のURLをクリックしてインデックスを作成してください:', indexUrlMatch[0])
          } else {
            setIndexError('Firestoreインデックスが必要です。エラーメッセージを確認してください。')
          }
          
          setUseClientSideFilter(true)
          isClientSideFiltering = true
          
          // クライアントサイドフィルタリング: シンプルなクエリで全データを取得
          // ソート順は後でクライアントサイドで適用するため、ここではdescで取得
          const simpleQuery = query(
            worksRef,
            orderBy('date', 'desc'), // クライアントサイドでソートするため、ここではdesc固定
            limit(1000) // 一時的に多めに取得
          )
          snapshot = await getDocs(simpleQuery)
          console.log(`🔄 クライアントサイドフィルタリング開始: エリア=[${areasArray.join(',')}], ソート=${sortOrder}, 取得件数=${snapshot.size}`)
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
          ...data,
          id: doc.id, // doc.idで上書き
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
        // サーバーサイドでソート済みなので、順序は維持される
      }
      
      // クライアントサイドフィルタリングの場合のみ、ソート順を適用（サーバーサイドでは既にソート済み）
      if (isClientSideFiltering || useClientSideFilter) {
        console.log(`🔄 クライアントサイドでソート適用: sortOrder=${sortOrder}`)
        if (sortOrder === 'newest') {
          filteredWorks.sort((a, b) => {
            const dateA = new Date(a.date).getTime()
            const dateB = new Date(b.date).getTime()
            return dateB - dateA // 降順（新しい順）
          })
        } else {
          filteredWorks.sort((a, b) => {
            const dateA = new Date(a.date).getTime()
            const dateB = new Date(b.date).getTime()
            return dateA - dateB // 昇順（古い順）
          })
        }
      } else {
        // サーバーサイドでソート済みなので、そのまま使用
        console.log(`✅ サーバーサイドでソート済み: sortOrder=${sortOrder}`)
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
  }, [selectedAreas, selectedCategory, sortOrder, lastVisible, works.length])

  // エリア、カテゴリ、ソート順が変更されたときに再取得
  useEffect(() => {
    fetchWorks(true)
    fetchTotalCount() // 総件数も更新
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

  // 地域内のすべてのエリアを選択/解除
  const toggleRegionAreas = (regionPrefectures: string[]) => {
    const newSelectedAreas = new Set(selectedAreas)
    const allSelected = regionPrefectures.every(pref => selectedAreas.has(pref))
    
    if (allSelected) {
      // すべて選択されている場合は解除
      regionPrefectures.forEach(pref => newSelectedAreas.delete(pref))
    } else {
      // 一部または未選択の場合は選択
      regionPrefectures.forEach(pref => newSelectedAreas.add(pref))
    }
    
    setSelectedAreas(newSelectedAreas)
  }

  // 選択中のエリアの表示テキストを生成
  const getSelectedAreasText = () => {
    if (selectedAreas.size === 0) {
      return '未選択（全件表示）'
    }
    
    const selectedArray = Array.from(selectedAreas)
    if (selectedArray.length <= 3) {
      return selectedArray.join(', ')
    }
    
    const firstThree = selectedArray.slice(0, 3).join(', ')
    const remaining = selectedArray.length - 3
    return `${firstThree} (+他${remaining}件)`
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
      
      {/* フィルターコントロールバー */}
      <div className="mb-6 bg-white p-5 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* 上段（または左側）: エリア選択と件数表示 */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1">
            {/* エリアフィルター（モーダル形式） */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">エリア</span>
              <span className="text-sm text-slate-800 font-medium">{getSelectedAreasText()}</span>
              <button
                onClick={() => setIsAreaModalOpen(true)}
                className="text-xs bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 px-3 py-1 rounded-full transition-colors"
              >
                エリア変更
              </button>
              {selectedAreas.size > 10 && (
                <span className="text-xs text-orange-600">
                  （10個を超える選択はクライアントサイドでフィルタリングされます）
                </span>
              )}
            </div>
            
            {/* 総件数表示 */}
            <div className="text-xs text-slate-500">
              {loadingCount ? '集計中...' : totalCount !== null ? `${totalCount.toLocaleString()}件中 ${works.length.toLocaleString()}件` : `${works.length.toLocaleString()}件`}
            </div>
          </div>
          
          {/* 下段（または右側）: 工事内容と並び順 */}
          <div className="flex items-center gap-3">
            {/* 工事内容フィルター */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm cursor-pointer"
            >
              <option value="all">全カテゴリ</option>
              {WORK_CATEGORIES.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            
            {/* 並び順 */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm cursor-pointer"
            >
              <option value="newest">新しい順</option>
              <option value="oldest">古い順</option>
            </select>
          </div>
        </div>
      </div>

        {/* エリア選択モーダル */}
        {isAreaModalOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" 
            style={{ zIndex: 2147483651 }}
            onClick={() => setIsAreaModalOpen(false)}
          >
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full h-auto max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">エリアを選択</h2>
                <button
                  onClick={() => setIsAreaModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                  aria-label="閉じる"
                >
                  ×
                </button>
              </div>
              
              <div className="mb-4 flex items-center gap-2">
                <button
                  onClick={toggleAllAreas}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  {selectedAreas.size === availableAreas.length ? 'すべて解除' : 'すべて選択'}
                </button>
              </div>

              <div className="space-y-4">
                {Object.entries(REGIONS).map(([regionName, prefectures]) => {
                  const allSelected = prefectures.every(pref => selectedAreas.has(pref))
                  
                  return (
                    <div key={regionName} className="border rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold">{regionName}</h3>
                        <button
                          onClick={() => toggleRegionAreas(prefectures)}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          {allSelected ? 'この地域をすべて解除' : 'この地域をすべて選択'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {prefectures.map(prefecture => (
                          <label key={prefecture} className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedAreas.has(prefecture)}
                              onChange={() => toggleArea(prefecture)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-xs">{prefecture}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

      {/* カード式グリッドレイアウト */}
      {works.length === 0 ? (
        <p className="text-gray-500 text-xs">データがありません</p>
      ) : (
        <>
          {/* グリッド設定を元のコード（最大5列）に戻しました */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {works.map((work, index) => {
              const isNew = isNewArrival(work.date)
              const category = getWorkCategory(work)
              // デフォルトスタイル
              const categoryStyle = CATEGORY_STYLES[category] || 'bg-gray-50 text-gray-600 border-gray-100'

              return (
              <a
                key={work.id}
                href={work.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`
                  group relative bg-white rounded border border-gray-200 
                  p-3 flex flex-col justify-between
                  shadow-sm transition-all duration-300
                  hover:shadow-xl hover:-translate-y-1 hover:border-blue-400
                  ${activeList[index] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}
                `}
                style={{ minHeight: '160px' }} 
              >
                <div>
                  {/* ヘッダー: カテゴリとエリア */}
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${categoryStyle}`}>
                      {category}
                    </span>
                    <div className="flex items-center gap-1">
                      {isNew && (
                        <span className="text-[10px] font-bold text-red-500 border border-red-200 px-1 rounded bg-red-50">
                          NEW
                        </span>
                      )}
                      <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                        <MapPin size={10} />
                        {work.area}
                      </span>
                    </div>
                  </div>

                  {/* タイトル: 13px, text-gray-600 */}
                  <h3 className="font-semibold text-[13px] leading-relaxed text-gray-600 group-hover:text-blue-600 transition-colors mb-2 line-clamp-3">
                    {work.title}
                  </h3>
                </div>

                {/* フッター情報 */}
                <div className="pt-2 mt-2 border-t border-gray-50">
                  <div className="space-y-1">
                    <div className="flex items-start gap-1.5 text-[10px] text-gray-500">
                      <Building2 size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1">{work.organization || '---'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        <span>{formatDate(work.date)}</span>
                      </div>
                      <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-blue-400 transition-opacity" />
                    </div>
                  </div>
                </div>
              </a>
              );
            })}
          </div>

          {/* もっと見るボタン */}
          {hasMore && totalCount !== null && works.length < totalCount && (
            <div className="mt-4 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-4 py-1.5 bg-white border border-gray-300 text-gray-600 text-xs rounded hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50"
              >
                {loadingMore ? '読み込み中...' : 'もっと見る'}
              </button>
            </div>
          )}
          {totalCount !== null && works.length >= totalCount && works.length > 0 && (
            <div className="mt-4 text-center text-xs text-gray-500">
              すべてのデータを表示しました
            </div>
          )}
        </>
      )}
    </div>
  )
}
