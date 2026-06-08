import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'

const schema = z.object({
  employeeId: z.string().uuid(),
  shiftId: z.string().uuid(),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional().nullable(),
})

export async function POST(request) {
  const auth = await requireAuth(request, ['HR_MANAGER'])
  if (auth.error) return auth.error
  const input = schema.safeParse(await request.json())
  if (!input.success) return NextResponse.json({ error: 'Invalid assignment', details: input.error.flatten() }, { status: 400 })
  const prisma = getPrisma()
  const [employee, shift] = await Promise.all([
    prisma.employee.findFirst({ where: { id: input.data.employeeId, organizationId: auth.profile.organizationId } }),
    prisma.shift.findFirst({ where: { id: input.data.shiftId, organizationId: auth.profile.organizationId } }),
  ])
  if (!employee || !shift) return NextResponse.json({ error: 'Employee or shift not found' }, { status: 404 })
  const data = await prisma.employeeShift.create({
    data: { ...input.data, organizationId: auth.profile.organizationId },
    include: { shift: true, employee: true },
  })
  return NextResponse.json({ data }, { status: 201 })
}
