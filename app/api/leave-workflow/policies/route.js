import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'

const schema = z.object({
  type: z.enum(['CASUAL', 'SICK', 'EARNED', 'UNPAID']),
  name: z.string().trim().min(1).max(100),
  annualAllowance: z.coerce.number().min(0).max(365),
  accrualPerMonth: z.coerce.number().min(0).max(31),
  maxCarryForward: z.coerce.number().min(0).max(365).default(0),
  maxBalance: z.coerce.number().min(0).max(730).optional().nullable(),
  approvalLevels: z.coerce.number().int().min(1).max(5).default(1),
  isActive: z.boolean().default(true),
})

export async function GET(request) {
  const auth = await requireAuth(request)
  if (auth.error) return auth.error
  const data = await getPrisma().leavePolicy.findMany({
    where: { organizationId: auth.profile.organizationId },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ data })
}

export async function POST(request) {
  const auth = await requireAuth(request, ['HR_MANAGER'])
  if (auth.error) return auth.error
  const input = schema.safeParse(await request.json())
  if (!input.success) return NextResponse.json({ error: 'Invalid leave policy', details: input.error.flatten() }, { status: 400 })
  const data = await getPrisma().leavePolicy.upsert({
    where: { organizationId_type: { organizationId: auth.profile.organizationId, type: input.data.type } },
    update: input.data,
    create: { ...input.data, organizationId: auth.profile.organizationId },
  })
  return NextResponse.json({ data }, { status: 201 })
}
