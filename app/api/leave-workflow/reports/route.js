import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'

export async function GET(request) {
  const auth = await requireAuth(request, ['HR_MANAGER'])
  if (auth.error) return auth.error
  const year = Number(request.nextUrl.searchParams.get('year') || new Date().getUTCFullYear())
  const start = new Date(Date.UTC(year, 0, 1))
  const end = new Date(Date.UTC(year, 11, 31))
  const prisma = getPrisma()
  const [byStatus, byType, balances] = await Promise.all([
    prisma.leaveRequest.groupBy({
      by: ['status'],
      where: { organizationId: auth.profile.organizationId, startDate: { gte: start, lte: end } },
      _count: true,
      _sum: { days: true },
    }),
    prisma.leaveRequest.groupBy({
      by: ['type'],
      where: { organizationId: auth.profile.organizationId, startDate: { gte: start, lte: end } },
      _count: true,
      _sum: { days: true },
    }),
    prisma.leaveBalance.aggregate({
      where: { organizationId: auth.profile.organizationId, year },
      _sum: { accrued: true, used: true, carriedForward: true, adjusted: true },
    }),
  ])
  return NextResponse.json({ data: { year, byStatus, byType, balances } })
}
