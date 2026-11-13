import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import PageHead, { Stat } from '../ui/PageHead'
import './see-pages.css'

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

/** 分類(タブの並び) */
const TABS: Array<[PickupCategory, string]> = [
  ['all', '全カテゴリー'],
  ['arch', '最新建築'],
  ['interior', '最新内装'],
]
const countOf = (k: PickupCategory) => (k === 'all' ? seed.length : seed.filter(i => i.category === k).length)

const Pickup: React.FC = () => {
  const [tab, setTab] = useState<PickupCategory>('all')
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

  const tabLabel = TABS.find(([k]) => k === tab)?.[1] || ''

  return (
    <div>
      <PageHead
        no="10"
        en="pickup"
        title="Pickup"
        desc="最新の建築・内装プロジェクトから参考例をセレクト"
        right={
          <>
            <Stat n={countOf('arch')} label="建築" />
            <Stat n={countOf('interior')} label="内装" />
          </>
        }
      />
      <div className="yy-tabs">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            className="yy-tab"
            aria-pressed={tab === k}
            onClick={() => setTab(k)}
          >
            {label}
            <small>{countOf(k)}</small>
          </button>
        ))}
      </div>

      <div className="yy-pk-page">
        <div className="yy-pk-main">
          <section>
            <div className="yy-sec">
              <span className="yy-sec__no">I</span>
              <span className="yy-sec__title">{tab === 'all' ? 'プロジェクト' : tabLabel}</span>
              <span className="yy-sec__right">{items.length} 件</span>
            </div>
            <p className="yy-pk-sample">
              <span className="yy-fmt">サンプル</span>
              <span>現在表示されているのは<strong>すべて架空のサンプル</strong>です。プロジェクトの掲載企業を募集しています。</span>
            </p>
            {items.length === 0 ? (
              <p className="yy-pk-empty">該当する情報がありません。</p>
            ) : (
              <ol className="yy-pk-list">
                {items.map((it, index) => (
                  <li
                    key={it.id}
                    className={`yy-pk-row${it.isAd ? ' is-ad' : ''}`}
                    onClick={(e) => {
                      if (it.isAd && it.images && it.images.length > 0) {
                        openModal(it, e.currentTarget)
                      }
                    }}
                  >
                    <span className="yy-pk-no">{String(index + 1).padStart(2, '0')}</span>
                    <span className="yy-photo yy-pk-photo">
                      <img
                        src={it.thumbnail || '/image/demo project.webp?v=1'}
                        alt={it.title}
                        width={60}
                        height={42}
                        loading={index < 3 ? 'eager' : 'lazy'}
                        decoding="async"
                        draggable="false"
                        onContextMenu={(e) => e.preventDefault()}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/image/demo project.webp?v=1';
                        }}
                      />
                    </span>
                    <span className="yy-pk-cat">{it.category === 'arch' ? '建築' : '内装工事'}</span>
                    <div className="yy-pk-body">
                      <span className="yy-pk-title" title={it.title}>{it.title}</span>
                      {it.description && <span className="yy-pk-desc">{it.description.split('\n').join(' / ')}</span>}
                    </div>
                    <span className="yy-pk-val">{it.isAd && it.images ? `写真 ${it.images.length} 枚` : '詳細情報はお問い合わせください'}</span>
                    <a
                      href={it.link || '#'}
                      target={it.link ? '_blank' : undefined}
                      rel={it.link ? 'noopener noreferrer' : undefined}
                      onClick={(e) => {
                        // 広告(isAd)の場合はモーダルを表示し、アラートは出さない
                        if (it.isAd) {
                          e.preventDefault();
                          e.stopPropagation(); // 行全体のonClick重複防止
                          openModal(it, e.currentTarget as HTMLElement);
                        } else if (!it.link) {
                          e.preventDefault();
                          alert('こちらはサンプルプロジェクトです。\n掲載希望の方は掲載希望はコチラよりご連絡下さい。');
                        }
                      }}
                      className="yy-pk-more"
                    >
                      詳細を見る ↗
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
        <aside className="yy-pk-side">
          <section>
            <div className="yy-sec"><span className="yy-sec__no">II</span><span className="yy-sec__title">分類</span><span className="yy-sec__right">{seed.length} 件</span></div>
            <ol className="yy-pk-toc">
              {TABS.filter(([k]) => k !== 'all').map(([k, label], i) => (
                <li key={k}>
                  <button
                    type="button"
                    className="yy-srcrow yy-srcrow--btn"
                    aria-pressed={tab === k}
                    onClick={() => setTab(k)}
                  >
                    <span className="yy-home__tocno">{String(i + 1).padStart(2, '0')}</span>
                    <span className="yy-home__toct">{label}</span>
                    <span className="yy-leader" />
                    <span className="yy-home__n">{countOf(k)}</span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="yy-pk-note">仕上げや工法、トレンドの把握に。写真のあるプロジェクトは行を押すと拡大します。</p>
          </section>
          <section>
            <div className="yy-sec"><span className="yy-sec__no">III</span><span className="yy-sec__title">掲載希望</span></div>
            <div className="yy-gray">
              <span className="yy-gray__title">プロジェクトを載せる</span>
              <span className="yy-gray__text">設計事務所・施工会社の竣工プロジェクトを、写真付きで掲載できます。</span>
              <a href="/register" className="yy-btn">掲載希望はコチラ</a>
            </div>
          </section>
        </aside>
      </div>

      {/* 広告拡大表示 */}
      {selectedAd && selectedAd.images && selectedAd.images.length > 0 && (
        <div
          className="yy-pk-modal"
          onClick={() => closeModal()}
          role="dialog"
          aria-modal="true"
          aria-label={selectedAd.title}
        >
          <div
            ref={modalRef}
            className="yy-pk-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="yy-pk-dialog__head">
              <span className="yy-label">pickup</span>
              <h3 className="yy-pk-dialog__title">{selectedAd.title}</h3>
              <button
                type="button"
                onClick={() => closeModal()}
                className="yy-pk-dialog__close"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>
            <div className="yy-pk-dialog__body">
              {/* メイン画像表示（左側） */}
              <div className="yy-pk-dialog__main">
                <img
                  src={selectedAd.images[selectedImageIndex]}
                  alt={`広告画像 ${selectedImageIndex + 1}`}
                  width={800}
                  height={500}
                  loading="lazy"
                  draggable="false"
                  onContextMenu={(e) => e.preventDefault()}
                />
              </div>
              {/* サムネイル一覧（右側、2列） */}
              <div className="yy-pk-dialog__side">
                <div className="yy-pk-dialog__thumbs">
                  {selectedAd.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className="yy-pk-dialog__thumb"
                      aria-pressed={selectedImageIndex === idx}
                      aria-label={`写真 ${idx + 1}`}
                    >
                      <img
                        src={img}
                        alt={`サムネイル ${idx + 1}`}
                        width={208}
                        height={144}
                        loading={idx === selectedImageIndex ? 'eager' : 'lazy'}
                        decoding="async"
                        draggable="false"
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    </button>
                  ))}
                </div>
                {/* 右下に情報を表示 */}
                <div className="yy-pk-dialog__credit">
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
