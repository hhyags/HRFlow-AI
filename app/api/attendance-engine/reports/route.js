import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'

export async function GET(request) {
  const auth = await requireAuth(request, ['HR_MANAGER'])
  if (auth.error) return auth.error
  const from = new Date(request.nextUrl.searchParams.get('from') || new Date(Date.now() - 30 * 86400000))
  const to = new Date(request.nextUrl.searchParams.get('to') || new Date())
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
  }
  const prisma = getPrisma()
  const [summary, byEmployee] = await Promise.all([
    prisma.attendance.groupBy({
      by: ['status'],
      where: { organizationId: auth.profile.organizationId, date: { gte: from, lte: to } },
      _count: true,
      _sum: { workMinutes: true, overtimeMinutes: true },
    }),
    prisma.attendance.groupBy({
      by: ['employeeId'],
      where: { organizationId: auth.profile.organizationId, date: { gte: from, lte: to } },
      _count: true,
      _sum: { workMinutes: true, overtimeMinutes: true },
    }),
  ])
  return NextResponse.json({ data: { from, to, summary, byEmployee } })
}
