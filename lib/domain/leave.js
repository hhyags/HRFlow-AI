import { getPrisma } from '@/lib/prisma'

export function availableLeave(balance) {
  return Number(balance.openingBalance || 0)
    + Number(balance.accrued || 0)
    + Number(balance.carriedForward || 0)
    + Number(balance.adjusted || 0)
    - Number(balance.used || 0)
}

export function calculateCarryForward(available, maxCarryForward) {
  return Math.max(0, Math.min(Number(available || 0), Number(maxCarryForward || 0)))
}

export function calculateAccrual({
  accrualPerMonth,
  currentBalance,
  maxBalance,
  months = 1,
}) {
  const raw = Math.max(0, Number(accrualPerMonth || 0) * Math.max(0, months))
  if (maxBalance == null) return raw
  return Math.max(0, Math.min(raw, Number(maxBalance) - Number(currentBalance || 0)))
}

export function countLeaveDays(startDate, endDate, holidays = []) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (start > end) return 0
  const holidaySet = new Set(holidays.map((date) => new Date(date).toISOString().slice(0, 10)))
  let count = 0
  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const day = cursor.getUTCDay()
    const key = cursor.toISOString().slice(0, 10)
    if (day !== 0 && day !== 6 && !holidaySet.has(key)) count += 1
  }
  return count
}

export async function initializeApprovalChain(prisma, leaveRequest, approvalLevels) {
  const levels = Array.from({ length: Math.max(1, approvalLevels) }, (_, index) => ({
    organizationId: leaveRequest.organizationId,
    leaveRequestId: leaveRequest.id,
    level: index + 1,
  }))
  await prisma.leaveApproval.createMany({ data: levels, skipDuplicates: true })
  return prisma.leaveApproval.findMany({
    where: { leaveRequestId: leaveRequest.id },
    orderBy: { level: 'asc' },
  })
}

export async function approveLeaveLevel({
  organizationId,
  leaveRequestId,
  level,
  approverId,
  decision,
  comment,
  prisma = getPrisma(),
}) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.leaveRequest.findFirst({
      where: { id: leaveRequestId, organizationId },
      include: { approvals: { orderBy: { level: 'asc' } } },
    })
    if (!request) throw new Error('Leave request was not found.')
    const approval = request.approvals.find((item) => item.level === level)
    if (!approval || approval.status !== 'PENDING') throw new Error('Approval step is not pending.')
    const earlierPending = request.approvals.some((item) => item.level < level && item.status !== 'APPROVED')
    if (earlierPending) throw new Error('Earlier approval levels must be completed first.')

    await tx.leaveApproval.update({
      where: { id: approval.id },
      data: {
        status: decision,
        approverId,
        comment,
        decidedAt: new Date(),
      },
    })

    if (decision === 'REJECTED') {
      return tx.leaveRequest.update({
        where: { id: request.id },
        data: { status: 'REJECTED', reviewedBy: approverId, reviewedAt: new Date() },
      })
    }

    const isFinal = level === request.approvals.length
    if (!isFinal) return request

    const policy = await tx.leavePolicy.findUnique({
      where: { organizationId_type: { organizationId, type: request.type } },
    })
    if (!policy) throw new Error('No leave policy exists for this leave type.')
    if (request.type !== 'UNPAID') {
      const year = request.startDate.getUTCFullYear()
      const balance = await tx.leaveBalance.findUnique({
        where: { employeeId_policyId_year: { employeeId: request.employeeId, policyId: policy.id, year } },
      })
      if (!balance || availableLeave(balance) < Number(request.days)) throw new Error('Insufficient leave balance.')

      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: { used: { increment: request.days } },
      })
      await tx.leaveLedgerEntry.create({
        data: {
          organizationId,
          employeeId: request.employeeId,
          leaveRequestId: request.id,
          type: request.type,
          amount: -Number(request.days),
          entryType: 'USAGE',
          description: `Approved leave request ${request.id}`,
          effectiveDate: request.startDate,
        },
      })
    }
    return tx.leaveRequest.update({
      where: { id: request.id },
      data: { status: 'APPROVED', reviewedBy: approverId, reviewedAt: new Date() },
    })
  })
}

export async function accrueOrganizationLeave({
  organizationId,
  effectiveDate = new Date(),
  prisma = getPrisma(),
}) {
  const year = effectiveDate.getUTCFullYear()
  const [policies, employees] = await Promise.all([
    prisma.leavePolicy.findMany({ where: { organizationId, isActive: true } }),
    prisma.employee.findMany({ where: { organizationId, status: { not: 'INACTIVE' } }, select: { id: true } }),
  ])
  let processed = 0

  for (const employee of employees) {
    for (const policy of policies) {
      await prisma.$transaction(async (tx) => {
        const balance = await tx.leaveBalance.upsert({
          where: { employeeId_policyId_year: { employeeId: employee.id, policyId: policy.id, year } },
          update: {},
          create: { organizationId, employeeId: employee.id, policyId: policy.id, year },
        })
        const amount = calculateAccrual({
          accrualPerMonth: policy.accrualPerMonth,
          currentBalance: availableLeave(balance),
          maxBalance: policy.maxBalance,
        })
        if (amount <= 0) return
        await tx.leaveBalance.update({ where: { id: balance.id }, data: { accrued: { increment: amount } } })
        await tx.leaveLedgerEntry.create({
          data: {
            organizationId,
            employeeId: employee.id,
            type: policy.type,
            amount,
            entryType: 'ACCRUAL',
            description: `${effectiveDate.toISOString().slice(0, 7)} leave accrual`,
            effectiveDate,
          },
        })
        processed += 1
      })
    }
  }
  return { processed }
}
