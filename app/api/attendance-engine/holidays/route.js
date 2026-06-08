import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'

const schema = z.object({
  name: z.string().trim().min(1).max(150),
  date: z.coerce.date(),
  location: z.string().trim().max(150).optional().nullable(),
  isOptional: z.boolean().default(false),
})

export async function GET(request) {
  const auth = await requireAuth(request)
  if (auth.error) return auth.error
  const year = Number(request.nextUrl.searchParams.get('year') || new Date().getUTCFullYear())
  const data = await getPrisma().holiday.findMany({
    where: {
      organizationId: auth.profile.organizationId,
      date: { gte: new Date(Date.UTC(year, 0, 1)), lte: new Date(Date.UTC(year, 11, 31)) },
    },
    orderBy: { date: 'asc' },
  })
  return NextResponse.json({ data })
}

export async function POST(request) {
  const auth = await requireAuth(request, ['HR_MANAGER'])
  if (auth.error) return auth.error
  const input = schema.safeParse(await request.json())
  if (!input.success) return NextResponse.json({ error: 'Invalid holiday', details: input.error.flatten() }, { status: 400 })
  const data = await getPrisma().holiday.create({
    data: { ...input.data, organizationId: auth.profile.organizationId },
  })
  return NextResponse.json({ data }, { status: 201 })
}
