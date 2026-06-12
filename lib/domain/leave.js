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
  const accrualDate = new Date(Date.UTC(effectiveDate.getUTCFullYear(), effectiveDate.getUTCMonth(), 1))
  const year = effectiveDate.getUTCFullYear()
  const [policies, employees, existingAccruals] = await Promise.all([
    prisma.leavePolicy.findMany({ where: { organizationId, isActive: true } }),
    prisma.employee.findMany({ where: { organizationId, status: { not: 'INACTIVE' } }, select: { id: true } }),
    prisma.leaveLedgerEntry.findMany({
      where: { organizationId, entryType: 'ACCRUAL', effectiveDate: accrualDate },
      select: { employeeId: true, type: true },
    }),
  ])
  const accruedKeys = new Set(existingAccruals.map((entry) => `${entry.employeeId}_${entry.type}`))
  let processed = 0

  // Fetch all existing balances for this year to avoid upserting one by one
  const existingBalances = await prisma.leaveBalance.findMany({
    where: { organizationId, year }
  })
  const balanceMap = new Map(existingBalances.map(b => [`${b.employeeId}_${b.policyId}`, b]))

  const missingBalancesData = []
  for (const employee of employees) {
    for (const policy of policies) {
      const key = `${employee.id}_${policy.id}`
      if (!balanceMap.has(key)) {
        missingBalancesData.push({
          organizationId,
          employeeId: employee.id,
          policyId: policy.id,
          year,
        })
      }
    }
  }

  // Bulk insert missing balances
  if (missingBalancesData.length > 0) {
    await prisma.leaveBalance.createMany({
      data: missingBalancesData,
      skipDuplicates: true
    })
    // Re-fetch all balances so we have the IDs
    const updatedBalances = await prisma.leaveBalance.findMany({
      where: { organizationId, year }
    })
    balanceMap.clear()
    updatedBalances.forEach(b => balanceMap.set(`${b.employeeId}_${b.policyId}`, b))
  }

  // Now calculate all accruals and perform updates in a single transaction
  const balanceUpdates = []
  const ledgerEntries = []

  for (const employee of employees) {
    for (const policy of policies) {
      const key = `${employee.id}_${policy.id}`
      const balance = balanceMap.get(key)
      if (!balance || accruedKeys.has(`${employee.id}_${policy.type}`)) continue

      const amount = calculateAccrual({
        accrualPerMonth: policy.accrualPerMonth,
        currentBalance: availableLeave(balance),
        maxBalance: policy.maxBalance,
      })

      if (amount > 0) {
        balanceUpdates.push({
          id: balance.id,
          amount
        })
        ledgerEntries.push({
          organizationId,
          employeeId: employee.id,
          type: policy.type,
          amount,
          entryType: 'ACCRUAL',
          description: `${accrualDate.toISOString().slice(0, 7)} leave accrual`,
          effectiveDate: accrualDate,
        })
      }
    }
  }

  if (balanceUpdates.length > 0) {
    processed = balanceUpdates.length
    await prisma.$transaction(async (tx) => {
      // Perform balance increments
      for (const update of balanceUpdates) {
        await tx.leaveBalance.update({
          where: { id: update.id },
          data: { accrued: { increment: update.amount } }
        })
      }
      // Bulk insert ledger entries
      await tx.leaveLedgerEntry.createMany({
        data: ledgerEntries
      })
    })
  }

  return { processed }
}
