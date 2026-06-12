import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'
import { getResource, validateResource } from '@/lib/resources'
import { checkRateLimit } from '@/lib/rate-limit'

async function getContext(request, params, mode) {
  const { resource, id } = await params
  const config = getResource(resource)
  if (!config) return { error: NextResponse.json({ error: 'Unknown resource' }, { status: 404 }) }
  const auth = await requireAuth(request, mode === 'read' ? config.read : config.write)
  if (auth.error) return auth
  if (mode === 'write') {
    const rate = checkRateLimit(`resource-write:${auth.user.id}:${resource}`, { limit: 60 })
    if (!rate.allowed) {
      return {
        error: NextResponse.json(
          { error: 'Too many changes. Try again shortly.' },
          { status: 429, headers: { 'Retry-After': String(Math.ceil((rate.resetAt - Date.now()) / 1000)) } },
        ),
      }
    }
  }
  return { resource, id, config, auth }
}

export async function GET(request, { params }) {
  const context = await getContext(request, params, 'read')
  if (context.error) return context.error
  const where = { id: context.id, organizationId: context.auth.profile.organizationId }
  if (context.auth.profile.role === 'EMPLOYEE') {
    if (context.resource === 'employees') where.profileId = context.auth.user.id
    if (['attendance', 'leave', 'payroll', 'reviews'].includes(context.resource)) {
      where.employee = { profileId: context.auth.user.id }
    }
  }
  const data = await getPrisma()[context.config.model].findFirst({
    where,
    include: context.config.include,
  })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PUT(request, { params }) {
  const context = await getContext(request, params, 'write')
  if (context.error) return context.error

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed or empty JSON body' }, { status: 400 })
  }

  const validation = validateResource(context.config, body, true)
  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid request', details: validation.error.flatten() }, { status: 400 })
  }
  if (['employees', 'candidates'].includes(context.resource) && validation.data.email) {
    validation.data.email = validation.data.email.trim().toLowerCase()
  }

  const prisma = getPrisma()
  const where = { id: context.id, organizationId: context.auth.profile.organizationId }
  if (context.auth.profile.role === 'EMPLOYEE' && context.resource === 'leave') {
    where.employee = { profileId: context.auth.user.id }
    const allowed = new Set(['type', 'startDate', 'endDate', 'days', 'reason', 'status'])
    Object.keys(validation.data).forEach((key) => {
      if (!allowed.has(key)) delete validation.data[key]
    })
    if (validation.data.status && validation.data.status !== 'CANCELLED') {
      return NextResponse.json({ error: 'Employees may only cancel their own leave requests' }, { status: 403 })
    }
  }
  const existing = await prisma[context.config.model].findFirst({
    where,
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const data = await prisma[context.config.model].update({
      where: { id: context.id },
      data: validation.data,
      include: context.config.include,
    })
    return NextResponse.json({ data })
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Conflict: Unique constraint violation.' }, { status: 409 })
    }
    return NextResponse.json({ error: `Unable to update ${context.resource} record.` }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const context = await getContext(request, params, 'write')
  if (context.error) return context.error
  const prisma = getPrisma()
  const where = { id: context.id, organizationId: context.auth.profile.organizationId }
  if (context.auth.profile.role === 'EMPLOYEE' && context.resource === 'leave') {
    where.employee = { profileId: context.auth.user.id }
    where.status = 'PENDING'
  }
  const result = await prisma[context.config.model].deleteMany({ where })
  if (!result.count) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
