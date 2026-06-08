import { NextResponse } from 'next/server'
import { getFirebaseAdminAuth } from '@/lib/firebase/admin'
import { provisionFirebaseUser, SESSION_DURATION_MS, setSessionCookie } from '@/lib/firebase/session'
import { requireAuth, roles } from '@/lib/auth'
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit'

export async function POST(request) {
  try {
    const origin = request.headers.get('origin')
    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }
    if (!checkRateLimit(rateLimitKey(request, 'auth-session'), { limit: 20 }).allowed) {
      return NextResponse.json({ error: 'Too many authentication attempts' }, { status: 429 })
    }

    const {
      idToken,
      fullName,
      organizationId,
      invitationToken,
      role = roles.EMPLOYEE,
    } = await request.json()
    if (!idToken) return NextResponse.json({ error: 'Firebase ID token is required' }, { status: 400 })

    const firebaseAuth = getFirebaseAdminAuth()
    const decodedToken = await firebaseAuth.verifyIdToken(idToken, true)
    if (Date.now() / 1000 - decodedToken.auth_time > 5 * 60) {
      return NextResponse.json({ error: 'Recent sign in required' }, { status: 401 })
    }

    const result = await provisionFirebaseUser({
      request,
      decodedToken,
      fullName,
      organizationId,
      invitationToken,
      requestedRole: role,
      bootstrapSecret: request.headers.get('x-bootstrap-secret'),
    })

    if (!decodedToken.email_verified) {
      return NextResponse.json({
        error: 'Email verification required',
        code: 'EMAIL_NOT_VERIFIED',
        data: { provisioned: true, refreshRequired: result.claimsChanged },
      }, { status: 403 })
    }

    const sessionCookie = await firebaseAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    })
    const response = NextResponse.json({
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          organizationId: result.user.organizationId,
        },
        refreshRequired: result.claimsChanged,
      },
    })
    return setSessionCookie(response, sessionCookie)
  } catch (error) {
    const message = error.code?.startsWith('auth/') ? 'Invalid or expired Firebase token' : error.message
    return NextResponse.json({ error: message }, { status: 401 })
  }
}

export async function GET(request) {
  const auth = await requireAuth(request)
  if (auth.error) return auth.error
  return NextResponse.json({
    data: {
      user: auth.user,
      profile: auth.profile,
    },
  })
}
