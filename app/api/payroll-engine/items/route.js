import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'

const schema = z.object({
  payrollId: z.string().uuid(),
  type: z.enum(['EARNING', 'DEDUCTION']),
  code: z.string().trim().min(1).max(50),
  description: z.string().trim().min(1).max(200),
  amount: z.coerce.number().nonnegative(),
  taxable: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(request) {
  const auth = await requireAuth(request, ['HR_MANAGER'])
  if (auth.error) return auth.error
  const input = schema.safeParse(await request.json())
  if (!input.success) return NextResponse.json({ error: 'Invalid payroll item', details: input.error.flatten() }, { status: 400 })
  const prisma = getPrisma()
  const payroll = await prisma.payroll.findFirst({
    where: { id: input.data.payrollId, organizationId: auth.profile.organizationId, status: 'DRAFT' },
  })
  if (!payroll) return NextResponse.json({ error: 'Draft payroll record not found' }, { status: 404 })
  const data = await prisma.$transaction(async (tx) => {
    const item = await tx.payrollItem.create({
      data: {
        ...input.data,
        organizationId: auth.profile.organizationId,
        employeeId: payroll.employeeId,
      },
    })
    const delta = input.data.type === 'EARNING' ? input.data.amount : -input.data.amount
    await tx.payroll.update({
      where: { id: payroll.id },
      data: {
        bonus: input.data.type === 'EARNING' ? { increment: input.data.amount } : undefined,
        deductions: input.data.type === 'DEDUCTION' ? { increment: input.data.amount } : undefined,
        netPay: { increment: delta },
      },
    })
    return item
  })
  return NextResponse.json({ data }, { status: 201 })
}
