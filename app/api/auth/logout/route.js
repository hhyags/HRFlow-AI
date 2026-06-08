import { NextResponse } from 'next/server'
import { getRequestAuth } from '@/lib/auth'
import { clearSessionCookie } from '@/lib/firebase/session'
import { getFirebaseAdminAuth } from '@/lib/firebase/admin'
import { writeAuditLog } from '@/lib/audit'

export async function POST(request) {
  const auth = await getRequestAuth(request).catch(() => null)
  if (auth) {
    await getFirebaseAdminAuth().revokeRefreshTokens(auth.user.uid).catch(() => {})
    await writeAuditLog({
      request,
      organizationId: auth.profile.organizationId,
      userId: auth.user.id,
      action: 'auth.logout',
      resource: 'user',
      resourceId: auth.user.id,
    })
  }
  return clearSessionCookie(new NextResponse(null, { status: 204 }))
}
