import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  verifySessionCookie: vi.fn(),
  findUnique: vi.fn(),
}))

vi.mock('@/lib/firebase/admin', () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken: mocks.verifyIdToken,
    verifySessionCookie: mocks.verifySessionCookie,
  }),
}))
vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({ user: { findUnique: mocks.findUnique } }),
}))

const { getRequestAuth, hasTrustedOrigin, requireAuth } = await import('@/lib/auth')

function request({ method = 'GET', origin, bearer = true } = {}) {
  const headers = new Headers()
  if (origin) headers.set('origin', origin)
  headers.set('host', 'hrflow.example')
  if (bearer) headers.set('authorization', 'Bearer token')
  return {
    method,
    headers,
    nextUrl: new URL('https://hrflow.example/api/test'),
  }
}

describe('authentication and RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifyIdToken.mockResolvedValue({ uid: 'firebase-user', email: 'u@example.com', email_verified: true })
  })

  it('returns an existing profile', async () => {
    mocks.findUnique.mockResolvedValue({
      id: 'user', firebaseUid: 'firebase-user', email: 'u@example.com',
      organizationId: 'org', role: 'HR_MANAGER',
    })
    await expect(getRequestAuth(request())).resolves.toMatchObject({ profile: { role: 'HR_MANAGER' } })
  })

  it('rejects identities without a linked database user', async () => {
    mocks.findUnique.mockResolvedValue(null)
    await expect(getRequestAuth(request())).resolves.toBeNull()
  })

  it('rejects mismatched emails', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'user', email: 'other@example.com' })
    await expect(getRequestAuth(request())).resolves.toBeNull()
  })

  it('enforces roles', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'user', email: 'u@example.com', organizationId: 'org', role: 'EMPLOYEE' })
    const result = await requireAuth(request(), ['HR_MANAGER'])
    expect(result.error.status).toBe(403)
  })

  it('requires verified email addresses', async () => {
    mocks.verifyIdToken.mockResolvedValue({ uid: 'firebase-user', email: 'u@example.com', email_verified: false })
    mocks.findUnique.mockResolvedValue({ id: 'user', email: 'u@example.com', organizationId: 'org', role: 'EMPLOYEE' })
    const result = await requireAuth(request())
    expect(result.error.status).toBe(403)
  })

  it('rejects cross-origin cookie mutations but permits bearer requests', async () => {
    const denied = await requireAuth(request({ method: 'POST', origin: 'https://evil.example', bearer: false }))
    expect(denied.error.status).toBe(403)
    mocks.findUnique.mockResolvedValue({ id: 'user', email: 'u@example.com', organizationId: 'org', role: 'HR_MANAGER' })
    const allowed = await requireAuth(request({ method: 'POST', origin: 'https://evil.example', bearer: true }))
    expect(allowed.profile.role).toBe('HR_MANAGER')
  })

  it('accepts same-host and configured proxy origins', () => {
    expect(hasTrustedOrigin(request({ origin: 'https://hrflow.example' }))).toBe(true)
    expect(hasTrustedOrigin(request({ origin: 'https://evil.example' }))).toBe(false)
  })
})
