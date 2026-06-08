import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  shiftFindMany: vi.fn(),
  shiftCreate: vi.fn(),
  notificationFindMany: vi.fn(),
  notificationCount: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  requireAuth: mocks.requireAuth,
}))
vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({
    shift: { findMany: mocks.shiftFindMany, create: mocks.shiftCreate },
    notification: { findMany: mocks.notificationFindMany, count: mocks.notificationCount },
  }),
}))

const shifts = await import('@/app/api/attendance-engine/shifts/route')
const notifications = await import('@/app/api/notifications/route')

function nextRequest(url, options = {}) {
  const request = new Request(url, options)
  request.nextUrl = new URL(url)
  return request
}

describe('production APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAuth.mockResolvedValue({
      user: { id: 'user' },
      profile: { organizationId: 'org', role: 'HR_MANAGER' },
    })
  })

  it('lists only organization shifts', async () => {
    mocks.shiftFindMany.mockResolvedValue([{ id: 'shift' }])
    const response = await shifts.GET(nextRequest('https://hrflow.example/api/attendance-engine/shifts'))
    expect(response.status).toBe(200)
    expect((await response.json()).data).toHaveLength(1)
    expect(mocks.shiftFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: 'org' } }))
  })

  it('validates and creates shifts', async () => {
    mocks.shiftCreate.mockResolvedValue({ id: 'shift' })
    const response = await shifts.POST(nextRequest('https://hrflow.example/api/attendance-engine/shifts', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Standard', timezone: 'UTC', startMinutes: 540, endMinutes: 1020, workingDays: [1, 2, 3, 4, 5],
      }),
      headers: { 'Content-Type': 'application/json' },
    }))
    expect(response.status).toBe(201)
    expect(mocks.shiftCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ organizationId: 'org', name: 'Standard' }),
    }))
  })

  it('returns validation failures and RBAC errors', async () => {
    const invalid = await shifts.POST(nextRequest('https://hrflow.example/api/attendance-engine/shifts', {
      method: 'POST', body: JSON.stringify({ name: '' }), headers: { 'Content-Type': 'application/json' },
    }))
    expect(invalid.status).toBe(400)
    mocks.requireAuth.mockResolvedValueOnce({ error: new Response('Forbidden', { status: 403 }) })
    expect((await shifts.POST(nextRequest('https://hrflow.example/api/attendance-engine/shifts', {
      method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' },
    }))).status).toBe(403)
  })

  it('returns a user-scoped notification inbox', async () => {
    mocks.notificationFindMany.mockResolvedValue([{ id: 'n' }])
    mocks.notificationCount.mockResolvedValue(1)
    const response = await notifications.GET(nextRequest('https://hrflow.example/api/notifications?unread=true'))
    const body = await response.json()
    expect(body.unread).toBe(1)
    expect(mocks.notificationFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: 'org', recipientId: 'user', readAt: null }),
    }))
  })
})
