import { getFirebaseAdminAuth } from '@/lib/firebase/admin'
import { getPrisma } from '@/lib/prisma'
import { roles, SESSION_COOKIE } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { createHash } from 'node:crypto'

export const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000

export async function provisionFirebaseUser({
  request,
  decodedToken,
  fullName,
  organizationId,
  invitationToken,
  requestedRole = roles.EMPLOYEE,
  bootstrapSecret,
  prisma = getPrisma(),
}) {
  const email = decodedToken.email?.trim().toLowerCase()
  if (!email) throw new Error('Firebase account must have an email address.')

  let user = await prisma.user.findUnique({ where: { firebaseUid: decodedToken.uid } })
  let created = false
  if (!user) {
    let role
    let tenantId = organizationId
    let acceptedInvitationId
    if (requestedRole !== roles.EMPLOYEE) {
      if (!Object.values(roles).includes(requestedRole)) throw new Error('Invalid role.')
      if (!process.env.HRFLOW_BOOTSTRAP_SECRET || bootstrapSecret !== process.env.HRFLOW_BOOTSTRAP_SECRET) {
        throw new Error('A valid bootstrap secret is required for privileged roles.')
      }
      role = requestedRole
      if (!tenantId) throw new Error('Organization is required for bootstrap provisioning.')
      const organization = await prisma.organization.findUnique({ where: { id: tenantId } })
      if (!organization) throw new Error('Organization was not found.')
    } else {
      if (!invitationToken) throw new Error('A valid organization invitation is required.')
      const tokenHash = createHash('sha256').update(invitationToken).digest('hex')
      const invitation = await prisma.organizationInvite.findUnique({ where: { tokenHash } })
      if (
        !invitation
        || invitation.acceptedAt
        || invitation.expiresAt <= new Date()
        || invitation.email.toLowerCase() !== email
      ) {
        throw new Error('Organization invitation is invalid or expired.')
      }
      tenantId = invitation.organizationId
      role = invitation.role
      acceptedInvitationId = invitation.id
    }

    const data = {
      firebaseUid: decodedToken.uid,
      organizationId: tenantId,
      email,
      role,
      fullName: fullName?.trim() || decodedToken.name || email,
      avatarUrl: decodedToken.picture || null,
    }
    user = acceptedInvitationId
      ? await prisma.$transaction(async (transaction) => {
          const accepted = await transaction.organizationInvite.updateMany({
            where: { id: acceptedInvitationId, acceptedAt: null },
            data: { acceptedAt: new Date() },
          })
          if (accepted.count !== 1) throw new Error('Organization invitation has already been used.')
          return transaction.user.create({ data })
        })
      : await prisma.user.create({ data })
    created = true
  } else if (user.email !== email || (fullName && user.fullName !== fullName.trim())) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { email, ...(fullName ? { fullName: fullName.trim() } : {}) },
    })
  }

  const customClaims = decodedToken
  const claimsChanged = customClaims.role !== 'authenticated'
    || customClaims.app_role !== user.role
    || customClaims.organization_id !== user.organizationId
  if (claimsChanged) {
    await getFirebaseAdminAuth().setCustomUserClaims(decodedToken.uid, {
      role: 'authenticated',
      app_role: user.role,
      organization_id: user.organizationId,
    })
  }

  await writeAuditLog({
    request,
    organizationId: user.organizationId,
    userId: user.id,
    action: created ? 'auth.signup' : 'auth.login',
    resource: 'user',
    resourceId: user.id,
    metadata: { provider: decodedToken.firebase?.sign_in_provider || 'unknown' },
    prisma,
  })

  return { user, created, claimsChanged }
}

export function setSessionCookie(response, sessionCookie) {
  response.cookies.set(SESSION_COOKIE, sessionCookie, {
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
  return response
}

export function clearSessionCookie(response) {
  response.cookies.set(SESSION_COOKIE, '', {
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
  return response
}
