import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { accrueOrganizationLeave } from '@/lib/domain/leave'

export async function POST(request) {
  const auth = await requireAuth(request, ['HR_MANAGER'])
  if (auth.error) return auth.error
  const body = await request.json().catch(() => ({}))
  const effectiveDate = body.effectiveDate ? new Date(body.effectiveDate) : new Date()
  if (Number.isNaN(effectiveDate.getTime())) return NextResponse.json({ error: 'Invalid effectiveDate' }, { status: 400 })
  const data = await accrueOrganizationLeave({ organizationId: auth.profile.organizationId, effectiveDate })
  return NextResponse.json({ data })
}
