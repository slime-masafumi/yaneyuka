import { NextRequest, NextResponse } from 'next/server'

// シンプルなインメモリレート制限（IPベース、1分あたり3リクエスト）
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60_000
const RATE_LIMIT_MAX = 3

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

export async function POST(req: NextRequest) {
  try {
    // レート制限
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
    }

    const body = await req.json()
    const { to, subject, text } = body

    // バリデーション
    if (!to || typeof to !== 'string' || !subject || typeof subject !== 'string' || !text || typeof text !== 'string') {
      return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ error: 'invalid email address' }, { status: 400 })
    }
    if (subject.length > 200 || text.length > 5000) {
      return NextResponse.json({ error: 'field too long' }, { status: 400 })
    }

    const host = process.env.SMTP_HOST
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS
    const from = process.env.SMTP_FROM || user

    // 開発中や未設定時はドライラン
    if (!host || !port || !user || !pass || !from) {
      console.log('[makerconect/send] DRY RUN =>', { to, subject, text: text.slice(0, 100) })
      return NextResponse.json({ ok: true, dryRun: true })
    }

    // nodemailerは必須ではない（未導入でも動くように）
    let nodemailer: any
    try { nodemailer = require('nodemailer') } catch (e) {
      console.warn('[makerconect/send] nodemailer not installed, fallback DRY RUN')
      return NextResponse.json({ ok: true, dryRun: true })
    }

    const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
    await transporter.sendMail({ from, to, subject, text })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[makerconect/send] error', e)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
