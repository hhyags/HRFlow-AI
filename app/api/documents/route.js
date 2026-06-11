import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'

export async function GET(request) {
  const auth = await requireAuth(request)
  if (auth.error) return auth.error
  const where = { organizationId: auth.profile.organizationId }
  if (auth.profile.role === 'EMPLOYEE') {
    where.OR = [
      { uploadedBy: auth.user.id },
      ...(auth.profile.employee?.id ? [{ employeeId: auth.profile.employee.id }] : []),
    ]
  }
  if (auth.profile.role === 'RECRUITER') where.employeeId = null
  const data = await getPrisma().document.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return NextResponse.json({ data })
}
