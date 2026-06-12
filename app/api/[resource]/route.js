import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'
import { getResource, validateResource } from '@/lib/resources'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET(request, { params }) {
  const { resource } = await params
  const config = getResource(resource)
  if (!config) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 })

  const auth = await requireAuth(request, config.read)
  if (auth.error) return auth.error

  const prisma = getPrisma()
  const search = request.nextUrl.searchParams.get('search')
  const take = Math.min(Number(request.nextUrl.searchParams.get('limit') || 100), 250)
  const where = { organizationId: auth.profile.organizationId }

  if (auth.profile.role === 'EMPLOYEE') {
    if (resource === 'employees') where.profileId = auth.user.id
    if (['attendance', 'leave', 'payroll', 'reviews'].includes(resource)) {
      where.employee = { profileId: auth.user.id }
    }
  }

  if (search && ['employees', 'jobs', 'candidates'].includes(resource)) {
    const fields = resource === 'jobs' ? ['title'] : ['firstName', 'lastName', 'email']
    where.OR = fields.map((field) => ({ [field]: { contains: search, mode: 'insensitive' } }))
  }

  const data = await prisma[config.model].findMany({
    where,
    include: config.include,
    orderBy: config.orderBy,
    take,
  })
  return NextResponse.json({ data })
}

export async function POST(request, { params }) {
  const { resource } = await params
  const config = getResource(resource)
  if (!config) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 })

  const auth = await requireAuth(request, config.write)
  if (auth.error) return auth.error
  const rate = checkRateLimit(`resource-write:${auth.user.id}:${resource}`, { limit: 60 })
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many changes. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rate.resetAt - Date.now()) / 1000)) } },
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed or empty JSON body' }, { status: 400 })
  }

  const validation = validateResource(config, body)
  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid request', details: validation.error.flatten() }, { status: 400 })
  }

  const prisma = getPrisma()
  const organizationId = auth.profile.organizationId
  if (['employees', 'candidates'].includes(resource) && validation.data.email) {
    validation.data.email = validation.data.email.trim().toLowerCase()
  }

  if (auth.profile.role === 'EMPLOYEE' && resource === 'leave') {
    const employee = await prisma.employee.findUnique({ where: { profileId: auth.user.id } })
    if (!employee) return NextResponse.json({ error: 'No employee profile is linked to this user' }, { status: 403 })
    validation.data.employeeId = employee.id
    validation.data.status = 'PENDING'
    validation.data.reviewedBy = null
    validation.data.reviewedAt = null
  }

  // Cross-job duplicate candidate detection
  if (resource === 'candidates') {
    const email = validation.data.email?.trim().toLowerCase()
    const jobId = validation.data.jobId
    if (email) {
      if (jobId) {
        const directDuplicate = await prisma.candidate.findFirst({
          where: { organizationId, email, jobId },
        })
        if (directDuplicate) {
          return NextResponse.json(
            { error: 'A candidate with this email has already applied for this job.' },
            { status: 409 }
          )
        }
      }
      const otherApplications = await prisma.candidate.findMany({
        where: { organizationId, email, NOT: jobId ? { jobId } : undefined },
        include: { job: true },
      })
      if (otherApplications.length > 0) {
        const warning = `Duplicate alert: This candidate has also applied for other roles: ${otherApplications
          .map((c) => c.job?.title || 'Unknown Role')
          .join(', ')}.`
        validation.data.notes = validation.data.notes
          ? `${validation.data.notes}\n\n${warning}`
          : warning
      }
    }
  }

  try {
    const data = await prisma[config.model].create({
      data: { ...validation.data, organizationId },
      include: config.include,
    })
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Conflict: Unique constraint violation.' }, { status: 409 })
    }
    return NextResponse.json({ error: `Unable to create ${resource} record.` }, { status: 500 })
  }
}
