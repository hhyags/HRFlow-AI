import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { accrueOrganizationLeave } from '@/lib/domain/leave'
import { deliverPendingNotifications, processScheduledReminders } from '@/lib/domain/notifications'

function authorized(request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  return Boolean(process.env.CRON_SECRET && token === process.env.CRON_SECRET)
}

export async function GET(request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const prisma = getPrisma()
  const now = new Date()
  const results = {}

  results.reminders = await processScheduledReminders({ now, prisma })
  results.notifications = await deliverPendingNotifications({ limit: 250, prisma })

  if (now.getUTCDate() === 1) {
    const organizations = await prisma.organization.findMany({ select: { id: true }, take: 1000 })
    results.accruals = []
    for (const organization of organizations) {
      results.accruals.push({
        organizationId: organization.id,
        ...(await accrueOrganizationLeave({ organizationId: organization.id, effectiveDate: now, prisma })),
      })
    }
  }
  return NextResponse.json({ data: results })
}
