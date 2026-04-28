import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { sanitizeHtml } from '@/lib/sanitize'

export type PickupCategory = 'all' | 'arch' | 'interior'

export type PickupItem = {
  id: string
  title: string
  category: PickupCategory
  thumbnail?: string
  description?: string
  link?: string
  images?: string[] // 広告用の画像配列
  isAd?: boolean // 広告フラグ
}

const seed: PickupItem[] = [
  { id: 'p1', title: 'オフィスビル新築工事（sample）', category: 'arch', thumbnail: '/image/Pickup/00.sample/Gemini_Generated_Image_y2pmagy2pmagy2pm.webp', description: 'こちらはサンプルプロジェクトになります。' },
  { id: 'p2', title: '学校体育館新築工事（sample）', category: 'arch', thumbnail: '/image/Pickup/00.sample/Gemini_Generated_Image_muvwc0muvwc0muvw.webp', description: 'こちらはサンプルプロジェクトになります。' },
  { 
    id: 'ad1', 
    title: '都内イタリアンレストラン', 
    category: 'interior', 
    thumbnail: '/image/Pickup/01.checosa/IMG_7237.JPG', 
    description: '内装設計：合同会社slime\n施工会社：青空商会',
    images: [
      '/image/Pickup/01.checosa/IMG_7235.JPG',
      '/image/Pickup/01.checosa/IMG_7237.JPG',
      '/image/Pickup/01.checosa/IMG_7239.JPG'
    ],
    isAd: true
  },
  { id: 'p3', title: 'ホテル客室の内装更新', category: 'interior', thumbnail: '/image/Pickup/00.sample/Gemini_Generated_Image_o8fwno8fwno8fwno.webp', description: 'こちらはサンプルプロジェクトになります。' },
  { id: 'p4', title: 'ホテルエントランス内装工事', category: 'interior', thumbnail: '/image/Pickup/00.sample/Gemini_Generated_Image_ualii3ualii3uali.webp', description: 'こちらはサンプルプロジェクトになります。' },
]

const Pickup: React.FC = () => {
  const [tab, setTab] = useState<PickupCategory>('all')
  const [activeList, setActiveList] = useState<boolean[]>([])
  const [selectedAd, setSelectedAd] = useState<PickupItem | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0)
  const triggerRef = useRef<HTMLElement | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // モーダルを開く（トリガー要素を記録）
  const openModal = useCallback((item: PickupItem, trigger: HTMLElement) => {
    triggerRef.current = trigger
    setSelectedAd(item)
    setSelectedImageIndex(0)
  }, [])

  // モーダルを閉じる（フォーカスをトリガー要素に戻す）
  const closeModal = useCallback(() => {
    setSelectedAd(null)
    // フォーカスをトリガー要素に戻す
    setTimeout(() => {
      triggerRef.current?.focus()
    }, 0)
  }, [])

  // ESCキーでモーダルを閉じる & フォーカストラップ
  useEffect(() => {
    if (!selectedAd) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal()
        return
      }
      // フォーカストラップ
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    // モーダルが開いたらフォーカスを移動
    setTimeout(() => {
      const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      firstFocusable?.focus()
    }, 0)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedAd, closeModal])

  const items = useMemo(() => {
    return seed.filter(i => tab === 'all' ? true : i.category === tab)
  }, [tab])

  // カテゴリ切り替え時にactiveListをリセットし、左から順にactive化
  useEffect(() => {
    setActiveList(Array(items.length).fill(false))
    items.forEach((_, i) => {
      setTimeout(() => {
        setActiveList(prev => {
          const copy = [...prev]
          copy[i] = true
          return copy
        })
      }, i * 80)
    })
  }, [items])

  // 最初の3枚の画像をプリロード
  useEffect(() => {
    const preloadImages = items.slice(0, 3).map(item => {
      if (item.thumbnail) {
        const link = document.createElement('link')
        link.rel = 'preload'
        link.as = 'image'
        link.href = item.thumbnail
        document.head.appendChild(link)
        return link
      }
      return null
    }).filter(Boolean) as HTMLLinkElement[]

    return () => {
      preloadImages.forEach(link => {
        if (link.parentNode) {
          link.parentNode.removeChild(link)
        }
      })
    }
  }, [items])

  const btn = (key: PickupCategory, label: string) => (
    <button
      key={key}
      onClick={() => setTab(key)}
      className={`text-xs px-2 py-1 rounded w-24 transition new-product-sub-button ${tab===key? 'bg-gray-700 text-white':'bg-gray-300 text-black hover:bg-gray-700 hover:text-white'}`}
    >{label}</button>
  )

  return (
    <div>
      <div className="flex items-baseline mb-2">
        <h2 className="text-xl font-semibold">Pickup</h2>
        <a href="/register" className="text-[11px] text-gray-600 hover:text-gray-800 ml-3">掲載希望はコチラ</a>
      </div>
      <p className="text-[12px] text-gray-600 mb-3">
        最新の建築・内装プロジェクトから参考例をセレクトしています。仕上げや工法、トレンドの把握にお役立てください。
      </p>
      <div className="mb-4 flex gap-2 flex-wrap">
        {btn('all','全カテゴリー')}
        {btn('arch','最新建築')}
        {btn('interior','最新内装')}
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {items.map((it, index) => (
          <div 
            key={it.id} 
            onClick={(e) => {
              if (it.isAd && it.images && it.images.length > 0) {
                openModal(it, e.currentTarget)
              }
            }}
            className={`border border-gray-200 rounded-lg bg-white overflow-hidden w-full h-[380px] product-card transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-1 flex flex-col ${
              activeList[index] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            } ${it.isAd ? 'cursor-pointer' : ''}`}
          >
            {/* 画像エリア：大きく表示（h-64 = 256px） */}
            <div className="relative w-full h-64 bg-gray-100 shrink-0 border-b border-gray-50">
              <img 
                src={it.thumbnail || '/image/demo project.webp?v=1'} 
                alt={it.title} 
                className="w-full h-full object-cover block"
                width={400}
                height={256}
                loading={index < 3 ? 'eager' : 'lazy'}
                fetchPriority={index < 2 ? 'high' : 'auto'}
                decoding="async"
                draggable="false"
                onContextMenu={(e) => e.preventDefault()}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/image/demo project.webp?v=1';
                }}
              />
            </div>

            {/* コンテンツエリア：高さを抑えてコンパクトに */}
            <div className="px-4 py-3 flex flex-col flex-1 justify-between">
              <div>
                <div className="text-[10px] text-gray-400 mb-1">{it.category==='arch'?'建築':'内装工事'}</div>
                <div className="font-bold text-sm mb-1.5 line-clamp-1 text-gray-800">{it.title}</div>
                <p className={`text-[11px] text-gray-500 line-clamp-2 leading-relaxed ${it.isAd ? 'text-right' : ''}`} dangerouslySetInnerHTML={{ __html: sanitizeHtml(it.description?.replace(/\n/g, '<br />') || '') }}></p>
              </div>
              
              <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-100">
                <span className="text-[10px] text-gray-400 font-medium truncate mr-2">詳細情報はお問い合わせください</span>
                <a 
                  href={it.link || "#"} 
                  target={it.link ? "_blank" : undefined}
                  onClick={(e) => {
                    // 修正: 広告(isAd)の場合はモーダルを表示し、アラートは出さない
                    if (it.isAd) {
                      e.preventDefault();
                      e.stopPropagation(); // カード全体のonClick重複防止
                      openModal(it, e.currentTarget as HTMLElement);
                    } else if (!it.link) {
                      e.preventDefault();
                      alert('こちらはサンプルプロジェクトです。\n掲載希望の方は掲載希望はコチラよりご連絡下さい。');
                    }
                  }}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors shrink-0 flex items-center gap-0.5"
                >
                  詳細を見る <span className="text-[9px]">▶</span>
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 広告拡大表示 */}
      {selectedAd && selectedAd.images && selectedAd.images.length > 0 && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4"
          style={{ paddingTop: '200px' }}
          onClick={() => closeModal()}
          role="dialog"
          aria-modal="true"
          aria-label={selectedAd.title}
        >
          <div
            ref={modalRef}
            className="bg-white rounded-lg w-full overflow-hidden"
            style={{ maxWidth: 'min(616px, 38vw)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white border-b p-3 flex justify-between items-center">
              <h3 className="text-base font-semibold">{selectedAd.title}</h3>
              <button
                onClick={() => closeModal()}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            <div className="p-4 flex gap-3">
              {/* メイン画像表示（左側） */}
              <div className="flex-1 min-w-0">
                <img 
                  src={selectedAd.images[selectedImageIndex]} 
                  alt={`広告画像 ${selectedImageIndex + 1}`}
                  className="w-full h-auto rounded max-h-[500px] object-contain select-none"
                  width={800}
                  height={500}
                  loading="lazy"
                  draggable="false"
                  onContextMenu={(e) => e.preventDefault()}
                />
              </div>
              {/* サムネイル一覧（右側、2行2列） */}
              <div className="flex-shrink-0 w-52 flex flex-col">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {selectedAd.images.map((img, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`cursor-pointer border-2 rounded overflow-hidden ${
                        selectedImageIndex === idx ? 'border-blue-500' : 'border-gray-300'
                      }`}
                    >
                      <img 
                        src={img} 
                        alt={`サムネイル ${idx + 1}`}
                        className="w-full h-36 object-cover select-none"
                        width={208}
                        height={144}
                        loading={idx === selectedImageIndex ? 'eager' : 'lazy'}
                        decoding="async"
                        draggable="false"
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    </div>
                  ))}
                </div>
                {/* 右下に情報を表示 */}
                <div className="text-right text-xs text-gray-600 mt-auto">
                  <div>内装設計：合同会社slime</div>
                  <div>施工会社：青空商会</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Pickup
