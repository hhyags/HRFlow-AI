import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'
import { resolveEmployeeForAuth } from '@/lib/domain/access'
import { availableLeave, countLeaveDays, initializeApprovalChain } from '@/lib/domain/leave'
import { queueNotification } from '@/lib/domain/notifications'

const schema = z.object({
  employeeId: z.string().uuid().optional(),
  type: z.enum(['CASUAL', 'SICK', 'EARNED', 'UNPAID']),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().trim().max(2000).optional().nullable(),
})

export async function POST(request) {
  const auth = await requireAuth(request, ['HR_MANAGER', 'EMPLOYEE'])
  if (auth.error) return auth.error
  const input = schema.safeParse(await request.json())
  if (!input.success || input.data.startDate > input.data.endDate) {
    return NextResponse.json({ error: 'Invalid leave request', details: input.error?.flatten() }, { status: 400 })
  }
  const prisma = getPrisma()
  const employee = await resolveEmployeeForAuth(auth, input.data.employeeId, prisma)
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  const policy = await prisma.leavePolicy.findUnique({
    where: { organizationId_type: { organizationId: auth.profile.organizationId, type: input.data.type } },
  })
  if (!policy?.isActive) return NextResponse.json({ error: 'No active leave policy exists for this type' }, { status: 409 })
  const holidays = await prisma.holiday.findMany({
    where: {
      organizationId: auth.profile.organizationId,
      date: { gte: input.data.startDate, lte: input.data.endDate },
      isOptional: false,
      OR: [{ location: null }, { location: employee.location }],
    },
    select: { date: true },
  })
  const days = countLeaveDays(input.data.startDate, input.data.endDate, holidays.map((item) => item.date))
  if (days <= 0) return NextResponse.json({ error: 'The selected period contains no working days' }, { status: 400 })
  const year = input.data.startDate.getUTCFullYear()
  const balance = await prisma.leaveBalance.findUnique({
    where: { employeeId_policyId_year: { employeeId: employee.id, policyId: policy.id, year } },
  })
  if (input.data.type !== 'UNPAID' && (!balance || availableLeave(balance) < days)) {
    return NextResponse.json({ error: 'Insufficient leave balance' }, { status: 409 })
  }
  const overlapping = await prisma.leaveRequest.findFirst({
    where: {
      organizationId: auth.profile.organizationId,
      employeeId: employee.id,
      status: { in: ['PENDING', 'APPROVED'] },
      startDate: { lte: input.data.endDate },
      endDate: { gte: input.data.startDate },
    },
  })
  if (overlapping) return NextResponse.json({ error: 'Leave request overlaps an existing request' }, { status: 409 })

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      organizationId: auth.profile.organizationId,
      employeeId: employee.id,
      type: input.data.type,
      startDate: input.data.startDate,
      endDate: input.data.endDate,
      days,
      reason: input.data.reason,
    },
  })
  const approvals = await initializeApprovalChain(prisma, leaveRequest, policy.approvalLevels)
  const managers = await prisma.user.findMany({
    where: { organizationId: auth.profile.organizationId, role: 'HR_MANAGER' },
    select: { id: true },
  })
  await Promise.all(managers.map((manager) => queueNotification({
    organizationId: auth.profile.organizationId,
    recipientId: manager.id,
    type: 'LEAVE_APPROVAL_REQUIRED',
    title: 'Leave request needs approval',
    body: `${employee.firstName} ${employee.lastName} requested ${days} day(s) of ${input.data.type.toLowerCase()} leave.`,
    data: { leaveRequestId: leaveRequest.id },
    prisma,
  })))
  return NextResponse.json({ data: { ...leaveRequest, approvals } }, { status: 201 })
}
