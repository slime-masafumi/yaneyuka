export const navigationItems = [
  {
    id: 'home',
    label: 'ホーム',
    href: '/',
    icon: '🏠'
  },
  {
    id: 'userpage',
    label: 'ユーザーページ',
    href: '/userpage',
    icon: '👤'
  },
  {
    id: 'chatbot',
    label: 'チャットボット',
    href: '/chatbot',
    icon: '🤖'
  },
  {
    id: 'login',
    label: 'ログイン',
    href: '/login',
    icon: '🔐'
  },
  {
    id: 'register',
    label: '新規会員登録',
    href: '/register',
    icon: '📝'
  }
]

export const sidebarItems = [
  {
    id: 'events',
    label: 'イベント情報',
    href: '/events',
    category: 'event'
  },
  {
    id: 'news',
    label: 'NEWS',
    href: '/news',
    category: 'news'
  },
  {
    id: 'products',
    label: '新製品',
    href: '/products',
    category: 'product'
  },
  {
    id: 'books',
    label: '書籍・ソフト',
    href: '/books',
    category: 'book'
  },
  {
    id: 'companies',
    label: '企業リスト',
    href: '/companies',
    category: 'company'
  },
  {
    id: 'jobs',
    label: '求人情報',
    href: '/jobs',
    category: 'job'
  },
  {
    id: 'cad',
    label: 'CAD・添景',
    href: '/cad',
    category: 'cad'
  },
  {
    title: '設計ツール',
    items: [
      { name: '色彩チェッカー', href: '#color-checker' },
      { name: '関数電卓', href: '#calculator' },
      { name: '画像リサイズ', href: '#image-resize' },
      { name: '画像変換', href: '#image-converter' },
      { name: 'PDF圧縮', href: '#pdf-compress' },
      { name: 'ファイル転送', href: '#file-transfer' },
    ]
  },
  {
    title: '設計情報',
    items: [
      { name: '最新情報', href: '#design-info' },
      { name: '設計Tips', href: '#design-tips' },
    ]
  },
  { name: '添景・CAD', href: '/content?category=landscapecad' },
  { name: 'Shop', href: '/shop' },
  { name: 'プロジェクト', href: '/content?category=projects' },
] 