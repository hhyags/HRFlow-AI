import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'

export async function GET(request) {
  const auth = await requireAuth(request)
  if (auth.error) return auth.error
  const data = await getPrisma().document.findMany({
    where: { organizationId: auth.profile.organizationId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return NextResponse.json({ data })
}
