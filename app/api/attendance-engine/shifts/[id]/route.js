import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'

const updateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  timezone: z.string().trim().min(1).optional(),
  startMinutes: z.coerce.number().int().min(0).max(1439).optional(),
  endMinutes: z.coerce.number().int().min(0).max(1439).optional(),
  breakMinutes: z.coerce.number().int().min(0).max(480).optional(),
  graceMinutes: z.coerce.number().int().min(0).max(180).optional(),
  overtimeAfterMinutes: z.coerce.number().int().min(0).max(1440).optional(),
  workingDays: z.array(z.coerce.number().int().min(0).max(6)).min(1).optional(),
  isActive: z.boolean().optional(),
})

export async function PUT(request, { params }) {
  const auth = await requireAuth(request, ['HR_MANAGER'])
  if (auth.error) return auth.error
  const input = updateSchema.safeParse(await request.json())
  if (!input.success) return NextResponse.json({ error: 'Invalid shift', details: input.error.flatten() }, { status: 400 })
  const { id } = await params
  const prisma = getPrisma()
  const exists = await prisma.shift.findFirst({ where: { id, organizationId: auth.profile.organizationId } })
  if (!exists) return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
  return NextResponse.json({ data: await prisma.shift.update({ where: { id }, data: input.data }) })
}

export async function DELETE(request, { params }) {
  const auth = await requireAuth(request, ['HR_MANAGER'])
  if (auth.error) return auth.error
  const { id } = await params
  const result = await getPrisma().shift.deleteMany({ where: { id, organizationId: auth.profile.organizationId } })
  return result.count ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: 'Shift not found' }, { status: 404 })
}
