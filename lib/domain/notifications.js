import { Resend } from 'resend'
import { getPrisma } from '@/lib/prisma'

let resend

function getResend() {
  if (!process.env.RESEND_API_KEY) return null
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY)
  return resend
}

export async function queueNotification({
  organizationId,
  recipientId,
  type,
  title,
  body,
  data,
  email = false,
  scheduledFor,
  prisma = getPrisma(),
}) {
  const channels = email ? ['IN_APP', 'EMAIL'] : ['IN_APP']
  return prisma.$transaction(channels.map((channel) => prisma.notification.create({
    data: { organizationId, recipientId, type, title, body, data, channel, scheduledFor },
  })))
}

export async function deliverPendingNotifications({ limit = 100, prisma = getPrisma() } = {}) {
  const now = new Date()
  const pending = await prisma.notification.findMany({
    where: {
      status: 'PENDING',
      OR: [{ scheduledFor: null }, { scheduledFor: { lte: now } }],
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })
  let sent = 0
  let failed = 0

  if (pending.length > 0) {
    // Bulk fetch profiles to prevent N+1 queries
    const recipientIds = [...new Set(pending.map((n) => n.recipientId))]
    const profiles = await prisma.user.findMany({
      where: { id: { in: recipientIds } },
      select: { id: true, fullName: true },
    })
    const profileMap = new Map(profiles.map((p) => [p.id, p]))

    for (const notification of pending) {
      try {
        if (notification.channel === 'EMAIL') {
          const profile = profileMap.get(notification.recipientId)
          const email = notification.data?.email
          if (!email) throw new Error(`No email supplied for ${profile?.fullName || notification.recipientId}.`)
          const client = getResend()
          if (!client) throw new Error('RESEND_API_KEY is not configured.')
          const { error } = await client.emails.send({
            from: process.env.EMAIL_FROM || 'HRFlow AI <onboarding@resend.dev>',
            to: email,
            subject: notification.title,
            text: notification.body,
          })
          if (error) throw new Error(error.message)
        }
        await prisma.notification.update({
          where: { id: notification.id },
          data: { status: 'SENT', sentAt: now, errorMessage: null },
        })
        sent += 1
      } catch (error) {
        await prisma.notification.update({
          where: { id: notification.id },
          data: { status: 'FAILED', errorMessage: String(error.message || error).slice(0, 1000) },
        })
        failed += 1
      }
    }
  }
  return { processed: pending.length, sent, failed }
}

export function nextReminderRun(schedule, from = new Date()) {
  const next = new Date(from)
  if (schedule === 'DAILY') next.setUTCDate(next.getUTCDate() + 1)
  else if (schedule === 'WEEKLY') next.setUTCDate(next.getUTCDate() + 7)
  else if (schedule === 'MONTHLY') next.setUTCMonth(next.getUTCMonth() + 1)
  else throw new Error('Unsupported reminder schedule.')
  return next
}

export async function processScheduledReminders({ now = new Date(), prisma = getPrisma() } = {}) {
  const reminders = await prisma.scheduledReminder.findMany({
    where: { isActive: true, nextRunAt: { lte: now } },
    take: 100,
  })
  let queued = 0
  for (const reminder of reminders) {
    const role = reminder.payload?.role
    const profiles = await prisma.user.findMany({
      where: {
        organizationId: reminder.organizationId,
        ...(role ? { role } : {}),
      },
      include: { employee: true },
      take: 1000,
    })

    const notificationsToCreate = []
    for (const profile of profiles) {
      const emailEnabled = Boolean(reminder.payload?.email)
      const channels = emailEnabled ? ['IN_APP', 'EMAIL'] : ['IN_APP']
      channels.forEach((channel) => {
        notificationsToCreate.push({
          organizationId: reminder.organizationId,
          recipientId: profile.id,
          type: reminder.type,
          title: reminder.payload?.title || 'HRFlow reminder',
          body: reminder.payload?.body || 'You have a pending HRFlow action.',
          data: { ...reminder.payload, email: profile.employee?.email },
          channel,
        })
      })
      queued += 1
    }

    if (notificationsToCreate.length > 0) {
      await prisma.notification.createMany({ data: notificationsToCreate })
    }

    await prisma.scheduledReminder.update({
      where: { id: reminder.id },
      data: {
        lastRunAt: now,
        nextRunAt: nextReminderRun(reminder.schedule, reminder.nextRunAt),
      },
    })
  }
  return { reminders: reminders.length, queued }
}
