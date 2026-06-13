import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, roles } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'
import { writeAuditLog } from '@/lib/audit'

const preferencesSchema = z.object({
  emailNotifications: z.boolean(),
  inAppNotifications: z.boolean(),
  weeklyDigest: z.boolean(),
  theme: z.enum(['SYSTEM', 'LIGHT', 'DARK']),
})

const workspaceSchema = z.object({
  timezone: z.string().min(2).max(80),
  locale: z.string().min(2).max(20),
  currency: z.string().length(3).transform((value) => value.toUpperCase()),
})

const aiSchema = z.object({
  enabled: z.boolean(),
  cacheEnabled: z.boolean(),
  payrollContext: z.boolean(),
})

const updateSchema = z.object({
  profile: z.object({
    fullName: z.string().trim().min(2).max(100),
  }).optional(),
  preferences: preferencesSchema.optional(),
  organization: z.object({
    name: z.string().trim().min(2).max(100),
    workspace: workspaceSchema,
  }).optional(),
  ai: aiSchema.optional(),
}).refine((value) => Object.keys(value).length > 0, 'No settings were supplied.')

const defaultPreferences = {
  emailNotifications: true,
  inAppNotifications: true,
  weeklyDigest: true,
  theme: 'SYSTEM',
}

const defaultWorkspace = {
  timezone: 'UTC',
  locale: 'en-US',
  currency: 'USD',
}

const defaultAi = {
  enabled: true,
  cacheEnabled: true,
  payrollContext: false,
}

function responseData(user, organization) {
  const organizationSettings = organization.settings || {}
  return {
    profile: {
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
    preferences: { ...defaultPreferences, ...(user.preferences || {}) },
    organization: {
      name: organization.name,
      workspace: { ...defaultWorkspace, ...(organizationSettings.workspace || {}) },
    },
    ai: { ...defaultAi, ...(organizationSettings.ai || {}) },
    services: {
      authentication: 'Firebase',
      databaseSecurity: 'PostgreSQL RLS',
      aiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      emailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
      monitoringConfigured: Boolean(process.env.ERROR_MONITORING_WEBHOOK),
    },
  }
}

export async function GET(request) {
  const auth = await requireAuth(request)
  if (auth.error) return auth.error
  const prisma = getPrisma()
  const [user, organization] = await Promise.all([
    prisma.user.findUnique({ where: { id: auth.user.id } }),
    prisma.organization.findUnique({ where: { id: auth.profile.organizationId } }),
  ])
  if (!user || !organization) {
    return NextResponse.json({ error: 'Settings profile was not found.' }, { status: 404 })
  }
  return NextResponse.json({ data: responseData(user, organization) })
}

export async function PUT(request) {
  const auth = await requireAuth(request)
  if (auth.error) return auth.error

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed or empty JSON body.' }, { status: 400 })
  }
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid settings.', details: parsed.error.flatten() }, { status: 400 })
  }
  if (
    auth.profile.role !== roles.HR_MANAGER
    && (parsed.data.organization || parsed.data.ai)
  ) {
    return NextResponse.json({ error: 'Only HR managers can update organization settings.' }, { status: 403 })
  }

  const prisma = getPrisma()
  const [currentUser, currentOrganization] = await Promise.all([
    prisma.user.findUnique({ where: { id: auth.user.id } }),
    prisma.organization.findUnique({ where: { id: auth.profile.organizationId } }),
  ])
  if (!currentUser || !currentOrganization) {
    return NextResponse.json({ error: 'Settings profile was not found.' }, { status: 404 })
  }

  const organizationSettings = currentOrganization.settings || {}
  const operations = []
  if (parsed.data.profile || parsed.data.preferences) {
    operations.push(prisma.user.update({
      where: { id: auth.user.id },
      data: {
        ...(parsed.data.profile || {}),
        ...(parsed.data.preferences ? {
          preferences: { ...(currentUser.preferences || {}), ...parsed.data.preferences },
        } : {}),
      },
    }))
  }
  if (parsed.data.organization || parsed.data.ai) {
    operations.push(prisma.organization.update({
        where: { id: auth.profile.organizationId },
        data: {
          ...(parsed.data.organization ? { name: parsed.data.organization.name } : {}),
          settings: {
            ...organizationSettings,
            ...(parsed.data.organization ? { workspace: parsed.data.organization.workspace } : {}),
            ...(parsed.data.ai ? { ai: parsed.data.ai } : {}),
          },
        },
      }))
  }
  await prisma.$transaction(operations)

  await writeAuditLog({
    request,
    organizationId: auth.profile.organizationId,
    userId: auth.user.id,
    action: 'settings.update',
    resource: 'settings',
    metadata: {
      profile: Boolean(parsed.data.profile),
      preferences: Boolean(parsed.data.preferences),
      organization: Boolean(parsed.data.organization),
      ai: Boolean(parsed.data.ai),
    },
  })

  const [user, organization] = await Promise.all([
    prisma.user.findUnique({ where: { id: auth.user.id } }),
    prisma.organization.findUnique({ where: { id: auth.profile.organizationId } }),
  ])
  return NextResponse.json({ data: responseData(user, organization) })
}
