import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getPrisma } from '@/lib/prisma'
import { AiError } from '@/lib/ai/errors'

export async function getPdfFromRequest(request, organizationId) {
  const contentType = request.headers.get('content-type') || ''
  const maxBytes = Number(process.env.AI_MAX_PDF_BYTES || 20 * 1024 * 1024)

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) throw new AiError('A PDF resume is required.', { code: 'PDF_REQUIRED', status: 400 })
    if (file.type !== 'application/pdf') throw new AiError('Only PDF resumes are supported.', { code: 'PDF_TYPE_INVALID', status: 415 })
    if (file.size > maxBytes) throw new AiError('Resume PDF exceeds the configured size limit.', { code: 'PDF_TOO_LARGE', status: 413 })
    return {
      bytes: Buffer.from(await file.arrayBuffer()),
      name: file.name,
      candidateId: form.get('candidateId') ? String(form.get('candidateId')) : null,
    }
  }

  const body = await request.json()
  if (!body.documentId) throw new AiError('documentId or a PDF file is required.', { code: 'PDF_REQUIRED', status: 400 })
  const document = await getPrisma().document.findFirst({
    where: { id: body.documentId, organizationId, mimeType: 'application/pdf' },
  })
  if (!document) throw new AiError('Resume document was not found.', { code: 'PDF_NOT_FOUND', status: 404 })
  if (document.sizeBytes > maxBytes) throw new AiError('Resume PDF exceeds the configured size limit.', { code: 'PDF_TOO_LARGE', status: 413 })

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'hrflow-documents'
  const { data, error } = await createSupabaseAdminClient().storage.from(bucket).download(document.storagePath)
  if (error) throw new AiError('Unable to read the stored resume.', { code: 'PDF_DOWNLOAD_FAILED', status: 502 })
  return {
    bytes: Buffer.from(await data.arrayBuffer()),
    name: document.name,
    candidateId: body.candidateId || document.candidateId,
  }
}
