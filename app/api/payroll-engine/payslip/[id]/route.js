import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'
import { createPayslipPdf } from '@/lib/domain/payroll'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request, { params }) {
  const auth = await requireAuth(request, ['HR_MANAGER', 'EMPLOYEE'])
  if (auth.error) return auth.error
  const { id } = await params
  const prisma = getPrisma()
  const where = { id, organizationId: auth.profile.organizationId }
  if (auth.profile.role === 'EMPLOYEE') where.employee = { profileId: auth.user.id }
  const payroll = await prisma.payroll.findFirst({
    where,
    include: { employee: true, items: { orderBy: { createdAt: 'asc' } }, organization: true },
  })
  if (!payroll) return NextResponse.json({ error: 'Payslip not found' }, { status: 404 })

  const pdf = await createPayslipPdf({
    organization: payroll.organization,
    payroll,
    employee: payroll.employee,
    items: payroll.items,
  })
  const download = request.nextUrl.searchParams.get('download') !== 'false'
  const storagePath = `${auth.profile.organizationId}/payslips/${payroll.periodEnd.getUTCFullYear()}/${payroll.id}.pdf`
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'hrflow-documents'
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.storage.from(bucket).upload(storagePath, pdf, {
    contentType: 'application/pdf',
    upsert: true,
  })
  if (!error && payroll.payslipUrl !== storagePath) {
    await prisma.payroll.update({ where: { id: payroll.id }, data: { payslipUrl: storagePath } })
  }

  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="payslip-${payroll.employee.employeeNumber}-${payroll.periodEnd.toISOString().slice(0, 7)}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
