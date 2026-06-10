import { NextResponse } from 'next/server'
import { getFirebaseAdminAuth } from '@/lib/firebase/admin'
import { SESSION_COOKIE } from '@/lib/auth'

const publicPages = new Set([
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/robots.txt',
  '/sitemap.xml',
  '/opengraph-image',
])

async function hasValidSession(request) {
  const session = request.cookies.get(SESSION_COOKIE)?.value
  if (!session) return false
  try {
    await getFirebaseAdminAuth().verifySessionCookie(session, true)
    return true
  } catch {
    return false
  }
}

export async function proxy(request) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)
  const path = request.nextUrl.pathname
  const e2eBypass = process.env.NODE_ENV !== 'production' && process.env.E2E_AUTH_BYPASS === '1'
  const firebaseAuthHelper = path.startsWith('/__/auth/') || path.startsWith('/__/firebase/')

  if (path.startsWith('/api/') || firebaseAuthHelper || e2eBypass) {
    const response = NextResponse.next({ request: { headers: requestHeaders } })
    response.headers.set('x-request-id', requestId)
    return response
  }

  const authenticated = await hasValidSession(request)
  if (publicPages.has(path) && authenticated) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  if (!publicPages.has(path) && !authenticated) {
    const login = new URL('/login', request.url)
    login.searchParams.set('next', `${path}${request.nextUrl.search}`)
    const response = NextResponse.redirect(login)
    response.cookies.delete(SESSION_COOKIE)
    return response
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('x-request-id', requestId)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
