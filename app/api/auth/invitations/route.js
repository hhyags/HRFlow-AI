import { createHash, randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, roles } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'
import { writeAuditLog } from '@/lib/audit'

const schema = z.object({
  email: z.email(),
  role: z.enum([roles.RECRUITER, roles.EMPLOYEE]),
  expiresInHours: z.coerce.number().int().min(1).max(168).default(72),
})

export async function POST(request) {
  const auth = await requireAuth(request, [roles.HR_MANAGER])
  if (auth.error) return auth.error
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + parsed.data.expiresInHours * 60 * 60 * 1000)
  const invitation = await getPrisma().organizationInvite.create({
    data: {
      organizationId: auth.profile.organizationId,
      email: parsed.data.email.trim().toLowerCase(),
      role: parsed.data.role,
      tokenHash,
      expiresAt,
    },
  })
  await writeAuditLog({
    request,
    organizationId: auth.profile.organizationId,
    userId: auth.user.id,
    action: 'invitation.create',
    resource: 'organization_invite',
    resourceId: invitation.id,
    metadata: { email: invitation.email, role: invitation.role, expiresAt },
  })
  return NextResponse.json({
    data: { id: invitation.id, token, email: invitation.email, role: invitation.role, expiresAt },
  }, { status: 201 })
}
