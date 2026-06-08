import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'

const schema = z.object({ read: z.boolean() })

export async function PATCH(request, { params }) {
  const auth = await requireAuth(request)
  if (auth.error) return auth.error
  const input = schema.safeParse(await request.json())
  if (!input.success) return NextResponse.json({ error: 'Invalid notification update' }, { status: 400 })
  const { id } = await params
  const prisma = getPrisma()
  const notification = await prisma.notification.findFirst({
    where: { id, organizationId: auth.profile.organizationId, recipientId: auth.user.id, channel: 'IN_APP' },
  })
  if (!notification) return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
  const data = await prisma.notification.update({
    where: { id },
    data: {
      readAt: input.data.read ? new Date() : null,
      status: input.data.read ? 'READ' : notification.sentAt ? 'SENT' : 'PENDING',
    },
  })
  return NextResponse.json({ data })
}
