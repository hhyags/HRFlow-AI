import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  create: vi.fn(),
  writeAuditLog: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  roles: { HR_MANAGER: 'HR_MANAGER', RECRUITER: 'RECRUITER', EMPLOYEE: 'EMPLOYEE' },
  requireAuth: mocks.requireAuth,
}))
vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({ organizationInvite: { create: mocks.create } }),
}))
vi.mock('@/lib/audit', () => ({ writeAuditLog: mocks.writeAuditLog }))

const invitations = await import('@/app/api/auth/invitations/route')

function request(body) {
  const value = new Request('https://hrflow.example/api/auth/invitations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  value.nextUrl = new URL(value.url)
  return value
}

describe('organization invitations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAuth.mockResolvedValue({
      user: { id: 'manager' },
      profile: { organizationId: 'org', role: 'HR_MANAGER' },
    })
    mocks.create.mockImplementation(({ data }) => Promise.resolve({ id: 'invite', ...data }))
  })

  it('creates an email-bound invitation without storing the raw token', async () => {
    const response = await invitations.POST(request({ email: 'New@Example.com', role: 'RECRUITER' }))
    const body = await response.json()
    expect(response.status).toBe(201)
    expect(body.data.token).toHaveLength(43)
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org',
        email: 'new@example.com',
        role: 'RECRUITER',
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    })
    expect(mocks.create.mock.calls[0][0].data.tokenHash).not.toBe(body.data.token)
  })

  it('rejects invalid roles', async () => {
    const response = await invitations.POST(request({ email: 'new@example.com', role: 'HR_MANAGER' }))
    expect(response.status).toBe(400)
  })
})
