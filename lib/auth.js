import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { getFirebaseAdminAuth } from '@/lib/firebase/admin'

export const SESSION_COOKIE = 'hrflow_session'

export const roles = {
  HR_MANAGER: 'HR_MANAGER',
  RECRUITER: 'RECRUITER',
  EMPLOYEE: 'EMPLOYEE',
}

function readCookie(request, name) {
  const value = request.cookies?.get?.(name)
  if (typeof value === 'string') return value
  if (value?.value) return value.value
  const cookie = request.headers.get('cookie') || ''
  return cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1)
}

async function verifyRequestToken(request) {
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const firebaseAuth = getFirebaseAdminAuth()
  if (bearer) return firebaseAuth.verifyIdToken(bearer, true)
  const sessionCookie = readCookie(request, SESSION_COOKIE)
  if (!sessionCookie) return null
  return firebaseAuth.verifySessionCookie(sessionCookie, true)
}

export async function getRequestAuth(request) {
  const token = await verifyRequestToken(request)
  if (!token?.uid) return null

  const profile = await getPrisma().user.findUnique({
    where: { firebaseUid: token.uid },
    include: { employee: true },
  })
  if (!profile || profile.email.toLowerCase() !== String(token.email || '').toLowerCase()) return null

  return {
    token,
    user: {
      id: profile.id,
      uid: token.uid,
      email: profile.email,
      emailVerified: Boolean(token.email_verified),
    },
    profile,
  }
}

export async function requireAuth(request, allowedRoles = []) {
  try {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const origin = request.headers.get('origin')
      const usesBearer = request.headers.has('authorization')
      if (origin && !usesBearer && origin !== request.nextUrl.origin) {
        return { error: NextResponse.json({ error: 'Invalid request origin' }, { status: 403 }) }
      }
    }
    const auth = await getRequestAuth(request)
    if (!auth) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    if (!auth.user.emailVerified) {
      return { error: NextResponse.json({ error: 'Email verification required' }, { status: 403 }) }
    }
    if (allowedRoles.length && !allowedRoles.includes(auth.profile.role)) {
      return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }
    return auth
  } catch {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
}
