import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'
import { getPdfFromRequest } from '@/lib/ai/documents'
import { aiErrorResponse } from '@/lib/ai/errors'
import { promptVersions, resumeAnalysisPrompt } from '@/lib/ai/prompts'
import { responseSchemas, resumeAnalysisZod } from '@/lib/ai/schemas'
import { generateStructured, hashValue } from '@/lib/ai/service'

export const runtime = 'nodejs'

export async function POST(request) {
  const auth = await requireAuth(request, ['HR_MANAGER', 'RECRUITER'])
  if (auth.error) return auth.error

  try {
    const pdf = await getPdfFromRequest(request, auth.profile.organizationId)
    const prompt = resumeAnalysisPrompt()
    const result = await generateStructured({
      auth,
      capability: 'RESUME_ANALYSIS',
      contents: [
        { inlineData: { mimeType: 'application/pdf', data: pdf.bytes.toString('base64') } },
        { text: prompt },
      ],
      responseSchema: responseSchemas.resumeAnalysis,
      responseValidator: resumeAnalysisZod,
      requestLog: {
        promptVersion: promptVersions.resumeAnalysis,
        fileName: pdf.name,
        fileBytes: pdf.bytes.length,
        fileHash: hashValue(pdf.bytes),
        candidateId: pdf.candidateId,
      },
      cacheKey: hashValue({
        version: promptVersions.resumeAnalysis,
        pdf: hashValue(pdf.bytes),
      }),
    })

    if (pdf.candidateId) {
      await getPrisma().candidate.updateMany({
        where: { id: pdf.candidateId, organizationId: auth.profile.organizationId },
        data: {
          skills: result.data.skills,
          summary: result.data.summary,
        },
      })
    }
    return NextResponse.json(result)
  } catch (error) {
    return aiErrorResponse(error)
  }
}
