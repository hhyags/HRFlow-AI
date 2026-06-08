import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'
import { resolveEmployeeForAuth } from '@/lib/domain/access'
import { closeAttendance, getEmployeeShift, localDateTimeToUtc } from '@/lib/domain/attendance'

const schema = z.object({
  action: z.enum(['CHECK_IN', 'CHECK_OUT']),
  employeeId: z.string().uuid().optional(),
  timestamp: z.coerce.date().default(() => new Date()),
})

export async function POST(request) {
  const auth = await requireAuth(request, ['HR_MANAGER', 'EMPLOYEE'])
  if (auth.error) return auth.error
  const input = schema.safeParse(await request.json())
  if (!input.success) return NextResponse.json({ error: 'Invalid clock event', details: input.error.flatten() }, { status: 400 })
  const prisma = getPrisma()
  const employee = await resolveEmployeeForAuth(auth, input.data.employeeId, prisma)
  if (!employee) return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 })
  const timestamp = input.data.timestamp
  const date = new Date(Date.UTC(timestamp.getUTCFullYear(), timestamp.getUTCMonth(), timestamp.getUTCDate()))

  if (input.data.action === 'CHECK_IN') {
    const holiday = await prisma.holiday.findFirst({
      where: {
        organizationId: auth.profile.organizationId,
        date,
        OR: [{ location: null }, { location: employee.location }],
        isOptional: false,
      },
    })
    if (holiday) return NextResponse.json({ error: `Check-in unavailable on holiday: ${holiday.name}` }, { status: 409 })

    const existing = await prisma.attendance.findUnique({ where: { employeeId_date: { employeeId: employee.id, date } } })
    if (existing?.checkIn) return NextResponse.json({ error: 'Employee is already checked in' }, { status: 409 })
    const assignment = await getEmployeeShift(prisma, auth.profile.organizationId, employee.id, date)
    const shift = assignment?.shift
    const scheduledStart = shift
      ? localDateTimeToUtc(date, shift.startMinutes, shift.timezone)
      : localDateTimeToUtc(date, 9 * 60, 'UTC')
    const lateAfter = scheduledStart.getTime() + (shift?.graceMinutes || 0) * 60000
    const data = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: employee.id, date } },
      update: { checkIn: timestamp, status: timestamp.getTime() > lateAfter ? 'LATE' : 'PRESENT' },
      create: {
        organizationId: auth.profile.organizationId,
        employeeId: employee.id,
        date,
        checkIn: timestamp,
        status: timestamp.getTime() > lateAfter ? 'LATE' : 'PRESENT',
      },
    })
    return NextResponse.json({ data })
  }

  const attendance = await prisma.attendance.findUnique({ where: { employeeId_date: { employeeId: employee.id, date } } })
  if (!attendance?.checkIn || attendance.checkOut) return NextResponse.json({ error: 'No open attendance record found' }, { status: 409 })
  const data = await closeAttendance({
    organizationId: auth.profile.organizationId,
    employeeId: employee.id,
    attendanceId: attendance.id,
    checkOut: timestamp,
    prisma,
  })
  return NextResponse.json({ data })
}
