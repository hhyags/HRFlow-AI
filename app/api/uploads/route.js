import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

const allowedTypes = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
])

export async function POST(request) {
  const auth = await requireAuth(request)
  if (auth.error) return auth.error

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'A file is required' }, { status: 400 })
  if (!allowedTypes.has(file.type)) return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 })
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Maximum file size is 10MB' }, { status: 413 })

  const category = String(form.get('category') || 'general')
  let employeeId = form.get('employeeId') ? String(form.get('employeeId')) : null
  let candidateId = form.get('candidateId') ? String(form.get('candidateId')) : null
  const prisma = getPrisma()
  if (auth.profile.role === 'EMPLOYEE') {
    employeeId = auth.profile.employee?.id || null
    candidateId = null
    if (!employeeId) return NextResponse.json({ error: 'Employee profile not found' }, { status: 403 })
  }
  if (auth.profile.role === 'RECRUITER' && employeeId) {
    return NextResponse.json({ error: 'Recruiters cannot upload employee documents' }, { status: 403 })
  }
  if (employeeId) {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, organizationId: auth.profile.organizationId }, select: { id: true } })
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }
  if (candidateId) {
    const candidate = await prisma.candidate.findFirst({ where: { id: candidateId, organizationId: auth.profile.organizationId }, select: { id: true } })
    if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const storagePath = `${auth.profile.organizationId}/${category}/${crypto.randomUUID()}-${safeName}`
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'hrflow-documents'
  const supabase = createSupabaseAdminClient()

  const { error } = await supabase.storage.from(bucket).upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const document = await prisma.document.create({
    data: {
      organizationId: auth.profile.organizationId,
      employeeId,
      candidateId,
      name: file.name,
      category,
      storagePath,
      mimeType: file.type,
      sizeBytes: file.size,
      uploadedBy: auth.user.id,
    },
  })
  if (candidateId && category === 'resume') {
    await prisma.candidate.update({
      where: { id: candidateId },
      data: { resumeUrl: storagePath },
    })
  }
  return NextResponse.json({ data: document }, { status: 201 })
}

export async function GET(request) {
  const auth = await requireAuth(request)
  if (auth.error) return auth.error
  const path = request.nextUrl.searchParams.get('path')
  if (!path?.startsWith(`${auth.profile.organizationId}/`)) {
    return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 })
  }
  const document = await getPrisma().document.findFirst({
    where: {
      organizationId: auth.profile.organizationId,
      storagePath: path,
      ...(auth.profile.role === 'EMPLOYEE' ? {
        OR: [
          { uploadedBy: auth.user.id },
          ...(auth.profile.employee?.id ? [{ employeeId: auth.profile.employee.id }] : []),
        ],
      } : {}),
      ...(auth.profile.role === 'RECRUITER' ? { employeeId: null } : {}),
    },
    select: { id: true },
  })
  if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'hrflow-documents'
  const { data, error } = await createSupabaseAdminClient().storage.from(bucket).createSignedUrl(path, 300)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
