import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'
import { calculatePayroll, countWorkingDays } from '@/lib/domain/payroll'
import { queueNotification } from '@/lib/domain/notifications'

const itemSchema = z.object({
  employeeId: z.string().uuid(),
  code: z.string().trim().min(1).max(50),
  description: z.string().trim().min(1).max(200),
  amount: z.coerce.number().nonnegative(),
  taxable: z.boolean().default(true),
})

const schema = z.object({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  overtimeHourlyRate: z.coerce.number().nonnegative().default(0),
  bonuses: z.array(itemSchema).default([]),
  deductions: z.array(itemSchema).default([]),
  finalize: z.boolean().default(false),
})

export async function POST(request) {
  const auth = await requireAuth(request, ['HR_MANAGER'])
  if (auth.error) return auth.error
  const input = schema.safeParse(await request.json())
  if (!input.success || input.data.periodStart > input.data.periodEnd) {
    return NextResponse.json({ error: 'Invalid payroll request', details: input.error?.flatten() }, { status: 400 })
  }
  const prisma = getPrisma()
  const organizationId = auth.profile.organizationId
  const [employees, holidays, attendance, unpaidLeave] = await Promise.all([
    prisma.employee.findMany({
      where: { organizationId, status: { not: 'INACTIVE' }, salary: { not: null } },
    }),
    prisma.holiday.findMany({
      where: { organizationId, date: { gte: input.data.periodStart, lte: input.data.periodEnd }, isOptional: false },
      select: { date: true, location: true },
    }),
    prisma.attendance.groupBy({
      by: ['employeeId'],
      where: { organizationId, date: { gte: input.data.periodStart, lte: input.data.periodEnd } },
      _sum: { overtimeMinutes: true },
    }),
    prisma.leaveRequest.groupBy({
      by: ['employeeId'],
      where: {
        organizationId,
        type: 'UNPAID',
        status: 'APPROVED',
        startDate: { lte: input.data.periodEnd },
        endDate: { gte: input.data.periodStart },
      },
      _sum: { days: true },
    }),
  ])
  const attendanceMap = new Map(attendance.map((item) => [item.employeeId, item._sum.overtimeMinutes || 0]))
  const unpaidMap = new Map(unpaidLeave.map((item) => [item.employeeId, Number(item._sum.days || 0)]))
  const results = []

  for (const employee of employees) {
    const employeeHolidays = holidays
      .filter((holiday) => !holiday.location || holiday.location === employee.location)
      .map((holiday) => holiday.date)
    const totalWorkingDays = countWorkingDays(input.data.periodStart, input.data.periodEnd, employeeHolidays)
    const unpaidDays = Math.min(unpaidMap.get(employee.id) || 0, totalWorkingDays)
    const bonuses = input.data.bonuses.filter((item) => item.employeeId === employee.id)
    const deductions = input.data.deductions.filter((item) => item.employeeId === employee.id)
    const calculated = calculatePayroll({
      monthlySalary: Number(employee.salary) / 12,
      payableDays: totalWorkingDays - unpaidDays,
      totalWorkingDays,
      overtimeMinutes: attendanceMap.get(employee.id) || 0,
      overtimeHourlyRate: input.data.overtimeHourlyRate,
      bonuses,
      deductions,
    })

    const payroll = await prisma.$transaction(async (tx) => {
      const row = await tx.payroll.upsert({
        where: {
          employeeId_periodStart_periodEnd: {
            employeeId: employee.id,
            periodStart: input.data.periodStart,
            periodEnd: input.data.periodEnd,
          },
        },
        update: {
          baseSalary: calculated.baseSalary,
          bonus: calculated.bonusTotal + calculated.overtimePay,
          deductions: calculated.deductionTotal,
          netPay: calculated.netPay,
          status: input.data.finalize ? 'PAID' : 'DRAFT',
          paidAt: input.data.finalize ? new Date() : null,
        },
        create: {
          organizationId,
          employeeId: employee.id,
          periodStart: input.data.periodStart,
          periodEnd: input.data.periodEnd,
          baseSalary: calculated.baseSalary,
          bonus: calculated.bonusTotal + calculated.overtimePay,
          deductions: calculated.deductionTotal,
          netPay: calculated.netPay,
          status: input.data.finalize ? 'PAID' : 'DRAFT',
          paidAt: input.data.finalize ? new Date() : null,
        },
      })
      await tx.payrollItem.deleteMany({ where: { payrollId: row.id } })
      const items = [
        ...(calculated.overtimePay > 0 ? [{
          organizationId, payrollId: row.id, employeeId: employee.id, type: 'EARNING',
          code: 'OVERTIME', description: 'Overtime pay', amount: calculated.overtimePay, taxable: true,
        }] : []),
        ...bonuses.map((item) => ({ ...item, organizationId, payrollId: row.id, type: 'EARNING' })),
        ...deductions.map((item) => ({ ...item, organizationId, payrollId: row.id, type: 'DEDUCTION' })),
      ].map(({ employeeId, code, description, amount, taxable, organizationId: orgId, payrollId, type }) => ({
        organizationId: orgId, payrollId, employeeId, code, description, amount, taxable, type,
      }))
      if (items.length) await tx.payrollItem.createMany({ data: items })
      return row
    })
    results.push(payroll)

    if (input.data.finalize && employee.profileId) {
      await queueNotification({
        organizationId,
        recipientId: employee.profileId,
        type: 'PAYROLL_PROCESSED',
        title: 'Your payslip is ready',
        body: `Payroll for ${input.data.periodStart.toISOString().slice(0, 7)} has been processed.`,
        data: { payrollId: payroll.id, email: employee.email },
        email: true,
        prisma,
      })
    }
  }
  return NextResponse.json({ data: { processed: results.length, payroll: results } })
}
