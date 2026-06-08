import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'
import { aiErrorResponse, AiError } from '@/lib/ai/errors'
import { interviewPrompt, promptVersions } from '@/lib/ai/prompts'
import { interviewQuestionsZod, responseSchemas } from '@/lib/ai/schemas'
import { generateStructured, hashValue } from '@/lib/ai/service'

const inputSchema = z.object({
  jobId: z.string().uuid(),
  candidateId: z.string().uuid().optional(),
  technicalCount: z.coerce.number().int().min(1).max(10).default(5),
  behavioralCount: z.coerce.number().int().min(1).max(10).default(5),
  roleSpecificCount: z.coerce.number().int().min(1).max(10).default(5),
})

export async function POST(request) {
  const auth = await requireAuth(request, ['HR_MANAGER', 'RECRUITER'])
  if (auth.error) return auth.error

  try {
    const input = inputSchema.safeParse(await request.json())
    if (!input.success) throw new AiError('Invalid interview question request.', { code: 'INVALID_REQUEST', status: 400 })
    const prisma = getPrisma()
    const [job, candidate] = await Promise.all([
      prisma.job.findFirst({
        where: { id: input.data.jobId, organizationId: auth.profile.organizationId },
        include: { department: true },
      }),
      input.data.candidateId
        ? prisma.candidate.findFirst({
            where: { id: input.data.candidateId, organizationId: auth.profile.organizationId },
            select: { id: true, firstName: true, lastName: true, skills: true, summary: true, aiScore: true, updatedAt: true },
          })
        : null,
    ])
    if (!job) throw new AiError('Job was not found.', { code: 'JOB_NOT_FOUND', status: 404 })

    const counts = {
      technical: input.data.technicalCount,
      behavioral: input.data.behavioralCount,
      roleSpecific: input.data.roleSpecificCount,
    }
    const prompt = interviewPrompt({ job, candidate, counts })
    const result = await generateStructured({
      auth,
      capability: 'INTERVIEW_QUESTIONS',
      contents: [{ text: prompt }],
      responseSchema: responseSchemas.interviewQuestions,
      responseValidator: interviewQuestionsZod,
      requestLog: {
        promptVersion: promptVersions.interview,
        jobId: job.id,
        candidateId: candidate?.id || null,
        counts,
      },
      cacheKey: hashValue({
        version: promptVersions.interview,
        jobId: job.id,
        jobUpdatedAt: job.updatedAt,
        candidateId: candidate?.id,
        candidateUpdatedAt: candidate?.updatedAt,
        counts,
      }),
      cacheTtlSeconds: 86400,
      temperature: 0.45,
    })
    return NextResponse.json(result)
  } catch (error) {
    return aiErrorResponse(error)
  }
}
