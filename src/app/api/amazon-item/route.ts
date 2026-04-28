import { NextRequest, NextResponse } from 'next/server'

// 簡易プロキシ: ASINから画像URLを返す
// 本番ではPA-API v5の署名付きリクエストが必要。ここでは最低限の枠組みを用意

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const asin = req.nextUrl.searchParams.get('asin')
  if (!asin) return NextResponse.json({ error: 'asin required' }, { status: 400 })

  // 必要な環境変数
  const accessKey = process.env.AMAZON_PAAPI_ACCESS_KEY
  const secretKey = process.env.AMAZON_PAAPI_SECRET_KEY
  const partnerTag = process.env.AMAZON_PAAPI_PARTNER_TAG
  const partnerType = process.env.AMAZON_PAAPI_PARTNER_TYPE || 'Associates'
  const region = process.env.AMAZON_PAAPI_REGION || 'us-west-2'

  if (!accessKey || !secretKey || !partnerTag) {
    return NextResponse.json({ error: 'PA-API credentials missing' }, { status: 500 })
  }

  // 署名付きリクエストの実装は冗長なため割愛。暫定としてエラーを返しつつ、将来的に実装。
  // 実装方針: https://webservices.amazon.com/paapi5/documentation/ → GetItems 署名V4

  return NextResponse.json({ error: 'PA-API not implemented yet' }, { status: 501 })
}


