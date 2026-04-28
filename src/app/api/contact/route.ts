import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export const runtime = 'nodejs'

type ListingPayload = {
  type: 'listing'
  company?: string
  department?: string
  name?: string
  email?: string
  phone?: string
  category?: string
  message?: string
}

type FeedbackPayload = {
  type: 'feedback'
  user?: string
  email?: string
  nickname?: string
  message?: string
}

type ContactPayload = ListingPayload | FeedbackPayload

// シンプルなインメモリレート制限（IPベース、1分あたり5リクエスト）
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60_000
const RATE_LIMIT_MAX = 5

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

function validatePayload(payload: unknown): { valid: boolean; error?: string; data?: ContactPayload } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'invalid_payload' }
  }
  const p = payload as Record<string, unknown>
  if (p.type !== 'listing' && p.type !== 'feedback') {
    return { valid: false, error: 'invalid_type' }
  }

  // 文字列フィールドのバリデーション（最大長チェック）
  const MAX_LEN = 5000
  const MAX_SHORT = 200
  for (const [key, value] of Object.entries(p)) {
    if (value !== undefined && value !== null && typeof value !== 'string') {
      if (key !== 'type') return { valid: false, error: `invalid_field: ${key}` }
    }
    if (typeof value === 'string' && value.length > MAX_LEN) {
      return { valid: false, error: `field_too_long: ${key}` }
    }
  }

  if (p.type === 'listing') {
    const email = typeof p.email === 'string' ? p.email : ''
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { valid: false, error: 'invalid_email' }
    }
    const phone = typeof p.phone === 'string' ? p.phone : ''
    if (phone && !/^[\d\-+() ]{0,20}$/.test(phone)) {
      return { valid: false, error: 'invalid_phone' }
    }
    return {
      valid: true,
      data: {
        type: 'listing',
        company: String(p.company || '').slice(0, MAX_SHORT),
        department: String(p.department || '').slice(0, MAX_SHORT),
        name: String(p.name || '').slice(0, MAX_SHORT),
        email: email.slice(0, MAX_SHORT),
        phone: phone.slice(0, MAX_SHORT),
        category: String(p.category || '').slice(0, MAX_SHORT),
        message: String(p.message || '').slice(0, MAX_LEN),
      }
    }
  }

  // feedback
  return {
    valid: true,
    data: {
      type: 'feedback',
      user: typeof p.user === 'string' ? p.user.slice(0, MAX_SHORT) : undefined,
      email: typeof p.email === 'string' ? p.email.slice(0, MAX_SHORT) : undefined,
      nickname: typeof p.nickname === 'string' ? p.nickname.slice(0, MAX_SHORT) : undefined,
      message: String(p.message || '').slice(0, MAX_LEN),
    }
  }
}

function buildMail(payload: ContactPayload) {
  const to = process.env.CONTACT_TO || 'yaneyuka.service@gmail.com'
  const from = process.env.CONTACT_FROM || (process.env.SMTP_USER || 'noreply@yaneyuka.local')

  let subject = '[yaneyuka] お問い合わせ'
  let text = ''

  if (payload.type === 'listing') {
    subject = '[yaneyuka] 掲載希望フォーム'
    const { company, department, name, email, phone, category, message } = payload
    text = `掲載希望の問い合わせを受け付けました\n\n会社名: ${company || ''}\n部署: ${department || ''}\n担当者: ${name || ''}\nメール: ${email || ''}\n電話: ${phone || ''}\nカテゴリ: ${category || ''}\n---\n内容:\n${message || ''}`
  } else if (payload.type === 'feedback') {
    subject = '[yaneyuka] ご意見・ご要望'
    const { user, email, nickname, message } = payload
    let userInfo = ''
    if (user) {
      userInfo = `ユーザーID: ${user}`
    } else {
      if (email) userInfo += `メール: ${email}\n`
      if (nickname) userInfo += `ニックネーム: ${nickname}`
      if (!userInfo) userInfo = 'ユーザー: 未ログイン'
    }
    text = `${userInfo}\n---\n内容:\n${message || ''}`
  }
  return { to, from, subject, text }
}

async function trySendMail(mail: { to: string; from: string; subject: string; text: string }) {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || '587')
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true'
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    console.log('[contact] (dry-run) send to=%s subject=%s', mail.to, mail.subject)
    console.log(mail.text)
    return { ok: true, dryRun: true }
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  })

  try {
    await transporter.verify()
  } catch (error) {
    console.error('[contact] smtp verify failed', error)
    return { ok: false, error: 'smtp_verify_failed' }
  }

  try {
    const info = await transporter.sendMail({
      from: mail.from,
      to: mail.to,
      subject: mail.subject,
      text: mail.text
    })
    console.log('[contact] mail sent %s', info.messageId)
    return { ok: true, messageId: info.messageId }
  } catch (error) {
    console.error('[contact] send failed', error)
    return { ok: false, error: 'smtp_send_failed' }
  }
}

export async function POST(req: NextRequest) {
  try {
    // レート制限
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
    }

    const raw = await req.json()
    const { valid, error, data } = validatePayload(raw)
    if (!valid || !data) {
      return NextResponse.json({ ok: false, error: error || 'bad_request' }, { status: 400 })
    }

    const mail = buildMail(data)
    const result = await trySendMail(mail)
    return NextResponse.json(result)
  } catch (e) {
    console.error('[contact] error', e)
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }
}
