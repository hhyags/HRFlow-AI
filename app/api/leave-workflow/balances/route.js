import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'
import { availableLeave } from '@/lib/domain/leave'

export async function GET(request) {
  const auth = await requireAuth(request, ['HR_MANAGER', 'EMPLOYEE'])
  if (auth.error) return auth.error
  const year = Number(request.nextUrl.searchParams.get('year') || new Date().getUTCFullYear())
  const where = { organizationId: auth.profile.organizationId, year }
  if (auth.profile.role === 'EMPLOYEE') where.employee = { profileId: auth.user.id }
  const rows = await getPrisma().leaveBalance.findMany({
    where,
    include: { policy: true, employee: true },
  })
  return NextResponse.json({ data: rows.map((row) => ({ ...row, available: availableLeave(row) })) })
}
