import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'

export async function GET(request) {
  const auth = await requireAuth(request, ['HR_MANAGER', 'RECRUITER'])
  if (auth.error) return auth.error

  const prisma = getPrisma()
  const organizationId = auth.profile.organizationId
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))

  const [
    totalEmployees,
    activeEmployees,
    openJobs,
    payroll,
    attendance,
    leavePending,
    candidateGroups,
    recentEmployees,
    employeesBeforeYear,
  ] = await Promise.all([
    prisma.employee.count({ where: { organizationId } }),
    prisma.employee.count({ where: { organizationId, status: { in: ['ACTIVE', 'REMOTE'] } } }),
    prisma.job.count({ where: { organizationId, status: 'OPEN' } }),
    prisma.payroll.aggregate({
      where: { organizationId, periodStart: { gte: monthStart } },
      _sum: { netPay: true },
    }),
    prisma.attendance.groupBy({
      by: ['status'],
      where: { organizationId, date: today },
      _count: true,
    }),
    prisma.leaveRequest.count({ where: { organizationId, status: 'PENDING' } }),
    prisma.candidate.groupBy({
      by: ['stage'],
      where: { organizationId },
      _count: true,
    }),
    prisma.employee.findMany({
      where: { organizationId },
      include: { department: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.employee.count({
      where: { organizationId, joiningDate: { lt: yearStart } },
    }),
  ])

  const growthRows = await prisma.employee.findMany({
    where: { organizationId, joiningDate: { gte: yearStart } },
    select: { joiningDate: true },
  })
  const growth = Array.from({ length: 12 }, (_, month) =>
    employeesBeforeYear + growthRows.filter((row) => row.joiningDate.getUTCMonth() <= month).length,
  )

  return NextResponse.json({
    data: {
      totalEmployees,
      activeEmployees,
      openJobs,
      monthlyPayroll: Number(payroll._sum.netPay || 0),
      leavePending,
      attendance: Object.fromEntries(attendance.map((item) => [item.status, item._count])),
      recruitment: Object.fromEntries(candidateGroups.map((item) => [item.stage, item._count])),
      employeeGrowth: growth,
      recentEmployees,
    },
  })
}
