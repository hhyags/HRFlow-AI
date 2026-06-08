import { describe, expect, it, vi } from 'vitest'
import {
  accrueOrganizationLeave,
  approveLeaveLevel,
  availableLeave,
  calculateAccrual,
  calculateCarryForward,
  countLeaveDays,
  initializeApprovalChain,
} from '@/lib/domain/leave'

describe('leave engine calculations', () => {
  it('calculates balances, accrual caps, and carry-forward', () => {
    expect(availableLeave({ openingBalance: 10, accrued: 2, carriedForward: 3, adjusted: -1, used: 4 })).toBe(10)
    expect(calculateCarryForward(12, 5)).toBe(5)
    expect(calculateCarryForward(-2, 5)).toBe(0)
    expect(calculateAccrual({ accrualPerMonth: 1.5, currentBalance: 5, maxBalance: 6, months: 2 })).toBe(1)
    expect(calculateAccrual({ accrualPerMonth: 1.5, currentBalance: 5, maxBalance: null, months: 2 })).toBe(3)
    expect(availableLeave({})).toBe(0)
    expect(calculateCarryForward(undefined, undefined)).toBe(0)
    expect(calculateAccrual({ accrualPerMonth: -1, currentBalance: 0, maxBalance: 10, months: -2 })).toBe(0)
  })

  it('counts weekdays excluding holidays', () => {
    expect(countLeaveDays('2026-06-01', '2026-06-07', ['2026-06-03'])).toBe(4)
    expect(countLeaveDays('2026-06-07', '2026-06-01')).toBe(0)
  })

  it('initializes an approval chain', async () => {
    const prisma = {
      leaveApproval: {
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
        findMany: vi.fn().mockResolvedValue([{ level: 1 }, { level: 2 }]),
      },
    }
    await expect(initializeApprovalChain(prisma, { id: 'leave', organizationId: 'org' }, 2)).resolves.toHaveLength(2)
    expect(prisma.leaveApproval.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([expect.objectContaining({ level: 2 })]),
    }))
  })
})

function approvalPrisma({ decision = 'APPROVED', final = true, unpaid = false, available = 10 } = {}) {
  const request = {
    id: 'leave', organizationId: 'org', employeeId: 'emp',
    type: unpaid ? 'UNPAID' : 'CASUAL', days: 2, startDate: new Date('2026-06-01'),
    approvals: final
      ? [{ id: 'a1', level: 1, status: 'PENDING' }]
      : [{ id: 'a1', level: 1, status: 'PENDING' }, { id: 'a2', level: 2, status: 'PENDING' }],
  }
  const tx = {
    leaveRequest: {
      findFirst: vi.fn().mockResolvedValue(request),
      update: vi.fn().mockImplementation(({ data }) => ({ ...request, ...data })),
    },
    leaveApproval: { update: vi.fn().mockResolvedValue({}) },
    leavePolicy: { findUnique: vi.fn().mockResolvedValue({ id: 'policy' }) },
    leaveBalance: {
      findUnique: vi.fn().mockResolvedValue({ id: 'balance', openingBalance: available, accrued: 0, used: 0, adjusted: 0, carriedForward: 0 }),
      update: vi.fn().mockResolvedValue({}),
    },
    leaveLedgerEntry: { create: vi.fn().mockResolvedValue({}) },
  }
  return { $transaction: (callback) => callback(tx), tx, decision }
}

describe('leave approval workflow', () => {
  it('approves a final paid leave step and records usage', async () => {
    const prisma = approvalPrisma()
    const result = await approveLeaveLevel({
      organizationId: 'org', leaveRequestId: 'leave', level: 1,
      approverId: 'manager', decision: 'APPROVED', prisma,
    })
    expect(result.status).toBe('APPROVED')
    expect(prisma.tx.leaveBalance.update).toHaveBeenCalled()
    expect(prisma.tx.leaveLedgerEntry.create).toHaveBeenCalled()
  })

  it('rejects leave immediately', async () => {
    const prisma = approvalPrisma()
    const result = await approveLeaveLevel({
      organizationId: 'org', leaveRequestId: 'leave', level: 1,
      approverId: 'manager', decision: 'REJECTED', prisma,
    })
    expect(result.status).toBe('REJECTED')
  })

  it('advances a non-final step without consuming balance', async () => {
    const prisma = approvalPrisma({ final: false })
    const result = await approveLeaveLevel({
      organizationId: 'org', leaveRequestId: 'leave', level: 1,
      approverId: 'manager', decision: 'APPROVED', prisma,
    })
    expect(result.id).toBe('leave')
    expect(prisma.tx.leaveBalance.update).not.toHaveBeenCalled()
  })

  it('approves unpaid leave without a balance transaction', async () => {
    const prisma = approvalPrisma({ unpaid: true })
    await approveLeaveLevel({
      organizationId: 'org', leaveRequestId: 'leave', level: 1,
      approverId: 'manager', decision: 'APPROVED', prisma,
    })
    expect(prisma.tx.leaveBalance.findUnique).not.toHaveBeenCalled()
  })

  it('rejects invalid sequencing, missing records, and insufficient balance', async () => {
    const missing = approvalPrisma()
    missing.tx.leaveRequest.findFirst.mockResolvedValue(null)
    await expect(approveLeaveLevel({
      organizationId: 'org', leaveRequestId: 'leave', level: 1, approverId: 'manager', decision: 'APPROVED', prisma: missing,
    })).rejects.toThrow('not found')

    const sequence = approvalPrisma({ final: false })
    sequence.tx.leaveRequest.findFirst.mockResolvedValue({
      ...await sequence.tx.leaveRequest.findFirst(),
      approvals: [{ id: 'a1', level: 1, status: 'PENDING' }, { id: 'a2', level: 2, status: 'PENDING' }],
    })
    await expect(approveLeaveLevel({
      organizationId: 'org', leaveRequestId: 'leave', level: 2, approverId: 'manager', decision: 'APPROVED', prisma: sequence,
    })).rejects.toThrow('Earlier approval')

    const insufficient = approvalPrisma({ available: 1 })
    await expect(approveLeaveLevel({
      organizationId: 'org', leaveRequestId: 'leave', level: 1, approverId: 'manager', decision: 'APPROVED', prisma: insufficient,
    })).rejects.toThrow('Insufficient')

    const decided = approvalPrisma()
    decided.tx.leaveRequest.findFirst.mockResolvedValue({
      ...await decided.tx.leaveRequest.findFirst(),
      approvals: [{ id: 'a1', level: 1, status: 'APPROVED' }],
    })
    await expect(approveLeaveLevel({
      organizationId: 'org', leaveRequestId: 'leave', level: 1, approverId: 'manager', decision: 'APPROVED', prisma: decided,
    })).rejects.toThrow('not pending')

    const noPolicy = approvalPrisma()
    noPolicy.tx.leavePolicy.findUnique.mockResolvedValue(null)
    await expect(approveLeaveLevel({
      organizationId: 'org', leaveRequestId: 'leave', level: 1, approverId: 'manager', decision: 'APPROVED', prisma: noPolicy,
    })).rejects.toThrow('No leave policy')
  })

  it('accrues active policies for active employees', async () => {
    const tx = {
      leaveBalance: {
        upsert: vi.fn().mockResolvedValue({ id: 'balance', openingBalance: 0, accrued: 0, used: 0, adjusted: 0, carriedForward: 0 }),
        update: vi.fn().mockResolvedValue({}),
      },
      leaveLedgerEntry: { create: vi.fn().mockResolvedValue({}) },
    }
    const prisma = {
      leavePolicy: { findMany: vi.fn().mockResolvedValue([{ id: 'policy', type: 'CASUAL', accrualPerMonth: 1, maxBalance: 12 }]) },
      employee: { findMany: vi.fn().mockResolvedValue([{ id: 'emp' }]) },
      $transaction: (callback) => callback(tx),
    }
    await expect(accrueOrganizationLeave({ organizationId: 'org', effectiveDate: new Date('2026-06-01'), prisma })).resolves.toEqual({ processed: 1 })
    expect(tx.leaveLedgerEntry.create).toHaveBeenCalled()
  })

  it('skips accrual when the balance is capped', async () => {
    const tx = {
      leaveBalance: {
        upsert: vi.fn().mockResolvedValue({ id: 'balance', openingBalance: 12, accrued: 0, used: 0, adjusted: 0, carriedForward: 0 }),
        update: vi.fn(),
      },
      leaveLedgerEntry: { create: vi.fn() },
    }
    const prisma = {
      leavePolicy: { findMany: vi.fn().mockResolvedValue([{ id: 'policy', type: 'CASUAL', accrualPerMonth: 1, maxBalance: 12 }]) },
      employee: { findMany: vi.fn().mockResolvedValue([{ id: 'emp' }]) },
      $transaction: (callback) => callback(tx),
    }
    await expect(accrueOrganizationLeave({ organizationId: 'org', prisma })).resolves.toEqual({ processed: 0 })
    expect(tx.leaveBalance.update).not.toHaveBeenCalled()
  })
})
