import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'
import { resolveEmployeeForAuth } from '@/lib/domain/access'

const schema = z.object({
  employeeId: z.string().uuid().optional(),
  attendanceId: z.string().uuid().optional().nullable(),
  requestedCheckIn: z.coerce.date().optional().nullable(),
  requestedCheckOut: z.coerce.date().optional().nullable(),
  reason: z.string().trim().min(5).max(1000),
})

export async function GET(request) {
  const auth = await requireAuth(request, ['HR_MANAGER', 'EMPLOYEE'])
  if (auth.error) return auth.error
  const where = { organizationId: auth.profile.organizationId }
  if (auth.profile.role === 'EMPLOYEE') where.employee = { profileId: auth.user.id }
  const data = await getPrisma().attendanceCorrection.findMany({
    where,
    include: { employee: true, attendance: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ data })
}

export async function POST(request) {
  const auth = await requireAuth(request, ['HR_MANAGER', 'EMPLOYEE'])
  if (auth.error) return auth.error
  const input = schema.safeParse(await request.json())
  if (!input.success) return NextResponse.json({ error: 'Invalid correction', details: input.error.flatten() }, { status: 400 })
  const prisma = getPrisma()
  const employee = await resolveEmployeeForAuth(auth, input.data.employeeId, prisma)
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  if (input.data.attendanceId) {
    const attendance = await prisma.attendance.findFirst({
      where: { id: input.data.attendanceId, employeeId: employee.id, organizationId: auth.profile.organizationId },
    })
    if (!attendance) return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 })
  }
  const data = await prisma.attendanceCorrection.create({
    data: {
      ...input.data,
      employeeId: employee.id,
      organizationId: auth.profile.organizationId,
      requestedBy: auth.user.id,
    },
  })
  return NextResponse.json({ data }, { status: 201 })
}
