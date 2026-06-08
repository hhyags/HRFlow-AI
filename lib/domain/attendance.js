import { getPrisma } from '@/lib/prisma'

export function minutesBetween(start, end) {
  if (!start || !end) return 0
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000))
}

export function calculateAttendance({
  checkIn,
  checkOut,
  scheduledStart,
  breakMinutes = 0,
  graceMinutes = 0,
  overtimeAfterMinutes = 480,
}) {
  const elapsed = minutesBetween(checkIn, checkOut)
  const workMinutes = Math.max(0, elapsed - Math.max(0, breakMinutes))
  const overtimeMinutes = Math.max(0, workMinutes - Math.max(0, overtimeAfterMinutes))
  const lateAfter = new Date(scheduledStart).getTime() + Math.max(0, graceMinutes) * 60000
  const status = new Date(checkIn).getTime() > lateAfter ? 'LATE' : 'PRESENT'
  return { workMinutes, overtimeMinutes, status }
}

export function localDateTimeToUtc(date, minutes, timeZone = 'UTC') {
  const day = new Date(date)
  const year = day.getUTCFullYear()
  const month = day.getUTCMonth()
  const dateOfMonth = day.getUTCDate()
  const hour = Math.floor(minutes / 60) % 24
  const minute = minutes % 60
  let guess = Date.UTC(year, month, dateOfMonth, hour, minute)

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map((part) => [part.type, part.value]))
    const rendered = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
    )
    guess += Date.UTC(year, month, dateOfMonth, hour, minute) - rendered
  }
  return new Date(guess)
}

export async function getEmployeeShift(prisma, organizationId, employeeId, date) {
  return prisma.employeeShift.findFirst({
    where: {
      organizationId,
      employeeId,
      effectiveFrom: { lte: date },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      shift: { isActive: true },
    },
    include: { shift: true },
    orderBy: { effectiveFrom: 'desc' },
  })
}

export async function closeAttendance({
  organizationId,
  employeeId,
  attendanceId,
  checkOut,
  prisma = getPrisma(),
}) {
  const attendance = await prisma.attendance.findFirst({
    where: { id: attendanceId, organizationId, employeeId },
  })
  if (!attendance?.checkIn) throw new Error('Open attendance record was not found.')

  const assignment = await getEmployeeShift(prisma, organizationId, employeeId, attendance.date)
  const shift = assignment?.shift || {
    startMinutes: 9 * 60,
    breakMinutes: 0,
    graceMinutes: 0,
    overtimeAfterMinutes: 8 * 60,
    timezone: 'UTC',
  }
  const scheduledStart = localDateTimeToUtc(attendance.date, shift.startMinutes, shift.timezone)
  const calculated = calculateAttendance({
    checkIn: attendance.checkIn,
    checkOut,
    scheduledStart,
    breakMinutes: shift.breakMinutes,
    graceMinutes: shift.graceMinutes,
    overtimeAfterMinutes: shift.overtimeAfterMinutes,
  })

  return prisma.attendance.update({
    where: { id: attendance.id },
    data: { checkOut, ...calculated },
  })
}
