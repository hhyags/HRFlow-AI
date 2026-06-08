import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { approveLeaveLevel } from '@/lib/domain/leave'
import { getPrisma } from '@/lib/prisma'
import { queueNotification } from '@/lib/domain/notifications'

const schema = z.object({
  leaveRequestId: z.string().uuid(),
  level: z.coerce.number().int().min(1).max(5),
  decision: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().trim().max(1000).optional(),
})

export async function POST(request) {
  const auth = await requireAuth(request, ['HR_MANAGER'])
  if (auth.error) return auth.error
  const input = schema.safeParse(await request.json())
  if (!input.success) return NextResponse.json({ error: 'Invalid approval', details: input.error.flatten() }, { status: 400 })
  try {
    const prisma = getPrisma()
    const data = await approveLeaveLevel({
      organizationId: auth.profile.organizationId,
      approverId: auth.user.id,
      ...input.data,
      prisma,
    })
    const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } })
    if (employee?.profileId) {
      await queueNotification({
        organizationId: auth.profile.organizationId,
        recipientId: employee.profileId,
        type: 'LEAVE_STATUS_UPDATED',
        title: 'Leave request updated',
        body: `Your leave request is now ${data.status.toLowerCase()}.`,
        data: { leaveRequestId: data.id, email: employee.email },
        email: data.status === 'APPROVED' || data.status === 'REJECTED',
        prisma,
      })
    }
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 409 })
  }
}
