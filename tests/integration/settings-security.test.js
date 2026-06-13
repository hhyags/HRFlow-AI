import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  revokeRefreshTokens: vi.fn(),
  writeAuditLog: vi.fn(),
  clearSessionCookie: vi.fn((response) => response),
}))

vi.mock('@/lib/auth', () => ({
  requireAuth: mocks.requireAuth,
}))
vi.mock('@/lib/firebase/admin', () => ({
  getFirebaseAdminAuth: () => ({
    revokeRefreshTokens: mocks.revokeRefreshTokens,
  }),
}))
vi.mock('@/lib/firebase/session', () => ({
  clearSessionCookie: mocks.clearSessionCookie,
}))
vi.mock('@/lib/audit', () => ({
  writeAuditLog: mocks.writeAuditLog,
}))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => ({ allowed: true }),
}))

const { POST } = await import('@/app/api/settings/security/route')

describe('settings security actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAuth.mockResolvedValue({
      user: { id: 'user-id', uid: 'firebase-uid' },
      profile: { organizationId: 'org-id', role: 'EMPLOYEE' },
    })
    mocks.revokeRefreshTokens.mockResolvedValue()
  })

  it('revokes Firebase sessions, audits the action, and clears the cookie', async () => {
    const response = await POST(new Request('https://hrflow.example/api/settings/security', {
      method: 'POST',
    }))

    expect(response.status).toBe(200)
    expect(mocks.revokeRefreshTokens).toHaveBeenCalledWith('firebase-uid')
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'security.sessions.revoke',
      organizationId: 'org-id',
    }))
    expect(mocks.clearSessionCookie).toHaveBeenCalledOnce()
  })
})
