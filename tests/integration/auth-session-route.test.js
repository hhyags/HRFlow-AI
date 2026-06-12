import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  createSessionCookie: vi.fn(),
  provisionFirebaseUser: vi.fn(),
  requireAuth: vi.fn(),
  setSessionCookie: vi.fn((response) => response),
}))

vi.mock('@/lib/firebase/admin', () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken: mocks.verifyIdToken,
    createSessionCookie: mocks.createSessionCookie,
  }),
}))
vi.mock('@/lib/firebase/session', () => ({
  SESSION_DURATION_MS: 432_000_000,
  provisionFirebaseUser: mocks.provisionFirebaseUser,
  setSessionCookie: mocks.setSessionCookie,
}))
vi.mock('@/lib/auth', () => ({
  roles: { EMPLOYEE: 'EMPLOYEE' },
  hasTrustedOrigin: () => true,
  requireAuth: mocks.requireAuth,
}))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => ({ allowed: true }),
  rateLimitKey: () => 'session-test',
}))

const { POST } = await import('@/app/api/auth/session/route')

function request(body) {
  return new Request('https://hrflow.example/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('authentication session route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifyIdToken.mockResolvedValue({
      uid: 'firebase-user',
      email: 'manager@example.com',
      email_verified: true,
      auth_time: Math.floor(Date.now() / 1000) - 3600,
    })
    mocks.createSessionCookie.mockResolvedValue('fresh-session')
    mocks.requireAuth.mockResolvedValue({
      user: { id: 'profile-id' },
      profile: {
        id: 'profile-id',
        email: 'manager@example.com',
        role: 'HR_MANAGER',
        organizationId: 'org-id',
      },
    })
  })

  it('renews an existing verified session without reprovisioning the user', async () => {
    const response = await POST(request({ idToken: 'firebase-token', sessionRefresh: true }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.user).toMatchObject({ role: 'HR_MANAGER', organizationId: 'org-id' })
    expect(mocks.requireAuth).toHaveBeenCalledOnce()
    expect(mocks.createSessionCookie).toHaveBeenCalledWith('firebase-token', { expiresIn: 432_000_000 })
    expect(mocks.provisionFirebaseUser).not.toHaveBeenCalled()
  })

  it('still requires recent authentication for a new server session', async () => {
    const response = await POST(request({ idToken: 'firebase-token' }))

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Recent sign in required' })
    expect(mocks.createSessionCookie).not.toHaveBeenCalled()
  })
})
