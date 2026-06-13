import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  organizationFindUnique: vi.fn(),
  organizationUpdate: vi.fn(),
  transaction: vi.fn((operations) => Promise.all(operations)),
  writeAuditLog: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  roles: {
    HR_MANAGER: 'HR_MANAGER',
    RECRUITER: 'RECRUITER',
    EMPLOYEE: 'EMPLOYEE',
  },
  requireAuth: mocks.requireAuth,
}))
vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({
    user: {
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
    },
    organization: {
      findUnique: mocks.organizationFindUnique,
      update: mocks.organizationUpdate,
    },
    $transaction: mocks.transaction,
  }),
}))
vi.mock('@/lib/audit', () => ({
  writeAuditLog: mocks.writeAuditLog,
}))

const settingsRoute = await import('@/app/api/settings/route')

function request(method = 'GET', body) {
  return new Request('https://hrflow.example/api/settings', {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

const user = {
  id: 'user-id',
  email: 'manager@example.com',
  fullName: 'Demo Manager',
  role: 'HR_MANAGER',
  preferences: { weeklyDigest: false },
}

const organization = {
  id: 'org-id',
  name: 'Demo Organization',
  settings: {
    workspace: { timezone: 'Asia/Kolkata', locale: 'en-IN', currency: 'INR' },
    ai: { enabled: true, cacheEnabled: true, payrollContext: false },
  },
}

describe('settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAuth.mockResolvedValue({
      user: { id: 'user-id' },
      profile: { organizationId: 'org-id', role: 'HR_MANAGER' },
    })
    mocks.userFindUnique.mockResolvedValue(user)
    mocks.organizationFindUnique.mockResolvedValue(organization)
    mocks.userUpdate.mockResolvedValue(user)
    mocks.organizationUpdate.mockResolvedValue(organization)
  })

  it('returns merged profile, organization, and service settings', async () => {
    const response = await settingsRoute.GET(request())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.profile.fullName).toBe('Demo Manager')
    expect(body.data.organization.workspace.currency).toBe('INR')
    expect(body.data.preferences).toMatchObject({
      weeklyDigest: false,
      emailNotifications: true,
    })
  })

  it('allows HR managers to save organization and AI configuration', async () => {
    const response = await settingsRoute.PUT(request('PUT', {
      profile: { fullName: 'Updated Manager' },
      preferences: {
        emailNotifications: true,
        inAppNotifications: true,
        weeklyDigest: true,
        theme: 'DARK',
      },
      organization: {
        name: 'Updated Organization',
        workspace: { timezone: 'Asia/Kolkata', locale: 'en-IN', currency: 'inr' },
      },
      ai: { enabled: true, cacheEnabled: true, payrollContext: true },
    }))

    expect(response.status).toBe(200)
    expect(mocks.userUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-id' },
      data: expect.objectContaining({ fullName: 'Updated Manager' }),
    }))
    expect(mocks.organizationUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        name: 'Updated Organization',
        settings: expect.objectContaining({
          ai: expect.objectContaining({ payrollContext: true }),
        }),
      }),
    }))
    expect(mocks.writeAuditLog).toHaveBeenCalledOnce()
  })

  it('prevents employees from changing organization settings', async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: 'user-id' },
      profile: { organizationId: 'org-id', role: 'EMPLOYEE' },
    })

    const response = await settingsRoute.PUT(request('PUT', {
      organization: {
        name: 'Unauthorized Change',
        workspace: { timezone: 'UTC', locale: 'en-US', currency: 'USD' },
      },
    }))

    expect(response.status).toBe(403)
    expect(mocks.organizationUpdate).not.toHaveBeenCalled()
  })
})
