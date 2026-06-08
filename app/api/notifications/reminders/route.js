import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'

const schema = z.object({
  type: z.string().trim().min(1).max(100),
  schedule: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  nextRunAt: z.coerce.date(),
  payload: z.object({
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(5000),
    role: z.enum(['HR_MANAGER', 'RECRUITER', 'EMPLOYEE']).optional(),
    email: z.boolean().optional(),
  }).passthrough(),
  isActive: z.boolean().default(true),
})

export async function GET(request) {
  const auth = await requireAuth(request, ['HR_MANAGER'])
  if (auth.error) return auth.error
  const data = await getPrisma().scheduledReminder.findMany({
    where: { organizationId: auth.profile.organizationId },
    orderBy: { nextRunAt: 'asc' },
  })
  return NextResponse.json({ data })
}

export async function POST(request) {
  const auth = await requireAuth(request, ['HR_MANAGER'])
  if (auth.error) return auth.error
  const input = schema.safeParse(await request.json())
  if (!input.success) return NextResponse.json({ error: 'Invalid reminder', details: input.error.flatten() }, { status: 400 })
  const data = await getPrisma().scheduledReminder.create({
    data: { ...input.data, organizationId: auth.profile.organizationId },
  })
  return NextResponse.json({ data }, { status: 201 })
}
