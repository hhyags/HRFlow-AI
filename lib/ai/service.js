import { createHash } from 'node:crypto'
import { GoogleGenAI } from '@google/genai'
import { getPrisma } from '@/lib/prisma'
import { AiError } from '@/lib/ai/errors'

let client
const RETRYABLE_AI_STATUSES = new Set([500, 502, 503, 504])

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new AiError('Gemini is not configured.', { code: 'AI_NOT_CONFIGURED', status: 503 })
  }
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  return client
}

export function hashValue(value) {
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return createHash('sha256').update(value).digest('hex')
  }
  const serialized = typeof value === 'string' ? value : JSON.stringify(value)
  return createHash('sha256').update(serialized).digest('hex')
}

function safeLogValue(value) {
  if (value === undefined) return {}
  return JSON.parse(JSON.stringify(value, (key, item) => {
    if (key === 'data' && typeof item === 'string' && item.length > 1000) return `[base64 omitted: ${item.length} chars]`
    return item
  }))
}

async function enforceRateLimit({ organizationId, requesterId }) {
  const prisma = getPrisma()
  const limit = Math.max(Number(process.env.AI_RATE_LIMIT_PER_MINUTE || 20), 1)
  const windowStart = new Date(Date.now() - 60_000)
  const count = await prisma.aiRequestLog.count({
    where: { organizationId, requesterId, createdAt: { gte: windowStart } },
  })
  if (count >= limit) {
    throw new AiError('AI rate limit exceeded. Try again shortly.', {
      code: 'AI_RATE_LIMITED',
      status: 429,
      retryAfter: 60,
    })
  }
}

async function readCache(organizationId, cacheKey, { allowExpired = false } = {}) {
  if (!cacheKey) return null
  const prisma = getPrisma()
  const row = await prisma.aiCache.findUnique({
    where: { organizationId_cacheKey: { organizationId, cacheKey } },
  })
  if (!row) return null
  if (row.expiresAt <= new Date()) {
    if (allowExpired) return row.response
    await prisma.aiCache.delete({ where: { id: row.id } }).catch(() => {})
    return null
  }
  return row.response
}

async function writeCache({ organizationId, cacheKey, capability, model, response, ttlSeconds }) {
  if (!cacheKey || ttlSeconds <= 0) return
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000)
  await getPrisma().aiCache.upsert({
    where: { organizationId_cacheKey: { organizationId, cacheKey } },
    update: { capability, model, response, expiresAt },
    create: { organizationId, cacheKey, capability, model, response, expiresAt },
  })
}

async function logRequest(data) {
  await getPrisma().aiRequestLog.create({ data }).catch((error) => {
    console.error('Failed to persist AI audit log', error)
  })
}

function aiStatus(error) {
  const direct = Number(error?.status || error?.code)
  if (Number.isInteger(direct) && direct >= 400) return direct
  try {
    const parsed = JSON.parse(error?.message || '')
    return Number(parsed?.error?.code) || null
  } catch {
    return null
  }
}

export function isRetryableAiError(error) {
  return RETRYABLE_AI_STATUSES.has(aiStatus(error))
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function generateWithRetry(request) {
  const retries = Math.max(Number(process.env.AI_RETRY_ATTEMPTS || 2), 0)
  let lastError

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await getClient().models.generateContent(request)
    } catch (error) {
      lastError = error
      if (attempt >= retries || !isRetryableAiError(error)) throw error
      const delay = 500 * (2 ** attempt) + Math.floor(Math.random() * 250)
      await wait(delay)
    }
  }

  throw lastError
}

export async function checkGeminiConnectivity() {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const response = await getClient().models.get({ model })
  if (!response.name) throw new Error('Gemini model metadata was unavailable.')
}

export async function generateStructured({
  auth,
  capability,
  contents,
  responseSchema,
  responseValidator,
  requestLog,
  cacheKey,
  cacheTtlSeconds = Number(process.env.AI_CACHE_TTL_SECONDS || 3600),
  temperature = 0.2,
}) {
  const startedAt = Date.now()
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const commonLog = {
    organizationId: auth.profile.organizationId,
    requesterId: auth.user.id,
    capability,
    model,
    request: safeLogValue(requestLog),
  }

  await enforceRateLimit(commonLog)
  const cached = await readCache(auth.profile.organizationId, cacheKey)
  if (cached) {
    await logRequest({
      ...commonLog,
      response: safeLogValue(cached),
      status: 'SUCCESS',
      cacheHit: true,
      latencyMs: Date.now() - startedAt,
    })
    return { data: cached, cached: true }
  }

  try {
    const response = await generateWithRetry({
      model,
      contents,
      config: {
        temperature,
        maxOutputTokens: Math.max(Number(process.env.AI_MAX_OUTPUT_TOKENS || 2048), 256),
        thinkingConfig: {
          thinkingBudget: Math.max(Number(process.env.AI_THINKING_BUDGET || 0), 0),
        },
        responseMimeType: 'application/json',
        responseSchema,
      },
    })
    if (!response.text) throw new AiError('Gemini returned an empty response.', { code: 'AI_EMPTY_RESPONSE', status: 502 })

    let parsed
    try {
      parsed = JSON.parse(response.text)
    } catch {
      throw new AiError('Gemini returned invalid JSON.', { code: 'AI_INVALID_RESPONSE', status: 502 })
    }

    const validation = responseValidator.safeParse(parsed)
    if (!validation.success) {
      throw new AiError('Gemini response did not match the required schema.', { code: 'AI_SCHEMA_MISMATCH', status: 502 })
    }

    const data = validation.data
    const usage = response.usageMetadata || {}
    await Promise.all([
      writeCache({
        organizationId: auth.profile.organizationId,
        cacheKey,
        capability,
        model,
        response: data,
        ttlSeconds: cacheTtlSeconds,
      }),
      logRequest({
        ...commonLog,
        response: safeLogValue(data),
        status: 'SUCCESS',
        cacheHit: false,
        promptTokens: usage.promptTokenCount,
        completionTokens: usage.candidatesTokenCount,
        totalTokens: usage.totalTokenCount,
        latencyMs: Date.now() - startedAt,
      }),
    ])
    return { data, cached: false, usage }
  } catch (error) {
    await logRequest({
      ...commonLog,
      status: 'ERROR',
      errorCode: error.code || 'GEMINI_ERROR',
      errorMessage: String(error.message || error).slice(0, 2000),
      latencyMs: Date.now() - startedAt,
    })
    const stale = await readCache(auth.profile.organizationId, cacheKey, { allowExpired: true })
    if (stale && (isRetryableAiError(error) || aiStatus(error) === 429)) {
      return {
        data: stale,
        cached: true,
        degraded: true,
        warning: 'Live AI is temporarily unavailable. Showing the most recent saved result.',
      }
    }
    if (error instanceof AiError) throw error
    const status = aiStatus(error)
    if (status === 429) {
      throw new AiError('AI request capacity is temporarily limited. Try again shortly.', {
        code: 'GEMINI_RATE_LIMITED',
        status: 429,
        retryAfter: 30,
      })
    }
    if (RETRYABLE_AI_STATUSES.has(status)) {
      throw new AiError('AI service is temporarily busy. Try again shortly.', {
        code: 'GEMINI_UNAVAILABLE',
        status: 503,
        retryAfter: 15,
      })
    }
    throw new AiError('Gemini request failed.', { code: 'GEMINI_REQUEST_FAILED', status: 502 })
  }
}
