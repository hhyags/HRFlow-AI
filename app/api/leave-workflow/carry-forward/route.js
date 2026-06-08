import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'
import { availableLeave, calculateCarryForward } from '@/lib/domain/leave'

const schema = z.object({ fromYear: z.coerce.number().int().min(2000).max(2200) })

export async function POST(request) {
  const auth = await requireAuth(request, ['HR_MANAGER'])
  if (auth.error) return auth.error
  const input = schema.safeParse(await request.json())
  if (!input.success) return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
  const prisma = getPrisma()
  const balances = await prisma.leaveBalance.findMany({
    where: { organizationId: auth.profile.organizationId, year: input.data.fromYear },
    include: { policy: true },
  })
  let processed = 0
  for (const balance of balances) {
    const amount = calculateCarryForward(availableLeave(balance), balance.policy.maxCarryForward)
    await prisma.leaveBalance.upsert({
      where: {
        employeeId_policyId_year: {
          employeeId: balance.employeeId,
          policyId: balance.policyId,
          year: input.data.fromYear + 1,
        },
      },
      update: { carriedForward: amount },
      create: {
        organizationId: auth.profile.organizationId,
        employeeId: balance.employeeId,
        policyId: balance.policyId,
        year: input.data.fromYear + 1,
        carriedForward: amount,
      },
    })
    if (amount > 0) {
      await prisma.leaveLedgerEntry.create({
        data: {
          organizationId: auth.profile.organizationId,
          employeeId: balance.employeeId,
          type: balance.policy.type,
          amount,
          entryType: 'CARRY_FORWARD',
          description: `Carry-forward from ${input.data.fromYear}`,
          effectiveDate: new Date(Date.UTC(input.data.fromYear + 1, 0, 1)),
        },
      })
    }
    processed += 1
  }
  return NextResponse.json({ data: { processed } })
}
