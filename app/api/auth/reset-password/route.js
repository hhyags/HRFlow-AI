import { NextResponse } from 'next/server'
import { getFirebaseAdminAuth } from '@/lib/firebase/admin'
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit'

export async function POST(request) {
  if (!checkRateLimit(rateLimitKey(request, 'password-reset'), { limit: 5, windowMs: 15 * 60_000 }).allowed) {
    return NextResponse.json({ error: 'Too many password reset attempts' }, { status: 429 })
  }
  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  try {
    await getFirebaseAdminAuth().getUserByEmail(String(email).trim().toLowerCase())
  } catch {}
  return NextResponse.json({
    data: { accepted: true },
    message: 'Use the Firebase client password reset flow to send the configured email template.',
  })
}
