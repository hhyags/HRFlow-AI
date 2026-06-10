import { describe, expect, it } from 'vitest'
import { isRetryableAiError } from '@/lib/ai/service'

describe('Gemini retry classification', () => {
  it.each([429, 500, 502, 503, 504])('retries temporary status %s', (status) => {
    expect(isRetryableAiError({ status })).toBe(true)
  })

  it('reads the Gemini JSON error payload', () => {
    expect(isRetryableAiError({
      message: JSON.stringify({ error: { code: 503, status: 'UNAVAILABLE' } }),
    })).toBe(true)
  })

  it.each([400, 401, 403, 404])('does not retry permanent status %s', (status) => {
    expect(isRetryableAiError({ status })).toBe(false)
  })
})
