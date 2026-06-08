import { getPrisma } from '@/lib/prisma'

export async function getOrganizationContext(organizationId) {
  const prisma = getPrisma()
  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000)
  const twelveMonthsAgo = new Date(now.getTime() - 365 * 86400000)

  const [
    organization,
    employees,
    attendance,
    jobs,
    candidates,
    payroll,
    leave,
    reviews,
  ] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
    prisma.employee.findMany({
      where: { organizationId },
      select: {
        id: true, employeeNumber: true, firstName: true, lastName: true, jobTitle: true,
        status: true, joiningDate: true, location: true, department: { select: { name: true } },
      },
      take: 500,
    }),
    prisma.attendance.groupBy({
      by: ['employeeId', 'status'],
      where: { organizationId, date: { gte: ninetyDaysAgo } },
      _count: true,
      _sum: { overtimeMinutes: true, workMinutes: true },
    }),
    prisma.job.findMany({
      where: { organizationId, createdAt: { gte: twelveMonthsAgo } },
      select: { id: true, title: true, status: true, openings: true, createdAt: true, publishedAt: true },
    }),
    prisma.candidate.groupBy({
      by: ['jobId', 'stage'],
      where: { organizationId, appliedAt: { gte: twelveMonthsAgo } },
      _count: true,
      _avg: { aiScore: true },
    }),
    prisma.payroll.groupBy({
      by: ['periodStart', 'periodEnd'],
      where: { organizationId, periodEnd: { gte: twelveMonthsAgo } },
      _sum: { netPay: true, bonus: true, deductions: true },
      _count: true,
    }),
    prisma.leaveRequest.groupBy({
      by: ['status', 'type'],
      where: { organizationId, createdAt: { gte: twelveMonthsAgo } },
      _count: true,
      _sum: { days: true },
    }),
    prisma.performanceReview.groupBy({
      by: ['employeeId'],
      where: { organizationId, createdAt: { gte: twelveMonthsAgo } },
      _avg: { rating: true, goalsScore: true },
      _count: true,
    }),
  ])

  return {
    generatedAt: now.toISOString(),
    organization: organization?.name,
    employees,
    attendance,
    recruitment: { jobs, candidates },
    payroll: payroll.map((row) => ({
      ...row,
      _sum: Object.fromEntries(Object.entries(row._sum).map(([key, value]) => [key, Number(value || 0)])),
    })),
    leave: leave.map((row) => ({ ...row, _sum: { days: Number(row._sum.days || 0) } })),
    performance: reviews.map((row) => ({
      ...row,
      _avg: {
        rating: Number(row._avg.rating || 0),
        goalsScore: Number(row._avg.goalsScore || 0),
      },
    })),
  }
}
