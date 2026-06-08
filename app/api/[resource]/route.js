import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'
import { getResource, validateResource } from '@/lib/resources'

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

  const validation = validateResource(config, await request.json())
  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid request', details: validation.error.flatten() }, { status: 400 })
  }

  const prisma = getPrisma()
  if (auth.profile.role === 'EMPLOYEE' && resource === 'leave') {
    const employee = await prisma.employee.findUnique({ where: { profileId: auth.user.id } })
    if (!employee) return NextResponse.json({ error: 'No employee profile is linked to this user' }, { status: 403 })
    validation.data.employeeId = employee.id
    validation.data.status = 'PENDING'
    validation.data.reviewedBy = null
    validation.data.reviewedAt = null
  }
  const data = await prisma[config.model].create({
    data: { ...validation.data, organizationId: auth.profile.organizationId },
    include: config.include,
  })
  return NextResponse.json({ data }, { status: 201 })
}
