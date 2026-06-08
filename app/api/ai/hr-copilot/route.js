import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getOrganizationContext } from '@/lib/ai/context'
import { aiErrorResponse, AiError } from '@/lib/ai/errors'
import { copilotPrompt, promptVersions } from '@/lib/ai/prompts'
import { copilotZod, responseSchemas } from '@/lib/ai/schemas'
import { generateStructured, hashValue } from '@/lib/ai/service'

const inputSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(4000),
  })).max(20).default([]),
  generateReport: z.boolean().default(false),
})

export async function handleCopilot(request, forceReport = false) {
  const auth = await requireAuth(request, ['HR_MANAGER'])
  if (auth.error) return auth.error

  try {
    const input = inputSchema.safeParse(await request.json())
    if (!input.success) throw new AiError('Invalid copilot request.', { code: 'INVALID_REQUEST', status: 400 })
    const context = await getOrganizationContext(auth.profile.organizationId)
    const generateReport = forceReport || input.data.generateReport
    const prompt = copilotPrompt({
      message: input.data.message,
      history: input.data.history,
      context,
      generateReport,
    })
    const contextHash = hashValue({ ...context, generatedAt: undefined })
    const result = await generateStructured({
      auth,
      capability: generateReport ? 'HR_REPORT' : 'HR_COPILOT',
      contents: [{ text: prompt }],
      responseSchema: responseSchemas.copilot,
      responseValidator: copilotZod,
      requestLog: {
        promptVersion: promptVersions.copilot,
        message: input.data.message,
        historyLength: input.data.history.length,
        generateReport,
        contextHash,
      },
      cacheKey: generateReport
        ? hashValue({ version: promptVersions.copilot, input: { ...input.data, generateReport: true }, contextHash })
        : null,
      temperature: 0.25,
    })
    return NextResponse.json(result)
  } catch (error) {
    return aiErrorResponse(error)
  }
}

export async function POST(request) {
  return handleCopilot(request)
}
