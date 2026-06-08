import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'

export async function GET(request) {
  const auth = await requireAuth(request, ['HR_MANAGER'])
  if (auth.error) return auth.error
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') || 50), 200)
  const capability = request.nextUrl.searchParams.get('capability')
  const data = await getPrisma().aiRequestLog.findMany({
    where: {
      organizationId: auth.profile.organizationId,
      ...(capability ? { capability } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return NextResponse.json({ data })
}
