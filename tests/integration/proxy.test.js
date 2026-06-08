import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const verifySessionCookie = vi.fn()
vi.mock('@/lib/firebase/admin', () => ({
  getFirebaseAdminAuth: () => ({ verifySessionCookie }),
}))

const { proxy } = await import('@/proxy')

describe('dashboard route protection', () => {
  afterEach(() => {
    delete process.env.E2E_AUTH_BYPASS
    vi.clearAllMocks()
  })

  it('redirects unauthenticated dashboard requests to login', async () => {
    const response = await proxy(new NextRequest('https://hrflow.example/'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/login?next=%2F')
  })

  it('allows public authentication pages', async () => {
    const response = await proxy(new NextRequest('https://hrflow.example/login'))
    expect(response.headers.get('location')).toBeNull()
  })

  it('allows valid sessions and redirects authenticated login visits', async () => {
    verifySessionCookie.mockResolvedValue({ uid: 'firebase-user' })
    const headers = { cookie: 'hrflow_session=session-cookie' }
    const dashboard = await proxy(new NextRequest('https://hrflow.example/', { headers }))
    expect(dashboard.headers.get('location')).toBeNull()
    const login = await proxy(new NextRequest('https://hrflow.example/login', { headers }))
    expect(login.headers.get('location')).toBe('https://hrflow.example/')
  })
})
