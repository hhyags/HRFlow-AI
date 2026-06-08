import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'

export async function GET(request) {
  const auth = await requireAuth(request)
  if (auth.error) return auth.error
  const unreadOnly = request.nextUrl.searchParams.get('unread') === 'true'
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') || 50), 200)
  const where = {
    organizationId: auth.profile.organizationId,
    recipientId: auth.user.id,
    channel: 'IN_APP',
    ...(unreadOnly ? { readAt: null } : {}),
  }
  const [data, unread] = await Promise.all([
    getPrisma().notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit }),
    getPrisma().notification.count({
      where: {
        organizationId: auth.profile.organizationId,
        recipientId: auth.user.id,
        channel: 'IN_APP',
        readAt: null,
      },
    }),
  ])
  return NextResponse.json({ data, unread })
}
