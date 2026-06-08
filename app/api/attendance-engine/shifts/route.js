import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  timezone: z.string().trim().min(1).default('UTC'),
  startMinutes: z.coerce.number().int().min(0).max(1439),
  endMinutes: z.coerce.number().int().min(0).max(1439),
  breakMinutes: z.coerce.number().int().min(0).max(480).default(0),
  graceMinutes: z.coerce.number().int().min(0).max(180).default(0),
  overtimeAfterMinutes: z.coerce.number().int().min(0).max(1440).default(480),
  workingDays: z.array(z.coerce.number().int().min(0).max(6)).min(1),
  isActive: z.boolean().default(true),
})

export async function GET(request) {
  const auth = await requireAuth(request)
  if (auth.error) return auth.error
  const data = await getPrisma().shift.findMany({
    where: { organizationId: auth.profile.organizationId },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ data })
}

export async function POST(request) {
  const auth = await requireAuth(request, ['HR_MANAGER'])
  if (auth.error) return auth.error
  const input = schema.safeParse(await request.json())
  if (!input.success) return NextResponse.json({ error: 'Invalid shift', details: input.error.flatten() }, { status: 400 })
  const data = await getPrisma().shift.create({
    data: { ...input.data, organizationId: auth.profile.organizationId },
  })
  return NextResponse.json({ data }, { status: 201 })
}
