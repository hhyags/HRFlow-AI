import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { aiErrorResponse, AiError } from '@/lib/ai/errors'
import { promptVersions, rankingPrompt } from '@/lib/ai/prompts'
import { rankingZod, responseSchemas } from '@/lib/ai/schemas'
import { generateStructured, hashValue } from '@/lib/ai/service'

const inputSchema = z.object({
  candidateId: z.string().uuid(),
  jobId: z.string().uuid(),
})

export const runtime = 'nodejs'

export async function POST(request) {
  const auth = await requireAuth(request, ['HR_MANAGER', 'RECRUITER'])
  if (auth.error) return auth.error

  try {
    const input = inputSchema.safeParse(await request.json())
    if (!input.success) throw new AiError('candidateId and jobId are required.', { code: 'INVALID_REQUEST', status: 400 })
    const prisma = getPrisma()
    const [candidate, job] = await Promise.all([
      prisma.candidate.findFirst({
        where: { id: input.data.candidateId, organizationId: auth.profile.organizationId },
        include: { documents: { where: { mimeType: 'application/pdf' }, orderBy: { createdAt: 'desc' }, take: 1 } },
      }),
      prisma.job.findFirst({
        where: { id: input.data.jobId, organizationId: auth.profile.organizationId },
        include: { department: true },
      }),
    ])
    if (!candidate || !job) throw new AiError('Candidate or job was not found.', { code: 'NOT_FOUND', status: 404 })

    const candidateEvidence = {
      name: `${candidate.firstName} ${candidate.lastName}`,
      skills: candidate.skills,
      summary: candidate.summary,
    }
    const prompt = rankingPrompt({ jobDescription: job.description, resumeAnalysis: candidateEvidence })
    const contents = [{ text: prompt }]
    const document = candidate.documents[0]

    if (document) {
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'hrflow-documents'
      const { data, error } = await createSupabaseAdminClient().storage.from(bucket).download(document.storagePath)
      if (!error) {
        const bytes = Buffer.from(await data.arrayBuffer())
        contents.unshift({ inlineData: { mimeType: 'application/pdf', data: bytes.toString('base64') } })
      }
    }

    const result = await generateStructured({
      auth,
      capability: 'CANDIDATE_RANKING',
      contents,
      responseSchema: responseSchemas.ranking,
      responseValidator: rankingZod,
      requestLog: {
        promptVersion: promptVersions.ranking,
        candidateId: candidate.id,
        jobId: job.id,
        resumeDocumentId: document?.id || null,
      },
      cacheKey: hashValue({
        version: promptVersions.ranking,
        candidateId: candidate.id,
        candidateUpdatedAt: candidate.updatedAt,
        jobId: job.id,
        jobUpdatedAt: job.updatedAt,
        documentId: document?.id,
      }),
    })

    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        aiScore: result.data.matchScore,
        notes: `AI recommendation: ${result.data.hiringRecommendation}. ${result.data.recommendationRationale}`,
      },
    })
    return NextResponse.json(result)
  } catch (error) {
    return aiErrorResponse(error)
  }
}
