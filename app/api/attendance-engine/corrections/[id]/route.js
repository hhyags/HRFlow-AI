import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'
import { calculateAttendance, getEmployeeShift, localDateTimeToUtc } from '@/lib/domain/attendance'

const schema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().trim().max(1000).optional(),
})

export async function PUT(request, { params }) {
  const auth = await requireAuth(request, ['HR_MANAGER'])
  if (auth.error) return auth.error
  const input = schema.safeParse(await request.json())
  if (!input.success) return NextResponse.json({ error: 'Invalid decision', details: input.error.flatten() }, { status: 400 })
  const { id } = await params
  const prisma = getPrisma()

  try {
    const data = await prisma.$transaction(async (tx) => {
      const correction = await tx.attendanceCorrection.findFirst({
        where: { id, organizationId: auth.profile.organizationId, status: 'PENDING' },
        include: { attendance: true },
      })
      if (!correction) throw new Error('Correction not found or already decided.')
      if (input.data.decision === 'APPROVED' && correction.attendanceId) {
        const checkIn = correction.requestedCheckIn || correction.attendance.checkIn
        const checkOut = correction.requestedCheckOut || correction.attendance.checkOut
        const assignment = await getEmployeeShift(tx, auth.profile.organizationId, correction.employeeId, correction.attendance.date)
        const shift = assignment?.shift
        const values = checkIn && checkOut ? calculateAttendance({
          checkIn,
          checkOut,
          scheduledStart: localDateTimeToUtc(correction.attendance.date, shift?.startMinutes || 540, shift?.timezone || 'UTC'),
          breakMinutes: shift?.breakMinutes || 0,
          graceMinutes: shift?.graceMinutes || 0,
          overtimeAfterMinutes: shift?.overtimeAfterMinutes || 480,
        }) : {}
        await tx.attendance.update({
          where: { id: correction.attendanceId },
          data: { checkIn, checkOut, ...values },
        })
      }
      return tx.attendanceCorrection.update({
        where: { id },
        data: {
          status: input.data.decision,
          reviewedBy: auth.user.id,
          reviewedAt: new Date(),
          reviewNote: input.data.reviewNote,
        },
      })
    })
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 409 })
  }
}
