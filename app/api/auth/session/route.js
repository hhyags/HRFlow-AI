import { NextResponse } from 'next/server'
import { getFirebaseAdminAuth } from '@/lib/firebase/admin'
import { provisionFirebaseUser, SESSION_DURATION_MS, setSessionCookie } from '@/lib/firebase/session'
import { hasTrustedOrigin, requireAuth, roles } from '@/lib/auth'
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit'

export async function POST(request) {
  try {
    if (!hasTrustedOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }
    if (!checkRateLimit(rateLimitKey(request, 'auth-session'), { limit: 20 }).allowed) {
      return NextResponse.json({ error: 'Too many authentication attempts' }, { status: 429 })
    }

    let {
      idToken,
      email,
      password,
      fullName,
      organizationName,
      organizationId,
      invitationToken,
      sessionRefresh = false,
      role = roles.EMPLOYEE,
    } = await request.json()

    if (!idToken && email && password) {
      const firebaseResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, returnSecureToken: true }),
          cache: 'no-store',
        },
      )
      const firebaseBody = await firebaseResponse.json()
      if (!firebaseResponse.ok || !firebaseBody.idToken) {
        return NextResponse.json({ error: 'The email or password is incorrect.' }, { status: 401 })
      }
      idToken = firebaseBody.idToken
    }
    if (!idToken) return NextResponse.json({ error: 'Firebase ID token is required' }, { status: 400 })

    const firebaseAuth = getFirebaseAdminAuth()
    const decodedToken = await firebaseAuth.verifyIdToken(idToken, true)
    if (!sessionRefresh && Date.now() / 1000 - decodedToken.auth_time > 5 * 60) {
      return NextResponse.json({ error: 'Recent sign in required' }, { status: 401 })
    }

    if (sessionRefresh) {
      const auth = await requireAuth(new Request(request.url, {
        method: 'GET',
        headers: { authorization: `Bearer ${idToken}` },
      }))
      if (auth.error) return auth.error
      const sessionCookie = await firebaseAuth.createSessionCookie(idToken, { expiresIn: SESSION_DURATION_MS })
      return setSessionCookie(NextResponse.json({
        data: {
          user: {
            id: auth.profile.id,
            email: auth.profile.email,
            role: auth.profile.role,
            organizationId: auth.profile.organizationId,
          },
          refreshRequired: false,
        },
      }), sessionCookie)
    }

    const result = await provisionFirebaseUser({
      request,
      decodedToken,
      fullName,
      organizationName,
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
