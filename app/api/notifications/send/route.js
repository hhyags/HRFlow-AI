import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'
import { queueNotification } from '@/lib/domain/notifications'

const schema = z.object({
  recipientIds: z.array(z.string().uuid()).min(1).max(500),
  type: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  email: z.boolean().default(false),
  scheduledFor: z.coerce.date().optional().nullable(),
  data: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(request) {
  const auth = await requireAuth(request, ['HR_MANAGER'])
  if (auth.error) return auth.error
  const input = schema.safeParse(await request.json())
  if (!input.success) return NextResponse.json({ error: 'Invalid notification', details: input.error.flatten() }, { status: 400 })
  const prisma = getPrisma()
  const profiles = await prisma.profile.findMany({
    where: { id: { in: input.data.recipientIds }, organizationId: auth.profile.organizationId },
    include: { employee: true },
  })
  if (profiles.length !== new Set(input.data.recipientIds).size) {
    return NextResponse.json({ error: 'One or more recipients are invalid' }, { status: 400 })
  }
  let queued = 0
  for (const profile of profiles) {
    const rows = await queueNotification({
      organizationId: auth.profile.organizationId,
      recipientId: profile.id,
      type: input.data.type,
      title: input.data.title,
      body: input.data.body,
      data: { ...input.data.data, email: profile.employee?.email },
      email: input.data.email,
      scheduledFor: input.data.scheduledFor,
      prisma,
    })
    queued += rows.length
  }
  return NextResponse.json({ data: { queued } }, { status: 201 })
}
