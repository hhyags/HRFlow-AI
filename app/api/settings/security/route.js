import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { getFirebaseAdminAuth } from '@/lib/firebase/admin'
import { clearSessionCookie } from '@/lib/firebase/session'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request) {
  const auth = await requireAuth(request)
  if (auth.error) return auth.error

  const rate = checkRateLimit(`security-revoke:${auth.user.id}`, {
    limit: 3,
    windowMs: 15 * 60_000,
  })
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many security requests. Try again later.' }, { status: 429 })
  }

  await getFirebaseAdminAuth().revokeRefreshTokens(auth.user.uid)
  await writeAuditLog({
    request,
    organizationId: auth.profile.organizationId,
    userId: auth.user.id,
    action: 'security.sessions.revoke',
    resource: 'firebase_session',
  })

  return clearSessionCookie(NextResponse.json({ data: { revoked: true } }))
}
