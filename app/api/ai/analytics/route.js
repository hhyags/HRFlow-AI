import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getOrganizationContext } from '@/lib/ai/context'
import { aiErrorResponse, AiError } from '@/lib/ai/errors'
import { analyticsPrompt, promptVersions } from '@/lib/ai/prompts'
import { analyticsZod, responseSchemas } from '@/lib/ai/schemas'
import { generateStructured, hashValue } from '@/lib/ai/service'

const inputSchema = z.object({
  type: z.enum(['ATTRITION_RISK', 'HIRING_FORECAST', 'WORKFORCE_PLANNING']),
  horizonMonths: z.coerce.number().int().min(1).max(24).default(6),
})

export async function POST(request) {
  const auth = await requireAuth(request, ['HR_MANAGER'])
  if (auth.error) return auth.error

  try {
    const input = inputSchema.safeParse(await request.json())
    if (!input.success) throw new AiError('Invalid analytics request.', { code: 'INVALID_REQUEST', status: 400 })
    const context = await getOrganizationContext(auth.profile.organizationId)
    const contextHash = hashValue({ ...context, generatedAt: undefined })
    const prompt = analyticsPrompt({
      type: input.data.type,
      context,
      horizonMonths: input.data.horizonMonths,
    })
    const result = await generateStructured({
      auth,
      capability: input.data.type,
      contents: [{ text: prompt }],
      responseSchema: responseSchemas.analytics,
      responseValidator: analyticsZod,
      requestLog: {
        promptVersion: promptVersions.analytics,
        type: input.data.type,
        horizonMonths: input.data.horizonMonths,
        contextHash,
      },
      cacheKey: hashValue({
        version: promptVersions.analytics,
        type: input.data.type,
        horizonMonths: input.data.horizonMonths,
        contextHash,
      }),
      cacheTtlSeconds: 21600,
      temperature: 0.2,
    })
    return NextResponse.json(result)
  } catch (error) {
    return aiErrorResponse(error)
  }
}
