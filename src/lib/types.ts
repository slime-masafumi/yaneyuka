// ユーザー関連の型定義
export interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

// コンテンツ関連の型定義
export interface Content {
  id: string
  title: string
  description: string
  category: string
  createdAt: string
}

// イベント関連の型定義
export interface Event {
  id: string
  title: string
  description: string
  date: string
  location: string
}

// 商品関連の型定義
export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  imageUrl?: string
}

// 求人関連の型定義
export interface Job {
  id: string
  title: string
  company: string
  location: string
  salary?: string
  description: string
  requirements: string[]
  postedAt: string
} 

// Amazon PA-API（プロキシ想定）レスポンスの簡易型
export type AmazonGetItemsResponse = {
  items: Array<{
    asin: string
    title?: string
    imageUrl?: string
    price?: number
    detailPageUrl?: string
  }>
  error?: string
}