import { getPrisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function writeAuditLog({
  request,
  organizationId,
  userId,
  action,
  resource,
  resourceId,
  metadata,
  prisma = getPrisma(),
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        organizationId: organizationId || null,
        userId: userId || null,
        action,
        resource,
        resourceId: resourceId || null,
        metadata,
        ipAddress: request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        userAgent: request?.headers?.get('user-agent') || null,
      },
    })
  } catch (error) {
    logger.error('audit_log_failed', { action, resource, error: error.message })
    return null
  }
}
