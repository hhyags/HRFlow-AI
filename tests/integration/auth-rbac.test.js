import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: mocks.getUser } }),
}))
vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({ profile: { findUnique: mocks.findUnique, create: mocks.create } }),
}))

const { getRequestAuth, requireAuth } = await import('@/lib/auth')

function request({ method = 'GET', origin, bearer = false } = {}) {
  const headers = new Headers()
  if (origin) headers.set('origin', origin)
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
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user', email: 'u@example.com', app_metadata: {} } }, error: null })
  })

  it('returns an existing profile', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'user', organizationId: 'org', role: 'HR_MANAGER' })
    await expect(getRequestAuth(request())).resolves.toMatchObject({ profile: { role: 'HR_MANAGER' } })
  })

  it('creates a profile from trusted app metadata', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: {
        id: 'user', email: 'u@example.com',
        app_metadata: { organization_id: 'org', role: 'EMPLOYEE' },
        user_metadata: { full_name: 'User' },
      } },
      error: null,
    })
    mocks.findUnique.mockResolvedValue(null)
    mocks.create.mockResolvedValue({ id: 'user', organizationId: 'org', role: 'EMPLOYEE' })
    await expect(getRequestAuth(request())).resolves.toMatchObject({ profile: { organizationId: 'org' } })
  })

  it('rejects missing users and missing organization metadata', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('invalid') })
    await expect(getRequestAuth(request())).resolves.toBeNull()
    mocks.findUnique.mockResolvedValue(null)
    await expect(getRequestAuth(request())).resolves.toBeNull()
  })

  it('enforces roles', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'user', organizationId: 'org', role: 'EMPLOYEE' })
    const result = await requireAuth(request(), ['HR_MANAGER'])
    expect(result.error.status).toBe(403)
  })

  it('rejects cross-origin cookie mutations but permits bearer requests', async () => {
    const denied = await requireAuth(request({ method: 'POST', origin: 'https://evil.example' }))
    expect(denied.error.status).toBe(403)
    mocks.findUnique.mockResolvedValue({ id: 'user', organizationId: 'org', role: 'HR_MANAGER' })
    const allowed = await requireAuth(request({ method: 'POST', origin: 'https://evil.example', bearer: true }))
    expect(allowed.profile.role).toBe('HR_MANAGER')
  })
})
