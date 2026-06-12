import { beforeEach, describe, expect, it, vi } from 'vitest'

const send = vi.fn()
vi.mock('resend', () => ({
  Resend: class {
    emails = { send }
  },
}))

const {
  deliverPendingNotifications,
  nextReminderRun,
  processScheduledReminders,
  queueNotification,
} = await import('@/lib/domain/notifications')

describe('notification system', () => {
  beforeEach(() => {
    send.mockReset()
    process.env.RESEND_API_KEY = 'test'
    process.env.EMAIL_FROM = 'HRFlow <test@example.com>'
  })

  it('queues in-app and optional email records', async () => {
    const prisma = {
      notification: { create: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)) },
      $transaction: (promises) => Promise.all(promises),
    }
    await expect(queueNotification({
      organizationId: 'org', recipientId: 'user', type: 'TEST',
      title: 'Title', body: 'Body', email: true, prisma,
    })).resolves.toHaveLength(2)
    expect(prisma.notification.create).toHaveBeenCalledTimes(2)
  })

  it('delivers in-app and email notifications', async () => {
    send.mockResolvedValue({ data: { id: 'email' }, error: null })
    const update = vi.fn().mockResolvedValue({})
    const prisma = {
      notification: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'in', channel: 'IN_APP', recipientId: 'u', data: {} },
          { id: 'email', channel: 'EMAIL', recipientId: 'u', title: 'T', body: 'B', data: { email: 'u@example.com' } },
        ]),
        update,
      },
      user: { findMany: vi.fn().mockResolvedValue([{ id: 'u', fullName: 'User' }]) },
    }
    await expect(deliverPendingNotifications({ prisma })).resolves.toEqual({ processed: 2, sent: 2, failed: 0 })
    expect(send).toHaveBeenCalled()
  })

  it('records delivery failures', async () => {
    send.mockResolvedValue({ error: { message: 'provider error' } })
    const update = vi.fn().mockResolvedValue({})
    const prisma = {
      notification: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'email', channel: 'EMAIL', recipientId: 'u', title: 'T', body: 'B', data: { email: 'u@example.com' } },
        ]),
        update,
      },
      user: { findMany: vi.fn().mockResolvedValue([{ id: 'u', fullName: 'User' }]) },
    }
    await expect(deliverPendingNotifications({ prisma })).resolves.toEqual({ processed: 1, sent: 0, failed: 1 })
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }))
  })

  it('fails email delivery when configuration or recipient email is missing', async () => {
    const update = vi.fn().mockResolvedValue({})
    const prisma = {
      notification: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'missing-email', channel: 'EMAIL', recipientId: 'u', title: 'T', body: 'B', data: {} },
        ]),
        update,
      },
      user: { findMany: vi.fn().mockResolvedValue([]) },
    }
    await expect(deliverPendingNotifications({ prisma })).resolves.toMatchObject({ failed: 1 })
    prisma.notification.findMany.mockResolvedValue([
      { id: 'missing-key', channel: 'EMAIL', recipientId: 'u', title: 'T', body: 'B', data: { email: 'u@example.com' } },
    ])
    delete process.env.RESEND_API_KEY
    await expect(deliverPendingNotifications({ prisma })).resolves.toMatchObject({ failed: 1 })
  })

  it('calculates supported reminder schedules', () => {
    const date = new Date('2026-01-01T00:00:00Z')
    expect(nextReminderRun('DAILY', date).toISOString()).toBe('2026-01-02T00:00:00.000Z')
    expect(nextReminderRun('WEEKLY', date).toISOString()).toBe('2026-01-08T00:00:00.000Z')
    expect(nextReminderRun('MONTHLY', date).toISOString()).toBe('2026-02-01T00:00:00.000Z')
    expect(() => nextReminderRun('HOURLY', date)).toThrow('Unsupported')
  })

  it('processes reminders for matching profiles', async () => {
    const prisma = {
      scheduledReminder: {
        findMany: vi.fn().mockResolvedValue([{
          id: 'r', organizationId: 'org', type: 'REVIEW',
          schedule: 'DAILY', nextRunAt: new Date('2026-01-01'),
          payload: { title: 'Review', body: 'Complete review', role: 'EMPLOYEE', email: false },
        }]),
        update: vi.fn().mockResolvedValue({}),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([{ id: 'u', employee: { email: 'u@example.com' } }]),
      },
      notification: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    }
    await expect(processScheduledReminders({ now: new Date('2026-01-02'), prisma })).resolves.toEqual({ reminders: 1, queued: 1 })
  })

  it('uses default reminder content and no role filter', async () => {
    const prisma = {
      scheduledReminder: {
        findMany: vi.fn().mockResolvedValue([{
          id: 'r', organizationId: 'org', type: 'GENERAL',
          schedule: 'WEEKLY', nextRunAt: new Date('2026-01-01'), payload: {},
        }]),
        update: vi.fn().mockResolvedValue({}),
      },
      user: { findMany: vi.fn().mockResolvedValue([{ id: 'u', employee: null }]) },
      notification: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    }
    await expect(processScheduledReminders({ now: new Date('2026-01-02'), prisma })).resolves.toEqual({ reminders: 1, queued: 1 })
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org' },
    }))
    expect(prisma.notification.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([expect.objectContaining({ title: 'HRFlow reminder', body: 'You have a pending HRFlow action.' })]),
    }))
  })
})
