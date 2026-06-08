import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'
import { payrollToCsv } from '@/lib/domain/payroll'

export async function GET(request) {
  const auth = await requireAuth(request, ['HR_MANAGER'])
  if (auth.error) return auth.error
  const from = new Date(request.nextUrl.searchParams.get('from') || new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)))
  const to = new Date(request.nextUrl.searchParams.get('to') || new Date())
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
  }
  const rows = await getPrisma().payroll.findMany({
    where: { organizationId: auth.profile.organizationId, periodEnd: { gte: from, lte: to } },
    include: { employee: true },
    orderBy: [{ periodEnd: 'desc' }, { employee: { employeeNumber: 'asc' } }],
    take: 10000,
  })
  return new NextResponse(payrollToCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="payroll-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
